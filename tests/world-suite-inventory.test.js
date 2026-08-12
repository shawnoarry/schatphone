import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  createEmptyWorldSuiteInventory,
  detachWorldResourceOrigin,
  findInstalledWorldResource,
  normalizeWorldSuiteInventory,
  recordInstalledWorldResource,
  recordWorldSuiteState,
  removeInstalledWorldResource,
} from '../src/lib/world-suite-inventory'
import { useSystemStore } from '../src/stores/system'

const MAP_RESOURCE = {
  id: 'map.real-seoul',
  type: 'map_pack',
  ownerResourceId: 'real-seoul-v1',
  catalogId: 'real-seoul-v1',
  version: 2,
}

describe('world suite installed-resource inventory', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('normalizes bounded coordination evidence without copying native owner content', () => {
    const inventory = normalizeWorldSuiteInventory({
      schemaVersion: 99,
      resources: [
        {
          id: MAP_RESOURCE.id,
          type: MAP_RESOURCE.type,
          owner: 'map',
          ownerResourceId: MAP_RESOURCE.ownerResourceId,
          catalogId: MAP_RESOURCE.catalogId,
          version: 2,
          installed: true,
          title: 'Must not be copied',
          places: [{ id: 'must-not-escape' }],
          origins: [
            { kind: 'suite', id: 'kpop_suite' },
            { kind: 'suite', id: 'kpop_suite' },
          ],
        },
        { id: 'invalid', installed: true },
      ],
      suiteStates: [
        {
          suiteId: 'kpop_suite',
          manifestVersion: 2,
          operation: 'install',
          status: 'partial',
          resourceIds: ['book.core', MAP_RESOURCE.id],
          completedResourceIds: ['book.core'],
        },
      ],
    })

    expect(inventory.schemaVersion).toBe(1)
    expect(inventory.resources).toEqual([
      expect.objectContaining({
        id: MAP_RESOURCE.id,
        owner: 'map',
        ownerResourceId: MAP_RESOURCE.ownerResourceId,
        origins: [{ kind: 'suite', id: 'kpop_suite' }],
      }),
    ])
    expect(inventory.resources[0].title).toBeUndefined()
    expect(inventory.resources[0].places).toBeUndefined()
    expect(inventory.suiteStates[0]).toMatchObject({
      status: 'partial',
      pendingResourceIds: [MAP_RESOURCE.id],
    })
  })

  test('adds independent and Suite origins idempotently while preserving native identity', () => {
    const independentlyInstalled = recordInstalledWorldResource({
      inventory: createEmptyWorldSuiteInventory(),
      resource: MAP_RESOURCE,
      evidence: {
        installed: true,
        version: 2,
        ownerResourceId: MAP_RESOURCE.ownerResourceId,
        enabled: true,
      },
      origin: { kind: 'independent', id: 'map_catalog' },
      now: 100,
    })
    const suiteInstalled = recordInstalledWorldResource({
      inventory: independentlyInstalled.inventory,
      resource: MAP_RESOURCE,
      evidence: {
        installed: true,
        version: 2,
        ownerResourceId: MAP_RESOURCE.ownerResourceId,
        enabled: true,
      },
      origin: { kind: 'suite', id: 'kpop_suite' },
      now: 200,
    })
    const repeated = recordInstalledWorldResource({
      inventory: suiteInstalled.inventory,
      resource: MAP_RESOURCE,
      evidence: suiteInstalled.resource,
      origin: { kind: 'suite', id: 'kpop_suite' },
      now: 300,
    })

    expect(repeated.ok).toBe(true)
    expect(repeated.resource).toMatchObject({
      installedAt: 100,
      updatedAt: 300,
      lastVerifiedAt: 300,
      origins: [
        { kind: 'independent', id: 'map_catalog' },
        { kind: 'suite', id: 'kpop_suite' },
      ],
    })
  })

  test('rejects stable-id collisions and keeps detach separate from native removal', () => {
    const installed = recordInstalledWorldResource({
      inventory: createEmptyWorldSuiteInventory(),
      resource: MAP_RESOURCE,
      evidence: { installed: true, version: 2, ownerResourceId: MAP_RESOURCE.ownerResourceId },
      origin: { kind: 'suite', id: 'kpop_suite' },
    })
    const collision = recordInstalledWorldResource({
      inventory: installed.inventory,
      resource: { ...MAP_RESOURCE, ownerResourceId: 'different-native-id' },
      evidence: { installed: true, version: 2, ownerResourceId: 'different-native-id' },
      origin: { kind: 'suite', id: 'other_suite' },
    })

    expect(collision).toMatchObject({ ok: false, code: 'installed_identity_collision' })
    expect(
      recordInstalledWorldResource({
        inventory: createEmptyWorldSuiteInventory(),
        resource: MAP_RESOURCE,
        evidence: {
          installed: true,
          version: 1,
          ownerResourceId: MAP_RESOURCE.ownerResourceId,
        },
        origin: { kind: 'suite', id: 'kpop_suite' },
      }),
    ).toMatchObject({ ok: false, code: 'owner_evidence_invalid' })
    expect(
      recordInstalledWorldResource({
        inventory: createEmptyWorldSuiteInventory(),
        resource: { ...MAP_RESOURCE, version: 1 },
        evidence: { version: 1, ownerResourceId: MAP_RESOURCE.ownerResourceId },
        origin: { kind: 'suite', id: 'kpop_suite' },
      }),
    ).toMatchObject({ ok: false, code: 'owner_evidence_invalid' })
    const detached = detachWorldResourceOrigin({
      inventory: installed.inventory,
      resourceId: MAP_RESOURCE.id,
      origin: { kind: 'suite', id: 'kpop_suite' },
    })
    expect(findInstalledWorldResource(detached.inventory, MAP_RESOURCE.id)).toMatchObject({
      installed: true,
      origins: [],
    })
    expect(findInstalledWorldResource(removeInstalledWorldResource(detached.inventory, MAP_RESOURCE.id), MAP_RESOURCE.id)).toBeNull()
  })

  test('persists through the existing System carrier and old saves resolve to an empty inventory', () => {
    const systemStore = useSystemStore()
    const recorded = recordInstalledWorldResource({
      inventory: systemStore.getWorldSuiteInventorySnapshot(),
      resource: MAP_RESOURCE,
      evidence: { installed: true, version: 2, ownerResourceId: MAP_RESOURCE.ownerResourceId },
      origin: { kind: 'suite', id: 'kpop_suite' },
      now: 500,
    })
    const withState = recordWorldSuiteState(recorded.inventory, {
      suiteId: 'kpop_suite',
      manifestVersion: 1,
      operation: 'install',
      status: 'installed',
      resourceIds: [MAP_RESOURCE.id],
      completedResourceIds: [MAP_RESOURCE.id],
      startedAt: 400,
      updatedAt: 500,
      completedAt: 500,
    })
    systemStore.replaceWorldSuiteInventory(withState)
    systemStore.saveNow()

    setActivePinia(createPinia())
    const reopened = useSystemStore()
    expect(reopened.getInstalledWorldResources()).toEqual([
      expect.objectContaining({ id: MAP_RESOURCE.id, ownerResourceId: MAP_RESOURCE.ownerResourceId }),
    ])
    expect(reopened.getWorldSuiteInventorySnapshot().suiteStates[0]).toMatchObject({
      suiteId: 'kpop_suite',
      status: 'installed',
    })

    expect(reopened.restoreFromBackup({ user: { name: 'Legacy save' } })).toBe(true)
    expect(reopened.getWorldSuiteInventorySnapshot()).toEqual(createEmptyWorldSuiteInventory())
  })
})
