import {
  ACTIVITY_SESSION_EVENT_ADAPTER_KEY,
  ACTIVITY_SESSION_EVENT_ELIGIBLE_CHECKPOINT_TYPE,
  ACTIVITY_SESSION_EVENT_ID,
  ACTIVITY_SESSION_EVENT_RESOLUTION_MODE,
  createActivitySessionEventRecordId,
  resolveActivitySessionEventDurationAdjustment,
} from './activity-session-event-interface'

const MAX_TIMESTAMP = 8_640_000_000_000_000
const MIN_DURATION_MS = 60_000
const MAX_DURATION_MS = 12 * 60 * 60 * 1000
const SESSION_LIMIT = 300
const EVENT_RESOLUTION_LIMIT = 8

export const ACTIVITY_SESSION_SCHEMA_VERSION = 3

export const ACTIVITY_SESSION_STATUS = Object.freeze({
  PLANNED: 'planned',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
})

export const ACTIVITY_SESSION_COMPLETION_POLICY = Object.freeze({
  DURATION_SUFFICIENT: 'duration_sufficient',
  USER_CONFIRMATION: 'user_confirmation',
})

export const ACTIVITY_SESSION_PAUSE_POLICY = Object.freeze({
  CONTINUOUS: 'continuous',
  ALLOW_PAUSE: 'allow_pause',
})

export const ACTIVITY_SESSION_SCENE = Object.freeze({
  QUIET_HORIZON: 'quiet_horizon',
})

const TERMINAL_STATUSES = new Set([
  ACTIVITY_SESSION_STATUS.COMPLETED,
  ACTIVITY_SESSION_STATUS.CANCELLED,
])

const trimLine = (value, fallback = '', max = 220) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const toTimestamp = (value, fallback = 0) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(MAX_TIMESTAMP, Math.max(0, Math.floor(numeric)))
}

const normalizeDuration = (value, fallback = MIN_DURATION_MS) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.min(MAX_DURATION_MS, Math.max(MIN_DURATION_MS, Math.floor(numeric)))
}

const normalizeStatus = (value) =>
  Object.values(ACTIVITY_SESSION_STATUS).includes(value)
    ? value
    : ACTIVITY_SESSION_STATUS.PLANNED

const normalizeCompletionPolicy = (value) =>
  Object.values(ACTIVITY_SESSION_COMPLETION_POLICY).includes(value)
    ? value
    : ACTIVITY_SESSION_COMPLETION_POLICY.USER_CONFIRMATION

const normalizePausePolicy = (value) =>
  Object.values(ACTIVITY_SESSION_PAUSE_POLICY).includes(value)
    ? value
    : ACTIVITY_SESSION_PAUSE_POLICY.ALLOW_PAUSE

export const createActivitySessionId = (agendaJourneyStepId) => {
  const stepId = trimLine(agendaJourneyStepId, '', 180)
  return stepId ? `activity-session::${stepId}` : ''
}

export const createActivitySessionCheckpointPlan = (
  activitySessionId,
  plannedDurationMs,
) => {
  const sessionId = trimLine(activitySessionId, '', 220)
  const durationMs = normalizeDuration(plannedDurationMs)
  if (!sessionId) return []
  return [
    {
      id: `${sessionId}::midpoint`,
      type: 'duration_milestone',
      offsetMs: Math.max(MIN_DURATION_MS, Math.floor(durationMs * 0.5)),
    },
    {
      id: `${sessionId}::near-completion`,
      type: 'near_completion',
      offsetMs: Math.max(MIN_DURATION_MS, Math.floor(durationMs * 0.9)),
    },
    {
      id: `${sessionId}::duration-elapsed`,
      type: 'duration_elapsed',
      offsetMs: durationMs,
    },
  ].filter(
    (checkpoint, index, checkpoints) =>
      checkpoints.findIndex((candidate) => candidate.offsetMs === checkpoint.offsetMs) === index,
  )
}

const normalizeProcessedCheckpointIds = (raw, checkpointPlan) => {
  if (!Array.isArray(raw)) return []
  const allowed = new Set(checkpointPlan.map((checkpoint) => checkpoint.id))
  return [...new Set(raw.map((value) => trimLine(value, '', 260)).filter((id) => allowed.has(id)))]
}

const normalizeEventResolutions = (raw, activitySessionId, checkpointPlan) => {
  if (!Array.isArray(raw)) return []
  const checkpointIds = new Set(checkpointPlan.map((checkpoint) => checkpoint.id))
  const byId = new Map()
  raw.forEach((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return
    const checkpointId = trimLine(entry.checkpointId, '', 260)
    const checkpoint = checkpointPlan.find((item) => item.id === checkpointId)
    const eventRecordId = createActivitySessionEventRecordId(activitySessionId, checkpointId)
    const durationAdjustmentMs = resolveActivitySessionEventDurationAdjustment(entry.outcomeId)
    const resolutionMode = Object.values(ACTIVITY_SESSION_EVENT_RESOLUTION_MODE).includes(
      entry.resolutionMode,
    )
      ? entry.resolutionMode
      : ''
    const resolvedAt = toTimestamp(entry.resolvedAt, 0)
    if (
      !eventRecordId ||
      trimLine(entry.eventRecordId, '', 720) !== eventRecordId ||
      trimLine(entry.eventId, '', 220) !== ACTIVITY_SESSION_EVENT_ID ||
      trimLine(entry.adapterKey, '', 220) !== ACTIVITY_SESSION_EVENT_ADAPTER_KEY ||
      !checkpointIds.has(checkpointId) ||
      checkpoint?.type !== ACTIVITY_SESSION_EVENT_ELIGIBLE_CHECKPOINT_TYPE ||
      durationAdjustmentMs == null ||
      !resolutionMode ||
      !trimLine(entry.runtimeLogId, '', 220) ||
      !resolvedAt
    ) {
      return
    }
    const normalized = {
      eventRecordId,
      eventId: ACTIVITY_SESSION_EVENT_ID,
      adapterKey: ACTIVITY_SESSION_EVENT_ADAPTER_KEY,
      checkpointId,
      outcomeId: trimLine(entry.outcomeId, '', 80),
      durationAdjustmentMs,
      resolutionMode,
      runtimeLogId: trimLine(entry.runtimeLogId, '', 220),
      resolvedAt,
    }
    const current = byId.get(eventRecordId)
    if (!current || normalized.resolvedAt >= current.resolvedAt) {
      byId.set(eventRecordId, normalized)
    }
  })
  return [...byId.values()]
    .sort(
      (left, right) =>
        left.resolvedAt - right.resolvedAt ||
        left.eventRecordId.localeCompare(right.eventRecordId),
    )
    .slice(-EVENT_RESOLUTION_LIMIT)
}

const getEventDurationAdjustmentMs = (eventResolutions = []) =>
  eventResolutions.reduce(
    (total, resolution) => total + Math.max(0, Number(resolution.durationAdjustmentMs) || 0),
    0,
  )

export const getActivitySessionEffectiveDurationMs = (rawSession) => {
  const session = normalizeActivitySession(rawSession)
  return session?.effectiveDurationMs || 0
}

export const normalizeActivitySession = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const agendaJourneyId = trimLine(raw.agendaJourneyId, '', 180)
  const agendaJourneyStepId = trimLine(raw.agendaJourneyStepId, '', 180)
  const id = createActivitySessionId(agendaJourneyStepId)
  if (!id || !agendaJourneyId || !agendaJourneyStepId) return null

  const plannedDurationMs = normalizeDuration(raw.plannedDurationMs)
  const status = normalizeStatus(raw.status)
  const startedAt = toTimestamp(raw.startedAt, 0)
  const accumulatedPausedMs = toTimestamp(raw.accumulatedPausedMs, 0)
  const checkpointPlan = createActivitySessionCheckpointPlan(id, plannedDurationMs)
  const eventResolutions = normalizeEventResolutions(raw.eventResolutions, id, checkpointPlan)
  const eventDurationAdjustmentMs = getEventDurationAdjustmentMs(eventResolutions)
  const effectiveDurationMs = Math.min(
    MAX_DURATION_MS,
    plannedDurationMs + eventDurationAdjustmentMs,
  )
  const derivedEndsAt = startedAt
    ? Math.min(MAX_TIMESTAMP, startedAt + effectiveDurationMs + accumulatedPausedMs)
    : 0
  const completedAt = toTimestamp(raw.completedAt, 0)
  const cancelledAt = toTimestamp(raw.cancelledAt, 0)

  return {
    id,
    schemaVersion: ACTIVITY_SESSION_SCHEMA_VERSION,
    agendaJourneyId,
    agendaJourneyStepId,
    agendaExecutionRevision: trimLine(raw.agendaExecutionRevision, '', 80),
    sourceCalendarEventId: trimLine(raw.sourceCalendarEventId, '', 140),
    sourceMapJourneyId: trimLine(raw.sourceMapJourneyId, '', 180),
    plannedDurationMs,
    effectiveDurationMs,
    eventDurationAdjustmentMs,
    completionPolicy: normalizeCompletionPolicy(raw.completionPolicy),
    pausePolicy: normalizePausePolicy(raw.pausePolicy),
    status,
    startedAt,
    endsAt: derivedEndsAt,
    pausedAt:
      status === ACTIVITY_SESSION_STATUS.PAUSED ? toTimestamp(raw.pausedAt, startedAt) : 0,
    accumulatedPausedMs,
    completedAt: status === ACTIVITY_SESSION_STATUS.COMPLETED ? completedAt : 0,
    cancelledAt: status === ACTIVITY_SESSION_STATUS.CANCELLED ? cancelledAt : 0,
    completionReason: trimLine(raw.completionReason, '', 80),
    checkpointPlan,
    processedCheckpointIds: normalizeProcessedCheckpointIds(
      raw.processedCheckpointIds,
      checkpointPlan,
    ),
    eventResolutions,
    ownerCompletionAcknowledgedAt: toTimestamp(raw.ownerCompletionAcknowledgedAt, 0),
    presentation: {
      minimized: raw.presentation?.minimized === true,
      sceneId: ACTIVITY_SESSION_SCENE.QUIET_HORIZON,
    },
    createdAt: toTimestamp(raw.createdAt, 0),
    updatedAt: toTimestamp(raw.updatedAt, 0),
  }
}

export const normalizeActivitySessions = (raw = []) => {
  if (!Array.isArray(raw)) return []
  const byId = new Map()
  raw.forEach((entry) => {
    const normalized = normalizeActivitySession(entry)
    if (!normalized) return
    const current = byId.get(normalized.id)
    if (!current || normalized.updatedAt >= current.updatedAt) byId.set(normalized.id, normalized)
  })
  return [...byId.values()]
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
    .slice(-SESSION_LIMIT)
}

export const createActivitySession = (request = {}, { now = Date.now() } = {}) => {
  const createdAt = toTimestamp(now, Date.now())
  const agendaJourneyId = trimLine(request.agendaJourneyId, '', 180)
  const agendaJourneyStepId = trimLine(request.agendaJourneyStepId, '', 180)
  if (
    request.sourceOwner !== 'agenda-journey' ||
    request.sourceStepKind !== 'activity' ||
    !['available', 'active'].includes(request.sourceStepStatus) ||
    !agendaJourneyId ||
    !agendaJourneyStepId
  ) {
    return { ok: false, code: 'ACTIVITY_SESSION_SOURCE_INVALID', session: null }
  }

  const id = createActivitySessionId(agendaJourneyStepId)
  const session = normalizeActivitySession({
    id,
    agendaJourneyId,
    agendaJourneyStepId,
    agendaExecutionRevision: request.agendaExecutionRevision,
    sourceCalendarEventId: request.sourceCalendarEventId,
    sourceMapJourneyId: request.sourceMapJourneyId,
    plannedDurationMs: request.plannedDurationMs,
    completionPolicy: request.completionPolicy,
    pausePolicy: request.pausePolicy,
    status: ACTIVITY_SESSION_STATUS.PLANNED,
    createdAt,
    updatedAt: createdAt,
  })
  return session
    ? { ok: true, code: 'ACTIVITY_SESSION_CREATED', session }
    : { ok: false, code: 'ACTIVITY_SESSION_NORMALIZATION_FAILED', session: null }
}

export const startActivitySession = (rawSession, { now = Date.now() } = {}) => {
  const session = normalizeActivitySession(rawSession)
  if (!session) return { ok: false, code: 'ACTIVITY_SESSION_MISSING', session: null }
  if (session.status === ACTIVITY_SESSION_STATUS.RUNNING) {
    return { ok: true, code: 'ACTIVITY_SESSION_ALREADY_RUNNING', session }
  }
  if (session.status !== ACTIVITY_SESSION_STATUS.PLANNED) {
    return { ok: false, code: 'ACTIVITY_SESSION_NOT_STARTABLE', session: null }
  }
  const startedAt = toTimestamp(now, Date.now())
  return {
    ok: true,
    code: 'ACTIVITY_SESSION_STARTED',
    session: normalizeActivitySession({
      ...session,
      status: ACTIVITY_SESSION_STATUS.RUNNING,
      startedAt,
      endsAt: startedAt + session.plannedDurationMs,
      processedCheckpointIds: [],
      updatedAt: startedAt,
    }),
  }
}

const elapsedAt = (session, now) => {
  if (!session.startedAt) return 0
  const terminalAt = session.completedAt || session.cancelledAt
  const anchor =
    session.status === ACTIVITY_SESSION_STATUS.PAUSED
      ? session.pausedAt
      : terminalAt || toTimestamp(now, Date.now())
  return Math.max(0, anchor - session.startedAt - session.accumulatedPausedMs)
}

const processDueCheckpoints = (session, now) => {
  const elapsedMs = elapsedAt(session, now)
  const processed = new Set(session.processedCheckpointIds)
  session.checkpointPlan.forEach((checkpoint) => {
    if (elapsedMs >= checkpoint.offsetMs) processed.add(checkpoint.id)
  })
  return [...processed]
}

export const pauseActivitySession = (rawSession, { now = Date.now() } = {}) => {
  const session = normalizeActivitySession(rawSession)
  if (!session) return { ok: false, code: 'ACTIVITY_SESSION_MISSING', session: null }
  if (session.pausePolicy !== ACTIVITY_SESSION_PAUSE_POLICY.ALLOW_PAUSE) {
    return { ok: false, code: 'ACTIVITY_SESSION_PAUSE_DISALLOWED', session: null }
  }
  if (session.status !== ACTIVITY_SESSION_STATUS.RUNNING) {
    return { ok: false, code: 'ACTIVITY_SESSION_NOT_RUNNING', session: null }
  }
  const pausedAt = toTimestamp(now, Date.now())
  if (pausedAt >= session.endsAt) {
    return { ok: false, code: 'ACTIVITY_SESSION_DURATION_ALREADY_ELAPSED', session: null }
  }
  return {
    ok: true,
    code: 'ACTIVITY_SESSION_PAUSED',
    session: normalizeActivitySession({
      ...session,
      status: ACTIVITY_SESSION_STATUS.PAUSED,
      pausedAt,
      processedCheckpointIds: processDueCheckpoints(session, pausedAt),
      updatedAt: pausedAt,
    }),
  }
}

export const resumeActivitySession = (rawSession, { now = Date.now() } = {}) => {
  const session = normalizeActivitySession(rawSession)
  if (!session) return { ok: false, code: 'ACTIVITY_SESSION_MISSING', session: null }
  if (session.status !== ACTIVITY_SESSION_STATUS.PAUSED || !session.pausedAt) {
    return { ok: false, code: 'ACTIVITY_SESSION_NOT_PAUSED', session: null }
  }
  const resumedAt = toTimestamp(now, Date.now())
  const pausedDurationMs = Math.max(0, resumedAt - session.pausedAt)
  return {
    ok: true,
    code: 'ACTIVITY_SESSION_RESUMED',
    session: normalizeActivitySession({
      ...session,
      status: ACTIVITY_SESSION_STATUS.RUNNING,
      pausedAt: 0,
      accumulatedPausedMs: session.accumulatedPausedMs + pausedDurationMs,
      endsAt: session.endsAt + pausedDurationMs,
      updatedAt: resumedAt,
    }),
  }
}

export const completeActivitySession = (
  rawSession,
  { now = Date.now(), reason = 'user_confirmation' } = {},
) => {
  const session = normalizeActivitySession(rawSession)
  if (!session) return { ok: false, code: 'ACTIVITY_SESSION_MISSING', session: null }
  if (![ACTIVITY_SESSION_STATUS.RUNNING, ACTIVITY_SESSION_STATUS.PAUSED].includes(session.status)) {
    return { ok: false, code: 'ACTIVITY_SESSION_NOT_COMPLETABLE', session: null }
  }
  const completedAt = toTimestamp(now, Date.now())
  if (
    session.completionPolicy === ACTIVITY_SESSION_COMPLETION_POLICY.DURATION_SUFFICIENT &&
    elapsedAt(session, completedAt) < session.effectiveDurationMs
  ) {
    return { ok: false, code: 'ACTIVITY_SESSION_DURATION_NOT_ELAPSED', session: null }
  }
  const currentPauseMs =
    session.status === ACTIVITY_SESSION_STATUS.PAUSED
      ? Math.max(0, completedAt - session.pausedAt)
      : 0
  return {
    ok: true,
    code: 'ACTIVITY_SESSION_COMPLETED',
    session: normalizeActivitySession({
      ...session,
      status: ACTIVITY_SESSION_STATUS.COMPLETED,
      pausedAt: 0,
      accumulatedPausedMs: session.accumulatedPausedMs + currentPauseMs,
      completedAt,
      completionReason: reason,
      processedCheckpointIds: processDueCheckpoints(session, completedAt),
      updatedAt: completedAt,
    }),
  }
}

export const cancelActivitySession = (
  rawSession,
  { now = Date.now(), reason = 'source_cancelled' } = {},
) => {
  const session = normalizeActivitySession(rawSession)
  if (!session || TERMINAL_STATUSES.has(session.status)) return session
  const cancelledAt = toTimestamp(now, Date.now())
  const currentPauseMs =
    session.status === ACTIVITY_SESSION_STATUS.PAUSED
      ? Math.max(0, cancelledAt - session.pausedAt)
      : 0
  return normalizeActivitySession({
    ...session,
    status: ACTIVITY_SESSION_STATUS.CANCELLED,
    pausedAt: 0,
    accumulatedPausedMs: session.accumulatedPausedMs + currentPauseMs,
    cancelledAt,
    completionReason: reason,
    processedCheckpointIds: processDueCheckpoints(session, cancelledAt),
    updatedAt: cancelledAt,
  })
}

export const reconcileActivitySession = (
  rawSession,
  { now = Date.now(), checkpointsOnly = false } = {},
) => {
  const session = normalizeActivitySession(rawSession)
  if (!session || TERMINAL_STATUSES.has(session.status)) return session
  const reconciledAt = toTimestamp(now, Date.now())
  if (![ACTIVITY_SESSION_STATUS.RUNNING, ACTIVITY_SESSION_STATUS.PAUSED].includes(session.status)) {
    return session
  }

  const processedCheckpointIds = processDueCheckpoints(session, reconciledAt)
  const checkpointsChanged =
    processedCheckpointIds.length !== session.processedCheckpointIds.length
  const durationElapsed = elapsedAt(session, reconciledAt) >= session.effectiveDurationMs
  if (
    !checkpointsOnly &&
    session.status === ACTIVITY_SESSION_STATUS.RUNNING &&
    durationElapsed &&
    session.completionPolicy === ACTIVITY_SESSION_COMPLETION_POLICY.DURATION_SUFFICIENT
  ) {
    return normalizeActivitySession({
      ...session,
      status: ACTIVITY_SESSION_STATUS.COMPLETED,
      completedAt: session.endsAt,
      completionReason: 'duration_elapsed',
      processedCheckpointIds,
      updatedAt: reconciledAt,
    })
  }
  return checkpointsChanged
    ? normalizeActivitySession({ ...session, processedCheckpointIds, updatedAt: reconciledAt })
    : session
}

export const deriveActivitySessionProjection = (rawSession, { now = Date.now() } = {}) => {
  const session = normalizeActivitySession(rawSession)
  if (!session) return null
  const projectedAt = toTimestamp(now, Date.now())
  const elapsedMs = Math.min(session.effectiveDurationMs, elapsedAt(session, projectedAt))
  const remainingMs = Math.max(0, session.effectiveDurationMs - elapsedMs)
  const durationElapsed = remainingMs === 0
  return {
    sessionId: session.id,
    status: session.status,
    elapsedMs,
    remainingMs,
    progress: session.effectiveDurationMs
      ? Math.min(1, Math.max(0, elapsedMs / session.effectiveDurationMs))
      : 0,
    plannedDurationMs: session.plannedDurationMs,
    effectiveDurationMs: session.effectiveDurationMs,
    eventDurationAdjustmentMs: session.eventDurationAdjustmentMs,
    durationElapsed,
    awaitingUserConfirmation:
      durationElapsed &&
      session.completionPolicy === ACTIVITY_SESSION_COMPLETION_POLICY.USER_CONFIRMATION &&
      !TERMINAL_STATUSES.has(session.status),
    canPause:
      session.status === ACTIVITY_SESSION_STATUS.RUNNING &&
      session.pausePolicy === ACTIVITY_SESSION_PAUSE_POLICY.ALLOW_PAUSE &&
      !durationElapsed,
    canResume: session.status === ACTIVITY_SESSION_STATUS.PAUSED,
    canComplete:
      session.completionPolicy === ACTIVITY_SESSION_COMPLETION_POLICY.USER_CONFIRMATION &&
      [ACTIVITY_SESSION_STATUS.RUNNING, ACTIVITY_SESSION_STATUS.PAUSED].includes(session.status),
    isTerminal: TERMINAL_STATUSES.has(session.status),
  }
}

export const applyActivitySessionEventResolution = (
  rawSession,
  authorization = {},
  { now = Date.now() } = {},
) => {
  const session = normalizeActivitySession(rawSession)
  if (!session) return { ok: false, code: 'ACTIVITY_SESSION_MISSING', session: null }
  const checkpointId = trimLine(authorization.checkpointId, '', 260)
  const checkpoint = session.checkpointPlan.find((item) => item.id === checkpointId)
  const eventRecordId = createActivitySessionEventRecordId(session.id, checkpointId)
  const durationAdjustmentMs = resolveActivitySessionEventDurationAdjustment(
    authorization.outcomeId,
  )
  const resolvedAt = toTimestamp(authorization.resolvedAt || now, Date.now())
  const resolutionMode = Object.values(ACTIVITY_SESSION_EVENT_RESOLUTION_MODE).includes(
    authorization.resolutionMode,
  )
    ? authorization.resolutionMode
    : ''
  const resolution = {
    eventRecordId,
    eventId: ACTIVITY_SESSION_EVENT_ID,
    adapterKey: ACTIVITY_SESSION_EVENT_ADAPTER_KEY,
    checkpointId,
    outcomeId: trimLine(authorization.outcomeId, '', 80),
    durationAdjustmentMs,
    resolutionMode,
    runtimeLogId: trimLine(authorization.runtimeLogId, '', 220),
    resolvedAt,
  }
  const existing = session.eventResolutions.find(
    (entry) => entry.eventRecordId === eventRecordId,
  )
  if (existing) {
    return JSON.stringify(existing) === JSON.stringify(resolution)
      ? { ok: true, code: 'ACTIVITY_SESSION_EVENT_ALREADY_APPLIED', session }
      : { ok: false, code: 'ACTIVITY_SESSION_EVENT_LINEAGE_CONFLICT', session: null }
  }
  const valid = Boolean(
    authorization.authorization === 'event_runtime_resolved' &&
      trimLine(authorization.adapterKey, '', 220) === ACTIVITY_SESSION_EVENT_ADAPTER_KEY &&
      trimLine(authorization.eventId, '', 220) === ACTIVITY_SESSION_EVENT_ID &&
      trimLine(authorization.eventRecordId, '', 720) === eventRecordId &&
      trimLine(authorization.activitySessionId, '', 220) === session.id &&
      trimLine(authorization.agendaJourneyId, '', 180) === session.agendaJourneyId &&
      trimLine(authorization.agendaJourneyStepId, '', 180) ===
        session.agendaJourneyStepId &&
      checkpoint?.type === ACTIVITY_SESSION_EVENT_ELIGIBLE_CHECKPOINT_TYPE &&
      session.processedCheckpointIds.includes(checkpointId) &&
      [ACTIVITY_SESSION_STATUS.RUNNING, ACTIVITY_SESSION_STATUS.PAUSED].includes(
        session.status,
      ) &&
      durationAdjustmentMs != null &&
      resolutionMode &&
      resolution.runtimeLogId &&
      resolvedAt > 0,
  )
  if (!valid) {
    return { ok: false, code: 'ACTIVITY_SESSION_EVENT_AUTHORIZATION_INVALID', session: null }
  }
  const nextSession = normalizeActivitySession({
    ...session,
    eventResolutions: [...session.eventResolutions, resolution],
    updatedAt: Math.max(session.updatedAt, resolvedAt),
  })
  return nextSession
    ? { ok: true, code: 'ACTIVITY_SESSION_EVENT_APPLIED', session: nextSession }
    : { ok: false, code: 'ACTIVITY_SESSION_EVENT_NORMALIZATION_FAILED', session: null }
}

export const createActivitySessionCompletionEvidence = (rawSession) => {
  const session = normalizeActivitySession(rawSession)
  if (!session || session.status !== ACTIVITY_SESSION_STATUS.COMPLETED || !session.completedAt) {
    return null
  }
  return {
    owner: 'activity-session',
    type: 'activity_session_completion',
    recordId: session.id,
    agendaJourneyId: session.agendaJourneyId,
    agendaJourneyStepId: session.agendaJourneyStepId,
    agendaExecutionRevision: session.agendaExecutionRevision,
    status: 'completed',
    completionPolicy: session.completionPolicy,
    completionReason: session.completionReason,
    observedAt: session.completedAt,
  }
}
