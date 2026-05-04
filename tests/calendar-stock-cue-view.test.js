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
      { path: '/worldbook', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('CalendarView stock cue interactions', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('confirms and dismisses Stock market review cues from Calendar', async () => {
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

    const cueCard = wrapper.get(`[data-testid="calendar-stock-cue-card-${cue.id}"]`)
    expect(cueCard.text()).toContain('NOVA')

    await cueCard.get('button[title="确认行情复盘提醒"]').trigger('click')
    await flushUi()

    expect(calendarStore.findStockMarketCueById(cue.id)?.status).toBe('confirmed')
    expect(calendarStore.findEventBySourceReminderId(cue.id)?.titleEn).toBe('Review NOVA')
    expect(wrapper.get(`[data-testid="calendar-event-card-calendar_event_${cue.id}"]`).text()).toContain('NOVA')

    await wrapper.get(`[data-testid="calendar-stock-cue-card-${cue.id}"] button[title="忽略行情线索"]`).trigger('click')
    await flushUi()

    expect(calendarStore.findStockMarketCueById(cue.id)?.status).toBe('dismissed')
    expect(calendarStore.findEventBySourceReminderId(cue.id)).toBeNull()

    wrapper.unmount()
  })
})
