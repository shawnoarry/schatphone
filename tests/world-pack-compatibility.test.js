import { describe, expect, test } from 'vitest'
import {
  WORLD_PACK_FIT_STATUS,
  buildWorldPackCompatibilityReview,
  groupWorldPackRecommendations,
  normalizeWorldProfile,
} from '../src/lib/world-pack-compatibility'

describe('world pack compatibility', () => {
  test('normalizes an AI-derived world profile', () => {
    const profile = normalizeWorldProfile({
      era: 'Modern',
      settingTraits: ['school', 'entertainment', 'school'],
      realism: 'realistic',
      socialRoles: ['student', 'fan'],
      economyTraits: ['ordinary'],
      technologyLevel: 'real_world',
      confidence: 'HIGH',
      evidence: ['mentions a campus', 'uses real social media'],
    })

    expect(profile).toMatchObject({
      era: 'modern',
      settingTraits: ['school', 'entertainment'],
      realism: 'realistic',
      socialRoles: ['student', 'fan'],
      economyTraits: ['ordinary'],
      technologyLevel: 'real_world',
      confidence: 'high',
      evidence: ['mentions a campus', 'uses real social media'],
    })
  })

  test('classifies recommended, adaptable, needs-context, conflicting, and unsupported packs', () => {
    const worldProfile = normalizeWorldProfile({
      era: 'modern',
      settingTraits: ['school'],
      realism: 'realistic',
      socialRoles: ['student'],
      economyTraits: ['ordinary'],
      technologyLevel: 'real_world',
      confidence: 'high',
    })

    const recommended = buildWorldPackCompatibilityReview({
      pack: {
        id: 'school_life',
        name: 'School life',
        compatibility: {
          recommended: { settingTraits: ['school'], socialRoles: ['student'] },
        },
      },
      worldProfile,
    })
    const adaptable = buildWorldPackCompatibilityReview({
      pack: {
        id: 'fan_culture',
        name: 'Fan culture',
        compatibility: {
          recommended: { era: ['modern'], settingTraits: ['entertainment'] },
          adaptable: { settingTraits: ['school'] },
        },
      },
      worldProfile,
    })
    const needsContext = buildWorldPackCompatibilityReview({
      pack: {
        id: 'urban_mystery',
        name: 'Urban mystery',
        compatibility: {
          requiresConfirmation: { realism: ['supernatural'] },
          recommended: { era: ['modern'] },
        },
      },
      worldProfile,
    })
    const conflicting = buildWorldPackCompatibilityReview({
      pack: {
        id: 'survival_city',
        name: 'Survival city',
        compatibility: {
          conflicts: { economyTraits: ['ordinary'] },
        },
      },
      worldProfile,
    })
    const unsupported = buildWorldPackCompatibilityReview({
      pack: {
        id: 'black_market',
        name: 'Black market',
        supportState: 'unsupported',
        unsupportedReason: 'needs_dedicated_app',
      },
      worldProfile,
    })

    expect(recommended.fitStatus).toBe(WORLD_PACK_FIT_STATUS.RECOMMENDED)
    expect(adaptable.fitStatus).toBe(WORLD_PACK_FIT_STATUS.ADAPTABLE)
    expect(needsContext.fitStatus).toBe(WORLD_PACK_FIT_STATUS.NEEDS_CONTEXT)
    expect(conflicting.fitStatus).toBe(WORLD_PACK_FIT_STATUS.CONFLICTING)
    expect(unsupported.fitStatus).toBe(WORLD_PACK_FIT_STATUS.UNSUPPORTED)
    expect(unsupported.enableable).toBe(false)
  })

  test('groups recommendations without hiding supported packs', () => {
    const grouped = groupWorldPackRecommendations([
      { packId: 'a', fitStatus: 'recommended' },
      { packId: 'b', fitStatus: 'conflicting' },
      { packId: 'c', fitStatus: 'adaptable' },
      { packId: 'd', fitStatus: 'unsupported' },
    ])

    expect(grouped.recommended.map((item) => item.packId)).toEqual(['a'])
    expect(grouped.adaptable.map((item) => item.packId)).toEqual(['c'])
    expect(grouped.conflicting.map((item) => item.packId)).toEqual(['b'])
    expect(grouped.unsupported.map((item) => item.packId)).toEqual(['d'])
    expect(grouped.browseable.map((item) => item.packId)).toEqual(['a', 'c', 'b'])
  })
})
