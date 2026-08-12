import {
  computeBookContentFingerprint,
  normalizeBookTextAsset,
} from './book-text-schema'

export const BOOK_WORLD_SUITE_SOURCE_KIND = 'book_catalog'

export const BOOK_WORLD_SUITE_ERROR_CODES = Object.freeze({
  INVALID_RESOURCE: 'invalid_resource',
  INVALID_CATALOG_ASSET: 'invalid_catalog_asset',
  CATALOG_ASSET_NOT_FOUND: 'catalog_asset_not_found',
  CATALOG_VERSION_MISMATCH: 'catalog_version_mismatch',
  IDENTITY_COLLISION: 'identity_collision',
  CAPACITY_REACHED: 'capacity_reached',
  READ_ONLY_CONFLICT: 'read_only_conflict',
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

const computeManagedAssetFingerprint = (asset = {}) => computeBookContentFingerprint(
  JSON.stringify(canonicalize({
    title: asset.title || '',
    category: asset.category || '',
    format: asset.format || '',
    categoryId: asset.categoryId || '',
    tags: Array.isArray(asset.tags) ? asset.tags : [],
    content: asset.content || '',
    sections: (Array.isArray(asset.sections) ? asset.sections : []).map((section) => ({
      id: section?.id || '',
      title: section?.title || '',
      level: Number(section?.level) || 0,
      content: section?.content || '',
      tags: Array.isArray(section?.tags) ? section.tags : [],
      order: Number(section?.order) || 0,
    })),
  })),
)

const listLinks = (listWorldBookSourceLinks) => {
  if (typeof listWorldBookSourceLinks !== 'function') return []
  const links = listWorldBookSourceLinks()
  return Array.isArray(links) ? links.filter((link) => link && typeof link === 'object') : []
}

const resolveManagedProvenance = (asset, resource) => {
  const source = asset?.source && typeof asset.source === 'object' ? asset.source : {}
  const catalogId = normalizeId(resource?.catalogId)
  return {
    managed:
      source.kind === BOOK_WORLD_SUITE_SOURCE_KIND &&
      normalizeId(source.catalogId) === catalogId &&
      normalizeId(source.resourceId) === normalizeId(resource?.id),
    catalogVersion: normalizeVersion(source.catalogVersion),
    installedFingerprint: normalizeId(source.installedFingerprint),
  }
}

const buildEvidence = ({ resource, asset, links = [] }) => {
  const referencedLinks = links.filter((link) => normalizeId(link.assetId) === resource.ownerResourceId)
  if (!asset) {
    return {
      id: resource.id,
      type: resource.type,
      owner: 'book',
      ownerResourceId: resource.ownerResourceId,
      version: 1,
      installed: false,
      enabled: false,
      userModified: false,
      inUse: false,
      historicalReferenceCount: 0,
    }
  }

  const provenance = resolveManagedProvenance(asset, resource)
  if (!provenance.managed) {
    return {
      id: resource.id,
      type: resource.type,
      owner: 'book',
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

  const currentFingerprint = computeManagedAssetFingerprint(asset)
  return {
    id: resource.id,
    type: resource.type,
    owner: 'book',
    ownerResourceId: resource.ownerResourceId,
    version: provenance.catalogVersion || 1,
    installed: true,
    enabled: false,
    userModified:
      !provenance.installedFingerprint ||
      currentFingerprint !== provenance.installedFingerprint,
    inUse: referencedLinks.some((link) => link.enabled !== false),
    historicalReferenceCount: referencedLinks.length,
  }
}

const validateResource = (resource) => (
  resource?.type === 'book_asset' &&
  resource?.owner === 'book' &&
  Boolean(normalizeId(resource.id)) &&
  Boolean(normalizeId(resource.ownerResourceId)) &&
  Boolean(normalizeId(resource.catalogId)) &&
  normalizeVersion(resource.version) > 0
)

const resolveCatalogRecord = async ({ resource, resolveCatalogAsset }) => {
  if (typeof resolveCatalogAsset !== 'function') {
    return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.CATALOG_ASSET_NOT_FOUND }
  }
  const rawRecord = await resolveCatalogAsset(resource.catalogId, resource.version)
  if (!rawRecord || typeof rawRecord !== 'object') {
    return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.CATALOG_ASSET_NOT_FOUND }
  }
  const catalogId = normalizeId(rawRecord.catalogId || rawRecord.id)
  if (catalogId !== resource.catalogId) {
    return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.INVALID_CATALOG_ASSET }
  }
  const catalogVersion = normalizeVersion(rawRecord.catalogVersion)
  if (catalogVersion !== resource.version) {
    return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.CATALOG_VERSION_MISMATCH }
  }
  const rawAsset = rawRecord.asset && typeof rawRecord.asset === 'object'
    ? rawRecord.asset
    : rawRecord
  if (typeof rawAsset.content !== 'string') {
    return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.INVALID_CATALOG_ASSET }
  }
  const asset = normalizeBookTextAsset({
    ...clone(rawAsset),
    id: resource.ownerResourceId,
    source: {},
    status: 'draft',
    locked: false,
    favorite: false,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    contentFingerprint: undefined,
  })
  const installedFingerprint = computeManagedAssetFingerprint(asset)
  asset.source = {
    kind: BOOK_WORLD_SUITE_SOURCE_KIND,
    resourceId: resource.id,
    catalogId: resource.catalogId,
    catalogVersion: resource.version,
    installedFingerprint,
  }
  return { ok: true, asset, installedFingerprint }
}

const mapMutationFailure = (result) => ({
  ok: false,
  code: normalizeId(result?.code) || BOOK_WORLD_SUITE_ERROR_CODES.OWNER_OPERATION_FAILED,
})

export const createBookWorldSuiteOwnerAdapter = ({
  bookStore,
  listWorldBookSourceLinks,
  resolveCatalogAsset,
} = {}) => {
  if (!bookStore || typeof bookStore.findAssetById !== 'function') {
    throw new TypeError('A Book Store with findAssetById is required.')
  }

  const inspect = ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    return buildEvidence({
      resource,
      asset: bookStore.findAssetById(resource.ownerResourceId),
      links: listLinks(listWorldBookSourceLinks),
    })
  }

  const requireManagedAsset = (resource) => {
    const asset = bookStore.findAssetById(resource.ownerResourceId)
    if (!asset || !resolveManagedProvenance(asset, resource).managed) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.IDENTITY_COLLISION }
    }
    return { ok: true, asset }
  }

  const mutate = async (payload) => {
    if (typeof bookStore.commitManagedAssetMutation !== 'function') {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.OWNER_MUTATION_UNAVAILABLE }
    }
    const result = await bookStore.commitManagedAssetMutation(payload)
    return result?.ok === true ? { ok: true } : mapMutationFailure(result)
  }

  const install = async ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    if (bookStore.storageReadOnly) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.READ_ONLY_CONFLICT }
    }
    if (bookStore.findAssetById(resource.ownerResourceId)) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.IDENTITY_COLLISION }
    }
    if (
      Number.isFinite(Number(bookStore.assetLimit)) &&
      Number(bookStore.assetCount) >= Number(bookStore.assetLimit)
    ) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.CAPACITY_REACHED }
    }
    const catalog = await resolveCatalogRecord({ resource, resolveCatalogAsset })
    if (!catalog.ok) return catalog
    return mutate({
      operation: 'create',
      assetId: resource.ownerResourceId,
      asset: catalog.asset,
    })
  }

  const update = async ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    if (bookStore.storageReadOnly) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.READ_ONLY_CONFLICT }
    }
    const managed = requireManagedAsset(resource)
    if (!managed.ok) return managed
    const evidence = buildEvidence({
      resource,
      asset: managed.asset,
      links: listLinks(listWorldBookSourceLinks),
    })
    if (evidence.userModified) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.USER_MODIFIED }
    }
    if (evidence.inUse) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.RESOURCE_IN_USE }
    }
    const catalog = await resolveCatalogRecord({ resource, resolveCatalogAsset })
    if (!catalog.ok) return catalog
    return mutate({
      operation: 'update',
      assetId: resource.ownerResourceId,
      patch: {
        title: catalog.asset.title,
        category: catalog.asset.category,
        assetType: catalog.asset.assetType,
        format: catalog.asset.format,
        categoryId: catalog.asset.categoryId,
        tags: catalog.asset.tags,
        content: catalog.asset.content,
        sections: catalog.asset.sections,
        source: catalog.asset.source,
      },
    })
  }

  const remove = async ({ resource } = {}) => {
    if (!validateResource(resource)) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.INVALID_RESOURCE }
    }
    if (bookStore.storageReadOnly) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.READ_ONLY_CONFLICT }
    }
    const managed = requireManagedAsset(resource)
    if (!managed.ok) return managed
    const evidence = buildEvidence({
      resource,
      asset: managed.asset,
      links: listLinks(listWorldBookSourceLinks),
    })
    if (evidence.userModified) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.USER_MODIFIED }
    }
    if (evidence.inUse) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.RESOURCE_IN_USE }
    }
    if (evidence.historicalReferenceCount > 0) {
      return { ok: false, code: BOOK_WORLD_SUITE_ERROR_CODES.HISTORICAL_REFERENCES }
    }
    return mutate({ operation: 'delete', assetId: resource.ownerResourceId })
  }

  return { owner: 'book', inspect, install, update, remove }
}
