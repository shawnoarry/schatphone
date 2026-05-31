<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { CHAT_CONTACT_SOCIAL_STATES, useChatStore } from '../stores/chat'
import { useGalleryStore } from '../stores/gallery'
import { useSystemStore } from '../stores/system'
import { useBookStore } from '../stores/book'
import {
  getRoleAssetFolderSlotKeysByCategory,
  resolveFolderBoundAssetIds,
  summarizeRoleAssetFolderBindings,
} from '../lib/role-asset-folder-resolver'
import {
  getAvatarImageGalleryAssetId,
  resolveAvatarImageSourceUrl,
} from '../lib/avatar-image-source-resolver'
import {
  FOOD_DELIVERY_SERVICE_PRESETS,
  LOGISTICS_SERVICE_PRESETS,
  SHOPPING_SERVICE_PRESETS,
  findFoodDeliveryServicePreset,
  findLogisticsServicePreset,
  findShoppingServicePreset,
} from '../lib/planned-module-registry'
import { buildWorldServiceTemplateGenerationRows } from '../lib/world-pack-service-accounts'
import { extractWorldServiceTemplateProposals } from '../lib/world-service-template-proposals'
import { formatApiErrorForUi } from '../lib/ai'
import { resolveWorldviewText } from '../lib/world-interface'
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import AssetThumbnailOption from '../components/assets/AssetThumbnailOption.vue'
import ChatAppTabBar from '../components/chat/ChatAppTabBar.vue'
import ImageSourcePicker from '../components/shared/ImageSourcePicker.vue'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const galleryStore = useGalleryStore()
const systemStore = useSystemStore()
const bookStore = useBookStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()
const { contacts, roleProfiles } = storeToRefs(chatStore)
const { settings } = storeToRefs(systemStore)

const normalizeDirectorySection = (value) => (value === 'service' ? 'service' : 'roles')
const normalizeRoleFilter = (value) =>
  ['all', 'main', 'npc', 'connected', 'requests', 'blocked'].includes(value) ? value : 'all'
const normalizeServiceFilter = (value) =>
  ['all', 'unread', 'muted', 'folded', 'service', 'official'].includes(value) ? value : 'all'

const initialDirectorySection = normalizeDirectorySection(route.query.section)
const activeSection = ref(initialDirectorySection)
const searchKeyword = ref('')
const roleFilter = ref(initialDirectorySection === 'roles' ? normalizeRoleFilter(route.query.filter) : 'all')
const serviceFilter = ref(initialDirectorySection === 'service' ? normalizeServiceFilter(route.query.filter) : 'all')
const batchMode = ref(false)
const selectedContactIds = ref([])
const showServiceManagement = ref(false)
const showBindModal = ref(false)
const bindProfileId = ref(0)
const directoryScrollAreaRef = ref(null)

const showRoleMetaModal = ref(false)
const editingRoleContactId = ref(0)
const roleMetaDraft = reactive({
  relationshipLevel: 50,
  relationshipNote: '',
  preferredImageAssetId: '',
})

const showServiceModal = ref(false)
const serviceModalMode = ref('create')
const editingServiceId = ref(0)
const serviceDraft = reactive({
  name: '',
  kind: 'service',
  template: '',
  bio: '',
  avatarImageSourceType: 'none',
  avatarImageUrl: '',
  avatarImageGalleryAssetId: '',
  shoppingServiceKey: '',
  logisticsServiceKey: '',
  foodDeliveryServiceKey: '',
})

const showWorldServiceTemplateModal = ref(false)
const worldServiceTemplateDraft = reactive({
  id: '',
  title: '',
  category: 'service_notification',
  description: '',
  linkedAppBindingId: '',
})
const worldServiceProposalDraft = ref('')
const worldServiceProposalReview = ref(null)
const worldServiceProposalLoading = ref(false)
const worldServiceProposalNotice = ref('')
const worldServiceProposalNoticeTone = ref('info')

const roleMetaTemplatePresets = [
  {
    id: 'polite_start',
    titleCn: '礼貌初识',
    titleEn: 'Polite Start',
    relationshipLevel: 45,
    relationshipNoteCn: '保持礼貌边界，慢速建立信任。',
    relationshipNoteEn: 'Keep polite boundaries and build trust slowly.',
  },
  {
    id: 'warm_daily',
    titleCn: '日常升温',
    titleEn: 'Warm Daily',
    relationshipLevel: 65,
    relationshipNoteCn: '日常互动偏主动，关注对方情绪变化。',
    relationshipNoteEn: 'Use proactive daily interactions and track mood changes.',
  },
  {
    id: 'close_bond',
    titleCn: '高亲密关系',
    titleEn: 'Close Bond',
    relationshipLevel: 82,
    relationshipNoteCn: '称呼更亲近，回应节奏更密集。',
    relationshipNoteEn: 'Use closer addressing and denser reply rhythm.',
  },
]

const serviceTemplatePresets = [
  {
    id: 'sys_notice',
    kind: 'service',
    nameCn: '系统通知',
    nameEn: 'System Notice',
    templateCn: '系统通知模板',
    templateEn: 'System Notification Template',
    bioCn: '用于发系统消息、状态变更和提醒。',
    bioEn: 'For status updates and in-app reminders.',
  },
  {
    id: 'task_assistant',
    kind: 'service',
    nameCn: '任务助手',
    nameEn: 'Task Assistant',
    templateCn: '任务流转模板',
    templateEn: 'Task Flow Template',
    bioCn: '用于派发任务、催办和结果反馈。',
    bioEn: 'For task assignment, follow-up, and result feedback.',
  },
  {
    id: 'world_feed',
    kind: 'official',
    nameCn: '世界动态',
    nameEn: 'World Feed',
    templateCn: '资讯播报模板',
    templateEn: 'News Broadcast Template',
    bioCn: '用于剧情动态、公共消息与活动公告。',
    bioEn: 'For world events, public updates, and announcements.',
  },
]

const selectedRoleTemplateId = ref(roleMetaTemplatePresets[0]?.id || '')
const selectedServiceTemplateId = ref(serviceTemplatePresets[0]?.id || '')
const uiNoticeType = ref('')
const uiNoticeMessage = ref('')
const rolePreviewMap = reactive({})
const CHAT_DIRECTORY_ASSET_PREVIEW_SCOPE_ID = 'chat-directory-view'
let uiNoticeTimerId = null

const normalizeDraftAvatarImage = (contact = {}) => {
  const source = contact.avatarImage && typeof contact.avatarImage === 'object'
    ? contact.avatarImage
    : null
  const legacyAvatar = typeof contact.avatar === 'string' ? contact.avatar.trim() : ''
  return {
    sourceType: source?.sourceType || source?.imageSourceType || (legacyAvatar ? 'url' : 'none'),
    url: source?.url || source?.imageUrl || legacyAvatar,
    galleryAssetId: source?.galleryAssetId || source?.imageGalleryAssetId || '',
  }
}

const buildServiceDraftAvatarImage = () => ({
  imageSourceType: serviceDraft.avatarImageSourceType,
  imageUrl: serviceDraft.avatarImageSourceType === 'url' ? serviceDraft.avatarImageUrl : '',
  imageGalleryAssetId:
    serviceDraft.avatarImageSourceType === 'gallery' ? serviceDraft.avatarImageGalleryAssetId : '',
  imageAlt: serviceDraft.name,
})

const showUiNotice = (type, message, durationMs = 2200) => {
  const text = typeof message === 'string' ? message.trim() : ''
  if (!text) return
  uiNoticeType.value = type
  uiNoticeMessage.value = text
  if (uiNoticeTimerId) clearTimeout(uiNoticeTimerId)
  uiNoticeTimerId = setTimeout(() => {
    uiNoticeType.value = ''
    uiNoticeMessage.value = ''
  }, durationMs)
}

const roleBindings = computed(() =>
  contacts.value
    .filter((item) => (item.kind || 'role') === 'role')
    .map((item) => chatStore.getContactById(item.id))
    .filter(Boolean),
)

const boundProfileIds = computed(() =>
  new Set(
    contacts.value
      .filter((item) => (item.kind || 'role') === 'role' && Number(item.profileId) > 0)
      .map((item) => Number(item.profileId)),
  ),
)

const unboundRoleProfilesRaw = computed(() =>
  roleProfiles.value.filter((profile) => !boundProfileIds.value.has(Number(profile.id))),
)

const serviceContacts = computed(() =>
  contacts.value
    .filter((item) => item.kind === 'service' || item.kind === 'official')
    .map((item) => chatStore.getContactById(item.id))
    .filter(Boolean),
)

const activeWorldPack = computed(() => systemStore.getActiveWorldPack?.() || null)

const activeWorldPackDisplayName = computed(() => {
  const pack = activeWorldPack.value || {}
  return t(pack.title || pack.name || '当前世界观', pack.name || pack.title || 'Current world')
})

const worldPackServiceTemplateRows = computed(() => {
  const pack = activeWorldPack.value
  if (!pack?.id) return []

  return buildWorldServiceTemplateGenerationRows({
    pack,
    findExistingContact: (packId, templateId) =>
      chatStore.findWorldServiceTemplateContact(packId, templateId),
  }).filter((row) => row?.payload)
})

const hasWorldPackServiceTemplateRows = computed(() => worldPackServiceTemplateRows.value.length > 0)
const worldPackServiceJoinedCount = computed(() =>
  worldPackServiceTemplateRows.value.filter((row) => row.generated).length,
)
const worldPackServiceAvailableCount = computed(() =>
  worldPackServiceTemplateRows.value.filter((row) => !row.generated).length,
)

const activeWorldPackAppBindingOptions = computed(() =>
  (Array.isArray(activeWorldPack.value?.appBindings) ? activeWorldPack.value.appBindings : [])
    .filter((binding) => binding?.id && binding.enabled !== false)
    .map((binding) => ({
      id: binding.id,
      label: binding.title || binding.id,
    })),
)

const worldServiceProposalRowCount = computed(
  () =>
    (worldServiceProposalReview.value?.confirmableProposals?.length || 0) +
    (worldServiceProposalReview.value?.rejectedProposals?.length || 0),
)

const worldServiceProposalReviewIsEmpty = computed(
  () => Boolean(worldServiceProposalReview.value) && worldServiceProposalRowCount.value === 0,
)

const worldServiceProposalNoticeToneClass = computed(
  () => {
    if (worldServiceProposalNoticeTone.value === 'success') return 'border border-emerald-100 bg-emerald-50 text-emerald-700'
    if (worldServiceProposalNoticeTone.value === 'warning') return 'border border-amber-100 bg-amber-50 text-amber-700'
    if (worldServiceProposalNoticeTone.value === 'danger') return 'border border-red-100 bg-red-50 text-red-700'
    return 'border border-sky-100 bg-sky-50 text-sky-700'
  },
)

const roleFilterOptions = computed(() => [
  { key: 'connected', label: t('已聊天', 'Chatting') },
  { key: 'requests', label: t('消息请求', 'Requests') },
  { key: 'blocked', label: t('已屏蔽', 'Blocked') },
  { key: 'all', label: t('全部', 'All') },
  { key: 'main', label: t('主角色', 'Main') },
  { key: 'npc', label: t('NPC', 'NPC') },
])

const serviceFilterOptions = computed(() => [
  { key: 'all', label: t('订阅', 'Subscriptions') },
  { key: 'unread', label: t('未读', 'Unread') },
  { key: 'muted', label: t('免打扰', 'Muted') },
  { key: 'folded', label: t('已折叠', 'Folded') },
  { key: 'service', label: t('服务号', 'Service') },
  { key: 'official', label: t('公众号', 'Official') },
])

const shoppingServicePresetOptions = computed(() =>
  SHOPPING_SERVICE_PRESETS.map((preset) => ({
    ...preset,
    label: t(preset.zh, preset.en),
    desc: t(preset.descZh, preset.descEn),
  })),
)

const logisticsServicePresetOptions = computed(() =>
  LOGISTICS_SERVICE_PRESETS.map((preset) => ({
    ...preset,
    label: t(preset.zh, preset.en),
    desc: t(preset.descZh, preset.descEn),
  })),
)

const foodDeliveryServicePresetOptions = computed(() =>
  FOOD_DELIVERY_SERVICE_PRESETS.map((preset) => ({
    ...preset,
    label: t(preset.zh, preset.en),
    desc: t(preset.descZh, preset.descEn),
  })),
)

const normalizedSearchKeyword = computed(() => searchKeyword.value.trim().toLowerCase())

const includesSearch = (...fields) => {
  if (!normalizedSearchKeyword.value) return true
  return fields.some((field) =>
    typeof field === 'string' && field.toLowerCase().includes(normalizedSearchKeyword.value),
  )
}

const matchRoleType = (target) => {
  if (roleFilter.value === 'main') return target?.isMain === true
  if (roleFilter.value === 'npc') return target?.isMain !== true
  return true
}

const matchRoleSocialState = (contact) => {
  if (roleFilter.value === 'connected') {
    return chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.CONNECTED
  }
  if (roleFilter.value === 'requests') return chatStore.isChatMessageRequestContact(contact)
  if (roleFilter.value === 'blocked') return chatStore.isChatContactBlocked(contact)
  return true
}

const roleFilterIsSocialState = computed(() =>
  ['connected', 'requests', 'blocked'].includes(roleFilter.value),
)

const filteredRoleBindings = computed(() =>
  roleBindings.value.filter(
    (contact) =>
      matchRoleType(contact) &&
      matchRoleSocialState(contact) &&
      includesSearch(
        contact?.name,
        contact?.role,
        contact?.bio,
        contact?.relationshipNote,
        contact?.lastMessage,
      ),
  ),
)

const filteredUnboundRoleProfiles = computed(() =>
  unboundRoleProfilesRaw.value.filter(
    (profile) =>
      !roleFilterIsSocialState.value &&
      matchRoleType(profile) &&
      includesSearch(profile?.name, profile?.role, profile?.bio, (profile?.tags || []).join(' ')),
  ),
)

const filteredServiceContacts = computed(() =>
  serviceContacts.value
    .filter((contact) => {
      const conversation = chatStore.getConversationByContactId(contact.id)
      const unread = Math.max(0, Number(conversation?.unread) || 0)
      if (
        serviceFilter.value === 'all' &&
        !normalizedSearchKeyword.value &&
        chatStore.isChatSubscriptionFolded(contact)
      ) {
        return false
      }
      if (serviceFilter.value === 'unread' && unread <= 0) return false
      if (serviceFilter.value === 'muted' && !chatStore.isChatSubscriptionMuted(contact)) return false
      if (serviceFilter.value === 'folded' && !chatStore.isChatSubscriptionFolded(contact)) return false
      if (serviceFilter.value === 'service' && contact.kind !== 'service') return false
      if (serviceFilter.value === 'official' && contact.kind !== 'official') return false
      return includesSearch(
        contact?.name,
        contact?.role,
        contact?.serviceTemplate,
        contact?.shoppingServiceKey,
        contact?.logisticsServiceKey,
        contact?.foodDeliveryServiceKey,
        contact?.bio,
        contact?.lastMessage,
      )
    })
    .sort((a, b) => {
      const convA = chatStore.getConversationByContactId(a.id)
      const convB = chatStore.getConversationByContactId(b.id)
      if (Boolean(convA?.pinned) !== Boolean(convB?.pinned)) return convA?.pinned ? -1 : 1
      return (convB?.updatedAt || 0) - (convA?.updatedAt || 0)
    }),
)

const searchPlaceholder = computed(() =>
  activeSection.value === 'roles'
    ? t('搜索角色名/设定/备注', 'Search role name/profile/note')
    : t('搜索服务号/模板/说明', 'Search service account/template/description'),
)

const selectedContactIdSet = computed(() =>
  new Set(selectedContactIds.value.map((id) => Number(id)).filter((id) => Number.isFinite(id))),
)

const filteredRoleIds = computed(() =>
  filteredRoleBindings.value.map((contact) => Number(contact.id)).filter((id) => Number.isFinite(id)),
)

const filteredServiceIds = computed(() =>
  filteredServiceContacts.value.map((contact) => Number(contact.id)).filter((id) => Number.isFinite(id)),
)

const getRoleBindingContract = (contactId) =>
  chatStore.getRoleBindingContract(contactId, {
    moduleKey: 'chat',
  })

const roleFolderSlotShortLabel = (slotKey) => {
  if (slotKey === 'imageReference') return t('参考', 'Reference')
  if (slotKey === 'dynamicMedia') return t('动态', 'Dynamic')
  if (slotKey === 'profileImage') return t('形象', 'Profile')
  if (slotKey === 'emojiPack') return t('表情', 'Emoji')
  return slotKey || ''
}

const roleFolderBindingSummary = (contact) => {
  if (!contact?.id) return ''
  const contract = getRoleBindingContract(contact.id)
  const summaries = summarizeRoleAssetFolderBindings(
    galleryStore,
    contract.assets?.profileAssetFolderBindings,
  )
  const boundCount = summaries.filter((item) => item.isBound).length
  const readyCount = summaries.filter((item) => item.status === 'ready').length
  const totalAssets = summaries.reduce((sum, item) => sum + (item.assetCount || 0), 0)

  if (boundCount <= 0) return t('档案文件夹未启用', 'Profile folders not enabled')
  if (readyCount <= 0) {
    return t(
      `档案文件夹已绑定 ${boundCount} 个槽位 · 当前走默认模式`,
      `${boundCount} profile folders bound · fallback mode active`,
    )
  }
  return t(
    `档案文件夹就绪 ${readyCount}/${boundCount} · 素材 ${totalAssets} 项`,
    `Profile folders ready ${readyCount}/${boundCount} · ${totalAssets} assets`,
  )
}

const buildRoleFolderPreviewMeta = (contact, limit = 3) => {
  if (!contact?.id) {
    return {
      assetIds: [],
      totalCount: 0,
    }
  }

  const contract = getRoleBindingContract(contact.id)
  const summaries = summarizeRoleAssetFolderBindings(
    galleryStore,
    contract.assets?.profileAssetFolderBindings,
  )

  const assetIds = []
  summaries.forEach((summary) => {
    if (assetIds.length >= limit || !Array.isArray(summary.assetIds)) return
    summary.assetIds.forEach((assetId) => {
      if (assetIds.length >= limit) return
      if (typeof assetId !== 'string' || !assetId.trim() || assetIds.includes(assetId)) return
      assetIds.push(assetId)
    })
  })

  const totalCount = summaries.reduce((sum, summary) => sum + (summary.assetCount || 0), 0)

  return {
    assetIds,
    totalCount,
  }
}

const visibleRolePreviewMetaMap = computed(() =>
  Object.fromEntries(
    filteredRoleBindings.value.map((contact) => [Number(contact.id), buildRoleFolderPreviewMeta(contact, 3)]),
  ),
)

const getRolePreviewAssetIds = (contactId) => {
  const meta = visibleRolePreviewMetaMap.value[Number(contactId)]
  return Array.isArray(meta?.assetIds) ? meta.assetIds : []
}

const getRolePreviewOverflowCount = (contactId) => {
  const meta = visibleRolePreviewMetaMap.value[Number(contactId)]
  const totalCount = Number(meta?.totalCount) || 0
  const previewCount = Array.isArray(meta?.assetIds) ? meta.assetIds.length : 0
  return Math.max(0, totalCount - previewCount)
}

const ensureRolePreview = async (assetId) => {
  if (!assetId || rolePreviewMap[assetId]) return
  const previewUrl = await galleryStore.getAssetPreviewUrl(assetId, {
    scopeId: CHAT_DIRECTORY_ASSET_PREVIEW_SCOPE_ID,
  })
  if (!previewUrl) return
  rolePreviewMap[assetId] = previewUrl
}

const roleMetaSelectedAssetOption = computed(() => {
  const selectedId =
    typeof roleMetaDraft.preferredImageAssetId === 'string' ? roleMetaDraft.preferredImageAssetId.trim() : ''
  if (!selectedId) return null
  return roleMetaAssetOptions.value.find((asset) => asset.id === selectedId) || null
})

const roleMetaDefaultAssetOption = computed(() => roleMetaAssetOptions.value[0] || null)

const roleMetaPreviewLeadOption = computed(
  () => roleMetaSelectedAssetOption.value || roleMetaDefaultAssetOption.value,
)

const roleMetaPreviewTitle = computed(() => {
  if (roleMetaSelectedAssetOption.value) {
    return t('当前会话优先素材', 'Current thread preferred asset')
  }
  if (roleMetaDefaultAssetOption.value) {
    return t('当前使用档案默认素材', 'Currently using profile default asset')
  }
  return ''
})

const roleMetaPreviewDescription = computed(() => {
  if (roleMetaSelectedAssetOption.value) {
    return t(
      '这张图会优先作为本会话的图片参考与预览来源。',
      'This asset is currently preferred for this chat thread.',
    )
  }
  if (roleMetaDefaultAssetOption.value) {
    return t(
      '当前没有单独覆盖，会沿用角色档案绑定的默认素材。',
      'No thread-level override is active, so the profile-bound default remains in use.',
    )
  }
  return ''
})

const roleMetaQuickPreviewOptions = computed(() => roleMetaAssetOptions.value.slice(0, 4))

const roleMetaPreviewKeepAliveAssetIds = computed(() => {
  const ids = []
  const pushAssetId = (assetId) => {
    const normalized = typeof assetId === 'string' ? assetId.trim() : ''
    if (!normalized || ids.includes(normalized)) return
    ids.push(normalized)
  }

  pushAssetId(roleMetaPreviewLeadOption.value?.id)
  roleMetaQuickPreviewOptions.value.forEach((asset) => pushAssetId(asset.id))
  return ids
})

const visibleAvatarPreviewAssetIds = computed(() => {
  const ids = []
  const pushAssetId = (assetId) => {
    const normalized = typeof assetId === 'string' ? assetId.trim() : ''
    if (!normalized || ids.includes(normalized)) return
    ids.push(normalized)
  }

  filteredRoleBindings.value.forEach((contact) => {
    pushAssetId(getAvatarImageGalleryAssetId(contact?.avatarImage, contact?.avatar, contact?.name))
  })
  filteredServiceContacts.value.forEach((contact) => {
    pushAssetId(getAvatarImageGalleryAssetId(contact?.avatarImage, contact?.avatar, contact?.name))
  })
  if (showServiceModal.value && serviceDraft.avatarImageSourceType === 'gallery') {
    pushAssetId(serviceDraft.avatarImageGalleryAssetId)
  }
  return ids
})

const roleMetaAssetOptions = computed(() => {
  if (!editingRoleContactId.value) return []
  const contract = getRoleBindingContract(editingRoleContactId.value)
  const preferredId =
    typeof contract.assets?.preferredImageAssetId === 'string'
      ? contract.assets.preferredImageAssetId.trim()
      : ''
  const profileAssetIds = Array.isArray(contract.assets?.profileAssetIds)
    ? contract.assets.profileAssetIds
    : []
  const profileAssetSet = new Set(profileAssetIds)
  const folderResolved = resolveFolderBoundAssetIds(
    galleryStore,
    contract.assets?.profileAssetFolderBindings,
    getRoleAssetFolderSlotKeysByCategory('reference'),
    {
      category: 'all',
      limit: 96,
    },
  )
  const folderAssetSet = new Set(folderResolved.assetIds)

  const mergedIds = []
  const pushAssetId = (assetId) => {
    const normalized =
      typeof assetId === 'string'
        ? assetId.trim()
        : ''
    if (!normalized || mergedIds.includes(normalized)) return
    mergedIds.push(normalized)
  }

  pushAssetId(preferredId)
  profileAssetIds.forEach((assetId) => pushAssetId(assetId))
  folderResolved.assetIds.forEach((assetId) => pushAssetId(assetId))

  return mergedIds.map((assetId) => {
    const asset = galleryStore.findAssetById(assetId)
    const fromPack = profileAssetSet.has(assetId)
    const fromFolder = folderAssetSet.has(assetId)
    const isPreferred = preferredId && assetId === preferredId
    const sourceEntry = folderResolved.sourceByAssetId[assetId]
    const folderSlotText =
      Array.isArray(sourceEntry?.slotKeys) && sourceEntry.slotKeys.length > 0
        ? sourceEntry.slotKeys.map((slotKey) => roleFolderSlotShortLabel(slotKey)).join('/')
        : ''
    const folderSlotLabel = folderSlotText || t('角色槽位', 'Role slot')

    const sourceLabel = isPreferred
      ? t('会话优先', 'Thread preferred')
      : fromFolder && fromPack
        ? t('档案+文件夹', 'Pack + Folder')
        : fromFolder
          ? t(`文件夹(${folderSlotLabel})`, `Folder (${folderSlotLabel})`)
          : fromPack
            ? t('档案素材包', 'Profile pack')
            : ''

    return {
      id: assetId,
      label: sourceLabel ? `${asset?.name || assetId} · ${sourceLabel}` : asset?.name || assetId,
    }
  })
})

const serviceAvatarGalleryOptions = computed(() =>
  galleryStore.assets
    .filter((asset) => ['reference', 'scenario', 'wallpaper'].includes(asset.category))
    .slice(0, 80),
)

const roleMetaAssetContextLabel = computed(() => {
  if (!editingRoleContactId.value) return ''
  const contract = getRoleBindingContract(editingRoleContactId.value)
  const profileName = contract.profile?.name || contract.contact?.name || ''
  if (!profileName) return ''
  const packCount = Array.isArray(contract.assets?.profileAssetIds)
    ? contract.assets.profileAssetIds.length
    : 0
  const folderCount = resolveFolderBoundAssetIds(
    galleryStore,
    contract.assets?.profileAssetFolderBindings,
    getRoleAssetFolderSlotKeysByCategory('reference'),
    {
      category: 'all',
      limit: 96,
    },
  ).assetIds.length
  return t(
    `来源档案：${profileName}（素材包 ${packCount} · 文件夹 ${folderCount}）`,
    `Source profile: ${profileName} (pack ${packCount} · folder ${folderCount})`,
  )
})

watch(
  () =>
    [...new Set(
      [
        ...filteredRoleBindings.value.flatMap((contact) => getRolePreviewAssetIds(contact.id)),
        ...visibleAvatarPreviewAssetIds.value,
        ...roleMetaPreviewKeepAliveAssetIds.value,
      ],
    )],
  (assetIds) => {
    const activeSet = new Set(assetIds)
    assetIds.forEach((assetId) => {
      void ensureRolePreview(assetId)
    })
    Object.keys(rolePreviewMap).forEach((assetId) => {
      if (!activeSet.has(assetId)) {
        galleryStore.releaseAssetPreview(assetId, CHAT_DIRECTORY_ASSET_PREVIEW_SCOPE_ID)
        delete rolePreviewMap[assetId]
      }
    })
  },
  { immediate: true },
)

const selectedRoleCount = computed(() =>
  filteredRoleIds.value.filter((id) => selectedContactIdSet.value.has(id)).length,
)

const selectedServiceCount = computed(() =>
  filteredServiceIds.value.filter((id) => selectedContactIdSet.value.has(id)).length,
)

const roleConnectedCount = computed(
  () =>
    roleBindings.value.filter(
      (contact) => chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    ).length,
)

const roleRequestCount = computed(
  () => roleBindings.value.filter((contact) => chatStore.isChatMessageRequestContact(contact)).length,
)

const roleBlockedCount = computed(
  () => roleBindings.value.filter((contact) => chatStore.isChatContactBlocked(contact)).length,
)

const serviceUnreadTotal = computed(() =>
  serviceContacts.value.reduce((sum, contact) => {
    const conversation = chatStore.getConversationByContactId(contact.id)
    return sum + Math.max(0, Number(conversation?.unread) || 0)
  }, 0),
)

const serviceUnreadContactCount = computed(
  () =>
    serviceContacts.value.filter((contact) => {
      const conversation = chatStore.getConversationByContactId(contact.id)
      return Math.max(0, Number(conversation?.unread) || 0) > 0
    }).length,
)

const hasUnreadServiceSubscriptions = computed(() => serviceUnreadTotal.value > 0)

const serviceUnreadTotalForContacts = (contacts) =>
  contacts.reduce((sum, contact) => {
    const conversation = chatStore.getConversationByContactId(contact.id)
    return sum + Math.max(0, Number(conversation?.unread) || 0)
  }, 0)

const serviceUnreadContactCountForContacts = (contacts) =>
  contacts.filter((contact) => {
    const conversation = chatStore.getConversationByContactId(contact.id)
    return Math.max(0, Number(conversation?.unread) || 0) > 0
  }).length

const serviceMutedContacts = computed(() =>
  serviceContacts.value.filter((contact) => chatStore.isChatSubscriptionMuted(contact)),
)

const serviceFoldedContacts = computed(() =>
  serviceContacts.value.filter((contact) => chatStore.isChatSubscriptionFolded(contact)),
)

const serviceMutedCount = computed(() => serviceMutedContacts.value.length)

const serviceFoldedCount = computed(() => serviceFoldedContacts.value.length)

const serviceMutedUnreadTotal = computed(() =>
  serviceUnreadTotalForContacts(serviceMutedContacts.value),
)

const serviceMutedUnreadContactCount = computed(() =>
  serviceUnreadContactCountForContacts(serviceMutedContacts.value),
)

const serviceFoldedUnreadTotal = computed(() =>
  serviceUnreadTotalForContacts(serviceFoldedContacts.value),
)

const serviceFoldedUnreadContactCount = computed(() =>
  serviceUnreadContactCountForContacts(serviceFoldedContacts.value),
)

const serviceFilterOptionCount = (key) => {
  if (key === 'all') return serviceContacts.value.length
  if (key === 'unread') return serviceUnreadContactCount.value
  if (key === 'muted') return serviceMutedCount.value
  if (key === 'folded') return serviceFoldedCount.value
  if (key === 'service') return serviceContacts.value.filter((contact) => contact.kind === 'service').length
  if (key === 'official') return serviceContacts.value.filter((contact) => contact.kind === 'official').length
  return 0
}

const serviceSummaryCardClass = (targetFilter, tone) => {
  const selected = serviceFilter.value === targetFilter
  const toneClassMap = {
    unread: selected
      ? 'border-red-300 bg-red-50 shadow-sm ring-1 ring-red-100'
      : 'border-red-100 bg-white',
    muted: selected
      ? 'border-emerald-300 bg-emerald-50 shadow-sm ring-1 ring-emerald-100'
      : 'border-emerald-100 bg-white',
    folded: selected
      ? 'border-slate-300 bg-slate-50 shadow-sm ring-1 ring-slate-100'
      : 'border-slate-100 bg-white',
  }
  return `rounded-2xl border px-3 py-2 text-left transition ${toneClassMap[tone] || 'border-gray-100 bg-white'}`
}

const serviceFilterContext = computed(() => {
  if (normalizedSearchKeyword.value) {
    return {
      title: t('搜索结果', 'Search results'),
      body: t(
        '搜索只筛选 Chat 里的服务号入口，不会改动订单、物流或外卖等来源记录。',
        'Search filters Chat service entries only; it does not touch source records.',
      ),
      icon: 'fas fa-search',
      actionLabel: t('清空搜索', 'Clear search'),
      action: 'clear-search',
    }
  }

  if (serviceFilter.value === 'unread') {
    return {
      title: t('未读更新', 'Unread updates'),
      body: t(
        '标记已读只清掉 Chat 的红点计数；通知卡片仍保留在各自服务号会话里。',
        'Mark read only clears Chat counters; notification cards stay in service threads.',
      ),
      icon: 'fas fa-circle-dot',
      actionLabel: t('查看全部订阅', 'Show all subscriptions'),
      actionFilter: 'all',
    }
  }

  if (serviceFilter.value === 'muted') {
    return {
      title: t('免打扰订阅', 'Muted subscriptions'),
      body: t(
        '免打扰的更新不会抢占注意力，但仍会留在服务号页，打开会话还能继续回复。',
        'Muted updates stay quiet but remain visible here, and their threads remain replyable.',
      ),
      icon: 'fas fa-volume-xmark',
      actionLabel: t('查看全部订阅', 'Show all subscriptions'),
      actionFilter: 'all',
    }
  }

  if (serviceFilter.value === 'folded') {
    return {
      title: t('已折叠订阅', 'Folded subscriptions'),
      body: t(
        '折叠只让账号离开消息首页；历史、未读和通知卡片仍在服务号页。',
        'Folded accounts stay out of Messages; history, unread, and notification cards remain in Services.',
      ),
      icon: 'fas fa-box-archive',
      actionLabel: t('回到订阅收件箱', 'Back to inbox'),
      actionFilter: 'all',
    }
  }

  if (serviceFilter.value === 'service') {
    return {
      title: t('服务号', 'Service accounts'),
      body: t(
        '服务号适合承接店铺、物流、外卖和系统式消息；业务记录仍归来源 App 所有。',
        'Service accounts carry shop, logistics, delivery, and system-style updates while source apps keep business records.',
      ),
      icon: 'fas fa-concierge-bell',
      actionLabel: t('打开管理区', 'Open management'),
      action: 'manage',
    }
  }

  if (serviceFilter.value === 'official') {
    return {
      title: t('公众号', 'Official accounts'),
      body: t(
        '公众号更像公开频道，但点进后仍是可回复的 Chat 会话。',
        'Official accounts read like public channels, but opening them still gives a replyable Chat thread.',
      ),
      icon: 'fas fa-newspaper',
      actionLabel: t('打开管理区', 'Open management'),
      action: 'manage',
    }
  }

  return {
    title: t('服务号收件箱', 'Service inbox'),
    body: t(
      '未读、免打扰和折叠都只改变 Chat 的收件箱呈现；消息卡片和来源记录不会被删除。',
      'Unread, muted, and folded states only change the Chat inbox view; message cards and source records are not deleted.',
    ),
    icon: 'fas fa-inbox',
    actionLabel: serviceFoldedCount.value > 0 ? t('查看已折叠', 'View folded') : '',
    actionFilter: serviceFoldedCount.value > 0 ? 'folded' : '',
  }
})

const serviceEmptyState = computed(() => {
  if (serviceContacts.value.length === 0) {
    return {
      title: t('还没有服务号会话', 'No service chats yet'),
      body: t(
        '创建服务号或公众号后，店铺、物流、外卖和公开频道消息会像聊天一样出现在这里。',
        'Create a service or official account to receive shop, logistics, delivery, and public-channel messages here like chats.',
      ),
      icon: 'fas fa-bell',
      actionLabel: t('创建第一个服务号', 'Create first service'),
      action: 'manage',
    }
  }

  if (normalizedSearchKeyword.value) {
    return {
      title: t('没有匹配的服务号', 'No matching service chats'),
      body: t(
        '换一个名称、模板或说明关键词试试；搜索不会影响会话和来源记录。',
        'Try another name, template, or description keyword; search does not affect threads or source records.',
      ),
      icon: 'fas fa-search',
      actionLabel: t('清空搜索', 'Clear search'),
      action: 'clear-search',
    }
  }

  if (serviceFilter.value === 'unread') {
    return {
      title: t('没有未读更新', 'No unread updates'),
      body: t(
        '已经处理完了。已读只代表红点清空，通知卡片仍保留在服务号会话里。',
        'All caught up. Read only means the red dots are clear; notification cards stay in service threads.',
      ),
      icon: 'fas fa-check',
      actionLabel: t('查看全部订阅', 'Show all subscriptions'),
      actionFilter: 'all',
    }
  }

  if (serviceFilter.value === 'muted') {
    return {
      title: t('没有免打扰订阅', 'No muted subscriptions'),
      body: t(
        '把容易刷屏的服务号设为免打扰后，它们会留在这里集中查看。',
        'Mute noisy service accounts and they will collect here for quieter review.',
      ),
      icon: 'fas fa-volume-high',
      actionLabel: t('查看全部订阅', 'Show all subscriptions'),
      actionFilter: 'all',
    }
  }

  if (serviceFilter.value === 'folded') {
    return {
      title: t('没有已折叠订阅', 'No folded subscriptions'),
      body: t(
        '折叠适合把低优先级频道移出 Messages 首页，同时保留历史和未读。',
        'Fold low-priority channels out of Messages while keeping history and unread updates.',
      ),
      icon: 'fas fa-box-open',
      actionLabel: t('查看全部订阅', 'Show all subscriptions'),
      actionFilter: 'all',
    }
  }

  if (serviceFilter.value === 'service') {
    return {
      title: t('没有服务号', 'No service accounts'),
      body: t(
        '服务号适合承接购物、物流、外卖和系统消息。',
        'Service accounts are useful for shopping, logistics, delivery, and system messages.',
      ),
      icon: 'fas fa-concierge-bell',
      actionLabel: t('打开管理区', 'Open management'),
      action: 'manage',
    }
  }

  if (serviceFilter.value === 'official') {
    return {
      title: t('没有公众号', 'No official accounts'),
      body: t(
        '公众号适合公开频道、活动公告和世界动态。',
        'Official accounts are useful for public channels, event notices, and world updates.',
      ),
      icon: 'fas fa-newspaper',
      actionLabel: t('打开管理区', 'Open management'),
      action: 'manage',
    }
  }

  return {
    title: t('当前筛选没有内容', 'Nothing in this filter'),
    body: t(
      '换一个筛选，或在管理区创建新的服务号入口。',
      'Try another filter or create a new service entry from management.',
    ),
    icon: 'fas fa-inbox',
    actionLabel: t('查看全部订阅', 'Show all subscriptions'),
    actionFilter: 'all',
  }
})

const shouldShowServiceManagement = computed(
  () => showServiceManagement.value || serviceContacts.value.length === 0,
)

const allFilteredSelected = computed(() => {
  const targetIds = activeSection.value === 'roles' ? filteredRoleIds.value : filteredServiceIds.value
  if (targetIds.length === 0) return false
  return targetIds.every((id) => selectedContactIdSet.value.has(id))
})

const selectedCountCurrentSection = computed(() =>
  activeSection.value === 'roles' ? selectedRoleCount.value : selectedServiceCount.value,
)

const goBack = () => {
  router.push('/chat')
}

const clearSelection = () => {
  selectedContactIds.value = []
}

const setBatchMode = (enabled) => {
  batchMode.value = Boolean(enabled)
  if (!batchMode.value) clearSelection()
}

const toggleBatchMode = () => {
  setBatchMode(!batchMode.value)
}

const toggleServiceManagement = () => {
  showServiceManagement.value = !showServiceManagement.value
  if (!showServiceManagement.value) setBatchMode(false)
}

const isContactSelected = (contactId) => selectedContactIdSet.value.has(Number(contactId))

const toggleSelectContact = (contactId) => {
  if (!batchMode.value) return
  const numericId = Number(contactId)
  if (!Number.isFinite(numericId)) return
  if (selectedContactIdSet.value.has(numericId)) {
    selectedContactIds.value = selectedContactIds.value.filter((id) => Number(id) !== numericId)
    return
  }
  selectedContactIds.value = [...selectedContactIds.value, numericId]
}

const toggleSelectAllFiltered = () => {
  if (!batchMode.value) return
  const targetIds = activeSection.value === 'roles' ? filteredRoleIds.value : filteredServiceIds.value
  if (targetIds.length === 0) return

  if (allFilteredSelected.value) {
    const targetSet = new Set(targetIds)
    selectedContactIds.value = selectedContactIds.value.filter((id) => !targetSet.has(Number(id)))
    return
  }

  const merged = new Set([...selectedContactIds.value.map((id) => Number(id)), ...targetIds])
  selectedContactIds.value = [...merged]
}

const buildDirectoryQuery = (section = activeSection.value, filter = '', extra = {}) => {
  const query = { section }
  if (filter && filter !== 'all') query.filter = filter
  Object.entries(extra).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    query[key] = String(value)
  })
  return query
}

const replaceDirectoryRoute = (extra = {}) => {
  const filter = activeSection.value === 'roles' ? roleFilter.value : serviceFilter.value
  router.replace({
    path: '/chat-contacts',
    query: buildDirectoryQuery(activeSection.value, filter, extra),
  })
}

const switchSection = (section) => {
  const nextSection = normalizeDirectorySection(section)
  activeSection.value = nextSection
  searchKeyword.value = ''
  setBatchMode(false)
  replaceDirectoryRoute()
}

const setDirectoryFilter = (filter) => {
  if (activeSection.value === 'roles') {
    roleFilter.value = normalizeRoleFilter(filter)
  } else {
    serviceFilter.value = normalizeServiceFilter(filter)
  }
  searchKeyword.value = ''
  setBatchMode(false)
  replaceDirectoryRoute()
}

const runServiceInboxAction = (actionConfig = serviceFilterContext.value) => {
  if (!actionConfig) return
  if (actionConfig.action === 'clear-search') {
    searchKeyword.value = ''
    return
  }
  if (actionConfig.action === 'manage') {
    showServiceManagement.value = true
    return
  }
  if (actionConfig.actionFilter) {
    setDirectoryFilter(actionConfig.actionFilter)
  }
}

watch(
  () => route.query.section,
  (section) => {
    const nextSection = normalizeDirectorySection(section)
    if (activeSection.value === nextSection) return
    activeSection.value = nextSection
    if (nextSection === 'roles') {
      roleFilter.value = normalizeRoleFilter(route.query.filter)
    } else {
      serviceFilter.value = normalizeServiceFilter(route.query.filter)
    }
    searchKeyword.value = ''
    setBatchMode(false)
  },
)

watch(
  () => route.query.filter,
  (filter) => {
    if (activeSection.value === 'service') {
      const nextFilter = normalizeServiceFilter(filter)
      if (serviceFilter.value === nextFilter) return
      serviceFilter.value = nextFilter
    } else {
      const nextFilter = normalizeRoleFilter(filter)
      if (roleFilter.value === nextFilter) return
      roleFilter.value = nextFilter
    }
    searchKeyword.value = ''
    setBatchMode(false)
  },
)

const openChat = (contact) => {
  chatStore.ensureConversationForContact(contact.id)
  if (chatStore.isChatSubscriptionContact(contact)) {
    router.push({
      path: `/chat/${contact.id}`,
      query: {
        chatReturn: 'services',
        serviceFilter: serviceFilter.value || 'all',
      },
    })
    return
  }
  router.push(`/chat/${contact.id}`)
}

const chatSocialStateLabel = (contact) => {
  const state = chatStore.getContactChatSocialState(contact)
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONNECTED) return t('正常聊天', 'Chatting')
  if (state === CHAT_CONTACT_SOCIAL_STATES.STRANGER) return t('陌生人', 'Stranger')
  if (state === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST) return t('打招呼待处理', 'Greeting request')
  if (state === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST) return t('申请中', 'Requested')
  if (state === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED) return t('已拒绝', 'Declined')
  if (state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED) return t('你已拉黑', 'Blocked by you')
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED) return t('对方拒收', 'Refusing messages')
  if (state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED) return t('互相拉黑', 'Mutual block')
  return ''
}

const chatSocialStateDescription = (contact) => {
  const state = chatStore.getContactChatSocialState(contact)
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONNECTED) {
    return t('可正常聊天；拉黑不会删除历史记录。', 'Normal chat is available; blocking will not delete history.')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST) {
    return t('对方向你打了招呼，先通过或忽略。', 'They greeted you; accept or ignore first.')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST) {
    return t('你的打招呼申请等待回应。', 'Your greeting request is waiting for a reply.')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.STRANGER) {
    return t('还不是正式聊天对象，可以先打招呼。', 'Not a normal chat yet; greet first.')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED) {
    return t('申请被拒绝；历史记录仍保留。', 'Request declined; history is still kept.')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED) {
    return t('你已限制通讯；解除后继续使用原会话。', 'You limited communication; unblock to continue this thread.')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED) {
    return t('对方暂时拒收你的消息；历史仍可查看。', 'They are not accepting messages; history remains readable.')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED) {
    return t('双方都处于屏蔽状态；不会删除过往记录。', 'Both sides are blocked; past records are not deleted.')
  }
  return ''
}

const chatSocialStateBadgeClass = (contact) => {
  const state = chatStore.getContactChatSocialState(contact)
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONNECTED) return 'bg-emerald-50 text-emerald-700'
  if (chatStore.isChatMessageRequestContact(contact)) return 'bg-amber-50 text-amber-700'
  if (chatStore.isChatContactBlocked(contact)) return 'bg-rose-50 text-rose-700'
  return 'bg-gray-100 text-gray-600'
}

const setRoleContactSocialState = (contact, state, message) => {
  if (!contact?.id) return
  const ok = chatStore.setContactChatSocialState(contact.id, state)
  if (ok && message) showUiNotice('success', message)
}

const greetRoleContact = (contact) =>
  setRoleContactSocialState(contact, CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST, t('已发送打招呼申请。', 'Greeting request sent.'))

const cancelRoleGreeting = (contact) =>
  setRoleContactSocialState(contact, CHAT_CONTACT_SOCIAL_STATES.STRANGER, t('已撤回申请。', 'Request canceled.'))

const acceptRoleRequest = (contact) =>
  setRoleContactSocialState(contact, CHAT_CONTACT_SOCIAL_STATES.CONNECTED, t('已通过请求，可以正常聊天。', 'Request accepted. Normal chat is available.'))

const declineRoleRequest = (contact) =>
  setRoleContactSocialState(contact, CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED, t('已忽略请求，历史记录仍保留。', 'Request ignored. History is kept.'))

const blockRoleContact = async (contact) => {
  if (!contact?.id) return
  const ok = await confirmDialog({
    title: t('拉黑角色', 'Block role'),
    message: t(
      '拉黑只限制通讯，不会删除会话、消息或 Chat Directory 绑定。',
      'Blocking only limits communication. It will not delete the thread, messages, or Chat Directory binding.',
    ),
    confirmText: t('拉黑', 'Block'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return
  if (chatStore.blockChatContact(contact.id)) {
    showUiNotice('success', t('已拉黑；会话历史仍保留。', 'Blocked. Thread history is still kept.'))
  }
}

const unblockRoleContact = (contact) => {
  if (chatStore.unblockChatContact(contact.id)) {
    showUiNotice('success', t('已解除你的拉黑限制。', 'Your block was removed.'))
  }
}

const markRoleRefusingUser = (contact) => {
  if (chatStore.markContactBlockedUser(contact.id)) {
    showUiNotice('success', t('已标记为对方拒收；不会删除历史。', 'Marked as refusing messages; history is kept.'))
  }
}

const clearRoleRefusingUser = (contact) => {
  if (chatStore.clearContactBlockedUser(contact.id)) {
    showUiNotice('success', t('已恢复对方接收状态。', 'Their accepting state was restored.'))
  }
}

const openBindModal = () => {
  if (unboundRoleProfilesRaw.value.length === 0) {
    showUiNotice(
      'warning',
      t(
        '暂无可绑定角色，请先在主通讯录创建角色档案。',
        'No profiles available. Create role profiles in main Contacts first.',
      ),
    )
    return
  }
  bindProfileId.value = Number(unboundRoleProfilesRaw.value[0]?.id || 0)
  showBindModal.value = true
}

const closeBindModal = () => {
  showBindModal.value = false
}

const bindSelectedProfile = () => {
  if (!bindProfileId.value) return
  const created = chatStore.bindRoleProfile(bindProfileId.value, {
    relationshipLevel: 60,
    relationshipNote: '',
  })
  if (!created) {
    showUiNotice('error', t('绑定失败，请重试。', 'Bind failed, please retry.'))
    return
  }
  showUiNotice('success', t('绑定成功。', 'Bind succeeded.'))
  closeBindModal()
}

const openRoleMetaModal = (contact) => {
  editingRoleContactId.value = contact.id
  roleMetaDraft.relationshipLevel = Number.isFinite(Number(contact.relationshipLevel))
    ? Number(contact.relationshipLevel)
    : 50
  roleMetaDraft.relationshipNote = contact.relationshipNote || ''
  roleMetaDraft.preferredImageAssetId = contact.preferredImageAssetId || ''
  showRoleMetaModal.value = true
}

const closeRoleMetaModal = () => {
  showRoleMetaModal.value = false
  editingRoleContactId.value = 0
  roleMetaDraft.preferredImageAssetId = ''
}

const saveRoleMeta = () => {
  if (!editingRoleContactId.value) return
  const ok = chatStore.updateRoleBindingMeta(editingRoleContactId.value, {
    relationshipLevel: roleMetaDraft.relationshipLevel,
    relationshipNote: roleMetaDraft.relationshipNote,
    preferredImageAssetId: roleMetaDraft.preferredImageAssetId,
  })
  if (!ok) {
    showUiNotice('error', t('保存失败，请重试。', 'Save failed, please retry.'))
    return
  }
  showUiNotice('success', t('会话设定已保存。', 'Thread settings saved.'))
  closeRoleMetaModal()
}

const unbindRole = async (contact) => {
  const ok = await confirmDialog({
    title: t('解除会话绑定', 'Unbind chat entry'),
    message: `${t('确认解除会话绑定', 'Unbind this chat entry')}「${contact.name}」${t('吗？不会删除主通讯录档案。', '? Main profile will be kept.')}`,
    confirmText: t('解除绑定', 'Unbind'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return
  chatStore.unbindRoleContact(contact.id)
  showUiNotice('success', t('角色会话已解绑。', 'Role chat unbound.'))
}

const batchBindFilteredProfiles = async () => {
  if (filteredUnboundRoleProfiles.value.length === 0) {
    showUiNotice(
      'warning',
      t('当前筛选下没有可批量绑定角色。', 'No available profiles to batch bind under current filter.'),
    )
    return
  }
  const ok = await confirmDialog({
    title: t('批量绑定角色会话', 'Batch bind role chats'),
    message: t(
      `确认批量绑定当前筛选结果（${filteredUnboundRoleProfiles.value.length} 个角色）吗？`,
      `Bind all filtered profiles (${filteredUnboundRoleProfiles.value.length})?`,
    ),
    confirmText: t('批量绑定', 'Bind all'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (!ok) return

  let successCount = 0
  filteredUnboundRoleProfiles.value.forEach((profile) => {
    const created = chatStore.bindRoleProfile(profile.id, {
      relationshipLevel: 60,
      relationshipNote: '',
    })
    if (created) successCount += 1
  })

  showUiNotice(
    'success',
    t(
      `已批量绑定 ${successCount} 个角色会话。`,
      `Bound ${successCount} role chats.`,
    ),
  )
}

const batchUnbindSelectedRoles = async () => {
  if (selectedRoleCount.value <= 0) {
    showUiNotice('warning', t('请先选择要解绑的角色会话。', 'Select role chats to unbind first.'))
    return
  }

  const targets = filteredRoleBindings.value.filter((contact) => isContactSelected(contact.id))
  const ok = await confirmDialog({
    title: t('批量解绑角色会话', 'Batch unbind role chats'),
    message: t(
      `确认批量解绑 ${targets.length} 个角色会话吗？不会删除主通讯录档案。`,
      `Unbind ${targets.length} role chats? Main profiles will be kept.`,
    ),
    confirmText: t('批量解绑', 'Unbind all'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return

  let successCount = 0
  targets.forEach((contact) => {
    if (chatStore.unbindRoleContact(contact.id)) successCount += 1
  })

  clearSelection()
  showUiNotice(
    'success',
    t(
      `已解绑 ${successCount} 个角色会话。`,
      `Unbound ${successCount} role chats.`,
    ),
  )
}

const resetServiceDraft = () => {
  serviceDraft.name = ''
  serviceDraft.kind = 'service'
  serviceDraft.template = ''
  serviceDraft.bio = ''
  serviceDraft.avatarImageSourceType = 'none'
  serviceDraft.avatarImageUrl = ''
  serviceDraft.avatarImageGalleryAssetId = ''
  serviceDraft.shoppingServiceKey = ''
  serviceDraft.logisticsServiceKey = ''
  serviceDraft.foodDeliveryServiceKey = ''
}

const openCreateService = (kind = 'service') => {
  serviceModalMode.value = 'create'
  editingServiceId.value = 0
  resetServiceDraft()
  serviceDraft.kind = kind === 'official' ? 'official' : 'service'
  showServiceModal.value = true
}

const openEditService = (contact) => {
  serviceModalMode.value = 'edit'
  editingServiceId.value = contact.id
  serviceDraft.name = contact.name || ''
  serviceDraft.kind = contact.kind === 'official' ? 'official' : 'service'
  serviceDraft.template = contact.serviceTemplate || ''
  serviceDraft.bio = contact.bio || ''
  const avatarImage = normalizeDraftAvatarImage(contact)
  serviceDraft.avatarImageSourceType = avatarImage.sourceType
  serviceDraft.avatarImageUrl = avatarImage.url
  serviceDraft.avatarImageGalleryAssetId = avatarImage.galleryAssetId
  serviceDraft.shoppingServiceKey = contact.shoppingServiceKey || ''
  serviceDraft.logisticsServiceKey = contact.logisticsServiceKey || ''
  serviceDraft.foodDeliveryServiceKey = contact.foodDeliveryServiceKey || ''
  showServiceModal.value = true
}

const closeServiceModal = () => {
  showServiceModal.value = false
  editingServiceId.value = 0
}

const saveService = () => {
  const name = serviceDraft.name.trim()
  if (!name) {
    showUiNotice('warning', t('请输入名称。', 'Please enter a name.'))
    return
  }

  const payload = {
    name,
    kind: serviceDraft.kind === 'official' ? 'official' : 'service',
    role: serviceDraft.kind === 'official' ? t('公众号', 'Official') : t('服务号', 'Service'),
    serviceTemplate: serviceDraft.template.trim(),
    bio: serviceDraft.bio.trim(),
    avatarImage: buildServiceDraftAvatarImage(),
    avatar: serviceDraft.avatarImageSourceType === 'url' ? serviceDraft.avatarImageUrl : '',
    shoppingServiceKey: serviceDraft.shoppingServiceKey,
    logisticsServiceKey: serviceDraft.logisticsServiceKey,
    foodDeliveryServiceKey: serviceDraft.foodDeliveryServiceKey,
  }

  if (serviceModalMode.value === 'create') {
    chatStore.addContact(payload)
    showServiceManagement.value = true
    showUiNotice('success', t('服务对象已创建。', 'Service entry created.'))
    closeServiceModal()
    switchSection('service')
    return
  }

  if (!editingServiceId.value) return
  const ok = chatStore.updateContact(editingServiceId.value, payload)
  if (!ok) {
    showUiNotice('error', t('保存失败，请重试。', 'Save failed, please retry.'))
    return
  }
  showUiNotice('success', t('服务对象已保存。', 'Service entry saved.'))
  closeServiceModal()
}

const removeService = async (contact) => {
  const ok = await confirmDialog({
    title: t('删除服务对象', 'Delete service entry'),
    message: `${t('确认删除服务会话对象', 'Delete service chat entry')}「${contact.name}」${t('吗？', '?')}`,
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return
  chatStore.removeContact(contact.id)
  showUiNotice('success', t('服务对象已删除。', 'Service entry deleted.'))
}

const batchDeleteSelectedServices = async () => {
  if (selectedServiceCount.value <= 0) {
    showUiNotice('warning', t('请先选择要删除的服务对象。', 'Select service entries to delete first.'))
    return
  }

  const targets = filteredServiceContacts.value.filter((contact) => isContactSelected(contact.id))
  const ok = await confirmDialog({
    title: t('批量删除服务对象', 'Batch delete service entries'),
    message: t(
      `确认批量删除 ${targets.length} 个服务会话对象吗？`,
      `Delete ${targets.length} service chat entries?`,
    ),
    confirmText: t('批量删除', 'Delete all'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return

  let successCount = 0
  targets.forEach((contact) => {
    if (chatStore.removeContact(contact.id)) successCount += 1
  })

  clearSelection()
  showUiNotice(
    'success',
    t(
      `已删除 ${successCount} 个服务会话对象。`,
      `Deleted ${successCount} service chat entries.`,
    ),
  )
}

const roleTypeTag = (profile) => (profile?.isMain ? t('主角色', 'Main') : t('NPC', 'NPC'))

const serviceKindTag = (contact) =>
  contact.kind === 'official' ? t('公众号', 'Official') : t('服务号', 'Service')

const worldPackServiceKindTag = (row) =>
  row?.kind === 'official' ? t('公众号', 'Official') : t('服务号', 'Service')

const worldPackServiceBindingLabel = (row) =>
  row?.chatBindingLabel || row?.linkedAppLabel || t('独立订阅频道', 'Standalone subscription channel')

const sourceNotificationPlanRows = (plan = {}) =>
  Array.isArray(plan?.rows) ? plan.rows.filter((row) => row?.id) : []

const sourceNotificationPlanRowLabel = (row = {}) => {
  if (row.id === 'shopping_orders') return t('购物订单', 'Shopping orders')
  if (row.id === 'shopping_logistics') return t('物流追踪', 'Logistics tracking')
  if (row.id === 'food_delivery_orders') return t('外卖订单', 'Food Delivery orders')
  return row?.label || t('服务更新', 'Service updates')
}

const sourceNotificationPlanRowsText = (rows = []) =>
  rows.map((row) => sourceNotificationPlanRowLabel(row)).filter(Boolean).join(' / ')

const sourceNotificationPlanSummary = (plan = {}) => {
  const rows = sourceNotificationPlanRows(plan)
  if (rows.length === 0) {
    return t(
      '暂未连接来源 App，可作为普通订阅频道使用。',
      'No source app is connected yet; this can still work as a regular subscription channel.',
    )
  }
  const labels = sourceNotificationPlanRowsText(rows)
  if (plan?.status === 'available_after_join') {
    return t(
      `${labels} 会在加入后开始接收更新。`,
      `${labels} will be ready after the user joins this service account.`,
    )
  }
  return t(
    `${labels} 有新进展时会推送到这个服务号。`,
    `${labels} can push event-driven updates into this Chat service thread.`,
  )
}

const serviceSourceNotificationPlan = (contact) =>
  contact?.id ? chatStore.getServiceAccountLinkContract(contact.id)?.sourceNotificationPlan || null : null

const serviceSourceNotificationPlanRows = (contact) =>
  sourceNotificationPlanRows(serviceSourceNotificationPlan(contact))

const serviceSourceNotificationPlanSummary = (contact) =>
  sourceNotificationPlanSummary(serviceSourceNotificationPlan(contact))

const worldServiceProposalCategoryLabel = (proposal = {}) =>
  proposal.category === 'publication'
    ? t('公开频道', 'Publication')
    : proposal.category === 'subscription'
      ? t('会员频道', 'Subscription')
      : t('服务提醒', 'Service notification')

const worldServiceProposalConfidenceLabel = (confidence = '') => {
  if (confidence === 'high') return t('高可信', 'High confidence')
  if (confidence === 'medium') return t('中等可信', 'Medium confidence')
  return t('低可信', 'Low confidence')
}

const worldServiceProposalRejectionReasonLabel = (reason = '') => {
  if (reason === 'duplicate_template') return t('已有相似候选', 'Duplicate template')
  if (reason === 'unknown_app_binding') return t('未找到关联的世界 App', 'Unknown world app binding')
  if (reason === 'unknown_category') return t('不支持的账号类型', 'Unknown service category')
  if (reason === 'low_confidence') return t('可信度过低', 'Low confidence')
  return t('暂不能确认', 'Not confirmable')
}

const worldServiceProposalBindingLabel = (proposal = {}) => {
  if (!proposal?.linkedAppBindingId) {
    return t('独立订阅频道', 'Standalone subscription channel')
  }
  const option = activeWorldPackAppBindingOptions.value.find(
    (binding) => binding.id === proposal.linkedAppBindingId,
  )
  return option?.label || proposal.linkedAppBindingId
}

const buildWorldServiceTemplateContextText = () => {
  const pack = activeWorldPack.value || systemStore.getActiveWorldPack?.() || {}
  const worldview = resolveWorldviewText(systemStore, { bookStore })
  const bindingLines = (Array.isArray(pack.appBindings) ? pack.appBindings : [])
    .filter((binding) => binding?.id && binding.enabled !== false)
    .map(
      (binding) =>
        `- ${binding.id}: ${binding.title || binding.name || binding.id}; ${binding.archetype || 'entry'} -> ${binding.moduleKey || 'module'}; ${binding.description || ''}`.trim(),
    )
  const templateLines = worldPackServiceTemplateRows.value.map(
    (row) => `- ${row.id}: ${row.title || row.name}; ${row.category}; ${row.linkedAppBindingId || 'standalone'}`,
  )
  const knowledgeLines = systemStore
    .listKnowledgePoints()
    .filter((point) => point.enabled !== false)
    .slice(0, 6)
    .map((point) => `- ${point.title || point.id}: ${String(point.content || '').trim().slice(0, 360)}`)

  return [
    `Active World Pack: ${pack.title || pack.name || pack.id || 'default_world'}`,
    bindingLines.length ? ['Existing world app bindings:', ...bindingLines].join('\n') : 'Existing world app bindings: none',
    templateLines.length ? ['Existing service templates:', ...templateLines].join('\n') : 'Existing service templates: none',
    worldview ? `World context:\n${worldview.slice(0, 2600)}` : 'World context: empty',
    knowledgeLines.length ? ['Enabled knowledge:', ...knowledgeLines].join('\n') : 'Enabled knowledge: none',
  ].join('\n\n')
}

const summarizeWorldServiceTemplateReview = (review) =>
  t(
    `${review.confirmableProposals.length} 个可确认，${review.rejectedProposals.length} 个已拦截。`,
    `${review.confirmableProposals.length} confirmable, ${review.rejectedProposals.length} rejected.`,
  )

const updateWorldServiceProposalDraft = (value = '') => {
  worldServiceProposalDraft.value = value
}

const clearWorldServiceProposalReview = () => {
  worldServiceProposalDraft.value = ''
  worldServiceProposalReview.value = null
  worldServiceProposalNotice.value = ''
  worldServiceProposalNoticeTone.value = 'info'
}

const reviewWorldServiceProposalDraft = () => {
  const draft = String(worldServiceProposalDraft.value || '').trim()
  const packId = activeWorldPack.value?.id || 'default_world'
  if (!draft) {
    worldServiceProposalReview.value = systemStore.buildWorldServiceTemplateProposalReview?.([], packId) || null
    worldServiceProposalNotice.value = t(
      '请先粘贴服务号候选 JSON，或使用 AI 提取。',
      'Paste an AI service JSON payload first, or run AI extraction.',
    )
    worldServiceProposalNoticeTone.value = 'warning'
    return
  }

  let payload = null
  try {
    payload = JSON.parse(draft)
  } catch {
    worldServiceProposalNotice.value = t(
      'JSON 解析失败，请检查 proposals 数组格式。',
      'JSON parse failed. Check the proposals array format.',
    )
    worldServiceProposalNoticeTone.value = 'danger'
    return
  }

  const review = systemStore.buildWorldServiceTemplateProposalReview?.(payload, packId)
  worldServiceProposalReview.value = review
  worldServiceProposalNotice.value = review ? summarizeWorldServiceTemplateReview(review) : ''
  worldServiceProposalNoticeTone.value =
    review?.confirmableProposals?.length > 0 ? 'success' : review?.rejectedProposals?.length > 0 ? 'warning' : 'info'
}

const extractWorldServiceTemplateProposalsFromAI = async () => {
  if (worldServiceProposalLoading.value) return
  worldServiceProposalLoading.value = true
  worldServiceProposalNotice.value = ''
  worldServiceProposalNoticeTone.value = 'info'
  try {
    const result = await extractWorldServiceTemplateProposals({
      worldContextText: buildWorldServiceTemplateContextText(),
      worldPack: activeWorldPack.value || systemStore.getActiveWorldPack?.(),
      settings: settings.value,
    })
    worldServiceProposalReview.value = result.review
    worldServiceProposalDraft.value = result.rawPayload
      ? JSON.stringify(result.rawPayload, null, 2)
      : ''
    worldServiceProposalNotice.value = result.ok
      ? summarizeWorldServiceTemplateReview(result.review)
      : t('AI 返回内容无法解析，未生成服务号候选。', 'AI response could not be parsed; no service candidates were generated.')
    worldServiceProposalNoticeTone.value = result.ok
      ? result.review.confirmableProposals.length > 0
        ? 'success'
        : result.review.rejectedProposals.length > 0
          ? 'warning'
          : 'info'
      : 'danger'
  } catch (error) {
    worldServiceProposalNotice.value = formatApiErrorForUi(
      error,
      t('AI 提取服务号候选失败，请检查 API 设置。', 'AI service extraction failed. Check API settings.'),
    )
    worldServiceProposalNoticeTone.value = 'danger'
  } finally {
    worldServiceProposalLoading.value = false
  }
}

const removeWorldServiceProposalFromReview = (proposal = {}) => {
  const review = worldServiceProposalReview.value
  if (!review) return
  const key = proposal.id || proposal.templateId
  const sameProposal = (item = {}) => (item.id || item.templateId) === key
  worldServiceProposalReview.value = {
    ...review,
    proposals: (review.proposals || []).filter((item) => !sameProposal(item)),
    confirmableProposals: (review.confirmableProposals || []).filter((item) => !sameProposal(item)),
    rejectedProposals: review.rejectedProposals || [],
  }
}

const confirmWorldServiceTemplateProposalEntry = (proposal = {}) => {
  const packId = worldServiceProposalReview.value?.worldPackId || activeWorldPack.value?.id || 'default_world'
  const result = systemStore.confirmWorldServiceTemplateProposal?.(proposal, packId)
  if (!result?.ok) {
    showUiNotice('warning', t('这个服务号候选暂时不能确认。', 'This service candidate cannot be confirmed.'))
    return
  }
  systemStore.saveNow?.()
  removeWorldServiceProposalFromReview(proposal)
  showUiNotice('success', t('服务号候选已加入当前世界，可在上方手动订阅。', 'Service candidate added to this world. You can join it above.'))
}

const joinWorldPackServiceTemplate = (row) => {
  if (!row?.payload) {
    showUiNotice('warning', t('这个世界观服务号暂时不能加入。', 'This world service cannot be joined yet.'))
    return
  }

  const contact = chatStore.createWorldServiceTemplateContact(row.payload)
  if (!contact?.id) {
    showUiNotice('error', t('加入失败，请稍后重试。', 'Join failed, please try again.'))
    return
  }

  showServiceManagement.value = true
  activeSection.value = 'service'
  serviceFilter.value = 'all'
  searchKeyword.value = ''
  setBatchMode(false)
  replaceDirectoryRoute()
  showUiNotice('success', t(`已加入 ${contact.name}。`, `${contact.name} joined subscriptions.`))
}

const openEditWorldServiceTemplate = (row) => {
  if (!row?.id) return
  worldServiceTemplateDraft.id = row.id
  worldServiceTemplateDraft.title = row.title || row.name || ''
  worldServiceTemplateDraft.category = row.category || 'service_notification'
  worldServiceTemplateDraft.description = row.description || ''
  worldServiceTemplateDraft.linkedAppBindingId = row.linkedAppBindingId || ''
  showWorldServiceTemplateModal.value = true
}

const closeWorldServiceTemplateModal = () => {
  showWorldServiceTemplateModal.value = false
  worldServiceTemplateDraft.id = ''
}

const saveWorldServiceTemplate = () => {
  const title = worldServiceTemplateDraft.title.trim()
  if (!title || !worldServiceTemplateDraft.id) {
    showUiNotice('warning', t('请填写服务号名称。', 'Please enter a service account name.'))
    return
  }

  const result = systemStore.updateWorldServiceAccountTemplate?.(
    activeWorldPack.value?.id || '',
    worldServiceTemplateDraft.id,
    {
      title,
      name: title,
      category: worldServiceTemplateDraft.category,
      description: worldServiceTemplateDraft.description.trim(),
      linkedAppBindingId: worldServiceTemplateDraft.linkedAppBindingId,
    },
  )

  if (!result?.ok) {
    showUiNotice('error', t('模板保存失败，请稍后重试。', 'Template save failed, please try again.'))
    return
  }

  systemStore.saveNow?.()
  showUiNotice('success', t('世界观服务号模板已保存。', 'World service template saved.'))
  closeWorldServiceTemplateModal()
}

const resetWorldServiceTemplate = (row) => {
  if (!row?.id) return
  const result = systemStore.resetWorldServiceAccountTemplate?.(activeWorldPack.value?.id || '', row.id)
  if (!result?.ok) {
    showUiNotice('warning', t('这个模板没有可恢复的内置版本。', 'This template has no built-in version to restore.'))
    return
  }
  systemStore.saveNow?.()
  showUiNotice('success', t('已恢复内置模板。', 'Built-in template restored.'))
}

const openWorldPackServiceTemplateContact = (row) => {
  const contact = row?.contactId ? chatStore.getContactById(row.contactId) : null
  if (!contact?.id) return
  openChat(contact)
}

const serviceConversation = (contact) =>
  contact?.id ? chatStore.getConversationByContactId(contact.id) : null

const serviceUnreadCount = (contact) => {
  const conversation = serviceConversation(contact)
  return Math.max(0, Number(conversation?.unread) || 0)
}

const serviceLastMessageAt = (contact) => {
  const conversation = serviceConversation(contact)
  const timestamp = Number(conversation?.lastMessageAt) || 0
  return Number.isFinite(timestamp) ? Math.max(0, Math.floor(timestamp)) : 0
}

const serviceHasFeedUpdate = (contact) => {
  const conversation = serviceConversation(contact)
  return Boolean(conversation?.lastMessage?.trim() || conversation?.draft?.trim())
}

const serviceDisplayMessageAt = (contact) => (serviceHasFeedUpdate(contact) ? serviceLastMessageAt(contact) : 0)

const isSameServiceFeedDay = (timestamp, reference = Date.now()) => {
  if (!timestamp) return false
  const target = new Date(timestamp)
  const base = new Date(reference)
  if (Number.isNaN(target.getTime()) || Number.isNaN(base.getTime())) return false
  return (
    target.getFullYear() === base.getFullYear() &&
    target.getMonth() === base.getMonth() &&
    target.getDate() === base.getDate()
  )
}

const serviceFeedSectionKey = (contact) => {
  if (serviceUnreadCount(contact) > 0) return 'unread'
  if (!serviceHasFeedUpdate(contact)) return 'no-updates'
  const lastMessageAt = serviceLastMessageAt(contact)
  if (!lastMessageAt) return 'no-updates'
  if (isSameServiceFeedDay(lastMessageAt)) return 'today'
  return 'earlier'
}

const serviceFeedSectionConfig = (key) => {
  if (key === 'unread') {
    return {
      title: t('待处理更新', 'Unread updates'),
      dotClass: 'bg-red-500',
    }
  }
  if (key === 'today') {
    return {
      title: t('今天', 'Today'),
      dotClass: 'bg-emerald-500',
    }
  }
  if (key === 'earlier') {
    return {
      title: t('更早', 'Earlier'),
      dotClass: 'bg-slate-400',
    }
  }
  return {
    title: t('暂无更新', 'No updates yet'),
    dotClass: 'bg-gray-300',
  }
}

const serviceFeedSectionMeta = (sectionContacts) => {
  const accountCount = sectionContacts.length
  const unreadCount = sectionContacts.reduce((sum, contact) => sum + serviceUnreadCount(contact), 0)
  if (unreadCount > 0) {
    return t(
      `${accountCount} 个账号 · ${unreadCount} 条未读`,
      `${accountCount} accounts · ${unreadCount} unread`,
    )
  }
  return t(`${accountCount} 个账号`, `${accountCount} accounts`)
}

const serviceFeedSections = computed(() => {
  const sectionOrder = ['unread', 'today', 'earlier', 'no-updates']
  const buckets = new Map(sectionOrder.map((key) => [key, []]))
  filteredServiceContacts.value.forEach((contact) => {
    const key = serviceFeedSectionKey(contact)
    buckets.get(key)?.push(contact)
  })

  return sectionOrder
    .map((key) => {
      const sectionContacts = buckets.get(key) || []
      return {
        key,
        contacts: sectionContacts,
        meta: serviceFeedSectionMeta(sectionContacts),
        ...serviceFeedSectionConfig(key),
      }
    })
    .filter((section) => section.contacts.length > 0)
})

const markServiceRead = (contact) => {
  if (!contact?.id || serviceUnreadCount(contact) <= 0) return
  chatStore.markConversationRead(contact.id)
  showUiNotice(
    'success',
    t(
      'Marked as read. Notification cards stay in the thread.',
      'Marked as read. Notification cards stay in the thread.',
    ),
  )
}

const markAllServiceSubscriptionsRead = () => {
  let changedCount = 0
  serviceContacts.value.forEach((contact) => {
    if (serviceUnreadCount(contact) <= 0) return
    chatStore.markConversationRead(contact.id)
    changedCount += 1
  })

  if (changedCount <= 0) {
    showUiNotice('warning', t('没有未读订阅。', 'No unread subscriptions.'))
    return
  }

  showUiNotice(
    'success',
    t(
      `已将 ${changedCount} 个订阅账号标记为已读。`,
      `Marked ${changedCount} subscription accounts as read. Cards stay in service threads.`,
    ),
  )
}

const formatServiceConversationTime = (timestamp) => {
  if (!timestamp) return ''
  const target = new Date(timestamp)
  const now = new Date()
  const isSameDay =
    now.getFullYear() === target.getFullYear() &&
    now.getMonth() === target.getMonth() &&
    now.getDate() === target.getDate()

  if (isSameDay) return target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return `${target.getMonth() + 1}/${target.getDate()}`
}

const serviceConversationPreviewText = (contact) => {
  const conversation = serviceConversation(contact)
  if (conversation?.draft?.trim()) return `${t('草稿', 'Draft')}: ${conversation.draft.trim()}`
  return conversation?.lastMessage || contact?.bio || t('还没有订阅消息', 'No subscription messages yet')
}

const serviceSubscriptionStatusTags = (contact) => {
  const tags = []
  if (chatStore.isChatSubscriptionMuted(contact)) {
    tags.push({ key: 'muted', label: t('免打扰', 'Muted'), className: 'bg-emerald-50 text-emerald-700' })
  }
  if (chatStore.isChatSubscriptionFolded(contact)) {
    tags.push({ key: 'folded', label: t('已折叠', 'Folded'), className: 'bg-slate-100 text-slate-700' })
  }
  return tags
}

const serviceDeliveryState = (contact) => {
  const unreadCount = serviceUnreadCount(contact)
  const isMuted = chatStore.isChatSubscriptionMuted(contact)
  const isFolded = chatStore.isChatSubscriptionFolded(contact)

  if (isFolded && unreadCount > 0) {
    return {
      label: t('已折叠 · 未读在服务号页', 'Folded · unread in Services'),
      className: 'bg-red-50 text-red-600',
    }
  }
  if (isFolded) {
    return {
      label: t('已折叠 · 不在消息首页', 'Folded · hidden from Messages'),
      className: 'bg-slate-100 text-slate-700',
    }
  }
  if (isMuted && unreadCount > 0) {
    return {
      label: t('免打扰 · 未读静默保留', 'Muted · unread kept quiet'),
      className: 'bg-emerald-50 text-emerald-700',
    }
  }
  if (isMuted) {
    return {
      label: t('免打扰 · 已读', 'Muted · all read'),
      className: 'bg-emerald-50 text-emerald-700',
    }
  }
  if (unreadCount > 0) {
    return {
      label: t('有新更新', 'New updates'),
      className: 'bg-red-50 text-red-600',
    }
  }
  return {
    label: t('已读', 'All read'),
    className: 'bg-gray-100 text-gray-500',
  }
}

const selectedServiceReturnId = computed(() => {
  const value = Number(route.query.selectedService)
  return Number.isFinite(value) && value > 0 ? value : 0
})

const selectedServiceReturnContact = computed(() => {
  if (!selectedServiceReturnId.value) return null
  const contact = chatStore.getContactById(selectedServiceReturnId.value)
  return chatStore.isChatSubscriptionContact(contact) ? contact : null
})

const selectedServiceReturnVisible = computed(() =>
  filteredServiceContacts.value.some((contact) => Number(contact.id) === selectedServiceReturnId.value),
)

const isSelectedServiceReturnContact = (contact) =>
  Number(contact?.id) > 0 && Number(contact.id) === selectedServiceReturnId.value

const selectedServiceReturnPanel = computed(() => {
  if (activeSection.value !== 'service' || !selectedServiceReturnContact.value) return null

  const contact = selectedServiceReturnContact.value
  const unreadCount = serviceUnreadCount(contact)
  const visible = selectedServiceReturnVisible.value
  const hiddenAfterRead = serviceFilter.value === 'unread' && unreadCount <= 0
  const hiddenByFold = serviceFilter.value === 'all' && chatStore.isChatSubscriptionFolded(contact)
  const delivery = serviceDeliveryState(contact)

  if (visible) {
    return {
      tone: 'visible',
      title: t('已回到服务号页', 'Back in Services'),
      body: t(
        `${contact.name} 仍在当前筛选里，选中态已保留；可以继续打开会话或切换筛选。`,
        `${contact.name} is still in this filter, with the selection preserved. You can reopen the thread or switch filters.`,
      ),
      meta: delivery.label,
      primaryLabel: t('重新打开会话', 'Reopen thread'),
      primaryAction: 'open',
    }
  }

  if (hiddenAfterRead) {
    return {
      tone: 'read',
      title: t('已读后离开未读筛选', 'Read and left this filter'),
      body: t(
        `${contact.name} 已在 Chat 会话里清掉未读，所以不再出现在当前未读筛选中；通知卡和历史仍在服务号会话里。`,
        `${contact.name} left this unread filter after being read in Chat; notification cards and history stay in its service thread.`,
      ),
      meta: t('Chat 只清未读计数，来源记录不变。', 'Chat only cleared unread counters; source records are unchanged.'),
      primaryLabel: t('显示该服务号', 'Show this account'),
      primaryAction: 'show',
    }
  }

  if (hiddenByFold) {
    return {
      tone: 'folded',
      title: t('该服务号在折叠区', 'This account is folded'),
      body: t(
        `${contact.name} 被折叠后不会显示在默认订阅收件箱；历史和未读仍保留在服务号页。`,
        `${contact.name} is folded out of the default inbox; history and unread updates remain in Services.`,
      ),
      meta: delivery.label,
      primaryLabel: t('查看折叠区', 'View folded'),
      primaryAction: 'show',
    }
  }

  return {
    tone: 'filtered',
    title: t('当前筛选未显示该服务号', 'Hidden by current filter'),
    body: t(
      `${contact.name} 不符合当前筛选，但这个 Chat 服务号和历史仍然存在。`,
      `${contact.name} does not match this filter, but the Chat service account and history still exist.`,
    ),
    meta: delivery.label,
    primaryLabel: t('显示该服务号', 'Show this account'),
    primaryAction: 'show',
  }
})

const selectedServiceReturnPanelClass = computed(() => {
  if (selectedServiceReturnPanel.value?.tone === 'read') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  }
  if (selectedServiceReturnPanel.value?.tone === 'folded') {
    return 'border-slate-200 bg-slate-50 text-slate-800'
  }
  if (selectedServiceReturnPanel.value?.tone === 'visible') {
    return 'border-sky-200 bg-sky-50 text-sky-900'
  }
  return 'border-gray-200 bg-white text-gray-800'
})

const serviceReturnFilterForContact = (contact) =>
  chatStore.isChatSubscriptionFolded(contact) ? 'folded' : 'all'

const openSelectedServiceReturnThread = () => {
  const contact = selectedServiceReturnContact.value
  if (!contact?.id) return
  router.push({
    path: `/chat/${contact.id}`,
    query: {
      chatReturn: 'services',
      serviceFilter: serviceFilter.value || 'all',
    },
  })
}

const showSelectedServiceReturnContact = () => {
  const contact = selectedServiceReturnContact.value
  if (!contact?.id) return
  serviceFilter.value = serviceReturnFilterForContact(contact)
  searchKeyword.value = ''
  setBatchMode(false)
  router.replace({
    path: '/chat-contacts',
    query: buildDirectoryQuery('service', serviceFilter.value, {
      selectedService: contact.id,
      serviceReturn: 'thread',
    }),
  })
}

const runSelectedServiceReturnPrimary = () => {
  if (selectedServiceReturnPanel.value?.primaryAction === 'open') {
    openSelectedServiceReturnThread()
    return
  }
  showSelectedServiceReturnContact()
}

const clearSelectedServiceReturn = () => {
  router.replace({
    path: '/chat-contacts',
    query: buildDirectoryQuery('service', serviceFilter.value),
  })
}

const scrollSelectedServiceIntoView = () => {
  if (activeSection.value !== 'service' || !selectedServiceReturnId.value) return
  nextTick(() => {
    const root = directoryScrollAreaRef.value
    const target = root?.querySelector?.(`[data-service-contact-id="${selectedServiceReturnId.value}"]`)
    if (target?.scrollIntoView) target.scrollIntoView({ block: 'center', behavior: 'auto' })
  })
}

watch(
  () => [
    activeSection.value,
    serviceFilter.value,
    selectedServiceReturnId.value,
    filteredServiceContacts.value.length,
  ],
  scrollSelectedServiceIntoView,
)

const toggleServiceMuted = (contact) => {
  if (!contact?.id) return
  chatStore.toggleChatSubscriptionMuted(contact.id)
}

const toggleServiceFolded = (contact) => {
  if (!contact?.id) return
  chatStore.toggleChatSubscriptionFolded(contact.id)
  if (serviceFilter.value === 'all' && !normalizedSearchKeyword.value) {
    const nextContact = chatStore.getContactById(contact.id)
    const nextFilter = chatStore.isChatSubscriptionFolded(nextContact) ? 'folded' : 'all'
    if (serviceFilter.value !== nextFilter) {
      serviceFilter.value = nextFilter
      replaceDirectoryRoute()
    }
  }
}

const shoppingServiceLabel = (serviceKey) => {
  const preset = findShoppingServicePreset(serviceKey || '')
  if (!preset?.key || preset.key !== serviceKey) return ''
  return t(preset.zh, preset.en)
}

const logisticsServiceLabel = (serviceKey) => {
  const preset = findLogisticsServicePreset(serviceKey || '')
  if (!preset?.key || preset.key !== serviceKey) return ''
  return t(preset.zh, preset.en)
}

const foodDeliveryServiceLabel = (serviceKey) => {
  const preset = findFoodDeliveryServicePreset(serviceKey || '')
  if (!preset?.key || preset.key !== serviceKey) return ''
  return t(preset.zh, preset.en)
}

const contactHasThreadOrModuleAvatarOverride = (contactId) => {
  const contract = getRoleBindingContract(contactId)
  return contract.avatar?.activeLayer === 'thread' || contract.avatar?.activeLayer === 'module'
}

const contactAvatarForDisplay = (contact) => {
  if (!contact?.id) return ''
  if (contactHasThreadOrModuleAvatarOverride(contact.id)) return chatStore.resolveContactAvatar(contact.id)
  return resolveAvatarImageSourceUrl({
    galleryStore,
    previewMap: rolePreviewMap,
    avatarImage: contact.avatarImage,
    legacyAvatar: contact.avatar,
    fallbackAlt: contact.name || 'Contact',
  }) || chatStore.resolveContactAvatar(contact.id)
}

const explicitContactAvatarForDisplay = (contact) => {
  if (!contact?.id) return ''
  if (contactHasThreadOrModuleAvatarOverride(contact.id)) return chatStore.resolveContactAvatar(contact.id)
  return resolveAvatarImageSourceUrl({
    galleryStore,
    previewMap: rolePreviewMap,
    avatarImage: contact.avatarImage,
    legacyAvatar: contact.avatar,
    fallbackAlt: contact.name || 'Contact',
  })
}

const preferredImageAssetLabel = (contact) => {
  if (!contact?.id) return ''
  const contract = getRoleBindingContract(contact.id)
  const preferredId = contract.assets?.preferredImageAssetId || ''
  if (!preferredId) return ''
  const asset = galleryStore.findAssetById(preferredId)
  return asset?.name || preferredId
}

const roleTemplateLabel = (preset) => t(preset?.titleCn || '', preset?.titleEn || '')
const roleTemplateNote = (preset) => t(preset?.relationshipNoteCn || '', preset?.relationshipNoteEn || '')
const servicePresetName = (preset) => t(preset?.nameCn || '', preset?.nameEn || '')
const servicePresetTemplate = (preset) => t(preset?.templateCn || '', preset?.templateEn || '')
const servicePresetBio = (preset) => t(preset?.bioCn || '', preset?.bioEn || '')

const getRoleTemplateById = (templateId) =>
  roleMetaTemplatePresets.find((preset) => preset.id === templateId) || null

const getServiceTemplateById = (templateId) =>
  serviceTemplatePresets.find((preset) => preset.id === templateId) || null

const applyRoleTemplateToDraft = (templateId = selectedRoleTemplateId.value) => {
  const template = getRoleTemplateById(templateId)
  if (!template) return
  roleMetaDraft.relationshipLevel = template.relationshipLevel
  roleMetaDraft.relationshipNote = roleTemplateNote(template)
}

const applyRoleTemplateToSelected = async () => {
  if (selectedRoleCount.value <= 0) {
    showUiNotice('warning', t('请先选择要套用模板的角色会话。', 'Select role chats before applying a template.'))
    return
  }
  const template = getRoleTemplateById(selectedRoleTemplateId.value)
  if (!template) {
    showUiNotice('warning', t('请选择关系模板。', 'Please select a relationship template.'))
    return
  }

  const targets = filteredRoleBindings.value.filter((contact) => isContactSelected(contact.id))
  if (targets.length === 0) {
    showUiNotice(
      'warning',
      t('当前筛选中没有可套用模板的目标。', 'No selected targets under current filter.'),
    )
    return
  }

  const ok = await confirmDialog({
    title: t('批量应用关系模板', 'Batch apply relationship template'),
    message: t(
      `确认将模板「${roleTemplateLabel(template)}」批量应用到 ${targets.length} 个角色会话吗？`,
      `Apply template "${roleTemplateLabel(template)}" to ${targets.length} role chats?`,
    ),
    confirmText: t('应用模板', 'Apply template'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (!ok) return

  let successCount = 0
  targets.forEach((contact) => {
    const applied = chatStore.updateRoleBindingMeta(contact.id, {
      relationshipLevel: template.relationshipLevel,
      relationshipNote: roleTemplateNote(template),
    })
    if (applied) successCount += 1
  })

  showUiNotice(
    'success',
    t(
      `已应用模板到 ${successCount} 个角色会话。`,
      `Applied template to ${successCount} role chats.`,
    ),
  )
}

const openCreateServiceFromPreset = (templateId) => {
  const template = getServiceTemplateById(templateId)
  if (!template) return

  openCreateService(template.kind)
  serviceDraft.name = servicePresetName(template)
  serviceDraft.template = servicePresetTemplate(template)
  serviceDraft.bio = servicePresetBio(template)
}

const openCreateShoppingService = (serviceKey) => {
  const preset = findShoppingServicePreset(serviceKey)
  if (!preset?.key || preset.key !== serviceKey) return

  openCreateService('service')
  serviceDraft.name = t(preset.zh, preset.en)
  serviceDraft.template = t('Shopping 店铺账号', 'Shopping shop account')
  serviceDraft.bio = t(
    `${preset.zh} 店铺服务号。仅承载商品推荐、订单提醒和跳转上下文；商品、购物车和订单仍由 Shopping 管理。`,
    `${preset.en} shop service account. It only carries product recommendation, order reminder, and route context; products, cart, and orders remain owned by Shopping.`,
  )
  serviceDraft.shoppingServiceKey = preset.key
}

const openCreateLogisticsService = (serviceKey) => {
  const preset = findLogisticsServicePreset(serviceKey)
  if (!preset?.key || preset.key !== serviceKey) return

  openCreateService('service')
  serviceDraft.name = t(preset.zh, preset.en)
  serviceDraft.template = t('物流服务号', 'Logistics service account')
  serviceDraft.bio = t(preset.descZh, preset.descEn)
  serviceDraft.logisticsServiceKey = preset.key
}

const openCreateFoodDeliveryService = (serviceKey) => {
  const preset = findFoodDeliveryServicePreset(serviceKey)
  if (!preset?.key || preset.key !== serviceKey) return

  openCreateService('service')
  serviceDraft.name = t(preset.zh, preset.en)
  serviceDraft.template = t('外卖通知服务号', 'Food delivery notification account')
  serviceDraft.bio = t(preset.descZh, preset.descEn)
  serviceDraft.foodDeliveryServiceKey = preset.key
}

const applyServicePresetToSelected = async () => {
  if (selectedServiceCount.value <= 0) {
    showUiNotice(
      'warning',
      t('请先选择要套用模板的服务对象。', 'Select service entries before applying a template.'),
    )
    return
  }
  const template = getServiceTemplateById(selectedServiceTemplateId.value)
  if (!template) {
    showUiNotice('warning', t('请选择服务模板。', 'Please select a service template.'))
    return
  }

  const targets = filteredServiceContacts.value.filter(
    (contact) => isContactSelected(contact.id) && contact.kind === template.kind,
  )
  if (targets.length === 0) {
    showUiNotice(
      'warning',
      t(
        '当前选择中没有与模板类型匹配的服务对象。',
        'No selected entries match this template type.',
      ),
    )
    return
  }

  const ok = await confirmDialog({
    title: t('批量应用服务模板', 'Batch apply service template'),
    message: t(
      `确认将模板「${servicePresetTemplate(template)}」批量应用到 ${targets.length} 个服务对象吗？`,
      `Apply template "${servicePresetTemplate(template)}" to ${targets.length} service entries?`,
    ),
    confirmText: t('应用模板', 'Apply template'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (!ok) return

  let successCount = 0
  targets.forEach((contact) => {
    const applied = chatStore.updateContact(contact.id, {
      serviceTemplate: servicePresetTemplate(template),
      bio: servicePresetBio(template),
    })
    if (applied) successCount += 1
  })

  showUiNotice(
    'success',
    t(
      `已应用模板到 ${successCount} 个服务对象。`,
      `Applied template to ${successCount} service entries.`,
    ),
  )
}

onMounted(() => {
  scrollSelectedServiceIntoView()
})

onBeforeUnmount(() => {
  if (uiNoticeTimerId) clearTimeout(uiNoticeTimerId)
  Object.keys(rolePreviewMap).forEach((assetId) => {
    galleryStore.releaseAssetPreview(assetId, CHAT_DIRECTORY_ASSET_PREVIEW_SCOPE_ID)
    delete rolePreviewMap[assetId]
  })
  galleryStore.releaseAssetPreviewScope(CHAT_DIRECTORY_ASSET_PREVIEW_SCOPE_ID)
})
</script>

<template>
  <div class="w-full h-full bg-gray-50 flex flex-col">
    <div class="pt-12 pb-3 px-4 bg-white border-b border-gray-100">
      <div class="flex items-center justify-between">
        <button @click="goBack" class="text-sm text-blue-600 flex items-center gap-1">
          <i class="fas fa-chevron-left"></i> {{ t('聊天', 'Chat') }}
        </button>
        <span class="font-bold">{{ t('会话通讯录', 'Chat Directory') }}</span>
        <span class="text-[11px] text-gray-400">{{ t('绑定层', 'Binding Layer') }}</span>
      </div>
      <p class="mt-2 text-xs text-gray-500" data-testid="chat-directory-boundary-copy">
        {{
          t(
            'Chat Directory 决定谁能进入 Chat：角色档案来自 Contacts；一个角色可以先只保存在 Contacts，绑定后才成为会话对象。服务号可在此新建/编辑/删除。',
            'Chat Directory decides who can enter Chat: role profiles come from Contacts; a role may remain only in Contacts until it is bound as a chat target. Service accounts are managed here.',
          )
        }}
      </p>
    </div>

    <p
      v-if="uiNoticeMessage"
      class="px-4 py-2 text-[11px]"
      data-testid="chat-directory-ui-notice"
      :class="
        uiNoticeType === 'error'
          ? 'text-red-600'
          : uiNoticeType === 'warning'
            ? 'text-amber-600'
            : 'text-emerald-600'
      "
    >
      {{ uiNoticeMessage }}
    </p>

    <div class="px-4 py-3 bg-white border-b border-gray-100 flex flex-wrap gap-2">
      <button
        @click="switchSection('roles')"
        class="px-3 py-1.5 rounded-full text-xs border"
        :class="
          activeSection === 'roles'
            ? 'border-violet-300 bg-violet-50 text-violet-700'
            : 'border-gray-200 bg-white text-gray-600'
        "
      >
        {{ t('角色绑定', 'Role Bindings') }}
      </button>
      <button
        @click="switchSection('service')"
        class="px-3 py-1.5 rounded-full text-xs border"
        data-testid="chat-directory-section-service"
        :class="
          activeSection === 'service'
            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
            : 'border-gray-200 bg-white text-gray-600'
        "
      >
        {{ t('订阅', 'Services') }}
      </button>
    </div>

    <div class="px-4 py-3 bg-white border-b border-gray-100 space-y-2">
      <div class="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
        <i class="fas fa-search text-xs text-gray-400"></i>
        <input
          v-model="searchKeyword"
          type="text"
          :placeholder="searchPlaceholder"
          class="flex-1 bg-transparent text-sm outline-none"
        />
        <button
          v-if="searchKeyword"
          @click="searchKeyword = ''"
          class="text-[11px] text-gray-500 hover:text-gray-700"
        >
          {{ t('清空', 'Clear') }}
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in activeSection === 'roles' ? roleFilterOptions : serviceFilterOptions"
          :key="`${activeSection}-${option.key}`"
          @click="setDirectoryFilter(option.key)"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border"
          :class="
            (activeSection === 'roles' ? roleFilter : serviceFilter) === option.key
              ? activeSection === 'roles'
                ? 'border-violet-300 bg-violet-50 text-violet-700'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-white text-gray-600'
          "
        >
          {{ option.label }}
          <span
            v-if="activeSection === 'service'"
            class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/80 px-1 text-[9px] font-semibold text-gray-500"
            :data-testid="`chat-directory-service-filter-chip-meta-${option.key}`"
          >
            {{ serviceFilterOptionCount(option.key) }}
          </span>
        </button>
      </div>
    </div>

    <div ref="directoryScrollAreaRef" class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <section v-if="activeSection === 'roles'" class="space-y-3">
        <div class="grid grid-cols-3 gap-2" data-testid="chat-directory-social-summary">
          <button
            type="button"
            class="rounded-2xl border border-emerald-100 bg-white px-3 py-2 text-left"
            @click="roleFilter = 'connected'"
          >
            <p class="text-[10px] font-semibold text-emerald-700">{{ t('正常聊天', 'Chatting') }}</p>
            <p class="mt-1 text-xl font-bold text-gray-950">{{ roleConnectedCount }}</p>
          </button>
          <button
            type="button"
            class="rounded-2xl border border-amber-100 bg-white px-3 py-2 text-left"
            data-testid="chat-directory-requests-summary"
            @click="roleFilter = 'requests'"
          >
            <p class="text-[10px] font-semibold text-amber-700">{{ t('消息请求', 'Requests') }}</p>
            <p class="mt-1 text-xl font-bold text-gray-950">{{ roleRequestCount }}</p>
          </button>
          <button
            type="button"
            class="rounded-2xl border border-rose-100 bg-white px-3 py-2 text-left"
            @click="roleFilter = 'blocked'"
          >
            <p class="text-[10px] font-semibold text-rose-700">{{ t('已屏蔽', 'Blocked') }}</p>
            <p class="mt-1 text-xl font-bold text-gray-950">{{ roleBlockedCount }}</p>
          </button>
        </div>
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-gray-500 uppercase">{{ t('已绑定角色', 'Bound Roles') }}</h3>
          <div class="flex items-center gap-2">
            <button
              @click="openBindModal"
              class="px-2.5 py-1 rounded-md border border-violet-200 bg-violet-50 text-violet-700 text-xs"
            >
              {{ t('绑定角色', 'Bind Role') }}
            </button>
            <button
              @click="toggleBatchMode"
              class="px-2.5 py-1 rounded-md border text-xs"
              :class="
                batchMode
                  ? 'border-gray-300 bg-gray-100 text-gray-700'
                  : 'border-gray-200 bg-white text-gray-700'
              "
            >
              {{ batchMode ? t('退出批量', 'Exit Batch') : t('批量操作', 'Batch') }}
            </button>
          </div>
        </div>

        <p v-if="roleBindings.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('暂无已绑定角色。', 'No role bindings yet.') }}
        </p>
        <p v-else-if="filteredRoleBindings.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('当前筛选下没有匹配角色。', 'No role matches current filter.') }}
        </p>
        <div v-if="batchMode" class="rounded-xl border border-violet-100 bg-violet-50/50 p-3 space-y-2">
          <p class="text-xs text-violet-700 font-medium">
            {{ t('批量模式已开启，点击列表项可勾选。', 'Batch mode enabled. Tap items to select.') }}
          </p>
          <p class="text-xs text-violet-700">
            {{ t('已选', 'Selected') }} {{ selectedRoleCount }} {{ t('项', 'items') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              @click="toggleSelectAllFiltered"
              class="px-2.5 py-1 rounded border border-violet-200 bg-white text-violet-700 text-[11px]"
            >
              {{ allFilteredSelected ? t('取消全选', 'Unselect All') : t('全选筛选结果', 'Select All') }}
            </button>
            <button
              @click="clearSelection"
              class="px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 text-[11px]"
              :disabled="selectedCountCurrentSection === 0"
            >
              {{ t('清空选择', 'Clear Selection') }}
            </button>
            <button
              @click="batchUnbindSelectedRoles"
              class="px-2.5 py-1 rounded border border-red-200 bg-red-50 text-red-600 text-[11px]"
              :disabled="selectedRoleCount === 0"
            >
              {{ t('批量解绑', 'Batch Unbind') }}
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select
              v-model="selectedRoleTemplateId"
              class="rounded border border-violet-200 bg-white px-2 py-1 text-[11px] text-violet-700 outline-none"
            >
              <option
                v-for="preset in roleMetaTemplatePresets"
                :key="`role-template-${preset.id}`"
                :value="preset.id"
              >
                {{ roleTemplateLabel(preset) }}
              </option>
            </select>
            <button
              @click="applyRoleTemplateToSelected"
              class="px-2.5 py-1 rounded border border-violet-200 bg-white text-violet-700 text-[11px]"
              :disabled="selectedRoleCount === 0"
            >
              {{ t('批量套用模板', 'Apply Template') }}
            </button>
          </div>
        </div>

        <div
          v-for="contact in filteredRoleBindings"
          :key="contact.id"
          class="rounded-2xl border p-3 flex items-center gap-3"
          :class="
            batchMode
              ? isContactSelected(contact.id)
                ? 'bg-violet-50 border-violet-300 cursor-pointer'
                : 'bg-white border-violet-100 cursor-pointer'
              : 'bg-white border-gray-100'
          "
          @click="batchMode && toggleSelectContact(contact.id)"
        >
          <button
            v-if="batchMode"
            type="button"
            class="w-5 h-5 rounded border flex items-center justify-center text-[10px]"
            :class="
              isContactSelected(contact.id)
                ? 'border-violet-400 bg-violet-500 text-white'
                : 'border-gray-300 bg-white text-transparent'
            "
            @click.stop="toggleSelectContact(contact.id)"
          >
            <i class="fas fa-check"></i>
          </button>
          <div class="w-10 h-10 rounded-xl bg-gray-200 overflow-hidden">
            <img
              :src="contactAvatarForDisplay(contact)"
              class="w-full h-full object-cover"
              :data-testid="`chat-directory-contact-avatar-${contact.id}`"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold truncate">{{ contact.name }}</p>
            <p class="text-xs text-gray-500 truncate">
              {{ contact.role || t('未设置角色', 'Role not set') }} ·
              <span :data-testid="`chat-directory-role-chat-tuning-${contact.id}`">
                {{ t('会话调校', 'Chat tuning') }} {{ contact.relationshipLevel ?? 50 }}
              </span>
            </p>
            <div class="mt-1 flex flex-wrap items-center gap-1.5">
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                :class="chatSocialStateBadgeClass(contact)"
                :data-testid="`chat-directory-social-state-${contact.id}`"
              >
                {{ chatSocialStateLabel(contact) }}
              </span>
              <span class="text-[11px] text-gray-400">{{ chatSocialStateDescription(contact) }}</span>
            </div>
            <p
              v-if="contact.relationshipNote"
              class="text-[11px] text-gray-400 truncate"
              :data-testid="`chat-directory-role-chat-note-${contact.id}`"
            >
              {{ t('会话备注', 'Chat note') }}: {{ contact.relationshipNote }}
            </p>
            <p class="text-[11px] text-gray-400 truncate">
              {{ roleFolderBindingSummary(contact) }}
            </p>
            <div v-if="getRolePreviewAssetIds(contact.id).length > 0" class="mt-1 flex items-center gap-1.5">
              <AssetThumbnailOption
                v-for="assetId in getRolePreviewAssetIds(contact.id)"
                :key="`chat-role-preview-${contact.id}-${assetId}`"
                :asset="{ id: assetId, name: preferredImageAssetLabel(contact) || roleFolderBindingSummary(contact) }"
                :preview-url="rolePreviewMap[assetId]"
                variant="tiny"
                :interactive="false"
                :show-name="false"
              />
              <span
                v-if="getRolePreviewOverflowCount(contact.id) > 0"
                class="text-[10px] text-gray-500"
              >
                +{{ getRolePreviewOverflowCount(contact.id) }}
              </span>
            </div>
            <p v-if="preferredImageAssetLabel(contact)" class="text-[11px] text-gray-400 truncate">
              {{ t('会话优先素材', 'Thread preferred asset') }}: {{ preferredImageAssetLabel(contact) }}
            </p>
          </div>
          <div v-if="!batchMode" class="flex shrink-0 flex-col items-end gap-1.5">
            <button
              v-if="
                chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.STRANGER ||
                chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED
              "
              @click="greetRoleContact(contact)"
              class="text-xs text-amber-600"
              :data-testid="`chat-directory-greet-${contact.id}`"
            >
              {{ t('打招呼', 'Greet') }}
            </button>
            <button
              v-if="chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST"
              @click="acceptRoleRequest(contact)"
              class="text-xs text-emerald-600"
              :data-testid="`chat-directory-accept-request-${contact.id}`"
            >
              {{ t('通过', 'Accept') }}
            </button>
            <button
              v-if="chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST"
              @click="declineRoleRequest(contact)"
              class="text-xs text-gray-500"
              :data-testid="`chat-directory-decline-request-${contact.id}`"
            >
              {{ t('忽略', 'Ignore') }}
            </button>
            <button
              v-if="chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST"
              @click="cancelRoleGreeting(contact)"
              class="text-xs text-gray-500"
            >
              {{ t('撤回', 'Cancel') }}
            </button>
            <button
              v-if="
                chatStore.getContactChatSocialState(contact) !== CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED &&
                chatStore.getContactChatSocialState(contact) !== CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
              "
              @click="blockRoleContact(contact)"
              class="text-xs text-rose-500"
              :data-testid="`chat-directory-block-${contact.id}`"
            >
              {{ t('拉黑', 'Block') }}
            </button>
            <button
              v-if="
                chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED ||
                chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
              "
              @click="unblockRoleContact(contact)"
              class="text-xs text-emerald-600"
              :data-testid="`chat-directory-unblock-${contact.id}`"
            >
              {{ t('解除拉黑', 'Unblock') }}
            </button>
            <button
              v-if="
                chatStore.getContactChatSocialState(contact) !== CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED &&
                chatStore.getContactChatSocialState(contact) !== CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
              "
              @click="markRoleRefusingUser(contact)"
              class="text-xs text-gray-500"
            >
              {{ t('对方拒收', 'Refuse') }}
            </button>
            <button
              v-if="
                chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED ||
                chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
              "
              @click="clearRoleRefusingUser(contact)"
              class="text-xs text-gray-500"
            >
              {{ t('恢复接收', 'Restore') }}
            </button>
            <button @click="openChat(contact)" class="text-xs text-blue-600">{{ t('聊天', 'Chat') }}</button>
            <button
              @click="openRoleMetaModal(contact)"
              class="text-xs text-gray-500"
              :data-testid="`chat-directory-role-meta-${contact.id}`"
            >
              {{ t('会话设定', 'Thread Meta') }}
            </button>
            <button @click="unbindRole(contact)" class="text-xs text-red-500">{{ t('解绑', 'Unbind') }}</button>
          </div>
        </div>

        <div class="rounded-xl bg-white border border-gray-100 p-3">
          <div class="flex items-center justify-between gap-2 mb-2">
            <p class="text-xs font-semibold text-gray-600">{{ t('可绑定角色档案', 'Available Profiles') }}</p>
            <button
              v-if="batchMode"
              @click="batchBindFilteredProfiles"
              class="px-2 py-1 rounded border border-violet-200 bg-violet-50 text-violet-700 text-[11px]"
            >
              {{ t('批量绑定筛选结果', 'Batch Bind Filtered') }}
            </button>
          </div>
          <p v-if="unboundRoleProfilesRaw.length === 0" class="text-xs text-gray-400">
            {{ t('全部角色已绑定到会话。', 'All profiles are already bound.') }}
          </p>
          <p v-else-if="filteredUnboundRoleProfiles.length === 0" class="text-xs text-gray-400">
            {{ t('可绑定角色中暂无匹配结果。', 'No available profile matches current filter.') }}
          </p>
          <div v-else class="space-y-1.5">
            <div
              v-for="profile in filteredUnboundRoleProfiles"
              :key="profile.id"
              class="flex items-center justify-between gap-2 border border-gray-100 rounded-lg px-2.5 py-2"
            >
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ profile.name }}</p>
                <p class="text-[11px] text-gray-500 truncate">{{ roleTypeTag(profile) }} · {{ profile.role || t('未设置角色', 'Role not set') }}</p>
              </div>
              <button
                @click="bindProfileId = profile.id; bindSelectedProfile()"
                class="px-2 py-1 rounded border border-violet-200 bg-violet-50 text-violet-700 text-[11px]"
              >
                {{ t('绑定', 'Bind') }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'service'" class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xs font-bold text-gray-500 uppercase">{{ t('订阅消息', 'Subscriptions') }}</h3>
            <p class="mt-1 text-[11px] text-gray-500">
              {{ t('服务号和公众号按消息流呈现，新增与模板放在管理区。', 'Service and official accounts appear as a message feed; creation and templates live in management.') }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="hasUnreadServiceSubscriptions"
              @click="markAllServiceSubscriptionsRead"
              class="px-2.5 py-1 rounded-md border border-red-100 bg-white text-red-600 text-xs"
              data-testid="chat-directory-service-mark-all-read"
            >
              {{ t('全部已读', 'Mark all read') }}
            </button>
            <button
              @click="toggleServiceManagement"
              class="px-2.5 py-1 rounded-md border text-xs"
              data-testid="chat-directory-service-management-toggle"
              :class="
                shouldShowServiceManagement
                  ? 'border-gray-300 bg-gray-100 text-gray-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              "
            >
              {{ shouldShowServiceManagement ? t('收起管理', 'Hide Manage') : t('管理订阅源', 'Manage') }}
            </button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2" data-testid="chat-directory-subscription-summary">
          <button
            type="button"
            data-testid="chat-directory-service-summary-unread"
            :class="serviceSummaryCardClass('unread', 'unread')"
            :aria-pressed="serviceFilter === 'unread'"
            :data-state="serviceFilter === 'unread' ? 'selected' : 'idle'"
            @click="setDirectoryFilter('unread')"
          >
            <p class="text-[10px] font-semibold text-red-600">{{ t('未读订阅', 'Unread') }}</p>
            <p class="mt-1 text-xl font-bold text-gray-950">{{ serviceUnreadTotal }}</p>
            <p class="text-[10px] text-gray-400">{{ serviceUnreadContactCount }} {{ t('个账号', 'accounts') }}</p>
          </button>
          <button
            type="button"
            data-testid="chat-directory-service-summary-muted"
            :class="serviceSummaryCardClass('muted', 'muted')"
            :aria-pressed="serviceFilter === 'muted'"
            :data-state="serviceFilter === 'muted' ? 'selected' : 'idle'"
            @click="setDirectoryFilter('muted')"
          >
            <p class="text-[10px] font-semibold text-emerald-700">{{ t('免打扰', 'Muted') }}</p>
            <p class="mt-1 text-xl font-bold text-gray-950">{{ serviceMutedCount }}</p>
            <p
              v-if="serviceMutedUnreadTotal > 0"
              class="text-[10px] font-semibold text-emerald-700"
              data-testid="chat-directory-service-muted-unread-summary"
            >
              {{
                t(
                  `${serviceMutedUnreadTotal} 条未读 · ${serviceMutedUnreadContactCount} 个账号静默`,
                  `${serviceMutedUnreadTotal} unread · ${serviceMutedUnreadContactCount} accounts quiet`,
                )
              }}
            </p>
            <p class="text-[10px] text-gray-400">{{ t('不会挤占注意力', 'quiet delivery') }}</p>
          </button>
          <button
            type="button"
            data-testid="chat-directory-service-summary-folded"
            :class="serviceSummaryCardClass('folded', 'folded')"
            :aria-pressed="serviceFilter === 'folded'"
            :data-state="serviceFilter === 'folded' ? 'selected' : 'idle'"
            @click="setDirectoryFilter('folded')"
          >
            <p class="text-[10px] font-semibold text-slate-700">{{ t('已折叠', 'Folded') }}</p>
            <p class="mt-1 text-xl font-bold text-gray-950">{{ serviceFoldedCount }}</p>
            <p
              v-if="serviceFoldedUnreadTotal > 0"
              class="text-[10px] font-semibold text-red-600"
              data-testid="chat-directory-service-folded-unread-summary"
            >
              {{
                t(
                  `${serviceFoldedUnreadTotal} 条未读 · ${serviceFoldedUnreadContactCount} 个账号在服务号页`,
                  `${serviceFoldedUnreadTotal} unread · ${serviceFoldedUnreadContactCount} accounts in Services`,
                )
              }}
            </p>
            <p class="text-[10px] text-gray-400">{{ t('不显示在消息首页', 'hidden from Messages') }}</p>
          </button>
        </div>

        <div
          class="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3"
          data-testid="chat-directory-service-filter-context"
        >
          <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700">
            <i :class="serviceFilterContext.icon"></i>
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-emerald-900" data-testid="chat-directory-service-filter-context-title">
              {{ serviceFilterContext.title }}
            </p>
            <p class="mt-1 text-[11px] leading-relaxed text-emerald-800" data-testid="chat-directory-service-filter-context-body">
              {{ serviceFilterContext.body }}
            </p>
          </div>
          <button
            v-if="serviceFilterContext.actionLabel"
            type="button"
            class="shrink-0 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
            data-testid="chat-directory-service-filter-context-action"
            @click="runServiceInboxAction(serviceFilterContext)"
          >
            {{ serviceFilterContext.actionLabel }}
          </button>
        </div>

        <div
          v-if="selectedServiceReturnPanel"
          class="flex items-start gap-3 rounded-2xl border px-3 py-3 shadow-sm"
          :class="selectedServiceReturnPanelClass"
          data-testid="chat-directory-service-return-panel"
          :data-visible="selectedServiceReturnVisible ? 'true' : 'false'"
          :data-return-tone="selectedServiceReturnPanel.tone"
        >
          <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/80">
            <i :class="selectedServiceReturnVisible ? 'fas fa-location-dot' : 'fas fa-inbox'"></i>
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold" data-testid="chat-directory-service-return-title">
              {{ selectedServiceReturnPanel.title }}
            </p>
            <p class="mt-1 text-[11px] leading-relaxed" data-testid="chat-directory-service-return-body">
              {{ selectedServiceReturnPanel.body }}
            </p>
            <p class="mt-1 text-[10px] font-semibold opacity-80" data-testid="chat-directory-service-return-meta">
              {{ selectedServiceReturnPanel.meta }}
            </p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1.5">
            <button
              type="button"
              class="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[11px] font-semibold"
              data-testid="chat-directory-service-return-primary"
              @click="runSelectedServiceReturnPrimary"
            >
              {{ selectedServiceReturnPanel.primaryLabel }}
            </button>
            <button
              type="button"
              class="text-[11px] opacity-70"
              data-testid="chat-directory-service-return-dismiss"
              @click="clearSelectedServiceReturn"
            >
              {{ t('收起', 'Dismiss') }}
            </button>
          </div>
        </div>

        <div
          v-if="serviceContacts.length === 0 || filteredServiceContacts.length === 0"
          class="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-5 text-center"
          data-testid="chat-directory-service-empty-state"
        >
          <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-500">
            <i :class="serviceEmptyState.icon"></i>
          </div>
          <p class="mt-3 text-sm font-semibold text-gray-900" data-testid="chat-directory-service-empty-title">
            {{ serviceEmptyState.title }}
          </p>
          <p class="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-500" data-testid="chat-directory-service-empty-body">
            {{ serviceEmptyState.body }}
          </p>
          <button
            v-if="serviceEmptyState.actionLabel"
            type="button"
            class="mt-3 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700"
            data-testid="chat-directory-service-empty-action"
            @click="runServiceInboxAction(serviceEmptyState)"
          >
            {{ serviceEmptyState.actionLabel }}
          </button>
        </div>

        <div
          v-for="section in serviceFeedSections"
          :key="section.key"
          class="space-y-2"
          :data-testid="`chat-directory-service-section-${section.key}`"
        >
          <div class="flex items-center justify-between px-1">
            <div class="flex min-w-0 items-center gap-2">
              <span class="h-2 w-2 rounded-full" :class="section.dotClass"></span>
              <p class="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {{ section.title }}
              </p>
            </div>
            <p class="shrink-0 text-[10px] text-gray-400">{{ section.meta }}</p>
          </div>

          <div
            v-for="contact in section.contacts"
            :key="contact.id"
            class="rounded-2xl border p-3 flex items-center gap-3"
            :class="[
              batchMode
                ? isContactSelected(contact.id)
                  ? 'bg-emerald-50 border-emerald-300 cursor-pointer'
                  : 'bg-white border-emerald-100 cursor-pointer'
                : 'bg-white border-gray-100 cursor-pointer',
              isSelectedServiceReturnContact(contact)
                ? 'border-emerald-300 bg-emerald-50/70 ring-2 ring-emerald-100'
                : '',
            ]"
            :data-testid="`chat-directory-service-feed-${contact.id}`"
            :data-selected="isSelectedServiceReturnContact(contact) ? 'true' : 'false'"
            :data-service-contact-id="contact.id"
            @click="batchMode ? toggleSelectContact(contact.id) : openChat(contact)"
          >
            <button
              v-if="batchMode"
              type="button"
              class="w-5 h-5 rounded border flex items-center justify-center text-[10px]"
              :class="
                isContactSelected(contact.id)
                  ? 'border-emerald-400 bg-emerald-500 text-white'
                  : 'border-gray-300 bg-white text-transparent'
              "
              @click.stop="toggleSelectContact(contact.id)"
            >
              <i class="fas fa-check"></i>
            </button>
            <div
              class="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden shrink-0"
              :class="contact.kind === 'official' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'"
            >
              <img
                v-if="explicitContactAvatarForDisplay(contact)"
                :src="explicitContactAvatarForDisplay(contact)"
                class="h-full w-full object-cover"
                :data-testid="`chat-directory-service-avatar-${contact.id}`"
              />
              <i v-else :class="contact.kind === 'official' ? 'fas fa-newspaper' : 'fas fa-concierge-bell'"></i>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-semibold truncate">{{ contact.name }}</p>
                  <p class="text-xs text-gray-500 truncate">
                    {{ serviceKindTag(contact) }} · {{ contact.serviceTemplate || t('未设置服务模板', 'Service template not set') }}
                  </p>
                </div>
                <div class="shrink-0 text-right">
                  <p class="text-[10px] text-gray-400">{{ formatServiceConversationTime(serviceDisplayMessageAt(contact)) }}</p>
                  <span
                    v-if="serviceUnreadCount(contact) > 0"
                    class="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white"
                  >
                    {{ Math.min(serviceUnreadCount(contact), 99) }}
                  </span>
                </div>
              </div>
              <p class="mt-1 text-xs text-gray-600 line-clamp-1">
                {{ serviceConversationPreviewText(contact) }}
              </p>
              <div class="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  :class="serviceDeliveryState(contact).className"
                  :data-testid="`chat-directory-service-delivery-state-${contact.id}`"
                >
                  {{ serviceDeliveryState(contact).label }}
                </span>
                <span
                  v-for="tag in serviceSubscriptionStatusTags(contact)"
                  :key="`${contact.id}-${tag.key}`"
                  class="rounded-full px-2 py-0.5 text-[10px]"
                  :class="tag.className"
                  :data-testid="`chat-directory-service-${tag.key}-tag-${contact.id}`"
                >
                  {{ tag.label }}
                </span>
                <span
                  v-if="serviceUnreadCount(contact) > 0"
                  class="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600"
                  :data-testid="`chat-directory-service-unread-summary-${contact.id}`"
                >
                  {{ t(`${serviceUnreadCount(contact)} 条未读更新`, `${serviceUnreadCount(contact)} unread updates`) }}
                </span>
                <span
                  v-if="isSelectedServiceReturnContact(contact)"
                  class="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700"
                  :data-testid="`chat-directory-service-selected-tag-${contact.id}`"
                >
                  {{ t('刚刚查看', 'Recently opened') }}
                </span>
                <span
                  v-if="shoppingServiceLabel(contact.shoppingServiceKey)"
                  class="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700"
                  :data-testid="`chat-directory-shopping-service-${contact.id}`"
                >
                  {{ t('Shopping 店铺', 'Shopping shop') }} · {{ shoppingServiceLabel(contact.shoppingServiceKey) }}
                </span>
                <span
                  v-if="logisticsServiceLabel(contact.logisticsServiceKey)"
                  class="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-700"
                  :data-testid="`chat-directory-logistics-service-${contact.id}`"
                >
                  {{ t('物流服务号', 'Logistics service') }} · {{ logisticsServiceLabel(contact.logisticsServiceKey) }}
                </span>
                <span
                  v-if="foodDeliveryServiceLabel(contact.foodDeliveryServiceKey)"
                  class="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] text-orange-700"
                  :data-testid="`chat-directory-food-delivery-service-${contact.id}`"
                >
                  {{ t('外卖服务号', 'Food delivery service') }} · {{ foodDeliveryServiceLabel(contact.foodDeliveryServiceKey) }}
                </span>
                <span
                  v-if="serviceSourceNotificationPlanRows(contact).length > 0"
                  class="max-w-full truncate rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700"
                  :data-testid="`chat-directory-service-source-plan-${contact.id}`"
                  :title="serviceSourceNotificationPlanSummary(contact)"
                >
                  {{ t('可接收', 'Receives') }} · {{ sourceNotificationPlanRowsText(serviceSourceNotificationPlanRows(contact)) }}
                </span>
              </div>
            </div>
            <div v-if="!batchMode" class="flex shrink-0 flex-col items-end gap-1.5">
              <button @click.stop="openChat(contact)" class="text-xs text-blue-600">{{ t('聊天', 'Chat') }}</button>
              <button
                v-if="serviceUnreadCount(contact) > 0"
                @click.stop="markServiceRead(contact)"
                class="text-xs text-red-600"
                :data-testid="`chat-directory-service-mark-read-${contact.id}`"
              >
                {{ t('标为已读', 'Mark read') }}
              </button>
              <button
                @click.stop="toggleServiceMuted(contact)"
                class="text-xs text-emerald-600"
                :data-testid="`chat-directory-service-toggle-muted-${contact.id}`"
              >
                {{ chatStore.isChatSubscriptionMuted(contact) ? t('取消免打扰', 'Unmute') : t('免打扰', 'Mute') }}
              </button>
              <button
                @click.stop="toggleServiceFolded(contact)"
                class="text-xs text-slate-600"
                :data-testid="`chat-directory-service-toggle-folded-${contact.id}`"
              >
                {{ chatStore.isChatSubscriptionFolded(contact) ? t('取消折叠', 'Unfold') : t('折叠', 'Fold') }}
              </button>
              <button @click.stop="openEditService(contact)" class="text-xs text-gray-500">{{ t('编辑', 'Edit') }}</button>
              <button @click.stop="removeService(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
            </div>
          </div>
        </div>

        <div
          v-if="shouldShowServiceManagement"
          class="rounded-2xl border border-gray-100 bg-gray-50/60 p-3 space-y-3"
          data-testid="chat-directory-service-management"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p class="text-xs font-semibold text-gray-700">{{ t('订阅源管理', 'Subscription source management') }}</p>
              <p class="text-[11px] text-gray-500">{{ t('新增、模板和批量删除都在这里处理。', 'Create, template, and batch-delete sources here.') }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                @click="openCreateService('service')"
                class="px-2.5 py-1 rounded-md border border-emerald-200 bg-white text-emerald-700 text-xs"
                data-testid="chat-directory-add-service"
              >
                {{ t('新增服务号', 'Add Service') }}
              </button>
              <button @click="openCreateService('official')" class="px-2.5 py-1 rounded-md border border-sky-200 bg-white text-sky-700 text-xs">
                {{ t('新增公众号', 'Add Official') }}
              </button>
              <button
                @click="toggleBatchMode"
                class="px-2.5 py-1 rounded-md border text-xs"
                :class="
                  batchMode
                    ? 'border-gray-300 bg-gray-100 text-gray-700'
                    : 'border-gray-200 bg-white text-gray-700'
                "
              >
                {{ batchMode ? t('退出批量', 'Exit Batch') : t('批量操作', 'Batch') }}
              </button>
            </div>
          </div>

        <div v-if="batchMode" class="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 space-y-2">
          <p class="text-xs text-emerald-700 font-medium">
            {{ t('批量模式已开启，点击列表项可勾选。', 'Batch mode enabled. Tap items to select.') }}
          </p>
          <p class="text-xs text-emerald-700">
            {{ t('已选', 'Selected') }} {{ selectedServiceCount }} {{ t('项', 'items') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              @click="toggleSelectAllFiltered"
              class="px-2.5 py-1 rounded border border-emerald-200 bg-white text-emerald-700 text-[11px]"
            >
              {{ allFilteredSelected ? t('取消全选', 'Unselect All') : t('全选筛选结果', 'Select All') }}
            </button>
            <button
              @click="clearSelection"
              class="px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-600 text-[11px]"
              :disabled="selectedCountCurrentSection === 0"
            >
              {{ t('清空选择', 'Clear Selection') }}
            </button>
            <button
              @click="batchDeleteSelectedServices"
              class="px-2.5 py-1 rounded border border-red-200 bg-red-50 text-red-600 text-[11px]"
              :disabled="selectedServiceCount === 0"
            >
              {{ t('批量删除', 'Batch Delete') }}
            </button>
          </div>
        </div>

        <div
          v-if="hasWorldPackServiceTemplateRows"
          class="rounded-xl border border-indigo-100 bg-white p-3 space-y-3"
          data-testid="chat-directory-world-service-templates"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs font-semibold text-indigo-700">
                {{ t('当前世界观可订阅服务号', 'Current world subscriptions') }}
              </p>
              <p class="mt-1 text-[11px] leading-4 text-gray-500" data-testid="chat-directory-world-service-summary">
                {{
                  t(
                    `${activeWorldPackDisplayName} 提供 ${worldPackServiceTemplateRows.length} 个服务号候选；已加入 ${worldPackServiceJoinedCount} 个，待加入 ${worldPackServiceAvailableCount} 个。`,
                    `${activeWorldPackDisplayName} offers ${worldPackServiceTemplateRows.length} service candidates; ${worldPackServiceJoinedCount} joined and ${worldPackServiceAvailableCount} available.`,
                  )
                }}
              </p>
            </div>
            <span class="rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">
              {{ t('手动加入', 'Chat opt-in') }}
            </span>
          </div>

          <div class="grid gap-2">
            <div
              v-for="row in worldPackServiceTemplateRows"
              :key="`world-service-template-${row.id}`"
              class="rounded-lg border border-indigo-100 bg-indigo-50/35 px-2.5 py-2 flex items-center justify-between gap-2"
              :data-testid="`chat-directory-world-service-template-${row.id}`"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <p class="text-xs font-semibold text-indigo-900 truncate">{{ row.title || row.name }}</p>
                  <span
                    class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-700"
                    :data-testid="`chat-directory-world-service-template-state-${row.id}`"
                  >
                    {{ row.generated ? t('已加入', 'Joined') : t('可加入', 'Available') }}
                  </span>
                  <span
                    v-if="row.userEditedAt"
                    class="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                    :data-testid="`chat-directory-world-service-template-edited-${row.id}`"
                  >
                    {{ t('已自定义', 'Customized') }}
                  </span>
                </div>
                <p class="mt-1 text-[11px] text-indigo-700 truncate">
                  {{ worldPackServiceKindTag(row) }} · {{ worldPackServiceBindingLabel(row) }}
                </p>
                <p class="mt-0.5 text-[11px] text-gray-500 line-clamp-1">
                  {{
                    row.description ||
                    t(
                      '加入后只创建 Chat 订阅会话；来源 App 仍拥有业务记录。',
                      'Joining only creates a Chat subscription thread; source apps keep business records.',
                    )
                  }}
                </p>
                <p
                  class="mt-1 text-[10px] font-semibold text-indigo-700 line-clamp-1"
                  :data-testid="`chat-directory-world-service-source-plan-${row.id}`"
                  :data-source-plan-status="row.sourceNotificationPlan?.status || 'not_connected'"
                  :title="sourceNotificationPlanSummary(row.sourceNotificationPlan)"
                >
                  {{ row.generated ? t('接收计划', 'Receive plan') : t('加入后可接收', 'Ready after join') }} · {{ sourceNotificationPlanSummary(row.sourceNotificationPlan) }}
                </p>
              </div>
              <div class="shrink-0 flex flex-col items-end gap-1">
                <button
                  v-if="row.generated"
                  type="button"
                  class="px-2 py-1 rounded border border-indigo-200 bg-white text-indigo-700 text-[11px]"
                  :data-testid="`chat-directory-open-world-service-${row.id}`"
                  @click="openWorldPackServiceTemplateContact(row)"
                >
                  {{ t('打开', 'Open') }}
                </button>
                <button
                  v-else
                  type="button"
                  class="px-2 py-1 rounded border border-indigo-200 bg-white text-indigo-700 text-[11px]"
                  :data-testid="`chat-directory-join-world-service-${row.id}`"
                  @click="joinWorldPackServiceTemplate(row)"
                >
                  {{ t('加入订阅', 'Join') }}
                </button>
                <button
                  type="button"
                  class="px-2 py-1 rounded border border-gray-200 bg-white text-gray-600 text-[11px]"
                  :data-testid="`chat-directory-edit-world-service-${row.id}`"
                  @click="openEditWorldServiceTemplate(row)"
                >
                  {{ t('编辑模板', 'Edit') }}
                </button>
                <button
                  v-if="row.userEditedAt"
                  type="button"
                  class="px-2 py-1 rounded border border-amber-200 bg-white text-amber-700 text-[11px]"
                  :data-testid="`chat-directory-reset-world-service-${row.id}`"
                  @click="resetWorldServiceTemplate(row)"
                >
                  {{ t('恢复内置', 'Reset') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <details
          v-if="activeWorldPack?.id"
          class="rounded-xl border border-sky-100 bg-white p-3 space-y-3"
          data-testid="chat-directory-world-service-proposals"
          :aria-busy="worldServiceProposalLoading ? 'true' : 'false'"
        >
          <summary class="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-sky-800">
            <span>{{ t('AI 候选服务号', 'AI service candidates') }}</span>
            <span class="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] text-sky-700">
              {{
                worldServiceProposalReview
                  ? summarizeWorldServiceTemplateReview(worldServiceProposalReview)
                  : t('仅审核', 'Review only')
              }}
            </span>
          </summary>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700"
              :disabled="worldServiceProposalLoading"
              data-testid="chat-directory-world-service-proposal-extract-ai"
              @click="extractWorldServiceTemplateProposalsFromAI"
            >
              {{ worldServiceProposalLoading ? t('提取中', 'Extracting') : t('AI 提取', 'Extract with AI') }}
            </button>
            <button
              type="button"
              class="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700"
              :disabled="worldServiceProposalLoading"
              data-testid="chat-directory-world-service-proposal-review-json"
              @click="reviewWorldServiceProposalDraft"
            >
              {{ t('审核 JSON', 'Review JSON') }}
            </button>
            <button
              type="button"
              class="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-500"
              :disabled="worldServiceProposalLoading"
              data-testid="chat-directory-world-service-proposal-clear"
              @click="clearWorldServiceProposalReview"
            >
              {{ t('清空', 'Clear') }}
            </button>
          </div>

          <textarea
            class="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none"
            rows="4"
            :value="worldServiceProposalDraft"
            data-testid="chat-directory-world-service-proposal-draft"
            :placeholder="t('粘贴服务号候选 JSON。', 'Paste service proposals JSON.')"
            @input="updateWorldServiceProposalDraft($event.target.value)"
          ></textarea>

          <p
            v-if="worldServiceProposalNotice"
            class="rounded-lg px-2.5 py-2 text-[11px]"
            :class="worldServiceProposalNoticeToneClass"
            data-testid="chat-directory-world-service-proposal-notice"
            :data-notice-tone="worldServiceProposalNoticeTone"
          >
            {{ worldServiceProposalNotice }}
          </p>

          <div
            v-if="worldServiceProposalLoading"
            class="rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-2 text-[11px] text-sky-700"
            data-testid="chat-directory-world-service-proposal-loading"
          >
            {{ t('正在读取世界观上下文', 'Reviewing world context') }}
          </div>

          <div
            v-if="worldServiceProposalReview"
            class="space-y-2"
            data-testid="chat-directory-world-service-proposal-results"
          >
            <div
              v-if="worldServiceProposalReviewIsEmpty"
              class="rounded-lg border border-dashed border-gray-200 px-2.5 py-2 text-[11px] text-gray-500"
              data-testid="chat-directory-world-service-proposal-empty"
            >
              {{ t('没有可加入的服务号候选。', 'No service candidates to add.') }}
            </div>

            <div
              v-for="proposal in worldServiceProposalReview.confirmableProposals || []"
              :key="`world-service-proposal-confirmable-${proposal.id}`"
              class="rounded-lg border border-sky-100 bg-sky-50/50 px-2.5 py-2 flex items-center justify-between gap-2"
              :data-testid="`chat-directory-world-service-proposal-confirmable-${proposal.id}`"
            >
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                    {{ worldServiceProposalConfidenceLabel(proposal.confidence) }}
                  </span>
                  <span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                    {{ worldServiceProposalCategoryLabel(proposal) }}
                  </span>
                </div>
                <p class="mt-1 truncate text-xs font-semibold text-sky-950">{{ proposal.title }}</p>
                <p class="mt-0.5 line-clamp-1 text-[11px] text-gray-500">{{ proposal.description }}</p>
                <p class="mt-0.5 truncate text-[10px] text-sky-700">
                  {{ worldServiceProposalBindingLabel(proposal) }}
                </p>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-md border border-sky-200 bg-white px-2 py-1 text-[11px] font-semibold text-sky-700"
                :disabled="worldServiceProposalLoading"
                :data-testid="`chat-directory-world-service-proposal-confirm-${proposal.id}`"
                @click="confirmWorldServiceTemplateProposalEntry(proposal)"
              >
                {{ t('确认候选', 'Confirm') }}
              </button>
            </div>

            <div
              v-for="proposal in worldServiceProposalReview.rejectedProposals || []"
              :key="`world-service-proposal-rejected-${proposal.id}`"
              class="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2"
              :data-testid="`chat-directory-world-service-proposal-rejected-${proposal.id}`"
            >
              <p class="text-xs font-semibold text-gray-700">{{ proposal.title }}</p>
              <p
                class="mt-0.5 text-[11px] text-gray-500"
                :data-testid="`chat-directory-world-service-proposal-rejection-${proposal.id}`"
                :data-rejection-reason="proposal.rejectionReason || 'unknown'"
              >
                {{ worldServiceProposalRejectionReasonLabel(proposal.rejectionReason) }}
              </p>
            </div>
          </div>
        </details>

        <div class="rounded-xl border border-amber-100 bg-white p-3 space-y-2" data-testid="chat-directory-shopping-service-presets">
          <p class="text-xs font-semibold text-amber-700">
            {{ t('Shopping 店铺账号预设', 'Shopping shop account presets') }}
          </p>
          <p class="text-[11px] leading-4 text-gray-500">
            {{
              t(
                '这些账号负责新品、折扣和商品推荐；商品、购物车和订单仍由 Shopping 管理，物流提醒交给物流服务号。',
                'These accounts handle new arrivals, discounts, and product recommendations; products, cart, and orders remain owned by Shopping, while logistics reminders belong to Logistics service accounts.',
              )
            }}
          </p>
          <div class="grid gap-2">
            <div
              v-for="preset in shoppingServicePresetOptions"
              :key="`shopping-service-preset-${preset.key}`"
              class="rounded-lg border border-amber-100 bg-amber-50/40 px-2.5 py-2 flex items-center justify-between gap-2"
            >
              <div class="min-w-0">
                <p class="text-xs font-medium text-amber-800 truncate">
                  <i :class="preset.icon" class="mr-1"></i>{{ preset.label }}
                </p>
                <p class="text-[11px] text-amber-700 truncate">{{ preset.desc }}</p>
              </div>
              <button
                @click="openCreateShoppingService(preset.key)"
                class="px-2 py-1 rounded border border-amber-200 bg-white text-amber-700 text-[11px]"
                :data-testid="`chat-directory-create-shopping-service-${preset.key}`"
              >
                {{ t('创建店铺号', 'Create Shop') }}
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-sky-100 bg-white p-3 space-y-2" data-testid="chat-directory-logistics-service-presets">
          <p class="text-xs font-semibold text-sky-700">
            {{ t('物流服务号预设', 'Logistics service account presets') }}
          </p>
          <p class="text-[11px] leading-4 text-gray-500">
            {{
              t(
                '物流信息统一由物流服务号承载，可区分同城急送、普通快递和国际物流。',
                'Logistics information is carried by Logistics service accounts, split by local express, standard courier, and international logistics.',
              )
            }}
          </p>
          <div class="grid gap-2">
            <div
              v-for="preset in logisticsServicePresetOptions"
              :key="`logistics-service-preset-${preset.key}`"
              class="rounded-lg border border-sky-100 bg-sky-50/40 px-2.5 py-2 flex items-center justify-between gap-2"
            >
              <div class="min-w-0">
                <p class="text-xs font-medium text-sky-800 truncate">
                  <i :class="preset.icon" class="mr-1"></i>{{ preset.label }}
                </p>
                <p class="text-[11px] text-sky-700 truncate">{{ preset.desc }}</p>
              </div>
              <button
                @click="openCreateLogisticsService(preset.key)"
                class="px-2 py-1 rounded border border-sky-200 bg-white text-sky-700 text-[11px]"
                :data-testid="`chat-directory-create-logistics-service-${preset.key}`"
              >
                {{ t('创建物流号', 'Create Logistics') }}
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-orange-100 bg-white p-3 space-y-2" data-testid="chat-directory-food-delivery-service-presets">
          <p class="text-xs font-semibold text-orange-700">
            {{ t('外卖服务号预设', 'Food delivery service account presets') }}
          </p>
          <p class="text-[11px] leading-4 text-gray-500">
            {{
              t(
                '外卖推送使用独立服务号，后续承载接单、备餐、骑手取餐、送达和异常提醒。',
                'Food delivery pushes use a dedicated service account for accepted, cooking, rider pickup, delivered, and exception alerts.',
              )
            }}
          </p>
          <div class="grid gap-2">
            <div
              v-for="preset in foodDeliveryServicePresetOptions"
              :key="`food-delivery-service-preset-${preset.key}`"
              class="rounded-lg border border-orange-100 bg-orange-50/40 px-2.5 py-2 flex items-center justify-between gap-2"
            >
              <div class="min-w-0">
                <p class="text-xs font-medium text-orange-800 truncate">
                  <i :class="preset.icon" class="mr-1"></i>{{ preset.label }}
                </p>
                <p class="text-[11px] text-orange-700 truncate">{{ preset.desc }}</p>
              </div>
              <button
                @click="openCreateFoodDeliveryService(preset.key)"
                class="px-2 py-1 rounded border border-orange-200 bg-white text-orange-700 text-[11px]"
                :data-testid="`chat-directory-create-food-delivery-service-${preset.key}`"
              >
                {{ t('创建外卖号', 'Create Food') }}
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-emerald-100 bg-white p-3 space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <p class="text-xs font-semibold text-emerald-700">
              {{ t('模板预设中心', 'Template Preset Center') }}
            </p>
            <div class="flex flex-wrap items-center gap-2" v-if="batchMode">
              <select
                v-model="selectedServiceTemplateId"
                class="rounded border border-emerald-200 bg-white px-2 py-1 text-[11px] text-emerald-700 outline-none"
              >
                <option
                  v-for="preset in serviceTemplatePresets"
                  :key="`service-template-${preset.id}`"
                  :value="preset.id"
                >
                  {{ servicePresetTemplate(preset) }} · {{ preset.kind === 'official' ? t('公众号', 'Official') : t('服务号', 'Service') }}
                </option>
              </select>
              <button
                @click="applyServicePresetToSelected"
                class="px-2.5 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px]"
                :disabled="selectedServiceCount === 0"
              >
                {{ t('批量套用模板', 'Apply Template') }}
              </button>
            </div>
          </div>
          <div class="grid gap-2">
            <div
              v-for="preset in serviceTemplatePresets"
              :key="`service-preset-card-${preset.id}`"
              class="rounded-lg border border-emerald-100 bg-emerald-50/40 px-2.5 py-2 flex items-center justify-between gap-2"
            >
              <div class="min-w-0">
                <p class="text-xs font-medium text-emerald-800 truncate">
                  {{ servicePresetName(preset) }} · {{ preset.kind === 'official' ? t('公众号', 'Official') : t('服务号', 'Service') }}
                </p>
                <p class="text-[11px] text-emerald-700 truncate">
                  {{ servicePresetTemplate(preset) }}
                </p>
              </div>
              <button
                @click="openCreateServiceFromPreset(preset.id)"
                class="px-2 py-1 rounded border border-emerald-200 bg-white text-emerald-700 text-[11px]"
              >
                {{ t('按模板新建', 'Create from Preset') }}
              </button>
            </div>
          </div>
        </div>
        </div>

      </section>
    </div>

    <ChatAppTabBar :active="activeSection === 'service' ? 'services' : 'objects'" />

    <div
      v-if="showBindModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-center justify-center"
      @click.self="closeBindModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 shadow-2xl">
        <p class="text-base font-bold">{{ t('绑定角色到会话', 'Bind Profile to Chat') }}</p>
        <select v-model.number="bindProfileId" class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none bg-white">
          <option v-for="profile in unboundRoleProfilesRaw" :key="profile.id" :value="profile.id">
            {{ profile.name }} · {{ profile.role || t('未设置角色', 'Role not set') }}
          </option>
        </select>
        <div class="flex justify-end gap-2">
          <button @click="closeBindModal" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">{{ t('取消', 'Cancel') }}</button>
          <button
            @click="bindSelectedProfile"
            class="px-3 py-1.5 rounded-lg border border-violet-300 bg-violet-50 text-violet-700 text-sm"
          >
            {{ t('确认绑定', 'Confirm Bind') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showRoleMetaModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-center justify-center"
      @click.self="closeRoleMetaModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 shadow-2xl">
        <p class="text-base font-bold">{{ t('会话绑定设置', 'Chat Binding Settings') }}</p>
        <label class="text-xs text-gray-500 block">
          {{ t('会话调校（0-100）', 'Chat-local tuning (0-100)') }}
        </label>
        <input
          v-model.number="roleMetaDraft.relationshipLevel"
          type="number"
          min="0"
          max="100"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
        />
        <p
          class="text-[11px] text-gray-400"
          data-testid="chat-directory-relationship-compatibility-help"
        >
          {{
            t(
              '这里只保存 Chat 绑定层注解，不是当前关系真相；真实当前关系由 relationship runtime 维护。',
              'This saves a Chat binding annotation only, not current relationship truth; current relationship is owned by relationship runtime.',
            )
          }}
        </p>
        <label class="text-xs text-gray-500 block">
          {{ t('会话备注（仅 Chat 本地）', 'Chat note (chat local only)') }}
        </label>
        <textarea
          v-model="roleMetaDraft.relationshipNote"
          rows="3"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none outline-none"
          :placeholder="t('例如：这里仅记录 Chat 回复偏好，不写入关系进度。', 'Example: record Chat reply preference here; it does not write relationship progress.')"
        ></textarea>
        <label class="text-xs text-gray-500 block">
          {{ t('会话优先图片素材（可选）', 'Thread preferred image asset (optional)') }}
        </label>
        <select
          v-model="roleMetaDraft.preferredImageAssetId"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none bg-white"
        >
          <option value="">{{ t('不覆盖（使用档案绑定默认）', 'No override (use profile-bound default)') }}</option>
          <option
            v-for="asset in roleMetaAssetOptions"
            :key="`role-meta-asset-${asset.id}`"
            :value="asset.id"
          >
            {{ asset.label }}
          </option>
        </select>
        <p class="text-[11px] text-gray-400">
          {{
            roleMetaAssetOptions.length > 0
              ? roleMetaAssetContextLabel
              : t('该角色档案未绑定素材包，请先在主通讯录中绑定。', 'No profile asset pack yet. Bind assets in main Contacts first.')
          }}
        </p>
        <div v-if="roleMetaPreviewLeadOption" class="space-y-2">
          <div class="rounded-2xl border border-violet-100 bg-violet-50/40 p-3 flex items-center gap-3">
            <AssetThumbnailOption
              :asset="roleMetaPreviewLeadOption"
              :preview-url="rolePreviewMap[roleMetaPreviewLeadOption.id]"
              variant="rail"
              selection-tone="violet"
              :interactive="false"
              :show-name="false"
            />
            <div class="min-w-0">
              <p class="text-xs font-semibold text-violet-800 truncate">{{ roleMetaPreviewTitle }}</p>
              <p class="text-[11px] text-violet-700 truncate">{{ roleMetaPreviewLeadOption.label }}</p>
              <p class="text-[11px] text-gray-500 mt-1">{{ roleMetaPreviewDescription }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              @click="roleMetaDraft.preferredImageAssetId = ''"
              class="shrink-0 rounded-xl border px-2.5 py-2 text-[11px]"
              :class="
                roleMetaSelectedAssetOption
                  ? 'border-gray-200 bg-white text-gray-600'
                  : 'border-violet-300 bg-violet-50 text-violet-700'
              "
            >
              {{ t('跟随档案默认', 'Use profile default') }}
            </button>

            <AssetThumbnailOption
              v-for="asset in roleMetaQuickPreviewOptions"
              :key="`role-meta-preview-chip-${asset.id}`"
              :asset="asset"
              :preview-url="rolePreviewMap[asset.id]"
              :selected="roleMetaDraft.preferredImageAssetId === asset.id"
              variant="compact"
              selection-tone="violet"
              @select="roleMetaDraft.preferredImageAssetId = asset.id"
            >
            </AssetThumbnailOption>
          </div>
        </div>
        <div class="space-y-1">
          <p class="text-xs text-gray-500">{{ t('快捷关系模板', 'Quick Relationship Templates') }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in roleMetaTemplatePresets"
              :key="`modal-role-template-${preset.id}`"
              @click="applyRoleTemplateToDraft(preset.id)"
              class="px-2.5 py-1 rounded border border-violet-200 bg-violet-50 text-violet-700 text-[11px]"
            >
              {{ roleTemplateLabel(preset) }}
            </button>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button @click="closeRoleMetaModal" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">{{ t('取消', 'Cancel') }}</button>
          <button
            @click="saveRoleMeta"
            class="px-3 py-1.5 rounded-lg border border-violet-300 bg-violet-50 text-violet-700 text-sm"
          >
            {{ t('保存', 'Save') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showWorldServiceTemplateModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-center justify-center"
      data-testid="chat-directory-world-service-template-modal"
      @click.self="closeWorldServiceTemplateModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 shadow-2xl">
        <div>
          <p class="text-base font-bold">{{ t('编辑世界观服务号模板', 'Edit world service template') }}</p>
          <p class="mt-1 text-[11px] leading-relaxed text-gray-500">
            {{
              t(
                '这里修改的是可订阅模板，不会自动覆盖已加入的 Chat 服务号。',
                'This edits the subscription template and will not automatically overwrite joined Chat accounts.',
              )
            }}
          </p>
        </div>
        <input
          v-model="worldServiceTemplateDraft.title"
          type="text"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
          data-testid="chat-directory-world-service-template-title"
          :placeholder="t('服务号名称', 'Service account name')"
        />
        <select
          v-model="worldServiceTemplateDraft.category"
          class="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
          data-testid="chat-directory-world-service-template-category"
        >
          <option value="service_notification">{{ t('服务号 / 通知', 'Service / notifications') }}</option>
          <option value="publication">{{ t('公众号 / 公开频道', 'Official / publication') }}</option>
          <option value="subscription">{{ t('公众号 / 会员频道', 'Official / subscription') }}</option>
        </select>
        <select
          v-model="worldServiceTemplateDraft.linkedAppBindingId"
          class="w-full rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-2 text-sm text-indigo-800 outline-none"
          data-testid="chat-directory-world-service-template-linked-app"
        >
          <option value="">{{ t('不绑定世界专属 App', 'No world app binding') }}</option>
          <option
            v-for="binding in activeWorldPackAppBindingOptions"
            :key="`world-service-template-binding-${binding.id}`"
            :value="binding.id"
          >
            {{ binding.label }}
          </option>
        </select>
        <textarea
          v-model="worldServiceTemplateDraft.description"
          rows="3"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none outline-none"
          data-testid="chat-directory-world-service-template-description"
          :placeholder="t('说明这个服务号会发布什么内容', 'Describe what this account will publish')"
        ></textarea>
        <div class="flex justify-end gap-2">
          <button
            @click="closeWorldServiceTemplateModal"
            class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
          >
            {{ t('取消', 'Cancel') }}
          </button>
          <button
            @click="saveWorldServiceTemplate"
            class="px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-sm"
            data-testid="chat-directory-save-world-service-template"
          >
            {{ t('保存模板', 'Save template') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showServiceModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-center justify-center"
      @click.self="closeServiceModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-4 space-y-3 shadow-2xl">
        <p class="text-base font-bold">
          {{
            serviceModalMode === 'create'
              ? serviceDraft.kind === 'official'
                ? t('新增公众号', 'Add Official')
                : t('新增服务号', 'Add Service')
              : t('编辑服务对象', 'Edit Service Entry')
          }}
        </p>
        <input
          v-model="serviceDraft.name"
          type="text"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
          data-testid="chat-directory-service-name"
          :placeholder="t('名称', 'Name')"
        />
        <select
          v-model="serviceDraft.kind"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none bg-white"
          :disabled="serviceModalMode === 'edit'"
        >
          <option value="service">{{ t('服务号', 'Service') }}</option>
          <option value="official">{{ t('公众号', 'Official') }}</option>
        </select>
        <input
          v-model="serviceDraft.template"
          type="text"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
          :placeholder="t('服务模板标题', 'Service template title')"
        />
        <select
          v-model="serviceDraft.shoppingServiceKey"
          class="w-full rounded-xl border border-amber-100 bg-amber-50/40 px-3 py-2 text-sm text-amber-800 outline-none"
          data-testid="chat-directory-service-shopping-service"
        >
          <option value="">{{ t('不绑定 Shopping 店铺', 'No Shopping shop binding') }}</option>
          <option
            v-for="preset in shoppingServicePresetOptions"
            :key="`service-shopping-option-${preset.key}`"
            :value="preset.key"
          >
            {{ preset.label }}
          </option>
        </select>
        <select
          v-model="serviceDraft.logisticsServiceKey"
          class="w-full rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2 text-sm text-sky-800 outline-none"
          data-testid="chat-directory-service-logistics-service"
        >
          <option value="">{{ t('不绑定物流服务号', 'No Logistics binding') }}</option>
          <option
            v-for="preset in logisticsServicePresetOptions"
            :key="`service-logistics-option-${preset.key}`"
            :value="preset.key"
          >
            {{ preset.label }}
          </option>
        </select>
        <select
          v-model="serviceDraft.foodDeliveryServiceKey"
          class="w-full rounded-xl border border-orange-100 bg-orange-50/40 px-3 py-2 text-sm text-orange-800 outline-none"
          data-testid="chat-directory-service-food-delivery-service"
        >
          <option value="">{{ t('不绑定外卖服务号', 'No Food Delivery binding') }}</option>
          <option
            v-for="preset in foodDeliveryServicePresetOptions"
            :key="`service-food-delivery-option-${preset.key}`"
            :value="preset.key"
          >
            {{ preset.label }}
          </option>
        </select>
        <div class="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-2">
          <p class="text-xs font-semibold text-emerald-700">{{ t('头像来源', 'Avatar source') }}</p>
          <ImageSourcePicker
            v-model:source-type="serviceDraft.avatarImageSourceType"
            v-model:image-url="serviceDraft.avatarImageUrl"
            v-model:gallery-asset-id="serviceDraft.avatarImageGalleryAssetId"
            :gallery-assets="serviceAvatarGalleryOptions"
            :source-options="[
              { value: 'none', labelZh: '默认头像', labelEn: 'Default avatar' },
              { value: 'url', labelZh: 'URL 头像', labelEn: 'URL avatar' },
              { value: 'gallery', labelZh: 'Gallery 素材', labelEn: 'Gallery asset' },
            ]"
            size="xs"
            test-id-prefix="chat-directory-service-avatar"
          />
        </div>
        <textarea
          v-model="serviceDraft.bio"
          rows="3"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none outline-none"
          :placeholder="t('服务说明（可选）', 'Description (optional)')"
        ></textarea>
        <div class="flex justify-end gap-2">
          <button @click="closeServiceModal" class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">{{ t('取消', 'Cancel') }}</button>
          <button
            @click="saveService"
            class="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 text-sm"
            data-testid="chat-directory-save-service"
          >
            {{ t('保存', 'Save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
