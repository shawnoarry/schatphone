import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  normalizeTicketsShellState,
  resetTicketsShellStateForTesting,
  useTicketsShellState,
} from '../src/composables/useTicketsShellState'
import {
  TICKETS_SHELL_STORAGE_KEY,
  getTicketEvent,
  validateTicketsFixtureContract,
} from '../src/lib/tickets-shell-data'

describe('GATE Tickets S1 preview state', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    resetTicketsShellStateForTesting()
    vi.restoreAllMocks()
  })

  test('validates stable events with explicit admission and Map-reference metadata', () => {
    expect(validateTicketsFixtureContract()).toBe(true)
    expect(getTicketEvent('gate-event-hanul-dome-20260912')).toMatchObject({
      status: 'lottery_open',
      mapPlaceId: 'seoul-kspo-dome',
    })
  })

  test('persists only bounded browse and local intent markers', () => {
    const state = useTicketsShellState()
    expect(state.setActiveTab('passes')).toEqual({ ok: true })
    expect(state.setCategory('concert')).toEqual({ ok: true })
    expect(state.toggleFavorite('gate-event-hanul-dome-20260912')).toEqual({ ok: true, active: true })
    expect(state.toggleDraft('gate-event-hanul-dome-20260912')).toEqual({ ok: true, active: true })
    expect(state.recordRecent('gate-event-hanul-dome-20260912')).toEqual({ ok: true })
    expect(state.toggleAlerts()).toEqual({ ok: true, enabled: false })
    const stored = JSON.parse(localStorage.getItem(TICKETS_SHELL_STORAGE_KEY))
    expect(stored).toMatchObject({ activeTab: 'passes', categoryId: 'concert', alertsEnabled: false })
    expect(stored.favoriteEventIds).toEqual(['gate-event-hanul-dome-20260912'])
    expect(stored.draftEventIds).toEqual(['gate-event-hanul-dome-20260912'])
    expect(JSON.stringify(stored)).not.toMatch(/seat|order|wallet|payment|calendar|route|agenda|eventInstance/i)
  })

  test('fails closed for unknown records and invalid restore values', () => {
    const state = useTicketsShellState()
    expect(state.setActiveTab('checkout')).toEqual({ ok: false, error: 'tab_invalid' })
    expect(state.setCategory('sports')).toEqual({ ok: false, error: 'category_invalid' })
    expect(state.toggleFavorite('missing')).toEqual({ ok: false, error: 'event_missing' })
    expect(state.toggleDraft('missing')).toEqual({ ok: false, error: 'event_missing' })
    expect(normalizeTicketsShellState({ version: 1, activeTab: 'checkout', categoryId: 'sports', draftEventIds: ['missing'] })).toMatchObject({ activeTab: 'discover', categoryId: 'all', draftEventIds: [] })
  })

  test('does not mutate reactive state when persistence fails', () => {
    const state = useTicketsShellState()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(state.toggleDraft('gate-event-hanul-dome-20260912')).toEqual({ ok: false, error: 'write_failed' })
    expect(state.draftEventIds.value).toEqual([])
  })
})
