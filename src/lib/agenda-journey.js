import {
  normalizeCalendarRequirement,
  startOfCalendarDay,
} from './calendar-schedule'
import { isMapTransportMode } from './map-journey'
import {
  ACTIVITY_SESSION_COMPLETION_POLICY,
  ACTIVITY_SESSION_PAUSE_POLICY,
  createActivitySessionId,
} from './activity-session'
import { normalizeWorkScheduleExecutionProof } from './work-schedule-execution'

const MAX_TIMESTAMP = 8_640_000_000_000_000
const JOURNEY_LIMIT = 300
const STEP_EVIDENCE_LIMIT = 24

export const AGENDA_JOURNEY_SCHEMA_VERSION = 2

export const AGENDA_JOURNEY_SOURCE = Object.freeze({
  MANUAL: 'manual',
  CALENDAR_OCCURRENCE: 'calendar_occurrence',
})

export const AGENDA_JOURNEY_STATUS = Object.freeze({
  PLANNED: 'planned',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  MISSED: 'missed',
  SKIPPED: 'skipped',
  CANCELLED: 'cancelled',
})

export const AGENDA_JOURNEY_STEP_KIND = Object.freeze({
  TRAVEL: 'travel',
  ACTIVITY: 'activity',
})

export const AGENDA_JOURNEY_STEP_STATUS = Object.freeze({
  PLANNED: 'planned',
  AVAILABLE: 'available',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  MISSED: 'missed',
  SKIPPED: 'skipped',
  CANCELLED: 'cancelled',
})

export const AGENDA_JOURNEY_COMPLETION_POLICY = Object.freeze({
  MAP_ARRIVAL: 'map_arrival',
  USER_CONFIRMATION: 'user_confirmation',
  DURATION_SUFFICIENT: 'duration_sufficient',
})

const TERMINAL_JOURNEY_STATUSES = new Set([
  AGENDA_JOURNEY_STATUS.COMPLETED,
  AGENDA_JOURNEY_STATUS.MISSED,
  AGENDA_JOURNEY_STATUS.SKIPPED,
  AGENDA_JOURNEY_STATUS.CANCELLED,
])

const TERMINAL_STEP_STATUSES = new Set([
  AGENDA_JOURNEY_STEP_STATUS.COMPLETED,
  AGENDA_JOURNEY_STEP_STATUS.MISSED,
  AGENDA_JOURNEY_STEP_STATUS.SKIPPED,
  AGENDA_JOURNEY_STEP_STATUS.CANCELLED,
])

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

const normalizeRequirement = (value) => normalizeCalendarRequirement(value, 'required')

const normalizeJourneyStatus = (value) =>
  Object.values(AGENDA_JOURNEY_STATUS).includes(value)
    ? value
    : AGENDA_JOURNEY_STATUS.PLANNED

const normalizeStepStatus = (value, fallback = AGENDA_JOURNEY_STEP_STATUS.PLANNED) =>
  Object.values(AGENDA_JOURNEY_STEP_STATUS).includes(value) ? value : fallback

const normalizeCompletionPolicy = (value, kind) => {
  if (
    kind === AGENDA_JOURNEY_STEP_KIND.TRAVEL &&
    value === AGENDA_JOURNEY_COMPLETION_POLICY.MAP_ARRIVAL
  ) {
    return AGENDA_JOURNEY_COMPLETION_POLICY.MAP_ARRIVAL
  }
  if (
    kind === AGENDA_JOURNEY_STEP_KIND.ACTIVITY &&
    value === AGENDA_JOURNEY_COMPLETION_POLICY.DURATION_SUFFICIENT
  ) {
    return AGENDA_JOURNEY_COMPLETION_POLICY.DURATION_SUFFICIENT
  }
  if (
    kind === AGENDA_JOURNEY_STEP_KIND.ACTIVITY &&
    value === AGENDA_JOURNEY_COMPLETION_POLICY.USER_CONFIRMATION
  ) {
    return AGENDA_JOURNEY_COMPLETION_POLICY.USER_CONFIRMATION
  }
  return kind === AGENDA_JOURNEY_STEP_KIND.TRAVEL
    ? AGENDA_JOURNEY_COMPLETION_POLICY.MAP_ARRIVAL
    : AGENDA_JOURNEY_COMPLETION_POLICY.USER_CONFIRMATION
}

export const normalizeAgendaJourneyLocationRef = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const mapPackId = trimLine(raw.mapPackId, '', 120)
  const placeId = trimLine(raw.placeId || raw.id, '', 180).toLowerCase()
  if (!mapPackId || !placeId) return null
  return {
    owner: 'map',
    mapPackId,
    placeId,
    labelZh: trimLine(raw.labelZh || raw.label || raw.nameZh, '', 120),
    labelEn: trimLine(raw.labelEn || raw.labelZh || raw.label || raw.nameEn, '', 120),
  }
}

const normalizeEvidenceRef = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const owner = trimLine(raw.owner, '', 40)
  const type = trimLine(raw.type, '', 80)
  const recordId = trimLine(raw.recordId || raw.journeyId, '', 180)
  if (!owner || !type || !recordId) return null
  return {
    owner,
    type,
    recordId,
    status: trimLine(raw.status, '', 40),
    observedAt: toTimestamp(raw.observedAt, 0),
  }
}

const normalizeEvidenceRefs = (raw) => {
  if (!Array.isArray(raw)) return []
  const byKey = new Map()
  raw.forEach((entry) => {
    const normalized = normalizeEvidenceRef(entry)
    if (!normalized) return
    const key = `${normalized.owner}::${normalized.type}::${normalized.recordId}`
    const current = byKey.get(key)
    if (!current || normalized.observedAt >= current.observedAt) byKey.set(key, normalized)
  })
  return [...byKey.values()]
    .sort((left, right) => left.observedAt - right.observedAt)
    .slice(-STEP_EVIDENCE_LIMIT)
}

const appendEvidence = (current, evidence) =>
  normalizeEvidenceRefs([...(Array.isArray(current) ? current : []), evidence])

const normalizeExecutionProofs = (raw) => {
  if (!Array.isArray(raw)) return []
  const byFingerprint = new Map()
  raw.forEach((candidate) => {
    const proof = normalizeWorkScheduleExecutionProof(candidate)
    if (proof) byFingerprint.set(proof.calendarFingerprint, proof)
  })
  return [...byFingerprint.values()].slice(-8)
}

export const createCalendarAgendaJourneyId = (sourceCalendarEventId, occurrenceStartsAt) => {
  const eventId = trimLine(sourceCalendarEventId, '', 140)
  const startsAt = toTimestamp(occurrenceStartsAt, 0)
  return eventId && startsAt ? `aj::${eventId}::${startsAt}` : ''
}

export const createAgendaJourneyStepId = (agendaJourneyId, kind) => {
  const journeyId = trimLine(agendaJourneyId, '', 170)
  const normalizedKind = Object.values(AGENDA_JOURNEY_STEP_KIND).includes(kind) ? kind : ''
  return journeyId && normalizedKind ? `${journeyId}::${normalizedKind}` : ''
}

export const normalizeAgendaJourneyStep = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const agendaJourneyId = trimLine(raw.agendaJourneyId, '', 170)
  const kind = Object.values(AGENDA_JOURNEY_STEP_KIND).includes(raw.kind) ? raw.kind : ''
  const id = trimLine(raw.id, '', 180) || createAgendaJourneyStepId(agendaJourneyId, kind)
  if (!id || !agendaJourneyId || !kind) return null
  const scheduledStartsAt = toTimestamp(raw.scheduledStartsAt, 0)
  const scheduledEndsAt = toTimestamp(raw.scheduledEndsAt, 0)
  const defaultStatus =
    kind === AGENDA_JOURNEY_STEP_KIND.TRAVEL
      ? AGENDA_JOURNEY_STEP_STATUS.AVAILABLE
      : AGENDA_JOURNEY_STEP_STATUS.PLANNED
  return {
    id,
    agendaJourneyId,
    sequence: Math.max(0, Math.floor(Number(raw.sequence) || 0)),
    kind,
    titleZh: trimLine(raw.titleZh, '', 120),
    titleEn: trimLine(raw.titleEn || raw.titleZh, '', 120),
    status: normalizeStepStatus(raw.status, defaultStatus),
    requirement: normalizeRequirement(raw.requirement),
    completionPolicy: normalizeCompletionPolicy(raw.completionPolicy, kind),
    scheduledStartsAt,
    scheduledEndsAt: Math.max(scheduledStartsAt, scheduledEndsAt),
    desiredArrivalAt: toTimestamp(raw.desiredArrivalAt, 0),
    locationRef: normalizeAgendaJourneyLocationRef(raw.locationRef),
    transportMode: isMapTransportMode(raw.transportMode) ? raw.transportMode : 'public_transit',
    mapJourneyId: trimLine(raw.mapJourneyId, '', 180),
    evidenceRefs: normalizeEvidenceRefs(raw.evidenceRefs),
    startedAt: toTimestamp(raw.startedAt, 0),
    completedAt: toTimestamp(raw.completedAt, 0),
    updatedAt: toTimestamp(raw.updatedAt, 0),
  }
}

export const normalizeAgendaJourney = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const id = trimLine(raw.id, '', 170)
  const sourceType = Object.values(AGENDA_JOURNEY_SOURCE).includes(raw.sourceType)
    ? raw.sourceType
    : AGENDA_JOURNEY_SOURCE.MANUAL
  const scheduledStartsAt = toTimestamp(raw.scheduledStartsAt, 0)
  const scheduledEndsAt = toTimestamp(raw.scheduledEndsAt, 0)
  if (!id || !scheduledStartsAt || scheduledEndsAt <= scheduledStartsAt) return null
  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .map((step) => normalizeAgendaJourneyStep({ ...step, agendaJourneyId: id }))
        .filter(Boolean)
        .sort((left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id))
    : []
  if (!steps.length) return null
  return {
    id,
    schemaVersion: AGENDA_JOURNEY_SCHEMA_VERSION,
    sourceType,
    sourceCalendarEventId: trimLine(raw.sourceCalendarEventId, '', 140),
    sourceOccurrenceId: trimLine(raw.sourceOccurrenceId, '', 180),
    scheduleOrchestrationId: trimLine(raw.scheduleOrchestrationId, '', 360),
    sourceCalendarFingerprint: trimLine(raw.sourceCalendarFingerprint, '', 80),
    executionRevision: trimLine(
      raw.executionRevision,
      raw.sourceCalendarFingerprint,
      80,
    ),
    executionProof: normalizeWorkScheduleExecutionProof(raw.executionProof),
    pendingExecutionProof: normalizeWorkScheduleExecutionProof(raw.pendingExecutionProof),
    priorExecutionProofs: normalizeExecutionProofs(raw.priorExecutionProofs),
    executionNotificationRevision: trimLine(raw.executionNotificationRevision, '', 80),
    executionNotificationId: trimLine(raw.executionNotificationId, '', 180),
    executionNotifiedAt: toTimestamp(raw.executionNotifiedAt, 0),
    sourceState: raw.sourceState === 'retired' ? 'retired' : 'active',
    sourceRetiredAt: toTimestamp(raw.sourceRetiredAt, 0),
    sourceReviewRequired: raw.sourceReviewRequired === true,
    titleZh: trimLine(raw.titleZh, '未命名行程', 120),
    titleEn: trimLine(raw.titleEn || raw.titleZh, 'Untitled journey', 120),
    dayStartsAt: toTimestamp(raw.dayStartsAt, startOfCalendarDay(scheduledStartsAt)),
    scheduledStartsAt,
    scheduledEndsAt,
    allDay: raw.allDay === true,
    requirement: normalizeRequirement(raw.requirement),
    locationRef: normalizeAgendaJourneyLocationRef(raw.locationRef),
    status: normalizeJourneyStatus(raw.status),
    steps,
    outcomeSummaryZh: trimLine(raw.outcomeSummaryZh, '', 240),
    outcomeSummaryEn: trimLine(raw.outcomeSummaryEn, '', 240),
    startedAt: toTimestamp(raw.startedAt, 0),
    completedAt: toTimestamp(raw.completedAt, 0),
    createdAt: toTimestamp(raw.createdAt, 0),
    updatedAt: toTimestamp(raw.updatedAt, 0),
  }
}

export const normalizeAgendaJourneys = (raw = []) => {
  if (!Array.isArray(raw)) return []
  const byId = new Map()
  raw.forEach((entry) => {
    const normalized = normalizeAgendaJourney(entry)
    if (!normalized) return
    const current = byId.get(normalized.id)
    if (!current || normalized.updatedAt >= current.updatedAt) byId.set(normalized.id, normalized)
  })
  return [...byId.values()]
    .sort(
      (left, right) =>
        left.scheduledStartsAt - right.scheduledStartsAt || left.id.localeCompare(right.id),
    )
    .slice(-JOURNEY_LIMIT)
}

const buildStepPlans = ({
  journeyId,
  titleZh,
  titleEn,
  startsAt,
  endsAt,
  allDay,
  requirement,
  locationRef,
}) => {
  const plans = []
  if (locationRef && !allDay) {
    const destinationZh = locationRef.labelZh || locationRef.labelEn || '目的地'
    const destinationEn = locationRef.labelEn || locationRef.labelZh || 'destination'
    plans.push({
      id: createAgendaJourneyStepId(journeyId, AGENDA_JOURNEY_STEP_KIND.TRAVEL),
      agendaJourneyId: journeyId,
      sequence: 0,
      kind: AGENDA_JOURNEY_STEP_KIND.TRAVEL,
      titleZh: `前往${destinationZh}`,
      titleEn: `Travel to ${destinationEn}`,
      status: AGENDA_JOURNEY_STEP_STATUS.AVAILABLE,
      requirement,
      completionPolicy: AGENDA_JOURNEY_COMPLETION_POLICY.MAP_ARRIVAL,
      scheduledStartsAt: startsAt,
      scheduledEndsAt: startsAt,
      desiredArrivalAt: startsAt,
      locationRef,
      transportMode: 'public_transit',
      mapJourneyId: '',
      evidenceRefs: [],
      startedAt: 0,
      completedAt: 0,
      updatedAt: 0,
    })
  }
  plans.push({
    id: createAgendaJourneyStepId(journeyId, AGENDA_JOURNEY_STEP_KIND.ACTIVITY),
    agendaJourneyId: journeyId,
    sequence: plans.length,
    kind: AGENDA_JOURNEY_STEP_KIND.ACTIVITY,
    titleZh,
    titleEn,
    status:
      plans.length > 0
        ? AGENDA_JOURNEY_STEP_STATUS.PLANNED
        : AGENDA_JOURNEY_STEP_STATUS.AVAILABLE,
    requirement,
    completionPolicy: AGENDA_JOURNEY_COMPLETION_POLICY.USER_CONFIRMATION,
    scheduledStartsAt: startsAt,
    scheduledEndsAt: endsAt,
    desiredArrivalAt: 0,
    locationRef,
    transportMode: 'public_transit',
    mapJourneyId: '',
    evidenceRefs: [],
    startedAt: 0,
    completedAt: 0,
    updatedAt: 0,
  })
  return plans.map(normalizeAgendaJourneyStep).filter(Boolean)
}

const mergePlannedSteps = (plans, existingJourney, now) => {
  const existingByKind = new Map(
    (existingJourney?.steps || []).map((step) => [step.kind, step]),
  )
  return plans.map((plan) => {
    const existing = existingByKind.get(plan.kind)
    if (!existing) return { ...plan, updatedAt: now }
    return normalizeAgendaJourneyStep({
      ...plan,
      status: existing.status,
      transportMode: existing.transportMode,
      mapJourneyId: existing.mapJourneyId,
      evidenceRefs: existing.evidenceRefs,
      startedAt: existing.startedAt,
      completedAt: existing.completedAt,
      updatedAt: now,
    })
  })
}

export const materializeCalendarAgendaJourney = ({
  occurrence = {},
  request = {},
  existingJourney = null,
  now = Date.now(),
} = {}) => {
  const materializedAt = toTimestamp(now, Date.now())
  const sourceCalendarEventId = trimLine(
    request.sourceCalendarEventId || occurrence.sourceEventId || occurrence.id,
    '',
    140,
  )
  const occurrenceStartsAt = toTimestamp(
    request.occurrenceStartsAt ?? occurrence.startsAt,
    0,
  )
  const occurrenceEndsAt = toTimestamp(request.occurrenceEndsAt ?? occurrence.endsAt, 0)
  const sourceOccurrenceId = trimLine(
    request.sourceOccurrenceId || occurrence.occurrenceId,
    `${sourceCalendarEventId}::${occurrenceStartsAt}`,
    180,
  )
  const sourceCalendarFingerprint = trimLine(
    request.calendarFingerprint,
    '',
    80,
  )
  const scheduleOrchestrationId = trimLine(request.orchestrationId, '', 360)
  const derivedJourneyId = createCalendarAgendaJourneyId(
    sourceCalendarEventId,
    occurrenceStartsAt,
  )
  const journeyId = trimLine(request.agendaJourneyId, derivedJourneyId, 180)
  const incomingExecutionProof = normalizeWorkScheduleExecutionProof(request.executionProof)
  if (
    !journeyId ||
    !sourceOccurrenceId ||
    !sourceCalendarFingerprint ||
    !scheduleOrchestrationId ||
    occurrenceEndsAt <= occurrenceStartsAt ||
    (occurrence.sourceEventId || occurrence.id) !== sourceCalendarEventId ||
    toTimestamp(occurrence.startsAt, 0) !== occurrenceStartsAt
  ) {
    return { ok: false, code: 'CALENDAR_OCCURRENCE_INVALID', journey: null }
  }

  const existing = normalizeAgendaJourney(existingJourney)
  if (existing && existing.id !== journeyId) {
    return { ok: false, code: 'AGENDA_JOURNEY_SOURCE_CONFLICT', journey: null }
  }
  if (existing && TERMINAL_JOURNEY_STATUSES.has(existing.status)) {
    return {
      ok: true,
      code: 'AGENDA_JOURNEY_TERMINAL_PRESERVED',
      journey: {
        ...existing,
        sourceCalendarFingerprint,
        sourceReviewRequired:
          existing.sourceCalendarFingerprint !== sourceCalendarFingerprint,
        updatedAt: materializedAt,
      },
    }
  }

  const titleZh = trimLine(occurrence.titleZh, '未命名安排', 120)
  const titleEn = trimLine(occurrence.titleEn || occurrence.titleZh, 'Untitled plan', 120)
  const locationRef = normalizeAgendaJourneyLocationRef(occurrence.locationRef)
  const requirement = normalizeRequirement(occurrence.requirement)
  const allDay = occurrence.allDay === true
  const plans = buildStepPlans({
    journeyId,
    titleZh,
    titleEn,
    startsAt: occurrenceStartsAt,
    endsAt: occurrenceEndsAt,
    allDay,
    requirement,
    locationRef,
  })
  const executionStarted = Boolean(
    existing?.status === AGENDA_JOURNEY_STATUS.ACTIVE ||
      existing?.steps.some((step) => step.startedAt || TERMINAL_STEP_STATUSES.has(step.status)),
  )
  const fingerprintChanged = Boolean(
    existing && existing.sourceCalendarFingerprint !== sourceCalendarFingerprint,
  )
  const steps = executionStarted && fingerprintChanged
    ? existing.steps.map((step) => ({ ...step }))
    : mergePlannedSteps(plans, existing, materializedAt)

  const journey = normalizeAgendaJourney({
    id: journeyId,
    sourceType: AGENDA_JOURNEY_SOURCE.CALENDAR_OCCURRENCE,
    sourceCalendarEventId,
    sourceOccurrenceId,
    scheduleOrchestrationId,
    sourceCalendarFingerprint,
    executionRevision:
      executionStarted && fingerprintChanged
        ? existing.executionRevision || existing.sourceCalendarFingerprint
        : sourceCalendarFingerprint,
    executionProof:
      executionStarted && fingerprintChanged
        ? existing.executionProof
        : incomingExecutionProof,
    pendingExecutionProof:
      executionStarted && fingerprintChanged
        ? incomingExecutionProof
        : null,
    priorExecutionProofs:
      !executionStarted && fingerprintChanged && existing?.executionProof
        ? [...existing.priorExecutionProofs, existing.executionProof]
        : existing?.priorExecutionProofs || [],
    sourceState: 'active',
    sourceRetiredAt: 0,
    sourceReviewRequired: executionStarted && fingerprintChanged,
    titleZh: executionStarted && fingerprintChanged ? existing.titleZh : titleZh,
    titleEn: executionStarted && fingerprintChanged ? existing.titleEn : titleEn,
    dayStartsAt: startOfCalendarDay(occurrenceStartsAt),
    scheduledStartsAt: executionStarted && fingerprintChanged
      ? existing.scheduledStartsAt
      : occurrenceStartsAt,
    scheduledEndsAt: executionStarted && fingerprintChanged
      ? existing.scheduledEndsAt
      : occurrenceEndsAt,
    allDay: executionStarted && fingerprintChanged ? existing.allDay : allDay,
    requirement: executionStarted && fingerprintChanged ? existing.requirement : requirement,
    locationRef: executionStarted && fingerprintChanged ? existing.locationRef : locationRef,
    status: existing?.status || AGENDA_JOURNEY_STATUS.PLANNED,
    steps,
    outcomeSummaryZh: existing?.outcomeSummaryZh || '',
    outcomeSummaryEn: existing?.outcomeSummaryEn || '',
    startedAt: existing?.startedAt || 0,
    completedAt: existing?.completedAt || 0,
    createdAt: existing?.createdAt || materializedAt,
    updatedAt: materializedAt,
  })
  return journey
    ? {
        ok: true,
        code: existing ? 'AGENDA_JOURNEY_REFRESHED' : 'AGENDA_JOURNEY_CREATED',
        journey,
      }
    : { ok: false, code: 'AGENDA_JOURNEY_NORMALIZATION_FAILED', journey: null }
}

export const createManualAgendaJourney = ({
  id = '',
  title = '',
  titleZh = '',
  titleEn = '',
  startsAt = 0,
  endsAt = 0,
  requirement = 'required',
  locationRef = null,
  now = Date.now(),
} = {}) => {
  const createdAt = toTimestamp(now, Date.now())
  const journeyId = trimLine(id, '', 170)
  const normalizedStartsAt = toTimestamp(startsAt, 0)
  const normalizedEndsAt = toTimestamp(endsAt, 0)
  const fallbackTitle = trimLine(title, '', 120)
  const normalizedTitleZh = trimLine(titleZh || fallbackTitle, '', 120)
  const normalizedTitleEn = trimLine(titleEn || fallbackTitle || normalizedTitleZh, '', 120)
  if (
    !journeyId ||
    !normalizedTitleZh ||
    !normalizedStartsAt ||
    normalizedEndsAt <= normalizedStartsAt
  ) {
    return { ok: false, code: 'MANUAL_AGENDA_JOURNEY_INVALID', journey: null }
  }
  const normalizedLocationRef = normalizeAgendaJourneyLocationRef(locationRef)
  const normalizedRequirement = normalizeRequirement(requirement)
  const steps = buildStepPlans({
    journeyId,
    titleZh: normalizedTitleZh,
    titleEn: normalizedTitleEn,
    startsAt: normalizedStartsAt,
    endsAt: normalizedEndsAt,
    allDay: false,
    requirement: normalizedRequirement,
    locationRef: normalizedLocationRef,
  }).map((step) => ({ ...step, updatedAt: createdAt }))
  const journey = normalizeAgendaJourney({
    id: journeyId,
    sourceType: AGENDA_JOURNEY_SOURCE.MANUAL,
    titleZh: normalizedTitleZh,
    titleEn: normalizedTitleEn,
    dayStartsAt: startOfCalendarDay(normalizedStartsAt),
    scheduledStartsAt: normalizedStartsAt,
    scheduledEndsAt: normalizedEndsAt,
    requirement: normalizedRequirement,
    locationRef: normalizedLocationRef,
    status: AGENDA_JOURNEY_STATUS.PLANNED,
    steps,
    createdAt,
    updatedAt: createdAt,
  })
  return journey
    ? { ok: true, code: 'MANUAL_AGENDA_JOURNEY_CREATED', journey }
    : { ok: false, code: 'AGENDA_JOURNEY_NORMALIZATION_FAILED', journey: null }
}

const unlockNextStep = (steps) => {
  let previousSatisfied = true
  return steps.map((step) => {
    if (!previousSatisfied) return step
    if (
      step.status === AGENDA_JOURNEY_STEP_STATUS.PLANNED &&
      previousSatisfied
    ) {
      previousSatisfied = false
      return { ...step, status: AGENDA_JOURNEY_STEP_STATUS.AVAILABLE }
    }
    previousSatisfied = [
      AGENDA_JOURNEY_STEP_STATUS.COMPLETED,
      AGENDA_JOURNEY_STEP_STATUS.SKIPPED,
    ].includes(step.status)
    return step
  })
}

const deriveJourneyStatus = (journey, steps) => {
  if (steps.some((step) => step.status === AGENDA_JOURNEY_STEP_STATUS.MISSED)) {
    return AGENDA_JOURNEY_STATUS.MISSED
  }
  if (steps.some((step) => step.status === AGENDA_JOURNEY_STEP_STATUS.ACTIVE)) {
    return AGENDA_JOURNEY_STATUS.ACTIVE
  }
  if (steps.every((step) => TERMINAL_STEP_STATUSES.has(step.status))) {
    if (
      steps.some(
        (step) =>
          step.requirement === 'required' &&
          step.status === AGENDA_JOURNEY_STEP_STATUS.SKIPPED,
      )
    ) {
      return AGENDA_JOURNEY_STATUS.MISSED
    }
    if (steps.every((step) => step.status === AGENDA_JOURNEY_STEP_STATUS.CANCELLED)) {
      return AGENDA_JOURNEY_STATUS.CANCELLED
    }
    if (steps.every((step) => step.status === AGENDA_JOURNEY_STEP_STATUS.SKIPPED)) {
      return AGENDA_JOURNEY_STATUS.SKIPPED
    }
    return AGENDA_JOURNEY_STATUS.COMPLETED
  }
  return journey.startedAt ? AGENDA_JOURNEY_STATUS.ACTIVE : AGENDA_JOURNEY_STATUS.PLANNED
}

const applyOutcomeSummary = (journey, status, completedAt) => {
  if (status === AGENDA_JOURNEY_STATUS.COMPLETED) {
    return {
      ...journey,
      outcomeSummaryZh: `${journey.titleZh}已完成。`,
      outcomeSummaryEn: `${journey.titleEn} was completed.`,
      completedAt,
    }
  }
  if (status === AGENDA_JOURNEY_STATUS.MISSED) {
    return {
      ...journey,
      outcomeSummaryZh: `${journey.titleZh}未按计划完成。`,
      outcomeSummaryEn: `${journey.titleEn} was not completed as planned.`,
      completedAt,
    }
  }
  if (status === AGENDA_JOURNEY_STATUS.CANCELLED) {
    return {
      ...journey,
      outcomeSummaryZh: `${journey.titleZh}已取消。`,
      outcomeSummaryEn: `${journey.titleEn} was cancelled.`,
      completedAt,
    }
  }
  if (status === AGENDA_JOURNEY_STATUS.SKIPPED) {
    return {
      ...journey,
      outcomeSummaryZh: `${journey.titleZh}已跳过。`,
      outcomeSummaryEn: `${journey.titleEn} was skipped.`,
      completedAt,
    }
  }
  return { ...journey, completedAt: 0 }
}

const updateJourneySteps = (journey, steps, now) => {
  const unlockedSteps = unlockNextStep(steps)
  const status = deriveJourneyStatus(journey, unlockedSteps)
  const withStatus = applyOutcomeSummary(
    {
      ...journey,
      status,
      steps: unlockedSteps,
      startedAt:
        journey.startedAt ||
        (status === AGENDA_JOURNEY_STATUS.ACTIVE ? now : 0),
      updatedAt: now,
    },
    status,
    TERMINAL_JOURNEY_STATUSES.has(status) ? now : 0,
  )
  return normalizeAgendaJourney(withStatus)
}

export const setAgendaJourneyStepTransportMode = (
  rawJourney,
  stepId,
  transportMode,
  { now = Date.now() } = {},
) => {
  const journey = normalizeAgendaJourney(rawJourney)
  const normalizedStepId = trimLine(stepId, '', 180)
  if (!journey || !isMapTransportMode(transportMode)) return null
  const step = journey.steps.find((candidate) => candidate.id === normalizedStepId)
  if (
    !step ||
    step.kind !== AGENDA_JOURNEY_STEP_KIND.TRAVEL ||
    TERMINAL_STEP_STATUSES.has(step.status)
  ) {
    return null
  }
  const updatedAt = toTimestamp(now, Date.now())
  return normalizeAgendaJourney({
    ...journey,
    steps: journey.steps.map((candidate) =>
      candidate.id === step.id
        ? { ...candidate, transportMode, updatedAt }
        : candidate,
    ),
    updatedAt,
  })
}

export const linkAgendaJourneyMapJourney = (
  rawJourney,
  stepId,
  mapJourneyResult = {},
  { now = Date.now() } = {},
) => {
  const journey = normalizeAgendaJourney(rawJourney)
  const normalizedStepId = trimLine(stepId, '', 180)
  const mapJourneyId = trimLine(mapJourneyResult.journeyId, '', 180)
  if (!journey || mapJourneyResult.ok !== true || !mapJourneyId) {
    return { ok: false, code: 'MAP_JOURNEY_LINK_INVALID', journey: null }
  }
  const step = journey.steps.find((candidate) => candidate.id === normalizedStepId)
  if (
    !step ||
    step.kind !== AGENDA_JOURNEY_STEP_KIND.TRAVEL ||
    TERMINAL_STEP_STATUSES.has(step.status)
  ) {
    return { ok: false, code: 'AGENDA_TRAVEL_STEP_UNAVAILABLE', journey: null }
  }
  const linkedAt = toTimestamp(now, Date.now())
  const steps = journey.steps.map((candidate) =>
    candidate.id === step.id
      ? {
          ...candidate,
          status: AGENDA_JOURNEY_STEP_STATUS.ACTIVE,
          transportMode: isMapTransportMode(mapJourneyResult.transportMode)
            ? mapJourneyResult.transportMode
            : candidate.transportMode,
          mapJourneyId,
          startedAt: candidate.startedAt || linkedAt,
          evidenceRefs: appendEvidence(candidate.evidenceRefs, {
            owner: 'map',
            type: 'map_journey_link',
            recordId: mapJourneyId,
            status: mapJourneyResult.reused ? 'reused' : 'started',
            observedAt: linkedAt,
          }),
          updatedAt: linkedAt,
        }
      : candidate,
  )
  return {
    ok: true,
    code: mapJourneyResult.reused ? 'MAP_JOURNEY_REUSED' : 'MAP_JOURNEY_LINKED',
    journey: updateJourneySteps(journey, steps, linkedAt),
  }
}

const mapEvidenceForStep = (journey, step, activeMapJourney, mapJourneyHistory) => {
  const active = activeMapJourney && typeof activeMapJourney === 'object' ? activeMapJourney : null
  const activeMatches = Boolean(
    active &&
      (active.sourceAgendaJourneyStepId === step.id ||
        (step.mapJourneyId && active.journeyId === step.mapJourneyId)) &&
      (!active.sourceAgendaJourneyId || active.sourceAgendaJourneyId === journey.id) &&
      (!active.sourceAgendaExecutionRevision ||
        active.sourceAgendaExecutionRevision === journey.executionRevision),
  )
  if (activeMatches) {
    return {
      journeyId: trimLine(active.journeyId, '', 180),
      status: active.status,
      observedAt: toTimestamp(active.arrivedAt || active.startedAt, Date.now()),
    }
  }
  const history = Array.isArray(mapJourneyHistory) ? mapJourneyHistory : []
  const match = history.find(
    (entry) =>
      entry &&
      (entry.sourceAgendaJourneyStepId === step.id ||
        (step.mapJourneyId && entry.journeyId === step.mapJourneyId)) &&
      (!entry.sourceAgendaJourneyId || entry.sourceAgendaJourneyId === journey.id) &&
      (!entry.sourceAgendaExecutionRevision ||
        entry.sourceAgendaExecutionRevision === journey.executionRevision),
  )
  return match
    ? {
        journeyId: trimLine(match.journeyId, '', 180),
        status: match.status,
        observedAt: toTimestamp(match.endedAt || match.arrivedAt, Date.now()),
      }
    : null
}

export const reconcileAgendaJourneyMapEvidence = (
  rawJourney,
  { activeMapJourney = null, mapJourneyHistory = [], now = Date.now() } = {},
) => {
  const journey = normalizeAgendaJourney(rawJourney)
  if (!journey || TERMINAL_JOURNEY_STATUSES.has(journey.status)) return journey
  const reconciledAt = toTimestamp(now, Date.now())
  let changed = false
  const steps = journey.steps.map((step) => {
    if (step.kind !== AGENDA_JOURNEY_STEP_KIND.TRAVEL) return step
    const evidence = mapEvidenceForStep(journey, step, activeMapJourney, mapJourneyHistory)
    if (!evidence?.journeyId) return step
    if (evidence.status === 'arrived') {
      if (
        step.status === AGENDA_JOURNEY_STEP_STATUS.COMPLETED &&
        step.mapJourneyId === evidence.journeyId
      ) {
        return step
      }
      changed = true
      return {
        ...step,
        status: AGENDA_JOURNEY_STEP_STATUS.COMPLETED,
        mapJourneyId: evidence.journeyId,
        startedAt: step.startedAt || evidence.observedAt,
        completedAt: evidence.observedAt,
        evidenceRefs: appendEvidence(step.evidenceRefs, {
          owner: 'map',
          type: 'map_journey_arrival',
          recordId: evidence.journeyId,
          status: 'arrived',
          observedAt: evidence.observedAt,
        }),
        updatedAt: reconciledAt,
      }
    }
    if (evidence.status === 'cancelled') {
      if (!step.mapJourneyId && step.status === AGENDA_JOURNEY_STEP_STATUS.AVAILABLE) return step
      changed = true
      return {
        ...step,
        status: AGENDA_JOURNEY_STEP_STATUS.AVAILABLE,
        mapJourneyId: '',
        startedAt: 0,
        completedAt: 0,
        evidenceRefs: appendEvidence(step.evidenceRefs, {
          owner: 'map',
          type: 'map_journey_cancellation',
          recordId: evidence.journeyId,
          status: 'cancelled',
          observedAt: evidence.observedAt,
        }),
        updatedAt: reconciledAt,
      }
    }
    if (evidence.status === 'traveling' && step.status !== AGENDA_JOURNEY_STEP_STATUS.ACTIVE) {
      changed = true
      return {
        ...step,
        status: AGENDA_JOURNEY_STEP_STATUS.ACTIVE,
        mapJourneyId: evidence.journeyId,
        startedAt: step.startedAt || evidence.observedAt,
        updatedAt: reconciledAt,
      }
    }
    return step
  })
  return changed ? updateJourneySteps(journey, steps, reconciledAt) : journey
}

export const prepareAgendaJourneyActivitySessionRequest = (
  rawJourney,
  stepId,
  {
    completionPolicy = ACTIVITY_SESSION_COMPLETION_POLICY.USER_CONFIRMATION,
    pausePolicy = ACTIVITY_SESSION_PAUSE_POLICY.ALLOW_PAUSE,
  } = {},
) => {
  const journey = normalizeAgendaJourney(rawJourney)
  const normalizedStepId = trimLine(stepId, '', 180)
  const step = journey?.steps.find((candidate) => candidate.id === normalizedStepId)
  if (!journey || !step || step.kind !== AGENDA_JOURNEY_STEP_KIND.ACTIVITY) {
    return { ok: false, code: 'AGENDA_ACTIVITY_SESSION_SOURCE_INVALID', request: null }
  }
  if (
    TERMINAL_JOURNEY_STATUSES.has(journey.status) ||
    journey.sourceReviewRequired ||
    ![
      AGENDA_JOURNEY_STEP_STATUS.AVAILABLE,
      AGENDA_JOURNEY_STEP_STATUS.ACTIVE,
    ].includes(step.status)
  ) {
    return { ok: false, code: 'AGENDA_ACTIVITY_SESSION_UNAVAILABLE', request: null }
  }
  if (!Object.values(ACTIVITY_SESSION_COMPLETION_POLICY).includes(completionPolicy)) {
    return { ok: false, code: 'AGENDA_ACTIVITY_SESSION_POLICY_INVALID', request: null }
  }
  if (!Object.values(ACTIVITY_SESSION_PAUSE_POLICY).includes(pausePolicy)) {
    return { ok: false, code: 'AGENDA_ACTIVITY_SESSION_PAUSE_POLICY_INVALID', request: null }
  }
  const travelStep = journey.steps.find(
    (candidate) => candidate.kind === AGENDA_JOURNEY_STEP_KIND.TRAVEL,
  )
  return {
    ok: true,
    code: 'AGENDA_ACTIVITY_SESSION_READY',
    request: {
      sourceOwner: 'agenda-journey',
      sourceStepKind: step.kind,
      sourceStepStatus: step.status,
      agendaJourneyId: journey.id,
      agendaJourneyStepId: step.id,
      agendaExecutionRevision: journey.executionRevision,
      sourceCalendarEventId: journey.sourceCalendarEventId,
      sourceMapJourneyId: travelStep?.mapJourneyId || '',
      plannedDurationMs: Math.max(60_000, step.scheduledEndsAt - step.scheduledStartsAt),
      completionPolicy,
      pausePolicy,
    },
  }
}

export const transitionAgendaJourneyActivityStep = (
  rawJourney,
  stepId,
  action,
  { now = Date.now(), completionPolicy = '' } = {},
) => {
  const journey = normalizeAgendaJourney(rawJourney)
  const normalizedStepId = trimLine(stepId, '', 180)
  const step = journey?.steps.find((candidate) => candidate.id === normalizedStepId)
  if (!journey || !step || step.kind !== AGENDA_JOURNEY_STEP_KIND.ACTIVITY) {
    return { ok: false, code: 'AGENDA_ACTIVITY_STEP_MISSING', journey: null }
  }
  if (TERMINAL_JOURNEY_STATUSES.has(journey.status)) {
    return { ok: false, code: 'AGENDA_JOURNEY_TERMINAL', journey: null }
  }
  const transitionedAt = toTimestamp(now, Date.now())
  let nextStep = step
  if (action === 'start') {
    if (
      ![
        AGENDA_JOURNEY_STEP_STATUS.AVAILABLE,
        AGENDA_JOURNEY_STEP_STATUS.ACTIVE,
      ].includes(step.status)
    ) {
      return { ok: false, code: 'AGENDA_ACTIVITY_NOT_AVAILABLE', journey: null }
    }
    nextStep = {
      ...step,
      status: AGENDA_JOURNEY_STEP_STATUS.ACTIVE,
      completionPolicy: normalizeCompletionPolicy(completionPolicy, step.kind),
      startedAt: step.startedAt || transitionedAt,
      updatedAt: transitionedAt,
    }
  } else if (action === 'complete') {
    if (step.status !== AGENDA_JOURNEY_STEP_STATUS.ACTIVE) {
      return { ok: false, code: 'AGENDA_ACTIVITY_NOT_ACTIVE', journey: null }
    }
    nextStep = {
      ...step,
      status: AGENDA_JOURNEY_STEP_STATUS.COMPLETED,
      completedAt: transitionedAt,
      updatedAt: transitionedAt,
    }
  } else if (action === 'skip') {
    if (![AGENDA_JOURNEY_STEP_STATUS.AVAILABLE, AGENDA_JOURNEY_STEP_STATUS.ACTIVE].includes(step.status)) {
      return { ok: false, code: 'AGENDA_ACTIVITY_NOT_SKIPPABLE', journey: null }
    }
    nextStep = {
      ...step,
      status:
        step.requirement === 'required'
          ? AGENDA_JOURNEY_STEP_STATUS.MISSED
          : AGENDA_JOURNEY_STEP_STATUS.SKIPPED,
      completedAt: transitionedAt,
      updatedAt: transitionedAt,
    }
  } else {
    return { ok: false, code: 'AGENDA_ACTIVITY_ACTION_UNSUPPORTED', journey: null }
  }
  const steps = journey.steps.map((candidate) =>
    candidate.id === step.id ? nextStep : candidate,
  )
  return {
    ok: true,
    code: `AGENDA_ACTIVITY_${action.toUpperCase()}ED`,
    journey: updateJourneySteps(journey, steps, transitionedAt),
  }
}

export const applyAgendaJourneyActivitySessionEvidence = (
  rawJourney,
  stepId,
  evidence = {},
  { now = Date.now() } = {},
) => {
  const journey = normalizeAgendaJourney(rawJourney)
  const normalizedStepId = trimLine(stepId, '', 180)
  const step = journey?.steps.find((candidate) => candidate.id === normalizedStepId)
  const evidenceObservedAt = toTimestamp(evidence.observedAt, toTimestamp(now, Date.now()))
  const expectedSessionId = createActivitySessionId(normalizedStepId)
  const evidenceValid = Boolean(
    evidence.owner === 'activity-session' &&
      evidence.type === 'activity_session_completion' &&
      trimLine(evidence.recordId, '', 220) === expectedSessionId &&
      trimLine(evidence.agendaJourneyId, '', 180) === journey?.id &&
      trimLine(evidence.agendaJourneyStepId, '', 180) === normalizedStepId &&
      (!journey.executionRevision ||
        trimLine(evidence.agendaExecutionRevision, '', 80) === journey.executionRevision) &&
      evidence.status === 'completed' &&
      Object.values(ACTIVITY_SESSION_COMPLETION_POLICY).includes(
        evidence.completionPolicy,
      ) &&
      evidenceObservedAt > 0,
  )
  if (!journey || !step || step.kind !== AGENDA_JOURNEY_STEP_KIND.ACTIVITY || !evidenceValid) {
    return { ok: false, code: 'AGENDA_ACTIVITY_SESSION_EVIDENCE_INVALID', journey: null }
  }
  const alreadyRecorded = step.evidenceRefs.some(
    (reference) =>
      reference.owner === 'activity-session' &&
      reference.type === 'activity_session_completion' &&
      reference.recordId === expectedSessionId,
  )
  if (step.status === AGENDA_JOURNEY_STEP_STATUS.COMPLETED && alreadyRecorded) {
    return { ok: true, code: 'AGENDA_ACTIVITY_SESSION_EVIDENCE_ALREADY_APPLIED', journey }
  }
  if (
    TERMINAL_JOURNEY_STATUSES.has(journey.status) ||
    step.status !== AGENDA_JOURNEY_STEP_STATUS.ACTIVE
  ) {
    return { ok: false, code: 'AGENDA_ACTIVITY_SESSION_STEP_NOT_ACTIVE', journey: null }
  }
  const nextStep = {
    ...step,
    status: AGENDA_JOURNEY_STEP_STATUS.COMPLETED,
    completionPolicy: normalizeCompletionPolicy(evidence.completionPolicy, step.kind),
    completedAt: evidenceObservedAt,
    evidenceRefs: appendEvidence(step.evidenceRefs, {
      owner: 'activity-session',
      type: 'activity_session_completion',
      recordId: expectedSessionId,
      status: 'completed',
      observedAt: evidenceObservedAt,
    }),
    updatedAt: evidenceObservedAt,
  }
  const steps = journey.steps.map((candidate) =>
    candidate.id === step.id ? nextStep : candidate,
  )
  return {
    ok: true,
    code: 'AGENDA_ACTIVITY_SESSION_EVIDENCE_APPLIED',
    journey: updateJourneySteps(journey, steps, evidenceObservedAt),
  }
}

export const cancelAgendaJourney = (rawJourney, { now = Date.now(), reason = '' } = {}) => {
  const journey = normalizeAgendaJourney(rawJourney)
  if (!journey || TERMINAL_JOURNEY_STATUSES.has(journey.status)) return null
  const cancelledAt = toTimestamp(now, Date.now())
  const steps = journey.steps.map((step) =>
    TERMINAL_STEP_STATUSES.has(step.status)
      ? step
      : {
          ...step,
          status: AGENDA_JOURNEY_STEP_STATUS.CANCELLED,
          completedAt: cancelledAt,
          updatedAt: cancelledAt,
        },
  )
  const cancelledJourney = updateJourneySteps(journey, steps, cancelledAt)
  return normalizeAgendaJourney({
    ...cancelledJourney,
    status: AGENDA_JOURNEY_STATUS.CANCELLED,
    completedAt: cancelledAt,
    outcomeSummaryZh: reason
      ? `${journey.titleZh}已取消：${trimLine(reason, '', 120)}`
      : `${journey.titleZh}已取消。`,
    outcomeSummaryEn: reason
      ? `${journey.titleEn} was cancelled: ${trimLine(reason, '', 120)}`
      : `${journey.titleEn} was cancelled.`,
  })
}

export const retireCalendarAgendaJourneySource = (
  rawJourney,
  { retiredAt = Date.now(), reason = 'calendar_source_retired' } = {},
) => {
  const journey = normalizeAgendaJourney(rawJourney)
  if (!journey || journey.sourceType !== AGENDA_JOURNEY_SOURCE.CALENDAR_OCCURRENCE) {
    return journey
  }
  const sourceRetiredAt = toTimestamp(retiredAt, Date.now())
  if (journey.sourceState === 'retired') return journey
  const executionStarted = Boolean(
    journey.status === AGENDA_JOURNEY_STATUS.ACTIVE ||
      journey.steps.some((step) => step.startedAt || TERMINAL_STEP_STATUSES.has(step.status)),
  )
  if (executionStarted || TERMINAL_JOURNEY_STATUSES.has(journey.status)) {
    return normalizeAgendaJourney({
      ...journey,
      sourceState: 'retired',
      sourceRetiredAt,
      sourceReviewRequired: !TERMINAL_JOURNEY_STATUSES.has(journey.status),
      updatedAt: sourceRetiredAt,
    })
  }
  return normalizeAgendaJourney({
    ...cancelAgendaJourney(journey, { now: sourceRetiredAt, reason }),
    sourceState: 'retired',
    sourceRetiredAt,
    updatedAt: sourceRetiredAt,
  })
}

export const evaluateAgendaJourneyDeadline = (
  rawJourney,
  { evaluatedAt = Date.now() } = {},
) => {
  const journey = normalizeAgendaJourney(rawJourney)
  if (!journey) return { ok: false, code: 'AGENDA_JOURNEY_MISSING', journey: null }
  if (journey.requirement !== 'required') {
    return { ok: true, code: 'AGENDA_DEADLINE_OPTIONAL', journey }
  }
  if (TERMINAL_JOURNEY_STATUSES.has(journey.status)) {
    return { ok: true, code: 'AGENDA_DEADLINE_ALREADY_TERMINAL', journey }
  }
  const deadlineAt = toTimestamp(evaluatedAt, Date.now())
  const steps = journey.steps.map((step) =>
    TERMINAL_STEP_STATUSES.has(step.status)
      ? step
      : {
          ...step,
          status: AGENDA_JOURNEY_STEP_STATUS.MISSED,
          completedAt: deadlineAt,
          updatedAt: deadlineAt,
        },
  )
  return {
    ok: true,
    code: 'AGENDA_DEADLINE_MISSED',
    journey: updateJourneySteps(journey, steps, deadlineAt),
  }
}
