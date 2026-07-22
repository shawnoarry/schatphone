import { nextTick } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const runtimeHarness = vi.hoisted(() => ({
  initialize: vi.fn(),
  requestPersistentStorage: vi.fn(),
  upgradeFromLegacy: vi.fn(),
  persistSnapshot: vi.fn(),
}))

vi.mock('../src/lib/book-repository-runtime', () => ({
  createBookRepositoryRuntime: () => runtimeHarness,
  estimateBookRepositoryPeakBytes: vi.fn(() => 1),
}))

import { useBookStore } from '../src/stores/book'

const repositorySnapshot = (content = 'Authoritative content.') => ({
  assets: [{
    id: 'asset_repository_authority',
    title: 'Repository authority',
    category: 'worldview',
    content,
    version: 1,
    createdAt: 1,
    updatedAt: 1,
  }],
  categories: [],
})

const flushStoreWatchers = async () => {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('Book Repository internal snapshot loading', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    Object.values(runtimeHarness).forEach((mock) => mock.mockReset())
  })

  test('refreshes a conflicted current save without writing a new generation', async () => {
    const authoritative = repositorySnapshot()
    const refreshCurrentSave = vi.fn(async () => ({
      ok: true,
      code: 'repository_active',
      pointer: { generationId: 'generation-authoritative' },
      snapshot: authoritative,
    }))
    runtimeHarness.initialize.mockResolvedValue({
      ok: true,
      code: 'repository_active',
      pointer: { generationId: 'generation-original' },
      snapshot: authoritative,
    })
    runtimeHarness.persistSnapshot.mockResolvedValueOnce({
      ok: false,
      code: 'read_only_conflict',
      readOnly: true,
      retry: vi.fn(),
      refreshCurrentSave,
    })

    const store = useBookStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    await flushStoreWatchers()
    expect(runtimeHarness.persistSnapshot).not.toHaveBeenCalled()
    const created = store.createAsset({
      id: 'asset_conflicting_edit',
      title: 'Conflicting edit',
      content: 'This local edit loses the write race.',
    })
    expect(created).not.toBeNull()
    await flushStoreWatchers()
    await vi.waitFor(() => expect(store.storageReadOnly).toBe(true))
    expect(runtimeHarness.persistSnapshot).toHaveBeenCalledTimes(1)

    const result = await store.refreshBookStorage()
    await flushStoreWatchers()

    expect(result.ok).toBe(true)
    expect(refreshCurrentSave).toHaveBeenCalledTimes(1)
    expect(runtimeHarness.persistSnapshot).toHaveBeenCalledTimes(1)
    expect(store.findAssetById('asset_conflicting_edit')).toBeNull()
    expect(store.findAssetById('asset_repository_authority')?.content).toBe(
      'Authoritative content.',
    )
    expect(store.storageReadOnly).toBe(false)
  })

  test('loads an upgraded Repository snapshot without immediately writing it again', async () => {
    runtimeHarness.initialize.mockResolvedValue({
      ok: true,
      code: 'legacy_active',
      pointer: { generationId: '' },
      snapshot: null,
    })
    runtimeHarness.upgradeFromLegacy.mockResolvedValue({
      ok: true,
      code: 'book_storage_upgraded',
      pointer: { generationId: 'generation-upgraded' },
      snapshot: repositorySnapshot('Migrated exactly once.'),
    })

    const store = useBookStore()
    await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
    await flushStoreWatchers()
    expect(runtimeHarness.persistSnapshot).not.toHaveBeenCalled()

    const result = await store.upgradeBookStorage({ allowBestEffort: true })
    await flushStoreWatchers()

    expect(result.ok).toBe(true)
    expect(runtimeHarness.upgradeFromLegacy).toHaveBeenCalledTimes(1)
    expect(runtimeHarness.persistSnapshot).not.toHaveBeenCalled()
    expect(store.findAssetById('asset_repository_authority')?.content).toBe(
      'Migrated exactly once.',
    )
    expect(store.activeGenerationId).toBe('generation-upgraded')
  })
})
