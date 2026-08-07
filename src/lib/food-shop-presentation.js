import { normalizeShopEntryTemplateId } from './app-entry-presentation'

const FOOD_DELIVERY_PUBLIC_ASSET_PREFIX = '/images/ui-assets/apps/food-delivery/'

export const resolveFoodDeliveryAssetUrl = (
  value,
  {
    baseUrl = import.meta.env.BASE_URL || '/',
    origin = typeof window !== 'undefined' ? window.location.origin : '',
  } = {},
) => {
  if (typeof value !== 'string' || !value.trim()) return ''
  const url = value.trim()
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

  if (url.startsWith(FOOD_DELIVERY_PUBLIC_ASSET_PREFIX)) {
    return `${normalizedBaseUrl}${url.slice(1)}`
  }

  if (!origin || !/^https?:\/\//i.test(url)) return url
  try {
    const parsed = new URL(url)
    if (
      parsed.origin !== origin ||
      !parsed.pathname.startsWith(FOOD_DELIVERY_PUBLIC_ASSET_PREFIX)
    ) {
      return url
    }
    return `${normalizedBaseUrl}${parsed.pathname.slice(1)}${parsed.search}${parsed.hash}`
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
