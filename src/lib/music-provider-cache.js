import { canWriteCurrentSave } from './current-save-write-runtime'

export const MUSIC_CACHE_DB_NAME = 'schatphone-music-provider-cache'
export const MUSIC_CACHE_DB_STORE = 'entries'
export const MUSIC_CACHE_DB_VERSION = 1
export const MUSIC_PROVIDER_CACHE_KINDS = Object.freeze({
  METADATA: 'metadata',
  LYRICS: 'lyrics',
})
export const MUSIC_PROVIDER_METADATA_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const MUSIC_PROVIDER_LYRICS_TTL_MS = 30 * 24 * 60 * 60 * 1000

const MAX_CACHE_TTL_MS = 90 * 24 * 60 * 60 * 1000
const memoryCache = new Map()
let providerCacheDbOpenPromise = null
let providerCacheDbUnavailable = false

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'

const normalizeSegment = (value, maxLength = 180) =>
  String(value ?? '')
    .trim()
    .replace(/[\s|]+/g, '_')
    .slice(0, maxLength)

const cloneValue = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return null
  }
}

export const createMusicProviderCacheKey = ({ kind, profile, track } = {}) => {
  if (!Object.values(MUSIC_PROVIDER_CACHE_KINDS).includes(kind)) return ''
  const providerId = normalizeSegment(profile?.id || track?.providerId)
  const platform = normalizeSegment(profile?.platform || track?.sourceRef?.platform, 40)
  const sourceRef = track?.sourceRef || {}
  const sourceId = normalizeSegment(
    sourceRef.id ||
      sourceRef.mid ||
      (sourceRef.query && sourceRef.selection
        ? `${sourceRef.query}:${sourceRef.selection}`
        : track?.id),
  )
  if (!providerId || !platform || !sourceId) return ''
  return `${kind}|${providerId}|${platform}|${sourceId}`
}

const openMusicProviderCacheDb = async () => {
  if (!canUseIndexedDb() || providerCacheDbUnavailable) return null
  if (providerCacheDbOpenPromise) return providerCacheDbOpenPromise

  providerCacheDbOpenPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(MUSIC_CACHE_DB_NAME, MUSIC_CACHE_DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(MUSIC_CACHE_DB_STORE)) {
          db.createObjectStore(MUSIC_CACHE_DB_STORE, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => db.close()
        resolve(db)
      }
      request.onerror = () => {
        providerCacheDbUnavailable = true
        resolve(null)
      }
      request.onblocked = () => resolve(null)
    } catch {
      providerCacheDbUnavailable = true
      resolve(null)
    }
  })
  return providerCacheDbOpenPromise
}

const readIndexedDbEntry = async (id) => {
  const db = await openMusicProviderCacheDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(MUSIC_CACHE_DB_STORE, 'readonly')
      const request = transaction.objectStore(MUSIC_CACHE_DB_STORE).get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => resolve(null)
      transaction.onabort = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

const writeIndexedDbEntry = async (entry) => {
  const db = await openMusicProviderCacheDb()
  if (!db || !canWriteCurrentSave()) return false
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(MUSIC_CACHE_DB_STORE, 'readwrite')
      transaction.objectStore(MUSIC_CACHE_DB_STORE).put(entry)
      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => resolve(false)
      transaction.onabort = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

const deleteIndexedDbEntry = async (id) => {
  const db = await openMusicProviderCacheDb()
  if (!db || !canWriteCurrentSave()) return false
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(MUSIC_CACHE_DB_STORE, 'readwrite')
      transaction.objectStore(MUSIC_CACHE_DB_STORE).delete(id)
      transaction.oncomplete = () => resolve(true)
      transaction.onerror = () => resolve(false)
      transaction.onabort = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

export const getMusicProviderCacheEntry = async (input = {}) => {
  const id = createMusicProviderCacheKey(input)
  if (!id) return null
  const now = Math.max(0, Number(input.now) || Date.now())
  const entry = memoryCache.get(id) || (await readIndexedDbEntry(id))
  if (!entry || Number(entry.expiresAt) <= now) {
    memoryCache.delete(id)
    if (entry) void deleteIndexedDbEntry(id)
    return null
  }
  const value = cloneValue(entry.value)
  if (!value) return null
  memoryCache.set(id, entry)
  return value
}

export const putMusicProviderCacheEntry = async (input = {}) => {
  const id = createMusicProviderCacheKey(input)
  const value = cloneValue(input.value)
  if (!id || !value) return false
  const now = Math.max(0, Number(input.now) || Date.now())
  const ttlMs = Math.max(60 * 1000, Math.min(MAX_CACHE_TTL_MS, Number(input.ttlMs) || 0))
  if (!ttlMs) return false
  const entry = {
    id,
    kind: input.kind,
    providerId: normalizeSegment(input.profile?.id || input.track?.providerId),
    platform: normalizeSegment(input.profile?.platform || input.track?.sourceRef?.platform, 40),
    trackId: normalizeSegment(
      input.track?.sourceRef?.id || input.track?.sourceRef?.mid || input.track?.id,
    ),
    value,
    updatedAt: now,
    expiresAt: now + ttlMs,
  }
  memoryCache.set(id, entry)
  return writeIndexedDbEntry(entry)
}

export const deleteMusicProviderCacheEntry = async (input = {}) => {
  const id = createMusicProviderCacheKey(input)
  if (!id) return false
  memoryCache.delete(id)
  return deleteIndexedDbEntry(id)
}
