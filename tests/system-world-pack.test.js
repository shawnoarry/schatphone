import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSystemStore } from '../src/stores/system'

describe('system world pack store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T15:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('lists built-in world packs and keeps default active', () => {
    const store = useSystemStore()

    expect(store.listWorldPacks().map((pack) => pack.id)).toEqual([
      'default_world',
      'fandom_parallel',
      'modern_parallel',
      'survival_city',
    ])
    expect(store.getActiveWorldPack()).toMatchObject({
      id: 'default_world',
      state: 'active',
    })
  })

  test('builds review and activates a built-in world pack', () => {
    const store = useSystemStore()
    const review = store.buildWorldPackActivationReview('survival_city')

    expect(review).toMatchObject({
      packId: 'survival_city',
      blocked: false,
      summary: {
        appBindingCount: 2,
        serviceTemplateCount: 1,
      },
    })

    const result = store.activateWorldPack('survival_city')

    expect(result.ok).toBe(true)
    expect(store.user.activeWorldPackId).toBe('survival_city')
    expect(store.getActiveWorldPack()).toMatchObject({
      id: 'survival_city',
      state: 'active',
    })
    expect(store.user.worldPackActivation).toMatchObject({
      activePackId: 'survival_city',
      state: 'active',
      reviewedAt: 1780066800000,
      activatedAt: 1780066800000,
    })
  })

  test('blocks activation when a pack references missing material', () => {
    const store = useSystemStore()
    store.upsertWorldPack({
      id: 'blocked_pack',
      title: 'Blocked',
      knowledgePointIds: ['kp_missing'],
    })

    const result = store.activateWorldPack('blocked_pack')

    expect(result.ok).toBe(false)
    expect(result.reason).toBe('blocked')
    expect(result.review.blockers).toEqual([{ type: 'missing_knowledge', id: 'kp_missing' }])
    expect(store.user.activeWorldPackId).toBe('default_world')
  })

  test('restores world pack state from backup payload', () => {
    const store = useSystemStore()
    const ok = store.restoreFromBackup({
      system: {
        user: {
          globalWorldview: 'Backup world.',
          activeWorldPackId: 'modern_parallel',
          worldPackActivation: {
            activePackId: 'modern_parallel',
            state: 'active',
            reviewedAt: 123,
            activatedAt: 456,
          },
        },
      },
    })

    expect(ok).toBe(true)
    expect(store.getActiveWorldPack()).toMatchObject({
      id: 'modern_parallel',
      title: '现代平行世界',
    })
    expect(store.user.worldPackActivation).toMatchObject({
      activePackId: 'modern_parallel',
      activatedAt: 456,
    })
  })
})
