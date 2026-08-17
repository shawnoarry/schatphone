<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { formatBytesCompact, summarizeMediaLimitPolicy, MEDIA_SIZE_SCENE } from '../lib/media-policy'
import { pushReturnTarget } from '../lib/navigation-return'
import { useChatStore } from '../stores/chat'
import { useMapStore } from '../stores/map'
import { GALLERY_ASSET_CATEGORIES, useGalleryStore } from '../stores/gallery'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import AssetThumbnailOption from '../components/assets/AssetThumbnailOption.vue'

const router = useRouter()
const route = useRoute()
const galleryStore = useGalleryStore()
const chatStore = useChatStore()
const mapStore = useMapStore()
const { t } = useI18n()
const { confirmDialog, promptDialog } = useDialog()

const activeTab = ref('library')
const activeCategory = ref('all')
const activeAssetUsageFilter = ref('all')
const albumView = ref(null)
const addSheetOpen = ref(false)
const detailAssetId = ref('')
const localImportCategory = ref('reference')
const localFileInput = ref(null)
const replaceFileInput = ref(null)
const replaceTargetAssetId = ref('')
const feedback = reactive({
  type: '',
  text: '',
})
const urlForm = reactive({
  url: '',
  name: '',
  category: 'reference',
})
const folderForm = reactive({
  name: '',
  category: 'all',
})
const previewMap = reactive({})
const GALLERY_ASSET_PREVIEW_SCOPE_ID = 'gallery-view'

const categoryLabel = (key) => {
  if (key === 'all') return t('全部', 'All')
  if (key === 'wallpaper') return t('壁纸', 'Wallpaper')
  if (key === 'emoji') return t('表情', 'Emoji')
  if (key === 'reference') return t('参考图', 'Reference')
  if (key === 'scenario') return t('场景图', 'Scenario')
  return key
}

const categoryTabs = computed(() => [
  { key: 'all', label: categoryLabel('all'), count: galleryStore.categoryCounts.all || 0 },
  ...GALLERY_ASSET_CATEGORIES.map((key) => ({
    key,
    label: categoryLabel(key),
    count: galleryStore.categoryCounts[key] || 0,
  })),
])

const categoryScopedAssets = computed(() => galleryStore.getAssetsByCategory(activeCategory.value))
const allFolderOptions = computed(() => galleryStore.listFolders({ category: 'all' }).slice(0, 200))
const allFolders = computed(() => galleryStore.listFolders({ category: 'all' }))
const galleryImportLimitPolicy = summarizeMediaLimitPolicy(MEDIA_SIZE_SCENE.GALLERY_IMPORT)
const importLimitHint = computed(() =>
  t(
    `导入上限：图片 ${formatBytesCompact(galleryImportLimitPolicy.image)} / GIF ${formatBytesCompact(galleryImportLimitPolicy.gif)}。`,
    `Import limits: image ${formatBytesCompact(galleryImportLimitPolicy.image)} / GIF ${formatBytesCompact(galleryImportLimitPolicy.gif)}.`,
  ),
)

const setFeedback = (type, text) => {
  feedback.type = type
  feedback.text = text
  if (!text) return
  setTimeout(() => {
    if (feedback.text === text) {
      feedback.type = ''
      feedback.text = ''
    }
  }, 1800)
}

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

/* ---------- 人物 / 地点智能相簿 ---------- */

const personAlbums = computed(() => {
  const grouped = new Map()
  galleryStore.sortedAssets.forEach((asset) => {
    ;(Array.isArray(asset.personIds) ? asset.personIds : []).forEach((personId) => {
      if (!grouped.has(personId)) grouped.set(personId, [])
      grouped.get(personId).push(asset)
    })
  })
  return [...grouped.entries()]
    .map(([personId, items]) => {
      const profile = chatStore.roleProfiles.find((item) => String(item.id) === String(personId))
      if (!profile) return null
      return {
        personId,
        name: profile.name || `#${personId}`,
        count: items.length,
        cover: items[0] || null,
      }
    })
    .filter(Boolean)
})

const mapPlaceLabel = (placeId = '') => {
  const place = (mapStore.activeMapAllPlaces || []).find((item) => item.placeId === placeId)
  return place?.label || place?.name || ''
}

const placeAlbums = computed(() => {
  const grouped = new Map()
  galleryStore.sortedAssets.forEach((asset) => {
    const key = asset.placeId
      ? `place:${asset.placeId}`
      : asset.placeText
        ? `text:${String(asset.placeText).toLowerCase()}`
        : ''
    if (!key) return
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key).push(asset)
  })
  return [...grouped.entries()].map(([key, items]) => {
    const first = items[0]
    const label = first.placeId
      ? mapPlaceLabel(first.placeId) || first.placeText || first.placeId
      : first.placeText
    return {
      key,
      label,
      count: items.length,
      cover: first || null,
    }
  })
})

const albumTitle = computed(() => {
  const view = albumView.value
  if (!view) return ''
  if (view.kind === 'person') {
    return personAlbums.value.find((album) => album.personId === view.id)?.name || t('人物', 'Person')
  }
  if (view.kind === 'place') {
    return placeAlbums.value.find((album) => album.key === view.id)?.label || t('地点', 'Place')
  }
  const folder = galleryStore.findFolderById(view.id)
  return folder?.name || t('相簿', 'Album')
})

const albumAssets = computed(() => {
  const view = albumView.value
  if (!view) return []
  if (view.kind === 'person') {
    return galleryStore.sortedAssets.filter((asset) =>
      (Array.isArray(asset.personIds) ? asset.personIds : []).includes(view.id),
    )
  }
  if (view.kind === 'place') {
    return galleryStore.sortedAssets.filter((asset) => {
      const key = asset.placeId
        ? `place:${asset.placeId}`
        : asset.placeText
          ? `text:${String(asset.placeText).toLowerCase()}`
          : ''
      return key === view.id
    })
  }
  const folder = galleryStore.findFolderById(view.id)
  if (!folder) return []
  return (Array.isArray(folder.assetIds) ? folder.assetIds : [])
    .map((assetId) => galleryStore.findAssetById(assetId))
    .filter(Boolean)
})

const openAlbum = (kind, id) => {
  albumView.value = { kind, id }
}

const closeAlbum = () => {
  albumView.value = null
}

const openCategoryFromAlbums = (categoryKey) => {
  activeCategory.value = categoryKey
  activeTab.value = 'library'
}

/* ---------- 图片详情 ---------- */

const detailAsset = computed(() => galleryStore.findAssetById(detailAssetId.value))

const openAssetDetail = (asset) => {
  detailAssetId.value = asset?.id || ''
}

const closeAssetDetail = () => {
  detailAssetId.value = ''
}

const detailPersonIds = computed(() =>
  Array.isArray(detailAsset.value?.personIds) ? detailAsset.value.personIds : [],
)

const detailPersonIdSet = computed(() => new Set(detailPersonIds.value.map(String)))

const isDetailPersonOn = (personId) => detailPersonIdSet.value.has(String(personId))

const toggleDetailPerson = (personId) => {
  const asset = detailAsset.value
  if (!asset) return
  const key = String(personId)
  const current = detailPersonIds.value.map(String)
  const index = current.indexOf(key)
  if (index >= 0) current.splice(index, 1)
  else current.push(key)
  galleryStore.setAssetPersons(asset.id, current)
}

const detailPlaceSelectValue = computed(() => detailAsset.value?.placeId || '')

const setDetailPlaceFromMap = (placeId) => {
  const asset = detailAsset.value
  if (!asset) return
  if (!placeId) {
    galleryStore.setAssetPlace(asset.id, { placeId: '', placeText: asset.placeText || '' })
    return
  }
  galleryStore.setAssetPlace(asset.id, { placeId, placeText: mapPlaceLabel(placeId) })
}

const setDetailPlaceText = (text) => {
  const asset = detailAsset.value
  if (!asset) return
  galleryStore.setAssetPlace(asset.id, { placeId: '', placeText: text })
}

const clearDetailPlace = () => {
  const asset = detailAsset.value
  if (!asset) return
  galleryStore.setAssetPlace(asset.id, { placeId: '', placeText: '' })
}

const mapPlaceOptions = computed(() =>
  (mapStore.activeMapAllPlaces || [])
    .filter((place) => place?.placeId && (place.label || place.name))
    .slice(0, 60)
    .map((place) => ({ id: place.placeId, label: place.label || place.name })),
)

const personOptions = computed(() =>
  (chatStore.roleProfiles || []).slice(0, 60).map((profile) => ({
    id: profile.id,
    name: profile.name || `#${profile.id}`,
  })),
)

/* ---------- 导入 / 添加 ---------- */

const openLocalImport = () => {
  localFileInput.value?.click()
}

const openAddSheet = () => {
  addSheetOpen.value = true
}

const goCamera = () => {
  addSheetOpen.value = false
  router.push({ path: '/camera', query: { from: 'gallery' } })
}

const handleLocalImport = async (event) => {
  const files = event?.target?.files
  if (!files || files.length === 0) return

  const result = await galleryStore.importAssetsFromFiles(files, {
    category: localImportCategory.value,
  })

  if (event?.target) {
    event.target.value = ''
  }

  if (!result.ok) {
    if (result.reason === 'all_too_large' || result.skippedTooLargeCount > 0) {
      setFeedback(
        'warn',
        t(
          `文件超过大小上限（图片 ${formatBytesCompact(galleryImportLimitPolicy.image)} / GIF ${formatBytesCompact(galleryImportLimitPolicy.gif)}）。`,
          `File exceeds size limit (image ${formatBytesCompact(galleryImportLimitPolicy.image)} / GIF ${formatBytesCompact(galleryImportLimitPolicy.gif)}).`,
        ),
      )
      return
    }
    setFeedback('error', t('没有可导入的有效图片文件。', 'No valid image file was imported.'))
    return
  }

  const parts = [
    t(`已导入 ${result.importedCount} 项`, `${result.importedCount} imported`),
  ]
  if (result.skippedDuplicateCount > 0) {
    parts.push(t(`跳过重复 ${result.skippedDuplicateCount} 项`, `${result.skippedDuplicateCount} duplicates skipped`))
  }
  if (result.skippedUnsupportedCount > 0) {
    parts.push(
      t(`跳过不支持格式 ${result.skippedUnsupportedCount} 项`, `${result.skippedUnsupportedCount} unsupported skipped`),
    )
  }
  if (result.skippedTooLargeCount > 0) {
    parts.push(
      t(
        `跳过超限 ${result.skippedTooLargeCount} 项`,
        `${result.skippedTooLargeCount} oversize skipped`,
      ),
    )
  }
  setFeedback('success', parts.join(' · '))
}

const importFromUrl = () => {
  const result = galleryStore.importAssetFromUrl({
    url: urlForm.url,
    name: urlForm.name,
    category: urlForm.category,
  })
  if (!result.ok) {
    if (result.reason === 'duplicate') {
      setFeedback('warn', t('该 URL 已存在于素材库。', 'This URL already exists in the library.'))
      return
    }
    setFeedback('error', t('URL 无效，仅支持 http/https。', 'Invalid URL, only http/https is supported.'))
    return
  }

  urlForm.url = ''
  urlForm.name = ''
  addSheetOpen.value = false
  setFeedback('success', t('URL 素材导入成功。', 'URL asset imported.'))
}

/* ---------- 素材操作 ---------- */

const renameAsset = async (asset) => {
  const nextName = await promptDialog({
    title: t('重命名素材', 'Rename asset'),
    message: t('输入新的素材名称。', 'Input a new asset name.'),
    inputPlaceholder: t('素材名称', 'Asset name'),
    initialValue: asset?.name || '',
    confirmText: t('保存', 'Save'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (nextName == null) return
  const ok = galleryStore.renameAsset(asset.id, nextName)
  if (ok) {
    setFeedback('success', t('素材名称已更新。', 'Asset name updated.'))
  }
}

const moveAssetToCategory = (assetId, category) => {
  const ok = galleryStore.moveAssetToCategory(assetId, category)
  if (ok) {
    setFeedback('success', t('素材分类已更新。', 'Asset category updated.'))
  }
}

const createFolder = () => {
  const name = typeof folderForm.name === 'string' ? folderForm.name.trim() : ''
  if (!name) {
    setFeedback('warn', t('请先输入文件夹名称。', 'Please input folder name first.'))
    return
  }
  const created = galleryStore.createFolder({
    name,
    category: folderForm.category,
  })
  if (!created?.id) {
    setFeedback('error', t('文件夹创建失败，请重试。', 'Folder creation failed, please retry.'))
    return
  }
  folderForm.name = ''
  addSheetOpen.value = false
  activeTab.value = 'albums'
  setFeedback('success', t('相簿已创建。', 'Album created.'))
}

const renameFolder = async (folder) => {
  const nextName = await promptDialog({
    title: t('重命名相簿', 'Rename album'),
    message: t('输入新的相簿名称。', 'Input a new album name.'),
    inputPlaceholder: t('相簿名称', 'Album name'),
    initialValue: folder?.name || '',
    confirmText: t('保存', 'Save'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (nextName == null) return
  const ok = galleryStore.renameFolder(folder.id, nextName)
  if (ok) {
    setFeedback('success', t('相簿名称已更新。', 'Album name updated.'))
  }
}

const removeFolder = async (folder) => {
  const assetCount = Array.isArray(folder?.assetIds) ? folder.assetIds.length : 0
  const roleBindingHits = getFolderRoleBindingHits(folder.id)
  const confirmed = await confirmDialog({
    title: t('删除相簿', 'Delete album'),
    message: t(
      `确认删除相簿“${folder?.name || ''}”吗？`,
      `Delete album "${folder?.name || ''}"?`,
    ),
    details: [
      assetCount > 0
        ? t(
            `该相簿包含 ${assetCount} 张照片引用，删除后照片仍在图库中。`,
            `This album has ${assetCount} photo links. Deleting the album keeps the photos.`,
          )
        : t('删除后不可恢复。', 'Deletion cannot be undone.'),
      roleBindingHits.length > 0
        ? `${t('角色档案绑定', 'Role profile binding')}: ${roleBindingHits.map((hit) => `${hit.profileName}(${hit.slotLabel})`).join(', ')}`
        : '',
    ],
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return

  if (roleBindingHits.length > 0) {
    const secondConfirmed = await confirmDialog({
      title: t('解除绑定并继续', 'Unbind and continue'),
      message: t(
        '该相簿已绑定角色档案。继续删除将自动解除这些绑定，是否继续？',
        'This album is bound to role profiles. Continue will auto-unbind these links. Continue?',
      ),
      confirmText: t('继续删除', 'Continue'),
      cancelText: t('取消', 'Cancel'),
      tone: 'danger',
    })
    if (!secondConfirmed) return
  }

  const ok = galleryStore.removeFolder(folder.id)
  if (!ok) {
    setFeedback('error', t('相簿删除失败，请重试。', 'Album removal failed, please retry.'))
    return
  }
  if (albumView.value?.kind === 'folder' && albumView.value?.id === folder.id) {
    closeAlbum()
  }
  const clearedCount = clearDeletedFolderFromRoleProfiles(folder.id)
  setFeedback(
    'success',
    clearedCount > 0
      ? t(`相簿已删除，并自动清理 ${clearedCount} 个角色档案绑定。`, `Album removed and ${clearedCount} role bindings were cleaned.`)
      : t('相簿已删除。', 'Album removed.'),
  )
}

const addAssetToSelectedFolder = (asset, folderId) => {
  const selectedFolderId = typeof folderId === 'string' ? folderId.trim() : ''
  if (!selectedFolderId) {
    setFeedback('warn', t('请先选择目标相簿。', 'Please choose a target album first.'))
    return
  }

  const folder = galleryStore.findFolderById(selectedFolderId)
  if (!folder) {
    setFeedback('error', t('目标相簿不存在。', 'Target album not found.'))
    return
  }
  const alreadyIncluded = Array.isArray(folder.assetIds) && folder.assetIds.includes(asset.id)
  const ok = galleryStore.addAssetToFolder(selectedFolderId, asset.id)
  if (!ok) {
    setFeedback('error', t('加入相簿失败，请重试。', 'Failed to add into album, please retry.'))
    return
  }
  setFeedback(
    alreadyIncluded
      ? 'warn'
      : 'success',
    alreadyIncluded
      ? t('该照片已在目标相簿中。', 'This photo is already in target album.')
      : t('已加入相簿。', 'Added to album.'),
  )
}

const removeAssetFromFolder = (folderId, assetId) => {
  const ok = galleryStore.removeAssetFromFolder(folderId, assetId)
  if (!ok) {
    setFeedback('error', t('移除失败，请重试。', 'Failed to remove, please retry.'))
    return
  }
  setFeedback('success', t('已从相簿移除。', 'Removed from album.'))
}

const getFolderCoverAsset = (folder) => {
  const firstId = Array.isArray(folder?.assetIds) ? folder.assetIds[0] : ''
  return firstId ? galleryStore.findAssetById(firstId) : null
}

const ROLE_ASSET_PACK_SLOT_DEFS = [
  { key: 'wallpaperAssetIds', label: () => t('壁纸', 'Wallpaper') },
  { key: 'emojiAssetIds', label: () => t('表情', 'Emoji') },
  { key: 'referenceAssetIds', label: () => t('参考图', 'Reference') },
  { key: 'scenarioAssetIds', label: () => t('场景图', 'Scenario') },
]

const ROLE_FOLDER_SLOT_DEFS = [
  { key: 'profileImage', label: () => t('形象照', 'Profile image') },
  { key: 'dynamicMedia', label: () => t('动态图', 'Dynamic media') },
  { key: 'emojiPack', label: () => t('表情包', 'Emoji pack') },
  { key: 'imageReference', label: () => t('参考图', 'Reference image') },
]

const getAssetRoleBindingHits = (assetId) => {
  if (typeof assetId !== 'string' || !assetId.trim()) return []
  const normalizedAssetId = assetId.trim()
  const hits = []
  chatStore.roleProfiles.forEach((profile) => {
    ROLE_ASSET_PACK_SLOT_DEFS.forEach((slotDef) => {
      const list = Array.isArray(profile?.assetPack?.[slotDef.key]) ? profile.assetPack[slotDef.key] : []
      if (!list.includes(normalizedAssetId)) return
      hits.push({
        profileId: profile.id,
        profileName: profile.name || `#${profile.id}`,
        slotLabel: slotDef.label(),
      })
    })
  })
  return hits
}

const getFolderRoleBindingHits = (folderId) => {
  if (typeof folderId !== 'string' || !folderId.trim()) return []
  const normalizedFolderId = folderId.trim()
  const hits = []
  chatStore.roleProfiles.forEach((profile) => {
    ROLE_FOLDER_SLOT_DEFS.forEach((slotDef) => {
      const bindId =
        typeof profile?.assetFolderBindings?.[slotDef.key]?.folderId === 'string'
          ? profile.assetFolderBindings[slotDef.key].folderId.trim()
          : ''
      if (!bindId || bindId !== normalizedFolderId) return
      hits.push({
        profileId: profile.id,
        profileName: profile.name || `#${profile.id}`,
        slotLabel: slotDef.label(),
      })
    })
  })
  return hits
}

const clearDeletedAssetFromRoleProfiles = (assetId) => {
  if (typeof assetId !== 'string' || !assetId.trim()) return 0
  const normalizedAssetId = assetId.trim()
  let changedCount = 0

  chatStore.roleProfiles.forEach((profile) => {
    const nextPack = {}
    let changed = false
    ROLE_ASSET_PACK_SLOT_DEFS.forEach((slotDef) => {
      const current = Array.isArray(profile?.assetPack?.[slotDef.key]) ? profile.assetPack[slotDef.key] : []
      const next = current.filter((id) => id !== normalizedAssetId)
      if (next.length === current.length) return
      nextPack[slotDef.key] = next
      changed = true
    })
    if (!changed) return
    const ok = chatStore.updateRoleProfile(profile.id, { assetPack: nextPack })
    if (ok) changedCount += 1
  })

  return changedCount
}

const clearDeletedFolderFromRoleProfiles = (folderId) => {
  if (typeof folderId !== 'string' || !folderId.trim()) return 0
  const normalizedFolderId = folderId.trim()
  let changedCount = 0

  chatStore.roleProfiles.forEach((profile) => {
    const updates = {}
    let changed = false
    ROLE_FOLDER_SLOT_DEFS.forEach((slotDef) => {
      const current =
        typeof profile?.assetFolderBindings?.[slotDef.key]?.folderId === 'string'
          ? profile.assetFolderBindings[slotDef.key].folderId.trim()
          : ''
      if (!current || current !== normalizedFolderId) return
      updates[slotDef.key] = { folderId: '' }
      changed = true
    })
    if (!changed) return
    const ok = chatStore.updateRoleProfile(profile.id, {
      assetFolderBindings: updates,
    })
    if (ok) changedCount += 1
  })

  return changedCount
}

const removeAsset = async (asset) => {
  const guard = galleryStore.getAssetDeletionGuard(asset.id)
  const roleBindingHits = getAssetRoleBindingHits(asset.id)
  const usageText = guard.usages?.length
    ? `${t('当前被使用于', 'Currently used by')}: ${guard.usages.map((item) => item.label).join(', ')}`
    : ''
  const roleBindText = roleBindingHits.length
    ? `${t('角色档案绑定', 'Role profile binding')}: ${roleBindingHits.map((hit) => `${hit.profileName}(${hit.slotLabel})`).join(', ')}`
    : ''

  const confirmed = await confirmDialog({
    title: t('删除素材', 'Delete asset'),
    message: t(`确认删除素材“${asset.name}”吗？`, `Delete "${asset.name}"?`),
    details: [
      usageText,
      roleBindText,
      guard.blocked
        ? t('该素材正在被使用，确认后将强制删除。', 'This asset is in use and will be force removed.')
        : t('删除后不可恢复。', 'Deletion cannot be undone.'),
    ],
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!confirmed) return

  if (roleBindingHits.length > 0) {
    const secondConfirmed = await confirmDialog({
      title: t('解除绑定并继续', 'Unbind and continue'),
      message: t(
        '该素材已绑定角色档案。继续删除将自动解除这些绑定，是否继续？',
        'This asset is bound to role profiles. Continue will auto-unbind these links. Continue?',
      ),
      confirmText: t('继续删除', 'Continue'),
      cancelText: t('取消', 'Cancel'),
      tone: 'danger',
    })
    if (!secondConfirmed) return
  }

  const result = await galleryStore.removeAsset(asset.id, {
    force: guard.blocked,
  })
  if (!result.ok) {
    setFeedback('error', t('删除失败，请重试。', 'Delete failed, please try again.'))
    return
  }

  if (detailAssetId.value === asset.id) closeAssetDetail()
  const clearedCount = clearDeletedAssetFromRoleProfiles(asset.id)
  galleryStore.releaseAssetPreview(asset.id, GALLERY_ASSET_PREVIEW_SCOPE_ID)
  delete previewMap[asset.id]
  setFeedback(
    'success',
    clearedCount > 0
      ? t(`素材已删除，并自动清理 ${clearedCount} 个角色档案绑定。`, `Asset removed and ${clearedCount} role bindings were cleaned.`)
      : t('素材已删除。', 'Asset removed.'),
  )
}

const buildAssetBindingSummary = (asset) => {
  const guard = galleryStore.getAssetDeletionGuard(asset.id)
  const roleBindingHits = getAssetRoleBindingHits(asset.id)
  const usageText = guard.usages?.length
    ? `${t('当前被使用于', 'Currently used by')}: ${guard.usages.map((item) => item.label).join(', ')}`
    : ''
  const roleBindText = roleBindingHits.length
    ? `${t('角色档案绑定', 'Role profile binding')}: ${roleBindingHits.map((hit) => `${hit.profileName}(${hit.slotLabel})`).join(', ')}`
    : ''
  return {
    guard,
    roleBindingHits,
    usageText,
    roleBindText,
    hasBindingRisk: Boolean(roleBindingHits.length > 0 || guard.blocked),
  }
}

const formatRuntimeUsageLabel = (usage) => {
  if (!usage || typeof usage !== 'object') return ''
  if (usage.id === 'system:appearance.wallpaper') return t('外观壁纸', 'Appearance wallpaper')
  if (usage.id === 'map:visual.background') return t('地图背景', 'Map background')
  if (usage.moduleKey === 'chat') return usage.label || t('聊天会话', 'Chat thread')
  return usage.label || usage.targetKey || usage.moduleKey || ''
}

const getAssetUsageLabels = (asset) => {
  if (!asset?.id) return []
  const summary = buildAssetBindingSummary(asset)
  const labels = [
    ...(summary.guard.usages || []).map((usage) => formatRuntimeUsageLabel(usage)),
    ...summary.roleBindingHits.map((hit) => `${hit.profileName} · ${hit.slotLabel}`),
  ].filter(Boolean)
  return [...new Set(labels)]
}

const getAssetUsageChips = (asset) => getAssetUsageLabels(asset).slice(0, 3)

const assetUsageFilterTabs = computed(() => {
  const sourceAssets = categoryScopedAssets.value
  const usedCount = sourceAssets.filter((asset) => getAssetUsageLabels(asset).length > 0).length
  const unusedCount = Math.max(0, sourceAssets.length - usedCount)
  return [
    { key: 'all', label: t('全部', 'All'), count: sourceAssets.length },
    { key: 'in_use', label: t('已使用', 'Used'), count: usedCount },
    { key: 'unused', label: t('未使用', 'Unused'), count: unusedCount },
  ]
})

const visibleAssets = computed(() => {
  const sourceAssets = categoryScopedAssets.value
  if (activeAssetUsageFilter.value === 'in_use') {
    return sourceAssets.filter((asset) => getAssetUsageLabels(asset).length > 0)
  }
  if (activeAssetUsageFilter.value === 'unused') {
    return sourceAssets.filter((asset) => getAssetUsageLabels(asset).length === 0)
  }
  return sourceAssets
})

const gridAssets = computed(() => (albumView.value ? albumAssets.value : visibleAssets.value))

const confirmAssetReplace = async (asset, modeLabel) => {
  const summary = buildAssetBindingSummary(asset)
  const firstConfirmed = await confirmDialog({
    title: t('替换素材', 'Replace asset'),
    message: t(
      `确认替换素材“${asset.name}”(${modeLabel}) 吗？`,
      `Replace "${asset.name}" (${modeLabel})?`,
    ),
    details: [
      t('替换后素材 ID 与绑定关系会保留。', 'Asset ID and bindings will be preserved after replace.'),
      summary.usageText,
      summary.roleBindText,
    ],
    confirmText: t('继续', 'Continue'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (!firstConfirmed) return false

  if (!summary.hasBindingRisk) return true
  return confirmDialog({
    title: t('确认替换', 'Confirm replacement'),
    message: t(
      '该素材存在绑定/使用关系。确认继续替换？',
      'This asset is bound/in use. Confirm replacement?',
    ),
    confirmText: t('确认替换', 'Replace'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
}

const replaceAssetByUrl = async (asset) => {
  if (!asset?.id) return
  const nextUrl = await promptDialog({
    title: t('URL 替换', 'Replace by URL'),
    message: t('输入新的 URL（仅支持 http/https）。', 'Input a new URL (http/https only).'),
    inputPlaceholder: 'https://',
    initialValue: asset.sourceType === 'url' ? asset.sourceUrl || '' : '',
    confirmText: t('保存并替换', 'Save and replace'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
    inputRequired: true,
    inputRequiredMessage: t('请先输入 URL。', 'Please enter a URL first.'),
  })
  if (nextUrl == null) return
  if (!(await confirmAssetReplace(asset, t('URL 替换', 'URL replace')))) return

  const result = await galleryStore.replaceAssetFromUrl(asset.id, {
    url: nextUrl,
  })
  if (!result.ok) {
    if (result.reason === 'invalid_url') {
      setFeedback('error', t('URL 无效，仅支持 http/https。', 'Invalid URL, only http/https is supported.'))
      return
    }
    if (result.reason === 'duplicate') {
      setFeedback('warn', t('该素材与现有素材重复，替换已取消。', 'Duplicate asset found, replacement canceled.'))
      return
    }
    setFeedback('error', t('替换失败，请重试。', 'Replacement failed, please retry.'))
    return
  }
  previewMap[asset.id] = ''
  void hydrateAssetPreview(asset.id)
  setFeedback('success', t('素材已替换（URL）。', 'Asset replaced (URL).'))
}

const openReplaceAssetFile = (asset) => {
  if (!asset?.id) return
  void (async () => {
    if (!(await confirmAssetReplace(asset, t('本地文件替换', 'Local file replace')))) return
    replaceTargetAssetId.value = asset.id
    replaceFileInput.value?.click()
  })()
}

const handleReplaceFileChange = async (event) => {
  const file = event?.target?.files?.[0]
  const assetId = replaceTargetAssetId.value
  replaceTargetAssetId.value = ''
  if (event?.target) event.target.value = ''
  if (!file || !assetId) return

  const result = await galleryStore.replaceAssetFromFile(assetId, file, {
    renameToFileName: false,
  })
  if (!result.ok) {
    if (result.reason === 'unsupported_file') {
      setFeedback('error', t('文件格式不支持，仅允许 png/jpg/webp/gif。', 'Unsupported file type. Only png/jpg/webp/gif are allowed.'))
      return
    }
    if (result.reason === 'too_large') {
      setFeedback(
        'warn',
        t(
          `文件超过大小上限（${formatBytesCompact(result.maxBytes)}）。`,
          `File exceeds size limit (${formatBytesCompact(result.maxBytes)}).`,
        ),
      )
      return
    }
    if (result.reason === 'duplicate') {
      setFeedback('warn', t('该素材与现有素材重复，替换已取消。', 'Duplicate asset found, replacement canceled.'))
      return
    }
    setFeedback('error', t('文件替换失败，请重试。', 'File replacement failed, please retry.'))
    return
  }

  previewMap[assetId] = ''
  void hydrateAssetPreview(assetId)
  setFeedback('success', t('素材已替换（本地文件）。', 'Asset replaced (local file).'))
}

/* ---------- 预览 ---------- */

const hydrateAssetPreview = async (assetId) => {
  if (!assetId || previewMap[assetId]) return
  const previewUrl = await galleryStore.getAssetPreviewUrl(assetId, {
    scopeId: GALLERY_ASSET_PREVIEW_SCOPE_ID,
  })
  previewMap[assetId] = previewUrl || ''
}

const previewTargets = computed(() => {
  const targets = [...gridAssets.value]
  personAlbums.value.forEach((album) => album.cover && targets.push(album.cover))
  placeAlbums.value.forEach((album) => album.cover && targets.push(album.cover))
  allFolders.value.forEach((folder) => {
    const cover = getFolderCoverAsset(folder)
    if (cover) targets.push(cover)
  })
  if (detailAsset.value) targets.push(detailAsset.value)
  const seen = new Set()
  return targets.filter((asset) => {
    if (!asset?.id || seen.has(asset.id)) return false
    seen.add(asset.id)
    return true
  })
})

watch(
  previewTargets,
  (list) => {
    const nextIds = new Set(list.map((item) => item.id))
    list.forEach((asset) => {
      void hydrateAssetPreview(asset.id)
    })
    Object.keys(previewMap).forEach((assetId) => {
      if (!nextIds.has(assetId)) {
        galleryStore.releaseAssetPreview(assetId, GALLERY_ASSET_PREVIEW_SCOPE_ID)
        delete previewMap[assetId]
      }
    })
  },
  { immediate: true },
)

onMounted(() => {
  const personId = typeof route.query.person === 'string' ? route.query.person : ''
  if (personId) {
    activeTab.value = 'albums'
    albumView.value = { kind: 'person', id: personId }
  }
})

onBeforeUnmount(() => {
  Object.keys(previewMap).forEach((assetId) => {
    galleryStore.releaseAssetPreview(assetId, GALLERY_ASSET_PREVIEW_SCOPE_ID)
  })
  galleryStore.releaseAssetPreviewScope(GALLERY_ASSET_PREVIEW_SCOPE_ID)
})
</script>

<template>
  <div class="gallery-shell">
    <header class="gallery-topbar">
      <button type="button" class="gallery-nav" :aria-label="t('返回', 'Back')" @click="goHome">
        <i class="fas fa-chevron-left"></i>
      </button>
      <div class="gallery-brand">
        <small>PHOTOS</small>
        <h1>{{ t('相册', 'Photos') }}</h1>
      </div>
      <button
        type="button"
        class="gallery-add-button"
        :aria-label="t('添加', 'Add')"
        data-testid="gallery-open-add"
        @click="openAddSheet"
      >
        <i class="fas fa-plus"></i>
      </button>
    </header>

    <nav class="gallery-tabs">
      <button
        type="button"
        :class="['gallery-tab', { 'is-active': activeTab === 'library' && !albumView }]"
        data-testid="gallery-tab-library"
        @click="activeTab = 'library'; closeAlbum()"
      >
        {{ t('图库', 'Library') }}
      </button>
      <button
        type="button"
        :class="['gallery-tab', { 'is-active': activeTab === 'albums' || albumView }]"
        data-testid="gallery-tab-albums"
        @click="activeTab = 'albums'; closeAlbum()"
      >
        {{ t('相簿', 'Albums') }}
      </button>
    </nav>

    <p v-if="feedback.text" class="gallery-feedback" :class="`is-${feedback.type || 'info'}`">
      {{ feedback.text }}
    </p>

    <!-- 图库 -->
    <main v-if="!albumView && activeTab === 'library'" class="gallery-scroll">
      <div class="gallery-chip-row">
        <button
          v-for="tab in categoryTabs"
          :key="tab.key"
          type="button"
          :class="['gallery-chip', { 'is-active': activeCategory === tab.key }]"
          @click="activeCategory = tab.key"
        >
          {{ tab.label }} · {{ tab.count }}
        </button>
      </div>
      <div class="gallery-chip-row is-sub">
        <button
          v-for="tab in assetUsageFilterTabs"
          :key="`usage-${tab.key}`"
          type="button"
          :class="['gallery-chip', 'is-small', { 'is-active': activeAssetUsageFilter === tab.key }]"
          @click="activeAssetUsageFilter = tab.key"
        >
          {{ tab.label }} · {{ tab.count }}
        </button>
      </div>

      <div v-if="gridAssets.length === 0" class="gallery-empty">
        <span class="gallery-empty__frame"><i class="fas fa-images"></i></span>
        <strong>{{ t('还没有照片', 'No photos yet') }}</strong>
        <p>{{ t('点右上角 + 上传、从链接添加，或去相机拍一张。', 'Tap + to upload, add from a link, or shoot with Camera.') }}</p>
      </div>

      <div v-else class="gallery-grid">
        <button
          v-for="asset in gridAssets"
          :key="asset.id"
          type="button"
          class="gallery-cell"
          @click="openAssetDetail(asset)"
        >
          <AssetThumbnailOption
            :asset="asset"
            :preview-url="previewMap[asset.id]"
            variant="square"
            :interactive="false"
            :show-name="false"
          />
          <span v-if="getAssetUsageChips(asset).length > 0" class="gallery-cell__badge">
            <i class="fas fa-link"></i>
          </span>
        </button>
      </div>
    </main>

    <!-- 相簿 -->
    <main v-else-if="!albumView" class="gallery-scroll">
      <section v-if="personAlbums.length > 0" class="gallery-album-section">
        <h2>{{ t('人物', 'People') }}</h2>
        <div class="gallery-people-row">
          <button
            v-for="album in personAlbums"
            :key="album.personId"
            type="button"
            class="gallery-person-card"
            @click="openAlbum('person', album.personId)"
          >
            <span class="gallery-person-card__cover">
              <img v-if="album.cover && previewMap[album.cover.id]" :src="previewMap[album.cover.id]" :alt="album.name" />
              <i v-else class="fas fa-user"></i>
            </span>
            <strong>{{ album.name }}</strong>
            <small>{{ album.count }} {{ t('张', 'photos') }}</small>
          </button>
        </div>
      </section>

      <section v-if="placeAlbums.length > 0" class="gallery-album-section">
        <h2>{{ t('地点', 'Places') }}</h2>
        <div class="gallery-album-grid">
          <button
            v-for="album in placeAlbums"
            :key="album.key"
            type="button"
            class="gallery-album-card"
            @click="openAlbum('place', album.key)"
          >
            <span class="gallery-album-card__cover">
              <img v-if="album.cover && previewMap[album.cover.id]" :src="previewMap[album.cover.id]" :alt="album.label" />
              <i v-else class="fas fa-location-dot"></i>
            </span>
            <strong>{{ album.label }}</strong>
            <small>{{ album.count }} {{ t('张', 'photos') }}</small>
          </button>
        </div>
      </section>

      <section class="gallery-album-section">
        <h2>{{ t('分类', 'Categories') }}</h2>
        <div class="gallery-album-grid">
          <button
            v-for="tab in categoryTabs.filter((tab) => tab.key !== 'all')"
            :key="tab.key"
            type="button"
            class="gallery-album-card"
            @click="openCategoryFromAlbums(tab.key)"
          >
            <span class="gallery-album-card__cover is-icon">
              <i :class="tab.key === 'wallpaper' ? 'fas fa-image' : tab.key === 'emoji' ? 'fas fa-face-smile' : tab.key === 'scenario' ? 'fas fa-mountain-sun' : 'fas fa-book-open'"></i>
            </span>
            <strong>{{ tab.label }}</strong>
            <small>{{ tab.count }} {{ t('张', 'photos') }}</small>
          </button>
        </div>
      </section>

      <section class="gallery-album-section">
        <div class="gallery-album-section__head">
          <h2>{{ t('我的相簿', 'My Albums') }}</h2>
          <button type="button" class="gallery-mini-action" @click="openAddSheet">
            <i class="fas fa-plus"></i> {{ t('新建', 'New') }}
          </button>
        </div>
        <div v-if="allFolders.length === 0" class="gallery-empty is-compact">
          <p>{{ t('还没有相簿。点「新建」创建一个。', 'No albums yet. Tap New to create one.') }}</p>
        </div>
        <div v-else class="gallery-album-grid">
          <div v-for="folder in allFolders" :key="folder.id" class="gallery-album-card is-folder">
            <button type="button" class="gallery-album-card__open" @click="openAlbum('folder', folder.id)">
              <span class="gallery-album-card__cover">
                <img
                  v-if="getFolderCoverAsset(folder) && previewMap[getFolderCoverAsset(folder).id]"
                  :src="previewMap[getFolderCoverAsset(folder).id]"
                  :alt="folder.name"
                />
                <i v-else class="fas fa-folder"></i>
              </span>
              <strong>{{ folder.name }}</strong>
              <small>{{ Array.isArray(folder.assetIds) ? folder.assetIds.length : 0 }} {{ t('张', 'photos') }}</small>
            </button>
            <span class="gallery-album-card__tools">
              <button type="button" :aria-label="t('重命名', 'Rename')" @click="renameFolder(folder)">
                <i class="fas fa-pen"></i>
              </button>
              <button type="button" :aria-label="t('删除', 'Delete')" @click="removeFolder(folder)">
                <i class="fas fa-trash"></i>
              </button>
            </span>
          </div>
        </div>
      </section>
    </main>

    <!-- 相簿钻取 -->
    <main v-else class="gallery-scroll">
      <div class="gallery-album-head">
        <button type="button" class="gallery-mini-action" @click="closeAlbum">
          <i class="fas fa-chevron-left"></i> {{ t('相簿', 'Albums') }}
        </button>
        <h2>{{ albumTitle }}</h2>
        <small>{{ albumAssets.length }} {{ t('张', 'photos') }}</small>
      </div>

      <div v-if="albumAssets.length === 0" class="gallery-empty">
        <span class="gallery-empty__frame"><i class="fas fa-images"></i></span>
        <p>{{ t('这里还没有照片。', 'Nothing here yet.') }}</p>
      </div>

      <div v-else class="gallery-grid">
        <div v-for="asset in albumAssets" :key="asset.id" class="gallery-cell-wrap">
          <button type="button" class="gallery-cell" @click="openAssetDetail(asset)">
            <AssetThumbnailOption
              :asset="asset"
              :preview-url="previewMap[asset.id]"
              variant="square"
              :interactive="false"
              :show-name="false"
            />
          </button>
          <button
            v-if="albumView.kind === 'folder'"
            type="button"
            class="gallery-cell__remove"
            :aria-label="t('从相簿移除', 'Remove from album')"
            @click="removeAssetFromFolder(albumView.id, asset.id)"
          >
            <i class="fas fa-xmark"></i>
          </button>
        </div>
      </div>
    </main>

    <!-- 添加弹层 -->
    <div v-if="addSheetOpen" class="gallery-sheet-backdrop" @click="addSheetOpen = false"></div>
    <section v-if="addSheetOpen" class="gallery-sheet" role="dialog" :aria-label="t('添加', 'Add')">
      <div class="gallery-sheet__handle"></div>
      <div class="gallery-sheet__head">
        <h3>{{ t('添加到相册', 'Add to Photos') }}</h3>
        <button type="button" class="gallery-sheet__close" :aria-label="t('关闭', 'Close')" @click="addSheetOpen = false">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <div class="gallery-sheet__block">
        <p class="gallery-sheet__label">{{ t('本地上传', 'Upload') }}</p>
        <div class="gallery-sheet__row">
          <select v-model="localImportCategory" class="gallery-field">
            <option v-for="categoryKey in GALLERY_ASSET_CATEGORIES" :key="categoryKey" :value="categoryKey">
              {{ categoryLabel(categoryKey) }}
            </option>
          </select>
          <button type="button" class="gallery-primary-action" @click="openLocalImport">
            <i class="fas fa-upload"></i> {{ t('选择照片或 GIF', 'Choose photos or GIFs') }}
          </button>
        </div>
        <small class="gallery-sheet__hint">{{ importLimitHint }}</small>
      </div>

      <div class="gallery-sheet__block">
        <p class="gallery-sheet__label">{{ t('从链接添加', 'Add from Link') }}</p>
        <input v-model="urlForm.url" type="url" class="gallery-field" :placeholder="t('https://example.com/image.png', 'https://example.com/image.png')" />
        <div class="gallery-sheet__row">
          <input v-model="urlForm.name" type="text" class="gallery-field" :placeholder="t('可选名称', 'Optional name')" />
          <select v-model="urlForm.category" class="gallery-field">
            <option v-for="categoryKey in GALLERY_ASSET_CATEGORIES" :key="`url-${categoryKey}`" :value="categoryKey">
              {{ categoryLabel(categoryKey) }}
            </option>
          </select>
        </div>
        <button type="button" class="gallery-primary-action" @click="importFromUrl">
          {{ t('添加链接素材', 'Add link asset') }}
        </button>
      </div>

      <div class="gallery-sheet__block">
        <p class="gallery-sheet__label">{{ t('拍摄', 'Camera') }}</p>
        <button type="button" class="gallery-primary-action is-camera" @click="goCamera">
          <i class="fas fa-camera"></i> {{ t('去相机拍一张', 'Open Camera') }}
        </button>
      </div>

      <div class="gallery-sheet__block">
        <p class="gallery-sheet__label">{{ t('新建相簿', 'New album') }}</p>
        <div class="gallery-sheet__row">
          <input v-model="folderForm.name" type="text" class="gallery-field" :placeholder="t('相簿名称', 'Album name')" />
          <select v-model="folderForm.category" class="gallery-field">
            <option value="all">{{ t('全部类型', 'All types') }}</option>
            <option v-for="categoryKey in GALLERY_ASSET_CATEGORIES" :key="`folder-${categoryKey}`" :value="categoryKey">
              {{ categoryLabel(categoryKey) }}
            </option>
          </select>
        </div>
        <button type="button" class="gallery-primary-action" @click="createFolder">
          {{ t('创建相簿', 'Create album') }}
        </button>
      </div>
    </section>

    <!-- 图片详情 -->
    <div v-if="detailAsset" class="gallery-sheet-backdrop" @click="closeAssetDetail"></div>
    <section v-if="detailAsset" class="gallery-sheet is-detail" role="dialog" :aria-label="detailAsset.name">
      <div class="gallery-sheet__handle"></div>
      <div class="gallery-sheet__head">
        <h3>{{ detailAsset.name }}</h3>
        <button type="button" class="gallery-sheet__close" :aria-label="t('关闭', 'Close')" @click="closeAssetDetail">
          <i class="fas fa-xmark"></i>
        </button>
      </div>

      <div class="gallery-detail__preview">
        <img v-if="previewMap[detailAsset.id]" :src="previewMap[detailAsset.id]" :alt="detailAsset.name" />
        <span v-else><i class="fas fa-image"></i></span>
      </div>

      <div class="gallery-detail__meta">
        <span class="gallery-chip is-static">{{ categoryLabel(detailAsset.category) }}</span>
        <span class="gallery-chip is-static">
          {{ detailAsset.sourceType === 'file' ? t('本地文件', 'Local file') : t('URL', 'URL') }}
        </span>
        <AssetStatusBadge
          v-for="label in getAssetUsageChips(detailAsset)"
          :key="`detail-usage-${label}`"
          :label="label"
          icon="fas fa-link"
        />
      </div>

      <div class="gallery-sheet__block">
        <p class="gallery-sheet__label">{{ t('标记人物', 'Tag people') }}</p>
        <div v-if="personOptions.length === 0" class="gallery-sheet__hint">
          {{ t('还没有角色档案，先到联系人里创建。', 'No role profiles yet. Create one in Contacts first.') }}
        </div>
        <div v-else class="gallery-person-picker">
          <button
            v-for="option in personOptions"
            :key="option.id"
            type="button"
            :class="['gallery-person-pick', { 'is-on': isDetailPersonOn(option.id) }]"
            :aria-pressed="isDetailPersonOn(option.id)"
            @click="toggleDetailPerson(option.id)"
          >
            <i :class="isDetailPersonOn(option.id) ? 'fas fa-circle-check' : 'far fa-circle'"></i>
            {{ option.name }}
          </button>
        </div>
      </div>

      <div class="gallery-sheet__block">
        <p class="gallery-sheet__label">{{ t('标记地点', 'Tag place') }}</p>
        <div class="gallery-sheet__row">
          <select
            class="gallery-field"
            :value="detailPlaceSelectValue"
            @change="setDetailPlaceFromMap($event.target.value)"
          >
            <option value="">{{ t('选择地图地点', 'Choose a map place') }}</option>
            <option v-for="place in mapPlaceOptions" :key="place.id" :value="place.id">
              {{ place.label }}
            </option>
          </select>
          <button
            v-if="detailAsset.placeId || detailAsset.placeText"
            type="button"
            class="gallery-mini-action"
            @click="clearDetailPlace"
          >
            {{ t('清除', 'Clear') }}
          </button>
        </div>
        <input
          v-if="!detailAsset.placeId"
          type="text"
          class="gallery-field"
          :value="detailAsset.placeText"
          :placeholder="t('或输入地点名（如：练习室）', 'Or type a place name')"
          data-testid="gallery-detail-place-text"
          @change="setDetailPlaceText($event.target.value)"
        />
      </div>

      <div class="gallery-sheet__block">
        <p class="gallery-sheet__label">{{ t('管理', 'Manage') }}</p>
        <div class="gallery-sheet__row">
          <select class="gallery-field" :value="detailAsset.category" @change="moveAssetToCategory(detailAsset.id, $event.target.value)">
            <option v-for="categoryKey in GALLERY_ASSET_CATEGORIES" :key="`detail-cat-${categoryKey}`" :value="categoryKey">
              {{ categoryLabel(categoryKey) }}
            </option>
          </select>
          <button type="button" class="gallery-mini-action" @click="renameAsset(detailAsset)">
            {{ t('改名', 'Rename') }}
          </button>
        </div>
        <div v-if="allFolderOptions.length > 0" class="gallery-sheet__row">
          <select class="gallery-field" @change="addAssetToSelectedFolder(detailAsset, $event.target.value); $event.target.value = ''">
            <option value="">{{ t('加入相簿…', 'Add to album…') }}</option>
            <option v-for="folder in allFolderOptions" :key="`detail-folder-${folder.id}`" :value="folder.id">
              {{ folder.name }}
            </option>
          </select>
        </div>
        <div class="gallery-detail__tools">
          <button type="button" class="gallery-mini-action" @click="replaceAssetByUrl(detailAsset)">
            {{ t('替换 URL', 'Replace URL') }}
          </button>
          <button type="button" class="gallery-mini-action" @click="openReplaceAssetFile(detailAsset)">
            {{ t('替换文件', 'Replace file') }}
          </button>
          <button type="button" class="gallery-mini-action is-danger" @click="removeAsset(detailAsset)">
            {{ t('删除', 'Delete') }}
          </button>
        </div>
      </div>
    </section>

    <input
      ref="localFileInput"
      type="file"
      class="gallery-hidden-input"
      accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
      multiple
      @change="handleLocalImport"
    />
    <input
      ref="replaceFileInput"
      type="file"
      class="gallery-hidden-input"
      accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
      @change="handleReplaceFileChange"
    />
  </div>
</template>

<style scoped>
.gallery-shell {
  --gallery-ink: var(--system-text);
  --gallery-muted: var(--system-text-muted);
  --gallery-soft: var(--system-text-soft);
  --gallery-line: var(--system-subtle-border);
  --gallery-blue: #0a84ff;
  --gallery-blue-soft: rgba(10, 132, 255, 0.1);
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--system-page-bg);
  color: var(--gallery-ink);
}

.gallery-topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(40px + env(safe-area-inset-top)) 16px 10px;
}

.gallery-nav,
.gallery-add-button {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--gallery-line);
  border-radius: 50%;
  color: var(--gallery-ink);
  background: var(--system-control-bg);
  font: inherit;
  cursor: pointer;
}

.gallery-add-button {
  border: 0;
  color: #fff;
  background: var(--gallery-blue);
  box-shadow: 0 8px 18px rgba(10, 132, 255, 0.28);
}

.gallery-brand {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.gallery-brand small {
  display: block;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.24em;
  color: var(--gallery-blue);
}

.gallery-brand h1 {
  margin: 1px 0 0;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.1;
}

.gallery-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 4px 16px 0;
  padding: 3px;
  border-radius: 12px;
  background: var(--system-surface-muted);
}

.gallery-tab {
  min-height: 32px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--gallery-muted);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.gallery-tab.is-active {
  background: var(--system-elevated-bg);
  color: var(--gallery-ink);
  box-shadow: var(--system-shadow-control);
}

.gallery-feedback {
  margin: 8px 16px 0;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
}

.gallery-feedback.is-success { color: var(--system-success); background: var(--system-success-soft); }
.gallery-feedback.is-warn { color: var(--system-warning); background: var(--system-warning-soft); }
.gallery-feedback.is-error { color: var(--system-danger); background: var(--system-danger-soft); }
.gallery-feedback.is-info { color: var(--gallery-muted); background: var(--system-surface-muted); }

.gallery-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px calc(24px + env(safe-area-inset-bottom));
}

.gallery-chip-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}

.gallery-chip-row.is-sub {
  margin-top: 2px;
}

.gallery-chip-row::-webkit-scrollbar {
  display: none;
}

.gallery-chip {
  flex: 0 0 auto;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid var(--gallery-line);
  border-radius: 999px;
  background: var(--system-control-bg);
  color: var(--gallery-muted);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.gallery-chip.is-small {
  min-height: 26px;
  font-size: 11px;
}

.gallery-chip.is-active {
  border-color: var(--gallery-blue);
  color: var(--gallery-blue);
  background: var(--gallery-blue-soft);
}

.gallery-chip.is-static {
  cursor: default;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3px;
  margin-top: 10px;
}

.gallery-cell {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 0;
  border-radius: 10px;
  overflow: hidden;
  background: var(--system-surface-muted);
  cursor: pointer;
}

.gallery-cell__badge {
  position: absolute;
  right: 5px;
  bottom: 5px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: #fff;
  background: rgba(29, 29, 31, 0.55);
  font-size: 8px;
}

.gallery-cell-wrap {
  position: relative;
}

.gallery-cell__remove {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: rgba(29, 29, 31, 0.55);
  cursor: pointer;
}

.gallery-empty {
  display: grid;
  place-items: center;
  gap: 8px;
  padding: 56px 24px;
  text-align: center;
  color: var(--gallery-muted);
}

.gallery-empty.is-compact {
  padding: 18px;
}

.gallery-empty__frame {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  border: 2px dashed var(--system-control-border);
  border-radius: 18px;
  color: var(--gallery-blue);
  font-size: 24px;
}

.gallery-empty strong {
  color: var(--gallery-ink);
}

.gallery-empty p {
  margin: 0;
  max-width: 30ch;
  font-size: 12px;
  line-height: 1.55;
}

.gallery-album-section {
  margin-top: 18px;
}

.gallery-album-section:first-child {
  margin-top: 4px;
}

.gallery-album-section h2 {
  margin: 0 0 10px;
  font-size: 17px;
  font-weight: 800;
}

.gallery-album-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.gallery-album-section__head h2 {
  margin: 0;
}

.gallery-people-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}

.gallery-people-row::-webkit-scrollbar {
  display: none;
}

.gallery-person-card {
  display: grid;
  justify-items: center;
  gap: 5px;
  width: 76px;
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  font: inherit;
  cursor: pointer;
}

.gallery-person-card__cover {
  display: grid;
  place-items: center;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--system-surface-muted);
  color: var(--gallery-muted);
}

.gallery-person-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-person-card strong {
  max-width: 76px;
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-person-card small {
  color: var(--gallery-soft);
  font-size: 10px;
}

.gallery-album-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.gallery-album-card {
  position: relative;
  display: grid;
  gap: 5px;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.gallery-album-card__cover {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1.25;
  border-radius: 14px;
  overflow: hidden;
  background: var(--system-surface-muted);
  color: var(--gallery-muted);
  font-size: 22px;
}

.gallery-album-card__cover.is-icon {
  color: var(--gallery-blue);
  background: var(--gallery-blue-soft);
}

.gallery-album-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-album-card strong {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-album-card small {
  color: var(--gallery-soft);
  font-size: 11px;
}

.gallery-album-card.is-folder {
  cursor: default;
}

.gallery-album-card__open {
  display: grid;
  gap: 5px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.gallery-album-card__tools {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 5px;
}

.gallery-album-card__tools button {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  color: #fff;
  background: rgba(29, 29, 31, 0.5);
  font-size: 10px;
  cursor: pointer;
}

.gallery-album-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 8px;
}

.gallery-album-head h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 800;
}

.gallery-album-head small {
  color: var(--gallery-soft);
  font-size: 11px;
}

.gallery-mini-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--gallery-line);
  border-radius: 9px;
  color: var(--gallery-blue);
  background: var(--system-control-bg);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.gallery-mini-action.is-danger {
  color: var(--system-danger);
}

.gallery-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(29, 29, 31, 0.32);
  backdrop-filter: blur(8px);
}

.gallery-sheet {
  position: fixed;
  left: max(12px, env(safe-area-inset-left));
  right: max(12px, env(safe-area-inset-right));
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 41;
  display: grid;
  gap: 12px;
  width: min(560px, calc(100% - 24px));
  max-height: min(640px, 82dvh);
  margin: 0 auto;
  padding: 10px 16px calc(16px + env(safe-area-inset-bottom));
  overflow-y: auto;
  border: 1px solid var(--gallery-line);
  border-radius: 22px;
  background: var(--system-elevated-bg);
  box-shadow: var(--system-shadow-strong);
}

.gallery-sheet__handle {
  width: 40px;
  height: 5px;
  border-radius: 999px;
  justify-self: center;
  background: var(--system-text-soft);
}

.gallery-sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.gallery-sheet__head h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.gallery-sheet__close {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--gallery-line);
  border-radius: 50%;
  color: var(--gallery-muted);
  background: var(--system-control-bg);
  cursor: pointer;
  font: inherit;
}

.gallery-sheet__block {
  display: grid;
  gap: 8px;
}

.gallery-sheet__label {
  margin: 0;
  color: var(--gallery-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.gallery-sheet__hint {
  color: var(--gallery-soft);
  font-size: 11px;
}

.gallery-sheet__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.gallery-field {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--gallery-line);
  border-radius: 10px;
  outline: none;
  color: var(--gallery-ink);
  background: var(--system-control-bg);
  font: inherit;
  font-size: 13px;
}

.gallery-primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: var(--gallery-blue);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.gallery-primary-action.is-camera {
  color: var(--gallery-ink);
  background: var(--system-surface-muted);
}

.gallery-hidden-input {
  display: none;
}

.gallery-detail__preview {
  display: grid;
  place-items: center;
  max-height: 280px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--system-surface-muted);
  color: var(--gallery-soft);
  font-size: 30px;
}

.gallery-detail__preview img {
  width: 100%;
  max-height: 280px;
  object-fit: contain;
}

.gallery-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.gallery-person-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 132px;
  overflow-y: auto;
}

.gallery-person-pick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 11px;
  border: 1px solid var(--gallery-line);
  border-radius: 999px;
  color: var(--gallery-muted);
  background: var(--system-control-bg);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.gallery-person-pick.is-on {
  border-color: var(--gallery-blue);
  color: var(--gallery-blue);
  background: var(--gallery-blue-soft);
}

.gallery-detail__tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
