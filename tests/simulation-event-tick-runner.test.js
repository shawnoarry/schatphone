import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  SIMULATION_SURPRISE_MODE,
  useSimulationStore,
} from '../src/stores/simulation'
import {
  FOOD_DELIVERY_ORDER_EVENT_TYPE,
  useFoodDeliveryStore,
} from '../src/stores/foodDelivery'
import {
  FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
} from '../src/lib/simulation/adapters/food-delivery-events'
import {
  SIMULATION_EVENT_TICK_ID,
  SIMULATION_TICK_REASON,
  canRunSimulationEventTick,
  resolveTickRandomValue,
  runSimulationEventTick,
} from '../src/lib/simulation/event-tick-runner'

const createFoodDeliveryOrder = (store) => {
  const restaurant = store.upsertRestaurant({
    id: 'tick_runner_restaurant',
    name: 'Tick Runner Kitchen',
    category: 'restaurants',
    deliveryFee: '4.00',
  })
  const menuItem = store.upsertMenuItem({
    id: 'tick_runner_item',
    restaurantId: restaurant.id,
    title: 'Tick Runner Meal',
    price: '28.00',
  })
  store.addToCart(menuItem.id)
  return store.checkoutCart({
    deliveryAddress: 'Tick Runner Address',
  })
}

describe('simulation event tick runner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('skips the tick when Surprise Mode is off', () => {
    const simulationStore = useSimulationStore()
    const foodDeliveryStore = useFoodDeliveryStore()
    simulationStore.resetForTesting()
    foodDeliveryStore.resetForTesting()
    createFoodDeliveryOrder(foodDeliveryStore)
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.OFF)

    const result = runSimulationEventTick({
      simulationStore,
      foodDeliveryStore,
      randomValue: 0,
      now: Date.now(),
    })

    expect(result).toMatchObject({
      ok: false,
      status: 'skipped',
      reason: SIMULATION_TICK_REASON.SURPRISE_MODE_OFF,
    })
    expect(foodDeliveryStore.orders[0]?.events).toHaveLength(0)
    expect(simulationStore.eventLogs[0]).toMatchObject({
      eventId: SIMULATION_EVENT_TICK_ID,
      status: 'skipped',
      reason: SIMULATION_TICK_REASON.SURPRISE_MODE_OFF,
    })
  })

  test('runs the safe Food Delivery pilot through a session tick', () => {
    const simulationStore = useSimulationStore()
    const foodDeliveryStore = useFoodDeliveryStore()
    simulationStore.resetForTesting()
    foodDeliveryStore.resetForTesting()
    createFoodDeliveryOrder(foodDeliveryStore)

    const result = runSimulationEventTick({
      simulationStore,
      foodDeliveryStore,
      randomValue: 0,
      now: Date.now(),
    })

    expect(result).toMatchObject({
      ok: true,
      status: 'triggered',
      reason: FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
    })
    expect(result.triggeredPilot).toMatchObject({
      ok: true,
      status: 'triggered',
      pilotEventId: FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
    })
    expect(foodDeliveryStore.orders[0]?.events[0]).toMatchObject({
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
    })
    expect(simulationStore.isCoolingDown(SIMULATION_EVENT_TICK_ID, { targetId: 'global' })).toBe(true)
    expect(
      simulationStore.getDailyCounterState(SIMULATION_EVENT_TICK_ID, {
        targetId: 'global',
        limit: 12,
      }).count,
    ).toBe(1)
  })

  test('respects tick-level cooldown before calling pilots again', () => {
    const simulationStore = useSimulationStore()
    const foodDeliveryStore = useFoodDeliveryStore()
    simulationStore.resetForTesting()
    foodDeliveryStore.resetForTesting()
    createFoodDeliveryOrder(foodDeliveryStore)

    const first = runSimulationEventTick({
      simulationStore,
      foodDeliveryStore,
      randomValue: 0,
      now: Date.now(),
    })
    const second = runSimulationEventTick({
      simulationStore,
      foodDeliveryStore,
      randomValue: 0,
      now: Date.now() + 1000,
    })

    expect(first.ok).toBe(true)
    expect(second).toMatchObject({
      ok: false,
      status: 'skipped',
      reason: SIMULATION_TICK_REASON.TICK_COOLDOWN_ACTIVE,
    })
    expect(foodDeliveryStore.orders[0]?.events).toHaveLength(1)
  })

  test('reports pilot skips without marking the tick cooldown', () => {
    const simulationStore = useSimulationStore()
    const foodDeliveryStore = useFoodDeliveryStore()
    simulationStore.resetForTesting()
    foodDeliveryStore.resetForTesting()
    createFoodDeliveryOrder(foodDeliveryStore)
    simulationStore.setModuleEventsEnabled('food_delivery', false)

    const result = runSimulationEventTick({
      simulationStore,
      foodDeliveryStore,
      randomValue: 0,
      now: Date.now(),
    })

    expect(result).toMatchObject({
      ok: false,
      status: 'skipped',
      reason: 'module_events_disabled',
    })
    expect(simulationStore.isCoolingDown(SIMULATION_EVENT_TICK_ID, { targetId: 'global' })).toBe(false)
    expect(foodDeliveryStore.orders[0]?.events).toHaveLength(0)
  })

  test('exposes an eligibility helper for future app lifecycle callers', () => {
    const simulationStore = useSimulationStore()
    simulationStore.resetForTesting()

    expect(
      canRunSimulationEventTick({
        simulationStore,
        now: Date.now(),
      }),
    ).toMatchObject({
      ok: true,
      reason: 'eligible',
      surpriseMode: SIMULATION_SURPRISE_MODE.LOW,
    })

    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.OFF)
    expect(
      canRunSimulationEventTick({
        simulationStore,
        now: Date.now(),
      }),
    ).toMatchObject({
      ok: false,
      reason: SIMULATION_TICK_REASON.SURPRISE_MODE_OFF,
    })
  })

  test('resolves deterministic tick random values for future automatic callers', () => {
    expect(resolveTickRandomValue({ randomValue: 0.25 })).toBe(0.25)
    expect(resolveTickRandomValue({ randomValue: -1 })).toBe(0)
    expect(resolveTickRandomValue({ randomValue: 2 })).toBe(1)

    const first = resolveTickRandomValue({
      seed: 'foreground-session',
      now: Date.now(),
    })
    const second = resolveTickRandomValue({
      seed: 'foreground-session',
      now: Date.now(),
    })
    const later = resolveTickRandomValue({
      seed: 'foreground-session',
      now: Date.now() + 1000,
    })

    expect(first).toBeGreaterThanOrEqual(0)
    expect(first).toBeLessThanOrEqual(1)
    expect(second).toBe(first)
    expect(later).not.toBe(first)
  })
})
