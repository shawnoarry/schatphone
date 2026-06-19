import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import { useChatServiceThreadDisplayModel } from '../src/composables/useChatServiceThreadDisplayModel'

const t = (zh, en) => en || zh

const createModel = ({
  chat = {
    id: 10,
    kind: 'service',
    name: 'Schat Mall',
    serviceTemplate: 'Order updates',
    shoppingServiceKey: 'schat_mall',
    logisticsServiceKey: 'standard_courier',
    foodDeliveryServiceKey: 'food_delivery_dispatch',
  },
  conversation = { lastMessage: 'Your order shipped.' },
  messages = [],
  isService = true,
  muted = false,
  folded = false,
  canCommunicate = true,
  routeFeedback = null,
  actionFeedback = null,
  sourceNotificationPlan = {
    status: 'ready',
    rows: [
      { id: 'shopping_orders' },
      { id: 'shopping_logistics' },
      { id: 'food_delivery_orders' },
    ],
  },
} = {}) =>
  useChatServiceThreadDisplayModel({
    chatStore: {
      getServiceAccountLinkContract: () => ({ sourceNotificationPlan }),
    },
    activeChat: ref(chat),
    activeConversation: ref(conversation),
    activeMessages: ref(messages),
    isActiveServiceChat: ref(isService),
    activeServiceIsMuted: ref(muted),
    activeServiceIsFolded: ref(folded),
    canActiveChatCommunicate: ref(canCommunicate),
    serviceRouteFeedback: ref(routeFeedback),
    serviceNotificationActionFeedback: ref(actionFeedback),
    t,
  })

describe('Chat service thread display model interface', () => {
  test('builds service thread status, source plan, inbox, and empty-state display values', () => {
    const model = createModel({
      muted: true,
      folded: true,
    })

    expect(model.activeServiceStatusTags.value.map((tag) => tag.key)).toEqual(['muted', 'folded'])
    expect(model.activeServiceHeaderStatus.value).toBe('Muted · Folded')
    expect(model.activeServiceTemplateText.value).toBe('Order updates')
    expect(model.activeServiceChannelPreview.value).toBe('Your order shipped.')
    expect(model.showActiveServiceEmptyState.value).toBe(true)
    expect(model.activeServiceEmptyStateTitle.value).toBe('No updates yet')
    expect(model.activeServiceEmptyStateDetail.value).toContain('Schat Mall updates will appear here.')
    expect(model.activeServiceSourceChips.value.map((chip) => chip.key)).toEqual([
      'shopping',
      'logistics',
      'food-delivery',
    ])
    expect(model.activeServiceSourceNotificationPlan.value).toMatchObject({ status: 'ready' })
    expect(model.activeServiceSourceScheduleRows.value).toHaveLength(3)
    expect(model.serviceSourceScheduleRowScheduleLabel({ id: 'shopping_logistics' })).toBe(
      'Triggered by tracking milestones',
    )
    expect(model.activeServiceSourceScheduleSummary.value).toBe(
      'Shopping orders / Logistics tracking / Food Delivery orders can push event-driven updates into this Chat service thread.',
    )
    expect(model.activeServiceInboxPlacement.value).toContain('Folded and muted')
    expect(model.activeServiceThreadPromises.value.map((item) => item.key)).toEqual([
      'reply',
      'source',
      'history',
    ])
  })

  test('prioritizes source-open feedback in the interaction dock', () => {
    const model = createModel({
      routeFeedback: {
        chatId: 10,
        title: 'Package #A',
        destination: 'Shopping',
        route: '/shopping?order=A',
      },
      actionFeedback: {
        type: 'read',
        heading: 'Chat unread cleared',
        title: 'Schat Mall',
        detail: 'Cards remain.',
      },
    })

    expect(model.activeServiceRouteFeedback.value).toMatchObject({ title: 'Package #A' })
    expect(model.activeServiceInteractionDock.value).toMatchObject({
      type: 'source',
      title: 'Source opened',
      context: 'Package #A',
      primaryLabel: 'Open again',
    })
    expect(model.activeServiceInteractionDock.value.detail).toContain('Opened Shopping')
    expect(model.activeServiceInteractionDockClasses.value).toContain('bg-emerald-50')
  })

  test('falls back to action feedback dock and hides service display for non-service threads', () => {
    const replyModel = createModel({
      routeFeedback: {
        chatId: 99,
        title: 'Other thread',
        destination: 'Shopping',
        route: '/shopping',
      },
      actionFeedback: {
        type: 'read',
        heading: 'Chat unread cleared',
        title: 'Schat Mall',
        detail: 'Cards remain.',
      },
    })

    expect(replyModel.activeServiceRouteFeedback.value).toBeNull()
    expect(replyModel.activeServiceInteractionDock.value).toMatchObject({
      type: 'read',
      icon: 'fas fa-check-double',
      title: 'Chat unread cleared',
      context: 'Schat Mall',
      detail: 'Cards remain.',
    })
    expect(replyModel.activeServiceInteractionDockClasses.value).toContain('border-slate-200')

    const normalThreadModel = createModel({
      chat: { id: 11, kind: 'role', name: 'Ada' },
      isService: false,
      sourceNotificationPlan: null,
    })

    expect(normalThreadModel.activeServiceStatusTags.value).toEqual([])
    expect(normalThreadModel.activeServiceHeaderStatus.value).toBe('')
    expect(normalThreadModel.activeServiceSourceChips.value).toEqual([])
    expect(normalThreadModel.activeServiceSourceScheduleRows.value).toEqual([])
    expect(normalThreadModel.activeServiceInteractionDock.value).toBeNull()
  })
})
