<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ShoppingStorefrontHeader from '../components/ShoppingStorefrontHeader.vue'
import ImageSourcePicker from '../components/shared/ImageSourcePicker.vue'
import DeliveryRouteContextCard from '../components/map/DeliveryRouteContextCard.vue'
import { useI18n } from '../composables/useI18n'
import {
  RELATIONSHIP_FACT_SOURCE_KEYS,
  buildShoppingGiftRelationshipMemoryKey,
  buildShoppingGiftRelationshipSuggestion,
  recordShoppingGiftDeliveryRelationshipFact,
  recordShoppingGiftRelationshipFact,
  recordWalletOrderSupportRelationshipFact,
} from '../lib/relationship-fact-adapters'
import {
  buildShoppingWorldAppFilterQuery,
  resolveShoppingWorldAppContext,
} from '../lib/world-pack-app-bindings'
import { SHOP_ENTRY_BINDING_TARGET, resolveEntryPresentationMeta } from '../lib/app-entry-presentation'
import {
  ASSET_SOURCE_KEYS,
  SHOPPING_CATEGORY_ENTRIES,
  SHOPPING_SOURCE_KEYS,
  buildShoppingAppRoute,
  findShoppingCategory,
  findShoppingPlatformApp,
  findShoppingServicePreset,
} from '../lib/planned-module-registry'
import { pushReturnTarget } from '../lib/navigation-return'
import { projectUiAssetUrl } from '../lib/project-assets'
import { convertLegacyCentsToMoney } from '../lib/currency-system'
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

const SHOPPING_IMAGE_PREVIEW_SCOPE_ID = 'shopping-products-view'
const SHOPPING_SHOP_ENTRY_COVER_SCOPE_ID = 'shopping-shop-entry-cover'
const productImagePreviewMap = reactive({})
const shopEntryCoverPreviewMap = reactive({})
const shoppingMiniAppEntryId = (serviceKey = '') => (serviceKey ? `shop_app_shopping_${serviceKey}` : '')
const shoppingBrandAssetUrl = (path = '') =>
  projectUiAssetUrl(path)
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
const productSearchQuery = ref('')
const catalogManagerOpen = ref(false)
const favoritesOnly = ref(false)
const giftDraft = reactive({
  enabled: false,
  contactId: '',
  name: '',
})
const selectedOrderId = ref('')

const activeServiceKey = computed(() =>
  typeof route.params.serviceKey === 'string' ? route.params.serviceKey.trim() : '',
)
const activePlatformApp = computed(() => findShoppingPlatformApp(activeServiceKey.value))
const activeCategoryKey = computed(() => {
  const requested = typeof route.query.category === 'string' ? route.query.category.trim() : ''
  const allowedKeys = Array.isArray(activePlatformApp.value?.categoryKeys)
    ? activePlatformApp.value.categoryKeys
    : []
  return requested && (requested === 'logistics' || allowedKeys.includes(requested))
    ? requested
    : activePlatformApp.value?.defaultCategory || 'mall'
})
const highlightedProductId = computed(() =>
  typeof route.query.productId === 'string' ? route.query.productId.trim() : '',
)
const highlightedOrderId = computed(() =>
  typeof route.query.orderId === 'string' ? route.query.orderId.trim() : '',
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
const openedFromChatProductLink = computed(() =>
  sourceModule.value === 'chat' &&
  (sourceIntent.value === 'product_link' || sourceIntent.value === 'product_card'),
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
const openedFromAppStoreShopCreate = computed(
  () =>
    route.query.entry === 'shop' &&
    route.query.createShop === '1' &&
    (route.query.bindingTarget === SHOP_ENTRY_BINDING_TARGET.SHOPPING ||
      route.query.source === 'app_store'),
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
const favoriteProducts = computed(() =>
  shoppingStore.listFavoriteProductsByService(activeServiceKey.value),
)
const favoriteCount = computed(() => favoriteProducts.value.length)
const cartLineItems = computed(() =>
  shoppingStore.listCartLineItemsByService(activeServiceKey.value),
)
const cartQuantity = computed(() =>
  shoppingStore.getCartQuantityByService(activeServiceKey.value),
)
const cartPrimaryTotal = computed(() =>
  shoppingStore.getCartPrimaryTotalByService(activeServiceKey.value),
)
const orders = computed(() => shoppingStore.listOrdersByService(activeServiceKey.value))
const orderCount = computed(() => orders.value.length)
const activeShopEntryId = computed(() => {
  const rawEntryId = typeof route.query.shopEntryId === 'string' ? route.query.shopEntryId.trim() : ''
  const canonicalEntryId = shoppingMiniAppEntryId(activeServiceKey.value)
  return rawEntryId === canonicalEntryId ? rawEntryId : canonicalEntryId
})
const activeShopEntryPresentation = computed(() => {
  if (!activeShopEntryId.value || !activePlatformApp.value?.key) return null
  return resolveEntryPresentationMeta(
    {
      id: activeShopEntryId.value,
      icon: activePlatformApp.value.icon || 'fas fa-store',
      accent: activePlatformApp.value.accent || 'warm',
      entryKind: 'shop_app',
      shopAppEntry: true,
      sourceModule: SHOP_ENTRY_BINDING_TARGET.SHOPPING,
      bindingTarget: SHOP_ENTRY_BINDING_TARGET.SHOPPING,
      runtimeIdentity: activePlatformApp.value.key,
    },
    systemStore.settings.appearance?.entryPresentationOverrides || {},
  )
})
const activeShopEntryCoverAssetId = computed(() => activeShopEntryPresentation.value?.coverGalleryAssetId || '')
const activeShopEntryCoverImageUrl = computed(() =>
  activeShopEntryCoverAssetId.value ? shopEntryCoverPreviewMap[activeShopEntryCoverAssetId.value] || '' : '',
)
const activeShoppingAppLabel = computed(() => {
  if (activeShopEntryPresentation.value?.displayName) return activeShopEntryPresentation.value.displayName
  const platform = activePlatformApp.value
  return languageBase.value === 'zh' ? platform.zh : platform.en
})
const activeShoppingAppDesc = computed(() => {
  if (activeShopEntryPresentation.value?.shortDescription) {
    return activeShopEntryPresentation.value.shortDescription
  }
  const platform = activePlatformApp.value
  return languageBase.value === 'zh' ? platform.descZh : platform.descEn
})
const visibleProducts = computed(() => {
  if (activeCategoryIsLogistics.value) return []
  const categoryKey = activeCategory.value?.key || 'mall'
  const serviceProducts = shoppingStore.listProductsByService(activeServiceKey.value)
  const categoryProducts = categoryKey === 'mall'
    ? serviceProducts
    : serviceProducts.filter((product) => product.category === categoryKey)

  const query = productSearchQuery.value.trim().toLocaleLowerCase()
  const searchResults = !query
    ? categoryProducts
    : categoryProducts.filter((product) =>
    [product.title, product.titleEn, product.desc, product.descEn]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(query)),
  )
  return favoritesOnly.value
    ? searchResults.filter((product) => shoppingStore.isProductFavorite(product.id))
    : searchResults
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
      const quotedMoney = order.quoteSnapshot?.quotedMoney || null
      return {
        order,
        orderId: order.id,
        sourceId,
        amount: quotedMoney
          ? walletStore.formatMoneyAmount(quotedMoney, { useGrouping: false })
          : (Number(order.totalCents || 0) / 100).toFixed(2),
        currency: quotedMoney?.currency || order.currency,
        quoteSnapshot: order.quoteSnapshot,
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
      route: cue?.route || buildShoppingAppRoute(activeServiceKey.value),
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
    count:
      entry.key === 'logistics'
        ? orderCount.value
        : entry.key === 'mall'
          ? shoppingStore.listProductsByService(activeServiceKey.value).length
          : shoppingStore
              .listProductsByService(activeServiceKey.value)
              .filter((product) => product.category === entry.key).length,
  })),
)

const productCategoryCards = computed(() => {
  const allowedKeys = Array.isArray(activePlatformApp.value.categoryKeys)
    ? activePlatformApp.value.categoryKeys
    : []
  return categoryCards.value.filter(
    (entry) => entry.key !== 'logistics' && allowedKeys.includes(entry.key),
  )
})

const platformCategoryCards = computed(() => {
  const allowedKeys = Array.isArray(activePlatformApp.value.categoryKeys)
    ? activePlatformApp.value.categoryKeys
    : []
  return categoryCards.value.filter(
    (entry) => entry.key === 'logistics' || allowedKeys.includes(entry.key),
  )
})

const activeStorefrontTemplate = computed(
  () => activePlatformApp.value?.storefrontTemplate || 'shopping_hub',
)
const activeBrandAssetUrl = computed(() =>
  shoppingBrandAssetUrl(activePlatformApp.value?.brandAssetPath || ''),
)
const activeMapReference = computed(() => {
  const service = activePlatformApp.value
  if (!service?.mapReferencePlaceId) return null
  return {
    placeId: service.mapReferencePlaceId,
    district: languageBase.value === 'zh' ? service.districtZh : service.districtEn,
  }
})

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const scrollToShoppingSection = (sectionId) => {
  if (typeof document === 'undefined') return
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const showFavoriteProducts = () => {
  favoritesOnly.value = true
  scrollToShoppingSection('shopping-products')
}

const showAllProducts = () => {
  favoritesOnly.value = false
  scrollToShoppingSection('shopping-products')
}

const openCatalogManager = () => {
  catalogManagerOpen.value = !catalogManagerOpen.value
  if (catalogManagerOpen.value) {
    requestAnimationFrame(() => scrollToShoppingSection('shopping-catalog-manager'))
  }
}

const goBackToChat = () => {
  const chatId = Number(sourceChatId.value)
  router.push(Number.isFinite(chatId) && chatId > 0 ? `/chat/${Math.floor(chatId)}` : '/chat')
}

const openCategory = (key) => {
  favoritesOnly.value = false
  const returnQuery = {}
  if (route.query.from === 'home') returnQuery.from = 'home'
  if (typeof route.query.homePage === 'string') returnQuery.homePage = route.query.homePage
  router.push({
    path: buildShoppingAppRoute(activeServiceKey.value),
    query: {
      ...returnQuery,
      category: key,
      ...(activeShopEntryId.value
        ? { entry: 'shop', shopEntryId: activeShopEntryId.value }
        : {}),
    },
  })
}

const applyWorldAppFilter = () => {
  if (!worldAppContext.value) return
  const stableQuery = { ...route.query }
  delete stableQuery.productId
  delete stableQuery.orderId
  const query = buildShoppingWorldAppFilterQuery({
      context: worldAppContext.value,
      currentQuery: stableQuery,
    })
  delete query.service
  router.push({
    path: buildShoppingAppRoute(worldAppContext.value.serviceKey),
    query,
  })
}

const formatSourceLegacyMoney = (amountCents = 0, currency = 'CNY') => {
  const sourceMoney = convertLegacyCentsToMoney(
    amountCents,
    currency,
    walletStore.currencyOptions,
  )
  return sourceMoney
    ? walletStore.formatMoney(sourceMoney, {
        locale: languageBase.value === 'zh' ? 'zh-CN' : 'en-US',
        currencyPosition: 'suffix',
        useGrouping: false,
      })
    : `${(Number(amountCents || 0) / 100).toFixed(2)} ${currency || 'CNY'}`
}

const quoteLegacyMoney = (amountCents = 0, currency = 'CNY') => {
  const sourceMoney = convertLegacyCentsToMoney(
    amountCents,
    currency,
    walletStore.currencyOptions,
  )
  return sourceMoney ? walletStore.quoteMoney(sourceMoney) : null
}

const formatQuotedMoney = (money = null) =>
  money
    ? walletStore.formatMoney(money, {
        locale: languageBase.value === 'zh' ? 'zh-CN' : 'en-US',
        currencyPosition: 'suffix',
      })
    : ''

const formatLegacyMoneyQuote = (amountCents = 0, currency = 'CNY') => {
  const sourceText = formatSourceLegacyMoney(amountCents, currency)
  const quote = quoteLegacyMoney(amountCents, currency)
  if (!quote?.ok) return sourceText
  if (quote.quotedMoney.currency === currency) return sourceText
  const quotedText = formatQuotedMoney(quote.quotedMoney)
  if (!quotedText) return sourceText
  return `${quotedText} · ${sourceText}`
}

const formatPrice = (product) =>
  formatLegacyMoneyQuote(product?.priceCents, product?.currency || 'CNY')

const resetProductDraft = () => {
  productDraft.title = ''
  productDraft.category = activeCategoryIsLogistics.value ? 'mall' : activeCategory.value?.key || 'mall'
  productDraft.price = ''
  productDraft.currency = 'CNY'
  productDraft.desc = ''
  productDraft.imageSourceType = 'none'
  productDraft.imageUrl = ''
  productDraft.imageGalleryAssetId = ''
  productDraft.serviceKey = activeServiceKey.value
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
    serviceKey: activeServiceKey.value,
    assetEligible: productDraft.assetEligible,
    giftable: productDraft.giftable,
  })
  if (!product) {
    productFeedback.value = t('Please enter a valid product name and price.', 'Please enter a valid product name and price.')
    return
  }
  productFeedback.value = t('Custom product added to catalog.', 'Custom product added to catalog.')
  router.push({
    path: buildShoppingAppRoute(activeServiceKey.value),
    query: {
      category: product.category,
      productId: product.id,
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

const productDisplayTitle = (product) =>
  languageBase.value === 'en' && product?.titleEn ? product.titleEn : product?.title || ''

const productDisplayDescription = (product) =>
  languageBase.value === 'en' && product?.descEn ? product.descEn : product?.desc || ''

const productCategoryIcon = (product) =>
  findShoppingCategory(product?.category || 'mall')?.icon || 'fas fa-bag-shopping'

const productStorefrontTemplate = (product) =>
  findShoppingServicePreset(product?.serviceKey || '')?.storefrontTemplate || 'city_market'

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
  const sourceText = totals.map((item) => `${item.amount} ${item.currency}`).join(' / ')
  if (order.quoteSnapshot?.quotedMoney?.currency === order.quoteSnapshot?.sourceMoney?.currency) {
    return sourceText
  }
  const quotedText = formatQuotedMoney(order.quoteSnapshot?.quotedMoney)
  if (!quotedText) return sourceText
  return `${quotedText} · ${sourceText}`
}

const formatOrderItemSubtotal = (item) =>
  formatSourceLegacyMoney(
    Number(item?.unitPriceCents || 0) * Number(item?.quantity || 0),
    item?.currency || 'CNY',
  )

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
  const order = shoppingStore.checkoutCart({
    serviceKey: activeServiceKey.value,
    ...buildGiftCheckoutPayload(),
    note: t('Local shopping baseline order', 'Local shopping baseline order'),
  })
  if (order?.giftRecipient) {
    recordShoppingGiftRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      order,
    })
  }
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
  if (!shoppingStore.markOrderCompleted(orderId)) return
  const order = shoppingStore.findOrderById(orderId)
  if (!order?.giftRecipient) return
  recordShoppingGiftRelationshipFact({
    chatStore,
    relationshipRuntimeStore,
    order,
  })
  recordShoppingGiftDeliveryRelationshipFact({
    chatStore,
    relationshipRuntimeStore,
    order,
  })
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
    sharedExperienceId: suggestion.order.sharedExperienceId,
    quoteSnapshot: suggestion.quoteSnapshot,
  })
  recordShoppingGiftRelationshipFact({
    chatStore,
    relationshipRuntimeStore,
    order: suggestion.order,
    transaction,
  })
  recordShoppingGiftDeliveryRelationshipFact({
    chatStore,
    relationshipRuntimeStore,
    order: suggestion.order,
  })
  if (suggestion.relationshipSuggestion?.available) {
    recordWalletOrderSupportRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      target: suggestion.relationshipSuggestion.target,
      transaction,
      memoryKey:
        suggestion.relationshipSuggestion.memoryKey ||
        buildShoppingGiftRelationshipMemoryKey(suggestion.order),
      summary: `Wallet expense recorded for the same Shopping gift with ${suggestion.relationshipTargetName || 'a relationship contact'}.`,
    })
  }
  return transaction
}

watch(
  activeServiceKey,
  () => {
    productSearchQuery.value = ''
    favoritesOnly.value = false
    catalogManagerOpen.value = false
    selectedOrderId.value = ''
    resetProductDraft()
  },
  { immediate: true },
)

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
  activeShopEntryCoverAssetId,
  (assetId, oldAssetId) => {
    if (oldAssetId && oldAssetId !== assetId) {
      galleryStore.releaseAssetPreview(oldAssetId, SHOPPING_SHOP_ENTRY_COVER_SCOPE_ID)
      delete shopEntryCoverPreviewMap[oldAssetId]
    }
    if (!assetId || shopEntryCoverPreviewMap[assetId]) return
    void galleryStore.getAssetPreviewUrl(assetId, {
      scopeId: SHOPPING_SHOP_ENTRY_COVER_SCOPE_ID,
    }).then((previewUrl) => {
      if (previewUrl && activeShopEntryCoverAssetId.value === assetId) {
        shopEntryCoverPreviewMap[assetId] = previewUrl
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
  galleryStore.releaseAssetPreviewScope(SHOPPING_SHOP_ENTRY_COVER_SCOPE_ID)
  Object.keys(productImagePreviewMap).forEach((assetId) => {
    delete productImagePreviewMap[assetId]
  })
  Object.keys(shopEntryCoverPreviewMap).forEach((assetId) => {
    delete shopEntryCoverPreviewMap[assetId]
  })
})
</script>

<template>
  <div
    class="shopping-view-shell w-full h-full text-black flex flex-col"
    :data-storefront="activeStorefrontTemplate"
  >
    <div class="shopping-scroll flex-1 overflow-y-auto no-scrollbar">
      <ShoppingStorefrontHeader
        v-model:search-query="productSearchQuery"
        :active-service="activePlatformApp"
        :active-category="activeCategory"
        :active-label="activeShoppingAppLabel"
        :active-description="activeShoppingAppDesc"
        :category-cards="platformCategoryCards"
        :cover-image-url="activeShopEntryCoverImageUrl"
        :brand-asset-url="activeBrandAssetUrl"
        :map-reference="activeMapReference"
        :language-base="languageBase"
        :favorite-count="favoriteCount"
        :cart-quantity="cartQuantity"
        :order-count="orderCount"
        @go-home="goHome"
        @select-category="openCategory"
        @open-favorites="showFavoriteProducts"
        @open-cart="scrollToShoppingSection('shopping-cart')"
        @open-orders="scrollToShoppingSection('shopping-orders')"
        @open-manager="openCatalogManager"
      />

      <div class="shopping-content px-4 py-4 space-y-4">
        <div
          v-if="activeShopEntryCoverImageUrl"
          class="sr-only"
          data-testid="shopping-shop-cover"
        >
          <img :src="activeShopEntryCoverImageUrl" :alt="`${activeShoppingAppLabel} cover`" />
        </div>

      <section
        v-if="openedFromChatProductLink || openedFromChatGiftOrder || openedFromChatShoppingOrder || openedFromChatLogistics"
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
                  : t('From Chat product link', 'From Chat product link')
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
        v-if="openedFromAppStoreShopCreate"
        class="rounded-2xl border border-amber-200 bg-amber-50 p-4"
        data-testid="shopping-app-store-create-banner"
        data-binding-target="shopping"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-bold text-amber-900">
              {{ t('From App Store folder mini app', 'From App Store folder mini app') }}
            </p>
            <p class="mt-2 text-xs leading-5 text-amber-700">
              {{
                t(
                  '当前购物 App 负责自己的商品、购物车、结算、订单和物流通知；App Store 只保留安装入口与外观设置。',
                  'This shopping app owns its catalog, cart, checkout, orders, and logistics notifications; App Store only keeps installation and presentation settings.',
                )
              }}
            </p>
          </div>
          <span class="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-700">
            shopping
          </span>
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

      <section
        id="shopping-catalog-manager"
        v-show="catalogManagerOpen || openedFromAppStoreShopCreate"
        class="shopping-management-panel rounded-lg bg-white border border-orange-100 p-4"
        data-testid="shopping-custom-product-form"
      >
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
            :aria-label="t('商品分类', 'Product category')"
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
          <div
            data-testid="shopping-custom-service"
            :data-service-key="activeServiceKey"
            class="col-span-2 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2 text-xs font-semibold text-gray-700"
          >
            <img v-if="activeBrandAssetUrl" :src="activeBrandAssetUrl" alt="" class="h-5 w-5 rounded object-cover" />
            <span>{{ activeShoppingAppLabel }}</span>
          </div>
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

      <section id="shopping-products" class="shopping-products-section">
        <div class="shopping-section-heading">
          <div>
            <p class="shopping-section-kicker">
              {{ favoritesOnly ? t('我的收藏', 'Saved items') : activePlatformApp?.storefrontKind === 'specialty' ? t('店内精选', 'Store edit') : t('正在流行', 'Trending now') }}
            </p>
            <h2>{{ activeCategory?.label || t('Products', 'Products') }}</h2>
          </div>
          <button
            v-if="favoritesOnly"
            type="button"
            class="shopping-clear-filter"
            :aria-label="t('显示全部商品', 'Show all products')"
            :title="t('显示全部商品', 'Show all products')"
            @click="showAllProducts"
          >
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
          <span v-else>{{ visibleProducts.length }} {{ t('items', 'items') }}</span>
        </div>
        <div v-if="visibleProducts.length === 0" class="shopping-empty-state">
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
          <p>
            {{ favoritesOnly ? t('这里还没有收藏商品。', 'No saved items here yet.') : productSearchQuery ? t('没有找到匹配商品。', 'No matching products found.') : t('这个分类还没有商品。', 'No products in this category yet.') }}
          </p>
        </div>
        <div v-else class="shopping-product-grid">
          <article
            v-for="product in visibleProducts"
            :key="product.id"
            class="shopping-product-card"
            :class="{ 'is-highlighted': product.id === highlightedProductId }"
            :data-product-template="productStorefrontTemplate(product)"
            :data-testid="`shopping-product-${product.id}`"
          >
            <div class="shopping-product-visual">
              <img
                v-if="productImageUrl(product)"
                :src="productImageUrl(product)"
                :alt="product.image?.alt || productDisplayTitle(product)"
              />
              <div v-else class="shopping-product-symbol" aria-hidden="true">
                <i :class="productCategoryIcon(product)"></i>
                <span>{{ findShoppingServicePreset(product.serviceKey)?.mark || 'S' }}</span>
              </div>
              <button
                type="button"
                class="shopping-favorite-button"
                :class="{ 'is-favorite': shoppingStore.isProductFavorite(product.id) }"
                :aria-label="t('收藏或取消收藏', 'Toggle favorite')"
                :title="t('收藏或取消收藏', 'Toggle favorite')"
                @click="toggleFavorite(product.id)"
              >
                <i class="fas fa-heart" aria-hidden="true"></i>
              </button>
            </div>
            <div class="shopping-product-body">
              <p class="shopping-product-brand">{{ productServiceLabel(product) }}</p>
              <h3>{{ productDisplayTitle(product) }}</h3>
              <p class="shopping-product-description">{{ productDisplayDescription(product) }}</p>
              <div class="shopping-product-tags">
                <span :class="stockStatusClass(product.stockStatus)">{{ stockStatusLabel(product.stockStatus) }}</span>
                <span v-if="product.assetEligible">{{ t('可转资产', 'Asset-ready') }}</span>
                <span v-else-if="product.giftable">{{ t('可赠礼', 'Giftable') }}</span>
              </div>
              <div class="shopping-product-footer">
                <strong>{{ formatPrice(product) }}</strong>
                <button
                  type="button"
                  class="shopping-add-button"
                  :disabled="product.stockStatus === 'sold_out'"
                  :aria-label="`${t('加入购物车', 'Add to cart')}: ${productDisplayTitle(product)}`"
                  :title="t('加入购物车', 'Add to cart')"
                  :data-testid="`shopping-add-cart-${product.id}`"
                  @click="addToCart(product.id)"
                >
                  <i class="fas fa-plus" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="shopping-cart" class="shopping-operation-section rounded-lg bg-white border border-gray-200 p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('Cart', 'Cart') }}</p>
            <p class="mt-1 text-[11px] text-gray-500">{{ t('确认商品和赠礼对象后提交订单。', 'Review items and gift recipient before checkout.') }}</p>
          </div>
          <span class="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
            {{ formatLegacyMoneyQuote(cartPrimaryTotal.amountCents, cartPrimaryTotal.currency) }}
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
                <p class="truncate text-xs font-semibold">{{ productDisplayTitle(line.product) }}</p>
                <p class="mt-1 text-[11px] text-gray-500">
                  {{ formatLegacyMoneyQuote(line.subtotalCents, line.currency) }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button class="w-7 h-7 rounded-full bg-gray-100 text-xs" :aria-label="t('减少数量', 'Decrease quantity')" @click="updateCartQuantity(line.productId, -1)">-</button>
                <span class="w-5 text-center text-xs font-semibold">{{ line.quantity }}</span>
                <button class="w-7 h-7 rounded-full bg-gray-100 text-xs" :aria-label="t('增加数量', 'Increase quantity')" @click="updateCartQuantity(line.productId, 1)">+</button>
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
              <p class="text-[10px] leading-4 text-pink-600">{{ t('收件人会随订单保存，付款记录仍需在 Wallet 中确认。', 'The recipient is saved with the order; expense recording is confirmed later in Wallet.') }}</p>
            </div>
          </div>
          <button
            class="w-full rounded-xl bg-gray-950 py-2.5 text-sm font-semibold text-white"
            data-testid="shopping-checkout"
            @click="checkoutCart"
          >
            {{ t('去结算', 'Checkout') }}
          </button>
        </div>
      </section>

      <section id="shopping-orders" class="shopping-operation-section rounded-lg bg-white border border-gray-200 p-4">
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

      <section
        v-if="assetTransferSuggestions.length > 0"
        class="shopping-operation-section rounded-lg bg-white border border-cyan-100 p-4"
      >
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
        <div class="mt-3 space-y-2">
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

      <section
        v-if="walletExpenseSuggestions.length > 0"
        class="shopping-operation-section rounded-lg bg-white border border-emerald-100 p-4"
      >
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
        <div class="mt-3 space-y-2">
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
    </div>

    <nav
      v-if="activePlatformApp && !activeCategoryIsLogistics"
      class="shopping-bottom-nav"
      :aria-label="t('店内导航', 'Store navigation')"
    >
      <button type="button" :class="{ 'is-active': !favoritesOnly }" @click="showAllProducts">
        <i class="fas fa-store" aria-hidden="true"></i>
        <span>{{ t('逛店', 'Shop') }}</span>
      </button>
      <button type="button" :class="{ 'is-active': favoritesOnly }" @click="showFavoriteProducts">
        <i class="fas fa-heart" aria-hidden="true"></i>
        <span>{{ t('收藏', 'Saved') }}</span>
      </button>
      <button type="button" @click="scrollToShoppingSection('shopping-cart')">
        <span class="shopping-bottom-icon">
          <i class="fas fa-bag-shopping" aria-hidden="true"></i>
          <small v-if="cartQuantity">{{ cartQuantity }}</small>
        </span>
        <span>{{ t('购物车', 'Bag') }}</span>
      </button>
      <button type="button" @click="scrollToShoppingSection('shopping-orders')">
        <i class="fas fa-receipt" aria-hidden="true"></i>
        <span>{{ t('订单', 'Orders') }}</span>
      </button>
    </nav>

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
                  {{ item.quantity }} × {{ formatSourceLegacyMoney(item.unitPriceCents, item.currency) }}
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

<style scoped>
.shopping-view-shell {
  --shop-bg: #f5f6f7;
  --shop-surface: #ffffff;
  --shop-ink: #1e2329;
  --shop-muted: #66707a;
  --shop-accent: #e52a2f;
  --shop-accent-2: #00a4e4;
  --shop-line: rgba(30, 35, 41, 0.14);
  overflow: hidden;
  background: var(--shop-bg);
}

.shopping-view-shell[data-storefront='tech_catalog'] {
  --shop-bg: #f7f7f7;
  --shop-surface: #ffffff;
  --shop-ink: #050505;
  --shop-muted: #686868;
  --shop-accent: #ff4800;
  --shop-accent-2: #111111;
  --shop-line: rgba(0, 0, 0, 0.16);
}

.shopping-view-shell[data-storefront='fresh_market'] {
  --shop-bg: #f7f3f8;
  --shop-surface: #ffffff;
  --shop-ink: #32113f;
  --shop-muted: #74657a;
  --shop-accent: #5f0080;
  --shop-accent-2: #b5d948;
  --shop-line: rgba(95, 0, 128, 0.16);
}

.shopping-view-shell[data-storefront='fashion_editorial'] {
  --shop-bg: #171a20;
  --shop-surface: #22262e;
  --shop-ink: #f8f8f5;
  --shop-muted: #b4bac4;
  --shop-accent: #ffda05;
  --shop-accent-2: #e63838;
  --shop-line: rgba(255, 255, 255, 0.18);
}

.shopping-view-shell[data-storefront='room_planner'] {
  --shop-bg: #f5f5f5;
  --shop-surface: #ffffff;
  --shop-ink: #111111;
  --shop-muted: #5d5d5d;
  --shop-accent: #0058a3;
  --shop-accent-2: #ffda1a;
  --shop-line: rgba(0, 88, 163, 0.2);
}

.shopping-view-shell[data-storefront='care_lab'] {
  --shop-bg: #f4f7ee;
  --shop-surface: #ffffff;
  --shop-ink: #26311f;
  --shop-muted: #66705f;
  --shop-accent: #6d961d;
  --shop-accent-2: #f58220;
  --shop-line: rgba(109, 150, 29, 0.18);
}

.shopping-scroll {
  scroll-behavior: smooth;
  background: var(--shop-bg);
}

.shopping-content {
  max-width: 760px;
  margin: 0 auto;
  padding-bottom: 92px;
  color: #111827;
}

.shopping-products-section {
  scroll-margin-top: 12px;
  padding: 10px 0 4px;
}

.shopping-section-heading {
  min-height: 48px;
  margin-bottom: 13px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  color: var(--shop-ink);
}

.shopping-section-heading h2 {
  margin: 2px 0 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 23px;
  line-height: 1.05;
  letter-spacing: 0;
}

.shopping-section-heading > span,
.shopping-section-kicker {
  margin: 0;
  color: var(--shop-muted);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.shopping-clear-filter {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--shop-line);
  border-radius: 50%;
  color: var(--shop-ink);
  background: var(--shop-surface);
}

.shopping-product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.shopping-product-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--shop-line);
  border-radius: 7px;
  color: var(--shop-ink);
  background: var(--shop-surface);
  transition: border-color 160ms ease, transform 160ms ease;
}

.shopping-product-card.is-highlighted {
  border-color: var(--shop-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--shop-accent) 22%, transparent);
}

.shopping-product-visual {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-bottom: 1px solid var(--shop-line);
  background: #efe7da;
}

.shopping-product-visual img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.shopping-product-symbol {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: #ed4b2d;
}

.shopping-product-symbol::before,
.shopping-product-symbol::after {
  content: '';
  position: absolute;
  border: 1px solid rgba(255, 255, 255, 0.52);
}

.shopping-product-symbol::before {
  width: 66%;
  height: 66%;
  transform: rotate(7deg);
}

.shopping-product-symbol::after {
  width: 36%;
  height: 36%;
  transform: rotate(-8deg);
}

.shopping-product-symbol i {
  z-index: 1;
  font-size: 31px;
}

.shopping-product-symbol span {
  position: absolute;
  right: 8px;
  bottom: 7px;
  z-index: 1;
  font-size: 9px;
  font-weight: 900;
}

[data-product-template='tech_catalog'] .shopping-product-symbol {
  color: #ffffff;
  background: #050505;
}

[data-product-template='fresh_market'] .shopping-product-symbol {
  color: #ffffff;
  background: #5f0080;
}

[data-product-template='fashion_editorial'] .shopping-product-symbol {
  color: #ffda05;
  background: #171a20;
}

[data-product-template='room_planner'] .shopping-product-symbol {
  color: #ffffff;
  background: #0058a3;
}

[data-product-template='care_lab'] .shopping-product-symbol {
  color: #ffffff;
  background: #6d961d;
}

.shopping-favorite-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(17, 24, 39, 0.12);
  border-radius: 50%;
  color: #b4b7bc;
  background: rgba(255, 255, 255, 0.9);
}

.shopping-favorite-button.is-favorite {
  color: #d94050;
}

.shopping-product-body {
  min-height: 174px;
  padding: 12px;
  display: flex;
  flex-direction: column;
}

.shopping-product-brand {
  margin: 0;
  color: var(--shop-accent);
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
}

.shopping-product-body h3 {
  min-height: 36px;
  margin: 5px 0 0;
  display: -webkit-box;
  overflow: hidden;
  color: var(--shop-ink);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 15px;
  line-height: 1.22;
  letter-spacing: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.shopping-product-description {
  min-height: 32px;
  margin: 7px 0 0;
  display: -webkit-box;
  overflow: hidden;
  color: var(--shop-muted);
  font-size: 10px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.shopping-product-tags {
  min-height: 20px;
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.shopping-product-tags span {
  padding: 3px 6px;
  border-radius: 3px;
  color: #4b5563;
  background: #f3f4f6;
  font-size: 8px;
  font-weight: 800;
}

.shopping-product-footer {
  min-height: 38px;
  margin-top: auto;
  padding-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.shopping-product-footer strong {
  overflow-wrap: anywhere;
  color: var(--shop-ink);
  font-size: 12px;
  line-height: 1.25;
}

.shopping-add-button {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--shop-bg);
  background: var(--shop-ink);
}

.shopping-add-button:disabled {
  opacity: 0.35;
}

.shopping-empty-state {
  min-height: 170px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px dashed var(--shop-line);
  border-radius: 7px;
  color: var(--shop-muted);
  text-align: center;
  background: var(--shop-surface);
}

.shopping-empty-state i {
  font-size: 24px;
}

.shopping-empty-state p {
  margin: 0;
  font-size: 11px;
}

.shopping-operation-section,
.shopping-management-panel {
  scroll-margin-top: 12px;
}

.shopping-bottom-nav {
  position: relative;
  z-index: 20;
  min-height: calc(62px + env(safe-area-inset-bottom));
  padding: 6px 12px max(7px, env(safe-area-inset-bottom));
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--shop-line);
  background: color-mix(in srgb, var(--shop-surface) 94%, transparent);
  backdrop-filter: blur(16px);
}

.shopping-bottom-nav button {
  min-width: 0;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: var(--shop-muted);
  font-size: 9px;
  font-weight: 800;
}

.shopping-bottom-nav button > i,
.shopping-bottom-icon > i {
  font-size: 16px;
}

.shopping-bottom-nav button.is-active {
  color: var(--shop-accent);
}

.shopping-bottom-icon {
  position: relative;
}

.shopping-bottom-icon small {
  position: absolute;
  top: -8px;
  right: -12px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #ffffff;
  background: #dc3f45;
  font-size: 8px;
  font-weight: 900;
}

.shopping-clear-filter:focus-visible,
.shopping-favorite-button:focus-visible,
.shopping-add-button:focus-visible,
.shopping-bottom-nav button:focus-visible {
  outline: 3px solid var(--shop-accent-2);
  outline-offset: 2px;
}

@media (min-width: 680px) {
  .shopping-product-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 350px) {
  .shopping-product-grid {
    grid-template-columns: 1fr;
  }

  .shopping-product-visual {
    aspect-ratio: 16 / 10;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shopping-scroll {
    scroll-behavior: auto;
  }

  .shopping-product-card {
    transition: none;
  }
}
</style>
