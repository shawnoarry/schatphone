import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '../src/views/HomeView.vue'
import ShoppingView from '../src/views/ShoppingView.vue'
import FoodDeliveryView from '../src/views/FoodDeliveryView.vue'
import AssetsView from '../src/views/AssetsView.vue'
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

  test('renders Shopping and Food Delivery as folder tiles and Assets as a normal app tile', async () => {
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
    expect(wrapper.text()).toContain('购物')
    expect(wrapper.text()).toContain('资产')
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

    await wrapper.find('[data-testid="home-folder-app_food_delivery"]').trigger('click')
    expect(wrapper.find('[data-testid="home-folder-overlay"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-folder-entry-nearby"]').exists()).toBe(true)

    await wrapper.find('[data-testid="home-folder-entry-nearby"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/food-delivery')
    expect(router.currentRoute.value.query.category).toBe('nearby')
    wrapper.unmount()
  })

  test('opens Shopping folder and routes child entries with category query', async () => {
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

    await wrapper.find('[data-testid="home-folder-app_shopping"]').trigger('click')
    expect(wrapper.find('[data-testid="home-folder-overlay"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-folder-entry-fashion"]').exists()).toBe(true)

    await wrapper.find('[data-testid="home-folder-entry-fashion"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query.category).toBe('fashion')
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
    expect(flattened).toContain('app_food_delivery')
    expect(flattened).toContain('app_assets')
  })
})
