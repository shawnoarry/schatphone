import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '../src/stores/map'
import {
  MAP_WORLD_SUITE_NATIVE_KINDS,
  createMapWorldSuiteInspectionAdapter,
} from '../src/lib/map-world-suite-inspection'
import {
  createCatalogManagedMapPackFixture,
  createMapWorldSuiteResourceFixture,
} from './fixtures/map-world-suite-inspection'

describe('Map World Suite inspection Adapter', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('reads built-in and current custom identity from the real Map Store without mutation methods', () => {
    const mapStore = useMapStore()
    const adapter = createMapWorldSuiteInspectionAdapter({ mapStore })
    const builtInResource = createMapWorldSuiteResourceFixture(1, {
      id: 'map.real-seoul',
      ownerResourceId: 'real-seoul-v1',
      catalogId: 'real-seoul-catalog',
    })

    expect(adapter).not.toHaveProperty('install')
    expect(adapter).not.toHaveProperty('update')
    expect(adapter).not.toHaveProperty('remove')
    expect(adapter.inspect({ resource: builtInResource })).toMatchObject({
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.BUILT_IN,
      installed: false,
      collision: true,
    })

    const resource = createMapWorldSuiteResourceFixture()
    expect(
      mapStore.createCustomMapPack({
        id: resource.ownerResourceId,
        assetId: 'gallery-neon-map',
        labelZh: '我的霓虹城区',
      }),
    ).toBeTruthy()
    expect(adapter.inspect({ resource })).toMatchObject({
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.USER_CUSTOM,
      installed: false,
      collision: true,
    })
  })

  test('strips forged Catalog provenance from the ordinary custom-pack creation path', () => {
    const mapStore = useMapStore()
    const resource = createMapWorldSuiteResourceFixture()
    const catalogPack = createCatalogManagedMapPackFixture({ resource })

    expect(mapStore.createCustomMapPack(catalogPack)).toBeTruthy()
    const storedPack = mapStore.createBackupSnapshot().customMapPacks[0]
    const adapter = createMapWorldSuiteInspectionAdapter({
      mapStore,
      listGalleryAssets: () => [{ id: 'gallery-neon-map' }],
    })

    expect(storedPack).not.toHaveProperty('provenance')
    expect(adapter.inspect({ resource })).toMatchObject({
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.USER_CUSTOM,
      installed: false,
      collision: true,
      galleryAsset: {
        assetId: 'gallery-neon-map',
        available: true,
      },
      mutationReadiness: {
        approved: true,
        blockers: [],
      },
      mutationAdapterAvailable: false,
      canInstall: false,
    })
  })

  test('round-trips valid Catalog provenance through restore, save, and reopen', () => {
    const mapStore = useMapStore()
    const resource = createMapWorldSuiteResourceFixture(2)
    const catalogPack = createCatalogManagedMapPackFixture({
      resource,
      catalogVersion: 2,
    })

    expect(
      mapStore.restoreFromBackup({ map: { customMapPacks: [catalogPack] } }),
    ).toBe(true)
    expect(mapStore.createBackupSnapshot().customMapPacks[0]?.provenance).toEqual(
      catalogPack.provenance,
    )
    expect(mapStore.saveNow()).toMatchObject({ ok: true })

    setActivePinia(createPinia())
    const reopenedStore = useMapStore()
    const adapter = createMapWorldSuiteInspectionAdapter({
      mapStore: reopenedStore,
      listGalleryAssets: () => [{ id: 'gallery-neon-map' }],
    })

    expect(reopenedStore.createBackupSnapshot().customMapPacks[0]?.provenance).toEqual(
      catalogPack.provenance,
    )
    expect(adapter.inspect({ resource })).toMatchObject({
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.CATALOG_MANAGED,
      installed: true,
      version: 2,
      userModified: false,
      mutationReadiness: {
        approved: true,
        blockers: [],
      },
      mutationAdapterAvailable: false,
      canInstall: false,
    })
  })

  test('returns the real Map persistence failure receipt instead of claiming success', async () => {
    const mapStore = useMapStore()
    await vi.waitFor(() => {
      expect(localStorage.getItem('schatphone:store:map')).not.toBeNull()
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    expect(mapStore.saveNow()).toMatchObject({
      ok: false,
      error: 'quota_exceeded',
      carrier: 'localStorage',
    })
  })

  test('reads Store-owned binding, place, position, session, Journey, and history references', () => {
    const mapStore = useMapStore()
    const resource = createMapWorldSuiteResourceFixture()
    const startedAt = Date.now()
    const customPack = {
      id: resource.ownerResourceId,
      assetId: 'gallery-neon-map',
      labelZh: '霓虹城区',
    }
    mapStore.restoreFromBackup({
      map: {
        activeMapPackId: resource.ownerResourceId,
        customMapPacks: [customPack],
        worldMapPackBindings: { modern_parallel: resource.ownerResourceId },
        addresses: [
          {
            id: 88,
            label: '住处',
            detail: '北环 8 号',
            category: 'home',
            mapPackId: resource.ownerResourceId,
            position: { kind: 'canvas', x: 0.4, y: 0.5 },
          },
        ],
        currentLocation: {
          source: 'saved',
          label: '住处',
          detail: '北环 8 号',
          mapPackId: resource.ownerResourceId,
          placeId: 'address:88',
          position: { kind: 'canvas', x: 0.4, y: 0.5 },
        },
        placeSession: {
          state: 'inside',
          sessionId: 'session-88',
          revision: 1,
          worldPackId: 'modern_parallel',
          mapPackId: resource.ownerResourceId,
          mapPackVersion: 1,
          placeId: 'address:88',
          placeCategoryId: 'home',
          enteredAt: startedAt,
          updatedAt: startedAt,
          presence: { relation: 'inside', provenance: 'manual', evidenceAt: startedAt },
        },
        tripState: {
          status: 'traveling',
          journeySchemaVersion: 3,
          journeyId: 'journey-current',
          mapPackId: resource.ownerResourceId,
          worldPackId: 'modern_parallel',
          from: '北环 8 号',
          to: '南岸 2 号',
          transportMode: 'walk',
          durationSeconds: 600,
          startedAt,
          etaAt: startedAt + 600_000,
        },
        tripHistory: [
          {
            id: 'history-1',
            journeyId: 'journey-old',
            mapPackId: resource.ownerResourceId,
            worldPackId: 'modern_parallel',
            status: 'arrived',
            from: '旧地',
            to: '北环 8 号',
            startedAt: 1_000,
            endedAt: 2_000,
          },
        ],
      },
    })
    const adapter = createMapWorldSuiteInspectionAdapter({ mapStore })

    expect(adapter.inspect({ resource })).toMatchObject({
      installed: false,
      collision: true,
      inUse: true,
      historicalReferenceCount: 1,
      references: {
        activeSelection: true,
        worldBindingIds: ['modern_parallel'],
        addressIds: ['88'],
        currentLocation: { referenced: true },
        placeSession: { active: true },
        activeJourney: { referenced: true, journeyId: 'journey-current' },
        historicalJourneyIds: ['journey-old'],
      },
    })
  })
})
