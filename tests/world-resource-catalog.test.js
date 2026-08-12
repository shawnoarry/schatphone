import { describe, expect, test } from 'vitest'
import { createWorldResourceCatalog } from '../src/lib/world-resource-catalog'

describe('World Resource Catalog', () => {
  test('keeps Gallery and Map records versioned and type-isolated behind one resolver seam', () => {
    const catalog = createWorldResourceCatalog([
      {
        type: 'book_asset',
        catalogId: 'demo-world-book',
        catalogVersion: 1,
        asset: { title: 'Demo World', content: '# Demo' },
      },
      {
        type: 'gallery_asset_pack',
        catalogId: 'demo-world-art',
        catalogVersion: 1,
        assetPack: { name: 'Demo World Art', assets: [] },
      },
      {
        type: 'map_pack',
        catalogId: 'demo-world-map',
        catalogVersion: 1,
        mapPack: { assetId: 'demo-world-map-art' },
      },
    ])

    expect(catalog.initialErrors).toEqual([])
    expect(catalog.list().map((record) => `${record.owner}:${record.type}`)).toEqual([
      'book:book_asset',
      'gallery:gallery_asset_pack',
      'map:map_pack',
    ])

    const resolveBook = catalog.createResolver({ owner: 'book', type: 'book_asset' })
    const resolveGallery = catalog.createResolver({
      owner: 'gallery',
      type: 'gallery_asset_pack',
    })
    const resolveMap = catalog.createResolver({ owner: 'map', type: 'map_pack' })
    expect(resolveBook('demo-world-book', 1)?.asset.content).toBe('# Demo')
    expect(resolveBook('demo-world-art', 1)).toBeNull()
    expect(resolveGallery('demo-world-art', 1)?.assetPack.name).toBe('Demo World Art')
    expect(resolveGallery('demo-world-map', 1)).toBeNull()
    expect(resolveMap('demo-world-map', 1)?.mapPack.assetId).toBe('demo-world-map-art')
    expect(resolveMap('demo-world-map', 2)).toBeNull()
  })

  test('fails closed for invalid, mismatched, and duplicated records', () => {
    const catalog = createWorldResourceCatalog()

    expect(catalog.register({ type: 'unknown', catalogId: 'bad', version: 1 })).toEqual({
      ok: false,
      code: 'catalog_record_invalid',
    })
    expect(
      catalog.register({
        type: 'map_pack',
        owner: 'gallery',
        catalogId: 'wrong-owner',
        catalogVersion: 1,
      }),
    ).toEqual({ ok: false, code: 'catalog_record_invalid' })

    const record = {
      type: 'map_pack',
      catalogId: 'demo-map',
      catalogVersion: 1,
      mapPack: { assetId: 'demo-map-art' },
    }
    expect(catalog.register(record).ok).toBe(true)
    expect(catalog.register(record)).toEqual({ ok: false, code: 'catalog_record_duplicate' })
  })
})
