import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGalleryStore } from '../src/stores/gallery'

const GALLERY_KEY = 'schatphone:store:gallery'

describe('gallery people/place tagging', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('imported assets default to no person or place tags', () => {
    const store = useGalleryStore()
    const result = store.importAssetFromUrl({
      url: 'https://example.com/photo.png',
      name: 'Demo',
      category: 'reference',
    })
    expect(result.ok).toBe(true)
    const asset = store.findAssetById(result.assetId)
    expect(asset.personIds).toEqual([])
    expect(asset.placeId).toBe('')
    expect(asset.placeText).toBe('')
  })

  test('legacy snapshots without tag fields hydrate with empty tags', () => {
    localStorage.setItem(
      GALLERY_KEY,
      JSON.stringify({
        version: 1,
        savedAt: 100,
        data: {
          assets: [
            {
              id: 'asset_legacy',
              name: 'Legacy',
              category: 'reference',
              sourceType: 'url',
              sourceUrl: 'https://example.com/legacy.png',
              createdAt: 10,
              updatedAt: 20,
            },
          ],
          folders: [],
        },
      }),
    )
    setActivePinia(createPinia())
    const store = useGalleryStore()
    const asset = store.findAssetById('asset_legacy')
    expect(asset).toBeTruthy()
    expect(asset.personIds).toEqual([])
    expect(asset.placeId).toBe('')
    expect(asset.placeText).toBe('')
  })

  test('setAssetPersons dedupes and trims ids', () => {
    const store = useGalleryStore()
    const { assetId } = store.importAssetFromUrl({
      url: 'https://example.com/person.png',
      name: 'Person',
      category: 'reference',
    })
    expect(store.setAssetPersons(assetId, ['1', ' 2 ', '1', '', '2'])).toBe(true)
    expect(store.findAssetById(assetId).personIds).toEqual(['1', '2'])
    expect(store.setAssetPersons(assetId, [])).toBe(true)
    expect(store.findAssetById(assetId).personIds).toEqual([])
    expect(store.setAssetPersons('missing', ['1'])).toBe(false)
  })

  test('setAssetPlace supports map place ids and free text', () => {
    const store = useGalleryStore()
    const { assetId } = store.importAssetFromUrl({
      url: 'https://example.com/place.png',
      name: 'Place',
      category: 'scenario',
    })
    expect(store.setAssetPlace(assetId, { placeId: 'dorm', placeText: '宿舍' })).toBe(true)
    expect(store.findAssetById(assetId)).toMatchObject({ placeId: 'dorm', placeText: '宿舍' })
    expect(store.setAssetPlace(assetId, { placeText: '  练习室  ' })).toBe(true)
    expect(store.findAssetById(assetId)).toMatchObject({ placeId: '', placeText: '练习室' })
    expect(store.setAssetPlace('missing', { placeText: 'x' })).toBe(false)
  })

  test('tags survive clone for backup snapshots', () => {
    const store = useGalleryStore()
    const { assetId } = store.importAssetFromUrl({
      url: 'https://example.com/backup.png',
      name: 'Backup',
      category: 'reference',
    })
    store.setAssetPersons(assetId, ['7'])
    store.setAssetPlace(assetId, { placeText: '汉江公园' })
    const snapshot = store.createBackupSnapshot()
    const backedUp = snapshot.assets.find((asset) => asset.id === assetId)
    expect(backedUp.personIds).toEqual(['7'])
    expect(backedUp.placeText).toBe('汉江公园')
  })
})
