import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { normalizeImageSource } from '../lib/image-source-contract'
import {
  SHOPPING_CATEGORY_ENTRIES,
  SHOPPING_SERVICE_PRESETS,
  SHOPPING_SOURCE_KEYS,
} from '../lib/planned-module-registry'
import { useCalendarStore } from './calendar'

const SHOPPING_STORAGE_KEY = 'store:shopping'
const SHOPPING_STORAGE_VERSION = 1
const SHOPPING_PRODUCT_LIMIT = 160
const SHOPPING_CART_LINE_LIMIT = 60
const SHOPPING_ORDER_LIMIT = 120
const SHOPPING_ORDER_EVENT_LIMIT = 32
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
  const name = normalizeText(rawRecipient.name || rawRecipient.recipientName || rawRecipient.recipient, '', 120)
  const sourceModule = normalizeText(rawRecipient.sourceModule || rawRecipient.recipientSourceModule, '', 40)
  const sourceId = normalizeText(rawRecipient.sourceId || rawRecipient.recipientSourceId, '', 140)

  if (!name && chatId <= 0 && contactId <= 0 && !sourceModule && !sourceId) {
    return {
      name: '',
      chatId: 0,
      contactId: 0,
      sourceModule: '',
      sourceId: '',
    }
  }

  return {
    name,
    chatId: Math.max(0, chatId),
    contactId: Math.max(0, contactId),
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
    category: normalizeCategory(rawProduct.category),
    serviceKey: normalizeServiceKey(rawProduct.serviceKey || rawProduct.service, rawProduct.category),
    priceCents,
    currency: normalizeCurrency(rawProduct.currency),
    desc: normalizeText(rawProduct.desc || rawProduct.description, '', 240),
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

  return {
    id: normalizeText(rawOrder.id, `shopping_order_legacy_${now}_${index}`, 140),
    status: normalizeOrderStatus(rawOrder.status),
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    totals,
    totalCents: primaryTotal.amountCents,
    currency: primaryTotal.currency,
    note: normalizeText(rawOrder.note, '', 240),
    recipient: normalizeText(rawOrder.recipient, '', 120),
    giftRecipient: normalizeGiftRecipient(rawOrder),
    events: normalizeOrderEvents(rawOrder.events || rawOrder.logisticsEvents || rawOrder.statusEvents),
    sourceModule: normalizeText(rawOrder.sourceModule, 'shopping_checkout', 40),
    sourceId: normalizeText(rawOrder.sourceId, '', 140),
    createdAt,
    updatedAt: Math.max(0, toInt(rawOrder.updatedAt, createdAt)),
  }
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

const createSeedProducts = () => normalizeShoppingProducts([
  {
    id: 'shopping_seed_mall_card',
    title: 'SchatPhone 礼品卡',
    category: 'mall',
    price: '88.00',
    desc: '可用于后续角色互动的通用礼品卡。',
    giftable: true,
    serviceKey: 'schat_mall',
    sourceModule: 'seed',
    createdAt: Date.now() - 8 * 60 * 1000,
    updatedAt: Date.now() - 8 * 60 * 1000,
  },
  {
    id: 'shopping_seed_fashion_jacket',
    title: '霓虹短夹克',
    category: 'fashion',
    price: '399.00',
    desc: '适合赛博夜景约会和角色穿搭想象。',
    giftable: true,
    serviceKey: 'style_cloud',
    sourceModule: 'seed',
    createdAt: Date.now() - 7 * 60 * 1000,
    updatedAt: Date.now() - 7 * 60 * 1000,
  },
  {
    id: 'shopping_seed_digital_lens',
    title: 'Mira Lens 便携镜头',
    category: 'digital',
    price: '1288.00',
    desc: '可作为高价值数码物品，后续可转入资产。',
    assetEligible: true,
    serviceKey: 'nova_digital',
    sourceModule: 'seed',
    createdAt: Date.now() - 6 * 60 * 1000,
    updatedAt: Date.now() - 6 * 60 * 1000,
  },
  {
    id: 'shopping_seed_home_lamp',
    title: '月相床头灯',
    category: 'home',
    price: '168.00',
    desc: '用于房间氛围、回忆和生活空间叙事。',
    giftable: true,
    serviceKey: 'daily_fresh',
    sourceModule: 'seed',
    createdAt: Date.now() - 5 * 60 * 1000,
    updatedAt: Date.now() - 5 * 60 * 1000,
  },
  {
    id: 'shopping_seed_luxury_watch',
    title: '白金机械表',
    category: 'luxury',
    price: '6888.00',
    desc: '高价值收藏型商品，适合进入 Assets 特殊资产。',
    assetEligible: true,
    stockStatus: 'limited',
    serviceKey: 'style_cloud',
    sourceModule: 'seed',
    createdAt: Date.now() - 4 * 60 * 1000,
    updatedAt: Date.now() - 4 * 60 * 1000,
  },
])

export const useShoppingStore = defineStore('shopping', () => {
  const getCalendarStore = () => useCalendarStore()
  const products = ref([])
  const favoriteProductIds = ref([])
  const cartItems = ref([])
  const orders = ref([])
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

  const clearCart = () => {
    const removed = cartItems.value.length
    cartItems.value = []
    return removed
  }

  const checkoutCart = ({
    note = '',
    recipient = '',
    giftRecipient = null,
    sourceModule = 'shopping_checkout',
    sourceId = '',
  } = {}) => {
    const lines = cartLineItems.value
    if (lines.length === 0) return null
    const now = Date.now()
    const order = normalizeShoppingOrder({
      id: createShoppingOrderId(),
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
      giftRecipient,
      sourceModule: normalizeText(sourceModule, SHOPPING_SOURCE_KEYS.ORDER_UPDATE, 40),
      sourceId,
      createdAt: now,
      updatedAt: now,
    })
    if (!order) return null
    orders.value.unshift(order)
    if (orders.value.length > SHOPPING_ORDER_LIMIT) orders.value.splice(SHOPPING_ORDER_LIMIT)
    getCalendarStore().upsertShoppingDeliveryCueFromOrder(order)
    clearCart()
    return order
  }

  const removeOrder = (orderId) => {
    const id = normalizeText(orderId, '', 140)
    const before = orders.value.length
    orders.value = orders.value.filter((order) => order.id !== id)
    const removed = orders.value.length !== before
    if (removed) getCalendarStore().dismissShoppingDeliveryCueByOrderId(id)
    return removed
  }

  const updateOrderStatus = (orderId, status) => {
    const id = normalizeText(orderId, '', 140)
    const nextStatus = normalizeOrderStatus(status, '')
    if (!id || !nextStatus) return false
    const order = orders.value.find((item) => item.id === id)
    if (!order || order.status === nextStatus) return false

    order.status = nextStatus
    order.updatedAt = Date.now()

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
    return event
  }

  const applyPersistedSource = (source) => {
    const rawSource = Array.isArray(source)
      ? { products: source }
      : source && typeof source === 'object'
        ? source
        : null
    if (!rawSource) return false

    const nextProducts = normalizeShoppingProducts(rawSource.products || rawSource.catalog)
    const productIds = new Set(nextProducts.map((product) => product.id))
    products.value = nextProducts
    favoriteProductIds.value = normalizeFavoriteProductIds(
      rawSource.favoriteProductIds || rawSource.favorites,
      productIds,
    )
    cartItems.value = normalizeCartItems(rawSource.cartItems || rawSource.cart, productIds)
    orders.value = normalizeShoppingOrders(rawSource.orders)
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(SHOPPING_STORAGE_KEY, {
      version: SHOPPING_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(SHOPPING_STORAGE_KEY, {
      version: SHOPPING_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    products: products.value.map((item) => ({ ...item })),
    favoriteProductIds: [...favoriteProductIds.value],
    cartItems: cartItems.value.map((item) => ({ ...item })),
    orders: orders.value.map((order) => ({
      ...order,
      items: order.items.map((item) => ({ ...item })),
      totals: order.totals.map((item) => ({ ...item })),
      events: Array.isArray(order.events) ? order.events.map((event) => ({ ...event })) : [],
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
    writePersistedState(SHOPPING_STORAGE_KEY, createBackupSnapshot(), {
      version: SHOPPING_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    products.value = []
    favoriteProductIds.value = []
    cartItems.value = []
    orders.value = []
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
    [products, favoriteProductIds, cartItems, orders],
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
    listProductsByCategory,
    listProductsByService,
    isProductFavorite,
    upsertProduct,
    setProductFavorite,
    toggleProductFavorite,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    checkoutCart,
    updateOrderStatus,
    markOrderCompleted,
    cancelOrder,
    addOrderEvent,
    removeOrder,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
