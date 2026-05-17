import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'

const SIMULATION_STORAGE_KEY = 'store:simulation'
const SIMULATION_STORAGE_VERSION = 1
const SIMULATION_EVENT_LOG_LIMIT = 240
const SIMULATION_LEDGER_LIMIT = 240

export const SIMULATION_SURPRISE_MODE = Object.freeze({
  OFF: 'off',
  LOW: 'low',
  BALANCED: 'balanced',
  HIGH: 'high',
})

export const SIMULATION_TRIGGER_SOURCE = Object.freeze({
  MANUAL: 'manual',
  CONDITION: 'condition',
  RANDOM: 'random',
  SCHEDULED: 'scheduled',
  AI_ASSISTED: 'ai_assisted',
  SYSTEM: 'system',
})

export const SIMULATION_EVENT_STATUS = Object.freeze({
  TRIGGERED: 'triggered',
  SKIPPED: 'skipped',
  FAILED: 'failed',
})

const SURPRISE_MODE_VALUES = new Set(Object.values(SIMULATION_SURPRISE_MODE))
const TRIGGER_SOURCE_VALUES = new Set(Object.values(SIMULATION_TRIGGER_SOURCE))
const EVENT_STATUS_VALUES = new Set(Object.values(SIMULATION_EVENT_STATUS))
const DEFAULT_SIMULATION_SETTINGS = Object.freeze({
  surpriseMode: SIMULATION_SURPRISE_MODE.LOW,
  enabledModules: Object.freeze({}),
})

let eventLogSequence = 0

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

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

const normalizePositiveMs = (value, fallback = 0) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(num)
}

const normalizePositiveLimit = (value, fallback = 0) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(num)
}

const normalizeSurpriseMode = (value, fallback = SIMULATION_SURPRISE_MODE.LOW) => {
  const normalized = normalizeText(value, fallback, 40)
  return SURPRISE_MODE_VALUES.has(normalized) ? normalized : fallback
}

const normalizeTriggerSource = (value, fallback = SIMULATION_TRIGGER_SOURCE.MANUAL) => {
  const normalized = normalizeText(value, fallback, 40)
  return TRIGGER_SOURCE_VALUES.has(normalized) ? normalized : fallback
}

const normalizeEventStatus = (value, fallback = SIMULATION_EVENT_STATUS.TRIGGERED) => {
  const normalized = normalizeText(value, fallback, 40)
  return EVENT_STATUS_VALUES.has(normalized) ? normalized : fallback
}

const normalizeModuleKey = (value, fallback = 'simulation') =>
  normalizeText(value, fallback, 80)

const normalizeTextList = (rawItems, maxItems = 16, maxLength = 160) => {
  if (!Array.isArray(rawItems)) return []
  const output = []
  rawItems.forEach((item) => {
    const normalized = normalizeText(item, '', maxLength)
    if (!normalized || output.includes(normalized)) return
    output.push(normalized)
  })
  return output.slice(0, maxItems)
}

const createDayKey = (at = Date.now()) => {
  const date = new Date(normalizeTimestamp(at))
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
}

const createScopedKey = (eventId, targetId = '') => {
  const normalizedEventId = normalizeText(eventId, '', 160)
  if (!normalizedEventId) return ''
  const normalizedTargetId = normalizeText(targetId, 'global', 160)
  return `${normalizedEventId}::${normalizedTargetId || 'global'}`
}

const createCounterKey = (eventId, targetId = '', dayKey = createDayKey()) => {
  const scopedKey = createScopedKey(eventId, targetId)
  if (!scopedKey) return ''
  return `${scopedKey}::${normalizeText(dayKey, createDayKey(), 20)}`
}

const createEventLogId = (eventId = '') => {
  eventLogSequence += 1
  const normalizedEventId = normalizeText(eventId, 'event', 80).replace(/[^a-zA-Z0-9_.-]/g, '_')
  return `simulation_event_${Date.now()}_${eventLogSequence}_${normalizedEventId}`
}

const normalizeEnabledModules = (rawModules) => {
  if (!rawModules || typeof rawModules !== 'object' || Array.isArray(rawModules)) return {}
  return Object.fromEntries(
    Object.entries(rawModules)
      .map(([key, enabled]) => [normalizeModuleKey(key, ''), enabled !== false])
      .filter(([key]) => Boolean(key)),
  )
}

const normalizeSimulationSettings = (rawSettings = {}) => {
  const source = rawSettings && typeof rawSettings === 'object' ? rawSettings : {}
  return {
    surpriseMode: normalizeSurpriseMode(source.surpriseMode),
    enabledModules: normalizeEnabledModules(source.enabledModules),
  }
}

const normalizeEventLog = (rawLog, index = 0) => {
  if (!rawLog || typeof rawLog !== 'object') return null

  const eventId = normalizeText(rawLog.eventId || rawLog.templateId, '', 160)
  if (!eventId) return null

  const at = normalizeTimestamp(rawLog.at || rawLog.createdAt || rawLog.updatedAt, Date.now() - index)

  return {
    id: normalizeText(rawLog.id, '', 180) || `simulation_event_legacy_${at}_${index}`,
    eventId,
    moduleKey: normalizeModuleKey(rawLog.moduleKey),
    targetId: normalizeText(rawLog.targetId, '', 160),
    adapterKey: normalizeText(rawLog.adapterKey, '', 160),
    triggerSource: normalizeTriggerSource(rawLog.triggerSource),
    status: normalizeEventStatus(rawLog.status),
    reason: normalizeText(rawLog.reason, '', 220),
    variantId: normalizeText(rawLog.variantId, '', 180),
    variantPackId: normalizeText(rawLog.variantPackId, '', 180),
    worldContextId: normalizeText(rawLog.worldContextId, '', 180),
    activeWorldBookIds: normalizeTextList(rawLog.activeWorldBookIds, 24, 160),
    at,
  }
}

const normalizeEventLogs = (rawLogs) => {
  if (!Array.isArray(rawLogs)) return []
  const seen = new Set()
  const normalized = []
  rawLogs.forEach((item, index) => {
    const log = normalizeEventLog(item, index)
    if (!log || seen.has(log.id)) return
    seen.add(log.id)
    normalized.push(log)
  })
  return normalized
    .sort((a, b) => b.at - a.at)
    .slice(0, SIMULATION_EVENT_LOG_LIMIT)
}

const normalizeCooldown = (rawCooldown, fallbackKey = '') => {
  if (!rawCooldown || typeof rawCooldown !== 'object') return null

  const eventId = normalizeText(rawCooldown.eventId, '', 160)
  if (!eventId) return null

  const targetId = normalizeText(rawCooldown.targetId, '', 160)
  const key = createScopedKey(eventId, targetId)
  if (!key) return null

  const lastTriggeredAt = normalizeTimestamp(rawCooldown.lastTriggeredAt || rawCooldown.updatedAt, 0)
  const cooldownMs = normalizePositiveMs(rawCooldown.cooldownMs)
  const expiresAt = normalizeTimestamp(rawCooldown.expiresAt, lastTriggeredAt + cooldownMs)

  return {
    key: normalizeText(rawCooldown.key, key, 360) || fallbackKey || key,
    eventId,
    targetId,
    lastTriggeredAt,
    cooldownMs,
    expiresAt,
    updatedAt: normalizeTimestamp(rawCooldown.updatedAt, lastTriggeredAt),
  }
}

const normalizeCooldowns = (rawCooldowns) => {
  const entries = Array.isArray(rawCooldowns)
    ? rawCooldowns.map((item) => [item?.key, item])
    : rawCooldowns && typeof rawCooldowns === 'object'
      ? Object.entries(rawCooldowns)
      : []

  return Object.fromEntries(
    entries
      .map(([key, item]) => normalizeCooldown(item, key))
      .filter(Boolean)
      .slice(0, SIMULATION_LEDGER_LIMIT)
      .map((item) => [item.key, item]),
  )
}

const normalizeDailyCounter = (rawCounter, fallbackKey = '') => {
  if (!rawCounter || typeof rawCounter !== 'object') return null

  const eventId = normalizeText(rawCounter.eventId, '', 160)
  if (!eventId) return null

  const targetId = normalizeText(rawCounter.targetId, '', 160)
  const dayKey = normalizeText(rawCounter.dayKey, createDayKey(rawCounter.updatedAt), 20)
  const key = createCounterKey(eventId, targetId, dayKey)
  if (!key) return null

  return {
    key: normalizeText(rawCounter.key, key, 380) || fallbackKey || key,
    eventId,
    targetId,
    dayKey,
    count: Math.max(0, toInt(rawCounter.count, 0)),
    limit: normalizePositiveLimit(rawCounter.limit),
    updatedAt: normalizeTimestamp(rawCounter.updatedAt, 0),
  }
}

const normalizeDailyCounters = (rawCounters) => {
  const entries = Array.isArray(rawCounters)
    ? rawCounters.map((item) => [item?.key, item])
    : rawCounters && typeof rawCounters === 'object'
      ? Object.entries(rawCounters)
      : []

  return Object.fromEntries(
    entries
      .map(([key, item]) => normalizeDailyCounter(item, key))
      .filter(Boolean)
      .slice(0, SIMULATION_LEDGER_LIMIT)
      .map((item) => [item.key, item]),
  )
}

export const useSimulationStore = defineStore('simulation', () => {
  const eventLogs = ref([])
  const cooldownsByEvent = ref({})
  const dailyCounters = ref({})
  const settings = ref(normalizeSimulationSettings(DEFAULT_SIMULATION_SETTINGS))
  const hasFinishedStorageHydration = ref(false)

  const eventLogCount = computed(() => eventLogs.value.length)
  const recentEventLogs = computed(() => eventLogs.value.slice(0, 24))
  const activeCooldownCount = computed(() => {
    const now = Date.now()
    return Object.values(cooldownsByEvent.value).filter((item) => item.expiresAt > now).length
  })
  const surpriseMode = computed(() => settings.value.surpriseMode)

  const isModuleEventsEnabled = (moduleKey) => {
    const normalizedModuleKey = normalizeModuleKey(moduleKey, '')
    if (!normalizedModuleKey) return false
    return settings.value.enabledModules[normalizedModuleKey] !== false
  }

  const setModuleEventsEnabled = (moduleKey, enabled = true) => {
    const normalizedModuleKey = normalizeModuleKey(moduleKey, '')
    if (!normalizedModuleKey) return false
    settings.value = {
      ...settings.value,
      enabledModules: {
        ...settings.value.enabledModules,
        [normalizedModuleKey]: enabled !== false,
      },
    }
    return true
  }

  const setSurpriseMode = (mode) => {
    const nextMode = normalizeSurpriseMode(mode)
    settings.value = {
      ...settings.value,
      surpriseMode: nextMode,
    }
    return nextMode
  }

  const recordEventLog = (input = {}) => {
    const log = normalizeEventLog(
      {
        ...input,
        id: input.id || createEventLogId(input.eventId || input.templateId),
        at: input.at || Date.now(),
      },
      0,
    )
    if (!log) return null
    eventLogs.value = [log, ...eventLogs.value.filter((item) => item.id !== log.id)].slice(
      0,
      SIMULATION_EVENT_LOG_LIMIT,
    )
    return log
  }

  const markCooldown = ({ eventId, targetId = '', cooldownMs = 0, at = Date.now() } = {}) => {
    const key = createScopedKey(eventId, targetId)
    const normalizedCooldownMs = normalizePositiveMs(cooldownMs)
    if (!key || normalizedCooldownMs <= 0) return null
    const lastTriggeredAt = normalizeTimestamp(at)
    const cooldown = {
      key,
      eventId: normalizeText(eventId, '', 160),
      targetId: normalizeText(targetId, '', 160),
      lastTriggeredAt,
      cooldownMs: normalizedCooldownMs,
      expiresAt: lastTriggeredAt + normalizedCooldownMs,
      updatedAt: lastTriggeredAt,
    }
    cooldownsByEvent.value = {
      ...cooldownsByEvent.value,
      [key]: cooldown,
    }
    return cooldown
  }

  const getCooldownState = (eventId, { targetId = '', at = Date.now() } = {}) => {
    const key = createScopedKey(eventId, targetId)
    const cooldown = key ? cooldownsByEvent.value[key] : null
    if (!cooldown) {
      return {
        key,
        active: false,
        remainingMs: 0,
        expiresAt: 0,
        lastTriggeredAt: 0,
      }
    }
    const now = normalizeTimestamp(at)
    const remainingMs = Math.max(0, cooldown.expiresAt - now)
    return {
      key,
      active: remainingMs > 0,
      remainingMs,
      expiresAt: cooldown.expiresAt,
      lastTriggeredAt: cooldown.lastTriggeredAt,
    }
  }

  const isCoolingDown = (eventId, options = {}) =>
    getCooldownState(eventId, options).active

  const incrementDailyCounter = ({
    eventId,
    targetId = '',
    dayKey = createDayKey(),
    limit = 0,
    at = Date.now(),
  } = {}) => {
    const key = createCounterKey(eventId, targetId, dayKey)
    if (!key) return null
    const existing = dailyCounters.value[key]
    const normalizedLimit = normalizePositiveLimit(limit, existing?.limit || 0)
    const counter = {
      key,
      eventId: normalizeText(eventId, '', 160),
      targetId: normalizeText(targetId, '', 160),
      dayKey: normalizeText(dayKey, createDayKey(at), 20),
      count: Math.max(0, toInt(existing?.count, 0)) + 1,
      limit: normalizedLimit,
      updatedAt: normalizeTimestamp(at),
    }
    dailyCounters.value = {
      ...dailyCounters.value,
      [key]: counter,
    }
    return counter
  }

  const getDailyCounterState = (eventId, {
    targetId = '',
    dayKey = createDayKey(),
    limit = 0,
  } = {}) => {
    const key = createCounterKey(eventId, targetId, dayKey)
    const counter = key ? dailyCounters.value[key] : null
    const normalizedLimit = normalizePositiveLimit(limit, counter?.limit || 0)
    const count = Math.max(0, toInt(counter?.count, 0))
    return {
      key,
      count,
      limit: normalizedLimit,
      remaining: normalizedLimit > 0 ? Math.max(0, normalizedLimit - count) : Infinity,
      reached: normalizedLimit > 0 ? count >= normalizedLimit : false,
    }
  }

  const canUseDailyQuota = (eventId, options = {}) =>
    !getDailyCounterState(eventId, options).reached

  const recordEventTrigger = ({
    cooldownMs = 0,
    dailyLimit = 0,
    ...eventInput
  } = {}) => {
    const log = recordEventLog(eventInput)
    if (!log) return null
    if (log.status === SIMULATION_EVENT_STATUS.TRIGGERED) {
      markCooldown({
        eventId: log.eventId,
        targetId: log.targetId,
        cooldownMs,
        at: log.at,
      })
      if (normalizePositiveLimit(dailyLimit) > 0) {
        incrementDailyCounter({
          eventId: log.eventId,
          targetId: log.targetId,
          dayKey: createDayKey(log.at),
          limit: dailyLimit,
          at: log.at,
        })
      }
    }
    return log
  }

  const clearEventLogs = () => {
    eventLogs.value = []
  }

  const applyPersistedSource = (source) => {
    const rawSource =
      source && typeof source.simulation === 'object' && source.simulation
        ? source.simulation
        : source
    if (!rawSource || typeof rawSource !== 'object') return false

    eventLogs.value = normalizeEventLogs(rawSource.eventLogs)
    cooldownsByEvent.value = normalizeCooldowns(rawSource.cooldownsByEvent || rawSource.cooldowns)
    dailyCounters.value = normalizeDailyCounters(rawSource.dailyCounters)
    settings.value = normalizeSimulationSettings(rawSource.settings)
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(SIMULATION_STORAGE_KEY, {
      version: SIMULATION_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(SIMULATION_STORAGE_KEY, {
      version: SIMULATION_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    eventLogs: eventLogs.value.map((item) => ({ ...item })),
    cooldownsByEvent: Object.fromEntries(
      Object.entries(cooldownsByEvent.value).map(([key, item]) => [key, { ...item }]),
    ),
    dailyCounters: Object.fromEntries(
      Object.entries(dailyCounters.value).map(([key, item]) => [key, { ...item }]),
    ),
    settings: {
      surpriseMode: settings.value.surpriseMode,
      enabledModules: { ...settings.value.enabledModules },
    },
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => applyPersistedSource(snapshot)

  const persistToStorage = () => {
    writePersistedState(SIMULATION_STORAGE_KEY, createBackupSnapshot(), {
      version: SIMULATION_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    eventLogs.value = []
    cooldownsByEvent.value = {}
    dailyCounters.value = {}
    settings.value = normalizeSimulationSettings(DEFAULT_SIMULATION_SETTINGS)
  }

  const hydratedFromLocal = hydrateFromStorage()

  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [eventLogs, cooldownsByEvent, dailyCounters, settings],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    eventLogs,
    cooldownsByEvent,
    dailyCounters,
    settings,
    eventLogCount,
    recentEventLogs,
    activeCooldownCount,
    surpriseMode,
    hasFinishedStorageHydration,
    isModuleEventsEnabled,
    setModuleEventsEnabled,
    setSurpriseMode,
    recordEventLog,
    recordEventTrigger,
    markCooldown,
    getCooldownState,
    isCoolingDown,
    incrementDailyCounter,
    getDailyCounterState,
    canUseDailyQuota,
    clearEventLogs,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
