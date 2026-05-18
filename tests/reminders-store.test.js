import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalendarStore } from '../src/stores/calendar'
import { useMapStore } from '../src/stores/map'
import { useRemindersStore } from '../src/stores/reminders'
import { writePersistedState } from '../src/lib/persistence'

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

  test('hydrates cue ownership from legacy Calendar storage', () => {
    writePersistedState(
      'store:calendar',
      {
        phoneMissedCallCues: [
          {
            id: 'phone_missed_call_cue_legacy',
            callId: 'legacy',
            contactName: 'Legacy',
            suggestedAt: Date.now() + 60_000,
            status: 'suggested',
          },
        ],
        stockMarketCues: [
          {
            id: 'stock_market_cue_legacy_stock',
            stockId: 'legacy_stock',
            symbol: 'OLD',
            name: 'Old Labs',
            suggestedAt: Date.now() + 120_000,
            status: 'suggested',
          },
        ],
        shoppingDeliveryCues: [
          {
            id: 'shopping_delivery_cue_legacy_order',
            orderId: 'legacy_order',
            title: 'Legacy Order',
            suggestedAt: Date.now() + 180_000,
            status: 'suggested',
          },
        ],
      },
      { version: 1 },
    )
    setActivePinia(createPinia())

    const remindersStore = useRemindersStore()

    expect(
      remindersStore.findPhoneMissedCallCueById('phone_missed_call_cue_legacy')?.contactName,
    ).toBe('Legacy')
    expect(remindersStore.findStockMarketCueByStockId('legacy_stock')?.symbol).toBe('OLD')
    expect(remindersStore.findShoppingDeliveryCueByOrderId('legacy_order')?.title).toBe('Legacy Order')
  })

  test('migrates legacy Calendar cues when Calendar hydrates first', () => {
    writePersistedState(
      'store:calendar',
      {
        events: [
          {
            id: 'calendar_event_existing',
            titleZh: 'Existing event',
            titleEn: 'Existing event',
            startsAt: Date.now() + 60_000,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
        phoneMissedCallCues: [
          {
            id: 'phone_missed_call_cue_calendar_first',
            callId: 'calendar_first',
            contactName: 'Calendar First',
            suggestedAt: Date.now() + 120_000,
            status: 'suggested',
          },
        ],
      },
      { version: 1 },
    )
    setActivePinia(createPinia())

    const calendarStore = useCalendarStore()
    const remindersStore = useRemindersStore()

    expect(calendarStore.findEventById('calendar_event_existing')?.titleEn).toBe('Existing event')
    expect(
      remindersStore.findPhoneMissedCallCueByCallId('calendar_first')?.contactName,
    ).toBe('Calendar First')
    expect(calendarStore.findPhoneMissedCallCueByCallId('calendar_first')?.contactName).toBe(
      'Calendar First',
    )
  })
})
