import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MapSettingsView from '../src/views/MapSettingsView.vue'
import { MAP_PLACE_KNOWLEDGE_MODE } from '../src/lib/map-place-discovery'
import { useMapStore } from '../src/stores/map'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/map', component: DummyView },
      { path: '/map/settings', component: MapSettingsView },
      { path: '/map/settings/places', component: DummyView },
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
    expect(wrapper.get('[data-testid="map-real-basemap-source"]').text()).toContain(
      'OpenFreeMap',
    )

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

  test('returns to Map with its original parent return target', async () => {
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

  test('configures place knowledge per world without deleting Footprints progress', async () => {
    const router = createTestRouter()
    await router.push('/map/settings')
    await router.isReady()
    const wrapper = mount(MapSettingsView, { global: { plugins: [router] } })
    const mapStore = useMapStore()
    await flushPromises()

    expect(wrapper.get('[data-testid="map-place-knowledge-all-known"]').attributes('aria-checked')).toBe('true')
    await wrapper.get('[data-testid="map-place-knowledge-footprints"]').trigger('click')

    expect(mapStore.activeMapPlaceKnowledgeMode).toBe(MAP_PLACE_KNOWLEDGE_MODE.FOOTPRINT_GATED)
    expect(wrapper.get('[data-testid="map-place-knowledge-settings"]').text()).toMatch(
      /手动修改角色位置不会解锁地点|manually moving the role does not reveal places/,
    )

    await wrapper.get('[data-testid="map-place-knowledge-all-known"]').trigger('click')
    expect(mapStore.activeMapPlaceKnowledgeMode).toBe(MAP_PLACE_KNOWLEDGE_MODE.ALL_KNOWN)

    wrapper.unmount()
  })

  test('owns the global place-name language outside individual place cards', async () => {
    const router = createTestRouter()
    await router.push('/map/settings')
    await router.isReady()
    const wrapper = mount(MapSettingsView, { global: { plugins: [router] } })
    const mapStore = useMapStore()
    await flushPromises()

    expect(wrapper.get('[data-testid="map-place-language-mode-system"]').attributes('aria-pressed')).toBe('true')
    await wrapper.get('[data-testid="map-place-language-mode-en"]').trigger('click')
    expect(mapStore.mapPlaceDisplayMode).toBe('en')
    expect(wrapper.get('[data-testid="map-place-language-mode-en"]').attributes('aria-pressed')).toBe('true')

    await wrapper.get('[data-testid="map-place-language-mode-bilingual"]').trigger('click')
    expect(mapStore.mapPlaceDisplayMode).toBe('bilingual')

    wrapper.unmount()
  })
})
