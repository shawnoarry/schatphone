const MAX_TIMESTAMP = 8_640_000_000_000_000
const PARTICIPANT_LIMIT = 20
const RETURN_QUERY_LIMIT = 12

export const SCHEDULE_HANDOFF_DRAFT_SCHEMA_VERSION = 1

export const SCHEDULE_HANDOFF_SOURCE_OWNERS = Object.freeze({
  MAIL: 'mail',
  WORKPLACE: 'workplace',
  HEALTHCARE: 'healthcare',
  TICKETS: 'tickets',
  TRAVEL: 'travel',
  CAREER: 'career',
})

export const SCHEDULE_HANDOFF_PROPOSAL_STATUSES = Object.freeze({
  PENDING_REVIEW: 'pending_review',
  CONFIRMED: 'confirmed',
  SOURCE_CHANGED: 'source_changed',
  SOURCE_CANCELLED: 'source_cancelled',
})

export const SCHEDULE_HANDOFF_CONFLICT_DECISIONS = Object.freeze({
  REVIEW_NEW: 'review_new',
  REUSE_CONFIRMED: 'reuse_confirmed',
  REVIEW_SOURCE_CHANGE: 'review_source_change',
  REVIEW_SOURCE_CANCELLATION: 'review_source_cancellation',
  BLOCKED_IDENTITY_CONFLICT: 'blocked_identity_conflict',
})

const SOURCE_RETURN_PATHS = Object.freeze({
  [SCHEDULE_HANDOFF_SOURCE_OWNERS.MAIL]: '/mail',
  [SCHEDULE_HANDOFF_SOURCE_OWNERS.WORKPLACE]: '/workplace',
  [SCHEDULE_HANDOFF_SOURCE_OWNERS.HEALTHCARE]: '/healthcare',
  [SCHEDULE_HANDOFF_SOURCE_OWNERS.TICKETS]: '/tickets',
  [SCHEDULE_HANDOFF_SOURCE_OWNERS.TRAVEL]: '/travel',
  [SCHEDULE_HANDOFF_SOURCE_OWNERS.CAREER]: '/career',
})

const SOURCE_OWNER_IDS = new Set(Object.values(SCHEDULE_HANDOFF_SOURCE_OWNERS))
const PROPOSAL_STATUS_IDS = new Set(Object.values(SCHEDULE_HANDOFF_PROPOSAL_STATUSES))

const trimLine = (value, fallback = '', max = 180) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const toTimestamp = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return Math.min(MAX_TIMESTAMP, Math.floor(numeric))
}

const fingerprintText = (value) => {
  const text = JSON.stringify(value)
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let index = 0; index < text.length; index += 1) {
    hash ^= BigInt(text.charCodeAt(index))
    hash = BigInt.asUintN(64, hash * prime)
  }
  return hash.toString(16).padStart(16, '0')
}

export const createScheduleHandoffIdempotencyKey = (sourceOwner, sourceRecordId) => {
  const owner = trimLine(sourceOwner, '', 40).toLowerCase()
  const recordId = trimLine(sourceRecordId, '', 180)
  if (!SOURCE_OWNER_IDS.has(owner) || !recordId) return ''
  return `schedule_handoff::${owner}::${recordId}`
}

const normalizeLocationRef = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.owner !== 'map') {
    return null
  }
  const mapPackId = trimLine(raw.mapPackId, '', 120)
  const placeId = trimLine(raw.placeId, '', 180).toLowerCase()
  if (!mapPackId || !placeId) return null
  const labelZh = trimLine(raw.labelZh, '', 120)
  const labelEn = trimLine(raw.labelEn, labelZh, 120)
  const detail = trimLine(raw.detail, '', 240)
  return {
    owner: 'map',
    mapPackId,
    placeId,
    labelZh,
    labelEn,
    detail,
  }
}

const normalizeParticipantRefs = (raw) => {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) return null
  const seen = new Set()
  const normalized = []
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue
    const owner = trimLine(candidate.owner, '', 40).toLowerCase()
    const recordId = trimLine(candidate.recordId, '', 180)
    if (owner !== 'contacts' || !recordId) continue
    const key = `${owner}:${recordId}`
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push({ owner, recordId })
    if (normalized.length >= PARTICIPANT_LIMIT) break
  }
  return normalized
}

const normalizeReturnQuery = (raw) => {
  if (raw === undefined) return {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const entries = Object.entries(raw)
  if (entries.length > RETURN_QUERY_LIMIT) return null
  const query = {}
  for (const [rawKey, rawValue] of entries) {
    if (!/^[a-z][a-z0-9_-]{0,63}$/i.test(rawKey)) return null
    if (!['string', 'number', 'boolean'].includes(typeof rawValue)) return null
    if (typeof rawValue === 'number' && !Number.isFinite(rawValue)) return null
    const value = trimLine(String(rawValue), '', 180)
    if (!value) return null
    query[rawKey] = value
  }
  return query
}

const normalizeReturnContext = (raw, sourceOwner) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const path = trimLine(raw.path, '', 200)
  if (path !== SOURCE_RETURN_PATHS[sourceOwner]) return null
  const query = normalizeReturnQuery(raw.query)
  return query ? { path, query } : null
}

export const normalizeScheduleHandoffDraftV1 = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const sourceOwner = trimLine(raw.sourceOwner, '', 40).toLowerCase()
  const sourceRecordId = trimLine(raw.sourceRecordId, '', 180)
  const sourceRevision = trimLine(raw.sourceRevision, '', 120)
  const proposedStartsAt = toTimestamp(raw.proposedStartsAt)
  const proposedEndsAt = toTimestamp(raw.proposedEndsAt)
  const proposedTitleZh = trimLine(raw.proposedTitleZh, '', 120)
  const proposedTitleEn = trimLine(raw.proposedTitleEn, proposedTitleZh, 120)
  const titleZh = proposedTitleZh || proposedTitleEn
  const proposalStatus = trimLine(
    raw.proposalStatus,
    SCHEDULE_HANDOFF_PROPOSAL_STATUSES.PENDING_REVIEW,
    40,
  ).toLowerCase()
  const idempotencyKey = createScheduleHandoffIdempotencyKey(sourceOwner, sourceRecordId)
  const participantRefs = normalizeParticipantRefs(raw.participantRefs)
  const sourceReturnContext = normalizeReturnContext(raw.sourceReturnContext, sourceOwner)
  const hasLocationRef = raw.proposedLocationRef !== undefined && raw.proposedLocationRef !== null
  const proposedLocationRef = hasLocationRef
    ? normalizeLocationRef(raw.proposedLocationRef)
    : null

  if (
    !idempotencyKey ||
    !sourceRevision ||
    !titleZh ||
    !proposedStartsAt ||
    proposedEndsAt <= proposedStartsAt ||
    !PROPOSAL_STATUS_IDS.has(proposalStatus) ||
    participantRefs === null ||
    !sourceReturnContext ||
    (hasLocationRef && !proposedLocationRef)
  ) {
    return null
  }

  return {
    schemaVersion: SCHEDULE_HANDOFF_DRAFT_SCHEMA_VERSION,
    id: idempotencyKey,
    idempotencyKey,
    revisionFingerprint: fingerprintText({ sourceOwner, sourceRecordId, sourceRevision }),
    sourceOwner,
    sourceRecordId,
    sourceRevision,
    proposedTitleZh: titleZh,
    proposedTitleEn: proposedTitleEn || titleZh,
    proposedStartsAt,
    proposedEndsAt,
    proposedLocationRef,
    participantRefs,
    sourceReturnContext,
    proposalStatus,
  }
}

export const normalizeScheduleHandoffEventSourceRefV1 = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const sourceOwner = trimLine(raw.sourceOwner, '', 40).toLowerCase()
  const sourceRecordId = trimLine(raw.sourceRecordId, '', 180)
  const sourceRevision = trimLine(raw.sourceRevision, '', 120)
  const idempotencyKey = createScheduleHandoffIdempotencyKey(sourceOwner, sourceRecordId)
  const suppliedKey = trimLine(raw.idempotencyKey, idempotencyKey, 420)
  const sourceReturnContext = normalizeReturnContext(raw.sourceReturnContext, sourceOwner)
  if (!idempotencyKey || suppliedKey !== idempotencyKey || !sourceRevision || !sourceReturnContext) {
    return null
  }
  return {
    schemaVersion: SCHEDULE_HANDOFF_DRAFT_SCHEMA_VERSION,
    idempotencyKey,
    sourceOwner,
    sourceRecordId,
    sourceRevision,
    sourceReturnContext,
  }
}

export const createScheduleHandoffEventSourceRefV1 = (rawDraft) => {
  const draft = normalizeScheduleHandoffDraftV1(rawDraft)
  if (!draft) return null
  return normalizeScheduleHandoffEventSourceRefV1({
    idempotencyKey: draft.idempotencyKey,
    sourceOwner: draft.sourceOwner,
    sourceRecordId: draft.sourceRecordId,
    sourceRevision: draft.sourceRevision,
    sourceReturnContext: draft.sourceReturnContext,
  })
}

const normalizeConfirmedHandoffReference = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const sourceOwner = trimLine(raw.sourceOwner, '', 40).toLowerCase()
  const sourceRecordId = trimLine(raw.sourceRecordId, '', 180)
  const sourceRevision = trimLine(raw.sourceRevision, '', 120)
  const calendarEventId = trimLine(raw.calendarEventId, '', 180)
  const idempotencyKey = createScheduleHandoffIdempotencyKey(sourceOwner, sourceRecordId)
  const suppliedKey = trimLine(raw.idempotencyKey, idempotencyKey, 420)
  if (
    !idempotencyKey ||
    suppliedKey !== idempotencyKey ||
    !sourceRevision ||
    !calendarEventId
  ) {
    return null
  }
  return {
    idempotencyKey,
    sourceOwner,
    sourceRecordId,
    sourceRevision,
    calendarEventId,
  }
}

export const resolveScheduleHandoffConflictV1 = ({ draft: rawDraft, existingReference } = {}) => {
  const draft = normalizeScheduleHandoffDraftV1(rawDraft)
  if (!draft) return null

  const isSourceCancelled =
    draft.proposalStatus === SCHEDULE_HANDOFF_PROPOSAL_STATUSES.SOURCE_CANCELLED
  if (existingReference === undefined || existingReference === null) {
    return {
      idempotencyKey: draft.idempotencyKey,
      decision: isSourceCancelled
        ? SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_SOURCE_CANCELLATION
        : SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_NEW,
      proposalStatus: isSourceCancelled
        ? SCHEDULE_HANDOFF_PROPOSAL_STATUSES.SOURCE_CANCELLED
        : SCHEDULE_HANDOFF_PROPOSAL_STATUSES.PENDING_REVIEW,
      requiresReview: true,
      mayCreateAfterReview: !isSourceCancelled,
      existingCalendarEventId: '',
      previousSourceRevision: '',
      incomingSourceRevision: draft.sourceRevision,
    }
  }

  const existing = normalizeConfirmedHandoffReference(existingReference)
  if (!existing) return null
  if (existing.idempotencyKey !== draft.idempotencyKey) {
    return {
      idempotencyKey: draft.idempotencyKey,
      decision: SCHEDULE_HANDOFF_CONFLICT_DECISIONS.BLOCKED_IDENTITY_CONFLICT,
      proposalStatus: SCHEDULE_HANDOFF_PROPOSAL_STATUSES.PENDING_REVIEW,
      requiresReview: true,
      mayCreateAfterReview: false,
      existingCalendarEventId: existing.calendarEventId,
      previousSourceRevision: existing.sourceRevision,
      incomingSourceRevision: draft.sourceRevision,
    }
  }

  if (isSourceCancelled) {
    return {
      idempotencyKey: draft.idempotencyKey,
      decision: SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_SOURCE_CANCELLATION,
      proposalStatus: SCHEDULE_HANDOFF_PROPOSAL_STATUSES.SOURCE_CANCELLED,
      requiresReview: true,
      mayCreateAfterReview: false,
      existingCalendarEventId: existing.calendarEventId,
      previousSourceRevision: existing.sourceRevision,
      incomingSourceRevision: draft.sourceRevision,
    }
  }

  const sourceChanged =
    existing.sourceRevision !== draft.sourceRevision ||
    draft.proposalStatus === SCHEDULE_HANDOFF_PROPOSAL_STATUSES.SOURCE_CHANGED
  return {
    idempotencyKey: draft.idempotencyKey,
    decision: sourceChanged
      ? SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REVIEW_SOURCE_CHANGE
      : SCHEDULE_HANDOFF_CONFLICT_DECISIONS.REUSE_CONFIRMED,
    proposalStatus: sourceChanged
      ? SCHEDULE_HANDOFF_PROPOSAL_STATUSES.SOURCE_CHANGED
      : SCHEDULE_HANDOFF_PROPOSAL_STATUSES.CONFIRMED,
    requiresReview: sourceChanged,
    mayCreateAfterReview: false,
    existingCalendarEventId: existing.calendarEventId,
    previousSourceRevision: existing.sourceRevision,
    incomingSourceRevision: draft.sourceRevision,
  }
}
