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
    expect(wrapper.findAll('.appearance-menu-card')).toHaveLength(4)
    expect(wrapper.text()).toContain('当前外观')
    expect(wrapper.text()).toContain('桌面模板')
    expect(wrapper.text()).toContain('Widget 中心')

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
})
