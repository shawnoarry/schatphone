<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import { formatBytesCompact, summarizeMediaLimitPolicy, MEDIA_SIZE_SCENE } from '../lib/media-policy'
import { pushReturnTarget } from '../lib/navigation-return'
import { useChatStore } from '../stores/chat'
import { GALLERY_ASSET_CATEGORIES, useGalleryStore } from '../stores/gallery'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import AssetThumbnailOption from '../components/assets/AssetThumbnailOption.vue'

const router = useRouter()
const route = useRoute()
const galleryStore = useGalleryStore()
const chatStore = useChatStore()
const { t } = useI18n()
const { confirmDialog, promptDialog } = useDialog()

const activeCategory = ref('all')
const activeAssetUsageFilter = ref('all')
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
const previewMap = reactive({})
const GALLERY_ASSET_PREVIEW_SCOPE_ID = 'gallery-view'
const activeFolderCategory = ref('all')
const assetFolderDraftMap = reactive({})
const folderForm = reactive({
  name: '',
  category: 'all',
})

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
const folderCategoryTabs = computed(() => [
  { key: 'all', label: t('全部文件夹', 'All folders') },
  ...GALLERY_ASSET_CATEGORIES.map((key) => ({
    key,
    label: categoryLabel(key),
  })),
])
const visibleFolders = computed(() => galleryStore.listFolders({ category: activeFolderCategory.value }))
const allFolderOptions = computed(() => galleryStore.listFolders({ category: 'all' }).slice(0, 200))
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

const openLocalImport = () => {
  localFileInput.value?.click()
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
  setFeedback('success', t('URL 素材导入成功。', 'URL asset imported.'))
}

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
  setFeedback('success', t('文件夹已创建。', 'Folder created.'))
}

const renameFolder = async (folder) => {
  const nextName = await promptDialog({
    title: t('重命名文件夹', 'Rename folder'),
    message: t('输入新的文件夹名称。', 'Input a new folder name.'),
    inputPlaceholder: t('文件夹名称', 'Folder name'),
    initialValue: folder?.name || '',
    confirmText: t('保存', 'Save'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (nextName == null) return
  const ok = galleryStore.renameFolder(folder.id, nextName)
  if (ok) {
    setFeedback('success', t('文件夹名称已更新。', 'Folder name updated.'))
  }
}

const updateFolderCategory = (folderId, category) => {
  const ok = galleryStore.setFolderCategory(folderId, category)
  if (ok) {
    setFeedback('success', t('文件夹分类已更新。', 'Folder category updated.'))
  }
}

const removeFolder = async (folder) => {
  const assetCount = Array.isArray(folder?.assetIds) ? folder.assetIds.length : 0
  const roleBindingHits = getFolderRoleBindingHits(folder.id)
  const confirmed = await confirmDialog({
    title: t('删除文件夹', 'Delete folder'),
    message: t(
      `确认删除文件夹“${folder?.name || ''}”吗？`,
      `Delete folder "${folder?.name || ''}"?`,
    ),
    details: [
      assetCount > 0
        ? t(
            `该文件夹包含 ${assetCount} 项素材引用，删除后不会删除素材本体。`,
            `This folder has ${assetCount} asset links. Deleting folder will not delete assets.`,
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
        '该文件夹已绑定角色档案。继续删除将自动解除这些绑定，是否继续？',
        'This folder is bound to role profiles. Continue will auto-unbind these links. Continue?',
      ),
      confirmText: t('继续删除', 'Continue'),
      cancelText: t('取消', 'Cancel'),
      tone: 'danger',
    })
    if (!secondConfirmed) return
  }

  const ok = galleryStore.removeFolder(folder.id)
  if (!ok) {
    setFeedback('error', t('文件夹删除失败，请重试。', 'Folder removal failed, please retry.'))
    return
  }
  const clearedCount = clearDeletedFolderFromRoleProfiles(folder.id)
  setFeedback(
    'success',
    clearedCount > 0
      ? t(`文件夹已删除，并自动清理 ${clearedCount} 个角色档案绑定。`, `Folder removed and ${clearedCount} role bindings were cleaned.`)
      : t('文件夹已删除。', 'Folder removed.'),
  )
}

const addAssetToSelectedFolder = (asset) => {
  const selectedFolderId =
    typeof assetFolderDraftMap[asset.id] === 'string' ? assetFolderDraftMap[asset.id].trim() : ''
  if (!selectedFolderId) {
    setFeedback('warn', t('请先选择目标文件夹。', 'Please choose a target folder first.'))
    return
  }

  const folder = galleryStore.findFolderById(selectedFolderId)
  if (!folder) {
    setFeedback('error', t('目标文件夹不存在。', 'Target folder not found.'))
    return
  }
  const alreadyIncluded = Array.isArray(folder.assetIds) && folder.assetIds.includes(asset.id)
  const ok = galleryStore.addAssetToFolder(selectedFolderId, asset.id)
  if (!ok) {
    setFeedback('error', t('加入文件夹失败，请重试。', 'Failed to add into folder, please retry.'))
    return
  }
  assetFolderDraftMap[asset.id] = ''
  setFeedback(
    alreadyIncluded
      ? 'warn'
      : 'success',
    alreadyIncluded
      ? t('该素材已在目标文件夹中。', 'This asset is already in target folder.')
      : t('素材已加入文件夹。', 'Asset added to folder.'),
  )
}

const removeAssetFromFolder = (folderId, assetId) => {
  const ok = galleryStore.removeAssetFromFolder(folderId, assetId)
  if (!ok) {
    setFeedback('error', t('移除失败，请重试。', 'Failed to remove, please retry.'))
    return
  }
  setFeedback('success', t('素材已从文件夹移除。', 'Asset removed from folder.'))
}

const getFolderPreviewAssets = (folder) => {
  const sourceIds = Array.isArray(folder?.assetIds) ? folder.assetIds.slice(0, 8) : []
  return sourceIds
    .map((assetId) => galleryStore.findAssetById(assetId))
    .filter(Boolean)
}

const getFolderAssetCount = (folder) => (Array.isArray(folder?.assetIds) ? folder.assetIds.length : 0)
const getFolderPreviewOverflowCount = (folder) => Math.max(0, getFolderAssetCount(folder) - 8)

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

const getAssetUsageOverflowCount = (asset) =>
  Math.max(0, getAssetUsageLabels(asset).length - getAssetUsageChips(asset).length)

const assetUsageFilterTabs = computed(() => {
  const sourceAssets = categoryScopedAssets.value
  const usedCount = sourceAssets.filter((asset) => getAssetUsageLabels(asset).length > 0).length
  const unusedCount = Math.max(0, sourceAssets.length - usedCount)
  return [
    { key: 'all', label: t('全部照片', 'All Photos'), count: sourceAssets.length },
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

const assetEmptyStateText = computed(() => {
  if (activeAssetUsageFilter.value === 'in_use') {
    return t('当前相簿暂无已使用照片', 'No used photos in this album')
  }
  if (activeAssetUsageFilter.value === 'unused') {
    return t('当前相簿暂无未使用照片', 'No unused photos in this album')
  }
  return t('当前相簿暂无照片', 'No photos in this album')
})

const activeUsageFilterMeta = computed(
  () => assetUsageFilterTabs.value.find((tab) => tab.key === activeAssetUsageFilter.value) || assetUsageFilterTabs.value[0],
)

const heroPreviewAssets = computed(() => visibleAssets.value.slice(0, 5))

const assetCurationSummary = computed(() =>
  t(
    `${categoryLabel(activeCategory.value)} · ${activeUsageFilterMeta.value?.label || ''} · ${visibleAssets.value.length} 张`,
    `${categoryLabel(activeCategory.value)} · ${activeUsageFilterMeta.value?.label || ''} · ${visibleAssets.value.length} photos`,
  ),
)

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

const hydrateAssetPreview = async (assetId) => {
  if (!assetId || previewMap[assetId]) return
  const previewUrl = await galleryStore.getAssetPreviewUrl(assetId, {
    scopeId: GALLERY_ASSET_PREVIEW_SCOPE_ID,
  })
  previewMap[assetId] = previewUrl || ''
}

watch(
  visibleAssets,
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
    Object.keys(assetFolderDraftMap).forEach((assetId) => {
      if (!nextIds.has(assetId)) {
        delete assetFolderDraftMap[assetId]
      }
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  Object.keys(previewMap).forEach((assetId) => {
    galleryStore.releaseAssetPreview(assetId, GALLERY_ASSET_PREVIEW_SCOPE_ID)
  })
  galleryStore.releaseAssetPreviewScope(GALLERY_ASSET_PREVIEW_SCOPE_ID)
})
</script>

<template>
  <div class="gallery-immersive-root w-full h-full text-neutral-950 flex flex-col">
    <div class="gallery-topbar pt-12 px-4 pb-2">
      <div class="flex items-center justify-between">
        <button @click="goHome" class="text-blue-500 text-lg">
          <i class="fas fa-chevron-left"></i>
        </button>
        <button @click="openLocalImport" class="text-blue-500 text-lg">
          <i class="fas fa-plus"></i>
        </button>
      </div>
      <h1 class="mt-3 text-[34px] font-bold tracking-tight">{{ t('相册', 'Photos') }}</h1>
    </div>

    <div class="gallery-controls px-4 py-2 space-y-3">
      <section class="gallery-hero rounded-[1.75rem] p-4">
        <p class="text-[12px] font-semibold text-blue-500">{{ t('最近项目', 'Recents') }}</p>
        <div class="mt-1 flex items-end justify-between gap-3">
          <div>
            <h2 class="text-3xl font-bold leading-tight">{{ galleryStore.categoryCounts.all }}</h2>
            <p class="mt-1 text-xs text-neutral-500">
              {{ t('照片会自动用于聊天、壁纸、地图和角色相簿。', 'Photos can be reused by chats, wallpapers, maps, and role albums.') }}
            </p>
          </div>
          <button
            @click="openLocalImport"
            class="shrink-0 rounded-full bg-blue-500 px-3 py-2 text-xs font-semibold text-white shadow-sm"
          >
            <i class="fas fa-plus mr-1"></i>
            {{ t('添加', 'Add') }}
          </button>
        </div>
        <div class="mt-4 rounded-[1.35rem] border border-neutral-200 bg-white/80 px-3 py-2.5">
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-[0.18em] text-neutral-400">{{ t('当前视图', 'Current View') }}</p>
              <p class="mt-1 text-xs text-neutral-700 truncate">{{ assetCurationSummary }}</p>
            </div>
            <div v-if="heroPreviewAssets.length > 0" class="flex -space-x-2 shrink-0">
              <AssetThumbnailOption
                v-for="asset in heroPreviewAssets"
                :key="`hero-preview-${asset.id}`"
                :asset="asset"
                :preview-url="previewMap[asset.id]"
                variant="mini"
                :interactive="false"
                :show-name="false"
                class="rounded-xl border-2 border-white shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-5 gap-2">
        <button
          v-for="tab in categoryTabs"
          :key="tab.key"
          @click="activeCategory = tab.key"
          class="gallery-filter-button rounded-xl px-2 py-2 text-[11px] border transition"
          :class="
            activeCategory === tab.key
              ? 'is-active'
              : ''
          "
        >
          <p class="font-medium">{{ tab.label }}</p>
          <p class="text-[10px] mt-0.5">{{ tab.count }}</p>
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="tab in assetUsageFilterTabs"
          :key="`usage-filter-${tab.key}`"
          @click="activeAssetUsageFilter = tab.key"
          class="gallery-filter-button rounded-xl px-2 py-2 text-[11px] border transition"
          :class="
            activeAssetUsageFilter === tab.key
              ? 'is-active'
              : ''
          "
        >
          <p class="font-medium">{{ tab.label }}</p>
          <p class="text-[10px] mt-0.5">{{ tab.count }}</p>
        </button>
      </div>

      <div class="gallery-control-card rounded-2xl p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-semibold">{{ t('添加到相册', 'Add to Photos') }}</p>
          <select
            v-model="localImportCategory"
            class="gallery-field text-xs rounded px-2 py-1"
          >
            <option
              v-for="categoryKey in GALLERY_ASSET_CATEGORIES"
              :key="categoryKey"
              :value="categoryKey"
            >
              {{ categoryLabel(categoryKey) }}
            </option>
          </select>
        </div>
        <button
          @click="openLocalImport"
          class="w-full py-2.5 rounded-xl border border-dashed border-blue-200 text-blue-500 text-sm hover:bg-blue-50 transition"
        >
          <i class="fas fa-upload mr-1"></i>
          {{ t('选择照片或 GIF', 'Choose photos or GIFs') }}
        </button>
        <p class="text-[11px] text-neutral-400">
          {{ importLimitHint }}
        </p>
        <input
          ref="localFileInput"
          type="file"
          class="hidden"
          accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
          multiple
          @change="handleLocalImport"
        />
        <input
          ref="replaceFileInput"
          type="file"
          class="hidden"
          accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
          @change="handleReplaceFileChange"
        />
      </div>

      <div class="gallery-control-card rounded-2xl p-3 space-y-2">
        <p class="text-xs font-semibold">{{ t('从链接添加', 'Add from Link') }}</p>
        <input
          v-model="urlForm.url"
          type="url"
          class="gallery-field w-full rounded-xl px-2 py-2 text-sm outline-none"
          :placeholder="t('https://example.com/image.png', 'https://example.com/image.png')"
        />
        <div class="grid grid-cols-[1fr,110px] gap-2">
          <input
            v-model="urlForm.name"
            type="text"
            class="gallery-field w-full rounded-xl px-2 py-2 text-sm outline-none"
            :placeholder="t('可选名称', 'Optional name')"
          />
          <select
            v-model="urlForm.category"
            class="gallery-field w-full rounded-xl px-2 py-2 text-xs"
          >
            <option
              v-for="categoryKey in GALLERY_ASSET_CATEGORIES"
              :key="categoryKey"
              :value="categoryKey"
            >
              {{ categoryLabel(categoryKey) }}
            </option>
          </select>
        </div>
        <button
          @click="importFromUrl"
          class="w-full py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition"
        >
          {{ t('添加到相册', 'Add to Photos') }}
        </button>
      </div>

      <div class="gallery-control-card rounded-2xl p-3 space-y-2.5">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold">{{ t('我的相簿', 'My Albums') }}</p>
          <span class="text-[10px] text-neutral-400">
            {{ t('总数', 'Total') }} {{ allFolderOptions.length }}
          </span>
        </div>

        <div class="grid grid-cols-[1fr,108px,64px] gap-2">
          <input
            v-model="folderForm.name"
            type="text"
            class="gallery-field w-full rounded-xl px-2 py-2 text-sm outline-none"
            :placeholder="t('新文件夹名称', 'New folder name')"
          />
          <select
            v-model="folderForm.category"
            class="gallery-field w-full rounded-xl px-2 py-2 text-xs"
          >
            <option value="all">{{ t('全部类型', 'All types') }}</option>
            <option
              v-for="categoryKey in GALLERY_ASSET_CATEGORIES"
              :key="`folder-create-${categoryKey}`"
              :value="categoryKey"
            >
              {{ categoryLabel(categoryKey) }}
            </option>
          </select>
          <button
            @click="createFolder"
            class="rounded-xl bg-blue-500 text-white text-xs px-2 py-2 font-semibold"
          >
            {{ t('新建', 'Create') }}
          </button>
        </div>

        <div class="grid grid-cols-5 gap-1.5">
          <button
            v-for="tab in folderCategoryTabs"
            :key="`folder-tab-${tab.key}`"
            @click="activeFolderCategory = tab.key"
            class="gallery-filter-button rounded-lg px-1.5 py-1 text-[10px] border transition"
            :class="
              activeFolderCategory === tab.key
                ? 'is-active'
                : ''
            "
          >
            {{ tab.label }}
          </button>
        </div>

        <div v-if="visibleFolders.length === 0" class="text-[11px] text-neutral-400 rounded-xl border border-dashed border-neutral-200 px-2 py-3 text-center">
          {{ t('当前筛选下暂无相簿。', 'No albums under current filter.') }}
        </div>

        <div v-else class="space-y-2 max-h-56 overflow-y-auto pr-0.5">
          <div
            v-for="folder in visibleFolders"
            :key="folder.id"
            class="rounded-2xl border border-neutral-200 bg-white p-2.5 space-y-2"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-medium text-neutral-900 truncate">{{ folder.name }}</p>
              <span class="text-[10px] text-neutral-400">{{ getFolderAssetCount(folder) }} {{ t('张', 'photos') }}</span>
            </div>

            <div class="grid grid-cols-[1fr,56px,56px] gap-1.5">
              <select
                :value="folder.category"
                class="gallery-field text-[11px] rounded px-1.5 py-1"
                @change="updateFolderCategory(folder.id, $event.target.value)"
              >
                <option value="all">{{ t('全部类型', 'All types') }}</option>
                <option
                  v-for="categoryKey in GALLERY_ASSET_CATEGORIES"
                  :key="`folder-update-${folder.id}-${categoryKey}`"
                  :value="categoryKey"
                >
                  {{ categoryLabel(categoryKey) }}
                </option>
              </select>
              <button
                @click="renameFolder(folder)"
                class="text-[11px] border border-neutral-200 rounded px-1.5 py-1 text-blue-500 hover:bg-blue-50"
              >
                {{ t('改名', 'Rename') }}
              </button>
              <button
                @click="removeFolder(folder)"
                class="text-[11px] border border-red-100 rounded px-1.5 py-1 text-red-500 hover:bg-red-50"
              >
                {{ t('删除', 'Delete') }}
              </button>
            </div>

            <div v-if="getFolderAssetCount(folder) === 0" class="text-[10px] text-neutral-400">
              {{ t('该相簿还没有照片。', 'This album has no photos yet.') }}
            </div>

            <div v-else class="flex flex-wrap gap-1.5">
              <span
                v-for="item in getFolderPreviewAssets(folder)"
                :key="`folder-item-${folder.id}-${item.id}`"
                class="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] text-neutral-600"
              >
                <span class="max-w-[96px] truncate">{{ item.name }}</span>
                <button
                  @click="removeAssetFromFolder(folder.id, item.id)"
                  class="text-neutral-400 hover:text-red-500"
                  :title="t('从相簿移除', 'Remove from album')"
                >
                  <i class="fas fa-times"></i>
                </button>
              </span>
              <span
                v-if="getFolderPreviewOverflowCount(folder) > 0"
                class="inline-flex items-center rounded-full border border-dashed border-neutral-200 px-2 py-0.5 text-[10px] text-neutral-400"
              >
                +{{ getFolderPreviewOverflowCount(folder) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p
        v-if="feedback.text"
        class="text-xs"
        :class="
          feedback.type === 'success'
            ? 'text-emerald-600'
            : feedback.type === 'warn'
              ? 'text-amber-600'
              : 'text-red-600'
        "
      >
        {{ feedback.text }}
      </p>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <div v-if="visibleAssets.length === 0" class="text-center text-neutral-400 text-sm pt-14">
        <i class="fas fa-images text-2xl mb-3"></i>
        <p>{{ assetEmptyStateText }}</p>
      </div>

      <div v-else class="grid grid-cols-3 gap-1 pb-8">
        <div
          v-for="asset in visibleAssets"
          :key="asset.id"
          class="gallery-asset-card overflow-hidden"
        >
          <AssetThumbnailOption
            :asset="asset"
            :preview-url="previewMap[asset.id]"
            variant="square"
            :interactive="false"
            :show-name="false"
          >
            <template #overlay>
            <button
              @click="removeAsset(asset)"
              class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/45 text-white text-xs hover:bg-black/60 transition"
              :title="t('删除', 'Delete')"
            >
              <i class="fas fa-trash"></i>
            </button>
            </template>
          </AssetThumbnailOption>

          <div class="p-2 space-y-1.5 bg-white">
            <p class="text-[11px] font-medium leading-tight line-clamp-1">{{ asset.name }}</p>
            <p class="text-[10px] text-neutral-400">
              {{ categoryLabel(asset.category) }} ·
              {{
                asset.sourceType === 'file'
                  ? t('本地文件', 'Local file')
                  : t('URL', 'URL')
              }}
            </p>
            <div v-if="getAssetUsageChips(asset).length > 0" class="flex flex-wrap gap-1">
              <AssetStatusBadge
                v-for="label in getAssetUsageChips(asset)"
                :key="`${asset.id}-usage-${label}`"
                :label="label"
                icon="fas fa-link"
              />
              <AssetStatusBadge
                v-if="getAssetUsageOverflowCount(asset) > 0"
                :label="`+${getAssetUsageOverflowCount(asset)}`"
                tone="neutral"
                :truncate="false"
              />
            </div>
            <details class="photo-actions">
              <summary class="cursor-pointer select-none text-[11px] text-blue-500">{{ t('选项', 'Options') }}</summary>
              <div class="mt-2 space-y-2">
                <div class="grid grid-cols-[1fr,72px] gap-2">
                  <select
                    :value="asset.category"
                    class="gallery-field text-[11px] rounded px-1.5 py-1"
                    @change="moveAssetToCategory(asset.id, $event.target.value)"
                  >
                    <option
                      v-for="categoryKey in GALLERY_ASSET_CATEGORIES"
                      :key="categoryKey"
                      :value="categoryKey"
                    >
                      {{ categoryLabel(categoryKey) }}
                    </option>
                  </select>
                  <button
                    @click="renameAsset(asset)"
                    class="text-[11px] border border-neutral-200 rounded px-2 py-1 text-blue-500 hover:bg-blue-50"
                  >
                    {{ t('改名', 'Rename') }}
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <button
                    @click="replaceAssetByUrl(asset)"
                    class="text-[11px] border border-neutral-200 rounded px-2 py-1 text-neutral-600 hover:bg-neutral-50"
                  >
                    {{ t('替换URL', 'Replace URL') }}
                  </button>
                  <button
                    @click="openReplaceAssetFile(asset)"
                    class="text-[11px] border border-neutral-200 rounded px-2 py-1 text-neutral-600 hover:bg-neutral-50"
                  >
                    {{ t('替换文件', 'Replace file') }}
                  </button>
                </div>

                <div v-if="allFolderOptions.length > 0" class="grid grid-cols-[1fr,56px] gap-2">
                  <select
                    v-model="assetFolderDraftMap[asset.id]"
                    class="gallery-field text-[11px] rounded px-1.5 py-1"
                  >
                    <option value="">{{ t('选择相簿', 'Choose album') }}</option>
                    <option
                      v-for="folder in allFolderOptions"
                      :key="`asset-folder-${asset.id}-${folder.id}`"
                      :value="folder.id"
                    >
                      {{ folder.name }}
                    </option>
                  </select>
                  <button
                    @click="addAssetToSelectedFolder(asset)"
                    class="text-[11px] border border-neutral-200 rounded px-2 py-1 text-blue-500 hover:bg-blue-50"
                  >
                    {{ t('加入', 'Add') }}
                  </button>
                </div>
                <p v-else class="text-[10px] text-neutral-400">
                  {{ t('先创建相簿后可归档照片。', 'Create albums first to organize photos.') }}
                </p>
              </div>
            </details>
          </div>
      </div>
    </div>
  </div>
</div>
</template>

<style scoped>
.gallery-immersive-root {
  background:
    radial-gradient(circle at 12% 0%, rgba(0, 122, 255, 0.08), transparent 28%),
    linear-gradient(180deg, #fbfbfd 0%, #f2f2f7 42%, #ffffff 100%);
}

.gallery-topbar {
  background: linear-gradient(180deg, rgba(251, 251, 253, 0.96), rgba(251, 251, 253, 0.78));
  backdrop-filter: blur(20px);
}

.gallery-controls {
  background: linear-gradient(180deg, rgba(251, 251, 253, 0.78), rgba(242, 242, 247, 0.3));
}

.gallery-hero,
.gallery-control-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(209, 213, 219, 0.72);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px);
}

.gallery-hero::before {
  content: '';
  position: absolute;
  inset: -36% -18% auto auto;
  width: 200px;
  height: 200px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(0, 122, 255, 0.16), transparent 62%);
  pointer-events: none;
}

.gallery-filter-button {
  border-color: rgba(209, 213, 219, 0.8);
  background: rgba(255, 255, 255, 0.76);
  color: rgba(82, 82, 91, 0.86);
}

.gallery-filter-button.is-active {
  border-color: rgba(0, 122, 255, 0.26);
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
  box-shadow: 0 0 0 1px rgba(0, 122, 255, 0.08);
}

.gallery-field {
  border: 1px solid rgba(209, 213, 219, 0.85);
  background: rgba(255, 255, 255, 0.9);
  color: #18181b;
}

.gallery-field::placeholder {
  color: rgba(113, 113, 122, 0.64);
}

.gallery-field option {
  color: #18181b;
}

.gallery-asset-card {
  position: relative;
  border-radius: 0.85rem;
  border: 1px solid rgba(229, 231, 235, 0.82);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  transform: translateZ(0);
}

.gallery-asset-card::after {
  content: none;
}

.photo-actions summary {
  list-style: none;
}

.photo-actions summary::-webkit-details-marker {
  display: none;
}
</style>
