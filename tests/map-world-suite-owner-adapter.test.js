import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../src/stores/chat'
import { useGalleryStore } from '../src/stores/gallery'
import { useMapStore } from '../src/stores/map'
import { useSimulationStore } from '../src/stores/simulation'
import {
  createMapWorldSuiteOwnerAdapter,
  createProductionMapWorldSuiteOwnerAdapter,
} from '../src/lib/map-world-suite-owner-adapter'
import {
  WORLD_SUITE_PLAN_ACTIONS,
  buildWorldResourceInstallPlan,
  buildWorldSuiteInstallPlan,
} from '../src/lib/world-suite-manifest'
import {
  createWorldSuiteOwnerAdapterRegistry,
  executeWorldResourcePlan,
  executeWorldSuitePlan,
} from '../src/lib/world-suite-owner-adapters'
import { createEmptyWorldSuiteInventory } from '../src/lib/world-suite-inventory'

const createResource = (version = 1, overrides = {}) => ({
  id: 'map.demo-borough',
  type: 'map_pack',
  owner: 'map',
  ownerResourceId: 'demo-borough-v1',
  catalogId: 'demo-borough-catalog',
  version,
  ...overrides,
})

const createSuite = (resource = createResource()) => ({
  id: 'demo_borough_suite',
  version: 1,
  title: 'Demo borough suite',
  resources: [resource],
})

const createCatalog = (assetId) => {
  const records = new Map([
    [
      'demo-borough-catalog:1',
      {
        catalogId: 'demo-borough-catalog',
        catalogVersion: 1,
        mapPack: {
          assetId,
          labelZh: '示例城区',
          labelEn: 'Demo Borough',
          shortLabelZh: '示例',
          shortLabelEn: 'Demo',
          descriptionZh: '包含作者地点的目录地图。',
          descriptionEn: 'A catalog map with authored places.',
          factions: [
            {
              id: 'north-ring',
              labelZh: '北环',
              labelEn: 'North Ring',
              position: { kind: 'canvas', x: 0.3, y: 0.3 },
            },
          ],
          places: [
            {
              id: 'demo-studio',
              nameZh: '练习室',
              nameEn: 'Practice Studio',
              detailZh: '北环练习楼',
              detailEn: 'North Ring practice building',
              category: 'work',
              factionId: 'north-ring',
              position: { kind: 'canvas', x: 0.36, y: 0.42 },
              aliases: ['Studio'],
            },
          ],
        },
      },
    ],
    [
      'demo-borough-catalog:2',
      {
        catalogId: 'demo-borough-catalog',
        catalogVersion: 2,
        mapPack: {
          assetId,
          labelZh: '示例城区二期',
          labelEn: 'Demo Borough Phase Two',
          shortLabelZh: '示例二期',
          shortLabelEn: 'Demo II',
          descriptionZh: '保留原地点并增加一处咖啡馆。',
          descriptionEn: 'Keeps the original place and adds a cafe.',
          factions: [
            {
              id: 'north-ring',
              labelZh: '北环',
              labelEn: 'North Ring',
              position: { kind: 'canvas', x: 0.3, y: 0.3 },
            },
          ],
          places: [
            {
              id: 'demo-studio',
              nameZh: '练习室',
              nameEn: 'Practice Studio',
              detailZh: '北环练习楼',
              detailEn: 'North Ring practice building',
              category: 'work',
              factionId: 'north-ring',
              position: { kind: 'canvas', x: 0.36, y: 0.42 },
              aliases: ['Studio'],
            },
            {
              id: 'demo-cafe',
              nameZh: '夜航咖啡馆',
              nameEn: 'Night Flight Cafe',
              detailZh: '练习楼旁的深夜咖啡馆',
              detailEn: 'A late-night cafe beside the practice building',
              category: 'leisure',
              factionId: 'north-ring',
              position: { kind: 'canvas', x: 0.4, y: 0.45 },
            },
          ],
        },
      },
    ],
  ])
  return (catalogId, version) => records.get(`${catalogId}:${version}`) || null
}

const waitForStores = async ({ galleryStore }) => {
  await vi.waitFor(() => {
    expect(localStorage.getItem('schatphone:store:map')).not.toBeNull()
  })
  await vi.waitFor(() => expect(galleryStore.hasFinishedStorageHydration).toBe(true))
}

const createHarness = async ({ resolveCatalogMapPack } = {}) => {
  const mapStore = useMapStore()
  const galleryStore = useGalleryStore()
  const simulationStore = useSimulationStore()
  const chatStore = useChatStore()
  await waitForStores({ galleryStore })
  const imported = galleryStore.importAssetFromUrl({
    url: 'https://example.com/demo-borough-map.webp',
    category: 'scenario',
    name: 'Demo borough map',
  })
  expect(imported.ok).toBe(true)
  const adapter = createProductionMapWorldSuiteOwnerAdapter({
    mapStore,
    galleryStore,
    simulationStore,
    chatStore,
    resolveCatalogMapPack: resolveCatalogMapPack || createCatalog(imported.assetId),
  })
  const registry = createWorldSuiteOwnerAdapterRegistry([adapter])
  return {
    mapStore,
    galleryStore,
    simulationStore,
    chatStore,
    adapter,
    registry,
    assetId: imported.assetId,
  }
}

const installIndependent = async (options = {}) => {
  const resource = options.resource || createResource()
  const harness = await createHarness(options)
  const result = await executeWorldResourcePlan({
    resource,
    plan: buildWorldResourceInstallPlan({ resource }),
    inventory: createEmptyWorldSuiteInventory(),
    adapterRegistry: harness.registry,
    originId: 'map_catalog',
    now: 1_000,
  })
  return { ...harness, resource, result }
}

describe('Map World Suite Owner Adapter', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('uses one Adapter for independent and Suite installation without copying Map bodies into the manifest', async () => {
    const resource = createResource()
    expect(resource).not.toHaveProperty('places')
    expect(resource).not.toHaveProperty('assetId')
    const installed = await installIndependent({ resource })

    expect(installed.result.ok).toBe(true)
    expect(installed.mapStore.customMapPacks).toHaveLength(1)
    expect(installed.mapStore.customMapPacks[0]).toMatchObject({
      id: resource.ownerResourceId,
      assetId: installed.assetId,
      labelEn: 'Demo Borough',
      places: [
        expect.objectContaining({
          id: 'demo-studio',
          nameEn: 'Practice Studio',
          category: 'work',
        }),
      ],
      provenance: {
        kind: 'map_catalog',
        resourceId: resource.id,
        catalogId: resource.catalogId,
        catalogVersion: 1,
      },
    })
    expect(installed.result.resource.origins).toEqual([
      { kind: 'independent', id: 'map_catalog' },
    ])

    const mutation = vi.spyOn(installed.mapStore, 'commitManagedMapPackMutation')
    const suite = createSuite(resource)
    const suiteResult = await executeWorldSuitePlan({
      manifest: suite,
      plan: buildWorldSuiteInstallPlan({
        manifest: suite,
        installedResources: installed.result.inventory.resources,
      }),
      inventory: installed.result.inventory,
      adapterRegistry: installed.registry,
      now: 2_000,
    })

    expect(suiteResult.ok).toBe(true)
    expect(mutation).not.toHaveBeenCalled()
    expect(installed.mapStore.customMapPacks).toHaveLength(1)
    expect(suiteResult.inventory.resources[0].origins).toEqual([
      { kind: 'independent', id: 'map_catalog' },
      { kind: 'suite', id: suite.id },
    ])
  })

  test('persists Catalog places and provenance so a fresh Store reopens complete native truth', async () => {
    const installed = await installIndependent()
    expect(installed.result.ok).toBe(true)

    setActivePinia(createPinia())
    const reopenedMapStore = useMapStore()
    const reopenedGalleryStore = useGalleryStore()
    await waitForStores({ galleryStore: reopenedGalleryStore })

    expect(reopenedMapStore.customMapPacks[0]).toMatchObject({
      id: 'demo-borough-v1',
      places: [
        expect.objectContaining({
          id: 'demo-studio',
          position: { kind: 'canvas', x: 0.36, y: 0.42 },
          aliases: ['Studio'],
        }),
      ],
      provenance: {
        resourceId: 'map.demo-borough',
        catalogVersion: 1,
      },
    })
    expect(reopenedGalleryStore.findAssetById(installed.assetId)).toBeTruthy()
  })

  test('keeps ordinary user import lightweight and strips forged provenance plus authored places', async () => {
    const { mapStore, assetId } = await createHarness()
    const created = mapStore.createCustomMapPack({
      id: 'user-map',
      assetId,
      labelEn: 'User Map',
      places: [
        {
          id: 'forged-system-place',
          nameEn: 'Forged system place',
          category: 'work',
          position: { kind: 'canvas', x: 0.5, y: 0.5 },
        },
      ],
      provenance: {
        kind: 'map_catalog',
        resourceId: 'map.forged',
        catalogId: 'forged-catalog',
        catalogVersion: 1,
        installedFingerprint: 'map_fp_1_1',
      },
    })

    expect(created).toMatchObject({ id: 'user-map', places: [] })
    expect(created).not.toHaveProperty('provenance')
  })

  test('fails closed for missing, mismatched, malformed, or unavailable Catalog records', async () => {
    const missing = await installIndependent({ resolveCatalogMapPack: () => null })
    expect(missing.result).toMatchObject({ ok: false, code: 'catalog_map_pack_not_found' })
    expect(missing.mapStore.customMapPacks).toEqual([])

    setActivePinia(createPinia())
    localStorage.clear()
    const mismatchedVersion = await installIndependent({
      resolveCatalogMapPack: () => ({
        catalogId: 'demo-borough-catalog',
        catalogVersion: 9,
        mapPack: { assetId: 'unused', labelEn: 'Wrong version' },
      }),
    })
    expect(mismatchedVersion.result).toMatchObject({
      ok: false,
      code: 'catalog_version_mismatch',
    })

    setActivePinia(createPinia())
    localStorage.clear()
    const invalidPlace = await installIndependent({
      resolveCatalogMapPack: (_catalogId, version) => ({
        catalogId: 'demo-borough-catalog',
        catalogVersion: version,
        mapPack: {
          assetId: 'unused',
          labelEn: 'Invalid place map',
          places: [
            {
              id: 'invalid-category-place',
              nameEn: 'Invalid category',
              category: 'catalog-only-unknown-category',
              position: { kind: 'canvas', x: 0.8, y: 0.8 },
            },
          ],
        },
      }),
    })
    expect(invalidPlace.result).toMatchObject({
      ok: false,
      code: 'invalid_catalog_map_pack',
    })

    setActivePinia(createPinia())
    localStorage.clear()
    const invalidFaction = await installIndependent({
      resolveCatalogMapPack: (_catalogId, version) => ({
        catalogId: 'demo-borough-catalog',
        catalogVersion: version,
        mapPack: {
          assetId: 'unused',
          labelEn: 'Invalid faction map',
          factions: [
            {
              id: 'invalid-faction',
              labelEn: 'Invalid faction',
              position: { kind: 'canvas', x: 4, y: 4 },
            },
          ],
        },
      }),
    })
    expect(invalidFaction.result).toMatchObject({
      ok: false,
      code: 'invalid_catalog_map_pack',
    })

    setActivePinia(createPinia())
    localStorage.clear()
    const harness = await createHarness()
    const catalog = createCatalog(harness.assetId)
    const record = catalog('demo-borough-catalog', 1)
    record.mapPack.assetId = 'missing-gallery-asset'
    const unavailableAdapter = createProductionMapWorldSuiteOwnerAdapter({
      mapStore: harness.mapStore,
      galleryStore: harness.galleryStore,
      simulationStore: harness.simulationStore,
      chatStore: harness.chatStore,
      resolveCatalogMapPack: () => record,
    })
    expect(await unavailableAdapter.install({ resource: createResource() })).toMatchObject({
      ok: false,
      code: 'gallery_asset_missing',
    })
  })

  test('never claims built-ins, user collisions, or another Catalog resource', async () => {
    const harness = await createHarness()
    const builtInResource = createResource(1, {
      id: 'map.real-seoul',
      ownerResourceId: 'real-seoul-v1',
      catalogId: 'real-seoul-catalog',
    })
    expect(await harness.adapter.install({ resource: builtInResource })).toMatchObject({
      ok: false,
      code: 'identity_collision',
    })

    expect(
      harness.mapStore.createCustomMapPack({
        id: 'demo-borough-v1',
        assetId: harness.assetId,
        labelEn: 'User collision',
      }),
    ).toBeTruthy()
    expect(await harness.adapter.install({ resource: createResource() })).toMatchObject({
      ok: false,
      code: 'identity_collision',
    })
  })

  test('keeps every mutation unavailable when composed with a read-only inspection Adapter', async () => {
    const installed = await installIndependent()
    const mutation = vi.spyOn(installed.mapStore, 'commitManagedMapPackMutation')
    const evidence = installed.adapter.inspect({ resource: installed.resource })
    const readOnlyAdapter = createMapWorldSuiteOwnerAdapter({
      mapStore: installed.mapStore,
      inspectMapResource: () => ({
        ...evidence,
        mutationAdapterAvailable: false,
        canInstall: false,
      }),
      resolveCatalogMapPack: createCatalog(installed.assetId),
      hasGalleryAsset: () => true,
    })

    expect(await readOnlyAdapter.update({ resource: createResource(2) })).toMatchObject({
      ok: false,
      code: 'owner_mutation_unavailable',
    })
    expect(await readOnlyAdapter.remove({ resource: installed.resource })).toMatchObject({
      ok: false,
      code: 'owner_mutation_unavailable',
    })

    const absentReadOnlyAdapter = createMapWorldSuiteOwnerAdapter({
      mapStore: installed.mapStore,
      inspectMapResource: ({ resource }) => ({
        ...evidence,
        id: resource.id,
        ownerResourceId: resource.ownerResourceId,
        installed: false,
        collision: false,
        capacity: { reached: false },
        mutationAdapterAvailable: false,
        canInstall: false,
      }),
      resolveCatalogMapPack: createCatalog(installed.assetId),
      hasGalleryAsset: () => true,
    })
    expect(await absentReadOnlyAdapter.install({ resource: createResource(1, {
      id: 'map.read-only-demo',
      ownerResourceId: 'read-only-demo-v1',
    }) })).toMatchObject({
      ok: false,
      code: 'owner_mutation_unavailable',
    })
    expect(mutation).not.toHaveBeenCalled()
  })

  test('updates pristine unused content and treats authored topology edits as user modification', async () => {
    const installed = await installIndependent()
    expect(await installed.adapter.update({ resource: createResource(2) })).toEqual({ ok: true })
    expect(installed.mapStore.customMapPacks[0]).toMatchObject({
      labelEn: 'Demo Borough Phase Two',
      places: [
        expect.objectContaining({ id: 'demo-studio' }),
        expect.objectContaining({ id: 'demo-cafe' }),
      ],
      provenance: { catalogVersion: 2 },
    })

    installed.mapStore.customMapPacks[0].places[0].nameEn = 'My private studio name'
    const evidence = installed.adapter.inspect({ resource: createResource(3) })
    const plan = buildWorldResourceInstallPlan({
      resource: createResource(3),
      installedResources: [evidence],
    })
    expect(evidence.userModified).toBe(true)
    expect(plan).toMatchObject({
      action: WORLD_SUITE_PLAN_ACTIONS.REVIEW_UPDATE,
      reason: 'user_review_required',
    })
    expect(await installed.adapter.update({ resource: createResource(3) })).toMatchObject({
      ok: false,
      code: 'user_modified',
    })
  })

  test('requires an explicit migration before replacing topology or moving an existing authored place', async () => {
    const installed = await installIndependent()
    const baseCatalog = createCatalog(installed.assetId)
    const movedPlaceResolver = (catalogId, version) => {
      const record = structuredClone(baseCatalog(catalogId, version))
      record.mapPack.places[0].position = { kind: 'canvas', x: 0.8, y: 0.8 }
      return record
    }
    const movedPlaceAdapter = createProductionMapWorldSuiteOwnerAdapter({
      mapStore: installed.mapStore,
      galleryStore: installed.galleryStore,
      simulationStore: installed.simulationStore,
      chatStore: installed.chatStore,
      resolveCatalogMapPack: movedPlaceResolver,
    })

    expect(await movedPlaceAdapter.update({ resource: createResource(2) })).toMatchObject({
      ok: false,
      code: 'topology_migration_required',
    })
    expect(installed.mapStore.customMapPacks[0]).toMatchObject({
      labelEn: 'Demo Borough',
      places: [expect.objectContaining({ position: { kind: 'canvas', x: 0.36, y: 0.42 } })],
      provenance: { catalogVersion: 1 },
    })
  })

  test('blocks update and removal for current or historical references', async () => {
    const current = await installIndependent()
    expect(current.mapStore.bindMapPackToWorld('modern_parallel', current.resource.ownerResourceId)).toBe(
      true,
    )
    expect(await current.adapter.update({ resource: createResource(2) })).toMatchObject({
      ok: false,
      code: 'resource_in_use',
    })
    expect(await current.adapter.remove({ resource: createResource() })).toMatchObject({
      ok: false,
      code: 'resource_in_use',
    })

    setActivePinia(createPinia())
    localStorage.clear()
    const historical = await installIndependent()
    const snapshot = historical.mapStore.createBackupSnapshot()
    snapshot.tripHistory = [
      {
        id: 'journey-old',
        journeyId: 'journey-old',
        status: 'arrived',
        mapPackId: historical.resource.ownerResourceId,
        from: 'North Ring',
        to: 'Practice Studio',
        startedAt: 1_000,
        endedAt: 2_000,
      },
    ]
    expect(historical.mapStore.restoreFromBackup({ map: snapshot })).toBe(true)
    expect(await historical.adapter.remove({ resource: historical.resource })).toMatchObject({
      ok: false,
      code: 'historical_references',
    })
  })

  test('removes only a pristine managed Map pack and leaves Gallery-owned artwork intact', async () => {
    const installed = await installIndependent()
    const removed = await installed.adapter.remove({ resource: installed.resource })

    expect(removed).toEqual({ ok: true })
    expect(installed.mapStore.customMapPacks).toEqual([])
    expect(installed.galleryStore.findAssetById(installed.assetId)).toBeTruthy()
    expect(installed.adapter.inspect({ resource: installed.resource })).toMatchObject({
      installed: false,
      mutationAdapterAvailable: true,
      canInstall: true,
    })
  })

  test('does not advance installation evidence when the native Map write fails', async () => {
    const harness = await createHarness()
    const resource = createResource()
    const originalSetItem = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'schatphone:store:map') {
        throw new DOMException('quota', 'QuotaExceededError')
      }
      return originalSetItem.call(this, key, value)
    })

    const result = await executeWorldResourcePlan({
      resource,
      plan: buildWorldResourceInstallPlan({ resource }),
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: harness.registry,
      originId: 'map_catalog',
    })

    expect(result).toMatchObject({ ok: false, code: 'quota_exceeded' })
    expect(result.inventory.resources).toEqual([])
    expect(harness.mapStore.customMapPacks).toEqual([])
  })

  test('repairs a lost inventory checkpoint without repeating the native Map mutation', async () => {
    const harness = await createHarness()
    const mutation = vi.spyOn(harness.mapStore, 'commitManagedMapPackMutation')
    const resource = createResource()
    const persistedInventory = createEmptyWorldSuiteInventory()
    const plan = buildWorldResourceInstallPlan({ resource })

    const interrupted = await executeWorldResourcePlan({
      resource,
      plan,
      inventory: persistedInventory,
      adapterRegistry: harness.registry,
      originId: 'map_catalog',
      onInventoryChanged: () => false,
    })
    const retried = await executeWorldResourcePlan({
      resource,
      plan,
      inventory: persistedInventory,
      adapterRegistry: harness.registry,
      originId: 'map_catalog',
    })

    expect(interrupted).toMatchObject({ ok: false, code: 'inventory_checkpoint_failed' })
    expect(retried.ok).toBe(true)
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(harness.mapStore.customMapPacks).toHaveLength(1)
    expect(retried.resource.origins).toEqual([{ kind: 'independent', id: 'map_catalog' }])
  })
})
