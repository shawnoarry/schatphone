import { ref } from 'vue'

export const SERVICE_ROUTE_FEEDBACK_SESSION_KEY = 'schatphone:chat-service-route-feedback'
export const SERVICE_ROUTE_FEEDBACK_MAX_AGE_MS = 10 * 60 * 1000

const translateWith = (t, zh, en) => (typeof t === 'function' ? t(zh, en) : en || zh)

const trimString = (value, maxLength) => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  return maxLength > 0 ? normalized.slice(0, maxLength) : normalized
}

const resolveStorage = (storage) => {
  if (storage) return storage
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') return null
  return window.sessionStorage
}

const hasSessionStorageMethods = (storage) =>
  Boolean(
    storage &&
      typeof storage.getItem === 'function' &&
      typeof storage.setItem === 'function' &&
      typeof storage.removeItem === 'function',
  )

const normalizeCurrentTime = (now) => {
  const value = typeof now === 'function' ? now() : now
  const timestamp = Number(value)
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now()
}

export const normalizeServiceRouteFeedback = (
  raw = {},
  { now = Date.now(), maxAgeMs = SERVICE_ROUTE_FEEDBACK_MAX_AGE_MS } = {},
) => {
  const chatId = Number(raw?.chatId)
  const openedAt = Number(raw?.openedAt)
  const currentTime = normalizeCurrentTime(now)
  if (!Number.isFinite(chatId) || chatId <= 0) return null
  if (!Number.isFinite(openedAt) || openedAt <= 0) return null
  if (currentTime - openedAt > maxAgeMs) return null
  return {
    chatId,
    openedAt,
    title: trimString(raw.title, 120),
    destination: trimString(raw.destination, 80),
    actionLabel: trimString(raw.actionLabel, 80),
    route: typeof raw.route === 'string' && raw.route.startsWith('/') ? raw.route : '',
  }
}

export const useChatServiceFeedbackModel = ({
  activeChat,
  isActiveServiceChat,
  chatStore,
  storage,
  now = () => Date.now(),
  storageKey = SERVICE_ROUTE_FEEDBACK_SESSION_KEY,
  routeFeedbackMaxAgeMs = SERVICE_ROUTE_FEEDBACK_MAX_AGE_MS,
  t,
} = {}) => {
  const translate = (zh, en) => translateWith(t, zh, en)
  const serviceRouteFeedback = ref(null)
  const serviceNotificationActionFeedback = ref(null)

  const normalizeRouteFeedback = (feedback) =>
    normalizeServiceRouteFeedback(feedback, {
      now: normalizeCurrentTime(now),
      maxAgeMs: routeFeedbackMaxAgeMs,
    })

  const canUseSessionStorage = () => hasSessionStorageMethods(resolveStorage(storage))

  const getSessionStorage = () => {
    const target = resolveStorage(storage)
    return hasSessionStorageMethods(target) ? target : null
  }

  const readServiceRouteFeedback = (chatId) => {
    const target = getSessionStorage()
    if (!target) return null
    try {
      const raw = target.getItem(storageKey)
      if (!raw) return null
      const feedback = normalizeRouteFeedback(JSON.parse(raw))
      if (!feedback || Number(feedback.chatId) !== Number(chatId)) return null
      return feedback
    } catch {
      return null
    }
  }

  const writeServiceRouteFeedback = (feedback) => {
    const normalized = normalizeRouteFeedback(feedback)
    serviceRouteFeedback.value = normalized
    const target = getSessionStorage()
    if (!target) return
    try {
      if (normalized) {
        target.setItem(storageKey, JSON.stringify(normalized))
      } else {
        target.removeItem(storageKey)
      }
    } catch {
      // Session feedback is best-effort UI state.
    }
  }

  const clearServiceRouteFeedback = () => {
    serviceRouteFeedback.value = null
    const target = getSessionStorage()
    if (!target) return
    try {
      target.removeItem(storageKey)
    } catch {
      // Session feedback is best-effort UI state.
    }
  }

  const clearServiceNotificationActionFeedback = () => {
    serviceNotificationActionFeedback.value = null
  }

  const syncServiceFeedbackForChat = (chatId) => {
    serviceRouteFeedback.value = chatId ? readServiceRouteFeedback(chatId) : null
    clearServiceNotificationActionFeedback()
  }

  const serviceNotificationDestinationLabel = (block = {}, path = '') => {
    const sourceModule = typeof block.sourceModule === 'string' ? block.sourceModule : ''
    if (path === '/food-delivery' || sourceModule.includes('food_delivery')) {
      return translate('Food Delivery', 'Food Delivery')
    }
    if (path === '/shopping' || sourceModule.includes('shopping') || sourceModule.includes('logistics')) {
      return translate('Shopping', 'Shopping')
    }
    if (path === '/calendar') return translate('Calendar', 'Calendar')
    if (path === '/wallet') return translate('Wallet', 'Wallet')
    return translate('来源模块', 'Source')
  }

  const recordServiceNotificationReplyFeedback = (block = {}) => {
    if (!activeChat?.value || !isActiveServiceChat?.value) return
    serviceNotificationActionFeedback.value = {
      type: 'reply',
      title:
        (typeof block.title === 'string' && block.title.trim()) ||
        translate('服务通知', 'Service notification'),
      heading: translate('已接上这条通知', 'Reply context ready'),
      detail: translate(
        '输入框正在引用这条通知；发送后会留在当前聊天，不会改动来源记录。',
        'The composer is quoting this notification; sending keeps it in this chat and does not change source records.',
      ),
    }
  }

  const recordServiceNotificationSentFeedback = (quotePayload = {}) => {
    if (!activeChat?.value || !isActiveServiceChat?.value) return
    serviceNotificationActionFeedback.value = {
      type: 'sent',
      title:
        (typeof quotePayload.preview === 'string' && quotePayload.preview.trim()) ||
        translate('服务通知', 'Service notification'),
      heading: translate('已在 Chat 回复', 'Reply sent in Chat'),
      detail: translate(
        '这条回复已留在当前服务号会话；来源订单、物流或外卖记录没有被 Chat 修改。',
        'This reply stayed in the service chat; Chat did not change source order, tracking, or delivery records.',
      ),
    }
  }

  const recordServiceThreadReadFeedback = (contact = {}, unreadCount = 0) => {
    if (!contact || typeof chatStore?.isChatSubscriptionContact !== 'function') return
    if (!chatStore.isChatSubscriptionContact(contact)) return
    const count = Math.max(0, Math.floor(Number(unreadCount) || 0))
    if (count <= 0) return
    serviceNotificationActionFeedback.value = {
      type: 'read',
      title: contact.name || translate('服务号', 'Service account'),
      heading: translate('已清除 Chat 未读', 'Chat unread cleared'),
      detail: translate(
        `已清除 ${count} 条 Chat 未读；通知卡仍保留在这条服务号会话里，来源记录不受影响。`,
        `Cleared ${count} Chat unread update${count === 1 ? '' : 's'}; notification cards remain in this service thread and source records are unchanged.`,
      ),
    }
  }

  const recordServiceRouteFeedback = (block = {}, action = null, routePath = '') => {
    if (!activeChat?.value || !isActiveServiceChat?.value) return
    const [path] = typeof routePath === 'string' ? routePath.split('?') : ['']
    writeServiceRouteFeedback({
      chatId: activeChat.value.id,
      openedAt: normalizeCurrentTime(now),
      title:
        (typeof block.title === 'string' && block.title.trim()) ||
        (typeof action?.label === 'string' && action.label.trim()) ||
        translate('服务通知', 'Service notification'),
      destination: serviceNotificationDestinationLabel(block, path),
      actionLabel: typeof action?.label === 'string' ? action.label : '',
      route: typeof routePath === 'string' && routePath.startsWith('/') ? routePath : '',
    })
    clearServiceNotificationActionFeedback()
  }

  return {
    serviceRouteFeedback,
    serviceNotificationActionFeedback,
    canUseSessionStorage,
    normalizeRouteFeedback,
    readServiceRouteFeedback,
    writeServiceRouteFeedback,
    clearServiceRouteFeedback,
    clearServiceNotificationActionFeedback,
    syncServiceFeedbackForChat,
    serviceNotificationDestinationLabel,
    recordServiceNotificationReplyFeedback,
    recordServiceNotificationSentFeedback,
    recordServiceThreadReadFeedback,
    recordServiceRouteFeedback,
  }
}
