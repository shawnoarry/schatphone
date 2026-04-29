import {
  ROLE_ASSET_FOLDER_SLOT_KEYS,
  normalizeRoleAssetFolderBindings,
  sanitizeRoleBindingAssetId,
  sanitizeRoleBindingFolderId,
} from './role-binding-contract'

const MAX_RESOLVED_ASSET_IDS = 180
const MAX_SLOT_KEYS = 8

const CATEGORY_TO_SLOT_KEYS = Object.freeze({
  all: [...ROLE_ASSET_FOLDER_SLOT_KEYS],
  wallpaper: ['profileImage'],
  emoji: ['emojiPack'],
  reference: ['imageReference', 'dynamicMedia', 'profileImage'],
  scenario: ['dynamicMedia', 'imageReference', 'profileImage'],
})

const normalizeCategory = (value) => {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!raw) return 'all'
  if (Object.prototype.hasOwnProperty.call(CATEGORY_TO_SLOT_KEYS, raw)) return raw
  return 'all'
}

const toUniqueList = (items = [], max = Infinity) => {
  const output = []
  const seen = new Set()
  items.forEach((item) => {
    if (output.length >= max) return
    if (typeof item !== 'string') return
    const value = item.trim()
    if (!value || seen.has(value)) return
    seen.add(value)
    output.push(value)
  })
  return output
}

const normalizeSlotKeys = (slotKeys) => {
  if (!Array.isArray(slotKeys) || slotKeys.length === 0) {
    return [...ROLE_ASSET_FOLDER_SLOT_KEYS]
  }
  const allowed = new Set(ROLE_ASSET_FOLDER_SLOT_KEYS)
  return toUniqueList(slotKeys, MAX_SLOT_KEYS).filter((slotKey) => allowed.has(slotKey))
}

const pushUnique = (list, value) => {
  if (!Array.isArray(list) || typeof value !== 'string') return
  if (!value.trim()) return
  if (list.includes(value)) return
  list.push(value)
}

export const getRoleAssetFolderSlotKeysByCategory = (category = 'all') =>
  [...CATEGORY_TO_SLOT_KEYS[normalizeCategory(category)]]

export const getRoleAssetFolderIdChain = (bindings, slotKey) => {
  if (!ROLE_ASSET_FOLDER_SLOT_KEYS.includes(slotKey)) return []
  const normalizedBindings = normalizeRoleAssetFolderBindings(bindings)
  const slot = normalizedBindings[slotKey] && typeof normalizedBindings[slotKey] === 'object'
    ? normalizedBindings[slotKey]
    : {}
  const list = []

  const primaryFolderId = sanitizeRoleBindingFolderId(slot.folderId)
  if (primaryFolderId) list.push(primaryFolderId)

  if (Array.isArray(slot.folderPriorityChain)) {
    slot.folderPriorityChain.forEach((rawId) => {
      const folderId = sanitizeRoleBindingFolderId(rawId)
      if (!folderId || list.includes(folderId)) return
      list.push(folderId)
    })
  }

  return list
}

export const resolveFolderBoundAssetIds = (
  galleryStore,
  bindings,
  slotKeys = ROLE_ASSET_FOLDER_SLOT_KEYS,
  options = {},
) => {
  if (!galleryStore || typeof galleryStore.findFolderById !== 'function') {
    return {
      assetIds: [],
      sourceByAssetId: {},
      slotKeys: [],
    }
  }

  const category = normalizeCategory(options.category)
  const limit = Number.isFinite(Number(options.limit))
    ? Math.max(1, Math.floor(Number(options.limit)))
    : MAX_RESOLVED_ASSET_IDS

  const resolvedSlotKeys = normalizeSlotKeys(slotKeys)
  const normalizedBindings = normalizeRoleAssetFolderBindings(bindings)
  const assetIds = []
  const seenAssetIds = new Set()
  const sourceByAssetId = {}

  resolvedSlotKeys.forEach((slotKey) => {
    if (assetIds.length >= limit) return
    const folderChain = getRoleAssetFolderIdChain(normalizedBindings, slotKey)
    folderChain.forEach((folderId) => {
      if (assetIds.length >= limit) return
      const folder = galleryStore.findFolderById(folderId)
      const folderAssetIds = Array.isArray(folder?.assetIds) ? folder.assetIds : []

      folderAssetIds.forEach((rawAssetId) => {
        if (assetIds.length >= limit) return
        const assetId = sanitizeRoleBindingAssetId(rawAssetId)
        if (!assetId) return

        const asset = typeof galleryStore.findAssetById === 'function'
          ? galleryStore.findAssetById(assetId)
          : null
        if (!asset) return
        if (category !== 'all' && asset.category !== category) return

        if (!seenAssetIds.has(assetId)) {
          seenAssetIds.add(assetId)
          assetIds.push(assetId)
        }

        if (!sourceByAssetId[assetId]) {
          sourceByAssetId[assetId] = {
            slotKeys: [],
            folderIds: [],
          }
        }
        pushUnique(sourceByAssetId[assetId].slotKeys, slotKey)
        pushUnique(sourceByAssetId[assetId].folderIds, folderId)
      })
    })
  })

  return {
    assetIds,
    sourceByAssetId,
    slotKeys: resolvedSlotKeys,
  }
}

export const summarizeRoleAssetFolderBindings = (
  galleryStore,
  bindings,
  slotKeys = ROLE_ASSET_FOLDER_SLOT_KEYS,
  options = {},
) => {
  const category = normalizeCategory(options.category)
  const resolvedSlotKeys = normalizeSlotKeys(slotKeys)
  const normalizedBindings = normalizeRoleAssetFolderBindings(bindings)

  return resolvedSlotKeys.map((slotKey) => {
    const folderChain = getRoleAssetFolderIdChain(normalizedBindings, slotKey)
    const primaryFolderId = folderChain[0] || ''
    const folder =
      primaryFolderId && galleryStore && typeof galleryStore.findFolderById === 'function'
        ? galleryStore.findFolderById(primaryFolderId)
        : null

    const rawFolderAssetIds = Array.isArray(folder?.assetIds) ? folder.assetIds : []
    const assetIds = []
    const missingAssetIds = []

    rawFolderAssetIds.forEach((rawAssetId) => {
      const assetId = sanitizeRoleBindingAssetId(rawAssetId)
      if (!assetId || assetIds.includes(assetId) || missingAssetIds.includes(assetId)) return

      const asset =
        galleryStore && typeof galleryStore.findAssetById === 'function'
          ? galleryStore.findAssetById(assetId)
          : null

      if (!asset) {
        missingAssetIds.push(assetId)
        return
      }

      if (category !== 'all' && asset.category !== category) return
      assetIds.push(assetId)
    })

    const status = !primaryFolderId
      ? 'unbound'
      : !folder
        ? 'missing_folder'
        : assetIds.length > 0
          ? 'ready'
          : 'empty'

    return {
      slotKey,
      folderId: primaryFolderId,
      folderName: folder?.name || '',
      folderCategory: folder?.category || 'all',
      folderPriorityChain: folderChain.slice(1),
      assetIds,
      assetCount: assetIds.length,
      missingAssetIds,
      missingAssetCount: missingAssetIds.length,
      isBound: Boolean(primaryFolderId),
      status,
      fallbackActive: status !== 'ready',
    }
  })
}
