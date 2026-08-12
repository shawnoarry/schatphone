import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  CHAT_SOCIAL_EVENT_STATUS,
  CHAT_SOCIAL_EVENT_TYPES,
} from '../src/lib/chat-social-event-review'
import { CHAT_CONTACT_SOCIAL_STATES, useChatStore } from '../src/stores/chat'
import {
  SIMULATION_EVENT_STATUS,
  SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS,
  SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
  SIMULATION_SURPRISE_MODE,
  SIMULATION_TRIGGER_SOURCE,
  useSimulationStore,
} from '../src/stores/simulation'
import { EVENT_NOTEBOOK_SOURCE_KIND } from '../src/lib/simulation/event-notebook'

describe('simulation store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('records event logs and user-level event controls', () => {
    const store = useSimulationStore()
    store.resetForTesting()

    expect(store.surpriseMode).toBe(SIMULATION_SURPRISE_MODE.LOW)
    expect(store.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)).toBe(SIMULATION_SURPRISE_MODE.HIGH)
    expect(store.setSurpriseMode('unknown')).toBe(SIMULATION_SURPRISE_MODE.LOW)
    expect(store.setModuleEventsEnabled('food_delivery', false)).toBe(true)
    expect(store.isModuleEventsEnabled('food_delivery')).toBe(false)
    expect(store.isModuleEventsEnabled('shopping')).toBe(true)

    const log = store.recordEventLog({
      eventId: 'food_delivery.rider_delay.v1',
      moduleKey: 'food_delivery',
      targetId: 'order-1',
      triggerSource: SIMULATION_TRIGGER_SOURCE.MANUAL,
      status: SIMULATION_EVENT_STATUS.TRIGGERED,
      reason: 'manual_test',
      variantId: 'food_delivery.rider_delay.sci_fi.corridor_queue.v1',
      variantPackId: 'variant_pack_sci_fi',
      worldContextId: 'world_context_sci_fi',
      activeWorldBookIds: ['kp_city', 'kp_city'],
    })

    expect(log).toMatchObject({
      eventId: 'food_delivery.rider_delay.v1',
      moduleKey: 'food_delivery',
      targetId: 'order-1',
      triggerSource: SIMULATION_TRIGGER_SOURCE.MANUAL,
      status: SIMULATION_EVENT_STATUS.TRIGGERED,
      reason: 'manual_test',
      variantId: 'food_delivery.rider_delay.sci_fi.corridor_queue.v1',
      variantPackId: 'variant_pack_sci_fi',
      worldContextId: 'world_context_sci_fi',
      activeWorldBookIds: ['kp_city'],
    })
    expect(store.eventLogCount).toBe(1)
    expect(store.recentEventLogs[0]?.id).toBe(log.id)
    expect(store.recordEventLog({ eventId: '' })).toBeNull()
  })

  test('tracks cooldowns and daily caps by event and target', () => {
    const store = useSimulationStore()
    store.resetForTesting()

    const log = store.recordEventTrigger({
      eventId: 'food_delivery.eta_update.v1',
      moduleKey: 'food_delivery',
      targetId: 'order-eta',
      triggerSource: SIMULATION_TRIGGER_SOURCE.RANDOM,
      status: SIMULATION_EVENT_STATUS.TRIGGERED,
      cooldownMs: 30 * 60 * 1000,
      dailyLimit: 2,
      at: Date.now(),
    })

    expect(log).toBeTruthy()
    expect(store.isCoolingDown('food_delivery.eta_update.v1', { targetId: 'order-eta', at: Date.now() + 1000 })).toBe(true)
    expect(
      store.getCooldownState('food_delivery.eta_update.v1', {
        targetId: 'order-eta',
        at: Date.now() + 31 * 60 * 1000,
      }),
    ).toMatchObject({
      active: false,
      remainingMs: 0,
    })
    expect(store.getDailyCounterState('food_delivery.eta_update.v1', { targetId: 'order-eta', limit: 2 })).toMatchObject({
      count: 1,
      limit: 2,
      remaining: 1,
      reached: false,
    })
    store.incrementDailyCounter({
      eventId: 'food_delivery.eta_update.v1',
      targetId: 'order-eta',
      limit: 2,
      at: Date.now(),
    })
    expect(store.canUseDailyQuota('food_delivery.eta_update.v1', { targetId: 'order-eta', limit: 2 })).toBe(false)
  })

  test('persists and restores backup-compatible snapshots', () => {
    const store = useSimulationStore()
    store.resetForTesting()
    store.setSurpriseMode(SIMULATION_SURPRISE_MODE.BALANCED)
    store.recordEventTrigger({
      eventId: 'food_delivery.rider_delay.v1',
      moduleKey: 'food_delivery',
      targetId: 'order-persist',
      triggerSource: SIMULATION_TRIGGER_SOURCE.RANDOM,
      cooldownMs: 1000,
      dailyLimit: 1,
      at: Date.now(),
    })
    store.saveNow()

    setActivePinia(createPinia())
    const restoredFromStorage = useSimulationStore()
    expect(restoredFromStorage.eventLogCount).toBe(1)
    expect(restoredFromStorage.surpriseMode).toBe(SIMULATION_SURPRISE_MODE.BALANCED)
    expect(restoredFromStorage.isCoolingDown('food_delivery.rider_delay.v1', { targetId: 'order-persist' })).toBe(true)

    const snapshot = {
      simulation: {
        eventLogs: [
          {
            id: 'simulation_backup_log',
            eventId: 'shopping.discount_expiring.v1',
            moduleKey: 'shopping',
            targetId: 'product-1',
            triggerSource: SIMULATION_TRIGGER_SOURCE.CONDITION,
            status: SIMULATION_EVENT_STATUS.SKIPPED,
            reason: 'conditions_failed',
            at: Date.now(),
          },
        ],
        cooldownsByEvent: {},
        dailyCounters: {},
        settings: {
          surpriseMode: SIMULATION_SURPRISE_MODE.OFF,
          enabledModules: {
            shopping: false,
          },
        },
      },
    }

    expect(restoredFromStorage.restoreFromBackup(snapshot)).toBe(true)
    expect(restoredFromStorage.eventLogs[0]).toMatchObject({
      id: 'simulation_backup_log',
      eventId: 'shopping.discount_expiring.v1',
      moduleKey: 'shopping',
      status: SIMULATION_EVENT_STATUS.SKIPPED,
    })
    expect(restoredFromStorage.surpriseMode).toBe(SIMULATION_SURPRISE_MODE.OFF)
    expect(restoredFromStorage.isModuleEventsEnabled('shopping')).toBe(false)
    expect(restoredFromStorage.createBackupSnapshot().settings.surpriseMode).toBe(SIMULATION_SURPRISE_MODE.OFF)
  })

  test('creates, updates, deletes, and restores event-scoped review notes without mutating sources', () => {
    const store = useSimulationStore()
    store.resetForTesting()
    const log = store.recordEventLog({
      id: 'event_log_notebook_1',
      eventId: 'map.production_arrival_briefing.v1',
      moduleKey: 'map',
      targetId: 'place-session-1',
      triggerSource: SIMULATION_TRIGGER_SOURCE.MANUAL,
      status: SIMULATION_EVENT_STATUS.TRIGGERED,
      at: Date.now(),
    })
    const sourceBefore = structuredClone(log)
    const eventRef = {
      eventId: log.eventId,
      sourceKind: EVENT_NOTEBOOK_SOURCE_KIND.EVENT_LOG,
      sourceId: log.id,
      moduleKey: log.moduleKey,
      targetId: log.targetId,
    }

    const created = store.upsertEventReviewNote(
      { eventRef, body: 'First line\n\nSecond line' },
      { at: Date.now() + 1 },
    )
    expect(created).toMatchObject({ eventRef, body: 'First line\n\nSecond line' })
    expect(store.eventReviewNoteCount).toBe(1)
    expect(store.listEventReviewNotesForRef(eventRef)).toHaveLength(1)
    expect(store.eventLogs[0]).toEqual(sourceBefore)

    const updated = store.upsertEventReviewNote(
      { id: created.id, eventRef, body: 'Updated audit note.' },
      { at: Date.now() + 2 },
    )
    expect(updated).toMatchObject({
      id: created.id,
      body: 'Updated audit note.',
      createdAt: created.createdAt,
    })
    expect(
      store.upsertEventReviewNote({
        id: created.id,
        eventRef: { ...eventRef, sourceId: 'another-log' },
        body: 'Cannot move a note to another event.',
      }),
    ).toBeNull()
    expect(store.upsertEventReviewNote({ eventRef, body: '' })).toBeNull()
    expect(store.upsertEventReviewNote({ eventRef, body: 'x'.repeat(4001) })).toBeNull()

    const snapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup({ simulation: snapshot })).toBe(true)
    expect(store.eventReviewNotes).toEqual([updated])
    expect(store.deleteEventReviewNote(updated.id)).toBe(true)
    expect(store.deleteEventReviewNote(updated.id)).toBe(false)
  })

  test('keeps authoritative review notes after bounded runtime logs rotate', () => {
    const store = useSimulationStore()
    store.resetForTesting()
    const firstLog = store.recordEventLog({
      id: 'rotating_log_0',
      eventId: 'simulation.session_tick.v1',
      moduleKey: 'simulation',
      targetId: 'global',
      status: SIMULATION_EVENT_STATUS.SKIPPED,
      at: 1,
    })
    const note = store.upsertEventReviewNote({
      eventRef: {
        eventId: firstLog.eventId,
        sourceKind: EVENT_NOTEBOOK_SOURCE_KIND.EVENT_LOG,
        sourceId: firstLog.id,
        moduleKey: firstLog.moduleKey,
        targetId: firstLog.targetId,
      },
      body: 'Preserve this review after the transient log window rotates.',
    })

    for (let index = 1; index <= 240; index += 1) {
      store.recordEventLog({
        id: `rotating_log_${index}`,
        eventId: 'simulation.session_tick.v1',
        moduleKey: 'simulation',
        targetId: 'global',
        status: SIMULATION_EVENT_STATUS.SKIPPED,
        at: index + 1,
      })
    }

    expect(store.eventLogs.some((log) => log.id === firstLog.id)).toBe(false)
    expect(store.eventReviewNotes).toEqual([note])
  })

  test('migrates Simulation v1 and v2 envelopes to v3 review-note storage', () => {
    const legacyData = {
      eventLogs: [],
      settings: { surpriseMode: SIMULATION_SURPRISE_MODE.BALANCED },
    }
    localStorage.setItem(
      'schatphone:store:simulation',
      JSON.stringify({ version: 1, savedAt: Date.now(), data: legacyData }),
    )
    let store = useSimulationStore()
    expect(store.eventInstances).toEqual([])
    expect(store.eventReviewNotes).toEqual([])

    setActivePinia(createPinia())
    localStorage.setItem(
      'schatphone:store:simulation',
      JSON.stringify({
        version: 2,
        savedAt: Date.now(),
        data: { ...legacyData, eventInstances: [] },
      }),
    )
    store = useSimulationStore()
    expect(store.eventInstances).toEqual([])
    expect(store.eventReviewNotes).toEqual([])
  })

  test('persists foreground session tick controls without creating event logs', () => {
    const store = useSimulationStore()
    store.resetForTesting()

    expect(store.settings.foregroundSessionTickEnabled).toBe(false)
    expect(store.settings.foregroundSessionTickIntervalMs).toBe(SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS)

    expect(store.setForegroundSessionTickEnabled(true)).toBe(true)
    expect(store.setForegroundSessionTickIntervalMs(30 * 1000)).toBe(
      SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
    )
    expect(store.eventLogCount).toBe(0)

    const snapshot = store.createBackupSnapshot()
    expect(snapshot.settings).toMatchObject({
      foregroundSessionTickEnabled: true,
      foregroundSessionTickIntervalMs: SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
    })

    const restored = useSimulationStore()
    restored.resetForTesting()
    expect(restored.restoreFromBackup({ simulation: snapshot })).toBe(true)
    expect(restored.settings.foregroundSessionTickEnabled).toBe(true)
    expect(restored.settings.foregroundSessionTickIntervalMs).toBe(
      SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
    )
  })

  test('stores generated Chat social proposals and applies only approved communication changes', () => {
    const chatStore = useChatStore()
    const store = useSimulationStore()
    store.resetForTesting()
    store.setSurpriseMode(SIMULATION_SURPRISE_MODE.BALANCED)

    const profile = chatStore.addRoleProfile({
      name: 'Runtime Social Role',
      role: 'Contact',
    })
    const contact = chatStore.bindRoleProfile(profile.id, {
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    })

    const greeting = store.submitChatSocialEventProposal(
      {
        contactId: contact.id,
        eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
        triggerSource: SIMULATION_TRIGGER_SOURCE.AI_ASSISTED,
      },
      { chatStore, at: Date.now() },
    )

    expect(greeting).toMatchObject({
      eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
      status: CHAT_SOCIAL_EVENT_STATUS.APPLIED,
      requestedChatSocialState: CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
    })
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
    )
    expect(store.recentEventLogs[0]).toMatchObject({
      eventId: 'chat.social.role_greeting_request.v1',
      moduleKey: 'chat',
      targetId: String(contact.id),
      status: SIMULATION_EVENT_STATUS.TRIGGERED,
      reason: 'eligible_low_risk_greeting',
    })

    chatStore.acceptChatContactRequest(contact.id, { at: Date.now() + 1 })

    const block = store.submitChatSocialEventProposal(
      {
        contactId: contact.id,
        eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER,
        triggerSource: SIMULATION_TRIGGER_SOURCE.AI_ASSISTED,
      },
      { chatStore, at: Date.now() + 2 },
    )

    expect(block).toMatchObject({
      status: CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
      requestedChatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
    })
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    )
    expect(store.pendingChatSocialEventProposalCount).toBe(1)

    const approved = store.approveChatSocialEventProposal(block.id, { chatStore, at: Date.now() + 3 })
    expect(approved?.status).toBe(CHAT_SOCIAL_EVENT_STATUS.APPLIED)
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
    )

    const unblock = store.submitChatSocialEventProposal(
      {
        contactId: contact.id,
        eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER,
        triggerSource: SIMULATION_TRIGGER_SOURCE.AI_ASSISTED,
      },
      { chatStore, at: Date.now() + 4 },
    )

    expect(unblock).toMatchObject({
      status: CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW,
      requestedChatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    })
    const dismissed = store.dismissChatSocialEventProposal(unblock.id, { at: Date.now() + 5 })
    expect(dismissed?.status).toBe(CHAT_SOCIAL_EVENT_STATUS.DISMISSED)
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(contact.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
    )

    const snapshot = store.createBackupSnapshot()
    expect(snapshot.chatSocialEventProposals).toHaveLength(3)
    store.resetForTesting()
    expect(store.chatSocialEventProposals).toHaveLength(0)

    expect(store.restoreFromBackup({ simulation: snapshot })).toBe(true)
    expect(store.chatSocialEventProposals.find((item) => item.id === unblock.id)?.status).toBe(
      CHAT_SOCIAL_EVENT_STATUS.DISMISSED,
    )
  })
})
