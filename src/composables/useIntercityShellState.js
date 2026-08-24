import { computed, reactive } from 'vue'
import {
  INTERCITY_MODES,
  INTERCITY_SHELL_STORAGE_KEY,
  INTERCITY_SHELL_STORAGE_VERSION,
  getIntercityFare,
  getIntercityService,
} from '../lib/intercity-shell-data'

const VALID_TABS = new Set(['discover', 'search', 'trips', 'me'])
const VALID_MODES = new Set(INTERCITY_MODES.map((mode) => mode.id))
const uniqueServiceIds = (value) => [...new Set((Array.isArray(value) ? value : []).filter((id) => getIntercityService(id)))]

const normalizeDraft = (draft) => {
  const service = getIntercityService(draft?.serviceId)
  const fare = getIntercityFare(draft?.serviceId, draft?.fareId)
  const passengers = Number(draft?.passengers)
  if (!service || !fare || !['available', 'limited'].includes(service.availability)) return null
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 6) return null
  return { serviceId: service.id, fareId: fare.id, passengers }
}

const createDefaultState = () => ({
  version: INTERCITY_SHELL_STORAGE_VERSION,
  activeTab: 'discover',
  modeId: 'all',
  favoriteServiceIds: [],
  recentServiceIds: [],
  tripDrafts: [],
  fareAlertsEnabled: true,
})

export const normalizeIntercityShellState = (candidate) => {
  const fallback = createDefaultState()
  if (!candidate || candidate.version !== INTERCITY_SHELL_STORAGE_VERSION) return fallback
  const drafts = (Array.isArray(candidate.tripDrafts) ? candidate.tripDrafts : []).map(normalizeDraft).filter(Boolean)
  return {
    version: INTERCITY_SHELL_STORAGE_VERSION,
    activeTab: VALID_TABS.has(candidate.activeTab) ? candidate.activeTab : fallback.activeTab,
    modeId: VALID_MODES.has(candidate.modeId) ? candidate.modeId : fallback.modeId,
    favoriteServiceIds: uniqueServiceIds(candidate.favoriteServiceIds),
    recentServiceIds: uniqueServiceIds(candidate.recentServiceIds).slice(0, 8),
    tripDrafts: drafts.filter((draft, index) => drafts.findIndex((item) => item.serviceId === draft.serviceId) === index).slice(0, 8),
    fareAlertsEnabled: candidate.fareAlertsEnabled !== false,
  }
}

const loadState = () => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem(INTERCITY_SHELL_STORAGE_KEY) : ''
    return raw ? normalizeIntercityShellState(JSON.parse(raw)) : createDefaultState()
  } catch { return createDefaultState() }
}

const state = reactive(loadState())
const clone = () => JSON.parse(JSON.stringify(state))
const persist = (next) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { ok: false, error: 'storage_unavailable' }
    window.localStorage.setItem(INTERCITY_SHELL_STORAGE_KEY, JSON.stringify(next))
    Object.assign(state, next)
    return { ok: true }
  } catch { return { ok: false, error: 'write_failed' } }
}

export const useIntercityShellState = () => {
  const setActiveTab = (tab) => {
    if (!VALID_TABS.has(tab)) return { ok: false, error: 'tab_invalid' }
    const next = clone(); next.activeTab = tab; return persist(next)
  }
  const setMode = (modeId) => {
    if (!VALID_MODES.has(modeId)) return { ok: false, error: 'mode_invalid' }
    const next = clone(); next.modeId = modeId; return persist(next)
  }
  const toggleFavorite = (serviceId) => {
    if (!getIntercityService(serviceId)) return { ok: false, error: 'service_missing' }
    const next = clone()
    next.favoriteServiceIds = next.favoriteServiceIds.includes(serviceId)
      ? next.favoriteServiceIds.filter((id) => id !== serviceId)
      : [...next.favoriteServiceIds, serviceId]
    const receipt = persist(next)
    return receipt.ok ? { ok: true, active: next.favoriteServiceIds.includes(serviceId) } : receipt
  }
  const recordRecent = (serviceId) => {
    if (!getIntercityService(serviceId)) return { ok: false, error: 'service_missing' }
    const next = clone(); next.recentServiceIds = [serviceId, ...next.recentServiceIds.filter((id) => id !== serviceId)].slice(0, 8); return persist(next)
  }
  const saveTripDraft = (draft) => {
    const normalized = normalizeDraft(draft)
    if (!normalized) return { ok: false, error: 'draft_invalid' }
    const next = clone(); next.tripDrafts = [normalized, ...next.tripDrafts.filter((item) => item.serviceId !== normalized.serviceId)].slice(0, 8)
    return persist(next)
  }
  const removeTripDraft = (serviceId) => {
    if (!getIntercityService(serviceId)) return { ok: false, error: 'service_missing' }
    const next = clone(); next.tripDrafts = next.tripDrafts.filter((draft) => draft.serviceId !== serviceId); return persist(next)
  }
  const toggleFareAlerts = () => {
    const next = clone(); next.fareAlertsEnabled = !next.fareAlertsEnabled
    const receipt = persist(next)
    return receipt.ok ? { ok: true, enabled: next.fareAlertsEnabled } : receipt
  }
  return {
    previewState: state,
    activeTab: computed(() => state.activeTab),
    modeId: computed(() => state.modeId),
    favoriteServiceIds: computed(() => state.favoriteServiceIds),
    recentServiceIds: computed(() => state.recentServiceIds),
    tripDrafts: computed(() => state.tripDrafts),
    fareAlertsEnabled: computed(() => state.fareAlertsEnabled),
    setActiveTab,
    setMode,
    toggleFavorite,
    recordRecent,
    saveTripDraft,
    removeTripDraft,
    toggleFareAlerts,
  }
}

export const resetIntercityShellStateForTesting = () => {
  Object.assign(state, createDefaultState())
  try { window.localStorage?.removeItem(INTERCITY_SHELL_STORAGE_KEY) } catch { /* best effort */ }
}
