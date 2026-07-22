export const MEBIBYTE = 1024 * 1024
export const BOOK_IMPORT_PERSISTENCE_THRESHOLD_BYTES = 1 * MEBIBYTE
export const BATCH_DURABLE_WRITE_THRESHOLD_BYTES = 5 * MEBIBYTE
export const PEAK_WORKING_SPACE_THRESHOLD_BYTES = 10 * MEBIBYTE

export const PERSISTENT_STORAGE_STATES = Object.freeze([
  'unsupported',
  'not_persistent',
  'requesting',
  'persistent',
  'denied',
  'error',
])

const toBytes = (value) => {
  const bytes = Number(value)
  return Number.isFinite(bytes) && bytes >= 0 ? Math.floor(bytes) : null
}

export const classifyPersistenceTrigger = ({
  action,
  estimatedAddedBytes,
  estimatedPeakWorkingBytes,
  isFirstLocalBinary = false,
} = {}) => {
  const addedBytes = toBytes(estimatedAddedBytes)
  const peakWorkingBytes = toBytes(estimatedPeakWorkingBytes)
  const reasons = []

  if (action === 'keep_local_binary' && isFirstLocalBinary) reasons.push('first_local_binary')
  if (action === 'complete_backup_restore') reasons.push('complete_backup_restore')
  if (action === 'storage_migration_cutover') reasons.push('storage_migration_cutover')
  if (action === 'book_import' && addedBytes !== null && addedBytes >= BOOK_IMPORT_PERSISTENCE_THRESHOLD_BYTES) {
    reasons.push('large_book_import')
  }
  if (addedBytes !== null && addedBytes >= BATCH_DURABLE_WRITE_THRESHOLD_BYTES) {
    reasons.push('large_batch_durable_write')
  }
  if (peakWorkingBytes !== null && peakWorkingBytes >= PEAK_WORKING_SPACE_THRESHOLD_BYTES) {
    reasons.push('high_peak_working_space')
  }

  return Object.freeze({ qualifies: reasons.length > 0, reasons: Object.freeze(reasons) })
}

export const classifyCapacity = ({ usage, quota, requiredPeakBytes } = {}) => {
  const normalizedUsage = toBytes(usage)
  const normalizedQuota = toBytes(quota)
  const normalizedRequired = toBytes(requiredPeakBytes)
  if (normalizedUsage === null || normalizedQuota === null || normalizedRequired === null) {
    return { status: 'unknown', usage: normalizedUsage, quota: normalizedQuota, availableBytes: null }
  }
  const availableBytes = Math.max(0, normalizedQuota - normalizedUsage)
  return {
    status: availableBytes >= normalizedRequired ? 'available' : 'insufficient',
    usage: normalizedUsage,
    quota: normalizedQuota,
    availableBytes,
  }
}

export const createPersistentStoragePolicy = ({ storage = globalThis.navigator?.storage } = {}) => {
  const supported = Boolean(
    storage &&
      typeof storage.persisted === 'function' &&
      typeof storage.persist === 'function' &&
      typeof storage.estimate === 'function',
  )
  let state = supported ? 'not_persistent' : 'unsupported'
  let lastContext = null
  let lastCheckedAt = null
  let lastAttemptAt = null

  const snapshot = () => ({ state, lastContext, lastCheckedAt, lastAttemptAt })

  const inspect = async ({ context = 'status_check', requiredPeakBytes } = {}) => {
    lastContext = context
    lastCheckedAt = Date.now()
    if (!supported) return { ...snapshot(), capacity: { status: 'unavailable' } }
    try {
      const [persistent, estimate] = await Promise.all([storage.persisted(), storage.estimate()])
      state = persistent ? 'persistent' : 'not_persistent'
      return { ...snapshot(), capacity: classifyCapacity({ ...estimate, requiredPeakBytes }) }
    } catch {
      state = 'error'
      return { ...snapshot(), capacity: { status: 'unavailable' }, errorCode: 'storage_check_failed' }
    }
  }

  const request = async ({
    context,
    trigger,
    userConfirmed = false,
    requiredPeakBytes,
  } = {}) => {
    const qualification = classifyPersistenceTrigger(trigger)
    const inspection = await inspect({ context, requiredPeakBytes })
    if (inspection.state === 'unsupported' || inspection.state === 'error') {
      return { ...inspection, qualification, attempted: false }
    }
    if (inspection.state === 'persistent') {
      return { ...inspection, qualification, attempted: false }
    }
    if (!qualification.qualifies || !userConfirmed) {
      return { ...inspection, qualification, attempted: false }
    }

    state = 'requesting'
    lastAttemptAt = Date.now()
    try {
      const granted = await storage.persist()
      const refreshed = await storage.persisted()
      state = granted && refreshed ? 'persistent' : 'denied'
      return { ...snapshot(), capacity: inspection.capacity, qualification, attempted: true }
    } catch {
      state = 'error'
      return {
        ...snapshot(),
        capacity: inspection.capacity,
        qualification,
        attempted: true,
        errorCode: 'storage_request_failed',
      }
    }
  }

  const retryFromSettings = (options = {}) =>
    request({
      ...options,
      context: options.context || 'settings_retry',
      userConfirmed: true,
    })

  return Object.freeze({ supported, inspect, request, retryFromSettings, getSnapshot: snapshot })
}
