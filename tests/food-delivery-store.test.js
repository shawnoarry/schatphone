import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../src/stores/chat'
import { useMapStore } from '../src/stores/map'
import { useWalletStore } from '../src/stores/wallet'
import {
  FOOD_DELIVERY_ORDER_EVENT_TYPE,
  FOOD_DELIVERY_ORDER_STATUS,
  useFoodDeliveryStore,
} from '../src/stores/foodDelivery'
import { projectUiAssetUrl } from '../src/lib/project-assets'

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
    expect(peachCloudMenu).toHaveLength(17)
    expect(new Set(peachCloudMenu.map((item) => item.menuSection))).toEqual(
      new Set(['cloud_tea', 'fruit_sparkle', 'frozen_clouds', 'oven_sweets', 'seasonal_drop']),
    )
    expect(peachCloudMenu.filter((item) => item.menuSection === 'fruit_sparkle')).toHaveLength(5)
    expect(peachCloudMenu.filter((item) => item.menuSection === 'cloud_tea')).toHaveLength(3)
    expect(peachCloudMenu.filter((item) => item.menuSection === 'frozen_clouds')).toHaveLength(4)
    expect(peachCloudMenu.filter((item) => item.menuSection === 'oven_sweets')).toHaveLength(2)
    expect(peachCloudMenu.filter((item) => item.menuSection === 'seasonal_drop')).toHaveLength(3)
    expect(store.findMenuItemById('food_menu_peach_grape_jasmine_tea')).toMatchObject({
      title: 'Green Grape Jasmine Fruit Tea',
      menuSection: 'fruit_sparkle',
      price: '28.00',
    })
    expect(store.findMenuItemById('food_menu_peach_grape_jasmine_tea')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/peach-cloud/products/peach-cloud-item-13.png',
    )
    expect(store.findMenuItemById('food_menu_peach_osmanthus_pear_warm')).toMatchObject({
      title: 'Osmanthus Pear Warm Infusion',
      menuSection: 'seasonal_drop',
      price: '27.00',
    })
    expect(store.findMenuItemById('food_menu_peach_osmanthus_pear_warm')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/peach-cloud/products/peach-cloud-item-17.png',
    )
    expect(store.findMenuItemById('food_menu_peach_golden_hour_set')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/peach-cloud/products/peach-cloud-item-12.png',
    )
  })

  test('seeds River Noodles, Daylight Cafe, and Sugar Lane with complete distinct menus', () => {
    const store = useFoodDeliveryStore()
    const riverMenu = store.listMenuByRestaurant('food_seed_river_noodles')
    const daylightMenu = store.listMenuByRestaurant('food_seed_daylight_cafe')
    const sugarMenu = store.listMenuByRestaurant('food_seed_sugar_lane')

    expect(store.findRestaurantById('food_seed_river_noodles')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/river-noodles/cover/river-noodles-cover-01.png',
    )
    expect(riverMenu).toHaveLength(9)
    expect(new Set(riverMenu.map((item) => item.menuSection))).toEqual(
      new Set(['broth_noodles', 'dry_noodles', 'noodle_sides', 'coolers']),
    )
    expect(store.findMenuItemById('food_menu_river_pickled_fish')).toMatchObject({
      title: 'Pickled Mustard Fish Noodles',
      ingredients: expect.stringContaining('pickled mustard greens'),
    })
    expect(store.findMenuItemById('food_menu_river_plum_cooler')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/river-noodles/products/river-noodles-item-09.png',
    )

    expect(store.findRestaurantById('food_seed_daylight_cafe')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/daylight-cafe/cover/daylight-cafe-cover-01.png',
    )
    expect(daylightMenu).toHaveLength(9)
    expect(new Set(daylightMenu.map((item) => item.menuSection))).toEqual(
      new Set(['espresso_bar', 'brunch_plates', 'bakery', 'cold_drinks']),
    )
    expect(store.findMenuItemById('food_menu_daylight_egg_croissant')).toMatchObject({
      title: 'Sunrise Egg Croissant',
      ingredients: expect.stringContaining('cheddar'),
    })
    expect(store.findMenuItemById('food_menu_daylight_vanilla_cold_brew')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/daylight-cafe/products/daylight-cafe-item-09.png',
    )

    expect(store.findRestaurantById('food_seed_sugar_lane')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/sugar-lane/cover/sugar-lane-cover-01.png',
    )
    expect(sugarMenu).toHaveLength(9)
    expect(new Set(sugarMenu.map((item) => item.menuSection))).toEqual(
      new Set(['layer_cakes', 'pastry_case', 'chilled_sweets', 'sweet_drinks']),
    )
    expect(store.findMenuItemById('food_menu_sugar_cake')).toMatchObject({
      title: 'Tiny Moon Cake',
      ingredients: expect.stringContaining('pear compote'),
    })
    expect(store.findMenuItemById('food_menu_sugar_cocoa_cloud_milk')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/sugar-lane/products/sugar-lane-item-09.png',
    )
  })

  test('seeds Harbor Roast with a drinks-first coffee-chain menu and stable asset paths', () => {
    const store = useFoodDeliveryStore()
    const harborRoast = store.findRestaurantById('food_seed_harbor_roast')
    const harborMenu = store.listMenuByRestaurant('food_seed_harbor_roast')

    expect(harborRoast).toMatchObject({
      name: 'Harbor Roast',
      category: 'cafe',
      rating: 4.8,
    })
    expect(harborRoast?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/harbor-roast/cover/harbor-roast-cover-01.png',
    )
    expect(harborMenu).toHaveLength(13)
    expect(new Set(harborMenu.map((item) => item.menuSection))).toEqual(
      new Set([
        'espresso_classics',
        'harbor_signatures',
        'cold_blended',
        'tea_counter_bakes',
        'harbor_collaboration',
      ]),
    )
    expect(harborMenu.filter((item) => item.menuSection !== 'tea_counter_bakes')).toHaveLength(10)
    expect(store.findMenuItemById('food_menu_harbor_sea_salt_caramel_latte')).toMatchObject({
      title: 'Sea-Salt Caramel Latte',
      ingredients: expect.stringContaining('sea salt'),
    })
    expect(store.findMenuItemById('food_menu_harbor_almond_butter_croissant')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/harbor-roast/products/harbor-roast-item-12.png',
    )
    expect(store.findMenuItemById('food_menu_harbor_pompompurin_dockside_set')).toMatchObject({
      title: 'Pompompurin Dockside Custard Set',
      menuSection: 'harbor_collaboration',
      price: '48.00',
      image: {
        url: expect.stringContaining(
          '/images/ui-assets/apps/food-delivery/harbor-roast/products/harbor-roast-item-13.png',
        ),
      },
    })
  })

  test('adds Harbor Roast to older saves while preserving same-id user edits', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_saved_corner_cafe',
          name: 'Saved Corner Cafe',
          category: 'cafe',
        },
        {
          id: 'food_seed_harbor_roast',
          name: 'My Harbor Counter',
          category: 'cafe',
          cuisine: 'My saved coffee concept',
        },
      ],
      menuItems: [
        {
          id: 'food_menu_harbor_house_americano',
          restaurantId: 'food_seed_harbor_roast',
          title: 'My Saved Americano',
          category: 'cafe',
          menuSection: 'owners_coffee',
          price: '88.00',
          desc: 'My saved coffee recipe.',
          imageSourceType: 'url',
          imageUrl: 'https://example.com/my-saved-americano.png',
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()

    expect(store.findRestaurantById('food_seed_harbor_roast')).toMatchObject({
      name: 'My Harbor Counter',
      category: 'cafe',
      cuisine: 'My saved coffee concept',
    })
    expect(store.findRestaurantById('food_saved_corner_cafe')).toMatchObject({
      name: 'Saved Corner Cafe',
    })
    expect(store.listMenuByRestaurant('food_seed_harbor_roast')).toHaveLength(13)
    expect(store.findMenuItemById('food_menu_harbor_house_americano')).toMatchObject({
      restaurantId: 'food_seed_harbor_roast',
      title: 'My Saved Americano',
      menuSection: 'owners_coffee',
      price: '88.00',
      desc: 'My saved coffee recipe.',
      image: { url: 'https://example.com/my-saved-americano.png' },
    })
  })

  test('migrates the three known remote seed images without replacing custom URLs', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_seed_river_noodles',
          name: 'River Noodles',
          category: 'fast_food',
          imageSourceType: 'url',
          imageUrl:
            'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
        },
        {
          id: 'food_seed_daylight_cafe',
          name: 'Daylight Cafe',
          category: 'cafe',
          imageSourceType: 'url',
          imageUrl:
            'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
        },
        {
          id: 'food_seed_sugar_lane',
          name: 'Sugar Lane',
          category: 'dessert',
          imageSourceType: 'url',
          imageUrl: 'https://example.com/my-sugar-lane-cover.png',
        },
      ],
      menuItems: [
        {
          id: 'food_menu_river_noodles',
          restaurantId: 'food_seed_river_noodles',
          title: 'River Beef Noodles',
          category: 'fast_food',
          price: '36.00',
          imageSourceType: 'url',
          imageUrl:
            'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80',
        },
        {
          id: 'food_menu_cafe_latte',
          restaurantId: 'food_seed_daylight_cafe',
          title: 'Daylight Latte',
          category: 'cafe',
          price: '22.00',
          imageSourceType: 'url',
          imageUrl:
            'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80',
        },
        {
          id: 'food_menu_sugar_cake',
          restaurantId: 'food_seed_sugar_lane',
          title: 'Tiny Moon Cake',
          category: 'dessert',
          price: '32.00',
          desc: 'Small dessert with a sweet moonlit finish.',
          ingredients: 'cake, cream, sugar',
          imageSourceType: 'url',
          imageUrl:
            'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=80',
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()

    expect(store.findRestaurantById('food_seed_river_noodles')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/river-noodles/cover/river-noodles-cover-01.png',
    )
    expect(store.findRestaurantById('food_seed_daylight_cafe')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/daylight-cafe/cover/daylight-cafe-cover-01.png',
    )
    expect(store.findMenuItemById('food_menu_river_noodles')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/river-noodles/products/river-noodles-item-01.png',
    )
    expect(store.findMenuItemById('food_menu_cafe_latte')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/daylight-cafe/products/daylight-cafe-item-01.png',
    )
    expect(store.findMenuItemById('food_menu_sugar_cake')).toMatchObject({
      desc: expect.stringContaining('pear compote'),
      ingredients: expect.stringContaining('vanilla mousse'),
    })
    expect(store.findMenuItemById('food_menu_sugar_cake')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/sugar-lane/products/sugar-lane-item-01.png',
    )
    expect(store.findRestaurantById('food_seed_sugar_lane')?.image.url).toBe(
      'https://example.com/my-sugar-lane-cover.png',
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

  test('seeds Verdant Day with twelve items across five light-food menu sections', () => {
    const store = useFoodDeliveryStore()
    const verdantDay = store.findRestaurantById('food_seed_verdant_day')
    const verdantMenu = store.listMenuByRestaurant('food_seed_verdant_day')

    expect(verdantDay).toMatchObject({
      name: 'Verdant Day',
      category: 'restaurants',
      rating: 4.8,
    })
    expect(verdantDay?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/verdant-day/cover/verdant-day-cover-01.png',
    )
    expect(verdantMenu).toHaveLength(12)
    expect(new Set(verdantMenu.map((item) => item.menuSection))).toEqual(
      new Set(['salads', 'warm_bowls', 'wraps_toasts', 'drinks', 'small_sweets']),
    )
    expect(store.findMenuItemById('food_menu_verdant_citrus_loaf')?.image.url).toContain(
      '/images/ui-assets/apps/food-delivery/verdant-day/products/verdant-day-item-12.png',
    )
  })

  test('seeds five real Seoul shops with independent original four-item menus', () => {
    const store = useFoodDeliveryStore()
    const expectedShops = [
      {
        id: 'food_seed_myeongdong_kyoja',
        name: 'Myeongdong Kyoja',
        sourceId: 'seoul-myeongdong-kyoja-main',
        titles: [
          'Pine Broth Knife Noodles',
          'Sesame Dumpling Basket',
          'Chili Buckwheat Ribbons',
          'Scallion Rice Pocket',
        ],
      },
      {
        id: 'food_seed_london_bagel_museum',
        name: 'London Bagel Museum',
        sourceId: 'seoul-london-bagel-museum-anguk',
        titles: [
          'Rosemary Cloud Bagel',
          'Orchard Picnic Stack',
          'Tomato Marmalade Bagel',
          'Earl Grey Oat Cup',
        ],
      },
      {
        id: 'food_seed_knotted',
        name: 'Knotted',
        sourceId: 'seoul-knotted-cheongdam',
        titles: [
          'Peach Ribbon Ring',
          'Black Sesame Pillow',
          'Lemon Milk Cloud',
          'Strawberry Soda Float',
        ],
      },
      {
        id: 'food_seed_kyochon_chicken',
        name: 'Kyochon Chicken',
        sourceId: 'seoul-kyochon-chicken-yeoksam-1',
        titles: [
          'Garlic Glaze Wings',
          'Plum Pepper Tenders',
          'Perilla Crunch Cup',
          'Citrus Barley Fizz',
        ],
      },
      {
        id: 'food_seed_eggdrop',
        name: 'EGGDROP',
        sourceId: 'seoul-eggdrop-gangnam-woosung',
        titles: [
          'Sunrise Corn Fold',
          'Mushroom Morning Fold',
          'Tomato Basil Pocket',
          'Honey Oat Cold Brew',
        ],
      },
    ]

    expectedShops.forEach(({ id, name, sourceId, titles }) => {
      expect(store.findRestaurantById(id)).toMatchObject({ name, sourceId })
      const menu = store.listMenuByRestaurant(id)
      expect(menu).toHaveLength(4)
      expect(new Set(menu.map((item) => item.title))).toEqual(new Set(titles))
      expect(menu.every((item) => item.sourceModule === 'seed')).toBe(true)
      expect(menu.every((item) => item.image.url.includes('/images/ui-assets/'))).toBe(true)
    })
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
    expect(store.findRestaurantById('food_seed_river_noodles')).toMatchObject({
      name: 'River Noodles',
      category: 'fast_food',
    })
    expect(store.listMenuByRestaurant('food_seed_river_noodles')).toHaveLength(9)
    expect(store.findRestaurantById('food_seed_daylight_cafe')).toMatchObject({
      name: 'Daylight Cafe',
      category: 'cafe',
    })
    expect(store.listMenuByRestaurant('food_seed_daylight_cafe')).toHaveLength(9)
    expect(store.findRestaurantById('food_seed_sugar_lane')).toMatchObject({
      name: 'Sugar Lane',
      category: 'dessert',
    })
    expect(store.listMenuByRestaurant('food_seed_sugar_lane')).toHaveLength(9)
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
    expect(store.findRestaurantById('food_seed_verdant_day')).toMatchObject({
      name: 'Verdant Day',
      category: 'restaurants',
    })
    expect(store.listMenuByRestaurant('food_seed_verdant_day')).toHaveLength(12)
    expect(store.listMenuByRestaurant('food_seed_myeongdong_kyoja')).toHaveLength(4)
    expect(store.listMenuByRestaurant('food_seed_london_bagel_museum')).toHaveLength(4)
    expect(store.listMenuByRestaurant('food_seed_knotted')).toHaveLength(4)
    expect(store.listMenuByRestaurant('food_seed_kyochon_chicken')).toHaveLength(4)
    expect(store.listMenuByRestaurant('food_seed_eggdrop')).toHaveLength(4)
  })

  test('preserves same-id edits while filling the three newly expanded shop menus', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        { id: 'food_seed_river_noodles', name: 'My River Kitchen', category: 'fast_food' },
        { id: 'food_seed_daylight_cafe', name: 'My Daylight Counter', category: 'cafe' },
        { id: 'food_seed_sugar_lane', name: 'My Sugar Studio', category: 'dessert' },
      ],
      menuItems: [
        {
          id: 'food_menu_river_noodles',
          restaurantId: 'food_seed_river_noodles',
          title: 'My River Bowl',
          category: 'fast_food',
          menuSection: 'family_noodles',
          price: '88.00',
          desc: 'My saved beef noodle copy.',
          ingredients: 'custom noodles, custom beef',
          imageSourceType: 'url',
          imageUrl: 'https://example.com/my-river-bowl.png',
        },
        {
          id: 'food_menu_cafe_latte',
          restaurantId: 'food_seed_daylight_cafe',
          title: 'My Morning Coffee',
          category: 'cafe',
          menuSection: 'owners_coffee',
          price: '66.00',
          desc: 'My saved latte copy.',
          ingredients: 'custom coffee, custom milk',
        },
        {
          id: 'food_menu_sugar_cake',
          restaurantId: 'food_seed_sugar_lane',
          title: 'My Little Cake',
          category: 'dessert',
          menuSection: 'owners_cakes',
          price: '77.00',
          desc: 'My saved cake copy.',
          ingredients: 'custom cake, custom cream',
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()

    expect(store.findMenuItemById('food_menu_river_noodles')).toMatchObject({
      title: 'My River Bowl',
      menuSection: 'family_noodles',
      price: '88.00',
      desc: 'My saved beef noodle copy.',
      ingredients: 'custom noodles, custom beef',
      image: { url: 'https://example.com/my-river-bowl.png' },
    })
    expect(store.findMenuItemById('food_menu_cafe_latte')).toMatchObject({
      title: 'My Morning Coffee',
      menuSection: 'owners_coffee',
      price: '66.00',
      desc: 'My saved latte copy.',
    })
    expect(store.findMenuItemById('food_menu_sugar_cake')).toMatchObject({
      title: 'My Little Cake',
      menuSection: 'owners_cakes',
      price: '77.00',
      desc: 'My saved cake copy.',
    })
    expect(store.listMenuByRestaurant('food_seed_river_noodles')).toHaveLength(9)
    expect(store.listMenuByRestaurant('food_seed_daylight_cafe')).toHaveLength(9)
    expect(store.listMenuByRestaurant('food_seed_sugar_lane')).toHaveLength(9)
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
    expect(store.listMenuByRestaurant('food_seed_peach_cloud')).toHaveLength(17)
    expect(store.listMenuByRestaurant('food_seed_dash_grill')).toHaveLength(10)
    expect(store.listMenuByRestaurant('food_seed_jade_hearth')).toHaveLength(12)
    expect(store.listMenuByRestaurant('food_seed_verdant_day')).toHaveLength(12)
    expect(store.listMenuByRestaurant('food_seed_harbor_roast')).toHaveLength(13)
    expect(store.menuItemCount).toBe(480)

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
    expect(store.findRestaurantById('food_seed_river_noodles')).toBeNull()
    expect(store.findRestaurantById('food_seed_daylight_cafe')).toBeNull()
    expect(store.findRestaurantById('food_seed_sugar_lane')).toBeNull()
    expect(store.findRestaurantById('food_seed_dash_grill')).toBeNull()
    expect(store.findRestaurantById('food_seed_jade_hearth')).toBeNull()
    expect(store.findRestaurantById('food_seed_verdant_day')).toBeNull()
    expect(store.findRestaurantById('food_seed_myeongdong_kyoja')).toBeNull()
    expect(store.findRestaurantById('food_seed_london_bagel_museum')).toBeNull()
    expect(store.findRestaurantById('food_seed_knotted')).toBeNull()
    expect(store.findRestaurantById('food_seed_kyochon_chicken')).toBeNull()
    expect(store.findRestaurantById('food_seed_eggdrop')).toBeNull()
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

  test('migrates only the exact legacy Dash combo copy to the complete-meal contract', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_seed_dash_grill',
          name: 'Dash Grill',
          category: 'fast_food',
        },
      ],
      menuItems: [
        {
          id: 'food_menu_dash_double_stack',
          restaurantId: 'food_seed_dash_grill',
          title: 'Dash Double Stack',
          category: 'fast_food',
          menuSection: 'featured',
          price: '39.00',
          desc: 'Two seared beef patties, cheddar, pickles, onion, and house dash sauce.',
          ingredients: 'beef, cheddar, pickles, onion, sesame bun, dash sauce',
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()
    expect(store.findMenuItemById('food_menu_dash_double_stack')).toMatchObject({
      title: 'Dash Double Stack Combo',
      desc: expect.stringContaining('choice of fries and a drink'),
      ingredients: expect.stringContaining('choice of fries'),
    })
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

  test('preserves same-id Verdant Day edits while filling the rest of its seeded menu', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_seed_verdant_day',
          name: 'Verdant Test Kitchen',
          category: 'cafe',
          cuisine: 'A user-authored light menu',
          rating: 4.4,
          deliveryFee: '7.20',
        },
      ],
      menuItems: [
        {
          id: 'food_menu_verdant_aegean_garden',
          restaurantId: 'food_seed_verdant_day',
          title: 'My Garden Plate',
          category: 'cafe',
          menuSection: 'daily_special',
          price: '66.00',
          desc: 'A user-edited garden plate.',
          ingredients: 'custom greens, custom dressing',
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()
    const verdantMenu = store.listMenuByRestaurant('food_seed_verdant_day')

    expect(store.findRestaurantById('food_seed_verdant_day')).toMatchObject({
      name: 'Verdant Test Kitchen',
      category: 'cafe',
      cuisine: 'A user-authored light menu',
      rating: 4.4,
      deliveryFee: '7.20',
    })
    expect(store.findMenuItemById('food_menu_verdant_aegean_garden')).toMatchObject({
      title: 'My Garden Plate',
      category: 'cafe',
      menuSection: 'daily_special',
      price: '66.00',
      desc: 'A user-edited garden plate.',
      ingredients: 'custom greens, custom dressing',
    })
    expect(verdantMenu).toHaveLength(12)
    expect(verdantMenu.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'food_menu_verdant_aegean_garden',
        'food_menu_verdant_golden_grain',
        'food_menu_verdant_citrus_loaf',
      ]),
    )
  })

  test('migrates legacy Verdant Day built-in image paths to the project image bed', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_seed_verdant_day',
          name: 'Verdant Day',
          category: 'restaurants',
          imageSourceType: 'url',
          imageUrl:
            '/images/ui-assets/apps/food-delivery/verdant-day/cover/verdant-day-cover-01.png',
        },
      ],
      menuItems: [
        {
          id: 'food_menu_verdant_aegean_garden',
          restaurantId: 'food_seed_verdant_day',
          title: 'Aegean Garden Salad',
          category: 'restaurants',
          menuSection: 'salads',
          price: '34.00',
          imageSourceType: 'url',
          imageUrl: `${window.location.origin}/images/ui-assets/apps/food-delivery/verdant-day/products/verdant-day-item-01.png`,
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()
    expect(store.findRestaurantById('food_seed_verdant_day')?.image.url).toBe(
      projectUiAssetUrl(
        'apps/food-delivery/verdant-day/cover/verdant-day-cover-01.png',
      ),
    )
    expect(store.findMenuItemById('food_menu_verdant_aegean_garden')?.image.url).toBe(
      projectUiAssetUrl(
        'apps/food-delivery/verdant-day/products/verdant-day-item-01.png',
      ),
    )
  })

  test('preserves user-selected images while applying Verdant Day seed migrations', () => {
    persistLegacyFoodDeliveryState({
      restaurants: [
        {
          id: 'food_seed_verdant_day',
          name: 'Verdant Day',
          category: 'restaurants',
          imageSourceType: 'url',
          imageUrl: 'https://example.com/my-verdant-cover.png',
        },
      ],
      menuItems: [
        {
          id: 'food_menu_verdant_aegean_garden',
          restaurantId: 'food_seed_verdant_day',
          title: 'Aegean Garden Salad',
          category: 'restaurants',
          menuSection: 'salads',
          price: '34.00',
          imageSourceType: 'url',
          imageUrl: 'https://example.com/my-garden-salad.png',
        },
        {
          id: 'food_menu_verdant_golden_grain',
          restaurantId: 'food_seed_verdant_day',
          title: 'Golden Grain Bowl',
          category: 'restaurants',
          menuSection: 'warm_bowls',
          price: '42.00',
          imageSourceType: 'gallery',
          imageGalleryAssetId: 'gallery_custom_golden_grain',
        },
        {
          id: 'food_menu_verdant_avocado_herb_fold',
          restaurantId: 'food_seed_verdant_day',
          title: 'Avocado Herb Fold',
          category: 'restaurants',
          menuSection: 'wraps_toasts',
          price: '32.00',
          imageSourceType: 'url',
          imageUrl:
            '/images/ui-assets/apps/food-delivery/verdant-day/products/custom-edited-wrap.png',
        },
      ],
    })
    setActivePinia(createPinia())

    const store = useFoodDeliveryStore()

    expect(store.findRestaurantById('food_seed_verdant_day')?.image.url).toBe(
      'https://example.com/my-verdant-cover.png',
    )
    expect(store.findMenuItemById('food_menu_verdant_aegean_garden')?.image.url).toBe(
      'https://example.com/my-garden-salad.png',
    )
    expect(store.findMenuItemById('food_menu_verdant_golden_grain')?.image).toMatchObject({
      sourceType: 'gallery',
      galleryAssetId: 'gallery_custom_golden_grain',
    })
    expect(store.findMenuItemById('food_menu_verdant_avocado_herb_fold')?.image.url).toBe(
      '/images/ui-assets/apps/food-delivery/verdant-day/products/custom-edited-wrap.png',
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

  test('inherits a restaurant source currency when the display currency differs', () => {
    const walletStore = useWalletStore()
    walletStore.setPrimaryCurrency('EUR')
    const store = useFoodDeliveryStore()
    store.resetForTesting()
    store.setPrimaryCurrency('EUR')
    const restaurant = store.upsertRestaurant({
      id: 'food_source_currency_shop',
      name: 'Source Currency Kitchen',
      category: 'restaurants',
      currency: 'CNY',
    })

    const menuItem = store.upsertMenuItem({
      id: 'food_source_currency_item',
      restaurantId: restaurant.id,
      title: 'Source Currency Meal',
      price: '20.00',
    })
    const storedMenuItem = store.menuItems.find((item) => item.id === menuItem.id)

    expect(storedMenuItem).toMatchObject({
      priceCents: 2000,
      currency: 'CNY',
    })
    expect(menuItem).toMatchObject({
      sourcePriceCents: 2000,
      sourceCurrency: 'CNY',
      currency: 'EUR',
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
    expect(store.listMenuByRestaurant('food_seed_peach_cloud')).toHaveLength(17)
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
              menuSection: 'chef_notes',
              price: '24.00',
              desc: 'My saved cocoa and peach description.',
              ingredients: 'my custom cocoa blend',
              imageSourceType: 'url',
              imageUrl: 'https://example.com/my-peach-brownie.png',
              imageAlt: 'My custom Peach Cloud brownie photo',
            },
            {
              id: 'food_menu_peach_oolong_cloud',
              restaurantId: 'food_seed_peach_cloud',
              title: 'Peach Oolong Cloud',
              category: 'dessert',
              menuSection: 'cloud_tea',
              price: '26.00',
              desc: 'Fragrant oolong, white peach, and a soft salted milk cloud.',
              ingredients: 'oolong tea, white peach, milk foam, sea salt',
              imageSourceType: 'url',
              imageUrl:
                '/images/ui-assets/apps/food-delivery/peach-cloud/products/peach-cloud-item-01.png',
              imageAlt: 'Peach Oolong Cloud drink',
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
            {
              id: 'food_menu_peach_matcha_float',
              restaurantId: 'food_seed_peach_cloud',
              title: 'Peach Cold Brew Tonic',
              category: 'dessert',
              menuSection: 'fruit_sparkle',
              price: '31.00',
              desc: 'Cold brew, white peach tonic, and a light cream cloud.',
              ingredients: 'cold brew, white peach tonic, cream cloud',
              imageSourceType: 'url',
              imageUrl:
                '/images/ui-assets/apps/food-delivery/peach-cloud/products/peach-cloud-item-08.png',
              imageAlt: 'Peach Cold Brew Tonic',
            },
            {
              id: 'food_menu_peach_grape_jasmine_tea',
              restaurantId: 'food_seed_peach_cloud',
              title: 'My Saved Grape Tea',
              category: 'dessert',
              menuSection: 'fruit_sparkle',
              price: '99.00',
              desc: 'My own grape recipe.',
              ingredients: 'private grape blend',
              imageSourceType: 'url',
              imageUrl: 'https://example.com/my-grape-tea.png',
              imageAlt: 'My saved grape tea photo',
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
      title: 'Peach Cocoa Brownie',
      menuSection: 'chef_notes',
      desc: 'My saved cocoa and peach description.',
      ingredients: 'my custom cocoa blend',
      image: {
        alt: 'My custom Peach Cloud brownie photo',
      },
    })
    expect(store.findMenuItemById('food_menu_peach_oolong_cloud')).toMatchObject({
      title: 'White Peach Lime Sparkler',
      menuSection: 'fruit_sparkle',
      desc: 'White peach, fresh lime, mint, and sparkling spring water.',
      ingredients: 'white peach, lime, mint, sparkling water',
      image: {
        alt: 'White Peach Lime Sparkler',
      },
    })
    expect(store.findMenuItemById('food_menu_peach_sunset_fizz')).toMatchObject({
      title: 'My Edited Peach Box',
      menuSection: 'fruit_sparkle',
      price: '30.00',
      desc: 'My own saved description.',
    })
    expect(store.findMenuItemById('food_menu_peach_matcha_float')).toMatchObject({
      title: 'Peach Cold Brew Tonic',
      menuSection: 'cloud_tea',
    })
    expect(store.findMenuItemById('food_menu_peach_grape_jasmine_tea')).toMatchObject({
      title: 'My Saved Grape Tea',
      menuSection: 'fruit_sparkle',
      price: '99.00',
      desc: 'My own grape recipe.',
      ingredients: 'private grape blend',
      image: {
        url: 'https://example.com/my-grape-tea.png',
        alt: 'My saved grape tea photo',
      },
    })
    expect(store.findMenuItemById('food_menu_peach_mango_passion_yogurt')).toMatchObject({
      title: 'Mango Passionfruit Yogurt',
      menuSection: 'fruit_sparkle',
    })
    expect(store.findMenuItemById('food_menu_peach_osmanthus_pear_warm')).toMatchObject({
      title: 'Osmanthus Pear Warm Infusion',
      menuSection: 'seasonal_drop',
    })
    expect(store.listMenuByRestaurant('food_seed_peach_cloud')).toHaveLength(17)
  })

  test('keeps restaurant carts independent and checks out only the requested restaurant', () => {
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
    expect(store.cartQuantity).toBe(3)
    expect(store.cartLineItems[0]?.restaurant?.id).toBe(secondRestaurant.id)
    expect(store.getCartQuantityByRestaurant(firstRestaurant.id)).toBe(2)
    expect(store.getCartQuantityByRestaurant(secondRestaurant.id)).toBe(1)
    expect(store.getCartPrimaryTotalByRestaurant(firstRestaurant.id)).toEqual({
      currency: 'CNY',
      amountCents: 4300,
      amount: '43.00',
    })
    expect(store.getCartPrimaryTotalByRestaurant(secondRestaurant.id)).toEqual({
      currency: 'CNY',
      amountCents: 3800,
      amount: '38.00',
    })
    const multiCartSnapshot = store.createBackupSnapshot()

    const order = store.checkoutCart({
      restaurantId: secondRestaurant.id,
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
    expect(store.getCartQuantityByRestaurant(secondRestaurant.id)).toBe(0)
    expect(store.getCartPrimaryTotalByRestaurant(secondRestaurant.id)).toEqual({
      currency: 'CNY',
      amountCents: 0,
      amount: '0.00',
    })
    expect(store.getCartQuantityByRestaurant(firstRestaurant.id)).toBe(2)
    expect(store.cartQuantity).toBe(2)
    expect(store.orderCount).toBe(1)
    expect(store.updateOrderStatus(order.id, FOOD_DELIVERY_ORDER_STATUS.COOKING)).toBe(true)
    expect(store.orders[0]?.status).toBe(FOOD_DELIVERY_ORDER_STATUS.COOKING)

    store.resetForTesting()
    expect(store.restoreFromBackup(multiCartSnapshot)).toBe(true)
    expect(store.getCartQuantityByRestaurant(firstRestaurant.id)).toBe(2)
    expect(store.getCartQuantityByRestaurant(secondRestaurant.id)).toBe(1)
  })

  test('uses the finance primary currency for active food pricing without rewriting historic orders', () => {
    const store = useFoodDeliveryStore()
    const walletStore = useWalletStore()
    store.resetForTesting()
    walletStore.resetForTesting()
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
      quoteSnapshot: {
        sourceMoney: { amountMinor: 2400, currency: 'USD' },
        quotedMoney: { amountMinor: 17280, currency: 'CNY' },
        targetCurrency: 'CNY',
      },
    })

    store.setPrimaryCurrency('eur')
    walletStore.setUsdCnyRate('10')
    expect(store.findRestaurantById(restaurant.id)).toMatchObject({
      currency: 'EUR',
      deliveryFee: '3.70',
      sourceDeliveryFeeCents: 400,
      sourceCurrency: 'USD',
    })
    expect(store.findMenuItemById(item.id)).toMatchObject({
      currency: 'EUR',
      price: '18.52',
      sourcePriceCents: 2000,
      sourceCurrency: 'USD',
    })
    expect(store.createBackupSnapshot().menuItems.find((entry) => entry.id === item.id)).toMatchObject({
      priceCents: 2000,
      currency: 'USD',
    })
    expect(store.findOrderById(order.id).currency).toBe('USD')
    expect(store.findOrderById(order.id).quoteSnapshot).toEqual(order.quoteSnapshot)
  })

  test('quotes active menu and cart values numerically while checkout retains source money', () => {
    const store = useFoodDeliveryStore()
    const walletStore = useWalletStore()
    walletStore.resetForTesting()
    walletStore.setPrimaryCurrency('EUR')
    store.setPrimaryCurrency('EUR')
    const sourceRestaurant = store.restaurants.find((entry) => entry.id === 'food_seed_moon_bistro')
    const sourceItem = store.menuItems.find((entry) => entry.restaurantId === sourceRestaurant.id)
    const presentedItem = store.findMenuItemById(sourceItem.id)
    const currentQuote = walletStore.quoteMoney(
      { amountMinor: sourceItem.priceCents, currency: sourceItem.currency },
      'EUR',
    )

    expect(currentQuote.ok).toBe(true)
    expect(presentedItem).toMatchObject({
      sourcePriceCents: sourceItem.priceCents,
      sourceCurrency: sourceItem.currency,
      priceCents: currentQuote.quotedMoney.amountMinor,
      currency: 'EUR',
    })
    expect(presentedItem.priceCents).not.toBe(sourceItem.priceCents)

    store.addToCart(sourceItem.id)
    expect(store.cartLineItems[0]).toMatchObject({
      sourceUnitPriceCents: sourceItem.priceCents,
      sourceCurrency: 'CNY',
      unitPriceCents: currentQuote.quotedMoney.amountMinor,
      currency: 'EUR',
    })
    expect(store.getCartTotalsByRestaurant(sourceRestaurant.id)[0].currency).toBe('CNY')
    expect(store.getCartPrimaryTotalByRestaurant(sourceRestaurant.id).currency).toBe('EUR')

    const order = store.checkoutCart({
      restaurantId: sourceRestaurant.id,
      deliveryAddress: 'Currency Quote Address',
    })
    expect(order).toMatchObject({
      currency: 'CNY',
      items: [expect.objectContaining({ currency: 'CNY' })],
      quoteSnapshot: {
        sourceMoney: { currency: 'CNY' },
        quotedMoney: { currency: 'EUR' },
        targetCurrency: 'EUR',
      },
    })

    const frozenQuote = order.quoteSnapshot
    walletStore.setUsdCnyRate('10')
    expect(store.findOrderById(order.id).quoteSnapshot).toEqual(frozenQuote)
  })

  test('keeps Dash Grill combo choices distinct through cart, backup, and order snapshots', () => {
    const store = useFoodDeliveryStore()
    const comboItem = store.findMenuItemById('food_menu_dash_double_stack')
    const loadedShakeSelection = {
      comboSide: 'loaded_cheese_fries',
      comboSideLabelZh: '浓芝士薯条',
      comboSideLabelEn: 'Loaded Cheese Fries',
      comboDrink: 'vanilla_cloud_shake',
      comboDrinkLabelZh: '香草云奶昔',
      comboDrinkLabelEn: 'Vanilla Cloud Shake',
    }
    const standardSelection = {
      comboSide: 'sea_salt_fries',
      comboSideLabelZh: '海盐薯条',
      comboSideLabelEn: 'Sea-Salt Fries',
      comboDrink: 'fountain_cola',
      comboDrinkLabelZh: '冰爽可乐',
      comboDrinkLabelEn: 'Fountain Cola',
    }

    store.addToCart(comboItem.id, 2, {
      selectionKey: 'combo:loaded_cheese_fries:vanilla_cloud_shake',
      selection: loadedShakeSelection,
      unitPriceCents: 5600,
    })
    store.addToCart(comboItem.id, 1, {
      selectionKey: 'combo:sea_salt_fries:fountain_cola',
      selection: standardSelection,
      unitPriceCents: 3900,
    })

    expect(store.listCartLineItemsByRestaurant('food_seed_dash_grill')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lineId: 'food_menu_dash_double_stack__combo:loaded_cheese_fries:vanilla_cloud_shake',
          quantity: 2,
          unitPriceCents: 5600,
          selection: expect.objectContaining(loadedShakeSelection),
        }),
        expect.objectContaining({
          lineId: 'food_menu_dash_double_stack__combo:sea_salt_fries:fountain_cola',
          quantity: 1,
          unitPriceCents: 3900,
          selection: expect.objectContaining(standardSelection),
        }),
      ]),
    )

    const snapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.listCartLineItemsByRestaurant('food_seed_dash_grill')).toHaveLength(2)

    const order = store.checkoutCart({
      restaurantId: 'food_seed_dash_grill',
      deliveryAddress: 'Dash Test Counter',
    })
    expect(order.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          selectionKey: 'combo:loaded_cheese_fries:vanilla_cloud_shake',
          unitPriceCents: 5600,
          selection: expect.objectContaining(loadedShakeSelection),
        }),
        expect.objectContaining({
          selectionKey: 'combo:sea_salt_fries:fountain_cola',
          unitPriceCents: 3900,
          selection: expect.objectContaining(standardSelection),
        }),
      ]),
    )
  })

  test('keeps a Dash Grill dipping-sauce choice through backup and order snapshots', () => {
    const store = useFoodDeliveryStore()
    const tenders = store.findMenuItemById('food_menu_dash_chicken_tenders')
    const sauceSelection = {
      sauce: 'honey_mustard_sauce',
      sauceLabelZh: '蜂蜜黄芥末酱',
      sauceLabelEn: 'Honey Mustard Sauce',
    }

    store.addToCart(tenders.id, 1, {
      selectionKey: 'sauce:honey_mustard_sauce',
      selection: sauceSelection,
      unitPriceCents: tenders.priceCents,
    })

    expect(store.listCartLineItemsByRestaurant('food_seed_dash_grill')).toEqual([
      expect.objectContaining({
        lineId: 'food_menu_dash_chicken_tenders__sauce:honey_mustard_sauce',
        unitPriceCents: tenders.priceCents,
        selection: expect.objectContaining(sauceSelection),
      }),
    ])

    const snapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.listCartLineItemsByRestaurant('food_seed_dash_grill')[0]).toMatchObject({
      selectionKey: 'sauce:honey_mustard_sauce',
      selection: sauceSelection,
    })

    const order = store.checkoutCart({
      restaurantId: 'food_seed_dash_grill',
      deliveryAddress: 'Dash Test Counter',
    })
    expect(order.items[0]).toMatchObject({
      selectionKey: 'sauce:honey_mustard_sauce',
      unitPriceCents: tenders.priceCents,
      selection: sauceSelection,
    })
  })

  test('persists Harbor pickup and dine-in choices while keeping delivery as the legacy default', () => {
    const store = useFoodDeliveryStore()
    const harborItem = store.findMenuItemById('food_menu_harbor_house_americano')

    store.addToCart(harborItem.id)
    const pickupOrder = store.checkoutCart({
      restaurantId: 'food_seed_harbor_roast',
      deliveryAddress: 'Harbor Roast · Harbor Store',
      fulfillmentMode: 'pickup',
      pickupMode: 'dine_in',
    })
    expect(pickupOrder).toMatchObject({
      fulfillmentMode: 'pickup',
      pickupMode: 'dine_in',
      deliveryFeeCents: 0,
      deliveryFee: '0.00',
      totalCents: harborItem.priceCents,
    })

    const snapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.findOrderById(pickupOrder.id)).toMatchObject({
      fulfillmentMode: 'pickup',
      pickupMode: 'dine_in',
      deliveryFeeCents: 0,
    })

    store.addToCart(harborItem.id)
    const legacyDefaultOrder = store.checkoutCart({
      restaurantId: 'food_seed_harbor_roast',
      deliveryAddress: 'Pier Exchange 16',
    })
    expect(legacyDefaultOrder).toMatchObject({
      fulfillmentMode: 'delivery',
      pickupMode: '',
      deliveryFeeCents: 350,
    })
  })

  test('gates Harbor merchandise redemption by bean stamps and refunds removed gifts', () => {
    const store = useFoodDeliveryStore()
    store.setHarborRoastBeanStamps(5)

    expect(store.redeemHarborRoastMerchandise('harbor_merch_captain_mug')).toEqual({
      ok: false,
      reason: 'insufficient_stamps',
      availableBeanStamps: 5,
      requiredBeanStamps: 6,
      missingBeanStamps: 1,
    })
    expect(store.harborRoastBeanStamps).toBe(5)

    const redemption = store.redeemHarborRoastMerchandise('harbor_merch_anchor_pin')
    expect(redemption).toMatchObject({
      ok: true,
      spentBeanStamps: 3,
      remainingBeanStamps: 2,
    })
    const giftLine = store
      .listCartLineItemsByRestaurant('food_seed_harbor_roast')
      .find((line) => line.merchandiseId === 'harbor_merch_anchor_pin')
    expect(giftLine).toMatchObject({
      lineKind: 'merchandise',
      acquisition: 'redeemed_gift',
      isGift: true,
      beanStampCost: 3,
      unitPriceCents: 0,
      subtotalCents: 0,
      quantity: 1,
    })
    expect(store.updateCartQuantity(giftLine.lineId, 2)).toBe(false)
    expect(store.harborRoastBeanStamps).toBe(2)
    expect(store.updateCartQuantity(giftLine.lineId, 0)).toBe(true)
    expect(store.harborRoastBeanStamps).toBe(5)
  })

  test('checks out Harbor drinks, purchased merchandise, and redeemed gifts in one order', () => {
    const store = useFoodDeliveryStore()
    const harborItem = store.findMenuItemById('food_menu_harbor_house_americano')
    store.setHarborRoastBeanStamps(5)
    store.addToCart(harborItem.id)
    expect(store.addHarborRoastMerchandiseToCart('harbor_merch_canvas_tote')).toMatchObject({
      ok: true,
    })
    expect(store.redeemHarborRoastMerchandise('harbor_merch_sticker_pack')).toMatchObject({
      ok: true,
      remainingBeanStamps: 3,
    })

    const snapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.harborRoastBeanStamps).toBe(3)
    expect(store.listCartLineItemsByRestaurant('food_seed_harbor_roast')).toHaveLength(3)

    const order = store.checkoutCart({
      restaurantId: 'food_seed_harbor_roast',
      fulfillmentMode: 'pickup',
      pickupMode: 'takeout',
    })
    expect(order).toMatchObject({
      restaurantId: 'food_seed_harbor_roast',
      itemCount: 3,
      totalCents: harborItem.priceCents + 8900,
      items: expect.arrayContaining([
        expect.objectContaining({
          menuItemId: harborItem.id,
          lineKind: 'menu',
          unitPriceCents: harborItem.priceCents,
        }),
        expect.objectContaining({
          merchandiseId: 'harbor_merch_canvas_tote',
          lineKind: 'merchandise',
          acquisition: 'purchase',
          unitPriceCents: 8900,
        }),
        expect.objectContaining({
          merchandiseId: 'harbor_merch_sticker_pack',
          lineKind: 'merchandise',
          acquisition: 'redeemed_gift',
          unitPriceCents: 0,
          beanStampCost: 2,
        }),
      ]),
    })
    expect(store.getCartQuantityByRestaurant('food_seed_harbor_roast')).toBe(0)
    expect(store.harborRoastBeanStamps).toBe(3)
  })

  test('keeps Peach Cloud mascot goods in the Peach Cloud bag and order snapshot', () => {
    const store = useFoodDeliveryStore()
    const peachItem = store.findMenuItemById('food_menu_peach_oolong_cloud')

    expect(store.peachCloudMerchandise).toHaveLength(3)
    expect(store.addPeachCloudMerchandiseToCart('peach_merch_cloud_plush')).toMatchObject({
      ok: true,
    })
    store.addToCart(peachItem.id)

    const snapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.listCartLineItemsByRestaurant('food_seed_peach_cloud')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          merchandiseId: 'peach_merch_cloud_plush',
          restaurant: expect.objectContaining({ id: 'food_seed_peach_cloud' }),
          lineKind: 'merchandise',
          acquisition: 'purchase',
          assetBase: 'peach-cloud',
          unitPriceCents: 9900,
        }),
        expect.objectContaining({ menuItemId: peachItem.id }),
      ]),
    )
    expect(store.listCartLineItemsByRestaurant('food_seed_harbor_roast')).toHaveLength(0)

    const order = store.checkoutCart({
      restaurantId: 'food_seed_peach_cloud',
      deliveryAddress: 'Cloud Arcade 7',
    })
    expect(order).toMatchObject({
      restaurantId: 'food_seed_peach_cloud',
      itemCount: 2,
      totalCents: peachItem.priceCents + 9900 + 400,
      items: expect.arrayContaining([
        expect.objectContaining({
          merchandiseId: 'peach_merch_cloud_plush',
          lineKind: 'merchandise',
          assetBase: 'peach-cloud',
          unitPriceCents: 9900,
        }),
      ]),
    })
    expect(store.getCartQuantityByRestaurant('food_seed_peach_cloud')).toBe(0)
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
    expect(store.orders[0]?.etaMinutes).toBe(35)

    const riderDelayEvent = store.addOrderEvent(order.id, {
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
      summary: 'The rider is taking a slower covered lane.',
      etaMinutes: 41,
    })
    expect(riderDelayEvent?.etaMinutes).toBe(41)
    expect(store.orders[0]?.etaMinutes).toBe(41)

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
    expect(store.orders[0]?.events).toHaveLength(4)
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
      quoteSnapshot: {
        sourceMoney: { amountMinor: 5200, currency: 'CNY' },
        quotedMoney: { amountMinor: 5200, currency: 'CNY' },
        rate: '1',
        targetCurrency: 'CNY',
      },
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

  test('pays a platform cart through Wallet and preserves payment and Map address snapshots', () => {
    const store = useFoodDeliveryStore()
    const walletStore = useWalletStore()
    const mapStore = useMapStore()
    walletStore.resetForTesting()
    walletStore.addTransaction({
      type: 'income',
      title: 'Platform checkout funding',
      amount: '200.00',
      currency: 'CNY',
      createdAt: Date.now(),
    })
    const paymentCard = walletStore.paymentCardSummaries.find(
      (card) => card.status === 'active' && card.supportedCurrencies.includes('CNY'),
    )
    const deliveryAnchor = mapStore.listDeliveryAnchors().find(
      (anchor) => anchor.kind === 'address',
    )
    store.addPlatformCartItem({
      merchantId: 'platform_shop_paid',
      merchantName: 'Platform Paid Shop',
      itemId: 'platform_shop_paid_meal',
      title: 'Platform Paid Meal',
      price: '18.50',
    })

    const result = store.checkoutPaidPlatformCart({
      deliveryAnchor,
      deliveryFee: '3.00',
      currency: 'CNY',
      accountId: paymentCard.accountId,
      cardId: paymentCard.id,
      idempotencyKey: 'platform-paid-checkout-1',
      now: Date.now(),
    })

    expect(result).toMatchObject({
      ok: true,
      order: {
        merchantId: 'platform_shop_paid',
        deliveryAddress: deliveryAnchor.detail,
        paymentMethod: 'wallet_card',
        paymentStatus: 'completed',
        paymentRef: {
          accountId: paymentCard.accountId,
          cardId: paymentCard.id,
          status: 'completed',
        },
      },
    })
    expect(result.payment.transaction).toMatchObject({
      amountCents: 2150,
      currency: 'CNY',
      paymentKind: 'commerce_order',
      sourceId: result.order.id,
    })
    expect(store.platformCartQuantity).toBe(0)
    expect(store.createBackupSnapshot().platformOrders[0]).toMatchObject({
      paymentRef: { transactionId: result.payment.transaction.id },
      deliveryAnchor: { detail: deliveryAnchor.detail },
    })
  })

  test('fails a paid platform checkout closed when Wallet has insufficient funds', () => {
    const store = useFoodDeliveryStore()
    const walletStore = useWalletStore()
    const mapStore = useMapStore()
    walletStore.resetForTesting()
    const deliveryAnchor = mapStore.listDeliveryAnchors().find(
      (anchor) => anchor.kind === 'address',
    )
    store.addPlatformCartItem({
      merchantId: 'platform_shop_unfunded',
      merchantName: 'Platform Unfunded Shop',
      itemId: 'platform_shop_unfunded_meal',
      title: 'Platform Unfunded Meal',
      price: '18.50',
    })

    const result = store.checkoutPaidPlatformCart({
      deliveryAnchor,
      currency: 'CNY',
      idempotencyKey: 'platform-paid-checkout-insufficient',
      now: Date.now(),
    })

    expect(result).toMatchObject({
      ok: false,
      stage: 'payment',
      reason: 'insufficient_funds',
    })
    expect(store.platformOrders).toHaveLength(0)
    expect(store.platformCartQuantity).toBe(1)
  })

  test('pays a pickup order without creating a Map courier journey', () => {
    const store = useFoodDeliveryStore()
    const walletStore = useWalletStore()
    const mapStore = useMapStore()
    walletStore.resetForTesting()
    walletStore.addTransaction({
      type: 'income',
      title: 'Pickup checkout funding',
      amount: '300.00',
      currency: 'CNY',
      createdAt: Date.now(),
    })
    const paymentCard = walletStore.paymentCardSummaries.find(
      (card) => card.status === 'active' && card.supportedCurrencies.includes('CNY'),
    )
    const restaurant = store.findRestaurantById('food_seed_harbor_roast')
    const menuItem = store.findMenuItemById('food_menu_harbor_house_americano')
    const journeyCount = mapStore.deliveryJourneys.length
    store.addToCart(menuItem.id)

    const result = store.checkoutPaidCart({
      restaurantId: restaurant.id,
      fulfillmentMode: 'pickup',
      pickupMode: 'dine_in',
      pickupAddress: 'Harbor Roast · Harbor Store',
      accountId: paymentCard.accountId,
      cardId: paymentCard.id,
      idempotencyKey: 'harbor-paid-pickup-1',
      now: Date.now(),
    })

    expect(result).toMatchObject({
      ok: true,
      journey: null,
      order: {
        fulfillmentMode: 'pickup',
        pickupMode: 'dine_in',
        deliveryFeeCents: 0,
        paymentStatus: 'completed',
      },
    })
    expect(result.order.totalCents).toBe(menuItem.priceCents)
    expect(result.order.deliveryAnchor).toBeNull()
    expect(mapStore.deliveryJourneys).toHaveLength(journeyCount)
  })

  test('quotes Food Platform cart totals while keeping platform order source prices', () => {
    const store = useFoodDeliveryStore()
    const walletStore = useWalletStore()
    store.resetForTesting()
    walletStore.resetForTesting()
    walletStore.setPrimaryCurrency('EUR')
    store.setPrimaryCurrency('EUR')
    store.addPlatformCartItem(
      {
        merchantId: 'platform_currency_shop',
        merchantName: 'Platform Currency Shop',
        itemId: 'platform_currency_meal',
        title: 'Platform Currency Meal',
        price: '18.50',
        currency: 'CNY',
      },
      2,
    )

    const itemsQuote = walletStore.quoteMoney({ amountMinor: 3700, currency: 'CNY' }, 'EUR')
    expect(store.platformCartPrimaryTotal).toEqual({
      amountCents: itemsQuote.quotedMoney.amountMinor,
      amount: walletStore.formatMoneyAmount(itemsQuote.quotedMoney, { useGrouping: false }),
      currency: 'EUR',
    })

    const order = store.checkoutPlatformCart({
      deliveryAddress: 'Platform Currency Address',
      deliveryFee: '3.00',
      currency: 'CNY',
    })
    expect(order).toMatchObject({
      itemsTotalCents: 3700,
      deliveryFeeCents: 300,
      totalCents: 4000,
      currency: 'CNY',
      items: [expect.objectContaining({ unitPriceCents: 1850, currency: 'CNY' })],
      quoteSnapshot: {
        sourceMoney: { amountMinor: 4000, currency: 'CNY' },
        quotedMoney: { currency: 'EUR' },
        targetCurrency: 'EUR',
      },
    })
  })
})
