import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '../src/views/HomeView.vue'
import ShoppingView from '../src/views/ShoppingView.vue'
import FoodDeliveryView from '../src/views/FoodDeliveryView.vue'
import AssetsView from '../src/views/AssetsView.vue'
import ControlCenterView from '../src/views/ControlCenterView.vue'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: HomeView },
      { path: '/shopping', component: ShoppingView },
      { path: '/food-delivery', component: FoodDeliveryView },
      { path: '/assets', component: AssetsView },
      { path: '/reminders', component: DummyView },
      { path: '/control-center', component: ControlCenterView },
      { path: '/chat', component: DummyView },
      { path: '/contacts', component: DummyView },
      { path: '/settings', component: DummyView },
      { path: '/gallery', component: DummyView },
    ],
  })

describe('Home folder entries', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('renders Reminders, Shopping, Food Delivery, and Assets on Home', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('[data-home-tile-id="app_shopping"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-folder-app_shopping"]').exists()).toBe(true)
    expect(wrapper.find('[data-home-tile-id="app_food_delivery"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-folder-app_food_delivery"]').exists()).toBe(true)
    expect(wrapper.find('[data-home-tile-id="app_assets"]').exists()).toBe(true)
    expect(wrapper.find('[data-home-tile-id="app_reminders"]').exists()).toBe(true)
    expect(wrapper.find('[data-home-tile-id="app_control_center"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('购物')
    expect(wrapper.text()).toContain('提醒事项')
    expect(wrapper.text()).toContain('资产')
    wrapper.unmount()
  })

  test('shows the optional World Hub app only after the runtime control toggle is enabled', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()
    const store = useSystemStore()

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })

    await wrapper.findAll('.home-dot')[1].trigger('click')
    expect(wrapper.find('[data-home-tile-id="app_control_center"]').exists()).toBe(false)

    store.setMoreFeatureToggle('control_center', true)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-home-tile-id="app_control_center"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('世界中枢')
    wrapper.unmount()
  })

  test('keeps the -1 Today View separate from editable Home pages', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('[data-testid="home-left-page"]').exists()).toBe(true)
    expect(wrapper.findAll('.home-dot')).toHaveLength(5)
    expect(wrapper.find('[data-testid="home-left-utility-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-left-shortcut-world-hub"]').classes()).toContain('is-locked')
    expect(wrapper.find('[data-testid="home-left-shortcut-cheats"]').classes()).toContain('is-locked')
    expect(wrapper.find('[data-testid="home-left-page"] [data-home-grid-page]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('shows App not installed feedback for locked -1 shortcuts', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })

    await wrapper.find('[data-testid="home-left-shortcut-world-hub"]').trigger('click')

    expect(wrapper.find('.home-layout-toast').exists()).toBe(true)
    expect(router.currentRoute.value.path).toBe('/home')
    wrapper.unmount()
  })

  test('lights the -1 World Hub shortcut after install and opens the runtime route', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()
    const store = useSystemStore()
    store.setMoreFeatureToggle('control_center', true)

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })

    const shortcut = wrapper.find('[data-testid="home-left-shortcut-world-hub"]')
    expect(shortcut.classes()).toContain('is-installed')

    await shortcut.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/control-center')
    expect(router.currentRoute.value.query.from).toBe('home')
    expect(router.currentRoute.value.query.homePage).toBe('0')
    wrapper.unmount()
  })

  test('opens Food Delivery folder and routes child entries with category query', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })

    await wrapper.findAll('.home-dot')[1].trigger('click')
    await wrapper.find('[data-testid="home-folder-app_food_delivery"]').trigger('click')
    expect(wrapper.find('[data-testid="home-folder-overlay"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-folder-entry-nearby"]').exists()).toBe(true)

    await wrapper.find('[data-testid="home-folder-entry-nearby"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/food-delivery')
    expect(router.currentRoute.value.query.category).toBe('nearby')
    expect(router.currentRoute.value.query.from).toBe('home')
    expect(router.currentRoute.value.query.homePage).toBe('1')
    wrapper.unmount()
  })

  test('opens Shopping folder and routes platform app entries with service and category query', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })

    await wrapper.findAll('.home-dot')[1].trigger('click')
    await wrapper.find('[data-testid="home-folder-app_shopping"]').trigger('click')
    expect(wrapper.find('[data-testid="home-folder-overlay"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-folder-entry-style_cloud"]').exists()).toBe(true)

    await wrapper.find('[data-testid="home-folder-entry-style_cloud"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query.service).toBe('style_cloud')
    expect(router.currentRoute.value.query.category).toBe('fashion')
    expect(router.currentRoute.value.query.from).toBe('home')
    expect(router.currentRoute.value.query.homePage).toBe('1')
    wrapper.unmount()
  })

  test('preserves planned module tiles while Files remains hidden from restored layout', () => {
    const store = useSystemStore()

    store.setHomeWidgetPages([
      ['app_files', 'app_shopping'],
      ['app_assets', 'app_chat'],
    ])

    const flattened = store.settings.appearance.homeWidgetPages.flat()
    expect(flattened).not.toContain('app_files')
    expect(flattened).toContain('app_shopping')
    expect(flattened).toContain('app_reminders')
    expect(flattened).toContain('app_food_delivery')
    expect(flattened).toContain('app_assets')
  })
})
