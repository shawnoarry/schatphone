import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGalleryStore } from '../src/stores/gallery'
import { useSystemStore } from '../src/stores/system'
import { clearGalleryAssetBlobFallback } from '../src/lib/asset-binary-storage'
import { MEDIA_KIND, MEDIA_SIZE_SCENE, resolveMediaSizeLimitBytes } from '../src/lib/media-policy'

describe('gallery store', () => {
  beforeEach(() => {
    localStorage.clear()
    clearGalleryAssetBlobFallback()
    setActivePinia(createPinia())
    if (typeof URL !== 'undefined') {
      URL.createObjectURL = vi.fn(() => 'blob:gallery-preview')
      URL.revokeObjectURL = vi.fn()
    }
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

  test('rejects oversized file import with explicit reason and counters', async () => {
    const store = useGalleryStore()
    const maxBytes = resolveMediaSizeLimitBytes(MEDIA_KIND.IMAGE, {
      scene: MEDIA_SIZE_SCENE.GALLERY_IMPORT,
    })
    const oversized = new File([new Uint8Array(maxBytes + 1)], 'too-large.png', {
      type: 'image/png',
      lastModified: 111,
    })

    const result = await store.importAssetsFromFiles([oversized], {
      category: 'reference',
    })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('all_too_large')
    expect(result.skippedTooLargeCount).toBe(1)
    expect(store.categoryCounts.reference).toBe(0)
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

  test('supports custom folder CRUD and asset assignment lifecycle', async () => {
    const store = useGalleryStore()
    const first = store.importAssetFromUrl({
      url: 'https://example.com/ref/alpha.png',
      category: 'reference',
      name: 'Alpha',
    })
    const second = store.importAssetFromUrl({
      url: 'https://example.com/ref/beta.png',
      category: 'reference',
      name: 'Beta',
    })
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)

    const createdFolder = store.createFolder({
      name: 'Role References',
      category: 'reference',
      assetIds: [first.assetId, 'missing_asset_id'],
    })
    expect(createdFolder.name).toBe('Role References')
    expect(createdFolder.assetIds).toEqual([first.assetId])

    expect(store.addAssetToFolder(createdFolder.id, second.assetId)).toBe(true)
    expect(store.findFolderById(createdFolder.id)?.assetIds).toEqual([first.assetId, second.assetId])

    expect(store.renameFolder(createdFolder.id, 'Role Ref Pack')).toBe(true)
    expect(store.findFolderById(createdFolder.id)?.name).toBe('Role Ref Pack')

    expect(store.setFolderCategory(createdFolder.id, 'scenario')).toBe(true)
    expect(store.findFolderById(createdFolder.id)?.category).toBe('scenario')

    expect(store.removeAssetFromFolder(createdFolder.id, first.assetId)).toBe(true)
    expect(store.findFolderById(createdFolder.id)?.assetIds).toEqual([second.assetId])

    const removedAsset = await store.removeAsset(second.assetId, { force: true })
    expect(removedAsset.ok).toBe(true)
    expect(store.findFolderById(createdFolder.id)?.assetIds).toEqual([])
  })

  test('keeps local preview alive until every consumer scope releases it', async () => {
    const store = useGalleryStore()
    const file = new File(['preview-binary'], 'preview.png', {
      type: 'image/png',
      lastModified: 999,
    })

    const imported = await store.importAssetsFromFiles([file], {
      category: 'reference',
    })
    expect(imported.ok).toBe(true)
    const assetId = imported.importedIds[0]

    const chatPreview = await store.getAssetPreviewUrl(assetId, {
      scopeId: 'chat-view',
    })
    const contactsPreview = await store.getAssetPreviewUrl(assetId, {
      scopeId: 'contacts-view',
    })

    expect(chatPreview).toBe('blob:gallery-preview')
    expect(contactsPreview).toBe(chatPreview)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)

    expect(store.releaseAssetPreviewScope('chat-view')).toBe(0)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(0)

    expect(store.releaseAssetPreviewScope('contacts-view')).toBe(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:gallery-preview')
  })

  test('replaces asset content while keeping same asset id and folder links', async () => {
    const store = useGalleryStore()
    const first = store.importAssetFromUrl({
      url: 'https://example.com/ref/replace-before.png',
      category: 'reference',
      name: 'Replace Before',
    })
    const second = store.importAssetFromUrl({
      url: 'https://example.com/ref/duplicate-target.png',
      category: 'reference',
      name: 'Duplicate Target',
    })
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)

    const folder = store.createFolder({
      name: 'Replace Folder',
      category: 'reference',
      assetIds: [first.assetId],
    })
    expect(folder.assetIds).toEqual([first.assetId])

    const replaced = await store.replaceAssetFromUrl(first.assetId, {
      url: 'https://example.com/ref/replace-after.png',
    })
    expect(replaced.ok).toBe(true)
    expect(replaced.assetId).toBe(first.assetId)
    const replacedAsset = store.findAssetById(first.assetId)
    expect(replacedAsset?.sourceType).toBe('url')
    expect(replacedAsset?.sourceUrl).toBe('https://example.com/ref/replace-after.png')
    expect(store.findFolderById(folder.id)?.assetIds).toEqual([first.assetId])

    const duplicated = await store.replaceAssetFromUrl(first.assetId, {
      url: 'https://example.com/ref/duplicate-target.png',
    })
    expect(duplicated.ok).toBe(false)
    expect(duplicated.reason).toBe('duplicate')
  })

  test('supports replacing URL asset with file and switching back to URL', async () => {
    const store = useGalleryStore()
    const imported = store.importAssetFromUrl({
      url: 'https://example.com/emoji/legacy.png',
      category: 'emoji',
      name: 'Legacy Emoji',
    })
    expect(imported.ok).toBe(true)

    const replacementFile = new File(['new-emoji-binary'], 'new-emoji.png', {
      type: 'image/png',
      lastModified: 222,
    })
    const replacedWithFile = await store.replaceAssetFromFile(imported.assetId, replacementFile)
    expect(replacedWithFile.ok).toBe(true)

    const nextAsset = store.findAssetById(imported.assetId)
    expect(nextAsset?.sourceType).toBe('file')
    expect(nextAsset?.blobId).toBe(imported.assetId)
    expect(nextAsset?.sizeBytes).toBeGreaterThan(0)

    const replacedBackToUrl = await store.replaceAssetFromUrl(imported.assetId, {
      url: 'https://example.com/emoji/after-replace.png',
    })
    expect(replacedBackToUrl.ok).toBe(true)
    expect(store.findAssetById(imported.assetId)?.sourceType).toBe('url')
    expect(store.findAssetById(imported.assetId)?.sourceUrl).toBe(
      'https://example.com/emoji/after-replace.png',
    )
  })

  test('blocks oversized file replacement and keeps previous source', async () => {
    const store = useGalleryStore()
    const imported = store.importAssetFromUrl({
      url: 'https://example.com/reference/original.png',
      category: 'reference',
      name: 'Original Ref',
    })
    expect(imported.ok).toBe(true)
    const maxBytes = resolveMediaSizeLimitBytes(MEDIA_KIND.IMAGE, {
      scene: MEDIA_SIZE_SCENE.GALLERY_IMPORT,
    })
    const oversized = new File([new Uint8Array(maxBytes + 2)], 'too-large-replace.png', {
      type: 'image/png',
      lastModified: 202,
    })

    const result = await store.replaceAssetFromFile(imported.assetId, oversized)
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('too_large')
    expect(result.maxBytes).toBe(maxBytes)
    expect(store.findAssetById(imported.assetId)?.sourceType).toBe('url')
    expect(store.findAssetById(imported.assetId)?.sourceUrl).toBe(
      'https://example.com/reference/original.png',
    )
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

  test('persists and restores folders with snapshot and storage hydration', () => {
    const store = useGalleryStore()
    const imported = store.importAssetFromUrl({
      url: 'https://example.com/emoji/mood.png',
      category: 'emoji',
      name: 'Mood',
    })
    expect(imported.ok).toBe(true)

    const folder = store.createFolder({
      name: 'Mood Pack',
      category: 'emoji',
      assetIds: [imported.assetId],
    })
    expect(folder.assetIds).toEqual([imported.assetId])

    store.saveNow()
    const backup = store.createBackupSnapshot()
    expect(Array.isArray(backup.folders)).toBe(true)
    expect(backup.folders.length).toBe(1)

    setActivePinia(createPinia())
    const restoredFromStorage = useGalleryStore()
    expect(restoredFromStorage.folders.length).toBe(1)
    expect(restoredFromStorage.folders[0].name).toBe('Mood Pack')
    expect(restoredFromStorage.folders[0].assetIds).toEqual([imported.assetId])

    setActivePinia(createPinia())
    const restoredFromBackup = useGalleryStore()
    const ok = restoredFromBackup.restoreFromBackup(backup)
    expect(ok).toBe(true)
    expect(restoredFromBackup.folders.length).toBe(1)
    expect(restoredFromBackup.folders[0].name).toBe('Mood Pack')
    expect(restoredFromBackup.folders[0].assetIds).toEqual([imported.assetId])
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
