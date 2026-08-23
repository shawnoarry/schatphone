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
    expect(normalizeSystemAppIconThemeId('unknown')).toBe('classic')
    expect(isSystemAppIconThemeTarget('app_chat')).toBe(true)
    expect(isSystemAppIconThemeTarget('app_shopping')).toBe(false)
    expect(resolveSystemAppIconThemeOverride('app_chat', 'soft-rounded')).toEqual({
      icon: 'fas fa-message',
      accent: 'cool',
    })
    expect(resolveSystemAppIconThemeOverride('app_shopping', 'soft-rounded')).toBeNull()
  })

  test('changes built-in system apps together while leaving commercial app metadata unchanged', () => {
    const systemAppIds = ['app_chat', 'app_contacts', 'app_settings', 'app_widgets']
    systemAppIds.forEach((appId) => {
      const classic = resolveAppIconMeta(appId, {}, 'zh-CN', 'classic')
      const rounded = resolveAppIconMeta(appId, {}, 'zh-CN', 'soft-rounded')
      expect(rounded.icon).not.toBe(classic.icon)
    })

    const commercialAppIds = [
      'app_shopping',
      'app_food_delivery',
      'app_daon_mail',
      'app_browser',
      'app_community',
      'app_healthcare',
      'app_jari_housing',
    ]
    commercialAppIds.forEach((appId) => {
      expect(resolveAppIconMeta(appId, {}, 'zh-CN', 'soft-rounded')).toEqual(
        resolveAppIconMeta(appId, {}, 'zh-CN', 'classic'),
      )
    })
  })

  test('keeps an explicit per-app override above the selected system app pack', () => {
    const meta = resolveAppIconMeta(
      'app_chat',
      { app_chat: { icon: 'fas fa-paper-plane', accent: 'dark' } },
      'zh-CN',
      'soft-rounded',
    )

    expect(meta.icon).toBe('fas fa-paper-plane')
    expect(meta.accent).toBe('dark')
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
    expect(wrapper.text()).toContain('商业 Logo 保持原样')

    wrapper.unmount()
  })
})
