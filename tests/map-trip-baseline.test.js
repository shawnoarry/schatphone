import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '../src/stores/map'

describe('map trip baseline loop', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('starts trip and auto-arrives by system time timer', () => {
    const store = useMapStore()
    store.setTripEndpoint('from', '首尔站')
    store.setTripEndpoint('to', '清潭洞')

    const started = store.startTrip()
    expect(started.ok).toBe(true)
    expect(store.tripState.status).toBe('traveling')

    const durationMs = Math.max(1, Number(store.tripState.durationSeconds || 0)) * 1000
    vi.advanceTimersByTime(durationMs + 1000)

    expect(store.tripState.status).toBe('arrived')
    expect(store.currentLocation.detail).toBe('清潭洞')
    expect(store.tripHistory[0]?.status).toBe('arrived')
    expect(store.tripRuntime.remainingSeconds).toBe(0)

    const acknowledged = store.acknowledgeTripArrival()
    expect(acknowledged).toBe(true)
    expect(store.tripState.status).toBe('idle')
  })

  test('canceling a running trip returns to idle and writes cancelled history', () => {
    const store = useMapStore()
    store.setTripEndpoint('from', '公司')
    store.setTripEndpoint('to', '练习室')
    expect(store.startTrip().ok).toBe(true)

    const cancelled = store.cancelTrip()
    expect(cancelled).toBe(true)
    expect(store.tripState.status).toBe('idle')
    expect(store.tripHistory[0]?.status).toBe('cancelled')

    vi.advanceTimersByTime(60 * 60 * 1000)
    expect(store.tripState.status).toBe('idle')
  })

  test('backup snapshot and restore keep running trip state', () => {
    const storeA = useMapStore()
    storeA.setTripEndpoint('from', '家')
    storeA.setTripEndpoint('to', '公司')
    expect(storeA.startTrip().ok).toBe(true)

    const snapshot = storeA.createBackupSnapshot()
    setActivePinia(createPinia())
    const storeB = useMapStore()
    const restored = storeB.restoreFromBackup({ map: snapshot })

    expect(restored).toBe(true)
    expect(storeB.tripState.status).toBe('traveling')

    const remainingMs = Math.max(1, Number(storeB.tripRuntime.remainingSeconds || 0)) * 1000
    vi.advanceTimersByTime(remainingMs + 1000)

    expect(storeB.tripState.status).toBe('arrived')
    expect(storeB.currentLocation.detail).toBe('公司')
  })

  test('map visual falls back to default when gallery asset is unavailable', () => {
    const store = useMapStore()
    store.setMapVisualMode('gallery')
    store.setMapVisualAssetId('asset_missing')

    expect(store.resolveMapVisualMode({ assetAvailable: false })).toBe('default')
    const changed = store.enforceMapVisualFallback({ assetAvailable: false })
    expect(changed).toBe(true)
    expect(store.mapVisualSettings.mode).toBe('default')
    expect(store.mapVisualSettings.assetId).toBe('')
  })

  test('backup snapshot persists map visual settings', () => {
    const storeA = useMapStore()
    storeA.setMapVisualMode('gallery')
    storeA.setMapVisualAssetId('asset_abc')
    storeA.setMapAiVisualEnabled(true)
    storeA.dismissMapVisualOnboardingPrompt()

    const snapshot = storeA.createBackupSnapshot()
    setActivePinia(createPinia())
    const storeB = useMapStore()
    const restored = storeB.restoreFromBackup({ map: snapshot })

    expect(restored).toBe(true)
    expect(storeB.mapVisualSettings.mode).toBe('gallery')
    expect(storeB.mapVisualSettings.assetId).toBe('asset_abc')
    expect(storeB.mapVisualSettings.aiVisualEnabled).toBe(true)
    expect(storeB.mapVisualSettings.onboardingPromptPending).toBe(false)
  })
})
