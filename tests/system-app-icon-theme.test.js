import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import AppearanceView from '../src/views/AppearanceView.vue'
import { resolveAppIconMeta } from '../src/lib/app-icon-presentation'
import {
  isSystemAppIconThemeTarget,
  normalizeSystemAppIconThemeId,
  resolveSystemAppIconThemeOverride,
} from '../src/lib/system-app-icon-theme'
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

describe('system app icon themes', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('normalizes theme ids and limits packs to the curated system app set', () => {
    expect(normalizeSystemAppIconThemeId('soft-rounded')).toBe('soft-rounded')
    expect(normalizeSystemAppIconThemeId('cloud-pastel-animals')).toBe(
      'cloud-pastel-animals',
    )
    expect(normalizeSystemAppIconThemeId('unknown')).toBe('classic')
    expect(isSystemAppIconThemeTarget('app_chat')).toBe(false)
    expect(isSystemAppIconThemeTarget('app_shopping')).toBe(false)
    expect(resolveSystemAppIconThemeOverride('app_chat', 'soft-rounded')).toBeNull()
    expect(resolveSystemAppIconThemeOverride('app_shopping', 'soft-rounded')).toBeNull()
  })

  test('resolves the accepted Cloud Animals image masters with classic fallback elsewhere', () => {
    const acceptedImageApps = {
      app_network: 'network-wifi-clownfish.webp',
      app_wallet: 'wallet-pouch-kangaroo.webp',
      app_gallery: 'gallery-photo-wing-butterfly.webp',
      app_music: 'music-note-spout-whale.webp',
      app_themes: 'appearance-crested-peacock.webp',
      app_widgets: 'widgets-tile-shell-snail.webp',
      app_phone: 'phone-lop-rabbit.webp',
      app_camera: 'camera-owl.webp',
      app_weather: 'weather-cloud-sheep.webp',
      app_calendar: 'calendar-bear.webp',
      app_map: 'map-turtle.webp',
      app_settings: 'settings-gear-beetle.webp',
    }

    Object.entries(acceptedImageApps).forEach(([appId, fileName]) => {
      const meta = resolveAppIconMeta(appId, {}, 'zh-CN', 'cloud-pastel-animals')
      expect(meta.imageUrl).toContain(
        `/images/ui-assets/shared/app-icons/cloud-pastel-animals-v1/${fileName}`,
      )
    })

    const contacts = resolveAppIconMeta(
      'app_contacts',
      {},
      'zh-CN',
      'cloud-pastel-animals',
    )
    expect(Object.keys(acceptedImageApps)).toHaveLength(12)
    expect(contacts.imageUrl).toBe('')
    expect(contacts.icon).toBe(resolveAppIconMeta('app_contacts').icon)
  })

  test('changes built-in system apps together while leaving independent app metadata unchanged', () => {
    const systemAppIds = ['app_contacts', 'app_settings', 'app_widgets', 'app_phone']
    systemAppIds.forEach((appId) => {
      const classic = resolveAppIconMeta(appId, {}, 'zh-CN', 'classic')
      const rounded = resolveAppIconMeta(appId, {}, 'zh-CN', 'soft-rounded')
      expect(rounded.icon).not.toBe(classic.icon)
    })

    const independentAppIds = [
      'app_chat',
      'app_shopping',
      'app_food_delivery',
      'app_daon_mail',
      'app_browser',
      'app_community',
      'app_healthcare',
      'app_jari_housing',
    ]
    independentAppIds.forEach((appId) => {
      expect(resolveAppIconMeta(appId, {}, 'zh-CN', 'soft-rounded')).toEqual(
        resolveAppIconMeta(appId, {}, 'zh-CN', 'classic'),
      )
    })
  })

  test('keeps an explicit per-app override above the selected system app pack', () => {
    const meta = resolveAppIconMeta(
      'app_contacts',
      { app_contacts: { icon: 'fas fa-paper-plane', accent: 'dark' } },
      'zh-CN',
      'soft-rounded',
    )

    expect(meta.icon).toBe('fas fa-paper-plane')
    expect(meta.accent).toBe('dark')
  })

  test('keeps an explicit per-app override above a bundled animal image', () => {
    const meta = resolveAppIconMeta(
      'app_phone',
      { app_phone: { icon: 'fas fa-paper-plane', accent: 'dark' } },
      'zh-CN',
      'cloud-pastel-animals',
    )

    expect(meta.icon).toBe('fas fa-paper-plane')
    expect(meta.accent).toBe('dark')
    expect(meta.imageUrl).toBe('')
  })

  test('persists the setting and accepts the mistaken V1 key as migration input', () => {
    const store = useSystemStore()
    store.setSystemAppIconTheme('soft-rounded')
    expect(store.settings.appearance.systemAppIconTheme).toBe('soft-rounded')

    expect(
      store.restoreFromBackup({
        settings: { appearance: { systemIconTheme: 'soft-rounded' } },
      }),
    ).toBe(true)
    expect(store.settings.appearance.systemAppIconTheme).toBe('soft-rounded')
  })

  test('switches system app icon packs from Appearance', async () => {
    const router = createTestRouter()
    await router.push('/appearance')
    await router.isReady()
    const store = useSystemStore()

    const wrapper = mount(AppearanceView, {
      global: { plugins: [router] },
    })

    await wrapper.get('[data-testid="appearance-system-icons-entry"]').trigger('click')
    expect(wrapper.get('[data-testid="appearance-system-icons-page"]').exists()).toBe(true)

    await wrapper
      .get('[data-testid="appearance-system-app-icon-theme-soft-rounded"]')
      .trigger('click')
    await flushPromises()

    expect(store.settings.appearance.systemAppIconTheme).toBe('soft-rounded')
    expect(
      wrapper
        .get('[data-testid="appearance-system-app-icon-theme-soft-rounded"]')
        .attributes('aria-pressed'),
    ).toBe('true')
    expect(wrapper.text()).toContain('Chat 与商业 App 保持独立')

    wrapper.unmount()
  })

  test('previews and selects the partial Cloud Animals pack from Appearance', async () => {
    const router = createTestRouter()
    await router.push('/appearance')
    await router.isReady()
    const store = useSystemStore()

    const wrapper = mount(AppearanceView, {
      global: { plugins: [router] },
    })

    await wrapper.get('[data-testid="appearance-system-icons-entry"]').trigger('click')
    const option = wrapper.get(
      '[data-testid="appearance-system-app-icon-theme-cloud-pastel-animals"]',
    )
    expect(option.findAll('img')).toHaveLength(4)
    expect(option.text()).toContain('12 个常用系统 App 使用动物图标')

    await option.trigger('click')
    await flushPromises()

    expect(store.settings.appearance.systemAppIconTheme).toBe('cloud-pastel-animals')
    expect(option.attributes('aria-pressed')).toBe('true')
    wrapper.unmount()
  })
})
