import { describe, expect, test } from 'vitest'
import {
  BASE_RELATIONSHIP_CATEGORIES,
  BASE_RELATIONSHIP_MODIFIERS,
  RELATIONSHIP_CLASSIFICATION_CONFIDENCE,
  RELATIONSHIP_CLASSIFICATION_SOURCE,
  buildRelationshipClassificationRegistry,
  normalizeInitialRelationshipSeed,
  normalizeRelationshipProfileFields,
} from '../src/lib/relationship-classification-schema'
import { normalizeWorldPack } from '../src/lib/world-pack-schema'

describe('relationship classification schema', () => {
  test('exposes the fixed base category and modifier registry', () => {
    expect(BASE_RELATIONSHIP_CATEGORIES.map((item) => item.id)).toEqual([
      'ordinary_acquaintance',
      'family_bond',
      'friendship_bond',
      'romance_candidate',
      'romantic_bond',
      'mentor_bond',
      'professional_bond',
      'power_bond',
      'fandom_bond',
      'rival_bond',
    ])
    expect(BASE_RELATIONSHIP_MODIFIERS.map((item) => item.id)).toContain('childhood_connection')
    expect(BASE_RELATIONSHIP_MODIFIERS.map((item) => item.id)).toContain('obsessive')
  })

  test('normalizes profile relationship fields with safe defaults', () => {
    const fields = normalizeRelationshipProfileFields({
      relationshipLabelText: '  childhood friend  ',
      relationshipLabelNote: '  knows my family  ',
      initialRelationshipSeed: {
        affinity: 95,
        trust: 88,
        intimacy: '51',
        tension: -12,
        dependency: 101,
      },
      primaryRelationshipCategoryId: 'friendship_bond',
      relationshipModifierIds: ['childhood_connection', 'childhood_connection', 'secret'],
      classificationConfidence: 'medium',
      classificationSource: 'ai_confirmed',
      classificationUpdatedAt: 1772294400000,
      classificationExplanation: 'The label describes a long-term friend.',
    })

    expect(fields.relationshipLabelText).toBe('childhood friend')
    expect(fields.relationshipLabelNote).toBe('knows my family')
    expect(fields.initialRelationshipSeed).toEqual({
      affinity: 95,
      trust: 88,
      intimacy: 51,
      tension: 0,
      dependency: 100,
    })
    expect(fields.primaryRelationshipCategoryId).toBe('friendship_bond')
    expect(fields.relationshipModifierIds).toEqual(['childhood_connection', 'secret'])
    expect(fields.classificationConfidence).toBe(RELATIONSHIP_CLASSIFICATION_CONFIDENCE.MEDIUM)
    expect(fields.classificationSource).toBe(RELATIONSHIP_CLASSIFICATION_SOURCE.AI_CONFIRMED)
  })

  test('merges explicit world extensions without replacing base categories', () => {
    const registry = buildRelationshipClassificationRegistry({
      worldCategories: [
        {
          id: 'marked_bond',
          label: 'Marked bond',
          fallbackCategoryId: 'romantic_bond',
          description: 'ABO-style marked relationship.',
        },
      ],
      worldModifiers: [
        {
          id: 'heat_cycle',
          label: 'Heat cycle',
          description: 'World-specific biological timing.',
        },
      ],
    })

    expect(registry.categories.map((item) => item.id)).toContain('ordinary_acquaintance')
    expect(registry.categories.map((item) => item.id)).toContain('marked_bond')
    expect(registry.modifiers.map((item) => item.id)).toContain('heat_cycle')
    expect(registry.categoryById.get('marked_bond').fallbackCategoryId).toBe('romantic_bond')
  })

  test('accepts world pack relationship registry additions as schema data', () => {
    const pack = normalizeWorldPack({
      id: 'sentinel_guide',
      relationshipCategories: [
        {
          id: 'guide_bond',
          label: 'Guide bond',
          fallbackCategoryId: 'mentor_bond',
        },
      ],
      relationshipModifiers: ['soul_marked', 'soul_marked'],
    })
    const registry = buildRelationshipClassificationRegistry({
      worldCategories: pack.relationshipCategories,
      worldModifiers: pack.relationshipModifiers,
    })

    expect(pack.relationshipCategories).toEqual([
      {
        id: 'guide_bond',
        label: 'Guide bond',
        description: '',
        fallbackCategoryId: 'mentor_bond',
      },
    ])
    expect(pack.relationshipModifiers).toEqual([
      {
        id: 'soul_marked',
        label: 'soul_marked',
        description: '',
        fallbackCategoryId: '',
      },
    ])
    expect(registry.categoryById.get('guide_bond').fallbackCategoryId).toBe('mentor_bond')
    expect(registry.modifierById.has('soul_marked')).toBe(true)
  })

  test('clamps seed values even when a partial seed is provided', () => {
    expect(normalizeInitialRelationshipSeed({ affinity: 76 })).toEqual({
      affinity: 76,
      trust: 50,
      intimacy: 20,
      tension: 10,
      dependency: 10,
    })
  })
})
