import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGalleryStore } from '../src/stores/gallery'
import { useSystemStore } from '../src/stores/system'
import { clearGalleryAssetBlobFallback } from '../src/lib/asset-binary-storage'

describe('gallery store', () => {
  beforeEach(() => {
    localStorage.clear()
    clearGalleryAssetBlobFallback()
    setActivePinia(createPinia())
  })

  test('imports URL assets with category and dedupes by normalized url', () => {
    const store = useGalleryStore()

    const first = store.importAssetFromUrl({
      url: 'https://example.com/emoji/a.png',
      category: 'emoji',
      name: 'A',
    })
    expect(first.ok).toBe(true)
    expect(store.categoryCounts.emoji).toBe(1)

    const duplicate = store.importAssetFromUrl({
      url: 'https://example.com/emoji/a.png',
      category: 'reference',
      name: 'Duplicate',
    })
    expect(duplicate.ok).toBe(false)
    expect(duplicate.reason).toBe('duplicate')
    expect(store.categoryCounts.emoji).toBe(1)
    expect(store.categoryCounts.reference).toBe(0)
  })

  test('imports local files and dedupes by fingerprint', async () => {
    const store = useGalleryStore()
    const file = new File(['sample-image-data'], 'smile.png', {
      type: 'image/png',
      lastModified: 123,
    })

    const imported = await store.importAssetsFromFiles([file], {
      category: 'emoji',
    })
    expect(imported.ok).toBe(true)
    expect(imported.importedCount).toBe(1)
    expect(store.categoryCounts.emoji).toBe(1)

    const duplicated = await store.importAssetsFromFiles([file], {
      category: 'emoji',
    })
    expect(duplicated.ok).toBe(false)
    expect(duplicated.skippedDuplicateCount).toBe(1)
    expect(store.categoryCounts.emoji).toBe(1)
  })

  test('resolves AI reference url for local assets with size guard', async () => {
    const store = useGalleryStore()
    const file = new File(['small-binary'], 'small.png', {
      type: 'image/png',
      lastModified: 456,
    })

    const imported = await store.importAssetsFromFiles([file], {
      category: 'reference',
    })
    expect(imported.ok).toBe(true)
    const assetId = imported.importedIds[0]

    const resolved = await store.getAssetAiReferenceUrl(assetId, {
      maxBytes: 1024 * 1024,
    })
    expect(resolved.ok).toBe(true)
    expect(resolved.sourceType).toBe('file')
    expect(resolved.url.startsWith('data:image/png;base64,')).toBe(true)

    const blocked = await store.getAssetAiReferenceUrl(assetId, {
      maxBytes: 1,
    })
    expect(blocked.ok).toBe(false)
    expect(blocked.reason).toBe('blob_too_large')
  })

  test('blocks deletion when URL asset is currently used as system wallpaper', async () => {
    const systemStore = useSystemStore()
    const store = useGalleryStore()
    const imported = store.importAssetFromUrl({
      url: 'https://example.com/wallpaper/main.webp',
      category: 'wallpaper',
      name: 'Main wallpaper',
    })
    expect(imported.ok).toBe(true)

    const asset = store.findAssetById(imported.assetId)
    systemStore.settings.appearance.wallpaper = asset.sourceUrl

    const guard = store.getAssetDeletionGuard(asset.id)
    expect(guard.blocked).toBe(true)
    expect(guard.reason).toBe('in_use')

    const blockedRemoval = await store.removeAsset(asset.id)
    expect(blockedRemoval.ok).toBe(false)
    expect(blockedRemoval.reason).toBe('in_use')

    const forcedRemoval = await store.removeAsset(asset.id, { force: true })
    expect(forcedRemoval.ok).toBe(true)
    expect(store.findAssetById(asset.id)).toBe(null)
  })

  test('creates backup snapshot in metadata mode by default and can include asset package', async () => {
    const store = useGalleryStore()
    const file = new File(['asset-binary-sample'], 'sample.png', {
      type: 'image/png',
      lastModified: 321,
    })
    const imported = await store.importAssetsFromFiles([file], { category: 'reference' })
    expect(imported.ok).toBe(true)

    const metadataOnly = await store.createBackupSnapshotAsync()
    expect(Array.isArray(metadataOnly.assets)).toBe(true)
    expect(metadataOnly.assetPackage).toBe(null)
    expect(metadataOnly.packageSummary.requested).toBe(false)

    const withPackage = await store.createBackupSnapshotAsync({
      includeAssetPackage: true,
    })
    expect(withPackage.packageSummary.requested).toBe(true)
    expect(withPackage.assetPackage).not.toBe(null)
    expect(Array.isArray(withPackage.assetPackage.items)).toBe(true)
    expect(withPackage.assetPackage.items.length).toBeGreaterThanOrEqual(1)
  })

  test('restores file blobs from backup asset package in a fresh runtime', async () => {
    const store = useGalleryStore()
    const file = new File(['blob-rehydrate-sample'], 'rehydrate.png', {
      type: 'image/png',
      lastModified: 999,
    })
    const imported = await store.importAssetsFromFiles([file], { category: 'emoji' })
    expect(imported.ok).toBe(true)

    const snapshot = await store.createBackupSnapshotAsync({
      includeAssetPackage: true,
      maxPackageBytes: 10 * 1024 * 1024,
      maxPackageItems: 10,
    })
    expect(snapshot.assetPackage?.items?.length).toBeGreaterThan(0)

    clearGalleryAssetBlobFallback()
    localStorage.clear()
    setActivePinia(createPinia())

    const nextStore = useGalleryStore()
    const restored = await nextStore.restoreFromBackupAsync(snapshot, {
      restoreAssetPackage: true,
    })
    expect(restored.ok).toBe(true)
    expect(restored.packageApplied).toBe(true)
    expect(restored.restoredPackageCount).toBeGreaterThan(0)

    const exportedAgain = await nextStore.createBackupSnapshotAsync({
      includeAssetPackage: true,
      maxPackageBytes: 10 * 1024 * 1024,
      maxPackageItems: 10,
    })
    expect(exportedAgain.assetPackage?.items?.length).toBeGreaterThan(0)
  })

  test('keeps metadata restore working when asset package contains invalid items', async () => {
    const store = useGalleryStore()
    const file = new File(['invalid-package-case'], 'broken.png', {
      type: 'image/png',
      lastModified: 777,
    })
    const imported = await store.importAssetsFromFiles([file], { category: 'scenario' })
    expect(imported.ok).toBe(true)

    const metadataSnapshot = store.createBackupSnapshot()
    const assetId = metadataSnapshot.assets[0]?.id
    expect(typeof assetId).toBe('string')

    const malformedSnapshot = {
      ...metadataSnapshot,
      assetPackage: {
        version: 1,
        exportedAt: Date.now(),
        items: [
          {
            id: assetId,
            blobId: assetId,
            dataUrl: 'data:image/png;base64,@@invalid@@',
            mimeType: 'image/png',
          },
        ],
      },
    }

    clearGalleryAssetBlobFallback()
    localStorage.clear()
    setActivePinia(createPinia())

    const nextStore = useGalleryStore()
    const restored = await nextStore.restoreFromBackupAsync(malformedSnapshot, {
      restoreAssetPackage: true,
    })
    expect(restored.ok).toBe(true)
    expect(restored.packageApplied).toBe(true)
    expect(restored.failedPackageCount).toBe(1)
    expect(restored.reason).toBe('package_partial_failed')

    expect(nextStore.assets.length).toBe(1)
    expect(nextStore.assets[0].id).toBe(assetId)
  })
})
