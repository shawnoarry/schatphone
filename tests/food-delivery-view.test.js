import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  FOOD_DELIVERY_ORDER_EVENT_TYPE,
  FOOD_DELIVERY_ORDER_STATUS,
  useFoodDeliveryStore,
} from '../src/stores/foodDelivery'
import { useChatStore } from '../src/stores/chat'
import { useGalleryStore } from '../src/stores/gallery'
import { useMapStore } from '../src/stores/map'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'
import { useWalletStore } from '../src/stores/wallet'
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

    expect(wrapper.get('[data-testid="food-delivery-pseudo-folder-home"]').text()).toMatch(/Platform|平台/)
    expect(wrapper.get('[data-testid="food-delivery-platform-entry"]').text()).toMatch(/Platform|平台/)
    expect(wrapper.get('[data-testid="food-delivery-shop-app-list"]').text()).toContain('Moon Bistro')
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

  test('renders World Pack UX context without taking over food-order truth', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    expect(systemStore.activateWorldPack('survival_city').ok).toBe(true)
    await router.push('/food-delivery?worldPack=survival_city&worldApp=survival_dispatch')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    expect(wrapper.get('[data-testid="food-delivery-hero-title"]').text()).toContain('救援调度')
    const banner = wrapper.get('[data-testid="food-delivery-world-app-context"]')
    expect(banner.text()).toContain('World UX package')
    expect(wrapper.get('[data-testid="food-delivery-world-app-title"]').text()).toContain('救援调度')
    expect(wrapper.get('[data-testid="food-delivery-world-app-boundary"]').text()).toContain(
      'Food Delivery keeps its own records',
    )
    expect(store.orderCount).toBe(0)
    expect(store.cartQuantity).toBe(0)
    expect(wrapper.get('[data-testid="food-delivery-category-panel"]').text()).toContain('nearby')

    await wrapper.get('[data-testid="food-delivery-category-cafe"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({
      worldPack: 'survival_city',
      worldApp: 'survival_dispatch',
      category: 'cafe',
    })
    wrapper.unmount()
  })

  test('renders a confirmed nonstandard dispatch app binding as Food Delivery context', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    const confirmed = systemStore.confirmWorldAppTemplateProposal(
      {
        templateId: 'dispatch_board',
        title: 'Rescue Desk',
        confidence: 'high',
      },
      'default_world',
    )
    expect(confirmed.ok).toBe(true)

    await router.push({
      path: '/food-delivery',
      query: {
        worldPack: 'default_world',
        worldApp: confirmed.binding.id,
      },
    })
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()

    const banner = wrapper.get('[data-testid="food-delivery-world-app-context"]')
    expect(banner.attributes('data-world-pack')).toBe('default_world')
    expect(banner.attributes('data-world-app')).toBe(confirmed.binding.id)
    expect(wrapper.get('[data-testid="food-delivery-hero-title"]').text()).toContain('Rescue Desk')
    expect(wrapper.get('[data-testid="food-delivery-world-app-title"]').text()).toContain('Rescue Desk')
    expect(wrapper.get('[data-testid="food-delivery-world-app-boundary"]').text()).toContain(
      'Food Delivery keeps its own records',
    )
    expect(wrapper.get('[data-testid="food-delivery-category-panel"]').text()).toContain('nearby')
    expect(store.orderCount).toBe(0)
    expect(store.cartQuantity).toBe(0)

    await wrapper.get('[data-testid="food-delivery-category-cafe"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({
      worldPack: 'default_world',
      worldApp: confirmed.binding.id,
      category: 'cafe',
    })
    wrapper.unmount()
  })

  test('opens a restaurant as an individual store surface from the platform', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const restaurant = store.listRestaurantsByCategory('restaurants')[0]
    const menuItem = store.listMenuByRestaurant(restaurant.id)[0]

    expect(wrapper.get('[data-testid="food-delivery-platform"]').text()).toContain('Restaurants')
    expect(wrapper.get(`[data-testid="food-delivery-shop-app-${restaurant.id}"]`).text()).toContain(restaurant.name)
    await wrapper.get(`[data-testid="food-delivery-open-store-${restaurant.id}"]`).trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({
      category: 'restaurants',
      restaurantId: restaurant.id,
    })
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain(restaurant.name)
    expect(wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-id')).toBe(restaurant.id)
    expect(wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template')).toBe(
      'dark_tray_menu',
    )
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').classes()).toContain(
      'food-delivery-store-dark-tray',
    )
    expect(wrapper.get(`[data-testid="food-delivery-menu-tray-${menuItem.id}"]`).text()).toContain(menuItem.title)
    expect(wrapper.get(`[data-testid="food-delivery-menu-dish-${menuItem.id}"]`).exists()).toBe(true)

    await wrapper.get('[data-testid="food-delivery-store-back"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query.restaurantId).toBeUndefined()
    expect(wrapper.get('[data-testid="food-delivery-platform"]').exists()).toBe(true)
    wrapper.unmount()
  })

  test('uses App Store shop-entry presentation without changing restaurant records', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const store = useFoodDeliveryStore()
    const restaurant = store.listRestaurantsByCategory('restaurants')[0]
    expect(
      systemStore.setEntryPresentationOverride(`shop_app_${restaurant.id}`, {
        displayName: 'Moon Kitchen',
        shortDescription: 'Late night comfort menu',
        tags: 'late night, comfort',
        templateId: 'standard',
      }),
    ).toBe(true)

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.get(`[data-testid="food-delivery-shop-app-${restaurant.id}"]`).text()).toContain('Moon Kitchen')
    expect(wrapper.get(`[data-testid="food-delivery-shop-app-${restaurant.id}"]`).text()).toContain(
      'Late night comfort menu',
    )
    expect(wrapper.get(`[data-testid="food-delivery-shop-app-${restaurant.id}"]`).text()).toContain(
      'late night · comfort',
    )

    await wrapper.get(`[data-testid="food-delivery-open-store-${restaurant.id}"]`).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain('Moon Kitchen')
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain('late night · comfort')
    expect(wrapper.get('[data-testid="food-delivery-store-shell"]').attributes('data-store-template')).toBe('standard')
    expect(store.findRestaurantById(restaurant.id).name).toBe(restaurant.name)

    wrapper.unmount()
  })

  test('returns to the originating Home page when opened from a Home folder', async () => {
    const router = createTestRouter()
    await router.push('/food-delivery?category=nearby&from=home&homePage=1')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="food-delivery-go-home"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/home')
    expect(router.currentRoute.value.query.homePage).toBe('1')
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

    await wrapper.get(`[data-testid="food-delivery-open-store-${activeRestaurant.id}"]`).trigger('click')
    await flushPromises()
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

  test('opens menu item details and edits only that item copy and image', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const galleryStore = useGalleryStore()
    systemStore.settings.system.language = 'en-US'
    galleryStore.resetForTesting()
    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const store = useFoodDeliveryStore()
    const restaurant = store.listRestaurantsByCategory('restaurants')[0]
    const menuItem = store.listMenuByRestaurant(restaurant.id)[0]

    await wrapper.get(`[data-testid="food-delivery-open-store-${restaurant.id}"]`).trigger('click')
    await flushPromises()
    await wrapper.get(`[data-testid="food-delivery-menu-open-${menuItem.id}"]`).trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]').text()).toContain(menuItem.title)
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-desc"]').exists()).toBe(true)

    await wrapper.get('[data-testid="food-delivery-menu-detail-add"]').trigger('click')
    expect(store.cartQuantity).toBe(1)

    await wrapper.get('[data-testid="food-delivery-menu-detail-edit"]').trigger('click')
    await wrapper.get('[data-testid="food-delivery-menu-edit-title"]').setValue('Edited Lunar Rice')
    await wrapper.get('[data-testid="food-delivery-menu-edit-desc"]').setValue('A warmer bowl for the current scene.')
    await wrapper.get('[data-testid="food-delivery-menu-edit-ingredients"]').setValue('rice, egg, greens')
    await wrapper.get('[data-testid="food-delivery-menu-edit-image-source"]').setValue('url')
    await wrapper.get('[data-testid="food-delivery-menu-edit-image-url"]').setValue('https://example.com/lunar-rice.png')
    await wrapper.get('[data-testid="food-delivery-menu-edit-save"]').trigger('click')
    await flushPromises()

    const editedMenuItem = store.findMenuItemById(menuItem.id)
    expect(editedMenuItem).toMatchObject({
      id: menuItem.id,
      restaurantId: restaurant.id,
      title: 'Edited Lunar Rice',
      desc: 'A warmer bowl for the current scene.',
      ingredients: 'rice, egg, greens',
      image: {
        sourceType: 'url',
        url: 'https://example.com/lunar-rice.png',
      },
    })
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-sheet"]').text()).toContain('Edited Lunar Rice')
    expect(wrapper.get('[data-testid="food-delivery-menu-detail-ingredients"]').text()).toContain('rice, egg, greens')
    expect(wrapper.get(`[data-testid="food-delivery-menu-tray-${menuItem.id}"]`).text()).toContain(
      'Edited Lunar Rice',
    )
    expect(wrapper.get(`[data-testid="food-delivery-menu-dish-${menuItem.id}"] img`).attributes('src')).toBe(
      'https://example.com/lunar-rice.png',
    )
    wrapper.unmount()
  })

  test('shows Chat service source banner and highlights linked food order', async () => {
    const router = createTestRouter()
    const store = useFoodDeliveryStore()
    const activeRestaurant = store.upsertRestaurant({
      id: 'food_wallet_shop',
      name: 'Wallet Kitchen',
      category: 'restaurants',
      deliveryFee: '4.00',
    })
    const menuItem = store.upsertMenuItem({
      id: 'food_wallet_item',
      restaurantId: activeRestaurant.id,
      title: 'Wallet Meal',
      price: '36.00',
    })
    store.addToCart(menuItem.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Map Pin A',
      note: 'From Chat service.',
    })
    const event = store.addOrderEvent(order.id, {
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
      summary: 'Rider is delayed by rain.',
      etaMinutes: 42,
    })

    await router.push(`/food-delivery?source=chat&intent=food_delivery_order&orderId=${order.id}`)
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })
    const mapStore = useMapStore()

    expect(wrapper.get('[data-testid="food-delivery-chat-source-banner"]').text()).toContain(
      activeRestaurant.name,
    )
    await flushPromises()
    expect(wrapper.get('[data-testid="food-delivery-store-app"]').text()).toContain(activeRestaurant.name)
    expect(wrapper.get(`[data-testid="food-delivery-order-${order.id}"]`).classes()).toContain(
      'border-orange-300',
    )
    const eventCard = wrapper.get(`[data-testid="food-delivery-order-event-${order.id}-${event.id}"]`)
    expect(eventCard.text()).toContain('Rider is delayed by rain.')
    const mapContext = wrapper.get(`[data-testid="food-delivery-event-map-context-${order.id}-${event.id}"]`)
    expect(mapContext.text()).toContain('Map route context')
    expect(mapContext.text()).toContain('Food Delivery')
    expect(mapContext.text()).toContain('Map Pin A')
    expect(mapContext.text()).toContain('42 min')
    expect(mapContext.text()).toContain('does not start a trip')
    expect(mapStore.tripState.status).toBe('idle')
    expect(mapStore.tripHistory).toHaveLength(0)
    expect(store.orderCount).toBe(1)
    expect(store.cartQuantity).toBe(0)
    wrapper.unmount()
  })

  test('can trigger a safe delivery event from an order card through the simulation pilot', async () => {
    const router = createTestRouter()
    const store = useFoodDeliveryStore()
    const activeRestaurant = store.listRestaurantsByCategory('restaurants')[0]
    const menuItem = store.listMenuByRestaurant(activeRestaurant.id)[0]
    store.addToCart(menuItem.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Map Pin B',
      note: 'Random event pilot.',
    })

    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get(`[data-testid="food-delivery-trigger-event-${order.id}"]`).trigger('click')
    await flushPromises()

    expect(store.orders[0]?.events).toHaveLength(1)
    expect([
      FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY,
    ]).toContain(store.orders[0]?.events[0]?.type)
    expect(wrapper.get('[data-testid="food-delivery-event-feedback"]').text()).toContain(
      'Delivery event added',
    )
    expect(
      wrapper.find(`[data-testid="food-delivery-order-event-${order.id}-${store.orders[0].events[0].id}"]`).exists(),
    ).toBe(true)
    wrapper.unmount()
  })

  test('suggests delivered food orders for explicit Wallet expense recording', async () => {
    const router = createTestRouter()
    const store = useFoodDeliveryStore()
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const walletStore = useWalletStore()
    store.resetForTesting()
    relationshipRuntimeStore.resetForTesting()
    walletStore.resetForTesting()
    const activeRestaurant = store.upsertRestaurant({
      id: 'food_wallet_shop',
      name: 'Wallet Kitchen',
      category: 'restaurants',
      deliveryFee: '4.00',
    })
    const menuItem = store.upsertMenuItem({
      id: 'food_wallet_item',
      restaurantId: activeRestaurant.id,
      title: 'Wallet Meal',
      price: '36.00',
    })
    store.addToCart(menuItem.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Wallet Address',
      note: 'Wallet food order.',
    })

    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find(`[data-testid="food-delivery-wallet-suggestion-${order.id}"]`).exists()).toBe(false)

    await wrapper.get(`[data-testid="food-delivery-mark-delivered-${order.id}"]`).trigger('click')
    await flushPromises()

    expect(store.orders[0]?.status).toBe('delivered')
    expect(wrapper.get(`[data-testid="food-delivery-wallet-suggestion-${order.id}"]`).text()).toContain(
      activeRestaurant.name,
    )
    expect(walletStore.transactionCount).toBe(0)

    const sharedMealContact = chatStore.getContactById(1)
    await wrapper.get(`[data-testid="food-delivery-shared-meal-contact-${order.id}"]`).setValue('1')
    await flushPromises()
    expect(wrapper.get(`[data-testid="food-delivery-relationship-suggestion-${order.id}"]`).text()).toContain(
      sharedMealContact.name,
    )

    await wrapper.get(`[data-testid="food-delivery-transfer-wallet-${order.id}"]`).trigger('click')
    await flushPromises()

    const transaction = walletStore.findTransactionBySource('food_delivery_wallet_expense', order.id)
    const relationshipSummary = relationshipRuntimeStore.summarizeEntityForTarget({
      profileId: sharedMealContact.profileId,
      contactId: sharedMealContact.id,
      name: sharedMealContact.name,
    })
    expect(transaction).toMatchObject({
      type: 'expense',
      title: 'Food Delivery order',
      counterparty: activeRestaurant.name,
      sourceModule: 'food_delivery_wallet_expense',
      sourceId: order.id,
    })
    expect(relationshipSummary.metrics.affinity).toBe(56)
    expect(relationshipSummary.metrics.intimacy).toBe(25)
    expect(relationshipSummary.latestEventSummary).toContain('Shared meal')
    expect(relationshipSummary.memorySummaries).toHaveLength(1)
    expect(relationshipSummary.memorySummaries[0]).toMatchObject({
      supportingCount: 2,
      primarySourceModule: 'relationship_food_delivery_shared_meal',
    })
    expect(relationshipSummary.memorySummaries[0].sourceModules).toContain('relationship_wallet_order_support')
    expect(wrapper.get(`[data-testid="food-delivery-transfer-wallet-${order.id}"]`).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  test('deletes a food order and clears its relationship runtime facts', async () => {
    const router = createTestRouter()
    const store = useFoodDeliveryStore()
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const walletStore = useWalletStore()
    store.resetForTesting()
    relationshipRuntimeStore.resetForTesting()
    walletStore.resetForTesting()
    const activeRestaurant = store.upsertRestaurant({
      id: 'food_delete_shop',
      name: 'Delete Kitchen',
      category: 'restaurants',
    })
    const menuItem = store.upsertMenuItem({
      id: 'food_delete_item',
      restaurantId: activeRestaurant.id,
      title: 'Delete Meal',
      price: '28.00',
    })
    store.addToCart(menuItem.id)
    const order = store.checkoutCart({
      deliveryAddress: 'Delete Address',
      note: 'Delete food order.',
    })
    const sharedMealContact = chatStore.getContactById(1)
    store.updateOrderStatus(order.id, FOOD_DELIVERY_ORDER_STATUS.DELIVERED)

    await router.push('/food-delivery?category=restaurants')
    await router.isReady()

    const wrapper = mount(FoodDeliveryView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get(`[data-testid="food-delivery-shared-meal-contact-${order.id}"]`).setValue('1')
    await flushPromises()
    await wrapper.get(`[data-testid="food-delivery-transfer-wallet-${order.id}"]`).trigger('click')
    await flushPromises()

    expect(relationshipRuntimeStore.summarizeEntityForTarget({
      profileId: sharedMealContact.profileId,
      contactId: sharedMealContact.id,
      name: sharedMealContact.name,
    }).exists).toBe(true)

    await wrapper.get(`[data-testid="food-delivery-delete-order-${order.id}"]`).trigger('click')
    await flushPromises()

    expect(store.findOrderById(order.id)).toBeNull()
    expect(wrapper.find(`[data-testid="food-delivery-order-${order.id}"]`).exists()).toBe(false)
    expect(relationshipRuntimeStore.events).toHaveLength(0)
    expect(relationshipRuntimeStore.summarizeEntityForTarget({
      profileId: sharedMealContact.profileId,
      contactId: sharedMealContact.id,
      name: sharedMealContact.name,
    }).exists).toBe(false)
    wrapper.unmount()
  })

  test('persists relationship binding on checkout when provided by the caller', async () => {
    const store = useFoodDeliveryStore()
    store.resetForTesting()
    const activeRestaurant = store.upsertRestaurant({
      id: 'food_binding_shop',
      name: 'Binding Kitchen',
      category: 'restaurants',
      deliveryFee: '4.00',
    })
    const menuItem = store.upsertMenuItem({
      id: 'food_binding_item',
      restaurantId: activeRestaurant.id,
      title: 'Binding Meal',
      price: '30.00',
    })

    store.addToCart(menuItem.id)
    store.checkoutCart({
      deliveryAddress: 'Studio Street 9',
      note: 'Shared meal route.',
      relationshipBinding: {
        contactId: 1,
        profileId: 1,
        kind: 'role',
        name: 'Aki',
        sourceModule: 'chat',
        sourceId: '1',
      },
    })

    expect(store.orders[0]?.relationshipBinding).toMatchObject({
      contactId: 1,
      profileId: 1,
      name: 'Aki',
      sourceModule: 'chat',
      sourceId: '1',
    })
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
