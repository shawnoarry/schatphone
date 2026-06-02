import { SHOP_ENTRY_BINDING_TARGET, resolveEntryPresentationMeta } from './app-entry-presentation'
import {
  isMiniAppEntryInstalled,
  normalizeAppStoreMiniAppPlacements,
} from './app-store-mini-app-placement'
import {
  FOOD_DELIVERY_ROUTE,
  SHOPPING_PLATFORM_APP_ENTRIES,
  SHOPPING_ROUTE,
} from './planned-module-registry'

export const FOOD_DELIVERY_PLATFORM_ENTRY_KEY = 'food_delivery_platform'

export const buildFoodDeliveryShopEntryId = (restaurantId = '') =>
  restaurantId ? `shop_app_${restaurantId}` : ''

export const buildShoppingShopEntryId = (serviceKey = '') =>
  serviceKey ? `shop_app_shopping_${serviceKey}` : ''

const normalizeList = (value = []) => (Array.isArray(value) ? value : [])

const formatFoodShopDescription = (restaurant = {}) => {
  const parts = [
    restaurant.cuisine || restaurant.category || '',
    Number.isFinite(Number(restaurant.deliveryEtaMinutes))
      ? `${Math.max(0, Math.floor(Number(restaurant.deliveryEtaMinutes)))} min`
      : '',
    Number.isFinite(Number(restaurant.rating)) ? `${Number(restaurant.rating).toFixed(1)}` : '',
  ].filter(Boolean)
  return parts.join(' · ')
}

export const buildFoodDeliveryFolderEntries = ({
  restaurants = [],
  placements = {},
  presentationOverrides = {},
} = {}) => {
  const normalizedPlacements = normalizeAppStoreMiniAppPlacements(placements)
  const platformEntry = {
    key: FOOD_DELIVERY_PLATFORM_ENTRY_KEY,
    zh: '外卖平台',
    en: 'Food Platform',
    descZh: '搜索、附近、订单和所有店铺发现。',
    descEn: 'Search, nearby shops, orders, and broad discovery.',
    icon: 'fas fa-utensils',
    accent: 'dark',
    route: FOOD_DELIVERY_ROUTE,
    folderQuery: {
      entry: 'platform',
    },
  }

  const shopEntries = normalizeList(restaurants)
    .map((restaurant) => {
      const entryId = buildFoodDeliveryShopEntryId(restaurant?.id || '')
      if (!entryId || !isMiniAppEntryInstalled(normalizedPlacements, entryId)) return null
      const presentation = resolveEntryPresentationMeta(
        {
          id: entryId,
          icon: 'fas fa-store',
          accent: 'warm',
          entryKind: 'shop_app',
          shopAppEntry: true,
          sourceModule: SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY,
          bindingTarget: SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY,
          runtimeIdentity: restaurant.id,
        },
        presentationOverrides,
      )
      const displayName = presentation.displayName || restaurant.name || 'Food shop'
      const shortDescription =
        presentation.shortDescription || formatFoodShopDescription(restaurant) || 'Food Delivery mini app'
      return {
        key: entryId,
        zh: displayName,
        en: displayName,
        descZh: shortDescription,
        descEn: shortDescription,
        icon: presentation.icon || 'fas fa-store',
        accent: presentation.accent || 'warm',
        route: FOOD_DELIVERY_ROUTE,
        folderQuery: {
          restaurantId: restaurant.id,
          entry: 'shop',
          shopEntryId: entryId,
        },
      }
    })
    .filter(Boolean)

  return [platformEntry, ...shopEntries]
}

export const buildShoppingFolderEntries = ({
  placements = {},
  presentationOverrides = {},
} = {}) => {
  const normalizedPlacements = normalizeAppStoreMiniAppPlacements(placements)
  return SHOPPING_PLATFORM_APP_ENTRIES.map((service) => {
    const entryId = buildShoppingShopEntryId(service.key)
    if (!entryId || !isMiniAppEntryInstalled(normalizedPlacements, entryId)) return null
    const presentation = resolveEntryPresentationMeta(
      {
        id: entryId,
        icon: service.icon || 'fas fa-store',
        accent: service.accent || 'warm',
        entryKind: 'shop_app',
        shopAppEntry: true,
        sourceModule: SHOP_ENTRY_BINDING_TARGET.SHOPPING,
        bindingTarget: SHOP_ENTRY_BINDING_TARGET.SHOPPING,
        runtimeIdentity: service.key,
      },
      presentationOverrides,
    )
    const defaultNameZh = service.zh || service.en || service.key
    const defaultNameEn = service.en || service.zh || service.key
    const defaultDescriptionZh = service.descZh || service.descEn || ''
    const defaultDescriptionEn = service.descEn || service.descZh || ''
    return {
      ...service,
      key: entryId,
      zh: presentation.displayName || defaultNameZh,
      en: presentation.displayName || defaultNameEn,
      descZh: presentation.shortDescription || defaultDescriptionZh,
      descEn: presentation.shortDescription || defaultDescriptionEn,
      icon: presentation.icon || service.icon || 'fas fa-store',
      accent: presentation.accent || service.accent || 'warm',
      route: SHOPPING_ROUTE,
      folderQuery: {
        ...(service.folderQuery || {}),
        entry: 'shop',
        shopEntryId: entryId,
      },
    }
  }).filter(Boolean)
}
