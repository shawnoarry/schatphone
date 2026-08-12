import { describe, expect, test } from 'vitest'
import {
  WORLD_SUITE_PLAN_ACTIONS,
  buildWorldResourceInstallPlan,
  buildWorldSuiteInstallPlan,
  buildWorldSuiteUninstallPlan,
  createWorldSuiteRegistry,
  validateWorldSuiteManifest,
} from '../src/lib/world-suite-manifest'

const createSuite = (overrides = {}) => ({
  id: 'default_kpop_suite',
  version: 1,
  title: 'Default K-pop world suite',
  worldArchetype: 'modern_kpop',
  resources: [
    {
      id: 'book.kpop-core',
      type: 'book_asset',
      ownerResourceId: 'modern-seoul-kpop-core',
      catalogId: 'modern-seoul-kpop-core',
      version: 2,
      independentlyInstallable: true,
    },
    {
      id: 'worldbook.kpop-core-candidate',
      type: 'worldbook_candidate',
      ownerResourceId: 'modern-seoul-kpop-core-candidate',
      dependencies: ['book.kpop-core'],
      version: 1,
    },
    {
      id: 'map.real-seoul',
      type: 'map_pack',
      ownerResourceId: 'real-seoul-v1',
      version: 2,
      recommendEnable: true,
    },
    {
      id: 'shopping.kpop-store',
      type: 'shopping_facade',
      ownerResourceId: 'kpop-store',
      dependencies: ['map.real-seoul'],
      version: 3,
    },
  ],
  ...overrides,
})

describe('world suite manifest Module', () => {
  test('validates one coordinator manifest without taking resource ownership', () => {
    const result = validateWorldSuiteManifest(createSuite())

    expect(result.ok).toBe(true)
    expect(result.manifest.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'book_asset', owner: 'book' }),
        expect.objectContaining({ type: 'worldbook_candidate', owner: 'worldbook' }),
        expect.objectContaining({ type: 'map_pack', owner: 'map' }),
        expect.objectContaining({ type: 'shopping_facade', owner: 'shopping' }),
      ]),
    )
    expect(Object.isFrozen(result.manifest)).toBe(true)
  })

  test('rejects an empty Suite because it cannot represent an installable experience', () => {
    expect(validateWorldSuiteManifest(createSuite({ resources: [] }))).toMatchObject({
      ok: false,
      errors: [{ code: 'empty_suite_resources', path: 'resources' }],
    })
  })

  test('rejects owner mismatches, missing dependencies, duplicates, cycles, and suite-only resources', () => {
    const result = validateWorldSuiteManifest(
      createSuite({
        resources: [
          {
            id: 'map.a',
            type: 'map_pack',
            owner: 'worldbook',
            ownerResourceId: 'a',
            dependencies: ['map.b'],
            independentlyInstallable: false,
          },
          {
            id: 'map.a',
            type: 'map_pack',
            ownerResourceId: 'b',
            dependencies: ['map.a'],
          },
        ],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        'resource_owner_mismatch',
        'resource_not_independently_installable',
        'duplicate_resource_id',
        'missing_manifest_dependency',
        'dependency_cycle',
      ]),
    )
  })

  test('builds an owner-ordered idempotent install plan and keeps enablement separate', () => {
    const suite = createSuite()
    const first = buildWorldSuiteInstallPlan({ manifest: suite, installedResources: [] })

    expect(first.ok).toBe(true)
    expect(first.readyToApply).toBe(true)
    expect(first.actions.map((action) => action.resourceId)).toEqual([
      'book.kpop-core',
      'worldbook.kpop-core-candidate',
      'map.real-seoul',
      'shopping.kpop-store',
    ])
    expect(first.actions.every((action) => action.action === WORLD_SUITE_PLAN_ACTIONS.INSTALL)).toBe(true)
    expect(first.enableRecommendations).toEqual(['map.real-seoul'])
    expect(first.actions.find((action) => action.resourceId === 'map.real-seoul')).not.toHaveProperty(
      'enabled',
    )

    const installedResources = first.actions.map((action) => ({
      id: action.resourceId,
      type: action.type,
      owner: action.owner,
      version: action.toVersion,
      installed: true,
      origins: [{ kind: 'suite', id: suite.id }],
    }))
    const second = buildWorldSuiteInstallPlan({ manifest: suite, installedResources })
    expect(second.actions.every((action) => action.action === WORLD_SUITE_PLAN_ACTIONS.KEEP)).toBe(true)
  })

  test('protects user-modified resources and waits dependent installs for review', () => {
    const plan = buildWorldSuiteInstallPlan({
      manifest: createSuite(),
      installedResources: [
        {
          id: 'map.real-seoul',
          type: 'map_pack',
          owner: 'map',
          version: 1,
          installed: true,
          userModified: true,
        },
      ],
    })

    expect(plan.readyToApply).toBe(false)
    expect(plan.actions.find((action) => action.resourceId === 'map.real-seoul')).toMatchObject({
      action: WORLD_SUITE_PLAN_ACTIONS.REVIEW_UPDATE,
    })
    expect(plan.actions.find((action) => action.resourceId === 'shopping.kpop-store')).toMatchObject({
      action: WORLD_SUITE_PLAN_ACTIONS.WAIT_FOR_DEPENDENCY_REVIEW,
    })
  })

  test('requires review before updating a resource that is currently in use', () => {
    const resource = createSuite().resources[0]
    const plan = buildWorldResourceInstallPlan({
      resource,
      installedResources: [
        {
          id: resource.id,
          type: resource.type,
          owner: 'book',
          ownerResourceId: resource.ownerResourceId,
          version: 1,
          installed: true,
          inUse: true,
        },
      ],
    })

    expect(plan).toMatchObject({
      action: WORLD_SUITE_PLAN_ACTIONS.REVIEW_UPDATE,
      reason: 'resource_in_use',
    })
  })

  test('uses the same install classification for one independently installed resource', () => {
    const resource = createSuite().resources[0]
    const standalone = buildWorldResourceInstallPlan({ resource, installedResources: [] })
    const bundled = buildWorldSuiteInstallPlan({ manifest: createSuite(), installedResources: [] })
      .actions.find((action) => action.resourceId === resource.id)

    expect(standalone).toMatchObject(bundled)
    expect(standalone.missingDependencies).toEqual([])
    expect(standalone.action).toBe(WORLD_SUITE_PLAN_ACTIONS.INSTALL)
  })

  test('requires declared dependencies when a resource is installed outside its suite', () => {
    const resource = createSuite().resources.find(
      (item) => item.id === 'shopping.kpop-store',
    )
    const blocked = buildWorldResourceInstallPlan({ resource, installedResources: [] })
    const ready = buildWorldResourceInstallPlan({
      resource,
      installedResources: [
        {
          id: 'map.real-seoul',
          type: 'map_pack',
          owner: 'map',
          version: 2,
          installed: true,
        },
      ],
    })

    expect(blocked).toMatchObject({
      action: WORLD_SUITE_PLAN_ACTIONS.WAIT_FOR_DEPENDENCY_REVIEW,
      reason: 'dependencies_not_installed',
      missingDependencies: ['map.real-seoul'],
    })
    expect(ready).toMatchObject({
      action: WORLD_SUITE_PLAN_ACTIONS.INSTALL,
      missingDependencies: [],
    })
  })

  test('uninstall detaches shared origins and preserves history, user changes, and in-use resources', () => {
    const suite = createSuite()
    const plan = buildWorldSuiteUninstallPlan({
      manifest: suite,
      installedResources: [
        {
          id: 'book.kpop-core',
          type: 'book_asset',
          owner: 'book',
          version: 2,
          origins: [
            { kind: 'suite', id: suite.id },
            { kind: 'independent', id: 'book-import' },
          ],
        },
        {
          id: 'worldbook.kpop-core-candidate',
          type: 'worldbook_candidate',
          owner: 'worldbook',
          version: 1,
          historicalReferenceCount: 4,
          origins: [{ kind: 'suite', id: suite.id }],
        },
        {
          id: 'map.real-seoul',
          type: 'map_pack',
          owner: 'map',
          version: 2,
          inUse: true,
          origins: [{ kind: 'suite', id: suite.id }],
        },
        {
          id: 'shopping.kpop-store',
          type: 'shopping_facade',
          owner: 'shopping',
          version: 3,
          origins: [{ kind: 'suite', id: suite.id }],
        },
      ],
    })

    expect(plan.actions.find((action) => action.resourceId === 'book.kpop-core')).toMatchObject({
      action: WORLD_SUITE_PLAN_ACTIONS.DETACH_ORIGIN,
    })
    expect(
      plan.actions.find((action) => action.resourceId === 'worldbook.kpop-core-candidate'),
    ).toMatchObject({
      action: WORLD_SUITE_PLAN_ACTIONS.DETACH_ORIGIN_AND_KEEP,
      reason: 'historical_references_preserved',
    })
    expect(plan.actions.find((action) => action.resourceId === 'map.real-seoul')).toMatchObject({
      action: WORLD_SUITE_PLAN_ACTIONS.DETACH_ORIGIN_AND_KEEP,
      reason: 'resource_in_use',
    })
    expect(plan.actions.find((action) => action.resourceId === 'shopping.kpop-store')).toMatchObject({
      action: WORLD_SUITE_PLAN_ACTIONS.REMOVE,
    })
    expect(plan.historyDeletionActions).toEqual([])
  })

  test('registers several archetype suites through one reusable registry', () => {
    const registry = createWorldSuiteRegistry([createSuite()])
    const survival = createSuite({ id: 'survival_suite', worldArchetype: 'post_apocalyptic' })

    expect(registry.initialErrors).toEqual([])
    expect(registry.register(survival).ok).toBe(true)
    expect(registry.list().map((manifest) => manifest.id)).toEqual([
      'default_kpop_suite',
      'survival_suite',
    ])
    expect(registry.register(survival)).toMatchObject({ ok: false })
  })
})
