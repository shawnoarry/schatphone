import { describe, expect, test } from 'vitest'
import {
  PERSONA_REVIEW_DECISIONS,
  buildPersonaProfileConfirmation,
} from '../src/lib/persona-profile-confirmation'
import { createPersonaReviewRows } from '../src/lib/persona-profile-classifier'
import { buildGeneralProfileChatProjection } from '../src/lib/contacts-profile-projection'
import {
  PROFILE_TEMPLATE_SCOPES,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_VALUE_SOURCE_KINDS,
} from '../src/lib/profile-template-schema'

const template = {
  id: 'template_persona',
  version: 4,
  scope: PROFILE_TEMPLATE_SCOPES.WORLD,
  categories: [
    { id: 'identity', label: 'Identity' },
    { id: 'relationship', label: 'Relationship' },
  ],
  fields: [
    {
      id: 'occupation',
      categoryId: 'identity',
      label: 'Occupation',
      type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
      entityTypes: ['self_profile'],
    },
  ],
}

const profile = {
  id: 7,
  revision: 3,
  entityType: 'self_profile',
  templateLink: {
    primaryWorldId: 'world_a',
    profileTemplateId: template.id,
    profileTemplateVersion: template.version,
  },
  profileValues: [
    {
      fieldId: 'occupation',
      value: 'Manager',
      visibilityLevel: 'public',
      sourceKind: PROFILE_VALUE_SOURCE_KINDS.MANUAL,
    },
  ],
  profileExtensions: { categories: [], fields: [] },
}

const draft = {
  profileRef: {
    profileId: 7,
    revision: 3,
    entityType: 'self_profile',
    worldId: 'world_a',
    templateId: template.id,
    templateVersion: template.version,
  },
  items: [
    {
      id: 'occupation-item',
      kind: 'conflict',
      fieldId: 'occupation',
      categoryId: 'identity',
      label: 'Occupation',
      fieldType: 'short_text',
      candidateValue: 'Producer',
    },
    {
      id: 'motto-item',
      kind: 'new_field',
      fieldId: '',
      categoryId: 'identity',
      label: 'Private motto',
      fieldType: 'long_text',
      candidateValue: 'Stay curious',
    },
  ],
}

const acceptedRows = () => createPersonaReviewRows(draft).map((row) => ({
  ...row,
  decision: PERSONA_REVIEW_DECISIONS.ACCEPT,
}))

describe('persona profile confirmation', () => {
  test('builds one owner update with manual-compatible values and a person extension', () => {
    const rows = acceptedRows()
    rows[1].categoryId = 'relationship'
    const result = buildPersonaProfileConfirmation({
      draft,
      reviewRows: rows,
      profile,
      template,
      worldId: 'world_a',
      now: 1000,
      random: 0.25,
    })

    expect(result).toMatchObject({
      ok: true,
      expectedRevision: 3,
      expectedWorldId: 'world_a',
      expectedTemplateId: template.id,
      expectedTemplateVersion: 4,
      acceptedCount: 2,
    })
    expect(result.updates.profileValues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        fieldId: 'occupation',
        value: 'Producer',
        sourceKind: PROFILE_VALUE_SOURCE_KINDS.MANUAL,
      }),
      expect.objectContaining({
        value: 'Stay curious',
        sourceKind: PROFILE_VALUE_SOURCE_KINDS.MANUAL,
      }),
    ]))
    expect(result.updates.profileExtensions.fields).toEqual([
      expect.objectContaining({ label: 'Private motto', categoryId: 'relationship', purposes: [] }),
    ])
  })

  test('supports confirmation for a universal profile style without a world-bound link', () => {
    const universalTemplate = { ...template, scope: PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET }
    const universalProfile = {
      ...profile,
      templateLink: { ...profile.templateLink, primaryWorldId: '' },
    }
    const result = buildPersonaProfileConfirmation({
      draft,
      reviewRows: acceptedRows(),
      profile: universalProfile,
      template: universalTemplate,
      worldId: 'world_a',
      now: 1000,
    })

    expect(result).toMatchObject({ ok: true, expectedWorldId: '' })
  })

  test('supports edit and ignore without retaining an ignored candidate', () => {
    const rows = acceptedRows()
    rows[0].value = 'Creative producer'
    rows[1].decision = PERSONA_REVIEW_DECISIONS.IGNORE

    const result = buildPersonaProfileConfirmation({
      draft,
      reviewRows: rows,
      profile,
      template,
      worldId: 'world_a',
      now: 1000,
    })

    expect(result).toMatchObject({ ok: true, acceptedCount: 1, ignoredCount: 1 })
    expect(result.updates.profileValues).toEqual([
      expect.objectContaining({ fieldId: 'occupation', value: 'Creative producer' }),
    ])
    expect(result.updates.profileExtensions.fields).toEqual([])
  })

  test('confirmed general-role imports reach Chat with person extensions and retain visibility controls', () => {
    const roleTemplate = {
      ...template,
      scope: PROFILE_TEMPLATE_SCOPES.GLOBAL_PRESET,
      fields: template.fields.map((field) => ({ ...field, entityTypes: ['main_role'] })),
    }
    const roleProfile = {
      ...profile,
      entityType: 'main_role',
      templateLink: { ...profile.templateLink, primaryWorldId: '' },
    }
    const roleDraft = { ...draft, profileRef: { ...draft.profileRef, entityType: 'main_role' } }
    const rows = acceptedRows().map((row) => ({ ...row, visibilityLevel: 'familiar' }))
    const confirmation = buildPersonaProfileConfirmation({
      draft: roleDraft, reviewRows: rows, profile: roleProfile, template: roleTemplate,
      worldId: 'world_a', now: 1000, random: 0.25,
    })
    expect(confirmation.ok).toBe(true)
    const savedProfile = { ...roleProfile, ...confirmation.updates, revision: 4 }
    const project = (currentProfile) => buildGeneralProfileChatProjection({
      profile: currentProfile, template: roleTemplate, expectedProfileRevision: currentProfile.revision,
    })
    expect(project(roleProfile).projection.fields.map((field) => field.value)).toEqual(['Manager'])
    expect(project(savedProfile).projection.fields.map((field) => field.value)).toEqual(['Producer', 'Stay curious'])
    expect(savedProfile.profileExtensions.fields[0].purposes).toEqual([])

    rows[1].visibilityLevel = 'hidden'
    const privateConfirmation = buildPersonaProfileConfirmation({
      draft: roleDraft, reviewRows: rows, profile: roleProfile, template: roleTemplate,
      worldId: 'world_a', now: 1000, random: 0.25,
    })
    expect(privateConfirmation.ok).toBe(true)
    expect(project({ ...roleProfile, ...privateConfirmation.updates, revision: 4 })
      .projection.fields.map((field) => field.value)).toEqual(['Producer'])
  })

  test.each([
    ['stale profile', { profile: { ...profile, revision: 4 } }, 'stale_profile_revision'],
    ['wrong world', { worldId: 'world_b' }, 'world_mismatch'],
    ['stale template', { template: { ...template, version: 5 } }, 'stale_template_version'],
  ])('fails closed for %s', (_label, overrides, reason) => {
    expect(buildPersonaProfileConfirmation({
      draft,
      reviewRows: acceptedRows(),
      profile,
      template,
      worldId: 'world_a',
      ...overrides,
    })).toMatchObject({ ok: false, reason })
  })

  test('requires a decision for every item and never mutates source records', () => {
    const originalProfile = structuredClone(profile)
    const originalDraft = structuredClone(draft)
    const rows = acceptedRows()
    rows[1].decision = PERSONA_REVIEW_DECISIONS.PENDING

    expect(buildPersonaProfileConfirmation({
      draft,
      reviewRows: rows,
      profile,
      template,
      worldId: 'world_a',
    })).toEqual({ ok: false, reason: 'review_incomplete' })
    expect(profile).toEqual(originalProfile)
    expect(draft).toEqual(originalDraft)
  })
})
