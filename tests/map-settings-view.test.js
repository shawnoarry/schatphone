import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MapSettingsView from '../src/views/MapSettingsView.vue'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/map', component: DummyView },
      { path: '/map/settings', component: MapSettingsView },
      { path: '/map/settings/places', component: DummyView },
      { path: '/map/labs/kakao-compare', component: DummyView },
      { path: '/worldbook', component: DummyView },
      { path: '/camera/settings/providers', component: DummyView },
    ],
  })

describe('Map settings view', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('separates world binding, map creation, and presentation controls', async () => {
    const router = createTestRouter()
    await router.push('/map/settings')
    await router.isReady()
    const wrapper = mount(MapSettingsView, { global: { plugins: [router] } })
    await flushPromises()

    expect(wrapper.get('[data-testid="map-current-source"]').text()).toContain('现实首尔')
    expect(wrapper.get('[data-testid="map-open-import"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-open-generate"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-open-visual-settings"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-open-place-settings"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-open-kakao-compare"]').exists()).toBe(true)

    await wrapper.get('[data-testid="map-open-import"]').trigger('click')
    expect(wrapper.get('[data-testid="map-import-dialog"]').exists()).toBe(true)
    await wrapper.get('[data-testid="map-import-dialog"] .map-modal-header button').trigger('click')

    await wrapper.get('[data-testid="map-open-generate"]').trigger('click')
    expect(wrapper.get('[data-testid="map-generate-dialog"]').exists()).toBe(true)
    await wrapper.get('[data-testid="map-generate-dialog"] .map-modal-header button').trigger('click')

    await wrapper.get('[data-testid="map-open-visual-settings"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      path: '/map',
      query: { panel: 'visual', source: 'map-settings' },
    })

    wrapper.unmount()
  })

  test('opens the Kakao comparison without losing the Map return context', async () => {
    const router = createTestRouter()
    await router.push('/map/settings?from=home&homePage=1')
    await router.isReady()
    const wrapper = mount(MapSettingsView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.get('[data-testid="map-open-kakao-compare"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      path: '/map/labs/kakao-compare',
      query: { from: 'home', homePage: '1' },
    })

    wrapper.unmount()
  })

  test('returns to Map instead of forwarding the Home return target', async () => {
    const router = createTestRouter()
    await router.push('/map/settings?from=home&homePage=1')
    await router.isReady()
    const wrapper = mount(MapSettingsView, { global: { plugins: [router] } })
    await flushPromises()

    await wrapper.get('[aria-label="返回地图"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      path: '/map',
      query: { from: 'home', homePage: '1' },
    })

    wrapper.unmount()
  })
})
