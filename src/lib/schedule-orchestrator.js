import {
  expandCalendarEventOccurrences,
  normalizeCalendarRequirement,
} from './calendar-schedule'
import { normalizeScheduleHandoffEventSourceRefV1 } from './schedule-handoff'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
const MAX_TIMESTAMP = 8_640_000_000_000_000
const RECORD_LIMIT = 500

export const SCHEDULE_ORCHESTRATOR_SCHEMA_VERSION = 2

export const DEFAULT_SCHEDULE_ORCHESTRATOR_CONFIG = Object.freeze({
  materializationLeadMs: DAY_MS,
  deadlineGraceMs: 0,
  reconciliationLookbackMs: 7 * DAY_MS,
  scanAheadMs: 30 * DAY_MS,
  fallbackReconcileIntervalMs: 6 * HOUR_MS,
  occurrenceLimit: 480,
})

const trimLine = (value, fallback = '', max = 180) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const toTimestamp = (value, fallback = 0) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(MAX_TIMESTAMP, Math.max(0, Math.floor(numeric)))
}

const toBoundedDuration = (value, fallback, max) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(0, Math.floor(numeric)))
}

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    )
  }
  return value
}

const fingerprintText = (value) => {
  const text = JSON.stringify(canonicalize(value))
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index))
    hash = BigInt.asUintN(64, hash * prime)
  }
  return hash.toString(16).padStart(16, '0')
}

const normalizeLocationRefForFingerprint = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const mapPackId = trimLine(raw.mapPackId, '', 120)
  const placeId = trimLine(raw.placeId || raw.id, '', 180).toLowerCase()
  if (!mapPackId || !placeId) return null
  return { owner: 'map', mapPackId, placeId }
}

const normalizeSourceRefForFingerprint = (raw) => {
  const sourceRef = normalizeScheduleHandoffEventSourceRefV1(raw)
  if (!sourceRef) return null
  return {
    sourceOwner: sourceRef.sourceOwner,
    sourceRecordId: sourceRef.sourceRecordId,
    sourceRevision: sourceRef.sourceRevision,
    previousSourceRefs: (sourceRef.previousSourceRefs || []).map((candidate) => ({
      sourceOwner: candidate.sourceOwner,
      sourceRecordId: candidate.sourceRecordId,
      sourceRevision: candidate.sourceRevision,
    })),
  }
}

export const normalizeScheduleOrchestratorConfig = (raw = {}) => ({
  materializationLeadMs: toBoundedDuration(
    raw.materializationLeadMs,
    DEFAULT_SCHEDULE_ORCHESTRATOR_CONFIG.materializationLeadMs,
    30 * DAY_MS,
  ),
  deadlineGraceMs: toBoundedDuration(
    raw.deadlineGraceMs,
    DEFAULT_SCHEDULE_ORCHESTRATOR_CONFIG.deadlineGraceMs,
    30 * DAY_MS,
  ),
  reconciliationLookbackMs: toBoundedDuration(
    raw.reconciliationLookbackMs,
    DEFAULT_SCHEDULE_ORCHESTRATOR_CONFIG.reconciliationLookbackMs,
    365 * DAY_MS,
  ),
  scanAheadMs: toBoundedDuration(
    raw.scanAheadMs,
    DEFAULT_SCHEDULE_ORCHESTRATOR_CONFIG.scanAheadMs,
    365 * DAY_MS,
  ),
  fallbackReconcileIntervalMs: Math.max(
    60_000,
    toBoundedDuration(
      raw.fallbackReconcileIntervalMs,
      DEFAULT_SCHEDULE_ORCHESTRATOR_CONFIG.fallbackReconcileIntervalMs,
      7 * DAY_MS,
    ),
  ),
  occurrenceLimit: Math.min(
    2_000,
    Math.max(
      1,
      Math.floor(
        Number(raw.occurrenceLimit) || DEFAULT_SCHEDULE_ORCHESTRATOR_CONFIG.occurrenceLimit,
      ),
    ),
  ),
})

export const createScheduleOrchestrationId = (sourceCalendarEventId, occurrenceStartsAt) => {
  const eventId = trimLine(sourceCalendarEventId, '', 140)
  const startsAt = toTimestamp(occurrenceStartsAt, 0)
  return eventId && startsAt ? `schedule_orchestration::${eventId}::${startsAt}` : ''
}

export const createScheduleLogicalExecutionKey = (
  sourceCalendarEventId,
  occurrenceStartsAt,
  recurrence = 'none',
) => {
  const eventId = trimLine(sourceCalendarEventId, '', 140)
  if (!eventId) return ''
  return trimLine(recurrence, 'none', 20) === 'none'
    ? `calendar_event::${eventId}::one_off`
    : createScheduleOrchestrationId(eventId, occurrenceStartsAt)
}

export const createCalendarOccurrenceFingerprint = (occurrence = {}) => {
  const sourceCalendarEventId = trimLine(
    occurrence.sourceCalendarEventId || occurrence.sourceEventId || occurrence.id,
    '',
    140,
  )
  const occurrenceStartsAt = toTimestamp(occurrence.occurrenceStartsAt ?? occurrence.startsAt, 0)
  const occurrenceEndsAt = toTimestamp(occurrence.occurrenceEndsAt ?? occurrence.endsAt, 0)
  if (!sourceCalendarEventId || !occurrenceStartsAt || occurrenceEndsAt <= occurrenceStartsAt) {
    return ''
  }
  return fingerprintText({
    sourceCalendarEventId,
    occurrenceStartsAt,
    occurrenceEndsAt,
    allDay: occurrence.allDay === true,
    recurrence: trimLine(occurrence.recurrence, 'none', 20),
    recurrenceUntil: toTimestamp(occurrence.recurrenceUntil, 0),
    requirement: normalizeCalendarRequirement(occurrence.requirement),
    reminderLeadMinutes: Math.max(0, Math.floor(Number(occurrence.reminderLeadMinutes) || 0)),
    locationRef: normalizeLocationRefForFingerprint(occurrence.locationRef),
    sourceRef: normalizeSourceRefForFingerprint(occurrence.sourceRef),
    titleZh: trimLine(occurrence.titleZh, '', 100),
    titleEn: trimLine(occurrence.titleEn, '', 100),
    summaryZh: trimLine(occurrence.summaryZh, '', 240),
    summaryEn: trimLine(occurrence.summaryEn, '', 240),
    notesZh: typeof occurrence.notesZh === 'string' ? occurrence.notesZh.slice(0, 1_200) : '',
    notesEn: typeof occurrence.notesEn === 'string' ? occurrence.notesEn.slice(0, 1_200) : '',
    updatedAt: toTimestamp(occurrence.updatedAt, 0),
  })
}

export const normalizeScheduleOrchestrationRecord = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const sourceCalendarEventId = trimLine(raw.sourceCalendarEventId, '', 140)
  const occurrenceStartsAt = toTimestamp(raw.occurrenceStartsAt, 0)
  const occurrenceEndsAt = toTimestamp(raw.occurrenceEndsAt, 0)
  const id =
    trimLine(raw.id, '', 360) ||
    createScheduleOrchestrationId(sourceCalendarEventId, occurrenceStartsAt)
  const sourceOccurrenceId = trimLine(
    raw.sourceOccurrenceId,
    `${sourceCalendarEventId}::${occurrenceStartsAt}`,
    360,
  )
  const calendarFingerprint = trimLine(raw.calendarFingerprint, '', 80)
  const logicalExecutionKey = trimLine(
    raw.logicalExecutionKey,
    createScheduleLogicalExecutionKey(
      sourceCalendarEventId,
      occurrenceStartsAt,
      raw.recurrence,
    ),
    360,
  )
  if (
    !id ||
    !sourceCalendarEventId ||
    !sourceOccurrenceId ||
    !logicalExecutionKey ||
    !occurrenceStartsAt ||
    occurrenceEndsAt <= occurrenceStartsAt ||
    !calendarFingerprint
  ) {
    return null
  }
  return {
    id,
    sourceCalendarEventId,
    sourceOccurrenceId,
    logicalExecutionKey,
    occurrenceStartsAt,
    occurrenceEndsAt,
    calendarFingerprint,
    materializationWindowStartsAt: toTimestamp(raw.materializationWindowStartsAt, 0),
    deadlineAt: toTimestamp(raw.deadlineAt, occurrenceEndsAt),
    requiresDeadlineEvaluation: raw.requiresDeadlineEvaluation === true,
    agendaJourneyId: trimLine(raw.agendaJourneyId, '', 180),
    materializationRevision: trimLine(raw.materializationRevision, calendarFingerprint, 80),
    materializationRequestedAt: toTimestamp(raw.materializationRequestedAt, 0),
    materializationAcknowledgedRevision: trimLine(
      raw.materializationAcknowledgedRevision,
      '',
      80,
    ),
    materializationAcknowledgedAt: toTimestamp(raw.materializationAcknowledgedAt, 0),
    materializationBlockedCode: trimLine(raw.materializationBlockedCode, '', 120),
    materializationBlockedAt: toTimestamp(raw.materializationBlockedAt, 0),
    deadlineEvaluationRevision: trimLine(raw.deadlineEvaluationRevision, '', 80),
    deadlineEvaluationRequestedAt: toTimestamp(raw.deadlineEvaluationRequestedAt, 0),
    deadlineEvaluationAcknowledgedRevision: trimLine(
      raw.deadlineEvaluationAcknowledgedRevision,
      '',
      80,
    ),
    deadlineEvaluationAcknowledgedAt: toTimestamp(
      raw.deadlineEvaluationAcknowledgedAt,
      0,
    ),
    retiredAt: toTimestamp(raw.retiredAt, 0),
    retirementReason: trimLine(raw.retirementReason, '', 80),
    createdAt: toTimestamp(raw.createdAt, 0),
    updatedAt: toTimestamp(raw.updatedAt, 0),
  }
}

export const normalizeScheduleOrchestrationRecords = (records = []) => {
  if (!Array.isArray(records)) return []
  const byId = new Map()
  records.forEach((record) => {
    const normalized = normalizeScheduleOrchestrationRecord(record)
    if (!normalized) return
    const current = byId.get(normalized.id)
    if (!current || normalized.updatedAt >= current.updatedAt) byId.set(normalized.id, normalized)
  })
  return [...byId.values()]
    .sort((left, right) => {
      if (left.retiredAt !== right.retiredAt) return left.retiredAt ? 1 : -1
      if (left.occurrenceStartsAt !== right.occurrenceStartsAt) {
        return left.occurrenceStartsAt - right.occurrenceStartsAt
      }
      return left.id.localeCompare(right.id)
    })
    .slice(0, RECORD_LIMIT)
}

const occurrenceStillExists = (event, occurrenceStartsAt) => {
  const occurrences = expandCalendarEventOccurrences({
    events: [event],
    rangeStart: occurrenceStartsAt,
    rangeEnd: occurrenceStartsAt + 1,
    limit: 4,
  })
  return occurrences.some((occurrence) => occurrence.startsAt === occurrenceStartsAt)
}

const retireRecord = (record, now, reason) => ({
  ...record,
  retiredAt: record.retiredAt || now,
  retirementReason: record.retirementReason || reason,
  updatedAt: now,
})

const createOrRefreshRecord = ({ occurrence, existing, now, config }) => {
  const sourceCalendarEventId = trimLine(
    occurrence.sourceEventId || occurrence.id,
    '',
    140,
  )
  const occurrenceStartsAt = toTimestamp(occurrence.startsAt, 0)
  const occurrenceEndsAt = toTimestamp(occurrence.endsAt, 0)
  const generatedId = createScheduleOrchestrationId(sourceCalendarEventId, occurrenceStartsAt)
  const logicalExecutionKey = createScheduleLogicalExecutionKey(
    sourceCalendarEventId,
    occurrenceStartsAt,
    occurrence.recurrence,
  )
  const id = existing?.id || generatedId
  const calendarFingerprint = createCalendarOccurrenceFingerprint(occurrence)
  if (!id || !logicalExecutionKey || !calendarFingerprint || occurrenceEndsAt <= occurrenceStartsAt) return null

  const materializationWindowStartsAt = Math.max(
    0,
    occurrenceStartsAt - config.materializationLeadMs,
  )
  const deadlineAt = Math.min(MAX_TIMESTAMP, occurrenceEndsAt + config.deadlineGraceMs)
  const requiresDeadlineEvaluation =
    normalizeCalendarRequirement(occurrence.requirement) === 'required'
  const fingerprintChanged = existing?.calendarFingerprint !== calendarFingerprint
  const dueForDeadline = requiresDeadlineEvaluation && deadlineAt <= now
  const base = existing || {
    id,
    sourceCalendarEventId,
    sourceOccurrenceId: occurrence.occurrenceId || `${sourceCalendarEventId}::${occurrenceStartsAt}`,
    logicalExecutionKey,
    agendaJourneyId: '',
    materializationAcknowledgedRevision: '',
    materializationAcknowledgedAt: 0,
    deadlineEvaluationRevision: '',
    deadlineEvaluationRequestedAt: 0,
    deadlineEvaluationAcknowledgedRevision: '',
    deadlineEvaluationAcknowledgedAt: 0,
    createdAt: now,
  }
  const next = {
    ...base,
    id,
    sourceCalendarEventId,
    sourceOccurrenceId: occurrence.occurrenceId || `${sourceCalendarEventId}::${occurrenceStartsAt}`,
    logicalExecutionKey,
    occurrenceStartsAt,
    occurrenceEndsAt,
    calendarFingerprint,
    materializationWindowStartsAt,
    deadlineAt,
    requiresDeadlineEvaluation,
    retiredAt: 0,
    retirementReason: '',
    updatedAt: fingerprintChanged || !existing ? now : base.updatedAt,
  }

  if (!existing || fingerprintChanged) {
    next.materializationRevision = calendarFingerprint
    next.materializationRequestedAt = now
    next.materializationBlockedCode = ''
    next.materializationBlockedAt = 0
  }
  if (!next.materializationRevision) {
    next.materializationRevision = calendarFingerprint
    next.materializationRequestedAt = next.materializationRequestedAt || now
  }

  if (dueForDeadline) {
    if (next.deadlineEvaluationRevision !== calendarFingerprint) {
      next.deadlineEvaluationRevision = calendarFingerprint
      next.deadlineEvaluationRequestedAt = now
    }
  } else if (fingerprintChanged || !requiresDeadlineEvaluation) {
    next.deadlineEvaluationRevision = ''
    next.deadlineEvaluationRequestedAt = 0
    next.deadlineEvaluationAcknowledgedRevision = ''
    next.deadlineEvaluationAcknowledgedAt = 0
  }

  return normalizeScheduleOrchestrationRecord(next)
}

export const reconcileScheduleOrchestration = ({
  calendarEvents = [],
  existingRecords = [],
  now = Date.now(),
  config: rawConfig = {},
} = {}) => {
  const reconciledAt = toTimestamp(now, Date.now())
  const config = normalizeScheduleOrchestratorConfig(rawConfig)
  const confirmedEvents = Array.isArray(calendarEvents)
    ? calendarEvents.filter((event) => event && event.status === 'confirmed')
    : []
  const eventById = new Map(
    confirmedEvents
      .map((event) => [trimLine(event.id, '', 140), event])
      .filter(([eventId]) => Boolean(eventId)),
  )
  const normalizedExisting = normalizeScheduleOrchestrationRecords(existingRecords)
  const recordsById = new Map(normalizedExisting.map((record) => [record.id, record]))
  const recordsByLogicalKey = new Map(
    normalizedExisting.map((record) => [record.logicalExecutionKey, record]),
  )

  for (const record of normalizedExisting) {
    if (record.retiredAt) continue
    const sourceEvent = eventById.get(record.sourceCalendarEventId)
    if (!sourceEvent) {
      recordsById.set(record.id, retireRecord(record, reconciledAt, 'calendar_event_unavailable'))
      continue
    }
    if (!occurrenceStillExists(sourceEvent, record.occurrenceStartsAt)) {
      recordsById.set(record.id, retireRecord(record, reconciledAt, 'calendar_occurrence_replaced'))
    }
  }

  const rangeStart = Math.max(1, reconciledAt - config.reconciliationLookbackMs)
  const rangeEnd = Math.min(
    MAX_TIMESTAMP,
    reconciledAt + config.materializationLeadMs + config.scanAheadMs + 1,
  )
  const occurrences = expandCalendarEventOccurrences({
    events: confirmedEvents,
    rangeStart,
    rangeEnd,
    limit: config.occurrenceLimit,
  })

  let nextBoundaryAt = 0
  for (const occurrence of occurrences) {
    const materializationWindowStartsAt = Math.max(
      0,
      occurrence.startsAt - config.materializationLeadMs,
    )
    const deadlineAt = Math.min(MAX_TIMESTAMP, occurrence.endsAt + config.deadlineGraceMs)
    if (materializationWindowStartsAt > reconciledAt) {
      nextBoundaryAt = nextBoundaryAt
        ? Math.min(nextBoundaryAt, materializationWindowStartsAt)
        : materializationWindowStartsAt
      continue
    }
    const id = createScheduleOrchestrationId(occurrence.sourceEventId || occurrence.id, occurrence.startsAt)
    const logicalExecutionKey = createScheduleLogicalExecutionKey(
      occurrence.sourceEventId || occurrence.id,
      occurrence.startsAt,
      occurrence.recurrence,
    )
    const existing = recordsById.get(id) || recordsByLogicalKey.get(logicalExecutionKey)
    const refreshed = createOrRefreshRecord({
      occurrence,
      existing,
      now: reconciledAt,
      config,
    })
    if (refreshed) {
      recordsById.set(refreshed.id, refreshed)
      recordsByLogicalKey.set(refreshed.logicalExecutionKey, refreshed)
    }
    if (deadlineAt > reconciledAt) {
      nextBoundaryAt = nextBoundaryAt ? Math.min(nextBoundaryAt, deadlineAt) : deadlineAt
    }
  }

  const fallbackAt = Math.min(
    MAX_TIMESTAMP,
    reconciledAt + config.fallbackReconcileIntervalMs,
  )
  const nextReconcileAt = nextBoundaryAt ? Math.min(nextBoundaryAt, fallbackAt) : fallbackAt
  const records = normalizeScheduleOrchestrationRecords([...recordsById.values()])

  return {
    schemaVersion: SCHEDULE_ORCHESTRATOR_SCHEMA_VERSION,
    reconciledAt,
    nextReconcileAt,
    records,
    materializationRequestCount: records.filter(
      (record) =>
        !record.retiredAt &&
        record.materializationRevision &&
        record.materializationAcknowledgedRevision !== record.materializationRevision,
    ).length,
    deadlineEvaluationRequestCount: records.filter(
      (record) =>
        !record.retiredAt &&
        record.deadlineEvaluationRevision &&
        record.deadlineEvaluationAcknowledgedRevision !== record.deadlineEvaluationRevision,
    ).length,
  }
}

export const projectScheduleMaterializationRequest = (record = {}) => {
  const normalized = normalizeScheduleOrchestrationRecord(record)
  if (
    !normalized ||
    normalized.retiredAt ||
    !normalized.materializationRevision ||
    normalized.materializationAcknowledgedRevision === normalized.materializationRevision
  ) {
    return null
  }
  return {
    orchestrationId: normalized.id,
    sourceCalendarEventId: normalized.sourceCalendarEventId,
    sourceOccurrenceId: normalized.sourceOccurrenceId,
    occurrenceStartsAt: normalized.occurrenceStartsAt,
    occurrenceEndsAt: normalized.occurrenceEndsAt,
    calendarFingerprint: normalized.calendarFingerprint,
    logicalExecutionKey: normalized.logicalExecutionKey,
    agendaJourneyId: normalized.agendaJourneyId,
    requestedAt: normalized.materializationRequestedAt,
  }
}

export const projectScheduleDeadlineEvaluationRequest = (record = {}) => {
  const normalized = normalizeScheduleOrchestrationRecord(record)
  if (
    !normalized ||
    normalized.retiredAt ||
    !normalized.deadlineEvaluationRevision ||
    normalized.deadlineEvaluationAcknowledgedRevision === normalized.deadlineEvaluationRevision
  ) {
    return null
  }
  return {
    orchestrationId: normalized.id,
    sourceCalendarEventId: normalized.sourceCalendarEventId,
    sourceOccurrenceId: normalized.sourceOccurrenceId,
    agendaJourneyId: normalized.agendaJourneyId,
    deadlineAt: normalized.deadlineAt,
    calendarFingerprint: normalized.calendarFingerprint,
    requestedAt: normalized.deadlineEvaluationRequestedAt,
  }
}
