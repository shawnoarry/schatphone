import {
  CUSTOM_MAP_PACK_LIMIT,
  MAP_CATALOG_PROVENANCE_KIND,
  computeManagedMapPackFingerprint,
  listMapPacks,
} from './map-packs'

export const MAP_WORLD_SUITE_PROVENANCE_KIND = MAP_CATALOG_PROVENANCE_KIND

export const MAP_WORLD_SUITE_NATIVE_KINDS = Object.freeze({
  ABSENT: 'absent',
  BUILT_IN: 'built_in',
  USER_CUSTOM: 'user_custom',
  CATALOG_MANAGED: 'catalog_managed',
  CATALOG_MANAGED_OTHER: 'catalog_managed_other',
  AMBIGUOUS: 'ambiguous',
})

export const MAP_WORLD_SUITE_INSPECTION_ERROR_CODES = Object.freeze({
  INVALID_RESOURCE: 'invalid_resource',
})

export const MAP_WORLD_SUITE_MUTATION_BLOCKERS = Object.freeze({
  PROVENANCE_ROUND_TRIP_MISSING: 'provenance_round_trip_missing',
  OWNER_MUTATION_INTERFACE_MISSING: 'owner_mutation_interface_missing',
  WRITE_RECEIPT_MISSING: 'write_receipt_missing',
  ROLLBACK_NOT_VERIFIED: 'rollback_not_verified',
  GALLERY_ASSET_LIFECYCLE_UNDEFINED: 'gallery_asset_lifecycle_undefined',
})

export const CURRENT_MAP_WORLD_SUITE_MUTATION_CAPABILITIES = Object.freeze({
  provenanceRoundTrip: true,
  ownerMutationInterface: true,
  writeReceiptObservable: true,
  rollbackVerified: true,
  galleryAssetLifecycleDefined: true,
})

const BUILT_IN_MAP_PACK_IDS = new Set(listMapPacks().map((pack) => pack.id))

const normalizeId = (value, maxLength = 180) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

const normalizeVersion = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.floor(numeric))
}

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

export { computeManagedMapPackFingerprint } from './map-packs'

const validateResource = (resource) =>
  resource?.type === 'map_pack' &&
  resource?.owner === 'map' &&
  Boolean(normalizeId(resource.id)) &&
  Boolean(normalizeId(resource.ownerResourceId)) &&
  Boolean(normalizeId(resource.catalogId)) &&
  normalizeVersion(resource.version) > 0

const resolveManagedProvenance = (pack, resource) => {
  const provenance =
    pack?.provenance && typeof pack.provenance === 'object' ? pack.provenance : {}
  const resourceId = normalizeId(provenance.resourceId)
  const catalogId = normalizeId(provenance.catalogId)
  const expectedResourceId = normalizeId(resource?.id)
  const expectedCatalogId = normalizeId(resource?.catalogId)
  const kind = normalizeId(provenance.kind)
  const managedByCatalog = kind === MAP_WORLD_SUITE_PROVENANCE_KIND
  return {
    managedByCatalog,
    managed:
      managedByCatalog &&
      resourceId === expectedResourceId &&
      catalogId === expectedCatalogId,
    resourceId,
    catalogId,
    catalogVersion: normalizeVersion(provenance.catalogVersion),
    installedFingerprint: normalizeId(provenance.installedFingerprint, 120),
  }
}

const normalizeStringIds = (values = []) => [
  ...new Set(
    (Array.isArray(values) ? values : []).map((value) => normalizeId(value)).filter(Boolean),
  ),
]

const normalizeExternalReferences = (rawReferences, mapPackId) => {
  const seen = new Set()
  const items = (Array.isArray(rawReferences) ? rawReferences : [])
    .map((rawReference) => {
      const reference =
        rawReference && typeof rawReference === 'object' ? rawReference : {}
      const owner = normalizeId(reference.owner, 80)
      const kind = normalizeId(reference.kind, 80)
      const referenceId = normalizeId(reference.referenceId || reference.id)
      const referencedMapPackId = normalizeId(reference.mapPackId, 120)
      if (!owner || !kind || !referenceId || referencedMapPackId !== mapPackId) return null
      const key = `${owner}:${kind}:${referenceId}`
      if (seen.has(key)) return null
      seen.add(key)
      return {
        owner,
        kind,
        referenceId,
        active: reference.active === true,
      }
    })
    .filter(Boolean)
  const byOwner = Object.fromEntries(
    [...new Set(items.map((item) => item.owner))].map((owner) => {
      const ownerItems = items.filter((item) => item.owner === owner)
      return [
        owner,
        {
          currentCount: ownerItems.filter((item) => item.active).length,
          historicalCount: ownerItems.filter((item) => !item.active).length,
        },
      ]
    }),
  )
  return {
    items,
    byOwner,
    currentCount: items.filter((item) => item.active).length,
    historicalCount: items.filter((item) => !item.active).length,
    count: items.length,
  }
}

const listGalleryAssetIds = (galleryAssets) => {
  if (galleryAssets == null) return null
  return new Set(
    (Array.isArray(galleryAssets) ? galleryAssets : [])
      .map((asset) => normalizeId(typeof asset === 'string' ? asset : asset?.id || asset?.assetId))
      .filter(Boolean),
  )
}

const inspectVisibilityReferences = (state, mapPackId) => {
  const visibility = state?.mapPinVisibilityByPack?.[mapPackId]
  if (!visibility || typeof visibility !== 'object') {
    return { categoryIds: [], placeIds: [], count: 0 }
  }
  const categoryIds = Object.entries(visibility.categoryVisibility || {})
    .filter(([, visible]) => typeof visible === 'boolean')
    .map(([categoryId]) => normalizeId(categoryId))
    .filter(Boolean)
  const placeIds = Object.entries(visibility.placeVisibility || {})
    .filter(([, visible]) => typeof visible === 'boolean')
    .map(([placeId]) => normalizeId(placeId))
    .filter(Boolean)
  return {
    categoryIds: normalizeStringIds(categoryIds),
    placeIds: normalizeStringIds(placeIds),
    count: categoryIds.length + placeIds.length,
  }
}

const inspectPlaceKnowledgeReferences = (state, mapPackId) => {
  const references = []
  Object.entries(state?.mapPlaceKnowledgeByWorld || {}).forEach(([worldPackId, knowledge]) => {
    const discoveries = knowledge?.discoveriesByMapPack?.[mapPackId]
    if (!discoveries || typeof discoveries !== 'object') return
    const placeIds = normalizeStringIds([
      ...(Array.isArray(discoveries.placeIds) ? discoveries.placeIds : []),
      ...Object.keys(discoveries.evidenceByPlaceId || {}),
    ])
    if (placeIds.length === 0) return
    references.push({
      worldPackId: normalizeId(worldPackId, 120),
      placeIds,
      count: placeIds.length,
    })
  })
  return {
    worlds: references,
    worldPackIds: references.map((reference) => reference.worldPackId).filter(Boolean),
    count: references.reduce((total, reference) => total + reference.count, 0),
  }
}

const inspectMapPackReferences = (state = {}, mapPackId, externalReferences = []) => {
  const worldBindingIds = Object.entries(state.worldMapPackBindings || {})
    .filter(([, boundMapPackId]) => normalizeId(boundMapPackId, 120) === mapPackId)
    .map(([worldPackId]) => normalizeId(worldPackId, 120))
    .filter(Boolean)
  const addressIds = (Array.isArray(state.addresses) ? state.addresses : [])
    .filter((address) => normalizeId(address?.mapPackId, 120) === mapPackId)
    .map((address) => String(address?.id ?? '').trim())
    .filter(Boolean)
  const visibility = inspectVisibilityReferences(state, mapPackId)
  const placeKnowledge = inspectPlaceKnowledgeReferences(state, mapPackId)
  const currentLocationReferenced =
    normalizeId(state.currentLocation?.mapPackId, 120) === mapPackId
  const currentLocation = {
    referenced: currentLocationReferenced,
    placeId: currentLocationReferenced ? normalizeId(state.currentLocation?.placeId) : '',
    hasPosition: currentLocationReferenced && Boolean(state.currentLocation?.position),
  }
  const placeSessionReferenced = normalizeId(state.placeSession?.mapPackId, 120) === mapPackId
  const placeSessionState = placeSessionReferenced ? normalizeId(state.placeSession?.state, 40) : ''
  const placeSession = {
    referenced: placeSessionReferenced,
    active: placeSessionReferenced && placeSessionState === 'inside',
    historical: placeSessionReferenced && placeSessionState !== 'inside',
    state: placeSessionState,
    sessionId: placeSessionReferenced ? normalizeId(state.placeSession?.sessionId) : '',
    placeId: placeSessionReferenced ? normalizeId(state.placeSession?.placeId) : '',
  }
  const tripStateStatus = normalizeId(state.tripState?.status, 40)
  const activeJourneyReferenced =
    normalizeId(state.tripState?.mapPackId, 120) === mapPackId &&
    (tripStateStatus === 'traveling' || tripStateStatus === 'arrived')
  const activeJourney = {
    referenced: activeJourneyReferenced,
    status: activeJourneyReferenced ? tripStateStatus : '',
    journeyId: activeJourneyReferenced ? normalizeId(state.tripState?.journeyId) : '',
    destinationPlaceId: activeJourneyReferenced
      ? normalizeId(state.tripState?.destinationPlaceId)
      : '',
  }
  const historicalJourneyIds = (Array.isArray(state.tripHistory) ? state.tripHistory : [])
    .filter((journey) => normalizeId(journey?.mapPackId, 120) === mapPackId)
    .map((journey) => normalizeId(journey?.journeyId || journey?.id))
    .filter(Boolean)
  const activeSelection = normalizeId(state.activeMapPackId, 120) === mapPackId
  const external = normalizeExternalReferences(externalReferences, mapPackId)

  const currentReferenceCount =
    Number(activeSelection) +
    worldBindingIds.length +
    addressIds.length +
    visibility.count +
    Number(currentLocation.referenced) +
    Number(placeSession.active) +
    Number(activeJourney.referenced) +
    external.currentCount
  const historicalReferenceCount =
    placeKnowledge.count +
    historicalJourneyIds.length +
    Number(placeSession.historical) +
    external.historicalCount

  return {
    activeSelection,
    worldBindingIds,
    addressIds,
    visibility,
    placeKnowledge,
    currentLocation,
    placeSession,
    activeJourney,
    historicalJourneyIds,
    external,
    currentReferenceCount,
    historicalReferenceCount,
    totalReferenceCount: currentReferenceCount + historicalReferenceCount,
  }
}

const inspectCapacity = (state = {}) => {
  const customPacks = Array.isArray(state.customMapPacks) ? state.customMapPacks : []
  const count = customPacks.filter((pack) => normalizeId(pack?.id, 120)).length
  return {
    limit: CUSTOM_MAP_PACK_LIMIT,
    count,
    remaining: Math.max(0, CUSTOM_MAP_PACK_LIMIT - count),
    reached: count >= CUSTOM_MAP_PACK_LIMIT,
  }
}

const classifyNativeIdentity = ({ resource, state }) => {
  const mapPackId = resource.ownerResourceId
  const customMatches = (Array.isArray(state?.customMapPacks) ? state.customMapPacks : []).filter(
    (pack) => normalizeId(pack?.id, 120) === mapPackId,
  )
  const builtIn = BUILT_IN_MAP_PACK_IDS.has(mapPackId)
  if ((builtIn && customMatches.length > 0) || customMatches.length > 1) {
    return {
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.AMBIGUOUS,
      pack: customMatches[0] || null,
      collision: true,
    }
  }
  if (builtIn) {
    return {
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.BUILT_IN,
      pack: listMapPacks().find((pack) => pack.id === mapPackId) || null,
      collision: true,
    }
  }
  if (customMatches.length === 0) {
    return {
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.ABSENT,
      pack: null,
      collision: false,
    }
  }
  const pack = customMatches[0]
  const provenance = resolveManagedProvenance(pack, resource)
  if (provenance.managed) {
    return {
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.CATALOG_MANAGED,
      pack,
      provenance,
      collision: false,
    }
  }
  return {
    nativeKind: provenance.managedByCatalog
      ? MAP_WORLD_SUITE_NATIVE_KINDS.CATALOG_MANAGED_OTHER
      : MAP_WORLD_SUITE_NATIVE_KINDS.USER_CUSTOM,
    pack,
    provenance,
    collision: true,
  }
}

export const inspectMapWorldSuiteMutationReadiness = (
  capabilities = CURRENT_MAP_WORLD_SUITE_MUTATION_CAPABILITIES,
) => {
  const normalized = {
    provenanceRoundTrip: capabilities.provenanceRoundTrip === true,
    ownerMutationInterface: capabilities.ownerMutationInterface === true,
    writeReceiptObservable: capabilities.writeReceiptObservable === true,
    rollbackVerified: capabilities.rollbackVerified === true,
    galleryAssetLifecycleDefined: capabilities.galleryAssetLifecycleDefined === true,
  }
  const blockers = []
  if (!normalized.provenanceRoundTrip) {
    blockers.push(MAP_WORLD_SUITE_MUTATION_BLOCKERS.PROVENANCE_ROUND_TRIP_MISSING)
  }
  if (!normalized.ownerMutationInterface) {
    blockers.push(MAP_WORLD_SUITE_MUTATION_BLOCKERS.OWNER_MUTATION_INTERFACE_MISSING)
  }
  if (!normalized.writeReceiptObservable) {
    blockers.push(MAP_WORLD_SUITE_MUTATION_BLOCKERS.WRITE_RECEIPT_MISSING)
  }
  if (!normalized.rollbackVerified) {
    blockers.push(MAP_WORLD_SUITE_MUTATION_BLOCKERS.ROLLBACK_NOT_VERIFIED)
  }
  if (!normalized.galleryAssetLifecycleDefined) {
    blockers.push(MAP_WORLD_SUITE_MUTATION_BLOCKERS.GALLERY_ASSET_LIFECYCLE_UNDEFINED)
  }
  return deepFreeze({
    approved: blockers.length === 0,
    capabilities: normalized,
    blockers,
  })
}

export const inspectMapWorldSuiteResource = ({
  resource,
  state = {},
  galleryAssets,
  externalReferences,
  mutationCapabilities,
  mutationAdapterAvailable = false,
} = {}) => {
  if (!validateResource(resource)) {
    return deepFreeze({
      ok: false,
      code: MAP_WORLD_SUITE_INSPECTION_ERROR_CODES.INVALID_RESOURCE,
    })
  }

  const normalizedResource = {
    ...resource,
    id: normalizeId(resource.id),
    ownerResourceId: normalizeId(resource.ownerResourceId, 120),
    catalogId: normalizeId(resource.catalogId),
    version: normalizeVersion(resource.version),
  }
  const identity = classifyNativeIdentity({ resource: normalizedResource, state })
  const references = inspectMapPackReferences(
    state,
    normalizedResource.ownerResourceId,
    externalReferences,
  )
  const capacity = inspectCapacity(state)
  const galleryAssetId = normalizeId(identity.pack?.assetId)
  const knownGalleryAssetIds = listGalleryAssetIds(galleryAssets)
  const galleryAsset = {
    assetId: galleryAssetId,
    referenced: Boolean(galleryAssetId),
    available:
      galleryAssetId && knownGalleryAssetIds ? knownGalleryAssetIds.has(galleryAssetId) : null,
  }
  const installed = identity.nativeKind === MAP_WORLD_SUITE_NATIVE_KINDS.CATALOG_MANAGED
  const provenance = identity.provenance || resolveManagedProvenance(identity.pack, normalizedResource)
  const currentFingerprint = installed
    ? computeManagedMapPackFingerprint(identity.pack)
    : ''
  const userModified =
    installed &&
    (!provenance.installedFingerprint ||
      currentFingerprint !== provenance.installedFingerprint ||
      provenance.catalogVersion <= 0)
  const mutationReadiness = inspectMapWorldSuiteMutationReadiness(mutationCapabilities)
  const nativeInstallEligible = !installed && !identity.collision && !capacity.reached

  return deepFreeze({
    ok: true,
    code: '',
    id: normalizedResource.id,
    type: normalizedResource.type,
    owner: 'map',
    ownerResourceId: normalizedResource.ownerResourceId,
    version: installed ? provenance.catalogVersion || 1 : normalizedResource.version,
    installed,
    enabled: references.activeSelection || references.worldBindingIds.length > 0,
    userModified,
    inUse: references.totalReferenceCount > 0,
    historicalReferenceCount: references.historicalReferenceCount,
    collision: identity.collision,
    nativeKind: identity.nativeKind,
    capacity,
    nativeInstallEligible,
    mutationAdapterAvailable: mutationAdapterAvailable === true,
    canInstall:
      nativeInstallEligible &&
      mutationReadiness.approved &&
      mutationAdapterAvailable === true,
    references,
    galleryAsset,
    mutationReadiness,
  })
}

export const createMapWorldSuiteInspectionAdapter = ({
  mapStore,
  listGalleryAssets,
  listExternalReferences,
  mutationCapabilities = CURRENT_MAP_WORLD_SUITE_MUTATION_CAPABILITIES,
  mutationAdapterAvailable = false,
} = {}) => {
  if (!mapStore || typeof mapStore.createBackupSnapshot !== 'function') {
    throw new TypeError('A Map Store with createBackupSnapshot is required.')
  }

  return {
    owner: 'map',
    inspect: ({ resource } = {}) =>
      inspectMapWorldSuiteResource({
        resource,
        state: mapStore.createBackupSnapshot(),
        galleryAssets:
          typeof listGalleryAssets === 'function' ? listGalleryAssets() : undefined,
        externalReferences:
          typeof listExternalReferences === 'function' ? listExternalReferences() : undefined,
        mutationCapabilities,
        mutationAdapterAvailable,
      }),
  }
}
