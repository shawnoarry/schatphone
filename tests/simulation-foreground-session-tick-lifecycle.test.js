import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  createForegroundSessionTickLifecycle,
  createForegroundSessionTickReport,
  normalizeForegroundSessionTickIntervalMs,
  resolveForegroundSessionTickBlockReason,
  SIMULATION_FOREGROUND_TICK_ACTION,
  SIMULATION_FOREGROUND_TICK_SKIPPED_CODE,
  SIMULATION_FOREGROUND_TICK_TRIGGERED_CODE,
} from '../src/lib/simulation/foreground-session-tick-lifecycle'
import {
  SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
  useSimulationStore,
} from '../src/stores/simulation'
import { useSystemStore } from '../src/stores/system'

const createFakeControllerFactory = () => {
  const controllers = []
  const factory = vi.fn((options = {}) => {
    const controller = {
      options,
      running: false,
      start: vi.fn(() => {
        controller.running = true
        return {
          started: true,
          reason: 'started',
          intervalMs: options.intervalMs,
        }
      }),
      stop: vi.fn(() => {
        const wasRunning = controller.running
        controller.running = false
        return {
          stopped: wasRunning,
          reason: wasRunning ? 'stopped' : 'not_running',
        }
      }),
      getState: vi.fn(() => ({
        running: controller.running,
        intervalMs: options.intervalMs,
      })),
    }
    controllers.push(controller)
    return controller
  })

  return {
    factory,
    controllers,
  }
}

describe('foreground session tick lifecycle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('keeps the runtime stopped until the Settings switch is enabled', () => {
    const simulationStore = useSimulationStore()
    const systemStore = useSystemStore()
    systemStore.unlockPhone()
    const { factory } = createFakeControllerFactory()

    const lifecycle = createForegroundSessionTickLifecycle({
      simulationStore,
      systemStore,
      route: { path: '/home' },
      documentRef: { hidden: false, visibilityState: 'visible' },
      createController: factory,
    })

    expect(lifecycle.restart()).toEqual({
      started: false,
      reason: 'disabled',
    })
    expect(factory).not.toHaveBeenCalled()
  })

  test('starts with normalized interval only when the phone is foreground and unlocked', () => {
    const simulationStore = useSimulationStore()
    const systemStore = useSystemStore()
    systemStore.unlockPhone()
    simulationStore.setForegroundSessionTickEnabled(true)
    simulationStore.setForegroundSessionTickIntervalMs(1)
    const { factory, controllers } = createFakeControllerFactory()

    const lifecycle = createForegroundSessionTickLifecycle({
      simulationStore,
      systemStore,
      route: { path: '/home' },
      documentRef: { hidden: false, visibilityState: 'visible' },
      createController: factory,
    })

    const result = lifecycle.restart()

    expect(result.started).toBe(true)
    expect(result.intervalMs).toBe(SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS)
    expect(factory).toHaveBeenCalledTimes(1)
    expect(controllers[0].options.intervalMs).toBe(SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS)
    expect(lifecycle.getState().running).toBe(true)
  })

  test('stops an existing controller when the app becomes hidden', () => {
    const simulationStore = useSimulationStore()
    const systemStore = useSystemStore()
    systemStore.unlockPhone()
    simulationStore.setForegroundSessionTickEnabled(true)
    const documentRef = { hidden: false, visibilityState: 'visible' }
    const { factory, controllers } = createFakeControllerFactory()

    const lifecycle = createForegroundSessionTickLifecycle({
      simulationStore,
      systemStore,
      route: { path: '/home' },
      documentRef,
      createController: factory,
    })

    expect(lifecycle.restart().started).toBe(true)
    documentRef.hidden = true
    documentRef.visibilityState = 'hidden'

    expect(lifecycle.restart()).toEqual({
      started: false,
      reason: 'hidden',
    })
    expect(controllers[0].stop).toHaveBeenCalledTimes(1)
    expect(lifecycle.getState().running).toBe(false)
  })

  test('writes Network diagnostics reports for tick results', () => {
    const simulationStore = useSimulationStore()
    const systemStore = useSystemStore()
    systemStore.unlockPhone()
    simulationStore.setForegroundSessionTickEnabled(true)
    const writeReport = vi.fn()
    const { factory, controllers } = createFakeControllerFactory()

    const lifecycle = createForegroundSessionTickLifecycle({
      simulationStore,
      systemStore,
      route: { path: '/home' },
      documentRef: { hidden: false, visibilityState: 'visible' },
      createController: factory,
      writeReport,
      now: () => 1710000000000,
    })

    lifecycle.restart()
    controllers[0].options.onResult({
      ok: true,
      status: 'triggered',
      reason: 'food_delivery.random_order_pilot.v1',
      log: {
        at: 1710000000123,
      },
    })

    expect(writeReport).toHaveBeenCalledWith(
      expect.objectContaining({
        action: SIMULATION_FOREGROUND_TICK_ACTION,
        code: SIMULATION_FOREGROUND_TICK_TRIGGERED_CODE,
        createdAt: 1710000000123,
        model: 'food_delivery.random_order_pilot.v1',
      }),
    )
  })

  test('reports lock and route guards without creating a timer', () => {
    const simulationStore = useSimulationStore()
    const systemStore = useSystemStore()
    simulationStore.setForegroundSessionTickEnabled(true)

    expect(
      resolveForegroundSessionTickBlockReason({
        simulationStore,
        systemStore,
        route: { path: '/home' },
        documentRef: { hidden: false, visibilityState: 'visible' },
      }),
    ).toBe('phone_locked')

    systemStore.unlockPhone()
    expect(
      resolveForegroundSessionTickBlockReason({
        simulationStore,
        systemStore,
        route: { path: '/lock' },
        documentRef: { hidden: false, visibilityState: 'visible' },
      }),
    ).toBe('lock_route')
  })

  test('creates stable skipped reports for diagnostics', () => {
    const report = createForegroundSessionTickReport({
      ok: false,
      status: 'skipped',
      reason: 'tick_cooldown_active',
    })

    expect(report).toEqual(
      expect.objectContaining({
        action: SIMULATION_FOREGROUND_TICK_ACTION,
        code: SIMULATION_FOREGROUND_TICK_SKIPPED_CODE,
        model: 'tick_cooldown_active',
      }),
    )
    expect(normalizeForegroundSessionTickIntervalMs(0)).toBeGreaterThanOrEqual(
      SIMULATION_FOREGROUND_TICK_MIN_INTERVAL_MS,
    )
  })
})
