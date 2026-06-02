import { describe, expect, test } from 'vitest'
import {
  ASSET_CATEGORY_ENTRIES,
  ASSET_SOURCE_KEYS,
  FOOD_DELIVERY_SERVICE_PRESETS,
  FOOD_DELIVERY_SOURCE_KEYS,
  LOGISTICS_SERVICE_PRESETS,
  LOGISTICS_SOURCE_KEYS,
  MODULE_RELATIONSHIP_BOUNDARIES,
  SHOPPING_PLATFORM_APP_ENTRIES,
  SHOPPING_SERVICE_PRESETS,
  SHOPPING_SOURCE_KEYS,
  findAssetCategory,
  findFoodDeliveryServicePreset,
  findLogisticsServicePreset,
  findShoppingPlatformApp,
  findShoppingServicePreset,
} from '../src/lib/planned-module-registry'
import {
  FOOD_DELIVERY_PLATFORM_ENTRY_KEY,
  buildFoodDeliveryFolderEntries,
  buildFoodDeliveryShopEntryId,
  buildShoppingFolderEntries,
  buildShoppingShopEntryId,
} from '../src/lib/home-folder-mini-app-entries'
import {
  HOME_FOLDER_REGISTRY,
  HOME_FOLDER_TILE_KIND,
  HOME_PLANNED_LOCKED_TILE_IDS,
  HOME_PLANNED_TILE_IDS,
  resolveHomeFolderChildRoute,
} from '../src/lib/home-entry-registry'

describe('planned module registry', () => {
  test('defines Shopping as the first folder-backed Home module', () => {
    const shoppingFolder = HOME_FOLDER_REGISTRY.app_shopping

    expect(shoppingFolder.kind).toBe(HOME_FOLDER_TILE_KIND)
    expect(shoppingFolder.childEntries).toHaveLength(0)
    const childEntries = buildShoppingFolderEntries()
    expect(childEntries).toHaveLength(SHOPPING_PLATFORM_APP_ENTRIES.length)
    expect(resolveHomeFolderChildRoute(childEntries.find((entry) => entry.key === buildShoppingShopEntryId('nova_digital')))).toEqual({
      path: '/shopping',
      query: {
        service: 'nova_digital',
        category: 'digital',
        entry: 'shop',
        shopEntryId: 'shop_app_shopping_nova_digital',
      },
    })
    expect(resolveHomeFolderChildRoute(childEntries.find((entry) => entry.key === buildShoppingShopEntryId('style_cloud')))).toEqual({
      path: '/shopping',
      query: {
        service: 'style_cloud',
        category: 'fashion',
        entry: 'shop',
        shopEntryId: 'shop_app_shopping_style_cloud',
      },
    })
  })

  test('defines Food Delivery as a folder-backed Home module with Map handoff keys', () => {
    const foodFolder = HOME_FOLDER_REGISTRY.app_food_delivery

    expect(foodFolder.kind).toBe(HOME_FOLDER_TILE_KIND)
    const childEntries = buildFoodDeliveryFolderEntries({
      restaurants: [
        {
          id: 'food_seed_moon_bistro',
          name: 'Moon Bistro',
          cuisine: 'Fusion dinner',
          rating: 4.8,
          deliveryEtaMinutes: 32,
        },
        {
          id: 'food_seed_hidden_shop',
          name: 'Hidden Shop',
          cuisine: 'Hidden',
        },
      ],
      placements: {
        hiddenEntryIds: [buildFoodDeliveryShopEntryId('food_seed_hidden_shop')],
      },
    })
    expect(childEntries.map((entry) => entry.key)).toEqual([
      FOOD_DELIVERY_PLATFORM_ENTRY_KEY,
      buildFoodDeliveryShopEntryId('food_seed_moon_bistro'),
    ])
    expect(resolveHomeFolderChildRoute(childEntries[0])).toEqual({
      path: '/food-delivery',
      query: {
        entry: 'platform',
      },
    })
    expect(resolveHomeFolderChildRoute(childEntries[1])).toEqual({
      path: '/food-delivery',
      query: {
        restaurantId: 'food_seed_moon_bistro',
        entry: 'shop',
        shopEntryId: 'shop_app_food_seed_moon_bistro',
      },
    })
    expect(FOOD_DELIVERY_SOURCE_KEYS.MAP_RESTAURANT_LOCATION).toBe('food_delivery_map_restaurant_location')
    expect(FOOD_DELIVERY_SOURCE_KEYS.MAP_COURIER_ROUTE).toBe('food_delivery_map_courier_route')
  })

  test('keeps World Hub as an optional planned Home entry rather than a locked module', () => {
    expect(HOME_PLANNED_TILE_IDS).toContain('app_control_center')
    expect(HOME_PLANNED_LOCKED_TILE_IDS).not.toContain('app_control_center')
  })

  test('keeps Assets categories and Stock relationship separate', () => {
    expect(findAssetCategory('investment').route).toBe('/assets')
    expect(ASSET_CATEGORY_ENTRIES.map((entry) => entry.key)).toEqual([
      'real_estate',
      'investment',
      'vehicles',
      'special',
    ])
    expect(ASSET_SOURCE_KEYS.STOCK_HOLDINGS_SUMMARY).toBe('assets_stock_holdings_summary')
    expect(MODULE_RELATIONSHIP_BOUNDARIES.find((item) => item.owner === 'stock')?.rule).toContain(
      'should not merge',
    )
  })

  test('reserves stable handoff source keys for future module work', () => {
    expect(SHOPPING_SOURCE_KEYS.CHAT_PRODUCT_CARD).toBe('shopping_chat_product_card')
    expect(SHOPPING_SOURCE_KEYS.CHAT_PROMOTION).toBe('shopping_chat_promotion')
    expect(SHOPPING_SOURCE_KEYS.ASSET_PURCHASE).toBe('shopping_asset_purchase')
    expect(SHOPPING_SOURCE_KEYS.WALLET_EXPENSE).toBe('shopping_wallet_expense')
    expect(SHOPPING_SOURCE_KEYS.CALENDAR_DELIVERY).toBe('shopping_calendar_delivery')
    expect(SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING).toBe('shopping_logistics_tracking')
    expect(ASSET_SOURCE_KEYS.SHOPPING_PURCHASE).toBe('assets_shopping_purchase')
    expect(ASSET_SOURCE_KEYS.MAP_LOCATION_CONTEXT).toBe('assets_map_location_context')
    expect(LOGISTICS_SOURCE_KEYS.CHAT_LOGISTICS_REMINDER).toBe('logistics_chat_reminder')
    expect(FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH).toBe('food_delivery_chat_push')
  })

  test('defines Shopping service presets for platform-like folder immersion', () => {
    expect(SHOPPING_SERVICE_PRESETS.map((entry) => entry.key)).toEqual([
      'schat_mall',
      'style_cloud',
      'nova_digital',
      'daily_fresh',
    ])
    expect(SHOPPING_PLATFORM_APP_ENTRIES.map((entry) => entry.key)).toEqual([
      'schat_mall',
      'style_cloud',
      'nova_digital',
      'daily_fresh',
    ])
    expect(findShoppingPlatformApp('daily_fresh')?.folderQuery).toEqual({
      service: 'daily_fresh',
      category: 'grocery',
    })
    expect(
      buildShoppingFolderEntries({
        placements: {
          hiddenEntryIds: [buildShoppingShopEntryId('daily_fresh')],
        },
      }).map((entry) => entry.key),
    ).toEqual([
      buildShoppingShopEntryId('schat_mall'),
      buildShoppingShopEntryId('style_cloud'),
      buildShoppingShopEntryId('nova_digital'),
    ])
    expect(findShoppingServicePreset('nova_digital')?.key).toBe('nova_digital')
    expect('route' in findShoppingServicePreset('nova_digital')).toBe(false)
    expect(findShoppingServicePreset('unknown')?.key).toBe('schat_mall')
  })

  test('defines Logistics and Food Delivery service presets for Chat service accounts', () => {
    expect(LOGISTICS_SERVICE_PRESETS.map((entry) => entry.key)).toEqual([
      'local_express',
      'standard_courier',
      'international_logistics',
    ])
    expect(FOOD_DELIVERY_SERVICE_PRESETS.map((entry) => entry.key)).toEqual([
      'food_delivery_dispatch',
    ])
    expect(findLogisticsServicePreset('standard_courier')?.key).toBe('standard_courier')
    expect(findFoodDeliveryServicePreset('food_delivery_dispatch')?.key).toBe('food_delivery_dispatch')
  })
})
