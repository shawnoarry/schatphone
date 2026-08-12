import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '../src/stores/map'
import {
  createCatalogManagedMapPackFixture,
  createMapWorldSuiteResourceFixture,
} from './fixtures/map-world-suite-inspection'

const mapStorageWrites = (spy) =>
  spy.mock.calls.filter(([key]) => key === 'schatphone:store:map')

describe('Map managed pack mutation Interface', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('commits managed create, update, and delete with one native write each', async () => {
    const store = useMapStore()
    await vi.waitFor(() => {
      expect(localStorage.getItem('schatphone:store:map')).not.toBeNull()
    })
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    setItemSpy.mockClear()

    const resourceV1 = createMapWorldSuiteResourceFixture(1)
    const installedPack = createCatalogManagedMapPackFixture({ resource: resourceV1 })
    expect(
      await store.commitManagedMapPackMutation({
        operation: 'create',
        mapPackId: resourceV1.ownerResourceId,
        pack: installedPack,
      }),
    ).toMatchObject({
      ok: true,
      mapPack: {
        id: resourceV1.ownerResourceId,
        provenance: installedPack.provenance,
      },
    })
    await nextTick()
    expect(mapStorageWrites(setItemSpy)).toHaveLength(1)

    const resourceV2 = createMapWorldSuiteResourceFixture(2)
    const updatedPack = createCatalogManagedMapPackFixture({
      resource: resourceV2,
      catalogVersion: 2,
      overrides: {
        labelZh: '霓虹城区二期',
        labelEn: 'Neon Borough Phase Two',
        updatedAt: 2_000,
      },
    })
    expect(
      await store.commitManagedMapPackMutation({
        operation: 'update',
        mapPackId: resourceV2.ownerResourceId,
        patch: updatedPack,
      }),
    ).toMatchObject({
      ok: true,
      mapPack: {
        labelZh: '霓虹城区二期',
        provenance: updatedPack.provenance,
      },
    })
    await nextTick()
    expect(mapStorageWrites(setItemSpy)).toHaveLength(2)

    expect(
      await store.commitManagedMapPackMutation({
        operation: 'delete',
        mapPackId: resourceV2.ownerResourceId,
      }),
    ).toEqual({ ok: true, code: '', mapPack: null })
    await nextTick()
    expect(mapStorageWrites(setItemSpy)).toHaveLength(3)
    expect(store.customMapPacks).toEqual([])
  })

  test.each(['create', 'update', 'delete'])(
    'restores exact native Map truth when the managed %s write fails',
    async (operation) => {
      const store = useMapStore()
      const resource = createMapWorldSuiteResourceFixture(1)
      const installedPack = createCatalogManagedMapPackFixture({ resource })
      if (operation !== 'create') {
        expect(store.restoreFromBackup({ map: { customMapPacks: [installedPack] } })).toBe(true)
      }
      await vi.waitFor(() => {
        expect(localStorage.getItem('schatphone:store:map')).not.toBeNull()
      })
      await nextTick()

      const before = store.createBackupSnapshot()
      const persistedBefore = localStorage.getItem('schatphone:store:map')
      const originalSetItem = Storage.prototype.setItem
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
        key,
        value,
      ) {
        if (key === 'schatphone:store:map') {
          throw new DOMException('quota', 'QuotaExceededError')
        }
        return originalSetItem.call(this, key, value)
      })

      const updatedPack = createCatalogManagedMapPackFixture({
        resource: createMapWorldSuiteResourceFixture(2),
        catalogVersion: 2,
        overrides: { labelEn: 'Failed update must roll back' },
      })
      const payload = {
        operation,
        mapPackId: resource.ownerResourceId,
        ...(operation === 'create' ? { pack: installedPack } : {}),
        ...(operation === 'update' ? { patch: updatedPack } : {}),
      }

      expect(await store.commitManagedMapPackMutation(payload)).toMatchObject({
        ok: false,
        code: 'quota_exceeded',
        persistence: {
          ok: false,
          error: 'quota_exceeded',
          carrier: 'localStorage',
        },
      })
      await nextTick()

      expect(store.createBackupSnapshot()).toEqual(before)
      expect(localStorage.getItem('schatphone:store:map')).toBe(persistedBefore)
      expect(mapStorageWrites(setItemSpy).length).toBeGreaterThan(0)
      },
  )

  test('rejects ordinary user packs, built-ins, invalid provenance, and managed identity changes', async () => {
    const store = useMapStore()
    await vi.waitFor(() => {
      expect(localStorage.getItem('schatphone:store:map')).not.toBeNull()
    })
    expect(
      store.createCustomMapPack({
        id: 'user-authored-map',
        assetId: 'gallery-user-map',
        labelZh: '用户地图',
      }),
    ).toBeTruthy()

    expect(
      await store.commitManagedMapPackMutation({
        operation: 'update',
        mapPackId: 'user-authored-map',
        patch: { labelZh: '不应更新' },
      }),
    ).toEqual({ ok: false, code: 'not_managed' })
    expect(
      await store.commitManagedMapPackMutation({
        operation: 'delete',
        mapPackId: 'real-seoul-v1',
      }),
    ).toEqual({ ok: false, code: 'built_in' })

    const resource = createMapWorldSuiteResourceFixture(1)
    expect(
      await store.commitManagedMapPackMutation({
        operation: 'create',
        mapPackId: resource.ownerResourceId,
        pack: {
          id: resource.ownerResourceId,
          assetId: 'gallery-invalid-managed-map',
          labelZh: '缺少可信来源',
        },
      }),
    ).toEqual({ ok: false, code: 'invalid_managed_provenance' })

    const managedPack = createCatalogManagedMapPackFixture({ resource })
    expect(store.restoreFromBackup({ map: { customMapPacks: [managedPack] } })).toBe(true)
    expect(
      await store.commitManagedMapPackMutation({
        operation: 'update',
        mapPackId: resource.ownerResourceId,
        patch: {
          provenance: {
            ...managedPack.provenance,
            resourceId: 'map.another-resource',
          },
        },
      }),
    ).toEqual({ ok: false, code: 'managed_identity_mismatch' })
    expect(store.createBackupSnapshot().customMapPacks[0]?.provenance).toEqual(
      managedPack.provenance,
    )
  })
})
