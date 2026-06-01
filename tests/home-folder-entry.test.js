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
import { buildWorldAppHomeTileId } from '../src/lib/world-pack-app-bindings'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: HomeView },
      { path: '/shopping', component: ShoppingView },
      { path: '/food-delivery', component: FoodDeliveryView },
      { path: '/map', component: DummyView },
      { path: '/assets', component: AssetsView },
      { path: '/reminders', component: DummyView },
      { path: '/control-center', component: ControlCenterView },
      { path: '/chat', component: DummyView },
      { path: '/contacts', component: DummyView },
      { path: '/settings', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/widgets', component: DummyView },
      { path: '/app-store', component: DummyView },
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
    expect(wrapper.find('[data-home-tile-id="weather"] .home-widget-card').classes()).toContain('is-weather')
    expect(wrapper.find('[data-home-tile-id="calendar"] .home-widget-card').classes()).toContain('is-calendar')
    expect(wrapper.find('[data-home-tile-id="music"] .home-widget-card').classes()).toContain('is-music')
    expect(wrapper.find('[data-home-tile-id="quick_heart"] .home-widget-quick').attributes('type')).toBe('button')
    expect(wrapper.find('[data-home-tile-id="quick_heart"] .home-widget-quick').attributes('aria-label')).toBeTruthy()
    expect(wrapper.find('[data-home-tile-id="quick_disc"] .home-widget-quick').attributes('type')).toBe('button')
    expect(wrapper.find('[data-home-tile-id="quick_disc"] .home-widget-quick').attributes('aria-label')).toBeTruthy()
    expect(wrapper.text()).toContain('购物')
    expect(wrapper.text()).toContain('提醒事项')
    expect(wrapper.text()).toContain('资产')
    wrapper.unmount()
  })

  test('shows the World Hub app after App Store places it on Home', async () => {
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

    store.setHomeWidgetPages([
      [],
      ['app_control_center'],
      [],
      [],
      [],
    ])
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-home-tile-id="app_control_center"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('世界中枢')
    wrapper.unmount()
  })

  test('keeps the -1 Today View separate from editable Home pages', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()
    useSystemStore().settings.system.language = 'en-US'

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
    expect(wrapper.find('[data-testid="home-left-shortcut-app-store"]').classes()).toContain('is-installed')
    expect(wrapper.find('[data-testid="home-left-shortcut-app-store"]').classes()).toContain('is-fixed')
    expect(wrapper.find('[data-testid="home-left-shortcut-world-hub"]').classes()).toContain('is-locked')
    expect(wrapper.find('[data-testid="home-left-shortcut-cheats"]').classes()).toContain('is-locked')
    expect(wrapper.findAll('[data-testid^="home-left-slot-reserved-"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="home-left-page"] [data-home-grid-page]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="home-left-page"]').text()).toContain('Fixed Entries')
    expect(wrapper.find('[data-testid="home-left-page"]').text()).toContain('1x1 Slots')
    expect(wrapper.find('[data-testid="home-left-page"]').text()).not.toContain('Apps to Install')
    expect(wrapper.find('[data-testid="home-left-page"]').text()).not.toContain('More Labs')
    wrapper.unmount()
  })

  test('keeps App Store reachable from the -1 fixed slots when Home pages are empty', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    store.setHomeWidgetPages([[], [], [], [], []])

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })

    const shortcut = wrapper.find('[data-testid="home-left-shortcut-app-store"]')
    expect(shortcut.exists()).toBe(true)
    expect(shortcut.classes()).toContain('is-installed')
    expect(shortcut.text()).toContain('App Store')
    expect(wrapper.find('[data-testid="home-left-page"] [data-home-grid-page]').exists()).toBe(false)

    await shortcut.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/app-store')
    expect(router.currentRoute.value.query).toMatchObject({
      from: 'home',
      homePage: '0',
    })
    wrapper.unmount()
  })

  test('Home library can place and launch a confirmed nonstandard world app entry', async () => {
    const router = createTestRouter()
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    store.setHomeWidgetPages([[], [], [], [], []])
    store.setHomeLayoutTemplate(2, 'layout-b')

    const confirmed = store.confirmWorldAppTemplateProposal(
      {
        templateId: 'transit_pass',
        title: 'Metro Pass',
        confidence: 'medium',
      },
      'default_world',
    )
    expect(confirmed.ok).toBe(true)
    const worldAppId = buildWorldAppHomeTileId({
      packId: 'default_world',
      bindingId: confirmed.binding.id,
    })

    await router.push({
      path: '/home',
      query: {
        homePage: '2',
        widgetEdit: '1',
        libraryTile: worldAppId,
      },
    })
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
    await flushPromises()

    const candidate = wrapper.get(`[data-testid="home-library-candidate-${worldAppId}"]`)
    expect(candidate.classes()).toContain('is-active')
    expect(candidate.text()).toContain('Metro Pass')

    await wrapper.get('[data-testid="home-empty-slot-2-b-small-1"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeWidgetPages[2]).toContain(worldAppId)
    expect(wrapper.get(`[data-home-tile-id="${worldAppId}"]`).text()).toContain('Metro Pass')

    await wrapper.find('[data-testid="home-library-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find(`[data-testid="home-library-candidate-${worldAppId}"]`).exists()).toBe(false)

    await wrapper.get('[data-testid="home-edit-done"]').trigger('click')
    vi.advanceTimersByTime(450)
    await wrapper.vm.$nextTick()
    await wrapper.get(`[data-home-tile-id="${worldAppId}"] .home-app-tile`).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/map')
    expect(router.currentRoute.value.query).toMatchObject({
      worldPack: 'default_world',
      worldApp: confirmed.binding.id,
      from: 'home',
      homePage: '2',
    })

    wrapper.unmount()
  })

  test('shows neutral Home layout templates in edit mode and saves the current page choice', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=1')
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

    expect(wrapper.find('.home-template-picker').exists()).toBe(false)
    expect(wrapper.find('[data-testid="home-template-toggle"]').exists()).toBe(true)

    await wrapper.find('[data-testid="home-template-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-template-picker').exists()).toBe(true)
    expect(wrapper.findAll('.home-template-card')).toHaveLength(7)
    expect(wrapper.findAll('.home-template-preview-slot').length).toBeGreaterThan(0)
    expect(wrapper.find('.home-template-slot small').text()).toMatch(/x/)
    expect(wrapper.find('[data-home-grid-page="1"] [data-home-tile-id="app_phone"]').attributes('data-home-slot-id')).toBeTruthy()
    expect(wrapper.find('[data-home-grid-page="1"] [data-home-tile-id="app_phone"]').attributes('data-home-slot-size')).toBe('1x1')
    expect(wrapper.find('[data-home-grid-page="1"] [data-home-tile-id="app_reminders"]').attributes('data-home-slot-size')).toBe('1x1')

    await wrapper.findAll('.home-template-card')[4].trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeLayoutTemplateIds[1]).toBe('layout-e')
    expect(wrapper.find('.home-template-picker').exists()).toBe(false)
    expect(wrapper.find('[data-home-grid-page="1"] [data-home-tile-id="app_phone"]').exists()).toBe(false)

    await wrapper.find('[data-testid="home-library-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="home-library-candidate-app_phone"]').exists()).toBe(true)

    await wrapper.find('[data-testid="home-library-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-testid="home-template-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.home-template-card')[4].classes()).toContain('is-active')
    wrapper.unmount()
  })

  test('switches Home pages from page dots while staying in edit mode', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=1')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])

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

    expect(wrapper.find('.home-edit-topbar').exists()).toBe(true)
    expect(wrapper.get('[data-testid="home-page-dot-1"]').classes()).toContain('is-active')

    await wrapper.get('[data-testid="home-page-dot-3"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-edit-topbar').exists()).toBe(true)
    expect(wrapper.get('[data-testid="home-page-dot-3"]').classes()).toContain('is-active')
    expect(wrapper.get('[data-testid="home-page-dot-1"]').classes()).not.toContain('is-active')

    wrapper.unmount()
  })

  test('swipes between Home pages while staying in edit mode', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=1')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])

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

    const shell = wrapper.get('.home-shell')
    await shell.trigger('touchstart', {
      changedTouches: [{ clientX: 300, clientY: 520 }],
      target: shell.element,
    })
    await shell.trigger('touchmove', {
      changedTouches: [{ clientX: 220, clientY: 520 }],
      target: shell.element,
    })
    await shell.trigger('touchend')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-edit-topbar').exists()).toBe(true)
    expect(wrapper.get('[data-testid="home-page-dot-2"]').classes()).toContain('is-active')

    wrapper.unmount()
  })

  test('places a library item after switching pages in Home edit mode', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=1&libraryTile=app_gallery')
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

    expect(wrapper.find('[data-testid="home-library-candidate-app_gallery"]').classes()).toContain('is-active')

    await wrapper.get('[data-testid="home-page-dot-4"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-testid="home-empty-slot-4-b-small-1"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeWidgetPages[4]).toContain('app_gallery')
    expect(store.settings.appearance.homeLayoutSlotPlacements[4]).toContainEqual({
      slotId: 'b-small-1',
      tileId: 'app_gallery',
    })
    expect(wrapper.find('[data-home-tile-id="app_gallery"]').exists()).toBe(true)

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

    await wrapper.find('[data-testid="home-empty-slot-4-b-small-1"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-slot-content-sheet').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-slot-candidate-app_gallery"]').exists()).toBe(true)

    await wrapper.find('[data-testid="home-slot-candidate-app_gallery"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeWidgetPages[4]).toContain('app_gallery')
    expect(store.settings.appearance.homeLayoutSlotPlacements[4]).toContainEqual({
      slotId: 'b-small-1',
      tileId: 'app_gallery',
    })
    expect(wrapper.find('[data-home-tile-id="app_gallery"]').exists()).toBe(true)
    expect(wrapper.find('.home-slot-content-sheet').exists()).toBe(false)
    wrapper.unmount()
  })

  test('long-presses Dock Widgets into Home slot edit mode without opening Widget Center', async () => {
    const router = createTestRouter()
    await router.push('/home?homePage=3')
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
    await flushPromises()

    const dockWidgets = wrapper.find('[data-testid="home-dock-widgets"]')
    expect(dockWidgets.exists()).toBe(true)

    await dockWidgets.trigger('pointerdown', { clientX: 240, clientY: 720, pointerId: 1 })
    vi.advanceTimersByTime(650)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-edit-topbar').exists()).toBe(true)
    expect(wrapper.find('.home-template-picker').exists()).toBe(false)

    await dockWidgets.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
    expect(router.currentRoute.value.query.homePage).toBe('3')
    wrapper.unmount()
  })

  test('filters slot replacement candidates by exact slot size', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=4')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])
    store.setHomeLayoutTemplate(4, 'layout-b')
    const posterWidgetId = store.addCustomWidget({
      name: 'Poster Widget',
      size: '4x3',
      code: '<div>Poster</div>',
      placeOnHome: false,
    })

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

    await wrapper.find('[data-testid="home-empty-slot-4-b-large"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-slot-content-sheet').exists()).toBe(true)
    expect(wrapper.find(`[data-testid="home-slot-candidate-${posterWidgetId}"]`).exists()).toBe(true)
    expect(wrapper.find(`[data-testid="home-slot-candidate-${posterWidgetId}"]`).classes()).toContain('is-widget-like')
    expect(wrapper.find(`[data-testid="home-slot-candidate-${posterWidgetId}"] iframe`).attributes('srcdoc')).toContain('Poster')
    expect(wrapper.find('[data-testid="home-slot-candidate-app_gallery"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="home-slot-candidate-weather"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('shows visual built-in widget previews when choosing Home slot content', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=4')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])
    store.setHomeLayoutTemplate(4, 'layout-e')

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

    await wrapper.find('[data-testid="home-empty-slot-4-e-top-left"]').trigger('click')
    await wrapper.vm.$nextTick()

    const weatherCandidate = wrapper.find('[data-testid="home-slot-candidate-weather"]')
    expect(weatherCandidate.exists()).toBe(true)
    expect(weatherCandidate.classes()).toContain('is-widget-like')
    expect(weatherCandidate.find('.home-slot-content-preview.is-weather').exists()).toBe(true)
    expect(weatherCandidate.find('.home-slot-preview-widget.is-weather').text()).toContain('18°')

    wrapper.unmount()
  })

  test('shows the full compatible app library when changing a slot', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=4')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])
    store.setHomeLayoutTemplate(4, 'layout-b')
    store.setHomeLayoutSlotPlacement(4, 'b-small-1', 'app_gallery')
    store.setHomeLayoutSlotPlacement(4, 'b-small-2', 'app_network')

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
    expect(wrapper.find('[data-testid="home-slot-candidate-app_network"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-slot-candidate-app_chat"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-slot-candidate-music"]').exists()).toBe(false)

    await wrapper.find('[data-testid="home-slot-candidate-app_network"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeLayoutSlotPlacements[4]).toContainEqual({
      slotId: 'b-small-1',
      tileId: 'app_network',
    })
    expect(store.settings.appearance.homeLayoutSlotPlacements[4]).not.toContainEqual({
      slotId: 'b-small-2',
      tileId: 'app_network',
    })
    wrapper.unmount()
  })

  test('moves unmatched entries to recovery after switching to a smaller app-slot template', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=4')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])
    store.setHomeLayoutTemplate(4, 'layout-b')
    const pageAppIds = [
      'app_gallery',
      'app_network',
      'app_wallet',
      'app_themes',
      'app_phone',
      'app_map',
      'app_calendar',
      'app_stock',
    ]
    pageAppIds.forEach((tileId, index) => {
      store.setHomeLayoutSlotPlacement(4, `b-small-${index + 1}`, tileId)
    })

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

    await wrapper.find('[data-testid="home-template-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.findAll('.home-template-card')[3].trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeLayoutTemplateIds[4]).toBe('layout-d')
    expect(wrapper.find('[data-home-grid-page="4"] [data-home-tile-id="app_gallery"]').exists()).toBe(false)
    expect(wrapper.find('[data-home-grid-page="4"] [data-home-tile-id="app_network"]').exists()).toBe(false)

    await wrapper.find('[data-testid="home-library-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="home-library-candidate-app_gallery"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-library-candidate-app_network"]').exists()).toBe(true)
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

    expect(wrapper.find('.home-content-library').exists()).toBe(false)
    await wrapper.find('[data-testid="home-library-toggle"]').trigger('click')
    await wrapper.vm.$nextTick()

    const galleryCandidate = wrapper.find('[data-testid="home-library-candidate-app_gallery"]')
    expect(galleryCandidate.exists()).toBe(true)

    await galleryCandidate.trigger('click')
    await wrapper.vm.$nextTick()

    expect(galleryCandidate.classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="home-empty-slot-4-b-small-1"]').classes()).toContain('is-compatible')

    await wrapper.find('[data-testid="home-empty-slot-4-b-small-1"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeWidgetPages[4]).toContain('app_gallery')
    expect(store.settings.appearance.homeLayoutSlotPlacements[4]).toContainEqual({
      slotId: 'b-small-1',
      tileId: 'app_gallery',
    })
    expect(wrapper.find('[data-testid="home-library-candidate-app_gallery"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('opens the Home library without preselecting content', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=4')
    await router.isReady()
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
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

    const recoveryCue = wrapper.find('[data-testid="home-recovery-cue"]')
    expect(recoveryCue.exists()).toBe(true)
    expect(recoveryCue.text()).toContain('Library')
    expect(recoveryCue.text()).toContain('in library')

    await wrapper.find('[data-testid="home-recovery-open"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-content-library').exists()).toBe(true)
    expect(wrapper.find('.home-content-library-hint').exists()).toBe(true)
    expect(wrapper.find('.home-content-library-hint').text()).toContain('Items are waiting in the library')
    expect(wrapper.find('[data-testid="home-library-candidate-app_gallery"]').classes()).not.toContain('is-active')
    expect(wrapper.find('[data-testid="home-empty-slot-4-b-small-1"]').classes()).toContain('is-awaiting-selection')
    expect(wrapper.find('[data-testid="home-empty-slot-4-b-small-1"]').classes()).not.toContain('is-compatible')

    await wrapper.find('[data-testid="home-library-candidate-app_gallery"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-content-library-hint').text()).toContain('Fits 1x1 slots')
    expect(wrapper.find('[data-testid="home-empty-slot-4-b-small-1"]').classes()).toContain('is-compatible')

    await wrapper.find('[data-testid="home-library-candidate-app_gallery"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('[data-testid="home-empty-slot-4-b-small-1"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.home-slot-content-sheet').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-slot-candidate-app_gallery"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('only shows viable content-type filters for the selected slot size', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=4')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeWidgetPages([[], [], [], [], []])
    store.setHomeLayoutTemplate(4, 'layout-b')
    const posterWidgetId = store.addCustomWidget({
      name: 'Poster Widget',
      size: '4x3',
      code: '<div>Poster</div>',
      placeOnHome: false,
    })

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

    await wrapper.find('[data-testid="home-empty-slot-4-b-large"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="home-slot-filter-all"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-slot-filter-custom"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-slot-filter-apps"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="home-slot-filter-folders"]').exists()).toBe(false)
    expect(wrapper.find(`[data-testid="home-slot-candidate-${posterWidgetId}"]`).exists()).toBe(true)
    wrapper.unmount()
  })

  test('changes and clears content from a filled template slot in edit mode', async () => {
    const router = createTestRouter()
    await router.push('/home?widgetEdit=1&homePage=4')
    await router.isReady()
    const store = useSystemStore()
    store.setHomeLayoutTemplate(4, 'layout-b')
    store.setHomeLayoutSlotPlacement(4, 'b-small-1', 'app_gallery')

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

  test('shows locked feedback for unavailable -1 shortcuts', async () => {
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
    store.setHomeWidgetPages([
      [],
      [],
      ['app_control_center'],
      [],
      [],
    ])

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

  test('Home library places and opens active World Pack app entries', async () => {
    const router = createTestRouter()
    const worldAppId = 'world_app_survival_city_survival_supply_board'
    await router.push(`/home?widgetEdit=1&homePage=4&libraryTile=${worldAppId}`)
    await router.isReady()
    const store = useSystemStore()
    store.settings.system.language = 'en-US'
    expect(store.activateWorldPack('survival_city').ok).toBe(true)
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

    const libraryCandidate = wrapper.find(`[data-testid="home-library-candidate-${worldAppId}"]`)
    expect(libraryCandidate.exists()).toBe(true)
    expect(libraryCandidate.classes()).toContain('is-active')

    await wrapper.find('[data-testid="home-empty-slot-4-b-small-1"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.settings.appearance.homeWidgetPages[4]).toContain(worldAppId)
    expect(store.settings.appearance.homeLayoutSlotPlacements[4]).toContainEqual({
      slotId: 'b-small-1',
      tileId: worldAppId,
    })
    expect(wrapper.find(`[data-home-tile-id="${worldAppId}"]`).exists()).toBe(true)

    await wrapper.find('.home-edit-btn.is-primary').trigger('click')
    vi.advanceTimersByTime(250)
    await wrapper.vm.$nextTick()
    await wrapper.find(`[data-home-tile-id="${worldAppId}"] .home-app-tile`).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query).toMatchObject({
      worldPack: 'survival_city',
      worldApp: 'survival_supply_board',
      from: 'home',
      homePage: '4',
    })

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
