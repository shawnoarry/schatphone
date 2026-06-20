import { ref } from 'vue'
import { describe, expect, test, vi } from 'vitest'
import {
  CHAT_ASSISTANT_MANUAL_TRIGGER_ID,
  createChatAssistantNotificationSummarizer,
  useChatAssistantResultModel,
} from '../src/composables/useChatAssistantResultModel'

const t = (zh, en) => en || zh

const createStores = ({ activeChatId = 1, now = 12345 } = {}) => {
  const chatStore = {
    markConversationRead: vi.fn(),
    incrementConversationUnread: vi.fn(),
  }
  const simulationStore = {
    submitChatSocialEventProposal: vi.fn((input, options) => ({
      id: `${input.eventType}-${options.at}`,
      input,
      options,
    })),
  }
  const systemStore = {
    touchChatTruth: vi.fn((contact, action, payload) => ({
      contact,
      action,
      payload,
    })),
  }
  const model = useChatAssistantResultModel({
    activeChatId: ref(activeChatId),
    chatStore,
    simulationStore,
    systemStore,
    now: () => now,
    t,
  })
  return {
    chatStore,
    simulationStore,
    systemStore,
    model,
  }
}

describe('Chat assistant result model interface', () => {
  test('summarizes locked-screen assistant notifications from primary text first', () => {
    const summarizer = createChatAssistantNotificationSummarizer({
      t,
      maxPreviewChars: 12,
    })

    expect(summarizer.summarizeAssistantMessagesForNotification([])).toBe(
      'You received a new reply',
    )
    expect(
      summarizer.summarizeAssistantMessagesForNotification([
        {
          content: 'fallback content',
          blocks: [
            { type: 'text', variant: 'secondary', text: 'secondary text' },
            { type: 'text', variant: 'primary', text: ' first primary text ' },
          ],
        },
      ]),
    ).toBe('first primar...')
    expect(
      summarizer.summarizeAssistantMessagesForNotification([
        { content: ' content   with   spacing ' },
      ]),
    ).toBe('content with...')
  })

  test('creates locked-screen AI reply notification payload without emitting it', () => {
    const { model } = createStores()

    expect(
      model.createAssistantReplyNotificationPayload({
        contactId: 1,
        contactName: 'Mina',
        messages: [{ content: 'hello there' }],
        count: 1,
        isLocked: false,
      }),
    ).toBeNull()
    expect(
      model.createAssistantReplyNotificationPayload({
        contactId: 1,
        contactName: 'Mina',
        messages: [{ content: 'hello there' }],
        count: 0,
        isLocked: true,
      }),
    ).toBeNull()

    expect(
      model.createAssistantReplyNotificationPayload({
        contactId: 1,
        contactName: 'Mina',
        messages: [{ content: 'hello there' }],
        count: 1,
        isLocked: true,
        createdAt: 456,
      }),
    ).toEqual({
      title: 'Mina',
      content: 'hello there',
      icon: 'fas fa-comment-dots',
      route: '/chat/1',
      source: 'chat_ai_reply',
      createdAt: 456,
    })
  })

  test('submits assistant social-event proposals with Chat-owned source metadata', () => {
    const { model, simulationStore, chatStore } = createStores({ now: 222 })

    const submitted = model.submitAssistantSocialEvents({
      contactId: 9,
      socialEvents: [
        { eventType: 'role_block_user', explanation: 'conflict escalated' },
        null,
      ],
      assistantMessages: [{ id: 'assistant-1' }],
      triggerMessageId: 'user-7',
    })

    expect(submitted).toHaveLength(1)
    expect(simulationStore.submitChatSocialEventProposal).toHaveBeenCalledWith(
      {
        contactId: 9,
        eventType: 'role_block_user',
        explanation: 'conflict escalated',
        triggerSource: 'ai_assisted',
        source: {
          moduleKey: 'chat',
          conversationId: 9,
          messageId: 'assistant-1',
          runtimeLogId: 'user-7',
        },
      },
      { chatStore, at: 222 },
    )

    model.submitAssistantSocialEvents({
      contactId: 9,
      socialEvents: [{ eventType: 'role_restore_user', explanation: 'manual trigger reply' }],
      assistantMessages: [{ id: 'assistant-2' }],
      triggerMessageId: CHAT_ASSISTANT_MANUAL_TRIGGER_ID,
    })

    expect(simulationStore.submitChatSocialEventProposal.mock.calls[1][0].source).toMatchObject({
      messageId: 'assistant-2',
      runtimeLogId: '',
    })
  })

  test('settles assistant results for the active thread as read and records reply truth', () => {
    const { model, chatStore, systemStore, simulationStore } = createStores({ activeChatId: 5 })
    const contact = { id: 5, name: 'Kai' }

    const result = model.settleAssistantReplyResult({
      contactId: 5,
      contact,
      parsedMessages: [{ content: 'first' }, { content: 'second' }],
      appendedMessages: [{ id: 'assistant-1' }],
      socialEvents: [{ eventType: 'role_block_user', explanation: 'conflict' }],
      triggerMessageId: 'user-1',
      source: 'proactive',
    })

    expect(result).toMatchObject({
      count: 2,
      settledCount: 2,
      socialEventCount: 1,
      readState: 'read',
      contactName: 'Kai',
    })
    expect(chatStore.markConversationRead).toHaveBeenCalledWith(5)
    expect(chatStore.incrementConversationUnread).not.toHaveBeenCalled()
    expect(systemStore.touchChatTruth).toHaveBeenCalledWith(contact, 'assistant_reply', {
      count: 2,
      source: 'proactive',
    })
    expect(simulationStore.submitChatSocialEventProposal).toHaveBeenCalledTimes(1)
  })

  test('settles assistant results for background threads as unread with fallback count', () => {
    const { model, chatStore, systemStore } = createStores({ activeChatId: 1 })
    const contact = { id: 8, name: '' }

    const result = model.settleAssistantReplyResult({
      contactId: 8,
      contact,
      parsedMessages: [],
      appendedMessages: [],
      socialEvents: [],
      source: 'reply',
    })

    expect(result).toMatchObject({
      count: 0,
      settledCount: 1,
      readState: 'unread',
      contactName: 'New Message',
    })
    expect(chatStore.markConversationRead).not.toHaveBeenCalled()
    expect(chatStore.incrementConversationUnread).toHaveBeenCalledWith(8, 1)
    expect(systemStore.touchChatTruth).toHaveBeenCalledWith(contact, 'assistant_reply', {
      count: 1,
      source: 'reply',
    })
  })
})
