import {
  createForegroundSessionTickController,
  SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS,
  SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
} from './foreground-session-tick'

export const SIMULATION_FOREGROUND_TICK_ACTION = 'foreground_event_tick'
export const SIMULATION_FOREGROUND_TICK_PROVIDER = 'local_simulation'
export const SIMULATION_FOREGROUND_TICK_TRIGGERED_CODE = 'SIMULATION_FOREGROUND_TICK_TRIGGERED'
export const SIMULATION_FOREGROUND_TICK_SKIPPED_CODE = 'SIMULATION_FOREGROUND_TICK_SKIPPED'

const normalizeText = (value, fallback = '', max = 180) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeTimestamp = (value, fallback = Date.now()) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(num)
}

export const normalizeForegroundSessionTickIntervalMs = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) {
    return SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS
  }
  return Math.max(SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS, Math.floor(num))
}

export const isForegroundDocumentVisible = (documentRef) => {
  if (!documentRef) return true
  if (documentRef.hidden === true) return false
  return documentRef.visibilityState !== 'hidden'
}

export const readForegroundRoutePath = (route) => {
  if (!route) return ''
  if (typeof route.path === 'string') return route.path
  if (typeof route.value?.path === 'string') return route.value.path
  return ''
}

export const resolveForegroundSessionTickBlockReason = ({
  simulationStore,
  systemStore,
  route,
  documentRef,
} = {}) => {
  if (simulationStore?.settings?.foregroundSessionTickEnabled !== true) return 'disabled'
  if (!isForegroundDocumentVisible(documentRef)) return 'hidden'
  if (systemStore?.isLocked === true) return 'phone_locked'
  if (readForegroundRoutePath(route) === '/lock') return 'lock_route'
  return ''
}

export const canRunForegroundSessionTickLifecycle = (options = {}) =>
  !resolveForegroundSessionTickBlockReason(options)

export const createForegroundSessionTickReport = (result = {}, { createdAt } = {}) => {
  const status = normalizeText(result?.status, '', 40)
  const ok = result?.ok === true || status === 'triggered'
  const reason = normalizeText(
    result?.reason || result?.log?.reason,
    ok ? 'triggered' : 'skipped',
    180,
  )
  const reportAt = normalizeTimestamp(result?.log?.at, createdAt)

  return {
    level: 'info',
    module: 'simulation',
    action: SIMULATION_FOREGROUND_TICK_ACTION,
    provider: SIMULATION_FOREGROUND_TICK_PROVIDER,
    model: reason,
    statusCode: 0,
    code: ok ? SIMULATION_FOREGROUND_TICK_TRIGGERED_CODE : SIMULATION_FOREGROUND_TICK_SKIPPED_CODE,
    message: ok
      ? `Foreground event tick triggered: ${reason}.`
      : `Foreground event tick skipped: ${reason}.`,
    createdAt: reportAt,
  }
}

export const createForegroundSessionTickLifecycle = ({
  simulationStore,
  foodDeliveryStore,
  systemStore,
  route,
  documentRef,
  createController = createForegroundSessionTickController,
  now = () => Date.now(),
  writeReport,
} = {}) => {
  let controller = null

  const stop = () => {
    if (!controller) {
      return {
        stopped: false,
        reason: 'not_started',
      }
    }

    const result = controller.stop?.() || {
      stopped: false,
      reason: 'controller_unavailable',
    }
    controller = null
    return result
  }

  const start = ({ runImmediately = false } = {}) => {
    stop()

    const blockReason = resolveForegroundSessionTickBlockReason({
      simulationStore,
      systemStore,
      route,
      documentRef,
    })
    if (blockReason) {
      return {
        started: false,
        reason: blockReason,
      }
    }

    controller = createController({
      simulationStore,
      foodDeliveryStore,
      intervalMs: normalizeForegroundSessionTickIntervalMs(
        simulationStore?.settings?.foregroundSessionTickIntervalMs,
      ),
      seed: 'foreground-session',
      now,
      onResult: (result) => {
        if (typeof writeReport !== 'function') return
        writeReport(createForegroundSessionTickReport(result, { createdAt: now() }))
      },
    })

    const result = controller.start?.({ runImmediately: runImmediately === true }) || {
      started: false,
      reason: 'controller_unavailable',
    }
    if (!result.started) {
      controller = null
    }
    return result
  }

  const restart = (options = {}) => start(options)
  const handleVisibilityChange = () => restart()

  const getState = () => {
    const controllerState = controller?.getState?.() || null
    return {
      running: controllerState?.running === true,
      controllerState,
    }
  }

  return {
    start,
    restart,
    stop,
    handleVisibilityChange,
    getState,
  }
}
