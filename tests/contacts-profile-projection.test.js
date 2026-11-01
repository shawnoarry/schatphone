import { describe, expect, test } from 'vitest'
import { buildContactsProfileProjection, buildGeneralProfileChatProjection } from '../src/lib/contacts-profile-projection'
import { createDefaultProfileTemplatePresets } from '../src/lib/profile-template-schema'

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

  test('fails closed for an archived profile before exposing any field', () => {
    const result = buildContactsProfileProjection({
      purpose: 'event_eligibility',
      profile: { ...profile, lifecycle: { state: 'archived', archivedAt: 1 } },
      template,
      expectedWorldId: 'default_world',
      expectedProfileRevision: 3,
      allowedEntityTypes: ['self_profile'],
    })

    expect(result).toEqual({ ok: false, reason: 'profile_archived', projection: null })
    expect(JSON.stringify(result)).not.toContain('Manager')
  })
})

describe('general role card Chat projection', () => {
  const generalTemplate = createDefaultProfileTemplatePresets()[0]
  const generalProfile = {
    id: 12,
    revision: 4,
    entityType: 'main_role',
    templateLink: { primaryWorldId: '', profileTemplateId: generalTemplate.id, profileTemplateVersion: generalTemplate.version },
    profileValues: [
      { fieldId: 'identity', value: 'Neighborhood illustrator', visibilityLevel: 'public', sourceKind: 'manual' },
      { fieldId: 'life_habit', value: ['tea', 'evening walks'], visibilityLevel: 'familiar', sourceKind: 'manual' },
      { fieldId: 'relationship_setting', value: 'private relationship', visibilityLevel: 'hidden', sourceKind: 'manual' },
      { fieldId: 'orphan', value: 'unmatched old value', visibilityLevel: 'public', sourceKind: 'manual' },
    ],
    personaSource: 'Unconfirmed original prose must not enter Chat',
  }
  const project = (overrides = {}) => buildGeneralProfileChatProjection({
    profile: generalProfile, template: generalTemplate, expectedProfileRevision: 4, ...overrides,
  })

  test.each(['main_role', 'supporting_role', 'npc'])('reads confirmed general %s persona without world activation or field-purpose mutation', (entityType) => {
    const current = structuredClone({ ...generalProfile, entityType })
    const original = structuredClone({ profile: current, template: generalTemplate })
    const result = project({ profile: current })
    expect(result).toMatchObject({ ok: true, projection: {
      purpose: 'chat_context', profileRef: { profileId: 12, revision: 4, worldId: '' },
      fields: [
        { fieldId: 'identity', value: 'Neighborhood illustrator' },
        { fieldId: 'life_habit', value: ['tea', 'evening walks'] },
      ],
    } })
    expect(JSON.stringify(result)).not.toContain('private relationship')
    expect(JSON.stringify(result)).not.toContain('unmatched old value')
    expect(JSON.stringify(result)).not.toContain('Unconfirmed original prose')
    expect({ profile: current, template: generalTemplate }).toEqual(original)
    expect(Object.isFrozen(result.projection.fields)).toBe(true)
  })

  test.each(['hidden', 'intimate', 'world_specific'])('keeps %s values out of ordinary Chat', (visibilityLevel) => {
    const result = project({ profile: { ...generalProfile, profileValues: [
      { fieldId: 'identity', value: 'private marker', visibilityLevel, sourceKind: 'manual' },
    ] } })
    expect(result.projection.fields).toEqual([])
  })

  test('includes confirmed person-only fields, including false, but respects explicit non-Chat purposes and entity limits', () => {
    const fields = [
      { id: 'person_note', label: 'Only this person' },
      { id: 'likes_coffee', label: 'Likes coffee', type: 'boolean' },
      { id: 'event_only', label: 'Event only', purposes: ['event_eligibility'] },
      { id: 'self_only', label: 'Self only', entityTypes: ['self_profile'] },
    ]
    const result = project({ profile: { ...generalProfile,
      profileExtensions: { fields },
      profileValues: fields.map((field) => ({ fieldId: field.id, value: field.id === 'likes_coffee' ? false : field.id, sourceKind: 'manual', visibilityLevel: 'public' })),
    } })
    expect(result.projection.fields).toEqual([
      { fieldId: 'person_note', label: 'Only this person', value: 'person_note' },
      { fieldId: 'likes_coffee', label: 'Likes coffee', value: 'false' },
    ])
  })

  test.each(['ai_generated', 'template_default', 'event_attached'])('does not ingest %s values', (sourceKind) => {
    const result = project({ profile: { ...generalProfile, profileValues: [
      { fieldId: 'identity', value: 'Unconfirmed value', visibilityLevel: 'public', sourceKind },
    ] } })
    expect(result.projection.fields).toEqual([])
  })

  test.each([
    ['profile_archived', { profile: { ...generalProfile, lifecycle: { state: 'archived' } } }],
    ['entity_type_not_allowed', { profile: { ...generalProfile, entityType: 'self_profile' } }],
    ['stale_profile_revision', { expectedProfileRevision: 3 }],
    ['profile_revision_missing', { profile: { ...generalProfile, revision: 0 } }],
    ['general_profile_required', { profile: { ...generalProfile, templateLink: { ...generalProfile.templateLink, primaryWorldId: 'other-world' } } }],
    ['template_missing', { template: null }],
    ['template_missing', { template: { ...generalTemplate, enabled: false } }],
    ['general_template_required', { template: { ...generalTemplate, scope: 'world' } }],
    ['general_template_required', { template: { ...generalTemplate, worldId: 'other-world' } }],
    ['template_mismatch', { template: { ...generalTemplate, id: 'other-template' } }],
    ['stale_template_version', { template: { ...generalTemplate, version: 2 } }],
  ])('fails closed for %s', (reason, overrides) => {
    expect(project(overrides)).toEqual({ ok: false, reason, projection: null })
  })

  test.each(['chat_context', 'event_eligibility', 'work_hub_matching', 'public_content'])('does not relax the existing world-bound %s interface', (purpose) => {
    expect(buildContactsProfileProjection({ purpose, profile: generalProfile, template: generalTemplate,
      expectedProfileRevision: 4, expectedWorldId: 'default_world',
    })).toMatchObject({ ok: false, reason: 'world_missing' })
  })
})
