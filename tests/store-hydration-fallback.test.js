import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const readPersistedState = vi.fn()
const readPersistedStateAsync = vi.fn()
const writePersistedState = vi.fn()

vi.mock('../src/lib/persistence', () => ({
  readPersistedState,
  readPersistedStateAsync,
  writePersistedState,
}))

const flushAsyncHydration = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

const callsForKey = (spy, key) =>
  spy.mock.calls.filter(([calledKey]) => calledKey === key)

const MAP_STORAGE_KEY = 'store:map'

describe('store hydration fallback', () => {
  beforeEach(() => {
    vi.resetModules()
    readPersistedState.mockReset()
    readPersistedStateAsync.mockReset()
    writePersistedState.mockReset()
    setActivePinia(createPinia())
  })

  test('hydrates map store from async fallback when sync storage misses', async () => {
    readPersistedState.mockReturnValue(null)
    readPersistedStateAsync.mockResolvedValue({
      addresses: [{ id: 7, label: 'Async Home', detail: 'Async Street 7' }],
      currentLocation: {
        source: 'saved',
        label: 'Async Home',
        detail: 'Async Street 7',
      },
      tripForm: {
        from: 'Async From',
        to: 'Async To',
      },
    })

    const { useMapStore } = await import('../src/stores/map')
    const store = useMapStore()

    expect(callsForKey(readPersistedState, MAP_STORAGE_KEY)).toHaveLength(1)
    expect(callsForKey(writePersistedState, MAP_STORAGE_KEY)).toHaveLength(0)

    await flushAsyncHydration()

    expect(callsForKey(readPersistedStateAsync, MAP_STORAGE_KEY)).toHaveLength(1)
    expect(store.addresses[0]?.label).toBe('Async Home')
    expect(store.currentLocation.detail).toBe('Async Street 7')
    expect(store.tripForm.to).toBe('Async To')
    expect(callsForKey(writePersistedState, MAP_STORAGE_KEY)).toHaveLength(1)
  })

  test('skips async fallback when sync storage already has snapshot', async () => {
    readPersistedState.mockReturnValue({
      addresses: [{ id: 8, label: 'Sync Home', detail: 'Sync Street 8' }],
      currentLocation: {
        source: 'saved',
        label: 'Sync Home',
        detail: 'Sync Street 8',
      },
      tripForm: {
        from: 'Sync From',
        to: 'Sync To',
      },
    })
    readPersistedStateAsync.mockResolvedValue({
      addresses: [{ id: 99, label: 'Should Not Apply', detail: 'Ignored' }],
    })

    const { useMapStore } = await import('../src/stores/map')
    const store = useMapStore()

    await flushAsyncHydration()

    expect(callsForKey(readPersistedState, MAP_STORAGE_KEY)).toHaveLength(1)
    expect(callsForKey(readPersistedStateAsync, MAP_STORAGE_KEY)).toHaveLength(0)
    expect(store.addresses[0]?.label).toBe('Sync Home')
    expect(store.tripForm.from).toBe('Sync From')
    expect(callsForKey(writePersistedState, MAP_STORAGE_KEY)).toHaveLength(1)
  })
})
