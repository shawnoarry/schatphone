import { SIMULATION_SURPRISE_MODE, SIMULATION_TRIGGER_SOURCE } from '../../stores/simulation'
import { createSeededRandom, normalizeRandomValue } from './random'
import {
  FOOD_DELIVERY_EVENT_MODULE_KEY,
  FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
  runFoodDeliveryRandomOrderEventPilot,
} from './adapters/food-delivery-events'
import { CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID } from '../chat-social-runtime-source'

export const SIMULATION_EVENT_TICK_ID = 'simulation.session_tick.v1'

export const SIMULATION_TICK_REASON = Object.freeze({
  SURPRISE_MODE_OFF: 'surprise_mode_off',
  MODULE_DISABLED: 'module_events_disabled',
  TICK_COOLDOWN_ACTIVE: 'tick_cooldown_active',
  TICK_DAILY_LIMIT_REACHED: 'tick_daily_limit_reached',
  NO_PILOTS: 'no_pilots',
  NO_EVENT_TRIGGERED: 'no_event_triggered',
})

const DEFAULT_TICK_COOLDOWN_MS = 5 * 60 * 1000
const DEFAULT_TICK_DAILY_LIMIT = 12

const normalizeText = (value, fallback = '', max = 160) => {
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

const normalizePositiveMs = (value, fallback = DEFAULT_TICK_COOLDOWN_MS) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(num)
}

const normalizePositiveLimit = (value, fallback = DEFAULT_TICK_DAILY_LIMIT) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(num)
}

const createDayKey = (at = Date.now()) => {
  const date = new Date(normalizeTimestamp(at))
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

const getStoreSurpriseMode = (simulationStore) => {
  const rawMode = simulationStore?.surpriseMode
  return typeof rawMode === 'object' && rawMode !== null && 'value' in rawMode
    ? rawMode.value
    : rawMode
}

export const resolveTickRandomValue = ({ randomValue, seed, now = Date.now() } = {}) => {
  if (randomValue !== undefined) return normalizeRandomValue(randomValue)
  const normalizedSeed = normalizeText(seed, `${SIMULATION_EVENT_TICK_ID}:${normalizeTimestamp(now)}`, 220)
  return normalizeRandomValue(createSeededRandom(`${normalizedSeed}:${normalizeTimestamp(now)}`)())
}

const createTickLog = ({
  simulationStore,
  moduleKey = 'simulation',
  status = 'skipped',
  reason = '',
  now = Date.now(),
} = {}) => {
  const logInput = {
    eventId: SIMULATION_EVENT_TICK_ID,
    moduleKey,
    targetId: 'global',
    adapterKey: 'simulation.event_tick_runner',
    triggerSource: SIMULATION_TRIGGER_SOURCE.SCHEDULED,
    status,
    reason,
    at: now,
  }
  return simulationStore?.recordEventLog?.(logInput) || logInput
}

const recordTickTrigger = ({
  simulationStore,
  moduleKey = 'simulation',
  reason = 'tick_executed',
  now = Date.now(),
  cooldownMs = DEFAULT_TICK_COOLDOWN_MS,
  dailyLimit = DEFAULT_TICK_DAILY_LIMIT,
} = {}) =>
  simulationStore?.recordEventTrigger?.({
    eventId: SIMULATION_EVENT_TICK_ID,
    moduleKey,
    targetId: 'global',
    adapterKey: 'simulation.event_tick_runner',
    triggerSource: SIMULATION_TRIGGER_SOURCE.SCHEDULED,
    status: 'triggered',
    reason,
    at: now,
    cooldownMs,
    dailyLimit,
  }) ||
  createTickLog({
    simulationStore,
    moduleKey,
    status: 'triggered',
    reason,
    now,
  })

const buildSkippedTickResult = ({ reason, log, pilots = [] } = {}) => ({
  ok: false,
  status: 'skipped',
  reason,
  log,
  pilotResults: pilots,
})

export const canRunSimulationEventTick = ({
  simulationStore,
  moduleKey = 'simulation',
  now = Date.now(),
  cooldownMs = DEFAULT_TICK_COOLDOWN_MS,
  dailyLimit = DEFAULT_TICK_DAILY_LIMIT,
} = {}) => {
  const surpriseMode = getStoreSurpriseMode(simulationStore) || SIMULATION_SURPRISE_MODE.LOW
  if (surpriseMode === SIMULATION_SURPRISE_MODE.OFF) {
    return {
      ok: false,
      reason: SIMULATION_TICK_REASON.SURPRISE_MODE_OFF,
      surpriseMode,
    }
  }

  const normalizedModuleKey = normalizeText(moduleKey, 'simulation', 80)
  if (simulationStore?.isModuleEventsEnabled?.(normalizedModuleKey) === false) {
    return {
      ok: false,
      reason: SIMULATION_TICK_REASON.MODULE_DISABLED,
      surpriseMode,
      moduleKey: normalizedModuleKey,
    }
  }

  if (simulationStore?.isCoolingDown?.(SIMULATION_EVENT_TICK_ID, { targetId: 'global', at: now })) {
    return {
      ok: false,
      reason: SIMULATION_TICK_REASON.TICK_COOLDOWN_ACTIVE,
      surpriseMode,
      moduleKey: normalizedModuleKey,
    }
  }

  if (
    simulationStore?.canUseDailyQuota &&
    !simulationStore.canUseDailyQuota(SIMULATION_EVENT_TICK_ID, {
      targetId: 'global',
      dayKey: createDayKey(now),
      limit: normalizePositiveLimit(dailyLimit),
    })
  ) {
    return {
      ok: false,
      reason: SIMULATION_TICK_REASON.TICK_DAILY_LIMIT_REACHED,
      surpriseMode,
      moduleKey: normalizedModuleKey,
    }
  }

  return {
    ok: true,
    reason: 'eligible',
    surpriseMode,
    moduleKey: normalizedModuleKey,
    cooldownMs: normalizePositiveMs(cooldownMs),
    dailyLimit: normalizePositiveLimit(dailyLimit),
  }
}

export const runSimulationEventTick = ({
  simulationStore,
  foodDeliveryStore,
  now = Date.now(),
  randomValue,
  seed,
  worldContext,
  variantPack,
  cooldownMs = DEFAULT_TICK_COOLDOWN_MS,
  dailyLimit = DEFAULT_TICK_DAILY_LIMIT,
  enabledPilots = ['food_delivery.random_order_pilot', CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID],
  chatStore,
} = {}) => {
  const eligibility = canRunSimulationEventTick({
    simulationStore,
    moduleKey: 'simulation',
    now,
    cooldownMs,
    dailyLimit,
  })
  if (!eligibility.ok) {
    return buildSkippedTickResult({
      reason: eligibility.reason,
      log: createTickLog({
        simulationStore,
        status: 'skipped',
        reason: eligibility.reason,
        now,
      }),
    })
  }

  const pilots = Array.isArray(enabledPilots) ? enabledPilots : []
  const foodDeliveryPilotEnabled = pilots.includes('food_delivery.random_order_pilot')
  const chatSocialPilotEnabled = pilots.includes(CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID)
  if (!foodDeliveryPilotEnabled && !chatSocialPilotEnabled) {
    return buildSkippedTickResult({
      reason: SIMULATION_TICK_REASON.NO_PILOTS,
      log: createTickLog({
        simulationStore,
        status: 'skipped',
        reason: SIMULATION_TICK_REASON.NO_PILOTS,
        now,
      }),
    })
  }

  const pilotResults = []

  if (foodDeliveryPilotEnabled) {
    const pilotRandomValue = resolveTickRandomValue({
      randomValue,
      seed,
      now,
    })
    const pilotResult = runFoodDeliveryRandomOrderEventPilot({
      foodDeliveryStore,
      simulationStore,
      triggerSource: SIMULATION_TRIGGER_SOURCE.RANDOM,
      randomValue: pilotRandomValue,
      seed,
      now,
      worldContext,
      variantPack,
    })
    pilotResults.push(pilotResult)

    if (pilotResult?.ok) {
      const log = recordTickTrigger({
        simulationStore,
        moduleKey: FOOD_DELIVERY_EVENT_MODULE_KEY,
        reason: FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
        now,
        cooldownMs: eligibility.cooldownMs,
        dailyLimit: eligibility.dailyLimit,
      })
      return {
        ok: true,
        status: 'triggered',
        reason: FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
        log,
        pilotResults,
        triggeredPilot: pilotResult,
      }
    }
  }

  if (chatSocialPilotEnabled) {
    const pilotResult =
      typeof simulationStore?.runChatSocialRuntimeProposal === 'function'
        ? simulationStore.runChatSocialRuntimeProposal({ chatStore, at: now })
        : {
            ok: false,
            status: 'skipped',
            reason: 'chat_social_runtime_unavailable',
            pilotEventId: CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
          }
    pilotResults.push(pilotResult)

    if (pilotResult?.ok) {
      const log = recordTickTrigger({
        simulationStore,
        moduleKey: 'chat',
        reason: CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
        now,
        cooldownMs: eligibility.cooldownMs,
        dailyLimit: eligibility.dailyLimit,
      })
      return {
        ok: true,
        status: 'triggered',
        reason: CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
        log,
        pilotResults,
        triggeredPilot: pilotResult,
      }
    }
  }

  const firstResult = pilotResults.find((item) => item?.reason || item?.log?.reason)
  const reason = firstResult?.reason || firstResult?.log?.reason || SIMULATION_TICK_REASON.NO_EVENT_TRIGGERED
  return buildSkippedTickResult({
    reason,
    log: createTickLog({
      simulationStore,
      moduleKey: foodDeliveryPilotEnabled ? FOOD_DELIVERY_EVENT_MODULE_KEY : 'chat',
      status: 'skipped',
      reason,
      now,
    }),
    pilots: pilotResults,
  })
}
