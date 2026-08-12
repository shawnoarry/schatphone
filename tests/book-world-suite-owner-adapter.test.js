import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookStore } from '../src/stores/book'
import { useSystemStore } from '../src/stores/system'
import {
  BOOK_WORLD_SUITE_SOURCE_KIND,
  createBookWorldSuiteOwnerAdapter,
} from '../src/lib/book-world-suite-owner-adapter'
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
  id: 'book.demo-core',
  type: 'book_asset',
  owner: 'book',
  ownerResourceId: 'demo_core_book',
  catalogId: 'demo_core_catalog',
  version,
  ...overrides,
})

const createSuite = (resource = createResource()) => ({
  id: 'demo_world_suite',
  version: 1,
  title: 'Demo world suite',
  resources: [resource],
})

const createCatalog = () => {
  const records = new Map([
    ['demo_core_catalog:1', {
      catalogId: 'demo_core_catalog',
      catalogVersion: 1,
      asset: {
        title: 'Demo Core',
        category: 'worldview',
        format: 'markdown',
        tags: ['demo'],
        content: '# Demo\n\nVersion one.',
      },
    }],
    ['demo_core_catalog:2', {
      catalogId: 'demo_core_catalog',
      catalogVersion: 2,
      asset: {
        title: 'Demo Core Revised',
        category: 'worldview',
        format: 'markdown',
        tags: ['demo', 'revised'],
        content: '# Demo\n\nVersion two.',
      },
    }],
  ])
  return (catalogId, version) => records.get(`${catalogId}:${version}`) || null
}

const waitForBook = async (bookStore) => {
  await vi.waitFor(() => expect(bookStore.hasFinishedStorageHydration).toBe(true))
}

const createHarness = async ({ links = [], resolveCatalogAsset = createCatalog() } = {}) => {
  const bookStore = useBookStore()
  await waitForBook(bookStore)
  const adapter = createBookWorldSuiteOwnerAdapter({
    bookStore,
    listWorldBookSourceLinks: () => links,
    resolveCatalogAsset,
  })
  const registry = createWorldSuiteOwnerAdapterRegistry([adapter])
  return { bookStore, adapter, registry }
}

const installIndependent = async ({ resource = createResource(), ...options } = {}) => {
  const harness = await createHarness(options)
  const result = await executeWorldResourcePlan({
    resource,
    plan: buildWorldResourceInstallPlan({ resource }),
    inventory: createEmptyWorldSuiteInventory(),
    adapterRegistry: harness.registry,
    originId: 'book_catalog',
    now: 1_000,
  })
  return { ...harness, result, resource }
}

describe('Book World Suite Owner Adapter', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('uses one Adapter for independent and Suite installation without copying content into the manifest', async () => {
    const resource = createResource()
    expect(resource).not.toHaveProperty('content')
    const { bookStore, registry, result } = await installIndependent({ resource })
    const mutation = vi.spyOn(bookStore, 'commitManagedAssetMutation')

    expect(result.ok).toBe(true)
    expect(bookStore.assetCount).toBe(1)
    expect(bookStore.findAssetById(resource.ownerResourceId)).toMatchObject({
      title: 'Demo Core',
      status: 'draft',
      locked: false,
      source: {
        kind: BOOK_WORLD_SUITE_SOURCE_KIND,
        resourceId: resource.id,
        catalogId: resource.catalogId,
        catalogVersion: 1,
      },
    })
    expect(result.resource.origins).toEqual([{ kind: 'independent', id: 'book_catalog' }])

    const suite = createSuite(resource)
    const suiteResult = await executeWorldSuitePlan({
      manifest: suite,
      plan: buildWorldSuiteInstallPlan({
        manifest: suite,
        installedResources: result.inventory.resources,
      }),
      inventory: result.inventory,
      adapterRegistry: registry,
      now: 2_000,
    })

    expect(suiteResult.ok).toBe(true)
    expect(mutation).not.toHaveBeenCalled()
    expect(bookStore.assetCount).toBe(1)
    expect(suiteResult.inventory.resources[0].origins).toEqual([
      { kind: 'independent', id: 'book_catalog' },
      { kind: 'suite', id: suite.id },
    ])
  })

  test('persists the installed Book asset so a fresh Store can restore native truth', async () => {
    const installed = await installIndependent()
    expect(installed.result.ok).toBe(true)

    setActivePinia(createPinia())
    const restoredStore = useBookStore()
    await waitForBook(restoredStore)

    expect(restoredStore.findAssetById('demo_core_book')).toMatchObject({
      title: 'Demo Core',
      content: '# Demo\n\nVersion one.',
      source: {
        kind: BOOK_WORLD_SUITE_SOURCE_KIND,
        resourceId: 'book.demo-core',
        catalogId: 'demo_core_catalog',
        catalogVersion: 1,
      },
    })
  })

  test('fails closed for missing or mismatched Catalog records', async () => {
    const missing = await installIndependent({ resolveCatalogAsset: () => null })
    expect(missing.result).toMatchObject({ ok: false, code: 'catalog_asset_not_found' })
    expect(missing.bookStore.assetCount).toBe(0)

    setActivePinia(createPinia())
    localStorage.clear()
    const mismatched = await installIndependent({
      resolveCatalogAsset: () => ({
        catalogId: 'demo_core_catalog',
        catalogVersion: 9,
        asset: { title: 'Wrong version', content: 'Wrong.' },
      }),
    })
    expect(mismatched.result).toMatchObject({ ok: false, code: 'catalog_version_mismatch' })
    expect(mismatched.bookStore.assetCount).toBe(0)

    setActivePinia(createPinia())
    localStorage.clear()
    const ambiguousBookVersion = await installIndependent({
      resolveCatalogAsset: () => ({
        catalogId: 'demo_core_catalog',
        version: 1,
        asset: { title: 'Ambiguous version', content: 'Must not be accepted.' },
      }),
    })
    expect(ambiguousBookVersion.result).toMatchObject({
      ok: false,
      code: 'catalog_version_mismatch',
    })
    expect(ambiguousBookVersion.bookStore.assetCount).toBe(0)
  })

  test('never retroactively claims built-in K-pop content or a colliding user asset', async () => {
    const builtInResource = createResource(1, {
      id: 'book.kpop-existing',
      ownerResourceId: 'built_in_modern_seoul_kpop_main_worldview',
    })
    const builtIn = await installIndependent({ resource: builtInResource })
    expect(builtIn.result).toMatchObject({ ok: false, code: 'identity_collision' })
    expect(builtIn.bookStore.findAssetById(builtInResource.ownerResourceId)?.source.kind).toBe('built_in')
    expect(builtIn.bookStore.assetCount).toBe(0)

    setActivePinia(createPinia())
    localStorage.clear()
    const { bookStore, registry } = await createHarness()
    bookStore.createAsset({ id: 'demo_core_book', title: 'User collision', content: 'Keep me.' })
    const resource = createResource()
    const collision = await executeWorldResourcePlan({
      resource,
      plan: buildWorldResourceInstallPlan({ resource }),
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: registry,
      originId: 'book_catalog',
    })
    expect(collision).toMatchObject({ ok: false, code: 'identity_collision' })
    expect(bookStore.findAssetById(resource.ownerResourceId)).toMatchObject({
      title: 'User collision',
      content: 'Keep me.',
    })
  })

  test('does not let a different manifest resource claim the same native Book asset', async () => {
    const installed = await installIndependent()
    const competingResource = createResource(1, { id: 'book.competing-core' })

    expect(await installed.adapter.inspect({ resource: competingResource })).toMatchObject({
      installed: false,
      collision: true,
    })
    expect(await installed.adapter.install({ resource: competingResource })).toMatchObject({
      ok: false,
      code: 'identity_collision',
    })
    expect(installed.bookStore.assetCount).toBe(1)
  })

  test('reports user edits and WorldBook references as native review evidence', async () => {
    const links = []
    const installed = await installIndependent({ links })
    installed.bookStore.updateAsset(installed.resource.ownerResourceId, { title: 'My edited title' })
    links.push({ assetId: installed.resource.ownerResourceId, enabled: true })

    const evidence = await installed.adapter.inspect({ resource: createResource(2) })
    const plan = buildWorldResourceInstallPlan({
      resource: createResource(2),
      installedResources: [evidence],
    })

    expect(evidence).toMatchObject({
      installed: true,
      version: 1,
      userModified: true,
      inUse: true,
      historicalReferenceCount: 1,
    })
    expect(plan).toMatchObject({
      action: WORLD_SUITE_PLAN_ACTIONS.REVIEW_UPDATE,
      reason: 'resource_in_use',
    })
  })

  test('treats a user-edited section structure as managed content modification', async () => {
    const installed = await installIndependent()
    const asset = installed.bookStore.findAssetById(installed.resource.ownerResourceId)
    installed.bookStore.updateAsset(installed.resource.ownerResourceId, {
      sections: asset.sections.map((section) => ({ ...section, title: 'My section title' })),
    })

    expect(await installed.adapter.inspect({ resource: installed.resource })).toMatchObject({
      installed: true,
      userModified: true,
    })
  })

  test('reads live WorldBook links from the real System Store', async () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    await waitForBook(bookStore)
    const adapter = createBookWorldSuiteOwnerAdapter({
      bookStore,
      listWorldBookSourceLinks: () => systemStore.listWorldBookSourceLinks(),
      resolveCatalogAsset: createCatalog(),
    })
    expect((await adapter.install({ resource: createResource() })).ok).toBe(true)
    systemStore.addWorldBookSourceLink({
      assetId: 'demo_core_book',
      role: 'main_worldview',
      enabled: true,
    })

    expect(await adapter.inspect({ resource: createResource() })).toMatchObject({
      inUse: true,
      historicalReferenceCount: 1,
    })
  })

  test('updates pristine Catalog content while preserving Book-owned user state', async () => {
    const installed = await installIndependent()
    installed.bookStore.updateAsset(installed.resource.ownerResourceId, {
      favorite: true,
      status: 'archived',
      locked: true,
    })

    const result = await installed.adapter.update({ resource: createResource(2) })
    const asset = installed.bookStore.findAssetById(installed.resource.ownerResourceId)

    expect(result.ok).toBe(true)
    expect(asset).toMatchObject({
      title: 'Demo Core Revised',
      content: '# Demo\n\nVersion two.',
      favorite: true,
      status: 'archived',
      locked: true,
      source: {
        kind: BOOK_WORLD_SUITE_SOURCE_KIND,
        resourceId: 'book.demo-core',
        catalogId: 'demo_core_catalog',
        catalogVersion: 2,
      },
    })
    expect(await installed.adapter.inspect({ resource: createResource(2) })).toMatchObject({
      installed: true,
      version: 2,
      userModified: false,
    })
  })

  test('refuses update or removal when content changed or any WorldBook history exists', async () => {
    const links = []
    const installed = await installIndependent({ links })
    installed.bookStore.updateAsset(installed.resource.ownerResourceId, { content: 'My revision.' })
    expect(await installed.adapter.update({ resource: createResource(2) })).toMatchObject({
      ok: false,
      code: 'user_modified',
    })
    expect(await installed.adapter.remove({ resource: createResource() })).toMatchObject({
      ok: false,
      code: 'user_modified',
    })

    installed.bookStore.updateAsset(installed.resource.ownerResourceId, {
      content: '# Demo\n\nVersion one.',
      title: 'Demo Core',
    })
    links.push({ assetId: installed.resource.ownerResourceId, enabled: false })
    expect(await installed.adapter.remove({ resource: createResource() })).toMatchObject({
      ok: false,
      code: 'historical_references',
    })
  })

  test('removes a pristine managed asset and confirms native absence', async () => {
    const installed = await installIndependent()
    const removed = await installed.adapter.remove({ resource: installed.resource })

    expect(removed.ok).toBe(true)
    expect(installed.bookStore.findAssetById(installed.resource.ownerResourceId)).toBeNull()
    expect(await installed.adapter.inspect({ resource: installed.resource })).toMatchObject({
      installed: false,
    })
  })

  test('fails closed for read-only storage and full capacity without truncating existing assets', async () => {
    const readOnly = await createHarness()
    readOnly.bookStore.storageReadOnly = true
    expect(await readOnly.adapter.install({ resource: createResource() })).toMatchObject({
      ok: false,
      code: 'read_only_conflict',
    })

    setActivePinia(createPinia())
    localStorage.clear()
    const full = await createHarness()
    const assets = Array.from({ length: full.bookStore.assetLimit }, (_, index) => ({
      id: `capacity_asset_${index}`,
      title: `Capacity ${index}`,
      content: `Content ${index}`,
      createdAt: index + 1,
      updatedAt: index + 1,
    }))
    full.bookStore.restoreFromBackup({ assets, categories: [] })
    const beforeIds = full.bookStore.assets.map((asset) => asset.id)

    expect(await full.adapter.install({ resource: createResource() })).toMatchObject({
      ok: false,
      code: 'capacity_reached',
    })
    expect(full.bookStore.assetCount).toBe(full.bookStore.assetLimit)
    expect(full.bookStore.assets.map((asset) => asset.id)).toEqual(beforeIds)
  })

  test('rolls memory back when legacy persistence fails', async () => {
    const { bookStore, adapter } = await createHarness()
    const previousRaw = localStorage.getItem('schatphone:store:book')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    const result = await adapter.install({ resource: createResource() })

    expect(result).toMatchObject({ ok: false, code: 'quota_exceeded' })
    expect(bookStore.findAssetById('demo_core_book')).toBeNull()
    expect(bookStore.assetCount).toBe(0)
    expect(localStorage.getItem('schatphone:store:book')).toBe(previousRaw)
  })

  test('repairs a lost inventory checkpoint without repeating the Book mutation', async () => {
    const { bookStore, registry } = await createHarness()
    const mutation = vi.spyOn(bookStore, 'commitManagedAssetMutation')
    const resource = createResource()
    const persistedInventory = createEmptyWorldSuiteInventory()

    const interrupted = await executeWorldResourcePlan({
      resource,
      plan: buildWorldResourceInstallPlan({ resource }),
      inventory: persistedInventory,
      adapterRegistry: registry,
      originId: 'book_catalog',
      onInventoryChanged: () => false,
    })
    const retried = await executeWorldResourcePlan({
      resource,
      plan: buildWorldResourceInstallPlan({ resource }),
      inventory: persistedInventory,
      adapterRegistry: registry,
      originId: 'book_catalog',
    })

    expect(interrupted).toMatchObject({ ok: false, code: 'inventory_checkpoint_failed' })
    expect(retried.ok).toBe(true)
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(bookStore.assetCount).toBe(1)
    expect(retried.resource.origins).toEqual([{ kind: 'independent', id: 'book_catalog' }])
  })
})
