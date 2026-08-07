const READ_ONLY_CODES = new Set([
  'read_only_conflict',
  'stale_generation',
  'reconciliation_required',
  'lineage_conflict',
  'generation_conflict',
  'legacy_freshness_unknown',
  'mirror_regression',
  'source_changed',
])

const incidents = new Map()
const listeners = new Set()
let phase = 'idle'
let retryPromise = null
let revision = 0

const normalizeKey = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : 'unknown'

const normalizeCode = (result) => {
  const code = result?.code || result?.error
  return typeof code === 'string' && code.trim() ? code.trim() : 'write_failed'
}

const isReadOnlyResult = (result, code) =>
  result?.readOnly === true ||
  result?.carrier === 'reconciliation' ||
  READ_ONLY_CODES.has(code)

const isDegradedResult = (result) =>
  result?.local?.ok === true && result?.mirror && result.mirror.ok === false

const modePriority = Object.freeze({
  read_only: 3,
  save_failed: 2,
  degraded: 1,
})

const buildPublicStatus = () => {
  const items = Array.from(incidents.values()).sort(
    (left, right) =>
      modePriority[right.mode] - modePriority[left.mode] || right.updatedAt - left.updatedAt,
  )
  const primary = items[0] || null
  return Object.freeze({
    active: items.length > 0,
    mode: primary?.mode || 'ready',
    phase,
    incidentCount: items.length,
    affectedKeys: Object.freeze(items.map((item) => item.key)),
    primaryCode: primary?.code || '',
    retryAvailable: items.some((item) => typeof item.retry === 'function'),
    revision,
    updatedAt: primary?.updatedAt || 0,
  })
}

let publicStatus = buildPublicStatus()

const emitStatus = () => {
  revision += 1
  publicStatus = buildPublicStatus()
  for (const listener of listeners) listener(publicStatus)
}

export const getPersistenceRuntimeStatus = () => publicStatus

export const subscribePersistenceRuntimeStatus = (listener, { emitCurrent = true } = {}) => {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  if (emitCurrent) listener(publicStatus)
  return () => listeners.delete(listener)
}

export const clearPersistenceIncident = (key) => {
  const removed = incidents.delete(normalizeKey(key))
  if (removed) emitStatus()
  return removed
}

export const reportPersistenceWriteResult = ({
  key,
  result,
  retry,
  refreshCurrentSave,
} = {}) => {
  const normalizedKey = normalizeKey(key)
  if (result?.ok === true) {
    clearPersistenceIncident(normalizedKey)
    return result
  }

  const code = normalizeCode(result)
  const mode = isReadOnlyResult(result, code)
    ? 'read_only'
    : isDegradedResult(result)
      ? 'degraded'
      : 'save_failed'
  incidents.set(normalizedKey, {
    key: normalizedKey,
    code,
    mode,
    retryable: result?.retryable !== false,
    retry: result?.retryable !== false && typeof retry === 'function' ? retry : null,
    refreshCurrentSave:
      typeof refreshCurrentSave === 'function' ? refreshCurrentSave : null,
    updatedAt: Date.now(),
  })
  emitStatus()
  return result
}

export const retryPersistenceWrites = async () => {
  if (retryPromise) return retryPromise
  const candidates = Array.from(incidents.values()).filter(
    (incident) => typeof incident.retry === 'function',
  )
  if (candidates.length === 0) {
    return { ok: false, attempted: 0, remaining: incidents.size }
  }

  phase = 'retrying'
  emitStatus()
  retryPromise = (async () => {
    let succeeded = 0
    for (const incident of candidates) {
      try {
        const result = await incident.retry()
        reportPersistenceWriteResult({
          key: incident.key,
          result,
          retry: incident.retry,
          refreshCurrentSave: incident.refreshCurrentSave,
        })
        if (result?.ok === true) succeeded += 1
      } catch {
        reportPersistenceWriteResult({
          key: incident.key,
          result: {
            ok: false,
            error: 'retry_failed',
            carrier: 'runtime',
            retryable: true,
            attempted: true,
          },
          retry: incident.retry,
          refreshCurrentSave: incident.refreshCurrentSave,
        })
      }
    }
    return {
      ok: incidents.size === 0,
      attempted: candidates.length,
      succeeded,
      remaining: incidents.size,
    }
  })().finally(() => {
    phase = 'idle'
    retryPromise = null
    emitStatus()
  })
  return retryPromise
}

export const resetPersistenceRuntimeStatusForTesting = () => {
  incidents.clear()
  listeners.clear()
  phase = 'idle'
  retryPromise = null
  revision = 0
  publicStatus = buildPublicStatus()
}
