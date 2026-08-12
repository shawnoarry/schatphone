import { describe, expect, test } from 'vitest'
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
import {
  createEmptyWorldSuiteInventory,
  recordInstalledWorldResource,
} from '../src/lib/world-suite-inventory'

const createSuite = () => ({
  id: 'demo_world_suite',
  version: 2,
  title: 'Reusable demo suite',
  resources: [
    {
      id: 'book.demo-core',
      type: 'book_asset',
      ownerResourceId: 'demo-core-book',
      catalogId: 'demo-core-book',
      version: 2,
    },
    {
      id: 'map.demo-city',
      type: 'map_pack',
      ownerResourceId: 'demo-city-map',
      catalogId: 'demo-city-map',
      version: 3,
      dependencies: ['book.demo-core'],
    },
  ],
})

const createOwnerHarness = (owner, calls, { failInstall = false } = {}) => {
  const records = new Map()
  const inspect = ({ resource }) => ({
    id: resource.id,
    type: resource.type,
    owner,
    ownerResourceId: resource.ownerResourceId,
    version: records.get(resource.ownerResourceId)?.version || 1,
    installed: records.has(resource.ownerResourceId),
    enabled: false,
    userModified: false,
    inUse: false,
    historicalReferenceCount: 0,
  })
  return {
    records,
    adapter: {
      owner,
      inspect,
      install: ({ resource }) => {
        calls.push(`${owner}:install:${resource.ownerResourceId}`)
        if (failInstall) return { ok: false, code: `${owner}_install_failed` }
        records.set(resource.ownerResourceId, { version: resource.version })
        return { ok: true }
      },
      update: ({ resource }) => {
        calls.push(`${owner}:update:${resource.ownerResourceId}`)
        records.set(resource.ownerResourceId, { version: resource.version })
        return { ok: true }
      },
      remove: ({ resource }) => {
        calls.push(`${owner}:remove:${resource.ownerResourceId}`)
        records.delete(resource.ownerResourceId)
        return { ok: true }
      },
    },
  }
}

describe('world suite native Owner Adapter execution', () => {
  test('executes two native owners in dependency order and checkpoints only verified truth', async () => {
    const suite = createSuite()
    const calls = []
    const book = createOwnerHarness('book', calls)
    const map = createOwnerHarness('map', calls)
    const registry = createWorldSuiteOwnerAdapterRegistry([book.adapter, map.adapter])
    const checkpoints = []
    const plan = buildWorldSuiteInstallPlan({ manifest: suite, installedResources: [] })

    const result = await executeWorldSuitePlan({
      manifest: suite,
      plan,
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: registry,
      now: 1_000,
      onInventoryChanged: (inventory) => {
        checkpoints.push(inventory)
        return { ok: true }
      },
    })

    expect(result.ok).toBe(true)
    expect(calls).toEqual([
      'book:install:demo-core-book',
      'map:install:demo-city-map',
    ])
    expect(result.inventory.resources.map((resource) => resource.id)).toEqual([
      'book.demo-core',
      'map.demo-city',
    ])
    expect(result.inventory.resources.every((resource) =>
      resource.origins.some((origin) => origin.kind === 'suite' && origin.id === suite.id),
    )).toBe(true)
    expect(result.inventory.suiteStates[0]).toMatchObject({
      status: 'installed',
      completedResourceIds: ['book.demo-core', 'map.demo-city'],
      pendingResourceIds: [],
    })
    expect(checkpoints).toHaveLength(4)
    expect(checkpoints[1].suiteStates[0]).toMatchObject({
      status: 'running',
      completedResourceIds: ['book.demo-core'],
      pendingResourceIds: ['map.demo-city'],
    })

    const rerunPlan = buildWorldSuiteInstallPlan({
      manifest: suite,
      installedResources: result.inventory.resources,
    })
    const rerun = await executeWorldSuitePlan({
      manifest: suite,
      plan: rerunPlan,
      inventory: result.inventory,
      adapterRegistry: registry,
      now: 2_000,
    })
    expect(rerun.ok).toBe(true)
    expect(calls).toHaveLength(2)
    expect(rerun.inventory.resources).toHaveLength(2)
  })

  test('uses the same native Owner Adapter for independent and Suite installation paths', async () => {
    const suite = createSuite()
    const calls = []
    const book = createOwnerHarness('book', calls)
    const map = createOwnerHarness('map', calls)
    book.records.set('demo-core-book', { version: 2 })
    const registry = createWorldSuiteOwnerAdapterRegistry([book.adapter, map.adapter])
    const bookInventory = recordInstalledWorldResource({
      inventory: createEmptyWorldSuiteInventory(),
      resource: suite.resources[0],
      evidence: { installed: true, version: 2, ownerResourceId: 'demo-core-book' },
      origin: { kind: 'independent', id: 'book_catalog' },
    }).inventory
    const independentPlan = buildWorldResourceInstallPlan({
      resource: suite.resources[1],
      installedResources: bookInventory.resources,
    })
    const independent = await executeWorldResourcePlan({
      resource: suite.resources[1],
      plan: independentPlan,
      inventory: bookInventory,
      adapterRegistry: registry,
      originId: 'map_catalog',
      now: 2_500,
    })

    expect(independent.ok).toBe(true)
    expect(calls).toEqual(['map:install:demo-city-map'])
    expect(independent.resource.origins).toEqual([{ kind: 'independent', id: 'map_catalog' }])

    const suitePlan = buildWorldSuiteInstallPlan({
      manifest: suite,
      installedResources: independent.inventory.resources,
    })
    const suiteInstall = await executeWorldSuitePlan({
      manifest: suite,
      plan: suitePlan,
      inventory: independent.inventory,
      adapterRegistry: registry,
      now: 2_600,
    })

    expect(suiteInstall.ok).toBe(true)
    expect(calls).toHaveLength(1)
    expect(
      suiteInstall.inventory.resources.find((resource) => resource.id === 'map.demo-city')?.origins,
    ).toEqual([
      { kind: 'independent', id: 'map_catalog' },
      { kind: 'suite', id: suite.id },
    ])
  })

  test('records a resumable partial checkpoint and retries only the unfinished owner', async () => {
    const suite = createSuite()
    const firstCalls = []
    const book = createOwnerHarness('book', firstCalls)
    const failingMap = createOwnerHarness('map', firstCalls, { failInstall: true })
    const firstRegistry = createWorldSuiteOwnerAdapterRegistry([book.adapter, failingMap.adapter])
    const firstPlan = buildWorldSuiteInstallPlan({ manifest: suite, installedResources: [] })

    const failed = await executeWorldSuitePlan({
      manifest: suite,
      plan: firstPlan,
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: firstRegistry,
      now: 3_000,
    })

    expect(failed).toMatchObject({
      ok: false,
      code: 'map_install_failed',
      completedResourceIds: ['book.demo-core'],
      failedResourceId: 'map.demo-city',
    })
    expect(failed.inventory.resources.map((resource) => resource.id)).toEqual(['book.demo-core'])
    expect(failed.inventory.suiteStates[0]).toMatchObject({
      status: 'partial',
      pendingResourceIds: ['map.demo-city'],
    })

    const retryCalls = []
    const retryMap = createOwnerHarness('map', retryCalls)
    const retryRegistry = createWorldSuiteOwnerAdapterRegistry([book.adapter, retryMap.adapter])
    const retryPlan = buildWorldSuiteInstallPlan({
      manifest: suite,
      installedResources: failed.inventory.resources,
    })
    const retried = await executeWorldSuitePlan({
      manifest: suite,
      plan: retryPlan,
      inventory: failed.inventory,
      adapterRegistry: retryRegistry,
      now: 4_000,
    })

    expect(retried.ok).toBe(true)
    expect(retryCalls).toEqual(['map:install:demo-city-map'])
    expect(firstCalls.filter((call) => call.startsWith('book:install'))).toHaveLength(1)
  })

  test('repairs a lost install checkpoint without repeating the native Owner mutation', async () => {
    const resource = createSuite().resources[0]
    const calls = []
    const book = createOwnerHarness('book', calls)
    const registry = createWorldSuiteOwnerAdapterRegistry([book.adapter])
    const persistedInventory = createEmptyWorldSuiteInventory()
    const plan = buildWorldResourceInstallPlan({
      resource,
      installedResources: persistedInventory.resources,
    })

    const interrupted = await executeWorldResourcePlan({
      resource,
      plan,
      inventory: persistedInventory,
      adapterRegistry: registry,
      originId: 'book_catalog',
      onInventoryChanged: () => false,
    })

    expect(interrupted).toMatchObject({
      ok: false,
      code: 'inventory_checkpoint_failed',
    })
    expect(calls).toEqual(['book:install:demo-core-book'])
    expect(book.records.has('demo-core-book')).toBe(true)

    const retried = await executeWorldResourcePlan({
      resource,
      plan: buildWorldResourceInstallPlan({
        resource,
        installedResources: persistedInventory.resources,
      }),
      inventory: persistedInventory,
      adapterRegistry: registry,
      originId: 'book_catalog',
    })

    expect(retried.ok).toBe(true)
    expect(calls).toEqual(['book:install:demo-core-book'])
    expect(retried.resource).toMatchObject({
      id: 'book.demo-core',
      origins: [{ kind: 'independent', id: 'book_catalog' }],
    })
  })

  test('uninstall detaches shared origins and calls native remove only for pristine Suite-only resources', async () => {
    const suite = createSuite()
    const calls = []
    const book = createOwnerHarness('book', calls)
    const map = createOwnerHarness('map', calls)
    book.records.set('demo-core-book', { version: 2 })
    map.records.set('demo-city-map', { version: 3 })
    const registry = createWorldSuiteOwnerAdapterRegistry([book.adapter, map.adapter])
    let inventory = createEmptyWorldSuiteInventory()
    for (const resource of suite.resources) {
      inventory = recordInstalledWorldResource({
        inventory,
        resource,
        evidence: {
          installed: true,
          version: resource.version,
          ownerResourceId: resource.ownerResourceId,
        },
        origin: { kind: 'suite', id: suite.id },
      }).inventory
    }
    inventory = recordInstalledWorldResource({
      inventory,
      resource: suite.resources[1],
      evidence: {
        installed: true,
        version: 3,
        ownerResourceId: 'demo-city-map',
      },
      origin: { kind: 'independent', id: 'map_catalog' },
    }).inventory
    const plan = buildWorldSuiteUninstallPlan({
      manifest: suite,
      installedResources: inventory.resources,
    })

    const result = await executeWorldSuitePlan({
      manifest: suite,
      plan,
      inventory,
      adapterRegistry: registry,
      operation: 'uninstall',
      now: 5_000,
    })

    expect(result.ok).toBe(true)
    expect(calls).toEqual(['book:remove:demo-core-book'])
    expect(result.inventory.resources).toEqual([
      expect.objectContaining({
        id: 'map.demo-city',
        origins: [{ kind: 'independent', id: 'map_catalog' }],
      }),
    ])
    expect(map.records.has('demo-city-map')).toBe(true)
    expect(book.records.has('demo-core-book')).toBe(false)
    expect(result.inventory.suiteStates[0]).toMatchObject({ status: 'detached' })
  })

  test('repairs a lost remove checkpoint without repeating the native Owner mutation', async () => {
    const suite = {
      ...createSuite(),
      resources: [createSuite().resources[0]],
    }
    const resource = suite.resources[0]
    const calls = []
    const book = createOwnerHarness('book', calls)
    book.records.set(resource.ownerResourceId, { version: resource.version })
    const registry = createWorldSuiteOwnerAdapterRegistry([book.adapter])
    const persistedInventory = recordInstalledWorldResource({
      inventory: createEmptyWorldSuiteInventory(),
      resource,
      evidence: {
        installed: true,
        version: resource.version,
        ownerResourceId: resource.ownerResourceId,
      },
      origin: { kind: 'suite', id: suite.id },
    }).inventory
    const plan = buildWorldSuiteUninstallPlan({
      manifest: suite,
      installedResources: persistedInventory.resources,
    })
    let checkpointCount = 0

    const interrupted = await executeWorldSuitePlan({
      manifest: suite,
      plan,
      inventory: persistedInventory,
      adapterRegistry: registry,
      operation: 'uninstall',
      onInventoryChanged: () => {
        checkpointCount += 1
        return checkpointCount !== 2
      },
    })

    expect(interrupted).toMatchObject({
      ok: false,
      code: 'inventory_checkpoint_failed',
    })
    expect(calls).toEqual(['book:remove:demo-core-book'])
    expect(book.records.has(resource.ownerResourceId)).toBe(false)

    const retried = await executeWorldSuitePlan({
      manifest: suite,
      plan: buildWorldSuiteUninstallPlan({
        manifest: suite,
        installedResources: persistedInventory.resources,
      }),
      inventory: persistedInventory,
      adapterRegistry: registry,
      operation: 'uninstall',
    })

    expect(retried.ok).toBe(true)
    expect(calls).toEqual(['book:remove:demo-core-book'])
    expect(retried.inventory.resources).toEqual([])
  })

  test('stops before execution when review is required or an Owner Adapter is absent', async () => {
    const suite = createSuite()
    const calls = []
    const book = createOwnerHarness('book', calls)
    const registry = createWorldSuiteOwnerAdapterRegistry([book.adapter])
    const reviewPlan = buildWorldSuiteInstallPlan({
      manifest: suite,
      installedResources: [
        {
          id: 'book.demo-core',
          type: 'book_asset',
          owner: 'book',
          ownerResourceId: 'demo-core-book',
          version: 1,
          installed: true,
          userModified: true,
        },
      ],
    })
    const reviewed = await executeWorldSuitePlan({
      manifest: suite,
      plan: reviewPlan,
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: registry,
      now: 6_000,
    })
    expect(reviewed).toMatchObject({ ok: false, code: 'review_required' })
    expect(reviewed.inventory.suiteStates[0]).toMatchObject({ status: 'review_required' })
    expect(calls).toEqual([])

    const missingOwner = await executeWorldSuitePlan({
      manifest: suite,
      plan: buildWorldSuiteInstallPlan({ manifest: suite, installedResources: [] }),
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: registry,
      now: 7_000,
    })
    expect(missingOwner).toMatchObject({
      ok: false,
      code: 'owner_not_registered',
      completedResourceIds: ['book.demo-core'],
      failedResourceId: 'map.demo-city',
    })
  })

  test('rejects incomplete or duplicated plans before any native Owner mutation', async () => {
    const suite = createSuite()
    const calls = []
    const book = createOwnerHarness('book', calls)
    const map = createOwnerHarness('map', calls)
    const registry = createWorldSuiteOwnerAdapterRegistry([book.adapter, map.adapter])
    const validPlan = buildWorldSuiteInstallPlan({ manifest: suite, installedResources: [] })

    const incomplete = await executeWorldSuitePlan({
      manifest: suite,
      plan: { ...validPlan, actions: validPlan.actions.slice(0, 1) },
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: registry,
    })
    const duplicated = await executeWorldSuitePlan({
      manifest: suite,
      plan: { ...validPlan, actions: [validPlan.actions[0], validPlan.actions[0]] },
      inventory: createEmptyWorldSuiteInventory(),
      adapterRegistry: registry,
    })

    expect(incomplete).toMatchObject({ ok: false, code: 'invalid_plan' })
    expect(duplicated).toMatchObject({ ok: false, code: 'invalid_plan' })
    expect(calls).toEqual([])
  })

  test('fails closed when an Owner inspection omits explicit installed evidence', async () => {
    const suite = createSuite()
    const registry = createWorldSuiteOwnerAdapterRegistry([
      {
        owner: 'book',
        install: () => ({ ok: true }),
        inspect: ({ resource }) => ({
          id: resource.id,
          type: resource.type,
          owner: resource.owner,
          ownerResourceId: resource.ownerResourceId,
          version: resource.version,
        }),
      },
    ])
    const plan = buildWorldResourceInstallPlan({ resource: suite.resources[0] })

    await expect(
      executeWorldResourcePlan({
        resource: suite.resources[0],
        plan,
        inventory: createEmptyWorldSuiteInventory(),
        adapterRegistry: registry,
      }),
    ).resolves.toMatchObject({ ok: false, code: 'owner_evidence_invalid' })
  })
})
