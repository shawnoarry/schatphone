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
    expect(wrapper.text()).not.toContain('商品管理')
    expect(wrapper.text()).not.toContain('添加你的世界商品')
    expect(wrapper.find('[data-testid="shopping-custom-product-form"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('opens App Store catalog setup directly outside the consumer storefront', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const { router, wrapper } = await mountShopping('/shopping/schat_mall?entry=shop&createShop=1&bindingTarget=shopping&source=app_store')
    await flushPromises()
    expect(wrapper.get('[data-testid="shopping-custom-product-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="shopping-coupang-home"]').exists()).toBe(false)
    await wrapper.get('.shopping-subpage-header button').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="shopping-coupang-home"]').exists()).toBe(true)
    expect(router.currentRoute.value.query.createShop).toBeUndefined()
    expect(router.currentRoute.value.query.bindingTarget).toBeUndefined()
    expect(router.currentRoute.value.query.source).toBeUndefined()
    wrapper.unmount()
  })

  test.each([
    ['musinsa_style', 'fashion', 'style', '.musinsa-product-open'],
    ['boon_select', 'fashion', 'piece', '.boon-visual'],
    ['galleria_luxury', 'luxury', 'piece', '.galleria-product-open'],
  ])('opens %s product detail from an explicit product control', async (serviceKey, category, productView, openSelector) => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({ id: `home_detail_${serviceKey}`, serviceKey, title: `${serviceKey} Detail Product`, category, price: '188.00' })
    const { router, wrapper } = await mountShopping(`/shopping/${serviceKey}?category=${category}`)
    await wrapper.get(`[data-testid="shopping-product-${product.id}"] ${openSelector}`).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toMatchObject({ shopView: productView, productId: product.id })
    expect(wrapper.get('[data-testid="shopping-store-specific-page"]').text()).toContain(product.title)
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

  test('keeps an independent 29CM shell with ordinary shopping vocabulary', async () => {
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
    expect(wrapper.get('#shopping-cart').text()).toContain('SHOPPING BAG')
    expect(wrapper.get('#shopping-cart').text()).not.toContain('CONSIDERED OBJECTS')
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

  test.each([
    ['schat_mall', 'help', 'orders', '.cp-service > header > button:last-child'],
    ['nova_digital', 'care', 'archive', '.cm-service-bar nav button:first-child'],
    ['daily_fresh', 'market-help', 'deliveries', '.kurly-service > header > button:last-child'],
    ['style_cloud', 'support', 'releases', '.wo-service > header > button:last-child'],
    ['nordhus_home', 'service', 'projects', '.ik-service > header > button:last-child'],
    ['mellow_care', 'care-desk', 'restocks', '.oy-service > header > button:last-child'],
    ['traders_club', 'member-service', 'pickups', '.tr-service > header > button:last-child'],
    ['cu_24', 'store-help', 'pickups', '.cu-service > header > button:last-child'],
    ['musinsa_style', 'returns', 'purchases', '.mu-service-bar nav button:first-child'],
    ['boon_select', 'atelier-service', 'appointments', '.boon-service-bar nav button:first-child'],
    ['galleria_luxury', 'concierge', 'services', '.gal-service-bar > button:last-child'],
  ])('keeps %s service header actions route-backed', async (serviceKey, serviceView, ordersView, selector) => {
    const store = useShoppingStore()
    store.resetForTesting()
    const { router, wrapper } = await mountShopping(`/shopping/${serviceKey}?shopView=${serviceView}`)
    await wrapper.get(selector).trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.shopView).toBe(ordersView)
    wrapper.unmount()
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
    await wrapper.get('[data-testid="shopping-payment-submit"]').trigger('click')
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

  test('keeps Kurly product information in exclusive tabs', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({ id: 'route_product_kurly_tabs', serviceKey: 'daily_fresh', title: 'Morning Produce', category: 'grocery', price: '18.00' })
    const { wrapper } = await mountShopping(`/shopping/daily_fresh?shopView=item&productId=${product.id}`)
    expect(wrapper.text()).toContain('购买前需要知道的')
    expect(wrapper.text()).not.toContain('这个商品还没有评价')
    await wrapper.get('.kp-pdp-tabs').findAll('button')[1].trigger('click')
    expect(wrapper.text()).not.toContain('购买前需要知道的')
    expect(wrapper.text()).toContain('这个商品还没有评价')
    wrapper.unmount()
  })

  test('shows Kurly basket line totals from product price truth', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({ id: 'route_product_kurly_total', serviceKey: 'daily_fresh', title: 'Morning Produce', category: 'grocery', price: '18.00' })
    store.addToCart(product.id)
    const { wrapper } = await mountShopping('/shopping/daily_fresh?shopView=basket')
    expect(wrapper.get('#shopping-cart').text()).toContain('18.00 CNY')
    expect(wrapper.get('#shopping-cart').text()).not.toContain('0.00 CNY')
    wrapper.unmount()
  })

  test('requires confirmation before deleting a Kurly order record', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({ id: 'route_product_kurly_delete', serviceKey: 'daily_fresh', title: 'Morning Produce', category: 'grocery', price: '18.00' })
    store.addToCart(product.id)
    const order = store.checkoutCart({ serviceKey: 'daily_fresh' })
    const { wrapper } = await mountShopping(`/shopping/daily_fresh?shopView=delivery&orderId=${order.id}`)
    await wrapper.get('[data-testid="shopping-order-detail-delete"]').trigger('click')
    expect(store.listOrdersByService('daily_fresh')).toHaveLength(1)
    expect(wrapper.get('[data-testid="shopping-order-detail-delete-confirm"]').exists()).toBe(true)
    await wrapper.findAll('.ko-detail > footer button').find((button) => button.text() === '保留记录').trigger('click')
    expect(store.listOrdersByService('daily_fresh')).toHaveLength(1)
    expect(wrapper.find('[data-testid="shopping-order-detail-delete-confirm"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('keeps IKEA product information in exclusive purchase tabs without invented specifications', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({ id: 'route_product_ikea_tabs', serviceKey: 'nordhus_home', title: 'Compact Shelf', category: 'home', price: '88.00', desc: 'A compact shelf for a small room.' })
    const { wrapper } = await mountShopping(`/shopping/nordhus_home?shopView=product&productId=${product.id}`)
    expect(wrapper.text()).toContain('把单品放回真实的生活任务中判断')
    expect(wrapper.text()).not.toContain('还没有商品评价')
    expect(wrapper.text()).not.toContain('84 CM')
    expect(wrapper.text()).not.toContain('35 MIN')
    await wrapper.get('.ik-pdp-tabs').findAll('button')[2].trigger('click')
    expect(wrapper.text()).not.toContain('把单品放回真实的生活任务中判断')
    expect(wrapper.text()).toContain('还没有商品评价')
    wrapper.unmount()
  })

  test('resets the Shopping scroll position when entering an IKEA product page', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    store.upsertProduct({ id: 'shopping_seed_nordhus_lamp', serviceKey: 'nordhus_home', title: 'Moon Lamp', category: 'home', price: '68.00' })
    const { router, wrapper } = await mountShopping('/shopping/nordhus_home?category=home')
    const scroll = wrapper.get('.shopping-scroll').element
    scroll.scrollTop = 640
    await wrapper.get('[data-testid="shopping-product-shopping_seed_nordhus_lamp"] .ikea-product-media').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.productId).toBe('shopping_seed_nordhus_lamp')
    expect(scroll.scrollTop).toBe(0)
    wrapper.unmount()
  })

  test('keeps logistics out of every storefront home taxonomy', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const { wrapper } = await mountShopping('/shopping/cu_24?category=grocery')
    expect(wrapper.find('[data-testid="shopping-category-logistics"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('falls back from a legacy logistics category on the storefront home', async () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({ id: 'legacy_logistics_fallback', serviceKey: 'mellow_care', title: 'Daily Care Set', category: 'beauty', price: '24.00' })
    const { wrapper } = await mountShopping('/shopping/mellow_care?category=logistics')
    expect(wrapper.get('.shopping-olive-young-app').exists()).toBe(true)
    expect(wrapper.find('[data-testid="shopping-category-logistics"]').exists()).toBe(false)
    expect(wrapper.get(`[data-testid="shopping-product-${product.id}"]`).exists()).toBe(true)
    expect(wrapper.findAll('.shopping-product-card[role="button"]')).toHaveLength(0)
    expect(wrapper.findAll('.shopping-product-card button button')).toHaveLength(0)
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
