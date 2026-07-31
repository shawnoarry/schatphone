<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import ImageSourcePicker from '../components/shared/ImageSourcePicker.vue'
import FoodDeliveryDashGrillApp from '../components/FoodDeliveryDashGrillApp.vue'
import FoodDeliveryJadeHearthApp from '../components/FoodDeliveryJadeHearthApp.vue'
import FoodDeliveryVerdantDayApp from '../components/FoodDeliveryVerdantDayApp.vue'
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
import {
  SHOP_ENTRY_BINDING_TARGET,
  resolveEntryPresentationMeta,
} from '../lib/app-entry-presentation'
import {
  isMiniAppEntryInstalled,
  normalizeAppStoreMiniAppPlacements,
} from '../lib/app-store-mini-app-placement'
import { resolveFoodShopDefaultTemplateId } from '../lib/food-shop-presentation'
import {
  getPeachCloudMenuSearchValues,
  resolvePeachCloudMenuItemCopy,
  resolvePeachCloudOrderItemTitle,
} from '../lib/food-delivery-peach-cloud-copy'

const route = useRoute()
const router = useRouter()
const { t, languageBase, systemLanguage } = useI18n()
const foodDeliveryStore = useFoodDeliveryStore()
const chatStore = useChatStore()
const bookStore = useBookStore()
const galleryStore = useGalleryStore()
const mapStore = useMapStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const simulationStore = useSimulationStore()
const systemStore = useSystemStore()
const walletStore = useWalletStore()
const activeCurrency = computed(() => walletStore.primaryCurrency || 'CNY')
const FOOD_DELIVERY_IMAGE_PREVIEW_SCOPE_ID = 'food-delivery-view'
const foodImagePreviewMap = reactive({})

const shopEntryIdForRestaurant = (restaurantId) => (restaurantId ? `shop_app_${restaurantId}` : '')
const appStoreMiniAppPlacements = computed(() =>
  normalizeAppStoreMiniAppPlacements(systemStore.settings.appearance?.appStoreMiniAppPlacements),
)
const restaurantMiniAppInstalled = (restaurant = {}) =>
  isMiniAppEntryInstalled(appStoreMiniAppPlacements.value, shopEntryIdForRestaurant(restaurant.id))
const resolveShopEntryPresentation = (restaurant = {}) => {
  const entryId = shopEntryIdForRestaurant(restaurant.id)
  return resolveEntryPresentationMeta(
    {
      id: entryId,
      icon: 'fas fa-store',
      accent: 'warm',
      entryKind: 'shop_app',
      shopAppEntry: true,
      sourceModule: SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY,
      bindingTarget: SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY,
      runtimeIdentity: restaurant.id,
    },
    systemStore.settings.appearance?.entryPresentationOverrides || {},
  )
}
const resolveStoreTemplateForRestaurant = (restaurant = {}) => {
  const presentation = resolveShopEntryPresentation(restaurant)
  return (
    (presentation?.hasTemplateOverride ? presentation.templateId : '') ||
    resolveFoodShopDefaultTemplateId(restaurant.id)
  )
}

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
  menuSection: 'signature',
  price: '',
  desc: '',
  imageSourceType: 'none',
  imageUrl: '',
  imageGalleryAssetId: '',
})
const sharedMealTargets = reactive({})
const selectedMenuItemId = ref('')
const menuDetailMode = ref('detail')
const menuDetailFeedback = ref('')
const menuDetailQuantity = ref(1)
const checkoutSheetOpen = ref(false)
const checkoutFeedback = ref('')
const shopCartReplacementOpen = ref(false)
const shopCartReplacementCancelRef = ref(null)
const pendingShopCartAddition = ref(null)
let shopCartReplacementTriggerElement = null
const platformSearchQuery = ref('')
const platformSearchInputRef = ref(null)
const platformMerchantListExpanded = ref(false)
const platformUtilitySheetKey = ref('')
const platformSavedMerchantIds = ref([])
const platformBenefitClaimed = ref(false)
const platformCampaignPrizeId = ref('')
const platformBannerRailRef = ref(null)
const platformActiveBannerIndex = ref(0)
const platformBannerAutoplayPaused = ref(false)
const platformAddressMenuOpen = ref(false)
const selectedPlatformDeliveryAddress = ref('')
const platformCartFeedback = ref('')
const platformCheckoutNote = ref('')
const platformCheckoutPaymentMethod = ref('app_pay')
const platformCheckoutFeedback = ref('')
const platformOrderCopyFeedback = ref('')
const platformPageKey = computed(() => {
  const key = typeof route.query.platformView === 'string' ? route.query.platformView : ''
  return ['campaign', 'search', 'saved', 'profile', 'checkout', 'orders', 'order'].includes(key)
    ? key
    : 'home'
})
const platformCampaignKey = computed(() =>
  typeof route.query.platformCampaign === 'string' ? route.query.platformCampaign.trim() : '',
)
const platformOrderId = computed(() =>
  typeof route.query.platformOrderId === 'string' ? route.query.platformOrderId.trim() : '',
)
const PLATFORM_BANNER_AUTOPLAY_MS = 5200
const PLATFORM_BANNER_INTERACTION_PAUSE_MS = 9000
let platformBannerAutoplayTimerId = null
let platformBannerInteractionPauseUntil = 0
let platformBannerProgrammaticScrollUntil = 0
const activeStoreMenuSectionKey = ref('all')
const storeNavigationFeedback = ref('')
const peachCloudSearchQuery = ref('')
const peachCloudSearchInputRef = ref(null)
const uiAssetUrl = (path) => `${import.meta.env.BASE_URL || '/'}images/ui-assets/${path}`
const foodDeliveryUiAsset = (path) => uiAssetUrl(`apps/food-delivery/${path}`)
const platformMissingAssetPlaceholderUrl = foodDeliveryUiAsset(
  'platform/diagnostics/missing-asset-placeholder.svg',
)
const peachCloudBrandImageUrl = foodDeliveryUiAsset('peach-cloud/brand/peach-cloud-mark-01.svg')
const peachCloudPromotionImageUrl = foodDeliveryUiAsset(
  'peach-cloud/promotions/peach-cloud-golden-pairing-01.png',
)
const peachCloudWeeklyDropImageUrl = foodDeliveryUiAsset(
  'peach-cloud/promotions/peach-cloud-weekly-drop-01.png',
)
const PEACH_CLOUD_THEME_STYLE = Object.freeze({
  '--peach-cloud-iron': '#444545',
  '--peach-cloud-ink': '#2b303a',
  '--peach-cloud-canvas': '#f2fbe0',
  '--peach-cloud-accent': '#fd6c93',
  '--peach-cloud-mist': '#fda1b8',
})
const PEACH_CLOUD_MENU_SHORTCUTS = Object.freeze([
  {
    key: 'fruit_sparkle',
    labelZh: '鲜果特饮',
    labelEn: 'Fresh Fruit',
    shortLabelZh: '鲜果',
    shortLabelEn: 'Fruit',
    asset: 'peach-cloud-fresh-fruit.svg',
    background: '#ffe4ec',
    border: '#fd8cab',
  },
  {
    key: 'frozen_clouds',
    labelZh: '冰雪甜品',
    labelEn: 'Frozen',
    shortLabelZh: '冰甜',
    shortLabelEn: 'Frozen',
    asset: 'peach-cloud-frozen-treat.svg',
    background: '#e6f5ff',
    border: '#82c8e8',
  },
  {
    key: 'cloud_tea',
    labelZh: '云顶茶咖',
    labelEn: 'Tea & Coffee',
    shortLabelZh: '茶咖',
    shortLabelEn: 'Tea',
    asset: 'peach-cloud-tea-coffee.svg',
    background: '#f0eaff',
    border: '#aa91de',
  },
  {
    key: 'oven_sweets',
    labelZh: '暖炉烘焙',
    labelEn: 'Bakes',
    shortLabelZh: '烘焙',
    shortLabelEn: 'Bakes',
    asset: 'peach-cloud-warm-bakes.svg',
    background: '#fff0dc',
    border: '#e9ad67',
  },
  {
    key: 'seasonal_drop',
    labelZh: '季节限定',
    labelEn: 'Seasonal',
    shortLabelZh: '限定',
    shortLabelEn: 'Seasonal',
    asset: 'peach-cloud-seasonal-pick.svg',
    background: '#e8f4df',
    border: '#91bd77',
  },
])
const displayMoney = (amount = '0.00', currency = '') =>
  `${amount} ${currency || activeCurrency.value}`
const platformRiderImageUrl = foodDeliveryUiAsset(
  'platform/decorations/mascot/delivery-rider-mascot-01.png',
)
const selectedPlatformMerchantId = ref('')
const platformMerchantSheetOpen = ref(false)
const menuItemEditDraft = reactive({
  title: '',
  desc: '',
  ingredients: '',
  imageSourceType: 'none',
  imageUrl: '',
  imageGalleryAssetId: '',
})

const worldAppUxContext = computed(() =>
  resolveWorldAppUxContext({
    systemStore,
    moduleKey: 'food_delivery',
    routeQuery: route.query,
    expectedArchetypes: ['dispatch'],
    requireUiThemePackage: true,
  }),
)
const worldAppRouteQuery = computed(() => worldAppUxContext.value?.routeQuery || {})
const defaultFoodDeliveryCategoryKey = computed(() =>
  worldAppUxContext.value ? 'nearby' : 'restaurants',
)
const activeCategoryKey = computed(() =>
  typeof route.query.category === 'string'
    ? route.query.category
    : defaultFoodDeliveryCategoryKey.value,
)
const activeCategory = computed(() => findFoodDeliveryCategory(activeCategoryKey.value))
const foodDeliveryTitle = computed(
  () => worldAppUxContext.value?.bindingTitle || t('外卖', 'Food Delivery'),
)
const categoryCards = computed(() =>
  FOOD_DELIVERY_CATEGORY_ENTRIES.map((entry) => ({
    ...entry,
    label: languageBase.value === 'zh' ? entry.zh : entry.en,
    desc: languageBase.value === 'zh' ? entry.descZh : entry.descEn,
    active: entry.key === activeCategory.value?.key,
  })),
)

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
  const installedRestaurants = restaurants.filter((restaurant) =>
    restaurantMiniAppInstalled(restaurant),
  )
  if (restaurants.length > 0) return installedRestaurants
  return foodDeliveryStore.restaurants
    .filter((restaurant) => restaurantMiniAppInstalled(restaurant))
    .slice(0, 4)
})
const platformRestaurantCount = computed(() => foodDeliveryStore.restaurantCount)
const platformMenuItemCount = computed(() => foodDeliveryStore.menuItemCount)
const FOOD_PLATFORM_CATEGORY_VISUALS = Object.freeze({
  all: {
    icon: 'fas fa-magnifying-glass',
    className: 'from-[#e6fffd] to-white text-[#079892]',
  },
  restaurants: {
    icon: 'fas fa-utensils',
    className: 'from-orange-50 to-white text-orange-600',
  },
  nearby: {
    icon: 'fas fa-location-dot',
    className: 'from-cyan-50 to-white text-cyan-600',
  },
  fast_food: {
    icon: 'fas fa-burger',
    className: 'from-amber-50 to-white text-amber-600',
  },
  chicken: {
    icon: 'fas fa-drumstick-bite',
    className: 'from-yellow-50 to-white text-yellow-700',
  },
  pizza: {
    icon: 'fas fa-pizza-slice',
    className: 'from-red-50 to-white text-red-500',
  },
  cafe: {
    icon: 'fas fa-mug-hot',
    className: 'from-emerald-50 to-white text-emerald-600',
  },
  dessert: {
    icon: 'fas fa-ice-cream',
    className: 'from-rose-50 to-white text-rose-500',
  },
  grocery_delivery: {
    icon: 'fas fa-basket-shopping',
    className: 'from-lime-50 to-white text-lime-600',
  },
  noodles: {
    icon: 'fas fa-bowl-food',
    className: 'from-red-50 to-white text-red-600',
  },
  sushi: {
    icon: 'fas fa-fish',
    className: 'from-sky-50 to-white text-sky-600',
  },
})
const FOOD_PLATFORM_CATEGORY_DEFINITIONS = Object.freeze([
  {
    key: 'all',
    categoryKey: 'nearby',
    labelZh: '全部',
    labelEn: 'All',
    requiredAsset: 'platform/categories/icons/category-all-01.png',
  },
  {
    key: 'restaurants',
    categoryKey: 'restaurants',
    labelZh: '正餐',
    labelEn: 'Restaurants',
    requiredAsset: 'platform/categories/icons/category-meal-01.png',
  },
  {
    key: 'fast_food',
    categoryKey: 'fast_food',
    labelZh: '快餐',
    labelEn: 'Fast',
    requiredAsset: 'platform/categories/icons/category-fast-food-01.png',
  },
  {
    key: 'chicken',
    categoryKey: 'fast_food',
    labelZh: '炸鸡',
    labelEn: 'Chicken',
    requiredAsset: 'platform/categories/icons/category-fried-chicken-01.png',
  },
  {
    key: 'pizza',
    categoryKey: 'fast_food',
    labelZh: '披萨',
    labelEn: 'Pizza',
    requiredAsset: 'platform/categories/icons/category-pizza-01.png',
  },
  {
    key: 'cafe',
    categoryKey: 'cafe',
    labelZh: '咖啡轻食',
    labelEn: 'Cafe',
    requiredAsset: 'platform/categories/icons/category-cafe-01.png',
  },
  {
    key: 'dessert',
    categoryKey: 'dessert',
    labelZh: '甜品',
    labelEn: 'Dessert',
    requiredAsset: 'platform/categories/icons/category-dessert-01.png',
  },
  {
    key: 'grocery_delivery',
    categoryKey: 'grocery_delivery',
    labelZh: '生鲜',
    labelEn: 'Grocery',
    requiredAsset: 'platform/categories/icons/category-grocery-01.png',
  },
  {
    key: 'noodles',
    categoryKey: 'restaurants',
    labelZh: '面食',
    labelEn: 'Noodles',
    requiredAsset: 'platform/categories/icons/category-noodles-01.png',
  },
  {
    key: 'sushi',
    categoryKey: 'restaurants',
    labelZh: '寿司',
    labelEn: 'Sushi',
    requiredAsset: 'platform/categories/icons/category-sushi-01.png',
  },
])
const FOOD_PLATFORM_CATEGORY_KEYS = new Set(
  FOOD_PLATFORM_CATEGORY_DEFINITIONS.map((category) => category.key),
)
const activePlatformFilterKey = computed(() => {
  const queryKey =
    typeof route.query.platformFilter === 'string' ? route.query.platformFilter.trim() : ''
  if (FOOD_PLATFORM_CATEGORY_KEYS.has(queryKey)) return queryKey
  return activeCategory.value?.key === 'nearby' ? 'all' : activeCategory.value?.key || 'all'
})
const platformActiveCategoryLabel = computed(() => {
  const category = FOOD_PLATFORM_CATEGORY_DEFINITIONS.find(
    (entry) => entry.key === activePlatformFilterKey.value,
  )
  if (!category) return activeCategoryLabel.value
  return languageBase.value === 'zh' ? category.labelZh : category.labelEn
})
const FOOD_PLATFORM_AD_BANNERS = Object.freeze([
  {
    id: 'club_free_delivery',
    kind: 'membership',
    eyebrowZh: '外卖平台会员',
    eyebrowEn: 'Platform club',
    titleZh: '免配送权益，本周可领',
    titleEn: 'Free delivery perks this week',
    descZh: '常点小店、收藏小店和平台推荐会优先被发现。',
    descEn: 'Favorite, saved, and recommended platform shops stay easy to reach.',
    ctaZh: '领取权益',
    ctaEn: 'Claim perks',
    icon: 'fas fa-ticket',
    imageUrl: foodDeliveryUiAsset('platform/banners/platform-banner-member-delivery-01.png'),
    className: 'from-white/95 via-white/75 to-white/10 text-gray-950',
    chipClass: 'bg-white/85 text-[#078d87]',
    pageDescZh: '本周平台会员可领取一次免配送权益，适用于下方标注免配送的小店。',
    pageDescEn: 'Claim one free-delivery perk this week for the eligible platform shops below.',
    primaryZh: '领取本周权益',
    primaryEn: "Claim this week's perk",
    claimedPrimaryZh: '挑一家免配送小店',
    claimedPrimaryEn: 'Choose an eligible shop',
    targetCategory: 'nearby',
    merchantIds: ['platform_hanwoo_gukbap', 'platform_chicken_crisp', 'platform_green_basket'],
    highlights: [
      {
        icon: 'fas fa-truck-fast',
        titleZh: '配送费减免',
        titleEn: 'Free delivery',
        descZh: '符合条件的小店自动使用',
        descEn: 'Applied at eligible shops',
      },
      {
        icon: 'fas fa-calendar-check',
        titleZh: '本周有效',
        titleEn: 'Valid this week',
        descZh: '领取后即可开始选餐',
        descEn: 'Ready after claiming',
      },
      {
        icon: 'fas fa-heart',
        titleZh: '常点优先',
        titleEn: 'Favorites first',
        descZh: '收藏小店更容易找到',
        descEn: 'Saved shops stay close',
      },
    ],
  },
  {
    id: 'weekend_food_map',
    kind: 'lottery',
    eyebrowZh: '周末精选',
    eyebrowEn: 'Weekend picks',
    titleZh: '周末好运，开袋有礼',
    titleEn: 'Unpack a little weekend luck',
    descZh: '下单前先抽一次，把今天的惊喜装进外卖袋。',
    descEn: "Draw once before ordering and add a surprise to today's delivery bag.",
    ctaZh: '去抽福利',
    ctaEn: 'Draw a perk',
    icon: 'fas fa-gift',
    imageUrl: foodDeliveryUiAsset('platform/banners/platform-banner-weekend-food-01.png'),
    className: 'from-white/90 via-white/60 to-white/5 text-gray-950',
    chipClass: 'bg-white/85 text-orange-700',
    posterImageUrl: foodDeliveryUiAsset('platform/campaigns/weekend-lucky-draw-poster-01.png'),
    posterRequiredAsset: 'platform/campaigns/weekend-lucky-draw-poster-01.png',
    posterEyebrowZh: '周末好运放送中',
    posterEyebrowEn: 'Weekend luck is live',
    pageDescZh: '每次活动可抽一次站内周末福利。抽奖结果只用于这次平台体验，不会改动钱包或资产。',
    pageDescEn:
      'Draw one in-app weekend perk per event. Results stay inside this platform experience and do not affect Wallet or Assets.',
    primaryZh: '抽一次周末福利',
    primaryEn: 'Draw a weekend perk',
    drawnPrimaryZh: '本次福利已揭晓',
    drawnPrimaryEn: 'Your perk is revealed',
    targetCategory: 'nearby',
    scheduleZh: '7 月周末限定 · 每次活动 1 次机会',
    scheduleEn: 'July weekends · One draw per event',
    benefits: [
      {
        icon: 'fas fa-ticket',
        titleZh: '满 49 减 8',
        titleEn: '8 off 49',
        descZh: '适合一人份正餐',
        descEn: 'Made for a solo meal',
      },
      {
        icon: 'fas fa-motorcycle',
        titleZh: '0 元配送',
        titleEn: 'Free delivery',
        descZh: '本次平台订单可用',
        descEn: 'For this platform order',
      },
      {
        icon: 'fas fa-ice-cream',
        titleZh: '甜品加赠',
        titleEn: 'Dessert treat',
        descZh: '为周末加一份甜',
        descEn: 'A sweet weekend extra',
      },
    ],
    prizes: [
      {
        id: 'discount_8',
        icon: 'fas fa-ticket',
        titleZh: '满 49 减 8',
        titleEn: '8 off 49',
        descZh: '今天的周末餐更轻松一点',
        descEn: "A lighter total for today's weekend meal",
      },
      {
        id: 'free_delivery',
        icon: 'fas fa-motorcycle',
        titleZh: '0 元配送券',
        titleEn: 'Free delivery',
        descZh: '这一单把配送费留给平台',
        descEn: 'Delivery is on the platform this time',
      },
      {
        id: 'dessert_treat',
        icon: 'fas fa-ice-cream',
        titleZh: '甜品加赠签',
        titleEn: 'Dessert treat',
        descZh: '为本次外卖添一份随机甜品',
        descEn: 'Add one surprise dessert to this delivery',
      },
    ],
  },
  {
    id: 'quick_lunch',
    kind: 'menu',
    eyebrowZh: '午餐快选',
    eyebrowEn: 'Lunch shortcut',
    titleZh: '少刷一点，也能点得顺手',
    titleEn: 'Less scrolling, easier ordering',
    descZh: '正餐、快餐、咖啡轻食保留在首页第一层。',
    descEn: 'Meals, fast food, and cafe bites stay one tap away.',
    ctaZh: '看推荐',
    ctaEn: 'See picks',
    icon: 'fas fa-bolt',
    imageUrl: foodDeliveryUiAsset('platform/banners/platform-banner-lunch-express-01.png'),
    className: 'from-white/95 via-white/60 to-white/5 text-gray-950',
    chipClass: 'bg-white/85 text-sky-700',
    pageDescZh: '筛出适合工作日午餐的轻食、咖啡和快手主食，减少来回翻找。',
    pageDescEn: 'A shorter workday lunch list with light meals, coffee, and quick mains.',
    primaryZh: '进入午餐快捷分类',
    primaryEn: 'Open quick lunch picks',
    targetCategory: 'fast_food',
    merchantIds: [
      'platform_salad_day',
      'platform_golden_chicken',
      'platform_nori_table',
      'platform_hanwoo_gukbap',
    ],
    editorZh: '平台午餐编辑部 · 本周 4 选',
    editorEn: 'Platform lunch desk · Four picks this week',
    menuPicks: [
      {
        merchantId: 'platform_salad_day',
        itemIndex: 0,
        tagZh: '清爽工作餐',
        tagEn: 'Fresh desk lunch',
      },
      {
        merchantId: 'platform_golden_chicken',
        itemIndex: 0,
        tagZh: '早餐也能当午餐',
        tagEn: 'Brunch-ready',
      },
      {
        merchantId: 'platform_nori_table',
        itemIndex: 1,
        tagZh: '热乎快手',
        tagEn: 'Hot and quick',
      },
      {
        merchantId: 'platform_hanwoo_gukbap',
        itemIndex: 0,
        tagZh: '稳妥正餐',
        tagEn: 'Hearty classic',
      },
    ],
    highlights: [
      {
        icon: 'fas fa-bolt',
        titleZh: '选择更快',
        titleEn: 'Faster choice',
        descZh: '精简到午餐常点类型',
        descEn: 'Focused lunch categories',
      },
      {
        icon: 'fas fa-leaf',
        titleZh: '轻重都有',
        titleEn: 'Light or hearty',
        descZh: '轻食与热饭同页可选',
        descEn: 'Light bites and hot meals',
      },
      {
        icon: 'fas fa-mug-hot',
        titleZh: '咖啡顺带',
        titleEn: 'Coffee included',
        descZh: '午后饮品不用再搜索',
        descEn: 'Drinks stay within reach',
      },
    ],
  },
])
const FOOD_PLATFORM_MERCHANTS = Object.freeze([
  {
    id: 'platform_hanwoo_gukbap',
    assetKey: 'hanwoo-gukbap',
    name: '逆站洞韩牛汤饭',
    category: 'restaurants',
    cuisine: '韩式',
    rating: 4.8,
    reviewCount: 1240,
    deliveryEtaMinutes: 38,
    deliveryFee: '0.00',
    currency: 'CNY',
    minimumOrder: '10,000원',
    distanceKm: 1.4,
    badge: '外卖会员',
    imageUrl: foodDeliveryUiAsset('platform/merchants/merchant-korean-beef-soup-02.png'),
    imageAlt: 'Korean beef soup bowl',
    icon: 'fas fa-bowl-rice',
    fallbackClass: 'from-[#fff2cf] via-[#f6c34d] to-[#e66d4d] text-[#78350f]',
    desc: '逆站洞老派汤饭铺，主打慢熬牛骨汤、韩牛与一桌热乎小菜。',
    menu: [
      {
        title: '逆站洞一号韩牛汤饭',
        price: '58.00',
        desc: '24 小时牛骨汤、薄切韩牛、白饭与三样小菜',
      },
      {
        title: '泡菜红锅·双人份',
        price: '64.00',
        desc: '熟成泡菜、牛肉片与豆腐，酸辣浓郁适合分享',
      },
      { title: '清晨雪浓汤定食', price: '46.00', desc: '清亮牛骨汤、手撕牛肉、米饭与萝卜泡菜' },
      { title: '逆站洞醒酒辣汤', price: '52.00', desc: '牛肉丝、豆芽和蕨菜，辣香汤底醒胃不发腻' },
      { title: '海风泡菜煎饼', price: '32.00', desc: '虾仁与鱿鱼铺满薄脆饼边，配店制蘸酱' },
    ],
  },
  {
    id: 'platform_sushi_hana',
    assetKey: 'sushi-hana',
    name: '寿司花',
    category: 'restaurants',
    cuisine: '日料',
    rating: 4.7,
    reviewCount: 982,
    deliveryEtaMinutes: 35,
    deliveryFee: '0.00',
    currency: 'CNY',
    minimumOrder: '15,000원',
    distanceKm: 1.9,
    badge: '外卖会员',
    imageUrl: foodDeliveryUiAsset('platform/merchants/merchant-sushi-02.png'),
    imageAlt: 'Sushi platter',
    icon: 'fas fa-fish',
    fallbackClass: 'from-[#eaf7ff] via-[#b6e4f8] to-[#f7b7c5] text-[#0f5f72]',
    desc: '花见系手握、散寿司与夜间卷物，口味清楚、份量轻盈。',
    menu: [
      { title: '花见十二贯', price: '72.00', desc: '三文鱼、甜虾、玉子与当日白身鱼的招牌十二贯' },
      { title: '小町炸猪排便当', price: '46.00', desc: '厚切猪排、山椒米饭、卷心菜与柚香酱' },
      { title: '海风亲子散寿司', price: '58.00', desc: '三文鱼、鲑鱼籽、玉子和紫苏铺在温醋饭上' },
      { title: '暮色炙鳗牛油果卷', price: '49.00', desc: '炙烤鳗鱼、牛油果与黄瓜，刷寿司花照烧汁' },
      { title: '赤味噌蛤蜊汤', price: '18.00', desc: '现煮蛤蜊、海带芽与豆腐，收尾温润' },
    ],
  },
  {
    id: 'platform_hwadeok_pizza',
    assetKey: 'hwadeok-pizza',
    name: '花德披萨味店',
    category: 'fast_food',
    cuisine: '披萨',
    rating: 4.6,
    reviewCount: 1476,
    deliveryEtaMinutes: 30,
    deliveryFee: '3.00',
    currency: 'CNY',
    minimumOrder: '13,000원',
    distanceKm: 2.5,
    badge: '热卖',
    imageUrl: foodDeliveryUiAsset('platform/merchants/merchant-pizza-02.png'),
    imageAlt: 'Pizza',
    icon: 'fas fa-pizza-slice',
    fallbackClass: 'from-[#fff1e6] via-[#ffb86b] to-[#f24f35] text-[#7f1d1d]',
    desc: '花德炉边薄底披萨与分享小食，饼边焦香、酱料大胆。',
    menu: [
      {
        title: '花德蜂蜜双芝士',
        price: '68.00',
        desc: '马苏里拉与蓝纹双芝士，出炉后淋蜂蜜和坚果碎',
      },
      { title: '周五半半鸡翅篮', price: '42.00', desc: '海盐原味与韩式甜辣各半，配酸黄瓜' },
      { title: '炉边番茄罗勒', price: '62.00', desc: '店制番茄酱、新鲜罗勒与焦边薄底' },
      { title: '红椒烟熏辣肠', price: '72.00', desc: '意式辣肠、烤彩椒与烟熏芝士，微辣有层次' },
      { title: '花德玉米焗薯', price: '28.00', desc: '烤薯角、甜玉米、帕玛森与热芝士酱' },
    ],
  },
  {
    id: 'platform_salad_day',
    assetKey: 'salad-day',
    name: '沙拉日记',
    category: 'cafe',
    cuisine: '轻食',
    rating: 4.5,
    reviewCount: 641,
    deliveryEtaMinutes: 24,
    deliveryFee: '2.00',
    currency: 'CNY',
    minimumOrder: '9,000원',
    distanceKm: 0.9,
    badge: '轻食',
    imageUrl: foodDeliveryUiAsset('platform/merchants/merchant-salad-bowl-02.png'),
    imageAlt: 'Fresh salad bowl',
    icon: 'fas fa-seedling',
    fallbackClass: 'from-[#ecfff4] via-[#9ae6b4] to-[#34c2a1] text-[#064e3b]',
    desc: '把每日状态写进一只碗里，主打谷物、蔬菜与不甜腻饮品。',
    menu: [
      {
        title: '日记 No.1 牛油果鸡胸碗',
        price: '39.00',
        desc: '香草鸡胸、牛油果、藜麦和柚香油醋汁',
      },
      { title: '今日莓果酸奶罐', price: '24.00', desc: '无糖酸奶、当日莓果与海盐坚果麦片' },
      { title: '海岸线三文鱼谷物碗', price: '46.00', desc: '烟熏三文鱼、糙米、羽衣甘蓝与溏心蛋' },
      { title: '烤南瓜暖汤午餐组', price: '29.00', desc: '烤南瓜浓汤、全麦小餐包与一份嫩叶菜' },
      { title: '青柠冰摇气泡美式', price: '18.00', desc: '双份浓缩、鲜青柠与无糖气泡，清爽收口' },
    ],
  },
  {
    id: 'platform_chicken_crisp',
    assetKey: 'chicken-crisp',
    name: '脆脆炸鸡屋',
    category: 'fast_food',
    cuisine: '炸鸡',
    rating: 4.8,
    reviewCount: 2130,
    deliveryEtaMinutes: 28,
    deliveryFee: '0.00',
    currency: 'CNY',
    minimumOrder: '12,000원',
    distanceKm: 1.7,
    badge: '免配送',
    imageUrl: foodDeliveryUiAsset('platform/merchants/merchant-fried-chicken-02.png'),
    imageAlt: 'Fried chicken',
    icon: 'fas fa-drumstick-bite',
    fallbackClass: 'from-[#fff7d6] via-[#f6bf55] to-[#d95f35] text-[#78350f]',
    desc: '以脆度和酱料编号的街区炸鸡店，适合夜宵与多人分享。',
    menu: [
      {
        title: '脆脆 50/50 半半鸡',
        price: '66.00',
        desc: '海盐原味与 2 号甜辣酱各半，附双份腌萝卜',
      },
      { title: '金瀑芝士厚切薯', price: '26.00', desc: '现炸厚薯条淋切达芝士与香葱碎' },
      { title: '黑蒜无骨鸡块', price: '48.00', desc: '去骨鸡腿裹黑蒜酱，咸甜焦香不黏腻' },
      { title: '辣年糕串串', price: '22.00', desc: '米年糕、鱼饼和脆肠刷 3 号甜辣酱' },
      { title: '蜂蜜黄油脆薯角', price: '24.00', desc: '双炸薯角、蜂蜜黄油粉与冷乳酪蘸酱' },
    ],
  },
  {
    id: 'platform_berry_morning',
    assetKey: 'berry-morning',
    name: '莓果晨光',
    category: 'dessert',
    cuisine: '酸奶甜品',
    rating: 4.7,
    reviewCount: 526,
    deliveryEtaMinutes: 22,
    deliveryFee: '2.00',
    currency: 'CNY',
    minimumOrder: '20.00',
    distanceKm: 0.8,
    badge: '清爽甜品',
    visualType: 'logo',
    logoMark: '莓果\n晨光',
    imageUrl: foodDeliveryUiAsset('platform/merchants/logos/merchant-logo-berry-morning-01.png'),
    requiredAsset: 'platform/merchants/logos/merchant-logo-berry-morning-01.png',
    imageAlt: 'Berry Morning brand mark',
    icon: 'fas fa-ice-cream',
    fallbackClass: 'from-[#fff1f5] via-[#fecdd3] to-[#a7f3d0] text-[#9f1239]',
    desc: '莓果晨光的甜品像清晨一样轻，酸奶、鲜果与烘焙各有自己的名字。',
    menu: [
      { title: '晨光莓莓云朵杯', price: '28.00', desc: '厚酸奶叠草莓、蓝莓与烤燕麦，酸甜轻盈' },
      { title: '绿野牛油果鲜果碗', price: '32.00', desc: '牛油果、时令鲜果与蜂蜜坚果脆' },
      { title: '开心果晨曦巴斯克', price: '36.00', desc: '半熟巴斯克、开心果奶油与一笔莓果酱' },
      { title: '南岛芒果椰露', price: '26.00', desc: '芒果、椰奶、西米与清香柚子粒' },
      { title: '草莓初光可颂', price: '30.00', desc: '黄油可颂夹鲜草莓与低糖香草奶油' },
    ],
  },
  {
    id: 'platform_green_basket',
    assetKey: 'green-basket',
    name: '青禾鲜食补给站',
    category: 'grocery_delivery',
    cuisine: '生鲜便利',
    rating: 4.8,
    reviewCount: 453,
    deliveryEtaMinutes: 18,
    deliveryFee: '0.00',
    currency: 'CNY',
    minimumOrder: '25.00',
    distanceKm: 0.6,
    badge: '18 分钟达',
    visualType: 'logo',
    logoMark: '青禾',
    imageUrl: foodDeliveryUiAsset('platform/merchants/logos/merchant-logo-green-basket-01.png'),
    requiredAsset: 'platform/merchants/logos/merchant-logo-green-basket-01.png',
    imageAlt: 'Green Basket brand mark',
    icon: 'fas fa-basket-shopping',
    fallbackClass: 'from-[#f7fee7] via-[#bef264] to-[#5eead4] text-[#365314]',
    desc: '社区即时补给站，按时间和生活场景打包蔬果、早餐与厨房救急品。',
    menu: [
      { title: '青禾今日蔬果箱', price: '35.00', desc: '按成熟度搭配时令水果、叶菜与两份即食沙拉' },
      { title: '06:30 早餐补给', price: '29.00', desc: '鲜奶、鸡蛋、吐司和酸奶，适合两人早餐' },
      { title: '绿能一日轻食箱', price: '42.00', desc: '即食鸡胸、谷物碗、冷压果汁与坚果包' },
      { title: '深夜灯火补给包', price: '34.00', desc: '饭团、关东煮、脆片与两瓶无糖饮料' },
      { title: '厨房 SOS 调味组', price: '26.00', desc: '海盐、黑胡椒、小瓶食用油与三种基础酱料' },
    ],
  },
  {
    id: 'platform_neighborhood_soup',
    assetKey: 'camellia-noodles',
    name: '山茶牛肉面馆',
    category: 'restaurants',
    cuisine: '手工面食',
    rating: 4.9,
    reviewCount: 764,
    deliveryEtaMinutes: 26,
    deliveryFee: '0.00',
    currency: 'CNY',
    minimumOrder: '30.00',
    distanceKm: 1.1,
    badge: '面馆新客',
    imageUrl: '',
    requiredAsset: 'platform/merchants/merchant-noodle-house-01.png',
    imageAlt: 'Hand-pulled beef noodles',
    icon: 'fas fa-bowl-food',
    fallbackClass: 'from-[#fff7ed] via-[#fdba74] to-[#dc2626] text-[#7c2d12]',
    desc: '山茶面馆按汤、面和辣度命名，一碗主食也保留手工面的脾气。',
    menu: [
      { title: '山茶一号红烧宽面', price: '42.00', desc: '手擀宽面、慢炖牛腩、青菜与山茶辣油' },
      { title: '桂香番茄鸡蛋拌面', price: '31.00', desc: '慢炒番茄蛋酱、细面、脆黄瓜与一滴桂花醋' },
      { title: '老街豌杂细面', price: '35.00', desc: '软糯豌豆、肉臊、芽菜与红油细面' },
      { title: '山茶酸汤肥牛米线', price: '44.00', desc: '肥牛、金针菇与米线浸在番茄酸汤中' },
      { title: '秘制红油抄手', price: '28.00', desc: '十二只鲜肉抄手，拌花生碎与店制红油' },
    ],
  },
  {
    id: 'platform_golden_chicken',
    assetKey: 'morning-bagel',
    name: '早安贝果咖啡',
    category: 'cafe',
    cuisine: '早餐咖啡',
    rating: 4.6,
    reviewCount: 1188,
    deliveryEtaMinutes: 25,
    deliveryFee: '1.00',
    currency: 'CNY',
    minimumOrder: '28.00',
    distanceKm: 1.3,
    badge: '早餐组合',
    visualType: 'logo',
    logoMark: 'GOOD\nAM',
    imageUrl: foodDeliveryUiAsset('platform/merchants/logos/merchant-logo-morning-bagel-01.png'),
    requiredAsset: 'platform/merchants/logos/merchant-logo-morning-bagel-01.png',
    imageAlt: 'Good Morning Bagel brand mark',
    icon: 'fas fa-mug-hot',
    fallbackClass: 'from-[#eff6ff] via-[#7dd3fc] to-[#fbbf24] text-[#0c4a6e]',
    desc: 'GOOD AM 系列贝果与咖啡，以一天中的光线和时刻为菜单命名。',
    menu: [
      {
        title: 'GOOD AM 烟熏鸡贝果',
        price: '33.00',
        desc: '现烤芝麻贝果、烟熏鸡肉、奶油奶酪与芝麻菜',
      },
      { title: '晨盐焦糖拿铁', price: '24.00', desc: '双份浓缩、鲜奶与自制海盐焦糖' },
      { title: '绿意煎蛋贝果', price: '35.00', desc: '牛油果、流心煎蛋、芝麻菜与原味贝果' },
      { title: '早安苹果肉桂司康', price: '22.00', desc: '苹果丁、肉桂糖与当天现烤黄油司康' },
      { title: '柚光冰摇美式', price: '21.00', desc: '浓缩咖啡、柚子汁与冰摇气泡，午后更轻快' },
    ],
  },
  {
    id: 'platform_nori_table',
    assetKey: 'elm-dim-sum',
    name: '榆树里蒸点铺',
    category: 'fast_food',
    cuisine: '中式蒸点',
    rating: 4.8,
    reviewCount: 839,
    deliveryEtaMinutes: 32,
    deliveryFee: '3.00',
    currency: 'CNY',
    minimumOrder: '38.00',
    distanceKm: 2.1,
    badge: '清晨开蒸',
    visualType: 'logo',
    logoMark: '榆树里',
    imageUrl: foodDeliveryUiAsset('platform/merchants/logos/merchant-logo-elm-dim-sum-01.png'),
    requiredAsset: 'platform/merchants/logos/merchant-logo-elm-dim-sum-01.png',
    imageAlt: 'Elm Lane Dim Sum brand mark',
    icon: 'fas fa-bowl-rice',
    fallbackClass: 'from-[#fefce8] via-[#fde68a] to-[#fb7185] text-[#854d0e]',
    desc: '街坊蒸点铺，用褶数、蒸笼和出炉时段讲每一笼点心。',
    menu: [
      { title: '榆树里虾仁三拼', price: '36.00', desc: '虾仁烧卖、荷香糯米鸡和一杯现磨热豆浆' },
      { title: '十八褶鲜肉小笼', price: '32.00', desc: '六只十八褶小笼、姜丝醋碟与小米粥' },
      { title: '金沙流心奶黄包', price: '24.00', desc: '四只咸蛋黄流心包，配桂花乌龙' },
      { title: '荷香腊味糯米鸡', price: '26.00', desc: '荷叶包糯米、香菇、鸡腿肉与广式腊味' },
      { title: '巷口咸豆浆油条', price: '23.00', desc: '榨菜虾皮咸豆浆、现炸油条与茶叶蛋' },
    ],
  },
  {
    id: 'platform_corner_pizza',
    assetKey: 'coconut-curry',
    name: '南风椰香咖喱',
    category: 'restaurants',
    cuisine: '东南亚咖喱',
    rating: 4.7,
    reviewCount: 932,
    deliveryEtaMinutes: 29,
    deliveryFee: '2.00',
    currency: 'CNY',
    minimumOrder: '35.00',
    distanceKm: 2.0,
    badge: '下饭推荐',
    imageUrl: '',
    requiredAsset: 'platform/merchants/merchant-coconut-curry-01.png',
    imageAlt: 'Coconut curry rice set',
    icon: 'fas fa-pepper-hot',
    fallbackClass: 'from-[#fefce8] via-[#facc15] to-[#22c55e] text-[#713f12]',
    desc: '南风把东南亚城市和香料写进菜单，咖喱可选柔和、标准或热辣。',
    menu: [
      {
        title: '南风一号椰香鸡',
        price: '45.00',
        desc: '嫩鸡腿、椰奶黄咖喱与茉莉香米，默认柔和辣度',
      },
      { title: '槟城咖喱虾饭', price: '52.00', desc: '鲜虾、秋葵、豆卜与浓香咖喱汁' },
      { title: '青罗勒绿咖喱牛', price: '49.00', desc: '牛肉片、泰茄、青罗勒与椰香绿咖喱' },
      { title: '南风冬阴功海鲜汤', price: '38.00', desc: '鲜虾、鱿鱼、菌菇与香茅酸辣汤，辣度偏高' },
      { title: '斑斓椰奶小布丁', price: '22.00', desc: '斑斓叶椰奶布丁与薄脆焦糖片' },
    ],
  },
])
const FOOD_PLATFORM_RECOMMENDATION_COUNT = 3
const platformRecommendedMerchantIds = Object.freeze(
  (() => {
    const merchantIds = FOOD_PLATFORM_MERCHANTS.map((merchant) => merchant.id)
    for (let index = merchantIds.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      ;[merchantIds[index], merchantIds[randomIndex]] = [
        merchantIds[randomIndex],
        merchantIds[index],
      ]
    }
    return merchantIds.slice(0, FOOD_PLATFORM_RECOMMENDATION_COUNT)
  })(),
)
const activePlatformCampaign = computed(
  () =>
    FOOD_PLATFORM_AD_BANNERS.find((campaign) => campaign.id === platformCampaignKey.value) || null,
)
const platformCampaignMerchants = computed(() => {
  const merchantIds = new Set(activePlatformCampaign.value?.merchantIds || [])
  return FOOD_PLATFORM_MERCHANTS.filter((merchant) => merchantIds.has(merchant.id))
})
const platformCampaignMenuPicks = computed(() =>
  (activePlatformCampaign.value?.menuPicks || [])
    .map((pick) => {
      const merchant = FOOD_PLATFORM_MERCHANTS.find((entry) => entry.id === pick.merchantId)
      const item = merchant?.menu?.[pick.itemIndex]
      return merchant && item ? { ...pick, merchant, item } : null
    })
    .filter(Boolean),
)
const platformCampaignPrize = computed(
  () =>
    (activePlatformCampaign.value?.prizes || []).find(
      (prize) => prize.id === platformCampaignPrizeId.value,
    ) || null,
)
const platformMerchantMatchesFilter = (merchant = {}, filterKey = 'all') => {
  if (filterKey === 'all') return true
  if (filterKey === 'chicken') return merchant.id === 'platform_chicken_crisp'
  if (filterKey === 'pizza') return merchant.id === 'platform_hwadeok_pizza'
  if (filterKey === 'noodles') return merchant.id === 'platform_neighborhood_soup'
  if (filterKey === 'sushi') return merchant.id === 'platform_sushi_hana'
  return merchant.category === filterKey
}
const STORE_MENU_SECTION_ORDER = Object.freeze([
  'signature',
  'broth_noodles',
  'dry_noodles',
  'noodle_sides',
  'coolers',
  'espresso_bar',
  'brunch_plates',
  'bakery',
  'cold_drinks',
  'layer_cakes',
  'pastry_case',
  'chilled_sweets',
  'sweet_drinks',
  'cloud_tea',
  'fruit_sparkle',
  'frozen_clouds',
  'oven_sweets',
  'seasonal_drop',
  'featured',
  'burgers',
  'chicken',
  'sides',
  'drinks',
  'treats',
  'house_table',
  'small_plates',
  'wok_favorites',
  'claypot',
  'rice_noodles',
  'tea_sweets',
  'warm_soup',
  'rice_set',
  'grill',
  'seafood',
  'greens',
  'pasta',
  'dessert',
])
const STORE_MENU_SECTION_META = Object.freeze({
  broth_noodles: {
    zh: '汤面',
    en: 'Broth noodles',
    shortZh: '汤面',
    shortEn: 'Broth',
    icon: 'fas fa-bowl-food',
  },
  dry_noodles: {
    zh: '拌面',
    en: 'Dry noodles',
    shortZh: '拌面',
    shortEn: 'Dry',
    icon: 'fas fa-bowl-rice',
  },
  noodle_sides: {
    zh: '河岸小碟',
    en: 'River sides',
    shortZh: '小碟',
    shortEn: 'Sides',
    icon: 'fas fa-plate-wheat',
  },
  coolers: {
    zh: '清凉饮',
    en: 'Coolers',
    shortZh: '凉饮',
    shortEn: 'Cool',
    icon: 'fas fa-glass-water',
  },
  espresso_bar: {
    zh: '咖啡吧',
    en: 'Espresso bar',
    shortZh: '咖啡',
    shortEn: 'Coffee',
    icon: 'fas fa-mug-hot',
  },
  brunch_plates: {
    zh: '日光早午餐',
    en: 'Daylight brunch',
    shortZh: '早午餐',
    shortEn: 'Brunch',
    icon: 'fas fa-sun',
  },
  bakery: {
    zh: '烘焙柜',
    en: 'Bakery',
    shortZh: '烘焙',
    shortEn: 'Bake',
    icon: 'fas fa-bread-slice',
  },
  cold_drinks: {
    zh: '冰饮',
    en: 'Cold drinks',
    shortZh: '冰饮',
    shortEn: 'Cold',
    icon: 'fas fa-glass-water',
  },
  layer_cakes: {
    zh: '切片蛋糕',
    en: 'Layer cakes',
    shortZh: '蛋糕',
    shortEn: 'Cake',
    icon: 'fas fa-cake-candles',
  },
  pastry_case: {
    zh: '酥点柜',
    en: 'Pastry case',
    shortZh: '酥点',
    shortEn: 'Pastry',
    icon: 'fas fa-cookie-bite',
  },
  chilled_sweets: {
    zh: '冰甜',
    en: 'Chilled sweets',
    shortZh: '冰甜',
    shortEn: 'Chilled',
    icon: 'fas fa-ice-cream',
  },
  sweet_drinks: {
    zh: '甜饮',
    en: 'Sweet drinks',
    shortZh: '甜饮',
    shortEn: 'Drinks',
    icon: 'fas fa-champagne-glasses',
  },
  cloud_tea: {
    zh: '云顶茶咖',
    en: 'Tea & coffee',
    shortZh: '茶咖',
    shortEn: 'Tea',
    icon: 'fas fa-mug-hot',
  },
  fruit_sparkle: {
    zh: '鲜果特饮',
    en: 'Fresh fruit',
    shortZh: '鲜果',
    shortEn: 'Fruit',
    icon: 'fas fa-lemon',
  },
  frozen_clouds: {
    zh: '冰雪甜品',
    en: 'Frozen',
    shortZh: '冰雪',
    shortEn: 'Ice',
    icon: 'fas fa-snowflake',
  },
  oven_sweets: {
    zh: '烤箱甜点',
    en: 'Baked',
    shortZh: '烘焙',
    shortEn: 'Bake',
    icon: 'fas fa-cookie-bite',
  },
  seasonal_drop: {
    zh: '季节限定',
    en: 'Seasonal',
    shortZh: '限定',
    shortEn: 'New',
    icon: 'fas fa-sun',
  },
  featured: {
    zh: '人气套餐',
    en: 'Combos',
    shortZh: '套餐',
    shortEn: 'Combo',
    icon: 'fas fa-burger',
  },
  burgers: {
    zh: '汉堡',
    en: 'Burgers',
    shortZh: '汉堡',
    shortEn: 'Burger',
    icon: 'fas fa-burger',
  },
  chicken: {
    zh: '鸡肉',
    en: 'Chicken',
    shortZh: '鸡肉',
    shortEn: 'Chicken',
    icon: 'fas fa-drumstick-bite',
  },
  sides: {
    zh: '小食',
    en: 'Sides',
    shortZh: '小食',
    shortEn: 'Sides',
    icon: 'fas fa-box-open',
  },
  drinks: {
    zh: '饮品',
    en: 'Drinks',
    shortZh: '饮品',
    shortEn: 'Drinks',
    icon: 'fas fa-glass-water',
  },
  treats: {
    zh: '甜点',
    en: 'Treats',
    shortZh: '甜点',
    shortEn: 'Treats',
    icon: 'fas fa-ice-cream',
  },
  house_table: {
    zh: '招牌桌菜',
    en: 'House table',
    shortZh: '桌菜',
    shortEn: 'House',
    icon: 'fas fa-utensils',
  },
  small_plates: {
    zh: '茶点小碟',
    en: 'Small plates',
    shortZh: '小碟',
    shortEn: 'Small',
    icon: 'fas fa-plate-wheat',
  },
  wok_favorites: {
    zh: '锅气小炒',
    en: 'From the wok',
    shortZh: '小炒',
    shortEn: 'Wok',
    icon: 'fas fa-fire-burner',
  },
  claypot: {
    zh: '暖煲',
    en: 'Claypot',
    shortZh: '煲',
    shortEn: 'Pot',
    icon: 'fas fa-bowl-food',
  },
  rice_noodles: {
    zh: '饭面',
    en: 'Rice & noodles',
    shortZh: '饭面',
    shortEn: 'Staples',
    icon: 'fas fa-bowl-rice',
  },
  tea_sweets: {
    zh: '茶与甜汤',
    en: 'Tea & sweets',
    shortZh: '茶甜',
    shortEn: 'Tea',
    icon: 'fas fa-mug-hot',
  },
  signature: { zh: '招牌', en: 'Signature', shortZh: '招牌', shortEn: 'Sign', icon: 'fas fa-star' },
  warm_soup: {
    zh: '暖汤',
    en: 'Soups',
    shortZh: '暖汤',
    shortEn: 'Soup',
    icon: 'fas fa-bowl-food',
  },
  rice_set: { zh: '套餐', en: 'Sets', shortZh: '套餐', shortEn: 'Sets', icon: 'fas fa-bowl-rice' },
  grill: {
    zh: '主菜',
    en: 'Grill',
    shortZh: '主菜',
    shortEn: 'Grill',
    icon: 'fas fa-drumstick-bite',
  },
  seafood: { zh: '海鲜', en: 'Seafood', shortZh: '海鲜', shortEn: 'Sea', icon: 'fas fa-fish' },
  greens: { zh: '轻食', en: 'Greens', shortZh: '轻食', shortEn: 'Fresh', icon: 'fas fa-seedling' },
  pasta: { zh: '意面', en: 'Pasta', shortZh: '意面', shortEn: 'Pasta', icon: 'fas fa-utensils' },
  dessert: {
    zh: '甜品',
    en: 'Dessert',
    shortZh: '甜品',
    shortEn: 'Sweet',
    icon: 'fas fa-ice-cream',
  },
})
const platformCategoryTiles = computed(() =>
  FOOD_PLATFORM_CATEGORY_DEFINITIONS.map((category) => {
    const categoryKey = category.categoryKey || category.key
    const visual =
      FOOD_PLATFORM_CATEGORY_VISUALS[category.key] ||
      FOOD_PLATFORM_CATEGORY_VISUALS[categoryKey] ||
      FOOD_PLATFORM_CATEGORY_VISUALS.all
    return {
      ...category,
      categoryKey,
      label: languageBase.value === 'zh' ? category.labelZh : category.labelEn,
      icon: visual.icon || category.icon,
      className: visual.className,
      restaurantCount: FOOD_PLATFORM_MERCHANTS.filter((merchant) =>
        platformMerchantMatchesFilter(merchant, category.key),
      ).length,
      active: category.key === activePlatformFilterKey.value,
    }
  }),
)
const shopAppEntries = computed(() =>
  activeRestaurants.value.map((restaurant) => {
    const presentation = resolveShopEntryPresentation(restaurant)
    return {
      ...restaurant,
      visual: FOOD_STORE_VISUALS[restaurant.category] || FOOD_STORE_VISUALS.restaurants,
      displayName: presentation.displayName || restaurant.name,
      shortDescription: presentation.shortDescription || restaurant.cuisine || restaurant.category,
      entryTags: presentation.tags || [],
    }
  }),
)
const normalizedPlatformSearchQuery = computed(() => platformSearchQuery.value.trim().toLowerCase())
const platformMerchantsByCategory = computed(() => {
  if (platformPageKey.value === 'search' || platformPageKey.value === 'saved') {
    return FOOD_PLATFORM_MERCHANTS
  }
  return FOOD_PLATFORM_MERCHANTS.filter((merchant) =>
    platformMerchantMatchesFilter(merchant, activePlatformFilterKey.value),
  )
})
const merchantMatchesPlatformSearch = (merchant = {}) => {
  const query = normalizedPlatformSearchQuery.value
  if (!query) return true
  const menuText = (merchant.menu || []).map((item) => `${item.title} ${item.desc}`).join(' ')
  return [
    merchant.name,
    merchant.desc,
    merchant.cuisine,
    merchant.category,
    merchant.badge,
    menuText,
  ].some((value) =>
    String(value || '')
      .toLowerCase()
      .includes(query),
  )
}
const platformMatchingMerchants = computed(() => {
  const merchants =
    platformPageKey.value === 'saved'
      ? platformMerchantsByCategory.value
      : platformMerchantsByCategory.value.filter((merchant) =>
          merchantMatchesPlatformSearch(merchant),
        )
  return platformPageKey.value === 'saved'
    ? merchants.filter((merchant) => platformSavedMerchantIds.value.includes(merchant.id))
    : merchants
})
const platformRecommendationMode = computed(
  () =>
    platformPageKey.value === 'home' &&
    activePlatformFilterKey.value === 'all' &&
    !platformMerchantListExpanded.value,
)
const platformFeaturedMerchants = computed(() => {
  if (!platformRecommendationMode.value) return platformMatchingMerchants.value
  return platformRecommendedMerchantIds
    .map((merchantId) =>
      platformMatchingMerchants.value.find((merchant) => merchant.id === merchantId),
    )
    .filter(Boolean)
})
const platformMerchantSectionTitle = computed(() =>
  platformPageKey.value === 'saved'
    ? t('收藏小店', 'Saved shops')
    : platformRecommendationMode.value
      ? t('为你推荐', 'Recommended for you')
      : t('附近营业小店', 'Open near you'),
)
const platformMerchantSectionMeta = computed(() =>
  platformRecommendationMode.value
    ? t(
        `随机推荐 ${platformFeaturedMerchants.value.length} 家 · 共 ${platformMatchingMerchants.value.length} 家`,
        `${platformFeaturedMerchants.value.length} random picks · ${platformMatchingMerchants.value.length} shops total`,
      )
    : `${platformActiveCategoryLabel.value} · ${platformMatchingMerchants.value.length} ${t('家平台小店', 'platform shops')}`,
)
const platformMerchantEmptyLabel = computed(() =>
  platformPageKey.value === 'saved'
    ? t(
        '还没有收藏平台小店，点卡片右上角的爱心即可加入。',
        'No saved platform shops yet. Use the heart on a shop card to add one.',
      )
    : t('平台内暂时没有匹配的小店。', 'No matching platform merchants right now.'),
)
const platformDeliveryFeeLabel = (merchant = {}) =>
  Number(merchant.deliveryFee) <= 0
    ? t('免配送费', 'Free')
    : displayMoney(merchant.deliveryFee, merchant.currency)
const selectedPlatformMerchant = computed(() => {
  const selectedMerchant = FOOD_PLATFORM_MERCHANTS.find(
    (merchant) => merchant.id === selectedPlatformMerchantId.value,
  )
  return selectedMerchant || platformFeaturedMerchants.value[0] || null
})
const isPlatformLogoMerchant = (merchant = {}) => merchant.visualType === 'logo'
const platformMerchantLogoMark = (merchant = {}) =>
  merchant.logoMark || String(merchant.name || '').slice(0, 3)
const platformMerchantIdentityAssetPath = (merchantId = '') => {
  const merchant = FOOD_PLATFORM_MERCHANTS.find((entry) => entry.id === merchantId)
  if (merchant?.visualType === 'logo' && merchant.requiredAsset) return merchant.requiredAsset
  return `platform/orders/merchant-marks/${platformMerchantMarkFileName(merchantId)}`
}
const platformHeroImageUrl = computed(() => selectedPlatformMerchant.value?.imageUrl || '')
const platformHeroRestaurant = selectedPlatformMerchant
const platformHeroMenuItem = computed(() => selectedPlatformMerchant.value?.menu?.[0] || null)
const platformFeaturedRestaurants = platformFeaturedMerchants
const defaultPlatformLocationLabel = computed(
  () =>
    activeMapHandoff.value?.deliveryAddress ||
    t('首尔市江南区清潭洞 88-1', '88-1 Cheongdam-dong, Gangnam-gu, Seoul'),
)
const platformLocationLabel = computed(
  () => selectedPlatformDeliveryAddress.value || defaultPlatformLocationLabel.value,
)
const platformDeliveryAddressOptions = computed(() => [
  defaultPlatformLocationLabel.value,
  t('首尔市麻浦区延南洞 223-14', '223-14 Yeonnam-dong, Mapo-gu, Seoul'),
  t('公司 · 首尔市中区乙支路 100', 'Work · 100 Eulji-ro, Jung-gu, Seoul'),
])
const platformCartMerchant = computed(() => {
  const merchantId = foodDeliveryStore.platformCartItems[0]?.merchantId || ''
  return FOOD_PLATFORM_MERCHANTS.find((merchant) => merchant.id === merchantId) || null
})
const platformCheckoutDeliveryFeeCents = computed(() =>
  Math.max(0, Math.round(Number(platformCartMerchant.value?.deliveryFee || 0) * 100)),
)
const platformCheckoutTotal = computed(() => {
  const amountCents =
    foodDeliveryStore.platformCartPrimaryTotal.amountCents + platformCheckoutDeliveryFeeCents.value
  return {
    amountCents,
    amount: (amountCents / 100).toFixed(2),
    currency: foodDeliveryStore.platformCartPrimaryTotal.currency,
  }
})
const platformCheckoutPaymentOptions = computed(() => [
  {
    key: 'app_pay',
    icon: 'fas fa-mobile-screen-button',
    label: t('平台支付', 'Platform pay'),
    desc: t(
      '快捷确认本次订单，提交后可随时查看进度。',
      'Confirm quickly and follow the order after placing it.',
    ),
  },
  {
    key: 'pay_on_delivery',
    icon: 'fas fa-money-bill-wave',
    label: t('送达后支付', 'Pay on delivery'),
    desc: t('骑手送达时再完成虚拟支付。', 'Complete the virtual payment when the rider arrives.'),
  },
])
const activePlatformOrder = computed(() =>
  platformOrderId.value ? foodDeliveryStore.findPlatformOrderById(platformOrderId.value) : null,
)
const platformMerchantMarkFileName = (merchantId = '') =>
  ({
    platform_hanwoo_gukbap: 'platform-merchant-mark-hanwoo-01.png',
    platform_sushi_hana: 'platform-merchant-mark-sushi-hana-01.png',
    platform_hwadeok_pizza: 'platform-merchant-mark-hwadeok-pizza-01.png',
    platform_salad_day: 'platform-merchant-mark-salad-day-01.png',
    platform_chicken_crisp: 'platform-merchant-mark-chicken-crisp-01.png',
    platform_neighborhood_soup: 'platform-merchant-mark-camellia-noodles-01.png',
    platform_corner_pizza: 'platform-merchant-mark-coconut-curry-01.png',
  })[merchantId] || 'platform-merchant-mark-pending.png'
const platformOrderNumber = (order = {}) => {
  const createdAtPart = String(order.createdAt || '')
    .slice(-6)
    .padStart(6, '0')
  const idPart = String(order.id || '')
    .split('_')
    .pop()
    .slice(-4)
    .toUpperCase()
    .padStart(4, '0')
  return `FD${createdAtPart}-${idPart}`
}
const resolvePlatformOrderStatus = (status = FOOD_DELIVERY_ORDER_STATUS.PLACED) => {
  const statusMeta = {
    [FOOD_DELIVERY_ORDER_STATUS.PLACED]: {
      key: 'placed',
      assetKey: 'placed',
      label: t('已下单', 'Placed'),
      eyebrow: t('商家确认中', 'Awaiting confirmation'),
      title: t('下单成功', 'Order placed'),
      desc: t(
        '小店已收到订单，正在确认餐品。',
        'The shop received your order and is checking the items.',
      ),
      icon: 'fas fa-receipt',
      stepIndex: 0,
      badgeClass: 'bg-[#e5fbfa] text-[#128e89]',
      heroClass: 'bg-[#24bcb7] shadow-[0_18px_42px_rgba(20,184,166,0.22)]',
    },
    [FOOD_DELIVERY_ORDER_STATUS.ACCEPTED]: {
      key: 'accepted',
      assetKey: 'preparing',
      label: t('已接单', 'Accepted'),
      eyebrow: t('小店已确认', 'Shop confirmed'),
      title: t('小店已接单', 'Order accepted'),
      desc: t('餐品已经进入制作队列，请稍等片刻。', 'Your meal is now in the preparation queue.'),
      icon: 'fas fa-circle-check',
      stepIndex: 1,
      badgeClass: 'bg-[#e5fbfa] text-[#128e89]',
      heroClass: 'bg-[#24bcb7] shadow-[0_18px_42px_rgba(20,184,166,0.22)]',
    },
    [FOOD_DELIVERY_ORDER_STATUS.COOKING]: {
      key: 'cooking',
      assetKey: 'preparing',
      label: t('制作中', 'Preparing'),
      eyebrow: t('厨房进行中', 'In the kitchen'),
      title: t('餐点制作中', 'Meal in preparation'),
      desc: t(
        '小店正在准备餐品，完成后会交给骑手。',
        'The shop is preparing your meal before rider pickup.',
      ),
      icon: 'fas fa-fire-burner',
      stepIndex: 1,
      badgeClass: 'bg-amber-50 text-amber-700',
      heroClass: 'bg-[#159f9a] shadow-[0_18px_42px_rgba(15,159,154,0.22)]',
    },
    [FOOD_DELIVERY_ORDER_STATUS.RIDER_PICKUP]: {
      key: 'rider_pickup',
      assetKey: 'delivering',
      label: t('配送中', 'Delivering'),
      eyebrow: t('骑手已取餐', 'Picked up by rider'),
      title: t('正在送往你这里', 'On the way to you'),
      desc: t(
        '餐品已经离店，请留意预计送达时间。',
        'Your meal has left the shop. Keep an eye on the ETA.',
      ),
      icon: 'fas fa-motorcycle',
      stepIndex: 2,
      badgeClass: 'bg-sky-50 text-sky-700',
      heroClass: 'bg-sky-600 shadow-[0_18px_42px_rgba(2,132,199,0.22)]',
    },
    [FOOD_DELIVERY_ORDER_STATUS.DELIVERED]: {
      key: 'delivered',
      assetKey: 'delivered',
      label: t('已送达', 'Delivered'),
      eyebrow: t('本次配送完成', 'Delivery complete'),
      title: t('餐点已经送达', 'Your meal has arrived'),
      desc: t(
        '订单已完成，愿这一餐正合心意。',
        'The order is complete. Hope the meal hits the spot.',
      ),
      icon: 'fas fa-house-circle-check',
      stepIndex: 3,
      badgeClass: 'bg-gray-100 text-gray-700',
      heroClass: 'bg-gray-950 shadow-[0_18px_42px_rgba(15,23,42,0.2)]',
    },
    [FOOD_DELIVERY_ORDER_STATUS.CANCELLED]: {
      key: 'cancelled',
      assetKey: 'cancelled',
      label: t('已取消', 'Cancelled'),
      eyebrow: t('订单已结束', 'Order closed'),
      title: t('订单已取消', 'Order cancelled'),
      desc: t(
        '这笔订单没有继续配送，可返回首页重新选择。',
        'This order will not be delivered. Return home to choose again.',
      ),
      icon: 'fas fa-circle-xmark',
      stepIndex: -1,
      badgeClass: 'bg-rose-50 text-rose-700',
      heroClass: 'bg-rose-600 shadow-[0_18px_42px_rgba(225,29,72,0.18)]',
    },
  }
  return statusMeta[status] || statusMeta[FOOD_DELIVERY_ORDER_STATUS.PLACED]
}
const activePlatformOrderStatus = computed(() =>
  resolvePlatformOrderStatus(activePlatformOrder.value?.status),
)
const platformOrderSteps = computed(() => [
  { key: 'placed', label: t('已下单', 'Placed'), icon: 'fas fa-receipt' },
  { key: 'preparing', label: t('制作中', 'Preparing'), icon: 'fas fa-fire-burner' },
  { key: 'delivering', label: t('配送中', 'Delivering'), icon: 'fas fa-motorcycle' },
  { key: 'delivered', label: t('已送达', 'Delivered'), icon: 'fas fa-house-circle-check' },
])
const platformBenefitCards = computed(() => [
  {
    key: 'club',
    title: t('外卖会员免配送权益', 'Delivery club free-delivery perks'),
    desc: t(
      '常点小店、收藏小店和附近好店都会优先被发现。',
      'Favorite, saved, and nearby shops stay easy to reach.',
    ),
    icon: 'fas fa-ticket',
    className: 'from-[#e7fbfa] to-white text-gray-950',
  },
  {
    key: 'pickup',
    title: t('附近自取', 'Nearby pickup'),
    desc: t(
      '不想等骑手时，可以先看附近可自取的小店。',
      'When delivery can wait, nearby pickup shops are easy to find.',
    ),
    icon: 'fas fa-bag-shopping',
    className: 'from-orange-50 to-white text-orange-900',
  },
  {
    key: 'gift',
    title: t('送给关系人', 'Send a meal'),
    desc: t(
      '为重要的人选一顿合口味的餐，分享这次用餐心意。',
      'Choose a fitting meal for someone important and share the moment.',
    ),
    icon: 'fas fa-gift',
    className: 'from-violet-50 to-white text-violet-900',
  },
])
const activePlatformNavItemKey = computed(() =>
  platformPageKey.value === 'order' || platformPageKey.value === 'orders'
    ? 'orders'
    : platformPageKey.value === 'campaign'
      ? 'home'
      : platformPageKey.value,
)
const platformBottomNavItems = computed(() => [
  {
    key: 'home',
    label: t('首页', 'Home'),
    icon: 'fas fa-house',
    active: activePlatformNavItemKey.value === 'home',
  },
  {
    key: 'search',
    label: t('搜索', 'Search'),
    icon: 'fas fa-magnifying-glass',
    active: activePlatformNavItemKey.value === 'search',
  },
  {
    key: 'orders',
    label: t('订单', 'Orders'),
    icon: 'fas fa-receipt',
    active: activePlatformNavItemKey.value === 'orders',
  },
  {
    key: 'saved',
    label: t('收藏', 'Saved'),
    icon: 'fas fa-heart',
    active: activePlatformNavItemKey.value === 'saved',
  },
  {
    key: 'profile',
    label: t('我的', 'Mine'),
    icon: 'fas fa-face-smile',
    active: activePlatformNavItemKey.value === 'profile',
  },
])
const platformUtilitySheetContent = computed(() => {
  if (platformUtilitySheetKey.value === 'notifications') {
    return {
      icon: 'fas fa-bell',
      title: t('平台消息', 'Platform updates'),
      desc: t(
        '优惠、营业状态和配送提醒会出现在这里。',
        'Offers, opening updates, and delivery notices appear here.',
      ),
    }
  }
  if (platformUtilitySheetKey.value === 'cart') {
    return {
      icon: 'fas fa-cart-shopping',
      title: t('平台小店购物车', 'Platform shop cart'),
      desc: t(
        '先进入一家小店选择菜品，同一家店的餐品可以一起结算。',
        'Choose a shop first, then review its items together at checkout.',
      ),
    }
  }
  return null
})
const selectedRestaurantId = computed(() =>
  typeof route.query.restaurantId === 'string' ? route.query.restaurantId.trim() : '',
)
const selectedRestaurant = computed(() =>
  selectedRestaurantId.value
    ? foodDeliveryStore.findRestaurantById(selectedRestaurantId.value)
    : null,
)
const isStoreMode = computed(() => Boolean(selectedRestaurant.value))
const activeRestaurant = computed(
  () => selectedRestaurant.value || activeRestaurants.value[0] || null,
)
const cartLineRestaurantIds = computed(() =>
  foodDeliveryStore.cartItems.map(
    (cartItem) => foodDeliveryStore.findMenuItemById(cartItem.menuItemId)?.restaurantId || '',
  ),
)
const cartOwnershipState = computed(() => {
  if (cartLineRestaurantIds.value.length === 0) return 'empty'
  if (
    activeRestaurant.value?.id &&
    cartLineRestaurantIds.value.every((restaurantId) => restaurantId === activeRestaurant.value.id)
  ) {
    return 'active'
  }
  const restaurantIds = new Set(cartLineRestaurantIds.value.filter(Boolean))
  if (
    restaurantIds.size === 1 &&
    cartLineRestaurantIds.value.every((restaurantId) => Boolean(restaurantId))
  ) {
    return 'foreign'
  }
  return 'mixed'
})
const activeStoreOwnsCart = computed(() => cartOwnershipState.value === 'active')
const resolveLocalizedMenuItem = (item = {}) =>
  resolvePeachCloudMenuItemCopy(item, systemLanguage.value)
const activeStoreCartLineItems = computed(() =>
  activeStoreOwnsCart.value
    ? foodDeliveryStore.cartLineItems
        .filter((line) => line.restaurant?.id === activeRestaurant.value?.id)
        .map((line) => ({
          ...line,
          menuItem: resolveLocalizedMenuItem(line.menuItem),
        }))
    : [],
)
const activeStoreCartQuantity = computed(() =>
  activeStoreCartLineItems.value.reduce(
    (total, line) => total + Math.max(0, Number(line.quantity) || 0),
    0,
  ),
)
const activeStoreCartPrimaryTotal = computed(() =>
  activeStoreOwnsCart.value
    ? foodDeliveryStore.cartPrimaryTotal
    : {
        amount: '0.00',
        amountCents: 0,
        currency: activeRestaurant.value?.currency || activeCurrency.value,
      },
)
const cartOwnershipRestaurants = computed(() => {
  const restaurants = new Map()
  cartLineRestaurantIds.value.forEach((restaurantId) => {
    if (!restaurantId || restaurants.has(restaurantId)) return
    const restaurant = foodDeliveryStore.findRestaurantById(restaurantId)
    if (restaurant) restaurants.set(restaurantId, restaurant)
  })
  return [...restaurants.values()]
})
const foreignCartRestaurant = computed(() =>
  cartOwnershipState.value === 'foreign' ? cartOwnershipRestaurants.value[0] || null : null,
)
const hasCartOwnershipConflict = computed(() =>
  ['foreign', 'mixed'].includes(cartOwnershipState.value),
)
const cartOwnershipRestaurantNames = computed(() => {
  const names = cartOwnershipRestaurants.value.map((restaurant) => restaurant.name).filter(Boolean)
  if (cartLineRestaurantIds.value.some((restaurantId) => !restaurantId)) {
    names.push(t('未知店铺', 'Unknown shop'))
  }
  return names.join(' · ') || t('归属不明', 'Ownership unknown')
})
const activeMenuItems = computed(() =>
  activeRestaurant.value
    ? foodDeliveryStore
        .listMenuByRestaurant(activeRestaurant.value.id)
        .map(resolveLocalizedMenuItem)
    : [],
)
const resolveStoreMenuSectionMeta = (sectionKey = '') => {
  const key = sectionKey || 'signature'
  return (
    STORE_MENU_SECTION_META[key] || {
      zh: key,
      en: key,
      shortZh: key,
      shortEn: key,
      icon: 'fas fa-utensils',
    }
  )
}
const activeStoreMenuSections = computed(() => {
  const sections = new Map()
  activeMenuItems.value.forEach((item) => {
    const key = item.menuSection || 'signature'
    const meta = resolveStoreMenuSectionMeta(key)
    const current = sections.get(key) || {
      key,
      icon: meta.icon,
      label: languageBase.value === 'zh' ? meta.zh : meta.en,
      shortLabel: languageBase.value === 'zh' ? meta.shortZh : meta.shortEn,
      count: 0,
      order: STORE_MENU_SECTION_ORDER.indexOf(key),
    }
    current.count += 1
    sections.set(key, current)
  })
  const orderedSections = [...sections.values()].sort((a, b) => {
    const orderA = a.order >= 0 ? a.order : 999
    const orderB = b.order >= 0 ? b.order : 999
    if (orderA !== orderB) return orderA - orderB
    return a.label.localeCompare(b.label)
  })
  return [
    {
      key: 'all',
      icon: 'fas fa-layer-group',
      label: t('全部', 'All'),
      shortLabel: t('全部', 'All'),
      count: activeMenuItems.value.length,
      order: -1,
    },
    ...orderedSections,
  ]
})
const activeStoreMenuSection = computed(
  () =>
    activeStoreMenuSections.value.find(
      (section) => section.key === activeStoreMenuSectionKey.value,
    ) ||
    activeStoreMenuSections.value[0] ||
    null,
)
const visibleActiveMenuItems = computed(() => {
  if (activeStoreMenuSectionKey.value === 'all') return activeMenuItems.value
  return activeMenuItems.value.filter(
    (item) => (item.menuSection || 'signature') === activeStoreMenuSectionKey.value,
  )
})
const selectedMenuItemSource = computed(() =>
  selectedMenuItemId.value ? foodDeliveryStore.findMenuItemById(selectedMenuItemId.value) : null,
)
const selectedMenuItem = computed(() => resolveLocalizedMenuItem(selectedMenuItemSource.value))
const activeStoreVisual = computed(() => {
  const key = activeRestaurant.value?.category || activeCategory.value?.key || 'restaurants'
  return FOOD_STORE_VISUALS[key] || FOOD_STORE_VISUALS.restaurants
})
const activeStorePresentation = computed(() =>
  activeRestaurant.value ? resolveShopEntryPresentation(activeRestaurant.value) : null,
)
const activeStoreRestaurantImageUrl = computed(() =>
  activeRestaurant.value ? foodImageUrl(activeRestaurant.value) : '',
)
const activeStoreCoverImageUrl = computed(() => {
  const assetId = activeStorePresentation.value?.coverGalleryAssetId || ''
  if (assetId) return foodImagePreviewMap[assetId] || ''
  return isDarkTrayStore.value || isDessertWindowStore.value
    ? activeStoreRestaurantImageUrl.value
    : ''
})
const activeStoreDisplayName = computed(
  () => activeStorePresentation.value?.displayName || activeRestaurant.value?.name || '',
)
const activeStoreShortDescription = computed(
  () =>
    activeStorePresentation.value?.shortDescription ||
    activeRestaurant.value?.cuisine ||
    activeRestaurant.value?.category ||
    '',
)
const activeStoreTags = computed(() => activeStorePresentation.value?.tags || [])
const activeStoreTemplate = computed(() =>
  resolveStoreTemplateForRestaurant(activeRestaurant.value || {}),
)
const isDarkTrayStore = computed(() => activeStoreTemplate.value === 'dark_tray_menu')
const isDessertWindowStore = computed(() => activeStoreTemplate.value === 'dessert_window')
const isQuickServiceStore = computed(() => activeStoreTemplate.value === 'quick_service_chain')
const isJadeTableStore = computed(() => activeStoreTemplate.value === 'jade_table_menu')
const isLightFoodStore = computed(() => activeStoreTemplate.value === 'minimal_light_food')
const isDedicatedStoreApp = computed(
  () =>
    isDessertWindowStore.value ||
    isQuickServiceStore.value ||
    isJadeTableStore.value ||
    isLightFoodStore.value,
)
const PEACH_CLOUD_PAGE_KEYS = new Set(['search', 'new', 'bag', 'orders', 'order'])
const peachCloudPageKey = computed(() => {
  if (!isDessertWindowStore.value) return 'home'
  const key = typeof route.query.shopView === 'string' ? route.query.shopView.trim() : ''
  return PEACH_CLOUD_PAGE_KEYS.has(key) ? key : 'home'
})
const peachCloudOrderId = computed(() =>
  typeof route.query.shopOrderId === 'string' ? route.query.shopOrderId.trim() : '',
)
const activePeachCloudNavKey = computed(() =>
  peachCloudPageKey.value === 'order' ? 'orders' : peachCloudPageKey.value,
)
const QUICK_SERVICE_PAGE_KEYS = new Set(['menu', 'deals', 'bag', 'orders', 'order'])
const quickServicePageKey = computed(() => {
  if (!isQuickServiceStore.value) return 'home'
  const key = typeof route.query.shopView === 'string' ? route.query.shopView.trim() : ''
  return QUICK_SERVICE_PAGE_KEYS.has(key) ? key : 'home'
})
const quickServiceOrderId = computed(() =>
  typeof route.query.shopOrderId === 'string' ? route.query.shopOrderId.trim() : '',
)
const JADE_TABLE_PAGE_KEYS = new Set(['menu', 'feast', 'bag', 'orders', 'order'])
const jadeTablePageKey = computed(() => {
  if (!isJadeTableStore.value) return 'home'
  const key = typeof route.query.shopView === 'string' ? route.query.shopView.trim() : ''
  return JADE_TABLE_PAGE_KEYS.has(key) ? key : 'home'
})
const jadeTableOrderId = computed(() =>
  typeof route.query.shopOrderId === 'string' ? route.query.shopOrderId.trim() : '',
)
const LIGHT_FOOD_PAGE_KEYS = new Set(['menu', 'detail', 'bag', 'orders', 'order'])
const lightFoodPageKey = computed(() => {
  if (!isLightFoodStore.value) return 'home'
  const key = typeof route.query.shopView === 'string' ? route.query.shopView.trim() : ''
  return LIGHT_FOOD_PAGE_KEYS.has(key) ? key : 'home'
})
const lightFoodItemId = computed(() =>
  typeof route.query.shopItemId === 'string' ? route.query.shopItemId.trim() : '',
)
const lightFoodOrderId = computed(() =>
  typeof route.query.shopOrderId === 'string' ? route.query.shopOrderId.trim() : '',
)
const peachCloudFeaturedItem = computed(
  () =>
    activeMenuItems.value.find((item) => item.menuSection === 'seasonal_drop') ||
    activeMenuItems.value[0] ||
    null,
)
const peachCloudMenuShortcuts = computed(() =>
  PEACH_CLOUD_MENU_SHORTCUTS.map((shortcut) => ({
    ...shortcut,
    label: languageBase.value === 'zh' ? shortcut.labelZh : shortcut.labelEn,
    shortLabel: languageBase.value === 'zh' ? shortcut.shortLabelZh : shortcut.shortLabelEn,
    count:
      activeStoreMenuSections.value.find((section) => section.key === shortcut.key)?.count || 0,
    iconUrl: foodDeliveryUiAsset(`peach-cloud/categories/${shortcut.asset}`),
  })).filter((shortcut) => shortcut.count > 0),
)
const peachCloudFilteredMenuItems = computed(() => {
  const query = peachCloudSearchQuery.value.trim().toLocaleLowerCase()
  const sectionItems =
    activeStoreMenuSectionKey.value === 'all'
      ? activeMenuItems.value
      : activeMenuItems.value.filter(
          (item) => (item.menuSection || 'signature') === activeStoreMenuSectionKey.value,
        )
  if (!query) return sectionItems
  return sectionItems.filter((item) =>
    getPeachCloudMenuSearchValues(item).some((value) =>
      String(value).toLocaleLowerCase().includes(query),
    ),
  )
})
const peachCloudSearchResults = computed(() => {
  const query = peachCloudSearchQuery.value.trim().toLocaleLowerCase()
  const sectionKey =
    activeStoreMenuSectionKey.value === 'all'
      ? PEACH_CLOUD_MENU_SHORTCUTS[0].key
      : activeStoreMenuSectionKey.value
  const sectionItems = query
    ? activeMenuItems.value
    : activeMenuItems.value.filter((item) => (item.menuSection || 'signature') === sectionKey)
  if (!query) return sectionItems
  return sectionItems.filter((item) =>
    getPeachCloudMenuSearchValues(item).some((value) =>
      String(value).toLocaleLowerCase().includes(query),
    ),
  )
})
const peachCloudNewArrivalItems = computed(() => {
  const featuredId = peachCloudFeaturedItem.value?.id || ''
  const remainingSeasonalItems = activeMenuItems.value.filter(
    (item) => item.id !== featuredId && item.menuSection === 'seasonal_drop',
  )
  const otherItems = activeMenuItems.value.filter(
    (item) => item.id !== featuredId && item.menuSection !== 'seasonal_drop',
  )
  return [...remainingSeasonalItems, ...otherItems].slice(0, 6)
})
const peachCloudDropSectionLabel = (sectionKey) => {
  if (sectionKey === 'fruit_sparkle') return t('果饮', 'FRUIT')
  if (sectionKey === 'frozen_clouds') return t('冰品', 'ICE')
  if (sectionKey === 'cloud_tea') return t('茶咖', 'TEA')
  if (sectionKey === 'oven_sweets') return t('烘焙', 'BAKE')
  if (sectionKey === 'seasonal_drop') return t('限定', 'LIMITED')
  return t('上新', 'NEW')
}
const peachCloudShowsCuratedHome = computed(
  () => activeStoreMenuSectionKey.value === 'all' && !peachCloudSearchQuery.value.trim(),
)
const peachCloudBestSellerItems = computed(() => activeMenuItems.value.slice(0, 4))
const peachCloudRecommendedItems = computed(() => activeMenuItems.value.slice(4))
const foodDeliveryShellClass = computed(() => {
  if (isStoreMode.value && isDarkTrayStore.value) return 'bg-[#080a10]'
  if (isStoreMode.value && isDessertWindowStore.value) return 'bg-[#f2fbe0]'
  if (isStoreMode.value && isQuickServiceStore.value) return 'bg-[#fff9ec]'
  if (isStoreMode.value && isJadeTableStore.value) return 'bg-[#f5efe2]'
  if (isStoreMode.value && isLightFoodStore.value) return 'bg-[#f2f4ef]'
  if (isStoreMode.value) return 'bg-[#f4fbfb]'
  return worldAppUxContext.value ? 'bg-[#eef8fb]' : 'bg-[#f4fbfb]'
})
const foodDeliveryShellStyle = computed(() => {
  if (isStoreMode.value && isDessertWindowStore.value) return PEACH_CLOUD_THEME_STYLE
  if (isStoreMode.value) return {}
  return {
    background: 'linear-gradient(180deg, #ffffff 0%, #ffffff 10rem, #f2fbfb 10rem, #ffffff 100%)',
  }
})
const activeStoreEtaText = computed(() =>
  activeRestaurant.value ? `${activeRestaurant.value.deliveryEtaMinutes} min` : '',
)
const activeStoreFeeText = computed(() =>
  activeRestaurant.value
    ? `${activeRestaurant.value.deliveryFee} ${activeRestaurant.value.currency || activeCurrency.value}`
    : '',
)
const activeStoreDistanceText = computed(() =>
  activeRestaurant.value ? `${activeRestaurant.value.distanceKm} km` : '',
)
const storeCartCtaLabel = computed(() =>
  activeStoreCartQuantity.value > 0 ? t('去结算', 'Checkout') : t('先选一份', 'Pick an item'),
)
const selectedMenuItemDetailTotal = computed(() => {
  const item = selectedMenuItem.value
  if (!item) return `0.00 ${activeRestaurant.value?.currency || activeCurrency.value}`
  const quantity = Math.min(99, Math.max(1, Number(menuDetailQuantity.value) || 1))
  return `${((Number(item.priceCents || 0) * quantity) / 100).toFixed(2)} ${item.currency || activeCurrency.value}`
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
const deliveryMapRouteSummary = (handoff = {}) =>
  languageBase.value === 'zh'
    ? handoff.routeSummaryZh || handoff.routeSummaryEn || ''
    : handoff.routeSummaryEn || handoff.routeSummaryZh || ''
const deliveryMapPickup = (handoff = {}) => handoff.pickupPoint || handoff.locationHint || ''
const deliveryMapAddress = (handoff = {}) =>
  handoff.deliveryAddress || handoff.dropoffPoint || handoff.currentLocationDetail || ''
const deliveryMapMetaLine = (handoff = {}) =>
  [
    handoff.carrierName,
    handoff.trackingCode,
    Number(handoff.distanceKm) > 0 ? `${handoff.distanceKm} km` : '',
  ]
    .filter(Boolean)
    .join(' · ')
const deliveryMapEtaLabel = (handoff = {}) => {
  const etaDays = Number(handoff.etaDays)
  if (Number.isFinite(etaDays) && etaDays > 0) {
    return t(`约 ${etaDays} 天`, `About ${etaDays} day(s)`)
  }
  const etaMinutes = Number(handoff.etaMinutes)
  if (!Number.isFinite(etaMinutes) || etaMinutes <= 0) return t('ETA 待定', 'ETA pending')
  if (etaMinutes >= 24 * 60) {
    const roundedDays = Math.round(etaMinutes / (24 * 60))
    return t(`约 ${roundedDays} 天`, `About ${roundedDays} day(s)`)
  }
  return `${etaMinutes} min`
}
const activeMapHandoffRouteSummary = computed(() => deliveryMapRouteSummary(activeMapHandoff.value))
const scopedFoodOrders = computed(() => {
  const restaurantId = isStoreMode.value ? activeRestaurant.value?.id || '' : ''
  if (!restaurantId) return []
  return foodDeliveryStore.orders
    .filter((order) => order.restaurantId === restaurantId)
    .map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        title: resolvePeachCloudOrderItemTitle(item, systemLanguage.value),
      })),
    }))
})
const recentOrders = computed(() => scopedFoodOrders.value.slice(0, 5))
const activePeachCloudOrder = computed(
  () => scopedFoodOrders.value.find((order) => order.id === peachCloudOrderId.value) || null,
)
const activeQuickServiceOrder = computed(
  () => scopedFoodOrders.value.find((order) => order.id === quickServiceOrderId.value) || null,
)
const activeJadeTableOrder = computed(
  () => scopedFoodOrders.value.find((order) => order.id === jadeTableOrderId.value) || null,
)
const activeLightFoodItem = computed(
  () => activeMenuItems.value.find((item) => item.id === lightFoodItemId.value) || null,
)
const activeLightFoodOrder = computed(
  () => scopedFoodOrders.value.find((order) => order.id === lightFoodOrderId.value) || null,
)
const sharedMealContactOptions = computed(() =>
  chatStore.contactsForList.filter((contact) => Number(contact.id) > 0).slice(0, 60),
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
  scopedFoodOrders.value
    .filter((order) => order.status === FOOD_DELIVERY_ORDER_STATUS.DELIVERED)
    .map((order) => {
      const sourceId = order.id
      const walletImported = Boolean(
        walletStore.findTransactionBySource(FOOD_DELIVERY_SOURCE_KEYS.WALLET_EXPENSE, sourceId),
      )
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
        imported:
          walletImported && (!relationshipSuggestion.available || relationshipSuggestion.imported),
        walletImported,
      }
    })
    .filter((suggestion) => Number(suggestion.amount) > 0)
    .slice(0, 6),
)
const hasStoreSupportContent = computed(
  () =>
    isStoreMode.value &&
    (scopedFoodOrders.value.length > 0 || walletExpenseSuggestions.value.length > 0),
)
const chatSourceOrderId = computed(() =>
  typeof route.query.orderId === 'string' ? route.query.orderId.trim() : '',
)
const isChatFoodDeliverySource = computed(
  () =>
    route.query.source === 'chat' &&
    route.query.intent === 'food_delivery_order' &&
    Boolean(chatSourceOrderId.value),
)
const openedFromAppStoreShopCreate = computed(
  () =>
    route.query.entry === 'shop' &&
    route.query.createShop === '1' &&
    (route.query.bindingTarget === SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY ||
      route.query.source === 'app_store'),
)
const chatSourceOrder = computed(() => {
  if (!chatSourceOrderId.value) return null
  return foodDeliveryStore.orders.find((order) => order.id === chatSourceOrderId.value) || null
})

watch(
  chatSourceOrder,
  (order) => {
    if (!order?.restaurantId) return
    const restaurant = foodDeliveryStore.findRestaurantById(order.restaurantId)
    if (!restaurant) return
    const targetTemplate = resolveStoreTemplateForRestaurant(restaurant)
    const usesDedicatedOrderPage = [
      'dessert_window',
      'quick_service_chain',
      'jade_table_menu',
      'minimal_light_food',
    ].includes(targetTemplate)
    const nextQuery = {
      ...route.query,
      category:
        restaurant.category ||
        order.items?.[0]?.category ||
        activeCategory.value?.key ||
        'restaurants',
      restaurantId: order.restaurantId,
      entry: 'shop',
    }
    if (usesDedicatedOrderPage) {
      nextQuery.shopView = 'order'
      nextQuery.shopOrderId = order.id
    } else {
      delete nextQuery.shopView
      delete nextQuery.shopOrderId
    }

    const routeAlreadyTargetsOrder =
      selectedRestaurantId.value === order.restaurantId &&
      String(route.query.shopView || '') === String(nextQuery.shopView || '') &&
      String(route.query.shopOrderId || '') === String(nextQuery.shopOrderId || '')
    if (routeAlreadyTargetsOrder) return
    router.replace({
      path: '/food-delivery',
      query: nextQuery,
    })
  },
  { immediate: true },
)

const isHighlightedOrder = (orderId) =>
  isChatFoodDeliverySource.value && orderId === chatSourceOrderId.value

const buildFoodDeliveryEventMapContext = (order, event) =>
  mapStore.buildDeliveryEventMapHandoff({
    ownerModule: 'food_delivery',
    order,
    event,
  })

const foodDeliveryEventTypeLabel = (type) => {
  if (type === FOOD_DELIVERY_ORDER_EVENT_TYPE.RIDER_DELAY) return t('骑手延迟', 'Rider delay')
  if (type === FOOD_DELIVERY_ORDER_EVENT_TYPE.RESTAURANT_CANCELLED)
    return t('商家取消', 'Restaurant cancelled')
  if (type === FOOD_DELIVERY_ORDER_EVENT_TYPE.ADDRESS_CHANGE)
    return t('地址变更', 'Address changed')
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
        ? t(
            `配送地址更新为 ${event.deliveryAddress}`,
            `Delivery address changed to ${event.deliveryAddress}`,
          )
        : event.etaMinutes !== null && event.etaMinutes !== undefined
          ? t(`预计 ${event.etaMinutes} 分钟送达`, `ETA ${event.etaMinutes} min`)
          : t('外卖履约状态有新变化。', 'Food delivery status changed.')),
  }))

const activeJadeTableEventRows = computed(() => orderEventRows(activeJadeTableOrder.value))
const activeJadeWalletSuggestion = computed(
  () =>
    walletExpenseSuggestions.value.find(
      (suggestion) => suggestion.orderId === activeJadeTableOrder.value?.id,
    ) || null,
)

const foodOrderItemSummary = (order = {}) =>
  (Array.isArray(order.items) ? order.items : [])
    .map((item) => {
      const title = String(item?.title || item?.menuItemTitle || '').trim()
      if (!title) return ''
      return `${title} × ${Math.max(1, Number(item?.quantity) || 1)}`
    })
    .filter(Boolean)
    .join(' · ')

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
    eventFeedback.value = t('配送更新已添加。', 'Delivery update added.')
    return
  }

  const reason = result.reason || result.log?.reason || result.evaluation?.reason || ''
  if (reason === 'cooldown_active') {
    eventFeedback.value = t(
      '暂时无法获取新进度，请稍后再试。',
      'Updates are temporarily unavailable. Try again in a moment.',
    )
    return
  }
  if (reason === 'daily_limit_reached') {
    eventFeedback.value = t(
      '今天暂无更多配送更新，请稍后再试。',
      'No more delivery updates are available today. Try again later.',
    )
    return
  }
  if (reason === 'module_events_disabled') {
    eventFeedback.value = t('配送更新当前不可用。', 'Delivery updates are unavailable right now.')
    return
  }
  eventFeedback.value = t(
    '暂时没有新的配送进度，请稍后再试。',
    'No delivery update is available right now. Try again later.',
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
  menuDraft.category =
    activeCategory.value?.key || activeRestaurant.value?.category || 'restaurants'
  menuDraft.menuSection = 'signature'
  menuDraft.price = ''
  menuDraft.desc = ''
  menuDraft.imageSourceType = 'none'
  menuDraft.imageUrl = ''
  menuDraft.imageGalleryAssetId = ''
}

const fillMenuItemEditDraft = (item) => {
  menuItemEditDraft.title = item?.title || ''
  menuItemEditDraft.desc = item?.desc || ''
  menuItemEditDraft.ingredients = item?.ingredients || ''
  menuItemEditDraft.imageSourceType = item?.image?.sourceType || 'none'
  menuItemEditDraft.imageUrl = item?.image?.sourceType === 'url' ? item.image.url || '' : ''
  menuItemEditDraft.imageGalleryAssetId =
    item?.image?.sourceType === 'gallery' ? item.image.galleryAssetId || '' : ''
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
  customFeedback.value = t(
    '自定义餐厅已加入外卖列表。',
    'Custom restaurant added to Food Delivery.',
  )
  resetRestaurantDraft()
  resetMenuDraft(restaurant.id)
  router.push({
    path: '/food-delivery',
    query: {
      ...worldAppRouteQuery.value,
      category: restaurant.category,
      ...(openedFromAppStoreShopCreate.value
        ? {
            entry: 'shop',
            createShop: '1',
            bindingTarget: SHOP_ENTRY_BINDING_TARGET.FOOD_DELIVERY,
            source: 'app_store',
          }
        : {}),
    },
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
    menuSection: menuDraft.menuSection,
    price: menuDraft.price,
    desc: menuDraft.desc,
    sourceModule: 'food_delivery_user_custom_menu',
    imageSourceType,
    imageUrl: imageSourceType === 'url' ? menuDraft.imageUrl : '',
    imageGalleryAssetId: imageSourceType === 'gallery' ? menuDraft.imageGalleryAssetId : '',
  })
  if (!item) {
    customFeedback.value = t(
      '请输入有效菜单名称、餐厅和价格。',
      'Please enter a valid menu name, restaurant, and price.',
    )
    return
  }
  customFeedback.value = t(
    '自定义菜单项已加入当前餐厅。',
    'Custom menu item added to the restaurant.',
  )
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

const selectPlatformMerchant = (merchant) => {
  if (!merchant?.id) return
  selectedPlatformMerchantId.value = merchant.id
  platformMerchantSheetOpen.value = true
}

const closePlatformMerchantSheet = () => {
  platformMerchantSheetOpen.value = false
}

const isPlatformMerchantSaved = (merchantId) => platformSavedMerchantIds.value.includes(merchantId)

const togglePlatformMerchantSaved = (merchant) => {
  if (!merchant?.id) return
  platformSavedMerchantIds.value = isPlatformMerchantSaved(merchant.id)
    ? platformSavedMerchantIds.value.filter((merchantId) => merchantId !== merchant.id)
    : [...platformSavedMerchantIds.value, merchant.id]
}

const openPlatformUtilitySheet = (key) => {
  platformUtilitySheetKey.value = key
}

const closePlatformUtilitySheet = () => {
  platformUtilitySheetKey.value = ''
}

const browsePlatformMerchantsFromUtilitySheet = () => {
  closePlatformUtilitySheet()
  platformMerchantListExpanded.value = true
  openPlatformPage('home')
}

const openPlatformCampaign = (campaignId) => {
  const id = String(campaignId || '').trim()
  if (!FOOD_PLATFORM_AD_BANNERS.some((campaign) => campaign.id === id)) return
  platformAddressMenuOpen.value = false
  closePlatformUtilitySheet()
  return router.push({
    path: '/food-delivery',
    query: {
      ...worldAppRouteQuery.value,
      category: activeCategory.value?.key || 'nearby',
      platformView: 'campaign',
      platformCampaign: id,
    },
  })
}

const handlePlatformBanner = (banner) => {
  pausePlatformBannerAutoplay()
  openPlatformCampaign(banner?.id)
}

const handlePlatformCampaignPrimary = () => {
  const campaign = activePlatformCampaign.value
  if (!campaign) return
  if (campaign.id === 'club_free_delivery' && !platformBenefitClaimed.value) {
    platformBenefitClaimed.value = true
    return
  }
  if (campaign.id === 'club_free_delivery' && platformCampaignMerchants.value[0]) {
    selectPlatformMerchant(platformCampaignMerchants.value[0])
    return
  }
  if (campaign.kind === 'lottery') {
    if (platformCampaignPrize.value) return
    const prizes = campaign.prizes || []
    const prize = prizes[Math.floor(Math.random() * prizes.length)]
    if (prize) platformCampaignPrizeId.value = prize.id
    return
  }
  if (campaign.kind === 'menu' && platformCampaignMenuPicks.value[0]?.merchant) {
    selectPlatformMerchant(platformCampaignMenuPicks.value[0].merchant)
    return
  }
  openCategory(campaign.targetCategory || 'nearby')
}

const handlePlatformCampaignPosterImageError = (event) => {
  const image = event?.currentTarget
  if (!image) return
  image.onerror = null
  image.src = activePlatformCampaign.value?.imageUrl || platformMissingAssetPlaceholderUrl
}

const platformBannerSlides = () => {
  const rail = platformBannerRailRef.value
  return rail ? Array.from(rail.querySelectorAll('[data-platform-banner-slide]')) : []
}

const pausePlatformBannerAutoplay = (duration = PLATFORM_BANNER_INTERACTION_PAUSE_MS) => {
  platformBannerInteractionPauseUntil = Date.now() + duration
  platformBannerProgrammaticScrollUntil = 0
}

const scrollPlatformBannerTo = (index, { behavior = 'smooth', pause = false } = {}) => {
  const rail = platformBannerRailRef.value
  const slides = platformBannerSlides()
  if (!rail || slides.length === 0) return false
  const normalizedIndex = (((Number(index) || 0) % slides.length) + slides.length) % slides.length
  const firstOffset = slides[0]?.offsetLeft || 0
  const targetLeft = Math.max(0, (slides[normalizedIndex]?.offsetLeft || 0) - firstOffset)
  platformActiveBannerIndex.value = normalizedIndex
  if (pause) pausePlatformBannerAutoplay()
  platformBannerProgrammaticScrollUntil = behavior === 'smooth' ? Date.now() + 700 : 0
  if (typeof rail.scrollTo === 'function') {
    rail.scrollTo({ left: targetLeft, behavior })
  } else {
    rail.scrollLeft = targetLeft
  }
  return true
}

const handlePlatformBannerRailScroll = () => {
  if (Date.now() < platformBannerProgrammaticScrollUntil) return
  const rail = platformBannerRailRef.value
  const slides = platformBannerSlides()
  if (!rail || slides.length === 0) return
  const firstOffset = slides[0]?.offsetLeft || 0
  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY
  slides.forEach((slide, index) => {
    const distance = Math.abs(rail.scrollLeft - ((slide.offsetLeft || 0) - firstOffset))
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  })
  platformActiveBannerIndex.value = closestIndex
}

const holdPlatformBannerAutoplay = () => {
  platformBannerAutoplayPaused.value = true
}

const releasePlatformBannerAutoplay = (event) => {
  if (event?.currentTarget?.contains?.(event.relatedTarget)) return
  platformBannerAutoplayPaused.value = false
}

const advancePlatformBanner = () => {
  if (platformPageKey.value !== 'home' || isStoreMode.value) return
  if (platformBannerAutoplayPaused.value || Date.now() < platformBannerInteractionPauseUntil) return
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
    return
  scrollPlatformBannerTo(platformActiveBannerIndex.value + 1)
}

const startPlatformBannerAutoplay = () => {
  if (platformBannerAutoplayTimerId || typeof window === 'undefined') return
  platformBannerAutoplayTimerId = window.setInterval(
    advancePlatformBanner,
    PLATFORM_BANNER_AUTOPLAY_MS,
  )
}

const stopPlatformBannerAutoplay = () => {
  if (!platformBannerAutoplayTimerId || typeof window === 'undefined') return
  window.clearInterval(platformBannerAutoplayTimerId)
  platformBannerAutoplayTimerId = null
}

const handleFoodDeliveryAssetError = (event) => {
  const image = event?.target
  if (!image || image.tagName !== 'IMG' || image.dataset.assetFallbackApplied === 'true') return
  image.dataset.assetFallbackApplied = 'true'
  image.dataset.assetMissing = 'true'
  image.style.objectFit = 'contain'
  image.style.backgroundColor = 'rgba(255,255,255,0.92)'
  image.style.padding = '6px'
  image.src = platformMissingAssetPlaceholderUrl
}

const togglePlatformAddressMenu = () => {
  platformAddressMenuOpen.value = !platformAddressMenuOpen.value
}

const selectPlatformDeliveryAddress = (address) => {
  selectedPlatformDeliveryAddress.value = address
  platformAddressMenuOpen.value = false
}

const platformMenuItemId = (merchantId, itemIndex) => `${merchantId}_menu_${itemIndex + 1}`
const platformMenuItemAssetPath = (merchant = {}, itemIndex = 0) =>
  `platform/menus/${merchant.assetKey || merchant.id || 'merchant'}/menu-item-${String(itemIndex + 1).padStart(2, '0')}.png`
const platformMenuItemImageUrl = (merchant = {}, item = {}, itemIndex = 0) =>
  item.imageUrl || foodDeliveryUiAsset(platformMenuItemAssetPath(merchant, itemIndex))

const platformCartItemQuantity = (merchantId, itemIndex) => {
  const itemId = platformMenuItemId(merchantId, itemIndex)
  return foodDeliveryStore.platformCartItems.find((item) => item.itemId === itemId)?.quantity || 0
}

const addPlatformMenuItemToCart = (item, itemIndex) => {
  const merchant = selectedPlatformMerchant.value
  if (!merchant || !item) return
  const addedItem = foodDeliveryStore.addPlatformCartItem({
    merchantId: merchant.id,
    merchantName: merchant.name,
    itemId: platformMenuItemId(merchant.id, itemIndex),
    title: item.title,
    price: item.price,
    sourceModule: 'food_delivery_platform_cart',
    sourceId: merchant.id,
  })
  if (!addedItem) return
  platformCartFeedback.value = t(`${item.title} 已加入购物车。`, `${item.title} was added to cart.`)
}

const updatePlatformCartItemQuantity = (itemId, quantity) => {
  foodDeliveryStore.updatePlatformCartQuantity(itemId, quantity)
}

const platformCartLineTotal = (item = {}) =>
  displayMoney(((Number(item.unitPriceCents) * Number(item.quantity)) / 100).toFixed(2))

const openPlatformCartFromMerchant = () => {
  closePlatformMerchantSheet()
  openPlatformUtilitySheet('cart')
}

const openMenuItemDetail = (menuItemId) => {
  const item = foodDeliveryStore.findMenuItemById(menuItemId)
  if (!item) return
  selectedMenuItemId.value = item.id
  menuDetailMode.value = 'detail'
  menuDetailFeedback.value = ''
  menuDetailQuantity.value = 1
  fillMenuItemEditDraft(item)
}

const closeMenuItemDetail = () => {
  selectedMenuItemId.value = ''
  menuDetailMode.value = 'detail'
  menuDetailFeedback.value = ''
  menuDetailQuantity.value = 1
}

const startMenuItemEdit = () => {
  if (!selectedMenuItemSource.value) return
  fillMenuItemEditDraft(selectedMenuItemSource.value)
  menuDetailMode.value = 'edit'
  menuDetailFeedback.value = ''
}

const cancelMenuItemEdit = () => {
  if (selectedMenuItemSource.value) fillMenuItemEditDraft(selectedMenuItemSource.value)
  menuDetailMode.value = 'detail'
  menuDetailFeedback.value = ''
}

const decreaseMenuDetailQuantity = () => {
  menuDetailQuantity.value = Math.max(1, (Number(menuDetailQuantity.value) || 1) - 1)
}

const increaseMenuDetailQuantity = () => {
  menuDetailQuantity.value = Math.min(99, (Number(menuDetailQuantity.value) || 1) + 1)
}

const saveMenuItemEdit = () => {
  const item = selectedMenuItemSource.value
  if (!item) return
  const imageSourceType = menuItemEditDraft.imageSourceType
  const updatedItem = foodDeliveryStore.upsertMenuItem({
    id: item.id,
    restaurantId: item.restaurantId,
    title: menuItemEditDraft.title,
    category: item.category,
    menuSection: item.menuSection || 'signature',
    price: item.price,
    desc: menuItemEditDraft.desc,
    ingredients: menuItemEditDraft.ingredients,
    sourceModule: item.sourceModule || 'food_delivery_menu',
    sourceId: item.sourceId || '',
    imageSourceType,
    imageUrl: imageSourceType === 'url' ? menuItemEditDraft.imageUrl : '',
    imageGalleryAssetId: imageSourceType === 'gallery' ? menuItemEditDraft.imageGalleryAssetId : '',
  })
  if (!updatedItem) {
    menuDetailFeedback.value = t('请输入有效菜品名称。', 'Please enter a valid item name.')
    return
  }
  selectedMenuItemId.value = updatedItem.id
  fillMenuItemEditDraft(updatedItem)
  menuDetailMode.value = 'detail'
  menuDetailFeedback.value = t('菜品已更新。', 'Menu item updated.')
}

const openCategory = (key) => {
  router.push({
    path: '/food-delivery',
    query: { ...worldAppRouteQuery.value, category: key },
  })
}

const openPlatformPage = (key) => {
  const pageKey = [
    'campaign',
    'search',
    'saved',
    'profile',
    'checkout',
    'orders',
    'order',
  ].includes(key)
    ? key
    : 'home'
  platformAddressMenuOpen.value = false
  closePlatformUtilitySheet()
  if (pageKey === 'home') {
    platformSearchQuery.value = ''
  }
  return router.push({
    path: '/food-delivery',
    query: {
      ...worldAppRouteQuery.value,
      category:
        pageKey === 'home' && key === 'home' ? 'nearby' : activeCategory.value?.key || 'nearby',
      ...(pageKey === 'home' ? {} : { platformView: pageKey }),
      ...(pageKey === 'campaign' && platformCampaignKey.value
        ? { platformCampaign: platformCampaignKey.value }
        : {}),
      ...(pageKey === 'order' && platformOrderId.value
        ? { platformOrderId: platformOrderId.value }
        : {}),
    },
  })
}

const returnToPlatformCart = async () => {
  await openPlatformPage('home')
  openPlatformUtilitySheet('cart')
}

const openPlatformOrder = (orderId) => {
  const id = String(orderId || '').trim()
  if (!id) return
  platformAddressMenuOpen.value = false
  closePlatformUtilitySheet()
  router.push({
    path: '/food-delivery',
    query: {
      ...worldAppRouteQuery.value,
      category: activeCategory.value?.key || 'nearby',
      platformView: 'order',
      platformOrderId: id,
    },
  })
}

const openPlatformCategory = (category) => {
  const filterKey = FOOD_PLATFORM_CATEGORY_KEYS.has(category?.key) ? category.key : 'all'
  router.push({
    path: '/food-delivery',
    query: {
      ...worldAppRouteQuery.value,
      category: category?.categoryKey || 'nearby',
      platformFilter: filterKey,
    },
  })
}

const focusPlatformSearch = () => {
  platformSearchInputRef.value?.focus?.()
}

const handlePlatformNavItem = (item) => {
  closePlatformUtilitySheet()
  if (item.key === 'home') {
    platformSearchQuery.value = ''
    platformMerchantListExpanded.value = false
    openPlatformPage('home')
    return
  }
  if (item.key === 'search') {
    openPlatformPage('search')
    return
  }
  if (item.key === 'saved') {
    openPlatformPage('saved')
    return
  }
  if (item.key === 'orders') {
    openPlatformPage('orders')
    return
  }
  if (item.key === 'profile') {
    openPlatformPage('profile')
  }
}

const openPlatformCheckout = () => {
  platformCheckoutFeedback.value = ''
  if (foodDeliveryStore.platformCartItems.length === 0) {
    platformCartFeedback.value = t(
      '购物车还是空的，先选择菜品。',
      'Your cart is empty. Choose an item first.',
    )
    return
  }
  closePlatformUtilitySheet()
  openPlatformPage('checkout')
}

const submitPlatformOrder = () => {
  platformCheckoutFeedback.value = ''
  const merchant = platformCartMerchant.value
  if (!merchant || foodDeliveryStore.platformCartItems.length === 0) {
    platformCheckoutFeedback.value = t(
      '购物车已清空，请返回小店重新选择。',
      'The cart is empty. Return to the shop and choose items again.',
    )
    return
  }
  const order = foodDeliveryStore.checkoutPlatformCart({
    deliveryAddress: platformLocationLabel.value,
    note: platformCheckoutNote.value,
    paymentMethod: platformCheckoutPaymentMethod.value,
    deliveryFee: merchant.deliveryFee,
    etaMinutes: merchant.deliveryEtaMinutes,
  })
  if (!order) {
    platformCheckoutFeedback.value = t(
      '订单没有提交，请检查购物车。',
      'The order was not placed. Check the cart.',
    )
    return
  }
  platformCheckoutNote.value = ''
  openPlatformOrder(order.id)
}

const platformPaymentMethodLabel = (paymentMethod) =>
  platformCheckoutPaymentOptions.value.find((option) => option.key === paymentMethod)?.label ||
  t('平台支付', 'Platform pay')

const copyPlatformOrderNumber = async (order = {}) => {
  platformOrderCopyFeedback.value = ''
  try {
    if (!navigator?.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(platformOrderNumber(order))
    platformOrderCopyFeedback.value = t('订单号已复制', 'Order number copied')
  } catch {
    platformOrderCopyFeedback.value = t('复制失败，请稍后重试', 'Copy failed. Please retry')
  }
}

const restoreShopCartReplacementFocus = async () => {
  const triggerElement = shopCartReplacementTriggerElement
  shopCartReplacementTriggerElement = null
  await nextTick()
  if (triggerElement?.isConnected) triggerElement.focus?.()
}

const cancelShopCartReplacement = async () => {
  if (!shopCartReplacementOpen.value) return
  shopCartReplacementOpen.value = false
  pendingShopCartAddition.value = null
  await restoreShopCartReplacementFocus()
}

const cartIntentSignature = () => JSON.stringify(foodDeliveryStore.cartItems)

const rejectStaleShopCartReplacement = async () => {
  const feedback = t(
    '店铺或购物袋已经变化，本次替换未执行。请确认当前购物袋后重新加购。',
    'The shop or bag changed, so replacement was not completed. Review the current bag and add again.',
  )
  shopCartReplacementOpen.value = false
  pendingShopCartAddition.value = null
  storeNavigationFeedback.value = feedback
  checkoutFeedback.value = feedback
  await restoreShopCartReplacementFocus()
}

const commitMenuItemToCart = (menuItemId, quantity = 1) => {
  const added = foodDeliveryStore.addToCart(menuItemId, quantity, {
    sourceModule: FOOD_DELIVERY_SOURCE_KEYS.CHAT_FOOD_DELIVERY_PUSH,
  })
  storeNavigationFeedback.value = ''
  checkoutFeedback.value = ''
  return added
}

const addMenuItemToCart = async (menuItemId, quantity = 1, triggerElement = null) => {
  const menuItem = foodDeliveryStore.findMenuItemById(menuItemId)
  if (!menuItem || menuItem.available === false) return null
  const cartHasItems = foodDeliveryStore.cartItems.length > 0
  const cartMatchesMenuRestaurant =
    cartHasItems &&
    cartLineRestaurantIds.value.every((restaurantId) => restaurantId === menuItem.restaurantId)
  if (cartHasItems && !cartMatchesMenuRestaurant) {
    const previousOwnerLabel =
      cartOwnershipState.value === 'mixed'
        ? t('多个店铺', 'Multiple shops')
        : foreignCartRestaurant.value?.name || cartOwnershipRestaurantNames.value
    pendingShopCartAddition.value = {
      menuItemId: menuItem.id,
      menuItemTitle: menuItem.title,
      quantity: Math.min(99, Math.max(1, Math.trunc(Number(quantity) || 1))),
      nextRestaurant: foodDeliveryStore.findRestaurantById(menuItem.restaurantId),
      nextRestaurantId: menuItem.restaurantId,
      previousOwnerLabel,
      capturedCartSignature: cartIntentSignature(),
      capturedRestaurantIds: JSON.stringify(cartLineRestaurantIds.value),
      capturedOwnershipState: cartOwnershipState.value,
      requiresExplicitClear: cartOwnershipState.value === 'mixed',
    }
    shopCartReplacementTriggerElement =
      triggerElement || (typeof document !== 'undefined' ? document.activeElement : null)
    shopCartReplacementOpen.value = true
    await nextTick()
    shopCartReplacementCancelRef.value?.focus?.()
    return null
  }
  return commitMenuItemToCart(menuItem.id, quantity)
}

const confirmShopCartReplacement = async () => {
  const pendingAddition = pendingShopCartAddition.value
  if (!pendingAddition || !shopCartReplacementOpen.value) return
  const currentMenuItem = foodDeliveryStore.findMenuItemById(pendingAddition.menuItemId)
  const intentIsCurrent =
    Boolean(currentMenuItem) &&
    currentMenuItem.available !== false &&
    currentMenuItem.restaurantId === pendingAddition.nextRestaurantId &&
    activeRestaurant.value?.id === pendingAddition.nextRestaurantId &&
    cartIntentSignature() === pendingAddition.capturedCartSignature &&
    JSON.stringify(cartLineRestaurantIds.value) === pendingAddition.capturedRestaurantIds &&
    cartOwnershipState.value === pendingAddition.capturedOwnershipState
  if (!intentIsCurrent) {
    await rejectStaleShopCartReplacement()
    return
  }
  shopCartReplacementOpen.value = false
  pendingShopCartAddition.value = null
  if (pendingAddition.requiresExplicitClear) foodDeliveryStore.clearCart()
  commitMenuItemToCart(currentMenuItem.id, pendingAddition.quantity)
  await restoreShopCartReplacementFocus()
}

const setCartOwnershipCheckoutFeedback = () => {
  checkoutFeedback.value =
    cartOwnershipState.value === 'mixed'
      ? t(
          '恢复的购物袋包含多个店铺，不能在当前店结算。请浏览当前店并通过替换确认恢复为单店购物袋。',
          'The restored bag contains multiple shops and cannot be checked out here. Browse this shop and confirm replacement to recover a single-shop bag.',
        )
      : t(
          `购物袋属于 ${foreignCartRestaurant.value?.name || '另一家店'}。请返回该店结算，或先在当前店加购并确认替换。`,
          `This bag belongs to ${foreignCartRestaurant.value?.name || 'another shop'}. Return there to check out, or add an item here and confirm replacement.`,
        )
}

const openCheckoutSheet = () => {
  checkoutFeedback.value = ''
  if (!isStoreMode.value) {
    checkoutFeedback.value = t('请先进入一家小店。', 'Open a shop first.')
    return
  }
  if (hasCartOwnershipConflict.value) {
    setCartOwnershipCheckoutFeedback()
    return
  }
  if (activeStoreCartLineItems.value.length === 0) {
    checkoutFeedback.value = t('请先选择一份菜品。', 'Choose a dish first.')
    return
  }
  checkoutSheetOpen.value = true
}

const closeCheckoutSheet = () => {
  checkoutSheetOpen.value = false
}

const checkoutFoodDelivery = () => {
  checkoutFeedback.value = ''
  if (!activeRestaurant.value?.id || !activeStoreOwnsCart.value) {
    checkoutSheetOpen.value = false
    if (hasCartOwnershipConflict.value) setCartOwnershipCheckoutFeedback()
    else
      checkoutFeedback.value = t(
        '购物袋已清空，请重新选择餐品。',
        'Your bag is empty. Choose items again.',
      )
    return
  }
  const mapHandoff = activeMapHandoff.value
  const relationshipTarget = activeRestaurant.value
    ? selectedSharedMealContact(activeRestaurant.value.id)
    : null
  const order = foodDeliveryStore.checkoutCart({
    deliveryAddress:
      mapHandoff.deliveryAddress || t('Map 当前配送地址', 'Current Map delivery address'),
    note:
      activeMapHandoffRouteSummary.value || t('外卖模块基础订单', 'Food Delivery baseline order'),
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
  if (!order) {
    checkoutFeedback.value = t(
      '订单没有提交，请确认购物车。',
      'Order was not placed. Check the cart.',
    )
    return
  }
  checkoutSheetOpen.value = false
  checkoutFeedback.value = t(
    '订单已提交，可在本店订单里查看。',
    'Order placed. You can track it in this shop.',
  )
  if (isDessertWindowStore.value) {
    void openPeachCloudPage('order', { shopOrderId: order.id })
  }
  if (isQuickServiceStore.value) {
    void openQuickServicePage('order', { shopOrderId: order.id })
  }
  if (isJadeTableStore.value) {
    void openJadeTablePage('order', { shopOrderId: order.id })
  }
  if (isLightFoodStore.value) {
    void openLightFoodPage('order', { shopOrderId: order.id })
  }
}

const markFoodOrderDelivered = (orderId) =>
  foodDeliveryStore.updateOrderStatus(orderId, FOOD_DELIVERY_ORDER_STATUS.DELIVERED)

const removeFoodOrder = (orderId) => {
  if (!foodDeliveryStore.removeOrder(orderId)) return
  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.FOOD_DELIVERY_SHARED_MEAL,
    orderId,
  )
  const walletTransaction = walletStore.findTransactionBySource(
    FOOD_DELIVERY_SOURCE_KEYS.WALLET_EXPENSE,
    orderId,
  )
  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.WALLET_ORDER_SUPPORT,
    walletTransaction?.id || walletTransaction?.sourceId || orderId,
  )
  delete sharedMealTargets[orderId]
}

const transferFoodSuggestionToWallet = (suggestion) => {
  if (!suggestion || suggestion.imported) return null
  const existing = walletStore.findTransactionBySource(
    FOOD_DELIVERY_SOURCE_KEYS.WALLET_EXPENSE,
    suggestion.sourceId,
  )
  const transaction =
    existing ||
    walletStore.addTransaction({
      type: 'expense',
      title: 'Food Delivery order',
      amount: suggestion.amount,
      currency: suggestion.currency,
      counterparty: suggestion.restaurantName || 'Food Delivery',
      note: t(
        'Manually imported from a Food Delivery order.',
        'Manually imported from a Food Delivery order.',
      ),
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

const foodDeliveryRequiredAssetPath = (item) => {
  const url = foodImageUrl(item)
  const marker = 'images/ui-assets/apps/food-delivery/'
  const markerIndex = url.indexOf(marker)
  return markerIndex >= 0 ? url.slice(markerIndex + marker.length) : ''
}

const handleFoodShopImageError = (event) => {
  const image = event?.currentTarget
  if (!image || image.dataset.fallbackApplied === 'true') return
  image.dataset.fallbackApplied = 'true'
  image.src = platformMissingAssetPlaceholderUrl
}

const scrollToStoreSurface = async (testId) => {
  await nextTick()
  if (typeof document === 'undefined') return false
  const target = document.querySelector(`[data-testid="${testId}"]`)
  if (!target) return false
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return true
}

const focusStoreMenuSection = async (sectionKey = 'all') => {
  const nextSection = activeStoreMenuSections.value.some((section) => section.key === sectionKey)
    ? sectionKey
    : 'all'
  activeStoreMenuSectionKey.value = nextSection
  storeNavigationFeedback.value = ''
  await scrollToStoreSurface('food-delivery-menu-panel')
}

const openPeachCloudPage = async (pageKey = 'home', extraQuery = {}) => {
  const nextPageKey = PEACH_CLOUD_PAGE_KEYS.has(pageKey) ? pageKey : 'home'
  const nextQuery = { ...route.query, ...extraQuery }
  if (nextPageKey === 'home') delete nextQuery.shopView
  else nextQuery.shopView = nextPageKey
  if (nextPageKey !== 'order') delete nextQuery.shopOrderId

  const routeChanged =
    peachCloudPageKey.value !== nextPageKey ||
    String(route.query.shopOrderId || '') !== String(nextQuery.shopOrderId || '')
  if (routeChanged) {
    await router.push({ path: route.path, query: nextQuery })
  }
  await scrollToStoreSurface('food-delivery-store-shell')
}

const openPeachCloudHome = async () => {
  activeStoreMenuSectionKey.value = 'all'
  peachCloudSearchQuery.value = ''
  storeNavigationFeedback.value = ''
  await openPeachCloudPage('home')
}

const focusPeachCloudSearch = async () => {
  activeStoreMenuSectionKey.value = PEACH_CLOUD_MENU_SHORTCUTS[0].key
  storeNavigationFeedback.value = ''
  await openPeachCloudPage('search')
  await nextTick()
  peachCloudSearchInputRef.value?.focus?.()
}

const openPeachCloudNew = async () => {
  activeStoreMenuSectionKey.value = 'seasonal_drop'
  storeNavigationFeedback.value = ''
  await openPeachCloudPage('new')
}

const openPeachCloudOrder = async (orderId) => {
  if (!orderId) return
  await openPeachCloudPage('order', { shopOrderId: orderId })
}

const openQuickServicePage = async (pageKey = 'home', extraQuery = {}) => {
  const nextPageKey = QUICK_SERVICE_PAGE_KEYS.has(pageKey) ? pageKey : 'home'
  const nextQuery = { ...route.query, ...extraQuery }
  if (nextPageKey === 'home') delete nextQuery.shopView
  else nextQuery.shopView = nextPageKey
  if (nextPageKey !== 'order') delete nextQuery.shopOrderId

  const routeChanged =
    quickServicePageKey.value !== nextPageKey ||
    String(route.query.shopOrderId || '') !== String(nextQuery.shopOrderId || '')
  if (routeChanged) {
    await router.push({ path: route.path, query: nextQuery })
  }
  await scrollToStoreSurface('food-delivery-store-shell')
}

const openJadeTablePage = async (pageKey = 'home', extraQuery = {}) => {
  const nextPageKey = JADE_TABLE_PAGE_KEYS.has(pageKey) ? pageKey : 'home'
  const nextQuery = { ...route.query, ...extraQuery }
  if (nextPageKey === 'home') delete nextQuery.shopView
  else nextQuery.shopView = nextPageKey
  if (nextPageKey !== 'order') delete nextQuery.shopOrderId

  const routeChanged =
    jadeTablePageKey.value !== nextPageKey ||
    String(route.query.shopOrderId || '') !== String(nextQuery.shopOrderId || '')
  if (routeChanged) {
    await router.push({ path: route.path, query: nextQuery })
  }
  await scrollToStoreSurface('food-delivery-store-shell')
}

const openLightFoodPage = async (pageKey = 'home', extraQuery = {}) => {
  const nextPageKey = LIGHT_FOOD_PAGE_KEYS.has(pageKey) ? pageKey : 'home'
  const nextQuery = { ...route.query, ...extraQuery }
  if (nextPageKey === 'home') delete nextQuery.shopView
  else nextQuery.shopView = nextPageKey
  if (nextPageKey !== 'detail') delete nextQuery.shopItemId
  if (nextPageKey !== 'order') delete nextQuery.shopOrderId

  const routeChanged =
    lightFoodPageKey.value !== nextPageKey ||
    String(route.query.shopItemId || '') !== String(nextQuery.shopItemId || '') ||
    String(route.query.shopOrderId || '') !== String(nextQuery.shopOrderId || '')
  if (routeChanged) {
    await router.push({ path: route.path, query: nextQuery })
  }
  await scrollToStoreSurface('food-delivery-store-shell')
}

const openLightFoodItem = async (itemId) => {
  if (!itemId) return
  await openLightFoodPage('detail', { shopItemId: itemId })
}

const openForeignCartShop = async () => {
  const restaurant = foreignCartRestaurant.value
  if (!restaurant?.id) return
  checkoutFeedback.value = ''
  const nextQuery = {
    ...route.query,
    category: restaurant.category || route.query.category,
    restaurantId: restaurant.id,
    entry: 'shop',
  }
  delete nextQuery.shopOrderId
  const targetTemplate = resolveStoreTemplateForRestaurant(restaurant)
  if (
    targetTemplate === 'dessert_window' ||
    targetTemplate === 'quick_service_chain' ||
    targetTemplate === 'jade_table_menu' ||
    targetTemplate === 'minimal_light_food'
  ) {
    nextQuery.shopView = 'bag'
  } else {
    delete nextQuery.shopView
  }
  await router.push({ path: route.path, query: nextQuery })
  await nextTick()
  if (
    !isDessertWindowStore.value &&
    !isQuickServiceStore.value &&
    !isJadeTableStore.value &&
    !isLightFoodStore.value
  ) {
    await scrollToStoreSurface('food-delivery-cart-panel')
  }
}

const browseActiveStoreFromForeignCart = async () => {
  checkoutFeedback.value = ''
  if (isDessertWindowStore.value) {
    await openPeachCloudHome()
    return
  }
  if (isQuickServiceStore.value) {
    await openQuickServicePage('menu')
    return
  }
  if (isJadeTableStore.value) {
    await openJadeTablePage('menu')
    return
  }
  if (isLightFoodStore.value) {
    await openLightFoodPage('menu')
    return
  }
  await scrollToStoreSurface('food-delivery-menu-panel')
}

const showPeachCloudUpdates = async () => {
  if (isDessertWindowStore.value) {
    await openPeachCloudPage('orders')
    return
  }
  storeNavigationFeedback.value = hasStoreSupportContent.value
    ? t('有新的配送进度，可在订单中查看。', 'Delivery updates are ready in Orders.')
    : t('目前没有新消息。', 'You are all caught up.')
}

const openStoreCartSurface = async () => {
  if (isDessertWindowStore.value) {
    storeNavigationFeedback.value = ''
    await openPeachCloudPage('bag')
    return
  }
  if (foodDeliveryStore.cartLineItems.length === 0) {
    storeNavigationFeedback.value = t(
      '购物袋还是空的，先选一杯或一份甜点。',
      'Your bag is empty. Pick a drink or dessert first.',
    )
    return
  }
  storeNavigationFeedback.value = ''
  await scrollToStoreSurface('food-delivery-cart-panel')
}

const openStoreOrdersSurface = async () => {
  if (isDessertWindowStore.value) {
    storeNavigationFeedback.value = ''
    await openPeachCloudPage('orders')
    return
  }
  if (!hasStoreSupportContent.value) {
    storeNavigationFeedback.value = t(
      '还没有本店订单。下单后可在这里查看配送进度。',
      'No shop orders yet. Delivery progress appears here after checkout.',
    )
    return
  }
  storeNavigationFeedback.value = ''
  await nextTick()
  if (typeof document === 'undefined') return
  const drawer = document.querySelector('[data-testid="food-delivery-store-support-drawer"]')
  if (drawer) drawer.open = true
  await scrollToStoreSurface('food-delivery-store-support-drawer')
}

const foodImageSourceLabel = (item) => {
  const sourceType = item?.image?.sourceType || 'none'
  if (sourceType === 'url') return t('URL image', 'URL image')
  if (sourceType === 'gallery') return t('Gallery asset', 'Gallery asset')
  if (sourceType === 'ai') return t('AI image reserved', 'AI image reserved')
  return t('Default icon', 'Default icon')
}

watch(
  () => walletStore.primaryCurrency,
  (currency) => {
    foodDeliveryStore.setPrimaryCurrency(currency || 'CNY')
  },
  { immediate: true },
)

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
    activeStoreMenuSectionKey.value = 'all'
    storeNavigationFeedback.value = ''
    if (selectedMenuItem.value && selectedMenuItem.value.restaurantId !== restaurantId) {
      closeMenuItemDetail()
    }
    if (!menuDraft.restaurantId || !foodDeliveryStore.findRestaurantById(menuDraft.restaurantId)) {
      menuDraft.restaurantId = restaurantId
    }
  },
  { immediate: true },
)

watch(
  activeStoreMenuSections,
  (sections) => {
    if (sections.some((section) => section.key === activeStoreMenuSectionKey.value)) return
    activeStoreMenuSectionKey.value = sections[0]?.key || 'all'
  },
  { immediate: true },
)

watch(
  peachCloudPageKey,
  (pageKey) => {
    if (pageKey === 'search' && activeStoreMenuSectionKey.value === 'all') {
      activeStoreMenuSectionKey.value = PEACH_CLOUD_MENU_SHORTCUTS[0].key
    }
  },
  { immediate: true },
)

watch(platformPageKey, () => {
  platformActiveBannerIndex.value = 0
  platformBannerAutoplayPaused.value = false
  platformBannerInteractionPauseUntil = 0
  platformBannerProgrammaticScrollUntil = 0
})

watch(
  () =>
    [
      activeStorePresentation.value?.coverGalleryAssetId || '',
      ...activeRestaurants.value.map((restaurant) => restaurant.image?.galleryAssetId || ''),
      ...activeMenuItems.value.map((item) => item.image?.galleryAssetId || ''),
    ].filter(Boolean),
  (assetIds) => {
    const activeSet = new Set(assetIds)
    assetIds.forEach((assetId) => {
      if (foodImagePreviewMap[assetId]) return
      void galleryStore
        .getAssetPreviewUrl(assetId, {
          scopeId: FOOD_DELIVERY_IMAGE_PREVIEW_SCOPE_ID,
        })
        .then((previewUrl) => {
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

onMounted(() => {
  startPlatformBannerAutoplay()
})

onBeforeUnmount(() => {
  stopPlatformBannerAutoplay()
  galleryStore.releaseAssetPreviewScope(FOOD_DELIVERY_IMAGE_PREVIEW_SCOPE_ID)
  Object.keys(foodImagePreviewMap).forEach((assetId) => {
    delete foodImagePreviewMap[assetId]
  })
})
</script>

<template>
  <div
    class="h-screen min-h-screen overflow-x-hidden overflow-y-auto overscroll-contain text-gray-950"
    :class="[
      foodDeliveryShellClass,
      isDedicatedStoreApp ? 'p-0 pb-0' : 'p-4',
      isStoreMode && !isDedicatedStoreApp ? 'pb-6' : '',
    ]"
    :style="foodDeliveryShellStyle"
    data-testid="food-delivery-view"
    @error.capture="handleFoodDeliveryAssetError"
  >
    <div class="mx-auto max-w-md" :class="isDedicatedStoreApp ? 'space-y-0' : 'space-y-4'">
      <section
        v-if="!isStoreMode && platformPageKey === 'home'"
        class="space-y-5 pt-1"
        data-testid="food-delivery-platform-top"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <button
              type="button"
              class="block max-w-full text-left"
              data-testid="food-delivery-go-home"
              aria-label="Home"
              @click="goHome"
            >
              <h1
                class="max-w-full break-words text-[1.72rem] font-black leading-tight text-gray-950 [overflow-wrap:anywhere]"
                data-testid="food-delivery-hero-title"
              >
                {{ foodDeliveryTitle }}
              </h1>
            </button>
            <div class="relative mt-3">
              <button
                type="button"
                class="inline-flex max-w-full items-center gap-2.5 text-left"
                data-testid="food-delivery-platform-location"
                :aria-expanded="platformAddressMenuOpen"
                @click="togglePlatformAddressMenu"
              >
                <span
                  class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e5fbfa] text-[#24bcb7]"
                >
                  <i class="fas fa-location-dot text-sm"></i>
                </span>
                <span class="min-w-0">
                  <span class="block text-[0.62rem] font-black uppercase text-[#159f9a]">{{
                    t('配送到', 'Deliver to')
                  }}</span>
                  <span class="block truncate text-[0.82rem] font-black text-gray-950">{{
                    platformLocationLabel
                  }}</span>
                </span>
                <i
                  class="fas shrink-0 text-xs text-gray-500"
                  :class="platformAddressMenuOpen ? 'fa-chevron-up' : 'fa-chevron-down'"
                ></i>
              </button>
              <div
                v-if="platformAddressMenuOpen"
                class="absolute left-0 top-[calc(100%+0.55rem)] z-40 w-[min(19rem,calc(100vw-2rem))] space-y-1 rounded-[1rem] bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-black/5"
                data-testid="food-delivery-platform-address-menu"
              >
                <button
                  v-for="(address, addressIndex) in platformDeliveryAddressOptions"
                  :key="address"
                  type="button"
                  class="flex w-full items-center gap-3 rounded-[0.8rem] px-3 py-2.5 text-left text-xs font-bold"
                  :class="
                    platformLocationLabel === address
                      ? 'bg-[#e5fbfa] text-[#128e89]'
                      : 'text-gray-700 hover:bg-gray-50'
                  "
                  :aria-pressed="platformLocationLabel === address"
                  :data-testid="`food-delivery-platform-address-${addressIndex}`"
                  @click="selectPlatformDeliveryAddress(address)"
                >
                  <i class="fas fa-location-dot w-4 text-center"></i>
                  <span class="min-w-0 flex-1 leading-5">{{ address }}</span>
                  <i v-if="platformLocationLabel === address" class="fas fa-check text-[10px]"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-3">
            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-950 shadow-sm ring-1 ring-black/5"
              aria-label="Notifications"
              data-testid="food-delivery-platform-notifications"
              @click="openPlatformUtilitySheet('notifications')"
            >
              <i class="fas fa-bell text-lg"></i>
            </button>
            <button
              type="button"
              class="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-950 shadow-sm ring-1 ring-black/5"
              aria-label="Cart"
              data-testid="food-delivery-platform-cart"
              @click="openPlatformUtilitySheet('cart')"
            >
              <i class="fas fa-cart-shopping text-lg"></i>
              <span
                v-if="foodDeliveryStore.platformCartQuantity > 0"
                class="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white"
                data-testid="food-delivery-platform-cart-count"
              >
                {{ foodDeliveryStore.platformCartQuantity }}
              </span>
            </button>
          </div>
        </div>

        <p
          class="text-[1.02rem] font-semibold leading-6 text-gray-800"
          data-testid="food-delivery-platform-greeting"
        >
          {{ t('嗨，今天想吃点什么？', 'Hey, what sounds good today?') }}
        </p>

        <div class="relative pt-5">
          <button
            type="button"
            class="relative z-10 flex min-h-[3.45rem] items-center gap-3 rounded-[1.15rem] bg-white px-4 pr-[7.25rem] text-sm font-semibold text-gray-500 shadow-[0_12px_28px_rgba(15,23,42,0.08)] ring-1 ring-black/5"
            data-testid="food-delivery-platform-search"
            @click="openPlatformPage('search')"
          >
            <i class="fas fa-magnifying-glass text-xl text-gray-400"></i>
            <span>{{ t('搜索美食、菜单、小店名', 'Search food, menu, shop name') }}</span>
          </button>
          <div
            class="pointer-events-none absolute right-[-1.45rem] top-[-3.05rem] z-20 h-[8.65rem] w-[10.75rem]"
            aria-hidden="true"
            data-testid="food-delivery-platform-rider"
          >
            <img
              :src="platformRiderImageUrl"
              alt=""
              class="h-full w-full object-contain drop-shadow-[0_18px_20px_rgba(20,184,166,0.2)]"
              draggable="false"
            />
          </div>
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

      <section
        v-if="openedFromAppStoreShopCreate"
        class="rounded-3xl border border-orange-200 bg-white p-4"
        data-testid="food-delivery-app-store-create-banner"
        data-binding-target="food_delivery"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-bold text-orange-900">
              {{ t('From App Store folder mini app', 'From App Store folder mini app') }}
            </p>
            <p class="mt-2 text-xs leading-5 text-orange-700">
              {{
                t(
                  'Food Delivery creates the real restaurant, menu, cart, checkout, delivery order, and service notifications. The App Store mini app facade will follow this Food Delivery record.',
                  'Food Delivery creates the real restaurant, menu, cart, checkout, delivery order, and service notifications. The App Store mini app facade will follow this Food Delivery record.',
                )
              }}
            </p>
          </div>
          <span
            class="shrink-0 rounded-full bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-700"
          >
            food_delivery
          </span>
        </div>
      </section>

      <div v-if="!isStoreMode" class="space-y-5" data-testid="food-delivery-platform">
        <section
          v-if="platformPageKey === 'home'"
          class="space-y-5 food-delivery-platform-redesign"
          data-testid="food-delivery-pseudo-folder-home"
        >
          <section
            class="-mx-4 overflow-hidden"
            :data-active-banner-index="platformActiveBannerIndex"
            data-testid="food-delivery-platform-banner-rail"
          >
            <div
              ref="platformBannerRailRef"
              class="flex snap-x gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              data-testid="food-delivery-platform-banner-scroller"
              @scroll.passive="handlePlatformBannerRailScroll"
              @pointerdown="pausePlatformBannerAutoplay"
              @touchstart.passive="pausePlatformBannerAutoplay"
              @wheel.passive="pausePlatformBannerAutoplay"
              @mouseenter="holdPlatformBannerAutoplay"
              @mouseleave="releasePlatformBannerAutoplay"
              @focusin="holdPlatformBannerAutoplay"
              @focusout="releasePlatformBannerAutoplay"
            >
              <article
                v-for="(banner, index) in FOOD_PLATFORM_AD_BANNERS"
                :key="banner.id"
                class="relative h-[7.8rem] w-[20rem] shrink-0 snap-start overflow-hidden rounded-[1.2rem] bg-[#5edbd5] p-4 shadow-[0_16px_32px_rgba(15,118,110,0.13)] ring-1 ring-black/5"
                :data-testid="
                  banner.id === 'club_free_delivery'
                    ? 'food-delivery-platform-entry'
                    : `food-delivery-platform-banner-${banner.id}`
                "
                data-platform-banner-slide
              >
                <img
                  v-if="banner.imageUrl"
                  :src="banner.imageUrl"
                  alt=""
                  class="absolute inset-0 h-full w-full object-cover"
                  :data-testid="
                    banner.id === 'club_free_delivery'
                      ? 'food-delivery-platform-hero-image'
                      : undefined
                  "
                  draggable="false"
                />
                <div class="absolute inset-0 bg-gradient-to-r" :class="banner.className"></div>
                <div
                  class="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(15,23,42,0.08))]"
                ></div>
                <button
                  type="button"
                  class="absolute inset-0 z-20"
                  :aria-label="
                    banner.id === 'club_free_delivery' && platformBenefitClaimed
                      ? t('权益已领取', 'Perk claimed')
                      : languageBase === 'zh'
                        ? banner.ctaZh
                        : banner.ctaEn
                  "
                  :data-testid="`food-delivery-platform-banner-action-${banner.id}`"
                  @click="handlePlatformBanner(banner)"
                ></button>
                <div class="relative z-10 max-w-[61%]">
                  <p class="text-[0.68rem] font-black text-gray-950/65">
                    {{ languageBase === 'zh' ? banner.eyebrowZh : banner.eyebrowEn }}
                  </p>
                  <h2 class="mt-2 line-clamp-2 text-[1.14rem] font-black leading-tight">
                    {{ languageBase === 'zh' ? banner.titleZh : banner.titleEn }}
                  </h2>
                  <p class="mt-2 line-clamp-2 text-[0.72rem] font-bold leading-4 text-gray-950/62">
                    {{ languageBase === 'zh' ? banner.descZh : banner.descEn }}
                  </p>
                  <span
                    class="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.66rem] font-black shadow-sm"
                    :class="banner.chipClass"
                  >
                    {{
                      banner.id === 'club_free_delivery' && platformBenefitClaimed
                        ? t('已领取', 'Claimed')
                        : languageBase === 'zh'
                          ? banner.ctaZh
                          : banner.ctaEn
                    }}
                    <i
                      class="fas text-[0.55rem]"
                      :class="
                        banner.id === 'club_free_delivery' && platformBenefitClaimed
                          ? 'fa-check'
                          : 'fa-chevron-right'
                      "
                    ></i>
                  </span>
                </div>
                <div
                  v-if="!banner.imageUrl"
                  class="absolute -right-5 bottom-3 z-10 flex h-24 w-24 items-center justify-center rounded-full bg-white/55 p-1.5 shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
                  :data-testid="
                    banner.id === 'club_free_delivery'
                      ? 'food-delivery-platform-hero-image'
                      : undefined
                  "
                >
                  <template v-if="banner.id === 'club_free_delivery'">
                    <div class="absolute inset-1.5 overflow-hidden rounded-full bg-[#fff7e8]">
                      <span class="absolute left-4 top-4 h-8 w-8 rounded-full bg-[#f7c843]"></span>
                      <span class="absolute right-3 top-5 h-7 w-7 rounded-full bg-[#f06f4d]"></span>
                      <span
                        class="absolute bottom-4 left-5 h-7 w-10 rounded-full bg-[#5fbf77]"
                      ></span>
                      <span class="absolute bottom-5 right-4 h-5 w-7 rounded-full bg-white"></span>
                    </div>
                    <img
                      v-if="platformHeroImageUrl"
                      :src="platformHeroImageUrl"
                      :alt="
                        selectedPlatformMerchant?.imageAlt ||
                        selectedPlatformMerchant?.name ||
                        'Food'
                      "
                      class="relative z-10 h-full w-full rounded-full object-cover"
                      @error="$event.currentTarget.style.display = 'none'"
                    />
                    <i v-else class="fas fa-bowl-food relative z-10 text-3xl text-[#20aaa4]"></i>
                  </template>
                  <i v-else :class="banner.icon" class="text-3xl text-gray-950/72"></i>
                </div>
                <span
                  class="absolute bottom-3 right-3 z-30 rounded-full bg-gray-950/70 px-2.5 py-1 text-[0.66rem] font-black text-white backdrop-blur"
                >
                  {{ index + 1 }} / {{ FOOD_PLATFORM_AD_BANNERS.length }}
                </span>
              </article>
            </div>
            <div
              class="mt-1.5 flex h-5 items-center justify-center gap-1"
              role="group"
              :aria-label="t('横幅切换', 'Banner navigation')"
              data-testid="food-delivery-platform-banner-pagination"
            >
              <button
                v-for="(banner, index) in FOOD_PLATFORM_AD_BANNERS"
                :key="`banner-dot-${banner.id}`"
                type="button"
                class="inline-flex h-5 w-6 items-center justify-center"
                :aria-label="t(`查看第 ${index + 1} 张横幅`, `View banner ${index + 1}`)"
                :aria-current="platformActiveBannerIndex === index ? 'true' : undefined"
                :data-testid="`food-delivery-platform-banner-dot-${index}`"
                @click="scrollPlatformBannerTo(index, { pause: true })"
              >
                <span
                  class="h-1.5 rounded-full transition-[width,background-color] duration-200"
                  :class="
                    platformActiveBannerIndex === index ? 'w-4 bg-[#24bcb7]' : 'w-1.5 bg-gray-300'
                  "
                ></span>
              </button>
            </div>
            <p
              v-if="platformBenefitClaimed"
              class="px-4 pt-2 text-xs font-black text-[#128e89]"
              data-testid="food-delivery-platform-benefit-feedback"
              aria-live="polite"
            >
              {{
                t(
                  '免配送权益已加入本周平台优惠。',
                  'Free-delivery perks were added to this week’s platform offers.',
                )
              }}
            </p>
          </section>

          <section class="space-y-2.5" data-testid="food-delivery-category-panel">
            <div class="flex items-center justify-between gap-3 px-0.5">
              <p class="text-xs font-black uppercase text-gray-500">
                {{ t('快速分类', 'Quick picks') }}
              </p>
              <span class="truncate text-[0.68rem] font-bold text-[#159f9a]">{{
                platformActiveCategoryLabel
              }}</span>
            </div>
            <div class="grid grid-cols-5 gap-2 px-0.5" data-testid="food-delivery-category-grid">
              <button
                v-for="category in platformCategoryTiles"
                :key="category.key"
                type="button"
                class="flex min-w-0 flex-col items-center gap-2 text-center transition active:scale-[0.97]"
                :aria-pressed="category.active"
                :data-testid="`food-delivery-category-${category.key}`"
                @click="openPlatformCategory(category)"
              >
                <span
                  class="inline-flex h-12 w-12 items-center justify-center rounded-[0.95rem] bg-gradient-to-br text-lg shadow-sm ring-1 transition"
                  :class="
                    category.active
                      ? 'bg-none bg-[#24bcb7] text-white shadow-[0_8px_20px_rgba(36,188,183,0.24)] ring-[#24bcb7]/20'
                      : `${category.className} ring-black/[0.04]`
                  "
                  :data-asset-slot="`platform-category-icon-${category.key}`"
                  :data-required-asset="category.requiredAsset"
                  :data-testid="`food-delivery-category-icon-${category.key}`"
                >
                  <i :class="category.icon"></i>
                </span>
                <span
                  class="w-full break-words text-[0.68rem] font-black leading-4"
                  :class="category.active ? 'text-[#128e89]' : 'text-gray-600'"
                  >{{ category.label }}</span
                >
              </button>
            </div>
          </section>

          <section class="space-y-3" data-testid="food-delivery-data-baseline">
            <div class="flex items-end justify-between gap-3">
              <div>
                <p class="text-[1.45rem] font-black leading-tight text-gray-950">
                  {{ platformMerchantSectionTitle }}
                </p>
                <span class="hidden">Local data</span>
                <p
                  class="mt-1 text-xs font-semibold text-gray-500"
                  data-testid="food-delivery-platform-merchant-summary"
                  aria-live="polite"
                >
                  {{ platformMerchantSectionMeta }}
                </p>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-black text-gray-600 shadow-sm ring-1 ring-black/5"
                :aria-expanded="platformMerchantListExpanded"
                data-testid="food-delivery-platform-view-all"
                @click="platformMerchantListExpanded = !platformMerchantListExpanded"
              >
                {{
                  platformMerchantListExpanded ? t('收起', 'Show less') : t('全部查看', 'View all')
                }}
                <i
                  class="fas text-[0.62rem]"
                  :class="platformMerchantListExpanded ? 'fa-chevron-up' : 'fa-chevron-right'"
                ></i>
              </button>
            </div>

            <div
              class="-mx-4 px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              :class="
                platformMerchantListExpanded
                  ? 'grid grid-cols-1 gap-3'
                  : 'flex snap-x gap-3 overflow-x-auto'
              "
              data-testid="food-delivery-shop-app-list"
              :data-recommendation-mode="
                platformRecommendationMode ? 'random-three' : 'full-results'
              "
            >
              <article
                v-for="merchant in platformFeaturedMerchants"
                :key="merchant.id"
                class="relative transition"
                :class="platformMerchantListExpanded ? 'w-full' : 'w-[17rem] shrink-0 snap-start'"
                :data-testid="`food-delivery-platform-merchant-${merchant.id}`"
                :data-platform-category="merchant.category"
              >
                <button
                  type="button"
                  class="group block w-full rounded-[1.1rem] bg-white p-2.5 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] transition active:scale-[0.99]"
                  :data-testid="`food-delivery-select-platform-merchant-${merchant.id}`"
                  @click="selectPlatformMerchant(merchant)"
                >
                  <div
                    class="relative h-32 overflow-hidden rounded-[0.85rem] bg-gray-100"
                    :data-asset-slot="`platform-merchant-cover-${merchant.id}`"
                    :data-required-asset="merchant.requiredAsset || undefined"
                    :data-testid="`food-delivery-platform-merchant-card-${merchant.id}`"
                    :data-merchant-visual-type="merchant.visualType || 'food-photo'"
                  >
                    <img
                      v-if="merchant.imageUrl"
                      :src="merchant.imageUrl"
                      :alt="merchant.imageAlt || merchant.name"
                      class="relative z-10 h-full w-full transition duration-300"
                      :class="
                        isPlatformLogoMerchant(merchant)
                          ? 'object-contain p-5'
                          : 'object-cover group-active:scale-[1.03]'
                      "
                      @error="$event.currentTarget.style.display = 'none'"
                    />
                    <div
                      class="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br text-4xl"
                      :class="merchant.fallbackClass || 'from-[#e6fffd] to-white text-[#24bcb7]'"
                    >
                      <span
                        v-if="isPlatformLogoMerchant(merchant)"
                        class="whitespace-pre-line text-center text-xl font-black leading-tight"
                        >{{ platformMerchantLogoMark(merchant) }}</span
                      >
                      <i v-else :class="merchant.icon || 'fas fa-store'"></i>
                    </div>
                    <span
                      class="absolute left-2 top-2 z-20 rounded-md bg-[#24bcb7] px-2 py-1 text-[10px] font-black text-white shadow-sm"
                    >
                      {{ merchant.badge }}
                    </span>
                  </div>
                  <p class="mt-3 truncate text-[0.98rem] font-black leading-tight text-gray-950">
                    {{ merchant.name }}
                  </p>
                  <p class="mt-1 truncate text-xs font-semibold text-gray-500">
                    {{ merchant.cuisine }} · {{ merchant.distanceKm.toFixed(1) }} km
                  </p>
                  <div
                    class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] font-black text-gray-600"
                  >
                    <span class="inline-flex items-center gap-1.5">
                      <i class="fas fa-star text-amber-500"></i>
                      {{ merchant.rating.toFixed(1) }}
                    </span>
                    <span class="inline-flex items-center gap-1.5">
                      <i class="fas fa-motorcycle text-[#24bcb7]"></i>
                      {{ platformDeliveryFeeLabel(merchant) }}
                    </span>
                    <span class="inline-flex items-center gap-1.5">
                      <i class="far fa-clock text-[#ff7a37]"></i>
                      {{ merchant.deliveryEtaMinutes }} min
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  class="absolute right-4 top-4 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur transition active:scale-95"
                  :class="
                    isPlatformMerchantSaved(merchant.id)
                      ? 'bg-rose-500 text-white'
                      : 'bg-black/35 text-white'
                  "
                  :aria-label="
                    isPlatformMerchantSaved(merchant.id)
                      ? t('取消收藏', 'Remove saved shop')
                      : t('收藏小店', 'Save shop')
                  "
                  :aria-pressed="isPlatformMerchantSaved(merchant.id)"
                  :data-testid="`food-delivery-platform-save-${merchant.id}`"
                  @click="togglePlatformMerchantSaved(merchant)"
                >
                  <i class="fas fa-heart text-xs"></i>
                </button>
              </article>
              <div
                v-if="platformFeaturedMerchants.length === 0"
                class="w-full rounded-[1.35rem] border border-dashed border-teal-200 bg-white p-5 text-center text-xs font-semibold leading-5 text-teal-700"
                data-testid="food-delivery-shop-app-empty"
              >
                {{ platformMerchantEmptyLabel }}
              </div>
            </div>
          </section>
        </section>

        <section
          v-else-if="platformPageKey === 'campaign'"
          class="space-y-5"
          data-testid="food-delivery-platform-campaign-page"
          :data-campaign-id="activePlatformCampaign?.id || platformCampaignKey"
        >
          <header class="flex items-center justify-between gap-3 pt-1">
            <div class="flex min-w-0 items-center gap-3">
              <button
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm ring-1 ring-black/5"
                data-testid="food-delivery-platform-campaign-back"
                :aria-label="t('返回首页', 'Back home')"
                @click="openPlatformPage('home')"
              >
                <i class="fas fa-chevron-left text-sm"></i>
              </button>
              <div class="min-w-0">
                <p class="text-[10px] font-black uppercase text-[#159f9a]">
                  {{ t('平台活动', 'Platform campaign') }}
                </p>
                <h2 class="truncate text-2xl font-black text-gray-950">
                  {{
                    activePlatformCampaign
                      ? languageBase === 'zh'
                        ? activePlatformCampaign.eyebrowZh
                        : activePlatformCampaign.eyebrowEn
                      : t('活动', 'Campaign')
                  }}
                </h2>
              </div>
            </div>
            <button
              type="button"
              class="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm ring-1 ring-black/5"
              :aria-label="t('购物车', 'Cart')"
              @click="openPlatformUtilitySheet('cart')"
            >
              <i class="fas fa-cart-shopping"></i>
              <span
                v-if="foodDeliveryStore.platformCartQuantity > 0"
                class="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white"
              >
                {{ foodDeliveryStore.platformCartQuantity }}
              </span>
            </button>
          </header>

          <template v-if="activePlatformCampaign">
            <section
              class="relative overflow-hidden rounded-[1.35rem] bg-[#5edbd5] p-5 shadow-[0_18px_38px_rgba(15,118,110,0.16)] ring-1 ring-black/5"
              :class="
                activePlatformCampaign.kind === 'lottery' ? 'min-h-[24rem]' : 'min-h-[10.5rem]'
              "
              data-testid="food-delivery-platform-campaign-hero"
              :data-required-asset="activePlatformCampaign.posterRequiredAsset || undefined"
            >
              <img
                :src="
                  activePlatformCampaign.kind === 'lottery'
                    ? activePlatformCampaign.posterImageUrl
                    : activePlatformCampaign.imageUrl
                "
                alt=""
                class="absolute inset-0 h-full w-full object-cover"
                draggable="false"
                @error="handlePlatformCampaignPosterImageError"
              />
              <div
                class="absolute inset-0 bg-gradient-to-r"
                :class="activePlatformCampaign.className"
              ></div>
              <div
                class="absolute inset-0"
                :class="
                  activePlatformCampaign.kind === 'lottery'
                    ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.5))]'
                    : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.1))]'
                "
              ></div>
              <div
                class="relative z-10"
                :class="
                  activePlatformCampaign.kind === 'lottery' ? 'max-w-[78%] pt-44' : 'max-w-[64%]'
                "
              >
                <span
                  class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-[#128e89] shadow-sm"
                >
                  <i :class="activePlatformCampaign.icon"></i>
                </span>
                <p
                  v-if="activePlatformCampaign.kind === 'lottery'"
                  class="mt-3 text-[10px] font-black uppercase text-white/75"
                >
                  {{
                    languageBase === 'zh'
                      ? activePlatformCampaign.posterEyebrowZh
                      : activePlatformCampaign.posterEyebrowEn
                  }}
                </p>
                <h3
                  class="font-black leading-tight"
                  :class="
                    activePlatformCampaign.kind === 'lottery'
                      ? 'mt-1 text-[1.8rem] text-white'
                      : 'mt-3 text-[1.35rem] text-gray-950'
                  "
                >
                  {{
                    languageBase === 'zh'
                      ? activePlatformCampaign.titleZh
                      : activePlatformCampaign.titleEn
                  }}
                </h3>
                <p
                  class="mt-2 text-[0.72rem] font-bold leading-4"
                  :class="
                    activePlatformCampaign.kind === 'lottery' ? 'text-white/75' : 'text-gray-950/65'
                  "
                >
                  {{
                    languageBase === 'zh'
                      ? activePlatformCampaign.descZh
                      : activePlatformCampaign.descEn
                  }}
                </p>
              </div>
            </section>

            <section
              v-if="activePlatformCampaign.kind === 'membership'"
              class="space-y-4"
              data-testid="food-delivery-platform-campaign-membership"
            >
              <div
                class="overflow-hidden rounded-[1.15rem] bg-gray-950 p-4 text-white shadow-[0_16px_34px_rgba(15,23,42,0.18)]"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-[10px] font-black uppercase text-[#74e4de]">
                      {{ t('SchatPhone 外卖会员', 'SchatPhone Delivery Club') }}
                    </p>
                    <p class="mt-2 text-xl font-black">
                      {{ t('本周免配送通行证', 'Weekly free-delivery pass') }}
                    </p>
                  </div>
                  <span
                    class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#24bcb7] text-white"
                    ><i class="fas fa-ticket"></i
                  ></span>
                </div>
                <p class="mt-4 max-w-[19rem] text-xs font-semibold leading-5 text-white/65">
                  {{
                    languageBase === 'zh'
                      ? activePlatformCampaign.pageDescZh
                      : activePlatformCampaign.pageDescEn
                  }}
                </p>
                <div
                  class="mt-4 grid grid-cols-3 gap-2"
                  data-testid="food-delivery-platform-campaign-highlights"
                >
                  <div
                    v-for="highlight in activePlatformCampaign.highlights"
                    :key="highlight.titleEn"
                    class="border-l border-white/15 pl-2 first:border-l-0 first:pl-0"
                  >
                    <i :class="highlight.icon" class="text-xs text-[#74e4de]"></i>
                    <p class="mt-1 text-[11px] font-black leading-4">
                      {{ languageBase === 'zh' ? highlight.titleZh : highlight.titleEn }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="space-y-2" data-testid="food-delivery-platform-campaign-merchants">
                <div class="flex items-center justify-between gap-3 px-0.5">
                  <p class="text-base font-black text-gray-950">
                    {{ t('本周适用小店', 'Eligible this week') }}
                  </p>
                  <span class="text-[0.68rem] font-black text-[#159f9a]"
                    >{{ platformCampaignMerchants.length }} {{ t('家', 'shops') }}</span
                  >
                </div>
                <button
                  v-for="merchant in platformCampaignMerchants"
                  :key="merchant.id"
                  type="button"
                  class="flex w-full items-center gap-3 rounded-[1rem] bg-white px-3 py-3 text-left shadow-sm ring-1 ring-black/[0.04] transition active:scale-[0.99]"
                  :data-testid="`food-delivery-platform-campaign-merchant-${merchant.id}`"
                  @click="selectPlatformMerchant(merchant)"
                >
                  <span
                    class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] bg-[#e5fbfa] text-[#159f9a]"
                    ><i :class="merchant.icon"></i
                  ></span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-black text-gray-950">{{
                      merchant.name
                    }}</span>
                    <span class="mt-0.5 block text-[0.68rem] font-bold text-gray-500"
                      >{{ platformDeliveryFeeLabel(merchant) }} ·
                      {{ merchant.deliveryEtaMinutes }} min</span
                    >
                  </span>
                  <i class="fas fa-chevron-right text-[10px] text-gray-300"></i>
                </button>
              </div>

              <button
                type="button"
                class="flex min-h-12 w-full items-center justify-center gap-2 rounded-[0.9rem] bg-[#24bcb7] px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(36,188,183,0.2)] active:scale-[0.99]"
                data-testid="food-delivery-platform-campaign-primary"
                @click="handlePlatformCampaignPrimary"
              >
                <i :class="platformBenefitClaimed ? 'fas fa-store' : 'fas fa-ticket'"></i>
                {{
                  platformBenefitClaimed
                    ? languageBase === 'zh'
                      ? activePlatformCampaign.claimedPrimaryZh
                      : activePlatformCampaign.claimedPrimaryEn
                    : languageBase === 'zh'
                      ? activePlatformCampaign.primaryZh
                      : activePlatformCampaign.primaryEn
                }}
              </button>
              <p
                v-if="platformBenefitClaimed"
                class="text-center text-xs font-black leading-5 text-[#128e89]"
                data-testid="food-delivery-platform-benefit-feedback"
                aria-live="polite"
              >
                {{
                  t(
                    '免配送权益已加入本周平台优惠，可以开始选店。',
                    'The free-delivery perk is ready. Choose an eligible shop.',
                  )
                }}
              </p>
            </section>

            <section
              v-else-if="activePlatformCampaign.kind === 'lottery'"
              class="space-y-5"
              data-testid="food-delivery-platform-campaign-lottery"
            >
              <div class="flex items-center justify-between gap-3 border-y border-orange-200 py-3">
                <span class="text-xs font-black text-orange-700">{{
                  languageBase === 'zh'
                    ? activePlatformCampaign.scheduleZh
                    : activePlatformCampaign.scheduleEn
                }}</span>
                <span class="inline-flex items-center gap-1 text-[10px] font-black text-gray-500"
                  ><i class="fas fa-gift text-rose-500"></i
                  >{{ t('周末福利', 'Weekend rewards') }}</span
                >
              </div>

              <div data-testid="food-delivery-platform-campaign-benefits">
                <div class="flex items-end justify-between gap-3 pb-2">
                  <div>
                    <p class="text-[10px] font-black uppercase text-orange-600">
                      {{ t('本期福利池', 'Reward pool') }}
                    </p>
                    <h3 class="mt-1 text-lg font-black text-gray-950">
                      {{ t('三种好运，随机掉落一种', 'One of three perks will drop') }}
                    </h3>
                  </div>
                  <span class="text-2xl font-black text-orange-200">03</span>
                </div>
                <div
                  v-for="benefit in activePlatformCampaign.benefits"
                  :key="benefit.titleEn"
                  class="flex items-center gap-3 border-b border-gray-200 py-3 last:border-b-0"
                >
                  <span
                    class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 ring-1 ring-orange-100"
                  >
                    <i :class="benefit.icon"></i>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-black text-gray-950">{{
                      languageBase === 'zh' ? benefit.titleZh : benefit.titleEn
                    }}</span>
                    <span class="mt-0.5 block text-xs font-semibold text-gray-500">{{
                      languageBase === 'zh' ? benefit.descZh : benefit.descEn
                    }}</span>
                  </span>
                </div>
              </div>

              <div
                class="-mx-4 bg-gray-950 px-4 py-6 text-center text-white"
                data-testid="food-delivery-platform-campaign-draw-zone"
              >
                <p class="mx-auto max-w-[19rem] text-xs font-semibold leading-5 text-white/60">
                  {{
                    languageBase === 'zh'
                      ? activePlatformCampaign.pageDescZh
                      : activePlatformCampaign.pageDescEn
                  }}
                </p>
                <button
                  type="button"
                  class="mx-auto mt-5 flex h-32 w-32 flex-col items-center justify-center rounded-full border-[6px] border-white/15 text-white shadow-[0_18px_42px_rgba(249,115,22,0.36)] transition active:scale-95 disabled:cursor-default disabled:active:scale-100"
                  :class="platformCampaignPrize ? 'bg-[#159f9a]' : 'bg-[#f97316]'"
                  :disabled="!!platformCampaignPrize"
                  data-testid="food-delivery-platform-campaign-primary"
                  @click="handlePlatformCampaignPrimary"
                >
                  <i :class="platformCampaignPrize?.icon || 'fas fa-gift'" class="text-2xl"></i>
                  <span class="mt-2 px-3 text-xs font-black leading-4">
                    {{
                      platformCampaignPrize
                        ? languageBase === 'zh'
                          ? activePlatformCampaign.drawnPrimaryZh
                          : activePlatformCampaign.drawnPrimaryEn
                        : languageBase === 'zh'
                          ? activePlatformCampaign.primaryZh
                          : activePlatformCampaign.primaryEn
                    }}
                  </span>
                </button>
                <div
                  v-if="platformCampaignPrize"
                  class="mt-5"
                  data-testid="food-delivery-platform-campaign-prize"
                  aria-live="polite"
                >
                  <p class="text-[10px] font-black uppercase text-[#74e4de]">
                    {{ t('你的周末签', 'Your weekend perk') }}
                  </p>
                  <p class="mt-1 text-2xl font-black">
                    {{
                      languageBase === 'zh'
                        ? platformCampaignPrize.titleZh
                        : platformCampaignPrize.titleEn
                    }}
                  </p>
                  <p class="mt-2 text-xs font-semibold text-white/65">
                    {{
                      languageBase === 'zh'
                        ? platformCampaignPrize.descZh
                        : platformCampaignPrize.descEn
                    }}
                  </p>
                </div>
                <p v-else class="mt-4 text-[10px] font-bold text-white/45">
                  {{ t('点击抽取后即锁定本次结果', 'Tap once to lock this event result') }}
                </p>
              </div>
            </section>

            <section
              v-else
              class="space-y-4"
              data-testid="food-delivery-platform-campaign-menu-guide"
            >
              <div class="flex items-end justify-between gap-3 border-b-2 border-gray-950 pb-3">
                <div>
                  <p class="text-[10px] font-black uppercase text-sky-700">
                    {{
                      languageBase === 'zh'
                        ? activePlatformCampaign.editorZh
                        : activePlatformCampaign.editorEn
                    }}
                  </p>
                  <p class="mt-1 text-lg font-black text-gray-950">
                    {{ t('不是店铺榜，是今天值得点的菜', 'Dishes worth ordering today') }}
                  </p>
                </div>
                <i class="fas fa-utensils text-xl text-sky-600"></i>
              </div>
              <p class="text-sm font-semibold leading-6 text-gray-600">
                {{
                  languageBase === 'zh'
                    ? activePlatformCampaign.pageDescZh
                    : activePlatformCampaign.pageDescEn
                }}
              </p>
              <div class="space-y-2" data-testid="food-delivery-platform-campaign-menu-picks">
                <button
                  v-for="(pick, pickIndex) in platformCampaignMenuPicks"
                  :key="`${pick.merchantId}-${pick.itemIndex}`"
                  type="button"
                  class="flex w-full items-center gap-3 rounded-[0.95rem] bg-white p-2.5 text-left shadow-sm ring-1 ring-black/[0.04] transition active:scale-[0.99]"
                  :data-testid="`food-delivery-platform-campaign-menu-${pick.merchantId}-${pick.itemIndex}`"
                  @click="selectPlatformMerchant(pick.merchant)"
                >
                  <span
                    class="relative h-16 w-16 shrink-0 overflow-hidden rounded-[0.75rem] bg-gray-100"
                    :data-required-asset="platformMenuItemAssetPath(pick.merchant, pick.itemIndex)"
                  >
                    <img
                      :src="platformMenuItemImageUrl(pick.merchant, pick.item, pick.itemIndex)"
                      :alt="pick.item.title"
                      class="h-full w-full object-cover"
                      @error="handlePlatformMenuImageError"
                    />
                    <span
                      class="absolute left-1.5 top-1.5 rounded bg-gray-950/75 px-1.5 py-0.5 text-[9px] font-black text-white"
                      >0{{ pickIndex + 1 }}</span
                    >
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-[10px] font-black text-sky-700">{{
                      languageBase === 'zh' ? pick.tagZh : pick.tagEn
                    }}</span>
                    <span class="mt-1 block truncate text-sm font-black text-gray-950">{{
                      pick.item.title
                    }}</span>
                    <span class="mt-1 block truncate text-[0.68rem] font-semibold text-gray-500"
                      >{{ pick.merchant.name }} ·
                      {{ displayMoney(pick.item.price, pick.merchant.currency) }}</span
                    >
                  </span>
                  <i class="fas fa-chevron-right text-[10px] text-gray-300"></i>
                </button>
              </div>
              <button
                type="button"
                class="flex min-h-12 w-full items-center justify-center gap-2 rounded-[0.9rem] bg-gray-950 px-4 text-sm font-black text-white shadow-[0_12px_24px_rgba(15,23,42,0.16)] active:scale-[0.99]"
                data-testid="food-delivery-platform-campaign-primary"
                @click="handlePlatformCampaignPrimary"
              >
                <i class="fas fa-bowl-food"></i
                >{{
                  languageBase === 'zh'
                    ? activePlatformCampaign.primaryZh
                    : activePlatformCampaign.primaryEn
                }}
              </button>
            </section>
          </template>

          <div
            v-else
            class="rounded-[1.25rem] bg-white p-7 text-center shadow-sm ring-1 ring-black/5"
            data-testid="food-delivery-platform-campaign-missing"
          >
            <i class="fas fa-ticket text-2xl text-gray-300"></i>
            <p class="mt-3 text-sm font-black text-gray-900">
              {{ t('这个活动暂时不可用', 'This campaign is unavailable') }}
            </p>
            <button
              type="button"
              class="mt-4 rounded-full bg-gray-950 px-4 py-2 text-xs font-black text-white"
              @click="openPlatformPage('home')"
            >
              {{ t('返回首页', 'Back home') }}
            </button>
          </div>
        </section>

        <section
          v-else-if="platformPageKey === 'search'"
          class="space-y-5"
          data-testid="food-delivery-platform-search-page"
        >
          <header class="flex items-center justify-between gap-3 pt-1">
            <div class="flex min-w-0 items-center gap-3">
              <button
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm ring-1 ring-black/5"
                data-testid="food-delivery-platform-page-back"
                :aria-label="t('返回首页', 'Back home')"
                @click="openPlatformPage('home')"
              >
                <i class="fas fa-chevron-left text-sm"></i>
              </button>
              <div class="min-w-0">
                <p class="text-[10px] font-black uppercase text-[#159f9a]">
                  {{ t('全平台查找', 'Platform search') }}
                </p>
                <h2 class="truncate text-2xl font-black text-gray-950">
                  {{ t('搜索', 'Search') }}
                </h2>
              </div>
            </div>
            <button
              type="button"
              class="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm ring-1 ring-black/5"
              data-testid="food-delivery-platform-cart"
              :aria-label="t('购物车', 'Cart')"
              @click="openPlatformUtilitySheet('cart')"
            >
              <i class="fas fa-cart-shopping"></i>
              <span
                v-if="foodDeliveryStore.platformCartQuantity > 0"
                class="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white"
              >
                {{ foodDeliveryStore.platformCartQuantity }}
              </span>
            </button>
          </header>

          <div
            class="rounded-[1.35rem] bg-[#24bcb7] p-4 text-white shadow-[0_16px_36px_rgba(36,188,183,0.2)]"
          >
            <label class="text-xs font-black" for="food-delivery-platform-search-page-input">
              {{ t('今天想找什么？', 'What are you looking for?') }}
            </label>
            <div
              class="mt-3 flex min-h-12 items-center gap-3 rounded-[1rem] bg-white px-4 text-gray-900 shadow-sm"
            >
              <i class="fas fa-magnifying-glass text-gray-400"></i>
              <input
                id="food-delivery-platform-search-page-input"
                ref="platformSearchInputRef"
                v-model="platformSearchQuery"
                class="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-gray-400"
                data-testid="food-delivery-platform-search-input"
                :placeholder="t('店名、菜系或菜品', 'Shop, cuisine, or dish')"
                @click="focusPlatformSearch"
              />
              <button
                v-if="platformSearchQuery"
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500"
                data-testid="food-delivery-platform-search-clear"
                :aria-label="t('清空搜索', 'Clear search')"
                @click="platformSearchQuery = ''"
              >
                <i class="fas fa-xmark text-xs"></i>
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2" data-testid="food-delivery-platform-search-suggestions">
            <button
              v-for="suggestion in [
                t('面馆', 'Noodles'),
                t('咖啡', 'Coffee'),
                t('蒸点', 'Dim sum'),
                t('咖喱', 'Curry'),
              ]"
              :key="suggestion"
              type="button"
              class="rounded-full bg-white px-3 py-2 text-xs font-black text-gray-600 shadow-sm ring-1 ring-black/5"
              @click="platformSearchQuery = suggestion"
            >
              {{ suggestion }}
            </button>
          </div>

          <section class="space-y-3" data-testid="food-delivery-platform-search-results">
            <div class="flex items-end justify-between gap-3">
              <div>
                <p class="text-lg font-black text-gray-950">{{ t('搜索结果', 'Results') }}</p>
                <p class="mt-1 text-xs font-semibold text-gray-500">
                  {{ platformMatchingMerchants.length }} {{ t('家匹配小店', 'matching shops') }}
                </p>
              </div>
            </div>
            <article
              v-for="merchant in platformFeaturedMerchants"
              :key="merchant.id"
              class="flex items-center gap-3 rounded-[1.1rem] bg-white p-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.04]"
              :data-testid="`food-delivery-platform-merchant-${merchant.id}`"
            >
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-3 text-left"
                :data-testid="`food-delivery-select-platform-merchant-${merchant.id}`"
                @click="selectPlatformMerchant(merchant)"
              >
                <span
                  class="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] bg-gradient-to-br text-2xl"
                  :class="merchant.fallbackClass || 'from-[#e6fffd] to-white text-[#24bcb7]'"
                  :data-asset-slot="`platform-merchant-cover-${merchant.id}`"
                  :data-required-asset="merchant.requiredAsset || undefined"
                  :data-merchant-visual-type="merchant.visualType || 'food-photo'"
                >
                  <img
                    v-if="merchant.imageUrl"
                    :src="merchant.imageUrl"
                    :alt="merchant.imageAlt || merchant.name"
                    class="absolute inset-0 z-10 h-full w-full"
                    :class="
                      isPlatformLogoMerchant(merchant) ? 'object-contain p-3' : 'object-cover'
                    "
                    @error="$event.currentTarget.style.display = 'none'"
                  />
                  <span
                    v-if="isPlatformLogoMerchant(merchant)"
                    class="whitespace-pre-line text-center text-sm font-black leading-tight"
                    >{{ platformMerchantLogoMark(merchant) }}</span
                  >
                  <i v-else :class="merchant.icon || 'fas fa-store'"></i>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-black text-gray-950">{{
                    merchant.name
                  }}</span>
                  <span class="mt-1 block truncate text-xs font-semibold text-gray-500">
                    {{ merchant.cuisine }} · {{ merchant.distanceKm.toFixed(1) }} km
                  </span>
                  <span
                    class="mt-2 flex items-center gap-3 text-[0.68rem] font-black text-gray-600"
                  >
                    <span
                      ><i class="fas fa-star mr-1 text-amber-500"></i
                      >{{ merchant.rating.toFixed(1) }}</span
                    >
                    <span
                      ><i class="far fa-clock mr-1 text-[#ff7a37]"></i
                      >{{ merchant.deliveryEtaMinutes }} min</span
                    >
                  </span>
                </span>
              </button>
              <button
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                :class="
                  isPlatformMerchantSaved(merchant.id)
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-100 text-gray-500'
                "
                :aria-label="
                  isPlatformMerchantSaved(merchant.id)
                    ? t('取消收藏', 'Remove saved shop')
                    : t('收藏小店', 'Save shop')
                "
                :aria-pressed="isPlatformMerchantSaved(merchant.id)"
                :data-testid="`food-delivery-platform-save-${merchant.id}`"
                @click="togglePlatformMerchantSaved(merchant)"
              >
                <i class="fas fa-heart text-xs"></i>
              </button>
            </article>
            <div
              v-if="platformFeaturedMerchants.length === 0"
              class="rounded-[1.2rem] border border-dashed border-teal-200 bg-white p-6 text-center text-xs font-bold leading-5 text-teal-700"
            >
              {{
                t('没有找到匹配的小店，换个关键词试试。', 'No shops matched. Try another search.')
              }}
            </div>
          </section>
        </section>

        <section
          v-else-if="platformPageKey === 'saved'"
          class="space-y-5"
          data-testid="food-delivery-platform-saved-page"
        >
          <header class="flex items-center justify-between gap-3 pt-1">
            <div class="flex min-w-0 items-center gap-3">
              <button
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm ring-1 ring-black/5"
                data-testid="food-delivery-platform-page-back"
                :aria-label="t('返回首页', 'Back home')"
                @click="openPlatformPage('home')"
              >
                <i class="fas fa-chevron-left text-sm"></i>
              </button>
              <div class="min-w-0">
                <p class="text-[10px] font-black uppercase text-rose-500">
                  {{ t('你的口味清单', 'Your shortlist') }}
                </p>
                <h2 class="truncate text-2xl font-black text-gray-950">
                  {{ t('收藏小店', 'Saved shops') }}
                </h2>
              </div>
            </div>
            <span
              class="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-rose-50 px-3 text-sm font-black text-rose-500"
            >
              {{ platformSavedMerchantIds.length }}
            </span>
          </header>

          <div
            class="flex items-center gap-4 rounded-[1.25rem] bg-gray-950 p-4 text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]"
          >
            <span
              class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white"
            >
              <i class="fas fa-heart"></i>
            </span>
            <div>
              <p class="text-sm font-black">
                {{ t('想吃时不用重新找', 'Ready when cravings return') }}
              </p>
              <p class="mt-1 text-xs font-semibold leading-5 text-white/65">
                {{
                  t(
                    '收藏后会整齐留在这里，想吃时一眼就能找到。',
                    'Saved shops stay neatly within reach whenever cravings return.',
                  )
                }}
              </p>
            </div>
          </div>

          <div
            v-if="platformFeaturedMerchants.length > 0"
            class="grid grid-cols-2 gap-3"
            data-testid="food-delivery-platform-saved-grid"
          >
            <article
              v-for="merchant in platformFeaturedMerchants"
              :key="merchant.id"
              class="relative min-w-0 rounded-[1rem] bg-white p-2 shadow-[0_10px_26px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.04]"
              :data-testid="`food-delivery-platform-merchant-${merchant.id}`"
            >
              <button
                type="button"
                class="block w-full text-left"
                :data-testid="`food-delivery-select-platform-merchant-${merchant.id}`"
                @click="selectPlatformMerchant(merchant)"
              >
                <span
                  class="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[0.75rem] bg-gradient-to-br text-3xl"
                  :class="merchant.fallbackClass || 'from-[#e6fffd] to-white text-[#24bcb7]'"
                  :data-asset-slot="`platform-merchant-cover-${merchant.id}`"
                  :data-required-asset="merchant.requiredAsset || undefined"
                  :data-merchant-visual-type="merchant.visualType || 'food-photo'"
                >
                  <img
                    v-if="merchant.imageUrl"
                    :src="merchant.imageUrl"
                    :alt="merchant.imageAlt || merchant.name"
                    class="absolute inset-0 z-10 h-full w-full"
                    :class="
                      isPlatformLogoMerchant(merchant) ? 'object-contain p-4' : 'object-cover'
                    "
                    @error="$event.currentTarget.style.display = 'none'"
                  />
                  <span
                    v-if="isPlatformLogoMerchant(merchant)"
                    class="whitespace-pre-line text-center text-lg font-black leading-tight"
                    >{{ platformMerchantLogoMark(merchant) }}</span
                  >
                  <i v-else :class="merchant.icon || 'fas fa-store'"></i>
                </span>
                <span class="mt-2 block truncate text-sm font-black text-gray-950">{{
                  merchant.name
                }}</span>
                <span class="mt-1 block truncate text-[0.68rem] font-bold text-gray-500">
                  {{ merchant.cuisine }} · {{ merchant.deliveryEtaMinutes }} min
                </span>
              </button>
              <button
                type="button"
                class="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm"
                :aria-label="t('取消收藏', 'Remove saved shop')"
                aria-pressed="true"
                :data-testid="`food-delivery-platform-save-${merchant.id}`"
                @click="togglePlatformMerchantSaved(merchant)"
              >
                <i class="fas fa-heart text-[10px]"></i>
              </button>
            </article>
          </div>
          <div
            v-else
            class="rounded-[1.3rem] border border-dashed border-rose-200 bg-white p-7 text-center"
            data-testid="food-delivery-saved-empty"
          >
            <i class="far fa-heart text-2xl text-rose-300"></i>
            <p class="mt-3 text-sm font-black text-gray-800">
              {{ t('还没有收藏小店', 'No saved shops yet') }}
            </p>
            <button
              type="button"
              class="mt-4 rounded-full bg-gray-950 px-4 py-2 text-xs font-black text-white"
              data-testid="food-delivery-saved-browse"
              @click="openPlatformPage('home')"
            >
              {{ t('返回首页发现', 'Discover shops') }}
            </button>
          </div>
        </section>

        <section
          v-else-if="platformPageKey === 'profile'"
          class="space-y-5"
          data-testid="food-delivery-platform-profile-page"
        >
          <header class="flex items-center justify-between gap-3 pt-1">
            <div class="flex min-w-0 items-center gap-3">
              <button
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm ring-1 ring-black/5"
                data-testid="food-delivery-platform-profile-back"
                :aria-label="t('返回首页', 'Back home')"
                @click="openPlatformPage('home')"
              >
                <i class="fas fa-chevron-left text-sm"></i>
              </button>
              <div class="min-w-0">
                <p class="text-[10px] font-black uppercase text-[#159f9a]">
                  {{ t('平台账户', 'Platform account') }}
                </p>
                <h2 class="truncate text-2xl font-black text-gray-950">
                  {{ t('我的外卖', 'My delivery') }}
                </h2>
              </div>
            </div>
            <button
              type="button"
              class="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-800 shadow-sm ring-1 ring-black/5"
              data-testid="food-delivery-platform-profile-notifications"
              :aria-label="t('平台消息', 'Platform updates')"
              @click="openPlatformUtilitySheet('notifications')"
            >
              <i class="fas fa-bell"></i>
            </button>
          </header>

          <section
            class="overflow-hidden rounded-[1.25rem] bg-gray-950 p-5 text-white shadow-[0_18px_38px_rgba(15,23,42,0.2)]"
            data-testid="food-delivery-platform-profile-summary"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[10px] font-black uppercase text-[#74e4de]">
                  {{ t('尝鲜会员', 'Taster member') }}
                </p>
                <h3 class="mt-2 text-xl font-black">
                  {{ t('今天也要好好吃饭', 'Make today a good meal') }}
                </h3>
                <p class="mt-2 text-xs font-semibold leading-5 text-white/60">
                  {{
                    t(
                      '订单、收藏、地址与配送服务都从这里进入。',
                      'Orders, saved shops, addresses, and delivery help all start here.',
                    )
                  }}
                </p>
              </div>
              <span
                class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#24bcb7] text-xl"
                ><i class="fas fa-face-smile"></i
              ></span>
            </div>
            <div class="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
              <div>
                <p class="text-xl font-black">{{ foodDeliveryStore.platformOrderCount }}</p>
                <p class="mt-1 text-[10px] font-bold text-white/45">
                  {{ t('平台订单', 'Orders') }}
                </p>
              </div>
              <div>
                <p class="text-xl font-black">{{ platformSavedMerchantIds.length }}</p>
                <p class="mt-1 text-[10px] font-bold text-white/45">{{ t('收藏小店', 'Saved') }}</p>
              </div>
              <div>
                <p class="text-xl font-black">1</p>
                <p class="mt-1 text-[10px] font-bold text-white/45">
                  {{ t('本周权益', 'Weekly perk') }}
                </p>
              </div>
            </div>
          </section>

          <section class="space-y-3" data-testid="food-delivery-platform-profile-activity">
            <div class="flex items-center justify-between gap-3 px-0.5">
              <h3 class="text-base font-black text-gray-950">{{ t('我的活动', 'My activity') }}</h3>
              <span class="text-[0.68rem] font-bold text-gray-400">{{
                t('平台内记录', 'Platform only')
              }}</span>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                class="min-h-[6.8rem] rounded-[1rem] bg-[#e8fbfa] p-4 text-left text-[#117f7b] shadow-sm ring-1 ring-[#24bcb7]/10 transition active:scale-[0.98]"
                data-testid="food-delivery-platform-profile-orders"
                @click="openPlatformPage('orders')"
              >
                <i class="fas fa-receipt text-lg"></i>
                <p class="mt-4 text-sm font-black">{{ t('过往订单', 'Past orders') }}</p>
                <p class="mt-1 text-[10px] font-bold opacity-65">
                  {{ t('查看进度与再次点单', 'Track and reorder') }}
                </p>
              </button>
              <button
                type="button"
                class="min-h-[6.8rem] rounded-[1rem] bg-rose-50 p-4 text-left text-rose-700 shadow-sm ring-1 ring-rose-100 transition active:scale-[0.98]"
                data-testid="food-delivery-platform-profile-saved"
                @click="openPlatformPage('saved')"
              >
                <i class="fas fa-heart text-lg"></i>
                <p class="mt-4 text-sm font-black">{{ t('收藏小店', 'Saved shops') }}</p>
                <p class="mt-1 text-[10px] font-bold opacity-65">
                  {{ t('回到常点与想吃清单', 'Return to favorites') }}
                </p>
              </button>
            </div>
          </section>

          <section class="space-y-3" data-testid="food-delivery-platform-profile-addresses">
            <div class="px-0.5">
              <h3 class="text-base font-black text-gray-950">
                {{ t('常用配送地址', 'Delivery addresses') }}
              </h3>
              <p class="mt-1 text-xs font-semibold text-gray-500">{{ platformLocationLabel }}</p>
            </div>
            <div class="space-y-2">
              <button
                v-for="(address, addressIndex) in platformDeliveryAddressOptions"
                :key="address"
                type="button"
                class="flex w-full items-center gap-3 rounded-[0.95rem] bg-white px-3 py-3 text-left shadow-sm ring-1 ring-black/[0.04] transition active:scale-[0.99]"
                :class="platformLocationLabel === address ? 'text-[#128e89]' : 'text-gray-700'"
                :aria-pressed="platformLocationLabel === address"
                :data-testid="`food-delivery-platform-profile-address-${addressIndex}`"
                @click="selectPlatformDeliveryAddress(address)"
              >
                <span
                  class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  :class="platformLocationLabel === address ? 'bg-[#e5fbfa]' : 'bg-gray-100'"
                  ><i class="fas fa-location-dot text-xs"></i
                ></span>
                <span class="min-w-0 flex-1 text-xs font-black leading-5">{{ address }}</span>
                <i
                  :class="
                    platformLocationLabel === address ? 'fas fa-check' : 'fas fa-chevron-right'
                  "
                  class="text-[10px]"
                ></i>
              </button>
            </div>
          </section>

          <section class="space-y-2" data-testid="food-delivery-platform-profile-services">
            <h3 class="px-0.5 text-base font-black text-gray-950">
              {{ t('会员与服务', 'Membership and service') }}
            </h3>
            <button
              type="button"
              class="flex w-full items-center gap-3 border-b border-gray-200 py-3 text-left"
              data-testid="food-delivery-platform-profile-membership"
              @click="openPlatformCampaign('club_free_delivery')"
            >
              <span
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] bg-amber-50 text-amber-700"
                ><i class="fas fa-crown"></i
              ></span>
              <span class="min-w-0 flex-1"
                ><span class="block text-sm font-black text-gray-950">{{
                  t('平台会员', 'Platform membership')
                }}</span
                ><span class="mt-0.5 block text-xs font-semibold text-gray-500">{{
                  t('查看免配送权益和适用小店', 'See free-delivery perks and eligible shops')
                }}</span></span
              >
              <i class="fas fa-chevron-right text-[10px] text-gray-300"></i>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-3 border-b border-gray-200 py-3 text-left"
              data-testid="food-delivery-platform-profile-delivery-support"
              @click="openPlatformPage('orders')"
            >
              <span
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] bg-sky-50 text-sky-700"
                ><i class="fas fa-headset"></i
              ></span>
              <span class="min-w-0 flex-1"
                ><span class="block text-sm font-black text-gray-950">{{
                  t('配送与沟通', 'Delivery and contact')
                }}</span
                ><span class="mt-0.5 block text-xs font-semibold text-gray-500">{{
                  t(
                    '从配送中的订单联系骑手或小店',
                    'Contact the rider or shop from an active order',
                  )
                }}</span></span
              >
              <i class="fas fa-chevron-right text-[10px] text-gray-300"></i>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-3 py-3 text-left"
              data-testid="food-delivery-platform-profile-updates"
              @click="openPlatformUtilitySheet('notifications')"
            >
              <span
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.8rem] bg-violet-50 text-violet-700"
                ><i class="fas fa-bell"></i
              ></span>
              <span class="min-w-0 flex-1"
                ><span class="block text-sm font-black text-gray-950">{{
                  t('消息与优惠', 'Updates and offers')
                }}</span
                ><span class="mt-0.5 block text-xs font-semibold text-gray-500">{{
                  t('查看权益、营业和配送提醒', 'Review perks, openings, and delivery updates')
                }}</span></span
              >
              <i class="fas fa-chevron-right text-[10px] text-gray-300"></i>
            </button>
          </section>
        </section>

        <section
          v-else-if="platformPageKey === 'checkout'"
          class="space-y-4"
          data-testid="food-delivery-platform-checkout-page"
        >
          <header class="flex items-center gap-3 pt-1">
            <button
              type="button"
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm ring-1 ring-black/5"
              data-testid="food-delivery-platform-checkout-back"
              :aria-label="t('返回购物车', 'Back to cart')"
              @click="returnToPlatformCart"
            >
              <i class="fas fa-chevron-left text-sm"></i>
            </button>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-[#159f9a]">
                {{ t('确认后下单', 'Review and place') }}
              </p>
              <h2 class="truncate text-2xl font-black text-gray-950">
                {{ t('确认订单', 'Review order') }}
              </h2>
            </div>
          </header>

          <template v-if="foodDeliveryStore.platformCartItems.length > 0 && platformCartMerchant">
            <section
              class="overflow-hidden rounded-[1.35rem] bg-gray-950 p-4 text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]"
            >
              <div class="grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase text-[#71d9d5]">
                    {{ t('本次用餐', 'Your order') }}
                  </p>
                  <h3 class="mt-1 truncate text-xl font-black">{{ platformCartMerchant.name }}</h3>
                  <p class="mt-2 text-xs font-semibold leading-5 text-white/60">
                    {{
                      t(
                        `共 ${foodDeliveryStore.platformCartQuantity} 件，预计 ${platformCartMerchant.deliveryEtaMinutes} 分钟送达`,
                        `${foodDeliveryStore.platformCartQuantity} items · about ${platformCartMerchant.deliveryEtaMinutes} min`,
                      )
                    }}
                  </p>
                </div>
                <div
                  class="flex h-[6.5rem] w-[6.5rem] items-center justify-center overflow-hidden"
                  data-asset-slot="platform-checkout-takeout-bag"
                  data-required-asset="platform/orders/platform-checkout-takeout-bag-01.png"
                >
                  <img
                    :src="platformMissingAssetPlaceholderUrl"
                    :alt="t('待补结算页素材', 'Checkout artwork pending')"
                    class="h-[5.5rem] w-[5.5rem] object-contain"
                    data-asset-placeholder
                  />
                </div>
              </div>
            </section>

            <section class="rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase text-gray-400">
                    {{ t('配送地址', 'Delivery address') }}
                  </p>
                  <p
                    class="mt-1 text-sm font-black leading-5 text-gray-950"
                    data-testid="food-delivery-platform-checkout-address"
                  >
                    {{ platformLocationLabel }}
                  </p>
                </div>
                <span
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e5fbfa] text-[#159f9a]"
                >
                  <i class="fas fa-location-dot"></i>
                </span>
              </div>
              <div
                class="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <button
                  v-for="(address, addressIndex) in platformDeliveryAddressOptions"
                  :key="address"
                  type="button"
                  class="shrink-0 rounded-full px-3 py-2 text-[11px] font-black ring-1 ring-inset"
                  :class="
                    platformLocationLabel === address
                      ? 'bg-[#24bcb7] text-white ring-[#24bcb7]'
                      : 'bg-gray-50 text-gray-600 ring-gray-200'
                  "
                  :aria-pressed="platformLocationLabel === address"
                  :data-testid="`food-delivery-platform-checkout-address-${addressIndex}`"
                  @click="selectPlatformDeliveryAddress(address)"
                >
                  {{
                    addressIndex === 0
                      ? t('当前地址', 'Current')
                      : addressIndex === 1
                        ? t('常用地址', 'Saved')
                        : t('公司', 'Work')
                  }}
                </button>
              </div>
            </section>

            <section
              class="rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-black/5"
              data-testid="food-delivery-platform-checkout-items"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase text-[#159f9a]">
                    {{ t('餐品明细', 'Order items') }}
                  </p>
                  <h3 class="mt-1 truncate text-lg font-black text-gray-950">
                    {{ platformCartMerchant.name }}
                  </h3>
                </div>
                <span
                  class="rounded-full bg-[#e5fbfa] px-3 py-1.5 text-[11px] font-black text-[#128e89]"
                >
                  {{ foodDeliveryStore.platformCartQuantity }} {{ t('件', 'items') }}
                </span>
              </div>
              <div class="mt-3 space-y-2">
                <div
                  v-for="item in foodDeliveryStore.platformCartItems"
                  :key="item.itemId"
                  class="flex items-center justify-between gap-3 rounded-[0.9rem] bg-gray-50 px-3 py-3"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-gray-900">{{ item.title }}</p>
                    <p class="mt-1 text-[11px] font-bold text-gray-500">× {{ item.quantity }}</p>
                  </div>
                  <span class="shrink-0 text-xs font-black text-gray-900">{{
                    platformCartLineTotal(item)
                  }}</span>
                </div>
              </div>
            </section>

            <section class="rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-black/5">
              <label
                for="food-delivery-platform-order-note"
                class="text-xs font-black text-gray-900"
              >
                {{ t('订单备注', 'Order note') }}
              </label>
              <textarea
                id="food-delivery-platform-order-note"
                v-model="platformCheckoutNote"
                rows="3"
                maxlength="240"
                class="mt-2 w-full resize-none rounded-[1rem] bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-800 outline-none ring-1 ring-inset ring-gray-100 focus:ring-[#24bcb7]"
                :placeholder="
                  t('例如：少辣，放门口即可', 'For example: mild spice, leave at the door')
                "
                data-testid="food-delivery-platform-checkout-note"
              ></textarea>
            </section>

            <section class="rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-black/5">
              <p class="text-xs font-black text-gray-900">{{ t('支付方式', 'Payment method') }}</p>
              <div class="mt-3 space-y-2">
                <label
                  v-for="option in platformCheckoutPaymentOptions"
                  :key="option.key"
                  class="flex cursor-pointer items-center gap-3 rounded-[1rem] p-3 ring-1 ring-inset"
                  :class="
                    platformCheckoutPaymentMethod === option.key
                      ? 'bg-[#e5fbfa] ring-[#24bcb7]'
                      : 'bg-gray-50 ring-gray-100'
                  "
                  :data-testid="`food-delivery-platform-payment-${option.key}`"
                >
                  <input
                    v-model="platformCheckoutPaymentMethod"
                    type="radio"
                    name="food-delivery-platform-payment"
                    :value="option.key"
                    class="sr-only"
                  />
                  <span
                    class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#159f9a] shadow-sm"
                  >
                    <i :class="option.icon"></i>
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block text-sm font-black text-gray-950">{{ option.label }}</span>
                    <span class="mt-0.5 block text-[10px] font-semibold leading-4 text-gray-500">{{
                      option.desc
                    }}</span>
                  </span>
                  <i
                    v-if="platformCheckoutPaymentMethod === option.key"
                    class="fas fa-circle-check text-[#159f9a]"
                  ></i>
                </label>
              </div>
            </section>

            <section
              class="rounded-[1.25rem] bg-gray-950 p-4 text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]"
            >
              <dl class="space-y-2 text-xs font-semibold text-white/70">
                <div class="flex items-center justify-between gap-3">
                  <dt>{{ t('商品金额', 'Items') }}</dt>
                  <dd>
                    {{
                      displayMoney(
                        foodDeliveryStore.platformCartPrimaryTotal.amount,
                        foodDeliveryStore.platformCartPrimaryTotal.currency,
                      )
                    }}
                  </dd>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <dt>{{ t('配送费', 'Delivery fee') }}</dt>
                  <dd>{{ displayMoney(platformCartMerchant.deliveryFee) }}</dd>
                </div>
              </dl>
              <div class="mt-3 flex items-end justify-between gap-3 border-t border-white/10 pt-3">
                <div>
                  <p class="text-[10px] font-black uppercase text-white/45">
                    {{ t('应付合计', 'Order total') }}
                  </p>
                  <p
                    class="mt-1 text-2xl font-black"
                    data-testid="food-delivery-platform-checkout-total"
                  >
                    {{ displayMoney(platformCheckoutTotal.amount, platformCheckoutTotal.currency) }}
                  </p>
                </div>
                <span class="text-right text-[10px] font-bold leading-4 text-white/55">
                  {{
                    t(
                      `约 ${platformCartMerchant.deliveryEtaMinutes} 分钟送达`,
                      `About ${platformCartMerchant.deliveryEtaMinutes} min`,
                    )
                  }}
                </span>
              </div>
              <button
                type="button"
                class="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[1rem] bg-[#24bcb7] px-4 text-sm font-black text-white transition active:scale-[0.99]"
                data-testid="food-delivery-platform-checkout-submit"
                @click="submitPlatformOrder"
              >
                {{ t('提交订单', 'Place order') }}
                <i class="fas fa-arrow-right text-xs"></i>
              </button>
              <p
                v-if="platformCheckoutFeedback"
                class="mt-2 text-center text-xs font-bold text-rose-300"
                aria-live="polite"
              >
                {{ platformCheckoutFeedback }}
              </p>
            </section>
          </template>

          <div
            v-else
            class="rounded-[1.25rem] bg-white p-7 text-center shadow-sm ring-1 ring-black/5"
          >
            <i class="fas fa-cart-shopping text-2xl text-[#24bcb7]"></i>
            <p class="mt-3 text-sm font-black text-gray-900">
              {{ t('购物车已经空了', 'Your cart is empty') }}
            </p>
            <button
              type="button"
              class="mt-4 rounded-full bg-gray-950 px-4 py-2 text-xs font-black text-white"
              @click="openPlatformPage('home')"
            >
              {{ t('返回首页选餐', 'Browse shops') }}
            </button>
          </div>
        </section>

        <section
          v-else-if="platformPageKey === 'orders'"
          class="space-y-4"
          data-testid="food-delivery-platform-orders-page"
        >
          <header class="flex items-center justify-between gap-3 pt-1">
            <div class="flex min-w-0 items-center gap-3">
              <button
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm ring-1 ring-black/5"
                data-testid="food-delivery-platform-orders-back"
                :aria-label="t('返回首页', 'Back home')"
                @click="openPlatformPage('home')"
              >
                <i class="fas fa-chevron-left text-sm"></i>
              </button>
              <div class="min-w-0">
                <p class="text-[10px] font-black uppercase text-[#159f9a]">
                  {{ t('最近点过', 'Recent orders') }}
                </p>
                <h2 class="truncate text-2xl font-black text-gray-950">
                  {{ t('我的订单', 'My orders') }}
                </h2>
              </div>
            </div>
            <span
              class="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-[#e5fbfa] px-3 text-sm font-black text-[#128e89]"
            >
              {{ foodDeliveryStore.platformOrderCount }}
            </span>
          </header>

          <div
            v-if="foodDeliveryStore.recentPlatformOrders.length > 0"
            class="space-y-3"
            data-testid="food-delivery-platform-order-list"
          >
            <button
              v-for="order in foodDeliveryStore.recentPlatformOrders"
              :key="order.id"
              type="button"
              class="block w-full rounded-[1.2rem] bg-white p-4 text-left shadow-[0_10px_26px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.04] transition active:scale-[0.99]"
              :data-testid="`food-delivery-platform-order-card-${order.id}`"
              @click="openPlatformOrder(order.id)"
            >
              <span class="flex items-start gap-3">
                <span
                  class="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem] bg-gray-100 text-[#159f9a] ring-1 ring-black/5"
                  :data-asset-slot="`platform-merchant-mark-${order.merchantId}`"
                  :data-required-asset="platformMerchantIdentityAssetPath(order.merchantId)"
                >
                  <img
                    :src="platformMissingAssetPlaceholderUrl"
                    :alt="t('待补商家身份素材', 'Merchant mark pending')"
                    class="h-full w-full object-contain p-1"
                    data-asset-placeholder
                  />
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-base font-black text-gray-950">{{
                    order.merchantName
                  }}</span>
                  <span class="mt-1 block text-[11px] font-semibold text-gray-500">
                    {{ formatFoodDeliveryEventTime(order.createdAt) }} ·
                    {{ platformOrderNumber(order) }}
                  </span>
                </span>
                <span
                  class="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black"
                  :class="resolvePlatformOrderStatus(order.status).badgeClass"
                >
                  {{ resolvePlatformOrderStatus(order.status).label }}
                </span>
              </span>
              <span class="mt-3 block truncate text-xs font-semibold text-gray-600">
                {{ order.items.map((item) => `${item.title} × ${item.quantity}`).join(' · ') }}
              </span>
              <span
                class="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3"
              >
                <span class="text-[11px] font-bold text-gray-500"
                  >{{ order.itemCount }} {{ t('件', 'items') }} · {{ order.etaMinutes }} min</span
                >
                <span class="text-sm font-black text-gray-950">{{
                  displayMoney(order.total, order.currency)
                }}</span>
              </span>
            </button>
          </div>

          <div
            v-else
            class="rounded-[1.3rem] border border-dashed border-teal-200 bg-white p-7 text-center"
            data-testid="food-delivery-platform-orders-empty"
          >
            <div
              class="mx-auto flex h-28 w-32 items-center justify-center"
              data-asset-slot="platform-orders-empty-receipt"
              data-required-asset="platform/orders/platform-orders-empty-receipt-01.png"
            >
              <img
                :src="platformMissingAssetPlaceholderUrl"
                :alt="t('待补空订单素材', 'Empty orders artwork pending')"
                class="h-full w-full object-contain p-1"
                data-asset-placeholder
              />
            </div>
            <p class="mt-2 text-sm font-black text-gray-900">
              {{ t('还没有订单', 'No orders yet') }}
            </p>
            <p class="mt-1 text-xs font-semibold leading-5 text-gray-500">
              {{
                t(
                  '第一笔订单提交后，可以在这里查看进度和详情。',
                  'Place your first order to follow its progress and details here.',
                )
              }}
            </p>
            <button
              type="button"
              class="mt-4 rounded-full bg-[#24bcb7] px-4 py-2 text-xs font-black text-white"
              @click="openPlatformPage('home')"
            >
              {{ t('去选小店', 'Browse shops') }}
            </button>
          </div>
        </section>

        <section
          v-else-if="platformPageKey === 'order'"
          class="space-y-4"
          data-testid="food-delivery-platform-order-page"
        >
          <header class="flex items-center gap-3 pt-1">
            <button
              type="button"
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm ring-1 ring-black/5"
              data-testid="food-delivery-platform-order-back"
              :aria-label="t('返回订单列表', 'Back to orders')"
              @click="openPlatformPage('orders')"
            >
              <i class="fas fa-chevron-left text-sm"></i>
            </button>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase text-[#159f9a]">
                {{ t('平台订单', 'Platform order') }}
              </p>
              <h2 class="truncate text-2xl font-black text-gray-950">
                {{ t('订单详情', 'Order details') }}
              </h2>
            </div>
          </header>

          <template v-if="activePlatformOrder">
            <section
              class="overflow-hidden rounded-[1.35rem] p-5 text-white"
              :class="activePlatformOrderStatus.heroClass"
              :data-order-status="activePlatformOrderStatus.key"
              data-testid="food-delivery-platform-order-success"
            >
              <div class="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase text-white/65">
                    {{ activePlatformOrderStatus.eyebrow }}
                  </p>
                  <h3 class="mt-1 text-2xl font-black leading-tight">
                    {{ activePlatformOrderStatus.title }}
                  </h3>
                  <p class="mt-2 text-xs font-semibold leading-5 text-white/75">
                    {{ activePlatformOrderStatus.desc }}
                  </p>
                  <span
                    v-if="
                      activePlatformOrder.status !== FOOD_DELIVERY_ORDER_STATUS.DELIVERED &&
                      activePlatformOrder.status !== FOOD_DELIVERY_ORDER_STATUS.CANCELLED
                    "
                    class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-950/18 px-3 py-1.5 text-[10px] font-black"
                  >
                    <i class="far fa-clock"></i>
                    {{
                      t(
                        `约 ${activePlatformOrder.etaMinutes} 分钟`,
                        `About ${activePlatformOrder.etaMinutes} min`,
                      )
                    }}
                  </span>
                </div>
                <div
                  class="flex h-28 w-28 items-center justify-center"
                  :data-asset-slot="`platform-order-status-${activePlatformOrderStatus.assetKey}`"
                  :data-required-asset="`platform/orders/platform-order-status-${activePlatformOrderStatus.assetKey}-01.png`"
                >
                  <img
                    :src="platformMissingAssetPlaceholderUrl"
                    :alt="t('待补订单状态素材', 'Order status artwork pending')"
                    class="h-24 w-24 object-contain"
                    data-asset-placeholder
                  />
                </div>
              </div>
              <div class="mt-5 grid grid-cols-4 gap-1.5 text-center">
                <div
                  v-for="(step, stepIndex) in platformOrderSteps"
                  :key="step.key"
                  class="rounded-[0.8rem] px-1 py-2.5"
                  :class="
                    activePlatformOrderStatus.stepIndex >= stepIndex
                      ? 'bg-white/16 text-white'
                      : 'bg-white/7 text-white/45'
                  "
                >
                  <i :class="step.icon" class="text-xs"></i>
                  <p class="mt-1 truncate text-[9px] font-black">{{ step.label }}</p>
                </div>
              </div>
            </section>

            <section class="rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase text-gray-400">
                    {{ t('订单号', 'Order number') }}
                  </p>
                  <p
                    class="mt-1 text-sm font-black text-gray-800"
                    :data-order-id="activePlatformOrder.id"
                    data-testid="food-delivery-platform-order-id"
                  >
                    {{ platformOrderNumber(activePlatformOrder) }}
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-gray-50 px-3 text-[10px] font-black text-gray-600 ring-1 ring-inset ring-gray-100 transition active:bg-gray-100"
                  data-testid="food-delivery-platform-order-copy"
                  @click="copyPlatformOrderNumber(activePlatformOrder)"
                >
                  <i class="far fa-copy"></i>
                  {{ platformOrderCopyFeedback || t('复制', 'Copy') }}
                </button>
              </div>
              <p class="mt-1 text-[10px] font-bold text-gray-400">
                {{ formatFoodDeliveryEventTime(activePlatformOrder.createdAt) }}
              </p>
              <div class="mt-4 space-y-3 border-t border-gray-100 pt-4">
                <div class="flex gap-3">
                  <i class="fas fa-location-dot mt-0.5 w-5 text-center text-[#159f9a]"></i>
                  <div>
                    <p class="text-[10px] font-black text-gray-400">
                      {{ t('配送到', 'Deliver to') }}
                    </p>
                    <p class="mt-1 text-xs font-bold leading-5 text-gray-800">
                      {{ activePlatformOrder.deliveryAddress }}
                    </p>
                  </div>
                </div>
                <div class="flex gap-3">
                  <i class="fas fa-credit-card mt-0.5 w-5 text-center text-[#159f9a]"></i>
                  <div>
                    <p class="text-[10px] font-black text-gray-400">
                      {{ t('支付方式', 'Payment') }}
                    </p>
                    <p class="mt-1 text-xs font-bold text-gray-800">
                      {{ platformPaymentMethodLabel(activePlatformOrder.paymentMethod) }}
                    </p>
                  </div>
                </div>
                <div v-if="activePlatformOrder.note" class="flex gap-3">
                  <i class="fas fa-note-sticky mt-0.5 w-5 text-center text-[#159f9a]"></i>
                  <div>
                    <p class="text-[10px] font-black text-gray-400">{{ t('备注', 'Note') }}</p>
                    <p class="mt-1 text-xs font-bold leading-5 text-gray-800">
                      {{ activePlatformOrder.note }}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section
              class="rounded-[1.25rem] bg-white p-4 shadow-sm ring-1 ring-black/5"
              data-testid="food-delivery-platform-order-summary"
            >
              <h3 class="text-base font-black text-gray-950">
                {{ activePlatformOrder.merchantName }}
              </h3>
              <div class="mt-3 space-y-2">
                <div
                  v-for="item in activePlatformOrder.items"
                  :key="item.id"
                  class="flex items-center justify-between gap-3 text-xs"
                >
                  <span class="min-w-0 truncate font-bold text-gray-700"
                    >{{ item.title }} × {{ item.quantity }}</span
                  >
                  <span class="shrink-0 font-black text-gray-900">{{
                    displayMoney(
                      ((item.unitPriceCents * item.quantity) / 100).toFixed(2),
                      item.currency,
                    )
                  }}</span>
                </div>
              </div>
              <dl
                class="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs font-semibold text-gray-500"
              >
                <div class="flex justify-between gap-3">
                  <dt>{{ t('商品金额', 'Items') }}</dt>
                  <dd>
                    {{ displayMoney(activePlatformOrder.itemsTotal, activePlatformOrder.currency) }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt>{{ t('配送费', 'Delivery fee') }}</dt>
                  <dd>
                    {{
                      displayMoney(activePlatformOrder.deliveryFee, activePlatformOrder.currency)
                    }}
                  </dd>
                </div>
                <div class="flex items-end justify-between gap-3 pt-1 text-gray-950">
                  <dt class="font-black">{{ t('合计', 'Total') }}</dt>
                  <dd class="text-xl font-black">
                    {{ displayMoney(activePlatformOrder.total, activePlatformOrder.currency) }}
                  </dd>
                </div>
              </dl>
            </section>

            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="min-h-11 rounded-[1rem] bg-white text-xs font-black text-gray-700 shadow-sm ring-1 ring-black/5"
                @click="openPlatformPage('home')"
              >
                {{ t('返回首页', 'Back home') }}
              </button>
              <button
                type="button"
                class="min-h-11 rounded-[1rem] bg-gray-950 text-xs font-black text-white"
                data-testid="food-delivery-platform-view-orders"
                @click="openPlatformPage('orders')"
              >
                {{ t('查看全部订单', 'View all orders') }}
              </button>
            </div>
          </template>

          <div
            v-else
            class="rounded-[1.25rem] bg-white p-7 text-center shadow-sm ring-1 ring-black/5"
            data-testid="food-delivery-platform-order-missing"
          >
            <i class="fas fa-receipt text-2xl text-gray-300"></i>
            <p class="mt-3 text-sm font-black text-gray-900">
              {{ t('没有找到这笔订单', 'Order not found') }}
            </p>
            <button
              type="button"
              class="mt-4 rounded-full bg-gray-950 px-4 py-2 text-xs font-black text-white"
              @click="openPlatformPage('orders')"
            >
              {{ t('返回订单列表', 'Back to orders') }}
            </button>
          </div>
        </section>

        <nav
          v-if="platformPageKey !== 'checkout' && platformPageKey !== 'order'"
          class="rounded-[1.4rem] bg-white/95 px-2 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.14)] ring-1 ring-black/5 backdrop-blur"
          data-testid="food-delivery-platform-bottom-nav"
        >
          <div class="grid grid-cols-5 gap-1">
            <button
              v-for="item in platformBottomNavItems"
              :key="item.key"
              type="button"
              class="flex min-h-[3.65rem] flex-col items-center justify-center gap-1 rounded-[1rem] text-[0.68rem] font-black transition active:scale-[0.98]"
              :class="item.active ? 'bg-[#e5fbfa] text-[#13aaa5]' : 'text-gray-500'"
              :aria-current="item.active ? 'page' : undefined"
              :data-testid="`food-delivery-platform-nav-${item.key}`"
              @click="handlePlatformNavItem(item)"
            >
              <i :class="item.icon" class="text-lg"></i>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </nav>
        <div
          v-if="platformMerchantSheetOpen && selectedPlatformMerchant"
          class="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/42 px-4 pb-4 pt-16 backdrop-blur-sm"
          data-testid="food-delivery-platform-merchant-dialog"
          @click.self="closePlatformMerchantSheet"
        >
          <section
            class="max-h-[84vh] w-full max-w-md overflow-y-auto rounded-[1.65rem] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.28)] ring-1 ring-black/5"
            data-testid="food-delivery-platform-merchant-detail"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[11px] font-black text-[#24a9a5]">
                  {{ t('平台内小店', 'Platform merchant') }}
                </p>
                <h3 class="mt-1 truncate text-2xl font-black text-gray-950">
                  {{ selectedPlatformMerchant.name }}
                </h3>
                <p class="mt-1 text-xs font-semibold leading-5 text-gray-500">
                  {{ selectedPlatformMerchant.desc }}
                </p>
              </div>
              <button
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700"
                data-testid="food-delivery-platform-merchant-close"
                aria-label="Close merchant detail"
                @click="closePlatformMerchantSheet"
              >
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <div
              class="relative mt-4 h-36 overflow-hidden rounded-[1.2rem] bg-gradient-to-br"
              :class="
                selectedPlatformMerchant.fallbackClass || 'from-[#e6fffd] to-white text-[#24bcb7]'
              "
              :data-asset-slot="`platform-merchant-cover-${selectedPlatformMerchant.id}`"
              :data-required-asset="selectedPlatformMerchant.requiredAsset || undefined"
              :data-merchant-visual-type="selectedPlatformMerchant.visualType || 'food-photo'"
            >
              <img
                v-if="selectedPlatformMerchant.imageUrl"
                :src="selectedPlatformMerchant.imageUrl"
                :alt="selectedPlatformMerchant.imageAlt || selectedPlatformMerchant.name"
                class="relative z-10 h-full w-full"
                :class="
                  isPlatformLogoMerchant(selectedPlatformMerchant)
                    ? 'object-contain p-7'
                    : 'object-cover'
                "
                @error="$event.currentTarget.style.display = 'none'"
              />
              <span
                v-if="isPlatformLogoMerchant(selectedPlatformMerchant)"
                class="absolute inset-0 m-auto flex h-24 w-32 items-center justify-center whitespace-pre-line text-center text-2xl font-black leading-tight opacity-80"
                >{{ platformMerchantLogoMark(selectedPlatformMerchant) }}</span
              >
              <i
                v-else
                :class="selectedPlatformMerchant.icon || 'fas fa-store'"
                class="absolute inset-0 m-auto h-12 w-12 text-5xl opacity-80"
              ></i>
              <span
                class="absolute left-3 top-3 z-20 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-[#128e89] shadow-sm"
              >
                {{ selectedPlatformMerchant.badge }}
              </span>
            </div>

            <div class="mt-3 grid grid-cols-3 gap-2 text-center">
              <div class="rounded-[1rem] bg-gray-50 px-2 py-3">
                <p class="text-[10px] font-black text-gray-400">{{ t('评分', 'Rating') }}</p>
                <p class="mt-1 text-sm font-black text-gray-950">
                  {{ selectedPlatformMerchant.rating.toFixed(1) }}
                </p>
              </div>
              <div class="rounded-[1rem] bg-gray-50 px-2 py-3">
                <p class="text-[10px] font-black text-gray-400">{{ t('配送费', 'Delivery') }}</p>
                <p class="mt-1 text-sm font-black text-gray-950">
                  {{ displayMoney(selectedPlatformMerchant.deliveryFee) }}
                </p>
              </div>
              <div class="rounded-[1rem] bg-gray-50 px-2 py-3">
                <p class="text-[10px] font-black text-gray-400">{{ t('送达', 'ETA') }}</p>
                <p class="mt-1 text-sm font-black text-gray-950">
                  {{ selectedPlatformMerchant.deliveryEtaMinutes }} min
                </p>
              </div>
            </div>

            <div class="mt-4 space-y-2" data-testid="food-delivery-platform-merchant-menu">
              <div class="flex items-center justify-between">
                <p class="text-sm font-black text-gray-950">{{ t('本店菜单', 'Menu') }}</p>
                <span
                  class="rounded-full bg-[#e5fbfa] px-3 py-1 text-[11px] font-black text-[#128e89]"
                >
                  {{ selectedPlatformMerchant.menu.length }} {{ t('项', 'items') }}
                </span>
              </div>
              <article
                v-for="(item, itemIndex) in selectedPlatformMerchant.menu"
                :key="`${selectedPlatformMerchant.id}-${item.title}`"
                class="flex items-center gap-3 rounded-[1rem] bg-[#f7fbfb] p-2.5"
                :data-testid="`food-delivery-platform-menu-item-${platformMenuItemId(selectedPlatformMerchant.id, itemIndex)}`"
              >
                <div
                  class="h-16 w-16 shrink-0 overflow-hidden rounded-[0.8rem] bg-white ring-1 ring-black/[0.04]"
                  data-platform-menu-image
                  :data-asset-slot="`platform-menu-image-${platformMenuItemId(selectedPlatformMerchant.id, itemIndex)}`"
                  :data-required-asset="
                    platformMenuItemAssetPath(selectedPlatformMerchant, itemIndex)
                  "
                >
                  <img
                    :src="platformMenuItemImageUrl(selectedPlatformMerchant, item, itemIndex)"
                    :alt="item.title"
                    class="h-full w-full object-cover"
                  />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-black text-gray-950">{{ item.title }}</p>
                  <p class="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-4 text-gray-500">
                    {{ item.desc }}
                  </p>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-2">
                  <span class="text-xs font-black text-gray-950">{{
                    displayMoney(item.price)
                  }}</span>
                  <button
                    v-if="platformCartItemQuantity(selectedPlatformMerchant.id, itemIndex) === 0"
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#24bcb7] text-white shadow-sm transition active:scale-95"
                    :aria-label="t(`加入 ${item.title}`, `Add ${item.title}`)"
                    :data-testid="`food-delivery-platform-menu-add-${platformMenuItemId(selectedPlatformMerchant.id, itemIndex)}`"
                    @click="addPlatformMenuItemToCart(item, itemIndex)"
                  >
                    <i class="fas fa-plus text-[10px]"></i>
                  </button>
                  <div
                    v-else
                    class="flex h-8 items-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/5"
                  >
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center text-gray-500 transition active:bg-gray-100"
                      :aria-label="t(`减少 ${item.title}`, `Remove one ${item.title}`)"
                      :data-testid="`food-delivery-platform-menu-decrease-${platformMenuItemId(selectedPlatformMerchant.id, itemIndex)}`"
                      @click="
                        updatePlatformCartItemQuantity(
                          platformMenuItemId(selectedPlatformMerchant.id, itemIndex),
                          platformCartItemQuantity(selectedPlatformMerchant.id, itemIndex) - 1,
                        )
                      "
                    >
                      <i class="fas fa-minus text-[9px]"></i>
                    </button>
                    <span
                      class="min-w-5 text-center text-xs font-black text-gray-950"
                      :data-testid="`food-delivery-platform-menu-quantity-${platformMenuItemId(selectedPlatformMerchant.id, itemIndex)}`"
                    >
                      {{ platformCartItemQuantity(selectedPlatformMerchant.id, itemIndex) }}
                    </span>
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center bg-[#24bcb7] text-white transition active:bg-[#159f9a]"
                      :aria-label="t(`增加 ${item.title}`, `Add one ${item.title}`)"
                      :data-testid="`food-delivery-platform-menu-increase-${platformMenuItemId(selectedPlatformMerchant.id, itemIndex)}`"
                      @click="addPlatformMenuItemToCart(item, itemIndex)"
                    >
                      <i class="fas fa-plus text-[9px]"></i>
                    </button>
                  </div>
                </div>
              </article>
              <p
                class="sr-only"
                aria-live="polite"
                data-testid="food-delivery-platform-cart-feedback"
              >
                {{ platformCartFeedback }}
              </p>
              <button
                v-if="foodDeliveryStore.platformCartQuantity > 0"
                type="button"
                class="flex min-h-12 w-full items-center justify-between rounded-[1rem] bg-gray-950 px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.2)]"
                data-testid="food-delivery-platform-menu-view-cart"
                @click="openPlatformCartFromMerchant"
              >
                <span>{{ t('查看购物车', 'View cart') }}</span>
                <span class="flex items-center gap-2">
                  {{ foodDeliveryStore.platformCartQuantity }} {{ t('件', 'items') }}
                  <i class="fas fa-chevron-right text-[10px]"></i>
                </span>
              </button>
            </div>
          </section>
        </div>
        <div
          v-if="platformUtilitySheetContent"
          class="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/42 px-4 pb-4 pt-16 backdrop-blur-sm"
          data-testid="food-delivery-platform-utility-dialog"
          @click.self="closePlatformUtilitySheet"
        >
          <section
            class="max-h-[84vh] w-full max-w-md overflow-y-auto rounded-[1.65rem] bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.28)] ring-1 ring-black/5"
            :data-utility-key="platformUtilitySheetKey"
            data-testid="food-delivery-platform-utility-sheet"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-3">
                <span
                  class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e5fbfa] text-[#159f9a]"
                >
                  <i :class="platformUtilitySheetContent.icon"></i>
                </span>
                <div class="min-w-0">
                  <h3 class="truncate text-lg font-black text-gray-950">
                    {{ platformUtilitySheetContent.title }}
                  </h3>
                  <p class="mt-1 text-xs font-semibold leading-5 text-gray-500">
                    {{ platformUtilitySheetContent.desc }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700"
                data-testid="food-delivery-platform-utility-close"
                :aria-label="t('关闭', 'Close')"
                @click="closePlatformUtilitySheet"
              >
                <i class="fas fa-xmark"></i>
              </button>
            </div>

            <div v-if="platformUtilitySheetKey === 'notifications'" class="mt-4 space-y-2">
              <div class="flex items-center gap-3 rounded-[1rem] bg-[#f3fbfb] px-3 py-3">
                <i class="fas fa-ticket text-[#24bcb7]"></i>
                <p class="text-xs font-bold text-gray-700">
                  {{ t('本周免配送权益可领取。', 'Free-delivery perks are ready this week.') }}
                </p>
              </div>
              <div class="flex items-center gap-3 rounded-[1rem] bg-[#f3fbfb] px-3 py-3">
                <i class="fas fa-store text-[#ff7a37]"></i>
                <p class="text-xs font-bold text-gray-700">
                  {{ t('附近 11 家平台小店正在营业。', 'Eleven nearby platform shops are open.') }}
                </p>
              </div>
            </div>

            <div
              v-else-if="
                platformUtilitySheetKey === 'cart' && foodDeliveryStore.platformCartItems.length > 0
              "
              class="mt-4 space-y-3"
              data-testid="food-delivery-platform-cart-content"
            >
              <div
                class="flex items-center justify-between gap-3 rounded-[1rem] bg-[#f3fbfb] px-3 py-3"
              >
                <div class="min-w-0">
                  <p class="text-[10px] font-black uppercase text-[#159f9a]">
                    {{ t('当前小店', 'Current shop') }}
                  </p>
                  <p class="mt-1 truncate text-sm font-black text-gray-950">
                    {{ foodDeliveryStore.platformCartItems[0]?.merchantName }}
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm"
                  data-testid="food-delivery-platform-cart-clear"
                  :aria-label="t('清空购物车', 'Clear cart')"
                  @click="foodDeliveryStore.clearPlatformCart()"
                >
                  <i class="fas fa-trash-can text-xs"></i>
                </button>
              </div>

              <article
                v-for="item in foodDeliveryStore.platformCartItems"
                :key="item.itemId"
                class="flex items-center justify-between gap-3 rounded-[1rem] border border-gray-100 px-3 py-3"
                :data-testid="`food-delivery-platform-cart-line-${item.itemId}`"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-black text-gray-950">{{ item.title }}</p>
                  <p class="mt-1 text-xs font-bold text-gray-500">
                    {{ platformCartLineTotal(item) }}
                  </p>
                </div>
                <div
                  class="flex h-9 shrink-0 items-center overflow-hidden rounded-full bg-gray-100"
                >
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center text-gray-500 transition active:bg-gray-200"
                    :aria-label="t(`减少 ${item.title}`, `Remove one ${item.title}`)"
                    :data-testid="`food-delivery-platform-cart-decrease-${item.itemId}`"
                    @click="updatePlatformCartItemQuantity(item.itemId, item.quantity - 1)"
                  >
                    <i class="fas fa-minus text-[9px]"></i>
                  </button>
                  <span
                    class="min-w-6 text-center text-xs font-black text-gray-950"
                    :data-testid="`food-delivery-platform-cart-quantity-${item.itemId}`"
                  >
                    {{ item.quantity }}
                  </span>
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center bg-[#24bcb7] text-white transition active:bg-[#159f9a]"
                    :aria-label="t(`增加 ${item.title}`, `Add one ${item.title}`)"
                    :data-testid="`food-delivery-platform-cart-increase-${item.itemId}`"
                    @click="updatePlatformCartItemQuantity(item.itemId, item.quantity + 1)"
                  >
                    <i class="fas fa-plus text-[9px]"></i>
                  </button>
                </div>
              </article>

              <div class="flex items-end justify-between gap-4 border-t border-gray-100 pt-3">
                <div>
                  <p class="text-[10px] font-black uppercase text-gray-400">
                    {{ t('商品合计', 'Items total') }}
                  </p>
                  <p
                    class="mt-1 text-lg font-black text-gray-950"
                    data-testid="food-delivery-platform-cart-total"
                  >
                    {{
                      displayMoney(
                        foodDeliveryStore.platformCartPrimaryTotal.amount,
                        foodDeliveryStore.platformCartPrimaryTotal.currency,
                      )
                    }}
                  </p>
                </div>
                <p
                  class="max-w-[11rem] text-right text-[10px] font-semibold leading-4 text-gray-400"
                >
                  {{
                    t(
                      '下单后可在订单页查看制作和配送进度。',
                      'Follow preparation and delivery progress after placing the order.',
                    )
                  }}
                </p>
              </div>
              <button
                type="button"
                class="flex min-h-12 w-full items-center justify-between rounded-[1rem] bg-gray-950 px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.2)] transition active:scale-[0.99]"
                data-testid="food-delivery-platform-cart-checkout"
                @click="openPlatformCheckout"
              >
                <span>{{ t('去结算', 'Checkout') }}</span>
                <span class="flex items-center gap-2">
                  {{ displayMoney(platformCheckoutTotal.amount, platformCheckoutTotal.currency) }}
                  <i class="fas fa-chevron-right text-[10px]"></i>
                </span>
              </button>
            </div>

            <div v-else class="mt-4 rounded-[1rem] bg-[#f3fbfb] p-4 text-center">
              <i class="fas fa-store text-xl text-[#24bcb7]"></i>
              <p class="mt-2 text-xs font-bold leading-5 text-gray-600">
                {{
                  platformUtilitySheetKey === 'orders'
                    ? t(
                        '还没有平台内小店订单。进入小店下单后再回到这里查看。',
                        'No platform-shop orders yet. Place an order in a shop, then return here.',
                      )
                    : t(
                        '购物车还是空的，先选择一家平台小店。',
                        'Your cart is empty. Choose a platform shop first.',
                      )
                }}
              </p>
              <button
                type="button"
                class="mt-3 inline-flex items-center gap-2 rounded-full bg-[#24bcb7] px-4 py-2 text-xs font-black text-white"
                data-testid="food-delivery-platform-utility-browse"
                @click="browsePlatformMerchantsFromUtilitySheet"
              >
                {{ t('去选小店', 'Browse shops') }}
                <i class="fas fa-chevron-right text-[10px]"></i>
              </button>
            </div>
          </section>
        </div>
        <section
          v-if="false"
          class="hidden space-y-5"
          data-testid="food-delivery-pseudo-folder-home"
        >
          <article
            class="relative overflow-hidden rounded-[2rem] bg-[#65d9d5] p-5 text-gray-950 shadow-[0_20px_48px_rgba(18,126,124,0.18)]"
            data-testid="food-delivery-platform-entry"
          >
            <div class="relative z-10 max-w-[62%]">
              <p class="text-[11px] font-black uppercase tracking-[0.18em] text-teal-900/70">
                {{ t('外卖平台', 'Food Platform') }}
              </p>
              <h2 class="mt-3 text-2xl font-black leading-tight">
                {{ t('今天也想吃点好吃的？', 'Good food for today?') }}
              </h2>
              <button
                type="button"
                class="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-gray-950 shadow-sm"
                @click="openCategory(activeCategory.key)"
              >
                {{ t('现在看看', 'Browse now') }}
                <i class="fas fa-chevron-right text-[10px]"></i>
              </button>
            </div>
            <div
              class="absolute -right-4 bottom-0 h-36 w-36 overflow-hidden rounded-full bg-white/45 p-2 shadow-[0_16px_40px_rgba(8,86,84,0.22)]"
              data-testid="food-delivery-platform-hero-image"
            >
              <img
                v-if="platformHeroImageUrl"
                :src="platformHeroImageUrl"
                :alt="platformHeroMenuItem?.image?.alt || platformHeroRestaurant?.name || 'Food'"
                class="h-full w-full rounded-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center rounded-full bg-white text-4xl text-teal-500"
              >
                <i class="fas fa-bowl-food"></i>
              </div>
            </div>
            <span
              class="absolute bottom-4 left-5 rounded-full bg-black/70 px-3 py-1 text-[11px] font-black text-white"
            >
              {{ platformRestaurantCount }} {{ t('家小店', 'shops') }}
            </span>
          </article>

          <section
            class="rounded-[1.75rem] bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-black/5"
            data-testid="food-delivery-category-panel"
          >
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="category in platformCategoryTiles"
                :key="category.key"
                type="button"
                class="min-h-[5.6rem] rounded-[1.25rem] p-2 text-center transition"
                :class="
                  category.active
                    ? 'bg-[#e6fbfa] text-gray-950 ring-1 ring-[#24bcb7]/35'
                    : 'bg-white text-gray-800'
                "
                :data-testid="`food-delivery-category-${category.key}`"
                @click="openCategory(category.key)"
              >
                <span
                  class="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-2xl text-lg"
                  :class="category.active ? 'bg-[#24bcb7] text-white' : 'bg-gray-50 text-gray-950'"
                >
                  <i :class="category.icon"></i>
                </span>
                <span class="mt-2 block truncate text-[11px] font-black">{{ category.label }}</span>
                <span class="sr-only">{{ category.key }}</span>
                <span class="mt-0.5 block text-[10px] font-semibold text-gray-400">
                  {{ category.restaurantCount }} {{ t('店', 'shops') }}
                </span>
              </button>
            </div>
          </section>

          <section class="grid grid-cols-3 gap-2" data-testid="food-delivery-platform-benefits">
            <article
              v-for="card in platformBenefitCards"
              :key="card.key"
              class="rounded-[1.35rem] bg-gradient-to-br p-3 shadow-sm ring-1 ring-black/5"
              :class="card.className"
            >
              <i :class="card.icon" class="text-lg"></i>
              <p class="mt-2 text-xs font-black leading-4">{{ card.title }}</p>
              <p class="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 opacity-70">
                {{ card.desc }}
              </p>
            </article>
          </section>

          <section class="space-y-3" data-testid="food-delivery-data-baseline">
            <div class="flex items-end justify-between gap-3">
              <div>
                <p class="text-xl font-black text-gray-950">
                  {{ t('附近热门小店', 'Popular nearby') }}
                </p>
                <span class="hidden">Local data</span>
                <p class="mt-1 text-xs font-semibold text-gray-500">
                  {{ activeCategoryLabel }} · {{ platformMenuItemCount }}
                  {{ t('个菜单项', 'menu item(s)') }}
                </p>
              </div>
              <button
                type="button"
                class="rounded-full bg-white px-3 py-1.5 text-xs font-black text-gray-600 shadow-sm ring-1 ring-black/5"
                @click="openCategory(activeCategory.key)"
              >
                {{ t('全部', 'All') }}
              </button>
            </div>

            <div
              class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2"
              data-testid="food-delivery-shop-app-list"
            >
              <article
                v-for="restaurant in platformFeaturedRestaurants"
                :key="restaurant.id"
                class="w-[11.4rem] shrink-0"
                :data-testid="`food-delivery-shop-app-${restaurant.id}`"
                :data-store-tone="restaurant.visual.tone"
              >
                <button
                  type="button"
                  class="group block w-full text-left"
                  :data-testid="`food-delivery-open-store-${restaurant.id}`"
                  @click="openRestaurantStore(restaurant)"
                >
                  <div
                    class="relative h-28 overflow-hidden rounded-[1.35rem] bg-gray-100 shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
                    :data-testid="`food-delivery-restaurant-${restaurant.id}`"
                  >
                    <img
                      v-if="foodImageUrl(restaurant)"
                      :src="foodImageUrl(restaurant)"
                      :alt="restaurant.image?.alt || restaurant.name"
                      class="h-full w-full object-cover transition duration-300 group-active:scale-[1.03]"
                    />
                    <div
                      v-else
                      class="flex h-full w-full items-center justify-center text-3xl text-[#24bcb7]"
                    >
                      <i class="fas fa-store"></i>
                    </div>
                    <span
                      class="absolute left-2 top-2 rounded-full bg-[#24bcb7] px-2 py-1 text-[10px] font-black text-white"
                    >
                      {{ t('精选', 'Pick') }}
                    </span>
                  </div>
                  <p class="mt-2 truncate text-sm font-black text-gray-950">
                    {{ restaurant.displayName }}
                  </p>
                  <p class="mt-1 text-[11px] font-semibold text-gray-500">
                    {{ restaurant.rating.toFixed(1) }} ★ · {{ restaurant.deliveryEtaMinutes }} min ·
                    {{ restaurant.deliveryFee }} {{ restaurant.currency }}
                  </p>
                  <p class="mt-1 truncate text-[11px] font-semibold text-gray-400">
                    {{ restaurant.shortDescription }}
                  </p>
                  <p
                    v-if="restaurant.entryTags.length"
                    class="mt-1 truncate text-[10px] font-black text-[#24a9a5]"
                  >
                    {{ restaurant.entryTags.join(' · ') }}
                  </p>
                </button>
              </article>
              <div
                v-if="platformFeaturedRestaurants.length === 0"
                class="w-full rounded-[1.35rem] border border-dashed border-teal-200 bg-white p-5 text-center text-xs font-semibold leading-5 text-teal-700"
                data-testid="food-delivery-shop-app-empty"
              >
                {{
                  t(
                    'No installed shop mini apps in this folder view. Add them from App Store.',
                    'No installed shop mini apps in this folder view. Add them from App Store.',
                  )
                }}
              </div>
            </div>
          </section>
        </section>

        <section
          v-if="false"
          class="hidden space-y-4 rounded-3xl border border-orange-100 bg-white p-4"
          data-testid="food-delivery-pseudo-folder-home-legacy"
        >
          <article
            class="overflow-hidden rounded-3xl bg-gray-950 p-4 text-white"
            data-testid="food-delivery-platform-entry"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-200">
                  {{ t('固定入口', 'Fixed entry') }}
                </p>
                <h2 class="mt-1 text-lg font-black">{{ t('外卖平台', 'Food Platform') }}</h2>
                <p class="mt-2 text-xs leading-5 text-white/70">
                  {{
                    t(
                      '搜索、附近、订单与所有店铺发现都从这里进入。',
                      'Search, nearby, and broad discovery stay here.',
                    )
                  }}
                </p>
              </div>
              <span
                class="shrink-0 rounded-2xl bg-white/10 px-3 py-2 text-right text-[11px] font-bold"
              >
                {{ platformRestaurantCount }} {{ t('店', 'shops') }}
              </span>
            </div>
          </article>
          <section
            class="rounded-3xl border border-orange-100 bg-white p-4"
            data-testid="food-delivery-category-panel"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-bold">{{ t('筛选店铺', 'Filter shops') }}</p>
                <p class="mt-1 text-xs text-gray-500">{{ activeCategoryLabel }}</p>
              </div>
              <span
                class="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600"
              >
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
                :class="
                  category.active ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-gray-50'
                "
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
                <p class="mt-1 line-clamp-2 text-[10px] leading-4 text-gray-500">
                  {{ category.desc }}
                </p>
              </button>
            </div>
          </section>

          <section
            class="rounded-3xl border border-orange-100 bg-white p-4"
            data-testid="food-delivery-data-baseline"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-bold">{{ t('小店 APP', 'Shop apps') }}</p>
                <p class="mt-1 text-xs" :class="isStoreMode ? 'text-slate-400' : 'text-gray-500'">
                  {{ platformRestaurantCount }} {{ t('家小店', 'shop(s)') }} ·
                  {{ platformMenuItemCount }} {{ t('个菜单项', 'menu item(s)') }}
                </p>
              </div>
              <span
                class="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-600"
              >
                {{ t('本地数据', 'Local data') }}
              </span>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-3" data-testid="food-delivery-shop-app-list">
              <article
                v-for="restaurant in shopAppEntries"
                :key="restaurant.id"
                class="rounded-3xl border border-orange-100 bg-orange-50/70 p-3"
                :data-testid="`food-delivery-shop-app-${restaurant.id}`"
                :data-store-tone="restaurant.visual.tone"
              >
                <div
                  class="flex h-full flex-col gap-3"
                  :data-testid="`food-delivery-restaurant-${restaurant.id}`"
                >
                  <div class="h-24 w-full overflow-hidden rounded-3xl bg-white">
                    <img
                      v-if="foodImageUrl(restaurant)"
                      :src="foodImageUrl(restaurant)"
                      :alt="restaurant.image?.alt || restaurant.name"
                      class="h-full w-full object-cover"
                    />
                    <div
                      v-else
                      class="flex h-full w-full items-center justify-center text-2xl text-orange-500"
                    >
                      <i class="fas fa-utensils"></i>
                    </div>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-bold">{{ restaurant.displayName }}</p>
                    <p class="mt-1 text-[11px] text-orange-700">
                      {{ restaurant.shortDescription }} · {{ restaurant.rating.toFixed(1) }} ★ ·
                      {{ restaurant.deliveryEtaMinutes }} min · {{ restaurant.distanceKm }} km
                    </p>
                    <p
                      v-if="restaurant.entryTags.length"
                      class="mt-1 truncate text-[10px] font-semibold text-orange-600"
                    >
                      {{ restaurant.entryTags.join(' · ') }}
                    </p>
                    <p class="mt-1 truncate text-[10px] font-semibold text-orange-500">
                      {{ foodImageSourceLabel(restaurant) }}
                    </p>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-orange-600"
                    >
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
              <div
                v-if="shopAppEntries.length === 0"
                class="col-span-2 rounded-3xl border border-dashed border-orange-200 bg-orange-50/70 p-4 text-center text-xs leading-5 text-orange-700"
                data-testid="food-delivery-shop-app-empty"
              >
                {{
                  t(
                    'No installed shop mini apps in this folder view. Add them from App Store.',
                    'No installed shop mini apps in this folder view. Add them from App Store.',
                  )
                }}
              </div>
            </div>
          </section>
        </section>

        <details
          v-if="openedFromAppStoreShopCreate"
          class="rounded-[1.75rem] bg-white p-3 shadow-sm ring-1 ring-black/5"
          :open="openedFromAppStoreShopCreate"
          data-testid="food-delivery-custom-form"
        >
          <summary
            class="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[1.35rem] bg-gray-50 px-3 py-3"
          >
            <span class="min-w-0">
              <span class="block text-sm font-black text-gray-950">
                {{ t('店铺工作台', 'Shop workspace') }}
              </span>
              <span class="mt-1 block text-[11px] font-semibold leading-4 text-gray-500">
                {{
                  t(
                    '创建小店、补菜单和换图片。',
                    'Create shops, add menu items, and update images.',
                  )
                }}
              </span>
            </span>
            <span
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm"
            >
              <i class="fas fa-chevron-down text-xs"></i>
            </span>
          </summary>
          <div class="mt-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-bold">
                  {{ t('自定义餐厅与菜单', 'Custom restaurants and menu') }}
                </p>
                <p class="mt-1 text-[11px] leading-4 text-gray-500">
                  {{
                    t(
                      '可自定义餐厅、餐品名称、价格和 URL/Gallery 图片。本地文件仍先进入 Gallery，再被外卖引用。',
                      'Create restaurants and menu items with custom names, prices, and URL/Gallery images. Local files still enter Gallery first.',
                    )
                  }}
                </p>
              </div>
              <span
                class="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-600"
              >
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
                  <option
                    v-for="category in categoryCards"
                    :key="category.key"
                    :value="category.key"
                  >
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
                  <option
                    v-for="restaurant in foodDeliveryStore.restaurants"
                    :key="restaurant.id"
                    :value="restaurant.id"
                  >
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
                  <option
                    v-for="category in categoryCards"
                    :key="category.key"
                    :value="category.key"
                  >
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
          </div>
        </details>
      </div>

      <section
        v-else
        class="space-y-4"
        :class="{
          'food-delivery-store-dark-tray': isDarkTrayStore,
          'food-delivery-store-peach-cloud': isDessertWindowStore,
          'food-delivery-store-quick-service': isQuickServiceStore,
          'food-delivery-store-jade-table': isJadeTableStore,
          'food-delivery-store-light-food': isLightFoodStore,
        }"
        data-testid="food-delivery-store-app"
      >
        <FoodDeliveryVerdantDayApp
          v-if="activeRestaurant && isLightFoodStore"
          :restaurant="activeRestaurant"
          :display-name="activeStoreDisplayName"
          :short-description="activeStoreShortDescription"
          :menu-items="activeMenuItems"
          :active-item="activeLightFoodItem"
          :cart-lines="activeStoreCartLineItems"
          :cart-quantity="activeStoreCartQuantity"
          :cart-total="activeStoreCartPrimaryTotal"
          :orders="scopedFoodOrders"
          :active-order="activeLightFoodOrder"
          :page="lightFoodPageKey"
          :cart-conflict="hasCartOwnershipConflict"
          :foreign-cart-name="foreignCartRestaurant?.name || ''"
          :eta-text="activeStoreEtaText"
          :fee-text="activeStoreFeeText"
          :distance-text="activeStoreDistanceText"
          :delivery-address="
            activeMapHandoff.deliveryAddress || t('当前配送地址', 'Current delivery address')
          "
          :missing-asset-url="platformMissingAssetPlaceholderUrl"
          @go-home="goHome"
          @navigate="
            (pageKey, orderId) =>
              openLightFoodPage(pageKey, orderId ? { shopOrderId: orderId } : {})
          "
          @open-item="openLightFoodItem"
          @edit-item="openMenuItemDetail"
          @add-item="addMenuItemToCart"
          @update-cart="foodDeliveryStore.updateCartQuantity"
          @checkout="openCheckoutSheet"
          @open-foreign-cart="openForeignCartShop"
        />

        <FoodDeliveryJadeHearthApp
          v-else-if="activeRestaurant && isJadeTableStore"
          :restaurant="activeRestaurant"
          :display-name="activeStoreDisplayName"
          :short-description="activeStoreShortDescription"
          :menu-items="activeMenuItems"
          :cart-lines="activeStoreCartLineItems"
          :cart-quantity="activeStoreCartQuantity"
          :cart-total="activeStoreCartPrimaryTotal"
          :orders="scopedFoodOrders"
          :active-order="activeJadeTableOrder"
          :active-order-events="activeJadeTableEventRows"
          :active-wallet-suggestion="activeJadeWalletSuggestion"
          :event-feedback="eventFeedback"
          :page="jadeTablePageKey"
          :cart-conflict="hasCartOwnershipConflict"
          :foreign-cart-name="foreignCartRestaurant?.name || ''"
          :eta-text="activeStoreEtaText"
          :fee-text="activeStoreFeeText"
          :distance-text="activeStoreDistanceText"
          :delivery-address="
            activeMapHandoff.deliveryAddress || t('当前配送地址', 'Current delivery address')
          "
          :missing-asset-url="platformMissingAssetPlaceholderUrl"
          @go-home="goHome"
          @navigate="
            (pageKey, orderId) =>
              openJadeTablePage(pageKey, orderId ? { shopOrderId: orderId } : {})
          "
          @open-item="openMenuItemDetail"
          @add-item="addMenuItemToCart"
          @update-cart="foodDeliveryStore.updateCartQuantity"
          @checkout="openCheckoutSheet"
          @open-foreign-cart="openForeignCartShop"
          @check-update="triggerOrderSurpriseEvent(activeJadeTableOrder)"
          @mark-delivered="markFoodOrderDelivered"
          @record-wallet="
            activeJadeWalletSuggestion && transferFoodSuggestionToWallet(activeJadeWalletSuggestion)
          "
        />

        <FoodDeliveryDashGrillApp
          v-else-if="activeRestaurant && isQuickServiceStore"
          :restaurant="activeRestaurant"
          :display-name="activeStoreDisplayName"
          :short-description="activeStoreShortDescription"
          :menu-items="activeMenuItems"
          :cart-lines="activeStoreCartLineItems"
          :cart-quantity="activeStoreCartQuantity"
          :cart-total="activeStoreCartPrimaryTotal"
          :orders="scopedFoodOrders"
          :active-order="activeQuickServiceOrder"
          :page="quickServicePageKey"
          :cart-conflict="hasCartOwnershipConflict"
          :foreign-cart-name="foreignCartRestaurant?.name || ''"
          :eta-text="activeStoreEtaText"
          :fee-text="activeStoreFeeText"
          :distance-text="activeStoreDistanceText"
          :delivery-address="
            activeMapHandoff.deliveryAddress || t('当前配送地址', 'Current delivery address')
          "
          :missing-asset-url="platformMissingAssetPlaceholderUrl"
          @go-home="goHome"
          @navigate="
            (pageKey, orderId) =>
              openQuickServicePage(pageKey, orderId ? { shopOrderId: orderId } : {})
          "
          @open-item="openMenuItemDetail"
          @add-item="addMenuItemToCart"
          @update-cart="foodDeliveryStore.updateCartQuantity"
          @checkout="openCheckoutSheet"
          @open-foreign-cart="openForeignCartShop"
        />

        <article
          v-else-if="activeRestaurant && isDessertWindowStore"
          class="peach-cloud-app relative mx-auto min-h-screen w-full max-w-md overflow-hidden bg-[var(--peach-cloud-canvas)] text-[var(--peach-cloud-ink)]"
          data-testid="food-delivery-store-shell"
          :data-store-id="activeRestaurant.id"
          :data-store-tone="activeStoreVisual.tone"
          :data-store-template="activeStoreTemplate"
        >
          <header
            class="sticky top-0 z-40 border-b border-[var(--peach-cloud-ink)]/15 bg-[var(--peach-cloud-canvas)]/95 px-3 py-2 backdrop-blur-md"
            :data-testid="
              peachCloudPageKey === 'home' ? 'food-delivery-peach-cloud-home-header' : undefined
            "
          >
            <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
              <button
                type="button"
                class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.85rem] border border-[var(--peach-cloud-mist)]/55 bg-white/80 text-[var(--peach-cloud-ink)] shadow-[0_5px_12px_rgba(43,48,58,0.08)] transition active:scale-[0.94]"
                data-testid="food-delivery-store-home"
                :aria-label="t('返回手机桌面', 'Return to phone Home')"
                :title="t('返回手机桌面', 'Return to phone Home')"
                @click="goHome"
              >
                <i class="fas fa-arrow-left text-sm" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="flex min-w-0 items-center gap-2.5 text-left"
                data-testid="food-delivery-peach-cloud-header-profile"
                @click="openPeachCloudHome"
              >
                <span
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.65rem] border-2 border-[var(--peach-cloud-ink)] bg-[var(--peach-cloud-canvas)] p-1 shadow-[0_4px_0_var(--peach-cloud-ink)]"
                >
                  <img
                    :src="peachCloudBrandImageUrl"
                    alt=""
                    class="h-full w-full object-contain"
                    data-required-asset="peach-cloud/brand/peach-cloud-mark-01.svg"
                    @error="handleFoodShopImageError"
                  />
                </span>
                <span class="min-w-0">
                  <strong class="block truncate text-xs font-black uppercase">{{
                    activeStoreDisplayName
                  }}</strong>
                  <span class="block truncate text-[9px] font-bold text-[var(--peach-cloud-iron)]">
                    {{ t('白桃饮品与冰甜专门店', 'WHITE PEACH DRINKS & ICE') }}
                  </span>
                </span>
              </button>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="inline-flex h-10 w-10 items-center justify-center rounded-[0.65rem] border border-[var(--peach-cloud-ink)]/15 bg-white/80 text-[var(--peach-cloud-ink)] transition active:scale-[0.96]"
                  data-testid="food-delivery-peach-cloud-search"
                  :aria-label="t('搜索桃子云菜单', 'Search Peach Cloud menu')"
                  @click="focusPeachCloudSearch"
                >
                  <i class="fas fa-magnifying-glass text-xs"></i>
                </button>
                <button
                  type="button"
                  class="inline-flex h-10 w-10 items-center justify-center rounded-[0.65rem] border border-[var(--peach-cloud-ink)]/15 bg-white/80 text-[var(--peach-cloud-ink)] transition active:scale-[0.96]"
                  data-testid="food-delivery-peach-cloud-header-updates"
                  :aria-label="t('查看配送更新', 'View delivery updates')"
                  @click="showPeachCloudUpdates"
                >
                  <i class="fas fa-bell text-xs"></i>
                </button>
                <button
                  type="button"
                  class="relative inline-flex h-10 w-10 items-center justify-center rounded-[0.65rem] bg-[var(--peach-cloud-ink)] text-[var(--peach-cloud-canvas)] transition active:scale-[0.96]"
                  data-testid="food-delivery-peach-cloud-header-cart"
                  :aria-label="t('打开购物袋', 'Open bag')"
                  @click="openStoreCartSurface"
                >
                  <i class="fas fa-bag-shopping text-xs"></i>
                  <span
                    v-if="activeStoreCartQuantity"
                    class="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--peach-cloud-accent)] px-1 text-[8px] font-black text-[var(--peach-cloud-ink)]"
                  >
                    {{ activeStoreCartQuantity }}
                  </span>
                </button>
              </div>
            </div>
          </header>

          <main
            v-if="peachCloudPageKey === 'home'"
            class="relative bg-[var(--peach-cloud-canvas)] px-4 pb-24 pt-4"
            data-testid="food-delivery-peach-cloud-home-main"
          >
            <section
              class="relative min-h-[16rem] overflow-hidden border-2 border-[var(--peach-cloud-ink)] bg-[var(--peach-cloud-mist)] shadow-[4px_4px_0_var(--peach-cloud-ink)]"
              data-testid="food-delivery-peach-cloud-brand-hero"
            >
              <button
                type="button"
                class="relative block min-h-[16rem] w-full overflow-hidden text-left"
                data-testid="food-delivery-peach-cloud-hero-cover"
                @click="openPeachCloudNew"
              >
                <img
                  :src="activeStoreCoverImageUrl"
                  :alt="`${activeStoreDisplayName} ${t('本周精选', 'weekly selection')}`"
                  class="absolute inset-0 h-full w-full object-cover object-center"
                  :data-required-asset="foodDeliveryRequiredAssetPath(activeRestaurant)"
                  @error="handleFoodShopImageError"
                />
                <span class="relative z-10 flex min-h-[16rem] w-[48%] flex-col justify-between p-4">
                  <span>
                    <span
                      class="inline-flex items-center gap-1.5 bg-[var(--peach-cloud-ink)] px-2 py-1 text-[8px] font-black text-[var(--peach-cloud-canvas)]"
                    >
                      <i class="fas fa-circle-check text-[8px]"></i>
                      FRESH PEACH · OPEN TODAY
                    </span>
                    <strong
                      class="mt-4 block max-w-36 text-xl font-black leading-[0.98] text-[var(--peach-cloud-ink)] [text-shadow:0_1px_0_rgba(255,255,255,0.95)]"
                    >
                      <span class="block">PEACH,</span>
                      <span class="block">POURED INTO</span>
                      <span class="block">CLOUDS</span>
                    </strong>
                    <span
                      class="mt-3 block max-w-36 text-[9px] font-bold leading-3.5 text-[var(--peach-cloud-iron)] [text-shadow:0_1px_0_rgba(255,255,255,0.95)]"
                    >
                      White-peach fizz, oolong clouds, and freshly shaved ice.
                    </span>
                  </span>
                  <span
                    class="inline-flex w-fit items-center gap-2 border-b-2 border-[var(--peach-cloud-ink)] pb-1 text-[10px] font-black text-[var(--peach-cloud-ink)]"
                  >
                    VIEW THE DROP
                    <i class="fas fa-arrow-right text-[9px]"></i>
                  </span>
                </span>
              </button>
            </section>

            <div class="mt-7 flex items-end justify-between gap-3">
              <div>
                <p class="text-[9px] font-black uppercase text-[var(--peach-cloud-iron)]">
                  {{ t('先选一种桃气', 'CHOOSE YOUR PEACH MOOD') }}
                </p>
                <h2 class="mt-1 text-xl font-black">
                  {{ t('今天想来点什么？', "What's your peach mood?") }}
                </h2>
              </div>
              <span class="text-[10px] font-bold text-[var(--peach-cloud-iron)]">
                {{ activeStoreEtaText }}
              </span>
            </div>

            <nav
              class="mt-3 grid grid-cols-5 gap-2"
              data-testid="food-delivery-store-menu-section-rail"
              :aria-label="t('店内分类', 'Store menu sections')"
            >
              <button
                v-for="shortcut in peachCloudMenuShortcuts"
                :key="shortcut.key"
                type="button"
                class="flex min-w-0 flex-col items-center gap-1.5 text-center text-[10px] font-semibold leading-tight"
                :class="
                  shortcut.key === activeStoreMenuSectionKey
                    ? 'text-[var(--peach-cloud-ink)]'
                    : 'text-[var(--peach-cloud-iron)]'
                "
                :data-testid="`food-delivery-store-menu-section-${shortcut.key}`"
                @click="focusStoreMenuSection(shortcut.key)"
              >
                <span
                  class="inline-flex aspect-[1/1.2] w-full max-w-[3.2rem] items-center justify-center rounded-[1.55rem] border transition active:scale-[0.96]"
                  :class="
                    shortcut.key === activeStoreMenuSectionKey
                      ? 'ring-2 ring-[var(--peach-cloud-ink)] ring-offset-2 ring-offset-[var(--peach-cloud-canvas)] shadow-[0_9px_18px_rgba(43,48,58,0.12)]'
                      : ''
                  "
                  :style="{
                    backgroundColor: shortcut.background,
                    borderColor: shortcut.border,
                  }"
                >
                  <img
                    :src="shortcut.iconUrl"
                    alt=""
                    class="h-8 w-8 object-contain"
                    :data-required-asset="`peach-cloud/categories/${shortcut.asset}`"
                    @error="handleFoodShopImageError"
                  />
                </span>
                <span class="line-clamp-2 min-h-6">{{ shortcut.label }}</span>
              </button>
            </nav>

            <div class="mt-3 h-px bg-[var(--peach-cloud-mist)]/70"></div>

            <section class="pt-3" data-testid="food-delivery-menu-panel">
              <div
                data-testid="food-delivery-store-menu-items"
                :data-active-section="activeStoreMenuSection?.key"
              >
                <template v-if="peachCloudShowsCuratedHome">
                  <div class="flex items-end justify-between gap-3">
                    <h2 class="text-xl font-black leading-none">
                      {{ t('人气必点', 'Best Seller') }}
                    </h2>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 text-xs font-black text-[var(--peach-cloud-ink)]"
                      data-testid="food-delivery-peach-cloud-view-all"
                      @click="focusPeachCloudSearch"
                    >
                      {{ t('浏览菜单', 'Browse menu') }}
                      <i class="fas fa-chevron-right text-[9px]"></i>
                    </button>
                  </div>

                  <div class="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2">
                    <article
                      v-for="item in peachCloudBestSellerItems"
                      :key="item.id"
                      class="relative w-[4.75rem] shrink-0"
                      :data-testid="`food-delivery-menu-${item.id}`"
                      :data-menu-section="item.menuSection || 'signature'"
                      :data-template="activeStoreTemplate"
                    >
                      <button
                        type="button"
                        class="block w-full text-left"
                        :data-testid="`food-delivery-menu-open-${item.id}`"
                        @click="openMenuItemDetail(item.id)"
                      >
                        <div
                          class="relative aspect-[2/3] overflow-hidden rounded-[1.2rem] bg-white/80 shadow-[0_10px_20px_rgba(43,48,58,0.12)]"
                          :data-testid="`food-delivery-menu-dish-${item.id}`"
                        >
                          <img
                            v-if="foodImageUrl(item)"
                            :src="foodImageUrl(item)"
                            :alt="item.image?.alt || item.title"
                            class="h-full w-full object-cover"
                            :style="
                              item.id === 'food_menu_peach_butter_waffle'
                                ? { transform: 'translateY(-0.25rem) scale(1.55)' }
                                : undefined
                            "
                            :data-required-asset="foodDeliveryRequiredAssetPath(item)"
                            @error="handleFoodShopImageError"
                          />
                          <div
                            v-else
                            class="flex h-full items-center justify-center text-[var(--peach-cloud-accent)]"
                          >
                            <i class="fas fa-ice-cream"></i>
                          </div>
                          <span
                            class="absolute bottom-0 right-0 rounded-tl-2xl bg-[var(--peach-cloud-ink)] px-2 py-1 text-[9px] font-black text-[var(--peach-cloud-canvas)]"
                          >
                            {{ item.price }}
                          </span>
                        </div>
                        <p class="mt-1.5 line-clamp-2 min-h-7 text-[10px] font-black leading-3.5">
                          {{ item.title }}
                        </p>
                      </button>
                      <button
                        type="button"
                        class="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)] shadow-sm transition active:scale-[0.94]"
                        :data-testid="`food-delivery-add-${item.id}`"
                        :aria-label="`Add ${item.title}`"
                        @click.stop="addMenuItemToCart(item.id, 1, $event.currentTarget)"
                      >
                        <i class="fas fa-plus text-[9px]"></i>
                      </button>
                    </article>
                  </div>

                  <section
                    v-if="peachCloudFeaturedItem"
                    class="mt-3 overflow-hidden rounded-lg border-2 border-[var(--peach-cloud-ink)] bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)] shadow-[0_5px_0_var(--peach-cloud-ink)]"
                    data-testid="food-delivery-peach-cloud-featured"
                  >
                    <button
                      type="button"
                      class="relative block min-h-36 w-full overflow-hidden text-left"
                      data-testid="food-delivery-peach-cloud-featured-action"
                      @click="openPeachCloudNew"
                    >
                      <img
                        :src="peachCloudPromotionImageUrl"
                        :alt="`${peachCloudFeaturedItem.title} promotion`"
                        class="absolute inset-y-0 right-0 h-full w-[54%] bg-[#eaf0d8] object-contain object-center"
                        data-testid="food-delivery-peach-cloud-promotion-image"
                        data-required-asset="peach-cloud/promotions/peach-cloud-golden-pairing-01.png"
                        @error="handleFoodShopImageError"
                      />
                      <span
                        class="relative z-10 flex min-h-36 w-[46%] flex-col justify-center border-r-2 border-[var(--peach-cloud-ink)] bg-[var(--peach-cloud-accent)]/90 px-4 py-3 text-center backdrop-blur-[2px]"
                      >
                        <span class="text-xs font-semibold leading-4">A NEW CLOUD HAS LANDED</span>
                        <strong class="mt-2 text-3xl font-black leading-none">30% OFF</strong>
                        <span
                          class="mt-2 line-clamp-2 text-[10px] font-bold leading-3.5 text-[var(--peach-cloud-iron)]"
                        >
                          {{ peachCloudFeaturedItem.title }}
                        </span>
                      </span>
                    </button>
                  </section>

                  <h2 class="mt-6 text-xl font-black leading-none">
                    {{ t('为你推荐', 'Recommend') }}
                  </h2>
                  <div class="mt-3 grid grid-cols-2 gap-3">
                    <article
                      v-for="item in peachCloudRecommendedItems"
                      :key="item.id"
                      class="min-w-0 overflow-hidden rounded-[1.2rem] border border-[var(--peach-cloud-mist)]/30 bg-white/90 shadow-[0_9px_20px_rgba(43,48,58,0.08)]"
                      :data-testid="`food-delivery-menu-${item.id}`"
                      :data-menu-section="item.menuSection || 'signature'"
                      :data-template="activeStoreTemplate"
                    >
                      <button
                        type="button"
                        class="block w-full text-left"
                        :data-testid="`food-delivery-menu-open-${item.id}`"
                        @click="openMenuItemDetail(item.id)"
                      >
                        <div
                          class="relative aspect-[1.22/1] overflow-hidden bg-[var(--peach-cloud-mist)]/25"
                          :data-testid="`food-delivery-menu-dish-${item.id}`"
                        >
                          <img
                            v-if="foodImageUrl(item)"
                            :src="foodImageUrl(item)"
                            :alt="item.image?.alt || item.title"
                            class="h-full w-full object-cover"
                            :style="
                              item.id === 'food_menu_peach_butter_waffle'
                                ? { transform: 'translateY(-0.25rem) scale(1.55)' }
                                : undefined
                            "
                            :data-required-asset="foodDeliveryRequiredAssetPath(item)"
                            @error="handleFoodShopImageError"
                          />
                          <div
                            v-else
                            class="flex h-full items-center justify-center text-[var(--peach-cloud-accent)]"
                          >
                            <i class="fas fa-ice-cream"></i>
                          </div>
                          <span
                            class="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[9px] font-black"
                          >
                            {{ activeRestaurant.rating.toFixed(1) }}
                            <i class="fas fa-star text-[var(--peach-cloud-accent)]"></i>
                          </span>
                          <span
                            class="absolute bottom-0 right-0 rounded-tl-2xl bg-[var(--peach-cloud-ink)] px-2.5 py-1 text-[9px] font-black text-[var(--peach-cloud-canvas)]"
                          >
                            {{ item.price }}
                          </span>
                        </div>
                        <div class="p-2.5 pb-2">
                          <p class="line-clamp-2 min-h-9 text-xs font-black leading-[1.1rem]">
                            {{ item.title }}
                          </p>
                          <p
                            class="mt-1 line-clamp-1 text-[9px] font-semibold text-[var(--peach-cloud-iron)]"
                          >
                            {{ item.desc }}
                          </p>
                        </div>
                      </button>
                      <div class="flex items-center justify-between px-2.5 pb-2.5">
                        <span class="text-[9px] font-bold text-[var(--peach-cloud-iron)]">{{
                          activeStoreEtaText
                        }}</span>
                        <button
                          type="button"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)] shadow-sm transition active:scale-[0.94]"
                          :data-testid="`food-delivery-add-${item.id}`"
                          :aria-label="`Add ${item.title}`"
                          @click.stop="addMenuItemToCart(item.id, 1, $event.currentTarget)"
                        >
                          <i class="fas fa-plus text-[9px]"></i>
                        </button>
                      </div>
                    </article>
                  </div>
                </template>

                <template v-else>
                  <div class="flex items-end justify-between gap-3">
                    <div>
                      <p class="text-[10px] font-black uppercase text-[var(--peach-cloud-iron)]">
                        {{ activeStoreDisplayName }}
                      </p>
                      <h2 class="mt-1 text-xl font-black leading-none">
                        {{
                          peachCloudSearchQuery.trim()
                            ? t('搜索结果', 'Search results')
                            : activeStoreMenuSection?.label
                        }}
                      </h2>
                    </div>
                    <button
                      type="button"
                      class="text-xs font-black text-[var(--peach-cloud-ink)]"
                      data-testid="food-delivery-peach-cloud-clear-filter"
                      @click="openPeachCloudHome"
                    >
                      {{ t('返回推荐', 'Home') }}
                    </button>
                  </div>

                  <div
                    v-if="peachCloudFilteredMenuItems.length"
                    class="mt-3 grid grid-cols-2 gap-3"
                  >
                    <article
                      v-for="item in peachCloudFilteredMenuItems"
                      :key="item.id"
                      class="min-w-0 overflow-hidden rounded-[1.2rem] border border-[var(--peach-cloud-mist)]/30 bg-white/90 shadow-[0_9px_20px_rgba(43,48,58,0.08)]"
                      :data-testid="`food-delivery-menu-${item.id}`"
                      :data-menu-section="item.menuSection || 'signature'"
                      :data-template="activeStoreTemplate"
                    >
                      <button
                        type="button"
                        class="block w-full text-left"
                        :data-testid="`food-delivery-menu-open-${item.id}`"
                        @click="openMenuItemDetail(item.id)"
                      >
                        <div
                          class="relative aspect-[1.22/1] overflow-hidden bg-[var(--peach-cloud-mist)]/25"
                          :data-testid="`food-delivery-menu-dish-${item.id}`"
                        >
                          <img
                            v-if="foodImageUrl(item)"
                            :src="foodImageUrl(item)"
                            :alt="item.image?.alt || item.title"
                            class="h-full w-full object-cover"
                            :data-required-asset="foodDeliveryRequiredAssetPath(item)"
                            @error="handleFoodShopImageError"
                          />
                          <div
                            v-else
                            class="flex h-full items-center justify-center text-[var(--peach-cloud-accent)]"
                          >
                            <i class="fas fa-ice-cream"></i>
                          </div>
                          <span
                            class="absolute bottom-0 right-0 rounded-tl-2xl bg-[var(--peach-cloud-ink)] px-2.5 py-1 text-[9px] font-black text-[var(--peach-cloud-canvas)]"
                          >
                            {{ item.price }}
                          </span>
                        </div>
                        <div class="p-2.5">
                          <p class="line-clamp-2 min-h-9 text-xs font-black leading-[1.1rem]">
                            {{ item.title }}
                          </p>
                          <p
                            class="mt-1 line-clamp-2 min-h-7 text-[9px] font-semibold leading-3.5 text-[var(--peach-cloud-iron)]"
                          >
                            {{ item.desc }}
                          </p>
                        </div>
                      </button>
                      <div class="flex items-center justify-between px-2.5 pb-2.5">
                        <span class="text-[9px] font-bold text-[var(--peach-cloud-iron)]">{{
                          item.currency
                        }}</span>
                        <button
                          type="button"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)] shadow-sm transition active:scale-[0.94]"
                          :data-testid="`food-delivery-add-${item.id}`"
                          :aria-label="`Add ${item.title}`"
                          @click.stop="addMenuItemToCart(item.id, 1, $event.currentTarget)"
                        >
                          <i class="fas fa-plus text-[9px]"></i>
                        </button>
                      </div>
                    </article>
                  </div>
                  <div
                    v-else
                    class="mt-3 rounded-[1.2rem] bg-[var(--peach-cloud-mist)]/25 px-4 py-8 text-center"
                    data-testid="food-delivery-peach-cloud-empty-results"
                  >
                    <i class="fas fa-magnifying-glass text-lg text-[var(--peach-cloud-accent)]"></i>
                    <p class="mt-2 text-sm font-black">
                      {{ t('没有找到合适的甜品', 'No cloud found') }}
                    </p>
                  </div>
                </template>
              </div>
            </section>

            <p
              v-if="storeNavigationFeedback"
              class="mt-3 rounded-[1rem] bg-[var(--peach-cloud-mist)]/30 px-3 py-2 text-center text-xs font-bold leading-5 text-[var(--peach-cloud-iron)]"
              data-testid="food-delivery-store-nav-feedback"
            >
              {{ storeNavigationFeedback }}
            </p>
          </main>

          <template v-else-if="peachCloudPageKey === 'search'">
            <header
              class="border-b-2 border-[var(--peach-cloud-ink)] bg-[var(--peach-cloud-mist)] px-4 py-5"
            >
              <p class="text-[9px] font-black text-[var(--peach-cloud-iron)]">PEACH FINDER / 01</p>
              <h1 class="mt-1 text-[1.8rem] font-black leading-none">
                {{ t('按口味找桃子', 'Find your peach') }}
              </h1>
              <p class="mt-2 text-[11px] font-bold text-[var(--peach-cloud-iron)]">
                {{ t('搜索、筛选，再进入单品详情。', 'Search, filter, then inspect one item.') }}
              </p>
            </header>

            <main
              class="min-h-[calc(100vh-5rem)] bg-[var(--peach-cloud-canvas)] px-4 pb-24 pt-5"
              data-testid="food-delivery-peach-cloud-search-page"
            >
              <label
                class="flex h-12 items-center gap-3 border-2 border-[var(--peach-cloud-ink)] bg-white/90 px-4 shadow-[4px_4px_0_var(--peach-cloud-ink)]"
              >
                <i class="fas fa-magnifying-glass text-sm text-[var(--peach-cloud-accent)]"></i>
                <input
                  ref="peachCloudSearchInputRef"
                  v-model="peachCloudSearchQuery"
                  type="search"
                  class="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-[var(--peach-cloud-iron)]/60"
                  :placeholder="t('想喝什么，或想吃点什么？', 'What are you craving?')"
                  data-testid="food-delivery-peach-cloud-search-input"
                />
                <button
                  v-if="peachCloudSearchQuery"
                  type="button"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--peach-cloud-mist)]/35 text-[var(--peach-cloud-ink)]"
                  :aria-label="t('清空搜索', 'Clear search')"
                  @click="peachCloudSearchQuery = ''"
                >
                  <i class="fas fa-xmark text-xs"></i>
                </button>
              </label>

              <div
                class="mt-3 grid grid-cols-5 gap-1.5"
                data-testid="food-delivery-peach-cloud-search-categories"
              >
                <button
                  v-for="shortcut in peachCloudMenuShortcuts"
                  :key="shortcut.key"
                  type="button"
                  class="inline-flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-center text-[9px] font-black leading-tight text-[var(--peach-cloud-ink)] transition active:scale-[0.97]"
                  :class="
                    activeStoreMenuSectionKey === shortcut.key
                      ? 'ring-2 ring-[var(--peach-cloud-ink)] ring-offset-1 ring-offset-[var(--peach-cloud-canvas)] shadow-[0_3px_0_var(--peach-cloud-ink)]'
                      : ''
                  "
                  :style="{
                    backgroundColor: shortcut.background,
                    borderColor: shortcut.border,
                  }"
                  :aria-label="shortcut.label"
                  :title="shortcut.label"
                  :data-testid="`food-delivery-peach-cloud-search-category-${shortcut.key}`"
                  @click="focusStoreMenuSection(shortcut.key)"
                >
                  <img
                    :src="shortcut.iconUrl"
                    alt=""
                    class="h-[1.125rem] w-[1.125rem] object-contain"
                    :data-required-asset="`peach-cloud/categories/${shortcut.asset}`"
                    @error="handleFoodShopImageError"
                  />
                  <span class="max-w-full truncate">{{ shortcut.shortLabel }}</span>
                </button>
              </div>

              <section class="mt-6" data-testid="food-delivery-menu-panel">
                <div class="flex items-end justify-between gap-3">
                  <div>
                    <p class="text-[10px] font-black text-[var(--peach-cloud-iron)]">
                      {{
                        peachCloudSearchQuery.trim()
                          ? t('匹配结果', 'Matches')
                          : t('完整菜单', 'Full menu')
                      }}
                    </p>
                    <h2 class="mt-1 text-xl font-black">
                      {{ peachCloudSearchResults.length }} {{ t('款云朵风味', 'cloud treats') }}
                    </h2>
                  </div>
                </div>

                <div
                  v-if="peachCloudSearchResults.length"
                  class="mt-3 divide-y-2 divide-[var(--peach-cloud-ink)] border-y-2 border-[var(--peach-cloud-ink)]"
                  data-testid="food-delivery-store-menu-items"
                  :data-active-section="activeStoreMenuSectionKey"
                >
                  <article
                    v-for="item in peachCloudSearchResults"
                    :key="item.id"
                    class="relative grid min-w-0 grid-cols-[5rem_minmax(0,1fr)_2.5rem] items-center gap-3 bg-white/55 py-3"
                    :data-testid="`food-delivery-menu-${item.id}`"
                    :data-menu-section="item.menuSection || 'signature'"
                  >
                    <button
                      type="button"
                      class="contents text-left"
                      :data-testid="`food-delivery-menu-open-${item.id}`"
                      @click="openMenuItemDetail(item.id)"
                    >
                      <div
                        class="relative aspect-square overflow-hidden border border-[var(--peach-cloud-ink)] bg-[var(--peach-cloud-mist)]/25"
                      >
                        <img
                          v-if="foodImageUrl(item)"
                          :src="foodImageUrl(item)"
                          :alt="item.image?.alt || item.title"
                          class="h-full w-full object-cover"
                          :data-required-asset="foodDeliveryRequiredAssetPath(item)"
                          @error="handleFoodShopImageError"
                        />
                      </div>
                      <div class="min-w-0 py-1">
                        <p class="line-clamp-2 text-sm font-black leading-[1.1rem]">
                          {{ item.title }}
                        </p>
                        <p
                          class="mt-1 line-clamp-2 text-[9px] font-semibold leading-3.5 text-[var(--peach-cloud-iron)]"
                        >
                          {{ item.desc }}
                        </p>
                        <p class="mt-2 text-xs font-black">{{ item.price }} {{ item.currency }}</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center border-2 border-[var(--peach-cloud-ink)] bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)] shadow-[2px_2px_0_var(--peach-cloud-ink)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      :data-testid="`food-delivery-add-${item.id}`"
                      :aria-label="`Add ${item.title}`"
                      @click.stop="addMenuItemToCart(item.id, 1, $event.currentTarget)"
                    >
                      <i class="fas fa-plus text-[9px]"></i>
                    </button>
                  </article>
                </div>
                <div
                  v-else
                  class="mt-8 px-4 py-12 text-center"
                  data-testid="food-delivery-peach-cloud-empty-results"
                >
                  <i class="fas fa-magnifying-glass text-2xl text-[var(--peach-cloud-accent)]"></i>
                  <p class="mt-3 text-sm font-black">{{ t('这朵云还没出现', 'No cloud found') }}</p>
                  <p class="mt-1 text-xs font-semibold text-[var(--peach-cloud-iron)]">
                    {{ t('换个名称或口味试试', 'Try another flavor or name') }}
                  </p>
                </div>
              </section>
            </main>
          </template>

          <template v-else-if="peachCloudPageKey === 'new'">
            <header
              class="relative min-h-[18rem] overflow-hidden border-b-2 border-[var(--peach-cloud-ink)] bg-[var(--peach-cloud-accent)]"
            >
              <img
                :src="peachCloudWeeklyDropImageUrl"
                alt="Peach Cloud weekly seasonal collection"
                class="absolute inset-0 h-full w-full object-cover object-center"
                data-testid="food-delivery-peach-cloud-weekly-drop-image"
                data-required-asset="peach-cloud/promotions/peach-cloud-weekly-drop-01.png"
                @error="handleFoodShopImageError"
              />
              <div class="relative z-10 flex min-h-[18rem] w-[49%] flex-col justify-between p-4">
                <div>
                  <span
                    class="inline-flex bg-[var(--peach-cloud-ink)] px-2.5 py-1.5 text-[9px] font-black text-[var(--peach-cloud-canvas)]"
                  >
                    NEW EVERY FRIDAY · 10:00
                  </span>
                  <p
                    class="mt-8 text-[10px] font-black text-[var(--peach-cloud-iron)] [text-shadow:0_1px_0_rgba(255,255,255,0.95)]"
                  >
                    PEACH CLOUD DROP 07
                  </p>
                  <h1
                    class="mt-2 max-w-[10.5rem] text-[2rem] font-black leading-[0.96] [text-shadow:0_1px_0_rgba(255,255,255,0.95)]"
                  >
                    PEAK PEACH, SOFT CLOUDS
                  </h1>
                </div>
                <span
                  class="w-fit bg-[var(--peach-cloud-accent)] px-3 py-1.5 text-[9px] font-black text-[var(--peach-cloud-ink)]"
                >
                  PEACH SEASON
                </span>
              </div>
            </header>

            <main
              class="min-h-[calc(100vh-10rem)] bg-[var(--peach-cloud-canvas)] px-4 pb-24 pt-5"
              data-testid="food-delivery-peach-cloud-new-page"
            >
              <button
                v-if="peachCloudFeaturedItem"
                type="button"
                class="grid w-full grid-cols-[44%_56%] overflow-hidden border-2 border-[var(--peach-cloud-ink)] bg-[var(--peach-cloud-ink)] text-left text-[var(--peach-cloud-canvas)] shadow-[6px_6px_0_var(--peach-cloud-mist)]"
                @click="openMenuItemDetail(peachCloudFeaturedItem.id)"
              >
                <span class="flex flex-col justify-center p-4">
                  <span class="text-[9px] font-black text-[var(--peach-cloud-mist)]"
                    >LIMITED CLOUD</span
                  >
                  <strong class="mt-2 text-lg font-black leading-tight">{{
                    peachCloudFeaturedItem.title
                  }}</strong>
                  <span class="mt-3 text-xs font-bold"
                    >{{ peachCloudFeaturedItem.price }} {{ peachCloudFeaturedItem.currency }}</span
                  >
                </span>
                <span class="aspect-square overflow-hidden bg-[var(--peach-cloud-mist)]">
                  <img
                    :src="foodImageUrl(peachCloudFeaturedItem) || activeStoreCoverImageUrl"
                    :alt="peachCloudFeaturedItem.title"
                    class="h-full w-full object-cover"
                    @error="handleFoodShopImageError"
                  />
                </span>
              </button>

              <div class="mt-7 flex items-end justify-between gap-3">
                <div>
                  <p class="text-[10px] font-black text-[var(--peach-cloud-iron)]">NEW & NOW</p>
                  <h2 class="mt-1 text-xl font-black">{{ t('新鲜落地', 'Fresh arrivals') }}</h2>
                </div>
                <span class="text-xs font-black text-[var(--peach-cloud-iron)]">{{
                  peachCloudNewArrivalItems.length
                }}</span>
              </div>
              <div class="relative mt-4 border-l-2 border-[var(--peach-cloud-ink)] pl-4">
                <article
                  v-for="(item, index) in peachCloudNewArrivalItems"
                  :key="item.id"
                  class="relative mb-5 grid grid-cols-[minmax(0,1fr)_7rem] overflow-hidden border-2 border-[var(--peach-cloud-ink)] bg-white/80 shadow-[4px_4px_0_var(--peach-cloud-ink)]"
                  :data-testid="`food-delivery-menu-${item.id}`"
                  :data-menu-section="item.menuSection || 'signature'"
                >
                  <button
                    type="button"
                    class="contents text-left"
                    :data-testid="`food-delivery-menu-open-${item.id}`"
                    @click="openMenuItemDetail(item.id)"
                  >
                    <div class="flex min-w-0 flex-col justify-between p-3 pr-2">
                      <div>
                        <span class="text-[9px] font-black text-[var(--peach-cloud-accent)]">
                          DROP {{ String(index + 1).padStart(2, '0') }} ·
                          {{ peachCloudDropSectionLabel(item.menuSection) }}
                        </span>
                        <p class="mt-2 line-clamp-2 text-sm font-black leading-[1.1rem]">
                          {{ item.title }}
                        </p>
                        <p
                          class="mt-1 line-clamp-2 text-[9px] font-semibold leading-3.5 text-[var(--peach-cloud-iron)]"
                        >
                          {{ item.desc }}
                        </p>
                      </div>
                      <p class="mt-3 text-xs font-black">{{ item.price }} {{ item.currency }}</p>
                    </div>
                    <div
                      class="aspect-square overflow-hidden border-l-2 border-[var(--peach-cloud-ink)] bg-[var(--peach-cloud-mist)]/25"
                    >
                      <img
                        v-if="foodImageUrl(item)"
                        :src="foodImageUrl(item)"
                        :alt="item.image?.alt || item.title"
                        class="h-full w-full object-cover"
                        @error="handleFoodShopImageError"
                      />
                    </div>
                  </button>
                  <button
                    type="button"
                    class="absolute bottom-2 right-2 inline-flex h-9 w-9 items-center justify-center border-2 border-[var(--peach-cloud-ink)] bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)] shadow-[2px_2px_0_var(--peach-cloud-ink)]"
                    :data-testid="`food-delivery-add-${item.id}`"
                    :aria-label="`Add ${item.title}`"
                    @click.stop="addMenuItemToCart(item.id, 1, $event.currentTarget)"
                  >
                    <i class="fas fa-plus text-[9px]"></i>
                  </button>
                </article>
              </div>
            </main>
          </template>

          <template v-else-if="peachCloudPageKey === 'bag'">
            <header class="bg-[var(--peach-cloud-mist)] px-4 pb-5 pt-4">
              <div class="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-3">
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-[0.7rem] bg-[var(--peach-cloud-canvas)] text-[var(--peach-cloud-ink)] shadow-sm"
                  :aria-label="t('返回桃子云首页', 'Back to Peach Cloud home')"
                  @click="openPeachCloudHome"
                >
                  <i class="fas fa-chevron-left text-xs"></i>
                </button>
                <div class="text-center">
                  <p class="text-[10px] font-black text-[var(--peach-cloud-iron)]">
                    {{ activeStoreDisplayName }}
                  </p>
                  <h1 class="text-lg font-black">{{ t('购物袋', 'Your bag') }}</h1>
                </div>
                <span
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--peach-cloud-ink)] text-[10px] font-black text-[var(--peach-cloud-canvas)]"
                  data-testid="food-delivery-active-cart-quantity"
                >
                  {{ activeStoreCartQuantity }}
                </span>
              </div>
            </header>

            <main
              class="min-h-[calc(100vh-5rem)] bg-[var(--peach-cloud-canvas)] px-4 pb-24 pt-5"
              data-testid="food-delivery-peach-cloud-bag-page"
            >
              <section data-testid="food-delivery-cart-panel">
                <div
                  v-if="hasCartOwnershipConflict"
                  class="rounded-[1.25rem] border border-[var(--peach-cloud-mist)] bg-white/80 p-4 shadow-[0_14px_30px_rgba(43,48,58,0.1)]"
                  data-testid="food-delivery-foreign-cart-notice"
                  :data-cart-ownership-state="cartOwnershipState"
                >
                  <div class="flex items-start gap-3">
                    <span
                      class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[var(--peach-cloud-ink)] text-[var(--peach-cloud-canvas)]"
                    >
                      <i class="fas fa-store text-sm"></i>
                    </span>
                    <div class="min-w-0">
                      <p class="text-[10px] font-black text-[var(--peach-cloud-iron)]">
                        {{
                          cartOwnershipState === 'mixed'
                            ? t('恢复的购物袋归属不一致', 'Restored bag ownership mismatch')
                            : t('另一家店的购物袋', "Another shop's bag")
                        }}
                      </p>
                      <h2
                        class="mt-1 min-w-0 break-words text-lg font-black [overflow-wrap:anywhere]"
                        data-testid="food-delivery-cart-owner-names"
                      >
                        {{ cartOwnershipRestaurantNames }}
                      </h2>
                      <p
                        class="mt-2 text-xs font-semibold leading-5 text-[var(--peach-cloud-iron)]"
                      >
                        {{
                          cartOwnershipState === 'mixed'
                            ? t(
                                `恢复的购物袋包含多个店铺，共 ${foodDeliveryStore.cartQuantity} 份餐品。Peach Cloud 不会把这些餐品或合计冒充为本店购物袋，也不会结算。请浏览本店并通过替换确认恢复为单店购物袋。`,
                                `This restored bag contains multiple shops and ${foodDeliveryStore.cartQuantity} item(s). Peach Cloud will not present its items or total as this shop's bag and will not check it out. Browse this shop and confirm replacement to recover a single-shop bag.`,
                              )
                            : t(
                                `袋中有 ${foodDeliveryStore.cartQuantity} 份餐品，合计 ${foodDeliveryStore.cartPrimaryTotal.amount} ${foodDeliveryStore.cartPrimaryTotal.currency}。Peach Cloud 不会展示或结算这些餐品。`,
                                `${foodDeliveryStore.cartQuantity} item(s), ${foodDeliveryStore.cartPrimaryTotal.amount} ${foodDeliveryStore.cartPrimaryTotal.currency} total. Peach Cloud will not show or check out these items.`,
                              )
                        }}
                      </p>
                    </div>
                  </div>
                  <p
                    v-if="checkoutFeedback"
                    class="mt-3 rounded-[0.9rem] bg-[var(--peach-cloud-mist)]/25 px-3 py-2 text-xs font-semibold leading-5 text-[var(--peach-cloud-iron)]"
                    data-testid="food-delivery-checkout-feedback"
                  >
                    {{ checkoutFeedback }}
                  </p>
                  <div
                    class="mt-4 grid min-w-0 gap-2"
                    :class="foreignCartRestaurant ? 'sm:grid-cols-2' : ''"
                  >
                    <button
                      v-if="foreignCartRestaurant"
                      type="button"
                      class="min-h-11 min-w-0 whitespace-normal rounded-[0.9rem] bg-[var(--peach-cloud-ink)] px-3 py-2.5 text-xs font-black text-[var(--peach-cloud-canvas)] [overflow-wrap:anywhere]"
                      data-testid="food-delivery-open-foreign-cart-shop"
                      @click="openForeignCartShop"
                    >
                      {{
                        t(
                          `返回 ${foreignCartRestaurant.name}`,
                          `Open ${foreignCartRestaurant.name}`,
                        )
                      }}
                    </button>
                    <button
                      type="button"
                      class="min-h-11 min-w-0 whitespace-normal rounded-[0.9rem] bg-[var(--peach-cloud-mist)]/35 px-3 py-2.5 text-xs font-black [overflow-wrap:anywhere]"
                      data-testid="food-delivery-browse-active-store"
                      @click="browseActiveStoreFromForeignCart"
                    >
                      {{ t('浏览 Peach Cloud', 'Browse Peach Cloud') }}
                    </button>
                  </div>
                </div>

                <div v-else-if="activeStoreCartLineItems.length" class="space-y-3">
                  <article
                    v-for="line in activeStoreCartLineItems"
                    :key="line.menuItemId"
                    class="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 border-b border-[var(--peach-cloud-mist)]/45 pb-3"
                    :data-testid="`food-delivery-cart-${line.menuItemId}`"
                  >
                    <div
                      class="aspect-square overflow-hidden rounded-[1rem] bg-[var(--peach-cloud-mist)]/25"
                    >
                      <img
                        v-if="foodImageUrl(line.menuItem)"
                        :src="foodImageUrl(line.menuItem)"
                        :alt="line.menuItem.title"
                        class="h-full w-full object-cover"
                        @error="handleFoodShopImageError"
                      />
                    </div>
                    <div class="flex min-w-0 flex-col justify-between py-0.5">
                      <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-black">{{ line.menuItem.title }}</p>
                          <p class="mt-1 text-[10px] font-semibold text-[var(--peach-cloud-iron)]">
                            {{ line.subtotal }} {{ line.currency }}
                          </p>
                        </div>
                        <button
                          type="button"
                          class="inline-flex h-7 w-7 shrink-0 items-center justify-center text-[var(--peach-cloud-iron)]"
                          :aria-label="t('移出购物袋', 'Remove from bag')"
                          @click="foodDeliveryStore.updateCartQuantity(line.menuItemId, 0)"
                        >
                          <i class="fas fa-trash-can text-xs"></i>
                        </button>
                      </div>
                      <div
                        class="inline-flex h-8 w-fit items-center rounded-full bg-[var(--peach-cloud-mist)]/30"
                      >
                        <button
                          type="button"
                          class="inline-flex h-8 w-8 items-center justify-center"
                          :aria-label="t('减少数量', 'Decrease quantity')"
                          @click="
                            foodDeliveryStore.updateCartQuantity(line.menuItemId, line.quantity - 1)
                          "
                        >
                          <i class="fas fa-minus text-[9px]"></i>
                        </button>
                        <span class="min-w-7 text-center text-xs font-black">{{
                          line.quantity
                        }}</span>
                        <button
                          type="button"
                          class="inline-flex h-8 w-8 items-center justify-center"
                          :aria-label="t('增加数量', 'Increase quantity')"
                          @click="
                            foodDeliveryStore.updateCartQuantity(line.menuItemId, line.quantity + 1)
                          "
                        >
                          <i class="fas fa-plus text-[9px]"></i>
                        </button>
                      </div>
                    </div>
                  </article>

                  <div class="space-y-2 pt-3 text-xs font-semibold text-[var(--peach-cloud-iron)]">
                    <div class="flex items-center justify-between gap-3">
                      <span>{{ t('配送', 'Delivery') }}</span>
                      <span>{{ activeStoreFeeText }}</span>
                    </div>
                    <div
                      class="flex items-end justify-between gap-3 border-t border-[var(--peach-cloud-mist)]/50 pt-3 text-[var(--peach-cloud-ink)]"
                    >
                      <span class="text-sm font-black">{{ t('合计', 'Total') }}</span>
                      <span class="text-xl font-black" data-testid="food-delivery-active-cart-total"
                        >{{ activeStoreCartPrimaryTotal.amount }}
                        {{ activeStoreCartPrimaryTotal.currency }}</span
                      >
                    </div>
                  </div>
                  <button
                    type="button"
                    class="mt-4 w-full rounded-[1rem] bg-[var(--peach-cloud-accent)] px-4 py-3.5 text-sm font-black text-[var(--peach-cloud-ink)] shadow-[0_14px_34px_rgba(43,48,58,0.18)]"
                    data-testid="food-delivery-checkout"
                    @click="openCheckoutSheet"
                  >
                    {{ t('确认配送信息', 'Continue to checkout') }}
                  </button>
                </div>

                <div
                  v-else
                  class="flex min-h-[28rem] flex-col items-center justify-center px-6 text-center"
                >
                  <div
                    class="inline-flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[var(--peach-cloud-mist)]/30"
                  >
                    <img
                      :src="peachCloudBrandImageUrl"
                      alt=""
                      class="h-16 w-16 object-contain opacity-75"
                    />
                  </div>
                  <h2 class="mt-5 text-xl font-black">
                    {{ t('购物袋轻飘飘的', 'Your bag feels light') }}
                  </h2>
                  <p class="mt-2 text-xs font-semibold leading-5 text-[var(--peach-cloud-iron)]">
                    {{ t('先挑一杯饮品或一份甜点。', 'Add a drink or dessert to get started.') }}
                  </p>
                  <button
                    type="button"
                    class="mt-5 rounded-full bg-[var(--peach-cloud-ink)] px-5 py-2.5 text-xs font-black text-[var(--peach-cloud-canvas)]"
                    @click="focusPeachCloudSearch"
                  >
                    {{ t('去逛菜单', 'Browse menu') }}
                  </button>
                </div>
              </section>
            </main>
          </template>

          <template v-else-if="peachCloudPageKey === 'orders'">
            <header
              class="bg-[var(--peach-cloud-ink)] px-4 pb-6 pt-4 text-[var(--peach-cloud-canvas)]"
            >
              <div class="flex items-center justify-between gap-3">
                <button
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-white/10 text-[var(--peach-cloud-canvas)]"
                  :aria-label="t('返回桃子云首页', 'Back to Peach Cloud home')"
                  @click="openPeachCloudHome"
                >
                  <i class="fas fa-chevron-left text-xs"></i>
                </button>
                <img
                  :src="peachCloudBrandImageUrl"
                  alt=""
                  class="h-9 w-9 rounded-full bg-[var(--peach-cloud-canvas)] p-1 object-contain"
                />
              </div>
              <p class="mt-7 text-[10px] font-black text-[var(--peach-cloud-mist)]">ORDER STUDIO</p>
              <h1 class="mt-1 text-3xl font-black">{{ t('我的订单', 'My orders') }}</h1>
            </header>

            <main
              class="min-h-[calc(100vh-8rem)] bg-[var(--peach-cloud-canvas)] px-4 pb-24 pt-5"
              data-testid="food-delivery-peach-cloud-orders-page"
            >
              <div
                v-if="scopedFoodOrders.length"
                class="space-y-3"
                data-testid="food-delivery-orders-panel"
              >
                <button
                  v-for="order in scopedFoodOrders"
                  :key="order.id"
                  type="button"
                  class="w-full border-b border-[var(--peach-cloud-mist)]/45 py-3 text-left"
                  :data-testid="`food-delivery-order-${order.id}`"
                  @click="openPeachCloudOrder(order.id)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <span
                        class="inline-flex rounded-full bg-[var(--peach-cloud-mist)]/35 px-2.5 py-1 text-[9px] font-black text-[var(--peach-cloud-ink)]"
                      >
                        {{ resolvePlatformOrderStatus(order.status).label }}
                      </span>
                      <p class="mt-2 truncate text-sm font-black">
                        {{ order.items.map((item) => item.title).join(' · ') }}
                      </p>
                      <p class="mt-1 text-[10px] font-semibold text-[var(--peach-cloud-iron)]">
                        {{ order.itemCount }} {{ t('件', 'items') }} ·
                        {{ formatFoodDeliveryEventTime(order.createdAt) }}
                      </p>
                    </div>
                    <div class="shrink-0 text-right">
                      <p class="text-sm font-black">
                        {{ (order.totalCents / 100).toFixed(2) }} {{ order.currency }}
                      </p>
                      <i
                        class="fas fa-chevron-right mt-3 text-[10px] text-[var(--peach-cloud-accent)]"
                      ></i>
                    </div>
                  </div>
                </button>
              </div>

              <div
                v-else
                class="flex min-h-[26rem] flex-col items-center justify-center px-6 text-center"
                data-testid="food-delivery-peach-cloud-orders-empty"
              >
                <i class="fas fa-receipt text-4xl text-[var(--peach-cloud-accent)]"></i>
                <h2 class="mt-4 text-xl font-black">
                  {{ t('还没有云朵订单', 'No cloud orders yet') }}
                </h2>
                <p class="mt-2 text-xs font-semibold leading-5 text-[var(--peach-cloud-iron)]">
                  {{
                    t(
                      '完成第一单后，配送进度会留在这里。',
                      'Your delivery progress will appear here after checkout.',
                    )
                  }}
                </p>
                <button
                  type="button"
                  class="mt-5 rounded-full bg-[var(--peach-cloud-accent)] px-5 py-2.5 text-xs font-black text-[var(--peach-cloud-ink)]"
                  @click="focusPeachCloudSearch"
                >
                  {{ t('开始点单', 'Start an order') }}
                </button>
              </div>
            </main>
          </template>

          <template v-else-if="peachCloudPageKey === 'order'">
            <header
              class="bg-[var(--peach-cloud-ink)] px-4 pb-6 pt-4 text-[var(--peach-cloud-canvas)]"
            >
              <div class="flex items-center justify-between gap-3">
                <button
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-white/10"
                  :aria-label="t('返回订单列表', 'Back to orders')"
                  @click="openPeachCloudPage('orders')"
                >
                  <i class="fas fa-chevron-left text-xs"></i>
                </button>
                <span class="text-[10px] font-black text-[var(--peach-cloud-mist)]">{{
                  t('订单详情', 'Order detail')
                }}</span>
                <span class="h-9 w-9"></span>
              </div>
              <template v-if="activePeachCloudOrder">
                <p class="mt-7 text-[10px] font-black text-[var(--peach-cloud-mist)]">
                  {{ resolvePlatformOrderStatus(activePeachCloudOrder.status).eyebrow }}
                </p>
                <h1 class="mt-1 text-2xl font-black">
                  {{ resolvePlatformOrderStatus(activePeachCloudOrder.status).title }}
                </h1>
                <p class="mt-2 text-xs font-semibold leading-5 text-[var(--peach-cloud-mist)]">
                  {{ resolvePlatformOrderStatus(activePeachCloudOrder.status).desc }}
                </p>
              </template>
            </header>

            <main
              class="min-h-[calc(100vh-8rem)] bg-[var(--peach-cloud-canvas)] px-4 pb-24 pt-5"
              data-testid="food-delivery-peach-cloud-order-page"
            >
              <template v-if="activePeachCloudOrder">
                <section class="border-b border-[var(--peach-cloud-mist)]/50 pb-5">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="text-[10px] font-black text-[var(--peach-cloud-iron)]">
                        {{ t('送往', 'Delivering to') }}
                      </p>
                      <p class="mt-1 text-sm font-black leading-5">
                        {{ activePeachCloudOrder.deliveryAddress }}
                      </p>
                    </div>
                    <span
                      class="shrink-0 rounded-full bg-[var(--peach-cloud-accent)] px-3 py-1.5 text-[10px] font-black"
                    >
                      {{ activeMapHandoff.etaMinutes }} min
                    </span>
                  </div>
                  <div class="mt-4 grid grid-cols-4 items-center gap-1" aria-hidden="true">
                    <span
                      v-for="progressStep in 4"
                      :key="progressStep"
                      class="h-1.5 rounded-full"
                      :data-active="
                        resolvePlatformOrderStatus(activePeachCloudOrder.status).stepIndex >=
                        progressStep - 1
                      "
                      :data-testid="`food-delivery-peach-cloud-progress-${progressStep}`"
                      :class="
                        resolvePlatformOrderStatus(activePeachCloudOrder.status).stepIndex >=
                        progressStep - 1
                          ? 'bg-[var(--peach-cloud-accent)]'
                          : 'bg-[var(--peach-cloud-mist)]/35'
                      "
                    ></span>
                  </div>
                </section>

                <section class="border-b border-[var(--peach-cloud-mist)]/50 py-5">
                  <div class="flex items-end justify-between gap-3">
                    <h2 class="text-lg font-black">{{ t('本次点单', 'Your order') }}</h2>
                    <span class="text-sm font-black"
                      >{{ (activePeachCloudOrder.totalCents / 100).toFixed(2) }}
                      {{ activePeachCloudOrder.currency }}</span
                    >
                  </div>
                  <div class="mt-3 space-y-3">
                    <div
                      v-for="item in activePeachCloudOrder.items"
                      :key="item.id"
                      class="flex items-start justify-between gap-3 text-xs"
                    >
                      <div class="min-w-0">
                        <p class="font-black">{{ item.title }}</p>
                        <p class="mt-1 font-semibold text-[var(--peach-cloud-iron)]">
                          × {{ item.quantity }}
                        </p>
                      </div>
                      <span class="shrink-0 font-black">{{
                        ((item.unitPriceCents * item.quantity) / 100).toFixed(2)
                      }}</span>
                    </div>
                  </div>
                </section>

                <section class="py-5">
                  <h2 class="text-lg font-black">{{ t('配送动态', 'Delivery updates') }}</h2>
                  <div v-if="orderEventRows(activePeachCloudOrder).length" class="mt-3 space-y-3">
                    <article
                      v-for="event in orderEventRows(activePeachCloudOrder)"
                      :key="event.id"
                      class="border-l-2 border-[var(--peach-cloud-accent)] pl-3"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <p class="text-xs font-black">{{ event.typeLabel }}</p>
                          <p
                            class="mt-1 text-[10px] font-semibold leading-4 text-[var(--peach-cloud-iron)]"
                          >
                            {{ event.detail }}
                          </p>
                        </div>
                        <span
                          class="shrink-0 text-[9px] font-bold text-[var(--peach-cloud-iron)]"
                          >{{ event.timeLabel }}</span
                        >
                      </div>
                    </article>
                  </div>
                  <p v-else class="mt-3 text-xs font-semibold text-[var(--peach-cloud-iron)]">
                    {{
                      t(
                        '商家已收到订单，下一条动态会出现在这里。',
                        'The shop has your order. The next update will appear here.',
                      )
                    }}
                  </p>
                </section>
              </template>

              <div
                v-else
                class="flex min-h-[24rem] flex-col items-center justify-center text-center"
              >
                <i class="fas fa-receipt text-3xl text-[var(--peach-cloud-accent)]"></i>
                <p class="mt-3 text-sm font-black">
                  {{ t('没有找到这笔订单', 'Order not found') }}
                </p>
                <button
                  type="button"
                  class="mt-4 rounded-full bg-[var(--peach-cloud-ink)] px-5 py-2.5 text-xs font-black text-[var(--peach-cloud-canvas)]"
                  @click="openPeachCloudPage('orders')"
                >
                  {{ t('查看全部订单', 'View all orders') }}
                </button>
              </div>
            </main>
          </template>

          <nav
            class="fixed bottom-0 left-1/2 z-40 grid w-full max-w-md -translate-x-1/2 grid-cols-5 rounded-t-[1rem] border-t border-[var(--peach-cloud-accent)]/35 bg-[var(--peach-cloud-mist)] px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 text-[var(--peach-cloud-ink)] shadow-[0_-4px_14px_rgba(43,48,58,0.08)]"
            data-testid="food-delivery-peach-cloud-nav"
            :aria-label="t('店铺导航', 'Shop navigation')"
          >
            <button
              type="button"
              class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-[0.8rem] text-[9px] font-black transition-colors active:bg-[var(--peach-cloud-accent)]/70"
              :class="
                activePeachCloudNavKey === 'home'
                  ? 'bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)]'
                  : 'text-[var(--peach-cloud-iron)]'
              "
              data-testid="food-delivery-peach-cloud-nav-home"
              :aria-current="activePeachCloudNavKey === 'home' ? 'page' : undefined"
              @click="openPeachCloudHome"
            >
              <i class="fas fa-house text-base"></i>
              {{ t('首页', 'Home') }}
            </button>
            <button
              type="button"
              class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-[0.8rem] text-[9px] font-black transition-colors active:bg-[var(--peach-cloud-accent)]/70"
              :class="
                activePeachCloudNavKey === 'search'
                  ? 'bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)]'
                  : 'text-[var(--peach-cloud-iron)]'
              "
              data-testid="food-delivery-peach-cloud-nav-menu"
              :aria-current="activePeachCloudNavKey === 'search' ? 'page' : undefined"
              @click="focusPeachCloudSearch"
            >
              <i class="fas fa-magnifying-glass text-base"></i>
              {{ t('搜索', 'Search') }}
            </button>
            <button
              type="button"
              class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-[0.8rem] text-[9px] font-black transition-colors active:bg-[var(--peach-cloud-accent)]/70"
              :class="
                activePeachCloudNavKey === 'new'
                  ? 'bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)]'
                  : 'text-[var(--peach-cloud-iron)]'
              "
              data-testid="food-delivery-peach-cloud-nav-seasonal"
              :aria-current="activePeachCloudNavKey === 'new' ? 'page' : undefined"
              @click="openPeachCloudNew"
            >
              <i class="fas fa-heart text-base"></i>
              {{ t('上新', 'New') }}
            </button>
            <button
              type="button"
              class="relative flex min-h-11 flex-col items-center justify-center gap-1 rounded-[0.8rem] text-[9px] font-black transition-colors active:bg-[var(--peach-cloud-accent)]/70"
              :class="
                activePeachCloudNavKey === 'bag'
                  ? 'bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)]'
                  : 'text-[var(--peach-cloud-iron)]'
              "
              data-testid="food-delivery-peach-cloud-nav-cart"
              :aria-current="activePeachCloudNavKey === 'bag' ? 'page' : undefined"
              @click="openStoreCartSurface"
            >
              <i class="fas fa-bag-shopping text-base"></i>
              {{ t('购物袋', 'Bag') }}
              <span
                v-if="activeStoreCartQuantity"
                class="absolute right-2 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--peach-cloud-ink)] px-1 text-[8px] text-[var(--peach-cloud-canvas)]"
              >
                {{ activeStoreCartQuantity }}
              </span>
            </button>
            <button
              type="button"
              class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-[0.8rem] text-[9px] font-black transition-colors active:bg-[var(--peach-cloud-accent)]/70"
              :class="
                activePeachCloudNavKey === 'orders'
                  ? 'bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)]'
                  : 'text-[var(--peach-cloud-iron)]'
              "
              data-testid="food-delivery-peach-cloud-nav-orders"
              :aria-current="activePeachCloudNavKey === 'orders' ? 'page' : undefined"
              @click="openStoreOrdersSurface"
            >
              <i class="fas fa-receipt text-base"></i>
              {{ t('订单', 'Orders') }}
            </button>
          </nav>
        </article>

        <article
          v-if="activeRestaurant && !isDedicatedStoreApp"
          class="relative overflow-hidden rounded-[2rem] shadow-sm"
          :class="
            isDarkTrayStore
              ? 'border border-white/[0.08] bg-[#10131d] shadow-[0_24px_70px_rgba(0,0,0,0.35)]'
              : isDessertWindowStore
                ? 'border border-[#ffb38e]/50 bg-[#fff9ef] shadow-[0_24px_60px_rgba(239,82,43,0.16)]'
                : 'border border-white/70 bg-white'
          "
          data-testid="food-delivery-store-shell"
          :data-store-id="activeRestaurant.id"
          :data-store-tone="activeStoreVisual.tone"
          :data-store-template="activeStoreTemplate"
        >
          <div
            class="relative overflow-hidden bg-gradient-to-br p-4 text-gray-950"
            :class="
              isDarkTrayStore
                ? 'min-h-[19rem] from-[#2a2d3e] via-[#171a27] to-[#080a10]'
                : isDessertWindowStore
                  ? 'min-h-[22rem] from-[#ef4f29] via-[#f46935] to-[#ffc54f]'
                  : activeStoreVisual.heroClass
            "
          >
            <div class="relative z-20 flex items-center justify-between gap-2">
              <button
                class="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/90 p-0 text-[0px] font-bold text-gray-900 shadow-sm"
                data-testid="food-delivery-store-home"
                aria-label="Home"
                @click="goHome"
              >
                <i class="fas fa-house text-[11px]"></i>
              </button>
            </div>
            <div
              v-if="activeStoreCoverImageUrl"
              class="overflow-hidden"
              :class="
                isDarkTrayStore
                  ? 'absolute inset-0 z-0 mt-0 h-full rounded-none border-0 bg-transparent'
                  : isDessertWindowStore
                    ? 'absolute inset-0 z-0 mt-0 h-full rounded-none border-0 bg-[#ef4f29]'
                    : 'mt-4 h-28 rounded-3xl border border-white/20 bg-white/10'
              "
              data-testid="food-delivery-store-cover"
            >
              <img
                :src="activeStoreCoverImageUrl"
                :alt="`${activeStoreDisplayName} cover`"
                class="h-full w-full object-cover"
                :class="
                  isDarkTrayStore
                    ? 'scale-[1.04] opacity-75'
                    : isDessertWindowStore
                      ? 'scale-[1.02] opacity-80'
                      : ''
                "
                :data-required-asset="
                  isDessertWindowStore ? foodDeliveryRequiredAssetPath(activeRestaurant) : undefined
                "
                @error="isDessertWindowStore ? handleFoodShopImageError($event) : undefined"
              />
              <div
                v-if="isDarkTrayStore"
                class="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,187,116,0.18),transparent_28%),linear-gradient(180deg,rgba(8,10,16,0.34),rgba(8,10,16,0.88)_72%,rgba(8,10,16,0.96))]"
              ></div>
              <div
                v-else-if="isDessertWindowStore"
                class="absolute inset-0 bg-[linear-gradient(90deg,rgba(154,44,15,0.78)_0%,rgba(189,53,18,0.56)_48%,rgba(239,79,41,0.12)_100%),linear-gradient(180deg,rgba(239,79,41,0.08),rgba(143,38,12,0.55))]"
              ></div>
            </div>
            <div
              class="relative z-10 grid grid-cols-[minmax(0,1fr)_5.5rem] items-end gap-4"
              :class="isDarkTrayStore ? 'mt-16' : isDessertWindowStore ? 'mt-20' : 'mt-5'"
            >
              <div class="min-w-0">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase"
                  :class="
                    isDarkTrayStore
                      ? 'bg-white/12 text-emerald-100 backdrop-blur'
                      : 'bg-emerald-400/15 text-emerald-100'
                  "
                  data-testid="food-delivery-store-status"
                >
                  <i class="fas fa-circle text-[6px]"></i>
                  {{ t('营业中', 'Open now') }}
                </span>
                <p class="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-slate-300">
                  {{ activeStoreShortDescription }}
                </p>
                <h2 class="mt-2 truncate text-3xl font-black leading-tight text-white">
                  {{ activeStoreDisplayName }}
                </h2>
                <p
                  v-if="activeStoreTags.length"
                  class="mt-2 line-clamp-2 text-[11px] font-bold text-white/80"
                >
                  {{ activeStoreTags.join(' · ') }}
                </p>
                <div
                  class="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-100"
                  data-testid="food-delivery-store-metrics"
                >
                  <span
                    class="inline-flex items-center gap-1 rounded-full bg-white/[0.1] px-2.5 py-1 backdrop-blur"
                  >
                    <i class="fas fa-star text-[10px] text-amber-300"></i>
                    {{ activeRestaurant.rating.toFixed(1) }}
                  </span>
                  <span class="rounded-full bg-white/[0.1] px-2.5 py-1 backdrop-blur">
                    {{ activeStoreEtaText }}
                  </span>
                  <span class="rounded-full bg-white/[0.1] px-2.5 py-1 backdrop-blur">
                    {{ activeStoreDistanceText }}
                  </span>
                </div>
                <p class="sr-only">
                  {{ activeRestaurant.rating.toFixed(1) }} ★ ·
                  {{ activeRestaurant.deliveryEtaMinutes }} min ·
                  {{ activeRestaurant.distanceKm }} km
                </p>
              </div>
              <div
                class="h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-[1.65rem] shadow-[0_18px_42px_rgba(0,0,0,0.35)]"
                :class="
                  isDarkTrayStore
                    ? 'border border-white/15 bg-white/12 backdrop-blur-md'
                    : 'bg-white/90'
                "
              >
                <img
                  v-if="activeStoreRestaurantImageUrl || isDessertWindowStore"
                  :src="
                    isDessertWindowStore ? peachCloudBrandImageUrl : activeStoreRestaurantImageUrl
                  "
                  :alt="activeRestaurant.image?.alt || activeRestaurant.name"
                  class="h-full w-full object-cover"
                  :class="isDessertWindowStore ? 'bg-[#fff2c7] p-2' : ''"
                  :data-required-asset="
                    isDessertWindowStore ? 'peach-cloud/brand/peach-cloud-mark-01.png' : undefined
                  "
                  @error="isDessertWindowStore ? handleFoodShopImageError($event) : undefined"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-2xl text-orange-500"
                >
                  <i class="fas fa-store"></i>
                </div>
              </div>
            </div>
          </div>
          <div
            class="grid grid-cols-3 gap-2 p-3"
            :class="
              isDarkTrayStore
                ? 'text-slate-100'
                : isDessertWindowStore
                  ? 'text-[#6f2717]'
                  : 'text-gray-950'
            "
          >
            <div
              class="rounded-2xl p-3 text-center"
              :class="
                isDarkTrayStore
                  ? 'bg-white/5'
                  : isDessertWindowStore
                    ? 'bg-[#fff0ce]'
                    : 'bg-gray-50'
              "
            >
              <p
                class="text-[10px] font-semibold"
                :class="
                  isDarkTrayStore
                    ? 'text-slate-400'
                    : isDessertWindowStore
                      ? 'text-[#a35438]'
                      : 'text-gray-500'
                "
              >
                {{ t('配送费', 'Fee') }}
              </p>
              <p class="mt-1 text-xs font-black">{{ activeStoreFeeText }}</p>
            </div>
            <div
              class="rounded-2xl p-3 text-center"
              :class="
                isDarkTrayStore
                  ? 'bg-white/5'
                  : isDessertWindowStore
                    ? 'bg-[#ffe5d6]'
                    : 'bg-gray-50'
              "
            >
              <p
                class="text-[10px] font-semibold"
                :class="
                  isDarkTrayStore
                    ? 'text-slate-400'
                    : isDessertWindowStore
                      ? 'text-[#a35438]'
                      : 'text-gray-500'
                "
              >
                {{ t('预计送达', 'ETA') }}
              </p>
              <p class="mt-1 truncate text-xs font-black">{{ activeStoreEtaText }}</p>
            </div>
            <div
              class="rounded-2xl p-3 text-center"
              :class="
                isDarkTrayStore
                  ? 'bg-orange-400/15 text-orange-100'
                  : isDessertWindowStore
                    ? 'bg-[#ef512d] text-white'
                    : activeStoreVisual.badgeClass
              "
            >
              <p class="text-[10px] font-semibold opacity-70">{{ t('距离', 'Distance') }}</p>
              <p class="mt-1 truncate text-xs font-black">{{ activeStoreDistanceText }}</p>
            </div>
          </div>
        </article>

        <section
          v-if="false"
          class="relative overflow-hidden rounded-[1.75rem] border border-[#ffc48c] bg-[#ffd65a] p-4 text-[#71290f] shadow-[0_18px_44px_rgba(207,99,29,0.16)]"
          data-testid="food-delivery-peach-cloud-featured"
        >
          <div class="relative z-10 max-w-[62%]">
            <span class="inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-black">
              {{ t('今日限定', 'TODAY ONLY') }}
            </span>
            <h3 class="mt-3 text-xl font-black leading-tight">
              {{ peachCloudFeaturedItem.title }}
            </h3>
            <p class="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[#965029]">
              {{ peachCloudFeaturedItem.desc }}
            </p>
            <button
              type="button"
              class="mt-3 inline-flex items-center gap-2 rounded-full bg-[#ef512d] px-4 py-2 text-xs font-black text-white shadow-[0_10px_22px_rgba(239,81,45,0.22)]"
              data-testid="food-delivery-peach-cloud-featured-action"
              @click="focusStoreMenuSection('seasonal_drop')"
            >
              {{ t('看看限定', 'See the drop') }}
              <i class="fas fa-arrow-right text-[10px]"></i>
            </button>
          </div>
          <div
            class="absolute -bottom-5 -right-4 h-40 w-40 overflow-hidden rounded-full border-[10px] border-white/35 bg-white/50 shadow-[0_18px_34px_rgba(166,72,21,0.18)]"
          >
            <img
              :src="foodImageUrl(peachCloudFeaturedItem)"
              :alt="peachCloudFeaturedItem.image?.alt || peachCloudFeaturedItem.title"
              class="h-full w-full object-cover"
              :data-required-asset="foodDeliveryRequiredAssetPath(peachCloudFeaturedItem)"
              @error="handleFoodShopImageError"
            />
          </div>
        </section>

        <section
          v-if="activeRestaurant && !isDedicatedStoreApp"
          class="p-4"
          :class="
            isDarkTrayStore
              ? 'rounded-[2rem] border border-white/[0.08] bg-[#10131d] text-white shadow-[0_20px_56px_rgba(0,0,0,0.28)]'
              : isDessertWindowStore
                ? 'rounded-[1.75rem] border border-[#ffd3b7] bg-[#fffaf2] text-[#612817] shadow-[0_20px_50px_rgba(203,93,38,0.12)]'
                : 'rounded-3xl border border-orange-100 bg-white'
          "
          data-testid="food-delivery-menu-panel"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p
                class="font-black"
                :class="
                  isDarkTrayStore
                    ? 'text-[1.35rem] leading-tight text-white'
                    : isDessertWindowStore
                      ? 'text-xl leading-tight text-[#612817]'
                      : 'text-sm'
                "
              >
                {{
                  isDessertWindowStore
                    ? t('今天想喝什么？', 'What are you craving?')
                    : t('本店菜单', 'Store menu')
                }}
              </p>
              <p
                class="mt-1 text-xs font-semibold"
                :class="
                  isDarkTrayStore
                    ? 'text-slate-400'
                    : isDessertWindowStore
                      ? 'text-[#ad6546]'
                      : 'text-gray-500'
                "
              >
                {{
                  isDessertWindowStore
                    ? t('饮品、冰甜和烤箱小点', 'Cloud tea, frozen sweets, and warm bakes')
                    : activeStoreDisplayName
                }}
              </p>
            </div>
            <span
              class="rounded-full px-3 py-1 text-[11px] font-semibold"
              :class="
                isDarkTrayStore
                  ? 'bg-orange-400/15 text-orange-100'
                  : isDessertWindowStore
                    ? 'bg-[#ffe2ae] text-[#9a3e20]'
                    : activeStoreVisual.badgeClass
              "
            >
              {{ visibleActiveMenuItems.length }} / {{ activeMenuItems.length }}
              {{ t('项', 'item(s)') }}
            </span>
          </div>
          <div
            class="mt-4"
            :class="isDarkTrayStore ? 'grid grid-cols-[4.85rem_minmax(0,1fr)] gap-3' : 'space-y-4'"
          >
            <nav
              v-if="isDarkTrayStore"
              class="sticky top-3 self-start rounded-[1.4rem] border border-white/[0.06] bg-[#0c1019] p-1.5 shadow-[0_18px_38px_rgba(0,0,0,0.26)]"
              data-testid="food-delivery-store-menu-section-rail"
              :aria-label="t('店内分类', 'Store menu sections')"
            >
              <button
                v-for="section in activeStoreMenuSections"
                :key="section.key"
                type="button"
                class="mb-1 flex min-h-[3.65rem] w-full flex-col items-center justify-center gap-1 rounded-[1.05rem] px-1 text-center text-[0.62rem] font-black leading-tight transition last:mb-0 active:scale-[0.97]"
                :class="
                  section.key === activeStoreMenuSectionKey
                    ? 'bg-[#ff806f] text-white shadow-[0_12px_26px_rgba(255,128,111,0.24)]'
                    : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                "
                :data-testid="`food-delivery-store-menu-section-${section.key}`"
                @click="activeStoreMenuSectionKey = section.key"
              >
                <i :class="section.icon" class="text-[0.95rem]"></i>
                <span class="line-clamp-2">{{ section.shortLabel }}</span>
                <span
                  class="inline-flex min-w-5 justify-center rounded-full px-1 text-[0.55rem]"
                  :class="
                    section.key === activeStoreMenuSectionKey
                      ? 'bg-white/20 text-white'
                      : 'bg-white/[0.06] text-slate-500'
                  "
                >
                  {{ section.count }}
                </span>
              </button>
            </nav>
            <nav
              v-else-if="isDessertWindowStore"
              class="grid grid-cols-5 gap-2 overflow-x-auto pb-1"
              data-testid="food-delivery-store-menu-section-rail"
              :aria-label="t('店内分类', 'Store menu sections')"
            >
              <button
                v-for="section in activeStoreMenuSections"
                :key="section.key"
                type="button"
                class="flex min-w-[3.35rem] flex-col items-center gap-1.5 text-center text-[10px] font-black leading-tight text-[#8c4b32] transition active:scale-[0.97]"
                :data-testid="`food-delivery-store-menu-section-${section.key}`"
                @click="activeStoreMenuSectionKey = section.key"
              >
                <span
                  class="inline-flex h-12 w-12 items-center justify-center rounded-full border text-base shadow-sm"
                  :class="
                    section.key === activeStoreMenuSectionKey
                      ? 'border-[#ef512d] bg-[#ef512d] text-white shadow-[0_10px_22px_rgba(239,81,45,0.24)]'
                      : 'border-[#ffd8bd] bg-white text-[#ef512d]'
                  "
                >
                  <i :class="section.icon"></i>
                </span>
                <span class="line-clamp-2 min-h-6">{{ section.shortLabel }}</span>
              </button>
            </nav>
            <div
              v-else
              class="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
              data-testid="food-delivery-store-menu-section-rail"
            >
              <button
                v-for="section in activeStoreMenuSections"
                :key="section.key"
                type="button"
                class="shrink-0 rounded-full px-3 py-2 text-xs font-black transition active:scale-[0.98]"
                :class="
                  section.key === activeStoreMenuSectionKey
                    ? activeStoreVisual.buttonClass
                    : 'bg-gray-50 text-gray-500'
                "
                :data-testid="`food-delivery-store-menu-section-${section.key}`"
                @click="activeStoreMenuSectionKey = section.key"
              >
                {{ section.label }} · {{ section.count }}
              </button>
            </div>
            <div
              class="min-w-0"
              :class="
                isDarkTrayStore
                  ? 'grid grid-cols-1 gap-y-10 pt-12'
                  : isDessertWindowStore
                    ? 'grid grid-cols-2 gap-3'
                    : 'space-y-2'
              "
              :data-active-section="activeStoreMenuSection?.key"
              data-testid="food-delivery-store-menu-items"
            >
              <article
                v-for="item in visibleActiveMenuItems"
                :key="item.id"
                class="relative"
                :class="
                  isDarkTrayStore
                    ? 'min-h-[11.2rem] overflow-visible rounded-[1.85rem] border border-white/[0.05] bg-[linear-gradient(180deg,#202536,#161a27)] p-4 pt-12 text-left shadow-[0_18px_42px_rgba(0,0,0,0.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#202638]'
                    : isDessertWindowStore
                      ? 'min-w-0 overflow-hidden rounded-[1.35rem] border border-[#ffe0cb] bg-white shadow-[0_12px_28px_rgba(191,83,36,0.1)] transition duration-200 hover:-translate-y-0.5'
                      : 'flex items-center justify-between gap-3 rounded-2xl bg-gray-50 p-2'
                "
                :data-testid="`food-delivery-menu-${item.id}`"
                :data-menu-section="item.menuSection || 'signature'"
                :data-template="activeStoreTemplate"
              >
                <template v-if="isDarkTrayStore">
                  <button
                    type="button"
                    class="absolute inset-0 z-0 rounded-[1.85rem] text-left"
                    :data-testid="`food-delivery-menu-open-${item.id}`"
                    @click="openMenuItemDetail(item.id)"
                  >
                    <span class="sr-only">{{ t('查看菜品详情', 'View item details') }}</span>
                  </button>
                  <div
                    class="pointer-events-none absolute left-1/2 top-0 z-10 h-24 w-24 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-[5px] border-[#30364d] bg-[#111421] shadow-[0_18px_40px_rgba(0,0,0,0.42),inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                    :data-testid="`food-delivery-menu-dish-${item.id}`"
                  >
                    <img
                      v-if="foodImageUrl(item)"
                      :src="foodImageUrl(item)"
                      :alt="item.image?.alt || item.title"
                      class="h-full w-full object-cover"
                    />
                    <div
                      v-else
                      class="flex h-full w-full items-center justify-center text-xl text-orange-300"
                    >
                      <i class="fas fa-bowl-food"></i>
                    </div>
                  </div>
                  <div
                    class="pointer-events-none relative z-10 pt-8"
                    :data-testid="`food-delivery-menu-tray-${item.id}`"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="line-clamp-2 text-[1.05rem] font-black leading-6 text-white">
                          {{ item.title }}
                        </p>
                        <p
                          class="mt-1 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-orange-200/70"
                        >
                          {{ resolveStoreMenuSectionMeta(item.menuSection).en }}
                        </p>
                      </div>
                      <p
                        class="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[0.68rem] font-black text-orange-100"
                      >
                        {{ item.price }} {{ item.currency }}
                      </p>
                    </div>
                    <p class="mt-2 line-clamp-2 min-h-9 text-[0.74rem] leading-5 text-slate-400">
                      {{ item.desc || item.ingredients || activeStoreShortDescription }}
                    </p>
                    <div class="mt-4 flex items-center justify-between gap-2">
                      <p class="text-[0.72rem] font-bold text-slate-500">
                        {{ t('点开看详情和食材', 'Tap for details and ingredients') }}
                      </p>
                      <button
                        class="pointer-events-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ff806f] text-[11px] font-black text-white shadow-[0_12px_24px_rgba(255,128,111,0.2)]"
                        :data-testid="`food-delivery-add-${item.id}`"
                        :aria-label="`Add ${item.title}`"
                        @click.stop="addMenuItemToCart(item.id, 1, $event.currentTarget)"
                      >
                        <i class="fas fa-plus text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                </template>
                <template v-else-if="isDessertWindowStore">
                  <button
                    type="button"
                    class="block w-full text-left"
                    :data-testid="`food-delivery-menu-open-${item.id}`"
                    @click="openMenuItemDetail(item.id)"
                  >
                    <div
                      class="aspect-[6/5] w-full overflow-hidden bg-[#fff0dc]"
                      :data-testid="`food-delivery-menu-dish-${item.id}`"
                    >
                      <img
                        v-if="foodImageUrl(item)"
                        :src="foodImageUrl(item)"
                        :alt="item.image?.alt || item.title"
                        class="h-full w-full object-cover"
                        :data-required-asset="foodDeliveryRequiredAssetPath(item)"
                        @error="handleFoodShopImageError"
                      />
                      <div
                        v-else
                        class="flex h-full w-full items-center justify-center text-2xl text-[#ef512d]"
                      >
                        <i class="fas fa-ice-cream"></i>
                      </div>
                    </div>
                    <div class="p-3 pb-2">
                      <p class="line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#5f2919]">
                        {{ item.title }}
                      </p>
                      <p
                        class="mt-1 line-clamp-2 min-h-8 text-[10px] font-semibold leading-4 text-[#a8684e]"
                      >
                        {{ item.desc || item.ingredients }}
                      </p>
                    </div>
                  </button>
                  <div class="flex items-center justify-between gap-2 px-3 pb-3">
                    <p class="min-w-0 truncate text-xs font-black text-[#d54420]">
                      {{ item.price }} {{ item.currency }}
                    </p>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ef512d] text-white shadow-[0_10px_20px_rgba(239,81,45,0.24)] active:scale-[0.96]"
                      :data-testid="`food-delivery-add-${item.id}`"
                      :aria-label="`Add ${item.title}`"
                      @click.stop="addMenuItemToCart(item.id, 1, $event.currentTarget)"
                    >
                      <i class="fas fa-plus text-[10px]"></i>
                    </button>
                  </div>
                </template>
                <template v-else>
                  <button
                    type="button"
                    class="flex min-w-0 flex-1 items-center gap-3 text-left"
                    :data-testid="`food-delivery-menu-open-${item.id}`"
                    @click="openMenuItemDetail(item.id)"
                  >
                    <div class="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-orange-50">
                      <img
                        v-if="foodImageUrl(item)"
                        :src="foodImageUrl(item)"
                        :alt="item.image?.alt || item.title"
                        class="h-full w-full object-cover"
                      />
                      <div
                        v-else
                        class="flex h-full w-full items-center justify-center text-orange-500"
                      >
                        <i class="fas fa-bowl-food"></i>
                      </div>
                    </div>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-bold">{{ item.title }}</p>
                      <p class="mt-1 text-[11px] text-gray-500">
                        {{ item.price }} {{ item.currency }}
                      </p>
                      <p class="mt-0.5 text-[10px] font-semibold text-orange-500">
                        {{ foodImageSourceLabel(item) }}
                      </p>
                    </div>
                  </button>
                  <button
                    class="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold"
                    :class="activeStoreVisual.buttonClass"
                    :data-testid="`food-delivery-add-${item.id}`"
                    @click.stop="addMenuItemToCart(item.id, 1, $event.currentTarget)"
                  >
                    {{ t('加入', 'Add') }}
                  </button>
                </template>
              </article>
            </div>
          </div>
        </section>

        <p
          v-if="false"
          class="rounded-2xl border border-[#ffc9a9] bg-white px-3 py-2 text-center text-xs font-bold leading-5 text-[#a34426]"
          data-testid="food-delivery-store-nav-feedback"
        >
          {{ storeNavigationFeedback }}
        </p>

        <nav
          v-if="false"
          class="grid grid-cols-4 rounded-[1.35rem] border border-[#ffc9a9] bg-white p-1.5 text-[#8d4c33] shadow-[0_18px_45px_rgba(155,61,25,0.14)]"
          data-testid="food-delivery-peach-cloud-nav"
          :aria-label="t('店铺导航', 'Shop navigation')"
        >
          <button
            type="button"
            class="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-black"
            data-testid="food-delivery-peach-cloud-nav-menu"
            @click="focusStoreMenuSection('all')"
          >
            <i class="fas fa-table-cells-large text-sm text-[#ef512d]"></i>
            {{ t('菜单', 'Menu') }}
          </button>
          <button
            type="button"
            class="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-black"
            data-testid="food-delivery-peach-cloud-nav-seasonal"
            @click="focusStoreMenuSection('seasonal_drop')"
          >
            <i class="fas fa-sun text-sm text-[#ef512d]"></i>
            {{ t('上新', 'New') }}
          </button>
          <button
            type="button"
            class="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-black"
            data-testid="food-delivery-peach-cloud-nav-cart"
            @click="openStoreCartSurface"
          >
            <i class="fas fa-bag-shopping text-sm text-[#ef512d]"></i>
            {{ t('购物袋', 'Bag') }}
          </button>
          <button
            type="button"
            class="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-black"
            data-testid="food-delivery-peach-cloud-nav-orders"
            @click="openStoreOrdersSurface"
          >
            <i class="fas fa-receipt text-sm text-[#ef512d]"></i>
            {{ t('订单', 'Orders') }}
          </button>
        </nav>
      </section>

      <section
        v-if="selectedMenuItem"
        class="fixed inset-0 z-50 flex backdrop-blur-sm"
        :class="
          isDarkTrayStore
            ? 'items-end bg-black/[0.65] p-4 sm:items-center'
            : 'items-end bg-black/45 p-3'
        "
        data-testid="food-delivery-menu-detail-sheet"
      >
        <article
          class="mx-auto w-full max-w-md shadow-2xl"
          :class="
            isDarkTrayStore && menuDetailMode === 'detail'
              ? 'relative mt-20 overflow-visible rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#151824,#0b0d13)] text-white shadow-[0_28px_80px_rgba(0,0,0,0.55)]'
              : isDessertWindowStore && menuDetailMode === 'detail'
                ? 'overflow-hidden rounded-[1.75rem] border border-[var(--peach-cloud-mist)] bg-[var(--peach-cloud-canvas)] text-[var(--peach-cloud-ink)] shadow-[0_26px_70px_rgba(43,48,58,0.28)]'
                : isQuickServiceStore && menuDetailMode === 'detail'
                  ? 'overflow-hidden rounded-lg border border-black/10 bg-[#fff9ec] text-[#201a17] shadow-[0_26px_70px_rgba(32,26,23,0.28)]'
                  : isJadeTableStore && menuDetailMode === 'detail'
                    ? 'overflow-hidden rounded-sm border border-[#cfc2ad] bg-[#f5efe2] text-[#211e19] shadow-[0_26px_70px_rgba(31,77,58,0.25)]'
                    : 'overflow-hidden rounded-[2rem] bg-white'
          "
        >
          <template v-if="isDarkTrayStore && menuDetailMode === 'detail'">
            <div class="relative px-5 pb-5 pt-24">
              <div
                class="absolute left-1/2 top-0 z-20 h-44 w-44 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-[6px] border-[#272b3b] bg-[#080a10] shadow-[0_22px_50px_rgba(0,0,0,0.55)]"
                data-testid="food-delivery-menu-detail-round-image"
              >
                <img
                  v-if="foodImageUrl(selectedMenuItem)"
                  :src="foodImageUrl(selectedMenuItem)"
                  :alt="selectedMenuItem.image?.alt || selectedMenuItem.title"
                  class="h-full w-full object-cover"
                />
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-4xl text-orange-300"
                >
                  <i class="fas fa-bowl-food"></i>
                </div>
              </div>
              <div class="absolute inset-x-0 top-3 z-30 flex items-center justify-between px-4">
                <button
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white shadow-sm backdrop-blur"
                  data-testid="food-delivery-menu-detail-close"
                  @click="closeMenuItemDetail"
                >
                  <i class="fas fa-xmark"></i>
                </button>
                <button
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/10 text-orange-100 shadow-sm backdrop-blur"
                  data-testid="food-delivery-menu-detail-edit"
                  @click="startMenuItemEdit"
                >
                  <i class="fas fa-pen"></i>
                </button>
              </div>

              <div class="space-y-4">
                <div>
                  <p class="text-[11px] font-semibold uppercase text-orange-300">
                    {{ activeStoreDisplayName }}
                  </p>
                  <h3 class="mt-2 text-3xl font-black leading-tight text-white">
                    {{ selectedMenuItem.title }}
                  </h3>
                  <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                    <span class="rounded-full bg-white/[0.08] px-3 py-1 text-slate-200">
                      {{ selectedMenuItem.price }} {{ selectedMenuItem.currency }}
                    </span>
                    <span class="rounded-full bg-orange-500/15 px-3 py-1 text-orange-100">
                      {{ activeStoreEtaText }} · {{ activeStoreFeeText }}
                    </span>
                  </div>
                </div>

                <p
                  class="text-sm leading-6 text-slate-300"
                  data-testid="food-delivery-menu-detail-desc"
                >
                  {{
                    selectedMenuItem.desc ||
                    t(
                      '暂无简介，可在编辑中补充这道菜的口味、场景和亮点。',
                      'No description yet. Edit this item to add taste, scene, and highlights.',
                    )
                  }}
                </p>

                <div
                  class="rounded-[1.35rem] bg-white/[0.06] p-3"
                  data-testid="food-delivery-menu-detail-ingredients"
                >
                  <p class="text-[11px] font-bold uppercase text-orange-300">
                    {{ t('基础食材', 'Base ingredients') }}
                  </p>
                  <p class="mt-1 text-sm font-semibold leading-5 text-slate-100">
                    {{ selectedMenuItem.ingredients || t('未设置', 'Not set') }}
                  </p>
                </div>

                <p
                  v-if="menuDetailFeedback"
                  class="rounded-2xl bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-100"
                  data-testid="food-delivery-menu-detail-feedback"
                >
                  {{ menuDetailFeedback }}
                </p>

                <div class="flex items-center justify-between gap-4">
                  <div
                    class="inline-flex h-10 items-center rounded-full border border-orange-300/55 bg-black/24 text-orange-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    data-testid="food-delivery-menu-detail-quantity"
                  >
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center text-sm"
                      data-testid="food-delivery-menu-detail-quantity-decrease"
                      @click="decreaseMenuDetailQuantity"
                    >
                      <i class="fas fa-minus"></i>
                    </button>
                    <span class="min-w-8 text-center text-sm font-black">{{
                      menuDetailQuantity
                    }}</span>
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center text-sm"
                      data-testid="food-delivery-menu-detail-quantity-increase"
                      @click="increaseMenuDetailQuantity"
                    >
                      <i class="fas fa-plus"></i>
                    </button>
                  </div>
                  <p
                    class="shrink-0 text-right text-lg font-black text-white"
                    data-testid="food-delivery-menu-detail-total"
                  >
                    {{ selectedMenuItemDetailTotal }}
                  </p>
                </div>

                <button
                  type="button"
                  class="w-full rounded-2xl bg-[#ff806f] px-4 py-3 text-sm font-black text-white shadow-[0_16px_34px_rgba(255,128,111,0.28)] transition active:scale-[0.99]"
                  data-testid="food-delivery-menu-detail-add"
                  @click="
                    addMenuItemToCart(selectedMenuItem.id, menuDetailQuantity, $event.currentTarget)
                  "
                >
                  {{ t('加入购物车', 'Add to cart') }}
                </button>
              </div>
            </div>
          </template>

          <template v-else-if="isDessertWindowStore && menuDetailMode === 'detail'">
            <div class="relative aspect-[16/11] overflow-hidden bg-[var(--peach-cloud-mist)]">
              <img
                v-if="foodImageUrl(selectedMenuItem)"
                :src="foodImageUrl(selectedMenuItem)"
                :alt="selectedMenuItem.image?.alt || selectedMenuItem.title"
                class="h-full w-full object-cover"
                :data-required-asset="foodDeliveryRequiredAssetPath(selectedMenuItem)"
                @error="handleFoodShopImageError"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-5xl text-[var(--peach-cloud-ink)]"
              >
                <i class="fas fa-ice-cream"></i>
              </div>
              <div
                class="absolute inset-0 bg-[linear-gradient(180deg,rgba(43,48,58,0.06),rgba(43,48,58,0.42))]"
              ></div>
              <div class="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                <button
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--peach-cloud-canvas)]/90 text-[var(--peach-cloud-ink)] shadow-sm"
                  data-testid="food-delivery-menu-detail-close"
                  :aria-label="t('关闭', 'Close')"
                  @click="closeMenuItemDetail"
                >
                  <i class="fas fa-xmark"></i>
                </button>
                <button
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--peach-cloud-canvas)]/90 text-[var(--peach-cloud-ink)] shadow-sm"
                  data-testid="food-delivery-menu-detail-edit"
                  :aria-label="t('编辑商品', 'Edit item')"
                  @click="startMenuItemEdit"
                >
                  <i class="fas fa-pen"></i>
                </button>
              </div>
              <span
                class="absolute bottom-3 left-3 rounded-full bg-[var(--peach-cloud-accent)] px-3 py-1 text-[11px] font-black text-[var(--peach-cloud-ink)]"
              >
                {{
                  resolveStoreMenuSectionMeta(selectedMenuItem.menuSection).label ||
                  resolveStoreMenuSectionMeta(selectedMenuItem.menuSection).en
                }}
              </span>
            </div>

            <div class="space-y-4 p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[10px] font-black text-[var(--peach-cloud-iron)]">
                    {{ activeStoreDisplayName }}
                  </p>
                  <h3 class="mt-1 text-2xl font-black leading-tight text-[var(--peach-cloud-ink)]">
                    {{ selectedMenuItem.title }}
                  </h3>
                </div>
                <span
                  class="shrink-0 rounded-full bg-[var(--peach-cloud-mist)]/55 px-3 py-1 text-xs font-black text-[var(--peach-cloud-ink)]"
                >
                  {{ selectedMenuItem.price }} {{ selectedMenuItem.currency }}
                </span>
              </div>

              <p
                class="text-sm font-semibold leading-6 text-[var(--peach-cloud-iron)]"
                data-testid="food-delivery-menu-detail-desc"
              >
                {{ selectedMenuItem.desc }}
              </p>

              <div
                class="rounded-[1.25rem] bg-[var(--peach-cloud-mist)]/25 p-3"
                data-testid="food-delivery-menu-detail-ingredients"
              >
                <p class="text-[10px] font-black text-[var(--peach-cloud-ink)]">
                  {{ t('杯中风味', 'Inside the cup') }}
                </p>
                <p class="mt-1 text-sm font-semibold leading-5 text-[var(--peach-cloud-iron)]">
                  {{ selectedMenuItem.ingredients || t('未设置', 'Not set') }}
                </p>
              </div>

              <p
                v-if="menuDetailFeedback"
                class="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                data-testid="food-delivery-menu-detail-feedback"
              >
                {{ menuDetailFeedback }}
              </p>

              <div class="flex items-center justify-between gap-4">
                <div
                  class="inline-flex h-11 items-center rounded-full border border-[var(--peach-cloud-mist)] bg-white/80 text-[var(--peach-cloud-ink)]"
                  data-testid="food-delivery-menu-detail-quantity"
                >
                  <button
                    type="button"
                    class="inline-flex h-11 w-11 items-center justify-center text-sm"
                    data-testid="food-delivery-menu-detail-quantity-decrease"
                    @click="decreaseMenuDetailQuantity"
                  >
                    <i class="fas fa-minus"></i>
                  </button>
                  <span class="min-w-8 text-center text-sm font-black">{{
                    menuDetailQuantity
                  }}</span>
                  <button
                    type="button"
                    class="inline-flex h-11 w-11 items-center justify-center text-sm"
                    data-testid="food-delivery-menu-detail-quantity-increase"
                    @click="increaseMenuDetailQuantity"
                  >
                    <i class="fas fa-plus"></i>
                  </button>
                </div>
                <p
                  class="text-right text-lg font-black text-[var(--peach-cloud-ink)]"
                  data-testid="food-delivery-menu-detail-total"
                >
                  {{ selectedMenuItemDetailTotal }}
                </p>
              </div>

              <button
                type="button"
                class="w-full rounded-2xl bg-[var(--peach-cloud-accent)] px-4 py-3 text-sm font-black text-[var(--peach-cloud-ink)] shadow-[0_16px_34px_rgba(43,48,58,0.18)] active:scale-[0.99]"
                data-testid="food-delivery-menu-detail-add"
                @click="
                  addMenuItemToCart(selectedMenuItem.id, menuDetailQuantity, $event.currentTarget)
                "
              >
                {{ t('装进购物袋', 'Add to bag') }}
              </button>
            </div>
          </template>

          <template v-else-if="isQuickServiceStore && menuDetailMode === 'detail'">
            <div class="relative aspect-[16/10] overflow-hidden bg-[#e33d2e]">
              <img
                v-if="foodImageUrl(selectedMenuItem)"
                :src="foodImageUrl(selectedMenuItem)"
                :alt="selectedMenuItem.image?.alt || selectedMenuItem.title"
                class="h-full w-full object-cover"
                :data-required-asset="`dash-grill/products/dash-grill-item-${String(
                  activeMenuItems.findIndex((item) => item.id === selectedMenuItem.id) + 1,
                ).padStart(2, '0')}.png`"
                @error="handleFoodShopImageError"
              />
              <div
                class="absolute inset-0 bg-[linear-gradient(180deg,rgba(32,26,23,0.06),rgba(32,26,23,0.55))]"
              ></div>
              <div class="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                <button
                  type="button"
                  class="inline-flex h-10 w-10 items-center justify-center bg-[#fff9ec] text-[#201a17] shadow-sm"
                  data-testid="food-delivery-menu-detail-close"
                  :aria-label="t('关闭', 'Close')"
                  @click="closeMenuItemDetail"
                >
                  <i class="fas fa-xmark"></i>
                </button>
                <button
                  type="button"
                  class="inline-flex h-10 w-10 items-center justify-center bg-[#ffc833] text-[#201a17] shadow-sm"
                  data-testid="food-delivery-menu-detail-edit"
                  :aria-label="t('编辑餐品', 'Edit item')"
                  @click="startMenuItemEdit"
                >
                  <i class="fas fa-pen"></i>
                </button>
              </div>
              <span
                class="absolute bottom-3 left-3 bg-[#ffc833] px-2.5 py-1 text-[10px] font-black uppercase text-[#201a17]"
              >
                {{ resolveStoreMenuSectionMeta(selectedMenuItem.menuSection).en }}
              </span>
            </div>

            <div class="space-y-4 p-4">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-[9px] font-black uppercase text-[#e33d2e]">
                    {{ activeStoreDisplayName }}
                  </p>
                  <h3 class="mt-1 text-2xl font-black leading-tight text-[#201a17]">
                    {{ selectedMenuItem.title }}
                  </h3>
                </div>
                <span class="shrink-0 bg-white px-2.5 py-1 text-xs font-black">
                  {{ selectedMenuItem.price }} {{ selectedMenuItem.currency }}
                </span>
              </div>

              <p
                class="text-sm font-semibold leading-6 text-black/60"
                data-testid="food-delivery-menu-detail-desc"
              >
                {{ selectedMenuItem.desc }}
              </p>

              <div
                class="border-l-4 border-[#ffc833] bg-white p-3"
                data-testid="food-delivery-menu-detail-ingredients"
              >
                <p class="text-[9px] font-black uppercase text-black/45">
                  {{ t('餐品内容', 'WHAT IS INSIDE') }}
                </p>
                <p class="mt-1 text-sm font-semibold leading-5 text-[#201a17]">
                  {{ selectedMenuItem.ingredients || t('未设置', 'Not set') }}
                </p>
              </div>

              <p
                v-if="menuDetailFeedback"
                class="bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                data-testid="food-delivery-menu-detail-feedback"
              >
                {{ menuDetailFeedback }}
              </p>

              <div class="flex items-center justify-between gap-4">
                <div
                  class="inline-flex h-11 items-center border border-black/15 bg-white"
                  data-testid="food-delivery-menu-detail-quantity"
                >
                  <button
                    type="button"
                    class="inline-flex h-11 w-11 items-center justify-center"
                    data-testid="food-delivery-menu-detail-quantity-decrease"
                    :aria-label="t('减少数量', 'Decrease quantity')"
                    @click="decreaseMenuDetailQuantity"
                  >
                    <i class="fas fa-minus text-xs"></i>
                  </button>
                  <span class="min-w-8 text-center text-sm font-black">{{
                    menuDetailQuantity
                  }}</span>
                  <button
                    type="button"
                    class="inline-flex h-11 w-11 items-center justify-center"
                    data-testid="food-delivery-menu-detail-quantity-increase"
                    :aria-label="t('增加数量', 'Increase quantity')"
                    @click="increaseMenuDetailQuantity"
                  >
                    <i class="fas fa-plus text-xs"></i>
                  </button>
                </div>
                <p
                  class="text-right text-lg font-black text-[#201a17]"
                  data-testid="food-delivery-menu-detail-total"
                >
                  {{ selectedMenuItemDetailTotal }}
                </p>
              </div>

              <button
                type="button"
                class="min-h-12 w-full bg-[#e33d2e] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(227,61,46,0.25)] active:scale-[0.99]"
                data-testid="food-delivery-menu-detail-add"
                @click="
                  addMenuItemToCart(selectedMenuItem.id, menuDetailQuantity, $event.currentTarget)
                "
              >
                {{ t('加入购物袋', 'Add to bag') }}
              </button>
            </div>
          </template>

          <template v-else-if="isJadeTableStore && menuDetailMode === 'detail'">
            <div class="relative aspect-[16/10] overflow-hidden bg-[#1f4d3a]">
              <img
                v-if="foodImageUrl(selectedMenuItem)"
                :src="foodImageUrl(selectedMenuItem)"
                :alt="selectedMenuItem.image?.alt || selectedMenuItem.title"
                class="h-full w-full object-cover"
                :data-required-asset="foodDeliveryRequiredAssetPath(selectedMenuItem)"
                @error="handleFoodShopImageError"
              />
              <div class="absolute inset-0 bg-black/30"></div>
              <div class="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                <button
                  type="button"
                  class="inline-flex h-11 w-11 items-center justify-center border border-white/35 bg-[#f5efe2] text-[#211e19] shadow-sm"
                  data-testid="food-delivery-menu-detail-close"
                  :aria-label="t('关闭', 'Close')"
                  @click="closeMenuItemDetail"
                >
                  <i class="fas fa-xmark"></i>
                </button>
                <button
                  type="button"
                  class="inline-flex h-11 w-11 items-center justify-center border border-white/35 bg-[#bd4b35] text-white shadow-sm"
                  data-testid="food-delivery-menu-detail-edit"
                  :aria-label="t('编辑餐品', 'Edit item')"
                  @click="startMenuItemEdit"
                >
                  <i class="fas fa-pen"></i>
                </button>
              </div>
              <span
                class="absolute bottom-3 left-3 inline-flex h-12 w-12 items-center justify-center border border-white/55 bg-[#bd4b35] text-lg font-black text-white"
              >
                {{ resolveStoreMenuSectionMeta(selectedMenuItem.menuSection).zh.slice(0, 1) }}
              </span>
            </div>

            <div class="space-y-4 p-4">
              <div
                class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-[#cfc2ad] pb-4"
              >
                <div class="min-w-0">
                  <p class="text-[10px] font-black text-[#bd4b35]">{{ activeStoreDisplayName }}</p>
                  <h3
                    class="mt-1 break-words font-serif text-2xl font-black leading-tight text-[#211e19]"
                  >
                    {{ selectedMenuItem.title }}
                  </h3>
                </div>
                <span
                  class="shrink-0 border border-[#cfc2ad] bg-white/55 px-2.5 py-1 text-xs font-black"
                >
                  {{ selectedMenuItem.price }} {{ selectedMenuItem.currency }}
                </span>
              </div>

              <p
                class="text-sm font-semibold leading-6 text-[#746c61]"
                data-testid="food-delivery-menu-detail-desc"
              >
                {{ selectedMenuItem.desc }}
              </p>

              <div
                class="border-l-4 border-[#1f4d3a] bg-white/55 p-3"
                data-testid="food-delivery-menu-detail-ingredients"
              >
                <p class="text-[10px] font-black text-[#bd4b35]">
                  {{ t('这道菜里', 'AT THE TABLE') }}
                </p>
                <p class="mt-1 text-sm font-semibold leading-5 text-[#211e19]">
                  {{ selectedMenuItem.ingredients || t('未设置', 'Not set') }}
                </p>
              </div>

              <p
                v-if="menuDetailFeedback"
                class="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                data-testid="food-delivery-menu-detail-feedback"
              >
                {{ menuDetailFeedback }}
              </p>

              <div class="flex items-center justify-between gap-4">
                <div
                  class="inline-flex h-11 items-center border border-[#cfc2ad] bg-white/55"
                  data-testid="food-delivery-menu-detail-quantity"
                >
                  <button
                    type="button"
                    class="inline-flex h-11 w-11 items-center justify-center"
                    data-testid="food-delivery-menu-detail-quantity-decrease"
                    :aria-label="t('减少数量', 'Decrease quantity')"
                    @click="decreaseMenuDetailQuantity"
                  >
                    <i class="fas fa-minus text-xs"></i>
                  </button>
                  <span class="min-w-8 text-center text-sm font-black">{{
                    menuDetailQuantity
                  }}</span>
                  <button
                    type="button"
                    class="inline-flex h-11 w-11 items-center justify-center"
                    data-testid="food-delivery-menu-detail-quantity-increase"
                    :aria-label="t('增加数量', 'Increase quantity')"
                    @click="increaseMenuDetailQuantity"
                  >
                    <i class="fas fa-plus text-xs"></i>
                  </button>
                </div>
                <p
                  class="text-right text-lg font-black text-[#211e19]"
                  data-testid="food-delivery-menu-detail-total"
                >
                  {{ selectedMenuItemDetailTotal }}
                </p>
              </div>

              <button
                type="button"
                class="min-h-12 w-full bg-[#bd4b35] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(189,75,53,0.22)] active:scale-[0.99]"
                data-testid="food-delivery-menu-detail-add"
                @click="
                  addMenuItemToCart(selectedMenuItem.id, menuDetailQuantity, $event.currentTarget)
                "
              >
                {{ t('添到餐桌', 'Add to table') }}
              </button>
            </div>
          </template>

          <template v-else>
            <div class="relative h-48 bg-gray-950">
              <img
                v-if="foodImageUrl(selectedMenuItem)"
                :src="foodImageUrl(selectedMenuItem)"
                :alt="selectedMenuItem.image?.alt || selectedMenuItem.title"
                class="h-full w-full object-cover"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-4xl text-orange-300"
              >
                <i class="fas fa-bowl-food"></i>
              </div>
              <div class="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                <button
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-sm"
                  data-testid="food-delivery-menu-detail-close"
                  @click="closeMenuItemDetail"
                >
                  <i class="fas fa-xmark"></i>
                </button>
                <button
                  v-if="menuDetailMode === 'detail'"
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-sm"
                  data-testid="food-delivery-menu-detail-edit"
                  @click="startMenuItemEdit"
                >
                  <i class="fas fa-pen"></i>
                </button>
              </div>
            </div>

            <div v-if="menuDetailMode === 'detail'" class="space-y-4 p-4">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
                  {{ activeRestaurant?.name || t('店铺菜品', 'Store item') }}
                </p>
                <div class="mt-1 flex items-start justify-between gap-3">
                  <h3 class="text-2xl font-black text-gray-950">{{ selectedMenuItem.title }}</h3>
                  <span
                    class="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700"
                  >
                    {{ selectedMenuItem.price }} {{ selectedMenuItem.currency }}
                  </span>
                </div>
              </div>
              <p
                class="rounded-2xl bg-gray-50 p-3 text-sm leading-6 text-gray-600"
                data-testid="food-delivery-menu-detail-desc"
              >
                {{
                  selectedMenuItem.desc ||
                  t(
                    '暂无简介，可在编辑中补充这道菜的口味、场景和亮点。',
                    'No description yet. Edit this item to add taste, scene, and highlights.',
                  )
                }}
              </p>
              <div
                class="rounded-2xl bg-orange-50/70 p-3"
                data-testid="food-delivery-menu-detail-ingredients"
              >
                <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-orange-500">
                  {{ t('基础食材', 'Base ingredients') }}
                </p>
                <p class="mt-1 text-sm font-semibold text-orange-900">
                  {{ selectedMenuItem.ingredients || t('未填写', 'Not set') }}
                </p>
              </div>
              <div
                class="flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2 text-xs text-gray-500"
              >
                <span>{{ t('图片来源', 'Image source') }}</span>
                <span class="font-semibold text-gray-900">{{
                  foodImageSourceLabel(selectedMenuItem)
                }}</span>
              </div>
              <p
                v-if="menuDetailFeedback"
                class="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                data-testid="food-delivery-menu-detail-feedback"
              >
                {{ menuDetailFeedback }}
              </p>
              <button
                type="button"
                class="w-full rounded-2xl bg-gray-950 px-4 py-3 text-sm font-black text-white"
                data-testid="food-delivery-menu-detail-add"
                @click="addMenuItemToCart(selectedMenuItem.id, 1, $event.currentTarget)"
              >
                {{ t('加入购物车', 'Add to cart') }}
              </button>
            </div>

            <form
              v-else
              class="space-y-3 p-4"
              data-testid="food-delivery-menu-edit-form"
              @submit.prevent="saveMenuItemEdit"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-500">
                    {{ t('编辑当前菜品', 'Edit this item') }}
                  </p>
                  <h3 class="mt-1 text-xl font-black text-gray-950">
                    {{ selectedMenuItem.title }}
                  </h3>
                </div>
                <button
                  type="button"
                  class="rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-600"
                  data-testid="food-delivery-menu-edit-cancel"
                  @click="cancelMenuItemEdit"
                >
                  {{ t('取消', 'Cancel') }}
                </button>
              </div>
              <input
                v-model="menuItemEditDraft.title"
                class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold outline-none"
                data-testid="food-delivery-menu-edit-title"
                :placeholder="t('菜品名称', 'Item name')"
              />
              <textarea
                v-model="menuItemEditDraft.desc"
                class="min-h-24 w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 outline-none"
                data-testid="food-delivery-menu-edit-desc"
                :placeholder="t('简介', 'Description')"
              ></textarea>
              <input
                v-model="menuItemEditDraft.ingredients"
                class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none"
                data-testid="food-delivery-menu-edit-ingredients"
                :placeholder="t('基础食材', 'Base ingredients')"
              />
              <ImageSourcePicker
                v-model:source-type="menuItemEditDraft.imageSourceType"
                v-model:image-url="menuItemEditDraft.imageUrl"
                v-model:gallery-asset-id="menuItemEditDraft.imageGalleryAssetId"
                :gallery-assets="galleryImageOptions"
                size="xs"
                test-id-prefix="food-delivery-menu-edit"
              />
              <p
                v-if="menuDetailFeedback"
                class="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
                data-testid="food-delivery-menu-edit-feedback"
              >
                {{ menuDetailFeedback }}
              </p>
              <button
                type="button"
                class="w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white"
                data-testid="food-delivery-menu-edit-save"
                @click="saveMenuItemEdit"
              >
                {{ t('保存当前菜品', 'Save this item') }}
              </button>
            </form>
          </template>
        </article>
      </section>

      <section
        v-if="shopCartReplacementOpen && pendingShopCartAddition"
        class="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-4 backdrop-blur-sm sm:items-center"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="food-delivery-cart-replacement-title"
        aria-describedby="food-delivery-cart-replacement-description"
        data-testid="food-delivery-cart-replacement-dialog"
        @keydown.esc.stop.prevent="cancelShopCartReplacement"
      >
        <div
          class="w-full max-w-sm rounded-[1.5rem] border border-white/10 bg-white p-4 text-gray-950 shadow-[0_28px_90px_rgba(0,0,0,0.45)]"
        >
          <div class="flex items-start gap-3">
            <span
              class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"
              aria-hidden="true"
            >
              <i class="fas fa-bag-shopping"></i>
            </span>
            <div class="min-w-0">
              <h2
                id="food-delivery-cart-replacement-title"
                class="min-w-0 break-words text-lg font-black leading-6 [overflow-wrap:anywhere]"
              >
                {{ t('替换另一家店的购物袋？', "Replace another shop's bag?") }}
              </h2>
              <p
                id="food-delivery-cart-replacement-description"
                class="mt-2 min-w-0 break-words text-sm font-semibold leading-6 text-gray-600 [overflow-wrap:anywhere]"
              >
                {{
                  t(
                    `${pendingShopCartAddition.previousOwnerLabel} 的餐品仍在购物袋中。确认后会清空旧购物袋，并只加入 ${pendingShopCartAddition.quantity} 份 ${pendingShopCartAddition.menuItemTitle} 到 ${pendingShopCartAddition.nextRestaurant?.name || activeStoreDisplayName}。`,
                    `Your ${pendingShopCartAddition.previousOwnerLabel} items are still in the bag. Confirming clears that bag and adds ${pendingShopCartAddition.quantity} x ${pendingShopCartAddition.menuItemTitle} to ${pendingShopCartAddition.nextRestaurant?.name || activeStoreDisplayName}.`,
                  )
                }}
              </p>
            </div>
          </div>
          <div class="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              ref="shopCartReplacementCancelRef"
              type="button"
              class="min-h-12 rounded-xl bg-gray-100 px-4 py-3 text-sm font-black text-gray-800"
              data-testid="food-delivery-cart-replacement-cancel"
              @click="cancelShopCartReplacement"
            >
              {{ t('保留原购物袋', 'Keep old bag') }}
            </button>
            <button
              type="button"
              class="min-h-12 rounded-xl bg-gray-950 px-4 py-3 text-sm font-black text-white"
              data-testid="food-delivery-cart-replacement-confirm"
              @click="confirmShopCartReplacement"
            >
              {{ t('替换并加入', 'Replace and add') }}
            </button>
          </div>
        </div>
      </section>

      <section
        v-if="
          isStoreMode &&
          !isDedicatedStoreApp &&
          (activeStoreCartLineItems.length > 0 || hasCartOwnershipConflict || checkoutFeedback)
        "
        class="rounded-3xl p-4"
        :class="
          isDessertWindowStore
            ? 'relative z-20 mx-4 mb-20 border border-[var(--peach-cloud-mist)] bg-[var(--peach-cloud-canvas)] text-[var(--peach-cloud-ink)] shadow-[0_18px_46px_rgba(43,48,58,0.16)]'
            : isStoreMode
              ? 'sticky bottom-3 z-30 border border-orange-300/20 bg-[#0f121c]/95 text-white shadow-[0_22px_60px_rgba(0,0,0,0.45)] backdrop-blur'
              : 'border border-amber-100 bg-white'
        "
        data-testid="food-delivery-cart-panel"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span
              v-if="isStoreMode"
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white"
              :class="
                isDessertWindowStore
                  ? 'bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)] shadow-[0_12px_28px_rgba(43,48,58,0.18)]'
                  : 'bg-[#ff806f] shadow-[0_12px_28px_rgba(255,128,111,0.25)]'
              "
            >
              <i class="fas fa-basket-shopping"></i>
            </span>
            <div class="min-w-0">
              <p class="text-sm font-bold">{{ t('外卖购物车', 'Food cart') }}</p>
              <p
                class="mt-1 text-xs"
                data-testid="food-delivery-active-cart-quantity"
                :class="
                  isDessertWindowStore
                    ? 'text-[var(--peach-cloud-iron)]'
                    : isStoreMode
                      ? 'text-slate-400'
                      : 'text-gray-500'
                "
              >
                {{ activeStoreCartQuantity }} {{ t('份餐品', 'item(s)') }}
              </p>
            </div>
          </div>
          <span
            class="rounded-full px-3 py-1 text-[11px] font-semibold"
            data-testid="food-delivery-active-cart-total"
            :class="
              isDessertWindowStore
                ? 'bg-[var(--peach-cloud-mist)]/55 text-[var(--peach-cloud-ink)]'
                : isStoreMode
                  ? 'bg-orange-400/15 text-orange-100'
                  : 'bg-amber-50 text-amber-700'
            "
          >
            {{ t('预计合计', 'Est. total') }} {{ activeStoreCartPrimaryTotal.amount }}
            {{ activeStoreCartPrimaryTotal.currency }}
          </span>
        </div>
        <div
          v-if="hasCartOwnershipConflict"
          class="mt-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3"
          data-testid="food-delivery-foreign-cart-notice"
          :data-cart-ownership-state="cartOwnershipState"
        >
          <p class="text-[11px] font-black uppercase text-amber-200">
            {{
              cartOwnershipState === 'mixed'
                ? t('恢复的购物袋归属不一致', 'Restored bag ownership mismatch')
                : t('另一家店的购物袋', "Another shop's bag")
            }}
          </p>
          <p
            class="mt-1 min-w-0 break-words text-base font-black text-white [overflow-wrap:anywhere]"
            data-testid="food-delivery-cart-owner-names"
          >
            {{ cartOwnershipRestaurantNames }}
          </p>
          <p class="mt-2 text-xs font-semibold leading-5 text-slate-300">
            {{
              cartOwnershipState === 'mixed'
                ? t(
                    `恢复的购物袋包含多个店铺，共 ${foodDeliveryStore.cartQuantity} 份餐品。${activeStoreDisplayName} 不会把这些餐品或合计冒充为本店购物袋，也不会结算。请浏览本店并通过替换确认恢复为单店购物袋。`,
                    `This restored bag contains multiple shops and ${foodDeliveryStore.cartQuantity} item(s). ${activeStoreDisplayName} will not present its items or total as this shop's bag and will not check it out. Browse this shop and confirm replacement to recover a single-shop bag.`,
                  )
                : t(
                    `袋中有 ${foodDeliveryStore.cartQuantity} 份餐品，合计 ${foodDeliveryStore.cartPrimaryTotal.amount} ${foodDeliveryStore.cartPrimaryTotal.currency}。${activeStoreDisplayName} 不会展示或结算这些餐品。`,
                    `${foodDeliveryStore.cartQuantity} item(s), ${foodDeliveryStore.cartPrimaryTotal.amount} ${foodDeliveryStore.cartPrimaryTotal.currency} total. ${activeStoreDisplayName} will not show or check out these items.`,
                  )
            }}
          </p>
          <div
            class="mt-3 grid min-w-0 gap-2"
            :class="foreignCartRestaurant ? 'sm:grid-cols-2' : ''"
          >
            <button
              v-if="foreignCartRestaurant"
              type="button"
              class="min-h-11 min-w-0 whitespace-normal rounded-xl bg-white px-3 py-2.5 text-xs font-black text-slate-950 [overflow-wrap:anywhere]"
              data-testid="food-delivery-open-foreign-cart-shop"
              @click="openForeignCartShop"
            >
              {{ t(`返回 ${foreignCartRestaurant.name}`, `Open ${foreignCartRestaurant.name}`) }}
            </button>
            <button
              type="button"
              class="min-h-11 min-w-0 whitespace-normal rounded-xl bg-white/10 px-3 py-2.5 text-xs font-black text-white [overflow-wrap:anywhere]"
              data-testid="food-delivery-browse-active-store"
              @click="browseActiveStoreFromForeignCart"
            >
              {{ t(`浏览 ${activeStoreDisplayName}`, `Browse ${activeStoreDisplayName}`) }}
            </button>
          </div>
        </div>
        <div v-else-if="activeStoreCartLineItems.length > 0" class="mt-3 space-y-2">
          <article
            v-for="line in activeStoreCartLineItems"
            :key="line.menuItemId"
            class="rounded-2xl p-3"
            :class="
              isDessertWindowStore
                ? 'border border-[var(--peach-cloud-mist)]/40 bg-white/75'
                : isStoreMode
                  ? 'border border-white/[0.06] bg-white/[0.08]'
                  : 'bg-amber-50/70'
            "
            :data-testid="`food-delivery-cart-${line.menuItemId}`"
          >
            <p class="text-xs font-bold">{{ line.menuItem.title }} × {{ line.quantity }}</p>
            <p
              class="mt-1 text-[11px]"
              :class="
                isDessertWindowStore
                  ? 'text-[var(--peach-cloud-iron)]'
                  : isStoreMode
                    ? 'text-orange-100'
                    : 'text-amber-700'
              "
            >
              {{ line.subtotal }} {{ line.currency }}
            </p>
          </article>
          <button
            class="w-full rounded-2xl px-4 py-3 text-sm font-bold"
            :class="
              isDessertWindowStore
                ? 'bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)] shadow-[0_14px_34px_rgba(43,48,58,0.18)]'
                : isStoreMode
                  ? 'bg-[#ff806f] text-white shadow-[0_14px_34px_rgba(255,128,111,0.25)]'
                  : 'bg-gray-950 text-white'
            "
            data-testid="food-delivery-checkout"
            @click="openCheckoutSheet"
          >
            {{ storeCartCtaLabel }}
          </button>
          <p
            class="text-[10px] font-semibold"
            :class="isDessertWindowStore ? 'text-[var(--peach-cloud-iron)]' : 'text-slate-500'"
          >
            {{ t('含配送费', 'Includes delivery') }} {{ activeStoreFeeText }}
          </p>
        </div>
        <p
          v-else
          class="mt-3 rounded-2xl p-3 text-xs leading-5"
          :class="
            isDessertWindowStore
              ? 'bg-[var(--peach-cloud-mist)]/25 text-[var(--peach-cloud-iron)]'
              : isStoreMode
                ? 'bg-white/[0.06] text-slate-300'
                : 'bg-amber-50 text-amber-700'
          "
        >
          {{
            t(
              '选一份喜欢的菜，结算条会在这里亮起。',
              'Choose a dish and the checkout bar will light up here.',
            )
          }}
        </p>
        <p
          v-if="checkoutFeedback"
          class="mt-3 rounded-2xl p-3 text-xs font-semibold"
          :class="
            isDessertWindowStore
              ? 'bg-[var(--peach-cloud-mist)]/25 text-[var(--peach-cloud-iron)]'
              : 'bg-white/[0.06] text-orange-100'
          "
          data-testid="food-delivery-checkout-feedback"
        >
          {{ checkoutFeedback }}
        </p>
      </section>

      <section
        v-if="checkoutSheetOpen && isStoreMode"
        class="fixed inset-0 z-50 flex items-end bg-black/60 p-4 backdrop-blur-sm"
        data-testid="food-delivery-checkout-sheet"
      >
        <article
          class="mx-auto w-full max-w-md rounded-[2rem] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          :class="
            isDessertWindowStore
              ? 'border border-[var(--peach-cloud-mist)] bg-[var(--peach-cloud-canvas)] text-[var(--peach-cloud-ink)]'
              : isQuickServiceStore
                ? 'border border-black/10 bg-[#fff9ec] text-[#201a17]'
                : isJadeTableStore
                  ? '!rounded-sm border border-[#cfc2ad] bg-[#f5efe2] text-[#211e19]'
                  : isLightFoodStore
                    ? '!rounded-lg border border-[#d8ddd5] bg-[#f2f4ef] text-[#1d241f]'
                    : 'border border-white/[0.08] bg-[#11131b] text-white'
          "
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p
                class="text-[11px] font-black"
                :class="
                  isDessertWindowStore
                    ? 'text-[var(--peach-cloud-iron)]'
                    : isQuickServiceStore
                      ? 'text-[#e33d2e]'
                      : isJadeTableStore
                        ? 'text-[#bd4b35]'
                        : isLightFoodStore
                          ? 'text-[#496b4a]'
                          : 'text-[#ffb4a8]'
                "
              >
                {{ activeStoreDisplayName }}
              </p>
              <h3 class="mt-1 text-xl font-black">{{ t('确认本店订单', 'Confirm shop order') }}</h3>
              <p
                class="mt-2 text-xs leading-5"
                :class="
                  isDessertWindowStore
                    ? 'text-[var(--peach-cloud-iron)]'
                    : isQuickServiceStore
                      ? 'text-black/55'
                      : isJadeTableStore
                        ? 'text-[#746c61]'
                        : isLightFoodStore
                          ? 'text-[#6c756e]'
                          : 'text-slate-400'
                "
              >
                {{
                  activeMapHandoff.deliveryAddress ||
                  t('当前 Map 配送地址', 'Current Map delivery address')
                }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              :class="
                isDessertWindowStore
                  ? 'bg-[var(--peach-cloud-mist)]/35 text-[var(--peach-cloud-ink)]'
                  : isQuickServiceStore
                    ? 'bg-[#ffc833] text-[#201a17]'
                    : isJadeTableStore
                      ? '!rounded-sm bg-[#1f4d3a] text-white'
                      : isLightFoodStore
                        ? '!rounded-lg border border-[#d8ddd5] bg-white text-[#1d241f]'
                        : 'bg-white/[0.08] text-slate-200'
              "
              data-testid="food-delivery-checkout-close"
              aria-label="Close checkout"
              @click="closeCheckoutSheet"
            >
              <i class="fas fa-xmark"></i>
            </button>
          </div>

          <div class="mt-4 space-y-2">
            <article
              v-for="line in activeStoreCartLineItems"
              :key="line.menuItemId"
              class="flex items-center justify-between gap-3 rounded-2xl p-3"
              :class="
                isDessertWindowStore
                  ? 'bg-white/75'
                  : isQuickServiceStore
                    ? 'border border-black/10 bg-white'
                    : isJadeTableStore
                      ? '!rounded-sm border border-[#cfc2ad] bg-white/55'
                      : isLightFoodStore
                        ? '!rounded-lg border border-[#d8ddd5] bg-white'
                        : 'bg-white/[0.07]'
              "
              :data-testid="`food-delivery-checkout-line-${line.menuItemId}`"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-bold">{{ line.menuItem.title }}</p>
                <p
                  class="mt-1 text-[11px]"
                  :class="
                    isDessertWindowStore
                      ? 'text-[var(--peach-cloud-iron)]'
                      : isQuickServiceStore
                        ? 'text-black/50'
                        : isJadeTableStore
                          ? 'text-[#746c61]'
                          : isLightFoodStore
                            ? 'text-[#6c756e]'
                            : 'text-slate-400'
                  "
                >
                  x {{ line.quantity }} · {{ line.subtotal }} {{ line.currency }}
                </p>
              </div>
              <span
                class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
                :class="
                  isDessertWindowStore
                    ? 'bg-[var(--peach-cloud-mist)]/55 text-[var(--peach-cloud-ink)]'
                    : isQuickServiceStore
                      ? 'bg-[#ffc833] text-[#201a17]'
                      : isJadeTableStore
                        ? '!rounded-sm bg-[#e9deca] text-[#211e19]'
                        : isLightFoodStore
                          ? '!rounded-lg bg-[#e4eadf] text-[#496b4a]'
                          : 'bg-[#ff806f]/15 text-[#ffb4a8]'
                "
              >
                {{ line.subtotal }} {{ line.currency }}
              </span>
            </article>
          </div>

          <div class="mt-4 grid grid-cols-3 gap-2">
            <div
              class="rounded-2xl p-3"
              :class="
                isDessertWindowStore
                  ? 'bg-white/75'
                  : isQuickServiceStore
                    ? 'bg-white'
                    : isJadeTableStore
                      ? '!rounded-sm border border-[#cfc2ad] bg-white/55'
                      : isLightFoodStore
                        ? '!rounded-lg border border-[#d8ddd5] bg-white'
                        : 'bg-white/[0.06]'
              "
            >
              <p
                class="text-[10px] font-semibold"
                :class="
                  isDessertWindowStore
                    ? 'text-[var(--peach-cloud-iron)]'
                    : isQuickServiceStore
                      ? 'text-black/50'
                      : isJadeTableStore
                        ? 'text-[#746c61]'
                        : isLightFoodStore
                          ? 'text-[#6c756e]'
                          : 'text-slate-400'
                "
              >
                {{ t('预计送达', 'ETA') }}
              </p>
              <p class="mt-1 text-xs font-black">{{ activeStoreEtaText }}</p>
            </div>
            <div
              class="rounded-2xl p-3"
              :class="
                isDessertWindowStore
                  ? 'bg-white/75'
                  : isQuickServiceStore
                    ? 'bg-white'
                    : isJadeTableStore
                      ? '!rounded-sm border border-[#cfc2ad] bg-white/55'
                      : isLightFoodStore
                        ? '!rounded-lg border border-[#d8ddd5] bg-white'
                        : 'bg-white/[0.06]'
              "
            >
              <p
                class="text-[10px] font-semibold"
                :class="
                  isDessertWindowStore
                    ? 'text-[var(--peach-cloud-iron)]'
                    : isQuickServiceStore
                      ? 'text-black/50'
                      : isJadeTableStore
                        ? 'text-[#746c61]'
                        : isLightFoodStore
                          ? 'text-[#6c756e]'
                          : 'text-slate-400'
                "
              >
                {{ t('配送费', 'Fee') }}
              </p>
              <p class="mt-1 text-xs font-black">{{ activeStoreFeeText }}</p>
            </div>
            <div
              class="rounded-2xl p-3"
              :class="
                isDessertWindowStore
                  ? 'bg-[var(--peach-cloud-mist)]/55'
                  : isQuickServiceStore
                    ? 'bg-[#ffc833]'
                    : isJadeTableStore
                      ? '!rounded-sm bg-[#e9deca]'
                      : isLightFoodStore
                        ? '!rounded-lg bg-[#e4eadf]'
                        : 'bg-white/[0.06]'
              "
            >
              <p
                class="text-[10px] font-semibold"
                :class="
                  isDessertWindowStore
                    ? 'text-[var(--peach-cloud-iron)]'
                    : isQuickServiceStore
                      ? 'text-black/50'
                      : isJadeTableStore
                        ? 'text-[#746c61]'
                        : isLightFoodStore
                          ? 'text-[#496b4a]'
                          : 'text-slate-400'
                "
              >
                {{ t('合计', 'Total') }}
              </p>
              <p class="mt-1 text-xs font-black">
                {{ activeStoreCartPrimaryTotal.amount }}
                {{ activeStoreCartPrimaryTotal.currency }}
              </p>
            </div>
          </div>

          <div class="mt-4 flex items-center gap-2">
            <button
              type="button"
              class="h-12 flex-1 rounded-2xl px-4 text-sm font-black"
              :class="
                isDessertWindowStore
                  ? 'bg-[var(--peach-cloud-mist)]/30 text-[var(--peach-cloud-ink)]'
                  : isQuickServiceStore
                    ? 'border border-black/15 bg-white text-[#201a17]'
                    : isJadeTableStore
                      ? '!rounded-sm border border-[#cfc2ad] bg-white/55 text-[#211e19]'
                      : isLightFoodStore
                        ? '!rounded-lg border border-[#d8ddd5] bg-white text-[#1d241f]'
                        : 'bg-white/[0.08] text-slate-200'
              "
              data-testid="food-delivery-checkout-cancel"
              @click="closeCheckoutSheet"
            >
              {{ t('再看看', 'Keep browsing') }}
            </button>
            <button
              type="button"
              class="h-12 flex-[1.4] rounded-2xl px-4 text-sm font-black"
              :class="
                isDessertWindowStore
                  ? 'bg-[var(--peach-cloud-accent)] text-[var(--peach-cloud-ink)] shadow-[0_14px_34px_rgba(43,48,58,0.18)]'
                  : isQuickServiceStore
                    ? 'bg-[#e33d2e] text-white shadow-[0_14px_34px_rgba(227,61,46,0.26)]'
                    : isJadeTableStore
                      ? '!rounded-sm bg-[#bd4b35] text-white shadow-[0_14px_34px_rgba(189,75,53,0.22)]'
                      : isLightFoodStore
                        ? '!rounded-lg bg-[#1d241f] text-white shadow-[0_14px_34px_rgba(29,36,31,0.2)]'
                        : 'bg-[#ff806f] text-white shadow-[0_14px_34px_rgba(255,128,111,0.26)]'
              "
              data-testid="food-delivery-checkout-submit"
              @click="checkoutFoodDelivery"
            >
              {{ t('提交订单', 'Place order') }}
            </button>
          </div>
        </article>
      </section>

      <details
        v-if="hasStoreSupportContent && !isDedicatedStoreApp"
        class="food-delivery-support-stack"
        :class="
          isStoreMode
            ? isDessertWindowStore
              ? 'mb-24 rounded-3xl border border-[var(--peach-cloud-mist)] bg-[var(--peach-cloud-canvas)] p-3 text-[var(--peach-cloud-ink)]'
              : 'rounded-3xl border border-slate-800 bg-[#11131b] p-3 text-white'
            : 'contents'
        "
        data-testid="food-delivery-store-support-drawer"
      >
        <summary
          v-if="isStoreMode"
          class="flex min-h-11 min-w-0 scroll-mb-24 cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-[#ff806f] focus-visible:ring-offset-2 focus-visible:ring-offset-[#11131b]"
          :class="
            isDessertWindowStore
              ? 'bg-[var(--peach-cloud-mist)]/35 text-[var(--peach-cloud-ink)]'
              : 'bg-white/[0.06] text-white'
          "
          data-testid="food-delivery-store-support-summary"
        >
          <span>{{ t('Order & delivery', 'Order & delivery') }}</span>
          <span
            class="min-w-0 break-words text-[11px] font-semibold [overflow-wrap:anywhere]"
            :class="isDessertWindowStore ? 'text-[var(--peach-cloud-iron)]' : 'text-slate-400'"
          >
            {{ recentOrders.length }} {{ t('orders', 'orders') }} ·
            {{ activeMapHandoff.etaMinutes }} min
          </span>
        </summary>
        <div class="space-y-4" :class="isStoreMode ? 'mt-3' : ''">
          <section
            class="min-w-0 rounded-3xl border border-lime-100 bg-white p-4 text-gray-950"
            data-testid="food-delivery-map-handoff"
          >
            <div class="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <p class="break-words text-sm font-bold [overflow-wrap:anywhere]">
                  {{ t('配送详情', 'Delivery details') }}
                </p>
                <p
                  class="mt-1 break-words text-xs leading-5 text-gray-500 [overflow-wrap:anywhere]"
                >
                  {{
                    t(
                      '查看当前路线、送达地址、距离和预计送达时间。',
                      'Review the current route, delivery address, distance, and estimated arrival.',
                    )
                  }}
                </p>
              </div>
              <span
                class="rounded-full bg-lime-50 px-3 py-1 text-[11px] font-semibold text-lime-700"
              >
                {{ activeMapHandoff.etaMinutes }} min
              </span>
            </div>
            <div class="mt-3 grid gap-2 text-xs">
              <p
                class="min-w-0 break-words rounded-2xl bg-lime-50/80 p-3 leading-5 text-lime-800 [overflow-wrap:anywhere]"
                data-testid="food-delivery-map-handoff-route"
              >
                {{ activeMapHandoffRouteSummary }}
              </p>
              <div class="grid min-w-0 gap-2 sm:grid-cols-2">
                <div
                  class="min-w-0 rounded-2xl bg-gray-50 p-3"
                  data-testid="food-delivery-map-handoff-address"
                >
                  <p class="font-semibold text-gray-900">{{ t('配送地址', 'Delivery address') }}</p>
                  <p
                    class="mt-1 break-words text-[11px] leading-4 text-gray-500 [overflow-wrap:anywhere]"
                  >
                    {{ activeMapHandoff.deliveryAddress || t('未设置', 'Not set') }}
                  </p>
                </div>
                <div
                  class="min-w-0 rounded-2xl bg-gray-50 p-3"
                  data-testid="food-delivery-map-handoff-distance"
                >
                  <p class="font-semibold text-gray-900">{{ t('预计距离', 'Distance') }}</p>
                  <p class="mt-1 text-[11px] text-gray-500">
                    {{ activeMapHandoff.distanceKm }} km · {{ activeMapHandoff.etaMinutes }} min
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            class="min-w-0 rounded-3xl border border-gray-100 bg-white p-4 text-gray-950"
            data-testid="food-delivery-orders-panel"
          >
            <p class="text-sm font-bold">{{ t('本店订单', 'Shop orders') }}</p>
            <p
              v-if="eventFeedback"
              class="mt-2 break-words rounded-2xl border border-orange-100 bg-orange-50 px-3 py-2 text-[11px] font-semibold leading-5 text-orange-700 [overflow-wrap:anywhere]"
              data-testid="food-delivery-event-feedback"
              aria-live="polite"
            >
              {{ eventFeedback }}
            </p>
            <div v-if="recentOrders.length > 0" class="mt-3 space-y-2">
              <article
                v-for="order in recentOrders"
                :key="order.id"
                class="min-w-0 rounded-2xl p-3"
                :class="
                  isHighlightedOrder(order.id)
                    ? 'border-2 border-orange-300 bg-orange-50 shadow-sm'
                    : 'bg-gray-50'
                "
                :data-testid="`food-delivery-order-${order.id}`"
              >
                <div class="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="break-words text-xs font-bold [overflow-wrap:anywhere]">
                      {{ order.restaurantName }}
                    </p>
                    <p class="mt-1 break-words text-[11px] text-gray-500 [overflow-wrap:anywhere]">
                      {{ order.itemCount }} {{ t('份', 'item(s)') }} · {{ order.status }}
                    </p>
                    <p
                      v-if="foodOrderItemSummary(order)"
                      class="mt-1 break-words text-[11px] leading-4 text-gray-600 [overflow-wrap:anywhere]"
                      :data-testid="`food-delivery-order-items-${order.id}`"
                    >
                      {{ foodOrderItemSummary(order) }}
                    </p>
                  </div>
                  <span
                    class="max-w-full break-words rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-gray-700 [overflow-wrap:anywhere]"
                  >
                    {{ order.totalCents / 100 }} {{ order.currency }}
                  </span>
                </div>
                <div class="mt-2 flex min-w-0 flex-wrap gap-2">
                  <button
                    type="button"
                    class="inline-flex min-h-11 min-w-0 items-center justify-center whitespace-normal rounded-2xl border border-orange-200 bg-white px-3 py-2 text-center text-[11px] font-semibold leading-4 text-orange-700 shadow-sm outline-none transition hover:border-orange-300 hover:bg-orange-50 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 motion-reduce:transition-none [overflow-wrap:anywhere]"
                    :data-testid="`food-delivery-trigger-event-${order.id}`"
                    @click="triggerOrderSurpriseEvent(order)"
                  >
                    {{ t('查看配送更新', 'Check for update') }}
                  </button>
                  <button
                    v-if="
                      order.status !== FOOD_DELIVERY_ORDER_STATUS.DELIVERED &&
                      order.status !== FOOD_DELIVERY_ORDER_STATUS.CANCELLED
                    "
                    type="button"
                    class="inline-flex min-h-11 min-w-0 items-center justify-center whitespace-normal rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-center text-[11px] font-semibold leading-4 text-emerald-700 shadow-sm outline-none transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 motion-reduce:transition-none [overflow-wrap:anywhere]"
                    :data-testid="`food-delivery-mark-delivered-${order.id}`"
                    @click="markFoodOrderDelivered(order.id)"
                  >
                    {{ t('确认已送达', 'Confirm delivery') }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex min-h-11 min-w-0 items-center justify-center whitespace-normal rounded-2xl border border-rose-200 bg-white px-3 py-2 text-center text-[11px] font-semibold leading-4 text-rose-600 shadow-sm outline-none transition hover:border-rose-300 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 motion-reduce:transition-none [overflow-wrap:anywhere]"
                    :data-testid="`food-delivery-delete-order-${order.id}`"
                    @click="removeFoodOrder(order.id)"
                  >
                    {{ t('从记录中移除', 'Remove from history') }}
                  </button>
                </div>
                <div v-if="orderEventRows(order).length > 0" class="mt-2 space-y-1.5">
                  <article
                    v-for="event in orderEventRows(order)"
                    :key="event.id"
                    class="min-w-0 rounded-xl border border-orange-100 bg-white px-2.5 py-2 text-[11px]"
                    :data-testid="`food-delivery-order-event-${order.id}-${event.id}`"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="font-semibold text-orange-900">{{ event.typeLabel }}</p>
                        <p
                          class="mt-1 break-words leading-4 text-orange-700 [overflow-wrap:anywhere]"
                        >
                          {{ event.detail }}
                        </p>
                      </div>
                      <span
                        class="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 font-semibold text-orange-600"
                      >
                        {{ event.timeLabel }}
                      </span>
                    </div>
                    <aside
                      v-if="event.mapHandoff"
                      class="mt-2 min-w-0 rounded-2xl border border-lime-100 bg-lime-50/70 p-3 text-[11px]"
                      :data-testid="`food-delivery-event-map-context-${order.id}-${event.id}`"
                    >
                      <div
                        :data-testid="`food-delivery-event-map-context-${order.id}-${event.id}-boundary`"
                      >
                        <p class="font-bold text-lime-900">{{ t('配送路线', 'Delivery route') }}</p>
                        <p
                          class="mt-1 break-words leading-4 text-lime-700 [overflow-wrap:anywhere]"
                          :data-testid="`food-delivery-event-map-context-${order.id}-${event.id}-route`"
                        >
                          {{ deliveryMapRouteSummary(event.mapHandoff) }}
                        </p>
                        <div class="mt-2 grid min-w-0 gap-2 sm:grid-cols-3">
                          <div
                            v-if="deliveryMapPickup(event.mapHandoff)"
                            class="min-w-0 rounded-xl bg-white/80 px-2.5 py-2"
                            :data-testid="`food-delivery-event-map-context-${order.id}-${event.id}-pickup`"
                          >
                            <p class="font-semibold text-lime-800">{{ t('取餐点', 'Pickup') }}</p>
                            <p class="mt-0.5 break-words text-lime-700 [overflow-wrap:anywhere]">
                              {{ deliveryMapPickup(event.mapHandoff) }}
                            </p>
                          </div>
                          <div
                            class="min-w-0 rounded-xl bg-white/80 px-2.5 py-2"
                            :data-testid="
                              event.mapHandoff.dropoffPoint ||
                              event.mapHandoff.currentLocationDetail
                                ? `food-delivery-event-map-context-${order.id}-${event.id}-dropoff`
                                : undefined
                            "
                          >
                            <p class="font-semibold text-lime-800">
                              {{ t('配送地址', 'Delivery address') }}
                            </p>
                            <p class="mt-0.5 break-words text-lime-700 [overflow-wrap:anywhere]">
                              {{ deliveryMapAddress(event.mapHandoff) || t('未设置', 'Not set') }}
                            </p>
                          </div>
                          <div class="min-w-0 rounded-xl bg-white/80 px-2.5 py-2">
                            <p class="font-semibold text-lime-800">{{ t('预计送达', 'ETA') }}</p>
                            <p class="mt-0.5 break-words text-lime-700 [overflow-wrap:anywhere]">
                              {{ deliveryMapEtaLabel(event.mapHandoff) }}
                            </p>
                          </div>
                        </div>
                        <p
                          v-if="deliveryMapMetaLine(event.mapHandoff)"
                          class="mt-2 break-words text-[10px] font-semibold leading-4 text-lime-700 [overflow-wrap:anywhere]"
                          :data-testid="`food-delivery-event-map-context-${order.id}-${event.id}-meta`"
                        >
                          {{ deliveryMapMetaLine(event.mapHandoff) }}
                        </p>
                      </div>
                    </aside>
                  </article>
                </div>
              </article>
            </div>
            <p v-else class="mt-3 rounded-2xl bg-gray-50 p-3 text-xs leading-5 text-gray-500">
              {{ t('本店还没有订单。', 'No shop orders yet.') }}
            </p>
          </section>

          <section
            class="min-w-0 rounded-3xl border border-emerald-100 bg-white p-4 text-gray-950"
            data-testid="food-delivery-wallet-suggestions"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="break-words text-sm font-bold [overflow-wrap:anywhere]">
                  {{ t('保存到 Wallet', 'Save to Wallet') }}
                </p>
                <p
                  class="mt-1 break-words text-xs leading-5 text-gray-500 [overflow-wrap:anywhere]"
                >
                  {{
                    t(
                      '只有已送达订单可以记录为支出；在你选择“记录”前，不会保存到 Wallet。',
                      'Only delivered orders can be recorded as expenses. Nothing is saved to Wallet until you choose Record.',
                    )
                  }}
                </p>
              </div>
              <span
                class="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700"
              >
                {{ walletExpenseSuggestions.length }}
              </span>
            </div>
            <div
              v-if="walletExpenseSuggestions.length === 0"
              class="mt-3 rounded-2xl bg-gray-50 p-3 text-center text-xs text-gray-500"
            >
              {{
                t(
                  '暂无可写入 Wallet 的已送达外卖订单。',
                  'No delivered food orders are ready for Wallet yet.',
                )
              }}
            </div>
            <div v-else class="mt-3 space-y-2">
              <article
                v-for="suggestion in walletExpenseSuggestions"
                :key="suggestion.orderId"
                class="min-w-0 rounded-2xl border border-emerald-50 bg-emerald-50/50 p-3"
                :data-testid="`food-delivery-wallet-suggestion-${suggestion.orderId}`"
              >
                <div class="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div class="min-w-0">
                    <p class="break-words text-xs font-bold text-gray-900 [overflow-wrap:anywhere]">
                      {{ suggestion.restaurantName }}
                    </p>
                    <p class="mt-1 break-words text-[11px] text-gray-500 [overflow-wrap:anywhere]">
                      {{ suggestion.itemCount }} {{ t('份', 'item(s)') }} / {{ suggestion.amount }}
                      {{ suggestion.currency }}
                    </p>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <select
                        v-model="sharedMealTargets[suggestion.orderId]"
                        class="min-h-11 min-w-0 max-w-full rounded-xl border border-emerald-100 bg-white px-2 py-2 text-[11px] text-gray-600 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                        :aria-label="t('选择共享用餐联系人', 'Choose shared-meal contact')"
                        :data-testid="`food-delivery-shared-meal-contact-${suggestion.orderId}`"
                      >
                        <option value="">
                          {{ t('No shared-meal target', 'No shared-meal target') }}
                        </option>
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
                        class="min-w-0 break-words text-[11px] font-semibold [overflow-wrap:anywhere]"
                        :class="
                          suggestion.relationshipImported ? 'text-emerald-600' : 'text-amber-600'
                        "
                        :data-testid="`food-delivery-relationship-suggestion-${suggestion.orderId}`"
                      >
                        {{
                          suggestion.relationshipImported
                            ? t(
                                `已为 ${suggestion.relationshipTargetName} 保存共享用餐记录。`,
                                `Shared meal saved for ${suggestion.relationshipTargetName}.`,
                              )
                            : t(
                                `记录支出时会关联与 ${suggestion.relationshipTargetName} 的共享用餐。`,
                                `The shared meal with ${suggestion.relationshipTargetName} will be linked when you record this expense.`,
                              )
                        }}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="inline-flex min-h-11 min-w-0 max-w-full items-center justify-center whitespace-normal rounded-2xl px-3 py-2 text-center text-[11px] font-semibold leading-4 outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 motion-reduce:transition-none [overflow-wrap:anywhere]"
                    :class="
                      suggestion.imported
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-emerald-600 text-white'
                    "
                    :disabled="suggestion.imported"
                    :data-testid="`food-delivery-transfer-wallet-${suggestion.orderId}`"
                    @click="transferFoodSuggestionToWallet(suggestion)"
                  >
                    {{ suggestion.imported ? t('已记录', 'Recorded') : t('记录', 'Record') }}
                  </button>
                </div>
              </article>
            </div>
          </section>
        </div>
      </details>
    </div>
  </div>
</template>
