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

  test('Settings exposes a Software Update confirmation flow', async () => {
    const router = createTestRouter()
    await router.push('/settings')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(SettingsView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="settings-software-update-entry"]').trigger('click')

    expect(wrapper.get('[data-testid="settings-software-update-section"]').text()).toContain(
      'Software Update',
    )
    expect(wrapper.get('[data-testid="settings-software-update-status"]').text()).toContain(
      'Not checked',
    )

    await wrapper.get('[data-testid="settings-software-update-check"]').trigger('click')
    await flushPromises()

    expect(systemStore.settings.system.softwareUpdate.status).toBe('available')
    expect(wrapper.get('[data-testid="settings-software-update-install"]').exists()).toBe(true)

    await wrapper.get('[data-testid="settings-software-update-install"]').trigger('click')
    await flushPromises()

    expect(systemStore.settings.system.softwareUpdate.restartRequired).toBe(true)
    expect(systemStore.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'system_software_update',
          route: '/settings?menu=software-update',
        }),
      ]),
    )
    expect(wrapper.get('[data-testid="settings-software-update-restart"]').exists()).toBe(true)
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

  test('lock screen can clear one notification without opening its route', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.lockPhone()
    const olderId = systemStore.addNotification({
      title: 'Backup reminder',
      content: 'Export a backup soon.',
      route: '/settings',
      source: 'system_backup_reminder',
      createdAt: Date.now() - 1000,
    })
    const latestId = systemStore.addNotification({
      title: 'Update ready',
      content: 'Restart to finish.',
      route: '/settings?menu=software-update',
      source: 'system_software_update',
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

    await wrapper.get(`[data-testid="lock-notification-dismiss-${latestId}"]`).trigger('click')

    expect(systemStore.notifications.map((note) => note.id)).toEqual([olderId])
    expect(systemStore.isLocked).toBe(true)
    expect(router.currentRoute.value.path).toBe('/home')
    wrapper.unmount()
  })

  test('lock screen can clear all notifications', async () => {
    const router = createTestRouter()
    await router.push('/home')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.addNotification({
      title: 'Backup reminder',
      content: 'Export a backup soon.',
      source: 'system_backup_reminder',
      createdAt: Date.now() - 1000,
    })
    systemStore.addNotification({
      title: 'Update ready',
      content: 'Restart to finish.',
      source: 'system_software_update',
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

    await wrapper.get('[data-testid="lock-notifications-clear-all"]').trigger('click')
    await flushPromises()

    expect(systemStore.notifications).toEqual([])
    expect(wrapper.text()).toContain('No new notifications')
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

  test('App Store saves a custom display name without changing the runtime route', async () => {
    const router = createTestRouter()
    await router.push('/app-store')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, { global: { plugins: [router] } })

    await wrapper.get('[data-testid="app-store-item-app_chat"]').trigger('click')
    expect(wrapper.get('[data-testid="app-store-entry-display"]').text()).toContain('Not set')

    await wrapper.get('[data-testid="app-store-open-identity"]').trigger('click')
    await wrapper.get('[data-testid="app-store-identity-display-name"]').setValue('Pocket Messages')
    await wrapper.get('[data-testid="app-store-identity-save"]').trigger('click')
    await flushPromises()

    expect(systemStore.settings.appearance.appIconOverrides.app_chat).toMatchObject({
      sourceType: 'preset',
      displayName: 'Pocket Messages',
    })
    expect(wrapper.get('[data-testid="app-store-item-app_chat"]').text()).toContain('Pocket Messages')
    expect(wrapper.get('[data-testid="app-store-entry-display"]').text()).toContain('Chat')
    expect(wrapper.get('[data-testid="app-store-entry-info"]').text()).toContain('/chat')

    await wrapper.get('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/chat')

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

  test('App Store saves an app skin for one app without affecting another app', async () => {
    const router = createTestRouter()
    await router.push('/app-store')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, { global: { plugins: [router] } })

    await wrapper.get('[data-testid="app-store-item-app_food_delivery"]').trigger('click')
    await wrapper.get('[data-testid="app-store-open-skin"]').trigger('click')
    await wrapper.get('[data-testid="app-store-skin-preset"]').setValue('market_fresh')
    await wrapper.get('[data-testid="app-store-skin-css-enabled"]').setValue(true)
    await wrapper.get('[data-testid="app-store-skin-css-input"]').setValue('.store-card { border-radius: 18px; }')
    await wrapper.get('[data-testid="app-store-skin-save"]').trigger('click')
    await flushPromises()

    expect(systemStore.settings.appearance.appSkins.food_delivery).toMatchObject({
      presetId: 'market_fresh',
      customCssEnabled: true,
      customCss: '.store-card { border-radius: 18px; }',
    })
    expect(systemStore.settings.appearance.appSkins.shopping).toBeUndefined()

    wrapper.unmount()
  })

  test('App Store keeps Chat deep appearance owned by Chat settings', async () => {
    const router = createTestRouter()
    await router.push('/app-store')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, { global: { plugins: [router] } })

    await wrapper.get('[data-testid="app-store-item-app_chat"]').trigger('click')

    expect(wrapper.find('[data-testid="app-store-open-skin"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="app-store-open-identity"]').exists()).toBe(true)

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
    const handoff = wrapper.get('[data-testid="app-store-world-handoff"]').text()
    expect(handoff).toContain('World entry from Post-disaster survival city')
    expect(handoff).toContain('Opens Shopping with this World Pack context')
    expect(handoff).toContain('App Store manages placement and launch')
    expect(handoff).toContain('WorldBook still owns pack activation')
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

  test('App Store exposes app entries from multiple enabled compatible expansion packs', async () => {
    const router = createTestRouter()
    await router.push('/app-store?section=world')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    expect(systemStore.enableWorldPack('school_life').ok).toBe(true)
    expect(systemStore.enableWorldPack('business_family').ok).toBe(true)

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    const schoolAppId = 'world_app_school_life_school_schedule_board'
    const businessAppId = 'world_app_business_family_business_board_calendar'

    expect(wrapper.find(`[data-testid="app-store-item-${schoolAppId}"]`).exists()).toBe(true)
    expect(wrapper.find(`[data-testid="app-store-item-${businessAppId}"]`).exists()).toBe(true)

    await wrapper.get(`[data-testid="app-store-item-${schoolAppId}"]`).trigger('click')
    expect(wrapper.get('[data-testid="app-store-world-app-meta"]').text()).toContain('School life expansion')
    expect(wrapper.get('[data-testid="app-store-world-app-meta"]').text()).toContain('Calendar')

    await wrapper.find('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/calendar')
    expect(router.currentRoute.value.query).toMatchObject({
      worldPack: 'school_life',
      worldApp: 'school_schedule_board',
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

    expect(wrapper.get('[data-testid="app-store-filter-world"]').classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="app-store-item-world_app_survival_city_survival_supply_board"]').exists()).toBe(
      true,
    )
    expect(wrapper.find('[data-testid="app-store-item-app_chat"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="app-store-detail"]').text()).toContain('World App')

    wrapper.unmount()
  })

  test('App Store classifies Food Delivery restaurants as shop entries without Home placement', async () => {
    const router = createTestRouter()
    await router.push('/app-store?section=shops&homePage=2')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.get('[data-testid="app-store-filter-shop"]').classes()).toContain('is-active')
    expect(wrapper.find('[data-testid="app-store-shop-controls"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="app-store-shop-controls"]').text()).toContain('mini app entries')
    expect(wrapper.find('[data-testid="app-store-item-shop_app_food_seed_moon_bistro"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-store-item-shop_app_shopping_daily_fresh"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-store-item-app_chat"]').exists()).toBe(false)

    await wrapper.get('[data-testid="app-store-item-shop_app_shopping_daily_fresh"]').trigger('click')
    expect(wrapper.get('[data-testid="app-store-detail"]').text()).toContain('Folder mini app')
    expect(wrapper.get('[data-testid="app-store-entry-boundary"]').text()).toContain('Shopping owns products')
    expect(wrapper.get('[data-testid="app-store-shop-app-meta"]').text()).toContain('Shopping')
    expect(wrapper.find('[data-testid="app-store-add-home"]').exists()).toBe(false)

    await wrapper.get('[data-testid="app-store-item-shop_app_food_seed_moon_bistro"]').trigger('click')

    expect(wrapper.get('[data-testid="app-store-detail"]').text()).toContain('Folder mini app')
    expect(wrapper.get('[data-testid="app-store-entry-boundary"]').text()).toContain('Food Delivery owns restaurants')
    expect(wrapper.get('[data-testid="app-store-entry-info"]').text()).toContain('Food Delivery')
    expect(wrapper.get('[data-testid="app-store-shop-app-meta"]').text()).toContain('Fusion dinner')
    expect(wrapper.find('[data-testid="app-store-add-home"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="app-store-shop-app-meta"]').text()).toContain('Installed')
    expect(wrapper.get('[data-testid="app-store-shop-folder-toggle"]').text()).toContain('Remove from folder')
    expect(wrapper.find('[data-testid="app-store-open-identity"]').exists()).toBe(true)

    await wrapper.get('[data-testid="app-store-shop-folder-toggle"]').trigger('click')
    await flushPromises()
    expect(systemStore.settings.appearance.appStoreMiniAppPlacements.hiddenEntryIds).toEqual([
      'shop_app_food_seed_moon_bistro',
    ])
    expect(wrapper.get('[data-testid="app-store-shop-app-meta"]').text()).toContain('Not installed')
    expect(wrapper.get('[data-testid="app-store-shop-folder-toggle"]').text()).toContain('Add to folder')

    await wrapper.get('[data-testid="app-store-shop-folder-toggle"]').trigger('click')
    await flushPromises()
    expect(systemStore.settings.appearance.appStoreMiniAppPlacements.hiddenEntryIds).toEqual([])

    await wrapper.get('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/food-delivery')
    expect(router.currentRoute.value.query).toMatchObject({
      restaurantId: 'food_seed_moon_bistro',
      category: 'restaurants',
      from: 'home',
      homePage: '2',
    })

    wrapper.unmount()
  })

  test('App Store opens Shopping-bound shop entries into Shopping without owning commerce state', async () => {
    const router = createTestRouter()
    await router.push('/app-store?section=shops&homePage=2')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="app-store-item-shop_app_shopping_daily_fresh"]').trigger('click')

    expect(wrapper.get('[data-testid="app-store-entry-boundary"]').text()).toContain('Shopping owns products')
    expect(wrapper.get('[data-testid="app-store-entry-info"]').text()).toContain('Shopping')
    expect(wrapper.get('[data-testid="app-store-shop-app-meta"]').text()).toContain('daily_fresh')

    await wrapper.get('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query).toMatchObject({
      service: 'daily_fresh',
      category: 'grocery',
      entry: 'shop',
      shopEntryId: 'shop_app_shopping_daily_fresh',
      from: 'home',
      homePage: '2',
    })

    wrapper.unmount()
  })

  test('App Store hands off new shop entry creation to the selected business owner', async () => {
    const router = createTestRouter()
    await router.push('/app-store?section=shops&homePage=2')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="app-store-shop-create"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="app-store-shop-create-sheet"]').text()).toContain('Add folder mini app')
    expect(wrapper.get('[data-testid="app-store-shop-create-target"]').element.value).toBe('food_delivery')
    expect(wrapper.get('[data-testid="app-store-shop-create-boundary"]').text()).toContain('Food Delivery owns')

    await wrapper.get('[data-testid="app-store-shop-create-open-target"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/food-delivery')
    expect(router.currentRoute.value.query).toMatchObject({
      createShop: '1',
      entry: 'shop',
      bindingTarget: 'food_delivery',
      source: 'app_store',
      category: 'restaurants',
      from: 'home',
      homePage: '2',
    })

    await router.push('/app-store?section=shops&homePage=2')
    await flushPromises()
    await wrapper.get('[data-testid="app-store-shop-create"]').trigger('click')
    await wrapper.get('[data-testid="app-store-shop-create-target"]').setValue('shopping')
    await flushPromises()

    expect(wrapper.get('[data-testid="app-store-shop-create-boundary"]').text()).toContain('Shopping owns')

    await wrapper.get('[data-testid="app-store-shop-create-open-target"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query).toMatchObject({
      createShop: '1',
      entry: 'shop',
      bindingTarget: 'shopping',
      source: 'app_store',
      category: 'mall',
      from: 'home',
      homePage: '2',
    })

    wrapper.unmount()
  })

  test('App Store saves shop entry identity without changing Food Delivery ownership', async () => {
    const router = createTestRouter()
    await router.push('/app-store?section=shops&homePage=2')
    await router.isReady()
    const systemStore = useSystemStore()
    const galleryStore = useGalleryStore()
    systemStore.settings.system.language = 'en-US'
    galleryStore.resetForTesting()
    const importedCover = galleryStore.importAssetFromUrl({
      url: 'https://example.com/moon-shop-cover.png',
      name: 'Moon Shop Cover',
      category: 'reference',
    })
    expect(importedCover.ok).toBe(true)

    const wrapper = mount(AppStoreView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="app-store-item-shop_app_food_seed_moon_bistro"]').trigger('click')
    await wrapper.get('[data-testid="app-store-open-identity"]').trigger('click')
    const bindingTargetSelect = wrapper.get('[data-testid="app-store-identity-shop-binding-target"]')
    expect(bindingTargetSelect.element.value).toBe('food_delivery')
    expect(bindingTargetSelect.element.disabled).toBe(true)
    await wrapper.get('[data-testid="app-store-identity-display-name"]').setValue('Moon Kitchen')
    await wrapper.get('[data-testid="app-store-identity-icon-preset"]').setValue('fas fa-bowl-food')
    await wrapper.get('[data-testid="app-store-identity-accent"]').setValue('dark')
    await wrapper.get('[data-testid="app-store-identity-shop-description"]').setValue('Late night comfort menu')
    await wrapper.get('[data-testid="app-store-identity-shop-tags"]').setValue('late night, comfort, date')
    await wrapper.get('[data-testid="app-store-identity-shop-template"]').setValue('dessert_window')
    await wrapper.get('[data-testid="app-store-identity-shop-cover"]').setValue(importedCover.assetId)
    await flushPromises()
    expect(wrapper.get('[data-testid="app-store-identity-shop-cover-preview"] img').attributes('src')).toBe(
      'https://example.com/moon-shop-cover.png',
    )
    await wrapper.get('[data-testid="app-store-identity-save"]').trigger('click')
    await flushPromises()

    expect(systemStore.settings.appearance.entryPresentationOverrides.shop_app_food_seed_moon_bistro).toMatchObject({
      sourceType: 'preset',
      displayName: 'Moon Kitchen',
      icon: 'fas fa-bowl-food',
      accent: 'dark',
      shortDescription: 'Late night comfort menu',
      tags: ['late night', 'comfort', 'date'],
      templateId: 'dessert_window',
      bindingTarget: 'food_delivery',
      coverGalleryAssetId: importedCover.assetId,
    })
    expect(systemStore.settings.appearance.appIconOverrides.shop_app_food_seed_moon_bistro).toBeUndefined()
    expect(wrapper.get('[data-testid="app-store-item-shop_app_food_seed_moon_bistro"]').text()).toContain('Moon Kitchen')
    expect(wrapper.get('[data-testid="app-store-item-shop_app_food_seed_moon_bistro"]').text()).toContain('Late night comfort menu')
    expect(wrapper.get('[data-testid="app-store-entry-display"]').text()).toContain('Dessert window')
    expect(wrapper.get('[data-testid="app-store-entry-display"]').text()).toContain('Set')
    expect(wrapper.get('[data-testid="app-store-entry-display"]').text()).toContain('late night · comfort · date')
    expect(wrapper.get('[data-testid="app-store-entry-info"]').text()).toContain('shop_app_food_seed_moon_bistro')
    expect(wrapper.get('[data-testid="app-store-entry-boundary"]').text()).toContain('Food Delivery owns restaurants')
    expect(wrapper.get('[data-testid="app-store-shop-cover"] img').attributes('src')).toBe(
      'https://example.com/moon-shop-cover.png',
    )

    await wrapper.get('[data-testid="app-store-open"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/food-delivery')
    expect(router.currentRoute.value.query).toMatchObject({
      restaurantId: 'food_seed_moon_bistro',
      category: 'restaurants',
      from: 'home',
      homePage: '2',
    })

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
