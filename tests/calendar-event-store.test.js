import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as pushLib from '../src/lib/push'
import { SHOPPING_SOURCE_KEYS } from '../src/lib/planned-module-registry'
import { useCalendarStore } from '../src/stores/calendar'
import { useSystemStore } from '../src/stores/system'

describe('calendar event store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('turns a confirmed map reminder into a persisted calendar event', () => {
    const store = useCalendarStore()
    const dueAt = Date.now() + 24 * 60 * 60 * 1000
    const reminder = {
      id: 'map_calendar_city_core',
      areaId: 'city_core',
      titleZh: '城市核心回访',
      titleEn: 'City core follow-up',
      summaryZh: '基于已解锁区域的地点反馈。',
      summaryEn: 'Location feedback from an unlocked area.',
      dueAt,
      pinned: false,
      route: '/map',
      icon: 'fas fa-map-location-dot',
      tone: 'emerald',
    }

    const event = store.upsertEventFromMapReminder(reminder)

    expect(event?.source).toBe('map_calendar_reminder')
    expect(event?.sourceReminderId).toBe(reminder.id)
    expect(event?.sourceAreaId).toBe('city_core')
    expect(event?.startsAt).toBe(dueAt)
    expect(event?.status).toBe('confirmed')
    expect(event?.pinned).toBe(false)
    expect(store.upcomingEvents.map((item) => item.id)).toEqual([event.id])

    const pinnedEvent = store.upsertEventFromMapReminder({
      ...reminder,
      pinned: true,
    })
    expect(store.eventCount).toBe(1)
    expect(pinnedEvent?.pinned).toBe(true)

    const editedStartsAt = dueAt + 2 * 60 * 60 * 1000
    expect(store.setEventStartsAt(pinnedEvent.id, editedStartsAt)).toBe(true)
    const editedEvent = store.findEventById(pinnedEvent.id)
    expect(editedEvent?.startsAt).toBe(editedStartsAt)
    expect(editedEvent?.originalStartsAt).toBe(dueAt)
    expect(editedEvent?.timeEditedAt).toBeGreaterThan(0)

    const refreshedEvent = store.upsertEventFromMapReminder({
      ...reminder,
      dueAt: dueAt + 7 * 24 * 60 * 60 * 1000,
      pinned: true,
    })
    expect(refreshedEvent?.startsAt).toBe(editedStartsAt)
    expect(refreshedEvent?.originalStartsAt).toBe(dueAt)

    const snapshot = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restoredStore = useCalendarStore()
    expect(restoredStore.restoreFromBackup({ calendar: snapshot })).toBe(true)

    const restoredEvent = restoredStore.findEventBySourceReminderId(reminder.id)
    expect(restoredEvent?.titleEn).toBe('City core follow-up')
    expect(restoredEvent?.pinned).toBe(true)
    expect(restoredEvent?.startsAt).toBe(editedStartsAt)
    expect(restoredEvent?.timeEditedAt).toBeGreaterThan(0)

    expect(restoredStore.resetEventStartsAt(restoredEvent.id)).toBe(true)
    const resetEvent = restoredStore.findEventById(restoredEvent.id)
    expect(resetEvent?.startsAt).toBe(dueAt)
    expect(resetEvent?.timeEditedAt).toBe(0)

    expect(restoredStore.removeEventBySourceReminderId(reminder.id)).toBe(true)
    expect(restoredStore.upcomingEvents.length).toBe(0)
  })

  test('turns missed-call cues into confirmable calendar events', () => {
    const store = useCalendarStore()
    const callStartedAt = Date.now() - 5 * 60 * 1000

    const cue = store.upsertPhoneMissedCallCueFromCall({
      id: 'phone_call_nova',
      contactName: 'Nova',
      phoneNumber: '+10086',
      summary: 'Call back after arrival.',
      startedAt: callStartedAt,
      createdAt: callStartedAt,
    })

    expect(cue).toMatchObject({
      id: 'phone_missed_call_cue_phone_call_nova',
      callId: 'phone_call_nova',
      contactName: 'Nova',
      status: 'suggested',
      source: 'phone_missed_call',
    })
    expect(cue?.suggestedAt).toBe(callStartedAt + 30 * 60 * 1000)
    expect(store.phoneMissedCallCueCount).toBe(1)

    const event = store.confirmPhoneMissedCallCue(cue.id)

    expect(event).toMatchObject({
      source: 'phone_missed_call',
      sourceReminderId: cue.id,
      titleEn: 'Call back Nova',
      route: '/phone',
      icon: 'fas fa-phone-slash',
      status: 'confirmed',
    })
    expect(store.findPhoneMissedCallCueById(cue.id)?.status).toBe('confirmed')
    expect(store.upcomingEvents.map((item) => item.id)).toEqual([event.id])

    const snapshot = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restoredStore = useCalendarStore()
    expect(restoredStore.restoreFromBackup({ calendar: snapshot })).toBe(true)
    expect(restoredStore.findPhoneMissedCallCueById(cue.id)?.status).toBe('confirmed')
    expect(restoredStore.findEventBySourceReminderId(cue.id)?.titleEn).toBe('Call back Nova')

    expect(restoredStore.dismissPhoneMissedCallCue(cue.id)).toBe(true)
    expect(restoredStore.findPhoneMissedCallCueById(cue.id)?.status).toBe('dismissed')
    expect(restoredStore.findEventBySourceReminderId(cue.id)).toBeNull()
    expect(restoredStore.phoneMissedCallCueCount).toBe(0)
  })

  test('turns Shopping delivery cues into confirmable calendar events', () => {
    const store = useCalendarStore()
    const orderCreatedAt = Date.now()

    const cue = store.upsertShoppingDeliveryCueFromOrder({
      id: 'shopping_order_nova',
      itemCount: 2,
      totalCents: 45600,
      currency: 'CNY',
      note: 'Delivery check for Nova.',
      createdAt: orderCreatedAt,
      items: [
        {
          title: 'Nova Gift',
        },
      ],
    })

    expect(cue).toMatchObject({
      id: 'shopping_delivery_cue_shopping_order_nova',
      orderId: 'shopping_order_nova',
      status: 'suggested',
      source: SHOPPING_SOURCE_KEYS.CALENDAR_DELIVERY,
      totalCents: 45600,
    })
    expect(cue?.suggestedAt).toBe(orderCreatedAt + 24 * 60 * 60 * 1000)
    expect(store.shoppingDeliveryCueCount).toBe(1)

    const event = store.confirmShoppingDeliveryCue(cue.id)

    expect(event).toMatchObject({
      source: SHOPPING_SOURCE_KEYS.CALENDAR_DELIVERY,
      sourceReminderId: cue.id,
      titleEn: 'Shopping follow-up: 2 Shopping items',
      route: '/shopping',
      icon: 'fas fa-truck-fast',
      status: 'confirmed',
    })
    expect(store.findShoppingDeliveryCueById(cue.id)?.status).toBe('confirmed')
    expect(store.upcomingEvents.map((item) => item.id)).toEqual([event.id])

    const snapshot = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restoredStore = useCalendarStore()
    expect(restoredStore.restoreFromBackup({ calendar: snapshot })).toBe(true)
    expect(restoredStore.findShoppingDeliveryCueById(cue.id)?.status).toBe('confirmed')
    expect(restoredStore.findEventBySourceReminderId(cue.id)?.titleEn).toBe(
      'Shopping follow-up: 2 Shopping items',
    )

    expect(restoredStore.dismissShoppingDeliveryCue(cue.id)).toBe(true)
    expect(restoredStore.findShoppingDeliveryCueById(cue.id)?.status).toBe('dismissed')
    expect(restoredStore.findEventBySourceReminderId(cue.id)).toBeNull()
    expect(restoredStore.shoppingDeliveryCueCount).toBe(0)
  })

  test('schedules, reschedules, and cancels real push for calendar events', async () => {
    const store = useCalendarStore()
    const systemStore = useSystemStore()
    systemStore.setPushState({
      realPushEnabled: true,
      pushServerUrl: 'http://localhost:8787',
      pushDeviceId: 'push_device_1',
      pushSubscriptionActive: true,
    })

    const scheduleSpy = vi
      .spyOn(pushLib, 'schedulePushNotification')
      .mockImplementation(async ({ scheduleId, deliverAt }) => ({
        ok: true,
        scheduleId,
        deliverAt,
      }))
    const cancelSpy = vi
      .spyOn(pushLib, 'cancelScheduledPushNotification')
      .mockImplementation(async ({ scheduleId }) => ({
        ok: true,
        removed: true,
        scheduleId,
      }))

    const dueAt = Date.now() + 24 * 60 * 60 * 1000
    const event = store.upsertEventFromMapReminder({
      id: 'map_calendar_push_city_core',
      areaId: 'city_core',
      titleZh: '城市核心回访',
      titleEn: 'City core follow-up',
      summaryZh: '基于已解锁区域的地点反馈。',
      summaryEn: 'Location feedback from an unlocked area.',
      dueAt,
      pinned: true,
      route: '/map',
      icon: 'fas fa-map-location-dot',
      tone: 'emerald',
    })
    const scheduleId = `calendar_event_push_${event.id}`

    const scheduled = await store.ensureEventPushScheduled(event.id, {
      source: 'test_calendar_event_schedule',
    })

    expect(scheduled.ok).toBe(true)
    expect(scheduleSpy).toHaveBeenCalledTimes(1)
    expect(scheduleSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        category: 'calendar_event',
        deliverAt: dueAt,
        scheduleId,
        source: 'test_calendar_event_schedule',
      }),
    )
    expect(store.findEventById(event.id)?.scheduledPushId).toBe(scheduleId)
    expect(store.findEventById(event.id)?.scheduledPushAt).toBe(dueAt)
    expect(store.findEventById(event.id)?.pushStatus).toBe('scheduled')
    expect(store.findEventById(event.id)?.lastPushScheduledAt).toBeGreaterThan(0)
    expect(store.findEventById(event.id)?.pushHistory[0]).toEqual(
      expect.objectContaining({
        action: 'schedule',
        status: 'ok',
        scheduleId,
        deliverAt: dueAt,
      }),
    )

    const editedStartsAt = dueAt + 60 * 60 * 1000
    expect(store.setEventStartsAt(event.id, editedStartsAt)).toBe(true)
    expect(store.findEventById(event.id)?.pushStatus).toBe('needs_reschedule')
    const rescheduled = await store.rescheduleEventPush(event.id, {
      source: 'test_calendar_event_reschedule',
    })

    expect(rescheduled.ok).toBe(true)
    expect(cancelSpy).toHaveBeenCalledTimes(1)
    expect(cancelSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scheduleId,
      }),
    )
    expect(scheduleSpy).toHaveBeenCalledTimes(2)
    expect(scheduleSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        deliverAt: editedStartsAt,
        scheduleId,
        source: 'test_calendar_event_reschedule',
      }),
    )
    expect(store.findEventById(event.id)?.scheduledPushAt).toBe(editedStartsAt)
    expect(store.findEventById(event.id)?.pushStatus).toBe('scheduled')
    expect(store.findEventById(event.id)?.lastPushCancelledAt).toBeGreaterThan(0)
    expect(store.findEventById(event.id)?.pushHistory.map((item) => item.action)).toEqual([
      'schedule',
      'cancel',
      'schedule',
    ])
    expect(store.findEventById(event.id)?.pushHistory[0]).toEqual(
      expect.objectContaining({
        action: 'schedule',
        status: 'ok',
        deliverAt: editedStartsAt,
      }),
    )

    const cancelled = await store.cancelEventPushScheduled({
      eventId: event.id,
      source: 'test_calendar_event_cancel',
    })

    expect(cancelled.ok).toBe(true)
    expect(cancelSpy).toHaveBeenCalledTimes(2)
    expect(store.findEventById(event.id)?.scheduledPushId).toBe('')
    expect(store.findEventById(event.id)?.scheduledPushAt).toBe(0)
    expect(store.findEventById(event.id)?.pushStatus).toBe('cancelled')
    expect(store.findEventById(event.id)?.pushHistory[0]).toEqual(
      expect.objectContaining({
        action: 'cancel',
        status: 'ok',
        scheduleId,
      }),
    )

    const snapshot = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restoredStore = useCalendarStore()
    expect(restoredStore.restoreFromBackup({ calendar: snapshot })).toBe(true)
    const restoredEvent = restoredStore.findEventById(event.id)
    expect(restoredEvent?.pushStatus).toBe('cancelled')
    expect(restoredEvent?.pushHistory[0]?.action).toBe('cancel')
  })

  test('keeps concurrent push scheduling isolated per event while deduping same-event requests', async () => {
    const store = useCalendarStore()
    const systemStore = useSystemStore()
    systemStore.setPushState({
      realPushEnabled: true,
      pushServerUrl: 'http://localhost:8787',
      pushDeviceId: 'push_device_1',
      pushSubscriptionActive: true,
    })

    const scheduleSpy = vi
      .spyOn(pushLib, 'schedulePushNotification')
      .mockImplementation(async ({ scheduleId, deliverAt }) => ({
        ok: true,
        scheduleId,
        deliverAt,
      }))

    const firstStartsAt = Date.now() + 2 * 60 * 60 * 1000
    const secondStartsAt = Date.now() + 3 * 60 * 60 * 1000
    const firstEvent = store.upsertEvent({
      id: 'calendar_event_parallel_first',
      titleZh: 'First event',
      titleEn: 'First event',
      startsAt: firstStartsAt,
    })
    const secondEvent = store.upsertEvent({
      id: 'calendar_event_parallel_second',
      titleZh: 'Second event',
      titleEn: 'Second event',
      startsAt: secondStartsAt,
    })

    const [firstResult, secondResult] = await Promise.all([
      store.ensureEventPushScheduled(firstEvent.id, { source: 'parallel_first' }),
      store.ensureEventPushScheduled(secondEvent.id, { source: 'parallel_second' }),
    ])

    expect(firstResult).toMatchObject({
      ok: true,
      scheduleId: `calendar_event_push_${firstEvent.id}`,
      deliverAt: firstStartsAt,
    })
    expect(secondResult).toMatchObject({
      ok: true,
      scheduleId: `calendar_event_push_${secondEvent.id}`,
      deliverAt: secondStartsAt,
    })
    expect(scheduleSpy).toHaveBeenCalledTimes(2)
    expect(store.findEventById(firstEvent.id)?.scheduledPushId).toBe(
      `calendar_event_push_${firstEvent.id}`,
    )
    expect(store.findEventById(secondEvent.id)?.scheduledPushId).toBe(
      `calendar_event_push_${secondEvent.id}`,
    )

    scheduleSpy.mockClear()
    const [duplicateFirst, duplicateSecond] = await Promise.all([
      store.ensureEventPushScheduled(firstEvent.id, { force: true, source: 'duplicate_first' }),
      store.ensureEventPushScheduled(firstEvent.id, { force: true, source: 'duplicate_second' }),
    ])

    expect(duplicateFirst).toEqual(duplicateSecond)
    expect(scheduleSpy).toHaveBeenCalledTimes(1)
  })
})
