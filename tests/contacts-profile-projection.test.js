import { describe, expect, test } from 'vitest'
import { buildContactsProfileProjection } from '../src/lib/contacts-profile-projection'

const template = {
  id: 'template_a',
  version: 2,
  fields: [
    { id: 'occupation', label: 'Occupation', entityTypes: ['self_profile'], purposes: ['event_eligibility'] },
    { id: 'private_note', label: 'Private note', entityTypes: ['self_profile'], purposes: ['chat_context'] },
  ],
}
const profile = {
  id: 7,
  revision: 3,
  entityType: 'self_profile',
  templateLink: { primaryWorldId: 'default_world', profileTemplateId: 'template_a', profileTemplateVersion: 2 },
  profileValues: [
    { fieldId: 'occupation', value: 'Manager', visibilityLevel: 'public', sourceKind: 'manual' },
    { fieldId: 'private_note', value: 'hidden', visibilityLevel: 'hidden', sourceKind: 'manual' },
  ],
}

describe('Contacts profile projection', () => {
  test('returns only purpose-authorized, visible, confirmed fields', () => {
    const result = buildContactsProfileProjection({
      purpose: 'event_eligibility',
      profile,
      template,
      expectedWorldId: 'legacy_single_world',
      expectedProfileRevision: 3,
      allowedEntityTypes: ['self_profile'],
      allowedFieldIds: ['occupation'],
      allowedVisibilityLevels: new Set(['public', 'world_specific']),
    })
    expect(result).toMatchObject({
      ok: true,
      projection: { fields: [{ fieldId: 'occupation', value: 'Manager' }] },
    })
    expect(JSON.stringify(result)).not.toContain('hidden')
  })

  test.each([
    ['stale_profile_revision', { expectedProfileRevision: 2 }],
    ['world_mismatch', { expectedWorldId: 'world_b' }],
    ['stale_template_version', { template: { ...template, version: 3 } }],
    ['entity_type_not_allowed', { allowedEntityTypes: ['main_role'] }],
  ])('fails closed with %s', (reason, overrides) => {
    expect(buildContactsProfileProjection({
      purpose: 'event_eligibility',
      profile,
      template,
      expectedWorldId: 'default_world',
      expectedProfileRevision: 3,
      allowedEntityTypes: ['self_profile'],
      ...overrides,
    })).toMatchObject({ ok: false, reason })
  })
})
