import { computed, reactive } from 'vue'
import {
  TICKET_CATEGORY_OPTIONS,
  TICKETS_SHELL_STORAGE_KEY,
  TICKETS_SHELL_STORAGE_VERSION,
  getTicketEvent,
} from '../lib/tickets-shell-data'

const VALID_TABS = new Set(['discover', 'search', 'passes', 'me'])
const VALID_CATEGORIES = new Set(TICKET_CATEGORY_OPTIONS.map((category) => category.id))
const uniqueEventIds = (value) => [...new Set((Array.isArray(value) ? value : []).filter((id) => getTicketEvent(id)))]

const createDefaultState = () => ({
  version: TICKETS_SHELL_STORAGE_VERSION,
  activeTab: 'discover',
  categoryId: 'all',
  favoriteEventIds: [],
  draftEventIds: [],
  recentEventIds: [],
  alertsEnabled: true,
})

export const normalizeTicketsShellState = (candidate) => {
  const fallback = createDefaultState()
  if (!candidate || candidate.version !== TICKETS_SHELL_STORAGE_VERSION) return fallback
  return {
    version: TICKETS_SHELL_STORAGE_VERSION,
    activeTab: VALID_TABS.has(candidate.activeTab) ? candidate.activeTab : fallback.activeTab,
    categoryId: VALID_CATEGORIES.has(candidate.categoryId) ? candidate.categoryId : fallback.categoryId,
    favoriteEventIds: uniqueEventIds(candidate.favoriteEventIds),
    draftEventIds: uniqueEventIds(candidate.draftEventIds),
    recentEventIds: uniqueEventIds(candidate.recentEventIds).slice(0, 8),
    alertsEnabled: candidate.alertsEnabled !== false,
  }
}

const loadState = () => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem(TICKETS_SHELL_STORAGE_KEY) : ''
    return raw ? normalizeTicketsShellState(JSON.parse(raw)) : createDefaultState()
  } catch {
    return createDefaultState()
  }
}

const state = reactive(loadState())
const clone = () => JSON.parse(JSON.stringify(state))
const persist = (next) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { ok: false, error: 'storage_unavailable' }
    window.localStorage.setItem(TICKETS_SHELL_STORAGE_KEY, JSON.stringify(next))
    Object.assign(state, next)
    return { ok: true }
  } catch {
    return { ok: false, error: 'write_failed' }
  }
}

export const useTicketsShellState = () => {
  const toggleEventId = (field, eventId) => {
    if (!getTicketEvent(eventId)) return { ok: false, error: 'event_missing' }
    const next = clone()
    next[field] = next[field].includes(eventId) ? next[field].filter((id) => id !== eventId) : [...next[field], eventId]
    const receipt = persist(next)
    return receipt.ok ? { ok: true, active: next[field].includes(eventId) } : receipt
  }
  const setActiveTab = (tab) => {
    if (!VALID_TABS.has(tab)) return { ok: false, error: 'tab_invalid' }
    const next = clone(); next.activeTab = tab
    return persist(next)
  }
  const setCategory = (categoryId) => {
    if (!VALID_CATEGORIES.has(categoryId)) return { ok: false, error: 'category_invalid' }
    const next = clone(); next.categoryId = categoryId
    return persist(next)
  }
  const recordRecent = (eventId) => {
    if (!getTicketEvent(eventId)) return { ok: false, error: 'event_missing' }
    const next = clone(); next.recentEventIds = [eventId, ...next.recentEventIds.filter((id) => id !== eventId)].slice(0, 8)
    return persist(next)
  }
  const toggleAlerts = () => {
    const next = clone(); next.alertsEnabled = !next.alertsEnabled
    const receipt = persist(next)
    return receipt.ok ? { ok: true, enabled: next.alertsEnabled } : receipt
  }
  return {
    previewState: state,
    activeTab: computed(() => state.activeTab),
    categoryId: computed(() => state.categoryId),
    favoriteEventIds: computed(() => state.favoriteEventIds),
    draftEventIds: computed(() => state.draftEventIds),
    recentEventIds: computed(() => state.recentEventIds),
    alertsEnabled: computed(() => state.alertsEnabled),
    setActiveTab,
    setCategory,
    toggleFavorite: (eventId) => toggleEventId('favoriteEventIds', eventId),
    toggleDraft: (eventId) => toggleEventId('draftEventIds', eventId),
    recordRecent,
    toggleAlerts,
  }
}

export const resetTicketsShellStateForTesting = () => {
  Object.assign(state, createDefaultState())
  try { window.localStorage?.removeItem(TICKETS_SHELL_STORAGE_KEY) } catch { /* best effort */ }
}
