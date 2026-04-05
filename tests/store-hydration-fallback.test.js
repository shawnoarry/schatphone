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

    expect(readPersistedState).toHaveBeenCalledTimes(1)
    expect(writePersistedState).toHaveBeenCalledTimes(0)

    await flushAsyncHydration()

    expect(readPersistedStateAsync).toHaveBeenCalledTimes(1)
    expect(store.addresses[0]?.label).toBe('Async Home')
    expect(store.currentLocation.detail).toBe('Async Street 7')
    expect(store.tripForm.to).toBe('Async To')
    expect(writePersistedState).toHaveBeenCalledTimes(1)
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

    expect(readPersistedState).toHaveBeenCalledTimes(1)
    expect(readPersistedStateAsync).not.toHaveBeenCalled()
    expect(store.addresses[0]?.label).toBe('Sync Home')
    expect(store.tripForm.from).toBe('Sync From')
    expect(writePersistedState).toHaveBeenCalledTimes(1)
  })
})
