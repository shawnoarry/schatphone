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
})
