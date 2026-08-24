import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { normalizeTravelShellState, resetTravelShellStateForTesting, useTravelShellState } from '../src/composables/useTravelShellState'
import { TRAVEL_SHELL_STORAGE_KEY, getTravelStay, validateTravelFixtureContract } from '../src/lib/travel-shell-data'

describe('ROAM Travel S1 preview state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetTravelShellStateForTesting()
    vi.restoreAllMocks()
  })

  test('validates stable stays, room availability, and read-only Map references', () => {
    expect(validateTravelFixtureContract()).toBe(true)
    expect(getTravelStay('roam-stay-seongsu-riverside')).toMatchObject({ availability: 'available', mapPlaceId: 'seoul-seongsu-riverside-hotel' })
    expect(getTravelStay('roam-stay-sokcho-cloudline')).toMatchObject({ availability: 'source_stale', rooms: [] })
  })

  test('persists only bounded discovery and local stay-intent state', () => {
    const state = useTravelShellState()
    expect(state.setActiveTab('trips')).toEqual({ ok: true })
    expect(state.setFilter('coast')).toEqual({ ok: true })
    expect(state.toggleFavorite('roam-stay-busan-wavehouse')).toEqual({ ok: true, active: true })
    expect(state.recordRecent('roam-stay-busan-wavehouse')).toEqual({ ok: true })
    expect(state.saveBookingDraft({ stayId: 'roam-stay-busan-wavehouse', roomId: 'wavehouse-harbor', checkIn: '2026-09-18', checkOut: '2026-09-20', guests: 2 })).toEqual({ ok: true })
    expect(state.toggleDealAlerts()).toEqual({ ok: true, enabled: false })
    const stored = JSON.parse(localStorage.getItem(TRAVEL_SHELL_STORAGE_KEY))
    expect(stored).toMatchObject({ activeTab: 'trips', filterId: 'coast', dealAlertsEnabled: false })
    expect(stored.bookingDrafts).toEqual([{ stayId: 'roam-stay-busan-wavehouse', roomId: 'wavehouse-harbor', checkIn: '2026-09-18', checkOut: '2026-09-20', guests: 2 }])
    expect(JSON.stringify(stored)).not.toMatch(/reservationId|wallet|payment|calendar|route|agenda|eventInstance|notification/i)
  })

  test('fails closed for unavailable, stale, unknown, and malformed drafts', () => {
    const state = useTravelShellState()
    expect(state.saveBookingDraft({ stayId: 'roam-stay-jeonju-paper-moon', roomId: 'missing', checkIn: '2026-09-18', checkOut: '2026-09-20', guests: 2 })).toEqual({ ok: false, error: 'draft_invalid' })
    expect(state.saveBookingDraft({ stayId: 'roam-stay-sokcho-cloudline', roomId: 'missing', checkIn: '2026-09-18', checkOut: '2026-09-20', guests: 2 })).toEqual({ ok: false, error: 'draft_invalid' })
    expect(state.setActiveTab('checkout')).toEqual({ ok: false, error: 'tab_invalid' })
    expect(state.setFilter('flight')).toEqual({ ok: false, error: 'filter_invalid' })
    expect(normalizeTravelShellState({ version: 1, activeTab: 'checkout', filterId: 'flight', bookingDrafts: [{ stayId: 'missing' }] })).toMatchObject({ activeTab: 'explore', filterId: 'all', bookingDrafts: [] })
  })

  test('does not mutate reactive state when persistence fails', () => {
    const state = useTravelShellState()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(state.toggleFavorite('roam-stay-seongsu-riverside')).toEqual({ ok: false, error: 'write_failed' })
    expect(state.favoriteStayIds.value).toEqual([])
  })
})
