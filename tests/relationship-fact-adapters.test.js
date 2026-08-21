import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  buildFoodDeliverySharedMealRelationshipMemoryKey,
  buildFoodDeliverySharedMealRelationshipSuggestion,
  buildCalendarConfirmedEventRelationshipSuggestion,
  buildChatDisclosureRelationshipSuggestion,
  buildChatSocialEventRelationshipSuggestion,
  buildRelationshipMemoryKey,
  buildMapSharedRouteRelationshipSuggestion,
  buildPhoneCallRelationshipSuggestion,
  buildShoppingGiftRelationshipMemoryKey,
  buildShoppingGiftRelationshipSuggestion,
  buildWalletSharedTransferRelationshipSuggestion,
  recordFoodDeliverySharedMealRelationshipFact,
  recordCalendarConfirmedEventRelationshipFact,
  recordChatDisclosureRelationshipFact,
  recordChatSocialEventRelationshipFact,
  recordMapSharedRouteRelationshipFact,
  recordPhoneCallRelationshipFact,
  recordShoppingGiftRelationshipFact,
  recordWalletOrderSupportRelationshipFact,
  recordWalletSharedTransferRelationshipFact,
} from '../src/lib/relationship-fact-adapters'
import { SHOPPING_SOURCE_KEYS } from '../src/lib/planned-module-registry'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'

describe('relationship fact adapters', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('records shopping gift facts once per order source', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const order = {
      id: 'shopping_order_1',
      totalCents: 6800,
      currency: 'CNY',
      giftRecipient: {
        name: 'Eva',
        contactId: 1,
        profileId: 1,
        kind: 'role',
      },
      items: [{ title: 'Moon Lamp', quantity: 1, unitPriceCents: 6800, currency: 'CNY' }],
    }

    const suggestion = buildShoppingGiftRelationshipSuggestion({ relationshipRuntimeStore, order })

    expect(suggestion).toMatchObject({
      available: true,
      imported: false,
      targetName: 'Eva',
    })

    const firstEvent = recordShoppingGiftRelationshipFact({
      relationshipRuntimeStore,
      order,
      transaction: { amount: '68.00', currency: 'CNY' },
    })
    const secondEvent = recordShoppingGiftRelationshipFact({
      relationshipRuntimeStore,
      order,
      transaction: { amount: '68.00', currency: 'CNY' },
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 1, contactId: 1, name: 'Eva' })

    expect(secondEvent.id).toBe(firstEvent.id)
    expect(relationshipRuntimeStore.events).toHaveLength(1)
    expect(summary.metrics.affinity).toBe(58)
    expect(summary.metrics.intimacy).toBe(24)
    expect(summary.latestEventSummary).toContain('Gift purchased')
    expect(firstEvent.memoryKey).toBe(buildRelationshipMemoryKey('shopping_gift', order.id))
  })

  test('attaches saved relationship classification gate metadata to low-risk facts', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const chatStore = {
      getRoleProfileById: () => ({
        id: 1,
        primaryRelationshipCategoryId: 'friendship_bond',
        relationshipModifierIds: ['long_term_companion'],
        classificationConfidence: 'high',
        classificationSource: 'user_edited',
        relationshipLabelText: 'best friend',
        relationshipLabelNote: 'prose should not be copied into gate metadata',
      }),
    }
    const event = recordShoppingGiftRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      order: {
        id: 'shopping_order_gate_1',
        giftRecipient: { name: 'Eva', profileId: 1, contactId: 1, kind: 'role' },
        items: [{ title: 'Tea' }],
      },
      transaction: { amount: '12.00', currency: 'CNY' },
    })

    expect(event.relationshipGate).toMatchObject({
      decision: 'allow',
      mode: 'soft_reference',
      primaryRelationshipCategoryId: 'friendship_bond',
      relationshipModifierIds: ['long_term_companion'],
      classificationConfidence: 'high',
      classificationSource: 'user_edited',
    })
    expect(event.relationshipGate.relationshipLabelText).toBeUndefined()
    expect(event.relationshipGate.relationshipLabelNote).toBeUndefined()
  })

  test('records optional food delivery shared-meal facts for the selected target', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const order = {
      id: 'food_order_1',
      restaurantName: 'Moon Bistro',
      totalCents: 4200,
      currency: 'CNY',
      items: [{ title: 'Shared Bento', quantity: 1, unitPriceCents: 4200, currency: 'CNY' }],
    }
    const target = {
      id: 2,
      profileId: 2,
      kind: 'role',
      name: 'Jackie',
    }

    const suggestion = buildFoodDeliverySharedMealRelationshipSuggestion({
      relationshipRuntimeStore,
      order,
      target,
    })
    const event = recordFoodDeliverySharedMealRelationshipFact({
      relationshipRuntimeStore,
      order,
      target,
      transaction: { amount: '42.00', currency: 'CNY', counterparty: 'Moon Bistro' },
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 2, contactId: 2, name: 'Jackie' })

    expect(suggestion).toMatchObject({
      available: true,
      imported: false,
      targetName: 'Jackie',
    })
    expect(event.summary).toContain('Shared meal')
    expect(summary.metrics.affinity).toBe(56)
    expect(summary.metrics.intimacy).toBe(25)
    expect(summary.growthTraits).toContain('shared-meal')
  })

  test('records phone call facts without duplicating the same call source', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const call = {
      id: 'phone_call_1',
      direction: 'incoming',
      status: 'completed',
      durationSec: 180,
    }
    const target = {
      id: 1,
      profileId: 1,
      kind: 'role',
      name: 'Eva',
    }

    const suggestion = buildPhoneCallRelationshipSuggestion({
      relationshipRuntimeStore,
      call,
      target,
    })
    const firstEvent = recordPhoneCallRelationshipFact({
      relationshipRuntimeStore,
      call,
      target,
    })
    const secondEvent = recordPhoneCallRelationshipFact({
      relationshipRuntimeStore,
      call,
      target,
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(target)

    expect(suggestion).toMatchObject({
      available: true,
      imported: false,
      targetName: 'Eva',
    })
    expect(secondEvent.id).toBe(firstEvent.id)
    expect(relationshipRuntimeStore.events).toHaveLength(1)
    expect(firstEvent.factType).toBe('completed_call')
    expect(summary.metrics.affinity).toBe(54)
    expect(summary.growthTraits).toContain('call-memory')
  })

  test('records shared map routes for the selected companion', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const trip = {
      id: 'trip_hist_1',
      fromLabel: 'Dorm',
      toLabel: 'Library',
      distanceKm: 3.2,
    }
    const target = {
      id: 2,
      profileId: 2,
      kind: 'role',
      name: 'Jackie',
    }

    const suggestion = buildMapSharedRouteRelationshipSuggestion({
      relationshipRuntimeStore,
      trip,
      target,
    })
    const event = recordMapSharedRouteRelationshipFact({
      relationshipRuntimeStore,
      trip,
      target,
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(target)

    expect(suggestion).toMatchObject({
      available: true,
      sourceId: 'trip_hist_1:shared_route:role_2',
    })
    expect(event.summary).toContain('Dorm to Library')
    expect(event.factType).toBe('shared_route')
    expect(summary.metrics.affinity).toBe(55)
    expect(summary.growthTraits).toContain('shared-route')
  })

  test('records wallet transfers and shared expenses for the selected target', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const transaction = {
      id: 'wallet_tx_1',
      type: 'expense',
      title: 'Shared taxi',
      amountCents: 8800,
      currency: 'CNY',
    }
    const target = {
      id: 1,
      profileId: 1,
      kind: 'role',
      name: 'Eva',
    }

    const suggestion = buildWalletSharedTransferRelationshipSuggestion({
      relationshipRuntimeStore,
      transaction,
      target,
    })
    const event = recordWalletSharedTransferRelationshipFact({
      relationshipRuntimeStore,
      transaction,
      target,
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(target)

    expect(suggestion).toMatchObject({
      available: true,
      sourceId: 'wallet_tx_1:shared_transfer:role_1',
    })
    expect(event.factType).toBe('shared_expense')
    expect(event.summary).toContain('Shared taxi')
    expect(summary.metrics.trust).toBe(54)
    expect(summary.growthTraits).toContain('wallet')
  })

  test('records confirmed calendar event facts for the selected target', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const event = {
      id: 'calendar_event_date_1',
      status: 'confirmed',
      titleEn: 'Coffee date',
      startsAt: Date.now() + 24 * 60 * 60 * 1000,
    }
    const target = {
      id: 3,
      profileId: 3,
      kind: 'role',
      name: 'Mika',
    }

    const suggestion = buildCalendarConfirmedEventRelationshipSuggestion({
      relationshipRuntimeStore,
      event,
      target,
    })
    const firstEvent = recordCalendarConfirmedEventRelationshipFact({
      relationshipRuntimeStore,
      event,
      target,
    })
    const secondEvent = recordCalendarConfirmedEventRelationshipFact({
      relationshipRuntimeStore,
      event,
      target,
    })
    const cancelledSuggestion = buildCalendarConfirmedEventRelationshipSuggestion({
      relationshipRuntimeStore,
      event: { ...event, id: 'calendar_event_cancelled', status: 'cancelled' },
      target,
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(target)

    expect(suggestion).toMatchObject({
      available: true,
      sourceId: 'calendar_event_date_1:calendar_event:role_3',
      targetName: 'Mika',
    })
    expect(secondEvent.id).toBe(firstEvent.id)
    expect(cancelledSuggestion.available).toBe(false)
    expect(relationshipRuntimeStore.events).toHaveLength(1)
    expect(firstEvent.factType).toBe('scheduled_calendar_event')
    expect(firstEvent.summary).toContain('Coffee date')
    expect(summary.metrics.affinity).toBe(54)
    expect(summary.growthTraits).toContain('calendar-plan')
    expect(firstEvent.memoryKey).toBe(buildRelationshipMemoryKey('calendar_event', event.id))
  })

  test('records an applied role greeting as supporting-only Chat continuity', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const chatStore = {
      getContactById: () => ({
        id: 4,
        profileId: 4,
        kind: 'role',
        name: 'Mina',
      }),
    }
    const proposal = {
      id: 'chat_social_proposal_greeting_1',
      eventType: 'role_greeting_request',
      status: 'applied',
      targetContactId: 4,
      targetProfileId: 4,
    }

    const suggestion = buildChatSocialEventRelationshipSuggestion({
      relationshipRuntimeStore,
      chatStore,
      proposal,
    })
    const firstEvent = recordChatSocialEventRelationshipFact({
      relationshipRuntimeStore,
      chatStore,
      proposal,
    })
    const secondEvent = recordChatSocialEventRelationshipFact({
      relationshipRuntimeStore,
      chatStore,
      proposal,
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 4, contactId: 4 })

    expect(suggestion).toMatchObject({
      available: true,
      imported: false,
      sourceModule: 'relationship_chat_social_event',
      targetName: 'Mina',
    })
    expect(secondEvent.id).toBe(firstEvent.id)
    expect(firstEvent).toMatchObject({
      factType: 'role_initiated_chat_greeting',
      memoryRole: 'supporting',
      effectApplied: false,
      memoryKey: buildRelationshipMemoryKey('chat_social', 'role_greeting'),
    })
    expect(summary.metrics).toMatchObject({
      affinity: 50,
      trust: 50,
      intimacy: 20,
    })
    expect(summary.totalMemoryCount).toBe(1)
  })

  test('records an explicit user disclosure for one role without changing relationship metrics', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const contact = {
      id: 9,
      profileId: 9,
      kind: 'role',
      name: 'Sora',
    }
    const message = {
      id: 'msg_disclosure_1',
      role: 'user',
      content: '我不喜欢医院的消毒水味。',
      createdAt: 12345,
    }

    const suggestion = buildChatDisclosureRelationshipSuggestion({
      relationshipRuntimeStore,
      contact,
      conversationId: 'conv_9',
      message,
    })
    const firstEvent = recordChatDisclosureRelationshipFact({
      relationshipRuntimeStore,
      contact,
      conversationId: 'conv_9',
      message,
    })
    const secondEvent = recordChatDisclosureRelationshipFact({
      relationshipRuntimeStore,
      contact,
      conversationId: 'conv_9',
      message,
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 9, contactId: 9 })

    expect(suggestion).toMatchObject({
      available: true,
      imported: false,
      sourceModule: 'relationship_chat_user_disclosure',
      sourceId: 'conv_9:profile_9:message_msg_disclosure_1',
      targetName: 'Sora',
      proposal: {
        subjectKey: 'hospital',
        memoryKey: 'chat_disclosure__hospital',
      },
    })
    expect(secondEvent.id).toBe(firstEvent.id)
    expect(firstEvent).toMatchObject({
      factType: 'user_disclosure',
      memoryRole: 'supporting',
      effectApplied: false,
      memoryKey: 'chat_disclosure__hospital',
      summary: '我不喜欢医院的消毒水味。',
      createdAt: 12345,
    })
    expect(summary.metrics).toMatchObject({
      affinity: 50,
      trust: 50,
      intimacy: 20,
    })
    expect(summary.totalMemoryCount).toBe(1)
  })

  test('keeps unrelated disclosure subjects separate and updates one subject with source history', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const contact = {
      id: 9,
      profileId: 9,
      kind: 'role',
      name: 'Sora',
    }
    const hospitalFirst = {
      id: 'msg_hospital_1',
      role: 'user',
      content: '我不喜欢医院的消毒水味。',
      createdAt: 100,
    }
    const birthday = {
      id: 'msg_birthday_1',
      role: 'user',
      content: '我的生日是八月二十日。',
      createdAt: 200,
    }
    const hospitalUpdate = {
      id: 'msg_hospital_2',
      role: 'user',
      content: '去诊所时我会紧张，希望有人陪我。',
      createdAt: 300,
    }

    const firstEvent = recordChatDisclosureRelationshipFact({
      relationshipRuntimeStore,
      contact,
      conversationId: 'conv_9',
      message: hospitalFirst,
    })
    const birthdayEvent = recordChatDisclosureRelationshipFact({
      relationshipRuntimeStore,
      contact,
      conversationId: 'conv_9',
      message: birthday,
    })
    const updatedEvent = recordChatDisclosureRelationshipFact({
      relationshipRuntimeStore,
      contact,
      conversationId: 'conv_9',
      message: hospitalUpdate,
    })

    expect(firstEvent.memoryKey).toBe('chat_disclosure__hospital')
    expect(birthdayEvent.memoryKey).toBe('chat_disclosure__birthday')
    expect(updatedEvent.memoryKey).toBe(firstEvent.memoryKey)

    const summary = relationshipRuntimeStore.summarizeEntityForTarget(
      { profileId: 9, contactId: 9 },
      { memoryLimit: 10 },
    )
    expect(summary.totalMemoryCount).toBe(2)
    expect(summary.memorySummaries.map((memory) => memory.memoryKey).sort()).toEqual([
      'chat_disclosure__birthday',
      'chat_disclosure__hospital',
    ])

    const hospitalMemory = relationshipRuntimeStore.getMemoryGroupDetail(
      { profileId: 9, contactId: 9 },
      'chat_disclosure__hospital',
    )
    expect(hospitalMemory).toMatchObject({
      latestSummary: '去诊所时我会紧张，希望有人陪我。',
      supportingCount: 2,
    })
    expect(new Set(hospitalMemory.sourceIds)).toEqual(
      new Set([
        'conv_9:profile_9:message_msg_hospital_1',
        'conv_9:profile_9:message_msg_hospital_2',
      ]),
    )
  })

  test('keeps unknown subjects separate and leaves the legacy generic group readable', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const contact = {
      id: 9,
      profileId: 9,
      kind: 'role',
      name: 'Sora',
    }
    const firstUnknown = buildChatDisclosureRelationshipSuggestion({
      relationshipRuntimeStore,
      contact,
      conversationId: 'conv_9',
      message: { id: 'msg_unknown_1', role: 'user', content: '我把旧相机放在书架顶层。' },
    })
    const secondUnknown = buildChatDisclosureRelationshipSuggestion({
      relationshipRuntimeStore,
      contact,
      conversationId: 'conv_9',
      message: { id: 'msg_unknown_2', role: 'user', content: '蓝色钥匙收在玄关抽屉。' },
    })

    expect(firstUnknown.proposal.memoryKey).toMatch(/^chat_disclosure__detail_[a-f0-9]{16}$/)
    expect(secondUnknown.proposal.memoryKey).toMatch(/^chat_disclosure__detail_[a-f0-9]{16}$/)
    expect(secondUnknown.proposal.memoryKey).not.toBe(firstUnknown.proposal.memoryKey)

    relationshipRuntimeStore.recordRelationshipFact({
      target: contact,
      sourceModule: 'relationship_chat_user_disclosure',
      sourceId: 'conv_9:profile_9:message_legacy',
      memoryKey: 'chat_disclosure__user_shared',
      factType: 'user_disclosure',
      summary: '旧版通用记忆仍然可查看。',
      metricDeltas: {},
      forceSupportingMemory: true,
      createdAt: 50,
    })

    expect(
      relationshipRuntimeStore.getMemoryGroupDetail(
        { profileId: 9, contactId: 9 },
        'chat_disclosure__user_shared',
      ),
    ).toMatchObject({
      latestSummary: '旧版通用记忆仍然可查看。',
      supportingCount: 1,
    })
  })

  test('rejects disclosures that are not explicit user text for a role contact', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()

    expect(
      buildChatDisclosureRelationshipSuggestion({
        relationshipRuntimeStore,
        contact: { id: 10, profileId: 10, kind: 'group', name: 'Group' },
        conversationId: 'group_10',
        message: { id: 'msg_1', role: 'user', content: 'group detail' },
      }).available,
    ).toBe(false)
    expect(
      buildChatDisclosureRelationshipSuggestion({
        relationshipRuntimeStore,
        contact: { id: 11, profileId: 11, kind: 'role', name: 'Role' },
        conversationId: 'conv_11',
        message: { id: 'msg_2', role: 'assistant', content: 'assistant detail' },
      }).available,
    ).toBe(false)
    expect(
      buildChatDisclosureRelationshipSuggestion({
        relationshipRuntimeStore,
        contact: { id: 12, profileId: 12, kind: 'role', name: 'Role' },
        conversationId: 'conv_12',
        message: { id: 'msg_3', role: 'user', recalledAt: 1, content: 'recalled detail' },
      }).available,
    ).toBe(false)
  })

  test('reuses the same memory key when a phone callback becomes a calendar event', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const target = {
      id: 8,
      profileId: 8,
      kind: 'role',
      name: 'Rin',
    }

    const phoneEvent = recordPhoneCallRelationshipFact({
      relationshipRuntimeStore,
      call: {
        id: 'phone_call_rin_1',
        direction: 'incoming',
        status: 'missed',
      },
      target,
    })

    const calendarEvent = recordCalendarConfirmedEventRelationshipFact({
      relationshipRuntimeStore,
      event: {
        id: 'calendar_event_rin_callback',
        source: 'phone_missed_call',
        sourceReminderId: 'phone_missed_call_cue_phone_call_rin_1',
        status: 'confirmed',
        titleEn: 'Call back Rin',
      },
      target,
    })

    const memories = relationshipRuntimeStore.listMemoryAggregatesForTarget(target)

    expect(phoneEvent.memoryKey).toBe(buildRelationshipMemoryKey('phone_call', 'phone_call_rin_1'))
    expect(calendarEvent.memoryKey).toBe(phoneEvent.memoryKey)
    expect(memories).toHaveLength(1)
    expect(memories[0]).toMatchObject({
      supportingCount: 2,
      primarySourceModule: 'relationship_phone_call',
    })
  })

  test('reuses the same memory key when a shopping gift follow-up becomes a calendar event', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const order = {
      id: 'shopping_order_rin_1',
      totalCents: 8800,
      currency: 'CNY',
      giftRecipient: {
        name: 'Rin',
        contactId: 8,
        profileId: 8,
        kind: 'role',
      },
      items: [{ title: 'Dorayaki Box', quantity: 1, unitPriceCents: 8800, currency: 'CNY' }],
    }
    const target = {
      id: 8,
      profileId: 8,
      kind: 'role',
      name: 'Rin',
    }

    const shoppingEvent = recordShoppingGiftRelationshipFact({
      relationshipRuntimeStore,
      order,
      transaction: { amount: '88.00', currency: 'CNY' },
    })

    const calendarEvent = recordCalendarConfirmedEventRelationshipFact({
      relationshipRuntimeStore,
      event: {
        id: 'calendar_event_rin_gift_followup',
        source: SHOPPING_SOURCE_KEYS.CALENDAR_DELIVERY,
        sourceReminderId: 'shopping_delivery_cue_shopping_order_rin_1',
        status: 'confirmed',
        titleEn: 'Gift delivery follow-up',
      },
      target,
    })

    const memories = relationshipRuntimeStore.listMemoryAggregatesForTarget(target)
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(target)

    expect(shoppingEvent.memoryKey).toBe(buildRelationshipMemoryKey('shopping_gift', order.id))
    expect(calendarEvent.memoryKey).toBe(shoppingEvent.memoryKey)
    expect(memories).toHaveLength(1)
    expect(memories[0]).toMatchObject({
      supportingCount: 2,
      primarySourceModule: 'relationship_shopping_gift',
    })
    expect(memories[0].sourceModules).toContain('relationship_calendar_confirmed_event')
    expect(summary.metrics).toMatchObject({
      affinity: 58,
      trust: 53,
      intimacy: 24,
    })
    expect(calendarEvent.effectApplied).toBe(false)
    expect(calendarEvent.memoryRole).toBe('supporting')
  })

  test('keeps shopping wallet support inside the gift memory without stacking metrics', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const order = {
      id: 'shopping_order_rin_wallet_support',
      totalCents: 8800,
      currency: 'CNY',
      giftRecipient: {
        name: 'Rin',
        contactId: 8,
        profileId: 8,
        kind: 'role',
      },
      items: [{ title: 'Dorayaki Box', quantity: 1, unitPriceCents: 8800, currency: 'CNY' }],
    }
    const target = {
      id: 8,
      profileId: 8,
      kind: 'role',
      name: 'Rin',
    }

    const shoppingEvent = recordShoppingGiftRelationshipFact({
      relationshipRuntimeStore,
      order,
      transaction: { amount: '88.00', currency: 'CNY' },
    })

    const walletEvent = recordWalletOrderSupportRelationshipFact({
      relationshipRuntimeStore,
      target,
      transaction: {
        id: 'wallet_tx_shopping_support',
        amountCents: 8800,
        currency: 'CNY',
      },
      memoryKey: buildShoppingGiftRelationshipMemoryKey(order),
    })

    const memories = relationshipRuntimeStore.listMemoryAggregatesForTarget(target)
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(target)

    expect(shoppingEvent.memoryKey).toBe(buildRelationshipMemoryKey('shopping_gift', order.id))
    expect(walletEvent.memoryKey).toBe(shoppingEvent.memoryKey)
    expect(walletEvent.effectApplied).toBe(false)
    expect(walletEvent.memoryRole).toBe('supporting')
    expect(memories).toHaveLength(1)
    expect(memories[0]).toMatchObject({
      supportingCount: 2,
      primarySourceModule: 'relationship_shopping_gift',
    })
    expect(memories[0].sourceModules).toContain('relationship_wallet_order_support')
    expect(summary.metrics).toMatchObject({
      affinity: 58,
      trust: 53,
      intimacy: 24,
    })
  })

  test('keeps food delivery wallet support inside the shared-meal memory without stacking metrics', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const order = {
      id: 'food_order_rin_wallet_support',
      restaurantName: 'Moon Bistro',
      totalCents: 4200,
      currency: 'CNY',
      items: [{ title: 'Shared Bento', quantity: 1, unitPriceCents: 4200, currency: 'CNY' }],
    }
    const target = {
      id: 8,
      profileId: 8,
      kind: 'role',
      name: 'Rin',
    }

    const foodEvent = recordFoodDeliverySharedMealRelationshipFact({
      relationshipRuntimeStore,
      order,
      target,
      transaction: { amount: '42.00', currency: 'CNY', counterparty: 'Moon Bistro' },
    })

    const walletEvent = recordWalletOrderSupportRelationshipFact({
      relationshipRuntimeStore,
      target,
      transaction: {
        id: 'wallet_tx_food_support',
        amountCents: 4200,
        currency: 'CNY',
      },
      memoryKey: buildFoodDeliverySharedMealRelationshipMemoryKey(order),
    })

    const memories = relationshipRuntimeStore.listMemoryAggregatesForTarget(target)
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(target)

    expect(foodEvent.memoryKey).toBe(buildRelationshipMemoryKey('food_shared_meal', order.id))
    expect(walletEvent.memoryKey).toBe(foodEvent.memoryKey)
    expect(walletEvent.effectApplied).toBe(false)
    expect(walletEvent.memoryRole).toBe('supporting')
    expect(memories).toHaveLength(1)
    expect(memories[0]).toMatchObject({
      supportingCount: 2,
      primarySourceModule: 'relationship_food_delivery_shared_meal',
    })
    expect(memories[0].sourceModules).toContain('relationship_wallet_order_support')
    expect(summary.metrics).toMatchObject({
      affinity: 56,
      trust: 52,
      intimacy: 25,
    })
  })

  test('reuses the same memory key when a map route follow-up becomes a calendar event', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const target = {
      id: 8,
      profileId: 8,
      kind: 'role',
      name: 'Rin',
    }

    const mapEvent = recordMapSharedRouteRelationshipFact({
      relationshipRuntimeStore,
      trip: {
        id: 'trip_hist_rin_city_core',
        fromLabel: 'Dorm',
        toLabel: 'City core',
        distanceKm: 4.5,
      },
      target,
    })

    const calendarEvent = recordCalendarConfirmedEventRelationshipFact({
      relationshipRuntimeStore,
      event: {
        id: 'calendar_event_rin_city_core_followup',
        source: 'map_calendar_reminder',
        sourceReminderId: 'map_calendar_city_core',
        sourceAreaId: 'city_core',
        sourceTripId: 'trip_hist_rin_city_core',
        status: 'confirmed',
        titleEn: 'City core follow-up',
      },
      target,
    })

    const memories = relationshipRuntimeStore.listMemoryAggregatesForTarget(target)
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(target)

    expect(mapEvent.memoryKey).toBe(buildRelationshipMemoryKey('shared_route', 'trip_hist_rin_city_core'))
    expect(calendarEvent.memoryKey).toBe(mapEvent.memoryKey)
    expect(memories).toHaveLength(1)
    expect(memories[0]).toMatchObject({
      supportingCount: 2,
      primarySourceModule: 'relationship_map_shared_route',
    })
    expect(memories[0].sourceModules).toContain('relationship_calendar_confirmed_event')
    expect(summary.metrics).toMatchObject({
      affinity: 55,
      trust: 52,
      intimacy: 23,
    })
    expect(calendarEvent.effectApplied).toBe(false)
    expect(calendarEvent.memoryRole).toBe('supporting')
  })
})
