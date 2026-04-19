<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useGalleryStore } from '../stores/gallery'
import { callAI } from '../lib/ai'
import { summarizeRoleAssetFolderBindings } from '../lib/role-asset-folder-resolver'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'

const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const galleryStore = useGalleryStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()

const { user, settings } = storeToRefs(systemStore)
const { roleProfiles, loadingAI } = storeToRefs(chatStore)

const showProfileModal = ref(false)
const profileModalMode = ref('create')
const editingProfileId = ref(0)
const assetPackCategory = ref('reference')
const draftPreviewMap = reactive({})
const CONTACTS_ASSET_PREVIEW_SCOPE_ID = 'contacts-view'

const createEmptyAssetPack = () => ({
  wallpaperAssetIds: [],
  emojiAssetIds: [],
  referenceAssetIds: [],
  scenarioAssetIds: [],
})

const createEmptyAssetFolderBindings = () => ({
  profileImage: {
    folderId: '',
  },
  dynamicMedia: {
    folderId: '',
  },
  emojiPack: {
    folderId: '',
  },
  imageReference: {
    folderId: '',
  },
})

const cloneAssetPack = (assetPack = {}) => ({
  wallpaperAssetIds: Array.isArray(assetPack.wallpaperAssetIds) ? [...new Set(assetPack.wallpaperAssetIds)] : [],
  emojiAssetIds: Array.isArray(assetPack.emojiAssetIds) ? [...new Set(assetPack.emojiAssetIds)] : [],
  referenceAssetIds: Array.isArray(assetPack.referenceAssetIds) ? [...new Set(assetPack.referenceAssetIds)] : [],
  scenarioAssetIds: Array.isArray(assetPack.scenarioAssetIds) ? [...new Set(assetPack.scenarioAssetIds)] : [],
})

const cloneAssetFolderBindings = (bindings = {}) => ({
  profileImage: {
    folderId:
      typeof bindings?.profileImage?.folderId === 'string'
        ? bindings.profileImage.folderId.trim()
        : '',
  },
  dynamicMedia: {
    folderId:
      typeof bindings?.dynamicMedia?.folderId === 'string'
        ? bindings.dynamicMedia.folderId.trim()
        : '',
  },
  emojiPack: {
    folderId:
      typeof bindings?.emojiPack?.folderId === 'string'
        ? bindings.emojiPack.folderId.trim()
        : '',
  },
  imageReference: {
    folderId:
      typeof bindings?.imageReference?.folderId === 'string'
        ? bindings.imageReference.folderId.trim()
        : '',
  },
})

const profileDraft = reactive({
  name: '',
  role: '',
  isMain: false,
  bio: '',
  knowledgePointIds: [],
  assetPack: createEmptyAssetPack(),
  assetFolderBindings: createEmptyAssetFolderBindings(),
})

const showUiNoticeType = ref('')
const showUiNoticeMessage = ref('')
let uiNoticeTimerId = null

const setUiNotice = (type, message, durationMs = 2200) => {
  const text = typeof message === 'string' ? message.trim() : ''
  if (!text) return
  showUiNoticeType.value = type
  showUiNoticeMessage.value = text
  if (uiNoticeTimerId) clearTimeout(uiNoticeTimerId)
  uiNoticeTimerId = setTimeout(() => {
    showUiNoticeType.value = ''
    showUiNoticeMessage.value = ''
  }, durationMs)
}

const ASSET_PACK_CATEGORY_DEFS = [
  { key: 'wallpaperAssetIds', type: 'wallpaper', labelZh: '壁纸', labelEn: 'Wallpaper' },
  { key: 'emojiAssetIds', type: 'emoji', labelZh: '表情', labelEn: 'Emoji' },
  { key: 'referenceAssetIds', type: 'reference', labelZh: '参考图', labelEn: 'Reference' },
  { key: 'scenarioAssetIds', type: 'scenario', labelZh: '场景图', labelEn: 'Scenario' },
]

const categoryLabel = (type) => {
  if (type === 'wallpaper') return t('壁纸', 'Wallpaper')
  if (type === 'emoji') return t('表情', 'Emoji')
  if (type === 'reference') return t('参考图', 'Reference')
  if (type === 'scenario') return t('场景图', 'Scenario')
  return type
}

const activeAssetCategoryConfig = computed(() =>
  ASSET_PACK_CATEGORY_DEFS.find((item) => item.type === assetPackCategory.value) || ASSET_PACK_CATEGORY_DEFS[2],
)

const availableAssets = computed(() =>
  galleryStore.getAssetsByCategory(assetPackCategory.value).slice(0, 48),
)

const hasAnyGalleryAsset = computed(() => galleryStore.assets.length > 0)
const profileImageFolderOptions = computed(() =>
  galleryStore.listFolders({ category: 'all' }).slice(0, 120),
)
const dynamicMediaFolderOptions = computed(() =>
  galleryStore.listFolders({ category: 'scenario' }).slice(0, 120),
)
const emojiFolderOptions = computed(() =>
  galleryStore.listFolders({ category: 'emoji' }).slice(0, 120),
)
const referenceFolderOptions = computed(() =>
  galleryStore.listFolders({ category: 'reference' }).slice(0, 120),
)

const draftAssetCountMap = computed(() => ({
  wallpaper: profileDraft.assetPack.wallpaperAssetIds.length,
  emoji: profileDraft.assetPack.emojiAssetIds.length,
  reference: profileDraft.assetPack.referenceAssetIds.length,
  scenario: profileDraft.assetPack.scenarioAssetIds.length,
}))

const roleFolderSlotLabel = (slotKey) => {
  if (slotKey === 'profileImage') return t('形象照', 'Profile image')
  if (slotKey === 'dynamicMedia') return t('动态图', 'Dynamic media')
  if (slotKey === 'emojiPack') return t('表情包', 'Emoji pack')
  if (slotKey === 'imageReference') return t('参考图', 'Reference image')
  return slotKey || ''
}

const roleFolderFallbackCopy = (slotKey) => {
  if (slotKey === 'profileImage') {
    return t(
      '未绑定时回退到默认头像/文字模式，不影响角色基础使用。',
      'When unbound, role falls back to default avatar/text mode.',
    )
  }
  if (slotKey === 'dynamicMedia') {
    return t(
      '未绑定时回退到纯文字动态，不影响基础互动。',
      'When unbound, dynamic posts fall back to text-first mode.',
    )
  }
  if (slotKey === 'emojiPack') {
    return t(
      '未绑定时回退到不使用表情包，仅保留基础消息类型。',
      'When unbound, emoji pack is skipped and baseline messages remain.',
    )
  }
  if (slotKey === 'imageReference') {
    return t(
      '未绑定时回退到无参考图模式，不影响基础 AI 调用。',
      'When unbound, AI falls back to no-reference mode.',
    )
  }
  return t('未绑定时回退到默认模式。', 'When unbound, fallback mode stays active.')
}

const getRoleFolderBindingSummaries = (bindings) =>
  summarizeRoleAssetFolderBindings(galleryStore, bindings).map((item) => ({
    ...item,
    label: roleFolderSlotLabel(item.slotKey),
  }))

const draftFolderBindingSummaryMap = computed(() =>
  Object.fromEntries(
    getRoleFolderBindingSummaries(profileDraft.assetFolderBindings).map((item) => [item.slotKey, item]),
  ),
)

const getDraftFolderPreviewAssetIds = (slotKey, limit = 3) => {
  const summary = draftFolderBindingSummaryMap.value[slotKey]
  if (!summary || !Array.isArray(summary.assetIds)) return []
  return summary.assetIds.slice(0, limit)
}

const getDraftFolderPreviewOverflowCount = (slotKey, limit = 3) => {
  const summary = draftFolderBindingSummaryMap.value[slotKey]
  const count = Number(summary?.assetCount) || 0
  return Math.max(0, count - limit)
}

const draftPreviewKeepAliveAssetIds = computed(() => {
  const previewIds = [
    ...availableAssets.value.map((asset) => asset.id),
    ...Object.keys(draftFolderBindingSummaryMap.value).flatMap((slotKey) =>
      getDraftFolderPreviewAssetIds(slotKey, 3),
    ),
  ]

  return [...new Set(previewIds.filter((assetId) => typeof assetId === 'string' && assetId.trim()))]
})

const getDraftFolderBindingSummary = (slotKey) =>
  draftFolderBindingSummaryMap.value[slotKey] || {
    slotKey,
    folderId: '',
    folderName: '',
    assetCount: 0,
    status: 'unbound',
    fallbackActive: true,
  }

const folderBindingStatusClass = (summary) => {
  if (summary?.status === 'ready') return 'text-emerald-600'
  if (summary?.status === 'missing_folder') return 'text-red-500'
  return 'text-amber-600'
}

const describeFolderBindingSummary = (summary) => {
  if (!summary || typeof summary !== 'object') return t('未绑定', 'Unbound')
  if (summary.status === 'ready') {
    return t(
      `已连接文件夹“${summary.folderName || roleFolderSlotLabel(summary.slotKey)}” · ${summary.assetCount} 项素材`,
      `Folder "${summary.folderName || roleFolderSlotLabel(summary.slotKey)}" ready · ${summary.assetCount} assets`,
    )
  }
  if (summary.status === 'empty') {
    return t(
      `已绑定文件夹“${summary.folderName || roleFolderSlotLabel(summary.slotKey)}”，但当前没有可用素材，将回退默认模式。`,
      `Folder "${summary.folderName || roleFolderSlotLabel(summary.slotKey)}" is bound but has no usable assets, so fallback mode stays active.`,
    )
  }
  if (summary.status === 'missing_folder') {
    return t(
      '原绑定文件夹已不存在，将回退默认模式。可重新选择新的文件夹。',
      'The previously bound folder no longer exists, so fallback mode stays active. Rebind a new folder if needed.',
    )
  }
  return roleFolderFallbackCopy(summary.slotKey)
}

const availableKnowledgePoints = computed(() => {
  const source = Array.isArray(user.value.knowledgePoints) ? user.value.knowledgePoints : []
  return source.slice(0, 160)
})

const mainProfiles = computed(() => roleProfiles.value.filter((item) => Boolean(item.isMain)))
const npcProfiles = computed(() => roleProfiles.value.filter((item) => !item.isMain))

const goHome = () => {
  router.push('/home')
}

const clearDraftPreviewMap = () => {
  Object.keys(draftPreviewMap).forEach((key) => {
    galleryStore.releaseAssetPreview(key, CONTACTS_ASSET_PREVIEW_SCOPE_ID)
    delete draftPreviewMap[key]
  })
}

const ensureDraftAssetPreview = async (assetId) => {
  if (!assetId || draftPreviewMap[assetId]) return
  const previewUrl = await galleryStore.getAssetPreviewUrl(assetId, {
    scopeId: CONTACTS_ASSET_PREVIEW_SCOPE_ID,
  })
  if (!previewUrl) return
  draftPreviewMap[assetId] = previewUrl
}

watch(
  draftPreviewKeepAliveAssetIds,
  (assetIds) => {
    if (!showProfileModal.value) return
    const activeSet = new Set(assetIds)
    assetIds.forEach((assetId) => {
      void ensureDraftAssetPreview(assetId)
    })
    Object.keys(draftPreviewMap).forEach((assetId) => {
      if (!activeSet.has(assetId)) {
        galleryStore.releaseAssetPreview(assetId, CONTACTS_ASSET_PREVIEW_SCOPE_ID)
        delete draftPreviewMap[assetId]
      }
    })
  },
  { immediate: true },
)

const resetProfileDraft = () => {
  profileDraft.name = ''
  profileDraft.role = ''
  profileDraft.bio = ''
  profileDraft.isMain = false
  profileDraft.knowledgePointIds = []
  profileDraft.assetPack = createEmptyAssetPack()
  profileDraft.assetFolderBindings = createEmptyAssetFolderBindings()
  assetPackCategory.value = 'reference'
  clearDraftPreviewMap()
}

const openCreateProfile = () => {
  profileModalMode.value = 'create'
  editingProfileId.value = 0
  resetProfileDraft()
  showProfileModal.value = true
}

const openEditProfile = (profile) => {
  if (!profile) return
  profileModalMode.value = 'edit'
  editingProfileId.value = Number(profile.id) || 0
  profileDraft.name = profile.name || ''
  profileDraft.role = profile.role || ''
  profileDraft.bio = profile.bio || ''
  profileDraft.isMain = Boolean(profile.isMain)
  profileDraft.knowledgePointIds = Array.isArray(profile.knowledgePointIds)
    ? [...new Set(profile.knowledgePointIds)]
    : []
  profileDraft.assetPack = cloneAssetPack(profile.assetPack || {})
  profileDraft.assetFolderBindings = cloneAssetFolderBindings(profile.assetFolderBindings || {})
  assetPackCategory.value = 'reference'
  clearDraftPreviewMap()
  showProfileModal.value = true
}

const closeProfileModal = () => {
  showProfileModal.value = false
  editingProfileId.value = 0
}

const isDraftAssetSelected = (assetId, categoryKey) => {
  const list = Array.isArray(profileDraft.assetPack[categoryKey]) ? profileDraft.assetPack[categoryKey] : []
  return list.includes(assetId)
}

const toggleDraftAsset = (assetId) => {
  const categoryKey = activeAssetCategoryConfig.value.key
  const current = Array.isArray(profileDraft.assetPack[categoryKey])
    ? [...profileDraft.assetPack[categoryKey]]
    : []

  if (current.includes(assetId)) {
    profileDraft.assetPack[categoryKey] = current.filter((id) => id !== assetId)
    return
  }

  if (current.length >= 24) {
    setUiNotice('warning', t('单个分类最多绑定 24 项素材。', 'Each category supports up to 24 assets.'))
    return
  }

  profileDraft.assetPack[categoryKey] = [...current, assetId]
}

const clearDraftCategoryAssets = () => {
  const categoryKey = activeAssetCategoryConfig.value.key
  profileDraft.assetPack[categoryKey] = []
}

const isDraftKnowledgePointSelected = (knowledgePointId) =>
  Array.isArray(profileDraft.knowledgePointIds) && profileDraft.knowledgePointIds.includes(knowledgePointId)

const toggleDraftKnowledgePoint = (knowledgePointId) => {
  const current = Array.isArray(profileDraft.knowledgePointIds)
    ? [...profileDraft.knowledgePointIds]
    : []
  if (current.includes(knowledgePointId)) {
    profileDraft.knowledgePointIds = current.filter((id) => id !== knowledgePointId)
    return
  }
  if (current.length >= 40) {
    setUiNotice(
      'warning',
      t(
        '单个角色最多绑定 40 条知识点。',
        'Each role profile supports up to 40 knowledge points.',
      ),
    )
    return
  }
  profileDraft.knowledgePointIds = [...current, knowledgePointId]
}

const clearDraftKnowledgePoints = () => {
  profileDraft.knowledgePointIds = []
}

const saveProfile = () => {
  const name = profileDraft.name.trim()
  if (!name) {
    setUiNotice('error', t('请填写角色名称。', 'Please enter a profile name.'))
    return
  }

  const payload = {
    name,
    role: profileDraft.role,
    isMain: profileDraft.isMain,
    bio: profileDraft.bio,
    knowledgePointIds: [...new Set(profileDraft.knowledgePointIds)],
    assetPack: cloneAssetPack(profileDraft.assetPack),
    assetFolderBindings: cloneAssetFolderBindings(profileDraft.assetFolderBindings),
  }

  if (profileModalMode.value === 'create') {
    chatStore.addRoleProfile({
      ...payload,
      avatar: '',
    })
    setUiNotice('success', t('角色档案已创建。', 'Role profile created.'))
    closeProfileModal()
    return
  }

  if (!editingProfileId.value) return
  const ok = chatStore.updateRoleProfile(editingProfileId.value, payload)
  if (!ok) {
    setUiNotice('error', t('保存失败，请重试。', 'Save failed, please retry.'))
    return
  }
  setUiNotice('success', t('角色档案已保存。', 'Role profile saved.'))
  closeProfileModal()
}

const removeProfile = async (profile) => {
  if (!profile?.id) return
  const boundHint = chatStore.isRoleProfileBound(profile.id)
    ? t('该角色已绑定会话，删除后会同步移除会话侧绑定。', 'This profile is bound to chat entries. Deleting it will remove those bindings too.')
    : t('删除后不可恢复。', 'This action cannot be undone.')
  const ok = await confirmDialog({
    title: t('删除角色档案', 'Delete role profile'),
    message: `${t('确认删除角色档案', 'Delete role profile')}「${profile.name || ''}」？`,
    details: [boundHint],
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return
  chatStore.removeRoleProfile(profile.id, { removeBindings: true })
  setUiNotice('success', t('角色档案已删除。', 'Role profile deleted.'))
}

const profileAssetSummary = (profile) => {
  const pack = cloneAssetPack(profile?.assetPack || {})
  const total =
    pack.wallpaperAssetIds.length +
    pack.emojiAssetIds.length +
    pack.referenceAssetIds.length +
    pack.scenarioAssetIds.length
  if (total <= 0) return t('未绑定素材包', 'No asset pack bound')
  return t(`素材 ${total} 项`, `${total} assets bound`)
}

const profileKnowledgeSummary = (profile) => {
  const count = Array.isArray(profile?.knowledgePointIds) ? profile.knowledgePointIds.length : 0
  if (count <= 0) return t('未绑定知识点', 'No knowledge points bound')
  return t(`知识点 ${count} 条`, `${count} knowledge points`)
}

const profileFolderBindingSummary = (profile) => {
  const summaries = getRoleFolderBindingSummaries(profile?.assetFolderBindings || {})
  const boundCount = summaries.filter((item) => item.isBound).length
  const readyCount = summaries.filter((item) => item.status === 'ready').length
  const totalAssets = summaries.reduce((sum, item) => sum + (item.assetCount || 0), 0)

  if (boundCount <= 0) return t('文件夹绑定未启用', 'Folder bindings not enabled')
  if (readyCount <= 0) {
    return t(
      `文件夹已绑定 ${boundCount} 个槽位 · 当前走默认模式`,
      `${boundCount} folder slots bound · fallback mode active`,
    )
  }
  return t(
    `文件夹就绪 ${readyCount}/${boundCount} · 素材 ${totalAssets} 项`,
    `Folders ready ${readyCount}/${boundCount} · ${totalAssets} assets`,
  )
}

const autoGenerateProfile = async () => {
  if (!profileDraft.name.trim()) {
    setUiNotice('warning', t('请至少输入一个名字。', 'Please enter at least one name.'))
    return
  }

  loadingAI.value = true
  const prompt = `我要创建一个名为“${profileDraft.name.trim()}”的角色。职业/身份倾向：${profileDraft.role || '自由发挥但需合理'}。请返回 JSON：{"role":"简短职业","bio":"详细性格描述"}，仅返回 JSON。`

  try {
    const text = await callAI({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: 'You are a character design helper. Return valid JSON only.',
      settings: settings.value,
    })
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(cleanText)

    if (typeof data.role === 'string') profileDraft.role = data.role
    if (typeof data.bio === 'string') profileDraft.bio = data.bio
    setUiNotice('success', t('AI 补全成功。', 'AI profile fill completed.'))
  } catch (error) {
    setUiNotice('error', `${t('生成失败', 'Generation failed')}: ${error?.message || ''}`)
  } finally {
    loadingAI.value = false
  }
}

onBeforeUnmount(() => {
  if (uiNoticeTimerId) clearTimeout(uiNoticeTimerId)
  clearDraftPreviewMap()
  galleryStore.releaseAssetPreviewScope(CONTACTS_ASSET_PREVIEW_SCOPE_ID)
})
</script>

<template>
  <div class="w-full h-full bg-white flex flex-col">
    <div class="pt-12 pb-2 px-4 flex justify-between items-center border-b">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('首页', 'Home') }}
      </button>
      <span class="font-bold">{{ t('联系人', 'Contacts') }}</span>
      <button @click="openCreateProfile" class="text-blue-500 text-xl"><i class="fas fa-plus"></i></button>
    </div>

    <p
      v-if="showUiNoticeMessage"
      class="px-4 py-2 text-[11px]"
      :class="
        showUiNoticeType === 'error'
          ? 'text-red-600'
          : showUiNoticeType === 'warning'
            ? 'text-amber-600'
            : 'text-emerald-600'
      "
    >
      {{ showUiNoticeMessage }}
    </p>

    <div v-if="showProfileModal" class="absolute inset-0 bg-white z-20 pt-12 px-4 flex flex-col animate-slide-in">
      <div class="flex justify-between mb-4">
        <button @click="closeProfileModal" class="text-blue-500">{{ t('取消', 'Cancel') }}</button>
        <span class="font-bold">
          {{ profileModalMode === 'create' ? t('新建角色档案', 'Create Role Profile') : t('编辑角色档案', 'Edit Role Profile') }}
        </span>
        <button @click="saveProfile" class="text-blue-500 font-bold">
          {{ profileModalMode === 'create' ? t('创建', 'Create') : t('保存', 'Save') }}
        </button>
      </div>

      <div class="flex flex-col items-center mb-4 relative">
        <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-3xl mb-2 overflow-hidden shadow-inner">
          <img
            v-if="profileDraft.name"
            :src="`https://api.dicebear.com/7.x/avataaars/svg?seed=${profileDraft.name}`"
            class="w-full h-full object-cover"
          />
          <i v-else class="fas fa-camera"></i>
        </div>
        <span class="text-blue-500 text-xs">{{ t('输入名字自动生成头像', 'Avatar auto-generates from name') }}</span>
      </div>

      <div class="space-y-3 overflow-y-auto pb-6 no-scrollbar">
        <input
          v-model="profileDraft.name"
          :placeholder="t('名字 / 昵称', 'Name / Display Name')"
          class="w-full border-b py-2 outline-none"
        />

        <div class="flex gap-2">
          <input v-model="profileDraft.role" :placeholder="t('职业 / 身份', 'Role / Identity')" class="flex-1 border-b py-2 outline-none" />
          <button
            @click="autoGenerateProfile"
            class="bg-purple-100 text-purple-600 px-3 rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <i class="fas fa-magic"></i>
            {{ loadingAI ? t('生成中...', 'Generating...') : t('AI 补全人设', 'AI Fill') }}
          </button>
        </div>

        <div class="bg-gray-50 p-2 rounded-lg">
          <label class="text-[10px] text-gray-400 uppercase font-bold">{{ t('详细人设', 'Detailed Prompt') }}</label>
          <textarea
            v-model="profileDraft.bio"
            class="w-full bg-transparent text-xs h-20 outline-none resize-none mt-1"
            :placeholder="t('手动输入，或点击 AI 补全。', 'Type manually or use AI fill.')"
          ></textarea>
        </div>

        <div class="flex items-center justify-between border-b py-2">
          <span>{{ t('类型', 'Type') }}</span>
          <div class="flex gap-2">
            <button
              @click="profileDraft.isMain = true"
              :class="profileDraft.isMain ? 'bg-blue-500 text-white' : 'bg-gray-200'"
              class="px-3 py-1 rounded text-xs"
            >
              {{ t('主角色', 'Main') }}
            </button>
            <button
              @click="profileDraft.isMain = false"
              :class="!profileDraft.isMain ? 'bg-blue-500 text-white' : 'bg-gray-200'"
              class="px-3 py-1 rounded text-xs"
            >
              NPC
            </button>
          </div>
        </div>

        <div class="rounded-xl border border-gray-200 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-700">
              {{ t('知识点绑定（全局档案）', 'Knowledge Binding (Global Profile)') }}
            </p>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-gray-500">
                {{ t('已选', 'Selected') }} {{ profileDraft.knowledgePointIds.length }}
              </span>
              <button
                @click="clearDraftKnowledgePoints"
                class="px-2 py-0.5 rounded border border-gray-200 text-[10px] text-gray-600 hover:bg-gray-50"
              >
                {{ t('清空', 'Clear') }}
              </button>
            </div>
          </div>

          <p class="text-[11px] text-gray-500">
            {{
              t(
                '绑定后，该角色在 Chat 中会注入对应知识点（仅注入启用项）。',
                'Bound points are injected for this role in Chat (enabled points only).',
              )
            }}
          </p>

          <div
            v-if="availableKnowledgePoints.length === 0"
            class="text-[11px] text-gray-500 rounded-lg border border-dashed border-gray-200 px-2 py-3 text-center"
          >
            {{
              t(
                '暂无知识点。请先在世界书中新增知识点。',
                'No knowledge points yet. Add them in World Book first.',
              )
            }}
          </div>

          <div v-else class="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-0.5">
            <button
              v-for="point in availableKnowledgePoints"
              :key="point.id"
              @click="toggleDraftKnowledgePoint(point.id)"
              class="rounded-lg border px-2.5 py-2 text-left"
              :class="
                isDraftKnowledgePointSelected(point.id)
                  ? 'border-blue-300 bg-blue-50'
                  : point.enabled === false
                    ? 'border-gray-200 bg-gray-50 opacity-70'
                    : 'border-gray-200 bg-white'
              "
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-[12px] font-semibold truncate">{{ point.title }}</p>
                <span class="text-[10px] text-gray-500">
                  {{ point.enabled === false ? t('停用', 'Disabled') : t('启用', 'Enabled') }}
                </span>
              </div>
              <p class="text-[11px] text-gray-600 line-clamp-2 mt-1">{{ point.content }}</p>
            </button>
          </div>
        </div>

        <div class="rounded-xl border border-gray-200 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-700">{{ t('素材包绑定（全局档案）', 'Asset Pack Binding (Global Profile)') }}</p>
            <span class="text-[10px] text-gray-500">
              {{ t('壁纸', 'Wallpaper') }} {{ draftAssetCountMap.wallpaper }} ·
              {{ t('表情', 'Emoji') }} {{ draftAssetCountMap.emoji }} ·
              {{ t('参考', 'Reference') }} {{ draftAssetCountMap.reference }} ·
              {{ t('场景', 'Scenario') }} {{ draftAssetCountMap.scenario }}
            </span>
          </div>

          <div class="flex gap-1.5">
            <button
              v-for="def in ASSET_PACK_CATEGORY_DEFS"
              :key="def.type"
              @click="assetPackCategory = def.type"
              class="px-2 py-1 rounded-lg text-[11px] border"
              :class="assetPackCategory === def.type ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'"
            >
              {{ t(def.labelZh, def.labelEn) }}
            </button>
          </div>

          <div v-if="!hasAnyGalleryAsset" class="text-[11px] text-gray-500 rounded-lg border border-dashed border-gray-200 px-2 py-3 text-center">
            {{ t('相册暂无素材，请先在相册导入后再绑定。', 'No gallery assets yet. Import in Gallery first.') }}
          </div>

          <div v-else class="space-y-2">
            <div class="flex items-center justify-between text-[11px] text-gray-500">
              <span>{{ t('当前分类', 'Current category') }}: {{ categoryLabel(assetPackCategory) }}</span>
              <button
                @click="clearDraftCategoryAssets"
                class="px-2 py-0.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                {{ t('清空本类', 'Clear category') }}
              </button>
            </div>
            <div class="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-0.5">
              <button
                v-for="asset in availableAssets"
                :key="asset.id"
                @click="toggleDraftAsset(asset.id)"
                class="rounded-lg border p-1.5 text-left"
                :class="isDraftAssetSelected(asset.id, activeAssetCategoryConfig.key) ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'"
              >
                <div class="w-full h-14 rounded-md bg-gray-100 overflow-hidden">
                  <img
                    v-if="draftPreviewMap[asset.id]"
                    :src="draftPreviewMap[asset.id]"
                    class="w-full h-full object-cover"
                  />
                  <div v-else class="w-full h-full flex items-center justify-center text-[10px] text-gray-400">{{ t('加载中', 'Loading') }}</div>
                </div>
                <p class="mt-1 text-[10px] text-gray-700 line-clamp-1">{{ asset.name }}</p>
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-gray-200 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-700">
              {{ t('形象照文件夹绑定（全局档案）', 'Profile Image Folder Binding (Global Profile)') }}
            </p>
            <span class="text-[10px] text-gray-500">
              {{
                profileDraft.assetFolderBindings.profileImage.folderId
                  ? t('已绑定', 'Bound')
                  : t('未绑定', 'Unbound')
              }}
            </span>
          </div>

          <select
            v-model="profileDraft.assetFolderBindings.profileImage.folderId"
            class="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] bg-white outline-none"
          >
            <option value="">{{ t('不绑定文件夹（默认）', 'No folder binding (default)') }}</option>
            <option
              v-for="folder in profileImageFolderOptions"
              :key="`profile-image-folder-${folder.id}`"
              :value="folder.id"
            >
              {{ folder.name }}
            </option>
          </select>

          <p class="text-[11px] text-gray-500">
            {{
              profileImageFolderOptions.length > 0
                ? t('用于角色形象照/自拍图的优先素材来源（按档案全局生效）。', 'Used as preferred source for role profile photos/selfies (global profile scope).')
                : t('暂无可用文件夹。可先在相册创建后再绑定。', 'No folders available yet. Create one in Gallery first.')
            }}
          </p>
          <div class="flex items-start justify-between gap-3">
            <p class="text-[11px]" :class="folderBindingStatusClass(getDraftFolderBindingSummary('profileImage'))">
              {{ describeFolderBindingSummary(getDraftFolderBindingSummary('profileImage')) }}
            </p>
            <button
              type="button"
              class="shrink-0 text-[11px] text-blue-500"
              @click="router.push('/gallery')"
            >
              {{ t('前往相册', 'Open Gallery') }}
            </button>
          </div>
          <div v-if="getDraftFolderPreviewAssetIds('profileImage').length > 0" class="flex items-center gap-1.5">
            <div
              v-for="assetId in getDraftFolderPreviewAssetIds('profileImage')"
              :key="`profileImage-preview-${assetId}`"
              class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
            >
              <img
                v-if="draftPreviewMap[assetId]"
                :src="draftPreviewMap[assetId]"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-[9px] text-gray-400">
                {{ t('加载中', 'Loading') }}
              </div>
            </div>
            <span
              v-if="getDraftFolderPreviewOverflowCount('profileImage') > 0"
              class="text-[10px] text-gray-500"
            >
              +{{ getDraftFolderPreviewOverflowCount('profileImage') }}
            </span>
          </div>
        </div>

        <div class="rounded-xl border border-gray-200 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-700">
              {{ t('动态图文件夹绑定（全局档案）', 'Dynamic Media Folder Binding (Global Profile)') }}
            </p>
            <span class="text-[10px] text-gray-500">
              {{
                profileDraft.assetFolderBindings.dynamicMedia.folderId
                  ? t('已绑定', 'Bound')
                  : t('未绑定', 'Unbound')
              }}
            </span>
          </div>

          <select
            v-model="profileDraft.assetFolderBindings.dynamicMedia.folderId"
            class="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] bg-white outline-none"
          >
            <option value="">{{ t('不绑定文件夹（默认）', 'No folder binding (default)') }}</option>
            <option
              v-for="folder in dynamicMediaFolderOptions"
              :key="`dynamic-folder-${folder.id}`"
              :value="folder.id"
            >
              {{ folder.name }}
            </option>
          </select>

          <p class="text-[11px] text-gray-500">
            {{
              dynamicMediaFolderOptions.length > 0
                ? t('用于角色动态图/动态内容的优先素材来源（按档案全局生效）。', 'Used as preferred source for role dynamic media/posts (global profile scope).')
                : t('暂无“场景图”文件夹。可先在相册创建后再绑定。', 'No scenario folders yet. Create one in Gallery first.')
            }}
          </p>
          <div class="flex items-start justify-between gap-3">
            <p class="text-[11px]" :class="folderBindingStatusClass(getDraftFolderBindingSummary('dynamicMedia'))">
              {{ describeFolderBindingSummary(getDraftFolderBindingSummary('dynamicMedia')) }}
            </p>
            <button
              type="button"
              class="shrink-0 text-[11px] text-blue-500"
              @click="router.push('/gallery')"
            >
              {{ t('前往相册', 'Open Gallery') }}
            </button>
          </div>
          <div v-if="getDraftFolderPreviewAssetIds('dynamicMedia').length > 0" class="flex items-center gap-1.5">
            <div
              v-for="assetId in getDraftFolderPreviewAssetIds('dynamicMedia')"
              :key="`dynamicMedia-preview-${assetId}`"
              class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
            >
              <img
                v-if="draftPreviewMap[assetId]"
                :src="draftPreviewMap[assetId]"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-[9px] text-gray-400">
                {{ t('加载中', 'Loading') }}
              </div>
            </div>
            <span
              v-if="getDraftFolderPreviewOverflowCount('dynamicMedia') > 0"
              class="text-[10px] text-gray-500"
            >
              +{{ getDraftFolderPreviewOverflowCount('dynamicMedia') }}
            </span>
          </div>
        </div>

        <div class="rounded-xl border border-gray-200 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-700">
              {{ t('表情包文件夹绑定（全局档案）', 'Emoji Folder Binding (Global Profile)') }}
            </p>
            <span class="text-[10px] text-gray-500">
              {{
                profileDraft.assetFolderBindings.emojiPack.folderId
                  ? t('已绑定', 'Bound')
                  : t('未绑定', 'Unbound')
              }}
            </span>
          </div>

          <select
            v-model="profileDraft.assetFolderBindings.emojiPack.folderId"
            class="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] bg-white outline-none"
          >
            <option value="">{{ t('不绑定文件夹（默认）', 'No folder binding (default)') }}</option>
            <option
              v-for="folder in emojiFolderOptions"
              :key="`emoji-folder-${folder.id}`"
              :value="folder.id"
            >
              {{ folder.name }}
            </option>
          </select>

          <p class="text-[11px] text-gray-500">
            {{
              emojiFolderOptions.length > 0
                ? t('用于角色发送表情时的优先素材来源（按档案全局生效）。', 'Used as preferred source when role sends emoji (global profile scope).')
                : t('暂无“表情”文件夹。可先在相册创建后再绑定。', 'No emoji folders yet. Create one in Gallery first.')
            }}
          </p>
          <div class="flex items-start justify-between gap-3">
            <p class="text-[11px]" :class="folderBindingStatusClass(getDraftFolderBindingSummary('emojiPack'))">
              {{ describeFolderBindingSummary(getDraftFolderBindingSummary('emojiPack')) }}
            </p>
            <button
              type="button"
              class="shrink-0 text-[11px] text-blue-500"
              @click="router.push('/gallery')"
            >
              {{ t('前往相册', 'Open Gallery') }}
            </button>
          </div>
          <div v-if="getDraftFolderPreviewAssetIds('emojiPack').length > 0" class="flex items-center gap-1.5">
            <div
              v-for="assetId in getDraftFolderPreviewAssetIds('emojiPack')"
              :key="`emojiPack-preview-${assetId}`"
              class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
            >
              <img
                v-if="draftPreviewMap[assetId]"
                :src="draftPreviewMap[assetId]"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-[9px] text-gray-400">
                {{ t('加载中', 'Loading') }}
              </div>
            </div>
            <span
              v-if="getDraftFolderPreviewOverflowCount('emojiPack') > 0"
              class="text-[10px] text-gray-500"
            >
              +{{ getDraftFolderPreviewOverflowCount('emojiPack') }}
            </span>
          </div>
        </div>

        <div class="rounded-xl border border-gray-200 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-700">
              {{ t('参考图文件夹绑定（全局档案）', 'Reference Folder Binding (Global Profile)') }}
            </p>
            <span class="text-[10px] text-gray-500">
              {{
                profileDraft.assetFolderBindings.imageReference.folderId
                  ? t('已绑定', 'Bound')
                  : t('未绑定', 'Unbound')
              }}
            </span>
          </div>

          <select
            v-model="profileDraft.assetFolderBindings.imageReference.folderId"
            class="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] bg-white outline-none"
          >
            <option value="">{{ t('不绑定文件夹（默认）', 'No folder binding (default)') }}</option>
            <option
              v-for="folder in referenceFolderOptions"
              :key="`ref-folder-${folder.id}`"
              :value="folder.id"
            >
              {{ folder.name }}
            </option>
          </select>

          <p class="text-[11px] text-gray-500">
            {{
              referenceFolderOptions.length > 0
                ? t('用于 AI 参考图优先来源（按档案全局生效）。', 'Used as preferred source for AI image references (global profile scope).')
                : t('暂无“参考图”文件夹。可先在相册创建后再绑定。', 'No reference folders yet. Create one in Gallery first.')
            }}
          </p>
          <div class="flex items-start justify-between gap-3">
            <p class="text-[11px]" :class="folderBindingStatusClass(getDraftFolderBindingSummary('imageReference'))">
              {{ describeFolderBindingSummary(getDraftFolderBindingSummary('imageReference')) }}
            </p>
            <button
              type="button"
              class="shrink-0 text-[11px] text-blue-500"
              @click="router.push('/gallery')"
            >
              {{ t('前往相册', 'Open Gallery') }}
            </button>
          </div>
          <div v-if="getDraftFolderPreviewAssetIds('imageReference').length > 0" class="flex items-center gap-1.5">
            <div
              v-for="assetId in getDraftFolderPreviewAssetIds('imageReference')"
              :key="`imageReference-preview-${assetId}`"
              class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200"
            >
              <img
                v-if="draftPreviewMap[assetId]"
                :src="draftPreviewMap[assetId]"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center text-[9px] text-gray-400">
                {{ t('加载中', 'Loading') }}
              </div>
            </div>
            <span
              v-if="getDraftFolderPreviewOverflowCount('imageReference') > 0"
              class="text-[10px] text-gray-500"
            >
              +{{ getDraftFolderPreviewOverflowCount('imageReference') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar">
      <div class="px-4 py-2">
        <div class="bg-gray-100 rounded-lg px-3 py-1.5 flex items-center text-gray-500 text-sm">
          <i class="fas fa-search mr-2"></i> {{ t('搜索', 'Search') }}
        </div>
      </div>

      <div class="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <div class="w-14 h-14 rounded-full bg-gray-300 overflow-hidden">
          <img
            :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.name"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-col flex">
          <span class="font-bold text-lg">{{ user.name }}</span>
          <span class="text-xs text-gray-400">{{ t('我的名片', 'My Card') }}</span>
        </div>
      </div>

      <div class="px-4 py-2">
        <div class="text-xs font-bold text-gray-500 mb-2">{{ t('我的 AI（主角色）', 'My AI (Main)') }}</div>
        <div
          v-for="contact in mainProfiles"
          :key="contact.id"
          class="flex items-center gap-3 py-2 border-b border-gray-50"
        >
          <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img
              :src="contact.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.name"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ contact.name }}</p>
            <p class="text-[11px] text-gray-400 truncate">{{ contact.role || t('未设置角色', 'Role not set') }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileAssetSummary(contact) }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileKnowledgeSummary(contact) }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileFolderBindingSummary(contact) }}</p>
          </div>
          <button @click="openEditProfile(contact)" class="text-xs text-blue-500">{{ t('编辑', 'Edit') }}</button>
          <button @click="removeProfile(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
        </div>

        <div class="text-xs font-bold text-gray-500 mt-4 mb-2">{{ t('其他联系人（NPC）', 'Other Contacts (NPC)') }}</div>
        <div
          v-for="contact in npcProfiles"
          :key="contact.id"
          class="flex items-center gap-3 py-2 border-b border-gray-50"
        >
          <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img
              :src="contact.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.name"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ contact.name }}</p>
            <p class="text-[11px] text-gray-400 truncate">{{ contact.role || t('未设置角色', 'Role not set') }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileAssetSummary(contact) }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileKnowledgeSummary(contact) }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileFolderBindingSummary(contact) }}</p>
          </div>
          <button @click="openEditProfile(contact)" class="text-xs text-blue-500">{{ t('编辑', 'Edit') }}</button>
          <button @click="removeProfile(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
