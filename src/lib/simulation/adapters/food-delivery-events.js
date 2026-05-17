import {
  FOOD_DELIVERY_ORDER_EVENT_TYPE,
  FOOD_DELIVERY_ORDER_STATUS,
} from '../../../stores/foodDelivery'
import { runEventAdapter } from '../event-engine'
import {
  createBuiltInVariantPack,
  renderEventVariantCopy,
  selectEventVariant,
} from '../event-variants'
import { WORLD_CONTEXT_FAMILY, normalizeWorldContext } from '../world-context'

export const FOOD_DELIVERY_EVENT_MODULE_KEY = 'food_delivery'
export const FOOD_DELIVERY_EVENT_ADAPTER_KEY = 'food_delivery.add_order_event'
export const FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID = 'food_delivery.random_order_pilot.v1'
export const FOOD_DELIVERY_RANDOM_PILOT_COOLDOWN_MS = 15 * 60 * 1000
export const FOOD_DELIVERY_RANDOM_PILOT_DAILY_LIMIT = 3

export const FOOD_DELIVERY_ORDER_EVENT_PRESET_ID = Object.freeze({
  RIDER_DELAY: 'food_delivery.rider_delay.v1',
  RESTAURANT_CANCELLED: 'food_delivery.restaurant_cancelled.v1',
  ADDRESS_CHANGE: 'food_delivery.address_change.v1',
  ETA_UPDATE: 'food_delivery.eta_update.v1',
  STATUS_UPDATE: 'food_delivery.status_update.v1',
})

const ACTIVE_ORDER_STATUSES = Object.freeze([
  FOOD_DELIVERY_ORDER_STATUS.PLACED,
  FOOD_DELIVERY_ORDER_STATUS.ACCEPTED,
  FOOD_DELIVERY_ORDER_STATUS.COOKING,
  FOOD_DELIVERY_ORDER_STATUS.RIDER_PICKUP,
])

const DELIVERY_ACTIVE_SURFACES = Object.freeze([
  'food_delivery.order_card',
  'chat.food_delivery_service',
])

const EVENT_SOURCE_MODULE = 'simulation_food_delivery_event_adapter'
const EVENT_ENGINE_SOURCE_MODULE = 'simulation_food_delivery_event_engine'
const EVENT_RANDOM_PILOT_SOURCE_MODULE = 'simulation_food_delivery_random_pilot'

export const FOOD_DELIVERY_RANDOM_PILOT_PRESET_IDS = Object.freeze([
  FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE,
  FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
])

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

const createDayKey = (at = Date.now()) => {
  const date = new Date(Number.isFinite(Number(at)) ? Number(at) : Date.now())
  if (Number.isNaN(date.getTime())) return new Date(0).toISOString().slice(0, 10)
  return date.toISOString().slice(0, 10)
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

const createFoodDeliveryEventEffect = () =>
  Object.freeze({
    adapterKey: FOOD_DELIVERY_EVENT_ADAPTER_KEY,
    payloadSchema: 'FoodDeliveryOrderEventInput',
  })

const createActiveOrderCondition = () =>
  Object.freeze({
    key: 'order.status',
    op: 'in',
    value: ACTIVE_ORDER_STATUSES,
  })

const isActiveFoodDeliveryOrder = (order) =>
  Boolean(order?.id && ACTIVE_ORDER_STATUSES.includes(order.status))

const createVariant = ({
  id,
  templateId,
  worldScope,
  title,
  summaryTemplates,
  detailTemplates = [],
  impactLevel = 'non_destructive',
} = {}) =>
  Object.freeze({
    id,
    templateId,
    worldScope: Object.freeze(worldScope),
    title,
    summaryTemplates: Object.freeze(summaryTemplates),
    detailTemplates: Object.freeze(detailTemplates),
    payloadHints: Object.freeze({
      eventType: templateId,
      severity: 'soft_update',
    }),
    probabilityMultiplier: 1,
    cooldownMultiplier: 1,
    impactLevel,
    reversible: true,
    requiresUserConfirmation: false,
    safetyTags: Object.freeze(['no_data_loss', 'explainable']),
    locale: 'zh-CN',
  })

const FOOD_DELIVERY_ORDER_EVENT_PRESETS = Object.freeze([
  createPreset({
    id: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
    moduleKey: FOOD_DELIVERY_EVENT_MODULE_KEY,
    type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
    title: 'Rider delay',
    summary: 'Courier route slowed down; ETA may move later.',
    triggerModes: ['manual', 'condition', 'random'],
    conditions: [createActiveOrderCondition()],
    probability: 0.18,
    cooldownMs: 30 * 60 * 1000,
    dailyLimit: 2,
    effect: createFoodDeliveryEventEffect(),
    surfaces: DELIVERY_ACTIVE_SURFACES,
  }),
  createPreset({
    id: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RESTAURANT_CANCELLED,
    moduleKey: FOOD_DELIVERY_EVENT_MODULE_KEY,
    type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RESTAURANT_CANCELLED,
    title: 'Restaurant cancelled',
    summary: 'Restaurant cannot continue this order.',
    triggerModes: ['manual', 'condition', 'random'],
    conditions: [createActiveOrderCondition()],
    probability: 0.04,
    cooldownMs: 12 * 60 * 60 * 1000,
    dailyLimit: 1,
    effect: createFoodDeliveryEventEffect(),
    surfaces: DELIVERY_ACTIVE_SURFACES,
  }),
  createPreset({
    id: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ADDRESS_CHANGE,
    moduleKey: FOOD_DELIVERY_EVENT_MODULE_KEY,
    type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ADDRESS_CHANGE,
    title: 'Address changed',
    summary: 'Delivery address was updated for this order.',
    triggerModes: ['manual', 'condition'],
    conditions: [createActiveOrderCondition()],
    probability: 0,
    cooldownMs: 10 * 60 * 1000,
    dailyLimit: 4,
    effect: createFoodDeliveryEventEffect(),
    surfaces: DELIVERY_ACTIVE_SURFACES,
  }),
  createPreset({
    id: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE,
    moduleKey: FOOD_DELIVERY_EVENT_MODULE_KEY,
    type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
    title: 'ETA updated',
    summary: 'Estimated arrival time changed.',
    triggerModes: ['manual', 'condition', 'random'],
    conditions: [createActiveOrderCondition()],
    probability: 0.24,
    cooldownMs: 20 * 60 * 1000,
    dailyLimit: 3,
    effect: createFoodDeliveryEventEffect(),
    surfaces: DELIVERY_ACTIVE_SURFACES,
  }),
  createPreset({
    id: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.STATUS_UPDATE,
    moduleKey: FOOD_DELIVERY_EVENT_MODULE_KEY,
    type: FOOD_DELIVERY_ORDER_EVENT_TYPE.STATUS_UPDATE,
    title: 'Status updated',
    summary: 'Order status changed.',
    triggerModes: ['manual', 'condition'],
    conditions: [createActiveOrderCondition()],
    probability: 0,
    cooldownMs: 5 * 60 * 1000,
    dailyLimit: 8,
    effect: createFoodDeliveryEventEffect(),
    surfaces: DELIVERY_ACTIVE_SURFACES,
  }),
])

const FOOD_DELIVERY_BUILT_IN_VARIANTS = Object.freeze({
  [FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE]: Object.freeze([
    createVariant({
      id: 'food_delivery.eta_update.daily.route_conditions.v1',
      templateId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE,
      worldScope: [WORLD_CONTEXT_FAMILY.DAILY],
      title: 'ETA updated',
      summaryTemplates: [
        'Route conditions changed near {timeHint}; ETA is now about {etaMinutes} minutes.',
        'Courier navigation refreshed near {timeHint}; estimated arrival moved to {etaMinutes} minutes.',
      ],
    }),
    createVariant({
      id: 'food_delivery.eta_update.sci_fi.drone_lane.v1',
      templateId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE,
      worldScope: [WORLD_CONTEXT_FAMILY.SCI_FI],
      title: 'Air-lane ETA recalculated',
      summaryTemplates: [
        'Low-altitude corridor control refreshed the route near {timeHint}; delivery ETA is now {etaMinutes} minutes.',
        'Courier drone navigation synced with city traffic AI near {timeHint}; ETA recalculated to {etaMinutes} minutes.',
      ],
    }),
    createVariant({
      id: 'food_delivery.eta_update.apocalypse.checkpoint.v1',
      templateId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE,
      worldScope: [WORLD_CONTEXT_FAMILY.APOCALYPSE],
      title: 'Checkpoint ETA changed',
      summaryTemplates: [
        'Supply route checkpoint traffic shifted near {timeHint}; courier ETA is now about {etaMinutes} minutes.',
        'The delivery runner rerouted around a blocked street near {timeHint}; arrival is now estimated at {etaMinutes} minutes.',
      ],
    }),
  ]),
  [FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY]: Object.freeze([
    createVariant({
      id: 'food_delivery.rider_delay.daily.traffic.v1',
      templateId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
      worldScope: [WORLD_CONTEXT_FAMILY.DAILY],
      title: 'Rider delay',
      summaryTemplates: [
        'Courier route slowed near {timeHint}; ETA may move to {etaMinutes} minutes.',
        'The rider hit local traffic near {timeHint}; estimated arrival is now around {etaMinutes} minutes.',
      ],
    }),
    createVariant({
      id: 'food_delivery.rider_delay.sci_fi.corridor_queue.v1',
      templateId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
      worldScope: [WORLD_CONTEXT_FAMILY.SCI_FI],
      title: 'Drone corridor queue',
      summaryTemplates: [
        'The delivery drone entered a low-altitude corridor queue near {timeHint}; ETA may move to {etaMinutes} minutes.',
        'City dispatch AI slowed the courier lane near {timeHint}; the order is still moving, now about {etaMinutes} minutes out.',
      ],
    }),
    createVariant({
      id: 'food_delivery.rider_delay.apocalypse.supply_route.v1',
      templateId: FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY,
      worldScope: [WORLD_CONTEXT_FAMILY.APOCALYPSE],
      title: 'Runner route delayed',
      summaryTemplates: [
        'The delivery runner paused near a checkpoint at {timeHint}; ETA may move to {etaMinutes} minutes.',
        'A supply patrol slowed the food runner near {timeHint}; arrival is now roughly {etaMinutes} minutes out.',
      ],
    }),
  ]),
})

export const listFoodDeliveryOrderEventPresets = () =>
  FOOD_DELIVERY_ORDER_EVENT_PRESETS.map((preset) => cloneValue(preset))

export const listFoodDeliveryRandomPilotPresets = () =>
  FOOD_DELIVERY_RANDOM_PILOT_PRESET_IDS.map((presetId) =>
    FOOD_DELIVERY_ORDER_EVENT_PRESETS.find((preset) => preset.id === presetId),
  )
    .filter(Boolean)
    .map((preset) => cloneValue(preset))

export const getFoodDeliveryOrderEventPreset = (presetId) => {
  const normalizedId = normalizeText(presetId, '', 120)
  if (!normalizedId) return null
  const preset = FOOD_DELIVERY_ORDER_EVENT_PRESETS.find((item) => item.id === normalizedId)
  return preset ? cloneValue(preset) : null
}

export const buildFoodDeliveryOrderEventInput = ({
  presetId,
  title,
  summary,
  etaMinutes,
  deliveryAddress,
  sourceModule,
  sourceId,
  createdAt,
} = {}) => {
  const preset = getFoodDeliveryOrderEventPreset(presetId)
  if (!preset) return null

  const eventInput = {
    type: preset.type,
    title: normalizeText(title, preset.title, 120),
    summary: normalizeText(summary, preset.summary, 280),
    sourceModule: normalizeText(sourceModule, EVENT_SOURCE_MODULE, 80),
    sourceId: normalizeText(sourceId, preset.id, 140),
  }

  if (etaMinutes !== undefined) eventInput.etaMinutes = etaMinutes
  if (deliveryAddress !== undefined) {
    eventInput.deliveryAddress = normalizeText(deliveryAddress, '', 160)
  }
  if (createdAt !== undefined) eventInput.createdAt = createdAt

  return eventInput
}

export const triggerFoodDeliveryOrderEvent = (foodDeliveryStore, { orderId, presetId, ...eventInput } = {}) => {
  if (!foodDeliveryStore || typeof foodDeliveryStore.addOrderEvent !== 'function') return null
  const normalizedOrderId = normalizeText(orderId, '', 140)
  if (!normalizedOrderId) return null
  const payload = buildFoodDeliveryOrderEventInput({ presetId, ...eventInput })
  if (!payload) return null
  return foodDeliveryStore.addOrderEvent(normalizedOrderId, payload)
}

const findFoodDeliveryOrder = (foodDeliveryStore, orderId) => {
  const normalizedOrderId = normalizeText(orderId, '', 140)
  if (!normalizedOrderId || !Array.isArray(foodDeliveryStore?.orders)) return null
  return foodDeliveryStore.orders.find((order) => order.id === normalizedOrderId) || null
}

export const listFoodDeliveryRandomPilotOrders = (foodDeliveryStore) => {
  if (!Array.isArray(foodDeliveryStore?.orders)) return []
  return foodDeliveryStore.orders.filter((order) => isActiveFoodDeliveryOrder(order)).map((order) => cloneValue(order))
}

const findFoodDeliveryRandomPilotOrder = (foodDeliveryStore, orderId) => {
  const normalizedOrderId = normalizeText(orderId, '', 140)
  if (normalizedOrderId) {
    const order = findFoodDeliveryOrder(foodDeliveryStore, normalizedOrderId)
    return isActiveFoodDeliveryOrder(order) ? order : null
  }
  if (!Array.isArray(foodDeliveryStore?.orders)) return null
  return foodDeliveryStore.orders.find((order) => isActiveFoodDeliveryOrder(order)) || null
}

export const buildFoodDeliveryOrderEventContext = (order) => {
  if (!order || typeof order !== 'object') return {}
  return {
    order: cloneValue(order),
  }
}

export const buildFoodDeliveryEventVariantPack = ({ worldContext, now = Date.now() } = {}) => {
  const normalizedWorldContext = normalizeWorldContext(worldContext)
  return createBuiltInVariantPack({
    worldContext: normalizedWorldContext,
    moduleKeys: [FOOD_DELIVERY_EVENT_MODULE_KEY],
    variantsByTemplateId: FOOD_DELIVERY_BUILT_IN_VARIANTS,
    now,
  })
}

export const resolveFoodDeliveryOrderEventVariant = ({
  presetId,
  worldContext,
  variantPack,
  seed,
  randomValue,
  now = Date.now(),
} = {}) => {
  const normalizedWorldContext = normalizeWorldContext(worldContext)
  const pack = variantPack || buildFoodDeliveryEventVariantPack({
    worldContext: normalizedWorldContext,
    now,
  })
  return {
    ...selectEventVariant({
      templateId: presetId,
      variantPack: pack,
      worldContext: normalizedWorldContext,
      seed,
      randomValue,
    }),
    variantPack: pack,
    worldContext: normalizedWorldContext,
  }
}

export const buildFoodDeliveryRandomPilotEventInput = ({
  presetId,
  order,
  now = Date.now(),
  variant,
  seed,
  randomValue,
} = {}) => {
  const preset = getFoodDeliveryOrderEventPreset(presetId)
  if (!preset || !order) return {}
  const baseEtaMinutes = Math.max(10, Number(order.etaMinutes || order.deliveryEtaMinutes || 30) || 30)
  const minuteOffset = preset.id === FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY ? 12 : 6
  const etaMinutes = Math.min(240, baseEtaMinutes + minuteOffset)
  const timeHint = new Date(Number.isFinite(Number(now)) ? Number(now) : Date.now())
    .toISOString()
    .slice(11, 16)
  const variantCopy = variant
    ? renderEventVariantCopy(
        variant,
        {
          etaMinutes,
          timeHint,
        },
        {
          seed,
          randomValue,
        },
      )
    : null
  if (variantCopy?.title || variantCopy?.summary) {
    return {
      title: variantCopy.title || preset.title,
      summary: variantCopy.summary || preset.summary,
      etaMinutes,
    }
  }

  if (preset.id === FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.RIDER_DELAY) {
    return {
      title: preset.title,
      summary: `Courier route slowed near ${timeHint}; ETA may move to ${etaMinutes} minutes.`,
      etaMinutes,
    }
  }

  if (preset.id === FOOD_DELIVERY_ORDER_EVENT_PRESET_ID.ETA_UPDATE) {
    return {
      title: preset.title,
      summary: `Route conditions changed near ${timeHint}; ETA is now about ${etaMinutes} minutes.`,
      etaMinutes,
    }
  }

  return {
    title: preset.title,
    summary: preset.summary,
  }
}

const createRandomPilotLog = ({
  simulationStore,
  targetId = '',
  triggerSource = 'random',
  status = 'skipped',
  reason = '',
  now = Date.now(),
} = {}) => {
  const logInput = {
    eventId: FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
    moduleKey: FOOD_DELIVERY_EVENT_MODULE_KEY,
    targetId: normalizeText(targetId, '', 140),
    adapterKey: FOOD_DELIVERY_EVENT_ADAPTER_KEY,
    triggerSource,
    status,
    reason,
    at: now,
  }
  return simulationStore?.recordEventLog?.(logInput) || logInput
}

export const runFoodDeliveryOrderEventPreset = ({
  foodDeliveryStore,
  simulationStore,
  orderId,
  presetId,
  triggerSource = 'manual',
  randomValue,
  seed,
  title,
  summary,
  etaMinutes,
  deliveryAddress,
  sourceModule = EVENT_ENGINE_SOURCE_MODULE,
  variant,
  variantPack,
  worldContext,
  now = Date.now(),
} = {}) => {
  const preset = getFoodDeliveryOrderEventPreset(presetId)
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
  const order = findFoodDeliveryOrder(foodDeliveryStore, normalizedOrderId)
  if (!order) {
    const logInput = {
      eventId: preset.id,
      moduleKey: preset.moduleKey,
      targetId: normalizedOrderId,
      adapterKey: preset.effect?.adapterKey || FOOD_DELIVERY_EVENT_ADAPTER_KEY,
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
    context: buildFoodDeliveryOrderEventContext(order),
    adapters: {
      [FOOD_DELIVERY_EVENT_ADAPTER_KEY]: () =>
        triggerFoodDeliveryOrderEvent(foodDeliveryStore, {
          orderId: normalizedOrderId,
          presetId: preset.id,
          title,
          summary,
          etaMinutes,
          deliveryAddress,
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

export const runFoodDeliveryRandomOrderEventPilot = ({
  foodDeliveryStore,
  simulationStore,
  orderId = '',
  triggerSource = 'random',
  randomValue,
  seed,
  now = Date.now(),
  presetIds = FOOD_DELIVERY_RANDOM_PILOT_PRESET_IDS,
  worldContext,
  variantPack,
} = {}) => {
  const order = findFoodDeliveryRandomPilotOrder(foodDeliveryStore, orderId)
  const targetId = normalizeText(order?.id || orderId, '', 140)

  if (!order) {
    const log = createRandomPilotLog({
      simulationStore,
      targetId,
      triggerSource,
      status: 'skipped',
      reason: 'no_active_order',
      now,
    })
    return {
      ok: false,
      status: 'skipped',
      evaluation: null,
      adapterResult: null,
      log,
      reason: 'no_active_order',
    }
  }

  if (simulationStore?.isModuleEventsEnabled?.(FOOD_DELIVERY_EVENT_MODULE_KEY) === false) {
    const log = createRandomPilotLog({
      simulationStore,
      targetId,
      triggerSource,
      status: 'skipped',
      reason: 'module_events_disabled',
      now,
    })
    return {
      ok: false,
      status: 'skipped',
      evaluation: null,
      adapterResult: null,
      log,
      reason: 'module_events_disabled',
    }
  }

  if (simulationStore?.isCoolingDown?.(FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID, { targetId, at: now })) {
    const log = createRandomPilotLog({
      simulationStore,
      targetId,
      triggerSource,
      status: 'skipped',
      reason: 'cooldown_active',
      now,
    })
    return {
      ok: false,
      status: 'skipped',
      evaluation: null,
      adapterResult: null,
      log,
      reason: 'cooldown_active',
    }
  }

  if (
    simulationStore?.canUseDailyQuota &&
    !simulationStore.canUseDailyQuota(FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID, {
      targetId,
      dayKey: createDayKey(now),
      limit: FOOD_DELIVERY_RANDOM_PILOT_DAILY_LIMIT,
    })
  ) {
    const log = createRandomPilotLog({
      simulationStore,
      targetId,
      triggerSource,
      status: 'skipped',
      reason: 'daily_limit_reached',
      now,
    })
    return {
      ok: false,
      status: 'skipped',
      evaluation: null,
      adapterResult: null,
      log,
      reason: 'daily_limit_reached',
    }
  }

  const safePresetIds = (Array.isArray(presetIds) ? presetIds : [])
    .map((presetId) => normalizeText(presetId, '', 120))
    .filter((presetId) => FOOD_DELIVERY_RANDOM_PILOT_PRESET_IDS.includes(presetId))

  if (safePresetIds.length === 0) {
    const log = createRandomPilotLog({
      simulationStore,
      targetId,
      triggerSource,
      status: 'skipped',
      reason: 'no_safe_preset',
      now,
    })
    return {
      ok: false,
      status: 'skipped',
      evaluation: null,
      adapterResult: null,
      log,
      reason: 'no_safe_preset',
    }
  }

  let lastResult = null
  for (const presetId of safePresetIds) {
    const pilotSeed = seed === undefined || seed === null ? undefined : `${seed}:${presetId}:${targetId}`
    const variantResolution = resolveFoodDeliveryOrderEventVariant({
      presetId,
      worldContext,
      variantPack,
      seed: pilotSeed,
      now,
    })
    const eventInput = buildFoodDeliveryRandomPilotEventInput({
      presetId,
      order,
      now,
      variant: variantResolution.variant,
      seed: pilotSeed,
    })
    const result = runFoodDeliveryOrderEventPreset({
      foodDeliveryStore,
      simulationStore,
      orderId: targetId,
      presetId,
      triggerSource,
      randomValue,
      seed: pilotSeed,
      sourceModule: EVENT_RANDOM_PILOT_SOURCE_MODULE,
      now,
      variant: variantResolution.variant,
      variantPack: variantResolution.variantPack,
      worldContext: variantResolution.worldContext,
      ...eventInput,
    })
    lastResult = result
    if (result.ok) {
      simulationStore?.markCooldown?.({
        eventId: FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
        targetId,
        cooldownMs: FOOD_DELIVERY_RANDOM_PILOT_COOLDOWN_MS,
        at: now,
      })
      simulationStore?.incrementDailyCounter?.({
        eventId: FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
        targetId,
        dayKey: createDayKey(now),
        limit: FOOD_DELIVERY_RANDOM_PILOT_DAILY_LIMIT,
        at: now,
      })
      return {
        ...result,
        pilotEventId: FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
        pilotPresetId: presetId,
      }
    }
  }

  return {
    ...(lastResult || {
      ok: false,
      status: 'skipped',
      evaluation: null,
      adapterResult: null,
      log: null,
    }),
    reason: lastResult?.reason || lastResult?.evaluation?.reason || lastResult?.log?.reason || 'no_event_triggered',
    pilotEventId: FOOD_DELIVERY_RANDOM_PILOT_EVENT_ID,
  }
}
