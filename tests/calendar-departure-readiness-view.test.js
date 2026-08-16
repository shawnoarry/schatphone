import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CalendarView from '../src/views/CalendarView.vue'
import { useCalendarStore } from '../src/stores/calendar'
import { useMapStore } from '../src/stores/map'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/calendar', component: CalendarView },
      { path: '/home', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/reminders', component: DummyView },
      { path: '/worldbook', component: DummyView },
    ],
  })

describe('Calendar departure readiness UI', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('recomputes the native appointment prompt and starts the linked Map Journey explicitly', async () => {
    const router = createTestRouter()
    const calendarStore = useCalendarStore()
    const mapStore = useMapStore()
    const event = calendarStore.upsertEvent({
      id: 'calendar_event_departure_ui',
      titleZh: '工作室预约',
      titleEn: 'Studio appointment',
      startsAt: Date.now() + 60 * 60_000,
      status: 'confirmed',
      locationRef: {
        owner: 'map',
        mapPackId: 'real-seoul-v1',
        placeId: 'seoul-sm-hq',
        labelZh: 'SM 娱乐总部',
        labelEn: 'SM Entertainment HQ',
      },
    })

    await router.push('/calendar')
    await router.isReady()
    const wrapper = mount(CalendarView, { global: { plugins: [router] } })
    await flushPromises()

    const departure = wrapper.get(`[data-testid="calendar-event-departure-${event.id}"]`)
    expect(departure.text()).toContain('家')
    expect(departure.text()).toContain('SM 娱乐总部')
    expect(departure.text()).toMatch(/预计到达|Predicted arrival/)

    mapStore.setCurrentLocationByAddressId(2)
    await flushPromises()
    expect(departure.text()).toContain('公司')

    await wrapper.get(`[data-testid="calendar-event-departure-expand-${event.id}"]`).trigger('click')
    const modeSelect = wrapper.get(`[data-testid="calendar-event-departure-mode-${event.id}"]`)
    await modeSelect.setValue('walk')
    expect(modeSelect.element.value).toBe('walk')

    await wrapper.get(`[data-testid="calendar-event-start-travel-${event.id}"]`).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value).toMatchObject({
      path: '/map',
      query: { source: 'calendar', calendarEventId: event.id },
    })
    expect(mapStore.tripState).toMatchObject({
      status: 'traveling',
      sourceCalendarEventId: event.id,
      fromLabel: '公司',
      transportMode: 'walk',
    })

    mapStore.resetTripRuntimeForTesting()
    wrapper.unmount()
  })
})
