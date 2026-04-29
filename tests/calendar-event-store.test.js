import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as pushLib from '../src/lib/push'
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

    const editedStartsAt = dueAt + 60 * 60 * 1000
    expect(store.setEventStartsAt(event.id, editedStartsAt)).toBe(true)
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

    const cancelled = await store.cancelEventPushScheduled({
      eventId: event.id,
      source: 'test_calendar_event_cancel',
    })

    expect(cancelled.ok).toBe(true)
    expect(cancelSpy).toHaveBeenCalledTimes(2)
    expect(store.findEventById(event.id)?.scheduledPushId).toBe('')
    expect(store.findEventById(event.id)?.scheduledPushAt).toBe(0)
  })
})
