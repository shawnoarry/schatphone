import { computed, ref } from 'vue'

export const CHAT_MESSAGE_ACTION_IDS = Object.freeze({
  QUOTE: 'quote',
  COPY: 'copy',
  SAVE: 'save',
  EDIT: 'edit',
  RESTORE: 'restore',
  REROLL: 'reroll',
  RECALL: 'recall',
  DELETE: 'delete',
})

const translateWith = (t, zh, en) => (typeof t === 'function' ? t(zh, en) : en || zh)

const isRecalledMessage = (message) => Boolean(Number(message?.recalledAt || 0) > 0)

const hasRichMessageBlocks = (blocks = []) =>
  Array.isArray(blocks) && blocks.some((block) => block?.type && block.type !== 'text')

const hasEditableRichMessageBlock = (message, editableRichTypes) => {
  if (!message || isRecalledMessage(message)) return false
  if (!Array.isArray(message.blocks)) return false
  return message.blocks.some((block) => editableRichTypes?.has?.(block?.type))
}

const canEditMessage = (message, editableRichTypes) =>
  Boolean(
    message &&
      !isRecalledMessage(message) &&
      message.role === 'user' &&
      (!hasRichMessageBlocks(message.blocks) || hasEditableRichMessageBlock(message, editableRichTypes)),
  )

const canRestoreSemanticRevision = (message) =>
  Boolean(
    message &&
      !isRecalledMessage(message) &&
      message.role === 'user' &&
      typeof message?.semanticRevision?.revisedText === 'string' &&
      message.semanticRevision.revisedText.trim() &&
      typeof message?.semanticRevision?.originalText === 'string' &&
      message.semanticRevision.originalText.trim(),
  )

export const useChatMessageActionSheetModel = ({
  activeMessages,
  isActiveServiceChat,
  editableRichMessageTypes,
  closeUserActionPanel,
  t,
} = {}) => {
  const translate = (zh, en) => translateWith(t, zh, en)
  const activeMessageActionId = ref('')

  const activeActionMessage = computed(() => {
    if (!activeMessageActionId.value) return null
    const messages = Array.isArray(activeMessages?.value) ? activeMessages.value : []
    return messages.find((item) => item.id === activeMessageActionId.value) || null
  })

  const hasActiveMessageActions = computed(() => Boolean(activeActionMessage.value))

  const closeMessageActions = () => {
    activeMessageActionId.value = ''
  }

  const openMessageActions = (messageId) => {
    const id = typeof messageId === 'string' ? messageId.trim() : ''
    if (!id) return
    if (typeof closeUserActionPanel === 'function') closeUserActionPanel()
    activeMessageActionId.value = id
  }

  const canCopyMessage = (message) => Boolean(message && !isRecalledMessage(message))
  const canQuoteMessage = (message) => Boolean(message && !isRecalledMessage(message))
  const canRerollMessage = (message) =>
    Boolean(message && !isRecalledMessage(message) && message.role === 'assistant')
  const canToggleSavedMessage = (message) =>
    Boolean(
      message &&
        !isRecalledMessage(message) &&
        !isActiveServiceChat?.value &&
        (message.role === 'user' || message.role === 'assistant'),
    )
  const canRecallMessage = (message) =>
    Boolean(
      message &&
        !isRecalledMessage(message) &&
        !isActiveServiceChat?.value &&
        message.role === 'user',
    )

  const messageActionRows = computed(() => {
    const message = activeActionMessage.value
    if (!message) return []

    return [
      {
        id: CHAT_MESSAGE_ACTION_IDS.QUOTE,
        testId: 'chat-message-action-quote',
        label: translate('引用', 'Quote'),
        tone: 'default',
        visible: canQuoteMessage(message),
      },
      {
        id: CHAT_MESSAGE_ACTION_IDS.COPY,
        testId: 'chat-message-action-copy',
        label: translate('复制', 'Copy'),
        tone: 'default',
        visible: canCopyMessage(message),
      },
      {
        id: CHAT_MESSAGE_ACTION_IDS.SAVE,
        testId: 'chat-message-action-save',
        label: message.savedAt ? translate('取消收藏', 'Unsave') : translate('收藏', 'Save'),
        tone: 'default',
        visible: canToggleSavedMessage(message),
      },
      {
        id: CHAT_MESSAGE_ACTION_IDS.EDIT,
        testId: 'chat-message-action-edit',
        label: translate('编辑', 'Edit'),
        tone: 'default',
        visible: canEditMessage(message, editableRichMessageTypes),
      },
      {
        id: CHAT_MESSAGE_ACTION_IDS.RESTORE,
        testId: 'chat-message-action-restore',
        label: translate('恢复原文', 'Restore original'),
        tone: 'default',
        visible: canRestoreSemanticRevision(message),
      },
      {
        id: CHAT_MESSAGE_ACTION_IDS.REROLL,
        testId: 'chat-message-action-reroll',
        label: translate('重新生成', 'Regenerate'),
        tone: 'primary',
        visible: canRerollMessage(message),
      },
      {
        id: CHAT_MESSAGE_ACTION_IDS.RECALL,
        testId: 'chat-message-action-recall',
        label: translate('撤回', 'Recall'),
        tone: 'warning',
        visible: canRecallMessage(message),
      },
      {
        id: CHAT_MESSAGE_ACTION_IDS.DELETE,
        testId: 'chat-message-action-delete',
        label: translate('删除', 'Delete'),
        tone: 'danger',
        visible: true,
      },
    ].filter((action) => action.visible)
  })

  const messageActionButtonClass = (action) => {
    if (action?.tone === 'primary') {
      return 'w-full border-b border-gray-100 px-1 py-3 text-left text-sm text-blue-600 hover:bg-gray-50'
    }
    if (action?.tone === 'warning') {
      return 'w-full border-b border-gray-100 px-1 py-3 text-left text-sm text-gray-800 hover:bg-gray-50'
    }
    if (action?.tone === 'danger') {
      return 'w-full px-1 py-3 text-left text-sm text-red-600 hover:bg-gray-50'
    }
    return 'w-full border-b border-gray-100 px-1 py-3 text-left text-sm text-gray-800 hover:bg-gray-50'
  }

  return {
    activeMessageActionId,
    activeActionMessage,
    hasActiveMessageActions,
    messageActionRows,
    openMessageActions,
    closeMessageActions,
    canCopyMessage,
    canQuoteMessage,
    canEditMessage: (message) => canEditMessage(message, editableRichMessageTypes),
    canRerollMessage,
    canToggleSavedMessage,
    canRecallMessage,
    canRestoreSemanticRevision,
    messageActionButtonClass,
  }
}
