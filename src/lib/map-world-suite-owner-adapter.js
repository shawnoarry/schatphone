import {
  MAP_CATALOG_PROVENANCE_KIND,
  computeManagedMapPackFingerprint,
  normalizeCustomMapPack,
} from './map-packs'
import { createProductionMapWorldSuiteInspectionAdapter } from './production-map-world-suite-inspection-adapter'

export const MAP_WORLD_SUITE_ERROR_CODES = Object.freeze({
  INVALID_RESOURCE: 'invalid_resource',
  INVALID_CATALOG_MAP_PACK: 'invalid_catalog_map_pack',
  CATALOG_MAP_PACK_NOT_FOUND: 'catalog_map_pack_not_found',
  CATALOG_VERSION_MISMATCH: 'catalog_version_mismatch',
  IDENTITY_COLLISION: 'identity_collision',
  CAPACITY_REACHED: 'capacity_reached',
  GALLERY_ASSET_MISSING: 'gallery_asset_missing',
  TOPOLOGY_MIGRATION_REQUIRED: 'topology_migration_required',
  USER_MODIFIED: 'user_modified',
  RESOURCE_IN_USE: 'resource_in_use',
  HISTORICAL_REFERENCES: 'historical_references',
  OWNER_MUTATION_UNAVAILABLE: 'owner_mutation_unavailable',
  OWNER_OPERATION_FAILED: 'owner_operation_failed',
})

const normalizeId = (value) => (typeof value === 'string' ? value.trim() : '')

const normalizeVersion = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.floor(numeric))
}

const clone = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

const validateResource = (resource) =>
  resource?.type === 'map_pack' &&
  resource?.owner === 'map' &&
  Boolean(normalizeId(resource.id)) &&
  Boolean(normalizeId(resource.ownerResourceId)) &&
  Boolean(normalizeId(resource.catalogId)) &&
  normalizeVersion(resource.version) > 0

const buildManagedPack = ({ resource, rawPack }) => {
  if (!rawPack || typeof rawPack !== 'object' || Array.isArray(rawPack)) return null
  if (
    (normalizeId(rawPack.id) && normalizeId(rawPack.id) !== resource.ownerResourceId) ||
    (normalizeId(rawPack.kind) && rawPack.kind !== 'fictional') ||
    (normalizeId(rawPack.coordinateKind) && rawPack.coordinateKind !== 'canvas')
  ) {
    return null
  }
  const provisional = normalizeCustomMapPack(
    {
      ...clone(rawPack),
      id: resource.ownerResourceId,
      version: resource.version,
      provenance: {
        kind: MAP_CATALOG_PROVENANCE_KIND,
        resourceId: resource.id,
        catalogId: resource.catalogId,
        catalogVersion: resource.version,
        installedFingerprint: 'map_fp_0_0',
      },
    },
    0,
    { preserveCatalogProvenance: true },
  )
  if (!provisional) return null
  const installedFingerprint = computeManagedMapPackFingerprint(provisional)
  return normalizeCustomMapPack(
    {
      ...provisional,
      provenance: {
        kind: MAP_CATALOG_PROVENANCE_KIND,
        resourceId: resource.id,
        catalogId: resource.catalogId,
        catalogVersion: resource.version,
        installedFingerprint,
      },
    },
    0,
    { preserveCatalogProvenance: true },
  )
}

const resolveCatalogRecord = async ({ resource, resolveCatalogMapPack }) => {
  if (typeof resolveCatalogMapPack !== 'function') {
    return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.CATALOG_MAP_PACK_NOT_FOUND }
  }
  const rawRecord = await resolveCatalogMapPack(resource.catalogId, resource.version)
  if (!rawRecord || typeof rawRecord !== 'object' || Array.isArray(rawRecord)) {
    return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.CATALOG_MAP_PACK_NOT_FOUND }
  }
  const catalogId = normalizeId(rawRecord.catalogId || rawRecord.id)
  if (catalogId !== resource.catalogId) {
    return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.INVALID_CATALOG_MAP_PACK }
  }
  if (normalizeVersion(rawRecord.catalogVersion) !== resource.version) {
    return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.CATALOG_VERSION_MISMATCH }
  }
  const rawPack = rawRecord.mapPack || rawRecord.pack
  const mapPack = buildManagedPack({ resource, rawPack })
  if (!mapPack) {
    return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.INVALID_CATALOG_MAP_PACK }
  }
  return { ok: true, mapPack }
}

const mapMutationFailure = (result) => ({
  ok: false,
  code: normalizeId(result?.code) || MAP_WORLD_SUITE_ERROR_CODES.OWNER_OPERATION_FAILED,
})

const mapPositionsEqual = (left, right) => {
  if (!left || !right || left.kind !== right.kind) return false
  if (left.kind === 'geo') {
    return left.lat === right.lat && left.lng === right.lng
  }
  return left.kind === 'canvas' && left.x === right.x && left.y === right.y
}

const preservesInstalledTopology = (installedPack, nextPack) => {
  if (!installedPack || !nextPack) return false
  if (
    installedPack.assetId !== nextPack.assetId ||
    installedPack.assetWidth !== nextPack.assetWidth ||
    installedPack.assetHeight !== nextPack.assetHeight ||
    installedPack.distanceScaleKm !== nextPack.distanceScaleKm
  ) {
    return false
  }
  const nextFactionById = new Map(nextPack.factions.map((faction) => [faction.id, faction]))
  if (
    installedPack.factions.some((faction) => {
      const nextFaction = nextFactionById.get(faction.id)
      return !nextFaction || !mapPositionsEqual(faction.position, nextFaction.position)
    })
  ) {
    return false
  }
  const nextPlaceById = new Map(nextPack.places.map((place) => [place.id, place]))
  return installedPack.places.every((place) => {
    const nextPlace = nextPlaceById.get(place.id)
    return (
      nextPlace &&
      place.factionId === nextPlace.factionId &&
      mapPositionsEqual(place.position, nextPlace.position)
    )
  })
}

export const createMapWorldSuiteOwnerAdapter = ({
  mapStore,
  inspectMapResource,
  resolveCatalogMapPack,
  hasGalleryAsset,
} = {}) => {
  if (!mapStore || typeof mapStore.createBackupSnapshot !== 'function') {
    throw new TypeError('A Map Store with createBackupSnapshot is required.')
  }
  if (typeof inspectMapResource !== 'function') {
    throw new TypeError('A Map World Suite inspection function is required.')
  }

  const inspect = ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    return inspectMapResource({ resource })
  }

  const mutate = async (payload) => {
    if (typeof mapStore.commitManagedMapPackMutation !== 'function') {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.OWNER_MUTATION_UNAVAILABLE }
    }
    const result = await mapStore.commitManagedMapPackMutation(payload)
    return result?.ok === true ? { ok: true } : mapMutationFailure(result)
  }

  const requireCatalogPack = async (resource) => {
    const catalog = await resolveCatalogRecord({ resource, resolveCatalogMapPack })
    if (!catalog.ok) return catalog
    if (
      typeof hasGalleryAsset !== 'function' ||
      hasGalleryAsset(catalog.mapPack.assetId) !== true
    ) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.GALLERY_ASSET_MISSING }
    }
    return catalog
  }

  const requireInstalledManagedPack = (resource) => {
    const evidence = inspect({ resource })
    if (!evidence?.ok) return evidence
    if (!evidence.installed) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.IDENTITY_COLLISION }
    }
    return { ok: true, evidence }
  }

  const mutationIsReady = (evidence) =>
    evidence?.mutationReadiness?.approved === true &&
    evidence?.mutationAdapterAvailable === true

  const requirePristineUnusedPack = (resource) => {
    const installed = requireInstalledManagedPack(resource)
    if (!installed.ok) return installed
    if (!mutationIsReady(installed.evidence)) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.OWNER_MUTATION_UNAVAILABLE }
    }
    if (installed.evidence.userModified) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.USER_MODIFIED }
    }
    if (installed.evidence.references?.currentReferenceCount > 0) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.RESOURCE_IN_USE }
    }
    if (installed.evidence.historicalReferenceCount > 0) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.HISTORICAL_REFERENCES }
    }
    return installed
  }

  const install = async ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    const evidence = inspect({ resource })
    if (!evidence?.ok) return evidence
    if (evidence.installed || evidence.collision) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.IDENTITY_COLLISION }
    }
    if (evidence.capacity?.reached) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.CAPACITY_REACHED }
    }
    if (!mutationIsReady(evidence)) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.OWNER_MUTATION_UNAVAILABLE }
    }
    const catalog = await requireCatalogPack(resource)
    if (!catalog.ok) return catalog
    return mutate({
      operation: 'create',
      mapPackId: resource.ownerResourceId,
      pack: catalog.mapPack,
    })
  }

  const update = async ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    const pristine = requirePristineUnusedPack(resource)
    if (!pristine.ok) return pristine
    const catalog = await requireCatalogPack(resource)
    if (!catalog.ok) return catalog
    const installedPack = mapStore
      .createBackupSnapshot()
      .customMapPacks.find((pack) => pack.id === resource.ownerResourceId)
    if (!preservesInstalledTopology(installedPack, catalog.mapPack)) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.TOPOLOGY_MIGRATION_REQUIRED }
    }
    return mutate({
      operation: 'update',
      mapPackId: resource.ownerResourceId,
      patch: catalog.mapPack,
    })
  }

  const remove = async ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: MAP_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    const pristine = requirePristineUnusedPack(resource)
    if (!pristine.ok) return pristine
    return mutate({ operation: 'delete', mapPackId: resource.ownerResourceId })
  }

  return { owner: 'map', inspect, install, update, remove }
}

export const createProductionMapWorldSuiteOwnerAdapter = ({
  mapStore,
  galleryStore,
  simulationStore,
  chatStore,
  resolveCatalogMapPack,
} = {}) => {
  if (!galleryStore || typeof galleryStore.findAssetById !== 'function') {
    throw new TypeError('A Gallery Store with findAssetById is required.')
  }
  const inspectionAdapter = createProductionMapWorldSuiteInspectionAdapter({
    mapStore,
    galleryStore,
    simulationStore,
    chatStore,
    mutationAdapterAvailable: true,
  })
  return createMapWorldSuiteOwnerAdapter({
    mapStore,
    inspectMapResource: inspectionAdapter.inspect,
    resolveCatalogMapPack,
    hasGalleryAsset: (assetId) => Boolean(galleryStore.findAssetById(assetId)),
  })
}
