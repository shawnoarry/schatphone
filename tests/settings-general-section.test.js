import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import SettingsView from '../src/views/SettingsView.vue'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/settings', component: SettingsView },
      { path: '/home', component: DummyView },
      { path: '/profile', component: DummyView },
      { path: '/worldbook', component: DummyView },
      { path: '/network', component: DummyView },
      { path: '/chat-contacts', component: DummyView },
      { path: '/appearance', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountSettingsView = async (path = '/settings') => {
  const router = createTestRouter()
  await router.push(path)
  await router.isReady()

  const wrapper = mount(SettingsView, {
    global: {
      plugins: [router],
    },
  })

  await flushUi()
  return { wrapper, router }
}

describe('SettingsView general section', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('edits general settings through the extracted section and preserves parent save normalization', async () => {
    const store = useSystemStore()
    store.settings.system.language = 'zh-CN'
    store.settings.system.timezone = 'Asia/Shanghai'
    store.settings.system.backupReminderEnabled = true
    store.settings.system.backupReminderIntervalHours = 720
    const saveSpy = vi.spyOn(store, 'saveNow')

    const { wrapper } = await mountSettingsView('/settings?menu=general')

    await wrapper.get('[data-testid="settings-general-language"]').setValue('en-US')
    await wrapper.get('[data-testid="settings-general-timezone"]').setValue('Europe/Paris')
    await wrapper.get('[data-testid="settings-general-backup-reminder-enabled"]').setValue(false)
    await wrapper.get('[data-testid="settings-general-backup-reminder-enabled"]').setValue(true)
    await wrapper.get('[data-testid="settings-general-backup-reminder-interval"]').setValue('168')
    await wrapper.get('[data-testid="settings-general-save"]').trigger('click')
    await flushUi()

    expect(store.settings.system.language).toBe('en-US')
    expect(store.settings.system.timezone).toBe('Europe/Paris')
    expect(store.settings.system.backupReminderEnabled).toBe(true)
    expect(store.settings.system.backupReminderIntervalHours).toBe(168)
    expect(saveSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="settings-general-save"]').text()).toMatch(/已保存|Saved/)

    wrapper.unmount()
    saveSpy.mockRestore()
  })

  test('routes landing entries and opens subpages through the extracted landing section', async () => {
    const { wrapper, router } = await mountSettingsView()

    await wrapper.get('[data-testid="settings-profile-entry"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.path).toBe('/profile')
    wrapper.unmount()

    const { wrapper: menuWrapper, router: menuRouter } = await mountSettingsView()

    expect(menuWrapper.get('[data-testid="settings-beginner-tip"]').text()).toMatch(/Network|网络/)

    await menuWrapper.get('[data-settings-menu-title="General"]').trigger('click')
    await flushUi()
    expect(menuWrapper.find('[data-testid="settings-general-language"]').exists()).toBe(true)

    await menuWrapper.get('[data-testid="settings-subpage-back"]').trigger('click')
    await flushUi()
    await menuWrapper.get('[data-settings-menu-title="World Book"]').trigger('click')
    await flushUi()
    expect(menuRouter.currentRoute.value.path).toBe('/worldbook')

    menuWrapper.unmount()
  })

  test('keeps quick access routing on the extracted landing section', async () => {
    const { wrapper, router } = await mountSettingsView()

    await wrapper.get('[data-settings-quick-title="Network & API"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/network')

    wrapper.unmount()
  })

  test('normalizes invalid backup reminder interval on save', async () => {
    const store = useSystemStore()
    store.settings.system.backupReminderIntervalHours = 9999

    const { wrapper } = await mountSettingsView('/settings?menu=general')

    await wrapper.get('[data-testid="settings-general-save"]').trigger('click')
    await flushUi()

    expect(store.settings.system.backupReminderIntervalHours).toBe(720)

    wrapper.unmount()
  })

  test('uses the shared subpage header to close the general panel', async () => {
    const { wrapper } = await mountSettingsView('/settings?menu=general')

    expect(wrapper.find('[data-testid="settings-general-language"]').exists()).toBe(true)

    await wrapper.get('[data-testid="settings-subpage-back"]').trigger('click')
    await flushUi()

    expect(wrapper.find('[data-testid="settings-general-language"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('renders the extracted about info card from the about subpage', async () => {
    const { wrapper } = await mountSettingsView('/settings?menu=about')

    expect(wrapper.get('[data-testid="settings-about-info-card"]').text()).toContain('SchatPhone')
    expect(wrapper.get('[data-testid="settings-about-info-card"]').text()).toContain('1.2.0')

    wrapper.unmount()
  })
})
