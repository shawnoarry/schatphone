import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, writePersistedState } from '../lib/persistence'

const CHAT_STORAGE_KEY = 'store:chat'
const CHAT_STORAGE_VERSION = 2
const VALID_MESSAGE_ROLES = new Set(['user', 'assistant', 'system'])
const VALID_MESSAGE_STATUS = new Set(['sending', 'sent', 'failed', 'delivered', 'read'])
const VALID_CONTACT_KINDS = new Set(['role', 'group', 'service', 'official'])
const VALID_REPLY_MODES = new Set(['manual', 'auto'])
const VALID_RESPONSE_STYLES = new Set(['immersive', 'natural', 'concise'])
const VALID_PROACTIVE_STRATEGIES = new Set(['on_enter_once', 'on_every_enter_if_empty'])
const MIN_AUTO_INVOKE_INTERVAL_SEC = 60
const MAX_AUTO_INVOKE_INTERVAL_SEC = 86400
const VALID_BLOCK_TYPES = new Set([
  'text',
  'voice_virtual',
  'module_link',
  'transfer_virtual',
  'image_virtual',
  'mini_scene',
])
const VALID_REPLY_TYPES = new Set(['plain', 'quote_user', 'quote_self'])
const MAX_TEXT_BLOCK_LENGTH = 3000
const MAX_DETAIL_TEXT_LENGTH = 800
const MAX_SHORT_LABEL_LENGTH = 80
const MAX_QUOTE_PREVIEW_LENGTH = 240
const MAX_QUOTE_MESSAGE_ID_LENGTH = 128
const MAX_BLOCK_COUNT = 16
const SAFE_ROUTE_FALLBACK = '/home'
const SAFE_TRANSFER_ROUTE_FALLBACK = '/wallet'

const DEFAULT_CONVERSATION_AI_PREFS = {
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

const DEFAULT_ROLE_PROFILES = [
  {
    id: 1,
    name: 'Eva',
    role: '私人 AI 助手',
    isMain: true,
    avatar: '',
    lastMessage: '今天有什么安排吗？',
    bio: '你是一个高智能、温和体贴的 AI 助手，名字叫 Eva。你会优先考虑用户(V)的安全，表达清晰简洁。',
  },
  {
    id: 2,
    name: 'Jackie',
    role: '雇佣兵搭档',
    isMain: false,
    avatar: '',
    lastMessage: '嗨，兄弟，今晚去来生酒吧喝一杯？',
    bio: '你是 Jackie Welles，重情重义、性格豪爽，梦想成为夜之城的传奇。你非常信任 V。',
  },
]

const DEFAULT_CONTACTS = [
  {
    id: 1,
    profileId: 1,
    name: 'Eva',
    kind: 'role',
    relationshipLevel: 60,
    relationshipNote: '',
    lastMessage: '今天有什么安排吗？',
  },
  {
    id: 2,
    profileId: 2,
    name: 'Jackie',
    kind: 'role',
    relationshipLevel: 70,
    relationshipNote: '',
    lastMessage: '嗨，兄弟，今晚去来生酒吧喝一杯？',
  },
]

const DEFAULT_CHAT_HISTORY = {
  1: [{ role: 'assistant', content: '早安，V。一切系统状态正常。' }],
  2: [{ role: 'assistant', content: '嗨，兄弟，今晚去来生酒吧喝一杯？' }],
}

const nowTs = () => Date.now()
const randomToken = () => Math.random().toString(36).slice(2, 8)
const messageId = () => `msg_${nowTs()}_${randomToken()}`
const fallbackConversationId = (contactId) => `conv_${contactId}`

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const trimTo = (value, maxLength, fallback = '') => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return fallback
  if (!Number.isFinite(Number(maxLength)) || maxLength <= 0) return text
  return text.length <= maxLength ? text : text.slice(0, maxLength)
}

const normalizeSingleLineText = (value, maxLength, fallback = '') =>
  trimTo(value, maxLength, fallback).replace(/\s+/g, ' ').trim()

const sanitizeRoutePath = (value, fallback = SAFE_ROUTE_FALLBACK) => {
  const route = trimTo(value, 200)
  if (!route) return fallback
  if (!route.startsWith('/') || route.startsWith('//')) return fallback
  if (/\s/.test(route)) return fallback
  if (/^javascript:/i.test(route)) return fallback
  return route
}

const sanitizeImageUrl = (value) => {
  const url = trimTo(value, 500)
  if (!url) return ''
  if (url.startsWith('/')) return url
  if (/^https?:\/\//i.test(url)) return url
  return ''
}

const sanitizeHtmlSnippet = (value) => {
  const html = trimTo(value, 4000)
  if (!html) return ''
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
}

const resetReactiveObject = (obj) => {
  if (Array.isArray(obj)) {
    obj.splice(0, obj.length)
    return
  }
  Object.keys(obj).forEach((key) => {
    delete obj[key]
  })
}

const normalizeConversationAiPrefs = (rawPrefs) => {
  const input = rawPrefs && typeof rawPrefs === 'object' ? rawPrefs : {}
  const contextTurns = clamp(toInt(input.contextTurns, DEFAULT_CONVERSATION_AI_PREFS.contextTurns), 2, 20)
  const replyCount = clamp(toInt(input.replyCount, DEFAULT_CONVERSATION_AI_PREFS.replyCount), 1, 3)
  const autoInvokeIntervalSec = clamp(
    toInt(
      input.autoInvokeIntervalSec,
      DEFAULT_CONVERSATION_AI_PREFS.autoInvokeIntervalSec,
    ),
    MIN_AUTO_INVOKE_INTERVAL_SEC,
    MAX_AUTO_INVOKE_INTERVAL_SEC,
  )

  return {
    suggestedRepliesEnabled: Boolean(input.suggestedRepliesEnabled),
    contextTurns,
    bilingualEnabled: Boolean(input.bilingualEnabled),
    secondaryLanguage:
      typeof input.secondaryLanguage === 'string' && input.secondaryLanguage.trim()
        ? input.secondaryLanguage.trim()
        : DEFAULT_CONVERSATION_AI_PREFS.secondaryLanguage,
    allowQuoteReply:
      typeof input.allowQuoteReply === 'boolean'
        ? input.allowQuoteReply
        : DEFAULT_CONVERSATION_AI_PREFS.allowQuoteReply,
    allowSelfQuote:
      typeof input.allowSelfQuote === 'boolean'
        ? input.allowSelfQuote
        : DEFAULT_CONVERSATION_AI_PREFS.allowSelfQuote,
    virtualVoiceEnabled:
      typeof input.virtualVoiceEnabled === 'boolean'
        ? input.virtualVoiceEnabled
        : DEFAULT_CONVERSATION_AI_PREFS.virtualVoiceEnabled,
    replyMode:
      typeof input.replyMode === 'string' && VALID_REPLY_MODES.has(input.replyMode)
        ? input.replyMode
        : DEFAULT_CONVERSATION_AI_PREFS.replyMode,
    replyCount,
    responseStyle:
      typeof input.responseStyle === 'string' && VALID_RESPONSE_STYLES.has(input.responseStyle)
        ? input.responseStyle
        : DEFAULT_CONVERSATION_AI_PREFS.responseStyle,
    proactiveOpenerEnabled:
      typeof input.proactiveOpenerEnabled === 'boolean'
        ? input.proactiveOpenerEnabled
        : DEFAULT_CONVERSATION_AI_PREFS.proactiveOpenerEnabled,
    proactiveOpenerStrategy:
      typeof input.proactiveOpenerStrategy === 'string' && VALID_PROACTIVE_STRATEGIES.has(input.proactiveOpenerStrategy)
        ? input.proactiveOpenerStrategy
        : DEFAULT_CONVERSATION_AI_PREFS.proactiveOpenerStrategy,
    autoInvokeEnabled:
      typeof input.autoInvokeEnabled === 'boolean'
        ? input.autoInvokeEnabled
        : DEFAULT_CONVERSATION_AI_PREFS.autoInvokeEnabled,
    autoInvokeIntervalSec,
  }
}

const normalizeMessageQuote = (rawQuote) => {
  if (!rawQuote || typeof rawQuote !== 'object') return null

  const preview = trimTo(rawQuote.preview, MAX_QUOTE_PREVIEW_LENGTH)
  if (!preview) return null

  const role = rawQuote.role === 'assistant' ? 'assistant' : 'user'
  const messageIdValue = trimTo(rawQuote.messageId, MAX_QUOTE_MESSAGE_ID_LENGTH)

  return {
    messageId: messageIdValue,
    role,
    preview,
  }
}

const normalizeMessageMeta = (rawMeta) => {
  if (!rawMeta || typeof rawMeta !== 'object') return null

  const replyType = VALID_REPLY_TYPES.has(rawMeta.replyType) ? rawMeta.replyType : 'plain'
  const bilingual = Boolean(rawMeta.bilingual)
  const rerollOf =
    typeof rawMeta.rerollOf === 'string' && rawMeta.rerollOf.trim() ? rawMeta.rerollOf.trim() : ''

  const output = {
    replyType,
    bilingual,
  }
  if (rerollOf) output.rerollOf = rerollOf
  return output
}

const normalizeMessageBlock = (rawBlock) => {
  if (!rawBlock || typeof rawBlock !== 'object') return null
  const blockType = typeof rawBlock.type === 'string' ? rawBlock.type : 'text'
  if (!VALID_BLOCK_TYPES.has(blockType)) return null

  if (blockType === 'text') {
    const text = trimTo(rawBlock.text, MAX_TEXT_BLOCK_LENGTH)
    if (!text) return null
    return {
      type: 'text',
      text,
      lang: typeof rawBlock.lang === 'string' ? rawBlock.lang : 'auto',
      variant: rawBlock.variant === 'secondary' ? 'secondary' : 'primary',
    }
  }

  if (blockType === 'voice_virtual') {
    return {
      type: 'voice_virtual',
      label: normalizeSingleLineText(rawBlock.label, MAX_SHORT_LABEL_LENGTH, '语音消息'),
      transcript: trimTo(rawBlock.transcript, MAX_DETAIL_TEXT_LENGTH),
      durationSec: clamp(toInt(rawBlock.durationSec, 8), 1, 600),
    }
  }

  if (blockType === 'module_link') {
    return {
      type: 'module_link',
      label: normalizeSingleLineText(rawBlock.label, MAX_SHORT_LABEL_LENGTH, '打开模块'),
      route: sanitizeRoutePath(rawBlock.route, SAFE_ROUTE_FALLBACK),
      note: trimTo(rawBlock.note, MAX_DETAIL_TEXT_LENGTH),
    }
  }

  if (blockType === 'transfer_virtual') {
    return {
      type: 'transfer_virtual',
      label: normalizeSingleLineText(rawBlock.label, MAX_SHORT_LABEL_LENGTH, '转账卡片'),
      amount: normalizeSingleLineText(rawBlock.amount, 24, '0.00'),
      currency: normalizeSingleLineText(rawBlock.currency, 8, 'CNY').toUpperCase(),
      to: trimTo(rawBlock.to, 120),
      note: trimTo(rawBlock.note, MAX_DETAIL_TEXT_LENGTH),
      actionRoute: sanitizeRoutePath(rawBlock.actionRoute, SAFE_TRANSFER_ROUTE_FALLBACK),
    }
  }

  if (blockType === 'image_virtual') {
    return {
      type: 'image_virtual',
      alt: normalizeSingleLineText(rawBlock.alt, MAX_SHORT_LABEL_LENGTH, '图片消息'),
      url: sanitizeImageUrl(rawBlock.url),
      caption: trimTo(rawBlock.caption, MAX_DETAIL_TEXT_LENGTH),
    }
  }

  if (blockType === 'mini_scene') {
    return {
      type: 'mini_scene',
      title: normalizeSingleLineText(rawBlock.title, MAX_SHORT_LABEL_LENGTH, '互动卡片'),
      description: trimTo(rawBlock.description, MAX_DETAIL_TEXT_LENGTH),
      htmlSnippet: sanitizeHtmlSnippet(rawBlock.htmlSnippet),
    }
  }

  return null
}

const normalizeMessageBlocks = (rawBlocks, fallbackContent = '', role = 'assistant') => {
  const normalized = Array.isArray(rawBlocks)
    ? rawBlocks.map(normalizeMessageBlock).filter(Boolean).slice(0, MAX_BLOCK_COUNT)
    : []

  if (normalized.length > 0) return normalized

  const fallbackText = trimTo(fallbackContent, MAX_TEXT_BLOCK_LENGTH)
  if (fallbackText) {
    return [
      {
        type: 'text',
        text: fallbackText,
        lang: 'auto',
        variant: 'primary',
      },
    ]
  }

  if (role === 'assistant') {
    return [
      {
        type: 'text',
        text: '...',
        lang: 'auto',
        variant: 'primary',
      },
    ]
  }

  return []
}

const summarizeBlocks = (blocks) => {
  if (!Array.isArray(blocks) || blocks.length === 0) return ''

  const firstText = blocks.find((block) => block.type === 'text' && block.text?.trim())
  if (firstText) return firstText.text.trim()

  const first = blocks[0]
  if (!first) return ''
  if (first.type === 'voice_virtual') return `[语音] ${first.label}`
  if (first.type === 'module_link') return `[链接] ${first.label}`
  if (first.type === 'transfer_virtual') return `[转账] ${first.amount} ${first.currency}`
  if (first.type === 'image_virtual') return `[图片] ${first.alt}`
  if (first.type === 'mini_scene') return `[互动] ${first.title}`
  return ''
}

const normalizeRoleProfile = (rawProfile, fallbackIndex = 0) => {
  const parsedId = Number(rawProfile?.id)
  const id = Number.isFinite(parsedId) && parsedId > 0 ? Math.floor(parsedId) : nowTs() + fallbackIndex
  return {
    id,
    name:
      typeof rawProfile?.name === 'string' && rawProfile.name.trim()
        ? rawProfile.name.trim()
        : `角色 ${id}`,
    role: typeof rawProfile?.role === 'string' ? rawProfile.role : '',
    isMain: Boolean(rawProfile?.isMain),
    avatar: typeof rawProfile?.avatar === 'string' ? rawProfile.avatar : '',
    bio: typeof rawProfile?.bio === 'string' ? rawProfile.bio : '',
    tags: Array.isArray(rawProfile?.tags)
      ? rawProfile.tags
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
      : [],
    createdAt:
      typeof rawProfile?.createdAt === 'number' && Number.isFinite(rawProfile.createdAt)
        ? Math.max(0, Math.floor(rawProfile.createdAt))
        : nowTs(),
    updatedAt:
      typeof rawProfile?.updatedAt === 'number' && Number.isFinite(rawProfile.updatedAt)
        ? Math.max(0, Math.floor(rawProfile.updatedAt))
        : nowTs(),
  }
}

const normalizeContact = (rawContact, fallbackIndex = 0) => {
  const parsedId = Number(rawContact?.id)
  const id = Number.isFinite(parsedId) && parsedId > 0 ? Math.floor(parsedId) : nowTs() + fallbackIndex
  const kind = VALID_CONTACT_KINDS.has(rawContact?.kind) ? rawContact.kind : 'role'
  const relationshipLevel = clamp(toInt(rawContact?.relationshipLevel, 50), 0, 100)
  const parsedProfileId = Number(rawContact?.profileId)
  return {
    id,
    name: typeof rawContact?.name === 'string' && rawContact.name.trim() ? rawContact.name.trim() : `联系人 ${id}`,
    kind,
    profileId: Number.isFinite(parsedProfileId) && parsedProfileId > 0 ? Math.floor(parsedProfileId) : 0,
    role: typeof rawContact?.role === 'string' ? rawContact.role : '',
    isMain: Boolean(rawContact?.isMain),
    avatar: typeof rawContact?.avatar === 'string' ? rawContact.avatar : '',
    bio: typeof rawContact?.bio === 'string' ? rawContact.bio : '',
    serviceTemplate: typeof rawContact?.serviceTemplate === 'string' ? rawContact.serviceTemplate : '',
    relationshipLevel,
    relationshipNote: typeof rawContact?.relationshipNote === 'string' ? rawContact.relationshipNote : '',
    lastMessage: typeof rawContact?.lastMessage === 'string' ? rawContact.lastMessage : '',
  }
}

const normalizeMessage = (rawMessage, fallbackRole = 'assistant') => {
  const role = VALID_MESSAGE_ROLES.has(rawMessage?.role) ? rawMessage.role : fallbackRole
  const content = trimTo(rawMessage?.content, MAX_TEXT_BLOCK_LENGTH)
  const blocks = normalizeMessageBlocks(rawMessage?.blocks, content, role)
  const summaryText = summarizeBlocks(blocks)
  const normalizedContent = content || summaryText || (role === 'assistant' ? '...' : '')
  const defaultStatus = role === 'user' ? 'delivered' : 'sent'
  const status = VALID_MESSAGE_STATUS.has(rawMessage?.status) ? rawMessage.status : defaultStatus

  return {
    id: typeof rawMessage?.id === 'string' && rawMessage.id ? rawMessage.id : messageId(),
    role,
    content: normalizedContent,
    blocks,
    quote: normalizeMessageQuote(rawMessage?.quote),
    aiMeta: normalizeMessageMeta(rawMessage?.aiMeta),
    createdAt:
      typeof rawMessage?.createdAt === 'number' && Number.isFinite(rawMessage.createdAt)
        ? rawMessage.createdAt
        : nowTs(),
    editedAt:
      typeof rawMessage?.editedAt === 'number' &&
      Number.isFinite(rawMessage.editedAt) &&
      rawMessage.editedAt > 0
        ? rawMessage.editedAt
        : 0,
    status,
  }
}

const normalizeConversation = (rawConversation, contactId) => {
  return {
    id:
      typeof rawConversation?.id === 'string' && rawConversation.id
        ? rawConversation.id
        : fallbackConversationId(contactId),
    contactId,
    createdAt:
      typeof rawConversation?.createdAt === 'number' && Number.isFinite(rawConversation.createdAt)
        ? rawConversation.createdAt
        : nowTs(),
    updatedAt:
      typeof rawConversation?.updatedAt === 'number' && Number.isFinite(rawConversation.updatedAt)
        ? rawConversation.updatedAt
        : nowTs(),
    unread:
      typeof rawConversation?.unread === 'number' && Number.isFinite(rawConversation.unread)
        ? Math.max(0, Math.floor(rawConversation.unread))
        : 0,
    draft: typeof rawConversation?.draft === 'string' ? rawConversation.draft : '',
    pinned: Boolean(rawConversation?.pinned),
    aiPrefs: normalizeConversationAiPrefs(rawConversation?.aiPrefs),
    proactiveOpenedAt:
      typeof rawConversation?.proactiveOpenedAt === 'number' && Number.isFinite(rawConversation.proactiveOpenedAt)
        ? rawConversation.proactiveOpenedAt
        : 0,
    autoNextAt:
      typeof rawConversation?.autoNextAt === 'number' && Number.isFinite(rawConversation.autoNextAt)
        ? Math.max(0, Math.floor(rawConversation.autoNextAt))
        : 0,
    autoLastTriggeredAt:
      typeof rawConversation?.autoLastTriggeredAt === 'number' &&
      Number.isFinite(rawConversation.autoLastTriggeredAt)
        ? Math.max(0, Math.floor(rawConversation.autoLastTriggeredAt))
        : 0,
    autoLastFingerprint:
      typeof rawConversation?.autoLastFingerprint === 'string'
        ? rawConversation.autoLastFingerprint
        : '',
    autoLastSettledAt:
      typeof rawConversation?.autoLastSettledAt === 'number' &&
      Number.isFinite(rawConversation.autoLastSettledAt)
        ? Math.max(0, Math.floor(rawConversation.autoLastSettledAt))
        : 0,
    autoLastSettledMissedCycles:
      typeof rawConversation?.autoLastSettledMissedCycles === 'number' &&
      Number.isFinite(rawConversation.autoLastSettledMissedCycles)
        ? Math.max(0, Math.floor(rawConversation.autoLastSettledMissedCycles))
        : 0,
    lastMessage: typeof rawConversation?.lastMessage === 'string' ? rawConversation.lastMessage : '',
    lastMessageAt:
      typeof rawConversation?.lastMessageAt === 'number' && Number.isFinite(rawConversation.lastMessageAt)
        ? rawConversation.lastMessageAt
        : 0,
  }
}

const summarizeMessage = (message) => {
  if (!message) return ''
  if (typeof message.content === 'string' && message.content.trim()) return message.content.trim()
  return summarizeBlocks(message.blocks)
}

export const useChatStore = defineStore('chat', () => {
  const roleProfiles = reactive([])
  const contacts = reactive([])
  const conversations = reactive({})
  const messagesByConversation = reactive({})
  const loadingAI = ref(false)

  const getRoleProfileById = (profileId) =>
    roleProfiles.find((item) => Number(item.id) === Number(profileId)) || null

  const getRawContactById = (contactId) => {
    return contacts.find((item) => Number(item.id) === Number(contactId)) || null
  }

  const resolveContactWithProfile = (contact) => {
    if (!contact || typeof contact !== 'object') return null
    if (contact.kind !== 'role' || !contact.profileId) return { ...contact }

    const profile = getRoleProfileById(contact.profileId)
    if (!profile) return { ...contact }

    return {
      ...contact,
      name: profile.name || contact.name,
      role: profile.role || contact.role,
      bio: profile.bio || contact.bio,
      avatar: profile.avatar || contact.avatar,
      isMain: Boolean(profile.isMain),
    }
  }

  const getContactById = (contactId) => {
    const raw = getRawContactById(contactId)
    return resolveContactWithProfile(raw)
  }

  const conversationKeyForContact = (contactId) => String(Number(contactId))

  const syncContactLastMessage = (contactId, fallbackText = '') => {
    const contact = getRawContactById(contactId)
    if (!contact) return
    const key = conversationKeyForContact(contactId)
    const conversation = conversations[key]
    if (conversation?.lastMessage) {
      contact.lastMessage = conversation.lastMessage
      return
    }
    contact.lastMessage = fallbackText || contact.lastMessage || ''
  }

  const ensureConversationForContact = (contactId) => {
    const key = conversationKeyForContact(contactId)
    if (!conversations[key]) {
      conversations[key] = normalizeConversation(null, Number(contactId))
    }
    if (!Array.isArray(messagesByConversation[key])) {
      messagesByConversation[key] = []
    }
    return conversations[key]
  }

  const syncConversationSummary = (contactId) => {
    const key = conversationKeyForContact(contactId)
    const conversation = ensureConversationForContact(contactId)
    const messages = messagesByConversation[key]

    if (messages.length === 0) {
      if (!conversation.lastMessage) {
        const contact = getRawContactById(contactId)
        conversation.lastMessage = contact?.lastMessage || ''
      }
      conversation.lastMessageAt = conversation.lastMessageAt || conversation.createdAt
      conversation.updatedAt = Math.max(conversation.updatedAt, conversation.lastMessageAt || 0)
      syncContactLastMessage(contactId, conversation.lastMessage)
      return
    }

    const last = messages[messages.length - 1]
    const summary = summarizeMessage(last)
    conversation.lastMessage = summary
    conversation.lastMessageAt = last.createdAt
    conversation.updatedAt = Math.max(conversation.updatedAt, last.createdAt)
    syncContactLastMessage(contactId, summary)
  }

  const getConversationByContactId = (contactId) => {
    const key = conversationKeyForContact(contactId)
    return conversations[key] || ensureConversationForContact(contactId)
  }

  const getConversationAiPrefs = (contactId) => {
    const conversation = getConversationByContactId(contactId)
    return normalizeConversationAiPrefs(conversation.aiPrefs)
  }

  const getMessagesByContactId = (contactId) => {
    const key = conversationKeyForContact(contactId)
    ensureConversationForContact(contactId)
    return messagesByConversation[key]
  }

  const setConversationDraft = (contactId, draftText = '') => {
    const conversation = ensureConversationForContact(contactId)
    const nextDraft = typeof draftText === 'string' ? draftText : ''
    if (conversation.draft === nextDraft) return
    conversation.draft = nextDraft
    conversation.updatedAt = nowTs()
  }

  const setConversationAiPrefs = (contactId, partialPrefs = {}) => {
    const conversation = ensureConversationForContact(contactId)
    conversation.aiPrefs = normalizeConversationAiPrefs({
      ...conversation.aiPrefs,
      ...(partialPrefs && typeof partialPrefs === 'object' ? partialPrefs : {}),
    })
    if (!conversation.aiPrefs.autoInvokeEnabled) {
      conversation.autoNextAt = 0
      conversation.autoLastSettledMissedCycles = 0
    }
    conversation.updatedAt = nowTs()
  }

  const setConversationAutoState = (contactId, partialState = {}) => {
    const conversation = ensureConversationForContact(contactId)
    const input = partialState && typeof partialState === 'object' ? partialState : {}

    if (Object.prototype.hasOwnProperty.call(input, 'autoNextAt')) {
      const value = Number(input.autoNextAt)
      conversation.autoNextAt = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
    }

    if (Object.prototype.hasOwnProperty.call(input, 'autoLastTriggeredAt')) {
      const value = Number(input.autoLastTriggeredAt)
      conversation.autoLastTriggeredAt = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
    }

    if (Object.prototype.hasOwnProperty.call(input, 'autoLastFingerprint')) {
      conversation.autoLastFingerprint =
        typeof input.autoLastFingerprint === 'string' ? input.autoLastFingerprint : ''
    }

    if (Object.prototype.hasOwnProperty.call(input, 'autoLastSettledAt')) {
      const value = Number(input.autoLastSettledAt)
      conversation.autoLastSettledAt = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
    }

    if (Object.prototype.hasOwnProperty.call(input, 'autoLastSettledMissedCycles')) {
      const value = Number(input.autoLastSettledMissedCycles)
      conversation.autoLastSettledMissedCycles = Number.isFinite(value)
        ? Math.max(0, Math.floor(value))
        : 0
    }

    conversation.updatedAt = nowTs()
  }

  const scheduleConversationAutoInvoke = (contactId, baseAt = nowTs(), intervalSec = 0) => {
    const conversation = ensureConversationForContact(contactId)
    const fallbackInterval = conversation.aiPrefs?.autoInvokeIntervalSec
    const normalizedIntervalSec = clamp(
      toInt(intervalSec || fallbackInterval, DEFAULT_CONVERSATION_AI_PREFS.autoInvokeIntervalSec),
      MIN_AUTO_INVOKE_INTERVAL_SEC,
      MAX_AUTO_INVOKE_INTERVAL_SEC,
    )
    const normalizedBaseAt = Number.isFinite(Number(baseAt)) ? Math.max(0, Math.floor(Number(baseAt))) : nowTs()
    conversation.autoNextAt = normalizedBaseAt + normalizedIntervalSec * 1000
    conversation.autoLastSettledMissedCycles = 0
    conversation.updatedAt = nowTs()
    return conversation.autoNextAt
  }

  const listAutoInvokeContactIds = () => {
    return contacts
      .map((contact) => Number(contact.id))
      .filter((contactId) => Number.isFinite(contactId) && contactId > 0)
      .filter((contactId) => {
        const conversation = getConversationByContactId(contactId)
        const prefs = normalizeConversationAiPrefs(conversation.aiPrefs)
        return Boolean(prefs.autoInvokeEnabled)
      })
  }

  const normalizeAutoInvokeCheckpoints = (baseAt = nowTs()) => {
    const now = Number.isFinite(Number(baseAt)) ? Math.max(0, Math.floor(Number(baseAt))) : nowTs()
    let touched = 0

    contacts.forEach((contact) => {
      const contactId = Number(contact.id)
      if (!Number.isFinite(contactId) || contactId <= 0) return

      const conversation = getConversationByContactId(contactId)
      const prefs = normalizeConversationAiPrefs(conversation.aiPrefs)
      if (!prefs.autoInvokeEnabled) {
        let touchedLocal = false
        if (conversation.autoNextAt !== 0) {
          conversation.autoNextAt = 0
          touchedLocal = true
        }
        if (conversation.autoLastSettledMissedCycles !== 0) {
          conversation.autoLastSettledMissedCycles = 0
          touchedLocal = true
        }
        if (touchedLocal) {
          conversation.updatedAt = nowTs()
          touched += 1
        }
        return
      }

      const intervalMs = clamp(
        toInt(prefs.autoInvokeIntervalSec, DEFAULT_CONVERSATION_AI_PREFS.autoInvokeIntervalSec),
        MIN_AUTO_INVOKE_INTERVAL_SEC,
        MAX_AUTO_INVOKE_INTERVAL_SEC,
      ) * 1000
      const staleThreshold = now - intervalMs * 2
      const anchor = Math.max(
        now,
        Number.isFinite(Number(conversation.lastMessageAt)) ? Number(conversation.lastMessageAt) : 0,
        Number.isFinite(Number(conversation.autoLastTriggeredAt))
          ? Number(conversation.autoLastTriggeredAt)
          : 0,
      )

      if (!conversation.autoNextAt || conversation.autoNextAt < staleThreshold) {
        conversation.autoNextAt = anchor + intervalMs
        conversation.updatedAt = nowTs()
        touched += 1
      }
    })

    return touched
  }

  const settleAutoInvokeOnResume = (baseAt = nowTs(), options = {}) => {
    const now = Number.isFinite(Number(baseAt)) ? Math.max(0, Math.floor(Number(baseAt))) : nowTs()
    const maxRecordedMissedCycles = clamp(
      toInt(options.maxRecordedMissedCycles, 99),
      1,
      999,
    )
    const settled = []

    contacts.forEach((contact) => {
      const contactId = Number(contact.id)
      if (!Number.isFinite(contactId) || contactId <= 0) return

      const conversation = getConversationByContactId(contactId)
      const prefs = normalizeConversationAiPrefs(conversation.aiPrefs)
      if (!prefs.autoInvokeEnabled) {
        let touchedLocal = false
        if (conversation.autoNextAt !== 0) {
          conversation.autoNextAt = 0
          touchedLocal = true
        }
        if (conversation.autoLastSettledMissedCycles !== 0) {
          conversation.autoLastSettledMissedCycles = 0
          touchedLocal = true
        }
        if (touchedLocal) {
          conversation.updatedAt = nowTs()
        }
        return
      }

      const intervalMs = clamp(
        toInt(prefs.autoInvokeIntervalSec, DEFAULT_CONVERSATION_AI_PREFS.autoInvokeIntervalSec),
        MIN_AUTO_INVOKE_INTERVAL_SEC,
        MAX_AUTO_INVOKE_INTERVAL_SEC,
      ) * 1000

      const fallbackAnchor = Math.max(
        now,
        Number.isFinite(Number(conversation.lastMessageAt)) ? Number(conversation.lastMessageAt) : 0,
        Number.isFinite(Number(conversation.autoLastTriggeredAt))
          ? Number(conversation.autoLastTriggeredAt)
          : 0,
      )

      if (!conversation.autoNextAt || !Number.isFinite(Number(conversation.autoNextAt))) {
        conversation.autoNextAt = fallbackAnchor + intervalMs
        conversation.autoLastSettledMissedCycles = 0
        conversation.updatedAt = nowTs()
        return
      }

      const dueAt = Math.max(0, Math.floor(Number(conversation.autoNextAt)))
      if (dueAt > now) {
        if (conversation.autoLastSettledMissedCycles !== 0) {
          conversation.autoLastSettledMissedCycles = 0
          conversation.updatedAt = nowTs()
        }
        return
      }

      const overdueMs = Math.max(0, now - dueAt)
      const missedCyclesRaw = Math.floor(overdueMs / intervalMs) + 1
      const missedCycles = clamp(missedCyclesRaw, 1, maxRecordedMissedCycles)

      conversation.autoNextAt = now
      conversation.autoLastSettledAt = now
      conversation.autoLastSettledMissedCycles = missedCycles
      conversation.updatedAt = nowTs()

      settled.push({
        contactId,
        dueAt,
        settledAt: now,
        overdueMs,
        missedCycles,
        intervalMs,
      })
    })

    return settled.sort((a, b) => a.dueAt - b.dueAt)
  }

  const getDueAutoInvokeContactIds = (baseAt = nowTs()) => {
    const now = Number.isFinite(Number(baseAt)) ? Math.max(0, Math.floor(Number(baseAt))) : nowTs()
    return listAutoInvokeContactIds()
      .filter((contactId) => {
        const conversation = getConversationByContactId(contactId)
        return Number.isFinite(Number(conversation.autoNextAt)) && conversation.autoNextAt > 0 && conversation.autoNextAt <= now
      })
      .sort((leftId, rightId) => {
        const leftAt = getConversationByContactId(leftId).autoNextAt || 0
        const rightAt = getConversationByContactId(rightId).autoNextAt || 0
        return leftAt - rightAt
      })
  }

  const getNextAutoInvokeAt = () => {
    const nextValues = listAutoInvokeContactIds()
      .map((contactId) => {
        const conversation = getConversationByContactId(contactId)
        return Number.isFinite(Number(conversation.autoNextAt)) ? conversation.autoNextAt : 0
      })
      .filter((value) => value > 0)

    if (nextValues.length === 0) return 0
    return Math.min(...nextValues)
  }

  const markConversationProactiveOpened = (contactId, openedAt = nowTs()) => {
    const conversation = ensureConversationForContact(contactId)
    const ts = typeof openedAt === 'number' && Number.isFinite(openedAt) ? openedAt : nowTs()
    conversation.proactiveOpenedAt = Math.max(0, Math.floor(ts))
    conversation.updatedAt = nowTs()
  }

  const resetConversationProactiveOpened = (contactId) => {
    const conversation = ensureConversationForContact(contactId)
    conversation.proactiveOpenedAt = 0
    conversation.updatedAt = nowTs()
  }

  const markConversationRead = (contactId) => {
    const conversation = ensureConversationForContact(contactId)
    conversation.unread = 0
    conversation.updatedAt = nowTs()
  }

  const incrementConversationUnread = (contactId, delta = 1) => {
    const conversation = ensureConversationForContact(contactId)
    conversation.unread = Math.max(0, conversation.unread + delta)
    conversation.updatedAt = nowTs()
  }

  const appendMessage = (contactId, rawMessage) => {
    const key = conversationKeyForContact(contactId)
    ensureConversationForContact(contactId)
    const fallbackRole = rawMessage?.role === 'user' ? 'user' : 'assistant'
    const normalized = normalizeMessage(rawMessage, fallbackRole)
    messagesByConversation[key].push(normalized)
    syncConversationSummary(contactId)
    return normalized
  }

  const getMessageIndex = (contactId, targetMessageId) => {
    const list = getMessagesByContactId(contactId)
    const index = list.findIndex((item) => item.id === targetMessageId)
    return { list, index }
  }

  const updateMessageStatus = (contactId, targetMessageId, status) => {
    if (!VALID_MESSAGE_STATUS.has(status)) return false
    const key = conversationKeyForContact(contactId)
    const { list, index } = getMessageIndex(contactId, targetMessageId)
    if (index < 0) return false
    list[index] = {
      ...list[index],
      status,
    }
    if (list[index].createdAt > 0) {
      conversations[key].updatedAt = Math.max(conversations[key].updatedAt, list[index].createdAt)
    }
    syncConversationSummary(contactId)
    return true
  }

  const updateMessageContent = (contactId, targetMessageId, nextContent, options = {}) => {
    const { list, index } = getMessageIndex(contactId, targetMessageId)
    if (index < 0) return false

    const updatedContent = typeof nextContent === 'string' ? nextContent : list[index].content
    const existingBlocks = Array.isArray(list[index].blocks) ? list[index].blocks : []
    const markEdited = options?.markEdited !== false
    const editedAt =
      markEdited
        ? typeof options?.editedAt === 'number' && Number.isFinite(options.editedAt)
          ? Math.max(0, Math.floor(options.editedAt))
          : nowTs()
        : list[index].editedAt || 0
    const nextBlocks =
      existingBlocks.length > 0
        ? existingBlocks.map((block, blockIndex) => {
            if (block.type === 'text' && blockIndex === 0) {
              return { ...block, text: updatedContent }
            }
            return block
          })
        : normalizeMessageBlocks([], updatedContent, list[index]?.role || 'assistant')

    list[index] = {
      ...list[index],
      content: updatedContent,
      blocks: nextBlocks,
      editedAt,
    }
    syncConversationSummary(contactId)
    return true
  }

  const removeMessage = (contactId, targetMessageId) => {
    const { list, index } = getMessageIndex(contactId, targetMessageId)
    if (index < 0) return null
    const [removed] = list.splice(index, 1)
    const key = conversationKeyForContact(contactId)
    if (removed?.role === 'assistant' && conversations[key]) {
      conversations[key].unread = Math.max(0, conversations[key].unread - 1)
      conversations[key].updatedAt = nowTs()
    }
    syncConversationSummary(contactId)
    return removed || null
  }

  const replaceMessage = (contactId, targetMessageId, rawMessage, options = {}) => {
    const { list, index } = getMessageIndex(contactId, targetMessageId)
    if (index < 0) return null

    const fallbackRole = list[index]?.role === 'user' ? 'user' : 'assistant'
    const normalized = normalizeMessage(rawMessage, fallbackRole)

    if (options?.keepCreatedAt !== false) {
      normalized.createdAt = list[index]?.createdAt || normalized.createdAt
    }
    if (options?.keepStatus === true && VALID_MESSAGE_STATUS.has(list[index]?.status)) {
      normalized.status = list[index].status
    }

    list[index] = normalized
    syncConversationSummary(contactId)
    return normalized
  }

  const addRoleProfile = (payload = {}) => {
    const maxProfileId = roleProfiles.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
    const normalized = normalizeRoleProfile(
      {
        ...payload,
        id: payload.id ?? maxProfileId + 1,
      },
      roleProfiles.length,
    )
    roleProfiles.push(normalized)
    return normalized
  }

  const updateRoleProfile = (profileId, updates = {}) => {
    const target = getRoleProfileById(profileId)
    if (!target || !updates || typeof updates !== 'object') return false

    if (typeof updates.name === 'string' && updates.name.trim()) {
      target.name = updates.name.trim()
    }
    if (typeof updates.role === 'string') {
      target.role = updates.role
    }
    if (typeof updates.avatar === 'string') {
      target.avatar = updates.avatar
    }
    if (typeof updates.bio === 'string') {
      target.bio = updates.bio
    }
    if (typeof updates.isMain === 'boolean') {
      target.isMain = updates.isMain
    }
    if (Array.isArray(updates.tags)) {
      target.tags = updates.tags
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    }
    target.updatedAt = nowTs()
    return true
  }

  const removeRoleProfile = (profileId, options = {}) => {
    const numericId = Number(profileId)
    if (!Number.isFinite(numericId) || numericId <= 0) return false
    const index = roleProfiles.findIndex((item) => Number(item.id) === numericId)
    if (index < 0) return false

    roleProfiles.splice(index, 1)

    const removeBindings = options?.removeBindings !== false
    if (removeBindings) {
      const bindingIds = contacts
        .filter((contact) => contact.kind === 'role' && Number(contact.profileId) === numericId)
        .map((contact) => contact.id)
      bindingIds.forEach((contactId) => {
        removeContact(contactId)
      })
    }
    return true
  }

  const isRoleProfileBound = (profileId) =>
    contacts.some((contact) => contact.kind === 'role' && Number(contact.profileId) === Number(profileId))

  const bindRoleProfile = (profileId, options = {}) => {
    const profile = getRoleProfileById(profileId)
    if (!profile) return null

    const existing = contacts.find(
      (contact) => contact.kind === 'role' && Number(contact.profileId) === Number(profile.id),
    )
    if (existing) {
      ensureConversationForContact(existing.id)
      return resolveContactWithProfile(existing)
    }

    const created = addContact({
      kind: 'role',
      profileId: profile.id,
      name: profile.name,
      role: profile.role,
      avatar: profile.avatar,
      bio: profile.bio,
      isMain: profile.isMain,
      relationshipLevel: clamp(toInt(options.relationshipLevel, 50), 0, 100),
      relationshipNote:
        typeof options.relationshipNote === 'string' ? options.relationshipNote : '',
      lastMessage: '',
    })
    return created
  }

  const updateRoleBindingMeta = (contactId, updates = {}) => {
    const target = getRawContactById(contactId)
    if (!target || target.kind !== 'role') return false

    if (Object.prototype.hasOwnProperty.call(updates, 'relationshipLevel')) {
      target.relationshipLevel = clamp(toInt(updates.relationshipLevel, target.relationshipLevel), 0, 100)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'relationshipNote')) {
      target.relationshipNote =
        typeof updates.relationshipNote === 'string' ? updates.relationshipNote : ''
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'name') && typeof updates.name === 'string') {
      const nextName = updates.name.trim()
      if (nextName) target.name = nextName
    }
    syncConversationSummary(contactId)
    return true
  }

  const unbindRoleContact = (contactId) => {
    const target = getRawContactById(contactId)
    if (!target || target.kind !== 'role') return false
    return Boolean(removeContact(contactId))
  }

  const addContact = (payload = {}) => {
    const maxContactId = contacts.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
    const nextContact = normalizeContact(
      {
        ...payload,
        id: payload.id ?? maxContactId + 1,
      },
      contacts.length,
    )

    contacts.push(nextContact)
    ensureConversationForContact(nextContact.id)
    syncConversationSummary(nextContact.id)
    return nextContact
  }

  const updateContact = (contactId, updates = {}) => {
    const target = getRawContactById(contactId)
    if (!target || !updates || typeof updates !== 'object') return false

    if (typeof updates.name === 'string' && updates.name.trim()) {
      target.name = updates.name.trim()
    }
    if (VALID_CONTACT_KINDS.has(updates.kind)) {
      target.kind = updates.kind
    }
    if (typeof updates.role === 'string') {
      target.role = updates.role
    }
    if (typeof updates.avatar === 'string') {
      target.avatar = updates.avatar
    }
    if (typeof updates.bio === 'string') {
      target.bio = updates.bio
    }
    if (typeof updates.serviceTemplate === 'string') {
      target.serviceTemplate = updates.serviceTemplate
    }
    if (typeof updates.isMain === 'boolean') {
      target.isMain = updates.isMain
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'profileId')) {
      const value = Number(updates.profileId)
      target.profileId = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'relationshipLevel')) {
      target.relationshipLevel = clamp(toInt(updates.relationshipLevel, target.relationshipLevel), 0, 100)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'relationshipNote')) {
      target.relationshipNote = typeof updates.relationshipNote === 'string' ? updates.relationshipNote : ''
    }

    syncConversationSummary(contactId)
    return true
  }

  const removeContact = (contactId) => {
    const numericId = Number(contactId)
    if (!Number.isFinite(numericId)) return false
    const index = contacts.findIndex((item) => Number(item.id) === numericId)
    if (index < 0) return false

    contacts.splice(index, 1)
    const key = conversationKeyForContact(numericId)
    delete conversations[key]
    delete messagesByConversation[key]
    return true
  }

  const toLegacyChatHistory = () => {
    const output = {}
    contacts.forEach((contact) => {
      const key = conversationKeyForContact(contact.id)
      output[key] = (messagesByConversation[key] || []).map((message) => ({
        role: message.role,
        content: summarizeMessage(message),
      }))
    })
    return output
  }

  const hydrateFromLegacyShape = (legacyContacts, legacyHistory) => {
    const normalizedContacts = Array.isArray(legacyContacts)
      ? legacyContacts.map((item, index) => normalizeContact(item, index))
      : DEFAULT_CONTACTS.map((item, index) => normalizeContact(item, index))

    resetReactiveObject(roleProfiles)
    const sourceProfiles = Array.isArray(legacyContacts)
      ? normalizedContacts
          .filter((contact) => (contact.kind || 'role') === 'role')
          .map((contact, index) =>
            normalizeRoleProfile(
              {
                id: contact.profileId || contact.id,
                name: contact.name,
                role: contact.role,
                avatar: contact.avatar,
                bio: contact.bio,
                isMain: contact.isMain,
              },
              index,
            ),
          )
      : DEFAULT_ROLE_PROFILES.map((item, index) => normalizeRoleProfile(item, index))

    roleProfiles.push(...sourceProfiles)

    normalizedContacts.forEach((contact) => {
      if ((contact.kind || 'role') !== 'role') return
      if (contact.profileId > 0) return
      const fallbackProfile = roleProfiles.find((profile) => profile.name === contact.name)
      if (fallbackProfile) {
        contact.profileId = fallbackProfile.id
      }
    })

    contacts.splice(0, contacts.length, ...normalizedContacts)
    resetReactiveObject(conversations)
    resetReactiveObject(messagesByConversation)

    normalizedContacts.forEach((contact) => {
      const key = conversationKeyForContact(contact.id)
      conversations[key] = normalizeConversation(null, contact.id)

      const inputHistory = Array.isArray(legacyHistory?.[key]) ? legacyHistory[key] : []
      const seededMessages = inputHistory.map((item, index) =>
        normalizeMessage(
          {
            ...item,
            createdAt: nowTs() - Math.max(0, inputHistory.length - index) * 60_000,
            status: item?.role === 'user' ? 'delivered' : 'sent',
          },
          item?.role === 'user' ? 'user' : 'assistant',
        ),
      )

      messagesByConversation[key] = seededMessages
      conversations[key].lastMessage = contact.lastMessage || ''
      conversations[key].lastMessageAt = seededMessages.at(-1)?.createdAt || nowTs()
      conversations[key].updatedAt = conversations[key].lastMessageAt
      syncConversationSummary(contact.id)
    })
  }

  const hydrateFromSnapshot = (persisted = {}) => {
    if (!persisted || typeof persisted !== 'object') return false

    const normalizedProfiles = Array.isArray(persisted.roleProfiles)
      ? persisted.roleProfiles.map((item, index) => normalizeRoleProfile(item, index))
      : []
    resetReactiveObject(roleProfiles)
    if (normalizedProfiles.length > 0) {
      roleProfiles.push(...normalizedProfiles)
    }

    const normalizedContacts = Array.isArray(persisted.contacts)
      ? persisted.contacts.map((item, index) => normalizeContact(item, index))
      : DEFAULT_CONTACTS.map((item, index) => normalizeContact(item, index))

    if (roleProfiles.length === 0) {
      const derivedProfiles = normalizedContacts
        .filter((contact) => (contact.kind || 'role') === 'role')
        .map((contact, index) =>
          normalizeRoleProfile(
            {
              id: contact.profileId || contact.id,
              name: contact.name,
              role: contact.role,
              avatar: contact.avatar,
              bio: contact.bio,
              isMain: contact.isMain,
            },
            index,
          ),
        )
      roleProfiles.push(...derivedProfiles)
    }

    normalizedContacts.forEach((contact) => {
      if ((contact.kind || 'role') !== 'role') return
      if (contact.profileId > 0 && getRoleProfileById(contact.profileId)) return

      const matchedProfile = roleProfiles.find((profile) => profile.name === contact.name)
      if (matchedProfile) {
        contact.profileId = matchedProfile.id
        return
      }

      const createdProfile = addRoleProfile({
        name: contact.name,
        role: contact.role,
        avatar: contact.avatar,
        bio: contact.bio,
        isMain: contact.isMain,
      })
      contact.profileId = createdProfile.id
    })

    contacts.splice(0, contacts.length, ...normalizedContacts)
    resetReactiveObject(conversations)
    resetReactiveObject(messagesByConversation)

    normalizedContacts.forEach((contact) => {
      const key = conversationKeyForContact(contact.id)
      const rawConversation = persisted.conversations?.[key]
      conversations[key] = normalizeConversation(rawConversation, contact.id)

      const rawMessages = Array.isArray(persisted.messagesByConversation?.[key])
        ? persisted.messagesByConversation[key]
        : []
      messagesByConversation[key] = rawMessages.map((msg) =>
        normalizeMessage(msg, msg?.role === 'user' ? 'user' : 'assistant'),
      )
      syncConversationSummary(contact.id)
    })
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(CHAT_STORAGE_KEY, {
      version: CHAT_STORAGE_VERSION,
    })
    if (!persisted || typeof persisted !== 'object') {
      hydrateFromLegacyShape(DEFAULT_CONTACTS, DEFAULT_CHAT_HISTORY)
      return
    }

    const hasNewShape = persisted.conversations && persisted.messagesByConversation
    if (!hasNewShape) {
      hydrateFromLegacyShape(persisted.contacts, persisted.chatHistory)
      return
    }

    hydrateFromSnapshot(persisted)
  }

  const persistToStorage = () => {
    const contactsSnapshot = contacts.map((contact) => ({ ...contact }))
    const conversationsSnapshot = Object.fromEntries(
      Object.entries(conversations).map(([key, value]) => [
        key,
        {
          ...value,
          aiPrefs: normalizeConversationAiPrefs(value.aiPrefs),
        },
      ]),
    )
    const messagesSnapshot = Object.fromEntries(
      Object.entries(messagesByConversation).map(([key, list]) => [
        key,
        list.map((message) => ({
          ...message,
          blocks: normalizeMessageBlocks(message.blocks, message.content, message.role),
          quote: normalizeMessageQuote(message.quote),
          aiMeta: normalizeMessageMeta(message.aiMeta),
        })),
      ]),
    )

    writePersistedState(
      CHAT_STORAGE_KEY,
      {
        roleProfiles: roleProfiles.map((profile) => ({ ...profile })),
        contacts: contactsSnapshot,
        conversations: conversationsSnapshot,
        messagesByConversation: messagesSnapshot,
      },
      { version: CHAT_STORAGE_VERSION },
    )
  }

  const saveNow = () => {
    persistToStorage()
  }

  const restoreFromBackup = (snapshot = {}) => {
    if (!snapshot || typeof snapshot !== 'object') return false

    const hasNewShape = snapshot.conversations && snapshot.messagesByConversation
    if (hasNewShape) {
      return hydrateFromSnapshot(snapshot)
    }

    hydrateFromLegacyShape(snapshot.contacts, snapshot.chatHistory)
    return true
  }

  const contactsForList = computed(() => {
    return [...contacts]
      .map((contact) => resolveContactWithProfile(contact))
      .filter(Boolean)
      .sort((a, b) => {
      const convA = getConversationByContactId(a.id)
      const convB = getConversationByContactId(b.id)

      if (convA.pinned !== convB.pinned) return convA.pinned ? -1 : 1
      return (convB.updatedAt || 0) - (convA.updatedAt || 0)
    })
  })

  const chatHistory = computed(() => toLegacyChatHistory())

  hydrateFromStorage()
  watch([roleProfiles, contacts, conversations, messagesByConversation], persistToStorage, { deep: true })

  return {
    roleProfiles,
    contacts,
    contactsForList,
    conversations,
    messagesByConversation,
    chatHistory,
    loadingAI,
    ensureConversationForContact,
    getConversationByContactId,
    getConversationAiPrefs,
    getMessagesByContactId,
    setConversationDraft,
    setConversationAiPrefs,
    setConversationAutoState,
    scheduleConversationAutoInvoke,
    listAutoInvokeContactIds,
    normalizeAutoInvokeCheckpoints,
    settleAutoInvokeOnResume,
    getDueAutoInvokeContactIds,
    getNextAutoInvokeAt,
    markConversationProactiveOpened,
    resetConversationProactiveOpened,
    markConversationRead,
    incrementConversationUnread,
    appendMessage,
    updateMessageStatus,
    updateMessageContent,
    removeMessage,
    replaceMessage,
    getContactById,
    getRoleProfileById,
    addRoleProfile,
    updateRoleProfile,
    removeRoleProfile,
    isRoleProfileBound,
    bindRoleProfile,
    updateRoleBindingMeta,
    unbindRoleContact,
    addContact,
    updateContact,
    removeContact,
    saveNow,
    restoreFromBackup,
  }
})
