<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import '../components/shopping/shopping-brand-page-overrides.css'
import ShoppingCoupangApp from '../components/shopping/ShoppingCoupangApp.vue'
import Shopping29CmApp from '../components/shopping/Shopping29CmApp.vue'
import ShoppingKurlyApp from '../components/shopping/ShoppingKurlyApp.vue'
import ShoppingWorksoutApp from '../components/shopping/ShoppingWorksoutApp.vue'
import ShoppingIkeaApp from '../components/shopping/ShoppingIkeaApp.vue'
import ShoppingOliveYoungApp from '../components/shopping/ShoppingOliveYoungApp.vue'
import ShoppingTradersApp from '../components/shopping/ShoppingTradersApp.vue'
import ShoppingCuApp from '../components/shopping/ShoppingCuApp.vue'
import ShoppingMusinsaApp from '../components/shopping/ShoppingMusinsaApp.vue'
import ShoppingBoonTheShopApp from '../components/shopping/ShoppingBoonTheShopApp.vue'
import ShoppingGalleriaApp from '../components/shopping/ShoppingGalleriaApp.vue'
import ShoppingCollectionPage from '../components/shopping/ShoppingCollectionPage.vue'
import ShoppingProductPage from '../components/shopping/ShoppingProductPage.vue'
import ShoppingCoupangPages from '../components/shopping/pages/ShoppingCoupangPages.vue'
import Shopping29CmPages from '../components/shopping/pages/Shopping29CmPages.vue'
import ShoppingKurlyPages from '../components/shopping/pages/ShoppingKurlyPages.vue'
import ShoppingWorksoutPages from '../components/shopping/pages/ShoppingWorksoutPages.vue'
import ShoppingIkeaPages from '../components/shopping/pages/ShoppingIkeaPages.vue'
import ShoppingOliveYoungPages from '../components/shopping/pages/ShoppingOliveYoungPages.vue'
import ShoppingTradersPages from '../components/shopping/pages/ShoppingTradersPages.vue'
import ShoppingCuPages from '../components/shopping/pages/ShoppingCuPages.vue'
import ShoppingMusinsaPages from '../components/shopping/pages/ShoppingMusinsaPages.vue'
import ShoppingBoonTheShopPages from '../components/shopping/pages/ShoppingBoonTheShopPages.vue'
import ShoppingGalleriaPages from '../components/shopping/pages/ShoppingGalleriaPages.vue'
import ShoppingCoupangOperations from '../components/shopping/operations/ShoppingCoupangOperations.vue'
import Shopping29CmOperations from '../components/shopping/operations/Shopping29CmOperations.vue'
import ShoppingKurlyOperations from '../components/shopping/operations/ShoppingKurlyOperations.vue'
import ShoppingWorksoutOperations from '../components/shopping/operations/ShoppingWorksoutOperations.vue'
import ShoppingIkeaOperations from '../components/shopping/operations/ShoppingIkeaOperations.vue'
import ShoppingOliveYoungOperations from '../components/shopping/operations/ShoppingOliveYoungOperations.vue'
import ShoppingTradersOperations from '../components/shopping/operations/ShoppingTradersOperations.vue'
import ShoppingCuOperations from '../components/shopping/operations/ShoppingCuOperations.vue'
import ShoppingMusinsaOperations from '../components/shopping/operations/ShoppingMusinsaOperations.vue'
import ShoppingBoonTheShopOperations from '../components/shopping/operations/ShoppingBoonTheShopOperations.vue'
import ShoppingGalleriaOperations from '../components/shopping/operations/ShoppingGalleriaOperations.vue'
import ShoppingCoupangServicePages from '../components/shopping/services/ShoppingCoupangServicePages.vue'
import Shopping29CmServicePages from '../components/shopping/services/Shopping29CmServicePages.vue'
import ShoppingKurlyServicePages from '../components/shopping/services/ShoppingKurlyServicePages.vue'
import ShoppingWorksoutServicePages from '../components/shopping/services/ShoppingWorksoutServicePages.vue'
import ShoppingIkeaServicePages from '../components/shopping/services/ShoppingIkeaServicePages.vue'
import ShoppingOliveYoungServicePages from '../components/shopping/services/ShoppingOliveYoungServicePages.vue'
import ShoppingTradersServicePages from '../components/shopping/services/ShoppingTradersServicePages.vue'
import ShoppingCuServicePages from '../components/shopping/services/ShoppingCuServicePages.vue'
import ShoppingMusinsaServicePages from '../components/shopping/services/ShoppingMusinsaServicePages.vue'
import ShoppingBoonTheShopServicePages from '../components/shopping/services/ShoppingBoonTheShopServicePages.vue'
import ShoppingGalleriaServicePages from '../components/shopping/services/ShoppingGalleriaServicePages.vue'
import ShoppingCheckoutSettlement from '../components/shopping/ShoppingCheckoutSettlement.vue'
import {
  resolveShoppingCanonicalPage,
  resolveShoppingPageContract,
} from '../components/shopping/shopping-experience-model'
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

const SHOPPING_STOREFRONT_COMPONENTS = Object.freeze({
  city_market: ShoppingCoupangApp,
  tech_catalog: Shopping29CmApp,
  fresh_market: ShoppingKurlyApp,
  fashion_editorial: ShoppingWorksoutApp,
  room_planner: ShoppingIkeaApp,
  care_lab: ShoppingOliveYoungApp,
  member_warehouse: ShoppingTradersApp,
  neighborhood_convenience: ShoppingCuApp,
  fashion_catalog: ShoppingMusinsaApp,
  buyer_atelier: ShoppingBoonTheShopApp,
  luxury_hall: ShoppingGalleriaApp,
})
const SHOPPING_DEEP_PAGE_COMPONENTS = Object.freeze({
  city_market: ShoppingCoupangPages,
  tech_catalog: Shopping29CmPages,
  fresh_market: ShoppingKurlyPages,
  fashion_editorial: ShoppingWorksoutPages,
  room_planner: ShoppingIkeaPages,
  care_lab: ShoppingOliveYoungPages,
  member_warehouse: ShoppingTradersPages,
  neighborhood_convenience: ShoppingCuPages,
  fashion_catalog: ShoppingMusinsaPages,
  buyer_atelier: ShoppingBoonTheShopPages,
  luxury_hall: ShoppingGalleriaPages,
})
const SHOPPING_OPERATION_PAGE_COMPONENTS = Object.freeze({
  city_market: ShoppingCoupangOperations,
  tech_catalog: Shopping29CmOperations,
  fresh_market: ShoppingKurlyOperations,
  fashion_editorial: ShoppingWorksoutOperations,
  room_planner: ShoppingIkeaOperations,
  care_lab: ShoppingOliveYoungOperations,
  member_warehouse: ShoppingTradersOperations,
  neighborhood_convenience: ShoppingCuOperations,
  fashion_catalog: ShoppingMusinsaOperations,
  buyer_atelier: ShoppingBoonTheShopOperations,
  luxury_hall: ShoppingGalleriaOperations,
})
const SHOPPING_SERVICE_PAGE_COMPONENTS = Object.freeze({
  city_market: ShoppingCoupangServicePages,
  tech_catalog: Shopping29CmServicePages,
  fresh_market: ShoppingKurlyServicePages,
  fashion_editorial: ShoppingWorksoutServicePages,
  room_planner: ShoppingIkeaServicePages,
  care_lab: ShoppingOliveYoungServicePages,
  member_warehouse: ShoppingTradersServicePages,
  neighborhood_convenience: ShoppingCuServicePages,
  fashion_catalog: ShoppingMusinsaServicePages,
  buyer_atelier: ShoppingBoonTheShopServicePages,
  luxury_hall: ShoppingGalleriaServicePages,
})
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
const checkoutDraft = reactive({
  addressId: '',
  recipientName: '',
  recipientPhone: '',
  paymentCardId: '',
})
const checkoutFeedback = ref('')
const checkoutBusy = ref(false)
const checkoutAttemptKey = ref('')
const selectedProductId = ref('')
const selectedOrderId = ref('')
const shoppingScrollRef = ref(null)

const SHOPPING_PAGE_KEYS = new Set([
  'home',
  'category',
  'product',
  'cart',
  'checkout',
  'orders',
  'order',
  'logistics',
  'service',
  'manage',
])
const SHOPPING_CATALOG_PAGE_SIZE = 6

const activeServiceKey = computed(() =>
  typeof route.params.serviceKey === 'string' ? route.params.serviceKey.trim() : '',
)
const activePlatformApp = computed(() => findShoppingPlatformApp(activeServiceKey.value))
const activePageContract = computed(() =>
  resolveShoppingPageContract(activePlatformApp.value?.storefrontTemplate || 'city_market'),
)
const shopPageKey = computed(() => {
  const requested = typeof route.query.shopView === 'string' ? route.query.shopView.trim() : ''
  const isAppStoreSetup =
    !requested &&
    route.query.entry === 'shop' &&
    route.query.createShop === '1' &&
    (route.query.bindingTarget === SHOP_ENTRY_BINDING_TARGET.SHOPPING ||
      route.query.source === 'app_store')
  if (isAppStoreSetup) return 'manage'
  const resolved = resolveShoppingCanonicalPage(
    activePlatformApp.value?.storefrontTemplate || 'city_market',
    requested,
  )
  if (SHOPPING_PAGE_KEYS.has(resolved)) return resolved
  if (typeof route.query.productId === 'string' && route.query.productId.trim()) return 'product'
  if (typeof route.query.orderId === 'string' && route.query.orderId.trim()) return 'order'
  return 'home'
})
const catalogPage = computed(() => {
  const requested = Number(route.query.page)
  return Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1
})
const activeCategoryKey = computed(() => {
  const requested = typeof route.query.category === 'string' ? route.query.category.trim() : ''
  const allowedKeys = Array.isArray(activePlatformApp.value?.categoryKeys)
    ? activePlatformApp.value.categoryKeys
    : []
  return requested && allowedKeys.includes(requested)
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
    return '为当前环境整理的饮水、生鲜与日用品清单。'
  }
  return context.description || 'A practical selection prepared for the current scene.'
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
const checkoutQuote = computed(() => {
  const sourceMoney = convertLegacyCentsToMoney(
    cartPrimaryTotal.value.amountCents,
    cartPrimaryTotal.value.currency,
    walletStore.currencyOptions,
  )
  return sourceMoney ? walletStore.quoteMoney(sourceMoney, walletStore.primaryCurrency) : null
})
const checkoutTotalLabel = computed(() =>
  checkoutQuote.value?.ok
    ? walletStore.formatMoney(checkoutQuote.value.quotedMoney)
    : formatLegacyMoneyQuote(cartPrimaryTotal.value.amountCents, cartPrimaryTotal.value.currency),
)
const checkoutAddressOptions = computed(() => {
  const current = mapStore.currentLocation
  const options = []
  if (current?.detail && current?.position) {
    options.push({
      id: `current:${current.placeId || current.detail}`,
      kind: 'current',
      label: current.label || t('当前位置', 'Current location'),
      detail: current.detail,
      mapPackId: current.mapPackId || '',
      placeId: current.placeId || `current:${current.detail}`,
      position: current.position,
      revision: 1,
    })
  }
  mapStore.addresses.forEach((address) => {
    if (!address?.detail || !address?.position) return
    options.push({
      id: `address:${address.id}`,
      kind: 'saved',
      label: address.label,
      detail: address.detail,
      mapPackId: address.mapPackId || '',
      placeId: `address:${address.id}`,
      position: address.position,
      revision: 1,
    })
  })
  const seen = new Set()
  return options.filter((option) => {
    if (seen.has(option.id)) return false
    seen.add(option.id)
    return true
  })
})
const selectedCheckoutAddress = computed(() =>
  checkoutAddressOptions.value.find((option) => option.id === checkoutDraft.addressId) || null,
)
const checkoutPaymentOptions = computed(() => {
  const currency = checkoutQuote.value?.quotedMoney?.currency || walletStore.primaryCurrency
  const amountCents = checkoutQuote.value?.quotedMoney?.amountMinor || 0
  return walletStore.paymentCardSummaries.map((card) => {
    const balance = card.account?.balances?.find((item) => item.currency === currency)
    const active = card.status === 'active'
    const supportsCurrency = card.supportedCurrencies?.includes(currency)
    const hasFunds = Number(balance?.amountCents || 0) >= amountCents
    const available = Boolean(active && supportsCurrency && hasFunds)
    return {
      cardId: card.id,
      accountId: card.accountId,
      available,
      label: `${card.institution?.name || card.institutionId || 'Wallet'} · •••• ${card.last4 || ''}`,
      balanceLabel: `${t('余额', 'Balance')} ${walletStore.formatMoney({ amountMinor: Math.max(0, Number(balance?.amountCents || 0)), currency })}`,
      reasonLabel: !active
        ? t('卡片已冻结', 'FROZEN')
        : !supportsCurrency
          ? t('币种不可用', 'CURRENCY')
          : t('余额不足', 'LOW BALANCE'),
    }
  })
})
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
const homeVisibleProducts = computed(() => visibleProducts.value.slice(0, 6))
const catalogPageCount = computed(() =>
  Math.max(1, Math.ceil(visibleProducts.value.length / SHOPPING_CATALOG_PAGE_SIZE)),
)
const paginatedProducts = computed(() => {
  const safePage = Math.min(catalogPage.value, catalogPageCount.value)
  const start = (safePage - 1) * SHOPPING_CATALOG_PAGE_SIZE
  return visibleProducts.value.slice(start, start + SHOPPING_CATALOG_PAGE_SIZE)
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
const selectedProduct = computed(() => {
  if (!selectedProductId.value) return null
  const product = shoppingStore.findProductById(selectedProductId.value)
  return product?.serviceKey === activeServiceKey.value ? product : null
})
const relatedProducts = computed(() => {
  const product = selectedProduct.value
  if (!product) return []
  const serviceProducts = shoppingStore.listProductsByService(activeServiceKey.value)
  const sameCategory = serviceProducts.filter(
    (item) => item.id !== product.id && item.category === product.category,
  )
  const remaining = serviceProducts.filter(
    (item) => item.id !== product.id && item.category !== product.category,
  )
  return [...sameCategory, ...remaining].slice(0, 6)
})
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
    .filter((order) => order.status === SHOPPING_ORDER_STATUS.COMPLETED && !order.paymentRef)
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
const logisticsMapRows = computed(() => logisticsOrderRows.value.filter((row) => row.mapHandoff))

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
    (entry) => entry.key !== 'logistics' && allowedKeys.includes(entry.key),
  )
})

const activeStorefrontTemplate = computed(
  () => activePlatformApp.value?.storefrontTemplate || 'shopping_hub',
)
const activeStorefrontComponent = computed(
  () => SHOPPING_STOREFRONT_COMPONENTS[activeStorefrontTemplate.value] || ShoppingCoupangApp,
)
const activeDeepPageComponent = computed(
  () => SHOPPING_DEEP_PAGE_COMPONENTS[activeStorefrontTemplate.value] || null,
)
const activeOperationPageComponent = computed(
  () => SHOPPING_OPERATION_PAGE_COMPONENTS[activeStorefrontTemplate.value] || null,
)
const activeServicePageComponent = computed(
  () => SHOPPING_SERVICE_PAGE_COMPONENTS[activeStorefrontTemplate.value] || null,
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

const buildStableShopQuery = () => {
  const stableQuery = { ...route.query }
  delete stableQuery.shopView
  delete stableQuery.page
  delete stableQuery.productId
  delete stableQuery.orderId
  delete stableQuery.saved
  delete stableQuery.q
  return stableQuery
}

const openShopPage = (pageKey = 'home', patch = {}) => {
  const nextPageKey = SHOPPING_PAGE_KEYS.has(pageKey) ? pageKey : 'home'
  const nextQuery = {
    ...buildStableShopQuery(),
    ...patch,
  }
  if (nextPageKey !== 'home') nextQuery.shopView = activePageContract.value[nextPageKey] || nextPageKey
  if (nextPageKey !== 'category') delete nextQuery.page
  if (nextPageKey !== 'product') delete nextQuery.productId
  if (nextPageKey !== 'order') delete nextQuery.orderId
  if (nextPageKey !== 'category') {
    delete nextQuery.saved
    delete nextQuery.q
  }
  if (nextPageKey !== 'manage') {
    delete nextQuery.createShop
    delete nextQuery.bindingTarget
    if (nextQuery.source === 'app_store') delete nextQuery.source
  }
  return router.push({
    path: buildShoppingAppRoute(activeServiceKey.value),
    query: nextQuery,
  })
}

const openShopHome = () => openShopPage('home')
const openCartPage = () => openShopPage('cart')
const openCheckoutPage = () => {
  if (cartLineItems.value.length === 0) return
  checkoutFeedback.value = ''
  if (!checkoutDraft.recipientName && giftDraft.enabled && giftDraft.name.trim()) {
    checkoutDraft.recipientName = giftDraft.name.trim()
  }
  if (!checkoutDraft.addressId || !checkoutAddressOptions.value.some((option) => option.id === checkoutDraft.addressId)) {
    checkoutDraft.addressId = checkoutAddressOptions.value[0]?.id || ''
  }
  if (!checkoutDraft.paymentCardId || !checkoutPaymentOptions.value.some((option) => option.cardId === checkoutDraft.paymentCardId && option.available)) {
    checkoutDraft.paymentCardId = checkoutPaymentOptions.value.find((option) => option.available)?.cardId || ''
  }
  return openShopPage('checkout')
}
const openOrdersPage = () => openShopPage('orders')
const openLogisticsPage = () => openShopPage('logistics')
const openServicePage = () => openShopPage('service')

const showFavoriteProducts = () => {
  favoritesOnly.value = true
  void openShopPage('category', {
    category: activeCategory.value?.key || activePlatformApp.value?.defaultCategory || 'mall',
    saved: '1',
    page: '1',
  })
}

const showAllProducts = () => {
  favoritesOnly.value = false
  void openShopHome()
}

const goBackToChat = () => {
  const chatId = Number(sourceChatId.value)
  router.push(Number.isFinite(chatId) && chatId > 0 ? `/chat/${Math.floor(chatId)}` : '/chat')
}

const openCategory = (key) => {
  favoritesOnly.value = false
  void openShopPage(key === 'logistics' ? 'logistics' : 'category', {
    category: key,
    ...(key === 'logistics' ? {} : { page: '1' }),
    ...(key !== 'logistics' && productSearchQuery.value.trim() ? { q: productSearchQuery.value.trim() } : {}),
  })
}

const changeCatalogPage = (pageNumber) => {
  const nextPage = Math.max(1, Math.min(catalogPageCount.value, Number(pageNumber) || 1))
  void openShopPage('category', {
    category: activeCategory.value?.key || activePlatformApp.value?.defaultCategory || 'mall',
    page: String(nextPage),
    ...(favoritesOnly.value ? { saved: '1' } : {}),
    ...(productSearchQuery.value.trim() ? { q: productSearchQuery.value.trim() } : {}),
  })
}

const submitCatalogSearch = () => {
  void openShopPage('category', {
    category: activeCategory.value?.key || activePlatformApp.value?.defaultCategory || 'mall',
    page: '1',
    ...(favoritesOnly.value ? { saved: '1' } : {}),
    ...(productSearchQuery.value.trim() ? { q: productSearchQuery.value.trim() } : {}),
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
      shopView: 'product',
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

const openProductDetail = (productId) => {
  const product = shoppingStore.findProductById(productId)
  if (!product || product.serviceKey !== activeServiceKey.value) return
  selectedProductId.value = productId
  void openShopPage('product', {
    category: product.category,
    productId,
  })
}

const closeProductDetail = () => {
  selectedProductId.value = ''
  void openShopPage('category', {
    category: activeCategory.value?.key || activePlatformApp.value?.defaultCategory || 'mall',
    page: String(catalogPage.value),
  })
}

const addToCart = (productId, quantity = 1) => {
  shoppingStore.addToCart(productId, quantity, {
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
  return {
    recipient: giftRecipient?.name || '',
    giftRecipient,
  }
}

const clearGiftDraft = () => {
  giftDraft.enabled = false
  giftDraft.contactId = ''
  giftDraft.name = ''
}

const saveCheckoutAddress = ({ label = '', detail = '' } = {}) => {
  const current = mapStore.currentLocation
  const result = mapStore.createDeliveryAddress({
    label,
    detail,
    category: 'other',
    mapPackId: current?.mapPackId,
    position: current?.position,
  })
  if (!result.ok) {
    checkoutFeedback.value = t('地址无法保存，请先在 Map 设置有效当前位置。', 'Address could not be saved. Set a valid current location in Map first.')
    return null
  }
  checkoutDraft.addressId = result.anchor.id
  checkoutFeedback.value = t('地址已保存到 Map 地址簿。', 'Address saved to Map.')
  return result.anchor
}

const checkoutFailureLabel = (reason = '') => ({
  delivery_anchor_required: t('请选择或保存一个有效收货地址。', 'Choose or save a valid delivery address.'),
  recipient_required: t('请填写收件人姓名。', 'Enter the recipient name.'),
  insufficient_funds: t('所选 Wallet 账户余额不足。', 'The selected Wallet account has insufficient funds.'),
  payment_card_unavailable: t('所选卡片不可用于本次付款。', 'The selected card is unavailable for this payment.'),
  account_unavailable: t('没有可用于该币种的 Wallet 账户。', 'No Wallet account is available for this currency.'),
  quote_unavailable: t('当前汇率报价不可用，订单尚未创建。', 'The current quote is unavailable; no order was created.'),
  cart_empty: t('购物车为空。', 'The cart is empty.'),
}[reason] || t('付款未完成，订单和购物车均未变更。', 'Payment was not completed; the order and cart were not changed.'))

const commitCheckoutCart = () => {
  if (checkoutBusy.value) return null
  const paymentOption = checkoutPaymentOptions.value.find(
    (option) => option.cardId === checkoutDraft.paymentCardId,
  )
  checkoutBusy.value = true
  checkoutFeedback.value = ''
  if (!checkoutAttemptKey.value) {
    checkoutAttemptKey.value = `shopping_checkout:${activeServiceKey.value}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
  }
  const result = shoppingStore.checkoutCartWithPayment({
    serviceKey: activeServiceKey.value,
    ...buildGiftCheckoutPayload(),
    recipient: checkoutDraft.recipientName,
    recipientPhone: checkoutDraft.recipientPhone,
    deliveryAnchor: selectedCheckoutAddress.value,
    accountId: paymentOption?.accountId || '',
    cardId: paymentOption?.cardId || '',
    idempotencyKey: checkoutAttemptKey.value,
    note: t('Shopping checkout', 'Shopping checkout'),
  })
  const order = result.order
  const transaction = result.payment?.transaction || null
  if (order?.giftRecipient) {
    const relationshipSuggestion = buildShoppingGiftRelationshipSuggestion({
      relationshipRuntimeStore,
      order,
    })
    recordShoppingGiftRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      order,
      transaction,
    })
    if (transaction && relationshipSuggestion.available) {
      recordWalletOrderSupportRelationshipFact({
        chatStore,
        relationshipRuntimeStore,
        target: relationshipSuggestion.target,
        transaction,
        memoryKey: relationshipSuggestion.memoryKey,
        summary: `Wallet payment recorded for the same Shopping gift with ${relationshipSuggestion.targetName || 'a relationship contact'}.`,
      })
    }
  }
  if (order) {
    clearGiftDraft()
    checkoutAttemptKey.value = ''
    checkoutFeedback.value = ''
    void openShopPage('orders')
  } else {
    checkoutFeedback.value = checkoutFailureLabel(result.reason)
  }
  checkoutBusy.value = false
  return order
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
  if (selectedOrderId.value) {
    void openShopPage('order', { orderId: selectedOrderId.value })
  }
}

const closeOrderDetail = () => {
  selectedOrderId.value = ''
  void openShopPage('orders')
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
    selectedProductId.value = ''
    selectedOrderId.value = ''
    checkoutDraft.addressId = ''
    checkoutDraft.paymentCardId = ''
    checkoutFeedback.value = ''
    checkoutAttemptKey.value = ''
    resetProductDraft()
  },
  { immediate: true },
)

watch(
  () => route.query.q,
  (query) => {
    const nextQuery = typeof query === 'string' ? query : ''
    if (productSearchQuery.value !== nextQuery) productSearchQuery.value = nextQuery
  },
  { immediate: true },
)

watch(
  () => route.query.saved,
  (saved) => {
    favoritesOnly.value = saved === '1'
  },
  { immediate: true },
)

watch(
  () => route.query.productId,
  (productId) => {
    const nextProductId = typeof productId === 'string' ? productId.trim() : ''
    const product = nextProductId ? shoppingStore.findProductById(nextProductId) : null
    selectedProductId.value = product?.serviceKey === activeServiceKey.value ? nextProductId : ''
  },
  { immediate: true },
)

watch(
  [shopPageKey, () => route.query.productId, () => route.query.orderId, catalogPage],
  async () => {
    await nextTick()
    if (shoppingScrollRef.value) shoppingScrollRef.value.scrollTop = 0
  },
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
    <div ref="shoppingScrollRef" class="shopping-scroll flex-1 overflow-y-auto no-scrollbar">
      <component
        v-if="shopPageKey === 'home'"
        :is="activeStorefrontComponent"
        :active-service="activePlatformApp"
        :active-category="activeCategory"
        :active-label="activeShoppingAppLabel"
        :active-description="activeShoppingAppDesc"
        :category-cards="platformCategoryCards"
        :cover-image-url="activeShopEntryCoverImageUrl"
        :brand-asset-url="activeBrandAssetUrl"
        :map-reference="activeMapReference"
        :language-base="languageBase"
        :search-query="productSearchQuery"
        :favorite-count="favoriteCount"
        :cart-quantity="cartQuantity"
        :order-count="orderCount"
        :favorites-only="favoritesOnly"
        :active-category-is-logistics="activeCategoryIsLogistics"
        :visible-products="homeVisibleProducts"
        :highlighted-product-id="highlightedProductId"
        :product-image-url="productImageUrl"
        :product-display-title="productDisplayTitle"
        :product-display-description="productDisplayDescription"
        :product-storefront-template="productStorefrontTemplate"
        :product-service-label="productServiceLabel"
        :product-category-icon="productCategoryIcon"
        :stock-status-label="stockStatusLabel"
        :stock-status-class="stockStatusClass"
        :format-price="formatPrice"
        :is-product-favorite="(productId) => shoppingStore.isProductFavorite(productId)"
        @update:search-query="productSearchQuery = $event"
        @go-home="goHome"
        @select-category="openCategory"
        @open-favorites="showFavoriteProducts"
        @open-cart="openCartPage"
        @open-orders="openOrdersPage"
        @open-product="openProductDetail"
        @submit-search="submitCatalogSearch"
        @show-all="showAllProducts"
        @toggle-favorite="toggleFavorite"
        @add-to-cart="addToCart"
      />
      <component
        :is="activeDeepPageComponent"
        v-else-if="activeDeepPageComponent && ['category', 'product'].includes(shopPageKey)"
        :page-key="shopPageKey"
        :service-label="activeShoppingAppLabel"
        :category="activeCategory"
        :categories="productCategoryCards"
        :products="paginatedProducts"
        :page="Math.min(catalogPage, catalogPageCount)"
        :page-count="catalogPageCount"
        :total-count="visibleProducts.length"
        :search-query="productSearchQuery"
        :favorites-only="favoritesOnly"
        :cart-quantity="cartQuantity"
        :language-base="languageBase"
        :product="selectedProduct"
        :related-products="relatedProducts"
        :product-image-url="productImageUrl"
        :product-display-title="productDisplayTitle"
        :product-display-description="productDisplayDescription"
        :product-category-icon="productCategoryIcon"
        :stock-status-label="stockStatusLabel"
        :format-price="formatPrice"
        :is-product-favorite="(productId) => shoppingStore.isProductFavorite(productId)"
        @back="shopPageKey === 'product' ? closeProductDetail() : openShopHome()"
        @select-category="openCategory"
        @open-product="openProductDetail"
        @add-to-cart="addToCart"
        @toggle-favorite="toggleFavorite"
        @open-cart="openCartPage"
        @open-orders="openOrdersPage"
        @change-page="changeCatalogPage"
        @update:search-query="productSearchQuery = $event"
        @submit-search="submitCatalogSearch"
      />
      <component
        :is="activeOperationPageComponent"
        v-else-if="activeOperationPageComponent && ['cart', 'orders', 'order', 'logistics'].includes(shopPageKey)"
        :page-key="shopPageKey"
        :service-label="activeShoppingAppLabel"
        :language-base="languageBase"
        :cart-items="cartLineItems"
        :cart-quantity="cartQuantity"
        :cart-total-label="formatLegacyMoneyQuote(cartPrimaryTotal.amountCents, cartPrimaryTotal.currency)"
        :orders="recentOrders"
        :selected-order="selectedOrder"
        :logistics-rows="logisticsOrderRows"
        :gift-enabled="giftDraft.enabled"
        :gift-contact-id="giftDraft.contactId"
        :gift-recipient-name="giftDraft.name"
        :gift-recipient-options="giftRecipientOptions"
        :product-image-url="productImageUrl"
        :product-display-title="productDisplayTitle"
        :product-category-icon="productCategoryIcon"
        :format-order-total="formatOrderTotal"
        :format-order-item-subtotal="formatOrderItemSubtotal"
        :order-status-label="orderStatusLabel"
        :logistics-status-label="logisticsStatusLabel"
        :logistics-event-type-label="logisticsEventTypeLabel"
        :format-logistics-date="formatLogisticsDate"
        :can-complete-order="canCompleteOrder"
        :can-cancel-order="canCancelOrder"
        @back="shopPageKey === 'order' ? closeOrderDetail() : openShopHome()"
        @open-cart="openCartPage"
        @open-orders="openOrdersPage"
        @open-logistics="openLogisticsPage"
        @open-service="openServicePage"
        @update-quantity="updateCartQuantity"
        @checkout="openCheckoutPage"
        @open-order="openOrderDetail"
        @delete-order="removeOrder"
        @close-order="closeOrderDetail"
        @complete-order="markOrderCompleted"
        @cancel-order="cancelOrder"
        @update:gift-enabled="giftDraft.enabled = $event"
        @update:gift-contact-id="giftDraft.contactId = $event"
        @update:gift-recipient-name="giftDraft.name = $event"
      />
      <template v-else-if="activeServicePageComponent && ['checkout', 'service'].includes(shopPageKey)">
        <component
        :is="activeServicePageComponent"
        :page-key="shopPageKey"
        :service-label="activeShoppingAppLabel"
        :language-base="languageBase"
        :cart-items="cartLineItems"
        :cart-quantity="cartQuantity"
        :cart-total-label="formatLegacyMoneyQuote(cartPrimaryTotal.amountCents, cartPrimaryTotal.currency)"
        :orders="recentOrders"
        :selected-order="selectedOrder"
        :logistics-rows="logisticsOrderRows"
        :gift-enabled="giftDraft.enabled"
        :gift-contact-id="giftDraft.contactId"
        :gift-recipient-name="giftDraft.name"
        :gift-recipient-options="giftRecipientOptions"
        :product-image-url="productImageUrl"
        :product-display-title="productDisplayTitle"
        :product-category-icon="productCategoryIcon"
        :format-order-total="formatOrderTotal"
        :format-order-item-subtotal="formatOrderItemSubtotal"
        :order-status-label="orderStatusLabel"
        :logistics-status-label="logisticsStatusLabel"
        :logistics-event-type-label="logisticsEventTypeLabel"
        :format-logistics-date="formatLogisticsDate"
        :can-complete-order="canCompleteOrder"
        :can-cancel-order="canCancelOrder"
        @back="shopPageKey === 'checkout' ? openCartPage() : openShopHome()"
        @open-cart="openCartPage"
        @open-orders="openOrdersPage"
        @open-logistics="openLogisticsPage"
        @open-service="openServicePage"
        @place-order="commitCheckoutCart"
        @open-order="openOrderDetail"
        />
        <ShoppingCheckoutSettlement
          v-if="shopPageKey === 'checkout'"
          class="shopping-checkout-settlement-host"
          :storefront="activeStorefrontTemplate"
          :language-base="languageBase"
          :address-options="checkoutAddressOptions"
          :selected-address-id="checkoutDraft.addressId"
          :recipient-name="checkoutDraft.recipientName"
          :recipient-phone="checkoutDraft.recipientPhone"
          :payment-options="checkoutPaymentOptions"
          :selected-payment-card-id="checkoutDraft.paymentCardId"
          :current-location="mapStore.currentLocation"
          :total-label="checkoutTotalLabel"
          :feedback="checkoutFeedback"
          :busy="checkoutBusy"
          @update:selected-address-id="checkoutDraft.addressId = $event"
          @update:recipient-name="checkoutDraft.recipientName = $event"
          @update:recipient-phone="checkoutDraft.recipientPhone = $event"
          @update:selected-payment-card-id="checkoutDraft.paymentCardId = $event"
          @save-address="saveCheckoutAddress"
          @submit="commitCheckoutCart"
        />
      </template>
      <ShoppingCollectionPage
        v-else-if="shopPageKey === 'category'"
        :storefront="activeStorefrontTemplate"
        :service-label="activeShoppingAppLabel"
        :category="activeCategory"
        :categories="productCategoryCards"
        :products="paginatedProducts"
        :page="Math.min(catalogPage, catalogPageCount)"
        :page-count="catalogPageCount"
        :total-count="visibleProducts.length"
        :search-query="productSearchQuery"
        :favorites-only="favoritesOnly"
        :cart-quantity="cartQuantity"
        :language-base="languageBase"
        :product-image-url="productImageUrl"
        :product-display-title="productDisplayTitle"
        :product-display-description="productDisplayDescription"
        :product-category-icon="productCategoryIcon"
        :stock-status-label="stockStatusLabel"
        :format-price="formatPrice"
        :is-product-favorite="(productId) => shoppingStore.isProductFavorite(productId)"
        @back="openShopHome"
        @select-category="openCategory"
        @open-product="openProductDetail"
        @add-to-cart="addToCart"
        @toggle-favorite="toggleFavorite"
        @open-cart="openCartPage"
        @open-orders="openOrdersPage"
        @change-page="changeCatalogPage"
        @update:search-query="productSearchQuery = $event"
        @submit-search="submitCatalogSearch"
      />
      <ShoppingProductPage
        v-else-if="shopPageKey === 'product'"
        :storefront="activeStorefrontTemplate"
        :service-label="activeShoppingAppLabel"
        :product="selectedProduct"
        :related-products="relatedProducts"
        :cart-quantity="cartQuantity"
        :language-base="languageBase"
        :product-image-url="productImageUrl"
        :product-display-title="productDisplayTitle"
        :product-display-description="productDisplayDescription"
        :product-category-icon="productCategoryIcon"
        :stock-status-label="stockStatusLabel"
        :format-price="formatPrice"
        :is-product-favorite="(productId) => shoppingStore.isProductFavorite(productId)"
        @back="closeProductDetail"
        @open-product="openProductDetail"
        @add-to-cart="addToCart"
        @toggle-favorite="toggleFavorite"
        @open-cart="openCartPage"
        @open-orders="openOrdersPage"
      />
      <div
        v-if="['orders', 'logistics'].includes(shopPageKey) || shopPageKey === 'manage' || openedFromChatProductLink || openedFromChatGiftOrder || openedFromChatShoppingOrder || openedFromChatLogistics || openedFromAppStoreShopCreate || worldAppContext"
        class="shopping-content px-4 py-4 space-y-4"
      >
        <header v-if="shopPageKey === 'manage'" class="shopping-subpage-header">
          <button type="button" :aria-label="t('返回店铺首页', 'Back to store home')" @click="openShopHome">
            <i class="fas fa-arrow-left" aria-hidden="true"></i>
          </button>
          <div>
            <span>{{ activeShoppingAppLabel }}</span>
            <strong>
              {{
                shopPageKey === 'cart'
                  ? t('购物车', 'Cart')
                  : shopPageKey === 'orders'
                    ? t('订单', 'Orders')
                    : shopPageKey === 'order'
                      ? t('订单详情', 'Order detail')
                      : shopPageKey === 'logistics'
                        ? t('物流', 'Logistics')
                        : t('商品管理', 'Catalog manager')
              }}
            </strong>
          </div>
          <button v-if="shopPageKey !== 'cart'" type="button" :aria-label="t('打开购物车', 'Open cart')" @click="openCartPage">
            <i class="fas fa-bag-shopping" aria-hidden="true"></i><b v-if="cartQuantity">{{ cartQuantity }}</b>
          </button>
          <button v-else type="button" :aria-label="t('打开订单', 'Open orders')" @click="openOrdersPage">
            <i class="fas fa-receipt" aria-hidden="true"></i>
          </button>
        </header>
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
                  ? t('来自聊天中的礼物订单', 'Gift order from Chat')
                  : openedFromChatLogistics
                    ? t('来自聊天中的配送提醒', 'Delivery reminder from Chat')
                    : openedFromChatShoppingOrder
                      ? t('来自聊天中的订单提醒', 'Order reminder from Chat')
                  : t('来自聊天分享的商品', 'Product shared from Chat')
              }}
            </p>
            <p class="mt-1 text-[11px] leading-5 text-gray-500">
              {{
                openedFromChatGiftOrder
                  ? t('继续核对商品、收件信息与订单状态。', 'Continue with the items, recipient details, and order status.')
                  : openedFromChatLogistics
                    ? t('在这里查看订单记录与配送进度。', 'Review the order and delivery progress here.')
                    : openedFromChatShoppingOrder
                      ? t('订单详情、支付与配送信息以此页面为准。', 'Use this page for order details, payment, and delivery information.')
                  : t('继续查看商品、规格、评价与购买选项。', 'Continue with product details, specifications, reviews, and purchase options.')
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
            {{ t('返回聊天', 'Back to Chat') }}
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
              {{ t('创建本店商品目录', 'Set up this store catalog') }}
            </p>
            <p class="mt-2 text-xs leading-5 text-amber-700">
              {{
                t(
                  '在这里添加或编辑本店商品。店铺在主屏幕上的名称、图标和安装位置可回到 App Store 调整。',
                  'Add or edit this store’s products here. Return to App Store to change its Home name, icon, or placement.',
                )
              }}
            </p>
          </div>
          <span class="shrink-0 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-700">
            {{ t('店铺设置', 'STORE SETUP') }}
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
              {{ t('场景清单', 'FOR THIS SCENE') }}
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
                  '已按当前场景整理商品；库存、配送与结算条件仍以商品页和订单页为准。',
                  'Items are curated for this scene; stock, delivery, and checkout terms remain on product and order pages.',
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
                ? t('正在显示推荐', 'Showing recommendations')
                : t('查看推荐', 'View recommendations')
            }}
          </button>
        </div>
      </section>

      <section
        v-if="shopPageKey === 'logistics' && logisticsMapRows.length"
        class="shopping-owner-bridge"
        data-testid="shopping-logistics-map-bridge"
      >
        <header>
          <div>
            <span>DELIVERY MAP</span>
            <strong>{{ t('查看配送地点', 'View delivery location') }}</strong>
          </div>
          <b>{{ logisticsMapRows.length }}</b>
        </header>
        <div class="shopping-owner-bridge-list">
          <article v-for="row in logisticsMapRows" :key="row.order.id">
            <p>{{ row.title }}</p>
            <DeliveryRouteContextCard
              :context="row.mapHandoff"
              :test-id="`shopping-logistics-map-context-${row.order.id}`"
            />
          </article>
        </div>
      </section>

      <section
        id="shopping-catalog-manager"
        v-if="shopPageKey === 'manage'"
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


      <section
        v-if="shopPageKey === 'orders' && assetTransferSuggestions.length > 0"
        class="shopping-owner-bridge rounded-lg border border-cyan-100 p-4"
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
        v-if="shopPageKey === 'orders' && walletExpenseSuggestions.length > 0"
        class="shopping-owner-bridge rounded-lg border border-emerald-100 p-4"
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

.shopping-checkout-settlement-host {
  margin: -44px 18px 72px;
  position: relative;
  z-index: 3;
}

:deep([data-testid='shopping-checkout-review'] [data-testid='shopping-place-order']) {
  display: none !important;
}

@media (max-width: 720px) {
  .shopping-checkout-settlement-host {
    margin: -42px 12px 64px;
  }
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

.shopping-view-shell[data-storefront='member_warehouse'] {
  --shop-bg: #edf0f4;
  --shop-surface: #ffffff;
  --shop-ink: #172033;
  --shop-muted: #6f7989;
  --shop-accent: #142d58;
  --shop-accent-2: #f4b719;
  --shop-line: rgba(20, 45, 88, 0.2);
}

.shopping-view-shell[data-storefront='neighborhood_convenience'] {
  --shop-bg: #f6f3fa;
  --shop-surface: #ffffff;
  --shop-ink: #25142f;
  --shop-muted: #75657c;
  --shop-accent: #672b8f;
  --shop-accent-2: #9bc53d;
  --shop-line: rgba(103, 43, 143, 0.18);
}

.shopping-view-shell[data-storefront='fashion_catalog'] {
  --shop-bg: #f3f3f3;
  --shop-surface: #ffffff;
  --shop-ink: #0a0a0a;
  --shop-muted: #717171;
  --shop-accent: #111111;
  --shop-accent-2: #b7ff34;
  --shop-line: rgba(0, 0, 0, 0.18);
}

.shopping-view-shell[data-storefront='buyer_atelier'] {
  --shop-bg: #e8e2d8;
  --shop-surface: #f9f7f2;
  --shop-ink: #27221f;
  --shop-muted: #716a63;
  --shop-accent: #5b1f28;
  --shop-accent-2: #be8c90;
  --shop-line: rgba(91, 31, 40, 0.2);
}

.shopping-view-shell[data-storefront='luxury_hall'] {
  --shop-bg: #12110f;
  --shop-surface: #1c1a17;
  --shop-ink: #eee7db;
  --shop-muted: #aaa196;
  --shop-accent: #bfa36b;
  --shop-accent-2: #eee7db;
  --shop-line: rgba(191, 163, 107, 0.28);
}

.shopping-scroll {
  scroll-behavior: smooth;
  background: var(--shop-bg);
}

.shopping-content {
  max-width: 760px;
  margin: 0 auto;
  padding-bottom: 32px;
  color: #111827;
}

.shopping-subpage-header {
  min-height: 64px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--shop-line);
}

.shopping-subpage-header > button {
  position: relative;
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid var(--shop-line);
  border-radius: 50%;
  color: var(--shop-ink);
  background: var(--shop-surface);
}

.shopping-subpage-header > button b {
  position: absolute;
  top: -4px;
  right: -3px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: white;
  background: var(--shop-accent);
  font-size: 9px;
}

.shopping-subpage-header > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.shopping-subpage-header span {
  overflow: hidden;
  color: var(--shop-muted);
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .13em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shopping-subpage-header strong {
  color: var(--shop-ink);
  font-size: 15px;
}

.shopping-management-panel {
  scroll-margin-top: 12px;
}

.shopping-owner-bridge {
  width: min(100%, 760px);
  margin: 0 auto;
  color: var(--shop-ink);
  background: var(--shop-surface);
  border-color: var(--shop-line);
}

.shopping-owner-bridge > header {
  min-height: 58px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--shop-line);
}

.shopping-owner-bridge > header span,
.shopping-owner-bridge > header strong {
  display: block;
}

.shopping-owner-bridge > header span {
  color: var(--shop-accent);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .12em;
}

.shopping-owner-bridge > header strong {
  margin-top: 4px;
  color: var(--shop-ink);
  font-size: 13px;
}

.shopping-owner-bridge > header b {
  min-width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--shop-surface);
  background: var(--shop-accent);
  font-size: 9px;
}

.shopping-owner-bridge-list {
  display: grid;
  gap: 8px;
  padding: 12px;
}

.shopping-owner-bridge-list > article {
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--shop-line);
  background: color-mix(in srgb, var(--shop-surface) 92%, var(--shop-accent) 8%);
}

.shopping-owner-bridge-list > article > p {
  margin: 0 0 8px;
  overflow: hidden;
  color: var(--shop-muted);
  font-size: 9px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 390px) {
  .shopping-content {
    padding-inline: 10px;
  }

  .shopping-owner-bridge {
    border-radius: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shopping-scroll {
    scroll-behavior: auto;
  }
}

</style>

<style>
.app-shell[data-statusbar='on'] .shopping-view-shell .shopping-scroll {
  padding-top: 2rem;
}
</style>
