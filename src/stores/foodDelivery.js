import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { normalizeImageSource } from '../lib/image-source-contract'
import {
  FOOD_DELIVERY_CATEGORY_ENTRIES,
  FOOD_DELIVERY_SOURCE_KEYS,
} from '../lib/planned-module-registry'
import {
  anonymizeRelationshipText,
  bindingMatchesProfile,
  clearRelationshipBinding,
  normalizeRelationshipBinding,
} from '../lib/relationship-cleanup-helpers'
import { CHAT_SERVICE_NOTIFICATION_KIND, useChatStore } from './chat'
import { DEFAULT_WALLET_CURRENCY, normalizeWalletCurrency } from './wallet'

const FOOD_DELIVERY_STORAGE_KEY = 'store:food-delivery'
const FOOD_DELIVERY_STORAGE_VERSION = 1
const FOOD_RESTAURANT_LIMIT = 120
const FOOD_MENU_ITEM_LIMIT = 360
const FOOD_CART_LINE_LIMIT = 40
const FOOD_ORDER_LIMIT = 120
const FOOD_ORDER_EVENT_LIMIT = 24
const DEFAULT_CURRENCY = DEFAULT_WALLET_CURRENCY
const MOON_BISTRO_SEED_RESTAURANT_ID = 'food_seed_moon_bistro'

export const FOOD_DELIVERY_ORDER_STATUS = Object.freeze({
  PLACED: 'placed',
  ACCEPTED: 'accepted',
  COOKING: 'cooking',
  RIDER_PICKUP: 'rider_pickup',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
})

export const FOOD_DELIVERY_ORDER_EVENT_TYPE = Object.freeze({
  RIDER_DELAY: 'rider_delay',
  RESTAURANT_CANCELLED: 'restaurant_cancelled',
  ADDRESS_CHANGE: 'address_change',
  ETA_UPDATE: 'eta_update',
  STATUS_UPDATE: 'status_update',
})

const FOOD_DELIVERY_ORDER_STATUS_VALUES = new Set(Object.values(FOOD_DELIVERY_ORDER_STATUS))
const FOOD_DELIVERY_ORDER_EVENT_TYPE_VALUES = new Set(Object.values(FOOD_DELIVERY_ORDER_EVENT_TYPE))
const FOOD_DELIVERY_ORDER_EVENT_TITLES = Object.freeze({
  [FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY]: 'Rider delay',
  [FOOD_DELIVERY_ORDER_EVENT_TYPE.RESTAURANT_CANCELLED]: 'Restaurant cancelled',
  [FOOD_DELIVERY_ORDER_EVENT_TYPE.ADDRESS_CHANGE]: 'Address changed',
  [FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE]: 'ETA updated',
  [FOOD_DELIVERY_ORDER_EVENT_TYPE.STATUS_UPDATE]: 'Status updated',
})
const FOOD_CATEGORY_KEYS = FOOD_DELIVERY_CATEGORY_ENTRIES.map((entry) => entry.key)
const FOOD_CATEGORY_KEY_SET = new Set(FOOD_CATEGORY_KEYS)

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const normalizeText = (value, fallback = '', max = 120) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeCurrency = normalizeWalletCurrency

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

const normalizeCategory = (value, fallback = 'restaurants') => {
  const normalized = normalizeText(value, fallback, 40)
  return FOOD_CATEGORY_KEY_SET.has(normalized) ? normalized : fallback
}

const normalizeMenuSection = (value, fallback = 'signature') => normalizeText(value, fallback, 40)

const normalizeFoodId = (value) => normalizeText(value, '', 140)

const normalizeStatus = (value, fallback = FOOD_DELIVERY_ORDER_STATUS.PLACED) => {
  const normalized = normalizeText(value, fallback, 40)
  return FOOD_DELIVERY_ORDER_STATUS_VALUES.has(normalized) ? normalized : fallback
}

const normalizeOrderEventType = (value, fallback = '') => {
  const normalized = normalizeText(value, fallback, 60)
  return FOOD_DELIVERY_ORDER_EVENT_TYPE_VALUES.has(normalized) ? normalized : fallback
}

const normalizeRating = (value, fallback = 4.6) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.round(clamp(num, 0, 5) * 10) / 10
}

const normalizeDistanceKm = (value, fallback = 1.2) => {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.round(Math.max(0, num) * 10) / 10
}

const normalizeQuantity = (value, fallback = 1) => clamp(toInt(value, fallback), 1, 99)

const createRestaurantId = () => `food_restaurant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const createMenuItemId = () => `food_menu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const createFoodOrderId = () => `food_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const createFoodOrderEventId = () => `food_event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeRestaurant = (rawRestaurant, index = 0) => {
  if (!rawRestaurant || typeof rawRestaurant !== 'object') return null

  const name = normalizeText(rawRestaurant.name || rawRestaurant.title, '', 90)
  if (!name) return null

  const now = Date.now()
  const updatedAt = Math.max(0, toInt(rawRestaurant.updatedAt, now))
  const deliveryFeeCents =
    Number.isFinite(Number(rawRestaurant.deliveryFeeCents)) && Number(rawRestaurant.deliveryFeeCents) >= 0
      ? Math.floor(Number(rawRestaurant.deliveryFeeCents))
      : normalizeAmountCents(rawRestaurant.deliveryFee)

  return {
    id: normalizeFoodId(rawRestaurant.id) || `food_restaurant_legacy_${now}_${index}`,
    name,
    category: normalizeCategory(rawRestaurant.category),
    cuisine: normalizeText(rawRestaurant.cuisine, '', 80),
    rating: normalizeRating(rawRestaurant.rating),
    deliveryEtaMinutes: clamp(toInt(rawRestaurant.deliveryEtaMinutes || rawRestaurant.etaMinutes, 28), 5, 180),
    deliveryFeeCents,
    deliveryFee: formatAmount(deliveryFeeCents),
    currency: normalizeCurrency(rawRestaurant.currency),
    distanceKm: normalizeDistanceKm(rawRestaurant.distanceKm),
    address: normalizeText(rawRestaurant.address, '', 160),
    image: normalizeImageSource(rawRestaurant, { alt: name }),
    sourceModule: normalizeText(rawRestaurant.sourceModule, 'food_delivery_seed', 60),
    sourceId: normalizeText(rawRestaurant.sourceId, '', 140),
    createdAt: Math.max(0, toInt(rawRestaurant.createdAt, updatedAt)),
    updatedAt,
  }
}

const normalizeRestaurants = (rawRestaurants) => {
  if (!Array.isArray(rawRestaurants)) return []
  const seen = new Set()
  const normalized = []
  rawRestaurants.forEach((item, index) => {
    const restaurant = normalizeRestaurant(item, index)
    if (!restaurant || seen.has(restaurant.id)) return
    seen.add(restaurant.id)
    normalized.push(restaurant)
  })
  return normalized
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, FOOD_RESTAURANT_LIMIT)
}

const normalizeMenuItem = (rawItem, restaurantIds, index = 0) => {
  if (!rawItem || typeof rawItem !== 'object') return null

  const restaurantId = normalizeFoodId(rawItem.restaurantId || rawItem.storeId)
  if (!restaurantId || (restaurantIds.size > 0 && !restaurantIds.has(restaurantId))) return null

  const title = normalizeText(rawItem.title || rawItem.name, '', 90)
  const priceCents =
    Number.isFinite(Number(rawItem.priceCents)) && Number(rawItem.priceCents) > 0
      ? Math.floor(Number(rawItem.priceCents))
      : normalizeAmountCents(rawItem.price)
  if (!title || priceCents <= 0) return null

  const now = Date.now()
  const updatedAt = Math.max(0, toInt(rawItem.updatedAt, now))

  return {
    id: normalizeFoodId(rawItem.id) || `food_menu_legacy_${now}_${index}`,
    restaurantId,
    title,
    category: normalizeCategory(rawItem.category, 'restaurants'),
    menuSection: normalizeMenuSection(rawItem.menuSection || rawItem.section || rawItem.menuCategory),
    priceCents,
    price: formatAmount(priceCents),
    currency: normalizeCurrency(rawItem.currency),
    desc: normalizeText(rawItem.desc || rawItem.description, '', 240),
    ingredients: normalizeText(rawItem.ingredients || rawItem.baseIngredients, '', 180),
    available: rawItem.available !== false,
    image: normalizeImageSource(rawItem, { alt: title }),
    sourceModule: normalizeText(rawItem.sourceModule, 'food_delivery_menu', 60),
    sourceId: normalizeText(rawItem.sourceId, '', 140),
    createdAt: Math.max(0, toInt(rawItem.createdAt, updatedAt)),
    updatedAt,
  }
}

const normalizeMenuItems = (rawItems, restaurantIds) => {
  if (!Array.isArray(rawItems)) return []
  const seen = new Set()
  const normalized = []
  rawItems.forEach((item, index) => {
    const menuItem = normalizeMenuItem(item, restaurantIds, index)
    if (!menuItem || seen.has(menuItem.id)) return
    seen.add(menuItem.id)
    normalized.push(menuItem)
  })
  return normalized
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, FOOD_MENU_ITEM_LIMIT)
}

const normalizeCartItem = (rawItem, menuItemIds, index = 0) => {
  if (!rawItem || typeof rawItem !== 'object') return null
  const menuItemId = normalizeFoodId(rawItem.menuItemId || rawItem.id)
  if (!menuItemId || (menuItemIds.size > 0 && !menuItemIds.has(menuItemId))) return null
  const now = Date.now()
  const addedAt = Math.max(0, toInt(rawItem.addedAt || rawItem.createdAt, now + index))

  return {
    menuItemId,
    quantity: normalizeQuantity(rawItem.quantity),
    sourceModule: normalizeText(rawItem.sourceModule, 'food_delivery_cart', 60),
    sourceId: normalizeText(rawItem.sourceId, '', 140),
    addedAt,
    updatedAt: Math.max(0, toInt(rawItem.updatedAt, addedAt)),
  }
}

const normalizeCartItems = (rawItems, menuItemIds) => {
  if (!Array.isArray(rawItems)) return []
  const byMenuItemId = new Map()
  rawItems.forEach((item, index) => {
    const cartItem = normalizeCartItem(item, menuItemIds, index)
    if (!cartItem) return
    const existing = byMenuItemId.get(cartItem.menuItemId)
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + cartItem.quantity)
      existing.updatedAt = Math.max(existing.updatedAt, cartItem.updatedAt)
      return
    }
    byMenuItemId.set(cartItem.menuItemId, cartItem)
  })
  return [...byMenuItemId.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, FOOD_CART_LINE_LIMIT)
}

const normalizeOrderItem = (rawItem, index = 0) => {
  if (!rawItem || typeof rawItem !== 'object') return null
  const menuItemId = normalizeFoodId(rawItem.menuItemId || rawItem.productId || rawItem.id)
  const title = normalizeText(rawItem.title || rawItem.name, '', 90)
  const unitPriceCents =
    Number.isFinite(Number(rawItem.unitPriceCents)) && Number(rawItem.unitPriceCents) > 0
      ? Math.floor(Number(rawItem.unitPriceCents))
      : normalizeAmountCents(rawItem.price)
  if (!menuItemId || !title || unitPriceCents <= 0) return null

  return {
    id: normalizeText(rawItem.id, `${menuItemId}_${index}`, 140),
    menuItemId,
    title,
    category: normalizeCategory(rawItem.category, 'restaurants'),
    quantity: normalizeQuantity(rawItem.quantity),
    unitPriceCents,
    currency: normalizeCurrency(rawItem.currency),
  }
}

const normalizeOrderEvent = (rawEvent, index = 0) => {
  if (!rawEvent || typeof rawEvent !== 'object') return null
  const type = normalizeOrderEventType(rawEvent.type || rawEvent.eventType)
  if (!type) return null

  const now = Date.now()
  const createdAt = Math.max(0, toInt(rawEvent.createdAt, now + index))
  const etaMinutes =
    rawEvent.etaMinutes === undefined || rawEvent.etaMinutes === null
      ? null
      : clamp(toInt(rawEvent.etaMinutes, 0), 0, 240)

  return {
    id: normalizeText(rawEvent.id, `food_event_legacy_${now}_${index}`, 140),
    type,
    title: normalizeText(rawEvent.title, FOOD_DELIVERY_ORDER_EVENT_TITLES[type] || 'Food delivery update', 120),
    summary: normalizeText(rawEvent.summary || rawEvent.desc || rawEvent.note, '', 280),
    etaMinutes,
    deliveryAddress: normalizeText(rawEvent.deliveryAddress || rawEvent.address, '', 160),
    sourceModule: normalizeText(rawEvent.sourceModule, 'food_delivery_status_event', 80),
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
    .slice(0, FOOD_ORDER_EVENT_LIMIT)
}

const formatOrderAmount = (order = {}) =>
  `${(Number(order?.totalCents || 0) / 100).toFixed(2)} ${order?.currency || DEFAULT_CURRENCY}`

const foodOrderTitle = (order = {}, fallback = 'Food delivery order') => {
  const firstItem = Array.isArray(order.items) ? order.items[0] : null
  const itemTitle = normalizeText(firstItem?.title, '', 90)
  const restaurantName = normalizeText(order.restaurantName, '', 90)
  if (restaurantName && itemTitle) return `${restaurantName} · ${itemTitle}`
  return restaurantName || itemTitle || fallback
}

const foodStatusLabel = (status = '') => {
  if (status === FOOD_DELIVERY_ORDER_STATUS.ACCEPTED) return 'Accepted'
  if (status === FOOD_DELIVERY_ORDER_STATUS.COOKING) return 'Cooking'
  if (status === FOOD_DELIVERY_ORDER_STATUS.RIDER_PICKUP) return 'Rider pickup'
  if (status === FOOD_DELIVERY_ORDER_STATUS.DELIVERED) return 'Delivered'
  if (status === FOOD_DELIVERY_ORDER_STATUS.CANCELLED) return 'Cancelled'
  return 'Placed'
}

const foodEventStatusLabel = (event = {}) => {
  if (event.type === FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY) return 'Delayed'
  if (event.type === FOOD_DELIVERY_ORDER_EVENT_TYPE.RESTAURANT_CANCELLED) return 'Cancelled'
  if (event.type === FOOD_DELIVERY_ORDER_EVENT_TYPE.ADDRESS_CHANGE) return 'Address changed'
  if (event.type === FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE) return 'ETA updated'
  return 'Updated'
}

const buildFoodDeliveryOrderRoute = (order = {}) =>
  `/food-delivery?source=chat&intent=food_delivery_order&service=food_delivery_dispatch&orderId=${encodeURIComponent(order.id)}`

const buildFoodDeliveryEventSummary = (order = {}, event = {}) => {
  if (event.summary) return event.summary
  if (event.deliveryAddress) return `Delivery address changed to ${event.deliveryAddress}.`
  if (event.etaMinutes !== null && event.etaMinutes !== undefined) return `ETA updated to ${event.etaMinutes} minutes.`
  return `Food Delivery updated ${foodOrderTitle(order)}.`
}

const foodDeliveryUiAsset = (path) =>
  `${import.meta.env.BASE_URL || '/'}images/ui-assets/apps/food-delivery/${path}`

const FOOD_SEED_IMAGE_URLS = Object.freeze({
  moonBistro: foodDeliveryUiAsset('moon-bistro/cover/moon-bistro-cover-02.png'),
  riverNoodles: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
  daylightCafe: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
  sugarLane: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=900&q=80',
  lunarRice: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-03.png'),
  signalSoup: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-02.png'),
  velvetSoup: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-01.png'),
  tideShrimpStew: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-05.png'),
  emberVegetables: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-07.png'),
  rosemaryChicken: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-09.png'),
  nightTagliatelle: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-29.png'),
  emberLasagna: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-50.png'),
  blueMoonBowl: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-15.png'),
  riverBeefNoodles: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
  daylightLatte: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
  tinyMoonCake: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80',
})

const summarizeOrderTotals = (items, deliveryFeeCents = 0, currency = DEFAULT_CURRENCY) => {
  const totals = new Map()
  items.forEach((item) => {
    const current = totals.get(item.currency) || 0
    totals.set(item.currency, current + item.unitPriceCents * item.quantity)
  })
  if (deliveryFeeCents > 0) {
    totals.set(currency, (totals.get(currency) || 0) + deliveryFeeCents)
  }
  return [...totals.entries()]
    .map(([totalCurrency, amountCents]) => ({
      currency: totalCurrency,
      amountCents,
      amount: formatAmount(amountCents),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency))
}

const normalizeFoodOrder = (rawOrder, index = 0) => {
  if (!rawOrder || typeof rawOrder !== 'object') return null
  const items = Array.isArray(rawOrder.items)
    ? rawOrder.items.map((item, itemIndex) => normalizeOrderItem(item, itemIndex)).filter(Boolean)
    : []
  if (items.length === 0) return null

  const now = Date.now()
  const createdAt = Math.max(0, toInt(rawOrder.createdAt, now + index))
  const deliveryFeeCents =
    Number.isFinite(Number(rawOrder.deliveryFeeCents)) && Number(rawOrder.deliveryFeeCents) >= 0
      ? Math.floor(Number(rawOrder.deliveryFeeCents))
      : normalizeAmountCents(rawOrder.deliveryFee)
  const currency = normalizeCurrency(rawOrder.currency || items[0]?.currency)
  const totals = summarizeOrderTotals(items, deliveryFeeCents, currency)
  const primaryTotal = totals.find((item) => item.currency === DEFAULT_CURRENCY) || totals[0] || {
    currency: DEFAULT_CURRENCY,
    amountCents: 0,
    amount: '0.00',
  }

  return {
    id: normalizeText(rawOrder.id, `food_order_legacy_${now}_${index}`, 140),
    status: normalizeStatus(rawOrder.status),
    restaurantId: normalizeFoodId(rawOrder.restaurantId),
    restaurantName: normalizeText(rawOrder.restaurantName, '', 90),
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    deliveryFeeCents,
    deliveryFee: formatAmount(deliveryFeeCents),
    totals,
    totalCents: primaryTotal.amountCents,
    currency: primaryTotal.currency,
    deliveryAddress: normalizeText(rawOrder.deliveryAddress || rawOrder.address, '', 160),
    note: normalizeText(rawOrder.note, '', 240),
    relationshipBinding: normalizeRelationshipBinding(rawOrder.relationshipBinding),
    events: normalizeOrderEvents(rawOrder.events || rawOrder.statusEvents || rawOrder.eventCards),
    sourceModule: normalizeText(rawOrder.sourceModule, 'food_delivery_checkout', 60),
    sourceId: normalizeText(rawOrder.sourceId, '', 140),
    createdAt,
    updatedAt: Math.max(0, toInt(rawOrder.updatedAt, createdAt)),
  }
}

const normalizeFoodOrders = (rawOrders) => {
  if (!Array.isArray(rawOrders)) return []
  const seen = new Set()
  const normalized = []
  rawOrders.forEach((item, index) => {
    const order = normalizeFoodOrder(item, index)
    if (!order || seen.has(order.id)) return
    seen.add(order.id)
    normalized.push(order)
  })
  return normalized
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, FOOD_ORDER_LIMIT)
}

const createSeedRestaurants = () =>
  normalizeRestaurants([
    {
      id: MOON_BISTRO_SEED_RESTAURANT_ID,
      name: 'Moon Bistro',
      category: 'restaurants',
      cuisine: 'Fusion dinner',
      rating: 4.8,
      deliveryEtaMinutes: 32,
      deliveryFee: '6.00',
      distanceKm: 2.1,
      address: 'Luna Street 18',
      imageSourceType: 'url',
      imageUrl: FOOD_SEED_IMAGE_URLS.moonBistro,
      imageAlt: 'Moon Bistro candlelit dinner table',
      sourceModule: 'seed',
      createdAt: Date.now() - 8 * 60 * 1000,
      updatedAt: Date.now() - 8 * 60 * 1000,
    },
    {
      id: 'food_seed_river_noodles',
      name: 'River Noodles',
      category: 'fast_food',
      cuisine: 'Noodles',
      rating: 4.6,
      deliveryEtaMinutes: 24,
      deliveryFee: '4.00',
      distanceKm: 1.4,
      address: 'River Market',
      imageSourceType: 'url',
      imageUrl: FOOD_SEED_IMAGE_URLS.riverNoodles,
      imageAlt: 'River Noodles bowl',
      sourceModule: 'seed',
      createdAt: Date.now() - 7 * 60 * 1000,
      updatedAt: Date.now() - 7 * 60 * 1000,
    },
    {
      id: 'food_seed_daylight_cafe',
      name: 'Daylight Cafe',
      category: 'cafe',
      cuisine: 'Coffee and brunch',
      rating: 4.7,
      deliveryEtaMinutes: 18,
      deliveryFee: '3.00',
      distanceKm: 0.8,
      address: 'Station Corner',
      imageSourceType: 'url',
      imageUrl: FOOD_SEED_IMAGE_URLS.daylightCafe,
      imageAlt: 'Daylight Cafe coffee',
      sourceModule: 'seed',
      createdAt: Date.now() - 6 * 60 * 1000,
      updatedAt: Date.now() - 6 * 60 * 1000,
    },
    {
      id: 'food_seed_sugar_lane',
      name: 'Sugar Lane',
      category: 'dessert',
      cuisine: 'Dessert',
      rating: 4.5,
      deliveryEtaMinutes: 26,
      deliveryFee: '5.00',
      distanceKm: 1.9,
      address: 'Sweet Park',
      imageSourceType: 'url',
      imageUrl: FOOD_SEED_IMAGE_URLS.sugarLane,
      imageAlt: 'Sugar Lane dessert',
      sourceModule: 'seed',
      createdAt: Date.now() - 5 * 60 * 1000,
      updatedAt: Date.now() - 5 * 60 * 1000,
    },
  ])

const createSeedMenuItems = () =>
  normalizeMenuItems(
    [
      {
        id: 'food_menu_moon_rice',
        restaurantId: MOON_BISTRO_SEED_RESTAURANT_ID,
        title: 'Lunar Rice Set',
        category: 'restaurants',
        menuSection: 'rice_set',
        price: '58.00',
        desc: 'Grilled slices, warm rice, and crisp pickles for a quiet late-night dinner.',
        ingredients: 'rice, grilled pork, cucumber, kimchi, herb sauce',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.lunarRice,
        imageAlt: 'Lunar Rice Set',
        sourceModule: 'seed',
        createdAt: Date.now() - 8 * 60 * 1000,
        updatedAt: Date.now() - 8 * 60 * 1000,
      },
      {
        id: 'food_menu_moon_soup',
        restaurantId: MOON_BISTRO_SEED_RESTAURANT_ID,
        title: 'Signal Soup',
        category: 'restaurants',
        menuSection: 'warm_soup',
        price: '26.00',
        desc: 'Creamy mushroom soup with thyme and black pepper, made for slow evenings.',
        ingredients: 'mushroom, cream, thyme, black pepper, broth',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.signalSoup,
        imageAlt: 'Signal Soup',
        sourceModule: 'seed',
        createdAt: Date.now() - 7 * 60 * 1000,
        updatedAt: Date.now() - 7 * 60 * 1000,
      },
      {
        id: 'food_menu_moon_velvet_soup',
        restaurantId: MOON_BISTRO_SEED_RESTAURANT_ID,
        title: 'Velvet Thyme Soup',
        category: 'restaurants',
        menuSection: 'warm_soup',
        price: '28.00',
        desc: 'A softer mushroom soup with extra thyme cream and cracked pepper.',
        ingredients: 'mushroom, cream, thyme, black pepper, onion broth',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.velvetSoup,
        imageAlt: 'Velvet Thyme Soup',
        sourceModule: 'seed',
        createdAt: Date.now() - 9 * 60 * 1000,
        updatedAt: Date.now() - 9 * 60 * 1000,
      },
      {
        id: 'food_menu_moon_tide_stew',
        restaurantId: MOON_BISTRO_SEED_RESTAURANT_ID,
        title: 'Tide Shrimp Stew',
        category: 'restaurants',
        menuSection: 'seafood',
        price: '64.00',
        desc: 'Shrimp, tomato, lime, and warm spice in a bright dinner stew.',
        ingredients: 'shrimp, tomato, lime, mushroom, chili, herb broth',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.tideShrimpStew,
        imageAlt: 'Tide Shrimp Stew',
        sourceModule: 'seed',
        createdAt: Date.now() - 10 * 60 * 1000,
        updatedAt: Date.now() - 10 * 60 * 1000,
      },
      {
        id: 'food_menu_moon_ember_greens',
        restaurantId: MOON_BISTRO_SEED_RESTAURANT_ID,
        title: 'Ember Greens',
        category: 'restaurants',
        menuSection: 'greens',
        price: '38.00',
        desc: 'Roasted seasonal vegetables with a smoky honey pepper glaze.',
        ingredients: 'broccoli, carrot, pumpkin, onion, brussels sprout, glaze',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.emberVegetables,
        imageAlt: 'Ember Greens',
        sourceModule: 'seed',
        createdAt: Date.now() - 11 * 60 * 1000,
        updatedAt: Date.now() - 11 * 60 * 1000,
      },
      {
        id: 'food_menu_moon_rosemary_chicken',
        restaurantId: MOON_BISTRO_SEED_RESTAURANT_ID,
        title: 'Rosemary Roast Chicken',
        category: 'restaurants',
        menuSection: 'grill',
        price: '76.00',
        desc: 'Whole roasted chicken with potatoes, carrots, and rosemary oil.',
        ingredients: 'chicken, potato, carrot, onion, rosemary, olive oil',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.rosemaryChicken,
        imageAlt: 'Rosemary Roast Chicken',
        sourceModule: 'seed',
        createdAt: Date.now() - 12 * 60 * 1000,
        updatedAt: Date.now() - 12 * 60 * 1000,
      },
      {
        id: 'food_menu_moon_night_tagliatelle',
        restaurantId: MOON_BISTRO_SEED_RESTAURANT_ID,
        title: 'Night Tagliatelle',
        category: 'restaurants',
        menuSection: 'pasta',
        price: '52.00',
        desc: 'Creamy mushroom tagliatelle with herbs and blistered tomato.',
        ingredients: 'tagliatelle, mushroom, cream, tomato, thyme, parmesan',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.nightTagliatelle,
        imageAlt: 'Night Tagliatelle',
        sourceModule: 'seed',
        createdAt: Date.now() - 13 * 60 * 1000,
        updatedAt: Date.now() - 13 * 60 * 1000,
      },
      {
        id: 'food_menu_moon_ember_lasagna',
        restaurantId: MOON_BISTRO_SEED_RESTAURANT_ID,
        title: 'Ember Lasagna',
        category: 'restaurants',
        menuSection: 'pasta',
        price: '58.00',
        desc: 'Layered tomato lasagna with basil and a browned cheese top.',
        ingredients: 'lasagna, tomato ragu, beef, basil, mozzarella, parmesan',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.emberLasagna,
        imageAlt: 'Ember Lasagna',
        sourceModule: 'seed',
        createdAt: Date.now() - 14 * 60 * 1000,
        updatedAt: Date.now() - 14 * 60 * 1000,
      },
      {
        id: 'food_menu_moon_blue_bowl',
        restaurantId: MOON_BISTRO_SEED_RESTAURANT_ID,
        title: 'Blue Moon Jelly Bowl',
        category: 'restaurants',
        menuSection: 'dessert',
        price: '34.00',
        desc: 'Blue coconut jelly, berries, mango, and mint for a cold finish.',
        ingredients: 'coconut jelly, blueberry, strawberry, mango, mint',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.blueMoonBowl,
        imageAlt: 'Blue Moon Jelly Bowl',
        sourceModule: 'seed',
        createdAt: Date.now() - 15 * 60 * 1000,
        updatedAt: Date.now() - 15 * 60 * 1000,
      },
      {
        id: 'food_menu_river_noodles',
        restaurantId: 'food_seed_river_noodles',
        title: 'River Beef Noodles',
        category: 'fast_food',
        price: '36.00',
        desc: 'Fast noodles with warm broth and beef slices.',
        ingredients: 'noodles, beef, broth',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.riverBeefNoodles,
        imageAlt: 'River Beef Noodles',
        sourceModule: 'seed',
        createdAt: Date.now() - 6 * 60 * 1000,
        updatedAt: Date.now() - 6 * 60 * 1000,
      },
      {
        id: 'food_menu_cafe_latte',
        restaurantId: 'food_seed_daylight_cafe',
        title: 'Daylight Latte',
        category: 'cafe',
        price: '22.00',
        desc: 'Soft latte for a bright cafe stop.',
        ingredients: 'espresso, milk',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.daylightLatte,
        imageAlt: 'Daylight Latte',
        sourceModule: 'seed',
        createdAt: Date.now() - 5 * 60 * 1000,
        updatedAt: Date.now() - 5 * 60 * 1000,
      },
      {
        id: 'food_menu_sugar_cake',
        restaurantId: 'food_seed_sugar_lane',
        title: 'Tiny Moon Cake',
        category: 'dessert',
        price: '32.00',
        desc: 'Small dessert with a sweet moonlit finish.',
        ingredients: 'cake, cream, sugar',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.tinyMoonCake,
        imageAlt: 'Tiny Moon Cake',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
    ],
    new Set(['food_seed_moon_bistro', 'food_seed_river_noodles', 'food_seed_daylight_cafe', 'food_seed_sugar_lane']),
  )

const MOON_BISTRO_REQUIRED_MENU_ITEMS = createSeedMenuItems().filter(
  (item) => item.restaurantId === MOON_BISTRO_SEED_RESTAURANT_ID,
)

export const useFoodDeliveryStore = defineStore('foodDelivery', () => {
  const getChatStore = () => useChatStore()
  const primaryCurrency = ref(DEFAULT_CURRENCY)
  const restaurants = ref([])
  const menuItems = ref([])
  const cartItems = ref([])
  const orders = ref([])
  const hasFinishedStorageHydration = ref(false)

  const restaurantMap = computed(() => new Map(restaurants.value.map((restaurant) => [restaurant.id, restaurant])))
  const menuItemMap = computed(() => new Map(menuItems.value.map((item) => [item.id, item])))
  const restaurantCount = computed(() => restaurants.value.length)
  const menuItemCount = computed(() => menuItems.value.length)
  const cartQuantity = computed(() =>
    cartItems.value.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
  )
  const orderCount = computed(() => orders.value.length)
  const recentOrders = computed(() => orders.value.slice(0, 5))
  const presentRestaurant = (restaurant = {}) => ({
    ...restaurant,
    currency: primaryCurrency.value,
  })
  const presentMenuItem = (item = {}) => ({
    ...item,
    currency: primaryCurrency.value,
  })
  const categorySummaries = computed(() =>
    FOOD_DELIVERY_CATEGORY_ENTRIES.map((entry) => ({
      key: entry.key,
      zh: entry.zh,
      en: entry.en,
      icon: entry.icon,
      restaurantCount: restaurants.value.filter((restaurant) => restaurant.category === entry.key).length,
      menuItemCount: menuItems.value.filter((item) => item.category === entry.key).length,
    })),
  )
  const cartLineItems = computed(() =>
    cartItems.value
      .map((item) => {
        const sourceMenuItem = menuItemMap.value.get(item.menuItemId)
        const menuItem = sourceMenuItem ? presentMenuItem(sourceMenuItem) : null
        if (!menuItem) return null
        const sourceRestaurant = restaurantMap.value.get(menuItem.restaurantId) || null
        const restaurant = sourceRestaurant ? presentRestaurant(sourceRestaurant) : null
        const subtotalCents = menuItem.priceCents * item.quantity
        return {
          ...item,
          menuItem,
          restaurant,
          subtotalCents,
          subtotal: formatAmount(subtotalCents),
          currency: menuItem.currency,
        }
      })
      .filter(Boolean),
  )
  const cartRestaurant = computed(() => cartLineItems.value[0]?.restaurant || null)
  const cartTotals = computed(() =>
    summarizeOrderTotals(
      cartLineItems.value.map((line) => ({
        menuItemId: line.menuItemId,
        title: line.menuItem.title,
        category: line.menuItem.category,
        quantity: line.quantity,
        unitPriceCents: line.menuItem.priceCents,
        currency: line.menuItem.currency,
      })),
      cartRestaurant.value?.deliveryFeeCents || 0,
      primaryCurrency.value,
    ),
  )
  const cartPrimaryTotal = computed(() =>
    cartTotals.value.find((item) => item.currency === primaryCurrency.value) || cartTotals.value[0] || {
      currency: primaryCurrency.value,
      amountCents: 0,
      amount: '0.00',
    },
  )

  const findRestaurantById = (restaurantId) => {
    const id = normalizeFoodId(restaurantId)
    if (!id) return null
    const restaurant = restaurantMap.value.get(id) || null
    return restaurant ? presentRestaurant(restaurant) : null
  }

  const findMenuItemById = (menuItemId) => {
    const id = normalizeFoodId(menuItemId)
    if (!id) return null
    const item = menuItemMap.value.get(id) || null
    return item ? presentMenuItem(item) : null
  }

  const findOrderById = (orderId) => {
    const id = normalizeFoodId(orderId)
    if (!id) return null
    return orders.value.find((order) => order.id === id) || null
  }

  const listRestaurantsByCategory = (category = '') => {
    const normalized = normalizeCategory(category, '')
    if (!normalized) return restaurants.value.map(presentRestaurant)
    if (normalized === 'nearby') {
      return restaurants.value.slice().sort((a, b) => a.distanceKm - b.distanceKm).map(presentRestaurant)
    }
    if (normalized === 'grocery_delivery') {
      return restaurants.value.filter((restaurant) => restaurant.category === 'grocery_delivery').map(presentRestaurant)
    }
    return restaurants.value.filter((restaurant) => restaurant.category === normalized).map(presentRestaurant)
  }

  const listMenuByRestaurant = (restaurantId = '') => {
    const id = normalizeFoodId(restaurantId)
    if (!id) return []
    return menuItems.value.filter((item) => item.restaurantId === id).map(presentMenuItem)
  }

  const upsertRestaurant = (input = {}) => {
    const now = Date.now()
    const inputId = normalizeFoodId(input.id)
    const existingIndex = inputId
      ? restaurants.value.findIndex((restaurant) => restaurant.id === inputId)
      : -1
    const existing = existingIndex >= 0 ? restaurants.value[existingIndex] : null
    const restaurant = normalizeRestaurant({
      ...input,
      currency: input.currency || primaryCurrency.value,
      id: inputId || createRestaurantId(),
      createdAt: existing?.createdAt || input.createdAt || now,
      updatedAt: now,
    })
    if (!restaurant) return null

    if (existingIndex >= 0) {
      restaurants.value.splice(existingIndex, 1, {
        ...existing,
        ...restaurant,
        currency: primaryCurrency.value,
        createdAt: existing.createdAt,
      })
      return presentRestaurant(restaurants.value[existingIndex])
    }

    restaurants.value.unshift(restaurant)
    if (restaurants.value.length > FOOD_RESTAURANT_LIMIT) restaurants.value.splice(FOOD_RESTAURANT_LIMIT)
    return presentRestaurant(restaurant)
  }

  const upsertMenuItem = (input = {}) => {
    const now = Date.now()
    const restaurantIds = new Set(restaurants.value.map((restaurant) => restaurant.id))
    const inputId = normalizeFoodId(input.id)
    const existingIndex = inputId
      ? menuItems.value.findIndex((item) => item.id === inputId)
      : -1
    const existing = existingIndex >= 0 ? menuItems.value[existingIndex] : null
    const menuItem = normalizeMenuItem(
      {
        ...input,
        currency: input.currency || primaryCurrency.value,
        id: inputId || createMenuItemId(),
        menuSection: input.menuSection || input.section || existing?.menuSection,
        createdAt: existing?.createdAt || input.createdAt || now,
        updatedAt: now,
      },
      restaurantIds,
    )
    if (!menuItem) return null

    if (existingIndex >= 0) {
      menuItems.value.splice(existingIndex, 1, {
        ...existing,
        ...menuItem,
        currency: primaryCurrency.value,
        createdAt: existing.createdAt,
      })
      return presentMenuItem(menuItems.value[existingIndex])
    }

    menuItems.value.unshift(menuItem)
    if (menuItems.value.length > FOOD_MENU_ITEM_LIMIT) menuItems.value.splice(FOOD_MENU_ITEM_LIMIT)
    return presentMenuItem(menuItem)
  }

  const addToCart = (menuItemId, quantity = 1, options = {}) => {
    const menuItem = findMenuItemById(menuItemId)
    if (!menuItem || menuItem.available === false) return null
    const currentRestaurantId = cartLineItems.value[0]?.menuItem?.restaurantId || ''
    if (currentRestaurantId && currentRestaurantId !== menuItem.restaurantId) {
      cartItems.value = []
    }
    const normalizedQuantity = normalizeQuantity(quantity)
    const now = Date.now()
    const existing = cartItems.value.find((item) => item.menuItemId === menuItem.id)
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + normalizedQuantity)
      existing.updatedAt = now
      return existing
    }
    const item = {
      menuItemId: menuItem.id,
      quantity: normalizedQuantity,
      sourceModule: normalizeText(options.sourceModule, 'food_delivery_cart', 60),
      sourceId: normalizeText(options.sourceId, '', 140),
      addedAt: now,
      updatedAt: now,
    }
    cartItems.value.unshift(item)
    if (cartItems.value.length > FOOD_CART_LINE_LIMIT) cartItems.value.splice(FOOD_CART_LINE_LIMIT)
    return item
  }

  const updateCartQuantity = (menuItemId, quantity = 1) => {
    const id = normalizeFoodId(menuItemId)
    const item = cartItems.value.find((line) => line.menuItemId === id)
    if (!item) return false
    const nextQuantity = toInt(quantity, item.quantity)
    if (nextQuantity <= 0) {
      cartItems.value = cartItems.value.filter((line) => line.menuItemId !== id)
      return true
    }
    item.quantity = normalizeQuantity(nextQuantity)
    item.updatedAt = Date.now()
    return true
  }

  const clearCart = () => {
    const removed = cartItems.value.length
    cartItems.value = []
    return removed
  }

  const pushFoodDeliveryOrderServiceMessage = (order = {}) => {
    const chatStore = getChatStore()
    const serviceContact = chatStore.findFoodDeliveryServiceContact('food_delivery_dispatch')
    if (!serviceContact) return null

    return chatStore.appendServiceNotification(serviceContact.id, {
      kind: CHAT_SERVICE_NOTIFICATION_KIND.FOOD_DELIVERY_ORDER,
      title: `Order placed · ${foodOrderTitle(order)}`,
      summary: `Food Delivery received this order for ${foodOrderTitle(order)}. This thread only carries service pushes; restaurants, menus, fulfillment, and payment records stay in their modules.`,
      statusLabel: foodStatusLabel(order.status),
      amount: formatOrderAmount(order),
      sourceModule: FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH,
      sourceId: order.id,
      serviceKey: 'food_delivery_dispatch',
      serviceLabel: serviceContact.name || 'Food Delivery Dispatch',
      route: buildFoodDeliveryOrderRoute(order),
      actions: [
        {
          label: 'View order',
          route: buildFoodDeliveryOrderRoute(order),
        },
      ],
      createdAt: order.createdAt,
    })
  }

  const pushFoodDeliveryEventServiceMessage = (order = {}, event = {}) => {
    const chatStore = getChatStore()
    const serviceContact = chatStore.findFoodDeliveryServiceContact('food_delivery_dispatch')
    if (!serviceContact) return null

    return chatStore.appendServiceNotification(serviceContact.id, {
      kind: CHAT_SERVICE_NOTIFICATION_KIND.FOOD_DELIVERY_UPDATE,
      title: `${event.title || 'Food delivery update'} · ${foodOrderTitle(order)}`,
      summary: buildFoodDeliveryEventSummary(order, event),
      statusLabel: foodEventStatusLabel(event),
      amount: formatOrderAmount(order),
      sourceModule: FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH,
      sourceId: order.id,
      sourceEventId: event.id,
      serviceKey: 'food_delivery_dispatch',
      serviceLabel: serviceContact.name || 'Food Delivery Dispatch',
      route: buildFoodDeliveryOrderRoute(order),
      actions: [
        {
          label: 'Open Food Delivery',
          route: buildFoodDeliveryOrderRoute(order),
        },
      ],
      createdAt: event.createdAt,
    })
  }

  const checkoutCart = ({
    deliveryAddress = '',
    note = '',
    relationshipBinding = null,
    sourceModule = FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH,
    sourceId = '',
  } = {}) => {
    const lines = cartLineItems.value
    if (lines.length === 0) return null
    const restaurant = lines[0]?.restaurant
    if (!restaurant) return null
    const now = Date.now()
    const order = normalizeFoodOrder({
      id: createFoodOrderId(),
      status: FOOD_DELIVERY_ORDER_STATUS.PLACED,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      deliveryFeeCents: restaurant.deliveryFeeCents,
      currency: primaryCurrency.value,
      items: lines.map((line) => ({
        id: `${line.menuItemId}_${line.addedAt}`,
        menuItemId: line.menuItemId,
        title: line.menuItem.title,
        category: line.menuItem.category,
        quantity: line.quantity,
        unitPriceCents: line.menuItem.priceCents,
        currency: primaryCurrency.value,
      })),
      deliveryAddress,
      note,
      relationshipBinding,
      sourceModule,
      sourceId,
      createdAt: now,
      updatedAt: now,
    })
    if (!order) return null
    orders.value.unshift(order)
    if (orders.value.length > FOOD_ORDER_LIMIT) orders.value.splice(FOOD_ORDER_LIMIT)
    pushFoodDeliveryOrderServiceMessage(order)
    clearCart()
    return order
  }

  const updateOrderStatus = (orderId, status) => {
    const id = normalizeText(orderId, '', 140)
    const nextStatus = normalizeStatus(status, '')
    if (!id || !nextStatus) return false
    const order = orders.value.find((item) => item.id === id)
    if (!order || order.status === nextStatus) return false
    order.status = nextStatus
    order.updatedAt = Date.now()
    return true
  }

  const addOrderEvent = (orderId, eventInput = {}) => {
    const id = normalizeText(orderId, '', 140)
    if (!id) return null
    const order = orders.value.find((item) => item.id === id)
    if (!order) return null

    const now = Date.now()
    const event = normalizeOrderEvent(
      {
        ...eventInput,
        id: eventInput.id || createFoodOrderEventId(),
        createdAt: eventInput.createdAt || now,
      },
      0,
    )
    if (!event) return null

    const currentEvents = Array.isArray(order.events) ? order.events : []
    order.events = [event, ...currentEvents.filter((item) => item.id !== event.id)].slice(0, FOOD_ORDER_EVENT_LIMIT)

    if (event.type === FOOD_DELIVERY_ORDER_EVENT_TYPE.RESTAURANT_CANCELLED) {
      order.status = FOOD_DELIVERY_ORDER_STATUS.CANCELLED
    }
    if (event.type === FOOD_DELIVERY_ORDER_EVENT_TYPE.ADDRESS_CHANGE && event.deliveryAddress) {
      order.deliveryAddress = event.deliveryAddress
    }

    order.updatedAt = Math.max(now, event.createdAt)
    pushFoodDeliveryEventServiceMessage(order, event)
    return event
  }

  const removeOrder = (orderId) => {
    const id = normalizeText(orderId, '', 140)
    const before = orders.value.length
    orders.value = orders.value.filter((order) => order.id !== id)
    return orders.value.length !== before
  }

  const neutralizeRelationshipOrder = (
    orderId,
    profile = {},
    replacementName = 'Someone',
  ) => {
    const order = findOrderById(orderId)
    if (!order) return false
    if (!bindingMatchesProfile(order.relationshipBinding, profile)) return false
    const nextName = normalizeText(replacementName, 'Someone', 120)
    order.note = anonymizeRelationshipText(order.note, profile?.name, nextName)
    order.relationshipBinding = clearRelationshipBinding()
    order.updatedAt = Date.now()
    return true
  }

  const cleanupRelationshipForProfile = (profile = {}, options = {}) => {
    const mode = normalizeText(options.cleanupMode, 'delete_role', 60)
    const replacementName = normalizeText(options.replacementName, 'Someone', 120)
    const matchedOrders = orders.value.filter((order) =>
      bindingMatchesProfile(order.relationshipBinding, profile),
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

  const applySeedMenuMigrations = () => {
    const restaurantIds = new Set(restaurants.value.map((restaurant) => restaurant.id))
    if (!restaurantIds.has(MOON_BISTRO_SEED_RESTAURANT_ID)) return false

    let changed = false
    const nextMenuItems = menuItems.value.map((item) => ({ ...item }))
    const existingMenuItemIds = new Set(nextMenuItems.map((item) => item.id))
    const existingById = new Map(nextMenuItems.map((item) => [item.id, item]))

    MOON_BISTRO_REQUIRED_MENU_ITEMS.forEach((seedItem) => {
      const existing = existingById.get(seedItem.id)
      if (!existing) {
        nextMenuItems.push({ ...seedItem })
        changed = true
        return
      }
      if (!existing.menuSection || existing.menuSection === 'signature') {
        existing.menuSection = seedItem.menuSection
        changed = true
      }
    })

    if (!changed) return false
    menuItems.value = normalizeMenuItems(
      nextMenuItems.filter((item) => item.restaurantId !== MOON_BISTRO_SEED_RESTAURANT_ID || existingMenuItemIds.has(item.id) || item.sourceModule === 'seed'),
      restaurantIds,
    )
    return true
  }

  const applyPersistedSource = (source) => {
    const rawSource = source && typeof source === 'object' ? source : null
    if (!rawSource) return false

    const nextRestaurants = normalizeRestaurants(rawSource.restaurants)
    const restaurantIds = new Set(nextRestaurants.map((restaurant) => restaurant.id))
    const nextMenuItems = normalizeMenuItems(rawSource.menuItems || rawSource.menu, restaurantIds)
    const menuItemIds = new Set(nextMenuItems.map((item) => item.id))
    restaurants.value = nextRestaurants
    menuItems.value = nextMenuItems
    cartItems.value = normalizeCartItems(rawSource.cartItems || rawSource.cart, menuItemIds)
    orders.value = normalizeFoodOrders(rawSource.orders)
    primaryCurrency.value = normalizeCurrency(
      rawSource.primaryCurrency || rawSource.defaultCurrency || rawSource.settings?.primaryCurrency,
      primaryCurrency.value,
    )
    applySeedMenuMigrations()
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(FOOD_DELIVERY_STORAGE_KEY, {
      version: FOOD_DELIVERY_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(FOOD_DELIVERY_STORAGE_KEY, {
      version: FOOD_DELIVERY_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    primaryCurrency: primaryCurrency.value,
    restaurants: restaurants.value.map((restaurant) => ({ ...restaurant })),
    menuItems: menuItems.value.map((item) => ({ ...item })),
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
      snapshot && typeof snapshot.foodDelivery === 'object' && snapshot.foodDelivery
        ? snapshot.foodDelivery
        : snapshot
    return applyPersistedSource(source)
  }

  const persistToStorage = () => {
    writePersistedState(FOOD_DELIVERY_STORAGE_KEY, createBackupSnapshot(), {
      version: FOOD_DELIVERY_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    primaryCurrency.value = DEFAULT_CURRENCY
    restaurants.value = []
    menuItems.value = []
    cartItems.value = []
    orders.value = []
  }

  const setPrimaryCurrency = (currency = '') => {
    const nextCurrency = normalizeCurrency(currency, '')
    if (!nextCurrency) return ''
    primaryCurrency.value = nextCurrency
    return nextCurrency
  }

  const hydratedFromLocal = hydrateFromStorage()
  if (!hydratedFromLocal) {
    restaurants.value = createSeedRestaurants()
    menuItems.value = createSeedMenuItems()
  }

  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [restaurants, menuItems, cartItems, orders, primaryCurrency],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    restaurants,
    menuItems,
    cartItems,
    orders,
    primaryCurrency,
    restaurantCount,
    menuItemCount,
    cartQuantity,
    orderCount,
    recentOrders,
    categorySummaries,
    cartLineItems,
    cartRestaurant,
    cartTotals,
    cartPrimaryTotal,
    hasFinishedStorageHydration,
    findRestaurantById,
    findMenuItemById,
    findOrderById,
    listRestaurantsByCategory,
    listMenuByRestaurant,
    upsertRestaurant,
    upsertMenuItem,
    addToCart,
    updateCartQuantity,
    clearCart,
    checkoutCart,
    updateOrderStatus,
    addOrderEvent,
    removeOrder,
    neutralizeRelationshipOrder,
    cleanupRelationshipForProfile,
    setPrimaryCurrency,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
