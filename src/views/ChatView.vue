<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { useSystemStore } from '../stores/system'
import { CHAT_CONTACT_SOCIAL_STATES, useChatStore } from '../stores/chat'
import { useBookStore } from '../stores/book'
import { useMapStore } from '../stores/map'
import { useGalleryStore } from '../stores/gallery'
import { useWalletStore } from '../stores/wallet'
import { useShoppingStore } from '../stores/shopping'
import { useCalendarStore } from '../stores/calendar'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'
import { useSimulationStore } from '../stores/simulation'
import {
  FOOD_DELIVERY_ORDER_EVENT_TYPE,
  FOOD_DELIVERY_ORDER_STATUS,
  useFoodDeliveryStore,
} from '../stores/foodDelivery'
import { callAI, formatApiErrorForUi, getAiProviderCapabilities } from '../lib/ai'
import { stripCodeFence } from '../lib/chat-response'
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
import { buildWorldBookRouteQuery } from '../lib/worldbook-navigation'
import { resolveWorldContextForConsumer } from '../lib/world-interface'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  SHAREABLE_OBJECT_TYPES,
  createProductLinkShareObject,
  createVirtualGiftShareObject,
  shareableObjectToChatBlock,
} from '../lib/shareable-object'
import { getAvatarImageGalleryAssetId } from '../lib/avatar-image-source-resolver'
import { useI18n } from '../composables/useI18n'
import { useDialog } from '../composables/useDialog'
import {
  DEFAULT_CHAT_THREAD_AI_PREFS,
  useChatActiveThreadModel,
} from '../composables/useChatActiveThreadModel'
import { useChatAiImageReferenceModel } from '../composables/useChatAiImageReferenceModel'
import { useChatAiPromptContextModel } from '../composables/useChatAiPromptContextModel'
import { useChatAiRequestStateModel } from '../composables/useChatAiRequestStateModel'
import {
  CHAT_ASSISTANT_RESPONSE_LIMITS,
  useChatAssistantResponseModel,
} from '../composables/useChatAssistantResponseModel'
import { useChatAutomationStatusModel } from '../composables/useChatAutomationStatusModel'
import { useChatHomeListModel } from '../composables/useChatHomeListModel'
import {
  CHAT_MESSAGE_ACTION_IDS,
  useChatMessageActionSheetModel,
} from '../composables/useChatMessageActionSheetModel'
import {
  CHAT_MESSAGE_EDITABLE_RICH_TYPES,
  useChatMessageEditDisplayModel,
} from '../composables/useChatMessageEditDisplayModel'
import { useChatPendingQuoteModel } from '../composables/useChatPendingQuoteModel'
import { useChatServiceFeedbackModel } from '../composables/useChatServiceFeedbackModel'
import { useChatServiceThreadDisplayModel } from '../composables/useChatServiceThreadDisplayModel'
import { useChatThreadMenuModel } from '../composables/useChatThreadMenuModel'
import {
  CHAT_USER_MEDIA_KINDS,
  useChatUserActionPanelModel,
} from '../composables/useChatUserActionPanelModel'
import { useSystemApiReports } from '../composables/useSystemApiReports'
import { useSystemNotifications } from '../composables/useSystemNotifications'
import ChatMessageEditModal from '../components/chat/ChatMessageEditModal.vue'
import ChatThreadMenuPanel from '../components/chat/ChatThreadMenuPanel.vue'
import ChatUserActionPanel from '../components/chat/ChatUserActionPanel.vue'
import ChatAppTabBar from '../components/chat/ChatAppTabBar.vue'
import ChatMessageRow from '../components/chat/ChatMessageRow.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const bookStore = useBookStore()
const mapStore = useMapStore()
const galleryStore = useGalleryStore()
const walletStore = useWalletStore()
const shoppingStore = useShoppingStore()
const calendarStore = useCalendarStore()
const foodDeliveryStore = useFoodDeliveryStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const simulationStore = useSimulationStore()
const { systemLanguage, languageBase, t } = useI18n()
const { confirmDialog } = useDialog()
const systemApiReports = useSystemApiReports({ systemStore })
const systemNotifications = useSystemNotifications({ systemStore })

const { settings, user } = storeToRefs(systemStore)
const { contactsForList, loadingAI } = storeToRefs(chatStore)
const { currentLocationText } = storeToRefs(mapStore)
const { primaryCurrency, currencyOptions } = storeToRefs(walletStore)

const DEFAULT_THREAD_AI_PREFS = DEFAULT_CHAT_THREAD_AI_PREFS

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

const MAX_ASSISTANT_TEXT_CHARS = CHAT_ASSISTANT_RESPONSE_LIMITS.maxTextChars
const SEMANTIC_REVISION_TRACE_MODE = normalizeSemanticRevisionTraceMode(
  import.meta?.env?.VITE_SEMANTIC_REVISION_TRACE_MODE,
  SEMANTIC_REVISION_TRACE_MODES.SILENT,
)

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
  '/reminders',
  '/wallet',
  '/stock',
  '/shopping',
  '/food-delivery',
  '/files',
  '/app-store',
])

const MANUAL_TRIGGER_ID = '__manual__'
const CHAT_AUTOMATION_MODULE_KEY = 'chat'
const MIN_AUTO_INVOKE_INTERVAL_SEC = 60
const MAX_AUTO_INVOKE_INTERVAL_SEC = 86400
const MANUAL_PRIORITY_GUARD_MS = 1500
const MAX_RESTORE_NOTIFICATIONS_PER_CONTACT = 3
const SAVE_FEEDBACK_DURATION_MS = 1200
const MESSAGE_LONG_PRESS_MS = 380
const SERVICE_DIRECTORY_FILTERS = new Set(['all', 'unread', 'muted', 'folded', 'service', 'official'])
const inputMessage = ref('')
const chatContainer = ref(null)
const messageTextInputRef = ref(null)
const userMediaInputRef = ref(null)
const loadingSuggestions = ref(false)
const suggestions = ref([])
const showSuggestions = ref(false)
const showEditMessageModal = ref(false)
const editingMessageId = ref('')
const editingMessageRole = ref('user')
const editingMessageOriginalText = ref('')
const editingMessageDraftText = ref('')
const editingMessageRichType = ref('')
const editingMessageOriginalRichFields = ref({})
const editingMessageRichFields = reactive({
  label: '',
  url: '',
  note: '',
  transcript: '',
  durationSec: '',
  amount: '',
  currency: '',
  alt: '',
  caption: '',
})
const { messageEditRichFieldDefinitions, messageEditState } = useChatMessageEditDisplayModel({
  editingMessageRichType,
  editingMessageRichFields,
  editingMessageOriginalRichFields,
  editingMessageDraftText,
  editingMessageOriginalText,
  editingMessageRole,
  maxAssistantTextChars: MAX_ASSISTANT_TEXT_CHARS,
  t,
})
const lastManualActionAt = ref(0)
const uiNoticeType = ref('')
const uiNoticeMessage = ref('')
let autoInvokeTimerId = null
let uiNoticeTimerId = null
let messageLongPressTimerId = null
let messageLongPressTargetId = ''

const messageImagePreviewMap = reactive({})
const messageImagePreviewAssetIdMap = reactive({})
const avatarPreviewMap = reactive({})
const CHAT_ASSET_PREVIEW_SCOPE_ID = 'chat-view'

const {
  showThreadMenu,
  threadSettingsSaved,
  threadIdentitySaved,
  threadSettingsDraft,
  threadIdentityDraft,
  syncThreadSettingsDraft,
  syncThreadIdentityDraft,
  closeThreadMenu,
  toggleThreadMenu: toggleThreadMenuModel,
  clearThreadIdentityDraft,
  updateThreadIdentityDraft,
  updateThreadSettingsDraft,
  createThreadIdentityPayload,
  createThreadSettingsPayload,
  triggerThreadSettingsSaved,
  triggerThreadIdentitySaved,
  resetThreadMenuSavedFeedback,
  disposeThreadMenuModel,
} = useChatThreadMenuModel({
  defaultThreadAiPrefs: DEFAULT_THREAD_AI_PREFS,
  replyModeOptions: REPLY_MODE_OPTIONS,
  responseStyleOptions: RESPONSE_STYLE_OPTIONS,
  proactiveStrategyOptions: PROACTIVE_STRATEGY_OPTIONS,
  imageReferenceModeOptions: IMAGE_REFERENCE_MODE_OPTIONS,
  minAutoInvokeIntervalSec: MIN_AUTO_INVOKE_INTERVAL_SEC,
  maxAutoInvokeIntervalSec: MAX_AUTO_INVOKE_INTERVAL_SEC,
  saveFeedbackDurationMs: SAVE_FEEDBACK_DURATION_MS,
})

const {
  activeChatId,
  activeChat,
  activeConversation,
  activeAiPrefs,
  activeMessages,
  activeChatSocialState,
  canActiveChatCommunicate,
  activeChatMessageLayout,
  chatShellClasses,
  isActiveServiceChat,
  activeServiceIsMuted,
  activeServiceIsFolded,
  resolveContactDisplayAvatar,
  activeContactAvatar,
  activeModuleNickname,
  activeSelfAvatar,
} = useChatActiveThreadModel({
  route,
  chatStore,
  contactsForList,
  settings,
  user,
  galleryStore,
  avatarPreviewMap,
  t,
  defaultThreadAiPrefs: DEFAULT_THREAD_AI_PREFS,
})

const {
  chatSearchOpen,
  chatSearchKeyword,
  normalizedChatSearchKeyword,
  chatMessageRequestContacts,
  chatFoldedSubscriptionContacts,
  chatFoldedSubscriptionUnreadTotal,
  chatFoldedSubscriptionUnreadContactCount,
  showFoldedSubscriptionsCard,
  visibleChatContacts,
  chatHomeHeroTitle,
  chatHomeHeroDetail,
  getConversationPreview,
  toggleChatSearch,
} = useChatHomeListModel({
  contactsForList,
  chatStore,
  t,
})

const activeMessageSenderName = () => activeChat.value?.name || t('对方', 'Contact')

const {
  serviceRouteFeedback,
  serviceNotificationActionFeedback,
  clearServiceRouteFeedback,
  clearServiceNotificationActionFeedback,
  syncServiceFeedbackForChat,
  recordServiceNotificationReplyFeedback,
  recordServiceNotificationSentFeedback,
  recordServiceThreadReadFeedback,
  recordServiceRouteFeedback,
} = useChatServiceFeedbackModel({
  activeChat,
  isActiveServiceChat,
  chatStore,
  t,
})

const {
  shoppingServiceLabel,
  activeShoppingServiceKey,
  activeLogisticsServiceKey,
  activeFoodDeliveryServiceKey,
  activeServiceStatusTags,
  activeServiceHeaderStatus,
  activeServiceTemplateText,
  activeServiceChannelPreview,
  showActiveServiceEmptyState,
  activeServiceEmptyStateTitle,
  activeServiceEmptyStateDetail,
  activeServiceRouteFeedback,
  activeServiceRouteFeedbackDetail,
  activeServiceNotificationActionFeedback,
  activeServiceInteractionDock,
  activeServiceInteractionDockClasses,
  activeServiceSourceChips,
  activeServiceSourceNotificationPlan,
  activeServiceSourceScheduleRows,
  serviceSourceScheduleRowScheduleLabel,
  activeServiceSourceScheduleSummary,
  activeServiceInboxPlacement,
  activeServiceThreadPromises,
} = useChatServiceThreadDisplayModel({
  chatStore,
  activeChat,
  activeConversation,
  activeMessages,
  isActiveServiceChat,
  activeServiceIsMuted,
  activeServiceIsFolded,
  canActiveChatCommunicate,
  serviceRouteFeedback,
  serviceNotificationActionFeedback,
  t,
})

const messageInputPlaceholder = computed(() => {
  if (!canActiveChatCommunicate.value) return t('当前状态只能查看历史', 'History only in this state')
  if (isActiveServiceChat.value) {
    const name = activeChat.value?.name || t('服务号', 'Service')
    return t(`回复 ${name}...`, `Reply to ${name}...`)
  }
  return t('发送一条消息...', 'Send a message...')
})

const triggerReplyButtonLabel = computed(() =>
  isActiveServiceChat.value ? t('服务号回复', 'Service Reply') : t('触发回复', 'Trigger Reply'),
)

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

const formatShoppingPreviewPrice = (product) =>
  `${(Number(product?.priceCents || 0) / 100).toFixed(2)} ${product?.currency || 'CNY'}`

const formatShoppingOrderAmount = (order = {}) =>
  `${(Number(order?.totalCents || 0) / 100).toFixed(2)} ${order?.currency || 'CNY'}`

const VIRTUAL_GIFT_SHARE_TYPES = new Set([
  SHAREABLE_OBJECT_TYPES.GIFT_CARD,
  SHAREABLE_OBJECT_TYPES.VIRTUAL_GIFT,
])

const normalizeShoppingShareType = (value, rawProduct = {}) => {
  if (VIRTUAL_GIFT_SHARE_TYPES.has(value)) return value
  if (value === SHAREABLE_OBJECT_TYPES.PRODUCT_LINK) return value

  const productText = [
    rawProduct.id,
    rawProduct.productId,
    rawProduct.title,
    rawProduct.category,
    rawProduct.desc,
  ]
    .filter((item) => typeof item === 'string')
    .join(' ')
    .toLowerCase()

  const looksLikeGiftCard =
    productText.includes('gift card') ||
    productText.includes('gift-card') ||
    productText.includes('voucher') ||
    productText.includes('coupon') ||
    productText.includes('redeem') ||
    productText.includes('redemption') ||
    productText.includes('membership') ||
    productText.includes('礼品卡') ||
    productText.includes('兑换券') ||
    productText.includes('兑换码') ||
    productText.includes('虚拟礼物')

  return looksLikeGiftCard ? SHAREABLE_OBJECT_TYPES.VIRTUAL_GIFT : SHAREABLE_OBJECT_TYPES.PRODUCT_LINK
}

const isVirtualGiftShareType = (shareType) => VIRTUAL_GIFT_SHARE_TYPES.has(shareType)

const shoppingShareLabel = (shareType) =>
  isVirtualGiftShareType(shareType) ? t('虚拟礼物', 'Virtual gift') : t('商品链接', 'Product link')

const normalizeShoppingCardPayload = (rawProduct = {}) => {
  const productId = typeof rawProduct.productId === 'string' ? rawProduct.productId.trim() : typeof rawProduct.id === 'string' ? rawProduct.id.trim() : ''
  const title = typeof rawProduct.title === 'string' ? rawProduct.title.trim() : ''
  if (!productId || !title) return null
  const category = typeof rawProduct.category === 'string' ? rawProduct.category.trim() : ''
  const serviceKey = typeof rawProduct.serviceKey === 'string' ? rawProduct.serviceKey.trim() : ''
  const serviceLabel = typeof rawProduct.serviceLabel === 'string' && rawProduct.serviceLabel.trim()
    ? rawProduct.serviceLabel.trim()
    : shoppingServiceLabel(serviceKey)
  const currency = typeof rawProduct.currency === 'string' && rawProduct.currency.trim()
    ? rawProduct.currency.trim().toUpperCase()
    : 'CNY'
  const price = typeof rawProduct.price === 'string' && rawProduct.price.trim()
    ? rawProduct.price.trim()
    : formatShoppingPreviewPrice(rawProduct)
  const shareType = normalizeShoppingShareType(rawProduct.shareType, rawProduct)
  return {
    id: productId,
    productId,
    title,
    category,
    desc: typeof rawProduct.desc === 'string' ? rawProduct.desc.trim() : '',
    serviceKey,
    serviceLabel,
    price,
    currency,
    assetEligible: rawProduct.assetEligible === true,
    shareType,
    shareLabel: shoppingShareLabel(shareType),
    giftable: isVirtualGiftShareType(shareType),
  }
}

const shoppingPreviewProducts = computed(() =>
  (activeShoppingServiceKey.value
    ? shoppingStore.listProductsByService(activeShoppingServiceKey.value)
    : shoppingStore.products)
    .filter((product) => product?.stockStatus !== 'sold_out')
    .slice(0, 3)
    .map((product) => normalizeShoppingCardPayload(product))
    .filter(Boolean),
)

const activeGiftOrderSummaries = computed(() => {
  const chatId = Number(activeChat.value?.id)
  if (!Number.isFinite(chatId) || chatId <= 0) return []

  return shoppingStore.orders
    .filter((order) => {
      const giftRecipient = order?.giftRecipient || {}
      return Number(giftRecipient.chatId || giftRecipient.contactId || 0) === chatId
    })
    .slice(0, 3)
    .map((order) => ({
      id: order.id,
      title: order.items?.[0]?.title || t('礼物订单', 'Gift order'),
      itemCount: Number(order.itemCount || order.items?.length || 0),
      amount: `${(Number(order.totalCents || 0) / 100).toFixed(2)} ${order.currency || 'CNY'}`,
      recipientName: order.giftRecipient?.name || activeChat.value?.name || '',
      status: order.status || '',
    }))
})

const logisticsStatusLabel = (status) => {
  if (status === 'confirmed') return t('已确认提醒', 'Reminder confirmed')
  if (status === 'completed') return t('已完成', 'Completed')
  if (status === 'cancelled') return t('已取消', 'Cancelled')
  return t('待跟进', 'Pending follow-up')
}

const foodDeliveryStatusLabel = (status) => {
  if (status === FOOD_DELIVERY_ORDER_STATUS.ACCEPTED) return t('已接单', 'Accepted')
  if (status === FOOD_DELIVERY_ORDER_STATUS.COOKING) return t('备餐中', 'Cooking')
  if (status === FOOD_DELIVERY_ORDER_STATUS.RIDER_PICKUP) return t('骑手取餐', 'Rider pickup')
  if (status === FOOD_DELIVERY_ORDER_STATUS.DELIVERED) return t('已送达', 'Delivered')
  if (status === FOOD_DELIVERY_ORDER_STATUS.CANCELLED) return t('已取消', 'Cancelled')
  return t('待接单', 'Pending acceptance')
}

const foodDeliveryEventTypeLabel = (type) => {
  if (type === FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY) return t('骑手延迟', 'Rider delay')
  if (type === FOOD_DELIVERY_ORDER_EVENT_TYPE.RESTAURANT_CANCELLED) return t('商家取消', 'Restaurant cancelled')
  if (type === FOOD_DELIVERY_ORDER_EVENT_TYPE.ADDRESS_CHANGE) return t('地址变更', 'Address changed')
  if (type === FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE) return t('ETA 更新', 'ETA update')
  return t('状态更新', 'Status update')
}

const shoppingLogisticsEventTypeLabel = (type) => {
  if (type === 'package_shipped') return t('已发货', 'Package shipped')
  if (type === 'package_arrived') return t('已到达', 'Package arrived')
  if (type === 'pickup_point_changed') return t('取件点变更', 'Pickup changed')
  if (type === 'international_delay') return t('国际物流延迟', 'International delay')
  return t('物流更新', 'Logistics update')
}

const formatLogisticsCueDate = (timestamp) => {
  const date = new Date(Number(timestamp || 0))
  if (Number.isNaN(date.getTime())) return t('时间待定', 'Time TBD')
  const locale = languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const activeShoppingServiceLogisticsRows = computed(() => {
  if (!activeLogisticsServiceKey.value) return []

  return calendarStore.activeShoppingDeliveryCues
    .map((cue) => {
      const order = shoppingStore.orders.find((item) => item.id === cue.orderId)
      if (!order) return null
      return {
        cue,
        order,
        id: order.id,
        title: cue.title || order.items?.[0]?.title || t('物流订单', 'Logistics order'),
        amount: formatShoppingOrderAmount(order),
        itemCount: Number(order.itemCount || order.items?.length || 0),
        status: cue.status || order.status || '',
        statusLabel: logisticsStatusLabel(cue.status || order.status || ''),
        suggestedAt: formatLogisticsCueDate(cue.suggestedAt || order.createdAt),
        summary: cue.summary || t('该订单已有配送跟进线索。', 'This order has a delivery follow-up cue.'),
        latestEvent: Array.isArray(order.events) && order.events[0]
          ? {
              ...order.events[0],
              typeLabel: shoppingLogisticsEventTypeLabel(order.events[0].type),
              createdAtLabel: formatLogisticsCueDate(order.events[0].createdAt),
            }
          : null,
      }
    })
    .filter(Boolean)
    .slice(0, 3)
})

const activeFoodDeliveryOrderRows = computed(() => {
  if (!activeFoodDeliveryServiceKey.value) return []

  return foodDeliveryStore.orders
    .slice(0, 3)
    .map((order) => {
      const deliveryAddress = typeof order.deliveryAddress === 'string' ? order.deliveryAddress.trim() : ''
      const primaryItem = order.items?.[0]
      const latestEvent = Array.isArray(order.events) ? order.events[0] : null
      return {
        order,
        id: order.id,
        restaurantName: order.restaurantName || t('外卖订单', 'Food delivery order'),
        title: primaryItem?.title || t('外卖订单', 'Food delivery order'),
        itemCount: Number(order.itemCount || order.items?.length || 0),
        amount: `${(Number(order.totalCents || 0) / 100).toFixed(2)} ${order.currency || 'CNY'}`,
        status: order.status || '',
        statusLabel: foodDeliveryStatusLabel(order.status || ''),
        updatedAt: formatLogisticsCueDate(order.updatedAt || order.createdAt),
        latestEvent: latestEvent
          ? {
              ...latestEvent,
              typeLabel: foodDeliveryEventTypeLabel(latestEvent.type),
              timeLabel: formatLogisticsCueDate(latestEvent.createdAt),
              detail:
                latestEvent.summary ||
                (latestEvent.deliveryAddress
                  ? t(
                      `配送地址更新为 ${latestEvent.deliveryAddress}`,
                      `Delivery address changed to ${latestEvent.deliveryAddress}`,
                    )
                  : latestEvent.etaMinutes !== null && latestEvent.etaMinutes !== undefined
                    ? t(`预计 ${latestEvent.etaMinutes} 分钟送达`, `ETA ${latestEvent.etaMinutes} min`)
                    : t('外卖履约状态有新变化。', 'Food delivery status changed.')),
            }
          : null,
        summary: deliveryAddress
          ? t(`送往 ${deliveryAddress}`, `Delivering to ${deliveryAddress}`)
          : t('外卖订单状态由 Food Delivery 持有，Chat 只显示服务号推送。', 'Food Delivery owns this order status; Chat only shows service-account pushes.'),
      }
    })
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

const {
  aiErrorMessage,
  retryTriggerMessageId,
  retryRerollMessageId,
  hasActiveRequest,
  canCancelAi,
  canRetryAi,
  canRequestAiReply,
  isAiRequestBusy,
  beginAiRequest,
  finishAiRequest,
  clearAiError,
  clearAiErrorAndRetryTargets,
  completeAiRequestSuccess,
  recordReplyFailure,
  recordRerollFailure,
  prepareRerollRequest,
  clearRetryTargetForMessage,
  clearAiRequestStateForThreadSwitch,
  cancelActiveAiRequest,
} = useChatAiRequestStateModel({
  activeChat,
  canActiveChatCommunicate,
  loadingAI,
})
const suggestionFeatureEnabled = computed(() => Boolean(activeAiPrefs.value.suggestedRepliesEnabled))
const getChatAutomationRuntimePolicy = (baseAt = Date.now()) =>
  systemStore.getAiAutomationRuntimePolicy(CHAT_AUTOMATION_MODULE_KEY, baseAt)

const {
  automationSettings,
  chatAutomationEnabled,
  autoScheduleHintText,
  autoBackgroundReminderHint,
  autoLastTriggeredHintText,
  autoRestoreSettlementHintText,
} = useChatAutomationStatusModel({
  activeChat,
  activeAiPrefs,
  activeConversation,
  settings,
  systemNotifications,
  systemLanguage,
  languageBase,
  isChatAutomationEnabled: () =>
    systemStore.isAiAutomationEnabledForModule(CHAT_AUTOMATION_MODULE_KEY),
  getChatAutomationRuntimePolicy,
  t,
})

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

let closeMessageActionsFromSheet = () => {}

const {
  showUserActionPanel,
  pendingUserMediaKind,
  userActionFormType,
  userActionDraft,
  galleryPickerCategory,
  galleryPickerCategoryOptions,
  galleryPickerAssets,
  galleryPickerPreviewMap,
  gallerySendState,
  locationShareState,
  userActionGridHint,
  linkFormState,
  transferFormState,
  voiceFormState,
  normalizeExternalUrl,
  backToUserActionGrid,
  closeUserActionPanel,
  toggleUserActionPanel,
  openUserActionForm,
  updateUserActionDraft,
  setGalleryPickerCategory,
  clearGalleryPickerPreviewMap,
} = useChatUserActionPanelModel({
  galleryStore,
  activeChat,
  activeRoleAssetContext,
  currentLocationText,
  primaryCurrency,
  canActiveChatCommunicate,
  resolveFolderAssetsByCategory: (category) => {
    const chatId = Number(activeChat.value?.id)
    if (!Number.isFinite(chatId) || chatId <= 0) {
      return {
        assetIds: [],
        sourceByAssetId: {},
      }
    }
    const contract = chatStore.getRoleBindingContract(chatId, {
      moduleKey: 'chat',
    })
    return resolveRoleFolderAssetsByCategory(contract, category)
  },
  closeMessageActions: () => closeMessageActionsFromSheet(),
  showUiNotice,
  previewScopeId: CHAT_ASSET_PREVIEW_SCOPE_ID,
  t,
})

const {
  activeActionMessage,
  hasActiveMessageActions,
  messageActionRows,
  openMessageActions,
  closeMessageActions,
  canCopyMessage,
  canQuoteMessage,
  canEditMessage,
  canRerollMessage,
  canToggleSavedMessage,
  canRecallMessage,
  canRestoreSemanticRevision,
  messageActionButtonClass,
} = useChatMessageActionSheetModel({
  activeMessages,
  isActiveServiceChat,
  editableRichMessageTypes: CHAT_MESSAGE_EDITABLE_RICH_TYPES,
  closeUserActionPanel,
  t,
})

closeMessageActionsFromSheet = closeMessageActions

let clearServiceNotificationActionFeedbackFromQuote = () => {}
let getMessagePrimaryTextForQuote = (message) => message?.content || ''

const {
  pendingQuote,
  pendingQuoteLabel,
  quoteMessage: setPendingQuoteMessage,
  quoteServiceNotification: setPendingServiceNotificationQuote,
  clearPendingQuote,
  clearPendingQuoteSilently,
  clearPendingQuoteForMessage,
  clearInvalidPendingQuote,
  buildPendingQuotePayload,
} = useChatPendingQuoteModel({
  activeMessages,
  canActiveChatCommunicate,
  canQuoteMessage,
  messagePrimaryText: (message) => getMessagePrimaryTextForQuote(message),
  onServiceQuoteCleared: () => clearServiceNotificationActionFeedbackFromQuote(),
  t,
})

clearServiceNotificationActionFeedbackFromQuote = clearServiceNotificationActionFeedback

const dismissActiveServiceInteractionDock = () => {
  if (activeServiceInteractionDock.value?.type === 'source') {
    clearServiceRouteFeedback()
    return
  }
  clearServiceNotificationActionFeedback()
}

const openActiveServiceInteractionDockPrimary = () => {
  if (activeServiceInteractionDock.value?.type === 'source') {
    reopenServiceRouteFeedbackSource()
  }
}

const clampAutoInvokeInterval = (value) => {
  const seconds = Number(value)
  if (!Number.isFinite(seconds)) return DEFAULT_THREAD_AI_PREFS.autoInvokeIntervalSec
  return Math.min(MAX_AUTO_INVOKE_INTERVAL_SEC, Math.max(MIN_AUTO_INVOKE_INTERVAL_SEC, Math.floor(seconds)))
}

const normalizeProactiveStrategy = (value) =>
  PROACTIVE_STRATEGY_OPTIONS.value.some((item) => item.value === value)
    ? value
    : DEFAULT_THREAD_AI_PREFS.proactiveOpenerStrategy

const normalizeImageReferenceMode = (value) =>
  IMAGE_REFERENCE_MODE_OPTIONS.value.some((item) => item.value === value)
    ? value
    : DEFAULT_THREAD_AI_PREFS.imageReferenceMode

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

const normalizeServiceDirectoryFilter = (value) =>
  SERVICE_DIRECTORY_FILTERS.has(value) ? value : 'all'

const activeServiceDirectoryFilter = computed(() =>
  normalizeServiceDirectoryFilter(
    typeof route.query.serviceFilter === 'string'
      ? route.query.serviceFilter
      : activeServiceIsFolded.value
        ? 'folded'
        : 'all',
  ),
)

const buildActiveServiceDirectoryQuery = (extra = {}) => {
  const filter = activeServiceDirectoryFilter.value
  const query = {
    section: 'service',
    selectedService: String(activeChat.value?.id || ''),
    ...extra,
  }
  if (filter && filter !== 'all') query.filter = filter
  Object.keys(query).forEach((key) => {
    if (query[key] === undefined || query[key] === null || query[key] === '') delete query[key]
  })
  return query
}

const goHome = () => pushReturnTarget(router, route, '/home')
const leaveChat = () => {
  closeMessageEditModal()
  if (isActiveServiceChat.value && route.query.chatReturn === 'services') {
    router.push({
      path: '/chat-contacts',
      query: buildActiveServiceDirectoryQuery({ serviceReturn: 'thread' }),
    })
    return
  }
  router.push('/chat')
}

const openChatObjects = () => {
  router.push({ path: '/chat-contacts', query: { section: 'roles' } })
}

const openMessageRequests = () => {
  router.push({ path: '/chat-contacts', query: { section: 'roles', filter: 'requests' } })
}

const openFoldedSubscriptions = () => {
  router.push({ path: '/chat-contacts', query: { section: 'service', filter: 'folded' } })
}

const openChatGroups = () => {
  router.push('/chat-groups')
}

const openChatSettings = () => {
  router.push('/chat-settings')
}

const contactById = (contactId) =>
  contactsForList.value.find((item) => item.id === Number(contactId)) || null

const enterChat = (contact) => {
  chatStore.ensureConversationForContact(contact.id)
  router.push(`/chat/${contact.id}`)
}

const applyThreadSettingsDraft = () => {
  syncThreadSettingsDraft(activeAiPrefs.value)
}

const applyDefaultThreadPresetToDraft = () => {
  syncThreadSettingsDraft(chatStore.getDefaultConversationAiPrefs())
  showUiNotice('success', t('已套用默认回复预设，保存后生效。', 'Default reply preset applied. Save to keep it.'))
}

const applyThreadIdentityDraft = () => {
  if (!activeChat.value) {
    syncThreadIdentityDraft(null)
    return
  }

  syncThreadIdentityDraft(chatStore.getConversationIdentityOverrides(activeChat.value.id))
}

const contactAvatarForList = (contact) => resolveContactDisplayAvatar(contact)

const isRecalledMessage = (message) => Boolean(Number(message?.recalledAt || 0) > 0)

const recalledMessageDisplayText = (message) => {
  if (message?.role === 'user') return t('你撤回了一条消息', 'You recalled a message')
  const senderName = activeMessageSenderName()
  return t(`${senderName} 撤回了一条消息`, `${senderName} recalled a message`)
}

const hasRichMessageBlocks = (blocks = []) =>
  Array.isArray(blocks) && blocks.some((block) => block?.type && block.type !== 'text')

const messageBlockPreviewText = (block = {}) => {
  if (!block || typeof block !== 'object') return ''
  if (block.type === 'voice_virtual') {
    const text = block.transcript || block.label || ''
    return text ? `${t('语音', 'Voice')} · ${text}` : t('语音消息', 'Voice message')
  }
  if (block.type === 'module_link') return `${t('链接', 'Link')} · ${block.label || block.route || ''}`.trim()
  if (block.type === 'link_external') return `${t('外部链接', 'External link')} · ${block.label || block.url || ''}`.trim()
  if (block.type === 'transfer_virtual') {
    return `${t('转账', 'Transfer')} · ${block.amount || ''} ${block.currency || ''}`.trim()
  }
  if (block.type === 'product_card') return `${t('商品', 'Product')} · ${block.title || ''}`.trim()
  if (block.type === 'share_card') return `${shoppingShareLabel(block.shareType)} · ${block.title || ''}`.trim()
  if (block.type === 'service_notification') {
    return [block.title, block.summary].filter(Boolean).join(' · ')
  }
  if (block.type === 'image_virtual') {
    const text = block.caption || block.alt || ''
    return text ? `${t('图片', 'Image')} · ${text}` : t('图片消息', 'Image message')
  }
  if (block.type === 'mini_scene') return `${t('互动卡片', 'Interactive card')} · ${block.title || ''}`.trim()
  return ''
}

const messageBlocksPreviewText = (blocks = []) => {
  if (!Array.isArray(blocks)) return ''
  const firstRichBlock = blocks.find((block) => block?.type && block.type !== 'text')
  return messageBlockPreviewText(firstRichBlock)
}

const messagePrimaryText = (message) => {
  if (!message) return ''
  if (isRecalledMessage(message)) return recalledMessageDisplayText(message)
  const revisedText =
    typeof message?.semanticRevision?.revisedText === 'string'
      ? message.semanticRevision.revisedText.trim()
      : ''
  if (revisedText) return revisedText
  if (Array.isArray(message.blocks)) {
    const serviceNotificationBlock = message.blocks.find((block) => block?.type === 'service_notification')
    if (serviceNotificationBlock) {
      const preview = [serviceNotificationBlock.title, serviceNotificationBlock.summary]
        .filter(Boolean)
        .join(' · ')
      if (preview) return preview
    }
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
    const richPreview = messageBlocksPreviewText(message.blocks)
    if (richPreview) return richPreview
  }
  if (typeof message.content === 'string' && message.content.trim()) return message.content.trim()
  return extractMessageTextForContext(message)
}

getMessagePrimaryTextForQuote = messagePrimaryText

const {
  buildSystemPrompt,
  clampReplyCount,
  extractMessageTextForContext,
  getAutomationBaseFingerprint,
  getContextSourceMessages,
  getSmartReplyHistory,
  resolveAssistantImageBlockPolicy,
  toAiCallMessages,
  toQuoteCandidates,
} = useChatAiPromptContextModel({
  chatStore,
  systemStore,
  bookStore,
  relationshipRuntimeStore,
  user,
  responseStyleOptions: RESPONSE_STYLE_OPTIONS,
  defaultThreadAiPrefs: DEFAULT_THREAD_AI_PREFS,
  getMessagePrimaryText: messagePrimaryText,
  getActiveMessageSenderName: activeMessageSenderName,
})

const { buildAssistantImageReferenceMeta, collectImageReferencesForAiCall } =
  useChatAiImageReferenceModel({
    chatStore,
    galleryStore,
    t,
  })

const { normalizeAssistantMessagePayload, parseAssistantResponse } =
  useChatAssistantResponseModel({
    clampReplyCount,
    safeModuleRoutes: Array.from(SAFE_MODULE_ROUTES),
  })

const truncateMessagePreview = (text, maxLength = 72) => {
  const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
}

const serviceNotificationBlockForMessage = (message = {}) =>
  Array.isArray(message?.blocks)
    ? message.blocks.find((block) => block?.type === 'service_notification') || null
    : null

const isServiceNotificationMessage = (message = {}) => Boolean(serviceNotificationBlockForMessage(message))

const messageDayKey = (message = {}) => {
  const date = new Date(Number(message?.createdAt) || 0)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const formatThreadDateDividerLabel = (timestamp) => {
  const date = new Date(Number(timestamp) || 0)
  if (Number.isNaN(date.getTime())) return t('时间待定', 'Time TBD')

  const now = new Date()
  const isSameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate()
  if (isSameDay) return t('今天', 'Today')

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    yesterday.getFullYear() === date.getFullYear() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getDate() === date.getDate()
  if (isYesterday) return t('昨天', 'Yesterday')

  const locale = languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  })
}

const serviceNotificationBatchSummary = (messages = []) => {
  const count = messages.length
  const previews = messages
    .map((message) => truncateMessagePreview(messagePrimaryText(message), 40))
    .filter(Boolean)
  return {
    count,
    title: t(`${count} 条连续订阅更新`, `${count} consecutive updates`),
    detail: previews.slice(0, 2).join(' · '),
  }
}

const serviceNotificationFlowKey = (message = {}) => {
  const block = serviceNotificationBlockForMessage(message)
  const kind = typeof block?.kind === 'string' ? block.kind : ''
  const sourceModule = typeof block?.sourceModule === 'string' ? block.sourceModule : ''
  const serviceKey = block?.serviceKey || block?.serviceLabel || ''
  let channelType = 'service'
  if (kind.startsWith('food_delivery') || sourceModule.includes('food_delivery')) channelType = 'food'
  if (kind === 'logistics_update' || sourceModule.includes('logistics')) channelType = 'logistics'
  if (kind === 'shopping_order' || sourceModule.includes('shopping')) channelType = 'shopping'
  return `${channelType}:${sourceModule}:${serviceKey}`
}

const activeThreadTimelineItems = computed(() => {
  const messages = activeMessages.value
  if (!isActiveServiceChat.value) {
    return messages.map((message) => ({
      type: 'message',
      key: `message-${message.id}`,
      message,
    }))
  }

  const items = []
  let lastDayKey = ''

  messages.forEach((message, index) => {
    const dayKey = messageDayKey(message)
    if (dayKey !== lastDayKey) {
      items.push({
        type: 'date-divider',
        key: `date-${dayKey}-${message.id}`,
        label: formatThreadDateDividerLabel(message.createdAt),
        dayKey,
      })
      lastDayKey = dayKey
    }

    const isNotification = isServiceNotificationMessage(message)
    const previous = messages[index - 1]
    const flowKey = isNotification ? serviceNotificationFlowKey(message) : ''
    const previousFlowKey = previous && isServiceNotificationMessage(previous) ? serviceNotificationFlowKey(previous) : ''
    const isRunStart =
      isNotification &&
      (!previous ||
        !isServiceNotificationMessage(previous) ||
        messageDayKey(previous) !== dayKey ||
        previousFlowKey !== flowKey)

    if (isRunStart) {
      const run = []
      for (let cursor = index; cursor < messages.length; cursor += 1) {
        const candidate = messages[cursor]
        if (
          !isServiceNotificationMessage(candidate) ||
          messageDayKey(candidate) !== dayKey ||
          serviceNotificationFlowKey(candidate) !== flowKey
        ) {
          break
        }
        run.push(candidate)
      }
      if (run.length >= 2) {
        items.push({
          type: 'service-notification-batch-summary',
          key: `service-notification-batch-${message.id}`,
          ...serviceNotificationBatchSummary(run),
        })
      }
    }

    items.push({
      type: 'message',
      key: `message-${message.id}`,
      message,
      serviceNotificationDensity:
        isNotification && previous && messageDayKey(previous) === dayKey && previousFlowKey === flowKey
          ? 'compact'
          : 'full',
    })
  })

  return items
})

const activeThreadWorldKernelState = computed(() => {
  return resolveWorldContextForConsumer({
    systemStore,
    chatStore,
    bookStore,
    contact: activeChat.value,
    consumer: 'chat',
  })
})

const openWorldBookFromThreadContext = (pointId = '') => {
  const directPointId = typeof pointId === 'string' ? pointId.trim() : ''
  const injectedPointIds = activeThreadWorldKernelState.value.injectedPoints.map((point) => point.id)
  router.push({
    path: '/worldbook',
    query: buildWorldBookRouteQuery({
      source: 'chat',
      homePage: route.query.homePage,
      pointIds: directPointId ? [directPointId] : injectedPointIds,
      usage: directPointId || injectedPointIds.length > 0 ? 'all' : 'chat_ready',
    }),
  })
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

const resetConversationAutoNextAt = (contactId, baseAt = Date.now()) => {
  if (!chatStore.canContactSendMessages(contactById(contactId))) {
    chatStore.setConversationAutoState(contactId, { autoNextAt: 0 })
    return 0
  }
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
  if (isAiRequestBusy.value) {
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

  if (isAiRequestBusy.value) {
    resetConversationAutoNextAt(contactId, now + getAutomationCooldownMs())
    return false
  }

  const fingerprint =
    typeof options.fingerprint === 'string' && options.fingerprint.trim()
      ? options.fingerprint.trim()
      : getAutomationBaseFingerprint(contactId)
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

  if (isAiRequestBusy.value) {
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
    systemApiReports.addReport({
      level: 'info',
      module: 'chat',
      action: 'auto_notify_only',
      provider: settings.value.api.resolvedKind || '',
      model: settings.value.api.model || '',
      message: notifyOnlyHintByPolicy(runtimePolicy),
    })
    return false
  }

  const fingerprint = getAutomationBaseFingerprint(contactId)
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
  systemNotifications.addNotification({
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

      systemNotifications.addNotification({
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

const submitAssistantSocialEvents = ({
  contactId,
  socialEvents = [],
  assistantMessages = [],
  triggerMessageId = '',
} = {}) => {
  if (!Array.isArray(socialEvents) || socialEvents.length === 0) return []
  const firstAssistantMessage = assistantMessages.find((message) => message?.id) || null
  const sourceMessageId = firstAssistantMessage?.id || ''
  const sourceTriggerId =
    triggerMessageId && triggerMessageId !== MANUAL_TRIGGER_ID ? triggerMessageId : ''

  return socialEvents
    .map((event) =>
      simulationStore.submitChatSocialEventProposal(
        {
          contactId,
          eventType: event.eventType,
          explanation: event.explanation,
          triggerSource: 'ai_assisted',
          source: {
            moduleKey: 'chat',
            conversationId: contactId,
            messageId: sourceMessageId,
            runtimeLogId: sourceTriggerId,
          },
        },
        { chatStore, at: Date.now() },
      ),
    )
    .filter(Boolean)
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
    messages: toAiCallMessages(contextSourceMessages),
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
  const appendedMessages = []

  parsedMessages.forEach((item) => {
    const appended = chatStore.appendMessage(contactId, {
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
    appendedMessages.push(appended)
  })
  const submittedSocialEvents = submitAssistantSocialEvents({
    contactId,
    socialEvents: parsed.socialEvents,
    assistantMessages: appendedMessages,
    triggerMessageId,
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
    socialEventCount: submittedSocialEvents.length,
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
    messages: toAiCallMessages(contextSourceMessages),
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
  if (isAiRequestBusy.value) return false
  const truthContact = contactById(contactId)
  if (!chatStore.canContactSendMessages(truthContact)) {
    if (options.source !== 'auto') {
      showUiNotice('warning', t('当前通讯状态不允许继续发起回复。', 'Current communication state does not allow replies.'))
    }
    chatStore.setConversationAutoState(contactId, { autoNextAt: 0 })
    return false
  }

  const triggerSource = typeof options.source === 'string' ? options.source : 'manual'
  const isAutoSource = triggerSource === 'auto'
  const shouldAutoSchedule = options.autoSchedule !== false
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
  const controller = beginAiRequest(normalizedTriggerId)
  if (!controller) return false

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
      systemNotifications.addNotification({
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
    completeAiRequestSuccess()
    return true
  } catch (error) {
    const message =
      error?.code === 'CANCELED'
        ? formatApiErrorForUi(error, t('请求已取消。', 'Request canceled.'))
        : formatApiErrorForUi(error, t('AI 回复失败，请稍后重试。', 'AI reply failed. Please retry later.'))
    recordReplyFailure(message, normalizedTriggerId)
    if (!isAutoSource) {
      resetConversationAutoNextAt(contactId, Date.now() + getAutomationCooldownMs())
    }
    systemApiReports.addReport({
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
    finishAiRequest()
    scrollToBottom()
    if (shouldAutoSchedule) {
      scheduleAutoInvokeTick()
    }
  }
}

const cancelActiveRequest = () => {
  if (!hasActiveRequest.value) return
  systemApiReports.addReport({
    level: 'info',
    module: 'chat',
    action: 'cancel_reply',
    provider: settings.value.api.resolvedKind || '',
    model: settings.value.api.model || '',
    message: t('用户主动取消当前请求。', 'User canceled the in-flight request.'),
  })
  cancelActiveAiRequest()
}

const retryLastMessage = () => {
  if (!canRetryAi.value || !activeChat.value) return
  clearAiError()
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
  if (!canRequestAiReply.value) return
  const triggerMessageId = pendingReplyTriggerMessageId.value || MANUAL_TRIGGER_ID
  const aiPrefs = chatStore.getConversationAiPrefs(activeChat.value.id)
  requestAiReply(activeChat.value.id, triggerMessageId, {
    replyCount: aiPrefs.replyCount,
  })
}

const clearMessageLongPressTimer = () => {
  if (!messageLongPressTimerId) return
  clearTimeout(messageLongPressTimerId)
  messageLongPressTimerId = null
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

const copyableMessageText = (message) => {
  if (!message || isRecalledMessage(message)) return ''
  if (hasRichMessageBlocks(message.blocks)) return extractMessageTextForContext(message)
  return messagePrimaryText(message) || extractMessageTextForContext(message)
}

const copyMessage = async (message) => {
  if (!canCopyMessage(message)) return
  const text = copyableMessageText(message)
  const ok = await copyText(text)
  if (!ok) {
    showUiNotice('error', t('复制失败，请稍后重试。', 'Copy failed. Please retry.'))
  } else {
    showUiNotice('success', t('已复制消息。', 'Message copied.'))
  }
  closeMessageActions()
}

const resetEditingRichFields = () => {
  Object.keys(editingMessageRichFields).forEach((key) => {
    editingMessageRichFields[key] = ''
  })
}

const getEditableRichMessageBlockEntry = (message) => {
  if (!message || isRecalledMessage(message)) return null
  if (!Array.isArray(message.blocks)) return null
  const index = message.blocks.findIndex((block) => CHAT_MESSAGE_EDITABLE_RICH_TYPES.has(block?.type))
  if (index < 0) return null
  return {
    index,
    block: message.blocks[index],
  }
}

const createRichEditFieldsFromBlock = (block = {}) => {
  if (block.type === 'link_external') {
    return {
      label: block.label || '',
      url: block.url || '',
      note: block.note || '',
    }
  }
  if (block.type === 'module_link') {
    return {
      label: block.label || '',
      note: block.note || '',
    }
  }
  if (block.type === 'transfer_virtual') {
    return {
      amount: block.amount || '',
      currency: block.currency || '',
      note: block.note || '',
    }
  }
  if (block.type === 'voice_virtual') {
    return {
      transcript: block.transcript || '',
      durationSec: String(block.durationSec || 8),
    }
  }
  if (block.type === 'image_virtual') {
    return {
      alt: block.alt || '',
      caption: block.caption || '',
    }
  }
  return {}
}

const applyRichEditFields = (fields = {}) => {
  resetEditingRichFields()
  Object.entries(fields).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(editingMessageRichFields, key)) {
      editingMessageRichFields[key] = typeof value === 'string' ? value : String(value ?? '')
    }
  })
}

const updateEditingMessageRichField = ({ key, value } = {}) => {
  if (!Object.prototype.hasOwnProperty.call(editingMessageRichFields, key)) return
  editingMessageRichFields[key] = typeof value === 'string' ? value : String(value ?? '')
}

const toggleSavedMessage = (message) => {
  if (!activeChat.value || !canToggleSavedMessage(message)) return
  const nextSaved = !message.savedAt
  const changed = chatStore.setMessageSaved(activeChat.value.id, message.id, nextSaved)
  if (!changed) {
    closeMessageActions()
    return
  }
  showUiNotice(
    'success',
    nextSaved ? t('已收藏消息。', 'Message saved.') : t('已取消收藏。', 'Message unsaved.'),
  )
  closeMessageActions()
}

const quoteMessage = (message) => {
  if (!setPendingQuoteMessage(message)) return
  closeMessageActions()
}

const focusMessageInput = () => {
  nextTick(() => {
    messageTextInputRef.value?.focus?.()
  })
}

const quoteServiceNotification = ({ block, message } = {}) => {
  const quote = setPendingServiceNotificationQuote({ block, message })
  if (!quote) return
  recordServiceNotificationReplyFeedback(block)
  closeMessageActions()
  focusMessageInput()
  scrollToBottom()
}

watch(activeMessages, clearInvalidPendingQuote, { deep: true })

const closeMessageEditModal = () => {
  showEditMessageModal.value = false
  editingMessageId.value = ''
  editingMessageRole.value = 'user'
  editingMessageOriginalText.value = ''
  editingMessageDraftText.value = ''
  editingMessageRichType.value = ''
  editingMessageOriginalRichFields.value = {}
  resetEditingRichFields()
}

const editMessage = (message) => {
  if (!activeChat.value || !canEditMessage(message)) return

  editingMessageId.value = message.id || ''
  editingMessageRole.value = message.role === 'assistant' ? 'assistant' : 'user'
  const richEntry = getEditableRichMessageBlockEntry(message)
  if (richEntry) {
    const fields = createRichEditFieldsFromBlock(richEntry.block)
    editingMessageRichType.value = richEntry.block.type
    editingMessageOriginalText.value = ''
    editingMessageDraftText.value = ''
    editingMessageOriginalRichFields.value = { ...fields }
    applyRichEditFields(fields)
  } else {
    const currentText = messagePrimaryText(message)
    editingMessageRichType.value = ''
    editingMessageOriginalRichFields.value = {}
    resetEditingRichFields()
    editingMessageOriginalText.value = currentText
    editingMessageDraftText.value = currentText
  }
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
  let ok = false
  if (editingMessageRichType.value) {
    const richEntry = getEditableRichMessageBlockEntry(target)
    if (!richEntry || richEntry.block?.type !== editingMessageRichType.value) {
      showUiNotice('error', t('目标卡片不存在或不可编辑。', 'Card is missing or not editable.'))
      closeMessageEditModal()
      return
    }
    const nextBlocks = Array.isArray(target.blocks)
      ? target.blocks.map((block, index) =>
          index === richEntry.index
            ? {
                ...block,
                ...messageEditState.value.blockPatch,
              }
            : block,
        )
      : []
    ok = chatStore.updateMessageBlocks(activeChat.value.id, target.id, nextBlocks, {
      content: messageEditState.value.content,
      markEdited: true,
      editedAt: Date.now(),
    })
  } else {
    ok =
      target.role === 'assistant'
        ? chatStore.reviseMessageSemantic(activeChat.value.id, target.id, nextText, {
            revisedAt: Date.now(),
          })
        : chatStore.updateMessageContent(activeChat.value.id, target.id, nextText, {
            markEdited: true,
            editedAt: Date.now(),
          })
  }
  if (!ok) {
    showUiNotice('error', t('编辑失败，请重试。', 'Edit failed. Please retry.'))
    return
  }
  showUiNotice(
    'success',
    editingMessageRichType.value
      ? t('卡片已更新。', 'Card updated.')
      : target.role === 'assistant'
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

const recallMessage = async (message) => {
  if (!activeChat.value || !canRecallMessage(message)) return

  const isAssistantMessage = message.role === 'assistant'
  const senderName = activeMessageSenderName()
  const ok = await confirmDialog({
    title: isAssistantMessage ? t('让角色撤回消息', 'Make contact recall message') : t('撤回消息', 'Recall message'),
    message: isAssistantMessage
      ? t(
          `撤回后会显示“${senderName} 撤回了一条消息”。AI 只会知道角色撤回过自己的消息，不会读取原文。`,
          `This will show "${senderName} recalled a message." AI will only know the contact recalled their own message, not the original text.`,
        )
      : t(
          '撤回后会显示“你撤回了一条消息”。AI 只会知道你撤回过消息，不会读取原文。',
          'This will show "You recalled a message." AI will only know you recalled a message, not the original text.',
        ),
    confirmText: t('撤回', 'Recall'),
    cancelText: t('取消', 'Cancel'),
    tone: 'warning',
  })
  if (!ok) return

  const recalled = chatStore.recallMessage(activeChat.value.id, message.id, Date.now())
  if (!recalled) {
    showUiNotice('error', t('撤回失败，请重试。', 'Recall failed. Please retry.'))
    return
  }

  clearRetryTargetForMessage(message.id)
  clearPendingQuoteForMessage(message.id)
  showUiNotice('success', t('已撤回消息。', 'Message recalled.'))
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

  clearRetryTargetForMessage(message.id)
  clearPendingQuoteForMessage(message.id)
  closeMessageActions()
}

const handleMessageAction = (actionId, message) => {
  if (actionId === CHAT_MESSAGE_ACTION_IDS.QUOTE) {
    quoteMessage(message)
  } else if (actionId === CHAT_MESSAGE_ACTION_IDS.COPY) {
    void copyMessage(message)
  } else if (actionId === CHAT_MESSAGE_ACTION_IDS.SAVE) {
    toggleSavedMessage(message)
  } else if (actionId === CHAT_MESSAGE_ACTION_IDS.EDIT) {
    editMessage(message)
  } else if (actionId === CHAT_MESSAGE_ACTION_IDS.RESTORE) {
    restoreSemanticRevision(message)
  } else if (actionId === CHAT_MESSAGE_ACTION_IDS.REROLL) {
    void rerollMessage(message)
  } else if (actionId === CHAT_MESSAGE_ACTION_IDS.RECALL) {
    void recallMessage(message)
  } else if (actionId === CHAT_MESSAGE_ACTION_IDS.DELETE) {
    void deleteMessage(message)
  }
}

const rerollMessage = async (message) => {
  if (!activeChat.value || !canRerollMessage(message)) return
  if (isAiRequestBusy.value) return
  markManualAction()

  const target = activeMessages.value.find((item) => item.id === message.id)
  if (!target || target.role !== 'assistant') return

  const controller = prepareRerollRequest(target.id)
  if (!controller) return

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
    completeAiRequestSuccess()
    closeMessageActions()
  } catch (error) {
    const message =
      error?.code === 'CANCELED'
        ? formatApiErrorForUi(error, t('请求已取消。', 'Request canceled.'))
        : formatApiErrorForUi(error, t('重roll失败，请稍后重试。', 'Reroll failed. Please retry later.'))
    recordRerollFailure(message, target.id)
    resetConversationAutoNextAt(activeChat.value.id, Date.now() + getAutomationCooldownMs())
    systemApiReports.addReport({
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
    finishAiRequest()
    scrollToBottom()
    scheduleAutoInvokeTick()
  }
}

const shouldTriggerProactiveOpener = (contactId) => {
  if (!contactId) return { allowed: false, strategy: 'on_enter_once', replyCount: 1 }
  if (isAiRequestBusy.value) return { allowed: false, strategy: 'on_enter_once', replyCount: 1 }

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
  if (!activeChat.value || isAiRequestBusy.value) return
  if (!canActiveChatCommunicate.value) {
    showUiNotice('warning', t('当前通讯状态不允许生成快捷回复。', 'Current communication state does not allow smart replies.'))
    return
  }
  if (!suggestionFeatureEnabled.value) return

  loadingSuggestions.value = true
  const recentHistory = getSmartReplyHistory(activeChat.value.id)

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

const buildMessageImagePreviewKey = (messageId, blockIndex) => `${messageId}:${blockIndex}`

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

const ensureAvatarPreview = async (assetId) => {
  if (!assetId || avatarPreviewMap[assetId]) return
  const previewUrl = await galleryStore.getAssetPreviewUrl(assetId, {
    scopeId: CHAT_ASSET_PREVIEW_SCOPE_ID,
  })
  if (!previewUrl) return
  avatarPreviewMap[assetId] = previewUrl
}

const clearAvatarPreviewMap = () => {
  Object.keys(avatarPreviewMap).forEach((assetId) => {
    galleryStore.releaseAssetPreview(assetId, CHAT_ASSET_PREVIEW_SCOPE_ID)
    delete avatarPreviewMap[assetId]
  })
}

const resolveImageBlockUrl = (messageId, blockIndex, block) => {
  const key = buildMessageImagePreviewKey(messageId, blockIndex)
  return messageImagePreviewMap[key] || block?.url || ''
}

const appendUserMessage = ({ content = '', blocks = [], source = 'send' } = {}) => {
  if (!activeChat.value) return null
  if (!canActiveChatCommunicate.value) {
    showUiNotice('warning', t('当前通讯状态不允许发送消息。', 'Current communication state does not allow sending messages.'))
    return null
  }
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

  clearPendingQuoteSilently()
  if (quotePayload?.sourceType === 'service_notification') {
    recordServiceNotificationSentFeedback(quotePayload)
  }
  showSuggestions.value = false
  clearAiErrorAndRetryTargets()
  closeMessageActions()
  scrollToBottom()

  const aiPrefs = chatStore.getConversationAiPrefs(chatId)
  if (aiPrefs.replyMode === 'auto' && chatAutomationEnabled.value) {
    requestAiReply(chatId, appended.id, { replyCount: aiPrefs.replyCount })
  }
  scheduleAutoInvokeTick()
  return appended
}

const openExternalUrl = (rawUrl) => {
  const url = normalizeExternalUrl(rawUrl)
  if (!url) {
    showUiNotice('warning', t('外部链接不可用。', 'External link is unavailable.'))
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

const triggerUserMediaPicker = (kind = CHAT_USER_MEDIA_KINDS.IMAGE) => {
  if (!userMediaInputRef.value) return
  pendingUserMediaKind.value =
    kind === CHAT_USER_MEDIA_KINDS.GIF ? CHAT_USER_MEDIA_KINDS.GIF : CHAT_USER_MEDIA_KINDS.IMAGE
  userMediaInputRef.value.accept =
    pendingUserMediaKind.value === CHAT_USER_MEDIA_KINDS.GIF ? 'image/gif' : 'image/*'
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

  const appended = appendUserMessage({
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
  if (appended) {
    const transaction = walletStore.addChatTransferTransaction({
      messageId: appended.id,
      amount,
      currency,
      counterparty: activeChat.value.name || '',
      note,
      createdAt: appended.createdAt,
    })
    if (transaction) {
      showUiNotice('success', t('转账卡已同步到钱包流水。', 'Transfer card synced to Wallet ledger.'))
    }
  }
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

const submitShoppingProductCard = (rawProduct = {}) => {
  if (!activeChat.value) return
  const product = normalizeShoppingCardPayload(rawProduct)
  if (!product) {
    showUiNotice('warning', t('分享卡片不可用。', 'Share card is unavailable.'))
    return
  }
  const shareable = isVirtualGiftShareType(product.shareType)
    ? createVirtualGiftShareObject(product)
    : createProductLinkShareObject(product)
  const shareBlock = shareableObjectToChatBlock(shareable)
  if (!shareBlock) {
    showUiNotice('warning', t('分享卡片不可用。', 'Share card is unavailable.'))
    return
  }
  const label = shoppingShareLabel(product.shareType)
  appendUserMessage({
    content: `${label}: ${product.title}`,
    blocks: [shareBlock],
    source: isVirtualGiftShareType(product.shareType) ? 'shopping_virtual_gift' : 'shopping_product_link',
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

  const mediaKind =
    pendingUserMediaKind.value === CHAT_USER_MEDIA_KINDS.GIF
      ? CHAT_USER_MEDIA_KINDS.GIF
      : CHAT_USER_MEDIA_KINDS.IMAGE
  if (mediaKind === CHAT_USER_MEDIA_KINDS.GIF && file.type !== 'image/gif') {
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
        mediaKind === CHAT_USER_MEDIA_KINDS.GIF ? MEDIA_KIND.GIF : MEDIA_KIND.IMAGE
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

      const fallbackAlt =
        mediaKind === CHAT_USER_MEDIA_KINDS.GIF ? t('单次 GIF', 'One-off GIF') : t('单次图片', 'One-off image')
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
      category: mediaKind === CHAT_USER_MEDIA_KINDS.GIF ? 'emoji' : 'reference',
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
        const expectedKind = mediaKind === CHAT_USER_MEDIA_KINDS.GIF ? MEDIA_KIND.GIF : MEDIA_KIND.IMAGE
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
  const contact = contactById(contactId)
  if (chatStore.isChatSubscriptionFolded(contact)) {
    return t('已折叠到服务号页的订阅消息', 'Folded into Services subscriptions')
  }
  const socialState = chatStore.getContactChatSocialState(contact)
  if (socialState === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST) {
    return t('对方向你打了招呼，等待处理', 'This person greeted you; review the request')
  }
  if (socialState === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST) {
    return t('好友申请等待回应', 'Friend request waiting for a reply')
  }
  if (socialState === CHAT_CONTACT_SOCIAL_STATES.STRANGER) {
    return t('陌生人消息，先打招呼再聊天', 'Stranger message; greet before chatting')
  }
  if (socialState === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED) {
    return t('申请已拒绝，历史仍保留', 'Request declined; history is kept')
  }
  if (socialState === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED) {
    return t('你已屏蔽此角色，历史仍保留', 'You blocked this role; history is kept')
  }
  if (socialState === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED) {
    return t('对方暂时拒收你的消息', 'They are not accepting your messages')
  }
  if (socialState === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED) {
    return t('双方已互相屏蔽，历史仍保留', 'Both sides are blocked; history is kept')
  }
  const conversation = getConversationPreview(contactId)
  if (conversation?.draft?.trim()) {
    return `${t('草稿', 'Draft')}: ${conversation.draft.trim()}`
  }
  const preview = conversation?.lastMessage || t('点击开始聊天', 'Tap to start chat')
  if (chatStore.isChatSubscriptionMuted(contact)) return `${t('免打扰', 'Muted')} · ${preview}`
  return preview
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

const chatSocialStateTag = (contact) => {
  const state = chatStore.getContactChatSocialState(contact)
  if (state === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST) return t('待处理', 'Request')
  if (state === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST) return t('已申请', 'Requested')
  if (state === CHAT_CONTACT_SOCIAL_STATES.STRANGER) return t('陌生人', 'Stranger')
  if (state === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED) return t('已拒绝', 'Declined')
  if (state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED) return t('已屏蔽', 'Blocked')
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED) return t('拒收中', 'Refusing')
  if (state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED) return t('互相屏蔽', 'Mutual block')
  return ''
}

const chatSocialStateTagClass = (contact) => {
  const state = chatStore.getContactChatSocialState(contact)
  if (
    state === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST ||
    state === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST ||
    state === CHAT_CONTACT_SOCIAL_STATES.STRANGER ||
    state === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED
  ) {
    return 'bg-amber-100 text-amber-700'
  }
  if (
    state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED ||
    state === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED ||
    state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
  ) {
    return 'bg-rose-100 text-rose-700'
  }
  return ''
}

const chatSubscriptionStateTag = (contact) => {
  if (chatStore.isChatSubscriptionFolded(contact)) return t('已折叠', 'Folded')
  if (chatStore.isChatSubscriptionMuted(contact)) return t('免打扰', 'Muted')
  return ''
}

const chatSubscriptionStateTagClass = (contact) => {
  if (chatStore.isChatSubscriptionFolded(contact)) return 'bg-slate-100 text-slate-700'
  if (chatStore.isChatSubscriptionMuted(contact)) return 'bg-emerald-100 text-emerald-700'
  return ''
}

const activeChatRestrictionTitle = computed(() => {
  if (!activeChat.value || canActiveChatCommunicate.value) return ''
  const state = activeChatSocialState.value
  if (state === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST) return t('新的打招呼消息', 'New greeting request')
  if (state === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST) return t('申请等待回应', 'Request waiting')
  if (state === CHAT_CONTACT_SOCIAL_STATES.STRANGER) return t('陌生人会话', 'Stranger chat')
  if (state === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED) return t('申请已拒绝', 'Request declined')
  if (state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED) return t('你已屏蔽此角色', 'You blocked this role')
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED) return t('对方暂时拒收', 'They are not accepting messages')
  if (state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED) return t('双方已互相屏蔽', 'Both sides are blocked')
  return ''
})

const activeChatRestrictionDetail = computed(() => {
  if (!activeChat.value || canActiveChatCommunicate.value) return ''
  const state = activeChatSocialState.value
  if (state === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST) {
    return t(
      '通过后会进入正常聊天；忽略不会删除这个会话记录。',
      'Accept to move into normal chat; ignoring keeps the thread history.',
    )
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST) {
    return t(
      '你已经发出打招呼申请，历史记录会保留。',
      'Your greeting request is pending, and the history is kept.',
    )
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.STRANGER) {
    return t(
      '这不是正式好友会话，先打招呼或处理请求后再聊天。',
      'This is not a normal chat yet. Greet or handle the request first.',
    )
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED) {
    return t(
      '申请被拒绝后不会清空历史；可以稍后重新打招呼。',
      'Declining does not clear history; you can greet again later.',
    )
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED) {
    return t(
      '拉黑只会限制通讯，不会删除聊天记录。解除后继续使用原会话。',
      'Blocking only limits communication and does not delete history. Unblock to continue this thread.',
    )
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED) {
    return t(
      '对方拒收时你仍可查看历史；之后可通过剧情或设置恢复通讯。',
      'You can still read history while they refuse messages; communication can be restored later.',
    )
  }
  if (state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED) {
    return t(
      '双方互相屏蔽时只保留查看历史，解除各自限制后再继续。',
      'When both sides are blocked, the thread is read-only until restrictions are lifted.',
    )
  }
  return ''
})

const setActiveChatSocialState = (state, message) => {
  if (!activeChat.value) return
  const ok = chatStore.setContactChatSocialState(activeChat.value.id, state)
  if (ok && message) showUiNotice('success', message)
}

const acceptActiveChatRequest = () =>
  setActiveChatSocialState(
    CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    t('已通过，当前会话可以继续聊天。', 'Accepted. This thread can continue normally.'),
  )

const declineActiveChatRequest = () =>
  setActiveChatSocialState(
    CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED,
    t('已忽略请求，聊天记录仍保留。', 'Request ignored. Chat history is kept.'),
  )

const requestActiveChatGreeting = () =>
  setActiveChatSocialState(
    CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST,
    t('已发送打招呼申请。', 'Greeting request sent.'),
  )

const cancelActiveChatGreeting = () =>
  setActiveChatSocialState(
    CHAT_CONTACT_SOCIAL_STATES.STRANGER,
    t('已撤回打招呼申请。', 'Greeting request canceled.'),
  )

const unblockActiveChat = () => {
  if (!activeChat.value) return
  const ok = chatStore.unblockChatContact(activeChat.value.id)
  if (ok) {
    showUiNotice('success', t('已解除你的拉黑限制，历史记录未变。', 'Your block was removed; history is unchanged.'))
  }
}

const headerSecondaryStatusText = computed(() => {
  if (loadingAI.value) return t('对方正在输入...', 'Typing...')
  if (threadSettingsSaved.value) return t('会话调校已保存', 'Thread tuning saved')
  if (threadIdentitySaved.value) return t('会话身份已保存', 'Thread identity saved')
  if (activeChatRestrictionTitle.value) return activeChatRestrictionTitle.value
  if (isActiveServiceChat.value) return activeServiceHeaderStatus.value
  return ''
})

const headerSecondaryStatusClass = computed(() =>
  !loadingAI.value && activeChatRestrictionTitle.value
    ? 'text-amber-600 font-medium'
    : !loadingAI.value && (threadSettingsSaved.value || threadIdentitySaved.value)
    ? 'text-emerald-600 font-medium'
    : !loadingAI.value && isActiveServiceChat.value
    ? activeServiceIsFolded.value
      ? 'text-slate-600 font-medium'
      : 'text-emerald-700 font-medium'
    : '',
)

const messageStatusText = (message) => {
  if (isRecalledMessage(message)) return ''
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
  if (isRecalledMessage(message)) return t('已撤回', 'Recalled')
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
  if (isRecalledMessage(message)) {
    return [{ type: 'text', text: recalledMessageDisplayText(message), variant: 'primary', lang: 'auto' }]
  }
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

const pushSafeServiceRoute = (routePath) => {
  if (typeof routePath !== 'string' || !routePath.startsWith('/')) {
    showUiNotice('warning', t('该链接暂不可用。', 'This link is unavailable.'))
    return false
  }
  const [path, rawQuery = ''] = routePath.split('?')
  if (!SAFE_MODULE_ROUTES.has(path)) {
    showUiNotice('warning', t('该链接暂不可用。', 'This link is unavailable.'))
    return false
  }
  if (!rawQuery) {
    router.push(path)
    return true
  }
  router.push({
    path,
    query: Object.fromEntries(new URLSearchParams(rawQuery)),
  })
  return true
}

const openServiceNotificationRoute = (block = {}, action = null) => {
  const routePath = typeof action?.route === 'string' ? action.route : block.route
  if (!pushSafeServiceRoute(routePath)) return
  recordServiceRouteFeedback(block, action, routePath)
}

const openShareCardRoute = (block = {}) => {
  if (!pushSafeServiceRoute(block.route)) return
  showUiNotice(
    'info',
    t('已打开来源 App；聊天记录保持不变。', 'Opened the source app; Chat history stays unchanged.'),
  )
}

const reopenServiceRouteFeedbackSource = () => {
  const routePath = activeServiceRouteFeedback.value?.route
  if (!routePath) return
  pushSafeServiceRoute(routePath)
}

const openShoppingFromChat = (payload = {}) => {
  const productId = typeof payload?.productId === 'string' ? payload.productId.trim() : ''
  const category = typeof payload?.category === 'string' ? payload.category.trim() : ''
  const serviceKey = typeof payload?.serviceKey === 'string' ? payload.serviceKey.trim() : ''
  const intent = typeof payload?.intent === 'string' && payload.intent.trim()
    ? payload.intent.trim()
    : SHAREABLE_OBJECT_TYPES.PRODUCT_LINK
  const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : ''
  const chatId = Number(activeChat.value?.id)
  closeUserActionPanel()
  router.push({
    path: '/shopping',
    query: {
      source: 'chat',
      intent,
      ...(Number.isFinite(chatId) && chatId > 0 ? { chatId: String(chatId) } : {}),
      ...(category ? { category } : {}),
      ...(serviceKey ? { service: serviceKey } : {}),
      ...(productId ? { productId } : {}),
      ...(orderId ? { orderId } : {}),
    },
  })
}

const openShoppingProductCard = (block = {}) => {
  openShoppingFromChat({
    productId: block.productId,
    category: block.category,
    serviceKey: block.serviceKey,
  })
}

const openShoppingGiftOrder = (order = {}) => {
  openShoppingFromChat({
    intent: 'gift_order',
    orderId: order.id,
  })
}

const openShoppingLogisticsOrder = (row = {}) => {
  openShoppingFromChat({
    intent: 'logistics',
    category: 'logistics',
    orderId: row.order?.id || row.id,
  })
}

const openFoodDeliveryOrder = (row = {}) => {
  const orderId = typeof row?.id === 'string' ? row.id.trim() : ''
  const chatId = Number(activeChat.value?.id)
  const query = {
    source: 'chat',
    intent: 'food_delivery_order',
    orderId,
  }
  if (Number.isFinite(chatId) && chatId > 0) query.chatId = String(chatId)
  if (activeFoodDeliveryServiceKey.value) query.service = activeFoodDeliveryServiceKey.value
  router.push({
    path: '/food-delivery',
    query,
  })
}

const openChatDirectory = () => {
  closeThreadMenu()
  if (isActiveServiceChat.value) {
    router.push({
      path: '/chat-contacts',
      query: buildActiveServiceDirectoryQuery({ serviceReturn: 'menu' }),
    })
    return
  }
  router.push('/chat-contacts')
}

const transferActionLabel = (block) => {
  if (!block?.actionRoute) return t('详情', 'Details')
  if (block.actionRoute === '/wallet') return t('打开钱包', 'Open Wallet')
  return t('打开', 'Open')
}

const toggleActiveServiceMuted = () => {
  if (!activeChat.value || !isActiveServiceChat.value) return
  const ok = chatStore.toggleChatSubscriptionMuted(activeChat.value.id)
  if (!ok) return
  const next = chatStore.getContactById(activeChat.value.id)
  showUiNotice(
    'success',
    chatStore.isChatSubscriptionMuted(next)
      ? t('已设为免打扰。', 'Muted.')
      : t('已取消免打扰。', 'Unmuted.'),
  )
}

const toggleActiveServiceFolded = () => {
  if (!activeChat.value || !isActiveServiceChat.value) return
  const ok = chatStore.toggleChatSubscriptionFolded(activeChat.value.id)
  if (!ok) return
  const next = chatStore.getContactById(activeChat.value.id)
  showUiNotice(
    'success',
    chatStore.isChatSubscriptionFolded(next)
      ? t('已折叠到服务号页。', 'Folded into Services.')
      : t('已恢复到消息首页。', 'Restored to Messages.'),
  )
}

const toggleThreadMenu = () => {
  toggleThreadMenuModel({
    prefs: activeAiPrefs.value,
    identityOverrides: activeChat.value
      ? chatStore.getConversationIdentityOverrides(activeChat.value.id)
      : null,
  })
}

const saveThreadIdentityOverrides = () => {
  if (!activeChat.value) return

  const changed = chatStore.setConversationIdentityOverrides(
    activeChat.value.id,
    createThreadIdentityPayload(),
  )

  if (!changed) {
    showUiNotice('warning', t('未检测到身份变更。', 'No identity changes detected.'))
    return
  }

  chatStore.saveNow()
  triggerThreadIdentitySaved()
}

const saveThreadSettings = () => {
  if (!activeChat.value) return

  const nextPrefs = createThreadSettingsPayload({
    chatAutomationEnabled: chatAutomationEnabled.value,
  })
  chatStore.setConversationAiPrefs(activeChat.value.id, nextPrefs)

  if (threadSettingsDraft.autoInvokeEnabled) {
    resetConversationAutoNextAt(activeChat.value.id, Date.now())
  } else {
    chatStore.setConversationAutoState(activeChat.value.id, { autoNextAt: 0 })
  }

  if (!nextPrefs.suggestedRepliesEnabled) {
    showSuggestions.value = false
  }

  chatStore.saveNow()
  triggerThreadSettingsSaved()
  closeThreadMenu()
  scheduleAutoInvokeTick()
}

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
  () => {
    const ids = []
    const pushAssetId = (assetId) => {
      const normalized = typeof assetId === 'string' ? assetId.trim() : ''
      if (!normalized || ids.includes(normalized)) return
      ids.push(normalized)
    }

    contactsForList.value.forEach((contact) => {
      pushAssetId(getAvatarImageGalleryAssetId(contact?.avatarImage, contact?.avatar, contact?.name))
    })
    pushAssetId(
      getAvatarImageGalleryAssetId(
        user.value.avatarImage,
        user.value.avatar,
        activeModuleNickname.value,
      ),
    )
    return ids
  },
  (assetIds) => {
    const activeSet = new Set(assetIds)
    assetIds.forEach((assetId) => {
      void ensureAvatarPreview(assetId)
    })
    Object.keys(avatarPreviewMap).forEach((assetId) => {
      if (!activeSet.has(assetId)) {
        galleryStore.releaseAssetPreview(assetId, CHAT_ASSET_PREVIEW_SCOPE_ID)
        delete avatarPreviewMap[assetId]
      }
    })
  },
  { immediate: true },
)

watch(
  activeChatId,
  (id) => {
    closeThreadMenu()
    closeUserActionPanel()
    closeMessageEditModal()
    closeMessageActions()
    clearPendingQuoteSilently()
    resetThreadMenuSavedFeedback()
    uiNoticeType.value = ''
    uiNoticeMessage.value = ''
    syncServiceFeedbackForChat(id)

    if (id) {
      chatStore.ensureConversationForContact(id)
      const contact = chatStore.getContactById(id)
      const conversation = chatStore.getConversationByContactId(id)
      const unreadBeforeRead = Math.max(0, Math.floor(Number(conversation?.unread) || 0))
      chatStore.markConversationRead(id)
      inputMessage.value = chatStore.getConversationByContactId(id).draft || ''
      recordServiceThreadReadFeedback(contact, unreadBeforeRead)
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
    clearAiRequestStateForThreadSwitch()
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
  disposeThreadMenuModel()
  if (uiNoticeTimerId) clearTimeout(uiNoticeTimerId)
  clearGalleryPickerPreviewMap()
  clearMessageImagePreviewMap()
  clearAvatarPreviewMap()
  galleryStore.releaseAssetPreviewScope(CHAT_ASSET_PREVIEW_SCOPE_ID)
})
</script>

<template>
  <div class="w-full h-full flex flex-col chat-shell" :class="chatShellClasses">
    <template v-if="!activeChat">
      <div class="chat-home-header pt-12 px-4 pb-4 chat-ink">
        <div class="flex items-center justify-between gap-3">
          <button
            @click="goHome"
            class="chat-home-icon-button chat-ink"
            :aria-label="t('返回主页', 'Back to Home')"
          >
            <i class="fas fa-chevron-left"></i>
          </button>
          <p class="flex-1 text-2xl font-bold leading-tight">{{ t('消息', 'Messages') }}</p>
          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="chat-home-icon-button chat-ink"
              :aria-label="t('搜索', 'Search')"
              @click="toggleChatSearch"
            >
              <i class="fas fa-search"></i>
            </button>
            <button
              type="button"
              class="chat-home-icon-button chat-ink"
              :aria-label="t('新建会话', 'New chat')"
              @click="openChatObjects"
            >
              <i class="fas fa-comment-medical"></i>
            </button>
            <button
              type="button"
              class="chat-home-icon-button chat-ink"
              :aria-label="t('Chat 设置', 'Chat Settings')"
              data-testid="chat-settings-button"
              @click="openChatSettings"
            >
              <i class="fas fa-cog"></i>
            </button>
          </div>
        </div>

        <div v-if="chatSearchOpen" class="chat-home-search mt-3">
          <i class="fas fa-search text-xs text-gray-400"></i>
          <input
            v-model="chatSearchKeyword"
            type="text"
            class="flex-1 bg-transparent text-sm outline-none"
            :placeholder="t('搜索会话、角色或草稿', 'Search chats, roles, or drafts')"
          />
          <button
            v-if="chatSearchKeyword"
            type="button"
            class="text-[11px] text-gray-500"
            @click="chatSearchKeyword = ''"
          >
            {{ t('清空', 'Clear') }}
          </button>
        </div>
      </div>

      <div class="chat-home-sheet flex-1 overflow-y-auto no-scrollbar">
        <section class="chat-home-hero mx-4 mt-4 mb-2">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-bold text-gray-950">{{ chatHomeHeroTitle }}</p>
              <p class="mt-1 text-[11px] leading-4 text-gray-600">{{ chatHomeHeroDetail }}</p>
            </div>
            <div class="flex shrink-0 gap-1.5">
              <button
                type="button"
                class="chat-home-hero__action"
                :aria-label="t('对象', 'Objects')"
                @click="openChatObjects"
              >
                <i class="fas fa-user text-xs"></i>
              </button>
              <button
                type="button"
                class="chat-home-hero__action"
                :aria-label="t('群聊', 'Groups')"
                @click="openChatGroups"
              >
                <i class="fas fa-comments text-xs"></i>
              </button>
            </div>
          </div>
        </section>

        <section
          v-if="chatMessageRequestContacts.length > 0"
          class="chat-home-notice-card mx-4 mb-2 border-amber-100 bg-white"
          data-testid="chat-message-requests-card"
          @click="openMessageRequests"
        >
          <div class="flex items-center gap-3">
            <div class="flex -space-x-2">
              <img
                v-for="contact in chatMessageRequestContacts.slice(0, 3)"
                :key="`request-avatar-${contact.id}`"
                :src="contactAvatarForList(contact)"
                class="h-8 w-8 rounded-full border-2 border-white object-cover"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-gray-950">{{ t('消息请求', 'Message Requests') }}</p>
              <p class="mt-0.5 text-[11px] leading-4 text-gray-500">
                {{ t('陌生人打招呼、好友申请和已拒绝申请集中在这里。', 'Stranger greetings, friend requests, and declined requests live here.') }}
              </p>
            </div>
            <span class="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500 px-2 text-[10px] font-semibold text-white">
              {{ Math.min(chatMessageRequestContacts.length, 99) }}
            </span>
          </div>
        </section>

        <section
          v-if="showFoldedSubscriptionsCard"
          class="chat-home-notice-card mx-4 mb-2 transition-colors"
          :class="chatFoldedSubscriptionUnreadTotal > 0 ? 'border-red-100 bg-red-50/50' : 'border-slate-100 bg-white'"
          data-testid="chat-folded-subscriptions-card"
          @click="openFoldedSubscriptions"
        >
          <div class="flex items-center gap-3">
            <div class="flex -space-x-2">
              <img
                v-for="contact in chatFoldedSubscriptionContacts.slice(0, 3)"
                :key="`folded-subscription-avatar-${contact.id}`"
                :src="contactAvatarForList(contact)"
                class="h-8 w-8 rounded-2xl border-2 border-white object-cover"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-gray-950">{{ t('已折叠订阅', 'Folded Subscriptions') }}</p>
              <p class="mt-0.5 text-[11px] leading-4 text-gray-500">
                {{
                  chatFoldedSubscriptionUnreadTotal > 0
                    ? t(
                        `${chatFoldedSubscriptionUnreadTotal} 条未读收在服务号页，不打断消息首页。`,
                        `${chatFoldedSubscriptionUnreadTotal} unread updates are tucked under Services.`,
                      )
                    : t('这些服务号不显示在消息首页，历史和新消息仍保留。', 'These services stay out of Messages while keeping history and new updates.')
                }}
              </p>
              <div class="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  :class="chatFoldedSubscriptionUnreadTotal > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'"
                  data-testid="chat-folded-subscriptions-state"
                >
                  {{
                    chatFoldedSubscriptionUnreadTotal > 0
                      ? t(
                          `${chatFoldedSubscriptionUnreadTotal} 条未读更新 · ${chatFoldedSubscriptionUnreadContactCount} 个服务号`,
                          `${chatFoldedSubscriptionUnreadTotal} unread updates · ${chatFoldedSubscriptionUnreadContactCount} accounts`,
                        )
                      : t('全部已读', 'All read')
                  }}
                </span>
                <span class="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  {{ t(`${chatFoldedSubscriptionContacts.length} 个已折叠`, `${chatFoldedSubscriptionContacts.length} folded`) }}
                </span>
              </div>
            </div>
            <span
              v-if="chatFoldedSubscriptionUnreadTotal > 0"
              class="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-[10px] font-semibold text-white"
              data-testid="chat-folded-subscriptions-unread-badge"
            >
              {{ Math.min(chatFoldedSubscriptionUnreadTotal, 99) }}
            </span>
            <span
              v-else
              class="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-2 text-[10px] font-semibold text-white"
              data-testid="chat-folded-subscriptions-count-badge"
            >
              {{ Math.min(chatFoldedSubscriptionContacts.length, 99) }}
            </span>
          </div>
        </section>

        <p
          v-if="visibleChatContacts.length === 0 && chatMessageRequestContacts.length === 0 && !showFoldedSubscriptionsCard"
          class="px-4 py-8 text-center text-xs text-gray-400"
        >
          {{ normalizedChatSearchKeyword ? t('没有匹配的会话。', 'No matching chats.') : t('暂无会话，先从对象页绑定角色或创建群聊。', 'No chats yet. Bind an object or create a group first.') }}
        </p>

        <div
          v-for="contact in visibleChatContacts"
          :key="contact.id"
          @click="enterChat(contact)"
          class="chat-list-row"
          :data-testid="`chat-contact-row-${contact.id}`"
        >
          <div class="chat-list-avatar">
            <img
              :src="contactAvatarForList(contact)"
              class="w-full h-full object-cover"
              :data-testid="`chat-contact-avatar-${contact.id}`"
            />
          </div>
          <div class="chat-list-content">
            <div class="flex justify-between items-center gap-2">
              <span class="font-bold text-sm truncate">{{ contact.name }}</span>
              <span class="text-[10px] text-gray-400 shrink-0">{{ formatConversationTime(getConversationPreview(contact.id)?.lastMessageAt) }}</span>
            </div>
            <div class="chat-list-preview" :class="getConversationPreview(contact.id)?.draft?.trim() ? 'text-orange-500' : 'text-gray-500'">
              <span v-if="contactKindTag(contact)" class="px-1 rounded text-[8px] font-medium" :class="contactKindTagClass(contact)">
                {{ contactKindTag(contact) }}
              </span>
              <span
                v-if="chatSocialStateTag(contact)"
                class="px-1 rounded text-[8px] font-medium"
                :class="chatSocialStateTagClass(contact)"
                :data-testid="`chat-contact-social-tag-${contact.id}`"
              >
                {{ chatSocialStateTag(contact) }}
              </span>
              <span
                v-if="chatSubscriptionStateTag(contact)"
                class="px-1 rounded text-[8px] font-medium"
                :class="chatSubscriptionStateTagClass(contact)"
                :data-testid="`chat-contact-subscription-tag-${contact.id}`"
              >
                {{ chatSubscriptionStateTag(contact) }}
              </span>
              {{ contactPreviewText(contact.id) }}
            </div>
          </div>
          <span
            v-if="getConversationPreview(contact.id)?.unread"
            class="chat-list-unread"
          >
            {{ Math.min(getConversationPreview(contact.id)?.unread || 0, 99) }}
          </span>
        </div>
      </div>

      <ChatAppTabBar active="messages" />
    </template>

    <template v-else>
      <div class="pt-12 pb-2 px-3 chat-thread-header backdrop-blur flex items-center justify-between z-10 shadow-sm">
        <button
          @click="leaveChat"
          class="chat-ink px-2 flex items-center gap-1 w-16"
          data-testid="chat-thread-back"
        >
          {{ t('返回', 'Back') }}
        </button>
        <div class="flex-1 text-center min-w-0">
          <div class="flex items-center justify-center gap-1.5 min-w-0">
            <span
              v-if="isActiveServiceChat"
              class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
              data-testid="chat-active-service-icon"
            >
              <i :class="activeChat.kind === 'official' ? 'fas fa-newspaper' : 'fas fa-bullhorn'" class="text-[10px]"></i>
            </span>
            <p class="font-bold text-sm truncate">{{ activeChat.name }}</p>
          </div>
          <p class="text-[10px] text-gray-500">
            <span v-if="contactKindTag(activeChat)">{{ contactKindTag(activeChat) }}</span>
            <span v-if="contactKindTag(activeChat) && headerSecondaryStatusText"> · </span>
            <span v-if="headerSecondaryStatusText" :class="headerSecondaryStatusClass">{{ headerSecondaryStatusText }}</span>
          </p>
        </div>
        <button
          @click="toggleThreadMenu"
          class="chat-ink px-2 w-16 text-right"
          data-testid="chat-thread-menu-toggle"
        ><i class="fas fa-bars"></i></button>
      </div>

      <ChatThreadMenuPanel
        v-if="showThreadMenu"
        :active-chat="activeChat"
        :is-active-service-chat="isActiveServiceChat"
        :subscription-muted="activeServiceIsMuted"
        :subscription-folded="activeServiceIsFolded"
        :world-kernel-state="activeThreadWorldKernelState"
        :thread-identity-draft="threadIdentityDraft"
        :thread-settings-draft="threadSettingsDraft"
        :reply-mode-options="REPLY_MODE_OPTIONS"
        :response-style-options="RESPONSE_STYLE_OPTIONS"
        :image-reference-mode-options="IMAGE_REFERENCE_MODE_OPTIONS"
        :proactive-strategy-options="PROACTIVE_STRATEGY_OPTIONS"
        :role-image-reference-availability="roleImageReferenceAvailability"
        :thread-image-block-policy-hint="threadImageBlockPolicyHint"
        :chat-automation-enabled="chatAutomationEnabled"
        :auto-schedule-hint-text="autoScheduleHintText"
        :auto-background-reminder-hint="autoBackgroundReminderHint"
        :auto-last-triggered-hint-text="autoLastTriggeredHintText"
        :auto-restore-settlement-hint-text="autoRestoreSettlementHintText"
        :thread-settings-saved="threadSettingsSaved"
        @apply-default-thread-preset="applyDefaultThreadPresetToDraft"
        @open-chat-directory="openChatDirectory"
        @open-worldbook="openWorldBookFromThreadContext"
        @toggle-subscription-muted="toggleActiveServiceMuted"
        @toggle-subscription-folded="toggleActiveServiceFolded"
        @clear-thread-identity="clearThreadIdentityDraft"
        @save-thread-identity="saveThreadIdentityOverrides"
        @save-thread-settings="saveThreadSettings"
        @update-thread-identity="updateThreadIdentityDraft"
        @update-thread-setting="updateThreadSettingsDraft"
        @close="closeThreadMenu"
      />

      <div
        class="chat-thread flex-1 overflow-y-auto px-4 pt-4 space-y-3 no-scrollbar"
        :style="{ paddingBottom: '1rem' }"
        ref="chatContainer"
      >
        <section
          v-if="isActiveServiceChat"
          class="rounded-3xl border border-emerald-100 bg-white/95 px-3 py-3 text-xs text-gray-700 shadow-sm"
          data-testid="chat-service-channel-card"
        >
          <div class="flex items-start gap-3">
            <span class="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <i :class="activeChat.kind === 'official' ? 'fas fa-newspaper' : 'fas fa-bullhorn'" class="text-sm"></i>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    {{ contactKindTag(activeChat) }}
                  </p>
                  <p class="mt-0.5 truncate text-sm font-semibold text-gray-950" data-testid="chat-service-channel-name">
                    {{ activeChat.name }}
                  </p>
                  <p class="mt-0.5 line-clamp-1 text-[11px] text-gray-500">
                    {{ activeServiceTemplateText }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-wrap justify-end gap-1">
                  <span
                    v-if="canActiveChatCommunicate"
                    class="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                    data-testid="chat-active-service-replyable-tag"
                  >
                    {{ t('可回复', 'Replyable') }}
                  </span>
                  <span
                    v-for="tag in activeServiceStatusTags"
                    :key="tag.key"
                    class="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                    :class="tag.className"
                    :data-testid="`chat-active-service-${tag.key}-tag`"
                  >
                    {{ tag.label }}
                  </span>
                </div>
              </div>
              <p class="mt-2 line-clamp-2 text-[11px] leading-4 text-gray-600" data-testid="chat-service-channel-preview">
                {{ activeServiceChannelPreview }}
              </p>
              <div class="mt-2 flex flex-wrap gap-1.5" data-testid="chat-service-channel-sources">
                <span
                  v-for="chip in activeServiceSourceChips"
                  :key="chip.key"
                  class="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                  :class="chip.className"
                  :data-testid="`chat-service-channel-source-${chip.key}`"
                >
                  {{ chip.label }}
                </span>
              </div>
              <div
                class="mt-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-2.5 py-2 text-[10px] leading-4 text-indigo-800"
                data-testid="chat-service-channel-source-plan"
                :data-source-plan-status="activeServiceSourceNotificationPlan?.status || 'not_connected'"
              >
                <p class="font-semibold">
                  {{ t('接收计划', 'Receive plan') }}
                </p>
                <p class="mt-0.5">
                  {{ activeServiceSourceScheduleSummary }}
                </p>
                <p v-if="activeServiceSourceScheduleRows.length > 0" class="mt-0.5 text-indigo-700">
                  {{ activeServiceSourceScheduleRows.map((row) => serviceSourceScheduleRowScheduleLabel(row)).join(' / ') }}
                </p>
              </div>
              <div class="mt-3 grid gap-2 sm:grid-cols-3" data-testid="chat-service-channel-promises">
                <div
                  v-for="item in activeServiceThreadPromises"
                  :key="item.key"
                  class="rounded-2xl border border-gray-100 bg-gray-50/70 px-2.5 py-2"
                  :data-testid="`chat-service-channel-promise-${item.key}`"
                >
                  <p class="text-[10px] font-semibold text-gray-800">{{ item.label }}</p>
                  <p class="mt-0.5 text-[10px] leading-3 text-gray-500">{{ item.detail }}</p>
                </div>
              </div>
              <p class="mt-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-2.5 py-2 text-[10px] leading-4 text-emerald-800" data-testid="chat-service-channel-placement">
                {{ activeServiceInboxPlacement }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700"
                  data-testid="chat-active-service-toggle-muted"
                  @click="toggleActiveServiceMuted"
                >
                  {{ activeServiceIsMuted ? t('取消免打扰', 'Unmute') : t('免打扰', 'Mute') }}
                </button>
                <button
                  type="button"
                  class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700"
                  data-testid="chat-active-service-toggle-folded"
                  @click="toggleActiveServiceFolded"
                >
                  {{ activeServiceIsFolded ? t('取消折叠', 'Unfold') : t('折叠', 'Fold') }}
                </button>
                <button
                  type="button"
                  class="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-600"
                  @click="openChatDirectory"
                >
                  {{ t('服务号', 'Services') }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          v-if="activeServiceRouteFeedback"
          class="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-3 text-xs text-emerald-950"
          data-testid="chat-service-route-feedback"
        >
          <div class="flex items-start gap-3">
            <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700">
              <i class="fas fa-arrow-up-right-from-square text-xs"></i>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-semibold">{{ t('已打开来源', 'Source opened') }}</p>
                  <p v-if="activeServiceRouteFeedback.title" class="mt-0.5 truncate text-[11px] text-emerald-700">
                    {{ activeServiceRouteFeedback.title }}
                  </p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-emerald-700"
                  data-testid="chat-service-route-feedback-dismiss"
                  @click="clearServiceRouteFeedback"
                >
                  {{ t('知道了', 'OK') }}
                </button>
              </div>
              <p class="mt-2 leading-4 text-emerald-700">{{ activeServiceRouteFeedbackDetail }}</p>
              <button
                v-if="activeServiceRouteFeedback.route"
                type="button"
                class="mt-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[10px] font-semibold text-emerald-700"
                data-testid="chat-service-route-feedback-open-again"
                @click="reopenServiceRouteFeedbackSource"
              >
                {{ t('再次打开来源', 'Open again') }}
              </button>
            </div>
          </div>
        </section>

        <section
          v-if="activeServiceNotificationActionFeedback"
          class="rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-3 text-xs text-sky-950"
          data-testid="chat-service-action-feedback"
        >
          <div class="flex items-start gap-3">
            <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700">
              <i class="fas fa-reply text-xs"></i>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-semibold" data-testid="chat-service-action-feedback-title">
                    {{ activeServiceNotificationActionFeedback.heading }}
                  </p>
                  <p
                    v-if="activeServiceNotificationActionFeedback.title"
                    class="mt-0.5 truncate text-[11px] text-sky-700"
                  >
                    {{ activeServiceNotificationActionFeedback.title }}
                  </p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-sky-700"
                  data-testid="chat-service-action-feedback-dismiss"
                  @click="clearServiceNotificationActionFeedback"
                >
                  {{ t('知道了', 'OK') }}
                </button>
              </div>
              <p class="mt-2 leading-4 text-sky-700">{{ activeServiceNotificationActionFeedback.detail }}</p>
            </div>
          </div>
        </section>

        <section
          v-if="showActiveServiceEmptyState"
          class="mx-auto my-4 w-full max-w-[92%] rounded-3xl border border-dashed border-emerald-200 bg-white/75 px-4 py-5 text-center text-xs text-gray-700"
          data-testid="chat-service-empty-state"
        >
          <span class="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <i class="fas fa-bell text-sm"></i>
          </span>
          <p class="mt-3 text-sm font-semibold text-gray-950">{{ activeServiceEmptyStateTitle }}</p>
          <p class="mx-auto mt-1 max-w-[260px] text-[11px] leading-4 text-gray-500">
            {{ activeServiceEmptyStateDetail }}
          </p>
          <div class="mt-4 flex flex-wrap justify-center gap-2">
            <button
              v-if="canActiveChatCommunicate"
              type="button"
              class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700"
              data-testid="chat-service-empty-reply"
              @click="focusMessageInput"
            >
              {{ t('发一条消息', 'Send message') }}
            </button>
            <button
              type="button"
              class="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600"
              data-testid="chat-service-empty-open-services"
              @click="openChatDirectory"
            >
              {{ t('去服务号页', 'Open Services') }}
            </button>
          </div>
        </section>

        <section
          v-if="activeChatRestrictionTitle"
          class="rounded-2xl border border-amber-100 bg-white/90 px-3 py-3 text-xs text-gray-800 shadow-sm"
          data-testid="chat-social-state-banner"
        >
          <div class="flex items-start gap-3">
            <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <i class="fas fa-user-shield text-xs"></i>
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-gray-950">{{ activeChatRestrictionTitle }}</p>
              <p class="mt-1 leading-4 text-gray-500">{{ activeChatRestrictionDetail }}</p>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-if="activeChatSocialState === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST"
                  type="button"
                  class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700"
                  data-testid="chat-social-accept-request"
                  @click="acceptActiveChatRequest"
                >
                  {{ t('通过', 'Accept') }}
                </button>
                <button
                  v-if="activeChatSocialState === CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST"
                  type="button"
                  class="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-600"
                  data-testid="chat-social-decline-request"
                  @click="declineActiveChatRequest"
                >
                  {{ t('忽略', 'Ignore') }}
                </button>
                <button
                  v-if="
                    activeChatSocialState === CHAT_CONTACT_SOCIAL_STATES.STRANGER ||
                    activeChatSocialState === CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED
                  "
                  type="button"
                  class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700"
                  data-testid="chat-social-send-greeting"
                  @click="requestActiveChatGreeting"
                >
                  {{ t('打招呼', 'Greet') }}
                </button>
                <button
                  v-if="activeChatSocialState === CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST"
                  type="button"
                  class="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-600"
                  data-testid="chat-social-cancel-greeting"
                  @click="cancelActiveChatGreeting"
                >
                  {{ t('撤回申请', 'Cancel request') }}
                </button>
                <button
                  v-if="
                    activeChatSocialState === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED ||
                    activeChatSocialState === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
                  "
                  type="button"
                  class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700"
                  data-testid="chat-social-unblock"
                  @click="unblockActiveChat"
                >
                  {{ t('解除拉黑', 'Unblock') }}
                </button>
                <button
                  type="button"
                  class="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-600"
                  @click="openChatDirectory"
                >
                  {{ t('管理状态', 'Manage state') }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section
          v-if="activeGiftOrderSummaries.length > 0"
          class="rounded-2xl border border-rose-100 bg-rose-50/80 px-3 py-2 text-xs text-rose-900"
          data-testid="chat-gift-order-context"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold">{{ t('已确认礼物订单', 'Confirmed gift orders') }}</p>
              <p class="mt-1 text-[11px] text-rose-700">
                {{
                  t(
                    'Shopping 已保存这些赠礼订单；Chat 只显示上下文，不接管结算。',
                    'Shopping owns these gift orders; Chat only shows context and does not own checkout.',
                  )
                }}
              </p>
            </div>
            <span class="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-rose-600">
              {{ activeGiftOrderSummaries.length }}
            </span>
          </div>
          <div class="mt-2 space-y-1.5">
            <article
              v-for="order in activeGiftOrderSummaries"
              :key="order.id"
              class="rounded-xl border border-rose-100 bg-white/80 px-2.5 py-2"
              :data-testid="`chat-gift-order-${order.id}`"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-semibold truncate">{{ order.title }}</p>
                  <p class="mt-0.5 text-[11px] text-rose-600">
                    {{ order.amount }} · {{ order.recipientName || activeChat.name }}
                    <span v-if="order.itemCount > 1"> · {{ order.itemCount }} {{ t('件', 'items') }}</span>
                  </p>
                </div>
                <button
                  class="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700"
                  :data-testid="`chat-gift-order-open-${order.id}`"
                  @click="openShoppingGiftOrder(order)"
                >
                  {{ t('去 Shopping 查看', 'View in Shopping') }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <section
          v-if="activeShoppingServiceLogisticsRows.length > 0"
          class="rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-2 text-xs text-sky-950"
          data-testid="chat-service-logistics-context"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold">{{ t('物流服务提醒', 'Logistics service reminders') }}</p>
              <p class="mt-1 text-[11px] leading-4 text-sky-700">
                {{
                  t(
                    'Chat 仅在物流服务号里显示配送线索；订单归 Shopping，提醒归 Calendar。',
                    'Chat only shows delivery cues inside Logistics service accounts; Shopping owns orders and Calendar owns reminders.',
                  )
                }}
              </p>
            </div>
            <span class="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-sky-600">
              {{ activeShoppingServiceLogisticsRows.length }}
            </span>
          </div>
          <div class="mt-2 space-y-1.5">
            <article
              v-for="row in activeShoppingServiceLogisticsRows"
              :key="row.id"
              class="rounded-xl border border-sky-100 bg-white/85 px-2.5 py-2"
              :data-testid="`chat-service-logistics-${row.id}`"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-semibold truncate">{{ row.title }}</p>
                  <p class="mt-0.5 text-[11px] text-sky-700">
                    {{ row.amount }} · {{ row.suggestedAt }}
                    <span v-if="row.itemCount > 1"> · {{ row.itemCount }} {{ t('件', 'items') }}</span>
                  </p>
                  <p class="mt-1 line-clamp-2 text-[11px] leading-4 text-sky-600">{{ row.summary }}</p>
                  <div
                    v-if="row.latestEvent"
                    class="mt-1 rounded-lg bg-sky-50 px-2 py-1 text-[11px] text-sky-700"
                    :data-testid="`chat-service-logistics-event-${row.id}`"
                  >
                    <p class="font-semibold">{{ row.latestEvent.typeLabel }} · {{ row.latestEvent.createdAtLabel }}</p>
                    <p class="mt-0.5 line-clamp-2 leading-4">
                      {{ row.latestEvent.summary || row.latestEvent.title }}
                    </p>
                  </div>
                </div>
                <div class="shrink-0 text-right">
                  <span
                    class="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700"
                    :data-testid="`chat-service-logistics-status-${row.id}`"
                  >
                    {{ row.statusLabel }}
                  </span>
                  <button
                    class="mt-1 block rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700"
                    :data-testid="`chat-service-logistics-open-${row.id}`"
                    @click="openShoppingLogisticsOrder(row)"
                  >
                    {{ t('去物流查看', 'Open logistics') }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section
          v-if="activeFoodDeliveryOrderRows.length > 0"
          class="rounded-2xl border border-orange-100 bg-orange-50/85 px-3 py-2 text-xs text-orange-950"
          data-testid="chat-food-delivery-context"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-semibold">{{ t('外卖服务号提醒', 'Food delivery service reminders') }}</p>
              <p class="mt-1 text-[11px] leading-4 text-orange-700">
                {{
                  t(
                    'Chat 仅显示外卖服务号推送；餐厅、菜单、订单与履约状态归 Food Delivery。',
                    'Chat only shows Food Delivery service pushes; restaurants, menus, orders and fulfillment state stay in Food Delivery.',
                  )
                }}
              </p>
            </div>
            <span class="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-orange-600">
              {{ activeFoodDeliveryOrderRows.length }}
            </span>
          </div>
          <div class="mt-2 space-y-1.5">
            <article
              v-for="row in activeFoodDeliveryOrderRows"
              :key="row.id"
              class="rounded-xl border border-orange-100 bg-white/85 px-2.5 py-2"
              :data-testid="`chat-food-delivery-${row.id}`"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-semibold truncate">{{ row.restaurantName }}</p>
                  <p class="mt-0.5 text-[11px] text-orange-700">
                    {{ row.title }} · {{ row.amount }} · {{ row.updatedAt }}
                    <span v-if="row.itemCount > 1"> · {{ row.itemCount }} {{ t('件', 'items') }}</span>
                  </p>
                  <p class="mt-1 line-clamp-2 text-[11px] leading-4 text-orange-600">{{ row.summary }}</p>
                  <div
                    v-if="row.latestEvent"
                    class="mt-1.5 rounded-lg border border-orange-100 bg-orange-50 px-2 py-1 text-[11px] leading-4 text-orange-700"
                    :data-testid="`chat-food-delivery-event-${row.id}`"
                  >
                    <p class="font-semibold">{{ row.latestEvent.typeLabel }} · {{ row.latestEvent.timeLabel }}</p>
                    <p class="mt-0.5 line-clamp-2">{{ row.latestEvent.detail }}</p>
                  </div>
                </div>
                <div class="shrink-0 text-right">
                  <span
                    class="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700"
                    :data-testid="`chat-food-delivery-status-${row.id}`"
                  >
                    {{ row.statusLabel }}
                  </span>
                  <button
                    class="mt-1 block rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700"
                    :data-testid="`chat-food-delivery-open-${row.id}`"
                    @click="openFoodDeliveryOrder(row)"
                  >
                    {{ t('去外卖查看', 'Open Food Delivery') }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <template v-for="item in activeThreadTimelineItems" :key="item.key">
          <div
            v-if="item.type === 'date-divider'"
            class="my-3 flex items-center justify-center"
            data-testid="chat-service-date-divider"
            :data-date-key="item.dayKey"
          >
            <span class="rounded-full bg-black/5 px-3 py-1 text-[10px] font-semibold text-gray-500">
              {{ item.label }}
            </span>
          </div>

          <div
            v-else-if="item.type === 'service-notification-batch-summary'"
            class="mx-auto mb-1 max-w-[88%] rounded-2xl border border-emerald-100 bg-white/80 px-3 py-2 text-center shadow-sm"
            data-testid="chat-service-notification-batch-summary"
          >
            <p class="text-[11px] font-semibold text-emerald-700">{{ item.title }}</p>
            <p v-if="item.detail" class="mt-0.5 line-clamp-1 text-[10px] text-gray-500">{{ item.detail }}</p>
          </div>

          <ChatMessageRow
            v-else
            :message="item.message"
            :layout-mode="activeChatMessageLayout"
            :active-self-avatar="activeSelfAvatar"
            :active-contact-avatar="activeContactAvatar"
            :is-group="activeChat?.kind === 'group'"
            :sender-name="activeMessageSenderName(item.message)"
            :message-blocks="messageBlocks"
            :render-markdown="renderMarkdown"
            :secondary-text-badge="secondaryTextBadge"
            :resolve-image-block-url="resolveImageBlockUrl"
            :format-voice-duration="formatVoiceDuration"
            :message-meta-hint-text="messageMetaHintText"
            :message-status-text="messageStatusText"
            :transfer-action-label="transferActionLabel"
            :can-reply-to-service-notification="canActiveChatCommunicate"
            :service-notification-density="item.serviceNotificationDensity"
            @open-message-actions="openMessageActions"
            @start-message-long-press="startMessageLongPress"
            @cancel-message-long-press="cancelMessageLongPress"
            @open-module-route="openModuleRoute"
            @open-external-url="openExternalUrl"
            @open-shopping-product-card="openShoppingProductCard"
            @open-share-card-route="openShareCardRoute"
            @open-service-notification-route="openServiceNotificationRoute"
            @quote-service-notification="quoteServiceNotification"
          />
        </template>

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

      <div class="p-3 chat-input border-t">
        <div class="space-y-2">
          <div
            v-if="activeServiceInteractionDock"
            class="rounded-2xl border px-3 py-2 text-[11px] shadow-sm"
            :class="activeServiceInteractionDockClasses"
            data-testid="chat-service-interaction-dock"
            :data-service-interaction-type="activeServiceInteractionDock.type"
          >
            <div class="flex items-start gap-2">
              <span class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/80">
                <i class="text-[11px]" :class="activeServiceInteractionDock.icon"></i>
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="font-semibold" data-testid="chat-service-interaction-dock-title">
                      {{ activeServiceInteractionDock.title }}
                    </p>
                    <p
                      v-if="activeServiceInteractionDock.context"
                      class="mt-0.5 truncate text-[10px] opacity-75"
                    >
                      {{ activeServiceInteractionDock.context }}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="shrink-0 rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[10px] font-semibold"
                    data-testid="chat-service-interaction-dock-dismiss"
                    @click="dismissActiveServiceInteractionDock"
                  >
                    {{ activeServiceInteractionDock.dismissLabel }}
                  </button>
                </div>
                <p class="mt-1 line-clamp-2 leading-4 opacity-80">
                  {{ activeServiceInteractionDock.detail }}
                </p>
                <button
                  v-if="activeServiceInteractionDock.primaryLabel"
                  type="button"
                  class="mt-1.5 rounded-full border border-black/10 bg-white px-3 py-1 text-[10px] font-semibold"
                  data-testid="chat-service-interaction-dock-primary"
                  @click="openActiveServiceInteractionDockPrimary"
                >
                  {{ activeServiceInteractionDock.primaryLabel }}
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="pendingQuote"
            class="rounded-2xl border border-gray-200 bg-white px-2.5 py-2 text-[11px] shadow-sm"
            data-testid="chat-pending-quote-bar"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-semibold text-gray-700">
                  {{ pendingQuoteLabel }}
                </p>
                <p class="mt-0.5 line-clamp-2 text-gray-600">{{ pendingQuote.preview }}</p>
              </div>
              <button @click="clearPendingQuote" class="shrink-0 px-1.5 py-0.5 rounded border border-gray-200 text-gray-500">
                {{ t('取消', 'Cancel') }}
              </button>
            </div>
          </div>

          <div
            v-if="aiErrorMessage"
            class="flex items-center justify-between gap-2 rounded-2xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700"
          >
            <span class="line-clamp-1">{{ aiErrorMessage }}</span>
            <div class="shrink-0 flex items-center gap-1">
              <button v-if="canRetryAi" @click="retryLastMessage" class="px-2 py-1 rounded border border-red-300 hover:bg-red-100">{{ t('重试', 'Retry') }}</button>
              <button v-if="canCancelAi" @click="cancelActiveRequest" class="px-2 py-1 rounded border border-red-300 hover:bg-red-100">{{ t('取消', 'Cancel') }}</button>
            </div>
          </div>

          <div
            v-else-if="uiNoticeMessage"
            class="rounded-2xl border px-2.5 py-1.5 text-[11px]"
            :class="
              uiNoticeType === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : uiNoticeType === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            "
          >
            <p class="line-clamp-2">{{ uiNoticeMessage }}</p>
          </div>

          <ChatUserActionPanel
            v-if="showUserActionPanel && canActiveChatCommunicate"
            :user-action-form-type="userActionFormType"
            :user-action-draft="userActionDraft"
            :gallery-send-state="gallerySendState"
            :location-share-state="locationShareState"
            :user-action-grid-hint="userActionGridHint"
            :link-form-state="linkFormState"
            :transfer-form-state="transferFormState"
            :currency-options="currencyOptions"
            :voice-form-state="voiceFormState"
            :gallery-picker-category="galleryPickerCategory"
            :gallery-picker-category-options="galleryPickerCategoryOptions"
            :active-role-asset-context="activeRoleAssetContext"
            :gallery-picker-assets="galleryPickerAssets"
            :gallery-picker-preview-map="galleryPickerPreviewMap"
            :shopping-preview-products="shoppingPreviewProducts"
            :suggestion-feature-enabled="suggestionFeatureEnabled"
            :loading-suggestions="loadingSuggestions"
            :loading-a-i="loadingAI"
            @trigger-media-picker="triggerUserMediaPicker"
            @open-form="openUserActionForm"
            @send-current-location="sendCurrentLocation"
            @back-to-grid="backToUserActionGrid"
            @submit-link-card-form="submitLinkCardForm"
            @submit-transfer-card-form="submitTransferCardForm"
            @submit-voice-card-form="submitVoiceCardForm"
            @send-product-card="submitShoppingProductCard"
            @update-user-action-draft="updateUserActionDraft"
            @update-gallery-picker-category="setGalleryPickerCategory"
            @submit-gallery-asset="submitGalleryAsset"
            @open-gallery="openModuleRoute('/gallery')"
            @open-shopping="openShoppingFromChat"
            @generate-smart-replies="generateSmartReplies"
            @close="closeUserActionPanel"
          />

          <input
            ref="userMediaInputRef"
            data-testid="chat-user-media-input"
            type="file"
            class="hidden"
            accept="image/*"
            @change="handleUserMediaPicked"
          />

          <div class="flex items-center gap-2">
            <button
              data-testid="chat-user-action-toggle"
              @click="toggleUserActionPanel"
              class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition border"
              :class="
                !canActiveChatCommunicate
                  ? 'bg-gray-100 border-gray-200 text-gray-300'
                  : showUserActionPanel
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600'
              "
              :disabled="!canActiveChatCommunicate"
            >
              <i class="fas fa-plus text-xs"></i>
            </button>

            <input
              ref="messageTextInputRef"
              v-model="inputMessage"
              @keyup.enter="sendTextMessage"
              type="text"
              class="min-w-0 flex-1 chat-input-field rounded-full px-4 py-2 text-sm outline-none"
              data-testid="chat-message-input"
              :disabled="!canActiveChatCommunicate"
              :placeholder="messageInputPlaceholder"
            />

            <button
              @click="requestPendingAiReply"
              data-testid="chat-trigger-reply"
              class="h-8 shrink-0 rounded-full border px-3 text-xs transition"
              :class="canRequestAiReply ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-100 text-gray-400'"
              :disabled="!canRequestAiReply"
            >
              {{ triggerReplyButtonLabel }}
            </button>

            <button
              @click="sendTextMessage"
              class="w-8 h-8 shrink-0 chat-send rounded-full flex items-center justify-center disabled:opacity-40"
              :disabled="!canActiveChatCommunicate"
            >
              <i class="fas fa-paper-plane text-xs"></i>
            </button>
          </div>
        </div>
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
              v-for="action in messageActionRows"
              :key="action.id"
              :class="messageActionButtonClass(action)"
              :data-testid="action.testId"
              @click="handleMessageAction(action.id, activeActionMessage)"
            >
              {{ action.label }}
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

      <ChatMessageEditModal
        v-if="showEditMessageModal"
        :editing-message-role="editingMessageRole"
        :editing-message-draft-text="editingMessageDraftText"
        :editing-message-rich-type="editingMessageRichType"
        :editing-message-rich-fields="editingMessageRichFields"
        :editing-message-rich-field-definitions="messageEditRichFieldDefinitions"
        :message-edit-state="messageEditState"
        @update:editing-message-draft-text="editingMessageDraftText = $event"
        @update:editing-message-rich-field="updateEditingMessageRichField"
        @close="closeMessageEditModal"
        @submit="submitMessageEdit"
      />
    </template>
  </div>
</template>
