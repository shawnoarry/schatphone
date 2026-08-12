import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createMapGalleryWorldSuiteRuntime } from '../src/lib/map-gallery-world-suite-runtime'
import {
  buildWorldSuiteInstallPlan,
  buildWorldSuiteUninstallPlan,
} from '../src/lib/world-suite-manifest'
import { executeWorldSuitePlan } from '../src/lib/world-suite-owner-adapters'
import { createEmptyWorldSuiteInventory } from '../src/lib/world-suite-inventory'
import { useChatStore } from '../src/stores/chat'
import { useGalleryStore } from '../src/stores/gallery'
import { useMapStore } from '../src/stores/map'
import { useSimulationStore } from '../src/stores/simulation'

const galleryResource = {
  id: 'gallery.demo-world-art',
  type: 'gallery_asset_pack',
  owner: 'gallery',
  ownerResourceId: 'demo-world-art-folder',
  catalogId: 'demo-world-art-catalog',
  version: 1,
}

const mapResource = {
  id: 'map.demo-world',
  type: 'map_pack',
  owner: 'map',
  ownerResourceId: 'demo-world-map',
  catalogId: 'demo-world-map-catalog',
  version: 1,
  dependencies: [galleryResource.id],
}

const suite = {
  id: 'demo_world_suite',
  version: 1,
  title: 'Demo World Suite',
  resources: [mapResource, galleryResource],
}

const catalogRecords = [
  {
    type: 'gallery_asset_pack',
    catalogId: galleryResource.catalogId,
    catalogVersion: 1,
    assetPack: {
      name: 'Demo World Art',
      category: 'scenario',
      assets: [
        {
          id: 'demo-world-map-art',
          name: 'Demo World Map Art',
          category: 'scenario',
          url: 'https://example.com/demo-world-map.webp',
        },
      ],
    },
  },
  {
    type: 'map_pack',
    catalogId: mapResource.catalogId,
    catalogVersion: 1,
    mapPack: {
      assetId: 'demo-world-map-art',
      labelZh: '示例世界',
      labelEn: 'Demo World',
      factions: [
        {
          id: 'center',
          labelZh: '中心区',
          labelEn: 'Center',
          position: { kind: 'canvas', x: 0.5, y: 0.5 },
        },
      ],
      places: [
        {
          id: 'demo-studio',
          nameZh: '练习室',
          nameEn: 'Studio',
          category: 'work',
          factionId: 'center',
          position: { kind: 'canvas', x: 0.52, y: 0.48 },
        },
      ],
    },
  },
]

const createRuntime = async (records = catalogRecords) => {
  const galleryStore = useGalleryStore()
  const mapStore = useMapStore()
  const simulationStore = useSimulationStore()
  const chatStore = useChatStore()
  await vi.waitFor(() => expect(galleryStore.hasFinishedStorageHydration).toBe(true))
  return {
    galleryStore,
    mapStore,
    runtime: createMapGalleryWorldSuiteRuntime({
      galleryStore,
      mapStore,
      simulationStore,
      chatStore,
      catalogRecords: records,
    }),
  }
}

describe('Map/Gallery World Suite runtime composition', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('installs Gallery before Map and uninstalls Map before Gallery through one registry', async () => {
    const { runtime, galleryStore, mapStore } = await createRuntime()
    expect(runtime.ready).toBe(true)
    expect(runtime.adapterRegistry.listOwners()).toEqual(['gallery', 'map'])
    const installPlan = buildWorldSuiteInstallPlan({ manifest: suite })
    expect(installPlan.actions.map((action) => action.resourceId)).toEqual([
      galleryResource.id,
      mapResource.id,
    ])

    const installed = await executeWorldSuitePlan({
      manifest: suite,
      plan: installPlan,
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: runtime.adapterRegistry,
      now: 1_000,
    })
    expect(installed.ok).toBe(true)
    expect(galleryStore.findAssetById('demo-world-map-art')).toBeTruthy()
    expect(mapStore.customMapPacks[0]).toMatchObject({
      id: mapResource.ownerResourceId,
      assetId: 'demo-world-map-art',
      places: [{ id: 'demo-studio' }],
    })

    const uninstallPlan = buildWorldSuiteUninstallPlan({
      manifest: suite,
      installedResources: installed.inventory.resources,
    })
    expect(uninstallPlan.actions.map((action) => action.resourceId)).toEqual([
      mapResource.id,
      galleryResource.id,
    ])
    const removed = await executeWorldSuitePlan({
      manifest: suite,
      plan: uninstallPlan,
      inventory: installed.inventory,
      adapterRegistry: runtime.adapterRegistry,
      operation: 'uninstall',
      now: 2_000,
    })
    expect(removed.ok).toBe(true)
    expect(mapStore.customMapPacks).toEqual([])
    expect(galleryStore.findAssetById('demo-world-map-art')).toBeNull()
  })

  test('fails at Map without inventing content when its Catalog record is absent', async () => {
    const { runtime, galleryStore, mapStore } = await createRuntime([catalogRecords[0]])
    const result = await executeWorldSuitePlan({
      manifest: suite,
      plan: buildWorldSuiteInstallPlan({ manifest: suite }),
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: runtime.adapterRegistry,
      now: 1_000,
    })
    expect(result).toMatchObject({
      ok: false,
      code: 'catalog_map_pack_not_found',
      completedResourceIds: [galleryResource.id],
      failedResourceId: mapResource.id,
    })
    expect(galleryStore.findAssetById('demo-world-map-art')).toBeTruthy()
    expect(mapStore.customMapPacks).toEqual([])
  })

  test('resumes a partial Suite after Map Catalog registration without repeating Gallery installation', async () => {
    const { runtime, galleryStore, mapStore } = await createRuntime([catalogRecords[0]])
    const galleryMutation = vi.spyOn(galleryStore, 'commitManagedAssetPackMutation')
    const first = await executeWorldSuitePlan({
      manifest: suite,
      plan: buildWorldSuiteInstallPlan({ manifest: suite }),
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: runtime.adapterRegistry,
      now: 1_000,
    })
    expect(first).toMatchObject({
      ok: false,
      completedResourceIds: [galleryResource.id],
      failedResourceId: mapResource.id,
    })
    expect(galleryMutation).toHaveBeenCalledTimes(1)

    expect(runtime.catalog.register(catalogRecords[1]).ok).toBe(true)
    const retryPlan = buildWorldSuiteInstallPlan({
      manifest: suite,
      installedResources: first.inventory.resources,
    })
    const repaired = await executeWorldSuitePlan({
      manifest: suite,
      plan: retryPlan,
      inventory: first.inventory,
      adapterRegistry: runtime.adapterRegistry,
      now: 2_000,
    })
    expect(repaired.ok).toBe(true)
    expect(galleryMutation).toHaveBeenCalledTimes(1)
    expect(galleryStore.assets).toHaveLength(1)
    expect(mapStore.customMapPacks).toHaveLength(1)
  })

  test('keeps production composition empty-by-input rather than registering K-pop content implicitly', async () => {
    const { runtime } = await createRuntime([])
    expect(runtime.ready).toBe(true)
    expect(runtime.catalog.list()).toEqual([])
    expect(runtime.catalog.createResolver({ owner: 'map', type: 'map_pack' })('kpop', 1)).toBeNull()
  })
})
