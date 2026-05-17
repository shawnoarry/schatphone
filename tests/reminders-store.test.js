import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalendarStore } from '../src/stores/calendar'
import { useMapStore } from '../src/stores/map'
import { useRemindersStore } from '../src/stores/reminders'

describe('reminders store bridge', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('aggregates cross-module cues without moving Calendar storage', () => {
    const calendarStore = useCalendarStore()
    const mapStore = useMapStore()
    const remindersStore = useRemindersStore()
    calendarStore.resetForTesting()

    calendarStore.upsertPhoneMissedCallCueFromCall({
      id: 'call_nova',
      contactName: 'Nova',
      startedAt: Date.now(),
    })
    calendarStore.upsertShoppingDeliveryCueFromOrder({
      id: 'order_lens',
      items: [{ title: 'Mira Lens' }],
      createdAt: Date.now(),
    })
    calendarStore.upsertStockMarketCueFromStock({
      id: 'stock_nova',
      symbol: 'NOVA',
      name: 'Nova Labs',
      changePercent: 4.2,
      updatedAt: Date.now(),
    })
    mapStore.restoreFromBackup({
      map: {
        tripHistory: [
          {
            id: 'trip_city_core',
            status: 'arrived',
            from: 'Home',
            to: 'Office',
            fromLabel: 'Home',
            toLabel: 'Office',
            distanceKm: 5,
            fare: 9000,
            durationSeconds: 900,
            startedAt: Date.now(),
            endedAt: Date.now() + 900,
            rewardPoints: 20,
          },
        ],
      },
    })

    expect(remindersStore.activeReminderCount).toBe(4)
    expect(remindersStore.sourceCounts).toMatchObject({
      map: 1,
      phone: 1,
      shopping: 1,
      stock: 1,
    })
    expect(calendarStore.eventCount).toBe(0)
  })

  test('delegates confirmation and dismissal back to existing owners', () => {
    const calendarStore = useCalendarStore()
    const remindersStore = useRemindersStore()
    calendarStore.resetForTesting()

    const phoneCue = calendarStore.upsertPhoneMissedCallCueFromCall({
      id: 'call_nova',
      contactName: 'Nova',
      startedAt: Date.now(),
    })
    const shoppingCue = calendarStore.upsertShoppingDeliveryCueFromOrder({
      id: 'order_lens',
      items: [{ title: 'Mira Lens' }],
      createdAt: Date.now(),
    })

    const event = remindersStore.confirmReminderByKey(`phone:${phoneCue.id}`)
    expect(event?.source).toBe('phone_missed_call')
    expect(calendarStore.findPhoneMissedCallCueById(phoneCue.id)?.status).toBe('confirmed')

    expect(remindersStore.dismissReminderByKey(`shopping:${shoppingCue.id}`)).toBe(true)
    expect(calendarStore.findShoppingDeliveryCueById(shoppingCue.id)?.status).toBe('dismissed')
    expect(calendarStore.findEventBySourceReminderId(shoppingCue.id)).toBeNull()
  })

  test('syncs Map reminder confirmation into Calendar events', () => {
    const calendarStore = useCalendarStore()
    const mapStore = useMapStore()
    const remindersStore = useRemindersStore()
    calendarStore.resetForTesting()
    mapStore.restoreFromBackup({
      map: {
        tripHistory: [
          {
            id: 'trip_city_core',
            status: 'arrived',
            from: 'Home',
            to: 'Office',
            fromLabel: 'Home',
            toLabel: 'Office',
            distanceKm: 5,
            fare: 9000,
            durationSeconds: 900,
            startedAt: Date.now(),
            endedAt: Date.now() + 900,
            rewardPoints: 20,
          },
        ],
      },
    })

    const reminder = mapStore.mapCalendarReminders[0]
    const event = remindersStore.confirmReminderByKey(`map:${reminder.id}`)

    expect(event?.source).toBe('map_calendar_reminder')
    expect(mapStore.mapCalendarReminders[0]?.status).toBe('confirmed')
    expect(calendarStore.findEventBySourceReminderId(reminder.id)?.id).toBe(event.id)

    expect(remindersStore.dismissReminderByKey(`map:${reminder.id}`)).toBe(true)
    expect(mapStore.mapCalendarReminders[0]?.status).toBe('dismissed')
    expect(calendarStore.findEventBySourceReminderId(reminder.id)).toBeNull()
  })
})
