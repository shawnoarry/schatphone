import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import CalendarAppearanceView from '../src/views/CalendarAppearanceView.vue'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const mountView = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/calendar', component: DummyView },
      { path: '/calendar/settings/appearance', component: CalendarAppearanceView },
    ],
  })
  await router.push('/calendar/settings/appearance')
  await router.isReady()
  const wrapper = mount(CalendarAppearanceView, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper }
}

describe('calendar appearance view', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'zh-CN'
  })

  test('switches the whole color preset and persists it', async () => {
    const { wrapper } = await mountView()
    const store = useSystemStore()

    expect(store.settings.appearance.calendar.colorPreset).toBe('default')
    await wrapper.get('[data-testid="calendar-appearance-preset-candy"]').trigger('click')
    await wrapper.get('[data-testid="calendar-appearance-save"]').trigger('click')

    expect(store.settings.appearance.calendar.colorPreset).toBe('candy')
    const persisted = JSON.parse(localStorage.getItem('schatphone:store:system'))
    expect(persisted.data.settings.appearance.calendar.colorPreset).toBe('candy')
    wrapper.unmount()
  })

  test('recolors and renames one marker, then reset restores defaults', async () => {
    const { wrapper } = await mountView()
    const store = useSystemStore()

    await wrapper.get('[data-testid="calendar-appearance-marker-label-marker_custom_1"]').setValue('探店')
    await wrapper
      .get('[data-testid="calendar-appearance-swatch-marker_custom_1-orange"]')
      .trigger('click')
    await wrapper.get('[data-testid="calendar-appearance-glyph-dot"]').trigger('click')
    await wrapper.get('[data-testid="calendar-appearance-save"]').trigger('click')

    const customOne = store.settings.appearance.calendar.markers.find(
      (marker) => marker.id === 'marker_custom_1',
    )
    expect(customOne.labelZh).toBe('探店')
    expect(customOne.colorKey).toBe('orange')
    expect(store.settings.appearance.calendar.glyphStyle).toBe('dot')

    await wrapper.get('[data-testid="calendar-appearance-reset"]').trigger('click')
    await wrapper.get('[data-testid="calendar-appearance-save"]').trigger('click')

    const restored = store.settings.appearance.calendar.markers.find(
      (marker) => marker.id === 'marker_custom_1',
    )
    expect(restored.labelZh).toBe('自定义1')
    expect(restored.colorKey).toBe('teal')
    expect(store.settings.appearance.calendar.glyphStyle).toBe('bar')
    wrapper.unmount()
  })
})
