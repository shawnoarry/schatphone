import { describe, expect, test, vi } from 'vitest'
import { buildRelationshipClassificationRegistry } from '../src/lib/relationship-classification-schema'
import {
  buildRelationshipClassificationPrompt,
  classifyRelationshipLabel,
  normalizeRelationshipClassificationSuggestion,
  shouldAutoSaveClassification,
} from '../src/lib/relationship-label-classifier'

describe('relationship label classifier', () => {
  test('normalizes provider output against the known registry', () => {
    const registry = buildRelationshipClassificationRegistry()
    const suggestion = normalizeRelationshipClassificationSuggestion(
      {
        primaryCategoryId: 'friendship_bond',
        modifierIds: ['childhood_connection', 'unknown_modifier', 'mutual'],
        confidence: 'high',
        explanation: 'Long-term friendly wording.',
      },
      registry,
    )

    expect(suggestion).toEqual({
      primaryRelationshipCategoryId: 'friendship_bond',
      relationshipModifierIds: ['childhood_connection', 'mutual'],
      classificationConfidence: 'high',
      classificationExplanation: 'Long-term friendly wording.',
    })
  })

  test('falls back to ordinary acquaintance when provider returns an unknown category', () => {
    const registry = buildRelationshipClassificationRegistry()
    const suggestion = normalizeRelationshipClassificationSuggestion(
      {
        primaryCategoryId: 'not_a_category',
        modifierIds: ['secret'],
        confidence: 'low',
        explanation: 'Ambiguous label.',
      },
      registry,
    )

    expect(suggestion.primaryRelationshipCategoryId).toBe('ordinary_acquaintance')
    expect(suggestion.relationshipModifierIds).toEqual(['secret'])
    expect(suggestion.classificationConfidence).toBe('low')
  })

  test('builds a prompt that contains label text and registry ids but asks for JSON only', () => {
    const registry = buildRelationshipClassificationRegistry()
    const prompt = buildRelationshipClassificationPrompt({
      profile: {
        name: 'Aki',
        relationshipLabelText: 'white moonlight',
        relationshipLabelNote: 'Important but not confirmed as a lover.',
      },
      registry,
    })

    expect(prompt).toContain('white moonlight')
    expect(prompt).toContain('ordinary_acquaintance')
    expect(prompt).toContain('relationshipModifierIds')
    expect(prompt).toContain('Return JSON only')
  })

  test('classifies through the injected AI caller and marks high confidence for auto-save', async () => {
    const callAi = vi.fn(async () =>
      JSON.stringify({
        primaryRelationshipCategoryId: 'romance_candidate',
        relationshipModifierIds: ['secret', 'mutual'],
        classificationConfidence: 'high',
        classificationExplanation: 'The label implies possible attraction.',
      }),
    )

    const result = await classifyRelationshipLabel({
      profile: {
        id: 9,
        name: 'Mira',
        relationshipLabelText: 'ambiguous crush',
        relationshipLabelNote: 'Both sides hide it.',
      },
      settings: {
        api: {
          key: 'test-key',
          url: 'https://example.test/v1/chat/completions',
          model: 'test-model',
        },
      },
      registry: buildRelationshipClassificationRegistry(),
      callAi,
    })

    expect(callAi).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    expect(result.requiresConfirmation).toBe(false)
    expect(result.saveSource).toBe('ai_auto')
    expect(result.classification.primaryRelationshipCategoryId).toBe('romance_candidate')
    expect(result.classification.relationshipModifierIds).toEqual(['secret', 'mutual'])
    expect(shouldAutoSaveClassification(result.classification)).toBe(true)
  })

  test('marks medium and low confidence suggestions as requiring confirmation', async () => {
    const callAi = vi.fn(async () =>
      JSON.stringify({
        primaryCategoryId: 'friendship_bond',
        modifierIds: ['long_term_companion'],
        confidence: 'medium',
        explanation: 'Likely a friend, but wording is not certain.',
      }),
    )

    const result = await classifyRelationshipLabel({
      profile: {
        id: 10,
        name: 'Rin',
        relationshipLabelText: 'important person',
      },
      settings: {
        api: {
          key: 'test-key',
          url: 'https://example.test/v1/chat/completions',
          model: 'test-model',
        },
      },
      registry: buildRelationshipClassificationRegistry(),
      callAi,
    })

    expect(result.ok).toBe(true)
    expect(result.requiresConfirmation).toBe(true)
    expect(result.saveSource).toBe('ai_confirmed')
    expect(result.classification.classificationConfidence).toBe('medium')
  })

  test('returns a confirmation-required parse failure for invalid provider text', async () => {
    const callAi = vi.fn(async () => 'not json')
    const result = await classifyRelationshipLabel({
      profile: {
        id: 11,
        name: 'Nia',
        relationshipLabelText: 'unclear bond',
      },
      settings: { api: { key: 'test-key' } },
      registry: buildRelationshipClassificationRegistry(),
      callAi,
    })

    expect(result).toEqual({
      ok: false,
      reason: 'parse_failed',
      requiresConfirmation: true,
      classification: null,
    })
  })
})
