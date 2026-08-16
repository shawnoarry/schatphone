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
import {
  normalizeActivitySessionEventRecord,
  normalizeActivitySessionEventRecords,
} from '../lib/simulation/adapters/activity-session-events'
import {
  ACTIVITY_SESSION_EVENT_MODULE_KEY,
  ACTIVITY_SESSION_EVENT_PRESENTATION_MODE,
  ACTIVITY_SESSION_EVENT_STATUS,
} from '../lib/activity-session-event-interface'
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
  EVENT_INSTANCE_V2_LIFECYCLE,
  OWNER_ACTION_REQUEST_STATUS,
  normalizeEventInstanceV2,
  normalizeEventInstancesV2,
  normalizeOwnerFactV1,
} from '../lib/simulation/commerce-interaction-contracts'
import {
  advanceEventInstanceV2,
  createEventInstanceV2,
} from '../lib/simulation/event-instance-v2'
import { getBuiltInCommerceEventTemplate } from '../lib/simulation/commerce-event-templates'
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
const SIMULATION_STORAGE_VERSION = 6
const SIMULATION_EVENT_LOG_LIMIT = 240
const SIMULATION_LEDGER_LIMIT = 240
const SIMULATION_CHAT_SOCIAL_PROPOSAL_LIMIT = 120
const SIMULATION_MAP_JOURNEY_PROPOSAL_LIMIT = 120
const SIMULATION_ACTIVITY_SESSION_EVENT_RECORD_LIMIT = 240
const SIMULATION_EVENT_INSTANCE_V2_LIMIT = 240
const SIMULATION_OWNER_FACT_LIMIT = 480
const SIMULATION_LEGACY_COMMERCE_AUDIT_LIMIT = 120
export const SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS = 10 * 60 * 1000
export const SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS = 60 * 1000
export const SIMULATION_EVENT_TEXT_MODE = EVENT_TEXT_MODE

const LEGACY_FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID =
  'food_delivery.delivery_address_change_escalation.v1'

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
const EVENT_TEXT_MODE_VALUES = new Set(Object.values(EVENT_TEXT_MODE))
const EVENT_PRESENTATION_MODE_VALUES = new Set(
  Object.values(ACTIVITY_SESSION_EVENT_PRESENTATION_MODE),
)
const DEFAULT_SIMULATION_SETTINGS = Object.freeze({
  surpriseMode: SIMULATION_SURPRISE_MODE.LOW,
  enabledModules: Object.freeze({}),
  foregroundSessionTickEnabled: false,
  foregroundSessionTickIntervalMs: SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS,
  eventTextMode: EVENT_TEXT_MODE.LOCAL_ONLY,
  eventPresentationModes: Object.freeze({
    [ACTIVITY_SESSION_EVENT_MODULE_KEY]: ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.OFF,
  }),
})
const CHAT_SOCIAL_RUNTIME_SUCCESS_STATUSES = new Set([
  CHAT_SOCIAL_EVENT_STATUS.APPLIED,
  CHAT_SOCIAL_EVENT_STATUS.READY_TO_APPLY,
  CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
])
const ACTIVITY_SESSION_EVENT_TERMINAL_STATUSES = new Set([
  ACTIVITY_SESSION_EVENT_STATUS.NO_EVENT,
  ACTIVITY_SESSION_EVENT_STATUS.RESOLVED,
  ACTIVITY_SESSION_EVENT_STATUS.FAILED,
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

const normalizeLegacyCommerceAuditEntry = (rawEntry, index = 0) => {
  if (!rawEntry || typeof rawEntry !== 'object') return null
  const targetId = normalizeText(rawEntry.targetId || rawEntry.ownerRecords?.foodOrderId, '', 180)
  if (!targetId) return null
  const createdAt = normalizeTimestamp(rawEntry.createdAt, Date.now() - index)
  return {
    id: normalizeText(rawEntry.id, `legacy_commerce_audit_${targetId}`, 220),
    sourceKind: 'legacy_food_delivery_causal_chain',
    targetId,
    templateId: normalizeText(
      rawEntry.templateId || rawEntry.eventId,
      LEGACY_FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID,
      220,
    ),
    provenance: 'legacy_reference_trigger',
    status: normalizeText(rawEntry.status, 'legacy', 60),
    currentNode: normalizeText(rawEntry.currentNode, '', 120),
    ownerRecords: {
      foodOrderId: normalizeText(rawEntry.ownerRecords?.foodOrderId, targetId, 180),
      walletTransactionId: normalizeText(rawEntry.ownerRecords?.walletTransactionId, '', 220),
      mapJourneyId: normalizeText(rawEntry.ownerRecords?.mapJourneyId, '', 220),
      conversationId: normalizeText(rawEntry.ownerRecords?.conversationId, '', 220),
      phoneSessionId: normalizeText(rawEntry.ownerRecords?.phoneSessionId, '', 220),
    },
    resultCodes: normalizeTextList(
      ['legacy_reference_trigger', ...(Array.isArray(rawEntry.resultCodes) ? rawEntry.resultCodes : [])],
      32,
      160,
    ),
    createdAt,
    updatedAt: normalizeTimestamp(rawEntry.updatedAt, createdAt),
  }
}

const normalizeLegacyCommerceAuditEntries = (rawEntries) => {
  if (!Array.isArray(rawEntries)) return []
  const seen = new Set()
  return rawEntries
    .map((item, index) => normalizeLegacyCommerceAuditEntry(item, index))
    .filter((item) => {
      if (!item || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, SIMULATION_LEGACY_COMMERCE_AUDIT_LIMIT)
}

const migrateLegacyFoodDeliveryCausalChains = (rawChains) =>
  (Array.isArray(rawChains) ? rawChains : [])
    .map((chain, index) =>
      normalizeLegacyCommerceAuditEntry(
        {
          ...chain,
          id: `legacy_audit_${normalizeText(chain?.id, `chain_${index}`, 200)}`,
          templateId: chain?.eventId || LEGACY_FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID,
        },
        index,
      ),
    )
    .filter(Boolean)

const normalizeOwnerFacts = (rawFacts) => {
  if (!Array.isArray(rawFacts)) return []
  const seen = new Set()
  return rawFacts
    .map(normalizeOwnerFactV1)
    .filter((fact) => {
      if (!fact || seen.has(fact.id)) return false
      seen.add(fact.id)
      return true
    })
    .sort((a, b) => b.occurredAt - a.occurredAt)
    .slice(0, SIMULATION_OWNER_FACT_LIMIT)
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

const normalizeEventPresentationModes = (rawModes) => {
  const source = rawModes && typeof rawModes === 'object' && !Array.isArray(rawModes)
    ? rawModes
    : {}
  const normalized = Object.fromEntries(
    Object.entries(source)
      .map(([key, mode]) => [normalizeModuleKey(key, ''), normalizeText(mode, '', 40)])
      .filter(([key, mode]) => Boolean(key) && EVENT_PRESENTATION_MODE_VALUES.has(mode)),
  )
  return {
    [ACTIVITY_SESSION_EVENT_MODULE_KEY]: ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.OFF,
    ...normalized,
  }
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
    eventPresentationModes: normalizeEventPresentationModes(source.eventPresentationModes),
  }
}

export const migrateSimulationStorage = ({ version, data } = {}) => {
  const storedVersion = Number(version)
  if (
    ![1, 2, 3, 4, 5].includes(storedVersion) ||
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    return null
  }
  const { foodDeliveryCausalChains: legacyFoodDeliveryCausalChains, ...currentData } = data
  return {
    ...currentData,
    eventInstances: storedVersion === 1 ? [] : data.eventInstances || [],
    eventReviewNotes: storedVersion >= 3 ? data.eventReviewNotes || [] : [],
    activitySessionEventRecords: data.activitySessionEventRecords || [],
    eventInstancesV2: data.eventInstancesV2 || [],
    ownerFacts: data.ownerFacts || [],
    legacyCommerceAuditEntries: [
      ...(Array.isArray(data.legacyCommerceAuditEntries) ? data.legacyCommerceAuditEntries : []),
      ...migrateLegacyFoodDeliveryCausalChains(legacyFoodDeliveryCausalChains),
    ],
    settings: {
      ...(data.settings && typeof data.settings === 'object' ? data.settings : {}),
      eventTextMode:
        storedVersion >= 3 && EVENT_TEXT_MODE_VALUES.has(data.settings?.eventTextMode)
          ? data.settings.eventTextMode
          : EVENT_TEXT_MODE.LOCAL_ONLY,
      eventPresentationModes: normalizeEventPresentationModes(
        data.settings?.eventPresentationModes,
      ),
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

const EVENT_INSTANCE_V2_LIFECYCLE_TRANSITIONS = Object.freeze({
  [EVENT_INSTANCE_V2_LIFECYCLE.ACTIVE]: new Set(Object.values(EVENT_INSTANCE_V2_LIFECYCLE)),
  [EVENT_INSTANCE_V2_LIFECYCLE.RESOLVED]: new Set([EVENT_INSTANCE_V2_LIFECYCLE.RESOLVED]),
  [EVENT_INSTANCE_V2_LIFECYCLE.FAILED]: new Set([EVENT_INSTANCE_V2_LIFECYCLE.FAILED]),
  [EVENT_INSTANCE_V2_LIFECYCLE.CANCELLED]: new Set([EVENT_INSTANCE_V2_LIFECYCLE.CANCELLED]),
})

const isStablePrefix = (currentItems, nextItems, createKey) =>
  currentItems.every((currentItem, index) => {
    const nextItem = nextItems[index]
    return nextItem && createKey(currentItem) === createKey(nextItem)
  })

const canAdvanceEventInstanceV2 = (current, next) => {
  if (
    current.id !== next.id ||
    current.templateId !== next.templateId ||
    current.createdAt !== next.createdAt ||
    next.updatedAt < current.updatedAt ||
    !EVENT_INSTANCE_V2_LIFECYCLE_TRANSITIONS[current.lifecycle]?.has(next.lifecycle)
  ) {
    return false
  }
  if (
    Object.entries(current.contextRefs).some(([key, value]) =>
      JSON.stringify(next.contextRefs[key]) !== JSON.stringify(value),
    )
  ) {
    return false
  }
  if (
    !isStablePrefix(current.decisionLedger, next.decisionLedger, (item) =>
      JSON.stringify({ key: item.key, outcome: item.outcome, randomValue: item.randomValue, seed: item.seed, decidedAt: item.decidedAt }),
    ) ||
    !isStablePrefix(current.deadlines, next.deadlines, (item) =>
      JSON.stringify({ id: item.id, dueAt: item.dueAt }),
    ) ||
    !isStablePrefix(current.pendingOwnerRequests, next.pendingOwnerRequests, (item) =>
      JSON.stringify({
        id: item.id,
        actionKey: item.actionKey,
        targetModule: item.targetModule,
        requestedByInstanceId: item.requestedByInstanceId,
        contextRefs: item.contextRefs,
        idempotencyKey: item.idempotencyKey,
        requestedAt: item.requestedAt,
      }),
    )
  ) {
    return false
  }
  if (
    current.observedFactIds.some((id) => !next.observedFactIds.includes(id)) ||
    current.resultCodes.some((code) => !next.resultCodes.includes(code))
  ) {
    return false
  }
  return true
}

export const useSimulationStore = defineStore('simulation', () => {
  const eventLogs = ref([])
  const eventInstances = ref([])
  const eventInstanceRestoreReport = ref({ inputCount: 0, restoredCount: 0, rejected: [] })
  const eventInstancesV2 = ref([])
  const eventInstanceV2RestoreReport = ref({ inputCount: 0, restoredCount: 0, rejected: [] })
  const ownerFacts = ref([])
  const legacyCommerceAuditEntries = ref([])
  const eventReviewNotes = ref([])
  const cooldownsByEvent = ref({})
  const dailyCounters = ref({})
  const chatSocialEventProposals = ref([])
  const mapJourneyEventProposals = ref([])
  const activitySessionEventRecords = ref([])
  const settings = ref(normalizeSimulationSettings(DEFAULT_SIMULATION_SETTINGS))
  const hasFinishedStorageHydration = ref(false)

  const eventLogCount = computed(() => eventLogs.value.length)
  const eventInstanceCount = computed(() => eventInstances.value.length)
  const eventInstanceV2Count = computed(() => eventInstancesV2.value.length)
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
  const pendingActivitySessionEventRecords = computed(() =>
    activitySessionEventRecords.value.filter(
      (item) => item.status === ACTIVITY_SESSION_EVENT_STATUS.PENDING,
    ),
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

  const getEventPresentationMode = (moduleKey) => {
    const normalizedModuleKey = normalizeModuleKey(moduleKey, '')
    if (!normalizedModuleKey) return ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.OFF
    const mode = settings.value.eventPresentationModes[normalizedModuleKey]
    return EVENT_PRESENTATION_MODE_VALUES.has(mode)
      ? mode
      : ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.OFF
  }

  const setEventPresentationMode = (moduleKey, mode) => {
    const normalizedModuleKey = normalizeModuleKey(moduleKey, '')
    if (!normalizedModuleKey || !EVENT_PRESENTATION_MODE_VALUES.has(mode)) return null
    settings.value = {
      ...settings.value,
      eventPresentationModes: {
        ...settings.value.eventPresentationModes,
        [normalizedModuleKey]: mode,
      },
    }
    return mode
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

  const getEventInstanceV2 = (instanceId) => {
    const normalizedId = normalizeText(instanceId, '', 220)
    return eventInstancesV2.value.find((item) => item.id === normalizedId) || null
  }

  const upsertEventInstanceV2 = (rawInstance) => {
    const instance = normalizeEventInstanceV2(rawInstance)
    if (!instance) return null
    const current = getEventInstanceV2(instance.id)
    if (current && !canAdvanceEventInstanceV2(current, instance)) return null
    eventInstancesV2.value = [
      instance,
      ...eventInstancesV2.value.filter((item) => item.id !== instance.id),
    ].slice(0, SIMULATION_EVENT_INSTANCE_V2_LIMIT)
    return instance
  }

  const mergeEventInstanceV2ContextRefs = (instanceId, contextRefs = {}, { at = Date.now() } = {}) => {
    const existing = getEventInstanceV2(instanceId)
    if (!existing || !contextRefs || typeof contextRefs !== 'object' || Array.isArray(contextRefs)) return null
    return upsertEventInstanceV2({
      ...existing,
      contextRefs: { ...existing.contextRefs, ...contextRefs },
      updatedAt: Math.max(existing.updatedAt, normalizeTimestamp(at)),
    })
  }

  const closeEventInstanceV2 = ({
    instanceId = '',
    lifecycle = EVENT_INSTANCE_V2_LIFECYCLE.CANCELLED,
    resultCode = '',
    now = Date.now(),
  } = {}) => {
    const existing = getEventInstanceV2(instanceId)
    const normalizedResultCode = normalizeEventId(resultCode, 160)
    if (
      !existing ||
      existing.lifecycle !== EVENT_INSTANCE_V2_LIFECYCLE.ACTIVE ||
      ![EVENT_INSTANCE_V2_LIFECYCLE.RESOLVED, EVENT_INSTANCE_V2_LIFECYCLE.FAILED, EVENT_INSTANCE_V2_LIFECYCLE.CANCELLED].includes(lifecycle) ||
      !normalizedResultCode
    ) {
      return null
    }
    return upsertEventInstanceV2({
      ...existing,
      lifecycle,
      resultCodes: existing.resultCodes.includes(normalizedResultCode)
        ? existing.resultCodes
        : [...existing.resultCodes, normalizedResultCode],
      updatedAt: Math.max(existing.updatedAt, normalizeTimestamp(now)),
    })
  }

  const recordOwnerFact = (rawFact) => {
    const fact = normalizeOwnerFactV1(rawFact)
    if (!fact) return null
    const existing = ownerFacts.value.find((item) => item.id === fact.id)
    if (existing) return JSON.stringify(existing) === JSON.stringify(fact) ? existing : null
    ownerFacts.value = [fact, ...ownerFacts.value].slice(0, SIMULATION_OWNER_FACT_LIMIT)
    return fact
  }

  const advanceStoredEventInstanceV2 = ({
    instanceId = '',
    randomValues = {},
    now = Date.now(),
  } = {}) => {
    const existing = getEventInstanceV2(instanceId)
    const template = existing ? getBuiltInCommerceEventTemplate(existing.templateId) : null
    if (!existing || !template) {
      return { ok: false, changed: false, reason: 'instance_or_template_missing', instance: null }
    }
    const runtimeNow = Math.max(existing.updatedAt, normalizeTimestamp(now))
    const result = advanceEventInstanceV2({
      instance: existing,
      template,
      ownerFacts: ownerFacts.value,
      randomValues,
      now: runtimeNow,
    })
    if (!result.ok || !result.instance) return result
    const stored = upsertEventInstanceV2(result.instance)
    if (!stored) return { ok: false, changed: false, reason: 'instance_update_rejected', instance: existing }
    if (result.changed) {
      recordEventLog({
        id: `${stored.id}:${stored.currentNodeId}:${stored.updatedAt}`,
        eventId: stored.templateId,
        moduleKey: 'commerce',
        targetId: stored.contextRefs.order_id || stored.contextRefs.service_case_id || stored.id,
        adapterKey: 'simulation.event_instance_v2',
        triggerSource: SIMULATION_TRIGGER_SOURCE.SYSTEM,
        status:
          stored.lifecycle === EVENT_INSTANCE_V2_LIFECYCLE.ACTIVE
            ? SIMULATION_EVENT_STATUS.TRIGGERED
            : SIMULATION_EVENT_STATUS.RESOLVED,
        reason: stored.resultCodes.at(-1) || stored.currentNodeId,
        at: stored.updatedAt,
      })
    }
    return { ...result, instance: stored }
  }

  const startEventInstanceV2 = ({
    id = '',
    templateId = '',
    contextRefs = {},
    randomValues = {},
    now = Date.now(),
  } = {}) => {
    const existing = getEventInstanceV2(id)
    if (existing) {
      return advanceStoredEventInstanceV2({ instanceId: existing.id, randomValues, now })
    }
    const template = getBuiltInCommerceEventTemplate(templateId)
    const instance = createEventInstanceV2({ id, template, contextRefs, now })
    const stored = instance ? upsertEventInstanceV2(instance) : null
    if (!stored) return { ok: false, changed: false, reason: 'instance_create_rejected', instance: null }
    recordEventLog({
      id: `${stored.id}:created`,
      eventId: stored.templateId,
      moduleKey: 'commerce',
      targetId: stored.contextRefs.order_id || stored.contextRefs.service_case_id || stored.id,
      adapterKey: 'simulation.event_instance_v2',
      triggerSource: SIMULATION_TRIGGER_SOURCE.MANUAL,
      status: SIMULATION_EVENT_STATUS.TRIGGERED,
      reason: 'user_service_interaction',
      at: stored.createdAt,
    })
    return advanceStoredEventInstanceV2({ instanceId: stored.id, randomValues, now })
  }

  const recordOwnerFactAndAdvance = (rawFact, { randomValues = {}, now = Date.now() } = {}) => {
    const fact = recordOwnerFact(rawFact)
    if (!fact) return { ok: false, changed: false, reason: 'owner_fact_rejected', fact: null, instance: null }
    const instance = fact.correlationId ? getEventInstanceV2(fact.correlationId) : null
    if (!instance) return { ok: true, changed: false, reason: 'fact_recorded_without_instance', fact, instance: null }
    const result = advanceStoredEventInstanceV2({ instanceId: instance.id, randomValues, now })
    return { ...result, fact }
  }

  const listPendingOwnerActionRequests = (targetModule = '') => {
    const normalizedTarget = normalizeModuleKey(targetModule, '')
    return eventInstancesV2.value.flatMap((instance) =>
      instance.pendingOwnerRequests
        .filter(
          (request) =>
            request.status === OWNER_ACTION_REQUEST_STATUS.PENDING &&
            (!normalizedTarget || request.targetModule === normalizedTarget),
        )
        .map((request) => ({ instanceId: instance.id, request })),
    )
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

  const getActivitySessionEventRecord = (recordId) => {
    const id = normalizeText(recordId, '', 720)
    if (!id) return null
    return activitySessionEventRecords.value.find((item) => item.id === id) || null
  }

  const findActivitySessionEventForSession = (activitySessionId, { pendingOnly = false } = {}) => {
    const sessionId = normalizeText(activitySessionId, '', 220)
    if (!sessionId) return null
    return (
      activitySessionEventRecords.value.find(
        (item) =>
          item.activitySessionId === sessionId &&
          (!pendingOnly || item.status === ACTIVITY_SESSION_EVENT_STATUS.PENDING),
      ) || null
    )
  }

  const upsertActivitySessionEventRecord = (rawRecord = {}) => {
    const record = normalizeActivitySessionEventRecord(rawRecord)
    if (!record) return null
    const existing = getActivitySessionEventRecord(record.id)
    if (existing) {
      if (
        ACTIVITY_SESSION_EVENT_TERMINAL_STATUSES.has(existing.status) &&
        JSON.stringify(existing) !== JSON.stringify(record)
      ) {
        return null
      }
      if (
        record.createdAt !== existing.createdAt ||
        record.updatedAt < existing.updatedAt ||
        record.activitySessionId !== existing.activitySessionId ||
        record.checkpointId !== existing.checkpointId
      ) {
        return null
      }
    }
    activitySessionEventRecords.value = [
      record,
      ...activitySessionEventRecords.value.filter((item) => item.id !== record.id),
    ].slice(0, SIMULATION_ACTIVITY_SESSION_EVENT_RECORD_LIMIT)
    return record
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
    const eventInstanceV2Result = normalizeEventInstancesV2(rawSource.eventInstancesV2)
    eventInstancesV2.value = eventInstanceV2Result.instances
    eventInstanceV2RestoreReport.value = {
      inputCount: eventInstanceV2Result.inputCount,
      restoredCount: eventInstanceV2Result.instances.length,
      rejected: eventInstanceV2Result.rejected,
    }
    ownerFacts.value = normalizeOwnerFacts(rawSource.ownerFacts)
    legacyCommerceAuditEntries.value = normalizeLegacyCommerceAuditEntries([
      ...(Array.isArray(rawSource.legacyCommerceAuditEntries)
        ? rawSource.legacyCommerceAuditEntries
        : []),
      ...migrateLegacyFoodDeliveryCausalChains(rawSource.foodDeliveryCausalChains),
    ])
    eventReviewNotes.value = normalizeEventReviewNotes(rawSource.eventReviewNotes)
    cooldownsByEvent.value = normalizeCooldowns(rawSource.cooldownsByEvent || rawSource.cooldowns)
    dailyCounters.value = normalizeDailyCounters(rawSource.dailyCounters)
    chatSocialEventProposals.value = normalizeChatSocialEventProposals(
      rawSource.chatSocialEventProposals,
    )
    mapJourneyEventProposals.value = normalizeMapJourneyEventProposals(
      rawSource.mapJourneyEventProposals,
    )
    activitySessionEventRecords.value = normalizeActivitySessionEventRecords(
      rawSource.activitySessionEventRecords,
    ).slice(0, SIMULATION_ACTIVITY_SESSION_EVENT_RECORD_LIMIT)
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
    eventInstancesV2: eventInstancesV2.value.map((item) => cloneEventValue(item)),
    ownerFacts: ownerFacts.value.map((item) => cloneEventValue(item)),
    legacyCommerceAuditEntries: legacyCommerceAuditEntries.value.map((item) =>
      cloneEventValue(item),
    ),
    eventReviewNotes: eventReviewNotes.value.map((item) => cloneEventValue(item)),
    cooldownsByEvent: Object.fromEntries(
      Object.entries(cooldownsByEvent.value).map(([key, item]) => [key, { ...item }]),
    ),
    dailyCounters: Object.fromEntries(
      Object.entries(dailyCounters.value).map(([key, item]) => [key, { ...item }]),
    ),
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
    activitySessionEventRecords: activitySessionEventRecords.value.map((item) => ({
      ...item,
      allowedOutcomes: [...item.allowedOutcomes],
      source: { ...item.source },
      provenance: { ...item.provenance },
    })),
    settings: {
      surpriseMode: settings.value.surpriseMode,
      enabledModules: { ...settings.value.enabledModules },
      foregroundSessionTickEnabled: settings.value.foregroundSessionTickEnabled === true,
      foregroundSessionTickIntervalMs: settings.value.foregroundSessionTickIntervalMs,
      eventTextMode: settings.value.eventTextMode,
      eventPresentationModes: { ...settings.value.eventPresentationModes },
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
    eventInstancesV2.value = []
    eventInstanceV2RestoreReport.value = { inputCount: 0, restoredCount: 0, rejected: [] }
    ownerFacts.value = []
    legacyCommerceAuditEntries.value = []
    eventReviewNotes.value = []
    cooldownsByEvent.value = {}
    dailyCounters.value = {}
    chatSocialEventProposals.value = []
    mapJourneyEventProposals.value = []
    activitySessionEventRecords.value = []
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
      eventInstancesV2,
      ownerFacts,
      legacyCommerceAuditEntries,
      eventReviewNotes,
      cooldownsByEvent,
      dailyCounters,
      chatSocialEventProposals,
      mapJourneyEventProposals,
      activitySessionEventRecords,
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
    eventInstancesV2,
    eventInstanceV2RestoreReport,
    ownerFacts,
    legacyCommerceAuditEntries,
    eventReviewNotes,
    cooldownsByEvent,
    dailyCounters,
    chatSocialEventProposals,
    mapJourneyEventProposals,
    activitySessionEventRecords,
    settings,
    eventLogCount,
    eventInstanceCount,
    eventInstanceV2Count,
    eventReviewNoteCount,
    recentEventLogs,
    activeCooldownCount,
    surpriseMode,
    eventTextMode,
    pendingChatSocialEventProposals,
    pendingChatSocialEventProposalCount,
    pendingMapJourneyEventProposals,
    pendingMapJourneyEventProposalCount,
    pendingActivitySessionEventRecords,
    hasFinishedStorageHydration,
    isModuleEventsEnabled,
    setModuleEventsEnabled,
    setSurpriseMode,
    setEventTextMode,
    getEventPresentationMode,
    setEventPresentationMode,
    setForegroundSessionTickEnabled,
    setForegroundSessionTickIntervalMs,
    getEventInstance,
    upsertEventInstance,
    getEventInstanceV2,
    upsertEventInstanceV2,
    mergeEventInstanceV2ContextRefs,
    closeEventInstanceV2,
    startEventInstanceV2,
    advanceStoredEventInstanceV2,
    recordOwnerFact,
    recordOwnerFactAndAdvance,
    listPendingOwnerActionRequests,
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
    getActivitySessionEventRecord,
    findActivitySessionEventForSession,
    upsertActivitySessionEventRecord,
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
