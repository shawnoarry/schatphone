import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { useCalendarStore } from './calendar'
import { useSystemStore } from './system'
import {
  anonymizeRelationshipText,
  bindingMatchesProfile,
  clearRelationshipBinding,
  normalizeRelationshipBinding,
} from '../lib/relationship-cleanup-helpers'

const PHONE_STORAGE_KEY = 'store:phone'
const PHONE_STORAGE_VERSION = 1
const PHONE_CALL_LIMIT = 200

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
  const hasFinishedStorageHydration = ref(false)

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
    })

  const addMissedCall = ({
    contactName = '',
    phoneNumber = '',
    summary = '',
    relationshipBinding = null,
  } = {}) =>
    addCallLog({
      contactName,
      phoneNumber,
      direction: PHONE_CALL_DIRECTION.MISSED,
      status: PHONE_CALL_STATUS.MISSED,
      durationSec: 0,
      summary,
      sourceModule: 'phone_manual',
      relationshipBinding,
    })

  const notifyMissedCall = (call) => {
    const payload = createMissedCallNotificationPayload(call)
    if (!payload) return ''
    const systemStore = useSystemStore()
    return systemStore.addNotification(payload)
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

  const applyPersistedSource = (source) => {
    const sourceCalls = Array.isArray(source)
      ? source
      : source && typeof source === 'object'
        ? source.calls || source.callLogs
        : null
    if (!Array.isArray(sourceCalls)) return false
    calls.value = normalizeCallLogs(sourceCalls)
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(PHONE_STORAGE_KEY, {
      version: PHONE_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(PHONE_STORAGE_KEY, {
      version: PHONE_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    calls: calls.value.map((item) => ({ ...item })),
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
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    calls.value = []
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
    calls,
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    calls,
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
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
