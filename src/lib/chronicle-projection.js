import { normalizeChronicleSourceRefs, chronicleDateKey } from './chronicle'
import { createCalendarOccurrenceFingerprint } from './schedule-orchestrator'
import { WORK_HUB_SCHEDULE_CHANGE_RESULT } from './simulation/work-hub-event-templates'

export const CHRONICLE_TIMELINE_SCHEMA_VERSION = 1

const trimLine = (value, fallback = '', max = 260) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const toTimestamp = (value, fallback = 0) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : fallback
}

const sourceRevision = (value) => trimLine(String(value || ''), '', 220)

const createNode = (raw) => {
  const id = trimLine(raw.id, '', 360)
  const occurredAt = toTimestamp(raw.occurredAt, 0)
  const sourceRefs = normalizeChronicleSourceRefs(raw.sourceRefs)
  if (!id || !occurredAt || !sourceRefs.length) return null
  return {
    schemaVersion: CHRONICLE_TIMELINE_SCHEMA_VERSION,
    id,
    chainId: trimLine(raw.chainId, '', 260),
    dateKey: chronicleDateKey(occurredAt),
    occurredAt,
    stage: trimLine(raw.stage, '', 80),
    status: trimLine(raw.status, '', 80),
    titleZh: trimLine(raw.titleZh, '一条已确认的生活记录', 180),
    titleEn: trimLine(raw.titleEn, 'A confirmed life record', 180),
    summaryZh: trimLine(raw.summaryZh, '', 420),
    summaryEn: trimLine(raw.summaryEn, '', 420),
    worldId: trimLine(raw.worldId, '', 180),
    sourceRefs,
    sourceState: raw.sourceState === 'broken' ? 'broken' : 'verified',
  }
}

const findById = (items, id) =>
  (Array.isArray(items) ? items : []).find((candidate) => candidate?.id === id) || null

const findCalendarEvent = (events, proof) => {
  const event = findById(events, proof.calendarEventId)
  if (!event || event.status !== 'confirmed') return null
  return createCalendarOccurrenceFingerprint(event) === proof.calendarFingerprint ? event : null
}

const findAcceptedReceipt = (receipts, proof) => {
  const receipt = findById(receipts, proof.acceptedReceiptId)
  return receipt?.action === 'accepted' && receipt.sourceRef?.recordId === proof.proposalId
    ? receipt
    : null
}

const findResolvedInstance = (instances, proof) => {
  const instance = findById(instances, proof.eventInstanceId)
  return instance?.lifecycle === 'resolved' &&
    instance.resultCodes?.includes(WORK_HUB_SCHEDULE_CHANGE_RESULT.ACCEPTED)
    ? instance
    : null
}

const findOwnerFact = (facts, proof) => {
  const fact = findById(facts, proof.ownerFactId)
  return fact?.correlationId === proof.eventInstanceId &&
    fact.resultCode === WORK_HUB_SCHEDULE_CHANGE_RESULT.ACCEPTED
    ? fact
    : null
}

const findJourneyTrip = (tripState, tripHistory, journey) => {
  const candidates = [tripState, ...(Array.isArray(tripHistory) ? tripHistory : [])]
  return candidates.find(
    (trip) =>
      trip?.sourceAgendaJourneyId === journey.id &&
      trip?.sourceAgendaExecutionRevision === journey.executionRevision,
  ) || null
}

const findJourneyActivity = (sessions, journey) =>
  (Array.isArray(sessions) ? sessions : []).find(
    (session) =>
      session?.agendaJourneyId === journey.id &&
      session?.agendaExecutionRevision === journey.executionRevision,
  ) || null

const timelineRef = (owner, recordType, recordId, revision, query = {}) => ({
  owner,
  recordType,
  recordId,
  revision: sourceRevision(revision),
  query,
})

const projectVerifiedWorkJourney = ({
  journey,
  calendarEvents,
  mapTripState,
  mapTripHistory,
  activitySessions,
  workHubReceipts,
  eventInstances,
  ownerFacts,
}) => {
  const proof = journey?.executionProof
  if (!proof || journey.executionRevision !== proof.calendarFingerprint) return []
  const calendarEvent = findCalendarEvent(calendarEvents, proof)
  const receipt = findAcceptedReceipt(workHubReceipts, proof)
  const instance = findResolvedInstance(eventInstances, proof)
  const fact = findOwnerFact(ownerFacts, proof)
  if (!calendarEvent || !receipt || !instance || !fact) return []

  const chainId = `chronicle_chain::${proof.eventInstanceId}::${journey.executionRevision}`
  const worldId = proof.worldId
  const nodes = []
  const workAt = toTimestamp(receipt.createdAt || receipt.decidedAt || fact.recordedAt, 0)
  const calendarAt = toTimestamp(calendarEvent.updatedAt || calendarEvent.createdAt || calendarEvent.startsAt, 0)
  if (workAt) {
    nodes.push(createNode({
      id: `${chainId}::work_hub_accepted`,
      chainId,
      occurredAt: workAt,
      stage: 'work_decision',
      status: 'accepted',
      titleZh: '组织安排已由你确认',
      titleEn: 'You confirmed the organization schedule',
      summaryZh: '这项安排在工作台中得到明确确认，随后才进入日历复核。',
      summaryEn: 'The schedule was explicitly accepted in Work Hub before Calendar review.',
      worldId,
      sourceRefs: [timelineRef('work-hub', 'schedule_proposal', proof.proposalId, proof.proposalRevision, {
        mode: 'production',
        recordId: proof.proposalId,
        source: 'chronicle',
      })],
    }))
  }
  if (calendarAt) {
    nodes.push(createNode({
      id: `${chainId}::calendar_confirmed`,
      chainId,
      occurredAt: calendarAt,
      stage: 'calendar_commitment',
      status: 'confirmed',
      titleZh: calendarEvent.titleZh || '日历安排已确认',
      titleEn: calendarEvent.titleEn || 'Calendar schedule confirmed',
      summaryZh: '时间由日历保存，并保留了这次安排调整的来源。',
      summaryEn: 'Calendar saved the time and retained the schedule-change lineage.',
      worldId,
      sourceRefs: [timelineRef('calendar', 'calendar_event', calendarEvent.id, journey.executionRevision, {
        calendarEventId: calendarEvent.id,
        source: 'chronicle',
      })],
    }))
  }

  const journeyAt = toTimestamp(journey.updatedAt || journey.scheduledStartsAt, 0)
  if (journeyAt) {
    const status = journey.sourceReviewRequired ? 'review_required' : journey.status
    nodes.push(createNode({
      id: `${chainId}::agenda::${status}`,
      chainId,
      occurredAt: journeyAt,
      stage: 'agenda_execution',
      status,
      titleZh: journey.titleZh || '近期执行计划',
      titleEn: journey.titleEn || 'Near-term execution plan',
      summaryZh: journey.sourceReviewRequired
        ? '来源后来发生变化，正在执行的版本被保留并等待复核。'
        : '这条记录只说明当前执行状态，不替代日历或其他来源。',
      summaryEn: journey.sourceReviewRequired
        ? 'The source later changed; the active execution revision was preserved for review.'
        : 'This reflects execution state without replacing Calendar or another owner.',
      worldId,
      sourceRefs: [timelineRef('agenda-journey', 'agenda_journey', journey.id, journey.executionRevision, {
        journeyId: journey.id,
        source: 'chronicle',
      })],
    }))
  }

  const trip = findJourneyTrip(mapTripState, mapTripHistory, journey)
  if (trip && ['arrived', 'cancelled', 'traveling', 'paused'].includes(trip.status)) {
    const tripAt = toTimestamp(trip.arrivedAt || trip.cancelledAt || trip.startedAt, 0)
    if (tripAt) {
      nodes.push(createNode({
        id: `${chainId}::map::${trip.journeyId}::${trip.status}`,
        chainId,
        occurredAt: tripAt,
        stage: 'map_journey',
        status: trip.status,
        titleZh: trip.status === 'arrived' ? '已经到达安排地点' : '路线状态已更新',
        titleEn: trip.status === 'arrived' ? 'Arrived at the scheduled place' : 'Route status updated',
        summaryZh: trip.status === 'arrived'
          ? '地图确认了真实抵达；抵达本身不代表活动完成。'
          : '地图保留了这段路线的当前结果。',
        summaryEn: trip.status === 'arrived'
          ? 'Map confirmed arrival; arrival alone does not prove activity completion.'
          : 'Map retained the current outcome of this route.',
        worldId,
        sourceRefs: [timelineRef('map', 'map_journey', trip.journeyId, trip.sourceAgendaExecutionRevision, {
          journeyId: trip.journeyId,
          source: 'chronicle',
        })],
      }))
    }
  }

  const session = findJourneyActivity(activitySessions, journey)
  if (session && ['running', 'paused', 'completed', 'cancelled'].includes(session.status)) {
    const sessionAt = toTimestamp(session.completedAt || session.cancelledAt || session.startedAt, 0)
    if (sessionAt) {
      nodes.push(createNode({
        id: `${chainId}::activity::${session.id}::${session.status}`,
        chainId,
        occurredAt: sessionAt,
        stage: 'activity_session',
        status: session.status,
        titleZh: session.status === 'completed' ? '活动计时已经结束' : '活动由你明确开始',
        titleEn: session.status === 'completed' ? 'Activity timing ended' : 'You explicitly started the activity',
        summaryZh: session.status === 'completed'
          ? '这里只确认计时和完成证据，不推断绩效或其他领域后果。'
          : '活动计时已经开始，但生活志不会据此推断最终完成。',
        summaryEn: session.status === 'completed'
          ? 'This confirms timing evidence only, not performance or downstream consequences.'
          : 'Timing started, but Chronicle does not infer final completion from that alone.',
        worldId,
        sourceRefs: [timelineRef('activity-session', 'activity_session', session.id, session.agendaExecutionRevision, {
          journeyId: journey.id,
          stepId: session.agendaJourneyStepId,
          source: 'chronicle',
        })],
      }))
    }
  }
  return nodes.filter(Boolean)
}

export const projectChronicleTimeline = ({
  calendarEvents = [],
  agendaJourneys = [],
  mapTripState = null,
  mapTripHistory = [],
  activitySessions = [],
  workHubReceipts = [],
  eventInstances = [],
  ownerFacts = [],
  worldId = '',
} = {}) => {
  const byId = new Map()
  ;(Array.isArray(agendaJourneys) ? agendaJourneys : []).forEach((journey) => {
    projectVerifiedWorkJourney({
      journey,
      calendarEvents,
      mapTripState,
      mapTripHistory,
      activitySessions,
      workHubReceipts,
      eventInstances,
      ownerFacts,
    }).forEach((node) => {
      if (!node || (worldId && node.worldId && node.worldId !== worldId)) return
      byId.set(node.id, node)
    })
  })
  return [...byId.values()].sort(
    (left, right) => left.occurredAt - right.occurredAt || left.id.localeCompare(right.id),
  )
}

export const inspectChronicleSourceRef = (sourceRef, timelineNodes = []) => {
  const normalized = normalizeChronicleSourceRefs([sourceRef])[0] || null
  if (!normalized) return { ok: false, code: 'chronicle_source_invalid', sourceRef: null }
  const linked = (Array.isArray(timelineNodes) ? timelineNodes : []).some((node) =>
    node?.sourceRefs?.some(
      (candidate) =>
        candidate.owner === normalized.owner &&
        candidate.recordType === normalized.recordType &&
        candidate.recordId === normalized.recordId &&
        candidate.revision === normalized.revision,
    ),
  )
  return linked
    ? { ok: true, code: 'chronicle_source_verified', sourceRef: normalized }
    : { ok: false, code: 'chronicle_source_unavailable', sourceRef: normalized }
}
