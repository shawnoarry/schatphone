import { normalizeMapPosition } from '../../map-packs'
import {
  EVENT_INSTANCE_LIFECYCLE,
  normalizeEventId,
  normalizeEventInstanceV1,
  normalizeEventText,
} from '../event-contracts'
import {
  EVENT_SURFACE_ACTION_KIND,
  EVENT_SURFACE_ANCHOR_KIND,
  EVENT_SURFACE_EXPANSION_KIND,
  EVENT_SURFACE_RISK,
  EVENT_SURFACE_REVIEW_STATE,
  EVENT_SURFACE_STATE,
  EVENT_SURFACE_UNAVAILABLE_REASON,
  normalizeEventSurfaceProjection,
} from '../event-surface-projection'
import { createEventSurfaceHostRegistry } from '../event-surface-host-registry'
import {
  KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
  KPOP_REALISM_EVENT_ADAPTER_KEY,
  KPOP_REALISM_EVENT_PACK_ID,
  createBuiltInKpopEventRegistries,
  getBuiltInKpopEventTemplate,
} from '../kpop-realism-event-pack'

export const MAP_PLACE_SESSION_SCHEMA_VERSION = 1
export const MAP_PLACE_SESSION_CHECKPOINT_ID = 'map.place_session.entered.v1'
export const MAP_PLACE_SESSION_RECORD_TYPE = 'map_place_session'
export const MAP_EVENT_SURFACE_HOST_KEY = 'map'
export const MAP_EVENT_POSITION_PROVENANCE = Object.freeze({
  MANUAL: 'manual',
  JOURNEY_ARRIVAL: 'journey_arrival',
})
export const MAP_PLACE_SESSION_STATE = Object.freeze({
  INSIDE: 'inside',
  LEFT: 'left',
})
export const MAP_PLACE_SESSION_EVENT_RESULT = Object.freeze({
  VALID: 'PLACE_SESSION_EVENT_RESOLUTION_VALID',
  NOT_ACTIVE: 'PLACE_SESSION_NOT_ACTIVE',
  SOURCE_STALE: 'PLACE_SESSION_SOURCE_STALE',
  PLACE_MISMATCH: 'PLACE_SESSION_PLACE_MISMATCH',
  CHOICE_UNSUPPORTED: 'EVENT_CHOICE_UNSUPPORTED',
  OUTCOME_UNSUPPORTED: 'EVENT_OUTCOME_UNSUPPORTED',
  AUTHORIZATION_INVALID: 'EVENT_AUTHORIZATION_INVALID',
})

const EVENT_CHOICE_OUTCOME = Object.freeze({
  review_brief: 'brief_reviewed',
  check_equipment: 'equipment_checked',
  wait_for_staff: 'wait_acknowledged',
})
const ELIGIBLE_PLACE_CATEGORY_IDS = new Set([
  'broadcast_station',
  'entertainment_agency',
  'production_center',
])
const REQUIRED_CAPABILITY_IDS = Object.freeze(['work', 'wait'])
const ACCEPTED_PROVENANCE = new Set(Object.values(MAP_EVENT_POSITION_PROVENANCE))

const EXACT_PLACE_SEMANTICS = Object.freeze({
  'seoul-sm-hq': ['entertainment_agency', ['work', 'meet', 'wait']],
  'seoul-hybe-hq': ['entertainment_agency', ['work', 'meet', 'wait']],
  'seoul-jyp-hq': ['entertainment_agency', ['work', 'meet', 'wait']],
  'seoul-yg-hq': ['entertainment_agency', ['work', 'meet', 'wait']],
  'seoul-cube-hq': ['entertainment_agency', ['work', 'meet', 'wait']],
  'seoul-starship-hq': ['entertainment_agency', ['work', 'meet', 'wait']],
  'seoul-fnc-hq': ['entertainment_agency', ['work', 'meet', 'wait']],
  'seoul-kbs-hq': ['broadcast_station', ['work', 'meet', 'wait', 'record', 'perform']],
  'seoul-mbc-hq': ['broadcast_station', ['work', 'meet', 'wait', 'record', 'perform']],
  'seoul-sbs-hq': ['broadcast_station', ['work', 'meet', 'wait', 'record', 'perform']],
  'seoul-jtbc-hq': ['broadcast_station', ['work', 'meet', 'wait', 'record', 'perform']],
  'seoul-cj-enm-center': ['production_center', ['work', 'meet', 'wait', 'record', 'perform']],
})

const LEGACY_PLACE_SEMANTICS = Object.freeze({
  bank: ['bank', ['finance', 'wait']],
  cinema: ['cinema', ['watch', 'meet', 'wait']],
  convenience_store: ['convenience_store', ['shop', 'eat', 'wait']],
  culture: ['cultural_landmark', ['visit', 'meet', 'wait']],
  fitness: ['sports_facility', ['exercise', 'train', 'meet', 'wait']],
  hospital: ['hospital', ['receive_care', 'wait']],
  hotel: ['hotel', ['stay', 'rest', 'eat', 'meet', 'wait']],
  leisure: ['leisure_venue', ['visit', 'meet', 'wait']],
  mall_general: ['shopping_center', ['shop', 'eat', 'meet', 'wait']],
  mall_luxury: ['luxury_shopping_center', ['shop', 'eat', 'meet', 'wait']],
  nightlife: ['nightlife_venue', ['socialize', 'perform', 'meet', 'wait']],
  other: ['civic_place', ['visit', 'receive_help', 'wait']],
  park: ['park', ['visit', 'exercise', 'meet', 'rest']],
  pharmacy: ['pharmacy', ['shop', 'receive_care', 'wait']],
  plastic_surgery: ['clinic', ['receive_care', 'wait']],
  public_safety: ['public_service', ['receive_help', 'wait']],
  residence_budget: ['residence', ['rest', 'meet', 'study', 'practice']],
  residence_luxury: ['residence', ['rest', 'meet', 'study', 'practice']],
  residence_premium: ['residence', ['rest', 'meet', 'study', 'practice']],
  residence_standard: ['residence', ['rest', 'meet', 'study', 'practice']],
  school: ['education_campus', ['study', 'train', 'meet', 'wait']],
  shop: ['shop', ['shop', 'wait']],
  supermarket: ['supermarket', ['shop', 'eat', 'wait']],
  transit: ['transit_station', ['travel', 'wait', 'meet']],
  transit_hub: ['transit_hub', ['travel', 'wait', 'meet', 'shop', 'eat']],
  work: ['workplace', ['work', 'meet', 'wait']],
})

const normalizeTimestamp = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : Math.max(0, fallback)
}

const normalizeIdList = (items, maxItems = 24) => {
  if (!Array.isArray(items)) return []
  return [...new Set(items.map((item) => normalizeEventId(item)).filter(Boolean))].slice(0, maxItems)
}

const clone = (value) => {
  if (Array.isArray(value)) return value.map(clone)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]))
  }
  return value
}

const createSemantics = (definition, source) => ({
  placeCategoryId: definition?.[0] || 'unknown',
  capabilityIds: definition ? [...definition[1]] : [],
  source,
})

export const resolveMapEventPlaceSemantics = (rawPlace = {}) => {
  const place = rawPlace && typeof rawPlace === 'object' ? rawPlace : {}
  const hasExplicitCategory = Object.prototype.hasOwnProperty.call(place, 'placeCategoryId')
  const hasExplicitCapabilities = Object.prototype.hasOwnProperty.call(place, 'capabilityIds')
  if (hasExplicitCategory || hasExplicitCapabilities) {
    const placeCategoryId = normalizeEventId(place.placeCategoryId)
    const capabilityIds = normalizeIdList(place.capabilityIds)
    return placeCategoryId && capabilityIds.length > 0
      ? { placeCategoryId, capabilityIds, source: 'explicit_place_semantics' }
      : createSemantics(null, 'unknown_fail_closed')
  }

  const placeId = normalizeEventId(place.placeId || place.id)
  if (EXACT_PLACE_SEMANTICS[placeId]) {
    return createSemantics(EXACT_PLACE_SEMANTICS[placeId], 'pack_place_override')
  }

  const legacyCategory = normalizeEventId(place.category)
  if (LEGACY_PLACE_SEMANTICS[legacyCategory]) {
    return createSemantics(LEGACY_PLACE_SEMANTICS[legacyCategory], 'legacy_category_rule')
  }
  return createSemantics(null, 'unknown_fail_closed')
}

export const createMapPositionEvidence = ({
  provenance = MAP_EVENT_POSITION_PROVENANCE.MANUAL,
  placeId = '',
  evidenceAt = Date.now(),
  journeyId = '',
  journeyArrivedAt = 0,
} = {}) => {
  const normalizedJourneyId = normalizeEventText(journeyId, '', 180)
  const normalizedArrivedAt = normalizeTimestamp(journeyArrivedAt)
  const requestedProvenance = normalizeEventId(provenance, 80)
  const canProveJourneyArrival =
    requestedProvenance === MAP_EVENT_POSITION_PROVENANCE.JOURNEY_ARRIVAL &&
    Boolean(normalizedJourneyId) &&
    normalizedArrivedAt > 0
  return {
    provenance: canProveJourneyArrival
      ? MAP_EVENT_POSITION_PROVENANCE.JOURNEY_ARRIVAL
      : MAP_EVENT_POSITION_PROVENANCE.MANUAL,
    placeId: normalizeEventId(placeId),
    evidenceAt: Math.max(normalizeTimestamp(evidenceAt), normalizedArrivedAt),
    journeyId: canProveJourneyArrival ? normalizedJourneyId : '',
    journeyArrivedAt: canProveJourneyArrival ? normalizedArrivedAt : 0,
  }
}

export const normalizeMapPositionEvidence = (rawEvidence = {}, fallback = {}) => {
  const source = rawEvidence && typeof rawEvidence === 'object' ? rawEvidence : {}
  return createMapPositionEvidence({
    provenance: source.provenance || source.kind || fallback.provenance,
    placeId: source.placeId || fallback.placeId,
    evidenceAt: source.evidenceAt || fallback.evidenceAt,
    journeyId: source.journeyId || fallback.journeyId,
    journeyArrivedAt: source.journeyArrivedAt || fallback.journeyArrivedAt,
  })
}

export const createEmptyMapPlaceSession = () => ({
  schemaVersion: MAP_PLACE_SESSION_SCHEMA_VERSION,
  sessionId: '',
  revision: 0,
  state: MAP_PLACE_SESSION_STATE.LEFT,
  worldPackId: '',
  mapPackId: '',
  mapPackVersion: 0,
  placeId: '',
  placeCategoryId: 'unknown',
  capabilityIds: [],
  enteredAt: 0,
  leftAt: 0,
  updatedAt: 0,
  presence: {
    relation: MAP_PLACE_SESSION_STATE.LEFT,
    provenance: MAP_EVENT_POSITION_PROVENANCE.MANUAL,
    evidenceAt: 0,
    journeyId: '',
    journeyArrivedAt: 0,
  },
})

export const normalizeMapPlaceSession = (rawSession = {}) => {
  const source = rawSession && typeof rawSession === 'object' ? rawSession : {}
  const sessionId = normalizeEventText(source.sessionId, '', 180)
  const revision = Math.max(0, Math.floor(Number(source.revision) || 0))
  const state =
    source.state === MAP_PLACE_SESSION_STATE.INSIDE
      ? MAP_PLACE_SESSION_STATE.INSIDE
      : MAP_PLACE_SESSION_STATE.LEFT
  const mapPackId = normalizeEventId(source.mapPackId)
  const placeId = normalizeEventId(source.placeId)
  const provenance = normalizeEventId(source.presence?.provenance, 80)
  if (
    !sessionId ||
    revision <= 0 ||
    !mapPackId ||
    !placeId ||
    !ACCEPTED_PROVENANCE.has(provenance)
  ) {
    return createEmptyMapPlaceSession()
  }
  const enteredAt = normalizeTimestamp(source.enteredAt)
  const updatedAt = Math.max(enteredAt, normalizeTimestamp(source.updatedAt))
  return {
    schemaVersion: MAP_PLACE_SESSION_SCHEMA_VERSION,
    sessionId,
    revision,
    state,
    worldPackId: normalizeEventId(source.worldPackId),
    mapPackId,
    mapPackVersion: Math.max(1, Math.floor(Number(source.mapPackVersion) || 1)),
    placeId,
    placeCategoryId: normalizeEventId(source.placeCategoryId) || 'unknown',
    capabilityIds: normalizeIdList(source.capabilityIds),
    enteredAt,
    leftAt: state === MAP_PLACE_SESSION_STATE.LEFT ? normalizeTimestamp(source.leftAt, updatedAt) : 0,
    updatedAt,
    presence: {
      relation: state,
      provenance,
      evidenceAt: normalizeTimestamp(source.presence?.evidenceAt),
      journeyId: normalizeEventText(source.presence?.journeyId, '', 180),
      journeyArrivedAt: normalizeTimestamp(source.presence?.journeyArrivedAt),
    },
  }
}

const createSessionId = (placeId, revision, now) =>
  `map_place_session_${placeId}_${revision}_${now}`
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .slice(0, 180)

export const enterMapPlaceSession = ({
  previousSession = {},
  currentLocation = {},
  place = {},
  worldPackId = '',
  mapPackVersion = 1,
  now = Date.now(),
} = {}) => {
  const previous = normalizeMapPlaceSession(previousSession)
  const placeId = normalizeEventId(place.placeId || place.id)
  const mapPackId = normalizeEventId(place.mapPackId)
  const evidence = normalizeMapPositionEvidence(currentLocation.positionEvidence, {
    placeId: currentLocation.placeId,
    evidenceAt: now,
  })
  const placePosition = normalizeMapPosition(place.position, place.position?.kind)
  const currentPosition = normalizeMapPosition(currentLocation.position, place.position?.kind)
  const positionMatches =
    placePosition?.kind === 'geo'
      ? currentPosition?.kind === 'geo' &&
        Math.abs(currentPosition.lat - placePosition.lat) <= 0.000001 &&
        Math.abs(currentPosition.lng - placePosition.lng) <= 0.000001
      : placePosition?.kind === 'canvas'
        ? currentPosition?.kind === 'canvas' &&
          Math.abs(currentPosition.x - placePosition.x) <= 0.000001 &&
          Math.abs(currentPosition.y - placePosition.y) <= 0.000001
        : false
  if (
    !placeId ||
    !mapPackId ||
    normalizeEventId(currentLocation.mapPackId) !== mapPackId ||
    evidence.placeId !== placeId ||
    !positionMatches ||
    !ACCEPTED_PROVENANCE.has(evidence.provenance)
  ) {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.PLACE_MISMATCH, session: previous }
  }
  if (
    previous.state === MAP_PLACE_SESSION_STATE.INSIDE &&
    previous.mapPackId === mapPackId &&
    previous.placeId === placeId
  ) {
    return { ok: true, code: 'PLACE_SESSION_ALREADY_INSIDE', resumed: true, session: previous }
  }

  const timestamp = normalizeTimestamp(now, Date.now())
  const revision = Math.max(0, previous.revision) + 1
  const semantics = resolveMapEventPlaceSemantics(place)
  const session = normalizeMapPlaceSession({
    schemaVersion: MAP_PLACE_SESSION_SCHEMA_VERSION,
    sessionId: createSessionId(placeId, revision, timestamp),
    revision,
    state: MAP_PLACE_SESSION_STATE.INSIDE,
    worldPackId,
    mapPackId,
    mapPackVersion,
    placeId,
    placeCategoryId: semantics.placeCategoryId,
    capabilityIds: semantics.capabilityIds,
    enteredAt: timestamp,
    updatedAt: timestamp,
    presence: {
      relation: MAP_PLACE_SESSION_STATE.INSIDE,
      provenance: evidence.provenance,
      evidenceAt: evidence.evidenceAt || timestamp,
      journeyId: evidence.journeyId,
      journeyArrivedAt: evidence.journeyArrivedAt,
    },
  })
  return { ok: true, code: 'PLACE_SESSION_ENTERED', resumed: false, session }
}

export const leaveMapPlaceSession = (rawSession = {}, { now = Date.now() } = {}) => {
  const session = normalizeMapPlaceSession(rawSession)
  if (session.state !== MAP_PLACE_SESSION_STATE.INSIDE) {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.NOT_ACTIVE, session }
  }
  const timestamp = Math.max(session.updatedAt, normalizeTimestamp(now, Date.now()))
  return {
    ok: true,
    code: 'PLACE_SESSION_LEFT',
    session: normalizeMapPlaceSession({
      ...session,
      revision: session.revision + 1,
      state: MAP_PLACE_SESSION_STATE.LEFT,
      leftAt: timestamp,
      updatedAt: timestamp,
      presence: { ...session.presence, relation: MAP_PLACE_SESSION_STATE.LEFT },
    }),
  }
}

export const createMapPlaceSessionCheckpointV1 = (rawSession = {}) => {
  const session = normalizeMapPlaceSession(rawSession)
  if (session.state !== MAP_PLACE_SESSION_STATE.INSIDE) return null
  return {
    schemaVersion: MAP_PLACE_SESSION_SCHEMA_VERSION,
    recordType: MAP_PLACE_SESSION_RECORD_TYPE,
    checkpointId: MAP_PLACE_SESSION_CHECKPOINT_ID,
    sessionId: session.sessionId,
    revision: session.revision,
    state: session.state,
    worldPackId: session.worldPackId,
    mapPackId: session.mapPackId,
    mapPackVersion: session.mapPackVersion,
    placeId: session.placeId,
    placeCategoryId: session.placeCategoryId,
    capabilityIds: [...session.capabilityIds],
    enteredAt: session.enteredAt,
    updatedAt: session.updatedAt,
    presence: { ...session.presence },
  }
}

const getInvitationCopy = (placeCategoryId, locale, seed) => {
  const { variantPackRegistry } = createBuiltInKpopEventRegistries()
  const result = variantPackRegistry.resolveVariant({
    packId: KPOP_REALISM_EVENT_PACK_ID,
    templateId: KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
    placeCategoryId,
    seed,
  })
  if (!result.ok) return null
  const useChinese = String(locale).toLowerCase().startsWith('zh')
  const invitation = result.variant.localCopy.invitation
  return {
    title: useChinese ? invitation.titleZh : invitation.titleEn,
    summary: useChinese ? invitation.summaryZh : invitation.summaryEn,
    titleZh: invitation.titleZh,
    titleEn: invitation.titleEn,
    summaryZh: invitation.summaryZh,
    summaryEn: invitation.summaryEn,
  }
}

export const evaluateMapPlaceSessionEventInvitation = ({
  session: rawSession,
  currentLocation = {},
  place = {},
  locale = 'zh-CN',
  worldContextFamily = 'daily',
  moduleEnabled = true,
  intensity = 'low',
  cooldownActive = false,
  dailyLimitReached = false,
} = {}) => {
  const session = normalizeMapPlaceSession(rawSession)
  const checkpoint = createMapPlaceSessionCheckpointV1(session)
  const placeId = normalizeEventId(place.placeId || place.id)
  const evidence = normalizeMapPositionEvidence(currentLocation.positionEvidence, {
    placeId: currentLocation.placeId,
  })
  let reason = ''
  if (!checkpoint) reason = 'place_session_not_inside'
  else if (
    checkpoint.placeId !== placeId ||
    checkpoint.mapPackId !== normalizeEventId(place.mapPackId) ||
    normalizeEventId(currentLocation.mapPackId) !== checkpoint.mapPackId ||
    evidence.placeId !== checkpoint.placeId ||
    checkpoint.presence.provenance !== evidence.provenance
  ) reason = 'place_session_source_stale'
  else if (worldContextFamily !== 'daily') reason = 'event_pack_incompatible'
  else if (!moduleEnabled) reason = 'module_permission_disabled'
  else if (intensity === 'off') reason = 'event_intensity_off'
  else if (!ELIGIBLE_PLACE_CATEGORY_IDS.has(checkpoint.placeCategoryId)) reason = 'place_ineligible'
  else if (!REQUIRED_CAPABILITY_IDS.every((id) => checkpoint.capabilityIds.includes(id))) {
    reason = 'place_capability_missing'
  } else if (cooldownActive) reason = 'place_cooldown_active'
  else if (dailyLimitReached) reason = 'place_daily_limit_reached'
  if (reason) return { eligible: false, reason, invitation: null, checkpoint }

  const seed = `${checkpoint.sessionId}:${checkpoint.revision}:${checkpoint.placeId}`
  const copy = getInvitationCopy(checkpoint.placeCategoryId, locale, seed)
  if (!copy) return { eligible: false, reason: 'variant_not_found', invitation: null, checkpoint }
  return {
    eligible: true,
    reason: 'place_session_event_eligible',
    checkpoint,
    invitation: {
      schemaVersion: 1,
      id: `map_event_invitation_${checkpoint.sessionId}_${checkpoint.revision}`.slice(0, 220),
      eventId: KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
      proposalId: `map_event_proposal_${checkpoint.sessionId}_${checkpoint.revision}`.slice(0, 220),
      sourceRecordId: checkpoint.sessionId,
      sourceRecordRevision: checkpoint.revision,
      mapPackId: checkpoint.mapPackId,
      placeId: checkpoint.placeId,
      tokenCost: 0,
      copy,
    },
  }
}

export const validateMapPlaceSessionEventResolution = (
  request = {},
  rawSession = {},
) => {
  const session = normalizeMapPlaceSession(rawSession)
  if (request.authorization !== 'event_runtime_choice') {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.AUTHORIZATION_INVALID }
  }
  if (session.state !== MAP_PLACE_SESSION_STATE.INSIDE) {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.NOT_ACTIVE }
  }
  if (
    normalizeEventText(request.sessionId, '', 180) !== session.sessionId ||
    Number(request.sessionRevision) !== session.revision
  ) {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.SOURCE_STALE }
  }
  if (
    normalizeEventId(request.mapPackId) !== session.mapPackId ||
    normalizeEventId(request.placeId) !== session.placeId
  ) {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.PLACE_MISMATCH }
  }
  const choiceId = normalizeEventId(request.choiceId)
  const outcomeId = normalizeEventId(request.outcomeId)
  if (!Object.prototype.hasOwnProperty.call(EVENT_CHOICE_OUTCOME, choiceId)) {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.CHOICE_UNSUPPORTED }
  }
  if (!Object.values(EVENT_CHOICE_OUTCOME).includes(outcomeId)) {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.OUTCOME_UNSUPPORTED }
  }
  if (EVENT_CHOICE_OUTCOME[choiceId] !== outcomeId) {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.OUTCOME_UNSUPPORTED }
  }
  if (!normalizeEventId(request.eventInstanceId, 220)) {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.SOURCE_STALE }
  }
  return {
    ok: true,
    code: MAP_PLACE_SESSION_EVENT_RESULT.VALID,
    canonicalMutation: 'none',
  }
}

export const resolveMapPlaceSessionEventInstance = ({
  instance: rawInstance,
  session,
  choiceId,
  outcomeLogId = '',
  now = Date.now(),
} = {}) => {
  const instance = normalizeEventInstanceV1(rawInstance)
  const normalizedChoiceId = normalizeEventId(choiceId)
  const outcomeId = EVENT_CHOICE_OUTCOME[normalizedChoiceId] || ''
  if (!instance || instance.lifecycle !== EVENT_INSTANCE_LIFECYCLE.ACTIVE) {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.SOURCE_STALE, instance: null }
  }
  if (!instance.choices.allowedIds.includes(normalizedChoiceId)) {
    return { ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.CHOICE_UNSUPPORTED, instance }
  }
  const ownerResult = validateMapPlaceSessionEventResolution(
    {
      authorization: 'event_runtime_choice',
      eventInstanceId: instance.id,
      sessionId: instance.presence.placeSessionId,
      sessionRevision: instance.presence.placeSessionRevision,
      mapPackId: instance.world.mapPackId,
      placeId: instance.place.placeId,
      choiceId: normalizedChoiceId,
      outcomeId,
    },
    session,
  )
  if (!ownerResult.ok) return { ...ownerResult, instance }
  const timestamp = Math.max(instance.timestamps.updatedAt, normalizeTimestamp(now, Date.now()))
  const resolved = normalizeEventInstanceV1({
    ...instance,
    lifecycle: EVENT_INSTANCE_LIFECYCLE.RESOLVED,
    runtime: { ...instance.runtime, outcomeLogId },
    choices: { ...instance.choices, selectedId: normalizedChoiceId, outcomeId },
    outcome: {
      ...instance.outcome,
      requestState: 'validated',
      ownerResultCode: ownerResult.code,
      ownerResultRef: `${session.sessionId}:${session.revision}`,
    },
    timestamps: { ...instance.timestamps, resolvedAt: timestamp, updatedAt: timestamp },
  })
  return { ...ownerResult, instance: resolved, choiceId: normalizedChoiceId, outcomeId }
}

export const dismissMapPlaceSessionEventInstance = (rawInstance, { now = Date.now() } = {}) => {
  const instance = normalizeEventInstanceV1(rawInstance)
  if (!instance || instance.lifecycle !== EVENT_INSTANCE_LIFECYCLE.ACTIVE) return null
  const timestamp = Math.max(instance.timestamps.updatedAt, normalizeTimestamp(now, Date.now()))
  return normalizeEventInstanceV1({
    ...instance,
    lifecycle: EVENT_INSTANCE_LIFECYCLE.DISMISSED,
    timestamps: { ...instance.timestamps, dismissedAt: timestamp, updatedAt: timestamp },
  })
}

export const resolveMapPlaceEventSurfaceAnchor = ({ instance, mapPack, place } = {}) => {
  const normalizedInstance = normalizeEventInstanceV1(instance)
  const mapPackId = normalizeEventId(mapPack?.id)
  const placeId = normalizeEventId(place?.placeId || place?.id)
  if (
    !normalizedInstance ||
    !mapPackId ||
    normalizedInstance.world.mapPackId !== mapPackId ||
    normalizedInstance.place.anchor.mapPackId !== mapPackId ||
    normalizedInstance.place.placeId !== placeId ||
    normalizedInstance.place.anchor.placeId !== placeId ||
    normalizeEventId(place?.mapPackId) !== mapPackId
  ) return null
  const position = normalizeMapPosition(place.position, mapPack.coordinateKind)
  if (position?.kind === 'geo') {
    return {
      kind: EVENT_SURFACE_ANCHOR_KIND.GEOGRAPHIC,
      mapPackId,
      latitude: position.lat,
      longitude: position.lng,
    }
  }
  if (position?.kind === 'canvas') {
    return {
      kind: EVENT_SURFACE_ANCHOR_KIND.NORMALIZED_CANVAS,
      mapPackId,
      x: position.x,
      y: position.y,
    }
  }
  return null
}

const isInstanceSourceCurrent = (instance, rawSession) => {
  const session = normalizeMapPlaceSession(rawSession)
  return (
    session.state === MAP_PLACE_SESSION_STATE.INSIDE &&
    session.sessionId === instance.source.recordId &&
    session.revision === instance.source.recordRevision &&
    session.sessionId === instance.presence.placeSessionId &&
    session.revision === instance.presence.placeSessionRevision &&
    session.mapPackId === instance.world.mapPackId &&
    session.placeId === instance.place.placeId
  )
}

const lifecycleToSurfaceState = (lifecycle) => {
  if (lifecycle === EVENT_INSTANCE_LIFECYCLE.ACTIVE) return EVENT_SURFACE_STATE.READY
  if (lifecycle === EVENT_INSTANCE_LIFECYCLE.RESOLVED) return EVENT_SURFACE_STATE.RESOLVED
  if (lifecycle === EVENT_INSTANCE_LIFECYCLE.DISMISSED) return EVENT_SURFACE_STATE.DISMISSED
  return EVENT_SURFACE_STATE.UNAVAILABLE
}

export const projectMapPlaceSessionEventSurface = ({
  instance: rawInstance,
  sourceRecord = null,
  mapPack = null,
  place = null,
} = {}) => {
  const instance = normalizeEventInstanceV1(rawInstance)
  if (
    !instance ||
    instance.templateRef.id !== KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID ||
    instance.world.variantPackId !== KPOP_REALISM_EVENT_PACK_ID
  ) return null
  const anchor = resolveMapPlaceEventSurfaceAnchor({ instance, mapPack, place })
  const sourceCurrent = isInstanceSourceCurrent(instance, sourceRecord)
  const sourceRequired = instance.lifecycle === EVENT_INSTANCE_LIFECYCLE.ACTIVE
  const available = Boolean(anchor) && (!sourceRequired || sourceCurrent)
  const unavailableReason = !anchor
    ? EVENT_SURFACE_UNAVAILABLE_REASON.ANCHOR_INVALID
    : sourceRequired && !sourceCurrent
      ? EVENT_SURFACE_UNAVAILABLE_REASON.SOURCE_STALE
      : ''
  const copy = instance.text.normalizedCopy
  const actions = [
    { id: 'expand', kind: EVENT_SURFACE_ACTION_KIND.OPEN_DETAIL },
  ]
  if (instance.lifecycle === EVENT_INSTANCE_LIFECYCLE.ACTIVE && sourceCurrent) {
    actions.push({ id: 'dismiss', kind: EVENT_SURFACE_ACTION_KIND.DISMISS_SURFACE })
    Object.entries(EVENT_CHOICE_OUTCOME).forEach(([choiceId, outcomeId]) => {
      if (!instance.choices.allowedIds.includes(choiceId)) return
      actions.push({
        id: `choice:${choiceId}`,
        kind: EVENT_SURFACE_ACTION_KIND.REQUEST_BOUNDED_OUTCOME,
        outcomeId,
        labelZh: copy.choiceLabels[choiceId],
        labelEn: copy.choiceLabels[choiceId],
      })
    })
  }
  return normalizeEventSurfaceProjection({
    eventId: instance.templateRef.id,
    proposalId: instance.id,
    source: {
      moduleKey: 'map',
      recordType: MAP_PLACE_SESSION_RECORD_TYPE,
      recordId: instance.source.recordId,
      runtimeLogId: instance.runtime.eligibilityLogId,
    },
    status: available ? lifecycleToSurfaceState(instance.lifecycle) : EVENT_SURFACE_STATE.UNAVAILABLE,
    availability: { state: available ? 'available' : 'stale', reason: unavailableReason },
    risk: EVENT_SURFACE_RISK.LOW,
    review: {
      state: instance.lifecycle === EVENT_INSTANCE_LIFECYCLE.ACTIVE
        ? EVENT_SURFACE_REVIEW_STATE.PENDING
        : EVENT_SURFACE_REVIEW_STATE.COMPLETED,
      mode: 'source_owner_review',
      reason: instance.outcome.ownerResultCode,
    },
    copy: {
      titleZh: copy.title,
      titleEn: copy.title,
      summaryZh: copy.opening,
      summaryEn: copy.opening,
      detailZh: copy.environment,
      detailEn: copy.environment,
    },
    world: {
      worldContextId: instance.world.worldContextId,
      worldPackId: instance.world.worldPackId,
      mapPackId: instance.world.mapPackId,
    },
    anchor,
    expansion: {
      kind: EVENT_SURFACE_EXPANSION_KIND.HOST_DETAIL,
      hostKey: MAP_EVENT_SURFACE_HOST_KEY,
      targetId: instance.id,
    },
    outcomeIds: Object.values(EVENT_CHOICE_OUTCOME),
    actions,
    createdAt: instance.timestamps.createdAt,
    updatedAt: instance.timestamps.updatedAt,
  })
}

export const MAP_EVENT_SURFACE_HOST_REGISTRATION = Object.freeze({
  hostKey: MAP_EVENT_SURFACE_HOST_KEY,
  labelZh: '地图',
  labelEn: 'Map',
  sourceModules: Object.freeze(['map']),
  surfaceStates: Object.freeze([
    EVENT_SURFACE_STATE.READY,
    EVENT_SURFACE_STATE.RESOLVED,
    EVENT_SURFACE_STATE.DISMISSED,
    EVENT_SURFACE_STATE.UNAVAILABLE,
  ]),
  anchorKinds: Object.freeze([
    EVENT_SURFACE_ANCHOR_KIND.GEOGRAPHIC,
    EVENT_SURFACE_ANCHOR_KIND.NORMALIZED_CANVAS,
  ]),
  expansionKinds: Object.freeze([EVENT_SURFACE_EXPANSION_KIND.HOST_DETAIL]),
  actionKinds: Object.freeze([
    EVENT_SURFACE_ACTION_KIND.OPEN_DETAIL,
    EVENT_SURFACE_ACTION_KIND.DISMISS_SURFACE,
    EVENT_SURFACE_ACTION_KIND.REQUEST_BOUNDED_OUTCOME,
  ]),
  acceptsUnanchored: true,
  acceptsUnavailable: true,
})

export const createMapEventSurfaceHostRegistry = () =>
  createEventSurfaceHostRegistry([clone(MAP_EVENT_SURFACE_HOST_REGISTRATION)])

const anchorToPosition = (anchor) => {
  if (anchor?.kind === EVENT_SURFACE_ANCHOR_KIND.GEOGRAPHIC) {
    return { kind: 'geo', lat: anchor.latitude, lng: anchor.longitude }
  }
  if (anchor?.kind === EVENT_SURFACE_ANCHOR_KIND.NORMALIZED_CANVAS) {
    return { kind: 'canvas', x: anchor.x, y: anchor.y }
  }
  return null
}

const clusterKeyForPosition = (mapPackId, position) => {
  if (position.kind === 'geo') {
    return `${mapPackId}:geo:${Math.round(position.lat / 0.00035)}:${Math.round(position.lng / 0.00035)}`
  }
  return `${mapPackId}:canvas:${Math.round(position.x / 0.025)}:${Math.round(position.y / 0.025)}`
}

const offsetEventPosition = (position) => {
  if (position.kind === 'geo') {
    return { ...position, lng: Math.min(180, position.lng + 0.00012) }
  }
  return { ...position, x: Math.min(1, position.x + 0.012) }
}

export const clusterMapEventSurfacePins = (rawSurfaces = [], { mapPackId = '' } = {}) => {
  const groups = new Map()
  ;(Array.isArray(rawSurfaces) ? rawSurfaces : [])
    .filter(
      (surface) =>
        surface?.availability?.state === 'available' &&
        surface.anchor?.mapPackId &&
        (!mapPackId || surface.anchor.mapPackId === mapPackId),
    )
    .sort((left, right) => left.id.localeCompare(right.id))
    .forEach((surface) => {
      const position = anchorToPosition(surface.anchor)
      if (!position) return
      const key = clusterKeyForPosition(surface.anchor.mapPackId, position)
      if (!groups.has(key)) groups.set(key, { position, surfaces: [] })
      groups.get(key).surfaces.push(surface)
    })
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, group]) => {
      const stackCount = group.surfaces.length
      return {
        placeId: `map-event:${key}`,
        source: 'map_event',
        mapPackId: group.surfaces[0].anchor.mapPackId,
        nameZh: stackCount > 1 ? `${stackCount} 个地点事件` : group.surfaces[0].copy.titleZh,
        nameEn: stackCount > 1 ? `${stackCount} place events` : group.surfaces[0].copy.titleEn,
        detailZh: stackCount > 1 ? '展开事件列表' : group.surfaces[0].copy.statusLabelZh,
        detailEn: stackCount > 1 ? 'Open event stack' : group.surfaces[0].copy.statusLabelEn,
        position: offsetEventPosition(group.position),
        anchorPosition: { ...group.position },
        icon: stackCount > 1 ? 'fas fa-layer-group' : 'fas fa-bolt',
        tone: '#b45309',
        stackCount,
        eventSurfaceIds: group.surfaces.map((surface) => surface.id),
      }
    })
}

export const getMapPlaceSessionEventTemplate = () => getBuiltInKpopEventTemplate()
export const getMapPlaceSessionChoiceOutcome = (choiceId) =>
  EVENT_CHOICE_OUTCOME[normalizeEventId(choiceId)] || ''
export const getMapPlaceSessionEventAdapterKey = () => KPOP_REALISM_EVENT_ADAPTER_KEY
