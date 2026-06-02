import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBookStore } from '../src/stores/book'

describe('book store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-29T09:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('starts from an empty stable library', () => {
    const store = useBookStore()

    expect(store.assetCount).toBe(0)
    expect(store.listAssets()).toEqual([])
    expect(store.createBackupSnapshot()).toEqual({
      assets: [],
      categories: [],
    })
  })

  test('creates, updates, filters, and deletes assets', () => {
    const store = useBookStore()

    const asset = store.createAsset({
      id: 'asset_city_rules',
      title: 'City Rules',
      category: 'world_rule',
      tags: ['city'],
      content: 'No loud magic on trains.',
    })

    expect(store.assetCount).toBe(1)
    expect(asset.category).toBe('world_rule')
    expect(asset.assetType).toBe('world_rule')
    expect(store.findAssetById('asset_city_rules')?.title).toBe('City Rules')
    expect(store.listAssets({ search: 'magic' })).toHaveLength(1)
    expect(store.listAssets({ category: 'world_rule' })).toHaveLength(1)
    expect(store.listAssets({ assetType: 'rule_set' })).toHaveLength(1)
    expect(store.listAssets({ tag: 'city' })).toHaveLength(1)

    const updated = store.updateAsset(asset.id, {
      title: 'Quiet City Rules',
      content: 'No loud magic on trains after midnight.',
    })

    expect(updated.ok).toBe(true)
    expect(updated.asset.title).toBe('Quiet City Rules')
    expect(updated.asset.version).toBe(2)

    const deleted = store.deleteAsset(asset.id)
    expect(deleted.ok).toBe(true)
    expect(store.assetCount).toBe(0)
  })

  test('locked assets cannot be updated until explicitly unlocked or forced', () => {
    const store = useBookStore()
    const asset = store.createAsset({
      id: 'asset_locked',
      title: 'Locked Source',
      content: 'Stable text.',
    })

    expect(store.lockAsset(asset.id).ok).toBe(true)
    const blocked = store.updateAsset(asset.id, { content: 'Changed text.' })
    expect(blocked).toMatchObject({ ok: false, reason: 'locked' })
    expect(store.findAssetById(asset.id)?.content).toBe('Stable text.')

    expect(store.unlockAsset(asset.id).ok).toBe(true)
    const updated = store.updateAsset(asset.id, { content: 'Changed text.' })
    expect(updated.ok).toBe(true)
    expect(store.findAssetById(asset.id)?.content).toBe('Changed text.')
  })

  test('active source assets are protected from normal delete', () => {
    const store = useBookStore()
    const asset = store.createAsset({
      id: 'asset_active',
      title: 'Active Source',
      status: 'active_source',
      content: 'Current world source.',
    })

    expect(store.deleteAsset(asset.id)).toMatchObject({
      ok: false,
      reason: 'active_source',
    })
    expect(store.assetCount).toBe(1)

    expect(store.deleteAsset(asset.id, { force: true }).ok).toBe(true)
    expect(store.assetCount).toBe(0)
  })

  test('imports markdown and creates sections', () => {
    const store = useBookStore()

    const result = store.importTextAsset({
      fileName: 'setting.md',
      content: '# City\n\nRain rules.\n\n## Transit\n\nQuiet cars.',
      mimeType: 'text/markdown',
    })

    expect(result.ok).toBe(true)
    expect(result.asset.format).toBe('markdown')
    expect(result.asset.sections.map((section) => section.title)).toEqual(['City', 'Transit'])
    expect(store.assetCount).toBe(1)
  })

  test('backup and restore preserves assets', () => {
    const store = useBookStore()
    store.createAsset({
      id: 'asset_backup',
      title: 'Backup Source',
      category: 'worldview',
      content: 'Backup text.',
    })
    const snapshot = store.createBackupSnapshot()

    setActivePinia(createPinia())
    const restoredStore = useBookStore()
    restoredStore.restoreFromBackup(snapshot)

    expect(restoredStore.assetCount).toBe(1)
    expect(restoredStore.findAssetById('asset_backup')?.content).toBe('Backup text.')
  })

  test('duplicates assets as unlocked drafts', () => {
    const store = useBookStore()
    const asset = store.createAsset({
      id: 'asset_original',
      title: 'Original',
      status: 'active_source',
      locked: true,
      content: 'Original text.',
    })

    const duplicate = store.duplicateAsset(asset.id)

    expect(duplicate.title).toBe('Original Copy')
    expect(duplicate.status).toBe('draft')
    expect(duplicate.locked).toBe(false)
    expect(duplicate.content).toBe('Original text.')
  })
})
