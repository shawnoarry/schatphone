import { normalizeEventId, normalizeEventText } from './event-contracts'
import {
  WORLD_SEMANTIC_ACCESS_EVENT_RESULT,
  WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_ID,
  WORLD_SEMANTIC_ACCESS_FACT_TYPE,
  WORLD_SEMANTIC_ACCESS_OWNER_ACTION_KEY,
} from './world-semantic-access-event-templates'
import { WORLD_SEMANTIC_ACCESS_RESULT } from './world-semantic-access-runtime'

const normalizeTimestamp = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : Math.max(0, fallback)
}

const safeIdPart = (value) =>
  normalizeEventText(value, '', 180).replace(/[^a-zA-Z0-9_.-]/g, '_')

export const createWorldSemanticAccessEventInstanceId = ({
  worldBinding = {},
  placeEvidence = {},
  positionEvidenceAt = 0,
} = {}) => {
  const parts = [
    safeIdPart(worldBinding.worldId),
    safeIdPart(worldBinding.semanticVersionId),
    safeIdPart(placeEvidence.mapPackId),
    safeIdPart(placeEvidence.placeId),
    normalizeTimestamp(positionEvidenceAt),
  ]
  if (parts.some((part) => !part)) return ''
  return `event::${WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_ID}::${parts.join('::')}`.slice(0, 220)
}

export const createWorldSemanticAccessEventContext = ({
  access = {},
  positionEvidenceAt = 0,
} = {}) => ({
  map_pack_id: access.placeEvidenceRef?.mapPackId || '',
  map_pack_version: access.placeEvidenceRef?.mapPackVersion || 0,
  place_id: access.placeEvidenceRef?.placeId || '',
  place_concept_id: access.placeConceptId || '',
  work_hub_package_id: access.actorEvidenceRef?.packageId || '',
  work_hub_package_revision: access.actorEvidenceRef?.packageRevision || 0,
  membership_id: access.actorEvidenceRef?.membershipId || '',
  actor_concept_id: access.actorConceptId || '',
  semantic_bridge_id: access.bridgeId || '',
  semantic_capability_id: access.capabilityId || '',
  position_evidence_at: normalizeTimestamp(positionEvidenceAt),
})

export const createWorldSemanticAccessOwnerFact = ({
  instance = null,
  ownerRequest = null,
  access = {},
  now = Date.now(),
} = {}) => {
  const instanceId = normalizeEventText(instance?.id, '', 220)
  const requestId = normalizeEventText(ownerRequest?.id, '', 220)
  const mapPackId = normalizeEventId(access.placeEvidenceRef?.mapPackId, 180)
  const placeId = normalizeEventId(access.placeEvidenceRef?.placeId, 180)
  const mapPackVersion = Math.max(
    1,
    Math.floor(Number(access.placeEvidenceRef?.mapPackVersion) || 1),
  )
  const occurredAt = normalizeTimestamp(now)
  if (
    !instanceId ||
    instance?.templateId !== WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_ID ||
    ownerRequest?.actionKey !== WORLD_SEMANTIC_ACCESS_OWNER_ACTION_KEY ||
    !requestId ||
    !mapPackId ||
    !placeId ||
    !occurredAt
  ) return null
  return {
    schemaVersion: 1,
    id: `owner_fact::${instanceId}::map_access`.slice(0, 220),
    type: WORLD_SEMANTIC_ACCESS_FACT_TYPE,
    sourceModule: 'map',
    subjectRef: {
      kind: 'map_place',
      id: `${mapPackId}:${placeId}`,
      revision: mapPackVersion,
    },
    correlationId: instanceId,
    causationId: requestId,
    resultCode: access.code,
    refs: {
      owner_request_id: requestId,
      map_pack_id: mapPackId,
      place_id: placeId,
      semantic_bridge_id: access.bridgeId || '',
      semantic_capability_id: access.capabilityId || '',
      world_semantic_version_id: access.worldBinding?.semanticVersionId || '',
      work_hub_package_id: access.actorEvidenceRef?.packageId || '',
      membership_id: access.actorEvidenceRef?.membershipId || '',
    },
    occurredAt,
  }
}

export const isWorldSemanticAccessGrantedInstance = (instance = null) =>
  Boolean(
    instance?.templateId === WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_ID &&
    instance?.resultCodes?.some((code) =>
      [
        WORLD_SEMANTIC_ACCESS_EVENT_RESULT.GRANTED_ROUTINE,
        WORLD_SEMANTIC_ACCESS_EVENT_RESULT.GRANTED_REVIEWED,
      ].includes(code),
    ),
  )

export const worldSemanticAccessResultForInstance = (instance = null) => {
  if (isWorldSemanticAccessGrantedInstance(instance)) return WORLD_SEMANTIC_ACCESS_RESULT.GRANTED
  return instance?.resultCodes?.at(-1) || ''
}
