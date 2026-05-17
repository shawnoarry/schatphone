import { runSimulationEventTick } from './event-tick-runner'

export const SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS = 10 * 60 * 1000
export const SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS = 60 * 1000

const normalizePositiveMs = (value, fallback) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(num)
}

const normalizeSeed = (value, fallback = 'foreground-session') => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, '-')
  return normalized || fallback
}

export const createForegroundSessionTickController = ({
  simulationStore,
  foodDeliveryStore,
  intervalMs = SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS,
  seed = 'foreground-session',
  setTimer = globalThis.setInterval?.bind(globalThis),
  clearTimer = globalThis.clearInterval?.bind(globalThis),
  now = () => Date.now(),
  runTick = runSimulationEventTick,
  onResult,
} = {}) => {
  const resolvedIntervalMs = Math.max(
    SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
    normalizePositiveMs(intervalMs, SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS),
  )
  const resolvedSeed = normalizeSeed(seed)
  let timerId = null
  let running = false
  let lastResult = null
  let lastRunAt = 0

  const execute = () => {
    const runAt = Number(now())
    const safeRunAt = Number.isFinite(runAt) && runAt >= 0 ? Math.floor(runAt) : Date.now()
    const result = runTick({
      simulationStore,
      foodDeliveryStore,
      now: safeRunAt,
      seed: `${resolvedSeed}:${safeRunAt}`,
    })
    lastResult = result
    lastRunAt = safeRunAt
    if (typeof onResult === 'function') {
      onResult(result)
    }
    return result
  }

  const start = ({ runImmediately = false } = {}) => {
    if (running) {
      return {
        started: false,
        reason: 'already_running',
        intervalMs: resolvedIntervalMs,
      }
    }
    if (typeof setTimer !== 'function') {
      return {
        started: false,
        reason: 'timer_unavailable',
        intervalMs: resolvedIntervalMs,
      }
    }
    if (runImmediately) {
      execute()
    }
    timerId = setTimer(execute, resolvedIntervalMs)
    running = true
    return {
      started: true,
      reason: 'started',
      intervalMs: resolvedIntervalMs,
    }
  }

  const stop = () => {
    if (!running) {
      return {
        stopped: false,
        reason: 'not_running',
      }
    }
    if (timerId !== null && typeof clearTimer === 'function') {
      clearTimer(timerId)
    }
    timerId = null
    running = false
    return {
      stopped: true,
      reason: 'stopped',
    }
  }

  const getState = () => ({
    running,
    intervalMs: resolvedIntervalMs,
    lastRunAt,
    lastResult,
  })

  return {
    start,
    stop,
    execute,
    getState,
  }
}
