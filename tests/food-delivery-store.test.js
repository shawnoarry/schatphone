import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
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
    expect(store.categorySummaries.find((item) => item.key === 'cafe')?.restaurantCount).toBeGreaterThan(0)
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
        orders: [],
      },
    }

    expect(restoredStore.restoreFromBackup(snapshot)).toBe(true)
    expect(restoredStore.restaurantCount).toBe(1)
    expect(restoredStore.menuItemCount).toBe(1)
    expect(restoredStore.cartQuantity).toBe(2)
    expect(restoredStore.createBackupSnapshot().restaurants[0]?.id).toBe('food_backup_shop')
  })
})
