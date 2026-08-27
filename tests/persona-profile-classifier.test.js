import { describe, expect, test, vi } from 'vitest'
import {
  PERSONA_CLASSIFICATION_ITEM_KINDS,
  buildPersonaClassificationPrompt,
  classifyPersonaTextDeterministically,
  classifyPersonaTextWithAI,
  createPersonaReviewRows,
} from '../src/lib/persona-profile-classifier'
import { PROFILE_TEMPLATE_FIELD_TYPES } from '../src/lib/profile-template-schema'

const template = {
  id: 'template_persona',
  version: 4,
  categories: [{ id: 'identity', label: 'Identity' }],
  fields: [
    { id: 'occupation', categoryId: 'identity', label: 'Occupation', type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT },
    { id: 'affiliation', categoryId: 'identity', label: 'Affiliation', type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE },
    { id: 'stage_name', categoryId: 'identity', label: 'Stage name', type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT },
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
  profileValues: [{ fieldId: 'occupation', value: 'Manager', visibilityLevel: 'public' }],
}

describe('persona profile classifier', () => {
  test('creates a review-only draft with matches, conflicts, new fields, and retained source text', () => {
    const result = classifyPersonaTextDeterministically({
      text: 'Occupation: Idol\nAffiliation: Aurora Entertainment\nFavorite weather: Rain\nI never discuss my family in public.',
      profile,
      template,
      worldId: 'world_a',
    })

    expect(result.ok).toBe(true)
    expect(result.draft.profileRef).toEqual(expect.objectContaining({
      profileId: 7,
      revision: 3,
      worldId: 'world_a',
      templateId: template.id,
      templateVersion: 4,
    }))
    expect(result.draft.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: PERSONA_CLASSIFICATION_ITEM_KINDS.CONFLICT,
        fieldId: 'occupation',
        existingValue: 'Manager',
        candidateValue: 'Idol',
      }),
      expect.objectContaining({
        kind: PERSONA_CLASSIFICATION_ITEM_KINDS.MATCHED,
        fieldId: 'affiliation',
        candidateValue: 'Aurora Entertainment',
      }),
      expect.objectContaining({
        kind: PERSONA_CLASSIFICATION_ITEM_KINDS.NEW_FIELD,
        label: 'Favorite weather',
        candidateValue: 'Rain',
      }),
      expect.objectContaining({
        kind: PERSONA_CLASSIFICATION_ITEM_KINDS.UNCLASSIFIED,
        sourceText: 'I never discuss my family in public.',
      }),
    ]))
    expect(result.draft.sourceText).toContain('I never discuss my family in public.')
    expect(Object.isFrozen(result.draft)).toBe(true)
  })

  test('keeps competing candidates side by side instead of choosing one', () => {
    const result = classifyPersonaTextDeterministically({
      text: 'Occupation: Idol\nOccupation: Producer',
      profile: { ...profile, profileValues: [] },
      template,
      worldId: 'world_a',
    })

    const conflict = result.draft.items.find((item) => item.fieldId === 'occupation')
    expect(conflict.kind).toBe(PERSONA_CLASSIFICATION_ITEM_KINDS.CONFLICT)
    expect(conflict.candidateValues).toEqual(['Idol', 'Producer'])
  })

  test('returns no draft for empty input', () => {
    expect(classifyPersonaTextDeterministically({ text: '   ', profile, template })).toEqual({
      ok: false,
      reason: 'text_empty',
      draft: null,
    })
  })

  test('uses exact provider source segments and keeps every unmatched segment', async () => {
    const callAi = vi.fn(async () => JSON.stringify({
      matches: [
        { sourceText: 'I work as a producer.', fieldId: 'occupation', value: 'Producer', confidence: 'high' },
        { sourceText: 'Paraphrased text', fieldId: 'affiliation', value: 'Should be dropped' },
      ],
      newFields: [],
    }))

    const result = await classifyPersonaTextWithAI({
      text: 'I work as a producer.\nMy private motto stays unwritten.',
      profile: { ...profile, profileValues: [] },
      template,
      worldId: 'world_a',
      callAi,
    })

    expect(callAi).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    expect(result.draft.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldId: 'occupation', candidateValue: 'Producer' }),
      expect.objectContaining({
        kind: PERSONA_CLASSIFICATION_ITEM_KINDS.UNCLASSIFIED,
        sourceText: 'My private motto stays unwritten.',
      }),
    ]))
    expect(result.draft.items.some((item) => item.candidateValue === 'Should be dropped')).toBe(false)
  })

  test('fails closed when AI output cannot be parsed', async () => {
    const result = await classifyPersonaTextWithAI({
      text: 'Occupation: Artist',
      profile,
      template,
      callAi: vi.fn(async () => 'not-json'),
    })

    expect(result).toEqual({ ok: false, reason: 'parse_failed', draft: null })
  })

  test('creates pending review rows without changing the immutable draft', () => {
    const result = classifyPersonaTextDeterministically({
      text: 'Occupation: Idol',
      profile,
      template,
      worldId: 'world_a',
    })
    const rows = createPersonaReviewRows(result.draft)

    expect(rows).toEqual([
      expect.objectContaining({
        decision: 'pending',
        fieldId: 'occupation',
        value: 'Idol',
      }),
    ])
    rows[0].value = 'Producer'
    expect(result.draft.items[0].candidateValue).toBe('Idol')
  })

  test('documents the draft-only and exact-source AI contract in the prompt', () => {
    const prompt = buildPersonaClassificationPrompt({
      text: 'Occupation: Artist',
      fields: template.fields,
    })
    expect(prompt).toContain('review-only')
    expect(prompt).toContain('sourceText')
    expect(prompt).toContain('copied exactly')
    expect(prompt).toContain('Do not save')
    expect(prompt).toContain('occupation')
  })
})
