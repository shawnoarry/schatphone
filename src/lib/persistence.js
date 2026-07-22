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

const canUseStorage = () => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

const canUseIndexedDb = () =>
  typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'

const canUseLayeredPersistence = () => ENABLE_INDEXEDDB_MIRROR && canUseIndexedDb()

let indexedDbOpenPromise = null
let indexedDbUnavailable = false
let indexedDbUnavailableError = null
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
  console.warn(
    '[persistence] indexeddb mirror is unavailable, fallback to localStorage only.',
    error,
  )
}

const classifyWriteError = (error) => {
  const name = typeof error?.name === 'string' ? error.name : ''
  const code = Number(error?.code)
  if (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  ) {
    return { error: 'quota_exceeded', retryable: true }
  }
  if (name === 'SecurityError' || name === 'NotAllowedError') {
    return { error: 'security_error', retryable: false }
  }
  return { error: 'carrier_unavailable', retryable: true }
}

const createWriteSuccess = (carrier, attempted = true) => ({
  ok: true,
  error: null,
  carrier,
  retryable: false,
  attempted,
})

const createWriteFailure = (carrier, error, attempted = true) => ({
  ok: false,
  carrier,
  ...classifyWriteError(error),
  attempted,
})

const createSerializationFailure = () => ({
  ok: false,
  error: 'serialization_failed',
  carrier: 'serialization',
  retryable: false,
  attempted: true,
})

const createSkippedWrite = (carrier, error, retryable = false) => ({
  ok: false,
  error,
  carrier,
  retryable,
  attempted: false,
})

const serializePersistedState = (data, version) => {
  try {
    const envelope = encodePersistedEnvelope(data, { version })
    return { ok: true, rawPayload: JSON.stringify(envelope) }
  } catch {
    return createSerializationFailure()
  }
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
  let storage
  try {
    storage = typeof window !== 'undefined' ? window.localStorage : null
  } catch (error) {
    return createWriteFailure('localStorage', error)
  }
  if (!storage || typeof storage.setItem !== 'function') {
    return createWriteFailure('localStorage', null, false)
  }
  try {
    storage.setItem(buildStorageKey(key), rawPayload)
    return createWriteSuccess('localStorage')
  } catch (error) {
    console.warn(`[persistence] write failed for "${key}"`, error)
    return createWriteFailure('localStorage', error)
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
        indexedDbUnavailableError = request.error
        warnIndexedDb(request.error)
        resolve(null)
      }

      request.onblocked = () => {
        // Keep this non-fatal and fallback gracefully.
        console.warn('[persistence] indexeddb open blocked by another tab/session.')
      }
    } catch (error) {
      indexedDbUnavailable = true
      indexedDbUnavailableError = error
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

const writeToIndexedDbWithResult = async (fullKey, rawPayload) => {
  const db = await openIndexedDb()
  if (!db) return createWriteFailure('indexeddb', indexedDbUnavailableError)

  return new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      resolve(result)
    }
    try {
      const tx = db.transaction(INDEXED_DB_STORE, 'readwrite')
      const store = tx.objectStore(INDEXED_DB_STORE)
      const request = store.put({ key: fullKey, payload: rawPayload, updatedAt: Date.now() })
      tx.oncomplete = () => finish(createWriteSuccess('indexeddb'))
      tx.onerror = () => finish(createWriteFailure('indexeddb', tx.error || request?.error))
      tx.onabort = () => finish(createWriteFailure('indexeddb', tx.error || request?.error))
    } catch (error) {
      finish(createWriteFailure('indexeddb', error))
    }
  })
}

const writeToIndexedDb = async (fullKey, rawPayload) =>
  (await writeToIndexedDbWithResult(fullKey, rawPayload)).ok

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
    const result = await writeToIndexedDbWithResult(fullKey, op.payload)
    if (!result.ok) warnIndexedDb(new Error(result.error))
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

export const readPersistedState = (key, options = {}) =>
  readPersistedStateFromLocal(key, options)

export const writePersistedState = (key, data, { version = 1 } = {}) => {
  const fullKey = buildStorageKey(key)
  const serialized = serializePersistedState(data, version)
  if (!serialized.ok) return serialized

  const local = writePersistedStateToLocal(key, serialized.rawPayload)
  if (local.ok) queueIndexedDbWrite(fullKey, serialized.rawPayload)
  return local
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

export const readPersistedRawLayers = async (key) => {
  if (typeof key !== 'string' || !key.trim()) {
    return { key: '', fullKey: '', localRaw: null, mirrorRaw: null, mirrorApplicable: false }
  }
  const normalizedKey = key.trim()
  const fullKey = buildStorageKey(normalizedKey)
  const mirrorApplicable = canUseLayeredPersistence()
  return {
    key: normalizedKey,
    fullKey,
    localRaw: readPersistedRawFromLocal(fullKey),
    mirrorRaw: mirrorApplicable ? await readFromIndexedDb(fullKey) : null,
    mirrorApplicable,
  }
}

export const writePersistedStateAsync = async (key, data, { version = 1 } = {}) => {
  const fullKey = buildStorageKey(key)
  const serialized = serializePersistedState(data, version)
  if (!serialized.ok) {
    return {
      ...serialized,
      local: createSkippedWrite('localStorage', serialized.error),
      mirror: createSkippedWrite('indexeddb', serialized.error),
    }
  }

  const local = writePersistedStateToLocal(key, serialized.rawPayload)
  if (!local.ok) {
    return {
      ...local,
      local,
      mirror: createSkippedWrite('indexeddb', 'primary_write_failed', local.retryable),
    }
  }

  if (!canUseLayeredPersistence()) {
    return {
      ...local,
      local,
      mirror: createWriteSuccess('indexeddb', false),
    }
  }

  const mirror = await writeToIndexedDbWithResult(fullKey, serialized.rawPayload)
  return {
    ok: local.ok && mirror.ok,
    error: mirror.ok ? null : mirror.error,
    carrier: mirror.ok ? local.carrier : mirror.carrier,
    retryable: mirror.ok ? false : mirror.retryable,
    attempted: true,
    local,
    mirror,
  }
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
