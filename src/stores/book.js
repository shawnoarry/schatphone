import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import {
  buildBookAssetExportPayload,
  buildBookAssetFromImportedText,
  normalizeBookTextAsset,
  normalizeBookTextAssets,
} from '../lib/book-text-schema'
import { findBuiltInBookTextAssetById, listBuiltInBookTextAssets } from '../lib/built-in-book-assets'
import { normalizeBookTextCategory } from '../lib/world-taxonomy'

const BOOK_STORAGE_KEY = 'store:book'
const BOOK_STORAGE_VERSION = 1
const BOOK_ASSET_LIMIT = 300

const normalizeCategory = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : ''
  if (!title) return null
  return {
    id:
      typeof raw.id === 'string' && raw.id.trim()
        ? raw.id.trim().toLowerCase().replace(/[^a-z0-9_:-]+/g, '_')
        : `book_category_${index + 1}`,
    title: title.slice(0, 120),
    color: typeof raw.color === 'string' ? raw.color.trim().slice(0, 40) : '',
  }
}

const normalizeCategories = (rawCategories) => {
  if (!Array.isArray(rawCategories)) return []
  const seenIds = new Set()
  return rawCategories
    .map((item, index) => normalizeCategory(item, index))
    .filter(Boolean)
    .filter((item) => {
      if (seenIds.has(item.id)) return false
      seenIds.add(item.id)
      return true
    })
}

const cloneAsset = (asset) => ({
  ...asset,
  tags: Array.isArray(asset.tags) ? [...asset.tags] : [],
  sections: Array.isArray(asset.sections) ? asset.sections.map((section) => ({ ...section })) : [],
  source: asset.source && typeof asset.source === 'object' ? { ...asset.source } : {},
})

const cloneCategory = (category) => ({ ...category })

const createDuplicatedId = (assetId) => `${assetId || 'book_asset'}_copy_${Date.now()}`

const mergeBuiltInAssets = (userAssets = []) => {
  const userAssetList = Array.isArray(userAssets) ? userAssets : []
  const userIds = new Set(userAssetList.map((asset) => asset?.id).filter(Boolean))
  return [
    ...userAssetList,
    ...listBuiltInBookTextAssets().filter((asset) => !userIds.has(asset.id)),
  ]
}

const applyAssetPatch = (asset, patch = {}) => {
  const normalized = normalizeBookTextAsset({
    ...asset,
    ...patch,
    id: asset.id,
    createdAt: asset.createdAt,
    updatedAt: Date.now(),
    version: Number(asset.version || 1) + 1,
    contentFingerprint: undefined,
  })
  return normalized
}

export const useBookStore = defineStore('book', () => {
  const assets = ref([])
  const categories = ref([])
  const hasFinishedStorageHydration = ref(false)

  const assetCount = computed(() => assets.value.length)
  const libraryAssets = computed(() => mergeBuiltInAssets(assets.value))
  const worldbookSourceAssets = computed(() =>
    libraryAssets.value.filter((asset) => {
      const category = normalizeBookTextCategory(asset.category || asset.assetType)
      return (
        asset.status === 'active_source' ||
        category === 'worldview' ||
        category === 'encyclopedia' ||
        category === 'world_rule'
      )
    }),
  )

  const findAssetById = (assetId) => {
    const id = typeof assetId === 'string' ? assetId.trim() : ''
    if (!id) return null
    return assets.value.find((asset) => asset.id === id) || findBuiltInBookTextAssetById(id)
  }

  const listAssets = (filters = {}) => {
    const query = typeof filters.search === 'string' ? filters.search.trim().toLowerCase() : ''
    const rawCategory =
      typeof filters.category === 'string' && filters.category.trim()
        ? filters.category.trim()
        : typeof filters.assetType === 'string'
          ? filters.assetType.trim()
          : ''
    const category = rawCategory ? normalizeBookTextCategory(rawCategory) : ''
    const status = typeof filters.status === 'string' ? filters.status.trim() : ''
    const tag = typeof filters.tag === 'string' ? filters.tag.trim().toLowerCase() : ''
    return libraryAssets.value.filter((asset) => {
      if (query) {
        const haystack = [asset.title, asset.content, ...(Array.isArray(asset.tags) ? asset.tags : [])]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      if (category && asset.category !== category && asset.assetType !== category) return false
      if (status && asset.status !== status) return false
      if (tag && !(asset.tags || []).some((item) => item.toLowerCase() === tag)) return false
      return true
    })
  }

  const sortAssets = () => {
    assets.value = normalizeBookTextAssets(assets.value).slice(0, BOOK_ASSET_LIMIT)
  }

  const createAsset = (input = {}) => {
    const now = Date.now()
    const asset = normalizeBookTextAsset({
      ...input,
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
    }, assets.value.length)
    assets.value.unshift(asset)
    sortAssets()
    return cloneAsset(asset)
  }

  const updateAsset = (assetId, patch = {}, options = {}) => {
    const asset = findAssetById(assetId)
    if (!asset) return { ok: false, reason: 'not_found' }
    const index = assets.value.findIndex((item) => item.id === asset.id)
    if (index < 0) return { ok: false, reason: 'built_in' }
    if (asset.locked && options.force !== true && patch.locked !== false) {
      return { ok: false, reason: 'locked' }
    }

    const next = options.preserveVersion === true
      ? normalizeBookTextAsset({
          ...asset,
          ...patch,
          id: asset.id,
          createdAt: asset.createdAt,
          updatedAt: Date.now(),
          version: asset.version,
          contentFingerprint: undefined,
        })
      : applyAssetPatch(asset, patch)
    assets.value.splice(index, 1, next)
    sortAssets()
    return { ok: true, asset: cloneAsset(next) }
  }

  const deleteAsset = (assetId, options = {}) => {
    const asset = findAssetById(assetId)
    if (!asset) return { ok: false, reason: 'not_found' }
    if (!assets.value.some((item) => item.id === asset.id)) {
      return { ok: false, reason: 'built_in' }
    }
    if (asset.status === 'active_source' && options.force !== true) {
      return { ok: false, reason: 'active_source' }
    }
    assets.value = assets.value.filter((item) => item.id !== asset.id)
    return { ok: true, asset: cloneAsset(asset) }
  }

  const lockAsset = (assetId) => updateAsset(assetId, { locked: true }, { force: true, preserveVersion: true })

  const unlockAsset = (assetId) => updateAsset(assetId, { locked: false }, { force: true, preserveVersion: true })

  const duplicateAsset = (assetId) => {
    const asset = findAssetById(assetId)
    if (!asset) return null
    return createAsset({
      ...cloneAsset(asset),
      id: createDuplicatedId(asset.id),
      title: `${asset.title} Copy`,
      status: 'draft',
      locked: false,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  }

  const importTextAsset = (payload = {}) => {
    const result = buildBookAssetFromImportedText(payload)
    if (!result.ok || !result.asset) return result
    const asset = createAsset(result.asset)
    return { ok: true, asset }
  }

  const exportAsset = (assetId) => {
    const asset = findAssetById(assetId)
    if (!asset) return null
    return buildBookAssetExportPayload(asset)
  }

  const applyPersistedSource = (source) => {
    const payload =
      source && typeof source.book === 'object' && source.book
        ? source.book
        : source
    if (!payload || typeof payload !== 'object') return false
    const sourceAssets = Array.isArray(payload.assets) ? payload.assets : []
    assets.value = normalizeBookTextAssets(sourceAssets).slice(0, BOOK_ASSET_LIMIT)
    categories.value = normalizeCategories(payload.categories)
    return true
  }

  const createBackupSnapshot = () => ({
    assets: assets.value.map(cloneAsset),
    categories: categories.value.map(cloneCategory),
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => applyPersistedSource(snapshot)

  const persistToStorage = () => {
    writePersistedState(BOOK_STORAGE_KEY, createBackupSnapshot(), {
      version: BOOK_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(BOOK_STORAGE_KEY, {
      version: BOOK_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(BOOK_STORAGE_KEY, {
      version: BOOK_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const resetForTesting = () => {
    assets.value = []
    categories.value = []
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
    [assets, categories],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    assets,
    categories,
    hasFinishedStorageHydration,
    assetCount,
    libraryAssets,
    worldbookSourceAssets,
    findAssetById,
    listAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    lockAsset,
    unlockAsset,
    duplicateAsset,
    importTextAsset,
    exportAsset,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    saveNow,
    resetForTesting,
  }
})
