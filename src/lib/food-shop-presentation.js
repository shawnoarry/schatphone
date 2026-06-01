import { normalizeShopEntryTemplateId } from './app-entry-presentation'

export const FOOD_SHOP_DEFAULT_TEMPLATE_BY_RESTAURANT_ID = Object.freeze({
  food_seed_moon_bistro: 'dark_tray_menu',
})

export const resolveFoodShopDefaultTemplateId = (restaurantId) =>
  normalizeShopEntryTemplateId(FOOD_SHOP_DEFAULT_TEMPLATE_BY_RESTAURANT_ID[restaurantId] || 'standard')
