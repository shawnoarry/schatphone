import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppStoreView from '../src/views/AppStoreView.vue'
import AppearanceView from '../src/views/AppearanceView.vue'
import HomeView from '../src/views/HomeView.vue'
import LockScreen from '../src/views/LockScreen.vue'
import SettingsView from '../src/views/SettingsView.vue'
import { buildWorldAppHomeTileId } from '../src/lib/world-pack-app-bindings'
import { useGalleryStore } from '../src/stores/gallery'
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
      { path: '/book', component: DummyView },
      { path: '/shopping', component: DummyView },
      { path: '/food-delivery', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/calendar', component: DummyView },
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
    expect(wrapper.find('[data-testid="app-store-item-app_book"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-store-item-app_book"]').text()).toContain('Book')
    expect(wrapper.find('[data-testid="app-store-item-app_book"]').text()).toContain('Ready for slot')
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

  test('App Store saves a built-in icon preset from the app detail identity sheet', async () => {
    const router = createTestRouter()
    await router.push('/app-store')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, { global: { plugins: [router] } })

    await wrapper.get('[data-testid="app-store-item-app_chat"]').trigger('click')
    await wrapper.get('[data-testid="app-store-open-identity"]').trigger('click')
    await wrapper.get('[data-testid="app-store-identity-icon-preset"]').setValue('fas fa-paper-plane')
    await wrapper.get('[data-testid="app-store-identity-accent"]').setValue('dark')
    await wrapper.get('[data-testid="app-store-identity-save"]').trigger('click')
    await flushPromises()

    expect(systemStore.settings.appearance.appIconOverrides.app_chat).toMatchObject({
      sourceType: 'preset',
      icon: 'fas fa-paper-plane',
      accent: 'dark',
    })

    wrapper.unmount()
  })

  test('App Store saves a Gallery image icon and Home renders the same image icon', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const galleryStore = useGalleryStore()
    galleryStore.resetForTesting()
    const imported = galleryStore.importAssetFromUrl({
      url: 'https://example.com/icon-gallery.png',
      name: 'Gallery Icon',
      category: 'reference',
    })
    expect(imported.ok).toBe(true)

    await router.push('/app-store')
    await router.isReady()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, { global: { plugins: [router] } })
    await wrapper.get('[data-testid="app-store-item-app_gallery"]').trigger('click')
    await wrapper.get('[data-testid="app-store-open-identity"]').trigger('click')
    await wrapper.get('[data-testid="app-store-identity-source-gallery"]').trigger('click')
    await wrapper.get('[data-testid="app-store-identity-gallery-asset"]').setValue(imported.assetId)
    await wrapper.get('[data-testid="app-store-identity-save"]').trigger('click')
    await flushPromises()

    expect(systemStore.settings.appearance.appIconOverrides.app_gallery).toMatchObject({
      sourceType: 'gallery',
      galleryAssetId: imported.assetId,
    })

    wrapper.unmount()

    await router.push('/home')
    await router.isReady()
    const homeWrapper = mount(HomeView, {
      props: { currentDate: 'Jan 1', currentTime: '09:00' },
      global: { plugins: [router] },
    })
    await flushPromises()

    expect(homeWrapper.get('[data-testid="home-app-icon-app_gallery"] img').attributes('src')).toBe(
      'https://example.com/icon-gallery.png',
    )
    homeWrapper.unmount()
  })

  test('App Store uploads a local image into Gallery and uses it as the selected app icon', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const galleryStore = useGalleryStore()
    galleryStore.resetForTesting()
    await router.push('/app-store')
    await router.isReady()

    const wrapper = mount(AppStoreView, { global: { plugins: [router] } })
    await wrapper.get('[data-testid="app-store-item-app_map"]').trigger('click')
    await wrapper.get('[data-testid="app-store-open-identity"]').trigger('click')

    const file = new File(['icon'], 'map-icon.png', { type: 'image/png' })
    const input = wrapper.get('[data-testid="app-store-identity-upload-input"]')
    Object.defineProperty(input.element, 'files', {
      value: [file],
      configurable: true,
    })
    await input.trigger('change')
    await flushPromises()
    await wrapper.get('[data-testid="app-store-identity-save"]').trigger('click')
    await flushPromises()

    const saved = systemStore.settings.appearance.appIconOverrides.app_map
    expect(saved.sourceType).toBe('gallery')
    expect(saved.galleryAssetId).toBeTruthy()
    expect(galleryStore.findAssetById(saved.galleryAssetId)?.name).toBe('map-icon.png')

    wrapper.unmount()
  })

  test('App Store restores the selected app default icon', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.setAppIconOverride('app_chat', {
      icon: 'fas fa-paper-plane',
      accent: 'dark',
    })
    await router.push('/app-store')
    await router.isReady()

    const wrapper = mount(AppStoreView, { global: { plugins: [router] } })
    await wrapper.get('[data-testid="app-store-item-app_chat"]').trigger('click')
    await wrapper.get('[data-testid="app-store-open-identity"]').trigger('click')
    await wrapper.get('[data-testid="app-store-identity-restore"]').trigger('click')
    await flushPromises()

    expect(systemStore.settings.appearance.appIconOverrides.app_chat).toBeUndefined()
    wrapper.unmount()
  })

  test('App Store exposes active World Pack app entries for launch and Home placement', async () => {
    const router = createTestRouter()
    await router.push('/app-store?homePage=3')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    expect(systemStore.activateWorldPack('survival_city').ok).toBe(true)

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    const worldAppId = 'world_app_survival_city_survival_supply_board'
    const worldAppItem = wrapper.find(`[data-testid="app-store-item-${worldAppId}"]`)
    expect(worldAppItem.exists()).toBe(true)
    expect(worldAppItem.text()).toContain('World')

    await worldAppItem.trigger('click')
    expect(wrapper.find('[data-testid="app-store-detail"]').text()).toContain('World App')
    const worldMeta = wrapper.get('[data-testid="app-store-world-app-meta"]').text()
    expect(worldMeta).toContain('Post-disaster survival city')
    expect(worldMeta).toContain('Shopping')
    expect(worldMeta).toContain('survival_supply_board')

    await wrapper.find('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query).toMatchObject({
      worldPack: 'survival_city',
      worldApp: 'survival_supply_board',
      from: 'home',
      homePage: '3',
    })

    wrapper.unmount()
  })

  test('App Store opens directly to the World Apps section from WorldBook handoff', async () => {
    const router = createTestRouter()
    await router.push('/app-store?section=world&from=worldbook')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    expect(systemStore.activateWorldPack('survival_city').ok).toBe(true)

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.get('[data-testid="app-store-filter-World"]').classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="app-store-item-world_app_survival_city_survival_supply_board"]').exists()).toBe(
      true,
    )
    expect(wrapper.find('[data-testid="app-store-item-app_chat"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="app-store-detail"]').text()).toContain('World App')

    wrapper.unmount()
  })

  test('App Store routes active World Pack app entries into Home library placement', async () => {
    const router = createTestRouter()
    await router.push('/app-store?homePage=4')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    expect(systemStore.activateWorldPack('survival_city').ok).toBe(true)

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    const worldAppId = 'world_app_survival_city_survival_supply_board'
    await wrapper.find(`[data-testid="app-store-item-${worldAppId}"]`).trigger('click')
    await wrapper.find('[data-testid="app-store-add-home"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
    expect(router.currentRoute.value.query).toMatchObject({
      homePage: '4',
      widgetEdit: '1',
      libraryTile: worldAppId,
    })

    wrapper.unmount()
  })

  test('App Store only exposes nonstandard template entries after confirmation', async () => {
    const router = createTestRouter()
    await router.push('/app-store?homePage=1')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const review = systemStore.buildWorldAppTemplateExtractionReview(
      {
        proposals: [
          { templateId: 'transit_pass', title: 'Metro Pass', confidence: 'medium' },
          { templateId: 'made_up_console', title: 'Made Up Console', confidence: 'high' },
        ],
      },
      'default_world',
    )

    const worldAppId = buildWorldAppHomeTileId({
      packId: 'default_world',
      bindingId: review.confirmableProposals[0].bindingId,
    })

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find(`[data-testid="app-store-item-${worldAppId}"]`).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Made Up Console')

    const confirmed = systemStore.confirmWorldAppTemplateProposal(
      review.confirmableProposals[0],
      'default_world',
    )
    expect(confirmed.ok).toBe(true)
    await flushPromises()

    const worldAppItem = wrapper.find(`[data-testid="app-store-item-${worldAppId}"]`)
    expect(worldAppItem.exists()).toBe(true)
    expect(worldAppItem.text()).toContain('Metro Pass')
    expect(worldAppItem.text()).toContain('World')
    expect(wrapper.text()).not.toContain('Made Up Console')

    await worldAppItem.trigger('click')
    expect(wrapper.find('[data-testid="app-store-detail"]').text()).toContain('World App')
    const worldMeta = wrapper.get('[data-testid="app-store-world-app-meta"]').text()
    expect(worldMeta).toContain('Default world')
    expect(worldMeta).toContain('Map')
    expect(worldMeta).toContain(confirmed.binding.id)

    await wrapper.find('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/map')
    expect(router.currentRoute.value.query).toMatchObject({
      worldPack: 'default_world',
      worldApp: confirmed.binding.id,
      from: 'home',
      homePage: '1',
    })

    wrapper.unmount()
  })

  test('App Store opens confirmed reservation template entries into Calendar', async () => {
    const router = createTestRouter()
    await router.push('/app-store?homePage=1')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const confirmed = systemStore.confirmWorldAppTemplateProposal(
      {
        templateId: 'reservation_board',
        title: 'Ritual Calendar',
        confidence: 'high',
      },
      'default_world',
    )
    expect(confirmed.ok).toBe(true)
    const worldAppId = buildWorldAppHomeTileId({
      packId: 'default_world',
      bindingId: confirmed.binding.id,
    })

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    const worldAppItem = wrapper.get(`[data-testid="app-store-item-${worldAppId}"]`)
    expect(worldAppItem.text()).toContain('Ritual Calendar')
    expect(worldAppItem.text()).toContain('World')

    await worldAppItem.trigger('click')
    const worldMeta = wrapper.get('[data-testid="app-store-world-app-meta"]').text()
    expect(worldMeta).toContain('Default world')
    expect(worldMeta).toContain('Calendar')
    expect(worldMeta).toContain(confirmed.binding.id)

    await wrapper.find('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/calendar')
    expect(router.currentRoute.value.query).toMatchObject({
      worldPack: 'default_world',
      worldApp: confirmed.binding.id,
      from: 'home',
      homePage: '1',
    })

    wrapper.unmount()
  })

  test('App Store opens confirmed dispatch template entries into Food Delivery', async () => {
    const router = createTestRouter()
    await router.push('/app-store?homePage=1')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const confirmed = systemStore.confirmWorldAppTemplateProposal(
      {
        templateId: 'dispatch_board',
        title: 'Rescue Desk',
        confidence: 'high',
      },
      'default_world',
    )
    expect(confirmed.ok).toBe(true)
    const worldAppId = buildWorldAppHomeTileId({
      packId: 'default_world',
      bindingId: confirmed.binding.id,
    })

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    const worldAppItem = wrapper.get(`[data-testid="app-store-item-${worldAppId}"]`)
    expect(worldAppItem.text()).toContain('Rescue Desk')
    expect(worldAppItem.text()).toContain('World')

    await worldAppItem.trigger('click')
    const worldMeta = wrapper.get('[data-testid="app-store-world-app-meta"]').text()
    expect(worldMeta).toContain('Default world')
    expect(worldMeta).toContain('Food Delivery')
    expect(worldMeta).toContain(confirmed.binding.id)

    await wrapper.find('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/food-delivery')
    expect(router.currentRoute.value.query).toMatchObject({
      worldPack: 'default_world',
      worldApp: confirmed.binding.id,
      from: 'home',
      homePage: '1',
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
