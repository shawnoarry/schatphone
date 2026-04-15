<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useChatStore } from '../stores/chat'
import { GALLERY_ASSET_CATEGORIES, useGalleryStore } from '../stores/gallery'

const router = useRouter()
const galleryStore = useGalleryStore()
const chatStore = useChatStore()
const { t } = useI18n()

const activeCategory = ref('all')
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

const visibleAssets = computed(() => galleryStore.getAssetsByCategory(activeCategory.value))
const folderCategoryTabs = computed(() => [
  { key: 'all', label: t('全部文件夹', 'All folders') },
  ...GALLERY_ASSET_CATEGORIES.map((key) => ({
    key,
    label: categoryLabel(key),
  })),
])
const visibleFolders = computed(() => galleryStore.listFolders({ category: activeFolderCategory.value }))
const allFolderOptions = computed(() => galleryStore.listFolders({ category: 'all' }).slice(0, 200))

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
  router.push('/home')
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

const renameAsset = (asset) => {
  const nextName = window.prompt(
    t('输入新的素材名称：', 'Input new asset name:'),
    asset?.name || '',
  )
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

const renameFolder = (folder) => {
  const nextName = window.prompt(
    t('输入新的文件夹名称：', 'Input new folder name:'),
    folder?.name || '',
  )
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

const removeFolder = (folder) => {
  const assetCount = Array.isArray(folder?.assetIds) ? folder.assetIds.length : 0
  const roleBindingHits = getFolderRoleBindingHits(folder.id)
  const confirmed = window.confirm(
    [
      t(`确认删除文件夹“${folder?.name || ''}”吗？`, `Delete folder "${folder?.name || ''}"?`),
      assetCount > 0
        ? t(
            `该文件夹包含 ${assetCount} 项素材引用，删除后不会删除素材本体。`,
            `This folder has ${assetCount} asset links. Deleting folder will not delete assets.`,
          )
        : t('删除后不可恢复。', 'Deletion cannot be undone.'),
      roleBindingHits.length > 0
        ? `${t('角色档案绑定', 'Role profile binding')}: ${roleBindingHits.map((hit) => `${hit.profileName}(${hit.slotLabel})`).join(', ')}`
        : '',
    ].join('\n'),
  )
  if (!confirmed) return

  if (roleBindingHits.length > 0) {
    const secondConfirmed = window.confirm(
      t(
        '该文件夹已绑定角色档案。继续删除将自动解除这些绑定，是否继续？',
        'This folder is bound to role profiles. Continue will auto-unbind these links. Continue?',
      ),
    )
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

  const confirmed = window.confirm(
    [
      t(`确认删除素材“${asset.name}”吗？`, `Delete "${asset.name}"?`),
      usageText,
      roleBindText,
      guard.blocked
        ? t('该素材正在被使用，确认后将强制删除。', 'This asset is in use and will be force removed.')
        : t('删除后不可恢复。', 'Deletion cannot be undone.'),
    ]
      .filter(Boolean)
      .join('\n'),
  )
  if (!confirmed) return

  if (roleBindingHits.length > 0) {
    const secondConfirmed = window.confirm(
      t(
        '该素材已绑定角色档案。继续删除将自动解除这些绑定，是否继续？',
        'This asset is bound to role profiles. Continue will auto-unbind these links. Continue?',
      ),
    )
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

const confirmAssetReplace = (asset, modeLabel) => {
  const summary = buildAssetBindingSummary(asset)
  const firstConfirmed = window.confirm(
    [
      t(
        `确认替换素材“${asset.name}”(${modeLabel}) 吗？`,
        `Replace "${asset.name}" (${modeLabel})?`,
      ),
      t('替换后素材 ID 与绑定关系会保留。', 'Asset ID and bindings will be preserved after replace.'),
      summary.usageText,
      summary.roleBindText,
    ]
      .filter(Boolean)
      .join('\n'),
  )
  if (!firstConfirmed) return false

  if (!summary.hasBindingRisk) return true
  return window.confirm(
    t(
      '该素材存在绑定/使用关系。确认继续替换？',
      'This asset is bound/in use. Confirm replacement?',
    ),
  )
}

const replaceAssetByUrl = async (asset) => {
  if (!asset?.id) return
  const nextUrl = window.prompt(
    t('输入新的 URL（http/https）：', 'Input new URL (http/https):'),
    asset.sourceType === 'url' ? asset.sourceUrl || '' : '',
  )
  if (nextUrl == null) return
  if (!confirmAssetReplace(asset, t('URL 替换', 'URL replace'))) return

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
  if (!confirmAssetReplace(asset, t('本地文件替换', 'Local file replace'))) return
  replaceTargetAssetId.value = asset.id
  replaceFileInput.value?.click()
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
  const previewUrl = await galleryStore.getAssetPreviewUrl(assetId)
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
  galleryStore.clearAssetPreviewCache()
})
</script>

<template>
  <div class="w-full h-full bg-[#f2f2f7] text-gray-900 flex flex-col">
    <div class="pt-12 px-4 pb-3 bg-white border-b border-gray-100">
      <div class="flex items-center justify-between">
        <button @click="goHome" class="text-blue-500 text-lg">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span class="font-semibold text-[15px]">{{ t('全局素材中心', 'Global Asset Center') }}</span>
        <span class="text-xs text-gray-400">{{ galleryStore.categoryCounts.all }}</span>
      </div>
      <p class="text-[11px] text-gray-500 mt-2">
        {{ t('一次导入，全局复用：聊天、角色绑定、壁纸与场景都可共享。', 'Import once and reuse globally across chat, role binding, wallpaper and scenarios.') }}
      </p>
    </div>

    <div class="px-4 py-3 space-y-3 bg-white border-b border-gray-100">
      <div class="grid grid-cols-5 gap-2">
        <button
          v-for="tab in categoryTabs"
          :key="tab.key"
          @click="activeCategory = tab.key"
          class="rounded-lg px-2 py-2 text-[11px] border transition"
          :class="
            activeCategory === tab.key
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
          "
        >
          <p class="font-medium">{{ tab.label }}</p>
          <p class="text-[10px] mt-0.5">{{ tab.count }}</p>
        </button>
      </div>

      <div class="rounded-xl border border-gray-200 p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-semibold">{{ t('本地导入', 'Local Import') }}</p>
          <select
            v-model="localImportCategory"
            class="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
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
          class="w-full py-2.5 rounded-lg border border-dashed border-blue-300 text-blue-600 text-sm hover:bg-blue-50 transition"
        >
          <i class="fas fa-upload mr-1"></i>
          {{ t('导入 png/jpg/webp/gif', 'Import png/jpg/webp/gif') }}
        </button>
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

      <div class="rounded-xl border border-gray-200 p-3 space-y-2">
        <p class="text-xs font-semibold">{{ t('URL 导入', 'URL Import') }}</p>
        <input
          v-model="urlForm.url"
          type="url"
          class="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none"
          :placeholder="t('https://example.com/image.png', 'https://example.com/image.png')"
        />
        <div class="grid grid-cols-[1fr,110px] gap-2">
          <input
            v-model="urlForm.name"
            type="text"
            class="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none"
            :placeholder="t('可选名称', 'Optional name')"
          />
          <select
            v-model="urlForm.category"
            class="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white"
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
          class="w-full py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 transition"
        >
          {{ t('添加 URL 素材', 'Add URL Asset') }}
        </button>
      </div>

      <div class="rounded-xl border border-gray-200 p-3 space-y-2.5">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold">{{ t('文件夹管理', 'Folder Management') }}</p>
          <span class="text-[10px] text-gray-500">
            {{ t('总数', 'Total') }} {{ allFolderOptions.length }}
          </span>
        </div>

        <div class="grid grid-cols-[1fr,108px,64px] gap-2">
          <input
            v-model="folderForm.name"
            type="text"
            class="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm outline-none"
            :placeholder="t('新文件夹名称', 'New folder name')"
          />
          <select
            v-model="folderForm.category"
            class="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white"
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
            class="rounded-lg bg-gray-900 text-white text-xs px-2 py-2 hover:bg-black"
          >
            {{ t('新建', 'Create') }}
          </button>
        </div>

        <div class="grid grid-cols-5 gap-1.5">
          <button
            v-for="tab in folderCategoryTabs"
            :key="`folder-tab-${tab.key}`"
            @click="activeFolderCategory = tab.key"
            class="rounded-md px-1.5 py-1 text-[10px] border transition"
            :class="
              activeFolderCategory === tab.key
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-500'
            "
          >
            {{ tab.label }}
          </button>
        </div>

        <div v-if="visibleFolders.length === 0" class="text-[11px] text-gray-500 rounded-lg border border-dashed border-gray-200 px-2 py-3 text-center">
          {{ t('当前筛选下暂无文件夹。', 'No folders under current filter.') }}
        </div>

        <div v-else class="space-y-2 max-h-56 overflow-y-auto pr-0.5">
          <div
            v-for="folder in visibleFolders"
            :key="folder.id"
            class="rounded-lg border border-gray-200 bg-white p-2.5 space-y-2"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-medium text-gray-800 truncate">{{ folder.name }}</p>
              <span class="text-[10px] text-gray-500">{{ getFolderAssetCount(folder) }} {{ t('项', 'items') }}</span>
            </div>

            <div class="grid grid-cols-[1fr,56px,56px] gap-1.5">
              <select
                :value="folder.category"
                class="text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white"
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
                class="text-[11px] border border-gray-200 rounded px-1.5 py-1 text-gray-600 hover:bg-gray-50"
              >
                {{ t('改名', 'Rename') }}
              </button>
              <button
                @click="removeFolder(folder)"
                class="text-[11px] border border-red-200 rounded px-1.5 py-1 text-red-500 hover:bg-red-50"
              >
                {{ t('删除', 'Delete') }}
              </button>
            </div>

            <div v-if="getFolderAssetCount(folder) === 0" class="text-[10px] text-gray-400">
              {{ t('该文件夹还没有素材。', 'This folder has no assets yet.') }}
            </div>

            <div v-else class="flex flex-wrap gap-1.5">
              <span
                v-for="item in getFolderPreviewAssets(folder)"
                :key="`folder-item-${folder.id}-${item.id}`"
                class="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] text-gray-600"
              >
                <span class="max-w-[96px] truncate">{{ item.name }}</span>
                <button
                  @click="removeAssetFromFolder(folder.id, item.id)"
                  class="text-gray-400 hover:text-red-500"
                  :title="t('从文件夹移除', 'Remove from folder')"
                >
                  <i class="fas fa-times"></i>
                </button>
              </span>
              <span
                v-if="getFolderPreviewOverflowCount(folder) > 0"
                class="inline-flex items-center rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-[10px] text-gray-500"
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
      <div v-if="visibleAssets.length === 0" class="text-center text-gray-400 text-sm pt-14">
        <i class="fas fa-images text-2xl mb-3"></i>
        <p>{{ t('当前分类暂无素材', 'No assets in this category') }}</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-3 pb-8">
        <div
          v-for="asset in visibleAssets"
          :key="asset.id"
          class="rounded-xl bg-white border border-gray-200 overflow-hidden"
        >
          <div class="aspect-square bg-gray-100 relative">
            <img
              v-if="previewMap[asset.id]"
              :src="previewMap[asset.id]"
              :alt="asset.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              {{ t('预览加载中', 'Loading...') }}
            </div>
            <button
              @click="removeAsset(asset)"
              class="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/45 text-white text-xs hover:bg-black/60 transition"
              :title="t('删除', 'Delete')"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>

          <div class="p-2.5 space-y-2">
            <p class="text-xs font-medium leading-tight line-clamp-2 min-h-[30px]">{{ asset.name }}</p>
            <p class="text-[10px] text-gray-400">
              {{ categoryLabel(asset.category) }} ·
              {{
                asset.sourceType === 'file'
                  ? t('本地文件', 'Local file')
                  : t('URL', 'URL')
              }}
            </p>
            <div class="grid grid-cols-[1fr,72px] gap-2">
              <select
                :value="asset.category"
                class="text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white"
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
                class="text-[11px] border border-gray-200 rounded px-2 py-1 text-gray-600 hover:bg-gray-50"
                >
                  {{ t('改名', 'Rename') }}
                </button>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button
                  @click="replaceAssetByUrl(asset)"
                  class="text-[11px] border border-gray-200 rounded px-2 py-1 text-gray-600 hover:bg-gray-50"
                >
                  {{ t('替换URL', 'Replace URL') }}
                </button>
                <button
                  @click="openReplaceAssetFile(asset)"
                  class="text-[11px] border border-gray-200 rounded px-2 py-1 text-gray-600 hover:bg-gray-50"
                >
                  {{ t('替换文件', 'Replace file') }}
                </button>
              </div>

              <div v-if="allFolderOptions.length > 0" class="grid grid-cols-[1fr,56px] gap-2">
                <select
                  v-model="assetFolderDraftMap[asset.id]"
                  class="text-[11px] border border-gray-200 rounded px-1.5 py-1 bg-white"
                >
                  <option value="">{{ t('选择文件夹', 'Choose folder') }}</option>
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
                  class="text-[11px] border border-gray-200 rounded px-2 py-1 text-gray-600 hover:bg-gray-50"
                >
                  {{ t('加入', 'Add') }}
                </button>
              </div>
              <p v-else class="text-[10px] text-gray-400">
                {{ t('先创建文件夹后可归档素材。', 'Create folders first to organize assets.') }}
              </p>
            </div>
          </div>
        </div>
    </div>
  </div>
</template>
