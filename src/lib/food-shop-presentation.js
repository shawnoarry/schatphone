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

export const resolveFoodShopDefaultTemplateId = (restaurantId) =>
  normalizeShopEntryTemplateId(
    FOOD_SHOP_DEFAULT_TEMPLATE_BY_RESTAURANT_ID[restaurantId] || 'standard',
  )
