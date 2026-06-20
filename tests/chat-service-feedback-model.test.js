import { describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'
import {
  SERVICE_ROUTE_FEEDBACK_MAX_AGE_MS,
  SERVICE_ROUTE_FEEDBACK_SESSION_KEY,
  normalizeServiceRouteFeedback,
  useChatServiceFeedbackModel,
} from '../src/composables/useChatServiceFeedbackModel'

const t = (zh, en) => en || zh

const createMemoryStorage = () => {
  const entries = new Map()
  return {
    getItem: vi.fn((key) => (entries.has(key) ? entries.get(key) : null)),
    setItem: vi.fn((key, value) => {
      entries.set(key, String(value))
    }),
    removeItem: vi.fn((key) => {
      entries.delete(key)
    }),
  }
}

const createModel = ({
  activeChat = { id: 12, name: 'Daily Fresh' },
  isService = true,
  storage = createMemoryStorage(),
  now = 1_800_000_000_000,
  chatStore,
} = {}) => {
  const model = useChatServiceFeedbackModel({
    activeChat: ref(activeChat),
    isActiveServiceChat: ref(isService),
    chatStore: chatStore || {
      isChatSubscriptionContact: (contact) => Boolean(contact?.subscription),
    },
    storage,
    now: () => now,
    t,
  })
  return { model, storage, now }
}

describe('Chat service feedback model interface', () => {
  test('normalizes route feedback and records source-open feedback in session storage', () => {
    const { model, storage, now } = createModel()

    model.recordServiceNotificationReplyFeedback({ title: 'Order shipped' })
    expect(model.serviceNotificationActionFeedback.value?.type).toBe('reply')

    model.recordServiceRouteFeedback(
      { title: ' Order shipped ', sourceModule: 'shopping.order' },
      { label: 'Open order', route: '/shopping?orderId=o1' },
      '/shopping?orderId=o1',
    )

    expect(model.serviceRouteFeedback.value).toEqual({
      chatId: 12,
      openedAt: now,
      title: 'Order shipped',
      destination: 'Shopping',
      actionLabel: 'Open order',
      route: '/shopping?orderId=o1',
    })
    expect(model.serviceNotificationActionFeedback.value).toBeNull()
    expect(JSON.parse(storage.getItem(SERVICE_ROUTE_FEEDBACK_SESSION_KEY))).toEqual(
      model.serviceRouteFeedback.value,
    )
  })

  test('recovers matching route feedback from storage and ignores invalid or stale entries', () => {
    const { model, storage, now } = createModel()

    storage.setItem(
      SERVICE_ROUTE_FEEDBACK_SESSION_KEY,
      JSON.stringify({
        chatId: 12,
        openedAt: now - 10,
        title: 'Calendar changed',
        destination: 'Calendar',
        actionLabel: 'Open',
        route: '/calendar',
      }),
    )

    expect(model.readServiceRouteFeedback(13)).toBeNull()
    expect(model.readServiceRouteFeedback(12)).toMatchObject({
      chatId: 12,
      title: 'Calendar changed',
      route: '/calendar',
    })

    model.recordServiceNotificationReplyFeedback({ title: 'Needs reply' })
    model.syncServiceFeedbackForChat(12)
    expect(model.serviceRouteFeedback.value?.title).toBe('Calendar changed')
    expect(model.serviceNotificationActionFeedback.value).toBeNull()

    storage.setItem(
      SERVICE_ROUTE_FEEDBACK_SESSION_KEY,
      JSON.stringify({
        chatId: 12,
        openedAt: now - SERVICE_ROUTE_FEEDBACK_MAX_AGE_MS - 1,
        title: 'Old source',
        route: '/shopping',
      }),
    )
    expect(model.readServiceRouteFeedback(12)).toBeNull()

    storage.setItem(SERVICE_ROUTE_FEEDBACK_SESSION_KEY, '{bad json')
    expect(model.readServiceRouteFeedback(12)).toBeNull()
  })

  test('clears route feedback from state and storage', () => {
    const { model, storage } = createModel()

    model.writeServiceRouteFeedback({
      chatId: 12,
      openedAt: 1_800_000_000_000,
      title: 'Wallet update',
      route: '/wallet',
    })
    expect(storage.getItem(SERVICE_ROUTE_FEEDBACK_SESSION_KEY)).toContain('Wallet update')

    model.clearServiceRouteFeedback()

    expect(model.serviceRouteFeedback.value).toBeNull()
    expect(storage.getItem(SERVICE_ROUTE_FEEDBACK_SESSION_KEY)).toBeNull()
  })

  test('records reply and sent feedback only for active service threads', () => {
    const { model } = createModel()

    model.recordServiceNotificationReplyFeedback({ title: 'Courier nearby' })
    expect(model.serviceNotificationActionFeedback.value).toMatchObject({
      type: 'reply',
      title: 'Courier nearby',
      heading: 'Reply context ready',
    })

    model.recordServiceNotificationSentFeedback({ preview: 'Thanks, got it' })
    expect(model.serviceNotificationActionFeedback.value).toMatchObject({
      type: 'sent',
      title: 'Thanks, got it',
      heading: 'Reply sent in Chat',
    })

    const { model: normalModel } = createModel({ isService: false })
    normalModel.recordServiceNotificationReplyFeedback({ title: 'Ignored' })
    normalModel.recordServiceNotificationSentFeedback({ preview: 'Ignored' })
    expect(normalModel.serviceNotificationActionFeedback.value).toBeNull()
  })

  test('records read feedback for subscription contacts without touching source records', () => {
    const { model } = createModel()

    model.recordServiceThreadReadFeedback({ name: 'Daily Fresh', subscription: true }, 2.9)
    expect(model.serviceNotificationActionFeedback.value).toMatchObject({
      type: 'read',
      title: 'Daily Fresh',
      heading: 'Chat unread cleared',
    })
    expect(model.serviceNotificationActionFeedback.value.detail).toContain('2 Chat unread updates')

    model.clearServiceNotificationActionFeedback()
    model.recordServiceThreadReadFeedback({ name: 'Daily Fresh', subscription: true }, 0)
    expect(model.serviceNotificationActionFeedback.value).toBeNull()

    model.recordServiceThreadReadFeedback({ name: 'Normal chat', subscription: false }, 2)
    expect(model.serviceNotificationActionFeedback.value).toBeNull()
  })

  test('normalizes persisted feedback shape without accepting unsafe routes', () => {
    expect(
      normalizeServiceRouteFeedback(
        {
          chatId: '12',
          openedAt: 1_800_000_000_000,
          title: ` ${'x'.repeat(140)} `,
          destination: ' Source ',
          actionLabel: ' Open ',
          route: 'https://example.test',
        },
        { now: 1_800_000_000_001 },
      ),
    ).toMatchObject({
      chatId: 12,
      title: 'x'.repeat(120),
      destination: 'Source',
      actionLabel: 'Open',
      route: '',
    })
  })
})
