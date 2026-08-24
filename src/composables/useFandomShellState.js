import { computed, reactive } from 'vue'
import {
  FANDOM_ARTISTS,
  FANDOM_COMMUNITY_POST_IDS,
  FANDOM_SHELL_STORAGE_KEY,
  FANDOM_SHELL_STORAGE_VERSION,
  FANDOM_SUBSCRIPTION_CHANNELS,
  getFandomArtist,
  getFandomSubscriptionChannel,
} from '../lib/fandom-shell-data'

const VALID_TABS = new Set(['home', 'artists', 'messages', 'me'])
const uniqueKnownIds = (value, known) => [...new Set((Array.isArray(value) ? value : []).filter((id) => known.has(id)))]

const createDefaultState = () => ({
  version: FANDOM_SHELL_STORAGE_VERSION,
  activeTab: 'home',
  followedArtistIds: ['artist-yun-iseo'],
  bookmarkedPostIds: [],
  readMessageIds: [],
  notificationsEnabled: true,
})

export const normalizeFandomShellState = (candidate) => {
  const fallback = createDefaultState()
  if (!candidate || candidate.version !== FANDOM_SHELL_STORAGE_VERSION) return fallback
  const artistIds = new Set(FANDOM_ARTISTS.map((artist) => artist.id))
  const postIds = new Set(FANDOM_COMMUNITY_POST_IDS)
  const messageIds = new Set(FANDOM_SUBSCRIPTION_CHANNELS.flatMap((channel) => channel.messages.map((message) => message.id)))
  return {
    version: FANDOM_SHELL_STORAGE_VERSION,
    activeTab: VALID_TABS.has(candidate.activeTab) ? candidate.activeTab : 'home',
    followedArtistIds: uniqueKnownIds(candidate.followedArtistIds, artistIds),
    bookmarkedPostIds: uniqueKnownIds(candidate.bookmarkedPostIds, postIds),
    readMessageIds: uniqueKnownIds(candidate.readMessageIds, messageIds),
    notificationsEnabled: candidate.notificationsEnabled !== false,
  }
}

const loadState = () => {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage?.getItem(FANDOM_SHELL_STORAGE_KEY) : ''
    return raw ? normalizeFandomShellState(JSON.parse(raw)) : createDefaultState()
  } catch {
    return createDefaultState()
  }
}

const state = reactive(loadState())
const persist = (next) => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return { ok: false, error: 'storage_unavailable' }
    window.localStorage.setItem(FANDOM_SHELL_STORAGE_KEY, JSON.stringify(next))
    Object.assign(state, next)
    return { ok: true }
  } catch {
    return { ok: false, error: 'write_failed' }
  }
}
const clone = () => JSON.parse(JSON.stringify(state))

export const useFandomShellState = () => {
  const updateIds = (field, id, exists) => {
    if (!exists) return { ok: false, error: 'record_missing' }
    const next = clone()
    next[field] = next[field].includes(id) ? next[field].filter((value) => value !== id) : [...next[field], id]
    const receipt = persist(next)
    return receipt.ok ? { ok: true, active: next[field].includes(id) } : receipt
  }
  const setActiveTab = (tab) => {
    if (!VALID_TABS.has(tab)) return { ok: false, error: 'tab_invalid' }
    const next = clone(); next.activeTab = tab
    return persist(next)
  }
  const markChannelRead = (channelId) => {
    const channel = getFandomSubscriptionChannel(channelId)
    if (!channel) return { ok: false, error: 'channel_missing' }
    const next = clone()
    next.readMessageIds = [...new Set([...next.readMessageIds, ...channel.messages.map((message) => message.id)])]
    return persist(next)
  }
  const toggleNotifications = () => {
    const next = clone(); next.notificationsEnabled = !next.notificationsEnabled
    const receipt = persist(next)
    return receipt.ok ? { ok: true, enabled: next.notificationsEnabled } : receipt
  }
  return {
    previewState: state,
    activeTab: computed(() => state.activeTab),
    followedArtistIds: computed(() => state.followedArtistIds),
    bookmarkedPostIds: computed(() => state.bookmarkedPostIds),
    readMessageIds: computed(() => state.readMessageIds),
    notificationsEnabled: computed(() => state.notificationsEnabled),
    setActiveTab,
    toggleFollow: (artistId) => updateIds('followedArtistIds', artistId, getFandomArtist(artistId)),
    toggleBookmark: (postId) => updateIds('bookmarkedPostIds', postId, FANDOM_COMMUNITY_POST_IDS.includes(postId)),
    markChannelRead,
    toggleNotifications,
  }
}

export const resetFandomShellStateForTesting = () => {
  Object.assign(state, createDefaultState())
  try { window.localStorage?.removeItem(FANDOM_SHELL_STORAGE_KEY) } catch { /* best effort */ }
}
