import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { SHOPPING_SOURCE_KEYS } from '../src/lib/planned-module-registry'
import { useCalendarStore } from '../src/stores/calendar'
import { useShoppingStore } from '../src/stores/shopping'

describe('shopping store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('seeds local products and supports category listing', () => {
    const store = useShoppingStore()

    expect(store.productCount).toBeGreaterThan(0)
    expect(store.listProductsByCategory('digital').length).toBeGreaterThan(0)
    expect(store.listProductsByCategory('unknown').length).toBe(store.productCount)
  })

  test('upserts products, toggles favorites, and rejects invalid records', () => {
    const store = useShoppingStore()
    store.resetForTesting()

    expect(store.upsertProduct({ title: '', price: '10' })).toBeNull()
    expect(store.upsertProduct({ title: 'Broken', price: '0' })).toBeNull()

    const product = store.upsertProduct({
      id: 'product_nova',
      title: 'Nova Gift',
      category: 'gifts',
      price: '18.80',
      desc: 'Gift sample',
      origin: 'user',
      serviceKey: 'schat_mall',
      imageSourceType: 'url',
      imageUrl: 'https://example.com/nova.png',
    })

    expect(product).toMatchObject({
      id: 'product_nova',
      title: 'Nova Gift',
      category: 'gifts',
      priceCents: 1880,
      currency: 'CNY',
      origin: 'user',
      serviceKey: 'schat_mall',
      image: {
        sourceType: 'url',
        url: 'https://example.com/nova.png',
      },
    })
    expect(store.toggleProductFavorite(product.id)).toBe(true)
    expect(store.favoriteCount).toBe(1)
    expect(store.favoriteProducts[0]?.id).toBe(product.id)
    expect(store.listProductsByService('schat_mall').map((item) => item.id)).toContain(product.id)
    expect(store.toggleProductFavorite(product.id)).toBe(true)
    expect(store.favoriteCount).toBe(0)

    const galleryProduct = store.upsertProduct({
      id: 'product_gallery',
      title: 'Gallery Product',
      category: 'mall',
      price: '28.00',
      imageSourceType: 'gallery',
      imageGalleryAssetId: 'asset_product_cover',
    })
    expect(galleryProduct?.image).toMatchObject({
      sourceType: 'gallery',
      galleryAssetId: 'asset_product_cover',
    })
    expect(galleryProduct?.serviceKey).toBe('schat_mall')

    const aiProduct = store.upsertProduct({
      id: 'product_ai_draft',
      title: 'AI Draft Product',
      category: 'mall',
      price: '48.00',
      origin: 'ai',
      imageSourceType: 'ai',
      imagePrompt: 'Soft product photo on warm table',
    })
    expect(aiProduct).toMatchObject({
      origin: 'ai',
      image: {
        sourceType: 'ai',
        prompt: 'Soft product photo on warm table',
      },
    })
  })

  test('adds cart items, updates quantities, and checks out local orders', () => {
    const store = useShoppingStore()
    const calendarStore = useCalendarStore()
    store.resetForTesting()
    calendarStore.resetForTesting()
    const product = store.upsertProduct({
      id: 'product_lens',
      title: 'Mira Lens',
      category: 'digital',
      serviceKey: 'nova_digital',
      price: '1288.00',
      assetEligible: true,
    })

    expect(store.addToCart(product.id, 2)).toMatchObject({
      productId: product.id,
      quantity: 2,
    })
    expect(store.addToCart(product.id, 1)?.quantity).toBe(3)
    expect(store.cartQuantity).toBe(3)
    expect(store.cartPrimaryTotal).toEqual({
      currency: 'CNY',
      amountCents: 386400,
      amount: '3864.00',
    })

    expect(store.updateCartQuantity(product.id, 1)).toBe(true)
    expect(store.cartQuantity).toBe(1)

    const order = store.checkoutCart({
      note: 'Checkout sample',
      recipient: 'Nova',
      giftRecipient: {
        name: 'Nova',
        chatId: 1,
        contactId: 1,
        sourceModule: 'chat',
        sourceId: '1',
      },
    })

    expect(order).toMatchObject({
      itemCount: 1,
      totalCents: 128800,
      currency: 'CNY',
      note: 'Checkout sample',
      recipient: 'Nova',
      status: 'placed',
      giftRecipient: {
        name: 'Nova',
        chatId: 1,
        contactId: 1,
        sourceModule: 'chat',
        sourceId: '1',
      },
    })
    expect(order.items[0]).toMatchObject({
      productId: product.id,
      title: 'Mira Lens',
      serviceKey: 'nova_digital',
      serviceLabel: 'Nova Digital',
      assetEligible: true,
    })
    const calendarCue = calendarStore.findShoppingDeliveryCueByOrderId(order.id)
    expect(calendarCue).toMatchObject({
      orderId: order.id,
      status: 'suggested',
      source: SHOPPING_SOURCE_KEYS.CALENDAR_DELIVERY,
      itemCount: 1,
      totalCents: 128800,
    })
    expect(store.cartQuantity).toBe(0)
    expect(store.orderCount).toBe(1)
  })

  test('blocks sold-out cart additions and removes cart/order records', () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const soldOut = store.upsertProduct({
      id: 'product_sold_out',
      title: 'Gone Item',
      category: 'mall',
      price: '12.00',
      stockStatus: 'sold_out',
    })
    const available = store.upsertProduct({
      id: 'product_available',
      title: 'Available Item',
      category: 'mall',
      price: '12.00',
    })

    expect(store.addToCart(soldOut.id)).toBeNull()
    expect(store.addToCart(available.id)).toBeTruthy()
    expect(store.removeFromCart(available.id)).toBe(true)
    expect(store.cartQuantity).toBe(0)

    store.addToCart(available.id)
    const order = store.checkoutCart()
    expect(useCalendarStore().findShoppingDeliveryCueByOrderId(order.id)?.status).toBe('suggested')
    expect(store.removeOrder(order.id)).toBe(true)
    expect(useCalendarStore().findShoppingDeliveryCueByOrderId(order.id)?.status).toBe('dismissed')
    expect(store.orderCount).toBe(0)
  })

  test('updates order lifecycle status and closes Calendar delivery cues', () => {
    const store = useShoppingStore()
    const calendarStore = useCalendarStore()
    store.resetForTesting()
    calendarStore.resetForTesting()
    const product = store.upsertProduct({
      id: 'product_status',
      title: 'Lifecycle Item',
      category: 'mall',
      price: '12.00',
    })

    store.addToCart(product.id)
    const completedOrder = store.checkoutCart()
    expect(calendarStore.findShoppingDeliveryCueByOrderId(completedOrder.id)?.status).toBe('suggested')
    expect(store.markOrderCompleted(completedOrder.id)).toBe(true)
    expect(store.orders[0]).toMatchObject({
      id: completedOrder.id,
      status: 'completed',
    })
    expect(calendarStore.findShoppingDeliveryCueByOrderId(completedOrder.id)?.status).toBe('dismissed')

    store.addToCart(product.id)
    const cancelledOrder = store.checkoutCart()
    expect(store.cancelOrder(cancelledOrder.id)).toBe(true)
    expect(store.orders[0]).toMatchObject({
      id: cancelledOrder.id,
      status: 'cancelled',
    })
    expect(calendarStore.findShoppingDeliveryCueByOrderId(cancelledOrder.id)?.status).toBe('dismissed')
    expect(store.updateOrderStatus(cancelledOrder.id, 'unknown')).toBe(false)
  })

  test('persists, restores, and keeps backup-compatible snapshots', () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({
      id: 'product_persist',
      title: 'Persisted Product',
      category: 'home',
      price: '66.00',
    })
    store.addToCart(product.id)
    store.saveNow()

    setActivePinia(createPinia())
    const restoredStore = useShoppingStore()
    expect(restoredStore.findProductById(product.id)?.title).toBe('Persisted Product')
    expect(restoredStore.cartQuantity).toBe(1)

    const snapshot = {
      shopping: {
        products: [
          {
            id: 'product_backup',
            title: 'Backup Product',
            category: 'luxury',
            price: '888.00',
          },
        ],
        favoriteProductIds: ['product_backup'],
        cartItems: [{ productId: 'product_backup', quantity: 2 }],
        orders: [],
      },
    }

    expect(restoredStore.restoreFromBackup(snapshot)).toBe(true)
    expect(restoredStore.productCount).toBe(1)
    expect(restoredStore.favoriteCount).toBe(1)
    expect(restoredStore.cartQuantity).toBe(2)
    expect(restoredStore.createBackupSnapshot().products[0]?.id).toBe('product_backup')
  })
})
