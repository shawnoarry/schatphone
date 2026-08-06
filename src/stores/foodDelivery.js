import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  readPersistedState,
  readPersistedStateAsync,
  writePersistedState,
} from '../lib/persistence'
import { normalizeImageSource } from '../lib/image-source-contract'
import {
  FOOD_DELIVERY_CATEGORY_ENTRIES,
  FOOD_DELIVERY_SOURCE_KEYS,
} from '../lib/planned-module-registry'
import { resolveFoodDeliveryAssetUrl } from '../lib/food-shop-presentation'
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
const FOOD_USER_MENU_ITEM_LIMIT = 360
const FOOD_CART_LINE_LIMIT = 40
const FOOD_ORDER_LIMIT = 120
const FOOD_ORDER_EVENT_LIMIT = 24
const DEFAULT_CURRENCY = DEFAULT_WALLET_CURRENCY
const MOON_BISTRO_SEED_RESTAURANT_ID = 'food_seed_moon_bistro'
const RIVER_NOODLES_SEED_RESTAURANT_ID = 'food_seed_river_noodles'
const DAYLIGHT_CAFE_SEED_RESTAURANT_ID = 'food_seed_daylight_cafe'
const HARBOR_ROAST_SEED_RESTAURANT_ID = 'food_seed_harbor_roast'
const SUGAR_LANE_SEED_RESTAURANT_ID = 'food_seed_sugar_lane'
const PEACH_CLOUD_SEED_RESTAURANT_ID = 'food_seed_peach_cloud'
const DASH_GRILL_SEED_RESTAURANT_ID = 'food_seed_dash_grill'
const JADE_HEARTH_SEED_RESTAURANT_ID = 'food_seed_jade_hearth'
const VERDANT_DAY_SEED_RESTAURANT_ID = 'food_seed_verdant_day'
const HARBOR_ROAST_DEFAULT_BEAN_STAMPS = 5

export const HARBOR_ROAST_MERCHANDISE_CATALOG = Object.freeze([
  Object.freeze({
    id: 'harbor_merch_captain_mug',
    title: 'Captain Roast 船长杯',
    titleZh: 'Captain Roast 船长杯',
    titleEn: 'Captain Roast Mug',
    descZh: '铜色船帽杯盖与灯塔杯身，补给站本季限定。',
    descEn: 'A seasonal mug with a copper captain cap and lighthouse body.',
    detailZh: '适合热饮与冷饮，杯身采用奶油白釉面，船长帽杯盖可独立取下收藏。',
    detailEn: 'Made for hot or cold drinks with a cream glaze and a removable captain-cap lid.',
    purchasePriceCents: 12800,
    beanStampCost: 6,
    imagePath: 'merchandise/harbor-roast-merch-captain-mug-01.png',
  }),
  Object.freeze({
    id: 'harbor_merch_anchor_pin',
    title: '铜锚珐琅徽章',
    titleZh: '铜锚珐琅徽章',
    titleEn: 'Copper Anchor Enamel Pin',
    descZh: 'Captain Roast 船帽与港湾铜锚组成的限定徽章。',
    descEn: 'A limited pin pairing the Captain Roast cap with a copper anchor.',
    detailZh: '仅开放豆章兑换，背面配双针扣，适合别在帆布包或咖啡围裙上。',
    detailEn: 'Stamp redemption only, with two pin backs for totes or coffee aprons.',
    purchasePriceCents: 0,
    beanStampCost: 3,
    imagePath: 'merchandise/harbor-roast-merch-anchor-pin-01.png',
  }),
  Object.freeze({
    id: 'harbor_merch_canvas_tote',
    title: '港湾帆布托特包',
    titleZh: '港湾帆布托特包',
    titleEn: 'Harbor Canvas Tote',
    descZh: '厚实帆布与铜色宽带，装得下一整天的城市补给。',
    descEn: 'Heavy canvas and copper straps for a full day of city supplies.',
    detailZh: '本款为现金购买周边，内置杯袋与小物夹层，不参与豆章兑换。',
    detailEn: 'A purchase-only item with a cup sleeve and inner pocket.',
    purchasePriceCents: 8900,
    beanStampCost: 0,
    imagePath: 'merchandise/harbor-roast-merch-canvas-tote-01.png',
  }),
  Object.freeze({
    id: 'harbor_merch_sticker_pack',
    title: '船长豆章贴纸包',
    titleZh: '船长豆章贴纸包',
    titleEn: 'Captain Stamp Sticker Pack',
    descZh: '六枚港口豆章与 Captain Roast 防水贴纸。',
    descEn: 'Six port stamps and waterproof Captain Roast stickers.',
    detailZh: '可直接购买，也可用豆章兑换；每包包含六款不重复图案。',
    detailEn: 'Buy it or redeem stamps. Each pack contains six unique designs.',
    purchasePriceCents: 2900,
    beanStampCost: 2,
    imagePath: 'merchandise/harbor-roast-merch-sticker-pack-01.png',
  }),
])

export const PEACH_CLOUD_MERCHANDISE_CATALOG = Object.freeze([
  Object.freeze({
    id: 'peach_merch_cloud_plush',
    restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
    assetBase: 'peach-cloud',
    sourceModule: 'food_delivery_peach_cloud_merchandise',
    title: '桃气云朵毛绒',
    titleZh: '桃气云朵毛绒',
    titleEn: 'Peach Cloud Plush',
    descZh: '把桃子云招牌小桃子抱回家，柔软云顶与桃粉绒面完整还原。',
    descEn: 'The signature Peach Cloud mascot in soft peach-pink plush with its cloud cap.',
    detailZh: '约 28 cm 高，采用短绒面料与刺绣表情，适合抱枕、桌面陈列与礼赠。',
    detailEn:
      'About 28 cm tall with short plush fabric and embroidered features for display or gifting.',
    purchasePriceCents: 9900,
    beanStampCost: 0,
    imagePath: 'merchandise/peach-cloud-merch-plush-01.png',
  }),
  Object.freeze({
    id: 'peach_merch_cloud_bag_charm',
    restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
    assetBase: 'peach-cloud',
    sourceModule: 'food_delivery_peach_cloud_merchandise',
    title: '桃气随行挂件',
    titleZh: '桃气随行挂件',
    titleEn: 'Peach Cloud Bag Charm',
    descZh: '迷你小桃子搭配粉金登山扣，让云朵桃气跟着包袋一起出门。',
    descEn: 'A miniature mascot with a rose-gold clip for bags and keys.',
    detailZh: '约 9 cm 高，金属扣可拆卸，叶片与云顶使用不同触感面料。',
    detailEn:
      'About 9 cm tall with a detachable metal clip and mixed-texture leaf and cloud details.',
    purchasePriceCents: 3900,
    beanStampCost: 0,
    imagePath: 'merchandise/peach-cloud-merch-bag-charm-01.png',
  }),
  Object.freeze({
    id: 'peach_merch_picnic_tote',
    restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
    assetBase: 'peach-cloud',
    sourceModule: 'food_delivery_peach_cloud_merchandise',
    title: '桃云野餐托特包',
    titleZh: '桃云野餐托特包',
    titleEn: 'Peach Picnic Tote',
    descZh: '浅绿厚帆布、粉色提带与小桃子刺绣，内置饮品杯袋。',
    descEn: 'Pale-green canvas, pink handles, mascot embroidery, and an inner drink sleeve.',
    detailZh: '适合日常通勤与野餐，包口保持挺括，内侧设杯袋和小物夹层。',
    detailEn: 'A structured everyday tote with an inner cup sleeve and small-item pocket.',
    purchasePriceCents: 7900,
    beanStampCost: 0,
    imagePath: 'merchandise/peach-cloud-merch-tote-01.png',
  }),
])

const HARBOR_ROAST_MERCHANDISE_BY_ID = new Map(
  HARBOR_ROAST_MERCHANDISE_CATALOG.map((item) => [item.id, item]),
)
const PEACH_CLOUD_MERCHANDISE_BY_ID = new Map(
  PEACH_CLOUD_MERCHANDISE_CATALOG.map((item) => [item.id, item]),
)
const FOOD_DELIVERY_MERCHANDISE_BY_ID = new Map(
  [...HARBOR_ROAST_MERCHANDISE_CATALOG, ...PEACH_CLOUD_MERCHANDISE_CATALOG].map((item) => [
    item.id,
    item,
  ]),
)
const HARBOR_ROAST_MERCHANDISE_ACQUISITIONS = new Set(['purchase', 'redeemed_gift'])

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
const FOOD_DELIVERY_FULFILLMENT_MODE_VALUES = new Set(['delivery', 'pickup'])
const FOOD_DELIVERY_PICKUP_MODE_VALUES = new Set(['takeout', 'dine_in'])
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
  const cents = Number.isFinite(Number(amountCents))
    ? Math.max(0, Math.floor(Number(amountCents)))
    : 0
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

const normalizeFulfillmentMode = (value, fallback = 'delivery') => {
  const normalized = normalizeText(value, fallback, 24).toLowerCase()
  return FOOD_DELIVERY_FULFILLMENT_MODE_VALUES.has(normalized) ? normalized : fallback
}

const normalizePickupMode = (value, fallback = '') => {
  const normalized = normalizeText(value, fallback, 24).toLowerCase()
  return FOOD_DELIVERY_PICKUP_MODE_VALUES.has(normalized) ? normalized : fallback
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

const createRestaurantId = () =>
  `food_restaurant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const createMenuItemId = () => `food_menu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const createFoodOrderId = () => `food_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const createPlatformOrderId = () =>
  `platform_food_order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const createFoodOrderEventId = () =>
  `food_event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeRestaurant = (rawRestaurant, index = 0) => {
  if (!rawRestaurant || typeof rawRestaurant !== 'object') return null

  const name = normalizeText(rawRestaurant.name || rawRestaurant.title, '', 90)
  if (!name) return null

  const now = Date.now()
  const updatedAt = Math.max(0, toInt(rawRestaurant.updatedAt, now))
  const deliveryFeeCents =
    Number.isFinite(Number(rawRestaurant.deliveryFeeCents)) &&
    Number(rawRestaurant.deliveryFeeCents) >= 0
      ? Math.floor(Number(rawRestaurant.deliveryFeeCents))
      : normalizeAmountCents(rawRestaurant.deliveryFee)

  return {
    id: normalizeFoodId(rawRestaurant.id) || `food_restaurant_legacy_${now}_${index}`,
    name,
    category: normalizeCategory(rawRestaurant.category),
    cuisine: normalizeText(rawRestaurant.cuisine, '', 80),
    rating: normalizeRating(rawRestaurant.rating),
    deliveryEtaMinutes: clamp(
      toInt(rawRestaurant.deliveryEtaMinutes || rawRestaurant.etaMinutes, 28),
      5,
      180,
    ),
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
  return normalized.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, FOOD_RESTAURANT_LIMIT)
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
    menuSection: normalizeMenuSection(
      rawItem.menuSection || rawItem.section || rawItem.menuCategory,
    ),
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

const normalizeMenuItems = (rawItems, restaurantIds, preservedMenuItemIds = null) => {
  if (!Array.isArray(rawItems)) return []
  const seen = new Set()
  const normalized = []
  rawItems.forEach((item, index) => {
    const menuItem = normalizeMenuItem(item, restaurantIds, index)
    if (!menuItem || seen.has(menuItem.id)) return
    seen.add(menuItem.id)
    normalized.push(menuItem)
  })
  let userMenuItemCount = 0
  return normalized
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((menuItem) => {
      if (preservedMenuItemIds?.has(menuItem.id)) return true
      userMenuItemCount += 1
      return userMenuItemCount <= FOOD_USER_MENU_ITEM_LIMIT
    })
}

const normalizeHarborRoastRewards = (rawRewards) => ({
  beanStamps: clamp(toInt(rawRewards?.beanStamps, HARBOR_ROAST_DEFAULT_BEAN_STAMPS), 0, 999),
})

const normalizeMenuSelection = (rawSelection) => {
  if (!rawSelection || typeof rawSelection !== 'object') return null
  const selection = {
    temperature: normalizeText(rawSelection.temperature, '', 24),
    temperatureLabelZh: normalizeText(rawSelection.temperatureLabelZh, '', 40),
    temperatureLabelEn: normalizeText(rawSelection.temperatureLabelEn, '', 40),
    size: normalizeText(rawSelection.size, '', 24),
    sizeLabelZh: normalizeText(rawSelection.sizeLabelZh, '', 40),
    sizeLabelEn: normalizeText(rawSelection.sizeLabelEn, '', 40),
    packaging: normalizeText(rawSelection.packaging, '', 40),
    packagingLabelZh: normalizeText(rawSelection.packagingLabelZh, '', 60),
    packagingLabelEn: normalizeText(rawSelection.packagingLabelEn, '', 60),
    comboSide: normalizeText(rawSelection.comboSide, '', 40),
    comboSideLabelZh: normalizeText(rawSelection.comboSideLabelZh, '', 60),
    comboSideLabelEn: normalizeText(rawSelection.comboSideLabelEn, '', 60),
    comboDrink: normalizeText(rawSelection.comboDrink, '', 40),
    comboDrinkLabelZh: normalizeText(rawSelection.comboDrinkLabelZh, '', 60),
    comboDrinkLabelEn: normalizeText(rawSelection.comboDrinkLabelEn, '', 60),
    sauce: normalizeText(rawSelection.sauce, '', 40),
    sauceLabelZh: normalizeText(rawSelection.sauceLabelZh, '', 60),
    sauceLabelEn: normalizeText(rawSelection.sauceLabelEn, '', 60),
  }
  return Object.values(selection).some(Boolean) ? selection : null
}

const normalizeMerchandiseAcquisition = (value, fallback = 'purchase') => {
  const normalized = normalizeText(value, fallback, 32)
  return HARBOR_ROAST_MERCHANDISE_ACQUISITIONS.has(normalized) ? normalized : fallback
}

const normalizeCartItem = (rawItem, menuItemIds, index = 0) => {
  if (!rawItem || typeof rawItem !== 'object') return null

  const merchandiseId = normalizeFoodId(rawItem.merchandiseId)
  const merchandise = FOOD_DELIVERY_MERCHANDISE_BY_ID.get(merchandiseId)
  if (rawItem.lineKind === 'merchandise' || merchandise) {
    if (!merchandise) return null
    const acquisition = normalizeMerchandiseAcquisition(rawItem.acquisition)
    if (acquisition === 'purchase' && merchandise.purchasePriceCents <= 0) return null
    if (acquisition === 'redeemed_gift' && merchandise.beanStampCost <= 0) return null
    const now = Date.now()
    const addedAt = Math.max(0, toInt(rawItem.addedAt || rawItem.createdAt, now + index))
    return {
      lineId: `${merchandise.id}__${acquisition}`,
      lineKind: 'merchandise',
      merchandiseId: merchandise.id,
      restaurantId: merchandise.restaurantId || HARBOR_ROAST_SEED_RESTAURANT_ID,
      acquisition,
      title: merchandise.title,
      titleZh: merchandise.titleZh,
      titleEn: merchandise.titleEn,
      imagePath: merchandise.imagePath,
      assetBase: normalizeText(merchandise.assetBase, 'harbor-roast', 60),
      unitPriceCents: acquisition === 'redeemed_gift' ? 0 : merchandise.purchasePriceCents,
      beanStampCost: acquisition === 'redeemed_gift' ? merchandise.beanStampCost : 0,
      quantity: normalizeQuantity(rawItem.quantity),
      sourceModule: normalizeText(
        rawItem.sourceModule,
        merchandise.sourceModule || 'food_delivery_harbor_merchandise',
        60,
      ),
      sourceId: normalizeText(rawItem.sourceId, merchandise.id, 140),
      addedAt,
      updatedAt: Math.max(0, toInt(rawItem.updatedAt, addedAt)),
    }
  }

  const menuItemId = normalizeFoodId(rawItem.menuItemId || rawItem.id)
  if (!menuItemId || (menuItemIds.size > 0 && !menuItemIds.has(menuItemId))) return null
  const now = Date.now()
  const addedAt = Math.max(0, toInt(rawItem.addedAt || rawItem.createdAt, now + index))
  const selectionKey = normalizeText(rawItem.selectionKey, '', 64)
  const selection = selectionKey ? normalizeMenuSelection(rawItem.selection) : null
  const selectedUnitPriceCents =
    selectionKey &&
    Number.isFinite(Number(rawItem.unitPriceCents)) &&
    Number(rawItem.unitPriceCents) > 0
      ? Math.floor(Number(rawItem.unitPriceCents))
      : null

  return {
    lineId: selectionKey ? `${menuItemId}__${selectionKey}`.slice(0, 140) : menuItemId,
    lineKind: 'menu',
    menuItemId,
    selectionKey,
    selection,
    unitPriceCents: selectedUnitPriceCents,
    quantity: normalizeQuantity(rawItem.quantity),
    sourceModule: normalizeText(rawItem.sourceModule, 'food_delivery_cart', 60),
    sourceId: normalizeText(rawItem.sourceId, '', 140),
    addedAt,
    updatedAt: Math.max(0, toInt(rawItem.updatedAt, addedAt)),
  }
}

const normalizeCartItems = (rawItems, menuItemsById) => {
  if (!Array.isArray(rawItems)) return []
  const menuItemIds = new Set(menuItemsById.keys())
  const byLineId = new Map()
  rawItems.forEach((item, index) => {
    const cartItem = normalizeCartItem(item, menuItemIds, index)
    if (!cartItem) return
    const existing = byLineId.get(cartItem.lineId)
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + cartItem.quantity)
      existing.updatedAt = Math.max(existing.updatedAt, cartItem.updatedAt)
      return
    }
    byLineId.set(cartItem.lineId, cartItem)
  })
  const restaurantLineCounts = new Map()
  return [...byLineId.values()]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .filter((cartItem) => {
      const restaurantId =
        cartItem.lineKind === 'merchandise'
          ? cartItem.restaurantId
          : menuItemsById.get(cartItem.menuItemId)?.restaurantId || ''
      if (!restaurantId) return false
      const nextCount = (restaurantLineCounts.get(restaurantId) || 0) + 1
      restaurantLineCounts.set(restaurantId, nextCount)
      return nextCount <= FOOD_CART_LINE_LIMIT
    })
}

const normalizePlatformCartItem = (rawItem, index = 0) => {
  if (!rawItem || typeof rawItem !== 'object') return null
  const merchantId = normalizeFoodId(rawItem.merchantId)
  const itemId = normalizeFoodId(rawItem.itemId || rawItem.menuItemId || rawItem.id)
  const merchantName = normalizeText(rawItem.merchantName, '', 90)
  const title = normalizeText(rawItem.title || rawItem.name, '', 90)
  const unitPriceCents =
    Number.isFinite(Number(rawItem.unitPriceCents)) && Number(rawItem.unitPriceCents) > 0
      ? Math.floor(Number(rawItem.unitPriceCents))
      : normalizeAmountCents(rawItem.price)
  if (!merchantId || !itemId || !merchantName || !title || unitPriceCents <= 0) return null
  const now = Date.now()
  const addedAt = Math.max(0, toInt(rawItem.addedAt || rawItem.createdAt, now + index))

  return {
    merchantId,
    merchantName,
    itemId,
    title,
    unitPriceCents,
    quantity: normalizeQuantity(rawItem.quantity),
    sourceModule: normalizeText(rawItem.sourceModule, 'food_delivery_platform_cart', 60),
    sourceId: normalizeText(rawItem.sourceId, merchantId, 140),
    addedAt,
    updatedAt: Math.max(0, toInt(rawItem.updatedAt, addedAt)),
  }
}

const normalizePlatformCartItems = (rawItems) => {
  if (!Array.isArray(rawItems)) return []
  const byItemId = new Map()
  rawItems.forEach((item, index) => {
    const cartItem = normalizePlatformCartItem(item, index)
    if (!cartItem) return
    const existing = byItemId.get(cartItem.itemId)
    if (existing && existing.merchantId === cartItem.merchantId) {
      existing.quantity = Math.min(99, existing.quantity + cartItem.quantity)
      existing.updatedAt = Math.max(existing.updatedAt, cartItem.updatedAt)
      return
    }
    byItemId.set(cartItem.itemId, cartItem)
  })
  const normalizedItems = [...byItemId.values()].sort((a, b) => b.updatedAt - a.updatedAt)
  const activeMerchantId = normalizedItems[0]?.merchantId || ''
  return normalizedItems
    .filter((item) => item.merchantId === activeMerchantId)
    .slice(0, FOOD_CART_LINE_LIMIT)
}

const normalizePlatformOrderItem = (rawItem, index = 0) => {
  if (!rawItem || typeof rawItem !== 'object') return null
  const itemId = normalizeFoodId(rawItem.itemId || rawItem.menuItemId || rawItem.id)
  const title = normalizeText(rawItem.title || rawItem.name, '', 90)
  const unitPriceCents =
    Number.isFinite(Number(rawItem.unitPriceCents)) && Number(rawItem.unitPriceCents) > 0
      ? Math.floor(Number(rawItem.unitPriceCents))
      : normalizeAmountCents(rawItem.price)
  if (!itemId || !title || unitPriceCents <= 0) return null

  return {
    id: normalizeText(rawItem.id, `${itemId}_${index}`, 140),
    itemId,
    title,
    quantity: normalizeQuantity(rawItem.quantity),
    unitPriceCents,
    currency: normalizeCurrency(rawItem.currency),
  }
}

const normalizePlatformOrder = (rawOrder, index = 0) => {
  if (!rawOrder || typeof rawOrder !== 'object') return null
  const merchantId = normalizeFoodId(rawOrder.merchantId)
  const merchantName = normalizeText(rawOrder.merchantName, '', 90)
  const items = Array.isArray(rawOrder.items)
    ? rawOrder.items
        .map((item, itemIndex) => normalizePlatformOrderItem(item, itemIndex))
        .filter(Boolean)
    : []
  if (!merchantId || !merchantName || items.length === 0) return null

  const now = Date.now()
  const createdAt = Math.max(0, toInt(rawOrder.createdAt, now + index))
  const currency = normalizeCurrency(rawOrder.currency || items[0]?.currency)
  const itemsTotalCents = items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)
  const deliveryFeeCents =
    Number.isFinite(Number(rawOrder.deliveryFeeCents)) && Number(rawOrder.deliveryFeeCents) >= 0
      ? Math.floor(Number(rawOrder.deliveryFeeCents))
      : normalizeAmountCents(rawOrder.deliveryFee)
  const totalCents = itemsTotalCents + deliveryFeeCents

  return {
    id: normalizeText(rawOrder.id, `platform_food_order_legacy_${now}_${index}`, 140),
    status: normalizeStatus(rawOrder.status),
    merchantId,
    merchantName,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    itemsTotalCents,
    itemsTotal: formatAmount(itemsTotalCents),
    deliveryFeeCents,
    deliveryFee: formatAmount(deliveryFeeCents),
    totalCents,
    total: formatAmount(totalCents),
    currency,
    deliveryAddress: normalizeText(rawOrder.deliveryAddress || rawOrder.address, '', 160),
    note: normalizeText(rawOrder.note, '', 240),
    paymentMethod: normalizeText(rawOrder.paymentMethod, 'app_pay', 40),
    etaMinutes: clamp(toInt(rawOrder.etaMinutes, 35), 5, 180),
    sourceModule: normalizeText(rawOrder.sourceModule, 'food_delivery_platform_checkout', 60),
    sourceId: normalizeText(rawOrder.sourceId, merchantId, 140),
    createdAt,
    updatedAt: Math.max(0, toInt(rawOrder.updatedAt, createdAt)),
  }
}

const normalizePlatformOrders = (rawOrders) => {
  if (!Array.isArray(rawOrders)) return []
  const seen = new Set()
  const normalized = []
  rawOrders.forEach((item, index) => {
    const order = normalizePlatformOrder(item, index)
    if (!order || seen.has(order.id)) return
    seen.add(order.id)
    normalized.push(order)
  })
  return normalized.sort((a, b) => b.createdAt - a.createdAt).slice(0, FOOD_ORDER_LIMIT)
}

const normalizeOrderItem = (rawItem, index = 0) => {
  if (!rawItem || typeof rawItem !== 'object') return null
  const lineKind =
    rawItem.lineKind === 'merchandise' || rawItem.merchandiseId ? 'merchandise' : 'menu'
  const acquisition =
    lineKind === 'merchandise' ? normalizeMerchandiseAcquisition(rawItem.acquisition) : 'purchase'
  const menuItemId =
    lineKind === 'menu'
      ? normalizeFoodId(rawItem.menuItemId || rawItem.productId || rawItem.id)
      : ''
  const merchandiseId =
    lineKind === 'merchandise'
      ? normalizeFoodId(rawItem.merchandiseId || rawItem.productId || rawItem.id)
      : ''
  const title = normalizeText(rawItem.title || rawItem.name, '', 90)
  const unitPriceCents =
    Number.isFinite(Number(rawItem.unitPriceCents)) && Number(rawItem.unitPriceCents) >= 0
      ? Math.floor(Number(rawItem.unitPriceCents))
      : normalizeAmountCents(rawItem.price)
  const allowsZeroPrice = lineKind === 'merchandise' && acquisition === 'redeemed_gift'
  if (
    !(lineKind === 'merchandise' ? merchandiseId : menuItemId) ||
    !title ||
    (allowsZeroPrice ? unitPriceCents !== 0 : unitPriceCents <= 0)
  )
    return null
  const productId = lineKind === 'merchandise' ? merchandiseId : menuItemId

  return {
    id: normalizeText(rawItem.id, `${productId}_${index}`, 140),
    lineKind,
    menuItemId,
    merchandiseId,
    acquisition,
    title,
    titleZh: normalizeText(rawItem.titleZh, '', 90),
    titleEn: normalizeText(rawItem.titleEn, '', 90),
    imagePath: normalizeText(rawItem.imagePath, '', 200),
    assetBase: normalizeText(rawItem.assetBase, '', 60),
    beanStampCost:
      acquisition === 'redeemed_gift' ? clamp(toInt(rawItem.beanStampCost, 0), 0, 999) : 0,
    category: normalizeCategory(rawItem.category, 'restaurants'),
    selectionKey: normalizeText(rawItem.selectionKey, '', 64),
    selection: normalizeMenuSelection(rawItem.selection),
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
    title: normalizeText(
      rawEvent.title,
      FOOD_DELIVERY_ORDER_EVENT_TITLES[type] || 'Food delivery update',
      120,
    ),
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
  return normalized.sort((a, b) => b.createdAt - a.createdAt).slice(0, FOOD_ORDER_EVENT_LIMIT)
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
  if (event.etaMinutes !== null && event.etaMinutes !== undefined)
    return `ETA updated to ${event.etaMinutes} minutes.`
  return `Food Delivery updated ${foodOrderTitle(order)}.`
}

const FOOD_DELIVERY_UI_ASSET_ROOT = 'images/ui-assets/apps/food-delivery/'
const foodDeliveryUiAsset = (path) =>
  `${import.meta.env.BASE_URL || '/'}${FOOD_DELIVERY_UI_ASSET_ROOT}${path}`

const LEGACY_REMOTE_SEED_IMAGE_BY_ID = Object.freeze({
  [RIVER_NOODLES_SEED_RESTAURANT_ID]:
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
  [DAYLIGHT_CAFE_SEED_RESTAURANT_ID]:
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
  [SUGAR_LANE_SEED_RESTAURANT_ID]:
    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=900&q=80',
  food_menu_river_noodles:
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
  food_menu_cafe_latte:
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
  food_menu_sugar_cake:
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80',
})

const migrateLegacySeedImage = (existingRecord, seedRecord) => {
  const existingImage = existingRecord?.image
  const seedImage = seedRecord?.image
  if (existingImage?.sourceType !== 'url' || seedImage?.sourceType !== 'url') return false
  const migratedUrl = resolveFoodDeliveryAssetUrl(existingImage.url)
  const isConfiguredLocalPath = migratedUrl !== existingImage.url && migratedUrl === seedImage.url
  const isKnownLegacyRemote =
    LEGACY_REMOTE_SEED_IMAGE_BY_ID[existingRecord.id] === existingImage.url
  if (!isConfiguredLocalPath && !isKnownLegacyRemote) return false

  existingRecord.image = { ...existingImage, url: seedImage.url }
  return true
}

const FOOD_SEED_IMAGE_URLS = Object.freeze({
  moonBistro: foodDeliveryUiAsset('moon-bistro/cover/moon-bistro-cover-02.png'),
  riverNoodles: foodDeliveryUiAsset('river-noodles/cover/river-noodles-cover-01.png'),
  daylightCafe: foodDeliveryUiAsset('daylight-cafe/cover/daylight-cafe-cover-01.png'),
  harborRoast: foodDeliveryUiAsset('harbor-roast/cover/harbor-roast-cover-01.png'),
  sugarLane: foodDeliveryUiAsset('sugar-lane/cover/sugar-lane-cover-01.png'),
  peachCloud: foodDeliveryUiAsset('peach-cloud/cover/peach-cloud-hero-01.png'),
  dashGrill: foodDeliveryUiAsset('dash-grill/cover/dash-grill-cover-01.png'),
  jadeHearth: foodDeliveryUiAsset('jade-hearth/cover/jade-hearth-cover-01.png'),
  verdantDay: foodDeliveryUiAsset('verdant-day/cover/verdant-day-cover-01.png'),
  dashGrillProduct: (index) =>
    foodDeliveryUiAsset(
      `dash-grill/products/dash-grill-item-${String(index).padStart(2, '0')}.png`,
    ),
  jadeHearthProduct: (index) =>
    foodDeliveryUiAsset(
      `jade-hearth/products/jade-hearth-item-${String(index).padStart(2, '0')}.png`,
    ),
  verdantDayProduct: (index) =>
    foodDeliveryUiAsset(
      `verdant-day/products/verdant-day-item-${String(index).padStart(2, '0')}.png`,
    ),
  peachCloudProduct: (index) =>
    foodDeliveryUiAsset(
      `peach-cloud/products/peach-cloud-item-${String(index).padStart(2, '0')}.png`,
    ),
  riverNoodlesProduct: (index) =>
    foodDeliveryUiAsset(
      `river-noodles/products/river-noodles-item-${String(index).padStart(2, '0')}.png`,
    ),
  daylightCafeProduct: (index) =>
    foodDeliveryUiAsset(
      `daylight-cafe/products/daylight-cafe-item-${String(index).padStart(2, '0')}.png`,
    ),
  harborRoastProduct: (index) =>
    foodDeliveryUiAsset(
      `harbor-roast/products/harbor-roast-item-${String(index).padStart(2, '0')}.png`,
    ),
  sugarLaneProduct: (index) =>
    foodDeliveryUiAsset(
      `sugar-lane/products/sugar-lane-item-${String(index).padStart(2, '0')}.png`,
    ),
  lunarRice: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-03.png'),
  signalSoup: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-02.png'),
  velvetSoup: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-01.png'),
  tideShrimpStew: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-05.png'),
  emberVegetables: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-07.png'),
  rosemaryChicken: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-09.png'),
  nightTagliatelle: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-29.png'),
  emberLasagna: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-50.png'),
  blueMoonBowl: foodDeliveryUiAsset('moon-bistro/dishes/moon-bistro-dish-15.png'),
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
  const fulfillmentMode = normalizeFulfillmentMode(rawOrder.fulfillmentMode)
  const pickupMode =
    fulfillmentMode === 'pickup' ? normalizePickupMode(rawOrder.pickupMode, 'takeout') : ''
  const normalizedDeliveryFeeCents = fulfillmentMode === 'pickup' ? 0 : deliveryFeeCents
  const totals = summarizeOrderTotals(items, normalizedDeliveryFeeCents, currency)
  const primaryTotal = totals.find((item) => item.currency === DEFAULT_CURRENCY) ||
    totals[0] || {
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
    deliveryFeeCents: normalizedDeliveryFeeCents,
    deliveryFee: formatAmount(normalizedDeliveryFeeCents),
    totals,
    totalCents: primaryTotal.amountCents,
    currency: primaryTotal.currency,
    deliveryAddress: normalizeText(rawOrder.deliveryAddress || rawOrder.address, '', 160),
    note: normalizeText(rawOrder.note, '', 240),
    fulfillmentMode,
    pickupMode,
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
  return normalized.sort((a, b) => b.createdAt - a.createdAt).slice(0, FOOD_ORDER_LIMIT)
}

const createSeedRestaurants = () =>
  normalizeRestaurants([
    {
      id: MOON_BISTRO_SEED_RESTAURANT_ID,
      name: 'Moon Bistro',
      category: 'restaurants',
      cuisine: 'Modern fine dining',
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
      id: RIVER_NOODLES_SEED_RESTAURANT_ID,
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
      id: DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
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
      id: HARBOR_ROAST_SEED_RESTAURANT_ID,
      name: 'Harbor Roast',
      category: 'cafe',
      cuisine: 'Espresso, signature drinks, tea, and counter bakes',
      rating: 4.8,
      deliveryEtaMinutes: 20,
      deliveryFee: '3.50',
      distanceKm: 1.3,
      address: 'Pier Exchange 16',
      imageSourceType: 'url',
      imageUrl: FOOD_SEED_IMAGE_URLS.harborRoast,
      imageAlt: 'Harbor Roast coffee drinks and counter bakes',
      sourceModule: 'seed',
      createdAt: Date.now() - 18 * 60 * 1000,
      updatedAt: Date.now() - 18 * 60 * 1000,
    },
    {
      id: SUGAR_LANE_SEED_RESTAURANT_ID,
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
    {
      id: PEACH_CLOUD_SEED_RESTAURANT_ID,
      name: 'Peach Cloud',
      category: 'dessert',
      cuisine: 'Tea, chilled drinks, and bakery sweets',
      rating: 4.9,
      deliveryEtaMinutes: 21,
      deliveryFee: '4.00',
      distanceKm: 1.1,
      address: 'Sunset Arcade 7',
      imageSourceType: 'url',
      imageUrl: FOOD_SEED_IMAGE_URLS.peachCloud,
      imageAlt: 'Peach Cloud drinks and desserts counter',
      sourceModule: 'seed',
      createdAt: Date.now() - 4 * 60 * 1000,
      updatedAt: Date.now() - 4 * 60 * 1000,
    },
    {
      id: DASH_GRILL_SEED_RESTAURANT_ID,
      name: 'Dash Grill',
      category: 'fast_food',
      cuisine: 'Burgers, fries, and shakes',
      rating: 4.8,
      deliveryEtaMinutes: 19,
      deliveryFee: '3.50',
      distanceKm: 0.9,
      address: 'Central Arcade 12',
      imageSourceType: 'url',
      imageUrl: FOOD_SEED_IMAGE_URLS.dashGrill,
      imageAlt: 'Dash Grill burger meal',
      sourceModule: 'seed',
      createdAt: Date.now() - 3 * 60 * 1000,
      updatedAt: Date.now() - 3 * 60 * 1000,
    },
    {
      id: JADE_HEARTH_SEED_RESTAURANT_ID,
      name: 'Jade Hearth',
      category: 'restaurants',
      cuisine: 'Regional Chinese dishes and shared tables',
      rating: 4.9,
      deliveryEtaMinutes: 28,
      deliveryFee: '5.00',
      distanceKm: 1.6,
      address: 'Camphor Lane 28',
      imageSourceType: 'url',
      imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearth,
      imageAlt: 'Jade Hearth Chinese shared table',
      sourceModule: 'seed',
      createdAt: Date.now() - 16 * 60 * 1000,
      updatedAt: Date.now() - 16 * 60 * 1000,
    },
    {
      id: VERDANT_DAY_SEED_RESTAURANT_ID,
      name: 'Verdant Day',
      category: 'restaurants',
      cuisine: 'Salads, grain bowls, wraps, and bright sips',
      rating: 4.8,
      deliveryEtaMinutes: 22,
      deliveryFee: '3.50',
      distanceKm: 1.2,
      address: 'Willow Walk 9',
      imageSourceType: 'url',
      imageUrl: FOOD_SEED_IMAGE_URLS.verdantDay,
      imageAlt: 'Verdant Day fresh salad and grain bowl table',
      sourceModule: 'seed',
      createdAt: Date.now() - 17 * 60 * 1000,
      updatedAt: Date.now() - 17 * 60 * 1000,
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
        desc: 'Grilled slices, warm rice, and crisp pickles, composed as a balanced signature set.',
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
        desc: 'Creamy mushroom soup with thyme and black pepper, finished with cultured cream.',
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
        title: 'Truffle Tagliatelle',
        category: 'restaurants',
        menuSection: 'pasta',
        price: '52.00',
        desc: 'Creamy mushroom tagliatelle with herbs and blistered tomato.',
        ingredients: 'tagliatelle, mushroom, cream, tomato, thyme, parmesan',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.nightTagliatelle,
        imageAlt: 'Truffle Tagliatelle',
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
        restaurantId: RIVER_NOODLES_SEED_RESTAURANT_ID,
        title: 'River Beef Noodles',
        category: 'fast_food',
        menuSection: 'broth_noodles',
        price: '36.00',
        desc: 'Hand-pulled noodles with slow-braised beef, clear aromatic broth, greens, and scallion.',
        ingredients: 'hand-pulled noodles, braised beef, beef broth, bok choy, scallion',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.riverNoodlesProduct(1),
        imageAlt: 'River Beef Noodles',
        sourceModule: 'seed',
        createdAt: Date.now() - 6 * 60 * 1000,
        updatedAt: Date.now() - 6 * 60 * 1000,
      },
      {
        id: 'food_menu_river_tomato_beef',
        restaurantId: RIVER_NOODLES_SEED_RESTAURANT_ID,
        title: 'Tomato Braised Beef Noodles',
        category: 'fast_food',
        menuSection: 'broth_noodles',
        price: '39.00',
        desc: 'Hand-pulled noodles in a bright tomato-beef broth with tender beef chunks and greens.',
        ingredients: 'hand-pulled noodles, braised beef, tomato, beef broth, bok choy',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.riverNoodlesProduct(2),
        imageAlt: 'Tomato Braised Beef Noodles',
        sourceModule: 'seed',
        createdAt: Date.now() - 7 * 60 * 1000,
        updatedAt: Date.now() - 7 * 60 * 1000,
      },
      {
        id: 'food_menu_river_chicken_shiitake',
        restaurantId: RIVER_NOODLES_SEED_RESTAURANT_ID,
        title: 'Chicken Shiitake Noodles',
        category: 'fast_food',
        menuSection: 'broth_noodles',
        price: '34.00',
        desc: 'Silky noodles with poached chicken, shiitake mushrooms, baby greens, and a light chicken broth.',
        ingredients: 'noodles, chicken, shiitake mushroom, chicken broth, baby greens',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.riverNoodlesProduct(3),
        imageAlt: 'Chicken Shiitake Noodles',
        sourceModule: 'seed',
        createdAt: Date.now() - 8 * 60 * 1000,
        updatedAt: Date.now() - 8 * 60 * 1000,
      },
      {
        id: 'food_menu_river_pickled_fish',
        restaurantId: RIVER_NOODLES_SEED_RESTAURANT_ID,
        title: 'Pickled Mustard Fish Noodles',
        category: 'fast_food',
        menuSection: 'broth_noodles',
        price: '42.00',
        desc: 'White fish, pickled mustard greens, chili, and peppercorn in a tangy golden noodle broth.',
        ingredients: 'noodles, white fish, pickled mustard greens, chili, Sichuan peppercorn',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.riverNoodlesProduct(4),
        imageAlt: 'Pickled Mustard Fish Noodles',
        sourceModule: 'seed',
        createdAt: Date.now() - 9 * 60 * 1000,
        updatedAt: Date.now() - 9 * 60 * 1000,
      },
      {
        id: 'food_menu_river_sesame_scallion',
        restaurantId: RIVER_NOODLES_SEED_RESTAURANT_ID,
        title: 'Sesame Scallion Dry Noodles',
        category: 'fast_food',
        menuSection: 'dry_noodles',
        price: '27.00',
        desc: 'Springy noodles tossed with sesame paste, scallion oil, cucumber ribbons, and toasted sesame.',
        ingredients: 'noodles, sesame paste, scallion oil, cucumber, toasted sesame',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.riverNoodlesProduct(5),
        imageAlt: 'Sesame Scallion Dry Noodles',
        sourceModule: 'seed',
        createdAt: Date.now() - 10 * 60 * 1000,
        updatedAt: Date.now() - 10 * 60 * 1000,
      },
      {
        id: 'food_menu_river_chili_pork',
        restaurantId: RIVER_NOODLES_SEED_RESTAURANT_ID,
        title: 'Chili Crisp Pork Noodles',
        category: 'fast_food',
        menuSection: 'dry_noodles',
        price: '32.00',
        desc: 'Dry noodles with savory minced pork, house chili crisp, crushed peanut, and fresh scallion.',
        ingredients: 'noodles, minced pork, chili crisp, peanut, scallion',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.riverNoodlesProduct(6),
        imageAlt: 'Chili Crisp Pork Noodles',
        sourceModule: 'seed',
        createdAt: Date.now() - 11 * 60 * 1000,
        updatedAt: Date.now() - 11 * 60 * 1000,
      },
      {
        id: 'food_menu_river_cucumber',
        restaurantId: RIVER_NOODLES_SEED_RESTAURANT_ID,
        title: 'Cucumber Sesame Salad',
        category: 'fast_food',
        menuSection: 'noodle_sides',
        price: '16.00',
        desc: 'Crushed cucumber with black vinegar, sesame, garlic, and a restrained chili-oil finish.',
        ingredients: 'cucumber, black vinegar, sesame, garlic, chili oil',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.riverNoodlesProduct(7),
        imageAlt: 'Cucumber Sesame Salad',
        sourceModule: 'seed',
        createdAt: Date.now() - 12 * 60 * 1000,
        updatedAt: Date.now() - 12 * 60 * 1000,
      },
      {
        id: 'food_menu_river_lotus_root',
        restaurantId: RIVER_NOODLES_SEED_RESTAURANT_ID,
        title: 'Crispy Pepper Lotus Root',
        category: 'fast_food',
        menuSection: 'noodle_sides',
        price: '19.00',
        desc: 'Thin lotus-root slices fried crisp with green pepper, sesame, and flaky salt.',
        ingredients: 'lotus root, green pepper, sesame, flaky salt, rice flour',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.riverNoodlesProduct(8),
        imageAlt: 'Crispy Pepper Lotus Root',
        sourceModule: 'seed',
        createdAt: Date.now() - 13 * 60 * 1000,
        updatedAt: Date.now() - 13 * 60 * 1000,
      },
      {
        id: 'food_menu_river_plum_cooler',
        restaurantId: RIVER_NOODLES_SEED_RESTAURANT_ID,
        title: 'Osmanthus Plum Cooler',
        category: 'fast_food',
        menuSection: 'coolers',
        price: '14.00',
        desc: 'A chilled sweet-sour smoked plum drink finished with osmanthus and a slice of citrus.',
        ingredients: 'smoked plum, osmanthus, rock sugar, citrus, water',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.riverNoodlesProduct(9),
        imageAlt: 'Osmanthus Plum Cooler',
        sourceModule: 'seed',
        createdAt: Date.now() - 14 * 60 * 1000,
        updatedAt: Date.now() - 14 * 60 * 1000,
      },
      {
        id: 'food_menu_cafe_latte',
        restaurantId: DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
        title: 'Daylight Latte',
        category: 'cafe',
        menuSection: 'espresso_bar',
        price: '22.00',
        desc: 'A balanced double espresso with silky steamed milk and a soft cocoa finish.',
        ingredients: 'double espresso, whole milk, cocoa',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.daylightCafeProduct(1),
        imageAlt: 'Daylight Latte',
        sourceModule: 'seed',
        createdAt: Date.now() - 5 * 60 * 1000,
        updatedAt: Date.now() - 5 * 60 * 1000,
      },
      {
        id: 'food_menu_daylight_honey_oat_flat_white',
        restaurantId: DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
        title: 'Honey Oat Flat White',
        category: 'cafe',
        menuSection: 'espresso_bar',
        price: '25.00',
        desc: 'Ristretto coffee with oat milk and a small ribbon of wildflower honey.',
        ingredients: 'ristretto, oat milk, wildflower honey',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.daylightCafeProduct(2),
        imageAlt: 'Honey Oat Flat White',
        sourceModule: 'seed',
        createdAt: Date.now() - 6 * 60 * 1000,
        updatedAt: Date.now() - 6 * 60 * 1000,
      },
      {
        id: 'food_menu_daylight_orange_tonic',
        restaurantId: DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
        title: 'Orange Espresso Tonic',
        category: 'cafe',
        menuSection: 'espresso_bar',
        price: '27.00',
        desc: 'Espresso poured over citrus tonic with fresh orange and a rosemary sprig.',
        ingredients: 'espresso, tonic water, orange, rosemary, ice',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.daylightCafeProduct(3),
        imageAlt: 'Orange Espresso Tonic',
        sourceModule: 'seed',
        createdAt: Date.now() - 7 * 60 * 1000,
        updatedAt: Date.now() - 7 * 60 * 1000,
      },
      {
        id: 'food_menu_daylight_egg_croissant',
        restaurantId: DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
        title: 'Sunrise Egg Croissant',
        category: 'cafe',
        menuSection: 'brunch_plates',
        price: '34.00',
        desc: 'A flaky croissant filled with soft scrambled egg, cheddar, tomato, and baby spinach.',
        ingredients: 'croissant, egg, cheddar, tomato, baby spinach',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.daylightCafeProduct(4),
        imageAlt: 'Sunrise Egg Croissant',
        sourceModule: 'seed',
        createdAt: Date.now() - 8 * 60 * 1000,
        updatedAt: Date.now() - 8 * 60 * 1000,
      },
      {
        id: 'food_menu_daylight_avocado_ricotta',
        restaurantId: DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
        title: 'Avocado Ricotta Toast',
        category: 'cafe',
        menuSection: 'brunch_plates',
        price: '38.00',
        desc: 'Sourdough with whipped ricotta, avocado fan, soft egg, herbs, and lemon.',
        ingredients: 'sourdough, avocado, ricotta, egg, herbs, lemon',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.daylightCafeProduct(5),
        imageAlt: 'Avocado Ricotta Toast',
        sourceModule: 'seed',
        createdAt: Date.now() - 9 * 60 * 1000,
        updatedAt: Date.now() - 9 * 60 * 1000,
      },
      {
        id: 'food_menu_daylight_mushroom_melt',
        restaurantId: DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
        title: 'Mushroom Egg Melt',
        category: 'cafe',
        menuSection: 'brunch_plates',
        price: '36.00',
        desc: 'Toasted country bread with roasted mushrooms, folded egg, alpine cheese, and thyme.',
        ingredients: 'country bread, mushroom, egg, alpine cheese, thyme',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.daylightCafeProduct(6),
        imageAlt: 'Mushroom Egg Melt',
        sourceModule: 'seed',
        createdAt: Date.now() - 10 * 60 * 1000,
        updatedAt: Date.now() - 10 * 60 * 1000,
      },
      {
        id: 'food_menu_daylight_butter_croissant',
        restaurantId: DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
        title: 'Morning Butter Croissant',
        category: 'cafe',
        menuSection: 'bakery',
        price: '18.00',
        desc: 'A deeply layered cultured-butter croissant baked until crisp and golden.',
        ingredients: 'wheat flour, cultured butter, milk, yeast, egg',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.daylightCafeProduct(7),
        imageAlt: 'Morning Butter Croissant',
        sourceModule: 'seed',
        createdAt: Date.now() - 11 * 60 * 1000,
        updatedAt: Date.now() - 11 * 60 * 1000,
      },
      {
        id: 'food_menu_daylight_lemon_loaf',
        restaurantId: DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
        title: 'Lemon Poppy Loaf',
        category: 'cafe',
        menuSection: 'bakery',
        price: '21.00',
        desc: 'A tender lemon-poppy slice with a thin yogurt glaze and fresh lemon zest.',
        ingredients: 'lemon, poppy seed, flour, egg, yogurt glaze',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.daylightCafeProduct(8),
        imageAlt: 'Lemon Poppy Loaf',
        sourceModule: 'seed',
        createdAt: Date.now() - 12 * 60 * 1000,
        updatedAt: Date.now() - 12 * 60 * 1000,
      },
      {
        id: 'food_menu_daylight_vanilla_cold_brew',
        restaurantId: DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
        title: 'Vanilla Cream Cold Brew',
        category: 'cafe',
        menuSection: 'cold_drinks',
        price: '26.00',
        desc: 'Slow-steeped cold brew topped with lightly whipped vanilla cream over clear ice.',
        ingredients: 'cold brew coffee, vanilla, cream, ice',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.daylightCafeProduct(9),
        imageAlt: 'Vanilla Cream Cold Brew',
        sourceModule: 'seed',
        createdAt: Date.now() - 13 * 60 * 1000,
        updatedAt: Date.now() - 13 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_house_americano',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Harbor House Americano',
        category: 'cafe',
        menuSection: 'espresso_classics',
        price: '22.00',
        desc: 'A clean double espresso lengthened with hot water for a dark-caramel finish.',
        ingredients: 'double espresso, filtered water',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(1),
        imageAlt: 'Harbor House Americano in a dark ceramic cup',
        sourceModule: 'seed',
        createdAt: Date.now() - 18 * 60 * 1000,
        updatedAt: Date.now() - 18 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_copper_flat_white',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Copper Flat White',
        category: 'cafe',
        menuSection: 'espresso_classics',
        price: '28.00',
        desc: 'Two ristretto shots with velvety steamed milk and a compact microfoam cap.',
        ingredients: 'ristretto, whole milk',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(2),
        imageAlt: 'Copper Flat White with fine latte art',
        sourceModule: 'seed',
        createdAt: Date.now() - 19 * 60 * 1000,
        updatedAt: Date.now() - 19 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_vanilla_bean_latte',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Vanilla Bean Latte',
        category: 'cafe',
        menuSection: 'espresso_classics',
        price: '30.00',
        desc: 'Espresso and steamed milk scented with real vanilla bean and restrained sweetness.',
        ingredients: 'espresso, whole milk, vanilla bean syrup',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(3),
        imageAlt: 'Vanilla Bean Latte in a warm ivory cup',
        sourceModule: 'seed',
        createdAt: Date.now() - 20 * 60 * 1000,
        updatedAt: Date.now() - 20 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_sea_salt_caramel_latte',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Sea-Salt Caramel Latte',
        category: 'cafe',
        menuSection: 'harbor_signatures',
        price: '33.00',
        desc: 'A silky latte with copper caramel, sea salt, and a thin caramelized sugar finish.',
        ingredients: 'espresso, milk, caramel, sea salt, caramelized sugar',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(4),
        imageAlt: 'Sea-Salt Caramel Latte with caramelized sugar',
        sourceModule: 'seed',
        createdAt: Date.now() - 21 * 60 * 1000,
        updatedAt: Date.now() - 21 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_pistachio_oat_latte',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Pistachio Oat Latte',
        category: 'cafe',
        menuSection: 'harbor_signatures',
        price: '35.00',
        desc: 'Espresso, oat milk, and roasted pistachio with a softly nutty foam.',
        ingredients: 'espresso, oat milk, roasted pistachio, cane sugar',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(5),
        imageAlt: 'Pistachio Oat Latte with pale pistachio foam',
        sourceModule: 'seed',
        createdAt: Date.now() - 22 * 60 * 1000,
        updatedAt: Date.now() - 22 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_cranberry_cocoa_mocha',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Cranberry Cocoa Mocha',
        category: 'cafe',
        menuSection: 'harbor_signatures',
        price: '34.00',
        desc: 'Dark cocoa mocha lifted with tart cranberry and a light milk-foam crown.',
        ingredients: 'espresso, milk, dark cocoa, cranberry sauce',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(6),
        imageAlt: 'Cranberry Cocoa Mocha with a cranberry accent',
        sourceModule: 'seed',
        createdAt: Date.now() - 23 * 60 * 1000,
        updatedAt: Date.now() - 23 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_velvet_cold_brew',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Velvet Cold Brew',
        category: 'cafe',
        menuSection: 'cold_blended',
        price: '29.00',
        desc: 'Slow-steeped coffee over clear ice with a smooth malted cream float.',
        ingredients: 'cold brew coffee, malted cream, ice',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(7),
        imageAlt: 'Velvet Cold Brew in a ribbed glass',
        sourceModule: 'seed',
        createdAt: Date.now() - 24 * 60 * 1000,
        updatedAt: Date.now() - 24 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_citrus_espresso_sparkler',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Citrus Espresso Sparkler',
        category: 'cafe',
        menuSection: 'cold_blended',
        price: '31.00',
        desc: 'Bright espresso layered over grapefruit soda, orange peel, and clear ice.',
        ingredients: 'espresso, grapefruit soda, orange peel, ice',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(8),
        imageAlt: 'Citrus Espresso Sparkler with grapefruit soda',
        sourceModule: 'seed',
        createdAt: Date.now() - 25 * 60 * 1000,
        updatedAt: Date.now() - 25 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_dark_cocoa_coffee_blend',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Dark Cocoa Coffee Blend',
        category: 'cafe',
        menuSection: 'cold_blended',
        price: '34.00',
        desc: 'A thick blended espresso drink with dark cocoa, milk, and cocoa nib crunch.',
        ingredients: 'espresso, milk, dark cocoa, ice, cocoa nibs',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(9),
        imageAlt: 'Dark Cocoa Coffee Blend with cocoa nibs',
        sourceModule: 'seed',
        createdAt: Date.now() - 26 * 60 * 1000,
        updatedAt: Date.now() - 26 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_apricot_earl_grey',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Apricot Earl Grey Iced Tea',
        category: 'cafe',
        menuSection: 'tea_counter_bakes',
        price: '28.00',
        desc: 'Cold Earl Grey tea with ripe apricot, bergamot, lemon, and clear ice.',
        ingredients: 'Earl Grey tea, apricot, lemon, cane sugar, ice',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(10),
        imageAlt: 'Apricot Earl Grey Iced Tea with apricot slices',
        sourceModule: 'seed',
        createdAt: Date.now() - 27 * 60 * 1000,
        updatedAt: Date.now() - 27 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_copper_sugar_scone',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Copper Sugar Scone',
        category: 'cafe',
        menuSection: 'tea_counter_bakes',
        price: '18.00',
        desc: 'A tender cultured-butter scone with copper sugar crust and orange zest.',
        ingredients: 'wheat flour, cultured butter, cream, raw sugar, orange zest',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(11),
        imageAlt: 'Copper Sugar Scone with a crisp sugar crust',
        sourceModule: 'seed',
        createdAt: Date.now() - 28 * 60 * 1000,
        updatedAt: Date.now() - 28 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_almond_butter_croissant',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Almond Butter Croissant',
        category: 'cafe',
        menuSection: 'tea_counter_bakes',
        price: '22.00',
        desc: 'A flaky twice-baked croissant filled with almond butter and toasted almond flakes.',
        ingredients: 'croissant, almond butter, toasted almond, powdered sugar',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(12),
        imageAlt: 'Almond Butter Croissant with toasted almond flakes',
        sourceModule: 'seed',
        createdAt: Date.now() - 29 * 60 * 1000,
        updatedAt: Date.now() - 29 * 60 * 1000,
      },
      {
        id: 'food_menu_harbor_pompompurin_dockside_set',
        restaurantId: HARBOR_ROAST_SEED_RESTAURANT_ID,
        title: 'Pompompurin Dockside Custard Set',
        category: 'cafe',
        menuSection: 'harbor_collaboration',
        price: '48.00',
        desc: 'A caramel custard latte and custard tart with a printed Pompompurin collaboration cup, keepsake sleeve, and handled carrier.',
        ingredients:
          'espresso, milk, caramel custard, custard tart, printed collaboration paper cup, removable paper sleeve, paper carrier',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.harborRoastProduct(13),
        imageAlt:
          'Pompompurin collaboration latte and custard tart set with printed cup, removable sleeve, and paper carrier',
        sourceModule: 'seed',
        createdAt: Date.now() - 30 * 60 * 1000,
        updatedAt: Date.now() - 30 * 60 * 1000,
      },
      {
        id: 'food_menu_sugar_cake',
        restaurantId: SUGAR_LANE_SEED_RESTAURANT_ID,
        title: 'Tiny Moon Cake',
        category: 'dessert',
        menuSection: 'layer_cakes',
        price: '32.00',
        desc: 'A small moon-shaped vanilla mousse cake with pear compote and a pale cocoa-butter glaze.',
        ingredients: 'vanilla mousse, pear compote, almond sponge, cocoa-butter glaze',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.sugarLaneProduct(1),
        imageAlt: 'Tiny Moon Cake',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_sugar_strawberry_shortcake',
        restaurantId: SUGAR_LANE_SEED_RESTAURANT_ID,
        title: 'Strawberry Ribbon Shortcake',
        category: 'dessert',
        menuSection: 'layer_cakes',
        price: '36.00',
        desc: 'Vanilla chiffon layered with fresh strawberry, light cream, and a curled strawberry ribbon.',
        ingredients: 'vanilla chiffon, strawberry, cream, sugar',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.sugarLaneProduct(2),
        imageAlt: 'Strawberry Ribbon Shortcake',
        sourceModule: 'seed',
        createdAt: Date.now() - 5 * 60 * 1000,
        updatedAt: Date.now() - 5 * 60 * 1000,
      },
      {
        id: 'food_menu_sugar_burnt_honey_cheesecake',
        restaurantId: SUGAR_LANE_SEED_RESTAURANT_ID,
        title: 'Burnt Honey Cheesecake',
        category: 'dessert',
        menuSection: 'layer_cakes',
        price: '34.00',
        desc: 'Creamy baked cheesecake with a burnished top, salted honey, and a crisp oat crumb.',
        ingredients: 'cream cheese, egg, cream, salted honey, oat crumb',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.sugarLaneProduct(3),
        imageAlt: 'Burnt Honey Cheesecake',
        sourceModule: 'seed',
        createdAt: Date.now() - 6 * 60 * 1000,
        updatedAt: Date.now() - 6 * 60 * 1000,
      },
      {
        id: 'food_menu_sugar_pistachio_tart',
        restaurantId: SUGAR_LANE_SEED_RESTAURANT_ID,
        title: 'Pistachio Raspberry Tart',
        category: 'dessert',
        menuSection: 'pastry_case',
        price: '35.00',
        desc: 'A crisp tart shell with pistachio cream, raspberry center, and chopped roasted pistachio.',
        ingredients: 'tart shell, pistachio cream, raspberry, roasted pistachio',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.sugarLaneProduct(4),
        imageAlt: 'Pistachio Raspberry Tart',
        sourceModule: 'seed',
        createdAt: Date.now() - 7 * 60 * 1000,
        updatedAt: Date.now() - 7 * 60 * 1000,
      },
      {
        id: 'food_menu_sugar_caramel_choux',
        restaurantId: SUGAR_LANE_SEED_RESTAURANT_ID,
        title: 'Salted Caramel Choux',
        category: 'dessert',
        menuSection: 'pastry_case',
        price: '26.00',
        desc: 'Craquelin choux filled with caramel custard and finished with a small dark-caramel disc.',
        ingredients: 'choux pastry, caramel custard, cream, sea salt',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.sugarLaneProduct(5),
        imageAlt: 'Salted Caramel Choux',
        sourceModule: 'seed',
        createdAt: Date.now() - 8 * 60 * 1000,
        updatedAt: Date.now() - 8 * 60 * 1000,
      },
      {
        id: 'food_menu_sugar_mango_panna_cotta',
        restaurantId: SUGAR_LANE_SEED_RESTAURANT_ID,
        title: 'Mango Coconut Panna Cotta',
        category: 'dessert',
        menuSection: 'chilled_sweets',
        price: '29.00',
        desc: 'Coconut panna cotta with fresh mango cubes, passion-fruit sauce, and toasted coconut.',
        ingredients: 'coconut panna cotta, mango, passion fruit, toasted coconut',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.sugarLaneProduct(6),
        imageAlt: 'Mango Coconut Panna Cotta',
        sourceModule: 'seed',
        createdAt: Date.now() - 9 * 60 * 1000,
        updatedAt: Date.now() - 9 * 60 * 1000,
      },
      {
        id: 'food_menu_sugar_sesame_mochi_parfait',
        restaurantId: SUGAR_LANE_SEED_RESTAURANT_ID,
        title: 'Black Sesame Mochi Parfait',
        category: 'dessert',
        menuSection: 'chilled_sweets',
        price: '31.00',
        desc: 'Black sesame cream, milk gelato, soft mochi, and sesame crumble in a clear dessert glass.',
        ingredients: 'black sesame cream, milk gelato, mochi, sesame crumble',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.sugarLaneProduct(7),
        imageAlt: 'Black Sesame Mochi Parfait',
        sourceModule: 'seed',
        createdAt: Date.now() - 10 * 60 * 1000,
        updatedAt: Date.now() - 10 * 60 * 1000,
      },
      {
        id: 'food_menu_sugar_rose_lychee_fizz',
        restaurantId: SUGAR_LANE_SEED_RESTAURANT_ID,
        title: 'Rose Lychee Fizz',
        category: 'dessert',
        menuSection: 'sweet_drinks',
        price: '24.00',
        desc: 'A clear sparkling lychee drink with rose, raspberry, lemon, and translucent ice.',
        ingredients: 'lychee, rose, raspberry, lemon, sparkling water',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.sugarLaneProduct(8),
        imageAlt: 'Rose Lychee Fizz',
        sourceModule: 'seed',
        createdAt: Date.now() - 11 * 60 * 1000,
        updatedAt: Date.now() - 11 * 60 * 1000,
      },
      {
        id: 'food_menu_sugar_cocoa_cloud_milk',
        restaurantId: SUGAR_LANE_SEED_RESTAURANT_ID,
        title: 'Cocoa Cloud Milk',
        category: 'dessert',
        menuSection: 'sweet_drinks',
        price: '25.00',
        desc: 'Cold cocoa milk with a light vanilla cream cap, cocoa dust, and dark chocolate curls.',
        ingredients: 'cocoa, milk, vanilla cream, dark chocolate',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.sugarLaneProduct(9),
        imageAlt: 'Cocoa Cloud Milk',
        sourceModule: 'seed',
        createdAt: Date.now() - 12 * 60 * 1000,
        updatedAt: Date.now() - 12 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_oolong_cloud',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'White Peach Lime Sparkler',
        category: 'dessert',
        menuSection: 'fruit_sparkle',
        price: '26.00',
        desc: 'White peach, fresh lime, mint, and sparkling spring water.',
        ingredients: 'white peach, lime, mint, sparkling water',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(1),
        imageAlt: 'White Peach Lime Sparkler',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_brown_sugar_creme',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Roasted Peach Oolong Cloud',
        category: 'dessert',
        menuSection: 'cloud_tea',
        price: '29.00',
        desc: 'Deep roasted oolong, white-peach cream, and a brown-sugar finish.',
        ingredients: 'roasted oolong, white peach, fresh milk, brown sugar cream',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(2),
        imageAlt: 'Roasted Peach Oolong Cloud',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_jasmine_cream',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Peach Cocoa Brownie',
        category: 'dessert',
        menuSection: 'oven_sweets',
        price: '24.00',
        desc: 'Fudgy dark cocoa, roasted nuts, and a white-peach cream cloud.',
        ingredients: 'dark cocoa, butter, roasted nuts, white peach cream',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(3),
        imageAlt: 'Peach Cocoa Brownie',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_sunset_fizz',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'White Peach Macaron Parade',
        category: 'dessert',
        menuSection: 'oven_sweets',
        price: '22.00',
        desc: 'A bright box of peach, rose, vanilla, and cocoa macarons.',
        ingredients: 'almond flour, peach cream, rose, vanilla, cocoa',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(4),
        imageAlt: 'White Peach Macaron Parade',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_yuzu_spark',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Yuzu Peach Spark Pop',
        category: 'dessert',
        menuSection: 'fruit_sparkle',
        price: '24.00',
        desc: 'White peach and sharp yuzu soda with honey pearls and rosemary.',
        ingredients: 'white peach, yuzu, honey pearls, sparkling water, rosemary',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(5),
        imageAlt: 'Yuzu Peach Spark Pop soda',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_mango_snow',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Peach Cocoa Crepe Cloud',
        category: 'dessert',
        menuSection: 'frozen_clouds',
        price: '34.00',
        desc: 'Cocoa crepes folded around peach-milk gelato and berry slices.',
        ingredients: 'butter crepe, cocoa, white peach gelato, strawberry',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(6),
        imageAlt: 'Peach Cocoa Crepe Cloud',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_strawberry_ice',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Peach Macaron Milk Ice',
        category: 'dessert',
        menuSection: 'frozen_clouds',
        price: '36.00',
        desc: 'White-peach milk ice with rose macarons and a berry ripple.',
        ingredients: 'white peach, milk ice, almond macaron, rose, berry compote',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(7),
        imageAlt: 'Peach Macaron Milk Ice',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_matcha_float',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Peach Cold Brew Tonic',
        category: 'dessert',
        menuSection: 'cloud_tea',
        price: '31.00',
        desc: 'Cold brew, white peach tonic, and a light cream cloud.',
        ingredients: 'cold brew, white peach tonic, cream cloud',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(8),
        imageAlt: 'Peach Cold Brew Tonic',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_sunbeam_basque',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Peach Strawberry Cloud Slice',
        category: 'dessert',
        menuSection: 'frozen_clouds',
        price: '36.00',
        desc: 'Cold-set white-peach cheesecake with strawberry glaze and mint.',
        ingredients: 'cream cheese, white peach, strawberry, biscuit, berry glaze',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(9),
        imageAlt: 'Peach Strawberry Cloud Slice',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_butter_waffle',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Peach Cocoa Crepe Sundae',
        category: 'dessert',
        menuSection: 'frozen_clouds',
        price: '29.00',
        desc: 'Soft cocoa crepes with white-peach gelato and strawberry.',
        ingredients: 'butter crepe, cocoa, white peach gelato, strawberry',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(10),
        imageAlt: 'Peach Cocoa Crepe Sundae',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_pocket_pie',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Black Tea Peach Creme',
        category: 'dessert',
        menuSection: 'cloud_tea',
        price: '25.00',
        desc: 'Strong black tea, white-peach milk, and a toasted cream crown.',
        ingredients: 'black tea, white peach, milk, brown sugar, toasted cream',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(11),
        imageAlt: 'Black Tea Peach Creme',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_golden_hour_set',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Golden Peach Cheesecake Pairing',
        category: 'dessert',
        menuSection: 'seasonal_drop',
        price: '48.00',
        desc: 'One white-peach fizz paired with a peach cheesecake slice.',
        ingredients: 'white peach fizz, peach cheesecake, peach honey',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(12),
        imageAlt: 'Golden Peach Cheesecake Pairing',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_grape_jasmine_tea',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Green Grape Jasmine Fruit Tea',
        category: 'dessert',
        menuSection: 'fruit_sparkle',
        price: '28.00',
        desc: 'Crisp green grapes, cold-brewed jasmine tea, and a clean floral finish.',
        ingredients: 'green grape, jasmine tea, jasmine blossoms',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(13),
        imageAlt: 'Green Grape Jasmine Fruit Tea',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_mango_passion_yogurt',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Mango Passionfruit Yogurt',
        category: 'dessert',
        menuSection: 'fruit_sparkle',
        price: '32.00',
        desc: 'Ripe mango and passionfruit folded through thick cultured yogurt.',
        ingredients: 'mango, passionfruit, cultured yogurt',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(14),
        imageAlt: 'Mango Passionfruit Yogurt',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_strawberry_fruit_milk',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Strawberry Peach Fruit Milk',
        category: 'dessert',
        menuSection: 'fruit_sparkle',
        price: '30.00',
        desc: 'Fresh strawberries and white peach blended with silky fresh milk.',
        ingredients: 'strawberry, white peach, fresh milk',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(15),
        imageAlt: 'Strawberry Peach Fruit Milk',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_waxberry_lychee_tea',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Waxberry Lychee Iced Tea',
        category: 'dessert',
        menuSection: 'seasonal_drop',
        price: '29.00',
        desc: 'Tart waxberry and juicy lychee steeped into ruby fruit tea over clear ice.',
        ingredients: 'waxberry, lychee, fruit tea, ice',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(16),
        imageAlt: 'Waxberry Lychee Iced Tea',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_peach_osmanthus_pear_warm',
        restaurantId: PEACH_CLOUD_SEED_RESTAURANT_ID,
        title: 'Osmanthus Pear Warm Infusion',
        category: 'dessert',
        menuSection: 'seasonal_drop',
        price: '27.00',
        desc: 'Fresh pear gently steeped with fragrant osmanthus for a clear warm infusion.',
        ingredients: 'snow pear, osmanthus, spring water',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.peachCloudProduct(17),
        imageAlt: 'Osmanthus Pear Warm Infusion',
        sourceModule: 'seed',
        createdAt: Date.now() - 4 * 60 * 1000,
        updatedAt: Date.now() - 4 * 60 * 1000,
      },
      {
        id: 'food_menu_dash_double_stack',
        restaurantId: DASH_GRILL_SEED_RESTAURANT_ID,
        title: 'Dash Double Stack Combo',
        category: 'fast_food',
        menuSection: 'featured',
        price: '39.00',
        desc: 'Two seared beef patties, cheddar, pickles, onion, and house dash sauce, served with your choice of fries and a drink.',
        ingredients:
          'double beef stack (beef, cheddar, pickles, onion, sesame bun, dash sauce), choice of fries, choice of drink',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.dashGrillProduct(1),
        imageAlt: 'Dash Double Stack burger',
        sourceModule: 'seed',
        createdAt: Date.now() - 3 * 60 * 1000,
        updatedAt: Date.now() - 3 * 60 * 1000,
      },
      {
        id: 'food_menu_dash_golden_chicken_stack',
        restaurantId: DASH_GRILL_SEED_RESTAURANT_ID,
        title: 'Golden Chicken Stack Combo',
        category: 'fast_food',
        menuSection: 'featured',
        price: '36.00',
        desc: 'Crisp chicken, shredded lettuce, pepper mayo, and a toasted potato bun, served with your choice of fries and a drink.',
        ingredients:
          'golden chicken stack (chicken, lettuce, pepper mayo, potato bun), choice of fries, choice of drink',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.dashGrillProduct(2),
        imageAlt: 'Golden Chicken Stack burger',
        sourceModule: 'seed',
        createdAt: Date.now() - 3 * 60 * 1000,
        updatedAt: Date.now() - 3 * 60 * 1000,
      },
      {
        id: 'food_menu_dash_smoky_bbq_stack',
        restaurantId: DASH_GRILL_SEED_RESTAURANT_ID,
        title: 'Smoky BBQ Stack',
        category: 'fast_food',
        menuSection: 'burgers',
        price: '42.00',
        desc: 'Beef, smoked cheese, crisp onions, pickles, and molasses barbecue glaze.',
        ingredients: 'beef, smoked cheese, onion, pickles, barbecue glaze',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.dashGrillProduct(3),
        imageAlt: 'Smoky BBQ Stack burger',
        sourceModule: 'seed',
        createdAt: Date.now() - 3 * 60 * 1000,
        updatedAt: Date.now() - 3 * 60 * 1000,
      },
      {
        id: 'food_menu_dash_classic_cheeseburger',
        restaurantId: DASH_GRILL_SEED_RESTAURANT_ID,
        title: 'Classic Cheeseburger',
        category: 'fast_food',
        menuSection: 'burgers',
        price: '26.00',
        desc: 'A single beef patty with cheddar, pickle, onion, ketchup, and mustard.',
        ingredients: 'beef, cheddar, pickle, onion, ketchup, mustard',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.dashGrillProduct(4),
        imageAlt: 'Classic Cheeseburger',
        sourceModule: 'seed',
        createdAt: Date.now() - 3 * 60 * 1000,
        updatedAt: Date.now() - 3 * 60 * 1000,
      },
      {
        id: 'food_menu_dash_chicken_tenders',
        restaurantId: DASH_GRILL_SEED_RESTAURANT_ID,
        title: 'Crisp Chicken Tenders',
        category: 'fast_food',
        menuSection: 'chicken',
        price: '32.00',
        desc: 'Five crunchy chicken strips with one choice of dipping sauce.',
        ingredients: 'chicken, seasoned crumb, dipping sauce',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.dashGrillProduct(5),
        imageAlt: 'Crisp Chicken Tenders',
        sourceModule: 'seed',
        createdAt: Date.now() - 3 * 60 * 1000,
        updatedAt: Date.now() - 3 * 60 * 1000,
      },
      {
        id: 'food_menu_dash_sea_salt_fries',
        restaurantId: DASH_GRILL_SEED_RESTAURANT_ID,
        title: 'Sea-Salt Fries',
        category: 'fast_food',
        menuSection: 'sides',
        price: '15.00',
        desc: 'Thin-cut golden fries finished with flaky sea salt.',
        ingredients: 'potato, vegetable oil, sea salt',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.dashGrillProduct(6),
        imageAlt: 'Sea-Salt Fries',
        sourceModule: 'seed',
        createdAt: Date.now() - 3 * 60 * 1000,
        updatedAt: Date.now() - 3 * 60 * 1000,
      },
      {
        id: 'food_menu_dash_loaded_fries',
        restaurantId: DASH_GRILL_SEED_RESTAURANT_ID,
        title: 'Loaded Cheese Fries',
        category: 'fast_food',
        menuSection: 'sides',
        price: '24.00',
        desc: 'Golden fries with warm cheese sauce, scallion, and smoky crumbs.',
        ingredients: 'potato, cheese sauce, scallion, smoky crumbs',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.dashGrillProduct(7),
        imageAlt: 'Loaded Cheese Fries',
        sourceModule: 'seed',
        createdAt: Date.now() - 3 * 60 * 1000,
        updatedAt: Date.now() - 3 * 60 * 1000,
      },
      {
        id: 'food_menu_dash_garden_wrap',
        restaurantId: DASH_GRILL_SEED_RESTAURANT_ID,
        title: 'Garden Crunch Wrap',
        category: 'fast_food',
        menuSection: 'chicken',
        price: '29.00',
        desc: 'Grilled chicken, crunchy greens, tomato, and lemon pepper dressing.',
        ingredients: 'chicken, lettuce, tomato, tortilla, lemon pepper dressing',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.dashGrillProduct(8),
        imageAlt: 'Garden Crunch Wrap',
        sourceModule: 'seed',
        createdAt: Date.now() - 3 * 60 * 1000,
        updatedAt: Date.now() - 3 * 60 * 1000,
      },
      {
        id: 'food_menu_dash_vanilla_shake',
        restaurantId: DASH_GRILL_SEED_RESTAURANT_ID,
        title: 'Vanilla Cloud Shake',
        category: 'fast_food',
        menuSection: 'drinks',
        price: '18.00',
        desc: 'Cold vanilla shake blended thick and finished with soft cream.',
        ingredients: 'milk, vanilla ice cream, cream',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.dashGrillProduct(9),
        imageAlt: 'Vanilla Cloud Shake',
        sourceModule: 'seed',
        createdAt: Date.now() - 3 * 60 * 1000,
        updatedAt: Date.now() - 3 * 60 * 1000,
      },
      {
        id: 'food_menu_dash_choco_sundae',
        restaurantId: DASH_GRILL_SEED_RESTAURANT_ID,
        title: 'Choco Swirl Sundae',
        category: 'fast_food',
        menuSection: 'treats',
        price: '16.00',
        desc: 'Vanilla soft serve with dark chocolate ribbons and crisp cocoa crumbs.',
        ingredients: 'vanilla soft serve, chocolate sauce, cocoa crumbs',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.dashGrillProduct(10),
        imageAlt: 'Choco Swirl Sundae',
        sourceModule: 'seed',
        createdAt: Date.now() - 3 * 60 * 1000,
        updatedAt: Date.now() - 3 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_tea_smoked_chicken',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Tea-Smoked Half Chicken',
        category: 'restaurants',
        menuSection: 'house_table',
        price: '68.00',
        desc: 'A tender half chicken perfumed with black tea, cassia, and crisp scallion oil.',
        ingredients: 'chicken, black tea, cassia, scallion oil, soy glaze',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(1),
        imageAlt: 'Tea-Smoked Half Chicken',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_cinnabar_char_siu',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Cinnabar Char Siu',
        category: 'restaurants',
        menuSection: 'house_table',
        price: '58.00',
        desc: 'Lacquered pork shoulder with maltose glaze, mustard greens, and toasted sesame.',
        ingredients: 'pork shoulder, maltose, fermented bean curd, mustard greens, sesame',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(2),
        imageAlt: 'Cinnabar Char Siu',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_sea_bass',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Ginger-Scallion Sea Bass',
        category: 'restaurants',
        menuSection: 'house_table',
        price: '88.00',
        desc: 'Steamed sea bass finished with ginger threads, scallion, and fragrant hot oil.',
        ingredients: 'sea bass, ginger, scallion, light soy, sesame oil',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(3),
        imageAlt: 'Ginger-Scallion Sea Bass',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_crystal_dumplings',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Crystal Shrimp Dumplings',
        category: 'restaurants',
        menuSection: 'small_plates',
        price: '36.00',
        desc: 'Four translucent dumplings folded around springy shrimp and bamboo shoot.',
        ingredients: 'shrimp, bamboo shoot, wheat starch, sesame oil',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(4),
        imageAlt: 'Crystal Shrimp Dumplings',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_cucumber_ribbons',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Sesame Cucumber Ribbons',
        category: 'restaurants',
        menuSection: 'small_plates',
        price: '22.00',
        desc: 'Chilled cucumber ribbons with black vinegar, sesame paste, and roasted peanuts.',
        ingredients: 'cucumber, sesame paste, black vinegar, garlic, peanut',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(5),
        imageAlt: 'Sesame Cucumber Ribbons',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_pepper_lotus',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Pepper Lotus Root',
        category: 'restaurants',
        menuSection: 'wok_favorites',
        price: '32.00',
        desc: 'Crisp lotus root tossed in the wok with green pepper, celery, and fermented chili.',
        ingredients: 'lotus root, green pepper, celery, fermented chili, garlic',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(6),
        imageAlt: 'Pepper Lotus Root',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_mapo_tofu',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Hearth Mapo Tofu',
        category: 'restaurants',
        menuSection: 'wok_favorites',
        price: '38.00',
        desc: 'Silken tofu, beef crumble, broad-bean chili, and green Sichuan pepper oil.',
        ingredients: 'tofu, beef, doubanjiang, Sichuan pepper, scallion',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(7),
        imageAlt: 'Hearth Mapo Tofu',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_mushroom_claypot',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Chestnut Mushroom Claypot',
        category: 'restaurants',
        menuSection: 'claypot',
        price: '46.00',
        desc: 'Chestnuts and three mushrooms simmered with tofu skin in a warm claypot glaze.',
        ingredients: 'chestnut, shiitake, oyster mushroom, tofu skin, soy broth',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(8),
        imageAlt: 'Chestnut Mushroom Claypot',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_shrimp_fried_rice',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Shrimp & Scallion Fried Rice',
        category: 'restaurants',
        menuSection: 'rice_noodles',
        price: '34.00',
        desc: 'Wok-tossed jasmine rice with shrimp, egg, scallion, and crisp rice pearls.',
        ingredients: 'jasmine rice, shrimp, egg, scallion, soy',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(9),
        imageAlt: 'Shrimp and Scallion Fried Rice',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_beef_noodles',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Red-Braised Beef Knife Noodles',
        category: 'restaurants',
        menuSection: 'rice_noodles',
        price: '42.00',
        desc: 'Wide knife-cut noodles with slow-braised beef, tomato broth, and baby greens.',
        ingredients: 'knife-cut noodles, beef, tomato, bok choy, star anise',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(10),
        imageAlt: 'Red-Braised Beef Knife Noodles',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_pear_tea',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Osmanthus Snow Pear Tea',
        category: 'restaurants',
        menuSection: 'tea_sweets',
        price: '18.00',
        desc: 'A warm pear infusion with osmanthus, goji berry, and a light rock-sugar finish.',
        ingredients: 'snow pear, osmanthus, goji berry, rock sugar',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(11),
        imageAlt: 'Osmanthus Snow Pear Tea',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_jade_sesame_tangyuan',
        restaurantId: JADE_HEARTH_SEED_RESTAURANT_ID,
        title: 'Black Sesame Tangyuan',
        category: 'restaurants',
        menuSection: 'tea_sweets',
        price: '24.00',
        desc: 'Four soft rice dumplings with molten black sesame in a clear ginger syrup.',
        ingredients: 'glutinous rice, black sesame, ginger, rock sugar',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.jadeHearthProduct(12),
        imageAlt: 'Black Sesame Tangyuan',
        sourceModule: 'seed',
        createdAt: Date.now() - 2 * 60 * 1000,
        updatedAt: Date.now() - 2 * 60 * 1000,
      },
      {
        id: 'food_menu_verdant_aegean_garden',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Aegean Garden Salad',
        category: 'restaurants',
        menuSection: 'salads',
        price: '34.00',
        desc: 'Crisp leaves, cucumber, tomato, feta, olives, and lemon oregano dressing.',
        ingredients: 'romaine, cucumber, tomato, feta, olives, red onion, lemon oregano dressing',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(1),
        imageAlt: 'Aegean Garden Salad',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
      {
        id: 'food_menu_verdant_greenhouse_caesar',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Greenhouse Caesar',
        category: 'restaurants',
        menuSection: 'salads',
        price: '38.00',
        desc: 'Charred chicken, baby romaine, sourdough crunch, and a light caper dressing.',
        ingredients: 'chicken, baby romaine, sourdough, parmesan, caper yogurt dressing',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(2),
        imageAlt: 'Greenhouse Caesar salad',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
      {
        id: 'food_menu_verdant_miso_crunch',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Miso Sesame Crunch',
        category: 'restaurants',
        menuSection: 'salads',
        price: '36.00',
        desc: 'Cabbage, edamame, carrot ribbons, avocado, and toasted sesame miso.',
        ingredients: 'cabbage, edamame, carrot, avocado, sesame, white miso dressing',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(3),
        imageAlt: 'Miso Sesame Crunch salad',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
      {
        id: 'food_menu_verdant_golden_grain',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Golden Grain Bowl',
        category: 'restaurants',
        menuSection: 'warm_bowls',
        price: '42.00',
        desc: 'Warm quinoa, roasted squash, chickpeas, greens, and turmeric tahini.',
        ingredients: 'quinoa, squash, chickpeas, kale, pumpkin seed, turmeric tahini',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(4),
        imageAlt: 'Golden Grain Bowl',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
      {
        id: 'food_menu_verdant_charred_corn_chicken',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Charred Corn Chicken Bowl',
        category: 'restaurants',
        menuSection: 'warm_bowls',
        price: '46.00',
        desc: 'Pepper chicken, charred corn, brown rice, black beans, and lime crema.',
        ingredients: 'chicken, corn, brown rice, black bean, tomato salsa, lime crema',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(5),
        imageAlt: 'Charred Corn Chicken Bowl',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
      {
        id: 'food_menu_verdant_forest_farro',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Forest Mushroom Farro',
        category: 'restaurants',
        menuSection: 'warm_bowls',
        price: '44.00',
        desc: 'Roasted mushrooms, farro, spinach, soft egg, and rosemary walnut pesto.',
        ingredients: 'farro, mushrooms, spinach, egg, walnut, rosemary pesto',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(6),
        imageAlt: 'Forest Mushroom Farro bowl',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
      {
        id: 'food_menu_verdant_avocado_herb_fold',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Avocado Herb Fold',
        category: 'restaurants',
        menuSection: 'wraps_toasts',
        price: '32.00',
        desc: 'Avocado, cucumber, sprouts, feta, herbs, and green tahini in a soft flatbread.',
        ingredients: 'flatbread, avocado, cucumber, sprouts, feta, herbs, green tahini',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(7),
        imageAlt: 'Avocado Herb Fold wrap',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
      {
        id: 'food_menu_verdant_lemon_chicken_wrap',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Lemon Pepper Chicken Wrap',
        category: 'restaurants',
        menuSection: 'wraps_toasts',
        price: '37.00',
        desc: 'Lemon chicken, crunchy lettuce, tomato, pickled onion, and pepper yogurt.',
        ingredients: 'flatbread, chicken, lettuce, tomato, pickled onion, pepper yogurt',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(8),
        imageAlt: 'Lemon Pepper Chicken Wrap',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
      {
        id: 'food_menu_verdant_ricotta_fig_toast',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Ricotta Fig Toast',
        category: 'restaurants',
        menuSection: 'wraps_toasts',
        price: '29.00',
        desc: 'Whipped ricotta, fresh fig, arugula, toasted seeds, and thyme honey.',
        ingredients: 'sourdough, ricotta, fig, arugula, seed mix, thyme honey',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(9),
        imageAlt: 'Ricotta Fig Toast',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
      {
        id: 'food_menu_verdant_cucumber_mint',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Cucumber Mint Cooler',
        category: 'restaurants',
        menuSection: 'drinks',
        price: '16.00',
        desc: 'Cold cucumber, mint, lime, and sparkling water with no added syrup.',
        ingredients: 'cucumber, mint, lime, sparkling water',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(10),
        imageAlt: 'Cucumber Mint Cooler',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
      {
        id: 'food_menu_verdant_berry_kefir',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Berry Kefir Sip',
        category: 'restaurants',
        menuSection: 'drinks',
        price: '19.00',
        desc: 'Tart cultured milk blended with strawberry, blueberry, and a touch of honey.',
        ingredients: 'kefir, strawberry, blueberry, honey',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(11),
        imageAlt: 'Berry Kefir Sip',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
      {
        id: 'food_menu_verdant_citrus_loaf',
        restaurantId: VERDANT_DAY_SEED_RESTAURANT_ID,
        title: 'Olive Oil Citrus Loaf',
        category: 'restaurants',
        menuSection: 'small_sweets',
        price: '21.00',
        desc: 'A small orange and olive-oil loaf with yogurt glaze and pistachio dust.',
        ingredients: 'orange, olive oil, yogurt, pistachio, flour, egg',
        imageSourceType: 'url',
        imageUrl: FOOD_SEED_IMAGE_URLS.verdantDayProduct(12),
        imageAlt: 'Olive Oil Citrus Loaf',
        sourceModule: 'seed',
        createdAt: Date.now() - 60 * 1000,
        updatedAt: Date.now() - 60 * 1000,
      },
    ],
    new Set([
      'food_seed_moon_bistro',
      RIVER_NOODLES_SEED_RESTAURANT_ID,
      DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
      HARBOR_ROAST_SEED_RESTAURANT_ID,
      SUGAR_LANE_SEED_RESTAURANT_ID,
      PEACH_CLOUD_SEED_RESTAURANT_ID,
      DASH_GRILL_SEED_RESTAURANT_ID,
      JADE_HEARTH_SEED_RESTAURANT_ID,
      VERDANT_DAY_SEED_RESTAURANT_ID,
    ]),
  )

const BUILT_IN_SEED_MENU_ITEMS = createSeedMenuItems()
const BUILT_IN_SEED_RESTAURANTS_BY_ID = new Map(
  createSeedRestaurants().map((restaurant) => [restaurant.id, restaurant]),
)
const MOON_BISTRO_REQUIRED_MENU_ITEMS = BUILT_IN_SEED_MENU_ITEMS.filter(
  (item) => item.restaurantId === MOON_BISTRO_SEED_RESTAURANT_ID,
)
const RIVER_NOODLES_REQUIRED_RESTAURANT = createSeedRestaurants().find(
  (restaurant) => restaurant.id === RIVER_NOODLES_SEED_RESTAURANT_ID,
)
const RIVER_NOODLES_REQUIRED_MENU_ITEMS = BUILT_IN_SEED_MENU_ITEMS.filter(
  (item) => item.restaurantId === RIVER_NOODLES_SEED_RESTAURANT_ID,
)
const DAYLIGHT_CAFE_REQUIRED_RESTAURANT = createSeedRestaurants().find(
  (restaurant) => restaurant.id === DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
)
const DAYLIGHT_CAFE_REQUIRED_MENU_ITEMS = BUILT_IN_SEED_MENU_ITEMS.filter(
  (item) => item.restaurantId === DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
)
const HARBOR_ROAST_REQUIRED_RESTAURANT = createSeedRestaurants().find(
  (restaurant) => restaurant.id === HARBOR_ROAST_SEED_RESTAURANT_ID,
)
const HARBOR_ROAST_REQUIRED_MENU_ITEMS = BUILT_IN_SEED_MENU_ITEMS.filter(
  (item) => item.restaurantId === HARBOR_ROAST_SEED_RESTAURANT_ID,
)
const SUGAR_LANE_REQUIRED_RESTAURANT = createSeedRestaurants().find(
  (restaurant) => restaurant.id === SUGAR_LANE_SEED_RESTAURANT_ID,
)
const SUGAR_LANE_REQUIRED_MENU_ITEMS = BUILT_IN_SEED_MENU_ITEMS.filter(
  (item) => item.restaurantId === SUGAR_LANE_SEED_RESTAURANT_ID,
)
const PEACH_CLOUD_REQUIRED_RESTAURANT = createSeedRestaurants().find(
  (restaurant) => restaurant.id === PEACH_CLOUD_SEED_RESTAURANT_ID,
)
const PEACH_CLOUD_REQUIRED_MENU_ITEMS = BUILT_IN_SEED_MENU_ITEMS.filter(
  (item) => item.restaurantId === PEACH_CLOUD_SEED_RESTAURANT_ID,
)
const DASH_GRILL_REQUIRED_RESTAURANT = createSeedRestaurants().find(
  (restaurant) => restaurant.id === DASH_GRILL_SEED_RESTAURANT_ID,
)
const DASH_GRILL_REQUIRED_MENU_ITEMS = BUILT_IN_SEED_MENU_ITEMS.filter(
  (item) => item.restaurantId === DASH_GRILL_SEED_RESTAURANT_ID,
)
const JADE_HEARTH_REQUIRED_RESTAURANT = createSeedRestaurants().find(
  (restaurant) => restaurant.id === JADE_HEARTH_SEED_RESTAURANT_ID,
)
const JADE_HEARTH_REQUIRED_MENU_ITEMS = BUILT_IN_SEED_MENU_ITEMS.filter(
  (item) => item.restaurantId === JADE_HEARTH_SEED_RESTAURANT_ID,
)
const VERDANT_DAY_REQUIRED_RESTAURANT = createSeedRestaurants().find(
  (restaurant) => restaurant.id === VERDANT_DAY_SEED_RESTAURANT_ID,
)
const VERDANT_DAY_REQUIRED_MENU_ITEMS = BUILT_IN_SEED_MENU_ITEMS.filter(
  (item) => item.restaurantId === VERDANT_DAY_SEED_RESTAURANT_ID,
)
// Built-in seeds keep a catalog-sized reserve instead of consuming the user's 360 menu slots.
const BUILT_IN_SEED_MENU_ITEM_IDS = new Set(BUILT_IN_SEED_MENU_ITEMS.map((item) => item.id))
const normalizeStoredMenuItems = (rawItems, restaurantIds) =>
  normalizeMenuItems(rawItems, restaurantIds, BUILT_IN_SEED_MENU_ITEM_IDS)
const MOON_BISTRO_LEGACY_CUISINE = 'Fusion dinner'
const MOON_BISTRO_LEGACY_MENU_COPY_BY_ID = Object.freeze({
  food_menu_moon_rice: {
    title: 'Lunar Rice Set',
    desc: 'Grilled slices, warm rice, and crisp pickles for a quiet late-night dinner.',
  },
  food_menu_moon_soup: {
    title: 'Signal Soup',
    desc: 'Creamy mushroom soup with thyme and black pepper, made for slow evenings.',
  },
  food_menu_moon_night_tagliatelle: {
    title: 'Night Tagliatelle',
  },
})
const EXPANDED_SHOP_LEGACY_MENU_COPY_BY_ID = Object.freeze({
  food_menu_river_noodles: {
    restaurantId: RIVER_NOODLES_SEED_RESTAURANT_ID,
    title: 'River Beef Noodles',
    desc: 'Fast noodles with warm broth and beef slices.',
    ingredients: 'noodles, beef, broth',
    imageAlt: 'River Beef Noodles',
  },
  food_menu_cafe_latte: {
    restaurantId: DAYLIGHT_CAFE_SEED_RESTAURANT_ID,
    title: 'Daylight Latte',
    desc: 'Soft latte for a bright cafe stop.',
    ingredients: 'espresso, milk',
    imageAlt: 'Daylight Latte',
  },
  food_menu_sugar_cake: {
    restaurantId: SUGAR_LANE_SEED_RESTAURANT_ID,
    title: 'Tiny Moon Cake',
    desc: 'Small dessert with a sweet moonlit finish.',
    ingredients: 'cake, cream, sugar',
    imageAlt: 'Tiny Moon Cake',
  },
})
const DASH_GRILL_LEGACY_COMBO_COPY_BY_ID = Object.freeze({
  food_menu_dash_double_stack: Object.freeze({
    title: 'Dash Double Stack',
    desc: 'Two seared beef patties, cheddar, pickles, onion, and house dash sauce.',
    ingredients: 'beef, cheddar, pickles, onion, sesame bun, dash sauce',
  }),
  food_menu_dash_golden_chicken_stack: Object.freeze({
    title: 'Golden Chicken Stack',
    desc: 'Crisp chicken, shredded lettuce, pepper mayo, and a toasted potato bun.',
    ingredients: 'chicken, lettuce, pepper mayo, potato bun',
  }),
})
const defineLegacyPeachMenuCopy = ({
  title,
  desc,
  ingredients,
  menuSection,
  imageAlt,
  previousTitles = [],
  previousDescriptions = [],
  previousIngredients = [],
  previousMenuSections = [],
}) =>
  Object.freeze({
    title: Object.freeze([title, ...previousTitles]),
    desc: Object.freeze([desc, ...previousDescriptions]),
    ingredients: Object.freeze([ingredients, ...previousIngredients]),
    menuSection: Object.freeze([menuSection, ...previousMenuSections]),
    imageAlt: Object.freeze([imageAlt, ...previousTitles]),
  })
const PEACH_CLOUD_LEGACY_MENU_COPY_BY_ID = Object.freeze({
  food_menu_peach_oolong_cloud: defineLegacyPeachMenuCopy({
    title: 'Peach Oolong Cloud',
    desc: 'Fragrant oolong, white peach, and a soft salted milk cloud.',
    ingredients: 'oolong tea, white peach, milk foam, sea salt',
    menuSection: 'cloud_tea',
    imageAlt: 'Peach Oolong Cloud drink',
  }),
  food_menu_peach_brown_sugar_creme: defineLegacyPeachMenuCopy({
    title: 'Brown Sugar Creme No. 7',
    desc: 'Fresh milk tea striped with warm brown sugar and toasted creme.',
    ingredients: 'black tea, fresh milk, brown sugar, toasted creme',
    menuSection: 'cloud_tea',
    imageAlt: 'Brown Sugar Creme No. 7 milk tea',
  }),
  food_menu_peach_jasmine_cream: defineLegacyPeachMenuCopy({
    title: 'Cocoa Cloud Brownie',
    desc: 'Fudgy dark cocoa, roasted nuts, and a pale vanilla cloud.',
    ingredients: 'dark cocoa, butter, roasted nuts, vanilla cream',
    menuSection: 'oven_sweets',
    imageAlt: 'Cocoa Cloud Brownie',
    previousTitles: ['Jasmine Daydream'],
    previousDescriptions: ['Cold-brew jasmine tea finished with a light vanilla cream cap.'],
    previousIngredients: ['jasmine tea, vanilla, cream, cane sugar'],
    previousMenuSections: ['cloud_tea'],
  }),
  food_menu_peach_sunset_fizz: defineLegacyPeachMenuCopy({
    title: 'Peach Macaron Parade',
    desc: 'A bright box of peach, rose, vanilla, and cocoa macarons.',
    ingredients: 'almond flour, peach cream, rose, vanilla, cocoa',
    menuSection: 'oven_sweets',
    imageAlt: 'Peach Macaron Parade',
    previousTitles: ['Sunset Peach Fizz'],
  }),
  food_menu_peach_yuzu_spark: defineLegacyPeachMenuCopy({
    title: 'Yuzu Spark Pop',
    desc: 'Sharp yuzu soda with honey pearls and a crisp rosemary finish.',
    ingredients: 'yuzu, honey pearls, sparkling water, rosemary',
    menuSection: 'fruit_sparkle',
    imageAlt: 'Yuzu Spark Pop soda',
  }),
  food_menu_peach_mango_snow: defineLegacyPeachMenuCopy({
    title: 'Crepe Gelato Cloud',
    desc: 'Warm cocoa crepes folded around milk gelato and berry slices.',
    ingredients: 'butter crepe, cocoa, milk gelato, strawberry',
    menuSection: 'frozen_clouds',
    imageAlt: 'Crepe Gelato Cloud',
    previousTitles: ['Mango Snow Island'],
  }),
  food_menu_peach_strawberry_ice: defineLegacyPeachMenuCopy({
    title: 'Macaron Milk Drift',
    desc: 'Rose macarons with chilled milk cream and a berry ripple.',
    ingredients: 'almond macaron, milk cream, rose, berry compote',
    menuSection: 'frozen_clouds',
    imageAlt: 'Macaron Milk Drift',
    previousTitles: ['Strawberry Milk Drift'],
  }),
  food_menu_peach_matcha_float: defineLegacyPeachMenuCopy({
    title: 'Hojicha Cloud Float',
    desc: 'Roasted tea, chilled milk, vanilla cloud, and toasted rice crunch.',
    ingredients: 'hojicha, milk, vanilla cream, toasted rice',
    menuSection: 'cloud_tea',
    imageAlt: 'Hojicha Cloud Float',
    previousTitles: ['Matcha Cloud Float'],
    previousMenuSections: ['fruit_sparkle'],
  }),
  food_menu_peach_sunbeam_basque: defineLegacyPeachMenuCopy({
    title: 'Strawberry Sunbeam Slice',
    desc: 'A cold-set strawberry cheesecake with berry glaze and fresh mint.',
    ingredients: 'cream cheese, strawberry, biscuit, berry glaze',
    menuSection: 'oven_sweets',
    imageAlt: 'Strawberry Sunbeam cheesecake slice',
    previousTitles: ['Sunbeam Basque Slice'],
  }),
  food_menu_peach_butter_waffle: defineLegacyPeachMenuCopy({
    title: 'Cloud Nine Cocoa Crepes',
    desc: 'Three soft crepes with cocoa drizzle, strawberry, and milk cream.',
    ingredients: 'butter crepe, cocoa, strawberry, milk cream',
    menuSection: 'oven_sweets',
    imageAlt: 'Cloud Nine Cocoa Crepes',
    previousTitles: ['Cloud Nine Butter Waffle'],
  }),
  food_menu_peach_pocket_pie: defineLegacyPeachMenuCopy({
    title: 'Midnight Creme No. 11',
    desc: 'Deep iced coffee, brown sugar, and a tall toasted cream crown.',
    ingredients: 'cold-brew coffee, milk, brown sugar, toasted cream',
    menuSection: 'cloud_tea',
    imageAlt: 'Midnight Creme No. 11 iced coffee',
    previousTitles: ['Peach Pocket 03'],
  }),
  food_menu_peach_golden_hour_set: defineLegacyPeachMenuCopy({
    title: 'Golden Hour Pairing',
    desc: 'One Sunset Peach Fizz paired with a mini Sunbeam Basque slice.',
    ingredients: 'peach fizz, mini Basque cheesecake, peach honey',
    menuSection: 'seasonal_drop',
    imageAlt: 'Golden Hour drink and cheesecake pairing',
  }),
})

const migrateLegacyPeachMenuCopy = (existing, seedItem) => {
  if (existing.restaurantId !== PEACH_CLOUD_SEED_RESTAURANT_ID) return false
  const legacyCopy = PEACH_CLOUD_LEGACY_MENU_COPY_BY_ID[seedItem.id]
  if (!legacyCopy) return false

  let changed = false
  for (const field of ['title', 'desc', 'ingredients', 'menuSection']) {
    if (legacyCopy[field].includes(existing[field]) && existing[field] !== seedItem[field]) {
      existing[field] = seedItem[field]
      changed = true
    }
  }

  const seedImageAlt = seedItem.image?.alt || seedItem.title
  if (legacyCopy.imageAlt.includes(existing.image?.alt) && existing.image?.alt !== seedImageAlt) {
    existing.image = { ...existing.image, alt: seedImageAlt }
    changed = true
  }
  return changed
}

const migrateLegacyExpandedShopMenuCopy = (existing, seedItem) => {
  const legacyCopy = EXPANDED_SHOP_LEGACY_MENU_COPY_BY_ID[seedItem.id]
  if (!legacyCopy || existing.restaurantId !== legacyCopy.restaurantId) return false

  let changed = false
  for (const field of ['title', 'desc', 'ingredients']) {
    if (existing[field] === legacyCopy[field] && existing[field] !== seedItem[field]) {
      existing[field] = seedItem[field]
      changed = true
    }
  }

  const seedImageAlt = seedItem.image?.alt || seedItem.title
  if (existing.image?.alt === legacyCopy.imageAlt && existing.image.alt !== seedImageAlt) {
    existing.image = { ...existing.image, alt: seedImageAlt }
    changed = true
  }
  return changed
}

const migrateLegacyDashComboCopy = (existing, seedItem) => {
  if (existing.restaurantId !== DASH_GRILL_SEED_RESTAURANT_ID) return false
  const legacyCopy = DASH_GRILL_LEGACY_COMBO_COPY_BY_ID[seedItem.id]
  if (!legacyCopy) return false

  let changed = false
  for (const field of ['title', 'desc', 'ingredients']) {
    if (existing[field] === legacyCopy[field] && existing[field] !== seedItem[field]) {
      existing[field] = seedItem[field]
      changed = true
    }
  }
  return changed
}

export const useFoodDeliveryStore = defineStore('foodDelivery', () => {
  const getChatStore = () => useChatStore()
  const primaryCurrency = ref(DEFAULT_CURRENCY)
  const restaurants = ref([])
  const menuItems = ref([])
  const cartItems = ref([])
  const harborRoastRewards = ref(normalizeHarborRoastRewards())
  const platformCartItems = ref([])
  const platformOrders = ref([])
  const orders = ref([])
  const hasFinishedStorageHydration = ref(false)

  const restaurantMap = computed(
    () => new Map(restaurants.value.map((restaurant) => [restaurant.id, restaurant])),
  )
  const menuItemMap = computed(() => new Map(menuItems.value.map((item) => [item.id, item])))
  const restaurantCount = computed(() => restaurants.value.length)
  const menuItemCount = computed(() => menuItems.value.length)
  const harborRoastBeanStamps = computed(() => harborRoastRewards.value.beanStamps)
  const harborRoastMerchandise = computed(() =>
    HARBOR_ROAST_MERCHANDISE_CATALOG.map((item) => ({
      ...item,
      currency: primaryCurrency.value,
      purchasePrice: formatAmount(item.purchasePriceCents),
      canPurchase: item.purchasePriceCents > 0,
      canRedeem: item.beanStampCost > 0 && harborRoastBeanStamps.value >= item.beanStampCost,
      missingBeanStamps: Math.max(0, item.beanStampCost - harborRoastBeanStamps.value),
    })),
  )
  const peachCloudMerchandise = computed(() =>
    PEACH_CLOUD_MERCHANDISE_CATALOG.map((item) => ({
      ...item,
      currency: primaryCurrency.value,
      purchasePrice: formatAmount(item.purchasePriceCents),
      canPurchase: item.purchasePriceCents > 0,
      canRedeem: false,
      missingBeanStamps: 0,
    })),
  )
  const cartQuantity = computed(() =>
    cartItems.value.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
  )
  const platformCartQuantity = computed(() =>
    platformCartItems.value.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
  )
  const platformCartPrimaryTotal = computed(() => {
    const amountCents = platformCartItems.value.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    )
    return {
      currency: primaryCurrency.value,
      amountCents,
      amount: formatAmount(amountCents),
    }
  })
  const platformOrderCount = computed(() => platformOrders.value.length)
  const recentPlatformOrders = computed(() => platformOrders.value.slice(0, 20))
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
      restaurantCount: restaurants.value.filter((restaurant) => restaurant.category === entry.key)
        .length,
      menuItemCount: menuItems.value.filter((item) => item.category === entry.key).length,
    })),
  )
  const cartLineItems = computed(() =>
    cartItems.value
      .map((item) => {
        if (item.lineKind === 'merchandise') {
          const merchandise = FOOD_DELIVERY_MERCHANDISE_BY_ID.get(item.merchandiseId)
          const sourceRestaurant = restaurantMap.value.get(item.restaurantId) || null
          const restaurant = sourceRestaurant ? presentRestaurant(sourceRestaurant) : null
          if (!merchandise || !restaurant) return null
          const unitPriceCents = item.acquisition === 'redeemed_gift' ? 0 : item.unitPriceCents
          const subtotalCents = unitPriceCents * item.quantity
          return {
            ...item,
            lineId: item.lineId,
            merchandise: { ...merchandise, currency: primaryCurrency.value },
            menuItem: null,
            restaurant,
            title: merchandise.title,
            titleZh: merchandise.titleZh,
            titleEn: merchandise.titleEn,
            imagePath: merchandise.imagePath,
            assetBase: merchandise.assetBase || item.assetBase || 'harbor-roast',
            unitPriceCents,
            isGift: item.acquisition === 'redeemed_gift',
            subtotalCents,
            subtotal: formatAmount(subtotalCents),
            currency: primaryCurrency.value,
          }
        }
        const sourceMenuItem = menuItemMap.value.get(item.menuItemId)
        const menuItem = sourceMenuItem ? presentMenuItem(sourceMenuItem) : null
        if (!menuItem) return null
        const sourceRestaurant = restaurantMap.value.get(menuItem.restaurantId) || null
        const restaurant = sourceRestaurant ? presentRestaurant(sourceRestaurant) : null
        const unitPriceCents =
          Number.isFinite(Number(item.unitPriceCents)) && Number(item.unitPriceCents) > 0
            ? Math.floor(Number(item.unitPriceCents))
            : menuItem.priceCents
        const subtotalCents = unitPriceCents * item.quantity
        return {
          ...item,
          lineId: item.lineId || item.menuItemId,
          menuItem,
          restaurant,
          title: menuItem.title,
          image: menuItem.image,
          unitPriceCents,
          acquisition: 'purchase',
          isGift: false,
          subtotalCents,
          subtotal: formatAmount(subtotalCents),
          currency: menuItem.currency,
        }
      })
      .filter(Boolean),
  )
  const listCartLineItemsByRestaurant = (restaurantId) => {
    const id = normalizeFoodId(restaurantId)
    if (!id) return []
    return cartLineItems.value.filter((line) => line.restaurant?.id === id)
  }
  const getCartQuantityByRestaurant = (restaurantId) =>
    listCartLineItemsByRestaurant(restaurantId).reduce(
      (sum, line) => sum + Math.max(0, Number(line.quantity) || 0),
      0,
    )
  const getCartTotalsByRestaurant = (restaurantId) => {
    const restaurant = findRestaurantById(restaurantId)
    if (!restaurant) return []
    const lines = listCartLineItemsByRestaurant(restaurant.id)
    if (lines.length === 0) return []
    return summarizeOrderTotals(
      lines.map((line) => ({
        menuItemId: line.menuItemId,
        title: line.title,
        category: line.menuItem?.category || restaurant.category,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        currency: line.currency,
      })),
      restaurant.deliveryFeeCents || 0,
      primaryCurrency.value,
    )
  }
  const getCartPrimaryTotalByRestaurant = (restaurantId) => {
    const totals = getCartTotalsByRestaurant(restaurantId)
    return (
      totals.find((item) => item.currency === primaryCurrency.value) ||
      totals[0] || {
        currency: primaryCurrency.value,
        amountCents: 0,
        amount: '0.00',
      }
    )
  }
  const cartRestaurant = computed(() => cartLineItems.value[0]?.restaurant || null)
  const cartTotals = computed(() =>
    summarizeOrderTotals(
      cartLineItems.value.map((line) => ({
        menuItemId: line.menuItemId,
        title: line.title,
        category: line.menuItem?.category || line.restaurant?.category || 'restaurants',
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        currency: line.currency,
      })),
      cartRestaurant.value?.deliveryFeeCents || 0,
      primaryCurrency.value,
    ),
  )
  const cartPrimaryTotal = computed(
    () =>
      cartTotals.value.find((item) => item.currency === primaryCurrency.value) ||
      cartTotals.value[0] || {
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
      return restaurants.value
        .slice()
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map(presentRestaurant)
    }
    if (normalized === 'grocery_delivery') {
      return restaurants.value
        .filter((restaurant) => restaurant.category === 'grocery_delivery')
        .map(presentRestaurant)
    }
    return restaurants.value
      .filter((restaurant) => restaurant.category === normalized)
      .map(presentRestaurant)
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
    if (restaurants.value.length > FOOD_RESTAURANT_LIMIT)
      restaurants.value.splice(FOOD_RESTAURANT_LIMIT)
    return presentRestaurant(restaurant)
  }

  const upsertMenuItem = (input = {}) => {
    const now = Date.now()
    const restaurantIds = new Set(restaurants.value.map((restaurant) => restaurant.id))
    const inputId = normalizeFoodId(input.id)
    const existingIndex = inputId ? menuItems.value.findIndex((item) => item.id === inputId) : -1
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
    menuItems.value = normalizeStoredMenuItems(menuItems.value, restaurantIds)
    return presentMenuItem(menuItem)
  }

  const cartItemRestaurantId = (item = {}) =>
    item.lineKind === 'merchandise'
      ? item.restaurantId
      : menuItemMap.value.get(item.menuItemId)?.restaurantId || ''

  const canAddCartLineForRestaurant = (restaurantId) =>
    cartItems.value.filter((line) => cartItemRestaurantId(line) === restaurantId).length <
    FOOD_CART_LINE_LIMIT

  const setHarborRoastBeanStamps = (value) => {
    harborRoastRewards.value.beanStamps = clamp(toInt(value, harborRoastBeanStamps.value), 0, 999)
    return harborRoastRewards.value.beanStamps
  }

  const addMerchandiseLine = (merchandise, acquisition, quantity = 1) => {
    const lineId = `${merchandise.id}__${acquisition}`
    const restaurantId = merchandise.restaurantId || HARBOR_ROAST_SEED_RESTAURANT_ID
    const normalizedQuantity = normalizeQuantity(quantity)
    const now = Date.now()
    const existing = cartItems.value.find((item) => item.lineId === lineId)
    if (existing) {
      if (existing.quantity >= 99) return null
      existing.quantity = Math.min(99, existing.quantity + normalizedQuantity)
      existing.updatedAt = now
      return existing
    }
    if (!canAddCartLineForRestaurant(restaurantId)) return null
    const item = normalizeCartItem(
      {
        lineKind: 'merchandise',
        merchandiseId: merchandise.id,
        acquisition,
        quantity: normalizedQuantity,
        sourceModule: merchandise.sourceModule || 'food_delivery_harbor_merchandise',
        sourceId: merchandise.id,
        addedAt: now,
        updatedAt: now,
      },
      new Set(menuItemMap.value.keys()),
    )
    if (!item) return null
    cartItems.value.unshift(item)
    return item
  }

  const addHarborRoastMerchandiseToCart = (merchandiseId, quantity = 1) => {
    const id = normalizeFoodId(merchandiseId)
    const merchandise = HARBOR_ROAST_MERCHANDISE_BY_ID.get(id)
    if (!merchandise || merchandise.purchasePriceCents <= 0) {
      return { ok: false, reason: 'not_purchasable' }
    }
    const line = addMerchandiseLine(merchandise, 'purchase', quantity)
    return line ? { ok: true, line } : { ok: false, reason: 'cart_limit' }
  }

  const addPeachCloudMerchandiseToCart = (merchandiseId, quantity = 1) => {
    const id = normalizeFoodId(merchandiseId)
    const merchandise = PEACH_CLOUD_MERCHANDISE_BY_ID.get(id)
    if (!merchandise || merchandise.purchasePriceCents <= 0) {
      return { ok: false, reason: 'not_purchasable' }
    }
    const line = addMerchandiseLine(merchandise, 'purchase', quantity)
    return line ? { ok: true, line } : { ok: false, reason: 'cart_limit' }
  }

  const redeemHarborRoastMerchandise = (merchandiseId) => {
    const id = normalizeFoodId(merchandiseId)
    const merchandise = HARBOR_ROAST_MERCHANDISE_BY_ID.get(id)
    if (!merchandise || merchandise.beanStampCost <= 0) {
      return { ok: false, reason: 'not_redeemable' }
    }
    const availableBeanStamps = harborRoastBeanStamps.value
    if (availableBeanStamps < merchandise.beanStampCost) {
      return {
        ok: false,
        reason: 'insufficient_stamps',
        availableBeanStamps,
        requiredBeanStamps: merchandise.beanStampCost,
        missingBeanStamps: merchandise.beanStampCost - availableBeanStamps,
      }
    }
    const line = addMerchandiseLine(merchandise, 'redeemed_gift', 1)
    if (!line) return { ok: false, reason: 'cart_limit' }
    harborRoastRewards.value.beanStamps -= merchandise.beanStampCost
    return {
      ok: true,
      line,
      spentBeanStamps: merchandise.beanStampCost,
      remainingBeanStamps: harborRoastRewards.value.beanStamps,
    }
  }

  const addToCart = (menuItemId, quantity = 1, options = {}) => {
    const menuItem = findMenuItemById(menuItemId)
    if (!menuItem || menuItem.available === false) return null
    const normalizedQuantity = normalizeQuantity(quantity)
    const now = Date.now()
    const selectionKey = normalizeText(options.selectionKey, '', 64)
    const selection = selectionKey ? normalizeMenuSelection(options.selection) : null
    const selectedUnitPriceCents =
      selectionKey &&
      Number.isFinite(Number(options.unitPriceCents)) &&
      Number(options.unitPriceCents) > 0
        ? Math.floor(Number(options.unitPriceCents))
        : null
    const lineId = selectionKey ? `${menuItem.id}__${selectionKey}`.slice(0, 140) : menuItem.id
    const existing = cartItems.value.find((item) => (item.lineId || item.menuItemId) === lineId)
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + normalizedQuantity)
      existing.updatedAt = now
      return existing
    }
    const item = {
      lineId,
      lineKind: 'menu',
      menuItemId: menuItem.id,
      selectionKey,
      selection,
      unitPriceCents: selectedUnitPriceCents,
      quantity: normalizedQuantity,
      sourceModule: normalizeText(options.sourceModule, 'food_delivery_cart', 60),
      sourceId: normalizeText(options.sourceId, '', 140),
      addedAt: now,
      updatedAt: now,
    }
    cartItems.value.unshift(item)
    const restaurantLines = cartItems.value.filter(
      (line) => cartItemRestaurantId(line) === menuItem.restaurantId,
    )
    if (restaurantLines.length > FOOD_CART_LINE_LIMIT) {
      const overflowLineIds = new Set(
        restaurantLines.slice(FOOD_CART_LINE_LIMIT).map((line) => line.lineId || line.menuItemId),
      )
      cartItems.value = cartItems.value.filter(
        (line) => !overflowLineIds.has(line.lineId || line.menuItemId),
      )
    }
    return item
  }

  const updateCartQuantity = (lineId, quantity = 1) => {
    const id = normalizeFoodId(lineId)
    const item = cartItems.value.find((line) => (line.lineId || line.menuItemId) === id)
    if (!item) return false
    const nextQuantity = toInt(quantity, item.quantity)
    const isRedeemedGift = item.lineKind === 'merchandise' && item.acquisition === 'redeemed_gift'
    if (isRedeemedGift && nextQuantity > item.quantity) return false
    if (isRedeemedGift && nextQuantity < item.quantity) {
      const removedQuantity = item.quantity - Math.max(0, nextQuantity)
      harborRoastRewards.value.beanStamps = clamp(
        harborRoastRewards.value.beanStamps + removedQuantity * item.beanStampCost,
        0,
        999,
      )
    }
    if (nextQuantity <= 0) {
      cartItems.value = cartItems.value.filter((line) => (line.lineId || line.menuItemId) !== id)
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

  const clearCartByRestaurant = (restaurantId) => {
    const id = normalizeFoodId(restaurantId)
    if (!id) return 0
    const before = cartItems.value.length
    cartItems.value = cartItems.value.filter((line) => cartItemRestaurantId(line) !== id)
    return before - cartItems.value.length
  }

  const addPlatformCartItem = (input = {}, quantity = 1) => {
    const cartItem = normalizePlatformCartItem({
      ...input,
      quantity,
      addedAt: Date.now(),
      updatedAt: Date.now(),
    })
    if (!cartItem) return null
    const currentMerchantId = platformCartItems.value[0]?.merchantId || ''
    if (currentMerchantId && currentMerchantId !== cartItem.merchantId) {
      platformCartItems.value = []
    }
    const existing = platformCartItems.value.find((item) => item.itemId === cartItem.itemId)
    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + cartItem.quantity)
      existing.updatedAt = Date.now()
      return existing
    }
    platformCartItems.value.unshift(cartItem)
    if (platformCartItems.value.length > FOOD_CART_LINE_LIMIT) {
      platformCartItems.value.splice(FOOD_CART_LINE_LIMIT)
    }
    return cartItem
  }

  const updatePlatformCartQuantity = (itemId, quantity = 1) => {
    const id = normalizeFoodId(itemId)
    const item = platformCartItems.value.find((line) => line.itemId === id)
    if (!item) return false
    const nextQuantity = toInt(quantity, item.quantity)
    if (nextQuantity <= 0) {
      platformCartItems.value = platformCartItems.value.filter((line) => line.itemId !== id)
      return true
    }
    item.quantity = normalizeQuantity(nextQuantity)
    item.updatedAt = Date.now()
    return true
  }

  const clearPlatformCart = () => {
    const removed = platformCartItems.value.length
    platformCartItems.value = []
    return removed
  }

  const findPlatformOrderById = (orderId) => {
    const id = normalizeText(orderId, '', 140)
    return id ? platformOrders.value.find((order) => order.id === id) || null : null
  }

  const checkoutPlatformCart = ({
    deliveryAddress = '',
    note = '',
    paymentMethod = 'app_pay',
    deliveryFee = '0.00',
    etaMinutes = 35,
  } = {}) => {
    if (platformCartItems.value.length === 0) return null
    const firstItem = platformCartItems.value[0]
    const now = Date.now()
    const order = normalizePlatformOrder({
      id: createPlatformOrderId(),
      status: FOOD_DELIVERY_ORDER_STATUS.PLACED,
      merchantId: firstItem.merchantId,
      merchantName: firstItem.merchantName,
      items: platformCartItems.value.map((item) => ({
        id: `${item.itemId}_${item.addedAt}`,
        itemId: item.itemId,
        title: item.title,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        currency: primaryCurrency.value,
      })),
      deliveryAddress,
      note,
      paymentMethod,
      deliveryFee,
      etaMinutes,
      currency: primaryCurrency.value,
      sourceModule: 'food_delivery_platform_checkout',
      sourceId: firstItem.merchantId,
      createdAt: now,
      updatedAt: now,
    })
    if (!order) return null
    platformOrders.value.unshift(order)
    if (platformOrders.value.length > FOOD_ORDER_LIMIT) {
      platformOrders.value.splice(FOOD_ORDER_LIMIT)
    }
    clearPlatformCart()
    return order
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
    restaurantId = '',
    deliveryAddress = '',
    note = '',
    fulfillmentMode = 'delivery',
    pickupMode = '',
    relationshipBinding = null,
    sourceModule = FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH,
    sourceId = '',
  } = {}) => {
    const targetRestaurantId =
      normalizeFoodId(restaurantId) || cartLineItems.value[0]?.restaurant?.id || ''
    const lines = listCartLineItemsByRestaurant(targetRestaurantId)
    if (lines.length === 0) return null
    const restaurant = findRestaurantById(targetRestaurantId)
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
        id: `${line.lineId}_${line.addedAt}`,
        lineKind: line.lineKind,
        menuItemId: line.menuItemId,
        merchandiseId: line.merchandiseId,
        acquisition: line.acquisition,
        title: line.title,
        titleZh: line.titleZh,
        titleEn: line.titleEn,
        imagePath: line.imagePath,
        assetBase: line.assetBase,
        beanStampCost: line.beanStampCost,
        category: line.menuItem?.category || restaurant.category,
        selectionKey: line.selectionKey,
        selection: line.selection,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        currency: primaryCurrency.value,
      })),
      deliveryAddress,
      note,
      fulfillmentMode,
      pickupMode,
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
    clearCartByRestaurant(restaurant.id)
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
    order.events = [event, ...currentEvents.filter((item) => item.id !== event.id)].slice(
      0,
      FOOD_ORDER_EVENT_LIMIT,
    )

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

  const neutralizeRelationshipOrder = (orderId, profile = {}, replacementName = 'Someone') => {
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

  const applySeedContentMigrations = () => {
    let changed = false
    if (
      RIVER_NOODLES_REQUIRED_RESTAURANT &&
      !restaurants.value.some((restaurant) => restaurant.id === RIVER_NOODLES_SEED_RESTAURANT_ID)
    ) {
      restaurants.value = normalizeRestaurants([
        ...restaurants.value,
        { ...RIVER_NOODLES_REQUIRED_RESTAURANT },
      ])
      changed = true
    }
    if (
      DAYLIGHT_CAFE_REQUIRED_RESTAURANT &&
      !restaurants.value.some((restaurant) => restaurant.id === DAYLIGHT_CAFE_SEED_RESTAURANT_ID)
    ) {
      restaurants.value = normalizeRestaurants([
        ...restaurants.value,
        { ...DAYLIGHT_CAFE_REQUIRED_RESTAURANT },
      ])
      changed = true
    }
    if (
      SUGAR_LANE_REQUIRED_RESTAURANT &&
      !restaurants.value.some((restaurant) => restaurant.id === SUGAR_LANE_SEED_RESTAURANT_ID)
    ) {
      restaurants.value = normalizeRestaurants([
        ...restaurants.value,
        { ...SUGAR_LANE_REQUIRED_RESTAURANT },
      ])
      changed = true
    }
    if (
      HARBOR_ROAST_REQUIRED_RESTAURANT &&
      !restaurants.value.some((restaurant) => restaurant.id === HARBOR_ROAST_SEED_RESTAURANT_ID)
    ) {
      restaurants.value = normalizeRestaurants([
        ...restaurants.value,
        { ...HARBOR_ROAST_REQUIRED_RESTAURANT },
      ])
      changed = true
    }
    if (
      PEACH_CLOUD_REQUIRED_RESTAURANT &&
      !restaurants.value.some((restaurant) => restaurant.id === PEACH_CLOUD_SEED_RESTAURANT_ID)
    ) {
      restaurants.value = normalizeRestaurants([
        ...restaurants.value,
        { ...PEACH_CLOUD_REQUIRED_RESTAURANT },
      ])
      changed = true
    }
    if (
      DASH_GRILL_REQUIRED_RESTAURANT &&
      !restaurants.value.some((restaurant) => restaurant.id === DASH_GRILL_SEED_RESTAURANT_ID)
    ) {
      restaurants.value = normalizeRestaurants([
        ...restaurants.value,
        { ...DASH_GRILL_REQUIRED_RESTAURANT },
      ])
      changed = true
    }
    if (
      JADE_HEARTH_REQUIRED_RESTAURANT &&
      !restaurants.value.some((restaurant) => restaurant.id === JADE_HEARTH_SEED_RESTAURANT_ID)
    ) {
      restaurants.value = normalizeRestaurants([
        ...restaurants.value,
        { ...JADE_HEARTH_REQUIRED_RESTAURANT },
      ])
      changed = true
    }
    if (
      VERDANT_DAY_REQUIRED_RESTAURANT &&
      !restaurants.value.some((restaurant) => restaurant.id === VERDANT_DAY_SEED_RESTAURANT_ID)
    ) {
      restaurants.value = normalizeRestaurants([
        ...restaurants.value,
        { ...VERDANT_DAY_REQUIRED_RESTAURANT },
      ])
      changed = true
    }

    const moonBistro = restaurants.value.find(
      (restaurant) => restaurant.id === MOON_BISTRO_SEED_RESTAURANT_ID,
    )
    if (moonBistro?.cuisine === MOON_BISTRO_LEGACY_CUISINE) {
      moonBistro.cuisine = 'Modern fine dining'
      changed = true
    }

    restaurants.value.forEach((restaurant) => {
      if (migrateLegacySeedImage(restaurant, BUILT_IN_SEED_RESTAURANTS_BY_ID.get(restaurant.id))) {
        changed = true
      }
    })

    const restaurantIds = new Set(restaurants.value.map((restaurant) => restaurant.id))
    const nextMenuItems = menuItems.value.map((item) => ({ ...item }))
    const existingById = new Map(nextMenuItems.map((item) => [item.id, item]))
    const requiredMenuItems = [
      ...(restaurantIds.has(MOON_BISTRO_SEED_RESTAURANT_ID) ? MOON_BISTRO_REQUIRED_MENU_ITEMS : []),
      ...(restaurantIds.has(RIVER_NOODLES_SEED_RESTAURANT_ID)
        ? RIVER_NOODLES_REQUIRED_MENU_ITEMS
        : []),
      ...(restaurantIds.has(DAYLIGHT_CAFE_SEED_RESTAURANT_ID)
        ? DAYLIGHT_CAFE_REQUIRED_MENU_ITEMS
        : []),
      ...(restaurantIds.has(HARBOR_ROAST_SEED_RESTAURANT_ID)
        ? HARBOR_ROAST_REQUIRED_MENU_ITEMS
        : []),
      ...(restaurantIds.has(SUGAR_LANE_SEED_RESTAURANT_ID) ? SUGAR_LANE_REQUIRED_MENU_ITEMS : []),
      ...(restaurantIds.has(PEACH_CLOUD_SEED_RESTAURANT_ID) ? PEACH_CLOUD_REQUIRED_MENU_ITEMS : []),
      ...(restaurantIds.has(DASH_GRILL_SEED_RESTAURANT_ID) ? DASH_GRILL_REQUIRED_MENU_ITEMS : []),
      ...(restaurantIds.has(JADE_HEARTH_SEED_RESTAURANT_ID) ? JADE_HEARTH_REQUIRED_MENU_ITEMS : []),
      ...(restaurantIds.has(VERDANT_DAY_SEED_RESTAURANT_ID) ? VERDANT_DAY_REQUIRED_MENU_ITEMS : []),
    ]

    requiredMenuItems.forEach((seedItem) => {
      const existing = existingById.get(seedItem.id)
      if (!existing) {
        nextMenuItems.push({ ...seedItem })
        existingById.set(seedItem.id, seedItem)
        changed = true
        return
      }
      if (migrateLegacySeedImage(existing, seedItem)) changed = true
      if (!existing.menuSection || existing.menuSection === 'signature') {
        existing.menuSection = seedItem.menuSection
        changed = true
      }
      if (migrateLegacyExpandedShopMenuCopy(existing, seedItem)) changed = true
      if (migrateLegacyPeachMenuCopy(existing, seedItem)) changed = true
      if (migrateLegacyDashComboCopy(existing, seedItem)) changed = true
      const legacyMoonCopy = MOON_BISTRO_LEGACY_MENU_COPY_BY_ID[seedItem.id]
      if (
        legacyMoonCopy &&
        existing.restaurantId === MOON_BISTRO_SEED_RESTAURANT_ID &&
        existing.title === legacyMoonCopy.title &&
        (!legacyMoonCopy.desc || existing.desc === legacyMoonCopy.desc)
      ) {
        existing.title = seedItem.title
        existing.desc = seedItem.desc
        existing.ingredients = seedItem.ingredients
        existing.menuSection = seedItem.menuSection
        existing.image = {
          ...existing.image,
          alt: seedItem.image?.alt || existing.image?.alt || seedItem.title,
        }
        changed = true
      }
    })

    if (!changed) return false
    menuItems.value = normalizeStoredMenuItems(nextMenuItems, restaurantIds)
    return true
  }

  const applyPersistedSource = (source, options = {}) => {
    const rawSource = source && typeof source === 'object' ? source : null
    if (!rawSource) return false

    const nextRestaurants = normalizeRestaurants(rawSource.restaurants)
    const restaurantIds = new Set(nextRestaurants.map((restaurant) => restaurant.id))
    const nextMenuItems = normalizeStoredMenuItems(
      rawSource.menuItems || rawSource.menu,
      restaurantIds,
    )
    const menuItemsById = new Map(nextMenuItems.map((item) => [item.id, item]))
    restaurants.value = nextRestaurants
    menuItems.value = nextMenuItems
    cartItems.value = normalizeCartItems(rawSource.cartItems || rawSource.cart, menuItemsById)
    harborRoastRewards.value = normalizeHarborRoastRewards(rawSource.harborRoastRewards)
    platformCartItems.value = normalizePlatformCartItems(rawSource.platformCartItems)
    platformOrders.value = normalizePlatformOrders(rawSource.platformOrders)
    orders.value = normalizeFoodOrders(rawSource.orders)
    primaryCurrency.value = normalizeCurrency(
      rawSource.primaryCurrency || rawSource.defaultCurrency || rawSource.settings?.primaryCurrency,
      primaryCurrency.value,
    )
    if (options.applySeedMigrations !== false) applySeedContentMigrations()
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
    cartItems: cartItems.value.map((item) => ({
      ...item,
      selection: item.selection ? { ...item.selection } : null,
    })),
    harborRoastRewards: { ...harborRoastRewards.value },
    platformCartItems: platformCartItems.value.map((item) => ({ ...item })),
    platformOrders: platformOrders.value.map((order) => ({
      ...order,
      items: order.items.map((item) => ({ ...item })),
    })),
    orders: orders.value.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        selection: item.selection ? { ...item.selection } : null,
      })),
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
    return applyPersistedSource(source, { applySeedMigrations: false })
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
    harborRoastRewards.value = normalizeHarborRoastRewards()
    platformCartItems.value = []
    platformOrders.value = []
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
    [
      restaurants,
      menuItems,
      cartItems,
      harborRoastRewards,
      platformCartItems,
      platformOrders,
      orders,
      primaryCurrency,
    ],
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
    harborRoastRewards,
    platformCartItems,
    platformOrders,
    orders,
    primaryCurrency,
    restaurantCount,
    menuItemCount,
    harborRoastBeanStamps,
    harborRoastMerchandise,
    peachCloudMerchandise,
    cartQuantity,
    platformCartQuantity,
    platformCartPrimaryTotal,
    platformOrderCount,
    recentPlatformOrders,
    orderCount,
    recentOrders,
    categorySummaries,
    cartLineItems,
    listCartLineItemsByRestaurant,
    getCartQuantityByRestaurant,
    getCartTotalsByRestaurant,
    getCartPrimaryTotalByRestaurant,
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
    setHarborRoastBeanStamps,
    addHarborRoastMerchandiseToCart,
    addPeachCloudMerchandiseToCart,
    redeemHarborRoastMerchandise,
    addToCart,
    updateCartQuantity,
    clearCart,
    clearCartByRestaurant,
    addPlatformCartItem,
    updatePlatformCartQuantity,
    clearPlatformCart,
    checkoutPlatformCart,
    findPlatformOrderById,
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
