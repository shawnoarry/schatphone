import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import CalendarView from '../src/views/CalendarView.vue'
import { useCalendarStore } from '../src/stores/calendar'
import { useMapStore } from '../src/stores/map'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/calendar', component: CalendarView },
      { path: '/home', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/worldbook', component: DummyView },
    ],
  })

describe('calendar worldbook context', () => {
  let wrapper = null
  let router = null
  let calendarStore = null
  let mapStore = null
  let systemStore = null

  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    calendarStore = useCalendarStore()
    mapStore = useMapStore()
    systemStore = useSystemStore()

    systemStore.upsertKnowledgePoint({
      title: 'Route memory',
      content: 'Safe crossings and station exits for Home to Office.',
      tags: ['map', 'travel'],
      enabled: true,
    })
    systemStore.upsertKnowledgePoint({
      title: 'Tea rituals',
      content: 'Ceremony phrases for late evenings.',
      tags: ['culture'],
      enabled: true,
    })

    const baseAt = Date.now()
    expect(
      mapStore.restoreFromBackup({
        map: {
          tripHistory: [
            {
              id: 'calendar_worldbook_trip',
              status: 'arrived',
              from: 'Home',
              to: 'Office',
              fromLabel: 'Home',
              toLabel: 'Office',
              distanceKm: 5,
              fare: 9000,
              durationSeconds: 900,
              startedAt: baseAt,
              endedAt: baseAt + 900,
              rewardPoints: 20,
            },
          ],
        },
      }),
    ).toBe(true)

    const reminderId = mapStore.mapCalendarReminders[0]?.id
    expect(reminderId).toBeTruthy()
    expect(mapStore.confirmMapCalendarReminder(reminderId)).toBe(true)

    router = createTestRouter()
    await router.push({
      path: '/calendar',
      query: { from: 'home', homePage: '1' },
    })
    await router.isReady()

    wrapper = mount(CalendarView, {
      global: {
        plugins: [router],
      },
    })
    await nextTick()
    await Promise.resolve()
    await nextTick()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    wrapper = null
    router = null
    calendarStore = null
    mapStore = null
    systemStore = null
  })

  test('shows related WorldBook knowledge points for reminders and confirmed events', async () => {
    const reminderId = mapStore.mapCalendarReminders[0]?.id
    const routePoint = systemStore.listKnowledgePoints().find((item) => item.title === 'Route memory')
    const eventId = calendarStore.upcomingEvents[0]?.id

    expect(reminderId).toBeTruthy()
    expect(routePoint?.id).toBeTruthy()
    expect(eventId).toBeTruthy()

    const reminderContext = wrapper.get(`[data-testid="calendar-reminder-worldbook-${reminderId}"]`)
    expect(reminderContext.text()).toContain('Route memory')
    expect(reminderContext.text()).not.toContain('Tea rituals')

    const eventContext = wrapper.get(`[data-testid="calendar-event-worldbook-${eventId}"]`)
    expect(eventContext.text()).toContain('Route memory')
    expect(
      wrapper.find(`[data-testid="calendar-event-worldbook-chip-${eventId}-${routePoint.id}"]`).exists(),
    ).toBe(true)
  })

  test('deep-links reminder context into WorldBook filters', async () => {
    const reminderId = mapStore.mapCalendarReminders[0]?.id
    const routePoint = systemStore.listKnowledgePoints().find((item) => item.title === 'Route memory')

    expect(reminderId).toBeTruthy()
    expect(routePoint?.id).toBeTruthy()

    await wrapper
      .get(`[data-testid="calendar-reminder-worldbook-chip-${reminderId}-${routePoint.id}"]`)
      .trigger('click')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.path).toBe('/worldbook')
    expect(router.currentRoute.value.query).toMatchObject({
      source: 'calendar',
      homePage: '1',
      point: routePoint.id,
    })
  })
})
