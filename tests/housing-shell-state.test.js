import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  HOUSING_SHELL_PREVIEW_STATE_STORAGE_KEY,
  resetHousingShellStateForTesting,
  useHousingShellState,
} from '../src/composables/useHousingShellState'
import { HOUSING_LISTINGS, validateHousingFixtureContract } from '../src/lib/housing-shell-data'

describe('Housing S1 preview state', () => {
  beforeEach(() => {
    localStorage.clear()
    resetHousingShellStateForTesting()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-23T09:00:00.000Z'))
  })

  test('fixture listings use stable IDs separate from Map area IDs', () => {
    expect(validateHousingFixtureContract()).toBe(true)
    expect(new Set(HOUSING_LISTINGS.map((item) => item.id)).size).toBe(HOUSING_LISTINGS.length)
    for (const item of HOUSING_LISTINGS) {
      expect(item.id).toMatch(/^housing_listing_/)
      expect(item.id).not.toBe(item.areaRef.placeId)
      expect(item.areaRef.mapPackId).toBe('real-seoul-v1')
    }
  })

  test('favorites and recent views persist locally with bounded stable IDs', () => {
    const state = useHousingShellState()
    state.toggleFavorite('housing_listing_jari_001')
    state.markRecentlyViewed('housing_listing_jari_002')
    state.markRecentlyViewed('housing_listing_jari_001')

    const stored = JSON.parse(localStorage.getItem(HOUSING_SHELL_PREVIEW_STATE_STORAGE_KEY))
    expect(stored.version).toBe(1)
    expect(stored.favoriteIds).toEqual(['housing_listing_jari_001'])
    expect(stored.recentIds).toEqual(['housing_listing_jari_001', 'housing_listing_jari_002'])
  })

  test('viewing draft can be saved, rescheduled, cancelled, and restored', () => {
    const state = useHousingShellState()
    const first = state.saveViewingDraft({
      listingId: 'housing_listing_jari_001',
      slotId: '2026-08-29T10:30:00+09:00',
      note: '留意下午采光',
    })
    expect(first.status).toBe('draft')
    expect(first.note).toBe('留意下午采光')

    const changed = state.saveViewingDraft({
      listingId: 'housing_listing_jari_001',
      slotId: '2026-08-30T11:00:00+09:00',
      note: '改到周日',
    })
    expect(changed.slotId).toContain('2026-08-30')
    expect(state.viewingDrafts.value).toHaveLength(1)

    expect(state.cancelViewingDraft('housing_listing_jari_001').status).toBe('cancelled')
    expect(state.restoreViewingDraft('housing_listing_jari_001').status).toBe('draft')
  })

  test('unavailable or withdrawn listings cannot create a viewing draft', () => {
    const state = useHousingShellState()
    expect(state.saveViewingDraft({ listingId: 'housing_listing_jari_006', slotId: '2026-08-29T10:30:00+09:00' })).toBeNull()
    expect(state.saveViewingDraft({ listingId: 'housing_listing_jari_007', slotId: '2026-08-29T10:30:00+09:00' })).toBeNull()
    expect(state.viewingDrafts.value).toHaveLength(0)
  })

  test('corrupt persisted data fails closed on reload boundary', async () => {
    localStorage.setItem(HOUSING_SHELL_PREVIEW_STATE_STORAGE_KEY, '{invalid')
    vi.resetModules()
    const module = await import('../src/composables/useHousingShellState.js')
    const state = module.useHousingShellState()
    expect(state.favoriteIds.value).toEqual([])
    expect(state.viewingDrafts.value).toEqual([])
  })
})
