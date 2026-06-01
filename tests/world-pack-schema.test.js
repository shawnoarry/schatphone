import { describe, expect, test, vi } from 'vitest'
import {
  DEFAULT_WORLD_PACK_ID,
  buildWorldPackActivationReview,
  normalizeWorldAppBinding,
  normalizeWorldPack,
  normalizeWorldPacks,
  normalizeWorldServiceAccountTemplate,
} from '../src/lib/world-pack-schema'

describe('world pack schema', () => {
  test('normalizes built-in packs with default pack first', () => {
    vi.setSystemTime(new Date('2026-05-29T14:00:00.000Z'))

    const packs = normalizeWorldPacks([])

    expect(packs[0]).toMatchObject({
      id: DEFAULT_WORLD_PACK_ID,
      state: 'active',
      title: '默认世界',
      name: 'Default world',
    })
    expect(packs.map((pack) => pack.id)).toContain('survival_city')
    expect(packs.find((pack) => pack.id === 'survival_city')?.appBindings.length).toBeGreaterThan(0)
  })

  test('normalizes app bindings and service account templates', () => {
    expect(normalizeWorldAppBinding({
      id: 'Fan Feed',
      archetype: 'subscription',
      title: '会员频道',
      moduleKey: 'Chat',
      route: '/chat-contacts',
    })).toMatchObject({
      id: 'fan_feed',
      archetype: 'subscription',
      title: '会员频道',
      moduleKey: 'chat',
      route: '/chat-contacts',
      enabled: true,
    })

    expect(normalizeWorldServiceAccountTemplate({
      id: 'Official Feed',
      title: '官方号',
      category: 'Publication',
      linkedAppBindingId: 'Fan Feed',
    })).toMatchObject({
      id: 'official_feed',
      title: '官方号',
      category: 'publication',
      linkedAppBindingId: 'fan_feed',
      pushPolicy: 'reviewed',
    })
  })

  test('builds activation review summaries and blockers', () => {
    const pack = normalizeWorldPack({
      id: 'review_pack',
      title: 'Review Pack',
      knowledgePointIds: ['kp_live', 'kp_missing'],
      profileTemplateIds: ['tpl_live'],
      bookSourceLinkIds: ['source_live'],
      appBindings: [{ id: 'feed', title: 'Feed', archetype: 'publication_feed' }],
      serviceAccountTemplates: [{ id: 'service', title: 'Service' }],
    })

    const review = buildWorldPackActivationReview({
      pack,
      knowledgePoints: [{ id: 'kp_live' }],
      profileTemplates: [{ id: 'tpl_live' }],
      bookSourceLinks: [{ id: 'source_live' }],
    })

    expect(review.summary).toMatchObject({
      bookSourceCount: 1,
      knowledgeCount: 2,
      profileTemplateCount: 1,
      appBindingCount: 1,
      serviceTemplateCount: 1,
    })
    expect(review.blocked).toBe(true)
    expect(review.blockers).toEqual([{ type: 'missing_knowledge', id: 'kp_missing' }])
  })

  test('normalizes world pack compatibility metadata', () => {
    const pack = normalizeWorldPack({
      id: 'school_life',
      title: 'School Life',
      supportState: 'supported',
      compatibility: {
        recommended: {
          era: ['modern'],
          settingTraits: ['school'],
          socialRoles: ['student'],
        },
        conflicts: {
          economyTraits: ['resource_scarce'],
        },
      },
    })

    expect(pack).toMatchObject({
      id: 'school_life',
      supportState: 'supported',
      unsupportedReason: '',
      compatibility: {
        recommended: {
          era: ['modern'],
          settingTraits: ['school'],
          socialRoles: ['student'],
        },
        conflicts: {
          economyTraits: ['resource_scarce'],
        },
      },
    })
  })

  test('includes trial compatible expansion packs', () => {
    const packs = normalizeWorldPacks([])
    expect(packs.map((pack) => pack.id)).toEqual(
      expect.arrayContaining(['school_life', 'business_family', 'urban_mystery']),
    )
    expect(packs.find((pack) => pack.id === 'school_life')).toMatchObject({
      supportState: 'supported',
      appBindings: expect.arrayContaining([
        expect.objectContaining({
          archetype: 'reservation',
          moduleKey: 'calendar',
        }),
      ]),
    })
    expect(packs.find((pack) => pack.id === 'urban_mystery')).toMatchObject({
      compatibility: {
        requiresConfirmation: {
          realism: ['supernatural'],
        },
      },
    })
  })
})
