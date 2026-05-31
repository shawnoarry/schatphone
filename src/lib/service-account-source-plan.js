import {
  FOOD_DELIVERY_SOURCE_KEYS,
  SHOPPING_SOURCE_KEYS,
} from './planned-module-registry'

export const SERVICE_ACCOUNT_SOURCE_PLAN_VERSION = 1

export const SERVICE_ACCOUNT_SOURCE_PLAN_STATUS = Object.freeze({
  READY: 'ready',
  AVAILABLE_AFTER_JOIN: 'available_after_join',
  NOT_CONNECTED: 'not_connected',
})

const SOURCE_BINDING_DEFINITIONS = Object.freeze({
  shoppingServiceKey: Object.freeze({
    id: 'shopping_orders',
    moduleKey: 'shopping',
    sourceModule: SHOPPING_SOURCE_KEYS.ORDER_UPDATE,
    label: 'Shopping orders',
    detail: 'Shopping pushes checkout and order-status updates into this service thread.',
    scheduleLabel: 'Event-driven by Shopping orders',
    trigger: 'checkout_or_order_status',
    notificationKinds: Object.freeze(['shopping_order']),
    route: '/shopping',
  }),
  logisticsServiceKey: Object.freeze({
    id: 'shopping_logistics',
    moduleKey: 'logistics',
    sourceModule: SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING,
    label: 'Logistics tracking',
    detail: 'Shopping logistics events push tracking milestones into this service thread.',
    scheduleLabel: 'Event-driven by tracking milestones',
    trigger: 'logistics_tracking_event',
    notificationKinds: Object.freeze(['logistics_update']),
    route: '/shopping?category=logistics',
  }),
  foodDeliveryServiceKey: Object.freeze({
    id: 'food_delivery_orders',
    moduleKey: 'food_delivery',
    sourceModule: FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH,
    label: 'Food Delivery orders',
    detail: 'Food Delivery pushes order and courier events into this service thread.',
    scheduleLabel: 'Event-driven by Food Delivery orders',
    trigger: 'food_delivery_order_or_event',
    notificationKinds: Object.freeze(['food_delivery_order', 'food_delivery_update']),
    route: '/food-delivery',
  }),
})

const normalizeText = (value, fallback = '', maxLength = 160) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return fallback
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

const normalizeBindings = (source = {}) => {
  const bindings =
    source.sourceBindings && typeof source.sourceBindings === 'object'
      ? source.sourceBindings
      : source

  return {
    shoppingServiceKey: normalizeText(bindings.shoppingServiceKey, '', 80),
    logisticsServiceKey: normalizeText(bindings.logisticsServiceKey, '', 80),
    foodDeliveryServiceKey: normalizeText(bindings.foodDeliveryServiceKey, '', 80),
  }
}

const normalizeOrigin = (source = {}) => {
  const origin = source.origin && typeof source.origin === 'object' ? source.origin : source
  return {
    worldPackId: normalizeText(origin.worldPackId, '', 120),
    worldServiceTemplateId: normalizeText(origin.worldServiceTemplateId, '', 120),
    worldAppBindingId: normalizeText(origin.worldAppBindingId, '', 120),
  }
}

const normalizeSubscriptionState = (value) => {
  const state = normalizeText(value, 'joined', 40)
  return state === 'available' || state === 'not_joined' ? 'available' : 'joined'
}

const buildPlanRow = ({ bindingKey, serviceKey, subscriptionState }) => {
  const definition = SOURCE_BINDING_DEFINITIONS[bindingKey]
  if (!definition || !serviceKey) return null
  const joined = subscriptionState === 'joined'
  return {
    id: definition.id,
    moduleKey: definition.moduleKey,
    sourceModule: definition.sourceModule,
    serviceBindingKey: bindingKey,
    serviceKey,
    label: definition.label,
    detail: definition.detail,
    scheduleLabel: definition.scheduleLabel,
    trigger: definition.trigger,
    schedule: {
      mode: 'event_driven',
      owner: 'source_module',
      trigger: definition.trigger,
      autoCreatesSubscription: false,
      autoCreatesSourceRecords: false,
      readyAfterUserJoin: true,
    },
    notificationKinds: [...definition.notificationKinds],
    route: definition.route,
    status: joined
      ? SERVICE_ACCOUNT_SOURCE_PLAN_STATUS.READY
      : SERVICE_ACCOUNT_SOURCE_PLAN_STATUS.AVAILABLE_AFTER_JOIN,
  }
}

const summarizeRows = (rows, status) => {
  if (rows.length === 0) {
    return status === SERVICE_ACCOUNT_SOURCE_PLAN_STATUS.NOT_CONNECTED
      ? 'No source-module notification schedule is connected yet.'
      : 'No source-module notification schedule.'
  }
  const labels = rows.map((row) => row.label).join(', ')
  if (status === SERVICE_ACCOUNT_SOURCE_PLAN_STATUS.READY) {
    return `${labels} can push event-driven updates into this Chat service thread.`
  }
  return `${labels} will be ready after the user joins this service account.`
}

export const buildServiceAccountSourceNotificationPlan = (source = {}, options = {}) => {
  const subscriptionState = normalizeSubscriptionState(options.subscriptionState)
  const sourceBindings = normalizeBindings(source)
  const origin = normalizeOrigin(source)
  const rows = Object.entries(sourceBindings)
    .map(([bindingKey, serviceKey]) => buildPlanRow({ bindingKey, serviceKey, subscriptionState }))
    .filter(Boolean)

  const status =
    rows.length === 0
      ? SERVICE_ACCOUNT_SOURCE_PLAN_STATUS.NOT_CONNECTED
      : subscriptionState === 'joined'
        ? SERVICE_ACCOUNT_SOURCE_PLAN_STATUS.READY
        : SERVICE_ACCOUNT_SOURCE_PLAN_STATUS.AVAILABLE_AFTER_JOIN

  return {
    version: SERVICE_ACCOUNT_SOURCE_PLAN_VERSION,
    status,
    summary: summarizeRows(rows, status),
    rows,
    origin,
    boundary: {
      owner: 'source_module',
      chatReceivesNotificationsOnly: true,
      chatMayMutateSourceRecords: false,
      autoCreatesSubscription: false,
      autoCreatesSourceRecords: false,
    },
  }
}

export const summarizeServiceAccountSourceNotificationPlan = (plan = {}) =>
  normalizeText(plan.summary, 'No source-module notification schedule is connected yet.', 260)
