import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppearanceView from '../src/views/AppearanceView.vue'
import {
  appearanceColorModeToLegacyThemeId,
  normalizeAppearanceColorMode,
  normalizeAppearanceStyleKitId,
  normalizeSystemAppearanceThemeId,
  resolveAppearanceStyleKitStatus,
  resolveSystemAppearanceThemeMeta,
  resolveSystemAppearanceThemeWallpaper,
} from '../src/lib/system-appearance-theme'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/appearance', component: AppearanceView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
    ],
  })

describe('system appearance style foundation', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('normalizes the new color-mode axis while preserving legacy theme ids', () => {
    expect(normalizeAppearanceColorMode('default')).toBe('day')
    expect(normalizeAppearanceColorMode('zen')).toBe('night')
    expect(normalizeAppearanceColorMode('y2k')).toBe('day')
    expect(appearanceColorModeToLegacyThemeId('night')).toBe('zen')
    expect(resolveSystemAppearanceThemeMeta('unknown').id).toBe('classic')
    expect(resolveSystemAppearanceThemeMeta('cloud-pastel').labelEn).toBe('Cloud Pastel')
    expect(normalizeSystemAppearanceThemeId('liquid-prism')).toBe('chromatic-glass')
    expect(normalizeAppearanceStyleKitId('liquid-prism')).toBe('chromatic-glass')
    expect(resolveSystemAppearanceThemeMeta('liquid-prism').labelEn).toBe('Chromatic Glass')
    expect(resolveSystemAppearanceThemeMeta('chromatic-glass').labelEn).toBe('Chromatic Glass')
    expect(resolveSystemAppearanceThemeWallpaper('cloud-pastel', 'day')).toContain(
      'cloud-pastel-day-v1.webp',
    )
    expect(resolveSystemAppearanceThemeWallpaper('cloud-pastel', 'night')).toContain(
      'cloud-pastel-night-v1.webp',
    )
  })

  test('keeps color mode, system theme, and system app icons independent', () => {
    const store = useSystemStore()

    store.setAppearanceColorMode('night')
    expect(store.settings.appearance.colorMode).toBe('night')
    expect(store.settings.appearance.currentTheme).toBe('zen')
    expect(store.settings.appearance.systemTheme).toBe('classic')
    expect(store.settings.appearance.systemAppIconTheme).toBe('classic')

    store.setSystemAppIconTheme('soft-rounded')
    expect(store.settings.appearance.colorMode).toBe('night')
    expect(store.settings.appearance.systemTheme).toBe('classic')
    expect(store.settings.appearance.systemAppIconTheme).toBe('soft-rounded')

    expect(resolveAppearanceStyleKitStatus(store.settings.appearance)).toMatchObject({
      kit: { id: 'system-classic' },
      customized: true,
    })
  })

  test('applies a style kit without replacing a personal wallpaper by default', () => {
    const store = useSystemStore()
    store.setAppearanceColorMode('night')
    store.setSystemAppIconTheme('soft-rounded')
    store.setAppearanceWallpaperUrl('https://example.com/personal.jpg')

    const status = store.applyAppearanceStyleKit('system-classic')

    expect(store.settings.appearance.colorMode).toBe('night')
    expect(store.settings.appearance.currentTheme).toBe('zen')
    expect(store.settings.appearance.systemTheme).toBe('classic')
    expect(store.settings.appearance.systemAppIconTheme).toBe('classic')
    expect(store.settings.appearance.wallpaperMode).toBe('url')
    expect(store.settings.appearance.wallpaper).toBe('https://example.com/personal.jpg')
    expect(status).toMatchObject({ customized: true })
  })

  test('applies Cloud Pastel as a matching interface and animal icon kit', () => {
    const store = useSystemStore()
    store.setAppearanceColorMode('night')
    store.setAppearanceWallpaperUrl('https://example.com/personal.jpg')

    const status = store.applyAppearanceStyleKit('cloud-pastel')

    expect(store.settings.appearance.colorMode).toBe('night')
    expect(store.settings.appearance.systemTheme).toBe('cloud-pastel')
    expect(store.settings.appearance.systemAppIconTheme).toBe('cloud-pastel-animals')
    expect(store.settings.appearance.wallpaperMode).toBe('url')
    expect(store.settings.appearance.wallpaper).toBe('https://example.com/personal.jpg')
    expect(status).toMatchObject({
      kit: { id: 'cloud-pastel' },
      customized: true,
    })

    const completeStatus = store.applyAppearanceStyleKit('cloud-pastel', {
      applyWallpaper: true,
    })
    expect(store.settings.appearance.wallpaperMode).toBe('theme')
    expect(store.settings.appearance.wallpaper).toContain('cloud-pastel-night-v1.webp')
    expect(completeStatus).toMatchObject({
      kit: { id: 'cloud-pastel' },
      customized: false,
    })
  })

  test('migrates the retired Liquid Prism kit into the combined Chromatic Glass kit', () => {
    const store = useSystemStore()
    const status = store.applyAppearanceStyleKit('liquid-prism', {
      applyWallpaper: true,
    })

    expect(store.settings.appearance.systemTheme).toBe('chromatic-glass')
    expect(store.settings.appearance.systemAppIconTheme).toBe('chromatic-glass')
    expect(store.settings.appearance.wallpaperMode).toBe('theme')
    expect(status).toMatchObject({
      kit: {
        id: 'chromatic-glass',
        companionWidgetCollectionId: 'liquid-prism',
      },
      customized: false,
    })
  })

  test('applies Chromatic Glass as a pastel edge-light interface with line icons', () => {
    const store = useSystemStore()
    const status = store.applyAppearanceStyleKit('chromatic-glass', {
      applyWallpaper: true,
    })

    expect(store.settings.appearance.systemTheme).toBe('chromatic-glass')
    expect(store.settings.appearance.systemAppIconTheme).toBe('chromatic-glass')
    expect(store.settings.appearance.wallpaperMode).toBe('theme')
    expect(status).toMatchObject({
      kit: {
        id: 'chromatic-glass',
        companionWidgetCollectionId: 'liquid-prism',
      },
      customized: false,
    })
  })

  test('switches Cloud Pastel wallpaper variants only while following the theme', () => {
    const store = useSystemStore()

    store.setSystemAppearanceTheme('cloud-pastel')
    expect(store.settings.appearance.systemTheme).toBe('cloud-pastel')
    expect(store.settings.appearance.wallpaper).toContain('cloud-pastel-day-v1.webp')

    store.setAppearanceColorMode('night')
    expect(store.settings.appearance.wallpaper).toContain('cloud-pastel-night-v1.webp')

    store.setAppearanceWallpaperUrl('https://example.com/personal.jpg')
    store.setAppearanceColorMode('day')
    expect(store.settings.appearance.wallpaperMode).toBe('url')
    expect(store.settings.appearance.wallpaper).toBe('https://example.com/personal.jpg')
  })

  test('can apply the kit wallpaper explicitly without changing color mode', () => {
    const store = useSystemStore()
    store.setAppearanceColorMode('night')
    store.setAppearanceWallpaperUrl('https://example.com/personal.jpg')

    const status = store.applyAppearanceStyleKit('system-classic', { applyWallpaper: true })

    expect(store.settings.appearance.colorMode).toBe('night')
    expect(store.settings.appearance.currentTheme).toBe('zen')
    expect(store.settings.appearance.wallpaperMode).toBe('theme')
    expect(store.settings.appearance.wallpaper).toBe(store.getThemeWallpaper())
    expect(status).toMatchObject({ customized: false })
  })

  test('migrates legacy backups onto the four-layer foundation', () => {
    const store = useSystemStore()

    expect(
      store.restoreFromBackup({
        settings: {
          appearance: {
            currentTheme: 'zen',
            systemAppIconTheme: 'soft-rounded',
          },
        },
      }),
    ).toBe(true)

    expect(store.settings.appearance).toMatchObject({
      currentTheme: 'zen',
      colorMode: 'night',
      systemTheme: 'classic',
      styleKitId: 'system-classic',
      systemAppIconTheme: 'soft-rounded',
    })
  })

  test('migrates every retired Liquid Prism selection to Chromatic Glass', () => {
    const store = useSystemStore()

    expect(
      store.restoreFromBackup({
        settings: {
          appearance: {
            systemTheme: 'liquid-prism',
            styleKitId: 'liquid-prism',
            systemAppIconTheme: 'liquid-prism',
          },
        },
      }),
    ).toBe(true)

    expect(store.settings.appearance).toMatchObject({
      systemTheme: 'chromatic-glass',
      styleKitId: 'chromatic-glass',
      systemAppIconTheme: 'chromatic-glass',
    })
    expect(store.getAppearanceStyleKitStatus()).toMatchObject({
      kit: { id: 'chromatic-glass' },
      customized: false,
    })
  })

  test('exposes independent mode and style-kit controls in Appearance', async () => {
    const router = createTestRouter()
    await router.push('/appearance')
    await router.isReady()
    const store = useSystemStore()
    store.setAppearanceWallpaperUrl('https://example.com/personal.jpg')

    const wrapper = mount(AppearanceView, {
      global: { plugins: [router] },
    })

    await wrapper.get('[data-testid="appearance-theme-entry"]').trigger('click')
    await wrapper.get('[data-testid="appearance-color-mode-night"]').trigger('click')
    await flushPromises()

    expect(store.settings.appearance.colorMode).toBe('night')
    expect(store.settings.appearance.currentTheme).toBe('zen')
    expect(wrapper.get('[data-testid="appearance-system-theme-classic"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="appearance-system-theme-cloud-pastel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="appearance-system-theme-liquid-prism"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="appearance-system-theme-chromatic-glass"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="appearance-style-kit-cloud-pastel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="appearance-style-kit-liquid-prism"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="appearance-style-kit-chromatic-glass"]').text()).toContain(
      '含 5 个可选配套组件',
    )

    const wallpaperToggle = wrapper.get('[data-testid="appearance-style-kit-wallpaper"]')
    expect(wallpaperToggle.element.checked).toBe(false)

    await wrapper.get('[data-testid="appearance-style-kit-system-classic"]').trigger('click')
    await flushPromises()

    expect(store.settings.appearance.wallpaperMode).toBe('url')
    expect(store.settings.appearance.wallpaper).toBe('https://example.com/personal.jpg')
    expect(wrapper.text()).toContain('已自定义')

    await wallpaperToggle.setValue(true)
    await wrapper.get('[data-testid="appearance-style-kit-cloud-pastel"]').trigger('click')
    await flushPromises()

    expect(store.settings.appearance.systemTheme).toBe('cloud-pastel')
    expect(store.settings.appearance.systemAppIconTheme).toBe('cloud-pastel-animals')
    expect(store.settings.appearance.wallpaperMode).toBe('theme')
    expect(
      wrapper.get('[data-testid="appearance-style-kit-cloud-pastel"]').attributes('aria-pressed'),
    ).toBe('true')
    expect(wrapper.text()).toContain('套装已应用')

    const homePagesBeforeInstall = store.settings.appearance.homeWidgetPages.map((page) => [
      ...page,
    ])
    const widgetToggle = wrapper.get('[data-testid="appearance-style-kit-widgets"]')
    expect(widgetToggle.element.checked).toBe(false)
    await widgetToggle.setValue(true)
    await wrapper.get('[data-testid="appearance-style-kit-chromatic-glass"]').trigger('click')
    await flushPromises()

    expect(store.settings.appearance.systemTheme).toBe('chromatic-glass')
    expect(store.settings.appearance.systemAppIconTheme).toBe('chromatic-glass')
    expect(store.settings.appearance.customWidgets).toHaveLength(5)
    expect(store.settings.appearance.homeWidgetPages).toEqual(homePagesBeforeInstall)
    expect(wrapper.get('[data-testid="appearance-style-kit-widget-feedback"]').text()).toContain(
      '已将 5 个配套组件加入组件库，未放到桌面',
    )

    await wrapper.get('[data-testid="appearance-style-kit-chromatic-glass"]').trigger('click')
    await flushPromises()
    expect(store.settings.appearance.customWidgets).toHaveLength(5)
    expect(wrapper.get('[data-testid="appearance-style-kit-widget-feedback"]').text()).toContain(
      '没有重复添加',
    )

    await wrapper.get('[data-testid="appearance-style-kit-chromatic-glass"]').trigger('click')
    await flushPromises()
    expect(store.settings.appearance.systemTheme).toBe('chromatic-glass')
    expect(store.settings.appearance.systemAppIconTheme).toBe('chromatic-glass')

    wrapper.unmount()
  })
})
