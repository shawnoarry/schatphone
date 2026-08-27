import { describe, expect, test } from 'vitest'
import {
  PERSONA_REVIEW_DECISIONS,
  buildPersonaProfileConfirmation,
} from '../src/lib/persona-profile-confirmation'
import { createPersonaReviewRows } from '../src/lib/persona-profile-classifier'
import {
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_VALUE_SOURCE_KINDS,
} from '../src/lib/profile-template-schema'

const template = {
  id: 'template_persona',
  version: 4,
  categories: [{ id: 'identity', label: 'Identity' }],
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
    const result = buildPersonaProfileConfirmation({
      draft,
      reviewRows: acceptedRows(),
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
      expect.objectContaining({ label: 'Private motto', purposes: [] }),
    ])
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
