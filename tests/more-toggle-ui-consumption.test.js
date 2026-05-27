import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '../src/views/HomeView.vue'
import LockScreen from '../src/views/LockScreen.vue'
import MoreView from '../src/views/MoreView.vue'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: HomeView },
      { path: '/more', component: MoreView },
      { path: '/chat', component: DummyView },
      { path: '/contacts', component: DummyView },
      { path: '/settings', component: DummyView },
      { path: '/gallery', component: DummyView },
    ],
  })

describe('More toggle UI consumption', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('smart_panel controls the Home read-only smart panel', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()
    const systemStore = useSystemStore()

    const wrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('[data-testid="home-smart-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-home-tile-id="app_files"]').exists()).toBe(false)

    systemStore.setMoreFeatureToggle('smart_panel', false)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="home-smart-panel"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('focus_mode condenses lock-screen notification groups', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.setMoreFeatureToggle('focus_mode', true)
    systemStore.addNotification({
      id: 'chat_note_1',
      title: 'Chat one',
      content: 'First message',
      route: '/chat',
      source: 'chat',
      createdAt: Date.now() - 1000,
    })
    systemStore.addNotification({
      id: 'chat_note_2',
      title: 'Chat two',
      content: 'Second message',
      route: '/chat',
      source: 'chat',
      createdAt: Date.now(),
    })

    const wrapper = mount(LockScreen, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('[data-testid="lock-focus-mode-chip"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Chat two')
    expect(wrapper.text()).not.toContain('Chat one')
    expect(wrapper.text()).toContain('已收起 1 条')
    wrapper.unmount()
  })

  test('scene_switch controls the More scene preview surface', async () => {
    const router = createTestRouter()
    await router.push('/more')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.setMoreFeatureToggle('scene_switch', false)

    const wrapper = mount(MoreView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('[data-testid="more-scene-switch-preview"]').exists()).toBe(false)
    wrapper.unmount()

    systemStore.setMoreFeatureToggle('scene_switch', true)
    const enabledWrapper = mount(MoreView, {
      global: {
        plugins: [router],
      },
    })

    expect(enabledWrapper.find('[data-testid="more-scene-switch-preview"]').exists()).toBe(true)
    expect(enabledWrapper.text()).toContain('场景切换预览')
    enabledWrapper.unmount()
  })

  test('control_center toggle controls the optional World Hub Home entry', async () => {
    const router = createTestRouter()
    await router.push('/more')
    await router.isReady()
    const systemStore = useSystemStore()

    const moreWrapper = mount(MoreView, {
      global: {
        plugins: [router],
      },
    })

    expect(moreWrapper.text()).toContain('世界中枢')
    expect(systemStore.settings.appearance.homeWidgetPages.flat()).not.toContain('app_control_center')

    await moreWrapper.find('[data-testid="more-feature-toggle-control_center"]').trigger('click')

    expect(systemStore.isMoreFeatureToggleEnabled('control_center')).toBe(true)
    expect(systemStore.settings.appearance.homeWidgetPages.flat()).toContain('app_control_center')
    moreWrapper.unmount()
  })

  test('Files remains hidden from user-facing Home and More entries', async () => {
    const router = createTestRouter()
    await router.push('/more')
    await router.isReady()
    const systemStore = useSystemStore()

    systemStore.setHomeWidgetPages([
      ['app_files', 'app_chat'],
      ['app_more'],
    ])

    const homeWrapper = mount(HomeView, {
      props: {
        currentDate: 'Jan 1',
        currentTime: '09:00',
      },
      global: {
        plugins: [router],
      },
    })

    expect(homeWrapper.find('[data-home-tile-id="app_files"]').exists()).toBe(false)
    expect(homeWrapper.find('[data-home-tile-id="app_chat"]').exists()).toBe(true)
    homeWrapper.unmount()

    const moreWrapper = mount(MoreView, {
      global: {
        plugins: [router],
      },
    })

    expect(moreWrapper.find('[data-testid="more-quick-entry-files"]').exists()).toBe(false)
    expect(moreWrapper.find('[data-testid="more-quick-entry-network"]').exists()).toBe(true)
    moreWrapper.unmount()
  })

  test('More presents the App Library as the primary system entry manager', async () => {
    const router = createTestRouter()
    await router.push('/more')
    await router.isReady()

    const wrapper = mount(MoreView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.text()).toContain('应用库')
    expect(wrapper.text()).toContain('管理主屏入口')
    expect(wrapper.findAll('.more-app-library-item').length).toBeGreaterThanOrEqual(10)
    expect(wrapper.find('.more-view').exists()).toBe(true)
    expect(wrapper.find('.more-panel').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('后续扩展建议')
    expect(wrapper.text()).not.toContain('Experimental Toggles')
    expect(wrapper.find('[data-testid="more-app-library-detail"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="more-app-library-add-home"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('App Library routes hidden entries into Home slot placement', async () => {
    const router = createTestRouter()
    await router.push('/more?homePage=2')
    await router.isReady()

    const wrapper = mount(MoreView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.find('[data-testid="more-app-library-item-app_chat"]').trigger('click')
    await wrapper.find('[data-testid="more-app-library-add-home"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
    expect(router.currentRoute.value.query).toMatchObject({
      homePage: '2',
      widgetEdit: '1',
      libraryTile: 'app_chat',
    })

    wrapper.unmount()
  })

  test('App Library removes visible entries from Home without disabling the app', async () => {
    const router = createTestRouter()
    await router.push('/more')
    await router.isReady()
    const systemStore = useSystemStore()

    expect(systemStore.settings.appearance.homeWidgetPages.flat()).toContain('app_network')

    const wrapper = mount(MoreView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.find('[data-testid="more-app-library-item-app_network"]').trigger('click')
    expect(wrapper.find('[data-testid="more-app-library-remove-home"]').exists()).toBe(true)
    await wrapper.find('[data-testid="more-app-library-remove-home"]').trigger('click')

    expect(systemStore.settings.appearance.homeWidgetPages.flat()).not.toContain('app_network')
    expect(wrapper.find('[data-testid="more-app-library-open"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('Home edit mode consumes App Library placement requests', async () => {
    const router = createTestRouter()
    await router.push('/home?homePage=2&widgetEdit=1&libraryTile=app_chat')
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

    expect(wrapper.find('.home-content-library').exists()).toBe(true)
    expect(wrapper.find('[data-testid="home-library-candidate-app_chat"]').classes()).toContain('is-active')
    expect(router.currentRoute.value.query).toMatchObject({ homePage: '2' })
    expect(router.currentRoute.value.query.widgetEdit).toBeUndefined()

    wrapper.unmount()
  })
})
