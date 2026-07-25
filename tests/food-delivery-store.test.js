import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../src/stores/chat'
import {
  FOOD_DELIVERY_ORDER_EVENT_TYPE,
  FOOD_DELIVERY_ORDER_STATUS,
  useFoodDeliveryStore,
} from '../src/stores/foodDelivery'

describe('food delivery store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('seeds restaurants, menu items, and category summaries', () => {
    const store = useFoodDeliveryStore()

    expect(store.restaurantCount).toBeGreaterThan(0)
    expect(store.menuItemCount).toBeGreaterThan(0)
    expect(store.listRestaurantsByCategory('nearby')[0]?.distanceKm).toBeLessThanOrEqual(
      store.listRestaurantsByCategory('nearby')[1]?.distanceKm || 999,
    )
    expect(
      store.categorySummaries.find((item) => item.key === 'cafe')?.restaurantCount,
    ).toBeGreaterThan(0)
    expect(store.findRestaurantById('food_seed_moon_bistro')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/moon-bistro/cover/',
    )
    expect(store.findMenuItemById('food_menu_moon_rice')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/moon-bistro/dishes/',
    )
    const moonBistroMenu = store.listMenuByRestaurant('food_seed_moon_bistro')
    expect(moonBistroMenu.length).toBeGreaterThanOrEqual(8)
    expect(new Set(moonBistroMenu.map((item) => item.menuSection)).size).toBeGreaterThanOrEqual(5)
    expect(store.findMenuItemById('food_menu_moon_night_tagliatelle')).toMatchObject({
      restaurantId: 'food_seed_moon_bistro',
      menuSection: 'pasta',
    })
    expect(store.findRestaurantById('food_seed_peach_cloud')).toMatchObject({
      name: 'Peach Cloud',
      category: 'dessert',
      rating: 4.9,
    })
    expect(store.findRestaurantById('food_seed_peach_cloud')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/peach-cloud/cover/peach-cloud-hero-01.png',
    )
    const peachCloudMenu = store.listMenuByRestaurant('food_seed_peach_cloud')
    expect(peachCloudMenu).toHaveLength(12)
    expect(new Set(peachCloudMenu.map((item) => item.menuSection))).toEqual(
      new Set(['cloud_tea', 'fruit_sparkle', 'frozen_clouds', 'oven_sweets', 'seasonal_drop']),
    )
    expect(store.findMenuItemById('food_menu_peach_golden_hour_set')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/peach-cloud/products/peach-cloud-item-12.png',
    )
  })

  test('upserts restaurant and menu records with image metadata', () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()

    expect(store.upsertRestaurant({ name: '' })).toBeNull()
    expect(store.upsertMenuItem({ title: 'No restaurant', price: '10.00' })).toBeNull()

    const restaurant = store.upsertRestaurant({
      id: 'food_test_shop',
      name: 'Test Kitchen',
      category: 'restaurants',
      cuisine: 'Testing',
      deliveryFee: '5.00',
      imageSourceType: 'url',
      imageUrl: 'https://example.com/kitchen.png',
    })
    expect(restaurant).toMatchObject({
      id: 'food_test_shop',
      name: 'Test Kitchen',
      deliveryFeeCents: 500,
      image: {
        sourceType: 'url',
        url: 'https://example.com/kitchen.png',
      },
    })

    const menuItem = store.upsertMenuItem({
      id: 'food_test_noodles',
      restaurantId: restaurant.id,
      title: 'Test Noodles',
      price: '28.80',
      desc: 'Original noodles',
      ingredients: 'noodles, broth',
      imageSourceType: 'gallery',
      imageGalleryAssetId: 'gallery_food_cover',
    })
    expect(menuItem).toMatchObject({
      id: 'food_test_noodles',
      restaurantId: restaurant.id,
      priceCents: 2880,
      image: {
        sourceType: 'gallery',
        galleryAssetId: 'gallery_food_cover',
      },
    })

    const editedMenuItem = store.upsertMenuItem({
      id: menuItem.id,
      restaurantId: restaurant.id,
      title: 'Edited Noodles',
      price: menuItem.price,
      desc: 'Richer broth and softer noodles.',
      ingredients: 'noodles, beef, scallion',
      imageSourceType: 'url',
      imageUrl: 'https://example.com/edited-noodles.png',
    })
    expect(editedMenuItem).toMatchObject({
      id: menuItem.id,
      restaurantId: restaurant.id,
      title: 'Edited Noodles',
      desc: 'Richer broth and softer noodles.',
      ingredients: 'noodles, beef, scallion',
      image: {
        sourceType: 'url',
        url: 'https://example.com/edited-noodles.png',
      },
    })
  })

  test('migrates older Moon Bistro local data without overwriting edited menu content', () => {
    localStorage.setItem(
      'schatphone:store:food-delivery',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: {
          restaurants: [
            {
              id: 'food_seed_moon_bistro',
              name: 'Moon Bistro',
              category: 'restaurants',
              deliveryFee: '6.00',
              imageSourceType: 'url',
              imageUrl:
                '/images/ui-assets/apps/food-delivery/moon-bistro/cover/moon-bistro-cover-02.png',
            },
          ],
          menuItems: [
            {
              id: 'food_menu_moon_rice',
              restaurantId: 'food_seed_moon_bistro',
              title: 'User Edited Rice',
              category: 'restaurants',
              price: '58.00',
              imageSourceType: 'url',
              imageUrl:
                '/images/ui-assets/apps/food-delivery/moon-bistro/dishes/moon-bistro-dish-03.png',
            },
            {
              id: 'food_menu_moon_soup',
              restaurantId: 'food_seed_moon_bistro',
              title: 'Signal Soup',
              category: 'restaurants',
              price: '26.00',
              imageSourceType: 'url',
              imageUrl:
                '/images/ui-assets/apps/food-delivery/moon-bistro/dishes/moon-bistro-dish-02.png',
            },
          ],
          cartItems: [],
          orders: [],
        },
      }),
    )
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()
    const moonBistroMenu = store.listMenuByRestaurant('food_seed_moon_bistro')

    expect(store.findMenuItemById('food_menu_moon_rice')).toMatchObject({
      title: 'User Edited Rice',
      menuSection: 'rice_set',
    })
    expect(store.findMenuItemById('food_menu_moon_night_tagliatelle')).toMatchObject({
      restaurantId: 'food_seed_moon_bistro',
      menuSection: 'pasta',
    })
    expect(moonBistroMenu.length).toBeGreaterThanOrEqual(8)
    expect(store.findRestaurantById('food_seed_peach_cloud')?.name).toBe('Peach Cloud')
    expect(store.listMenuByRestaurant('food_seed_peach_cloud')).toHaveLength(12)
  })

  test('refreshes legacy Peach Cloud copy without overwriting user-edited items', () => {
    localStorage.setItem(
      'schatphone:store:food-delivery',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        data: {
          restaurants: [
            {
              id: 'food_seed_peach_cloud',
              name: 'Peach Cloud',
              category: 'dessert',
              deliveryFee: '4.00',
            },
          ],
          menuItems: [
            {
              id: 'food_menu_peach_jasmine_cream',
              restaurantId: 'food_seed_peach_cloud',
              title: 'Jasmine Daydream',
              category: 'dessert',
              menuSection: 'cloud_tea',
              price: '24.00',
              desc: 'Cold-brew jasmine tea finished with a light vanilla cream cap.',
              ingredients: 'jasmine tea, vanilla, cream, cane sugar',
            },
            {
              id: 'food_menu_peach_sunset_fizz',
              restaurantId: 'food_seed_peach_cloud',
              title: 'My Edited Peach Box',
              category: 'dessert',
              menuSection: 'fruit_sparkle',
              price: '30.00',
              desc: 'My own saved description.',
              ingredients: 'custom filling',
            },
          ],
          cartItems: [],
          orders: [],
        },
      }),
    )
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()

    expect(store.findMenuItemById('food_menu_peach_jasmine_cream')).toMatchObject({
      title: 'Cocoa Cloud Brownie',
      menuSection: 'oven_sweets',
      ingredients: 'dark cocoa, butter, roasted nuts, vanilla cream',
    })
    expect(store.findMenuItemById('food_menu_peach_sunset_fizz')).toMatchObject({
      title: 'My Edited Peach Box',
      menuSection: 'fruit_sparkle',
      price: '30.00',
      desc: 'My own saved description.',
    })
    expect(store.listMenuByRestaurant('food_seed_peach_cloud')).toHaveLength(12)
  })

  test('creates single-restaurant cart and local orders', () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()
    const firstRestaurant = store.upsertRestaurant({
      id: 'food_first_shop',
      name: 'First Shop',
      category: 'restaurants',
      deliveryFee: '3.00',
    })
    const secondRestaurant = store.upsertRestaurant({
      id: 'food_second_shop',
      name: 'Second Shop',
      category: 'dessert',
      deliveryFee: '8.00',
    })
    const firstItem = store.upsertMenuItem({
      id: 'food_first_item',
      restaurantId: firstRestaurant.id,
      title: 'First Meal',
      price: '20.00',
    })
    const secondItem = store.upsertMenuItem({
      id: 'food_second_item',
      restaurantId: secondRestaurant.id,
      title: 'Second Cake',
      price: '30.00',
    })

    expect(store.addToCart(firstItem.id, 2)).toMatchObject({
      menuItemId: firstItem.id,
      quantity: 2,
    })
    expect(store.cartQuantity).toBe(2)
    expect(store.cartPrimaryTotal).toEqual({
      currency: 'CNY',
      amountCents: 4300,
      amount: '43.00',
    })

    store.addToCart(secondItem.id)
    expect(store.cartQuantity).toBe(1)
    expect(store.cartLineItems[0]?.restaurant?.id).toBe(secondRestaurant.id)

    const order = store.checkoutCart({
      deliveryAddress: 'Map Pin A',
      note: 'Testing order',
    })
    expect(order).toMatchObject({
      restaurantId: secondRestaurant.id,
      restaurantName: 'Second Shop',
      itemCount: 1,
      totalCents: 3800,
      deliveryAddress: 'Map Pin A',
      status: FOOD_DELIVERY_ORDER_STATUS.PLACED,
    })
    expect(store.cartQuantity).toBe(0)
    expect(store.orderCount).toBe(1)
    expect(store.updateOrderStatus(order.id, FOOD_DELIVERY_ORDER_STATUS.COOKING)).toBe(true)
    expect(store.orders[0]?.status).toBe(FOOD_DELIVERY_ORDER_STATUS.COOKING)
  })

  test('uses the finance primary currency for active food pricing without rewriting historic orders', () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()
    expect(store.setPrimaryCurrency('usd')).toBe('USD')
    const restaurant = store.upsertRestaurant({
      id: 'food_currency_shop',
      name: 'Currency Kitchen',
      category: 'restaurants',
      deliveryFee: '4.00',
    })
    const item = store.upsertMenuItem({
      id: 'food_currency_item',
      restaurantId: restaurant.id,
      title: 'Currency Meal',
      price: '20.00',
    })

    expect(restaurant.currency).toBe('USD')
    expect(item.currency).toBe('USD')
    store.addToCart(item.id)
    expect(store.cartPrimaryTotal).toEqual({
      currency: 'USD',
      amountCents: 2400,
      amount: '24.00',
    })
    const order = store.checkoutCart({ deliveryAddress: 'Currency Address' })
    expect(order).toMatchObject({
      currency: 'USD',
      totalCents: 2400,
      items: [expect.objectContaining({ currency: 'USD' })],
    })

    store.setPrimaryCurrency('eur')
    expect(store.findRestaurantById(restaurant.id).currency).toBe('EUR')
    expect(store.findMenuItemById(item.id).currency).toBe('EUR')
    expect(store.findOrderById(order.id).currency).toBe('USD')
  })

  test('adds normalized order events without moving ownership out of Food Delivery', () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()
    const restaurant = store.upsertRestaurant({
      id: 'food_event_shop',
      name: 'Event Shop',
      category: 'restaurants',
    })
    const item = store.upsertMenuItem({
      id: 'food_event_item',
      restaurantId: restaurant.id,
      title: 'Event Meal',
      price: '21.00',
    })
    store.addToCart(item.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Old Address',
    })

    const etaEvent = store.addOrderEvent(order.id, {
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      summary: 'Rider needs five more minutes.',
      etaMinutes: 35,
      sourceModule: 'food_delivery_dispatch',
    })
    expect(etaEvent).toMatchObject({
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      summary: 'Rider needs five more minutes.',
      etaMinutes: 35,
      sourceModule: 'food_delivery_dispatch',
    })

    const addressEvent = store.addOrderEvent(order.id, {
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ADDRESS_CHANGE,
      deliveryAddress: 'New Address',
    })
    expect(addressEvent?.deliveryAddress).toBe('New Address')
    expect(store.orders[0]?.deliveryAddress).toBe('New Address')

    const cancelledEvent = store.addOrderEvent(order.id, {
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RESTAURANT_CANCELLED,
      summary: 'Restaurant closed early.',
    })
    expect(cancelledEvent?.type).toBe(FOOD_DELIVERY_ORDER_EVENT_TYPE.RESTAURANT_CANCELLED)
    expect(store.orders[0]?.status).toBe(FOOD_DELIVERY_ORDER_STATUS.CANCELLED)
    expect(store.orders[0]?.events).toHaveLength(3)
    expect(store.addOrderEvent(order.id, { type: 'unknown' })).toBeNull()
    expect(
      store.addOrderEvent('missing', { type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY }),
    ).toBeNull()
  })

  test('pushes Food Delivery service notifications while Food Delivery keeps order state', () => {
    const store = useFoodDeliveryStore()
    const chatStore = useChatStore()
    store.resetForTesting()
    const serviceContact = chatStore.addContact({
      name: 'Food Delivery Dispatch',
      kind: 'service',
      role: 'Service account',
      foodDeliveryServiceKey: 'food_delivery_dispatch',
    })
    const restaurant = store.upsertRestaurant({
      id: 'food_service_shop',
      name: 'Service Kitchen',
      category: 'restaurants',
      deliveryFee: '5.00',
    })
    const item = store.upsertMenuItem({
      id: 'food_service_item',
      restaurantId: restaurant.id,
      title: 'Service Meal',
      price: '31.00',
    })
    store.addToCart(item.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Map Pin B',
    })
    const orderNotification = chatStore.findServiceNotificationBySource(
      serviceContact.id,
      'food_delivery_chat_push',
      order.id,
    )
    expect(orderNotification?.blocks[0]).toMatchObject({
      type: 'service_notification',
      kind: 'food_delivery_order',
      sourceModule: 'food_delivery_chat_push',
      sourceId: order.id,
      serviceKey: 'food_delivery_dispatch',
      amount: '36.00 CNY',
    })

    const event = store.addOrderEvent(order.id, {
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      summary: 'ETA changed to 28 minutes.',
      etaMinutes: 28,
    })
    const eventNotification = chatStore.findServiceNotificationBySource(
      serviceContact.id,
      'food_delivery_chat_push',
      order.id,
      event.id,
    )
    expect(eventNotification?.blocks[0]).toMatchObject({
      type: 'service_notification',
      kind: 'food_delivery_update',
      sourceId: order.id,
      sourceEventId: event.id,
      statusLabel: 'ETA updated',
    })
    expect(store.orders[0]).toMatchObject({
      id: order.id,
      status: FOOD_DELIVERY_ORDER_STATUS.PLACED,
      deliveryAddress: 'Map Pin B',
    })
    expect(store.orderCount).toBe(1)
    expect(chatStore.getConversationByContactId(serviceContact.id).unread).toBe(2)
  })

  test('persists and restores backup-compatible snapshots', () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()
    const restaurant = store.upsertRestaurant({
      id: 'food_persist_shop',
      name: 'Persist Shop',
      category: 'restaurants',
    })
    const item = store.upsertMenuItem({
      id: 'food_persist_item',
      restaurantId: restaurant.id,
      title: 'Persist Meal',
      price: '16.00',
    })
    store.addToCart(item.id)
    store.saveNow()

    setActivePinia(createPinia())
    const restoredStore = useFoodDeliveryStore()
    expect(restoredStore.findRestaurantById(restaurant.id)?.name).toBe('Persist Shop')
    expect(restoredStore.cartQuantity).toBe(1)

    const snapshot = {
      foodDelivery: {
        restaurants: [
          {
            id: 'food_backup_shop',
            name: 'Backup Shop',
            category: 'cafe',
          },
        ],
        menuItems: [
          {
            id: 'food_backup_latte',
            restaurantId: 'food_backup_shop',
            title: 'Backup Latte',
            price: '18.00',
            category: 'cafe',
          },
        ],
        cartItems: [{ menuItemId: 'food_backup_latte', quantity: 2 }],
        orders: [
          {
            id: 'food_backup_order',
            restaurantId: 'food_backup_shop',
            restaurantName: 'Backup Shop',
            status: FOOD_DELIVERY_ORDER_STATUS.COOKING,
            items: [
              {
                id: 'food_backup_latte_1',
                menuItemId: 'food_backup_latte',
                title: 'Backup Latte',
                price: '18.00',
                quantity: 1,
              },
            ],
            events: [
              {
                id: 'food_backup_event',
                type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
                summary: 'Rider is delayed.',
              },
            ],
          },
        ],
      },
    }

    expect(restoredStore.restoreFromBackup(snapshot)).toBe(true)
    expect(restoredStore.restaurantCount).toBe(1)
    expect(restoredStore.menuItemCount).toBe(1)
    expect(restoredStore.cartQuantity).toBe(2)
    expect(restoredStore.createBackupSnapshot().restaurants[0]?.id).toBe('food_backup_shop')
    expect(restoredStore.createBackupSnapshot().orders[0]?.events[0]).toMatchObject({
      id: 'food_backup_event',
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
      summary: 'Rider is delayed.',
    })
  })

  test('keeps a persistent single-merchant platform cart separate from restaurant carts', () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()

    store.addPlatformCartItem(
      {
        merchantId: 'platform_shop_one',
        merchantName: 'Platform Shop One',
        itemId: 'platform_shop_one_meal',
        title: 'Platform Meal',
        price: '18.50',
      },
      2,
    )
    store.addPlatformCartItem({
      merchantId: 'platform_shop_one',
      merchantName: 'Platform Shop One',
      itemId: 'platform_shop_one_drink',
      title: 'Platform Drink',
      price: '12.00',
    })

    expect(store.platformCartQuantity).toBe(3)
    expect(store.platformCartPrimaryTotal).toMatchObject({ amount: '49.00', currency: 'CNY' })
    expect(store.cartQuantity).toBe(0)

    expect(store.updatePlatformCartQuantity('platform_shop_one_meal', 1)).toBe(true)
    expect(store.platformCartQuantity).toBe(2)
    expect(store.platformCartPrimaryTotal.amount).toBe('30.50')

    const snapshot = store.createBackupSnapshot()
    expect(snapshot.platformCartItems).toHaveLength(2)

    store.addPlatformCartItem({
      merchantId: 'platform_shop_two',
      merchantName: 'Platform Shop Two',
      itemId: 'platform_shop_two_meal',
      title: 'Another Meal',
      price: '9.00',
    })
    expect(store.platformCartItems).toHaveLength(1)
    expect(store.platformCartItems[0]).toMatchObject({ merchantId: 'platform_shop_two' })

    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.platformCartQuantity).toBe(2)
    expect(store.platformCartPrimaryTotal.amount).toBe('30.50')
  })

  test('checks out a platform cart into an isolated backup-compatible platform order', () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()

    store.addPlatformCartItem(
      {
        merchantId: 'platform_shop_one',
        merchantName: 'Platform Shop One',
        itemId: 'platform_shop_one_meal',
        title: 'Platform Meal',
        price: '18.50',
      },
      2,
    )
    store.addPlatformCartItem({
      merchantId: 'platform_shop_one',
      merchantName: 'Platform Shop One',
      itemId: 'platform_shop_one_drink',
      title: 'Platform Drink',
      price: '12.00',
    })

    const order = store.checkoutPlatformCart({
      deliveryAddress: 'Platform Test Address',
      note: 'Leave at the door',
      paymentMethod: 'pay_on_delivery',
      deliveryFee: '3.00',
      etaMinutes: 28,
    })

    expect(order).toMatchObject({
      merchantId: 'platform_shop_one',
      merchantName: 'Platform Shop One',
      itemCount: 3,
      itemsTotal: '49.00',
      deliveryFee: '3.00',
      total: '52.00',
      currency: 'CNY',
      deliveryAddress: 'Platform Test Address',
      note: 'Leave at the door',
      paymentMethod: 'pay_on_delivery',
      etaMinutes: 28,
      sourceModule: 'food_delivery_platform_checkout',
    })
    expect(store.platformCartQuantity).toBe(0)
    expect(store.platformOrderCount).toBe(1)
    expect(store.orders).toHaveLength(0)

    const snapshot = store.createBackupSnapshot()
    expect(snapshot.platformOrders[0]).toMatchObject({ id: order.id, total: '52.00' })

    store.resetForTesting()
    expect(store.platformOrderCount).toBe(0)
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.findPlatformOrderById(order.id)).toMatchObject({
      merchantId: 'platform_shop_one',
      total: '52.00',
    })
    expect(store.orders).toHaveLength(0)
  })
})
