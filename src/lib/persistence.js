import { reportPersistenceWriteResult } from './persistence-runtime-status'
import {
  getCurrentSaveWriteBlock,
  retryCurrentSaveWrite,
} from './current-save-write-runtime'

const STORAGE_NAMESPACE = 'schatphone'
const INDEXED_DB_NAME = 'schatphone-layered-storage'
const INDEXED_DB_STORE = 'state'
const INDEXED_DB_VERSION = 1
const INDEXED_DB_OPEN_TIMEOUT_MS = 750
const BOOK_STORAGE_KEY = 'store:book'

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

const createLineageId = () => {
  const randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
  if (randomUUID) return randomUUID()
  return `lineage-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    )
  }
  return value
}

const canonicalStringify = (value) => JSON.stringify(canonicalize(value))

const canUseStorage = () => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

const canUseIndexedDb = () => {
  try {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
  } catch {
    return false
  }
}

const canUseLayeredPersistence = () => ENABLE_INDEXEDDB_MIRROR && canUseIndexedDb()

let indexedDbOpenPromise = null
let indexedDbUnavailable = false
let indexedDbUnavailableError = null
let indexedDbWarned = false
const pendingIndexedDbOps = new Map()
const persistedHeadStates = new Map()
let indexedDbFlushTimerId = null
let indexedDbFlushInProgress = false

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

const createReconciliationFailure = (includeChildren = false, error = 'reconciliation_required') => {
  const result = {
    ok: false,
    error,
    carrier: 'reconciliation',
    retryable: true,
    attempted: false,
  }
  if (!includeChildren) return result
  return {
    ...result,
    local: createSkippedWrite('localStorage', error, true),
    mirror: createSkippedWrite('indexeddb', error, true),
  }
}

const createGenerationFailure = () => ({
  ok: false,
  error: 'generation_exhausted',
  carrier: 'generation',
  retryable: false,
  attempted: false,
})

const normalizeGeneration = (generation, present = generation !== undefined) => {
  if (!present) {
    return { order: 'unordered', orderingValid: true, generation: null, issueCode: '' }
  }
  const lineage = generation?.lineage
  const sequence = generation?.sequence
  if (
    !generation ||
    typeof generation !== 'object' ||
    typeof lineage !== 'string' ||
    !lineage.trim() ||
    lineage !== lineage.trim() ||
    !Number.isSafeInteger(sequence) ||
    sequence < 1
  ) {
    return {
      order: 'unordered',
      orderingValid: false,
      generation: null,
      issueCode: 'generation_invalid',
    }
  }
  return {
    order: 'ordered',
    orderingValid: true,
    generation: { lineage, sequence },
    issueCode: '',
  }
}

const serializePersistedState = (data, version, generation = null) => {
  try {
    const envelope = encodePersistedEnvelope(data, { version, generation })
    return { ok: true, rawPayload: JSON.stringify(envelope) }
  } catch {
    return createSerializationFailure()
  }
}

export const encodePersistedEnvelope = (
  data,
  { version = 1, savedAt = Date.now(), generation = null } = {},
) => {
  const envelope = { version, savedAt, data }
  if (generation != null) envelope.generation = generation
  return envelope
}

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
    return migrate({
      version: storedVersion,
      data: storedData,
      savedAt: parsed.savedAt,
    })
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

const readLocalLayer = (fullKey) => {
  if (typeof fullKey !== 'string' || !fullKey.trim()) {
    return { applicable: true, available: true, present: false, rawPayload: null, error: null }
  }
  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : null
    if (!storage || typeof storage.getItem !== 'function') {
      return { applicable: true, available: false, present: false, rawPayload: null, error: null }
    }
    const rawPayload = storage.getItem(fullKey)
    return {
      available: true,
      applicable: true,
      present: rawPayload !== null,
      rawPayload,
      error: null,
    }
  } catch (error) {
    return { applicable: true, available: false, present: false, rawPayload: null, error }
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
    let settled = false
    const finish = (value) => {
      if (settled) {
        value?.close?.()
        return
      }
      settled = true
      clearTimeout(timeoutId)
      resolve(value)
    }
    const timeoutId = setTimeout(() => {
      const error = new Error('indexeddb_open_timed_out')
      error.name = 'TimeoutError'
      indexedDbUnavailable = true
      indexedDbUnavailableError = error
      warnIndexedDb(error)
      finish(null)
    }, INDEXED_DB_OPEN_TIMEOUT_MS)
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
        finish(db)
      }

      request.onerror = () => {
        indexedDbUnavailable = true
        indexedDbUnavailableError = request.error
        warnIndexedDb(request.error)
        finish(null)
      }

      request.onblocked = () => {
        // Keep this non-fatal and fallback gracefully.
        console.warn('[persistence] indexeddb open blocked by another tab/session.')
      }
    } catch (error) {
      indexedDbUnavailable = true
      indexedDbUnavailableError = error
      warnIndexedDb(error)
      finish(null)
    }
  })

  return indexedDbOpenPromise
}

const readIndexedDbLayer = async (fullKey) => {
  if (!ENABLE_INDEXEDDB_MIRROR) {
    return {
      applicable: false,
      available: false,
      present: false,
      rawPayload: null,
      error: null,
    }
  }
  if (!canUseIndexedDb()) {
    return {
      applicable: true,
      available: false,
      present: false,
      rawPayload: null,
      error: null,
    }
  }
  const db = await openIndexedDb()
  if (!db) {
    return {
      available: false,
      applicable: true,
      present: false,
      rawPayload: null,
      error: indexedDbUnavailableError,
    }
  }

  return new Promise((resolve) => {
    let settled = false
    const finish = (result) => {
      if (settled) return
      settled = true
      resolve(result)
    }
    try {
      const tx = db.transaction(INDEXED_DB_STORE, 'readonly')
      const store = tx.objectStore(INDEXED_DB_STORE)
      const request = store.get(fullKey)

      request.onsuccess = () => {
        const item = request.result
        finish({
          available: true,
          applicable: true,
          present: item != null,
          rawPayload: item && typeof item.payload === 'string' ? item.payload : null,
          updatedAt: normalizeSavedAt(item?.updatedAt, 0),
          error: null,
        })
      }
      request.onerror = () =>
        finish({
          applicable: true,
          available: false,
          present: false,
          rawPayload: null,
          error: request.error,
        })
      tx.onabort = () =>
        finish({
          applicable: true,
          available: false,
          present: false,
          rawPayload: null,
          error: tx.error,
        })
    } catch (error) {
      finish({ applicable: true, available: false, present: false, rawPayload: null, error })
    }
  })
}

const readFromIndexedDb = async (fullKey) => (await readIndexedDbLayer(fullKey)).rawPayload

const writeToIndexedDbWithResult = async (
  fullKey,
  rawPayload,
  { version, migrate, allowReconciliation = false, skipFreshnessCheck = false } = {},
) => {
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
      let request = null
      tx.oncomplete = () => finish(createWriteSuccess('indexeddb'))
      tx.onerror = () => finish(createWriteFailure('indexeddb', tx.error || request?.error))
      tx.onabort = () => finish(createWriteFailure('indexeddb', tx.error || request?.error))

      const write = () => {
        request = store.put({ key: fullKey, payload: rawPayload, updatedAt: Date.now() })
      }
      if (allowReconciliation || skipFreshnessCheck) {
        write()
        return
      }

      const readRequest = store.get(fullKey)
      readRequest.onerror = () =>
        finish(createWriteFailure('indexeddb', readRequest.error || tx.error))
      readRequest.onsuccess = () => {
        const existingRaw =
          readRequest.result && typeof readRequest.result.payload === 'string'
            ? readRequest.result.payload
            : null
        const precondition = checkMirrorWritePrecondition(existingRaw, rawPayload, {
          version,
          migrate,
        })
        if (!precondition.ok) {
          finish(createReconciliationFailure(false, precondition.error))
          try {
            tx.abort()
          } catch {
            // The transaction may already be inactive.
          }
          return
        }
        write()
      }
    } catch (error) {
      finish(createWriteFailure('indexeddb', error))
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

const inspectRawPayload = (rawPayload, options = {}) => {
  const applicable = options.applicable !== false
  const available = applicable && options.available !== false
  const result = {
    applicable,
    available,
    availability: !applicable ? 'not_applicable' : available ? 'available' : 'unavailable',
    present: options.present === true,
    presence: options.present === true ? 'present' : 'absent',
    exists: false,
    rawSize: 0,
    rawPayload: typeof rawPayload === 'string' ? rawPayload : null,
    parseOk: false,
    decodedOk: false,
    payloadValid: false,
    valid: false,
    envelope: false,
    envelopeVersion: 0,
    savedAt: 0,
    updatedAt: normalizeSavedAt(options.updatedAt, 0),
    order: 'none',
    orderingValid: true,
    generation: null,
    canonicalData: null,
    decodedData: null,
    issueCode: '',
  }
  if (!result.available) {
    if (result.applicable) result.issueCode = 'carrier_unavailable'
    return result
  }
  if (typeof rawPayload !== 'string' || !rawPayload.trim()) return result

  result.exists = true
  result.present = true
  result.presence = 'present'
  result.rawSize = rawPayload.length

  let parsed = null
  try {
    parsed = JSON.parse(rawPayload)
    result.parseOk = true
  } catch {
    result.issueCode = 'json_parse_failed'
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

  const hasGeneration =
    isEnvelope && Object.prototype.hasOwnProperty.call(parsed, 'generation')
  const generation = normalizeGeneration(parsed?.generation, hasGeneration)
  result.order = generation.order
  result.orderingValid = generation.orderingValid
  result.generation = generation.generation
  if (generation.issueCode) result.issueCode = generation.issueCode

  const decoded = decodePersistedEnvelope(parsed, options)
  result.decodedOk = decoded != null
  if (!result.decodedOk) {
    result.issueCode = result.envelope ? 'decode_failed' : 'legacy_payload_invalid'
    return result
  }
  result.decodedData = decoded
  result.canonicalData = canonicalStringify(decoded)
  result.payloadValid = true
  result.valid = result.payloadValid
  return result
}

const inspectLayerRead = (read, options = {}) =>
  inspectRawPayload(read.rawPayload, {
    ...options,
    applicable: read.applicable !== false,
    available: read.available,
    present: read.present,
    updatedAt: read.updatedAt,
  })

const selectReconcilePlan = (local, indexeddb) => {
  const localValid = local.valid === true
  const mirrorValid = indexeddb.valid === true

  if (localValid && mirrorValid && local.rawPayload === indexeddb.rawPayload) {
    return { type: 'winner', winner: 'local', reason: 'equivalent', rawPayload: local.rawPayload }
  }
  if (localValid !== mirrorValid) {
    const winner = localValid ? 'local' : 'indexeddb'
    return {
      type: 'winner',
      winner,
      reason: 'sole_valid',
      rawPayload: winner === 'local' ? local.rawPayload : indexeddb.rawPayload,
    }
  }
  if (!localValid && !mirrorValid) {
    return { type: 'none', winner: 'none', reason: 'no_valid_source' }
  }

  if (local.order === 'ordered' && indexeddb.order === 'ordered') {
    if (local.generation.lineage !== indexeddb.generation.lineage) {
      if (local.canonicalData === indexeddb.canonicalData) {
        return { type: 'adopt', winner: 'local', reason: 'equal_data_new_lineage' }
      }
      return { type: 'conflict', winner: 'none', reason: 'lineage_conflict' }
    }
    if (local.generation.sequence === indexeddb.generation.sequence) {
      return { type: 'conflict', winner: 'none', reason: 'generation_conflict' }
    }
    const winner =
      local.generation.sequence > indexeddb.generation.sequence ? 'local' : 'indexeddb'
    return {
      type: 'winner',
      winner,
      reason: 'higher_sequence',
      rawPayload: winner === 'local' ? local.rawPayload : indexeddb.rawPayload,
    }
  }

  if (local.order === 'ordered' || indexeddb.order === 'ordered') {
    if (local.canonicalData !== indexeddb.canonicalData) {
      return { type: 'conflict', winner: 'none', reason: 'legacy_freshness_unknown' }
    }
    const winner = local.order === 'ordered' ? 'local' : 'indexeddb'
    return {
      type: 'winner',
      winner,
      reason: 'ordered_adopted',
      rawPayload: winner === 'local' ? local.rawPayload : indexeddb.rawPayload,
    }
  }

  if (local.canonicalData === indexeddb.canonicalData) {
    return { type: 'adopt', winner: 'local', reason: 'equal_legacy_data' }
  }
  return { type: 'conflict', winner: 'none', reason: 'legacy_freshness_unknown' }
}

const checkMirrorWritePrecondition = (existingRaw, incomingRaw, options = {}) => {
  if (existingRaw == null || existingRaw === incomingRaw) return { ok: true }
  const existing = inspectRawPayload(existingRaw, { ...options, available: true, present: true })
  const incoming = inspectRawPayload(incomingRaw, { ...options, available: true, present: true })
  if (!incoming.valid || incoming.order !== 'ordered') {
    return { ok: false, error: 'reconciliation_required' }
  }
  if (!existing.valid) return { ok: false, error: 'reconciliation_required' }
  if (existing.order === 'ordered') {
    if (existing.generation.lineage !== incoming.generation.lineage) {
      return existing.canonicalData === incoming.canonicalData
        ? { ok: true }
        : { ok: false, error: 'lineage_conflict' }
    }
    if (incoming.generation.sequence < existing.generation.sequence) {
      return { ok: false, error: 'mirror_regression' }
    }
    if (incoming.generation.sequence === existing.generation.sequence) {
      return { ok: false, error: 'generation_conflict' }
    }
    return { ok: true }
  }
  return existing.canonicalData === incoming.canonicalData
    ? { ok: true }
    : { ok: false, error: 'legacy_freshness_unknown' }
}

const scheduleIndexedDbFlush = () => {
  if (
    indexedDbFlushTimerId ||
    indexedDbFlushInProgress ||
    pendingIndexedDbOps.size === 0
  ) {
    return
  }
  indexedDbFlushTimerId = setTimeout(() => {
    void flushIndexedDbOps()
  }, 16)
}

const flushIndexedDbOps = async () => {
  indexedDbFlushTimerId = null
  if (indexedDbFlushInProgress || pendingIndexedDbOps.size === 0) return

  indexedDbFlushInProgress = true
  try {
    while (pendingIndexedDbOps.size > 0) {
      const entries = Array.from(pendingIndexedDbOps.entries())
      pendingIndexedDbOps.clear()

      for (const [fullKey, op] of entries) {
        if (!op || op.type === 'delete') {
          await deleteFromIndexedDb(fullKey)
          continue
        }
        const accessBlock = getCurrentSaveWriteBlock()
        if (accessBlock) {
          const result = {
            ...accessBlock,
            local: createWriteSuccess('localStorage', false),
            mirror: createSkippedWrite('indexeddb', accessBlock.error, true),
          }
          reportPersistenceWriteResult({
            key: op.key,
            result,
            retry: () =>
              retryCurrentSaveWrite(async () => {
                const mirror = await writeToIndexedDbWithResult(fullKey, op.payload, op.options)
                return {
                  ok: mirror.ok,
                  error: mirror.error,
                  carrier: mirror.carrier,
                  retryable: mirror.retryable,
                  attempted: mirror.attempted,
                  local: createWriteSuccess('localStorage', false),
                  mirror,
                }
              }),
          })
          continue
        }
        const result = await writeToIndexedDbWithResult(fullKey, op.payload, op.options)
        if (!result.ok) {
          if (result.carrier === 'reconciliation') {
            const previous = persistedHeadStates.get(fullKey)
            setPersistedHeadState(fullKey, {
              ...previous,
              blocked: true,
              reason: result.error,
            })
          }
          warnIndexedDb(new Error(result.error))
          continue
        }
        const previous = persistedHeadStates.get(fullKey)
        if (previous?.localRaw === op.payload) {
          setPersistedHeadState(fullKey, {
            ...previous,
            forceFork: false,
            mirrorAvailable: true,
            mirrorRaw: op.payload,
          })
        }
      }
    }
  } finally {
    indexedDbFlushInProgress = false
    scheduleIndexedDbFlush()
  }
}

const queueIndexedDbWrite = (key, fullKey, rawPayload, options = {}) => {
  if (!canUseLayeredPersistence()) return
  pendingIndexedDbOps.set(fullKey, { key, type: 'write', payload: rawPayload, options })
  scheduleIndexedDbFlush()
}

const readLayerPair = async (fullKey) => {
  const local = readLocalLayer(fullKey)
  const indexeddb = await readIndexedDbLayer(fullKey)
  return { local, indexeddb }
}

const inspectLayerPair = (pair, options = {}) => ({
  local: inspectLayerRead(pair.local, options),
  indexeddb: inspectLayerRead(pair.indexeddb, options),
})

const pairHeadsEqual = (left, right) =>
  left.local.available === right.local.available &&
  left.local.present === right.local.present &&
  left.local.rawPayload === right.local.rawPayload &&
  left.indexeddb.available === right.indexeddb.available &&
  left.indexeddb.present === right.indexeddb.present &&
  left.indexeddb.rawPayload === right.indexeddb.rawPayload

const setPersistedHeadState = (fullKey, state) => {
  persistedHeadStates.set(fullKey, state)
  return state
}

const createWritePlan = (key, version) => {
  if (key === BOOK_STORAGE_KEY) return { ok: true, generation: null, excluded: true }
  const fullKey = buildStorageKey(key)
  const state = persistedHeadStates.get(fullKey)
  if (state?.blocked || state?.writeBlocked) return createReconciliationFailure()

  const local = readLocalLayer(fullKey)
  if (state?.localAvailable && local.available && local.rawPayload !== state.localRaw) {
    return createReconciliationFailure()
  }

  let generation = null
  let forceFork = state?.forceFork === true
  if (state?.generation && !state.forceFork) {
    generation = state.generation
  } else if (!state) {
    const current = inspectLayerRead(local, { version })
    if (current.valid && current.order === 'ordered') generation = current.generation
    if (current.valid && current.order !== 'ordered') forceFork = true
  }

  if (generation?.sequence === Number.MAX_SAFE_INTEGER) return createGenerationFailure()
  return {
    ok: true,
    generation: generation
      ? { lineage: generation.lineage, sequence: generation.sequence + 1 }
      : { lineage: createLineageId(), sequence: 1 },
    excluded: false,
    forceFork,
  }
}

const rememberLocalCommit = (key, rawPayload, generation, forceFork = false) => {
  if (key === BOOK_STORAGE_KEY || !generation) return
  const fullKey = buildStorageKey(key)
  const previous = persistedHeadStates.get(fullKey)
  if (!previous) return
  setPersistedHeadState(fullKey, {
    blocked: false,
    writeBlocked: false,
    serveLayer: 'local',
    generation,
    forceFork,
    localAvailable: true,
    localRaw: rawPayload,
    mirrorAvailable: previous?.mirrorAvailable === true,
    mirrorRaw: previous?.mirrorRaw ?? null,
  })
}

const decodeRawPayload = (rawPayload, options = {}) => {
  if (typeof rawPayload !== 'string' || !rawPayload.trim()) return null
  try {
    return decodePersistedEnvelope(JSON.parse(rawPayload), options)
  } catch {
    return null
  }
}

export const readPersistedState = (key, options = {}) => {
  const state = persistedHeadStates.get(buildStorageKey(key))
  if (state?.blocked || state?.serveLayer === 'indexeddb') return null
  return readPersistedStateFromLocal(key, options)
}

export const writePersistedState = (key, data, { version = 1, migrate } = {}) => {
  const finalize = (result) =>
    reportPersistenceWriteResult({
      key,
      result,
      retry: () =>
        retryCurrentSaveWrite(() => writePersistedState(key, data, { version, migrate })),
    })
  const fullKey = buildStorageKey(key)
  const plan = createWritePlan(key, version)
  if (!plan.ok) return finalize(plan)
  const accessBlock = getCurrentSaveWriteBlock()
  if (accessBlock) return finalize(accessBlock)
  const serialized = serializePersistedState(data, version, plan.generation)
  if (!serialized.ok) return finalize(serialized)

  const local = writePersistedStateToLocal(key, serialized.rawPayload)
  if (local.ok) {
    rememberLocalCommit(key, serialized.rawPayload, plan.generation, plan.forceFork)
    queueIndexedDbWrite(key, fullKey, serialized.rawPayload, {
      version,
      migrate,
      skipFreshnessCheck: plan.excluded || plan.forceFork,
    })
  }
  return finalize(local)
}

export const readPersistedStateAsync = async (key, options = {}) => {
  const fullKey = buildStorageKey(key)
  const state = persistedHeadStates.get(fullKey)
  if (state?.blocked) return null

  if (state?.serveLayer === 'local') {
    const local = readPersistedStateFromLocal(key, options)
    if (local != null) return local
  }
  if (canUseLayeredPersistence()) {
    const raw = await readFromIndexedDb(fullKey)
    const decoded = decodeRawPayload(raw, options)
    if (decoded != null) return decoded
  }
  return readPersistedStateFromLocal(key, options)
}

export const readPersistedRawLayers = async (key) => {
  if (typeof key !== 'string' || !key.trim()) {
    return { key: '', fullKey: '', localRaw: null, mirrorRaw: null, mirrorApplicable: false }
  }
  const normalizedKey = key.trim()
  const fullKey = buildStorageKey(normalizedKey)
  const pair = await readLayerPair(fullKey)
  return {
    key: normalizedKey,
    fullKey,
    localRaw: pair.local.rawPayload,
    mirrorRaw: pair.indexeddb.rawPayload,
    localAvailable: pair.local.available,
    mirrorAvailable: pair.indexeddb.available,
    mirrorApplicable: pair.indexeddb.applicable,
  }
}

export const writePersistedStateAsync = async (key, data, { version = 1, migrate } = {}) => {
  const finalize = (result) =>
    reportPersistenceWriteResult({
      key,
      result,
      retry: () =>
        retryCurrentSaveWrite(() => writePersistedStateAsync(key, data, { version, migrate })),
    })
  const fullKey = buildStorageKey(key)
  const plan = createWritePlan(key, version)
  if (!plan.ok) {
    if (plan.error === 'generation_exhausted') {
      return finalize({
        ...plan,
        local: createSkippedWrite('localStorage', plan.error, plan.retryable),
        mirror: createSkippedWrite('indexeddb', plan.error, plan.retryable),
      })
    }
    return finalize(createReconciliationFailure(true, plan.error))
  }
  const accessBlock = getCurrentSaveWriteBlock()
  if (accessBlock) {
    return finalize({
      ...accessBlock,
      local: createSkippedWrite('localStorage', accessBlock.error, true),
      mirror: createSkippedWrite('indexeddb', accessBlock.error, true),
    })
  }
  const serialized = serializePersistedState(data, version, plan.generation)
  if (!serialized.ok) {
    return finalize({
      ...serialized,
      local: createSkippedWrite('localStorage', serialized.error),
      mirror: createSkippedWrite('indexeddb', serialized.error),
    })
  }

  if (!plan.excluded && !plan.forceFork && canUseLayeredPersistence()) {
    const mirrorHead = await readIndexedDbLayer(fullKey)
    if (mirrorHead.available) {
      const precondition = checkMirrorWritePrecondition(
        mirrorHead.rawPayload,
        serialized.rawPayload,
        { version, migrate },
      )
      if (!precondition.ok) return finalize(createReconciliationFailure(true))
    }
  }

  const local = writePersistedStateToLocal(key, serialized.rawPayload)
  if (!local.ok) {
    return finalize({
      ...local,
      local,
      mirror: createSkippedWrite('indexeddb', 'primary_write_failed', local.retryable),
    })
  }
  rememberLocalCommit(key, serialized.rawPayload, plan.generation, plan.forceFork)

  if (!canUseLayeredPersistence()) {
    const mirror = ENABLE_INDEXEDDB_MIRROR
      ? createWriteFailure('indexeddb', indexedDbUnavailableError, false)
      : createWriteSuccess('indexeddb', false)
    return finalize({
      ok: local.ok && mirror.ok,
      error: mirror.ok ? null : mirror.error,
      carrier: mirror.ok ? local.carrier : mirror.carrier,
      retryable: mirror.ok ? false : mirror.retryable,
      attempted: local.attempted,
      local,
      mirror,
    })
  }

  const mirror = await writeToIndexedDbWithResult(fullKey, serialized.rawPayload, {
    version,
    migrate,
    skipFreshnessCheck: plan.excluded || plan.forceFork,
  })
  if (mirror.ok) {
    const previous = persistedHeadStates.get(fullKey)
    if (previous?.localRaw === serialized.rawPayload) {
      setPersistedHeadState(fullKey, {
        ...previous,
        forceFork: false,
        mirrorAvailable: true,
        mirrorRaw: serialized.rawPayload,
      })
    }
  }
  return finalize({
    ok: local.ok && mirror.ok,
    error: mirror.ok ? null : mirror.error,
    carrier: mirror.ok ? local.carrier : mirror.carrier,
    retryable: mirror.ok ? false : mirror.retryable,
    attempted: true,
    local,
    mirror,
  })
}

export const inspectPersistedStateLayers = async (key, options = {}) => {
  if (typeof key !== 'string' || !key.trim()) {
    return {
      key,
      fullKey: '',
      mirrorApplicable: false,
      mirrorInSync: false,
      recommendedSource: 'none',
      local: inspectRawPayload(null, { ...options, available: true, present: false }),
      indexeddb: inspectRawPayload(null, { ...options, available: false, present: false }),
      issueCode: 'invalid_key',
    }
  }

  const normalizedKey = key.trim()
  const fullKey = buildStorageKey(normalizedKey)
  const pair = await readLayerPair(fullKey)
  const inspected = inspectLayerPair(pair, options)
  const plan = selectReconcilePlan(inspected.local, inspected.indexeddb)
  const mirrorInSync =
    pair.indexeddb.applicable &&
    pair.local.available &&
    pair.indexeddb.available &&
    pair.local.rawPayload === pair.indexeddb.rawPayload
  const layersEmpty =
    pair.local.available &&
    !inspected.local.present &&
    (!pair.indexeddb.applicable ||
      (pair.indexeddb.available && !inspected.indexeddb.present))
  const equivalentValidCandidate =
    inspected.local.valid &&
    (!pair.indexeddb.applicable ||
      (pair.indexeddb.available && inspected.indexeddb.valid && mirrorInSync))
  const fullyReconciled =
    pair.local.available && (layersEmpty || equivalentValidCandidate)

  return {
    key: normalizedKey,
    fullKey,
    mirrorApplicable: pair.indexeddb.applicable,
    mirrorInSync,
    fullyReconciled,
    recommendedSource: plan.winner,
    local: inspected.local,
    indexeddb: inspected.indexeddb,
    issueCode: fullyReconciled ? '' : plan.reason,
  }
}

export const reconcilePersistedStateLayers = async (key, options = {}) => {
  const normalizedKey = typeof key === 'string' ? key.trim() : ''
  if (!normalizedKey) return { ok: false, action: 'skipped', reason: 'invalid_key', key }
  const fullKey = buildStorageKey(normalizedKey)
  const initialPair = await readLayerPair(fullKey)
  const initial = inspectLayerPair(initialPair, options)
  const plan = selectReconcilePlan(initial.local, initial.indexeddb)
  const baseReport = {
    key: normalizedKey,
    fullKey,
    sourceLayer: plan.winner,
    recommendedSource: plan.winner,
    local: initial.local,
    indexeddb: initial.indexeddb,
    mirrorApplicable: initialPair.indexeddb.applicable,
    mirrorInSync:
      initialPair.local.available &&
      initialPair.indexeddb.available &&
      initialPair.local.rawPayload === initialPair.indexeddb.rawPayload,
  }

  if (normalizedKey === BOOK_STORAGE_KEY) {
    return { ok: true, action: 'inspect_only', reason: 'repository_owned_exclusion', ...baseReport }
  }

  const writeAccessBlocked = getCurrentSaveWriteBlock()
  if (options.inspectOnly === true || writeAccessBlocked) {
    const empty = !initial.local.present && !initial.indexeddb.present
    const fullyReconciled =
      empty ||
      (plan.type === 'winner' &&
        initial.local.valid &&
        initial.local.rawPayload === plan.rawPayload &&
        (!initialPair.indexeddb.applicable ||
          (initial.indexeddb.valid && initial.indexeddb.rawPayload === plan.rawPayload)))
    const desired = plan.rawPayload
      ? inspectRawPayload(plan.rawPayload, { ...options, available: true, present: true })
      : null
    setPersistedHeadState(fullKey, {
      blocked: plan.type === 'conflict' || (!empty && plan.type === 'none'),
      writeBlocked: !fullyReconciled,
      reason: fullyReconciled ? '' : plan.reason,
      serveLayer: plan.winner,
      generation: desired?.generation || null,
      forceFork: empty || desired?.order !== 'ordered',
      localAvailable: initial.local.available,
      localRaw: initial.local.rawPayload,
      mirrorAvailable: initial.indexeddb.available,
      mirrorApplicable: initial.indexeddb.applicable,
      mirrorRaw: initial.indexeddb.rawPayload,
    })
    return {
      ok: true,
      action: 'inspect_only',
      reason: writeAccessBlocked ? 'write_access_read_only' : 'inspect_only',
      promotionSafe: fullyReconciled,
      ...baseReport,
    }
  }

  if (plan.type === 'conflict') {
    setPersistedHeadState(fullKey, { blocked: true, reason: plan.reason })
    return { ok: false, action: 'skipped', reason: plan.reason, ...baseReport }
  }

  if (plan.type === 'none') {
    const empty = !initial.local.present && !initial.indexeddb.present
    setPersistedHeadState(fullKey, {
      blocked: !empty,
      writeBlocked: false,
      reason: plan.reason,
      serveLayer: 'none',
      generation: null,
      forceFork: true,
      localAvailable: initial.local.available,
      localRaw: initial.local.rawPayload,
      mirrorAvailable: initial.indexeddb.available,
      mirrorRaw: initial.indexeddb.rawPayload,
    })
    return {
      ok: empty,
      action: empty
        ? initial.local.available &&
          (!initial.indexeddb.applicable || initial.indexeddb.available)
          ? 'noop'
          : 'degraded'
        : 'skipped',
      reason: empty ? 'empty' : plan.reason,
      ...baseReport,
    }
  }

  let desiredRaw = plan.rawPayload
  if (plan.type === 'adopt') {
    const source = initial.local.valid ? initial.local : initial.indexeddb
    const version = options.version ?? (source.envelopeVersion || 1)
    const adopted = serializePersistedState(source.decodedData, version, {
      lineage: createLineageId(),
      sequence: 1,
    })
    if (!adopted.ok) return { ...adopted, action: 'skipped', reason: adopted.error, ...baseReport }
    desiredRaw = adopted.rawPayload
  }

  const writes = []
  if (initial.local.available && initial.local.rawPayload !== desiredRaw) writes.push('local')
  if (initial.indexeddb.available && initial.indexeddb.rawPayload !== desiredRaw) {
    writes.push('indexeddb')
  }

  if (writes.length > 0) {
    const currentPair = await readLayerPair(fullKey)
    if (!pairHeadsEqual(initialPair, currentPair)) {
      setPersistedHeadState(fullKey, { blocked: true, reason: 'source_changed' })
      return { ok: false, action: 'skipped', reason: 'source_changed', ...baseReport }
    }
  }

  const writeResults = {}
  if (writes.includes('local')) {
    writeResults.local = writePersistedRawToLocal(fullKey, desiredRaw)
  }
  if (writes.includes('indexeddb')) {
    writeResults.indexeddb = await writeToIndexedDbWithResult(fullKey, desiredRaw, {
      version: options.version,
      allowReconciliation: true,
    })
  }

  const finalPair = writes.length > 0 ? await readLayerPair(fullKey) : initialPair
  const final = inspectLayerPair(finalPair, options)
  const localWriteOk = !writes.includes('local') || writeResults.local === true
  const mirrorWriteOk = !writes.includes('indexeddb') || writeResults.indexeddb?.ok === true
  const localVerified = !writes.includes('local') || finalPair.local.rawPayload === desiredRaw
  const mirrorVerified =
    !writes.includes('indexeddb') || finalPair.indexeddb.rawPayload === desiredRaw
  const writesOk = localWriteOk && mirrorWriteOk && localVerified && mirrorVerified
  const fullyReconciled =
    finalPair.local.available &&
    finalPair.local.rawPayload === desiredRaw &&
    (!finalPair.indexeddb.applicable ||
      (finalPair.indexeddb.available && finalPair.indexeddb.rawPayload === desiredRaw))
  const desiredInspect = inspectRawPayload(desiredRaw, {
    ...options,
    available: true,
    present: true,
  })
  const serveLayer =
    finalPair.local.rawPayload === desiredRaw
      ? 'local'
      : finalPair.indexeddb.rawPayload === desiredRaw
        ? 'indexeddb'
        : plan.winner
  setPersistedHeadState(fullKey, {
    blocked: false,
    writeBlocked: false,
    reason: writesOk ? '' : 'write_failed',
    serveLayer,
    generation: desiredInspect.generation,
    forceFork: !fullyReconciled || desiredInspect.order !== 'ordered',
    localAvailable: finalPair.local.available,
    localRaw: finalPair.local.rawPayload,
    mirrorAvailable: finalPair.indexeddb.available,
    mirrorApplicable: finalPair.indexeddb.applicable,
    mirrorRaw: finalPair.indexeddb.rawPayload,
  })

  const degraded =
    !finalPair.local.available ||
    (finalPair.indexeddb.applicable && !finalPair.indexeddb.available)
  return {
    ...baseReport,
    ok: writesOk,
    action: writesOk
      ? writes.length === 0
        ? degraded
          ? 'degraded'
          : 'noop'
        : plan.type === 'adopt'
          ? 'adopted'
          : degraded
            ? 'degraded'
            : 'repaired'
      : 'partial',
    reason: writesOk ? (fullyReconciled ? plan.reason : 'degraded') : 'write_failed',
    winner: plan.winner,
    winnerRaw: desiredRaw,
    fullyReconciled,
    writeResults,
    before: baseReport,
    local: final.local,
    indexeddb: final.indexeddb,
  }
}

export const preparePersistedStateLayers = async (targets = []) => {
  const results = []
  for (const target of Array.isArray(targets) ? targets : []) {
    const inspectOnly = target?.inspectOnly === true || target?.key === BOOK_STORAGE_KEY
    try {
      results.push(
        await reconcilePersistedStateLayers(target?.key, {
          version: target?.version,
          migrate: target?.migrate,
          inspectOnly,
        }),
      )
    } catch (error) {
      results.push({
        ok: false,
        action: 'skipped',
        reason: 'prepare_failed',
        key: target?.key,
        error: error?.name || 'Error',
      })
    }
  }
  return {
    ok: results.every((result) => result.ok),
    total: results.length,
    mutable: results.filter((result) => result.action !== 'inspect_only').length,
    inspectOnly: results.filter((result) => result.action === 'inspect_only').length,
    results,
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
  indexedDbOpenTimeoutMs: INDEXED_DB_OPEN_TIMEOUT_MS,
})
