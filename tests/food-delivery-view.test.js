import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useFoodDeliveryStore } from '../src/stores/foodDelivery'
import { useGalleryStore } from '../src/stores/gallery'
import { useMapStore } from '../src/stores/map'
import FoodDeliveryView from '../src/views/FoodDeliveryView.vue'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: DummyView },
      { path: '/food-delivery', component: FoodDeliveryView },
    ],
  })

describe('FoodDeliveryView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('renders folder-backed categories and Map handoff boundaries', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.get('[data-testid="food-delivery-category-panel"]').text()).toContain('nearby')
    expect(wrapper.get('[data-testid="food-delivery-data-baseline"]').text()).toMatch(/本地数据|Local data/)
    expect(wrapper.get('[data-testid="food-delivery-cart-panel"]').text()).toContain('0')
    expect(wrapper.get('[data-testid="food-delivery-map-boundary"]').text()).toContain('Map')
    expect(wrapper.get('[data-testid="food-delivery-map-handoff"]').text()).toContain('ETA')
    expect(wrapper.find('[data-testid="food-delivery-category-cafe"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="food-delivery-source-food_delivery_map_restaurant_location"]').exists()).toBe(true)

    await wrapper.get('[data-testid="food-delivery-category-cafe"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/food-delivery')
    expect(router.currentRoute.value.query.category).toBe('cafe')
    wrapper.unmount()
  })

  test('creates a local food delivery order from menu actions', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const mapStore = useMapStore()
    mapStore.setCurrentLocation({
      label: 'Studio',
      detail: 'Studio Street 9',
      source: 'test',
    })
    await flushPromises()
    const activeRestaurant = store.listRestaurantsByCategory('restaurants')[0]
    const menuItem = store.listMenuByRestaurant(activeRestaurant.id)[0]

    expect(wrapper.get('[data-testid="food-delivery-map-handoff-address"]').text()).toContain('Studio Street 9')

    await wrapper.get(`[data-testid="food-delivery-add-${menuItem.id}"]`).trigger('click')
    await flushPromises()

    expect(store.cartQuantity).toBe(1)
    expect(wrapper.get(`[data-testid="food-delivery-cart-${menuItem.id}"]`).text()).toContain(menuItem.title)

    await wrapper.get('[data-testid="food-delivery-checkout"]').trigger('click')
    await flushPromises()

    expect(store.orderCount).toBe(1)
    expect(store.orders[0]).toMatchObject({
      restaurantId: activeRestaurant.id,
      restaurantName: activeRestaurant.name,
      itemCount: 1,
      deliveryAddress: 'Studio Street 9',
      sourceModule: 'food_delivery_map_courier_route',
      sourceId: `map_food_delivery_${activeRestaurant.id}`,
    })
    expect(wrapper.get('[data-testid="food-delivery-orders-panel"]').text()).toContain(activeRestaurant.name)
    wrapper.unmount()
  })

  test('shows Chat service source banner and highlights linked food order', async () => {
    const router = createTestRouter()
    const store = useFoodDeliveryStore()
    const activeRestaurant = store.listRestaurantsByCategory('restaurants')[0]
    const menuItem = store.listMenuByRestaurant(activeRestaurant.id)[0]
    store.addToCart(menuItem.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Map Pin A',
      note: 'From Chat service.',
    })

    await router.push(`/food-delivery?source=chat&intent=food_delivery_order&orderId=${order.id}`)
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.get('[data-testid="food-delivery-chat-source-banner"]').text()).toContain(
      activeRestaurant.name,
    )
    expect(wrapper.get(`[data-testid="food-delivery-order-${order.id}"]`).classes()).toContain(
      'border-orange-300',
    )
    expect(store.orderCount).toBe(1)
    expect(store.cartQuantity).toBe(0)
    wrapper.unmount()
  })

  test('creates custom restaurant and menu images from URL and Gallery sources', async () => {
    const router = createTestRouter()
    const galleryStore = useGalleryStore()
    galleryStore.resetForTesting()
    const imported = galleryStore.importAssetFromUrl({
      url: 'https://example.com/food-gallery.png',
      name: 'Food Gallery',
      category: 'reference',
    })

    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    await wrapper.get('[data-testid="food-delivery-custom-restaurant-name"]').setValue('Orbit Kitchen')
    await wrapper.get('[data-testid="food-delivery-custom-restaurant-category"]').setValue('restaurants')
    await wrapper.get('[data-testid="food-delivery-custom-restaurant-cuisine"]').setValue('Fusion')
    await wrapper.get('[data-testid="food-delivery-custom-restaurant-fee"]').setValue('7.00')
    await wrapper.get('[data-testid="food-delivery-custom-restaurant-distance"]').setValue('3.2')
    await wrapper.get('[data-testid="food-delivery-custom-restaurant-eta"]').setValue('28')
    await wrapper.get('[data-testid="food-delivery-custom-restaurant-address"]').setValue('Orbit Street 1')
    await wrapper.get('[data-testid="food-delivery-custom-restaurant-image-source"]').setValue('url')
    await wrapper
      .get('[data-testid="food-delivery-custom-restaurant-image-url"]')
      .setValue('https://example.com/orbit-kitchen.png')
    await wrapper.get('[data-testid="food-delivery-create-restaurant"]').trigger('click')
    await flushPromises()

    const restaurant = store.restaurants.find((item) => item.name === 'Orbit Kitchen')
    expect(restaurant).toMatchObject({
      category: 'restaurants',
      cuisine: 'Fusion',
      sourceModule: 'food_delivery_user_custom_restaurant',
      image: {
        sourceType: 'url',
        url: 'https://example.com/orbit-kitchen.png',
      },
    })
    expect(wrapper.get(`[data-testid="food-delivery-restaurant-${restaurant.id}"] img`).attributes('src')).toBe(
      'https://example.com/orbit-kitchen.png',
    )

    expect(imported.ok).toBe(true)
    await wrapper.get('[data-testid="food-delivery-custom-menu-restaurant"]').setValue(restaurant.id)
    await wrapper.get('[data-testid="food-delivery-custom-menu-title"]').setValue('Orbit Bento')
    await wrapper.get('[data-testid="food-delivery-custom-menu-price"]').setValue('48.00')
    await wrapper.get('[data-testid="food-delivery-custom-menu-category"]').setValue('restaurants')
    await wrapper.get('[data-testid="food-delivery-custom-menu-image-source"]').setValue('gallery')
    await wrapper.get('[data-testid="food-delivery-custom-menu-gallery-asset"]').setValue(imported.assetId)
    await wrapper.get('[data-testid="food-delivery-create-menu"]').trigger('click')
    await flushPromises()

    const menuItem = store.menuItems.find((item) => item.title === 'Orbit Bento')
    expect(menuItem).toMatchObject({
      restaurantId: restaurant.id,
      category: 'restaurants',
      sourceModule: 'food_delivery_user_custom_menu',
      image: {
        sourceType: 'gallery',
        galleryAssetId: imported.assetId,
      },
    })
    expect(wrapper.get(`[data-testid="food-delivery-menu-${menuItem.id}"] img`).attributes('src')).toBe(
      'https://example.com/food-gallery.png',
    )
    wrapper.unmount()
  })
})
