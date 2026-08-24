import { computed, reactive } from 'vue'
import {
  TRAVEL_FILTERS,
  TRAVEL_SHELL_STORAGE_KEY,
  TRAVEL_SHELL_STORAGE_VERSION,
  getTravelRoom,
  getTravelStay,
} from '../lib/travel-shell-data'

const VALID_TABS = new Set(['explore', 'search', 'trips', 'me'])
const VALID_FILTERS = new Set(TRAVEL_FILTERS.map((filter) => filter.id))
const uniqueStayIds = (value) => [...new Set((Array.isArray(value) ? value : []).filter((id) => getTravelStay(id)))]
const normalizeDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
const normalizeDraft = (draft) => {
  const stay = getTravelStay(draft?.stayId)
  const room = getTravelRoom(draft?.stayId, draft?.roomId)
  const checkIn = normalizeDate(draft?.checkIn)
  const checkOut = normalizeDate(draft?.checkOut)
  const guests = Number(draft?.guests)
  if (!stay || !room || !checkIn || !checkOut || checkOut <= checkIn || !Number.isInteger(guests) || guests < 1 || guests > 6) return null
  if (!['available', 'limited'].includes(stay.availability)) return null
  return { stayId: stay.id, roomId: room.id, checkIn, checkOut, guests }
}

const createDefaultState = () => ({
  version: TRAVEL_SHELL_STORAGE_VERSION,
  activeTab: 'explore', filterId: 'all', favoriteStayIds: [], recentStayIds: [], bookingDrafts: [], dealAlertsEnabled: true,
})

export const normalizeTravelShellState = (candidate) => {
  const fallback = createDefaultState()
  if (!candidate || candidate.version !== TRAVEL_SHELL_STORAGE_VERSION) return fallback
  const drafts = (Array.isArray(candidate.bookingDrafts) ? candidate.bookingDrafts : []).map(normalizeDraft).filter(Boolean)
  return {
    version: TRAVEL_SHELL_STORAGE_VERSION,
    activeTab: VALID_TABS.has(candidate.activeTab) ? candidate.activeTab : fallback.activeTab,
    filterId: VALID_FILTERS.has(candidate.filterId) ? candidate.filterId : fallback.filterId,
    favoriteStayIds: uniqueStayIds(candidate.favoriteStayIds),
    recentStayIds: uniqueStayIds(candidate.recentStayIds).slice(0, 8),
    bookingDrafts: drafts.filter((draft, index) => drafts.findIndex((item) => item.stayId === draft.stayId) === index).slice(0, 8),
    dealAlertsEnabled: candidate.dealAlertsEnabled !== false,
  }
}

const loadState = () => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem(TRAVEL_SHELL_STORAGE_KEY) : ''
    return raw ? normalizeTravelShellState(JSON.parse(raw)) : createDefaultState()
  } catch { return createDefaultState() }
}
const state = reactive(loadState())
const clone = () => JSON.parse(JSON.stringify(state))
const persist = (next) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { ok: false, error: 'storage_unavailable' }
    window.localStorage.setItem(TRAVEL_SHELL_STORAGE_KEY, JSON.stringify(next)); Object.assign(state, next); return { ok: true }
  } catch { return { ok: false, error: 'write_failed' } }
}

export const useTravelShellState = () => {
  const setActiveTab = (tab) => {
    if (!VALID_TABS.has(tab)) return { ok: false, error: 'tab_invalid' }
    const next = clone(); next.activeTab = tab; return persist(next)
  }
  const setFilter = (filterId) => {
    if (!VALID_FILTERS.has(filterId)) return { ok: false, error: 'filter_invalid' }
    const next = clone(); next.filterId = filterId; return persist(next)
  }
  const toggleFavorite = (stayId) => {
    if (!getTravelStay(stayId)) return { ok: false, error: 'stay_missing' }
    const next = clone(); next.favoriteStayIds = next.favoriteStayIds.includes(stayId) ? next.favoriteStayIds.filter((id) => id !== stayId) : [...next.favoriteStayIds, stayId]
    const receipt = persist(next); return receipt.ok ? { ok: true, active: next.favoriteStayIds.includes(stayId) } : receipt
  }
  const recordRecent = (stayId) => {
    if (!getTravelStay(stayId)) return { ok: false, error: 'stay_missing' }
    const next = clone(); next.recentStayIds = [stayId, ...next.recentStayIds.filter((id) => id !== stayId)].slice(0, 8); return persist(next)
  }
  const saveBookingDraft = (draft) => {
    const normalized = normalizeDraft(draft)
    if (!normalized) return { ok: false, error: 'draft_invalid' }
    const next = clone(); next.bookingDrafts = [normalized, ...next.bookingDrafts.filter((item) => item.stayId !== normalized.stayId)].slice(0, 8)
    return persist(next)
  }
  const removeBookingDraft = (stayId) => {
    if (!getTravelStay(stayId)) return { ok: false, error: 'stay_missing' }
    const next = clone(); next.bookingDrafts = next.bookingDrafts.filter((draft) => draft.stayId !== stayId); return persist(next)
  }
  const toggleDealAlerts = () => { const next = clone(); next.dealAlertsEnabled = !next.dealAlertsEnabled; const receipt = persist(next); return receipt.ok ? { ok: true, enabled: next.dealAlertsEnabled } : receipt }
  return {
    previewState: state,
    activeTab: computed(() => state.activeTab), filterId: computed(() => state.filterId), favoriteStayIds: computed(() => state.favoriteStayIds),
    recentStayIds: computed(() => state.recentStayIds), bookingDrafts: computed(() => state.bookingDrafts), dealAlertsEnabled: computed(() => state.dealAlertsEnabled),
    setActiveTab, setFilter, toggleFavorite, recordRecent, saveBookingDraft, removeBookingDraft, toggleDealAlerts,
  }
}

export const resetTravelShellStateForTesting = () => {
  Object.assign(state, createDefaultState())
  try { window.localStorage?.removeItem(TRAVEL_SHELL_STORAGE_KEY) } catch { /* best effort */ }
}
