import { SHOP_ENTRY_BINDING_TARGET, resolveEntryPresentationMeta } from './app-entry-presentation'
import {
  isMiniAppEntryInstalled,
  normalizeAppStoreMiniAppPlacements,
} from './app-store-mini-app-placement'
import {
  FOOD_DELIVERY_ROUTE,
  SHOPPING_PLATFORM_APP_ENTRIES,
} from './planned-module-registry'
import { resolveFoodShopDefaultIdentity } from './food-shop-presentation'

export const FOOD_DELIVERY_PLATFORM_ENTRY_KEY = 'food_delivery_platform'

export const buildFoodDeliveryShopEntryId = (restaurantId = '') =>
  restaurantId ? `shop_app_${restaurantId}` : ''

export const buildShoppingShopEntryId = (serviceKey = '') =>
  serviceKey ? `shop_app_shopping_${serviceKey}` : ''

const normalizeList = (value = []) => (Array.isArray(value) ? value : [])

const uiAssetUrl = (path = '') =>
  `${import.meta.env.BASE_URL || '/'}images/ui-assets/${String(path).replace(/^\/+/, '')}`

const FOOD_SHOP_FOLDER_ENTRY_DEFAULTS = Object.freeze({
  food_seed_harbor_roast: Object.freeze({
    icon: 'fas fa-mug-hot',
    iconAsset: uiAssetUrl('apps/food-delivery/harbor-roast/brand/harbor-roast-app-icon-01.png'),
    iconAssetFullBleed: true,
    accent: 'warm',
  }),
  food_seed_peach_cloud: Object.freeze({
    icon: 'fas fa-cloud',
    iconAsset: uiAssetUrl('apps/food-delivery/peach-cloud/brand/peach-cloud-mark-01.svg'),
    accent: 'rose',
  }),
  food_seed_verdant_day: Object.freeze({ icon: 'fas fa-leaf', accent: 'light' }),
})

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
    zh: 'Baemin',
    en: 'Baemin',
    descZh: '搜索、附近、订单和所有店铺发现。',
    descEn: 'Search, nearby shops, orders, and broad discovery.',
    icon: 'fas fa-utensils',
    iconAsset: uiAssetUrl('apps/food-delivery/platform/brand/baemin-entry-icon-01.png'),
    iconAssetFullBleed: true,
    accent: 'cool',
    route: FOOD_DELIVERY_ROUTE,
    folderQuery: {
      entry: 'platform',
    },
  }

  const shopEntries = normalizeList(restaurants)
    .map((restaurant) => {
      const entryId = buildFoodDeliveryShopEntryId(restaurant?.id || '')
      if (!entryId || !isMiniAppEntryInstalled(normalizedPlacements, entryId)) return null
      const entryDefaults = FOOD_SHOP_FOLDER_ENTRY_DEFAULTS[restaurant.id] || {}
      const presentation = resolveEntryPresentationMeta(
        {
          id: entryId,
          icon: entryDefaults.icon || 'fas fa-store',
          accent: entryDefaults.accent || 'warm',
          entryKind: 'shop_app',
          shopAppEntry: true,
          sourceModule: SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY,
          bindingTarget: SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY,
          runtimeIdentity: restaurant.id,
        },
        presentationOverrides,
      )
      const defaultIdentity = resolveFoodShopDefaultIdentity(restaurant)
      const fallbackDescription = formatFoodShopDescription(restaurant) || 'Food Delivery mini app'
      return {
        key: entryId,
        zh: presentation.displayName || defaultIdentity.nameZh || restaurant.name || 'Food shop',
        en: presentation.displayName || defaultIdentity.nameEn || restaurant.name || 'Food shop',
        descZh:
          presentation.shortDescription || defaultIdentity.descriptionZh || fallbackDescription,
        descEn:
          presentation.shortDescription || defaultIdentity.descriptionEn || fallbackDescription,
        icon: presentation.icon || entryDefaults.icon || 'fas fa-store',
        iconAsset: presentation.hasOverride ? '' : entryDefaults.iconAsset || '',
        iconAssetFullBleed:
          presentation.hasOverride === false && Boolean(entryDefaults.iconAssetFullBleed),
        accent: presentation.accent || entryDefaults.accent || 'warm',
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
      iconAsset:
        presentation.hasImageIcon || presentation.icon !== service.icon || !service.brandAssetPath
          ? ''
          : uiAssetUrl(service.brandAssetPath),
      iconAssetFullBleed:
        !presentation.hasImageIcon &&
        presentation.icon === service.icon &&
        Boolean(service.brandAssetPath),
      accent: presentation.accent || service.accent || 'warm',
      route: service.route,
      folderQuery: {
        ...(service.folderQuery || {}),
        entry: 'shop',
        shopEntryId: entryId,
      },
    }
  }).filter(Boolean)
}
