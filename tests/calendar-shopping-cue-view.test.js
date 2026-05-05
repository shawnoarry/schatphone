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
      { path: '/shopping', component: DummyView },
      { path: '/worldbook', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('CalendarView Shopping cue interactions', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('confirms and dismisses Shopping delivery cues from Calendar', async () => {
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

    expect(wrapper.text()).toContain('线索确认层')
    expect(wrapper.text()).toContain('外部模块先给出线索')
    expect(wrapper.text()).toContain('配送跟进线索')

    const cueCard = wrapper.get(`[data-testid="calendar-shopping-cue-card-${cue.id}"]`)
    expect(cueCard.text()).toContain('Mira Lens')

    await cueCard.get('button[title="确认购物跟进提醒"]').trigger('click')
    await flushUi()

    expect(calendarStore.findShoppingDeliveryCueById(cue.id)?.status).toBe('confirmed')
    expect(calendarStore.findEventBySourceReminderId(cue.id)?.titleEn).toBe(
      'Shopping follow-up: Mira Lens',
    )
    expect(wrapper.get(`[data-testid="calendar-event-card-calendar_event_${cue.id}"]`).text()).toContain(
      'Mira Lens',
    )

    await wrapper
      .get(`[data-testid="calendar-shopping-cue-card-${cue.id}"] button[title="忽略购物线索"]`)
      .trigger('click')
    await flushUi()

    expect(calendarStore.findShoppingDeliveryCueById(cue.id)?.status).toBe('dismissed')
    expect(calendarStore.findEventBySourceReminderId(cue.id)).toBeNull()

    wrapper.unmount()
  })
})
