<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useGalleryStore } from '../stores/gallery'
import { useWalletStore } from '../stores/wallet'
import { useShoppingStore } from '../stores/shopping'
import { useFoodDeliveryStore } from '../stores/foodDelivery'
import { usePhoneStore } from '../stores/phone'
import { useCalendarStore } from '../stores/calendar'
import { useMapStore } from '../stores/map'
import {
  RELATIONSHIP_MEMORY_REVIEW_STATES,
  useRelationshipRuntimeStore,
} from '../stores/relationshipRuntime'
import { callAI } from '../lib/ai'
import {
  RELATIONSHIP_CLASSIFICATION_SOURCE,
  buildRelationshipClassificationRegistry,
  normalizeInitialRelationshipSeed,
} from '../lib/relationship-classification-schema'
import { classifyRelationshipLabel } from '../lib/relationship-label-classifier'
import { adaptProfileTemplateValues } from '../lib/profile-template-adaptation-assistant'
import { suggestProfileTemplateValues } from '../lib/profile-template-value-assistant'
import { summarizeRoleAssetFolderBindings } from '../lib/role-asset-folder-resolver'
import {
  CONTACTS_ENTITY_TYPES,
  ROLE_DETAIL_SECTIONS,
  ROLE_DETAIL_SOURCE_KINDS,
  isValidRoleId,
  normalizeRoleId,
} from '../lib/role-profile-schema'
import {
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_TEMPLATE_SCOPES,
  PROFILE_VALUE_SOURCE_KINDS,
  PROFILE_VISIBILITY_LEVELS,
} from '../lib/profile-template-schema'
import {
  buildRoleDeleteImpact,
  deleteRoleMemoryGroup,
  deleteRoleProfileCascade,
  resetRoleRelationshipState,
} from '../lib/contacts-relationship-actions'
import {
  cleanupCoverageText as formatCleanupCoverageText,
  cleanupResultSummaryText as formatCleanupResultSummaryText,
  createRelationshipSourceCleanupHandlers,
  sourceModuleSummaryText as formatSourceModuleSummaryText,
} from '../lib/relationship-source-cleanup-handlers'
import { useDialog } from '../composables/useDialog'
import { useContactsHomeListModel } from '../composables/useContactsHomeListModel'
import { useContactsDangerZoneModel } from '../composables/useContactsDangerZoneModel'
import { useContactsDetailSectionModel } from '../composables/useContactsDetailSectionModel'
import { useContactsLinkedActivityModel } from '../composables/useContactsLinkedActivityModel'
import { useContactsMemoryDetailModel } from '../composables/useContactsMemoryDetailModel'
import { useContactsMemoryListModel } from '../composables/useContactsMemoryListModel'
import { useContactsProfileHeaderModel } from '../composables/useContactsProfileHeaderModel'
import { useContactsProfileTemplateEditorModel } from '../composables/useContactsProfileTemplateEditorModel'
import {
  contactsEntityTypeLabel as formatContactsEntityTypeLabel,
  useContactsRoleHubModel,
} from '../composables/useContactsRoleHubModel'
import { useContactsWorldFieldModel } from '../composables/useContactsWorldFieldModel'
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
const shoppingStore = useShoppingStore()
const foodDeliveryStore = useFoodDeliveryStore()
const phoneStore = usePhoneStore()
const calendarStore = useCalendarStore()
const mapStore = useMapStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const { t } = useI18n()
const { confirmDialog, promptDialog } = useDialog()

const { user, settings } = storeToRefs(systemStore)
const { roleProfiles, loadingAI } = storeToRefs(chatStore)

const isWorldBookProfileTemplateHandoff = computed(() => {
  const from = Array.isArray(route.query.from) ? route.query.from[0] : route.query.from
  const focus = Array.isArray(route.query.focus) ? route.query.focus[0] : route.query.focus
  return from === 'worldbook' && focus === 'profile_templates'
})

const showProfileModal = ref(false)
const profileModalMode = ref('create')
const editingProfileId = ref(0)
const selectedProfileId = ref(0)
const contactsSearchQuery = ref('')
const isProfileTemplateEditorOpen = ref(false)
const dangerIncludeLinkedRecords = ref(false)
const selectedMemoryKey = ref('')
const assetPackCategory = ref('reference')
const draftPreviewMap = reactive({})
const profileTemplateDraft = reactive({
  templateId: '',
  values: {},
  visibility: {},
})
const profileTemplateAiDraftBusy = ref(false)
const profileTemplateAiDraftStatus = ref('')
const profileTemplateAdaptationBusy = ref(false)
const profileTemplateAdaptationStatus = ref('')
const CONTACTS_ASSET_PREVIEW_SCOPE_ID = 'contacts-view'
const CONTACTS_FALLBACK_WORLD_ID = 'default_world'

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
  roleId: '',
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

const detailDrafts = reactive({
  [ROLE_DETAIL_SECTIONS.PREFERENCES]: {
    title: '',
    detail: '',
  },
  [ROLE_DETAIL_SECTIONS.LIFE_PATTERN]: {
    title: '',
    detail: '',
  },
  [ROLE_DETAIL_SECTIONS.SOCIAL_GRAPH]: {
    title: '',
    detail: '',
  },
})
const editingDetailItemId = ref('')
const detailEditDraft = reactive({
  title: '',
  detail: '',
})
const memorySourceFilter = ref('all')
const memorySortMode = ref('recent')
const memoryReviewDraft = ref('')
const relationshipPremiseDraft = reactive({
  relationshipLabelText: '',
  relationshipLabelNote: '',
  initialRelationshipSeed: normalizeInitialRelationshipSeed(),
  primaryRelationshipCategoryId: '',
  relationshipModifierIds: [],
})
const relationshipClassificationBusy = ref(false)
const pendingClassificationSuggestion = ref(null)

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

const selectedProfile = computed(
  () => chatStore.getRoleProfileById(selectedProfileId.value) || roleProfiles.value[0] || null,
)

const activeWorldRelationshipRegistry = computed(() => {
  const activePackId = user.value.activeWorldPackId || CONTACTS_FALLBACK_WORLD_ID
  const activePack = Array.isArray(user.value.worldPacks)
    ? user.value.worldPacks.find((pack) => pack.id === activePackId)
    : null
  return buildRelationshipClassificationRegistry({
    worldCategories: activePack?.relationshipCategories || [],
    worldModifiers: activePack?.relationshipModifiers || [],
  })
})
const relationshipCategoryOptions = computed(() => activeWorldRelationshipRegistry.value.categories)
const relationshipModifierOptions = computed(() => activeWorldRelationshipRegistry.value.modifiers)
const currentContactsWorldId = computed(() =>
  typeof user.value.activeWorldPackId === 'string' && user.value.activeWorldPackId.trim()
    ? user.value.activeWorldPackId.trim()
    : CONTACTS_FALLBACK_WORLD_ID,
)

const resetRelationshipPremiseDraft = (profile = selectedProfile.value) => {
  relationshipPremiseDraft.relationshipLabelText = profile?.relationshipLabelText || ''
  relationshipPremiseDraft.relationshipLabelNote = profile?.relationshipLabelNote || ''
  relationshipPremiseDraft.initialRelationshipSeed = normalizeInitialRelationshipSeed(
    profile?.initialRelationshipSeed,
  )
  relationshipPremiseDraft.primaryRelationshipCategoryId = profile?.primaryRelationshipCategoryId || ''
  relationshipPremiseDraft.relationshipModifierIds = Array.isArray(profile?.relationshipModifierIds)
    ? profile.relationshipModifierIds.filter((id) =>
        activeWorldRelationshipRegistry.value.modifierById.has(id),
      )
    : []
  pendingClassificationSuggestion.value = null
}

const toggleRelationshipModifierDraft = (modifierId) => {
  const current = new Set(relationshipPremiseDraft.relationshipModifierIds)
  if (current.has(modifierId)) current.delete(modifierId)
  else current.add(modifierId)
  relationshipPremiseDraft.relationshipModifierIds = [...current].filter((id) =>
    activeWorldRelationshipRegistry.value.modifierById.has(id),
  )
}

const saveRelationshipPremiseDraft = (
  source = RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED,
) => {
  const profile = selectedProfile.value
  if (!profile?.id) return
  chatStore.updateRoleRelationshipPremise(profile.id, {
    relationshipLabelText: relationshipPremiseDraft.relationshipLabelText,
    relationshipLabelNote: relationshipPremiseDraft.relationshipLabelNote,
    initialRelationshipSeed: relationshipPremiseDraft.initialRelationshipSeed,
  })
  const result = chatStore.saveRoleRelationshipClassification(
    profile.id,
    {
      primaryRelationshipCategoryId: relationshipPremiseDraft.primaryRelationshipCategoryId,
      relationshipModifierIds: relationshipPremiseDraft.relationshipModifierIds,
      classificationConfidence:
        source === RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED ? 'high' : '',
      classificationExplanation:
        source === RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED
          ? 'User manually edited relationship classification in Contacts.'
          : '',
    },
    {
      source,
      force: source === RELATIONSHIP_CLASSIFICATION_SOURCE.USER_EDITED,
    },
  )
  if (!result.ok) {
    setUiNotice(
      'warning',
      t('关系分类未保存。', 'Relationship classification was not saved.'),
    )
    return
  }
  resetRelationshipPremiseDraft(chatStore.getRoleProfileById(profile.id))
  setUiNotice('success', t('关系前提已保存。', 'Relationship premise saved.'))
}

const runRelationshipClassification = async () => {
  const profile = selectedProfile.value
  if (!profile?.id || relationshipClassificationBusy.value) return
  relationshipClassificationBusy.value = true
  pendingClassificationSuggestion.value = null
  try {
    chatStore.updateRoleRelationshipPremise(profile.id, {
      relationshipLabelText: relationshipPremiseDraft.relationshipLabelText,
      relationshipLabelNote: relationshipPremiseDraft.relationshipLabelNote,
      initialRelationshipSeed: relationshipPremiseDraft.initialRelationshipSeed,
    })
    const result = await classifyRelationshipLabel({
      profile: chatStore.getRoleProfileById(profile.id),
      settings: settings.value,
      registry: activeWorldRelationshipRegistry.value,
    })
    if (!result.ok) {
      setUiNotice(
        'error',
        t('关系分类解析失败。', 'Relationship classification parsing failed.'),
      )
      return
    }
    if (result.requiresConfirmation) {
      pendingClassificationSuggestion.value = result
      setUiNotice('warning', t('AI 分类需要确认。', 'AI classification needs confirmation.'))
      return
    }
    const saved = chatStore.saveRoleRelationshipClassification(profile.id, result.classification, {
      source: result.saveSource,
    })
    if (!saved.ok) {
      setUiNotice(
        'warning',
        saved.reason === 'user_edited_protected'
          ? t(
              '已保留用户手动分类，AI 未覆盖。',
              'User-edited classification was kept; AI did not overwrite it.',
            )
          : t('AI 分类未保存。', 'AI classification was not saved.'),
      )
      return
    }
    resetRelationshipPremiseDraft(chatStore.getRoleProfileById(profile.id))
    setUiNotice('success', t('AI 关系分类已保存。', 'AI relationship classification saved.'))
  } catch {
    setUiNotice('error', t('AI 分类请求失败。', 'AI classification request failed.'))
  } finally {
    relationshipClassificationBusy.value = false
  }
}

const confirmPendingRelationshipClassification = async () => {
  const profile = selectedProfile.value
  const suggestion = pendingClassificationSuggestion.value
  if (!profile?.id || !suggestion?.classification) return
  const ok = await confirmDialog({
    title: t('确认关系分类', 'Confirm relationship classification'),
    message:
      suggestion.classification.classificationExplanation ||
      suggestion.classification.primaryRelationshipCategoryId,
    confirmText: t('保存分类', 'Save classification'),
    cancelText: t('取消', 'Cancel'),
  })
  if (!ok) return
  const saved = chatStore.saveRoleRelationshipClassification(profile.id, suggestion.classification, {
    source: RELATIONSHIP_CLASSIFICATION_SOURCE.AI_CONFIRMED,
  })
  if (!saved.ok) {
    setUiNotice(
      'warning',
      saved.reason === 'user_edited_protected'
        ? t(
            '已保留用户手动分类，AI 未覆盖。',
            'User-edited classification was kept; AI did not overwrite it.',
          )
        : t('AI 分类未保存。', 'AI classification was not saved.'),
    )
    return
  }
  pendingClassificationSuggestion.value = null
  resetRelationshipPremiseDraft(chatStore.getRoleProfileById(profile.id))
  setUiNotice('success', t('AI 分类已确认保存。', 'AI classification confirmed and saved.'))
}

const relationshipMemoryReviewSummaryText = (memory = {}) => {
  const base =
    memory?.displaySummary ||
    memory?.primarySummary ||
    memory?.latestSummary ||
    memory?.reviewSummary ||
    memory?.recallSummary ||
    ''
  if (!base) return ''
  const relatedRecordCount = Number(memory?.supportingCount) || 0
  if (relatedRecordCount <= 1) return base
  return t(
    `${base}（包含 ${relatedRecordCount} 条关联记录）`,
    `${base} (${relatedRecordCount} related records)`,
  )
}

const selectedProfileValues = computed(() =>
  Array.isArray(selectedProfile.value?.profileValues) ? selectedProfile.value.profileValues : [],
)
const selectedProfileEntityType = computed(
  () => selectedProfile.value?.entityType || CONTACTS_ENTITY_TYPES.MAIN_ROLE,
)
const selectedProfileChatBound = computed(() =>
  selectedProfile.value?.id ? chatStore.isRoleProfileBound(selectedProfile.value.id) : false,
)
const selectedRoleChatContact = computed(() => {
  const profileId = selectedProfile.value?.id
  if (!profileId) return null
  return chatStore.contacts.find((contact) => contact.kind === 'role' && Number(contact.profileId) === Number(profileId)) || null
})
const universalProfileTemplates = computed(() => systemStore.listProfileTemplatePresets())
const currentWorldProfileTemplates = computed(() =>
  systemStore.listWorldProfileTemplates(currentContactsWorldId.value, { enabledOnly: true }),
)
const {
  contactsProfileTemplateOptions,
  fieldMatchesSelectedProfileEntity,
  formatContactsProfileTemplateOption,
  formatProfileValue,
  profileTemplateVisibilityOptions,
  profileValueLabel,
  profileVisibilityLevelLabel,
  selectedProfileTemplate,
  selectedProfileTemplateAdaptationDisplay,
  selectedProfileTemplateAdaptationReview,
  selectedProfileValueMap,
  selectedProfileWorldFieldRows,
  selectedWorldFieldIntroText,
} = useContactsWorldFieldModel({
  selectedProfile,
  selectedProfileEntityType,
  selectedProfileValues,
  currentWorldProfileTemplates,
  universalProfileTemplates,
  currentContactsWorldId,
  getProfileTemplateById: (templateId) => systemStore.getProfileTemplateById(templateId),
  t,
})

const {
  profileTemplateDraftTemplate,
  profileTemplateDraftFields,
  profileTemplateDraftFieldRows,
  profileTemplateDraftPreservedValues,
  profileTemplateDraftPreservedRows,
  profileTemplateChangeReview,
  emptyTemplateFieldText,
  emptyTemplateOptionsText,
  tagPreviewEmptyText,
} = useContactsProfileTemplateEditorModel({
  profileTemplateDraft,
  selectedProfileValues,
  fieldMatchesSelectedProfileEntity,
  getProfileTemplateById: (templateId) => systemStore.getProfileTemplateById(templateId),
  formatProfileValue,
  profileValueLabel,
  profileVisibilityLevelLabel,
  t,
})

const selectedRelationshipSnapshot = computed(() =>
  selectedProfile.value
    ? relationshipRuntimeStore.summarizeEntityForTarget(profileRelationshipTarget(selectedProfile.value), {
        eventLimit: 5,
        memoryLimit: 6,
      })
    : null,
)

const selectedDeleteImpact = computed(() =>
  selectedProfile.value
    ? buildRoleDeleteImpact({
        chatStore,
        relationshipRuntimeStore,
        profile: selectedProfile.value,
      })
    : null,
)

const {
  availableMemorySourceFilters,
  visibleMemoryGroups,
  memoryListSummaryText,
  selectedMemoryListCountLabel,
  selectedMemoryListOverflowText,
} = useContactsMemoryListModel({
  selectedProfile,
  memorySourceFilter,
  memorySortMode,
  t,
  getRelationshipTarget: (profile) => profileRelationshipTarget(profile),
  listMemoryGroupsForTarget: (...args) => relationshipRuntimeStore.listMemoryGroupsForTarget(...args),
  formatSourceModuleLabel: (sourceModule) => relationshipSourceModuleLabel(sourceModule),
})

const selectedMemoryDetail = computed(() =>
  selectedProfile.value && selectedMemoryKey.value
    ? relationshipRuntimeStore.getMemoryGroupDetail(
        profileRelationshipTarget(selectedProfile.value),
        selectedMemoryKey.value,
      )
    : null,
)

const relationshipSourceModuleLabel = (sourceModule) => {
  if (sourceModule === 'relationship_phone_call') return t('Phone 通话', 'Phone call')
  if (sourceModule === 'relationship_calendar_confirmed_event') return t('Calendar 日程', 'Calendar event')
  if (sourceModule === 'relationship_map_shared_route') return t('Map 路线', 'Map route')
  if (sourceModule === 'relationship_wallet_shared_transfer') return t('Wallet 转账', 'Wallet transfer')
  if (sourceModule === 'relationship_wallet_order_support') return t('Wallet 订单入账', 'Wallet order support')
  if (sourceModule === 'relationship_shopping_gift') return t('Shopping 礼物订单', 'Shopping gift order')
  if (sourceModule === 'relationship_food_delivery_shared_meal') {
    return t('Food Delivery 共同用餐', 'Food Delivery shared meal')
  }
  return sourceModule || t('未标记来源', 'Unlabeled source')
}

const relationshipFactTypeLabel = (factType) => {
  if (factType === 'phone_call' || factType === 'completed_call') return t('通话', 'Call')
  if (factType === 'scheduled_calendar_event') return t('日程', 'Calendar event')
  if (factType === 'shared_route') return t('共同路线', 'Shared route')
  if (factType === 'shared_transfer') return t('共同转账', 'Shared transfer')
  if (factType === 'shared_meal') return t('共同用餐', 'Shared meal')
  if (factType === 'gift_purchased') return t('礼物购买', 'Gift purchase')
  return factType || t('关系事件', 'Relationship fact')
}

const memoryReviewStatusLabel = (status) => {
  if (status === RELATIONSHIP_MEMORY_REVIEW_STATES.PINNED) return t('置顶', 'Pinned')
  if (status === RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED) return t('归档', 'Archived')
  return t('活跃', 'Active')
}

const formatRelationshipAuditTimestamp = (value) => {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return t('时间未标记', 'Time not recorded')
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(timestamp)
}

const {
  selectedMemorySourceAudit,
  selectedMemoryEventTimeline,
  selectedMemoryHeadlineFacts,
} = useContactsMemoryDetailModel({
  selectedMemoryDetail,
  t,
  getCleanupHandlers: () => relationshipSourceCleanupHandlers.value,
  formatSourceModuleLabel: (sourceModule) => relationshipSourceModuleLabel(sourceModule),
  formatFactTypeLabel: (factType) => relationshipFactTypeLabel(factType),
  formatReviewStatusLabel: (status) => memoryReviewStatusLabel(status),
  formatAuditTimestamp: (value) => formatRelationshipAuditTimestamp(value),
  formatSourceModuleSummary: (sourceModuleCounts) => sourceModuleSummaryText(sourceModuleCounts),
})

const {
  selectedDetailSectionRows,
  roleDetailPolicyText,
  detailItemsForSection,
  detailItemStatsForSection,
  roleDetailSourceLabel,
  roleDetailSourceHint,
} = useContactsDetailSectionModel({
  selectedProfile,
  t,
  listDetailItemsForSection: (profile, section) =>
    profile?.id ? chatStore.listRoleDetailItems(profile.id, section) : [],
})

const {
  selectedLinkedActivityEntries,
  selectedLinkedActivitySummary,
} = useContactsLinkedActivityModel({
  selectedProfile,
  selectedRelationshipSnapshot,
  t,
  listDetailItemsForSection: (profile, section) => detailItemsForSection(profile, section),
  formatSourceModuleLabel: (sourceModule) => relationshipSourceModuleLabel(sourceModule),
  formatSourceModuleSummary: (sourceModuleCounts) => sourceModuleSummaryText(sourceModuleCounts),
  formatMemoryReviewSummary: (memory) => relationshipMemoryReviewSummaryText(memory),
})

const contactsEntityTypeLabel = (entityType) => formatContactsEntityTypeLabel(entityType, t)

const {
  selectedRoleHubStats,
  selectedChatStateDetail,
  selectedChatSocialSnapshot,
  selectedRoleHubCards,
} = useContactsRoleHubModel({
  selectedProfile,
  selectedProfileEntityType,
  selectedProfileValues,
  selectedProfileChatBound,
  selectedRoleChatContact,
  selectedRelationshipSnapshot,
  selectedLinkedActivitySummary,
  t,
  getDetailItemStatsForSection: (profile, section) => detailItemStatsForSection(profile, section),
  getContactChatSocialState: (contact) => chatStore.getContactChatSocialState(contact),
  formatAuditTimestamp: (value) => formatRelationshipAuditTimestamp(value),
  formatEntityTypeLabel: (entityType) => contactsEntityTypeLabel(entityType),
})

const openSelectedChatTarget = () => {
  const contact = selectedRoleChatContact.value
  if (contact?.id) router.push(`/chat/${contact.id}`)
}

const openChatDirectory = () => {
  router.push('/chat-contacts')
}

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const getNextRoleIdDraft = () => {
  const maxRoleIdNumber = roleProfiles.value.reduce((max, profile) => {
    const match = normalizeRoleId(profile?.roleId || profile?.id).match(/^(\d+)/)
    const numeric = match ? Number(match[1]) : 0
    return Math.max(max, Number.isFinite(numeric) ? numeric : 0)
  }, 0)
  let next = String(Math.max(1, maxRoleIdNumber + 1))
  while (!chatStore.isRoleIdAvailable(next, editingProfileId.value)) {
    next = String(Number(next) + 1)
  }
  return next
}

const selectProfile = (profile) => {
  if (!profile?.id) return
  selectedProfileId.value = Number(profile.id)
  dangerIncludeLinkedRecords.value = false
  selectedMemoryKey.value = ''
}

const selectMemoryGroup = (memory) => {
  selectedMemoryKey.value = memory?.memoryKey || ''
}

const openLinkedMemoryFromDetailItem = (item) => {
  if (!item?.memoryKey) return
  selectedMemoryKey.value = item.memoryKey
}

const updateSelectedMemoryReview = (updates = {}) => {
  const profile = selectedProfile.value
  const memory = selectedMemoryDetail.value
  if (!profile?.id || !memory?.memoryKey) return
  const updated = relationshipRuntimeStore.updateMemoryReviewForTarget(
    profileRelationshipTarget(profile),
    memory.memoryKey,
    updates,
  )
  if (!updated) {
    setUiNotice('error', t('记忆管理状态保存失败。', 'Failed to save memory review state.'))
    return
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'note')) {
    memoryReviewDraft.value = updated.note || ''
  }
  setUiNotice('success', t('记忆管理状态已更新。', 'Memory review state updated.'))
}

const saveSelectedMemoryReviewNote = () => {
  updateSelectedMemoryReview({ note: memoryReviewDraft.value.trim() })
}

const startEditingManualDetailItem = (item) => {
  if (!item?.id || item.sourceKind !== ROLE_DETAIL_SOURCE_KINDS.MANUAL) return
  editingDetailItemId.value = item.id
  detailEditDraft.title = item.title || ''
  detailEditDraft.detail = item.detail || ''
}

const cancelEditingManualDetailItem = () => {
  editingDetailItemId.value = ''
  detailEditDraft.title = ''
  detailEditDraft.detail = ''
}

const saveManualDetailItemEdit = (item) => {
  const profile = selectedProfile.value
  if (!profile?.id || !item?.id) return
  const title = detailEditDraft.title.trim()
  const detail = detailEditDraft.detail.trim()
  if (!title && !detail) {
    setUiNotice('warning', t('请至少保留标题或内容。', 'Keep a title or detail.'))
    return
  }
  const updated = chatStore.updateRoleDetailItem(profile.id, item.id, {
    title,
    detail,
  })
  if (!updated) {
    setUiNotice('error', t('条目保存失败。', 'Failed to save entry.'))
    return
  }
  cancelEditingManualDetailItem()
  setUiNotice('success', t('条目已更新。', 'Entry updated.'))
}

const clearProfileTemplateDraftRecord = (record) => {
  Object.keys(record).forEach((key) => {
    delete record[key]
  })
}

const resetProfileTemplateDraftValues = (templateId = profileTemplateDraft.templateId) => {
  clearProfileTemplateDraftRecord(profileTemplateDraft.values)
  clearProfileTemplateDraftRecord(profileTemplateDraft.visibility)
  const template = templateId ? systemStore.getProfileTemplateById(templateId) : null
  const fields = Array.isArray(template?.fields)
    ? template.fields.filter(fieldMatchesSelectedProfileEntity)
    : []
  fields.forEach((field) => {
    const existing = selectedProfileValueMap.value.get(field.id)
    profileTemplateDraft.values[field.id] = formatProfileValue(existing)
    profileTemplateDraft.visibility[field.id] =
      existing?.visibilityLevel || field.defaultVisibilityLevel || PROFILE_VISIBILITY_LEVELS.FAMILIAR
  })
}

const setProfileTemplateDraftTemplate = (templateId = '') => {
  profileTemplateDraft.templateId = templateId
  resetProfileTemplateDraftValues(templateId)
  profileTemplateAiDraftStatus.value = ''
  profileTemplateAdaptationStatus.value = ''
}

const openProfileTemplateEditor = () => {
  if (!selectedProfile.value?.id) return
  const currentTemplateId = selectedProfile.value.templateLink?.profileTemplateId || ''
  const fallbackTemplateId = contactsProfileTemplateOptions.value[0]?.id || ''
  setProfileTemplateDraftTemplate(currentTemplateId || fallbackTemplateId)
  isProfileTemplateEditorOpen.value = true
}

const cancelProfileTemplateEditor = () => {
  isProfileTemplateEditorOpen.value = false
  profileTemplateDraft.templateId = ''
  clearProfileTemplateDraftRecord(profileTemplateDraft.values)
  clearProfileTemplateDraftRecord(profileTemplateDraft.visibility)
  profileTemplateAiDraftStatus.value = ''
  profileTemplateAdaptationStatus.value = ''
}

const serializeProfileTemplateDraftValue = (field = {}) => {
  const raw = profileTemplateDraft.values[field.id]
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS) {
    return String(raw || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return String(raw || '').trim()
}

const isEmptyProfileTemplateValue = (value) =>
  Array.isArray(value) ? value.length === 0 : !String(value || '').trim()

const formatProfileTemplateSuggestionForDraft = (field = {}, value = '') => {
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS) {
    return Array.isArray(value) ? value.join(', ') : String(value || '')
  }
  return Array.isArray(value) ? value.join(', ') : String(value || '')
}

const draftProfileTemplateValuesWithAI = async () => {
  const profile = selectedProfile.value
  const template = profileTemplateDraftTemplate.value
  if (!profile?.id || !template?.id) {
    setUiNotice('warning', t('请先选择一个世界档案模板。', 'Choose a world profile template first.'))
    return
  }
  const fields = profileTemplateDraftFields.value
  if (fields.length <= 0) {
    setUiNotice('warning', t('当前模板没有可起草字段。', 'This template has no fields to draft.'))
    return
  }

  profileTemplateAiDraftBusy.value = true
  profileTemplateAiDraftStatus.value = ''
  try {
    const result = await suggestProfileTemplateValues({
      template: {
        ...template,
        fields,
      },
      profile,
      user: user.value,
      existingValues: selectedProfileValues.value,
      settings: settings.value,
      callAi: callAI,
    })
    if (!result.ok) {
      profileTemplateAiDraftStatus.value = t(
        'AI 暂时没有生成可用草稿。',
        'AI did not return usable draft values yet.',
      )
      setUiNotice('warning', profileTemplateAiDraftStatus.value)
      return
    }

    const fieldMap = new Map(fields.map((field) => [field.id, field]))
    let appliedCount = 0
    let keptCount = 0
    result.suggestions.forEach((suggestion) => {
      const field = fieldMap.get(suggestion.fieldId)
      if (!field) return
      const existingSaved = selectedProfileValueMap.value.get(field.id)
      const currentDraftValue = profileTemplateDraft.values[field.id]
      if (!isEmptyProfileTemplateValue(existingSaved?.value) || !isEmptyProfileTemplateValue(currentDraftValue)) {
        keptCount += 1
        return
      }
      profileTemplateDraft.values[field.id] = formatProfileTemplateSuggestionForDraft(field, suggestion.value)
      profileTemplateDraft.visibility[field.id] =
        profileTemplateDraft.visibility[field.id] ||
        field.defaultVisibilityLevel ||
        PROFILE_VISIBILITY_LEVELS.FAMILIAR
      appliedCount += 1
    })

    profileTemplateAiDraftStatus.value = t(
      `AI 已填入 ${appliedCount} 个草稿字段，保留 ${keptCount} 个已有值。`,
      `AI filled ${appliedCount} draft field(s) and kept ${keptCount} existing value(s).`,
    )
    setUiNotice(
      appliedCount > 0 ? 'success' : 'warning',
      profileTemplateAiDraftStatus.value,
    )
  } catch (error) {
    profileTemplateAiDraftStatus.value = t(
      'AI 起草失败，请检查模型设置后重试。',
      'AI drafting failed. Check model settings and try again.',
    )
    setUiNotice('error', `${profileTemplateAiDraftStatus.value} ${error?.message || ''}`.trim())
  } finally {
    profileTemplateAiDraftBusy.value = false
  }
}

const draftProfileTemplateAdaptationWithAI = async () => {
  const profile = selectedProfile.value
  const review = selectedProfileTemplateAdaptationReview.value
  const targetTemplate = review?.recommendedTemplate
  if (!profile?.id || !targetTemplate?.id) {
    setUiNotice('warning', t('当前没有可适配的世界模板。', 'No world template is available for adaptation.'))
    return
  }

  const targetFields = Array.isArray(targetTemplate.fields)
    ? targetTemplate.fields.filter(fieldMatchesSelectedProfileEntity)
    : []
  if (targetFields.length <= 0) {
    setUiNotice('warning', t('推荐模板没有适用于当前人物类型的字段。', 'The recommended template has no fields for this profile type.'))
    return
  }

  isProfileTemplateEditorOpen.value = true
  setProfileTemplateDraftTemplate(targetTemplate.id)
  profileTemplateAdaptationBusy.value = true
  profileTemplateAiDraftStatus.value = ''
  profileTemplateAdaptationStatus.value = ''
  try {
    const result = await adaptProfileTemplateValues({
      sourceTemplate: selectedProfileTemplate.value || {
        id: review.currentTemplateId,
        title: review.currentTemplateTitle,
        version: review.currentTemplateVersion,
        fields: [],
      },
      targetTemplate: {
        ...targetTemplate,
        fields: targetFields,
      },
      profile,
      user: user.value,
      existingValues: selectedProfileValues.value,
      settings: settings.value,
      callAi: callAI,
    })

    if (!result.ok) {
      profileTemplateAdaptationStatus.value = t(
        '已打开适配预览，但 AI 暂时没有生成可用草稿。',
        'The adaptation review is open, but AI did not return usable draft values yet.',
      )
      profileTemplateAiDraftStatus.value = profileTemplateAdaptationStatus.value
      setUiNotice('warning', profileTemplateAdaptationStatus.value)
      return
    }

    const fieldMap = new Map(targetFields.map((field) => [field.id, field]))
    let appliedCount = 0
    let keptCount = 0
    result.suggestions.forEach((suggestion) => {
      const field = fieldMap.get(suggestion.fieldId)
      if (!field) return
      const existingSaved = selectedProfileValueMap.value.get(field.id)
      const currentDraftValue = profileTemplateDraft.values[field.id]
      if (!isEmptyProfileTemplateValue(existingSaved?.value) || !isEmptyProfileTemplateValue(currentDraftValue)) {
        keptCount += 1
        return
      }
      profileTemplateDraft.values[field.id] = formatProfileTemplateSuggestionForDraft(field, suggestion.value)
      profileTemplateDraft.visibility[field.id] =
        profileTemplateDraft.visibility[field.id] ||
        field.defaultVisibilityLevel ||
        PROFILE_VISIBILITY_LEVELS.FAMILIAR
      appliedCount += 1
    })

    profileTemplateAdaptationStatus.value = t(
      `AI 已生成适配草稿：填入 ${appliedCount} 个新字段，保留 ${keptCount} 个已有值。请检查后保存。`,
      `AI drafted the adaptation: filled ${appliedCount} new field(s) and kept ${keptCount} existing value(s). Review before saving.`,
    )
    profileTemplateAiDraftStatus.value = profileTemplateAdaptationStatus.value
    setUiNotice(appliedCount > 0 ? 'success' : 'warning', profileTemplateAdaptationStatus.value)
  } catch (error) {
    profileTemplateAdaptationStatus.value = t(
      'AI 适配失败，请检查模型设置后重试。',
      'AI adaptation failed. Check model settings and try again.',
    )
    profileTemplateAiDraftStatus.value = profileTemplateAdaptationStatus.value
    setUiNotice('error', `${profileTemplateAdaptationStatus.value} ${error?.message || ''}`.trim())
  } finally {
    profileTemplateAdaptationBusy.value = false
  }
}

const saveProfileTemplateValues = () => {
  const profile = selectedProfile.value
  const template = profileTemplateDraftTemplate.value
  if (!profile?.id || !template?.id) {
    setUiNotice('warning', t('请先选择一个世界档案模板。', 'Choose a world profile template first.'))
    return
  }
  const fields = profileTemplateDraftFields.value
  const preservedValues = profileTemplateDraftPreservedValues.value
  const nextValues = fields
    .map((field) => {
      const value = serializeProfileTemplateDraftValue(field)
      if (isEmptyProfileTemplateValue(value)) return null
      return {
        fieldId: field.id,
        value,
        visibilityLevel:
          profileTemplateDraft.visibility[field.id] ||
          field.defaultVisibilityLevel ||
          PROFILE_VISIBILITY_LEVELS.FAMILIAR,
        sourceKind: PROFILE_VALUE_SOURCE_KINDS.MANUAL,
      }
    })
    .filter(Boolean)
  const ok = chatStore.updateRoleProfile(profile.id, {
    templateLink: {
      primaryWorldId:
        template.scope === PROFILE_TEMPLATE_SCOPES.WORLD
          ? template.worldId || currentContactsWorldId.value
          : '',
      profileTemplateId: template.id,
      profileTemplateVersion: template.version || 1,
      supplementalKnowledgePointIds: profile.templateLink?.supplementalKnowledgePointIds || [],
    },
    profileValues: [...preservedValues, ...nextValues],
  })
  if (!ok) {
    setUiNotice('error', t('世界字段保存失败。', 'World fields failed to save.'))
    return
  }
  isProfileTemplateEditorOpen.value = false
  profileTemplateAiDraftStatus.value = ''
  profileTemplateAdaptationStatus.value = ''
  setUiNotice('success', t('世界字段已保存到角色档案。', 'World fields saved to the role profile.'))
}

const openWorldBookProfileTemplates = () => {
  router.push('/worldbook')
}

const upgradeSelectedNpcToMainRole = async () => {
  const profile = selectedProfile.value
  if (!profile || profile.entityType !== CONTACTS_ENTITY_TYPES.NPC) return
  const confirmed = await confirmDialog({
    title: t('Upgrade to main role', 'Upgrade to main role'),
    message: t(
      'This preserves the NPC profile, linked activity, and existing chat binding while unlocking main-role capabilities. Lightweight relationship is used by default.',
      'This preserves the NPC profile, linked activity, and existing chat binding while unlocking main-role capabilities. Lightweight relationship is used by default.',
    ),
    confirmText: t('Upgrade', 'Upgrade'),
    cancelText: t('Cancel', 'Cancel'),
    tone: 'primary',
  })
  if (!confirmed) return
  const upgraded = chatStore.upgradeNpcToMainRole(profile.id, {
    relationshipMode: 'lightweight',
  })
  if (upgraded) {
    setUiNotice('success', t('NPC upgraded to main role.', 'NPC upgraded to main role.'))
    chatStore.saveNow?.()
  }
}

const addManualDetailItem = (section) => {
  const profile = selectedProfile.value
  const draft = detailDrafts[section]
  if (!profile?.id || !draft) return
  const title = draft.title.trim()
  const detail = draft.detail.trim()
  if (!title && !detail) {
    setUiNotice('warning', t('请先填写条目标题或内容。', 'Enter a title or detail first.'))
    return
  }
  const created = chatStore.addRoleDetailItem(profile.id, section, {
    sourceKind: ROLE_DETAIL_SOURCE_KINDS.MANUAL,
    title,
    detail,
  })
  if (!created) {
    setUiNotice('error', t('条目添加失败。', 'Failed to add entry.'))
    return
  }
  draft.title = ''
  draft.detail = ''
  setUiNotice('success', t('条目已添加。', 'Entry added.'))
}

const removeManualDetailItem = async (item) => {
  const profile = selectedProfile.value
  if (!profile?.id || !item?.id) return
  if (item.sourceKind !== ROLE_DETAIL_SOURCE_KINDS.MANUAL) {
    setUiNotice(
      'warning',
      t('事件挂载条目需要通过删除对应记忆或重置关系来清理。', 'Event-attached entries are cleared by deleting the linked memory or resetting the relationship.'),
    )
    return
  }
  const ok = await confirmDialog({
    title: t('删除手动条目', 'Delete manual entry'),
    message: item.title || item.detail || t('确认删除该条目？', 'Delete this entry?'),
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return
  chatStore.removeRoleDetailItem(profile.id, item.id)
  setUiNotice('success', t('条目已删除。', 'Entry deleted.'))
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

const { selectedProfileHeader } = useContactsProfileHeaderModel({
  selectedProfile,
  selectedProfileChatBound,
  t,
  getAvatarUrl: (profile) => contactAvatarUrl(profile),
  formatRoleId: (roleId, id) => normalizeRoleId(roleId, id),
})

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
  profileDraft.roleId = getNextRoleIdDraft()
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
  profileDraft.roleId = normalizeRoleId(profile.roleId, profile.id)
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
  const roleId = normalizeRoleId(profileDraft.roleId)
  const excludedProfileId = profileModalMode.value === 'edit' ? editingProfileId.value : 0
  if (!isValidRoleId(roleId)) {
    setUiNotice('error', t('角色 ID 需以数字开头，可附加英文字母。', 'Role ID must start with numbers and may append letters.'))
    return
  }
  if (!chatStore.isRoleIdAvailable(roleId, excludedProfileId)) {
    setUiNotice('error', t('角色 ID 已存在，请更换。', 'Role ID already exists. Choose another one.'))
    return
  }

  const payload = {
    roleId,
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
    const created = chatStore.addRoleProfile({
      ...payload,
    })
    if (!created) {
      setUiNotice('error', t('角色档案创建失败，请检查角色 ID。', 'Role profile creation failed. Check the role ID.'))
      return
    }
    selectProfile(created)
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

const sourceModuleSummaryText = (sourceModuleCounts = {}) => {
  return formatSourceModuleSummaryText(sourceModuleCounts, t)
}

const cleanupCoverageText = (sourceModuleCounts = {}) => {
  return formatCleanupCoverageText(sourceModuleCounts, relationshipSourceCleanupHandlers.value, t)
}

const cleanupResultSummaryText = (cleanupResult) => {
  return formatCleanupResultSummaryText(cleanupResult, t)
}

const relationshipSourceCleanupHandlers = computed(() =>
  createRelationshipSourceCleanupHandlers({
    phoneStore,
    shoppingStore,
    foodDeliveryStore,
    walletStore,
    calendarStore,
    mapStore,
    t,
  }),
)

const confirmTypedRole = async (profile, title, message) => {
  const expected = normalizeRoleId(profile?.roleId, profile?.id)
  const input = await promptDialog({
    title,
    message,
    inputLabel: t('输入角色 ID 确认', 'Type role ID to confirm'),
    inputPlaceholder: expected,
    inputRequired: true,
    confirmText: t('确认', 'Confirm'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
    validate: (value) =>
      normalizeRoleId(value) === expected
        ? ''
        : t('输入的角色 ID 不一致。', 'Role ID does not match.'),
  })
  return input !== null
}

const resetSelectedRelationship = async () => {
  const profile = selectedProfile.value
  if (!profile?.id) return
  const firstOk = await confirmDialog({
    title: t('重置关系进度', 'Reset relationship progress'),
    message: t(
      '该操作会保留角色档案，但清除关系指标、阶段、里程碑、成长特征、记忆组、事件挂载详情和聊天记录。',
      'This keeps the role profile but clears metrics, stage, milestones, growth traits, memories, event-attached details, and chat history.',
    ),
    details: resetRelationshipDialogDetails.value,
    confirmText: t('继续', 'Continue'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!firstOk) return
  const typedOk = await confirmTypedRole(
    profile,
    t('确认重置关系', 'Confirm relationship reset'),
    t('为避免误操作，请输入该角色 ID。', 'Type this role ID to avoid accidental reset.'),
  )
  if (!typedOk) return
  const result = resetRoleRelationshipState({
    chatStore,
    relationshipRuntimeStore,
    profile,
    includeLinkedRecords: true,
    cleanupHandlers: relationshipSourceCleanupHandlers.value,
  })
  if (!result.ok) {
    setUiNotice('warning', t('没有可重置的关系进度。', 'No relationship state to reset.'))
    return
  }
  setUiNotice(
    'success',
    [t('关系进度已重置。', 'Relationship progress reset.'), cleanupResultSummaryText(result.cleanupResult)]
      .filter(Boolean)
      .join(' '),
  )
}

const deleteSelectedProfile = async () => {
  const profile = selectedProfile.value
  if (!profile?.id) return
  const firstOk = await confirmDialog({
    title: t('删除角色档案', 'Delete role profile'),
    message: t(
      '该操作不可撤销，会删除 Contacts 档案、Chat Directory 绑定、该角色聊天记录、关系进度和记忆组。',
      'This cannot be undone. It deletes the Contacts profile, Chat Directory binding, role chat history, relationship progress, and memories.',
    ),
    details: deleteRoleProfileDialogDetails.value,
    confirmText: t('继续', 'Continue'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!firstOk) return
  const scopeOk = await confirmDialog({
    title: t('确认删除范围', 'Confirm delete scope'),
    message: t(
      '请再次确认这次删除会跨越 Contacts、Chat Directory、聊天记录和关系运行时数据。',
      'Confirm this deletion crosses Contacts, Chat Directory, chat history, and relationship runtime data.',
    ),
    details: deleteRoleScopeDialogDetails.value,
    confirmText: t('继续输入 ID', 'Continue to ID'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!scopeOk) return
  const typedOk = await confirmTypedRole(
    profile,
    t('确认删除角色', 'Confirm role deletion'),
    t('为避免误操作，请输入该角色 ID。', 'Type this role ID to avoid accidental deletion.'),
  )
  if (!typedOk) return
  const result = deleteRoleProfileCascade({
    chatStore,
    relationshipRuntimeStore,
    profile,
    includeLinkedRecords: dangerIncludeLinkedRecords.value,
    cleanupHandlers: relationshipSourceCleanupHandlers.value,
  })
  if (!result.ok) {
    setUiNotice('error', t('删除失败，请重试。', 'Delete failed, please retry.'))
    return
  }
  selectedProfileId.value = roleProfiles.value[0]?.id || 0
  dangerIncludeLinkedRecords.value = false
  setUiNotice('success', t('角色档案已删除。', 'Role profile deleted.'))
}

const deleteMemoryGroup = async (memory) => {
  const profile = selectedProfile.value
  if (!profile?.id || !memory?.memoryKey) return
  const detail = memory.events
    ? memory
    : relationshipRuntimeStore.getMemoryGroupDetail(
        profileRelationshipTarget(profile),
        memory.memoryKey,
      )
  const ok = await confirmDialog({
    title: t('删除记忆组', 'Delete memory group'),
    message: memoryDeletePreviewMessage(memory, detail),
    details: memoryDeletePreviewDetails(memory, detail),
    confirmText: t('继续', 'Continue'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return
  const finalOk = await confirmDialog({
    title: t('确认删除记忆组', 'Confirm memory deletion'),
    message: t(
      '将删除该记忆组、直接挂载的关系事件和事件挂载详情。',
      'This deletes this memory group, directly attached relationship events, and event-attached details.',
    ),
    details: memoryDeleteFinalDetails(memory),
    confirmText: t('删除记忆组', 'Delete memory'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!finalOk) return
  const result = deleteRoleMemoryGroup({
    chatStore,
    relationshipRuntimeStore,
    profile,
    memoryKey: memory.memoryKey,
    includeLinkedRecords: true,
    cleanupHandlers: relationshipSourceCleanupHandlers.value,
  })
  if (!result.ok) {
    setUiNotice('warning', t('未找到对应记忆组。', 'Memory group not found.'))
    return
  }
  if (selectedMemoryKey.value === memory.memoryKey) selectedMemoryKey.value = ''
  setUiNotice(
    'success',
    [t('记忆组已删除。', 'Memory group deleted.'), cleanupResultSummaryText(result.cleanupResult)]
      .filter(Boolean)
      .join(' '),
  )
}

const profileKnowledgeSummary = (profile) => {
  const count = Array.isArray(profile?.knowledgePointIds) ? profile.knowledgePointIds.length : 0
  if (count <= 0) return t('未绑定知识点', 'No knowledge points bound')
  return t(`知识点 ${count} 条`, `${count} knowledge points`)
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

const relationshipStageLabel = (stage) => {
  if (stage === 'intimate') return t('亲密', 'Intimate')
  if (stage === 'close') return t('亲近', 'Close')
  if (stage === 'friend') return t('朋友', 'Friend')
  if (stage === 'acquaintance') return t('熟人', 'Acquaintance')
  if (stage === 'distant') return t('疏远', 'Distant')
  if (stage === 'conflict') return t('冲突', 'Conflict')
  return t('陌生/未展开', 'Stranger / unset')
}

const {
  selectedDangerImpactText,
  resetRelationshipDialogDetails,
  deleteRoleProfileDialogDetails,
  deleteRoleScopeDialogDetails,
  dangerIncludeLinkedRecordsText,
  memoryDeletePreviewMessage,
  memoryDeletePreviewDetails,
  memoryDeleteFinalDetails,
} = useContactsDangerZoneModel({
  selectedProfile,
  selectedRelationshipSnapshot,
  selectedDeleteImpact,
  dangerIncludeLinkedRecords,
  t,
  formatRoleId: (roleId, id) => normalizeRoleId(roleId, id),
  formatRelationshipStageLabel: (stage) => relationshipStageLabel(stage),
  formatSourceModuleSummary: (sourceModuleCounts) => sourceModuleSummaryText(sourceModuleCounts),
  formatCleanupCoverage: (sourceModuleCounts) => cleanupCoverageText(sourceModuleCounts),
})

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

const profileRelationshipArchiveHint = (snapshot = null) => {
  if (!snapshot?.exists) return ''
  if (snapshot.hasArchivedOnlyMemories !== true) return ''
  return t(
    '当前只剩归档记忆，默认摘要已隐藏。',
    'Only archived memories remain, so the default summary is hidden.',
  )
}

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
  const memorySummary =
    relationshipMemoryReviewSummaryText(snapshot.primaryMemory) ||
    snapshot.primaryMemory?.recallSummary ||
    snapshot.primaryMemory?.displaySummary ||
    snapshot.primaryMemory?.primarySummary ||
    snapshot.primaryMemory?.latestSummary ||
    ''
  if (memorySummary) {
    return t(
      `共同记忆：${memorySummary}`,
      `Shared memory: ${memorySummary}`,
    )
  }
  const milestone = snapshot.milestones?.[0]?.label || ''
  if (milestone) return t(`最近里程碑：${milestone}`, `Latest milestone: ${milestone}`)
  const archiveHint = profileRelationshipArchiveHint(snapshot)
  if (archiveHint) return archiveHint
  if (snapshot.latestEventSummary) {
    return t(`最近关系事件：${snapshot.latestEventSummary}`, `Latest relationship event: ${snapshot.latestEventSummary}`)
  }
  return t('已有关系记录，等待更多事件沉淀。', 'Relationship record exists; waiting for more events.')
}

const contactWorldFieldCount = (profile = {}) =>
  Array.isArray(profile.profileValues) ? profile.profileValues.filter((value) => value?.fieldId).length : 0

const contactEventAttachedCount = (profile = {}) =>
  profile?.id
    ? Object.values(ROLE_DETAIL_SECTIONS).reduce(
        (sum, section) => sum + detailItemStatsForSection(profile, section).eventAttached,
        0,
      )
    : 0

const contactIsChatBound = (profile = {}) =>
  profile?.id ? chatStore.isRoleProfileBound(profile.id) : false

const {
  selfProfiles,
  isContactsSearchActive,
  filteredSelfProfiles,
  filteredMainProfiles,
  filteredNpcProfiles,
  recentInteractionContacts,
  contactRecentSourceLabel,
} = useContactsHomeListModel({
  roleProfiles,
  contactsSearchQuery,
  t,
  isChatBound: contactIsChatBound,
  getRelationshipSnapshot: profileRelationshipSnapshot,
  getEventAttachedCount: contactEventAttachedCount,
  formatEntityTypeLabel: contactsEntityTypeLabel,
})

const contactListStatusHint = (profile = {}) => {
  if (profile.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
    const worldFieldCount = contactWorldFieldCount(profile)
    return worldFieldCount > 0
      ? t(`世界字段 ${worldFieldCount} 项`, `${worldFieldCount} world field(s)`)
      : t('世界中的用户档案', 'Your profile in this world')
  }
  const walletSummary = walletStore.summarizeCounterpartyLedger(profile?.name || '')
  if (walletSummary.count > 0) return profileWalletLedgerSummary(profile)
  const snapshot = profileRelationshipSnapshot(profile)
  if (snapshot?.totalMemoryCount > 0) return profileRelationshipLatestSummary(profile)
  const worldFieldCount = contactWorldFieldCount(profile)
  if (worldFieldCount > 0) return t(`世界字段 ${worldFieldCount} 项`, `${worldFieldCount} world field(s)`)
  if (contactIsChatBound(profile)) return t('已进入 Chat', 'Chat target')
  const knowledgeSummary = profileKnowledgeSummary(profile)
  return knowledgeSummary || t('仅在通讯录', 'Contacts only')
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

watch(
  roleProfiles,
  (profiles) => {
    if (profiles.some((profile) => Number(profile.id) === Number(selectedProfileId.value))) return
    selectedProfileId.value = profiles[0]?.id || 0
  },
  { immediate: true },
)

watch(
  () => selectedProfile.value?.id,
  () => {
    resetRelationshipPremiseDraft()
    cancelProfileTemplateEditor()
  },
  { immediate: true },
)

watch(
  visibleMemoryGroups,
  (groups) => {
    if (groups.some((memory) => memory.memoryKey === selectedMemoryKey.value)) return
    selectedMemoryKey.value = groups[0]?.memoryKey || ''
  },
  { immediate: true },
)

watch(
  selectedMemoryDetail,
  (detail) => {
    memoryReviewDraft.value = detail?.reviewNote || ''
  },
  { immediate: true },
)

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
      data-testid="contacts-relationship-classification-status"
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

    <div
      v-if="showProfileModal"
      class="contacts-modal absolute inset-0 bg-white z-20 pt-12 px-4 flex flex-col animate-slide-in"
      data-testid="contacts-profile-modal"
    >
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
          data-testid="contacts-profile-role-id"
          v-model="profileDraft.roleId"
          :placeholder="t('角色 ID（数字开头，可附加字母）', 'Role ID (starts with numbers, letters allowed)')"
          class="w-full border-b py-2 outline-none"
        />

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
      <div class="contacts-top-stack px-4 py-3">
        <label class="contacts-search" data-testid="contacts-search">
          <i class="fas fa-search" aria-hidden="true"></i>
          <input
            v-model="contactsSearchQuery"
            data-testid="contacts-search-input"
            type="search"
            :placeholder="t('搜索姓名、角色 ID 或世界字段', 'Search name, role ID, or world fields')"
            :aria-label="t('搜索联系人', 'Search contacts')"
          />
        </label>
      </div>

      <section
        v-if="isWorldBookProfileTemplateHandoff"
        class="contacts-worldbook-handoff mx-4 mb-3"
        data-testid="contacts-worldbook-template-handoff"
      >
        <div class="contacts-worldbook-handoff__copy">
          <p>{{ t('来自世界书', 'From WorldBook') }}</p>
          <h2>{{ t('选择或新建角色档案', 'Select or create a profile') }}</h2>
          <span>
            {{
              t(
                '世界书已经准备这个世界需要的资料栏位；具体某个角色、用户档案或 NPC 的值，在通讯录的人物档案里维护。',
                'WorldBook prepares the fields this world needs; maintain concrete values for each role, self profile, or NPC in Contacts.',
              )
            }}
          </span>
        </div>
        <button
          type="button"
          class="contacts-worldbook-handoff__action"
          data-testid="contacts-worldbook-template-create-profile"
          @click="openCreateProfile"
        >
          <i class="fas fa-plus" aria-hidden="true"></i>
          {{ t('新建角色档案', 'New profile') }}
        </button>
      </section>

      <div class="contacts-list px-4">
        <section class="contacts-list-section contacts-my-profile-section" data-testid="contacts-my-profile-section">
          <div class="contacts-section-title">
            <span>{{ t('我的档案', 'My Profile') }}</span>
          </div>
          <div
            v-if="selfProfiles.length === 0"
            class="contacts-my-card"
          >
            <div class="contacts-avatar contacts-avatar-large">
              <img
                :src="user.avatar || fallbackAvatarUrl(user.name)"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="contacts-row-name">{{ user.name }}</p>
              <p class="contacts-row-meta">{{ t('当前用户名片', 'Current user card') }}</p>
              <p class="contacts-row-hint">{{ t('可在通讯录中创建自我档案后填写世界字段。', 'Create a self profile in Contacts to fill world fields.') }}</p>
            </div>
          </div>
          <div
            v-for="contact in selfProfiles"
            :key="contact.id"
            class="contacts-row contacts-row-self"
            role="button"
            tabindex="0"
            :class="Number(selectedProfileId) === Number(contact.id) ? 'contacts-row-active' : ''"
            :data-testid="`contacts-row-${contact.id}`"
            @click="selectProfile(contact)"
            @keydown.enter="selectProfile(contact)"
          >
            <div class="contacts-avatar">
              <img
                :src="contactAvatarUrl(contact)"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="contacts-row-copy">
              <p class="contacts-row-name">{{ contact.name }}</p>
              <p class="contacts-row-meta">{{ t('Self Profile', 'Self Profile') }} · ID {{ normalizeRoleId(contact.roleId, contact.id) }}</p>
              <p class="contacts-row-hint">{{ contactListStatusHint(contact) }}</p>
            </div>
            <button type="button" @click.stop="openEditProfile(contact)" class="contacts-row-edit">{{ t('编辑', 'Edit') }}</button>
            <i class="fas fa-chevron-right contacts-row-chevron" aria-hidden="true"></i>
          </div>
        </section>

        <section
          v-if="!isContactsSearchActive && recentInteractionContacts.length > 0"
          class="contacts-recent-section"
          data-testid="contacts-recent-interactions"
        >
          <div class="contacts-section-title">
            <span>{{ t('最近互动', 'Recent interactions') }}</span>
          </div>
          <div class="contacts-recent-strip">
            <button
              v-for="item in recentInteractionContacts"
              :key="`recent-${item.profile.id}`"
              type="button"
              class="contacts-recent-person"
              :data-testid="`contacts-recent-${item.profile.id}`"
              @click="selectProfile(item.profile)"
            >
              <span class="contacts-avatar contacts-recent-avatar">
                <img :src="contactAvatarUrl(item.profile)" class="w-full h-full object-cover" />
              </span>
              <span class="contacts-recent-name">{{ item.profile.name }}</span>
              <span class="contacts-recent-source">{{ contactRecentSourceLabel(item.profile) }}</span>
            </button>
          </div>
        </section>

        <section class="contacts-list-section" data-testid="contacts-section-main">
          <div class="contacts-section-title">
            <span>{{ t('主要角色', 'Main Roles') }}</span>
            <small>{{ filteredMainProfiles.length }}</small>
          </div>
          <div
            v-for="contact in filteredMainProfiles"
            :key="contact.id"
            class="contacts-row"
            role="button"
            tabindex="0"
            :class="Number(selectedProfileId) === Number(contact.id) ? 'contacts-row-active' : ''"
            :data-testid="`contacts-row-${contact.id}`"
            @click="selectProfile(contact)"
            @keydown.enter="selectProfile(contact)"
          >
            <div class="contacts-avatar">
              <img
                :src="contactAvatarUrl(contact)"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="contacts-row-copy">
              <p class="contacts-row-name">{{ contact.name }}</p>
              <p class="contacts-row-meta">{{ contact.role || t('未设置角色', 'Role not set') }} · ID {{ normalizeRoleId(contact.roleId, contact.id) }}</p>
              <p class="contacts-row-hint">{{ contactListStatusHint(contact) }}</p>
              <p
                class="contacts-row-status"
                :data-testid="`contacts-relationship-summary-${contact.id}`"
              >
                {{ profileRelationshipSummary(contact) }}
              </p>
            </div>
            <button type="button" @click.stop="openEditProfile(contact)" class="contacts-row-edit">{{ t('编辑', 'Edit') }}</button>
            <i class="fas fa-chevron-right contacts-row-chevron" aria-hidden="true"></i>
          </div>
        </section>

        <section class="contacts-list-section" data-testid="contacts-section-npc">
          <div class="contacts-section-title">
            <span>{{ t('NPC / 世界角色', 'NPC / World roles') }}</span>
            <small>{{ filteredNpcProfiles.length }}</small>
          </div>
          <div
            v-for="contact in filteredNpcProfiles"
            :key="contact.id"
            class="contacts-row"
            role="button"
            tabindex="0"
            :class="Number(selectedProfileId) === Number(contact.id) ? 'contacts-row-active' : ''"
            :data-testid="`contacts-row-${contact.id}`"
            @click="selectProfile(contact)"
            @keydown.enter="selectProfile(contact)"
          >
            <div class="contacts-avatar">
              <img
                :src="contactAvatarUrl(contact)"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="contacts-row-copy">
              <p class="contacts-row-name">{{ contact.name }}</p>
              <p class="contacts-row-meta">{{ contact.role || t('未设置角色', 'Role not set') }} · ID {{ normalizeRoleId(contact.roleId, contact.id) }}</p>
              <p class="contacts-row-hint">{{ contactListStatusHint(contact) }}</p>
              <p
                class="contacts-row-status"
                :data-testid="`contacts-relationship-summary-${contact.id}`"
              >
                {{ profileRelationshipSummary(contact) }}
              </p>
            </div>
            <button type="button" @click.stop="openEditProfile(contact)" class="contacts-row-edit">{{ t('编辑', 'Edit') }}</button>
            <i class="fas fa-chevron-right contacts-row-chevron" aria-hidden="true"></i>
          </div>
        </section>

        <div
          v-if="isContactsSearchActive && filteredMainProfiles.length === 0 && filteredNpcProfiles.length === 0 && filteredSelfProfiles.length === 0"
          class="contacts-empty-search"
        >
          {{ t('没有匹配的联系人。', 'No matching contacts.') }}
        </div>

        <p class="contacts-boundary-copy" data-testid="contacts-boundary-copy">
          {{
            t(
              'Contacts 是角色档案库与角色中枢。角色可以只存在于这里，不一定成为 Chat 会话；需要进入聊天时再到 Chat Directory 绑定。',
              'Contacts is the role archive and role hub. A role can live here without becoming a Chat thread; bind it in Chat Directory when it should enter Chat.',
            )
          }}
        </p>

        <div
          v-if="selectedProfile"
          class="contacts-detail mt-5 space-y-3"
          data-testid="contacts-role-detail"
        >
          <section class="contacts-detail-section">
            <div class="flex items-start gap-3">
              <div class="w-14 h-14 rounded-full bg-gray-200 overflow-hidden shrink-0">
                <img :src="selectedProfileHeader.avatarUrl" class="w-full h-full object-cover" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[11px] uppercase text-gray-400 font-bold">{{ selectedProfileHeader.eyebrow }}</p>
                <h2 class="text-lg font-bold truncate">{{ selectedProfileHeader.name }}</h2>
                <p class="text-xs text-gray-500 truncate">
                  {{ selectedProfileHeader.metaText }}
                </p>
                <p class="text-[11px] text-gray-500 mt-1 line-clamp-3">
                  {{ selectedProfileHeader.bioText }}
                </p>
              </div>
              <button @click="openEditProfile(selectedProfile)" class="contacts-small-action">
                {{ t('编辑', 'Edit') }}
              </button>
            </div>
            <div v-if="selectedProfileHeader.isNpc" class="mt-3 space-y-2">
              <button
                type="button"
                class="contacts-primary-action"
                data-testid="contacts-upgrade-npc"
                @click="upgradeSelectedNpcToMainRole"
              >
                {{ t('Upgrade to main role', 'Upgrade to main role') }}
              </button>
              <p class="text-xs text-gray-500">
                {{ selectedProfileHeader.upgradeHint }}
              </p>
            </div>
          </section>

          <section
            class="contacts-detail-section contacts-role-hub-overview space-y-3"
            data-testid="contacts-role-hub-summary"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[11px] uppercase text-gray-400 font-bold">{{ t('角色中枢', 'Role Hub') }}</p>
                <h3 class="text-sm font-bold">{{ contactsEntityTypeLabel(selectedProfileEntityType) }}</h3>
                <p class="text-[11px] text-gray-500 mt-1">{{ selectedChatStateDetail }}</p>
              </div>
              <div class="contacts-chat-actions">
                <button
                  v-if="selectedRoleChatContact"
                  type="button"
                  class="contacts-small-action"
                  @click="openSelectedChatTarget"
                >
                  {{ t('打开 Chat', 'Open Chat') }}
                </button>
                <button
                  v-else-if="selectedProfileEntityType !== CONTACTS_ENTITY_TYPES.SELF_PROFILE"
                  type="button"
                  class="contacts-small-action"
                  @click="openChatDirectory"
                >
                  {{ t('管理绑定', 'Manage Binding') }}
                </button>
              </div>
            </div>
            <div class="contacts-role-hub-grid">
              <div
                v-for="card in selectedRoleHubCards"
                :key="card.key"
                class="contacts-role-hub-card"
              >
                <p class="contacts-role-hub-label">{{ card.label }}</p>
                <p class="contacts-role-hub-value">{{ card.value }}</p>
                <p class="contacts-role-hub-detail">{{ card.detail }}</p>
              </div>
            </div>
            <div
              class="rounded-lg border border-blue-100 bg-blue-50/70 p-3"
              data-testid="contacts-chat-social-snapshot"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="contacts-role-hub-label">{{ t('Chat 通讯', 'Chat communication') }}</p>
                  <p class="text-sm font-semibold text-gray-950">{{ selectedChatSocialSnapshot.label }}</p>
                  <p class="mt-1 text-[11px] leading-4 text-gray-500">
                    {{ selectedChatSocialSnapshot.detail }}
                  </p>
                  <p
                    v-if="selectedChatSocialSnapshot.note"
                    class="mt-1 text-[11px] leading-4 text-blue-700"
                  >
                    {{ selectedChatSocialSnapshot.note }}
                  </p>
                </div>
                <span class="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-blue-700">
                  {{ t('来自 Chat，只读', 'Read-only from Chat') }}
                </span>
              </div>
              <p
                v-if="selectedChatSocialSnapshot.updatedAtLabel"
                class="mt-2 text-[10px] text-gray-400"
              >
                {{ t('更新时间', 'Updated') }}: {{ selectedChatSocialSnapshot.updatedAtLabel }}
              </p>
            </div>
          </section>

          <section
            class="contacts-detail-section contacts-relationship-panel"
            data-testid="contacts-relationship-runtime-snapshot"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[11px] uppercase text-gray-400 font-bold">
                  {{ t('当前关系', 'Current relationship') }}
                </p>
                <p class="text-sm font-semibold">
                  {{ relationshipStageLabel(selectedRelationshipSnapshot?.relationshipStage) }}
                </p>
                <p class="mt-1 text-[11px] text-gray-500 line-clamp-2">
                  {{ profileRelationshipLatestSummary(selectedProfile) }}
                </p>
              </div>
              <div class="contacts-metric-grid">
                <span>{{ t('好感', 'Affinity') }} {{ selectedRelationshipSnapshot?.metrics?.affinity ?? 50 }}</span>
                <span>{{ t('信任', 'Trust') }} {{ selectedRelationshipSnapshot?.metrics?.trust ?? 50 }}</span>
                <span>{{ t('亲密', 'Intimacy') }} {{ selectedRelationshipSnapshot?.metrics?.intimacy ?? 20 }}</span>
                <span>{{ t('张力', 'Tension') }} {{ selectedRelationshipSnapshot?.metrics?.tension ?? 10 }}</span>
              </div>
            </div>
            <div class="contacts-runtime-audit-grid">
              <div>
                <p class="contacts-role-hub-label">{{ t('Milestones', 'Milestones') }}</p>
                <p class="contacts-role-hub-detail">
                  {{
                    selectedRelationshipSnapshot?.milestones?.length
                      ? selectedRelationshipSnapshot.milestones
                          .map((item) => (typeof item === 'string' ? item : item.label || item.id))
                          .filter(Boolean)
                          .join(' · ')
                      : t('暂无里程碑', 'No milestones yet')
                  }}
                </p>
              </div>
              <div>
                <p class="contacts-role-hub-label">{{ t('Recent facts', 'Recent facts') }}</p>
                <p class="contacts-role-hub-detail">
                  {{
                    selectedRelationshipSnapshot?.recentEvents?.length
                      ? selectedRelationshipSnapshot.recentEvents
                          .slice(0, 2)
                          .map((event) => event.summary || relationshipFactTypeLabel(event.factType))
                          .join(' · ')
                      : t('暂无近期关系事件', 'No recent relationship facts')
                  }}
                </p>
              </div>
              <div>
                <p class="contacts-role-hub-label">{{ t('Primary memory', 'Primary memory') }}</p>
                <p class="contacts-role-hub-detail">
                  {{
                    relationshipMemoryReviewSummaryText(selectedRelationshipSnapshot?.primaryMemory) ||
                    t('暂无关系记忆', 'No relationship memory yet')
                  }}
                </p>
              </div>
            </div>
          </section>

          <section
            class="contacts-detail-section contacts-relationship-premise space-y-3"
            data-testid="contacts-relationship-premise-form"
          >
            <div
              class="flex items-start justify-between gap-3"
              data-testid="contacts-relationship-premise"
            >
              <div>
                <p class="text-[11px] uppercase text-gray-400 font-bold">
                  {{ t('关系前提', 'Relationship premise') }}
                </p>
                <h3 class="text-sm font-bold">
                  {{
                    relationshipPremiseDraft.primaryRelationshipCategoryId ||
                    t('未分类', 'Unclassified')
                  }}
                </h3>
                <p class="text-[11px] text-gray-500">
                  {{
                    selectedProfile?.classificationSource
                      ? `${selectedProfile.classificationSource} / ${selectedProfile.classificationConfidence || 'unset'}`
                      : t('尚未保存分类', 'No saved classification yet')
                  }}
                </p>
                <p
                  v-if="relationshipPremiseDraft.relationshipLabelText"
                  class="text-[11px] text-gray-500"
                >
                  {{ relationshipPremiseDraft.relationshipLabelText }}
                </p>
                <p
                  v-if="selectedProfile?.classificationUpdatedAt"
                  class="text-[10px] text-gray-400"
                >
                  {{ formatRelationshipAuditTimestamp(selectedProfile.classificationUpdatedAt) }}
                </p>
              </div>
              <button
                type="button"
                class="contacts-small-action"
                data-testid="contacts-relationship-ai-classify"
                :disabled="relationshipClassificationBusy"
                @click="runRelationshipClassification"
              >
                {{
                  relationshipClassificationBusy
                    ? t('分类中', 'Classifying')
                    : t('AI 分类', 'AI classify')
                }}
              </button>
            </div>

            <label class="contacts-premise-field">
              <span>{{ t('自由标签', 'Free label') }}</span>
              <input
                v-model="relationshipPremiseDraft.relationshipLabelText"
                data-testid="contacts-relationship-label-input"
                :placeholder="
                  t(
                    '例如：青梅竹马、白月光、狂热支持者',
                    'Example: childhood friend, white moonlight, fanatic supporter',
                  )
                "
              />
            </label>

            <label class="contacts-premise-field">
              <span>{{ t('说明', 'Note') }}</span>
              <textarea
                v-model="relationshipPremiseDraft.relationshipLabelNote"
                data-testid="contacts-relationship-note-input"
                rows="3"
                :placeholder="
                  t(
                    '解释这个关系前提；这不会直接编辑当前运行时数值。',
                    'Explain the premise; this does not directly edit current runtime values.',
                  )
                "
              />
            </label>

            <label class="contacts-premise-field">
              <span>{{ t('主类别', 'Primary category') }}</span>
              <select
                v-model="relationshipPremiseDraft.primaryRelationshipCategoryId"
                data-testid="contacts-relationship-category-select"
              >
                <option value="">{{ t('未分类', 'Unclassified') }}</option>
                <option
                  v-for="category in relationshipCategoryOptions"
                  :key="category.id"
                  :value="category.id"
                >
                  {{ category.label }} ({{ category.id }})
                </option>
              </select>
            </label>

            <div class="contacts-premise-modifiers">
              <p>{{ t('修饰标签', 'Modifier tags') }}</p>
              <label
                v-for="modifier in relationshipModifierOptions"
                :key="modifier.id"
                class="contacts-premise-modifier"
              >
                <input
                  type="checkbox"
                  data-testid="contacts-relationship-modifier-checkbox"
                  :data-modifier-id="modifier.id"
                  :checked="relationshipPremiseDraft.relationshipModifierIds.includes(modifier.id)"
                  @change="toggleRelationshipModifierDraft(modifier.id)"
                />
                <span>{{ modifier.label }}</span>
              </label>
            </div>

            <div class="contacts-seed-grid">
              <label
                v-for="metricKey in ['affinity', 'trust', 'intimacy', 'tension', 'dependency']"
                :key="metricKey"
                class="contacts-premise-field"
              >
                <span>{{ metricKey }}</span>
                <input
                  v-model.number="relationshipPremiseDraft.initialRelationshipSeed[metricKey]"
                  :data-testid="`contacts-relationship-seed-${metricKey}`"
                  type="number"
                  min="0"
                  max="100"
                />
              </label>
            </div>

            <div
              v-if="selectedProfile?.classificationExplanation"
              class="contacts-classification-audit"
              data-testid="contacts-relationship-classification-audit"
            >
              <p class="contacts-role-hub-label">{{ t('Classification audit', 'Classification audit') }}</p>
              <p class="contacts-role-hub-detail">
                {{ selectedProfile.classificationExplanation }}
              </p>
            </div>

            <div
              v-if="pendingClassificationSuggestion"
              class="contacts-classification-confirm"
              data-testid="contacts-relationship-confirm-ai"
            >
              <p class="text-[12px] font-semibold">
                {{ pendingClassificationSuggestion.classification.primaryRelationshipCategoryId }}
              </p>
              <p class="text-[11px] text-gray-500">
                {{ pendingClassificationSuggestion.classification.classificationExplanation }}
              </p>
              <button
                type="button"
                class="contacts-small-action"
                data-testid="contacts-relationship-confirm-ai-save"
                @click="confirmPendingRelationshipClassification"
              >
                {{ t('确认保存', 'Confirm save') }}
              </button>
            </div>

            <button
              type="button"
              class="contacts-primary-action"
              data-testid="contacts-relationship-manual-save"
              @click="saveRelationshipPremiseDraft()"
            >
              {{ t('保存关系前提', 'Save relationship premise') }}
            </button>
          </section>

          <section
            class="contacts-detail-section contacts-linked-activity space-y-2"
            data-testid="contacts-linked-activity-summary"
          >
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[11px] uppercase text-gray-400 font-bold">
                  {{ t('关联活动摘要', 'Linked activity summary') }}
                </p>
                <p class="text-sm font-semibold">{{ selectedLinkedActivitySummary.sourceText }}</p>
              </div>
              <span class="contacts-source-chip">
                {{ t('Memories', 'Memories') }} {{ selectedRoleHubStats.memoryCount }}
              </span>
            </div>
            <div class="contacts-linked-activity-grid">
              <div>
                <p class="contacts-role-hub-label">{{ t('事件挂载', 'Event-attached') }}</p>
                <p class="contacts-role-hub-value">{{ selectedLinkedActivitySummary.eventAttachedCount }}</p>
              </div>
              <div>
                <p class="contacts-role-hub-label">{{ t('来源记录', 'Source records') }}</p>
                <p class="contacts-role-hub-value">{{ selectedLinkedActivitySummary.supportingCount }}</p>
              </div>
            </div>
            <p class="text-[11px] leading-4 text-gray-500">
              {{
                selectedLinkedActivitySummary.latestSummary ||
                t(
                  '这里汇总关系运行时与事件挂载线索；原始记录仍由对应模块拥有。',
                  'This summarizes relationship runtime and event-attached clues; original records remain owned by their modules.',
                )
              }}
            </p>
            <div
              v-if="selectedLinkedActivityEntries.length"
              class="space-y-2"
              data-testid="contacts-linked-activity-list"
            >
              <div
                v-for="entry in selectedLinkedActivityEntries"
                :key="entry.id"
                class="contacts-detail-item"
                :data-testid="`contacts-linked-activity-${entry.id}`"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-[12px] font-semibold truncate">{{ entry.title }}</p>
                    <p class="mt-0.5 text-[11px] text-gray-500">
                      {{ entry.sectionLabel }} · {{ entry.sourceModuleLabel }}
                    </p>
                  </div>
                  <span class="contacts-source-chip contacts-source-chip-event">
                    {{ t('事件挂载', 'Event-attached') }}
                  </span>
                </div>
                <p class="mt-1 text-[11px] leading-4 text-gray-500">
                  {{ entry.summary }}
                </p>
                <p class="mt-1 text-[10px] leading-4 text-gray-400">
                  {{ t('原始记录', 'Source record') }}: {{ entry.recordId || t('未标记', 'Unlabeled') }}
                </p>
                <button
                  v-if="entry.memoryKey"
                  type="button"
                  class="contacts-link-action mt-2"
                  :data-testid="`contacts-linked-activity-open-memory-${entry.memoryKey}`"
                  @click="openLinkedMemoryFromDetailItem(entry)"
                >
                  {{ t('查看对应记忆', 'Open linked memory') }}
                </button>
              </div>
            </div>
          </section>

          <section
            v-if="selectedProfile"
            class="contacts-detail-section contacts-world-profile-fields space-y-3"
            data-testid="contacts-world-profile-fields-section"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {{ t('世界字段', 'World profile fields') }}
                </p>
                <h3 class="font-semibold">{{ t('扩展设定', 'Extended settings') }}</h3>
                <p class="mt-1 text-[11px] leading-4 text-gray-500">
                  {{ selectedWorldFieldIntroText }}
                </p>
              </div>
              <button
                type="button"
                class="contacts-small-action"
                data-testid="contacts-edit-world-profile-fields"
                @click="openProfileTemplateEditor"
              >
                {{ t('编辑世界字段', 'Edit fields') }}
              </button>
            </div>

            <div
              v-if="selectedProfileTemplateAdaptationDisplay.needsAttention"
              class="contacts-template-adaptation-review"
              data-testid="contacts-template-adaptation-review"
            >
              <div class="contacts-template-adaptation-review__head">
                <i class="fas fa-arrows-rotate" aria-hidden="true"></i>
                <div>
                  <p>{{ selectedProfileTemplateAdaptationDisplay.title }}</p>
                  <span>{{ selectedProfileTemplateAdaptationDisplay.summary }}</span>
                </div>
              </div>
              <ul>
                <li
                  v-for="fact in selectedProfileTemplateAdaptationDisplay.facts"
                  :key="fact.key"
                >
                  {{ fact.text }}
                </li>
              </ul>
              <div class="contacts-template-adaptation-review__actions">
                <button
                  type="button"
                  class="contacts-small-action contacts-ai-draft-action"
                  data-testid="contacts-ai-adapt-world-profile-template"
                  :disabled="profileTemplateAdaptationBusy"
                  @click="draftProfileTemplateAdaptationWithAI"
                >
                  <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
                  {{
                    profileTemplateAdaptationBusy
                      ? t('AI 适配中...', 'AI adapting...')
                      : t('AI 起草适配', 'AI draft adaptation')
                  }}
                </button>
              </div>
              <p
                v-if="profileTemplateAdaptationStatus"
                class="contacts-ai-draft-status"
                data-testid="contacts-ai-adapt-world-profile-template-status"
              >
                {{ profileTemplateAdaptationStatus }}
              </p>
            </div>

            <div v-if="selectedProfileWorldFieldRows.length > 0" class="contacts-world-field-list">
              <div
                v-for="row in selectedProfileWorldFieldRows"
                :key="row.key"
                class="contacts-detail-item"
                :data-testid="`contacts-world-field-${row.key}`"
              >
                <div>
                  <p class="font-medium">{{ row.title }}</p>
                  <p v-if="row.displayValue" class="text-sm text-gray-600">{{ row.displayValue }}</p>
                  <p v-else class="text-sm text-gray-400">{{ t('未填写', 'Not filled') }}</p>
                  <p v-if="row.description" class="mt-1 text-[11px] leading-4 text-gray-500">
                    {{ row.description }}
                  </p>
                </div>
                <span class="contacts-source-chip" :class="row.isTemplateField ? '' : 'contacts-source-chip-custom'">
                  {{ row.badgeLabel }}
                </span>
              </div>
            </div>
            <p v-else class="contacts-empty-detail">
              {{ t('还没有填写世界字段。', 'No world profile fields filled yet.') }}
            </p>

            <div
              v-if="isProfileTemplateEditorOpen"
              class="contacts-world-field-editor"
              data-testid="contacts-world-profile-fields-editor"
            >
              <div class="contacts-world-field-editor__head">
                <div>
                  <p>{{ t('选择世界模板', 'Choose world template') }}</p>
                  <span>
                    {{
                      t(
                        '模板来自世界书；这里保存的是当前人物自己的具体值。',
                        'Templates come from WorldBook; this saves this person’s concrete values.',
                      )
                    }}
                  </span>
                </div>
                <button type="button" class="contacts-small-action" @click="cancelProfileTemplateEditor">
                  {{ t('取消', 'Cancel') }}
                </button>
              </div>

              <select
                v-model="profileTemplateDraft.templateId"
                class="contacts-world-field-select"
                data-testid="contacts-profile-template-select"
                @change="setProfileTemplateDraftTemplate(profileTemplateDraft.templateId)"
              >
                <option value="">{{ t('选择模板', 'Choose template') }}</option>
                <option
                  v-for="template in contactsProfileTemplateOptions"
                  :key="template.id"
                  :value="template.id"
                >
                  {{ formatContactsProfileTemplateOption(template) }} · v{{ template.version }}
                </option>
              </select>

              <div
                v-if="profileTemplateDraft.templateId"
                class="contacts-template-change-review"
                data-testid="contacts-template-change-review"
              >
                <div class="contacts-template-change-review__head">
                  <i class="fas fa-clipboard-check" aria-hidden="true"></i>
                  <div>
                    <p>{{ profileTemplateChangeReview.title }}</p>
                    <span>
                      {{ profileTemplateChangeReview.summary }}
                    </span>
                  </div>
                </div>
                <ul>
                  <li
                    v-for="fact in profileTemplateChangeReview.facts"
                    :key="fact.key"
                  >
                    {{ fact.text }}
                  </li>
                </ul>
                <div
                  v-if="profileTemplateDraftPreservedRows.length > 0"
                  class="contacts-template-preserved-list"
                >
                  <span
                    v-for="row in profileTemplateDraftPreservedRows"
                    :key="`preserved-${row.key}`"
                  >
                    {{ row.title }}
                    <small>{{ row.fieldId }}</small>
                  </span>
                </div>
              </div>

              <div v-if="contactsProfileTemplateOptions.length === 0" class="contacts-empty-detail">
                <p>
                  {{ emptyTemplateOptionsText }}
                </p>
                <button type="button" class="contacts-small-action mt-2" @click="openWorldBookProfileTemplates">
                  {{ t('打开世界书', 'Open WorldBook') }}
                </button>
              </div>

              <div v-else-if="profileTemplateDraftFieldRows.length > 0" class="contacts-world-field-form">
                <label
                  v-for="field in profileTemplateDraftFieldRows"
                  :key="field.id"
                  class="contacts-world-field-control"
                  :class="`contacts-world-field-control--${field.type}`"
                  :data-testid="`contacts-profile-template-field-${field.id}`"
                >
                  <span class="contacts-world-field-control__head">
                    <span class="contacts-world-field-control__label">
                      <i :class="field.iconClass" aria-hidden="true"></i>
                      <span>{{ field.label }}</span>
                      <small v-if="field.required">{{ t('必填', 'Required') }}</small>
                    </span>
                    <strong class="contacts-world-field-type-chip">{{ field.typeLabel }}</strong>
                  </span>
                  <p
                    class="contacts-world-field-control__helper"
                    :data-testid="`contacts-profile-template-helper-${field.id}`"
                  >
                    {{ field.helper }}
                  </p>
                  <select
                    v-if="field.controlKind === 'select'"
                    v-model="profileTemplateDraft.values[field.id]"
                    :data-testid="`contacts-profile-template-value-${field.id}`"
                  >
                    <option value="">{{ t('未填写', 'Not filled') }}</option>
                    <option v-for="option in field.options" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </select>
                  <textarea
                    v-else-if="field.controlKind === 'textarea'"
                    v-model="profileTemplateDraft.values[field.id]"
                    :data-testid="`contacts-profile-template-value-${field.id}`"
                    :placeholder="field.placeholder"
                    rows="3"
                  ></textarea>
                  <input
                    v-else
                    v-model="profileTemplateDraft.values[field.id]"
                    :data-testid="`contacts-profile-template-value-${field.id}`"
                    :placeholder="field.placeholder"
                  />
                  <div
                    v-if="field.hasTagPreview"
                    class="contacts-world-field-tag-preview"
                    :data-testid="`contacts-profile-template-tag-preview-${field.id}`"
                  >
                    <span v-for="tag in field.tagPreview" :key="`${field.id}-${tag}`">
                      {{ tag }}
                    </span>
                    <em v-if="field.tagPreview.length === 0">
                      {{ tagPreviewEmptyText }}
                    </em>
                  </div>
                  <select
                    v-model="profileTemplateDraft.visibility[field.id]"
                    :data-testid="`contacts-profile-template-visibility-${field.id}`"
                  >
                    <option
                      v-for="option in profileTemplateVisibilityOptions"
                      :key="`${field.id}-${option.value}`"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  <em v-if="field.description">{{ field.description }}</em>
                </label>
              </div>
              <p v-else-if="profileTemplateDraft.templateId" class="contacts-empty-detail">
                {{ emptyTemplateFieldText }}
              </p>

              <div class="contacts-world-field-editor__actions">
                <button
                  type="button"
                  class="contacts-small-action contacts-ai-draft-action"
                  data-testid="contacts-ai-draft-world-profile-fields"
                  :disabled="profileTemplateAiDraftBusy || !profileTemplateDraft.templateId"
                  @click="draftProfileTemplateValuesWithAI"
                >
                  <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
                  {{
                    profileTemplateAiDraftBusy
                      ? t('AI 起草中...', 'AI drafting...')
                      : t('AI 起草字段', 'AI draft fields')
                  }}
                </button>
                <button type="button" class="contacts-primary-action" data-testid="contacts-save-world-profile-fields" @click="saveProfileTemplateValues">
                  {{ t('保存世界字段', 'Save world fields') }}
                </button>
              </div>
              <p
                v-if="profileTemplateAiDraftStatus"
                class="contacts-ai-draft-status"
                data-testid="contacts-ai-draft-world-profile-fields-status"
              >
                {{ profileTemplateAiDraftStatus }}
              </p>
            </div>
          </section>

          <section
            v-for="section in selectedDetailSectionRows"
            :key="section.key"
            class="contacts-detail-section space-y-2"
            :data-testid="`contacts-detail-section-${section.key}`"
          >
            <div class="flex items-center justify-between">
              <p class="text-sm font-bold">{{ section.title }}</p>
              <div
                class="contacts-detail-counts"
                :data-testid="`contacts-detail-counts-${section.key}`"
              >
                <span>{{ t('手动', 'Manual') }} {{ section.stats.manual }}</span>
                <span>{{ t('事件', 'Event') }} {{ section.stats.eventAttached }}</span>
              </div>
            </div>
            <p class="text-[11px] leading-4 text-gray-500">
              {{ roleDetailPolicyText }}
            </p>
            <div
              v-if="section.items.length === 0"
              class="contacts-empty-detail"
            >
              {{ section.empty }}
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="group in section.groups"
                :key="group.key"
                class="contacts-detail-group"
                :data-testid="`contacts-detail-group-${section.key}-${group.key}`"
              >
                <div class="contacts-detail-group-header">
                  <div>
                    <p class="text-[12px] font-bold">{{ group.title }}</p>
                    <p class="text-[10px] leading-4 text-gray-500">{{ group.description }}</p>
                  </div>
                  <span class="contacts-source-chip">{{ group.items.length }}</span>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="item in group.items"
                    :key="item.id"
                    class="contacts-detail-item"
                  >
                    <template v-if="editingDetailItemId === item.id">
                      <div class="space-y-2" :data-testid="`contacts-detail-edit-${item.id}`">
                        <input
                          v-model="detailEditDraft.title"
                          :placeholder="section.placeholderTitle"
                          class="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] outline-none"
                        />
                        <textarea
                          v-model="detailEditDraft.detail"
                          :placeholder="section.placeholderDetail"
                          class="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] outline-none resize-none h-16"
                        ></textarea>
                        <div class="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            class="contacts-small-action"
                            :data-testid="`contacts-detail-edit-cancel-${item.id}`"
                            @click="cancelEditingManualDetailItem"
                          >
                            {{ t('取消', 'Cancel') }}
                          </button>
                          <button
                            type="button"
                            class="contacts-primary-action"
                            :data-testid="`contacts-detail-edit-save-${item.id}`"
                            @click="saveManualDetailItemEdit(item)"
                          >
                            {{ t('保存条目', 'Save entry') }}
                          </button>
                        </div>
                      </div>
                    </template>
                    <template v-else>
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                          <p class="text-[12px] font-semibold truncate">{{ item.title || item.detail }}</p>
                          <p v-if="item.detail" class="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{{ item.detail }}</p>
                          <p
                            class="mt-1 text-[10px] leading-4 text-gray-400"
                            :data-testid="`contacts-detail-source-hint-${item.id}`"
                          >
                            {{ roleDetailSourceHint(item) }}
                          </p>
                        </div>
                        <span
                          class="contacts-source-chip"
                          :class="item.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED ? 'contacts-source-chip-event' : ''"
                          :data-testid="`contacts-detail-source-chip-${item.id}`"
                        >
                          {{ roleDetailSourceLabel(item) }}
                        </span>
                      </div>
                    </template>
                    <div
                      v-if="item.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED"
                      class="contacts-event-locked-note"
                    >
                      <p>{{ t('此条不能在这里单独删除。', 'This entry cannot be deleted here directly.') }}</p>
                      <button
                        v-if="item.memoryKey"
                        type="button"
                        class="contacts-link-action"
                        :data-testid="`contacts-detail-open-memory-${item.memoryKey}`"
                        @click="openLinkedMemoryFromDetailItem(item)"
                      >
                        {{ t('查看对应记忆', 'Open linked memory') }}
                      </button>
                    </div>
                    <div
                      v-if="item.sourceKind === ROLE_DETAIL_SOURCE_KINDS.MANUAL && editingDetailItemId !== item.id"
                      class="mt-2 flex items-center justify-end gap-2"
                    >
                      <button
                        type="button"
                        class="contacts-small-action"
                        :data-testid="`contacts-detail-edit-open-${item.id}`"
                        @click="startEditingManualDetailItem(item)"
                      >
                        {{ t('编辑条目', 'Edit entry') }}
                      </button>
                      <button
                        @click="removeManualDetailItem(item)"
                        class="text-[11px] text-red-500"
                        :data-testid="`contacts-detail-delete-${item.id}`"
                      >
                        {{ t('删除', 'Delete') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="contacts-detail-add grid grid-cols-1 gap-2">
              <input
                v-model="detailDrafts[section.key].title"
                :placeholder="section.placeholderTitle"
                class="rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] outline-none"
              />
              <textarea
                v-model="detailDrafts[section.key].detail"
                :placeholder="section.placeholderDetail"
                class="rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] outline-none resize-none h-16"
              ></textarea>
              <button @click="addManualDetailItem(section.key)" class="contacts-primary-action">
                {{ t('添加手动条目', 'Add manual entry') }}
              </button>
            </div>
          </section>

          <section class="contacts-detail-section space-y-2">
            <div class="flex items-center justify-between">
              <p class="text-sm font-bold">{{ t('记忆', 'Memories') }}</p>
              <span class="text-[10px] text-gray-500">{{ selectedMemoryListCountLabel }}</span>
            </div>
            <div class="contacts-memory-toolbar" data-testid="contacts-memory-toolbar">
              <label class="contacts-memory-toolbar-field">
                <span>{{ t('来源', 'Source') }}</span>
                <select v-model="memorySourceFilter">
                  <option
                    v-for="option in availableMemorySourceFilters"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label class="contacts-memory-toolbar-field">
                <span>{{ t('排序', 'Sort') }}</span>
                <select v-model="memorySortMode">
                  <option value="recent">{{ t('最近更新', 'Recent update') }}</option>
                  <option value="supporting">{{ t('事件数量', 'Event count') }}</option>
                </select>
              </label>
            </div>
            <p class="text-[10px] text-gray-500">
              {{ memoryListSummaryText }}
            </p>
            <div v-if="visibleMemoryGroups.length === 0" class="contacts-empty-detail">
              {{ memoryListSummaryText }}
            </div>
            <div v-else class="space-y-2">
              <button
                v-for="memory in visibleMemoryGroups"
                :key="memory.memoryKey"
                type="button"
                class="contacts-memory-item"
                :class="memory.memoryKey === selectedMemoryKey ? 'contacts-memory-item-active' : ''"
                :data-testid="`contacts-memory-open-${memory.memoryKey}`"
                @click="selectMemoryGroup(memory)"
              >
                <div class="min-w-0">
                  <p class="text-[12px] font-semibold line-clamp-2">
                    {{ memory.displaySummary || memory.primarySummary || memory.latestSummary || memory.memoryKey }}
                  </p>
                  <p class="text-[11px] text-gray-500 mt-1 truncate">
                    {{ memory.sourceModules.join(' · ') || t('来源未标记', 'Unlabeled source') }} · {{ memory.supportingCount }} {{ t('条', 'item(s)') }}
                  </p>
                </div>
                <div class="shrink-0 flex items-center gap-2">
                  <span
                    class="contacts-source-chip"
                    :class="memory.reviewStatus === RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED ? 'contacts-source-chip-event' : ''"
                  >
                    {{ memoryReviewStatusLabel(memory.reviewStatus) }}
                  </span>
                  <span class="contacts-small-action shrink-0">{{ t('查看', 'Open') }}</span>
                </div>
              </button>
              <p v-if="selectedMemoryListOverflowText" class="text-[10px] text-gray-500">
                {{ selectedMemoryListOverflowText }}
              </p>
              <div
                v-if="selectedMemoryDetail"
                class="contacts-memory-detail space-y-2"
                data-testid="contacts-memory-detail"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-[11px] uppercase text-gray-400 font-bold">{{ t('记忆详情', 'Memory Detail') }}</p>
                    <p class="text-[12px] font-semibold line-clamp-2">
                      {{
                        selectedMemoryDetail.displaySummary ||
                        selectedMemoryDetail.primarySummary ||
                        selectedMemoryDetail.latestSummary ||
                        selectedMemoryDetail.memoryKey
                      }}
                    </p>
                  </div>
                  <span class="contacts-source-chip">{{ selectedMemoryDetail.events.length }}</span>
                </div>
                <div class="contacts-memory-review-row" data-testid="contacts-memory-review-controls">
                  <div class="contacts-memory-review-statuses">
                    <button
                      type="button"
                      class="contacts-memory-status-button"
                      :class="selectedMemoryDetail.reviewStatus === RELATIONSHIP_MEMORY_REVIEW_STATES.PINNED ? 'contacts-memory-status-button-active' : ''"
                      @click="updateSelectedMemoryReview({ status: RELATIONSHIP_MEMORY_REVIEW_STATES.PINNED })"
                    >
                      {{ t('置顶', 'Pinned') }}
                    </button>
                    <button
                      type="button"
                      class="contacts-memory-status-button"
                      :class="selectedMemoryDetail.reviewStatus === RELATIONSHIP_MEMORY_REVIEW_STATES.ACTIVE ? 'contacts-memory-status-button-active' : ''"
                      @click="updateSelectedMemoryReview({ status: RELATIONSHIP_MEMORY_REVIEW_STATES.ACTIVE })"
                    >
                      {{ t('活跃', 'Active') }}
                    </button>
                    <button
                      type="button"
                      class="contacts-memory-status-button"
                      :class="selectedMemoryDetail.reviewStatus === RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED ? 'contacts-memory-status-button-active' : ''"
                      @click="updateSelectedMemoryReview({ status: RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED })"
                    >
                      {{ t('归档', 'Archived') }}
                    </button>
                  </div>
                  <span class="contacts-source-chip">
                    {{ memoryReviewStatusLabel(selectedMemoryDetail.reviewStatus) }}
                  </span>
                </div>
                <div class="contacts-memory-headline-grid" data-testid="contacts-memory-headline-facts">
                  <div
                    v-for="fact in selectedMemoryHeadlineFacts"
                    :key="fact.key"
                    class="contacts-memory-headline-card"
                  >
                    <p class="contacts-role-hub-label">{{ fact.label }}</p>
                    <p class="contacts-role-hub-value">{{ fact.value }}</p>
                    <p class="contacts-role-hub-detail">{{ fact.detail }}</p>
                  </div>
                </div>
                <p class="text-[11px] text-gray-500">
                  {{ t('来源', 'Sources') }}: {{ sourceModuleSummaryText(selectedMemoryDetail.sourceModuleCounts) }}
                </p>
                <p class="text-[11px] text-gray-500">
                  {{ cleanupCoverageText(selectedMemoryDetail.sourceModuleCounts) }}
                </p>
                <div
                  v-if="selectedMemorySourceAudit.length"
                  class="contacts-memory-audit-grid"
                  data-testid="contacts-memory-source-audit"
                >
                  <div
                    v-for="source in selectedMemorySourceAudit"
                    :key="source.sourceModule"
                    class="contacts-memory-audit-card"
                    :data-testid="`contacts-memory-source-${source.sourceModule}`"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-[11px] font-bold">{{ source.label }}</p>
                        <p class="text-[10px] text-gray-500 mt-0.5">
                          {{ source.count }} {{ t('条关联记录', 'linked record(s)') }}
                        </p>
                      </div>
                      <span
                        class="contacts-source-chip"
                        :class="source.cleanupConnected ? '' : 'contacts-source-chip-event'"
                      >
                        {{
                          source.cleanupConnected
                            ? t('已接 cleanup', 'Cleanup ready')
                            : t('仅影响提示', 'Impact only')
                        }}
                      </span>
                    </div>
                    <p
                      v-if="source.recordIds.length"
                      class="mt-2 text-[10px] leading-4 text-gray-500"
                    >
                      {{ t('原始记录', 'Source records') }}:
                      {{ source.recordIds.join(' · ') }}
                    </p>
                    <p
                      v-if="source.rawSourceIds.length && source.rawSourceIds.join(' · ') !== source.recordIds.join(' · ')"
                      class="mt-1 text-[10px] leading-4 text-gray-400"
                    >
                      {{ t('关系 sourceId', 'Relationship sourceId') }}:
                      {{ source.rawSourceIds.join(' · ') }}
                    </p>
                  </div>
                </div>
                <div
                  v-if="selectedMemoryEventTimeline.length"
                  class="contacts-memory-event-list"
                  data-testid="contacts-memory-event-list"
                >
                  <div class="contacts-memory-event-header">
                    <p class="text-[11px] font-bold">{{ t('支撑事件', 'Supporting events') }}</p>
                    <span class="contacts-source-chip">
                      {{ selectedMemoryEventTimeline.length }}
                    </span>
                  </div>
                  <div
                    v-for="event in selectedMemoryEventTimeline"
                    :key="event.id"
                    class="contacts-memory-event-item"
                    :data-testid="`contacts-memory-event-${event.id}`"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-[11px] font-semibold">
                          {{ event.summary }}
                        </p>
                        <p class="mt-0.5 text-[10px] text-gray-500">
                          {{ event.sourceModuleLabel }} · {{ event.factTypeLabel }}
                        </p>
                      </div>
                      <span class="contacts-source-chip">{{ event.createdAtText }}</span>
                    </div>
                    <p class="mt-1 text-[10px] leading-4 text-gray-500">
                      {{ t('原始记录', 'Source record') }}: {{ event.recordId || t('未标记', 'Unlabeled') }}
                    </p>
                    <p
                      v-if="event.sourceId && event.sourceId !== event.recordId"
                      class="mt-1 text-[10px] leading-4 text-gray-400"
                    >
                      {{ t('关系 sourceId', 'Relationship sourceId') }}: {{ event.sourceId }}
                    </p>
                  </div>
                </div>
                <div class="contacts-memory-review-note" data-testid="contacts-memory-review-note">
                  <p class="text-[11px] font-bold">{{ t('管理备注', 'Review note') }}</p>
                  <textarea
                    v-model="memoryReviewDraft"
                    class="mt-2 w-full rounded-lg border border-gray-200 px-2.5 py-2 text-[12px] outline-none resize-none h-20"
                    :placeholder="t('例如：保留为长期锚点，或等待 4.2 去重后再归档。', 'For example: keep as a long-term anchor, or archive after 4.2 dedupe.')"
                  ></textarea>
                  <div class="mt-2 flex justify-end">
                    <button
                      type="button"
                      class="contacts-primary-action"
                      data-testid="contacts-memory-review-save"
                      @click="saveSelectedMemoryReviewNote"
                    >
                      {{ t('保存备注', 'Save note') }}
                    </button>
                  </div>
                </div>
                <p class="text-[11px] text-gray-500">
                  {{
                    t(
                      '普通自由聊天消息不会被删除；如需删除原始聊天文本，请前往 Chat 对话处理。',
                      'Normal free-form chat messages are not deleted; delete original chat text from the Chat conversation if needed.',
                    )
                  }}
                </p>
                <button
                  type="button"
                  class="contacts-danger-inline"
                  :data-testid="`contacts-memory-delete-${selectedMemoryDetail.memoryKey}`"
                  @click="deleteMemoryGroup(selectedMemoryDetail)"
                >
                  {{ t('删除记忆组', 'Delete memory group') }}
                </button>
              </div>
            </div>
          </section>

          <section class="contacts-detail-section contacts-danger-zone space-y-3">
            <div>
              <p class="text-sm font-bold">{{ t('危险区', 'Danger Zone') }}</p>
              <p class="text-[11px] text-gray-500 mt-1">
                {{ t('重置关系会保留档案；删除角色会移除档案、聊天绑定、聊天记录与关系运行时记录。', 'Reset keeps the profile. Delete removes the profile, chat binding, chat history, and runtime relationship records.') }}
              </p>
            </div>
            <div class="rounded-lg border border-red-100 bg-red-50/70 px-3 py-2 text-[11px] text-red-700">
              {{ selectedDangerImpactText }}
            </div>
            <label class="flex items-start gap-2 text-[11px] text-gray-600">
              <input
                v-model="dangerIncludeLinkedRecords"
                type="checkbox"
                class="mt-0.5"
                data-testid="contacts-danger-include-linked-records"
              />
              <span>
                {{ dangerIncludeLinkedRecordsText }}
              </span>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="contacts-reset-relationship"
                @click="resetSelectedRelationship"
                class="contacts-danger-secondary"
              >
                {{ t('重置关系', 'Reset') }}
              </button>
              <button
                type="button"
                data-testid="contacts-delete-role"
                @click="deleteSelectedProfile"
                class="contacts-danger-primary"
              >
                {{ t('删除角色', 'Delete Role') }}
              </button>
            </div>
          </section>
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
.contacts-row button:not(.contacts-danger-primary):not(.contacts-danger-secondary):not(.contacts-danger-inline) {
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

.contacts-top-stack {
  display: grid;
  gap: 10px;
}

.contacts-search {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.76);
  border-radius: 14px;
  padding: 0 12px;
  background: rgba(255, 255, 255, 0.78);
  color: var(--contacts-muted);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.contacts-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--contacts-text);
  font-size: 13px;
  line-height: 1.2;
  outline: none;
}

.contacts-search i {
  color: var(--contacts-soft);
}

.contacts-boundary-copy {
  margin: 14px 0 0;
  padding: 0 2px 6px;
  color: var(--contacts-muted);
  font-size: 11px;
  line-height: 1.45;
}

.contacts-worldbook-handoff {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(66, 111, 143, 0.18);
  border-radius: 16px;
  padding: 12px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(229, 240, 245, 0.88)),
    var(--contacts-surface-strong);
  box-shadow: 0 10px 24px rgba(45, 63, 89, 0.07);
}

.contacts-worldbook-handoff__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.contacts-worldbook-handoff__copy p,
.contacts-worldbook-handoff__copy h2,
.contacts-worldbook-handoff__copy span {
  margin: 0;
}

.contacts-worldbook-handoff__copy p {
  color: var(--contacts-accent-strong);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0;
}

.contacts-worldbook-handoff__copy h2 {
  color: var(--contacts-text);
  font-size: 15px;
  font-weight: 850;
  line-height: 1.25;
}

.contacts-worldbook-handoff__copy span {
  color: var(--contacts-muted);
  font-size: 12px;
  line-height: 1.45;
}

.contacts-worldbook-handoff__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  border-radius: 12px;
  padding: 0 12px;
  color: #fff;
  background: var(--contacts-accent);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  box-shadow: 0 10px 22px rgba(66, 111, 143, 0.2);
}

.contacts-worldbook-handoff__action:active {
  transform: scale(0.98);
}

.contacts-my-card {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 18px rgba(45, 63, 89, 0.07);
}

.contacts-avatar,
.contacts-avatar-preview .rounded-full {
  display: block;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: linear-gradient(135deg, #e4edf1, #fbfcfd);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 10px 22px rgba(45, 63, 89, 0.13);
}

.contacts-avatar-large {
  width: 52px;
  height: 52px;
}

.contacts-list {
  display: grid;
  gap: 14px;
  padding-bottom: 24px;
}

.contacts-list-section {
  display: grid;
  gap: 2px;
}

.contacts-my-profile-section {
  gap: 6px;
}

.contacts-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 4px;
  color: var(--contacts-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: none;
}

.contacts-section-title small {
  font-size: 11px;
  font-weight: 700;
  color: var(--contacts-soft);
}

.contacts-recent-section {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.contacts-recent-strip {
  display: flex;
  gap: 12px;
  min-width: 0;
  overflow-x: auto;
  padding: 2px 2px 8px;
  scrollbar-width: none;
}

.contacts-recent-strip::-webkit-scrollbar {
  display: none;
}

.contacts-recent-person {
  display: grid;
  justify-items: center;
  gap: 4px;
  width: 78px;
  flex: 0 0 78px;
  color: var(--contacts-text);
  text-align: center;
  -webkit-tap-highlight-color: transparent;
}

.contacts-recent-person:active {
  transform: scale(0.97);
}

.contacts-recent-avatar {
  width: 52px;
  height: 52px;
}

.contacts-recent-name,
.contacts-recent-source {
  display: block;
  max-width: 78px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contacts-recent-name {
  font-size: 11px;
  font-weight: 750;
}

.contacts-recent-source {
  color: var(--contacts-muted);
  font-size: 10px;
}

.contacts-row {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 64px;
  width: 100%;
  padding: 9px 2px;
  border-bottom: 1px solid rgba(49, 64, 86, 0.08);
  border-radius: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition:
    background var(--system-motion-fast),
    transform var(--system-motion-fast);
}

.contacts-row:active {
  transform: scale(0.992);
  background: rgba(255, 255, 255, 0.58);
}

.contacts-row-active {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 14px;
  padding-right: 8px;
  padding-left: 8px;
}

.contacts-row-copy {
  min-width: 0;
  flex: 1;
}

.contacts-row-name,
.contacts-row-meta,
.contacts-row-hint,
.contacts-row-status {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0;
}

.contacts-row-name {
  color: var(--contacts-text);
  font-size: 14px;
  font-weight: 780;
}

.contacts-row-meta {
  margin-top: 1px;
  color: var(--contacts-muted);
  font-size: 11px;
}

.contacts-row-hint {
  margin-top: 2px;
  color: var(--contacts-muted);
  font-size: 10px;
}

.contacts-row-status {
  margin-top: 1px;
  color: var(--contacts-accent);
  font-size: 10px;
}

.contacts-row-edit {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 5px 8px;
  color: var(--contacts-accent);
  font-size: 11px;
  font-weight: 750;
  -webkit-tap-highlight-color: transparent;
}

.contacts-row-edit:active {
  background: var(--contacts-accent-soft);
}

.contacts-row-chevron {
  flex-shrink: 0;
  color: var(--contacts-soft);
  font-size: 11px;
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

.contacts-empty-search {
  border: 1px dashed rgba(49, 64, 86, 0.14);
  border-radius: 14px;
  padding: 16px;
  color: var(--contacts-muted);
  font-size: 12px;
  text-align: center;
}

.contacts-detail-section {
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 18px;
  background: var(--contacts-surface-strong);
  box-shadow: 0 10px 24px rgba(45, 63, 89, 0.07);
  padding: 14px;
}

.contacts-role-hub-overview {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.97), rgba(229, 240, 245, 0.9)),
    var(--contacts-surface-strong);
}

.contacts-chat-actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.contacts-role-hub-grid,
.contacts-linked-activity-grid {
  display: grid;
  gap: 8px;
}

.contacts-role-hub-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.contacts-linked-activity-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.contacts-role-hub-card,
.contacts-linked-activity-grid > div {
  min-width: 0;
  border: 1px solid rgba(49, 64, 86, 0.1);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.68);
  padding: 9px 10px;
}

.contacts-role-hub-label {
  color: var(--contacts-muted);
  font-size: 10px;
  font-weight: 800;
  line-height: 1.2;
}

.contacts-role-hub-value {
  margin-top: 2px;
  color: var(--contacts-text);
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
}

.contacts-role-hub-detail {
  margin-top: 3px;
  color: var(--contacts-muted);
  font-size: 10px;
  line-height: 1.35;
}

.contacts-relationship-panel {
  box-shadow: 0 8px 20px rgba(45, 63, 89, 0.06);
}

.contacts-runtime-audit-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 12px;
}

.contacts-metric-grid {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  color: var(--contacts-muted);
  font-size: 11px;
}

.contacts-metric-grid span {
  border-radius: 999px;
  background: rgba(49, 64, 86, 0.07);
  padding: 4px 7px;
  white-space: nowrap;
}

.contacts-relationship-premise {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(244, 249, 255, 0.75)),
    var(--contacts-surface-strong);
}

.contacts-premise-field {
  display: grid;
  gap: 5px;
  color: var(--contacts-muted);
  font-size: 11px;
  font-weight: 700;
}

.contacts-premise-field input,
.contacts-premise-field textarea,
.contacts-premise-field select {
  width: 100%;
  border: 1px solid var(--contacts-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--contacts-text);
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 500;
}

.contacts-premise-modifiers {
  display: grid;
  gap: 8px;
  color: var(--contacts-muted);
  font-size: 11px;
  font-weight: 700;
}

.contacts-premise-modifier {
  display: inline-grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 7px;
  border-radius: 10px;
  background: rgba(49, 64, 86, 0.07);
  padding: 6px 8px;
  font-size: 11px;
}

.contacts-seed-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.contacts-classification-audit,
.contacts-classification-confirm {
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 12px;
  background: rgba(255, 251, 235, 0.85);
  padding: 10px;
}

.contacts-linked-activity {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 239, 233, 0.72)),
    var(--contacts-surface-strong);
}

.contacts-world-profile-fields {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(232, 242, 245, 0.82)),
    var(--contacts-surface-strong);
}

.contacts-world-field-list,
.contacts-world-field-form,
.contacts-world-field-editor {
  display: grid;
  gap: 9px;
}

.contacts-world-field-editor {
  border: 1px solid rgba(66, 111, 143, 0.16);
  border-radius: 14px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.74);
}

.contacts-template-change-review,
.contacts-template-adaptation-review {
  display: grid;
  gap: 8px;
  border: 1px solid rgba(191, 115, 84, 0.16);
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 247, 237, 0.72)),
    var(--contacts-warm-soft);
  padding: 10px;
}

.contacts-template-adaptation-review {
  border-color: rgba(66, 111, 143, 0.18);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.93), rgba(232, 242, 245, 0.72)),
    rgba(66, 111, 143, 0.08);
}

.contacts-template-change-review__head,
.contacts-template-adaptation-review__head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 8px;
}

.contacts-template-change-review__head i,
.contacts-template-adaptation-review__head i {
  display: inline-grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 9px;
  background: rgba(191, 115, 84, 0.14);
  color: #8a4b35;
  font-size: 11px;
}

.contacts-template-adaptation-review__head i {
  background: rgba(66, 111, 143, 0.13);
  color: var(--contacts-accent-strong);
}

.contacts-template-change-review__head p,
.contacts-template-change-review__head span,
.contacts-template-adaptation-review__head p,
.contacts-template-adaptation-review__head span {
  margin: 0;
}

.contacts-template-change-review__head p,
.contacts-template-adaptation-review__head p {
  color: var(--contacts-text);
  font-size: 12px;
  font-weight: 850;
}

.contacts-template-change-review__head span,
.contacts-template-adaptation-review__head span {
  display: block;
  margin-top: 2px;
  color: var(--contacts-muted);
  font-size: 11px;
  line-height: 1.42;
}

.contacts-template-change-review ul,
.contacts-template-adaptation-review ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
  color: var(--contacts-text);
  font-size: 11px;
  line-height: 1.45;
}

.contacts-template-adaptation-review__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.contacts-template-preserved-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.contacts-template-preserved-list span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  border-radius: 999px;
  background: rgba(49, 64, 86, 0.07);
  color: var(--contacts-text);
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 800;
}

.contacts-template-preserved-list small {
  color: var(--contacts-muted);
  font-size: 9px;
  font-weight: 700;
}

.contacts-world-field-editor__head,
.contacts-world-field-editor__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.contacts-world-field-editor__head p,
.contacts-world-field-editor__head span {
  margin: 0;
}

.contacts-world-field-editor__head p {
  color: var(--contacts-text);
  font-size: 13px;
  font-weight: 850;
}

.contacts-world-field-editor__head span {
  display: block;
  margin-top: 3px;
  color: var(--contacts-muted);
  font-size: 11px;
  line-height: 1.45;
}

.contacts-world-field-select,
.contacts-world-field-control input,
.contacts-world-field-control textarea,
.contacts-world-field-control select {
  width: 100%;
  border: 1px solid var(--contacts-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--contacts-text);
  padding: 8px 10px;
  font-size: 12px;
  outline: none;
}

.contacts-world-field-control {
  display: grid;
  gap: 6px;
  min-width: 0;
  border: 1px solid rgba(66, 111, 143, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.64);
  padding: 10px;
}

.contacts-world-field-control__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.contacts-world-field-control__label {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: var(--contacts-text);
  font-size: 12px;
  font-weight: 800;
}

.contacts-world-field-control__label > span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.contacts-world-field-control__label i {
  display: inline-grid;
  width: 24px;
  height: 24px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: rgba(66, 111, 143, 0.1);
  color: var(--contacts-accent-strong);
  font-size: 11px;
}

.contacts-world-field-type-chip {
  flex: 0 0 auto;
  border: 1px solid rgba(66, 111, 143, 0.13);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  color: var(--contacts-muted);
  padding: 3px 7px;
  font-size: 10px;
  font-weight: 850;
}

.contacts-world-field-control small {
  color: var(--contacts-warm);
  font-size: 10px;
  font-weight: 800;
}

.contacts-world-field-control__helper {
  margin: 0;
  color: var(--contacts-muted);
  font-size: 11px;
  line-height: 1.42;
}

.contacts-world-field-control textarea {
  min-height: 78px;
  resize: vertical;
}

.contacts-world-field-tag-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-height: 24px;
}

.contacts-world-field-tag-preview span,
.contacts-world-field-tag-preview em {
  border-radius: 999px;
  padding: 3px 7px;
  font-size: 10px;
  line-height: 1.3;
}

.contacts-world-field-tag-preview span {
  background: rgba(191, 115, 84, 0.12);
  color: #8a4a34;
  font-weight: 800;
}

.contacts-world-field-tag-preview em {
  color: var(--contacts-muted);
  background: rgba(49, 64, 86, 0.06);
  font-style: normal;
}

.contacts-world-field-control em {
  color: var(--contacts-muted);
  font-size: 11px;
  font-style: normal;
  line-height: 1.4;
}

.contacts-small-action,
.contacts-primary-action {
  min-height: 34px;
  border-radius: 12px;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 700;
}

.contacts-small-action,
.contacts-primary-action {
  color: var(--contacts-accent-strong);
  background: var(--contacts-accent-soft);
}

.contacts-ai-draft-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(66, 111, 143, 0.12);
  background: rgba(255, 255, 255, 0.82);
}

.contacts-ai-draft-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.contacts-ai-draft-status {
  margin: 0;
  border-radius: 12px;
  background: rgba(66, 111, 143, 0.08);
  color: var(--contacts-accent-strong);
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.45;
}

.contacts-empty-detail {
  border: 1px dashed rgba(49, 64, 86, 0.16);
  border-radius: 14px;
  padding: 12px;
  color: var(--contacts-muted);
  font-size: 11px;
  text-align: center;
}

.contacts-detail-counts {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  font-size: 10px;
  color: var(--contacts-muted);
}

.contacts-detail-counts span {
  border-radius: 999px;
  background: rgba(49, 64, 86, 0.07);
  padding: 3px 7px;
  line-height: 1.2;
}

.contacts-detail-group {
  display: grid;
  gap: 8px;
}

.contacts-detail-group + .contacts-detail-group {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(49, 64, 86, 0.08);
}

.contacts-detail-group-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.contacts-memory-toolbar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.contacts-memory-toolbar-field {
  display: grid;
  gap: 4px;
  color: var(--contacts-muted);
  font-size: 10px;
  font-weight: 700;
}

.contacts-memory-toolbar-field select {
  min-height: 34px;
  border: 1px solid var(--contacts-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--contacts-text);
  padding: 0 10px;
  font-size: 12px;
}

.contacts-memory-review-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.contacts-memory-review-statuses {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.contacts-memory-status-button {
  min-height: 30px;
  border: 1px solid rgba(49, 64, 86, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  color: var(--contacts-muted);
  padding: 0 10px;
  font-size: 11px;
  font-weight: 700;
}

.contacts-memory-status-button-active {
  border-color: rgba(66, 111, 143, 0.35);
  background: rgba(66, 111, 143, 0.12);
  color: var(--contacts-accent-strong);
}

.contacts-detail-item,
.contacts-memory-item {
  border: 1px solid var(--contacts-border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  padding: 10px;
}

.contacts-memory-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  text-align: left;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.contacts-memory-item-active {
  border-color: rgba(66, 111, 143, 0.42);
  background: rgba(66, 111, 143, 0.1);
  box-shadow: inset 3px 0 0 rgba(66, 111, 143, 0.72);
}

.contacts-memory-detail {
  border: 1px solid rgba(66, 111, 143, 0.22);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
  padding: 10px;
}

.contacts-memory-audit-grid,
.contacts-memory-event-list {
  display: grid;
  gap: 8px;
}

.contacts-memory-headline-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.contacts-memory-audit-grid {
  grid-template-columns: repeat(1, minmax(0, 1fr));
}

.contacts-memory-headline-card,
.contacts-memory-audit-card,
.contacts-memory-event-item {
  border: 1px solid rgba(49, 64, 86, 0.1);
  border-radius: 12px;
  background: rgba(245, 248, 250, 0.78);
  padding: 8px 9px;
}

.contacts-memory-event-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.contacts-source-chip {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(49, 64, 86, 0.08);
  color: var(--contacts-muted);
  padding: 3px 7px;
  font-size: 10px;
  line-height: 1.2;
}

.contacts-source-chip-event {
  background: var(--contacts-warm-soft);
  color: #9d583e;
}

.contacts-source-chip-custom {
  background: rgba(66, 111, 143, 0.11);
  color: var(--contacts-accent-strong);
}

.contacts-event-locked-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  border-radius: 10px;
  background: rgba(191, 115, 84, 0.08);
  padding: 6px 8px;
  color: #9d583e;
  font-size: 10px;
  line-height: 1.4;
}

.contacts-link-action {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(191, 115, 84, 0.12);
  color: #8a4b35;
  padding: 4px 7px;
  font-size: 10px;
  font-weight: 800;
  line-height: 1.1;
}

.contacts-detail-add input,
.contacts-detail-add textarea {
  background: rgba(255, 255, 255, 0.82);
  color: var(--contacts-text);
}

.contacts-danger-zone {
  border-color: rgba(220, 38, 38, 0.18);
}

.contacts-danger-inline,
.contacts-danger-secondary,
.contacts-danger-primary {
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}

.contacts-danger-inline {
  flex-shrink: 0;
  color: var(--system-danger);
}

.contacts-danger-secondary,
.contacts-danger-primary {
  min-height: 38px;
}

.contacts-danger-secondary {
  border: 1px solid rgba(220, 38, 38, 0.22);
  color: var(--system-danger);
  background: rgba(255, 255, 255, 0.7);
}

.contacts-danger-primary {
  color: #fff;
  background: linear-gradient(135deg, var(--system-danger), #b91c1c);
  box-shadow: 0 8px 18px rgba(185, 28, 28, 0.18);
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
.contacts-worldbook-handoff__action:focus-visible,
.contacts-modal-header button:focus-visible,
.contacts-small-action:focus-visible,
.contacts-primary-action:focus-visible,
.contacts-danger-inline:focus-visible,
.contacts-danger-secondary:focus-visible,
.contacts-danger-primary:focus-visible,
.contacts-modal-scroll button:focus-visible,
.contacts-modal-scroll input:focus-visible,
.contacts-modal-scroll textarea:focus-visible,
.contacts-modal-scroll select:focus-visible,
.contacts-world-field-select:focus-visible,
.contacts-world-field-control input:focus-visible,
.contacts-world-field-control textarea:focus-visible,
.contacts-world-field-control select:focus-visible {
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

@media (max-width: 720px) {
  .contacts-worldbook-handoff {
    grid-template-columns: 1fr;
  }

  .contacts-worldbook-handoff__action {
    width: 100%;
  }

  .contacts-world-profile-fields > .flex,
  .contacts-world-field-editor__head,
  .contacts-world-field-editor__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .contacts-world-profile-fields > .flex .contacts-small-action,
  .contacts-world-field-editor__head .contacts-small-action,
  .contacts-world-field-editor__actions .contacts-primary-action {
    width: 100%;
  }

  .contacts-runtime-audit-grid {
    grid-template-columns: 1fr;
  }

  .contacts-seed-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
