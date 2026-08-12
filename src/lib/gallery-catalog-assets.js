export const GALLERY_ASSET_CATEGORIES = Object.freeze([
  'wallpaper',
  'emoji',
  'reference',
  'scenario',
])

export const GALLERY_CATALOG_ASSET_PACK_LIMIT = 120
export const GALLERY_CATALOG_PACK_PROVENANCE_KIND = 'gallery_catalog_asset_pack'
export const GALLERY_CATALOG_ASSET_PROVENANCE_KIND = 'gallery_catalog_asset'

const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,179}$/i
const FINGERPRINT_PATTERN = /^gallery_pack_fp_[a-z0-9]+_[0-9]+$/
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])

const normalizeText = (value, fallback = '', max = 240) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
  return normalized || fallback
}

const normalizeId = (value) => {
  const normalized = normalizeText(value, '', 180)
  return ID_PATTERN.test(normalized) ? normalized : ''
}

const normalizeVersion = (value) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.floor(numeric))
}

const normalizeCategory = (value, fallback = 'reference') => {
  const normalized = normalizeText(value, '', 40).toLowerCase()
  return GALLERY_ASSET_CATEGORIES.includes(normalized) ? normalized : fallback
}

const normalizeFolderCategory = (value, fallback = 'all') => {
  const normalized = normalizeText(value, '', 40).toLowerCase()
  if (normalized === 'all') return 'all'
  return normalizeCategory(normalized, fallback)
}

const catalogCategoryInputIsValid = (value, { allowAll = false } = {}) => {
  if (value == null || value === '') return true
  const normalized = normalizeText(value, '', 40).toLowerCase()
  return (allowAll && normalized === 'all') || GALLERY_ASSET_CATEGORIES.includes(normalized)
}

const normalizeHttpUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const parsed = new URL(value.trim())
    return ['http:', 'https:'].includes(parsed.protocol.toLowerCase()) ? parsed.href : ''
  } catch {
    return ''
  }
}

const readExtension = (value = '') => {
  const normalized = typeof value === 'string' ? value.trim().split(/[?#]/)[0] : ''
  const dotIndex = normalized.lastIndexOf('.')
  return dotIndex >= 0 ? normalized.slice(dotIndex + 1).toLowerCase() : ''
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

const computeTextFingerprint = (value = '') => {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `gallery_pack_fp_${(hash >>> 0).toString(36)}_${text.length}`
}

const normalizeProvenance = (raw, expectedKind) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const kind = normalizeText(raw.kind, '', 60)
  const resourceId = normalizeId(raw.resourceId)
  const catalogId = normalizeId(raw.catalogId)
  const catalogVersion = normalizeVersion(raw.catalogVersion)
  const folderId = normalizeId(raw.folderId || raw.ownerResourceId)
  const installedFingerprint = normalizeText(raw.installedFingerprint, '', 120)
  if (
    kind !== expectedKind ||
    !resourceId ||
    !catalogId ||
    catalogVersion < 1 ||
    !folderId ||
    !FINGERPRINT_PATTERN.test(installedFingerprint)
  ) {
    return null
  }
  return {
    kind,
    resourceId,
    catalogId,
    catalogVersion,
    folderId,
    installedFingerprint,
  }
}

export const normalizeGalleryCatalogPackProvenance = (raw) =>
  normalizeProvenance(raw, GALLERY_CATALOG_PACK_PROVENANCE_KIND)

export const normalizeGalleryCatalogAssetProvenance = (raw) =>
  normalizeProvenance(raw, GALLERY_CATALOG_ASSET_PROVENANCE_KIND)

const normalizeCatalogAssetInput = (rawAsset) => {
  if (!rawAsset || typeof rawAsset !== 'object' || Array.isArray(rawAsset)) return null
  if (rawAsset.sourceType && rawAsset.sourceType !== 'url') return null
  if (!catalogCategoryInputIsValid(rawAsset.category)) return null
  const id = normalizeId(rawAsset.id)
  const sourceUrl = normalizeHttpUrl(rawAsset.sourceUrl || rawAsset.url)
  if (!id || !sourceUrl) return null
  const explicitExtension = normalizeText(rawAsset.extension, '', 20).toLowerCase()
  const extension = explicitExtension || readExtension(sourceUrl)
  const mimeType = normalizeText(rawAsset.mimeType, '', 100).toLowerCase()
  if (
    !ALLOWED_IMAGE_EXTENSIONS.has(extension) &&
    !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)
  ) {
    return null
  }
  return {
    id,
    name: normalizeText(rawAsset.name, id, 80),
    category: normalizeCategory(rawAsset.category),
    sourceType: 'url',
    sourceUrl,
    blobId: '',
    mimeType: ALLOWED_IMAGE_MIME_TYPES.has(mimeType) ? mimeType : '',
    extension: ALLOWED_IMAGE_EXTENSIONS.has(extension) ? extension : '',
    sizeBytes: 0,
    fingerprint: `url:${sourceUrl.toLowerCase()}`,
  }
}

const buildFingerprintContent = ({ folder, assets = [] } = {}) => {
  const assetById = new Map(
    (Array.isArray(assets) ? assets : [])
      .filter((asset) => asset && typeof asset === 'object')
      .map((asset) => [normalizeId(asset.id), asset]),
  )
  const assetIds = Array.isArray(folder?.assetIds)
    ? folder.assetIds.map(normalizeId).filter(Boolean)
    : []
  return canonicalize({
    folder: {
      id: normalizeId(folder?.id),
      name: normalizeText(folder?.name, '', 64),
      category: normalizeFolderCategory(folder?.category),
      assetIds,
    },
    assets: assetIds.map((assetId) => {
      const asset = assetById.get(assetId)
      if (!asset) return { id: assetId, missing: true }
      return {
        id: assetId,
        name: normalizeText(asset.name, '', 80),
        category: normalizeCategory(asset.category),
        sourceType: asset.sourceType === 'url' ? 'url' : 'invalid',
        sourceUrl: normalizeHttpUrl(asset.sourceUrl),
        mimeType: normalizeText(asset.mimeType, '', 100).toLowerCase(),
        extension: normalizeText(asset.extension, '', 20).toLowerCase(),
        sizeBytes: Math.max(0, Math.floor(Number(asset.sizeBytes) || 0)),
        fingerprint: normalizeText(asset.fingerprint, '', 500),
      }
    }),
  })
}

export const computeManagedGalleryAssetPackFingerprint = (pack = {}) =>
  computeTextFingerprint(JSON.stringify(buildFingerprintContent(pack)))

const provenanceMatches = (provenance, expected, kind) => {
  const normalized = kind === GALLERY_CATALOG_PACK_PROVENANCE_KIND
    ? normalizeGalleryCatalogPackProvenance(provenance)
    : normalizeGalleryCatalogAssetProvenance(provenance)
  return Boolean(
    normalized &&
    normalized.resourceId === expected.resourceId &&
    normalized.catalogId === expected.catalogId &&
    normalized.catalogVersion === expected.catalogVersion &&
    normalized.folderId === expected.folderId &&
    normalized.installedFingerprint === expected.installedFingerprint
  )
}

export const buildCatalogManagedGalleryAssetPack = ({ resource, rawAssetPack, now = Date.now() } = {}) => {
  const resourceId = normalizeId(resource?.id)
  const catalogId = normalizeId(resource?.catalogId)
  const folderId = normalizeId(resource?.ownerResourceId)
  const catalogVersion = normalizeVersion(resource?.version)
  if (
    resource?.type !== 'gallery_asset_pack' ||
    resource?.owner !== 'gallery' ||
    !resourceId ||
    !catalogId ||
    !folderId ||
    catalogVersion < 1 ||
    !rawAssetPack ||
    typeof rawAssetPack !== 'object' ||
    Array.isArray(rawAssetPack)
  ) {
    return null
  }
  if (normalizeId(rawAssetPack.id) && normalizeId(rawAssetPack.id) !== folderId) return null
  if (!catalogCategoryInputIsValid(rawAssetPack.category, { allowAll: true })) return null
  const rawAssets = Array.isArray(rawAssetPack.assets) ? rawAssetPack.assets : []
  if (rawAssets.length === 0 || rawAssets.length > GALLERY_CATALOG_ASSET_PACK_LIMIT) return null
  const assets = rawAssets.map(normalizeCatalogAssetInput)
  if (assets.some((asset) => !asset)) return null
  const assetIds = assets.map((asset) => asset.id)
  const fingerprints = assets.map((asset) => asset.fingerprint)
  if (
    new Set(assetIds).size !== assetIds.length ||
    new Set(fingerprints).size !== fingerprints.length ||
    assetIds.includes(folderId)
  ) {
    return null
  }
  const timestamp = Math.max(0, Math.floor(Number(now) || Date.now()))
  const folder = {
    id: folderId,
    name: normalizeText(rawAssetPack.name || rawAssetPack.title, folderId, 64),
    category: normalizeFolderCategory(rawAssetPack.category),
    assetIds,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const normalizedAssets = assets.map((asset) => ({
    ...asset,
    createdAt: timestamp,
    updatedAt: timestamp,
  }))
  const installedFingerprint = computeManagedGalleryAssetPackFingerprint({
    folder,
    assets: normalizedAssets,
  })
  const commonProvenance = {
    resourceId,
    catalogId,
    catalogVersion,
    folderId,
    installedFingerprint,
  }
  return {
    folder: {
      ...folder,
      provenance: {
        kind: GALLERY_CATALOG_PACK_PROVENANCE_KIND,
        ...commonProvenance,
      },
    },
    assets: normalizedAssets.map((asset) => ({
      ...asset,
      provenance: {
        kind: GALLERY_CATALOG_ASSET_PROVENANCE_KIND,
        ...commonProvenance,
      },
    })),
  }
}

export const normalizeCatalogManagedGalleryAssetPack = (rawPack) => {
  if (!rawPack || typeof rawPack !== 'object' || Array.isArray(rawPack)) return null
  const folderSource = rawPack.folder
  const rawAssets = Array.isArray(rawPack.assets) ? rawPack.assets : []
  const folderProvenance = normalizeGalleryCatalogPackProvenance(folderSource?.provenance)
  if (
    !folderSource ||
    !folderProvenance ||
    rawAssets.length === 0 ||
    rawAssets.length > GALLERY_CATALOG_ASSET_PACK_LIMIT
  ) {
    return null
  }
  if (!catalogCategoryInputIsValid(folderSource.category, { allowAll: true })) return null
  const folder = {
    id: normalizeId(folderSource.id),
    name: normalizeText(folderSource.name, folderSource.id, 64),
    category: normalizeFolderCategory(folderSource.category),
    assetIds: Array.isArray(folderSource.assetIds)
      ? folderSource.assetIds.map(normalizeId).filter(Boolean)
      : [],
    createdAt: Math.max(0, Math.floor(Number(folderSource.createdAt) || Date.now())),
    updatedAt: Math.max(0, Math.floor(Number(folderSource.updatedAt) || Date.now())),
    provenance: folderProvenance,
  }
  if (
    !folder.id ||
    folder.id !== folderProvenance.folderId ||
    folder.assetIds.length !== rawAssets.length ||
    new Set(folder.assetIds).size !== folder.assetIds.length
  ) {
    return null
  }
  const assets = rawAssets.map((rawAsset) => {
    if (!catalogCategoryInputIsValid(rawAsset?.category)) return null
    const normalized = normalizeCatalogAssetInput(rawAsset)
    const provenance = normalizeGalleryCatalogAssetProvenance(rawAsset?.provenance)
    if (!normalized || !provenance) return null
    return {
      ...normalized,
      createdAt: Math.max(0, Math.floor(Number(rawAsset.createdAt) || Date.now())),
      updatedAt: Math.max(0, Math.floor(Number(rawAsset.updatedAt) || Date.now())),
      provenance,
    }
  })
  if (assets.some((asset) => !asset)) return null
  if (!folder.assetIds.every((assetId, index) => assets[index]?.id === assetId)) return null
  const expected = folderProvenance
  if (
    assets.some((asset) => !provenanceMatches(
      asset.provenance,
      expected,
      GALLERY_CATALOG_ASSET_PROVENANCE_KIND,
    )) ||
    computeManagedGalleryAssetPackFingerprint({ folder, assets }) !== expected.installedFingerprint
  ) {
    return null
  }
  return clone({ folder, assets })
}
