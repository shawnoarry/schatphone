import { normalizeChatAiSocialEvents } from '../lib/chat-ai-social-proposals'
import {
  extractAssistantPayloadText,
  parseAssistantJsonPayload,
  stripCodeFence,
} from '../lib/chat-response'

export const CHAT_ASSISTANT_RESPONSE_LIMITS = Object.freeze({
  maxTextChars: 3000,
  maxDetailChars: 800,
  maxLabelChars: 80,
  maxBlocks: 12,
  maxQuotePreviewChars: 240,
})

export const CHAT_ASSISTANT_REPLY_FALLBACK_TEXT = Object.freeze({
  voiceLabel: '语音消息',
  moduleLabel: '打开模块',
  transferLabel: '转账卡片',
  imageAlt: '图片消息',
  sceneTitle: '小剧场',
})

export const DEFAULT_CHAT_ASSISTANT_SAFE_MODULE_ROUTES = Object.freeze([
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

const isObject = (value) => value && typeof value === 'object'

const readPositiveInteger = (value, fallback) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback
}

export const trimChatAssistantText = (value, maxLength, fallback = '') => {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) return fallback
  if (!Number.isFinite(Number(maxLength)) || maxLength <= 0) return text
  return text.length <= maxLength ? text : text.slice(0, maxLength)
}

export const trimChatAssistantSingleLine = (value, maxLength, fallback = '') =>
  trimChatAssistantText(value, maxLength, fallback).replace(/\s+/g, ' ').trim()

export const sanitizeChatAssistantImageUrl = (value) => {
  const url = trimChatAssistantText(value, 500)
  if (!url) return ''
  if (url.startsWith('/')) return url
  if (/^https?:\/\//i.test(url)) return url
  return ''
}

export const sanitizeChatAssistantHtmlSnippet = (value) => {
  const snippet = trimChatAssistantText(value, 4000)
  if (!snippet) return ''
  return snippet
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
}

export const createChatAssistantRouteSanitizer = (safeModuleRoutes = DEFAULT_CHAT_ASSISTANT_SAFE_MODULE_ROUTES) => {
  const safeRoutes = new Set(Array.isArray(safeModuleRoutes) ? safeModuleRoutes : DEFAULT_CHAT_ASSISTANT_SAFE_MODULE_ROUTES)
  return (value, fallback = '/home') => {
    const route = trimChatAssistantText(value, 200)
    if (!route) return fallback
    if (!route.startsWith('/') || route.startsWith('//')) return fallback
    if (/\s/.test(route)) return fallback
    return safeRoutes.has(route) ? route : fallback
  }
}

export const normalizeChatAssistantReplyType = (replyType, aiPrefs = {}) => {
  const input = typeof replyType === 'string' ? replyType : 'plain'
  if (!aiPrefs.allowQuoteReply) return 'plain'
  if (input === 'quote_self' && !aiPrefs.allowSelfQuote) return 'plain'
  if (['plain', 'quote_user', 'quote_self'].includes(input)) return input
  return 'plain'
}

export const normalizeChatAssistantQuote = (
  rawQuote,
  { maxQuotePreviewChars = CHAT_ASSISTANT_RESPONSE_LIMITS.maxQuotePreviewChars } = {},
) => {
  if (!isObject(rawQuote)) return null
  const preview = trimChatAssistantText(rawQuote.preview, maxQuotePreviewChars)
  if (!preview) return null
  return {
    messageId: trimChatAssistantText(rawQuote.messageId, 128),
    role: rawQuote.role === 'assistant' ? 'assistant' : 'user',
    preview,
  }
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

export const resolveChatAssistantQuote = (
  rawQuote,
  replyType,
  quoteCandidates = [],
  options = {},
) => {
  if (replyType === 'plain') return null
  const targetRole = getQuoteTargetRole(replyType)
  const normalizedQuote = normalizeChatAssistantQuote(rawQuote, options)
  const candidate = pickQuoteCandidate(quoteCandidates, targetRole, normalizedQuote)
  if (!candidate) return null
  return {
    messageId: candidate.id,
    role: targetRole,
    preview: candidate.preview,
  }
}

export const useChatAssistantResponseModel = ({
  clampReplyCount,
  safeModuleRoutes = DEFAULT_CHAT_ASSISTANT_SAFE_MODULE_ROUTES,
  limits = {},
  fallbackText = CHAT_ASSISTANT_REPLY_FALLBACK_TEXT,
} = {}) => {
  const maxTextChars = readPositiveInteger(limits.maxTextChars, CHAT_ASSISTANT_RESPONSE_LIMITS.maxTextChars)
  const maxDetailChars = readPositiveInteger(limits.maxDetailChars, CHAT_ASSISTANT_RESPONSE_LIMITS.maxDetailChars)
  const maxLabelChars = readPositiveInteger(limits.maxLabelChars, CHAT_ASSISTANT_RESPONSE_LIMITS.maxLabelChars)
  const maxBlocks = readPositiveInteger(limits.maxBlocks, CHAT_ASSISTANT_RESPONSE_LIMITS.maxBlocks)
  const maxQuotePreviewChars = readPositiveInteger(
    limits.maxQuotePreviewChars,
    CHAT_ASSISTANT_RESPONSE_LIMITS.maxQuotePreviewChars,
  )
  const sanitizeAssistantRoute = createChatAssistantRouteSanitizer(safeModuleRoutes)

  const normalizeAssistantBlock = (rawBlock, aiPrefs = {}, options = {}) => {
    if (!isObject(rawBlock)) return null
    const blockType = typeof rawBlock.type === 'string' ? rawBlock.type : 'text'

    if (blockType === 'text') {
      const text = trimChatAssistantText(rawBlock.text, maxTextChars)
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
        label: trimChatAssistantSingleLine(rawBlock.label, maxLabelChars, fallbackText.voiceLabel),
        transcript: trimChatAssistantText(rawBlock.transcript, maxDetailChars),
        durationSec: Number.isFinite(Number(rawBlock.durationSec))
          ? Math.max(1, Math.floor(Number(rawBlock.durationSec)))
          : 8,
      }
    }

    if (blockType === 'module_link') {
      return {
        type: 'module_link',
        label: trimChatAssistantSingleLine(rawBlock.label, maxLabelChars, fallbackText.moduleLabel),
        route: sanitizeAssistantRoute(rawBlock.route, '/home'),
        note: trimChatAssistantText(rawBlock.note, maxDetailChars),
      }
    }

    if (blockType === 'transfer_virtual') {
      return {
        type: 'transfer_virtual',
        label: trimChatAssistantSingleLine(rawBlock.label, maxLabelChars, fallbackText.transferLabel),
        amount: trimChatAssistantSingleLine(rawBlock.amount, 24, '0.00'),
        currency: trimChatAssistantSingleLine(rawBlock.currency, 8, 'CNY').toUpperCase(),
        to: trimChatAssistantText(rawBlock.to, 120),
        note: trimChatAssistantText(rawBlock.note, maxDetailChars),
        actionRoute: sanitizeAssistantRoute(rawBlock.actionRoute, '/wallet'),
      }
    }

    if (blockType === 'product_card') {
      const productId = trimChatAssistantSingleLine(rawBlock.productId, 140)
      const title = trimChatAssistantSingleLine(rawBlock.title || rawBlock.label, maxLabelChars, '')
      if (!productId || !title) return null
      return {
        type: 'product_card',
        productId,
        title,
        category: trimChatAssistantSingleLine(rawBlock.category, 40),
        price: trimChatAssistantSingleLine(rawBlock.price, 40),
        currency: trimChatAssistantSingleLine(rawBlock.currency, 8, 'CNY').toUpperCase(),
        desc: trimChatAssistantText(rawBlock.desc || rawBlock.description, maxDetailChars),
        route: sanitizeAssistantRoute(rawBlock.route, '/shopping'),
        assetEligible: rawBlock.assetEligible === true,
        giftable: rawBlock.giftable === true,
      }
    }

    if (blockType === 'service_notification') {
      return null
    }

    if (blockType === 'image_virtual') {
      if (options.allowImageVirtual === false) return null
      return {
        type: 'image_virtual',
        alt: trimChatAssistantSingleLine(rawBlock.alt, maxLabelChars, fallbackText.imageAlt),
        url: sanitizeChatAssistantImageUrl(rawBlock.url),
        caption: trimChatAssistantText(rawBlock.caption, maxDetailChars),
      }
    }

    if (blockType === 'mini_scene') {
      return {
        type: 'mini_scene',
        title: trimChatAssistantSingleLine(rawBlock.title, maxLabelChars, fallbackText.sceneTitle),
        description: trimChatAssistantText(rawBlock.description, maxDetailChars),
        htmlSnippet: sanitizeChatAssistantHtmlSnippet(rawBlock.htmlSnippet),
      }
    }

    return null
  }

  const summarizePrimaryTextFromFirstRichBlock = (blocks = []) => {
    if (!Array.isArray(blocks) || blocks.length === 0) return ''
    const first = blocks.find((block) => block?.type && block.type !== 'text')
    if (!first) return ''

    if (first.type === 'voice_virtual') {
      return trimChatAssistantText(
        first.transcript ? `${first.label}：${first.transcript}` : first.label,
        maxTextChars,
        '',
      )
    }
    if (first.type === 'module_link') {
      return trimChatAssistantText(`${first.label} (${first.route || '/home'})`, maxTextChars, '')
    }
    if (first.type === 'link_external') {
      return trimChatAssistantText(`${first.label} (${first.url || ''})`, maxTextChars, '')
    }
    if (first.type === 'transfer_virtual') {
      return trimChatAssistantText(
        `${first.label} ${first.amount || '0.00'} ${first.currency || 'CNY'}`,
        maxTextChars,
        '',
      )
    }
    if (first.type === 'product_card') {
      return trimChatAssistantText(`${first.title} ${first.price || ''} ${first.currency || ''}`.trim(), maxTextChars, '')
    }
    if (first.type === 'share_card') {
      return trimChatAssistantText(`${first.title || ''} ${first.amountLabel || ''}`.trim(), maxTextChars, '')
    }
    if (first.type === 'service_notification') {
      return trimChatAssistantText(`${first.title || ''} ${first.summary || ''}`.trim(), maxTextChars, '')
    }
    if (first.type === 'image_virtual') {
      return trimChatAssistantText(
        first.caption ? `${first.alt}：${first.caption}` : first.alt,
        maxTextChars,
        '',
      )
    }
    if (first.type === 'mini_scene') {
      return trimChatAssistantText(
        first.description ? `${first.title}：${first.description}` : first.title,
        maxTextChars,
        '',
      )
    }
    return ''
  }

  const normalizeAssistantTextBlocksFlow = (blocks = [], aiPrefs = {}) => {
    const list = Array.isArray(blocks) ? blocks.filter(Boolean).slice(0, maxBlocks) : []
    const primaryTextBlocks = []
    const secondaryTextBlocks = []
    const richBlocks = []

    list.forEach((block) => {
      if (block.type !== 'text') {
        richBlocks.push(block)
        return
      }

      const text = trimChatAssistantText(block.text, maxTextChars)
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

    return [...primaryTextBlocks, ...richBlocks, ...filteredSecondary.slice(0, 1)].slice(0, maxBlocks)
  }

  const ensureAssistantPrimaryTextBlock = (blocks, fallbackTextValue = '...') => {
    const normalizedBlocks = Array.isArray(blocks) ? [...blocks].slice(0, maxBlocks) : []
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
        text: trimChatAssistantText(secondarySeed.text, maxTextChars, fallbackTextValue),
        variant: 'primary',
        lang: 'auto',
      })
      return normalizedBlocks.slice(0, maxBlocks)
    }

    normalizedBlocks.unshift({
      type: 'text',
      text: trimChatAssistantText(fallbackTextValue, maxTextChars, '...'),
      variant: 'primary',
      lang: 'auto',
    })
    return normalizedBlocks
  }

  const resolvePayloadTextFallback = (payload, fallbackTextValue = '...') =>
    trimChatAssistantText(extractAssistantPayloadText(payload), maxTextChars, fallbackTextValue)

  const normalizeAssistantMessagePayload = (
    rawMessage,
    aiPrefs = {},
    fallbackTextValue = '...',
    options = {},
  ) => {
    const payload = isObject(rawMessage) ? rawMessage : {}
    const replyType = normalizeChatAssistantReplyType(payload.replyType, aiPrefs)
    const messagePolicy = isObject(options.messagePolicy) ? options.messagePolicy : {}

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
    const fallbackFromPayload = resolvePayloadTextFallback(payload, fallbackTextValue)
    parsedBlocks = ensureAssistantPrimaryTextBlock(
      parsedBlocks,
      fallbackFromRichBlock || fallbackFromPayload || fallbackTextValue,
    )
    parsedBlocks = normalizeAssistantTextBlocksFlow(parsedBlocks, aiPrefs)
    const primaryTextBlock = parsedBlocks.find((block) => block.type === 'text' && block.variant !== 'secondary')
    const content = trimChatAssistantText(
      primaryTextBlock?.text || parsedBlocks.find((block) => block.type === 'text')?.text || fallbackTextValue,
      maxTextChars,
      '...',
    )
    const resolvedQuote = resolveChatAssistantQuote(payload.quote, replyType, options.quoteCandidates || [], {
      maxQuotePreviewChars,
    })
    const normalizedReplyType = replyType !== 'plain' && !resolvedQuote ? 'plain' : replyType

    return {
      content: content || '...',
      blocks: parsedBlocks,
      quote: resolvedQuote,
      replyType: normalizedReplyType,
    }
  }

  const parseAssistantResponse = (rawText, aiPrefs = {}, options = {}) => {
    const text = typeof rawText === 'string' ? rawText : ''
    const cleanText = stripCodeFence(text)
    const expectedReplyCount =
      typeof clampReplyCount === 'function'
        ? clampReplyCount(options.replyCount ?? aiPrefs.replyCount)
        : readPositiveInteger(options.replyCount ?? aiPrefs.replyCount, 1)
    const fallbackTextValue = trimChatAssistantText(cleanText, maxTextChars, '...')
    const quoteCandidates = Array.isArray(options.quoteCandidates) ? options.quoteCandidates : []
    const messagePolicy = isObject(options.messagePolicy) ? options.messagePolicy : {}
    const parsedPayload = parseAssistantJsonPayload(cleanText)
    const normalizedFallback = () =>
      normalizeAssistantMessagePayload({}, aiPrefs, fallbackTextValue, {
        quoteCandidates,
        messagePolicy,
      })

    if (!isObject(parsedPayload)) {
      return { messages: [normalizedFallback()], socialEvents: [] }
    }

    const rawMessages = Array.isArray(parsedPayload.messages) ? parsedPayload.messages : [parsedPayload]
    const normalizedMessages = rawMessages
      .slice(0, expectedReplyCount)
      .map((item) =>
        normalizeAssistantMessagePayload(item, aiPrefs, fallbackTextValue, {
          quoteCandidates,
          messagePolicy,
        }),
      )
      .filter(Boolean)

    if (!normalizedMessages.length) {
      return { messages: [normalizedFallback()], socialEvents: [] }
    }

    return {
      messages: normalizedMessages,
      socialEvents: normalizeChatAiSocialEvents(parsedPayload),
    }
  }

  return {
    normalizeAssistantBlock,
    normalizeAssistantMessagePayload,
    parseAssistantResponse,
    sanitizeAssistantRoute,
    summarizePrimaryTextFromFirstRichBlock,
  }
}
