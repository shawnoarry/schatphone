import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import CalendarView from '../src/views/CalendarView.vue'
import { useCalendarStore } from '../src/stores/calendar'
import { useStockStore } from '../src/stores/stock'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/calendar', component: CalendarView },
      { path: '/home', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/reminders', component: DummyView },
      { path: '/stock', component: DummyView },
      { path: '/worldbook', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('CalendarView stock cue boundary', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('summarizes Stock market cues and routes processing to Reminders', async () => {
    const stockStore = useStockStore()
    const calendarStore = useCalendarStore()
    stockStore.resetForTesting()
    calendarStore.resetForTesting()
    stockStore.upsertStock({
      symbol: 'NOVA',
      name: 'Nova Labs',
      price: 12.34,
      changePercent: 4.5,
    })

    const cue = calendarStore.activeStockMarketCues[0]
    expect(cue?.id).toBeTruthy()

    const router = createTestRouter()
    await router.push('/calendar')
    await router.isReady()

    const wrapper = mount(CalendarView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="calendar-reminder-source-stock"]').text()).toContain('1')
    expect(wrapper.find(`[data-testid="calendar-stock-cue-card-${cue.id}"]`).exists()).toBe(false)
    expect(calendarStore.findStockMarketCueById(cue.id)?.status).toBe('suggested')
    expect(calendarStore.findEventBySourceReminderId(cue.id)).toBeNull()

    await wrapper.get('[data-testid="calendar-open-reminders"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/reminders')

    wrapper.unmount()
  })
})
