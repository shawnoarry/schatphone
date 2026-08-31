import { normalizeEventId, normalizeEventText } from './event-contracts'

export const WORLD_SEMANTIC_RESTRICTED_PLACE_CAPABILITY_ID =
  'runtime:access:restricted_place'
export const WORLD_SEMANTIC_MAP_ACCESS_ACTION_ID = 'map:access:validate'

export const WORLD_SEMANTIC_ACCESS_RESULT = Object.freeze({
  NOT_APPLICABLE: 'semantic_access_not_applicable',
  VERSION_MISSING: 'semantic_access_version_missing',
  VERSION_STALE: 'semantic_access_version_stale',
  ACTOR_EVIDENCE_MISSING: 'semantic_access_actor_evidence_missing',
  ACTOR_EVIDENCE_STALE: 'semantic_access_actor_evidence_stale',
  DENIED: 'semantic_access_denied',
  GRANTED: 'semantic_access_granted',
})

const normalizeIdList = (value, limit = 24) => [
  ...new Set(
    (Array.isArray(value) ? value : [])
      .map((item) => normalizeEventId(item, 180))
      .filter(Boolean),
  ),
].slice(0, limit)

const intersects = (left, right) => {
  const expected = new Set(right)
  return left.find((item) => expected.has(item)) || ''
}

const findConcept = (manifest, conceptId) =>
  manifest?.concepts?.find((concept) => concept.id === conceptId) || null

const createBaseResult = ({ code, applies = false, allowed = false } = {}) => ({
  ok: true,
  applies,
  allowed,
  code,
  runtimeCapabilityId: WORLD_SEMANTIC_RESTRICTED_PLACE_CAPABILITY_ID,
  bridgeId: '',
  capabilityId: '',
  capabilityLabel: '',
  actorConceptId: '',
  actorConceptLabel: '',
  placeConceptId: '',
  placeConceptLabel: '',
  boundaryIds: [],
  ownerEffectId: '',
  ownerModule: 'map',
  ownerActionId: WORLD_SEMANTIC_MAP_ACCESS_ACTION_ID,
  worldBinding: null,
  actorEvidenceRef: null,
  placeEvidenceRef: null,
})

export const createWorkHubSemanticActorEvidence = ({
  authority = null,
  worldBinding = {},
} = {}) => {
  if (!authority?.ok || !authority.authorityPackage || !authority.membership) return null
  const packageBinding = authority.authorityPackage.worldBinding || {}
  const conceptIds = normalizeIdList([
    ...(authority.membership.semanticConceptIds || []),
    ...(authority.roles || []).flatMap((role) => role.semanticConceptIds || []),
  ])
  return {
    sourceOwner: 'work_hub',
    worldId: normalizeEventId(packageBinding.worldId, 180),
    worldRevision: Math.max(0, Math.floor(Number(packageBinding.worldRevision) || 0)),
    semanticVersionId: normalizeEventId(worldBinding.semanticVersionId, 180),
    packageId: normalizeEventText(authority.authorityPackage.packageId, '', 180),
    packageRevision: Math.max(
      0,
      Math.floor(Number(authority.authorityPackage.revision) || 0),
    ),
    membershipId: normalizeEventText(authority.membership.id, '', 180),
    profileId: normalizeEventText(packageBinding.contactsProfileId, '', 120),
    profileRevision: Math.max(
      0,
      Math.floor(Number(packageBinding.contactsProfileRevision) || 0),
    ),
    conceptIds,
  }
}

export const createMapSemanticPlaceEvidence = ({
  place = {},
  mapPack = {},
  worldBinding = {},
} = {}) => ({
  sourceOwner: 'map',
  worldId: normalizeEventId(worldBinding.worldId, 180),
  semanticVersionId: normalizeEventId(worldBinding.semanticVersionId, 180),
  mapPackId: normalizeEventId(place.mapPackId || mapPack.id, 180),
  mapPackVersion: Math.max(1, Math.floor(Number(mapPack.version) || 1)),
  placeId: normalizeEventId(place.placeId || place.id, 180),
  conceptIds: normalizeIdList(place.semanticConceptIds),
})

export const resolveWorldSemanticRestrictedPlaceAccess = ({
  semanticVersion = null,
  worldBinding = {},
  actorEvidence = null,
  placeEvidence = null,
} = {}) => {
  if (!semanticVersion?.compiledManifest) {
    return createBaseResult({ code: WORLD_SEMANTIC_ACCESS_RESULT.VERSION_MISSING })
  }
  const manifest = semanticVersion.compiledManifest
  const normalizedBinding = {
    worldId: normalizeEventId(worldBinding.worldId, 180),
    semanticVersionId: normalizeEventId(worldBinding.semanticVersionId, 180),
    semanticManifestRevision: Math.max(
      0,
      Math.floor(Number(worldBinding.semanticManifestRevision) || 0),
    ),
    semanticManifestHash: normalizeEventText(worldBinding.semanticManifestHash, '', 64),
    semanticSourceFingerprint: normalizeEventText(
      worldBinding.semanticSourceFingerprint,
      '',
      64,
    ),
  }
  if (
    !normalizedBinding.worldId ||
    manifest.worldId !== normalizedBinding.worldId ||
    semanticVersion.versionId !== normalizedBinding.semanticVersionId ||
    Number(manifest.manifestRevision) !== normalizedBinding.semanticManifestRevision ||
    manifest.manifestHash !== normalizedBinding.semanticManifestHash ||
    manifest.sourceFingerprint !== normalizedBinding.semanticSourceFingerprint
  ) {
    return createBaseResult({ code: WORLD_SEMANTIC_ACCESS_RESULT.VERSION_STALE })
  }

  const placeConceptIds = normalizeIdList(placeEvidence?.conceptIds)
  if (placeConceptIds.length === 0) {
    return createBaseResult({ code: WORLD_SEMANTIC_ACCESS_RESULT.NOT_APPLICABLE })
  }
  const bridges = (manifest.bridges || [])
    .filter(
      (bridge) =>
        bridge.targetCapabilityId === WORLD_SEMANTIC_RESTRICTED_PLACE_CAPABILITY_ID &&
        bridge.sourceType === 'capability',
    )
    .sort((left, right) => left.id.localeCompare(right.id))
  const candidates = bridges.flatMap((bridge) => {
    const capability = manifest.capabilities?.find((item) => item.id === bridge.sourceId)
    if (!capability) return []
    const placeConceptId = intersects(placeConceptIds, capability.objectConceptIds || [])
    const ownerEffect = capability.effects?.find(
      (effect) =>
        effect.ownerModule === 'map' &&
        effect.actionId === WORLD_SEMANTIC_MAP_ACCESS_ACTION_ID,
    )
    return placeConceptId && ownerEffect
      ? [{ bridge, capability, placeConceptId, ownerEffect }]
      : []
  })
  if (candidates.length === 0) {
    return createBaseResult({ code: WORLD_SEMANTIC_ACCESS_RESULT.NOT_APPLICABLE })
  }

  const actorConceptIds = normalizeIdList(actorEvidence?.conceptIds)
  let code = WORLD_SEMANTIC_ACCESS_RESULT.DENIED
  if (!actorEvidence || actorConceptIds.length === 0) {
    code = WORLD_SEMANTIC_ACCESS_RESULT.ACTOR_EVIDENCE_MISSING
  } else if (
    actorEvidence.worldId !== normalizedBinding.worldId ||
    Number(actorEvidence.worldRevision) !== normalizedBinding.semanticManifestRevision ||
    actorEvidence.semanticVersionId !== normalizedBinding.semanticVersionId
  ) {
    code = WORLD_SEMANTIC_ACCESS_RESULT.ACTOR_EVIDENCE_STALE
  }

  const matched = candidates.find(({ capability }) =>
    intersects(actorConceptIds, capability.actorConceptIds || []),
  )
  const selected = matched || candidates[0]
  const actorConceptId = matched
    ? intersects(actorConceptIds, selected.capability.actorConceptIds || [])
    : ''
  const allowed = Boolean(matched) && code === WORLD_SEMANTIC_ACCESS_RESULT.DENIED
  if (allowed) code = WORLD_SEMANTIC_ACCESS_RESULT.GRANTED
  const boundaryIds = normalizeIdList(
    manifest.indexes?.boundariesByCapability?.[selected.capability.id],
  )
  const actorConcept = findConcept(manifest, actorConceptId)
  const placeConcept = findConcept(manifest, selected.placeConceptId)

  return {
    ...createBaseResult({ code, applies: true, allowed }),
    bridgeId: selected.bridge.id,
    capabilityId: selected.capability.id,
    capabilityLabel: selected.capability.label,
    actorConceptId,
    actorConceptLabel: actorConcept?.label || '',
    placeConceptId: selected.placeConceptId,
    placeConceptLabel: placeConcept?.label || '',
    boundaryIds,
    ownerEffectId: selected.ownerEffect.id,
    worldBinding: normalizedBinding,
    actorEvidenceRef: actorEvidence
      ? {
          sourceOwner: actorEvidence.sourceOwner,
          packageId: actorEvidence.packageId,
          packageRevision: actorEvidence.packageRevision,
          membershipId: actorEvidence.membershipId,
          profileId: actorEvidence.profileId,
          profileRevision: actorEvidence.profileRevision,
        }
      : null,
    placeEvidenceRef: placeEvidence
      ? {
          sourceOwner: placeEvidence.sourceOwner,
          mapPackId: placeEvidence.mapPackId,
          mapPackVersion: placeEvidence.mapPackVersion,
          placeId: placeEvidence.placeId,
        }
      : null,
  }
}
