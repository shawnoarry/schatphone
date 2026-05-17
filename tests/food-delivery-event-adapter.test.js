import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  FOOD_DELIVERY_ORDER_EVENT_TYPE,
  FOOD_DELIVERY_ORDER_STATUS,
  useFoodDeliveryStore,
} from '../src/stores/foodDelivery'
import { useSimulationStore } from '../src/stores/simulation'
import {
  FOOD_DELIVERY_EVENT_ADAPTER_KEY,
  FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
  FOOD_DELIVERY_RANDOM_PILOT_DAILY_LIMIT,
  FOOD_DELIVERY_ORDER_EVENT_PRESET_ID,
  buildFoodDeliveryOrderEventInput,
  buildFoodDeliveryEventVariantPack,
  getFoodDeliveryOrderEventPreset,
  listFoodDeliveryRandomPilotOrders,
  listFoodDeliveryRandomPilotPresets,
  resolveFoodDeliveryOrderEventVariant,
  listFoodDeliveryOrderEventPresets,
  runFoodDeliveryRandomOrderEventPilot,
  runFoodDeliveryOrderEventPreset,
  triggerFoodDeliveryOrderEvent,
} from '../src/lib/simulation/adapters/food-delivery-events'
import { resolveWorldContextFromWorldBook } from '../src/lib/simulation/world-context'

const createOrder = (store) => {
  const restaurant = store.upsertRestaurant({
    id: 'food_adapter_shop',
    name: 'Adapter Kitchen',
    category: 'restaurants',
    deliveryFee: '5.00',
  })
  const menuItem = store.upsertMenuItem({
    id: 'food_adapter_item',
    restaurantId: restaurant.id,
    title: 'Adapter Meal',
    price: '30.00',
  })
  store.addToCart(menuItem.id)
  return store.checkoutCart({
    deliveryAddress: 'Old Adapter Address',
    note: 'Adapter test order.',
  })
}

describe('food delivery event adapter', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('exposes reusable presets for every supported Food Delivery order event', () => {
    const presets = listFoodDeliveryOrderEventPresets()

    expect(presets.map((preset) => preset.id)).toEqual([
      FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
      FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RESTAURANT_CANCELLED,
      FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ADDRESS_CHANGE,
      FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE,
      FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.STATUS_UPDATE,
    ])
    expect(presets.map((preset) => preset.type)).toEqual([
      FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
      FOOD_DELIVERY_ORDER_EVENT_TYPE.RESTAURANT_CANCELLED,
      FOOD_DELIVERY_ORDER_EVENT_TYPE.ADDRESS_CHANGE,
      FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      FOOD_DELIVERY_ORDER_EVENT_TYPE.STATUS_UPDATE,
    ])
    expect(presets.every((preset) => preset.moduleKey === 'food_delivery')).toBe(true)
    expect(presets.every((preset) => preset.effect.adapterKey === FOOD_DELIVERY_EVENT_ADAPTER_KEY)).toBe(true)
    expect(presets.every((preset) => preset.surfaces.includes('chat.food_delivery_service'))).toBe(true)
  })

  test('exposes only non-destructive presets for the random pilot', () => {
    const pilotPresets = listFoodDeliveryRandomPilotPresets()

    expect(pilotPresets.map((preset) => preset.id)).toEqual([
      FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE,
      FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
    ])
    expect(pilotPresets.map((preset) => preset.type)).toEqual([
      FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
    ])
    expect(pilotPresets.map((preset) => preset.id)).not.toContain(
      FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RESTAURANT_CANCELLED,
    )
  })

  test('builds event payloads from presets without touching store state', () => {
    const payload = buildFoodDeliveryOrderEventInput({
      presetId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE,
      summary: 'ETA changed to 38 minutes.',
      etaMinutes: 38,
      sourceModule: 'test_event_runner',
      sourceId: 'test_eta_1',
      createdAt: Date.now(),
    })

    expect(payload).toMatchObject({
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      title: 'ETA updated',
      summary: 'ETA changed to 38 minutes.',
      etaMinutes: 38,
      sourceModule: 'test_event_runner',
      sourceId: 'test_eta_1',
      createdAt: Date.now(),
    })
    expect(buildFoodDeliveryOrderEventInput({ presetId: 'missing' })).toBeNull()
  })

  test('triggers Food Delivery-owned order events through the adapter seam', () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()
    const order = createOrder(store)

    const event = triggerFoodDeliveryOrderEvent(store, {
      orderId: order.id,
      presetId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
      summary: 'Rider is delayed by a sudden rainstorm.',
      etaMinutes: 44,
    })

    expect(event).toMatchObject({
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
      summary: 'Rider is delayed by a sudden rainstorm.',
      etaMinutes: 44,
      sourceModule: 'simulation_food_delivery_event_adapter',
      sourceId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
    })
    expect(store.orders[0]?.events[0]).toMatchObject({
      id: event.id,
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
    })
    expect(store.orders[0]?.status).toBe(FOOD_DELIVERY_ORDER_STATUS.PLACED)
  })

  test('keeps Food Delivery side effects in the store when presets imply status or address changes', () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()
    const order = createOrder(store)

    const addressEvent = triggerFoodDeliveryOrderEvent(store, {
      orderId: order.id,
      presetId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ADDRESS_CHANGE,
      deliveryAddress: 'New Adapter Address',
    })
    expect(addressEvent?.deliveryAddress).toBe('New Adapter Address')
    expect(store.orders[0]?.deliveryAddress).toBe('New Adapter Address')

    const cancelledEvent = triggerFoodDeliveryOrderEvent(store, {
      orderId: order.id,
      presetId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RESTAURANT_CANCELLED,
      summary: 'Kitchen closed before preparing the order.',
    })
    expect(cancelledEvent?.type).toBe(FOOD_DELIVERY_ORDER_EVENT_TYPE.RESTAURANT_CANCELLED)
    expect(store.orders[0]?.status).toBe(FOOD_DELIVERY_ORDER_STATUS.CANCELLED)
  })

  test('returns null for missing store, order, or preset inputs', () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()
    const order = createOrder(store)

    expect(triggerFoodDeliveryOrderEvent(null, { orderId: order.id })).toBeNull()
    expect(
      triggerFoodDeliveryOrderEvent(store, {
        orderId: '',
        presetId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
      }),
    ).toBeNull()
    expect(
      triggerFoodDeliveryOrderEvent(store, {
        orderId: order.id,
        presetId: 'missing',
      }),
    ).toBeNull()
    expect(getFoodDeliveryOrderEventPreset('missing')).toBeNull()
  })

  test('runs Food Delivery presets through the shared event engine seam', () => {
    const foodDeliveryStore = useFoodDeliveryStore()
    const simulationStore = useSimulationStore()
    foodDeliveryStore.resetForTesting()
    simulationStore.resetForTesting()
    const order = createOrder(foodDeliveryStore)

    const randomSkipped = runFoodDeliveryOrderEventPreset({
      foodDeliveryStore,
      simulationStore,
      orderId: order.id,
      presetId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
      triggerSource: 'random',
      randomValue: 0.99,
      now: Date.now(),
    })
    expect(randomSkipped).toMatchObject({
      ok: false,
      status: 'skipped',
    })
    expect(foodDeliveryStore.orders[0]?.events).toHaveLength(0)
    expect(simulationStore.eventLogs[0]).toMatchObject({
      eventId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
      status: 'skipped',
      reason: 'random_failed',
    })

    const manualTriggered = runFoodDeliveryOrderEventPreset({
      foodDeliveryStore,
      simulationStore,
      orderId: order.id,
      presetId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
      triggerSource: 'manual',
      summary: 'Engine runner delayed this order.',
      now: Date.now(),
    })
    expect(manualTriggered).toMatchObject({
      ok: true,
      status: 'triggered',
    })
    expect(manualTriggered.adapterResult).toMatchObject({
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
      sourceModule: 'simulation_food_delivery_event_engine',
    })
    expect(foodDeliveryStore.orders[0]?.events[0]).toMatchObject({
      id: manualTriggered.adapterResult.id,
      summary: 'Engine runner delayed this order.',
    })
    expect(simulationStore.isCoolingDown(FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY, { targetId: order.id })).toBe(true)
    expect(
      simulationStore.getDailyCounterState(FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY, {
        targetId: order.id,
        limit: 2,
      }).count,
    ).toBe(1)
  })

  test('runs a low-frequency random pilot against active Food Delivery orders', () => {
    const foodDeliveryStore = useFoodDeliveryStore()
    const simulationStore = useSimulationStore()
    foodDeliveryStore.resetForTesting()
    simulationStore.resetForTesting()
    const order = createOrder(foodDeliveryStore)

    expect(listFoodDeliveryRandomPilotOrders(foodDeliveryStore).map((item) => item.id)).toEqual([order.id])

    const result = runFoodDeliveryRandomOrderEventPilot({
      foodDeliveryStore,
      simulationStore,
      orderId: order.id,
      randomValue: 0,
      now: Date.now(),
    })

    expect(result).toMatchObject({
      ok: true,
      status: 'triggered',
      pilotEventId: FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
      pilotPresetId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE,
    })
    expect(result.adapterResult).toMatchObject({
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      sourceModule: 'simulation_food_delivery_random_pilot',
    })
    expect(foodDeliveryStore.orders[0]?.status).toBe(FOOD_DELIVERY_ORDER_STATUS.PLACED)
    expect(foodDeliveryStore.orders[0]?.events).toHaveLength(1)
    expect(simulationStore.isCoolingDown(FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID, { targetId: order.id })).toBe(true)
    expect(
      simulationStore.getDailyCounterState(FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID, {
        targetId: order.id,
        limit: FOOD_DELIVERY_RANDOM_PILOT_DAILY_LIMIT,
      }).count,
    ).toBe(1)
  })

  test('uses local WorldBook-aware variants for Food Delivery random pilot copy and logs metadata', () => {
    const foodDeliveryStore = useFoodDeliveryStore()
    const simulationStore = useSimulationStore()
    foodDeliveryStore.resetForTesting()
    simulationStore.resetForTesting()
    const order = createOrder(foodDeliveryStore)
    const worldContext = resolveWorldContextFromWorldBook({
      globalWorldview: '科幻城市中无人机配送需要等待低空航道。',
      knowledgePoints: [
        {
          id: 'kp_drone_lane',
          title: 'Drone lane',
          content: 'Delivery drones use low-altitude corridor control.',
          tags: ['sci_fi'],
          enabled: true,
        },
      ],
      sourceScope: 'module',
      now: Date.now(),
    })
    const variantPack = buildFoodDeliveryEventVariantPack({ worldContext, now: Date.now() })
    const variantResolution = resolveFoodDeliveryOrderEventVariant({
      presetId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE,
      worldContext,
      variantPack,
      randomValue: 0,
      now: Date.now(),
    })

    expect(variantResolution.variant).toMatchObject({
      id: 'food_delivery.eta_update.sci_fi.drone_lane.v1',
    })

    const result = runFoodDeliveryRandomOrderEventPilot({
      foodDeliveryStore,
      simulationStore,
      orderId: order.id,
      randomValue: 0,
      worldContext,
      variantPack,
      now: Date.now(),
    })

    expect(result.ok).toBe(true)
    expect(result.adapterResult.summary).toMatch(/Low-altitude corridor|Courier drone/)
    expect(simulationStore.eventLogs[0]).toMatchObject({
      eventId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE,
      variantId: 'food_delivery.eta_update.sci_fi.drone_lane.v1',
      variantPackId: variantPack.id,
      worldContextId: worldContext.id,
      activeWorldBookIds: ['kp_drone_lane'],
    })
  })

  test('respects module disable and global pilot cooldown before mutating Food Delivery', () => {
    const foodDeliveryStore = useFoodDeliveryStore()
    const simulationStore = useSimulationStore()
    foodDeliveryStore.resetForTesting()
    simulationStore.resetForTesting()
    const order = createOrder(foodDeliveryStore)

    simulationStore.setModuleEventsEnabled('food_delivery', false)
    const disabled = runFoodDeliveryRandomOrderEventPilot({
      foodDeliveryStore,
      simulationStore,
      orderId: order.id,
      randomValue: 0,
      now: Date.now(),
    })

    expect(disabled).toMatchObject({
      ok: false,
      status: 'skipped',
      reason: 'module_events_disabled',
    })
    expect(foodDeliveryStore.orders[0]?.events).toHaveLength(0)

    simulationStore.setModuleEventsEnabled('food_delivery', true)
    const first = runFoodDeliveryRandomOrderEventPilot({
      foodDeliveryStore,
      simulationStore,
      orderId: order.id,
      randomValue: 0,
      now: Date.now() + 1000,
    })
    const second = runFoodDeliveryRandomOrderEventPilot({
      foodDeliveryStore,
      simulationStore,
      orderId: order.id,
      randomValue: 0,
      now: Date.now() + 2000,
    })

    expect(first.ok).toBe(true)
    expect(second).toMatchObject({
      ok: false,
      status: 'skipped',
      reason: 'cooldown_active',
    })
    expect(foodDeliveryStore.orders[0]?.events).toHaveLength(1)
  })
})
