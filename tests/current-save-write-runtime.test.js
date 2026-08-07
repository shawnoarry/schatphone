import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

class FakeLockManager {
  held = new Set()

  async request(name, _options, callback) {
    if (this.held.has(name)) return callback(null)
    this.held.add(name)
    try {
      return await callback({ name })
    } finally {
      this.held.delete(name)
    }
  }
}

describe('current save writer runtime', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(async () => {
    vi.useRealTimers()
    const runtime = await import('../src/lib/current-save-write-runtime')
    await runtime.resetCurrentSaveWriteRuntimeForTesting()
    const status = await import('../src/lib/persistence-runtime-status')
    status.resetPersistenceRuntimeStatusForTesting()
    vi.unstubAllEnvs()
  })

  test('holds one page writer, fails the later page closed, and promotes it after retry', async () => {
    const reports = []
    const cleared = []
    const locks = new FakeLockManager()
    const { createCurrentSaveWriteRuntime, CURRENT_SAVE_WRITE_SCOPE } = await import(
      '../src/lib/current-save-write-runtime'
    )
    const first = createCurrentSaveWriteRuntime()
    const second = createCurrentSaveWriteRuntime({
      reportWriteResult: (entry) => {
        reports.push(entry)
        return entry.result
      },
      clearIncident: (key) => cleared.push(key),
    })

    const firstAccess = await first.initialize({ locks })
    const secondAccess = await second.initialize({
      locks,
      coordinatorOptions: { waitTimeoutMs: 10, pollIntervalMs: 1 },
    })

    expect(firstAccess).toMatchObject({ ok: true, writable: true })
    expect(secondAccess).toMatchObject({
      ok: false,
      code: 'read_only_conflict',
      attempted: false,
      readOnly: true,
    })
    expect(second.getAccess()).toMatchObject({ writable: false, readOnly: true })
    expect(second.getWriteBlock()).toMatchObject({
      carrier: 'coordination',
      availableActions: ['retry', 'refresh_current_save'],
    })
    expect(reports.at(-1)?.key).toBe('current-save-writer')

    await first.close()
    await expect(second.retry()).resolves.toMatchObject({ ok: true, writable: true })
    expect(second.getAccess().writable).toBe(true)
    expect(cleared).toContain('current-save-writer')
    expect(CURRENT_SAVE_WRITE_SCOPE).toBe('current-save-write')
    await second.close()
  })

  test('blocks layered and direct durable writes with zero carrier mutation', async () => {
    vi.stubEnv('VITE_ENABLE_INDEXEDDB_MIRROR', 'false')
    const locks = new FakeLockManager()
    const { createWriteCoordinator } = await import('../src/lib/write-coordinator')
    const { CURRENT_SAVE_WRITE_SCOPE, initializeCurrentSaveWriter } = await import(
      '../src/lib/current-save-write-runtime'
    )
    const first = createWriteCoordinator({
      locks,
      scopeKey: CURRENT_SAVE_WRITE_SCOPE,
      ownerId: 'first-page',
    })
    const firstLease = await first.acquire({ operationId: 'first-page-session' })
    await initializeCurrentSaveWriter({
      locks,
      coordinatorOptions: { waitTimeoutMs: 10, pollIntervalMs: 1 },
    })
    const { writePersistedState, writePersistedStateAsync } = await import(
      '../src/lib/persistence'
    )
    const raw = JSON.stringify({ version: 1, savedAt: 1, data: { marker: 'before' } })
    localStorage.setItem('schatphone:store:system', raw)

    expect(writePersistedState('store:system', { marker: 'blocked' })).toMatchObject({
      ok: false,
      code: 'read_only_conflict',
      attempted: false,
    })
    await expect(
      writePersistedStateAsync('store:system', { marker: 'also-blocked' }),
    ).resolves.toMatchObject({
      ok: false,
      code: 'read_only_conflict',
      attempted: false,
      local: { attempted: false },
      mirror: { attempted: false },
    })
    expect(localStorage.getItem('schatphone:store:system')).toBe(raw)

    const { putGalleryAssetBlob } = await import('../src/lib/asset-binary-storage')
    await expect(putGalleryAssetBlob('blocked-binary', new Blob(['blocked']))).resolves.toBe(false)

    const { useImageGenerationStore } = await import('../src/stores/imageGeneration')
    const imageStore = useImageGenerationStore()
    const profileId = imageStore.profiles[0].id
    imageStore.setCredentials(profileId, { apiKey: 'must-not-persist' })
    expect(localStorage.getItem('schatphone:image-generation:credentials')).toBeNull()

    await firstLease.release()
    first.close()
    const { retryPersistenceWrites, getPersistenceRuntimeStatus } = await import(
      '../src/lib/persistence-runtime-status'
    )
    await expect(retryPersistenceWrites()).resolves.toMatchObject({ ok: true, remaining: 0 })
    expect(
      JSON.parse(localStorage.getItem('schatphone:store:system')).data.marker,
    ).toBe('also-blocked')
    expect(getPersistenceRuntimeStatus().active).toBe(false)
  })

  test('fails closed when the fallback lease heartbeat is lost', async () => {
    vi.useFakeTimers()
    const heartbeat = vi.fn(async () => ({ ok: false, code: 'lease_lost' }))
    const release = vi.fn(async () => ({ ok: false, code: 'lease_lost' }))
    const coordinator = {
      adapter: 'indexeddb_lease',
      ownerId: 'fallback-page',
      acquire: vi.fn(async () => ({
        ok: true,
        adapter: 'indexeddb_lease',
        ownerId: 'fallback-page',
        heartbeatMs: 25,
        heartbeat,
        release,
      })),
      close: vi.fn(),
    }
    const reports = []
    const { createCurrentSaveWriteRuntime } = await import(
      '../src/lib/current-save-write-runtime'
    )
    const runtime = createCurrentSaveWriteRuntime({
      coordinatorFactory: () => coordinator,
      openDatabase: vi.fn(async () => ({ close: vi.fn() })),
      reportWriteResult: (entry) => reports.push(entry),
      clearIncident: vi.fn(),
    })

    await expect(runtime.initialize({ locks: null })).resolves.toMatchObject({
      ok: true,
      writable: true,
    })
    await vi.advanceTimersByTimeAsync(25)

    expect(heartbeat).toHaveBeenCalledTimes(1)
    expect(runtime.getAccess()).toMatchObject({
      writable: false,
      readOnly: true,
      cause: 'lease_lost',
    })
    expect(runtime.getWriteBlock()).toMatchObject({
      ok: false,
      attempted: false,
      cause: 'lease_lost',
    })
    expect(reports.at(-1)?.key).toBe('current-save-writer')

    await runtime.close()
    vi.useRealTimers()
  })
})
