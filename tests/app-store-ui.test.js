import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppStoreView from '../src/views/AppStoreView.vue'
import AppearanceView from '../src/views/AppearanceView.vue'
import HomeView from '../src/views/HomeView.vue'
import LockScreen from '../src/views/LockScreen.vue'
import SettingsView from '../src/views/SettingsView.vue'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: HomeView },
      { path: '/app-store', component: AppStoreView },
      { path: '/appearance', component: AppearanceView },
      { path: '/settings', component: SettingsView },
      { path: '/chat', component: DummyView },
      { path: '/contacts', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/control-center', component: DummyView },
    ],
  })

describe('App Store entry management UI', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('Appearance owns the Home smart panel switch', async () => {
    const router = createTestRouter()
    await router.push('/appearance')
    await router.isReady()
    const systemStore = useSystemStore()

    expect(systemStore.isMoreFeatureToggleEnabled('smart_panel')).toBe(true)

    const wrapper = mount(AppearanceView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.find('[data-testid="appearance-smart-panel-toggle"]').trigger('click')

    expect(systemStore.isMoreFeatureToggleEnabled('smart_panel')).toBe(false)
    wrapper.unmount()
  })

  test('Settings owns the lock-screen focus mode switch', async () => {
    const router = createTestRouter()
    await router.push('/settings?menu=notification')
    await router.isReady()
    const systemStore = useSystemStore()

    const wrapper = mount(SettingsView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.find('[data-testid="settings-focus-mode-toggle"]').setValue(true)

    expect(systemStore.isMoreFeatureToggleEnabled('focus_mode')).toBe(true)
    wrapper.unmount()
  })

  test('focus mode still condenses lock-screen notification groups', async () => {
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
    wrapper.unmount()
  })

  test('App Store is an independent app-entry manager', async () => {
    const router = createTestRouter()
    await router.push('/app-store')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('.app-store-view').exists()).toBe(true)
    expect(wrapper.text()).toContain('App Store')
    expect(wrapper.findAll('.app-store-item').length).toBeGreaterThanOrEqual(15)
    expect(wrapper.find('[data-testid="app-store-detail"]').exists()).toBe(true)
    const appStoreItem = wrapper.find('[data-testid="app-store-item-app_store"]')
    expect(appStoreItem.exists()).toBe(true)
    expect(appStoreItem.classes()).toContain('is-state-fixed')
    expect(appStoreItem.text()).toContain('Fixed')
    expect(appStoreItem.text()).toContain('Fixed in Today View')
    expect(appStoreItem.attributes('aria-label')).toContain('Fixed')
    await appStoreItem.trigger('click')
    expect(wrapper.find('[data-testid="app-store-detail"]').text()).toContain('Today View')
    expect(wrapper.find('[data-testid="app-store-detail"]').text()).toContain('Fixed')
    expect(wrapper.find('[data-testid="app-store-item-app_control_center"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-store-item-app_files"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Experimental Toggles')

    wrapper.unmount()
  })

  test('App Store routes hidden entries into Home slot placement', async () => {
    const router = createTestRouter()
    await router.push('/app-store?homePage=2')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.find('[data-testid="app-store-item-app_control_center"]').trigger('click')
    expect(wrapper.find('[data-testid="app-store-item-app_control_center"]').classes()).toContain('is-state-library')
    expect(wrapper.find('[data-testid="app-store-item-app_control_center"]').text()).toContain('Ready for slot')
    await wrapper.find('[data-testid="app-store-add-home"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
    expect(router.currentRoute.value.query).toMatchObject({
      homePage: '2',
      widgetEdit: '1',
      libraryTile: 'app_control_center',
    })

    wrapper.unmount()
  })

  test('App Store removes visible entries from Home without disabling the app', async () => {
    const router = createTestRouter()
    await router.push('/app-store')
    await router.isReady()
    const systemStore = useSystemStore()

    expect(systemStore.settings.appearance.homeWidgetPages.flat()).toContain('app_network')

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.find('[data-testid="app-store-item-app_network"]').trigger('click')
    expect(wrapper.find('[data-testid="app-store-remove-home"]').exists()).toBe(true)
    await wrapper.find('[data-testid="app-store-remove-home"]').trigger('click')

    expect(systemStore.settings.appearance.homeWidgetPages.flat()).not.toContain('app_network')
    expect(wrapper.find('[data-testid="app-store-open"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('App Store search narrows the app-entry list without leaving stale detail', async () => {
    const router = createTestRouter()
    await router.push('/app-store')
    await router.isReady()

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.find('[data-testid="app-store-search"]').setValue('wallet')

    expect(wrapper.find('[data-testid="app-store-item-app_wallet"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-store-item-app_chat"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="app-store-detail"]').text()).toContain('钱包')

    await wrapper.find('[data-testid="app-store-search"]').setValue('no-such-app')

    expect(wrapper.find('[data-testid="app-store-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-store-detail"]').exists()).toBe(false)

    await wrapper.find('[data-testid="app-store-search-clear"]').trigger('click')

    expect(wrapper.find('[data-testid="app-store-item-app_chat"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('Home edit mode consumes App Store placement requests', async () => {
    const router = createTestRouter()
    await router.push('/home?homePage=2&widgetEdit=1&libraryTile=app_control_center')
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
    expect(wrapper.find('[data-testid="home-library-candidate-app_control_center"]').classes()).toContain('is-active')
    expect(router.currentRoute.value.query).toMatchObject({ homePage: '2' })
    expect(router.currentRoute.value.query.widgetEdit).toBeUndefined()

    wrapper.unmount()
  })
})
