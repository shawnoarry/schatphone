import { computed, ref, shallowRef } from 'vue'

const hasValue = (value) => typeof value === 'string' && value.length > 0

const readBooleanRef = (source) => Boolean(source?.value)

export const useChatAiRequestStateModel = ({
  activeChat,
  canActiveChatCommunicate,
  loadingAI,
  createAbortController = () => new AbortController(),
} = {}) => {
  const aiErrorMessage = ref('')
  const activeAbortController = shallowRef(null)
  const activeTriggerMessageId = ref('')
  const retryTriggerMessageId = ref('')
  const retryRerollMessageId = ref('')

  const hasActiveRequest = computed(() => Boolean(activeAbortController.value))

  const canCancelAi = computed(() =>
    Boolean(activeAbortController.value && activeChat?.value && readBooleanRef(loadingAI)),
  )

  const canRetryAi = computed(() =>
    Boolean(
      aiErrorMessage.value &&
        activeChat?.value &&
        (retryTriggerMessageId.value || retryRerollMessageId.value) &&
        !readBooleanRef(loadingAI) &&
        !activeAbortController.value,
    ),
  )

  const canRequestAiReply = computed(() =>
    Boolean(
      activeChat?.value &&
        canActiveChatCommunicate?.value &&
        !readBooleanRef(loadingAI) &&
        !activeAbortController.value,
    ),
  )

  const isAiRequestBusy = computed(() => Boolean(readBooleanRef(loadingAI) || activeAbortController.value))

  const beginAiRequest = (triggerMessageId = '') => {
    if (isAiRequestBusy.value) return null
    const controller = createAbortController()
    activeAbortController.value = controller
    activeTriggerMessageId.value = typeof triggerMessageId === 'string' ? triggerMessageId : ''
    if (loadingAI) loadingAI.value = true
    aiErrorMessage.value = ''
    return controller
  }

  const finishAiRequest = () => {
    if (loadingAI) loadingAI.value = false
    activeAbortController.value = null
    activeTriggerMessageId.value = ''
  }

  const clearAiError = () => {
    aiErrorMessage.value = ''
  }

  const clearRetryTargets = () => {
    retryTriggerMessageId.value = ''
    retryRerollMessageId.value = ''
  }

  const clearAiErrorAndRetryTargets = () => {
    clearAiError()
    clearRetryTargets()
  }

  const completeAiRequestSuccess = () => {
    clearRetryTargets()
  }

  const recordReplyFailure = (message = '', triggerMessageId = '') => {
    aiErrorMessage.value = typeof message === 'string' ? message : ''
    retryTriggerMessageId.value = typeof triggerMessageId === 'string' ? triggerMessageId : ''
    retryRerollMessageId.value = ''
  }

  const recordRerollFailure = (message = '', messageId = '') => {
    aiErrorMessage.value = typeof message === 'string' ? message : ''
    retryTriggerMessageId.value = ''
    retryRerollMessageId.value = typeof messageId === 'string' ? messageId : ''
  }

  const prepareRerollRequest = (messageId = '') => {
    clearAiError()
    retryTriggerMessageId.value = ''
    return beginAiRequest(messageId)
  }

  const clearRetryTargetForMessage = (messageId = '') => {
    if (!hasValue(messageId)) return false
    let changed = false
    if (retryTriggerMessageId.value === messageId) {
      retryTriggerMessageId.value = ''
      changed = true
    }
    if (retryRerollMessageId.value === messageId) {
      retryRerollMessageId.value = ''
      changed = true
    }
    return changed
  }

  const clearAiRequestStateForThreadSwitch = () => {
    clearAiErrorAndRetryTargets()
  }

  const cancelActiveAiRequest = () => {
    const controller = activeAbortController.value
    if (!controller || typeof controller.abort !== 'function') return false
    controller.abort()
    return true
  }

  return {
    aiErrorMessage,
    activeAbortController,
    activeTriggerMessageId,
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
    clearRetryTargets,
    clearAiErrorAndRetryTargets,
    completeAiRequestSuccess,
    recordReplyFailure,
    recordRerollFailure,
    prepareRerollRequest,
    clearRetryTargetForMessage,
    clearAiRequestStateForThreadSwitch,
    cancelActiveAiRequest,
  }
}
