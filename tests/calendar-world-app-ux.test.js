import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CalendarView from '../src/views/CalendarView.vue'
import { useCalendarStore } from '../src/stores/calendar'
import { useSystemStore } from '../src/stores/system'

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

describe('Calendar world app UX package', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('renders a reservation World Pack context without owning calendar records', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const calendarStore = useCalendarStore()
    expect(systemStore.activateWorldPack('fandom_parallel').ok).toBe(true)

    await router.push({
      path: '/calendar',
      query: {
        worldPack: 'fandom_parallel',
        worldApp: 'fandom_schedule_board',
      },
    })
    await router.isReady()

    const wrapper = mount(CalendarView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    const contextBanner = wrapper.get('[data-testid="calendar-world-app-context"]')
    expect(contextBanner.attributes('data-world-pack')).toBe('fandom_parallel')
    expect(contextBanner.attributes('data-world-app')).toBe('fandom_schedule_board')
    expect(wrapper.get('[data-testid="calendar-schedule-overview"]').text()).toContain(
      'Calendar keeps its own records',
    )
    expect(calendarStore.upcomingEvents).toHaveLength(0)

    wrapper.unmount()
  })

  test('renders a confirmed nonstandard reservation app binding as Calendar context', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const calendarStore = useCalendarStore()
    const confirmed = systemStore.confirmWorldAppTemplateProposal(
      {
        templateId: 'reservation_board',
        title: 'Ritual Calendar',
        confidence: 'high',
      },
      'default_world',
    )
    expect(confirmed.ok).toBe(true)

    await router.push({
      path: '/calendar',
      query: {
        worldPack: 'default_world',
        worldApp: confirmed.binding.id,
      },
    })
    await router.isReady()

    const wrapper = mount(CalendarView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    const contextBanner = wrapper.get('[data-testid="calendar-world-app-context"]')
    expect(contextBanner.attributes('data-world-pack')).toBe('default_world')
    expect(contextBanner.attributes('data-world-app')).toBe(confirmed.binding.id)
    expect(wrapper.get('[data-testid="calendar-schedule-overview"]').text()).toContain(
      'Ritual Calendar',
    )
    expect(wrapper.get('[data-testid="calendar-schedule-overview"]').text()).toContain(
      'Calendar keeps its own records',
    )
    expect(calendarStore.upcomingEvents).toHaveLength(0)

    wrapper.unmount()
  })
})
