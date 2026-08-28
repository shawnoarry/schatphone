import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { buildGiftSharedExperienceV1 } from '../src/lib/shared-experience-contract'
import {
  buildShoppingGiftRelationshipSuggestion,
  recordPhoneCallRelationshipFact,
  recordShoppingGiftDeliveryRelationshipFact,
  recordShoppingGiftRelationshipFact,
  recordWalletOrderSupportRelationshipFact,
} from '../src/lib/relationship-fact-adapters'
import { SHOPPING_SOURCE_KEYS } from '../src/lib/planned-module-registry'
import { useCalendarStore } from '../src/stores/calendar'
import { useChatStore } from '../src/stores/chat'
import { PHONE_CALL_DIRECTION, usePhoneStore } from '../src/stores/phone'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useRemindersStore } from '../src/stores/reminders'
import { useShoppingStore } from '../src/stores/shopping'
import { useWalletStore } from '../src/stores/wallet'

describe('gift shared experience runtime', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T08:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('keeps Shopping, Chat, Calendar, Wallet, Phone, and relationship truth in one experience', () => {
    const calendarStore = useCalendarStore()
    const chatStore = useChatStore()
    const phoneStore = usePhoneStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const shoppingStore = useShoppingStore()
    const walletStore = useWalletStore()
    calendarStore.resetForTesting()
    phoneStore.resetForTesting()
    relationshipRuntimeStore.resetForTesting()
    shoppingStore.resetForTesting()
    walletStore.resetForTesting()

    const serviceContact = chatStore.addContact({
      kind: 'service',
      name: 'Schat Mall',
      shoppingServiceKey: 'schat_mall',
    })
    const product = shoppingStore.upsertProduct({
      id: 'product_xia_moon_lamp',
      title: 'Moon Lamp',
      category: 'gifts',
      serviceKey: 'schat_mall',
      price: '88.00',
      giftable: true,
    })
    shoppingStore.addToCart(product.id)
    const order = shoppingStore.checkoutCart({
      serviceKey: 'schat_mall',
      giftRecipient: {
        name: 'Xia',
        contactId: 8,
        profileId: 8,
        kind: 'role',
        sourceModule: 'chat',
        sourceId: '8',
      },
    })
    const cue = calendarStore.findShoppingDeliveryCueByOrderId(order.id)
    const calendarEvent = calendarStore.confirmShoppingDeliveryCue(cue.id)
    shoppingStore.markOrderCompleted(order.id)

    const transaction = walletStore.addTransaction({
      type: 'expense',
      title: 'Shopping order',
      amount: '88.00',
      currency: 'CNY',
      sourceModule: SHOPPING_SOURCE_KEYS.WALLET_EXPENSE,
      sourceId: order.id,
      sharedExperienceId: order.sharedExperienceId,
    })
    const call = phoneStore.addRoleCallLog({
      contactName: 'Xia',
      direction: PHONE_CALL_DIRECTION.INCOMING,
      durationMinutes: 3,
      summary: 'I love it.',
      relationshipBinding: {
        profileId: 8,
        contactId: 8,
        kind: 'role',
        name: 'Xia',
        sourceModule: 'chat',
        sourceId: '8',
      },
      sharedExperienceId: order.sharedExperienceId,
    })
    const target = { id: 8, profileId: 8, contactId: 8, kind: 'role', name: 'Xia' }

    recordShoppingGiftRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      order,
      transaction,
    })
    recordShoppingGiftDeliveryRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      order,
    })
    const suggestion = buildShoppingGiftRelationshipSuggestion({
      relationshipRuntimeStore,
      order,
    })
    recordWalletOrderSupportRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      target,
      transaction,
      memoryKey: suggestion.memoryKey,
    })
    recordPhoneCallRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      call,
      target,
      giftOrder: order,
    })

    const chatMessages = chatStore.getMessagesByContactId(serviceContact.id)
    const notification = chatMessages
      .flatMap((message) => message.blocks || [])
      .find((block) => block.type === 'service_notification' && block.sourceId === order.id)
    const experience = buildGiftSharedExperienceV1({
      order,
      walletTransactions: walletStore.transactions,
      reminderCues: calendarStore.shoppingDeliveryCues,
      calendarEvents: calendarStore.events,
      phoneCalls: phoneStore.calls,
      chatMessages,
    })

    expect(order.sharedExperienceId).toBe(`gift:${order.id}`)
    expect(cue.sharedExperienceId).toBe(order.sharedExperienceId)
    expect(calendarEvent.sharedExperienceId).toBe(order.sharedExperienceId)
    expect(transaction.sharedExperienceId).toBe(order.sharedExperienceId)
    expect(call.sharedExperienceId).toBe(order.sharedExperienceId)
    expect(notification.sharedExperienceId).toBe(order.sharedExperienceId)
    expect(experience.progress.map((item) => item.kind)).toEqual([
      'gift_reserved',
      'gift_delivered',
      'recipient_feedback_received',
    ])
    expect(new Set(experience.ownerRecordRefs.map((ref) => ref.ownerModule))).toEqual(
      new Set(['shopping', 'wallet', 'reminders', 'chat', 'phone']),
    )

    const relationshipSummary = relationshipRuntimeStore.summarizeEntityForTarget(target, {
      memoryLimit: 10,
    })
    expect(relationshipSummary.memorySummaries).toHaveLength(1)
    expect(relationshipSummary.memorySummaries[0]).toMatchObject({
      memoryKey: experience.roleMemory.memoryKey,
      supportingCount: 4,
    })
    expect(relationshipSummary.memorySummaries[0].displaySummary).toContain('I love it.')
    expect(relationshipSummary.metrics).toMatchObject({ affinity: 58, trust: 53, intimacy: 24 })
    expect(
      relationshipRuntimeStore.events.every(
        (event) => event.sharedExperienceId === order.sharedExperienceId,
      ),
    ).toBe(true)

    recordShoppingGiftRelationshipFact({ relationshipRuntimeStore, order, transaction })
    recordShoppingGiftDeliveryRelationshipFact({ relationshipRuntimeStore, order })
    recordPhoneCallRelationshipFact({ relationshipRuntimeStore, call, target, giftOrder: order })
    expect(relationshipRuntimeStore.events).toHaveLength(4)
    expect(relationshipRuntimeStore.summarizeEntityForTarget(target).metrics).toMatchObject({
      affinity: 58,
      trust: 53,
      intimacy: 24,
    })

    const backup = {
      calendar: calendarStore.createBackupSnapshot(),
      chat: chatStore.createBackupSnapshot(),
      phone: phoneStore.createBackupSnapshot(),
      relationshipRuntime: relationshipRuntimeStore.createBackupSnapshot(),
      reminders: useRemindersStore().createBackupSnapshot(),
      shopping: shoppingStore.createBackupSnapshot(),
      wallet: walletStore.createBackupSnapshot(),
    }

    localStorage.clear()
    setActivePinia(createPinia())
    const restoredCalendar = useCalendarStore()
    const restoredChat = useChatStore()
    const restoredPhone = usePhoneStore()
    const restoredRelationship = useRelationshipRuntimeStore()
    const restoredReminders = useRemindersStore()
    const restoredShopping = useShoppingStore()
    const restoredWallet = useWalletStore()

    expect(restoredCalendar.restoreFromBackup(backup.calendar)).toBe(true)
    expect(restoredChat.restoreFromBackup(backup.chat)).toBe(true)
    expect(restoredPhone.restoreFromBackup(backup.phone)).toBe(true)
    expect(restoredRelationship.restoreFromBackup(backup.relationshipRuntime)).toBe(true)
    expect(restoredReminders.restoreFromBackup(backup.reminders)).toBe(true)
    expect(restoredShopping.restoreFromBackup(backup.shopping)).toBe(true)
    expect(restoredWallet.restoreFromBackup(backup.wallet)).toBe(true)
    expect(restoredCalendar.saveNow()).toMatchObject({ ok: true })
    expect(restoredChat.saveNow()).toMatchObject({ ok: true })
    expect(restoredPhone.saveNow()).toMatchObject({ ok: true })
    expect(restoredRelationship.saveNow()).toMatchObject({ ok: true })
    restoredReminders.saveNow()
    expect(restoredShopping.saveNow()).toMatchObject({ ok: true })
    expect(restoredWallet.saveNow()).toMatchObject({ ok: true })

    setActivePinia(createPinia())
    const reopenedCalendar = useCalendarStore()
    const reopenedChat = useChatStore()
    const reopenedPhone = usePhoneStore()
    const reopenedRelationship = useRelationshipRuntimeStore()
    const reopenedReminders = useRemindersStore()
    const reopenedShopping = useShoppingStore()
    const reopenedWallet = useWalletStore()
    const reopenedOrder = reopenedShopping.orders.find((item) => item.id === order.id)
    const reopenedExperience = buildGiftSharedExperienceV1({
      order: reopenedOrder,
      walletTransactions: reopenedWallet.transactions,
      reminderCues: reopenedReminders.shoppingDeliveryCues,
      calendarEvents: reopenedCalendar.events,
      phoneCalls: reopenedPhone.calls,
      chatMessages: reopenedChat.getMessagesByContactId(serviceContact.id),
    })

    expect(reopenedExperience.progress.map((item) => item.kind)).toEqual([
      'gift_reserved',
      'gift_delivered',
      'recipient_feedback_received',
    ])
    expect(new Set(reopenedExperience.ownerRecordRefs.map((ref) => ref.ownerModule))).toEqual(
      new Set(['shopping', 'wallet', 'reminders', 'chat', 'phone']),
    )
    expect(
      reopenedRelationship.summarizeEntityForTarget(target, { memoryLimit: 10 }).memorySummaries,
    ).toEqual([
      expect.objectContaining({
        memoryKey: reopenedExperience.roleMemory.memoryKey,
        supportingCount: 4,
      }),
    ])
    expect(
      reopenedRelationship.events.every(
        (event) => event.sharedExperienceId === reopenedOrder.sharedExperienceId,
      ),
    ).toBe(true)
  })
})
