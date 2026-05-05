import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ASSET_STATUS, useAssetsStore } from '../src/stores/assets'

describe('assets store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('seeds asset records and summarizes category totals', () => {
    const store = useAssetsStore()

    expect(store.assetCount).toBeGreaterThan(0)
    expect(store.listAssetsByCategory('real_estate').length).toBeGreaterThan(0)
    expect(store.listAssetsByCategory('unknown').length).toBe(store.assetCount)
    expect(store.categorySummaries.find((item) => item.key === 'vehicles')?.count).toBeGreaterThan(0)
  })

  test('upserts assets, updates status, and rejects invalid records', () => {
    const store = useAssetsStore()
    store.resetForTesting()

    expect(store.upsertAsset({ name: '', estimatedValue: '10' })).toBeNull()

    const asset = store.upsertAsset({
      id: 'asset_nova_home',
      name: 'Nova Loft',
      category: 'real_estate',
      estimatedValue: '888.80',
      purchaseValue: '700.00',
      currency: 'usd',
      location: 'Bayside',
      note: 'Map handoff sample',
      imageSourceType: 'url',
      imageUrl: 'https://example.com/asset.png',
      tags: ['home', 'home', 'map'],
    })

    expect(asset).toMatchObject({
      id: 'asset_nova_home',
      name: 'Nova Loft',
      category: 'real_estate',
      estimatedValueCents: 88880,
      purchaseValueCents: 70000,
      currency: 'USD',
      status: ASSET_STATUS.ACTIVE,
      image: {
        sourceType: 'url',
        url: 'https://example.com/asset.png',
      },
      tags: ['home', 'map'],
    })
    expect(store.primaryTotalValue).toEqual({
      currency: 'USD',
      amountCents: 88880,
      amount: '888.80',
    })

    expect(store.updateAssetStatus(asset.id, ASSET_STATUS.ARCHIVED)).toBe(true)
    expect(store.findAssetById(asset.id)?.status).toBe(ASSET_STATUS.ARCHIVED)
    expect(store.activeAssetCount).toBe(0)

    const galleryAsset = store.upsertAsset({
      id: 'asset_gallery_cover',
      name: 'Gallery Cover Asset',
      category: 'special',
      estimatedValue: '12.00',
      imageSourceType: 'gallery',
      imageGalleryAssetId: 'gallery_asset_cover',
    })
    expect(galleryAsset?.image).toMatchObject({
      sourceType: 'gallery',
      galleryAssetId: 'gallery_asset_cover',
    })
  })

  test('removes assets and keeps per-currency totals', () => {
    const store = useAssetsStore()
    store.resetForTesting()
    const vehicle = store.upsertAsset({
      id: 'asset_vehicle',
      name: 'Night Bike',
      category: 'vehicles',
      estimatedValue: '1200.00',
      currency: 'CNY',
    })
    store.upsertAsset({
      id: 'asset_watch',
      name: 'Watch',
      category: 'special',
      estimatedValue: '50.00',
      currency: 'USD',
    })

    expect(store.totalValueByCurrency).toEqual([
      { currency: 'CNY', amountCents: 120000, amount: '1200.00' },
      { currency: 'USD', amountCents: 5000, amount: '50.00' },
    ])
    expect(store.removeAsset(vehicle.id)).toBe(true)
    expect(store.listAssetsByCategory('vehicles')).toEqual([])
  })

  test('persists and restores backup-compatible snapshots', () => {
    const store = useAssetsStore()
    store.resetForTesting()
    const asset = store.upsertAsset({
      id: 'asset_persist',
      name: 'Persisted Asset',
      category: 'special',
      estimatedValue: '66.00',
    })
    store.saveNow()

    setActivePinia(createPinia())
    const restoredStore = useAssetsStore()
    expect(restoredStore.findAssetById(asset.id)?.name).toBe('Persisted Asset')

    const snapshot = {
      assets: {
        records: [
          {
            id: 'asset_backup',
            name: 'Backup Apartment',
            category: 'real_estate',
            estimatedValue: '128.00',
          },
        ],
      },
    }

    expect(restoredStore.restoreFromBackup(snapshot)).toBe(true)
    expect(restoredStore.assetCount).toBe(1)
    expect(restoredStore.findAssetById('asset_backup')?.estimatedValueCents).toBe(12800)
    expect(restoredStore.createBackupSnapshot().records[0]?.id).toBe('asset_backup')
  })
})
