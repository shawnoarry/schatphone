import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createGalleryWorldSuiteOwnerAdapter } from '../src/lib/gallery-world-suite-owner-adapter'
import {
  buildWorldResourceInstallPlan,
  buildWorldSuiteInstallPlan,
  buildWorldSuiteUninstallPlan,
} from '../src/lib/world-suite-manifest'
import {
  createWorldSuiteOwnerAdapterRegistry,
  executeWorldResourcePlan,
  executeWorldSuitePlan,
} from '../src/lib/world-suite-owner-adapters'
import { createEmptyWorldSuiteInventory } from '../src/lib/world-suite-inventory'
import { useGalleryStore } from '../src/stores/gallery'

const createResource = (version = 1) => ({
  id: 'gallery.demo-world-art',
  type: 'gallery_asset_pack',
  owner: 'gallery',
  ownerResourceId: 'demo-world-art-folder',
  catalogId: 'demo-world-art-catalog',
  version,
})

const createSuite = (resource = createResource()) => ({
  id: 'demo_world_suite',
  version: 1,
  title: 'Demo World Suite',
  resources: [resource],
})

const createCatalog = () => (catalogId, version) => {
  if (catalogId !== 'demo-world-art-catalog' || ![1, 2].includes(version)) return null
  const assets = [
    {
      id: 'demo-world-map-art',
      name: `Demo Map V${version}`,
      category: 'scenario',
      url: `https://example.com/map-v${version}.webp`,
    },
  ]
  if (version >= 2) {
    assets.push({
      id: 'demo-world-scene-art',
      name: 'Demo Scene V2',
      category: 'scenario',
      url: 'https://example.com/scene-v2.webp',
    })
  }
  return {
    catalogId,
    catalogVersion: version,
    assetPack: {
      name: `Demo World Art V${version}`,
      category: 'scenario',
      assets,
    },
  }
}

const createHarness = async () => {
  const galleryStore = useGalleryStore()
  await vi.waitFor(() => expect(galleryStore.hasFinishedStorageHydration).toBe(true))
  const adapter = createGalleryWorldSuiteOwnerAdapter({
    galleryStore,
    resolveCatalogAssetPack: createCatalog(),
  })
  return {
    galleryStore,
    adapter,
    registry: createWorldSuiteOwnerAdapterRegistry([adapter]),
  }
}

describe('Gallery World Suite Owner Adapter', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('uses one Adapter for independent and Suite installation and reopens native provenance', async () => {
    const resource = createResource()
    const harness = await createHarness()
    const independent = await executeWorldResourcePlan({
      resource,
      plan: buildWorldResourceInstallPlan({ resource }),
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: harness.registry,
      originId: 'gallery_catalog',
      now: 1_000,
    })
    expect(independent.ok).toBe(true)
    expect(harness.galleryStore.findFolderById(resource.ownerResourceId)?.provenance).toMatchObject({
      resourceId: resource.id,
      catalogVersion: 1,
    })

    const suite = createSuite(resource)
    const suitePlan = buildWorldSuiteInstallPlan({
      manifest: suite,
      installedResources: independent.inventory.resources,
    })
    const suiteInstall = await executeWorldSuitePlan({
      manifest: suite,
      plan: suitePlan,
      inventory: independent.inventory,
      adapterRegistry: harness.registry,
      now: 2_000,
    })
    expect(suiteInstall.ok).toBe(true)
    expect(harness.galleryStore.assets).toHaveLength(1)
    expect(suiteInstall.inventory.resources[0].origins).toEqual(
      expect.arrayContaining([
        { kind: 'independent', id: 'gallery_catalog' },
        { kind: 'suite', id: suite.id },
      ]),
    )

    setActivePinia(createPinia())
    const reopened = useGalleryStore()
    await vi.waitFor(() => expect(reopened.hasFinishedStorageHydration).toBe(true))
    const reopenedAdapter = createGalleryWorldSuiteOwnerAdapter({
      galleryStore: reopened,
      resolveCatalogAssetPack: createCatalog(),
    })
    expect(reopenedAdapter.inspect({ resource })).toMatchObject({
      installed: true,
      userModified: false,
      version: 1,
      assetCount: 1,
    })
  })

  test('blocks update after a user edit', async () => {
    const resource = createResource()
    const harness = await createHarness()
    expect((await harness.adapter.install({ resource })).ok).toBe(true)

    harness.galleryStore.renameAsset('demo-world-map-art', 'User renamed art')
    expect(harness.adapter.inspect({ resource })).toMatchObject({ userModified: true })
    expect(await harness.adapter.update({ resource: createResource(2) })).toEqual({
      ok: false,
      code: 'user_modified',
    })
  })

  test('blocks removal while a native asset is in use', async () => {
    const resource = createResource()
    const harness = await createHarness()
    expect((await harness.adapter.install({ resource })).ok).toBe(true)
    expect(
      harness.galleryStore.bindAssetUsage('demo-world-map-art', {
        moduleKey: 'map',
        targetKey: 'pack.demo.asset',
      }),
    ).toBe(true)
    expect(harness.adapter.inspect({ resource })).toMatchObject({ inUse: true })
    expect(await harness.adapter.remove({ resource })).toEqual({
      ok: false,
      code: 'resource_in_use',
    })
  })

  test('protects user reuse when a managed asset is added to another Gallery folder', async () => {
    const resource = createResource()
    const harness = await createHarness()
    expect((await harness.adapter.install({ resource })).ok).toBe(true)
    const userFolder = harness.galleryStore.createFolder({
      name: 'My reusable maps',
      category: 'scenario',
      assetIds: ['demo-world-map-art'],
    })

    expect(harness.adapter.inspect({ resource })).toMatchObject({
      installed: true,
      userModified: false,
      inUse: true,
    })
    expect(await harness.adapter.remove({ resource })).toEqual({
      ok: false,
      code: 'resource_in_use',
    })
    expect(
      await harness.galleryStore.commitManagedAssetPackMutation({
        operation: 'delete',
        folderId: resource.ownerResourceId,
      }),
    ).toEqual({ ok: false, code: 'resource_in_use' })
    expect(harness.galleryStore.findFolderById(userFolder.id)?.assetIds).toEqual([
      'demo-world-map-art',
    ])
  })

  test('updates a pristine pack in place while retaining stable Gallery asset IDs', async () => {
    const resource = createResource()
    const harness = await createHarness()
    expect((await harness.adapter.install({ resource })).ok).toBe(true)
    expect(await harness.adapter.update({ resource: createResource(2) })).toEqual({ ok: true })
    expect(harness.galleryStore.assets).toHaveLength(2)
    expect(harness.galleryStore.findAssetById('demo-world-map-art')).toMatchObject({
      id: 'demo-world-map-art',
      name: 'Demo Map V2',
      sourceUrl: 'https://example.com/map-v2.webp',
      provenance: { catalogVersion: 2 },
    })
    expect(harness.galleryStore.findAssetById('demo-world-scene-art')).toMatchObject({
      sourceUrl: 'https://example.com/scene-v2.webp',
      provenance: { catalogVersion: 2 },
    })
    expect(harness.adapter.inspect({ resource: createResource(2) })).toMatchObject({
      installed: true,
      version: 2,
      userModified: false,
    })
  })

  test('detaches a shared origin and removes only a pristine Suite-only pack', async () => {
    const resource = createResource()
    const suite = createSuite(resource)
    const harness = await createHarness()
    const install = await executeWorldSuitePlan({
      manifest: suite,
      plan: buildWorldSuiteInstallPlan({ manifest: suite }),
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: harness.registry,
      now: 1_000,
    })
    expect(install.ok).toBe(true)

    const uninstall = await executeWorldSuitePlan({
      manifest: suite,
      plan: buildWorldSuiteUninstallPlan({
        manifest: suite,
        installedResources: install.inventory.resources,
      }),
      inventory: install.inventory,
      adapterRegistry: harness.registry,
      operation: 'uninstall',
      now: 2_000,
    })
    expect(uninstall.ok).toBe(true)
    expect(harness.galleryStore.findFolderById(resource.ownerResourceId)).toBeNull()
    expect(harness.galleryStore.findAssetById('demo-world-map-art')).toBeNull()
  })

  test('repairs a lost inventory checkpoint without repeating the native Gallery mutation', async () => {
    const resource = createResource()
    const harness = await createHarness()
    const nativeMutation = vi.spyOn(harness.galleryStore, 'commitManagedAssetPackMutation')
    const plan = buildWorldResourceInstallPlan({ resource })

    const interrupted = await executeWorldResourcePlan({
      resource,
      plan,
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: harness.registry,
      originId: 'gallery_catalog',
      now: 1_000,
      onInventoryChanged: () => false,
    })
    expect(interrupted).toMatchObject({ ok: false, code: 'inventory_checkpoint_failed' })
    expect(nativeMutation).toHaveBeenCalledTimes(1)
    expect(harness.galleryStore.findFolderById(resource.ownerResourceId)).toBeTruthy()

    const repaired = await executeWorldResourcePlan({
      resource,
      plan,
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: harness.registry,
      originId: 'gallery_catalog',
      now: 2_000,
    })
    expect(repaired.ok).toBe(true)
    expect(nativeMutation).toHaveBeenCalledTimes(1)
    expect(repaired.inventory.resources[0]).toMatchObject({
      id: resource.id,
      installed: true,
    })
  })

  test('does not duplicate or claim a user asset with the same Catalog URL', async () => {
    const resource = createResource()
    const harness = await createHarness()
    const imported = harness.galleryStore.importAssetFromUrl({
      url: 'https://example.com/map-v1.webp',
      category: 'scenario',
      name: 'User-owned existing map',
    })
    expect(imported.ok).toBe(true)

    expect(await harness.adapter.install({ resource })).toEqual({
      ok: false,
      code: 'identity_collision',
    })
    expect(harness.galleryStore.assets).toHaveLength(1)
    expect(harness.galleryStore.findAssetById(imported.assetId)?.provenance).toBeUndefined()
    expect(harness.galleryStore.findFolderById(resource.ownerResourceId)).toBeNull()
  })
})
