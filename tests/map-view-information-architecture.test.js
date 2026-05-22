import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import MapView from '../src/views/MapView.vue'
import { useMapStore } from '../src/stores/map'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'

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

describe('MapView information architecture', () => {
  let wrapper = null
  let router = null

  beforeEach(async () => {
    localStorage.clear()
    vi.useFakeTimers()
    setActivePinia(createPinia())
    router = createTestRouter()
    await router.push('/map')
    await router.isReady()
    wrapper = mount(MapView, {
      global: {
        plugins: [router],
      },
    })
    await nextTick()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    wrapper = null
    router = null
    vi.useRealTimers()
  })

  test('uses a map-first shell before exposing secondary tools', async () => {
    expect(wrapper.get('[data-testid="map-primary-canvas"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-primary-route-card"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-secondary-menu"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="map-secondary-drawer"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-open-trip-drawer"]').trigger('click')
    await nextTick()

    const drawer = wrapper.get('[data-testid="map-secondary-drawer"]')
    expect(drawer.exists()).toBe(true)
    expect(drawer.text()).toContain('出行模拟')
    expect(wrapper.get('[data-testid="map-visual-image-source"]').isVisible()).toBe(false)
  })

  test('keeps destination search on the primary map surface', async () => {
    const input = wrapper.get('[data-testid="map-destination-search"]')

    await input.setValue('Moon Market')
    await nextTick()

    expect(input.element.value).toBe('Moon Market')
    expect(wrapper.get('[data-testid="map-primary-route-card"]').text()).toContain('Moon Market')
  })

  test('records an arrived shared route for the selected companion', async () => {
    const mapStore = useMapStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const now = Date.now()
    expect(
      mapStore.restoreFromBackup({
        map: {
          tripState: {
            status: 'arrived',
            from: 'Dorm',
            to: 'Library',
            fromLabel: 'Dorm',
            toLabel: 'Library',
            distanceKm: 3,
            fare: 1200,
            durationSeconds: 600,
            startedAt: now - 600000,
            etaAt: now - 1000,
            arrivedAt: now - 1000,
          },
          tripHistory: [
            {
              id: 'trip_hist_shared_route',
              status: 'arrived',
              from: 'Dorm',
              to: 'Library',
              fromLabel: 'Dorm',
              toLabel: 'Library',
              distanceKm: 3,
              fare: 1200,
              durationSeconds: 600,
              startedAt: now - 600000,
              endedAt: now - 1000,
              rewardPoints: 12,
            },
          ],
        },
      }),
    ).toBe(true)
    await nextTick()

    await wrapper.get('[data-testid="map-relationship-contact"]').setValue('1')
    await wrapper.get('[data-testid="map-open-trip-drawer"]').trigger('click')
    await nextTick()
    await wrapper.findComponent({ name: 'MapTripControlPanel' }).vm.$emit('acknowledge-arrival')
    await nextTick()

    expect(relationshipRuntimeStore.events).toHaveLength(1)
    expect(relationshipRuntimeStore.events[0]).toMatchObject({
      factType: 'shared_route',
      sourceModule: 'relationship_map_shared_route',
      targetLabel: 'Eva',
      status: 'applied',
    })
  })

  test('carries the latest trip lineage into map calendar reminders', async () => {
    const mapStore = useMapStore()
    const now = Date.now()
    expect(
      mapStore.restoreFromBackup({
        map: {
          tripHistory: [
            {
              id: 'trip_hist_city_core_lineage',
              status: 'arrived',
              from: 'Dorm',
              to: 'City core',
              fromLabel: 'Dorm',
              toLabel: 'City core',
              distanceKm: 3,
              fare: 1200,
              durationSeconds: 600,
              startedAt: now - 600000,
              endedAt: now - 1000,
              rewardPoints: 12,
            },
          ],
        },
      }),
    ).toBe(true)
    await nextTick()

    expect(mapStore.mapCalendarReminders[0]).toMatchObject({
      areaId: 'city_core',
      sourceTripId: 'trip_hist_city_core_lineage',
    })
  })
})
