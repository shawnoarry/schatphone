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

const normalizeSavedAt = (value, fallback = 0) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(num)
}

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

const readPersistedRawFromLocal = (fullKey) => {
  if (!canUseStorage()) return null
  if (typeof fullKey !== 'string' || !fullKey.trim()) return null
  try {
    return window.localStorage.getItem(fullKey)
  } catch (error) {
    console.warn(`[persistence] raw-read failed for "${fullKey}"`, error)
    return null
  }
}

const writePersistedRawToLocal = (fullKey, rawPayload) => {
  if (!canUseStorage()) return false
  if (typeof fullKey !== 'string' || !fullKey.trim()) return false
  if (typeof rawPayload !== 'string') return false
  try {
    window.localStorage.setItem(fullKey, rawPayload)
    return true
  } catch (error) {
    console.warn(`[persistence] raw-write failed for "${fullKey}"`, error)
    return false
  }
}

const clearPersistedRawFromLocal = (fullKey) => {
  if (!canUseStorage()) return false
  if (typeof fullKey !== 'string' || !fullKey.trim()) return false
  try {
    window.localStorage.removeItem(fullKey)
    return true
  } catch (error) {
    console.warn(`[persistence] raw-clear failed for "${fullKey}"`, error)
    return false
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

const inspectRawPayload = (rawPayload, options = {}, includeRaw = false) => {
  const result = {
    exists: false,
    rawSize: 0,
    parseOk: false,
    decodedOk: false,
    envelope: false,
    envelopeVersion: 0,
    savedAt: 0,
    issueCode: '',
  }
  if (typeof rawPayload !== 'string' || !rawPayload.trim()) return result

  result.exists = true
  result.rawSize = rawPayload.length

  let parsed = null
  try {
    parsed = JSON.parse(rawPayload)
    result.parseOk = true
  } catch {
    result.issueCode = 'json_parse_failed'
    if (includeRaw) result.rawPayload = rawPayload
    return result
  }

  const isEnvelope =
    parsed &&
    typeof parsed === 'object' &&
    Object.prototype.hasOwnProperty.call(parsed, 'data')
  result.envelope = Boolean(isEnvelope)
  result.envelopeVersion =
    isEnvelope && Number.isFinite(Number(parsed.version))
      ? Math.floor(Number(parsed.version))
      : isEnvelope
        ? 1
        : 0
  result.savedAt =
    isEnvelope && parsed && typeof parsed === 'object'
      ? normalizeSavedAt(parsed.savedAt, 0)
      : 0

  const decoded = decodePersistedEnvelope(parsed, options)
  result.decodedOk = decoded != null
  if (!result.decodedOk) {
    result.issueCode = result.envelope ? 'decode_failed' : 'legacy_payload_invalid'
  }
  if (includeRaw) result.rawPayload = rawPayload
  return result
}

const selectReconcileSource = (localInspect, indexedInspect, strategy = 'newest_valid') => {
  const normalizedStrategy = typeof strategy === 'string' ? strategy.trim() : 'newest_valid'
  const hasInspectablePayload = (layerInspect) =>
    typeof layerInspect?.rawPayload === 'string' || layerInspect?.exists === true

  const isLocalValid =
    localInspect?.decodedOk === true && hasInspectablePayload(localInspect)
  const isIndexedValid =
    indexedInspect?.decodedOk === true && hasInspectablePayload(indexedInspect)

  if (normalizedStrategy === 'local') {
    if (isLocalValid) return 'local'
    if (isIndexedValid) return 'indexeddb'
    return 'none'
  }
  if (normalizedStrategy === 'indexeddb') {
    if (isIndexedValid) return 'indexeddb'
    if (isLocalValid) return 'local'
    return 'none'
  }

  if (!isLocalValid && !isIndexedValid) return 'none'
  if (isLocalValid && !isIndexedValid) return 'local'
  if (!isLocalValid && isIndexedValid) return 'indexeddb'

  const localSavedAt = normalizeSavedAt(localInspect.savedAt, 0)
  const indexedSavedAt = normalizeSavedAt(indexedInspect.savedAt, 0)
  if (localSavedAt > indexedSavedAt) return 'local'
  if (indexedSavedAt > localSavedAt) return 'indexeddb'
  return 'local'
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

export const inspectPersistedStateLayers = async (key, options = {}) => {
  if (typeof key !== 'string' || !key.trim()) {
    return {
      key,
      fullKey: '',
      mirrorApplicable: canUseLayeredPersistence(),
      mirrorInSync: true,
      recommendedSource: 'none',
      local: inspectRawPayload(null, options),
      indexeddb: inspectRawPayload(null, options),
      issueCode: 'invalid_key',
    }
  }

  const normalizedKey = key.trim()
  const fullKey = buildStorageKey(normalizedKey)
  const localRaw = readPersistedRawFromLocal(fullKey)
  const localInspect = inspectRawPayload(localRaw, options)

  const mirrorApplicable = canUseLayeredPersistence()
  const indexedRaw = mirrorApplicable ? await readFromIndexedDb(fullKey) : null
  const indexedInspect = inspectRawPayload(indexedRaw, options)

  const mirrorInSync = mirrorApplicable ? localRaw === indexedRaw : true
  const recommendedSource = selectReconcileSource(localInspect, indexedInspect, 'newest_valid')

  let issueCode = ''
  if (mirrorApplicable && !mirrorInSync) issueCode = 'mirror_drift'
  else if (localInspect.exists && !localInspect.decodedOk) issueCode = localInspect.issueCode || 'local_invalid'
  else if (indexedInspect.exists && !indexedInspect.decodedOk) issueCode = indexedInspect.issueCode || 'indexeddb_invalid'

  return {
    key: normalizedKey,
    fullKey,
    mirrorApplicable,
    mirrorInSync,
    recommendedSource,
    local: localInspect,
    indexeddb: indexedInspect,
    issueCode,
  }
}

export const reconcilePersistedStateLayers = async (key, options = {}) => {
  const strategy = typeof options.strategy === 'string' ? options.strategy : 'newest_valid'
  const allowClearOnInvalid = options.allowClearOnInvalid === true
  const inspection = await inspectPersistedStateLayers(key, options)

  if (!inspection.fullKey) {
    return {
      ok: false,
      action: 'skipped',
      reason: 'invalid_key',
      ...inspection,
    }
  }

  const fullKey = inspection.fullKey
  const localRaw = readPersistedRawFromLocal(fullKey)
  const indexedRaw = inspection.mirrorApplicable ? await readFromIndexedDb(fullKey) : null
  const localInspect = inspectRawPayload(localRaw, options, true)
  const indexedInspect = inspectRawPayload(indexedRaw, options, true)
  const sourceLayer = selectReconcileSource(localInspect, indexedInspect, strategy)

  if (sourceLayer === 'none') {
    if (!allowClearOnInvalid) {
      return {
        ok: false,
        action: 'skipped',
        reason: 'no_valid_source',
        ...inspection,
      }
    }

    const localCleared = clearPersistedRawFromLocal(fullKey)
    const indexeddbCleared = inspection.mirrorApplicable ? await deleteFromIndexedDb(fullKey) : true
    return {
      ok: localCleared && indexeddbCleared,
      action: 'cleared',
      reason: 'cleared_invalid_layers',
      sourceLayer: 'none',
      ...inspection,
    }
  }

  const sourceRaw =
    sourceLayer === 'indexeddb' ? indexedInspect.rawPayload : localInspect.rawPayload
  if (typeof sourceRaw !== 'string') {
    return {
      ok: false,
      action: 'skipped',
      reason: 'source_payload_missing',
      sourceLayer,
      ...inspection,
    }
  }

  const alreadySynced = inspection.mirrorInSync && localRaw === sourceRaw
  if (alreadySynced) {
    return {
      ok: true,
      action: 'noop',
      reason: 'already_synced',
      sourceLayer,
      ...inspection,
    }
  }

  const localWriteOk = writePersistedRawToLocal(fullKey, sourceRaw)
  const indexeddbWriteOk = inspection.mirrorApplicable ? await writeToIndexedDb(fullKey, sourceRaw) : true

  return {
    ok: localWriteOk && indexeddbWriteOk,
    action: localWriteOk && indexeddbWriteOk ? 'repaired' : 'partial',
    reason: localWriteOk && indexeddbWriteOk ? 'reconciled' : 'write_failed',
    sourceLayer,
    ...inspection,
  }
}

export const getPersistenceCapabilities = () => ({
  namespace: STORAGE_NAMESPACE,
  localStorageAvailable: canUseStorage(),
  indexedDbAvailable: canUseIndexedDb(),
  indexedDbMirrorEnabled: canUseLayeredPersistence(),
  indexedDbMirrorPendingOps: pendingIndexedDbOps.size,
  indexedDbMirrorFlushScheduled: Boolean(indexedDbFlushTimerId),
  indexedDbDatabaseName: INDEXED_DB_NAME,
  indexedDbStoreName: INDEXED_DB_STORE,
})
