import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
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
      { path: '/map/settings', component: DummyView },
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

  test('keeps map selection world-bound and routes management to Map settings', async () => {
    expect(wrapper.find('[data-testid^="map-pack-"]').exists()).toBe(false)
    expect(wrapper.get('[data-map-pack="real-seoul-v1"]').exists()).toBe(true)

    await wrapper.get('[data-testid="map-open-settings"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/map/settings')
  })

  test('creates a categorized place through explicit map placement and opens its detail', async () => {
    const mapStore = useMapStore()
    await wrapper.get('[data-testid="map-add-place"]').trigger('click')
    await nextTick()

    const creator = wrapper.get('[data-testid="map-place-creator"]')
    await creator.get('[data-testid="map-place-name"]').setValue('北岸排练室')
    await creator.get('[data-testid="map-place-detail"]').setValue('城东区排练楼 3F')
    const workCategory = creator
      .findAll('.map-place-category-grid button')
      .find((button) => button.text().includes('工作') || button.text().includes('Work'))
    expect(workCategory?.exists()).toBe(true)
    await workCategory.trigger('click')
    await creator.get('[data-testid="map-choose-pin"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-placement-mode"]').exists()).toBe(true)
    wrapper.findComponent({ name: 'MapSceneCanvas' }).vm.$emit('place-pin', {
      position: { kind: 'geo', lat: 37.5444, lng: 127.0441 },
    })
    await nextTick()

    expect(wrapper.get('[data-testid="map-pending-pin-status"]').exists()).toBe(true)
    await wrapper.get('[data-testid="map-save-address"]').trigger('click')
    await nextTick()

    expect(mapStore.addresses.at(-1)).toMatchObject({
      label: '北岸排练室',
      category: 'work',
      mapPackId: 'real-seoul-v1',
    })
    expect(wrapper.get('[data-testid="map-place-detail-sheet"]').text()).toContain('北岸排练室')
    expect(wrapper.get('[data-testid="map-place-detail-sheet"]').text()).toContain('城东区排练楼 3F')
  })

  test('leaves the Places drawer for map placement and preserves the draft on cancel', async () => {
    const placesButton = wrapper
      .findAll('.map-bottom-nav-item')
      .find((button) => button.text().includes('地点') || button.text().includes('Places'))
    expect(placesButton?.exists()).toBe(true)

    await placesButton.trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-secondary-drawer"]').exists()).toBe(true)

    await wrapper.get('[data-testid="map-add-place-drawer"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="map-place-name"]').setValue('桥下工作室')
    await wrapper.get('[data-testid="map-choose-pin"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-placement-mode"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="map-secondary-drawer"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-placement-mode"]').get('button').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-place-creator"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-name"]').element.value).toBe('桥下工作室')
  })

  test('keeps coordinate placement available while a trip is in progress', async () => {
    const mapStore = useMapStore()
    expect(mapStore.startTrip().ok).toBe(true)
    await nextTick()

    await wrapper.get('[data-testid="map-add-place"]').trigger('click')
    await wrapper.get('[data-testid="map-place-name"]').setValue('途中便利店')
    await wrapper.get('[data-testid="map-place-detail"]').setValue('汉江沿线补给点')
    await wrapper.get('[data-testid="map-choose-pin"]').trigger('click')
    await nextTick()

    const mapScene = wrapper.findComponent({ name: 'MapSceneCanvas' })
    expect(mapScene.props('allowPinPlacement')).toBe(true)
    mapScene.vm.$emit('place-pin', {
      position: { kind: 'geo', lat: 37.55, lng: 126.99 },
    })
    await nextTick()

    expect(wrapper.get('[data-testid="map-place-creator"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-pending-pin-status"]').exists()).toBe(true)
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

    await wrapper.get('[data-testid="map-open-trip-drawer"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="map-relationship-contact"]').setValue('1')
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
