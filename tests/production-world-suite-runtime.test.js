import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createProductionWorldSuiteRuntime } from '../src/lib/production-world-suite-runtime'
import { createEmptyWorldSuiteInventory } from '../src/lib/world-suite-inventory'
import { useBookStore } from '../src/stores/book'
import { useChatStore } from '../src/stores/chat'
import { useGalleryStore } from '../src/stores/gallery'
import { useMapStore } from '../src/stores/map'
import { useSimulationStore } from '../src/stores/simulation'
import { useSystemStore } from '../src/stores/system'

const bookResource = {
  id: 'book.demo-world-guide',
  type: 'book_asset',
  owner: 'book',
  ownerResourceId: 'demo-world-guide',
  catalogId: 'demo-world-guide-catalog',
  version: 1,
}

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
  resources: [bookResource, mapResource, galleryResource],
}

const catalogRecords = [
  {
    type: 'book_asset',
    catalogId: bookResource.catalogId,
    catalogVersion: 1,
    asset: {
      title: 'Demo World Guide',
      category: 'worldview',
      format: 'markdown',
      content: '# Demo World\n\nA reusable world guide.',
    },
  },
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

const waitForHydration = async (...stores) => {
  await vi.waitFor(() => {
    stores.forEach((store) => expect(store.hasFinishedStorageHydration).toBe(true))
  })
}

const createRealRuntime = async () => {
  const systemStore = useSystemStore()
  const bookStore = useBookStore()
  const galleryStore = useGalleryStore()
  const mapStore = useMapStore()
  await waitForHydration(systemStore, bookStore, galleryStore)
  const runtime = createProductionWorldSuiteRuntime({
    systemStore,
    bookStore,
    galleryStore,
    mapStore,
    simulationStore: useSimulationStore(),
    chatStore: useChatStore(),
    manifests: [suite],
    catalogRecords,
  })
  return { runtime, systemStore, bookStore, galleryStore, mapStore }
}

describe('production World Suite runtime', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('installs Book, Gallery, and Map through one product use case without activation', async () => {
    const { runtime, systemStore, bookStore, galleryStore, mapStore } = await createRealRuntime()

    expect(runtime.ready).toBe(true)
    expect(runtime.listRegisteredOwners()).toEqual(['book', 'gallery', 'map'])
    expect(runtime.listCatalogDescriptors()).toEqual([
      expect.objectContaining({ owner: 'book', catalogId: bookResource.catalogId }),
      expect.objectContaining({ owner: 'gallery', catalogId: galleryResource.catalogId }),
      expect.objectContaining({ owner: 'map', catalogId: mapResource.catalogId }),
    ])
    expect(runtime.listCatalogDescriptors()[0]).not.toHaveProperty('asset')
    expect(runtime.listCatalogDescriptors()[1]).not.toHaveProperty('assetPack')
    expect(runtime.listCatalogDescriptors()[2]).not.toHaveProperty('mapPack')

    const preview = runtime.previewSuiteInstall(suite.id)
    expect(preview).toMatchObject({ ok: true, plan: { readyToApply: true } })
    expect(preview.plan.actions.map((action) => action.resourceId)).toEqual([
      bookResource.id,
      galleryResource.id,
      mapResource.id,
    ])

    const installed = await runtime.installSuite(suite.id, { now: 1_000 })
    expect(installed).toMatchObject({
      ok: true,
      completedResourceIds: [bookResource.id, galleryResource.id, mapResource.id],
    })
    expect(bookStore.findAssetById(bookResource.ownerResourceId)?.content).toContain('Demo World')
    expect(galleryStore.findAssetById('demo-world-map-art')).toBeTruthy()
    expect(mapStore.customMapPacks[0]).toMatchObject({
      id: mapResource.ownerResourceId,
      assetId: 'demo-world-map-art',
      places: [{ id: 'demo-studio' }],
    })
    expect(systemStore.getInstalledWorldResources()).toHaveLength(3)
    expect(systemStore.user.worldBookSourceLinks).toEqual([])
    expect(mapStore.activeMapPackId).not.toBe(mapResource.ownerResourceId)
  })

  test('reopens native resources and durable coordination evidence from their existing owners', async () => {
    const installed = await createRealRuntime()
    expect((await installed.runtime.installSuite(suite.id, { now: 1_000 })).ok).toBe(true)

    setActivePinia(createPinia())
    const reopened = await createRealRuntime()

    expect(reopened.bookStore.findAssetById(bookResource.ownerResourceId)).toBeTruthy()
    expect(reopened.galleryStore.findAssetById('demo-world-map-art')).toBeTruthy()
    expect(reopened.mapStore.customMapPacks).toEqual([
      expect.objectContaining({ id: mapResource.ownerResourceId }),
    ])
    expect(reopened.runtime.getInventorySnapshot()).toMatchObject({
      resources: [
        expect.objectContaining({ id: bookResource.id }),
        expect.objectContaining({ id: galleryResource.id }),
        expect.objectContaining({ id: mapResource.id }),
      ],
      suiteStates: [expect.objectContaining({ suiteId: suite.id, status: 'installed' })],
    })
    expect(reopened.runtime.previewSuiteInstall(suite.id).plan.actions).toEqual([
      expect.objectContaining({ resourceId: bookResource.id, action: 'keep' }),
      expect.objectContaining({ resourceId: galleryResource.id, action: 'keep' }),
      expect.objectContaining({ resourceId: mapResource.id, action: 'keep' }),
    ])
  })

  test('shares one native Book asset between independent Catalog and Suite origins', async () => {
    const { runtime, bookStore } = await createRealRuntime()
    const bookMutation = vi.spyOn(bookStore, 'commitManagedAssetMutation')

    const independent = await runtime.installResource(bookResource, {
      originId: 'book_catalog',
      now: 500,
    })
    expect(independent).toMatchObject({ ok: true })
    expect(bookMutation).toHaveBeenCalledTimes(1)

    const suiteInstall = await runtime.installSuite(suite.id, { now: 1_000 })
    expect(suiteInstall.ok).toBe(true)
    expect(bookMutation).toHaveBeenCalledTimes(1)
    expect(
      runtime.getInventorySnapshot().resources.find((resource) => resource.id === bookResource.id),
    ).toMatchObject({
      origins: [
        { kind: 'independent', id: 'book_catalog' },
        { kind: 'suite', id: suite.id },
      ],
    })
  })

  test('rejects malformed independent resources during preview before any Owner mutation', async () => {
    const { runtime, bookStore, galleryStore, mapStore } = await createRealRuntime()
    const invalidResource = {
      id: 'book.invalid',
      type: 'book_asset',
      owner: 'map',
      ownerResourceId: 'invalid-book',
      catalogId: 'invalid-book-catalog',
      version: 1,
    }

    expect(runtime.previewResourceInstall(invalidResource)).toEqual({
      ok: false,
      code: 'invalid_resource',
    })
    await expect(runtime.installResource(invalidResource)).resolves.toEqual({
      ok: false,
      code: 'invalid_resource',
    })
    expect(bookStore.assetCount).toBe(0)
    expect(galleryStore.assets).toEqual([])
    expect(mapStore.customMapPacks).toEqual([])
  })

  test('serializes product operations so two installs cannot mutate owners concurrently', async () => {
    const { runtime } = await createRealRuntime()

    const firstInstall = runtime.installSuite(suite.id, { now: 1_000 })
    expect(runtime.operationInProgress).toBe(true)
    await expect(runtime.installSuite(suite.id, { now: 1_001 })).resolves.toEqual({
      ok: false,
      code: 'operation_in_progress',
    })
    expect((await firstInstall).ok).toBe(true)
    expect(runtime.operationInProgress).toBe(false)
  })

  test('uninstalls pristine Suite resources without changing activation state or leaving artwork', async () => {
    const { runtime, systemStore, bookStore, galleryStore, mapStore } = await createRealRuntime()
    const activeMapPackId = mapStore.activeMapPackId
    expect((await runtime.installSuite(suite.id, { now: 1_000 })).ok).toBe(true)

    const preview = runtime.previewSuiteUninstall(suite.id)
    expect(preview.plan.actions.map((action) => action.resourceId)).toEqual([
      mapResource.id,
      galleryResource.id,
      bookResource.id,
    ])
    const removed = await runtime.uninstallSuite(suite.id, { now: 2_000 })

    expect(removed).toMatchObject({
      ok: true,
      completedResourceIds: [mapResource.id, galleryResource.id, bookResource.id],
    })
    expect(bookStore.findAssetById(bookResource.ownerResourceId)).toBeNull()
    expect(galleryStore.findAssetById('demo-world-map-art')).toBeNull()
    expect(mapStore.customMapPacks).toEqual([])
    expect(mapStore.activeMapPackId).toBe(activeMapPackId)
    expect(systemStore.getInstalledWorldResources()).toEqual([])
  })

  test('fails closed when System cannot persist a checkpoint and retries from native owner truth', async () => {
    const real = await createRealRuntime()
    let inventory = createEmptyWorldSuiteInventory()
    let saveAttempt = 0
    const saveResults = [true, false, true]
    const systemStore = {
      getWorldSuiteInventorySnapshot: () => inventory,
      replaceWorldSuiteInventory: (nextInventory) => {
        inventory = nextInventory
        return inventory
      },
      saveNow: () => ({ ok: saveResults[saveAttempt++] ?? true }),
      listWorldBookSourceLinks: () => [],
    }
    const runtime = createProductionWorldSuiteRuntime({
      systemStore,
      bookStore: real.bookStore,
      galleryStore: real.galleryStore,
      mapStore: real.mapStore,
      simulationStore: useSimulationStore(),
      chatStore: useChatStore(),
      manifests: [suite],
      catalogRecords,
    })

    const bookMutation = vi.spyOn(real.bookStore, 'commitManagedAssetMutation')
    const first = await runtime.installSuite(suite.id, { now: 1_000 })
    expect(first).toMatchObject({ ok: false, code: 'inventory_checkpoint_failed' })
    expect(inventory).toMatchObject({
      resources: [expect.objectContaining({ id: bookResource.id })],
      suiteStates: [
        expect.objectContaining({
          suiteId: suite.id,
          status: 'partial',
          completedResourceIds: [bookResource.id],
        }),
      ],
    })
    expect(real.bookStore.assetCount).toBe(1)
    expect(real.galleryStore.assets).toEqual([])
    expect(real.mapStore.customMapPacks).toEqual([])

    const retried = await runtime.installSuite(suite.id, { now: 2_000 })
    expect(retried.ok).toBe(true)
    expect(inventory.resources).toHaveLength(3)
    expect(bookMutation).toHaveBeenCalledTimes(1)
  })

  test('does not register a K-pop manifest or content implicitly', async () => {
    const real = await createRealRuntime()
    const runtime = createProductionWorldSuiteRuntime({
      systemStore: real.systemStore,
      bookStore: real.bookStore,
      galleryStore: real.galleryStore,
      mapStore: real.mapStore,
      simulationStore: useSimulationStore(),
      chatStore: useChatStore(),
    })

    expect(runtime.ready).toBe(true)
    expect(runtime.listSuites()).toEqual([])
    expect(runtime.listCatalogDescriptors()).toEqual([])
    expect(runtime.installSuite('default_kpop_suite')).resolves.toMatchObject({
      ok: false,
      code: 'suite_not_found',
    })
  })
})
