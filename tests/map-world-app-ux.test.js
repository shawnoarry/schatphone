import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import MapView from '../src/views/MapView.vue'
import { useMapStore } from '../src/stores/map'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/map', component: MapView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/settings', component: DummyView },
      { path: '/worldbook', component: DummyView },
    ],
  })

describe('Map world app UX package', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('renders a transit World Pack context without owning trip records', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const mapStore = useMapStore()
    expect(systemStore.activateWorldPack('survival_city').ok).toBe(true)
    const originalTripHistoryLength = mapStore.tripHistory.length

    await router.push({
      path: '/map',
      query: {
        worldPack: 'survival_city',
        worldApp: 'survival_safe_route_pass',
      },
    })
    await router.isReady()

    const wrapper = mount(MapView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    const contextBanner = wrapper.get('[data-testid="map-world-app-context"]')
    expect(contextBanner.attributes('data-world-pack')).toBe('survival_city')
    expect(contextBanner.attributes('data-world-app')).toBe('survival_safe_route_pass')
    expect(wrapper.get('[data-testid="map-primary-route-card"]').text()).toContain('Safe Route Pass')
    expect(contextBanner.text()).toContain('Map keeps its own records')
    expect(mapStore.tripHistory).toHaveLength(originalTripHistoryLength)

    wrapper.unmount()
  })

  test('renders a confirmed nonstandard transit app binding as Map context', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const mapStore = useMapStore()
    const confirmed = systemStore.confirmWorldAppTemplateProposal(
      {
        templateId: 'transit_pass',
        title: 'Metro Pass',
        confidence: 'medium',
      },
      'default_world',
    )
    expect(confirmed.ok).toBe(true)
    const originalTripHistoryLength = mapStore.tripHistory.length

    await router.push({
      path: '/map',
      query: {
        worldPack: 'default_world',
        worldApp: confirmed.binding.id,
      },
    })
    await router.isReady()

    const wrapper = mount(MapView, {
      global: {
        plugins: [router],
      },
    })
    await flushPromises()

    const contextBanner = wrapper.get('[data-testid="map-world-app-context"]')
    expect(contextBanner.attributes('data-world-pack')).toBe('default_world')
    expect(contextBanner.attributes('data-world-app')).toBe(confirmed.binding.id)
    expect(wrapper.get('[data-testid="map-primary-route-card"]').text()).toContain('Metro Pass')
    expect(contextBanner.text()).toContain('Map keeps its own records')
    expect(mapStore.tripHistory).toHaveLength(originalTripHistoryLength)

    wrapper.unmount()
  })
})
