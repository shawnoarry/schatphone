import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalendarStore } from '../src/stores/calendar'

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

    const snapshot = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restoredStore = useCalendarStore()
    expect(restoredStore.restoreFromBackup({ calendar: snapshot })).toBe(true)

    const restoredEvent = restoredStore.findEventBySourceReminderId(reminder.id)
    expect(restoredEvent?.titleEn).toBe('City core follow-up')
    expect(restoredEvent?.pinned).toBe(true)

    expect(restoredStore.removeEventBySourceReminderId(reminder.id)).toBe(true)
    expect(restoredStore.upcomingEvents.length).toBe(0)
  })
})
