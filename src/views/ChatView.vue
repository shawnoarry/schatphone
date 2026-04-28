<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useMapStore } from '../stores/map'
import { GALLERY_ASSET_CATEGORIES, useGalleryStore } from '../stores/gallery'
import { callAI, formatApiErrorForUi, getAiProviderCapabilities } from '../lib/ai'
import { buildMessageEditValidation, MESSAGE_EDIT_REASON } from '../lib/chat-message-edit'
import { extractAssistantPayloadText, parseAssistantJsonPayload, stripCodeFence } from '../lib/chat-response'
import { resolveAvatarWithHierarchy } from '../lib/avatar'
import {
  getRoleAssetFolderSlotKeysByCategory,
  resolveFolderBoundAssetIds,
} from '../lib/role-asset-folder-resolver'
import {
  SEMANTIC_REVISION_TRACE_MODES,
  normalizeSemanticRevisionTraceMode,
  shouldShowSemanticRevisionHint,
} from '../lib/semantic-revision-policy'
import {
  MEDIA_KIND,
  MEDIA_SIZE_SCENE,
  formatBytesCompact,
  resolveMediaSizeLimitBytes,
  validateMediaFileBySize,
} from '../lib/media-policy'
import { useI18n } from '../composables/useI18n'
import { useDialog } from '../composables/useDialog'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const mapStore = useMapStore()
const galleryStore = useGalleryStore()
const { systemLanguage, languageBase, t } = useI18n()
const { confirmDialog } = useDialog()

const { settings, user } = storeToRefs(systemStore)
const { contactsForList, loadingAI } = storeToRefs(chatStore)
const { currentLocationText } = storeToRefs(mapStore)

const DEFAULT_THREAD_AI_PREFS = {
  suggestedRepliesEnabled: false,
  contextTurns: 8,
  bilingualEnabled: false,
  secondaryLanguage: 'en',
  allowQuoteReply: true,
  allowSelfQuote: false,
  virtualVoiceEnabled: true,
  replyMode: 'manual',
  replyCount: 1,
  responseStyle: 'immersive',
  proactiveOpenerEnabled: false,
  proactiveOpenerStrategy: 'on_enter_once',
  imageReferenceMode: 'auto',
  allowImageVirtualWithoutReference: false,
  autoInvokeEnabled: false,
  autoInvokeIntervalSec: 360,
}

const REPLY_MODE_OPTIONS = computed(() => [
  { value: 'manual', label: t('手动触发', 'Manual trigger') },
  { value: 'auto', label: t('自动触发', 'Auto trigger') },
])

const RESPONSE_STYLE_OPTIONS = computed(() => [
  { value: 'immersive', label: t('沉浸', 'Immersive') },
  { value: 'natural', label: t('自然', 'Natural') },
  { value: 'concise', label: t('简洁', 'Concise') },
])

const PROACTIVE_STRATEGY_OPTIONS = computed(() => [
  { value: 'on_enter_once', label: t('仅首次空会话进入', 'First empty enter only') },
  { value: 'on_every_enter_if_empty', label: t('每次空会话进入', 'Every empty enter') },
])

const IMAGE_REFERENCE_MODE_OPTIONS = computed(() => [
  { value: 'auto', label: t('自动（推荐）', 'Auto (recommended)') },
  { value: 'context_only', label: t('仅上下文线索', 'Context cues only') },
  { value: 'native_url', label: t('偏好原生图输入', 'Prefer native image input') },
])

// Keep AI reply content independent from global UI language.
const AI_REPLY_FALLBACK_TEXT = Object.freeze({
  voiceLabel: '语音消息',
  moduleLabel: '打开模块',
  transferLabel: '转账卡片',
  imageAlt: '图片消息',
  sceneTitle: '小剧场',
})
const MAX_ASSISTANT_TEXT_CHARS = 3000
const MAX_ASSISTANT_DETAIL_CHARS = 800
const MAX_ASSISTANT_LABEL_CHARS = 80
const MAX_ASSISTANT_BLOCKS = 12
const MAX_ASSISTANT_QUOTE_PREVIEW_CHARS = 240
const MAX_CONTEXT_REFERENCE_IMAGES = 3
const MAX_CONTEXT_REFERENCE_IMAGE_BYTES = 1_500_000
const IMAGE_REFERENCE_TRANSPORT_MODES = new Set(['none', 'context_only', 'native_url'])
const SEMANTIC_REVISION_TRACE_MODE = normalizeSemanticRevisionTraceMode(
  import.meta?.env?.VITE_SEMANTIC_REVISION_TRACE_MODE,
  SEMANTIC_REVISION_TRACE_MODES.SILENT,
)

const STATUS_OPTIONS = computed(() => [
  { id: 'idle', label: t('空闲', 'Idle'), hint: t('可联系', 'Available'), dotClass: 'chat-status-dot-idle' },
  { id: 'busy', label: t('忙碌', 'Busy'), hint: t('勿扰', 'Do not disturb'), dotClass: 'chat-status-dot-busy' },
  { id: 'away', label: t('离开', 'Away'), hint: t('暂时离线', 'Temporary offline'), dotClass: 'chat-status-dot-away' },
])

const SAFE_MODULE_ROUTES = new Set([
  '/home',
  '/settings',
  '/appearance',
  '/network',
  '/profile',
  '/worldbook',
  '/chat',
  '/chat-contacts',
  '/contacts',
  '/gallery',
  '/phone',
  '/map',
  '/calendar',
  '/wallet',
  '/stock',
  '/files',
  '/more',
])

const MANUAL_TRIGGER_ID = '__manual__'
const CHAT_AUTOMATION_MODULE_KEY = 'chat'
const MIN_AUTO_INVOKE_INTERVAL_SEC = 60
const MAX_AUTO_INVOKE_INTERVAL_SEC = 86400
const MANUAL_PRIORITY_GUARD_MS = 1500
const MAX_RESTORE_NOTIFICATIONS_PER_CONTACT = 3
const SAVE_FEEDBACK_DURATION_MS = 1200
const MESSAGE_LONG_PRESS_MS = 380
const USER_MEDIA_KIND_IMAGE = 'image'
const USER_MEDIA_KIND_GIF = 'gif'
const USER_ACTION_FORM_NONE = ''
const USER_ACTION_FORM_LINK = 'link'
const USER_ACTION_FORM_TRANSFER = 'transfer'
const USER_ACTION_FORM_VOICE = 'voice'
const USER_ACTION_FORM_GALLERY = 'gallery'

const inputMessage = ref('')
const chatContainer = ref(null)
const userMediaInputRef = ref(null)
const loadingSuggestions = ref(false)
const suggestions = ref([])
const showSuggestions = ref(false)
const showUserActionPanel = ref(false)
const pendingUserMediaKind = ref(USER_MEDIA_KIND_IMAGE)
const userActionFormType = ref(USER_ACTION_FORM_NONE)
const galleryPickerCategory = ref('all')
const aiErrorMessage = ref('')
const activeAbortController = ref(null)
const activeTriggerMessageId = ref('')
const retryTriggerMessageId = ref('')
const retryRerollMessageId = ref('')
const showThreadMenu = ref(false)
const activeMessageActionId = ref('')
const pendingQuote = ref(null)
const showEditMessageModal = ref(false)
const editingMessageId = ref('')
const editingMessageRole = ref('user')
const editingMessageOriginalText = ref('')
const editingMessageDraftText = ref('')
const lastManualActionAt = ref(0)
const threadSettingsSaved = ref(false)
const threadIdentitySaved = ref(false)
const uiNoticeType = ref('')
const uiNoticeMessage = ref('')
let autoInvokeTimerId = null
let threadSettingsSavedTimerId = null
let threadIdentitySavedTimerId = null
let uiNoticeTimerId = null
let messageLongPressTimerId = null
let messageLongPressTargetId = ''

const userActionDraft = reactive({
  linkUrl: 'https://',
  linkTitle: '',
  linkNote: '',
  transferAmount: '',
  transferCurrency: 'CNY',
  transferNote: '',
  voiceTranscript: '',
  voiceDurationSec: 8,
})

const galleryPickerPreviewMap = reactive({})
const messageImagePreviewMap = reactive({})
const messageImagePreviewAssetIdMap = reactive({})
const CHAT_ASSET_PREVIEW_SCOPE_ID = 'chat-view'

const threadSettingsDraft = reactive({
  suggestedRepliesEnabled: DEFAULT_THREAD_AI_PREFS.suggestedRepliesEnabled,
  contextTurns: DEFAULT_THREAD_AI_PREFS.contextTurns,
  bilingualEnabled: DEFAULT_THREAD_AI_PREFS.bilingualEnabled,
  secondaryLanguage: DEFAULT_THREAD_AI_PREFS.secondaryLanguage,
  allowQuoteReply: DEFAULT_THREAD_AI_PREFS.allowQuoteReply,
  allowSelfQuote: DEFAULT_THREAD_AI_PREFS.allowSelfQuote,
  virtualVoiceEnabled: DEFAULT_THREAD_AI_PREFS.virtualVoiceEnabled,
  replyMode: DEFAULT_THREAD_AI_PREFS.replyMode,
  replyCount: DEFAULT_THREAD_AI_PREFS.replyCount,
  responseStyle: DEFAULT_THREAD_AI_PREFS.responseStyle,
  proactiveOpenerEnabled: DEFAULT_THREAD_AI_PREFS.proactiveOpenerEnabled,
  proactiveOpenerStrategy: DEFAULT_THREAD_AI_PREFS.proactiveOpenerStrategy,
  imageReferenceMode: DEFAULT_THREAD_AI_PREFS.imageReferenceMode,
  allowImageVirtualWithoutReference: DEFAULT_THREAD_AI_PREFS.allowImageVirtualWithoutReference,
  autoInvokeEnabled: DEFAULT_THREAD_AI_PREFS.autoInvokeEnabled,
  autoInvokeIntervalSec: DEFAULT_THREAD_AI_PREFS.autoInvokeIntervalSec,
})

const threadIdentityDraft = reactive({
  selfAvatar: '',
  contactAvatar: '',
})

const activeChatId = computed(() => {
  const id = Number(route.params.id)
  return Number.isNaN(id) ? null : id
})

const activeChat = computed(() => {
  if (!activeChatId.value) return null
  return contactsForList.value.find((contact) => contact.id === activeChatId.value) || null
})

const activeConversation = computed(() => {
  if (!activeChat.value) return null
  return chatStore.getConversationByContactId(activeChat.value.id)
})

const activeAiPrefs = computed(() => {
  if (!activeConversation.value?.aiPrefs) return DEFAULT_THREAD_AI_PREFS
  return {
    ...DEFAULT_THREAD_AI_PREFS,
    ...activeConversation.value.aiPrefs,
  }
})

const activeMessages = computed(() => {
  if (!activeChat.value) return []
  return chatStore.getMessagesByContactId(activeChat.value.id) || []
})

const galleryCategoryLabel = (categoryKey) => {
  if (categoryKey === 'all') return t('全部', 'All')
  if (categoryKey === 'wallpaper') return t('壁纸', 'Wallpaper')
  if (categoryKey === 'emoji') return t('表情', 'Emoji')
  if (categoryKey === 'reference') return t('参考图', 'Reference')
  if (categoryKey === 'scenario') return t('场景图', 'Scenario')
  return categoryKey
}

const galleryPickerCategoryOptions = computed(() => [
  { value: 'all', label: galleryCategoryLabel('all') },
  ...GALLERY_ASSET_CATEGORIES.map((categoryKey) => ({
    value: categoryKey,
    label: galleryCategoryLabel(categoryKey),
  })),
])

const createEmptyProfileAssetPack = () => ({
  wallpaperAssetIds: [],
  emojiAssetIds: [],
  referenceAssetIds: [],
  scenarioAssetIds: [],
})

const createEmptyProfileAssetFolderBindings = () => ({
  profileImage: { folderId: '', folderPriority: 0, folderPriorityChain: [] },
  dynamicMedia: { folderId: '', folderPriority: 0, folderPriorityChain: [] },
  emojiPack: { folderId: '', folderPriority: 0, folderPriorityChain: [] },
  imageReference: { folderId: '', folderPriority: 0, folderPriorityChain: [] },
})

const createEmptyRoleAssetContext = () => ({
  profileId: 0,
  profileName: '',
  preferredImageAssetId: '',
  recommendedImageAssetId: '',
  profileAssetPack: createEmptyProfileAssetPack(),
  profileAssetIds: [],
  profileAssetFolderBindings: createEmptyProfileAssetFolderBindings(),
  profileFolderAssetIds: [],
  profileFolderAssetSourceById: {},
})

const resolveRoleFolderAssetsByCategory = (contract, category = 'all') => {
  if (!contract?.roleBound) {
    return {
      assetIds: [],
      sourceByAssetId: {},
    }
  }
  return resolveFolderBoundAssetIds(
    galleryStore,
    contract.assets?.profileAssetFolderBindings,
    getRoleAssetFolderSlotKeysByCategory(category),
    {
      category,
      limit: 120,
    },
  )
}

const galleryPickerAssets = computed(() => {
  const baseList = galleryStore.getAssetsByCategory(galleryPickerCategory.value)
  const chatId = Number(activeChat.value?.id)
  if (!Number.isFinite(chatId) || chatId <= 0) {
    return baseList.slice(0, 36)
  }

  const roleBindingContract = chatStore.getRoleBindingContract(chatId, {
    moduleKey: 'chat',
  })
  const preferredId = roleBindingContract.assets?.preferredImageAssetId || ''
  const profileIds = Array.isArray(roleBindingContract.assets?.profileAssetIds)
    ? roleBindingContract.assets.profileAssetIds
    : []
  const profileIdSet = new Set(profileIds)
  const folderResolved = resolveRoleFolderAssetsByCategory(
    roleBindingContract,
    galleryPickerCategory.value,
  )
  const folderIdSet = new Set(folderResolved.assetIds)

  const sorted = [...baseList].sort((left, right) => {
    const getPriority = (asset) => {
      const preferredBoost = preferredId && asset.id === preferredId ? 100 : 0
      const folderBoost = folderIdSet.has(asset.id) ? 10 : 0
      const profileBoost = profileIdSet.has(asset.id) ? 1 : 0
      return preferredBoost + folderBoost + profileBoost
    }
    const leftPriority = getPriority(left)
    const rightPriority = getPriority(right)
    if (leftPriority !== rightPriority) return rightPriority - leftPriority
    return (right.updatedAt || 0) - (left.updatedAt || 0)
  })

  return sorted.slice(0, 36)
})

const gallerySendState = computed(() => {
  const total = Array.isArray(galleryStore.assets) ? galleryStore.assets.length : 0
  if (total > 0) {
    return {
      enabled: true,
      message: t('可从素材库选择发送。', 'Assets are available to send.'),
    }
  }
  return {
    enabled: false,
    message: t('素材库为空，请先在相册导入素材。', 'Asset library is empty. Import assets in Gallery first.'),
  }
})

const locationShareState = computed(() => {
  const raw = typeof currentLocationText.value === 'string' ? currentLocationText.value.trim() : ''
  if (!raw || raw.includes('未设置') || raw.toLowerCase().includes('not set')) {
    return {
      enabled: false,
      message: t('请先在地图中设置当前位置。', 'Set current location in Map first.'),
    }
  }
  return {
    enabled: true,
    message: t('可发送当前位置。', 'Current location is ready to send.'),
  }
})

const userActionGridHint = computed(() => {
  const hints = []
  if (!gallerySendState.value.enabled) hints.push(gallerySendState.value.message)
  if (!locationShareState.value.enabled) hints.push(locationShareState.value.message)
  if (hints.length > 0) return hints.join(' · ')
  return t('可通过 + 面板发送图片、链接、位置、转账与语音卡片。', 'Use + panel to send images, links, location, transfer cards and voice cards.')
})

const activeRoleAssetContext = computed(() => {
  const chatId = Number(activeChat.value?.id)
  if (!Number.isFinite(chatId) || chatId <= 0) {
    return createEmptyRoleAssetContext()
  }
  const contract = chatStore.getRoleBindingContract(chatId, {
    moduleKey: 'chat',
  })
  if (!contract?.roleBound) {
    return createEmptyRoleAssetContext()
  }
  const folderResolved = resolveRoleFolderAssetsByCategory(contract, 'all')

  return {
    profileId: Number(contract.profile?.id) || 0,
    profileName: contract.profile?.name || contract.contact?.name || '',
    preferredImageAssetId: contract.assets?.preferredImageAssetId || '',
    recommendedImageAssetId: contract.assets?.recommendedImageAssetId || '',
    profileAssetPack: contract.assets?.profileAssetPack || createEmptyProfileAssetPack(),
    profileAssetIds: Array.isArray(contract.assets?.profileAssetIds)
      ? contract.assets.profileAssetIds
      : [],
    profileAssetFolderBindings:
      contract.assets?.profileAssetFolderBindings || createEmptyProfileAssetFolderBindings(),
    profileFolderAssetIds: folderResolved.assetIds,
    profileFolderAssetSourceById: folderResolved.sourceByAssetId,
  }
})

const roleImageReferenceAvailability = computed(() => {
  const context = activeRoleAssetContext.value
  const pack = context.profileAssetPack || createEmptyProfileAssetPack()
  const referencePackCount =
    (Array.isArray(pack.referenceAssetIds) ? pack.referenceAssetIds.length : 0) +
    (Array.isArray(pack.scenarioAssetIds) ? pack.scenarioAssetIds.length : 0)
  const folderImageCount = (Array.isArray(context.profileFolderAssetIds)
    ? context.profileFolderAssetIds
    : []
  ).filter((assetId) => {
    const asset = galleryStore.findAssetById(assetId)
    return asset && asset.category !== 'emoji'
  }).length
  const total = referencePackCount + folderImageCount
  return {
    total,
    referencePackCount,
    folderImageCount,
    hasAny: total > 0,
  }
})

const threadImageBlockPolicyHint = computed(() => {
  const availability = roleImageReferenceAvailability.value
  const allowWithoutReference = Boolean(threadSettingsDraft.allowImageVirtualWithoutReference)
  if (availability.hasAny) {
    return t(
      `当前角色已绑定 ${availability.total} 项可用图像素材（素材包 ${availability.referencePackCount} / 文件夹 ${availability.folderImageCount}）。`,
      `Role has ${availability.total} usable image assets (pack ${availability.referencePackCount} / folder ${availability.folderImageCount}).`,
    )
  }
  if (allowWithoutReference) {
    return t(
      '当前角色未绑定参考图，已允许 AI 在无参考图时生成图片消息。',
      'No role image references are bound; AI-generated image blocks are allowed without references.',
    )
  }
  return t(
    '当前角色未绑定参考图，系统将回退为文字优先（不输出图片消息）。',
    'No role image references are bound; system falls back to text-first replies (no image blocks).',
  )
})

const activeActionMessage = computed(() => {
  if (!activeMessageActionId.value) return null
  return activeMessages.value.find((item) => item.id === activeMessageActionId.value) || null
})

const hasActiveMessageActions = computed(() => Boolean(activeActionMessage.value))

const currentStatus = computed(() => {
  const statusId = typeof user.value.chatStatus === 'string' ? user.value.chatStatus : 'idle'
  return STATUS_OPTIONS.value.find((item) => item.id === statusId) || STATUS_OPTIONS.value[0]
})

const chatListDockItems = computed(() => [
  { id: 'preferences', label: t('批量模板', 'Templates'), icon: 'fas fa-sliders-h' },
  { id: 'identity', label: t('身份', 'Identity'), icon: 'fas fa-user-secret' },
  { id: 'labs', label: t('实验室', 'Labs'), icon: 'fas fa-flask' },
])

const activeContactAvatar = computed(() => {
  if (!activeChat.value) {
    return resolveAvatarWithHierarchy({ fallbackSeed: t('联系人', 'Contact') })
  }
  return chatStore.resolveContactAvatar(activeChat.value.id)
})

const activeModuleIdentity = computed(() => chatStore.getModuleIdentity())
const activeModuleNickname = computed(
  () => activeModuleIdentity.value.nickname || user.value.name || t('自己', 'Me'),
)

const activeSelfAvatar = computed(() => {
  const moduleIdentity = activeModuleIdentity.value
  const threadOverrides = activeChat.value
    ? chatStore.getConversationIdentityOverrides(activeChat.value.id)
    : { selfAvatar: '' }

  return resolveAvatarWithHierarchy({
    threadAvatar: threadOverrides.selfAvatar,
    moduleAvatar: moduleIdentity.avatar,
    globalAvatar: user.value.avatar,
    fallbackSeed: activeModuleNickname.value,
  })
})

const pendingReplyTriggerMessageId = computed(() => {
  const list = activeMessages.value
  if (!list.length) return ''

  let lastAssistantIndex = -1
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].role === 'assistant') lastAssistantIndex = i
  }

  for (let i = list.length - 1; i > lastAssistantIndex; i -= 1) {
    if (list[i].role === 'user') return list[i].id
  }

  return ''
})

const canCancelAi = computed(() => Boolean(activeAbortController.value && activeChat.value && loadingAI.value))
const canRetryAi = computed(() =>
  Boolean(
    aiErrorMessage.value &&
      activeChat.value &&
      (retryTriggerMessageId.value || retryRerollMessageId.value) &&
      !loadingAI.value &&
      !activeAbortController.value,
  ),
)
const canRequestAiReply = computed(() => Boolean(activeChat.value && !loadingAI.value && !activeAbortController.value))
const isActiveServiceChat = computed(() => Boolean(activeChat.value && ['service', 'official'].includes(activeChat.value.kind || 'role')))
const suggestionFeatureEnabled = computed(() => Boolean(activeAiPrefs.value.suggestedRepliesEnabled))
const automationSettings = computed(() => settings.value.aiAutomation || null)
const chatAutomationEnabled = computed(() =>
  systemStore.isAiAutomationEnabledForModule(CHAT_AUTOMATION_MODULE_KEY),
)
const chatAutomationPolicyNow = computed(() =>
  systemStore.getAiAutomationRuntimePolicy(CHAT_AUTOMATION_MODULE_KEY, Date.now()),
)
const autoStatusLocale = computed(() => (languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value))

const getChatAutomationRuntimePolicy = (baseAt = Date.now()) =>
  systemStore.getAiAutomationRuntimePolicy(CHAT_AUTOMATION_MODULE_KEY, baseAt)

const markManualAction = () => {
  lastManualActionAt.value = Date.now()
}

const showUiNotice = (type, message, durationMs = 1800) => {
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

const formatAutoStatusTime = (timestamp) => {
  if (!timestamp) return '--:--'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return '--:--'
  return date.toLocaleTimeString(autoStatusLocale.value, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const autoScheduleHintText = computed(() => {
  if (!activeChat.value) return ''
  if (!chatAutomationEnabled.value) {
    return t(
      '全局或 Chat 模块自动响应已关闭。',
      'Global or Chat automation is currently disabled.',
    )
  }
  if (!activeAiPrefs.value.autoInvokeEnabled) {
    return t(
      '当前会话未开启定时自主调用。',
      'Timed autonomous invoke is disabled in this thread.',
    )
  }

  if (chatAutomationPolicyNow.value.notifyOnly) {
    return chatAutomationPolicyNow.value.quietHoursActive
      ? t(
          '当前处于安静时段：仅通知，不自动生成回复。',
          'Quiet hours active: notify-only, no autonomous AI generation.',
        )
      : t(
          '当前为仅通知模式：仅推送通知，不自动生成回复。',
          'Notify-only mode active: push notifications without autonomous AI generation.',
        )
  }

  const nextAt = activeConversation.value?.autoNextAt || 0
  if (!nextAt) {
    return t(
      '定时器等待中，保存设置后会自动刷新下一次触发时间。',
      'Timer is pending. Next invoke time refreshes after saving settings.',
    )
  }

  return `${t('下次预计触发', 'Next planned invoke')}: ${formatAutoStatusTime(nextAt)}`
})

const autoLastTriggeredHintText = computed(() => {
  if (!activeChat.value || !activeAiPrefs.value.autoInvokeEnabled) return ''
  const lastAt = activeConversation.value?.autoLastTriggeredAt || 0
  if (!lastAt) {
    return t('尚无自动调用记录。', 'No autonomous invoke history yet.')
  }
  return `${t('上次自动调用', 'Last autonomous invoke')}: ${formatAutoStatusTime(lastAt)}`
})

const autoRestoreSettlementHintText = computed(() => {
  if (!activeChat.value || !activeAiPrefs.value.autoInvokeEnabled) return ''
  const missedCycles = Number(activeConversation.value?.autoLastSettledMissedCycles || 0)
  if (!Number.isFinite(missedCycles) || missedCycles <= 0) return ''

  const settledAt = Number(activeConversation.value?.autoLastSettledAt || 0)
  const settledAtText = settledAt ? formatAutoStatusTime(settledAt) : '--:--'
  return `${t('恢复补算', 'Resume settlement')}: ${missedCycles} ${t('个周期', 'cycle(s)')} · ${settledAtText}`
})

const autoBackgroundReminderHint = computed(() => {
  if (!activeChat.value) {
    return { text: '', tone: 'muted' }
  }

  if (!chatAutomationEnabled.value) {
    return {
      text: t(
        '后台提醒未启用：全局或 Chat 自动响应关闭。',
        'Background reminder is off because global or Chat automation is disabled.',
      ),
      tone: 'warning',
    }
  }

  if (!activeAiPrefs.value.autoInvokeEnabled) {
    return {
      text: t(
        '后台提醒未启用：当前会话未开启定时自主调用。',
        'Background reminder is off because timed invoke is disabled in this thread.',
      ),
      tone: 'muted',
    }
  }

  const systemSettings = settings.value.system || {}
  const remotePushReady =
    systemSettings.notifications !== false &&
    systemSettings.realPushEnabled === true &&
    systemSettings.pushSubscriptionActive === true &&
    typeof systemSettings.pushServerUrl === 'string' &&
    systemSettings.pushServerUrl.trim() &&
    typeof systemSettings.pushDeviceId === 'string' &&
    systemSettings.pushDeviceId.trim()

  if (!remotePushReady) {
    return {
      text: t(
        '后台提醒未布置：真推送尚未完成授权或订阅。',
        'Background reminder is not armed because real push is not fully authorized or subscribed.',
      ),
      tone: 'warning',
    }
  }

  const nextAt = Number(activeConversation.value?.autoNextAt || 0)
  if (!nextAt) {
    return {
      text: t(
        '后台提醒等待同步：保存设置后会自动刷新。',
        'Background reminder is waiting to sync and will refresh after saving.',
      ),
      tone: 'muted',
    }
  }

  if (nextAt <= Date.now() + 1000) {
    return {
      text: t(
        '当前已进入触发窗口：前台处理优先，本轮不再单独布置后台提醒。',
        'This cycle is already due, so foreground handling takes priority instead of a separate background reminder.',
      ),
      tone: 'muted',
    }
  }

  const duePolicy = getChatAutomationRuntimePolicy(nextAt)
  if (duePolicy.invokeEnabled !== true) {
    return duePolicy.notifyOnly
      ? {
          text: duePolicy.quietHoursActive
            ? t(
                '下个周期落在安静时段：不会自动生成回复，也不会提前布置后台提醒。',
                'The next cycle falls in quiet hours, so no autonomous reply or background reminder is armed.',
              )
            : t(
                '当前为仅通知模式：本轮不会布置后台提醒。',
                'Notify-only mode is active, so no background reminder is armed for this cycle.',
              ),
          tone: 'warning',
        }
      : {
          text: t(
            '后台提醒未布置：当前自动响应策略不允许该周期执行。',
            'Background reminder is not armed because the current automation policy blocks this cycle.',
          ),
          tone: 'warning',
        }
  }

  const scheduleId =
    typeof activeConversation.value?.autoPushScheduleId === 'string'
      ? activeConversation.value.autoPushScheduleId.trim()
      : ''
  const scheduledAt = Number(activeConversation.value?.autoPushScheduledAt || 0)

  if (scheduleId && scheduledAt > Date.now()) {
    return {
      text: `${t('后台提醒已布置', 'Background reminder armed')}: ${formatAutoStatusTime(
        scheduledAt,
      )}`,
      tone: 'success',
    }
  }

  return {
    text: t(
      '后台提醒等待同步：系统会自动校准下一次远程提醒。',
      'Background reminder is waiting to sync. The system will auto-calibrate the next remote reminder.',
    ),
    tone: 'muted',
  }
})

const clampContextTurns = (value) => {
  const turns = Number(value)
  if (!Number.isFinite(turns)) return DEFAULT_THREAD_AI_PREFS.contextTurns
  return Math.min(20, Math.max(2, Math.floor(turns)))
}

const clampReplyCount = (value) => {
  const count = Number(value)
  if (!Number.isFinite(count)) return DEFAULT_THREAD_AI_PREFS.replyCount
  return Math.min(3, Math.max(1, Math.floor(count)))
}

const clampAutoInvokeInterval = (value) => {
  const seconds = Number(value)
  if (!Number.isFinite(seconds)) return DEFAULT_THREAD_AI_PREFS.autoInvokeIntervalSec
  return Math.min(MAX_AUTO_INVOKE_INTERVAL_SEC, Math.max(MIN_AUTO_INVOKE_INTERVAL_SEC, Math.floor(seconds)))
}

const normalizeReplyMode = (value) =>
  REPLY_MODE_OPTIONS.value.some((item) => item.value === value) ? value : DEFAULT_THREAD_AI_PREFS.replyMode

const normalizeResponseStyle = (value) =>
  RESPONSE_STYLE_OPTIONS.value.some((item) => item.value === value) ? value : DEFAULT_THREAD_AI_PREFS.responseStyle

const normalizeProactiveStrategy = (value) =>
  PROACTIVE_STRATEGY_OPTIONS.value.some((item) => item.value === value)
    ? value
    : DEFAULT_THREAD_AI_PREFS.proactiveOpenerStrategy

const normalizeImageReferenceMode = (value) =>
  IMAGE_REFERENCE_MODE_OPTIONS.value.some((item) => item.value === value)
    ? value
    : DEFAULT_THREAD_AI_PREFS.imageReferenceMode

const normalizeImageReferenceTransportMode = (value) =>
  IMAGE_REFERENCE_TRANSPORT_MODES.has(value) ? value : 'none'

const normalizeImageReferenceCount = (value) => {
  const count = Number(value)
  if (!Number.isFinite(count)) return 0
  return Math.min(MAX_CONTEXT_REFERENCE_IMAGES, Math.max(0, Math.floor(count)))
}

const normalizeImageReferenceProvider = (value) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, 32) : ''

const buildAssistantImageReferenceMeta = (
  callMeta = null,
  fallbackReferenceCount = 0,
  fallbackProvider = '',
) => ({
  imageReferenceMode: normalizeImageReferenceTransportMode(callMeta?.finalTransportMode),
  imageReferenceCount: normalizeImageReferenceCount(
    callMeta?.referenceCount ?? fallbackReferenceCount,
  ),
  imageReferenceFallback: Boolean(callMeta?.fallbackUsed),
  imageReferenceProvider: normalizeImageReferenceProvider(callMeta?.apiKind || fallbackProvider),
})

const trimAssistantText = (value, maxLength, fallback = '') => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return fallback
  if (!Number.isFinite(Number(maxLength)) || maxLength <= 0) return text
  return text.length <= maxLength ? text : text.slice(0, maxLength)
}

const trimAssistantSingleLine = (value, maxLength, fallback = '') =>
  trimAssistantText(value, maxLength, fallback).replace(/\s+/g, ' ').trim()

const sanitizeAssistantRoute = (value, fallback = '/home') => {
  const route = trimAssistantText(value, 200)
  if (!route) return fallback
  if (!route.startsWith('/') || route.startsWith('//')) return fallback
  if (/\s/.test(route)) return fallback
  return SAFE_MODULE_ROUTES.has(route) ? route : fallback
}

const sanitizeAssistantImageUrl = (value) => {
  const url = trimAssistantText(value, 500)
  if (!url) return ''
  if (url.startsWith('/')) return url
  if (/^https?:\/\//i.test(url)) return url
  return ''
}

const sanitizeAssistantHtmlSnippet = (value) => {
  const snippet = trimAssistantText(value, 4000)
  if (!snippet) return ''
  return snippet
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(new Error('read_failed'))
      reader.onabort = () => reject(new Error('read_aborted'))
      reader.readAsDataURL(file)
    } catch (error) {
      reject(error)
    }
  })

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const goHome = () => router.push('/home')
const leaveChat = () => {
  closeMessageEditModal()
  router.push('/chat')
}
const openChatDockFeature = (featureId) => {
  const id = typeof featureId === 'string' ? featureId.trim() : ''
  if (!id) return
  router.push(`/chat-feature/${id}`)
}
const contactById = (contactId) =>
  contactsForList.value.find((item) => item.id === Number(contactId)) || null

const enterChat = (contact) => {
  chatStore.ensureConversationForContact(contact.id)
  chatStore.markConversationRead(contact.id)
  router.push(`/chat/${contact.id}`)
}

const applyThreadSettingsDraft = () => {
  const prefs = activeAiPrefs.value
  threadSettingsDraft.suggestedRepliesEnabled = Boolean(prefs.suggestedRepliesEnabled)
  threadSettingsDraft.contextTurns = clampContextTurns(prefs.contextTurns)
  threadSettingsDraft.bilingualEnabled = Boolean(prefs.bilingualEnabled)
  threadSettingsDraft.secondaryLanguage = prefs.secondaryLanguage || DEFAULT_THREAD_AI_PREFS.secondaryLanguage
  threadSettingsDraft.allowQuoteReply = Boolean(prefs.allowQuoteReply)
  threadSettingsDraft.allowSelfQuote = Boolean(prefs.allowSelfQuote)
  threadSettingsDraft.virtualVoiceEnabled = Boolean(prefs.virtualVoiceEnabled)
  threadSettingsDraft.replyMode = normalizeReplyMode(prefs.replyMode)
  threadSettingsDraft.replyCount = clampReplyCount(prefs.replyCount)
  threadSettingsDraft.responseStyle = normalizeResponseStyle(prefs.responseStyle)
  threadSettingsDraft.proactiveOpenerEnabled = Boolean(prefs.proactiveOpenerEnabled)
  threadSettingsDraft.proactiveOpenerStrategy = normalizeProactiveStrategy(prefs.proactiveOpenerStrategy)
  threadSettingsDraft.imageReferenceMode = normalizeImageReferenceMode(prefs.imageReferenceMode)
  threadSettingsDraft.allowImageVirtualWithoutReference = Boolean(prefs.allowImageVirtualWithoutReference)
  threadSettingsDraft.autoInvokeEnabled = Boolean(prefs.autoInvokeEnabled)
  threadSettingsDraft.autoInvokeIntervalSec = clampAutoInvokeInterval(prefs.autoInvokeIntervalSec)
}

const applyThreadIdentityDraft = () => {
  if (!activeChat.value) {
    threadIdentityDraft.selfAvatar = ''
    threadIdentityDraft.contactAvatar = ''
    return
  }

  const overrides = chatStore.getConversationIdentityOverrides(activeChat.value.id)
  threadIdentityDraft.selfAvatar = overrides.selfAvatar || ''
  threadIdentityDraft.contactAvatar = overrides.contactAvatar || ''
}

const contactAvatarForList = (contact) => {
  if (!contact?.id) {
    return resolveAvatarWithHierarchy({
      fallbackSeed: contact?.name || t('联系人', 'Contact'),
    })
  }
  return chatStore.resolveContactAvatar(contact.id)
}

const formatTruthTimestampForPrompt = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return 'none'
  return new Date(ts).toISOString()
}

const summarizeTruthEventsForPrompt = (events = []) => {
  if (!Array.isArray(events) || events.length === 0) return 'none'
  return events
    .slice(0, 4)
    .map((event) => {
      const at = formatTruthTimestampForPrompt(event?.at)
      const action = typeof event?.action === 'string' ? event.action : 'interaction'
      if (action === 'resume_settlement') {
        const cycles = Number(event?.payload?.missedCycles)
        const count = Number.isFinite(cycles) ? Math.max(1, Math.floor(cycles)) : 1
        return `${at}: resume_settlement(${count})`
      }
      if (action === 'notify_only_skip') return `${at}: notify_only_skip`
      if (action === 'assistant_reply') return `${at}: assistant_reply`
      if (action === 'user_message') return `${at}: user_message`
      return `${at}: ${action}`
    })
    .join('; ')
}

const buildTruthPromptBlock = (contact) => {
  const snapshot = systemStore.getChatTruthSnapshot(contact, { eventLimit: 4 })
  if (!snapshot) return 'Relationship truth: unavailable.'

  const relationship = snapshot.relationship || {}
  const counters = snapshot.counters || {}
  const timestamps = snapshot.timestamps || {}
  const eventsSummary = summarizeTruthEventsForPrompt(snapshot.recentEvents || [])

  return [
    `Relationship truth stage: ${relationship.stage || 'neutral'}.`,
    `Metrics affinity/trust/distance/dependency/tension: ${relationship.affinity ?? 50}/${relationship.trust ?? 50}/${relationship.distance ?? 50}/${relationship.dependency ?? 20}/${relationship.tension ?? 10}.`,
    `Counters user/assistant/manual/auto/reroll/notifyOnly/resumeSettle: ${counters.userMessageCount ?? 0}/${counters.assistantMessageCount ?? 0}/${counters.manualTriggerCount ?? 0}/${counters.autoTriggerCount ?? 0}/${counters.rerollCount ?? 0}/${counters.notifyOnlySkipCount ?? 0}/${counters.resumeSettlementCount ?? 0}.`,
    `Last interaction/user/assistant/warm/conflict: ${formatTruthTimestampForPrompt(timestamps.lastInteractionAt)}/${formatTruthTimestampForPrompt(timestamps.lastUserMessageAt)}/${formatTruthTimestampForPrompt(timestamps.lastAssistantMessageAt)}/${formatTruthTimestampForPrompt(timestamps.lastWarmMomentAt)}/${formatTruthTimestampForPrompt(timestamps.lastConflictAt)}.`,
    `Recent truth events: ${eventsSummary}.`,
  ].join('\n')
}

const getGlobalWorldviewText = () => {
  const fromGlobal =
    typeof user.value.globalWorldview === 'string' ? user.value.globalWorldview.trim() : ''
  if (fromGlobal) return fromGlobal
  return typeof user.value.worldBook === 'string' ? user.value.worldBook.trim() : ''
}

const resolveBoundKnowledgePointsForContact = (contact) => {
  if (!contact || (contact.kind || 'role') !== 'role') return []
  const profileId = Number(contact.profileId)
  if (!Number.isFinite(profileId) || profileId <= 0) return []
  const profile = chatStore.getRoleProfileById(profileId)
  if (!profile || !Array.isArray(profile.knowledgePointIds) || profile.knowledgePointIds.length === 0) {
    return []
  }

  const sourcePoints = Array.isArray(user.value.knowledgePoints) ? user.value.knowledgePoints : []
  if (sourcePoints.length === 0) return []
  const pointMap = new Map(
    sourcePoints
      .filter((item) => item && typeof item === 'object' && typeof item.id === 'string')
      .map((item) => [item.id, item]),
  )

  return profile.knowledgePointIds
    .map((id) => pointMap.get(id))
    .filter((item) => item && item.enabled !== false)
    .slice(0, 8)
}

const buildWorldKernelPromptBlock = (contact) => {
  const worldview = getGlobalWorldviewText() || 'none'
  const boundPoints = resolveBoundKnowledgePointsForContact(contact)
  const boundSummary =
    boundPoints.length > 0
      ? boundPoints
          .map((item) => {
            const title = typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Knowledge'
            const content = typeof item.content === 'string' ? item.content.trim() : ''
            const tags = Array.isArray(item.tags) && item.tags.length > 0 ? ` [tags: ${item.tags.join(', ')}]` : ''
            return `${title}: ${content || title}${tags}`
          })
          .join('; ')
      : 'none'

  return [
    `Global worldview: ${worldview}`,
    `Role-bound knowledge points: ${boundSummary}.`,
  ].join('\n')
}

const resolveAssistantImageBlockPolicy = (aiPrefs, imageReferences = []) => {
  const referenceCount = Array.isArray(imageReferences) ? imageReferences.length : 0
  const allowWithoutReference = Boolean(aiPrefs?.allowImageVirtualWithoutReference)
  return {
    referenceCount,
    allowWithoutReference,
    allowImageVirtual: referenceCount > 0 || allowWithoutReference,
  }
}

const buildSystemPrompt = (contact, aiPrefs, options = {}) => {
  const contactKind = contact.kind || 'role'
  const typeLabel =
    contactKind === 'group' ? 'group chat' : contactKind === 'service' ? 'service account' : contactKind === 'official' ? 'official account' : 'role chat'
  const moduleIdentity = chatStore.getModuleIdentity()
  const anonymousIdentity = chatStore.isModuleIdentityAnonymousForContact(contact.id)
  const userDisplayName = moduleIdentity.nickname || user.value.name || 'User'
  const userBio = typeof user.value.bio === 'string' ? user.value.bio.trim() : ''

  const serviceInstruction =
    contactKind === 'service' || contactKind === 'official'
      ? `Service template: ${contact.serviceTemplate || 'default service helper style, concise guidance'}`
      : `Role persona: ${contact.bio || 'none'}`

  const quoteRule = aiPrefs.allowQuoteReply
    ? aiPrefs.allowSelfQuote
      ? 'Allow plain, quote_user, quote_self.'
      : 'Allow plain, quote_user. Disallow quote_self.'
    : 'Only allow plain. Disallow quote reply types.'

  const bilingualRule = aiPrefs.bilingualEnabled
    ? `Output bilingual text blocks: primary in zh, secondary in ${aiPrefs.secondaryLanguage || 'en'}.`
    : 'Only output primary text blocks.'

  const voiceRule = aiPrefs.virtualVoiceEnabled
    ? 'voice_virtual blocks are allowed.'
    : 'voice_virtual blocks are disallowed.'

  const targetReplyCount = clampReplyCount(options.replyCount ?? aiPrefs.replyCount)
  const responseStyle = normalizeResponseStyle(aiPrefs.responseStyle)
  const proactiveInstruction = options.isProactive
    ? 'This is a proactive opener scene. Start naturally and do not mention trigger mechanics.'
    : 'This is a normal reply scene. Respond based on context naturally.'
  const worldKernelInstruction = buildWorldKernelPromptBlock(contact)
  const truthInstruction = buildTruthPromptBlock(contact)
  const imagePolicy = resolveAssistantImageBlockPolicy(aiPrefs, options.imageReferences)
  const imageReferenceCount = imagePolicy.referenceCount
  const providerCapabilities =
    options.providerCapabilities && typeof options.providerCapabilities === 'object'
      ? options.providerCapabilities
      : null
  const imageReferenceInstruction =
    imageReferenceCount > 0
      ? `Image references available in user context: ${imageReferenceCount}. Treat them as visual cues and avoid hallucinating details not supported by cues.`
      : 'No explicit image references were provided in this turn.'
  const imageBlockInstruction = imagePolicy.allowImageVirtual
    ? imagePolicy.allowWithoutReference
      ? 'image_virtual blocks are allowed. Even without explicit references, generated visual imagination is permitted for this thread.'
      : 'image_virtual blocks are allowed only when reference cues are present in this turn.'
    : 'image_virtual blocks are disallowed in this turn. Describe visuals in text instead of sending image_virtual blocks.'
  const providerCapabilityInstruction = providerCapabilities
    ? `Image-reference transport mode: ${providerCapabilities.preferredImageReferenceMode || 'none'} (provider: ${providerCapabilities.kind || 'unknown'}).`
    : 'Image-reference transport mode: unknown.'
  const userIdentityBlock = anonymousIdentity
    ? [
        'User identity: hidden.',
        'Treat the user as a stranger by default.',
        'Do not assume you know their name, background, occupation, or prior relationship unless this conversation explicitly reveals it.',
      ].join('\n')
    : `User: ${userDisplayName}, ${userBio || 'none'}`

  return `
${worldKernelInstruction}
${userIdentityBlock}
Conversation type: ${typeLabel}
Your role: ${contact.name} (${contact.role})
${serviceInstruction}
Response style: ${responseStyle}
Target reply count: ${targetReplyCount}
${proactiveInstruction}
${truthInstruction}
${imageReferenceInstruction}
${providerCapabilityInstruction}
Stay in character and never claim you are an AI model.

You MUST return valid JSON object and never use markdown wrappers.
JSON schema:
{
  "messages": [
    {
      "replyType": "plain | quote_user | quote_self",
      "quote": {"messageId":"optional","role":"user | assistant","preview":"optional"} or null,
      "blocks": [
        {"type":"text","variant":"primary","lang":"zh","text":"..."}
      ]
    }
  ]
}

Rules:
- Keep messages length close to ${targetReplyCount}.
- ${quoteRule}
- ${bilingualRule}
- ${voiceRule}
- Always respect the global worldview and role-bound knowledge points.
- ${imageBlockInstruction}
- Optional block types: module_link, transfer_virtual, image_virtual, mini_scene.
- Each message must include at least one text block.
`
}

const extractMessageTextForContext = (message) => {
  if (!message) return ''
  const revisedText =
    typeof message?.semanticRevision?.revisedText === 'string'
      ? message.semanticRevision.revisedText.trim()
      : ''
  if (revisedText) return revisedText
  if (typeof message.content === 'string' && message.content.trim()) return message.content.trim()
  if (!Array.isArray(message.blocks)) return ''

  return message.blocks
    .map((block) => {
      if (!block || typeof block !== 'object') return ''
      if (block.type === 'text') return block.text || ''
      if (block.type === 'voice_virtual') return `[voice] ${block.transcript || block.label || ''}`
      if (block.type === 'module_link') return `[link] ${block.label || ''}`
      if (block.type === 'link_external') return `[external_link] ${block.label || ''} ${block.url || ''}`
      if (block.type === 'transfer_virtual') return `[transfer] ${block.amount || ''} ${block.currency || ''}`
      if (block.type === 'image_virtual') return `[image] ${block.alt || ''}`
      if (block.type === 'mini_scene') return `[scene] ${block.title || ''} ${block.description || ''}`
      return ''
    })
    .join('\n')
    .trim()
}

const messagePrimaryText = (message) => {
  if (!message) return ''
  const revisedText =
    typeof message?.semanticRevision?.revisedText === 'string'
      ? message.semanticRevision.revisedText.trim()
      : ''
  if (revisedText) return revisedText
  if (Array.isArray(message.blocks)) {
    const primary = message.blocks.find(
      (block) =>
        block?.type === 'text' &&
        block?.variant !== 'secondary' &&
        typeof block.text === 'string' &&
        block.text.trim(),
    )
    if (primary) return primary.text.trim()
    const anyText = message.blocks.find(
      (block) => block?.type === 'text' && typeof block.text === 'string' && block.text.trim(),
    )
    if (anyText) return anyText.text.trim()
  }
  if (typeof message.content === 'string' && message.content.trim()) return message.content.trim()
  return extractMessageTextForContext(message)
}

const truncateMessagePreview = (text, maxLength = 72) => {
  const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
}

const getContextSourceMessages = (contactId, options = {}) => {
  const allMessages = chatStore.getMessagesByContactId(contactId)
  const result = []
  const untilMessageId =
    typeof options.untilMessageId === 'string' && options.untilMessageId.trim()
      ? options.untilMessageId
      : ''
  const beforeMessageId =
    typeof options.beforeMessageId === 'string' && options.beforeMessageId.trim()
      ? options.beforeMessageId
      : ''

  for (const item of allMessages) {
    if (beforeMessageId && item.id === beforeMessageId) break
    result.push(item)
    if (untilMessageId && item.id === untilMessageId) break
  }

  const contextTurns = clampContextTurns(options.contextTurns ?? DEFAULT_THREAD_AI_PREFS.contextTurns)
  const messageLimit = Math.max(6, contextTurns * 2)
  return result.slice(-messageLimit)
}

const toQuoteCandidates = (messages = []) =>
  messages
    .filter((item) => item?.role === 'user' || item?.role === 'assistant')
    .map((item) => ({
      id: item.id,
      role: item.role,
      preview: truncateMessagePreview(messagePrimaryText(item), MAX_ASSISTANT_QUOTE_PREVIEW_CHARS),
    }))
    .filter((item) => item.id && item.preview)

const toAiMessages = (contactId, untilMessageId = '', options = {}) =>
  getContextSourceMessages(contactId, {
    untilMessageId,
    contextTurns: options.contextTurns,
  }).map((item) => ({
    role: item.role,
    content: extractMessageTextForContext(item),
  }))

const roleFolderSlotHintLabel = (slotKey) => {
  if (slotKey === 'imageReference') return t('参考图', 'Reference')
  if (slotKey === 'dynamicMedia') return t('动态图', 'Dynamic')
  if (slotKey === 'profileImage') return t('形象照', 'Profile image')
  if (slotKey === 'emojiPack') return t('表情包', 'Emoji')
  return slotKey || ''
}

const buildRoleBoundReferenceCandidates = (contactId) => {
  const contract = chatStore.getRoleBindingContract(contactId, {
    moduleKey: 'chat',
  })
  if (!contract?.roleBound) {
    return {
      profileName: '',
      candidateAssetIds: [],
      sourceByAssetId: {},
    }
  }

  const profilePack = contract.assets?.profileAssetPack || createEmptyProfileAssetPack()
  const folderResolved = resolveFolderBoundAssetIds(
    galleryStore,
    contract.assets?.profileAssetFolderBindings,
    getRoleAssetFolderSlotKeysByCategory('reference'),
    {
      category: 'all',
      limit: 80,
    },
  )

  const candidateAssetIds = []
  const pushAssetId = (assetId) => {
    const normalized = typeof assetId === 'string' ? assetId.trim() : ''
    if (!normalized || candidateAssetIds.includes(normalized)) return
    candidateAssetIds.push(normalized)
  }

  pushAssetId(contract.assets?.preferredImageAssetId)
  ;(Array.isArray(profilePack.referenceAssetIds) ? profilePack.referenceAssetIds : []).forEach((id) =>
    pushAssetId(id),
  )
  ;(Array.isArray(profilePack.scenarioAssetIds) ? profilePack.scenarioAssetIds : []).forEach((id) =>
    pushAssetId(id),
  )
  folderResolved.assetIds.forEach((id) => pushAssetId(id))

  return {
    profileName: contract.profile?.name || contract.contact?.name || '',
    candidateAssetIds,
    sourceByAssetId: folderResolved.sourceByAssetId || {},
  }
}

const collectImageReferencesFromContextMessages = async (messages = []) => {
  if (!Array.isArray(messages) || messages.length === 0) return []
  const collected = []
  const seen = new Set()

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (collected.length >= MAX_CONTEXT_REFERENCE_IMAGES) break
    const message = messages[i]
    if (message?.role !== 'user' || !Array.isArray(message.blocks)) continue

    for (const block of message.blocks) {
      if (collected.length >= MAX_CONTEXT_REFERENCE_IMAGES) break
      if (!block || block.type !== 'image_virtual') continue

      const assetId =
        typeof block.assetId === 'string' && block.assetId.trim()
          ? block.assetId.trim()
          : ''
      const asset = assetId ? galleryStore.findAssetById(assetId) : null
      let sourceUrl = typeof block.url === 'string' ? block.url.trim() : ''
      let sourceReason = ''

      if (!sourceUrl && assetId) {
        const resolved = await galleryStore.getAssetAiReferenceUrl(assetId, {
          maxBytes: MAX_CONTEXT_REFERENCE_IMAGE_BYTES,
        })
        if (resolved?.ok && typeof resolved.url === 'string' && resolved.url.trim()) {
          sourceUrl = resolved.url.trim()
        } else if (resolved?.reason) {
          sourceReason = resolved.reason
        }
      }

      const label =
        (typeof block.alt === 'string' && block.alt.trim()) ||
        (typeof asset?.name === 'string' && asset.name.trim()) ||
        t('参考图', 'Reference image')
      const noteBase =
        (typeof block.caption === 'string' && block.caption.trim()) ||
        t('来自聊天上下文', 'From chat context')
      const note =
        sourceReason === 'blob_too_large'
          ? `${noteBase} · ${t('本地图片过大，按文字线索处理', 'Local image too large, using text-only cue')}`
          : noteBase
      const sourceKey = `${label}|${assetId}|${sourceUrl.slice(0, 120)}`
      if (seen.has(sourceKey)) continue
      seen.add(sourceKey)
      collected.push({
        label,
        note,
        sourceUrl,
        assetId,
      })
    }
  }

  return collected
}

const collectImageReferencesFromRoleBindings = async (
  contactId,
  { limit = MAX_CONTEXT_REFERENCE_IMAGES, excludeAssetIds = [] } = {},
) => {
  const normalizedLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.floor(Number(limit))) : 0
  if (normalizedLimit <= 0) return []

  const excludeSet = new Set(
    Array.isArray(excludeAssetIds)
      ? excludeAssetIds
          .map((assetId) => (typeof assetId === 'string' ? assetId.trim() : ''))
          .filter(Boolean)
      : [],
  )
  const { profileName, candidateAssetIds, sourceByAssetId } =
    buildRoleBoundReferenceCandidates(contactId)
  if (!candidateAssetIds.length) return []

  const collected = []
  const seen = new Set()

  for (const assetId of candidateAssetIds) {
    if (collected.length >= normalizedLimit) break
    if (excludeSet.has(assetId)) continue

    const asset = galleryStore.findAssetById(assetId)
    if (!asset) continue
    if (asset.category === 'emoji') continue

    const resolved = await galleryStore.getAssetAiReferenceUrl(assetId, {
      maxBytes: MAX_CONTEXT_REFERENCE_IMAGE_BYTES,
    })
    const sourceUrl = resolved?.ok && typeof resolved.url === 'string' ? resolved.url.trim() : ''
    const sourceReason = typeof resolved?.reason === 'string' ? resolved.reason : ''

    const sourceEntry = sourceByAssetId?.[assetId]
    const slotLabels =
      Array.isArray(sourceEntry?.slotKeys) && sourceEntry.slotKeys.length > 0
        ? sourceEntry.slotKeys.map((slotKey) => roleFolderSlotHintLabel(slotKey)).filter(Boolean)
        : []
    const slotHint = slotLabels.length > 0 ? slotLabels.join('/') : ''
    const noteBase = slotHint
      ? t(
          `来自角色绑定素材（${slotHint}${profileName ? ` · ${profileName}` : ''}）`,
          `From role-bound asset (${slotHint}${profileName ? ` · ${profileName}` : ''})`,
        )
      : t(
          `来自角色绑定素材${profileName ? `（${profileName}）` : ''}`,
          `From role-bound asset${profileName ? ` (${profileName})` : ''}`,
        )
    const note =
      sourceReason === 'blob_too_large'
        ? `${noteBase} · ${t('本地图片过大，按文字线索处理', 'Local image too large, using text-only cue')}`
        : noteBase
    const label =
      (typeof asset?.name === 'string' && asset.name.trim()) ||
      t('角色参考图', 'Profile reference image')

    const sourceKey = `${label}|${assetId}|${sourceUrl.slice(0, 120)}`
    if (seen.has(sourceKey)) continue
    seen.add(sourceKey)
    collected.push({
      label,
      note,
      sourceUrl,
      assetId,
    })
  }

  return collected
}

const collectImageReferencesForAiCall = async (contactId, contextMessages = []) => {
  const contextReferences = await collectImageReferencesFromContextMessages(contextMessages)
  const remain = Math.max(0, MAX_CONTEXT_REFERENCE_IMAGES - contextReferences.length)
  if (remain <= 0) return contextReferences.slice(0, MAX_CONTEXT_REFERENCE_IMAGES)

  const roleReferences = await collectImageReferencesFromRoleBindings(contactId, {
    limit: remain,
    excludeAssetIds: contextReferences
      .map((item) => (typeof item?.assetId === 'string' ? item.assetId.trim() : ''))
      .filter(Boolean),
  })

  return [...contextReferences, ...roleReferences].slice(0, MAX_CONTEXT_REFERENCE_IMAGES)
}

const clearAutoInvokeTimer = () => {
  if (!autoInvokeTimerId) return
  clearTimeout(autoInvokeTimerId)
  autoInvokeTimerId = null
}

const getAutomationCooldownMs = () => {
  const value = Number(automationSettings.value?.conflictCooldownSec)
  const seconds = Number.isFinite(value) ? Math.max(5, Math.floor(value)) : 20
  return seconds * 1000
}

const getAutomationDedupeMs = () => {
  const value = Number(automationSettings.value?.dedupeWindowSec)
  const seconds = Number.isFinite(value) ? Math.max(10, Math.floor(value)) : 120
  return seconds * 1000
}

const getAutoInvokeBaseFingerprint = (contactId) => {
  const context = toAiMessages(contactId, '', { contextTurns: 4 }).slice(-6)
  return context
    .map((item) => `${item.role}:${(item.content || '').trim()}`)
    .join('|')
    .slice(0, 1200)
}

const resetConversationAutoNextAt = (contactId, baseAt = Date.now()) => {
  const prefs = chatStore.getConversationAiPrefs(contactId)
  if (!prefs.autoInvokeEnabled) {
    chatStore.setConversationAutoState(contactId, { autoNextAt: 0 })
    return 0
  }
  return chatStore.scheduleConversationAutoInvoke(
    contactId,
    baseAt,
    clampAutoInvokeInterval(prefs.autoInvokeIntervalSec),
  )
}

const scheduleAutoInvokeTick = () => {
  clearAutoInvokeTimer()
  if (!chatAutomationEnabled.value) return
  if (loadingAI.value || activeAbortController.value) {
    autoInvokeTimerId = setTimeout(() => {
      void runDueAutoInvokes()
    }, getAutomationCooldownMs())
    return
  }

  chatStore.normalizeAutoInvokeCheckpoints(Date.now())
  const nextAt = chatStore.getNextAutoInvokeAt()
  if (!nextAt) return

  const delay = Math.max(400, nextAt - Date.now())
  autoInvokeTimerId = setTimeout(() => {
    void runDueAutoInvokes()
  }, delay)
}

const executeAutoInvokeForContactTask = async (contactId, options = {}) => {
  const now = Date.now()
  const runtimePolicy = getChatAutomationRuntimePolicy(now)
  if (!runtimePolicy.enabled) {
    chatStore.setConversationAutoState(contactId, { autoNextAt: 0 })
    return false
  }
  if (!runtimePolicy.invokeEnabled) {
    resetConversationAutoNextAt(contactId, now + getAutomationCooldownMs())
    return false
  }

  const aiPrefs = chatStore.getConversationAiPrefs(contactId)
  if (!aiPrefs.autoInvokeEnabled) {
    chatStore.setConversationAutoState(contactId, { autoNextAt: 0 })
    return false
  }

  if (loadingAI.value || activeAbortController.value) {
    resetConversationAutoNextAt(contactId, now + getAutomationCooldownMs())
    return false
  }

  const fingerprint =
    typeof options.fingerprint === 'string' && options.fingerprint.trim()
      ? options.fingerprint.trim()
      : getAutoInvokeBaseFingerprint(contactId)
  const ok = await requestAiReply(contactId, MANUAL_TRIGGER_ID, {
    replyCount: aiPrefs.replyCount,
    source: 'auto',
    autoSchedule: false,
  })
  if (ok) {
    chatStore.setConversationAutoState(contactId, {
      autoLastFingerprint: fingerprint,
      autoLastTriggeredAt: Date.now(),
    })
    resetConversationAutoNextAt(contactId, Date.now())
    return true
  }
  resetConversationAutoNextAt(contactId, Date.now() + getAutomationCooldownMs())
  return false
}

const enqueueAutoInvokeTaskForContact = async (contactId) => {
  const now = Date.now()
  const runtimePolicy = getChatAutomationRuntimePolicy(now)
  if (!runtimePolicy.enabled) {
    chatStore.setConversationAutoState(contactId, { autoNextAt: 0 })
    return false
  }

  const aiPrefs = chatStore.getConversationAiPrefs(contactId)
  if (!aiPrefs.autoInvokeEnabled) {
    chatStore.setConversationAutoState(contactId, { autoNextAt: 0 })
    return false
  }

  const conversation = chatStore.getConversationByContactId(contactId)
  if (conversation.autoNextAt && now + 250 < conversation.autoNextAt) return false

  if (loadingAI.value || activeAbortController.value) {
    resetConversationAutoNextAt(contactId, now + getAutomationCooldownMs())
    return false
  }

  if (now - lastManualActionAt.value <= MANUAL_PRIORITY_GUARD_MS) {
    resetConversationAutoNextAt(contactId, now)
    return false
  }

  if (runtimePolicy.notifyOnly) {
    const contact = contactById(contactId)
    if (contact) {
      systemStore.touchChatTruth(contact, 'notify_only_skip', {
        source: runtimePolicy.quietHoursActive ? 'quiet_hours' : 'notify_only_mode',
      })
    }
    pushNotifyOnlyAutoInvokeNotification(contactId, runtimePolicy, now)
    resetConversationAutoNextAt(contactId, now)
    chatStore.setConversationAutoState(contactId, {
      autoLastSettledAt: now,
      autoLastSettledMissedCycles: 1,
    })
    systemStore.addApiReport({
      level: 'info',
      module: 'chat',
      action: 'auto_notify_only',
      provider: settings.value.api.resolvedKind || '',
      model: settings.value.api.model || '',
      message: notifyOnlyHintByPolicy(runtimePolicy),
    })
    return false
  }

  const fingerprint = getAutoInvokeBaseFingerprint(contactId)
  const dedupeMs = getAutomationDedupeMs()
  if (
    fingerprint &&
    conversation.autoLastFingerprint &&
    conversation.autoLastFingerprint === fingerprint &&
    now - (conversation.autoLastTriggeredAt || 0) < dedupeMs
  ) {
    resetConversationAutoNextAt(contactId, now)
    return false
  }

  const enqueueResult = systemStore.enqueueAiAutomationTask(
    {
      moduleKey: CHAT_AUTOMATION_MODULE_KEY,
      targetId: String(contactId),
      source: 'chat_auto_timer',
      reason: `contact:${contactId}`,
      dueAt: now,
      fingerprint,
      payload: {
        contactId,
      },
    },
    {
      baseAt: now,
    },
  )

  if (!enqueueResult?.accepted && enqueueResult?.reason === 'invoke_disabled') {
    resetConversationAutoNextAt(contactId, now + getAutomationCooldownMs())
  }

  return Boolean(enqueueResult?.accepted)
}

const drainAutomationQueue = async (maxRounds = 4) => {
  const rounds = Math.max(1, Math.floor(Number(maxRounds) || 1))
  for (let i = 0; i < rounds; i += 1) {
    const result = await systemStore.runAiAutomationQueueTick(Date.now())
    if (!result?.handled && !result?.queueAdvanced) break
  }
}

const runDueAutoInvokes = async () => {
  clearAutoInvokeTimer()
  if (!chatAutomationEnabled.value) return

  const now = Date.now()
  const settledItems = chatStore.settleAutoInvokeOnResume(now)
  pushRestoreSettlementNotifications(settledItems)
  const dueContactIds = chatStore.getDueAutoInvokeContactIds(now)

  for (const contactId of dueContactIds) {
    await enqueueAutoInvokeTaskForContact(contactId)
  }

  await drainAutomationQueue(4)
  scheduleAutoInvokeTick()
}

const clearAllAutoInvokeSchedules = () => {
  chatStore.contacts.forEach((contact) => {
    if (!contact?.id) return
    chatStore.setConversationAutoState(contact.id, {
      autoNextAt: 0,
      autoLastSettledMissedCycles: 0,
    })
  })
}

const contactNameById = (contactId) => {
  const contact = contactById(contactId)
  return contact?.name || t('新消息', 'New Message')
}

const notifyOnlyHintByPolicy = (policy) => {
  if (policy?.quietHoursActive) {
    return t(
      '安静时段仅通知：本轮未自动生成回复。',
      'Quiet-hours notify-only: this cycle skipped autonomous reply generation.',
    )
  }
  return t(
    '仅通知模式：本轮未自动生成回复。',
    'Notify-only mode: this cycle skipped autonomous reply generation.',
  )
}

const pushNotifyOnlyAutoInvokeNotification = (contactId, policy, createdAt = Date.now()) => {
  if (!systemStore.isLocked) return
  systemStore.addNotification({
    title: contactNameById(contactId),
    content: notifyOnlyHintByPolicy(policy),
    icon: 'fas fa-bell',
    route: `/chat/${contactId}`,
    source: 'chat_auto_notify_only',
    createdAt,
  })
}

const pushRestoreSettlementNotifications = (settledItems = []) => {
  if (!systemStore.isLocked) return
  if (!Array.isArray(settledItems) || settledItems.length === 0) return

  settledItems.forEach((item) => {
    const contactId = Number(item?.contactId)
    if (!Number.isFinite(contactId) || contactId <= 0) return

    const total = Number.isFinite(Number(item?.missedCycles))
      ? Math.max(1, Math.floor(Number(item.missedCycles)))
      : 1
    const truthContact = contactById(contactId)
    if (truthContact) {
      systemStore.touchChatTruth(truthContact, 'resume_settlement', {
        missedCycles: total,
      })
    }
    const replayCount = Math.min(total, MAX_RESTORE_NOTIFICATIONS_PER_CONTACT)
    const intervalMs = Number.isFinite(Number(item?.intervalMs))
      ? Math.max(1000, Math.floor(Number(item.intervalMs)))
      : 1000
    const dueAt = Number.isFinite(Number(item?.dueAt))
      ? Math.max(0, Math.floor(Number(item.dueAt)))
      : Date.now()
    const settledAt = Number.isFinite(Number(item?.settledAt))
      ? Math.max(0, Math.floor(Number(item.settledAt)))
      : Date.now()

    for (let i = 0; i < replayCount; i += 1) {
      const sequence = total - replayCount + i + 1
      const createdAt = Math.min(settledAt, dueAt + intervalMs * i)
      const content =
        total === 1
          ? t(
              '离线期间发生 1 次自动消息事件。',
              '1 autonomous chat event occurred while offline.',
            )
          : `${t('离线消息事件', 'Offline chat event')} ${sequence}/${total}`

      systemStore.addNotification({
        title: contactNameById(contactId),
        content,
        icon: 'fas fa-comment-dots',
        route: `/chat/${contactId}`,
        source: 'chat_auto_restore_settlement',
        createdAt,
      })
    }
  })
}

const handleVisibilityResume = () => {
  if (document.visibilityState !== 'visible') return
  void runDueAutoInvokes()
}

const handleWindowFocus = () => {
  void runDueAutoInvokes()
}

const chatAutomationTaskHandler = async (task) => {
  const payloadContactId = Number(task?.payload?.contactId ?? task?.targetId)
  if (!Number.isFinite(payloadContactId) || payloadContactId <= 0) {
    return {
      skipped: 'invalid_contact',
    }
  }

  const ok = await executeAutoInvokeForContactTask(payloadContactId, {
    fingerprint: typeof task?.fingerprint === 'string' ? task.fingerprint : '',
  })
  return {
    ok,
    contactId: payloadContactId,
  }
}

const normalizeAssistantReplyType = (replyType, aiPrefs) => {
  const input = typeof replyType === 'string' ? replyType : 'plain'
  if (!aiPrefs.allowQuoteReply) return 'plain'
  if (input === 'quote_self' && !aiPrefs.allowSelfQuote) return 'plain'
  if (['plain', 'quote_user', 'quote_self'].includes(input)) return input
  return 'plain'
}

const normalizeAssistantQuote = (rawQuote) => {
  if (!rawQuote || typeof rawQuote !== 'object') return null
  const preview = trimAssistantText(rawQuote.preview, MAX_ASSISTANT_QUOTE_PREVIEW_CHARS)
  if (!preview) return null
  return {
    messageId: trimAssistantText(rawQuote.messageId, 128),
    role: rawQuote.role === 'assistant' ? 'assistant' : 'user',
    preview,
  }
}

const normalizeAssistantBlock = (rawBlock, aiPrefs, options = {}) => {
  if (!rawBlock || typeof rawBlock !== 'object') return null
  const blockType = typeof rawBlock.type === 'string' ? rawBlock.type : 'text'

  if (blockType === 'text') {
    const text = trimAssistantText(rawBlock.text, MAX_ASSISTANT_TEXT_CHARS)
    if (!text) return null
    return {
      type: 'text',
      text,
      variant: rawBlock.variant === 'secondary' ? 'secondary' : 'primary',
      lang: typeof rawBlock.lang === 'string' ? rawBlock.lang : 'auto',
    }
  }

  if (blockType === 'voice_virtual') {
    if (!aiPrefs?.virtualVoiceEnabled) return null
    return {
      type: 'voice_virtual',
      label: trimAssistantSingleLine(
        rawBlock.label,
        MAX_ASSISTANT_LABEL_CHARS,
        AI_REPLY_FALLBACK_TEXT.voiceLabel,
      ),
      transcript: trimAssistantText(rawBlock.transcript, MAX_ASSISTANT_DETAIL_CHARS),
      durationSec: Number.isFinite(Number(rawBlock.durationSec)) ? Math.max(1, Math.floor(Number(rawBlock.durationSec))) : 8,
    }
  }

  if (blockType === 'module_link') {
    return {
      type: 'module_link',
      label: trimAssistantSingleLine(
        rawBlock.label,
        MAX_ASSISTANT_LABEL_CHARS,
        AI_REPLY_FALLBACK_TEXT.moduleLabel,
      ),
      route: sanitizeAssistantRoute(rawBlock.route, '/home'),
      note: trimAssistantText(rawBlock.note, MAX_ASSISTANT_DETAIL_CHARS),
    }
  }

  if (blockType === 'transfer_virtual') {
    return {
      type: 'transfer_virtual',
      label: trimAssistantSingleLine(
        rawBlock.label,
        MAX_ASSISTANT_LABEL_CHARS,
        AI_REPLY_FALLBACK_TEXT.transferLabel,
      ),
      amount: trimAssistantSingleLine(rawBlock.amount, 24, '0.00'),
      currency: trimAssistantSingleLine(rawBlock.currency, 8, 'CNY').toUpperCase(),
      to: trimAssistantText(rawBlock.to, 120),
      note: trimAssistantText(rawBlock.note, MAX_ASSISTANT_DETAIL_CHARS),
      actionRoute: sanitizeAssistantRoute(rawBlock.actionRoute, '/wallet'),
    }
  }

  if (blockType === 'image_virtual') {
    if (options.allowImageVirtual === false) return null
    return {
      type: 'image_virtual',
      alt: trimAssistantSingleLine(
        rawBlock.alt,
        MAX_ASSISTANT_LABEL_CHARS,
        AI_REPLY_FALLBACK_TEXT.imageAlt,
      ),
      url: sanitizeAssistantImageUrl(rawBlock.url),
      caption: trimAssistantText(rawBlock.caption, MAX_ASSISTANT_DETAIL_CHARS),
    }
  }

  if (blockType === 'mini_scene') {
    return {
      type: 'mini_scene',
      title: trimAssistantSingleLine(
        rawBlock.title,
        MAX_ASSISTANT_LABEL_CHARS,
        AI_REPLY_FALLBACK_TEXT.sceneTitle,
      ),
      description: trimAssistantText(rawBlock.description, MAX_ASSISTANT_DETAIL_CHARS),
      htmlSnippet: sanitizeAssistantHtmlSnippet(rawBlock.htmlSnippet),
    }
  }

  return null
}

const getQuoteTargetRole = (replyType) => (replyType === 'quote_self' ? 'assistant' : 'user')

const pickQuoteCandidate = (quoteCandidates, targetRole, normalizedQuote) => {
  const list = Array.isArray(quoteCandidates) ? quoteCandidates : []
  if (!list.length) return null

  const byMessageId =
    normalizedQuote?.messageId &&
    list.find((item) => item.id === normalizedQuote.messageId && item.role === targetRole)
  if (byMessageId) return byMessageId

  const byPreview =
    normalizedQuote?.preview &&
    list.find((item) => item.role === targetRole && item.preview === normalizedQuote.preview)
  if (byPreview) return byPreview

  for (let i = list.length - 1; i >= 0; i -= 1) {
    const candidate = list[i]
    if (candidate?.role === targetRole) return candidate
  }
  return null
}

const resolveAssistantQuote = (rawQuote, replyType, quoteCandidates = []) => {
  if (replyType === 'plain') return null
  const targetRole = getQuoteTargetRole(replyType)
  const normalizedQuote = normalizeAssistantQuote(rawQuote)
  const candidate = pickQuoteCandidate(quoteCandidates, targetRole, normalizedQuote)
  if (!candidate) return null
  return {
    messageId: candidate.id,
    role: targetRole,
    preview: candidate.preview,
  }
}

const summarizePrimaryTextFromFirstRichBlock = (blocks = []) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return ''
  const first = blocks.find((block) => block?.type && block.type !== 'text')
  if (!first) return ''

  if (first.type === 'voice_virtual') {
    return trimAssistantText(
      first.transcript ? `${first.label}：${first.transcript}` : first.label,
      MAX_ASSISTANT_TEXT_CHARS,
      '',
    )
  }
  if (first.type === 'module_link') {
    return trimAssistantText(`${first.label} (${first.route || '/home'})`, MAX_ASSISTANT_TEXT_CHARS, '')
  }
  if (first.type === 'link_external') {
    return trimAssistantText(`${first.label} (${first.url || ''})`, MAX_ASSISTANT_TEXT_CHARS, '')
  }
  if (first.type === 'transfer_virtual') {
    return trimAssistantText(
      `${first.label} ${first.amount || '0.00'} ${first.currency || 'CNY'}`,
      MAX_ASSISTANT_TEXT_CHARS,
      '',
    )
  }
  if (first.type === 'image_virtual') {
    return trimAssistantText(
      first.caption ? `${first.alt}：${first.caption}` : first.alt,
      MAX_ASSISTANT_TEXT_CHARS,
      '',
    )
  }
  if (first.type === 'mini_scene') {
    return trimAssistantText(
      first.description ? `${first.title}：${first.description}` : first.title,
      MAX_ASSISTANT_TEXT_CHARS,
      '',
    )
  }
  return ''
}

const normalizeAssistantTextBlocksFlow = (blocks = [], aiPrefs) => {
  const list = Array.isArray(blocks) ? blocks.filter(Boolean).slice(0, MAX_ASSISTANT_BLOCKS) : []
  const primaryTextBlocks = []
  const secondaryTextBlocks = []
  const richBlocks = []

  list.forEach((block) => {
    if (block.type !== 'text') {
      richBlocks.push(block)
      return
    }

    const text = trimAssistantText(block.text, MAX_ASSISTANT_TEXT_CHARS)
    if (!text) return
    const normalized = {
      ...block,
      text,
      variant: block.variant === 'secondary' ? 'secondary' : 'primary',
    }

    if (normalized.variant === 'secondary') {
      secondaryTextBlocks.push(normalized)
    } else {
      primaryTextBlocks.push(normalized)
    }
  })

  const primaryTextSet = new Set(primaryTextBlocks.map((item) => item.text))
  const filteredSecondary = secondaryTextBlocks.filter((item, index) => {
    if (!aiPrefs?.bilingualEnabled) return false
    if (primaryTextSet.has(item.text)) return false
    return (
      secondaryTextBlocks.findIndex((other) => other.text === item.text && other.lang === item.lang) === index
    )
  })

  return [...primaryTextBlocks, ...richBlocks, ...filteredSecondary.slice(0, 1)].slice(0, MAX_ASSISTANT_BLOCKS)
}

const ensureAssistantPrimaryTextBlock = (blocks, fallbackText = '...') => {
  const normalizedBlocks = Array.isArray(blocks) ? [...blocks].slice(0, MAX_ASSISTANT_BLOCKS) : []
  const hasPrimaryTextBlock = normalizedBlocks.some(
    (block) => block.type === 'text' && block.variant !== 'secondary' && block.text?.trim(),
  )
  if (hasPrimaryTextBlock) return normalizedBlocks

  const secondarySeed = normalizedBlocks.find(
    (block) => block.type === 'text' && block.variant === 'secondary' && block.text?.trim(),
  )
  if (secondarySeed) {
    normalizedBlocks.unshift({
      type: 'text',
      text: trimAssistantText(secondarySeed.text, MAX_ASSISTANT_TEXT_CHARS, fallbackText),
      variant: 'primary',
      lang: 'auto',
    })
    return normalizedBlocks.slice(0, MAX_ASSISTANT_BLOCKS)
  }

  normalizedBlocks.unshift({
    type: 'text',
    text: trimAssistantText(fallbackText, MAX_ASSISTANT_TEXT_CHARS, '...'),
    variant: 'primary',
    lang: 'auto',
  })
  return normalizedBlocks
}

const resolvePayloadTextFallback = (payload, fallbackText = '...') =>
  trimAssistantText(extractAssistantPayloadText(payload), MAX_ASSISTANT_TEXT_CHARS, fallbackText)

const normalizeAssistantMessagePayload = (rawMessage, aiPrefs, fallbackText = '...', options = {}) => {
  const payload = rawMessage && typeof rawMessage === 'object' ? rawMessage : {}
  const replyType = normalizeAssistantReplyType(payload.replyType, aiPrefs)
  const messagePolicy =
    options.messagePolicy && typeof options.messagePolicy === 'object'
      ? options.messagePolicy
      : {}

  let parsedBlocks = Array.isArray(payload.blocks)
    ? payload.blocks
        .map((block) => normalizeAssistantBlock(block, aiPrefs, messagePolicy))
        .filter(Boolean)
    : []

  if (!aiPrefs.bilingualEnabled) {
    parsedBlocks = parsedBlocks.filter((block) => !(block.type === 'text' && block.variant === 'secondary'))
  }

  parsedBlocks = normalizeAssistantTextBlocksFlow(parsedBlocks, aiPrefs)
  const fallbackFromRichBlock = summarizePrimaryTextFromFirstRichBlock(parsedBlocks)
  const fallbackFromPayload = resolvePayloadTextFallback(payload, fallbackText)
  parsedBlocks = ensureAssistantPrimaryTextBlock(
    parsedBlocks,
    fallbackFromRichBlock || fallbackFromPayload || fallbackText,
  )
  parsedBlocks = normalizeAssistantTextBlocksFlow(parsedBlocks, aiPrefs)
  const primaryTextBlock = parsedBlocks.find((block) => block.type === 'text' && block.variant !== 'secondary')
  const content = trimAssistantText(
    primaryTextBlock?.text || parsedBlocks.find((block) => block.type === 'text')?.text || fallbackText,
    MAX_ASSISTANT_TEXT_CHARS,
    '...',
  )
  const resolvedQuote = resolveAssistantQuote(payload.quote, replyType, options.quoteCandidates || [])
  const normalizedReplyType = replyType !== 'plain' && !resolvedQuote ? 'plain' : replyType

  return {
    content: content || '...',
    blocks: parsedBlocks,
    quote: resolvedQuote,
    replyType: normalizedReplyType,
  }
}

const parseAssistantResponse = (rawText, aiPrefs, options = {}) => {
  const text = typeof rawText === 'string' ? rawText : ''
  const cleanText = stripCodeFence(text)
  const expectedReplyCount = clampReplyCount(options.replyCount ?? aiPrefs.replyCount)
  const fallbackText = trimAssistantText(cleanText, MAX_ASSISTANT_TEXT_CHARS, '...')
  const quoteCandidates = Array.isArray(options.quoteCandidates) ? options.quoteCandidates : []
  const messagePolicy =
    options.messagePolicy && typeof options.messagePolicy === 'object'
      ? options.messagePolicy
      : {}
  const parsedPayload = parseAssistantJsonPayload(cleanText)
  const normalizedFallback = () =>
    normalizeAssistantMessagePayload({}, aiPrefs, fallbackText, {
      quoteCandidates,
      messagePolicy,
    })

  if (!parsedPayload || typeof parsedPayload !== 'object') {
    return { messages: [normalizedFallback()] }
  }

  const rawMessages = Array.isArray(parsedPayload.messages) ? parsedPayload.messages : [parsedPayload]
  const normalizedMessages = rawMessages
    .slice(0, expectedReplyCount)
    .map((item) =>
      normalizeAssistantMessagePayload(item, aiPrefs, fallbackText, {
        quoteCandidates,
        messagePolicy,
      }),
    )
    .filter(Boolean)

  if (!normalizedMessages.length) {
    return { messages: [normalizedFallback()] }
  }

  return { messages: normalizedMessages }
}

const clampNotificationPreview = (text, max = 72) => {
  const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
  if (!normalized) return t('你收到了一条新回复', 'You received a new reply')
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max)}...`
}

const summarizeAssistantMessagesForNotification = (messages = []) => {
  if (!Array.isArray(messages) || messages.length === 0) return t('你收到了一条新回复', 'You received a new reply')

  for (const message of messages) {
    if (Array.isArray(message?.blocks)) {
      const primaryTextBlock = message.blocks.find(
        (block) =>
          block?.type === 'text' &&
          block?.variant !== 'secondary' &&
          typeof block.text === 'string' &&
          block.text.trim(),
      )
      if (primaryTextBlock) return clampNotificationPreview(primaryTextBlock.text)
    }

    if (typeof message?.content === 'string' && message.content.trim()) {
      return clampNotificationPreview(message.content)
    }
  }

  return t('你收到了一条新回复', 'You received a new reply')
}

const generateAIResponse = async (contactId, triggerMessageId, options = {}) => {
  const contact = contactsForList.value.find((item) => item.id === contactId)
  if (!contact) throw new Error('Contact not found')

  const aiPrefs = chatStore.getConversationAiPrefs(contactId)
  const replyCount = clampReplyCount(options.replyCount ?? aiPrefs.replyCount)
  const contextSourceMessages = getContextSourceMessages(contactId, {
    untilMessageId: triggerMessageId,
    contextTurns: aiPrefs.contextTurns,
  })
  const quoteCandidates = toQuoteCandidates(contextSourceMessages)
  const imageReferences = await collectImageReferencesForAiCall(contactId, contextSourceMessages)
  const providerCapabilities = getAiProviderCapabilities({
    settings: settings.value,
    imageReferences,
  })
  const requestedReferenceMode = normalizeImageReferenceMode(aiPrefs.imageReferenceMode)

  const replyResult = await callAI({
    messages: contextSourceMessages.map((item) => ({
      role: item.role,
      content: extractMessageTextForContext(item),
    })),
    systemPrompt: buildSystemPrompt(contact, aiPrefs, {
      replyCount,
      isProactive: Boolean(options.isProactive),
      imageReferences,
      providerCapabilities,
    }),
    settings: settings.value,
    signal: options.signal,
    imageReferences,
    imageReferenceMode: requestedReferenceMode,
    withMeta: true,
  })
  const replyRaw =
    typeof replyResult === 'string' ? replyResult : replyResult?.text || ''
  const callMeta =
    replyResult && typeof replyResult === 'object' ? replyResult.meta || null : null
  const imageReferenceMeta = buildAssistantImageReferenceMeta(
    callMeta,
    imageReferences.length,
    providerCapabilities.kind,
  )
  const assistantImagePolicy = resolveAssistantImageBlockPolicy(aiPrefs, imageReferences)

  const parsed = parseAssistantResponse(replyRaw, aiPrefs, {
    replyCount,
    quoteCandidates,
    messagePolicy: {
      allowImageVirtual: assistantImagePolicy.allowImageVirtual,
    },
  })
  const parsedMessages = parsed.messages.slice(0, replyCount)

  parsedMessages.forEach((item) => {
    chatStore.appendMessage(contactId, {
      role: 'assistant',
      content: item.content,
      blocks: item.blocks,
      quote: item.quote,
      aiMeta: {
        replyType: item.replyType,
        bilingual: Boolean(aiPrefs.bilingualEnabled),
        ...imageReferenceMeta,
      },
      status: 'sent',
    })
  })

  if (activeChatId.value === contactId) {
    chatStore.markConversationRead(contactId)
  } else {
    chatStore.incrementConversationUnread(contactId, parsedMessages.length || 1)
  }
  systemStore.touchChatTruth(contact, 'assistant_reply', {
    count: Math.max(1, parsedMessages.length || 1),
    source: options.isProactive ? 'proactive' : 'reply',
  })

  return {
    count: parsedMessages.length,
    messages: parsedMessages,
    contactName: contact.name || t('新消息', 'New Message'),
  }
}

const generateRerollResponse = async (contactId, targetMessage, options = {}) => {
  const contact = contactsForList.value.find((item) => item.id === contactId)
  if (!contact || !targetMessage) throw new Error('Contact not found')

  const aiPrefs = chatStore.getConversationAiPrefs(contactId)
  const contextSourceMessages = getContextSourceMessages(contactId, {
    beforeMessageId: targetMessage.id,
    contextTurns: aiPrefs.contextTurns,
  })
  const quoteCandidates = toQuoteCandidates(contextSourceMessages)
  const imageReferences = await collectImageReferencesForAiCall(contactId, contextSourceMessages)
  const providerCapabilities = getAiProviderCapabilities({
    settings: settings.value,
    imageReferences,
  })
  const requestedReferenceMode = normalizeImageReferenceMode(aiPrefs.imageReferenceMode)
  const replyResult = await callAI({
    messages: contextSourceMessages.map((item) => ({
      role: item.role,
      content: extractMessageTextForContext(item),
    })),
    systemPrompt: buildSystemPrompt(contact, aiPrefs, {
      replyCount: 1,
      isProactive: false,
      imageReferences,
      providerCapabilities,
    }),
    settings: settings.value,
    signal: options.signal,
    imageReferences,
    imageReferenceMode: requestedReferenceMode,
    withMeta: true,
  })
  const replyRaw =
    typeof replyResult === 'string' ? replyResult : replyResult?.text || ''
  const callMeta =
    replyResult && typeof replyResult === 'object' ? replyResult.meta || null : null
  const imageReferenceMeta = buildAssistantImageReferenceMeta(
    callMeta,
    imageReferences.length,
    providerCapabilities.kind,
  )
  const assistantImagePolicy = resolveAssistantImageBlockPolicy(aiPrefs, imageReferences)

  const parsed = parseAssistantResponse(replyRaw, aiPrefs, {
    replyCount: 1,
    quoteCandidates,
    messagePolicy: {
      allowImageVirtual: assistantImagePolicy.allowImageVirtual,
    },
  })
  const normalized =
    parsed.messages?.[0] ||
    normalizeAssistantMessagePayload({}, aiPrefs, '...', {
      quoteCandidates,
      messagePolicy: {
        allowImageVirtual: assistantImagePolicy.allowImageVirtual,
      },
    })
  return {
    ...normalized,
    aiMeta: {
      replyType: normalized.replyType,
      bilingual: Boolean(aiPrefs.bilingualEnabled),
      ...imageReferenceMeta,
      rerollOf: targetMessage.id,
    },
  }
}

const requestAiReply = async (contactId, triggerMessageId, options = {}) => {
  if (!contactId) return false
  if (loadingAI.value || activeAbortController.value) return false

  const triggerSource = typeof options.source === 'string' ? options.source : 'manual'
  const isAutoSource = triggerSource === 'auto'
  const shouldAutoSchedule = options.autoSchedule !== false
  const truthContact = contactById(contactId)
  if (!isAutoSource) {
    markManualAction()
  }
  const normalizedTriggerId = triggerMessageId || MANUAL_TRIGGER_ID
  if (truthContact) {
    systemStore.touchChatTruth(
      truthContact,
      isAutoSource ? 'auto_trigger' : 'manual_trigger',
      {
        triggerMessageId: normalizedTriggerId,
        source: triggerSource,
      },
    )
  }
  if (normalizedTriggerId !== MANUAL_TRIGGER_ID) {
    chatStore.updateMessageStatus(contactId, normalizedTriggerId, 'read')
  }

  const aiPrefs = chatStore.getConversationAiPrefs(contactId)
  const replyCount = clampReplyCount(options.replyCount ?? aiPrefs.replyCount)
  const controller = new AbortController()
  activeAbortController.value = controller
  activeTriggerMessageId.value = normalizedTriggerId
  loadingAI.value = true
  aiErrorMessage.value = ''

  try {
    const result = await generateAIResponse(
      contactId,
      normalizedTriggerId === MANUAL_TRIGGER_ID ? '' : normalizedTriggerId,
      {
        signal: controller.signal,
        replyCount,
        isProactive: Boolean(options.isProactive),
      },
    )
    if (systemStore.isLocked && result?.count > 0) {
      systemStore.addNotification({
        title: result.contactName || t('新消息', 'New Message'),
        content: summarizeAssistantMessagesForNotification(result.messages),
        icon: 'fas fa-comment-dots',
        route: `/chat/${contactId}`,
        source: 'chat_ai_reply',
      })
    }
    if (options.markProactiveOpened) {
      chatStore.markConversationProactiveOpened(contactId)
    }
    if (!isAutoSource) {
      resetConversationAutoNextAt(contactId, Date.now())
    }
    retryTriggerMessageId.value = ''
    retryRerollMessageId.value = ''
    return true
  } catch (error) {
    aiErrorMessage.value =
      error?.code === 'CANCELED'
        ? formatApiErrorForUi(error, t('请求已取消。', 'Request canceled.'))
        : formatApiErrorForUi(error, t('AI 回复失败，请稍后重试。', 'AI reply failed. Please retry later.'))
    retryTriggerMessageId.value = normalizedTriggerId
    retryRerollMessageId.value = ''
    if (!isAutoSource) {
      resetConversationAutoNextAt(contactId, Date.now() + getAutomationCooldownMs())
    }
    systemStore.addApiReport({
      level: 'error',
      module: 'chat',
      action: isAutoSource ? 'auto_reply' : 'manual_reply',
      provider: settings.value.api.resolvedKind || '',
      model: settings.value.api.model || '',
      statusCode: Number.isFinite(Number(error?.status)) ? Number(error.status) : 0,
      code: typeof error?.code === 'string' ? error.code : '',
      message: aiErrorMessage.value || formatApiErrorForUi(error),
    })
    return false
  } finally {
    loadingAI.value = false
    activeAbortController.value = null
    activeTriggerMessageId.value = ''
    scrollToBottom()
    if (shouldAutoSchedule) {
      scheduleAutoInvokeTick()
    }
  }
}

const cancelActiveRequest = () => {
  if (!activeAbortController.value) return
  systemStore.addApiReport({
    level: 'info',
    module: 'chat',
    action: 'cancel_reply',
    provider: settings.value.api.resolvedKind || '',
    model: settings.value.api.model || '',
    message: t('用户主动取消当前请求。', 'User canceled the in-flight request.'),
  })
  activeAbortController.value.abort()
}

const retryLastMessage = () => {
  if (!canRetryAi.value || !activeChat.value) return
  aiErrorMessage.value = ''
  if (retryRerollMessageId.value) {
    const target = activeMessages.value.find((item) => item.id === retryRerollMessageId.value)
    if (target) {
      void rerollMessage(target)
      return
    }
  }

  if (!retryTriggerMessageId.value) return
  const aiPrefs = chatStore.getConversationAiPrefs(activeChat.value.id)
  requestAiReply(activeChat.value.id, retryTriggerMessageId.value, {
    replyCount: aiPrefs.replyCount,
  })
}

const requestPendingAiReply = () => {
  if (!activeChat.value) return
  const triggerMessageId = pendingReplyTriggerMessageId.value || MANUAL_TRIGGER_ID
  const aiPrefs = chatStore.getConversationAiPrefs(activeChat.value.id)
  requestAiReply(activeChat.value.id, triggerMessageId, {
    replyCount: aiPrefs.replyCount,
  })
}

const closeMessageActions = () => {
  activeMessageActionId.value = ''
}

const clearMessageLongPressTimer = () => {
  if (!messageLongPressTimerId) return
  clearTimeout(messageLongPressTimerId)
  messageLongPressTimerId = null
}

const openMessageActions = (messageId) => {
  const id = typeof messageId === 'string' ? messageId.trim() : ''
  if (!id) return
  closeUserActionPanel()
  activeMessageActionId.value = id
}

const shouldIgnoreMessageLongPressTarget = (event) => {
  const target = event?.target
  if (!target || typeof target.closest !== 'function') return false
  return Boolean(target.closest('button, a, input, textarea, select, label'))
}

const startMessageLongPress = (messageId, event) => {
  if (shouldIgnoreMessageLongPressTarget(event)) return
  clearMessageLongPressTimer()
  messageLongPressTargetId = typeof messageId === 'string' ? messageId : ''
  messageLongPressTimerId = setTimeout(() => {
    if (!messageLongPressTargetId) return
    openMessageActions(messageLongPressTargetId)
    clearMessageLongPressTimer()
  }, MESSAGE_LONG_PRESS_MS)
}

const cancelMessageLongPress = () => {
  messageLongPressTargetId = ''
  clearMessageLongPressTimer()
}

const copyText = async (text) => {
  const normalized = typeof text === 'string' ? text.trim() : ''
  if (!normalized) return false

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(normalized)
      return true
    }
  } catch {
    // Fallback below.
  }

  try {
    const temp = document.createElement('textarea')
    temp.value = normalized
    document.body.appendChild(temp)
    temp.select()
    document.execCommand('copy')
    document.body.removeChild(temp)
    return true
  } catch {
    return false
  }
}

const copyMessage = async (message) => {
  const text = messagePrimaryText(message) || extractMessageTextForContext(message)
  const ok = await copyText(text)
  if (!ok) {
    showUiNotice('error', t('复制失败，请稍后重试。', 'Copy failed. Please retry.'))
  } else {
    showUiNotice('success', t('已复制消息。', 'Message copied.'))
  }
  closeMessageActions()
}

const canEditMessage = (message) => Boolean(message && (message.role === 'user' || message.role === 'assistant'))
const canRerollMessage = (message) => Boolean(message && message.role === 'assistant')
const canRestoreSemanticRevision = (message) =>
  Boolean(
    message &&
      typeof message?.semanticRevision?.revisedText === 'string' &&
      message.semanticRevision.revisedText.trim() &&
      typeof message?.semanticRevision?.originalText === 'string' &&
      message.semanticRevision.originalText.trim(),
  )

const messageEditState = computed(() => {
  const validation = buildMessageEditValidation({
    draftText: editingMessageDraftText.value,
    originalText: editingMessageOriginalText.value,
    role: editingMessageRole.value,
    maxChars: MAX_ASSISTANT_TEXT_CHARS,
  })

  const messageMap = {
    [MESSAGE_EDIT_REASON.EMPTY]: t('消息不能为空。', 'Message cannot be empty.'),
    [MESSAGE_EDIT_REASON.TOO_LONG]: t(
      `文本不能超过 ${MAX_ASSISTANT_TEXT_CHARS} 字。`,
      `Text cannot exceed ${MAX_ASSISTANT_TEXT_CHARS} chars.`,
    ),
    [MESSAGE_EDIT_REASON.UNCHANGED]: t('文本未变化。', 'Text unchanged.'),
    [MESSAGE_EDIT_REASON.READY_ASSISTANT]: t(
      '修订后文本将作为后续上下文。',
      'Revised text will be used in later context.',
    ),
    [MESSAGE_EDIT_REASON.READY_USER]: t(
      '将直接更新这条用户消息。',
      'This will directly update the user message.',
    ),
  }

  return {
    ...validation,
    message: messageMap[validation.reason] || '',
  }
})

const quoteMessage = (message) => {
  if (!message) return
  pendingQuote.value = {
    messageId: message.id,
    role: message.role === 'assistant' ? 'assistant' : 'user',
    preview: truncateMessagePreview(messagePrimaryText(message), 80) || t('引用消息', 'Quoted message'),
  }
  closeMessageActions()
}

const clearPendingQuote = () => {
  pendingQuote.value = null
}

const closeMessageEditModal = () => {
  showEditMessageModal.value = false
  editingMessageId.value = ''
  editingMessageRole.value = 'user'
  editingMessageOriginalText.value = ''
  editingMessageDraftText.value = ''
}

const editMessage = (message) => {
  if (!activeChat.value || !canEditMessage(message)) return

  const currentText = messagePrimaryText(message)
  editingMessageId.value = message.id || ''
  editingMessageRole.value = message.role === 'assistant' ? 'assistant' : 'user'
  editingMessageOriginalText.value = currentText
  editingMessageDraftText.value = currentText
  showEditMessageModal.value = true
  closeMessageActions()
}

const submitMessageEdit = () => {
  if (!activeChat.value || !showEditMessageModal.value || !editingMessageId.value) return
  if (!messageEditState.value.valid) {
    showUiNotice('error', messageEditState.value.message)
    return
  }

  const target = activeMessages.value.find((item) => item.id === editingMessageId.value)
  if (!target || !canEditMessage(target)) {
    showUiNotice('error', t('目标消息不存在或不可编辑。', 'Message is missing or not editable.'))
    closeMessageEditModal()
    return
  }

  const nextText = messageEditState.value.text
  const ok =
    target.role === 'assistant'
      ? chatStore.reviseMessageSemantic(activeChat.value.id, target.id, nextText, {
          revisedAt: Date.now(),
        })
      : chatStore.updateMessageContent(activeChat.value.id, target.id, nextText, {
          markEdited: true,
          editedAt: Date.now(),
        })
  if (!ok) {
    showUiNotice('error', t('编辑失败，请重试。', 'Edit failed. Please retry.'))
    return
  }
  showUiNotice(
    'success',
    target.role === 'assistant'
      ? t('已保存语义修订。', 'Semantic revision saved.')
      : t('消息已更新。', 'Message updated.'),
  )
  closeMessageEditModal()
}

const restoreSemanticRevision = (message) => {
  if (!activeChat.value || !canRestoreSemanticRevision(message)) return
  const ok = chatStore.restoreMessageSemanticRevision(activeChat.value.id, message.id)
  if (!ok) {
    showUiNotice('error', t('恢复失败，请重试。', 'Restore failed. Please retry.'))
    return
  }
  showUiNotice('success', t('已恢复原文。', 'Original text restored.'))
  closeMessageActions()
}

const deleteMessage = async (message) => {
  if (!activeChat.value || !message) return
  const ok = await confirmDialog({
    title: t('删除消息', 'Delete message'),
    message: t('确认删除这条消息吗？', 'Delete this message?'),
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return

  const removed = chatStore.removeMessage(activeChat.value.id, message.id)
  if (!removed) {
    showUiNotice('error', t('删除失败，请重试。', 'Delete failed. Please retry.'))
    return
  }

  if (retryTriggerMessageId.value === message.id) retryTriggerMessageId.value = ''
  if (retryRerollMessageId.value === message.id) retryRerollMessageId.value = ''
  if (pendingQuote.value?.messageId === message.id) pendingQuote.value = null
  closeMessageActions()
}

const rerollMessage = async (message) => {
  if (!activeChat.value || !canRerollMessage(message)) return
  if (loadingAI.value || activeAbortController.value) return
  markManualAction()

  const target = activeMessages.value.find((item) => item.id === message.id)
  if (!target || target.role !== 'assistant') return

  const controller = new AbortController()
  activeAbortController.value = controller
  activeTriggerMessageId.value = target.id
  loadingAI.value = true
  aiErrorMessage.value = ''
  retryTriggerMessageId.value = ''

  try {
    const replacement = await generateRerollResponse(activeChat.value.id, target, {
      signal: controller.signal,
    })

    const replaced = chatStore.replaceMessage(
      activeChat.value.id,
      target.id,
      {
        id: target.id,
        role: 'assistant',
        content: replacement.content,
        blocks: replacement.blocks,
        quote: replacement.quote,
        aiMeta: replacement.aiMeta,
        status: 'sent',
        editedAt: Date.now(),
      },
      { keepCreatedAt: true },
    )

    if (!replaced) {
      throw new Error('Replace failed')
    }

    if (activeChat.value) {
      systemStore.touchChatTruth(activeChat.value, 'reroll', {
        targetMessageId: target.id,
      })
    }
    resetConversationAutoNextAt(activeChat.value.id, Date.now())
    retryRerollMessageId.value = ''
    closeMessageActions()
  } catch (error) {
    aiErrorMessage.value =
      error?.code === 'CANCELED'
        ? formatApiErrorForUi(error, t('请求已取消。', 'Request canceled.'))
        : formatApiErrorForUi(error, t('重roll失败，请稍后重试。', 'Reroll failed. Please retry later.'))
    retryRerollMessageId.value = target.id
    resetConversationAutoNextAt(activeChat.value.id, Date.now() + getAutomationCooldownMs())
    systemStore.addApiReport({
      level: 'error',
      module: 'chat',
      action: 'reroll_reply',
      provider: settings.value.api.resolvedKind || '',
      model: settings.value.api.model || '',
      statusCode: Number.isFinite(Number(error?.status)) ? Number(error.status) : 0,
      code: typeof error?.code === 'string' ? error.code : '',
      message: aiErrorMessage.value || formatApiErrorForUi(error),
    })
  } finally {
    loadingAI.value = false
    activeAbortController.value = null
    activeTriggerMessageId.value = ''
    scrollToBottom()
    scheduleAutoInvokeTick()
  }
}

const shouldTriggerProactiveOpener = (contactId) => {
  if (!contactId) return { allowed: false, strategy: 'on_enter_once', replyCount: 1 }
  if (loadingAI.value || activeAbortController.value) return { allowed: false, strategy: 'on_enter_once', replyCount: 1 }

  const aiPrefs = chatStore.getConversationAiPrefs(contactId)
  if (!aiPrefs.proactiveOpenerEnabled) {
    return { allowed: false, strategy: aiPrefs.proactiveOpenerStrategy, replyCount: aiPrefs.replyCount }
  }

  const strategy = normalizeProactiveStrategy(aiPrefs.proactiveOpenerStrategy)
  const messages = chatStore.getMessagesByContactId(contactId)
  if (messages.length > 0) {
    return { allowed: false, strategy, replyCount: aiPrefs.replyCount }
  }

  if (strategy === 'on_enter_once') {
    const conversation = chatStore.getConversationByContactId(contactId)
    if (conversation?.proactiveOpenedAt) {
      return { allowed: false, strategy, replyCount: aiPrefs.replyCount }
    }
  }

  return { allowed: true, strategy, replyCount: aiPrefs.replyCount }
}

const maybeTriggerProactiveOpener = async (contactId) => {
  const policy = shouldTriggerProactiveOpener(contactId)
  if (!policy.allowed) return

  await requestAiReply(contactId, MANUAL_TRIGGER_ID, {
    isProactive: true,
    markProactiveOpened: policy.strategy === 'on_enter_once',
    replyCount: policy.replyCount,
    source: 'auto',
  })
}

const generateSmartReplies = async () => {
  if (!activeChat.value || loadingAI.value || activeAbortController.value) return
  if (!suggestionFeatureEnabled.value) return

  loadingSuggestions.value = true
  const recentHistory = toAiMessages(activeChat.value.id, '', { contextTurns: 4 }).slice(-5)

  const promptMsg = {
    role: 'user',
    content: 'Based on the conversation above, generate 3 short reply options. Return ONLY a JSON array string, e.g. ["OK", "No problem", "Talk later"].',
  }

  try {
    let text = await callAI({
      messages: [...recentHistory, promptMsg],
      systemPrompt: 'You are an assistant tool. Return valid JSON only.',
      settings: settings.value,
    })

    text = stripCodeFence(text)
    const suggestionsArray = JSON.parse(text)

    if (Array.isArray(suggestionsArray)) {
      suggestions.value = suggestionsArray
        .filter((item) => typeof item === 'string' && item.trim())
        .map((item) => item.trim())
        .slice(0, 3)
      showSuggestions.value = suggestions.value.length > 0
    }
  } catch (error) {
    console.error('Smart reply failed', error)
  } finally {
    loadingSuggestions.value = false
  }
}

const resetUserActionDraft = () => {
  userActionDraft.linkUrl = 'https://'
  userActionDraft.linkTitle = ''
  userActionDraft.linkNote = ''
  userActionDraft.transferAmount = ''
  userActionDraft.transferCurrency = 'CNY'
  userActionDraft.transferNote = ''
  userActionDraft.voiceTranscript = ''
  userActionDraft.voiceDurationSec = 8
}

const backToUserActionGrid = () => {
  userActionFormType.value = USER_ACTION_FORM_NONE
}

const closeUserActionPanel = () => {
  showUserActionPanel.value = false
  backToUserActionGrid()
  galleryPickerCategory.value = 'all'
  clearGalleryPickerPreviewMap()
  resetUserActionDraft()
}

const toggleUserActionPanel = () => {
  if (!showUserActionPanel.value) {
    closeMessageActions()
    showUserActionPanel.value = true
    backToUserActionGrid()
    return
  }
  closeUserActionPanel()
}

const openUserActionForm = (formType) => {
  const nextType =
    formType === USER_ACTION_FORM_LINK ||
    formType === USER_ACTION_FORM_TRANSFER ||
    formType === USER_ACTION_FORM_VOICE ||
    formType === USER_ACTION_FORM_GALLERY
      ? formType
      : USER_ACTION_FORM_NONE
  if (nextType === USER_ACTION_FORM_GALLERY && !gallerySendState.value.enabled) {
    showUiNotice('warning', gallerySendState.value.message)
    return
  }
  showUserActionPanel.value = true
  userActionFormType.value = nextType
  if (nextType === USER_ACTION_FORM_GALLERY) {
    const context = activeRoleAssetContext.value
    if (context.preferredImageAssetId) {
      const preferredAsset = galleryStore.findAssetById(context.preferredImageAssetId)
      if (preferredAsset?.category) {
        galleryPickerCategory.value = preferredAsset.category
        return
      }
    }
    if ((context.profileAssetPack?.referenceAssetIds || []).length > 0) {
      galleryPickerCategory.value = 'reference'
      return
    }
    if ((context.profileAssetPack?.scenarioAssetIds || []).length > 0) {
      galleryPickerCategory.value = 'scenario'
      return
    }
    if ((context.profileAssetPack?.emojiAssetIds || []).length > 0) {
      galleryPickerCategory.value = 'emoji'
      return
    }
  }
}

const buildMessageImagePreviewKey = (messageId, blockIndex) => `${messageId}:${blockIndex}`

const clearGalleryPickerPreviewMap = () => {
  Object.keys(galleryPickerPreviewMap).forEach((assetId) => {
    galleryStore.releaseAssetPreview(assetId, CHAT_ASSET_PREVIEW_SCOPE_ID)
    delete galleryPickerPreviewMap[assetId]
  })
}

const clearMessageImagePreviewMap = () => {
  Object.keys(messageImagePreviewMap).forEach((key) => {
    const assetId = messageImagePreviewAssetIdMap[key]
    if (assetId) {
      galleryStore.releaseAssetPreview(assetId, CHAT_ASSET_PREVIEW_SCOPE_ID)
      delete messageImagePreviewAssetIdMap[key]
    }
    delete messageImagePreviewMap[key]
  })
}

const ensureGalleryPickerPreview = async (assetId) => {
  if (!assetId || galleryPickerPreviewMap[assetId]) return
  const previewUrl = await galleryStore.getAssetPreviewUrl(assetId, {
    scopeId: CHAT_ASSET_PREVIEW_SCOPE_ID,
  })
  if (!previewUrl) return
  galleryPickerPreviewMap[assetId] = previewUrl
}

const ensureMessageImagePreview = async (messageId, blockIndex, assetId) => {
  if (!messageId || !assetId) return
  const key = buildMessageImagePreviewKey(messageId, blockIndex)
  if (messageImagePreviewMap[key]) return
  const previewUrl = await galleryStore.getAssetPreviewUrl(assetId, {
    scopeId: CHAT_ASSET_PREVIEW_SCOPE_ID,
  })
  if (!previewUrl) return
  messageImagePreviewMap[key] = previewUrl
  messageImagePreviewAssetIdMap[key] = assetId
}

const resolveImageBlockUrl = (messageId, blockIndex, block) => {
  const key = buildMessageImagePreviewKey(messageId, blockIndex)
  return messageImagePreviewMap[key] || block?.url || ''
}

const buildPendingQuotePayload = () =>
  pendingQuote.value
    ? {
        messageId: pendingQuote.value.messageId,
        role: pendingQuote.value.role === 'assistant' ? 'assistant' : 'user',
        preview: pendingQuote.value.preview || '',
      }
    : null

const appendUserMessage = ({ content = '', blocks = [], source = 'send' } = {}) => {
  if (!activeChat.value) return null
  const chatId = activeChat.value.id
  const normalizedContent = typeof content === 'string' ? content.trim() : ''
  const quotePayload = buildPendingQuotePayload()

  const appended = chatStore.appendMessage(chatId, {
    role: 'user',
    content: normalizedContent,
    blocks: Array.isArray(blocks) ? blocks : [],
    quote: quotePayload,
    status: 'delivered',
  })
  if (!appended) return null

  if (activeChat.value) {
    systemStore.touchChatTruth(activeChat.value, 'user_message', {
      count: 1,
      triggerMessageId: appended.id,
      source,
    })
  }
  resetConversationAutoNextAt(chatId, Date.now())

  pendingQuote.value = null
  showSuggestions.value = false
  aiErrorMessage.value = ''
  retryTriggerMessageId.value = ''
  retryRerollMessageId.value = ''
  closeMessageActions()
  scrollToBottom()

  const aiPrefs = chatStore.getConversationAiPrefs(chatId)
  if (aiPrefs.replyMode === 'auto' && chatAutomationEnabled.value) {
    requestAiReply(chatId, appended.id, { replyCount: aiPrefs.replyCount })
  }
  scheduleAutoInvokeTick()
  return appended
}

const normalizeExternalUrl = (value) => {
  const raw = typeof value === 'string' ? value.trim() : ''
  if (!raw) return ''
  const candidate = /^https?:\/\//i.test(raw) ? raw : /^www\./i.test(raw) ? `https://${raw}` : ''
  if (!candidate) return ''
  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.toString()
  } catch {
    return ''
  }
}

const linkFormState = computed(() => {
  const normalizedUrl = normalizeExternalUrl(userActionDraft.linkUrl)
  if (!normalizedUrl) {
    return {
      valid: false,
      message: t('链接格式无效，仅支持 http/https。', 'Invalid URL. Only http/https is supported.'),
      url: '',
      label: '',
      note: '',
    }
  }

  const label =
    typeof userActionDraft.linkTitle === 'string' && userActionDraft.linkTitle.trim()
      ? userActionDraft.linkTitle.trim()
      : t('外部链接', 'External link')
  const note = typeof userActionDraft.linkNote === 'string' ? userActionDraft.linkNote.trim() : ''
  return {
    valid: true,
    message: t('链接格式可用。', 'URL format looks good.'),
    url: normalizedUrl,
    label,
    note,
  }
})

const transferFormState = computed(() => {
  const amount = typeof userActionDraft.transferAmount === 'string' ? userActionDraft.transferAmount.trim() : ''
  if (!amount) {
    return {
      valid: false,
      message: t('请输入转账金额。', 'Please enter transfer amount.'),
      amount: '',
      currency: '',
      note: '',
    }
  }
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    return {
      valid: false,
      message: t('金额格式无效。', 'Invalid amount format.'),
      amount: '',
      currency: '',
      note: '',
    }
  }

  const rawCurrency = typeof userActionDraft.transferCurrency === 'string'
    ? userActionDraft.transferCurrency.trim()
    : ''
  const currency = rawCurrency ? rawCurrency.toUpperCase() : 'CNY'
  if (!/^[A-Z]{2,8}$/.test(currency)) {
    return {
      valid: false,
      message: t('币种格式无效。', 'Invalid currency format.'),
      amount: '',
      currency: '',
      note: '',
    }
  }

  const note = typeof userActionDraft.transferNote === 'string' ? userActionDraft.transferNote.trim() : ''
  return {
    valid: true,
    message: t('转账卡片信息可发送。', 'Transfer card is ready to send.'),
    amount,
    currency,
    note,
  }
})

const voiceFormState = computed(() => {
  const transcript = typeof userActionDraft.voiceTranscript === 'string'
    ? userActionDraft.voiceTranscript.trim()
    : ''
  if (!transcript) {
    return {
      valid: false,
      message: t('语音内容不能为空。', 'Voice transcript cannot be empty.'),
      transcript: '',
      durationSec: 0,
    }
  }

  const duration = Number(userActionDraft.voiceDurationSec)
  if (!Number.isFinite(duration)) {
    return {
      valid: false,
      message: t('时长格式无效。', 'Invalid duration format.'),
      transcript: '',
      durationSec: 0,
    }
  }

  return {
    valid: true,
    message: t('语音卡片信息可发送。', 'Voice card is ready to send.'),
    transcript,
    durationSec: Math.min(600, Math.max(1, Math.floor(duration))),
  }
})

const openExternalUrl = (rawUrl) => {
  const url = normalizeExternalUrl(rawUrl)
  if (!url) {
    showUiNotice('warning', t('外部链接不可用。', 'External link is unavailable.'))
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

const triggerUserMediaPicker = (kind = USER_MEDIA_KIND_IMAGE) => {
  if (!userMediaInputRef.value) return
  pendingUserMediaKind.value = kind === USER_MEDIA_KIND_GIF ? USER_MEDIA_KIND_GIF : USER_MEDIA_KIND_IMAGE
  userMediaInputRef.value.accept =
    pendingUserMediaKind.value === USER_MEDIA_KIND_GIF ? 'image/gif' : 'image/*'
  userMediaInputRef.value.value = ''
  userMediaInputRef.value.click()
}

const sendTextMessage = () => {
  if (!activeChat.value) return
  const payload = inputMessage.value.trim()
  if (!payload) return

  const appended = appendUserMessage({
    content: payload,
    blocks: [],
    source: 'send_text',
  })
  if (!appended) return

  inputMessage.value = ''
  chatStore.setConversationDraft(activeChat.value.id, '')
  closeUserActionPanel()
}

const sendCurrentLocation = () => {
  if (!activeChat.value) return

  if (!locationShareState.value.enabled) {
    showUiNotice('warning', locationShareState.value.message)
    return
  }
  const locationText = typeof currentLocationText.value === 'string' ? currentLocationText.value.trim() : ''

  appendUserMessage({
    content: `${t('位置共享', 'Location share')} · ${locationText}`,
    blocks: [
      {
        type: 'module_link',
        label: t('位置共享', 'Location share'),
        route: '/map',
        note: locationText,
      },
    ],
    source: 'location',
  })
  closeUserActionPanel()
}

const submitLinkCardForm = () => {
  if (!activeChat.value) return
  if (!linkFormState.value.valid) {
    showUiNotice('error', linkFormState.value.message)
    return
  }
  const { url, label, note } = linkFormState.value

  appendUserMessage({
    content: `${label}\n${url}`,
    blocks: [
      {
        type: 'link_external',
        label,
        url,
        note,
      },
    ],
    source: 'link',
  })
  closeUserActionPanel()
}

const submitTransferCardForm = () => {
  if (!activeChat.value) return
  if (!transferFormState.value.valid) {
    showUiNotice('error', transferFormState.value.message)
    return
  }
  const { amount, currency, note } = transferFormState.value

  appendUserMessage({
    content: `${t('转账', 'Transfer')} ${amount} ${currency}`,
    blocks: [
      {
        type: 'transfer_virtual',
        label: t('转账卡片', 'Transfer card'),
        amount,
        currency,
        to: activeChat.value.name || '',
        note,
        actionRoute: '/wallet',
      },
    ],
    source: 'transfer',
  })
  closeUserActionPanel()
}

const submitVoiceCardForm = () => {
  if (!activeChat.value) return
  if (!voiceFormState.value.valid) {
    showUiNotice('error', voiceFormState.value.message)
    return
  }
  const { transcript, durationSec: safeDurationSec } = voiceFormState.value

  appendUserMessage({
    content: transcript,
    blocks: [
      {
        type: 'voice_virtual',
        label: t('语音消息', 'Voice message'),
        transcript,
        durationSec: safeDurationSec,
      },
    ],
    source: 'voice_card',
  })
  closeUserActionPanel()
}

const submitGalleryAsset = async (asset) => {
  if (!activeChat.value || !asset?.id) return

  const fallbackAlt = t('素材图片', 'Asset image')
  const safeName = typeof asset.name === 'string' && asset.name.trim() ? asset.name.trim() : fallbackAlt
  const sourceUrl = asset.sourceType === 'url' ? asset.sourceUrl || '' : ''
  const previewUrl =
    sourceUrl ||
    (await galleryStore.getAssetPreviewUrl(asset.id, {
      scopeId: CHAT_ASSET_PREVIEW_SCOPE_ID,
    }))

  if (!previewUrl) {
    showUiNotice('error', t('素材预览不可用，请检查相册资源。', 'Asset preview is unavailable.'))
    return
  }

  const appended = appendUserMessage({
    content: `${t('素材', 'Asset')}: ${safeName}`,
    blocks: [
      {
        type: 'image_virtual',
        alt: safeName,
        url: sourceUrl,
        assetId: asset.id,
        caption: t('来自素材中心', 'From asset center'),
      },
    ],
    source: 'gallery_asset',
  })
  if (appended) {
    galleryStore.bindAssetUsage(asset.id, {
      moduleKey: 'chat',
      targetKey: `contact:${activeChat.value.id}`,
      label: `${t('聊天会话', 'Chat thread')} #${activeChat.value.id}`,
    })
  }
  closeUserActionPanel()
}

const handleUserMediaPicked = async (event) => {
  const inputEl = event?.target
  const file = inputEl?.files?.[0]
  if (!file || !activeChat.value) return

  const mediaKind = pendingUserMediaKind.value === USER_MEDIA_KIND_GIF ? USER_MEDIA_KIND_GIF : USER_MEDIA_KIND_IMAGE
  if (mediaKind === USER_MEDIA_KIND_GIF && file.type !== 'image/gif') {
    showUiNotice('warning', t('请选择 GIF 文件。', 'Please select a GIF file.'))
    if (inputEl) inputEl.value = ''
    return
  }

  try {
    const shouldImportToGallery = await confirmDialog({
      title: t('发送图片', 'Send image'),
      message: t(
        '是否导入素材库后发送？点击“取消”将仅本次发送，不入库。',
        'Import to asset library before sending? Click "Cancel" to send one-off without importing.',
      ),
      confirmText: t('导入后发送', 'Import first'),
      cancelText: t('仅本次发送', 'One-off send'),
      tone: 'accent',
    })

    if (!shouldImportToGallery) {
      const expectedMediaKind =
        mediaKind === USER_MEDIA_KIND_GIF ? MEDIA_KIND.GIF : MEDIA_KIND.IMAGE
      const sizeGuard = validateMediaFileBySize(file, {
        scene: MEDIA_SIZE_SCENE.ONE_OFF_INLINE,
        fallbackKind: expectedMediaKind,
      })
      if (!sizeGuard.ok && sizeGuard.reason === 'too_large') {
        showUiNotice(
          'warning',
          t(
            `单次发送文件过大（上限 ${formatBytesCompact(sizeGuard.maxBytes)}），请改为“导入素材库后发送”。`,
            `One-off file is too large (limit ${formatBytesCompact(sizeGuard.maxBytes)}). Please use import-then-send mode.`,
          ),
        )
        return
      }

      const inlineDataUrl = await readFileAsDataUrl(file)
      if (!inlineDataUrl) {
        showUiNotice('error', t('文件读取失败，请重试。', 'File read failed. Please retry.'))
        return
      }

      const fallbackAlt = mediaKind === USER_MEDIA_KIND_GIF ? t('单次 GIF', 'One-off GIF') : t('单次图片', 'One-off image')
      const safeName = typeof file.name === 'string' && file.name.trim() ? file.name.trim() : fallbackAlt
      appendUserMessage({
        content: `${fallbackAlt}: ${safeName}`,
        blocks: [
          {
            type: 'image_virtual',
            alt: safeName,
            url: inlineDataUrl,
            assetId: '',
            caption: t('一次性发送（未入库）', 'One-off send (not imported)'),
          },
        ],
        source: 'one_off_media',
      })
      showUiNotice(
        'success',
        t(
          '已按一次性素材发送（未入库）。如需复用可在相册再导入。',
          'Sent as one-off media (not imported). Import in Gallery later if you need reuse.',
        ),
      )
      closeUserActionPanel()
      return
    }

    const result = await galleryStore.importAssetsFromFiles([file], {
      category: mediaKind === USER_MEDIA_KIND_GIF ? 'emoji' : 'reference',
    })

    let targetAssetId = ''
    if (Array.isArray(result.importedIds) && result.importedIds.length > 0) {
      targetAssetId = result.importedIds[0]
    } else if (Array.isArray(result.duplicateAssetIds) && result.duplicateAssetIds.length > 0) {
      targetAssetId = result.duplicateAssetIds[0]
      showUiNotice('success', t('素材已存在，已复用素材库资源。', 'Asset already exists and was reused from library.'))
    }

    if (!targetAssetId) {
      if (result.skippedTooLargeCount > 0) {
        const expectedKind = mediaKind === USER_MEDIA_KIND_GIF ? MEDIA_KIND.GIF : MEDIA_KIND.IMAGE
        const limitBytes = resolveMediaSizeLimitBytes(expectedKind, {
          scene: MEDIA_SIZE_SCENE.GALLERY_IMPORT,
        })
        showUiNotice(
          'warning',
          t(
            `素材文件超过导入上限（${formatBytesCompact(limitBytes)}），请压缩后重试。`,
            `File is over import limit (${formatBytesCompact(limitBytes)}). Compress and retry.`,
          ),
        )
        return
      }
      showUiNotice('error', t('素材导入失败，请重试。', 'Asset import failed. Please retry.'))
      return
    }

    const targetAsset = galleryStore.findAssetById(targetAssetId)
    if (!targetAsset) {
      showUiNotice('error', t('素材记录异常，请前往相册检查。', 'Asset record is invalid. Please check Gallery.'))
      return
    }

    await submitGalleryAsset(targetAsset)
  } catch {
    showUiNotice('error', t('文件处理失败，请重试。', 'File processing failed. Please retry.'))
  } finally {
    if (inputEl) inputEl.value = ''
  }
}

const useSuggestion = (text) => {
  inputMessage.value = text
}

const sanitizeRenderedHtml = (rawHtml = '') => {
  const html = typeof rawHtml === 'string' ? rawHtml : ''
  if (!html.trim()) return ''

  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son\w+=(['"]).*?\1/gi, '')
      .replace(/javascript:/gi, '')
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, iframe, object, embed, meta, link').forEach((node) => {
    node.remove()
  })
  doc.querySelectorAll('*').forEach((node) => {
    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase()
      const value = (attr.value || '').trim().toLowerCase()
      if (name.startsWith('on')) {
        node.removeAttribute(attr.name)
        return
      }
      if ((name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:')) {
        node.removeAttribute(attr.name)
      }
    })
  })
  return doc.body.innerHTML
}

const renderMarkdown = (text) => sanitizeRenderedHtml(marked.parse(text || ''))
const getConversationPreview = (contactId) => chatStore.getConversationByContactId(contactId)

const formatConversationTime = (timestamp) => {
  if (!timestamp) return t('昨天', 'Yesterday')
  const now = new Date()
  const target = new Date(timestamp)

  const isSameDay =
    now.getFullYear() === target.getFullYear() &&
    now.getMonth() === target.getMonth() &&
    now.getDate() === target.getDate()

  if (isSameDay) {
    const locale = languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value
    return target.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }

  const dayDiff = Math.floor((now.getTime() - target.getTime()) / 86400000)
  if (dayDiff <= 1) return t('昨天', 'Yesterday')
  return `${target.getMonth() + 1}/${target.getDate()}`
}

const contactPreviewText = (contactId) => {
  const conversation = getConversationPreview(contactId)
  if (conversation?.draft?.trim()) {
    return `${t('草稿', 'Draft')}: ${conversation.draft.trim()}`
  }
  return conversation?.lastMessage || t('点击开始聊天', 'Tap to start chat')
}

const contactKindTag = (contact) => {
  if (!contact) return ''
  if (contact.kind === 'group') return t('群聊', 'Group')
  if (contact.kind === 'service') return t('服务号', 'Service')
  if (contact.kind === 'official') return t('官方号', 'Official')
  if (contact.isMain) return t('主角色', 'Main')
  return ''
}

const contactKindTagClass = (contact) => {
  if (!contact) return ''
  if (contact.kind === 'group') return 'bg-indigo-100 text-indigo-700'
  if (contact.kind === 'service') return 'bg-emerald-100 text-emerald-700'
  if (contact.kind === 'official') return 'bg-sky-100 text-sky-700'
  if (contact.isMain) return 'bg-yellow-100 text-yellow-700'
  return ''
}

const headerSecondaryStatusText = computed(() => {
  if (loadingAI.value) return t('对方正在输入...', 'Typing...')
  if (threadSettingsSaved.value) return t('会话调校已保存', 'Thread tuning saved')
  if (threadIdentitySaved.value) return t('会话身份已保存', 'Thread identity saved')
  return ''
})

const headerSecondaryStatusClass = computed(() =>
  !loadingAI.value && (threadSettingsSaved.value || threadIdentitySaved.value)
    ? 'text-emerald-600 font-medium'
    : '',
)

const triggerThreadSettingsSaved = () => {
  threadSettingsSaved.value = true
  if (threadSettingsSavedTimerId) clearTimeout(threadSettingsSavedTimerId)
  threadSettingsSavedTimerId = setTimeout(() => {
    threadSettingsSaved.value = false
  }, SAVE_FEEDBACK_DURATION_MS)
}

const triggerThreadIdentitySaved = () => {
  threadIdentitySaved.value = true
  if (threadIdentitySavedTimerId) clearTimeout(threadIdentitySavedTimerId)
  threadIdentitySavedTimerId = setTimeout(() => {
    threadIdentitySaved.value = false
  }, SAVE_FEEDBACK_DURATION_MS)
}

const messageStatusText = (message) => {
  if (message.role !== 'user') return ''
  if (message.status === 'failed') return t('发送失败', 'Failed')
  if (message.status === 'sending') return t('发送中...', 'Sending...')
  if (message.status === 'read') return t('已读', 'Read')
  if (message.status === 'delivered') return t('已送达', 'Delivered')
  if (message.status === 'sent') return t('已发送', 'Sent')
  return ''
}

const messageMetaHintText = (message) => {
  if (!message) return ''
  const hints = []
  if (message.role === 'assistant' && message.aiMeta?.rerollOf) {
    hints.push(t('重roll结果', 'Rerolled'))
  }
  if (message.role === 'assistant' && Number(message.aiMeta?.imageReferenceCount) > 0) {
    if (message.aiMeta?.imageReferenceFallback) {
      hints.push(t('参考图回退', 'Image fallback'))
    } else if (message.aiMeta?.imageReferenceMode === 'native_url') {
      hints.push(t('参考图已启用', 'Image refs on'))
    } else {
      hints.push(t('参考图线索', 'Image cues'))
    }
  }
  if (message.editedAt) {
    hints.push(t('已编辑', 'Edited'))
  }
  if (shouldShowSemanticRevisionHint({ mode: SEMANTIC_REVISION_TRACE_MODE, message })) {
    hints.push(t('已修订', 'Revised'))
  }
  return hints.join(' · ')
}

const messageBlocks = (message) => {
  if (Array.isArray(message?.blocks) && message.blocks.length > 0) return message.blocks
  return [{ type: 'text', text: message?.content || '', variant: 'primary', lang: 'auto' }]
}

const secondaryTextBadge = (block) => {
  const lang =
    typeof block?.lang === 'string' && block.lang.trim() && block.lang !== 'auto'
      ? block.lang.trim().toUpperCase()
      : t('双语', 'Bilingual')
  return `${t('翻译', 'Translation')} · ${lang}`
}

const formatVoiceDuration = (durationSec) => {
  const total = Number.isFinite(Number(durationSec)) ? Math.max(1, Math.floor(Number(durationSec))) : 8
  const minute = Math.floor(total / 60)
  const second = `${total % 60}`.padStart(2, '0')
  return `${minute}:${second}`
}

const openModuleRoute = (routePath) => {
  if (typeof routePath !== 'string' || !SAFE_MODULE_ROUTES.has(routePath)) {
    showUiNotice('warning', t('该链接暂不可用。', 'This link is unavailable.'))
    return
  }
  router.push(routePath)
}

const openChatDirectory = () => {
  showThreadMenu.value = false
  router.push('/chat-contacts')
}

const transferActionLabel = (block) => {
  if (!block?.actionRoute) return t('详情', 'Details')
  if (block.actionRoute === '/wallet') return t('打开钱包', 'Open Wallet')
  return t('打开', 'Open')
}

const toggleThreadMenu = () => {
  const next = !showThreadMenu.value
  showThreadMenu.value = next
  if (next) {
    applyThreadSettingsDraft()
    applyThreadIdentityDraft()
  }
}

const saveThreadIdentityOverrides = () => {
  if (!activeChat.value) return

  const changed = chatStore.setConversationIdentityOverrides(activeChat.value.id, {
    selfAvatar: threadIdentityDraft.selfAvatar,
    contactAvatar: threadIdentityDraft.contactAvatar,
  })

  if (!changed) {
    showUiNotice('warning', t('未检测到身份变更。', 'No identity changes detected.'))
    return
  }

  chatStore.saveNow()
  triggerThreadIdentitySaved()
}

const saveThreadSettings = () => {
  if (!activeChat.value) return

  chatStore.setConversationAiPrefs(activeChat.value.id, {
    suggestedRepliesEnabled: Boolean(threadSettingsDraft.suggestedRepliesEnabled),
    contextTurns: clampContextTurns(threadSettingsDraft.contextTurns),
    bilingualEnabled: Boolean(threadSettingsDraft.bilingualEnabled),
    secondaryLanguage:
      typeof threadSettingsDraft.secondaryLanguage === 'string' && threadSettingsDraft.secondaryLanguage.trim()
        ? threadSettingsDraft.secondaryLanguage.trim()
        : 'en',
    allowQuoteReply: Boolean(threadSettingsDraft.allowQuoteReply),
    allowSelfQuote: Boolean(threadSettingsDraft.allowSelfQuote),
    virtualVoiceEnabled: Boolean(threadSettingsDraft.virtualVoiceEnabled),
    replyMode: normalizeReplyMode(threadSettingsDraft.replyMode),
    replyCount: clampReplyCount(threadSettingsDraft.replyCount),
    responseStyle: normalizeResponseStyle(threadSettingsDraft.responseStyle),
    proactiveOpenerEnabled: Boolean(threadSettingsDraft.proactiveOpenerEnabled),
    proactiveOpenerStrategy: normalizeProactiveStrategy(threadSettingsDraft.proactiveOpenerStrategy),
    imageReferenceMode: normalizeImageReferenceMode(threadSettingsDraft.imageReferenceMode),
    allowImageVirtualWithoutReference: Boolean(
      threadSettingsDraft.allowImageVirtualWithoutReference,
    ),
    autoInvokeEnabled: chatAutomationEnabled.value && Boolean(threadSettingsDraft.autoInvokeEnabled),
    autoInvokeIntervalSec: clampAutoInvokeInterval(threadSettingsDraft.autoInvokeIntervalSec),
  })

  if (threadSettingsDraft.autoInvokeEnabled) {
    resetConversationAutoNextAt(activeChat.value.id, Date.now())
  } else {
    chatStore.setConversationAutoState(activeChat.value.id, { autoNextAt: 0 })
  }

  if (!threadSettingsDraft.suggestedRepliesEnabled) {
    showSuggestions.value = false
  }

  chatStore.saveNow()
  triggerThreadSettingsSaved()
  showThreadMenu.value = false
  scheduleAutoInvokeTick()
}

watch(
  galleryPickerAssets,
  (assets) => {
    if (!showUserActionPanel.value || userActionFormType.value !== USER_ACTION_FORM_GALLERY) return
    const activeIds = new Set(assets.map((asset) => asset.id))
    assets.forEach((asset) => {
      void ensureGalleryPickerPreview(asset.id)
    })
    Object.keys(galleryPickerPreviewMap).forEach((assetId) => {
      if (!activeIds.has(assetId)) {
        galleryStore.releaseAssetPreview(assetId, CHAT_ASSET_PREVIEW_SCOPE_ID)
        delete galleryPickerPreviewMap[assetId]
      }
    })
  },
  { immediate: true },
)

watch(
  () => ({
    panelOpened: showUserActionPanel.value,
    formType: userActionFormType.value,
    category: galleryPickerCategory.value,
  }),
  () => {
    if (!showUserActionPanel.value || userActionFormType.value !== USER_ACTION_FORM_GALLERY) return
    galleryPickerAssets.value.forEach((asset) => {
      void ensureGalleryPickerPreview(asset.id)
    })
  },
)

watch(
  activeMessages,
  (messages) => {
    const validKeys = new Set()
    messages.forEach((message) => {
      const blocks = Array.isArray(message?.blocks) ? message.blocks : []
      blocks.forEach((block, blockIndex) => {
        if (block?.type !== 'image_virtual') return
        const key = buildMessageImagePreviewKey(message.id, blockIndex)
        validKeys.add(key)
        if (block?.assetId) {
          void ensureMessageImagePreview(message.id, blockIndex, block.assetId)
          return
        }
        if (typeof block?.url === 'string' && block.url.trim()) {
          messageImagePreviewMap[key] = block.url
          delete messageImagePreviewAssetIdMap[key]
        }
      })
    })
    Object.keys(messageImagePreviewMap).forEach((key) => {
      if (!validKeys.has(key)) {
        const assetId = messageImagePreviewAssetIdMap[key]
        if (assetId) {
          galleryStore.releaseAssetPreview(assetId, CHAT_ASSET_PREVIEW_SCOPE_ID)
          delete messageImagePreviewAssetIdMap[key]
        }
        delete messageImagePreviewMap[key]
      }
    })
  },
  { immediate: true, deep: true },
)

watch(
  activeChatId,
  (id) => {
    showThreadMenu.value = false
    closeUserActionPanel()
    closeMessageEditModal()
    galleryPickerCategory.value = 'all'
    clearGalleryPickerPreviewMap()
    activeMessageActionId.value = ''
    pendingQuote.value = null
    threadSettingsSaved.value = false
    threadIdentitySaved.value = false
    uiNoticeType.value = ''
    uiNoticeMessage.value = ''

    if (id) {
      chatStore.ensureConversationForContact(id)
      chatStore.markConversationRead(id)
      inputMessage.value = chatStore.getConversationByContactId(id).draft || ''
      applyThreadSettingsDraft()
      applyThreadIdentityDraft()
      const prefs = chatStore.getConversationAiPrefs(id)
      if (prefs.autoInvokeEnabled) {
        const conversation = chatStore.getConversationByContactId(id)
        if (!conversation.autoNextAt) {
          resetConversationAutoNextAt(id, Date.now())
        }
      }
      queueMicrotask(() => {
        void maybeTriggerProactiveOpener(id)
      })
    } else {
      inputMessage.value = ''
    }

    suggestions.value = []
    showSuggestions.value = false
    aiErrorMessage.value = ''
    retryTriggerMessageId.value = ''
    retryRerollMessageId.value = ''
    scrollToBottom()
    scheduleAutoInvokeTick()
  },
  { immediate: true },
)

watch(
  () => ({
    masterEnabled: settings.value.aiAutomation?.masterEnabled,
    chatEnabled: settings.value.aiAutomation?.modules?.chat?.enabled,
    notifyOnlyMode: settings.value.aiAutomation?.notifyOnlyMode,
    quietHoursEnabled: settings.value.aiAutomation?.quietHoursEnabled,
    quietHoursStart: settings.value.aiAutomation?.quietHoursStart,
    quietHoursEnd: settings.value.aiAutomation?.quietHoursEnd,
    cooldown: settings.value.aiAutomation?.conflictCooldownSec,
    dedupe: settings.value.aiAutomation?.dedupeWindowSec,
    timezone: settings.value.system?.timezone,
  }),
  () => {
    if (!chatAutomationEnabled.value) {
      clearAllAutoInvokeSchedules()
      clearAutoInvokeTimer()
      return
    }

    chatStore.normalizeAutoInvokeCheckpoints(Date.now())
    void runDueAutoInvokes()
  },
  { deep: true },
)

watch(inputMessage, (text) => {
  if (!activeChat.value) return
  chatStore.setConversationDraft(activeChat.value.id, text)
})

onMounted(() => {
  systemStore.registerAiAutomationHandler(CHAT_AUTOMATION_MODULE_KEY, chatAutomationTaskHandler)
  chatStore.normalizeAutoInvokeCheckpoints(Date.now())
  void runDueAutoInvokes()
  window.addEventListener('focus', handleWindowFocus)
  document.addEventListener('visibilitychange', handleVisibilityResume)
})

onBeforeUnmount(() => {
  // Keep in-flight AI work running so lock screen can receive completion notifications.
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('visibilitychange', handleVisibilityResume)
  systemStore.unregisterAiAutomationHandler(CHAT_AUTOMATION_MODULE_KEY, chatAutomationTaskHandler)
  clearAutoInvokeTimer()
  cancelMessageLongPress()
  if (threadSettingsSavedTimerId) clearTimeout(threadSettingsSavedTimerId)
  if (threadIdentitySavedTimerId) clearTimeout(threadIdentitySavedTimerId)
  if (uiNoticeTimerId) clearTimeout(uiNoticeTimerId)
  clearGalleryPickerPreviewMap()
  clearMessageImagePreviewMap()
  galleryStore.releaseAssetPreviewScope(CHAT_ASSET_PREVIEW_SCOPE_ID)
})
</script>

<template>
  <div class="w-full h-full flex flex-col chat-shell">
    <template v-if="!activeChat">
      <div class="pt-12 px-4 pb-2 chat-ink">
        <div class="flex items-center justify-between">
          <button @click="goHome" class="chat-ink w-10 h-10 rounded-full hover:bg-black/5">{{ t('主页', 'Home') }}</button>
          <p class="font-bold text-sm">{{ t('聊天', 'Chats') }}</p>
          <span class="text-xs text-gray-500">{{ currentStatus.label }}</span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto no-scrollbar bg-white rounded-t-2xl mt-2">
        <div
          v-for="contact in contactsForList"
          :key="contact.id"
          @click="enterChat(contact)"
          class="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer"
        >
          <div class="w-12 h-12 rounded-[18px] overflow-hidden bg-gray-200">
            <img :src="contactAvatarForList(contact)" class="w-full h-full object-cover" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-center gap-2">
              <span class="font-bold text-sm truncate">{{ contact.name }}</span>
              <span class="text-[10px] text-gray-400 shrink-0">{{ formatConversationTime(getConversationPreview(contact.id)?.lastMessageAt) }}</span>
            </div>
            <div class="text-xs line-clamp-1 flex items-center gap-1" :class="getConversationPreview(contact.id)?.draft?.trim() ? 'text-orange-500' : 'text-gray-500'">
              <span v-if="contactKindTag(contact)" class="px-1 rounded text-[8px] font-medium" :class="contactKindTagClass(contact)">
                {{ contactKindTag(contact) }}
              </span>
              {{ contactPreviewText(contact.id) }}
            </div>
          </div>
          <span
            v-if="getConversationPreview(contact.id)?.unread"
            class="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] inline-flex items-center justify-center"
          >
            {{ Math.min(getConversationPreview(contact.id)?.unread || 0, 99) }}
          </span>
        </div>
      </div>

      <div class="border-t border-gray-200 bg-white px-3 py-2 grid grid-cols-3 gap-2">
        <button
          v-for="item in chatListDockItems"
          :key="item.id"
          @click="openChatDockFeature(item.id)"
          class="rounded-xl border border-gray-200 bg-gray-50 px-2 py-2 text-[11px] text-gray-700 flex items-center justify-center gap-1.5 hover:bg-gray-100"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="pt-12 pb-2 px-3 chat-thread-header backdrop-blur flex items-center justify-between z-10 shadow-sm">
        <button @click="leaveChat" class="chat-ink px-2 flex items-center gap-1 w-16">{{ t('返回', 'Back') }}</button>
        <div class="flex-1 text-center min-w-0">
          <p class="font-bold text-sm truncate">{{ activeChat.name }}</p>
          <p class="text-[10px] text-gray-500">
            <span v-if="contactKindTag(activeChat)">{{ contactKindTag(activeChat) }}</span>
            <span v-if="contactKindTag(activeChat) && headerSecondaryStatusText"> · </span>
            <span v-if="headerSecondaryStatusText" :class="headerSecondaryStatusClass">{{ headerSecondaryStatusText }}</span>
          </p>
        </div>
        <button @click="toggleThreadMenu" class="chat-ink px-2 w-16 text-right"><i class="fas fa-bars"></i></button>
      </div>

      <div v-if="showThreadMenu" class="mx-3 mt-2 rounded-2xl border border-gray-200 bg-white/90 backdrop-blur p-3 text-xs text-gray-600 space-y-3">
        <template v-if="isActiveServiceChat">
          <div class="space-y-2">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-sm text-gray-900">{{ t('服务模板摘要', 'Service template summary') }}</p>
                <p class="mt-1 text-[11px] text-gray-500">
                  {{
                    activeChat.serviceTemplate ||
                    t('当前服务号暂未设置模板。请到会话通讯录统一编辑。', 'No template is set yet. Edit it from Chat Directory.')
                  }}
                </p>
              </div>
              <button
                @click="openChatDirectory"
                class="shrink-0 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                {{ t('去管理', 'Manage') }}
              </button>
            </div>
            <p class="text-[10px] text-gray-400">
              {{ t('服务号模板只保留一个正式编辑入口：Chat Directory。此处仅展示当前会话正在使用的模板。', 'Service templates have one formal edit entry: Chat Directory. This menu only shows the active template.') }}
            </p>
          </div>
        </template>

        <div class="border-t border-gray-200 pt-3 space-y-2">
          <p class="font-semibold text-sm text-gray-900">{{ t('会话身份覆写', 'Thread identity overrides') }}</p>
          <label class="block space-y-1">
            <span class="text-[11px] text-gray-500">{{ t('我的头像（会话级）', 'My avatar (thread-level)') }}</span>
            <input
              v-model="threadIdentityDraft.selfAvatar"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
              placeholder="https://..."
            />
          </label>
          <label class="block space-y-1">
            <span class="text-[11px] text-gray-500">{{ t('对方头像（会话级）', 'Contact avatar (thread-level)') }}</span>
            <input
              v-model="threadIdentityDraft.contactAvatar"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none"
              placeholder="https://..."
            />
          </label>
          <p class="text-[10px] text-gray-400">
            {{ t('优先级：会话 > 模块 > 全局 > 默认。留空将回退到下一级。', 'Priority: thread > module > global > fallback. Leave blank to fall back.') }}
          </p>
          <div class="flex justify-end gap-2 pt-1">
            <button
              @click="threadIdentityDraft.selfAvatar = ''; threadIdentityDraft.contactAvatar = ''"
              class="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600"
            >
              {{ t('清空', 'Clear') }}
            </button>
            <button
              @click="saveThreadIdentityOverrides"
              class="px-2.5 py-1 rounded-lg border border-violet-200 bg-violet-50 text-violet-700"
            >
              {{ t('保存身份覆写', 'Save identity overrides') }}
            </button>
          </div>
        </div>

        <div class="border-t border-gray-200 pt-3 space-y-2">
          <p class="font-semibold text-sm text-gray-900">{{ t('当前会话调校', 'Current thread tuning') }}</p>

          <label class="flex items-center justify-between gap-3">
            <span>{{ t('回复模式', 'Reply Mode') }}</span>
            <select v-model="threadSettingsDraft.replyMode" class="rounded-lg border border-gray-200 px-2 py-1">
              <option v-for="item in REPLY_MODE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>

          <label class="flex items-center justify-between gap-3">
            <span>{{ t('每次触发回复条数', 'Replies per trigger') }}</span>
            <input v-model.number="threadSettingsDraft.replyCount" type="number" min="1" max="3" class="w-20 rounded-lg border border-gray-200 px-2 py-1 text-right" />
          </label>

          <label class="flex items-center justify-between gap-3">
            <span>{{ t('回复风格', 'Response style') }}</span>
            <select v-model="threadSettingsDraft.responseStyle" class="rounded-lg border border-gray-200 px-2 py-1">
              <option v-for="item in RESPONSE_STYLE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>

          <label class="flex items-center justify-between gap-3">
            <span>{{ t('可选回复建议', 'Suggested replies') }}</span>
            <input v-model="threadSettingsDraft.suggestedRepliesEnabled" type="checkbox" class="h-4 w-4" />
          </label>

          <label class="flex items-center justify-between gap-3">
            <span>{{ t('双语输出', 'Bilingual output') }}</span>
            <input v-model="threadSettingsDraft.bilingualEnabled" type="checkbox" class="h-4 w-4" />
          </label>

          <label class="flex items-center justify-between gap-3" v-if="threadSettingsDraft.bilingualEnabled">
            <span>{{ t('第二语言', 'Secondary language') }}</span>
            <input v-model="threadSettingsDraft.secondaryLanguage" type="text" class="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right" />
          </label>

          <label class="flex items-center justify-between gap-3">
            <span>{{ t('允许引用回复', 'Allow quote reply') }}</span>
            <input v-model="threadSettingsDraft.allowQuoteReply" type="checkbox" class="h-4 w-4" />
          </label>

          <label class="flex items-center justify-between gap-3">
            <span>{{ t('允许引用自己', 'Allow self quote') }}</span>
            <input v-model="threadSettingsDraft.allowSelfQuote" type="checkbox" class="h-4 w-4" :disabled="!threadSettingsDraft.allowQuoteReply" />
          </label>

          <label class="flex items-center justify-between gap-3">
            <span>{{ t('虚拟语音', 'Virtual voice') }}</span>
            <input v-model="threadSettingsDraft.virtualVoiceEnabled" type="checkbox" class="h-4 w-4" />
          </label>

          <label class="flex items-center justify-between gap-3">
            <span>{{ t('读取上文轮数', 'Context turns') }}</span>
            <input v-model.number="threadSettingsDraft.contextTurns" type="number" min="2" max="20" class="w-20 rounded-lg border border-gray-200 px-2 py-1 text-right" />
          </label>

          <label class="flex items-center justify-between gap-3">
            <span>{{ t('参考图模式', 'Image reference mode') }}</span>
            <select v-model="threadSettingsDraft.imageReferenceMode" class="rounded-lg border border-gray-200 px-2 py-1">
              <option v-for="item in IMAGE_REFERENCE_MODE_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label class="flex items-center justify-between gap-3">
            <span>{{ t('无参考图时允许图片消息', 'Allow image blocks without references') }}</span>
            <input v-model="threadSettingsDraft.allowImageVirtualWithoutReference" type="checkbox" class="h-4 w-4" />
          </label>
          <p class="text-[10px] text-gray-500">
            {{
              t(
                '自动模式会按供应商能力优先使用原生图输入，失败时自动回退为上下文线索。',
                'Auto mode prefers native image input when supported and falls back to context cues on unsupported responses.',
              )
            }}
          </p>
          <p
            class="text-[10px]"
            :class="roleImageReferenceAvailability.hasAny ? 'text-gray-500' : threadSettingsDraft.allowImageVirtualWithoutReference ? 'text-orange-500' : 'text-emerald-600'"
          >
            {{ threadImageBlockPolicyHint }}
          </p>
          <p class="text-[10px] text-gray-400">
            {{
              t(
                '本地素材会在大小允许时转为参考图输入；超出上限时会仅作为文字线索。',
                'Local assets are converted to reference images when size allows; oversized files degrade to text-only cues.',
              )
            }}
          </p>

          <label class="flex items-center justify-between gap-3">
            <span>{{ t('主动开场', 'Proactive opener') }}</span>
            <input v-model="threadSettingsDraft.proactiveOpenerEnabled" type="checkbox" class="h-4 w-4" />
          </label>

          <label class="flex items-center justify-between gap-3" v-if="threadSettingsDraft.proactiveOpenerEnabled">
            <span>{{ t('主动策略', 'Proactive strategy') }}</span>
            <select v-model="threadSettingsDraft.proactiveOpenerStrategy" class="rounded-lg border border-gray-200 px-2 py-1">
              <option v-for="item in PROACTIVE_STRATEGY_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>

          <div class="border-t border-gray-200 pt-2 space-y-2">
            <div class="flex items-center justify-between gap-3">
              <span>{{ t('定时自主调用', 'Timed autonomous invoke') }}</span>
              <input
                v-model="threadSettingsDraft.autoInvokeEnabled"
                type="checkbox"
                class="h-4 w-4"
                :disabled="!chatAutomationEnabled"
              />
            </div>
            <label class="flex items-center justify-between gap-3">
              <span>{{ t('自主调用间隔（秒）', 'Invoke interval (sec)') }}</span>
              <input
                v-model.number="threadSettingsDraft.autoInvokeIntervalSec"
                type="number"
                min="60"
                max="86400"
                class="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right"
                :disabled="!threadSettingsDraft.autoInvokeEnabled"
              />
            </label>
            <p v-if="!chatAutomationEnabled" class="text-[10px] text-orange-500">
              {{ t('全局或 Chat 模块自动响应未开启，请先到设置中开启。', 'Global or Chat automation is disabled. Enable it in Settings first.') }}
            </p>
            <p v-else class="text-[10px] text-gray-500">
              {{ autoScheduleHintText }}
            </p>
            <p
              v-if="chatAutomationEnabled && autoBackgroundReminderHint.text"
              class="text-[10px]"
              :class="
                autoBackgroundReminderHint.tone === 'success'
                  ? 'text-emerald-600'
                  : autoBackgroundReminderHint.tone === 'warning'
                    ? 'text-orange-500'
                    : 'text-gray-500'
              "
            >
              {{ autoBackgroundReminderHint.text }}
            </p>
            <p v-if="chatAutomationEnabled && autoLastTriggeredHintText" class="text-[10px] text-gray-500">
              {{ autoLastTriggeredHintText }}
            </p>
            <p v-if="chatAutomationEnabled && autoRestoreSettlementHintText" class="text-[10px] text-gray-500">
              {{ autoRestoreSettlementHintText }}
            </p>
            <p class="text-[10px] text-gray-400">
              {{ t('手动触发优先；若与自动触发接近重叠，自动调用会顺延到下一周期。', 'Manual trigger has priority. If it overlaps with auto invoke, autonomous call is deferred to next cycle.') }}
            </p>
          </div>

          <div class="flex justify-end gap-2 pt-1">
            <button @click="showThreadMenu = false" class="px-2.5 py-1 rounded-lg border border-gray-200">{{ t('取消', 'Cancel') }}</button>
            <button
              @click="saveThreadSettings"
              class="px-2.5 py-1 rounded-lg border"
              :class="threadSettingsSaved ? 'border-green-300 bg-green-50 text-green-700' : 'border-blue-300 bg-blue-50 text-blue-700'"
            >
              {{ threadSettingsSaved ? t('已保存', 'Saved') : t('保存本会话调校', 'Save this thread tuning') }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar" ref="chatContainer">
        <div v-for="msg in activeMessages" :key="msg.id" class="flex w-full" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
          <div v-if="msg.role !== 'user'" class="w-8 h-8 rounded-xl bg-gray-200 mr-2 overflow-hidden flex-shrink-0">
            <img :src="activeContactAvatar" class="w-full h-full object-cover" />
          </div>

          <div class="max-w-[70%]">
            <div
              class="px-3 py-2 text-sm rounded-xl shadow-sm relative"
              :class="msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'"
              @contextmenu.prevent="openMessageActions(msg.id)"
              @mousedown.left="startMessageLongPress(msg.id, $event)"
              @mouseup="cancelMessageLongPress"
              @mouseleave="cancelMessageLongPress"
              @touchstart="startMessageLongPress(msg.id, $event)"
              @touchmove.passive="cancelMessageLongPress"
              @touchend="cancelMessageLongPress"
              @touchcancel="cancelMessageLongPress"
            >
              <div v-if="msg.quote" class="mb-2 rounded-lg border border-white/40 bg-black/5 px-2 py-1 text-[11px] leading-4">
                <p class="font-semibold opacity-80">{{ msg.quote.role === 'assistant' ? t('引用 AI', 'Quoted assistant') : t('引用用户', 'Quoted user') }}</p>
                <p class="line-clamp-2">{{ msg.quote.preview }}</p>
              </div>

              <div v-for="(block, blockIndex) in messageBlocks(msg)" :key="`${msg.id}-block-${blockIndex}`" class="mt-1 first:mt-0">
                <div
                  v-if="block.type === 'text'"
                  :class="
                    block.variant === 'secondary'
                      ? 'rounded-lg border border-black/10 bg-white/45 px-2.5 py-2'
                      : ''
                  "
                >
                  <p
                    v-if="block.variant === 'secondary'"
                    class="mb-1 text-[10px] uppercase tracking-wide text-gray-500"
                  >
                    {{ secondaryTextBadge(block) }}
                  </p>
                  <div
                    class="markdown-body"
                    :class="
                      block.variant === 'secondary'
                        ? 'text-[12px] opacity-90 leading-relaxed break-words'
                        : 'leading-relaxed break-words'
                    "
                    v-html="renderMarkdown(block.text)"
                  ></div>
                </div>

                <div v-else-if="block.type === 'voice_virtual'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2 flex items-center gap-2">
                  <span class="w-6 h-6 rounded-full bg-black/10 inline-flex items-center justify-center"><i class="fas fa-play text-[10px]"></i></span>
                  <div class="min-w-0 flex-1">
                    <p class="text-[12px] font-semibold truncate">{{ block.label }}</p>
                    <p class="text-[11px] opacity-80 line-clamp-2" v-if="block.transcript">{{ block.transcript }}</p>
                  </div>
                  <span class="text-[10px] opacity-70">{{ formatVoiceDuration(block.durationSec) }}</span>
                </div>

                <div v-else-if="block.type === 'module_link'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
                  <p class="text-[12px] font-semibold">{{ block.label }}</p>
                  <p class="text-[11px] opacity-75" v-if="block.note">{{ block.note }}</p>
                  <button @click="openModuleRoute(block.route)" class="mt-2 px-2 py-1 rounded-md border border-black/15 text-[11px]">
                    {{ t('打开', 'Open') }} {{ block.route }}
                  </button>
                </div>

                <div v-else-if="block.type === 'link_external'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
                  <p class="text-[12px] font-semibold">{{ block.label }}</p>
                  <p class="text-[11px] opacity-75 break-all">{{ block.url }}</p>
                  <p class="text-[11px] opacity-75" v-if="block.note">{{ block.note }}</p>
                  <button @click="openExternalUrl(block.url)" class="mt-2 px-2 py-1 rounded-md border border-black/15 text-[11px]">
                    {{ t('打开链接', 'Open link') }}
                  </button>
                </div>

                <div v-else-if="block.type === 'transfer_virtual'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
                  <p class="text-[12px] font-semibold">{{ block.label }}</p>
                  <p class="text-base font-bold">{{ block.amount }} {{ block.currency }}</p>
                  <p class="text-[11px] opacity-75" v-if="block.to">{{ t('收款方', 'To') }}: {{ block.to }}</p>
                  <p class="text-[11px] opacity-75" v-if="block.note">{{ t('备注', 'Note') }}: {{ block.note }}</p>
                  <button @click="openModuleRoute(block.actionRoute)" class="mt-2 px-2 py-1 rounded-md border border-black/15 text-[11px]">{{ transferActionLabel(block) }}</button>
                </div>

                <div v-else-if="block.type === 'image_virtual'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
                  <div class="w-full h-24 rounded-md bg-black/5 overflow-hidden mb-1.5">
                    <img
                      v-if="resolveImageBlockUrl(msg.id, blockIndex, block)"
                      :src="resolveImageBlockUrl(msg.id, blockIndex, block)"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center text-[11px] opacity-70">{{ t('图片预览', 'Image preview') }}</div>
                  </div>
                  <p class="text-[12px] font-semibold">{{ block.alt }}</p>
                  <p class="text-[11px] opacity-75" v-if="block.caption">{{ block.caption }}</p>
                </div>

                <div v-else-if="block.type === 'mini_scene'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
                  <p class="text-[12px] font-semibold">{{ block.title }}</p>
                  <p class="text-[11px] opacity-75" v-if="block.description">{{ block.description }}</p>
                  <pre v-if="block.htmlSnippet" class="mt-1 rounded-md bg-black/5 p-2 text-[10px] whitespace-pre-wrap break-all">{{ block.htmlSnippet }}</pre>
                </div>
              </div>
            </div>

            <p v-if="messageMetaHintText(msg)" class="text-[10px] mt-1" :class="msg.role === 'user' ? 'text-right text-gray-400' : 'text-left text-gray-400'">
              {{ messageMetaHintText(msg) }}
            </p>
            <p v-if="messageStatusText(msg)" class="text-[10px] mt-1" :class="msg.role === 'user' ? (msg.status === 'failed' ? 'text-right text-red-500' : 'text-right text-gray-400') : (msg.status === 'failed' ? 'text-left text-red-500' : 'text-left text-gray-400')">
              {{ messageStatusText(msg) }}
            </p>
          </div>

          <div v-if="msg.role === 'user'" class="w-8 h-8 rounded-xl bg-gray-200 ml-2 overflow-hidden flex-shrink-0">
            <img :src="activeSelfAvatar" class="w-full h-full object-cover" />
          </div>
        </div>

        <div v-if="suggestionFeatureEnabled && showSuggestions && suggestions.length > 0" class="flex flex-wrap gap-2 justify-end mb-2">
          <div
            v-for="(sugg, idx) in suggestions"
            :key="idx"
            @click="useSuggestion(sugg)"
            class="chat-suggestion backdrop-blur-sm text-xs px-3 py-1.5 rounded-full shadow-sm border cursor-pointer hover:bg-white"
          >
            ✨ {{ sugg }}
          </div>
        </div>
      </div>

      <div class="p-3 chat-input flex items-center gap-2 border-t relative">
        <div
          v-if="pendingQuote"
          class="absolute -top-24 left-3 right-3 text-[11px] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 flex items-start justify-between gap-2"
        >
          <div class="min-w-0">
            <p class="font-semibold text-gray-700">
              {{ pendingQuote.role === 'assistant' ? t('引用 AI', 'Quoted assistant') : t('引用用户', 'Quoted user') }}
            </p>
            <p class="line-clamp-2 text-gray-600">{{ pendingQuote.preview }}</p>
          </div>
          <button @click="clearPendingQuote" class="shrink-0 px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">
            {{ t('取消', 'Cancel') }}
          </button>
        </div>

        <div
          v-if="aiErrorMessage"
          class="absolute -top-14 left-3 right-3 text-[11px] rounded-lg border border-red-200 bg-red-50 text-red-700 px-2.5 py-1.5 flex items-center justify-between gap-2"
        >
          <span class="line-clamp-1">{{ aiErrorMessage }}</span>
          <div class="shrink-0 flex items-center gap-1">
            <button v-if="canRetryAi" @click="retryLastMessage" class="px-2 py-1 rounded border border-red-300 hover:bg-red-100">{{ t('重试', 'Retry') }}</button>
            <button v-if="canCancelAi" @click="cancelActiveRequest" class="px-2 py-1 rounded border border-red-300 hover:bg-red-100">{{ t('取消', 'Cancel') }}</button>
          </div>
        </div>

        <div
          v-else-if="uiNoticeMessage"
          class="absolute -top-10 left-3 right-3 text-[11px] rounded-lg border px-2.5 py-1.5 line-clamp-1"
          :class="
            uiNoticeType === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : uiNoticeType === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          "
        >
          {{ uiNoticeMessage }}
        </div>

        <div
          v-if="showUserActionPanel"
          class="absolute bottom-[56px] left-3 right-3 rounded-xl border border-gray-200 bg-white/95 p-2 shadow-lg backdrop-blur-sm"
        >
          <div v-if="userActionFormType === USER_ACTION_FORM_NONE" class="grid grid-cols-3 gap-2">
            <button
              @click="triggerUserMediaPicker(USER_MEDIA_KIND_IMAGE)"
              class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-left hover:bg-gray-50"
            >
              {{ t('图片', 'Image') }}
            </button>
            <button
              @click="triggerUserMediaPicker(USER_MEDIA_KIND_GIF)"
              class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-left hover:bg-gray-50"
            >
              GIF
            </button>
            <button
              @click="openUserActionForm(USER_ACTION_FORM_GALLERY)"
              :disabled="!gallerySendState.enabled"
              class="rounded-lg border px-2 py-1.5 text-[11px] text-left transition disabled:cursor-not-allowed disabled:opacity-70"
              :class="gallerySendState.enabled ? 'border-gray-200 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-500'"
            >
              {{ t('素材库', 'Asset library') }}
            </button>
            <button
              @click="openUserActionForm(USER_ACTION_FORM_LINK)"
              class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-left hover:bg-gray-50"
            >
              {{ t('链接', 'Link') }}
            </button>
            <button
              @click="sendCurrentLocation"
              :disabled="!locationShareState.enabled"
              class="rounded-lg border px-2 py-1.5 text-[11px] text-left transition disabled:cursor-not-allowed disabled:opacity-70"
              :class="locationShareState.enabled ? 'border-gray-200 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-500'"
            >
              {{ t('位置', 'Location') }}
            </button>
            <button
              @click="openUserActionForm(USER_ACTION_FORM_TRANSFER)"
              class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-left hover:bg-gray-50"
            >
              {{ t('转账', 'Transfer') }}
            </button>
            <button
              @click="openUserActionForm(USER_ACTION_FORM_VOICE)"
              class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-left hover:bg-gray-50"
            >
              {{ t('语音卡片', 'Voice card') }}
            </button>
          </div>
          <p
            v-if="userActionFormType === USER_ACTION_FORM_NONE"
            class="mt-2 text-[10px]"
            :class="gallerySendState.enabled && locationShareState.enabled ? 'text-gray-500' : 'text-amber-600'"
          >
            {{ userActionGridHint }}
          </p>

          <div v-else-if="userActionFormType === USER_ACTION_FORM_LINK" class="space-y-2">
            <p class="text-[11px] font-medium text-gray-700">{{ t('发送链接', 'Send link') }}</p>
            <input
              v-model="userActionDraft.linkUrl"
              @keydown.enter.prevent="submitLinkCardForm"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none"
              :placeholder="t('链接地址（http/https）', 'URL (http/https)')"
            />
            <input
              v-model="userActionDraft.linkTitle"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none"
              :placeholder="t('链接标题（可选）', 'Link title (optional)')"
            />
            <input
              v-model="userActionDraft.linkNote"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none"
              :placeholder="t('附加说明（可选）', 'Note (optional)')"
            />
            <p
              class="text-[10px]"
              :class="linkFormState.valid ? 'text-gray-500' : 'text-amber-600'"
            >
              {{ linkFormState.message }}
            </p>
            <div class="flex items-center justify-end gap-2">
              <button
                @click="backToUserActionGrid"
                class="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
              >
                {{ t('返回', 'Back') }}
              </button>
              <button
                @click="submitLinkCardForm"
                :disabled="!linkFormState.valid"
                class="rounded-lg border px-2 py-1 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-50"
                :class="linkFormState.valid ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-gray-100 text-gray-500'"
              >
                {{ t('发送链接', 'Send link') }}
              </button>
            </div>
          </div>

          <div v-else-if="userActionFormType === USER_ACTION_FORM_TRANSFER" class="space-y-2">
            <p class="text-[11px] font-medium text-gray-700">{{ t('发送转账卡片', 'Send transfer card') }}</p>
            <div class="grid grid-cols-3 gap-2">
              <input
                v-model="userActionDraft.transferAmount"
                @keydown.enter.prevent="submitTransferCardForm"
                type="text"
                inputmode="decimal"
                class="col-span-2 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none"
                :placeholder="t('金额，如 88.00', 'Amount, e.g. 88.00')"
              />
              <input
                v-model="userActionDraft.transferCurrency"
                type="text"
                class="rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] uppercase outline-none"
                :placeholder="t('币种', 'Currency')"
              />
            </div>
            <input
              v-model="userActionDraft.transferNote"
              type="text"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none"
              :placeholder="t('转账备注（可选）', 'Transfer note (optional)')"
            />
            <p
              class="text-[10px]"
              :class="transferFormState.valid ? 'text-gray-500' : 'text-amber-600'"
            >
              {{ transferFormState.message }}
            </p>
            <div class="flex items-center justify-end gap-2">
              <button
                @click="backToUserActionGrid"
                class="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
              >
                {{ t('返回', 'Back') }}
              </button>
              <button
                @click="submitTransferCardForm"
                :disabled="!transferFormState.valid"
                class="rounded-lg border px-2 py-1 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-50"
                :class="transferFormState.valid ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-gray-100 text-gray-500'"
              >
                {{ t('发送转账', 'Send transfer') }}
              </button>
            </div>
          </div>

          <div v-else-if="userActionFormType === USER_ACTION_FORM_VOICE" class="space-y-2">
            <p class="text-[11px] font-medium text-gray-700">{{ t('发送语音卡片', 'Send voice card') }}</p>
            <textarea
              v-model="userActionDraft.voiceTranscript"
              rows="2"
              class="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] outline-none resize-none"
              :placeholder="t('输入语音内容', 'Enter voice transcript')"
            ></textarea>
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-gray-600">{{ t('时长（秒）', 'Duration (sec)') }}</span>
              <input
                v-model.number="userActionDraft.voiceDurationSec"
                type="number"
                min="1"
                max="600"
                class="w-20 rounded-lg border border-gray-200 px-2 py-1 text-[11px] outline-none"
              />
            </div>
            <p
              class="text-[10px]"
              :class="voiceFormState.valid ? 'text-gray-500' : 'text-amber-600'"
            >
              {{ voiceFormState.message }}
            </p>
            <div class="flex items-center justify-end gap-2">
              <button
                @click="backToUserActionGrid"
                class="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
              >
                {{ t('返回', 'Back') }}
              </button>
              <button
                @click="submitVoiceCardForm"
                :disabled="!voiceFormState.valid"
                class="rounded-lg border px-2 py-1 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-50"
                :class="voiceFormState.valid ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-gray-100 text-gray-500'"
              >
                {{ t('发送语音卡片', 'Send voice card') }}
              </button>
            </div>
          </div>

          <div v-else-if="userActionFormType === USER_ACTION_FORM_GALLERY" class="space-y-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[11px] font-medium text-gray-700">{{ t('从素材库发送', 'Send from asset library') }}</p>
              <select
                v-model="galleryPickerCategory"
                class="rounded-lg border border-gray-200 px-1.5 py-1 text-[11px] bg-white"
              >
                <option
                  v-for="option in galleryPickerCategoryOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
            <p
              v-if="activeRoleAssetContext.profileId"
              class="text-[10px] text-gray-500"
            >
              {{
                activeRoleAssetContext.preferredImageAssetId
                  ? t(
                      `会话优先素材已启用（来源：${activeRoleAssetContext.profileName || t('角色档案', 'Profile')}）。`,
                      `Thread preferred asset is enabled (source: ${activeRoleAssetContext.profileName || t('Profile', 'Profile')}).`,
                    )
                  : activeRoleAssetContext.profileFolderAssetIds.length > 0
                    ? t(
                        `当前会话正在读取角色档案素材包与文件夹绑定（来源：${activeRoleAssetContext.profileName || t('角色档案', 'Profile')}）。`,
                        `This chat is using profile pack + folder bindings (source: ${activeRoleAssetContext.profileName || t('Profile', 'Profile')}).`,
                      )
                  : t(
                      `当前会话正在读取角色档案素材包（来源：${activeRoleAssetContext.profileName || t('角色档案', 'Profile')}）。`,
                      `This chat is using profile-bound asset pack (source: ${activeRoleAssetContext.profileName || t('Profile', 'Profile')}).`,
                    )
              }}
            </p>

            <div
              v-if="galleryPickerAssets.length === 0"
              class="rounded-lg border border-dashed border-gray-200 px-2 py-3 text-[11px] text-gray-500 text-center"
            >
              {{ t('该分类暂无素材，请先在相册导入。', 'No assets in this category. Import in Gallery first.') }}
            </div>

            <div v-else class="max-h-48 overflow-y-auto pr-0.5 grid grid-cols-2 gap-2">
              <button
                v-for="asset in galleryPickerAssets"
                :key="asset.id"
                @click="submitGalleryAsset(asset)"
                class="rounded-lg border border-gray-200 p-1.5 text-left hover:bg-gray-50 transition"
              >
                <div class="w-full h-14 rounded-md bg-gray-100 overflow-hidden">
                  <img
                    v-if="galleryPickerPreviewMap[asset.id]"
                    :src="galleryPickerPreviewMap[asset.id]"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full flex items-center justify-center text-[10px] text-gray-400"
                  >
                    {{ t('加载中', 'Loading') }}
                  </div>
                </div>
                <p class="mt-1 text-[10px] font-medium text-gray-700 line-clamp-1">{{ asset.name }}</p>
                <p
                  v-if="activeRoleAssetContext.preferredImageAssetId && asset.id === activeRoleAssetContext.preferredImageAssetId"
                  class="mt-0.5 text-[10px] text-blue-600"
                >
                  {{ t('会话优先', 'Thread preferred') }}
                </p>
                <p
                  v-else-if="activeRoleAssetContext.profileFolderAssetIds.includes(asset.id)"
                  class="mt-0.5 text-[10px] text-amber-600"
                >
                  {{ t('文件夹绑定', 'Folder bound') }}
                </p>
                <p
                  v-else-if="activeRoleAssetContext.profileAssetIds.includes(asset.id)"
                  class="mt-0.5 text-[10px] text-emerald-600"
                >
                  {{ t('角色素材包', 'Profile pack') }}
                </p>
              </button>
            </div>

            <div class="flex items-center justify-end gap-2">
              <button
                @click="backToUserActionGrid"
                class="rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
              >
                {{ t('返回', 'Back') }}
              </button>
              <button
                @click="openModuleRoute('/gallery')"
                class="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] text-blue-700 hover:bg-blue-100"
              >
                {{ t('打开相册', 'Open Gallery') }}
              </button>
            </div>
          </div>

          <div class="mt-2 flex items-center justify-between gap-2">
            <button
              v-if="suggestionFeatureEnabled && userActionFormType === USER_ACTION_FORM_NONE"
              @click="generateSmartReplies"
              class="rounded-lg border border-emerald-200 px-2 py-1 text-[11px] text-emerald-700 hover:bg-emerald-50"
              :disabled="loadingSuggestions || loadingAI"
            >
              <span v-if="loadingSuggestions">{{ t('生成中...', 'Generating...') }}</span>
              <span v-else>{{ t('生成建议回复', 'Generate suggested replies') }}</span>
            </button>
            <button
              @click="closeUserActionPanel"
              class="ml-auto rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 hover:bg-gray-50"
            >
              {{ t('收起', 'Collapse') }}
            </button>
          </div>
        </div>

        <input
          ref="userMediaInputRef"
          type="file"
          class="hidden"
          accept="image/*"
          @change="handleUserMediaPicked"
        />

        <button
          @click="toggleUserActionPanel"
          class="w-8 h-8 rounded-full flex items-center justify-center transition border"
          :class="showUserActionPanel ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600'"
        >
          <i class="fas fa-plus text-xs"></i>
        </button>

        <input
          v-model="inputMessage"
          @keyup.enter="sendTextMessage"
          type="text"
          class="flex-1 chat-input-field rounded-full px-4 py-2 text-sm outline-none"
          :placeholder="t('发送一条消息...', 'Send a message...')"
        />

        <button
          @click="requestPendingAiReply"
          class="h-8 px-3 rounded-full text-xs border transition"
          :class="canRequestAiReply ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-100 text-gray-400'"
          :disabled="!canRequestAiReply"
        >
          {{ t('触发回复', 'Trigger Reply') }}
        </button>

        <button @click="sendTextMessage" class="w-8 h-8 chat-send rounded-full flex items-center justify-center">
          <i class="fas fa-paper-plane text-xs"></i>
        </button>
      </div>

      <div
        v-if="hasActiveMessageActions && activeActionMessage"
        class="fixed inset-0 z-40 flex items-end"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/25"
          @click="closeMessageActions"
        ></button>

        <div class="relative w-full rounded-t-2xl bg-white px-4 pb-4 pt-3 shadow-xl">
          <div class="mx-auto mb-3 h-1.5 w-11 rounded-full bg-gray-300"></div>
          <p class="mb-3 text-xs text-gray-500">
            {{ t('消息操作', 'Message actions') }}
          </p>

          <div class="space-y-2">
            <button
              class="w-full rounded-xl border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50"
              @click="quoteMessage(activeActionMessage)"
            >
              {{ t('引用', 'Quote') }}
            </button>
            <button
              class="w-full rounded-xl border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50"
              @click="copyMessage(activeActionMessage)"
            >
              {{ t('复制', 'Copy') }}
            </button>
            <button
              v-if="canEditMessage(activeActionMessage)"
              class="w-full rounded-xl border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50"
              @click="editMessage(activeActionMessage)"
            >
              {{ t('编辑', 'Edit') }}
            </button>
            <button
              v-if="canRestoreSemanticRevision(activeActionMessage)"
              class="w-full rounded-xl border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50"
              @click="restoreSemanticRevision(activeActionMessage)"
            >
              {{ t('恢复原文', 'Restore original') }}
            </button>
            <button
              v-if="canRerollMessage(activeActionMessage)"
              class="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-100"
              @click="rerollMessage(activeActionMessage)"
            >
              {{ t('重roll', 'Reroll') }}
            </button>
            <button
              class="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-100"
              @click="deleteMessage(activeActionMessage)"
            >
              {{ t('删除', 'Delete') }}
            </button>
          </div>

          <button
            class="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            @click="closeMessageActions"
          >
            {{ t('取消', 'Cancel') }}
          </button>
        </div>
      </div>

      <div
        v-if="showEditMessageModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 pb-4 sm:pb-0"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/35"
          @click="closeMessageEditModal"
        ></button>

        <div class="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-2xl">
          <p class="text-sm font-semibold text-gray-900">
            {{
              editingMessageRole === 'assistant'
                ? t('修订 AI 消息', 'Revise AI message')
                : t('编辑用户消息', 'Edit user message')
            }}
          </p>
          <p class="mt-1 text-[11px] text-gray-500">
            {{
              editingMessageRole === 'assistant'
                ? t('修订内容会进入后续上下文，避免对话断层。', 'Revised text will be used for following context.')
                : t('将直接更新当前消息文本。', 'This will update the current message text directly.')
            }}
          </p>

          <textarea
            v-model="editingMessageDraftText"
            rows="5"
            class="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none resize-none"
            :placeholder="t('输入修订后的消息文本', 'Enter revised message text')"
          ></textarea>

          <p
            class="mt-2 text-[11px]"
            :class="messageEditState.valid ? 'text-gray-500' : 'text-amber-600'"
          >
            {{ messageEditState.message }}
          </p>

          <div class="mt-3 flex items-center justify-end gap-2">
            <button
              class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              @click="closeMessageEditModal"
            >
              {{ t('取消', 'Cancel') }}
            </button>
            <button
              class="rounded-lg border px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50"
              :class="messageEditState.valid ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-gray-200 bg-gray-100 text-gray-500'"
              :disabled="!messageEditState.valid"
              @click="submitMessageEdit"
            >
              {{ t('保存', 'Save') }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
