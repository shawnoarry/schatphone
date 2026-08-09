import { normalizeShareableObject } from './shareable-object'

export const INTERNAL_CHAT_SHARE_STORAGE_KEY = 'schatphone:chat:internal-share-draft'
export const INTERNAL_CHAT_SHARE_ROUTE_QUERY = 'share'
export const INTERNAL_CHAT_SHARE_ROUTE_VALUE = 'internal'

const INTERNAL_CHAT_SHARE_MAX_AGE_MS = 24 * 60 * 60 * 1000
const MAX_SOURCE_ROUTE_LENGTH = 2048

const resolveStorage = (storage) => {
  if (storage) return storage
  if (typeof window === 'undefined') return null
  return window.localStorage
}

const sanitizeSourceRoute = (value) => {
  if (typeof value !== 'string') return '/home'
  const normalized = value.trim().slice(0, MAX_SOURCE_ROUTE_LENGTH)
  if (!normalized.startsWith('/') || normalized.startsWith('//')) return '/home'
  const path = normalized.split('?')[0]
  if (path === '/lock' || path === '/chat' || path.startsWith('/chat/')) return '/home'
  return normalized
}

export const createPendingInternalChatShare = (input = {}, now = Date.now()) => {
  const shareable = normalizeShareableObject(input.shareable)
  if (!shareable) return null
  const createdAt = Number.isFinite(Number(now)) && Number(now) > 0
    ? Math.floor(Number(now))
    : Date.now()
  return {
    version: 1,
    id: `internal_share_${createdAt}_${shareable.sourceModule}_${shareable.sourceId}`,
    shareable,
    sourceRoute: sanitizeSourceRoute(input.sourceRoute),
    createdAt,
  }
}

export const savePendingInternalChatShare = (input, storage, now = Date.now()) => {
  const target = resolveStorage(storage)
  const draft = createPendingInternalChatShare(input, now)
  if (!target || !draft) return null
  try {
    target.setItem(INTERNAL_CHAT_SHARE_STORAGE_KEY, JSON.stringify(draft))
    return draft
  } catch {
    return null
  }
}

export const readPendingInternalChatShare = (storage, now = Date.now()) => {
  const target = resolveStorage(storage)
  if (!target) return null
  try {
    const parsed = JSON.parse(target.getItem(INTERNAL_CHAT_SHARE_STORAGE_KEY) || 'null')
    const shareable = normalizeShareableObject(parsed?.shareable)
    const createdAt = Math.floor(Number(parsed?.createdAt) || 0)
    const currentTime = Number.isFinite(Number(now)) ? Number(now) : Date.now()
    if (
      !shareable ||
      !createdAt ||
      currentTime < createdAt ||
      currentTime - createdAt > INTERNAL_CHAT_SHARE_MAX_AGE_MS
    ) {
      target.removeItem(INTERNAL_CHAT_SHARE_STORAGE_KEY)
      return null
    }
    return {
      version: 1,
      id:
        typeof parsed.id === 'string' && parsed.id.trim()
          ? parsed.id.trim().slice(0, 240)
          : `internal_share_${createdAt}_${shareable.sourceModule}_${shareable.sourceId}`,
      shareable,
      sourceRoute: sanitizeSourceRoute(parsed.sourceRoute),
      createdAt,
    }
  } catch {
    target.removeItem(INTERNAL_CHAT_SHARE_STORAGE_KEY)
    return null
  }
}

export const clearPendingInternalChatShare = (storage) => {
  const target = resolveStorage(storage)
  if (!target) return false
  try {
    target.removeItem(INTERNAL_CHAT_SHARE_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export const isInternalChatShareRoute = (route = {}) =>
  (route?.path === '/chat' || route?.path?.startsWith('/chat/')) &&
  String(route?.query?.[INTERNAL_CHAT_SHARE_ROUTE_QUERY] || '') ===
    INTERNAL_CHAT_SHARE_ROUTE_VALUE
