import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import {
  deleteGalleryAssetBlob,
  getGalleryAssetBlob,
  putGalleryAssetBlob,
} from '../lib/asset-binary-storage'
import { useSystemStore } from './system'

export const GALLERY_ASSET_CATEGORIES = Object.freeze(['wallpaper', 'emoji', 'reference', 'scenario'])

const GALLERY_STORAGE_KEY = 'store:gallery'
const GALLERY_STORAGE_VERSION = 1
const DEFAULT_CATEGORY = 'reference'
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
const BACKUP_ASSET_PACKAGE_VERSION = 1
const DEFAULT_BACKUP_ASSET_PACKAGE_MAX_BYTES = 20 * 1024 * 1024
const DEFAULT_BACKUP_ASSET_PACKAGE_MAX_ITEMS = 120

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeCategory = (value, fallback = DEFAULT_CATEGORY) => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return GALLERY_ASSET_CATEGORIES.includes(raw) ? raw : fallback
}

const normalizeAssetName = (value, fallback = 'Untitled Asset') => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return fallback
  return trimmed.slice(0, 80)
}

const readExtension = (value = '') => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const fromPath = trimmed.split('?')[0].split('#')[0]
  const dotIndex = fromPath.lastIndexOf('.')
  if (dotIndex < 0) return ''
  return fromPath.slice(dotIndex + 1).toLowerCase()
}

const normalizeHttpUrl = (value) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    const parsed = new URL(trimmed)
    const protocol = parsed.protocol.toLowerCase()
    if (protocol !== 'http:' && protocol !== 'https:') return ''
    return parsed.href
  } catch {
    return ''
  }
}

const createAssetId = () => `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const buildUrlFingerprint = (url) => `url:${url.toLowerCase()}`

const arrayBufferToHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const buildFileFingerprint = async (file) => {
  const fallback = `file:${(file?.name || '').toLowerCase()}:${file?.size || 0}:${file?.lastModified || 0}:${(file?.type || '').toLowerCase()}`
  if (!(file instanceof Blob)) return fallback

  try {
    if (typeof file.arrayBuffer !== 'function') return fallback
    const buffer = await file.arrayBuffer()
    if (
      typeof crypto === 'undefined' ||
      !crypto?.subtle ||
      typeof crypto.subtle.digest !== 'function'
    ) {
      return fallback
    }
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    return `file:${arrayBufferToHex(digest)}`
  } catch {
    return fallback
  }
}

const fileLooksLikeSupportedImage = (file) => {
  if (!(file instanceof File)) return false
  const type = (file.type || '').toLowerCase()
  const ext = readExtension(file.name)
  const typeAllowed = ALLOWED_IMAGE_MIME_TYPES.has(type)
  const extAllowed = ALLOWED_IMAGE_EXTENSIONS.has(ext)
  return typeAllowed || extAllowed
}

const normalizeAssetRecord = (rawAsset, index = 0) => {
  if (!rawAsset || typeof rawAsset !== 'object') return null

  const sourceType = rawAsset.sourceType === 'file' ? 'file' : 'url'
  const sourceUrl = sourceType === 'url' ? normalizeHttpUrl(rawAsset.sourceUrl) : ''
  if (sourceType === 'url' && !sourceUrl) return null

  const id =
    typeof rawAsset.id === 'string' && rawAsset.id.trim()
      ? rawAsset.id.trim()
      : `asset_legacy_${Date.now()}_${index}`

  const normalized = {
    id,
    name: normalizeAssetName(rawAsset.name),
    category: normalizeCategory(rawAsset.category),
    sourceType,
    sourceUrl,
    blobId:
      sourceType === 'file'
        ? (typeof rawAsset.blobId === 'string' && rawAsset.blobId.trim() ? rawAsset.blobId.trim() : id)
        : '',
    mimeType:
      typeof rawAsset.mimeType === 'string' && rawAsset.mimeType.trim()
        ? rawAsset.mimeType.trim().toLowerCase()
        : '',
    extension:
      typeof rawAsset.extension === 'string' && rawAsset.extension.trim()
        ? rawAsset.extension.trim().toLowerCase()
        : sourceType === 'url'
          ? readExtension(sourceUrl)
          : '',
    sizeBytes: Math.max(0, toInt(rawAsset.sizeBytes, 0)),
    fingerprint:
      typeof rawAsset.fingerprint === 'string' && rawAsset.fingerprint.trim()
        ? rawAsset.fingerprint.trim()
        : sourceType === 'url'
          ? buildUrlFingerprint(sourceUrl)
          : `file:${id}`,
    createdAt: Math.max(0, toInt(rawAsset.createdAt, Date.now())),
    updatedAt: Math.max(0, toInt(rawAsset.updatedAt, Date.now())),
  }
  return normalized
}

const cloneAsset = (asset) => ({
  id: asset.id,
  name: asset.name,
  category: asset.category,
  sourceType: asset.sourceType,
  sourceUrl: asset.sourceUrl,
  blobId: asset.blobId,
  mimeType: asset.mimeType,
  extension: asset.extension,
  sizeBytes: asset.sizeBytes,
  fingerprint: asset.fingerprint,
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt,
})

const clampPositiveInteger = (value, fallback, minimum = 1) => {
  const normalizedFallback = Math.max(minimum, toInt(fallback, minimum))
  const normalized = toInt(value, normalizedFallback)
  if (!Number.isFinite(normalized)) return normalizedFallback
  return Math.max(minimum, normalized)
}

const blobToDataUrl = async (blob) => {
  if (!(blob instanceof Blob)) return ''
  return new Promise((resolve) => {
    try {
      const reader = new FileReader()
      reader.onload = () => {
        resolve(typeof reader.result === 'string' ? reader.result : '')
      }
      reader.onerror = () => resolve('')
      reader.onabort = () => resolve('')
      reader.readAsDataURL(blob)
    } catch {
      resolve('')
    }
  })
}

const decodeBase64 = (rawValue) => {
  const value = typeof rawValue === 'string' ? rawValue.trim() : ''
  if (!value) return null
  if (typeof atob === 'function') {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return bytes
  }
  const runtimeBuffer =
    typeof globalThis !== 'undefined' && globalThis && globalThis.Buffer
      ? globalThis.Buffer
      : null
  if (runtimeBuffer) {
    return Uint8Array.from(runtimeBuffer.from(value, 'base64'))
  }
  return null
}

const dataUrlToBlob = (dataUrl, fallbackMimeType = '') => {
  if (typeof dataUrl !== 'string' || !dataUrl.trim()) return null
  const matched = dataUrl.trim().match(/^data:([^;,]+)?;base64,(.+)$/i)
  if (!matched) return null
  const mimeType = matched[1] ? matched[1].trim().toLowerCase() : fallbackMimeType
  const base64Payload = matched[2] || ''
  try {
    const decoded = decodeBase64(base64Payload)
    if (!(decoded instanceof Uint8Array)) return null
    return new Blob([decoded], { type: mimeType || 'application/octet-stream' })
  } catch {
    return null
  }
}

const normalizeAssetPackageItem = (rawItem) => {
  if (!rawItem || typeof rawItem !== 'object') return null
  const id = typeof rawItem.id === 'string' ? rawItem.id.trim() : ''
  if (!id) return null
  const blobId =
    typeof rawItem.blobId === 'string' && rawItem.blobId.trim() ? rawItem.blobId.trim() : id
  const dataUrl = typeof rawItem.dataUrl === 'string' ? rawItem.dataUrl.trim() : ''
  if (!dataUrl) return null
  return {
    id,
    blobId,
    dataUrl,
    mimeType:
      typeof rawItem.mimeType === 'string' && rawItem.mimeType.trim()
        ? rawItem.mimeType.trim().toLowerCase()
        : '',
    sizeBytes: Math.max(0, toInt(rawItem.sizeBytes, 0)),
  }
}

const normalizeAssetPackageSnapshot = (rawPackage) => {
  const source = rawPackage && typeof rawPackage === 'object' ? rawPackage : {}
  const sourceItems = Array.isArray(source.items) ? source.items : []
  return {
    version: Math.max(1, toInt(source.version, BACKUP_ASSET_PACKAGE_VERSION)),
    exportedAt: Math.max(0, toInt(source.exportedAt, 0)),
    items: sourceItems.map((item) => normalizeAssetPackageItem(item)).filter(Boolean),
  }
}

const normalizeUsageItem = (rawUsage, fallbackKey) => {
  const usage = rawUsage && typeof rawUsage === 'object' ? rawUsage : {}
  const moduleKey =
    typeof usage.moduleKey === 'string' && usage.moduleKey.trim()
      ? usage.moduleKey.trim()
      : 'module'
  const targetKey =
    typeof usage.targetKey === 'string' && usage.targetKey.trim()
      ? usage.targetKey.trim()
      : fallbackKey
  const id = `${moduleKey}:${targetKey}`

  return {
    id,
    moduleKey,
    targetKey,
    label:
      typeof usage.label === 'string' && usage.label.trim()
        ? usage.label.trim()
        : `${moduleKey} · ${targetKey}`,
  }
}

export const useGalleryStore = defineStore('gallery', () => {
  const systemStore = useSystemStore()
  const assets = ref([])
  const usageRegistry = reactive({})
  const hasFinishedStorageHydration = ref(false)
  const previewObjectUrlCache = new Map()

  const categoryCounts = computed(() => {
    const counts = {
      all: assets.value.length,
      wallpaper: 0,
      emoji: 0,
      reference: 0,
      scenario: 0,
    }
    assets.value.forEach((asset) => {
      if (counts[asset.category] != null) {
        counts[asset.category] += 1
      }
    })
    return counts
  })

  const sortedAssets = computed(() =>
    [...assets.value].sort((left, right) => {
      if (right.updatedAt !== left.updatedAt) return right.updatedAt - left.updatedAt
      return right.createdAt - left.createdAt
    }),
  )

  const getAssetsByCategory = (category = 'all') => {
    const normalizedCategory = category === 'all' ? 'all' : normalizeCategory(category)
    if (normalizedCategory === 'all') return sortedAssets.value
    return sortedAssets.value.filter((asset) => asset.category === normalizedCategory)
  }

  const findAssetById = (assetId) => {
    if (typeof assetId !== 'string' || !assetId.trim()) return null
    const normalizedId = assetId.trim()
    return assets.value.find((item) => item.id === normalizedId) || null
  }

  const findAssetByFingerprint = (fingerprint) => {
    if (typeof fingerprint !== 'string' || !fingerprint.trim()) return null
    const normalized = fingerprint.trim()
    return assets.value.find((item) => item.fingerprint === normalized) || null
  }

  const revokeAssetPreviewUrl = (assetId) => {
    if (typeof assetId !== 'string' || !assetId.trim()) return false
    const normalizedId = assetId.trim()
    const cachedUrl = previewObjectUrlCache.get(normalizedId)
    if (!cachedUrl) return false
    previewObjectUrlCache.delete(normalizedId)
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(cachedUrl)
    }
    return true
  }

  const clearAssetPreviewCache = () => {
    Array.from(previewObjectUrlCache.keys()).forEach((assetId) => {
      revokeAssetPreviewUrl(assetId)
    })
  }

  const getAssetPreviewUrl = async (assetId) => {
    const asset = findAssetById(assetId)
    if (!asset) return ''
    if (asset.sourceType === 'url') return asset.sourceUrl

    const normalizedId = asset.id
    const cachedUrl = previewObjectUrlCache.get(normalizedId)
    if (cachedUrl) return cachedUrl

    const blob = await getGalleryAssetBlob(asset.blobId || asset.id)
    if (!(blob instanceof Blob)) return ''
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return ''

    const objectUrl = URL.createObjectURL(blob)
    previewObjectUrlCache.set(normalizedId, objectUrl)
    return objectUrl
  }

  const importAssetFromUrl = ({ url, name = '', category = DEFAULT_CATEGORY } = {}) => {
    const normalizedUrl = normalizeHttpUrl(url)
    if (!normalizedUrl) {
      return {
        ok: false,
        reason: 'invalid_url',
      }
    }

    const fingerprint = buildUrlFingerprint(normalizedUrl)
    const duplicated = findAssetByFingerprint(fingerprint)
    if (duplicated) {
      return {
        ok: false,
        reason: 'duplicate',
        duplicatedAssetId: duplicated.id,
      }
    }

    const extension = readExtension(normalizedUrl)
    const fallbackName = extension ? `URL Asset (${extension.toUpperCase()})` : 'URL Asset'
    const now = Date.now()

    const asset = {
      id: createAssetId(),
      name: normalizeAssetName(name, fallbackName),
      category: normalizeCategory(category),
      sourceType: 'url',
      sourceUrl: normalizedUrl,
      blobId: '',
      mimeType: '',
      extension,
      sizeBytes: 0,
      fingerprint,
      createdAt: now,
      updatedAt: now,
    }
    assets.value = [asset, ...assets.value]
    return {
      ok: true,
      assetId: asset.id,
    }
  }

  const importAssetsFromFiles = async (files, { category = DEFAULT_CATEGORY } = {}) => {
    const normalizedCategory = normalizeCategory(category)
    const list = Array.from(files || []).filter((item) => item instanceof File)
    if (list.length === 0) {
      return {
        ok: false,
        reason: 'empty',
        importedCount: 0,
        skippedUnsupportedCount: 0,
        skippedDuplicateCount: 0,
        duplicateAssetIds: [],
      }
    }

    const importedIds = []
    const importedAssets = []
    const duplicateAssetIds = []
    let skippedUnsupportedCount = 0
    let skippedDuplicateCount = 0
    let failedStorageCount = 0

    for (const file of list) {
      if (!fileLooksLikeSupportedImage(file)) {
        skippedUnsupportedCount += 1
        continue
      }

      const fingerprint = await buildFileFingerprint(file)
      const duplicated = findAssetByFingerprint(fingerprint)
      if (duplicated) {
        skippedDuplicateCount += 1
        duplicateAssetIds.push(duplicated.id)
        continue
      }

      const assetId = createAssetId()
      const storageOk = await putGalleryAssetBlob(assetId, file)
      if (!storageOk) {
        failedStorageCount += 1
        continue
      }

      const now = Date.now()
      const extension = readExtension(file.name)
      const asset = {
        id: assetId,
        name: normalizeAssetName(file.name, 'Local Asset'),
        category: normalizedCategory,
        sourceType: 'file',
        sourceUrl: '',
        blobId: assetId,
        mimeType: (file.type || '').toLowerCase(),
        extension,
        sizeBytes: Math.max(0, toInt(file.size, 0)),
        fingerprint,
        createdAt: now,
        updatedAt: now,
      }

      importedAssets.push(asset)
      importedIds.push(assetId)
    }

    if (importedAssets.length > 0) {
      assets.value = [...importedAssets, ...assets.value]
    }

    return {
      ok: importedAssets.length > 0,
      reason: importedAssets.length > 0 ? '' : 'no_valid_file',
      importedCount: importedAssets.length,
      importedIds,
      skippedUnsupportedCount,
      skippedDuplicateCount,
      duplicateAssetIds,
      failedStorageCount,
    }
  }

  const renameAsset = (assetId, nextName) => {
    const asset = findAssetById(assetId)
    if (!asset) return false
    asset.name = normalizeAssetName(nextName, asset.name)
    asset.updatedAt = Date.now()
    return true
  }

  const moveAssetToCategory = (assetId, category) => {
    const asset = findAssetById(assetId)
    if (!asset) return false
    const normalizedCategory = normalizeCategory(category, asset.category)
    if (asset.category === normalizedCategory) return true
    asset.category = normalizedCategory
    asset.updatedAt = Date.now()
    return true
  }

  const bindAssetUsage = (assetId, usage = {}) => {
    const asset = findAssetById(assetId)
    if (!asset) return false
    const normalized = normalizeUsageItem(usage, assetId)
    if (!usageRegistry[assetId]) {
      usageRegistry[assetId] = []
    }
    if (usageRegistry[assetId].some((item) => item.id === normalized.id)) return true
    usageRegistry[assetId].push(normalized)
    return true
  }

  const unbindAssetUsage = (assetId, usageId = '') => {
    if (typeof assetId !== 'string' || !assetId.trim()) return false
    const normalizedAssetId = assetId.trim()
    if (!usageRegistry[normalizedAssetId]) return false

    if (typeof usageId === 'string' && usageId.trim()) {
      const before = usageRegistry[normalizedAssetId].length
      usageRegistry[normalizedAssetId] = usageRegistry[normalizedAssetId].filter(
        (item) => item.id !== usageId.trim(),
      )
      if (usageRegistry[normalizedAssetId].length === 0) {
        delete usageRegistry[normalizedAssetId]
      }
      return usageRegistry[normalizedAssetId]?.length !== before
    }

    delete usageRegistry[normalizedAssetId]
    return true
  }

  const getAssetUsageList = (assetId) => {
    const asset = findAssetById(assetId)
    if (!asset) return []

    const runtimeUsages = Array.isArray(usageRegistry[asset.id]) ? [...usageRegistry[asset.id]] : []
    const wallpaper = typeof systemStore.settings?.appearance?.wallpaper === 'string'
      ? systemStore.settings.appearance.wallpaper.trim()
      : ''

    if (asset.sourceType === 'url' && asset.sourceUrl && wallpaper && wallpaper === asset.sourceUrl) {
      runtimeUsages.push({
        id: 'system:appearance.wallpaper',
        moduleKey: 'system',
        targetKey: 'appearance.wallpaper',
        label: 'System wallpaper',
      })
    }

    return runtimeUsages
  }

  const getAssetDeletionGuard = (assetId) => {
    const asset = findAssetById(assetId)
    if (!asset) {
      return {
        ok: false,
        reason: 'not_found',
        blocked: false,
        usages: [],
      }
    }

    const usages = getAssetUsageList(assetId)
    return {
      ok: true,
      reason: usages.length > 0 ? 'in_use' : '',
      blocked: usages.length > 0,
      usages,
    }
  }

  const removeAsset = async (assetId, { force = false } = {}) => {
    const guard = getAssetDeletionGuard(assetId)
    if (!guard.ok) {
      return {
        ok: false,
        reason: 'not_found',
      }
    }
    if (guard.blocked && !force) {
      return {
        ok: false,
        reason: 'in_use',
        usages: guard.usages,
      }
    }

    const normalizedId = assetId.trim()
    const target = findAssetById(normalizedId)
    if (!target) {
      return {
        ok: false,
        reason: 'not_found',
      }
    }

    assets.value = assets.value.filter((item) => item.id !== normalizedId)
    revokeAssetPreviewUrl(normalizedId)
    delete usageRegistry[normalizedId]
    if (target.sourceType === 'file') {
      await deleteGalleryAssetBlob(target.blobId || target.id)
    }

    return {
      ok: true,
      removedAssetId: normalizedId,
    }
  }

  const hydrateFromSnapshot = (snapshot = {}) => {
    if (!snapshot || typeof snapshot !== 'object') return false
    const sourceAssets = Array.isArray(snapshot.assets) ? snapshot.assets : []
    const nextAssets = sourceAssets
      .map((asset, index) => normalizeAssetRecord(asset, index))
      .filter(Boolean)

    clearAssetPreviewCache()
    assets.value = nextAssets
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(GALLERY_STORAGE_KEY, {
      version: GALLERY_STORAGE_VERSION,
    })
    if (!persisted || typeof persisted !== 'object') return false
    return hydrateFromSnapshot(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(GALLERY_STORAGE_KEY, {
      version: GALLERY_STORAGE_VERSION,
    })
    if (!persisted || typeof persisted !== 'object') return false
    return hydrateFromSnapshot(persisted)
  }

  const persistToStorage = () => {
    writePersistedState(
      GALLERY_STORAGE_KEY,
      {
        assets: assets.value.map((asset) => cloneAsset(asset)),
      },
      { version: GALLERY_STORAGE_VERSION },
    )
  }

  const saveNow = () => {
    persistToStorage()
  }

  const createBackupSnapshot = () => ({
    assets: assets.value.map((asset) => cloneAsset(asset)),
  })

  const createBackupSnapshotAsync = async ({
    includeAssetPackage = false,
    maxPackageBytes = DEFAULT_BACKUP_ASSET_PACKAGE_MAX_BYTES,
    maxPackageItems = DEFAULT_BACKUP_ASSET_PACKAGE_MAX_ITEMS,
  } = {}) => {
    const snapshot = createBackupSnapshot()
    const requested = includeAssetPackage === true
    const normalizedMaxBytes = clampPositiveInteger(
      maxPackageBytes,
      DEFAULT_BACKUP_ASSET_PACKAGE_MAX_BYTES,
    )
    const normalizedMaxItems = clampPositiveInteger(
      maxPackageItems,
      DEFAULT_BACKUP_ASSET_PACKAGE_MAX_ITEMS,
    )
    const packageSummary = {
      requested,
      included: false,
      itemCount: 0,
      totalBytes: 0,
      skippedCount: 0,
      missingCount: 0,
      overflow: false,
      maxPackageBytes: normalizedMaxBytes,
      maxPackageItems: normalizedMaxItems,
    }

    if (!requested) {
      return {
        ...snapshot,
        assetPackage: null,
        packageSummary,
      }
    }

    const fileAssets = snapshot.assets.filter((asset) => asset.sourceType === 'file')
    const packageItems = []
    let totalBytes = 0
    let skippedCount = 0
    let missingCount = 0
    let overflow = false

    for (const asset of fileAssets) {
      if (packageItems.length >= normalizedMaxItems) {
        skippedCount += 1
        overflow = true
        continue
      }

      const blob = await getGalleryAssetBlob(asset.blobId || asset.id)
      if (!(blob instanceof Blob)) {
        missingCount += 1
        continue
      }
      const blobSize = Math.max(0, toInt(blob.size, 0))
      if (totalBytes + blobSize > normalizedMaxBytes) {
        skippedCount += 1
        overflow = true
        continue
      }

      const dataUrl = await blobToDataUrl(blob)
      if (!dataUrl) {
        missingCount += 1
        continue
      }

      packageItems.push({
        id: asset.id,
        blobId: asset.blobId || asset.id,
        dataUrl,
        mimeType: asset.mimeType || (typeof blob.type === 'string' ? blob.type.toLowerCase() : ''),
        sizeBytes: blobSize,
      })
      totalBytes += blobSize
    }

    packageSummary.included = true
    packageSummary.itemCount = packageItems.length
    packageSummary.totalBytes = totalBytes
    packageSummary.skippedCount = skippedCount
    packageSummary.missingCount = missingCount
    packageSummary.overflow = overflow

    return {
      ...snapshot,
      assetPackage: {
        version: BACKUP_ASSET_PACKAGE_VERSION,
        exportedAt: Date.now(),
        items: packageItems,
      },
      packageSummary,
    }
  }

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.gallery === 'object' && snapshot.gallery
        ? snapshot.gallery
        : snapshot
    return hydrateFromSnapshot(source)
  }

  const restoreFromBackupAsync = async (
    snapshot = {},
    { restoreAssetPackage = true } = {},
  ) => {
    const source =
      snapshot && typeof snapshot.gallery === 'object' && snapshot.gallery
        ? snapshot.gallery
        : snapshot
    const restoredMetadata = hydrateFromSnapshot(source)
    if (!restoredMetadata) {
      return {
        ok: false,
        reason: 'invalid_snapshot',
        packageApplied: false,
        packageItemCount: 0,
        restoredPackageCount: 0,
        failedPackageCount: 0,
        skippedPackageCount: 0,
      }
    }

    if (restoreAssetPackage !== true) {
      return {
        ok: true,
        reason: '',
        packageApplied: false,
        packageItemCount: 0,
        restoredPackageCount: 0,
        failedPackageCount: 0,
        skippedPackageCount: 0,
      }
    }

    const normalizedPackage = normalizeAssetPackageSnapshot(source?.assetPackage)
    if (!Array.isArray(normalizedPackage.items) || normalizedPackage.items.length === 0) {
      return {
        ok: true,
        reason: '',
        packageApplied: false,
        packageItemCount: 0,
        restoredPackageCount: 0,
        failedPackageCount: 0,
        skippedPackageCount: 0,
      }
    }

    const fileAssetIds = new Set(
      assets.value
        .filter((asset) => asset.sourceType === 'file')
        .map((asset) => asset.id),
    )
    let restoredPackageCount = 0
    let failedPackageCount = 0
    let skippedPackageCount = 0

    for (const item of normalizedPackage.items) {
      if (!fileAssetIds.has(item.id)) {
        skippedPackageCount += 1
        continue
      }

      const target = findAssetById(item.id)
      if (!target || target.sourceType !== 'file') {
        skippedPackageCount += 1
        continue
      }

      const blob = dataUrlToBlob(item.dataUrl, item.mimeType || target.mimeType)
      if (!(blob instanceof Blob)) {
        failedPackageCount += 1
        continue
      }

      const writeOk = await putGalleryAssetBlob(target.blobId || target.id, blob)
      if (writeOk) {
        restoredPackageCount += 1
      } else {
        failedPackageCount += 1
      }
    }

    return {
      ok: true,
      reason: failedPackageCount > 0 ? 'package_partial_failed' : '',
      packageApplied: true,
      packageItemCount: normalizedPackage.items.length,
      restoredPackageCount,
      failedPackageCount,
      skippedPackageCount,
    }
  }

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    assets,
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    assets,
    categoryCounts,
    sortedAssets,
    getAssetsByCategory,
    findAssetById,
    getAssetPreviewUrl,
    revokeAssetPreviewUrl,
    clearAssetPreviewCache,
    importAssetFromUrl,
    importAssetsFromFiles,
    renameAsset,
    moveAssetToCategory,
    bindAssetUsage,
    unbindAssetUsage,
    getAssetUsageList,
    getAssetDeletionGuard,
    removeAsset,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    restoreFromBackupAsync,
    saveNow,
  }
})
