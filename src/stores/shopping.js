import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { convertLegacyCentsToMoney, normalizeMoneyQuote } from '../lib/currency-system'
import { normalizeImageSource } from '../lib/image-source-contract'
import {
  resolveShoppingGiftExperienceId,
} from '../lib/shared-experience-contract'
import {
  SHOPPING_CATEGORY_ENTRIES,
  SHOPPING_SERVICE_PRESETS,
  SHOPPING_SOURCE_KEYS,
  buildShoppingAppRoute,
} from '../lib/planned-module-registry'
import {
  anonymizeRelationshipText,
  bindingMatchesProfile,
  clearRelationshipBinding,
} from '../lib/relationship-cleanup-helpers'
import { useCalendarStore } from './calendar'
import { CHAT_SERVICE_NOTIFICATION_KIND, useChatStore } from './chat'
import { useWalletStore } from './wallet'
import {
  COMMERCE_INTERACTION_ENTRY_SURFACE,
  COMMERCE_SERVICE_CASE_STATUS,
  normalizeCommerceInteractionTriggerV1,
  normalizeCommerceOrderReferenceV1,
  normalizeCommerceServiceCaseReferenceV1,
} from '../lib/simulation/commerce-interaction-contracts'

const SHOPPING_STORAGE_KEY = 'store:shopping'
const SHOPPING_STORAGE_VERSION = 2
const SHOPPING_PRODUCT_LIMIT = 220
const SHOPPING_CART_LINE_LIMIT = 60
const SHOPPING_ORDER_LIMIT = 120
const SHOPPING_ORDER_EVENT_LIMIT = 32
const SHOPPING_SERVICE_CASE_LIMIT = 120
const SHOPPING_INTERACTION_TRIGGER_LIMIT = 180
const DEFAULT_CURRENCY = 'CNY'

export const SHOPPING_ORDER_STATUS = Object.freeze({
  DRAFT: 'draft',
  PLACED: 'placed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
})

export const SHOPPING_ORDER_EVENT_TYPE = Object.freeze({
  PACKAGE_SHIPPED: 'package_shipped',
  PACKAGE_ARRIVED: 'package_arrived',
  PICKUP_POINT_CHANGED: 'pickup_point_changed',
  INTERNATIONAL_DELAY: 'international_delay',
  STATUS_UPDATE: 'status_update',
})

const LOGISTICS_EVENT_SERVICE_KEY = Object.freeze({
  [SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED]: 'standard_courier',
  [SHOPPING_ORDER_EVENT_TYPE.PACKAGE_ARRIVED]: 'standard_courier',
  [SHOPPING_ORDER_EVENT_TYPE.PICKUP_POINT_CHANGED]: 'local_express',
  [SHOPPING_ORDER_EVENT_TYPE.INTERNATIONAL_DELAY]: 'international_logistics',
  [SHOPPING_ORDER_EVENT_TYPE.STATUS_UPDATE]: 'standard_courier',
})

const SHOPPING_ORDER_STATUS_VALUES = new Set(Object.values(SHOPPING_ORDER_STATUS))
const SHOPPING_ORDER_EVENT_TYPE_VALUES = new Set(Object.values(SHOPPING_ORDER_EVENT_TYPE))
const SHOPPING_ORDER_EVENT_TITLES = Object.freeze({
  [SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED]: 'Package shipped',
  [SHOPPING_ORDER_EVENT_TYPE.PACKAGE_ARRIVED]: 'Package arrived',
  [SHOPPING_ORDER_EVENT_TYPE.PICKUP_POINT_CHANGED]: 'Pickup point changed',
  [SHOPPING_ORDER_EVENT_TYPE.INTERNATIONAL_DELAY]: 'International logistics delay',
  [SHOPPING_ORDER_EVENT_TYPE.STATUS_UPDATE]: 'Logistics status updated',
})
const SHOPPING_STOCK_STATUS_VALUES = new Set(['available', 'limited', 'preorder', 'sold_out'])
const SHOPPING_PRODUCT_ORIGIN_VALUES = new Set(['seed', 'user', 'ai'])
const SHOPPING_CATEGORY_KEYS = SHOPPING_CATEGORY_ENTRIES.map((entry) => entry.key)
const SHOPPING_CATEGORY_KEY_SET = new Set(SHOPPING_CATEGORY_KEYS)
const SHOPPING_SERVICE_KEYS = SHOPPING_SERVICE_PRESETS.map((entry) => entry.key)
const SHOPPING_SERVICE_KEY_SET = new Set(SHOPPING_SERVICE_KEYS)

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeText = (value, fallback = '', max = 120) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeCurrency = (value, fallback = DEFAULT_CURRENCY) => {
  const normalized = normalizeText(value, fallback, 8).toUpperCase()
  return /^[A-Z]{2,8}$/.test(normalized) ? normalized : fallback
}

const normalizeAmountCents = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value * 100))
  }
  if (typeof value !== 'string') return 0
  const normalized = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return 0
  return Math.round(Number(normalized) * 100)
}

const formatAmount = (amountCents = 0) => {
  const cents = Number.isFinite(Number(amountCents)) ? Math.max(0, Math.floor(Number(amountCents))) : 0
  return (cents / 100).toFixed(2)
}

const normalizeProductId = (value) => normalizeText(value, '', 120)

const normalizeCategory = (value, fallback = 'mall') => {
  const normalized = normalizeText(value, fallback, 40)
  return SHOPPING_CATEGORY_KEY_SET.has(normalized) ? normalized : fallback
}

const normalizeServiceKey = (value, category = 'mall') => {
  const normalized = normalizeText(value, '', 40)
  if (SHOPPING_SERVICE_KEY_SET.has(normalized)) return normalized
  const categoryKey = normalizeCategory(category)
  const matched = SHOPPING_SERVICE_PRESETS.find((service) =>
    Array.isArray(service.categoryKeys) && service.categoryKeys.includes(categoryKey),
  )
  return matched?.key || SHOPPING_SERVICE_KEYS[0] || ''
}

const normalizeExistingServiceKey = (value) => {
  const normalized = normalizeText(value, '', 40)
  return SHOPPING_SERVICE_KEY_SET.has(normalized) ? normalized : ''
}

const resolveServiceLabel = (serviceKey = '') => {
  const normalized = normalizeServiceKey(serviceKey, '')
  const preset = SHOPPING_SERVICE_PRESETS.find((service) => service.key === normalized)
  return normalizeText(preset?.en || normalized, normalized, 80)
}

const normalizeStockStatus = (value, fallback = 'available') => {
  const normalized = normalizeText(value, fallback, 40)
  return SHOPPING_STOCK_STATUS_VALUES.has(normalized) ? normalized : fallback
}

const normalizeProductOrigin = (value, fallback = 'seed') => {
  const normalized = normalizeText(value, fallback, 40)
  return SHOPPING_PRODUCT_ORIGIN_VALUES.has(normalized) ? normalized : fallback
}

const normalizeOrderStatus = (value, fallback = SHOPPING_ORDER_STATUS.PLACED) => {
  const normalized = normalizeText(value, fallback, 40)
  return SHOPPING_ORDER_STATUS_VALUES.has(normalized) ? normalized : fallback
}

const normalizeOrderEventType = (value, fallback = '') => {
  const normalized = normalizeText(value, fallback, 80)
  return SHOPPING_ORDER_EVENT_TYPE_VALUES.has(normalized) ? normalized : fallback
}

const normalizeGiftRecipient = (value = {}) => {
  const rawRecipient = value.giftRecipient && typeof value.giftRecipient === 'object'
    ? value.giftRecipient
    : value
  const chatId = toInt(rawRecipient.chatId || rawRecipient.contactId || rawRecipient.recipientChatId, 0)
  const contactId = toInt(rawRecipient.contactId || rawRecipient.chatId || rawRecipient.recipientContactId, 0)
  const profileId = toInt(rawRecipient.profileId || rawRecipient.roleProfileId, 0)
  const name = normalizeText(rawRecipient.name || rawRecipient.recipientName || rawRecipient.recipient, '', 120)
  const kind = normalizeText(rawRecipient.kind, profileId > 0 ? 'role' : 'contact', 40)
  const sourceModule = normalizeText(rawRecipient.sourceModule || rawRecipient.recipientSourceModule, '', 40)
  const sourceId = normalizeText(rawRecipient.sourceId || rawRecipient.recipientSourceId, '', 140)

  if (!name && chatId <= 0 && contactId <= 0 && profileId <= 0 && !sourceModule && !sourceId) {
    return {
      name: '',
      chatId: 0,
      contactId: 0,
      profileId: 0,
      kind: '',
      sourceModule: '',
      sourceId: '',
    }
  }

  return {
    name,
    chatId: Math.max(0, chatId),
    contactId: Math.max(0, contactId),
    profileId: Math.max(0, profileId),
    kind,
    sourceModule,
    sourceId,
  }
}

const normalizeQuantity = (value, fallback = 1) => {
  const quantity = toInt(value, fallback)
  return Math.max(1, Math.min(99, quantity))
}

const createShoppingProductId = () => `shopping_product_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const createShoppingOrderId = () => `shopping_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const createShoppingOrderEventId = () => `shopping_event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeShoppingProduct = (rawProduct, index = 0) => {
  if (!rawProduct || typeof rawProduct !== 'object') return null

  const title = normalizeText(rawProduct.title || rawProduct.name, '', 90)
  const priceCents =
    Number.isFinite(Number(rawProduct.priceCents)) && Number(rawProduct.priceCents) > 0
      ? Math.floor(Number(rawProduct.priceCents))
      : normalizeAmountCents(rawProduct.price)
  if (!title || priceCents <= 0) return null

  const now = Date.now()
  const updatedAt = Math.max(0, toInt(rawProduct.updatedAt, now))

  return {
    id: normalizeProductId(rawProduct.id) || `shopping_product_legacy_${now}_${index}`,
    title,
    titleEn: normalizeText(rawProduct.titleEn, '', 90),
    category: normalizeCategory(rawProduct.category),
    serviceKey: normalizeServiceKey(rawProduct.serviceKey || rawProduct.service, rawProduct.category),
    priceCents,
    currency: normalizeCurrency(rawProduct.currency),
    desc: normalizeText(rawProduct.desc || rawProduct.description, '', 240),
    descEn: normalizeText(rawProduct.descEn || rawProduct.descriptionEn, '', 240),
    origin: normalizeProductOrigin(rawProduct.origin || rawProduct.productOrigin, rawProduct.sourceModule === 'seed' ? 'seed' : 'user'),
    image: normalizeImageSource({ ...rawProduct, title }, { alt: title, prompt: rawProduct.imageHint }),
    imageHint: normalizeText(rawProduct.imageHint, '', 120),
    stockStatus: normalizeStockStatus(rawProduct.stockStatus),
    assetEligible: rawProduct.assetEligible === true,
    giftable: rawProduct.giftable !== false,
    sourceModule: normalizeText(rawProduct.sourceModule, 'shopping_catalog', 40),
    sourceId: normalizeText(rawProduct.sourceId, '', 140),
    createdAt: Math.max(0, toInt(rawProduct.createdAt, updatedAt)),
    updatedAt,
  }
}

const normalizeShoppingProducts = (rawProducts) => {
  if (!Array.isArray(rawProducts)) return []
  const seen = new Set()
  const normalized = []
  rawProducts.forEach((item, index) => {
    const product = normalizeShoppingProduct(item, index)
    if (!product || seen.has(product.id)) return
    seen.add(product.id)
    normalized.push(product)
  })
  return normalized
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, SHOPPING_PRODUCT_LIMIT)
}

const normalizeFavoriteProductIds = (rawIds, productIds) => {
  if (!Array.isArray(rawIds)) return []
  const seen = new Set()
  const normalized = []
  rawIds.forEach((item) => {
    const id = normalizeProductId(item)
    if (!id || seen.has(id)) return
    if (productIds.size > 0 && !productIds.has(id)) return
    seen.add(id)
    normalized.push(id)
  })
  return normalized.slice(0, SHOPPING_PRODUCT_LIMIT)
}

const normalizeCartItem = (rawItem, productIds, index = 0) => {
  if (!rawItem || typeof rawItem !== 'object') return null
  const productId = normalizeProductId(rawItem.productId || rawItem.id)
  if (!productId || (productIds.size > 0 && !productIds.has(productId))) return null
  const now = Date.now()
  const addedAt = Math.max(0, toInt(rawItem.addedAt || rawItem.createdAt, now + index))

  return {
    productId,
    quantity: normalizeQuantity(rawItem.quantity),
    sourceModule: normalizeText(rawItem.sourceModule, 'shopping_cart', 40),
    sourceId: normalizeText(rawItem.sourceId, '', 140),
    addedAt,
    updatedAt: Math.max(0, toInt(rawItem.updatedAt, addedAt)),
  }
}

const normalizeCartItems = (rawItems, productIds) => {
  if (!Array.isArray(rawItems)) return []
  const byProductId = new Map()
  rawItems.forEach((item, index) => {
    const cartItem = normalizeCartItem(item, productIds, index)
    if (!cartItem) return
    const existing = byProductId.get(cartItem.productId)
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + cartItem.quantity)
      existing.updatedAt = Math.max(existing.updatedAt, cartItem.updatedAt)
      return
    }
    byProductId.set(cartItem.productId, cartItem)
  })
  return [...byProductId.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, SHOPPING_CART_LINE_LIMIT)
}

const normalizeOrderItem = (rawItem, index = 0) => {
  if (!rawItem || typeof rawItem !== 'object') return null
  const productId = normalizeProductId(rawItem.productId || rawItem.id)
  const title = normalizeText(rawItem.title || rawItem.name, '', 90)
  const serviceKey = normalizeServiceKey(rawItem.serviceKey || rawItem.service, rawItem.category)
  const unitPriceCents =
    Number.isFinite(Number(rawItem.unitPriceCents)) && Number(rawItem.unitPriceCents) > 0
      ? Math.floor(Number(rawItem.unitPriceCents))
      : normalizeAmountCents(rawItem.price)
  if (!productId || !title || unitPriceCents <= 0) return null

  return {
    id: normalizeText(rawItem.id, `${productId}_${index}`, 140),
    productId,
    title,
    category: normalizeCategory(rawItem.category),
    serviceKey,
    serviceLabel:
      normalizeText(rawItem.serviceLabel || rawItem.shopLabel || rawItem.serviceName, '', 80) ||
      resolveServiceLabel(serviceKey),
    quantity: normalizeQuantity(rawItem.quantity),
    unitPriceCents,
    currency: normalizeCurrency(rawItem.currency),
    assetEligible: rawItem.assetEligible === true,
    giftable: rawItem.giftable === true,
  }
}

const normalizeOrderEvent = (rawEvent, index = 0) => {
  if (!rawEvent || typeof rawEvent !== 'object') return null
  const type = normalizeOrderEventType(rawEvent.type || rawEvent.eventType)
  if (!type) return null

  const now = Date.now()
  const createdAt = Math.max(0, toInt(rawEvent.createdAt, now + index))
  const etaDays =
    rawEvent.etaDays === undefined || rawEvent.etaDays === null
      ? null
      : Math.max(0, Math.min(90, toInt(rawEvent.etaDays, 0)))

  return {
    id: normalizeText(rawEvent.id, `shopping_event_legacy_${now}_${index}`, 140),
    type,
    title: normalizeText(rawEvent.title, SHOPPING_ORDER_EVENT_TITLES[type] || 'Logistics update', 120),
    summary: normalizeText(rawEvent.summary || rawEvent.desc || rawEvent.note, '', 320),
    trackingCode: normalizeText(rawEvent.trackingCode || rawEvent.trackingNo, '', 120),
    carrierName: normalizeText(rawEvent.carrierName || rawEvent.carrier || rawEvent.logisticsProvider, '', 120),
    pickupPoint: normalizeText(rawEvent.pickupPoint || rawEvent.pickupAddress, '', 180),
    locationHint: normalizeText(rawEvent.locationHint || rawEvent.location || rawEvent.city, '', 160),
    etaDays,
    sourceModule: normalizeText(rawEvent.sourceModule, SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING, 80),
    sourceId: normalizeText(rawEvent.sourceId, '', 140),
    createdAt,
  }
}

const normalizeOrderEvents = (rawEvents) => {
  if (!Array.isArray(rawEvents)) return []
  const seen = new Set()
  const normalized = []
  rawEvents.forEach((item, index) => {
    const event = normalizeOrderEvent(item, index)
    if (!event || seen.has(event.id)) return
    seen.add(event.id)
    normalized.push(event)
  })
  return normalized
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, SHOPPING_ORDER_EVENT_LIMIT)
}

const formatOrderAmount = (order = {}) =>
  `${(Number(order?.totalCents || 0) / 100).toFixed(2)} ${order?.currency || DEFAULT_CURRENCY}`

const orderTitle = (order = {}, fallback = 'Shopping order') => {
  const firstItem = Array.isArray(order.items) ? order.items[0] : null
  const title = normalizeText(firstItem?.title, '', 90)
  if (title) return title
  return fallback
}

const orderItemSummary = (order = {}) => {
  const firstItem = Array.isArray(order.items) ? order.items[0] : null
  const title = normalizeText(firstItem?.title, 'Shopping order', 90)
  const itemCount = toInt(order.itemCount || order.items?.length, 0)
  return itemCount > 1 ? `${title} +${itemCount - 1}` : title
}

const buildShoppingOrderRoute = (order = {}) => {
  const firstItem = Array.isArray(order.items) ? order.items[0] : null
  const service = normalizeServiceKey(firstItem?.serviceKey || '', firstItem?.category)
  return `${buildShoppingAppRoute(service)}?source=chat&intent=shopping_order&orderId=${encodeURIComponent(order.id)}`
}

const buildShoppingLogisticsRoute = (order = {}) => {
  const firstItem = Array.isArray(order.items) ? order.items[0] : null
  const service = normalizeServiceKey(firstItem?.serviceKey || '', firstItem?.category)
  return `${buildShoppingAppRoute(service)}?source=chat&intent=logistics&category=logistics&orderId=${encodeURIComponent(order.id)}`
}

const shoppingStatusLabel = (status = '') => {
  if (status === SHOPPING_ORDER_STATUS.COMPLETED) return 'Completed'
  if (status === SHOPPING_ORDER_STATUS.CANCELLED) return 'Cancelled'
  return 'Placed'
}

const logisticsStatusLabel = (event = {}) => {
  if (event.type === SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED) return 'Shipped'
  if (event.type === SHOPPING_ORDER_EVENT_TYPE.PACKAGE_ARRIVED) return 'Arrived'
  if (event.type === SHOPPING_ORDER_EVENT_TYPE.PICKUP_POINT_CHANGED) return 'Pickup changed'
  if (event.type === SHOPPING_ORDER_EVENT_TYPE.INTERNATIONAL_DELAY) return 'Delayed'
  return 'Updated'
}

const summarizeOrderTotals = (items) => {
  const totals = new Map()
  items.forEach((item) => {
    const current = totals.get(item.currency) || 0
    totals.set(item.currency, current + item.unitPriceCents * item.quantity)
  })
  return [...totals.entries()]
    .map(([currency, amountCents]) => ({
      currency,
      amountCents,
      amount: formatAmount(amountCents),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency))
}

const normalizeShoppingDestination = (rawDestination) => {
  if (!rawDestination || typeof rawDestination !== 'object') return null
  const id = normalizeText(rawDestination.id || rawDestination.placeId, '', 220)
  const detail = normalizeText(rawDestination.detail || rawDestination.address, '', 220)
  if (!id || !detail) return null
  return {
    id,
    label: normalizeText(rawDestination.label, detail, 120),
    detail,
    mapPackId: normalizeText(rawDestination.mapPackId, '', 140),
    placeId: normalizeText(rawDestination.placeId, id, 220),
    revision: Math.max(1, toInt(rawDestination.revision, 1)),
  }
}

const normalizeShoppingPaymentRef = (rawRef) => {
  if (!rawRef || typeof rawRef !== 'object') return null
  const transactionId = normalizeText(rawRef.transactionId, '', 140)
  if (!transactionId) return null
  return {
    transactionId,
    receiptNumber: normalizeText(rawRef.receiptNumber, '', 40),
    status: normalizeText(rawRef.status, 'completed', 32),
    idempotencyKey: normalizeText(rawRef.idempotencyKey, '', 180),
    sourceModule: normalizeText(rawRef.sourceModule, 'wallet_commerce_payment', 60),
    sourceId: normalizeText(rawRef.sourceId, '', 140),
    accountId: normalizeText(rawRef.accountId, '', 120),
    cardId: normalizeText(rawRef.cardId, '', 120),
    amountCents: Math.max(0, toInt(rawRef.amountCents, 0)),
    currency: normalizeCurrency(rawRef.currency),
    createdAt: Math.max(0, toInt(rawRef.createdAt, Date.now())),
  }
}

const normalizeShoppingServiceCase = (rawCase, index = 0) => {
  if (!rawCase || typeof rawCase !== 'object') return null
  const orderId = normalizeText(rawCase.orderId, '', 180)
  const caseType = normalizeText(rawCase.caseType, '', 120).toLowerCase()
  const sourceInteractionId = normalizeText(rawCase.sourceInteractionId, '', 220)
  if (!orderId || !caseType || !sourceInteractionId) return null
  const reference = normalizeCommerceServiceCaseReferenceV1({
    schemaVersion: 1,
    ownerModule: 'shopping',
    caseId: normalizeText(
      rawCase.id || rawCase.caseId,
      `shopping_service_case_${orderId}_${caseType}`,
      220,
    ),
    orderId,
    caseType,
    status: rawCase.status || COMMERCE_SERVICE_CASE_STATUS.OPEN,
    sourceInteractionId,
    ownerRevision: Math.max(1, toInt(rawCase.ownerRevision, 1)),
  })
  if (!reference) return null
  const createdAt = Math.max(0, toInt(rawCase.createdAt, Date.now() + index))
  return {
    id: reference.caseId,
    orderId,
    caseType,
    status: reference.status,
    requestedDestination: normalizeShoppingDestination(rawCase.requestedDestination),
    sourceInteractionId,
    sourceMessageRef: {
      ownerModule: normalizeText(rawCase.sourceMessageRef?.ownerModule, 'shopping', 80).toLowerCase(),
      messageId: normalizeText(rawCase.sourceMessageRef?.messageId, '', 220),
    },
    ownerRevision: reference.ownerRevision,
    resolutionCode: normalizeText(rawCase.resolutionCode, '', 160).toLowerCase(),
    createdAt,
    updatedAt: Math.max(createdAt, toInt(rawCase.updatedAt, createdAt)),
  }
}

const normalizeShoppingServiceCases = (rawCases) => {
  if (!Array.isArray(rawCases)) return []
  const seen = new Set()
  return rawCases
    .map(normalizeShoppingServiceCase)
    .filter((serviceCase) => {
      if (!serviceCase || seen.has(serviceCase.id)) return false
      seen.add(serviceCase.id)
      return true
    })
    .slice(0, SHOPPING_SERVICE_CASE_LIMIT)
}

const normalizeShoppingInteractionTriggers = (rawTriggers) => {
  if (!Array.isArray(rawTriggers)) return []
  const seen = new Set()
  return rawTriggers
    .map(normalizeCommerceInteractionTriggerV1)
    .filter((trigger) => {
      if (!trigger || trigger.orderRef.ownerModule !== 'shopping' || seen.has(trigger.id)) return false
      seen.add(trigger.id)
      return true
    })
    .slice(0, SHOPPING_INTERACTION_TRIGGER_LIMIT)
}

const normalizeShoppingOrder = (rawOrder, index = 0) => {
  if (!rawOrder || typeof rawOrder !== 'object') return null
  const items = Array.isArray(rawOrder.items)
    ? rawOrder.items.map((item, itemIndex) => normalizeOrderItem(item, itemIndex)).filter(Boolean)
    : []
  if (items.length === 0) return null

  const now = Date.now()
  const createdAt = Math.max(0, toInt(rawOrder.createdAt, now + index))
  const totals = summarizeOrderTotals(items)
  const primaryTotal = totals.find((item) => item.currency === DEFAULT_CURRENCY) || totals[0] || {
    currency: DEFAULT_CURRENCY,
    amountCents: 0,
    amount: '0.00',
  }
  const quoteSnapshot = normalizeMoneyQuote(
    rawOrder.quoteSnapshot || rawOrder.moneyQuote || rawOrder.checkoutQuote,
  )
  const paymentRef = normalizeShoppingPaymentRef(rawOrder.paymentRef)
  const id = normalizeText(rawOrder.id, `shopping_order_legacy_${now}_${index}`, 140)
  const status = normalizeOrderStatus(rawOrder.status)
  const giftRecipient = normalizeGiftRecipient(rawOrder)
  const sharedExperienceId = resolveShoppingGiftExperienceId({
    id,
    giftRecipient,
    sharedExperienceId: rawOrder.sharedExperienceId,
  })

  return {
    id,
    status,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    totals,
    totalCents: primaryTotal.amountCents,
    currency: primaryTotal.currency,
    quoteSnapshot,
    note: normalizeText(rawOrder.note, '', 240),
    recipient: normalizeText(rawOrder.recipient, '', 120),
    recipientPhone: normalizeText(rawOrder.recipientPhone, '', 40),
    deliveryAddress: normalizeText(rawOrder.deliveryAddress, '', 220),
    deliveryAnchor: normalizeShoppingDestination(rawOrder.deliveryAnchor),
    paymentRef,
    paymentStatus: paymentRef?.status || 'unpaid',
    ownerRevision: Math.max(1, toInt(rawOrder.ownerRevision, 1)),
    giftRecipient,
    sharedExperienceId,
    events: normalizeOrderEvents(rawOrder.events || rawOrder.logisticsEvents || rawOrder.statusEvents),
    sourceModule: normalizeText(rawOrder.sourceModule, 'shopping_checkout', 40),
    sourceId: normalizeText(rawOrder.sourceId, '', 140),
    createdAt,
    completedAt:
      status === SHOPPING_ORDER_STATUS.COMPLETED
        ? Math.max(createdAt, toInt(rawOrder.completedAt, rawOrder.updatedAt || createdAt))
        : 0,
    cancelledAt:
      status === SHOPPING_ORDER_STATUS.CANCELLED
        ? Math.max(createdAt, toInt(rawOrder.cancelledAt, rawOrder.updatedAt || createdAt))
        : 0,
    updatedAt: Math.max(0, toInt(rawOrder.updatedAt, createdAt)),
  }
}

export const migrateShoppingStorage = ({ version, data } = {}) => {
  if (Number(version) !== 1 || !data || typeof data !== 'object' || Array.isArray(data)) return null
  return { ...data, serviceCases: [], interactionTriggers: [] }
}

const normalizeShoppingOrders = (rawOrders) => {
  if (!Array.isArray(rawOrders)) return []
  const seen = new Set()
  const normalized = []
  rawOrders.forEach((item, index) => {
    const order = normalizeShoppingOrder(item, index)
    if (!order || seen.has(order.id)) return
    seen.add(order.id)
    normalized.push(order)
  })
  return normalized
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, SHOPPING_ORDER_LIMIT)
}

const SHOPPING_CATALOG_EXPANSION_SEEDS = Object.freeze([
  { id: 'shopping_seed_mall_rain_shell', title: '轻量通勤雨衣', titleEn: 'Light Commuter Rain Shell', category: 'fashion', price: '239.00', desc: '可收纳帽檐与双向拉链，适合首尔雨季通勤。', descEn: 'A packable hood and two-way zip for wet city commutes.', serviceKey: 'schat_mall', imageHint: 'lightweight stone gray commuter rain shell' },
  { id: 'shopping_seed_mall_air_fryer_liner', title: '耐热烘焙托盘组', titleEn: 'Heatproof Baking Tray Set', category: 'home', price: '96.00', desc: '两种尺寸的可重复使用硅胶托盘，适合日常小份烘焙。', descEn: 'Two reusable silicone trays for compact everyday baking.', serviceKey: 'schat_mall', imageHint: 'two muted silicone baking trays on white kitchen surface' },
  { id: 'shopping_seed_mall_cica_patches', title: '积雪草急救贴组', titleEn: 'Cica Calm Patch Set', category: 'beauty', price: '42.00', desc: '三种尺寸的透明护理贴，便于随身补充。', descEn: 'Three clear patch sizes packed for quick daily care.', serviceKey: 'schat_mall', imageHint: 'minimal clear skincare patch packets with green accents' },
  { id: 'shopping_seed_mall_picnic_bundle', title: '汉江野餐整理包', titleEn: 'Hangang Picnic Organizer', category: 'gifts', price: '168.00', desc: '保温袋、餐垫和餐具袋组成的周末礼赠组合。', descEn: 'An insulated tote, mat, and utensil roll for weekend gifting.', giftable: true, serviceKey: 'schat_mall', imageHint: 'bright picnic organizer set beside folded gingham mat' },

  { id: 'shopping_seed_nova_bedside_radio', title: '卵石床头收音机', titleEn: 'Pebble Bedside Radio', category: 'digital', price: '328.00', desc: '旋钮调频、柔光时钟与简洁织物扬声器面。', descEn: 'Tactile tuning, a soft clock glow, and a woven speaker face.', serviceKey: 'nova_digital', imageHint: 'sculptural pebble shaped bedside radio in warm gray' },
  { id: 'shopping_seed_nova_stone_tray', title: '浇铸石桌面托盘', titleEn: 'Cast Stone Desk Tray', category: 'luxury', price: '260.00', desc: '以低矮弧面收拢钥匙、腕表和随身小物。', descEn: 'A low curved tray for keys, watches, and quiet daily objects.', assetEligible: true, serviceKey: 'nova_digital', imageHint: 'cast stone desk tray with subtle mineral texture' },
  { id: 'shopping_seed_nova_letter_set', title: '夜蓝书信礼盒', titleEn: 'Night Blue Letter Set', category: 'gifts', price: '118.00', desc: '厚纸信笺、信封和金属书签组成的书写礼盒。', descEn: 'Heavy paper, envelopes, and a metal bookmark in one writing set.', giftable: true, serviceKey: 'nova_digital', imageHint: 'navy stationery gift set with metal bookmark' },

  { id: 'shopping_seed_fresh_yogurt', title: '晨光原味酸奶组', titleEn: 'Morning Plain Yogurt Set', category: 'grocery', price: '52.00', desc: '四杯原味酸奶，适合搭配水果和谷物。', descEn: 'Four plain yogurt cups ready for fruit and grains.', serviceKey: 'daily_fresh', imageHint: 'four plain yogurt cups with linen and fresh berries' },
  { id: 'shopping_seed_fresh_soup_kit', title: '菌菇豆腐汤料包', titleEn: 'Mushroom Tofu Soup Kit', category: 'grocery', price: '68.00', desc: '分装菌菇、豆腐和清汤底，适合两人晚餐。', descEn: 'Portioned mushrooms, tofu, and clear broth for two.', serviceKey: 'daily_fresh', imageHint: 'fresh mushroom tofu soup ingredients in chilled trays' },
  { id: 'shopping_seed_fresh_linen_cloths', title: '厨房亚麻擦巾三件组', titleEn: 'Kitchen Linen Cloth Trio', category: 'home', price: '74.00', desc: '不同织纹分别用于台面、餐具和烘焙。', descEn: 'Three weaves assigned to counters, dishes, and baking.', serviceKey: 'daily_fresh', imageHint: 'three folded kitchen linen cloths in oat and plum colors' },
  { id: 'shopping_seed_fresh_lunch_bundle', title: '工作日轻午餐组合', titleEn: 'Weekday Light Lunch Bundle', category: 'mall', price: '126.00', desc: '由现有食材逻辑组成的沙拉、汤品和面包补给。', descEn: 'A practical salad, soup, and bread restock for weekdays.', serviceKey: 'daily_fresh', imageHint: 'fresh lunch bundle with salad soup and artisan bread' },

  { id: 'shopping_seed_fashion_cargo', title: '斜袋机能长裤', titleEn: 'Offset Utility Trousers', category: 'fashion', price: '368.00', desc: '侧向口袋与可调节裤脚形成利落街头轮廓。', descEn: 'Offset pockets and adjustable hems shape a clean street silhouette.', serviceKey: 'style_cloud', imageHint: 'black technical cargo trousers editorial studio' },
  { id: 'shopping_seed_fashion_cap', title: '洗旧六片帽', titleEn: 'Washed Six-Panel Cap', category: 'fashion', price: '126.00', desc: '低帽冠与轻微褪色处理，适合日常叠搭。', descEn: 'A low crown and softened fade for everyday layering.', serviceKey: 'style_cloud', imageHint: 'washed charcoal six panel cap on concrete block' },
  { id: 'shopping_seed_fashion_chain', title: '工业扣链项圈', titleEn: 'Industrial Clasp Chain', category: 'luxury', price: '520.00', desc: '哑光链节与机械扣件构成克制的金属重点。', descEn: 'Matte links and a mechanical clasp create a restrained metal accent.', assetEligible: true, stockStatus: 'limited', serviceKey: 'style_cloud', imageHint: 'matte silver industrial clasp chain on black surface' },
  { id: 'shopping_seed_fashion_zine', title: '首尔夜行造型册', titleEn: 'Seoul Night Styling Zine', category: 'gifts', price: '82.00', desc: '原创街头造型、材质笔记和可拆海报组成的小志。', descEn: 'An original street-style zine with material notes and a pullout poster.', giftable: true, serviceKey: 'style_cloud', imageHint: 'black and fluorescent fashion zine with folded poster' },

  { id: 'shopping_seed_nordhus_side_table', title: '窄边移动茶几', titleEn: 'Slim Mobile Side Table', category: 'home', price: '286.00', desc: '窄桌面和隐藏脚轮适合沙发侧与小空间。', descEn: 'A narrow top and hidden casters for sofas and compact rooms.', assetEligible: true, serviceKey: 'nordhus_home', imageHint: 'slim birch side table with hidden wheels in small living room' },
  { id: 'shopping_seed_nordhus_wall_rail', title: '玄关模块挂轨', titleEn: 'Entryway Modular Rail', category: 'home', price: '198.00', desc: '挂钩、浅托盘和信件夹可按生活习惯重新排列。', descEn: 'Hooks, a shallow tray, and letter clip rearrange around daily habits.', assetEligible: true, serviceKey: 'nordhus_home', imageHint: 'blue modular wall rail with hooks and tray in entryway' },
  { id: 'shopping_seed_nordhus_floor_cushion', title: '折叠地坐垫', titleEn: 'Foldable Floor Cushion', category: 'home', price: '146.00', desc: '可折叠厚垫用于阅读、客座和低桌用餐。', descEn: 'A folding cushion for reading, guests, and low-table meals.', serviceKey: 'nordhus_home', imageHint: 'foldable mustard floor cushion in bright apartment' },
  { id: 'shopping_seed_nordhus_housewarming', title: '新居餐桌礼盒', titleEn: 'New Home Table Gift Box', category: 'gifts', price: '224.00', desc: '桌布、烛台和木质餐垫组成的新居礼物。', descEn: 'A tablecloth, candleholder, and wood trivet for a new home.', giftable: true, serviceKey: 'nordhus_home', imageHint: 'housewarming gift box with textiles candleholder and wood trivet' },

  { id: 'shopping_seed_care_balm', title: '柔润卸妆膏', titleEn: 'Soft Melt Cleansing Balm', category: 'beauty', price: '128.00', desc: '遇肤温融化的膏体，用于晚间卸除防晒与彩妆。', descEn: 'A balm that melts with skin warmth for evening cleansing.', serviceKey: 'mellow_care', imageHint: 'unbranded cleansing balm jar with soft cream texture swipe' },
  { id: 'shopping_seed_care_scalp_mist', title: '清凉头皮喷雾', titleEn: 'Cooling Scalp Mist', category: 'beauty', price: '96.00', desc: '细雾喷头与轻盈水感，适合运动后快速整理。', descEn: 'A fine, weightless mist for a quick post-workout reset.', serviceKey: 'mellow_care', imageHint: 'slim green scalp mist bottle with clean water droplets' },
  { id: 'shopping_seed_care_nail_tint', title: '透亮指尖染色液', titleEn: 'Sheer Nail Tint', category: 'beauty', price: '72.00', desc: '半透明色泽可单涂或叠加，保留自然甲面质感。', descEn: 'A translucent tint that layers while keeping the natural nail visible.', serviceKey: 'mellow_care', imageHint: 'three sheer nail tint bottles with translucent swatches' },
  { id: 'shopping_seed_care_sleep_pouch', title: '晚安护理随行袋', titleEn: 'Night Care Travel Pouch', category: 'gifts', price: '156.00', desc: '眼罩、护手霜和夜间护理小样组成的轻礼物。', descEn: 'An eye mask, hand cream, and night-care minis in a soft pouch.', giftable: true, serviceKey: 'mellow_care', imageHint: 'soft olive travel pouch with eye mask and care minis' },

  { id: 'shopping_seed_traders_pasta_crate', title: '家庭意面补给箱', titleEn: 'Family Pasta Supply Crate', category: 'grocery', price: '186.00', desc: '多种面型与基础番茄酱组成的整箱厨房补给。', descEn: 'A pantry crate of mixed pasta shapes and foundational tomato sauce.', serviceKey: 'traders_club', imageHint: 'warehouse pasta crate with mixed shapes and tomato jars' },
  { id: 'shopping_seed_traders_laundry_refill', title: '洗衣补充装双桶组', titleEn: 'Laundry Refill Twin Pack', category: 'home', price: '164.00', desc: '大容量洗衣液与柔顺补充装，适合家庭周期补货。', descEn: 'Large detergent and softener refills for household restock cycles.', serviceKey: 'traders_club', imageHint: 'two large unbranded laundry refill containers on pallet' },
  { id: 'shopping_seed_traders_cooler', title: '周末保冷收纳箱', titleEn: 'Weekend Cooler Tote', category: 'mall', price: '218.00', desc: '硬挺保冷内层与可折叠外壳适合采购和近郊出行。', descEn: 'A structured insulated liner and folding shell for shopping and day trips.', serviceKey: 'traders_club', imageHint: 'large yellow and black folding cooler tote warehouse display' },
  { id: 'shopping_seed_traders_gift_crate', title: '会员精选补给礼箱', titleEn: 'Member Pantry Gift Crate', category: 'gifts', price: '268.00', desc: '咖啡、饼干和餐桌小物组成的整箱礼赠。', descEn: 'Coffee, biscuits, and table essentials packed as a generous gift crate.', giftable: true, serviceKey: 'traders_club', imageHint: 'warehouse gift crate with coffee biscuits and table goods' },

  { id: 'shopping_seed_cu_noodle_cup', title: '深夜辣汤面杯', titleEn: 'Late-Night Spicy Noodle Cup', category: 'grocery', price: '18.00', desc: '浓郁辣汤与弹韧面体，适合夜间快速加餐。', descEn: 'A bold spicy broth and springy noodles for a quick late meal.', serviceKey: 'cu_24', imageHint: 'unbranded purple spicy noodle cup convenience shelf' },
  { id: 'shopping_seed_cu_yogurt_parfait', title: '蓝莓谷物酸奶杯', titleEn: 'Blueberry Granola Yogurt Cup', category: 'grocery', price: '24.00', desc: '酸奶、蓝莓酱与独立谷物顶料分层包装。', descEn: 'Layered yogurt and blueberry with granola packed separately.', serviceKey: 'cu_24', imageHint: 'clear convenience yogurt parfait with separate granola lid' },
  { id: 'shopping_seed_cu_charging_cable', title: '夜间应急充电线', titleEn: 'Night Emergency Charging Cable', category: 'home', price: '36.00', desc: '一米编织线与双接口转换头，适合临时补给。', descEn: 'A one-meter braided cable with a dual connector adapter.', serviceKey: 'cu_24', imageHint: 'compact braided charging cable in purple green convenience packaging' },
  { id: 'shopping_seed_cu_rain_kit', title: '突然下雨应急包', titleEn: 'Sudden Rain Quick Kit', category: 'mall', price: '42.00', desc: '轻便雨披、鞋套和吸水巾组成的门店应急组合。', descEn: 'A compact poncho, shoe covers, and absorbent towel for sudden rain.', serviceKey: 'cu_24', imageHint: 'convenience rain kit in purple and green pouch' },

  { id: 'shopping_seed_musinsa_bomber', title: '短版飞行夹克', titleEn: 'Cropped Flight Bomber', category: 'fashion', price: '428.00', desc: '宽肩短身比例与轻填充结构适合层次穿搭。', descEn: 'A broad shoulder, cropped body, and light fill for layered styling.', serviceKey: 'musinsa_style', imageHint: 'black cropped flight bomber fashion catalog' },
  { id: 'shopping_seed_musinsa_loafers', title: '方头厚底乐福鞋', titleEn: 'Square-Toe Platform Loafers', category: 'fashion', price: '338.00', desc: '方头、厚底与柔软后跟兼顾造型和步行。', descEn: 'A square toe, platform sole, and soft heel for styling and walking.', serviceKey: 'musinsa_style', imageHint: 'square toe black platform loafers on clean gray set' },
  { id: 'shopping_seed_musinsa_beanie', title: '罗纹短檐冷帽', titleEn: 'Ribbed Short Beanie', category: 'fashion', price: '88.00', desc: '紧密罗纹与短帽型适合简洁街头造型。', descEn: 'Dense ribbing and a short profile for clean street looks.', serviceKey: 'musinsa_style', imageHint: 'charcoal ribbed short beanie fashion flat lay' },
  { id: 'shopping_seed_musinsa_style_box', title: '基础穿搭礼盒', titleEn: 'Daily Styling Gift Box', category: 'gifts', price: '198.00', desc: '中筒袜、帽饰和织物护理工具组成的穿搭礼盒。', descEn: 'Crew socks, a headwear accent, and fabric-care tools in one box.', giftable: true, serviceKey: 'musinsa_style', imageHint: 'minimal black white fashion styling gift box' },

  { id: 'shopping_seed_boon_trousers', title: '羊毛弧线长裤', titleEn: 'Curved Wool Trousers', category: 'fashion', price: '1380.00', desc: '弧形裤线与柔软羊毛形成克制的垂坠体积。', descEn: 'A curved leg and soft wool create controlled drape and volume.', assetEligible: true, serviceKey: 'boon_select', imageHint: 'charcoal curved wool trousers atelier presentation' },
  { id: 'shopping_seed_boon_cufflinks', title: '陶瓷结扣袖扣', titleEn: 'Ceramic Knot Cufflinks', category: 'luxury', price: '860.00', desc: '手工陶瓷结形与金属杆件形成安静细节。', descEn: 'Hand-shaped ceramic knots meet restrained metal stems.', assetEligible: true, stockStatus: 'limited', serviceKey: 'boon_select', imageHint: 'cream ceramic knot cufflinks on handmade paper' },
  { id: 'shopping_seed_boon_suede_tote', title: '软结构麂皮托特包', titleEn: 'Soft-Structure Suede Tote', category: 'luxury', price: '2480.00', desc: '无硬衬包身与宽提带呈现自然折痕。', descEn: 'An unlined body and wide handles allow natural folds.', assetEligible: true, serviceKey: 'boon_select', imageHint: 'soft brown suede tote in sparse atelier setting' },
  { id: 'shopping_seed_boon_measure_book', title: '私人量体记录册', titleEn: 'Private Fitting Notebook', category: 'gifts', price: '168.00', desc: '布面记录册与软尺用于保存穿着偏好和尺寸笔记。', descEn: 'A clothbound notebook and tape for fit preferences and measurements.', giftable: true, serviceKey: 'boon_select', imageHint: 'clothbound fitting notebook with tailor tape and pencil' },

  { id: 'shopping_seed_galleria_cashmere', title: '午夜蓝羊绒大衣', titleEn: 'Midnight Cashmere Coat', category: 'fashion', price: '6800.00', desc: '长线条双面羊绒与隐藏门襟构成正式外套。', descEn: 'Long double-face cashmere lines with a concealed front.', assetEligible: true, stockStatus: 'limited', serviceKey: 'galleria_luxury', imageHint: 'midnight navy cashmere coat in luxury hall display' },
  { id: 'shopping_seed_galleria_clutch', title: '镜面晚宴手拿包', titleEn: 'Mirror Evening Clutch', category: 'luxury', price: '4200.00', desc: '硬质弧面与隐藏链带适合正式晚间场合。', descEn: 'A rigid curved shell and hidden chain for formal evenings.', assetEligible: true, stockStatus: 'limited', serviceKey: 'galleria_luxury', imageHint: 'unbranded mirror evening clutch on deep navy plinth' },
  { id: 'shopping_seed_galleria_fragrance', title: '私人香氛典藏盒', titleEn: 'Private Fragrance Wardrobe', category: 'gifts', price: '1880.00', desc: '四支原创香调与深色展示盒组成的礼赠典藏。', descEn: 'Four original scent studies arranged in a dark presentation case.', giftable: true, serviceKey: 'galleria_luxury', imageHint: 'four unbranded fragrance bottles in navy gold presentation case' },
  { id: 'shopping_seed_galleria_cuff', title: '流线白金手镯', titleEn: 'Streamline Platinum Cuff', category: 'luxury', price: '7600.00', desc: '连续弧线与镜面边缘形成低调的光泽变化。', descEn: 'A continuous curve and polished edge create restrained reflections.', assetEligible: true, stockStatus: 'limited', serviceKey: 'galleria_luxury', imageHint: 'minimal platinum cuff bracelet on dark velvet' },
])

const createCatalogExpansionSeedProducts = () => {
  const now = Date.now()
  return SHOPPING_CATALOG_EXPANSION_SEEDS.map((product, index) => ({
    ...product,
    giftable: Boolean(product.giftable),
    assetEligible: Boolean(product.assetEligible),
    sourceModule: 'seed',
    createdAt: now - (SHOPPING_CATALOG_EXPANSION_SEEDS.length - index) * 60 * 1000,
    updatedAt: now - (SHOPPING_CATALOG_EXPANSION_SEEDS.length - index) * 60 * 1000,
  }))
}

const createSeedProducts = () => normalizeShoppingProducts([
  {
    id: 'shopping_seed_mall_card',
    title: 'SchatPhone 礼品卡',
    titleEn: 'SchatPhone Gift Card',
    category: 'mall',
    price: '88.00',
    desc: '可用于后续角色互动的通用礼品卡。',
    descEn: 'A flexible digital gift for moments that are hard to shop for.',
    giftable: true,
    serviceKey: 'schat_mall',
    imageHint: 'red gift card with bold S monogram',
    sourceModule: 'seed',
    createdAt: Date.now() - 24 * 60 * 1000,
    updatedAt: Date.now() - 24 * 60 * 1000,
  },
  {
    id: 'shopping_seed_mall_tote',
    title: '城市折叠托特包',
    titleEn: 'City Fold Tote',
    category: 'mall',
    price: '69.00',
    desc: '轻量防泼水面料，可折进内置小袋。',
    descEn: 'A water-resistant carryall that folds into its own pocket.',
    giftable: true,
    serviceKey: 'schat_mall',
    imageHint: 'tomato red foldable tote bag',
    sourceModule: 'seed',
    createdAt: Date.now() - 23 * 60 * 1000,
    updatedAt: Date.now() - 23 * 60 * 1000,
  },
  {
    id: 'shopping_seed_mall_travel_kit',
    title: '周末旅行收纳组',
    titleEn: 'Weekend Packing Set',
    category: 'gifts',
    price: '129.00',
    desc: '三种尺寸的拉链收纳袋，适合短途出行。',
    descEn: 'Three zip organizers sized for a quick weekend away.',
    giftable: true,
    serviceKey: 'schat_mall',
    imageHint: 'color blocked travel organizer set',
    sourceModule: 'seed',
    createdAt: Date.now() - 22 * 60 * 1000,
    updatedAt: Date.now() - 22 * 60 * 1000,
  },
  {
    id: 'shopping_seed_mall_table_clock',
    title: '翻页桌面时钟',
    titleEn: 'Flip Desk Clock',
    category: 'home',
    price: '198.00',
    desc: '清晰的大数字机械翻页，适合书桌和床头。',
    descEn: 'A crisp mechanical flip display for desks and nightstands.',
    giftable: true,
    serviceKey: 'schat_mall',
    imageHint: 'black and cream flip desk clock',
    sourceModule: 'seed',
    createdAt: Date.now() - 21 * 60 * 1000,
    updatedAt: Date.now() - 21 * 60 * 1000,
  },
  {
    id: 'shopping_seed_fashion_jacket',
    title: '霓虹短夹克',
    titleEn: 'Neon Cropped Jacket',
    category: 'fashion',
    price: '399.00',
    desc: '适合赛博夜景约会和角色穿搭想象。',
    descEn: 'A cropped technical jacket made for bright nights in the city.',
    giftable: true,
    serviceKey: 'style_cloud',
    imageHint: 'editorial black cropped jacket with neon lining',
    sourceModule: 'seed',
    createdAt: Date.now() - 20 * 60 * 1000,
    updatedAt: Date.now() - 20 * 60 * 1000,
  },
  {
    id: 'shopping_seed_fashion_shirt',
    title: '不对称垂坠衬衫',
    titleEn: 'Asymmetric Drape Shirt',
    category: 'fashion',
    price: '289.00',
    desc: '柔软斜纹面料和侧边垂坠剪裁。',
    descEn: 'Soft twill with an asymmetric side drape.',
    giftable: true,
    serviceKey: 'style_cloud',
    imageHint: 'cream asymmetric editorial shirt',
    sourceModule: 'seed',
    createdAt: Date.now() - 19 * 60 * 1000,
    updatedAt: Date.now() - 19 * 60 * 1000,
  },
  {
    id: 'shopping_seed_fashion_bag',
    title: '云线肩背包',
    titleEn: 'Cloudline Shoulder Bag',
    category: 'fashion',
    price: '459.00',
    desc: '弧形包身配可调节宽肩带。',
    descEn: 'A curved silhouette with a wide adjustable strap.',
    giftable: true,
    serviceKey: 'style_cloud',
    imageHint: 'sculptural charcoal shoulder bag',
    sourceModule: 'seed',
    createdAt: Date.now() - 18 * 60 * 1000,
    updatedAt: Date.now() - 18 * 60 * 1000,
  },
  {
    id: 'shopping_seed_digital_lens',
    title: 'Mira Lens 便携镜头',
    titleEn: 'Mira Portable Lens',
    category: 'digital',
    price: '1288.00',
    desc: '可作为高价值数码物品，后续可转入资产。',
    descEn: 'A compact creator lens that can later be transferred to Assets.',
    assetEligible: true,
    serviceKey: 'nova_digital',
    imageHint: 'precision compact camera lens on brushed metal',
    sourceModule: 'seed',
    createdAt: Date.now() - 17 * 60 * 1000,
    updatedAt: Date.now() - 17 * 60 * 1000,
  },
  {
    id: 'shopping_seed_digital_headphones',
    title: 'Arc 降噪耳机',
    titleEn: 'Arc Noise-Canceling Headphones',
    category: 'digital',
    price: '899.00',
    desc: '自适应降噪与四十小时续航。',
    descEn: 'Adaptive noise canceling with forty-hour battery life.',
    assetEligible: true,
    giftable: true,
    serviceKey: 'nova_digital',
    imageHint: 'silver over ear headphones with orange accent',
    sourceModule: 'seed',
    createdAt: Date.now() - 16 * 60 * 1000,
    updatedAt: Date.now() - 16 * 60 * 1000,
  },
  {
    id: 'shopping_seed_digital_projector',
    title: 'Pocket Beam 投影仪',
    titleEn: 'Pocket Beam Projector',
    category: 'digital',
    price: '1699.00',
    desc: '一体式云台和自动梯形校正，适合小空间。',
    descEn: 'A compact gimbal projector with automatic keystone correction.',
    assetEligible: true,
    serviceKey: 'nova_digital',
    imageHint: 'compact black projector on technical grid',
    sourceModule: 'seed',
    createdAt: Date.now() - 15 * 60 * 1000,
    updatedAt: Date.now() - 15 * 60 * 1000,
  },
  {
    id: 'shopping_seed_digital_keyboard',
    title: 'Orbit 机械键盘',
    titleEn: 'Orbit Mechanical Keyboard',
    category: 'digital',
    price: '569.00',
    desc: '紧凑配列、热插拔轴体和多设备连接。',
    descEn: 'A compact hot-swappable keyboard with multi-device pairing.',
    giftable: true,
    serviceKey: 'nova_digital',
    imageHint: 'compact mechanical keyboard with orange key',
    sourceModule: 'seed',
    createdAt: Date.now() - 14 * 60 * 1000,
    updatedAt: Date.now() - 14 * 60 * 1000,
  },
  {
    id: 'shopping_seed_fresh_fruit_box',
    title: '本周鲜果盒',
    titleEn: 'Fruit Box of the Week',
    category: 'grocery',
    price: '79.00',
    desc: '当季水果组合，按成熟度分层包装。',
    descEn: 'Seasonal fruit packed by ripeness for the week ahead.',
    giftable: true,
    serviceKey: 'daily_fresh',
    imageHint: 'seasonal fruit box on green market paper',
    sourceModule: 'seed',
    createdAt: Date.now() - 13 * 60 * 1000,
    updatedAt: Date.now() - 13 * 60 * 1000,
  },
  {
    id: 'shopping_seed_fresh_breakfast',
    title: '七日早餐补给',
    titleEn: 'Seven-Day Breakfast Restock',
    category: 'grocery',
    price: '119.00',
    desc: '牛奶、鸡蛋、酸奶、麦片与吐司的一周组合。',
    descEn: 'A one-week set of milk, eggs, yogurt, granola, and bread.',
    serviceKey: 'daily_fresh',
    imageHint: 'organized breakfast grocery crate',
    sourceModule: 'seed',
    createdAt: Date.now() - 12 * 60 * 1000,
    updatedAt: Date.now() - 12 * 60 * 1000,
  },
  {
    id: 'shopping_seed_fresh_household',
    title: '基础居家补充包',
    titleEn: 'Home Basics Restock',
    category: 'home',
    price: '98.00',
    desc: '纸品、清洁布和垃圾袋的轻量补充组合。',
    descEn: 'A practical refill of paper goods, cleaning cloths, and bin liners.',
    serviceKey: 'daily_fresh',
    imageHint: 'household essentials in green reusable crate',
    sourceModule: 'seed',
    createdAt: Date.now() - 11 * 60 * 1000,
    updatedAt: Date.now() - 11 * 60 * 1000,
  },
  {
    id: 'shopping_seed_fresh_pantry',
    title: '厨房常备小仓',
    titleEn: 'Pantry Mini Stock',
    category: 'grocery',
    price: '138.00',
    desc: '米、面、调味和罐头的基础常备组合。',
    descEn: 'A compact pantry set of grains, noodles, seasoning, and tins.',
    serviceKey: 'daily_fresh',
    imageHint: 'organized pantry staples in paper package',
    sourceModule: 'seed',
    createdAt: Date.now() - 10 * 60 * 1000,
    updatedAt: Date.now() - 10 * 60 * 1000,
  },
  {
    id: 'shopping_seed_nordhus_lamp',
    title: '月相床头灯',
    titleEn: 'Moonphase Bedside Lamp',
    category: 'home',
    price: '168.00',
    desc: '柔和漫射光与三档触控亮度。',
    descEn: 'Soft diffused light with three touch-controlled levels.',
    giftable: true,
    serviceKey: 'nordhus_home',
    imageHint: 'round opal bedside lamp on cobalt shelf',
    sourceModule: 'seed',
    createdAt: Date.now() - 9 * 60 * 1000,
    updatedAt: Date.now() - 9 * 60 * 1000,
  },
  {
    id: 'shopping_seed_nordhus_shelf',
    title: 'FRAME 三层置物架',
    titleEn: 'FRAME Three-Tier Shelf',
    category: 'home',
    price: '499.00',
    desc: '窄体模块尺寸，可作为书架或开放式边柜。',
    descEn: 'A slim modular shelf that works as a bookcase or open sideboard.',
    assetEligible: true,
    serviceKey: 'nordhus_home',
    imageHint: 'yellow modular shelf against cobalt wall',
    sourceModule: 'seed',
    createdAt: Date.now() - 8 * 60 * 1000,
    updatedAt: Date.now() - 8 * 60 * 1000,
  },
  {
    id: 'shopping_seed_nordhus_chair',
    title: 'HUG 休闲扶手椅',
    titleEn: 'HUG Lounge Chair',
    category: 'home',
    price: '1299.00',
    desc: '深座面与可拆洗织物外套，适合阅读角。',
    descEn: 'A deep lounge chair with a removable fabric cover.',
    assetEligible: true,
    serviceKey: 'nordhus_home',
    imageHint: 'soft red lounge chair in modular room',
    sourceModule: 'seed',
    createdAt: Date.now() - 7 * 60 * 1000,
    updatedAt: Date.now() - 7 * 60 * 1000,
  },
  {
    id: 'shopping_seed_nordhus_storage',
    title: 'SORT 六件收纳组',
    titleEn: 'SORT Six-Piece Storage Set',
    category: 'home',
    price: '139.00',
    desc: '适合衣柜、抽屉和开放格的可折叠收纳盒。',
    descEn: 'Foldable boxes sized for wardrobes, drawers, and open shelves.',
    giftable: true,
    serviceKey: 'nordhus_home',
    imageHint: 'color coded fabric storage boxes',
    sourceModule: 'seed',
    createdAt: Date.now() - 6 * 60 * 1000,
    updatedAt: Date.now() - 6 * 60 * 1000,
  },
  {
    id: 'shopping_seed_care_cleanser',
    title: 'Soft Reset 洁面乳',
    titleEn: 'Soft Reset Cleanser',
    category: 'beauty',
    price: '89.00',
    desc: '低泡氨基酸配方，适合早晚基础清洁。',
    descEn: 'A low-foam amino-acid cleanser for morning and evening use.',
    giftable: true,
    serviceKey: 'mellow_care',
    imageHint: 'white cleanser tube with coral type',
    sourceModule: 'seed',
    createdAt: Date.now() - 5 * 60 * 1000,
    updatedAt: Date.now() - 5 * 60 * 1000,
  },
  {
    id: 'shopping_seed_care_serum',
    title: 'Dew 03 保湿精华',
    titleEn: 'Dew 03 Hydration Serum',
    category: 'beauty',
    price: '169.00',
    desc: '透明质酸与泛醇组合，提供轻薄保湿感。',
    descEn: 'Hyaluronic acid and panthenol in a lightweight hydrating serum.',
    giftable: true,
    serviceKey: 'mellow_care',
    imageHint: 'clear serum bottle on sage tile',
    sourceModule: 'seed',
    createdAt: Date.now() - 4 * 60 * 1000,
    updatedAt: Date.now() - 4 * 60 * 1000,
  },
  {
    id: 'shopping_seed_care_lip',
    title: 'Mood Tint 雾面唇釉',
    titleEn: 'Mood Tint Soft-Matte Lip Color',
    category: 'beauty',
    price: '109.00',
    desc: '薄涂柔雾、叠涂显色的豆沙红。',
    descEn: 'A buildable muted-rose tint with a soft-matte finish.',
    giftable: true,
    serviceKey: 'mellow_care',
    imageHint: 'muted rose lip tint on coral block',
    sourceModule: 'seed',
    createdAt: Date.now() - 3 * 60 * 1000,
    updatedAt: Date.now() - 3 * 60 * 1000,
  },
  {
    id: 'shopping_seed_care_body',
    title: 'After Rain 身体乳',
    titleEn: 'After Rain Body Lotion',
    category: 'beauty',
    price: '128.00',
    desc: '干净绿叶香调与不黏腻的日常保湿。',
    descEn: 'Daily lightweight moisture with a clean green-leaf scent.',
    giftable: true,
    serviceKey: 'mellow_care',
    imageHint: 'sage body lotion pump bottle',
    sourceModule: 'seed',
    createdAt: Date.now() - 2 * 60 * 1000,
    updatedAt: Date.now() - 2 * 60 * 1000,
  },
  {
    id: 'shopping_seed_luxury_watch',
    title: '白金机械表',
    titleEn: 'Platinum Mechanical Watch',
    category: 'luxury',
    price: '6888.00',
    desc: '高价值收藏型商品，适合进入 Assets 特殊资产。',
    descEn: 'A limited mechanical piece suitable for transfer into Assets.',
    assetEligible: true,
    stockStatus: 'limited',
    serviceKey: 'style_cloud',
    imageHint: 'platinum watch on black editorial plinth',
    sourceModule: 'seed',
    createdAt: Date.now() - 1 * 60 * 1000,
    updatedAt: Date.now() - 1 * 60 * 1000,
  },
  {
    id: 'shopping_seed_mall_runner',
    title: '城市轻跑鞋',
    titleEn: 'City Runner Shoes',
    category: 'fashion',
    price: '239.00',
    desc: '轻量网布鞋面与柔韧缓震鞋底，适合日常通勤和轻运动。',
    descEn: 'Lightweight mesh runners with flexible cushioning for commutes and easy movement.',
    giftable: true,
    serviceKey: 'schat_mall',
    imageHint: 'white and grey running shoes with a small red accent',
    sourceModule: 'seed',
    createdAt: Date.now() - 31 * 60 * 1000,
    updatedAt: Date.now() - 31 * 60 * 1000,
  },
  {
    id: 'shopping_seed_mall_hand_cream',
    title: '屏障护手霜双支装',
    titleEn: 'Barrier Hand Cream Duo',
    category: 'beauty',
    price: '59.00',
    desc: '清爽与滋润两种质地，适合随身和居家分开放置。',
    descEn: 'A fresh and a rich texture for separate carry and at-home care.',
    giftable: true,
    serviceKey: 'schat_mall',
    imageHint: 'two unbranded hand cream tubes on a clean white set',
    sourceModule: 'seed',
    createdAt: Date.now() - 30 * 60 * 1000,
    updatedAt: Date.now() - 30 * 60 * 1000,
  },
  {
    id: 'shopping_seed_nova_carry_on',
    title: 'ATELIER 登机箱',
    titleEn: 'ATELIER Carry-On',
    category: 'luxury',
    price: '1899.00',
    desc: '低饱和铝灰箱体、静音轮组与分区内衬组成的耐用旅行物件。',
    descEn: 'A durable aluminum-grey travel case with quiet wheels and a divided interior.',
    assetEligible: true,
    serviceKey: 'nova_digital',
    imageHint: 'minimal aluminum grey carry on in an editorial studio',
    sourceModule: 'seed',
    createdAt: Date.now() - 29 * 60 * 1000,
    updatedAt: Date.now() - 29 * 60 * 1000,
  },
  {
    id: 'shopping_seed_nova_fountain_pen',
    title: 'LINE 金属钢笔',
    titleEn: 'LINE Fountain Pen',
    category: 'gifts',
    price: '329.00',
    desc: '细直金属笔身与顺滑书写笔尖，配原创无字礼盒。',
    descEn: 'A slender metal pen with a smooth nib and an original text-free gift case.',
    giftable: true,
    serviceKey: 'nova_digital',
    imageHint: 'minimal metal fountain pen and black gift case',
    sourceModule: 'seed',
    createdAt: Date.now() - 28 * 60 * 1000,
    updatedAt: Date.now() - 28 * 60 * 1000,
  },
  {
    id: 'shopping_seed_fashion_sole_care',
    title: '鞋履护理组',
    titleEn: 'Sole Care Kit',
    category: 'gifts',
    price: '168.00',
    desc: '清洁刷、护理布与无品牌护理瓶组成的便携工具组。',
    descEn: 'A portable set of cleaning brushes, care cloths, and unbranded treatment bottles.',
    giftable: true,
    serviceKey: 'style_cloud',
    imageHint: 'shoe care tools arranged on a dark editorial surface',
    sourceModule: 'seed',
    createdAt: Date.now() - 27 * 60 * 1000,
    updatedAt: Date.now() - 27 * 60 * 1000,
  },
  {
    id: 'shopping_seed_nordhus_mugs',
    title: 'DOT 马克杯对杯',
    titleEn: 'DOT Mug Pair',
    category: 'gifts',
    price: '69.00',
    desc: '蓝黄双色陶瓷对杯，为早餐桌和日常赠礼设计。',
    descEn: 'A blue-and-yellow ceramic pair made for breakfast tables and everyday gifting.',
    giftable: true,
    serviceKey: 'nordhus_home',
    imageHint: 'blue and yellow ceramic mug pair in soft breakfast light',
    sourceModule: 'seed',
    createdAt: Date.now() - 26 * 60 * 1000,
    updatedAt: Date.now() - 26 * 60 * 1000,
  },
  {
    id: 'shopping_seed_care_travel_minis',
    title: 'Pocket Care 旅行小样组',
    titleEn: 'Pocket Care Travel Minis',
    category: 'gifts',
    price: '99.00',
    desc: '五件基础护理小样与透明收纳袋组成的短途旅行组合。',
    descEn: 'Five daily-care minis packed in a clear pouch for short trips.',
    giftable: true,
    serviceKey: 'mellow_care',
    imageHint: 'five unbranded care minis in a clear travel pouch',
    sourceModule: 'seed',
    createdAt: Date.now() - 25 * 60 * 1000,
    updatedAt: Date.now() - 25 * 60 * 1000,
  },
  {
    id: 'shopping_seed_traders_pantry',
    title: '会员家庭米箱',
    titleEn: 'Member Family Rice Box',
    category: 'grocery',
    price: '398.00',
    desc: '适合一周家庭餐桌的整箱主食补给。',
    descEn: 'A bulk pantry staple sized for a week of family meals.',
    giftable: false,
    serviceKey: 'traders_club',
    imageHint: 'unbranded rice box and pantry crate on warehouse pallet',
    sourceModule: 'seed',
    createdAt: Date.now() - 24 * 60 * 1000,
    updatedAt: Date.now() - 24 * 60 * 1000,
  },
  {
    id: 'shopping_seed_traders_breakfast',
    title: '冷冻早餐组合箱',
    titleEn: 'Frozen Breakfast Case',
    category: 'grocery',
    price: '268.00',
    desc: '冷冻面包、果酱和咖啡豆组成的家庭早餐箱。',
    descEn: 'A family breakfast case with frozen bread, jam, and coffee beans.',
    giftable: false,
    serviceKey: 'traders_club',
    imageHint: 'unbranded frozen breakfast assortment in a cardboard case',
    sourceModule: 'seed',
    createdAt: Date.now() - 23 * 60 * 1000,
    updatedAt: Date.now() - 23 * 60 * 1000,
  },
  {
    id: 'shopping_seed_traders_towels',
    title: '柔软纸品整箱装',
    titleEn: 'Soft Paper Goods Case',
    category: 'home',
    price: '159.00',
    desc: '纸巾、厨房纸与湿巾组成的家庭补给组合。',
    descEn: 'A home restock case of tissues, kitchen rolls, and wipes.',
    giftable: false,
    serviceKey: 'traders_club',
    imageHint: 'unbranded paper goods stacked in a warehouse aisle',
    sourceModule: 'seed',
    createdAt: Date.now() - 22 * 60 * 1000,
    updatedAt: Date.now() - 22 * 60 * 1000,
  },
  {
    id: 'shopping_seed_traders_storage',
    title: '车库收纳大篮',
    titleEn: 'Garage Storage Bin Pair',
    category: 'home',
    price: '188.00',
    desc: '耐用塑料收纳篮，适合玄关、车库和储物间。',
    descEn: 'Durable storage bins for entryways, garages, and utility rooms.',
    giftable: false,
    serviceKey: 'traders_club',
    imageHint: 'large neutral storage bins on a warehouse shelf',
    sourceModule: 'seed',
    createdAt: Date.now() - 21 * 60 * 1000,
    updatedAt: Date.now() - 21 * 60 * 1000,
  },
  {
    id: 'shopping_seed_traders_snacks',
    title: '会员零食整箱',
    titleEn: 'Member Snack Case',
    category: 'grocery',
    price: '228.00',
    desc: '咸甜零食组合，适合放进办公室或家庭储物柜。',
    descEn: 'A sweet-and-savory snack case for the office or family pantry.',
    giftable: false,
    serviceKey: 'traders_club',
    imageHint: 'unbranded snack assortment in a warehouse case',
    sourceModule: 'seed',
    createdAt: Date.now() - 20 * 60 * 1000,
    updatedAt: Date.now() - 20 * 60 * 1000,
  },  {
    id: 'shopping_seed_traders_welcome',
    title: 'TRADERS 会员礼袋',
    titleEn: 'TRADERS Member Gift Bag',
    category: 'gifts',
    price: '79.00',
    desc: '可装入家庭补给的小型帆布礼袋。',
    descEn: 'A compact canvas gift bag for a practical household restock.',
    giftable: true,
    serviceKey: 'traders_club',
    imageHint: 'unbranded canvas tote with yellow warehouse label',
    sourceModule: 'seed',
    createdAt: Date.now() - 20 * 60 * 1000,
    updatedAt: Date.now() - 20 * 60 * 1000,
  },
  {
    id: 'shopping_seed_cu_kimbap',
    title: '夜行紫菜饭卷',
    titleEn: 'Night Route Kimbap Roll',
    category: 'grocery',
    price: '42.00',
    desc: '适合深夜下班路上的一人份简餐。',
    descEn: 'A one-person late-night meal for the commute home.',
    giftable: false,
    serviceKey: 'cu_24',
    imageHint: 'unbranded convenience store kimbap roll under fridge light',
    sourceModule: 'seed',
    createdAt: Date.now() - 19 * 60 * 1000,
    updatedAt: Date.now() - 19 * 60 * 1000,
  },
  {
    id: 'shopping_seed_cu_coffee',
    title: '现磨冰美式',
    titleEn: 'Fresh Brewed Iced Americano',
    category: 'grocery',
    price: '28.00',
    desc: '门店现磨咖啡，适合通勤和夜间工作。',
    descEn: 'A store-brewed coffee for commutes and late work sessions.',
    giftable: false,
    serviceKey: 'cu_24',
    imageHint: 'unbranded iced coffee cup on a convenience counter',
    sourceModule: 'seed',
    createdAt: Date.now() - 18 * 60 * 1000,
    updatedAt: Date.now() - 18 * 60 * 1000,
  },
  {
    id: 'shopping_seed_cu_drinks',
    title: '冰柜气泡饮双瓶',
    titleEn: 'Chilled Sparkling Drinks Duo',
    category: 'grocery',
    price: '24.00',
    desc: '清爽气泡饮双瓶，适合即刻取走。',
    descEn: 'A chilled sparkling drink duo made for an immediate grab.',
    giftable: false,
    serviceKey: 'cu_24',
    imageHint: 'two unbranded sparkling drink cans in a lit fridge',
    sourceModule: 'seed',
    createdAt: Date.now() - 17 * 60 * 1000,
    updatedAt: Date.now() - 17 * 60 * 1000,
  },
  {
    id: 'shopping_seed_cu_essentials',
    title: '雨夜应急包',
    titleEn: 'Rainy Night Essentials Kit',
    category: 'home',
    price: '55.00',
    desc: '折叠伞、湿巾和便携充电线组成的小包。',
    descEn: 'A small kit with a folding umbrella, wipes, and a charging cable.',
    giftable: true,
    serviceKey: 'cu_24',
    imageHint: 'unbranded convenience essentials kit near a checkout counter',
    sourceModule: 'seed',
    createdAt: Date.now() - 16 * 60 * 1000,
    updatedAt: Date.now() - 16 * 60 * 1000,
  },
  {
    id: 'shopping_seed_cu_socks',
    title: '通勤备用袜',
    titleEn: 'Commute Backup Socks',
    category: 'home',
    price: '19.00',
    desc: '一双可放进办公室抽屉的轻薄备用袜。',
    descEn: 'A lightweight spare pair to keep in an office drawer.',
    giftable: false,
    serviceKey: 'cu_24',
    imageHint: 'unbranded folded socks on a small convenience shelf',
    sourceModule: 'seed',
    createdAt: Date.now() - 15 * 60 * 1000,
    updatedAt: Date.now() - 15 * 60 * 1000,
  },
  {
    id: 'shopping_seed_musinsa_tee',
    title: '空白线条宽版T恤',
    titleEn: 'Blank Line Oversized Tee',
    category: 'fashion',
    price: '129.00',
    desc: '干净廓形与宽肩线，适合叠穿。',
    descEn: 'A clean oversized shape with a wide shoulder line for layering.',
    giftable: true,
    serviceKey: 'musinsa_style',
    imageHint: 'editorial oversized white t-shirt on a black studio rack',
    sourceModule: 'seed',
    createdAt: Date.now() - 14 * 60 * 1000,
    updatedAt: Date.now() - 14 * 60 * 1000,
  },
  {
    id: 'shopping_seed_musinsa_denim',
    title: '低腰直筒牛仔裤',
    titleEn: 'Low-Rise Straight Denim',
    category: 'fashion',
    price: '249.00',
    desc: '硬挺牛仔布与干净直筒线条，适合城市通勤。',
    descEn: 'Rigid denim with a clean straight line for city commutes.',
    giftable: false,
    serviceKey: 'musinsa_style',
    imageHint: 'editorial straight denim trousers on a concrete floor',
    sourceModule: 'seed',
    createdAt: Date.now() - 13 * 60 * 1000,
    updatedAt: Date.now() - 13 * 60 * 1000,
  },
  {
    id: 'shopping_seed_musinsa_hoodie',
    title: '雾灰连帽卫衣',
    titleEn: 'Fog Grey Hooded Sweatshirt',
    category: 'fashion',
    price: '219.00',
    desc: '厚实棉质与宽松肩型，适合秋季叠搭。',
    descEn: 'Heavy cotton and a relaxed shoulder for autumn layering.',
    giftable: true,
    serviceKey: 'musinsa_style',
    imageHint: 'editorial fog grey hoodie against a red wall',
    sourceModule: 'seed',
    createdAt: Date.now() - 12 * 60 * 1000,
    updatedAt: Date.now() - 12 * 60 * 1000,
  },
  {
    id: 'shopping_seed_musinsa_sling',
    title: '夜行尼龙斜挎包',
    titleEn: 'Night Route Nylon Sling',
    category: 'fashion',
    price: '159.00',
    desc: '轻量尼龙面料，配可调节机能肩带。',
    descEn: 'Light nylon with an adjustable utility strap.',
    giftable: true,
    serviceKey: 'musinsa_style',
    imageHint: 'black nylon sling bag in a graphic fashion editorial',
    sourceModule: 'seed',
    createdAt: Date.now() - 11 * 60 * 1000,
    updatedAt: Date.now() - 11 * 60 * 1000,
  },
  {
    id: 'shopping_seed_musinsa_giftcard',
    title: '风格编辑礼卡',
    titleEn: 'Style Edit Gift Card',
    category: 'gifts',
    price: '200.00',
    desc: '给喜欢自己搭配的人一张自由选品礼卡。',
    descEn: 'A flexible gift card for someone who styles their own route.',
    giftable: true,
    serviceKey: 'musinsa_style',
    imageHint: 'minimal black fashion gift card with red accent',
    sourceModule: 'seed',
    createdAt: Date.now() - 10 * 60 * 1000,
    updatedAt: Date.now() - 10 * 60 * 1000,
  },
  {
    id: 'shopping_seed_boon_jacket',
    title: '手工羊毛短外套',
    titleEn: 'Hand-Finished Wool Jacket',
    category: 'luxury',
    price: '2680.00',
    desc: '柔和肩线与手工感边缘，适合作为衣橱核心。',
    descEn: 'Soft shoulders and hand-finished edges for a wardrobe anchor.',
    assetEligible: true,
    stockStatus: 'limited',
    serviceKey: 'boon_select',
    imageHint: 'quiet luxury wool jacket on an atelier rail',
    sourceModule: 'seed',
    createdAt: Date.now() - 9 * 60 * 1000,
    updatedAt: Date.now() - 9 * 60 * 1000,
  },
  {
    id: 'shopping_seed_boon_leather',
    title: '植物鞣皮革手袋',
    titleEn: 'Vegetable-Tanned Leather Tote',
    category: 'luxury',
    price: '1680.00',
    desc: '会随使用留下痕迹的结构化皮革手袋。',
    descEn: 'A structured leather tote designed to develop a personal patina.',
    assetEligible: true,
    serviceKey: 'boon_select',
    imageHint: 'unbranded vegetable tanned leather tote in warm atelier light',
    sourceModule: 'seed',
    createdAt: Date.now() - 8 * 60 * 1000,
    updatedAt: Date.now() - 8 * 60 * 1000,
  },
  {
    id: 'shopping_seed_boon_shirt',
    title: '定制感白衬衫',
    titleEn: 'Bespoke-Feel White Shirt',
    category: 'fashion',
    price: '790.00',
    desc: '微宽领口与可调整袖口，适合正式与日常之间。',
    descEn: 'A relaxed collar and adjustable cuff for formal-to-daily dressing.',
    giftable: true,
    serviceKey: 'boon_select',
    imageHint: 'white bespoke style shirt on a cream fitting room wall',
    sourceModule: 'seed',
    createdAt: Date.now() - 7 * 60 * 1000,
    updatedAt: Date.now() - 7 * 60 * 1000,
  },
  {
    id: 'shopping_seed_boon_scarf',
    title: '丝毛混纺窄围巾',
    titleEn: 'Silk-Wool Narrow Scarf',
    category: 'gifts',
    price: '420.00',
    desc: '轻薄丝毛混纺，适合作为低调礼物。',
    descEn: 'A lightweight silk-wool blend made for a quiet gift.',
    giftable: true,
    serviceKey: 'boon_select',
    imageHint: 'silk wool scarf folded on a stone atelier table',
    sourceModule: 'seed',
    createdAt: Date.now() - 6 * 60 * 1000,
    updatedAt: Date.now() - 6 * 60 * 1000,
  },
  {
    id: 'shopping_seed_boon_shoes',
    title: '手工皮革便鞋',
    titleEn: 'Hand-Finished Leather Loafers',
    category: 'luxury',
    price: '1980.00',
    desc: '圆润鞋楦与柔软皮面，适合长时间城市行走。',
    descEn: 'A rounded last and soft leather upper for long city walks.',
    assetEligible: true,
    stockStatus: 'limited',
    serviceKey: 'boon_select',
    imageHint: 'unbranded leather loafers on a burgundy plinth',
    sourceModule: 'seed',
    createdAt: Date.now() - 5 * 60 * 1000,
    updatedAt: Date.now() - 5 * 60 * 1000,
  },
  {
    id: 'shopping_seed_galleria_watch',
    title: '月相贵金属腕表',
    titleEn: 'Moonphase Precious-Metal Watch',
    category: 'luxury',
    price: '12800.00',
    desc: '以时间显示与材质细节为主角的典藏型腕表。',
    descEn: 'A collectible watch centered on time display and material detail.',
    assetEligible: true,
    stockStatus: 'limited',
    serviceKey: 'galleria_luxury',
    imageHint: 'unbranded precious metal watch in a dark luxury hall',
    sourceModule: 'seed',
    createdAt: Date.now() - 4 * 60 * 1000,
    updatedAt: Date.now() - 4 * 60 * 1000,
  },
  {
    id: 'shopping_seed_galleria_bag',
    title: '结构感晚宴手袋',
    titleEn: 'Structured Evening Minaudiere',
    category: 'luxury',
    price: '8600.00',
    desc: '硬挺结构与低调金属扣件组成的晚间手袋。',
    descEn: 'A structured evening bag with discreet metal hardware.',
    assetEligible: true,
    stockStatus: 'limited',
    serviceKey: 'galleria_luxury',
    imageHint: 'unbranded structured evening bag under a gallery spotlight',
    sourceModule: 'seed',
    createdAt: Date.now() - 3 * 60 * 1000,
    updatedAt: Date.now() - 3 * 60 * 1000,
  },
  {
    id: 'shopping_seed_galleria_coat',
    title: '长线条羊绒大衣',
    titleEn: 'Longline Cashmere Coat',
    category: 'fashion',
    price: '6200.00',
    desc: '克制肩线与长比例，适合正式城市衣橱。',
    descEn: 'A restrained shoulder and long proportion for a formal city wardrobe.',
    assetEligible: true,
    serviceKey: 'galleria_luxury',
    imageHint: 'unbranded long cashmere coat in a navy luxury interior',
    sourceModule: 'seed',
    createdAt: Date.now() - 2 * 60 * 1000,
    updatedAt: Date.now() - 2 * 60 * 1000,
  },
  {
    id: 'shopping_seed_galleria_silk',
    title: '典藏丝巾礼盒',
    titleEn: 'Archive Silk Scarf Gift Set',
    category: 'gifts',
    price: '980.00',
    desc: '原创抽象图案丝巾与硬盒包装组成的礼赠套装。',
    descEn: 'An original abstract silk scarf with a structured gift box.',
    giftable: true,
    serviceKey: 'galleria_luxury',
    imageHint: 'abstract silk scarf and box on a navy velvet surface',
    sourceModule: 'seed',
    createdAt: Date.now() - 1 * 60 * 1000,
    updatedAt: Date.now() - 1 * 60 * 1000,
  },
  {
    id: 'shopping_seed_galleria_jewelry',
    title: '白金线条耳饰',
    titleEn: 'Platinum Line Earrings',
    category: 'luxury',
    price: '5400.00',
    desc: '以细线与光泽变化表达克制存在感的耳饰。',
    descEn: 'Minimal earrings shaped by fine lines and controlled shine.',
    assetEligible: true,
    stockStatus: 'limited',
    serviceKey: 'galleria_luxury',
    imageHint: 'unbranded platinum line earrings on a dark velvet plinth',
    sourceModule: 'seed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  ...createCatalogExpansionSeedProducts(),
])

const mergeMissingSeedProducts = (currentProducts = []) => {
  const currentIds = new Set(currentProducts.map((product) => product.id))
  const missingSeeds = createSeedProducts().filter((product) => !currentIds.has(product.id))
  return missingSeeds.length > 0
    ? normalizeShoppingProducts([...currentProducts, ...missingSeeds])
    : currentProducts
}

export const useShoppingStore = defineStore('shopping', () => {
  const getCalendarStore = () => useCalendarStore()
  const getChatStore = () => useChatStore()
  const getWalletStore = () => useWalletStore()
  const products = ref([])
  const favoriteProductIds = ref([])
  const cartItems = ref([])
  const orders = ref([])
  const serviceCases = ref([])
  const interactionTriggers = ref([])
  const hasFinishedStorageHydration = ref(false)

  const productMap = computed(() => new Map(products.value.map((product) => [product.id, product])))
  const productCount = computed(() => products.value.length)
  const favoriteCount = computed(() => favoriteProductIds.value.length)
  const cartItemCount = computed(() => cartItems.value.length)
  const cartQuantity = computed(() =>
    cartItems.value.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
  )
  const orderCount = computed(() => orders.value.length)
  const favoriteProducts = computed(() =>
    favoriteProductIds.value
      .map((productId) => productMap.value.get(productId))
      .filter(Boolean),
  )
  const cartLineItems = computed(() =>
    cartItems.value
      .map((item) => {
        const product = productMap.value.get(item.productId)
        if (!product) return null
        const subtotalCents = product.priceCents * item.quantity
        return {
          ...item,
          product,
          subtotalCents,
          subtotal: formatAmount(subtotalCents),
          currency: product.currency,
        }
      })
      .filter(Boolean),
  )
  const cartTotals = computed(() =>
    summarizeOrderTotals(
      cartLineItems.value.map((line) => ({
        productId: line.productId,
        title: line.product.title,
        category: line.product.category,
        serviceKey: line.product.serviceKey,
        serviceLabel:
          SHOPPING_SERVICE_PRESETS.find((service) => service.key === line.product.serviceKey)?.en ||
          line.product.serviceKey,
        quantity: line.quantity,
        unitPriceCents: line.product.priceCents,
        currency: line.product.currency,
      })),
    ),
  )
  const cartPrimaryTotal = computed(() =>
    cartTotals.value.find((item) => item.currency === DEFAULT_CURRENCY) || cartTotals.value[0] || {
      currency: DEFAULT_CURRENCY,
      amountCents: 0,
      amount: '0.00',
    },
  )

  const findProductById = (productId) => {
    const id = normalizeProductId(productId)
    if (!id) return null
    return productMap.value.get(id) || null
  }

  const findOrderById = (orderId) => {
    const id = normalizeText(orderId, '', 140)
    if (!id) return null
    return orders.value.find((order) => order.id === id) || null
  }

  const getCommerceOrderReference = (orderId = '') => {
    const order = findOrderById(orderId)
    if (!order) return null
    return normalizeCommerceOrderReferenceV1(
      {
        schemaVersion: 1,
        ownerModule: 'shopping',
        orderId: order.id,
        merchantId: order.items[0]?.serviceKey || '',
        lineItemIds: order.items.map((item) => item.productId || item.id),
        ownerRevision: order.ownerRevision,
        sourceRoute: `/shopping?orderId=${encodeURIComponent(order.id)}`,
      },
      { mutationCapable: true },
    )
  }

  const findServiceCaseById = (caseId = '') => {
    const id = normalizeText(caseId, '', 220)
    return serviceCases.value.find((item) => item.id === id) || null
  }

  const beginOrderServiceInteraction = ({
    orderId = '',
    userAction = '',
    destinationAnchor = null,
    entrySurface = COMMERCE_INTERACTION_ENTRY_SURFACE.OWNER_APP,
    sourceMessageRef = null,
    interactionId = '',
    now = Date.now(),
  } = {}) => {
    const order = findOrderById(orderId)
    const orderRef = getCommerceOrderReference(orderId)
    if (!order || !orderRef || [SHOPPING_ORDER_STATUS.COMPLETED, SHOPPING_ORDER_STATUS.CANCELLED].includes(order.status)) {
      return { ok: false, reason: 'order_missing_or_closed', trigger: null, serviceCase: null }
    }
    const sourceRef = sourceMessageRef || {
      ownerModule: entrySurface === COMMERCE_INTERACTION_ENTRY_SURFACE.CHAT_SERVICE_ACCOUNT
        ? 'chat'
        : 'shopping',
      messageId: `shopping_action_${order.id}_${normalizeText(userAction, 'support', 80)}`,
    }
    const trigger = normalizeCommerceInteractionTriggerV1({
      schemaVersion: 1,
      id: interactionId || `shopping_interaction_${order.id}_${sourceRef.messageId}`,
      kind: 'commerce.user_service_interaction',
      initiatedBy: 'user',
      entrySurface,
      channel: 'platform',
      userAction,
      orderRef,
      sourceMessageRef: sourceRef,
      occurredAt: now,
    })
    if (!trigger) return { ok: false, reason: 'interaction_trigger_invalid', trigger: null, serviceCase: null }
    const existingTrigger = interactionTriggers.value.find((item) => item.id === trigger.id)
    if (existingTrigger && JSON.stringify(existingTrigger) !== JSON.stringify(trigger)) {
      return { ok: false, reason: 'interaction_trigger_conflict', trigger: null, serviceCase: null }
    }
    if (!existingTrigger) {
      interactionTriggers.value = [trigger, ...interactionTriggers.value].slice(
        0,
        SHOPPING_INTERACTION_TRIGGER_LIMIT,
      )
    }
    const caseType = userAction === 'destination_change_requested' ? 'destination_change' : userAction
    const caseId = `shopping_service_case_${order.id}_${caseType}`
    const existing = findServiceCaseById(caseId)
    const serviceCase = normalizeShoppingServiceCase({
      ...(existing || {}),
      id: caseId,
      orderId: order.id,
      caseType,
      status: COMMERCE_SERVICE_CASE_STATUS.OPEN,
      requestedDestination: destinationAnchor || existing?.requestedDestination,
      sourceInteractionId: existing?.sourceInteractionId || trigger.id,
      sourceMessageRef: existing?.sourceMessageRef?.messageId
        ? existing.sourceMessageRef
        : trigger.sourceMessageRef,
      ownerRevision: existing ? existing.ownerRevision + 1 : 1,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    })
    if (!serviceCase) return { ok: false, reason: 'service_case_invalid', trigger, serviceCase: null }
    serviceCases.value = [
      serviceCase,
      ...serviceCases.value.filter((item) => item.id !== serviceCase.id),
    ].slice(0, SHOPPING_SERVICE_CASE_LIMIT)
    return { ok: true, reason: '', trigger: existingTrigger || trigger, serviceCase }
  }

  const commitOrderDestinationChange = ({
    caseId = '',
    destinationAnchor = null,
    expectedOwnerRevision = 0,
    now = Date.now(),
  } = {}) => {
    const serviceCase = findServiceCaseById(caseId)
    const order = serviceCase ? findOrderById(serviceCase.orderId) : null
    const destination = normalizeShoppingDestination(
      destinationAnchor || serviceCase?.requestedDestination,
    )
    if (!serviceCase || !order || !destination) return { ok: false, reason: 'destination_change_invalid', order: null, serviceCase: null }
    if (expectedOwnerRevision && order.ownerRevision !== expectedOwnerRevision) {
      return { ok: false, reason: 'order_revision_stale', order: null, serviceCase }
    }
    order.deliveryAnchor = { ...destination, revision: order.ownerRevision + 1 }
    order.deliveryAddress = destination.detail
    order.ownerRevision += 1
    order.updatedAt = now
    serviceCase.status = COMMERCE_SERVICE_CASE_STATUS.RESOLVED
    serviceCase.requestedDestination = destination
    serviceCase.ownerRevision += 1
    serviceCase.resolutionCode = 'destination_changed'
    serviceCase.updatedAt = now
    addOrderEvent(order.id, {
      type: SHOPPING_ORDER_EVENT_TYPE.STATUS_UPDATE,
      title: 'Delivery address updated',
      summary: `The order will be delivered to ${destination.detail}.`,
      deliveryAddress: destination.detail,
      createdAt: now,
    })
    return { ok: true, reason: '', order, serviceCase }
  }

  const listProductsByCategory = (category = '') => {
    const normalized = normalizeCategory(category, '')
    if (!normalized) return products.value.slice()
    return products.value.filter((product) => product.category === normalized)
  }

  const listProductsByService = (serviceKey = '') => {
    const normalized = normalizeServiceKey(serviceKey, '')
    if (!normalized) return products.value.slice()
    return products.value.filter((product) => product.serviceKey === normalized)
  }

  const listFavoriteProductsByService = (serviceKey = '') => {
    const normalized = normalizeExistingServiceKey(serviceKey)
    if (!normalized) return favoriteProducts.value.slice()
    return favoriteProducts.value.filter((product) => product.serviceKey === normalized)
  }

  const getFavoriteCountByService = (serviceKey = '') =>
    listFavoriteProductsByService(serviceKey).length

  const listCartLineItemsByService = (serviceKey = '') => {
    const normalized = normalizeExistingServiceKey(serviceKey)
    if (!normalized) return cartLineItems.value.slice()
    return cartLineItems.value.filter((line) => line.product.serviceKey === normalized)
  }

  const getCartQuantityByService = (serviceKey = '') =>
    listCartLineItemsByService(serviceKey).reduce(
      (sum, line) => sum + Math.max(0, Number(line.quantity) || 0),
      0,
    )

  const getCartPrimaryTotalByService = (serviceKey = '') => {
    const totals = summarizeOrderTotals(
      listCartLineItemsByService(serviceKey).map((line) => ({
        productId: line.productId,
        title: line.product.title,
        category: line.product.category,
        serviceKey: line.product.serviceKey,
        serviceLabel: resolveServiceLabel(line.product.serviceKey),
        quantity: line.quantity,
        unitPriceCents: line.product.priceCents,
        currency: line.product.currency,
      })),
    )
    return totals.find((item) => item.currency === DEFAULT_CURRENCY) || totals[0] || {
      currency: DEFAULT_CURRENCY,
      amountCents: 0,
      amount: '0.00',
    }
  }

  const listOrdersByService = (serviceKey = '') => {
    const normalized = normalizeExistingServiceKey(serviceKey)
    if (!normalized) return orders.value.slice()
    return orders.value.filter((order) => order.items?.[0]?.serviceKey === normalized)
  }

  const getOrderCountByService = (serviceKey = '') => listOrdersByService(serviceKey).length

  const isProductFavorite = (productId) => favoriteProductIds.value.includes(normalizeProductId(productId))

  const upsertProduct = (input = {}) => {
    const now = Date.now()
    const product = normalizeShoppingProduct({
      ...input,
      id: normalizeProductId(input.id) || createShoppingProductId(),
      createdAt: input.createdAt || now,
      updatedAt: now,
    })
    if (!product) return null

    const existingIndex = products.value.findIndex((item) => item.id === product.id)
    if (existingIndex >= 0) {
      products.value.splice(existingIndex, 1, {
        ...products.value[existingIndex],
        ...product,
        createdAt: products.value[existingIndex].createdAt,
      })
      return products.value[existingIndex]
    }

    products.value.unshift(product)
    if (products.value.length > SHOPPING_PRODUCT_LIMIT) products.value.splice(SHOPPING_PRODUCT_LIMIT)
    return product
  }

  const setProductFavorite = (productId, favorite = true) => {
    const product = findProductById(productId)
    if (!product) return false
    const id = product.id
    const exists = favoriteProductIds.value.includes(id)
    if (favorite && !exists) favoriteProductIds.value = [id, ...favoriteProductIds.value]
    if (!favorite && exists) favoriteProductIds.value = favoriteProductIds.value.filter((item) => item !== id)
    return true
  }

  const toggleProductFavorite = (productId) => {
    const product = findProductById(productId)
    if (!product) return false
    return setProductFavorite(product.id, !isProductFavorite(product.id))
  }

  const addToCart = (productId, quantity = 1, options = {}) => {
    const product = findProductById(productId)
    if (!product || product.stockStatus === 'sold_out') return null
    const normalizedQuantity = normalizeQuantity(quantity)
    const now = Date.now()
    const existing = cartItems.value.find((item) => item.productId === product.id)
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + normalizedQuantity)
      existing.updatedAt = now
      return existing
    }
    const item = {
      productId: product.id,
      quantity: normalizedQuantity,
      sourceModule: normalizeText(options.sourceModule, 'shopping_cart', 40),
      sourceId: normalizeText(options.sourceId, '', 140),
      addedAt: now,
      updatedAt: now,
    }
    cartItems.value.unshift(item)
    if (cartItems.value.length > SHOPPING_CART_LINE_LIMIT) cartItems.value.splice(SHOPPING_CART_LINE_LIMIT)
    return item
  }

  const updateCartQuantity = (productId, quantity = 1) => {
    const id = normalizeProductId(productId)
    const item = cartItems.value.find((line) => line.productId === id)
    if (!item) return false
    const nextQuantity = toInt(quantity, item.quantity)
    if (nextQuantity <= 0) {
      cartItems.value = cartItems.value.filter((line) => line.productId !== id)
      return true
    }
    item.quantity = normalizeQuantity(nextQuantity)
    item.updatedAt = Date.now()
    return true
  }

  const removeFromCart = (productId) => {
    const id = normalizeProductId(productId)
    const before = cartItems.value.length
    cartItems.value = cartItems.value.filter((item) => item.productId !== id)
    return cartItems.value.length !== before
  }

  const clearCart = (serviceKey = '') => {
    const normalized = normalizeExistingServiceKey(serviceKey)
    if (!normalized) {
      const removed = cartItems.value.length
      cartItems.value = []
      return removed
    }
    const before = cartItems.value.length
    cartItems.value = cartItems.value.filter(
      (item) => productMap.value.get(item.productId)?.serviceKey !== normalized,
    )
    const removed = before - cartItems.value.length
    return removed
  }

  const pushShoppingOrderServiceMessage = (order = {}) => {
    const serviceKey = normalizeServiceKey(order.items?.[0]?.serviceKey || '', order.items?.[0]?.category)
    if (!serviceKey) return null
    const chatStore = getChatStore()
    const serviceContact = chatStore.findShoppingServiceContact(serviceKey)
    if (!serviceContact) return null

    return chatStore.appendServiceNotification(serviceContact.id, {
      kind: CHAT_SERVICE_NOTIFICATION_KIND.SHOPPING_ORDER,
      title: `Order placed · ${orderItemSummary(order)}`,
      summary: `We received your ${orderItemSummary(order)} order. Shopping keeps checkout and order state; this thread only carries service updates.`,
      statusLabel: shoppingStatusLabel(order.status),
      amount: formatOrderAmount(order),
      sourceModule: SHOPPING_SOURCE_KEYS.ORDER_UPDATE,
      sourceId: order.id,
      sharedExperienceId: order.sharedExperienceId,
      serviceKey,
      serviceLabel: resolveServiceLabel(serviceKey),
      route: buildShoppingOrderRoute(order),
      actions: [
        {
          label: 'View order',
          route: buildShoppingOrderRoute(order),
        },
      ],
      createdAt: order.createdAt,
    })
  }

  const pushShoppingLogisticsServiceMessage = (order = {}, event = {}) => {
    const serviceKey = LOGISTICS_EVENT_SERVICE_KEY[event.type] || 'standard_courier'
    const chatStore = getChatStore()
    const serviceContact = chatStore.findLogisticsServiceContact(serviceKey)
    if (!serviceContact) return null

    const carrierLabel = event.carrierName || serviceContact.name || 'Logistics'
    return chatStore.appendServiceNotification(serviceContact.id, {
      kind: CHAT_SERVICE_NOTIFICATION_KIND.LOGISTICS_UPDATE,
      title: `${event.title || 'Logistics update'} · ${orderTitle(order)}`,
      summary:
        event.summary ||
        `${carrierLabel} updated the parcel for ${orderItemSummary(order)}. Shopping keeps the order; Logistics only carries the tracking message.`,
      statusLabel: logisticsStatusLabel(event),
      amount: formatOrderAmount(order),
      sourceModule: SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING,
      sourceId: order.id,
      sourceEventId: event.id,
      sharedExperienceId: order.sharedExperienceId,
      serviceKey,
      serviceLabel: carrierLabel,
      route: buildShoppingLogisticsRoute(order),
      actions: [
        {
          label: 'Open logistics',
          route: buildShoppingLogisticsRoute(order),
        },
      ],
      createdAt: event.createdAt,
    })
  }

  const checkoutCart = ({
    orderId = '',
    serviceKey = '',
    note = '',
    recipient = '',
    recipientPhone = '',
    giftRecipient = null,
    deliveryAddress = '',
    deliveryAnchor = null,
    paymentRef = null,
    quoteSnapshot: providedQuoteSnapshot = null,
    sourceModule = 'shopping_checkout',
    sourceId = '',
    createdAt = Date.now(),
  } = {}) => {
    const requestedServiceKey = normalizeText(serviceKey, '', 40)
    const scopedServiceKey = normalizeExistingServiceKey(requestedServiceKey)
    if (requestedServiceKey && !scopedServiceKey) return null
    const lines = scopedServiceKey
      ? listCartLineItemsByService(scopedServiceKey)
      : cartLineItems.value
    if (lines.length === 0) return null
    const now = Math.max(0, toInt(createdAt, Date.now()))
    const sourceTotal = scopedServiceKey
      ? getCartPrimaryTotalByService(scopedServiceKey)
      : cartPrimaryTotal.value
    const walletStore = getWalletStore()
    const sourceMoney = convertLegacyCentsToMoney(
      sourceTotal.amountCents,
      sourceTotal.currency,
      walletStore.currencyOptions,
    )
    const quoteSnapshot = normalizeMoneyQuote(providedQuoteSnapshot) || (sourceMoney
      ? walletStore.quoteMoney(sourceMoney, walletStore.primaryCurrency, { quotedAt: now })
      : null)
    const order = normalizeShoppingOrder({
      id: normalizeText(orderId, createShoppingOrderId(), 140),
      status: SHOPPING_ORDER_STATUS.PLACED,
      items: lines.map((line) => ({
        id: `${line.productId}_${line.addedAt}`,
        productId: line.productId,
        title: line.product.title,
        category: line.product.category,
        serviceKey: line.product.serviceKey,
        serviceLabel: resolveServiceLabel(line.product.serviceKey),
        quantity: line.quantity,
        unitPriceCents: line.product.priceCents,
        currency: line.product.currency,
        assetEligible: line.product.assetEligible,
        giftable: line.product.giftable,
      })),
      note,
      recipient,
      recipientPhone,
      giftRecipient,
      deliveryAddress,
      deliveryAnchor,
      paymentRef,
      quoteSnapshot: quoteSnapshot?.ok ? quoteSnapshot : null,
      sourceModule: normalizeText(sourceModule, SHOPPING_SOURCE_KEYS.ORDER_UPDATE, 40),
      sourceId,
      createdAt: now,
      updatedAt: now,
    })
    if (!order) return null
    orders.value.unshift(order)
    if (orders.value.length > SHOPPING_ORDER_LIMIT) orders.value.splice(SHOPPING_ORDER_LIMIT)
    getCalendarStore().upsertShoppingDeliveryCueFromOrder(order)
    pushShoppingOrderServiceMessage(order)
    clearCart(scopedServiceKey)
    return order
  }

  const checkoutCartWithPayment = ({
    serviceKey = '',
    note = '',
    recipient = '',
    recipientPhone = '',
    giftRecipient = null,
    deliveryAnchor = null,
    accountId = '',
    cardId = '',
    idempotencyKey = '',
    sourceModule = 'shopping_paid_checkout',
    sourceId = '',
    now = Date.now(),
  } = {}) => {
    const scopedServiceKey = normalizeExistingServiceKey(normalizeText(serviceKey, '', 40))
    const normalizedIdempotencyKey = normalizeText(idempotencyKey, '', 180)
    const walletStore = getWalletStore()
    const existingPayment = normalizedIdempotencyKey
      ? walletStore.findCommercePaymentByIdempotencyKey(normalizedIdempotencyKey)
      : null
    if (existingPayment) {
      const existingOrder = orders.value.find(
        (item) => item.paymentRef?.transactionId === existingPayment.id,
      ) || null
      if (existingOrder) {
        return {
          ok: true,
          reason: 'idempotent_replay',
          order: existingOrder,
          payment: { ok: true, reason: 'idempotent_replay', transaction: existingPayment },
        }
      }
      walletStore.reverseCommercePayment({
        transactionId: existingPayment.id,
        reason: 'Shopping payment has no confirmed order',
        createdAt: now,
      })
      return {
        ok: false,
        stage: 'payment',
        reason: 'payment_without_order_reversed',
        order: null,
        payment: { ok: true, reason: 'idempotent_replay', transaction: existingPayment },
      }
    }
    const lines = scopedServiceKey ? listCartLineItemsByService(scopedServiceKey) : []
    const normalizedAnchor = normalizeShoppingDestination(deliveryAnchor)
    if (!scopedServiceKey || lines.length === 0) {
      return { ok: false, stage: 'order', reason: 'cart_empty', order: null, payment: null }
    }
    if (!normalizedAnchor) {
      return { ok: false, stage: 'map', reason: 'delivery_anchor_required', order: null, payment: null }
    }
    if (!normalizeText(recipient, '', 120)) {
      return { ok: false, stage: 'recipient', reason: 'recipient_required', order: null, payment: null }
    }

    const sourceTotal = getCartPrimaryTotalByService(scopedServiceKey)
    const sourceMoney = convertLegacyCentsToMoney(
      sourceTotal.amountCents,
      sourceTotal.currency,
      walletStore.currencyOptions,
    )
    const quoteSnapshot = sourceMoney
      ? walletStore.quoteMoney(sourceMoney, walletStore.primaryCurrency, { quotedAt: now })
      : null
    if (!quoteSnapshot?.ok || !quoteSnapshot.quotedMoney?.amountMinor) {
      return { ok: false, stage: 'payment', reason: 'quote_unavailable', order: null, payment: null }
    }

    const orderId = createShoppingOrderId()
    const payment = walletStore.commitCommercePayment({
      amountCents: quoteSnapshot.quotedMoney.amountMinor,
      currency: quoteSnapshot.quotedMoney.currency,
      accountId,
      cardId,
      counterparty: resolveServiceLabel(scopedServiceKey),
      note: note || `Shopping order ${orderId}`,
      sourceModule: SHOPPING_SOURCE_KEYS.WALLET_EXPENSE,
      sourceId: orderId,
      idempotencyKey: normalizedIdempotencyKey || `shopping_checkout:${orderId}`,
      quoteSnapshot,
      createdAt: now,
    })
    if (!payment.ok) {
      return { ok: false, stage: 'payment', reason: payment.reason, order: null, payment }
    }

    const order = checkoutCart({
      orderId,
      serviceKey: scopedServiceKey,
      note,
      recipient,
      recipientPhone,
      giftRecipient,
      deliveryAddress: normalizedAnchor.detail,
      deliveryAnchor: normalizedAnchor,
      paymentRef: {
        transactionId: payment.transaction.id,
        receiptNumber: payment.transaction.receiptNumber,
        status: payment.transaction.paymentStatus,
        idempotencyKey: payment.transaction.idempotencyKey,
        sourceModule: payment.transaction.sourceModule,
        sourceId: payment.transaction.sourceId,
        accountId: payment.transaction.accountId,
        cardId: payment.transaction.cardId,
        amountCents: payment.transaction.amountCents,
        currency: payment.transaction.currency,
        createdAt: payment.transaction.createdAt,
      },
      quoteSnapshot,
      sourceModule,
      sourceId,
      createdAt: now,
    })
    if (!order) {
      walletStore.reverseCommercePayment({
        transactionId: payment.transaction.id,
        reason: 'Shopping order creation failed',
        createdAt: now,
      })
      return { ok: false, stage: 'order', reason: 'order_invalid', order: null, payment }
    }
    return { ok: true, reason: '', order, payment }
  }

  const removeOrder = (orderId) => {
    const id = normalizeText(orderId, '', 140)
    const before = orders.value.length
    orders.value = orders.value.filter((order) => order.id !== id)
    const removed = orders.value.length !== before
    if (removed) getCalendarStore().dismissShoppingDeliveryCueByOrderId(id)
    return removed
  }

  const neutralizeRelationshipOrder = (
    orderId,
    profile = {},
    replacementName = 'Someone',
  ) => {
    const order = findOrderById(orderId)
    if (!order) return false
    if (!bindingMatchesProfile(order.giftRecipient, profile)) return false
    const nextName = normalizeText(replacementName, 'Someone', 120)
    order.recipient = nextName
    order.note = anonymizeRelationshipText(order.note, profile?.name, nextName)
    order.giftRecipient = clearRelationshipBinding()
    order.updatedAt = Date.now()
    return true
  }

  const cleanupRelationshipForProfile = (profile = {}, options = {}) => {
    const mode = normalizeText(options.cleanupMode, 'delete_role', 60)
    const replacementName = normalizeText(options.replacementName, 'Someone', 120)
    const matchedOrders = orders.value.filter((order) =>
      bindingMatchesProfile(order.giftRecipient, profile),
    )

    let removedCount = 0
    let unlinkedCount = 0
    matchedOrders.forEach((order) => {
      if (mode === 'delete_role') {
        if (removeOrder(order.id)) removedCount += 1
        return
      }
      if (neutralizeRelationshipOrder(order.id, profile, replacementName)) {
        unlinkedCount += 1
      }
    })

    return {
      ok: removedCount > 0 || unlinkedCount > 0 || matchedOrders.length === 0,
      removedCount,
      unlinkedCount,
      anonymizedCount: unlinkedCount,
      updatedCount: unlinkedCount,
    }
  }

  const updateOrderStatus = (orderId, status) => {
    const id = normalizeText(orderId, '', 140)
    const nextStatus = normalizeOrderStatus(status, '')
    if (!id || !nextStatus) return false
    const order = orders.value.find((item) => item.id === id)
    if (!order || order.status === nextStatus) return false

    order.status = nextStatus
    const now = Date.now()
    order.updatedAt = now
    order.ownerRevision = Math.max(1, toInt(order.ownerRevision, 1)) + 1
    if (nextStatus === SHOPPING_ORDER_STATUS.COMPLETED) order.completedAt = now
    if (nextStatus === SHOPPING_ORDER_STATUS.CANCELLED) order.cancelledAt = now

    if (
      nextStatus === SHOPPING_ORDER_STATUS.COMPLETED ||
      nextStatus === SHOPPING_ORDER_STATUS.CANCELLED
    ) {
      getCalendarStore().dismissShoppingDeliveryCueByOrderId(order.id)
    }

    return true
  }

  const markOrderCompleted = (orderId) => updateOrderStatus(orderId, SHOPPING_ORDER_STATUS.COMPLETED)

  const cancelOrder = (orderId) => updateOrderStatus(orderId, SHOPPING_ORDER_STATUS.CANCELLED)

  const addOrderEvent = (orderId, eventInput = {}) => {
    const id = normalizeText(orderId, '', 140)
    if (!id) return null
    const order = orders.value.find((item) => item.id === id)
    if (!order) return null

    const now = Date.now()
    const event = normalizeOrderEvent(
      {
        ...eventInput,
        id: eventInput.id || createShoppingOrderEventId(),
        createdAt: eventInput.createdAt || now,
      },
      0,
    )
    if (!event) return null

    const currentEvents = Array.isArray(order.events) ? order.events : []
    order.events = [event, ...currentEvents.filter((item) => item.id !== event.id)]
      .slice(0, SHOPPING_ORDER_EVENT_LIMIT)
    order.updatedAt = Math.max(now, event.createdAt)
    pushShoppingLogisticsServiceMessage(order, event)
    return event
  }

  const applyPersistedSource = (source, { includeMissingSeeds = false } = {}) => {
    const rawSource = Array.isArray(source)
      ? { products: source }
      : source && typeof source === 'object'
        ? source
        : null
    if (!rawSource) return false

    const normalizedProducts = normalizeShoppingProducts(rawSource.products || rawSource.catalog)
    const nextProducts = includeMissingSeeds
      ? mergeMissingSeedProducts(normalizedProducts)
      : normalizedProducts
    const productIds = new Set(nextProducts.map((product) => product.id))
    products.value = nextProducts
    favoriteProductIds.value = normalizeFavoriteProductIds(
      rawSource.favoriteProductIds || rawSource.favorites,
      productIds,
    )
    cartItems.value = normalizeCartItems(rawSource.cartItems || rawSource.cart, productIds)
    orders.value = normalizeShoppingOrders(rawSource.orders)
    serviceCases.value = normalizeShoppingServiceCases(rawSource.serviceCases)
    interactionTriggers.value = normalizeShoppingInteractionTriggers(rawSource.interactionTriggers)
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(SHOPPING_STORAGE_KEY, {
      version: SHOPPING_STORAGE_VERSION,
      migrate: migrateShoppingStorage,
    })
    return applyPersistedSource(persisted, { includeMissingSeeds: true })
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(SHOPPING_STORAGE_KEY, {
      version: SHOPPING_STORAGE_VERSION,
      migrate: migrateShoppingStorage,
    })
    return applyPersistedSource(persisted, { includeMissingSeeds: true })
  }

  const createBackupSnapshot = () => ({
    products: products.value.map((item) => ({ ...item })),
    favoriteProductIds: [...favoriteProductIds.value],
    cartItems: cartItems.value.map((item) => ({ ...item })),
    orders: orders.value.map((order) => ({
      ...order,
      quoteSnapshot: order.quoteSnapshot
        ? {
            ...order.quoteSnapshot,
            sourceMoney: { ...order.quoteSnapshot.sourceMoney },
            quotedMoney: { ...order.quoteSnapshot.quotedMoney },
          }
        : null,
      items: order.items.map((item) => ({ ...item })),
      totals: order.totals.map((item) => ({ ...item })),
      events: Array.isArray(order.events) ? order.events.map((event) => ({ ...event })) : [],
      deliveryAnchor: order.deliveryAnchor ? { ...order.deliveryAnchor } : null,
      paymentRef: order.paymentRef ? { ...order.paymentRef } : null,
    })),
    serviceCases: serviceCases.value.map((serviceCase) => ({
      ...serviceCase,
      requestedDestination: serviceCase.requestedDestination
        ? { ...serviceCase.requestedDestination }
        : null,
      sourceMessageRef: { ...serviceCase.sourceMessageRef },
    })),
    interactionTriggers: interactionTriggers.value.map((trigger) => ({
      ...trigger,
      orderRef: { ...trigger.orderRef, lineItemIds: [...trigger.orderRef.lineItemIds] },
      sourceMessageRef: { ...trigger.sourceMessageRef },
    })),
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.shopping === 'object' && snapshot.shopping
        ? snapshot.shopping
        : snapshot
    return applyPersistedSource(source)
  }

  const persistToStorage = () => {
    return writePersistedState(SHOPPING_STORAGE_KEY, createBackupSnapshot(), {
      version: SHOPPING_STORAGE_VERSION,
      migrate: migrateShoppingStorage,
    })
  }

  const saveNow = () => persistToStorage()

  const resetForTesting = () => {
    products.value = []
    favoriteProductIds.value = []
    cartItems.value = []
    orders.value = []
    serviceCases.value = []
    interactionTriggers.value = []
  }

  const hydratedFromLocal = hydrateFromStorage()
  if (!hydratedFromLocal) {
    products.value = createSeedProducts()
  }

  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [products, favoriteProductIds, cartItems, orders, serviceCases, interactionTriggers],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    products,
    favoriteProductIds,
    cartItems,
    orders,
    serviceCases,
    interactionTriggers,
    productCount,
    favoriteCount,
    cartItemCount,
    cartQuantity,
    orderCount,
    favoriteProducts,
    cartLineItems,
    cartTotals,
    cartPrimaryTotal,
    hasFinishedStorageHydration,
    findProductById,
    findOrderById,
    getCommerceOrderReference,
    findServiceCaseById,
    beginOrderServiceInteraction,
    commitOrderDestinationChange,
    listProductsByCategory,
    listProductsByService,
    listFavoriteProductsByService,
    getFavoriteCountByService,
    listCartLineItemsByService,
    getCartQuantityByService,
    getCartPrimaryTotalByService,
    listOrdersByService,
    getOrderCountByService,
    isProductFavorite,
    upsertProduct,
    setProductFavorite,
    toggleProductFavorite,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    checkoutCart,
    checkoutCartWithPayment,
    updateOrderStatus,
    markOrderCompleted,
    cancelOrder,
    addOrderEvent,
    removeOrder,
    neutralizeRelationshipOrder,
    cleanupRelationshipForProfile,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
