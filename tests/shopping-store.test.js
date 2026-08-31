import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  SHOPPING_SERVICE_PRESETS,
  SHOPPING_SOURCE_KEYS,
} from '../src/lib/planned-module-registry'
import { useCalendarStore } from '../src/stores/calendar'
import { useChatStore } from '../src/stores/chat'
import { useWalletStore } from '../src/stores/wallet'
import {
  SHOPPING_ORDER_EVENT_TYPE,
  useShoppingStore,
} from '../src/stores/shopping'

describe('shopping store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('seeds products for every allowed storefront category', () => {
    const store = useShoppingStore()
    const expectedCounts = {
      schat_mall: 10,
      nova_digital: 9,
      daily_fresh: 8,
      style_cloud: 9,
      nordhus_home: 9,
      mellow_care: 9,
      traders_club: 10,
      cu_24: 9,
      musinsa_style: 9,
      boon_select: 9,
      galleria_luxury: 9,
    }

    expect(store.productCount).toBe(100)
    expect(store.listProductsByCategory('digital').length).toBeGreaterThan(0)
    expect(store.listProductsByCategory('unknown').length).toBe(store.productCount)

    SHOPPING_SERVICE_PRESETS.forEach((service) => {
      const products = store.listProductsByService(service.key)
      expect(products, service.key).toHaveLength(expectedCounts[service.key])
      expect(products.length, `${service.key}:catalog-depth`).toBeGreaterThanOrEqual(8)
      service.categoryKeys.forEach((categoryKey) => {
        const visibleProducts = categoryKey === 'mall'
          ? products
          : products.filter((product) => product.category === categoryKey)
        expect(visibleProducts.length, `${service.key}:${categoryKey}`).toBeGreaterThan(0)
      })
    })
  })

  test('adds missing category seeds during normal hydration without overwriting saved products', () => {
    localStorage.setItem(
      'schatphone:store:shopping',
      JSON.stringify({
        version: 1,
        data: {
          products: [
            {
              id: 'shopping_seed_mall_card',
              title: 'Saved Gift Card Title',
              category: 'mall',
              serviceKey: 'schat_mall',
              price: '88.00',
              sourceModule: 'seed',
            },
          ],
          favoriteProductIds: [],
          cartItems: [],
          orders: [],
        },
      }),
    )

    const store = useShoppingStore()

    expect(store.productCount).toBe(100)
    expect(store.findProductById('shopping_seed_mall_card')?.title).toBe('Saved Gift Card Title')
    expect(store.findProductById('shopping_seed_mall_runner')).toMatchObject({
      category: 'fashion',
      serviceKey: 'schat_mall',
    })
    expect(store.findProductById('shopping_seed_nova_fountain_pen')).toMatchObject({
      category: 'gifts',
      serviceKey: 'nova_digital',
    })
    expect(store.findProductById('shopping_seed_care_travel_minis')).toMatchObject({
      category: 'gifts',
      serviceKey: 'mellow_care',
    })
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
      sharedExperienceId: `gift:${order.id}`,
    })
    expect(order.items[0]).toMatchObject({
      productId: product.id,
      title: 'Mira Lens',
      serviceKey: 'nova_digital',
      serviceLabel: '29CM',
      assetEligible: true,
    })
    const calendarCue = calendarStore.findShoppingDeliveryCueByOrderId(order.id)
    expect(calendarCue).toMatchObject({
      sharedExperienceId: order.sharedExperienceId,
      orderId: order.id,
      status: 'suggested',
      source: SHOPPING_SOURCE_KEYS.CALENDAR_DELIVERY,
      itemCount: 1,
      totalCents: 128800,
    })
    expect(store.cartQuantity).toBe(0)
    expect(store.orderCount).toBe(1)
  })

  test('requires an address before paid checkout and leaves the cart untouched', () => {
    const store = useShoppingStore()
    const walletStore = useWalletStore()
    store.resetForTesting()
    const product = store.upsertProduct({
      id: 'shopping_paid_address_required',
      title: 'Address Required Item',
      category: 'mall',
      serviceKey: 'schat_mall',
      price: '18.00',
    })
    store.addToCart(product.id)
    const transactionCount = walletStore.transactionCount

    const result = store.checkoutCartWithPayment({
      serviceKey: 'schat_mall',
      recipient: 'Nova',
      cardId: walletStore.activePaymentCard.id,
      accountId: walletStore.activePaymentCard.accountId,
      idempotencyKey: 'shopping-address-required',
    })

    expect(result).toMatchObject({
      ok: false,
      stage: 'map',
      reason: 'delivery_anchor_required',
    })
    expect(store.getCartQuantityByService('schat_mall')).toBe(1)
    expect(store.orderCount).toBe(0)
    expect(walletStore.transactionCount).toBe(transactionCount)
  })

  test('pays once, stores Map and Wallet references, and replays idempotently', () => {
    const store = useShoppingStore()
    const walletStore = useWalletStore()
    store.resetForTesting()
    const product = store.upsertProduct({
      id: 'shopping_paid_success',
      title: 'Paid Checkout Item',
      category: 'mall',
      serviceKey: 'schat_mall',
      price: '18.00',
    })
    store.addToCart(product.id)
    const transactionCount = walletStore.transactionCount
    const deliveryAnchor = {
      id: 'address:home',
      label: 'Home',
      detail: '12 River Road, Seoul',
      mapPackId: 'real-seoul-v1',
      placeId: 'address:home',
      revision: 1,
    }
    const paymentCard = walletStore.activePaymentCard

    const first = store.checkoutCartWithPayment({
      serviceKey: 'schat_mall',
      recipient: 'Nova',
      recipientPhone: '010-1234-5678',
      deliveryAnchor,
      cardId: paymentCard.id,
      accountId: paymentCard.accountId,
      idempotencyKey: 'shopping-paid-success',
    })
    const replay = store.checkoutCartWithPayment({
      serviceKey: 'schat_mall',
      recipient: 'Nova',
      deliveryAnchor,
      cardId: paymentCard.id,
      accountId: paymentCard.accountId,
      idempotencyKey: 'shopping-paid-success',
    })

    expect(first.ok).toBe(true)
    expect(first.order).toMatchObject({
      recipient: 'Nova',
      recipientPhone: '010-1234-5678',
      deliveryAddress: deliveryAnchor.detail,
      deliveryAnchor,
      paymentStatus: 'completed',
      paymentRef: {
        transactionId: first.payment.transaction.id,
        accountId: paymentCard.accountId,
        cardId: paymentCard.id,
      },
      quoteSnapshot: {
        sourceMoney: { amountMinor: 1800, currency: 'CNY' },
        quotedMoney: { amountMinor: 1800, currency: 'CNY' },
        targetCurrency: 'CNY',
      },
    })
    expect(first.payment.transaction).toMatchObject({
      title: 'Shopping order',
      sourceModule: 'shopping_wallet_expense',
      sourceId: first.order.id,
      quoteSnapshot: first.order.quoteSnapshot,
    })
    expect(replay).toMatchObject({
      ok: true,
      reason: 'idempotent_replay',
      order: { id: first.order.id },
    })
    expect(store.getCartQuantityByService('schat_mall')).toBe(0)
    expect(walletStore.transactionCount).toBe(transactionCount + 1)
  })

  test('does not create an order or clear the cart when Wallet funds are insufficient', () => {
    const store = useShoppingStore()
    const walletStore = useWalletStore()
    store.resetForTesting()
    const product = store.upsertProduct({
      id: 'shopping_paid_insufficient',
      title: 'High Value Item',
      category: 'luxury',
      serviceKey: 'galleria_luxury',
      price: '5000.00',
    })
    store.addToCart(product.id)
    const transactionCount = walletStore.transactionCount
    const paymentCard = walletStore.activePaymentCard

    const result = store.checkoutCartWithPayment({
      serviceKey: 'galleria_luxury',
      recipient: 'Nova',
      deliveryAnchor: {
        id: 'address:home',
        label: 'Home',
        detail: '12 River Road, Seoul',
        mapPackId: 'real-seoul-v1',
        placeId: 'address:home',
        revision: 1,
      },
      cardId: paymentCard.id,
      accountId: paymentCard.accountId,
      idempotencyKey: 'shopping-paid-insufficient',
    })

    expect(result).toMatchObject({ ok: false, stage: 'payment', reason: 'insufficient_funds' })
    expect(store.getCartQuantityByService('galleria_luxury')).toBe(1)
    expect(store.orderCount).toBe(0)
    expect(walletStore.transactionCount).toBe(transactionCount)
  })

  test('scopes favorites, carts, checkout, and order lists by shopping app', () => {
    const store = useShoppingStore()
    const calendarStore = useCalendarStore()
    store.resetForTesting()
    calendarStore.resetForTesting()
    const coupangProduct = store.upsertProduct({
      id: 'product_coupang_scoped',
      title: 'Coupang Daily Set',
      category: 'mall',
      serviceKey: 'schat_mall',
      price: '20.00',
    })
    const cmProduct = store.upsertProduct({
      id: 'product_29cm_scoped',
      title: '29CM Select Bag',
      category: 'fashion',
      serviceKey: 'nova_digital',
      price: '80.00',
    })

    store.toggleProductFavorite(coupangProduct.id)
    store.toggleProductFavorite(cmProduct.id)
    store.addToCart(coupangProduct.id, 1)
    store.addToCart(cmProduct.id, 2)

    expect(store.getFavoriteCountByService('schat_mall')).toBe(1)
    expect(store.getFavoriteCountByService('nova_digital')).toBe(1)
    expect(store.getCartQuantityByService('schat_mall')).toBe(1)
    expect(store.getCartQuantityByService('nova_digital')).toBe(2)
    expect(store.getCartPrimaryTotalByService('nova_digital').amountCents).toBe(16000)

    const order = store.checkoutCart({ serviceKey: 'nova_digital' })

    expect(order.items).toHaveLength(1)
    expect(order.items[0]).toMatchObject({
      productId: cmProduct.id,
      serviceKey: 'nova_digital',
      quantity: 2,
    })
    expect(store.getCartQuantityByService('nova_digital')).toBe(0)
    expect(store.getCartQuantityByService('schat_mall')).toBe(1)
    expect(store.listOrdersByService('nova_digital')).toEqual([order])
    expect(store.listOrdersByService('schat_mall')).toEqual([])
    expect(store.clearCart('schat_mall')).toBe(1)
    expect(store.cartQuantity).toBe(0)
  })

  test('freezes the Wallet-primary checkout quote through rate changes and backup restore', () => {
    const store = useShoppingStore()
    const walletStore = useWalletStore()
    store.resetForTesting()
    walletStore.resetForTesting()
    walletStore.setPrimaryCurrency('USD')
    const product = store.upsertProduct({
      id: 'product_quote_snapshot',
      title: 'Quote Snapshot Gift',
      category: 'gifts',
      price: '39.00',
      currency: 'CNY',
    })

    store.addToCart(product.id)
    const order = store.checkoutCart()

    expect(order.quoteSnapshot).toEqual({
      sourceMoney: { amountMinor: 3900, currency: 'CNY' },
      quotedMoney: { amountMinor: 542, currency: 'USD' },
      rateSetId: 'wallet-rates-bundled-average-v1',
      rate: '0.138888888888888888888889',
      rateSource: 'bundled_average',
      quotedAt: Date.now(),
      targetCurrency: 'USD',
    })

    const snapshot = store.createBackupSnapshot()
    walletStore.setUsdCnyRate('10')
    expect(store.findOrderById(order.id)?.quoteSnapshot).toEqual(order.quoteSnapshot)

    setActivePinia(createPinia())
    const restoredStore = useShoppingStore()
    restoredStore.resetForTesting()
    expect(restoredStore.restoreFromBackup(snapshot)).toBe(true)
    expect(restoredStore.findOrderById(order.id)?.quoteSnapshot).toEqual(order.quoteSnapshot)
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
    expect(store.orders[0].completedAt).toBe(Date.now())
    expect(calendarStore.findShoppingDeliveryCueByOrderId(completedOrder.id)?.status).toBe('dismissed')

    store.addToCart(product.id)
    const cancelledOrder = store.checkoutCart()
    expect(store.cancelOrder(cancelledOrder.id)).toBe(true)
    expect(store.orders[0]).toMatchObject({
      id: cancelledOrder.id,
      status: 'cancelled',
    })
    expect(store.orders[0].cancelledAt).toBe(Date.now())
    expect(calendarStore.findShoppingDeliveryCueByOrderId(cancelledOrder.id)?.status).toBe('dismissed')
    expect(store.updateOrderStatus(cancelledOrder.id, 'unknown')).toBe(false)
  })

  test('adds logistics events to orders without changing Shopping order lifecycle', () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({
      id: 'product_logistics_event',
      title: 'Logistics Event Item',
      category: 'digital',
      price: '88.00',
    })

    store.addToCart(product.id)
    const order = store.checkoutCart()
    const event = store.addOrderEvent(order.id, {
      type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED,
      title: 'Package shipped',
      summary: 'Standard courier picked up this parcel.',
      trackingCode: 'TRACK-001',
      carrierName: 'Standard Courier',
      etaDays: 2,
      sourceModule: SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING,
      sourceId: 'manual_test_event',
    })

    expect(event).toMatchObject({
      type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED,
      title: 'Package shipped',
      summary: 'Standard courier picked up this parcel.',
      trackingCode: 'TRACK-001',
      carrierName: 'Standard Courier',
      etaDays: 2,
      sourceModule: SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING,
      sourceId: 'manual_test_event',
    })
    expect(store.orders[0]).toMatchObject({
      id: order.id,
      status: 'placed',
    })
    expect(store.orders[0]?.events[0]).toMatchObject({
      id: event.id,
      type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED,
    })
    expect(store.addOrderEvent(order.id, { type: 'unknown' })).toBeNull()
    expect(store.addOrderEvent('missing_order', { type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_ARRIVED })).toBeNull()
  })

  test('pushes Shopping and logistics service notifications into Chat without moving order state', () => {
    const store = useShoppingStore()
    const chatStore = useChatStore()
    store.resetForTesting()
    const shopContact = chatStore.addContact({
      name: 'Nova Digital',
      kind: 'service',
      role: 'Service account',
      shoppingServiceKey: 'nova_digital',
    })
    const logisticsContact = chatStore.addContact({
      name: 'Standard Courier',
      kind: 'service',
      role: 'Service account',
      logisticsServiceKey: 'standard_courier',
    })
    const product = store.upsertProduct({
      id: 'product_service_notification',
      title: 'Service Notification Lens',
      category: 'digital',
      serviceKey: 'nova_digital',
      price: '1288.00',
    })

    store.addToCart(product.id)
    const order = store.checkoutCart()
    const shopMessages = chatStore.getMessagesByContactId(shopContact.id)
    const orderNotification = shopMessages.find((message) =>
      message.blocks.some((block) => block.type === 'service_notification' && block.sourceId === order.id),
    )
    expect(orderNotification?.blocks[0]).toMatchObject({
      type: 'service_notification',
      kind: 'shopping_order',
      sourceModule: SHOPPING_SOURCE_KEYS.ORDER_UPDATE,
      sourceId: order.id,
      serviceKey: 'nova_digital',
      amount: '1288.00 CNY',
    })
    expect(chatStore.getConversationByContactId(shopContact.id).unread).toBe(1)

    const event = store.addOrderEvent(order.id, {
      type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_SHIPPED,
      summary: 'Standard courier picked up this parcel.',
      carrierName: 'Standard Courier',
    })
    const logisticsNotification = chatStore.findServiceNotificationBySource(
      logisticsContact.id,
      SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING,
      order.id,
      event.id,
    )
    expect(logisticsNotification?.blocks[0]).toMatchObject({
      type: 'service_notification',
      kind: 'logistics_update',
      sourceModule: SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING,
      sourceId: order.id,
      sourceEventId: event.id,
      serviceKey: 'standard_courier',
    })
    expect(store.orders[0]).toMatchObject({
      id: order.id,
      status: 'placed',
    })
    expect(store.orderCount).toBe(1)
    expect(chatStore.getRoleBindingContract(shopContact.id).roleBound).toBe(false)
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
    const order = store.checkoutCart()
    store.addOrderEvent(order.id, {
      type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_ARRIVED,
      summary: 'Parcel arrived before persistence.',
    })
    store.addToCart(product.id)
    store.saveNow()

    setActivePinia(createPinia())
    const restoredStore = useShoppingStore()
    expect(restoredStore.findProductById(product.id)?.title).toBe('Persisted Product')
    expect(restoredStore.cartQuantity).toBe(1)
    expect(restoredStore.orders[0]?.events[0]).toMatchObject({
      type: SHOPPING_ORDER_EVENT_TYPE.PACKAGE_ARRIVED,
      summary: 'Parcel arrived before persistence.',
    })

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
        orders: [
          {
            id: 'shopping_order_legacy_gift',
            status: 'completed',
            items: [
              {
                productId: 'product_backup',
                title: 'Backup Gift',
                quantity: 1,
                unitPriceCents: 88800,
                currency: 'CNY',
              },
            ],
            giftRecipient: {
              name: 'Xia',
              contactId: 8,
              profileId: 8,
              kind: 'role',
              sourceModule: 'chat',
              sourceId: '8',
            },
            createdAt: 1000,
            updatedAt: 2000,
          },
        ],
      },
    }

    expect(restoredStore.restoreFromBackup(snapshot)).toBe(true)
    expect(restoredStore.productCount).toBe(1)
    expect(restoredStore.favoriteCount).toBe(1)
    expect(restoredStore.cartQuantity).toBe(2)
    expect(restoredStore.orders[0]).toMatchObject({
      id: 'shopping_order_legacy_gift',
      status: 'completed',
      sharedExperienceId: 'gift:shopping_order_legacy_gift',
      completedAt: 2000,
    })
    expect(restoredStore.createBackupSnapshot().products[0]?.id).toBe('product_backup')
    expect(restoredStore.createBackupSnapshot().orders).toHaveLength(1)
  })

  test('neutralizes relationship-linked gift orders during cleanup without deleting the order', () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({
      id: 'product_cleanup_gift',
      title: 'Cleanup Gift',
      category: 'gifts',
      price: '18.00',
    })

    store.addToCart(product.id)
    const order = store.checkoutCart({
      recipient: 'HJ',
      note: 'Gift picked for HJ.',
      giftRecipient: {
        name: 'HJ',
        contactId: 7,
        profileId: 77,
        kind: 'role',
        sourceModule: 'chat',
        sourceId: '7',
      },
    })

    const result = store.cleanupRelationshipForProfile(
      { id: 77, name: 'HJ' },
      {
        cleanupMode: 'reset_relationship',
        replacementName: 'Someone',
      },
    )

    expect(result).toMatchObject({
      removedCount: 0,
      unlinkedCount: 1,
    })
    expect(store.findOrderById(order.id)).toMatchObject({
      recipient: 'Someone',
      giftRecipient: {
        profileId: 0,
        contactId: 0,
        name: '',
      },
    })
    expect(store.findOrderById(order.id)?.note).toContain('Someone')
    })
  })

  test('implements the shared commerce order and Service Case seam independently', () => {
    const store = useShoppingStore()
    store.resetForTesting()
    const product = store.upsertProduct({
      id: 'shopping_adapter_item',
      title: 'Adapter Parcel',
      category: 'mall',
      serviceKey: 'schat_mall',
      price: '18.00',
    })
    store.addToCart(product.id, 1)
    const order = store.checkoutCart({ recipient: 'User' })
    const destination = {
      id: 'address:office',
      label: 'Office',
      detail: '12 River Road',
      mapPackId: 'real-seoul-v1',
      placeId: 'address:office',
      revision: 1,
    }

    expect(store.getCommerceOrderReference(order.id)).toMatchObject({
      schemaVersion: 1,
      ownerModule: 'shopping',
      orderId: order.id,
      ownerRevision: 1,
    })
    const opened = store.beginOrderServiceInteraction({
      orderId: order.id,
      userAction: 'destination_change_requested',
      destinationAnchor: destination,
      now: Date.now(),
    })
    expect(opened).toMatchObject({
      ok: true,
      trigger: { initiatedBy: 'user', orderRef: { ownerModule: 'shopping' } },
      serviceCase: { caseType: 'destination_change', status: 'open' },
    })
    const committed = store.commitOrderDestinationChange({
      caseId: opened.serviceCase.id,
      destinationAnchor: destination,
      expectedOwnerRevision: 1,
      now: Date.now() + 1,
    })
    expect(committed).toMatchObject({
      ok: true,
      order: { deliveryAddress: '12 River Road', ownerRevision: 2 },
      serviceCase: { status: 'resolved', resolutionCode: 'destination_changed' },
    })
    expect(store.beginOrderServiceInteraction({ orderId: '', userAction: 'destination_change_requested' })).toMatchObject({
      ok: false,
      reason: 'order_missing_or_closed',
    })
  })
