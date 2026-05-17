import {
  SHOPPING_ORDER_EVENT_TYPE,
  SHOPPING_ORDER_STATUS,
} from '../../../stores/shopping'
import { runEventAdapter } from '../event-engine'

export const SHOPPING_LOGISTICS_EVENT_MODULE_KEY = 'shopping'
export const SHOPPING_LOGISTICS_EVENT_ADAPTER_KEY = 'shopping.add_order_event'

export const SHOPPING_LOGISTICS_EVENT_PRESET_ID = Object.freeze({
  PACKAGE_SHIPPED: 'shopping.logistics.package_shipped.v1',
  PACKAGE_ARRIVED: 'shopping.logistics.package_arrived.v1',
  PICKUP_POINT_CHANGED: 'shopping.logistics.pickup_point_changed.v1',
  INTERNATIONAL_DELAY: 'shopping.logistics.international_delay.v1',
})

const ACTIVE_ORDER_STATUSES = Object.freeze([
  SHOPPING_ORDER_STATUS.PLACED,
])

const LOGISTICS_ACTIVE_SURFACES = Object.freeze([
  'shopping.logistics_panel',
  'chat.logistics_service',
])

const EVENT_SOURCE_MODULE = 'simulation_shopping_logistics_event_adapter'
const EVENT_ENGINE_SOURCE_MODULE = 'simulation_shopping_logistics_event_engine'

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const cloneValue = (value) => {
  if (Array.isArray(value)) return value.map((item) => cloneValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]))
  }
  return value
}

const freezeCondition = (condition) =>
  Object.freeze({
    ...condition,
    value: Array.isArray(condition.value) ? Object.freeze([...condition.value]) : condition.value,
  })

const createPreset = (preset) =>
  Object.freeze({
    ...preset,
    triggerModes: Object.freeze([...preset.triggerModes]),
    conditions: Object.freeze(preset.conditions.map((condition) => freezeCondition(condition))),
    effect: Object.freeze({ ...preset.effect }),
    surfaces: Object.freeze([...preset.surfaces]),
  })

const createShoppingLogisticsEventEffect = () =>
  Object.freeze({
    adapterKey: SHOPPING_LOGISTICS_EVENT_ADAPTER_KEY,
    payloadSchema: 'ShoppingOrderLogisticsEventInput',
  })

const createActiveOrderCondition = () =>
  Object.freeze({
    key: 'order.status',
    op: 'in',
    value: ACTIVE_ORDER_STATUSES,
  })

const SHOPPING_LOGISTICS_EVENT_PRESETS = Object.freeze([
  createPreset({
    id: SHOPPING_LOGISTICS_EVENT_PRESET_ID.PACKAGE_SHIPPED,
    moduleKey: SHOPPING_LOGISTICS_EVENT_MODULE_KEY,
    type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED,
    title: 'Package shipped',
    summary: 'The merchant has handed the parcel to a carrier.',
    triggerModes: ['manual', 'condition'],
    conditions: [createActiveOrderCondition()],
    probability: 0,
    cooldownMs: 10 * 60 * 1000,
    dailyLimit: 6,
    effect: createShoppingLogisticsEventEffect(),
    surfaces: LOGISTICS_ACTIVE_SURFACES,
  }),
  createPreset({
    id: SHOPPING_LOGISTICS_EVENT_PRESET_ID.PACKAGE_ARRIVED,
    moduleKey: SHOPPING_LOGISTICS_EVENT_MODULE_KEY,
    type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_ARRIVED,
    title: 'Package arrived',
    summary: 'The parcel is marked as arrived or ready for pickup.',
    triggerModes: ['manual', 'condition'],
    conditions: [createActiveOrderCondition()],
    probability: 0,
    cooldownMs: 10 * 60 * 1000,
    dailyLimit: 6,
    effect: createShoppingLogisticsEventEffect(),
    surfaces: LOGISTICS_ACTIVE_SURFACES,
  }),
  createPreset({
    id: SHOPPING_LOGISTICS_EVENT_PRESET_ID.PICKUP_POINT_CHANGED,
    moduleKey: SHOPPING_LOGISTICS_EVENT_MODULE_KEY,
    type: SHOPPING_ORDER_EVENT_TYPE.PICKUP_POINT_CHANGED,
    title: 'Pickup point changed',
    summary: 'The pickup point was updated by the logistics provider.',
    triggerModes: ['manual', 'condition'],
    conditions: [createActiveOrderCondition()],
    probability: 0,
    cooldownMs: 15 * 60 * 1000,
    dailyLimit: 4,
    effect: createShoppingLogisticsEventEffect(),
    surfaces: LOGISTICS_ACTIVE_SURFACES,
  }),
  createPreset({
    id: SHOPPING_LOGISTICS_EVENT_PRESET_ID.INTERNATIONAL_DELAY,
    moduleKey: SHOPPING_LOGISTICS_EVENT_MODULE_KEY,
    type: SHOPPING_ORDER_EVENT_TYPE.INTERNATIONAL_DELAY,
    title: 'International logistics delay',
    summary: 'Cross-border shipping or customs handling may delay this parcel.',
    triggerModes: ['manual', 'condition'],
    conditions: [createActiveOrderCondition()],
    probability: 0,
    cooldownMs: 6 * 60 * 60 * 1000,
    dailyLimit: 2,
    effect: createShoppingLogisticsEventEffect(),
    surfaces: LOGISTICS_ACTIVE_SURFACES,
  }),
])

export const listShoppingLogisticsEventPresets = () =>
  SHOPPING_LOGISTICS_EVENT_PRESETS.map((preset) => cloneValue(preset))

export const getShoppingLogisticsEventPreset = (presetId) => {
  const normalizedId = normalizeText(presetId, '', 140)
  if (!normalizedId) return null
  const preset = SHOPPING_LOGISTICS_EVENT_PRESETS.find((item) => item.id === normalizedId)
  return preset ? cloneValue(preset) : null
}

export const buildShoppingLogisticsEventInput = ({
  presetId,
  title,
  summary,
  trackingCode,
  carrierName,
  pickupPoint,
  locationHint,
  etaDays,
  sourceModule,
  sourceId,
  createdAt,
} = {}) => {
  const preset = getShoppingLogisticsEventPreset(presetId)
  if (!preset) return null

  const eventInput = {
    type: preset.type,
    title: normalizeText(title, preset.title, 120),
    summary: normalizeText(summary, preset.summary, 320),
    sourceModule: normalizeText(sourceModule, EVENT_SOURCE_MODULE, 80),
    sourceId: normalizeText(sourceId, preset.id, 140),
  }

  if (trackingCode !== undefined) eventInput.trackingCode = normalizeText(trackingCode, '', 120)
  if (carrierName !== undefined) eventInput.carrierName = normalizeText(carrierName, '', 120)
  if (pickupPoint !== undefined) eventInput.pickupPoint = normalizeText(pickupPoint, '', 180)
  if (locationHint !== undefined) eventInput.locationHint = normalizeText(locationHint, '', 160)
  if (etaDays !== undefined) eventInput.etaDays = etaDays
  if (createdAt !== undefined) eventInput.createdAt = createdAt

  return eventInput
}

export const triggerShoppingLogisticsOrderEvent = (
  shoppingStore,
  { orderId, presetId, ...eventInput } = {},
) => {
  if (!shoppingStore || typeof shoppingStore.addOrderEvent !== 'function') return null
  const normalizedOrderId = normalizeText(orderId, '', 140)
  if (!normalizedOrderId) return null
  const payload = buildShoppingLogisticsEventInput({ presetId, ...eventInput })
  if (!payload) return null
  return shoppingStore.addOrderEvent(normalizedOrderId, payload)
}

const findShoppingOrder = (shoppingStore, orderId) => {
  const normalizedOrderId = normalizeText(orderId, '', 140)
  if (!normalizedOrderId || !Array.isArray(shoppingStore?.orders)) return null
  return shoppingStore.orders.find((order) => order.id === normalizedOrderId) || null
}

export const buildShoppingLogisticsEventContext = (order) => {
  if (!order || typeof order !== 'object') return {}
  return {
    order: cloneValue(order),
  }
}

export const runShoppingLogisticsEventPreset = ({
  shoppingStore,
  simulationStore,
  orderId,
  presetId,
  triggerSource = 'manual',
  randomValue,
  seed,
  title,
  summary,
  trackingCode,
  carrierName,
  pickupPoint,
  locationHint,
  etaDays,
  sourceModule = EVENT_ENGINE_SOURCE_MODULE,
  variant,
  variantPack,
  worldContext,
  now = Date.now(),
} = {}) => {
  const preset = getShoppingLogisticsEventPreset(presetId)
  if (!preset) {
    return {
      ok: false,
      status: 'failed',
      evaluation: null,
      adapterResult: null,
      log: null,
      reason: 'preset_missing',
    }
  }

  const normalizedOrderId = normalizeText(orderId, '', 140)
  const order = findShoppingOrder(shoppingStore, normalizedOrderId)
  if (!order) {
    const logInput = {
      eventId: preset.id,
      moduleKey: preset.moduleKey,
      targetId: normalizedOrderId,
      adapterKey: preset.effect?.adapterKey || SHOPPING_LOGISTICS_EVENT_ADAPTER_KEY,
      triggerSource,
      status: 'failed',
      reason: 'order_missing',
      at: now,
    }
    const log = simulationStore?.recordEventLog?.(logInput) || logInput
    return {
      ok: false,
      status: 'failed',
      evaluation: null,
      adapterResult: null,
      log,
      reason: 'order_missing',
    }
  }

  return runEventAdapter({
    template: preset,
    context: buildShoppingLogisticsEventContext(order),
    adapters: {
      [SHOPPING_LOGISTICS_EVENT_ADAPTER_KEY]: () =>
        triggerShoppingLogisticsOrderEvent(shoppingStore, {
          orderId: normalizedOrderId,
          presetId: preset.id,
          title,
          summary,
          trackingCode,
          carrierName,
          pickupPoint,
          locationHint,
          etaDays,
          sourceModule,
          sourceId: preset.id,
          createdAt: now,
        }),
    },
    triggerSource,
    randomValue,
    seed,
    targetId: normalizedOrderId,
    now,
    simulationStore,
    variant,
    variantPack,
    worldContext,
  })
}
