<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useMapStore } from '../stores/map'
import { callAI, formatApiErrorForUi } from '../lib/ai'
import { useI18n } from '../composables/useI18n'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const mapStore = useMapStore()
const { systemLanguage, languageBase, t } = useI18n()

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

// Keep AI reply content independent from global UI language.
const AI_REPLY_FALLBACK_TEXT = Object.freeze({
  voiceLabel: '语音消息',
  moduleLabel: '打开模块',
  transferLabel: '转账卡片',
  imageAlt: '图片消息',
  sceneTitle: '小剧场',
})

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

const inputMessage = ref('')
const chatContainer = ref(null)
const loadingSuggestions = ref(false)
const suggestions = ref([])
const showSuggestions = ref(false)
const aiErrorMessage = ref('')
const activeAbortController = ref(null)
const activeTriggerMessageId = ref('')
const retryTriggerMessageId = ref('')
const retryRerollMessageId = ref('')
const showThreadMenu = ref(false)
const serviceTemplateDraft = ref('')
const activeMessageActionId = ref('')
const pendingQuote = ref(null)
const lastManualActionAt = ref(0)
let autoInvokeTimerId = null

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
  autoInvokeEnabled: DEFAULT_THREAD_AI_PREFS.autoInvokeEnabled,
  autoInvokeIntervalSec: DEFAULT_THREAD_AI_PREFS.autoInvokeIntervalSec,
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

const currentStatus = computed(() => {
  const statusId = typeof user.value.chatStatus === 'string' ? user.value.chatStatus : 'idle'
  return STATUS_OPTIONS.value.find((item) => item.id === statusId) || STATUS_OPTIONS.value[0]
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

const stripCodeFence = (text) => (text || '').replace(/```json/gi, '').replace(/```/g, '').trim()

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const goHome = () => router.push('/home')
const leaveChat = () => router.push('/chat')

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
  threadSettingsDraft.autoInvokeEnabled = Boolean(prefs.autoInvokeEnabled)
  threadSettingsDraft.autoInvokeIntervalSec = clampAutoInvokeInterval(prefs.autoInvokeIntervalSec)
}

const buildSystemPrompt = (contact, aiPrefs, options = {}) => {
  const contactKind = contact.kind || 'role'
  const typeLabel =
    contactKind === 'group' ? 'group chat' : contactKind === 'service' ? 'service account' : contactKind === 'official' ? 'official account' : 'role chat'

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

  return `
Worldbook: ${user.value.worldBook}
User: ${user.value.name}, ${user.value.bio}
Conversation type: ${typeLabel}
Your role: ${contact.name} (${contact.role})
${serviceInstruction}
Response style: ${responseStyle}
Target reply count: ${targetReplyCount}
${proactiveInstruction}
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
- Optional block types: module_link, transfer_virtual, image_virtual, mini_scene.
- Each message must include at least one text block.
`
}

const extractMessageTextForContext = (message) => {
  if (!message) return ''
  if (typeof message.content === 'string' && message.content.trim()) return message.content.trim()
  if (!Array.isArray(message.blocks)) return ''

  return message.blocks
    .map((block) => {
      if (!block || typeof block !== 'object') return ''
      if (block.type === 'text') return block.text || ''
      if (block.type === 'voice_virtual') return `[voice] ${block.transcript || block.label || ''}`
      if (block.type === 'module_link') return `[link] ${block.label || ''}`
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

const toAiMessages = (contactId, untilMessageId = '', options = {}) => {
  const allMessages = chatStore.getMessagesByContactId(contactId)
  const result = []

  for (const item of allMessages) {
    result.push({ role: item.role, content: extractMessageTextForContext(item) })
    if (untilMessageId && item.id === untilMessageId) break
  }

  const contextTurns = clampContextTurns(options.contextTurns ?? DEFAULT_THREAD_AI_PREFS.contextTurns)
  const messageLimit = Math.max(6, contextTurns * 2)
  return result.slice(-messageLimit)
}

const toAiMessagesBeforeMessage = (contactId, targetMessageId, options = {}) => {
  const allMessages = chatStore.getMessagesByContactId(contactId)
  const result = []

  for (const item of allMessages) {
    if (item.id === targetMessageId) break
    result.push({ role: item.role, content: extractMessageTextForContext(item) })
  }

  const contextTurns = clampContextTurns(options.contextTurns ?? DEFAULT_THREAD_AI_PREFS.contextTurns)
  const messageLimit = Math.max(6, contextTurns * 2)
  return result.slice(-messageLimit)
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

const maybeRunAutoInvokeForContact = async (contactId) => {
  const now = Date.now()
  const runtimePolicy = getChatAutomationRuntimePolicy(now)
  if (!runtimePolicy.enabled) {
    chatStore.setConversationAutoState(contactId, { autoNextAt: 0 })
    return
  }

  const aiPrefs = chatStore.getConversationAiPrefs(contactId)
  if (!aiPrefs.autoInvokeEnabled) {
    chatStore.setConversationAutoState(contactId, { autoNextAt: 0 })
    return
  }

  const conversation = chatStore.getConversationByContactId(contactId)
  if (conversation.autoNextAt && now + 250 < conversation.autoNextAt) return

  if (loadingAI.value || activeAbortController.value) {
    resetConversationAutoNextAt(contactId, now + getAutomationCooldownMs())
    return
  }

  if (now - lastManualActionAt.value <= MANUAL_PRIORITY_GUARD_MS) {
    resetConversationAutoNextAt(contactId, now)
    return
  }

  if (runtimePolicy.notifyOnly) {
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
    return
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
    return
  }

  const locked = systemStore.tryAcquireAutoExecution(
    CHAT_AUTOMATION_MODULE_KEY,
    `contact:${contactId}`,
  )
  if (!locked) {
    resetConversationAutoNextAt(contactId, now + getAutomationCooldownMs())
    return
  }

  try {
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
    } else {
      resetConversationAutoNextAt(contactId, Date.now() + getAutomationCooldownMs())
    }
  } finally {
    systemStore.releaseAutoExecution(CHAT_AUTOMATION_MODULE_KEY)
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
    // Keep execution sequential so manual-priority and dedupe decisions stay deterministic.
    await maybeRunAutoInvokeForContact(contactId)
  }

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
  const contact = contactsForList.value.find((item) => item.id === contactId)
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

const normalizeAssistantReplyType = (replyType, aiPrefs) => {
  const input = typeof replyType === 'string' ? replyType : 'plain'
  if (!aiPrefs.allowQuoteReply) return 'plain'
  if (input === 'quote_self' && !aiPrefs.allowSelfQuote) return 'plain'
  if (['plain', 'quote_user', 'quote_self'].includes(input)) return input
  return 'plain'
}

const normalizeAssistantQuote = (rawQuote) => {
  if (!rawQuote || typeof rawQuote !== 'object') return null
  const preview = typeof rawQuote.preview === 'string' ? rawQuote.preview.trim() : ''
  if (!preview) return null
  return {
    messageId: typeof rawQuote.messageId === 'string' ? rawQuote.messageId : '',
    role: rawQuote.role === 'assistant' ? 'assistant' : 'user',
    preview,
  }
}

const normalizeAssistantBlock = (rawBlock, aiPrefs) => {
  if (!rawBlock || typeof rawBlock !== 'object') return null
  const blockType = typeof rawBlock.type === 'string' ? rawBlock.type : 'text'

  if (blockType === 'text') {
    const text = typeof rawBlock.text === 'string' ? rawBlock.text : ''
    if (!text.trim()) return null
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
      label:
        typeof rawBlock.label === 'string' && rawBlock.label.trim()
          ? rawBlock.label.trim()
          : AI_REPLY_FALLBACK_TEXT.voiceLabel,
      transcript: typeof rawBlock.transcript === 'string' ? rawBlock.transcript : '',
      durationSec: Number.isFinite(Number(rawBlock.durationSec)) ? Math.max(1, Math.floor(Number(rawBlock.durationSec))) : 8,
    }
  }

  if (blockType === 'module_link') {
    return {
      type: 'module_link',
      label:
        typeof rawBlock.label === 'string' && rawBlock.label.trim()
          ? rawBlock.label.trim()
          : AI_REPLY_FALLBACK_TEXT.moduleLabel,
      route: typeof rawBlock.route === 'string' && rawBlock.route.trim() ? rawBlock.route.trim() : '/home',
      note: typeof rawBlock.note === 'string' ? rawBlock.note : '',
    }
  }

  if (blockType === 'transfer_virtual') {
    return {
      type: 'transfer_virtual',
      label:
        typeof rawBlock.label === 'string' && rawBlock.label.trim()
          ? rawBlock.label.trim()
          : AI_REPLY_FALLBACK_TEXT.transferLabel,
      amount: typeof rawBlock.amount === 'string' && rawBlock.amount.trim() ? rawBlock.amount.trim() : '0.00',
      currency: typeof rawBlock.currency === 'string' && rawBlock.currency.trim() ? rawBlock.currency.trim() : 'CNY',
      to: typeof rawBlock.to === 'string' ? rawBlock.to : '',
      note: typeof rawBlock.note === 'string' ? rawBlock.note : '',
      actionRoute:
        typeof rawBlock.actionRoute === 'string' && rawBlock.actionRoute.trim() ? rawBlock.actionRoute.trim() : '/wallet',
    }
  }

  if (blockType === 'image_virtual') {
    return {
      type: 'image_virtual',
      alt:
        typeof rawBlock.alt === 'string' && rawBlock.alt.trim()
          ? rawBlock.alt.trim()
          : AI_REPLY_FALLBACK_TEXT.imageAlt,
      url: typeof rawBlock.url === 'string' ? rawBlock.url : '',
      caption: typeof rawBlock.caption === 'string' ? rawBlock.caption : '',
    }
  }

  if (blockType === 'mini_scene') {
    return {
      type: 'mini_scene',
      title:
        typeof rawBlock.title === 'string' && rawBlock.title.trim()
          ? rawBlock.title.trim()
          : AI_REPLY_FALLBACK_TEXT.sceneTitle,
      description: typeof rawBlock.description === 'string' ? rawBlock.description : '',
      htmlSnippet: typeof rawBlock.htmlSnippet === 'string' ? rawBlock.htmlSnippet : '',
    }
  }

  return null
}

const resolveAssistantQuote = (rawQuote, replyType) => {
  if (replyType === 'plain') return null
  const normalizedQuote = normalizeAssistantQuote(rawQuote)
  if (!normalizedQuote) return null
  if (replyType === 'quote_user' && normalizedQuote.role !== 'user') return { ...normalizedQuote, role: 'user' }
  if (replyType === 'quote_self' && normalizedQuote.role !== 'assistant') return { ...normalizedQuote, role: 'assistant' }
  return normalizedQuote
}

const ensureAssistantTextBlock = (blocks, fallbackText = '...') => {
  const normalizedBlocks = Array.isArray(blocks) ? [...blocks] : []
  const hasTextBlock = normalizedBlocks.some((block) => block.type === 'text' && block.text?.trim())
  if (hasTextBlock) return normalizedBlocks
  normalizedBlocks.push({ type: 'text', text: fallbackText || '...', variant: 'primary', lang: 'auto' })
  return normalizedBlocks
}

const normalizeAssistantMessagePayload = (rawMessage, aiPrefs, fallbackText = '...') => {
  const payload = rawMessage && typeof rawMessage === 'object' ? rawMessage : {}
  const replyType = normalizeAssistantReplyType(payload.replyType, aiPrefs)

  let parsedBlocks = Array.isArray(payload.blocks)
    ? payload.blocks.map((block) => normalizeAssistantBlock(block, aiPrefs)).filter(Boolean)
    : []

  if (!aiPrefs.bilingualEnabled) {
    parsedBlocks = parsedBlocks.filter((block) => !(block.type === 'text' && block.variant === 'secondary'))
  }

  parsedBlocks = ensureAssistantTextBlock(parsedBlocks, fallbackText)
  const primaryTextBlock = parsedBlocks.find((block) => block.type === 'text' && block.variant !== 'secondary')
  const content = primaryTextBlock?.text || parsedBlocks.find((block) => block.type === 'text')?.text || fallbackText

  return {
    content: content || fallbackText || '...',
    blocks: parsedBlocks,
    quote: resolveAssistantQuote(payload.quote, replyType),
    replyType,
  }
}

const parseAssistantResponse = (rawText, aiPrefs, options = {}) => {
  const text = typeof rawText === 'string' ? rawText : ''
  const cleanText = stripCodeFence(text)
  const expectedReplyCount = clampReplyCount(options.replyCount ?? aiPrefs.replyCount)

  try {
    const parsed = JSON.parse(cleanText)
    if (!parsed || typeof parsed !== 'object') throw new Error('Response is not object')

    const rawMessages = Array.isArray(parsed.messages) ? parsed.messages : [parsed]
    const normalizedMessages = rawMessages
      .map((item) => normalizeAssistantMessagePayload(item, aiPrefs, cleanText || '...'))
      .filter(Boolean)

    if (!normalizedMessages.length) {
      return { messages: [normalizeAssistantMessagePayload({}, aiPrefs, cleanText || '...')] }
    }

    return { messages: normalizedMessages.slice(0, expectedReplyCount) }
  } catch {
    return { messages: [normalizeAssistantMessagePayload({}, aiPrefs, cleanText || '...')] }
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

const generateAIResponse = async (contactId, triggerMessageId, options = {}) => {
  const contact = contactsForList.value.find((item) => item.id === contactId)
  if (!contact) throw new Error('Contact not found')

  const aiPrefs = chatStore.getConversationAiPrefs(contactId)
  const replyCount = clampReplyCount(options.replyCount ?? aiPrefs.replyCount)

  const replyRaw = await callAI({
    messages: toAiMessages(contactId, triggerMessageId, { contextTurns: aiPrefs.contextTurns }),
    systemPrompt: buildSystemPrompt(contact, aiPrefs, {
      replyCount,
      isProactive: Boolean(options.isProactive),
    }),
    settings: settings.value,
    signal: options.signal,
  })

  const parsed = parseAssistantResponse(replyRaw, aiPrefs, { replyCount })
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
      },
      status: 'sent',
    })
  })

  if (activeChatId.value === contactId) {
    chatStore.markConversationRead(contactId)
  } else {
    chatStore.incrementConversationUnread(contactId, parsedMessages.length || 1)
  }

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
  const replyRaw = await callAI({
    messages: toAiMessagesBeforeMessage(contactId, targetMessage.id, {
      contextTurns: aiPrefs.contextTurns,
    }),
    systemPrompt: buildSystemPrompt(contact, aiPrefs, {
      replyCount: 1,
      isProactive: false,
    }),
    settings: settings.value,
    signal: options.signal,
  })

  const parsed = parseAssistantResponse(replyRaw, aiPrefs, { replyCount: 1 })
  const normalized = parsed.messages?.[0] || normalizeAssistantMessagePayload({}, aiPrefs, '...')
  return {
    ...normalized,
    aiMeta: {
      replyType: normalized.replyType,
      bilingual: Boolean(aiPrefs.bilingualEnabled),
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
  if (!isAutoSource) {
    markManualAction()
  }
  const normalizedTriggerId = triggerMessageId || MANUAL_TRIGGER_ID
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

const toggleMessageActions = (messageId) => {
  activeMessageActionId.value = activeMessageActionId.value === messageId ? '' : messageId
}

const closeMessageActions = () => {
  activeMessageActionId.value = ''
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
    alert(t('复制失败，请稍后重试。', 'Copy failed. Please retry.'))
  }
  closeMessageActions()
}

const canEditMessage = (message) => Boolean(message && message.role === 'user')
const canRerollMessage = (message) => Boolean(message && message.role === 'assistant')

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

const editMessage = (message) => {
  if (!activeChat.value || !canEditMessage(message)) return

  const currentText = messagePrimaryText(message)
  const input = window.prompt(t('编辑消息', 'Edit message'), currentText)
  if (input === null) {
    closeMessageActions()
    return
  }

  const nextText = input.trim()
  if (!nextText) {
    alert(t('消息不能为空。', 'Message cannot be empty.'))
    return
  }

  const ok = chatStore.updateMessageContent(activeChat.value.id, message.id, nextText, {
    markEdited: true,
    editedAt: Date.now(),
  })
  if (!ok) {
    alert(t('编辑失败，请重试。', 'Edit failed. Please retry.'))
    return
  }
  closeMessageActions()
}

const deleteMessage = (message) => {
  if (!activeChat.value || !message) return
  const ok = window.confirm(t('确认删除这条消息吗？', 'Delete this message?'))
  if (!ok) return

  const removed = chatStore.removeMessage(activeChat.value.id, message.id)
  if (!removed) {
    alert(t('删除失败，请重试。', 'Delete failed. Please retry.'))
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

const sendMessage = () => {
  if (!inputMessage.value.trim() || !activeChat.value) return

  const chatId = activeChat.value.id
  const payload = inputMessage.value.trim()
  const quotePayload = pendingQuote.value
    ? {
        messageId: pendingQuote.value.messageId,
        role: pendingQuote.value.role === 'assistant' ? 'assistant' : 'user',
        preview: pendingQuote.value.preview || '',
      }
    : null

  const appended = chatStore.appendMessage(chatId, {
    role: 'user',
    content: payload,
    quote: quotePayload,
    status: 'delivered',
  })
  resetConversationAutoNextAt(chatId, Date.now())

  inputMessage.value = ''
  pendingQuote.value = null
  chatStore.setConversationDraft(chatId, '')
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
}

const sendCurrentLocation = () => {
  if (!activeChat.value) return

  const locationText = currentLocationText.value
  if (!locationText || locationText.includes('未设置') || locationText.toLowerCase().includes('not set')) {
    alert(t('请先在地图中设置当前位置。', 'Please set your location in Map first.'))
    return
  }

  const chatId = activeChat.value.id
  const payload = `${t('位置共享', 'Location share')}\n${locationText}`
  const quotePayload = pendingQuote.value
    ? {
        messageId: pendingQuote.value.messageId,
        role: pendingQuote.value.role === 'assistant' ? 'assistant' : 'user',
        preview: pendingQuote.value.preview || '',
      }
    : null
  const appended = chatStore.appendMessage(chatId, {
    role: 'user',
    content: payload,
    quote: quotePayload,
    status: 'delivered',
  })
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
}

const useSuggestion = (text) => {
  inputMessage.value = text
}

const renderMarkdown = (text) => marked.parse(text || '')
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
  if (message.role === 'assistant' && message.aiMeta?.rerollOf) return t('重roll结果', 'Rerolled')
  if (message.editedAt) return t('已编辑', 'Edited')
  return ''
}

const messageBlocks = (message) => {
  if (Array.isArray(message?.blocks) && message.blocks.length > 0) return message.blocks
  return [{ type: 'text', text: message?.content || '', variant: 'primary', lang: 'auto' }]
}

const formatVoiceDuration = (durationSec) => {
  const total = Number.isFinite(Number(durationSec)) ? Math.max(1, Math.floor(Number(durationSec))) : 8
  const minute = Math.floor(total / 60)
  const second = `${total % 60}`.padStart(2, '0')
  return `${minute}:${second}`
}

const openModuleRoute = (routePath) => {
  if (typeof routePath !== 'string' || !SAFE_MODULE_ROUTES.has(routePath)) {
    alert(t('该链接暂不可用。', 'This link is unavailable.'))
    return
  }
  router.push(routePath)
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
    serviceTemplateDraft.value = activeChat.value?.serviceTemplate || ''
    applyThreadSettingsDraft()
  }
}

const saveServiceTemplate = () => {
  if (!activeChat.value || !isActiveServiceChat.value) return
  chatStore.updateContact(activeChat.value.id, {
    serviceTemplate: serviceTemplateDraft.value.trim(),
  })
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

  showThreadMenu.value = false
  scheduleAutoInvokeTick()
}

watch(
  activeChatId,
  (id) => {
    showThreadMenu.value = false
    activeMessageActionId.value = ''
    pendingQuote.value = null

    if (id) {
      chatStore.ensureConversationForContact(id)
      chatStore.markConversationRead(id)
      inputMessage.value = chatStore.getConversationByContactId(id).draft || ''
      applyThreadSettingsDraft()
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
  chatStore.normalizeAutoInvokeCheckpoints(Date.now())
  void runDueAutoInvokes()
  window.addEventListener('focus', handleWindowFocus)
  document.addEventListener('visibilitychange', handleVisibilityResume)
})

onBeforeUnmount(() => {
  // Keep in-flight AI work running so lock screen can receive completion notifications.
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('visibilitychange', handleVisibilityResume)
  clearAutoInvokeTimer()
  systemStore.releaseAutoExecution(CHAT_AUTOMATION_MODULE_KEY)
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
            <img :src="contact.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + contact.name" class="w-full h-full object-cover" />
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
    </template>

    <template v-else>
      <div class="pt-12 pb-2 px-3 chat-thread-header backdrop-blur flex items-center justify-between z-10 shadow-sm">
        <button @click="leaveChat" class="chat-ink px-2 flex items-center gap-1 w-16">{{ t('返回', 'Back') }}</button>
        <div class="flex-1 text-center min-w-0">
          <p class="font-bold text-sm truncate">{{ activeChat.name }}</p>
          <p class="text-[10px] text-gray-500">
            <span v-if="contactKindTag(activeChat)">{{ contactKindTag(activeChat) }}</span>
            <span v-if="contactKindTag(activeChat) && loadingAI"> · </span>
            <span v-if="loadingAI">{{ t('对方正在输入...', 'Typing...') }}</span>
          </p>
        </div>
        <button @click="toggleThreadMenu" class="chat-ink px-2 w-16 text-right"><i class="fas fa-bars"></i></button>
      </div>

      <div v-if="showThreadMenu" class="mx-3 mt-2 rounded-2xl border border-gray-200 bg-white/90 backdrop-blur p-3 text-xs text-gray-600 space-y-3">
        <template v-if="isActiveServiceChat">
          <div class="space-y-2">
            <p class="font-semibold text-sm text-gray-900">{{ t('服务模板', 'Service Template') }}</p>
            <textarea v-model="serviceTemplateDraft" rows="3" class="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs resize-none outline-none" />
            <button @click="saveServiceTemplate" class="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700">
              {{ t('保存模板', 'Save Template') }}
            </button>
          </div>
        </template>

        <div class="border-t border-gray-200 pt-3 space-y-2">
          <p class="font-semibold text-sm text-gray-900">{{ t('当前会话 AI 设置', 'Thread AI Settings') }}</p>

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
            <button @click="saveThreadSettings" class="px-2.5 py-1 rounded-lg border border-blue-300 bg-blue-50 text-blue-700">{{ t('保存', 'Save') }}</button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar" ref="chatContainer">
        <div v-for="msg in activeMessages" :key="msg.id" class="flex w-full" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
          <div v-if="msg.role !== 'user'" class="w-8 h-8 rounded-xl bg-gray-200 mr-2 overflow-hidden flex-shrink-0">
            <img :src="activeChat.avatar" class="w-full h-full object-cover" />
          </div>

          <div class="max-w-[70%]">
            <div class="px-3 py-2 pr-8 text-sm rounded-xl shadow-sm relative" :class="msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'">
              <button
                class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full text-[10px] inline-flex items-center justify-center border border-black/10 bg-white/60"
                @click.stop="toggleMessageActions(msg.id)"
              >
                <i class="fas fa-ellipsis-h"></i>
              </button>

              <div v-if="msg.quote" class="mb-2 rounded-lg border border-white/40 bg-black/5 px-2 py-1 text-[11px] leading-4">
                <p class="font-semibold opacity-80">{{ msg.quote.role === 'assistant' ? t('引用 AI', 'Quoted assistant') : t('引用用户', 'Quoted user') }}</p>
                <p class="line-clamp-2">{{ msg.quote.preview }}</p>
              </div>

              <div v-for="(block, blockIndex) in messageBlocks(msg)" :key="`${msg.id}-block-${blockIndex}`" class="mt-1 first:mt-0">
                <div v-if="block.type === 'text'" class="markdown-body" :class="block.variant === 'secondary' ? 'text-[12px] opacity-85 border-t border-black/10 pt-1 mt-1' : ''" v-html="renderMarkdown(block.text)"></div>

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

                <div v-else-if="block.type === 'transfer_virtual'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
                  <p class="text-[12px] font-semibold">{{ block.label }}</p>
                  <p class="text-base font-bold">{{ block.amount }} {{ block.currency }}</p>
                  <p class="text-[11px] opacity-75" v-if="block.to">{{ t('收款方', 'To') }}: {{ block.to }}</p>
                  <p class="text-[11px] opacity-75" v-if="block.note">{{ t('备注', 'Note') }}: {{ block.note }}</p>
                  <button @click="openModuleRoute(block.actionRoute)" class="mt-2 px-2 py-1 rounded-md border border-black/15 text-[11px]">{{ transferActionLabel(block) }}</button>
                </div>

                <div v-else-if="block.type === 'image_virtual'" class="rounded-lg border border-black/10 bg-white/60 px-2.5 py-2">
                  <div class="w-full h-24 rounded-md bg-black/5 overflow-hidden mb-1.5">
                    <img v-if="block.url" :src="block.url" class="w-full h-full object-cover" />
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

            <div
              v-if="activeMessageActionId === msg.id"
              class="mt-1.5 flex flex-wrap gap-1.5"
              :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <button
                class="px-2 py-1 rounded-md border border-gray-200 bg-white text-[11px]"
                @click="quoteMessage(msg)"
              >
                {{ t('引用', 'Quote') }}
              </button>
              <button
                class="px-2 py-1 rounded-md border border-gray-200 bg-white text-[11px]"
                @click="copyMessage(msg)"
              >
                {{ t('复制', 'Copy') }}
              </button>
              <button
                v-if="canEditMessage(msg)"
                class="px-2 py-1 rounded-md border border-gray-200 bg-white text-[11px]"
                @click="editMessage(msg)"
              >
                {{ t('编辑', 'Edit') }}
              </button>
              <button
                v-if="canRerollMessage(msg)"
                class="px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-[11px]"
                @click="rerollMessage(msg)"
              >
                {{ t('重roll', 'Reroll') }}
              </button>
              <button
                class="px-2 py-1 rounded-md border border-red-200 bg-red-50 text-red-600 text-[11px]"
                @click="deleteMessage(msg)"
              >
                {{ t('删除', 'Delete') }}
              </button>
            </div>
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

        <button @click="sendCurrentLocation" class="w-8 h-8 rounded-full flex items-center justify-center transition bg-cyan-500 text-white shadow-md">
          <i class="fas fa-location-dot text-xs"></i>
        </button>

        <button
          v-if="suggestionFeatureEnabled"
          @click="generateSmartReplies"
          class="w-8 h-8 rounded-full flex items-center justify-center transition"
          :class="loadingSuggestions || loadingAI ? 'bg-gray-100 text-gray-400' : 'chat-magic shadow-md animate-pulse'"
          :disabled="loadingSuggestions || loadingAI"
        >
          <i v-if="loadingSuggestions" class="fas fa-spinner fa-spin"></i>
          <i v-else class="fas fa-wand-magic-sparkles text-xs"></i>
        </button>

        <input
          v-model="inputMessage"
          @keyup.enter="sendMessage"
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

        <button @click="sendMessage" class="w-8 h-8 chat-send rounded-full flex items-center justify-center">
          <i class="fas fa-paper-plane text-xs"></i>
        </button>
      </div>
    </template>
  </div>
</template>
