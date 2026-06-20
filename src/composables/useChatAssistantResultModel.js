export const CHAT_ASSISTANT_NOTIFICATION_PREVIEW_MAX_CHARS = 72
export const CHAT_ASSISTANT_MANUAL_TRIGGER_ID = '__manual__'

const translateWith = (t, zh, en) => (typeof t === 'function' ? t(zh, en) : en || zh)

const readRefValue = (source) => (source && typeof source === 'object' && 'value' in source ? source.value : source)

const normalizeContactId = (value) => {
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : 0
}

const normalizeReplyCount = (value) => {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 1
}

const normalizeTimestamp = (value) => {
  const timestamp = Number(value)
  return Number.isFinite(timestamp) && timestamp >= 0 ? Math.floor(timestamp) : null
}

export const createChatAssistantNotificationSummarizer = ({
  t,
  maxPreviewChars = CHAT_ASSISTANT_NOTIFICATION_PREVIEW_MAX_CHARS,
} = {}) => {
  const translate = (zh, en) => translateWith(t, zh, en)
  const fallbackText = () => translate('你收到了一条新回复', 'You received a new reply')
  const maxChars = normalizeReplyCount(maxPreviewChars)

  const clampNotificationPreview = (text) => {
    const normalized = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
    if (!normalized) return fallbackText()
    if (normalized.length <= maxChars) return normalized
    return `${normalized.slice(0, maxChars)}...`
  }

  const summarizeAssistantMessagesForNotification = (messages = []) => {
    if (!Array.isArray(messages) || messages.length === 0) return fallbackText()

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

    return fallbackText()
  }

  return {
    clampNotificationPreview,
    summarizeAssistantMessagesForNotification,
  }
}

export const useChatAssistantResultModel = ({
  activeChatId,
  chatStore,
  simulationStore,
  systemStore,
  manualTriggerId = CHAT_ASSISTANT_MANUAL_TRIGGER_ID,
  now = () => Date.now(),
  t,
} = {}) => {
  const translate = (zh, en) => translateWith(t, zh, en)
  const newMessageLabel = () => translate('新消息', 'New Message')
  const { clampNotificationPreview, summarizeAssistantMessagesForNotification } =
    createChatAssistantNotificationSummarizer({ t })

  const currentTimestamp = () => {
    const value = typeof now === 'function' ? now() : now
    const normalized = normalizeTimestamp(value)
    return normalized === null ? Date.now() : normalized
  }

  const createAssistantReplyNotificationPayload = ({
    contactId,
    contactName = '',
    messages = [],
    count = 0,
    isLocked = false,
    createdAt,
  } = {}) => {
    const normalizedContactId = normalizeContactId(contactId)
    const replyCount = Number(count)
    if (!isLocked || !normalizedContactId || !Number.isFinite(replyCount) || replyCount <= 0) return null

    const payload = {
      title: (typeof contactName === 'string' && contactName.trim()) || newMessageLabel(),
      content: summarizeAssistantMessagesForNotification(messages),
      icon: 'fas fa-comment-dots',
      route: `/chat/${normalizedContactId}`,
      source: 'chat_ai_reply',
    }
    const normalizedCreatedAt = normalizeTimestamp(createdAt)
    if (normalizedCreatedAt !== null) payload.createdAt = normalizedCreatedAt
    return payload
  }

  const submitAssistantSocialEvents = ({
    contactId,
    socialEvents = [],
    assistantMessages = [],
    triggerMessageId = '',
  } = {}) => {
    if (!Array.isArray(socialEvents) || socialEvents.length === 0) return []
    const firstAssistantMessage = Array.isArray(assistantMessages)
      ? assistantMessages.find((message) => message?.id) || null
      : null
    const sourceMessageId = firstAssistantMessage?.id || ''
    const sourceTriggerId =
      triggerMessageId && triggerMessageId !== manualTriggerId ? triggerMessageId : ''

    return socialEvents
      .map((event) => {
        if (!event || typeof event !== 'object') return null
        if (typeof simulationStore?.submitChatSocialEventProposal !== 'function') return null
        return simulationStore.submitChatSocialEventProposal(
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
          { chatStore, at: currentTimestamp() },
        )
      })
      .filter(Boolean)
  }

  const settleAssistantConversationReadState = ({ contactId, count = 1 } = {}) => {
    const normalizedContactId = normalizeContactId(contactId)
    if (!normalizedContactId) return 'invalid'
    const currentActiveChatId = normalizeContactId(readRefValue(activeChatId))
    if (currentActiveChatId === normalizedContactId) {
      if (typeof chatStore?.markConversationRead === 'function') {
        chatStore.markConversationRead(normalizedContactId)
      }
      return 'read'
    }
    if (typeof chatStore?.incrementConversationUnread === 'function') {
      chatStore.incrementConversationUnread(normalizedContactId, normalizeReplyCount(count))
    }
    return 'unread'
  }

  const recordAssistantReplyTruth = ({ contact, count = 1, source = 'reply' } = {}) => {
    if (!contact || typeof systemStore?.touchChatTruth !== 'function') return null
    return systemStore.touchChatTruth(contact, 'assistant_reply', {
      count: normalizeReplyCount(count),
      source: source === 'proactive' ? 'proactive' : 'reply',
    })
  }

  const settleAssistantReplyResult = ({
    contactId,
    contact,
    parsedMessages = [],
    appendedMessages = [],
    socialEvents = [],
    triggerMessageId = '',
    source = 'reply',
  } = {}) => {
    const messages = Array.isArray(parsedMessages) ? parsedMessages : []
    const appended = Array.isArray(appendedMessages) ? appendedMessages : []
    const visibleCount = messages.length
    const settledCount = normalizeReplyCount(visibleCount || appended.length || 1)
    const submittedSocialEvents = submitAssistantSocialEvents({
      contactId,
      socialEvents,
      assistantMessages: appended,
      triggerMessageId,
    })
    const readState = settleAssistantConversationReadState({
      contactId,
      count: settledCount,
    })
    const truthSnapshot = recordAssistantReplyTruth({
      contact,
      count: settledCount,
      source,
    })

    return {
      count: visibleCount,
      settledCount,
      messages,
      socialEventCount: submittedSocialEvents.length,
      submittedSocialEvents,
      readState,
      truthSnapshot,
      contactName: contact?.name || newMessageLabel(),
    }
  }

  return {
    clampNotificationPreview,
    summarizeAssistantMessagesForNotification,
    createAssistantReplyNotificationPayload,
    submitAssistantSocialEvents,
    settleAssistantConversationReadState,
    recordAssistantReplyTruth,
    settleAssistantReplyResult,
  }
}
