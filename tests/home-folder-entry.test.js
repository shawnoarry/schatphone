import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '../src/views/HomeView.vue'
import ShoppingView from '../src/views/ShoppingView.vue'
import FoodDeliveryView from '../src/views/FoodDeliveryView.vue'
import AssetsView from '../src/views/AssetsView.vue'
import ControlCenterView from '../src/views/ControlCenterView.vue'
import { CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP } from '../src/lib/custom-widget-actions'
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

  test('shows neutral Home layout templates in edit mode and saves the current page choice', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=2')
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
    await flushPromises()

    expect(wrapper.find('.home-template-picker').exists()).toBe(true)
    expect(wrapper.findAll('.home-template-card')).toHaveLength(6)
    expect(wrapper.findAll('.home-template-preview-slot').length).toBeGreaterThan(0)
    expect(wrapper.find('.home-template-slot small').text()).toMatch(/x/)
    expect(wrapper.find('[data-home-tile-id="app_reminders"]').attributes('data-home-slot-id')).toBeTruthy()

    await wrapper.findAll('.home-template-card')[4].trigger('click')

    expect(store.settings.appearance.homeLayoutTemplateIds[2]).toBe('layout-e')
    expect(wrapper.findAll('.home-template-card')[4].classes()).toContain('is-active')
    wrapper.unmount()
  })

  test('adds available content from an empty template slot in edit mode', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=4')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])
    store.setHomeLayoutTemplate(4, 'layout-b')

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    expect(wrapper.find('.home-slot-content-sheet').exists()).toBe(false)

    await wrapper.find('[data-testid="home-empty-slot-4-b-large"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-slot-content-sheet').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-slot-candidate-app_gallery"]').exists()).toBe(true)

    await wrapper.find('[data-testid="home-slot-candidate-app_gallery"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeWidgetPages[4]).toContain('app_gallery')
    expect(store.settings.appearance.homeLayoutSlotPlacements[4]).toContainEqual({
      slotId: 'b-large',
      tileId: 'app_gallery',
    })
    expect(wrapper.find('[data-home-tile-id="app_gallery"]').exists()).toBe(true)
    expect(wrapper.find('.home-slot-content-sheet').exists()).toBe(false)
    wrapper.unmount()
  })

  test('restores unplaced content through the edit-mode Home library', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=4')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])
    store.setHomeLayoutTemplate(4, 'layout-b')

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    const galleryCandidate = wrapper.find('[data-testid="home-library-candidate-app_gallery"]')
    expect(galleryCandidate.exists()).toBe(true)

    await galleryCandidate.trigger('click')
    await wrapper.vm.$nextTick()

    expect(galleryCandidate.classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="home-empty-slot-4-b-large"]').classes()).toContain('is-compatible')

    await wrapper.find('[data-testid="home-empty-slot-4-b-large"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeWidgetPages[4]).toContain('app_gallery')
    expect(store.settings.appearance.homeLayoutSlotPlacements[4]).toContainEqual({
      slotId: 'b-large',
      tileId: 'app_gallery',
    })
    expect(wrapper.find('[data-testid="home-library-candidate-app_gallery"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('changes and clears content from a filled template slot in edit mode', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=4')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], ['app_gallery']])
    store.setHomeLayoutTemplate(4, 'layout-b')

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })
    await flushPromises()
    vi.advanceTimersByTime(500)

    await wrapper.find('[data-home-tile-id="app_gallery"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-slot-content-sheet').exists()).toBe(true)
    expect(wrapper.find('.home-slot-content-head').text()).toContain('相册')
    expect(wrapper.find('[data-testid="home-slot-candidate-app_network"]').exists()).toBe(true)

    await wrapper.find('[data-testid="home-slot-candidate-app_network"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeWidgetPages[4]).toContain('app_network')
    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_gallery')
    expect(store.settings.appearance.homeLayoutSlotPlacements[4]).toContainEqual({
      slotId: 'b-small-1',
      tileId: 'app_network',
    })

    vi.advanceTimersByTime(500)
    await wrapper.find('[data-home-tile-id="app_network"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.home-slot-clear-btn').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeWidgetPages.flat()).not.toContain('app_network')
    expect(store.settings.appearance.homeLayoutSlotPlacements[4]).not.toContainEqual({
      slotId: 'b-small-1',
      tileId: 'app_network',
    })
    expect(wrapper.find('[data-home-tile-id="app_network"]').exists()).toBe(false)
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

  test('opens configured custom widget actions from the current formal Home page', async () => {
    const router = createTestRouter()
    await router.push('/home?homePage=2')
    await router.isReady()
    const store = useSystemStore()
    const widgetId = store.addCustomWidget({
      name: 'Chat Shortcut',
      size: '2x2',
      code: '<div>Chat</div>',
      action: { type: CUSTOM_WIDGET_ACTION_TYPE_OPEN_APP, target: 'app_chat' },
      pageIndex: 2,
    })
    store.setHomeLayoutTemplate(2, 'layout-e')
    store.setHomeLayoutSlotPlacement(2, 'e-top-left', widgetId)

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    const actionButton = wrapper.find(`[data-testid="home-custom-widget-action-${widgetId}"]`)
    expect(actionButton.exists()).toBe(true)

    await actionButton.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/chat')
    expect(router.currentRoute.value.query.from).toBe('home')
    expect(router.currentRoute.value.query.homePage).toBe('2')
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
    expect(flattened).not.toContain('app_reminders')
    expect(flattened).not.toContain('app_food_delivery')
    expect(flattened).toContain('app_assets')
  })
})
