import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { resolveAvatarWithHierarchy, sanitizeAvatarUrl } from '../lib/avatar'
import { normalizeImageSource } from '../lib/image-source-contract'
import {
  FOOD_DELIVERY_SERVICE_PRESETS,
  LOGISTICS_SERVICE_PRESETS,
  SHOPPING_SERVICE_PRESETS,
} from '../lib/planned-module-registry'
import {
  ROLE_ASSET_FOLDER_SLOT_KEYS,
  cloneRoleAssetFolderBindings as cloneRoleProfileAssetFolderBindingsShared,
  cloneRoleAssetPack as cloneRoleProfileAssetPackShared,
  createEmptyRoleAssetFolderBindings as createEmptyRoleProfileAssetFolderBindingsShared,
  createEmptyRoleAssetPack as createEmptyRoleAssetPackShared,
  createRoleBindingContract,
  normalizeRoleAssetFolderBindings as normalizeRoleProfileAssetFolderBindingsShared,
  normalizeRoleAssetPack as normalizeRoleProfileAssetPackShared,
  sanitizeRoleBindingAssetId,
  toRoleBindingAssetContext,
} from '../lib/role-binding-contract'
import {
  CONTACTS_ENTITY_TYPES,
  cloneRoleDetailItems,
  createRoleDetailItem,
  createDefaultCapabilitiesForEntityType,
  createRoleIdFromProfileId,
  ensureUniqueRoleProfileRoleIds,
  filterRoleDetailItemsForMemoryDelete,
  filterRoleDetailItemsForReset,
  isValidRoleId,
  normalizeContactsEntityType,
  normalizeProfileCapabilities,
  normalizeProfileTemplateLink,
  normalizeProfileValues,
  normalizeRoleDetailItems,
  normalizeRoleDetailSection,
  normalizeRoleId,
} from '../lib/role-profile-schema'

const CHAT_STORAGE_KEY = 'store:chat'
const CHAT_STORAGE_VERSION = 2
const VALID_MESSAGE_ROLES = new Set(['user', 'assistant', 'system'])
const VALID_MESSAGE_STATUS = new Set(['sending', 'sent', 'failed', 'delivered', 'read'])
const VALID_CONTACT_KINDS = new Set(['role', 'group', 'service', 'official'])
const VALID_SHOPPING_SERVICE_KEYS = new Set(SHOPPING_SERVICE_PRESETS.map((item) => item.key))
const VALID_LOGISTICS_SERVICE_KEYS = new Set(LOGISTICS_SERVICE_PRESETS.map((item) => item.key))
const VALID_FOOD_DELIVERY_SERVICE_KEYS = new Set(FOOD_DELIVERY_SERVICE_PRESETS.map((item) => item.key))
const VALID_REPLY_MODES = new Set(['manual', 'auto'])
const VALID_RESPONSE_STYLES = new Set(['immersive', 'natural', 'concise'])
const VALID_PROACTIVE_STRATEGIES = new Set(['on_enter_once', 'on_every_enter_if_empty'])
const VALID_IMAGE_REFERENCE_MODES = new Set(['auto', 'context_only', 'native_url'])
const VALID_MODULE_ANONYMITY_SCOPES = new Set(['all', 'selected'])
const MIN_AUTO_INVOKE_INTERVAL_SEC = 60
const MAX_AUTO_INVOKE_INTERVAL_SEC = 86400
const VALID_BLOCK_TYPES = new Set([
  'text',
  'voice_virtual',
  'module_link',
  'link_external',
  'transfer_virtual',
  'product_card',
  'image_virtual',
  'mini_scene',
])
const VALID_REPLY_TYPES = new Set(['plain', 'quote_user', 'quote_self'])
const VALID_IMAGE_REFERENCE_TRANSPORT_MODES = new Set(['none', 'context_only', 'native_url'])
const MAX_TEXT_BLOCK_LENGTH = 3000
const MAX_DETAIL_TEXT_LENGTH = 800
const MAX_SHORT_LABEL_LENGTH = 80
const MAX_QUOTE_PREVIEW_LENGTH = 240
const MAX_QUOTE_MESSAGE_ID_LENGTH = 128
const MAX_AI_META_PROVIDER_LENGTH = 32
const MAX_BLOCK_COUNT = 16
const MAX_ROLE_KNOWLEDGE_POINT_IDS = 80
const MAX_KNOWLEDGE_POINT_ID_LENGTH = 64
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
  imageReferenceMode: 'auto',
  allowImageVirtualWithoutReference: false,
  autoInvokeEnabled: false,
  autoInvokeIntervalSec: 360,
}

const DEFAULT_CHAT_MODULE_AVATAR_OVERRIDES = Object.freeze({
  selfAvatar: '',
  defaultContactAvatar: '',
  contactAvatars: {},
})

const DEFAULT_CHAT_MODULE_IDENTITY = Object.freeze({
  avatar: '',
  nickname: '',
  anonymityEnabled: false,
  anonymityScope: 'all',
  anonymityContactIds: [],
})

const DEFAULT_ROLE_PROFILES = [
  {
    id: 1,
    roleId: '1',
    name: 'Eva',
    role: '私人 AI 助手',
    isMain: true,
    avatar: '',
    lastMessage: '今天有什么安排吗？',
    bio: '你是一个高智能、温和体贴的 AI 助手，名字叫 Eva。你会优先考虑用户(V)的安全，表达清晰简洁。',
  },
  {
    id: 2,
    roleId: '2',
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

const normalizeShoppingServiceKey = (value) => {
  const key = trimTo(value, 40)
  return VALID_SHOPPING_SERVICE_KEYS.has(key) ? key : ''
}

const normalizeLogisticsServiceKey = (value) => {
  const key = trimTo(value, 40)
  return VALID_LOGISTICS_SERVICE_KEYS.has(key) ? key : ''
}

const normalizeFoodDeliveryServiceKey = (value) => {
  const key = trimTo(value, 40)
  return VALID_FOOD_DELIVERY_SERVICE_KEYS.has(key) ? key : ''
}

const normalizeShoppingServiceLabel = (value) => normalizeSingleLineText(value, 80)

const sanitizeAssetId = (value) => sanitizeRoleBindingAssetId(value)

const sanitizeKnowledgePointId = (value) => {
  const raw = trimTo(value, MAX_KNOWLEDGE_POINT_ID_LENGTH)
  if (!raw) return ''
  return /^[a-z0-9_-]+$/i.test(raw) ? raw : ''
}

const normalizeKnowledgePointIds = (rawIds) => {
  if (!Array.isArray(rawIds)) return []
  const unique = []
  rawIds.forEach((rawId) => {
    const id = sanitizeKnowledgePointId(rawId)
    if (!id || unique.includes(id)) return
    unique.push(id)
  })
  return unique.slice(0, MAX_ROLE_KNOWLEDGE_POINT_IDS)
}

const createEmptyRoleAssetPack = () => createEmptyRoleAssetPackShared()

const normalizeRoleProfileAssetPack = (rawPack) => normalizeRoleProfileAssetPackShared(rawPack)

const cloneRoleProfileAssetPack = (assetPack) => cloneRoleProfileAssetPackShared(assetPack)

const createEmptyRoleProfileAssetFolderBindings = () =>
  createEmptyRoleProfileAssetFolderBindingsShared()

const normalizeRoleProfileAssetFolderBindings = (rawBindings) =>
  normalizeRoleProfileAssetFolderBindingsShared(rawBindings)

const cloneRoleProfileAssetFolderBindings = (bindings) =>
  cloneRoleProfileAssetFolderBindingsShared(bindings)

const mergeRoleProfileAssetFolderBindings = (currentBindings, updates) => {
  const base = normalizeRoleProfileAssetFolderBindings(currentBindings)
  if (!updates || typeof updates !== 'object') return base

  const merged = {}
  ROLE_ASSET_FOLDER_SLOT_KEYS.forEach((slotKey) => {
    const currentSlot = base[slotKey] && typeof base[slotKey] === 'object' ? base[slotKey] : {}
    const nextSlot = updates[slotKey] && typeof updates[slotKey] === 'object' ? updates[slotKey] : {}
    merged[slotKey] = {
      ...currentSlot,
      ...nextSlot,
    }
  })
  return normalizeRoleProfileAssetFolderBindings(merged)
}

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

const normalizeAvatarUrl = (value) => sanitizeAvatarUrl(value)

const normalizeModuleContactAvatarMap = (rawMap) => {
  if (!rawMap || typeof rawMap !== 'object') return {}

  return Object.fromEntries(
    Object.entries(rawMap)
      .map(([rawContactId, rawAvatar]) => {
        const contactId = toInt(rawContactId, 0)
        if (contactId <= 0) return null
        const avatar = normalizeAvatarUrl(rawAvatar)
        if (!avatar) return null
        return [String(contactId), avatar]
      })
      .filter(Boolean),
  )
}

const normalizeModuleAvatarOverrides = (rawOverrides) => {
  const input = rawOverrides && typeof rawOverrides === 'object' ? rawOverrides : {}
  return {
    selfAvatar: normalizeAvatarUrl(input.selfAvatar),
    defaultContactAvatar: normalizeAvatarUrl(input.defaultContactAvatar),
    contactAvatars: normalizeModuleContactAvatarMap(input.contactAvatars),
  }
}

const normalizeConversationIdentityOverrides = (rawOverrides) => {
  const input = rawOverrides && typeof rawOverrides === 'object' ? rawOverrides : {}
  return {
    selfAvatar: normalizeAvatarUrl(input.selfAvatar),
    contactAvatar: normalizeAvatarUrl(input.contactAvatar),
  }
}

const normalizeModuleIdentityContactIds = (rawIds) => {
  if (!Array.isArray(rawIds)) return []
  const unique = []
  rawIds.forEach((value) => {
    const id = toInt(value, 0)
    if (id <= 0 || unique.includes(id)) return
    unique.push(id)
  })
  return unique
}

const normalizeModuleIdentity = (rawIdentity) => {
  const input = rawIdentity && typeof rawIdentity === 'object' ? rawIdentity : {}
  return {
    avatar: normalizeAvatarUrl(input.avatar),
    nickname: normalizeSingleLineText(input.nickname, MAX_SHORT_LABEL_LENGTH),
    anonymityEnabled: Boolean(input.anonymityEnabled),
    anonymityScope:
      typeof input.anonymityScope === 'string' && VALID_MODULE_ANONYMITY_SCOPES.has(input.anonymityScope)
        ? input.anonymityScope
        : DEFAULT_CHAT_MODULE_IDENTITY.anonymityScope,
    anonymityContactIds: normalizeModuleIdentityContactIds(input.anonymityContactIds),
  }
}

const normalizeRestoredModuleIdentity = (rawIdentity, legacySelfAvatar = '') => {
  const normalized = normalizeModuleIdentity(rawIdentity)
  const hasExplicitAvatar =
    rawIdentity && typeof rawIdentity === 'object' && Object.prototype.hasOwnProperty.call(rawIdentity, 'avatar')

  if (!hasExplicitAvatar && !normalized.avatar) {
    normalized.avatar = normalizeAvatarUrl(legacySelfAvatar)
  }

  return normalized
}

const sanitizeExternalUrl = (value) => {
  const raw = trimTo(value, 500)
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
    imageReferenceMode:
      typeof input.imageReferenceMode === 'string' && VALID_IMAGE_REFERENCE_MODES.has(input.imageReferenceMode)
        ? input.imageReferenceMode
        : DEFAULT_CONVERSATION_AI_PREFS.imageReferenceMode,
    allowImageVirtualWithoutReference:
      typeof input.allowImageVirtualWithoutReference === 'boolean'
        ? input.allowImageVirtualWithoutReference
        : DEFAULT_CONVERSATION_AI_PREFS.allowImageVirtualWithoutReference,
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
  const imageReferenceMode =
    typeof rawMeta.imageReferenceMode === 'string' &&
    VALID_IMAGE_REFERENCE_TRANSPORT_MODES.has(rawMeta.imageReferenceMode)
      ? rawMeta.imageReferenceMode
      : 'none'
  const imageReferenceCount = clamp(toInt(rawMeta.imageReferenceCount, 0), 0, 3)
  const imageReferenceFallback = Boolean(rawMeta.imageReferenceFallback)
  const imageReferenceProvider =
    typeof rawMeta.imageReferenceProvider === 'string' && rawMeta.imageReferenceProvider.trim()
      ? rawMeta.imageReferenceProvider.trim().slice(0, MAX_AI_META_PROVIDER_LENGTH)
      : ''

  const output = {
    replyType,
    bilingual,
    imageReferenceMode,
    imageReferenceCount,
    imageReferenceFallback,
  }
  if (rerollOf) output.rerollOf = rerollOf
  if (imageReferenceProvider) output.imageReferenceProvider = imageReferenceProvider
  return output
}

const normalizeMessageSemanticRevision = (rawRevision, fallbackOriginalText = '') => {
  if (!rawRevision || typeof rawRevision !== 'object') return null

  const fallbackOriginal = trimTo(fallbackOriginalText, MAX_TEXT_BLOCK_LENGTH)
  const originalText = trimTo(rawRevision.originalText, MAX_TEXT_BLOCK_LENGTH) || fallbackOriginal
  const revisedText = trimTo(rawRevision.revisedText, MAX_TEXT_BLOCK_LENGTH)
  if (!originalText || !revisedText) return null
  if (originalText === revisedText) return null

  const revisedAtRaw = Number(rawRevision.revisedAt)
  const revisedAt =
    Number.isFinite(revisedAtRaw) && revisedAtRaw > 0
      ? Math.floor(revisedAtRaw)
      : nowTs()

  return {
    originalText,
    revisedText,
    revisedAt,
  }
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

  if (blockType === 'link_external') {
    const url = sanitizeExternalUrl(rawBlock.url)
    if (!url) return null
    return {
      type: 'link_external',
      label: normalizeSingleLineText(rawBlock.label, MAX_SHORT_LABEL_LENGTH, '外部链接'),
      url,
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

  if (blockType === 'product_card') {
    const productId = normalizeSingleLineText(rawBlock.productId, 140)
    const title = normalizeSingleLineText(rawBlock.title || rawBlock.label, MAX_SHORT_LABEL_LENGTH, '商品卡片')
    if (!productId || !title) return null
    const serviceKey = normalizeShoppingServiceKey(rawBlock.serviceKey)
    return {
      type: 'product_card',
      productId,
      title,
      category: normalizeSingleLineText(rawBlock.category, 40),
      price: normalizeSingleLineText(rawBlock.price, 40),
      currency: normalizeSingleLineText(rawBlock.currency, 8, 'CNY').toUpperCase(),
      desc: trimTo(rawBlock.desc || rawBlock.description, MAX_DETAIL_TEXT_LENGTH),
      route: sanitizeRoutePath(rawBlock.route, '/shopping'),
      serviceKey,
      serviceLabel: serviceKey ? normalizeShoppingServiceLabel(rawBlock.serviceLabel) : '',
      assetEligible: rawBlock.assetEligible === true,
      giftable: rawBlock.giftable === true,
    }
  }

  if (blockType === 'image_virtual') {
    return {
      type: 'image_virtual',
      alt: normalizeSingleLineText(rawBlock.alt, MAX_SHORT_LABEL_LENGTH, '图片消息'),
      url: sanitizeImageUrl(rawBlock.url),
      assetId: sanitizeAssetId(rawBlock.assetId),
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
  const firstProductCard = Array.isArray(blocks)
    ? blocks.find((block) => block?.type === 'product_card' && block.title)
    : null
  if (firstProductCard) return `[商品] ${firstProductCard.title}`

  if (!Array.isArray(blocks) || blocks.length === 0) return ''

  const firstText = blocks.find((block) => block.type === 'text' && block.text?.trim())
  if (firstText) return firstText.text.trim()

  const first = blocks[0]
  if (!first) return ''
  if (first.type === 'voice_virtual') return `[语音] ${first.label}`
  if (first.type === 'module_link') return `[链接] ${first.label}`
  if (first.type === 'link_external') return `[外链] ${first.label || first.url}`
  if (first.type === 'transfer_virtual') return `[转账] ${first.amount} ${first.currency}`
  if (first.type === 'image_virtual') return `[图片] ${first.alt}`
  if (first.type === 'mini_scene') return `[互动] ${first.title}`
  return ''
}

const normalizeAvatarImageSource = (rawSource = {}, legacyAvatar = '', fallbackAlt = 'Avatar') => {
  const normalized = normalizeImageSource(rawSource, { alt: fallbackAlt })
  if (normalized.sourceType !== 'none') return normalized

  const legacyUrl = sanitizeAvatarUrl(legacyAvatar)
  if (!legacyUrl) return normalized

  return normalizeImageSource(
    {
      imageSourceType: 'url',
      imageUrl: legacyUrl,
    },
    { alt: fallbackAlt },
  )
}

const avatarImageToLegacyAvatar = (avatarImage = {}) =>
  avatarImage?.sourceType === 'url' && typeof avatarImage.url === 'string' ? avatarImage.url : ''

const normalizeRoleProfile = (rawProfile, fallbackIndex = 0) => {
  const parsedId = Number(rawProfile?.id)
  const id = Number.isFinite(parsedId) && parsedId > 0 ? Math.floor(parsedId) : nowTs() + fallbackIndex
  const name =
    typeof rawProfile?.name === 'string' && rawProfile.name.trim()
      ? rawProfile.name.trim()
      : `角色 ${id}`
  const legacyAvatar = typeof rawProfile?.avatar === 'string' ? rawProfile.avatar : ''
  const avatarImage = normalizeAvatarImageSource(rawProfile?.avatarImage, legacyAvatar, name)
  const entityType = normalizeContactsEntityType(
    rawProfile?.entityType,
    rawProfile?.isSelfProfile
      ? CONTACTS_ENTITY_TYPES.SELF_PROFILE
      : rawProfile?.isMain === false
        ? CONTACTS_ENTITY_TYPES.NPC
        : CONTACTS_ENTITY_TYPES.MAIN_ROLE,
  )
  return {
    id,
    roleId: normalizeRoleId(rawProfile?.roleId, createRoleIdFromProfileId(id, fallbackIndex)),
    name,
    role: typeof rawProfile?.role === 'string' ? rawProfile.role : '',
    entityType,
    isMain:
      typeof rawProfile?.isMain === 'boolean'
        ? rawProfile.isMain
        : entityType === CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    avatar: avatarImageToLegacyAvatar(avatarImage) || legacyAvatar,
    avatarImage,
    bio: typeof rawProfile?.bio === 'string' ? rawProfile.bio : '',
    knowledgePointIds: normalizeKnowledgePointIds(rawProfile?.knowledgePointIds),
    templateLink: normalizeProfileTemplateLink(rawProfile?.templateLink),
    profileValues: normalizeProfileValues(rawProfile?.profileValues),
    capabilities: normalizeProfileCapabilities(rawProfile?.capabilities, entityType),
    detailItems: normalizeRoleDetailItems(rawProfile?.detailItems, fallbackIndex),
    assetPack: normalizeRoleProfileAssetPack(rawProfile?.assetPack),
    assetFolderBindings: normalizeRoleProfileAssetFolderBindings(rawProfile?.assetFolderBindings),
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

const normalizeRoleProfileList = (rawProfiles = []) =>
  ensureUniqueRoleProfileRoleIds(
    Array.isArray(rawProfiles)
      ? rawProfiles.map((item, index) => normalizeRoleProfile(item, index))
      : [],
  )

const normalizeContact = (rawContact, fallbackIndex = 0) => {
  const parsedId = Number(rawContact?.id)
  const id = Number.isFinite(parsedId) && parsedId > 0 ? Math.floor(parsedId) : nowTs() + fallbackIndex
  const kind = VALID_CONTACT_KINDS.has(rawContact?.kind) ? rawContact.kind : 'role'
  const relationshipLevel = clamp(toInt(rawContact?.relationshipLevel, 50), 0, 100)
  const parsedProfileId = Number(rawContact?.profileId)
  const legacyAvatar = typeof rawContact?.avatar === 'string' ? rawContact.avatar : ''
  const name = typeof rawContact?.name === 'string' && rawContact.name.trim() ? rawContact.name.trim() : `联系人 ${id}`
  const avatarImage = normalizeAvatarImageSource(rawContact?.avatarImage, legacyAvatar, name)
  return {
    id,
    name,
    kind,
    profileId: Number.isFinite(parsedProfileId) && parsedProfileId > 0 ? Math.floor(parsedProfileId) : 0,
    role: typeof rawContact?.role === 'string' ? rawContact.role : '',
    isMain: Boolean(rawContact?.isMain),
    avatar: avatarImageToLegacyAvatar(avatarImage) || legacyAvatar,
    avatarImage,
    bio: typeof rawContact?.bio === 'string' ? rawContact.bio : '',
    serviceTemplate: typeof rawContact?.serviceTemplate === 'string' ? rawContact.serviceTemplate : '',
    shoppingServiceKey: normalizeShoppingServiceKey(rawContact?.shoppingServiceKey),
    logisticsServiceKey: normalizeLogisticsServiceKey(rawContact?.logisticsServiceKey),
    foodDeliveryServiceKey: normalizeFoodDeliveryServiceKey(rawContact?.foodDeliveryServiceKey),
    preferredImageAssetId: sanitizeAssetId(rawContact?.preferredImageAssetId),
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
  const defaultContextText = content || summaryText || (role === 'assistant' ? '...' : '')
  const semanticRevision = normalizeMessageSemanticRevision(
    rawMessage?.semanticRevision,
    defaultContextText,
  )
  const normalizedContent = semanticRevision?.revisedText || defaultContextText
  const defaultStatus = role === 'user' ? 'delivered' : 'sent'
  const status = VALID_MESSAGE_STATUS.has(rawMessage?.status) ? rawMessage.status : defaultStatus

  return {
    id: typeof rawMessage?.id === 'string' && rawMessage.id ? rawMessage.id : messageId(),
    role,
    content: normalizedContent,
    blocks,
    quote: normalizeMessageQuote(rawMessage?.quote),
    aiMeta: normalizeMessageMeta(rawMessage?.aiMeta),
    semanticRevision,
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
    identityOverrides: normalizeConversationIdentityOverrides(rawConversation?.identityOverrides),
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
    autoPushScheduleId:
      typeof rawConversation?.autoPushScheduleId === 'string'
        ? rawConversation.autoPushScheduleId.trim().slice(0, 120)
        : '',
    autoPushScheduledAt:
      typeof rawConversation?.autoPushScheduledAt === 'number' &&
      Number.isFinite(rawConversation.autoPushScheduledAt)
        ? Math.max(0, Math.floor(rawConversation.autoPushScheduledAt))
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
  const revisedText = trimTo(message?.semanticRevision?.revisedText, MAX_TEXT_BLOCK_LENGTH)
  if (revisedText) return revisedText
  if (typeof message.content === 'string' && message.content.trim()) return message.content.trim()
  return summarizeBlocks(message.blocks)
}

export const useChatStore = defineStore('chat', () => {
  const roleProfiles = reactive([])
  const contacts = reactive([])
  const moduleAvatarOverrides = reactive(
    normalizeModuleAvatarOverrides(DEFAULT_CHAT_MODULE_AVATAR_OVERRIDES),
  )
  const moduleIdentity = reactive(normalizeModuleIdentity(DEFAULT_CHAT_MODULE_IDENTITY))
  const conversations = reactive({})
  const messagesByConversation = reactive({})
  const hasFinishedStorageHydration = ref(false)
  const loadingAI = ref(false)

  const getRoleProfileById = (profileId) =>
    roleProfiles.find((item) => Number(item.id) === Number(profileId)) || null

  const getRoleProfileByRoleId = (roleId) => {
    const normalized = normalizeRoleId(roleId)
    if (!normalized) return null
    return roleProfiles.find((item) => normalizeRoleId(item.roleId).toLowerCase() === normalized.toLowerCase()) || null
  }

  const isRoleIdAvailable = (roleId, excludeProfileId = 0) => {
    const normalized = normalizeRoleId(roleId)
    if (!isValidRoleId(normalized)) return false
    const excluded = Number(excludeProfileId) || 0
    return !roleProfiles.some(
      (item) =>
        Number(item.id) !== excluded &&
        normalizeRoleId(item.roleId).toLowerCase() === normalized.toLowerCase(),
    )
  }

  const getRoleProfileAssetPack = (profileId) => {
    const profile = getRoleProfileById(profileId)
    return cloneRoleProfileAssetPack(profile?.assetPack)
  }

  const getRoleProfileAssetFolderBindings = (profileId) => {
    const profile = getRoleProfileById(profileId)
    return cloneRoleProfileAssetFolderBindings(profile?.assetFolderBindings)
  }

  const setRoleProfileAssetPack = (profileId, nextPack = {}) => {
    const target = getRoleProfileById(profileId)
    if (!target) return false
    const current = normalizeRoleProfileAssetPack(target.assetPack)
    const normalized = normalizeRoleProfileAssetPack({
      ...current,
      ...(nextPack && typeof nextPack === 'object' ? nextPack : {}),
    })
    const changed =
      JSON.stringify(current) !== JSON.stringify(normalized)
    if (!changed) return false
    target.assetPack = normalized
    target.updatedAt = nowTs()
    return true
  }

  const setRoleProfileAssetFolderBindings = (profileId, nextBindings = {}) => {
    const target = getRoleProfileById(profileId)
    if (!target) return false
    const current = normalizeRoleProfileAssetFolderBindings(target.assetFolderBindings)
    const normalized = mergeRoleProfileAssetFolderBindings(current, nextBindings)
    const changed = JSON.stringify(current) !== JSON.stringify(normalized)
    if (!changed) return false
    target.assetFolderBindings = normalized
    target.updatedAt = nowTs()
    return true
  }

  const listRoleDetailItems = (profileId, section = '') => {
    const profile = getRoleProfileById(profileId)
    if (!profile) return []
    const normalizedSection = section ? normalizeRoleDetailSection(section) : ''
    return cloneRoleDetailItems(profile.detailItems).filter(
      (item) => !normalizedSection || item.section === normalizedSection,
    )
  }

  const addRoleDetailItem = (profileId, section, input = {}) => {
    const profile = getRoleProfileById(profileId)
    if (!profile) return null
    const item = createRoleDetailItem(section, input)
    if (!item) return null
    profile.detailItems = normalizeRoleDetailItems([item, ...(profile.detailItems || [])])
    profile.updatedAt = nowTs()
    return { ...item }
  }

  const removeRoleDetailItem = (profileId, itemId) => {
    const profile = getRoleProfileById(profileId)
    const id = typeof itemId === 'string' ? itemId.trim() : ''
    if (!profile || !id) return false
    const current = normalizeRoleDetailItems(profile.detailItems)
    const next = current.filter((item) => item.id !== id)
    if (next.length === current.length) return false
    profile.detailItems = next
    profile.updatedAt = nowTs()
    return true
  }

  const updateRoleDetailItem = (profileId, itemId, updates = {}) => {
    const profile = getRoleProfileById(profileId)
    const id = typeof itemId === 'string' ? itemId.trim() : ''
    if (!profile || !id || !updates || typeof updates !== 'object') return null
    const current = normalizeRoleDetailItems(profile.detailItems)
    const index = current.findIndex((item) => item.id === id)
    if (index < 0) return null
    const existing = current[index]
    const nextItem = createRoleDetailItem(existing.section, {
      ...existing,
      ...updates,
      id: existing.id,
      sourceKind: existing.sourceKind,
      sourceModule: existing.sourceModule,
      sourceId: existing.sourceId,
      memoryKey: existing.memoryKey,
      relationshipEventId: existing.relationshipEventId,
      createdAt: existing.createdAt,
      updatedAt: nowTs(),
    })
    if (!nextItem) return null
    const next = [...current]
    next.splice(index, 1, nextItem)
    profile.detailItems = normalizeRoleDetailItems(next)
    profile.updatedAt = nowTs()
    return { ...nextItem }
  }

  const clearRoleEventAttachedDetailItems = (profileId, options = {}) => {
    const profile = getRoleProfileById(profileId)
    if (!profile) return 0
    const current = normalizeRoleDetailItems(profile.detailItems)
    const next = options?.memoryKey || Array.isArray(options?.sourceRefs)
      ? filterRoleDetailItemsForMemoryDelete(current, options)
      : filterRoleDetailItemsForReset(current)
    const removedCount = current.length - next.length
    if (removedCount <= 0) return 0
    profile.detailItems = next
    profile.updatedAt = nowTs()
    return removedCount
  }

  const getRoleBindingContract = (contactId, options = {}) => {
    const numericContactId = toInt(contactId, 0)
    const target = getRawContactById(numericContactId)
    const moduleKey =
      typeof options.moduleKey === 'string' && options.moduleKey.trim()
        ? options.moduleKey.trim()
        : 'chat'

    if (!target) {
      return createRoleBindingContract({
        moduleKey,
        contact: {
          id: numericContactId,
          kind: 'role',
          name: '',
          profileId: 0,
        },
        relationshipLevel: 0,
        relationshipNote: '',
        preferredImageAssetId: '',
        profileAssetPack: createEmptyRoleAssetPack(),
        profileAssetFolderBindings: createEmptyRoleProfileAssetFolderBindings(),
        avatarSources: {
          fallbackSeed: numericContactId > 0 ? `contact-${numericContactId}` : 'Contact',
        },
      })
    }

    const resolved = resolveContactWithProfile(target) || { ...target }
    const profile = getRoleProfileById(resolved.profileId)
    const key = String(Number(target.id))
    const conversation = conversations[key]
    const conversationOverrides = normalizeConversationIdentityOverrides(conversation?.identityOverrides)
    const perContactModuleAvatar = getModuleContactAvatarOverride(resolved.id)

    return createRoleBindingContract({
      moduleKey,
      contact: {
        id: resolved.id,
        kind: resolved.kind,
        name: resolved.name,
        profileId: resolved.profileId,
      },
      profile:
        profile || {
          id: resolved.profileId,
          name: resolved.name,
          role: resolved.role,
          isMain: resolved.isMain,
          entityType: resolved.isMain ? CONTACTS_ENTITY_TYPES.MAIN_ROLE : CONTACTS_ENTITY_TYPES.NPC,
          templateLink: normalizeProfileTemplateLink(),
          profileValues: [],
          capabilities: normalizeProfileCapabilities(
            {},
            resolved.isMain ? CONTACTS_ENTITY_TYPES.MAIN_ROLE : CONTACTS_ENTITY_TYPES.NPC,
          ),
          tags: [],
        },
      relationshipLevel: resolved.relationshipLevel,
      relationshipNote: resolved.relationshipNote,
      preferredImageAssetId: sanitizeAssetId(resolved.preferredImageAssetId),
      profileAssetPack: profile?.assetPack || resolved.profileAssetPack,
      profileAssetFolderBindings:
        profile?.assetFolderBindings || resolved.profileAssetFolderBindings,
      avatarSources: {
        threadAvatar: conversationOverrides.contactAvatar,
        moduleAvatar: perContactModuleAvatar || moduleAvatarOverrides.defaultContactAvatar,
        globalAvatar: resolved.avatar,
        fallbackSeed: resolved.name || `contact-${resolved.id}`,
      },
    })
  }

  const listRoleBindingContracts = (contactIds = [], options = {}) => {
    const ids = Array.isArray(contactIds)
      ? contactIds
          .map((id) => toInt(id, 0))
          .filter((id) => id > 0)
      : []
    const sourceIds =
      ids.length > 0
        ? ids
        : contacts
            .map((item) => toInt(item.id, 0))
            .filter((id) => id > 0)
    return sourceIds.map((id) => getRoleBindingContract(id, options))
  }

  const getRoleBindingAssetContext = (contactId) => {
    const contract = getRoleBindingContract(contactId, { moduleKey: 'chat' })
    if (!contract.roleBound) {
      return {
        profileId: 0,
        profileName: '',
        preferredImageAssetId: '',
        recommendedImageAssetId: '',
        profileAssetPack: createEmptyRoleAssetPack(),
        profileAssetIds: [],
        profileAssetFolderBindings: createEmptyRoleProfileAssetFolderBindings(),
      }
    }
    return toRoleBindingAssetContext(contract)
  }

  const applyModuleAvatarOverrides = (rawOverrides) => {
    const normalized = normalizeModuleAvatarOverrides(rawOverrides)
    moduleAvatarOverrides.selfAvatar = normalized.selfAvatar
    moduleAvatarOverrides.defaultContactAvatar = normalized.defaultContactAvatar
    moduleAvatarOverrides.contactAvatars = normalized.contactAvatars
  }

  const applyModuleIdentity = (rawIdentity) => {
    const normalized = normalizeModuleIdentity(rawIdentity)
    moduleIdentity.avatar = normalized.avatar
    moduleIdentity.nickname = normalized.nickname
    moduleIdentity.anonymityEnabled = normalized.anonymityEnabled
    moduleIdentity.anonymityScope = normalized.anonymityScope
    moduleIdentity.anonymityContactIds = normalized.anonymityContactIds
  }

  const applyRestoredModuleIdentity = (rawIdentity, legacySelfAvatar = moduleAvatarOverrides.selfAvatar) => {
    const normalized = normalizeRestoredModuleIdentity(rawIdentity, legacySelfAvatar)
    moduleIdentity.avatar = normalized.avatar
    moduleIdentity.nickname = normalized.nickname
    moduleIdentity.anonymityEnabled = normalized.anonymityEnabled
    moduleIdentity.anonymityScope = normalized.anonymityScope
    moduleIdentity.anonymityContactIds = normalized.anonymityContactIds
  }

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
      avatarImage: normalizeAvatarImageSource(profile.avatarImage, profile.avatar || contact.avatar, profile.name),
      isMain: Boolean(profile.isMain),
      profileAssetPack: cloneRoleProfileAssetPack(profile.assetPack),
      profileAssetFolderBindings: cloneRoleProfileAssetFolderBindings(profile.assetFolderBindings),
      preferredImageAssetId: sanitizeAssetId(contact.preferredImageAssetId),
    }
  }

  const getContactById = (contactId) => {
    const raw = getRawContactById(contactId)
    return resolveContactWithProfile(raw)
  }

  const getModuleAvatarOverrides = () => normalizeModuleAvatarOverrides(moduleAvatarOverrides)

  const getModuleIdentity = () => normalizeModuleIdentity(moduleIdentity)

  const getModuleContactAvatarOverride = (contactId) => {
    const key = String(toInt(contactId, 0))
    if (!key || key === '0') return ''
    return normalizeAvatarUrl(moduleAvatarOverrides.contactAvatars?.[key])
  }

  const setModuleAvatarOverrides = (updates = {}) => {
    if (!updates || typeof updates !== 'object') return false
    let changed = false

    if (Object.prototype.hasOwnProperty.call(updates, 'selfAvatar')) {
      const next = normalizeAvatarUrl(updates.selfAvatar)
      if (moduleAvatarOverrides.selfAvatar !== next) {
        moduleAvatarOverrides.selfAvatar = next
        changed = true
      }
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'defaultContactAvatar')) {
      const next = normalizeAvatarUrl(updates.defaultContactAvatar)
      if (moduleAvatarOverrides.defaultContactAvatar !== next) {
        moduleAvatarOverrides.defaultContactAvatar = next
        changed = true
      }
    }

    if (updates.contactAvatars && typeof updates.contactAvatars === 'object') {
      const nextMap = normalizeModuleContactAvatarMap(updates.contactAvatars)
      const existingKeys = Object.keys(moduleAvatarOverrides.contactAvatars || {})
      const nextKeys = Object.keys(nextMap)
      if (
        existingKeys.length !== nextKeys.length ||
        existingKeys.some((key) => moduleAvatarOverrides.contactAvatars[key] !== nextMap[key])
      ) {
        moduleAvatarOverrides.contactAvatars = nextMap
        changed = true
      }
    }

    return changed
  }

  const setModuleIdentity = (updates = {}) => {
    if (!updates || typeof updates !== 'object') return false

    const current = getModuleIdentity()
    const next = normalizeModuleIdentity(
      {
        ...current,
        ...updates,
      },
    )

    if (
      current.avatar === next.avatar &&
      current.nickname === next.nickname &&
      current.anonymityEnabled === next.anonymityEnabled &&
      current.anonymityScope === next.anonymityScope &&
      current.anonymityContactIds.length === next.anonymityContactIds.length &&
      current.anonymityContactIds.every((id, index) => id === next.anonymityContactIds[index])
    ) {
      return false
    }
    applyModuleIdentity(next)
    return true
  }

  const isModuleIdentityAnonymousForContact = (contactId) => {
    const numericContactId = toInt(contactId, 0)
    if (numericContactId <= 0) return false

    const identity = getModuleIdentity()
    if (!identity.anonymityEnabled) return false
    if (identity.anonymityScope === 'all') return true
    return identity.anonymityContactIds.includes(numericContactId)
  }

  const setModuleContactAvatarOverride = (contactId, avatar) => {
    const numericContactId = toInt(contactId, 0)
    if (numericContactId <= 0) return false
    const key = String(numericContactId)
    const nextAvatar = normalizeAvatarUrl(avatar)
    const currentAvatar = normalizeAvatarUrl(moduleAvatarOverrides.contactAvatars?.[key])

    if (!nextAvatar) {
      if (!currentAvatar) return false
      const nextMap = { ...(moduleAvatarOverrides.contactAvatars || {}) }
      delete nextMap[key]
      moduleAvatarOverrides.contactAvatars = nextMap
      return true
    }

    if (currentAvatar === nextAvatar) return false
    moduleAvatarOverrides.contactAvatars = {
      ...(moduleAvatarOverrides.contactAvatars || {}),
      [key]: nextAvatar,
    }
    return true
  }

  const getConversationIdentityOverrides = (contactId) => {
    const conversation = getConversationByContactId(contactId)
    return normalizeConversationIdentityOverrides(conversation?.identityOverrides)
  }

  const setConversationIdentityOverrides = (contactId, updates = {}) => {
    const numericContactId = toInt(contactId, 0)
    if (numericContactId <= 0) return false
    if (!updates || typeof updates !== 'object') return false

    const conversation = ensureConversationForContact(numericContactId)
    const next = normalizeConversationIdentityOverrides({
      ...conversation.identityOverrides,
      ...updates,
    })
    const current = normalizeConversationIdentityOverrides(conversation.identityOverrides)

    if (current.selfAvatar === next.selfAvatar && current.contactAvatar === next.contactAvatar) {
      return false
    }

    conversation.identityOverrides = next
    conversation.updatedAt = nowTs()
    return true
  }

  const resolveContactAvatar = (contactId) => {
    const contract = getRoleBindingContract(contactId, { moduleKey: 'chat' })
    return contract.avatar.resolved || resolveAvatarWithHierarchy({ fallbackSeed: 'Contact' })
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

  const getDefaultConversationAiPrefs = () =>
    normalizeConversationAiPrefs(DEFAULT_CONVERSATION_AI_PREFS)

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

    if (Object.prototype.hasOwnProperty.call(input, 'autoPushScheduleId')) {
      conversation.autoPushScheduleId =
        typeof input.autoPushScheduleId === 'string'
          ? input.autoPushScheduleId.trim().slice(0, 120)
          : ''
    }

    if (Object.prototype.hasOwnProperty.call(input, 'autoPushScheduledAt')) {
      const value = Number(input.autoPushScheduledAt)
      conversation.autoPushScheduledAt = Number.isFinite(value)
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
      semanticRevision: null,
    }
    syncConversationSummary(contactId)
    return true
  }

  const getMessageContextText = (message) => {
    const revisedText = trimTo(message?.semanticRevision?.revisedText, MAX_TEXT_BLOCK_LENGTH)
    if (revisedText) return revisedText
    const content = trimTo(message?.content, MAX_TEXT_BLOCK_LENGTH)
    if (content) return content
    return summarizeBlocks(Array.isArray(message?.blocks) ? message.blocks : [])
  }

  const getPrimaryTextBlockIndex = (blocks = []) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return -1
    const primaryIndex = blocks.findIndex(
      (block) => block?.type === 'text' && block?.variant !== 'secondary',
    )
    if (primaryIndex >= 0) return primaryIndex
    return blocks.findIndex((block) => block?.type === 'text')
  }

  const patchMessagePrimaryTextBlock = (message, nextText) => {
    const normalizedText = trimTo(nextText, MAX_TEXT_BLOCK_LENGTH)
    if (!normalizedText) return Array.isArray(message?.blocks) ? message.blocks : []

    const role = message?.role === 'user' ? 'user' : 'assistant'
    const cloned = Array.isArray(message?.blocks)
      ? message.blocks.map((block) => (block && typeof block === 'object' ? { ...block } : block))
      : []

    if (cloned.length === 0) {
      return normalizeMessageBlocks([], normalizedText, role)
    }

    const textIndex = getPrimaryTextBlockIndex(cloned)
    if (textIndex >= 0) {
      cloned[textIndex] = {
        ...cloned[textIndex],
        type: 'text',
        text: normalizedText,
        variant: cloned[textIndex]?.variant === 'secondary' ? 'secondary' : 'primary',
        lang: typeof cloned[textIndex]?.lang === 'string' ? cloned[textIndex].lang : 'auto',
      }
      return cloned
    }

    const hasRichBlock = cloned.some((block) => block?.type && block.type !== 'text')
    if (hasRichBlock) {
      return cloned
    }

    return normalizeMessageBlocks([], normalizedText, role)
  }

  const reviseMessageSemantic = (contactId, targetMessageId, nextText, options = {}) => {
    const { list, index } = getMessageIndex(contactId, targetMessageId)
    if (index < 0) return false

    const target = list[index]
    const revisedText = trimTo(nextText, MAX_TEXT_BLOCK_LENGTH)
    if (!revisedText) return false

    const currentContext = getMessageContextText(target)
    const currentRevision = normalizeMessageSemanticRevision(
      target?.semanticRevision,
      currentContext,
    )
    const originalText = currentRevision?.originalText || currentContext
    if (!originalText) return false

    const revisedAtInput = Number(options?.revisedAt)
    const revisedAt =
      Number.isFinite(revisedAtInput) && revisedAtInput > 0
        ? Math.floor(revisedAtInput)
        : nowTs()

    const nextRevision =
      revisedText === originalText
        ? null
        : {
            originalText,
            revisedText,
            revisedAt,
          }

    const nextBlocks = patchMessagePrimaryTextBlock(target, revisedText)
    list[index] = {
      ...target,
      content: revisedText,
      blocks: nextBlocks,
      semanticRevision: nextRevision,
    }
    syncConversationSummary(contactId)
    return true
  }

  const restoreMessageSemanticRevision = (contactId, targetMessageId) => {
    const { list, index } = getMessageIndex(contactId, targetMessageId)
    if (index < 0) return false

    const target = list[index]
    const revision = normalizeMessageSemanticRevision(
      target?.semanticRevision,
      getMessageContextText(target),
    )
    if (!revision) return false

    const restoredText = revision.originalText
    const restoredBlocks = patchMessagePrimaryTextBlock(target, restoredText)

    list[index] = {
      ...target,
      content: restoredText,
      blocks: restoredBlocks,
      semanticRevision: null,
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

  const clearContactConversationHistory = (contactId) => {
    const numericId = Number(contactId)
    if (!Number.isFinite(numericId) || numericId <= 0) return false
    const contact = getRawContactById(numericId)
    if (!contact) return false
    const key = conversationKeyForContact(numericId)
    const conversation = ensureConversationForContact(numericId)
    messagesByConversation[key] = []
    conversation.unread = 0
    conversation.draft = ''
    conversation.lastMessage = ''
    conversation.lastMessageAt = 0
    conversation.updatedAt = nowTs()
    contact.lastMessage = ''
    return true
  }

  const clearRoleProfileChatHistory = (profileId) => {
    const numericId = Number(profileId)
    if (!Number.isFinite(numericId) || numericId <= 0) return 0
    const bindingIds = contacts
      .filter((contact) => contact.kind === 'role' && Number(contact.profileId) === numericId)
      .map((contact) => contact.id)
    let cleared = 0
    bindingIds.forEach((contactId) => {
      if (clearContactConversationHistory(contactId)) cleared += 1
    })
    return cleared
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
    const nextId = payload.id ?? maxProfileId + 1
    const normalized = normalizeRoleProfile(
      {
        ...payload,
        id: nextId,
      },
      roleProfiles.length,
    )
    if (!isValidRoleId(normalized.roleId) || !isRoleIdAvailable(normalized.roleId)) {
      return null
    }
    roleProfiles.push(normalized)
    return normalized
  }

  const updateRoleProfile = (profileId, updates = {}) => {
    const target = getRoleProfileById(profileId)
    if (!target || !updates || typeof updates !== 'object') return false

    if (Object.prototype.hasOwnProperty.call(updates, 'roleId')) {
      const roleId = normalizeRoleId(updates.roleId)
      if (!isValidRoleId(roleId) || !isRoleIdAvailable(roleId, target.id)) return false
      target.roleId = roleId
    }

    if (typeof updates.name === 'string' && updates.name.trim()) {
      target.name = updates.name.trim()
    }
    if (typeof updates.role === 'string') {
      target.role = updates.role
    }
    if (typeof updates.avatar === 'string') {
      target.avatar = updates.avatar
      target.avatarImage = normalizeAvatarImageSource(target.avatarImage, updates.avatar, target.name)
    }
    if (updates.avatarImage && typeof updates.avatarImage === 'object') {
      target.avatarImage = normalizeAvatarImageSource(updates.avatarImage, target.avatar, target.name)
      target.avatar = avatarImageToLegacyAvatar(target.avatarImage)
    }
    if (typeof updates.bio === 'string') {
      target.bio = updates.bio
    }
    if (typeof updates.isMain === 'boolean') {
      target.isMain = updates.isMain
    }
    if (typeof updates.entityType === 'string') {
      const entityType = normalizeContactsEntityType(updates.entityType, target.entityType)
      target.entityType = entityType
      target.isMain = entityType === CONTACTS_ENTITY_TYPES.MAIN_ROLE
      target.capabilities = normalizeProfileCapabilities(target.capabilities, entityType)
    }
    if (updates.templateLink && typeof updates.templateLink === 'object') {
      target.templateLink = normalizeProfileTemplateLink(updates.templateLink)
    }
    if (Array.isArray(updates.profileValues)) {
      target.profileValues = normalizeProfileValues(updates.profileValues)
    }
    if (updates.capabilities && typeof updates.capabilities === 'object') {
      target.capabilities = normalizeProfileCapabilities(updates.capabilities, target.entityType)
    }
    if (Array.isArray(updates.tags)) {
      target.tags = updates.tags
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    }
    if (Array.isArray(updates.knowledgePointIds)) {
      target.knowledgePointIds = normalizeKnowledgePointIds(updates.knowledgePointIds)
    }
    if (Array.isArray(updates.detailItems)) {
      target.detailItems = normalizeRoleDetailItems(updates.detailItems)
    }
    if (updates.assetPack && typeof updates.assetPack === 'object') {
      target.assetPack = normalizeRoleProfileAssetPack({
        ...target.assetPack,
        ...updates.assetPack,
      })
    }
    if (updates.assetFolderBindings && typeof updates.assetFolderBindings === 'object') {
      target.assetFolderBindings = mergeRoleProfileAssetFolderBindings(
        target.assetFolderBindings,
        updates.assetFolderBindings,
      )
    }
    target.updatedAt = nowTs()
    return true
  }

  const upgradeNpcToMainRole = (profileId, options = {}) => {
    const target = getRoleProfileById(profileId)
    if (!target || target.entityType !== CONTACTS_ENTITY_TYPES.NPC) return null

    const relationshipMode = options.relationshipMode === 'full' ? 'full' : 'lightweight'
    target.entityType = CONTACTS_ENTITY_TYPES.MAIN_ROLE
    target.isMain = true
    if (typeof options.role === 'string') target.role = options.role
    if (typeof options.bio === 'string') target.bio = options.bio
    target.capabilities = normalizeProfileCapabilities(
      {
        ...createDefaultCapabilitiesForEntityType(CONTACTS_ENTITY_TYPES.MAIN_ROLE),
        canUseFullRelationshipProgress: relationshipMode === 'full',
        canUseMemoryGroups: relationshipMode === 'full',
        canUseRouteProgression: relationshipMode === 'full',
      },
      CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    )
    target.updatedAt = nowTs()
    return target
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
    if (profile.capabilities?.canAppearInChatDirectory === false) return null

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
    if (Object.prototype.hasOwnProperty.call(updates, 'preferredImageAssetId')) {
      target.preferredImageAssetId = sanitizeAssetId(updates.preferredImageAssetId)
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
      target.avatarImage = normalizeAvatarImageSource(target.avatarImage, updates.avatar, target.name)
    }
    if (updates.avatarImage && typeof updates.avatarImage === 'object') {
      target.avatarImage = normalizeAvatarImageSource(updates.avatarImage, target.avatar, target.name)
      target.avatar = avatarImageToLegacyAvatar(target.avatarImage)
    }
    if (typeof updates.bio === 'string') {
      target.bio = updates.bio
    }
    if (typeof updates.serviceTemplate === 'string') {
      target.serviceTemplate = updates.serviceTemplate
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'shoppingServiceKey')) {
      target.shoppingServiceKey = normalizeShoppingServiceKey(updates.shoppingServiceKey)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'logisticsServiceKey')) {
      target.logisticsServiceKey = normalizeLogisticsServiceKey(updates.logisticsServiceKey)
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'foodDeliveryServiceKey')) {
      target.foodDeliveryServiceKey = normalizeFoodDeliveryServiceKey(updates.foodDeliveryServiceKey)
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
    if (Object.prototype.hasOwnProperty.call(updates, 'preferredImageAssetId')) {
      target.preferredImageAssetId = sanitizeAssetId(updates.preferredImageAssetId)
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
    applyModuleAvatarOverrides(DEFAULT_CHAT_MODULE_AVATAR_OVERRIDES)
    applyModuleIdentity(DEFAULT_CHAT_MODULE_IDENTITY)
    const sourceProfiles = Array.isArray(legacyContacts)
      ? normalizeRoleProfileList(
          normalizedContacts
            .filter((contact) => (contact.kind || 'role') === 'role')
            .map((contact) => ({
              id: contact.profileId || contact.id,
              name: contact.name,
              role: contact.role,
              avatar: contact.avatar,
              bio: contact.bio,
              isMain: contact.isMain,
            })),
        )
      : normalizeRoleProfileList(DEFAULT_ROLE_PROFILES)

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

    applyModuleAvatarOverrides(
      persisted.moduleAvatarOverrides && typeof persisted.moduleAvatarOverrides === 'object'
        ? persisted.moduleAvatarOverrides
        : DEFAULT_CHAT_MODULE_AVATAR_OVERRIDES,
    )
    applyRestoredModuleIdentity(
      persisted.moduleIdentity && typeof persisted.moduleIdentity === 'object'
        ? persisted.moduleIdentity
        : null,
      persisted.moduleAvatarOverrides?.selfAvatar,
    )

    const normalizedProfiles = Array.isArray(persisted.roleProfiles)
      ? normalizeRoleProfileList(persisted.roleProfiles)
      : []
    resetReactiveObject(roleProfiles)
    if (normalizedProfiles.length > 0) {
      roleProfiles.push(...normalizedProfiles)
    }

    const normalizedContacts = Array.isArray(persisted.contacts)
      ? persisted.contacts.map((item, index) => normalizeContact(item, index))
      : DEFAULT_CONTACTS.map((item, index) => normalizeContact(item, index))

    if (roleProfiles.length === 0) {
      const derivedProfiles = normalizeRoleProfileList(
        normalizedContacts
          .filter((contact) => (contact.kind || 'role') === 'role')
          .map((contact) => ({
            id: contact.profileId || contact.id,
            name: contact.name,
            role: contact.role,
            avatar: contact.avatar,
            bio: contact.bio,
            isMain: contact.isMain,
          })),
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
      return false
    }

    const hasNewShape = persisted.conversations && persisted.messagesByConversation
    if (!hasNewShape) {
      hydrateFromLegacyShape(persisted.contacts, persisted.chatHistory)
      return true
    }

    hydrateFromSnapshot(persisted)
    return true
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(CHAT_STORAGE_KEY, {
      version: CHAT_STORAGE_VERSION,
    })
    if (!persisted || typeof persisted !== 'object') {
      return false
    }

    const hasNewShape = persisted.conversations && persisted.messagesByConversation
    if (!hasNewShape) {
      hydrateFromLegacyShape(persisted.contacts, persisted.chatHistory)
      return true
    }

    hydrateFromSnapshot(persisted)
    return true
  }

  const persistToStorage = () => {
    const contactsSnapshot = contacts.map((contact) => ({ ...contact }))
    const conversationsSnapshot = Object.fromEntries(
      Object.entries(conversations).map(([key, value]) => [
        key,
        {
          ...value,
          aiPrefs: normalizeConversationAiPrefs(value.aiPrefs),
          identityOverrides: normalizeConversationIdentityOverrides(value.identityOverrides),
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
          semanticRevision: normalizeMessageSemanticRevision(
            message.semanticRevision,
            message.content,
          ),
        })),
      ]),
    )

    writePersistedState(
      CHAT_STORAGE_KEY,
      {
        moduleAvatarOverrides: normalizeModuleAvatarOverrides(moduleAvatarOverrides),
        moduleIdentity: normalizeModuleIdentity(moduleIdentity),
        roleProfiles: roleProfiles.map((profile) => ({
          ...profile,
          templateLink: { ...profile.templateLink },
          profileValues: Array.isArray(profile.profileValues)
            ? profile.profileValues.map((item) => ({ ...item }))
            : [],
          capabilities: { ...profile.capabilities },
          detailItems: cloneRoleDetailItems(profile.detailItems),
          assetPack: cloneRoleProfileAssetPack(profile.assetPack),
          assetFolderBindings: cloneRoleProfileAssetFolderBindings(profile.assetFolderBindings),
        })),
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

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [moduleAvatarOverrides, moduleIdentity, roleProfiles, contacts, conversations, messagesByConversation],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    moduleAvatarOverrides,
    moduleIdentity,
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
    getDefaultConversationAiPrefs,
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
    reviseMessageSemantic,
    restoreMessageSemanticRevision,
    removeMessage,
    replaceMessage,
    clearContactConversationHistory,
    clearRoleProfileChatHistory,
    getContactById,
    resolveContactAvatar,
    getModuleAvatarOverrides,
    getModuleIdentity,
    setModuleIdentity,
    isModuleIdentityAnonymousForContact,
    setModuleAvatarOverrides,
    getModuleContactAvatarOverride,
    setModuleContactAvatarOverride,
    getConversationIdentityOverrides,
    setConversationIdentityOverrides,
    getRoleProfileById,
    getRoleProfileByRoleId,
    isRoleIdAvailable,
    getRoleProfileAssetPack,
    getRoleProfileAssetFolderBindings,
    setRoleProfileAssetPack,
    setRoleProfileAssetFolderBindings,
    getRoleBindingContract,
    listRoleBindingContracts,
    getRoleBindingAssetContext,
    listRoleDetailItems,
    addRoleDetailItem,
    removeRoleDetailItem,
    updateRoleDetailItem,
    clearRoleEventAttachedDetailItems,
    addRoleProfile,
    updateRoleProfile,
    upgradeNpcToMainRole,
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
