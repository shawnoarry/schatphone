import { computed, reactive } from 'vue'
import { findHousingListing, HOUSING_VIEWING_SLOTS } from '../lib/housing-shell-data'

export const HOUSING_SHELL_PREVIEW_STATE_STORAGE_KEY = 'schatphone:housing-shell:preview-state'
const HOUSING_SHELL_PREVIEW_STATE_VERSION = 1
const MAX_RECENT_LISTINGS = 12

const createEmptyState = () => ({
  favoriteIds: [],
  recentIds: [],
  viewingDrafts: [],
  activeMode: 'rent',
})

const normalizeIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((id) => typeof id === 'string' && findHousingListing(id)))]
    : []

const normalizeViewingDraft = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const listingId = typeof raw.listingId === 'string' ? raw.listingId : ''
  const slotId = typeof raw.slotId === 'string' ? raw.slotId : ''
  const note = typeof raw.note === 'string' ? raw.note.trim().slice(0, 600) : ''
  const status = raw.status === 'cancelled' ? 'cancelled' : 'draft'
  const updatedAt = Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0
  if (!findHousingListing(listingId) || !HOUSING_VIEWING_SLOTS.some((slot) => slot.id === slotId)) {
    return null
  }
  return { listingId, slotId, note, status, updatedAt }
}

const loadState = () => {
  const empty = createEmptyState()
  try {
    if (typeof window === 'undefined' || !window.localStorage) return empty
    const raw = window.localStorage.getItem(HOUSING_SHELL_PREVIEW_STATE_STORAGE_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== HOUSING_SHELL_PREVIEW_STATE_VERSION) return empty
    return {
      favoriteIds: normalizeIds(parsed.favoriteIds),
      recentIds: normalizeIds(parsed.recentIds).slice(0, MAX_RECENT_LISTINGS),
      viewingDrafts: (Array.isArray(parsed.viewingDrafts) ? parsed.viewingDrafts : [])
        .map(normalizeViewingDraft)
        .filter(Boolean),
      activeMode: parsed.activeMode === 'buy' ? 'buy' : 'rent',
    }
  } catch {
    return empty
  }
}

const state = reactive(loadState())

const persist = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    window.localStorage.setItem(
      HOUSING_SHELL_PREVIEW_STATE_STORAGE_KEY,
      JSON.stringify({ ...state, version: HOUSING_SHELL_PREVIEW_STATE_VERSION }),
    )
  } catch {
    // S1 preview state is best-effort and must never block ordinary browsing.
  }
}

export const useHousingShellState = () => {
  const favoriteIds = computed(() => state.favoriteIds)
  const recentIds = computed(() => state.recentIds)
  const viewingDrafts = computed(() => state.viewingDrafts)
  const activeMode = computed(() => state.activeMode)

  const setActiveMode = (mode) => {
    state.activeMode = mode === 'buy' ? 'buy' : 'rent'
    persist()
  }

  const isFavorite = (listingId) => state.favoriteIds.includes(listingId)

  const toggleFavorite = (listingId) => {
    if (!findHousingListing(listingId)) return false
    const index = state.favoriteIds.indexOf(listingId)
    if (index >= 0) state.favoriteIds.splice(index, 1)
    else state.favoriteIds.unshift(listingId)
    persist()
    return state.favoriteIds.includes(listingId)
  }

  const markRecentlyViewed = (listingId) => {
    if (!findHousingListing(listingId)) return
    state.recentIds = [listingId, ...state.recentIds.filter((id) => id !== listingId)].slice(
      0,
      MAX_RECENT_LISTINGS,
    )
    persist()
  }

  const getViewingDraft = (listingId) =>
    state.viewingDrafts.find((draft) => draft.listingId === listingId) || null

  const saveViewingDraft = ({ listingId, slotId, note = '' }) => {
    const listing = findHousingListing(listingId)
    if (!listing || listing.sourceStatus !== 'available') return null
    const normalized = normalizeViewingDraft({
      listingId,
      slotId,
      note,
      status: 'draft',
      updatedAt: Date.now(),
    })
    if (!normalized) return null
    const index = state.viewingDrafts.findIndex((draft) => draft.listingId === listingId)
    if (index >= 0) state.viewingDrafts.splice(index, 1, normalized)
    else state.viewingDrafts.unshift(normalized)
    persist()
    return normalized
  }

  const cancelViewingDraft = (listingId) => {
    const index = state.viewingDrafts.findIndex((draft) => draft.listingId === listingId)
    if (index < 0) return null
    const cancelled = { ...state.viewingDrafts[index], status: 'cancelled', updatedAt: Date.now() }
    state.viewingDrafts.splice(index, 1, cancelled)
    persist()
    return cancelled
  }

  const restoreViewingDraft = (listingId) => {
    const index = state.viewingDrafts.findIndex((draft) => draft.listingId === listingId)
    if (index < 0) return null
    const restored = { ...state.viewingDrafts[index], status: 'draft', updatedAt: Date.now() }
    state.viewingDrafts.splice(index, 1, restored)
    persist()
    return restored
  }

  return {
    previewState: state,
    favoriteIds,
    recentIds,
    viewingDrafts,
    activeMode,
    setActiveMode,
    isFavorite,
    toggleFavorite,
    markRecentlyViewed,
    getViewingDraft,
    saveViewingDraft,
    cancelViewingDraft,
    restoreViewingDraft,
  }
}

export const resetHousingShellStateForTesting = () => {
  Object.assign(state, createEmptyState())
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(HOUSING_SHELL_PREVIEW_STATE_STORAGE_KEY)
    }
  } catch {
    // ignore storage unavailability in tests
  }
}
