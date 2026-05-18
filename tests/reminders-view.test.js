import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import RemindersView from '../src/views/RemindersView.vue'
import CalendarView from '../src/views/CalendarView.vue'
import { useCalendarStore } from '../src/stores/calendar'
import { useRemindersStore } from '../src/stores/reminders'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/reminders', component: RemindersView },
      { path: '/calendar', component: CalendarView },
      { path: '/home', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/phone', component: DummyView },
      { path: '/shopping', component: DummyView },
      { path: '/stock', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('RemindersView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('renders cross-module cue inbox and confirms cues into Calendar', async () => {
    const calendarStore = useCalendarStore()
    calendarStore.resetForTesting()

    const phoneCue = calendarStore.upsertPhoneMissedCallCueFromCall({
      id: 'call_nova',
      contactName: 'Nova',
      startedAt: Date.now(),
    })
    calendarStore.upsertShoppingDeliveryCueFromOrder({
      id: 'order_lens',
      items: [{ title: 'Mira Lens' }],
      createdAt: Date.now(),
    })

    const router = createTestRouter()
    await router.push('/reminders')
    await router.isReady()

    const wrapper = mount(RemindersView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.text()).toContain('提醒事项')
    expect(wrapper.text()).toContain('Nova')
    expect(wrapper.text()).toContain('Mira Lens')

    const card = wrapper.get(`[data-testid="reminder-card-phone:${phoneCue.id}"]`)
    await card.get('button').trigger('click')
    await flushUi()

    expect(calendarStore.findPhoneMissedCallCueById(phoneCue.id)?.status).toBe('confirmed')
    expect(calendarStore.findEventBySourceReminderId(phoneCue.id)?.titleEn).toBe('Call back Nova')
    wrapper.unmount()
  })

  test('filters reminders by source and handling status', async () => {
    const calendarStore = useCalendarStore()
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

    const router = createTestRouter()
    await router.push('/reminders')
    await router.isReady()

    const wrapper = mount(RemindersView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="reminders-source-filter-shopping"]').trigger('click')
    await flushUi()

    expect(wrapper.find(`[data-testid="reminder-card-shopping:${shoppingCue.id}"]`).exists()).toBe(true)
    expect(wrapper.find(`[data-testid="reminder-card-phone:${phoneCue.id}"]`).exists()).toBe(false)

    await wrapper.get('[data-testid="reminders-source-filter-all"]').trigger('click')
    await wrapper.get('[data-testid="reminders-status-filter-confirmed"]').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('当前筛选下暂无提醒')

    const remindersStore = useRemindersStore()
    remindersStore.confirmReminderByKey(`phone:${phoneCue.id}`)
    await flushUi()

    expect(wrapper.find(`[data-testid="reminder-card-phone:${phoneCue.id}"]`).exists()).toBe(true)
    expect(wrapper.find(`[data-testid="reminder-card-shopping:${shoppingCue.id}"]`).exists()).toBe(false)
    expect(wrapper.text()).toContain('已进入日历')

    await wrapper.get('[data-testid="reminders-reset-filters"]').trigger('click')
    await flushUi()

    expect(wrapper.find(`[data-testid="reminder-card-phone:${phoneCue.id}"]`).exists()).toBe(true)
    expect(wrapper.find(`[data-testid="reminder-card-shopping:${shoppingCue.id}"]`).exists()).toBe(true)
    wrapper.unmount()
  })

  test('opens source modules and Calendar boundary from Reminders', async () => {
    const calendarStore = useCalendarStore()
    calendarStore.resetForTesting()
    const phoneCue = calendarStore.upsertPhoneMissedCallCueFromCall({
      id: 'call_nova',
      contactName: 'Nova',
      startedAt: Date.now(),
    })

    const router = createTestRouter()
    await router.push({
      path: '/reminders',
      query: { from: 'home', homePage: '1' },
    })
    await router.isReady()

    const wrapper = mount(RemindersView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const card = wrapper.get(`[data-testid="reminder-card-phone:${phoneCue.id}"]`)
    const buttons = card.findAll('button')
    await buttons.find((button) => button.text().includes('打开来源') || button.text().includes('Open source')).trigger('click')
    await flushUi()
    expect(router.currentRoute.value.path).toBe('/phone')

    await router.push({
      path: '/reminders',
      query: { from: 'home', homePage: '1' },
    })
    await flushUi()
    await wrapper.get('button.bg-blue-500').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/calendar')
    expect(router.currentRoute.value.query).toMatchObject({ from: 'home', homePage: '1' })
    wrapper.unmount()
  })
})
