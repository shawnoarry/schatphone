import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  CHAT_SOCIAL_EVENT_REVIEW_MODE,
  CHAT_SOCIAL_EVENT_STATUS,
  CHAT_SOCIAL_EVENT_TYPES,
  applyChatSocialEventToChatStore,
  buildChatSocialEventLogInput,
  evaluateChatSocialEventReview,
} from '../lib/chat-social-event-review'
import {
  CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
  CHAT_SOCIAL_RUNTIME_REASON,
  buildChatSocialRuntimeGreetingProposal,
} from '../lib/chat-social-runtime-source'
import {
  MAP_JOURNEY_EVENT_PROPOSAL_STATUS,
  buildMapJourneyEventReviewResult,
  normalizeMapJourneyEventProposal,
  normalizeMapJourneyEventProposals,
} from '../lib/simulation/adapters/map-journey-events'
import { evaluateRandomGate } from '../lib/simulation/random'
import {
  EVENT_INSTANCE_LIFECYCLE,
  EVENT_TEXT_MODE,
  EVENT_TEXT_STATUS,
  cloneEventValue,
  normalizeEventId,
  normalizeEventInstanceV1,
  normalizeEventInstancesV1,
} from '../lib/simulation/event-contracts'
import {
  createEventNotebookRefKey,
  normalizeEventNotebookRef,
  normalizeEventReviewNote,
  normalizeEventReviewNotes,
} from '../lib/simulation/event-notebook'
import {
  readPersistedState,
  readPersistedStateAsync,
  writePersistedState,
} from '../lib/persistence'

const SIMULATION_STORAGE_KEY = 'store:simulation'
const SIMULATION_STORAGE_VERSION = 4
const SIMULATION_EVENT_LOG_LIMIT = 240
const SIMULATION_LEDGER_LIMIT = 240
const SIMULATION_CHAT_SOCIAL_PROPOSAL_LIMIT = 120
const SIMULATION_MAP_JOURNEY_PROPOSAL_LIMIT = 120
export const SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS = 10 * 60 * 1000
export const SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS = 60 * 1000
export const SIMULATION_EVENT_TEXT_MODE = EVENT_TEXT_MODE

export const FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID =
  'food_delivery.delivery_address_change_escalation.v1'

export const FOOD_DELIVERY_CAUSAL_CHAIN_NODE = Object.freeze({
  RIDER_PICKUP: 'rider_pickup',
  ADDRESS_CONFIRMATION_REQUIRED: 'address_confirmation_required',
  ADDRESS_CHANGE_REQUESTED: 'address_change_requested',
  RIDER_RESPONSE_TIMEOUT: 'rider_response_timeout',
  CALL_STARTED: 'call_started',
  CALL_RESOLUTION_PROPOSED: 'call_resolution_proposed',
  ADDRESS_REVISION_COMMITTED: 'address_revision_committed',
  DELIVERY_REROUTED: 'delivery_rerouted',
  DELIVERY_COMPLETED: 'delivery_completed',
})

export const FOOD_DELIVERY_CAUSAL_CHAIN_STATUS = Object.freeze({
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  SKIPPED: 'skipped',
  FAILED: 'failed',
})

export const FOOD_DELIVERY_CAUSAL_CHAIN_COOLDOWN_MS = 30 * 60 * 1000
export const FOOD_DELIVERY_CAUSAL_CHAIN_DAILY_LIMIT = 1

const FOOD_DELIVERY_CAUSAL_CHAIN_TRANSITIONS = Object.freeze({
  [FOOD_DELIVERY_CAUSAL_CHAIN_NODE.RIDER_PICKUP]: new Set([
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_CONFIRMATION_REQUIRED,
  ]),
  [FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_CONFIRMATION_REQUIRED]: new Set([
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_CHANGE_REQUESTED,
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.RIDER_RESPONSE_TIMEOUT,
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED,
  ]),
  [FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_CHANGE_REQUESTED]: new Set([
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.RIDER_RESPONSE_TIMEOUT,
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.CALL_STARTED,
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED,
  ]),
  [FOOD_DELIVERY_CAUSAL_CHAIN_NODE.RIDER_RESPONSE_TIMEOUT]: new Set([
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.CALL_STARTED,
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED,
  ]),
  [FOOD_DELIVERY_CAUSAL_CHAIN_NODE.CALL_STARTED]: new Set([
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.CALL_RESOLUTION_PROPOSED,
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED,
  ]),
  [FOOD_DELIVERY_CAUSAL_CHAIN_NODE.CALL_RESOLUTION_PROPOSED]: new Set([
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_REVISION_COMMITTED,
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED,
  ]),
  [FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_REVISION_COMMITTED]: new Set([
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_REROUTED,
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED,
  ]),
  [FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_REROUTED]: new Set([
    FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED,
  ]),
  [FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED]: new Set(),
})

export const SIMULATION_SURPRISE_MODE = Object.freeze({
  OFF: 'off',
  LOW: 'low',
  BALANCED: 'balanced',
  HIGH: 'high',
})

const FOOD_DELIVERY_CAUSAL_CHAIN_PROBABILITY_BY_SURPRISE_MODE = Object.freeze({
  [SIMULATION_SURPRISE_MODE.OFF]: 0,
  [SIMULATION_SURPRISE_MODE.LOW]: 0.28,
  [SIMULATION_SURPRISE_MODE.BALANCED]: 0.55,
  [SIMULATION_SURPRISE_MODE.HIGH]: 0.82,
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
const EVENT_TEXT_MODE_VALUES = new Set(Object.values(EVENT_TEXT_MODE))
const DEFAULT_SIMULATION_SETTINGS = Object.freeze({
  surpriseMode: SIMULATION_SURPRISE_MODE.LOW,
  enabledModules: Object.freeze({}),
  foregroundSessionTickEnabled: false,
  foregroundSessionTickIntervalMs: SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS,
  eventTextMode: EVENT_TEXT_MODE.LOCAL_ONLY,
})
const CHAT_SOCIAL_RUNTIME_SUCCESS_STATUSES = new Set([
  CHAT_SOCIAL_EVENT_STATUS.APPLIED,
  CHAT_SOCIAL_EVENT_STATUS.READY_TO_APPLY,
  CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
])

let eventLogSequence = 0
let eventReviewNoteSequence = 0

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

const normalizeModuleKey = (value, fallback = 'simulation') => normalizeText(value, fallback, 80)

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

const FOOD_DELIVERY_CAUSAL_CHAIN_NODE_VALUES = new Set(
  Object.values(FOOD_DELIVERY_CAUSAL_CHAIN_NODE),
)
const FOOD_DELIVERY_CAUSAL_CHAIN_STATUS_VALUES = new Set(
  Object.values(FOOD_DELIVERY_CAUSAL_CHAIN_STATUS),
)

const normalizeFoodDeliveryCausalChainNode = (value, fallback = FOOD_DELIVERY_CAUSAL_CHAIN_NODE.RIDER_PICKUP) => {
  const normalized = normalizeText(value, fallback, 80)
  return FOOD_DELIVERY_CAUSAL_CHAIN_NODE_VALUES.has(normalized) ? normalized : fallback
}

const normalizeFoodDeliveryCausalChainStatus = (
  value,
  fallback = FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.ACTIVE,
) => {
  const normalized = normalizeText(value, fallback, 40)
  return FOOD_DELIVERY_CAUSAL_CHAIN_STATUS_VALUES.has(normalized) ? normalized : fallback
}

const normalizeFoodDeliveryCausalChain = (rawChain, index = 0) => {
  if (!rawChain || typeof rawChain !== 'object') return null
  const targetId = normalizeText(rawChain.targetId || rawChain.ownerRecords?.foodOrderId, '', 160)
  if (!targetId) return null
  const createdAt = normalizeTimestamp(rawChain.createdAt, Date.now() - index)
  const id = normalizeText(
    rawChain.id,
    `food_delivery_causal_chain_${targetId}`,
    220,
  )
  const ownerRecords = rawChain.ownerRecords && typeof rawChain.ownerRecords === 'object'
    ? rawChain.ownerRecords
    : {}
  const randomGate = rawChain.randomGate && typeof rawChain.randomGate === 'object'
    ? rawChain.randomGate
    : {}

  return {
    id,
    eventId: normalizeText(rawChain.eventId, FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID, 180),
    targetId,
    triggerSource: normalizeTriggerSource(rawChain.triggerSource, SIMULATION_TRIGGER_SOURCE.CONDITION),
    currentNode: normalizeFoodDeliveryCausalChainNode(rawChain.currentNode),
    status: normalizeFoodDeliveryCausalChainStatus(rawChain.status),
    randomSeed: normalizeText(rawChain.randomSeed, '', 180),
    randomGate: {
      probability: Math.min(1, Math.max(0, Number(randomGate.probability) || 0)),
      randomValue: Math.min(1, Math.max(0, Number(randomGate.randomValue) || 0)),
      randomSource: normalizeText(randomGate.randomSource, 'missing', 40),
      passed: randomGate.passed === true,
    },
    reason: normalizeText(rawChain.reason, '', 220),
    cooldownMs: normalizePositiveMs(rawChain.cooldownMs),
    dailyLimit: normalizePositiveLimit(rawChain.dailyLimit),
    canonicalMutation: 'none',
    ownerRecords: {
      foodOrderId: normalizeText(ownerRecords.foodOrderId, targetId, 160),
      walletTransactionId: normalizeText(ownerRecords.walletTransactionId, '', 180),
      mapJourneyId: normalizeText(ownerRecords.mapJourneyId, '', 180),
      conversationId: normalizeText(ownerRecords.conversationId, '', 180),
      phoneSessionId: normalizeText(ownerRecords.phoneSessionId, '', 180),
    },
    resultCodes: normalizeTextList(rawChain.resultCodes, 24, 120),
    createdAt,
    updatedAt: normalizeTimestamp(rawChain.updatedAt, createdAt),
  }
}

const normalizeFoodDeliveryCausalChains = (rawChains) => {
  if (!Array.isArray(rawChains)) return []
  const seen = new Set()
  return rawChains
    .map((item, index) => normalizeFoodDeliveryCausalChain(item, index))
    .filter((item) => {
      if (!item || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
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
    foregroundSessionTickEnabled: source.foregroundSessionTickEnabled === true,
    foregroundSessionTickIntervalMs: Math.max(
      SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
      normalizePositiveMs(
        source.foregroundSessionTickIntervalMs,
        SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS,
      ),
    ),
    eventTextMode: EVENT_TEXT_MODE_VALUES.has(source.eventTextMode)
      ? source.eventTextMode
      : EVENT_TEXT_MODE.LOCAL_ONLY,
  }
}

export const migrateSimulationStorage = ({ version, data } = {}) => {
  const storedVersion = Number(version)
  if (
    ![1, 2, 3].includes(storedVersion) ||
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    return null
  }
  return {
    ...data,
    eventInstances: storedVersion === 1 ? [] : data.eventInstances || [],
    eventReviewNotes: storedVersion >= 3 ? data.eventReviewNotes || [] : [],
    foodDeliveryCausalChains: data.foodDeliveryCausalChains || [],
    settings: {
      ...(data.settings && typeof data.settings === 'object' ? data.settings : {}),
      eventTextMode:
        storedVersion >= 3 && EVENT_TEXT_MODE_VALUES.has(data.settings?.eventTextMode)
          ? data.settings.eventTextMode
          : EVENT_TEXT_MODE.LOCAL_ONLY,
    },
  }
}

const normalizeEventLog = (rawLog, index = 0) => {
  if (!rawLog || typeof rawLog !== 'object') return null

  const eventId = normalizeText(rawLog.eventId || rawLog.templateId, '', 160)
  if (!eventId) return null

  const at = normalizeTimestamp(
    rawLog.at || rawLog.createdAt || rawLog.updatedAt,
    Date.now() - index,
  )

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
  return normalized.sort((a, b) => b.at - a.at).slice(0, SIMULATION_EVENT_LOG_LIMIT)
}

const createEventReviewNoteId = (eventRef, at = Date.now()) => {
  eventReviewNoteSequence += 1
  const refKey = createEventNotebookRefKey(eventRef).replace(/[^a-zA-Z0-9_.-]/g, '_')
  return `event_review_note_${normalizeTimestamp(at)}_${eventReviewNoteSequence}_${refKey}`.slice(
    0,
    220,
  )
}

const normalizeCooldown = (rawCooldown, fallbackKey = '') => {
  if (!rawCooldown || typeof rawCooldown !== 'object') return null

  const eventId = normalizeText(rawCooldown.eventId, '', 160)
  if (!eventId) return null

  const targetId = normalizeText(rawCooldown.targetId, '', 160)
  const key = createScopedKey(eventId, targetId)
  if (!key) return null

  const lastTriggeredAt = normalizeTimestamp(
    rawCooldown.lastTriggeredAt || rawCooldown.updatedAt,
    0,
  )
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

const normalizeChatSocialProposalSource = (rawSource = {}) => {
  const source = rawSource && typeof rawSource === 'object' ? rawSource : {}
  return {
    moduleKey: normalizeText(source.moduleKey, 'chat', 80),
    conversationId: Math.max(0, toInt(source.conversationId, 0)),
    messageId: normalizeText(source.messageId, '', 160),
    runtimeLogId: normalizeText(source.runtimeLogId, '', 180),
  }
}

const normalizeChatSocialRelationshipGate = (rawGate = null) => {
  if (!rawGate || typeof rawGate !== 'object') return null
  return {
    mode: normalizeText(rawGate.mode, '', 80),
    decision: normalizeText(rawGate.decision, '', 80),
    reason: normalizeText(rawGate.reason, '', 160),
    eventType: normalizeText(rawGate.eventType, '', 120),
    primaryRelationshipCategoryId: normalizeText(
      rawGate.primaryRelationshipCategoryId,
      'ordinary_acquaintance',
      120,
    ),
    relationshipModifierIds: normalizeTextList(rawGate.relationshipModifierIds, 12, 120),
    classificationConfidence: normalizeText(rawGate.classificationConfidence, '', 80),
    classificationSource: normalizeText(rawGate.classificationSource, '', 80),
    classificationUpdatedAt: normalizeTimestamp(rawGate.classificationUpdatedAt, 0),
    matched: Boolean(rawGate.matched),
  }
}

const normalizeChatSocialEventProposal = (rawProposal, index = 0) => {
  if (!rawProposal || typeof rawProposal !== 'object') return null
  const eventType = normalizeText(rawProposal.eventType, '', 120)
  if (!eventType) return null
  const createdAt = normalizeTimestamp(rawProposal.createdAt, Date.now() - index)
  const id =
    normalizeText(rawProposal.id, '', 180) ||
    `chat_social_event_${createdAt}_${index}_${eventType.replace(/[^a-zA-Z0-9_.-]/g, '_')}`

  return {
    id,
    eventType,
    eventId: normalizeText(rawProposal.eventId, `chat.social.${eventType}.v1`, 160),
    targetContactId: Math.max(0, toInt(rawProposal.targetContactId, 0)),
    targetProfileId: Math.max(0, toInt(rawProposal.targetProfileId, 0)),
    targetName: normalizeText(rawProposal.targetName, '', 120),
    currentChatSocialState: normalizeText(rawProposal.currentChatSocialState, '', 80),
    requestedChatSocialState: normalizeText(rawProposal.requestedChatSocialState, '', 80),
    triggerSource: normalizeTriggerSource(
      rawProposal.triggerSource,
      SIMULATION_TRIGGER_SOURCE.AI_ASSISTED,
    ),
    risk: normalizeText(rawProposal.risk, 'low', 40),
    reviewMode: normalizeText(rawProposal.reviewMode, CHAT_SOCIAL_EVENT_REVIEW_MODE.BLOCK, 80),
    status: normalizeText(rawProposal.status, CHAT_SOCIAL_EVENT_STATUS.BLOCKED, 80),
    reason: normalizeText(rawProposal.reason, '', 220),
    explanation: normalizeText(rawProposal.explanation, '', 300),
    relationshipGate: normalizeChatSocialRelationshipGate(rawProposal.relationshipGate),
    policySnapshot: {
      surpriseMode: normalizeSurpriseMode(rawProposal.policySnapshot?.surpriseMode),
      userAllowsGeneratedSocialEvents:
        rawProposal.policySnapshot?.userAllowsGeneratedSocialEvents !== false,
      moduleEventsEnabled: rawProposal.policySnapshot?.moduleEventsEnabled !== false,
      cooldownActive: rawProposal.policySnapshot?.cooldownActive === true,
      dailyLimitReached: rawProposal.policySnapshot?.dailyLimitReached === true,
    },
    source: normalizeChatSocialProposalSource(rawProposal.source),
    createdAt,
    reviewedAt: normalizeTimestamp(rawProposal.reviewedAt, 0),
    appliedAt: normalizeTimestamp(rawProposal.appliedAt, 0),
  }
}

const normalizeChatSocialEventProposals = (rawProposals) => {
  if (!Array.isArray(rawProposals)) return []
  const seen = new Set()
  return rawProposals
    .map((item, index) => normalizeChatSocialEventProposal(item, index))
    .filter((item) => {
      if (!item || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, SIMULATION_CHAT_SOCIAL_PROPOSAL_LIMIT)
}

const EVENT_INSTANCE_LIFECYCLE_TRANSITIONS = Object.freeze({
  [EVENT_INSTANCE_LIFECYCLE.ACTIVE]: new Set(Object.values(EVENT_INSTANCE_LIFECYCLE)),
  [EVENT_INSTANCE_LIFECYCLE.RESOLVED]: new Set([EVENT_INSTANCE_LIFECYCLE.RESOLVED]),
  [EVENT_INSTANCE_LIFECYCLE.DISMISSED]: new Set([EVENT_INSTANCE_LIFECYCLE.DISMISSED]),
  [EVENT_INSTANCE_LIFECYCLE.UNAVAILABLE]: new Set([EVENT_INSTANCE_LIFECYCLE.UNAVAILABLE]),
})

const EVENT_INSTANCE_TEXT_TRANSITIONS = Object.freeze({
  [EVENT_TEXT_STATUS.PENDING]: new Set(Object.values(EVENT_TEXT_STATUS)),
  [EVENT_TEXT_STATUS.LOCAL_ONLY]: new Set([EVENT_TEXT_STATUS.LOCAL_ONLY]),
  [EVENT_TEXT_STATUS.SUCCEEDED]: new Set([EVENT_TEXT_STATUS.SUCCEEDED]),
  [EVENT_TEXT_STATUS.FALLBACK]: new Set([EVENT_TEXT_STATUS.FALLBACK]),
})

const createEventInstanceImmutableFingerprint = (instance) =>
  JSON.stringify({
    templateRef: instance.templateRef,
    source: instance.source,
    world: instance.world,
    place: instance.place,
    presence: instance.presence,
    selection: instance.selection,
    runtime: {
      proposalId: instance.runtime.proposalId,
      eligibilityLogId: instance.runtime.eligibilityLogId,
    },
    text: {
      schemaVersion: instance.text.schemaVersion,
      cacheKey: instance.text.cacheKey,
      contextHash: instance.text.contextHash,
    },
    mediaIntent: instance.media.intent,
    allowedChoiceIds: instance.choices.allowedIds,
    adapterKey: instance.outcome.adapterKey,
    createdAt: instance.timestamps.createdAt,
    enteredAt: instance.timestamps.enteredAt,
  })

const canAdvanceEventInstance = (current, next) => {
  if (
    createEventInstanceImmutableFingerprint(current) !==
    createEventInstanceImmutableFingerprint(next)
  ) {
    return false
  }
  if (!EVENT_INSTANCE_LIFECYCLE_TRANSITIONS[current.lifecycle]?.has(next.lifecycle)) return false
  if (!EVENT_INSTANCE_TEXT_TRANSITIONS[current.text.status]?.has(next.text.status)) return false
  if (next.text.attemptCount < current.text.attemptCount) return false
  if (next.timestamps.updatedAt < current.timestamps.updatedAt) return false
  if (current.choices.selectedId && next.choices.selectedId !== current.choices.selectedId)
    return false
  if (current.choices.outcomeId && next.choices.outcomeId !== current.choices.outcomeId)
    return false
  return true
}

export const useSimulationStore = defineStore('simulation', () => {
  const eventLogs = ref([])
  const eventInstances = ref([])
  const eventInstanceRestoreReport = ref({ inputCount: 0, restoredCount: 0, rejected: [] })
  const eventReviewNotes = ref([])
  const cooldownsByEvent = ref({})
  const dailyCounters = ref({})
  const foodDeliveryCausalChains = ref([])
  const chatSocialEventProposals = ref([])
  const mapJourneyEventProposals = ref([])
  const settings = ref(normalizeSimulationSettings(DEFAULT_SIMULATION_SETTINGS))
  const hasFinishedStorageHydration = ref(false)

  const eventLogCount = computed(() => eventLogs.value.length)
  const eventInstanceCount = computed(() => eventInstances.value.length)
  const eventReviewNoteCount = computed(() => eventReviewNotes.value.length)
  const recentEventLogs = computed(() => eventLogs.value.slice(0, 24))
  const activeCooldownCount = computed(() => {
    const now = Date.now()
    return Object.values(cooldownsByEvent.value).filter((item) => item.expiresAt > now).length
  })
  const surpriseMode = computed(() => settings.value.surpriseMode)
  const eventTextMode = computed(() => settings.value.eventTextMode)
  const pendingChatSocialEventProposals = computed(() =>
    chatSocialEventProposals.value.filter(
      (item) => item.status === CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
    ),
  )
  const pendingChatSocialEventProposalCount = computed(
    () => pendingChatSocialEventProposals.value.length,
  )
  const pendingMapJourneyEventProposals = computed(() =>
    mapJourneyEventProposals.value.filter(
      (item) => item.status === MAP_JOURNEY_EVENT_PROPOSAL_STATUS.PENDING_REVIEW,
    ),
  )
  const pendingMapJourneyEventProposalCount = computed(
    () => pendingMapJourneyEventProposals.value.length,
  )

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

  const setEventTextMode = (mode) => {
    const nextMode = EVENT_TEXT_MODE_VALUES.has(mode) ? mode : EVENT_TEXT_MODE.LOCAL_ONLY
    settings.value = {
      ...settings.value,
      eventTextMode: nextMode,
    }
    return nextMode
  }

  const setForegroundSessionTickEnabled = (enabled = true) => {
    settings.value = {
      ...settings.value,
      foregroundSessionTickEnabled: enabled === true,
    }
    return settings.value.foregroundSessionTickEnabled
  }

  const setForegroundSessionTickIntervalMs = (intervalMs) => {
    const nextIntervalMs = Math.max(
      SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
      normalizePositiveMs(intervalMs, SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS),
    )
    settings.value = {
      ...settings.value,
      foregroundSessionTickIntervalMs: nextIntervalMs,
    }
    return nextIntervalMs
  }

  const getEventInstance = (instanceId) => {
    const normalizedId = normalizeEventId(instanceId, 220)
    return eventInstances.value.find((item) => item.id === normalizedId) || null
  }

  const upsertEventInstance = (rawInstance) => {
    const instance = normalizeEventInstanceV1(rawInstance)
    if (!instance) return null
    const current = eventInstances.value.find((item) => item.id === instance.id)
    if (current && !canAdvanceEventInstance(current, instance)) return null
    eventInstances.value = [
      instance,
      ...eventInstances.value.filter((item) => item.id !== instance.id),
    ]
    return instance
  }

  const upsertEventReviewNote = (rawNote = {}, { at = Date.now() } = {}) => {
    const requestedId = normalizeText(rawNote.id, '', 220)
    const existing = requestedId
      ? eventReviewNotes.value.find((note) => note.id === requestedId)
      : null
    const eventRef = existing?.eventRef || normalizeEventNotebookRef(rawNote.eventRef)
    if (!eventRef) return null
    if (
      existing &&
      rawNote.eventRef &&
      createEventNotebookRefKey(rawNote.eventRef) !== createEventNotebookRefKey(existing.eventRef)
    ) {
      return null
    }
    const normalizedAt = normalizeTimestamp(at)
    const note = normalizeEventReviewNote({
      id: existing?.id || requestedId || createEventReviewNoteId(eventRef, normalizedAt),
      eventRef,
      body: rawNote.body,
      createdAt: existing?.createdAt || normalizedAt,
      updatedAt: normalizedAt,
    })
    if (!note) return null
    eventReviewNotes.value = [
      note,
      ...eventReviewNotes.value.filter((item) => item.id !== note.id),
    ].sort((left, right) => right.updatedAt - left.updatedAt || left.id.localeCompare(right.id))
    return note
  }

  const deleteEventReviewNote = (noteId) => {
    const id = normalizeText(noteId, '', 220)
    if (!id || !eventReviewNotes.value.some((note) => note.id === id)) return false
    eventReviewNotes.value = eventReviewNotes.value.filter((note) => note.id !== id)
    return true
  }

  const listEventReviewNotesForRef = (rawRef) => {
    const refKey = createEventNotebookRefKey(rawRef)
    if (!refKey) return []
    return eventReviewNotes.value.filter(
      (note) => createEventNotebookRefKey(note.eventRef) === refKey,
    )
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

  const isCoolingDown = (eventId, options = {}) => getCooldownState(eventId, options).active

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

  const getDailyCounterState = (
    eventId,
    { targetId = '', dayKey = createDayKey(), limit = 0 } = {},
  ) => {
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
    cooldownTargetId = '',
    dailyTargetId = '',
    ...eventInput
  } = {}) => {
    const log = recordEventLog(eventInput)
    if (!log) return null
    if (log.status === SIMULATION_EVENT_STATUS.TRIGGERED) {
      markCooldown({
        eventId: log.eventId,
        targetId: normalizeText(cooldownTargetId, log.targetId, 160),
        cooldownMs,
        at: log.at,
      })
      if (normalizePositiveLimit(dailyLimit) > 0) {
        incrementDailyCounter({
          eventId: log.eventId,
          targetId: normalizeText(dailyTargetId, log.targetId, 160),
          dayKey: createDayKey(log.at),
          limit: dailyLimit,
          at: log.at,
        })
      }
    }
    return log
  }

  const upsertMapJourneyEventProposal = (proposal = {}) => {
    const normalized = normalizeMapJourneyEventProposal(proposal, 0)
    if (!normalized) return null
    mapJourneyEventProposals.value = [
      normalized,
      ...mapJourneyEventProposals.value.filter((item) => item.id !== normalized.id),
    ].slice(0, SIMULATION_MAP_JOURNEY_PROPOSAL_LIMIT)
    return normalized
  }

  const getMapJourneyEventProposal = (proposalId) => {
    const id = normalizeText(proposalId, '', 180)
    if (!id) return null
    return mapJourneyEventProposals.value.find((item) => item.id === id) || null
  }

  const reviewMapJourneyEventProposal = (proposalId, outcome, { at = Date.now() } = {}) =>
    buildMapJourneyEventReviewResult(getMapJourneyEventProposal(proposalId), outcome, at)

  const finalizeMapJourneyEventProposal = (
    proposalId,
    { outcome = '', applied = false, reason = '', at = Date.now() } = {},
  ) => {
    const existing = getMapJourneyEventProposal(proposalId)
    if (!existing || existing.status !== MAP_JOURNEY_EVENT_PROPOSAL_STATUS.PENDING_REVIEW) {
      return null
    }
    const review = buildMapJourneyEventReviewResult(existing, outcome, at)
    if (!review.ok) return null
    const normalizedAt = normalizeTimestamp(at)
    const nextProposal = upsertMapJourneyEventProposal({
      ...existing,
      status: applied
        ? MAP_JOURNEY_EVENT_PROPOSAL_STATUS.APPLIED
        : MAP_JOURNEY_EVENT_PROPOSAL_STATUS.FAILED,
      selectedOutcome: review.outcome,
      resolutionReason: normalizeText(
        reason,
        applied ? 'map_journey_outcome_applied' : 'map_journey_outcome_rejected',
        160,
      ),
      reviewedAt: normalizedAt,
      appliedAt: applied ? normalizedAt : 0,
    })
    recordEventLog({
      eventId: existing.eventId,
      moduleKey: existing.moduleKey,
      targetId: existing.journeyId,
      adapterKey: 'map.journey.apply_reviewed_outcome',
      triggerSource: SIMULATION_TRIGGER_SOURCE.MANUAL,
      status: applied ? SIMULATION_EVENT_STATUS.TRIGGERED : SIMULATION_EVENT_STATUS.FAILED,
      reason: nextProposal?.resolutionReason,
      variantId: existing.provenance?.variantId,
      variantPackId: existing.provenance?.variantPackId,
      worldContextId: existing.provenance?.worldContextId,
      activeWorldBookIds: existing.provenance?.activeWorldBookIds,
      at: normalizedAt,
    })
    return nextProposal
  }

  const dismissMapJourneyEventProposal = (
    proposalId,
    { reason = 'map_journey_source_closed', at = Date.now() } = {},
  ) => {
    const existing = getMapJourneyEventProposal(proposalId)
    if (!existing || existing.status !== MAP_JOURNEY_EVENT_PROPOSAL_STATUS.PENDING_REVIEW) {
      return null
    }
    const normalizedAt = normalizeTimestamp(at)
    const nextProposal = upsertMapJourneyEventProposal({
      ...existing,
      status: MAP_JOURNEY_EVENT_PROPOSAL_STATUS.DISMISSED,
      resolutionReason: normalizeText(reason, 'map_journey_source_closed', 160),
      reviewedAt: normalizedAt,
    })
    recordEventLog({
      eventId: existing.eventId,
      moduleKey: existing.moduleKey,
      targetId: existing.journeyId,
      adapterKey: 'map.journey.dismiss_interruption',
      triggerSource: SIMULATION_TRIGGER_SOURCE.SYSTEM,
      status: SIMULATION_EVENT_STATUS.SKIPPED,
      reason: nextProposal?.resolutionReason,
      variantId: existing.provenance?.variantId,
      variantPackId: existing.provenance?.variantPackId,
      worldContextId: existing.provenance?.worldContextId,
      activeWorldBookIds: existing.provenance?.activeWorldBookIds,
      at: normalizedAt,
    })
    return nextProposal
  }

  const upsertChatSocialEventProposal = (proposal = {}) => {
    const normalized = normalizeChatSocialEventProposal(proposal, 0)
    if (!normalized) return null
    chatSocialEventProposals.value = [
      normalized,
      ...chatSocialEventProposals.value.filter((item) => item.id !== normalized.id),
    ].slice(0, SIMULATION_CHAT_SOCIAL_PROPOSAL_LIMIT)
    return normalized
  }

  const submitChatSocialEventProposal = (
    input = {},
    { chatStore, registry = null, at = Date.now() } = {},
  ) => {
    const inputPolicy =
      input.policy && typeof input.policy === 'object' && !Array.isArray(input.policy)
        ? input.policy
        : {}
    const proposal = evaluateChatSocialEventReview({
      chatStore,
      contactId: input.contactId || input.targetContactId,
      eventType: input.eventType,
      triggerSource: input.triggerSource || SIMULATION_TRIGGER_SOURCE.AI_ASSISTED,
      policy: {
        ...inputPolicy,
        surpriseMode: settings.value.surpriseMode,
        userAllowsGeneratedSocialEvents: inputPolicy.userAllowsGeneratedSocialEvents !== false,
        moduleEventsEnabled: isModuleEventsEnabled('chat'),
      },
      registry,
      source: input.source,
      at,
      explanation: input.explanation,
    })
    const normalizedAt = normalizeTimestamp(at)
    const withId = {
      ...proposal,
      id:
        proposal.id ||
        `chat_social_event_${normalizedAt}_${chatSocialEventProposals.value.length + 1}_${proposal.eventType || 'unknown'}`,
    }

    let nextProposal = withId
    if (
      withId.eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST &&
      withId.status === CHAT_SOCIAL_EVENT_STATUS.READY_TO_APPLY &&
      withId.reviewMode === CHAT_SOCIAL_EVENT_REVIEW_MODE.AUTO_APPLY_WITH_AUDIT
    ) {
      const applied = applyChatSocialEventToChatStore({ chatStore, proposal: withId, at })
      nextProposal = {
        ...withId,
        status: applied ? CHAT_SOCIAL_EVENT_STATUS.APPLIED : CHAT_SOCIAL_EVENT_STATUS.FAILED,
        reason: applied ? withId.reason : 'chat_social_state_apply_failed',
        appliedAt: applied ? normalizedAt : 0,
      }
    }

    const stored = upsertChatSocialEventProposal(nextProposal)
    recordEventLog(buildChatSocialEventLogInput(stored || nextProposal))
    return stored
  }

  const runChatSocialRuntimeProposal = ({ chatStore, at = Date.now() } = {}) => {
    const candidate = buildChatSocialRuntimeGreetingProposal({ chatStore, at })
    if (!candidate) {
      return {
        ok: false,
        status: SIMULATION_EVENT_STATUS.SKIPPED,
        reason: CHAT_SOCIAL_RUNTIME_REASON.NO_CANDIDATE,
        pilotEventId: CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
        proposal: null,
      }
    }

    const cooldownActive = isCoolingDown(candidate.eventId, {
      targetId: candidate.targetId,
      at,
    })
    const dailyLimitReached = !canUseDailyQuota(candidate.eventId, {
      targetId: candidate.targetId,
      dayKey: createDayKey(at),
      limit: candidate.dailyLimit,
    })
    const proposal = submitChatSocialEventProposal(
      {
        contactId: candidate.contactId,
        eventType: candidate.eventType,
        triggerSource: SIMULATION_TRIGGER_SOURCE.RANDOM,
        explanation: candidate.explanation,
        source: candidate.source,
        policy: {
          cooldownActive,
          dailyLimitReached,
          runtimeLogId: candidate.pilotId,
        },
      },
      { chatStore, at },
    )
    const ok = CHAT_SOCIAL_RUNTIME_SUCCESS_STATUSES.has(proposal?.status)

    if (ok) {
      markCooldown({
        eventId: candidate.eventId,
        targetId: candidate.targetId,
        cooldownMs: candidate.cooldownMs,
        at,
      })
      incrementDailyCounter({
        eventId: candidate.eventId,
        targetId: candidate.targetId,
        dayKey: createDayKey(at),
        limit: candidate.dailyLimit,
        at,
      })
    }

    return {
      ok,
      status: ok ? SIMULATION_EVENT_STATUS.TRIGGERED : SIMULATION_EVENT_STATUS.SKIPPED,
      reason: proposal?.reason || (ok ? candidate.pilotId : 'chat_social_runtime_proposal_blocked'),
      pilotEventId: CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
      proposal,
    }
  }

  const approveChatSocialEventProposal = (proposalId, { chatStore, at = Date.now() } = {}) => {
    const id = normalizeText(proposalId, '', 180)
    const existing = chatSocialEventProposals.value.find((item) => item.id === id)
    if (!existing || existing.status !== CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW) return null

    const normalizedAt = normalizeTimestamp(at)
    const applied = applyChatSocialEventToChatStore({ chatStore, proposal: existing, at })
    const nextProposal = {
      ...existing,
      status: applied ? CHAT_SOCIAL_EVENT_STATUS.APPLIED : CHAT_SOCIAL_EVENT_STATUS.FAILED,
      reason: applied ? 'approved_by_world_hub' : 'chat_social_state_apply_failed',
      reviewedAt: normalizedAt,
      appliedAt: applied ? normalizedAt : 0,
    }
    const stored = upsertChatSocialEventProposal(nextProposal)
    recordEventLog(buildChatSocialEventLogInput(stored || nextProposal))
    return stored
  }

  const dismissChatSocialEventProposal = (proposalId, { at = Date.now() } = {}) => {
    const id = normalizeText(proposalId, '', 180)
    const existing = chatSocialEventProposals.value.find((item) => item.id === id)
    if (!existing || existing.status !== CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW) return null

    const nextProposal = {
      ...existing,
      status: CHAT_SOCIAL_EVENT_STATUS.DISMISSED,
      reason: 'dismissed_by_world_hub',
      reviewedAt: normalizeTimestamp(at),
    }
    const stored = upsertChatSocialEventProposal(nextProposal)
    recordEventLog(buildChatSocialEventLogInput(stored || nextProposal))
    return stored
  }

  const getFoodDeliveryCausalChain = (orderId = '') => {
    const normalizedOrderId = normalizeText(orderId, '', 160)
    if (!normalizedOrderId) return null
    return (
      foodDeliveryCausalChains.value.find(
        (chain) => chain.targetId === normalizedOrderId || chain.ownerRecords.foodOrderId === normalizedOrderId,
      ) || null
    )
  }

  const upsertFoodDeliveryCausalChain = (rawChain) => {
    const normalized = normalizeFoodDeliveryCausalChain(rawChain)
    if (!normalized) return null
    foodDeliveryCausalChains.value = [
      normalized,
      ...foodDeliveryCausalChains.value.filter((chain) => chain.id !== normalized.id),
    ]
    return normalized
  }

  const normalizeFoodDeliveryOwnerRecords = (rawRecords = {}, fallbackOrderId = '') => {
    const records = rawRecords && typeof rawRecords === 'object' ? rawRecords : {}
    return {
      foodOrderId: normalizeText(records.foodOrderId, fallbackOrderId, 160),
      walletTransactionId: normalizeText(records.walletTransactionId, '', 180),
      mapJourneyId: normalizeText(records.mapJourneyId, '', 180),
      conversationId: normalizeText(records.conversationId, '', 180),
      phoneSessionId: normalizeText(records.phoneSessionId, '', 180),
    }
  }

  const recordFoodDeliveryCausalCheckpoint = ({
    orderId = '',
    node = '',
    ownerRecords = {},
    reason = '',
    resultCode = '',
    at = Date.now(),
  } = {}) => {
    const existing = getFoodDeliveryCausalChain(orderId)
    if (!existing) return { ok: false, changed: false, reason: 'causal_chain_missing', chain: null }
    if (existing.status === FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.SKIPPED) {
      return { ok: true, changed: false, reason: 'no_event', chain: existing }
    }
    if (existing.status === FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.RESOLVED) {
      return { ok: true, changed: false, reason: 'already_resolved', chain: existing }
    }

    const nextNode = normalizeFoodDeliveryCausalChainNode(node, '')
    if (!nextNode || nextNode === existing.currentNode) {
      return { ok: true, changed: false, reason: 'checkpoint_already_recorded', chain: existing }
    }
    if (!FOOD_DELIVERY_CAUSAL_CHAIN_TRANSITIONS[existing.currentNode]?.has(nextNode)) {
      return { ok: false, changed: false, reason: 'checkpoint_out_of_order', chain: existing }
    }

    const normalizedAt = normalizeTimestamp(at)
    const normalizedOwnerRecords = normalizeFoodDeliveryOwnerRecords(ownerRecords, existing.targetId)
    const mergedOwnerRecords = Object.fromEntries(
      Object.entries({ ...existing.ownerRecords, ...normalizedOwnerRecords }).map(([key, value]) => [
        key,
        value || existing.ownerRecords[key] || '',
      ]),
    )
    const nextStatus = nextNode === FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED
      ? FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.RESOLVED
      : FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.ACTIVE
    const nextChain = upsertFoodDeliveryCausalChain({
      ...existing,
      currentNode: nextNode,
      status: nextStatus,
      ownerRecords: mergedOwnerRecords,
      reason: normalizeText(reason, existing.reason, 220),
      resultCodes: [
        ...existing.resultCodes,
        normalizeText(resultCode, nextNode, 120),
      ],
      updatedAt: normalizedAt,
    })
    if (!nextChain) return { ok: false, changed: false, reason: 'causal_chain_invalid', chain: existing }

    recordEventLog({
      id: `${existing.id}:${nextNode}`,
      eventId: existing.eventId,
      moduleKey: 'food_delivery',
      targetId: existing.targetId,
      adapterKey: 'food_delivery.causal_chain.checkpoint',
      triggerSource: SIMULATION_TRIGGER_SOURCE.SYSTEM,
      status: SIMULATION_EVENT_STATUS.TRIGGERED,
      reason: normalizeText(reason, nextNode, 220),
      at: normalizedAt,
    })
    return { ok: true, changed: true, reason: '', chain: nextChain }
  }

  const evaluateFoodDeliveryCausalChain = ({
    orderSnapshot = {},
    checkpoint = FOOD_DELIVERY_CAUSAL_CHAIN_NODE.RIDER_PICKUP,
    triggerSource = SIMULATION_TRIGGER_SOURCE.CONDITION,
    randomValue,
    randomSeed = '',
    at = Date.now(),
    cooldownMs = FOOD_DELIVERY_CAUSAL_CHAIN_COOLDOWN_MS,
    dailyLimit = FOOD_DELIVERY_CAUSAL_CHAIN_DAILY_LIMIT,
  } = {}) => {
    const order = orderSnapshot && typeof orderSnapshot === 'object' ? orderSnapshot : {}
    const orderId = normalizeText(order.id || order.orderId, '', 160)
    if (!orderId) return { ok: false, status: SIMULATION_EVENT_STATUS.SKIPPED, reason: 'order_missing', chain: null }

    const existing = getFoodDeliveryCausalChain(orderId)
    if (existing) {
      return {
        ok: existing.status === FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.ACTIVE,
        status: existing.status === FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.ACTIVE
          ? SIMULATION_EVENT_STATUS.TRIGGERED
          : SIMULATION_EVENT_STATUS.SKIPPED,
        reason: existing.status === FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.SKIPPED ? 'no_event' : 'chain_exists',
        chain: existing,
      }
    }

    const normalizedAt = normalizeTimestamp(at)
    const normalizedCheckpoint = normalizeFoodDeliveryCausalChainNode(checkpoint, '')
    const ownerRecords = normalizeFoodDeliveryOwnerRecords(
      {
        foodOrderId: orderId,
        walletTransactionId: order.walletTransactionId || order.paymentTransactionId || order.paymentRef?.transactionId,
        mapJourneyId: order.mapJourneyId || order.deliveryJourneyId,
        conversationId: order.conversationId,
      },
      orderId,
    )
    const createSkippedChain = (reason, randomGate = {}) => {
      const chain = upsertFoodDeliveryCausalChain({
        id: `food_delivery_causal_chain_${orderId}`,
        eventId: FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID,
        targetId: orderId,
        triggerSource,
        currentNode: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.RIDER_PICKUP,
        status: FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.SKIPPED,
        randomSeed,
        randomGate,
        reason,
        cooldownMs,
        dailyLimit,
        ownerRecords,
        resultCodes: [reason],
        createdAt: normalizedAt,
        updatedAt: normalizedAt,
      })
      const log = recordEventLog({
        id: `${chain?.id || `food_delivery_causal_chain_${orderId}`}:eligibility`,
        eventId: FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID,
        moduleKey: 'food_delivery',
        targetId: orderId,
        adapterKey: 'food_delivery.causal_chain',
        triggerSource,
        status: SIMULATION_EVENT_STATUS.SKIPPED,
        reason,
        at: normalizedAt,
      })
      return { ok: false, status: SIMULATION_EVENT_STATUS.SKIPPED, reason, chain, log }
    }

    if (normalizedCheckpoint !== FOOD_DELIVERY_CAUSAL_CHAIN_NODE.RIDER_PICKUP) {
      return createSkippedChain('checkpoint_not_eligible')
    }
    if (['delivered', 'cancelled'].includes(normalizeText(order.status, '', 40))) {
      return createSkippedChain('order_closed')
    }
    if (order.journeyPhase && !['rider_pickup', 'en_route'].includes(order.journeyPhase)) {
      return createSkippedChain('journey_not_at_pickup')
    }
    if (!isModuleEventsEnabled('food_delivery')) return createSkippedChain('module_disabled')
    if (surpriseMode.value === SIMULATION_SURPRISE_MODE.OFF) return createSkippedChain('surprise_mode_off')

    const cooldownActive = isCoolingDown(FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID, {
      targetId: orderId,
      at: normalizedAt,
    })
    if (cooldownActive) return createSkippedChain('cooldown_active')
    const dailyLimitReached = !canUseDailyQuota(FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID, {
      targetId: 'global',
      dayKey: createDayKey(normalizedAt),
      limit: dailyLimit,
    })
    if (dailyLimitReached) return createSkippedChain('daily_limit_reached')

    const probability = FOOD_DELIVERY_CAUSAL_CHAIN_PROBABILITY_BY_SURPRISE_MODE[surpriseMode.value] || 0
    const resolvedSeed = normalizeText(
      randomSeed,
      `${FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID}:${orderId}:${createDayKey(normalizedAt)}`,
      180,
    )
    const randomGate = evaluateRandomGate({ probability, randomValue, seed: resolvedSeed })
    if (!randomGate.passed) {
      return createSkippedChain(randomGate.reason, {
        probability: randomGate.probability,
        randomValue: randomGate.randomValue,
        randomSource: randomGate.randomSource,
        passed: false,
      })
    }

    const log = recordEventTrigger({
      eventId: FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID,
      moduleKey: 'food_delivery',
      targetId: orderId,
      adapterKey: 'food_delivery.causal_chain',
      triggerSource,
      status: SIMULATION_EVENT_STATUS.TRIGGERED,
      reason: 'rider_pickup_checkpoint',
      cooldownMs,
      dailyLimit,
      cooldownTargetId: orderId,
      dailyTargetId: 'global',
      at: normalizedAt,
    })
    const chain = upsertFoodDeliveryCausalChain({
      id: `food_delivery_causal_chain_${orderId}`,
      eventId: FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID,
      targetId: orderId,
      triggerSource,
      currentNode: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_CONFIRMATION_REQUIRED,
      status: FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.ACTIVE,
      randomSeed: resolvedSeed,
      randomGate: {
        probability: randomGate.probability,
        randomValue: randomGate.randomValue,
        randomSource: randomGate.randomSource,
        passed: true,
      },
      reason: 'rider_pickup_checkpoint',
      cooldownMs,
      dailyLimit,
      ownerRecords,
      resultCodes: [FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_CONFIRMATION_REQUIRED],
      createdAt: normalizedAt,
      updatedAt: normalizedAt,
    })
    return {
      ok: Boolean(chain),
      status: chain ? SIMULATION_EVENT_STATUS.TRIGGERED : SIMULATION_EVENT_STATUS.FAILED,
      reason: chain ? '' : 'causal_chain_invalid',
      chain,
      log,
    }
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
    const eventInstanceResult = normalizeEventInstancesV1(rawSource.eventInstances)
    eventInstances.value = eventInstanceResult.instances
    eventInstanceRestoreReport.value = {
      inputCount: eventInstanceResult.inputCount,
      restoredCount: eventInstanceResult.instances.length,
      rejected: eventInstanceResult.rejected,
    }
    eventReviewNotes.value = normalizeEventReviewNotes(rawSource.eventReviewNotes)
    cooldownsByEvent.value = normalizeCooldowns(rawSource.cooldownsByEvent || rawSource.cooldowns)
    dailyCounters.value = normalizeDailyCounters(rawSource.dailyCounters)
    foodDeliveryCausalChains.value = normalizeFoodDeliveryCausalChains(
      rawSource.foodDeliveryCausalChains,
    )
    chatSocialEventProposals.value = normalizeChatSocialEventProposals(
      rawSource.chatSocialEventProposals,
    )
    mapJourneyEventProposals.value = normalizeMapJourneyEventProposals(
      rawSource.mapJourneyEventProposals,
    )
    settings.value = normalizeSimulationSettings(rawSource.settings)
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(SIMULATION_STORAGE_KEY, {
      version: SIMULATION_STORAGE_VERSION,
      migrate: migrateSimulationStorage,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(SIMULATION_STORAGE_KEY, {
      version: SIMULATION_STORAGE_VERSION,
      migrate: migrateSimulationStorage,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    eventLogs: eventLogs.value.map((item) => ({ ...item })),
    eventInstances: eventInstances.value.map((item) => cloneEventValue(item)),
    eventReviewNotes: eventReviewNotes.value.map((item) => cloneEventValue(item)),
    cooldownsByEvent: Object.fromEntries(
      Object.entries(cooldownsByEvent.value).map(([key, item]) => [key, { ...item }]),
    ),
    dailyCounters: Object.fromEntries(
      Object.entries(dailyCounters.value).map(([key, item]) => [key, { ...item }]),
    ),
    foodDeliveryCausalChains: foodDeliveryCausalChains.value.map((chain) => ({
      ...chain,
      randomGate: { ...chain.randomGate },
      ownerRecords: { ...chain.ownerRecords },
      resultCodes: [...chain.resultCodes],
    })),
    chatSocialEventProposals: chatSocialEventProposals.value.map((item) => ({
      ...item,
      relationshipGate: item.relationshipGate ? { ...item.relationshipGate } : null,
      policySnapshot: { ...item.policySnapshot },
      source: { ...item.source },
    })),
    mapJourneyEventProposals: mapJourneyEventProposals.value.map((item) => ({
      ...item,
      allowedOutcomes: [...item.allowedOutcomes],
      source: { ...item.source },
      provenance: {
        ...item.provenance,
        activeWorldBookIds: [...item.provenance.activeWorldBookIds],
      },
    })),
    settings: {
      surpriseMode: settings.value.surpriseMode,
      enabledModules: { ...settings.value.enabledModules },
      foregroundSessionTickEnabled: settings.value.foregroundSessionTickEnabled === true,
      foregroundSessionTickIntervalMs: settings.value.foregroundSessionTickIntervalMs,
      eventTextMode: settings.value.eventTextMode,
    },
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => applyPersistedSource(snapshot)

  const persistToStorage = () => {
    writePersistedState(SIMULATION_STORAGE_KEY, createBackupSnapshot(), {
      version: SIMULATION_STORAGE_VERSION,
      migrate: migrateSimulationStorage,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    eventLogs.value = []
    eventInstances.value = []
    eventInstanceRestoreReport.value = { inputCount: 0, restoredCount: 0, rejected: [] }
    eventReviewNotes.value = []
    cooldownsByEvent.value = {}
    dailyCounters.value = {}
    foodDeliveryCausalChains.value = []
    chatSocialEventProposals.value = []
    mapJourneyEventProposals.value = []
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
    [
      eventLogs,
      eventInstances,
      eventReviewNotes,
      cooldownsByEvent,
      dailyCounters,
      foodDeliveryCausalChains,
      chatSocialEventProposals,
      mapJourneyEventProposals,
      settings,
    ],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    eventLogs,
    eventInstances,
    eventInstanceRestoreReport,
    eventReviewNotes,
    cooldownsByEvent,
    dailyCounters,
    foodDeliveryCausalChains,
    chatSocialEventProposals,
    mapJourneyEventProposals,
    settings,
    eventLogCount,
    eventInstanceCount,
    eventReviewNoteCount,
    recentEventLogs,
    activeCooldownCount,
    surpriseMode,
    eventTextMode,
    pendingChatSocialEventProposals,
    pendingChatSocialEventProposalCount,
    pendingMapJourneyEventProposals,
    pendingMapJourneyEventProposalCount,
    hasFinishedStorageHydration,
    isModuleEventsEnabled,
    setModuleEventsEnabled,
    setSurpriseMode,
    setEventTextMode,
    setForegroundSessionTickEnabled,
    setForegroundSessionTickIntervalMs,
    getEventInstance,
    upsertEventInstance,
    upsertEventReviewNote,
    deleteEventReviewNote,
    listEventReviewNotesForRef,
    recordEventLog,
    recordEventTrigger,
    markCooldown,
    getCooldownState,
    isCoolingDown,
    incrementDailyCounter,
    getDailyCounterState,
    canUseDailyQuota,
    getFoodDeliveryCausalChain,
    evaluateFoodDeliveryCausalChain,
    recordFoodDeliveryCausalCheckpoint,
    upsertMapJourneyEventProposal,
    getMapJourneyEventProposal,
    reviewMapJourneyEventProposal,
    finalizeMapJourneyEventProposal,
    dismissMapJourneyEventProposal,
    submitChatSocialEventProposal,
    runChatSocialRuntimeProposal,
    approveChatSocialEventProposal,
    dismissChatSocialEventProposal,
    clearEventLogs,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
