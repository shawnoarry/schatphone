import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { buildCatalogManagedGalleryAssetPack } from '../src/lib/gallery-catalog-assets'
import { useGalleryStore } from '../src/stores/gallery'

const createResource = (version = 1) => ({
  id: 'gallery.demo-world-art',
  type: 'gallery_asset_pack',
  owner: 'gallery',
  ownerResourceId: 'demo-world-art-folder',
  catalogId: 'demo-world-art-catalog',
  version,
})

const createPack = (resource, suffix = 'v1') =>
  buildCatalogManagedGalleryAssetPack({
    resource,
    now: resource.version * 1_000,
    rawAssetPack: {
      name: `Demo World Art ${suffix}`,
      category: 'scenario',
      assets: [
        {
          id: 'demo-world-map-art',
          name: `Demo Map ${suffix}`,
          category: 'scenario',
          url: `https://example.com/world/map-${suffix}.webp`,
        },
      ],
    },
  })

const galleryWrites = (spy) =>
  spy.mock.calls.filter(([key]) => key === 'schatphone:store:gallery')

describe('Gallery managed asset-pack mutation Interface', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('commits managed create, update, and delete with one native write each', async () => {
    const store = useGalleryStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    setItemSpy.mockClear()

    const resourceV1 = createResource(1)
    const packV1 = createPack(resourceV1, 'v1')
    expect(
      await store.commitManagedAssetPackMutation({
        operation: 'create',
        folderId: resourceV1.ownerResourceId,
        assetPack: packV1,
      }),
    ).toMatchObject({
      ok: true,
      folder: { id: resourceV1.ownerResourceId },
      assets: [{ id: 'demo-world-map-art' }],
    })
    await nextTick()
    expect(galleryWrites(setItemSpy)).toHaveLength(1)

    const resourceV2 = createResource(2)
    const packV2 = createPack(resourceV2, 'v2')
    expect(
      await store.commitManagedAssetPackMutation({
        operation: 'update',
        folderId: resourceV2.ownerResourceId,
        assetPack: packV2,
      }),
    ).toMatchObject({ ok: true })
    await nextTick()
    expect(galleryWrites(setItemSpy)).toHaveLength(2)
    expect(store.findAssetById('demo-world-map-art')?.sourceUrl).toContain('map-v2.webp')

    expect(
      await store.commitManagedAssetPackMutation({
        operation: 'delete',
        folderId: resourceV2.ownerResourceId,
      }),
    ).toEqual({ ok: true, code: '', folder: null, assets: [] })
    await nextTick()
    expect(galleryWrites(setItemSpy)).toHaveLength(3)
    expect(store.findFolderById(resourceV2.ownerResourceId)).toBeNull()
    expect(store.findAssetById('demo-world-map-art')).toBeNull()
  })

  test.each(['create', 'update', 'delete'])(
    'restores exact Gallery metadata when managed %s persistence fails',
    async (operation) => {
      const store = useGalleryStore()
      await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
      const resourceV1 = createResource(1)
      const packV1 = createPack(resourceV1, 'v1')
      if (operation !== 'create') {
        expect(
          await store.commitManagedAssetPackMutation({
            operation: 'create',
            folderId: resourceV1.ownerResourceId,
            assetPack: packV1,
          }),
        ).toMatchObject({ ok: true })
      }
      await nextTick()
      const before = store.createBackupSnapshot()
      const persistedBefore = localStorage.getItem('schatphone:store:gallery')
      const originalSetItem = Storage.prototype.setItem
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
        if (key === 'schatphone:store:gallery') {
          throw new DOMException('quota', 'QuotaExceededError')
        }
        return originalSetItem.call(this, key, value)
      })

      const result = await store.commitManagedAssetPackMutation({
        operation,
        folderId: resourceV1.ownerResourceId,
        ...(operation === 'create' ? { assetPack: packV1 } : {}),
        ...(operation === 'update'
          ? { assetPack: createPack(createResource(2), 'v2') }
          : {}),
      })
      expect(result).toMatchObject({
        ok: false,
        code: 'quota_exceeded',
        persistence: { ok: false, error: 'quota_exceeded', carrier: 'localStorage' },
      })
      await nextTick()
      expect(store.createBackupSnapshot()).toEqual(before)
      expect(localStorage.getItem('schatphone:store:gallery')).toBe(persistedBefore)
    },
  )

  test('round-trips trusted backup provenance while ordinary import creates no managed provenance', () => {
    const store = useGalleryStore()
    const resource = createResource()
    const pack = createPack(resource)
    expect(
      store.restoreFromBackup({
        assets: pack.assets,
        folders: [pack.folder],
      }),
    ).toBe(true)
    expect(store.findAssetById('demo-world-map-art')?.provenance).toEqual(
      pack.assets[0].provenance,
    )

    const imported = store.importAssetFromUrl({
      id: 'forged-id',
      url: 'https://example.com/user.png',
      provenance: pack.assets[0].provenance,
    })
    expect(imported.ok).toBe(true)
    expect(store.findAssetById(imported.assetId)?.provenance).toBeUndefined()
  })

  test('rejects a Catalog pack with an unknown Gallery category', () => {
    const resource = createResource()
    expect(
      buildCatalogManagedGalleryAssetPack({
        resource,
        rawAssetPack: {
          name: 'Invalid pack',
          category: 'mystery',
          assets: [
            {
              id: 'invalid-category-asset',
              name: 'Invalid',
              category: 'scenario',
              url: 'https://example.com/invalid.webp',
            },
          ],
        },
      }),
    ).toBeNull()
  })
})
