import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ChatView from '../src/views/ChatView.vue'
import { useChatStore } from '../src/stores/chat'
import { useCalendarStore } from '../src/stores/calendar'
import {
  SHOPPING_ORDER_EVENT_TYPE,
  useShoppingStore,
} from '../src/stores/shopping'
import {
  FOOD_DELIVERY_ORDER_EVENT_TYPE,
  FOOD_DELIVERY_ORDER_STATUS,
  useFoodDeliveryStore,
} from '../src/stores/foodDelivery'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat/:id', component: ChatView },
      { path: '/shopping', component: DummyView },
      { path: '/food-delivery', component: DummyView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/wallet', component: DummyView },
      { path: '/network', component: DummyView },
      { path: '/chat-feature/:feature', component: DummyView },
    ],
  })

describe('ChatView Shopping product preview routing', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('shows read-only Shopping catalog products and routes selected preview back to Shopping', async () => {
    const router = createTestRouter()
    await router.push('/chat/1')
    await router.isReady()
    const shoppingStore = useShoppingStore()
    shoppingStore.resetForTesting()
    const product = shoppingStore.upsertProduct({
      id: 'chat_preview_lens',
      title: 'Mira Lens',
      category: 'digital',
      serviceKey: 'nova_digital',
      price: '1288.00',
      desc: 'Portable camera lens',
      assetEligible: true,
      giftable: true,
    })

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await nextTick()

    await wrapper.get('[data-testid="chat-user-action-toggle"]').trigger('click')
    await nextTick()

    const preview = wrapper.get(`[data-testid="chat-shopping-preview-${product.id}"]`)
    expect(preview.text()).toContain('Mira Lens')
    expect(preview.text()).toContain('1288.00 CNY')
    expect(preview.text()).toContain('Nova Digital')

    await preview.trigger('click')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query).toMatchObject({
      source: 'chat',
      intent: 'product_card',
      category: 'digital',
      service: 'nova_digital',
      productId: product.id,
    })
    expect(shoppingStore.cartQuantity).toBe(0)
    expect(shoppingStore.orderCount).toBe(0)
    wrapper.unmount()
  })

  test('sends a Shopping product card as a local chat message without checkout side effects', async () => {
    const router = createTestRouter()
    await router.push('/chat/1')
    await router.isReady()
    const shoppingStore = useShoppingStore()
    shoppingStore.resetForTesting()
    const product = shoppingStore.upsertProduct({
      id: 'chat_card_lens',
      title: 'Mira Lens',
      category: 'digital',
      serviceKey: 'nova_digital',
      price: '1288.00',
      desc: 'Portable camera lens',
      assetEligible: true,
      giftable: true,
    })

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await nextTick()

    await wrapper.get('[data-testid="chat-user-action-toggle"]').trigger('click')
    await nextTick()
    await wrapper.get(`[data-testid="chat-send-product-card-${product.id}"]`).trigger('click')
    await nextTick()

    expect(router.currentRoute.value.path).toBe('/chat/1')
    expect(wrapper.text()).toContain('Shopping 商品卡')
    expect(wrapper.text()).toContain('Mira Lens')
    expect(wrapper.text()).toContain('Nova Digital')
    expect(wrapper.get(`[data-testid="chat-product-card-open-${product.id}"]`).exists()).toBe(true)
    expect(shoppingStore.cartQuantity).toBe(0)
    expect(shoppingStore.orderCount).toBe(0)

    await wrapper.get(`[data-testid="chat-product-card-open-${product.id}"]`).trigger('click')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query).toMatchObject({
      source: 'chat',
      intent: 'product_card',
      chatId: '1',
      category: 'digital',
      service: 'nova_digital',
      productId: product.id,
    })
    expect(shoppingStore.cartQuantity).toBe(0)
    expect(shoppingStore.orderCount).toBe(0)
    wrapper.unmount()
  })

  test('shows confirmed Shopping gift orders as read-only Chat context', async () => {
    const router = createTestRouter()
    await router.push('/chat/1')
    await router.isReady()
    const shoppingStore = useShoppingStore()
    shoppingStore.resetForTesting()
    const product = shoppingStore.upsertProduct({
      id: 'chat_gift_lens',
      title: 'Mira Lens',
      category: 'digital',
      price: '1288.00',
      giftable: true,
    })
    shoppingStore.addToCart(product.id)
    const order = shoppingStore.checkoutCart({
      giftRecipient: {
        name: 'Mira',
        chatId: 1,
        contactId: 1,
        sourceModule: 'chat',
      },
    })

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await nextTick()

    expect(wrapper.get('[data-testid="chat-gift-order-context"]').text()).toContain('Mira Lens')
    expect(wrapper.get(`[data-testid="chat-gift-order-${order.id}"]`).text()).toContain('1288.00 CNY')
    expect(shoppingStore.orderCount).toBe(1)
    expect(shoppingStore.cartQuantity).toBe(0)

    await wrapper.get(`[data-testid="chat-gift-order-open-${order.id}"]`).trigger('click')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query).toMatchObject({
      source: 'chat',
      intent: 'gift_order',
      chatId: '1',
      orderId: order.id,
    })
    expect(shoppingStore.orderCount).toBe(1)
    expect(shoppingStore.cartQuantity).toBe(0)
    wrapper.unmount()
  })

  test('prioritizes products from the active Shopping service account', async () => {
    const router = createTestRouter()
    const shoppingStore = useShoppingStore()
    shoppingStore.resetForTesting()
    shoppingStore.upsertProduct({
      id: 'service_other_product',
      title: 'Mall Generic Gift',
      category: 'gifts',
      serviceKey: 'schat_mall',
      price: '66.00',
      desc: 'General mall product',
      giftable: true,
    })
    const serviceProduct = shoppingStore.upsertProduct({
      id: 'service_style_product',
      title: 'Style Cloud Jacket',
      category: 'fashion',
      serviceKey: 'style_cloud',
      price: '399.00',
      desc: 'Service account filtered product',
      giftable: true,
    })
    const chatStore = useChatStore()
    const serviceContact = chatStore.addContact({
      name: 'Style Cloud',
      kind: 'service',
      role: 'Service account',
      serviceTemplate: 'Shopping shop account',
      shoppingServiceKey: 'style_cloud',
    })

    await router.push(`/chat/${serviceContact.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await nextTick()

    await wrapper.get('[data-testid="chat-user-action-toggle"]').trigger('click')
    await nextTick()

    expect(wrapper.get(`[data-testid="chat-shopping-preview-${serviceProduct.id}"]`).text()).toContain(
      'Style Cloud',
    )
    expect(wrapper.find('[data-testid="chat-shopping-preview-service_other_product"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('shows logistics reminders only in Logistics service accounts and routes to Shopping logistics', async () => {
    const router = createTestRouter()
    const shoppingStore = useShoppingStore()
    const calendarStore = useCalendarStore()
    shoppingStore.resetForTesting()
    calendarStore.resetForTesting()
    shoppingStore.upsertProduct({
      id: 'service_other_logistics_product',
      title: 'Mall Generic Gift',
      category: 'gifts',
      serviceKey: 'schat_mall',
      price: '66.00',
      giftable: true,
    })
    const serviceProduct = shoppingStore.upsertProduct({
      id: 'service_style_logistics_product',
      title: 'Style Cloud Jacket',
      category: 'fashion',
      serviceKey: 'style_cloud',
      price: '399.00',
      giftable: true,
    })
    shoppingStore.addToCart('service_other_logistics_product')
    const hiddenOrder = shoppingStore.checkoutCart()
    shoppingStore.addToCart(serviceProduct.id)
    const order = shoppingStore.checkoutCart({
      note: 'Delivery follow-up for Style Cloud.',
    })
    shoppingStore.addOrderEvent(order.id, {
      type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_ARRIVED,
      summary: 'Style Cloud parcel is ready for pickup.',
      carrierName: 'Standard Courier',
    })
    const chatStore = useChatStore()
    const shopContact = chatStore.addContact({
      name: 'Style Cloud',
      kind: 'service',
      role: 'Service account',
      serviceTemplate: 'Shopping shop account',
      shoppingServiceKey: 'style_cloud',
    })
    const logisticsContact = chatStore.addContact({
      name: 'Standard Courier',
      kind: 'service',
      role: 'Service account',
      serviceTemplate: 'Logistics service account',
      logisticsServiceKey: 'standard_courier',
    })

    await router.push(`/chat/${shopContact.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await nextTick()

    expect(wrapper.find('[data-testid="chat-service-logistics-context"]').exists()).toBe(false)

    await router.push(`/chat/${logisticsContact.id}`)
    await flushPromises()
    await nextTick()

    const logisticsContext = wrapper.get('[data-testid="chat-service-logistics-context"]')
    expect(logisticsContext.text()).toContain('Style Cloud Jacket')
    expect(logisticsContext.text()).toContain('399.00 CNY')
    expect(logisticsContext.text()).toContain('Style Cloud parcel is ready for pickup.')
    expect(wrapper.get(`[data-testid="chat-service-logistics-status-${order.id}"]`).text()).toMatch(
      /待跟进|Pending follow-up/,
    )
    expect(wrapper.find(`[data-testid="chat-service-logistics-${hiddenOrder.id}"]`).exists()).toBe(true)
    expect(wrapper.get(`[data-testid="chat-service-logistics-${hiddenOrder.id}"]`).text()).toContain(
      'Mall Generic Gift',
    )

    await wrapper.get(`[data-testid="chat-service-logistics-open-${order.id}"]`).trigger('click')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query).toMatchObject({
      source: 'chat',
      intent: 'logistics',
      chatId: String(logisticsContact.id),
      category: 'logistics',
      orderId: order.id,
    })
    expect(router.currentRoute.value.query.service).toBeUndefined()
    expect(shoppingStore.orderCount).toBe(2)
    expect(shoppingStore.cartQuantity).toBe(0)
    wrapper.unmount()
  })

  test('shows Food Delivery pushes only in Food Delivery service accounts and routes without side effects', async () => {
    const router = createTestRouter()
    const foodDeliveryStore = useFoodDeliveryStore()
    foodDeliveryStore.resetForTesting()
    const restaurant = foodDeliveryStore.upsertRestaurant({
      id: 'food_chat_moon_bistro',
      name: 'Moon Bistro',
      category: 'restaurants',
      deliveryFee: '6.00',
      address: 'Map Pin A',
    })
    const menuItem = foodDeliveryStore.upsertMenuItem({
      id: 'food_chat_lunar_rice',
      restaurantId: restaurant.id,
      title: 'Lunar Rice Set',
      category: 'restaurants',
      price: '58.00',
    })
    foodDeliveryStore.addToCart(menuItem.id)
    const order = foodDeliveryStore.checkoutCart({
      deliveryAddress: 'Map Pin A',
      note: 'Dinner delivery.',
    })
    foodDeliveryStore.updateOrderStatus(order.id, FOOD_DELIVERY_ORDER_STATUS.COOKING)
    foodDeliveryStore.addOrderEvent(order.id, {
      type: FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE,
      summary: 'ETA changed to 40 minutes.',
      etaMinutes: 40,
      sourceModule: 'food_delivery_dispatch',
    })

    const chatStore = useChatStore()
    const shopContact = chatStore.addContact({
      name: 'Style Cloud',
      kind: 'service',
      role: 'Service account',
      serviceTemplate: 'Shopping shop account',
      shoppingServiceKey: 'style_cloud',
    })
    const foodContact = chatStore.addContact({
      name: 'Food Delivery Dispatch',
      kind: 'service',
      role: 'Service account',
      serviceTemplate: 'Food delivery service account',
      foodDeliveryServiceKey: 'food_delivery_dispatch',
    })

    await router.push(`/chat/${shopContact.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await nextTick()

    expect(wrapper.find('[data-testid="chat-food-delivery-context"]').exists()).toBe(false)

    await router.push(`/chat/${foodContact.id}`)
    await flushPromises()
    await nextTick()

    const foodContext = wrapper.get('[data-testid="chat-food-delivery-context"]')
    expect(foodContext.text()).toContain('Moon Bistro')
    expect(foodContext.text()).toContain('Lunar Rice Set')
    expect(foodContext.text()).toContain('64.00 CNY')
    expect(foodContext.text()).toContain('Map Pin A')
    expect(wrapper.get(`[data-testid="chat-food-delivery-event-${order.id}"]`).text()).toContain(
      'ETA changed to 40 minutes.',
    )
    expect(wrapper.get(`[data-testid="chat-food-delivery-status-${order.id}"]`).text()).toMatch(
      /备餐中|Cooking/,
    )

    await wrapper.get(`[data-testid="chat-food-delivery-open-${order.id}"]`).trigger('click')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.path).toBe('/food-delivery')
    expect(router.currentRoute.value.query).toMatchObject({
      source: 'chat',
      intent: 'food_delivery_order',
      chatId: String(foodContact.id),
      service: 'food_delivery_dispatch',
      orderId: order.id,
    })
    expect(foodDeliveryStore.orderCount).toBe(1)
    expect(foodDeliveryStore.cartQuantity).toBe(0)
    wrapper.unmount()
  })
})
