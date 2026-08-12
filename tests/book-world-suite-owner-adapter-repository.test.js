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
import { createBookWorldSuiteOwnerAdapter } from '../src/lib/book-world-suite-owner-adapter'

const resource = {
  id: 'book.repository-demo',
  type: 'book_asset',
  owner: 'book',
  ownerResourceId: 'repository_demo_book',
  catalogId: 'repository_demo_catalog',
  version: 1,
}

const resolveCatalogAsset = () => ({
  catalogId: resource.catalogId,
  catalogVersion: resource.version,
  asset: {
    title: 'Repository Demo',
    category: 'worldview',
    content: 'Repository-backed text.',
  },
})

const createAdapter = (bookStore) => createBookWorldSuiteOwnerAdapter({
  bookStore,
  listWorldBookSourceLinks: () => [],
  resolveCatalogAsset,
})

describe('Book World Suite Owner Adapter Repository persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    Object.values(runtimeHarness).forEach((mock) => mock.mockReset())
    runtimeHarness.initialize.mockResolvedValue({
      ok: true,
      code: 'repository_active',
      pointer: { generationId: 'generation-current' },
      snapshot: { assets: [], categories: [] },
    })
  })

  test('awaits exactly one verified Repository write for a managed install', async () => {
    runtimeHarness.persistSnapshot.mockResolvedValue({
      ok: true,
      code: 'repository_saved',
      pointer: { generationId: 'generation-next' },
    })
    const bookStore = useBookStore()
    await vi.waitFor(() => expect(bookStore.hasFinishedStorageHydration).toBe(true))

    const result = await createAdapter(bookStore).install({ resource })

    expect(result.ok).toBe(true)
    expect(runtimeHarness.persistSnapshot).toHaveBeenCalledTimes(1)
    expect(runtimeHarness.persistSnapshot).toHaveBeenCalledWith({
      snapshot: expect.objectContaining({
        assets: [expect.objectContaining({ id: resource.ownerResourceId })],
      }),
    })
    expect(bookStore.activeGenerationId).toBe('generation-next')
  })

  test('restores in-memory native truth when the Repository rejects the write', async () => {
    runtimeHarness.persistSnapshot.mockResolvedValue({
      ok: false,
      code: 'repository_write_failed',
    })
    const bookStore = useBookStore()
    await vi.waitFor(() => expect(bookStore.hasFinishedStorageHydration).toBe(true))

    const adapter = createAdapter(bookStore)
    const result = await adapter.install({ resource })

    expect(result).toMatchObject({ ok: false, code: 'repository_write_failed' })
    expect(runtimeHarness.persistSnapshot).toHaveBeenCalledTimes(1)
    expect(bookStore.findAssetById(resource.ownerResourceId)).toBeNull()
    expect(bookStore.assetCount).toBe(0)
    expect(bookStore.storageReadOnly).toBe(true)
    expect(await adapter.inspect({ resource })).toMatchObject({ installed: false })
  })
})
