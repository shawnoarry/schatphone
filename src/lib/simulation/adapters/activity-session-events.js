import {
  ACTIVITY_SESSION_EVENT_ADAPTER_KEY,
  ACTIVITY_SESSION_EVENT_ELIGIBLE_CHECKPOINT_TYPE,
  ACTIVITY_SESSION_EVENT_ID,
  ACTIVITY_SESSION_EVENT_MODULE_KEY,
  ACTIVITY_SESSION_EVENT_OUTCOME,
  ACTIVITY_SESSION_EVENT_PRESENTATION_MODE,
  ACTIVITY_SESSION_EVENT_RESOLUTION_MODE,
  ACTIVITY_SESSION_EVENT_SCHEMA_VERSION,
  ACTIVITY_SESSION_EVENT_STATUS,
  createActivitySessionEventRecordId,
} from '../../activity-session-event-interface'
import {
  normalizeEventPolicySnapshot,
  resolveOptionalEventPolicy,
} from '../event-policy'
import { evaluateRandomGate } from '../random'

export const ACTIVITY_SESSION_EVENT_COOLDOWN_MS = 30 * 60 * 1000
export const ACTIVITY_SESSION_EVENT_DAILY_LIMIT = 2
export const ACTIVITY_SESSION_EVENT_PENDING_TTL_MS = 2 * 60 * 60 * 1000

const EVENT_STATUSES = new Set(Object.values(ACTIVITY_SESSION_EVENT_STATUS))
const PRESENTATION_MODES = new Set(Object.values(ACTIVITY_SESSION_EVENT_PRESENTATION_MODE))
const RESOLUTION_MODES = new Set(Object.values(ACTIVITY_SESSION_EVENT_RESOLUTION_MODE))
const OUTCOMES = new Set(Object.values(ACTIVITY_SESSION_EVENT_OUTCOME))
const LIVE_SESSION_STATUSES = new Set(['running', 'paused'])
const ACTIVITY_SESSION_EVENT_PROBABILITY_BY_INTENSITY = Object.freeze({
  off: 0,
  low: 0.35,
  balanced: 0.65,
  high: 1,
})

const normalizeText = (value, fallback = '', max = 220) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeTimestamp = (value, fallback = 0) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(numeric)
}

const createDayKey = (at) => new Date(normalizeTimestamp(at, Date.now())).toISOString().slice(0, 10)

const localCopy = Object.freeze({
  titleZh: '留一点恢复缓冲吗？',
  titleEn: 'Add a short recovery buffer?',
  summaryZh: '活动已经过半。你可以保持原节奏，或在本次活动末尾增加 2 分钟恢复缓冲。',
  summaryEn:
    'This activity is halfway through. Keep the current rhythm or add a two-minute recovery buffer at the end.',
  detailZh: '只调整本次活动计时，不改变日历、行程、地图状态或完成判定。',
  detailEn:
    'This only adjusts the current activity timer. Calendar, journey, Map, and completion truth stay unchanged.',
})

const normalizeSource = (rawSource = {}) => {
  const source = rawSource && typeof rawSource === 'object' ? rawSource : {}
  return {
    activitySessionId: normalizeText(source.activitySessionId, '', 220),
    activitySessionSchemaVersion: Math.max(
      0,
      Math.floor(Number(source.activitySessionSchemaVersion) || 0),
    ),
    agendaJourneyId: normalizeText(source.agendaJourneyId, '', 180),
    agendaJourneyStepId: normalizeText(source.agendaJourneyStepId, '', 180),
    sourceCalendarEventId: normalizeText(source.sourceCalendarEventId, '', 140),
    sourceMapJourneyId: normalizeText(source.sourceMapJourneyId, '', 180),
    checkpointId: normalizeText(source.checkpointId, '', 260),
    checkpointType: normalizeText(source.checkpointType, '', 80),
    checkpointObservedAt: normalizeTimestamp(source.checkpointObservedAt, 0),
    sessionStatus: normalizeText(source.sessionStatus, '', 40),
    plannedDurationMs: Math.max(0, Math.floor(Number(source.plannedDurationMs) || 0)),
    effectiveDurationMs: Math.max(0, Math.floor(Number(source.effectiveDurationMs) || 0)),
  }
}

export const normalizeActivitySessionEventRecord = (rawRecord, index = 0) => {
  if (!rawRecord || typeof rawRecord !== 'object' || Array.isArray(rawRecord)) return null
  const source = normalizeSource(rawRecord.source)
  const activitySessionId = normalizeText(
    rawRecord.activitySessionId || source.activitySessionId,
    '',
    220,
  )
  const checkpointId = normalizeText(rawRecord.checkpointId || source.checkpointId, '', 260)
  const id = createActivitySessionEventRecordId(activitySessionId, checkpointId)
  if (
    !id ||
    normalizeText(rawRecord.id, id, 720) !== id ||
    source.checkpointType !== ACTIVITY_SESSION_EVENT_ELIGIBLE_CHECKPOINT_TYPE
  ) {
    return null
  }

  const status = EVENT_STATUSES.has(rawRecord.status)
    ? rawRecord.status
    : ACTIVITY_SESSION_EVENT_STATUS.NO_EVENT
  const presentationMode = PRESENTATION_MODES.has(rawRecord.presentationMode)
    ? rawRecord.presentationMode
    : ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.OFF
  const selectedOutcome = OUTCOMES.has(rawRecord.selectedOutcome)
    ? rawRecord.selectedOutcome
    : ''
  const resolutionMode = RESOLUTION_MODES.has(rawRecord.resolutionMode)
    ? rawRecord.resolutionMode
    : ''
  const createdAt = normalizeTimestamp(rawRecord.createdAt, Date.now() - index)
  const resolvedAt = normalizeTimestamp(rawRecord.resolvedAt, 0)

  if (
    status === ACTIVITY_SESSION_EVENT_STATUS.RESOLVED &&
    (!selectedOutcome || !resolutionMode || !resolvedAt)
  ) {
    return null
  }

  return {
    id,
    schemaVersion: ACTIVITY_SESSION_EVENT_SCHEMA_VERSION,
    eventId: ACTIVITY_SESSION_EVENT_ID,
    moduleKey: ACTIVITY_SESSION_EVENT_MODULE_KEY,
    adapterKey: ACTIVITY_SESSION_EVENT_ADAPTER_KEY,
    status,
    activitySessionId,
    agendaJourneyId: normalizeText(
      rawRecord.agendaJourneyId || source.agendaJourneyId,
      '',
      180,
    ),
    agendaJourneyStepId: normalizeText(
      rawRecord.agendaJourneyStepId || source.agendaJourneyStepId,
      '',
      180,
    ),
    checkpointId,
    presentationMode,
    textSource: 'local_authored',
    ...localCopy,
    allowedOutcomes: [
      ACTIVITY_SESSION_EVENT_OUTCOME.KEEP_RHYTHM,
      ACTIVITY_SESSION_EVENT_OUTCOME.ADD_RECOVERY_BUFFER,
    ],
    selectedOutcome,
    resolutionMode,
    reason: normalizeText(rawRecord.reason, '', 180),
    source: {
      ...source,
      activitySessionId,
      agendaJourneyId: normalizeText(
        rawRecord.agendaJourneyId || source.agendaJourneyId,
        '',
        180,
      ),
      agendaJourneyStepId: normalizeText(
        rawRecord.agendaJourneyStepId || source.agendaJourneyStepId,
        '',
        180,
      ),
      checkpointId,
    },
    provenance: {
      triggerSource: 'random',
      runtimeLogId: normalizeText(rawRecord.provenance?.runtimeLogId, '', 220),
      resolutionLogId: normalizeText(rawRecord.provenance?.resolutionLogId, '', 220),
      randomValue: Math.min(1, Math.max(0, Number(rawRecord.provenance?.randomValue) || 0)),
      probability: Math.min(1, Math.max(0, Number(rawRecord.provenance?.probability) || 0)),
      policySnapshot: normalizeEventPolicySnapshot(rawRecord.provenance?.policySnapshot),
    },
    createdAt,
    expiresAt: normalizeTimestamp(
      rawRecord.expiresAt,
      createdAt + ACTIVITY_SESSION_EVENT_PENDING_TTL_MS,
    ),
    resolvedAt,
    updatedAt: normalizeTimestamp(rawRecord.updatedAt, resolvedAt || createdAt),
  }
}

export const normalizeActivitySessionEventRecords = (rawRecords) => {
  if (!Array.isArray(rawRecords)) return []
  const byId = new Map()
  rawRecords.forEach((record, index) => {
    const normalized = normalizeActivitySessionEventRecord(record, index)
    if (!normalized) return
    const existing = byId.get(normalized.id)
    if (!existing || normalized.updatedAt >= existing.updatedAt) byId.set(normalized.id, normalized)
  })
  return [...byId.values()].sort(
    (left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id),
  )
}

export const buildActivitySessionCheckpointSnapshot = (
  rawSession,
  checkpointId,
  { now = Date.now() } = {},
) => {
  if (!rawSession || typeof rawSession !== 'object') return null
  const normalizedCheckpointId = normalizeText(checkpointId, '', 260)
  const checkpoint = Array.isArray(rawSession.checkpointPlan)
    ? rawSession.checkpointPlan.find((item) => item?.id === normalizedCheckpointId)
    : null
  if (
    !checkpoint ||
    checkpoint.type !== ACTIVITY_SESSION_EVENT_ELIGIBLE_CHECKPOINT_TYPE ||
    !rawSession.processedCheckpointIds?.includes(normalizedCheckpointId)
  ) {
    return null
  }
  const source = normalizeSource({
    activitySessionId: rawSession.id,
    activitySessionSchemaVersion: rawSession.schemaVersion,
    agendaJourneyId: rawSession.agendaJourneyId,
    agendaJourneyStepId: rawSession.agendaJourneyStepId,
    sourceCalendarEventId: rawSession.sourceCalendarEventId,
    sourceMapJourneyId: rawSession.sourceMapJourneyId,
    checkpointId: normalizedCheckpointId,
    checkpointType: checkpoint.type,
    checkpointObservedAt: now,
    sessionStatus: rawSession.status,
    plannedDurationMs: rawSession.plannedDurationMs,
    effectiveDurationMs: rawSession.effectiveDurationMs,
  })
  return source.activitySessionId && source.agendaJourneyId && source.agendaJourneyStepId
    ? source
    : null
}

export const listActivitySessionEventCheckpointSnapshots = (
  sessions = [],
  { now = Date.now() } = {},
) =>
  (Array.isArray(sessions) ? sessions : []).flatMap((session) =>
    (LIVE_SESSION_STATUSES.has(session?.status) && Array.isArray(session?.checkpointPlan)
      ? session.checkpointPlan
      : [])
      .filter(
        (checkpoint) =>
          checkpoint?.type === ACTIVITY_SESSION_EVENT_ELIGIBLE_CHECKPOINT_TYPE &&
          session.processedCheckpointIds?.includes(checkpoint.id),
      )
      .map((checkpoint) =>
        buildActivitySessionCheckpointSnapshot(session, checkpoint.id, { now }),
      )
      .filter(Boolean),
  )

const recordEventLog = (simulationStore, input) =>
  simulationStore?.recordEventLog?.(input) || input

const createRecord = ({ snapshot, status, presentationMode, reason, gate, log, policy, now }) =>
  normalizeActivitySessionEventRecord({
    id: createActivitySessionEventRecordId(snapshot.activitySessionId, snapshot.checkpointId),
    status,
    activitySessionId: snapshot.activitySessionId,
    agendaJourneyId: snapshot.agendaJourneyId,
    agendaJourneyStepId: snapshot.agendaJourneyStepId,
    checkpointId: snapshot.checkpointId,
    presentationMode,
    reason,
    source: snapshot,
    provenance: {
      runtimeLogId: log?.id || '',
      randomValue: gate?.randomValue || 0,
      probability: gate?.probability || 0,
      policySnapshot: policy,
    },
    createdAt: now,
    updatedAt: now,
  })

const persistNoEvent = ({ simulationStore, snapshot, presentationMode, reason, gate, policy, now }) => {
  const log = recordEventLog(simulationStore, {
    id: `${createActivitySessionEventRecordId(snapshot.activitySessionId, snapshot.checkpointId)}::eligibility`,
    eventId: ACTIVITY_SESSION_EVENT_ID,
    moduleKey: ACTIVITY_SESSION_EVENT_MODULE_KEY,
    targetId: snapshot.activitySessionId,
    adapterKey: ACTIVITY_SESSION_EVENT_ADAPTER_KEY,
    triggerSource: 'random',
    status: 'skipped',
    reason,
    policySnapshot: policy,
    at: now,
  })
  const record = createRecord({
    snapshot,
    status: ACTIVITY_SESSION_EVENT_STATUS.NO_EVENT,
    presentationMode,
    reason,
    gate,
    log,
    policy,
    now,
  })
  return simulationStore?.upsertActivitySessionEventRecord?.(record) || record
}

const isRecordCurrentForSession = (record, session, now) =>
  Boolean(
    record &&
      session &&
      record.activitySessionId === session.id &&
      record.agendaJourneyId === session.agendaJourneyId &&
      record.agendaJourneyStepId === session.agendaJourneyStepId &&
      record.source.activitySessionSchemaVersion === session.schemaVersion &&
      record.source.checkpointType === ACTIVITY_SESSION_EVENT_ELIGIBLE_CHECKPOINT_TYPE &&
      session.processedCheckpointIds?.includes(record.checkpointId) &&
      LIVE_SESSION_STATUSES.has(session.status) &&
      now <= record.expiresAt,
  )

const failPendingRecord = ({ simulationStore, record, reason, now }) => {
  const log = recordEventLog(simulationStore, {
    id: `${record.id}::failed::${normalizeText(reason, 'stale', 80)}`,
    eventId: record.eventId,
    moduleKey: record.moduleKey,
    targetId: record.activitySessionId,
    adapterKey: record.adapterKey,
    triggerSource: 'system',
    status: 'failed',
    reason,
    policySnapshot: record.provenance?.policySnapshot,
    at: now,
  })
  return simulationStore?.upsertActivitySessionEventRecord?.({
    ...record,
    status: ACTIVITY_SESSION_EVENT_STATUS.FAILED,
    reason,
    provenance: { ...record.provenance, resolutionLogId: log?.id || '' },
    updatedAt: now,
  })
}

export const resolveActivitySessionCheckpointEvent = ({
  simulationStore,
  activitySessionStore,
  eventRecordId,
  outcomeId,
  resolutionMode = ACTIVITY_SESSION_EVENT_RESOLUTION_MODE.USER_CHOICE,
  now = Date.now(),
} = {}) => {
  const normalizedNow = normalizeTimestamp(now, Date.now())
  const record = simulationStore?.getActivitySessionEventRecord?.(eventRecordId)
  const normalizedOutcome = normalizeText(outcomeId, '', 80)
  if (!record) return { ok: false, code: 'ACTIVITY_SESSION_EVENT_RECORD_MISSING' }
  if (
    record.status === ACTIVITY_SESSION_EVENT_STATUS.RESOLVED &&
    record.selectedOutcome === normalizedOutcome
  ) {
    return { ok: true, code: 'ACTIVITY_SESSION_EVENT_ALREADY_RESOLVED', record }
  }
  if (
    record.status !== ACTIVITY_SESSION_EVENT_STATUS.PENDING ||
    !record.allowedOutcomes.includes(normalizedOutcome) ||
    !RESOLUTION_MODES.has(resolutionMode)
  ) {
    return { ok: false, code: 'ACTIVITY_SESSION_EVENT_RESOLUTION_NOT_ALLOWED', record }
  }

  const session = activitySessionStore?.findSessionById?.(record.activitySessionId)
  if (!isRecordCurrentForSession(record, session, normalizedNow)) {
    const failed = failPendingRecord({
      simulationStore,
      record,
      reason: 'source_session_stale_or_terminal',
      now: normalizedNow,
    })
    return { ok: false, code: 'ACTIVITY_SESSION_EVENT_SOURCE_STALE', record: failed }
  }

  const existingResolution = session.eventResolutions?.find(
    (resolution) => resolution.eventRecordId === record.id,
  )
  if (existingResolution) {
    if (existingResolution.outcomeId !== normalizedOutcome) {
      const failed = failPendingRecord({
        simulationStore,
        record,
        reason: 'owner_resolution_lineage_conflict',
        now: normalizedNow,
      })
      return { ok: false, code: 'ACTIVITY_SESSION_EVENT_OWNER_CONFLICT', record: failed }
    }
    const recovered = simulationStore?.upsertActivitySessionEventRecord?.({
      ...record,
      status: ACTIVITY_SESSION_EVENT_STATUS.RESOLVED,
      selectedOutcome: existingResolution.outcomeId,
      resolutionMode: existingResolution.resolutionMode,
      reason: 'owner_resolution_recovered',
      resolvedAt: existingResolution.resolvedAt,
      updatedAt: normalizedNow,
    })
    return { ok: true, code: 'ACTIVITY_SESSION_EVENT_RESOLUTION_RECOVERED', record: recovered }
  }

  const ownerResult = activitySessionStore?.applyEventResolution?.(
    session.id,
    {
      authorization: 'event_runtime_resolved',
      adapterKey: record.adapterKey,
      eventId: record.eventId,
      eventRecordId: record.id,
      activitySessionId: record.activitySessionId,
      agendaJourneyId: record.agendaJourneyId,
      agendaJourneyStepId: record.agendaJourneyStepId,
      checkpointId: record.checkpointId,
      outcomeId: normalizedOutcome,
      resolutionMode,
      runtimeLogId: record.provenance.runtimeLogId,
      resolvedAt: normalizedNow,
    },
    { now: normalizedNow },
  )
  if (!ownerResult?.ok) {
    const failed = failPendingRecord({
      simulationStore,
      record,
      reason: ownerResult?.code || 'activity_session_owner_rejected',
      now: normalizedNow,
    })
    return { ok: false, code: ownerResult?.code || 'ACTIVITY_SESSION_EVENT_OWNER_REJECTED', record: failed }
  }

  const resolutionLog = recordEventLog(simulationStore, {
    id: `${record.id}::resolved`,
    eventId: record.eventId,
    moduleKey: record.moduleKey,
    targetId: record.activitySessionId,
    adapterKey: record.adapterKey,
    triggerSource:
      resolutionMode === ACTIVITY_SESSION_EVENT_RESOLUTION_MODE.AUTOMATIC
        ? 'system'
        : 'manual',
    status: 'triggered',
    reason: normalizedOutcome,
    policySnapshot: record.provenance?.policySnapshot,
    at: normalizedNow,
  })
  const resolved = simulationStore?.upsertActivitySessionEventRecord?.({
    ...record,
    status: ACTIVITY_SESSION_EVENT_STATUS.RESOLVED,
    selectedOutcome: normalizedOutcome,
    resolutionMode,
    reason: 'owner_resolution_applied',
    provenance: {
      ...record.provenance,
      resolutionLogId: resolutionLog?.id || '',
    },
    resolvedAt: normalizedNow,
    updatedAt: normalizedNow,
  })
  return {
    ok: Boolean(resolved),
    code: resolved
      ? 'ACTIVITY_SESSION_EVENT_RESOLVED'
      : 'ACTIVITY_SESSION_EVENT_RECORD_UPDATE_FAILED',
    record: resolved,
    session: ownerResult.session,
  }
}

export const runActivitySessionCheckpointEvent = ({
  simulationStore,
  activitySessionStore,
  snapshot,
  randomValue,
  seed,
  now = Date.now(),
} = {}) => {
  const normalizedNow = normalizeTimestamp(now, Date.now())
  const normalizedSnapshot = normalizeSource(snapshot)
  const recordId = createActivitySessionEventRecordId(
    normalizedSnapshot.activitySessionId,
    normalizedSnapshot.checkpointId,
  )
  if (
    !recordId ||
    normalizedSnapshot.checkpointType !== ACTIVITY_SESSION_EVENT_ELIGIBLE_CHECKPOINT_TYPE
  ) {
    return { ok: false, code: 'ACTIVITY_SESSION_EVENT_SNAPSHOT_INVALID', record: null }
  }
  const existing = simulationStore?.getActivitySessionEventRecord?.(recordId)
  if (existing) return { ok: true, code: 'ACTIVITY_SESSION_EVENT_ALREADY_EVALUATED', record: existing }

  const policy = resolveOptionalEventPolicy({
    simulationStore,
    moduleKey: ACTIVITY_SESSION_EVENT_MODULE_KEY,
    probabilityByIntensity: ACTIVITY_SESSION_EVENT_PROBABILITY_BY_INTENSITY,
    presentationModuleKey: ACTIVITY_SESSION_EVENT_MODULE_KEY,
    presentationFallback: ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.OFF,
  })
  const presentationMode = PRESENTATION_MODES.has(policy?.presentationMode)
    ? policy.presentationMode
    : ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.OFF
  if (!policy?.allowed) {
    return {
      ok: true,
      code: 'ACTIVITY_SESSION_EVENT_NO_EVENT',
      record: persistNoEvent({
        simulationStore,
        snapshot: normalizedSnapshot,
        presentationMode,
        reason: policy?.reason || 'module_events_disabled',
        policy,
        now: normalizedNow,
      }),
    }
  }
  if (
    simulationStore?.isCoolingDown?.(ACTIVITY_SESSION_EVENT_ID, {
      targetId: ACTIVITY_SESSION_EVENT_MODULE_KEY,
      at: normalizedNow,
    })
  ) {
    return {
      ok: true,
      code: 'ACTIVITY_SESSION_EVENT_NO_EVENT',
      record: persistNoEvent({
        simulationStore,
        snapshot: normalizedSnapshot,
        presentationMode,
        reason: 'cooldown_active',
        policy,
        now: normalizedNow,
      }),
    }
  }
  if (
    simulationStore?.canUseDailyQuota &&
    !simulationStore.canUseDailyQuota(ACTIVITY_SESSION_EVENT_ID, {
      targetId: ACTIVITY_SESSION_EVENT_MODULE_KEY,
      dayKey: createDayKey(normalizedNow),
      limit: ACTIVITY_SESSION_EVENT_DAILY_LIMIT,
    })
  ) {
    return {
      ok: true,
      code: 'ACTIVITY_SESSION_EVENT_NO_EVENT',
      record: persistNoEvent({
        simulationStore,
        snapshot: normalizedSnapshot,
        presentationMode,
        reason: 'daily_limit_reached',
        policy,
        now: normalizedNow,
      }),
    }
  }

  const gate = evaluateRandomGate({
    probability: policy.probability,
    randomValue,
    seed: seed || recordId,
  })
  if (!gate.passed) {
    return {
      ok: true,
      code: 'ACTIVITY_SESSION_EVENT_NO_EVENT',
      record: persistNoEvent({
        simulationStore,
        snapshot: normalizedSnapshot,
        presentationMode,
        reason: gate.reason,
        gate,
        policy,
        now: normalizedNow,
      }),
    }
  }

  const log = recordEventLog(simulationStore, {
    id: `${recordId}::eligible`,
    eventId: ACTIVITY_SESSION_EVENT_ID,
    moduleKey: ACTIVITY_SESSION_EVENT_MODULE_KEY,
    targetId: normalizedSnapshot.activitySessionId,
    adapterKey: ACTIVITY_SESSION_EVENT_ADAPTER_KEY,
    triggerSource: 'random',
    status: 'triggered',
    reason: 'eligible_random_passed',
    policySnapshot: policy,
    at: normalizedNow,
  })
  const pending = simulationStore?.upsertActivitySessionEventRecord?.(
    createRecord({
      snapshot: normalizedSnapshot,
      status: ACTIVITY_SESSION_EVENT_STATUS.PENDING,
      presentationMode,
      reason: 'awaiting_resolution',
      gate,
      log,
      policy,
      now: normalizedNow,
    }),
  )
  if (!pending) {
    return { ok: false, code: 'ACTIVITY_SESSION_EVENT_RECORD_CREATE_FAILED', record: null }
  }
  simulationStore?.markCooldown?.({
    eventId: ACTIVITY_SESSION_EVENT_ID,
    targetId: ACTIVITY_SESSION_EVENT_MODULE_KEY,
    cooldownMs: ACTIVITY_SESSION_EVENT_COOLDOWN_MS,
    at: normalizedNow,
  })
  simulationStore?.incrementDailyCounter?.({
    eventId: ACTIVITY_SESSION_EVENT_ID,
    targetId: ACTIVITY_SESSION_EVENT_MODULE_KEY,
    dayKey: createDayKey(normalizedNow),
    limit: ACTIVITY_SESSION_EVENT_DAILY_LIMIT,
    at: normalizedNow,
  })

  if (presentationMode === ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.OFF) {
    return resolveActivitySessionCheckpointEvent({
      simulationStore,
      activitySessionStore,
      eventRecordId: pending.id,
      outcomeId: ACTIVITY_SESSION_EVENT_OUTCOME.KEEP_RHYTHM,
      resolutionMode: ACTIVITY_SESSION_EVENT_RESOLUTION_MODE.AUTOMATIC,
      now: normalizedNow,
    })
  }
  return { ok: true, code: 'ACTIVITY_SESSION_EVENT_PENDING', record: pending }
}

export const reconcilePendingActivitySessionEvents = ({
  simulationStore,
  activitySessionStore,
  now = Date.now(),
} = {}) => {
  const normalizedNow = normalizeTimestamp(now, Date.now())
  const records = simulationStore?.pendingActivitySessionEventRecords || []
  let resolved = 0
  let failed = 0
  records.forEach((record) => {
    const session = activitySessionStore?.findSessionById?.(record.activitySessionId)
    if (!isRecordCurrentForSession(record, session, normalizedNow)) {
      if (
        failPendingRecord({
          simulationStore,
          record,
          reason: 'source_session_stale_or_terminal',
          now: normalizedNow,
        })
      ) {
        failed += 1
      }
      return
    }
    if (record.presentationMode !== ACTIVITY_SESSION_EVENT_PRESENTATION_MODE.OFF) return
    const result = resolveActivitySessionCheckpointEvent({
      simulationStore,
      activitySessionStore,
      eventRecordId: record.id,
      outcomeId: ACTIVITY_SESSION_EVENT_OUTCOME.KEEP_RHYTHM,
      resolutionMode: ACTIVITY_SESSION_EVENT_RESOLUTION_MODE.AUTOMATIC,
      now: normalizedNow,
    })
    if (result.ok) resolved += 1
    else failed += 1
  })
  return { resolved, failed }
}
