import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppearanceView from '../src/views/AppearanceView.vue'
import { useGalleryStore } from '../src/stores/gallery'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/appearance', component: AppearanceView },
      { path: '/gallery', component: DummyView },
      { path: '/home', component: DummyView },
      { path: '/settings', component: DummyView },
    ],
  })

describe('AppearanceView wallpaper source picker', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('uses the shared image source picker for URL, Gallery, and theme wallpapers', async () => {
    const router = createTestRouter()
    await router.push('/appearance')
    await router.isReady()

    const systemStore = useSystemStore()
    const galleryStore = useGalleryStore()
    const imported = galleryStore.importAssetFromUrl({
      url: 'https://example.com/wallpaper/dawn.png',
      name: 'Dawn Wallpaper',
      category: 'wallpaper',
    })
    expect(imported.ok).toBe(true)

    const wrapper = mount(AppearanceView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.findAll('button').find((button) => button.text().includes('整体主题美化')).trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="appearance-wallpaper-image-source"]').setValue('url')
    await wrapper.get('[data-testid="appearance-wallpaper-image-url"]').setValue('https://example.com/wallpaper/custom.jpg')
    await wrapper.findAll('button').find((button) => button.text().includes('应用壁纸来源')).trigger('click')

    expect(systemStore.settings.appearance.wallpaperMode).toBe('url')
    expect(systemStore.settings.appearance.wallpaper).toBe('https://example.com/wallpaper/custom.jpg')

    await wrapper.get('[data-testid="appearance-wallpaper-image-source"]').setValue('gallery')
    await wrapper.get('[data-testid="appearance-wallpaper-gallery-asset"]').setValue(imported.assetId)
    await wrapper.findAll('button').find((button) => button.text().includes('应用壁纸来源')).trigger('click')

    expect(systemStore.settings.appearance.wallpaperMode).toBe('gallery')
    expect(systemStore.settings.appearance.wallpaperAssetId).toBe(imported.assetId)

    await wrapper.get('[data-testid="appearance-wallpaper-image-source"]').setValue('theme')
    await wrapper.findAll('button').find((button) => button.text().includes('应用壁纸来源')).trigger('click')

    expect(systemStore.settings.appearance.wallpaperMode).toBe('theme')
    expect(systemStore.settings.appearance.wallpaperAssetId).toBe('')

    wrapper.unmount()
  })

  test('presents the root Appearance screen as a system look control surface', async () => {
    const router = createTestRouter()
    await router.push('/appearance')
    await router.isReady()

    const wrapper = mount(AppearanceView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('.appearance-overview-card').exists()).toBe(true)
    expect(wrapper.find('.appearance-layout-card').exists()).toBe(true)
    expect(wrapper.findAll('.appearance-menu-card')).toHaveLength(2)
    expect(wrapper.find('.appearance-menu-icon.is-theme').exists()).toBe(true)
    expect(wrapper.find('.appearance-menu-icon.is-font').exists()).toBe(true)
    expect(wrapper.find('.appearance-menu-icon.is-icons').exists()).toBe(false)
    expect(wrapper.find('.appearance-menu-icon.is-widget').exists()).toBe(false)
    expect(wrapper.text()).toContain('当前外观')
    expect(wrapper.text()).toContain('桌面模板')

    wrapper.unmount()
  })

  test('describes custom fonts as a CSS font-family stack', async () => {
    const router = createTestRouter()
    await router.push('/appearance')
    await router.isReady()

    const wrapper = mount(AppearanceView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    await wrapper.findAll('.appearance-menu-card')[1].trigger('click')
    await wrapper.findAll('button').find((button) => button.text().includes('编辑自定义字体')).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('CSS font-family')

    wrapper.unmount()
  })

  test('selects a Home layout template from the Appearance root screen', async () => {
    const router = createTestRouter()
    await router.push('/appearance?from=home&homePage=1')
    await router.isReady()
    const systemStore = useSystemStore()

    const wrapper = mount(AppearanceView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="appearance-layout-screen-1"]').classes()).toContain('is-active')

    await wrapper.find('[data-testid="appearance-layout-template-layout-g"]').trigger('click')
    await flushPromises()

    expect(systemStore.settings.appearance.homeLayoutTemplateIds[1]).toBe('layout-g')
    expect(wrapper.find('[data-testid="appearance-layout-template-layout-g"]').classes()).toContain('is-active')

    await wrapper.find('[data-testid="appearance-edit-home-layout"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
    expect(router.currentRoute.value.query.widgetEdit).toBe('1')
    expect(router.currentRoute.value.query.homePage).toBe('1')

    wrapper.unmount()
  })

  test('keeps the advanced CSS sheet global-only', async () => {
    const router = createTestRouter()
    await router.push('/appearance')
    await router.isReady()

    const wrapper = mount(AppearanceView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    await wrapper.findAll('.appearance-menu-card')[0].trigger('click')
    await wrapper.get('[data-testid="appearance-open-css-editor"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="appearance-global-css-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="appearance-app-scoped-css-toggle"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="appearance-world-app-scoped-css-toggle"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="appearance-scoped-css-recovery"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('exports and imports portable appearance packs from the CSS sheet', async () => {
    const router = createTestRouter()
    await router.push('/appearance')
    await router.isReady()
    const systemStore = useSystemStore()

    const wrapper = mount(AppearanceView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    await wrapper.findAll('.appearance-menu-card')[0].trigger('click')
    await wrapper.get('[data-testid="appearance-open-css-editor"]').trigger('click')
    await flushPromises()

    systemStore.settings.appearance.customWidgets = [{ id: 'local_widget', name: 'Local' }]
    systemStore.settings.appearance.homeWidgetPages = [['local_widget'], [], [], [], []]
    systemStore.settings.appearance.chat = { bubbleStyle: 'compact' }
    systemStore.settings.appearance.customCss = '.shell { color: teal; }'
    systemStore.settings.appearance.scopedCustomCss.app = {
      enabled: true,
      target: 'contacts',
      css: '.screen { background: black; }',
    }
    systemStore.settings.appearance.appIconOverrides = {
      app_chat: {
        icon: 'fas fa-comment',
        accent: 'warm',
      },
    }

    await wrapper.get('[data-testid="appearance-pack-export"]').trigger('click')
    const exported = JSON.parse(wrapper.get('[data-testid="appearance-pack-export-output"]').element.value)

    expect(exported).toMatchObject({
      kind: 'schatphone.appearance-pack',
      appearance: {
        customCss: '.shell { color: teal; }',
      },
    })
    expect(exported.appearance.scopedCustomCss).toBeUndefined()
    expect(exported.appearance.appIconOverrides).toBeUndefined()
    expect(exported.appearance.customWidgets).toBeUndefined()
    expect(exported.appearance.homeWidgetPages).toBeUndefined()
    expect(exported.appearance.chat).toBeUndefined()

    await wrapper.get('[data-testid="appearance-pack-import-input"]').setValue(
      JSON.stringify({
        appearance: {
          currentTheme: 'zen',
          customCss: '.imported { color: green; }',
          scopedCustomCss: {
            worldApp: {
              enabled: true,
              worldPack: 'survival_city',
              worldApp: 'survival_safe_route_pass',
              css: '.map-route-card { border-color: cyan; }',
            },
          },
          appIconOverrides: {
            app_chat: {
              icon: 'fas fa-star',
              accent: 'dark',
            },
          },
        },
      }),
    )
    await wrapper.get('[data-testid="appearance-pack-import"]').trigger('click')

    expect(systemStore.settings.appearance.currentTheme).toBe('zen')
    expect(systemStore.settings.appearance.customCss).toBe('.imported { color: green; }')
    expect(systemStore.settings.appearance.scopedCustomCss.app).toMatchObject({
      enabled: true,
      target: 'contacts',
      css: '.screen { background: black; }',
    })
    expect(systemStore.settings.appearance.appIconOverrides).toMatchObject({
      app_chat: {
        icon: 'fas fa-comment',
        accent: 'warm',
      },
    })
    expect(systemStore.settings.appearance.customWidgets).toEqual([{ id: 'local_widget', name: 'Local' }])
    expect(systemStore.settings.appearance.homeWidgetPages[0]).toEqual(['local_widget'])
    expect(systemStore.settings.appearance.chat).toEqual({ bubbleStyle: 'compact' })
    expect(wrapper.get('[data-testid="appearance-pack-status"]').exists()).toBe(true)

    wrapper.unmount()
  })
})
