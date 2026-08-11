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
import { projectUiAssetUrl } from './project-assets'

export const FOOD_DELIVERY_PLATFORM_ENTRY_KEY = 'food_delivery_platform'

export const buildFoodDeliveryShopEntryId = (restaurantId = '') =>
  restaurantId ? `shop_app_${restaurantId}` : ''

export const buildShoppingShopEntryId = (serviceKey = '') =>
  serviceKey ? `shop_app_shopping_${serviceKey}` : ''

const normalizeList = (value = []) => (Array.isArray(value) ? value : [])

const uiAssetUrl = (path = '') => projectUiAssetUrl(path)

const FOOD_SHOP_FOLDER_ENTRY_ORDER = Object.freeze([
  'food_seed_moon_bistro',
  'food_seed_river_noodles',
  'food_seed_daylight_cafe',
  'food_seed_harbor_roast',
  'food_seed_sugar_lane',
  'food_seed_peach_cloud',
  'food_seed_dash_grill',
  'food_seed_jade_hearth',
  'food_seed_verdant_day',
  'food_seed_myeongdong_kyoja',
  'food_seed_london_bagel_museum',
  'food_seed_knotted',
  'food_seed_kyochon_chicken',
  'food_seed_eggdrop',
])
const FOOD_SHOP_FOLDER_ENTRY_RANK = new Map(
  FOOD_SHOP_FOLDER_ENTRY_ORDER.map((restaurantId, index) => [restaurantId, index]),
)

const FOOD_SHOP_FOLDER_ENTRY_DEFAULTS = Object.freeze({
  food_seed_moon_bistro: Object.freeze({
    icon: 'fas fa-moon',
    iconAsset: uiAssetUrl(
      'apps/food-delivery/moon-bistro/brand/moon-bistro-app-icon-01.webp',
    ),
    iconAssetFullBleed: true,
    accent: 'dark',
  }),
  food_seed_river_noodles: Object.freeze({
    icon: 'fas fa-bowl-food',
    iconAsset: uiAssetUrl(
      'apps/food-delivery/river-noodles/brand/river-noodles-app-icon-01.webp',
    ),
    iconAssetFullBleed: true,
    accent: 'cool',
  }),
  food_seed_daylight_cafe: Object.freeze({
    icon: 'fas fa-mug-saucer',
    iconAsset: uiAssetUrl(
      'apps/food-delivery/daylight-cafe/brand/daylight-cafe-app-icon-01.webp',
    ),
    iconAssetFullBleed: true,
    accent: 'light',
  }),
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
  food_seed_sugar_lane: Object.freeze({
    icon: 'fas fa-candy-cane',
    iconAsset: uiAssetUrl(
      'apps/food-delivery/sugar-lane/brand/sugar-lane-app-icon-01.webp',
    ),
    iconAssetFullBleed: true,
    accent: 'rose',
  }),
  food_seed_dash_grill: Object.freeze({
    icon: 'fas fa-burger',
    iconAsset: uiAssetUrl(
      'apps/food-delivery/dash-grill/brand/dash-grill-app-icon-01.webp',
    ),
    iconAssetFullBleed: true,
    accent: 'warm',
  }),
  food_seed_jade_hearth: Object.freeze({
    icon: 'fas fa-utensils',
    iconAsset: uiAssetUrl(
      'apps/food-delivery/jade-hearth/brand/jade-hearth-app-icon-01.webp',
    ),
    iconAssetFullBleed: true,
    accent: 'light',
  }),
  food_seed_verdant_day: Object.freeze({
    icon: 'fas fa-leaf',
    iconAsset: uiAssetUrl(
      'apps/food-delivery/verdant-day/brand/verdant-day-app-icon-01.webp',
    ),
    iconAssetFullBleed: true,
    accent: 'light',
  }),
  food_seed_myeongdong_kyoja: Object.freeze({
    icon: 'fas fa-bowl-food',
    iconAsset: uiAssetUrl(
      'apps/food-delivery/myeongdong-kyoja/brand/myeongdong-kyoja-app-icon-01.webp',
    ),
    iconAssetFullBleed: true,
    accent: 'warm',
  }),
  food_seed_london_bagel_museum: Object.freeze({
    icon: 'fas fa-bread-slice',
    iconAsset: uiAssetUrl(
      'apps/food-delivery/london-bagel-museum/brand/london-bagel-museum-app-icon-01.webp',
    ),
    iconAssetFullBleed: true,
    accent: 'dark',
  }),
  food_seed_knotted: Object.freeze({
    icon: 'fas fa-cookie-bite',
    iconAsset: uiAssetUrl('apps/food-delivery/knotted/brand/knotted-app-icon-01.webp'),
    iconAssetFullBleed: true,
    accent: 'rose',
  }),
  food_seed_kyochon_chicken: Object.freeze({
    icon: 'fas fa-drumstick-bite',
    iconAsset: uiAssetUrl(
      'apps/food-delivery/kyochon-chicken/brand/kyochon-chicken-app-icon-01.webp',
    ),
    iconAssetFullBleed: true,
    accent: 'dark',
  }),
  food_seed_eggdrop: Object.freeze({
    icon: 'fas fa-egg',
    iconAsset: uiAssetUrl('apps/food-delivery/eggdrop/brand/eggdrop-app-icon-01.webp'),
    iconAssetFullBleed: true,
    accent: 'light',
  }),
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
    iconAsset: uiAssetUrl('apps/food-delivery/platform/brand/baemin-entry-icon-02.webp'),
    iconAssetFullBleed: true,
    accent: 'cool',
    route: FOOD_DELIVERY_ROUTE,
    folderQuery: {
      entry: 'platform',
    },
  }

  const shopEntries = normalizeList(restaurants)
    .map((restaurant, sourceIndex) => ({ restaurant, sourceIndex }))
    .sort((left, right) => {
      const leftRank = FOOD_SHOP_FOLDER_ENTRY_RANK.get(left.restaurant?.id)
      const rightRank = FOOD_SHOP_FOLDER_ENTRY_RANK.get(right.restaurant?.id)
      if (leftRank !== undefined || rightRank !== undefined) {
        return (leftRank ?? Number.MAX_SAFE_INTEGER) - (rightRank ?? Number.MAX_SAFE_INTEGER)
      }
      return left.sourceIndex - right.sourceIndex
    })
    .map(({ restaurant }) => restaurant)
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
