import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  SHOPPING_ORDER_EVENT_TYPE,
  SHOPPING_ORDER_STATUS,
  useShoppingStore,
} from '../src/stores/shopping'
import { useSimulationStore } from '../src/stores/simulation'
import {
  SHOPPING_LOGISTICS_EVENT_ADAPTER_KEY,
  SHOPPING_LOGISTICS_EVENT_PRESET_ID,
  buildShoppingLogisticsEventInput,
  getShoppingLogisticsEventPreset,
  listShoppingLogisticsEventPresets,
  runShoppingLogisticsEventPreset,
  triggerShoppingLogisticsOrderEvent,
} from '../src/lib/simulation/adapters/shopping-logistics-events'

const createOrder = (store) => {
  const product = store.upsertProduct({
    id: 'shopping_logistics_adapter_item',
    title: 'Adapter Parcel',
    category: 'digital',
    serviceKey: 'nova_digital',
    price: '128.00',
  })
  store.addToCart(product.id)
  return store.checkoutCart({
    note: 'Logistics adapter order.',
    recipient: 'Adapter User',
  })
}

describe('shopping logistics event adapter', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('exposes reusable manual presets for Shopping logistics events', () => {
    const presets = listShoppingLogisticsEventPresets()

    expect(presets.map((preset) => preset.id)).toEqual([
      SHOPPING_LOGISTICS_EVENT_PRESET_ID.PACKAGE_SHIPPED,
      SHOPPING_LOGISTICS_EVENT_PRESET_ID.PACKAGE_ARRIVED,
      SHOPPING_LOGISTICS_EVENT_PRESET_ID.PICKUP_POINT_CHANGED,
      SHOPPING_LOGISTICS_EVENT_PRESET_ID.INTERNATIONAL_DELAY,
    ])
    expect(presets.map((preset) => preset.type)).toEqual([
      SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED,
      SHOPPING_ORDER_EVENT_TYPE.PACKAGE_ARRIVED,
      SHOPPING_ORDER_EVENT_TYPE.PICKUP_POINT_CHANGED,
      SHOPPING_ORDER_EVENT_TYPE.INTERNATIONAL_DELAY,
    ])
    expect(presets.every((preset) => preset.moduleKey === 'shopping')).toBe(true)
    expect(presets.every((preset) => preset.effect.adapterKey === SHOPPING_LOGISTICS_EVENT_ADAPTER_KEY)).toBe(true)
    expect(presets.every((preset) => preset.triggerModes.includes('manual'))).toBe(true)
    expect(presets.some((preset) => preset.triggerModes.includes('random'))).toBe(false)
    expect(presets.every((preset) => preset.surfaces.includes('chat.logistics_service'))).toBe(true)
  })

  test('builds logistics payloads from presets without touching store state', () => {
    const payload = buildShoppingLogisticsEventInput({
      presetId: SHOPPING_LOGISTICS_EVENT_PRESET_ID.PICKUP_POINT_CHANGED,
      pickupPoint: 'Locker A-12',
      carrierName: 'Standard Courier',
      trackingCode: 'TRACK-ADAPTER-01',
      etaDays: 3,
      sourceModule: 'test_event_runner',
      sourceId: 'pickup_point_test',
      createdAt: Date.now(),
    })

    expect(payload).toMatchObject({
      type: SHOPPING_ORDER_EVENT_TYPE.PICKUP_POINT_CHANGED,
      title: 'Pickup point changed',
      pickupPoint: 'Locker A-12',
      carrierName: 'Standard Courier',
      trackingCode: 'TRACK-ADAPTER-01',
      etaDays: 3,
      sourceModule: 'test_event_runner',
      sourceId: 'pickup_point_test',
      createdAt: Date.now(),
    })
    expect(buildShoppingLogisticsEventInput({ presetId: 'missing' })).toBeNull()
  })

  test('triggers Shopping-owned logistics events through the adapter seam', () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const order = createOrder(store)

    const event = triggerShoppingLogisticsOrderEvent(store, {
      orderId: order.id,
      presetId: SHOPPING_LOGISTICS_EVENT_PRESET_ID.PACKAGE_SHIPPED,
      summary: 'Carrier accepted the parcel.',
      carrierName: 'Standard Courier',
      trackingCode: 'TRACK-SHIP-01',
    })

    expect(event).toMatchObject({
      type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED,
      summary: 'Carrier accepted the parcel.',
      carrierName: 'Standard Courier',
      trackingCode: 'TRACK-SHIP-01',
      sourceModule: 'simulation_shopping_logistics_event_adapter',
      sourceId: SHOPPING_LOGISTICS_EVENT_PRESET_ID.PACKAGE_SHIPPED,
    })
    expect(store.orders[0]?.events[0]).toMatchObject({
      id: event.id,
      type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED,
    })
    expect(store.orders[0]?.status).toBe(SHOPPING_ORDER_STATUS.PLACED)
  })

  test('returns null for missing store, order, or preset inputs', () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const order = createOrder(store)

    expect(triggerShoppingLogisticsOrderEvent(null, { orderId: order.id })).toBeNull()
    expect(
      triggerShoppingLogisticsOrderEvent(store, {
        orderId: '',
        presetId: SHOPPING_LOGISTICS_EVENT_PRESET_ID.PACKAGE_SHIPPED,
      }),
    ).toBeNull()
    expect(
      triggerShoppingLogisticsOrderEvent(store, {
        orderId: order.id,
        presetId: 'missing',
      }),
    ).toBeNull()
    expect(getShoppingLogisticsEventPreset('missing')).toBeNull()
  })

  test('runs Shopping logistics presets through the shared event engine seam', () => {
    const shoppingStore = useShoppingStore()
    const simulationStore = useSimulationStore()
    shoppingStore.resetForTesting()
    simulationStore.resetForTesting()
    const order = createOrder(shoppingStore)

    const randomSkipped = runShoppingLogisticsEventPreset({
      shoppingStore,
      simulationStore,
      orderId: order.id,
      presetId: SHOPPING_LOGISTICS_EVENT_PRESET_ID.INTERNATIONAL_DELAY,
      triggerSource: 'random',
      randomValue: 0,
      now: Date.now(),
    })
    expect(randomSkipped).toMatchObject({
      ok: false,
      status: 'skipped',
    })
    expect(shoppingStore.orders[0]?.events).toHaveLength(0)
    expect(simulationStore.eventLogs[0]).toMatchObject({
      eventId: SHOPPING_LOGISTICS_EVENT_PRESET_ID.INTERNATIONAL_DELAY,
      status: 'skipped',
      reason: 'trigger_source_not_allowed',
    })

    const manualTriggered = runShoppingLogisticsEventPreset({
      shoppingStore,
      simulationStore,
      orderId: order.id,
      presetId: SHOPPING_LOGISTICS_EVENT_PRESET_ID.INTERNATIONAL_DELAY,
      triggerSource: 'manual',
      summary: 'Customs inspection added two days.',
      locationHint: 'Customs hub',
      etaDays: 2,
      now: Date.now(),
    })

    expect(manualTriggered).toMatchObject({
      ok: true,
      status: 'triggered',
    })
    expect(manualTriggered.adapterResult).toMatchObject({
      type: SHOPPING_ORDER_EVENT_TYPE.INTERNATIONAL_DELAY,
      summary: 'Customs inspection added two days.',
      locationHint: 'Customs hub',
      etaDays: 2,
      sourceModule: 'simulation_shopping_logistics_event_engine',
    })
    expect(shoppingStore.orders[0]?.events[0]).toMatchObject({
      id: manualTriggered.adapterResult.id,
      type: SHOPPING_ORDER_EVENT_TYPE.INTERNATIONAL_DELAY,
    })
    expect(shoppingStore.orders[0]?.status).toBe(SHOPPING_ORDER_STATUS.PLACED)
    expect(
      simulationStore.isCoolingDown(SHOPPING_LOGISTICS_EVENT_PRESET_ID.INTERNATIONAL_DELAY, {
        targetId: order.id,
      }),
    ).toBe(true)
    expect(
      simulationStore.getDailyCounterState(SHOPPING_LOGISTICS_EVENT_PRESET_ID.INTERNATIONAL_DELAY, {
        targetId: order.id,
        limit: 2,
      }).count,
    ).toBe(1)
  })

  test('records a failed engine log when the target order is missing', () => {
    const shoppingStore = useShoppingStore()
    const simulationStore = useSimulationStore()
    shoppingStore.resetForTesting()
    simulationStore.resetForTesting()

    const result = runShoppingLogisticsEventPreset({
      shoppingStore,
      simulationStore,
      orderId: 'missing_order',
      presetId: SHOPPING_LOGISTICS_EVENT_PRESET_ID.PACKAGE_ARRIVED,
      triggerSource: 'manual',
      now: Date.now(),
    })

    expect(result).toMatchObject({
      ok: false,
      status: 'failed',
      reason: 'order_missing',
    })
    expect(simulationStore.eventLogs[0]).toMatchObject({
      eventId: SHOPPING_LOGISTICS_EVENT_PRESET_ID.PACKAGE_ARRIVED,
      targetId: 'missing_order',
      status: 'failed',
      reason: 'order_missing',
    })
  })
})
