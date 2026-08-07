import {
  clearPersistenceIncident,
  reportPersistenceWriteResult,
} from './persistence-runtime-status'
import { openPersistenceRepositoryDatabase } from './persistence-repository-schema'
import { createWriteCoordinator } from './write-coordinator'

export const CURRENT_SAVE_WRITE_SCOPE = 'current-save-write'
export const CURRENT_SAVE_WRITE_STATUS_KEY = 'current-save-writer'

const createId = (prefix, randomUUID) =>
  `${prefix}-${randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`

const createAccessSnapshot = (state) =>
  Object.freeze({
    managed: state.phase !== 'unmanaged',
    writable: state.phase === 'unmanaged' || state.phase === 'writable',
    readOnly: !['unmanaged', 'writable'].includes(state.phase),
    phase: state.phase,
    code: state.code,
    cause: state.cause,
    adapter: state.adapter,
    ownerId: state.ownerId,
  })

const normalizeConflict = (result = {}) => ({
  ok: false,
  code: result.code || 'read_only_conflict',
  error: result.code || result.error || 'read_only_conflict',
  cause: result.cause || 'coordinator_unavailable',
  carrier: 'coordination',
  readOnly: true,
  retryable: true,
  attempted: false,
  availableActions: Object.freeze(['retry', 'refresh_current_save']),
})

export const createCurrentSaveWriteRuntime = (baseOptions = {}) => {
  const state = {
    phase: 'unmanaged',
    code: '',
    cause: '',
    adapter: 'unmanaged',
    ownerId: '',
  }
  const reportWriteResult =
    baseOptions.reportWriteResult || reportPersistenceWriteResult
  const clearIncident = baseOptions.clearIncident || clearPersistenceIncident
  const coordinatorFactory = baseOptions.coordinatorFactory || createWriteCoordinator
  const openDatabase =
    baseOptions.openDatabase || openPersistenceRepositoryDatabase
  const randomUUID =
    baseOptions.randomUUID || globalThis.crypto?.randomUUID?.bind(globalThis.crypto)
  let coordinator = null
  let database = null
  let lease = null
  let startPromise = null
  let heartbeatTimerId = null
  let heartbeatPending = false
  let lastOptions = null

  const updateState = (patch) => {
    Object.assign(state, patch)
    return createAccessSnapshot(state)
  }

  const reportConflict = (result) => {
    const conflict = normalizeConflict(result)
    updateState({
      phase: 'read_only',
      code: conflict.code,
      cause: conflict.cause,
      adapter: coordinator?.adapter || state.adapter || 'unsupported',
      ownerId: coordinator?.ownerId || state.ownerId,
    })
    reportWriteResult({
      key: CURRENT_SAVE_WRITE_STATUS_KEY,
      result: conflict,
      retry: () => retry(),
    })
    return conflict
  }

  const stopHeartbeat = () => {
    if (heartbeatTimerId != null) clearInterval(heartbeatTimerId)
    heartbeatTimerId = null
    heartbeatPending = false
  }

  const handleLeaseLoss = (result) => {
    stopHeartbeat()
    lease = null
    return reportConflict({
      ...result,
      code: 'read_only_conflict',
      cause: result?.code || 'lease_lost',
    })
  }

  const startHeartbeat = () => {
    stopHeartbeat()
    const heartbeatMs = Number(lease?.heartbeatMs)
    if (!Number.isFinite(heartbeatMs) || heartbeatMs <= 0) return
    heartbeatTimerId = setInterval(() => {
      if (heartbeatPending || !lease || state.phase !== 'writable') return
      heartbeatPending = true
      void lease
        .heartbeat()
        .then((result) => {
          if (!result?.ok) handleLeaseLoss(result)
        })
        .catch(() => handleLeaseLoss({ code: 'lease_lost' }))
        .finally(() => {
          heartbeatPending = false
        })
    }, heartbeatMs)
  }

  const releaseResources = async () => {
    stopHeartbeat()
    const activeLease = lease
    lease = null
    if (activeLease) await activeLease.release().catch(() => {})
    coordinator?.close()
    coordinator = null
    database?.close?.()
    database = null
  }

  const initialize = async (options = {}) => {
    if (state.phase === 'writable') return createAccessSnapshot(state)
    if (startPromise) return startPromise
    lastOptions = { ...(lastOptions || {}), ...options }
    updateState({
      phase: 'starting',
      code: '',
      cause: '',
      adapter: state.adapter === 'unmanaged' ? 'pending' : state.adapter,
    })

    startPromise = (async () => {
      try {
        const locks = Object.prototype.hasOwnProperty.call(lastOptions, 'locks')
          ? lastOptions.locks
          : globalThis.navigator?.locks
        const hasWebLocks = Boolean(locks && typeof locks.request === 'function')
        if (!coordinator) {
          if (!hasWebLocks) {
            database = await openDatabase(lastOptions.repositoryOptions || {})
          }
          const coordinatorOptions = {
            database,
            locks,
            scopeKey: CURRENT_SAVE_WRITE_SCOPE,
            ownerId: createId('current-save-page', randomUUID),
            recoverNonterminalJournal: async () => ({ safe: true }),
            ...(lastOptions.coordinatorOptions || {}),
          }
          coordinator = coordinatorFactory(coordinatorOptions)
        }

        const result = await coordinator.acquire({
          operationId: createId('current-save-session', randomUUID),
          scope: { ownerId: 'current-save', dataClassId: 'page-writer' },
        })
        if (!result?.ok) return reportConflict(result)

        lease = result
        const access = updateState({
          phase: 'writable',
          code: '',
          cause: '',
          adapter: result.adapter || coordinator.adapter,
          ownerId: result.ownerId || coordinator.ownerId,
        })
        clearIncident(CURRENT_SAVE_WRITE_STATUS_KEY)
        startHeartbeat()
        return { ok: true, ...access }
      } catch (error) {
        await releaseResources()
        return reportConflict({
          code: error?.code || 'read_only_conflict',
          cause: error?.code || error?.name || 'coordinator_unavailable',
        })
      }
    })().finally(() => {
      startPromise = null
    })
    return startPromise
  }

  const retry = async () => {
    if (state.phase === 'writable') return { ok: true, ...createAccessSnapshot(state) }
    return initialize(lastOptions || {})
  }

  const getAccess = () => createAccessSnapshot(state)
  const canWrite = () => getAccess().writable
  const getWriteBlock = () => (canWrite() ? null : normalizeConflict({
    code: state.code || 'read_only_conflict',
    cause: state.cause || (state.phase === 'starting' ? 'writer_starting' : 'timed_out'),
  }))

  const retryThen = async (write) => {
    if (state.phase === 'unmanaged') {
      return typeof write === 'function' ? write() : createAccessSnapshot(state)
    }
    const access = await retry()
    if (!access?.ok) return access
    return typeof write === 'function' ? write() : access
  }

  const close = async () => {
    if (state.phase === 'unmanaged') return createAccessSnapshot(state)
    updateState({ phase: 'closed', code: 'read_only_conflict', cause: 'session_closed' })
    await releaseResources()
    return createAccessSnapshot(state)
  }

  const resetForTesting = async () => {
    await releaseResources()
    lastOptions = null
    updateState({
      phase: 'unmanaged',
      code: '',
      cause: '',
      adapter: 'unmanaged',
      ownerId: '',
    })
    clearIncident(CURRENT_SAVE_WRITE_STATUS_KEY)
  }

  return Object.freeze({
    initialize,
    retry,
    retryThen,
    getAccess,
    canWrite,
    getWriteBlock,
    close,
    resetForTesting,
  })
}

const currentSaveWriteRuntime = createCurrentSaveWriteRuntime()

export const initializeCurrentSaveWriter = (options) =>
  currentSaveWriteRuntime.initialize(options)
export const retryCurrentSaveWriter = () => currentSaveWriteRuntime.retry()
export const retryCurrentSaveWrite = (write) => currentSaveWriteRuntime.retryThen(write)
export const getCurrentSaveWriteAccess = () => currentSaveWriteRuntime.getAccess()
export const canWriteCurrentSave = () => currentSaveWriteRuntime.canWrite()
export const getCurrentSaveWriteBlock = () => currentSaveWriteRuntime.getWriteBlock()
export const closeCurrentSaveWriter = () => currentSaveWriteRuntime.close()
export const resetCurrentSaveWriteRuntimeForTesting = () =>
  currentSaveWriteRuntime.resetForTesting()
