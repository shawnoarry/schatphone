import {
  buildCatalogManagedGalleryAssetPack,
  computeManagedGalleryAssetPackFingerprint,
  normalizeGalleryCatalogAssetProvenance,
  normalizeGalleryCatalogPackProvenance,
} from './gallery-catalog-assets'

export const GALLERY_WORLD_SUITE_ERROR_CODES = Object.freeze({
  INVALID_RESOURCE: 'invalid_resource',
  INVALID_CATALOG_ASSET_PACK: 'invalid_catalog_asset_pack',
  CATALOG_ASSET_PACK_NOT_FOUND: 'catalog_asset_pack_not_found',
  CATALOG_VERSION_MISMATCH: 'catalog_version_mismatch',
  IDENTITY_COLLISION: 'identity_collision',
  USER_MODIFIED: 'user_modified',
  RESOURCE_IN_USE: 'resource_in_use',
  OWNER_MUTATION_UNAVAILABLE: 'owner_mutation_unavailable',
  OWNER_OPERATION_FAILED: 'owner_operation_failed',
})

const normalizeId = (value) => (typeof value === 'string' ? value.trim() : '')

const normalizeVersion = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.floor(numeric))
}

const validateResource = (resource) =>
  resource?.type === 'gallery_asset_pack' &&
  resource?.owner === 'gallery' &&
  Boolean(normalizeId(resource.id)) &&
  Boolean(normalizeId(resource.ownerResourceId)) &&
  Boolean(normalizeId(resource.catalogId)) &&
  normalizeVersion(resource.version) > 0

const resolveCatalogRecord = async ({ resource, resolveCatalogAssetPack }) => {
  if (typeof resolveCatalogAssetPack !== 'function') {
    return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.CATALOG_ASSET_PACK_NOT_FOUND }
  }
  const rawRecord = await resolveCatalogAssetPack(resource.catalogId, resource.version)
  if (!rawRecord || typeof rawRecord !== 'object' || Array.isArray(rawRecord)) {
    return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.CATALOG_ASSET_PACK_NOT_FOUND }
  }
  if (normalizeId(rawRecord.catalogId || rawRecord.id) !== resource.catalogId) {
    return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.INVALID_CATALOG_ASSET_PACK }
  }
  if (normalizeVersion(rawRecord.catalogVersion) !== resource.version) {
    return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.CATALOG_VERSION_MISMATCH }
  }
  const assetPack = buildCatalogManagedGalleryAssetPack({
    resource,
    rawAssetPack: rawRecord.assetPack || rawRecord.pack,
  })
  if (!assetPack) {
    return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.INVALID_CATALOG_ASSET_PACK }
  }
  return { ok: true, assetPack }
}

const buildEvidence = ({ resource, galleryStore }) => {
  const folder = galleryStore.findFolderById(resource.ownerResourceId)
  if (!folder) {
    return {
      id: resource.id,
      type: resource.type,
      owner: 'gallery',
      ownerResourceId: resource.ownerResourceId,
      version: 1,
      installed: false,
      enabled: false,
      userModified: false,
      inUse: false,
      historicalReferenceCount: 0,
    }
  }

  const provenance = normalizeGalleryCatalogPackProvenance(folder.provenance)
  if (
    !provenance ||
    provenance.resourceId !== resource.id ||
    provenance.catalogId !== resource.catalogId ||
    provenance.folderId !== resource.ownerResourceId
  ) {
    return {
      id: resource.id,
      type: resource.type,
      owner: 'gallery',
      ownerResourceId: resource.ownerResourceId,
      version: 1,
      installed: false,
      enabled: false,
      userModified: false,
      inUse: false,
      historicalReferenceCount: 0,
      collision: true,
    }
  }

  const assets = folder.assetIds.map((assetId) => galleryStore.findAssetById(assetId))
  const complete = assets.every((asset, index) => {
    const assetProvenance = normalizeGalleryCatalogAssetProvenance(asset?.provenance)
    return Boolean(
      asset &&
      asset.id === folder.assetIds[index] &&
      assetProvenance &&
      assetProvenance.resourceId === provenance.resourceId &&
      assetProvenance.catalogId === provenance.catalogId &&
      assetProvenance.catalogVersion === provenance.catalogVersion &&
      assetProvenance.folderId === provenance.folderId &&
      assetProvenance.installedFingerprint === provenance.installedFingerprint
    )
  })
  const currentFingerprint = complete
    ? computeManagedGalleryAssetPackFingerprint({ folder, assets })
    : ''
  const usages = assets.flatMap((asset) =>
    asset ? galleryStore.getAssetUsageList(asset.id) : [],
  )
  const managedAssetIds = new Set(folder.assetIds)
  const externalFolderReferences = (Array.isArray(galleryStore.folders) ? galleryStore.folders : [])
    .filter((candidate) => candidate?.id !== folder.id)
    .flatMap((candidate) =>
      (Array.isArray(candidate?.assetIds) ? candidate.assetIds : [])
        .filter((assetId) => managedAssetIds.has(assetId))
        .map((assetId) => ({
          id: `gallery:folder.${candidate.id}.asset.${assetId}`,
          moduleKey: 'gallery',
          targetKey: `folder.${candidate.id}.asset.${assetId}`,
          label: 'Gallery folder membership',
        })),
    )
  usages.push(...externalFolderReferences)

  return {
    id: resource.id,
    type: resource.type,
    owner: 'gallery',
    ownerResourceId: resource.ownerResourceId,
    version: provenance.catalogVersion || 1,
    installed: true,
    enabled: false,
    userModified:
      !complete ||
      !provenance.installedFingerprint ||
      currentFingerprint !== provenance.installedFingerprint,
    inUse: usages.length > 0,
    historicalReferenceCount: 0,
    assetCount: assets.filter(Boolean).length,
    usageCount: usages.length,
  }
}

const mapMutationFailure = (result) => ({
  ok: false,
  code: normalizeId(result?.code) || GALLERY_WORLD_SUITE_ERROR_CODES.OWNER_OPERATION_FAILED,
})

export const createGalleryWorldSuiteOwnerAdapter = ({
  galleryStore,
  resolveCatalogAssetPack,
} = {}) => {
  if (
    !galleryStore ||
    typeof galleryStore.findAssetById !== 'function' ||
    typeof galleryStore.findFolderById !== 'function' ||
    typeof galleryStore.getAssetUsageList !== 'function'
  ) {
    throw new TypeError('A Gallery Store with asset, folder, and usage inspection is required.')
  }

  const inspect = ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    return buildEvidence({ resource, galleryStore })
  }

  const mutate = async (payload) => {
    if (typeof galleryStore.commitManagedAssetPackMutation !== 'function') {
      return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.OWNER_MUTATION_UNAVAILABLE }
    }
    const result = await galleryStore.commitManagedAssetPackMutation(payload)
    return result?.ok === true ? { ok: true } : mapMutationFailure(result)
  }

  const requirePristineUnusedPack = (resource) => {
    const evidence = inspect({ resource })
    if (evidence?.ok === false) return evidence
    if (!evidence.installed || evidence.collision) {
      return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.IDENTITY_COLLISION }
    }
    if (evidence.userModified) {
      return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.USER_MODIFIED }
    }
    if (evidence.inUse) {
      return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.RESOURCE_IN_USE }
    }
    return { ok: true, evidence }
  }

  const install = async ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    const evidence = inspect({ resource })
    if (evidence?.ok === false) return evidence
    if (evidence.installed || evidence.collision) {
      return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.IDENTITY_COLLISION }
    }
    const catalog = await resolveCatalogRecord({ resource, resolveCatalogAssetPack })
    if (!catalog.ok) return catalog
    if (catalog.assetPack.assets.some((asset) => galleryStore.findAssetById(asset.id))) {
      return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.IDENTITY_COLLISION }
    }
    return mutate({
      operation: 'create',
      folderId: resource.ownerResourceId,
      assetPack: catalog.assetPack,
    })
  }

  const update = async ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    const pristine = requirePristineUnusedPack(resource)
    if (!pristine.ok) return pristine
    const catalog = await resolveCatalogRecord({ resource, resolveCatalogAssetPack })
    if (!catalog.ok) return catalog
    return mutate({
      operation: 'update',
      folderId: resource.ownerResourceId,
      assetPack: catalog.assetPack,
    })
  }

  const remove = async ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: GALLERY_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    const pristine = requirePristineUnusedPack(resource)
    if (!pristine.ok) return pristine
    return mutate({ operation: 'delete', folderId: resource.ownerResourceId })
  }

  return { owner: 'gallery', inspect, install, update, remove }
}
