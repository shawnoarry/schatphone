import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  DEFAULT_MAP_PACK_ID,
  FICTIONAL_MAP_PACK_ID,
  calculateMapDistanceKm,
  getMapPackById,
  getRecommendedMapPackIdForWorldPack,
  listMapPacks,
  mapPositionToNormalized,
  normalizedToMapPosition,
} from '../src/lib/map-packs'
import { useMapStore } from '../src/stores/map'
import {
  MAP_USER_PLACE_CATEGORIES,
  isMapPlaceCategoryDefaultVisible,
  isMapPlaceCategoryDiscoveryOnly,
  normalizeUserMapPlaceCategory,
  resolveMapPlaceVisual,
} from '../src/lib/map-place-categories'

describe('local map pack foundation', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('ships one real Seoul pack and one faction-based fictional pack', () => {
    const packs = listMapPacks()
    expect(packs.map((pack) => pack.id)).toEqual(['real-seoul-v1', 'cyber-wasteland-v1'])

    const seoul = getMapPackById(DEFAULT_MAP_PACK_ID)
    expect(seoul.coordinateKind).toBe('geo')
    expect(seoul.places.some((place) => place.id === 'seoul-sm-hq')).toBe(true)

    const wasteland = getMapPackById('cyber-wasteland-v1')
    expect(wasteland.coordinateKind).toBe('canvas')
    expect(wasteland.factions).toHaveLength(4)
    expect(new Set(wasteland.places.map((place) => place.factionId).filter(Boolean)).size).toBe(4)
  })

  test('keeps one normalized visual contract for editable pin categories', () => {
    expect(MAP_USER_PLACE_CATEGORIES.map((category) => category.id)).toEqual([
      'home',
      'work',
      'school',
      'shop',
      'leisure',
      'other',
    ])
    expect(normalizeUserMapPlaceCategory(' WORK ')).toBe('work')
    expect(normalizeUserMapPlaceCategory('unknown')).toBe('other')
    expect(resolveMapPlaceVisual({ category: 'home' }).icon).toBe('fas fa-house')
    expect(resolveMapPlaceVisual({ category: 'home' }).tone).not.toBe(
      resolveMapPlaceVisual({ category: 'work' }).tone,
    )
    expect(
      resolveMapPlaceVisual(
        { category: 'faction', factionId: 'north' },
        [{ id: 'north', tone: '#123456' }],
      ).tone,
    ).toBe('#123456')
  })

  test('ships a unique, geocoded Seoul landmark catalog across requested place families', () => {
    const seoul = getMapPackById(DEFAULT_MAP_PACK_ID)
    const placeIds = seoul.places.map((place) => place.id)

    expect(seoul.places).toHaveLength(101)
    expect(new Set(placeIds).size).toBe(placeIds.length)
    expect(placeIds).toEqual(
      expect.arrayContaining([
        'seoul-jyp-hq',
        'seoul-yg-hq',
        'seoul-kbs-hq',
        'seoul-mbc-hq',
        'seoul-cj-enm-center',
        'seoul-amorepacific-hq',
        'seoul-gyeongbokgung',
        'seoul-kspo-dome',
        'seoul-jennyhouse-cheongdam-hill',
        'seoul-starfield-coex-mall',
        'seoul-galleria-luxury-hall',
        'seoul-cu-bgf-hq',
        'seoul-cakeshop',
        'seoul-national-university-hospital',
        'seoul-id-hospital',
        'seoul-hannam-the-hill',
        'seoul-incheon-airport-t1',
        'seoul-forest',
        'seoul-national-university',
        'seoul-signiel',
        'seoul-jongno-five-pharmacy-street',
        'seoul-jamsil-sports-complex',
        'seoul-cgv-yongsan-ipark',
        'seoul-bank-of-korea-main',
        'seoul-national-police-agency',
        'seoul-gangnam-fire-station',
      ]),
    )

    expect(seoul.places.filter((place) => place.category === 'pharmacy')).toHaveLength(3)
    expect(seoul.places.filter((place) => place.category === 'fitness')).toHaveLength(3)
    expect(seoul.places.filter((place) => place.category === 'cinema')).toHaveLength(4)
    expect(seoul.places.filter((place) => place.category === 'bank')).toHaveLength(4)
    expect(seoul.places.filter((place) => place.category === 'public_safety')).toHaveLength(4)

    seoul.places.forEach((place) => {
      expect(place.nameZh).toBeTruthy()
      expect(place.nameEn).toBeTruthy()
      expect(place.detailZh).toBeTruthy()
      expect(place.detailEn).toBeTruthy()
      expect(place.aliases.length).toBeGreaterThan(0)
      expect(place.position.kind).toBe('geo')
      expect(place.position.lat).toBeGreaterThanOrEqual(seoul.bounds.south)
      expect(place.position.lat).toBeLessThanOrEqual(seoul.bounds.north)
      expect(place.position.lng).toBeGreaterThanOrEqual(seoul.bounds.west)
      expect(place.position.lng).toBeLessThanOrEqual(seoul.bounds.east)
    })

    const canonicalNames = new Set(
      seoul.places.flatMap((place) => [place.nameZh, place.nameEn].map((name) => name.toLowerCase())),
    )
    seoul.places.forEach((place) => {
      place.aliases.forEach((alias) => {
        const normalizedAlias = alias.toLowerCase()
        if (normalizedAlias === place.nameZh.toLowerCase()) return
        if (normalizedAlias === place.nameEn.toLowerCase()) return
        expect(canonicalNames.has(normalizedAlias)).toBe(false)
      })
    })

    expect(seoul.places.find((place) => place.id === 'seoul-jyp-hq').position).toEqual({
      kind: 'geo',
      lat: 37.524,
      lng: 127.1291,
    })
    expect(seoul.places.find((place) => place.id === 'seoul-kbs-hq').position).toEqual({
      kind: 'geo',
      lat: 37.5247,
      lng: 126.9168,
    })
    expect(
      seoul.places.find((place) => place.id === 'seoul-jennyhouse-cheongdam-hill').position,
    ).toEqual({ kind: 'geo', lat: 37.5213, lng: 127.0443 })
    expect(isMapPlaceCategoryDefaultVisible('convenience_store')).toBe(false)
    expect(isMapPlaceCategoryDiscoveryOnly('convenience_store')).toBe(true)
    expect(isMapPlaceCategoryDefaultVisible('pharmacy')).toBe(false)
    expect(isMapPlaceCategoryDefaultVisible('fitness')).toBe(false)
    expect(isMapPlaceCategoryDefaultVisible('cinema')).toBe(false)
    expect(isMapPlaceCategoryDefaultVisible('bank')).toBe(false)
    expect(isMapPlaceCategoryDefaultVisible('public_safety')).toBe(false)
    expect(isMapPlaceCategoryDefaultVisible('transit_hub')).toBe(true)
  })

  test('persists category and individual marker visibility without hiding places from Map truth', () => {
    const store = useMapStore()
    const conveniencePlaces = store.activeMapPlaces.filter(
      (place) => place.category === 'convenience_store',
    )
    const firstConvenience = conveniencePlaces[0]

    expect(store.activeMapPlaces).toHaveLength(104)
    expect(store.activeMapVisiblePlaces).toHaveLength(47)
    expect(conveniencePlaces).toHaveLength(3)
    expect(store.isMapPlaceVisible(firstConvenience)).toBe(false)
    expect(store.activeMapVisiblePlaces).not.toContainEqual(firstConvenience)
    expect(store.getMapPlaceCategoryVisibility('convenience_store')).toEqual({
      visibleCount: 0,
      totalCount: 3,
      state: 'hidden',
    })

    expect(store.setMapPlaceCategoryVisibility('convenience_store', true)).toBe(true)
    expect(store.getMapPlaceCategoryVisibility('convenience_store')).toMatchObject({
      visibleCount: 3,
      state: 'visible',
    })
    expect(store.setMapPlaceVisibility(firstConvenience.placeId, false)).toBe(true)
    expect(store.getMapPlaceCategoryVisibility('convenience_store')).toMatchObject({
      visibleCount: 2,
      state: 'mixed',
    })

    const snapshot = store.createBackupSnapshot()
    expect(snapshot.mapPinVisibilityByPack['real-seoul-v1']).toMatchObject({
      categoryVisibility: { convenience_store: true },
      placeVisibility: { [firstConvenience.placeId]: false },
    })

    setActivePinia(createPinia())
    const restored = useMapStore()
    expect(restored.restoreFromBackup({ map: snapshot })).toBe(true)
    expect(restored.getMapPlaceCategoryVisibility('convenience_store')).toMatchObject({
      visibleCount: 2,
      state: 'mixed',
    })

    expect(restored.restoreFromBackup({ map: { mapPinVisibilityByPack: null } })).toBe(true)
    expect(restored.getMapPlaceCategoryVisibility('convenience_store')).toMatchObject({
      visibleCount: 0,
      state: 'hidden',
    })
    expect(restored.activeMapPlaces).toHaveLength(104)
  })

  test('round-trips real coordinates through the versioned map image plane', () => {
    const seoul = getMapPackById(DEFAULT_MAP_PACK_ID)
    const source = { kind: 'geo', lat: 37.5444, lng: 127.0441 }
    const point = mapPositionToNormalized(seoul, source)
    const restored = normalizedToMapPosition(seoul, point)

    expect(point.x).toBeGreaterThan(0)
    expect(point.x).toBeLessThan(1)
    expect(point.y).toBeGreaterThan(0)
    expect(point.y).toBeLessThan(1)
    expect(restored.lat).toBeCloseTo(source.lat, 5)
    expect(restored.lng).toBeCloseTo(source.lng, 5)
  })

  test('uses geographic and fictional scale distance without a route provider', () => {
    const seoul = getMapPackById(DEFAULT_MAP_PACK_ID)
    const seoulDistance = calculateMapDistanceKm(
      seoul,
      seoul.places.find((place) => place.id === 'seoul-sm-hq').position,
      seoul.places.find((place) => place.id === 'seoul-samsung-town').position,
    )
    expect(seoulDistance).toBeGreaterThan(5)
    expect(seoulDistance).toBeLessThan(10)

    const wasteland = getMapPackById('cyber-wasteland-v1')
    const fictionalDistance = calculateMapDistanceKm(
      wasteland,
      { kind: 'canvas', x: 0.2, y: 0.2 },
      { kind: 'canvas', x: 0.8, y: 0.8 },
    )
    expect(fictionalDistance).toBeGreaterThan(20)
  })

  test('switches worlds locally and blocks cross-world switching during a trip', () => {
    vi.useFakeTimers()
    try {
      const store = useMapStore()
      expect(store.setActiveMapPack('cyber-wasteland-v1')).toBe(true)
      expect(store.activeMapPackId).toBe('cyber-wasteland-v1')
      expect(store.currentLocation.mapPackId).toBe('cyber-wasteland-v1')
      expect(store.activeMapPlaces.some((place) => place.factionId === 'helix-covenant')).toBe(true)

      expect(store.setTripTransportMode('private_vehicle').ok).toBe(true)
      const started = store.startTrip()
      expect(started.ok).toBe(true)
      expect(store.tripEstimate.distanceKm).toBeGreaterThan(0)
      expect(store.setActiveMapPack(DEFAULT_MAP_PACK_ID)).toBe(false)
      expect(store.activeMapPackId).toBe('cyber-wasteland-v1')
    } finally {
      vi.useRealTimers()
    }
  })

  test('resolves one map per world and preserves explicit world bindings', () => {
    expect(getRecommendedMapPackIdForWorldPack('modern_parallel')).toBe(DEFAULT_MAP_PACK_ID)
    expect(getRecommendedMapPackIdForWorldPack('survival_city')).toBe(FICTIONAL_MAP_PACK_ID)

    const store = useMapStore()
    expect(store.syncMapPackForWorld({ id: 'survival_city' })).toBe(true)
    expect(store.activeMapPackId).toBe(FICTIONAL_MAP_PACK_ID)
    expect(store.bindMapPackToWorld({ id: 'survival_city' }, DEFAULT_MAP_PACK_ID)).toBe(true)
    expect(store.resolveMapPackIdForWorld('survival_city')).toBe(DEFAULT_MAP_PACK_ID)

    const snapshot = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restored = useMapStore()
    expect(restored.restoreFromBackup({ map: snapshot })).toBe(true)
    expect(restored.resolveMapPackIdForWorld('survival_city')).toBe(DEFAULT_MAP_PACK_ID)
  })

  test('backs up custom fictional map packs and their world binding', () => {
    const store = useMapStore()
    const customPack = store.createCustomMapPack({
      id: 'custom-neon-borough',
      assetId: 'gallery_map_asset_1',
      labelZh: '霓虹城区',
      assetWidth: 1800,
      assetHeight: 1200,
      distanceScaleKm: 18,
      factions: [{ label: '北塔', position: { kind: 'canvas', x: 0.25, y: 0.25 } }],
    })

    expect(customPack?.id).toBe('custom-neon-borough')
    expect(store.bindMapPackToWorld('survival_city', customPack.id)).toBe(true)

    const snapshot = store.createBackupSnapshot()
    setActivePinia(createPinia())
    const restored = useMapStore()
    expect(restored.restoreFromBackup({ map: snapshot })).toBe(true)
    expect(restored.customMapPacks).toHaveLength(1)
    expect(restored.resolveMapPackIdForWorld('survival_city')).toBe('custom-neon-borough')
    expect(restored.activeMapPackId).toBe('custom-neon-borough')
  })

  test('persists player pins and assigns legacy text addresses to Seoul', () => {
    const store = useMapStore()
    store.setActiveMapPack('cyber-wasteland-v1')
    expect(
      store.addAddress({
        label: '避难所',
        detail: '旧环线站台下层',
        category: 'work',
        mapPackId: 'cyber-wasteland-v1',
        position: { kind: 'canvas', x: 0.41, y: 0.62 },
      }),
    ).toBe(true)

    const snapshot = store.createBackupSnapshot()
    expect(snapshot.activeMapPackId).toBe('cyber-wasteland-v1')
    expect(snapshot.addresses.find((address) => address.label === '避难所')).toMatchObject({
      mapPackId: 'cyber-wasteland-v1',
      category: 'work',
      position: { kind: 'canvas', x: 0.41, y: 0.62 },
    })
    expect(store.activeMapPlaces.find((place) => place.label === '避难所')?.icon).toBe('fas fa-building')

    setActivePinia(createPinia())
    const restored = useMapStore()
    expect(
      restored.restoreFromBackup({
        map: {
          addresses: [{ id: 91, label: 'Legacy home', detail: 'Text only' }],
        },
      }),
    ).toBe(true)
    expect(restored.activeMapPackId).toBe(DEFAULT_MAP_PACK_ID)
    expect(restored.addresses[0]).toMatchObject({
      label: 'Legacy home',
      category: 'home',
      mapPackId: DEFAULT_MAP_PACK_ID,
      position: null,
    })
  })

  test('updates existing user places and keeps a saved current location in sync', () => {
    const store = useMapStore()
    const nextPosition = { kind: 'geo', lat: 37.5665, lng: 126.978 }

    expect(
      store.updateAddress(1, {
        label: '新家',
        detail: '首尔市中区世宗大路 110',
        category: 'home',
        position: nextPosition,
      }),
    ).toBe(true)
    expect(store.addresses.find((address) => address.id === 1)).toMatchObject({
      label: '新家',
      detail: '首尔市中区世宗大路 110',
      position: nextPosition,
    })
    expect(store.currentLocation).toMatchObject({
      label: '新家',
      detail: '首尔市中区世宗大路 110',
      position: nextPosition,
    })
    expect(store.updateAddress(1, { label: '   ' })).toBe(false)
  })
})
