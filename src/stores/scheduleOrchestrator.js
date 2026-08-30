import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  readPersistedState,
  readPersistedStateAsync,
  writePersistedState,
} from '../lib/persistence'
import {
  SCHEDULE_ORCHESTRATOR_SCHEMA_VERSION,
  normalizeScheduleOrchestrationRecords,
  projectScheduleDeadlineEvaluationRequest,
  projectScheduleMaterializationRequest,
  reconcileScheduleOrchestration,
} from '../lib/schedule-orchestrator'

const SCHEDULE_ORCHESTRATOR_STORAGE_KEY = 'store:schedule-orchestrator'
const SCHEDULE_ORCHESTRATOR_STORAGE_VERSION = 2

const migrateScheduleOrchestratorStorage = ({ version, data } = {}) =>
  Number(version) === 1 && data && typeof data === 'object' && !Array.isArray(data)
    ? data
    : null

const toTimestamp = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback
}

const resolveBackupSource = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return {}
  if (snapshot.scheduleOrchestrator && typeof snapshot.scheduleOrchestrator === 'object') {
    return snapshot.scheduleOrchestrator
  }
  if (
    snapshot.calendar?.scheduleOrchestrator &&
    typeof snapshot.calendar.scheduleOrchestrator === 'object'
  ) {
    return snapshot.calendar.scheduleOrchestrator
  }
  return snapshot
}

export const useScheduleOrchestratorStore = defineStore('scheduleOrchestrator', () => {
  const records = ref([])
  const lastReconciledAt = ref(0)
  const nextReconcileAt = ref(0)
  const hasFinishedStorageHydration = ref(false)

  const pendingMaterializationRequests = computed(() =>
    records.value.map(projectScheduleMaterializationRequest).filter(Boolean),
  )
  const pendingDeadlineEvaluationRequests = computed(() =>
    records.value.map(projectScheduleDeadlineEvaluationRequest).filter(Boolean),
  )

  const findRecordById = (recordId) => {
    if (typeof recordId !== 'string' || !recordId.trim()) return null
    return records.value.find((record) => record.id === recordId.trim()) || null
  }

  const applyPersistedSource = (source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false
    records.value = normalizeScheduleOrchestrationRecords(source.records)
    lastReconciledAt.value = toTimestamp(source.lastReconciledAt, 0)
    nextReconcileAt.value = toTimestamp(source.nextReconcileAt, 0)
    return true
  }

  const createPersistedSnapshot = () => ({
    schemaVersion: SCHEDULE_ORCHESTRATOR_SCHEMA_VERSION,
    records: records.value.map((record) => ({ ...record })),
    lastReconciledAt: lastReconciledAt.value,
    nextReconcileAt: nextReconcileAt.value,
  })

  const createBackupSnapshot = () => createPersistedSnapshot()
  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => applyPersistedSource(resolveBackupSource(snapshot))

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(SCHEDULE_ORCHESTRATOR_STORAGE_KEY, {
      version: SCHEDULE_ORCHESTRATOR_STORAGE_VERSION,
      migrate: migrateScheduleOrchestratorStorage,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(SCHEDULE_ORCHESTRATOR_STORAGE_KEY, {
      version: SCHEDULE_ORCHESTRATOR_STORAGE_VERSION,
      migrate: migrateScheduleOrchestratorStorage,
    })
    return applyPersistedSource(persisted)
  }

  const persistToStorage = () =>
    writePersistedState(SCHEDULE_ORCHESTRATOR_STORAGE_KEY, createPersistedSnapshot(), {
      version: SCHEDULE_ORCHESTRATOR_STORAGE_VERSION,
      migrate: migrateScheduleOrchestratorStorage,
    })

  const reconcileCalendarSnapshot = (calendarEvents = [], options = {}) => {
    const result = reconcileScheduleOrchestration({
      calendarEvents,
      existingRecords: records.value,
      now: options.now,
      config: options.config,
    })
    records.value = result.records
    lastReconciledAt.value = result.reconciledAt
    nextReconcileAt.value = result.nextReconcileAt
    return result
  }

  const acknowledgeMaterialization = ({
    orchestrationId,
    agendaJourneyId = '',
    calendarFingerprint = '',
    acknowledgedAt = Date.now(),
  } = {}) => {
    const record = findRecordById(orchestrationId)
    if (!record || record.retiredAt) return false
    if (calendarFingerprint && calendarFingerprint !== record.calendarFingerprint) return false
    const normalizedAgendaJourneyId =
      typeof agendaJourneyId === 'string' ? agendaJourneyId.trim().slice(0, 180) : ''
    const linkedAgendaJourneyId = normalizedAgendaJourneyId || record.agendaJourneyId
    if (!linkedAgendaJourneyId || !record.materializationRevision) return false
    records.value = records.value.map((item) =>
      item.id === record.id
        ? {
            ...item,
            agendaJourneyId: linkedAgendaJourneyId,
            materializationAcknowledgedRevision: item.materializationRevision,
            materializationAcknowledgedAt: toTimestamp(acknowledgedAt, Date.now()),
            materializationBlockedCode: '',
            materializationBlockedAt: 0,
            updatedAt: toTimestamp(acknowledgedAt, Date.now()),
          }
        : item,
    )
    return true
  }

  const recordMaterializationBlock = ({
    orchestrationId,
    calendarFingerprint = '',
    code = '',
    blockedAt = Date.now(),
  } = {}) => {
    const record = findRecordById(orchestrationId)
    const normalizedCode = typeof code === 'string' ? code.trim().slice(0, 120) : ''
    if (!record || record.retiredAt || !normalizedCode) return false
    if (calendarFingerprint && calendarFingerprint !== record.calendarFingerprint) return false
    records.value = records.value.map((item) =>
      item.id === record.id
        ? {
            ...item,
            materializationBlockedCode: normalizedCode,
            materializationBlockedAt: toTimestamp(blockedAt, Date.now()),
            updatedAt: toTimestamp(blockedAt, Date.now()),
          }
        : item,
    )
    return true
  }

  const acknowledgeDeadlineEvaluation = ({
    orchestrationId,
    calendarFingerprint = '',
    acknowledgedAt = Date.now(),
  } = {}) => {
    const record = findRecordById(orchestrationId)
    if (!record || record.retiredAt || !record.deadlineEvaluationRevision) return false
    if (calendarFingerprint && calendarFingerprint !== record.calendarFingerprint) return false
    records.value = records.value.map((item) =>
      item.id === record.id
        ? {
            ...item,
            deadlineEvaluationAcknowledgedRevision: item.deadlineEvaluationRevision,
            deadlineEvaluationAcknowledgedAt: toTimestamp(acknowledgedAt, Date.now()),
            updatedAt: toTimestamp(acknowledgedAt, Date.now()),
          }
        : item,
    )
    return true
  }

  const saveNow = () => persistToStorage()

  const resetForTesting = () => {
    records.value = []
    lastReconciledAt.value = 0
    nextReconcileAt.value = 0
  }

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) await hydrateFromStorageAsync()
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [records, lastReconciledAt, nextReconcileAt],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    records,
    lastReconciledAt,
    nextReconcileAt,
    hasFinishedStorageHydration,
    pendingMaterializationRequests,
    pendingDeadlineEvaluationRequests,
    findRecordById,
    reconcileCalendarSnapshot,
    acknowledgeMaterialization,
    recordMaterializationBlock,
    acknowledgeDeadlineEvaluation,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    saveNow,
    resetForTesting,
  }
})
