import { describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import { useChatAiRequestStateModel } from '../src/composables/useChatAiRequestStateModel'

const createAbortController = () => ({
  signal: { aborted: false },
  abort: vi.fn(function abort() {
    this.signal.aborted = true
  }),
})

const createModel = ({
  activeChat = { id: 1 },
  canCommunicate = true,
  loading = false,
  abortFactory = createAbortController,
} = {}) => {
  const loadingAI = ref(loading)
  const model = useChatAiRequestStateModel({
    activeChat: ref(activeChat),
    canActiveChatCommunicate: ref(canCommunicate),
    loadingAI,
    createAbortController: abortFactory,
  })
  return { model, loadingAI }
}

describe('Chat AI request state model interface', () => {
  test('starts and finishes an in-flight request with cancel eligibility', () => {
    const { model, loadingAI } = createModel()

    const controller = model.beginAiRequest('message-1')

    expect(controller).toBeTruthy()
    expect(loadingAI.value).toBe(true)
    expect(model.activeAbortController.value).toBe(controller)
    expect(model.activeTriggerMessageId.value).toBe('message-1')
    expect(model.canCancelAi.value).toBe(true)
    expect(model.canRequestAiReply.value).toBe(false)
    expect(model.beginAiRequest('message-2')).toBeNull()

    model.finishAiRequest()

    expect(loadingAI.value).toBe(false)
    expect(model.activeAbortController.value).toBeNull()
    expect(model.activeTriggerMessageId.value).toBe('')
    expect(model.canRequestAiReply.value).toBe(true)
  })

  test('records reply failures and exposes retry eligibility until success clears retry targets', () => {
    const { model } = createModel()

    model.recordReplyFailure('AI reply failed', 'message-1')

    expect(model.aiErrorMessage.value).toBe('AI reply failed')
    expect(model.retryTriggerMessageId.value).toBe('message-1')
    expect(model.retryRerollMessageId.value).toBe('')
    expect(model.canRetryAi.value).toBe(true)

    model.completeAiRequestSuccess()

    expect(model.retryTriggerMessageId.value).toBe('')
    expect(model.retryRerollMessageId.value).toBe('')
    expect(model.aiErrorMessage.value).toBe('AI reply failed')

    model.clearAiError()
    expect(model.canRetryAi.value).toBe(false)
  })

  test('records reroll failures and clears retry targets by deleted message id', () => {
    const { model } = createModel()

    model.recordRerollFailure('Reroll failed', 'assistant-1')

    expect(model.retryTriggerMessageId.value).toBe('')
    expect(model.retryRerollMessageId.value).toBe('assistant-1')
    expect(model.canRetryAi.value).toBe(true)
    expect(model.clearRetryTargetForMessage('other')).toBe(false)
    expect(model.clearRetryTargetForMessage('assistant-1')).toBe(true)
    expect(model.canRetryAi.value).toBe(false)
  })

  test('prepares reroll requests by clearing reply retry target while preserving the in-flight trigger', () => {
    const { model, loadingAI } = createModel()
    model.recordReplyFailure('AI reply failed', 'message-1')

    const controller = model.prepareRerollRequest('assistant-1')

    expect(controller).toBeTruthy()
    expect(loadingAI.value).toBe(true)
    expect(model.aiErrorMessage.value).toBe('')
    expect(model.retryTriggerMessageId.value).toBe('')
    expect(model.activeTriggerMessageId.value).toBe('assistant-1')
  })

  test('cancels through the active controller and keeps idle cancellation a no-op', () => {
    const { model } = createModel()

    expect(model.cancelActiveAiRequest()).toBe(false)

    const controller = model.beginAiRequest('message-1')
    expect(model.cancelActiveAiRequest()).toBe(true)
    expect(controller.abort).toHaveBeenCalledTimes(1)
    expect(controller.signal.aborted).toBe(true)
  })

  test('gates request and retry eligibility by active chat, communication state, and loading state', () => {
    expect(createModel({ activeChat: null }).model.canRequestAiReply.value).toBe(false)
    expect(createModel({ canCommunicate: false }).model.canRequestAiReply.value).toBe(false)
    expect(createModel({ loading: true }).model.canRequestAiReply.value).toBe(false)

    const { model, loadingAI } = createModel()
    model.recordReplyFailure('AI reply failed', 'message-1')
    expect(model.canRetryAi.value).toBe(true)
    loadingAI.value = true
    expect(model.canRetryAi.value).toBe(false)
  })
})
