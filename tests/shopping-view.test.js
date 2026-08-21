import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ShoppingView from '../src/views/ShoppingView.vue'
import { SHOPPING_ORDER_EVENT_TYPE, useShoppingStore } from '../src/stores/shopping'

const DummyView = { template: '<div />' }
const createTestRouter = () => createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/home', component: DummyView },
    { path: '/chat', component: DummyView },
    { path: '/chat/:id', component: DummyView },
    { path: '/reminders', component: DummyView },
    { path: '/shopping/:serviceKey', component: ShoppingView },
  ],
})

const mountShopping = async (url) => {
  const router = createTestRouter()
  await router.push(url)
  await router.isReady()
  return { router, wrapper: mount(ShoppingView, { global: { plugins: [router] } }) }
}

describe('ShoppingView multi-page storefront contract', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('keeps store home focused on discovery', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const { wrapper } = await mountShopping('/shopping/schat_mall?category=mall')
    expect(wrapper.get('h1').text()).toBe('Coupang')
    expect(wrapper.find('#shopping-products').exists()).toBe(true)
    expect(wrapper.find('#shopping-cart').exists()).toBe(false)
    expect(wrapper.find('#shopping-orders').exists()).toBe(false)
    expect(wrapper.find('[data-testid="shopping-product-quick-view"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('opens a route-backed catalog and full product page', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({ id: 'route_product_coupang', serviceKey: 'schat_mall', title: 'Route Product', category: 'mall', price: '28.00' })
    const { router, wrapper } = await mountShopping('/shopping/schat_mall?shopView=search&category=mall&page=1')
    expect(wrapper.get('[data-testid="shopping-store-specific-page"]').classes()).toContain('coupang-pages')
    await wrapper.get(`[data-testid="shopping-product-${product.id}"] .cp-title`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ shopView: 'product', productId: product.id })
    expect(wrapper.get('[data-testid="shopping-store-specific-page"]').text()).toContain(product.title)
    await wrapper.get('[data-testid="shopping-product-add"]').trigger('click')
    expect(store.getCartQuantityByService('schat_mall')).toBe(1)
    wrapper.unmount()
  })

  test('uses independent page vocabulary for editorial storefronts', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({ id: 'route_product_29cm', serviceKey: 'nova_digital', title: 'Editorial Object', category: 'digital', price: '128.00' })
    const { router, wrapper } = await mountShopping('/shopping/nova_digital?shopView=objects&category=digital&page=1')
    expect(wrapper.get('[data-testid="shopping-store-specific-page"]').classes()).toContain('cm-pages')
    await wrapper.get(`[data-testid="shopping-product-${product.id}"] .cm-object-copy > button`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('object')
    await wrapper.get('[data-testid="shopping-page-cart"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('bag')
    expect(wrapper.get('[data-testid="shopping-store-operation-page"]').classes()).toContain('cm-ops')
    expect(wrapper.get('#shopping-cart').text()).toContain('CONSIDERED OBJECTS')
    wrapper.unmount()
  })

  test.each([
    ['schat_mall', 'cart', 'cp-ops'],
    ['nova_digital', 'bag', 'cm-ops'],
    ['daily_fresh', 'basket', 'k-ops'],
    ['style_cloud', 'bag', 'wo-ops'],
    ['nordhus_home', 'list', 'ik-ops'],
    ['mellow_care', 'routine', 'oy-ops'],
    ['traders_club', 'trolley', 'tr-ops'],
    ['cu_24', 'pickup-bag', 'cu-ops'],
    ['musinsa_style', 'bag', 'mu-ops'],
    ['boon_select', 'fitting-list', 'boon-ops'],
    ['galleria_luxury', 'request', 'gal-ops'],
  ])('routes %s cart vocabulary to its own operation app', async (serviceKey, shopView, className) => {
    const store = useShoppingStore()
    store.resetForTesting()
    const { wrapper } = await mountShopping(`/shopping/${serviceKey}?shopView=${shopView}`)
    expect(wrapper.get('[data-testid="shopping-store-operation-page"]').classes()).toContain(className)
    expect(wrapper.find('.shopping-operation-section').exists()).toBe(false)
    expect(wrapper.find('#shopping-cart').exists()).toBe(true)
    wrapper.unmount()
  })

  test.each([
    ['schat_mall', 'checkout', 'help', 'cp-service'],
    ['nova_digital', 'review', 'care', 'cm-service'],
    ['daily_fresh', 'dawn-review', 'market-help', 'k-service'],
    ['style_cloud', 'release-check', 'support', 'wo-service'],
    ['nordhus_home', 'project-review', 'service', 'ik-service'],
    ['mellow_care', 'routine-review', 'care-desk', 'oy-service'],
    ['traders_club', 'load-review', 'member-service', 'tr-service'],
    ['cu_24', 'pickup-review', 'store-help', 'cu-service'],
    ['musinsa_style', 'fit-review', 'returns', 'mu-service'],
    ['boon_select', 'fitting-request', 'atelier-service', 'boon-service'],
    ['galleria_luxury', 'concierge-review', 'concierge', 'gal-service'],
  ])('routes %s checkout and service to independent page families', async (serviceKey, checkoutView, serviceView, className) => {
    const store = useShoppingStore()
    store.resetForTesting()
    const checkoutMount = await mountShopping(`/shopping/${serviceKey}?shopView=${checkoutView}`)
    expect(checkoutMount.wrapper.get('[data-testid="shopping-store-service-page"]').classes()).toContain(className)
    expect(checkoutMount.wrapper.get('[data-testid="shopping-checkout-review"]').exists()).toBe(true)
    checkoutMount.wrapper.unmount()

    const serviceMount = await mountShopping(`/shopping/${serviceKey}?shopView=${serviceView}`)
    expect(serviceMount.wrapper.get('[data-testid="shopping-store-service-page"]').classes()).toContain(className)
    expect(serviceMount.wrapper.get('[data-testid="shopping-service-page"]').exists()).toBe(true)
    serviceMount.wrapper.unmount()
  })

  test('keeps gift checkout wired through a store-specific cart', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({ id: 'route_product_galleria_gift', serviceKey: 'galleria_luxury', title: 'Private Gift Piece', category: 'luxury', price: '288.00' })
    store.addToCart(product.id)
    const { router, wrapper } = await mountShopping('/shopping/galleria_luxury?shopView=request')
    await wrapper.get('[data-testid="shopping-gift-enabled"]').setValue(true)
    await wrapper.get('[data-testid="shopping-gift-name"]').setValue('Minji')
    await wrapper.get('[data-testid="shopping-checkout"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('concierge-review')
    expect(store.listOrdersByService('galleria_luxury')).toHaveLength(0)
    expect(wrapper.get('[data-testid="shopping-checkout-review"]').exists()).toBe(true)
    await wrapper.get('[data-testid="shopping-place-order"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe('services')
    expect(store.listOrdersByService('galleria_luxury')[0].giftRecipient?.name).toBe('Minji')
    wrapper.unmount()
  })

  test('paginates growing catalogs through the route', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    for (let index = 0; index < 8; index += 1) {
      store.upsertProduct({ id: `pagination_product_${index}`, serviceKey: 'schat_mall', title: `Pagination Product ${index}`, category: 'mall', price: `${20 + index}.00` })
    }
    const { router, wrapper } = await mountShopping('/shopping/schat_mall?shopView=search&category=mall&page=1')
    const pagination = wrapper.get('[data-testid="shopping-pagination"]')
    expect(pagination.exists()).toBe(true)
    await pagination.findAll('button')[1].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.page).toBe('2')
    wrapper.unmount()
  })

  test('opens orders and detail as focused routes', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({ id: 'route_product_kurly', serviceKey: 'daily_fresh', title: 'Morning Produce', category: 'grocery', price: '18.00' })
    store.addToCart(product.id)
    const order = store.checkoutCart({ serviceKey: 'daily_fresh' })
    const { router, wrapper } = await mountShopping('/shopping/daily_fresh?shopView=deliveries')
    await wrapper.get(`[data-testid="shopping-open-order-detail-${order.id}"]`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ shopView: 'delivery', orderId: order.id })
    expect(wrapper.get('[data-testid="shopping-order-detail-panel"]').text()).toContain(order.items[0].title)
    wrapper.unmount()
  })

  test('keeps logistics out of every storefront home taxonomy', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const { wrapper } = await mountShopping('/shopping/cu_24?category=grocery')
    expect(wrapper.find('[data-testid="shopping-category-logistics"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('keeps logistics isolated and route-backed', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({ id: 'route_product_logistics', serviceKey: 'nova_digital', title: 'Tracked Object', category: 'digital', price: '88.00' })
    store.addToCart(product.id)
    const order = store.checkoutCart({ serviceKey: 'nova_digital' })
    store.addOrderEvent(order.id, { type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED, summary: 'Courier picked up the order.', trackingCode: 'TRACK-29-01' })
    const { wrapper } = await mountShopping('/shopping/nova_digital?shopView=delivery&category=logistics')
    expect(wrapper.get('[data-testid="shopping-logistics-panel"]').text()).toContain('TRACK-29-01')
    expect(wrapper.find('[data-testid="shopping-collection-page"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
