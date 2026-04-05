const STORAGE_NAMESPACE = 'schatphone'
const INDEXED_DB_NAME = 'schatphone-layered-storage'
const INDEXED_DB_STORE = 'state'
const INDEXED_DB_VERSION = 1

const envMirrorRaw =
  typeof import.meta !== 'undefined' &&
  import.meta &&
  import.meta.env &&
  typeof import.meta.env.VITE_ENABLE_INDEXEDDB_MIRROR === 'string'
    ? import.meta.env.VITE_ENABLE_INDEXEDDB_MIRROR
    : ''

const parseBooleanFlag = (value, fallback) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (normalized === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

const ENABLE_INDEXEDDB_MIRROR = parseBooleanFlag(envMirrorRaw, true)

const buildStorageKey = (key) => `${STORAGE_NAMESPACE}:${key}`

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'

const canUseLayeredPersistence = () => ENABLE_INDEXEDDB_MIRROR && canUseIndexedDb()

let indexedDbOpenPromise = null
let indexedDbUnavailable = false
let indexedDbWarned = false
const pendingIndexedDbOps = new Map()
let indexedDbFlushTimerId = null

const warnIndexedDb = (error) => {
  if (indexedDbWarned) return
  indexedDbWarned = true
  console.warn('[persistence] indexeddb mirror is unavailable, fallback to localStorage only.', error)
}

export const encodePersistedEnvelope = (data, { version = 1, savedAt = Date.now() } = {}) => ({
  version,
  savedAt,
  data,
})

export const decodePersistedEnvelope = (parsed, { version, migrate } = {}) => {
  if (!parsed || typeof parsed !== 'object') return null

  // Backward compatibility: old shape without version envelope.
  if (!Object.prototype.hasOwnProperty.call(parsed, 'data')) {
    return parsed
  }

  const storedVersion = Number(parsed.version ?? 1)
  const storedData = parsed.data

  if (version == null || storedVersion === version) {
    return storedData ?? null
  }

  if (typeof migrate === 'function') {
    return migrate({ version: storedVersion, data: storedData })
  }

  return null
}

const readPersistedStateFromLocal = (key, options = {}) => {
  if (!canUseStorage()) return null

  try {
    const raw = window.localStorage.getItem(buildStorageKey(key))
    if (!raw) return null

    const parsed = JSON.parse(raw)
    return decodePersistedEnvelope(parsed, options)
  } catch (error) {
    console.warn(`[persistence] read failed for "${key}"`, error)
    return null
  }
}

const writePersistedStateToLocal = (key, rawPayload) => {
  if (!canUseStorage()) return
  try {
    window.localStorage.setItem(buildStorageKey(key), rawPayload)
  } catch (error) {
    console.warn(`[persistence] write failed for "${key}"`, error)
  }
}

const clearPersistedStateFromLocal = (key) => {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(buildStorageKey(key))
  } catch (error) {
    console.warn(`[persistence] clear failed for "${key}"`, error)
  }
}

const openIndexedDb = async () => {
  if (!canUseLayeredPersistence() || indexedDbUnavailable) return null
  if (indexedDbOpenPromise) return indexedDbOpenPromise

  indexedDbOpenPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
          db.createObjectStore(INDEXED_DB_STORE, { keyPath: 'key' })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => db.close()
        resolve(db)
      }

      request.onerror = () => {
        indexedDbUnavailable = true
        warnIndexedDb(request.error)
        resolve(null)
      }

      request.onblocked = () => {
        // Keep this non-fatal and fallback gracefully.
        console.warn('[persistence] indexeddb open blocked by another tab/session.')
      }
    } catch (error) {
      indexedDbUnavailable = true
      warnIndexedDb(error)
      resolve(null)
    }
  })

  return indexedDbOpenPromise
}

const readFromIndexedDb = async (fullKey) => {
  const db = await openIndexedDb()
  if (!db) return null

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(INDEXED_DB_STORE, 'readonly')
      const store = tx.objectStore(INDEXED_DB_STORE)
      const request = store.get(fullKey)

      request.onsuccess = () => {
        const item = request.result
        resolve(item && typeof item.payload === 'string' ? item.payload : null)
      }
      request.onerror = () => resolve(null)
      tx.onabort = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

const writeToIndexedDb = async (fullKey, rawPayload) => {
  const db = await openIndexedDb()
  if (!db) return false

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(INDEXED_DB_STORE, 'readwrite')
      const store = tx.objectStore(INDEXED_DB_STORE)
      store.put({ key: fullKey, payload: rawPayload, updatedAt: Date.now() })
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
      tx.onabort = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

const deleteFromIndexedDb = async (fullKey) => {
  const db = await openIndexedDb()
  if (!db) return false

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(INDEXED_DB_STORE, 'readwrite')
      const store = tx.objectStore(INDEXED_DB_STORE)
      store.delete(fullKey)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
      tx.onabort = () => resolve(false)
    } catch {
      resolve(false)
    }
  })
}

const flushIndexedDbOps = async () => {
  indexedDbFlushTimerId = null
  if (pendingIndexedDbOps.size === 0) return

  const entries = Array.from(pendingIndexedDbOps.entries())
  pendingIndexedDbOps.clear()

  for (const [fullKey, op] of entries) {
    if (!op || op.type === 'delete') {
      await deleteFromIndexedDb(fullKey)
      continue
    }
    await writeToIndexedDb(fullKey, op.payload)
  }
}

const queueIndexedDbWrite = (fullKey, rawPayload) => {
  if (!canUseLayeredPersistence()) return
  pendingIndexedDbOps.set(fullKey, { type: 'write', payload: rawPayload })
  if (indexedDbFlushTimerId) return
  indexedDbFlushTimerId = setTimeout(() => {
    void flushIndexedDbOps()
  }, 16)
}

const queueIndexedDbDelete = (fullKey) => {
  if (!canUseLayeredPersistence()) return
  pendingIndexedDbOps.set(fullKey, { type: 'delete' })
  if (indexedDbFlushTimerId) return
  indexedDbFlushTimerId = setTimeout(() => {
    void flushIndexedDbOps()
  }, 16)
}

export const readPersistedState = (key, options = {}) =>
  readPersistedStateFromLocal(key, options)

export const writePersistedState = (key, data, { version = 1 } = {}) => {
  const fullKey = buildStorageKey(key)
  const envelope = encodePersistedEnvelope(data, { version })
  const rawPayload = JSON.stringify(envelope)
  writePersistedStateToLocal(key, rawPayload)
  queueIndexedDbWrite(fullKey, rawPayload)
}

export const clearPersistedState = (key) => {
  const fullKey = buildStorageKey(key)
  clearPersistedStateFromLocal(key)
  queueIndexedDbDelete(fullKey)
}

export const readPersistedStateAsync = async (key, options = {}) => {
  const fullKey = buildStorageKey(key)
  if (canUseLayeredPersistence()) {
    const raw = await readFromIndexedDb(fullKey)
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw)
        const decoded = decodePersistedEnvelope(parsed, options)
        if (decoded != null) return decoded
      } catch {
        // Fallback below.
      }
    }
  }
  return readPersistedStateFromLocal(key, options)
}

export const writePersistedStateAsync = async (key, data, { version = 1 } = {}) => {
  const fullKey = buildStorageKey(key)
  const envelope = encodePersistedEnvelope(data, { version })
  const rawPayload = JSON.stringify(envelope)
  writePersistedStateToLocal(key, rawPayload)
  if (!canUseLayeredPersistence()) return
  await writeToIndexedDb(fullKey, rawPayload)
}

export const clearPersistedStateAsync = async (key) => {
  const fullKey = buildStorageKey(key)
  clearPersistedStateFromLocal(key)
  if (!canUseLayeredPersistence()) return
  await deleteFromIndexedDb(fullKey)
}

export const getPersistenceCapabilities = () => ({
  namespace: STORAGE_NAMESPACE,
  localStorageAvailable: canUseStorage(),
  indexedDbAvailable: canUseIndexedDb(),
  indexedDbMirrorEnabled: canUseLayeredPersistence(),
  indexedDbDatabaseName: INDEXED_DB_NAME,
  indexedDbStoreName: INDEXED_DB_STORE,
})
