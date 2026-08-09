import { WRITE_LEASES_STORE } from './persistence-repository-schema'

export const REPOSITORY_WRITE_SCOPE = 'repository-write'
export const WRITE_COORDINATOR_DEFAULTS = Object.freeze({
  waitTimeoutMs: 8000,
  leaseDurationMs: 15000,
  heartbeatMs: 5000,
})

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const requestResult = (request) =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('indexeddb_request_failed'))
  })

const transactionDone = (transaction) =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error || new Error('indexeddb_transaction_aborted'))
    transaction.onerror = () => reject(transaction.error || new Error('indexeddb_transaction_failed'))
  })

const createReadOnlyConflict = ({ retry, refreshCurrentSave, cause = 'timed_out' }) => ({
  ok: false,
  code: 'read_only_conflict',
  cause,
  readOnly: true,
  availableActions: Object.freeze(['retry', 'refresh_current_save']),
  retry,
  refreshCurrentSave,
})

const createStaleGenerationResult = ({ retry, refreshCurrentSave, expected, actual }) => ({
  ok: false,
  code: 'stale_generation',
  readOnly: true,
  expectedPointerRevision: expected,
  actualPointerRevision: actual,
  availableActions: Object.freeze(['retry', 'refresh_current_save']),
  retry,
  refreshCurrentSave,
})

const createIndexedDbLeaseAdapter = ({ database, now, recoverNonterminalJournal }) => {
  const transact = async (worker) => {
    const transaction = database.transaction(WRITE_LEASES_STORE, 'readwrite')
    const completion = transactionDone(transaction)
    try {
      const result = await worker(transaction.objectStore(WRITE_LEASES_STORE))
      await completion
      return result
    } catch (error) {
      try {
        transaction.abort()
      } catch {
        // The transaction may already be complete or aborted.
      }
      await completion.catch(() => {})
      throw error
    }
  }

  return {
    acquire: ({ scopeKey, ownerId, operationId, leaseDurationMs }) =>
      transact(async (store) => {
        const current = await requestResult(store.get(scopeKey))
        const currentTime = now()
        if (current && current.ownerId !== ownerId && current.expiresAt > currentTime) {
          return { ok: false, code: 'busy', current }
        }
        if (
          current &&
          current.ownerId !== ownerId &&
          current.expiresAt <= currentTime &&
          current.releasedAt == null
        ) {
          const recovery = await recoverNonterminalJournal({ scopeKey, expiredLease: current })
          if (!recovery || recovery.safe !== true) return { ok: false, code: 'unsupported' }
        }
        const fencingToken = Number(current?.fencingToken || 0) + 1
        const lease = {
          scopeKey,
          ownerId,
          operationId,
          fencingToken,
          acquiredAt: currentTime,
          expiresAt: currentTime + leaseDurationMs,
        }
        store.put(lease)
        return { ok: true, lease }
      }),
    renew: ({ lease, leaseDurationMs }) =>
      transact(async (store) => {
        const current = await requestResult(store.get(lease.scopeKey))
        if (!current || current.ownerId !== lease.ownerId || current.fencingToken !== lease.fencingToken) {
          return { ok: false, code: 'lease_lost' }
        }
        const next = { ...current, expiresAt: now() + leaseDurationMs }
        store.put(next)
        return { ok: true, lease: next }
      }),
    release: ({ lease }) =>
      transact(async (store) => {
        const current = await requestResult(store.get(lease.scopeKey))
        if (!current) return { ok: true, released: false }
        if (current.ownerId !== lease.ownerId || current.fencingToken !== lease.fencingToken) {
          return { ok: false, code: 'lease_lost' }
        }
        store.put({ ...current, expiresAt: 0, releasedAt: now() })
        return { ok: true, released: true }
      }),
    inspect: (scopeKey) => transact((store) => requestResult(store.get(scopeKey))),
  }
}

const acquireWebLock = async ({ locks, scopeKey, ownerId, operationId }) => {
  let releaseLock
  let acquiredResolve
  const acquired = new Promise((resolve) => {
    acquiredResolve = resolve
  })
  const hold = new Promise((resolve) => {
    releaseLock = resolve
  })
  let requestError = null
  const requestPromise = Promise.resolve()
    .then(() =>
      locks.request(
        scopeKey,
        { mode: 'exclusive', ifAvailable: true },
        async (lock) => {
          if (!lock) {
            acquiredResolve(null)
            return
          }
          acquiredResolve({ ownerId, operationId, fencingToken: null })
          await hold
        },
      ),
    )
    .catch((error) => {
      requestError = error
      acquiredResolve(null)
    })
  const lease = await acquired
  if (!lease) {
    await requestPromise
    if (requestError) throw requestError
    return null
  }
  return {
    lease,
    release: async () => {
      releaseLock()
      await requestPromise
      return { ok: true, released: true }
    },
  }
}

export const createWriteCoordinator = ({
  database = null,
  locks = globalThis.navigator?.locks,
  BroadcastChannelClass = globalThis.BroadcastChannel,
  forceIndexedDbFallback = false,
  scopeKey = REPOSITORY_WRITE_SCOPE,
  ownerId = globalThis.crypto?.randomUUID?.() || `writer-${Date.now()}`,
  now = () => Date.now(),
  waitTimeoutMs = WRITE_COORDINATOR_DEFAULTS.waitTimeoutMs,
  leaseDurationMs = WRITE_COORDINATOR_DEFAULTS.leaseDurationMs,
  heartbeatMs = WRITE_COORDINATOR_DEFAULTS.heartbeatMs,
  pollIntervalMs = Math.min(50, waitTimeoutMs),
  recoverNonterminalJournal = async () => ({ safe: false }),
  refreshCurrentSave = async () => ({ ok: true, refreshed: true }),
  readActivePointer = async () => ({ generationId: null, pointerRevision: null }),
} = {}) => {
  const useWebLocks = !forceIndexedDbFallback && locks && typeof locks.request === 'function'
  const leaseAdapter = database
    ? createIndexedDbLeaseAdapter({ database, now, recoverNonterminalJournal })
    : null
  const channel = typeof BroadcastChannelClass === 'function'
    ? new BroadcastChannelClass('schatphone-repository-write')
    : null
  const listeners = new Set()
  let closed = false

  const handleMessage = (event) => {
    const message = event?.data
    if (
      !message ||
      message.scopeKey !== scopeKey ||
      message.ownerId === ownerId ||
      !['acquired', 'released', 'timed_out'].includes(message.type)
    ) {
      return
    }
    for (const listener of listeners) listener(Object.freeze({ ...message }))
  }

  channel?.addEventListener?.('message', handleMessage)

  const notify = (type, metadata) => {
    channel?.postMessage({
      type,
      scopeKey,
      ownerId,
      operationId: metadata.operationId,
      fencingToken: metadata.fencingToken ?? null,
      at: now(),
    })
  }

  const acquire = async ({ operationId, scope = {}, expectedPointerRevision = null } = {}) => {
    if (closed) return { ok: false, code: 'unsupported', readOnly: true }
    if (typeof operationId !== 'string' || !operationId.trim()) {
      return { ok: false, code: 'unsupported', readOnly: true }
    }
    const startedAt = now()
    const retry = () => acquire({ operationId, scope, expectedPointerRevision })
    const refresh = () => refreshCurrentSave({ operationId, scope, expectedPointerRevision })
    const verifyPointer = async () => {
      if (expectedPointerRevision == null) return { ok: true }
      let activePointer
      try {
        activePointer = await readActivePointer()
      } catch {
        return { ok: false, code: 'unsupported' }
      }
      if (activePointer?.pointerRevision !== expectedPointerRevision) {
        return {
          ok: false,
          code: 'stale_generation',
          expected: expectedPointerRevision,
          actual: activePointer?.pointerRevision ?? null,
        }
      }
      return { ok: true, activePointer }
    }

    while (now() - startedAt <= waitTimeoutMs) {
      if (useWebLocks) {
        let lock
        try {
          lock = await acquireWebLock({
            locks,
            scopeKey,
            ownerId,
            operationId,
          })
        } catch {
          return { ok: false, code: 'unsupported', readOnly: true }
        }
        if (lock) {
          const pointerCheck = await verifyPointer()
          if (!pointerCheck.ok) {
            await lock.release()
            if (pointerCheck.code === 'stale_generation') {
              return createStaleGenerationResult({
                retry,
                refreshCurrentSave: refresh,
                expected: pointerCheck.expected,
                actual: pointerCheck.actual,
              })
            }
            return { ok: false, code: pointerCheck.code }
          }
          notify('acquired', { operationId, fencingToken: null })
          return {
            ok: true,
            code: 'acquired',
            adapter: 'web_locks',
            ownerId,
            operationId,
            expectedPointerRevision,
            scope,
            fencingToken: null,
            heartbeat: async () => ({ ok: true }),
            verifyBeforeCommit: verifyPointer,
            release: () => {
              const result = lock.release()
              notify('released', { operationId, fencingToken: null })
              return result
            },
          }
        }
      } else if (leaseAdapter) {
        let result
        try {
          result = await leaseAdapter.acquire({
            scopeKey,
            ownerId,
            operationId,
            leaseDurationMs,
          })
        } catch {
          return createReadOnlyConflict({
            retry,
            refreshCurrentSave: refresh,
            cause: 'coordinator_unavailable',
          })
        }
        if (result.ok) {
          let lease = result.lease
          const pointerCheck = await verifyPointer()
          if (!pointerCheck.ok) {
            await leaseAdapter.release({ lease })
            if (pointerCheck.code === 'stale_generation') {
              return createStaleGenerationResult({
                retry,
                refreshCurrentSave: refresh,
                expected: pointerCheck.expected,
                actual: pointerCheck.actual,
              })
            }
            return { ok: false, code: pointerCheck.code }
          }
          notify('acquired', { operationId, fencingToken: lease.fencingToken })
          return {
            ok: true,
            code: 'acquired',
            adapter: 'indexeddb_lease',
            ownerId,
            operationId,
            expectedPointerRevision,
            scope,
            fencingToken: lease.fencingToken,
            heartbeatMs,
            heartbeat: async () => {
              const renewed = await leaseAdapter.renew({ lease, leaseDurationMs })
              if (renewed.ok) lease = renewed.lease
              return renewed
            },
            verifyBeforeCommit: async () => {
              const renewed = await leaseAdapter.renew({ lease, leaseDurationMs })
              if (!renewed.ok) return renewed
              lease = renewed.lease
              return verifyPointer()
            },
            release: async () => {
              const released = await leaseAdapter.release({ lease })
              if (released.ok) notify('released', { operationId, fencingToken: lease.fencingToken })
              return released
            },
          }
        }
        if (result.code === 'unsupported') {
          return createReadOnlyConflict({ retry, refreshCurrentSave: refresh, cause: 'unsafe_recovery' })
        }
      } else {
        return { ok: false, code: 'unsupported', readOnly: true }
      }

      if (now() - startedAt >= waitTimeoutMs) break
      await delay(Math.max(1, Math.min(pollIntervalMs, waitTimeoutMs - (now() - startedAt))))
    }

    notify('timed_out', { operationId, fencingToken: null })
    return createReadOnlyConflict({ retry, refreshCurrentSave: refresh })
  }

  const close = () => {
    closed = true
    channel?.removeEventListener?.('message', handleMessage)
    listeners.clear()
    channel?.close()
  }

  const subscribe = (listener) => {
    if (closed || typeof listener !== 'function') return () => {}
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return Object.freeze({
    ownerId,
    scopeKey,
    adapter: useWebLocks ? 'web_locks' : leaseAdapter ? 'indexeddb_lease' : 'unsupported',
    acquire,
    subscribe,
    close,
  })
}
