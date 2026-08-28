import { describe, expect, test } from 'vitest'
import { buildContactsWorkHubProjection } from '../src/lib/contacts-work-hub-projection'

const template = {
  id: 'work_identity',
  version: 2,
  fields: [
    { id: 'occupation', label: 'Occupation', purposes: ['work_hub_matching'], entityTypes: ['self_profile'] },
    { id: 'affiliation', label: 'Affiliation', purposes: ['work_hub_matching'], entityTypes: ['self_profile'] },
    { id: 'private_note', label: 'Private', purposes: ['chat_context'], entityTypes: ['self_profile'] },
  ],
}
const profile = {
  id: 9,
  revision: 4,
  entityType: 'self_profile',
  templateLink: { primaryWorldId: 'default_world', profileTemplateId: 'work_identity', profileTemplateVersion: 2 },
  profileValues: [
    { fieldId: 'occupation', value: 'Manager', visibilityLevel: 'public', sourceKind: 'manual' },
    { fieldId: 'affiliation', value: 'Aurora Entertainment', visibilityLevel: 'world_specific', sourceKind: 'manual' },
    { fieldId: 'private_note', value: 'never copy', visibilityLevel: 'public', sourceKind: 'manual' },
  ],
}

describe('Contacts Work Hub projection', () => {
  test('selects a role template from minimal clues without granting authority', () => {
    const result = buildContactsWorkHubProjection({
      profile,
      template,
      expectedWorldId: 'legacy_single_world',
      expectedProfileRevision: 4,
    })
    expect(result).toMatchObject({
      ok: true,
      projection: {
        occupation: 'Manager',
        affiliation: 'Aurora Entertainment',
        roleTemplateId: 'manager',
        evidenceKind: 'self_reported_matching_clue',
        authority: {
          membershipGranted: false,
          credentialIssued: false,
          publishingGranted: false,
          organizationActionAllowed: false,
          requiresOrganizationOwnerValidation: true,
        },
      },
    })
    expect(JSON.stringify(result)).not.toContain('never copy')
  })

  test('fails closed for stale revisions and fields without work purpose', () => {
    expect(buildContactsWorkHubProjection({
      profile,
      template,
      expectedWorldId: 'default_world',
      expectedProfileRevision: 3,
    })).toMatchObject({ ok: false, reason: 'stale_profile_revision' })
    expect(buildContactsWorkHubProjection({
      profile,
      template: { ...template, fields: template.fields.map((field) => ({ ...field, purposes: [] })) },
      expectedWorldId: 'default_world',
      expectedProfileRevision: 4,
    }).projection.fields).toEqual([])
  })

  test('fails closed for an archived matching profile', () => {
    expect(buildContactsWorkHubProjection({
      profile: { ...profile, lifecycle: { state: 'archived', archivedAt: 1 } },
      template,
      expectedWorldId: 'default_world',
      expectedProfileRevision: 4,
    })).toMatchObject({ ok: false, reason: 'profile_archived', projection: null })
  })
})
