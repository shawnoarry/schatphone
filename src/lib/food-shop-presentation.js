import { normalizeShopEntryTemplateId } from './app-entry-presentation'
import { projectAssetUrl } from './project-assets'

const FOOD_DELIVERY_PUBLIC_ASSET_PATH = 'images/ui-assets/apps/food-delivery/'

const localFoodDeliveryAssetPath = (value = '') => {
  const normalized = String(value).replaceAll('\\', '/')
  const markerIndex = normalized.indexOf(FOOD_DELIVERY_PUBLIC_ASSET_PATH)
  if (markerIndex < 0) return ''
  const prefix = normalized.slice(0, markerIndex)
  if (prefix && !prefix.endsWith('/')) return ''
  return normalized.slice(markerIndex).split(/[?#]/, 1)[0]
}

export const resolveFoodDeliveryAssetUrl = (
  value,
  {
    origin = typeof window !== 'undefined' ? window.location.origin : '',
  } = {},
) => {
  if (typeof value !== 'string' || !value.trim()) return ''
  const url = value.trim()
  if (!/^https?:\/\//i.test(url)) {
    const assetPath = localFoodDeliveryAssetPath(url)
    if (!assetPath) return url
    const suffix = url.slice(url.indexOf(assetPath) + assetPath.length)
    return `${projectAssetUrl(assetPath)}${suffix}`
  }

  if (!origin) return url
  try {
    const parsed = new URL(url)
    const assetPath = localFoodDeliveryAssetPath(parsed.pathname)
    if (parsed.origin !== origin || !assetPath) return url
    return `${projectAssetUrl(assetPath)}${parsed.search}${parsed.hash}`
  } catch {
    return url
  }
}

export const FOOD_SHOP_DEFAULT_TEMPLATE_BY_RESTAURANT_ID = Object.freeze({
  food_seed_moon_bistro: 'dark_tray_menu',
  food_seed_peach_cloud: 'dessert_window',
  food_seed_dash_grill: 'quick_service_chain',
  food_seed_jade_hearth: 'jade_table_menu',
  food_seed_verdant_day: 'minimal_light_food',
  food_seed_daylight_cafe: 'daypart_journal',
  food_seed_harbor_roast: 'harbor_roast_chain',
  food_seed_sugar_lane: 'convenience_shelf',
  food_seed_river_noodles: 'street_food_stall',
  food_seed_myeongdong_kyoja: 'standard',
  food_seed_london_bagel_museum: 'standard',
  food_seed_knotted: 'standard',
  food_seed_kyochon_chicken: 'standard',
  food_seed_eggdrop: 'standard',
})

const FOOD_SHOP_DEFAULT_IDENTITY_BY_RESTAURANT_ID = Object.freeze({
  food_seed_jade_hearth: Object.freeze({
    standardNames: Object.freeze(['Jade Hearth', '玉炉雅席']),
    standardDescriptions: Object.freeze([
      'Regional Chinese dishes and shared tables',
      '时令中式桌菜与雅致家宴',
    ]),
    nameZh: '玉炉雅席',
    nameEn: 'Jade Hearth',
    descriptionZh: '时令中式桌菜与雅致家宴',
    descriptionEn: 'Seasonal regional Chinese cooking for shared tables',
  }),
})

export const resolveFoodShopDefaultIdentity = (restaurant = {}) => {
  const identity = FOOD_SHOP_DEFAULT_IDENTITY_BY_RESTAURANT_ID[restaurant?.id]
  const currentName = typeof restaurant?.name === 'string' ? restaurant.name.trim() : ''
  const currentDescription =
    typeof restaurant?.cuisine === 'string' ? restaurant.cuisine.trim() : ''
  if (!identity) {
    return {
      nameZh: currentName,
      nameEn: currentName,
      descriptionZh: currentDescription,
      descriptionEn: currentDescription,
    }
  }

  const usesBuiltInName = !currentName || identity.standardNames.includes(currentName)
  const usesBuiltInDescription =
    !currentDescription || identity.standardDescriptions.includes(currentDescription)
  return {
    nameZh: usesBuiltInName ? identity.nameZh : currentName,
    nameEn: usesBuiltInName ? identity.nameEn : currentName,
    descriptionZh: usesBuiltInDescription ? identity.descriptionZh : currentDescription,
    descriptionEn: usesBuiltInDescription ? identity.descriptionEn : currentDescription,
  }
}

export const resolveFoodShopDefaultTemplateId = (restaurantId) =>
  normalizeShopEntryTemplateId(
    FOOD_SHOP_DEFAULT_TEMPLATE_BY_RESTAURANT_ID[restaurantId] || 'standard',
  )
