import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../src/stores/chat'
import {
  FOOD_DELIVERY_ORDER_EVENT_TYPE,
  FOOD_DELIVERY_ORDER_STATUS,
  useFoodDeliveryStore,
} from '../src/stores/foodDelivery'

const FOOD_DELIVERY_STORAGE_KEY = 'schatphone:store:food-delivery'

const persistLegacyFoodDeliveryState = ({ restaurants = [], menuItems = [] } = {}) => {
  localStorage.setItem(
    FOOD_DELIVERY_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      savedAt: Date.now(),
      data: {
        restaurants,
        menuItems,
        cartItems: [],
        orders: [],
      },
    }),
  )
}

const createCapacityMenuItems = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `food_menu_user_capacity_${String(index).padStart(3, '0')}`,
    restaurantId: 'food_user_capacity_shop',
    title: `User Capacity Dish ${index + 1}`,
    category: 'restaurants',
    menuSection: 'user_menu',
    price: '18.00',
    desc: `User-authored menu record ${index + 1}.`,
    createdAt: index + 1,
    updatedAt: index + 1,
  }))

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

  test('seeds Dash Grill with ten items across six quick-service menu sections', () => {
    const store = useFoodDeliveryStore()
    const dashGrill = store.findRestaurantById('food_seed_dash_grill')
    const dashGrillMenu = store.listMenuByRestaurant('food_seed_dash_grill')

    expect(dashGrill).toMatchObject({
      name: 'Dash Grill',
      category: 'fast_food',
    })
    expect(dashGrillMenu).toHaveLength(10)
    expect(new Set(dashGrillMenu.map((item) => item.menuSection))).toEqual(
      new Set(['featured', 'burgers', 'chicken', 'sides', 'drinks', 'treats']),
    )
  })

  test('seeds Jade Hearth with twelve items across six Chinese table sections', () => {
    const store = useFoodDeliveryStore()
    const jadeHearth = store.findRestaurantById('food_seed_jade_hearth')
    const jadeMenu = store.listMenuByRestaurant('food_seed_jade_hearth')

    expect(jadeHearth).toMatchObject({
      name: 'Jade Hearth',
      category: 'restaurants',
      rating: 4.9,
    })
    expect(jadeHearth?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/jade-hearth/cover/jade-hearth-cover-01.png',
    )
    expect(jadeMenu).toHaveLength(12)
    expect(new Set(jadeMenu.map((item) => item.menuSection))).toEqual(
      new Set([
        'house_table',
        'small_plates',
        'wok_favorites',
        'claypot',
        'rice_noodles',
        'tea_sweets',
      ]),
    )
    expect(store.findMenuItemById('food_menu_jade_sesame_tangyuan')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/jade-hearth/products/jade-hearth-item-12.png',
    )
  })

  test('adds a missing Dash Grill shop and menu to older saves without removing saved records', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_saved_corner_cafe',
          name: 'Saved Corner Cafe',
          category: 'cafe',
          cuisine: 'User saved brunch',
          deliveryFee: '2.50',
        },
      ],
      menuItems: [
        {
          id: 'food_menu_saved_toast',
          restaurantId: 'food_saved_corner_cafe',
          title: 'Saved Toast',
          category: 'cafe',
          menuSection: 'breakfast',
          price: '22.00',
          desc: 'A record that predates Dash Grill.',
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()

    expect(store.findRestaurantById('food_saved_corner_cafe')).toMatchObject({
      name: 'Saved Corner Cafe',
      cuisine: 'User saved brunch',
      deliveryFee: '2.50',
    })
    expect(store.findMenuItemById('food_menu_saved_toast')).toMatchObject({
      title: 'Saved Toast',
      menuSection: 'breakfast',
      desc: 'A record that predates Dash Grill.',
    })
    expect(store.findRestaurantById('food_seed_dash_grill')).toMatchObject({
      name: 'Dash Grill',
      category: 'fast_food',
    })
    expect(store.listMenuByRestaurant('food_seed_dash_grill')).toHaveLength(10)
    expect(store.findRestaurantById('food_seed_jade_hearth')).toMatchObject({
      name: 'Jade Hearth',
      category: 'restaurants',
    })
    expect(store.listMenuByRestaurant('food_seed_jade_hearth')).toHaveLength(12)
  })

  test('preserves a full saved user menu while adding required built-in seed menus', () => {
    const savedMenuItems = createCapacityMenuItems(360)
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_user_capacity_shop',
          name: 'User Capacity Shop',
          category: 'restaurants',
        },
        {
          id: 'food_seed_moon_bistro',
          name: 'Moon Bistro',
          category: 'restaurants',
          cuisine: 'Modern fine dining',
        },
      ],
      menuItems: savedMenuItems,
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()
    const migratedMenuIds = new Set(store.menuItems.map((item) => item.id))

    expect(savedMenuItems.every((item) => migratedMenuIds.has(item.id))).toBe(true)
    expect(store.listMenuByRestaurant('food_seed_moon_bistro')).toHaveLength(9)
    expect(store.listMenuByRestaurant('food_seed_peach_cloud')).toHaveLength(12)
    expect(store.listMenuByRestaurant('food_seed_dash_grill')).toHaveLength(10)
    expect(store.listMenuByRestaurant('food_seed_jade_hearth')).toHaveLength(12)
    expect(store.menuItemCount).toBe(403)

    const migratedSnapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup(migratedSnapshot)).toBe(true)
    expect(new Set(store.menuItems.map((item) => item.id))).toEqual(migratedMenuIds)
  })

  test('keeps explicit backup restore seed-free and bounded to the user menu limit', () => {
    const store = useFoodDeliveryStore()
    const backupMenuItems = createCapacityMenuItems(370)

    expect(
      store.restoreFromBackup({
        foodDelivery: {
          restaurants: [
            {
              id: 'food_user_capacity_shop',
              name: 'User Capacity Shop',
              category: 'restaurants',
            },
          ],
          menuItems: backupMenuItems,
          cartItems: [],
          orders: [],
        },
      }),
    ).toBe(true)

    expect(store.menuItemCount).toBe(360)
    expect(store.findMenuItemById('food_menu_user_capacity_000')).toBeNull()
    expect(store.findMenuItemById('food_menu_user_capacity_369')).toMatchObject({
      title: 'User Capacity Dish 370',
      desc: 'User-authored menu record 370.',
    })
    expect(store.findRestaurantById('food_seed_peach_cloud')).toBeNull()
    expect(store.findRestaurantById('food_seed_dash_grill')).toBeNull()
    expect(store.findRestaurantById('food_seed_jade_hearth')).toBeNull()
  })

  test('preserves same-id Dash Grill edits while filling the rest of its seeded menu', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_seed_dash_grill',
          name: 'Dash Grill Test Kitchen',
          category: 'restaurants',
          cuisine: 'A user-authored tasting menu',
          rating: 4.2,
          deliveryFee: '9.90',
        },
      ],
      menuItems: [
        {
          id: 'food_menu_dash_double_stack',
          restaurantId: 'food_seed_dash_grill',
          title: 'My Double Stack',
          category: 'restaurants',
          menuSection: 'members_only',
          price: '88.00',
          desc: 'A user-edited burger description.',
          ingredients: 'custom patty, custom sauce',
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()
    const dashGrillMenu = store.listMenuByRestaurant('food_seed_dash_grill')

    expect(store.findRestaurantById('food_seed_dash_grill')).toMatchObject({
      name: 'Dash Grill Test Kitchen',
      category: 'restaurants',
      cuisine: 'A user-authored tasting menu',
      rating: 4.2,
      deliveryFee: '9.90',
    })
    expect(store.findMenuItemById('food_menu_dash_double_stack')).toMatchObject({
      title: 'My Double Stack',
      category: 'restaurants',
      menuSection: 'members_only',
      price: '88.00',
      desc: 'A user-edited burger description.',
      ingredients: 'custom patty, custom sauce',
    })
    expect(dashGrillMenu).toHaveLength(10)
    expect(dashGrillMenu.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'food_menu_dash_double_stack',
        'food_menu_dash_golden_chicken_stack',
        'food_menu_dash_choco_sundae',
      ]),
    )
  })

  test('preserves same-id Jade Hearth edits while filling the rest of its seeded menu', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_seed_jade_hearth',
          name: 'My Family Table',
          category: 'restaurants',
          cuisine: 'A user-authored regional menu',
          rating: 4.3,
          deliveryFee: '8.80',
        },
      ],
      menuItems: [
        {
          id: 'food_menu_jade_tea_smoked_chicken',
          restaurantId: 'food_seed_jade_hearth',
          title: 'My Tea Chicken',
          category: 'restaurants',
          menuSection: 'family_recipe',
          price: '108.00',
          desc: 'A user-edited family recipe.',
          ingredients: 'custom tea, custom spice',
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()
    const jadeMenu = store.listMenuByRestaurant('food_seed_jade_hearth')

    expect(store.findRestaurantById('food_seed_jade_hearth')).toMatchObject({
      name: 'My Family Table',
      cuisine: 'A user-authored regional menu',
      rating: 4.3,
      deliveryFee: '8.80',
    })
    expect(store.findMenuItemById('food_menu_jade_tea_smoked_chicken')).toMatchObject({
      title: 'My Tea Chicken',
      menuSection: 'family_recipe',
      price: '108.00',
      desc: 'A user-edited family recipe.',
      ingredients: 'custom tea, custom spice',
    })
    expect(jadeMenu).toHaveLength(12)
    expect(jadeMenu.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'food_menu_jade_tea_smoked_chicken',
        'food_menu_jade_mushroom_claypot',
        'food_menu_jade_sesame_tangyuan',
      ]),
    )
  })

  test('refreshes unchanged Moon Bistro late-night seed copy for fine dining', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_seed_moon_bistro',
          name: 'Moon Bistro',
          category: 'restaurants',
          cuisine: 'Fusion dinner',
          deliveryFee: '6.00',
        },
      ],
      menuItems: [
        {
          id: 'food_menu_moon_rice',
          restaurantId: 'food_seed_moon_bistro',
          title: 'Lunar Rice Set',
          category: 'restaurants',
          price: '58.00',
          desc: 'Grilled slices, warm rice, and crisp pickles for a quiet late-night dinner.',
        },
        {
          id: 'food_menu_moon_soup',
          restaurantId: 'food_seed_moon_bistro',
          title: 'Signal Soup',
          category: 'restaurants',
          price: '26.00',
          desc: 'Creamy mushroom soup with thyme and black pepper, made for slow evenings.',
        },
        {
          id: 'food_menu_moon_night_tagliatelle',
          restaurantId: 'food_seed_moon_bistro',
          title: 'Night Tagliatelle',
          category: 'restaurants',
          price: '52.00',
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()

    expect(store.findRestaurantById('food_seed_moon_bistro')?.cuisine).toBe('Modern fine dining')
    expect(store.findMenuItemById('food_menu_moon_rice')?.desc).toBe(
      'Grilled slices, warm rice, and crisp pickles, composed as a balanced signature set.',
    )
    expect(store.findMenuItemById('food_menu_moon_soup')?.desc).toBe(
      'Creamy mushroom soup with thyme and black pepper, finished with cultured cream.',
    )
    expect(store.findMenuItemById('food_menu_moon_night_tagliatelle')?.title).toBe(
      'Truffle Tagliatelle',
    )
  })

  test('keeps user-authored Moon Bistro positioning and menu copy during seed migration', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_seed_moon_bistro',
          name: 'Moon Bistro',
          category: 'restaurants',
          cuisine: 'Chef tasting room',
          deliveryFee: '6.00',
        },
      ],
      menuItems: [
        {
          id: 'food_menu_moon_rice',
          restaurantId: 'food_seed_moon_bistro',
          title: 'Lunar Rice Set',
          category: 'restaurants',
          menuSection: 'private_menu',
          price: '68.00',
          desc: 'A user-authored rice course.',
          ingredients: 'custom rice, seasonal garnish',
        },
        {
          id: 'food_menu_moon_night_tagliatelle',
          restaurantId: 'food_seed_moon_bistro',
          title: 'Family Tagliatelle',
          category: 'restaurants',
          menuSection: 'house_pasta',
          price: '62.00',
          desc: 'A user-authored pasta course.',
          ingredients: 'fresh pasta, family sauce',
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()

    expect(store.findRestaurantById('food_seed_moon_bistro')?.cuisine).toBe('Chef tasting room')
    expect(store.findMenuItemById('food_menu_moon_rice')).toMatchObject({
      title: 'Lunar Rice Set',
      menuSection: 'private_menu',
      price: '68.00',
      desc: 'A user-authored rice course.',
      ingredients: 'custom rice, seasonal garnish',
    })
    expect(store.findMenuItemById('food_menu_moon_night_tagliatelle')).toMatchObject({
      title: 'Family Tagliatelle',
      menuSection: 'house_pasta',
      price: '62.00',
      desc: 'A user-authored pasta course.',
      ingredients: 'fresh pasta, family sauce',
    })
    expect(store.listMenuByRestaurant('food_seed_moon_bistro').length).toBeGreaterThanOrEqual(8)
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
