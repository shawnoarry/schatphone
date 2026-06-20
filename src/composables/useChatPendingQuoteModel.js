import { computed, ref } from 'vue'

export const CHAT_PENDING_QUOTE_SOURCE_TYPES = Object.freeze({
  SERVICE_NOTIFICATION: 'service_notification',
})

const truncateQuotePreview = (text, maxLength = 80) => {
  const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
  if (!normalized) return ''
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}...`
}

const isRecalledMessage = (message) => Boolean(Number(message?.recalledAt || 0) > 0)

const normalizeQuoteRole = (role) => (role === 'assistant' ? 'assistant' : 'user')

const translateWith = (t, zh, en) => (typeof t === 'function' ? t(zh, en) : en || zh)

const getMessageList = (activeMessages) =>
  Array.isArray(activeMessages?.value) ? activeMessages.value : []

export const useChatPendingQuoteModel = ({
  activeMessages,
  canActiveChatCommunicate,
  messagePrimaryText,
  canQuoteMessage,
  onServiceQuoteCleared,
  t,
} = {}) => {
  const translate = (zh, en) => translateWith(t, zh, en)
  const pendingQuote = ref(null)

  const pendingQuoteLabel = computed(() => {
    if (pendingQuote.value?.sourceType === CHAT_PENDING_QUOTE_SOURCE_TYPES.SERVICE_NOTIFICATION) {
      return translate('回复服务通知', 'Replying to notification')
    }
    return pendingQuote.value?.role === 'assistant'
      ? translate('引用 AI', 'Quoted assistant')
      : translate('引用用户', 'Quoted user')
  })

  const findActiveMessageById = (messageId) =>
    getMessageList(activeMessages).find((item) => item?.id === messageId) || null

  const isPendingQuoteTargetValid = () => {
    if (!pendingQuote.value?.messageId) return false
    const target = findActiveMessageById(pendingQuote.value.messageId)
    return Boolean(target && !isRecalledMessage(target))
  }

  const clearPendingQuote = () => {
    const wasServiceQuote =
      pendingQuote.value?.sourceType === CHAT_PENDING_QUOTE_SOURCE_TYPES.SERVICE_NOTIFICATION
    pendingQuote.value = null
    if (wasServiceQuote && typeof onServiceQuoteCleared === 'function') onServiceQuoteCleared()
  }

  const clearPendingQuoteSilently = () => {
    pendingQuote.value = null
  }

  const clearPendingQuoteForMessage = (messageId) => {
    if (!messageId || pendingQuote.value?.messageId !== messageId) return false
    clearPendingQuote()
    return true
  }

  const clearInvalidPendingQuote = () => {
    if (!pendingQuote.value) return false
    if (isPendingQuoteTargetValid()) return false
    clearPendingQuote()
    return true
  }

  const quoteMessage = (message) => {
    const canQuote =
      typeof canQuoteMessage === 'function'
        ? canQuoteMessage(message)
        : Boolean(message && !isRecalledMessage(message))
    if (!canQuote) return false
    const preview =
      truncateQuotePreview(
        typeof messagePrimaryText === 'function' ? messagePrimaryText(message) : message?.content,
      ) || translate('引用消息', 'Quoted message')
    pendingQuote.value = {
      messageId: message.id,
      role: normalizeQuoteRole(message.role),
      preview,
    }
    return true
  }

  const quoteServiceNotification = ({ block, message } = {}) => {
    if (!block || !canActiveChatCommunicate?.value) return null
    const preview = truncateQuotePreview([block.title, block.summary].filter(Boolean).join(' · ')) ||
      translate('服务通知', 'Service notification')
    pendingQuote.value = {
      messageId: message?.id || '',
      role: 'assistant',
      preview,
      sourceType: CHAT_PENDING_QUOTE_SOURCE_TYPES.SERVICE_NOTIFICATION,
    }
    return pendingQuote.value
  }

  const buildPendingQuotePayload = () => {
    if (!pendingQuote.value) return null
    if (!isPendingQuoteTargetValid()) {
      clearPendingQuote()
      return null
    }
    return {
      messageId: pendingQuote.value.messageId,
      role: normalizeQuoteRole(pendingQuote.value.role),
      preview: pendingQuote.value.preview || '',
      ...(pendingQuote.value.sourceType === CHAT_PENDING_QUOTE_SOURCE_TYPES.SERVICE_NOTIFICATION
        ? { sourceType: CHAT_PENDING_QUOTE_SOURCE_TYPES.SERVICE_NOTIFICATION }
        : {}),
    }
  }

  return {
    pendingQuote,
    pendingQuoteLabel,
    findActiveMessageById,
    isPendingQuoteTargetValid,
    quoteMessage,
    quoteServiceNotification,
    clearPendingQuote,
    clearPendingQuoteSilently,
    clearPendingQuoteForMessage,
    clearInvalidPendingQuote,
    buildPendingQuotePayload,
  }
}
