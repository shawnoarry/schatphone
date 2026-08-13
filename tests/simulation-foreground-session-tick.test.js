import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSimulationStore } from '../src/stores/simulation'
import { useFoodDeliveryStore } from '../src/stores/foodDelivery'
import { useBookStore } from '../src/stores/book'
import { useSystemStore } from '../src/stores/system'
import { buildWorldBookSourceSnapshot } from '../src/lib/book-text-schema'
import {
  SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS,
  SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
  createForegroundSessionTickController,
} from '../src/lib/simulation/foreground-session-tick'

describe('foreground session simulation tick controller', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('creates a stopped controller with a guarded minimum interval', () => {
    const controller = createForegroundSessionTickController({
      simulationStore: useSimulationStore(),
      foodDeliveryStore: useFoodDeliveryStore(),
      intervalMs: 100,
      runTick: vi.fn(),
    })

    expect(controller.getState()).toMatchObject({
      running: false,
      intervalMs: SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
      lastRunAt: 0,
    })
  })

  test('starts one interval and can stop it without running immediately', () => {
    const runTick = vi.fn(() => ({ ok: false, reason: 'no_event_triggered' }))
    const setTimer = vi.fn(() => 'timer-1')
    const clearTimer = vi.fn()
    const controller = createForegroundSessionTickController({
      simulationStore: useSimulationStore(),
      foodDeliveryStore: useFoodDeliveryStore(),
      setTimer,
      clearTimer,
      runTick,
    })

    expect(controller.start()).toMatchObject({
      started: true,
      intervalMs: SIMULATION_FOREGROUND_TICK_DEFAULT_INTERVAL_MS,
    })
    expect(controller.start()).toMatchObject({
      started: false,
      reason: 'already_running',
    })
    expect(setTimer).toHaveBeenCalledTimes(1)
    expect(runTick).not.toHaveBeenCalled()
    expect(controller.getState().running).toBe(true)

    expect(controller.stop()).toMatchObject({
      stopped: true,
      reason: 'stopped',
    })
    expect(clearTimer).toHaveBeenCalledWith('timer-1')
    expect(controller.stop()).toMatchObject({
      stopped: false,
      reason: 'not_running',
    })
  })

  test('executes deterministic ticks through the injected runner', () => {
    const runTick = vi.fn(() => ({ ok: true, reason: 'pilot' }))
    const onResult = vi.fn()
    const controller = createForegroundSessionTickController({
      simulationStore: useSimulationStore(),
      foodDeliveryStore: useFoodDeliveryStore(),
      now: () => Date.now(),
      runTick,
      onResult,
    })

    const result = controller.execute()

    expect(result).toMatchObject({
      ok: true,
      reason: 'pilot',
    })
    expect(runTick).toHaveBeenCalledWith(expect.objectContaining({
      now: Date.now(),
      seed: `foreground-session:${Date.now()}`,
    }))
    expect(onResult).toHaveBeenCalledWith(result)
    expect(controller.getState()).toMatchObject({
      running: false,
      lastRunAt: Date.now(),
      lastResult: result,
    })
  })

  test('reads the latest active Book text on every execution', () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    const asset = bookStore.createAsset({
      id: 'foreground_world_source',
      title: 'Foreground world',
      content: 'A science fiction city with high technology and orbital transit.',
    })
    systemStore.setGlobalWorldview('An ordinary city fallback.')
    systemStore.addWorldBookSourceLink({
      assetId: asset.id,
      role: 'main_worldview',
      sourceFingerprint: asset.contentFingerprint,
      ...buildWorldBookSourceSnapshot(asset.content),
    })
    const runTick = vi.fn(() => ({ ok: false, reason: 'no_event_triggered' }))
    const controller = createForegroundSessionTickController({
      simulationStore: useSimulationStore(),
      foodDeliveryStore: useFoodDeliveryStore(),
      systemStore,
      bookStore,
      runTick,
    })

    controller.execute()
    expect(runTick.mock.calls[0][0].worldContext.genreTags[0]).toBe('sci_fi')

    expect(
      bookStore.updateAsset(asset.id, {
        content: 'An apocalypse world with sealed shelters, infection, and scarce supplies.',
      }),
    ).toMatchObject({ ok: true })
    controller.execute()

    expect(runTick.mock.calls[1][0].worldContext.genreTags[0]).toBe('apocalypse')
  })

  test('can run once immediately when start requests it', () => {
    const runTick = vi.fn(() => ({ ok: false, reason: 'surprise_mode_off' }))
    const controller = createForegroundSessionTickController({
      simulationStore: useSimulationStore(),
      foodDeliveryStore: useFoodDeliveryStore(),
      setTimer: vi.fn(() => 'timer-2'),
      runTick,
    })

    expect(controller.start({ runImmediately: true })).toMatchObject({
      started: true,
      reason: 'started',
    })
    expect(runTick).toHaveBeenCalledTimes(1)
    expect(controller.getState().lastResult).toMatchObject({
      reason: 'surprise_mode_off',
    })
  })
})
