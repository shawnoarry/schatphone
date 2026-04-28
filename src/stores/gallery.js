import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import {
  deleteGalleryAssetBlob,
  getGalleryAssetBlob,
  putGalleryAssetBlob,
} from '../lib/asset-binary-storage'
import {
  MEDIA_KIND,
  MEDIA_SIZE_SCENE,
  summarizeMediaLimitPolicy,
  validateMediaFileBySize,
} from '../lib/media-policy'
import { useMapStore } from './map'
import { useSystemStore } from './system'

export const GALLERY_ASSET_CATEGORIES = Object.freeze(['wallpaper', 'emoji', 'reference', 'scenario'])

const GALLERY_STORAGE_KEY = 'store:gallery'
const GALLERY_STORAGE_VERSION = 1
const DEFAULT_CATEGORY = 'reference'
const DEFAULT_FOLDER_CATEGORY = 'all'
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const ALLOWED_IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
const BACKUP_ASSET_PACKAGE_VERSION = 1
const DEFAULT_BACKUP_ASSET_PACKAGE_MAX_BYTES = 20 * 1024 * 1024
const DEFAULT_BACKUP_ASSET_PACKAGE_MAX_ITEMS = 120
const DEFAULT_AI_REFERENCE_MAX_BYTES = 1_500_000
const MAX_FOLDER_ASSET_IDS = 500

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeCategory = (value, fallback = DEFAULT_CATEGORY) => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return GALLERY_ASSET_CATEGORIES.includes(raw) ? raw : fallback
}

const normalizeFolderCategory = (value, fallback = DEFAULT_FOLDER_CATEGORY) => {
  if (typeof value === 'string' && value.trim().toLowerCase() === 'all') return 'all'
  if (fallback === 'all') return normalizeCategory(value, 'all')
  return normalizeCategory(value, normalizeCategory(fallback))
}

const normalizeAssetName = (value, fallback = 'Untitled Asset') => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return fallback
  return trimmed.slice(0, 80)
}

const normalizeFolderName = (value, fallback = 'Untitled Folder') => {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return fallback
  return trimmed.slice(0, 64)
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
const createFolderId = () => `folder_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const buildUrlFingerprint = (url) => `url:${url.toLowerCase()}`

const normalizeAssetIdList = (rawIds, { existingAssetIds } = {}) => {
  if (!Array.isArray(rawIds)) return []
  const existingSet = existingAssetIds instanceof Set ? existingAssetIds : null
  const unique = []
  rawIds.forEach((rawId) => {
    const id = typeof rawId === 'string' ? rawId.trim() : ''
    if (!id || unique.includes(id)) return
    if (existingSet && !existingSet.has(id)) return
    unique.push(id)
  })
  return unique.slice(0, MAX_FOLDER_ASSET_IDS)
}

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

const normalizeFolderRecord = (rawFolder, index = 0, { existingAssetIds } = {}) => {
  if (!rawFolder || typeof rawFolder !== 'object') return null
  const id =
    typeof rawFolder.id === 'string' && rawFolder.id.trim()
      ? rawFolder.id.trim()
      : `folder_legacy_${Date.now()}_${index}`
  return {
    id,
    name: normalizeFolderName(rawFolder.name),
    category: normalizeFolderCategory(rawFolder.category, 'all'),
    assetIds: normalizeAssetIdList(rawFolder.assetIds, { existingAssetIds }),
    createdAt: Math.max(0, toInt(rawFolder.createdAt, Date.now())),
    updatedAt: Math.max(0, toInt(rawFolder.updatedAt, Date.now())),
  }
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

const cloneFolder = (folder) => ({
  id: folder.id,
  name: folder.name,
  category: folder.category,
  assetIds: [...folder.assetIds],
  createdAt: folder.createdAt,
  updatedAt: folder.updatedAt,
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
  const mapStore = useMapStore()
  const assets = ref([])
  const folders = ref([])
  const usageRegistry = reactive({})
  const hasFinishedStorageHydration = ref(false)
  const previewObjectUrlCache = new Map()
  const previewScopeAssetIds = new Map()
  const previewAssetScopes = new Map()

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

  const sortedFolders = computed(() =>
    [...folders.value].sort((left, right) => {
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

  const findFolderById = (folderId) => {
    if (typeof folderId !== 'string' || !folderId.trim()) return null
    const normalizedId = folderId.trim()
    return folders.value.find((item) => item.id === normalizedId) || null
  }

  const listFolders = ({ category = 'all' } = {}) => {
    const normalizedCategory = normalizeFolderCategory(category, 'all')
    if (normalizedCategory === 'all') return sortedFolders.value
    return sortedFolders.value.filter((folder) => folder.category === normalizedCategory)
  }

  const createFolder = ({
    name = '',
    category = DEFAULT_FOLDER_CATEGORY,
    assetIds = [],
  } = {}) => {
    const now = Date.now()
    const existingAssetIds = new Set(assets.value.map((asset) => asset.id))
    const folder = {
      id: createFolderId(),
      name: normalizeFolderName(name, 'Untitled Folder'),
      category: normalizeFolderCategory(category, 'all'),
      assetIds: normalizeAssetIdList(assetIds, { existingAssetIds }),
      createdAt: now,
      updatedAt: now,
    }
    folders.value = [folder, ...folders.value]
    return folder
  }

  const renameFolder = (folderId, nextName) => {
    const folder = findFolderById(folderId)
    if (!folder) return false
    const normalizedName = normalizeFolderName(nextName, folder.name)
    if (folder.name === normalizedName) return true
    folder.name = normalizedName
    folder.updatedAt = Date.now()
    return true
  }

  const setFolderCategory = (folderId, category) => {
    const folder = findFolderById(folderId)
    if (!folder) return false
    const normalizedCategory = normalizeFolderCategory(category, folder.category)
    if (folder.category === normalizedCategory) return true
    folder.category = normalizedCategory
    folder.updatedAt = Date.now()
    return true
  }

  const setFolderAssetIds = (folderId, assetIds = []) => {
    const folder = findFolderById(folderId)
    if (!folder) return false
    const existingAssetIds = new Set(assets.value.map((asset) => asset.id))
    const normalizedIds = normalizeAssetIdList(assetIds, { existingAssetIds })
    const changed = JSON.stringify(folder.assetIds) !== JSON.stringify(normalizedIds)
    if (!changed) return true
    folder.assetIds = normalizedIds
    folder.updatedAt = Date.now()
    return true
  }

  const addAssetToFolder = (folderId, assetId) => {
    const folder = findFolderById(folderId)
    const asset = findAssetById(assetId)
    if (!folder || !asset) return false
    if (folder.assetIds.includes(asset.id)) return true
    folder.assetIds = [...folder.assetIds, asset.id].slice(0, MAX_FOLDER_ASSET_IDS)
    folder.updatedAt = Date.now()
    return true
  }

  const removeAssetFromFolder = (folderId, assetId) => {
    const folder = findFolderById(folderId)
    if (!folder) return false
    const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : ''
    if (!normalizedAssetId) return false
    const before = folder.assetIds.length
    folder.assetIds = folder.assetIds.filter((id) => id !== normalizedAssetId)
    if (folder.assetIds.length === before) return false
    folder.updatedAt = Date.now()
    return true
  }

  const removeFolder = (folderId) => {
    if (typeof folderId !== 'string' || !folderId.trim()) return false
    const normalizedFolderId = folderId.trim()
    const before = folders.value.length
    folders.value = folders.value.filter((folder) => folder.id !== normalizedFolderId)
    return folders.value.length !== before
  }

  const findAssetByFingerprint = (fingerprint) => {
    if (typeof fingerprint !== 'string' || !fingerprint.trim()) return null
    const normalized = fingerprint.trim()
    return assets.value.find((item) => item.fingerprint === normalized) || null
  }

  const trackAssetPreviewScope = (assetId, scopeId) => {
    const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : ''
    const normalizedScopeId = typeof scopeId === 'string' ? scopeId.trim() : ''
    if (!normalizedAssetId || !normalizedScopeId) return false

    const scopeAssetIds = previewScopeAssetIds.get(normalizedScopeId) || new Set()
    scopeAssetIds.add(normalizedAssetId)
    previewScopeAssetIds.set(normalizedScopeId, scopeAssetIds)

    const assetScopes = previewAssetScopes.get(normalizedAssetId) || new Set()
    assetScopes.add(normalizedScopeId)
    previewAssetScopes.set(normalizedAssetId, assetScopes)
    return true
  }

  const forgetAssetPreviewScopeMembership = (assetId) => {
    const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : ''
    if (!normalizedAssetId) return false
    const assetScopes = previewAssetScopes.get(normalizedAssetId)
    if (!assetScopes) return false

    Array.from(assetScopes).forEach((scopeId) => {
      const scopeAssetIds = previewScopeAssetIds.get(scopeId)
      if (!scopeAssetIds) return
      scopeAssetIds.delete(normalizedAssetId)
      if (scopeAssetIds.size === 0) {
        previewScopeAssetIds.delete(scopeId)
      }
    })
    previewAssetScopes.delete(normalizedAssetId)
    return true
  }

  const revokeAssetPreviewUrl = (assetId, options = {}) => {
    if (typeof assetId !== 'string' || !assetId.trim()) return false
    const normalizedId = assetId.trim()
    if (options.clearScopeRefs !== false) {
      forgetAssetPreviewScopeMembership(normalizedId)
    }
    const cachedUrl = previewObjectUrlCache.get(normalizedId)
    if (!cachedUrl) return false
    previewObjectUrlCache.delete(normalizedId)
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(cachedUrl)
    }
    return true
  }

  const clearAssetPreviewCache = () => {
    previewScopeAssetIds.clear()
    previewAssetScopes.clear()
    Array.from(previewObjectUrlCache.keys()).forEach((assetId) => {
      revokeAssetPreviewUrl(assetId, { clearScopeRefs: false })
    })
  }

  const releaseAssetPreview = (assetId, scopeId) => {
    const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : ''
    const normalizedScopeId = typeof scopeId === 'string' ? scopeId.trim() : ''
    if (!normalizedAssetId || !normalizedScopeId) return false

    const scopeAssetIds = previewScopeAssetIds.get(normalizedScopeId)
    const assetScopes = previewAssetScopes.get(normalizedAssetId)
    if (!scopeAssetIds || !assetScopes) return false

    const hadScope = scopeAssetIds.delete(normalizedAssetId) || assetScopes.has(normalizedScopeId)
    assetScopes.delete(normalizedScopeId)

    if (scopeAssetIds.size === 0) {
      previewScopeAssetIds.delete(normalizedScopeId)
    }
    if (assetScopes.size === 0) {
      previewAssetScopes.delete(normalizedAssetId)
      revokeAssetPreviewUrl(normalizedAssetId, { clearScopeRefs: false })
    }

    return hadScope
  }

  const releaseAssetPreviewScope = (scopeId) => {
    const normalizedScopeId = typeof scopeId === 'string' ? scopeId.trim() : ''
    if (!normalizedScopeId) return 0
    const scopeAssetIds = previewScopeAssetIds.get(normalizedScopeId)
    if (!scopeAssetIds || scopeAssetIds.size === 0) return 0

    const assetIds = Array.from(scopeAssetIds)
    previewScopeAssetIds.delete(normalizedScopeId)

    let revokedCount = 0
    assetIds.forEach((assetId) => {
      const assetScopes = previewAssetScopes.get(assetId)
      if (!assetScopes) return
      assetScopes.delete(normalizedScopeId)
      if (assetScopes.size === 0) {
        previewAssetScopes.delete(assetId)
        if (revokeAssetPreviewUrl(assetId, { clearScopeRefs: false })) {
          revokedCount += 1
        }
      }
    })

    return revokedCount
  }

  const getAssetPreviewUrl = async (assetId, options = {}) => {
    const asset = findAssetById(assetId)
    if (!asset) return ''
    const scopeId = typeof options?.scopeId === 'string' ? options.scopeId.trim() : ''
    if (asset.sourceType === 'url') return asset.sourceUrl

    const normalizedId = asset.id
    const cachedUrl = previewObjectUrlCache.get(normalizedId)
    if (cachedUrl) {
      trackAssetPreviewScope(normalizedId, scopeId)
      return cachedUrl
    }

    const blob = await getGalleryAssetBlob(asset.blobId || asset.id)
    if (!(blob instanceof Blob)) return ''
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return ''

    const objectUrl = URL.createObjectURL(blob)
    previewObjectUrlCache.set(normalizedId, objectUrl)
    trackAssetPreviewScope(normalizedId, scopeId)
    return objectUrl
  }

  const getAssetAiReferenceUrl = async (
    assetId,
    { maxBytes = DEFAULT_AI_REFERENCE_MAX_BYTES } = {},
  ) => {
    const normalizedMaxBytes = clampPositiveInteger(
      maxBytes,
      DEFAULT_AI_REFERENCE_MAX_BYTES,
    )
    const asset = findAssetById(assetId)
    if (!asset) {
      return {
        ok: false,
        reason: 'not_found',
        url: '',
        sourceType: 'none',
        sizeBytes: 0,
        maxBytes: normalizedMaxBytes,
      }
    }

    if (asset.sourceType === 'url') {
      const remoteUrl =
        typeof asset.sourceUrl === 'string' ? asset.sourceUrl.trim() : ''
      if (!remoteUrl) {
        return {
          ok: false,
          reason: 'missing_url',
          url: '',
          sourceType: 'url',
          sizeBytes: 0,
          maxBytes: normalizedMaxBytes,
        }
      }
      return {
        ok: true,
        reason: '',
        url: remoteUrl,
        sourceType: 'url',
        sizeBytes: Math.max(0, toInt(asset.sizeBytes, 0)),
        maxBytes: normalizedMaxBytes,
      }
    }

    const blob = await getGalleryAssetBlob(asset.blobId || asset.id)
    if (!(blob instanceof Blob)) {
      return {
        ok: false,
        reason: 'blob_missing',
        url: '',
        sourceType: 'file',
        sizeBytes: 0,
        maxBytes: normalizedMaxBytes,
      }
    }

    const blobSize = Math.max(0, toInt(blob.size, 0))
    if (blobSize > normalizedMaxBytes) {
      return {
        ok: false,
        reason: 'blob_too_large',
        url: '',
        sourceType: 'file',
        sizeBytes: blobSize,
        maxBytes: normalizedMaxBytes,
      }
    }

    const dataUrl = await blobToDataUrl(blob)
    if (!dataUrl) {
      return {
        ok: false,
        reason: 'blob_read_failed',
        url: '',
        sourceType: 'file',
        sizeBytes: blobSize,
        maxBytes: normalizedMaxBytes,
      }
    }

    return {
      ok: true,
      reason: '',
      url: dataUrl,
      sourceType: 'file',
      sizeBytes: blobSize,
      maxBytes: normalizedMaxBytes,
      mimeType:
        typeof blob.type === 'string'
          ? blob.type.trim().toLowerCase()
          : '',
    }
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
    const sizeLimitByKind = summarizeMediaLimitPolicy(MEDIA_SIZE_SCENE.GALLERY_IMPORT)
    if (list.length === 0) {
      return {
        ok: false,
        reason: 'empty',
        importedCount: 0,
        skippedUnsupportedCount: 0,
        skippedTooLargeCount: 0,
        skippedDuplicateCount: 0,
        duplicateAssetIds: [],
        sizeLimitByKind,
      }
    }

    const importedIds = []
    const importedAssets = []
    const duplicateAssetIds = []
    let skippedUnsupportedCount = 0
    let skippedTooLargeCount = 0
    let skippedDuplicateCount = 0
    let failedStorageCount = 0

    for (const file of list) {
      if (!fileLooksLikeSupportedImage(file)) {
        skippedUnsupportedCount += 1
        continue
      }
      const sizeGuard = validateMediaFileBySize(file, {
        scene: MEDIA_SIZE_SCENE.GALLERY_IMPORT,
        fallbackKind: MEDIA_KIND.IMAGE,
      })
      if (!sizeGuard.ok && sizeGuard.reason === 'too_large') {
        skippedTooLargeCount += 1
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
      reason:
        importedAssets.length > 0
          ? ''
          : skippedTooLargeCount > 0 &&
              skippedUnsupportedCount === 0 &&
              skippedDuplicateCount === 0 &&
              failedStorageCount === 0
            ? 'all_too_large'
            : 'no_valid_file',
      importedCount: importedAssets.length,
      importedIds,
      skippedUnsupportedCount,
      skippedTooLargeCount,
      skippedDuplicateCount,
      duplicateAssetIds,
      failedStorageCount,
      sizeLimitByKind,
    }
  }

  const renameAsset = (assetId, nextName) => {
    const asset = findAssetById(assetId)
    if (!asset) return false
    asset.name = normalizeAssetName(nextName, asset.name)
    asset.updatedAt = Date.now()
    return true
  }

  const replaceAssetFromUrl = async (assetId, { url, name = '' } = {}) => {
    const asset = findAssetById(assetId)
    if (!asset) {
      return {
        ok: false,
        reason: 'not_found',
      }
    }

    const normalizedUrl = normalizeHttpUrl(url)
    if (!normalizedUrl) {
      return {
        ok: false,
        reason: 'invalid_url',
      }
    }

    const fingerprint = buildUrlFingerprint(normalizedUrl)
    const duplicated = findAssetByFingerprint(fingerprint)
    if (duplicated && duplicated.id !== asset.id) {
      return {
        ok: false,
        reason: 'duplicate',
        duplicatedAssetId: duplicated.id,
      }
    }

    if (asset.sourceType === 'file') {
      await deleteGalleryAssetBlob(asset.blobId || asset.id)
      revokeAssetPreviewUrl(asset.id)
    }

    asset.sourceType = 'url'
    asset.sourceUrl = normalizedUrl
    asset.blobId = ''
    asset.mimeType = ''
    asset.extension = readExtension(normalizedUrl)
    asset.sizeBytes = 0
    asset.fingerprint = fingerprint
    if (typeof name === 'string' && name.trim()) {
      asset.name = normalizeAssetName(name, asset.name)
    }
    asset.updatedAt = Date.now()
    revokeAssetPreviewUrl(asset.id)

    return {
      ok: true,
      assetId: asset.id,
    }
  }

  const replaceAssetFromFile = async (assetId, file, { renameToFileName = false } = {}) => {
    const asset = findAssetById(assetId)
    if (!asset) {
      return {
        ok: false,
        reason: 'not_found',
      }
    }
    if (!(file instanceof File) || !fileLooksLikeSupportedImage(file)) {
      return {
        ok: false,
        reason: 'unsupported_file',
      }
    }
    const sizeGuard = validateMediaFileBySize(file, {
      scene: MEDIA_SIZE_SCENE.GALLERY_IMPORT,
      fallbackKind: MEDIA_KIND.IMAGE,
    })
    if (!sizeGuard.ok && sizeGuard.reason === 'too_large') {
      return {
        ok: false,
        reason: 'too_large',
        sizeBytes: sizeGuard.sizeBytes,
        maxBytes: sizeGuard.maxBytes,
        mediaKind: sizeGuard.mediaKind,
      }
    }

    const fingerprint = await buildFileFingerprint(file)
    const duplicated = findAssetByFingerprint(fingerprint)
    if (duplicated && duplicated.id !== asset.id) {
      return {
        ok: false,
        reason: 'duplicate',
        duplicatedAssetId: duplicated.id,
      }
    }

    const blobId = asset.id
    const storageOk = await putGalleryAssetBlob(blobId, file)
    if (!storageOk) {
      return {
        ok: false,
        reason: 'storage_failed',
      }
    }

    asset.sourceType = 'file'
    asset.sourceUrl = ''
    asset.blobId = blobId
    asset.mimeType = (file.type || '').toLowerCase()
    asset.extension = readExtension(file.name)
    asset.sizeBytes = Math.max(0, toInt(file.size, 0))
    asset.fingerprint = fingerprint
    if (renameToFileName) {
      asset.name = normalizeAssetName(file.name, asset.name)
    }
    asset.updatedAt = Date.now()
    revokeAssetPreviewUrl(asset.id)

    return {
      ok: true,
      assetId: asset.id,
    }
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
    const wallpaperMode = typeof systemStore.settings?.appearance?.wallpaperMode === 'string'
      ? systemStore.settings.appearance.wallpaperMode.trim()
      : 'theme'
    const wallpaperAssetId = typeof systemStore.settings?.appearance?.wallpaperAssetId === 'string'
      ? systemStore.settings.appearance.wallpaperAssetId.trim()
      : ''
    const wallpaper = typeof systemStore.settings?.appearance?.wallpaper === 'string'
      ? systemStore.settings.appearance.wallpaper.trim()
      : ''

    if (wallpaperMode === 'gallery' && wallpaperAssetId && wallpaperAssetId === asset.id) {
      runtimeUsages.push({
        id: 'system:appearance.wallpaper',
        moduleKey: 'system',
        targetKey: 'appearance.wallpaper',
        label: 'System wallpaper',
      })
      return runtimeUsages
    }

    if (wallpaperMode === 'url' && asset.sourceType === 'url' && asset.sourceUrl && wallpaper && wallpaper === asset.sourceUrl) {
      runtimeUsages.push({
        id: 'system:appearance.wallpaper',
        moduleKey: 'system',
        targetKey: 'appearance.wallpaper',
        label: 'System wallpaper',
      })
    }

    const mapVisualSettings = mapStore.mapVisualSettings || {}
    const mapVisualMode =
      typeof mapVisualSettings.mode === 'string' ? mapVisualSettings.mode.trim() : 'default'
    const mapVisualAssetId =
      typeof mapVisualSettings.assetId === 'string' ? mapVisualSettings.assetId.trim() : ''

    if (mapVisualMode === 'gallery' && mapVisualAssetId && mapVisualAssetId === asset.id) {
      runtimeUsages.push({
        id: 'map:visual.background',
        moduleKey: 'map',
        targetKey: 'visual.background',
        label: 'Map visual background',
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
    folders.value.forEach((folder) => {
      if (!Array.isArray(folder.assetIds) || folder.assetIds.length === 0) return
      const nextAssetIds = folder.assetIds.filter((id) => id !== normalizedId)
      if (nextAssetIds.length === folder.assetIds.length) return
      folder.assetIds = nextAssetIds
      folder.updatedAt = Date.now()
    })
    revokeAssetPreviewUrl(normalizedId)
    delete usageRegistry[normalizedId]
    if (systemStore.settings?.appearance?.wallpaperAssetId === normalizedId) {
      systemStore.clearAppearanceWallpaperAsset({
        fallbackToTheme: true,
      })
    }
    if (mapStore.mapVisualSettings?.assetId === normalizedId) {
      mapStore.setMapVisualAssetId('')
      mapStore.setMapVisualMode('default')
    }
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
    const existingAssetIds = new Set(nextAssets.map((asset) => asset.id))
    const sourceFolders = Array.isArray(snapshot.folders) ? snapshot.folders : []
    const seenFolderIds = new Set()
    const nextFolders = sourceFolders
      .map((folder, index) => normalizeFolderRecord(folder, index, { existingAssetIds }))
      .filter((folder) => {
        if (!folder) return false
        if (seenFolderIds.has(folder.id)) return false
        seenFolderIds.add(folder.id)
        return true
      })

    clearAssetPreviewCache()
    assets.value = nextAssets
    folders.value = nextFolders
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
        folders: folders.value.map((folder) => cloneFolder(folder)),
      },
      { version: GALLERY_STORAGE_VERSION },
    )
  }

  const saveNow = () => {
    persistToStorage()
  }

  const createBackupSnapshot = () => ({
    assets: assets.value.map((asset) => cloneAsset(asset)),
    folders: folders.value.map((folder) => cloneFolder(folder)),
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
    [assets, folders],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    assets,
    folders,
    hasFinishedStorageHydration,
    categoryCounts,
    sortedAssets,
    sortedFolders,
    getAssetsByCategory,
    findAssetById,
    findFolderById,
    listFolders,
    createFolder,
    renameFolder,
    setFolderCategory,
    setFolderAssetIds,
    addAssetToFolder,
    removeAssetFromFolder,
    removeFolder,
    getAssetPreviewUrl,
    getAssetAiReferenceUrl,
    releaseAssetPreview,
    releaseAssetPreviewScope,
    revokeAssetPreviewUrl,
    clearAssetPreviewCache,
    importAssetFromUrl,
    importAssetsFromFiles,
    replaceAssetFromUrl,
    replaceAssetFromFile,
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
