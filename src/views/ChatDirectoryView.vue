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
import { buildWorldServiceTemplateGenerationRowsForPacks } from '../lib/world-pack-service-accounts'
import { extractWorldServiceTemplateProposals } from '../lib/world-service-template-proposals'
import { formatApiErrorForUi } from '../lib/ai'
import { resolveWorldviewText } from '../lib/world-interface'
import { getChatAppearanceClasses } from '../lib/chat-appearance'
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
const chatShellClasses = computed(() => getChatAppearanceClasses(settings.value.appearance?.chat))

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
const roleActionMenuContactId = ref(0)
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
  packId: '',
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

const enabledWorldPacks = computed(() => {
  if (typeof systemStore.listEnabledWorldPacks === 'function') {
    const packs = systemStore.listEnabledWorldPacks()
    if (packs.length > 0) return packs
  }
  return activeWorldPack.value?.id ? [activeWorldPack.value] : []
})

const worldPackServiceTemplateRows = computed(() => {
  return buildWorldServiceTemplateGenerationRowsForPacks({
    packs: enabledWorldPacks.value,
    findExistingContact: (packId, templateId) =>
      chatStore.findWorldServiceTemplateContact(packId, templateId),
  }).filter((row) => row?.payload)
})

const worldPackServiceSummaryDisplayName = computed(() => {
  const packs = enabledWorldPacks.value
  if (packs.length > 1) {
    return `${packs.length} enabled world packs`
  }
  const pack = packs[0] || activeWorldPack.value || {}
  return t(pack.title || pack.name || 'Current world', pack.name || pack.title || 'Current world')
})

const hasWorldPackServiceTemplateRows = computed(() => worldPackServiceTemplateRows.value.length > 0)
const worldPackServiceJoinedCount = computed(() =>
  worldPackServiceTemplateRows.value.filter((row) => row.generated).length,
)
const worldPackServiceAvailableCount = computed(() =>
  worldPackServiceTemplateRows.value.filter((row) => !row.generated).length,
)

const activeWorldPackAppBindingOptions = computed(() => {
  const targetPackId = worldServiceTemplateDraft.packId || activeWorldPack.value?.id || ''
  const packs = targetPackId
    ? enabledWorldPacks.value.filter((pack) => pack?.id === targetPackId)
    : enabledWorldPacks.value

  return packs.flatMap((pack) => {
    const packLabel = t(pack?.title || pack?.name || pack?.id, pack?.name || pack?.title || pack?.id)
    return (Array.isArray(pack?.appBindings) ? pack.appBindings : [])
      .filter((binding) => binding?.id && binding.enabled !== false)
      .map((binding) => ({
        id: binding.id,
        packId: pack?.id || '',
        label: packs.length > 1 ? `${binding.title || binding.id} · ${packLabel}` : binding.title || binding.id,
      }))
  })
})

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
    ? t('\u641c\u7d22\u8054\u7cfb\u4eba\u6216\u5907\u6ce8', 'Search contacts or notes')
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

const serviceMutedContacts = computed(() =>
  serviceContacts.value.filter((contact) => chatStore.isChatSubscriptionMuted(contact)),
)

const serviceFoldedContacts = computed(() =>
  serviceContacts.value.filter((contact) => chatStore.isChatSubscriptionFolded(contact)),
)

const serviceMutedCount = computed(() => serviceMutedContacts.value.length)

const serviceFoldedCount = computed(() => serviceFoldedContacts.value.length)

const serviceFilterOptionCount = (key) => {
  if (key === 'all') return serviceContacts.value.length
  if (key === 'unread') return serviceUnreadContactCount.value
  if (key === 'muted') return serviceMutedCount.value
  if (key === 'folded') return serviceFoldedCount.value
  if (key === 'service') return serviceContacts.value.filter((contact) => contact.kind === 'service').length
  if (key === 'official') return serviceContacts.value.filter((contact) => contact.kind === 'official').length
  return 0
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

const shouldShowServiceManagement = computed(() => showServiceManagement.value)

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
  roleActionMenuContactId.value = 0
  if (!batchMode.value) clearSelection()
}

const toggleBatchMode = () => {
  setBatchMode(!batchMode.value)
}

const isRoleActionMenuOpen = (contactId) => roleActionMenuContactId.value === Number(contactId)

const toggleRoleActionMenu = (contactId) => {
  const normalizedId = Number(contactId)
  roleActionMenuContactId.value = roleActionMenuContactId.value === normalizedId ? 0 : normalizedId
}

const closeRoleActionMenu = () => {
  roleActionMenuContactId.value = 0
}

const runRoleMenuAction = (action) => {
  closeRoleActionMenu()
  action?.()
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
  closeRoleActionMenu()
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
  closeRoleActionMenu()
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
  closeRoleActionMenu()
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

const worldPackServicePackLabel = (row) =>
  t(
    row?.packTitle || row?.packName || row?.packId || 'World Pack',
    row?.packName || row?.packTitle || row?.packId || 'World Pack',
  )

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
    .map((point) => `- ${point.title || point.id}: ${String(point.content || '').trim()}`)

  return [
    `Active World Pack: ${pack.title || pack.name || pack.id || 'default_world'}`,
    bindingLines.length ? ['Existing world app bindings:', ...bindingLines].join('\n') : 'Existing world app bindings: none',
    templateLines.length ? ['Existing service templates:', ...templateLines].join('\n') : 'Existing service templates: none',
    worldview ? `World context:\n${worldview}` : 'World context: empty',
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
  worldServiceTemplateDraft.packId = row.packId || activeWorldPack.value?.id || ''
  worldServiceTemplateDraft.id = row.id
  worldServiceTemplateDraft.title = row.title || row.name || ''
  worldServiceTemplateDraft.category = row.category || 'service_notification'
  worldServiceTemplateDraft.description = row.description || ''
  worldServiceTemplateDraft.linkedAppBindingId = row.linkedAppBindingId || ''
  showWorldServiceTemplateModal.value = true
}

const resetWorldServiceTemplate = (row) => {
  if (!row?.id) return
  const result = systemStore.resetWorldServiceAccountTemplate(row.packId || activeWorldPack.value?.id, row.id)
  if (result?.ok) {
    showUiNotice('success', t('已恢复内置模板', 'Restored built-in template'))
  } else {
    showUiNotice('error', t('恢复失败，请稍后重试。', 'Reset failed, please try again.'))
  }
}

const closeWorldServiceTemplateModal = () => {
  showWorldServiceTemplateModal.value = false
  worldServiceTemplateDraft.packId = ''
  worldServiceTemplateDraft.id = ''
}

const saveWorldServiceTemplate = () => {
  const title = worldServiceTemplateDraft.title.trim()
  if (!title || !worldServiceTemplateDraft.id) {
    showUiNotice('warning', t('请填写服务号名称。', 'Please enter a service account name.'))
    return
  }

  const result = systemStore.updateWorldServiceAccountTemplate?.(
    worldServiceTemplateDraft.packId || activeWorldPack.value?.id || '',
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
  return t(`物流服务号 · ${preset.zh}`, `Logistics Service · ${preset.en}`)
}

const foodDeliveryServiceLabel = (serviceKey) => {
  const preset = findFoodDeliveryServicePreset(serviceKey || '')
  if (!preset?.key || preset.key !== serviceKey) return ''
  return t(`外卖服务号 · ${preset.zh}`, `Food Delivery Service · ${preset.en}`)
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
  <div
    class="w-full h-full flex flex-col chat-shell chat-directory-shell"
    :class="chatShellClasses"
    data-testid="chat-directory-page"
  >
    <div class="chat-home-header pt-12 px-4 pb-4 chat-ink">
      <div class="flex items-center justify-between gap-3">
        <button
          @click="goBack"
          class="chat-home-icon-button chat-ink"
          :aria-label="t('返回消息', 'Back to Messages')"
        >
          <i class="fas fa-chevron-left"></i>
        </button>
        <p class="flex-1 text-[1.45rem] font-extrabold leading-tight tracking-tight">
          {{ activeSection === 'roles' ? t('\u8054\u7cfb\u4eba', 'Contacts') : t('服务号', 'Services') }}
        </p>
        <div class="flex items-center gap-1">
          <button
            v-if="activeSection === 'roles'"
            type="button"
            class="chat-home-icon-button chat-ink"
            :aria-label="t('\u6dfb\u52a0\u8054\u7cfb\u4eba', 'Add contact')"
            @click="openBindModal"
          >
            <i class="fas fa-user-plus"></i>
          </button>
          <button
            v-else
            type="button"
            class="chat-home-icon-button chat-ink"
            :aria-label="t('管理订阅', 'Manage subscriptions')"
            data-testid="chat-directory-service-management-header"
            @click="toggleServiceManagement"
          >
            <i class="fas fa-gear"></i>
          </button>
        </div>
      </div>

      <div class="chat-home-search mt-3">
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
          class="text-[11px] text-gray-500"
        >
          {{ t('清空', 'Clear') }}
        </button>
      </div>
    </div>

    <div class="chat-home-sheet flex-1 overflow-y-auto no-scrollbar" ref="directoryScrollAreaRef">
      <p
        v-if="uiNoticeMessage"
        class="mx-4 mt-3 rounded-xl px-3 py-2 text-[11px]"
        data-testid="chat-directory-ui-notice"
        :class="uiNoticeType === 'error' ? 'bg-red-50 text-red-600' : uiNoticeType === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'"
      >
        {{ uiNoticeMessage }}
      </p>

      <p class="sr-only" data-testid="chat-directory-boundary-copy">
        {{
          t(
            '\u8054\u7cfb\u4eba\u9875\u7ba1\u7406\u5df2\u8fdb\u5165 Chat \u7684\u8054\u7cfb\u4eba\u4e0e\u804a\u5929\u504f\u597d\u3002\u89d2\u8272\u6863\u6848\u6765\u81ea\u4e3b\u901a\u8baf\u5f55\uff0c\u4e5f\u53ef\u4ece\u4e3b\u901a\u8baf\u5f55\u76f4\u63a5\u5f00\u59cb\u804a\u5929\uff1b\u89e3\u7ed1\u548c\u670d\u52a1\u53f7\u7ba1\u7406\u4ecd\u5728\u8fd9\u91cc\u5b8c\u6210\u3002',
            'Contacts manages people already in Chat and their Chat-only preferences. Role profiles come from main Contacts and can start Chat there; unbinding and service-account management stay here.',
          )
        }}
      </p>

      <div class="chat-directory-tabs mx-4 mt-3">
        <button
          @click="switchSection('roles')"
          class="chat-directory-tab"
          :class="{ 'is-active': activeSection === 'roles' }"
          data-testid="chat-directory-section-roles"
        >
          {{ t('\u8054\u7cfb\u4eba', 'Contacts') }}
        </button>
        <button
          @click="switchSection('service')"
          class="chat-directory-tab"
          :class="{ 'is-active': activeSection === 'service' }"
          data-testid="chat-directory-section-service"
        >
          {{ t('订阅', 'Services') }}
        </button>
      </div>

      <div class="chat-directory-filter-rail mx-4 mt-2">
        <button
          v-for="option in activeSection === 'roles' ? roleFilterOptions : serviceFilterOptions"
          :key="`${activeSection}-${option.key}`"
          @click="setDirectoryFilter(option.key)"
          class="chat-directory-filter-chip"
          :class="{ 'is-active': (activeSection === 'roles' ? roleFilter : serviceFilter) === option.key }"
        >
          {{ option.label }}
          <span
            v-if="activeSection === 'service'"
            class="chat-directory-filter-count"
            :data-testid="`chat-directory-service-filter-chip-meta-${option.key}`"
          >
            {{ serviceFilterOptionCount(option.key) }}
          </span>
        </button>
      </div>
      <section v-if="activeSection === 'roles'" class="space-y-3">
        <div class="chat-directory-stats mx-4 mt-3" data-testid="chat-directory-social-summary">
          <button
            type="button"
            class="chat-directory-stat"
            @click="roleFilter = 'connected'"
          >
            <span class="chat-directory-stat__label">{{ t('正常聊天', 'Chatting') }}</span>
            <span class="chat-directory-stat__value">{{ roleConnectedCount }}</span>
          </button>
          <button
            type="button"
            class="chat-directory-stat"
            data-testid="chat-directory-requests-summary"
            @click="roleFilter = 'requests'"
          >
            <span class="chat-directory-stat__label">{{ t('消息请求', 'Requests') }}</span>
            <span class="chat-directory-stat__value">{{ roleRequestCount }}</span>
          </button>
          <button
            type="button"
            class="chat-directory-stat"
            @click="roleFilter = 'blocked'"
          >
            <span class="chat-directory-stat__label">{{ t('已屏蔽', 'Blocked') }}</span>
            <span class="chat-directory-stat__value">{{ roleBlockedCount }}</span>
          </button>
        </div>

        <div class="flex items-center justify-between px-4">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wide">{{ t('\u8054\u7cfb\u4eba', 'Contacts') }}</h3>
          <button
            v-if="!batchMode"
            @click="toggleBatchMode"
            class="text-xs font-semibold text-gray-500"
          >
            {{ t('\u7ba1\u7406', 'Manage') }}
          </button>
          <button
            v-else
            @click="toggleBatchMode"
            class="text-xs font-semibold text-gray-900"
          >
            {{ t('完成', 'Done') }}
          </button>
        </div>

        <div v-if="batchMode" class="chat-directory-batch-bar mx-4">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-semibold text-gray-700">
              {{ t('已选', 'Selected') }} {{ selectedRoleCount }} {{ t('项', 'items') }}
            </p>
            <div class="flex items-center gap-1.5">
              <button
                @click="toggleSelectAllFiltered"
                class="chat-directory-batch-action"
              >
                {{ allFilteredSelected ? t('取消全选', 'Unselect All') : t('全选', 'Select All') }}
              </button>
              <button
                @click="clearSelection"
                class="chat-directory-batch-action"
                :disabled="selectedCountCurrentSection === 0"
              >
                {{ t('清空', 'Clear') }}
              </button>
              <button
                @click="batchUnbindSelectedRoles"
                class="chat-directory-batch-action chat-directory-batch-action--danger"
                :disabled="selectedRoleCount === 0"
              >
                {{ t('解绑', 'Unbind') }}
              </button>
            </div>
          </div>
          <div class="flex items-center gap-1.5 mt-2">
            <select
              v-model="selectedRoleTemplateId"
              class="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 outline-none"
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
              class="chat-directory-batch-action"
              :disabled="selectedRoleCount === 0"
            >
              {{ t('套用', 'Apply') }}
            </button>
          </div>
        </div>

        <p v-if="roleBindings.length === 0" class="chat-directory-empty">
          {{ t('\u8fd8\u6ca1\u6709\u804a\u5929\u8054\u7cfb\u4eba\u3002', 'No contacts in Chat yet.') }}
        </p>
        <p v-else-if="filteredRoleBindings.length === 0" class="chat-directory-empty">
          {{ t('\u5f53\u524d\u7b5b\u9009\u4e0b\u6ca1\u6709\u5339\u914d\u8054\u7cfb\u4eba\u3002', 'No contacts match this filter.') }}
        </p>

        <div
          v-for="contact in filteredRoleBindings"
          :key="contact.id"
          class="chat-list-row chat-contact-row"
          :class="{ 'is-selected': batchMode && isContactSelected(contact.id) }"
          @click="batchMode && toggleSelectContact(contact.id)"
        >
          <button
            v-if="batchMode"
            type="button"
            class="chat-directory-checkbox"
            :class="{ 'is-checked': isContactSelected(contact.id) }"
            @click.stop="toggleSelectContact(contact.id)"
          >
            <i class="fas fa-check"></i>
          </button>
          <button
            type="button"
            class="chat-contact-row__identity"
            :aria-label="batchMode ? t('\u9009\u62e9\u8054\u7cfb\u4eba', 'Select contact') : t('\u6253\u5f00\u804a\u5929', 'Open chat')"
            @click.stop="batchMode ? toggleSelectContact(contact.id) : openChat(contact)"
          >
            <div class="chat-list-avatar">
              <img
                :src="contactAvatarForDisplay(contact)"
                class="w-full h-full object-cover"
                :data-testid="`chat-directory-contact-avatar-${contact.id}`"
              />
            </div>
            <div class="chat-list-content">
              <div class="flex justify-between items-center gap-2">
                <span class="font-bold text-sm truncate">{{ contact.name }}</span>
                <span
                  class="chat-list-tag"
                  :class="chatSocialStateBadgeClass(contact)"
                  :data-testid="`chat-directory-social-state-${contact.id}`"
                >
                  {{ chatSocialStateLabel(contact) }}
                </span>
              </div>
              <p class="text-xs text-gray-500 truncate mt-0.5">
                {{ contact.role || t('未设置角色', 'Role not set') }}
              </p>
              <p v-if="contact.relationshipNote" class="text-[11px] text-gray-400 truncate">
                {{ contact.relationshipNote }}
              </p>
            </div>
          </button>
          <div v-if="!batchMode" class="chat-contact-row__actions">
            <button
              v-if="
                chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.STRANGER ||
                chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED
              "
              type="button"
              class="chat-contact-row__primary"
              :data-testid="`chat-directory-greet-${contact.id}`"
              @click.stop="greetRoleContact(contact)"
            >
              {{ t('打招呼', 'Greet') }}
            </button>
            <button
              v-else-if="chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST"
              type="button"
              class="chat-contact-row__primary"
              :data-testid="`chat-directory-accept-request-${contact.id}`"
              @click.stop="acceptRoleRequest(contact)"
            >
              {{ t('通过', 'Accept') }}
            </button>
            <button
              v-else-if="
                chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED ||
                chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
              "
              type="button"
              class="chat-contact-row__primary"
              :data-testid="`chat-directory-unblock-${contact.id}`"
              @click.stop="unblockRoleContact(contact)"
            >
              {{ t('解除', 'Unblock') }}
            </button>
            <div class="chat-contact-menu-anchor" @click.stop>
              <button
                type="button"
                class="chat-contact-menu-trigger"
                :aria-label="t('\u66f4\u591a\u8054\u7cfb\u4eba\u64cd\u4f5c', 'More contact actions')"
                :aria-expanded="isRoleActionMenuOpen(contact.id)"
                aria-haspopup="menu"
                :data-testid="`chat-directory-role-more-${contact.id}`"
                @click="toggleRoleActionMenu(contact.id)"
              >
                <i class="fas fa-ellipsis"></i>
              </button>
              <div
                v-if="isRoleActionMenuOpen(contact.id)"
                class="chat-contact-menu"
                role="menu"
                :data-testid="`chat-directory-role-menu-${contact.id}`"
              >
                <button
                  v-if="chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST"
                  type="button"
                  class="chat-contact-menu__item"
                  role="menuitem"
                  :data-testid="`chat-directory-decline-request-${contact.id}`"
                  @click="runRoleMenuAction(() => declineRoleRequest(contact))"
                >
                  <i class="fas fa-xmark"></i>
                  <span>{{ t('忽略请求', 'Ignore request') }}</span>
                </button>
                <button
                  v-if="chatStore.getContactChatSocialState(contact) === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST"
                  type="button"
                  class="chat-contact-menu__item"
                  role="menuitem"
                  @click="runRoleMenuAction(() => cancelRoleGreeting(contact))"
                >
                  <i class="fas fa-rotate-left"></i>
                  <span>{{ t('撤回请求', 'Cancel request') }}</span>
                </button>
                <button
                  v-if="
                    chatStore.getContactChatSocialState(contact) !== CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED &&
                    chatStore.getContactChatSocialState(contact) !== CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
                  "
                  type="button"
                  class="chat-contact-menu__item chat-contact-menu__item--danger"
                  role="menuitem"
                  :data-testid="`chat-directory-block-${contact.id}`"
                  @click="runRoleMenuAction(() => blockRoleContact(contact))"
                >
                  <i class="fas fa-ban"></i>
                  <span>{{ t('拉黑联系人', 'Block contact') }}</span>
                </button>
                <button
                  type="button"
                  class="chat-contact-menu__item"
                  role="menuitem"
                  :data-testid="`chat-directory-role-meta-${contact.id}`"
                  @click="runRoleMenuAction(() => openRoleMetaModal(contact))"
                >
                  <i class="fas fa-sliders"></i>
                  <span>{{ t('聊天偏好', 'Chat preferences') }}</span>
                </button>
                <div class="chat-contact-menu__divider"></div>
                <button
                  type="button"
                  class="chat-contact-menu__item chat-contact-menu__item--danger"
                  role="menuitem"
                  :data-testid="`chat-directory-unbind-${contact.id}`"
                  @click="runRoleMenuAction(() => unbindRole(contact))"
                >
                  <i class="fas fa-user-minus"></i>
                  <span>{{ t('解除聊天绑定', 'Remove from Chat') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="unboundRoleProfilesRaw.length > 0" class="mx-4 mt-4">
          <button
            v-if="!batchMode"
            type="button"
            class="chat-directory-add-contact"
            @click="openBindModal"
          >
            <span class="chat-directory-add-contact__icon"><i class="fas fa-user-plus"></i></span>
            <span class="min-w-0 flex-1 text-left">
              <span class="block text-sm font-bold text-gray-900">{{ t('添加联系人', 'Add contact') }}</span>
              <span class="mt-0.5 block text-[11px] text-gray-500 truncate">
                {{ t('从主通讯录选择角色开始聊天', 'Choose a role from Contacts to start chatting') }}
              </span>
            </span>
            <i class="fas fa-chevron-right text-[11px] text-gray-400"></i>
          </button>
          <template v-else>
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-xs font-semibold text-gray-600">{{ t('可添加联系人', 'Available contacts') }}</p>
              <button
                @click="batchBindFilteredProfiles"
                class="text-xs font-semibold text-violet-600"
              >
                {{ t('批量添加', 'Add all') }}
              </button>
            </div>
            <p v-if="filteredUnboundRoleProfiles.length === 0" class="text-xs text-gray-400">
              {{ t('当前筛选下没有可添加联系人。', 'No contacts are available in this filter.') }}
            </p>
            <div v-else class="space-y-1.5">
              <div
                v-for="profile in filteredUnboundRoleProfiles"
                :key="profile.id"
                class="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="text-sm font-medium truncate">{{ profile.name }}</p>
                  <p class="text-[11px] text-gray-500 truncate">{{ roleTypeTag(profile) }} · {{ profile.role || t('未设置角色', 'Role not set') }}</p>
                </div>
                <button
                  @click="bindProfileId = profile.id; bindSelectedProfile()"
                  class="rounded-full bg-yellow-300 px-3 py-1 text-xs font-semibold text-gray-950"
                >
                  {{ t('添加', 'Add') }}
                </button>
              </div>
            </div>
          </template>
        </div>
      </section>

      <section v-if="activeSection === 'service'" class="space-y-3">
        <div v-if="serviceContacts.length > 0" class="flex items-center justify-between">
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

        <div
          v-if="serviceContacts.length > 0"
          class="chat-directory-stats mx-4 mt-3"
          data-testid="chat-directory-subscription-summary"
        >
          <button
            type="button"
            class="chat-directory-stat"
            data-testid="chat-directory-service-summary-unread"
            :aria-pressed="serviceFilter === 'unread'"
            :data-state="serviceFilter === 'unread' ? 'selected' : 'idle'"
            @click="setDirectoryFilter('unread')"
          >
            <span class="chat-directory-stat__label">{{ t('未读订阅', 'Unread') }}</span>
            <span class="chat-directory-stat__value">{{ serviceUnreadTotal }}</span>
            <span class="chat-directory-stat__meta">{{ serviceUnreadContactCount }} {{ t('个账号', 'accounts') }}</span>
          </button>
          <button
            type="button"
            class="chat-directory-stat"
            data-testid="chat-directory-service-summary-muted"
            :aria-pressed="serviceFilter === 'muted'"
            :data-state="serviceFilter === 'muted' ? 'selected' : 'idle'"
            @click="setDirectoryFilter('muted')"
          >
            <span class="chat-directory-stat__label">{{ t('免打扰', 'Muted') }}</span>
            <span class="chat-directory-stat__value">{{ serviceMutedCount }}</span>
            <span class="chat-directory-stat__meta">{{ t('静默', 'quiet') }}</span>
          </button>
          <button
            type="button"
            class="chat-directory-stat"
            data-testid="chat-directory-service-summary-folded"
            :aria-pressed="serviceFilter === 'folded'"
            :data-state="serviceFilter === 'folded' ? 'selected' : 'idle'"
            @click="setDirectoryFilter('folded')"
          >
            <span class="chat-directory-stat__label">{{ t('已折叠', 'Folded') }}</span>
            <span class="chat-directory-stat__value">{{ serviceFoldedCount }}</span>
            <span class="chat-directory-stat__meta">{{ t('不显示', 'hidden') }}</span>
          </button>
        </div>

        <span
          class="sr-only"
          data-testid="chat-directory-service-muted-unread-summary"
        >
          {{
            t(
              `${serviceMutedContacts.reduce((sum, c) => sum + Math.max(0, Number(chatStore.getConversationByContactId(c.id)?.unread) || 0), 0)} 条未读`,
              `${serviceMutedContacts.reduce((sum, c) => sum + Math.max(0, Number(chatStore.getConversationByContactId(c.id)?.unread) || 0), 0)} unread`,
            )
          }}
        </span>
        <span
          class="sr-only"
          data-testid="chat-directory-service-folded-unread-summary"
        >
          {{
            t(
              `${serviceFoldedContacts.reduce((sum, c) => sum + Math.max(0, Number(chatStore.getConversationByContactId(c.id)?.unread) || 0), 0)} 条未读`,
              `${serviceFoldedContacts.reduce((sum, c) => sum + Math.max(0, Number(chatStore.getConversationByContactId(c.id)?.unread) || 0), 0)} unread`,
            )
          }}
        </span>

        <div
          v-if="serviceContacts.length > 0 && serviceFilterContext"
          class="chat-directory-context-bar mx-4 mt-3"
          data-testid="chat-directory-service-filter-context"
        >
          <span class="chat-directory-context-bar__icon">
            <i :class="serviceFilterContext.icon"></i>
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-gray-900" data-testid="chat-directory-service-filter-context-title">
              {{ serviceFilterContext.title }}
            </p>
            <p class="text-[11px] text-gray-500 truncate" data-testid="chat-directory-service-filter-context-body">
              {{ serviceFilterContext.body }}
            </p>
          </div>
          <button
            v-if="serviceFilterContext.actionLabel"
            type="button"
            class="shrink-0 text-xs font-semibold text-gray-600"
            data-testid="chat-directory-service-filter-context-action"
            @click="runServiceInboxAction(serviceFilterContext)"
          >
            {{ serviceFilterContext.actionLabel }}
          </button>
        </div>

        <div
          v-if="selectedServiceReturnPanel"
          class="chat-directory-context-bar mx-4 mt-2"
          :class="selectedServiceReturnPanelClass"
          data-testid="chat-directory-service-return-panel"
          :data-visible="selectedServiceReturnVisible ? 'true' : 'false'"
          :data-return-tone="selectedServiceReturnPanel.tone"
        >
          <span class="chat-directory-context-bar__icon">
            <i :class="selectedServiceReturnVisible ? 'fas fa-location-dot' : 'fas fa-inbox'"></i>
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold" data-testid="chat-directory-service-return-title">
              {{ selectedServiceReturnPanel.title }}
            </p>
            <p class="text-[11px] text-gray-500 truncate" data-testid="chat-directory-service-return-body">
              {{ selectedServiceReturnPanel.body }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              class="text-xs font-semibold text-gray-600"
              data-testid="chat-directory-service-return-primary"
              @click="runSelectedServiceReturnPrimary"
            >
              {{ selectedServiceReturnPanel.primaryLabel }}
            </button>
            <button
              type="button"
              class="chat-row-icon-action"
              data-testid="chat-directory-service-return-dismiss"
              @click="clearSelectedServiceReturn"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>

        <div
          v-if="serviceContacts.length === 0 || filteredServiceContacts.length === 0"
          class="chat-home-empty"
          data-testid="chat-directory-service-empty-state"
        >
          <span class="chat-home-empty__icon">
            <i :class="serviceEmptyState.icon"></i>
          </span>
          <span class="chat-home-empty__title" data-testid="chat-directory-service-empty-title">
            {{ serviceEmptyState.title }}
          </span>
          <span class="chat-home-empty__detail" data-testid="chat-directory-service-empty-body">
            {{ serviceEmptyState.body }}
          </span>
          <button
            v-if="serviceEmptyState.actionLabel"
            type="button"
            class="chat-home-empty__action"
            data-testid="chat-directory-service-empty-action"
            @click="runServiceInboxAction(serviceEmptyState)"
          >
            {{ serviceEmptyState.actionLabel }}
          </button>
        </div>

        <div
          v-for="section in serviceFeedSections"
          :key="section.key"
          class="space-y-0"
          :data-testid="`chat-directory-service-section-${section.key}`"
        >
          <div class="flex items-center justify-between px-4 py-2">
            <div class="flex min-w-0 items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full" :class="section.dotClass"></span>
              <p class="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {{ section.title }}
              </p>
            </div>
            <p class="shrink-0 text-[10px] text-gray-400">{{ section.meta }}</p>
          </div>

          <div
            v-for="contact in section.contacts"
            :key="contact.id"
            class="chat-list-row"
            :class="[
              batchMode && isContactSelected(contact.id) ? 'is-selected' : '',
              isSelectedServiceReturnContact(contact) ? 'is-highlighted' : '',
            ]"
            :data-testid="`chat-directory-service-feed-${contact.id}`"
            :data-selected="isSelectedServiceReturnContact(contact) ? 'true' : 'false'"
            :data-service-contact-id="contact.id"
            @click="batchMode ? toggleSelectContact(contact.id) : openChat(contact)"
          >
            <button
              v-if="batchMode"
              type="button"
              class="chat-directory-checkbox"
              :class="{ 'is-checked': isContactSelected(contact.id) }"
              @click.stop="toggleSelectContact(contact.id)"
            >
              <i class="fas fa-check"></i>
            </button>
            <div class="chat-list-avatar chat-list-avatar--service" :class="contact.kind === 'official' ? 'chat-list-avatar--official' : ''">
              <img
                v-if="explicitContactAvatarForDisplay(contact)"
                :src="explicitContactAvatarForDisplay(contact)"
                class="w-full h-full object-cover"
                :data-testid="`chat-directory-service-avatar-${contact.id}`"
              />
              <i v-else :class="contact.kind === 'official' ? 'fas fa-newspaper' : 'fas fa-concierge-bell'"></i>
            </div>
            <div class="chat-list-content">
              <div class="flex justify-between items-center gap-2">
                <span class="font-bold text-sm truncate">{{ contact.name }}</span>
                <div class="flex items-center gap-1 shrink-0">
                  <span
                    v-for="tag in serviceSubscriptionStatusTags(contact)"
                    :key="tag.key"
                    class="chat-list-tag"
                    :class="tag.className"
                    :data-testid="`chat-directory-service-${tag.key}-tag-${contact.id}`"
                  >
                    {{ tag.label }}
                  </span>
                  <span
                    v-if="isSelectedServiceReturnContact(contact)"
                    class="chat-list-tag bg-blue-50 text-blue-600"
                    :data-testid="`chat-directory-service-selected-tag-${contact.id}`"
                  >
                    {{ t('最近打开', 'Recently opened') }}
                  </span>
                  <span class="text-[10px] text-gray-400">
                    {{ formatServiceConversationTime(serviceDisplayMessageAt(contact)) }}
                  </span>
                </div>
              </div>
              <p class="text-xs text-gray-500 truncate mt-0.5">
                {{ serviceKindTag(contact) }} · {{ contact.serviceTemplate || t('未设置服务模板', 'Service template not set') }}
                <span
                  class="text-[10px]"
                  :data-testid="`chat-directory-service-delivery-state-${contact.id}`"
                >
                  {{ serviceDeliveryState(contact).label }}
                </span>
              </p>
              <p class="text-[11px] text-gray-400 truncate mt-0.5">
                {{ serviceConversationPreviewText(contact) }}
              </p>
              <div class="flex flex-wrap items-center gap-1 mt-0.5">
                <span
                  v-if="contact.shoppingServiceKey"
                  class="chat-list-tag bg-amber-50 text-amber-600"
                  :data-testid="`chat-directory-shopping-service-${contact.id}`"
                >
                  {{ shoppingServiceLabel(contact.shoppingServiceKey) }}
                </span>
                <span
                  v-if="contact.logisticsServiceKey"
                  class="chat-list-tag bg-sky-50 text-sky-600"
                  :data-testid="`chat-directory-logistics-service-${contact.id}`"
                >
                  {{ logisticsServiceLabel(contact.logisticsServiceKey) }}
                </span>
                <span
                  v-if="contact.foodDeliveryServiceKey"
                  class="chat-list-tag bg-orange-50 text-orange-600"
                  :data-testid="`chat-directory-food-delivery-service-${contact.id}`"
                >
                  {{ foodDeliveryServiceLabel(contact.foodDeliveryServiceKey) }}
                </span>
                <span
                  class="sr-only"
                  :data-testid="`chat-directory-service-source-plan-${contact.id}`"
                  :data-source-plan-status="(chatStore.getServiceAccountLinkContract(contact.id)?.sourceNotificationPlan)?.status || 'not_connected'"
                >
                  {{ sourceNotificationPlanSummary(chatStore.getServiceAccountLinkContract(contact.id)?.sourceNotificationPlan) }}
                </span>
                <span
                  v-if="serviceUnreadCount(contact) > 0"
                  class="sr-only"
                  :data-testid="`chat-directory-service-unread-summary-${contact.id}`"
                >
                  {{
                    t(
                      `${serviceUnreadCount(contact)} 条未读更新`,
                      `${serviceUnreadCount(contact)} unread updates`,
                    )
                  }}
                </span>
              </div>
            </div>
            <div class="chat-list-side">
              <span
                v-if="serviceUnreadCount(contact) > 0"
                class="chat-list-unread"
              >
                {{ Math.min(serviceUnreadCount(contact), 99) }}
              </span>
              <button
                v-if="!batchMode"
                @click.stop="markServiceRead(contact)"
                class="chat-row-icon-action"
                :data-testid="`chat-directory-service-mark-read-${contact.id}`"
                :aria-label="t('已读', 'Mark Read')"
              >
                <i class="fas fa-check-double"></i>
              </button>
              <button
                v-if="!batchMode"
                @click.stop="toggleServiceFolded(contact)"
                class="chat-row-icon-action"
                :data-testid="`chat-directory-service-toggle-folded-${contact.id}`"
                :aria-label="chatStore.isChatSubscriptionFolded(contact) ? t('展开', 'Unfold') : t('折叠', 'Fold')"
              >
                <i :class="chatStore.isChatSubscriptionFolded(contact) ? 'fas fa-chevron-down' : 'fas fa-chevron-up'"></i>
              </button>
              <button
                v-if="!batchMode"
                @click.stop="toggleServiceMuted(contact)"
                class="chat-row-icon-action"
                :data-testid="`chat-directory-service-toggle-muted-${contact.id}`"
                :aria-label="chatStore.isChatSubscriptionMuted(contact) ? t('取消免打扰', 'Unmute') : t('免打扰', 'Mute')"
              >
                <i :class="chatStore.isChatSubscriptionMuted(contact) ? 'fas fa-bell' : 'fas fa-bell-slash'"></i>
              </button>
              <button
                v-if="!batchMode"
                @click.stop="openEditService(contact)"
                class="chat-row-icon-action"
                :aria-label="t('编辑', 'Edit')"
              >
                <i class="fas fa-gear"></i>
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="shouldShowServiceManagement"
          class="mx-4 mt-3 rounded-2xl bg-gray-50 p-3 space-y-3"
          data-testid="chat-directory-service-management"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-semibold text-gray-700">{{ t('订阅源管理', 'Subscription source management') }}</p>
            <div class="flex items-center gap-1.5">
              <button
                @click="openCreateService('service')"
                class="chat-directory-batch-action"
                data-testid="chat-directory-add-service"
              >
                {{ t('新增服务号', 'Add Service') }}
              </button>
              <button @click="openCreateService('official')" class="chat-directory-batch-action">
                {{ t('新增公众号', 'Add Official') }}
              </button>
              <button
                @click="toggleBatchMode"
                class="chat-directory-batch-action"
              >
                {{ batchMode ? t('完成', 'Done') : t('批量', 'Batch') }}
              </button>
            </div>
          </div>

          <div v-if="batchMode" class="chat-directory-batch-bar">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold text-gray-700">
                {{ t('已选', 'Selected') }} {{ selectedServiceCount }} {{ t('项', 'items') }}
              </p>
              <div class="flex items-center gap-1.5">
                <button
                  @click="toggleSelectAllFiltered"
                  class="chat-directory-batch-action"
                >
                  {{ allFilteredSelected ? t('取消全选', 'Unselect All') : t('全选', 'Select All') }}
                </button>
                <button
                  @click="clearSelection"
                  class="chat-directory-batch-action"
                  :disabled="selectedCountCurrentSection === 0"
                >
                  {{ t('清空', 'Clear') }}
                </button>
                <button
                  @click="batchDeleteSelectedServices"
                  class="chat-directory-batch-action chat-directory-batch-action--danger"
                  :disabled="selectedServiceCount === 0"
                >
                  {{ t('删除', 'Delete') }}
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="hasWorldPackServiceTemplateRows"
            class="rounded-xl bg-white p-3 space-y-2"
            data-testid="chat-directory-world-service-templates"
          >
            <p class="text-xs font-semibold text-gray-700">
              {{ t('当前世界观可订阅服务号', 'Current world subscriptions') }}
            </p>
            <p class="text-[11px] text-gray-500" data-testid="chat-directory-world-service-summary">
              {{
                t(
                  `${worldPackServiceSummaryDisplayName} 提供 ${worldPackServiceTemplateRows.length} 个服务号候选；已加入 ${worldPackServiceJoinedCount} 个，待加入 ${worldPackServiceAvailableCount} 个。`,
                  `${worldPackServiceSummaryDisplayName} offers ${worldPackServiceTemplateRows.length} service candidates; ${worldPackServiceJoinedCount} joined and ${worldPackServiceAvailableCount} available.`,
                )
              }}
            </p>
            <div class="grid gap-2">
              <div
                v-for="row in worldPackServiceTemplateRows"
                :key="`world-service-template-${row.id}`"
                class="rounded-xl bg-gray-50 px-3 py-2.5 flex items-center justify-between gap-2"
                :data-testid="`chat-directory-world-service-template-${row.id}`"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <p class="text-xs font-semibold text-gray-900 truncate">{{ row.title || row.name }}</p>
                    <span
                      class="chat-list-tag"
                      :class="row.generated ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'"
                      :data-testid="`chat-directory-world-service-template-state-${row.id}`"
                    >
                      {{ row.generated ? t('已加入', 'Joined') : t('可加入', 'Available') }}
                    </span>
                    <span
                      v-if="row.userEditedAt"
                      class="chat-list-tag bg-amber-100 text-amber-700"
                      :data-testid="`chat-directory-world-service-template-edited-${row.id}`"
                    >
                      {{ t('已自定义', 'Customized') }}
                    </span>
                  </div>
                  <p class="mt-0.5 text-[11px] text-gray-500 truncate">
                    {{ worldPackServicePackLabel(row) }} · {{ worldPackServiceKindTag(row) }}
                  </p>
                  <p
                    class="mt-0.5 text-[10px] font-semibold text-gray-500 truncate"
                    :data-testid="`chat-directory-world-service-source-plan-${row.id}`"
                    :data-source-plan-status="row.sourceNotificationPlan?.status || 'not_connected'"
                    :title="sourceNotificationPlanSummary(row.sourceNotificationPlan)"
                  >
                    {{ row.generated ? t('接收计划', 'Receive plan') : t('加入后可接收', 'Ready after join') }} · {{ sourceNotificationPlanSummary(row.sourceNotificationPlan) }}
                  </p>
                </div>
                <div class="flex shrink-0 items-center gap-1">
                  <button
                    v-if="row.generated"
                    type="button"
                    class="chat-directory-batch-action"
                    :data-testid="`chat-directory-open-world-service-${row.id}`"
                    @click="openWorldPackServiceTemplateContact(row)"
                  >
                    {{ t('打开', 'Open') }}
                  </button>
                  <button
                    v-else
                    type="button"
                    class="chat-directory-batch-action"
                    :data-testid="`chat-directory-join-world-service-${row.id}`"
                    @click="joinWorldPackServiceTemplate(row)"
                  >
                    {{ t('加入', 'Join') }}
                  </button>
                  <button
                    type="button"
                    class="chat-row-icon-action"
                    :data-testid="`chat-directory-edit-world-service-${row.id}`"
                    @click="openEditWorldServiceTemplate(row)"
                  >
                    <i class="fas fa-gear"></i>
                  </button>
                  <button
                    v-if="row.userEditedAt"
                    type="button"
                    class="chat-row-icon-action"
                    :data-testid="`chat-directory-reset-world-service-${row.id}`"
                    @click="resetWorldServiceTemplate(row)"
                  >
                    <i class="fas fa-rotate-left"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <details
            v-if="activeWorldPack?.id"
            class="rounded-xl bg-white p-3 space-y-2"
            data-testid="chat-directory-world-service-proposals"
            :aria-busy="worldServiceProposalLoading ? 'true' : 'false'"
          >
            <summary class="flex cursor-pointer items-center justify-between gap-2 text-xs font-semibold text-gray-700">
              <span>{{ t('AI 候选服务号', 'AI service candidates') }}</span>
              <span class="text-[10px] text-gray-400">
                {{
                  worldServiceProposalReview
                    ? summarizeWorldServiceTemplateReview(worldServiceProposalReview)
                    : t('仅审核', 'Review only')
                }}
              </span>
            </summary>
            <div class="flex flex-wrap gap-1.5 pt-2">
              <button
                type="button"
                class="chat-directory-batch-action"
                :disabled="worldServiceProposalLoading"
                data-testid="chat-directory-world-service-proposal-extract-ai"
                @click="extractWorldServiceTemplateProposalsFromAI"
              >
                {{ worldServiceProposalLoading ? t('提取中', 'Extracting') : t('AI 提取', 'Extract with AI') }}
              </button>
              <button
                type="button"
                class="chat-directory-batch-action"
                :disabled="worldServiceProposalLoading"
                data-testid="chat-directory-world-service-proposal-review-json"
                @click="reviewWorldServiceProposalDraft"
              >
                {{ t('审核 JSON', 'Review JSON') }}
              </button>
              <button
                type="button"
                class="chat-directory-batch-action"
                :disabled="worldServiceProposalLoading"
                data-testid="chat-directory-world-service-proposal-clear"
                @click="clearWorldServiceProposalReview"
              >
                {{ t('清空', 'Clear') }}
              </button>
            </div>
            <textarea
              class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none"
              rows="3"
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
              class="rounded-lg bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600"
              data-testid="chat-directory-world-service-proposal-loading"
            >
              {{ t('正在读取世界观上下文', 'Reviewing world context') }}
            </div>
            <div
              v-if="worldServiceProposalReview"
              class="space-y-1.5"
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
                class="rounded-xl bg-gray-50 px-3 py-2 flex items-center justify-between gap-2"
                :data-testid="`chat-directory-world-service-proposal-confirmable-${proposal.id}`"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold text-gray-900 truncate">{{ proposal.title }}</p>
                  <p class="text-[11px] text-gray-500 truncate">{{ proposal.description }}</p>
                </div>
                <button
                  type="button"
                  class="chat-directory-batch-action shrink-0"
                  :disabled="worldServiceProposalLoading"
                  :data-testid="`chat-directory-world-service-proposal-confirm-${proposal.id}`"
                  @click="confirmWorldServiceTemplateProposalEntry(proposal)"
                >
                  {{ t('确认', 'Confirm') }}
                </button>
              </div>
              <div
                v-for="proposal in worldServiceProposalReview.rejectedProposals || []"
                :key="`world-service-proposal-rejected-${proposal.id}`"
                class="rounded-xl bg-gray-50 px-3 py-2"
                :data-testid="`chat-directory-world-service-proposal-rejection-${proposal.id}`"
                :data-rejection-reason="proposal.rejectionReason || 'unknown'"
              >
                <p class="text-xs font-semibold text-gray-700">{{ proposal.title }}</p>
                <p class="mt-0.5 text-[11px] text-gray-500">
                  {{ proposal.rejectionReason || 'unknown' }}
                </p>
              </div>
            </div>
          </details>

          <div class="rounded-xl bg-white p-3 space-y-2" data-testid="chat-directory-shopping-service-presets">
            <p class="text-xs font-semibold text-gray-700">
              {{ t('Shopping 店铺账号预设', 'Shopping shop account presets') }}
            </p>
            <div class="grid gap-1.5">
              <div
                v-for="preset in shoppingServicePresetOptions"
                :key="`shopping-service-preset-${preset.key}`"
                class="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="text-xs font-medium text-gray-900 truncate">
                    <i :class="preset.icon" class="mr-1 text-amber-500"></i>{{ preset.label }}
                  </p>
                </div>
                <button
                  @click="openCreateShoppingService(preset.key)"
                  class="chat-directory-batch-action shrink-0"
                  :data-testid="`chat-directory-create-shopping-service-${preset.key}`"
                >
                  {{ t('创建', 'Create') }}
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-xl bg-white p-3 space-y-2" data-testid="chat-directory-logistics-service-presets">
            <p class="text-xs font-semibold text-gray-700">
              {{ t('物流服务号预设', 'Logistics service account presets') }}
            </p>
            <div class="grid gap-1.5">
              <div
                v-for="preset in logisticsServicePresetOptions"
                :key="`logistics-service-preset-${preset.key}`"
                class="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="text-xs font-medium text-gray-900 truncate">
                    <i :class="preset.icon" class="mr-1 text-sky-500"></i>{{ preset.label }}
                  </p>
                </div>
                <button
                  @click="openCreateLogisticsService(preset.key)"
                  class="chat-directory-batch-action shrink-0"
                  :data-testid="`chat-directory-create-logistics-service-${preset.key}`"
                >
                  {{ t('创建', 'Create') }}
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-xl bg-white p-3 space-y-2" data-testid="chat-directory-food-delivery-service-presets">
            <p class="text-xs font-semibold text-gray-700">
              {{ t('外卖服务号预设', 'Food delivery service account presets') }}
            </p>
            <div class="grid gap-1.5">
              <div
                v-for="preset in foodDeliveryServicePresetOptions"
                :key="`food-delivery-service-preset-${preset.key}`"
                class="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="text-xs font-medium text-gray-900 truncate">
                    <i :class="preset.icon" class="mr-1 text-orange-500"></i>{{ preset.label }}
                  </p>
                </div>
                <button
                  @click="openCreateFoodDeliveryService(preset.key)"
                  class="chat-directory-batch-action shrink-0"
                  :data-testid="`chat-directory-create-food-delivery-service-${preset.key}`"
                >
                  {{ t('创建', 'Create') }}
                </button>
              </div>
            </div>
          </div>

          <div class="rounded-xl bg-white p-3 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-semibold text-gray-700">
                {{ t('模板预设中心', 'Template Preset Center') }}
              </p>
              <div class="flex items-center gap-1.5" v-if="batchMode">
                <select
                  v-model="selectedServiceTemplateId"
                  class="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 outline-none"
                >
                  <option
                    v-for="preset in serviceTemplatePresets"
                    :key="`service-template-${preset.id}`"
                    :value="preset.id"
                  >
                    {{ servicePresetTemplate(preset) }}
                  </option>
                </select>
                <button
                  @click="applyServicePresetToSelected"
                  class="chat-directory-batch-action"
                  :disabled="selectedServiceCount === 0"
                >
                  {{ t('套用', 'Apply') }}
                </button>
              </div>
            </div>
            <div class="grid gap-1.5">
              <div
                v-for="preset in serviceTemplatePresets"
                :key="`service-preset-card-${preset.id}`"
                class="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="text-xs font-medium text-gray-900 truncate">
                    {{ servicePresetName(preset) }}
                  </p>
                  <p class="text-[11px] text-gray-500 truncate">
                    {{ servicePresetTemplate(preset) }}
                  </p>
                </div>
                <button
                  @click="openCreateServiceFromPreset(preset.id)"
                  class="chat-directory-batch-action shrink-0"
                >
                  {{ t('新建', 'Create') }}
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
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-end justify-center pb-6"
      @click.self="closeBindModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <p class="text-lg font-extrabold text-gray-950">{{ t('绑定角色到会话', 'Bind Profile to Chat') }}</p>
          <button type="button" class="chat-home-icon-button -mr-1 -mt-1 text-gray-400" @click="closeBindModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <select v-model.number="bindProfileId" class="mt-4 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white">
          <option v-for="profile in unboundRoleProfilesRaw" :key="profile.id" :value="profile.id">
            {{ profile.name }} · {{ profile.role || t('未设置角色', 'Role not set') }}
          </option>
        </select>
        <div class="mt-4 flex justify-end gap-2">
          <button @click="closeBindModal" class="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">{{ t('取消', 'Cancel') }}</button>
          <button
            @click="bindSelectedProfile"
            class="rounded-full bg-yellow-300 px-4 py-2 text-sm font-extrabold text-gray-950 shadow-sm"
          >
            {{ t('确认绑定', 'Confirm Bind') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showRoleMetaModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-end justify-center pb-6"
      @click.self="closeRoleMetaModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div class="flex items-start justify-between gap-3">
          <p class="text-lg font-extrabold text-gray-950">{{ t('会话绑定设置', 'Chat Binding Settings') }}</p>
          <button type="button" class="chat-home-icon-button -mr-1 -mt-1 text-gray-400" @click="closeRoleMetaModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <label class="mt-4 block text-xs font-semibold text-gray-600">
          {{ t('会话调校（0-100）', 'Chat-local tuning (0-100)') }}
        </label>
        <input
          v-model.number="roleMetaDraft.relationshipLevel"
          type="number"
          min="0"
          max="100"
          class="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
        />
        <p
          class="mt-1.5 text-[11px] text-gray-400"
          data-testid="chat-directory-relationship-compatibility-help"
        >
          {{
            t(
              '这里只保存 Chat 绑定层注解，不是当前关系真相；真实当前关系由 relationship runtime 维护。',
              'This saves a Chat binding annotation only, not current relationship truth; current relationship is owned by relationship runtime.',
            )
          }}
        </p>
        <label class="mt-4 block text-xs font-semibold text-gray-600">
          {{ t('会话备注（仅 Chat 本地）', 'Chat note (chat local only)') }}
        </label>
        <textarea
          v-model="roleMetaDraft.relationshipNote"
          rows="3"
          class="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm resize-none outline-none focus:border-yellow-300 focus:bg-white"
          :placeholder="t('例如：这里仅记录 Chat 回复偏好，不写入关系进度。', 'Example: record Chat reply preference here; it does not write relationship progress.')"
        ></textarea>
        <label class="mt-4 block text-xs font-semibold text-gray-600">
          {{ t('会话优先图片素材（可选）', 'Thread preferred image asset (optional)') }}
        </label>
        <select
          v-model="roleMetaDraft.preferredImageAssetId"
          class="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
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
        <p class="mt-1.5 text-[11px] text-gray-400">
          {{
            roleMetaAssetOptions.length > 0
              ? roleMetaAssetContextLabel
              : t('该角色档案未绑定素材包，请先在主通讯录中绑定。', 'No profile asset pack yet. Bind assets in main Contacts first.')
          }}
        </p>
        <div v-if="roleMetaPreviewLeadOption" class="mt-4 space-y-2">
          <div class="rounded-2xl bg-gray-50 p-3 flex items-center gap-3">
            <AssetThumbnailOption
              :asset="roleMetaPreviewLeadOption"
              :preview-url="rolePreviewMap[roleMetaPreviewLeadOption.id]"
              variant="rail"
              selection-tone="violet"
              :interactive="false"
              :show-name="false"
            />
            <div class="min-w-0">
              <p class="text-xs font-semibold text-gray-900 truncate">{{ roleMetaPreviewTitle }}</p>
              <p class="text-[11px] text-gray-500 truncate">{{ roleMetaPreviewLeadOption.label }}</p>
              <p class="text-[11px] text-gray-400 mt-1">{{ roleMetaPreviewDescription }}</p>
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
                  : 'border-yellow-300 bg-yellow-50 text-gray-900'
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
        <div class="mt-4 space-y-1.5">
          <p class="text-xs font-semibold text-gray-600">{{ t('快捷关系模板', 'Quick Relationship Templates') }}</p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="preset in roleMetaTemplatePresets"
              :key="`modal-role-template-${preset.id}`"
              @click="applyRoleTemplateToDraft(preset.id)"
              class="chat-directory-batch-action"
            >
              {{ roleTemplateLabel(preset) }}
            </button>
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <button @click="closeRoleMetaModal" class="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">{{ t('取消', 'Cancel') }}</button>
          <button
            @click="saveRoleMeta"
            class="rounded-full bg-yellow-300 px-4 py-2 text-sm font-extrabold text-gray-950 shadow-sm"
          >
            {{ t('保存', 'Save') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showWorldServiceTemplateModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-end justify-center pb-6"
      data-testid="chat-directory-world-service-template-modal"
      @click.self="closeWorldServiceTemplateModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-lg font-extrabold text-gray-950">{{ t('编辑世界观服务号模板', 'Edit world service template') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">
              {{
                t(
                  '这里修改的是可订阅模板，不会自动覆盖已加入的 Chat 服务号。',
                  'This edits the subscription template and will not automatically overwrite joined Chat accounts.',
                )
              }}
            </p>
          </div>
          <button type="button" class="chat-home-icon-button -mr-1 -mt-1 text-gray-400" @click="closeWorldServiceTemplateModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <input
          v-model="worldServiceTemplateDraft.title"
          type="text"
          class="mt-4 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
          data-testid="chat-directory-world-service-template-title"
          :placeholder="t('服务号名称', 'Service account name')"
        />
        <select
          v-model="worldServiceTemplateDraft.category"
          class="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
          data-testid="chat-directory-world-service-template-category"
        >
          <option value="service_notification">{{ t('服务号 / 通知', 'Service / notifications') }}</option>
          <option value="publication">{{ t('公众号 / 公开频道', 'Official / publication') }}</option>
          <option value="subscription">{{ t('公众号 / 会员频道', 'Official / subscription') }}</option>
        </select>
        <select
          v-model="worldServiceTemplateDraft.linkedAppBindingId"
          class="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
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
          class="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm resize-none outline-none focus:border-yellow-300 focus:bg-white"
          data-testid="chat-directory-world-service-template-description"
          :placeholder="t('说明这个服务号会发布什么内容', 'Describe what this account will publish')"
        ></textarea>
        <div class="mt-4 flex justify-end gap-2">
          <button
            @click="closeWorldServiceTemplateModal"
            class="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600"
          >
            {{ t('取消', 'Cancel') }}
          </button>
          <button
            @click="saveWorldServiceTemplate"
            class="rounded-full bg-yellow-300 px-4 py-2 text-sm font-extrabold text-gray-950 shadow-sm"
            data-testid="chat-directory-save-world-service-template"
          >
            {{ t('保存模板', 'Save template') }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showServiceModal"
      class="fixed inset-0 z-40 bg-black/35 px-4 flex items-end justify-center pb-6"
      @click.self="closeServiceModal"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div class="flex items-start justify-between gap-3">
          <p class="text-lg font-extrabold text-gray-950">
            {{
              serviceModalMode === 'create'
                ? serviceDraft.kind === 'official'
                  ? t('新增公众号', 'Add Official')
                  : t('新增服务号', 'Add Service')
                : t('编辑服务对象', 'Edit Service Entry')
            }}
          </p>
          <button type="button" class="chat-home-icon-button -mr-1 -mt-1 text-gray-400" @click="closeServiceModal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <input
          v-model="serviceDraft.name"
          type="text"
          class="mt-4 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
          data-testid="chat-directory-service-name"
          :placeholder="t('名称', 'Name')"
        />
        <select
          v-model="serviceDraft.kind"
          class="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
          :disabled="serviceModalMode === 'edit'"
        >
          <option value="service">{{ t('服务号', 'Service') }}</option>
          <option value="official">{{ t('公众号', 'Official') }}</option>
        </select>
        <input
          v-model="serviceDraft.template"
          type="text"
          class="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
          :placeholder="t('服务模板标题', 'Service template title')"
        />
        <select
          v-model="serviceDraft.shoppingServiceKey"
          class="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
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
          class="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
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
          class="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-yellow-300 focus:bg-white"
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
        <div class="mt-4 rounded-2xl bg-gray-50 p-3">
          <p class="text-xs font-semibold text-gray-600">{{ t('头像来源', 'Avatar source') }}</p>
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
          class="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm resize-none outline-none focus:border-yellow-300 focus:bg-white"
          :placeholder="t('服务说明（可选）', 'Description (optional)')"
        ></textarea>
        <div class="mt-4 flex justify-end gap-2">
          <button @click="closeServiceModal" class="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600">{{ t('取消', 'Cancel') }}</button>
          <button
            @click="saveService"
            class="rounded-full bg-yellow-300 px-4 py-2 text-sm font-extrabold text-gray-950 shadow-sm"
            data-testid="chat-directory-save-service"
          >
            {{ t('保存', 'Save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
