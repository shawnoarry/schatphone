import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  readPersistedState,
  readPersistedStateAsync,
  writePersistedState,
} from '../lib/persistence'
import {
  ACTIVITY_SESSION_SCHEMA_VERSION,
  ACTIVITY_SESSION_STATUS,
  applyActivitySessionEventResolution,
  cancelActivitySession,
  completeActivitySession,
  createActivitySession,
  normalizeActivitySession,
  normalizeActivitySessions,
  pauseActivitySession,
  reconcileActivitySession,
  resumeActivitySession,
  startActivitySession,
} from '../lib/activity-session'

const ACTIVITY_SESSION_STORAGE_KEY = 'store:activity-session'
const ACTIVITY_SESSION_STORAGE_VERSION = 3

export const migrateActivitySessionStorage = ({ version, data } = {}) => {
  if (
    ![1, 2].includes(Number(version)) ||
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data)
  ) {
    return null
  }
  if (Number(version) === 2) return data
  return {
    ...data,
    schemaVersion: ACTIVITY_SESSION_SCHEMA_VERSION,
    sessions: Array.isArray(data.sessions)
      ? data.sessions.map((session) => ({
          ...session,
          eventResolutions: [],
        }))
      : [],
  }
}

const toTimestamp = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback
}

const resolveBackupSource = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return {}
  if (snapshot.activitySession && typeof snapshot.activitySession === 'object') {
    return snapshot.activitySession
  }
  if (snapshot.calendar && typeof snapshot.calendar === 'object') {
    return snapshot.calendar.activitySession && typeof snapshot.calendar.activitySession === 'object'
      ? snapshot.calendar.activitySession
      : {}
  }
  return Array.isArray(snapshot.sessions) ? snapshot : {}
}

const isLiveSession = (session) =>
  [
    ACTIVITY_SESSION_STATUS.PLANNED,
    ACTIVITY_SESSION_STATUS.RUNNING,
    ACTIVITY_SESSION_STATUS.PAUSED,
  ].includes(session?.status)

export const useActivitySessionStore = defineStore('activitySession', () => {
  const sessions = ref([])
  const lastReconciledAt = ref(0)
  const hasFinishedStorageHydration = ref(false)

  const orderedSessions = computed(() =>
    [...sessions.value].sort(
      (left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id),
    ),
  )
  const liveSession = computed(
    () => orderedSessions.value.find((session) => isLiveSession(session)) || null,
  )
  const pendingOwnerCompletions = computed(() =>
    orderedSessions.value.filter(
      (session) =>
        session.status === ACTIVITY_SESSION_STATUS.COMPLETED &&
        !session.ownerCompletionAcknowledgedAt,
    ),
  )

  const findSessionById = (sessionId) => {
    if (typeof sessionId !== 'string' || !sessionId.trim()) return null
    return sessions.value.find((session) => session.id === sessionId.trim()) || null
  }

  const findSessionByStepId = (stepId) => {
    if (typeof stepId !== 'string' || !stepId.trim()) return null
    return sessions.value.find((session) => session.agendaJourneyStepId === stepId.trim()) || null
  }

  const replaceSession = (rawSession) => {
    const normalized = normalizeActivitySession(rawSession)
    if (!normalized) return false
    const index = sessions.value.findIndex((session) => session.id === normalized.id)
    if (index < 0) sessions.value = normalizeActivitySessions([...sessions.value, normalized])
    else {
      const next = [...sessions.value]
      next[index] = normalized
      sessions.value = normalizeActivitySessions(next)
    }
    return true
  }

  const applyPersistedSource = (source) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return false
    sessions.value = normalizeActivitySessions(source.sessions)
    lastReconciledAt.value = toTimestamp(source.lastReconciledAt, 0)
    return true
  }

  const createPersistedSnapshot = () => ({
    schemaVersion: ACTIVITY_SESSION_SCHEMA_VERSION,
    sessions: sessions.value.map((session) => ({
      ...session,
      checkpointPlan: session.checkpointPlan.map((checkpoint) => ({ ...checkpoint })),
      processedCheckpointIds: [...session.processedCheckpointIds],
      eventResolutions: session.eventResolutions.map((resolution) => ({ ...resolution })),
      presentation: { ...session.presentation },
    })),
    lastReconciledAt: lastReconciledAt.value,
  })

  const createBackupSnapshot = () => createPersistedSnapshot()
  const createBackupSnapshotAsync = async () => createBackupSnapshot()
  const restoreFromBackup = (snapshot = {}) => applyPersistedSource(resolveBackupSource(snapshot))

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(ACTIVITY_SESSION_STORAGE_KEY, {
      version: ACTIVITY_SESSION_STORAGE_VERSION,
      migrate: migrateActivitySessionStorage,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(ACTIVITY_SESSION_STORAGE_KEY, {
      version: ACTIVITY_SESSION_STORAGE_VERSION,
      migrate: migrateActivitySessionStorage,
    })
    return applyPersistedSource(persisted)
  }

  const persistToStorage = () =>
    writePersistedState(ACTIVITY_SESSION_STORAGE_KEY, createPersistedSnapshot(), {
      version: ACTIVITY_SESSION_STORAGE_VERSION,
      migrate: migrateActivitySessionStorage,
    })

  const inspectStartRequest = (request = {}) => {
    const existing = findSessionByStepId(request.agendaJourneyStepId)
    if (existing) {
      const requestedRevision =
        typeof request.agendaExecutionRevision === 'string'
          ? request.agendaExecutionRevision.trim().slice(0, 80)
          : ''
      if (requestedRevision && existing.agendaExecutionRevision !== requestedRevision) {
        return {
          ok: false,
          code: 'ACTIVITY_SESSION_EXECUTION_REVISION_CONFLICT',
          session: existing,
        }
      }
      return isLiveSession(existing)
        ? { ok: true, code: 'ACTIVITY_SESSION_REUSABLE', session: existing }
        : { ok: false, code: 'ACTIVITY_SESSION_STEP_ALREADY_TERMINAL', session: existing }
    }
    const conflict = liveSession.value
    if (conflict && conflict.agendaJourneyStepId !== request.agendaJourneyStepId) {
      return { ok: false, code: 'ACTIVITY_SESSION_ACTIVE_CONFLICT', session: conflict }
    }
    return { ok: true, code: 'ACTIVITY_SESSION_START_ALLOWED', session: null }
  }

  const startForAgendaRequest = (request = {}, { now = Date.now() } = {}) => {
    const inspection = inspectStartRequest(request)
    if (!inspection.ok) return inspection
    if (inspection.session) {
      const session = inspection.session
      if (session.status === ACTIVITY_SESSION_STATUS.PLANNED) {
        const started = startActivitySession(session, { now })
        if (started.ok) replaceSession(started.session)
        return started.ok
          ? { ...started, session: findSessionById(started.session.id), reused: true }
          : started
      }
      return { ok: true, code: 'ACTIVITY_SESSION_REUSED', session, reused: true }
    }

    const created = createActivitySession(request, { now })
    if (!created.ok || !replaceSession(created.session)) return created
    const started = startActivitySession(findSessionById(created.session.id), { now })
    if (!started.ok || !replaceSession(started.session)) return started
    return { ...started, session: findSessionById(started.session.id), reused: false }
  }

  const pauseSession = (sessionId, { now = Date.now() } = {}) => {
    const result = pauseActivitySession(findSessionById(sessionId), { now })
    if (!result.ok || !replaceSession(result.session)) return result
    return { ...result, session: findSessionById(sessionId) }
  }

  const resumeSession = (sessionId, { now = Date.now() } = {}) => {
    const result = resumeActivitySession(findSessionById(sessionId), { now })
    if (!result.ok || !replaceSession(result.session)) return result
    return { ...result, session: findSessionById(sessionId) }
  }

  const completeSession = (sessionId, { now = Date.now(), reason } = {}) => {
    const result = completeActivitySession(findSessionById(sessionId), { now, reason })
    if (!result.ok || !replaceSession(result.session)) return result
    return { ...result, session: findSessionById(sessionId) }
  }

  const cancelSession = (sessionId, { now = Date.now(), reason } = {}) => {
    const cancelled = cancelActivitySession(findSessionById(sessionId), { now, reason })
    return cancelled && replaceSession(cancelled) ? findSessionById(sessionId) : null
  }

  const reconcileSessions = ({
    sourceSteps = [],
    now = Date.now(),
    checkpointsOnly = false,
  } = {}) => {
    const reconciledAt = toTimestamp(now, Date.now())
    const sourceById = new Map(
      (Array.isArray(sourceSteps) ? sourceSteps : [])
        .filter((step) => step?.id)
        .map((step) => [step.id, step]),
    )
    let changed = 0
    sessions.value.forEach((session) => {
      if (!isLiveSession(session)) return
      const sourceStep = sourceById.get(session.agendaJourneyStepId)
      let reconciled = session
      if (
        sourceStep &&
        (sourceStep.kind !== 'activity' ||
          ['completed', 'missed', 'skipped', 'cancelled'].includes(sourceStep.status))
      ) {
        reconciled = cancelActivitySession(session, {
          now: reconciledAt,
          reason:
            sourceStep.status === 'completed'
              ? 'source_step_completed_elsewhere'
              : 'source_step_terminal',
        })
      } else {
        reconciled = reconcileActivitySession(session, {
          now: reconciledAt,
          checkpointsOnly,
        })
      }
      if (JSON.stringify(reconciled) === JSON.stringify(session)) return
      if (replaceSession(reconciled)) changed += 1
    })
    if (changed) lastReconciledAt.value = reconciledAt
    return {
      changed,
      completedSessions: pendingOwnerCompletions.value,
    }
  }

  const applyEventResolution = (sessionId, authorization = {}, { now = Date.now() } = {}) => {
    const result = applyActivitySessionEventResolution(
      findSessionById(sessionId),
      authorization,
      { now },
    )
    if (!result.ok || !replaceSession(result.session)) return result
    return { ...result, session: findSessionById(sessionId) }
  }

  const acknowledgeOwnerCompletion = (sessionId, { now = Date.now() } = {}) => {
    const session = findSessionById(sessionId)
    if (!session || session.status !== ACTIVITY_SESSION_STATUS.COMPLETED) return false
    if (session.ownerCompletionAcknowledgedAt) return true
    return replaceSession({
      ...session,
      ownerCompletionAcknowledgedAt: toTimestamp(now, Date.now()),
      updatedAt: toTimestamp(now, Date.now()),
    })
  }

  const setMinimized = (sessionId, minimized) => {
    const session = findSessionById(sessionId)
    if (!session) return false
    return replaceSession({
      ...session,
      presentation: { ...session.presentation, minimized: minimized === true },
      updatedAt: Date.now(),
    })
  }

  const saveNow = () => persistToStorage()

  const resetForTesting = () => {
    sessions.value = []
    lastReconciledAt.value = 0
  }

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) await hydrateFromStorageAsync()
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [sessions, lastReconciledAt],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    sessions,
    orderedSessions,
    liveSession,
    pendingOwnerCompletions,
    lastReconciledAt,
    hasFinishedStorageHydration,
    findSessionById,
    findSessionByStepId,
    inspectStartRequest,
    startForAgendaRequest,
    pauseSession,
    resumeSession,
    completeSession,
    cancelSession,
    reconcileSessions,
    applyEventResolution,
    acknowledgeOwnerCompletion,
    setMinimized,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    saveNow,
    resetForTesting,
  }
})
