import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import ShoppingView from '../src/views/ShoppingView.vue'
import { ASSET_SOURCE_KEYS } from '../src/lib/planned-module-registry'
import { useAssetsStore } from '../src/stores/assets'
import { useCalendarStore } from '../src/stores/calendar'
import { useChatStore } from '../src/stores/chat'
import { useGalleryStore } from '../src/stores/gallery'
import { useMapStore } from '../src/stores/map'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import {
  SHOPPING_ORDER_EVENT_TYPE,
  useShoppingStore,
} from '../src/stores/shopping'
import { useSystemStore } from '../src/stores/system'
import { useWalletStore } from '../src/stores/wallet'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat', component: DummyView },
      { path: '/chat/:id', component: DummyView },
      { path: '/home', component: DummyView },
      { path: '/shopping', component: ShoppingView },
    ],
  })

describe('ShoppingView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('renders products for the active category and creates local orders', async () => {
    const router = createTestRouter()
    const store = useShoppingStore()
    const assetsStore = useAssetsStore()
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const walletStore = useWalletStore()
    store.resetForTesting()
    assetsStore.resetForTesting()
    relationshipRuntimeStore.resetForTesting()
    walletStore.resetForTesting()
    const product = store.upsertProduct({
      id: 'product_view_lens',
      title: 'Mira Lens',
      category: 'digital',
      price: '1288.00',
      assetEligible: true,
      giftable: true,
    })
    const sourceContact = chatStore.getContactById(1)
    await router.push(`/shopping?category=digital&productId=${product.id}&source=chat&intent=product_card&chatId=1`)
    await router.isReady()

    const wrapper = mount(ShoppingView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find(`[data-testid="shopping-product-${product.id}"]`).exists()).toBe(true)
    expect(wrapper.find(`[data-testid="shopping-product-${product.id}"]`).classes()).toContain('border-orange-300')
    expect(wrapper.find('[data-testid="shopping-chat-source-banner"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Mira Lens')
    expect(wrapper.text()).toContain('联动边界状态')
    expect(wrapper.text()).toContain('Chat 商品卡片')
    expect(wrapper.text()).toContain('Calendar 配送线索')
    expect(wrapper.text()).toContain('Wallet 消费记账')
    expect(wrapper.text()).toContain('用户确认')

    await wrapper.find(`[data-testid="shopping-add-cart-${product.id}"]`).trigger('click')
    expect(store.cartQuantity).toBe(1)
    expect(wrapper.text()).toContain('1288.00 CNY')
    expect(wrapper.find('[data-testid="shopping-gift-enabled"]').element.checked).toBe(true)

    await wrapper.find('[data-testid="shopping-checkout"]').trigger('click')
    expect(store.cartQuantity).toBe(0)
    expect(store.orderCount).toBe(1)
    expect(wrapper.text()).toContain('Mira Lens')
    const order = store.orders[0]
    expect(order.giftRecipient).toMatchObject({
      name: sourceContact.name,
      chatId: 1,
      contactId: 1,
      profileId: sourceContact.profileId,
      kind: sourceContact.kind,
      sourceModule: 'chat',
    })
    expect(wrapper.find(`[data-testid="shopping-order-gift-${order.id}"]`).text()).toContain(sourceContact.name)

    expect(assetsStore.assetCount).toBe(0)
    expect(wrapper.find(`[data-testid="shopping-asset-suggestion-${product.id}"]`).exists()).toBe(true)

    await wrapper.find(`[data-testid="shopping-transfer-asset-${product.id}"]`).trigger('click')
    const importedAsset = assetsStore.assetRecords.find((item) => item.sourceId.includes(product.id))

    expect(importedAsset).toMatchObject({
      name: 'Mira Lens',
      category: 'special',
      estimatedValueCents: 128800,
      purchaseValueCents: 128800,
      sourceModule: ASSET_SOURCE_KEYS.SHOPPING_PURCHASE,
      tags: ['shopping'],
    })
    expect(wrapper.find(`[data-testid="shopping-transfer-asset-${product.id}"]`).attributes('disabled')).toBeDefined()

    expect(walletStore.transactionCount).toBe(0)
    expect(wrapper.find(`[data-testid="shopping-wallet-suggestion-${order.id}"]`).exists()).toBe(false)

    store.markOrderCompleted(order.id)
    await flushPromises()
    expect(wrapper.find(`[data-testid="shopping-wallet-suggestion-${order.id}"]`).exists()).toBe(true)
    expect(wrapper.get(`[data-testid="shopping-relationship-suggestion-${order.id}"]`).text()).toContain(
      sourceContact.name,
    )

    await wrapper.find(`[data-testid="shopping-transfer-wallet-${order.id}"]`).trigger('click')
    const walletTransaction = walletStore.findTransactionBySource('shopping_wallet_expense', order.id)
    const relationshipSummary = relationshipRuntimeStore.summarizeEntityForTarget({
      profileId: sourceContact.profileId,
      contactId: sourceContact.id,
      name: sourceContact.name,
    })

    expect(walletTransaction).toMatchObject({
      type: 'expense',
      title: 'Shopping order',
      amountCents: 128800,
      currency: 'CNY',
      counterparty: 'Shopping',
      sourceModule: 'shopping_wallet_expense',
      sourceId: order.id,
    })
    expect(relationshipSummary.metrics.affinity).toBe(58)
    expect(relationshipSummary.metrics.intimacy).toBe(24)
    expect(relationshipSummary.latestEventSummary).toContain('Gift purchased')
    expect(relationshipSummary.memorySummaries).toHaveLength(1)
    expect(relationshipSummary.memorySummaries[0]).toMatchObject({
      supportingCount: 2,
      primarySourceModule: 'relationship_shopping_gift',
    })
    expect(relationshipSummary.memorySummaries[0].sourceModules).toContain('relationship_wallet_order_support')
    expect(wrapper.find(`[data-testid="shopping-transfer-wallet-${order.id}"]`).attributes('disabled')).toBeDefined()

    await wrapper.find('[data-testid="shopping-return-chat"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/chat/1')
    wrapper.unmount()
  })

  test('creates user custom products with URL and Gallery images', async () => {
    const router = createTestRouter()
    const store = useShoppingStore()
    const galleryStore = useGalleryStore()
    store.resetForTesting()
    galleryStore.resetForTesting()
    const imported = galleryStore.importAssetFromUrl({
      url: 'https://example.com/gallery-cover.png',
      name: 'Gallery Cover',
      category: 'reference',
    })

    await router.push('/shopping?category=fashion')
    await router.isReady()

    const wrapper = mount(ShoppingView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="shopping-custom-title"]').setValue('Nova Jacket')
    await wrapper.get('[data-testid="shopping-custom-category"]').setValue('fashion')
    await wrapper.get('[data-testid="shopping-custom-price"]').setValue('399.00')
    await wrapper.get('[data-testid="shopping-custom-service"]').setValue('style_cloud')
    await wrapper.get('[data-testid="shopping-custom-image-source"]').setValue('url')
    await wrapper.get('[data-testid="shopping-custom-image-url"]').setValue('https://example.com/nova-jacket.png')
    await wrapper.get('[data-testid="shopping-custom-desc"]').setValue('Custom URL product')
    await wrapper.get('[data-testid="shopping-create-custom-product"]').trigger('click')
    await flushPromises()

    const urlProduct = store.products.find((item) => item.title === 'Nova Jacket')
    expect(urlProduct).toMatchObject({
      category: 'fashion',
      origin: 'user',
      serviceKey: 'style_cloud',
      sourceModule: 'shopping_user_custom',
      image: {
        sourceType: 'url',
        url: 'https://example.com/nova-jacket.png',
      },
    })
    expect(router.currentRoute.value.query.productId).toBe(urlProduct.id)
    expect(router.currentRoute.value.query.service).toBe('style_cloud')
    expect(wrapper.get(`[data-testid="shopping-product-${urlProduct.id}"] img`).attributes('src')).toBe(
      'https://example.com/nova-jacket.png',
    )
    expect(wrapper.get(`[data-testid="shopping-product-${urlProduct.id}"]`).text()).toContain('Style Cloud')

    await wrapper.get('[data-testid="shopping-custom-title"]').setValue('Gallery Lamp')
    await wrapper.get('[data-testid="shopping-custom-category"]').setValue('home')
    await wrapper.get('[data-testid="shopping-custom-price"]').setValue('88.00')
    await wrapper.get('[data-testid="shopping-custom-service"]').setValue('schat_mall')
    await wrapper.get('[data-testid="shopping-custom-image-source"]').setValue('gallery')
    expect(imported.ok).toBe(true)
    await wrapper.get('[data-testid="shopping-custom-gallery-asset"]').setValue(imported.assetId)
    await wrapper.get('[data-testid="shopping-create-custom-product"]').trigger('click')
    await flushPromises()

    const galleryProduct = store.products.find((item) => item.title === 'Gallery Lamp')
    expect(galleryProduct).toMatchObject({
      category: 'home',
      origin: 'user',
      serviceKey: 'schat_mall',
      image: {
        sourceType: 'gallery',
        galleryAssetId: imported.assetId,
      },
    })
    expect(router.currentRoute.value.query.productId).toBe(galleryProduct.id)
    expect(wrapper.get(`[data-testid="shopping-product-${galleryProduct.id}"] img`).attributes('src')).toBe(
      'https://example.com/gallery-cover.png',
    )

    await wrapper.get('[data-testid="shopping-service-style_cloud"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.service).toBe('style_cloud')
    expect(wrapper.find(`[data-testid="shopping-product-${galleryProduct.id}"]`).exists()).toBe(false)
    expect(wrapper.get('[data-testid="shopping-service-all"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('presents a selected folder platform as the active shopping app', async () => {
    const router = createTestRouter()
    const store = useShoppingStore()
    store.resetForTesting()
    await router.push('/shopping?service=nova_digital&category=digital')
    await router.isReady()

    const wrapper = mount(ShoppingView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('h1').text()).toBe('Nova Digital')
    expect(wrapper.text()).toContain('Nova Digital')
    expect(wrapper.get('[data-testid="shopping-service-nova_digital"]').classes()).toContain('border-amber-300')
    expect(wrapper.find('[data-testid="shopping-category-digital"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="shopping-category-luxury"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="shopping-category-fashion"]').exists()).toBe(false)
    wrapper.unmount()
  })

  test('shows active World Pack Shopping context without mutating commerce state', async () => {
    const router = createTestRouter()
    const store = useShoppingStore()
    const systemStore = useSystemStore()
    store.resetForTesting()
    systemStore.settings.system.language = 'zh-CN'
    systemStore.activateWorldPack('survival_city')

    await router.push('/shopping?worldPack=survival_city&worldApp=survival_supply_board')
    await router.isReady()

    const wrapper = mount(ShoppingView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('h1').text()).toBe('补给站')
    const banner = wrapper.get('[data-testid="shopping-world-app-context"]')
    expect(banner.text()).toContain('补给站')
    expect(banner.text()).toContain('灾后生存都市')
    expect(banner.get('[data-testid="shopping-world-app-boundary"]').text()).toContain('Shopping 仍拥有商品')
    expect(store.cartQuantity).toBe(0)
    expect(store.orderCount).toBe(0)

    await wrapper.get('[data-testid="shopping-world-app-apply-filter"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toMatchObject({
      worldPack: 'survival_city',
      worldApp: 'survival_supply_board',
      service: 'daily_fresh',
      category: 'grocery',
    })
    expect(wrapper.get('[data-testid="shopping-service-daily_fresh"]').classes()).toContain('border-amber-300')
    expect(wrapper.get('[data-testid="shopping-category-grocery"]').classes()).toContain('border-orange-300')
    expect(store.cartQuantity).toBe(0)
    expect(store.orderCount).toBe(0)

    wrapper.unmount()
  })

  test('highlights a gift order when opened from Chat gift context', async () => {
    const router = createTestRouter()
    const store = useShoppingStore()
    const calendarStore = useCalendarStore()
    store.resetForTesting()
    calendarStore.resetForTesting()
    const product = store.upsertProduct({
      id: 'gift_order_lens',
      title: 'Mira Lens',
      category: 'digital',
      price: '1288.00',
      giftable: true,
    })
    store.addToCart(product.id)
    const order = store.checkoutCart({
      giftRecipient: {
        name: 'Mira',
        chatId: 1,
        contactId: 1,
        sourceModule: 'chat',
      },
    })

    await router.push(`/shopping?source=chat&intent=gift_order&chatId=1&orderId=${order.id}`)
    await router.isReady()

    const wrapper = mount(ShoppingView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.get('[data-testid="shopping-chat-source-banner"]').text()).toContain('From Chat gift order')
    expect(wrapper.get(`[data-testid="shopping-order-${order.id}"]`).classes()).toContain('border-rose-300')
    expect(wrapper.get(`[data-testid="shopping-highlighted-order-${order.id}"]`).text()).toContain(
      'Chat gift order context',
    )
    expect(wrapper.get(`[data-testid="shopping-order-gift-${order.id}"]`).text()).toContain('Mira')
    expect(wrapper.get('[data-testid="shopping-order-detail-panel"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="shopping-order-detail-total"]').text()).toContain('1288.00 CNY')
    expect(wrapper.get('[data-testid="shopping-order-detail-status"]').text()).toContain('Placed')
    expect(wrapper.get(`[data-testid="shopping-order-detail-item-${product.id}"]`).text()).toContain('Mira Lens')
    expect(wrapper.get('[data-testid="shopping-order-detail-gift"]').text()).toContain('Mira')

    expect(calendarStore.findShoppingDeliveryCueByOrderId(order.id)?.status).toBe('suggested')
    await wrapper.get('[data-testid="shopping-order-detail-complete"]').trigger('click')
    expect(store.orders[0].status).toBe('completed')
    expect(wrapper.get('[data-testid="shopping-order-detail-status"]').text()).toContain('Completed')
    expect(calendarStore.findShoppingDeliveryCueByOrderId(order.id)?.status).toBe('dismissed')
    expect(wrapper.get('[data-testid="shopping-order-detail-complete"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="shopping-order-detail-cancel"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-testid="shopping-close-order-detail"]').trigger('click')
    expect(wrapper.find('[data-testid="shopping-order-detail-panel"]').exists()).toBe(false)
    await wrapper.get(`[data-testid="shopping-open-order-detail-${order.id}"]`).trigger('click')
    expect(wrapper.get('[data-testid="shopping-order-detail-panel"]').exists()).toBe(true)

    await wrapper.get('[data-testid="shopping-return-chat"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/chat/1')
    wrapper.unmount()
  })

  test('shows logistics as a peer Shopping entry backed by order delivery cues', async () => {
    const router = createTestRouter()
    const store = useShoppingStore()
    const calendarStore = useCalendarStore()
    const mapStore = useMapStore()
    store.resetForTesting()
    calendarStore.resetForTesting()
    mapStore.resetTripRuntimeForTesting()
    const product = store.upsertProduct({
      id: 'logistics_order_lens',
      title: 'Mira Lens',
      category: 'digital',
      price: '1288.00',
      giftable: true,
    })
    store.addToCart(product.id)
    const order = store.checkoutCart()
    store.addOrderEvent(order.id, {
      type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED,
      summary: 'Standard courier picked up Mira Lens.',
      carrierName: 'Standard Courier',
      trackingCode: 'TRACK-MIRA-01',
      pickupPoint: 'Standard Courier Station 8',
      locationHint: 'North Hub',
      etaDays: 2,
    })

    await router.push('/shopping?category=logistics')
    await router.isReady()

    const wrapper = mount(ShoppingView, {
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.get('[data-testid="shopping-logistics-panel"]').text()).toContain('物流')
    expect(wrapper.find('[data-testid="shopping-custom-product-form"] option[value="logistics"]').exists()).toBe(
      false,
    )
    expect(wrapper.get(`[data-testid="shopping-logistics-order-${order.id}"]`).text()).toContain('Mira Lens')
    expect(wrapper.get(`[data-testid="shopping-logistics-latest-event-${order.id}"]`).text()).toContain(
      'Standard courier picked up Mira Lens.',
    )
    expect(wrapper.get(`[data-testid="shopping-logistics-latest-event-${order.id}"]`).text()).toContain(
      'TRACK-MIRA-01',
    )
    const mapContext = wrapper.get(`[data-testid="shopping-logistics-map-context-${order.id}"]`)
    expect(mapContext.text()).toContain('Map route context')
    expect(mapContext.text()).toContain('Shopping logistics')
    expect(mapContext.text()).toContain('Standard Courier Station 8')
    expect(mapContext.text()).toContain('TRACK-MIRA-01')
    expect(mapContext.text()).toContain('does not start a trip')
    expect(mapStore.tripState.status).toBe('idle')
    expect(mapStore.tripHistory).toHaveLength(0)
    expect(wrapper.get(`[data-testid="shopping-logistics-status-${order.id}"]`).text()).toContain(
      'Pending follow-up',
    )
    expect(wrapper.get(`[data-testid="shopping-logistics-calendar-${order.id}"]`).exists()).toBe(true)
    expect(wrapper.find(`[data-testid="shopping-product-${product.id}"]`).exists()).toBe(false)

    await wrapper.get(`[data-testid="shopping-logistics-detail-${order.id}"]`).trigger('click')
    expect(wrapper.get('[data-testid="shopping-order-detail-panel"]').exists()).toBe(true)
    expect(calendarStore.findShoppingDeliveryCueByOrderId(order.id)?.status).toBe('suggested')

    wrapper.unmount()
  })
})
