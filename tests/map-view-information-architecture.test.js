import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import MapView from '../src/views/MapView.vue'
import { isMapPlaceCategoryDiscoveryOnly } from '../src/lib/map-place-categories'
import { useMapStore } from '../src/stores/map'
import { useMusicStore } from '../src/stores/music'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { SIMULATION_SURPRISE_MODE, useSimulationStore } from '../src/stores/simulation'
import { useSystemStore } from '../src/stores/system'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'

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
      { path: '/chat', component: DummyView },
      { path: '/music', component: DummyView },
    ],
  })

describe('MapView information architecture', () => {
  let wrapper = null
  let router = null

  beforeEach(async () => {
    localStorage.clear()
    resetDialogServiceForTest()
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
    const primaryControls = wrapper.get('[data-testid="map-primary-controls"]')
    expect(primaryControls.findAll('button')).toHaveLength(5)
    expect(wrapper.get('[data-testid="map-current-location"]').text()).toMatch(
      /Role location|角色位置/,
    )
    expect(wrapper.get('[data-testid="map-set-current-location"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-open-trip"]').text()).toMatch(/Journey|行程/)
    expect(wrapper.get('[data-testid="map-open-places"]').text()).toMatch(/Places|地点/)
    expect(wrapper.get('[data-testid="map-open-progress"]').text()).toMatch(/Footprints|足迹/)
    expect(wrapper.find('[data-testid="map-add-place"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="map-secondary-drawer"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-open-places"]').trigger('click')
    await nextTick()

    const drawer = wrapper.get('[data-testid="map-secondary-drawer"]')
    expect(drawer.exists()).toBe(true)
    expect(wrapper.find('[data-testid="map-add-place-drawer"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-manage-places"]').text()).toMatch(
      /Add or manage places and pins|新增或管理地点与图钉/,
    )
    expect(drawer.findAll('.map-drawer-tab')).toHaveLength(0)
    expect(wrapper.findComponent({ name: 'MapTripControlPanel' }).isVisible()).toBe(false)
    expect(wrapper.get('[data-testid="map-visual-image-source"]').isVisible()).toBe(false)
  })

  test('reveals bounded music and radio controls only during an active journey', async () => {
    const mapStore = useMapStore()
    const musicStore = useMusicStore()
    expect(wrapper.find('[data-testid="map-journey-media-button"]').exists()).toBe(false)

    mapStore.setTripEndpoint('to', 'Journey media destination')
    expect(mapStore.setTripTransportMode('walk').ok).toBe(true)
    expect(mapStore.startTrip().ok).toBe(true)
    await nextTick()

    const mediaButton = wrapper.get('[data-testid="map-journey-media-button"]')
    expect(mediaButton.attributes('aria-label')).toMatch(/Journey music and radio|行程音乐与电台/)
    await mediaButton.trigger('click')
    await nextTick()

    const mediaDrawer = wrapper.get('[data-testid="map-journey-media-drawer"]')
    expect(mediaDrawer.get('[data-testid="map-journey-media-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="map-secondary-drawer"]').exists()).toBe(false)
    await mediaDrawer.get('[data-testid="map-journey-radio-tab"]').trigger('click')
    await nextTick()
    expect(mediaDrawer.findAll('[data-testid^="map-journey-station-"]')).toHaveLength(3)
    expect(mediaDrawer.html()).not.toContain('soundhelix.com')
    expect(mediaDrawer.html()).not.toContain('mediaId')

    await mediaDrawer.get('[data-testid="map-open-music-floating"]').trigger('click')
    await nextTick()
    expect(musicStore.floatingPlayerVisible).toBe(true)
    expect(musicStore.floatingPlayerExpanded).toBe(true)
    expect(wrapper.find('[data-testid="map-journey-media-drawer"]').exists()).toBe(true)

    const closeMediaDrawer = mediaDrawer
      .findAll('button')
      .find((button) => /Close|关闭/.test(button.attributes('aria-label') || ''))
    await closeMediaDrawer.trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="map-journey-media-drawer"]').exists()).toBe(false)
    expect(musicStore.floatingPlayerVisible).toBe(true)

    expect(mapStore.cancelTrip()).toBe(true)
    await nextTick()
    expect(wrapper.find('[data-testid="map-journey-media-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="map-journey-media-drawer"]').exists()).toBe(false)
    expect(musicStore.floatingPlayerVisible).toBe(true)
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

  test('runs the explicit K-pop place-session event flow and returns to the owning place', async () => {
    const mapStore = useMapStore()
    const simulationStore = useSimulationStore()
    useSystemStore().setGlobalWorldview(
      'Present-day Seoul with a realistic K-pop production and everyday social setting.',
    )
    const place = mapStore.activeMapPlaces.find((item) => item.placeId === 'seoul-mbc-hq')
    mapStore.setCurrentLocation({
      label: place.nameEn,
      detail: place.detailEn,
      source: 'map_pack',
      mapPackId: place.mapPackId,
      placeId: place.placeId,
      position: place.position,
    })
    const mapScene = wrapper.findComponent({ name: 'MapSceneCanvas' })
    mapScene.vm.$emit('select-pin', place)
    await nextTick()

    const destinationBeforeCurrentAction = mapStore.tripForm.to
    const currentAction = wrapper.get('[data-testid="map-place-current-location-action"]')
    expect(currentAction.text()).toMatch(/Go|前往/)
    expect(currentAction.classes()).toContain('is-current')
    await currentAction.trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-place-primary-action-notice"]').text()).toMatch(
      /You are currently here|目前正在此处/,
    )
    expect(mapStore.tripForm.to).toBe(destinationBeforeCurrentAction)
    expect(wrapper.find('[data-testid="map-primary-route-card"]').exists()).toBe(false)

    expect(wrapper.get('[data-testid="map-place-enter"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="map-place-event-invitation"]').exists()).toBe(false)
    await wrapper.get('[data-testid="map-place-enter"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-place-event-invitation"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-current-location-action"]').classes()).toContain(
      'is-current',
    )
    expect(wrapper.get('[data-testid="map-place-leave"]').exists()).toBe(true)
    expect(simulationStore.eventInstances).toHaveLength(0)
    await wrapper.get('[data-testid="map-place-expand-event"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="map-place-detail-sheet"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-event-surface-sheet"]').attributes('role')).toBe('dialog')
    expect(wrapper.get('[data-testid="map-event-choices"]').findAll('button')).toHaveLength(3)
    expect(simulationStore.eventInstances).toHaveLength(1)

    await wrapper.get('[data-testid="map-event-choice-review_brief"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-event-consequence"]').exists()).toBe(true)
    expect(simulationStore.eventInstances[0]).toMatchObject({
      lifecycle: 'resolved',
      choices: { selectedId: 'review_brief', outcomeId: 'brief_reviewed' },
      outcome: {
        requestState: 'validated',
        ownerResultCode: 'PLACE_SESSION_EVENT_RESOLUTION_VALID',
      },
    })

    await wrapper.get('[data-testid="map-event-return"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-place-detail-sheet"]').text()).toContain('MBC')
    expect(wrapper.get('[data-testid="map-place-leave"]').exists()).toBe(true)
    await wrapper.get('[data-testid="map-place-leave"]').trigger('click')
    await nextTick()
    expect(mapStore.placeSession.state).toBe('left')
    expect(wrapper.find('[data-testid="map-place-event-invitation"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-enter"]').exists()).toBe(true)
  })

  test('previews the event surface at any entered place without persisting runtime history', async () => {
    const mapStore = useMapStore()
    const simulationStore = useSimulationStore()
    const place = mapStore.activeMapPlaces.find((item) => item.placeId === 'address:1')
    wrapper.findComponent({ name: 'MapSceneCanvas' }).vm.$emit('select-pin', place)
    await nextTick()

    await wrapper.get('[data-testid="map-place-enter"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="map-place-event-invitation"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-event-preview"]').exists()).toBe(true)

    await wrapper.get('[data-testid="map-place-preview-event"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-event-surface-sheet"]').text()).toMatch(
      /测试预览|Test preview/,
    )
    expect(wrapper.get('[data-testid="map-event-choices"]').findAll('button')).toHaveLength(3)
    expect(simulationStore.eventInstances).toHaveLength(0)

    await wrapper.get('[data-testid="map-event-choice-check_equipment"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-event-consequence"]').exists()).toBe(true)
    expect(simulationStore.eventInstances).toHaveLength(0)

    await wrapper.get('[data-testid="map-event-return"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-place-detail-sheet"]').text()).toContain('家')
  })

  test('allows explicit place entry from a mobile-scale nearby position', async () => {
    const mapStore = useMapStore()
    const place = mapStore.activeMapPlaces.find((item) => item.placeId === 'seoul-mbc-hq')
    mapStore.setCurrentLocation({
      label: 'Near MBC',
      detail: 'About seven meters from MBC',
      source: 'map_point',
      mapPackId: place.mapPackId,
      position: {
        ...place.position,
        lat: place.position.lat + 0.000063,
      },
    })

    wrapper.findComponent({ name: 'MapSceneCanvas' }).vm.$emit('select-pin', place)
    await nextTick()

    expect(wrapper.get('[data-testid="map-place-context"]').text()).toMatch(
      /距当前位置 7 米 · 可进入|7 m away · Entry available/,
    )
    expect(wrapper.get('[data-testid="map-place-enter"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="map-place-use-destination"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-place-enter"]').trigger('click')
    await nextTick()

    expect(mapStore.currentLocation).toMatchObject({
      source: 'place_entry',
      placeId: place.placeId,
      position: place.position,
    })
    expect(mapStore.placeSession).toMatchObject({ state: 'inside', placeId: place.placeId })
  })

  test('persists a blank map point as the role position and locks reselection during a journey', async () => {
    const mapStore = useMapStore()
    const mapScene = wrapper.findComponent({ name: 'MapSceneCanvas' })
    const selectedPosition = { kind: 'geo', lat: 37.4978, lng: 127.0275 }

    await wrapper.get('[data-testid="map-set-current-location"]').trigger('click')
    await nextTick()

    expect(mapScene.props('allowPinPlacement')).toBe(true)
    expect(wrapper.get('[data-testid="map-role-position-mode"]').text()).toMatch(
      /Tap a blank map point or choose an existing place pin|点击地图空白处，或选择已有地点图钉/,
    )

    mapScene.vm.$emit('place-pin', { position: selectedPosition })
    await nextTick()

    expect(mapStore.currentLocation).toMatchObject({
      source: 'map_point',
      mapPackId: 'real-seoul-v1',
      position: selectedPosition,
    })
    expect(mapStore.tripForm.from).toBe('37.49780, 127.02750')
    expect(mapStore.createBackupSnapshot().currentLocation).toMatchObject({
      source: 'map_point',
      position: selectedPosition,
    })
    expect(mapScene.props('pins')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          placeId: 'map-role-position',
          source: 'role_position',
          position: selectedPosition,
        }),
      ]),
    )
    expect(wrapper.get('[data-testid="map-role-position-feedback"]').text()).toMatch(
      /Role position updated|角色位置已更新/,
    )

    const nearbyDestination = mapStore.activeMapPlaces.find(
      (place) => place.placeId === 'seoul-samsung-town',
    )
    mapStore.setTripEndpoint('to', nearbyDestination.detailZh)
    expect(mapStore.tripEstimate.distanceKm).toBeCloseTo(0.141, 3)

    expect(mapStore.setTripTransportMode('walk').ok).toBe(true)
    expect(mapStore.startTrip().ok).toBe(true)
    await nextTick()

    expect(wrapper.find('[data-testid="map-set-current-location"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-current-location"]').text()).toMatch(
      /Start position|出发位置/,
    )
  })

  test('confirms an existing place pin as the role position and layers it above the role marker', async () => {
    const mapStore = useMapStore()
    const mapScene = wrapper.findComponent({ name: 'MapSceneCanvas' })
    const place = mapStore.activeMapPlaces.find((item) => item.placeId === 'seoul-mbc-hq')
    const originalPlaceId = mapStore.currentLocation.placeId
    const { dialogState, submitDialog } = useDialog()

    await wrapper.get('[data-testid="map-set-current-location"]').trigger('click')
    mapScene.vm.$emit('select-pin', place)
    await nextTick()

    expect(dialogState.visible).toBe(true)
    expect(dialogState.title).toMatch(/Set role position here|将角色位置设为这里/)
    expect(mapStore.currentLocation.placeId).toBe(originalPlaceId)

    submitDialog()
    await flushPromises()

    expect(mapStore.currentLocation).toMatchObject({
      source: 'map_place',
      placeId: place.placeId,
      position: place.position,
    })
    expect(wrapper.get('[data-testid="map-role-position-feedback"]').text()).toMatch(
      /Role position updated|角色位置已更新/,
    )

    const pins = mapScene.props('pins')
    expect(pins.findIndex((pin) => pin.source === 'role_position')).toBeLessThan(
      pins.findIndex((pin) => pin.placeId === place.placeId),
    )
  })

  test('opens Journey, Places, and Footprints from three independent map buttons', async () => {
    const expectations = [
      ['map-open-trip', /Journey|行程计划/],
      ['map-open-places', /Places|地点/],
      ['map-open-progress', /Footprints|足迹/],
    ]

    for (const [testId, title] of expectations) {
      await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
      await nextTick()
      const drawer = wrapper.get('[data-testid="map-secondary-drawer"]')
      expect(drawer.get('h2').text()).toMatch(title)
      expect(drawer.findAll('.map-drawer-tab')).toHaveLength(0)
    }
  })

  test('switches Map-owned place names without mutating canonical place data', async () => {
    const mapStore = useMapStore()
    const place = mapStore.activeMapPlaces.find(
      (item) => item.placeId === 'seoul-yeouido-hangang-park',
    )
    const mapScene = wrapper.findComponent({ name: 'MapSceneCanvas' })

    mapScene.vm.$emit('select-pin', place)
    await nextTick()

    const detail = wrapper.get('[data-testid="map-place-detail-sheet"]')
    expect(detail.get('h2').text()).toBe('汝矣岛汉江公园')
    expect(detail.get('[data-testid="map-place-context"]').text()).toMatch(
      /from current position|距当前位置/,
    )
    expect(mapStore.mapPlaceDisplayMode).toBe('system')
    mapStore.setMapPlaceDisplayMode('en')
    await nextTick()
    expect(detail.get('h2').text()).toBe('Yeouido Hangang Park')
    expect(
      mapScene.props('pins').find((item) => item.placeId === place.placeId)?.name,
    ).toBe('Yeouido Hangang Park')

    mapStore.setMapPlaceDisplayMode('bilingual')
    await nextTick()
    expect(detail.get('h2').text()).toBe('汝矣岛汉江公园')
    expect(detail.get('[data-testid="map-place-secondary-name"]').text()).toBe(
      'Yeouido Hangang Park',
    )
    await detail.get('[data-testid="map-place-open-detail"]').trigger('click')
    await nextTick()
    expect(detail.get('[data-testid="map-place-secondary-detail"]').text()).toBe(
      '330 Yeouidong-ro, Yeongdeungpo-gu, Seoul',
    )
    expect(place).toMatchObject({
      nameZh: '汝矣岛汉江公园',
      nameEn: 'Yeouido Hangang Park',
    })

    await detail.get('button[aria-label="关闭"]').trigger('click')
    await wrapper.get('[data-testid="map-destination-search"]').trigger('focus')
    await wrapper.get('[data-testid="map-destination-search"]').setValue('Yeouido')
    await nextTick()
    expect(wrapper.get('[data-testid="map-local-place-results"]').text()).toContain(
      '汝矣岛汉江公园',
    )
    expect(wrapper.get('[data-testid="map-local-place-results"]').text()).toContain(
      'Yeouido Hangang Park',
    )

    await wrapper.get('[data-testid="map-open-places"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-filtered-place-list"]').text()).toContain(
      '汝矣岛汉江公园',
    )
    expect(wrapper.get('[data-testid="map-filtered-place-list"]').text()).toContain(
      'Yeouido Hangang Park',
    )
  })

  test('restores a hidden selected pin without projecting trip history into the place card', async () => {
    const mapStore = useMapStore()
    const place = mapStore.activeMapPlaces.find(
      (item) => item.placeId === 'seoul-gyeongbokgung',
    )
    const now = Date.now()
    expect(mapStore.restoreFromBackup({
      map: {
        tripHistory: [
          {
            id: 'trip_hist_exact_gyeongbokgung',
            status: 'arrived',
            mapPackId: 'real-seoul-v1',
            from: 'Seoul Station',
            to: 'Gyeongbokgung Palace',
            destinationPlaceId: 'seoul-gyeongbokgung',
            durationSeconds: 900,
            startedAt: now - 901_000,
            endedAt: now - 1000,
          },
          {
            id: 'trip_hist_legacy_text_only',
            status: 'arrived',
            mapPackId: 'real-seoul-v1',
            from: 'Seoul Station',
            to: 'Gyeongbokgung Palace',
            durationSeconds: 900,
            startedAt: now - 1_801_000,
            endedAt: now - 901_000,
          },
        ],
      },
    })).toBe(true)
    mapStore.setMapPlaceVisibility(place.placeId, false)
    await nextTick()

    wrapper.findComponent({ name: 'MapSceneCanvas' }).vm.$emit('select-pin', place)
    await nextTick()

    expect(wrapper.get('[data-testid="map-place-pin-hidden"]').text()).toMatch(
      /hidden from the map|没有显示在地图上/,
    )
    await wrapper.get('[data-testid="map-place-show-pin"]').trigger('click')
    await nextTick()
    expect(mapStore.isMapPlaceVisible(place)).toBe(true)

    await wrapper.get('[data-testid="map-place-open-detail"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="map-place-footprints-section"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-detail-view"]').text()).not.toMatch(
      /completed visit|次到访/,
    )
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
    expect(wrapper.get('[data-testid="map-place-filter-residence"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-filter-convenience_store"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-filter-medical"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-filter-leisure"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-filter-city_services"]').exists()).toBe(true)

    const expectedResidenceCount = mapStore.activeMapPlaces.filter((place) =>
      ['home', 'residence_budget', 'residence_standard', 'residence_premium', 'residence_luxury']
        .includes(place.category),
    ).length
    expect(wrapper.get('[data-testid="map-place-filter-residence"]').text()).toContain(
      String(expectedResidenceCount),
    )

    await wrapper.get('[data-testid="map-place-filter-leisure"]').trigger('click')
    await nextTick()
    const expectedLeisureCount = mapStore.activeMapPlaces.filter((place) =>
      ['leisure', 'restaurant', 'nightlife', 'fitness', 'cinema', 'park'].includes(place.category),
    ).length
    expect(wrapper.get('[data-testid="map-filtered-place-list"]').findAll('.map-place-list-row')).toHaveLength(
      expectedLeisureCount,
    )
    expect(wrapper.get('[data-testid="map-filtered-place-list"]').text()).toContain('CGV')

    await wrapper.get('[data-testid="map-place-filter-transit"]').trigger('click')
    await nextTick()

    const expectedTransitCount = mapStore.activeMapPlaces.filter(
      (place) => ['transit', 'transit_hub'].includes(place.category),
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

  test('keeps undiscovered facilities out of map, search, and Places until Footprints reveal them', async () => {
    const mapStore = useMapStore()
    const mapScene = wrapper.findComponent({ name: 'MapSceneCanvas' })
    expect(mapStore.setMapPlaceKnowledgeMode('footprint_gated')).toBe(true)
    await nextTick()

    expect(mapStore.activeMapPlaces.some((place) => place.id === 'seoul-cu-bgf-hq')).toBe(false)
    expect(mapScene.props('pins').some((pin) => pin.placeId === 'seoul-cu-bgf-hq')).toBe(false)

    await wrapper.get('[data-testid="map-destination-search"]').setValue('CU BGF')
    await nextTick()
    expect(wrapper.get('[data-testid="map-local-place-results"]').text()).not.toContain('CU BGF')

    await wrapper.get('[data-testid="map-search-browse-places"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="map-place-filter-convenience_store"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-filtered-place-list"]').text()).not.toContain('CU BGF')

    expect(mapStore.restoreFromBackup({
      map: {
        mapPlaceKnowledgeByWorld: {
          default_world: {
            mode: 'footprint_gated',
            discoveriesByMapPack: {
              'real-seoul-v1': {
                placeIds: ['seoul-cu-bgf-hq'],
                evidenceByPlaceId: {
                  'seoul-cu-bgf-hq': {
                    sourceType: 'trip_arrival',
                    sourceId: 'trip_hist_discovery_ui',
                    discoveredAt: Date.now(),
                  },
                },
              },
            },
          },
        },
      },
    })).toBe(true)
    await nextTick()

    await wrapper.get('[data-testid="map-open-progress"]').trigger('click')
    await nextTick()
    expect(wrapper.get('[data-testid="map-footprints-discovery"]').text()).toContain('CU BGF')
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

    await wrapper.get('[data-testid="map-open-progress"]').trigger('click')
    await nextTick()

    await wrapper.get('[data-testid="map-trip-history-delete-trip_history_delete_test"]').trigger('click')
    await nextTick()
    expect(mapStore.tripHistory).toEqual([])
  })

  test('keeps destination discovery on the primary map surface and requires explicit planning', async () => {
    const input = wrapper.get('[data-testid="map-destination-search"]')

    await input.setValue('Moon Market')
    await nextTick()

    expect(input.element.value).toBe('Moon Market')
    expect(wrapper.find('[data-testid="map-primary-route-card"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-use-freeform-destination"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-primary-route-card"]').text()).toContain('Moon Market')
  })

  test('lets journey endpoints be selected from current-world places as well as typed', async () => {
    const mapStore = useMapStore()
    const gangnamStation = mapStore.activeMapPlaces.find(
      (place) => place.placeId === 'seoul-gangnam-station',
    )
    expect(mapStore.setCurrentLocation({
      label: gangnamStation.nameZh,
      detail: gangnamStation.detailZh,
      source: 'map_pack',
      mapPackId: mapStore.activeMapPackId,
      position: gangnamStation.position,
      syncTripOrigin: true,
    })).toBe(true)
    const input = wrapper.get('[data-testid="map-destination-search"]')
    await input.setValue('Moon Market')
    await nextTick()
    await wrapper.get('[data-testid="map-use-freeform-destination"]').trigger('click')
    await wrapper.get('[data-testid="map-open-trip-drawer"]').trigger('click')
    await nextTick()

    const fromPicker = wrapper.get('[data-testid="map-trip-from-picker"]')
    const rolePositionOption = fromPicker
      .findAll('option')
      .find((option) => /Role position|角色位置/.test(option.text()))
    expect(rolePositionOption).toBeTruthy()
    expect(rolePositionOption.attributes('value')).toBe(gangnamStation.detailZh)
    expect(rolePositionOption.text()).toContain(gangnamStation.nameZh)
    await fromPicker.setValue(rolePositionOption.attributes('value'))
    expect(mapStore.tripForm.from).toBe(rolePositionOption.attributes('value'))

    const toPicker = wrapper.get('[data-testid="map-trip-to-picker"]')
    const worldPlaceOption = toPicker
      .findAll('option')
      .find((option) => /Samsung Town|三星城/.test(option.text()))
    expect(worldPlaceOption).toBeTruthy()
    await toPicker.setValue(worldPlaceOption.attributes('value'))

    expect(mapStore.tripForm.to).toBe(worldPlaceOption.attributes('value'))
    expect(wrapper.get('[data-testid="map-trip-to-input"]').element.value).toBe(
      worldPlaceOption.attributes('value'),
    )
    expect(mapStore.tripEstimate.distanceKm).toBeCloseTo(0.155, 3)
  })

  test('requires a visible transport choice, updates the estimate, and locks it after departure', async () => {
    const mapStore = useMapStore()
    await wrapper.get('[data-testid="map-destination-search"]').setValue('Moon Market')
    await nextTick()
    await wrapper.get('[data-testid="map-use-freeform-destination"]').trigger('click')
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
    expect(wrapper.get('[data-testid="map-destination-search"]').attributes('readonly')).toBeUndefined()
    expect(wrapper.get('[data-testid="map-current-location"]').text()).toMatch(
      /Start position|出发位置/,
    )
    expect(wrapper.get('[data-testid="map-active-journey"]').text()).toMatch(/In transit|行程中/)
    expect(wrapper.get('[data-testid="map-primary-journey-status"]').text()).toMatch(/In transit|行程中/)
    expect(wrapper.get('[data-testid="map-primary-controls"]').findAll('button')).toHaveLength(5)
    expect(wrapper.get('[data-testid="map-open-trip"]').text()).toMatch(/In transit|行程中/)
    expect(wrapper.get('[data-testid="map-open-places"]').text()).toMatch(/Places|地点/)
    expect(wrapper.get('[data-testid="map-open-progress"]').text()).toMatch(/Footprints|足迹/)
    expect(wrapper.get('[data-testid="map-journey-media-button"]').attributes('aria-label')).toMatch(
      /Journey music and radio|行程音乐与电台/,
    )
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

  test('keeps place search available as read-only browsing during an active journey', async () => {
    const mapStore = useMapStore()
    const input = wrapper.get('[data-testid="map-destination-search"]')

    await input.setValue('Trip destination')
    await wrapper.get('[data-testid="map-use-freeform-destination"]').trigger('click')
    await wrapper.get('[data-testid="map-primary-transport-mode"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="map-transport-mode-walk"]').trigger('click')
    await wrapper.get('[data-testid="map-trip-start"]').trigger('click')
    await flushPromises()

    const lockedDestination = mapStore.tripState.to
    const routeCardBeforeBrowse = wrapper.get('[data-testid="map-primary-route-card"]').text()
    const closeDrawer = wrapper
      .get('[data-testid="map-secondary-drawer"]')
      .findAll('button')
      .find((button) => /Close|关闭/.test(button.attributes('aria-label') || ''))
    await closeDrawer.trigger('click')
    await input.setValue('SM')
    await nextTick()

    expect(input.attributes('readonly')).toBeUndefined()
    expect(mapStore.tripState.to).toBe(lockedDestination)
    expect(mapStore.tripForm.to).toBe(lockedDestination)
    expect(wrapper.get('[data-testid="map-search-journey-lock"]').text()).toMatch(
      /destination is locked|目的地已锁定/,
    )

    await wrapper
      .get('[data-testid="map-local-place-results"]')
      .get('.map-place-result')
      .trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-place-context"]').text()).toMatch(
      /Active journey|当前行程中/,
    )
    expect(wrapper.find('[data-testid="map-place-use-destination"]').exists()).toBe(false)
    expect(wrapper.find('.map-place-detail-actions').exists()).toBe(false)
    expect(wrapper.get('[data-testid="map-place-view-journey"]').text()).toMatch(
      /View journey|查看行程/,
    )
    expect(mapStore.tripState.to).toBe(lockedDestination)
    expect(wrapper.get('[data-testid="map-primary-route-card"]').text()).toBe(routeCardBeforeBrowse)

    await wrapper.get('[data-testid="map-place-view-journey"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-secondary-drawer"]').exists()).toBe(true)
    expect(mapStore.tripState.to).toBe(lockedDestination)
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

    await wrapper.get('[data-testid="map-open-trip"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-transport-mode-hired_vehicle"]').attributes('aria-checked')).toBe('false')
    expect(wrapper.get('[data-testid="map-transport-mode-hired_vehicle"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="map-journey-phase"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'MapTripControlPanel' }).text()).toMatch(
      /Legacy journey|旧行程/,
    )
  })

  test('keeps the generic checkpoint route event disabled on the production Map surface', async () => {
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

    expect(mapStore.tripState.phase).toBe('en_route')
    expect(simulationStore.mapJourneyEventProposals).toHaveLength(0)
    expect(wrapper.find('[data-testid="map-primary-journey-event"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="map-journey-event-card"]').exists()).toBe(false)
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
    mapStore.setJourneyCheckpointEventEvaluationEnabled(true)

    const checkpointAt =
      mapStore.tripState.startedAt +
      Math.ceil(mapStore.tripState.durationSeconds * 0.4) * 1000
    vi.setSystemTime(checkpointAt)
    mapStore.tickTripRuntime(checkpointAt)
    await flushPromises()
    await nextTick()

    const etaBeforeReview = mapStore.tripState.etaAt
    expect(mapStore.tripState.phase).toBe('en_route')
    expect(wrapper.get('[data-testid="map-current-location"]').text()).toMatch(
      /Start position|出发位置/,
    )
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
    mapStore.setJourneyCheckpointEventEvaluationEnabled(true)

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

  test('restores a shared place detail and prepares an internal Chat share', async () => {
    await router.push('/map?placeId=seoul-sm-hq')
    await nextTick()
    await flushPromises()

    expect(wrapper.get('[data-testid="map-place-detail-sheet"]').text()).toContain('SM')
    await wrapper.get('[data-testid="map-place-open-detail"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="map-place-share-chat"]').trigger('click')
    await nextTick()
    await flushPromises()

    expect(router.currentRoute.value).toMatchObject({
      path: '/chat',
      query: { share: 'internal' },
    })
    expect(JSON.parse(localStorage.getItem('schatphone:chat:internal-share-draft'))).toMatchObject({
      sourceRoute: expect.stringContaining('/map?'),
      shareable: {
        type: 'location_share',
        sourceModule: 'map',
        sourceId: 'seoul-sm-hq',
      },
    })
  })

  test('keeps place discovery separate from journey planning until a destination is confirmed', async () => {
    const mapStore = useMapStore()
    const initialDestination = mapStore.tripForm.to
    const input = wrapper.get('[data-testid="map-destination-search"]')

    await input.setValue('SM')
    await nextTick()

    expect(mapStore.tripForm.to).toBe(initialDestination)
    expect(wrapper.find('[data-testid="map-primary-route-card"]').exists()).toBe(false)

    await wrapper
      .get('[data-testid="map-local-place-results"]')
      .get('.map-place-result')
      .trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="map-place-detail-sheet"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="map-place-detail-sheet"]').text()).toMatch(/Go|前往/)
    expect(wrapper.find('[data-testid="map-place-event-entry"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="map-primary-route-card"]').exists()).toBe(false)

    await wrapper.get('[data-testid="map-place-use-destination"]').trigger('click')
    await nextTick()

    expect(mapStore.tripForm.to).not.toBe(initialDestination)
    expect(wrapper.get('[data-testid="map-primary-route-card"]').exists()).toBe(true)
    expect(input.element.value).toMatch(/SM/)
  })

  test('opens local discovery on focus and filters suggestions by category', async () => {
    const mapStore = useMapStore()
    const input = wrapper.get('[data-testid="map-destination-search"]')

    await input.trigger('focus')
    await nextTick()

    expect(wrapper.get('[data-testid="map-local-place-results"]').text()).toMatch(
      /All places|全部地点/,
    )
    expect(wrapper.get('[data-testid="map-search-categories"]').exists()).toBe(true)
    const expectedBrowseCount = mapStore.activeMapPlaces.filter(
      (place) => place.position && !isMapPlaceCategoryDiscoveryOnly(place.category),
    ).length
    expect(wrapper.get('[data-testid="map-local-place-results"]').findAll('.map-place-result')).toHaveLength(
      expectedBrowseCount,
    )
    expect(wrapper.get('[data-testid="map-local-search-scope"]').text()).toContain(
      `${expectedBrowseCount}/${mapStore.activeMapPlaces.length}`,
    )

    const categoryOrder = wrapper
      .get('[data-testid="map-search-categories"]')
      .findAll('button')
      .map((button) => button.attributes('data-testid'))
    expect(categoryOrder.slice(0, 8)).toEqual([
      'map-search-category-all',
      'map-search-category-transit',
      'map-search-category-residence',
      'map-search-category-work',
      'map-search-category-education',
      'map-search-category-shopping',
      'map-search-category-supermarket',
      'map-search-category-convenience_store',
    ])

    await wrapper.get('[data-testid="map-search-category-transit"]').trigger('click')
    await nextTick()

    const expectedTransitCount = mapStore.activeMapPlaces.filter(
      (place) => place.position && ['transit', 'transit_hub'].includes(place.category),
    ).length
    expect(wrapper.get('[data-testid="map-search-category-transit"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="map-local-place-results"]').findAll('.map-place-result')).toHaveLength(
      expectedTransitCount,
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
    expect(wrapper.find('[data-testid="map-primary-route-card"]').exists()).toBe(false)

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

  test('routes the legacy create handoff to the settings-owned manager', async () => {
    await router.push('/map?source=map-settings&panel=places&action=create')
    await flushPromises()

    expect(router.currentRoute.value).toMatchObject({
      path: '/map/settings/places',
      query: { create: '1' },
    })
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
