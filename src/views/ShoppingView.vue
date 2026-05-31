<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import ImageSourcePicker from '../components/shared/ImageSourcePicker.vue'
import DeliveryRouteContextCard from '../components/map/DeliveryRouteContextCard.vue'
import { useI18n } from '../composables/useI18n'
import {
  RELATIONSHIP_FACT_SOURCE_KEYS,
  buildShoppingGiftRelationshipMemoryKey,
  buildShoppingGiftRelationshipSuggestion,
  recordShoppingGiftRelationshipFact,
  recordWalletOrderSupportRelationshipFact,
} from '../lib/relationship-fact-adapters'
import {
  buildShoppingWorldAppFilterQuery,
  resolveShoppingWorldAppContext,
} from '../lib/world-pack-app-bindings'
import {
  ASSET_SOURCE_KEYS,
  SHOPPING_CATEGORY_ENTRIES,
  SHOPPING_PLATFORM_APP_ENTRIES,
  SHOPPING_SOURCE_KEYS,
  findShoppingCategory,
  findShoppingPlatformApp,
  findShoppingServicePreset,
} from '../lib/planned-module-registry'
import { pushReturnTarget } from '../lib/navigation-return'
import { useAssetsStore } from '../stores/assets'
import { useCalendarStore } from '../stores/calendar'
import { useChatStore } from '../stores/chat'
import { useGalleryStore } from '../stores/gallery'
import { useMapStore } from '../stores/map'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'
import { SHOPPING_ORDER_STATUS, useShoppingStore } from '../stores/shopping'
import { useSystemStore } from '../stores/system'
import { useWalletStore } from '../stores/wallet'

const route = useRoute()
const router = useRouter()
const { t, languageBase } = useI18n()
const shoppingStore = useShoppingStore()
const systemStore = useSystemStore()
const assetsStore = useAssetsStore()
const calendarStore = useCalendarStore()
const chatStore = useChatStore()
const galleryStore = useGalleryStore()
const mapStore = useMapStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const walletStore = useWalletStore()
const {
  productCount,
  favoriteCount,
  cartQuantity,
  orderCount,
  cartLineItems,
  cartPrimaryTotal,
  orders,
} = storeToRefs(shoppingStore)

const SHOPPING_IMAGE_PREVIEW_SCOPE_ID = 'shopping-products-view'
const productImagePreviewMap = reactive({})
const productDraft = reactive({
  title: '',
  category: 'mall',
  price: '',
  currency: 'CNY',
  desc: '',
  imageSourceType: 'none',
  imageUrl: '',
  imageGalleryAssetId: '',
  serviceKey: '',
  assetEligible: false,
  giftable: true,
})
const productFeedback = ref('')
const giftDraft = reactive({
  enabled: false,
  contactId: '',
  name: '',
})
const selectedOrderId = ref('')

const activeCategoryKey = computed(() =>
  typeof route.query.category === 'string' ? route.query.category : 'mall',
)
const highlightedProductId = computed(() =>
  typeof route.query.productId === 'string' ? route.query.productId.trim() : '',
)
const highlightedOrderId = computed(() =>
  typeof route.query.orderId === 'string' ? route.query.orderId.trim() : '',
)
const activeServiceKey = computed(() =>
  typeof route.query.service === 'string' ? route.query.service.trim() : '',
)
const sourceModule = computed(() =>
  typeof route.query.source === 'string' ? route.query.source.trim() : '',
)
const sourceIntent = computed(() =>
  typeof route.query.intent === 'string' ? route.query.intent.trim() : '',
)
const sourceChatId = computed(() =>
  typeof route.query.chatId === 'string' ? route.query.chatId.trim() : '',
)
const openedFromChatProductCard = computed(() =>
  sourceModule.value === 'chat' && sourceIntent.value === 'product_card',
)
const openedFromChatGiftOrder = computed(() =>
  sourceModule.value === 'chat' && sourceIntent.value === 'gift_order',
)
const openedFromChatShoppingOrder = computed(() =>
  sourceModule.value === 'chat' && sourceIntent.value === 'shopping_order',
)
const openedFromChatLogistics = computed(() =>
  sourceModule.value === 'chat' && sourceIntent.value === 'logistics',
)
const worldAppContext = computed(() =>
  resolveShoppingWorldAppContext({
    systemStore,
    routeQuery: route.query,
  }),
)
const worldAppFilterActive = computed(
  () =>
    Boolean(worldAppContext.value) &&
    activeServiceKey.value === worldAppContext.value.serviceKey &&
    activeCategoryKey.value === worldAppContext.value.categoryKey,
)
const worldAppDescription = computed(() => {
  const context = worldAppContext.value
  if (!context) return ''
  if (languageBase.value === 'zh' && context.bindingId === 'survival_supply_board') {
    return '把 Shopping 作为当前世界里的补给站入口使用，优先引导到生鲜与日用补给视角。'
  }
  return context.description || 'This entry brings the active World Pack app context into Shopping.'
})
const activeCategory = computed(() => findShoppingCategory(activeCategoryKey.value))
const activeCategoryIsLogistics = computed(() => activeCategory.value?.key === 'logistics')
const activeService = computed(() =>
  activeServiceKey.value ? findShoppingServicePreset(activeServiceKey.value) : null,
)
const activePlatformApp = computed(() =>
  activeServiceKey.value ? findShoppingPlatformApp(activeServiceKey.value) : null,
)
const activeShoppingAppLabel = computed(() => {
  if (worldAppContext.value?.bindingTitle) return worldAppContext.value.bindingTitle
  const platform = activePlatformApp.value
  if (!platform?.key) return t('Shopping', 'Shopping')
  return languageBase.value === 'zh' ? platform.zh : platform.en
})
const activeShoppingAppDesc = computed(() => {
  if (worldAppContext.value) return worldAppDescription.value
  const platform = activePlatformApp.value
  if (!platform?.key) {
    return t(
      'Select a shopping app from the Home folder, or browse the shared shopping catalog here.',
      'Select a shopping app from the Home folder, or browse the shared shopping catalog here.',
    )
  }
  return languageBase.value === 'zh' ? platform.descZh : platform.descEn
})
const visibleProducts = computed(() => {
  if (activeCategoryIsLogistics.value) return []
  const categoryProducts = shoppingStore.listProductsByCategory(activeCategory.value?.key || 'mall')
  if (!activeService.value?.key) return categoryProducts
  return categoryProducts.filter((product) => product.serviceKey === activeService.value.key)
})
const galleryImageOptions = computed(() =>
  galleryStore.assets
    .filter((asset) => ['reference', 'scenario', 'wallpaper'].includes(asset.category))
    .slice(0, 80),
)
const giftRecipientOptions = computed(() =>
  chatStore.contactsForList
    .filter((contact) => Number(contact.id) > 0)
    .slice(0, 60),
)
const selectedGiftContact = computed(() =>
  giftRecipientOptions.value.find((contact) => String(contact.id) === String(giftDraft.contactId)) || null,
)
const recentOrders = computed(() => {
  const baseOrders = orders.value.slice(0, 4)
  const targetOrder = highlightedOrderId.value
    ? orders.value.find((order) => order.id === highlightedOrderId.value)
    : null
  if (targetOrder && !baseOrders.some((order) => order.id === targetOrder.id)) {
    return [targetOrder, ...baseOrders].slice(0, 5)
  }
  return baseOrders
})
const selectedOrder = computed(() =>
  selectedOrderId.value ? orders.value.find((order) => order.id === selectedOrderId.value) || null : null,
)

const buildShoppingEventMapContext = (order, event = {}) =>
  mapStore.buildDeliveryEventMapHandoff({
    ownerModule: 'shopping',
    order,
    event,
  })

const assetTransferSuggestions = computed(() =>
  orders.value
    .flatMap((order) =>
      order.items
        .filter((item) => item.assetEligible === true)
        .map((item) => {
          const assetId = `asset_from_${order.id}_${item.productId}`
          const amountCents = item.unitPriceCents * item.quantity
          return {
            assetId,
            orderId: order.id,
            productId: item.productId,
            title: item.title,
            assetCategory: 'special',
            amount: (amountCents / 100).toFixed(2),
            currency: item.currency,
            imported: Boolean(assetsStore.findAssetById(assetId)),
          }
        }),
    )
    .slice(0, 6),
)
const walletExpenseSuggestions = computed(() =>
  orders.value
    .filter((order) => order.status === SHOPPING_ORDER_STATUS.COMPLETED)
    .map((order) => {
      const sourceId = order.id
      const walletImported = Boolean(walletStore.findTransactionBySource(SHOPPING_SOURCE_KEYS.WALLET_EXPENSE, sourceId))
      const relationshipSuggestion = buildShoppingGiftRelationshipSuggestion({
        relationshipRuntimeStore,
        order,
      })
      return {
        order,
        orderId: order.id,
        sourceId,
        amount: (Number(order.totalCents || 0) / 100).toFixed(2),
        currency: order.currency,
        itemCount: order.itemCount,
        giftRecipient: order.giftRecipient,
        relationshipSuggestion,
        relationshipAvailable: relationshipSuggestion.available,
        relationshipImported: relationshipSuggestion.imported,
        relationshipTargetName: relationshipSuggestion.targetName,
        imported: walletImported && (!relationshipSuggestion.available || relationshipSuggestion.imported),
        walletImported,
      }
    })
    .filter((suggestion) => Number(suggestion.amount) > 0)
    .slice(0, 6),
)

const logisticsOrderRows = computed(() =>
  orders.value.slice(0, 8).map((order) => {
    const cue = calendarStore.findShoppingDeliveryCueByOrderId(order.id)
    const latestEvent = Array.isArray(order.events) ? order.events[0] : null
    return {
      order,
      cue,
      status: cue?.status || (order.status === SHOPPING_ORDER_STATUS.PLACED ? 'pending' : order.status),
      title: cue?.title || order.items.map((item) => item.title).join(' / '),
      summary: cue?.summary || t('Waiting for delivery follow-up cue.', 'Waiting for delivery follow-up cue.'),
      latestEvent,
      mapHandoff: latestEvent ? buildShoppingEventMapContext(order, latestEvent) : null,
      suggestedAt: cue?.suggestedAt || order.createdAt,
      total: formatOrderTotal(order),
      route: cue?.route || '/shopping',
    }
  }),
)

const logisticsStatusClass = (status) => {
  if (status === 'confirmed') return 'bg-blue-50 text-blue-700'
  if (status === 'dismissed' || status === SHOPPING_ORDER_STATUS.COMPLETED) return 'bg-emerald-50 text-emerald-700'
  if (status === SHOPPING_ORDER_STATUS.CANCELLED) return 'bg-gray-100 text-gray-500'
  return 'bg-orange-50 text-orange-700'
}

const logisticsStatusLabel = (status) => {
  if (status === 'confirmed') return t('Calendar confirmed', 'Calendar confirmed')
  if (status === 'dismissed') return t('Closed', 'Closed')
  if (status === SHOPPING_ORDER_STATUS.COMPLETED) return t('Completed', 'Completed')
  if (status === SHOPPING_ORDER_STATUS.CANCELLED) return t('Cancelled', 'Cancelled')
  return t('Pending follow-up', 'Pending follow-up')
}

const logisticsEventTypeLabel = (type) => {
  if (type === 'package_shipped') return t('Package shipped', 'Package shipped')
  if (type === 'package_arrived') return t('Package arrived', 'Package arrived')
  if (type === 'pickup_point_changed') return t('Pickup changed', 'Pickup changed')
  if (type === 'international_delay') return t('International delay', 'International delay')
  return t('Logistics update', 'Logistics update')
}

const formatLogisticsDate = (value) => {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return ''
  return new Date(timestamp).toLocaleDateString()
}

const categoryCards = computed(() =>
  SHOPPING_CATEGORY_ENTRIES.map((entry) => ({
    ...entry,
    label: languageBase.value === 'zh' ? entry.zh : entry.en,
    desc: languageBase.value === 'zh' ? entry.descZh : entry.descEn,
    active: entry.key === activeCategory.value?.key,
    count: shoppingStore.listProductsByCategory(entry.key).length,
  })),
)

const productCategoryCards = computed(() =>
  categoryCards.value.filter((entry) => entry.key !== 'logistics'),
)

const platformCategoryCards = computed(() => {
  if (!activePlatformApp.value?.key || activeCategoryIsLogistics.value) return categoryCards.value
  const allowedKeys = Array.isArray(activePlatformApp.value.categoryKeys)
    ? activePlatformApp.value.categoryKeys
    : []
  if (allowedKeys.length === 0) return categoryCards.value
  return categoryCards.value.filter((entry) => allowedKeys.includes(entry.key))
})

const serviceCards = computed(() =>
  SHOPPING_PLATFORM_APP_ENTRIES.map((entry) => ({
    ...entry,
    label: languageBase.value === 'zh' ? entry.zh : entry.en,
    desc: languageBase.value === 'zh' ? entry.descZh : entry.descEn,
    active: entry.key === activeService.value?.key,
    count: shoppingStore.listProductsByService(entry.key).length,
  })),
)

const sourcePlan = computed(() => [
  {
    key: SHOPPING_SOURCE_KEYS.CHAT_PRODUCT_CARD,
    title: t('Chat 商品卡片', 'Chat product cards'),
    desc: t('Chat 后续可分享或推荐商品，但结账必须留在 Shopping。', 'Chat may later share or recommend goods, while checkout must remain in Shopping.'),
  },
  {
    key: SHOPPING_SOURCE_KEYS.CART_REMINDER,
    title: t('Calendar 配送线索', 'Calendar delivery cues'),
    desc: t('本地订单只生成 Calendar 配送或预约线索，用户确认后才会成为日程。', 'Local orders now create Calendar delivery or appointment cues; they become events only after user confirmation.'),
  },
  {
    key: SHOPPING_SOURCE_KEYS.LOGISTICS_TRACKING,
    title: t('物流跟踪入口', 'Logistics tracking entry'),
    desc: t('物流是 Shopping 内的订单配送聚合入口，可读取订单和 Calendar 配送线索，但不拥有结算或日程。', 'Logistics is a Shopping-owned delivery aggregation entry. It reads orders and Calendar delivery cues, but does not own checkout or scheduling.'),
  },
  {
    key: SHOPPING_SOURCE_KEYS.ASSET_PURCHASE,
    title: t('资产购买', 'Asset purchases'),
    desc: t('可转资产商品会显示手动导入建议，只有点击后才写入 Assets。', 'Asset-ready goods show manual import suggestions and write to Assets only after a click.'),
  },
  {
    key: SHOPPING_SOURCE_KEYS.WALLET_EXPENSE,
    title: t('Wallet 消费记账', 'Wallet expense records'),
    desc: t('本地订单会显示消费记录建议，只有点击后才写入 Wallet。', 'Local orders show expense-record suggestions and write to Wallet only after a click.'),
  },
])

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const goBackToChat = () => {
  const chatId = Number(sourceChatId.value)
  router.push(Number.isFinite(chatId) && chatId > 0 ? `/chat/${Math.floor(chatId)}` : '/chat')
}

const openCategory = (key) => {
  router.push({
    path: '/shopping',
    query: {
      category: key,
      ...(activeServiceKey.value && key !== 'logistics' ? { service: activeServiceKey.value } : {}),
    },
  })
}

const openService = (key = '') => {
  const normalizedKey = typeof key === 'string' ? key.trim() : ''
  const platform = normalizedKey ? findShoppingPlatformApp(normalizedKey) : null
  router.push({
    path: '/shopping',
    query: {
      category: platform?.defaultCategory || activeCategory.value?.key || 'mall',
      ...(normalizedKey ? { service: normalizedKey } : {}),
    },
  })
}

const applyWorldAppFilter = () => {
  if (!worldAppContext.value) return
  const stableQuery = { ...route.query }
  delete stableQuery.productId
  delete stableQuery.orderId
  router.push({
    path: '/shopping',
    query: buildShoppingWorldAppFilterQuery({
      context: worldAppContext.value,
      currentQuery: stableQuery,
    }),
  })
}

const formatPrice = (product) => `${(Number(product?.priceCents || 0) / 100).toFixed(2)} ${product?.currency || 'CNY'}`

const resetProductDraft = () => {
  productDraft.title = ''
  productDraft.category = activeCategoryIsLogistics.value ? 'mall' : activeCategory.value?.key || 'mall'
  productDraft.price = ''
  productDraft.currency = 'CNY'
  productDraft.desc = ''
  productDraft.imageSourceType = 'none'
  productDraft.imageUrl = ''
  productDraft.imageGalleryAssetId = ''
  productDraft.serviceKey = activeService.value?.key || ''
  productDraft.assetEligible = false
  productDraft.giftable = true
}

const createCustomProduct = () => {
  productFeedback.value = ''
  if (productDraft.category === 'logistics') {
    productFeedback.value = t('物流不是商品品类，请选择具体商品分类。', 'Logistics is not a product category. Choose a product category.')
    return
  }
  const imageSourceType = productDraft.imageSourceType
  const product = shoppingStore.upsertProduct({
    title: productDraft.title,
    category: productDraft.category,
    price: productDraft.price,
    currency: productDraft.currency,
    desc: productDraft.desc,
    origin: 'user',
    sourceModule: 'shopping_user_custom',
    imageSourceType,
    imageUrl: imageSourceType === 'url' ? productDraft.imageUrl : '',
    imageGalleryAssetId: imageSourceType === 'gallery' ? productDraft.imageGalleryAssetId : '',
    serviceKey: productDraft.serviceKey,
    assetEligible: productDraft.assetEligible,
    giftable: productDraft.giftable,
  })
  if (!product) {
    productFeedback.value = t('Please enter a valid product name and price.', 'Please enter a valid product name and price.')
    return
  }
  productFeedback.value = t('Custom product added to catalog.', 'Custom product added to catalog.')
  router.push({
    path: '/shopping',
    query: {
      category: product.category,
      productId: product.id,
      ...(product.serviceKey ? { service: product.serviceKey } : {}),
    },
  })
  resetProductDraft()
}

const productImageUrl = (product) => {
  const image = product?.image || {}
  if (image.sourceType === 'url') return image.url || ''
  if (image.sourceType === 'gallery' && image.galleryAssetId) {
    return productImagePreviewMap[image.galleryAssetId] || ''
  }
  return ''
}

const productImageSourceLabel = (product) => {
  const sourceType = product?.image?.sourceType || 'none'
  if (sourceType === 'url') return t('URL image', 'URL image')
  if (sourceType === 'gallery') return t('Gallery asset', 'Gallery asset')
  if (sourceType === 'ai') return t('AI image reserved', 'AI image reserved')
  return t('Default icon', 'Default icon')
}

const productServiceLabel = (product) => {
  const service = findShoppingServicePreset(product?.serviceKey || '')
  if (!service?.key) return t('Auto service', 'Auto service')
  return languageBase.value === 'zh' ? service.zh : service.en
}

const stockStatusLabel = (status) => {
  if (status === 'limited') return t('Limited', 'Limited')
  if (status === 'preorder') return t('Preorder', 'Preorder')
  if (status === 'sold_out') return t('Sold out', 'Sold out')
  return t('Available', 'Available')
}

const stockStatusClass = (status) => {
  if (status === 'limited') return 'bg-orange-50 text-orange-600'
  if (status === 'preorder') return 'bg-blue-50 text-blue-600'
  if (status === 'sold_out') return 'bg-gray-100 text-gray-400'
  return 'bg-emerald-50 text-emerald-600'
}

const orderStatusLabel = (status) => {
  if (status === 'completed') return t('Completed', 'Completed')
  if (status === 'cancelled') return t('Cancelled', 'Cancelled')
  if (status === 'draft') return t('Draft', 'Draft')
  return t('Placed', 'Placed')
}

const orderStatusClass = (status) => {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700'
  if (status === 'cancelled') return 'bg-gray-100 text-gray-500'
  if (status === 'draft') return 'bg-blue-50 text-blue-700'
  return 'bg-orange-50 text-orange-700'
}

const formatOrderTotal = (order) => {
  if (!order) return ''
  const totals = Array.isArray(order.totals) && order.totals.length > 0
    ? order.totals
    : [{ amount: (Number(order.totalCents || 0) / 100).toFixed(2), currency: order.currency || 'CNY' }]
  return totals.map((item) => `${item.amount} ${item.currency}`).join(' / ')
}

const formatOrderItemSubtotal = (item) =>
  `${((Number(item?.unitPriceCents || 0) * Number(item?.quantity || 0)) / 100).toFixed(2)} ${item?.currency || 'CNY'}`

const toggleFavorite = (productId) => {
  shoppingStore.toggleProductFavorite(productId)
}

const addToCart = (productId) => {
  shoppingStore.addToCart(productId, 1, {
    sourceModule: SHOPPING_SOURCE_KEYS.CHAT_RECOMMENDATION,
  })
}

const updateCartQuantity = (productId, delta) => {
  const line = cartLineItems.value.find((item) => item.productId === productId)
  if (!line) return
  shoppingStore.updateCartQuantity(productId, line.quantity + delta)
}

const buildGiftCheckoutPayload = () => {
  const giftContact = selectedGiftContact.value
  const manualRecipient = typeof giftDraft.name === 'string' ? giftDraft.name.trim() : ''
  const giftRecipient = giftDraft.enabled && (giftContact || manualRecipient)
    ? {
        name: giftContact?.name || manualRecipient,
        chatId: giftContact ? Number(giftContact.id) : 0,
        contactId: giftContact ? Number(giftContact.id) : 0,
        profileId: giftContact ? Number(giftContact.profileId || 0) : 0,
        kind: giftContact?.kind || (giftContact?.profileId ? 'role' : 'contact'),
        sourceModule: giftContact ? 'chat' : 'shopping_manual_recipient',
        sourceId: giftContact ? String(giftContact.id) : manualRecipient,
      }
    : null
  giftDraft.enabled = false
  giftDraft.contactId = ''
  giftDraft.name = ''
  return {
    recipient: giftRecipient?.name || '',
    giftRecipient,
  }
}

const checkoutCart = () => {
  shoppingStore.checkoutCart({
    ...buildGiftCheckoutPayload(),
    note: t('Local shopping baseline order', 'Local shopping baseline order'),
  })
}

const removeOrder = (orderId) => {
  if (!shoppingStore.removeOrder(orderId)) return
  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.SHOPPING_GIFT,
    orderId,
  )
  const walletTransaction = walletStore.findTransactionBySource(SHOPPING_SOURCE_KEYS.WALLET_EXPENSE, orderId)
  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_ORDER_SUPPORT,
    walletTransaction?.id || walletTransaction?.sourceId || orderId,
  )
  if (selectedOrderId.value === orderId) selectedOrderId.value = ''
}

const canCompleteOrder = (order) =>
  order?.status !== SHOPPING_ORDER_STATUS.COMPLETED && order?.status !== SHOPPING_ORDER_STATUS.CANCELLED

const canCancelOrder = (order) =>
  order?.status !== SHOPPING_ORDER_STATUS.CANCELLED && order?.status !== SHOPPING_ORDER_STATUS.COMPLETED

const markOrderCompleted = (orderId) => {
  shoppingStore.markOrderCompleted(orderId)
}

const cancelOrder = (orderId) => {
  shoppingStore.cancelOrder(orderId)
}

const openOrderDetail = (orderId) => {
  selectedOrderId.value = typeof orderId === 'string' ? orderId : ''
}

const closeOrderDetail = () => {
  selectedOrderId.value = ''
}

const transferSuggestionToAsset = (suggestion) => {
  if (!suggestion || suggestion.imported) return null
  return assetsStore.upsertAsset({
    id: suggestion.assetId,
    name: suggestion.title,
    category: suggestion.assetCategory,
    estimatedValue: suggestion.amount,
    purchaseValue: suggestion.amount,
    currency: suggestion.currency,
    note: t('Manually imported from a Shopping order.', 'Manually imported from a Shopping order.'),
    sourceModule: ASSET_SOURCE_KEYS.SHOPPING_PURCHASE,
    sourceId: `${suggestion.orderId}:${suggestion.productId}`,
    tags: ['shopping'],
  })
}

const transferSuggestionToWallet = (suggestion) => {
  if (!suggestion || suggestion.imported) return null
  const existing = walletStore.findTransactionBySource(SHOPPING_SOURCE_KEYS.WALLET_EXPENSE, suggestion.sourceId)
  const transaction = existing || walletStore.addTransaction({
    type: 'expense',
    title: 'Shopping order',
    amount: suggestion.amount,
    currency: suggestion.currency,
    counterparty: 'Shopping',
    note: t('Manually imported from a Shopping order.', 'Manually imported from a Shopping order.'),
    sourceModule: SHOPPING_SOURCE_KEYS.WALLET_EXPENSE,
    sourceId: suggestion.sourceId,
  })
  recordShoppingGiftRelationshipFact({
    chatStore,
    relationshipRuntimeStore,
    order: suggestion.order,
    transaction,
  })
  if (suggestion.relationshipSuggestion?.available) {
    recordWalletOrderSupportRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      target: suggestion.relationshipSuggestion.target,
      transaction,
      memoryKey: buildShoppingGiftRelationshipMemoryKey(suggestion.order),
      summary: `Wallet expense recorded for the same Shopping gift with ${suggestion.relationshipTargetName || 'a relationship contact'}.`,
    })
  }
  return transaction
}

watch(
  () => visibleProducts.value.map((product) => product.image?.galleryAssetId || '').filter(Boolean),
  (assetIds) => {
    const activeSet = new Set(assetIds)
    assetIds.forEach((assetId) => {
      if (productImagePreviewMap[assetId]) return
      void galleryStore.getAssetPreviewUrl(assetId, {
        scopeId: SHOPPING_IMAGE_PREVIEW_SCOPE_ID,
      }).then((previewUrl) => {
        if (previewUrl) productImagePreviewMap[assetId] = previewUrl
      })
    })
    Object.keys(productImagePreviewMap).forEach((assetId) => {
      if (!activeSet.has(assetId)) {
        galleryStore.releaseAssetPreview(assetId, SHOPPING_IMAGE_PREVIEW_SCOPE_ID)
        delete productImagePreviewMap[assetId]
      }
    })
  },
  { immediate: true },
)

watch(
  () => sourceChatId.value,
  (chatId) => {
    if (giftDraft.contactId || !chatId) return
    const numericChatId = Number(chatId)
    if (!Number.isFinite(numericChatId) || numericChatId <= 0) return
    const contact = chatStore.getContactById(numericChatId)
    if (!contact) return
    giftDraft.enabled = true
    giftDraft.contactId = String(Math.floor(numericChatId))
    giftDraft.name = contact.name || ''
  },
  { immediate: true },
)

watch(
  highlightedOrderId,
  (orderId) => {
    if (orderId && orders.value.some((order) => order.id === orderId)) {
      selectedOrderId.value = orderId
    }
  },
  { immediate: true },
)

watch(
  orders,
  () => {
    if (selectedOrderId.value && !orders.value.some((order) => order.id === selectedOrderId.value)) {
      selectedOrderId.value = ''
    }
  },
  { deep: true },
)

onBeforeUnmount(() => {
  galleryStore.releaseAssetPreviewScope(SHOPPING_IMAGE_PREVIEW_SCOPE_ID)
  Object.keys(productImagePreviewMap).forEach((assetId) => {
    delete productImagePreviewMap[assetId]
  })
})
</script>

<template>
  <div class="w-full h-full bg-white text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('Home', 'Home') }}
      </button>
      <h1 class="font-bold">{{ activeShoppingAppLabel }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto no-scrollbar bg-gray-50 px-5 py-6 space-y-4">
      <section class="rounded-3xl bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 border border-orange-100 p-5">
        <p class="text-xs font-semibold text-orange-600">{{ t('Shopping folder app', 'Shopping folder app') }}</p>
        <h2 class="mt-2 text-2xl font-black text-gray-950">
          {{ activeShoppingAppLabel }}
        </h2>
        <p class="mt-3 text-xs leading-5 text-gray-600">
          {{ activeShoppingAppDesc }}
        </p>
        <div class="mt-4 grid grid-cols-4 gap-2">
          <div class="rounded-2xl bg-white/70 p-3">
            <p class="text-[10px] text-gray-500">{{ t('Products', 'Products') }}</p>
            <p class="mt-1 text-lg font-black">{{ productCount }}</p>
          </div>
          <div class="rounded-2xl bg-white/70 p-3">
            <p class="text-[10px] text-gray-500">{{ t('Favorites', 'Favorites') }}</p>
            <p class="mt-1 text-lg font-black">{{ favoriteCount }}</p>
          </div>
          <div class="rounded-2xl bg-white/70 p-3">
            <p class="text-[10px] text-gray-500">{{ t('Cart', 'Cart') }}</p>
            <p class="mt-1 text-lg font-black">{{ cartQuantity }}</p>
          </div>
          <div class="rounded-2xl bg-white/70 p-3">
            <p class="text-[10px] text-gray-500">{{ t('Orders', 'Orders') }}</p>
            <p class="mt-1 text-lg font-black">{{ orderCount }}</p>
          </div>
        </div>
      </section>

      <section
        v-if="openedFromChatProductCard || openedFromChatGiftOrder || openedFromChatShoppingOrder || openedFromChatLogistics"
        class="rounded-2xl border bg-white p-4"
        :class="openedFromChatGiftOrder ? 'border-rose-200' : openedFromChatLogistics ? 'border-sky-200' : openedFromChatShoppingOrder ? 'border-indigo-200' : 'border-orange-200'"
        data-testid="shopping-chat-source-banner"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p
              class="text-xs font-semibold"
              :class="openedFromChatGiftOrder ? 'text-rose-600' : openedFromChatLogistics ? 'text-sky-600' : openedFromChatShoppingOrder ? 'text-indigo-600' : 'text-orange-600'"
            >
              {{
                openedFromChatGiftOrder
                  ? t('From Chat gift order', 'From Chat gift order')
                  : openedFromChatLogistics
                    ? t('From Chat logistics reminder', 'From Chat logistics reminder')
                    : openedFromChatShoppingOrder
                      ? t('From Chat service order notification', 'From Chat service order notification')
                  : t('From Chat product card', 'From Chat product card')
              }}
            </p>
            <p class="mt-1 text-[11px] leading-5 text-gray-500">
              {{
                openedFromChatGiftOrder
                  ? t('Shopping owns the confirmed gift order; Chat only shows the gift context.', 'Shopping owns the confirmed gift order; Chat only shows the gift context.')
                  : openedFromChatLogistics
                    ? t('Shopping owns logistics review; Chat only surfaced the shop service-account reminder.', 'Shopping owns logistics review; Chat only surfaced the shop service-account reminder.')
                    : openedFromChatShoppingOrder
                      ? t('Shopping owns the order; Chat only keeps a service-account notification and source link.', 'Shopping owns the order; Chat only keeps a service-account notification and source link.')
                  : t('Shopping owns browsing, cart, and checkout here; Chat only keeps discussion and recommendation records.', 'Shopping owns browsing, cart, and checkout here; Chat only keeps discussion and recommendation records.')
              }}
            </p>
          </div>
          <button
            v-if="sourceChatId"
            data-testid="shopping-return-chat"
            @click="goBackToChat"
            class="shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold"
            :class="openedFromChatGiftOrder ? 'border-rose-200 text-rose-600' : openedFromChatLogistics ? 'border-sky-200 text-sky-600' : openedFromChatShoppingOrder ? 'border-indigo-200 text-indigo-600' : 'border-orange-200 text-orange-600'"
          >
            {{ t('Back to Chat', 'Back to Chat') }}
          </button>
        </div>
      </section>

      <section
        v-if="worldAppContext"
        class="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4"
        data-testid="shopping-world-app-context"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase text-emerald-700">
              {{ t('世界应用', 'World app') }}
            </p>
            <h2 class="mt-1 text-lg font-black text-gray-950" data-testid="shopping-world-app-title">
              {{ worldAppContext.bindingTitle }}
            </h2>
            <p class="mt-1 text-[11px] font-semibold text-emerald-700">
              {{ t('来自', 'From') }} {{ t(worldAppContext.packTitle, worldAppContext.packName) }}
            </p>
            <p class="mt-2 text-[11px] leading-5 text-gray-600">
              {{ worldAppDescription }}
            </p>
            <p class="mt-2 text-[11px] leading-5 text-emerald-800" data-testid="shopping-world-app-boundary">
              {{
                t(
                  'Shopping 仍拥有商品、购物车、结账、订单和下游建议；世界包只提供入口语义与筛选建议。',
                  worldAppContext.boundaryCopy,
                )
              }}
            </p>
          </div>
          <button
            class="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold"
            :class="worldAppFilterActive ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white'"
            :disabled="worldAppFilterActive"
            data-testid="shopping-world-app-apply-filter"
            @click="applyWorldAppFilter"
          >
            {{
              worldAppFilterActive
                ? t('已在补给筛选', 'Supply filter active')
                : t('应用补给筛选', 'Apply supply filter')
            }}
          </button>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('Current shelf', 'Current shelf') }}</p>
            <p class="mt-1 text-xs text-gray-500">
              {{ languageBase === 'zh' ? activeCategory.zh : activeCategory.en }}
            </p>
          </div>
          <span class="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
            {{ activeCategory.key }}
          </span>
        </div>
      </section>

      <section
        v-if="activeCategoryIsLogistics"
        class="rounded-2xl border border-sky-100 bg-white p-4"
        data-testid="shopping-logistics-panel"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('物流跟踪', 'Logistics tracking') }}</p>
            <p class="mt-1 text-[11px] leading-5 text-gray-500">
              {{
                t(
                  '物流入口与购物品类平级，但只聚合订单配送状态；订单仍归 Shopping，提醒仍归 Calendar。',
                  'Logistics is a peer Shopping entry, but only aggregates delivery state. Orders stay in Shopping; reminders stay in Calendar.',
                )
              }}
            </p>
          </div>
          <span class="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700">
            {{ logisticsOrderRows.length }} {{ t('orders', 'orders') }}
          </span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div class="rounded-xl bg-orange-50 p-3 text-orange-700">
            <p class="font-semibold">{{ t('Calendar', 'Calendar') }}</p>
            <p class="mt-1 leading-4">{{ t('配送线索确认后成为日程和推送。', 'Delivery cues become events and pushes after confirmation.') }}</p>
          </div>
          <div class="rounded-xl bg-blue-50 p-3 text-blue-700">
            <p class="font-semibold">{{ t('Map', 'Map') }}</p>
            <p class="mt-1 leading-4">{{ t('后续可接配送地址和取件路线。', 'Can later consume delivery address and pickup routes.') }}</p>
          </div>
          <div class="rounded-xl bg-emerald-50 p-3 text-emerald-700">
            <p class="font-semibold">{{ t('Chat', 'Chat') }}</p>
            <p class="mt-1 leading-4">{{ t('店铺服务号可发送发货/到达提醒。', 'Shop service accounts can send shipment or arrival reminders.') }}</p>
          </div>
          <div class="rounded-xl bg-gray-50 p-3 text-gray-700">
            <p class="font-semibold">{{ t('Wallet / Assets', 'Wallet / Assets') }}</p>
            <p class="mt-1 leading-4">{{ t('消费和购买后拥有物仍由各自模块记录。', 'Expense and owned-object records stay in their own modules.') }}</p>
          </div>
        </div>
        <div v-if="logisticsOrderRows.length === 0" class="mt-4 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-400">
          {{ t('暂无可跟踪物流的购物订单。', 'No Shopping orders are ready for logistics tracking yet.') }}
        </div>
        <div v-else class="mt-3 space-y-2">
          <article
            v-for="row in logisticsOrderRows"
            :key="row.order.id"
            class="rounded-xl border p-3"
            :class="row.order.id === highlightedOrderId ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-sky-50 bg-sky-50/40'"
            :data-testid="`shopping-logistics-order-${row.order.id}`"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-xs font-bold text-gray-950">{{ row.title }}</p>
                <p class="mt-1 text-[11px] text-gray-500">{{ row.total }} · {{ formatLogisticsDate(row.suggestedAt) }}</p>
                <p class="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500">{{ row.summary }}</p>
              </div>
              <span
                class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold"
                :class="logisticsStatusClass(row.status)"
                :data-testid="`shopping-logistics-status-${row.order.id}`"
              >
                {{ logisticsStatusLabel(row.status) }}
              </span>
            </div>
            <div
              v-if="row.latestEvent"
              class="mt-2 rounded-lg border border-white bg-white/80 px-2.5 py-2 text-[11px] text-sky-800"
              :data-testid="`shopping-logistics-latest-event-${row.order.id}`"
            >
              <p class="font-semibold">
                {{ logisticsEventTypeLabel(row.latestEvent.type) }}
                <span v-if="row.latestEvent.carrierName" class="font-normal text-sky-600">
                  路 {{ row.latestEvent.carrierName }}
                </span>
              </p>
              <p class="mt-1 line-clamp-2 leading-4 text-sky-600">
                {{ row.latestEvent.summary || row.latestEvent.title }}
              </p>
              <p
                v-if="row.latestEvent.trackingCode || row.latestEvent.pickupPoint || row.latestEvent.locationHint"
                class="mt-1 text-[10px] text-sky-500"
              >
                {{
                  [
                    row.latestEvent.trackingCode,
                    row.latestEvent.pickupPoint,
                    row.latestEvent.locationHint,
                  ].filter(Boolean).join(' · ')
                }}
              </p>
            </div>
            <DeliveryRouteContextCard
              :context="row.mapHandoff"
              :test-id="`shopping-logistics-map-context-${row.order.id}`"
            />
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <button
                class="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-sky-700"
                :data-testid="`shopping-logistics-detail-${row.order.id}`"
                @click="openOrderDetail(row.order.id)"
              >
                {{ t('查看订单', 'View order') }}
              </button>
              <button
                v-if="row.cue?.id"
                class="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-orange-700"
                :data-testid="`shopping-logistics-calendar-${row.order.id}`"
                @click="router.push('/reminders')"
              >
                {{ t('去提醒事项确认', 'Confirm in Reminders') }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-amber-100 p-4" data-testid="shopping-service-filter-panel">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('Shopping apps', 'Shopping apps') }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">
              {{
                t(
                  'The Home folder opens separate shopping apps. Orders still use the shared local checkout layer.',
                  'The Home folder opens separate shopping apps. Orders still use the shared local checkout layer.',
                )
              }}
            </p>
          </div>
          <button
            class="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold"
            :class="activeService ? 'bg-gray-100 text-gray-500' : 'bg-amber-500 text-white'"
            data-testid="shopping-service-all"
            @click="openService('')"
          >
            {{ t('All', 'All') }}
          </button>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            v-for="service in serviceCards"
            :key="service.key"
            class="rounded-2xl border p-3 text-left transition"
            :class="service.active ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-gray-50'"
            :data-testid="`shopping-service-${service.key}`"
            @click="openService(service.key)"
          >
            <span
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white"
              :class="service.active ? 'bg-amber-500' : 'bg-gray-900'"
            >
              <i :class="service.icon"></i>
            </span>
            <p class="mt-2 text-xs font-bold text-gray-950">{{ service.label }}</p>
            <p class="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500">{{ service.desc }}</p>
            <p class="mt-2 text-[10px] font-semibold text-amber-600">
              {{ service.count }} {{ t('items', 'items') }}
            </p>
          </button>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-orange-100 p-4" data-testid="shopping-custom-product-form">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('Custom product', 'Custom product') }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">
              {{ t('Create products with custom name, price, category, and URL/Gallery image. Import local files into Gallery first.', 'Create products with custom name, price, category, and URL/Gallery image. Import local files into Gallery first.') }}
            </p>
          </div>
          <span class="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-600">
            {{ t('User origin', 'User origin') }}
          </span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <input
            v-model="productDraft.title"
            data-testid="shopping-custom-title"
            class="rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none"
            :placeholder="t('Product name', 'Product name')"
          />
          <select
            v-model="productDraft.category"
            data-testid="shopping-custom-category"
            class="rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none"
          >
            <option v-for="category in productCategoryCards" :key="category.key" :value="category.key">
              {{ category.label }}
            </option>
          </select>
          <input
            v-model="productDraft.price"
            data-testid="shopping-custom-price"
            class="rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none"
            inputmode="decimal"
            :placeholder="t('Price, e.g. 88.00', 'Price, e.g. 88.00')"
          />
          <input
            v-model="productDraft.currency"
            data-testid="shopping-custom-currency"
            class="rounded-xl border border-gray-200 px-3 py-2 text-xs uppercase outline-none"
            :placeholder="t('Currency', 'Currency')"
          />
          <select
            v-model="productDraft.serviceKey"
            data-testid="shopping-custom-service"
            class="col-span-2 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs outline-none"
          >
            <option value="">{{ t('Auto service preset', 'Auto service preset') }}</option>
            <option v-for="service in serviceCards" :key="service.key" :value="service.key">
              {{ service.label }}
            </option>
          </select>
          <ImageSourcePicker
            v-model:source-type="productDraft.imageSourceType"
            v-model:image-url="productDraft.imageUrl"
            v-model:gallery-asset-id="productDraft.imageGalleryAssetId"
            :gallery-assets="galleryImageOptions"
            size="xs"
            test-id-prefix="shopping-custom"
          />
          <textarea
            v-model="productDraft.desc"
            data-testid="shopping-custom-desc"
            class="col-span-2 rounded-xl border border-gray-200 px-3 py-2 text-xs outline-none"
            rows="2"
            :placeholder="t('Product description', 'Product description')"
          ></textarea>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div class="flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
            <label class="inline-flex items-center gap-1">
              <input v-model="productDraft.assetEligible" type="checkbox" />
              {{ t('Asset-ready', 'Asset-ready') }}
            </label>
            <label class="inline-flex items-center gap-1">
              <input v-model="productDraft.giftable" type="checkbox" />
              {{ t('Giftable', 'Giftable') }}
            </label>
          </div>
          <button
            data-testid="shopping-create-custom-product"
            class="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white"
            @click="createCustomProduct"
          >
            {{ t('Add to catalog', 'Add to catalog') }}
          </button>
        </div>
        <p v-if="productFeedback" class="mt-2 text-[11px] text-orange-600">{{ productFeedback }}</p>
      </section>

      <section class="grid grid-cols-2 gap-3">
        <button
          v-for="category in platformCategoryCards"
          :key="category.key"
          class="rounded-2xl border p-4 text-left transition"
          :class="category.active ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'"
          :data-testid="`shopping-category-${category.key}`"
          @click="openCategory(category.key)"
        >
          <span
            class="w-10 h-10 rounded-xl text-white flex items-center justify-center"
            :class="category.active ? 'bg-orange-500' : 'bg-gray-900'"
          >
            <i :class="category.icon"></i>
          </span>
          <p class="mt-3 text-sm font-bold">{{ category.label }}</p>
          <p class="mt-1 text-[11px] leading-4 text-gray-500">{{ category.desc }}</p>
          <p class="mt-2 text-[10px] font-semibold text-orange-600">
            {{ category.count }} {{ t('items', 'items') }}
          </p>
        </button>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold">{{ t('Products', 'Products') }}</p>
          <span class="text-[11px] text-gray-400">{{ visibleProducts.length }} {{ t('items', 'items') }}</span>
        </div>
        <div v-if="visibleProducts.length === 0" class="mt-4 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-400">
          {{ t('No products in this category yet.', 'No products in this category yet.') }}
        </div>
        <div v-else class="mt-3 space-y-3">
          <article
            v-for="product in visibleProducts"
            :key="product.id"
            class="rounded-2xl border p-3 transition"
            :class="product.id === highlightedProductId ? 'border-orange-300 bg-orange-50 shadow-sm' : 'border-gray-100 bg-gray-50'"
            :data-testid="`shopping-product-${product.id}`"
          >
            <div class="flex items-start gap-3">
              <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-200 to-rose-200 flex items-center justify-center text-orange-700">
                <img
                  v-if="productImageUrl(product)"
                  :src="productImageUrl(product)"
                  :alt="product.image?.alt || product.title"
                  class="h-full w-full rounded-2xl object-cover"
                />
                <i v-else class="fas fa-bag-shopping"></i>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="text-sm font-bold text-gray-950">{{ product.title }}</p>
                    <p class="mt-1 text-[11px] leading-4 text-gray-500">{{ product.desc }}</p>
                    <p class="mt-1 text-[10px] text-orange-500">
                      {{ productImageSourceLabel(product) }} · {{ product.origin }} · {{ productServiceLabel(product) }}
                    </p>
                  </div>
                  <button
                    class="shrink-0 text-sm"
                    :class="shoppingStore.isProductFavorite(product.id) ? 'text-rose-500' : 'text-gray-300'"
                    :aria-label="t('Toggle favorite', 'Toggle favorite')"
                    @click="toggleFavorite(product.id)"
                  >
                    <i class="fas fa-heart"></i>
                  </button>
                </div>
                <div class="mt-3 flex items-center justify-between gap-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-black">{{ formatPrice(product) }}</span>
                    <span class="rounded-full px-2 py-1 text-[10px] font-semibold" :class="stockStatusClass(product.stockStatus)">
                      {{ stockStatusLabel(product.stockStatus) }}
                    </span>
                    <span v-if="product.assetEligible" class="rounded-full bg-cyan-50 px-2 py-1 text-[10px] font-semibold text-cyan-700">
                      {{ t('Asset-ready', 'Asset-ready') }}
                    </span>
                    <span v-if="product.giftable" class="rounded-full bg-pink-50 px-2 py-1 text-[10px] font-semibold text-pink-600">
                      {{ t('Giftable', 'Giftable') }}
                    </span>
                  </div>
                  <button
                    class="rounded-full bg-orange-500 px-3 py-1.5 text-[11px] font-semibold text-white disabled:bg-gray-300"
                    :disabled="product.stockStatus === 'sold_out'"
                    :data-testid="`shopping-add-cart-${product.id}`"
                    @click="addToCart(product.id)"
                  >
                    {{ t('Add', 'Add') }}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('Cart', 'Cart') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">
              {{ t('Checkout creates a Shopping-local order; Wallet, Assets, and Calendar handoffs still require user confirmation.', 'Checkout creates a Shopping-local order; Wallet, Assets, and Calendar handoffs still require user confirmation.') }}
            </p>
          </div>
          <span class="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
            {{ cartPrimaryTotal.amount }} {{ cartPrimaryTotal.currency }}
          </span>
        </div>
        <div v-if="cartLineItems.length === 0" class="mt-4 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-400">
          {{ t('Cart is empty.', 'Cart is empty.') }}
        </div>
        <div v-else class="mt-3 space-y-2">
          <article
            v-for="line in cartLineItems"
            :key="line.productId"
            class="rounded-xl border border-gray-100 p-3"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-xs font-semibold">{{ line.product.title }}</p>
                <p class="mt-1 text-[11px] text-gray-500">{{ line.subtotal }} {{ line.currency }}</p>
              </div>
              <div class="flex items-center gap-2">
                <button class="w-7 h-7 rounded-full bg-gray-100 text-xs" @click="updateCartQuantity(line.productId, -1)">-</button>
                <span class="w-5 text-center text-xs font-semibold">{{ line.quantity }}</span>
                <button class="w-7 h-7 rounded-full bg-gray-100 text-xs" @click="updateCartQuantity(line.productId, 1)">+</button>
              </div>
            </div>
          </article>
          <div class="rounded-xl border border-pink-100 bg-pink-50/50 p-3" data-testid="shopping-gift-recipient-panel">
            <label class="flex items-center gap-2 text-[11px] font-semibold text-pink-700">
              <input v-model="giftDraft.enabled" type="checkbox" data-testid="shopping-gift-enabled" />
              {{ t('Send as gift to a contact', 'Send as gift to a contact') }}
            </label>
            <div v-if="giftDraft.enabled" class="mt-2 grid grid-cols-1 gap-2">
              <select
                v-model="giftDraft.contactId"
                class="rounded-xl border border-pink-100 bg-white px-3 py-2 text-xs outline-none"
                data-testid="shopping-gift-contact"
              >
                <option value="">{{ t('Manual recipient', 'Manual recipient') }}</option>
                <option v-for="contact in giftRecipientOptions" :key="contact.id" :value="String(contact.id)">
                  {{ contact.name }}
                </option>
              </select>
              <input
                v-model="giftDraft.name"
                class="rounded-xl border border-pink-100 bg-white px-3 py-2 text-xs outline-none"
                data-testid="shopping-gift-name"
                :placeholder="t('Recipient name', 'Recipient name')"
              />
              <p class="text-[10px] leading-4 text-pink-600">
                {{ t('Only gift context is recorded here; cart, order, and checkout stay owned by Shopping.', 'Only gift context is recorded here; cart, order, and checkout stay owned by Shopping.') }}
              </p>
            </div>
          </div>
          <button
            class="w-full rounded-xl bg-gray-950 py-2.5 text-sm font-semibold text-white"
            data-testid="shopping-checkout"
            @click="checkoutCart"
          >
            {{ t('Create local order', 'Create local order') }}
          </button>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-semibold">{{ t('Recent orders', 'Recent orders') }}</p>
          <span class="text-[11px] text-gray-400">{{ orderCount }}</span>
        </div>
        <div v-if="recentOrders.length === 0" class="mt-4 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-400">
          {{ t('No orders yet.', 'No orders yet.') }}
        </div>
        <div v-else class="mt-3 space-y-2">
          <article
            v-for="order in recentOrders"
            :key="order.id"
            class="rounded-xl border p-3"
            :class="order.id === highlightedOrderId ? 'border-rose-300 bg-rose-50 shadow-sm' : 'border-gray-100'"
            :data-testid="`shopping-order-${order.id}`"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold">{{ order.itemCount }} {{ t('items', 'items') }}</p>
                <p class="mt-1 text-[11px] text-gray-500">
                  {{ formatOrderTotal(order) }} · {{ orderStatusLabel(order.status) }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="rounded-full bg-gray-900 px-3 py-1.5 text-[11px] font-semibold text-white"
                  :data-testid="`shopping-open-order-detail-${order.id}`"
                  @click="openOrderDetail(order.id)"
                >
                  {{ t('Details', 'Details') }}
                </button>
                <button class="text-[11px] text-gray-400" @click="removeOrder(order.id)">
                  {{ t('Delete', 'Delete') }}
                </button>
              </div>
            </div>
            <p
              v-if="order.id === highlightedOrderId"
              class="mt-2 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-600"
              :data-testid="`shopping-highlighted-order-${order.id}`"
            >
              {{ t('Chat gift order context', 'Chat gift order context') }}
            </p>
            <p class="mt-2 line-clamp-1 text-[11px] text-gray-500">
              {{ order.items.map((item) => item.title).join(' / ') }}
            </p>
            <p
              v-if="order.giftRecipient?.name"
              class="mt-1 text-[11px] font-semibold text-pink-600"
              :data-testid="`shopping-order-gift-${order.id}`"
            >
              {{ t('Gift recipient', 'Gift recipient') }}: {{ order.giftRecipient.name }}
            </p>
          </article>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4">
        <p class="text-sm font-semibold">{{ t('联动边界状态', 'Handoff boundary status') }}</p>
        <div class="mt-3 space-y-2">
          <article
            v-for="item in sourcePlan"
            :key="item.key"
            class="rounded-xl bg-gray-50 p-3"
          >
            <p class="text-xs font-semibold text-gray-900">{{ item.title }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">{{ item.desc }}</p>
            <code class="mt-2 block text-[10px] text-gray-400">{{ item.key }}</code>
          </article>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-cyan-100 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('资产转入建议', 'Asset transfer suggestions') }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">
              {{ t('只有可转资产的订单商品会出现在这里；Assets 只会在点击后写入。', 'Only asset-eligible order items appear here; Assets is written only after a click.') }}
            </p>
          </div>
          <span class="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-semibold text-cyan-700">
            {{ assetTransferSuggestions.length }}
          </span>
        </div>
        <div
          v-if="assetTransferSuggestions.length === 0"
          class="mt-4 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-400"
        >
          {{ t('暂无可转入 Assets 的 Shopping 订单。', 'No Shopping orders are ready for Assets yet.') }}
        </div>
        <div v-else class="mt-3 space-y-2">
          <article
            v-for="suggestion in assetTransferSuggestions"
            :key="suggestion.assetId"
            class="rounded-xl border border-cyan-50 bg-cyan-50/40 p-3"
            :data-testid="`shopping-asset-suggestion-${suggestion.productId}`"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold text-gray-900">{{ suggestion.title }}</p>
                <p class="mt-1 text-[11px] text-gray-500">
                  {{ suggestion.amount }} {{ suggestion.currency }} ? {{ suggestion.assetCategory }}
                </p>
              </div>
              <button
                class="rounded-full px-3 py-1.5 text-[11px] font-semibold"
                :class="suggestion.imported ? 'bg-gray-100 text-gray-400' : 'bg-cyan-600 text-white'"
                :disabled="suggestion.imported"
                :data-testid="`shopping-transfer-asset-${suggestion.productId}`"
                @click="transferSuggestionToAsset(suggestion)"
              >
                {{ suggestion.imported ? t('Imported', 'Imported') : t('Import', 'Import') }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-emerald-100 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('Wallet 消费建议', 'Wallet expense suggestions') }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">
              {{ t('订单不会自动写入 Wallet；点击后才会创建消费记录。', 'Orders are not written to Wallet automatically; click to create an expense record.') }}
            </p>
          </div>
          <span class="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            {{ walletExpenseSuggestions.length }}
          </span>
        </div>
        <div
          v-if="walletExpenseSuggestions.length === 0"
          class="mt-4 rounded-xl bg-gray-50 p-4 text-center text-xs text-gray-400"
        >
          {{ t('暂无可写入 Wallet 的 Shopping 订单。', 'No Shopping orders are ready for Wallet yet.') }}
        </div>
        <div v-else class="mt-3 space-y-2">
          <article
            v-for="suggestion in walletExpenseSuggestions"
            :key="suggestion.orderId"
            class="rounded-xl border border-emerald-50 bg-emerald-50/40 p-3"
            :data-testid="`shopping-wallet-suggestion-${suggestion.orderId}`"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold text-gray-900">
                  {{ suggestion.itemCount }} {{ t('items', 'items') }}
                </p>
                <p class="mt-1 text-[11px] text-gray-500">
                  {{ suggestion.amount }} {{ suggestion.currency }}
                </p>
                <p
                  v-if="suggestion.relationshipAvailable"
                  class="mt-1 text-[11px] font-semibold"
                  :class="suggestion.relationshipImported ? 'text-emerald-600' : 'text-amber-600'"
                  :data-testid="`shopping-relationship-suggestion-${suggestion.orderId}`"
                >
                  {{
                    suggestion.relationshipImported
                      ? t(`Relationship fact recorded for ${suggestion.relationshipTargetName}.`, `Relationship fact recorded for ${suggestion.relationshipTargetName}.`)
                      : t(`Relationship fact ready for ${suggestion.relationshipTargetName}.`, `Relationship fact ready for ${suggestion.relationshipTargetName}.`)
                  }}
                </p>
              </div>
              <button
                class="rounded-full px-3 py-1.5 text-[11px] font-semibold"
                :class="suggestion.imported ? 'bg-gray-100 text-gray-400' : 'bg-emerald-600 text-white'"
                :disabled="suggestion.imported"
                :data-testid="`shopping-transfer-wallet-${suggestion.orderId}`"
                @click="transferSuggestionToWallet(suggestion)"
              >
                {{ suggestion.imported ? t('Recorded', 'Recorded') : t('Record', 'Record') }}
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div
      v-if="selectedOrder"
      class="fixed inset-0 z-40 flex items-end bg-black/35 px-4 pb-4"
      data-testid="shopping-order-detail-panel"
      @click.self="closeOrderDetail"
    >
      <section class="w-full rounded-t-3xl bg-white p-5 shadow-2xl">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-base font-black text-gray-950">{{ t('Order details', 'Order details') }}</p>
            <p class="mt-1 truncate text-[11px] text-gray-500">{{ selectedOrder.id }}</p>
          </div>
          <button
            class="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-600"
            data-testid="shopping-close-order-detail"
            @click="closeOrderDetail"
          >
            {{ t('Close', 'Close') }}
          </button>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2 text-[11px]">
          <div class="rounded-2xl bg-orange-50 p-3">
            <p class="text-orange-500">{{ t('Total', 'Total') }}</p>
            <p class="mt-1 font-bold text-orange-800" data-testid="shopping-order-detail-total">
              {{ formatOrderTotal(selectedOrder) }}
            </p>
          </div>
          <div class="rounded-2xl bg-gray-50 p-3">
            <p class="text-gray-500">{{ t('Status', 'Status') }}</p>
            <p
              class="mt-1 inline-flex rounded-full px-2 py-0.5 font-bold"
              :class="orderStatusClass(selectedOrder.status)"
              data-testid="shopping-order-detail-status"
            >
              {{ orderStatusLabel(selectedOrder.status) }}
            </p>
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <article
            v-for="item in selectedOrder.items"
            :key="item.id"
            class="rounded-2xl border border-gray-100 p-3"
            :data-testid="`shopping-order-detail-item-${item.productId}`"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-xs font-bold text-gray-950">{{ item.title }}</p>
                <p class="mt-1 text-[11px] text-gray-500">
                  {{ item.quantity }} × {{ (item.unitPriceCents / 100).toFixed(2) }} {{ item.currency }}
                </p>
              </div>
              <span class="shrink-0 text-xs font-bold text-gray-900">
                {{ formatOrderItemSubtotal(item) }}
              </span>
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <span
                v-if="item.giftable"
                class="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-semibold text-pink-600"
              >
                {{ t('Giftable', 'Giftable') }}
              </span>
              <span
                v-if="item.assetEligible"
                class="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700"
              >
                {{ t('Asset-ready', 'Asset-ready') }}
              </span>
            </div>
          </article>
        </div>

        <div class="mt-4 rounded-2xl border border-pink-100 bg-pink-50/60 p-3 text-[11px]">
          <p class="font-bold text-pink-700">{{ t('Gift context', 'Gift context') }}</p>
          <p class="mt-1 text-pink-600" data-testid="shopping-order-detail-gift">
            {{
              selectedOrder.giftRecipient?.name
                ? `${selectedOrder.giftRecipient.name} · ${selectedOrder.giftRecipient.sourceModule || 'shopping'}`
                : t('No gift recipient attached.', 'No gift recipient attached.')
            }}
          </p>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <button
            class="rounded-2xl px-3 py-2.5 text-xs font-bold"
            :class="canCompleteOrder(selectedOrder) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'"
            :disabled="!canCompleteOrder(selectedOrder)"
            data-testid="shopping-order-detail-complete"
            @click="markOrderCompleted(selectedOrder.id)"
          >
            {{ t('Mark completed', 'Mark completed') }}
          </button>
          <button
            class="rounded-2xl px-3 py-2.5 text-xs font-bold"
            :class="canCancelOrder(selectedOrder) ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-400'"
            :disabled="!canCancelOrder(selectedOrder)"
            data-testid="shopping-order-detail-cancel"
            @click="cancelOrder(selectedOrder.id)"
          >
            {{ t('Cancel order', 'Cancel order') }}
          </button>
        </div>

        <p class="mt-3 rounded-2xl bg-gray-50 p-3 text-[11px] leading-4 text-gray-500">
          {{
            t(
              'Shopping owns order status. Completing or cancelling an order closes the Calendar delivery cue; Chat, Wallet, Assets, and Calendar only receive explicit handoffs.',
              'Shopping owns order status. Completing or cancelling an order closes the Calendar delivery cue; Chat, Wallet, Assets, and Calendar only receive explicit handoffs.',
            )
          }}
        </p>

        <div class="mt-4 flex gap-2">
          <button
            v-if="sourceChatId"
            class="flex-1 rounded-2xl bg-gray-950 py-2.5 text-sm font-bold text-white"
            data-testid="shopping-order-detail-return-chat"
            @click="goBackToChat"
          >
            {{ t('Return to Chat', 'Return to Chat') }}
          </button>
          <button
            class="flex-1 rounded-2xl border border-gray-200 bg-white py-2.5 text-sm font-bold text-gray-700"
            data-testid="shopping-order-detail-delete"
            @click="removeOrder(selectedOrder.id)"
          >
            {{ t('Delete order', 'Delete order') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
