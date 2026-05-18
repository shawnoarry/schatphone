<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useChatStore } from '../stores/chat'
import { useGalleryStore } from '../stores/gallery'
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
import { useDialog } from '../composables/useDialog'
import { useI18n } from '../composables/useI18n'
import AssetThumbnailOption from '../components/assets/AssetThumbnailOption.vue'
import ImageSourcePicker from '../components/shared/ImageSourcePicker.vue'

const router = useRouter()
const chatStore = useChatStore()
const galleryStore = useGalleryStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()
const { contacts, roleProfiles } = storeToRefs(chatStore)

const activeSection = ref('roles')
const searchKeyword = ref('')
const roleFilter = ref('all')
const serviceFilter = ref('all')
const batchMode = ref(false)
const selectedContactIds = ref([])
const showBindModal = ref(false)
const bindProfileId = ref(0)

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

const roleFilterOptions = computed(() => [
  { key: 'all', label: t('全部', 'All') },
  { key: 'main', label: t('主角色', 'Main') },
  { key: 'npc', label: t('NPC', 'NPC') },
])

const serviceFilterOptions = computed(() => [
  { key: 'all', label: t('全部', 'All') },
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

const filteredRoleBindings = computed(() =>
  roleBindings.value.filter(
    (contact) =>
      matchRoleType(contact) &&
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
      matchRoleType(profile) &&
      includesSearch(profile?.name, profile?.role, profile?.bio, (profile?.tags || []).join(' ')),
  ),
)

const filteredServiceContacts = computed(() =>
  serviceContacts.value.filter((contact) => {
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

const switchSection = (section) => {
  activeSection.value = section === 'service' ? 'service' : 'roles'
  searchKeyword.value = ''
  setBatchMode(false)
}

const openChat = (contact) => {
  chatStore.ensureConversationForContact(contact.id)
  chatStore.markConversationRead(contact.id)
  router.push(`/chat/${contact.id}`)
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
    const created = chatStore.addContact(payload)
    showUiNotice('success', t('服务对象已创建。', 'Service entry created.'))
    closeServiceModal()
    openChat(created)
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
        {{ t('服务号管理', 'Service Management') }}
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
          @click="activeSection === 'roles' ? (roleFilter = option.key) : (serviceFilter = option.key)"
          class="px-2.5 py-1 rounded-full text-[11px] border"
          :class="
            (activeSection === 'roles' ? roleFilter : serviceFilter) === option.key
              ? activeSection === 'roles'
                ? 'border-violet-300 bg-violet-50 text-violet-700'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700'
              : 'border-gray-200 bg-white text-gray-600'
          "
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
      <section v-if="activeSection === 'roles'" class="space-y-3">
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
              {{ t('亲密度', 'Affinity') }} {{ contact.relationshipLevel ?? 50 }}
            </p>
            <p v-if="contact.relationshipNote" class="text-[11px] text-gray-400 truncate">
              {{ contact.relationshipNote }}
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
          <template v-if="!batchMode">
            <button @click="openChat(contact)" class="text-xs text-blue-600">{{ t('聊天', 'Chat') }}</button>
            <button @click="openRoleMetaModal(contact)" class="text-xs text-gray-500">{{ t('会话设定', 'Thread Meta') }}</button>
            <button @click="unbindRole(contact)" class="text-xs text-red-500">{{ t('解绑', 'Unbind') }}</button>
          </template>
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
          <h3 class="text-xs font-bold text-gray-500 uppercase">{{ t('服务号 / 公众号', 'Service / Official') }}</h3>
          <div class="flex gap-2">
            <button
              @click="openCreateService('service')"
              class="px-2.5 py-1 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs"
              data-testid="chat-directory-add-service"
            >
              {{ t('新增服务号', 'Add Service') }}
            </button>
            <button @click="openCreateService('official')" class="px-2.5 py-1 rounded-md border border-sky-200 bg-sky-50 text-sky-700 text-xs">
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

        <p v-if="serviceContacts.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('暂无服务号或公众号。', 'No service or official accounts yet.') }}
        </p>
        <p v-else-if="filteredServiceContacts.length === 0" class="text-xs text-gray-400 px-1 py-2">
          {{ t('当前筛选下没有匹配服务对象。', 'No service entry matches current filter.') }}
        </p>
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

        <div
          v-for="contact in filteredServiceContacts"
          :key="contact.id"
          class="rounded-2xl border p-3 flex items-center gap-3"
          :class="
            batchMode
              ? isContactSelected(contact.id)
                ? 'bg-emerald-50 border-emerald-300 cursor-pointer'
                : 'bg-white border-emerald-100 cursor-pointer'
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
                ? 'border-emerald-400 bg-emerald-500 text-white'
                : 'border-gray-300 bg-white text-transparent'
            "
            @click.stop="toggleSelectContact(contact.id)"
          >
            <i class="fas fa-check"></i>
          </button>
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
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
            <p class="text-sm font-semibold truncate">{{ contact.name }}</p>
            <p class="text-xs text-gray-500 truncate">
              {{ serviceKindTag(contact) }} · {{ contact.serviceTemplate || t('未设置服务模板', 'Service template not set') }}
            </p>
            <p
              v-if="shoppingServiceLabel(contact.shoppingServiceKey)"
              class="text-[11px] text-amber-700 truncate"
              :data-testid="`chat-directory-shopping-service-${contact.id}`"
            >
              {{ t('Shopping 店铺', 'Shopping shop') }} · {{ shoppingServiceLabel(contact.shoppingServiceKey) }}
            </p>
            <p
              v-if="logisticsServiceLabel(contact.logisticsServiceKey)"
              class="text-[11px] text-sky-700 truncate"
              :data-testid="`chat-directory-logistics-service-${contact.id}`"
            >
              {{ t('物流服务号', 'Logistics service') }} · {{ logisticsServiceLabel(contact.logisticsServiceKey) }}
            </p>
            <p
              v-if="foodDeliveryServiceLabel(contact.foodDeliveryServiceKey)"
              class="text-[11px] text-orange-700 truncate"
              :data-testid="`chat-directory-food-delivery-service-${contact.id}`"
            >
              {{ t('外卖服务号', 'Food delivery service') }} · {{ foodDeliveryServiceLabel(contact.foodDeliveryServiceKey) }}
            </p>
          </div>
          <template v-if="!batchMode">
            <button @click="openChat(contact)" class="text-xs text-blue-600">{{ t('聊天', 'Chat') }}</button>
            <button @click="openEditService(contact)" class="text-xs text-gray-500">{{ t('编辑', 'Edit') }}</button>
            <button @click="removeService(contact)" class="text-xs text-red-500">{{ t('删除', 'Delete') }}</button>
          </template>
        </div>
      </section>
    </div>

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
        <p class="text-base font-bold">{{ t('会话变量设置', 'Thread Variable Settings') }}</p>
        <label class="text-xs text-gray-500 block">
          {{ t('亲密度（0-100）', 'Affinity (0-100)') }}
        </label>
        <input
          v-model.number="roleMetaDraft.relationshipLevel"
          type="number"
          min="0"
          max="100"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
        />
        <label class="text-xs text-gray-500 block">
          {{ t('会话备注（仅本会话）', 'Thread note (chat local only)') }}
        </label>
        <textarea
          v-model="roleMetaDraft.relationshipNote"
          rows="3"
          class="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none outline-none"
          :placeholder="t('例如：最近关系升温、需要更主动互动。', 'Example: relationship improved, prefer more proactive interaction.')"
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
