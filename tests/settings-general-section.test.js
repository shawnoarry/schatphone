import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import SettingsView from '../src/views/SettingsView.vue'
import { FOOD_DELIVERY_ORDER_EVENT_TYPE, useFoodDeliveryStore } from '../src/stores/foodDelivery'
import { SIMULATION_SURPRISE_MODE, useSimulationStore } from '../src/stores/simulation'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings', component: SettingsView },
      { path: '/home', component: DummyView },
      { path: '/profile', component: DummyView },
      { path: '/worldbook', component: DummyView },
      { path: '/control-center', component: DummyView },
      { path: '/network', component: DummyView },
      { path: '/chat-contacts', component: DummyView },
      { path: '/appearance', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountSettingsView = async (path = '/settings') => {
  const router = createTestRouter()
  await router.push(path)
  await router.isReady()

  const wrapper = mount(SettingsView, {
    global: {
      plugins: [router],
    },
  })

  await flushUi()
  return { wrapper, router }
}

describe('SettingsView general section', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('edits general settings through the extracted section and preserves parent save normalization', async () => {
    const store = useSystemStore()
    store.settings.system.language = 'zh-CN'
    store.settings.system.timezone = 'Asia/Shanghai'
    store.settings.system.backupReminderEnabled = true
    store.settings.system.backupReminderIntervalHours = 720
    const saveSpy = vi.spyOn(store, 'saveNow')

    const { wrapper } = await mountSettingsView('/settings?menu=general')

    await wrapper.get('[data-testid="settings-general-language"]').setValue('en-US')
    await wrapper.get('[data-testid="settings-general-timezone"]').setValue('Europe/Paris')
    await wrapper.get('[data-testid="settings-general-backup-reminder-enabled"]').setValue(false)
    await wrapper.get('[data-testid="settings-general-backup-reminder-enabled"]').setValue(true)
    await wrapper.get('[data-testid="settings-general-backup-reminder-interval"]').setValue('168')
    await wrapper.get('[data-testid="settings-general-save"]').trigger('click')
    await flushUi()

    expect(store.settings.system.language).toBe('en-US')
    expect(store.settings.system.timezone).toBe('Europe/Paris')
    expect(store.settings.system.backupReminderEnabled).toBe(true)
    expect(store.settings.system.backupReminderIntervalHours).toBe(168)
    expect(saveSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="settings-general-save"]').text()).toMatch(/已保存|Saved/)

    wrapper.unmount()
    saveSpy.mockRestore()
  })

  test('routes landing entries and opens subpages through the extracted landing section', async () => {
    const { wrapper, router } = await mountSettingsView()

    await wrapper.get('[data-testid="settings-profile-entry"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.path).toBe('/profile')
    wrapper.unmount()

    const { wrapper: menuWrapper, router: menuRouter } = await mountSettingsView()

    expect(menuWrapper.get('[data-testid="settings-beginner-tip"]').text()).toMatch(/Network|网络/)

    await menuWrapper.get('[data-settings-menu-title="General"]').trigger('click')
    await flushUi()
    expect(menuWrapper.find('[data-testid="settings-general-language"]').exists()).toBe(true)

    await menuWrapper.get('[data-testid="settings-subpage-back"]').trigger('click')
    await flushUi()
    await menuWrapper.get('[data-settings-menu-title="World Book"]').trigger('click')
    await flushUi()
    expect(menuRouter.currentRoute.value.path).toBe('/worldbook')

    menuWrapper.unmount()
  })

  test('keeps quick access routing on the extracted landing section', async () => {
    const { wrapper, router } = await mountSettingsView()

    await wrapper.get('[data-settings-quick-title="Network & API"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/network')

    wrapper.unmount()
  })

  test('updates message notifications through the notification settings subpage', async () => {
    const store = useSystemStore()
    const saveSpy = vi.spyOn(store, 'saveNow')
    const { wrapper } = await mountSettingsView('/settings?menu=notification')

    await wrapper.get('[data-testid="settings-notifications-toggle"]').setValue(false)
    await flushUi()

    expect(store.settings.system.notifications).toBe(false)
    expect(saveSpy).toHaveBeenCalledTimes(1)

    await wrapper.get('[data-testid="settings-notifications-toggle"]').setValue(true)
    await flushUi()

    expect(store.settings.system.notifications).toBe(true)
    expect(saveSpy).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    saveSpy.mockRestore()
  })

  test('normalizes invalid backup reminder interval on save', async () => {
    const store = useSystemStore()
    store.settings.system.backupReminderIntervalHours = 9999

    const { wrapper } = await mountSettingsView('/settings?menu=general')

    await wrapper.get('[data-testid="settings-general-save"]').trigger('click')
    await flushUi()

    expect(store.settings.system.backupReminderIntervalHours).toBe(720)

    wrapper.unmount()
  })

  test('uses the shared subpage header to close the general panel', async () => {
    const { wrapper } = await mountSettingsView('/settings?menu=general')

    expect(wrapper.find('[data-testid="settings-general-language"]').exists()).toBe(true)

    await wrapper.get('[data-testid="settings-subpage-back"]').trigger('click')
    await flushUi()

    expect(wrapper.find('[data-testid="settings-general-language"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('edits foreground simulation tick controls from the automation subpage without running events', async () => {
    const systemStore = useSystemStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    simulationStore.resetForTesting()

    const { wrapper } = await mountSettingsView('/settings?menu=automation')

    expect(wrapper.text()).toContain('Foreground event tick / 事件前台 Tick')
    expect(wrapper.text()).toContain('Role proactive contact candidate')

    await wrapper.get('[data-testid="settings-simulation-foreground-tick-enabled"]').setValue(true)
    await wrapper.get('[data-testid="settings-simulation-foreground-tick-interval"]').setValue('15')
    await wrapper.get('[data-testid="settings-simulation-foreground-tick-enabled"]').setValue(false)
    await wrapper.get('[data-testid="settings-simulation-foreground-tick-enabled"]').setValue(true)
    await wrapper.get('[data-testid="settings-simulation-foreground-tick-interval"]').setValue('0')
    await wrapper.get('[data-testid="settings-simulation-foreground-tick-interval"]').setValue('15')
    await wrapper.get('[data-testid="settings-simulation-foreground-tick-runtime"]').trigger('click')
    await wrapper.get('button.w-full').trigger('click')
    await flushUi()

    expect(simulationStore.settings.foregroundSessionTickEnabled).toBe(true)
    expect(simulationStore.settings.foregroundSessionTickIntervalMs).toBe(15 * 60 * 1000)
    expect(simulationStore.eventLogCount).toBe(0)
    expect(wrapper.get('[data-testid="settings-simulation-foreground-tick-runtime"]').text()).toContain(
      '15',
    )
    expect(wrapper.get('[data-testid="settings-simulation-foreground-tick-runtime"]').text()).toContain(
      'Role proactive contact candidates',
    )

    wrapper.unmount()
  })

  test('edits surprise mode and runtime module event permissions without running events', async () => {
    const systemStore = useSystemStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    simulationStore.resetForTesting()

    const { wrapper } = await mountSettingsView('/settings?menu=automation')

    expect(wrapper.get('[data-testid="settings-simulation-runtime-controls"]').text()).toContain(
      'Surprise Mode',
    )
    expect(wrapper.get('[data-testid="settings-simulation-runtime-controls"]').text()).toContain(
      'Chat role contact events',
    )
    expect(wrapper.get('[data-testid="settings-simulation-runtime-controls"]').text()).toContain(
      'Food Delivery safety events',
    )

    await wrapper.get('[data-testid="settings-simulation-surprise-mode"]').setValue(SIMULATION_SURPRISE_MODE.OFF)
    await wrapper.get('[data-testid="settings-simulation-module-events-chat"]').setValue(false)
    await wrapper.get('[data-testid="settings-simulation-module-events-food_delivery"]').setValue(false)
    await wrapper.get('[data-testid="settings-simulation-module-events-chat"]').setValue(true)
    await wrapper.get('button.w-full').trigger('click')
    await flushUi()

    expect(simulationStore.settings.surpriseMode).toBe(SIMULATION_SURPRISE_MODE.OFF)
    expect(simulationStore.isModuleEventsEnabled('chat')).toBe(true)
    expect(simulationStore.isModuleEventsEnabled('food_delivery')).toBe(false)
    expect(simulationStore.eventLogCount).toBe(0)
    expect(wrapper.get('[data-testid="settings-simulation-surprise-mode-runtime"]').text()).toContain(
      'Foreground Tick skips random and session event checks',
    )

    wrapper.unmount()
  })

  test('shows foreground tick coverage, latest result, and World Hub review path', async () => {
    const systemStore = useSystemStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    simulationStore.resetForTesting()
    simulationStore.recordEventLog({
      eventId: 'chat.social.role_greeting_request.v1',
      moduleKey: 'chat',
      targetId: 'role_main_001',
      adapterKey: 'chat.apply_social_channel_state',
      triggerSource: 'random',
      status: 'triggered',
      reason: 'eligible_non_random',
    })

    const { wrapper, router } = await mountSettingsView('/settings?menu=automation')

    expect(wrapper.get('[data-testid="settings-simulation-foreground-tick-coverage"]').text()).toContain(
      'Food Delivery safety events',
    )
    expect(wrapper.get('[data-testid="settings-simulation-foreground-tick-coverage"]').text()).toContain(
      'Role proactive contact candidate',
    )
    expect(wrapper.get('[data-testid="settings-simulation-foreground-tick-latest"]').text()).toContain(
      'Chat role greeting request',
    )

    await wrapper.get('[data-testid="settings-open-world-hub"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/control-center')

    wrapper.unmount()
  })

  test('renders the extracted about info card from the about subpage', async () => {
    const { wrapper } = await mountSettingsView('/settings?menu=about')

    expect(wrapper.get('[data-testid="settings-about-info-card"]').text()).toContain('SchatPhone')
    expect(wrapper.get('[data-testid="settings-about-info-card"]').text()).toContain('1.2.0')

    wrapper.unmount()
  })

  test('runs a manual simulation tick diagnostic from the about subpage', async () => {
    const systemStore = useSystemStore()
    const foodDeliveryStore = useFoodDeliveryStore()
    foodDeliveryStore.resetForTesting()
    const restaurant = foodDeliveryStore.upsertRestaurant({
      id: 'settings_tick_restaurant',
      name: 'Settings Tick Kitchen',
      category: 'restaurants',
      deliveryFee: '5.00',
    })
    const menuItem = foodDeliveryStore.upsertMenuItem({
      id: 'settings_tick_item',
      restaurantId: restaurant.id,
      title: 'Settings Tick Meal',
      price: '30.00',
    })
    foodDeliveryStore.addToCart(menuItem.id)
    const order = foodDeliveryStore.checkoutCart({
      deliveryAddress: 'Settings Tick Address',
    })

    const { wrapper } = await mountSettingsView('/settings?menu=about')

    await wrapper.get('[data-testid="settings-run-simulation-tick"]').trigger('click')
    await flushUi()

    expect(foodDeliveryStore.orders.find((item) => item.id === order.id)?.events[0]).toMatchObject({
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
    })
    expect(systemStore.apiReports[0]).toMatchObject({
      module: 'simulation',
      action: 'run_event_tick',
      code: 'SIMULATION_TICK_TRIGGERED',
      level: 'info',
    })
    expect(wrapper.get('[data-testid="settings-simulation-tick-card"]').text()).toContain(
      'food_delivery.random_order_pilot.v1',
    )
    expect(wrapper.get('[data-testid="settings-simulation-event-log-card"]').text()).toContain(
      '外卖 ETA 更新',
    )
    expect(wrapper.get('[data-testid="settings-simulation-event-log-card"]').text()).toContain(
      '已触发',
    )
    expect(wrapper.findAll('[data-testid="settings-simulation-event-log-item"]').length).toBeGreaterThan(0)

    wrapper.unmount()
  })
})
