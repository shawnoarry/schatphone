import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { resolveLocalizedText } from '../lib/locale'
import { normalizeSharedExperienceId } from '../lib/shared-experience-contract'
import { useCalendarStore } from './calendar'
import { useSystemStore } from './system'
import { useSystemNotifications } from '../composables/useSystemNotifications'
import {
  anonymizeRelationshipText,
  bindingMatchesProfile,
  clearRelationshipBinding,
  normalizeRelationshipBinding,
} from '../lib/relationship-cleanup-helpers'
import {
  DESTINATION_CHANGE_RESOLUTION_OUTCOME,
  normalizeInteractionResolutionV1,
  normalizeOwnerFactV1,
} from '../lib/simulation/commerce-interaction-contracts'

const PHONE_STORAGE_KEY = 'store:phone'
const PHONE_STORAGE_VERSION = 3
const PHONE_CALL_LIMIT = 200
const PHONE_INTERACTION_RESOLUTION_LIMIT = 120

export const PHONE_CALL_SESSION_STATUS = Object.freeze({
  DIALING: 'dialing',
  RINGING: 'ringing',
  CONNECTED: 'connected',
  ENDED: 'ended',
  FAILED: 'failed',
})

export const PHONE_INCOMING_CALL_STATUS = Object.freeze({
  RINGING: 'ringing',
  ACCEPTED: 'accepted',
})

const DEFAULT_INCOMING_RING_TIMEOUT_MS = 25_000

const PHONE_CALL_TURN_LIMIT = 80

export const PHONE_CALL_DIRECTION = Object.freeze({
  INCOMING: 'incoming',
  OUTGOING: 'outgoing',
  MISSED: 'missed',
})

export const PHONE_CALL_STATUS = Object.freeze({
  COMPLETED: 'completed',
  MISSED: 'missed',
  DECLINED: 'declined',
  FAILED: 'failed',
})

const PHONE_CALL_DIRECTIONS = new Set(Object.values(PHONE_CALL_DIRECTION))
const PHONE_CALL_STATUSES = new Set(Object.values(PHONE_CALL_STATUS))

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeText = (value, fallback = '', max = 120) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeDirection = (value, fallback = PHONE_CALL_DIRECTION.OUTGOING) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return PHONE_CALL_DIRECTIONS.has(normalized) ? normalized : fallback
}

const normalizeStatus = (value, fallback = PHONE_CALL_STATUS.COMPLETED) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return PHONE_CALL_STATUSES.has(normalized) ? normalized : fallback
}

const normalizeDurationSec = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return 0
  return Math.min(24 * 60 * 60, Math.floor(num))
}

const createPhoneCallId = () => `phone_call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const createMissedCallNotificationPayload = (call) => {
  if (!call || typeof call !== 'object') return null
  const contactName = normalizeText(call.contactName, '', 80)
  if (!contactName) return null
  return {
    title: `Missed call: ${contactName}`,
    content: call.summary || `${contactName} tried to reach you.`,
    icon: 'fas fa-phone-slash',
    route: '/phone',
    source: 'phone_missed_call',
    pushTitle: `Missed call: ${contactName}`,
    pushBody: call.summary || `${contactName} tried to reach you.`,
  }
}

const normalizeCallLog = (rawCall, index = 0) => {
  if (!rawCall || typeof rawCall !== 'object') return null

  const contactName = normalizeText(rawCall.contactName || rawCall.name, '', 80)
  if (!contactName) return null

  const direction = normalizeDirection(rawCall.direction)
  const status = normalizeStatus(
    rawCall.status,
    direction === PHONE_CALL_DIRECTION.MISSED ? PHONE_CALL_STATUS.MISSED : PHONE_CALL_STATUS.COMPLETED,
  )
  const startedAt = Math.max(0, toInt(rawCall.startedAt || rawCall.createdAt, Date.now()))

  return {
    id:
      typeof rawCall.id === 'string' && rawCall.id.trim()
        ? rawCall.id.trim()
        : `phone_call_legacy_${Date.now()}_${index}`,
    contactName,
    phoneNumber: normalizeText(rawCall.phoneNumber, '', 40),
    direction,
    status,
    durationSec: status === PHONE_CALL_STATUS.MISSED ? 0 : normalizeDurationSec(rawCall.durationSec),
    summary: normalizeText(rawCall.summary || rawCall.note, '', 240),
    sourceModule: normalizeText(rawCall.sourceModule, 'phone', 40),
    sourceId: normalizeText(rawCall.sourceId, '', 140),
    sharedExperienceId: normalizeSharedExperienceId(rawCall.sharedExperienceId),
    relationshipBinding: normalizeRelationshipBinding(rawCall.relationshipBinding),
    startedAt,
    createdAt: Math.max(0, toInt(rawCall.createdAt, startedAt)),
    updatedAt: Math.max(0, toInt(rawCall.updatedAt, startedAt)),
  }
}

const normalizeCallLogs = (rawCalls) => {
  if (!Array.isArray(rawCalls)) return []
  const seenIds = new Set()
  const normalized = []
  rawCalls.forEach((item, index) => {
    const record = normalizeCallLog(item, index)
    if (!record || seenIds.has(record.id)) return
    seenIds.add(record.id)
    normalized.push(record)
  })
  return normalized
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, PHONE_CALL_LIMIT)
}

const normalizeCallTurn = (rawTurn, index = 0) => {
  if (!rawTurn || typeof rawTurn !== 'object') return null
  const text = normalizeText(rawTurn.text || rawTurn.spokenText, '', 800)
  if (!text) return null
  return {
    id: normalizeText(rawTurn.id, `phone_turn_${Date.now()}_${index}`, 160),
    speaker: normalizeText(rawTurn.speaker, 'rider', 30),
    text,
    spokenText: normalizeText(rawTurn.spokenText, text, 800),
    voiceTone: normalizeText(rawTurn.voiceTone, '', 120),
    soundscape: normalizeText(rawTurn.soundscape, '', 160),
    delivery: normalizeText(rawTurn.delivery, 'text', 30),
    createdAt: Math.max(0, toInt(rawTurn.createdAt, Date.now() + index)),
  }
}

const normalizeCallSession = (rawSession) => {
  if (!rawSession || typeof rawSession !== 'object') return null
  const id = normalizeText(rawSession.id, '', 160)
  const participantName = normalizeText(rawSession.participant?.name || rawSession.contactName, '', 80)
  if (!id || !participantName) return null
  const turns = Array.isArray(rawSession.turns)
    ? rawSession.turns.map(normalizeCallTurn).filter(Boolean).slice(-PHONE_CALL_TURN_LIMIT)
    : []
  return {
    id,
    status: Object.values(PHONE_CALL_SESSION_STATUS).includes(rawSession.status)
      ? rawSession.status
      : PHONE_CALL_SESSION_STATUS.ENDED,
    participant: {
      id: normalizeText(rawSession.participant?.id, '', 120),
      name: participantName,
      phoneNumber: normalizeText(rawSession.participant?.phoneNumber || rawSession.phoneNumber, '', 40),
    },
    sourceModule: normalizeText(rawSession.sourceModule, 'phone', 60),
    sourceId: normalizeText(rawSession.sourceId, '', 160),
    orderId: normalizeText(rawSession.orderId, '', 140),
    conversationId: normalizeText(rawSession.conversationId, '', 180),
    journeyId: normalizeText(rawSession.journeyId, '', 180),
    serviceCaseId: normalizeText(rawSession.serviceCaseId, '', 180),
    eventInstanceId: normalizeText(rawSession.eventInstanceId, '', 220),
    destinationAnchorId: normalizeText(rawSession.destinationAnchorId, '', 220),
    resolutionContractKey: normalizeText(
      rawSession.resolutionContractKey,
      rawSession.orderId ? 'commerce.destination_change.v1' : '',
      180,
    ),
    resolutionProposal: normalizeInteractionResolutionV1(rawSession.resolutionProposal),
    turns,
    startedAt: Math.max(0, toInt(rawSession.startedAt, Date.now())),
    connectedAt: Math.max(0, toInt(rawSession.connectedAt, 0)),
    endedAt: Math.max(0, toInt(rawSession.endedAt, 0)),
    updatedAt: Math.max(0, toInt(rawSession.updatedAt, Date.now())),
  }
}

export const migratePhoneStorage = ({ version, data } = {}) => {
  const storedVersion = Number(version)
  if (![1, 2].includes(storedVersion) || !data || typeof data !== 'object' || Array.isArray(data)) return null
  return {
    ...data,
    activeSession: storedVersion === 1 ? null : data.activeSession || null,
    interactionResolutions: [],
  }
}

const normalizeInteractionResolutions = (rawResolutions) => {
  if (!Array.isArray(rawResolutions)) return []
  const seen = new Set()
  return rawResolutions
    .map(normalizeInteractionResolutionV1)
    .filter((resolution) => {
      if (!resolution || seen.has(resolution.sessionId)) return false
      seen.add(resolution.sessionId)
      return true
    })
    .sort((a, b) => b.resolvedAt - a.resolvedAt)
    .slice(0, PHONE_INTERACTION_RESOLUTION_LIMIT)
}

const createSeedCalls = () => {
  const now = Date.now()
  return normalizeCallLogs([
    {
      id: 'phone_seed_call_1',
      contactName: 'Mika',
      direction: PHONE_CALL_DIRECTION.OUTGOING,
      status: PHONE_CALL_STATUS.COMPLETED,
      durationSec: 4 * 60 + 12,
      summary: 'Role-call baseline sample',
      sourceModule: 'seed',
      startedAt: now - 18 * 60 * 1000,
      createdAt: now - 18 * 60 * 1000,
      updatedAt: now - 18 * 60 * 1000,
    },
    {
      id: 'phone_seed_call_2',
      contactName: 'Nova',
      direction: PHONE_CALL_DIRECTION.MISSED,
      status: PHONE_CALL_STATUS.MISSED,
      summary: 'Missed call event sample',
      sourceModule: 'seed',
      startedAt: now - 55 * 60 * 1000,
      createdAt: now - 55 * 60 * 1000,
      updatedAt: now - 55 * 60 * 1000,
    },
  ])
}

export const usePhoneStore = defineStore('phone', () => {
  const calls = ref([])
  const activeSession = ref(null)
  const interactionResolutions = ref([])
  const hasFinishedStorageHydration = ref(false)
  const resolvePhoneCopy = ({ zh = '', en = '', ko = '' } = {}) =>
    resolveLocalizedText(useSystemStore().settings?.system?.language, {
      zh,
      en,
      ko,
      fallback: en || zh,
    })

  const callCount = computed(() => calls.value.length)
  const missedCallCount = computed(() =>
    calls.value.filter(
      (item) => item.direction === PHONE_CALL_DIRECTION.MISSED || item.status === PHONE_CALL_STATUS.MISSED,
    ).length,
  )
  const completedCallCount = computed(() =>
    calls.value.filter((item) => item.status === PHONE_CALL_STATUS.COMPLETED).length,
  )
  const recentCalls = computed(() => calls.value.slice(0, 20))
  const callSessionActive = computed(() => Boolean(activeSession.value))

  const getInteractionResolution = (sessionId = '') => {
    const id = normalizeText(sessionId, '', 220)
    return interactionResolutions.value.find((item) => item.sessionId === id) || null
  }

  const upsertInteractionResolution = (rawResolution) => {
    const resolution = normalizeInteractionResolutionV1(rawResolution)
    if (!resolution) return null
    const existing = getInteractionResolution(resolution.sessionId)
    if (existing && JSON.stringify(existing) !== JSON.stringify(resolution)) return null
    interactionResolutions.value = [
      resolution,
      ...interactionResolutions.value.filter((item) => item.sessionId !== resolution.sessionId),
    ].slice(0, PHONE_INTERACTION_RESOLUTION_LIMIT)
    return resolution
  }

  const findCallById = (callId) => {
    const id = typeof callId === 'string' ? callId.trim() : ''
    if (!id) return null
    return calls.value.find((item) => item.id === id) || null
  }

  const addCallLog = (input = {}) => {
    const now = Date.now()
    const durationSec =
      Number.isFinite(Number(input.durationSec))
        ? input.durationSec
        : Math.round(Number(input.durationMinutes || 0) * 60)
    const record = normalizeCallLog({
      ...input,
      id: input.id || createPhoneCallId(),
      durationSec,
      startedAt: input.startedAt || now,
      createdAt: input.createdAt || now,
      updatedAt: now,
    })
    if (!record) return null
    calls.value.unshift(record)
    if (calls.value.length > PHONE_CALL_LIMIT) calls.value.splice(PHONE_CALL_LIMIT)
    return record
  }

  const addRoleCallLog = ({
    contactName = '',
    phoneNumber = '',
    direction = PHONE_CALL_DIRECTION.OUTGOING,
    durationMinutes = 0,
    summary = '',
    relationshipBinding = null,
    sharedExperienceId = '',
  } = {}) =>
    addCallLog({
      contactName,
      phoneNumber,
      direction,
      status: direction === PHONE_CALL_DIRECTION.MISSED ? PHONE_CALL_STATUS.MISSED : PHONE_CALL_STATUS.COMPLETED,
      durationMinutes,
      summary,
      sourceModule: 'phone_manual',
      relationshipBinding,
      sharedExperienceId,
    })

  const addMissedCall = ({
    contactName = '',
    phoneNumber = '',
    summary = '',
    relationshipBinding = null,
    sourceModule = 'phone_manual',
  } = {}) =>
    addCallLog({
      contactName,
      phoneNumber,
      direction: PHONE_CALL_DIRECTION.MISSED,
      status: PHONE_CALL_STATUS.MISSED,
      durationSec: 0,
      summary,
      sourceModule,
      relationshipBinding,
    })

  const notifyMissedCall = (call) => {
    const payload = createMissedCallNotificationPayload(call)
    if (!payload) return ''
    const systemStore = useSystemStore()
    const systemNotifications = useSystemNotifications({ systemStore })
    return systemNotifications.addNotification(payload)
  }

  const addMissedCallWithNotification = (input = {}) => {
    const call = addMissedCall(input)
    if (!call) return null
    const calendarStore = useCalendarStore()
    const calendarCue = calendarStore.upsertPhoneMissedCallCueFromCall(call)
    return {
      call,
      notificationId: notifyMissedCall(call),
      calendarCueId: calendarCue?.id || '',
    }
  }

  const removeCallLog = (callId) => {
    const record = findCallById(callId)
    if (!record) return false
    if (record.status === PHONE_CALL_STATUS.MISSED || record.direction === PHONE_CALL_DIRECTION.MISSED) {
      useCalendarStore().dismissPhoneMissedCallCueByCallId(record.id)
    }
    calls.value = calls.value.filter((item) => item.id !== record.id)
    return true
  }

  const anonymizeCallLog = (callId, profile = {}, replacementName = 'Unknown caller') => {
    const record = findCallById(callId)
    if (!record) return false
    record.contactName = normalizeText(replacementName, 'Unknown caller', 80)
    record.summary = anonymizeRelationshipText(record.summary, profile?.name, record.contactName)
    record.relationshipBinding = clearRelationshipBinding()
    record.updatedAt = Date.now()
    return true
  }

  const cleanupRelationshipForProfile = (profile = {}, options = {}) => {
    const replacementName = normalizeText(options.replacementName, 'Unknown caller', 80)
    const matchedCalls = calls.value.filter((call) =>
      bindingMatchesProfile(call.relationshipBinding, profile),
    )
    let anonymizedCount = 0
    matchedCalls.forEach((call) => {
      if (anonymizeCallLog(call.id, profile, replacementName)) {
        anonymizedCount += 1
      }
    })
    return {
      requestedCount: matchedCalls.length,
      removedCount: 0,
      anonymizedCount,
    }
  }

  const persistSession = () => {
    if (hasFinishedStorageHydration.value) persistToStorage()
  }

  const incomingCall = ref(null)
  let incomingCallTimerId = null

  const clearIncomingCallTimer = () => {
    if (incomingCallTimerId) {
      clearTimeout(incomingCallTimerId)
      incomingCallTimerId = null
    }
  }

  const logIncomingCall = ({ status, summary = '' } = {}) => {
    if (!incomingCall.value) return null
    return addCallLog({
      contactName: incomingCall.value.participant.name,
      phoneNumber: incomingCall.value.participant.phoneNumber,
      direction: PHONE_CALL_DIRECTION.INCOMING,
      status,
      durationSec: 0,
      summary,
      sourceModule: incomingCall.value.sourceModule,
      sourceId: incomingCall.value.id,
      relationshipBinding: incomingCall.value.relationshipBinding,
      startedAt: incomingCall.value.startedAt,
    })
  }

  const finalizeIncomingCallAsMissed = () => {
    if (!incomingCall.value || incomingCall.value.status !== PHONE_INCOMING_CALL_STATUS.RINGING) return null
    clearIncomingCallTimer()
    const contactName = incomingCall.value.participant.name
    const call = logIncomingCall({
      status: PHONE_CALL_STATUS.MISSED,
      summary: `${contactName} tried to reach you.`,
    })
    incomingCall.value = null
    persistSession()
    if (!call) return null
    const calendarStore = useCalendarStore()
    const calendarCue = calendarStore.upsertPhoneMissedCallCueFromCall(call)
    return {
      call,
      notificationId: notifyMissedCall(call),
      calendarCueId: calendarCue?.id || '',
    }
  }

  const receiveIncomingCall = ({
    name = '',
    phoneNumber = '',
    contactId = '',
    relationshipBinding = null,
    ringTimeoutMs = DEFAULT_INCOMING_RING_TIMEOUT_MS,
    sourceModule = 'phone_incoming',
    sourceId = '',
    now = Date.now(),
  } = {}) => {
    const contactName = normalizeText(name, '', 80)
    if (!contactName) return { ok: false, reason: 'name_required', incomingCall: null }
    if (incomingCall.value && incomingCall.value.status === PHONE_INCOMING_CALL_STATUS.RINGING) {
      return { ok: false, reason: 'incoming_active', incomingCall: incomingCall.value }
    }
    clearIncomingCallTimer()
    const timeoutMs = Number(ringTimeoutMs)
    incomingCall.value = {
      id: `phone_incoming_${now}_${Math.random().toString(36).slice(2, 8)}`,
      status: PHONE_INCOMING_CALL_STATUS.RINGING,
      participant: {
        id: normalizeText(contactId, '', 120),
        name: contactName,
        phoneNumber: normalizeText(phoneNumber, '', 40),
      },
      relationshipBinding,
      sourceModule: normalizeText(sourceModule, 'phone_incoming', 40),
      sourceId: normalizeText(sourceId, '', 160),
      startedAt: now,
    }
    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      incomingCallTimerId = setTimeout(() => {
        finalizeIncomingCallAsMissed()
      }, timeoutMs)
    }
    persistSession()
    return { ok: true, reason: '', incomingCall: incomingCall.value }
  }

  const acceptIncomingCall = () => {
    if (!incomingCall.value || incomingCall.value.status !== PHONE_INCOMING_CALL_STATUS.RINGING) {
      return null
    }
    clearIncomingCallTimer()
    incomingCall.value = {
      ...incomingCall.value,
      status: PHONE_INCOMING_CALL_STATUS.ACCEPTED,
    }
    persistSession()
    return incomingCall.value
  }

  const consumeAcceptedIncomingCall = () => {
    if (!incomingCall.value || incomingCall.value.status !== PHONE_INCOMING_CALL_STATUS.ACCEPTED) {
      return null
    }
    const accepted = incomingCall.value
    incomingCall.value = null
    persistSession()
    return accepted
  }

  const declineIncomingCall = () => {
    if (!incomingCall.value || incomingCall.value.status !== PHONE_INCOMING_CALL_STATUS.RINGING) {
      return null
    }
    clearIncomingCallTimer()
    const contactName = incomingCall.value.participant.name
    const call = logIncomingCall({
      status: PHONE_CALL_STATUS.DECLINED,
      summary: `Declined call from ${contactName}.`,
    })
    incomingCall.value = null
    persistSession()
    return call
  }

  const startCallSession = ({
    participant = {},
    sourceModule = 'phone',
    sourceId = '',
    orderId = '',
    conversationId = '',
    journeyId = '',
    serviceCaseId = '',
    eventInstanceId = '',
    destinationAnchorId = '',
    resolutionContractKey = 'commerce.destination_change.v1',
    now = Date.now(),
  } = {}) => {
    const name = normalizeText(participant.name, '', 80)
    if (!name) return { ok: false, reason: 'participant_required', session: null }
    if (activeSession.value && activeSession.value.status !== PHONE_CALL_SESSION_STATUS.ENDED) {
      return { ok: true, reason: 'active_session', session: activeSession.value }
    }
    const session = normalizeCallSession({
      id: `phone_session_${now}_${Math.random().toString(36).slice(2, 8)}`,
      status: PHONE_CALL_SESSION_STATUS.CONNECTED,
      participant,
      sourceModule,
      sourceId,
      orderId,
      conversationId,
      journeyId,
      serviceCaseId,
      eventInstanceId,
      destinationAnchorId,
      resolutionContractKey,
      startedAt: now,
      connectedAt: now,
      updatedAt: now,
    })
    if (!session) return { ok: false, reason: 'session_invalid', session: null }
    const greetingText = resolvePhoneCopy({
      zh: '【引擎声】你好，我是负责这笔订单的配送员。',
      en: '(engine hum) Hello, this is your delivery rider.',
    })
    session.turns.push(normalizeCallTurn({
      speaker: 'rider',
      text: greetingText,
      spokenText: greetingText.replace(/^(?:\([^)]*\)|【[^】]*】)\s*/, ''),
      voiceTone: 'careful, slightly rushed',
      soundscape: 'engine hum',
      createdAt: now,
    }))
    activeSession.value = session
    persistSession()
    return { ok: true, reason: '', session }
  }

  const createCallLifecycleFacts = (sessionId = activeSession.value?.id, now = Date.now()) => {
    const session = activeSession.value?.id === sessionId ? activeSession.value : null
    if (!session || !session.eventInstanceId) return []
    return [
      normalizeOwnerFactV1({
        schemaVersion: 1,
        id: `fact_${session.id}_call_started`,
        type: 'phone.call_started',
        sourceModule: 'phone',
        subjectRef: { kind: 'call_session', id: session.id, revision: 1 },
        correlationId: session.eventInstanceId,
        causationId: session.serviceCaseId,
        resultCode: 'call_started',
        refs: { service_case_id: session.serviceCaseId },
        occurredAt: session.startedAt || now,
      }),
      normalizeOwnerFactV1({
        schemaVersion: 1,
        id: `fact_${session.id}_call_connected`,
        type: 'phone.call_connected',
        sourceModule: 'phone',
        subjectRef: { kind: 'call_session', id: session.id, revision: 2 },
        correlationId: session.eventInstanceId,
        causationId: session.serviceCaseId,
        resultCode: 'call_connected',
        refs: { service_case_id: session.serviceCaseId },
        occurredAt: session.connectedAt || now,
      }),
    ].filter(Boolean)
  }

  const appendCallTurn = ({ speaker = 'user', text = '', spokenText = '', voiceTone = '', soundscape = '', delivery = 'text', now = Date.now() } = {}) => {
    if (!activeSession.value) return null
    const turn = normalizeCallTurn({
      id: `phone_turn_${now}_${Math.random().toString(36).slice(2, 8)}`,
      speaker,
      text,
      spokenText,
      voiceTone,
      soundscape,
      delivery,
      createdAt: now,
    })
    if (!turn) return null
    activeSession.value.turns = [...activeSession.value.turns, turn].slice(-PHONE_CALL_TURN_LIMIT)
    activeSession.value.updatedAt = now
    persistSession()
    return turn
  }

  const sendCallText = ({ text = '', now = Date.now() } = {}) => {
    const userText = normalizeText(text, '', 800)
    if (!activeSession.value || !userText) return { ok: false, reason: 'session_unavailable', reply: null, proposal: null }
    appendCallTurn({ speaker: 'user', text: userText, spokenText: userText, now })
    const declineIntent = /cannot|can't|won't|decline|refuse|too far|不改|不能|拒绝/i.test(userText)
    const addressIntent = /address|change|wrong|studio|location|楼|号|路|地址|改到|改送/i.test(userText)
    const outcomeCode = declineIntent
      ? DESTINATION_CHANGE_RESOLUTION_OUTCOME.DECLINED
      : addressIntent && activeSession.value.destinationAnchorId
        ? DESTINATION_CHANGE_RESOLUTION_OUTCOME.ACCEPTED
        : DESTINATION_CHANGE_RESOLUTION_OUTCOME.UNCLEAR
    const replyText = outcomeCode === DESTINATION_CHANGE_RESOLUTION_OUTCOME.ACCEPTED
      ? resolvePhoneCopy({
          zh: '【纸张翻动声，远处有引擎声】可以，我会改送到新地址。请返回外卖订单查看处理结果。',
          en: '(paper rustle; engine hum) I can update the delivery address. Please return to Food Delivery for confirmation.',
        })
      : outcomeCode === DESTINATION_CHANGE_RESOLUTION_OUTCOME.DECLINED
        ? resolvePhoneCopy({
            zh: '【道路环境声】现在无法更改路线，订单会继续送往原地址。',
            en: '(road noise) I cannot change the route now. The order will continue to the original address.',
          })
        : resolvePhoneCopy({
            zh: '【道路环境声】我正在核对订单，请告诉我需要改送到哪个地址。',
            en: '(road noise) I am checking the order details now. Please tell me the address you want to use.',
          })
    const reply = appendCallTurn({
      speaker: 'rider',
      text: replyText,
      spokenText: replyText.replace(/^(?:\([^)]*\)|【[^】]*】)\s*/, ''),
      voiceTone: outcomeCode === DESTINATION_CHANGE_RESOLUTION_OUTCOME.ACCEPTED
        ? 'focused and reassuring'
        : 'polite and attentive',
      soundscape: outcomeCode === DESTINATION_CHANGE_RESOLUTION_OUTCOME.ACCEPTED
        ? 'paper rustle; engine hum'
        : 'road noise',
      now: now + 1,
    })
    const proposal = upsertInteractionResolution({
      schemaVersion: 1,
      ownerModule: 'phone',
      sessionId: activeSession.value.id,
      resolutionContractKey: activeSession.value.resolutionContractKey,
      outcomeCode,
      status: 'proposed',
      commitments: outcomeCode === DESTINATION_CHANGE_RESOLUTION_OUTCOME.ACCEPTED
        ? [
            {
              actorRef: activeSession.value.participant.id || activeSession.value.participant.name,
              action: 'change_destination',
              objectRef: activeSession.value.destinationAnchorId,
              status: 'accepted',
              evidenceMessageIds: [reply.id],
            },
          ]
        : outcomeCode === DESTINATION_CHANGE_RESOLUTION_OUTCOME.DECLINED
          ? [
              {
                actorRef: activeSession.value.participant.id || activeSession.value.participant.name,
                action: 'change_destination',
                objectRef: activeSession.value.destinationAnchorId || activeSession.value.orderId,
                status: 'declined',
                evidenceMessageIds: [reply.id],
              },
            ]
          : [],
      resolvedAt: now + 1,
    })
    activeSession.value.resolutionProposal = proposal
    activeSession.value.updatedAt = now + 1
    persistSession()
    return { ok: true, reason: '', reply, proposal }
  }

  const createInteractionResolutionFact = (sessionId = activeSession.value?.id, now = Date.now()) => {
    const session = activeSession.value?.id === sessionId ? activeSession.value : null
    const resolution = getInteractionResolution(sessionId)
    if (!session || !resolution || !session.eventInstanceId) return null
    return normalizeOwnerFactV1({
      schemaVersion: 1,
      id: `fact_${session.id}_interaction_resolution`,
      type: 'phone.interaction_resolution_proposed',
      sourceModule: 'phone',
      subjectRef: { kind: 'interaction_resolution', id: session.id, revision: 1 },
      correlationId: session.eventInstanceId,
      causationId: session.serviceCaseId,
      resultCode: resolution.outcomeCode,
      refs: { service_case_id: session.serviceCaseId },
      occurredAt: resolution.resolvedAt || now,
    })
  }

  const endCallSession = ({ now = Date.now(), status = PHONE_CALL_SESSION_STATUS.ENDED } = {}) => {
    if (!activeSession.value) return null
    activeSession.value.status = status
    activeSession.value.endedAt = now
    activeSession.value.updatedAt = now
    const durationSec = activeSession.value.connectedAt
      ? Math.max(0, Math.floor((now - activeSession.value.connectedAt) / 1000))
      : 0
    const call = addCallLog({
      contactName: activeSession.value.participant.name,
      phoneNumber: activeSession.value.participant.phoneNumber,
      direction: PHONE_CALL_DIRECTION.OUTGOING,
      status: status === PHONE_CALL_SESSION_STATUS.ENDED ? PHONE_CALL_STATUS.COMPLETED : PHONE_CALL_STATUS.FAILED,
      durationSec,
      summary: activeSession.value.resolutionProposal?.outcomeCode || 'Food Delivery rider call',
      sourceModule: 'phone_call_session',
      sourceId: activeSession.value.id,
      startedAt: activeSession.value.startedAt,
    })
    persistSession()
    return { session: activeSession.value, call }
  }

  const clearCallSession = () => {
    activeSession.value = null
    persistSession()
  }

  const applyPersistedSource = (source) => {
    const sourceObject = Array.isArray(source)
      ? { calls: source }
      : source && typeof source === 'object'
        ? source
        : null
    const sourceCalls = sourceObject?.calls || sourceObject?.callLogs
    if (!Array.isArray(sourceCalls)) return false
    calls.value = normalizeCallLogs(sourceCalls)
    activeSession.value = normalizeCallSession(sourceObject?.activeSession)
    interactionResolutions.value = normalizeInteractionResolutions(
      sourceObject?.interactionResolutions,
    )
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(PHONE_STORAGE_KEY, {
      version: PHONE_STORAGE_VERSION,
      migrate: migratePhoneStorage,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(PHONE_STORAGE_KEY, {
      version: PHONE_STORAGE_VERSION,
      migrate: migratePhoneStorage,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    calls: calls.value.map((item) => ({ ...item })),
    interactionResolutions: interactionResolutions.value.map((item) => ({
      ...item,
      commitments: item.commitments.map((commitment) => ({
        ...commitment,
        evidenceMessageIds: [...commitment.evidenceMessageIds],
      })),
    })),
    activeSession: activeSession.value
      ? {
          ...activeSession.value,
          participant: { ...activeSession.value.participant },
          resolutionProposal: activeSession.value.resolutionProposal
            ? { ...activeSession.value.resolutionProposal }
            : null,
          turns: activeSession.value.turns.map((turn) => ({ ...turn })),
        }
      : null,
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.phone === 'object' && snapshot.phone
        ? snapshot.phone
        : snapshot
    return applyPersistedSource(source)
  }

  const persistToStorage = () => {
    writePersistedState(PHONE_STORAGE_KEY, createBackupSnapshot(), {
      version: PHONE_STORAGE_VERSION,
      migrate: migratePhoneStorage,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    clearIncomingCallTimer()
    calls.value = []
    activeSession.value = null
    incomingCall.value = null
    interactionResolutions.value = []
  }

  const hydratedFromLocal = hydrateFromStorage()
  if (!hydratedFromLocal) {
    calls.value = createSeedCalls()
  }

  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [calls, activeSession, interactionResolutions],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    calls,
    activeSession,
    incomingCall,
    interactionResolutions,
    callSessionActive,
    callCount,
    missedCallCount,
    completedCallCount,
    recentCalls,
    hasFinishedStorageHydration,
    findCallById,
    addCallLog,
    addRoleCallLog,
    addMissedCall,
    notifyMissedCall,
    addMissedCallWithNotification,
    removeCallLog,
    anonymizeCallLog,
    cleanupRelationshipForProfile,
    receiveIncomingCall,
    acceptIncomingCall,
    consumeAcceptedIncomingCall,
    declineIncomingCall,
    finalizeIncomingCallAsMissed,
    startCallSession,
    createCallLifecycleFacts,
    appendCallTurn,
    sendCallText,
    getInteractionResolution,
    createInteractionResolutionFact,
    endCallSession,
    clearCallSession,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
