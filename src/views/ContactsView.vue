<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { CHAT_CONTACT_SOCIAL_STATES, useChatStore } from '../stores/chat'
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
  sourceRecordIdFromRelationshipSourceId,
  sourceModuleSummaryText as formatSourceModuleSummaryText,
} from '../lib/relationship-source-cleanup-handlers'
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

const selfProfiles = computed(() =>
  roleProfiles.value.filter((item) => item.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE),
)
const mainRoleProfiles = computed(() =>
  roleProfiles.value.filter(
    (item) => (item.entityType || CONTACTS_ENTITY_TYPES.MAIN_ROLE) === CONTACTS_ENTITY_TYPES.MAIN_ROLE,
  ),
)
const npcRoleProfiles = computed(() =>
  roleProfiles.value.filter((item) => item.entityType === CONTACTS_ENTITY_TYPES.NPC),
)
const mainProfiles = mainRoleProfiles
const npcProfiles = npcRoleProfiles
const selectedProfile = computed(
  () => chatStore.getRoleProfileById(selectedProfileId.value) || roleProfiles.value[0] || null,
)

const activeWorldRelationshipRegistry = computed(() => {
  const activePackId = user.value.activeWorldPackId || 'default_world'
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
const selectedProfileIsNpc = computed(() => selectedProfileEntityType.value === CONTACTS_ENTITY_TYPES.NPC)
const selectedProfileChatBound = computed(() =>
  selectedProfile.value?.id ? chatStore.isRoleProfileBound(selectedProfile.value.id) : false,
)
const contactsProfileTemplateOptions = computed(() => {
  const templates = systemStore.listWorldProfileTemplates('default_world')
  const selectedTemplateId = selectedProfile.value?.templateLink?.profileTemplateId || ''
  const selectedTemplate = selectedTemplateId
    ? systemStore.getProfileTemplateById(selectedTemplateId)
    : null
  if (selectedTemplate && !templates.some((template) => template.id === selectedTemplate.id)) {
    return [...templates, selectedTemplate]
  }
  return templates
})
const selectedProfileTemplate = computed(() => {
  const templateId = selectedProfile.value?.templateLink?.profileTemplateId || ''
  return templateId ? systemStore.getProfileTemplateById(templateId) : null
})
const fieldMatchesSelectedProfileEntity = (field = {}) => {
  const entityTypes = Array.isArray(field.entityTypes) ? field.entityTypes : []
  return entityTypes.length === 0 || entityTypes.includes(selectedProfileEntityType.value)
}
const selectedProfileTemplateFields = computed(() =>
  Array.isArray(selectedProfileTemplate.value?.fields)
    ? selectedProfileTemplate.value.fields.filter(fieldMatchesSelectedProfileEntity)
    : [],
)
const selectedProfileValueMap = computed(() => {
  const map = new Map()
  selectedProfileValues.value.forEach((value) => {
    if (value?.fieldId) map.set(value.fieldId, value)
  })
  return map
})
const selectedProfileWorldFieldRows = computed(() => {
  const templateFieldIds = new Set(selectedProfileTemplateFields.value.map((field) => field.id))
  const templateRows = selectedProfileTemplateFields.value.map((field) => ({
    key: field.id,
    field,
    value: selectedProfileValueMap.value.get(field.id) || null,
    title: field.label || field.id,
    description: field.description || '',
    isTemplateField: true,
  }))
  const extraRows = selectedProfileValues.value
    .filter((value) => value?.fieldId && !templateFieldIds.has(value.fieldId))
    .map((value) => ({
      key: value.fieldId,
      field: null,
      value,
      title: profileValueLabel(value),
      description: '',
      isTemplateField: false,
    }))
  return [...templateRows, ...extraRows]
})
const profileTemplateDraftTemplate = computed(() =>
  profileTemplateDraft.templateId
    ? systemStore.getProfileTemplateById(profileTemplateDraft.templateId)
    : null,
)
const profileTemplateDraftFields = computed(() =>
  Array.isArray(profileTemplateDraftTemplate.value?.fields)
    ? profileTemplateDraftTemplate.value.fields.filter(fieldMatchesSelectedProfileEntity)
    : [],
)
const profileTemplateVisibilityOptions = computed(() => [
  { value: PROFILE_VISIBILITY_LEVELS.PUBLIC, label: t('公开资料', 'Public') },
  { value: PROFILE_VISIBILITY_LEVELS.FAMILIAR, label: t('熟悉后知道', 'Familiar') },
  { value: PROFILE_VISIBILITY_LEVELS.INTIMATE, label: t('亲密后知道', 'Intimate') },
  { value: PROFILE_VISIBILITY_LEVELS.HIDDEN, label: t('隐藏设定', 'Hidden') },
  { value: PROFILE_VISIBILITY_LEVELS.WORLD_SPECIFIC, label: t('世界专属', 'World-specific') },
])

const selectedRoleChatContact = computed(() => {
  const profileId = selectedProfile.value?.id
  if (!profileId) return null
  return chatStore.contacts.find((contact) => contact.kind === 'role' && Number(contact.profileId) === Number(profileId)) || null
})

const selectedRoleHubStats = computed(() => {
  const profile = selectedProfile.value
  const totals = {
    manual: 0,
    eventAttached: 0,
  }
  if (profile?.id) {
    for (const section of Object.values(ROLE_DETAIL_SECTIONS)) {
      const stats = detailItemStatsForSection(profile, section)
      totals.manual += stats.manual
      totals.eventAttached += stats.eventAttached
    }
  }
  return {
    ...totals,
    worldFieldCount: selectedProfileValues.value.length,
    memoryCount: selectedRelationshipSnapshot.value?.totalMemoryCount || 0,
    chatBound: selectedProfileChatBound.value,
  }
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

const selectedMemoryGroups = computed(() =>
  selectedProfile.value
    ? relationshipRuntimeStore.listMemoryGroupsForTarget(
        profileRelationshipTarget(selectedProfile.value),
        50,
        { sortMode: memorySortMode.value },
      )
    : [],
)

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

const selectedMemorySourceAudit = computed(() => {
  const detail = selectedMemoryDetail.value
  const sourceCounts = detail?.sourceModuleCounts || {}
  const sourceRefs = Array.isArray(detail?.sourceRefs) ? detail.sourceRefs : []
  if (!detail || Object.keys(sourceCounts).length === 0) return []

  const refsByModule = sourceRefs.reduce((acc, ref) => {
    const moduleKey = ref?.sourceModule || ''
    if (!moduleKey) return acc
    if (!acc[moduleKey]) acc[moduleKey] = []
    if (ref?.sourceId) acc[moduleKey].push(ref.sourceId)
    return acc
  }, {})

  return Object.entries(sourceCounts)
    .sort(([leftModule], [rightModule]) => leftModule.localeCompare(rightModule))
    .map(([sourceModule, count]) => {
      const rawSourceIds = [...new Set((refsByModule[sourceModule] || []).filter(Boolean))]
      return {
        sourceModule,
        label: relationshipSourceModuleLabel(sourceModule),
        count: Number(count) || 0,
        cleanupConnected: typeof relationshipSourceCleanupHandlers.value[sourceModule] === 'function',
        rawSourceIds,
        recordIds: rawSourceIds.map((sourceId) => sourceRecordIdFromRelationshipSourceId(sourceId)),
      }
    })
})

const selectedMemoryEventTimeline = computed(() => {
  const detail = selectedMemoryDetail.value
  const events = Array.isArray(detail?.events) ? detail.events : []
  return events.slice(0, 4).map((event, index) => ({
    id: event.id || `${detail?.memoryKey || 'memory'}_${index}`,
    sourceModule: event.sourceModule || '',
    sourceModuleLabel: relationshipSourceModuleLabel(event.sourceModule),
    factTypeLabel: relationshipFactTypeLabel(event.factType),
    summary:
      event.summary ||
      detail?.displaySummary ||
      detail?.primarySummary ||
      detail?.latestSummary ||
      detail?.memoryKey ||
      '',
    createdAtText: formatRelationshipAuditTimestamp(event.createdAt),
    sourceId: event.sourceId || '',
    recordId: sourceRecordIdFromRelationshipSourceId(event.sourceId || ''),
  }))
})

const availableMemorySourceFilters = computed(() => {
  const modules = new Set()
  selectedMemoryGroups.value.forEach((memory) => {
    ;(memory.sourceModules || []).forEach((moduleKey) => {
      if (moduleKey) modules.add(moduleKey)
    })
  })
  return [
    { value: 'all', label: t('全部来源', 'All sources') },
    ...[...modules]
      .sort((left, right) => left.localeCompare(right))
      .map((moduleKey) => ({
        value: moduleKey,
        label: relationshipSourceModuleLabel(moduleKey),
      })),
  ]
})

const filteredMemoryGroups = computed(() => {
  const filterValue = memorySourceFilter.value
  return filterValue === 'all'
    ? selectedMemoryGroups.value
    : selectedMemoryGroups.value.filter((memory) => (memory.sourceModules || []).includes(filterValue))
})

const visibleMemoryGroups = computed(() =>
  filteredMemoryGroups.value.slice(0, 12),
)

const visibleMemoryCount = computed(() => visibleMemoryGroups.value.length)

const totalMemoryCount = computed(() => filteredMemoryGroups.value.length)

const hiddenMemoryCount = computed(() => Math.max(0, totalMemoryCount.value - visibleMemoryCount.value))

const memoryListSummaryText = computed(() => {
  if (totalMemoryCount.value === 0) {
    return t('暂无关系记忆组。', 'No relationship memory groups yet.')
  }
  if (hiddenMemoryCount.value <= 0) {
    return t(
      `当前展示 ${visibleMemoryCount.value} 条记忆组。`,
      `Showing ${visibleMemoryCount.value} memory groups.`,
    )
  }
  return t(
    `当前展示前 ${visibleMemoryCount.value} 条，另有 ${hiddenMemoryCount.value} 条符合筛选。`,
    `Showing the first ${visibleMemoryCount.value}; ${hiddenMemoryCount.value} more match the current filter.`,
  )
})

const selectedMemoryListCountLabel = computed(() =>
  hiddenMemoryCount.value > 0
    ? `${visibleMemoryCount.value} / ${totalMemoryCount.value}`
    : String(visibleMemoryCount.value),
)

const selectedMemoryListOverflowText = computed(() =>
  hiddenMemoryCount.value > 0
    ? t(
        `${hiddenMemoryCount.value} 条其余记忆已按当前排序保留在列表外，避免详情页过长。`,
        `${hiddenMemoryCount.value} additional memories stay outside the visible list to keep the detail page manageable.`,
      )
    : '',
)

const selectedMemoryHeadlineFacts = computed(() => {
  const detail = selectedMemoryDetail.value
  if (!detail) return []
  return [
    {
      key: 'sources',
      label: t('来源模块', 'Source modules'),
      value: String((detail.sourceModules || []).length || 0),
      detail: sourceModuleSummaryText(detail.sourceModuleCounts),
    },
    {
      key: 'supporting',
      label: t('支撑事件', 'Supporting events'),
      value: String((detail.events || []).length || 0),
      detail: t('该记忆组当前承接的关系事件数', 'Relationship events attached to this memory group'),
    },
    {
      key: 'latest',
      label: t('最近沉淀', 'Latest update'),
      value: formatRelationshipAuditTimestamp(detail.latestCreatedAt),
      detail: detail.latestSummary || detail.primarySummary || detail.memoryKey,
    },
    {
      key: 'review',
      label: t('管理状态', 'Review state'),
      value: memoryReviewStatusLabel(detail.reviewStatus),
      detail: detail.reviewNote || t('暂无管理备注', 'No review note yet'),
    },
  ]
})

const selectedLinkedActivityEntries = computed(() => {
  const detailItems = selectedProfile.value?.id
    ? Object.values(ROLE_DETAIL_SECTIONS).flatMap((section) =>
        detailItemsForSection(selectedProfile.value, section).filter(
          (item) =>
            item.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED &&
            (item.sourceModule || item.memoryKey || item.sourceId),
        ),
      )
    : []
  const memorySummaries = Array.isArray(selectedRelationshipSnapshot.value?.memorySummaries)
    ? selectedRelationshipSnapshot.value.memorySummaries
    : []
  const memorySummaryByKey = new Map(
    memorySummaries.map((memory) => [
      memory.memoryKey,
      memory.displaySummary || memory.primarySummary || memory.latestSummary || memory.memoryKey || '',
    ]),
  )
  const eventByMemoryKey = new Map(
    (selectedRelationshipSnapshot.value?.recentEvents || []).map((event) => [event.memoryKey, event]),
  )

  return detailItems
    .map((item) => {
      const sourceModuleLabel = relationshipSourceModuleLabel(item.sourceModule)
      const latestEvent = item.memoryKey ? eventByMemoryKey.get(item.memoryKey) : null
      return {
        id: item.id,
        title: item.title || item.detail || sourceModuleLabel,
        sectionLabel:
          item.section === ROLE_DETAIL_SECTIONS.LIFE_PATTERN
            ? t('生活模式', 'Life Pattern')
            : item.section === ROLE_DETAIL_SECTIONS.SOCIAL_GRAPH
              ? t('社会关系', 'Social Graph')
              : t('偏好', 'Preferences'),
        sourceModule: item.sourceModule || '',
        sourceModuleLabel,
        memoryKey: item.memoryKey || '',
        sourceId: item.sourceId || '',
        recordId: sourceRecordIdFromRelationshipSourceId(item.sourceId || ''),
        summary:
          memorySummaryByKey.get(item.memoryKey) ||
          latestEvent?.summary ||
          item.detail ||
          t('等待更多关系事件沉淀。', 'Waiting for more relationship events.'),
      }
    })
    .sort((left, right) => left.sourceModuleLabel.localeCompare(right.sourceModuleLabel))
})

const selectedLinkedActivitySummary = computed(() => {
  const profile = selectedProfile.value
  if (!profile?.id) {
    return {
      sourceText: t('No linked activity yet', 'No linked activity yet'),
      supportingCount: 0,
      eventAttachedCount: 0,
      latestSummary: '',
    }
  }
  const runtimeSourceRefs = Array.isArray(selectedRelationshipSnapshot.value?.sourceRefs)
    ? selectedRelationshipSnapshot.value.sourceRefs
    : []
  const sourceRefMap = new Map(
    runtimeSourceRefs
      .filter((ref) => ref?.sourceModule)
      .map((ref) => [
        `${ref.sourceModule}:${ref.sourceId || ''}`,
        {
          sourceModule: ref.sourceModule,
          sourceId: ref.sourceId || '',
        },
      ]),
  )
  const eventAttachedItems = Object.values(ROLE_DETAIL_SECTIONS).flatMap((section) =>
    detailItemsForSection(profile, section).filter(
      (item) => item.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED,
    ),
  )
  eventAttachedItems.forEach((item) => {
    if (!item.sourceModule) return
    const key = `${item.sourceModule}:${item.sourceId || `detail_item:${item.id}`}`
    if (!sourceRefMap.has(key)) {
      sourceRefMap.set(key, {
        sourceModule: item.sourceModule,
        sourceId: item.sourceId || '',
      })
    }
  })
  const sourceCounts = [...sourceRefMap.values()].reduce((acc, ref) => {
    acc[ref.sourceModule] = (Number(acc[ref.sourceModule]) || 0) + 1
    return acc
  }, {})
  return {
    sourceText:
      Object.keys(sourceCounts).length > 0
        ? sourceModuleSummaryText(sourceCounts)
        : t('No linked activity yet', 'No linked activity yet'),
    supportingCount: Object.values(sourceCounts).reduce((sum, count) => sum + (Number(count) || 0), 0),
    eventAttachedCount: eventAttachedItems.length,
    latestSummary:
      relationshipMemoryReviewSummaryText(selectedRelationshipSnapshot.value?.primaryMemory) ||
      selectedRelationshipSnapshot.value?.primaryMemory?.recallSummary ||
      selectedRelationshipSnapshot.value?.primaryMemory?.displaySummary ||
      selectedRelationshipSnapshot.value?.primaryMemory?.primarySummary ||
      selectedRelationshipSnapshot.value?.primaryMemory?.latestSummary ||
      selectedRelationshipSnapshot.value?.latestEventSummary ||
      '',
  }
})

const contactsEntityTypeLabel = (entityType) => {
  if (entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) return t('自我档案', 'Self Profile')
  if (entityType === CONTACTS_ENTITY_TYPES.NPC) return t('NPC / 世界角色', 'NPC / World Role')
  return t('主要角色', 'Main Role')
}

const selectedChatStateLabel = computed(() => {
  if (selectedProfileEntityType.value === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
    return t('不作为 Chat 目标', 'Not a Chat target')
  }
  return selectedProfileChatBound.value ? t('Chat 目标', 'Chat target') : t('仅在 Contacts', 'Contacts only')
})

const selectedChatStateDetail = computed(() => {
  if (selectedProfileEntityType.value === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
    return t(
      '自我档案只通过可见性门控进入上下文，不会绑定成聊天对象。',
      'Self Profile only enters context through visibility gates and is not bound as a chat target.',
    )
  }
  if (selectedProfileChatBound.value) {
    return t(
      '已进入 Chat Directory；这里仍保留档案、关系和记忆管理。',
      'Already in Chat Directory; Contacts still owns profile, relationship, and memory management.',
    )
  }
  return t(
    '需要聊天时到 Chat Directory 绑定；Contacts 仍可先维护完整档案。',
    'Bind in Chat Directory when this role should enter Chat; Contacts can maintain the profile first.',
  )
})

const chatSocialSnapshotLabel = (state = '') => {
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONNECTED) return t('可正常聊天', 'Can chat normally')
  if (state === CHAT_CONTACT_SOCIAL_STATES.STRANGER) {
    return t('还不是常规 Chat 联系人', 'Not a normal Chat contact yet')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST) {
    return t('打招呼请求待处理', 'Greeting request pending')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST) {
    return t('用户已发送打招呼请求', 'User greeting request sent')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED) {
    return t('请求已被忽略或拒绝', 'Request declined or ignored')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED) return t('已被用户拉黑', 'Blocked by user')
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED) {
    return t('对方暂不接收消息', 'They are not receiving messages')
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED) {
    return t('双方互相拉黑', 'Both sides are blocked')
  }
  return t('没有 Chat 绑定', 'No Chat binding')
}

const selectedChatSocialSnapshot = computed(() => {
  const contact = selectedRoleChatContact.value
  if (!contact) {
    return {
      exists: false,
      label: t('没有 Chat 绑定', 'No Chat binding'),
      detail: t(
        'Contacts 保留角色档案；Chat Directory 决定这个角色是否能进入聊天。',
        'Contacts keeps the role profile. Chat Directory decides whether this role can chat.',
      ),
      note: '',
      updatedAtLabel: '',
    }
  }
  const state = chatStore.getContactChatSocialState(contact)
  return {
    exists: true,
    state,
    label: chatSocialSnapshotLabel(state),
    detail: t(
      '来自 Chat 的只读快照。Contacts 只展示这个状态，不应用通讯变更。',
      'Read-only from Chat. Contacts displays this state but does not apply communication changes.',
    ),
    note: contact.chatSocialNote || '',
    updatedAtLabel: contact.chatSocialUpdatedAt
      ? formatRelationshipAuditTimestamp(contact.chatSocialUpdatedAt)
      : '',
  }
})

const selectedRoleHubCards = computed(() => [
  {
    key: 'entity',
    label: t('实体', 'Entity'),
    value: contactsEntityTypeLabel(selectedProfileEntityType.value),
    detail: selectedChatStateDetail.value,
  },
  {
    key: 'chat',
    label: t('Chat 状态', 'Chat state'),
    value: selectedChatStateLabel.value,
    detail: selectedRoleChatContact.value
      ? t(`会话 ID ${selectedRoleChatContact.value.id}`, `Chat ID ${selectedRoleChatContact.value.id}`)
      : t('还没有会话入口', 'No chat entry yet'),
  },
  {
    key: 'manual',
    label: t('手动条目', 'Manual details'),
    value: String(selectedRoleHubStats.value.manual),
    detail: t('用户维护的稳定设定', 'User-maintained stable facts'),
  },
  {
    key: 'event',
    label: t('事件挂载', 'Event-attached'),
    value: String(selectedRoleHubStats.value.eventAttached),
    detail: t('随记忆或关系重置清理', 'Cleared with memory or relationship reset'),
  },
  {
    key: 'world',
    label: t('世界字段', 'World fields'),
    value: String(selectedRoleHubStats.value.worldFieldCount),
    detail: t('来自 WorldBook 模板', 'From WorldBook templates'),
  },
  {
    key: 'memory',
    label: t('记忆组', 'Memories'),
    value: String(selectedRoleHubStats.value.memoryCount),
    detail: selectedLinkedActivitySummary.value.sourceText,
  },
])

const openSelectedChatTarget = () => {
  const contact = selectedRoleChatContact.value
  if (contact?.id) router.push(`/chat/${contact.id}`)
}

const openChatDirectory = () => {
  router.push('/chat-contacts')
}

const roleDetailSections = computed(() => [
  {
    key: ROLE_DETAIL_SECTIONS.PREFERENCES,
    title: t('偏好', 'Preferences'),
    empty: t('暂无偏好条目。', 'No preference entries yet.'),
    placeholderTitle: t('偏好标题', 'Preference title'),
    placeholderDetail: t('偏好说明', 'Preference detail'),
  },
  {
    key: ROLE_DETAIL_SECTIONS.LIFE_PATTERN,
    title: t('生活模式', 'Life Pattern'),
    empty: t('暂无生活模式条目。', 'No life-pattern entries yet.'),
    placeholderTitle: t('模式标题', 'Pattern title'),
    placeholderDetail: t('生活节奏、作息或习惯', 'Rhythm, schedule, or habit'),
  },
  {
    key: ROLE_DETAIL_SECTIONS.SOCIAL_GRAPH,
    title: t('社会关系', 'Social Graph'),
    empty: t('暂无社会关系条目。', 'No social-graph entries yet.'),
    placeholderTitle: t('关系标题', 'Relationship title'),
    placeholderDetail: t('人物、组织或关系说明', 'Person, group, or relationship detail'),
  },
])

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

const detailItemsForSection = (profile, section) =>
  profile?.id ? chatStore.listRoleDetailItems(profile.id, section) : []

const detailItemStatsForSection = (profile, section) => {
  const items = detailItemsForSection(profile, section)
  return {
    total: items.length,
    manual: items.filter((item) => item.sourceKind !== ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED).length,
    eventAttached: items.filter((item) => item.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED).length,
  }
}

const detailItemGroupsForSection = (profile, section) => {
  const items = detailItemsForSection(profile, section)
  return [
    {
      key: ROLE_DETAIL_SOURCE_KINDS.MANUAL,
      title: t('手动条目', 'Manual details'),
      description: t('用户维护的稳定设定，可在这里单独删除。', 'User-maintained stable facts that can be deleted here.'),
      items: items.filter((item) => item.sourceKind !== ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED),
    },
    {
      key: ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED,
      title: t('事件挂载', 'Event-attached'),
      description: t(
        '由聊天、地图、日程等发展挂载；通过对应记忆或关系重置清理。',
        'Attached by Chat, Map, Calendar, or other development; clear through the linked memory or relationship reset.',
      ),
      items: items.filter((item) => item.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED),
    },
  ].filter((group) => group.items.length > 0)
}

const roleDetailSourceLabel = (item) =>
  item?.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED
    ? t('事件挂载', 'Event-attached')
    : t('手动', 'Manual')

const roleDetailSourceHint = (item) => {
  if (item?.sourceKind !== ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED) {
    return t('用户手动输入，可单独删除。', 'User-entered detail. It can be deleted directly.')
  }
  const refs = [
    item.memoryKey ? `${t('记忆', 'Memory')}: ${item.memoryKey}` : '',
    item.sourceModule ? `${t('来源', 'Source')}: ${item.sourceModule}` : '',
  ].filter(Boolean)
  const suffix = refs.length ? ` ${refs.join(' · ')}` : ''
  return `${t(
    '事件发展挂载，需删除对应记忆或重置关系后自动清理。',
    'Attached by relationship events; delete the linked memory or reset the relationship to clear it.',
  )}${suffix}`
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

const profileValueLabel = (value) => {
  if (!value?.fieldId) return t('自定义字段', 'Custom field')
  const matchedField = selectedProfileTemplateFields.value.find((field) => field.id === value.fieldId)
  if (matchedField?.label) return matchedField.label
  if (value.fieldId === 'pheromone') return t('信息素', 'Pheromone')
  if (value.fieldId === 'relationship_setting') return t('关系设定', 'Relationship setting')
  return value.fieldId
}

const formatProfileValue = (value) => {
  if (Array.isArray(value?.value)) return value.value.join(', ')
  return typeof value?.value === 'string' ? value.value : ''
}

const profileVisibilityLevelLabel = (level = '') =>
  profileTemplateVisibilityOptions.value.find((option) => option.value === level)?.label ||
  t('熟悉后知道', 'Familiar')

const profileTemplateFieldPlaceholder = (field = {}) => {
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS) {
    return t('用逗号分隔多个标签', 'Separate tags with commas')
  }
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE) {
    return t('填写相关人物或角色 ID', 'Enter related person or role ID')
  }
  return t('填写这个角色的具体值', 'Enter this profile value')
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

const saveProfileTemplateValues = () => {
  const profile = selectedProfile.value
  const template = profileTemplateDraftTemplate.value
  if (!profile?.id || !template?.id) {
    setUiNotice('warning', t('请先选择一个世界档案模板。', 'Choose a world profile template first.'))
    return
  }
  const fields = profileTemplateDraftFields.value
  const editableFieldIds = new Set(fields.map((field) => field.id))
  const preservedValues = selectedProfileValues.value.filter(
    (value) => value?.fieldId && !editableFieldIds.has(value.fieldId),
  )
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
      primaryWorldId: template.worldId || 'default_world',
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

const selectedDangerImpactText = computed(() =>
  selectedDeleteImpact.value
    ? `${t('影响', 'Impact')}: ${t('Chat 绑定', 'Chat bindings')} ${selectedDeleteImpact.value.chatBindingCount || 0} · ${t('记忆组', 'memories')} ${selectedDeleteImpact.value.memoryGroupCount || 0} · ${t('来源', 'sources')} ${sourceModuleSummaryText(selectedDeleteImpact.value.sourceModuleCounts)}`
    : '',
)

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
  const snapshot = selectedRelationshipSnapshot.value
  const impact = selectedDeleteImpact.value
  const firstOk = await confirmDialog({
    title: t('重置关系进度', 'Reset relationship progress'),
    message: t(
      '该操作会保留角色档案，但清除关系指标、阶段、里程碑、成长特征、记忆组、事件挂载详情和聊天记录。',
      'This keeps the role profile but clears metrics, stage, milestones, growth traits, memories, event-attached details, and chat history.',
    ),
    details: [
      `${t('当前阶段', 'Current stage')}: ${relationshipStageLabel(snapshot?.relationshipStage)}`,
      `${t('记忆组', 'Memory groups')}: ${impact?.memoryGroupCount || 0}`,
      `${t('跨模块来源', 'Cross-module sources')}: ${sourceModuleSummaryText(impact?.sourceModuleCounts)}`,
      cleanupCoverageText(impact?.sourceModuleCounts),
    ],
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
  const impact = selectedDeleteImpact.value
  const firstOk = await confirmDialog({
    title: t('删除角色档案', 'Delete role profile'),
    message: t(
      '该操作不可撤销，会删除 Contacts 档案、Chat Directory 绑定、该角色聊天记录、关系进度和记忆组。',
      'This cannot be undone. It deletes the Contacts profile, Chat Directory binding, role chat history, relationship progress, and memories.',
    ),
    details: [
      `${t('角色', 'Role')}: ${profile.name || ''} · ID ${normalizeRoleId(profile.roleId, profile.id)}`,
      `${t('Chat 绑定', 'Chat bindings')}: ${impact?.chatBindingCount || 0}`,
      `${t('记忆组', 'Memory groups')}: ${impact?.memoryGroupCount || 0}`,
      t(
        'Photos 素材不会被静默删除，只会解除角色档案引用；如需删除图片，请前往相册手动处理。',
        'Photos assets are not silently deleted; role references are unbound only. Delete images manually in Gallery if needed.',
      ),
    ],
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
    details: [
      `${t('范围', 'Scope')}: Contacts profile · Chat Directory binding · Chat history · Relationship runtime`,
      `${t('角色', 'Role')}: ${profile.name || ''} · ID ${normalizeRoleId(profile.roleId, profile.id)}`,
      selectedDangerImpactText.value,
      dangerIncludeLinkedRecords.value
        ? cleanupCoverageText(impact?.sourceModuleCounts)
        : t('不会删除跨模块源记录；它们只保留在影响清单中。', 'Cross-module source records will not be deleted; they stay in the impact summary only.'),
      t(
        'Photos 素材只解除引用，不会静默删除源图片。',
        'Photos assets are unbound only; source images are not silently deleted.',
      ),
    ],
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
    message: detail?.displaySummary || memory.displaySummary || memory.primarySummary || memory.memoryKey,
    details: [
      `${t('包含关系事件', 'Relationship events')}: ${detail?.events?.length || memory.supportingCount || 0}`,
      `${t('来源', 'Sources')}: ${sourceModuleSummaryText(detail?.sourceModuleCounts)}`,
      cleanupCoverageText(detail?.sourceModuleCounts),
    ],
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
    details: [
      `${t('记忆键', 'Memory key')}: ${memory.memoryKey}`,
      t(
        '普通自由聊天消息不会被删除。',
        'Normal free-form chat messages will not be deleted.',
      ),
      t(
        '如需删除原始聊天文本，请前往 Chat 对话中处理。',
        'Delete original chat text from the Chat conversation if needed.',
      ),
    ],
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
      <div class="px-4 py-2">
        <div class="contacts-search bg-gray-100 rounded-lg px-3 py-1.5 flex items-center text-gray-500 text-sm">
          <i class="fas fa-search mr-2"></i> {{ t('搜索', 'Search') }}
        </div>
      </div>
      <p class="contacts-boundary-copy px-4 pb-2 text-[11px]" data-testid="contacts-boundary-copy">
        {{
          t(
            'Contacts 是角色档案库与角色中枢。角色可以只存在于这里，不一定成为 Chat 会话；需要进入聊天时再到 Chat Directory 绑定。',
            'Contacts is the role archive and role hub. A role can live here without becoming a Chat thread; bind it in Chat Directory when it should enter Chat.',
          )
        }}
      </p>

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
        <section v-if="selfProfiles.length > 0" class="contacts-list-section">
          <div class="contacts-section-title text-xs font-bold text-gray-500 mb-2">{{ t('My Profile', 'My Profile') }}</div>
          <div
            v-for="contact in selfProfiles"
            :key="contact.id"
            class="contacts-row flex items-center gap-3 py-2 border-b border-gray-50"
            :class="Number(selectedProfileId) === Number(contact.id) ? 'contacts-row-active' : ''"
            :data-testid="`contacts-row-${contact.id}`"
            @click="selectProfile(contact)"
          >
            <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              <img
                :src="contactAvatarUrl(contact)"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium truncate">{{ contact.name }} · ID {{ normalizeRoleId(contact.roleId, contact.id) }}</p>
              <p class="text-[11px] text-gray-400 truncate">{{ t('Self Profile', 'Self Profile') }}</p>
              <p class="text-[10px] text-gray-400 truncate">{{ profileKnowledgeSummary(contact) }}</p>
            </div>
            <button @click.stop="openEditProfile(contact)" class="text-xs text-blue-500">{{ t('编辑', 'Edit') }}</button>
            <i class="fas fa-chevron-right text-[11px] text-gray-400"></i>
          </div>
        </section>

        <div class="contacts-section-title text-xs font-bold text-gray-500 mb-2">{{ t('Main Roles', 'Main Roles') }}</div>
        <div
          v-for="contact in mainProfiles"
          :key="contact.id"
          class="contacts-row flex items-center gap-3 py-2 border-b border-gray-50"
          :class="Number(selectedProfileId) === Number(contact.id) ? 'contacts-row-active' : ''"
          :data-testid="`contacts-row-${contact.id}`"
          @click="selectProfile(contact)"
        >
          <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img
              :src="contactAvatarUrl(contact)"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ contact.name }} · ID {{ normalizeRoleId(contact.roleId, contact.id) }}</p>
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
          <button @click.stop="openEditProfile(contact)" class="text-xs text-blue-500">{{ t('编辑', 'Edit') }}</button>
          <i class="fas fa-chevron-right text-[11px] text-gray-400"></i>
        </div>

        <div class="contacts-section-title text-xs font-bold text-gray-500 mt-4 mb-2">{{ t('NPC / World roles', 'NPC / World roles') }}</div>
        <div
          v-for="contact in npcProfiles"
          :key="contact.id"
          class="contacts-row flex items-center gap-3 py-2 border-b border-gray-50"
          :class="Number(selectedProfileId) === Number(contact.id) ? 'contacts-row-active' : ''"
          :data-testid="`contacts-row-${contact.id}`"
          @click="selectProfile(contact)"
        >
          <div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            <img
              :src="contactAvatarUrl(contact)"
              class="w-full h-full object-cover"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium truncate">{{ contact.name }} · ID {{ normalizeRoleId(contact.roleId, contact.id) }}</p>
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
          <button @click.stop="openEditProfile(contact)" class="text-xs text-blue-500">{{ t('编辑', 'Edit') }}</button>
          <i class="fas fa-chevron-right text-[11px] text-gray-400"></i>
        </div>

        <div
          v-if="selectedProfile"
          class="contacts-detail mt-5 space-y-3"
          data-testid="contacts-role-detail"
        >
          <section class="contacts-detail-section">
            <div class="flex items-start gap-3">
              <div class="w-14 h-14 rounded-full bg-gray-200 overflow-hidden shrink-0">
                <img :src="contactAvatarUrl(selectedProfile)" class="w-full h-full object-cover" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-[11px] uppercase text-gray-400 font-bold">{{ t('Profile', 'Profile') }}</p>
                <h2 class="text-lg font-bold truncate">{{ selectedProfile.name }}</h2>
                <p class="text-xs text-gray-500 truncate">
                  {{ selectedProfile.role || t('未设置角色', 'Role not set') }} · ID {{ normalizeRoleId(selectedProfile.roleId, selectedProfile.id) }}
                </p>
                <p class="text-[11px] text-gray-500 mt-1 line-clamp-3">
                  {{ selectedProfile.bio || t('暂无档案简介。', 'No profile intro yet.') }}
                </p>
              </div>
              <button @click="openEditProfile(selectedProfile)" class="contacts-small-action">
                {{ t('编辑', 'Edit') }}
              </button>
            </div>
            <div v-if="selectedProfileIsNpc" class="mt-3 space-y-2">
              <button
                type="button"
                class="contacts-primary-action"
                data-testid="contacts-upgrade-npc"
                @click="upgradeSelectedNpcToMainRole"
              >
                {{ t('Upgrade to main role', 'Upgrade to main role') }}
              </button>
              <p class="text-xs text-gray-500">
                {{
                  selectedProfileChatBound
                    ? t('Existing Chat binding will be preserved.', 'Existing Chat binding will be preserved.')
                    : t('Upgrade will not force Chat Directory binding.', 'Upgrade will not force Chat Directory binding.')
                }}
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
                  {{
                    selectedProfileTemplate
                      ? t(
                          `来自模板：${selectedProfileTemplate.title}`,
                          `From template: ${selectedProfileTemplate.title}`,
                        )
                      : t(
                          '这里填写由世界书模板定义的角色、用户档案或 NPC 专属资料。',
                          'Fill concrete role, self-profile, or NPC values defined by WorldBook templates.',
                        )
                  }}
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

            <div v-if="selectedProfileWorldFieldRows.length > 0" class="contacts-world-field-list">
              <div
                v-for="row in selectedProfileWorldFieldRows"
                :key="row.key"
                class="contacts-detail-item"
                :data-testid="`contacts-world-field-${row.key}`"
              >
                <div>
                  <p class="font-medium">{{ row.title }}</p>
                  <p v-if="row.value" class="text-sm text-gray-600">{{ formatProfileValue(row.value) }}</p>
                  <p v-else class="text-sm text-gray-400">{{ t('未填写', 'Not filled') }}</p>
                  <p v-if="row.description" class="mt-1 text-[11px] leading-4 text-gray-500">
                    {{ row.description }}
                  </p>
                </div>
                <span class="contacts-source-chip">
                  {{
                    row.value
                      ? profileVisibilityLevelLabel(row.value.visibilityLevel)
                      : profileVisibilityLevelLabel(row.field?.defaultVisibilityLevel)
                  }}
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
                  {{ template.title }} · v{{ template.version }}
                </option>
              </select>

              <div v-if="contactsProfileTemplateOptions.length === 0" class="contacts-empty-detail">
                <p>
                  {{
                    t(
                      '当前世界还没有角色档案模板。先到世界书复制或建立模板，再回来填写角色值。',
                      'This world has no role profile template yet. Create or copy one in WorldBook first.',
                    )
                  }}
                </p>
                <button type="button" class="contacts-small-action mt-2" @click="openWorldBookProfileTemplates">
                  {{ t('打开世界书', 'Open WorldBook') }}
                </button>
              </div>

              <div v-else-if="profileTemplateDraftFields.length > 0" class="contacts-world-field-form">
                <label
                  v-for="field in profileTemplateDraftFields"
                  :key="field.id"
                  class="contacts-world-field-control"
                  :data-testid="`contacts-profile-template-field-${field.id}`"
                >
                  <span>
                    {{ field.label }}
                    <small v-if="field.required">{{ t('必填', 'Required') }}</small>
                  </span>
                  <select
                    v-if="field.type === PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT && field.options.length > 0"
                    v-model="profileTemplateDraft.values[field.id]"
                    :data-testid="`contacts-profile-template-value-${field.id}`"
                  >
                    <option value="">{{ t('未填写', 'Not filled') }}</option>
                    <option v-for="option in field.options" :key="option" :value="option">
                      {{ option }}
                    </option>
                  </select>
                  <textarea
                    v-else-if="field.type === PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT"
                    v-model="profileTemplateDraft.values[field.id]"
                    :data-testid="`contacts-profile-template-value-${field.id}`"
                    :placeholder="profileTemplateFieldPlaceholder(field)"
                    rows="3"
                  ></textarea>
                  <input
                    v-else
                    v-model="profileTemplateDraft.values[field.id]"
                    :data-testid="`contacts-profile-template-value-${field.id}`"
                    :placeholder="profileTemplateFieldPlaceholder(field)"
                  />
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
                {{ t('这个模板没有适用于当前人物类型的字段。', 'This template has no fields for this profile type.') }}
              </p>

              <div class="contacts-world-field-editor__actions">
                <button type="button" class="contacts-primary-action" data-testid="contacts-save-world-profile-fields" @click="saveProfileTemplateValues">
                  {{ t('保存世界字段', 'Save world fields') }}
                </button>
              </div>
            </div>
          </section>

          <section
            v-for="section in roleDetailSections"
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
                <span>{{ t('手动', 'Manual') }} {{ detailItemStatsForSection(selectedProfile, section.key).manual }}</span>
                <span>{{ t('事件', 'Event') }} {{ detailItemStatsForSection(selectedProfile, section.key).eventAttached }}</span>
              </div>
            </div>
            <p class="text-[11px] leading-4 text-gray-500">
              {{ t('手动条目由用户维护；事件挂载条目来自聊天、地图、日程等发展，会随记忆删除或关系重置一起清理。', 'Manual entries are user-maintained; event-attached entries come from Chat, Map, Calendar, and other development, and are cleared with memory deletion or relationship reset.') }}
            </p>
            <div
              v-if="detailItemsForSection(selectedProfile, section.key).length === 0"
              class="contacts-empty-detail"
            >
              {{ section.empty }}
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="group in detailItemGroupsForSection(selectedProfile, section.key)"
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
                {{ t('同时尝试删除已明确接入 cleanup 的跨模块源记录；未接入或语义不明的记录只会出现在影响清单中。', 'Also attempt to delete cross-module source records with explicit cleanup handlers. Missing or ambiguous records stay in the impact summary only.') }}
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

.contacts-boundary-copy {
  color: var(--contacts-muted);
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

.contacts-row-active {
  border-color: rgba(66, 111, 143, 0.36);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(231, 242, 246, 0.94)),
    var(--contacts-surface-strong);
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
}

.contacts-world-field-control > span {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--contacts-text);
  font-size: 12px;
  font-weight: 800;
}

.contacts-world-field-control small {
  color: var(--contacts-warm);
  font-size: 10px;
  font-weight: 800;
}

.contacts-world-field-control textarea {
  min-height: 78px;
  resize: vertical;
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
