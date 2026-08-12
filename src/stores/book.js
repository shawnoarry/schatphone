import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedRawLayers, readPersistedState, writePersistedState } from '../lib/persistence'
import { reportPersistenceWriteResult } from '../lib/persistence-runtime-status'
import {
  buildBookAssetExportPayload,
  buildBookAssetPortableExport,
  buildBookAssetFromImportedText,
  normalizeBookTextAsset,
  normalizeBookTextAssets,
} from '../lib/book-text-schema'
import { findBuiltInBookTextAssetById, listBuiltInBookTextAssets } from '../lib/built-in-book-assets'
import { normalizeBookTextCategory } from '../lib/world-taxonomy'
import {
  createBookRepositoryRuntime,
  estimateBookRepositoryPeakBytes,
} from '../lib/book-repository-runtime'

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

const createAvailableAssetId = (assetId, occupiedIds = new Set()) => {
  const baseId = typeof assetId === 'string' && assetId.trim() ? assetId.trim() : 'book_asset'
  if (!occupiedIds.has(baseId)) return baseId
  let suffix = 2
  while (occupiedIds.has(`${baseId}_copy_${suffix}`)) suffix += 1
  return `${baseId}_copy_${suffix}`
}

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
  const storageMode = ref('checking')
  const storageState = ref('checking')
  const storageErrorCode = ref('')
  const storageReadOnly = ref(false)
  const persistentStorageState = ref('not_persistent')
  const activeGenerationId = ref('')
  const runtime = createBookRepositoryRuntime()
  let repositoryWriteQueue = Promise.resolve({ ok: true, code: 'idle' })
  let lastPersistenceEvidence = null
  let pendingConflictResult = null
  let skipNextWatchedWrite = false
  let internalSnapshotApplyDepth = 0

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
    if (storageReadOnly.value) return null
    const now = Date.now()
    const normalized = normalizeBookTextAsset({
      ...input,
      createdAt: input.createdAt || now,
      updatedAt: input.updatedAt || now,
    }, assets.value.length)
    const occupiedIds = new Set(libraryAssets.value.map((asset) => asset?.id).filter(Boolean))
    const availableId = createAvailableAssetId(normalized.id, occupiedIds)
    const asset = normalized.id === availableId
      ? normalized
      : normalizeBookTextAsset({
          ...normalized,
          id: availableId,
          contentFingerprint: undefined,
        }, assets.value.length)
    assets.value.unshift(asset)
    sortAssets()
    return cloneAsset(asset)
  }

  const updateAsset = (assetId, patch = {}, options = {}) => {
    if (storageReadOnly.value) return { ok: false, reason: 'read_only_conflict' }
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
    if (storageReadOnly.value) return { ok: false, reason: 'read_only_conflict' }
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
    if (storageReadOnly.value) {
      return { ok: false, code: 'read_only_conflict', message: 'Book storage is read-only.' }
    }
    const result = buildBookAssetFromImportedText(payload)
    if (!result.ok || !result.asset) return result
    const asset = createAsset(result.asset)
    if (!asset) return { ok: false, code: 'read_only_conflict', message: 'Book storage is read-only.' }
    return { ok: true, asset }
  }

  const exportAsset = (assetId) => {
    const asset = findAssetById(assetId)
    if (!asset) return null
    return buildBookAssetExportPayload(asset)
  }

  const exportAssetFile = (assetId, format = 'worldbook_json') => {
    const asset = findAssetById(assetId)
    if (!asset) return null
    return buildBookAssetPortableExport(asset, format)
  }

  const applyPersistedSource = (source, options = {}) => {
    const payload =
      source && typeof source.book === 'object' && source.book
        ? source.book
        : source
    if (!payload || typeof payload !== 'object') return false
    const suppressWatchedPersistence = options.suppressWatchedPersistence === true
    if (suppressWatchedPersistence) internalSnapshotApplyDepth += 1
    const sourceAssets = Array.isArray(payload.assets) ? payload.assets : []
    assets.value = normalizeBookTextAssets(sourceAssets).slice(0, BOOK_ASSET_LIMIT)
    categories.value = normalizeCategories(payload.categories)
    if (suppressWatchedPersistence) {
      queueMicrotask(() => {
        internalSnapshotApplyDepth = Math.max(0, internalSnapshotApplyDepth - 1)
      })
    }
    return true
  }

  const createBackupSnapshot = () => ({
    assets: assets.value.map(cloneAsset),
    categories: categories.value.map(cloneCategory),
  })

  const createBackupSnapshotAsync = async () => {
    await repositoryWriteQueue
    return createBackupSnapshot()
  }

  const restoreFromBackup = (snapshot = {}) => {
    if (storageReadOnly.value) return false
    return applyPersistedSource(snapshot)
  }

  const persistToStorage = () => {
    return writePersistedState(BOOK_STORAGE_KEY, createBackupSnapshot(), {
      version: BOOK_STORAGE_VERSION,
    })
  }

  const applyRepositoryResult = (result) => {
    if (result?.ok) {
      storageState.value = 'active'
      storageErrorCode.value = ''
      storageReadOnly.value = false
      activeGenerationId.value = result.pointer?.generationId || activeGenerationId.value
      pendingConflictResult = null
      reportPersistenceWriteResult({ key: BOOK_STORAGE_KEY, result })
      return result
    }
    storageErrorCode.value = result?.code || 'repository_write_failed'
    if (result?.recoveryRequired) {
      storageState.value = 'error'
      storageReadOnly.value = true
      pendingConflictResult = null
    } else if (result?.readOnly || ['read_only_conflict', 'stale_generation'].includes(result?.code)) {
      storageState.value = 'read_only_conflict'
      storageReadOnly.value = true
      pendingConflictResult = result
    } else {
      storageState.value = 'error'
      storageReadOnly.value = true
    }
    reportPersistenceWriteResult({
      key: BOOK_STORAGE_KEY,
      result: {
        ...result,
        error: result?.code || 'repository_write_failed',
        retryable: typeof result?.retry === 'function',
      },
      retry: result?.retry,
      refreshCurrentSave: result?.refreshCurrentSave,
    })
    return result
  }

  const persistToRepository = (snapshot = createBackupSnapshot()) => {
    storageState.value = 'saving'
    repositoryWriteQueue = repositoryWriteQueue
      .catch(() => ({ ok: false }))
      .then(() => runtime.persistSnapshot({ snapshot }))
      .then(applyRepositoryResult)
    return repositoryWriteQueue
  }

  const saveNow = () => {
    if (storageMode.value === 'repository') {
      skipNextWatchedWrite = true
      queueMicrotask(() => {
        skipNextWatchedWrite = false
      })
      return persistToRepository()
    }
    return persistToStorage()
  }

  const commitManagedAssetMutation = async ({ operation, assetId, asset, patch = {} } = {}) => {
    await storageInitializationPromise
    await repositoryWriteQueue.catch(() => ({ ok: false }))
    if (storageReadOnly.value) {
      return { ok: false, code: 'read_only_conflict' }
    }

    const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : ''
    if (!normalizedAssetId) return { ok: false, code: 'invalid_asset_id' }
    const beforeMutation = createBackupSnapshot()
    let mutationResult = null

    if (operation === 'create') {
      if (assets.value.length >= BOOK_ASSET_LIMIT) {
        return { ok: false, code: 'capacity_reached' }
      }
      if (findAssetById(normalizedAssetId)) {
        return { ok: false, code: 'identity_collision' }
      }
      internalSnapshotApplyDepth += 1
      const created = createAsset({ ...asset, id: normalizedAssetId })
      queueMicrotask(() => {
        internalSnapshotApplyDepth = Math.max(0, internalSnapshotApplyDepth - 1)
      })
      if (!created || created.id !== normalizedAssetId) {
        applyPersistedSource(beforeMutation, { suppressWatchedPersistence: true })
        return { ok: false, code: created ? 'identity_collision' : 'mutation_failed' }
      }
      mutationResult = { ok: true, asset: created }
    } else if (operation === 'update') {
      if (!assets.value.some((item) => item.id === normalizedAssetId)) {
        return {
          ok: false,
          code: findAssetById(normalizedAssetId) ? 'built_in' : 'not_found',
        }
      }
      internalSnapshotApplyDepth += 1
      mutationResult = updateAsset(normalizedAssetId, patch, { force: true })
      queueMicrotask(() => {
        internalSnapshotApplyDepth = Math.max(0, internalSnapshotApplyDepth - 1)
      })
      if (!mutationResult?.ok) {
        return { ok: false, code: mutationResult?.reason || 'mutation_failed' }
      }
    } else if (operation === 'delete') {
      if (!assets.value.some((item) => item.id === normalizedAssetId)) {
        return {
          ok: false,
          code: findAssetById(normalizedAssetId) ? 'built_in' : 'not_found',
        }
      }
      internalSnapshotApplyDepth += 1
      mutationResult = deleteAsset(normalizedAssetId, { force: true })
      queueMicrotask(() => {
        internalSnapshotApplyDepth = Math.max(0, internalSnapshotApplyDepth - 1)
      })
      if (!mutationResult?.ok) {
        return { ok: false, code: mutationResult?.reason || 'mutation_failed' }
      }
    } else {
      return { ok: false, code: 'unsupported_operation' }
    }

    const persistenceResult = storageMode.value === 'repository'
      ? await persistToRepository(createBackupSnapshot())
      : persistToStorage()
    if (persistenceResult?.ok !== true) {
      applyPersistedSource(beforeMutation, { suppressWatchedPersistence: true })
      return {
        ok: false,
        code:
          persistenceResult?.code ||
          persistenceResult?.error ||
          'persistence_failed',
        persistence: persistenceResult || null,
      }
    }

    return {
      ok: true,
      code: '',
      asset: mutationResult?.asset ? cloneAsset(mutationResult.asset) : null,
    }
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(BOOK_STORAGE_KEY, {
      version: BOOK_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const resetForTesting = () => {
    assets.value = []
    categories.value = []
  }

  const requestBookPersistentStorage = async () => {
    const snapshot = createBackupSnapshot()
    const sourceBytes = new TextEncoder().encode(JSON.stringify(snapshot)).byteLength
    lastPersistenceEvidence = await runtime.requestPersistentStorage({
      requiredPeakBytes: estimateBookRepositoryPeakBytes(snapshot, sourceBytes),
    })
    persistentStorageState.value = lastPersistenceEvidence.state
    return lastPersistenceEvidence
  }

  const upgradeBookStorage = async ({
    allowBestEffort = false,
    allowRecoveryCandidate = false,
    worldBookSourceLinks = [],
  } = {}) => {
    await storageInitializationPromise
    if (storageMode.value === 'repository') {
      return { ok: true, code: 'already_upgraded', generationId: activeGenerationId.value }
    }
    storageState.value = 'upgrading'
    storageErrorCode.value = ''
    const result = await runtime.upgradeFromLegacy({
      worldBookSourceLinks,
      persistenceEvidence: lastPersistenceEvidence,
      allowBestEffort,
      allowRecoveryCandidate,
    })
    if (result.ok) {
      if (result.snapshot) applyPersistedSource(result.snapshot, { suppressWatchedPersistence: true })
      storageMode.value = 'repository'
      storageState.value = 'active'
      storageReadOnly.value = false
      activeGenerationId.value = result.pointer?.generationId || ''
      return result
    }
    storageMode.value = 'legacy'
    storageReadOnly.value = result.readOnly === true || ['read_only_conflict', 'stale_generation'].includes(result.code)
    storageState.value = storageReadOnly.value ? 'read_only_conflict' : 'legacy'
    pendingConflictResult = storageReadOnly.value ? result : null
    storageErrorCode.value = result.code || 'upgrade_failed'
    return result
  }

  const refreshBookStorage = async () => {
    const result = pendingConflictResult?.refreshCurrentSave
      ? await pendingConflictResult.refreshCurrentSave()
      : await runtime.initialize()
    if (result.ok && result.code === 'repository_active' && result.snapshot) {
      applyPersistedSource(result.snapshot, { suppressWatchedPersistence: true })
      storageMode.value = 'repository'
      storageState.value = 'active'
      storageReadOnly.value = false
      storageErrorCode.value = ''
      activeGenerationId.value = result.pointer?.generationId || ''
      pendingConflictResult = null
    }
    return result
  }

  const retryBookStorageWrite = async () => {
    if (!pendingConflictResult?.retry) return { ok: false, code: 'nothing_to_retry' }
    storageState.value = 'saving'
    const result = await pendingConflictResult.retry()
    if (result.ok && storageMode.value === 'legacy') {
      if (result.snapshot) applyPersistedSource(result.snapshot, { suppressWatchedPersistence: true })
      storageMode.value = 'repository'
    }
    return applyRepositoryResult(result)
  }

  const hydratedFromLocal = hydrateFromStorage()
  const storageInitializationPromise = (async () => {
    const repositoryResult = await runtime.initialize()
    if (repositoryResult.ok && repositoryResult.code === 'repository_active') {
      applyPersistedSource(repositoryResult.snapshot, { suppressWatchedPersistence: true })
      storageMode.value = 'repository'
      storageState.value = 'active'
      activeGenerationId.value = repositoryResult.pointer?.generationId || ''
    } else if (repositoryResult.readOnly || repositoryResult.recoveryRequired) {
      storageMode.value = 'repository'
      storageState.value = 'error'
      storageReadOnly.value = true
      storageErrorCode.value = repositoryResult.code || 'manual_recovery_required'
      activeGenerationId.value = repositoryResult.pointer?.generationId || ''
    } else {
      storageMode.value = 'legacy'
      storageState.value = 'legacy'
      if (!hydratedFromLocal) {
        const layers = await readPersistedRawLayers(BOOK_STORAGE_KEY)
        if (!layers.localRaw && !layers.mirrorRaw) persistToStorage()
      }
    }
    hasFinishedStorageHydration.value = true
    return repositoryResult
  })()

  watch(
    [assets, categories],
    () => {
      if (!hasFinishedStorageHydration.value) return
      if (skipNextWatchedWrite || internalSnapshotApplyDepth > 0) {
        skipNextWatchedWrite = false
        return
      }
      if (storageReadOnly.value) return
      if (storageMode.value === 'repository') {
        persistToRepository(createBackupSnapshot())
        return
      }
      persistToStorage()
    },
    { deep: true },
  )

  return {
    assets,
    categories,
    hasFinishedStorageHydration,
    storageMode,
    storageState,
    storageErrorCode,
    storageReadOnly,
    persistentStorageState,
    activeGenerationId,
    assetLimit: BOOK_ASSET_LIMIT,
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
    exportAssetFile,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    saveNow,
    commitManagedAssetMutation,
    requestBookPersistentStorage,
    upgradeBookStorage,
    refreshBookStorage,
    retryBookStorageWrite,
    resetForTesting,
  }
})
