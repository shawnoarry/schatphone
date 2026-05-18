<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useGalleryStore } from '../stores/gallery'
import { useWalletStore } from '../stores/wallet'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'
import { callAI } from '../lib/ai'
import { summarizeRoleAssetFolderBindings } from '../lib/role-asset-folder-resolver'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import AssetThumbnailOption from '../components/assets/AssetThumbnailOption.vue'
import ImageSourcePicker from '../components/shared/ImageSourcePicker.vue'
import { pushReturnTarget } from '../lib/navigation-return'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const galleryStore = useGalleryStore()
const walletStore = useWalletStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
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

const normalizeDraftAvatarImage = (profile = {}) => {
  const source = profile.avatarImage && typeof profile.avatarImage === 'object'
    ? profile.avatarImage
    : null
  const legacyAvatar = typeof profile.avatar === 'string' ? profile.avatar.trim() : ''
  return {
    sourceType: source?.sourceType || source?.imageSourceType || (legacyAvatar ? 'url' : 'none'),
    url: source?.url || source?.imageUrl || legacyAvatar,
    galleryAssetId: source?.galleryAssetId || source?.imageGalleryAssetId || '',
  }
}

const buildDraftAvatarImage = () => ({
  imageSourceType: profileDraft.avatarImageSourceType,
  imageUrl: profileDraft.avatarImageSourceType === 'url' ? profileDraft.avatarImageUrl : '',
  imageGalleryAssetId:
    profileDraft.avatarImageSourceType === 'gallery' ? profileDraft.avatarImageGalleryAssetId : '',
  imageAlt: profileDraft.name,
})

const profileDraft = reactive({
  name: '',
  role: '',
  avatarImageSourceType: 'none',
  avatarImageUrl: '',
  avatarImageGalleryAssetId: '',
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

const galleryImageAssets = computed(() => galleryStore.assets.slice(0, 80))

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

const getDraftFolderPreviewAssets = (slotKey, limit = 3) =>
  getDraftFolderPreviewAssetIds(slotKey, limit).map((assetId) => ({
    id: assetId,
    name: galleryStore.findAssetById(assetId)?.name || roleFolderSlotLabel(slotKey),
  }))

const draftPreviewKeepAliveAssetIds = computed(() => {
  const previewIds = [
    ...availableAssets.value.map((asset) => asset.id),
    profileDraft.avatarImageSourceType === 'gallery' ? profileDraft.avatarImageGalleryAssetId : '',
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

const folderBindingStatusBadgeLabel = (summary) => {
  if (summary?.status === 'ready') return t('已连接', 'Ready')
  if (summary?.status === 'empty') return t('回退中', 'Fallback')
  if (summary?.status === 'missing_folder') return t('缺失', 'Missing')
  if (summary?.isBound) return t('已绑定', 'Bound')
  return t('未绑定', 'Unbound')
}

const folderBindingStatusBadgeTone = (summary) => {
  if (summary?.status === 'ready') return 'emerald'
  if (summary?.status === 'empty') return 'amber'
  if (summary?.status === 'missing_folder') return 'red'
  if (summary?.isBound) return 'amber'
  return 'neutral'
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
  pushReturnTarget(router, route, '/home')
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

const resolveAvatarImageUrl = (profile = {}) => {
  const avatarImage = normalizeDraftAvatarImage(profile)
  if (avatarImage.sourceType === 'url' && avatarImage.url) return avatarImage.url
  if (avatarImage.sourceType === 'gallery' && avatarImage.galleryAssetId) {
    const asset = galleryStore.findAssetById(avatarImage.galleryAssetId)
    if (asset?.sourceType === 'url' && asset.sourceUrl) return asset.sourceUrl
    return draftPreviewMap[avatarImage.galleryAssetId] || ''
  }
  return profile.avatar || ''
}

const fallbackAvatarUrl = (name = '') =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'Contact')}`

const draftAvatarPreviewUrl = computed(() =>
  resolveAvatarImageUrl({
    name: profileDraft.name,
    avatar: profileDraft.avatarImageSourceType === 'url' ? profileDraft.avatarImageUrl : '',
    avatarImage: buildDraftAvatarImage(),
  }) || fallbackAvatarUrl(profileDraft.name),
)

const contactAvatarUrl = (contact = {}) => resolveAvatarImageUrl(contact) || fallbackAvatarUrl(contact.name)

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
  profileDraft.avatarImageSourceType = 'none'
  profileDraft.avatarImageUrl = ''
  profileDraft.avatarImageGalleryAssetId = ''
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
  const avatarImage = normalizeDraftAvatarImage(profile)
  profileDraft.avatarImageSourceType = avatarImage.sourceType
  profileDraft.avatarImageUrl = avatarImage.url
  profileDraft.avatarImageGalleryAssetId = avatarImage.galleryAssetId
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
    avatarImage: buildDraftAvatarImage(),
    avatar: profileDraft.avatarImageSourceType === 'url' ? profileDraft.avatarImageUrl : '',
    isMain: profileDraft.isMain,
    bio: profileDraft.bio,
    knowledgePointIds: [...new Set(profileDraft.knowledgePointIds)],
    assetPack: cloneAssetPack(profileDraft.assetPack),
    assetFolderBindings: cloneAssetFolderBindings(profileDraft.assetFolderBindings),
  }

  if (profileModalMode.value === 'create') {
    chatStore.addRoleProfile({
      ...payload,
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

const formatLedgerAmount = (item) => {
  if (!item) return ''
  const sign = Number(item.amountCents) < 0 ? '-' : ''
  return `${sign}${item.amount} ${item.currency}`
}

const profileWalletLedgerSummary = (profile) => {
  const summary = walletStore.summarizeCounterpartyLedger(profile?.name || '')
  if (!summary.count) return t('暂无账本记录', 'No wallet ledger records')
  const primary = summary.currencies[0]
  const sourceHint =
    summary.chatCount > 0
      ? t(`${summary.chatCount} 条来自 Chat`, `${summary.chatCount} from Chat`)
      : summary.orderCount > 0
        ? t(`${summary.orderCount} 条来自订单`, `${summary.orderCount} from Orders`)
      : t('手动账本记录', 'Manual ledger records')
  return t(
    `账本 ${summary.count} 条 · 净额 ${formatLedgerAmount(primary)} · ${sourceHint}`,
    `${summary.count} ledger item(s) · net ${formatLedgerAmount(primary)} · ${sourceHint}`,
  )
}

const profileWalletLatestSummary = (profile) => {
  const latest = walletStore.summarizeCounterpartyLedger(profile?.name || '').latestTransaction
  if (!latest) return ''
  return t(
    `最近：${latest.title} · ${formatLedgerAmount({ amount: (latest.amountCents / 100).toFixed(2), amountCents: latest.type === 'expense' ? -latest.amountCents : latest.amountCents, currency: latest.currency })}`,
    `Latest: ${latest.title} · ${formatLedgerAmount({ amount: (latest.amountCents / 100).toFixed(2), amountCents: latest.type === 'expense' ? -latest.amountCents : latest.amountCents, currency: latest.currency })}`,
  )
}

const relationshipStageLabel = (stage) => {
  if (stage === 'intimate') return t('亲密', 'Intimate')
  if (stage === 'close') return t('亲近', 'Close')
  if (stage === 'friend') return t('朋友', 'Friend')
  if (stage === 'acquaintance') return t('熟人', 'Acquaintance')
  if (stage === 'distant') return t('疏远', 'Distant')
  if (stage === 'conflict') return t('冲突', 'Conflict')
  return t('陌生/未展开', 'Stranger / unset')
}

const profileRelationshipTarget = (profile) => ({
  entityKey: profile?.id ? `role:${profile.id}` : '',
  profileId: profile?.id,
  kind: 'role',
  name: profile?.name,
})

const profileRelationshipSnapshot = (profile) =>
  relationshipRuntimeStore.summarizeEntityForTarget(profileRelationshipTarget(profile), {
    eventLimit: 2,
    memoryLimit: 1,
  })

const profileRelationshipSummary = (profile) => {
  const snapshot = profileRelationshipSnapshot(profile)
  if (!snapshot) return t('关系快照：暂不可用', 'Relationship snapshot unavailable')
  const metrics = snapshot.metrics || {}
  return t(
    `关系快照：${relationshipStageLabel(snapshot.relationshipStage)} · 好感 ${metrics.affinity ?? 50} · 信任 ${metrics.trust ?? 50}`,
    `Relationship snapshot: ${relationshipStageLabel(snapshot.relationshipStage)} · affinity ${metrics.affinity ?? 50} · trust ${metrics.trust ?? 50}`,
  )
}

const profileRelationshipLatestSummary = (profile) => {
  const snapshot = profileRelationshipSnapshot(profile)
  if (!snapshot?.exists) return t('暂无跨模块关系事件', 'No cross-module relationship facts yet')
  const latestMemory = snapshot.memorySummaries?.[0]
  const memorySummary = latestMemory?.displaySummary || latestMemory?.primarySummary || latestMemory?.latestSummary || ''
  if (memorySummary) {
    return t(
      `共同记忆：${memorySummary}`,
      `Shared memory: ${memorySummary}`,
    )
  }
  const milestone = snapshot.milestones?.[0]?.label || ''
  if (milestone) return t(`最近里程碑：${milestone}`, `Latest milestone: ${milestone}`)
  if (snapshot.latestEventSummary) {
    return t(`最近关系事件：${snapshot.latestEventSummary}`, `Latest relationship event: ${snapshot.latestEventSummary}`)
  }
  return t('已有关系记录，等待更多事件沉淀。', 'Relationship record exists; waiting for more events.')
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
  <div class="contacts-shell w-full h-full bg-white flex flex-col">
    <div class="contacts-header pt-12 pb-2 px-4 flex justify-between items-center border-b">
      <button @click="goHome" class="contacts-nav-button text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('首页', 'Home') }}
      </button>
      <span class="font-bold">{{ t('联系人', 'Contacts') }}</span>
      <button @click="openCreateProfile" class="contacts-add-button text-blue-500 text-xl"><i class="fas fa-plus"></i></button>
    </div>

    <p
      v-if="showUiNoticeMessage"
      class="contacts-notice px-4 py-2 text-[11px]"
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

    <div v-if="showProfileModal" class="contacts-modal absolute inset-0 bg-white z-20 pt-12 px-4 flex flex-col animate-slide-in">
      <div class="contacts-modal-header flex justify-between mb-4">
        <button @click="closeProfileModal" class="text-blue-500">{{ t('取消', 'Cancel') }}</button>
        <span class="font-bold">
          {{ profileModalMode === 'create' ? t('新建角色档案', 'Create Role Profile') : t('编辑角色档案', 'Edit Role Profile') }}
        </span>
        <button @click="saveProfile" class="text-blue-500 font-bold">
          {{ profileModalMode === 'create' ? t('创建', 'Create') : t('保存', 'Save') }}
        </button>
      </div>

      <div class="contacts-avatar-preview flex flex-col items-center mb-4 relative">
        <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-3xl mb-2 overflow-hidden shadow-inner">
          <img
            v-if="draftAvatarPreviewUrl"
            :src="draftAvatarPreviewUrl"
            class="w-full h-full object-cover"
          />
          <i v-else class="fas fa-camera"></i>
        </div>
        <span class="text-blue-500 text-xs">{{ t('可用默认头像、URL 或 Gallery 素材', 'Use default, URL, or Gallery avatar') }}</span>
      </div>

      <div class="contacts-modal-scroll space-y-3 overflow-y-auto pb-6 no-scrollbar">
        <input
          v-model="profileDraft.name"
          :placeholder="t('名字 / 昵称', 'Name / Display Name')"
          class="w-full border-b py-2 outline-none"
        />

        <div class="rounded-xl border border-gray-200 p-3 space-y-2">
          <p class="text-xs font-semibold text-gray-700">{{ t('头像来源', 'Avatar source') }}</p>
          <ImageSourcePicker
            v-model:source-type="profileDraft.avatarImageSourceType"
            v-model:image-url="profileDraft.avatarImageUrl"
            v-model:gallery-asset-id="profileDraft.avatarImageGalleryAssetId"
            :gallery-assets="galleryImageAssets"
            :source-options="[
              { value: 'none', labelZh: '默认头像', labelEn: 'Default avatar' },
              { value: 'url', labelZh: 'URL 头像', labelEn: 'URL avatar' },
              { value: 'gallery', labelZh: 'Gallery 素材', labelEn: 'Gallery asset' },
            ]"
            url-placeholder-zh="https:// 头像图片地址"
            url-placeholder-en="https:// avatar image URL"
            gallery-placeholder-zh="选择 Gallery 头像素材"
            gallery-placeholder-en="Choose Gallery avatar asset"
            test-id-prefix="contacts-profile-avatar"
          />
          <p class="text-[11px] text-gray-500">
            {{ t('本地图片仍先进入相册，再在角色档案中引用。', 'Local images still enter through Gallery first, then are referenced by the role profile.') }}
          </p>
        </div>

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
                '绑定后，该角色在 Chat 中会注入对应知识点（仅注入启用项）；可在世界书查看使用情况。',
                'Bound points are injected for this role in Chat (enabled points only); usage is visible in World Book.',
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
              <AssetThumbnailOption
                v-for="asset in availableAssets"
                :key="asset.id"
                :asset="asset"
                :preview-url="draftPreviewMap[asset.id]"
                :selected="isDraftAssetSelected(asset.id, activeAssetCategoryConfig.key)"
                @select="toggleDraftAsset(asset.id)"
              >
              </AssetThumbnailOption>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-gray-200 p-3 space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold text-gray-700">
              {{ t('形象照文件夹绑定（全局档案）', 'Profile Image Folder Binding (Global Profile)') }}
            </p>
            <AssetStatusBadge
              :label="folderBindingStatusBadgeLabel(getDraftFolderBindingSummary('profileImage'))"
              :tone="folderBindingStatusBadgeTone(getDraftFolderBindingSummary('profileImage'))"
              :truncate="false"
            />
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
            <AssetThumbnailOption
              v-for="asset in getDraftFolderPreviewAssets('profileImage')"
              :key="`profileImage-preview-${asset.id}`"
              :asset="asset"
              :preview-url="draftPreviewMap[asset.id]"
              variant="mini"
              :interactive="false"
              :show-name="false"
            />
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
            <AssetStatusBadge
              :label="folderBindingStatusBadgeLabel(getDraftFolderBindingSummary('dynamicMedia'))"
              :tone="folderBindingStatusBadgeTone(getDraftFolderBindingSummary('dynamicMedia'))"
              :truncate="false"
            />
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
            <AssetThumbnailOption
              v-for="asset in getDraftFolderPreviewAssets('dynamicMedia')"
              :key="`dynamicMedia-preview-${asset.id}`"
              :asset="asset"
              :preview-url="draftPreviewMap[asset.id]"
              variant="mini"
              :interactive="false"
              :show-name="false"
            />
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
            <AssetStatusBadge
              :label="folderBindingStatusBadgeLabel(getDraftFolderBindingSummary('emojiPack'))"
              :tone="folderBindingStatusBadgeTone(getDraftFolderBindingSummary('emojiPack'))"
              :truncate="false"
            />
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
            <AssetThumbnailOption
              v-for="asset in getDraftFolderPreviewAssets('emojiPack')"
              :key="`emojiPack-preview-${asset.id}`"
              :asset="asset"
              :preview-url="draftPreviewMap[asset.id]"
              variant="mini"
              :interactive="false"
              :show-name="false"
            />
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
            <AssetStatusBadge
              :label="folderBindingStatusBadgeLabel(getDraftFolderBindingSummary('imageReference'))"
              :tone="folderBindingStatusBadgeTone(getDraftFolderBindingSummary('imageReference'))"
              :truncate="false"
            />
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
            <AssetThumbnailOption
              v-for="asset in getDraftFolderPreviewAssets('imageReference')"
              :key="`imageReference-preview-${asset.id}`"
              :asset="asset"
              :preview-url="draftPreviewMap[asset.id]"
              variant="mini"
              :interactive="false"
              :show-name="false"
            />
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

    <div class="contacts-scroll flex-1 overflow-y-auto no-scrollbar">
      <div class="px-4 py-2">
        <div class="contacts-search bg-gray-100 rounded-lg px-3 py-1.5 flex items-center text-gray-500 text-sm">
          <i class="fas fa-search mr-2"></i> {{ t('搜索', 'Search') }}
        </div>
      </div>

      <div class="contacts-my-card px-4 py-3 flex items-center gap-3 border-b border-gray-100">
        <div class="w-14 h-14 rounded-full bg-gray-300 overflow-hidden">
          <img
            :src="user.avatar || fallbackAvatarUrl(user.name)"
            class="w-full h-full object-cover"
          />
        </div>
        <div class="flex-col flex">
          <span class="font-bold text-lg">{{ user.name }}</span>
          <span class="text-xs text-gray-400">{{ t('我的名片', 'My Card') }}</span>
        </div>
      </div>

      <div class="contacts-list px-4 py-2">
        <div class="contacts-section-title text-xs font-bold text-gray-500 mb-2">{{ t('我的 AI（主角色）', 'My AI (Main)') }}</div>
        <div
          v-for="contact in mainProfiles"
          :key="contact.id"
          class="contacts-row flex items-center gap-3 py-2 border-b border-gray-50"
        >
          <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img
              :src="contactAvatarUrl(contact)"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ contact.name }}</p>
            <p class="text-[11px] text-gray-400 truncate">{{ contact.role || t('未设置角色', 'Role not set') }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileAssetSummary(contact) }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileKnowledgeSummary(contact) }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileFolderBindingSummary(contact) }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileWalletLedgerSummary(contact) }}</p>
            <p v-if="profileWalletLatestSummary(contact)" class="text-[10px] text-gray-400 truncate">
              {{ profileWalletLatestSummary(contact) }}
            </p>
            <p
              class="text-[10px] text-blue-500 truncate"
              :data-testid="`contacts-relationship-summary-${contact.id}`"
            >
              {{ profileRelationshipSummary(contact) }}
            </p>
            <p class="text-[10px] text-gray-400 truncate">
              {{ profileRelationshipLatestSummary(contact) }}
            </p>
          </div>
          <button @click="openEditProfile(contact)" class="text-xs text-blue-500">{{ t('编辑', 'Edit') }}</button>
          <button @click="removeProfile(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
        </div>

        <div class="contacts-section-title text-xs font-bold text-gray-500 mt-4 mb-2">{{ t('其他联系人（NPC）', 'Other Contacts (NPC)') }}</div>
        <div
          v-for="contact in npcProfiles"
          :key="contact.id"
          class="contacts-row flex items-center gap-3 py-2 border-b border-gray-50"
        >
          <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img
              :src="contactAvatarUrl(contact)"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ contact.name }}</p>
            <p class="text-[11px] text-gray-400 truncate">{{ contact.role || t('未设置角色', 'Role not set') }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileAssetSummary(contact) }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileKnowledgeSummary(contact) }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileFolderBindingSummary(contact) }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ profileWalletLedgerSummary(contact) }}</p>
            <p v-if="profileWalletLatestSummary(contact)" class="text-[10px] text-gray-400 truncate">
              {{ profileWalletLatestSummary(contact) }}
            </p>
            <p
              class="text-[10px] text-blue-500 truncate"
              :data-testid="`contacts-relationship-summary-${contact.id}`"
            >
              {{ profileRelationshipSummary(contact) }}
            </p>
            <p class="text-[10px] text-gray-400 truncate">
              {{ profileRelationshipLatestSummary(contact) }}
            </p>
          </div>
          <button @click="openEditProfile(contact)" class="text-xs text-blue-500">{{ t('编辑', 'Edit') }}</button>
          <button @click="removeProfile(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contacts-shell {
  --contacts-text: #172033;
  --contacts-muted: rgba(23, 32, 51, 0.62);
  --contacts-soft: rgba(23, 32, 51, 0.42);
  --contacts-accent: #426f8f;
  --contacts-accent-strong: #315f7c;
  --contacts-accent-soft: rgba(66, 111, 143, 0.13);
  --contacts-warm: #bf7354;
  --contacts-warm-soft: rgba(191, 115, 84, 0.12);
  --contacts-border: rgba(49, 64, 86, 0.12);
  --contacts-surface: rgba(255, 255, 255, 0.84);
  --contacts-surface-strong: rgba(255, 255, 255, 0.94);
  --contacts-shadow: 0 14px 34px rgba(45, 63, 89, 0.1);
  background:
    radial-gradient(circle at 12% 0%, rgba(75, 124, 154, 0.16), transparent 35%),
    radial-gradient(circle at 92% 14%, rgba(191, 115, 84, 0.13), transparent 34%),
    linear-gradient(180deg, #f8faf9 0%, #eef4f6 54%, #e8edf2 100%);
  color: var(--contacts-text);
}

.contacts-header {
  position: relative;
  border-bottom: 1px solid var(--contacts-border);
  background: rgba(251, 253, 252, 0.82);
  box-shadow: 0 12px 28px rgba(45, 63, 89, 0.08);
  backdrop-filter: blur(var(--system-blur-md));
  -webkit-backdrop-filter: blur(var(--system-blur-md));
}

.contacts-header::after {
  content: '';
  position: absolute;
  right: 52px;
  bottom: -1px;
  left: 52px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(66, 111, 143, 0.35), transparent);
  pointer-events: none;
}

.contacts-header span {
  font-size: 17px;
  line-height: 1.2;
  letter-spacing: 0;
  color: var(--contacts-text);
}

.contacts-nav-button,
.contacts-modal-header button,
.contacts-row button {
  color: var(--contacts-accent);
  -webkit-tap-highlight-color: transparent;
}

.contacts-nav-button,
.contacts-add-button {
  min-height: 36px;
}

.contacts-nav-button {
  border-radius: 12px;
  padding-right: 6px;
  padding-left: 2px;
}

.contacts-add-button {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--contacts-accent), #6f97ad);
  color: #fff;
  font-size: 16px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.36),
    0 10px 22px rgba(66, 111, 143, 0.26);
}

.contacts-nav-button:active,
.contacts-add-button:active,
.contacts-modal-header button:active {
  transform: scale(0.98);
}

.contacts-notice {
  background: rgba(255, 255, 255, 0.66);
  border-bottom: 1px solid var(--contacts-border);
}

.contacts-scroll {
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.contacts-search {
  min-height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--contacts-muted);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.contacts-search input {
  color: var(--contacts-text);
}

.contacts-search i {
  color: var(--contacts-soft);
}

.contacts-my-card {
  position: relative;
  overflow: hidden;
  margin: 6px 16px 12px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(232, 242, 245, 0.86) 56%, rgba(250, 239, 233, 0.78)),
    var(--contacts-surface-strong);
  box-shadow: var(--contacts-shadow);
}

.contacts-my-card::after {
  content: '';
  position: absolute;
  top: 12px;
  right: 12px;
  width: 84px;
  height: 56px;
  border-radius: 18px;
  background:
    linear-gradient(90deg, rgba(66, 111, 143, 0.16) 1px, transparent 1px),
    linear-gradient(180deg, rgba(66, 111, 143, 0.1) 1px, transparent 1px);
  background-size: 12px 12px;
  opacity: 0.52;
  pointer-events: none;
}

.contacts-my-card > * {
  position: relative;
  z-index: 1;
}

.contacts-my-card > .rounded-full,
.contacts-row > .rounded-full,
.contacts-avatar-preview .rounded-full {
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: linear-gradient(135deg, #e4edf1, #fbfcfd);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 10px 22px rgba(45, 63, 89, 0.13);
}

.contacts-list {
  padding-bottom: 24px;
}

.contacts-section-title {
  color: var(--contacts-muted);
  letter-spacing: 0;
}

.contacts-row {
  position: relative;
  overflow: hidden;
  margin-bottom: 8px;
  padding: 11px 12px 11px 14px;
  border: 1px solid var(--contacts-border);
  border-radius: 18px;
  background: var(--contacts-surface-strong);
  box-shadow: 0 10px 24px rgba(45, 63, 89, 0.07);
  transition:
    transform var(--system-motion-fast),
    box-shadow var(--system-motion-fast),
    border-color var(--system-motion-fast);
}

.contacts-row::before {
  content: '';
  position: absolute;
  top: 14px;
  bottom: 14px;
  left: 0;
  width: 3px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--contacts-accent), var(--contacts-warm));
  opacity: 0.72;
}

.contacts-row:active {
  transform: scale(0.992);
  border-color: rgba(66, 111, 143, 0.24);
  box-shadow: 0 8px 18px rgba(45, 63, 89, 0.08);
}

.contacts-row p,
.contacts-my-card span {
  letter-spacing: 0;
}

.contacts-row .text-gray-400,
.contacts-row .text-gray-500,
.contacts-my-card .text-gray-400 {
  color: var(--contacts-muted);
}

.contacts-row button:last-child {
  color: var(--system-danger);
}

.contacts-modal {
  background:
    radial-gradient(circle at 14% 0%, rgba(75, 124, 154, 0.14), transparent 36%),
    radial-gradient(circle at 100% 18%, rgba(191, 115, 84, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(251, 253, 252, 0.92), rgba(237, 243, 246, 0.98));
  color: var(--contacts-text);
}

.contacts-modal-header {
  min-height: 40px;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--contacts-border);
}

.contacts-modal-header span {
  font-size: 17px;
  line-height: 1.2;
  letter-spacing: 0;
}

.contacts-avatar-preview span {
  color: var(--contacts-accent);
}

.contacts-modal-scroll {
  padding-bottom: calc(28px + env(safe-area-inset-bottom));
}

.contacts-modal-scroll > .rounded-xl,
.contacts-modal-scroll > .bg-gray-50 {
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 18px;
  background: var(--contacts-surface-strong);
  box-shadow: 0 10px 24px rgba(45, 63, 89, 0.07);
}

.contacts-modal-scroll > .bg-gray-50 {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(233, 242, 245, 0.72)),
    var(--contacts-surface);
}

.contacts-modal-scroll > .flex.items-center.justify-between {
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid var(--contacts-border);
  border-radius: 16px;
  background: var(--contacts-surface);
}

.contacts-modal-scroll > .flex.gap-2 {
  align-items: stretch;
}

.contacts-modal-scroll input,
.contacts-modal-scroll textarea,
.contacts-modal-scroll select {
  border-color: var(--contacts-border);
  background: rgba(255, 255, 255, 0.8);
  color: var(--contacts-text);
  transition:
    border-color var(--system-motion-fast),
    box-shadow var(--system-motion-fast),
    background var(--system-motion-fast);
}

.contacts-modal-scroll input:focus,
.contacts-modal-scroll textarea:focus,
.contacts-modal-scroll select:focus {
  border-color: rgba(66, 111, 143, 0.44);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 0 0 4px var(--contacts-accent-soft);
}

.contacts-modal-scroll input.border-b {
  min-height: 42px;
  border-width: 1px;
  border-radius: 14px;
  padding-right: 10px;
  padding-left: 10px;
}

.contacts-modal-scroll textarea {
  line-height: 1.55;
}

.contacts-modal-scroll .bg-purple-100 {
  min-height: 42px;
  border: 1px solid rgba(191, 115, 84, 0.2);
  background: var(--contacts-warm-soft);
  color: #9d583e;
}

.contacts-modal-scroll .bg-blue-500,
.contacts-modal-scroll button.bg-blue-500 {
  background: linear-gradient(135deg, var(--contacts-accent), #6f97ad);
  box-shadow: 0 8px 18px rgba(66, 111, 143, 0.2);
}

.contacts-modal-scroll .bg-blue-50 {
  background: var(--contacts-accent-soft);
}

.contacts-modal-scroll .border-blue-300,
.contacts-modal-scroll .border-blue-200 {
  border-color: rgba(66, 111, 143, 0.3);
}

.contacts-modal-scroll .text-blue-700,
.contacts-modal-scroll .text-blue-600,
.contacts-modal-scroll .text-blue-500 {
  color: var(--contacts-accent-strong);
}

.contacts-modal-scroll .bg-gray-200,
.contacts-modal-scroll .bg-gray-100,
.contacts-modal-scroll .bg-gray-50 {
  background: rgba(242, 246, 247, 0.84);
}

.contacts-modal-scroll button {
  border-radius: 12px;
  -webkit-tap-highlight-color: transparent;
}

.contacts-nav-button:focus-visible,
.contacts-add-button:focus-visible,
.contacts-modal-header button:focus-visible,
.contacts-modal-scroll button:focus-visible,
.contacts-modal-scroll input:focus-visible,
.contacts-modal-scroll textarea:focus-visible,
.contacts-modal-scroll select:focus-visible {
  outline: 2px solid rgba(66, 111, 143, 0.35);
  outline-offset: 2px;
}

.contacts-modal-scroll .grid button {
  transition:
    transform var(--system-motion-fast),
    border-color var(--system-motion-fast),
    background var(--system-motion-fast);
}

.contacts-modal-scroll .grid button:active {
  transform: scale(0.985);
}
</style>
