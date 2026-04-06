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
})
