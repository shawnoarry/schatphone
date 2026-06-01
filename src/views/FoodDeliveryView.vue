<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import ImageSourcePicker from '../components/shared/ImageSourcePicker.vue'
import DeliveryRouteContextCard from '../components/map/DeliveryRouteContextCard.vue'
import {
  RELATIONSHIP_FACT_SOURCE_KEYS,
  buildFoodDeliverySharedMealRelationshipMemoryKey,
  buildFoodDeliverySharedMealRelationshipSuggestion,
  recordFoodDeliverySharedMealRelationshipFact,
  recordWalletOrderSupportRelationshipFact,
} from '../lib/relationship-fact-adapters'
import { resolveWorldAppUxContext } from '../lib/world-pack-app-bindings'
import {
  FOOD_DELIVERY_ORDER_EVENT_TYPE,
  FOOD_DELIVERY_ORDER_STATUS,
  useFoodDeliveryStore,
} from '../stores/foodDelivery'
import { useGalleryStore } from '../stores/gallery'
import { useMapStore } from '../stores/map'
import { useChatStore } from '../stores/chat'
import { useBookStore } from '../stores/book'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'
import { useSimulationStore } from '../stores/simulation'
import { useSystemStore } from '../stores/system'
import { useWalletStore } from '../stores/wallet'
import {
  FOOD_DELIVERY_CATEGORY_ENTRIES,
  FOOD_DELIVERY_SOURCE_KEYS,
  findFoodDeliveryCategory,
} from '../lib/planned-module-registry'
import { pushReturnTarget } from '../lib/navigation-return'
import { runFoodDeliveryRandomOrderEventPilot } from '../lib/simulation/adapters/food-delivery-events'
import { resolveWorldContextFromSystemStore } from '../lib/simulation/world-context'

const route = useRoute()
const router = useRouter()
const { t, languageBase } = useI18n()
const foodDeliveryStore = useFoodDeliveryStore()
const chatStore = useChatStore()
const bookStore = useBookStore()
const galleryStore = useGalleryStore()
const mapStore = useMapStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const simulationStore = useSimulationStore()
const systemStore = useSystemStore()
const walletStore = useWalletStore()
const FOOD_DELIVERY_IMAGE_PREVIEW_SCOPE_ID = 'food-delivery-view'
const foodImagePreviewMap = reactive({})

const customFeedback = ref('')
const eventFeedback = ref('')
const restaurantDraft = reactive({
  name: '',
  category: 'restaurants',
  cuisine: '',
  address: '',
  deliveryFee: '',
  distanceKm: '',
  deliveryEtaMinutes: '',
  imageSourceType: 'none',
  imageUrl: '',
  imageGalleryAssetId: '',
})
const menuDraft = reactive({
  restaurantId: '',
  title: '',
  category: 'restaurants',
  price: '',
  desc: '',
  imageSourceType: 'none',
  imageUrl: '',
  imageGalleryAssetId: '',
})
const sharedMealTargets = reactive({})

const worldAppUxContext = computed(() =>
  resolveWorldAppUxContext({
    systemStore,
    moduleKey: 'food_delivery',
    routeQuery: route.query,
    expectedArchetypes: ['dispatch'],
  }),
)
const worldAppRouteQuery = computed(() => worldAppUxContext.value?.routeQuery || {})
const defaultFoodDeliveryCategoryKey = computed(() =>
  worldAppUxContext.value ? 'nearby' : 'restaurants',
)
const activeCategoryKey = computed(() =>
  typeof route.query.category === 'string' ? route.query.category : defaultFoodDeliveryCategoryKey.value,
)
const activeCategory = computed(() => findFoodDeliveryCategory(activeCategoryKey.value))
const foodDeliveryTitle = computed(() =>
  worldAppUxContext.value?.bindingTitle || t('外卖', 'Food Delivery'),
)
const foodDeliveryDescription = computed(() => {
  const context = worldAppUxContext.value
  if (!context) {
    return t(
      '外卖模块使用主屏文件夹式入口，后续可在内部建立不同餐厅分类；订单归外卖，位置与路线由 Map 提供上下文。',
      'Food Delivery uses the Home folder pattern. It can later host restaurant categories while orders stay here and Map provides location/route context.',
    )
  }
  if (languageBase.value === 'zh' && context.bindingId === 'survival_dispatch') {
    return '当前世界包把 Food Delivery 作为救援调度入口使用，会强化配送、支援与异常提醒；订单事实仍由 Food Delivery 自己持有。'
  }
  return context.description || 'This entry brings the active World Pack UX package into Food Delivery.'
})
const foodDeliveryHeroClass = computed(() =>
  worldAppUxContext.value
    ? 'bg-gradient-to-br from-sky-800 via-cyan-600 to-lime-300'
    : 'bg-gradient-to-br from-orange-400 via-amber-300 to-lime-200',
)
const foodDeliveryShellClass = computed(() =>
  worldAppUxContext.value ? 'bg-[#eef8fb]' : 'bg-[#fff8ed]',
)
const foodDeliveryHeroEyebrow = computed(() =>
  worldAppUxContext.value
    ? t('Food Delivery / 世界包', 'Food Delivery / World Pack')
    : 'Food Delivery',
)

const categoryCards = computed(() =>
  FOOD_DELIVERY_CATEGORY_ENTRIES.map((entry) => ({
    ...entry,
    label: languageBase.value === 'zh' ? entry.zh : entry.en,
    desc: languageBase.value === 'zh' ? entry.descZh : entry.descEn,
    active: entry.key === activeCategory.value?.key,
  })),
)

const sourcePlan = computed(() => [
  {
    key: FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH,
    title: t('外卖服务号推送', 'Food delivery service pushes'),
    desc: t(
      '外卖通知服务号承载接单、备餐、骑手取餐、送达和异常提醒。',
      'The food delivery service account carries accepted, cooking, rider pickup, delivered, and exception alerts.',
    ),
  },
  {
    key: FOOD_DELIVERY_SOURCE_KEYS.MAP_RESTAURANT_LOCATION,
    title: t('Map 餐厅位置', 'Map restaurant location'),
    desc: t(
      'Map 提供餐厅位置、配送地址、附近筛选和距离判断，但不拥有外卖订单。',
      'Map provides restaurant location, delivery address, nearby filters, and distance context without owning food orders.',
    ),
  },
  {
    key: FOOD_DELIVERY_SOURCE_KEYS.MAP_COURIER_ROUTE,
    title: t('Map 骑手路线 / ETA', 'Map courier route / ETA'),
    desc: t(
      '后续骑手路线、预计送达和取餐点可进入 Map 行程系统。',
      'Courier route, ETA, and pickup points can later become Map trip context.',
    ),
  },
  {
    key: FOOD_DELIVERY_SOURCE_KEYS.WALLET_EXPENSE,
    title: t('Wallet 外卖支出', 'Wallet food expense'),
    desc: t(
      'Wallet 可记录外卖消费流水，但外卖订单仍归外卖模块。',
      'Wallet can record food-delivery expenses while food orders remain owned by Food Delivery.',
    ),
  },
])

const activeCategoryLabel = computed(() =>
  languageBase.value === 'zh' ? activeCategory.value.zh : activeCategory.value.en,
)
const activeCategoryDesc = computed(() =>
  languageBase.value === 'zh' ? activeCategory.value.descZh : activeCategory.value.descEn,
)
const FOOD_STORE_VISUALS = {
  restaurants: {
    tone: 'bistro',
    heroClass: 'from-orange-500 via-amber-300 to-lime-200',
    badgeClass: 'bg-orange-50 text-orange-700',
    buttonClass: 'bg-orange-500 text-white',
  },
  fast_food: {
    tone: 'speed',
    heroClass: 'from-red-500 via-yellow-300 to-orange-200',
    badgeClass: 'bg-red-50 text-red-700',
    buttonClass: 'bg-red-500 text-white',
  },
  cafe: {
    tone: 'cafe',
    heroClass: 'from-emerald-500 via-teal-300 to-yellow-100',
    badgeClass: 'bg-emerald-50 text-emerald-700',
    buttonClass: 'bg-emerald-600 text-white',
  },
  dessert: {
    tone: 'sweet',
    heroClass: 'from-pink-500 via-rose-300 to-amber-100',
    badgeClass: 'bg-pink-50 text-pink-700',
    buttonClass: 'bg-pink-500 text-white',
  },
  grocery_delivery: {
    tone: 'market',
    heroClass: 'from-lime-600 via-green-300 to-sky-100',
    badgeClass: 'bg-lime-50 text-lime-700',
    buttonClass: 'bg-lime-600 text-white',
  },
  nearby: {
    tone: 'nearby',
    heroClass: 'from-sky-600 via-cyan-300 to-amber-100',
    badgeClass: 'bg-sky-50 text-sky-700',
    buttonClass: 'bg-sky-600 text-white',
  },
}
const activeRestaurants = computed(() => {
  const restaurants = foodDeliveryStore.listRestaurantsByCategory(activeCategory.value?.key)
  if (restaurants.length > 0) return restaurants
  return foodDeliveryStore.restaurants.slice(0, 4)
})
const selectedRestaurantId = computed(() =>
  typeof route.query.restaurantId === 'string' ? route.query.restaurantId.trim() : '',
)
const selectedRestaurant = computed(() =>
  selectedRestaurantId.value ? foodDeliveryStore.findRestaurantById(selectedRestaurantId.value) : null,
)
const isStoreMode = computed(() => Boolean(selectedRestaurant.value))
const activeRestaurant = computed(() =>
  selectedRestaurant.value || activeRestaurants.value[0] || foodDeliveryStore.restaurants[0] || null,
)
const activeMenuItems = computed(() =>
  activeRestaurant.value ? foodDeliveryStore.listMenuByRestaurant(activeRestaurant.value.id) : [],
)
const activeStoreVisual = computed(() => {
  const key = activeRestaurant.value?.category || activeCategory.value?.key || 'restaurants'
  return FOOD_STORE_VISUALS[key] || FOOD_STORE_VISUALS.restaurants
})
const galleryImageOptions = computed(() =>
  galleryStore.assets
    .filter((asset) => ['reference', 'scenario', 'wallpaper'].includes(asset.category))
    .slice(0, 80),
)
const activeMapHandoff = computed(() =>
  mapStore.buildFoodDeliveryMapHandoff({
    restaurant: activeRestaurant.value || {},
    categoryKey: activeCategory.value?.key || '',
  }),
)
const activeMapHandoffRouteSummary = computed(() =>
  languageBase.value === 'zh'
    ? activeMapHandoff.value.routeSummaryZh
    : activeMapHandoff.value.routeSummaryEn,
)
const recentOrders = computed(() => foodDeliveryStore.recentOrders)
const sharedMealContactOptions = computed(() =>
  chatStore.contactsForList
    .filter((contact) => Number(contact.id) > 0)
    .slice(0, 60),
)

const selectedSharedMealContact = (orderId) =>
  sharedMealContactOptions.value.find(
    (contact) => String(contact.id) === String(sharedMealTargets[orderId] || ''),
  ) || null

const buildSharedMealSuggestion = (order) =>
  buildFoodDeliverySharedMealRelationshipSuggestion({
    relationshipRuntimeStore,
    order,
    target: selectedSharedMealContact(order?.id),
  })

const walletExpenseSuggestions = computed(() =>
  foodDeliveryStore.orders
    .filter((order) => order.status === FOOD_DELIVERY_ORDER_STATUS.DELIVERED)
    .map((order) => {
      const sourceId = order.id
      const walletImported = Boolean(walletStore.findTransactionBySource(FOOD_DELIVERY_SOURCE_KEYS.WALLET_EXPENSE, sourceId))
      const relationshipSuggestion = buildSharedMealSuggestion(order)
      return {
        order,
        orderId: order.id,
        sourceId,
        restaurantName: order.restaurantName,
        amount: (Number(order.totalCents || 0) / 100).toFixed(2),
        currency: order.currency,
        itemCount: order.itemCount,
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
const chatSourceOrderId = computed(() =>
  typeof route.query.orderId === 'string' ? route.query.orderId.trim() : '',
)
const isChatFoodDeliverySource = computed(() =>
  route.query.source === 'chat' && route.query.intent === 'food_delivery_order' && Boolean(chatSourceOrderId.value),
)
const chatSourceOrder = computed(() => {
  if (!chatSourceOrderId.value) return null
  return foodDeliveryStore.orders.find((order) => order.id === chatSourceOrderId.value) || null
})

watch(
  chatSourceOrder,
  (order) => {
    if (!order?.restaurantId || selectedRestaurantId.value === order.restaurantId) return
    const restaurant = foodDeliveryStore.findRestaurantById(order.restaurantId)
    router.replace({
      path: '/food-delivery',
      query: {
        ...route.query,
        category: restaurant?.category || order.items?.[0]?.category || activeCategory.value?.key || 'restaurants',
        restaurantId: order.restaurantId,
      },
    })
  },
  { immediate: true },
)

const isHighlightedOrder = (orderId) => isChatFoodDeliverySource.value && orderId === chatSourceOrderId.value

const buildFoodDeliveryEventMapContext = (order, event) =>
  mapStore.buildDeliveryEventMapHandoff({
    ownerModule: 'food_delivery',
    order,
    event,
  })

const foodDeliveryEventTypeLabel = (type) => {
  if (type === FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY) return t('骑手延迟', 'Rider delay')
  if (type === FOOD_DELIVERY_ORDER_EVENT_TYPE.RESTAURANT_CANCELLED) return t('商家取消', 'Restaurant cancelled')
  if (type === FOOD_DELIVERY_ORDER_EVENT_TYPE.ADDRESS_CHANGE) return t('地址变更', 'Address changed')
  if (type === FOOD_DELIVERY_ORDER_EVENT_TYPE.ETA_UPDATE) return t('ETA 更新', 'ETA update')
  return t('状态更新', 'Status update')
}

const formatFoodDeliveryEventTime = (timestamp) => {
  const date = new Date(Number(timestamp || 0))
  if (Number.isNaN(date.getTime())) return t('时间待定', 'Time TBD')
  const locale = languageBase.value === 'zh' ? 'zh-CN' : 'en-US'
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const orderEventRows = (order) =>
  (Array.isArray(order?.events) ? order.events : []).slice(0, 3).map((event) => ({
    ...event,
    typeLabel: foodDeliveryEventTypeLabel(event.type),
    timeLabel: formatFoodDeliveryEventTime(event.createdAt),
    mapHandoff: buildFoodDeliveryEventMapContext(order, event),
    detail:
      event.summary ||
      (event.deliveryAddress
        ? t(`配送地址更新为 ${event.deliveryAddress}`, `Delivery address changed to ${event.deliveryAddress}`)
        : event.etaMinutes !== null && event.etaMinutes !== undefined
          ? t(`预计 ${event.etaMinutes} 分钟送达`, `ETA ${event.etaMinutes} min`)
          : t('外卖履约状态有新变化。', 'Food delivery status changed.')),
  }))

const triggerOrderSurpriseEvent = (order) => {
  eventFeedback.value = ''
  const result = runFoodDeliveryRandomOrderEventPilot({
    foodDeliveryStore,
    simulationStore,
    orderId: order?.id || '',
    randomValue: 0,
    seed: `${order?.id || 'food_order'}:${Date.now()}`,
    worldContext: resolveWorldContextFromSystemStore(systemStore, {
      bookStore,
      sourceScope: 'module',
      now: Date.now(),
    }),
    now: Date.now(),
  })

  if (result.ok) {
    eventFeedback.value = t('Delivery event added to this order.', 'Delivery event added to this order.')
    return
  }

  const reason = result.reason || result.log?.reason || result.evaluation?.reason || ''
  if (reason === 'cooldown_active') {
    eventFeedback.value = t(
      'Delivery events are cooling down for this order.',
      'Delivery events are cooling down for this order.',
    )
    return
  }
  if (reason === 'daily_limit_reached') {
    eventFeedback.value = t(
      'Daily delivery-event limit reached for this order.',
      'Daily delivery-event limit reached for this order.',
    )
    return
  }
  if (reason === 'module_events_disabled') {
    eventFeedback.value = t(
      'Food Delivery events are disabled in Simulation settings.',
      'Food Delivery events are disabled in Simulation settings.',
    )
    return
  }
  eventFeedback.value = t(
    'No delivery surprise was triggered this time.',
    'No delivery surprise was triggered this time.',
  )
}

const resetRestaurantDraft = () => {
  restaurantDraft.name = ''
  restaurantDraft.category = activeCategory.value?.key || 'restaurants'
  restaurantDraft.cuisine = ''
  restaurantDraft.address = ''
  restaurantDraft.deliveryFee = ''
  restaurantDraft.distanceKm = ''
  restaurantDraft.deliveryEtaMinutes = ''
  restaurantDraft.imageSourceType = 'none'
  restaurantDraft.imageUrl = ''
  restaurantDraft.imageGalleryAssetId = ''
}

const resetMenuDraft = (restaurantId = activeRestaurant.value?.id || '') => {
  menuDraft.restaurantId = restaurantId
  menuDraft.title = ''
  menuDraft.category = activeCategory.value?.key || activeRestaurant.value?.category || 'restaurants'
  menuDraft.price = ''
  menuDraft.desc = ''
  menuDraft.imageSourceType = 'none'
  menuDraft.imageUrl = ''
  menuDraft.imageGalleryAssetId = ''
}

const createCustomRestaurant = () => {
  customFeedback.value = ''
  const imageSourceType = restaurantDraft.imageSourceType
  const restaurant = foodDeliveryStore.upsertRestaurant({
    name: restaurantDraft.name,
    category: restaurantDraft.category,
    cuisine: restaurantDraft.cuisine,
    address: restaurantDraft.address,
    deliveryFee: restaurantDraft.deliveryFee,
    distanceKm: restaurantDraft.distanceKm,
    deliveryEtaMinutes: restaurantDraft.deliveryEtaMinutes,
    sourceModule: 'food_delivery_user_custom_restaurant',
    imageSourceType,
    imageUrl: imageSourceType === 'url' ? restaurantDraft.imageUrl : '',
    imageGalleryAssetId: imageSourceType === 'gallery' ? restaurantDraft.imageGalleryAssetId : '',
  })
  if (!restaurant) {
    customFeedback.value = t('请输入有效餐厅名称。', 'Please enter a valid restaurant name.')
    return
  }
  customFeedback.value = t('自定义餐厅已加入外卖列表。', 'Custom restaurant added to Food Delivery.')
  resetRestaurantDraft()
  resetMenuDraft(restaurant.id)
  router.push({
    path: '/food-delivery',
    query: { ...worldAppRouteQuery.value, category: restaurant.category },
  })
}

const createCustomMenuItem = () => {
  customFeedback.value = ''
  const restaurantId = menuDraft.restaurantId || activeRestaurant.value?.id || ''
  const restaurant = foodDeliveryStore.findRestaurantById(restaurantId)
  const imageSourceType = menuDraft.imageSourceType
  const item = foodDeliveryStore.upsertMenuItem({
    restaurantId,
    title: menuDraft.title,
    category: menuDraft.category || restaurant?.category || 'restaurants',
    price: menuDraft.price,
    desc: menuDraft.desc,
    sourceModule: 'food_delivery_user_custom_menu',
    imageSourceType,
    imageUrl: imageSourceType === 'url' ? menuDraft.imageUrl : '',
    imageGalleryAssetId: imageSourceType === 'gallery' ? menuDraft.imageGalleryAssetId : '',
  })
  if (!item) {
    customFeedback.value = t('请输入有效菜单名称、餐厅和价格。', 'Please enter a valid menu name, restaurant, and price.')
    return
  }
  customFeedback.value = t('自定义菜单项已加入当前餐厅。', 'Custom menu item added to the restaurant.')
  resetMenuDraft(item.restaurantId)
}

const openRestaurantStore = (restaurant) => {
  if (!restaurant?.id) return
  router.push({
    path: '/food-delivery',
    query: {
      ...worldAppRouteQuery.value,
      category: restaurant.category || activeCategory.value?.key || 'restaurants',
      restaurantId: restaurant.id,
    },
  })
}

const closeRestaurantStore = () => {
  router.push({
    path: '/food-delivery',
    query: {
      ...worldAppRouteQuery.value,
      category: activeCategory.value?.key || activeRestaurant.value?.category || 'restaurants',
    },
  })
}

const openCategory = (key) => {
  router.push({
    path: '/food-delivery',
    query: { ...worldAppRouteQuery.value, category: key },
  })
}

const addMenuItemToCart = (menuItemId) => {
  foodDeliveryStore.addToCart(menuItemId, 1, {
    sourceModule: FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH,
  })
}

const checkoutFoodDelivery = () => {
  const mapHandoff = activeMapHandoff.value
  const relationshipTarget = activeRestaurant.value
    ? selectedSharedMealContact(activeRestaurant.value.id)
    : null
  foodDeliveryStore.checkoutCart({
    deliveryAddress: mapHandoff.deliveryAddress || t('Map 当前配送地址', 'Current Map delivery address'),
    note: activeMapHandoffRouteSummary.value || t('外卖模块基础订单', 'Food Delivery baseline order'),
    relationshipBinding: relationshipTarget
      ? {
          contactId: Number(relationshipTarget.id) || 0,
          profileId: Number(relationshipTarget.profileId || 0),
          kind: relationshipTarget.kind,
          name: relationshipTarget.name,
          sourceModule: 'chat',
          sourceId: String(relationshipTarget.id || ''),
        }
      : null,
    sourceModule: mapHandoff.sourceModule,
    sourceId: mapHandoff.sourceId,
  })
}

const markFoodOrderDelivered = (orderId) =>
  foodDeliveryStore.updateOrderStatus(orderId, FOOD_DELIVERY_ORDER_STATUS.DELIVERED)

const removeFoodOrder = (orderId) => {
  if (!foodDeliveryStore.removeOrder(orderId)) return
  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.FOOD_DELIVERY_SHARED_MEAL,
    orderId,
  )
  const walletTransaction = walletStore.findTransactionBySource(FOOD_DELIVERY_SOURCE_KEYS.WALLET_EXPENSE, orderId)
  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_ORDER_SUPPORT,
    walletTransaction?.id || walletTransaction?.sourceId || orderId,
  )
  delete sharedMealTargets[orderId]
}

const transferFoodSuggestionToWallet = (suggestion) => {
  if (!suggestion || suggestion.imported) return null
  const existing = walletStore.findTransactionBySource(FOOD_DELIVERY_SOURCE_KEYS.WALLET_EXPENSE, suggestion.sourceId)
  const transaction = existing || walletStore.addTransaction({
    type: 'expense',
    title: 'Food Delivery order',
    amount: suggestion.amount,
    currency: suggestion.currency,
    counterparty: suggestion.restaurantName || 'Food Delivery',
    note: t('Manually imported from a Food Delivery order.', 'Manually imported from a Food Delivery order.'),
    sourceModule: FOOD_DELIVERY_SOURCE_KEYS.WALLET_EXPENSE,
    sourceId: suggestion.sourceId,
  })
  recordFoodDeliverySharedMealRelationshipFact({
    chatStore,
    relationshipRuntimeStore,
    order: suggestion.order,
    target: selectedSharedMealContact(suggestion.orderId),
    transaction,
  })
  if (selectedSharedMealContact(suggestion.orderId)) {
    recordWalletOrderSupportRelationshipFact({
      chatStore,
      relationshipRuntimeStore,
      target: selectedSharedMealContact(suggestion.orderId),
      transaction,
      memoryKey: buildFoodDeliverySharedMealRelationshipMemoryKey(suggestion.order),
      summary: `Wallet expense recorded for the same shared meal with ${selectedSharedMealContact(suggestion.orderId)?.name || 'a relationship contact'}.`,
    })
  }
  return transaction
}

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const foodImageUrl = (item) => {
  const image = item?.image || {}
  if (image.sourceType === 'url') return image.url || ''
  if (image.sourceType === 'gallery' && image.galleryAssetId) {
    return foodImagePreviewMap[image.galleryAssetId] || ''
  }
  return ''
}

const foodImageSourceLabel = (item) => {
  const sourceType = item?.image?.sourceType || 'none'
  if (sourceType === 'url') return t('URL image', 'URL image')
  if (sourceType === 'gallery') return t('Gallery asset', 'Gallery asset')
  if (sourceType === 'ai') return t('AI image reserved', 'AI image reserved')
  return t('Default icon', 'Default icon')
}

watch(
  activeCategoryKey,
  () => {
    if (!restaurantDraft.name) restaurantDraft.category = activeCategory.value?.key || 'restaurants'
    if (!menuDraft.title) menuDraft.category = activeCategory.value?.key || 'restaurants'
  },
  { immediate: true },
)

watch(
  () => activeRestaurant.value?.id || '',
  (restaurantId) => {
    if (!menuDraft.restaurantId || !foodDeliveryStore.findRestaurantById(menuDraft.restaurantId)) {
      menuDraft.restaurantId = restaurantId
    }
  },
  { immediate: true },
)

watch(
  () => [
    ...activeRestaurants.value.map((restaurant) => restaurant.image?.galleryAssetId || ''),
    ...activeMenuItems.value.map((item) => item.image?.galleryAssetId || ''),
  ].filter(Boolean),
  (assetIds) => {
    const activeSet = new Set(assetIds)
    assetIds.forEach((assetId) => {
      if (foodImagePreviewMap[assetId]) return
      void galleryStore.getAssetPreviewUrl(assetId, {
        scopeId: FOOD_DELIVERY_IMAGE_PREVIEW_SCOPE_ID,
      }).then((previewUrl) => {
        if (previewUrl) foodImagePreviewMap[assetId] = previewUrl
      })
    })
    Object.keys(foodImagePreviewMap).forEach((assetId) => {
      if (!activeSet.has(assetId)) {
        galleryStore.releaseAssetPreview(assetId, FOOD_DELIVERY_IMAGE_PREVIEW_SCOPE_ID)
        delete foodImagePreviewMap[assetId]
      }
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  galleryStore.releaseAssetPreviewScope(FOOD_DELIVERY_IMAGE_PREVIEW_SCOPE_ID)
  Object.keys(foodImagePreviewMap).forEach((assetId) => {
    delete foodImagePreviewMap[assetId]
  })
})
</script>

<template>
  <div class="min-h-screen p-4 text-gray-950" :class="foodDeliveryShellClass">
    <div class="mx-auto max-w-md space-y-4">
      <section class="rounded-[2rem] p-5 text-white shadow-xl" :class="foodDeliveryHeroClass">
        <button
          class="mb-4 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white"
          data-testid="food-delivery-go-home"
          @click="goHome"
        >
          ← {{ t('Home', 'Home') }}
        </button>
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
          {{ foodDeliveryHeroEyebrow }}
        </p>
        <h1 class="mt-2 text-3xl font-black" data-testid="food-delivery-hero-title">{{ foodDeliveryTitle }}</h1>
        <p class="mt-2 text-sm leading-6 text-white/85">
          {{ foodDeliveryDescription }}
        </p>
      </section>

      <section
        v-if="worldAppUxContext"
        class="rounded-3xl border border-sky-100 bg-sky-50 p-4"
        data-testid="food-delivery-world-app-context"
        :data-world-pack="worldAppUxContext.packId"
        :data-world-app="worldAppUxContext.bindingId"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase text-sky-700">
              {{ t('世界 UX 包', 'World UX package') }}
            </p>
            <h2 class="mt-1 text-lg font-black text-gray-950" data-testid="food-delivery-world-app-title">
              {{ foodDeliveryTitle }}
            </h2>
            <p class="mt-1 text-[11px] font-semibold text-sky-700">
              {{ t('来自', 'From') }} {{ t(worldAppUxContext.packTitle, worldAppUxContext.packName) }}
            </p>
            <p class="mt-2 text-[11px] leading-5 text-gray-600">
              {{ foodDeliveryDescription }}
            </p>
            <p class="mt-2 text-[11px] leading-5 text-sky-800" data-testid="food-delivery-world-app-boundary">
              {{
                t(
                  'Food Delivery 仍拥有餐厅、菜单、订单、状态和配送事件；世界包只改变入口语义、词汇、强调与安全默认视图。',
                  worldAppUxContext.boundaryCopy,
                )
              }}
            </p>
          </div>
          <span class="shrink-0 rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white">
            {{ worldAppUxContext.archetype }}
          </span>
        </div>
      </section>

      <section
        v-if="isChatFoodDeliverySource"
        class="rounded-3xl border border-orange-200 bg-orange-50 p-4"
        data-testid="food-delivery-chat-source-banner"
      >
        <p class="text-sm font-bold text-orange-900">
          {{ t('来自 Chat 外卖服务号', 'From Chat food delivery service') }}
        </p>
        <p class="mt-2 text-xs leading-5 text-orange-700">
          <span v-if="chatSourceOrder">
            {{
              t(
                `已定位到 ${chatSourceOrder.restaurantName} 的外卖订单，订单状态仍由 Food Delivery 管理。`,
                `Located the food order from ${chatSourceOrder.restaurantName}. Food Delivery still owns order status.`,
              )
            }}
          </span>
          <span v-else>
            {{
              t(
                '未找到对应外卖订单；可能已被删除或来自其他本地数据快照。',
                'The linked food order was not found. It may have been removed or belongs to another local data snapshot.',
              )
            }}
          </span>
        </p>
      </section>

      <div v-if="!isStoreMode" class="space-y-4" data-testid="food-delivery-platform">
      <section class="rounded-3xl border border-orange-100 bg-white p-4" data-testid="food-delivery-category-panel">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold">{{ t('当前分类', 'Active category') }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ activeCategoryLabel }}</p>
          </div>
          <span class="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
            {{ activeCategory.key }}
          </span>
        </div>
        <p class="mt-3 rounded-2xl bg-orange-50 p-3 text-xs leading-5 text-orange-700">
          {{ activeCategoryDesc }}
        </p>

        <div class="mt-3 grid grid-cols-2 gap-2">
          <button
            v-for="category in categoryCards"
            :key="category.key"
            class="rounded-2xl border p-3 text-left transition"
            :class="category.active ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-gray-50'"
            :data-testid="`food-delivery-category-${category.key}`"
            @click="openCategory(category.key)"
          >
            <span
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white"
              :class="category.active ? 'bg-orange-500' : 'bg-gray-900'"
            >
              <i :class="category.icon"></i>
            </span>
            <p class="mt-2 text-xs font-bold">{{ category.label }}</p>
            <p class="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500">{{ category.desc }}</p>
          </button>
        </div>
      </section>

      <section class="rounded-3xl border border-orange-100 bg-white p-4" data-testid="food-delivery-data-baseline">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold">{{ t('餐厅与菜单基线', 'Restaurant and menu baseline') }}</p>
            <p class="mt-1 text-xs text-gray-500">
              {{ foodDeliveryStore.restaurantCount }} {{ t('家餐厅', 'restaurant(s)') }} ·
              {{ foodDeliveryStore.menuItemCount }} {{ t('个菜单项', 'menu item(s)') }}
            </p>
          </div>
          <span class="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600">
            {{ t('本地数据', 'Local data') }}
          </span>
        </div>

        <div class="mt-3 grid gap-2">
          <article
            v-for="restaurant in activeRestaurants"
            :key="restaurant.id"
            class="rounded-2xl border border-orange-100 bg-orange-50/60 p-3"
            :data-testid="`food-delivery-restaurant-${restaurant.id}`"
          >
            <div class="flex items-start gap-3">
              <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white">
                <img
                  v-if="foodImageUrl(restaurant)"
                  :src="foodImageUrl(restaurant)"
                  :alt="restaurant.image?.alt || restaurant.name"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-orange-500">
                  <i class="fas fa-utensils"></i>
                </div>
              </div>
              <div class="min-w-0">
                <p class="truncate text-sm font-bold">{{ restaurant.name }}</p>
                <p class="mt-1 text-[11px] text-orange-700">
                  {{ restaurant.cuisine || restaurant.category }} · {{ restaurant.rating.toFixed(1) }} ★ ·
                  {{ restaurant.deliveryEtaMinutes }} min · {{ restaurant.distanceKm }} km
                </p>
                <p class="mt-1 text-[10px] font-semibold text-orange-500">
                  {{ foodImageSourceLabel(restaurant) }}
                </p>
              </div>
              <div class="ml-auto flex shrink-0 flex-col items-end gap-2">
                <span class="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-orange-600">
                  {{ restaurant.deliveryFee }} {{ restaurant.currency }}
                </span>
                <button
                  class="rounded-full bg-gray-950 px-3 py-1.5 text-[10px] font-bold text-white"
                  :data-testid="`food-delivery-open-store-${restaurant.id}`"
                  @click="openRestaurantStore(restaurant)"
                >
                  {{ t('进店', 'Open') }}
                </button>
              </div>
            </div>
          </article>
        </div>

        <div v-if="activeRestaurant" class="mt-4 rounded-2xl bg-gray-50 p-3" data-testid="food-delivery-menu-panel">
          <p class="text-xs font-bold">
            {{ t('当前菜单', 'Current menu') }} · {{ activeRestaurant.name }}
          </p>
          <div class="mt-2 space-y-2">
            <article
              v-for="item in activeMenuItems"
              :key="item.id"
              class="flex items-center justify-between gap-3 rounded-xl bg-white p-2"
              :data-testid="`food-delivery-menu-${item.id}`"
            >
              <div class="flex min-w-0 items-center gap-2">
                <div class="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-orange-50">
                  <img
                    v-if="foodImageUrl(item)"
                    :src="foodImageUrl(item)"
                    :alt="item.image?.alt || item.title"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-orange-500">
                    <i class="fas fa-bowl-food"></i>
                  </div>
                </div>
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold">{{ item.title }}</p>
                  <p class="text-[11px] text-gray-500">{{ item.price }} {{ item.currency }} · {{ foodImageSourceLabel(item) }}</p>
                </div>
              </div>
              <button
                class="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-bold text-white"
                :data-testid="`food-delivery-add-${item.id}`"
                @click="addMenuItemToCart(item.id)"
              >
                {{ t('加入', 'Add') }}
              </button>
            </article>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-orange-100 bg-white p-4" data-testid="food-delivery-custom-form">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold">{{ t('自定义餐厅与菜单', 'Custom restaurants and menu') }}</p>
            <p class="mt-1 text-[11px] leading-4 text-gray-500">
              {{
                t(
                  '可自定义餐厅、餐品名称、价格和 URL/Gallery 图片。本地文件仍先进入 Gallery，再被外卖引用。',
                  'Create restaurants and menu items with custom names, prices, and URL/Gallery images. Local files still enter Gallery first.',
                )
              }}
            </p>
          </div>
          <span class="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-600">
            {{ t('User origin', 'User origin') }}
          </span>
        </div>

        <div class="mt-3 rounded-2xl bg-orange-50/60 p-3">
          <p class="text-xs font-bold text-orange-900">{{ t('新增餐厅', 'New restaurant') }}</p>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <input
              v-model="restaurantDraft.name"
              data-testid="food-delivery-custom-restaurant-name"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              :placeholder="t('餐厅名称', 'Restaurant name')"
            />
            <select
              v-model="restaurantDraft.category"
              data-testid="food-delivery-custom-restaurant-category"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
            >
              <option v-for="category in categoryCards" :key="category.key" :value="category.key">
                {{ category.label }}
              </option>
            </select>
            <input
              v-model="restaurantDraft.cuisine"
              data-testid="food-delivery-custom-restaurant-cuisine"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              :placeholder="t('菜系/类型', 'Cuisine')"
            />
            <input
              v-model="restaurantDraft.deliveryFee"
              data-testid="food-delivery-custom-restaurant-fee"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              inputmode="decimal"
              :placeholder="t('配送费，例如 6.00', 'Delivery fee, e.g. 6.00')"
            />
            <input
              v-model="restaurantDraft.distanceKm"
              data-testid="food-delivery-custom-restaurant-distance"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              inputmode="decimal"
              :placeholder="t('距离 km', 'Distance km')"
            />
            <input
              v-model="restaurantDraft.deliveryEtaMinutes"
              data-testid="food-delivery-custom-restaurant-eta"
              class="rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              inputmode="numeric"
              :placeholder="t('ETA 分钟', 'ETA minutes')"
            />
            <input
              v-model="restaurantDraft.address"
              data-testid="food-delivery-custom-restaurant-address"
              class="col-span-2 rounded-xl border border-orange-100 px-3 py-2 text-xs outline-none"
              :placeholder="t('餐厅地址/取餐点', 'Restaurant address / pickup point')"
            />
            <ImageSourcePicker
              v-model:source-type="restaurantDraft.imageSourceType"
              v-model:image-url="restaurantDraft.imageUrl"
              v-model:gallery-asset-id="restaurantDraft.imageGalleryAssetId"
              :gallery-assets="galleryImageOptions"
              size="xs"
              test-id-prefix="food-delivery-custom-restaurant"
            />
          </div>
          <button
            data-testid="food-delivery-create-restaurant"
            class="mt-3 rounded-full bg-orange-500 px-4 py-2 text-xs font-bold text-white"
            @click="createCustomRestaurant"
          >
            {{ t('加入餐厅', 'Add restaurant') }}
          </button>
        </div>

        <div class="mt-3 rounded-2xl bg-amber-50/70 p-3">
          <p class="text-xs font-bold text-amber-900">{{ t('新增菜单项', 'New menu item') }}</p>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <select
              v-model="menuDraft.restaurantId"
              data-testid="food-delivery-custom-menu-restaurant"
              class="col-span-2 rounded-xl border border-amber-100 px-3 py-2 text-xs outline-none"
            >
              <option value="">{{ t('选择餐厅', 'Choose restaurant') }}</option>
              <option v-for="restaurant in foodDeliveryStore.restaurants" :key="restaurant.id" :value="restaurant.id">
                {{ restaurant.name }}
              </option>
            </select>
            <input
              v-model="menuDraft.title"
              data-testid="food-delivery-custom-menu-title"
              class="rounded-xl border border-amber-100 px-3 py-2 text-xs outline-none"
              :placeholder="t('餐品名称', 'Menu item name')"
            />
            <input
              v-model="menuDraft.price"
              data-testid="food-delivery-custom-menu-price"
              class="rounded-xl border border-amber-100 px-3 py-2 text-xs outline-none"
              inputmode="decimal"
              :placeholder="t('价格，例如 28.00', 'Price, e.g. 28.00')"
            />
            <select
              v-model="menuDraft.category"
              data-testid="food-delivery-custom-menu-category"
              class="col-span-2 rounded-xl border border-amber-100 px-3 py-2 text-xs outline-none"
            >
              <option v-for="category in categoryCards" :key="category.key" :value="category.key">
                {{ category.label }}
              </option>
            </select>
            <ImageSourcePicker
              v-model:source-type="menuDraft.imageSourceType"
              v-model:image-url="menuDraft.imageUrl"
              v-model:gallery-asset-id="menuDraft.imageGalleryAssetId"
              :gallery-assets="galleryImageOptions"
              size="xs"
              test-id-prefix="food-delivery-custom-menu"
            />
            <textarea
              v-model="menuDraft.desc"
              data-testid="food-delivery-custom-menu-desc"
              class="col-span-2 rounded-xl border border-amber-100 px-3 py-2 text-xs outline-none"
              rows="2"
              :placeholder="t('餐品描述', 'Menu item description')"
            ></textarea>
          </div>
          <button
            data-testid="food-delivery-create-menu"
            class="mt-3 rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white"
            @click="createCustomMenuItem"
          >
            {{ t('加入菜单', 'Add menu item') }}
          </button>
        </div>
        <p v-if="customFeedback" class="mt-2 text-[11px] font-semibold text-orange-600">
          {{ customFeedback }}
        </p>
      </section>

      </div>

      <section v-else class="space-y-4" data-testid="food-delivery-store-app">
        <article
          v-if="activeRestaurant"
          class="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-sm"
          data-testid="food-delivery-store-shell"
          :data-store-id="activeRestaurant.id"
          :data-store-tone="activeStoreVisual.tone"
        >
          <div class="bg-gradient-to-br p-4 text-gray-950" :class="activeStoreVisual.heroClass">
            <button
              class="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-gray-900 shadow-sm"
              data-testid="food-delivery-store-back"
              @click="closeRestaurantStore"
            >
              <i class="fas fa-chevron-left"></i>
              {{ t('返回平台', 'Back') }}
            </button>
            <div class="mt-5 flex items-end justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-white/90">
                  {{ activeRestaurant.cuisine || activeRestaurant.category }}
                </p>
                <h2 class="mt-1 truncate text-2xl font-black text-white">
                  {{ activeRestaurant.name }}
                </h2>
                <p class="mt-2 text-xs font-semibold text-white/90">
                  {{ activeRestaurant.rating.toFixed(1) }} ★ · {{ activeRestaurant.deliveryEtaMinutes }} min ·
                  {{ activeRestaurant.distanceKm }} km
                </p>
              </div>
              <div class="h-20 w-20 shrink-0 overflow-hidden rounded-3xl bg-white/90 shadow-sm">
                <img
                  v-if="foodImageUrl(activeRestaurant)"
                  :src="foodImageUrl(activeRestaurant)"
                  :alt="activeRestaurant.image?.alt || activeRestaurant.name"
                  class="h-full w-full object-cover"
                />
                <div v-else class="flex h-full w-full items-center justify-center text-2xl text-orange-500">
                  <i class="fas fa-store"></i>
                </div>
              </div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 p-3">
            <div class="rounded-2xl bg-gray-50 p-3 text-center">
              <p class="text-[10px] font-semibold text-gray-500">{{ t('配送费', 'Fee') }}</p>
              <p class="mt-1 text-xs font-black">{{ activeRestaurant.deliveryFee }} {{ activeRestaurant.currency }}</p>
            </div>
            <div class="rounded-2xl bg-gray-50 p-3 text-center">
              <p class="text-[10px] font-semibold text-gray-500">{{ t('来源', 'Source') }}</p>
              <p class="mt-1 truncate text-xs font-black">{{ foodImageSourceLabel(activeRestaurant) }}</p>
            </div>
            <div class="rounded-2xl p-3 text-center" :class="activeStoreVisual.badgeClass">
              <p class="text-[10px] font-semibold opacity-70">{{ t('店铺', 'Store') }}</p>
              <p class="mt-1 truncate text-xs font-black">{{ activeStoreVisual.tone }}</p>
            </div>
          </div>
        </article>

        <section v-if="activeRestaurant" class="rounded-3xl border border-orange-100 bg-white p-4" data-testid="food-delivery-menu-panel">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-bold">{{ t('本店菜单', 'Store menu') }}</p>
              <p class="mt-1 text-xs text-gray-500">{{ activeRestaurant.name }}</p>
            </div>
            <span class="rounded-full px-3 py-1 text-[11px] font-semibold" :class="activeStoreVisual.badgeClass">
              {{ activeMenuItems.length }} {{ t('项', 'item(s)') }}
            </span>
          </div>
          <div class="mt-3 space-y-2">
            <article
              v-for="item in activeMenuItems"
              :key="item.id"
              class="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-2"
              :data-testid="`food-delivery-menu-${item.id}`"
            >
              <div class="flex min-w-0 items-center gap-3">
                <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-orange-50">
                  <img
                    v-if="foodImageUrl(item)"
                    :src="foodImageUrl(item)"
                    :alt="item.image?.alt || item.title"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex h-full w-full items-center justify-center text-orange-500">
                    <i class="fas fa-bowl-food"></i>
                  </div>
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-bold">{{ item.title }}</p>
                  <p class="mt-1 text-[11px] text-gray-500">{{ item.price }} {{ item.currency }}</p>
                  <p class="mt-0.5 text-[10px] font-semibold text-orange-500">{{ foodImageSourceLabel(item) }}</p>
                </div>
              </div>
              <button
                class="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold"
                :class="activeStoreVisual.buttonClass"
                :data-testid="`food-delivery-add-${item.id}`"
                @click="addMenuItemToCart(item.id)"
              >
                {{ t('加入', 'Add') }}
              </button>
            </article>
          </div>
        </section>
      </section>

      <section class="rounded-3xl border border-amber-100 bg-white p-4" data-testid="food-delivery-cart-panel">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold">{{ t('外卖购物车', 'Food cart') }}</p>
            <p class="mt-1 text-xs text-gray-500">
              {{ foodDeliveryStore.cartQuantity }} {{ t('份餐品', 'item(s)') }}
            </p>
          </div>
          <span class="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
            {{ foodDeliveryStore.cartPrimaryTotal.amount }} {{ foodDeliveryStore.cartPrimaryTotal.currency }}
          </span>
        </div>
        <div v-if="foodDeliveryStore.cartLineItems.length > 0" class="mt-3 space-y-2">
          <article
            v-for="line in foodDeliveryStore.cartLineItems"
            :key="line.menuItemId"
            class="rounded-2xl bg-amber-50/70 p-3"
            :data-testid="`food-delivery-cart-${line.menuItemId}`"
          >
            <p class="text-xs font-bold">{{ line.menuItem.title }} × {{ line.quantity }}</p>
            <p class="mt-1 text-[11px] text-amber-700">{{ line.subtotal }} {{ line.currency }}</p>
          </article>
          <button
            class="w-full rounded-2xl bg-gray-950 px-4 py-3 text-sm font-bold text-white"
            data-testid="food-delivery-checkout"
            @click="checkoutFoodDelivery"
          >
            {{ t('生成外卖订单', 'Create food order') }}
          </button>
        </div>
        <p v-else class="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-700">
          {{ t('先从菜单里加入一份餐品，订单仍归外卖模块，位置与 ETA 后续由 Map 提供。', 'Add a menu item first. Orders stay in Food Delivery; Map can provide location and ETA later.') }}
        </p>
      </section>

      <section class="rounded-3xl border border-lime-100 bg-white p-4" data-testid="food-delivery-map-handoff">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold">{{ t('Map 配送上下文', 'Map delivery context') }}</p>
            <p class="mt-1 text-xs text-gray-500">
              {{ t('只读提供位置、距离和 ETA，不创建外卖订单。', 'Read-only location, distance, and ETA. It does not create food orders.') }}
            </p>
          </div>
          <span class="rounded-full bg-lime-50 px-3 py-1 text-[11px] font-semibold text-lime-700">
            {{ activeMapHandoff.etaMinutes }} min
          </span>
        </div>
        <div class="mt-3 grid gap-2 text-xs">
          <p
            class="rounded-2xl bg-lime-50/80 p-3 leading-5 text-lime-800"
            data-testid="food-delivery-map-handoff-route"
          >
            {{ activeMapHandoffRouteSummary }}
          </p>
          <div class="grid grid-cols-2 gap-2">
            <div class="rounded-2xl bg-gray-50 p-3" data-testid="food-delivery-map-handoff-address">
              <p class="font-semibold text-gray-900">{{ t('配送地址', 'Delivery address') }}</p>
              <p class="mt-1 line-clamp-2 text-[11px] leading-4 text-gray-500">
                {{ activeMapHandoff.deliveryAddress || t('未设置', 'Not set') }}
              </p>
            </div>
            <div class="rounded-2xl bg-gray-50 p-3" data-testid="food-delivery-map-handoff-distance">
              <p class="font-semibold text-gray-900">{{ t('预计距离', 'Distance') }}</p>
              <p class="mt-1 text-[11px] text-gray-500">
                {{ activeMapHandoff.distanceKm }} km · {{ activeMapHandoff.etaMinutes }} min
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-gray-100 bg-white p-4" data-testid="food-delivery-orders-panel">
        <p class="text-sm font-bold">{{ t('最近外卖订单', 'Recent food orders') }}</p>
        <p
          v-if="eventFeedback"
          class="mt-2 rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 text-[11px] font-semibold text-orange-700"
          data-testid="food-delivery-event-feedback"
        >
          {{ eventFeedback }}
        </p>
        <div v-if="recentOrders.length > 0" class="mt-3 space-y-2">
          <article
            v-for="order in recentOrders"
            :key="order.id"
            class="rounded-2xl p-3"
            :class="isHighlightedOrder(order.id) ? 'border-2 border-orange-300 bg-orange-50 shadow-sm' : 'bg-gray-50'"
            :data-testid="`food-delivery-order-${order.id}`"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-xs font-bold">{{ order.restaurantName }}</p>
                <p class="mt-1 text-[11px] text-gray-500">
                  {{ order.itemCount }} {{ t('份', 'item(s)') }} · {{ order.status }}
                </p>
              </div>
              <span class="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-gray-700">
                {{ order.totalCents / 100 }} {{ order.currency }}
              </span>
            </div>
            <button
              type="button"
              class="mt-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-orange-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50"
              :data-testid="`food-delivery-trigger-event-${order.id}`"
              @click="triggerOrderSurpriseEvent(order)"
            >
              {{ t('触发配送事件', 'Trigger delivery event') }}
            </button>
            <button
              v-if="order.status !== FOOD_DELIVERY_ORDER_STATUS.DELIVERED && order.status !== FOOD_DELIVERY_ORDER_STATUS.CANCELLED"
              type="button"
              class="ml-2 mt-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50"
              :data-testid="`food-delivery-mark-delivered-${order.id}`"
              @click="markFoodOrderDelivered(order.id)"
            >
              {{ t('标记已送达', 'Mark delivered') }}
            </button>
            <button
              type="button"
              class="ml-2 mt-2 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-50"
              :data-testid="`food-delivery-delete-order-${order.id}`"
              @click="removeFoodOrder(order.id)"
            >
              {{ t('删除', 'Delete') }}
            </button>
            <div v-if="orderEventRows(order).length > 0" class="mt-2 space-y-1.5">
              <article
                v-for="event in orderEventRows(order)"
                :key="event.id"
                class="rounded-xl border border-orange-100 bg-white px-2.5 py-2 text-[11px]"
                :data-testid="`food-delivery-order-event-${order.id}-${event.id}`"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="font-semibold text-orange-900">{{ event.typeLabel }}</p>
                    <p class="mt-1 line-clamp-2 leading-4 text-orange-700">{{ event.detail }}</p>
                  </div>
                  <span class="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 font-semibold text-orange-600">
                    {{ event.timeLabel }}
                  </span>
                </div>
                <DeliveryRouteContextCard
                  :context="event.mapHandoff"
                  :test-id="`food-delivery-event-map-context-${order.id}-${event.id}`"
                />
              </article>
            </div>
          </article>
        </div>
        <p v-else class="mt-3 rounded-2xl bg-gray-50 p-3 text-xs leading-5 text-gray-500">
          {{ t('还没有外卖订单。', 'No food orders yet.') }}
        </p>
      </section>

      <section class="rounded-3xl border border-emerald-100 bg-white p-4" data-testid="food-delivery-wallet-suggestions">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-bold">{{ t('Wallet 外卖消费建议', 'Wallet food expense suggestions') }}</p>
            <p class="mt-1 text-xs leading-5 text-gray-500">
              {{ t('只有已送达订单会出现在这里；点击后才会写入 Wallet。', 'Only delivered orders appear here; click to write them to Wallet.') }}
            </p>
          </div>
          <span class="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
            {{ walletExpenseSuggestions.length }}
          </span>
        </div>
        <div
          v-if="walletExpenseSuggestions.length === 0"
          class="mt-3 rounded-2xl bg-gray-50 p-3 text-center text-xs text-gray-500"
        >
          {{ t('暂无可写入 Wallet 的已送达外卖订单。', 'No delivered food orders are ready for Wallet yet.') }}
        </div>
        <div v-else class="mt-3 space-y-2">
          <article
            v-for="suggestion in walletExpenseSuggestions"
            :key="suggestion.orderId"
            class="rounded-2xl border border-emerald-50 bg-emerald-50/50 p-3"
            :data-testid="`food-delivery-wallet-suggestion-${suggestion.orderId}`"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold text-gray-900">{{ suggestion.restaurantName }}</p>
                <p class="mt-1 text-[11px] text-gray-500">
                  {{ suggestion.itemCount }} {{ t('份', 'item(s)') }} / {{ suggestion.amount }} {{ suggestion.currency }}
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    v-model="sharedMealTargets[suggestion.orderId]"
                    class="rounded-xl border border-emerald-100 bg-white px-2 py-1 text-[11px] text-gray-600 outline-none"
                    :data-testid="`food-delivery-shared-meal-contact-${suggestion.orderId}`"
                  >
                    <option value="">{{ t('No shared-meal target', 'No shared-meal target') }}</option>
                    <option
                      v-for="contact in sharedMealContactOptions"
                      :key="contact.id"
                      :value="String(contact.id)"
                    >
                      {{ contact.name }}
                    </option>
                  </select>
                  <span
                    v-if="suggestion.relationshipAvailable"
                    class="text-[11px] font-semibold"
                    :class="suggestion.relationshipImported ? 'text-emerald-600' : 'text-amber-600'"
                    :data-testid="`food-delivery-relationship-suggestion-${suggestion.orderId}`"
                  >
                    {{
                      suggestion.relationshipImported
                        ? t(`Shared-meal fact recorded for ${suggestion.relationshipTargetName}.`, `Shared-meal fact recorded for ${suggestion.relationshipTargetName}.`)
                        : t(`Shared-meal fact ready for ${suggestion.relationshipTargetName}.`, `Shared-meal fact ready for ${suggestion.relationshipTargetName}.`)
                    }}
                  </span>
                </div>
              </div>
              <button
                class="rounded-full px-3 py-1.5 text-[11px] font-semibold"
                :class="suggestion.imported ? 'bg-gray-100 text-gray-400' : 'bg-emerald-600 text-white'"
                :disabled="suggestion.imported"
                :data-testid="`food-delivery-transfer-wallet-${suggestion.orderId}`"
                @click="transferFoodSuggestionToWallet(suggestion)"
              >
                {{ suggestion.imported ? t('已记账', 'Recorded') : t('记入 Wallet', 'Record') }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="rounded-3xl border border-lime-100 bg-white p-4" data-testid="food-delivery-map-boundary">
        <p class="text-sm font-bold">{{ t('Map 对接边界', 'Map handoff boundary') }}</p>
        <p class="mt-2 text-xs leading-5 text-gray-500">
          {{
            t(
              '外卖可消费 Map 的餐厅位置、配送地址、附近筛选、骑手路线和 ETA；Map 不创建外卖订单，也不接管支付或商家状态。',
              'Food Delivery may consume restaurant location, delivery address, nearby filters, courier route, and ETA from Map; Map does not create food orders or own payment/merchant state.',
            )
          }}
        </p>
        <div class="mt-3 space-y-2">
          <article
            v-for="item in sourcePlan"
            :key="item.key"
            class="rounded-2xl bg-lime-50/70 p-3"
            :data-testid="`food-delivery-source-${item.key}`"
          >
            <p class="text-xs font-bold text-lime-800">{{ item.title }}</p>
            <p class="mt-1 text-[11px] leading-4 text-lime-700">{{ item.desc }}</p>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>
