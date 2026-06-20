import { describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import {
  CHAT_PENDING_QUOTE_SOURCE_TYPES,
  useChatPendingQuoteModel,
} from '../src/composables/useChatPendingQuoteModel'

const t = (zh, en) => en || zh

const createModel = ({ messages, canCommunicate = true, canQuoteMessage, onServiceQuoteCleared } = {}) =>
  useChatPendingQuoteModel({
    activeMessages: ref(
      messages || [
        { id: 'user-1', role: 'user', content: 'hello from user' },
        { id: 'assistant-1', role: 'assistant', content: 'hello from assistant' },
      ],
    ),
    canActiveChatCommunicate: ref(canCommunicate),
    canQuoteMessage,
    messagePrimaryText: (message) => message?.content || '',
    onServiceQuoteCleared,
    t,
  })

describe('Chat pending quote model interface', () => {
  test('quotes normal messages with stable labels and truncated previews', () => {
    const longText = ` ${'hello '.repeat(20)} `
    const model = createModel({
      messages: [{ id: 'assistant-1', role: 'assistant', content: longText }],
    })

    expect(model.quoteMessage({ id: 'assistant-1', role: 'assistant', content: longText })).toBe(true)

    expect(model.pendingQuote.value).toMatchObject({
      messageId: 'assistant-1',
      role: 'assistant',
    })
    expect(model.pendingQuote.value.preview).toHaveLength(83)
    expect(model.pendingQuote.value.preview.endsWith('...')).toBe(true)
    expect(model.pendingQuoteLabel.value).toBe('Quoted assistant')
    expect(model.buildPendingQuotePayload()).toEqual({
      messageId: 'assistant-1',
      role: 'assistant',
      preview: model.pendingQuote.value.preview,
    })
  })

  test('refuses unquotable messages and falls back to quoted-message copy for blank text', () => {
    const model = createModel({
      canQuoteMessage: (message) => message?.id !== 'blocked',
    })

    expect(model.quoteMessage({ id: 'blocked', role: 'user', content: 'nope' })).toBe(false)
    expect(model.pendingQuote.value).toBeNull()

    expect(model.quoteMessage({ id: 'user-1', role: 'user', content: '   ' })).toBe(true)
    expect(model.pendingQuoteLabel.value).toBe('Quoted user')
    expect(model.pendingQuote.value.preview).toBe('Quoted message')
  })

  test('quotes service notifications only when the thread can communicate', () => {
    const model = createModel()

    const quote = model.quoteServiceNotification({
      block: {
        title: 'Order shipped',
        summary: 'Courier is nearby',
      },
      message: { id: 'assistant-1' },
    })

    expect(quote).toMatchObject({
      messageId: 'assistant-1',
      role: 'assistant',
      preview: 'Order shipped · Courier is nearby',
      sourceType: CHAT_PENDING_QUOTE_SOURCE_TYPES.SERVICE_NOTIFICATION,
    })
    expect(model.pendingQuoteLabel.value).toBe('Replying to notification')
    expect(model.buildPendingQuotePayload()).toEqual({
      messageId: 'assistant-1',
      role: 'assistant',
      preview: 'Order shipped · Courier is nearby',
      sourceType: CHAT_PENDING_QUOTE_SOURCE_TYPES.SERVICE_NOTIFICATION,
    })

    const blockedModel = createModel({ canCommunicate: false })
    expect(blockedModel.quoteServiceNotification({ block: { title: 'Order shipped' } })).toBeNull()
    expect(blockedModel.pendingQuote.value).toBeNull()
  })

  test('clears invalid quote targets and service feedback through the public interface', () => {
    const onServiceQuoteCleared = vi.fn()
    const model = createModel({
      messages: [{ id: 'service-1', role: 'assistant', content: 'Order shipped' }],
      onServiceQuoteCleared,
    })

    model.quoteServiceNotification({
      block: { title: 'Order shipped' },
      message: { id: 'service-1' },
    })

    expect(model.clearPendingQuoteForMessage('other')).toBe(false)
    expect(model.pendingQuote.value).not.toBeNull()

    expect(model.clearPendingQuoteForMessage('service-1')).toBe(true)
    expect(model.pendingQuote.value).toBeNull()
    expect(onServiceQuoteCleared).toHaveBeenCalledTimes(1)

    model.quoteServiceNotification({
      block: { title: 'Order shipped' },
      message: { id: 'missing' },
    })
    expect(model.clearInvalidPendingQuote()).toBe(true)
    expect(model.pendingQuote.value).toBeNull()
    expect(onServiceQuoteCleared).toHaveBeenCalledTimes(2)
  })

  test('drops recalled quote targets during payload creation but silent clearing keeps feedback untouched', () => {
    const onServiceQuoteCleared = vi.fn()
    const model = createModel({
      messages: [{ id: 'assistant-1', role: 'assistant', content: 'old', recalledAt: Date.now() }],
      onServiceQuoteCleared,
    })

    model.quoteServiceNotification({
      block: { title: 'Order shipped' },
      message: { id: 'assistant-1' },
    })

    expect(model.buildPendingQuotePayload()).toBeNull()
    expect(model.pendingQuote.value).toBeNull()
    expect(onServiceQuoteCleared).toHaveBeenCalledTimes(1)

    model.quoteServiceNotification({
      block: { title: 'Order shipped' },
      message: { id: 'assistant-1' },
    })
    model.clearPendingQuoteSilently()
    expect(model.pendingQuote.value).toBeNull()
    expect(onServiceQuoteCleared).toHaveBeenCalledTimes(1)
  })
})
