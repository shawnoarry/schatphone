import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import MapView from '../src/views/MapView.vue'
import { useMapStore } from '../src/stores/map'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { SIMULATION_SURPRISE_MODE, useSimulationStore } from '../src/stores/simulation'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/map', component: MapView },
      { path: '/map/settings', component: DummyView },
      { path: '/map/settings/places', component: DummyView },
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
    expect(wrapper.find('[data-testid="map-primary-route-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="map-secondary-menu"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-primary-controls"]').findAll('button')).toHaveLength(2)
    expect(wrapper.find('[data-testid="map-add-place"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="map-secondary-drawer"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-open-places"]').trigger('click')
    await nextTick()

    const drawer = wrapper.get('[data-testid="map-secondary-drawer"]')
    expect(drawer.exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-add-place-drawer"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-manage-places"]').text()).toMatch(
      /Manage places and pins|管理地点与图钉/,
    )
    const tripTab = drawer
      .findAll('.map-drawer-tab')
      .find((button) => button.text().includes('行程') || button.text().includes('Trip'))
    await tripTab.trigger('click')
    await nextTick()
    expect(drawer.text()).toMatch(/行程计划|Journey plan/)
    expect(wrapper.get('[data-testid="map-visual-image-source"]').isVisible()).toBe(false)
  })

  test('focuses the saved role position without implying device location', async () => {
    const mapScene = wrapper.findComponent({ name: 'MapSceneCanvas' })
    const initialRequestId = mapScene.props('focusPosition').focusRequestId
    const roleLocation = wrapper.get('[data-testid="map-current-location"]')

    expect(roleLocation.attributes('aria-label')).toMatch(/Role location|角色位置/)
    expect(roleLocation.attributes('aria-label')).not.toMatch(/Recenter|回到当前位置/)

    await roleLocation.trigger('click')
    await nextTick()

    expect(mapScene.props('focusPosition').focusRequestId).toBe(initialRequestId + 1)
  })

  test('shows real place categories inside Places and filters the visible list', async () => {
    const mapStore = useMapStore()
    await wrapper.get('[data-testid="map-open-places"]').trigger('click')
    await nextTick()

    const filter = wrapper.get('[data-testid="map-place-category-filter"]')
    expect(filter.attributes('aria-label')).toMatch(/Place categories|地点分类/)
    expect(wrapper.get('[data-testid="map-place-filter-all"]').text()).toContain(
      String(mapStore.activeMapPlaces.length),
    )
    expect(wrapper.get('[data-testid="map-place-filter-work"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-filter-transit"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-filter-convenience_store"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-filter-pharmacy"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-filter-fitness"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-filter-cinema"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-filter-bank"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-filter-public_safety"]').exists()).toBe(true)

    await wrapper.get('[data-testid="map-place-filter-cinema"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-filtered-place-list"]').findAll('.map-place-list-row')).toHaveLength(4)
    expect(wrapper.get('[data-testid="map-filtered-place-list"]').text()).toContain('CGV')

    await wrapper.get('[data-testid="map-place-filter-transit"]').trigger('click')
    await nextTick()

    const expectedTransitCount = mapStore.activeMapPlaces.filter(
      (place) => place.category === 'transit',
    ).length
    expect(wrapper.get('[data-testid="map-place-filter-transit"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="map-filtered-place-list"]').findAll('.map-place-list-row')).toHaveLength(
      expectedTransitCount,
    )
    expect(wrapper.get('[data-testid="map-filtered-place-list"]').text()).not.toContain('SM Entertainment')

    await wrapper.get('[data-testid="map-place-filter-all"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-filtered-place-list"]').findAll('.map-place-list-row')).toHaveLength(
      mapStore.activeMapPlaces.length,
    )
  })

  test('controls category and individual map markers without removing hidden places from search', async () => {
    const mapStore = useMapStore()
    const mapScene = wrapper.findComponent({ name: 'MapSceneCanvas' })
    const conveniencePlaces = mapStore.activeMapPlaces.filter(
      (place) => place.category === 'convenience_store',
    )
    const firstConvenience = conveniencePlaces[0]

    expect(conveniencePlaces).toHaveLength(3)
    expect(mapScene.props('pins').some((pin) => pin.placeId === firstConvenience.placeId)).toBe(false)

    await wrapper.get('[data-testid="map-destination-search"]').setValue('CU BGF')
    await nextTick()
    expect(wrapper.get('[data-testid="map-local-place-results"]').text()).toContain('CU BGF')
    await wrapper.get('[data-testid="map-local-place-results"]').get('.map-place-result').trigger('click')
    await nextTick()
    expect(mapScene.props('pins').some((pin) => pin.placeId === firstConvenience.placeId)).toBe(true)

    await wrapper.get('[data-testid="map-place-detail-sheet"]').get('button[aria-label="关闭"]').trigger('click')
    await nextTick()
    expect(mapScene.props('pins').some((pin) => pin.placeId === firstConvenience.placeId)).toBe(false)

    await wrapper.get('[data-testid="map-open-places"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="map-place-filter-convenience_store"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-filtered-place-list"]').findAll('.map-place-list-row')).toHaveLength(3)

    await wrapper.get('[data-testid="map-place-category-visibility-convenience_store"]').trigger('click')
    await nextTick()
    expect(mapScene.props('pins').filter((pin) => pin.category === 'convenience_store')).toHaveLength(3)

    await wrapper.get(`[data-testid="map-place-visibility-${firstConvenience.placeId}"]`).trigger('click')
    await nextTick()
    expect(mapScene.props('pins').some((pin) => pin.placeId === firstConvenience.placeId)).toBe(false)
    expect(mapStore.activeMapPlaces.some((place) => place.placeId === firstConvenience.placeId)).toBe(true)
    expect(wrapper.get('[data-testid="map-pin-visibility-toolbar"]').text()).toMatch(/shown|已显示/)
  })

  test('connects the visible trip-history delete action to Map ownership', async () => {
    const mapStore = useMapStore()
    expect(mapStore.restoreFromBackup({
      map: {
        tripHistory: [
          {
            id: 'trip_history_delete_test',
            status: 'cancelled',
            from: 'Home',
            to: 'Office',
            durationSeconds: 45,
            startedAt: Date.now() - 46_000,
            endedAt: Date.now() - 1000,
          },
        ],
      },
    })).toBe(true)
    await nextTick()

    await wrapper.get('[data-testid="map-open-places"]').trigger('click')
    await nextTick()
    const progressTab = wrapper
      .get('[data-testid="map-secondary-drawer"]')
      .findAll('.map-drawer-tab')
      .find((button) => button.text().includes('探索') || button.text().includes('Explore'))
    await progressTab.trigger('click')
    await nextTick()

    await wrapper.get('[data-testid="map-trip-history-delete-trip_history_delete_test"]').trigger('click')
    await nextTick()
    expect(mapStore.tripHistory).toEqual([])
  })

  test('keeps destination search on the primary map surface', async () => {
    const input = wrapper.get('[data-testid="map-destination-search"]')

    await input.setValue('Moon Market')
    await nextTick()

    expect(input.element.value).toBe('Moon Market')
    expect(wrapper.get('[data-testid="map-primary-route-card"]').text()).toContain('Moon Market')
  })

  test('requires a visible transport choice, updates the estimate, and locks it after departure', async () => {
    const mapStore = useMapStore()
    await wrapper.get('[data-testid="map-destination-search"]').setValue('Moon Market')
    await nextTick()

    expect(wrapper.get('[data-testid="map-primary-start-trip"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="map-primary-transport-mode"]').text()).toMatch(/Choose transport|选择交通方式/)
    expect(wrapper.find('[data-testid="map-relationship-contact"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-primary-transport-mode"]').trigger('click')
    await nextTick()
    const walk = wrapper.get('[data-testid="map-transport-mode-walk"]')
    const publicTransit = wrapper.get('[data-testid="map-transport-mode-public_transit"]')

    await walk.trigger('click')
    const walkingMinutes = mapStore.tripEstimate.minutes
    await publicTransit.trigger('click')
    await nextTick()

    expect(mapStore.tripForm.transportMode).toBe('public_transit')
    expect(mapStore.tripEstimate.minutes).toBeGreaterThan(0)
    expect(mapStore.tripEstimate.minutes).not.toBe(walkingMinutes)
    expect(wrapper.get('[data-testid="map-trip-start"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-testid="map-trip-start"]').trigger('click')
    await flushPromises()

    expect(mapStore.tripState).toMatchObject({
      status: 'traveling',
      transportMode: 'public_transit',
    })
    expect(wrapper.get('[data-testid="map-journey-phase"]').text()).toMatch(/Departed|已出发/)
    expect(wrapper.get('[data-testid="map-journey-steps"]').findAll('li')).toHaveLength(4)
    expect(wrapper.get('[data-testid="map-primary-journey-phase"]').text()).toMatch(/Departed|已出发/)
    expect(wrapper.get('[data-testid="map-transport-mode-walk"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="map-transport-mode-public_transit"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.find('[data-testid="map-local-place-results"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-destination-search"]').attributes('readonly')).toBeDefined()
    expect(wrapper.find('[data-testid="map-current-location"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-active-journey"]').text()).toMatch(/In transit|行程中/)
    expect(wrapper.get('[data-testid="map-primary-journey-status"]').text()).toMatch(/In transit|行程中/)
    expect(wrapper.get('[data-testid="map-primary-controls"]').findAll('button')).toHaveLength(1)
    expect(wrapper.find('[data-testid="map-relationship-contact"]').exists()).toBe(false)

    const closeDrawer = wrapper
      .get('[data-testid="map-secondary-drawer"]')
      .findAll('button')
      .find((button) => /Close|关闭/.test(button.attributes('aria-label') || ''))
    await closeDrawer.trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="map-secondary-drawer"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-active-journey"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-secondary-drawer"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-journey-phase"]').exists()).toBe(true)
  })

  test('labels legacy active journeys without asserting a transport choice', async () => {
    const mapStore = useMapStore()
    const now = Date.now()
    expect(
      mapStore.restoreFromBackup({
        map: {
          tripState: {
            status: 'traveling',
            from: 'Old home',
            to: 'Old office',
            distanceKm: 3.7,
            fare: 8123,
            durationSeconds: 777,
            startedAt: now,
            etaAt: now + 777_000,
          },
        },
      }),
    ).toBe(true)
    await nextTick()

    expect(wrapper.get('[data-testid="map-primary-route-card"]').text()).toMatch(
      /Legacy journey|旧行程/,
    )
    expect(wrapper.get('[data-testid="map-primary-route-card"]').text()).not.toMatch(
      /Taxi|出租车/,
    )

    await wrapper.get('[data-testid="map-open-places"]').trigger('click')
    await nextTick()
    const tripTab = wrapper
      .get('[data-testid="map-secondary-drawer"]')
      .findAll('.map-drawer-tab')
      .find((button) => button.text().includes('行程') || button.text().includes('Trip'))
    await tripTab.trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-transport-mode-hired_vehicle"]').attributes('aria-checked')).toBe('false')
    expect(wrapper.get('[data-testid="map-transport-mode-hired_vehicle"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="map-journey-phase"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'MapTripControlPanel' }).text()).toMatch(
      /Legacy journey|旧行程/,
    )
  })

  test('keeps moving with a visible checkpoint update and applies review without blocking', async () => {
    const mapStore = useMapStore()
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    mapStore.setJourneyEventRandomValueForTesting(0)
    mapStore.setTripEndpoint('from', 'Home')
    mapStore.setTripEndpoint('to', 'Office')
    mapStore.setTripTransportMode('public_transit')
    expect(mapStore.startTrip().ok).toBe(true)

    const checkpointAt =
      mapStore.tripState.startedAt +
      Math.ceil(mapStore.tripState.durationSeconds * 0.4) * 1000
    vi.setSystemTime(checkpointAt)
    mapStore.tickTripRuntime(checkpointAt)
    await flushPromises()
    await nextTick()

    const etaBeforeReview = mapStore.tripState.etaAt
    expect(mapStore.tripState.phase).toBe('en_route')
    expect(wrapper.find('[data-testid="map-current-location"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-active-journey"]').text()).toMatch(
      /View route update|查看途中情况/,
    )
    expect(wrapper.get('[data-testid="map-primary-journey-event"]').text()).toMatch(
      /Journey continues|行程仍在继续/,
    )
    expect(wrapper.find('[data-testid="map-secondary-drawer"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-primary-journey-event"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-secondary-drawer"]').exists()).toBe(true)
    const eventCard = wrapper.get('[data-testid="map-journey-event-card"]')
    expect(eventCard.text()).toMatch(/Route update|途中情况/)
    expect(eventCard.text()).toMatch(/Journey continues|行程仍在继续/)
    expect(eventCard.text()).toMatch(/Keep current ETA|保持原计划/)
    expect(eventCard.text()).toMatch(/Add 2 min delay|2 分钟延误/)

    const applyOutcomeSpy = vi.spyOn(mapStore, 'applyJourneyEventOutcome')
    await wrapper.get('[data-testid="map-journey-event-continue"]').trigger('click')
    await vi.runAllTicks()
    await flushPromises()
    await nextTick()
    await flushPromises()

    expect(applyOutcomeSpy).toHaveBeenCalledTimes(1)
    expect(await applyOutcomeSpy.mock.results[0].value).toMatchObject({ ok: true })
    await nextTick()
    expect(mapStore.tripState.status).toBe('traveling')
    expect(mapStore.tripState.phase).toBe('en_route')
    expect(mapStore.tripState.activeInterruption).toBeNull()
    expect(mapStore.tripState.etaAt).toBe(etaBeforeReview)
    expect(wrapper.find('[data-testid="map-journey-event-card"]').exists()).toBe(false)
    expect(simulationStore.mapJourneyEventProposals[0]).toMatchObject({
      status: 'applied',
      selectedOutcome: 'continue',
    })
  })

  test('offers safe recovery when the persisted event is no longer pending', async () => {
    const mapStore = useMapStore()
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    mapStore.setJourneyEventRandomValueForTesting(0)
    mapStore.setTripEndpoint('from', 'Home')
    mapStore.setTripEndpoint('to', 'Office')
    mapStore.setTripTransportMode('public_transit')
    expect(mapStore.startTrip().ok).toBe(true)

    const checkpointAt =
      mapStore.tripState.startedAt +
      Math.ceil(mapStore.tripState.durationSeconds * 0.4) * 1000
    vi.setSystemTime(checkpointAt)
    mapStore.tickTripRuntime(checkpointAt)
    await flushPromises()
    await nextTick()

    const proposal = simulationStore.mapJourneyEventProposals[0]
    const reviewed = simulationStore.reviewMapJourneyEventProposal(
      proposal.id,
      'continue',
      { at: checkpointAt },
    )
    expect(reviewed.ok).toBe(true)
    simulationStore.finalizeMapJourneyEventProposal(proposal.id, {
      outcome: 'continue',
      applied: true,
      at: checkpointAt,
    })
    await nextTick()

    await wrapper.get('[data-testid="map-primary-journey-event"]').trigger('click')
    await nextTick()

    const eventCard = wrapper.get('[data-testid="map-journey-event-card"]')
    expect(eventCard.text()).toMatch(/Event record unavailable|事件记录暂不可用/)
    expect(wrapper.find('[data-testid="map-journey-event-continue"]').exists()).toBe(false)

    const recoverSpy = vi.spyOn(mapStore, 'recoverJourneyEventInterruption')
    await wrapper.get('[data-testid="map-journey-event-recover"]').trigger('click')
    await vi.runAllTicks()
    await flushPromises()
    await nextTick()
    await flushPromises()
    expect(recoverSpy).toHaveBeenCalledTimes(1)
    expect(await recoverSpy.mock.results[0].value).toMatchObject({ ok: true })
    await nextTick()

    expect(mapStore.tripState).toMatchObject({
      status: 'traveling',
      phase: 'en_route',
      activeInterruption: null,
    })
    expect(wrapper.find('[data-testid="map-journey-event-card"]').exists()).toBe(false)
  })

  test('searches current-world pins locally and focuses the selected result', async () => {
    const mapStore = useMapStore()
    const smPlace = mapStore.activeMapPlaces.find((place) => place.placeId === 'seoul-sm-hq')
    const mapScene = wrapper.findComponent({ name: 'MapSceneCanvas' })
    const initialRequestId = mapScene.props('focusPosition').focusRequestId

    await wrapper.get('[data-testid="map-destination-search"]').setValue('SM')
    await nextTick()

    expect(wrapper.get('[data-testid="map-local-search-scope"]').text()).toContain(
      String(mapStore.activeMapPlaces.filter((place) => place.position).length),
    )
    await wrapper
      .get('[data-testid="map-local-place-results"]')
      .get('.map-place-result')
      .trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-place-detail-sheet"]').text()).toContain('SM')
    expect(mapScene.props('focusPosition')).toMatchObject({
      ...smPlace.position,
      focusRequestId: initialRequestId + 1,
    })
  })

  test('opens local discovery on focus and filters suggestions by category', async () => {
    const mapStore = useMapStore()
    const input = wrapper.get('[data-testid="map-destination-search"]')

    await input.trigger('focus')
    await nextTick()

    expect(wrapper.get('[data-testid="map-local-place-results"]').text()).toMatch(
      /Recent and suggested|最近与推荐/,
    )
    expect(wrapper.get('[data-testid="map-search-categories"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-local-place-results"]').findAll('.map-place-result').length).toBeGreaterThan(0)

    await wrapper.get('[data-testid="map-search-category-transit"]').trigger('click')
    await nextTick()

    const expectedTransitCount = mapStore.activeMapPlaces.filter(
      (place) => place.position && place.category === 'transit',
    ).length
    expect(wrapper.get('[data-testid="map-search-category-transit"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="map-local-place-results"]').findAll('.map-place-result')).toHaveLength(
      Math.min(6, expectedTransitCount),
    )
  })

  test('closes local discovery when the map itself is clicked', async () => {
    const input = wrapper.get('[data-testid="map-destination-search"]')

    await input.trigger('focus')
    await nextTick()
    expect(wrapper.get('[data-testid="map-local-place-results"]').exists()).toBe(true)

    wrapper.findComponent({ name: 'MapSceneCanvas' }).vm.$emit('map-interact')
    await nextTick()

    expect(wrapper.find('[data-testid="map-local-place-results"]').exists()).toBe(false)
  })

  test('supports multi-term and typo-tolerant place discovery with visible match reasons', async () => {
    const input = wrapper.get('[data-testid="map-destination-search"]')

    await input.setValue('江南 美容')
    await nextTick()

    const salonResults = wrapper.get('[data-testid="map-local-place-results"]')
    expect(salonResults.text()).toContain('Jenny House')
    expect(salonResults.text()).not.toContain('Starship')
    expect(salonResults.text()).toMatch(/Alias: 美容室|别名：美容室/)

    await input.setValue('Hongde')
    await nextTick()

    const typoResults = wrapper.get('[data-testid="map-local-place-results"]')
    expect(typoResults.text()).toMatch(/Hongik University Street|弘大入口/)
    expect(typoResults.text()).toMatch(/Close spelling|拼写接近/)
  })

  test('keeps free-form destinations explicit and offers Places when nothing matches', async () => {
    const input = wrapper.get('[data-testid="map-destination-search"]')

    await input.setValue('North river rendezvous')
    await nextTick()

    expect(wrapper.get('[data-testid="map-use-freeform-destination"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-search-browse-places"]').exists()).toBe(true)

    await wrapper.get('[data-testid="map-use-freeform-destination"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="map-local-place-results"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-primary-route-card"]').text()).toContain(
      'North river rendezvous',
    )

    await input.trigger('focus')
    await nextTick()
    await wrapper.get('[data-testid="map-search-browse-places"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-secondary-drawer"]').text()).toMatch(
      /Manage places and pins|管理地点与图钉/,
    )
  })

  test('uses distinct shared category visuals for map pins', () => {
    const pins = wrapper.findComponent({ name: 'MapSceneCanvas' }).props('pins')
    const homePin = pins.find((place) => place.source === 'user' && place.category === 'home')
    const workPin = pins.find((place) => place.source === 'user' && place.category === 'work')

    expect(homePin.icon).toBe('fas fa-house')
    expect(workPin.icon).toBe('fas fa-building')
    expect(homePin.tone).not.toBe(workPin.tone)
  })

  test('keeps map selection world-bound and routes management to Map settings', async () => {
    expect(wrapper.find('[data-testid^="map-pack-"]').exists()).toBe(false)
    expect(wrapper.get('[data-map-pack="real-seoul-v1"]').exists()).toBe(true)

    await wrapper.get('[data-testid="map-open-settings"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/map/settings')
  })

  test('routes place management from the Places drawer', async () => {
    await wrapper.get('[data-testid="map-open-places"]').trigger('click')
    await nextTick()

    await wrapper.get('[data-testid="map-manage-places"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/map/settings/places')
  })

  test('creates a categorized place through explicit map placement and opens its detail', async () => {
    const mapStore = useMapStore()
    await wrapper.get('[data-testid="map-open-places"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="map-add-place-drawer"]').trigger('click')
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
    expect(wrapper.findComponent({ name: 'MapSceneCanvas' }).props('focusPosition')).toMatchObject({
      kind: 'geo',
      lat: 37.5444,
      lng: 127.0441,
    })
    expect(wrapper.get('[data-testid="map-place-detail-sheet"]').text()).toContain('北岸排练室')
    expect(wrapper.get('[data-testid="map-place-detail-sheet"]').text()).toContain('城东区排练楼 3F')
  })

  test('leaves the Places drawer for map placement and preserves the draft on cancel', async () => {
    await wrapper.get('[data-testid="map-open-places"]').trigger('click')
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
    expect(mapStore.setTripTransportMode('walk').ok).toBe(true)
    expect(mapStore.startTrip().ok).toBe(true)
    await nextTick()

    await wrapper.get('[data-testid="map-open-places"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="map-add-place-drawer"]').trigger('click')
    await wrapper.get('[data-testid="map-place-name"]').setValue('途中便利店')
    await wrapper.get('[data-testid="map-place-detail"]').setValue('汉江沿线补给点')
    await wrapper.get('[data-testid="map-choose-pin"]').trigger('click')
    await nextTick()

    const mapScene = wrapper.findComponent({ name: 'MapSceneCanvas' })
    expect(mapScene.props('allowPinPlacement')).toBe(true)
    mapScene.vm.$emit('select-pin', mapStore.activeMapPlaces[0])
    await nextTick()
    expect(wrapper.get('[data-testid="map-placement-mode"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="map-place-detail-sheet"]').exists()).toBe(false)
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
    expect(wrapper.find('[data-testid="map-shared-journey-record"]').exists()).toBe(false)
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

    expect(wrapper.get('[data-testid="map-active-journey"]').text()).toMatch(/Arrived|已到达/)
    expect(wrapper.get('[data-testid="map-current-location"]').exists()).toBe(true)
    await wrapper.get('[data-testid="map-active-journey"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-shared-journey-record"]').text()).toMatch(
      /Shared journey record|共同出行记录/,
    )
    expect(wrapper.get('[data-testid="map-relationship-contact"]').text()).toMatch(
      /Solo or not recorded|独自出行或暂不记录/,
    )
    await wrapper.get('[data-testid="map-relationship-contact"]').setValue('1')
    await wrapper.get('[data-testid="map-trip-acknowledge"]').trigger('click')
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
