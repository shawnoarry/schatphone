export const COMMUNITY_SHELL_STATE_STORAGE_KEY = 'schatphone:community-shell:preview-state'

const STATE_VERSION = 1

const uniqueStrings = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === 'string' && item.length <= 180))]
    : []

export const createDefaultCommunityShellState = () => ({
  version: STATE_VERSION,
  followedAccountIds: ['account_hanul_official', 'account_yun_iseo', 'account_nodeul_live'],
  bookmarkedPostIds: [],
  readPostIds: [],
  activeChannelId: 'following',
})

export const normalizeCommunityShellState = (value) => {
  const fallback = createDefaultCommunityShellState()
  if (!value || typeof value !== 'object') return fallback
  return {
    version: STATE_VERSION,
    followedAccountIds: uniqueStrings(value.followedAccountIds),
    bookmarkedPostIds: uniqueStrings(value.bookmarkedPostIds),
    readPostIds: uniqueStrings(value.readPostIds),
    activeChannelId:
      ['following', 'explore', 'news', 'bookmarks'].includes(value.activeChannelId)
        ? value.activeChannelId
        : fallback.activeChannelId,
  }
}

export const loadCommunityShellState = (storage = globalThis?.localStorage) => {
  if (!storage?.getItem) return createDefaultCommunityShellState()
  try {
    const raw = storage.getItem(COMMUNITY_SHELL_STATE_STORAGE_KEY)
    return raw ? normalizeCommunityShellState(JSON.parse(raw)) : createDefaultCommunityShellState()
  } catch {
    return createDefaultCommunityShellState()
  }
}

export const saveCommunityShellState = (state, storage = globalThis?.localStorage) => {
  if (!storage?.setItem) return false
  try {
    storage.setItem(
      COMMUNITY_SHELL_STATE_STORAGE_KEY,
      JSON.stringify(normalizeCommunityShellState(state)),
    )
    return true
  } catch {
    return false
  }
}

export const toggleCommunityStateId = (ids, id) => {
  const normalized = uniqueStrings(ids)
  return normalized.includes(id)
    ? normalized.filter((item) => item !== id)
    : [...normalized, id]
}
