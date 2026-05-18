import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import CalendarView from '../src/views/CalendarView.vue'
import { useCalendarStore } from '../src/stores/calendar'
import { useShoppingStore } from '../src/stores/shopping'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/calendar', component: CalendarView },
      { path: '/home', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/reminders', component: DummyView },
      { path: '/shopping', component: DummyView },
      { path: '/worldbook', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('CalendarView Shopping cue boundary', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('summarizes Shopping delivery cues and routes processing to Reminders', async () => {
    const shoppingStore = useShoppingStore()
    const calendarStore = useCalendarStore()
    shoppingStore.resetForTesting()
    calendarStore.resetForTesting()
    const product = shoppingStore.upsertProduct({
      id: 'product_calendar_lens',
      title: 'Mira Lens',
      category: 'digital',
      price: '1288.00',
    })
    shoppingStore.addToCart(product.id)
    const order = shoppingStore.checkoutCart({
      note: 'Delivery follow-up.',
    })

    const cue = calendarStore.findShoppingDeliveryCueByOrderId(order.id)
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

    expect(wrapper.get('[data-testid="calendar-schedule-overview"]').text()).toContain('日程中心')
    expect(wrapper.get('[data-testid="calendar-reminder-summary"]').text()).toContain('待处理线索')
    expect(wrapper.get('[data-testid="calendar-reminder-source-shopping"]').text()).toContain('1')
    expect(wrapper.find(`[data-testid="calendar-shopping-cue-card-${cue.id}"]`).exists()).toBe(false)
    expect(calendarStore.findShoppingDeliveryCueById(cue.id)?.status).toBe('suggested')
    expect(calendarStore.findEventBySourceReminderId(cue.id)).toBeNull()

    await wrapper.get('[data-testid="calendar-open-reminders"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/reminders')

    wrapper.unmount()
  })
})
