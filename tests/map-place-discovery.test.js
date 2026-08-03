import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  MAP_PLACE_KNOWLEDGE_MODE,
  findNearbyFootprintDiscoveries,
  isMapPlaceKnown,
  normalizeMapPlaceKnowledgeByWorld,
} from '../src/lib/map-place-discovery'
import { useMapStore } from '../src/stores/map'

describe('map place discovery contract', () => {
  test('normalizes old or malformed knowledge data to all-known compatibility', () => {
    expect(normalizeMapPlaceKnowledgeByWorld(null)).toEqual({})
    expect(
      normalizeMapPlaceKnowledgeByWorld({
        default_world: {
          mode: 'unknown_mode',
          discoveriesByMapPack: {
            'real-seoul-v1': {
              placeIds: ['near-store', 'near-store', ''],
              evidenceByPlaceId: {
                'near-store': {
                  sourceType: 'trip_arrival',
                  sourceId: 'trip-1',
                  discoveredAt: 100,
                },
                ignored: {
                  sourceType: 'trip_arrival',
                  sourceId: 'trip-2',
                  discoveredAt: 200,
                },
              },
            },
          },
        },
      }),
    ).toEqual({
      default_world: {
        schemaVersion: 1,
        mode: MAP_PLACE_KNOWLEDGE_MODE.ALL_KNOWN,
        discoveriesByMapPack: {
          'real-seoul-v1': {
            placeIds: ['near-store'],
            evidenceByPlaceId: {
              'near-store': {
                sourceType: 'trip_arrival',
                sourceId: 'trip-1',
                discoveredAt: 100,
              },
            },
          },
        },
      },
    })
  })

  test('finds only nearby gated facilities in stable distance order', () => {
    const mapPack = { coordinateKind: 'geo' }
    const places = [
      {
        id: 'far-store',
        category: 'convenience_store',
        position: { kind: 'geo', lat: 37.53, lng: 127.03 },
      },
      {
        id: 'near-pharmacy',
        category: 'pharmacy',
        position: { kind: 'geo', lat: 37.5001, lng: 127 },
      },
      {
        id: 'known-store',
        category: 'convenience_store',
        position: { kind: 'geo', lat: 37.5002, lng: 127 },
      },
      {
        id: 'near-landmark',
        category: 'culture',
        position: { kind: 'geo', lat: 37.50005, lng: 127 },
      },
      {
        id: 'near-store',
        category: 'convenience_store',
        position: { kind: 'geo', lat: 37.5003, lng: 127 },
      },
    ]

    const discoveries = findNearbyFootprintDiscoveries({
      mapPack,
      places,
      position: { kind: 'geo', lat: 37.5, lng: 127 },
      discoveredPlaceIds: ['known-store'],
      radiusKm: 1,
    })

    expect(discoveries.map((item) => item.place.id)).toEqual([
      'near-pharmacy',
      'near-store',
    ])
    expect(
      isMapPlaceKnown({
        place: places[4],
        mode: MAP_PLACE_KNOWLEDGE_MODE.FOOTPRINT_GATED,
        discoveredPlaceIds: [],
      }),
    ).toBe(false)
    expect(
      isMapPlaceKnown({
        place: places[3],
        mode: MAP_PLACE_KNOWLEDGE_MODE.FOOTPRINT_GATED,
        discoveredPlaceIds: [],
      }),
    ).toBe(true)
  })
})

describe('map Footprints place knowledge', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-03T08:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('keeps legacy saves all-known and separates knowledge from pin visibility', () => {
    const store = useMapStore()
    const authoredCount = store.activeMapAllPlaces.length

    expect(store.restoreFromBackup({ map: { mapPinVisibilityByPack: {} } })).toBe(true)
    expect(store.activeMapPlaceKnowledgeMode).toBe(MAP_PLACE_KNOWLEDGE_MODE.ALL_KNOWN)
    expect(store.activeMapPlaces).toHaveLength(authoredCount)

    expect(store.setMapPlaceKnowledgeMode(MAP_PLACE_KNOWLEDGE_MODE.FOOTPRINT_GATED)).toBe(true)
    expect(store.activeMapPlaces.some((place) => place.category === 'convenience_store')).toBe(false)
    expect(store.activeMapPlaces.some((place) => place.category === 'pharmacy')).toBe(false)
    expect(store.setMapPlaceCategoryVisibility('convenience_store', true)).toBe(false)
    expect(store.activeMapPlaceDiscoverySummary.discoveredCount).toBe(0)

    store.setCurrentLocation({
      source: 'map_point',
      label: 'Manual point',
      detail: 'Manual point',
      mapPackId: 'real-seoul-v1',
      position: { kind: 'geo', lat: 37.498, lng: 127.0276 },
    })
    expect(store.activeMapPlaceDiscoverySummary.discoveredCount).toBe(0)
  })

  test('reveals nearby authored facilities only after a completed positioned journey', () => {
    const store = useMapStore()
    const destination = store.activeMapAllPlaces.find(
      (place) => place.id === 'seoul-gangnam-station',
    )
    expect(destination).toBeTruthy()
    expect(store.setMapPlaceKnowledgeMode(MAP_PLACE_KNOWLEDGE_MODE.FOOTPRINT_GATED)).toBe(true)

    store.setTripEndpoint('from', store.currentLocation.detail)
    store.setTripEndpoint('to', destination.detailEn)
    expect(store.setTripTransportMode('public_transit').ok).toBe(true)
    const started = store.startTrip()
    expect(started).toMatchObject({
      ok: true,
      worldPackId: 'default_world',
      mapPackId: 'real-seoul-v1',
    })

    store.tickTripRuntime(store.tripState.etaAt + 1000)

    expect(store.tripState.status).toBe('arrived')
    expect(store.tripHistory[0]).toMatchObject({
      status: 'arrived',
      worldPackId: 'default_world',
      mapPackId: 'real-seoul-v1',
    })
    const discoveredIds = store.activeMapPlaceDiscoverySummary.recentDiscoveries.map(
      (item) => item.placeId,
    )
    expect(discoveredIds).toEqual(
      expect.arrayContaining([
        'seoul-gangnam-station-pharmacy-district',
        'seoul-gs25-gangnam-central',
      ]),
    )
    const discoveredStore = store.activeMapPlaces.find(
      (place) => place.id === 'seoul-gs25-gangnam-central',
    )
    expect(discoveredStore).toBeTruthy()
    expect(store.isMapPlaceVisible(discoveredStore)).toBe(false)
    expect(store.setMapPlaceVisibility(discoveredStore.placeId, true)).toBe(true)
    expect(store.isMapPlaceVisible(discoveredStore)).toBe(true)

    const discoveryCount = store.activeMapPlaceDiscoverySummary.discoveredCount
    store.tickTripRuntime(store.tripState.arrivedAt + 60_000)
    expect(store.activeMapPlaceDiscoverySummary.discoveredCount).toBe(discoveryCount)

    const snapshot = store.createBackupSnapshot()
    expect(snapshot.mapPlaceKnowledgeByWorld.default_world).toMatchObject({
      schemaVersion: 1,
      mode: MAP_PLACE_KNOWLEDGE_MODE.FOOTPRINT_GATED,
    })

    expect(store.setMapPlaceKnowledgeMode(MAP_PLACE_KNOWLEDGE_MODE.ALL_KNOWN)).toBe(true)
    expect(store.setMapPlaceKnowledgeMode(MAP_PLACE_KNOWLEDGE_MODE.FOOTPRINT_GATED)).toBe(true)
    expect(store.activeMapPlaceDiscoverySummary.recentDiscoveries.map((item) => item.placeId)).toEqual(
      discoveredIds,
    )

    setActivePinia(createPinia())
    const restored = useMapStore()
    expect(restored.restoreFromBackup({ map: snapshot })).toBe(true)
    expect(restored.activeMapPlaceKnowledgeMode).toBe(MAP_PLACE_KNOWLEDGE_MODE.FOOTPRINT_GATED)
    expect(restored.activeMapPlaceDiscoverySummary.recentDiscoveries.map((item) => item.placeId)).toEqual(
      discoveredIds,
    )
  })

  test('does not reveal facilities for a cancelled journey', () => {
    const store = useMapStore()
    const destination = store.activeMapAllPlaces.find(
      (place) => place.id === 'seoul-gangnam-station',
    )
    store.setMapPlaceKnowledgeMode(MAP_PLACE_KNOWLEDGE_MODE.FOOTPRINT_GATED)
    store.setTripEndpoint('from', store.currentLocation.detail)
    store.setTripEndpoint('to', destination.detailEn)
    store.setTripTransportMode('walk')
    expect(store.startTrip().ok).toBe(true)
    expect(store.cancelTrip()).toBe(true)

    expect(store.activeMapPlaceDiscoverySummary.discoveredCount).toBe(0)
    expect(store.tripHistory[0].status).toBe('cancelled')

    store.setTripEndpoint('from', store.currentLocation.detail)
    store.setTripEndpoint('to', 'Unpositioned free-text destination')
    expect(store.startTrip().ok).toBe(true)
    store.tickTripRuntime(store.tripState.etaAt + 1000)
    expect(store.tripState.status).toBe('arrived')
    expect(store.activeMapPlaceDiscoverySummary.discoveredCount).toBe(0)
  })
})
