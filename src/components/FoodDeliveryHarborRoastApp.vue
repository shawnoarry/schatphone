<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import { resolveFoodDeliveryAssetUrl } from '../lib/food-shop-presentation'

const props = defineProps({
  restaurant: { type: Object, required: true },
  displayName: { type: String, default: 'Harbor Roast' },
  shortDescription: { type: String, default: '' },
  menuItems: { type: Array, default: () => [] },
  activeItem: { type: Object, default: null },
  merchandiseItems: { type: Array, default: () => [] },
  activeMerchandise: { type: Object, default: null },
  beanStampBalance: { type: Number, default: 0 },
  cartLines: { type: Array, default: () => [] },
  cartQuantity: { type: Number, default: 0 },
  cartTotal: { type: Object, default: () => ({ amount: '0.00', currency: 'CNY' }) },
  orders: { type: Array, default: () => [] },
  activeOrder: { type: Object, default: null },
  page: { type: String, default: 'home' },
  etaText: { type: String, default: '' },
  feeText: { type: String, default: '' },
  distanceText: { type: String, default: '' },
  deliveryAddress: { type: String, default: '' },
})

const emit = defineEmits([
  'go-home',
  'navigate',
  'open-item',
  'open-merchandise',
  'add-item',
  'add-merchandise',
  'redeem-merchandise',
  'update-cart',
  'checkout',
])

const { t } = useI18n()
const activeSlide = ref(0)
const activeSection = ref('espresso_classics')
const searchQuery = ref('')
const detailQuantity = ref(1)
const detailTemperature = ref('hot')
const detailSize = ref('harbor')
const detailPackaging = ref('standard')
const checkoutOpen = ref(false)
const fulfillmentMode = ref('pickup')
const pickupMode = ref('takeout')
const supplyFilter = ref('all')
const merchandiseFeedback = ref('')
let carouselTimer = null

const harborAssetUrl = (path = '') =>
  resolveFoodDeliveryAssetUrl(
    `/images/ui-assets/apps/food-delivery/harbor-roast/${String(path).replace(/^\/+/, '')}`,
  )

const harborBrandAssets = Object.freeze({
  appIcon: harborAssetUrl('brand/harbor-roast-app-icon-01.png'),
  captain: harborAssetUrl('brand/harbor-roast-captain-mascot-01.png'),
  emptyBag: harborAssetUrl('states/harbor-roast-empty-bag-01.png'),
  emptyOrders: harborAssetUrl('states/harbor-roast-empty-orders-01.png'),
  supplyHero: harborAssetUrl('merchandise/harbor-roast-supply-hero-01.png'),
  standardPaperCup: harborAssetUrl('packaging/harbor-roast-paper-cup-standard-01.png'),
  pompompurinPaperCup: harborAssetUrl('packaging/harbor-roast-pompompurin-paper-cup-01.png'),
  pompompurinSleeve: harborAssetUrl('packaging/harbor-roast-pompompurin-sleeve-01.png'),
  pompompurinCarrier: harborAssetUrl('packaging/harbor-roast-pompompurin-carrier-01.png'),
})

const HARBOR_COLLABORATION_ITEM_ID = 'food_menu_harbor_pompompurin_dockside_set'
const HARBOR_BAKE_ITEM_IDS = new Set([
  'food_menu_harbor_copper_sugar_scone',
  'food_menu_harbor_almond_butter_croissant',
])

const sectionOptions = Object.freeze([
  { key: 'espresso_classics', zh: '经典意式', en: 'Espresso', icon: 'fas fa-mug-hot' },
  { key: 'harbor_signatures', zh: '港湾特调', en: 'Signatures', icon: 'fas fa-anchor' },
  { key: 'cold_blended', zh: '冷萃冰饮', en: 'Cold bar', icon: 'fas fa-snowflake' },
  { key: 'tea_counter_bakes', zh: '茶与烘焙', en: 'Tea & bakes', icon: 'fas fa-cookie-bite' },
  { key: 'harbor_collaboration', zh: '联名限定', en: 'Collaboration', icon: 'fas fa-star' },
])

const campaigns = computed(() => [
  {
    key: 'member',
    page: 'member',
    eyebrow: t('HARBOR CLUB 新会员礼', 'HARBOR CLUB WELCOME'),
    title: t('第一杯，从港湾出发', 'Your first cup sets sail'),
    desc: t(
      '新会员首杯半价，再送 2 枚咖啡豆章。',
      'Half price on your first cup, plus two bean stamps.',
    ),
    cta: t('领取会员礼', 'Claim member offer'),
    className: 'is-member',
    carouselImage: harborAssetUrl('campaigns/harbor-roast-carousel-member-01.png'),
    posterImage: harborAssetUrl('campaigns/harbor-roast-member-poster-01.png'),
  },
  {
    key: 'new',
    page: 'new',
    eyebrow: t('COPPER COAST 限时风味', 'COPPER COAST LIMITED'),
    title: t('海盐焦糖季，靠岸了', 'Sea-salt caramel has docked'),
    desc: t(
      '焦糖、海盐与深烘浓缩，三款限定风味现已上线。',
      'Caramel, sea salt, and dark espresso in three seasonal pours.',
    ),
    cta: t('探索限定新品', 'Explore the new drop'),
    className: 'is-new',
    carouselImage: harborAssetUrl('campaigns/harbor-roast-carousel-new-01.png'),
    posterImage: harborAssetUrl('campaigns/harbor-roast-new-poster-01.png'),
  },
  {
    key: 'passport',
    page: 'passport',
    eyebrow: t('ROAST PASSPORT 烘焙护照', 'ROAST PASSPORT'),
    title: t('喝满六杯，带走船长杯', 'Six cups unlock the Captain mug'),
    desc: t(
      '每一杯都是一座港口，集章换限定周边。',
      'Every cup is a port. Collect stamps for limited merch.',
    ),
    cta: t('查看集章进度', 'View stamp journey'),
    className: 'is-passport',
    carouselImage: harborAssetUrl('campaigns/harbor-roast-carousel-passport-01.png'),
    posterImage: harborAssetUrl('campaigns/harbor-roast-passport-poster-01.png'),
  },
  {
    key: 'pompompurin',
    page: 'pompompurin',
    eyebrow: t('POMPOMPURIN 联名靠岸', 'POMPOMPURIN HAS DOCKED'),
    title: t('布丁狗港湾布蕾季', 'A custard-soft Harbor season'),
    desc: t(
      '焦糖布蕾拿铁与酥香蛋挞，限时换上布丁狗联名纸杯，套餐另含收藏杯套与手提杯托。',
      'Custard latte and a golden tart arrive in a limited Pompompurin cup, with a keepsake sleeve and carrier in the set.',
    ),
    cta: t('进入联名活动页', 'Enter the collaboration'),
    className: 'is-pompompurin',
    carouselImage: harborAssetUrl('campaigns/harbor-roast-carousel-pompompurin-01.png'),
    posterImage: harborAssetUrl('campaigns/harbor-roast-pompompurin-poster-01.png'),
  },
])

const menuSections = computed(() =>
  sectionOptions
    .map((section) => ({
      ...section,
      label: t(section.zh, section.en),
      items: props.menuItems.filter((item) => item.menuSection === section.key),
    }))
    .filter((section) => section.items.length),
)

const normalizedSearch = computed(() => searchQuery.value.trim().toLocaleLowerCase())
const visibleMenuItems = computed(() => {
  const base = normalizedSearch.value
    ? props.menuItems
    : props.menuItems.filter((item) => item.menuSection === activeSection.value)
  if (!normalizedSearch.value) return base
  return base.filter((item) =>
    [item.title, item.desc, item.ingredients]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase().includes(normalizedSearch.value)),
  )
})

const signatureItems = computed(() =>
  props.menuItems.filter((item) => item.menuSection === 'harbor_signatures').slice(0, 3),
)
const collaborationItem = computed(
  () => props.menuItems.find((item) => item.id === HARBOR_COLLABORATION_ITEM_ID) || null,
)
const activeCampaign = computed(
  () => campaigns.value.find((campaign) => campaign.page === props.page) || campaigns.value[0],
)
const isBakeItem = (item = {}) => HARBOR_BAKE_ITEM_IDS.has(item?.id)
const isCollaborationItem = (item = {}) => item?.id === HARBOR_COLLABORATION_ITEM_ID
const menuItemTitle = (item = {}) =>
  isCollaborationItem(item)
    ? t('布丁狗港湾布蕾套餐', 'Pompompurin Dockside Custard Set')
    : item.title || ''
const lineTitle = (line = {}) =>
  line.lineKind === 'merchandise'
    ? merchandiseTitle(line.merchandise || {})
    : menuItemTitle(line.menuItem || {}) || line.menuItemId || ''
const menuItemDescription = (item = {}) =>
  isCollaborationItem(item)
    ? t(
        '焦糖布蕾拿铁搭配酥香蛋挞，含布丁狗联名纸杯、收藏杯套与手提杯托。',
        'Caramel custard latte and tart with a Pompompurin cup, keepsake sleeve, and handled carrier.',
      )
    : item.desc || ''
const temperatureChoices = computed(() => {
  if (!props.activeItem || isBakeItem(props.activeItem)) return []
  const choices = [
    { key: 'hot', zh: '热饮', en: 'Hot', icon: 'fas fa-mug-hot' },
    { key: 'iced', zh: '冰饮', en: 'Iced', icon: 'fas fa-snowflake' },
  ]
  if (
    props.activeItem.menuSection === 'cold_blended' ||
    props.activeItem.id === 'food_menu_harbor_apricot_earl_grey'
  ) {
    return choices.filter((choice) => choice.key === 'iced')
  }
  return choices
})
const sizeChoices = computed(() => {
  if (!props.activeItem || isBakeItem(props.activeItem)) return []
  if (isCollaborationItem(props.activeItem)) {
    return [{ key: 'harbor', zh: '港湾杯 12oz', en: 'Harbor 12oz', deltaCents: 0 }]
  }
  return [
    { key: 'short', zh: '短杯 8oz', en: 'Short 8oz', deltaCents: -200 },
    { key: 'harbor', zh: '港湾杯 12oz', en: 'Harbor 12oz', deltaCents: 0 },
    { key: 'long', zh: '长杯 16oz', en: 'Long 16oz', deltaCents: 400 },
  ]
})
const packagingChoices = computed(() => {
  if (!props.activeItem || isBakeItem(props.activeItem)) return []
  if (isCollaborationItem(props.activeItem)) {
    return [
      {
        key: 'pompompurin_set',
        zh: '联名纸杯、杯套与手提杯托',
        en: 'Collaboration cup, sleeve + carrier',
        deltaCents: 0,
        image: harborBrandAssets.pompompurinPaperCup,
        asset: 'harbor-roast/packaging/harbor-roast-pompompurin-paper-cup-01.png',
        descZh: '套餐已含完整联名包装',
        descEn: 'The complete collaboration packaging is included',
      },
    ]
  }
  return [
    {
      key: 'standard',
      zh: 'Harbor 经典纸杯',
      en: 'Harbor classic paper cup',
      deltaCents: 0,
      image: harborBrandAssets.standardPaperCup,
      asset: 'harbor-roast/packaging/harbor-roast-paper-cup-standard-01.png',
      descZh: '奶油白杯身与铜锚标记',
      descEn: 'Cream paper with the copper anchor',
    },
    {
      key: 'pompompurin_cup',
      zh: '布丁狗联名纸杯',
      en: 'Pompompurin collaboration cup',
      deltaCents: 300,
      image: harborBrandAssets.pompompurinPaperCup,
      asset: 'harbor-roast/packaging/harbor-roast-pompompurin-paper-cup-01.png',
      descZh: '整杯限定印花，不是杯套',
      descEn: 'A full printed cup, not a sleeve',
    },
    {
      key: 'pompompurin_sleeve',
      zh: '联名纸杯 + 收藏杯套',
      en: 'Collaboration cup + keepsake sleeve',
      deltaCents: 500,
      image: harborBrandAssets.pompompurinSleeve,
      asset: 'harbor-roast/packaging/harbor-roast-pompompurin-sleeve-01.png',
      descZh: '联名杯与可拆杯套一起带走',
      descEn: 'Take home the printed cup and removable sleeve',
    },
  ]
})
const activeSizeChoice = computed(
  () => sizeChoices.value.find((choice) => choice.key === detailSize.value) || sizeChoices.value[0],
)
const activePackagingChoice = computed(
  () =>
    packagingChoices.value.find((choice) => choice.key === detailPackaging.value) ||
    packagingChoices.value[0],
)
const activeTemperatureChoice = computed(
  () =>
    temperatureChoices.value.find((choice) => choice.key === detailTemperature.value) ||
    temperatureChoices.value[0],
)
const detailUnitPriceCents = computed(() =>
  Math.max(
    100,
    Number(props.activeItem?.priceCents || 0) +
      Number(activeSizeChoice.value?.deltaCents || 0) +
      Number(activePackagingChoice.value?.deltaCents || 0),
  ),
)
const detailTotal = computed(() => {
  const price = detailUnitPriceCents.value * detailQuantity.value
  return `${(price / 100).toFixed(2)} ${props.activeItem?.currency || props.restaurant.currency || 'CNY'}`
})
const detailSelection = computed(() => ({
  temperature: activeTemperatureChoice.value?.key || '',
  temperatureLabelZh: activeTemperatureChoice.value?.zh || '',
  temperatureLabelEn: activeTemperatureChoice.value?.en || '',
  size: activeSizeChoice.value?.key || '',
  sizeLabelZh: activeSizeChoice.value?.zh || '',
  sizeLabelEn: activeSizeChoice.value?.en || '',
  packaging: activePackagingChoice.value?.key || '',
  packagingLabelZh: activePackagingChoice.value?.zh || '',
  packagingLabelEn: activePackagingChoice.value?.en || '',
}))
const detailSelectionKey = computed(() =>
  [
    detailSelection.value.temperature || 'none',
    detailSelection.value.size || 'none',
    detailSelection.value.packaging || 'none',
  ].join('_'),
)
const activeNavKey = computed(() => {
  if (['member', 'new', 'passport', 'pompompurin', 'supply', 'supply-detail'].includes(props.page))
    return 'home'
  if (props.page === 'detail') return 'menu'
  if (props.page === 'order') return 'orders'
  return props.page
})
const backTarget = computed(() => {
  if (props.page === 'detail') return 'menu'
  if (props.page === 'supply-detail') return 'supply'
  if (props.page === 'order') return 'orders'
  return 'home'
})
const isPickup = computed(() => fulfillmentMode.value === 'pickup')
const checkoutFee = computed(() =>
  isPickup.value ? t('免配送费', 'No delivery fee') : props.feeText,
)
const itemsSubtotalCents = computed(() =>
  props.cartLines.reduce((sum, line) => sum + Math.round(Number(line.subtotal || 0) * 100), 0),
)
const itemsSubtotal = computed(() => (itemsSubtotalCents.value / 100).toFixed(2))
const checkoutTotal = computed(() =>
  isPickup.value ? itemsSubtotal.value : props.cartTotal.amount,
)
const supplyFilters = computed(() => [
  { key: 'all', label: t('全部好物', 'All supplies') },
  { key: 'redeem', label: t('豆章兑换', 'Stamp rewards') },
  { key: 'purchase', label: t('周边商店', 'Merch shop') },
])
const visibleMerchandise = computed(() => {
  if (supplyFilter.value === 'redeem') {
    return props.merchandiseItems.filter((item) => item.beanStampCost > 0)
  }
  if (supplyFilter.value === 'purchase') {
    return props.merchandiseItems.filter((item) => item.purchasePriceCents > 0)
  }
  return props.merchandiseItems
})

const imageUrl = (item = {}) =>
  item.image?.sourceType === 'url' ? resolveFoodDeliveryAssetUrl(item.image.url) : ''

const requiredAssetPath = (item = {}) => {
  const url = imageUrl(item)
  const marker = 'images/ui-assets/apps/food-delivery/'
  const markerIndex = url.indexOf(marker)
  return markerIndex >= 0 ? url.slice(markerIndex + marker.length) : ''
}

const hideBrokenImage = (event) => {
  const image = event?.currentTarget
  if (!image) return
  image.hidden = true
  image.parentElement?.classList.add('is-image-fallback')
}

const displayPrice = (item = {}) => `${item.price || '0.00'} ${item.currency || 'CNY'}`
const displayPriceDelta = (deltaCents = 0) => {
  if (!deltaCents) return t('已含', 'Included')
  const sign = deltaCents > 0 ? '+' : '−'
  return `${sign}${(Math.abs(deltaCents) / 100).toFixed(2)} ${props.activeItem?.currency || props.restaurant.currency || 'CNY'}`
}
const selectionSummary = (selection = {}) => {
  const value = selection || {}
  return [
    t(value.temperatureLabelZh || '', value.temperatureLabelEn || ''),
    t(value.sizeLabelZh || '', value.sizeLabelEn || ''),
    t(value.packagingLabelZh || '', value.packagingLabelEn || ''),
  ]
    .filter(Boolean)
    .join(' · ')
}
const merchandiseTitle = (item = {}) => t(item.titleZh || item.title, item.titleEn || item.title)
const merchandiseDescription = (item = {}) => t(item.descZh || '', item.descEn || '')
const merchandiseDetail = (item = {}) => t(item.detailZh || '', item.detailEn || '')
const merchandiseImageUrl = (item = {}) => harborAssetUrl(item.imagePath)
const merchandisePrice = (item = {}) =>
  `${item.purchasePrice || (Number(item.purchasePriceCents || 0) / 100).toFixed(2)} ${
    item.currency || props.restaurant.currency || 'CNY'
  }`

const orderStatus = (order = {}) => {
  const pickup = order.fulfillmentMode === 'pickup'
  const states = {
    placed: { label: t('已接单', 'Order received'), step: 1, icon: 'fas fa-receipt' },
    accepted: { label: t('咖啡师已确认', 'Barista confirmed'), step: 2, icon: 'fas fa-check' },
    cooking: { label: t('正在制作', 'Being crafted'), step: 2, icon: 'fas fa-mug-hot' },
    rider_pickup: {
      label: pickup ? t('可以取餐了', 'Ready for pickup') : t('骑手配送中', 'Out for delivery'),
      step: 3,
      icon: pickup ? 'fas fa-bag-shopping' : 'fas fa-bicycle',
    },
    delivered: {
      label: pickup ? t('已取餐', 'Picked up') : t('已送达', 'Delivered'),
      step: 4,
      icon: 'fas fa-circle-check',
    },
    cancelled: { label: t('订单已取消', 'Cancelled'), step: 0, icon: 'fas fa-circle-xmark' },
  }
  return states[order.status] || states.placed
}

const orderIllustration = (order = {}) => {
  if (order.status === 'cancelled') {
    return harborAssetUrl('orders/harbor-roast-order-cancelled-01.png')
  }
  if (order.status === 'delivered') {
    return harborAssetUrl('orders/harbor-roast-order-completed-01.png')
  }
  if (order.status === 'rider_pickup') {
    return order.fulfillmentMode === 'pickup'
      ? harborAssetUrl('orders/harbor-roast-order-pickup-ready-01.png')
      : harborAssetUrl('orders/harbor-roast-order-delivery-01.png')
  }
  if (order.status === 'cooking') {
    return harborAssetUrl('orders/harbor-roast-order-crafting-01.png')
  }
  return harborAssetUrl('orders/harbor-roast-order-received-01.png')
}

const serviceLabel = (order = {}) => {
  if (order.fulfillmentMode !== 'pickup') return t('外卖配送', 'Delivery')
  return order.pickupMode === 'dine_in' ? t('到店堂食', 'Dine in') : t('到店外带', 'Takeout')
}

const orderTime = (value) => {
  const date = new Date(Number(value) || 0)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const startCarousel = () => {
  stopCarousel()
  if (
    typeof window === 'undefined' ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
    return
  carouselTimer = window.setInterval(() => {
    if (props.page === 'home') activeSlide.value = (activeSlide.value + 1) % campaigns.value.length
  }, 5200)
}

const stopCarousel = () => {
  if (carouselTimer !== null && typeof window !== 'undefined') window.clearInterval(carouselTimer)
  carouselTimer = null
}

const openCampaign = (campaign) => emit('navigate', campaign.page)

const openMenuSection = (key) => {
  activeSection.value = key
  searchQuery.value = ''
  emit('navigate', 'menu')
}

const selectMenuSection = (key) => {
  activeSection.value = key
  searchQuery.value = ''
}

const openDetail = (item) => emit('open-item', item.id)

const openMerchandise = (item) => emit('open-merchandise', item.id)

const purchaseMerchandise = (item) => {
  merchandiseFeedback.value = ''
  emit('add-merchandise', item.id, (result) => {
    merchandiseFeedback.value = result?.ok
      ? t('已加入购物袋，可与饮品一起结算。', 'Added to your bag for checkout with drinks.')
      : t('暂时无法加入购物袋，请稍后再试。', 'This item could not be added. Please retry.')
  })
}

const redeemMerchandise = (item) => {
  merchandiseFeedback.value = ''
  if (!item?.canRedeem) {
    merchandiseFeedback.value = t(
      `还差 ${item?.missingBeanStamps || 0} 枚豆章，暂不能兑换。`,
      `${item?.missingBeanStamps || 0} more stamps required.`,
    )
    return
  }
  emit('redeem-merchandise', item.id, (result) => {
    merchandiseFeedback.value = result?.ok
      ? t('兑换成功，已作为赠品加入购物袋。', 'Redeemed and added to your bag as a gift.')
      : result?.reason === 'insufficient_stamps'
        ? t(
            `还差 ${result.missingBeanStamps} 枚豆章，暂不能兑换。`,
            `${result.missingBeanStamps} more stamps required.`,
          )
        : t('暂时无法兑换，请稍后再试。', 'Redemption is unavailable. Please retry.')
  })
}

const addDetailItem = (event) => {
  if (!props.activeItem?.id) return
  emit('add-item', props.activeItem.id, detailQuantity.value, {
    selectionKey: detailSelectionKey.value,
    selection: detailSelection.value,
    unitPriceCents: detailUnitPriceCents.value,
    trigger: event?.currentTarget || null,
  })
}

const addCollaborationSet = () => {
  if (!collaborationItem.value) return
  emit('add-item', collaborationItem.value.id, 1, {
    selectionKey: 'hot_harbor_pompompurin_set',
    selection: {
      temperature: 'hot',
      temperatureLabelZh: '热饮',
      temperatureLabelEn: 'Hot',
      size: 'harbor',
      sizeLabelZh: '港湾杯 12oz',
      sizeLabelEn: 'Harbor 12oz',
      packaging: 'pompompurin_set',
      packagingLabelZh: '联名纸杯、杯套与手提杯托',
      packagingLabelEn: 'Collaboration cup, sleeve + carrier',
    },
    unitPriceCents: Number(collaborationItem.value.priceCents || 4800),
  })
  emit('navigate', 'bag')
}

const resetDetailOptions = () => {
  detailQuantity.value = 1
  const item = props.activeItem
  detailTemperature.value =
    item?.menuSection === 'cold_blended' || item?.id === 'food_menu_harbor_apricot_earl_grey'
      ? 'iced'
      : 'hot'
  detailSize.value = 'harbor'
  detailPackaging.value = isCollaborationItem(item) ? 'pompompurin_set' : 'standard'
}

const handleBack = () => {
  if (props.page === 'home') emit('go-home')
  else emit('navigate', backTarget.value)
}

const submitCheckout = () => {
  emit('checkout', {
    fulfillmentMode: fulfillmentMode.value,
    pickupMode: isPickup.value ? pickupMode.value : '',
  })
  checkoutOpen.value = false
}

watch(
  () => [props.restaurant.id, props.activeItem?.id, props.activeMerchandise?.id],
  () => {
    resetDetailOptions()
    merchandiseFeedback.value = ''
  },
)

watch(
  () => props.restaurant.id,
  () => {
    activeSlide.value = 0
    activeSection.value = 'espresso_classics'
    searchQuery.value = ''
    checkoutOpen.value = false
    fulfillmentMode.value = 'pickup'
    pickupMode.value = 'takeout'
    supplyFilter.value = 'all'
    merchandiseFeedback.value = ''
  },
)

onMounted(startCarousel)
onBeforeUnmount(stopCarousel)
</script>

<template>
  <section
    class="harbor-app mx-auto min-h-screen w-full max-w-md overflow-x-hidden pb-24"
    data-store-template="harbor_roast_chain"
    data-testid="food-delivery-store-shell"
  >
    <header class="harbor-topbar sticky top-0 z-30 flex h-14 items-center justify-between px-4">
      <button
        type="button"
        class="harbor-icon-button"
        :aria-label="page === 'home' ? t('返回手机主页', 'Return to Home') : t('返回', 'Back')"
        data-testid="food-delivery-store-home"
        @click="handleBack"
      >
        <i :class="page === 'home' ? 'fas fa-chevron-left' : 'fas fa-arrow-left'"></i>
      </button>
      <button
        type="button"
        class="harbor-wordmark min-w-0 text-center"
        :aria-label="t('返回 Harbor Roast 首页', 'Return to Harbor Roast home')"
        @click="emit('navigate', 'home')"
      >
        <span class="block truncate text-sm font-black">HARBOR ROAST</span>
        <span class="block text-[8px] font-bold">COFFEE &amp; ROASTERY · 2018</span>
      </button>
      <button
        type="button"
        class="harbor-icon-button relative"
        :aria-label="t('打开购物袋', 'Open bag')"
        data-testid="food-delivery-harbor-header-bag"
        @click="emit('navigate', 'bag')"
      >
        <i class="fas fa-bag-shopping"></i>
        <span v-if="cartQuantity" class="harbor-badge">{{ cartQuantity }}</span>
      </button>
    </header>

    <template v-if="page === 'home'">
      <main data-testid="food-delivery-harbor-home">
        <section class="harbor-brand-intro flex items-end justify-between gap-4 px-4 pb-4 pt-5">
          <div class="min-w-0">
            <p class="harbor-eyebrow">
              {{ t('今日靠岸 · 新鲜烘焙', 'DOCKED TODAY · ROASTED FRESH') }}
            </p>
            <h1 class="mt-1 text-3xl font-black">{{ displayName }}</h1>
            <p class="mt-1 text-xs font-semibold text-[var(--harbor-muted)]">
              {{ t('把一座港口，装进一杯咖啡。', 'A working harbor, poured into every cup.') }}
            </p>
          </div>
          <img
            class="harbor-mini-mark"
            :src="harborBrandAssets.appIcon"
            alt=""
            data-required-asset="harbor-roast/brand/harbor-roast-app-icon-01.png"
          />
        </section>

        <section class="px-4" data-testid="food-delivery-harbor-carousel">
          <div class="harbor-carousel-viewport">
            <div
              class="harbor-carousel-track"
              :style="{ transform: `translateX(-${activeSlide * 100}%)` }"
            >
              <button
                v-for="campaign in campaigns"
                :key="campaign.key"
                type="button"
                class="harbor-slide relative shrink-0 overflow-hidden text-left"
                :class="campaign.className"
                :data-testid="`food-delivery-harbor-campaign-${campaign.key}`"
                @click="openCampaign(campaign)"
              >
                <img
                  class="harbor-slide-media"
                  :src="campaign.carouselImage"
                  alt=""
                  :data-required-asset="`harbor-roast/campaigns/harbor-roast-carousel-${campaign.key}-01.png`"
                />
                <span class="harbor-slide-copy relative z-10 block max-w-[62%]">
                  <span class="block text-[9px] font-black">{{ campaign.eyebrow }}</span>
                  <span
                    class="harbor-slide-title mt-2 block text-[1.5rem] font-black leading-[1.08]"
                    >{{ campaign.title }}</span
                  >
                  <span class="mt-3 block text-[11px] font-semibold leading-4 opacity-75">{{
                    campaign.desc
                  }}</span>
                  <span class="mt-5 inline-flex items-center gap-2 text-[11px] font-black">
                    {{ campaign.cta }} <i class="fas fa-arrow-right"></i>
                  </span>
                </span>
              </button>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-between">
            <div
              class="flex gap-1.5"
              role="tablist"
              :aria-label="t('活动轮播', 'Campaign carousel')"
            >
              <button
                v-for="(campaign, index) in campaigns"
                :key="campaign.key"
                type="button"
                class="harbor-dot"
                :class="{ 'is-active': index === activeSlide }"
                :aria-label="campaign.title"
                :aria-selected="index === activeSlide"
                @click="activeSlide = index"
              ></button>
            </div>
            <span class="text-[9px] font-black text-[var(--harbor-muted)]">
              0{{ activeSlide + 1 }} / 0{{ campaigns.length }}
            </span>
          </div>
        </section>

        <section class="harbor-service-strip mt-5 grid grid-cols-3 border-y">
          <button type="button" class="harbor-service-cell" @click="emit('navigate', 'menu')">
            <i class="fas fa-bolt"></i>
            <span>{{ t('提前点单', 'Order ahead') }}</span>
          </button>
          <button type="button" class="harbor-service-cell" @click="emit('navigate', 'member')">
            <i class="fas fa-ticket"></i>
            <span>{{ t('会员专享', 'Member perks') }}</span>
          </button>
          <button type="button" class="harbor-service-cell" @click="emit('navigate', 'passport')">
            <i class="fas fa-stamp"></i>
            <span>{{ t('烘焙护照', 'Roast passport') }}</span>
          </button>
        </section>

        <section class="px-4 py-7" data-testid="food-delivery-harbor-featured">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="harbor-eyebrow">{{ t('BARISTA PICKS', 'BARISTA PICKS') }}</p>
              <h2 class="mt-1 text-xl font-black">{{ t('港口热卖', 'Harbor favorites') }}</h2>
            </div>
            <button
              class="harbor-text-link"
              type="button"
              @click="openMenuSection('harbor_signatures')"
            >
              {{ t('全部菜单', 'Full menu') }} <i class="fas fa-chevron-right"></i>
            </button>
          </div>
          <div
            class="harbor-product-row mt-4 flex gap-3 overflow-x-auto pb-3"
            data-testid="food-delivery-harbor-featured-scroller"
          >
            <article
              v-for="item in signatureItems"
              :key="item.id"
              class="harbor-product-card shrink-0"
            >
              <button
                type="button"
                class="harbor-product-image"
                :data-testid="`food-delivery-menu-open-${item.id}`"
                @click="openDetail(item)"
              >
                <span class="harbor-product-fallback" aria-hidden="true">
                  <i class="fas fa-mug-hot"></i>
                  <small>HARBOR</small>
                </span>
                <img
                  v-if="imageUrl(item)"
                  :src="imageUrl(item)"
                  :alt="item.image?.alt || item.title"
                  :data-required-asset="requiredAssetPath(item)"
                  @error="hideBrokenImage"
                />
              </button>
              <p class="mt-3 line-clamp-2 min-h-9 text-sm font-black leading-[1.15]">
                {{ item.title }}
              </p>
              <div class="mt-3 flex items-center justify-between gap-2">
                <span class="text-xs font-black text-[var(--harbor-copper)]">{{
                  displayPrice(item)
                }}</span>
                <button
                  type="button"
                  class="harbor-add-button"
                  :aria-label="t('加入购物袋', 'Add to bag')"
                  :data-testid="`food-delivery-add-${item.id}`"
                  @click="emit('add-item', item.id, 1, $event.currentTarget)"
                >
                  <i class="fas fa-plus"></i>
                </button>
              </div>
            </article>
          </div>
        </section>

        <button
          type="button"
          class="harbor-ip-band mx-4 block overflow-hidden px-4 py-5 text-left"
          data-testid="food-delivery-harbor-supply-entry"
          @click="emit('navigate', 'supply')"
        >
          <div class="relative z-10 max-w-[64%]">
            <p class="harbor-eyebrow text-white/70">CAPTAIN ROAST</p>
            <h2 class="mt-1 text-xl font-black text-white">
              {{ t('船长好物，等你靠岸', 'Captain supplies have docked') }}
            </h2>
            <p class="mt-2 text-[11px] font-semibold leading-4 text-white/70">
              {{
                t(
                  '限定杯具、徽章与联名周边，可使用豆章兑换或直接购买。',
                  'Limited mugs, pins, and collaborations, available with stamps or purchase.',
                )
              }}
            </p>
            <span class="mt-4 inline-flex items-center gap-2 text-xs font-black text-white">
              {{ t('进入补给站', 'Enter supply station') }}
              <i class="fas fa-arrow-right"></i>
            </span>
          </div>
          <img
            class="harbor-captain"
            :src="harborBrandAssets.captain"
            :aria-label="t('Harbor Roast 灯塔咖啡杯形象', 'Harbor Roast lighthouse cup mascot')"
            alt=""
            data-required-asset="harbor-roast/brand/harbor-roast-captain-mascot-01.png"
          />
        </button>

        <section class="px-4 py-7">
          <div class="flex items-end justify-between gap-3">
            <div>
              <p class="harbor-eyebrow">{{ t('ORDER YOUR WAY', 'ORDER YOUR WAY') }}</p>
              <h2 class="mt-1 text-xl font-black">
                {{ t('现在想怎么喝？', 'How are you having it?') }}
              </h2>
            </div>
            <span class="text-[10px] font-bold text-[var(--harbor-muted)]">{{ distanceText }}</span>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <button type="button" class="harbor-mode-teaser" @click="emit('navigate', 'menu')">
              <i class="fas fa-store"></i>
              <span
                ><strong>{{ t('到店取餐', 'Store pickup') }}</strong
                ><small>{{ t('外带或堂食', 'Takeout or dine in') }}</small></span
              >
            </button>
            <button type="button" class="harbor-mode-teaser" @click="emit('navigate', 'menu')">
              <i class="fas fa-motorcycle"></i>
              <span
                ><strong>{{ t('外卖配送', 'Delivery') }}</strong
                ><small>{{ etaText }}</small></span
              >
            </button>
          </div>
        </section>

        <section
          v-if="cartLines.length"
          class="mx-4 mb-6 border-y border-[var(--harbor-copper)]/30 py-5"
          data-testid="food-delivery-cart-panel"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="harbor-eyebrow">YOUR HARBOR BAG</p>
              <h2 class="mt-1 text-xl font-black">{{ t('已选饮品', 'Your selected drinks') }}</h2>
            </div>
            <span class="text-xs font-black text-[var(--harbor-copper)]">
              {{ cartQuantity }} {{ t('件', 'items') }}
            </span>
          </div>
          <div class="mt-4 space-y-2">
            <article
              v-for="line in cartLines"
              :key="line.lineId"
              class="border-b border-black/10 pb-2 text-sm"
              :data-testid="`food-delivery-cart-${line.lineId}`"
            >
              <span class="font-black">{{ lineTitle(line) }}</span>
              <span class="ml-2 text-[var(--harbor-muted)]">× {{ line.quantity }}</span>
            </article>
          </div>
          <button
            type="button"
            class="harbor-primary-button mt-4 w-full"
            data-testid="food-delivery-harbor-open-bag"
            @click="emit('navigate', 'bag')"
          >
            <i class="fas fa-bag-shopping"></i>
            {{ t('查看购物袋', 'Review bag') }}
            <span class="sr-only">{{ t('加入购物袋', 'Add to bag') }}</span>
          </button>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'pompompurin'">
      <main class="harbor-collaboration-page" data-testid="food-delivery-harbor-pompompurin-page">
        <section class="harbor-collaboration-hero">
          <img
            :src="activeCampaign.posterImage"
            alt="Harbor Roast Pompompurin collaboration drinks, custard tart, removable sleeve, and carrier"
            data-required-asset="harbor-roast/campaigns/harbor-roast-pompompurin-poster-01.png"
          />
          <div class="harbor-collaboration-hero-copy">
            <p>POMPOMPURIN × HARBOR ROAST</p>
            <h1>{{ t('布蕾香气，软软靠岸', 'Custard comfort has docked') }}</h1>
            <span>{{ t('限时联名 · 数量有限', 'LIMITED COLLABORATION') }}</span>
          </div>
        </section>

        <section class="harbor-collab-intro px-4 py-7">
          <p class="harbor-eyebrow">DOCKSIDE CUSTARD SEASON</p>
          <h2 class="mt-2 text-3xl font-black leading-none">
            {{ t('把布丁狗的软萌，装进焦糖布蕾', 'A little custard-soft joy in every sip') }}
          </h2>
          <p class="mt-4 text-sm font-semibold leading-6 text-[var(--harbor-muted)]">
            {{
              t(
                '烤糖般的焦香、奶油布蕾的柔滑，再配一只酥脆蛋挞。这个季节，每杯限定饮品都会换上布丁狗联名纸杯。',
                'Toasty caramel, silky custard, and a crisp tart come together for the season. Every limited drink arrives in the Pompompurin collaboration cup.',
              )
            }}
          </p>
          <div class="harbor-collab-notes mt-5 grid grid-cols-3 gap-2">
            <span>{{ t('烤糖焦香', 'TOASTED CARAMEL') }}</span>
            <span>{{ t('奶油布蕾', 'CREAMY CUSTARD') }}</span>
            <span>{{ t('限时包装', 'LIMITED CUP') }}</span>
          </div>
        </section>

        <section class="harbor-collab-collection px-4 pb-7">
          <article class="harbor-collab-feature">
            <img
              :src="harborBrandAssets.pompompurinPaperCup"
              alt="Pompompurin limited-edition printed paper cup"
              data-required-asset="harbor-roast/packaging/harbor-roast-pompompurin-paper-cup-01.png"
            />
            <div>
              <small>LIMITED CUP</small>
              <h3>{{ t('布丁狗联名纸杯', 'Pompompurin collaboration cup') }}</h3>
              <p>
                {{
                  t(
                    '布丁黄与杏桃粉铺满杯身，铜锚与贝雷帽小狗一起靠岸。限定印花直接呈现在纸杯上。',
                    'Custard yellow and apricot pink wrap the cup, with Harbor copper and Pompompurin printed directly onto the paper.',
                  )
                }}
              </p>
            </div>
          </article>
          <div class="mt-3 grid grid-cols-2 gap-3">
            <article class="harbor-collab-extra">
              <img
                :src="harborBrandAssets.pompompurinSleeve"
                alt="Pompompurin removable keepsake sleeve"
                data-required-asset="harbor-roast/packaging/harbor-roast-pompompurin-sleeve-01.png"
              />
              <div>
                <small>KEEPSAKE SLEEVE</small>
                <h3>{{ t('可拆收藏杯套', 'Removable keepsake sleeve') }}</h3>
                <p>
                  {{
                    t(
                      '套餐随杯附赠，单杯也可加购。',
                      'Included with the set or available as an add-on.',
                    )
                  }}
                </p>
              </div>
            </article>
            <article class="harbor-collab-extra">
              <img
                :src="harborBrandAssets.pompompurinCarrier"
                alt="Pompompurin handled carrier for the collaboration set"
                data-required-asset="harbor-roast/packaging/harbor-roast-pompompurin-carrier-01.png"
              />
              <div>
                <small>SET EXCLUSIVE</small>
                <h3>{{ t('联名手提杯托', 'Collaboration carrier') }}</h3>
                <p>{{ t('一手带走饮品与蛋挞。', 'Carries the drink and tart together.') }}</p>
              </div>
            </article>
          </div>
        </section>

        <section v-if="collaborationItem" class="harbor-collab-order px-4 py-7">
          <div class="harbor-collab-order-media">
            <img
              :src="imageUrl(collaborationItem)"
              :alt="menuItemTitle(collaborationItem)"
              data-required-asset="harbor-roast/products/harbor-roast-item-13.png"
              @error="hideBrokenImage"
            />
            <span>{{ t('联名杯 + 杯套 + 杯托', 'CUP + SLEEVE + CARRIER') }}</span>
          </div>
          <p class="harbor-eyebrow mt-5">DOCKSIDE SET · LIMITED</p>
          <h2 class="mt-2 text-3xl font-black leading-none">
            {{ menuItemTitle(collaborationItem) }}
          </h2>
          <p class="mt-3 text-sm font-semibold leading-6 text-[var(--harbor-muted)]">
            {{ menuItemDescription(collaborationItem) }}
          </p>
          <div class="mt-5 flex items-center justify-between border-y py-4">
            <span class="text-xs font-bold text-[var(--harbor-muted)]"
              >12oz · {{ t('冷热可选', 'HOT / ICED') }}</span
            >
            <strong class="text-xl text-[var(--harbor-copper)]">{{
              displayPrice(collaborationItem)
            }}</strong>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              class="harbor-secondary-button"
              data-testid="food-delivery-harbor-collab-customize"
              @click="openDetail(collaborationItem)"
            >
              <i class="fas fa-sliders"></i> {{ t('选择冷热', 'Customize') }}
            </button>
            <button
              type="button"
              class="harbor-primary-button"
              data-testid="food-delivery-harbor-collab-add"
              @click="addCollaborationSet"
            >
              <i class="fas fa-bag-shopping"></i> {{ t('热饮套餐加入袋中', 'Add hot set') }}
            </button>
          </div>
        </section>
      </main>
    </template>

    <template v-else-if="['member', 'new', 'passport'].includes(page)">
      <main class="harbor-campaign-page" :data-testid="`food-delivery-harbor-${page}-page`">
        <section class="harbor-campaign-hero" :class="activeCampaign.className">
          <img
            class="harbor-campaign-poster"
            :src="activeCampaign.posterImage"
            alt=""
            :data-required-asset="`harbor-roast/campaigns/harbor-roast-${activeCampaign.key}-poster-01.png`"
          />
          <div class="harbor-campaign-copy relative z-10 max-w-[72%]">
            <p class="text-[10px] font-black">{{ activeCampaign.eyebrow }}</p>
            <h1 class="mt-3 text-4xl font-black leading-none">{{ activeCampaign.title }}</h1>
            <p class="mt-4 text-sm font-semibold leading-5 opacity-75">{{ activeCampaign.desc }}</p>
          </div>
        </section>

        <section v-if="page === 'member'" class="px-4 py-7">
          <p class="harbor-eyebrow">HARBOR CLUB</p>
          <h2 class="mt-1 text-2xl font-black">
            {{ t('新会员靠岸礼', 'New member docking kit') }}
          </h2>
          <div class="harbor-benefit-list mt-5 border-y">
            <div
              v-for="benefit in [
                [
                  t('首杯半价', 'First cup half price'),
                  t('注册后 7 天内使用', 'Valid for seven days'),
                  'fa-mug-saucer',
                ],
                [
                  t('赠 2 枚豆章', 'Two bean stamps'),
                  t('自动计入烘焙护照', 'Added to Roast Passport'),
                  'fa-stamp',
                ],
                [
                  t('生日双倍豆章', 'Birthday double stamps'),
                  t('会员月专享', 'Member month exclusive'),
                  'fa-cake-candles',
                ],
              ]"
              :key="benefit[0]"
              class="harbor-benefit-row"
            >
              <span class="harbor-benefit-icon"><i :class="`fas ${benefit[2]}`"></i></span>
              <span class="min-w-0"
                ><strong>{{ benefit[0] }}</strong
                ><small>{{ benefit[1] }}</small></span
              >
              <i class="fas fa-check"></i>
            </div>
          </div>
          <button
            type="button"
            class="harbor-primary-button mt-6 w-full"
            @click="emit('navigate', 'menu')"
          >
            <i class="fas fa-ticket"></i> {{ t('领取并去点单', 'Claim and order') }}
          </button>
        </section>

        <section v-else-if="page === 'new'" class="px-4 py-7">
          <p class="harbor-eyebrow">COPPER COAST COLLECTION</p>
          <h2 class="mt-1 text-2xl font-black">
            {{ t('本季三杯靠岸风味', 'Three arrivals this season') }}
          </h2>
          <div class="mt-5 divide-y border-y">
            <article v-for="item in signatureItems" :key="item.id" class="harbor-menu-row">
              <button type="button" class="harbor-row-image" @click="openDetail(item)">
                <span class="harbor-product-fallback"><i class="fas fa-mug-hot"></i></span>
                <img
                  v-if="imageUrl(item)"
                  :src="imageUrl(item)"
                  :alt="item.title"
                  @error="hideBrokenImage"
                />
              </button>
              <button type="button" class="min-w-0 flex-1 text-left" @click="openDetail(item)">
                <strong class="block text-sm">{{ item.title }}</strong>
                <span
                  class="mt-1 line-clamp-2 block text-[11px] leading-4 text-[var(--harbor-muted)]"
                  >{{ item.desc }}</span
                >
                <span class="mt-2 block text-xs font-black text-[var(--harbor-copper)]">{{
                  displayPrice(item)
                }}</span>
              </button>
              <button
                type="button"
                class="harbor-add-button"
                :aria-label="t('加入购物袋', 'Add to bag')"
                @click="emit('add-item', item.id, 1, $event.currentTarget)"
              >
                <i class="fas fa-plus"></i>
              </button>
            </article>
          </div>
        </section>

        <section v-else class="px-4 py-7">
          <p class="harbor-eyebrow">YOUR ROAST PASSPORT</p>
          <div class="flex items-end justify-between gap-4">
            <h2 class="mt-1 text-2xl font-black">
              {{ t('下一站：船长杯', 'Next stop: Captain mug') }}
            </h2>
            <strong class="text-sm text-[var(--harbor-copper)]"
              >{{ Math.min(beanStampBalance, 6) }} / 6</strong
            >
          </div>
          <div class="harbor-stamp-grid mt-5 grid grid-cols-3 gap-3">
            <div
              v-for="index in 6"
              :key="index"
              class="harbor-stamp"
              :class="{ 'is-earned': index <= beanStampBalance }"
            >
              <i :class="index <= beanStampBalance ? 'fas fa-anchor' : 'fas fa-location-dot'"></i>
              <span>{{
                index <= beanStampBalance ? t('已靠岸', 'Docked') : t('待探索', 'Next port')
              }}</span>
            </div>
          </div>
          <div class="harbor-passport-note mt-5 flex items-start gap-3 border-y py-4">
            <i class="fas fa-circle-info mt-0.5 text-[var(--harbor-copper)]"></i>
            <p class="text-xs font-semibold leading-5 text-[var(--harbor-muted)]">
              {{
                t(
                  '每购买一杯手作饮品即可获得 1 枚豆章，满 6 枚可兑换 Harbor Roast 船长杯。',
                  'Earn one bean stamp with every handcrafted drink. Six stamps unlock the Harbor Roast Captain mug.',
                )
              }}
            </p>
          </div>
          <div class="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              class="harbor-primary-button"
              data-testid="food-delivery-harbor-passport-supply"
              @click="emit('navigate', 'supply')"
            >
              <i class="fas fa-gift"></i> {{ t('去兑换好物', 'View rewards') }}
            </button>
            <button type="button" class="harbor-secondary-button" @click="emit('navigate', 'menu')">
              <i class="fas fa-mug-hot"></i> {{ t('去点一杯', 'Order a cup') }}
            </button>
          </div>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'supply'">
      <main data-testid="food-delivery-harbor-supply-page">
        <section class="harbor-supply-hero">
          <img
            :src="harborBrandAssets.supplyHero"
            alt=""
            data-required-asset="harbor-roast/merchandise/harbor-roast-supply-hero-01.png"
          />
          <div class="harbor-supply-hero-copy">
            <p class="text-[10px] font-black text-white/65">CAPTAIN'S SUPPLY STATION</p>
            <h1 class="mt-2 text-4xl font-black leading-none text-white">
              {{ t('船长补给站', 'Captain Supply Station') }}
            </h1>
            <p class="mt-3 max-w-[78%] text-xs font-semibold leading-5 text-white/75">
              {{
                t(
                  '豆章换限定，现金购日常。把 Captain Roast 的港湾装备带回家。',
                  'Redeem limited pieces or buy daily gear from Captain Roast.',
                )
              }}
            </p>
          </div>
        </section>

        <section class="px-4 py-6">
          <div class="harbor-stamp-balance flex items-center justify-between gap-4 border-y py-4">
            <span class="flex min-w-0 items-center gap-3">
              <span class="harbor-stamp-token"><i class="fas fa-stamp"></i></span>
              <span>
                <small class="block text-[10px] font-black text-[var(--harbor-muted)]"
                  >ROAST PASSPORT</small
                >
                <strong class="mt-1 block text-sm">{{ t('可用豆章', 'Available stamps') }}</strong>
              </span>
            </span>
            <strong class="text-3xl font-black text-[var(--harbor-copper)]">
              {{ beanStampBalance }}
            </strong>
          </div>

          <div
            class="harbor-supply-filter mt-5 grid grid-cols-3"
            role="tablist"
            :aria-label="t('补给站分类', 'Supply categories')"
          >
            <button
              v-for="filter in supplyFilters"
              :key="filter.key"
              type="button"
              :class="{ 'is-active': supplyFilter === filter.key }"
              :aria-selected="supplyFilter === filter.key"
              :data-testid="`food-delivery-harbor-supply-filter-${filter.key}`"
              @click="supplyFilter = filter.key"
            >
              {{ filter.label }}
            </button>
          </div>

          <p
            v-if="merchandiseFeedback"
            class="harbor-merch-feedback mt-4"
            role="status"
            data-testid="food-delivery-harbor-merchandise-feedback"
          >
            {{ merchandiseFeedback }}
          </p>

          <div class="harbor-merch-grid mt-5 grid grid-cols-2 gap-x-3 gap-y-6">
            <article
              v-for="item in visibleMerchandise"
              :key="item.id"
              class="harbor-merch-card"
              :data-testid="`food-delivery-harbor-merchandise-${item.id}`"
            >
              <button type="button" class="harbor-merch-image" @click="openMerchandise(item)">
                <img
                  :src="merchandiseImageUrl(item)"
                  :alt="merchandiseTitle(item)"
                  :data-required-asset="`harbor-roast/${item.imagePath}`"
                  @error="hideBrokenImage"
                />
                <span v-if="item.beanStampCost" class="harbor-merch-stamp-tag">
                  <i class="fas fa-stamp"></i> {{ item.beanStampCost }}
                </span>
              </button>
              <button
                type="button"
                class="mt-3 block w-full text-left"
                @click="openMerchandise(item)"
              >
                <strong class="line-clamp-2 block min-h-9 text-sm leading-[1.25]">
                  {{ merchandiseTitle(item) }}
                </strong>
                <span
                  class="mt-1 line-clamp-2 block min-h-8 text-[10px] font-semibold leading-4 text-[var(--harbor-muted)]"
                >
                  {{ merchandiseDescription(item) }}
                </span>
              </button>
              <div class="mt-3 space-y-2">
                <button
                  v-if="item.beanStampCost"
                  type="button"
                  class="harbor-redeem-button w-full"
                  :disabled="!item.canRedeem"
                  :data-testid="`food-delivery-harbor-redeem-${item.id}`"
                  @click="redeemMerchandise(item)"
                >
                  <i class="fas fa-gift"></i>
                  {{
                    item.canRedeem
                      ? t(`${item.beanStampCost} 枚豆章兑换`, `Redeem ${item.beanStampCost}`)
                      : t(`还差 ${item.missingBeanStamps} 枚`, `${item.missingBeanStamps} short`)
                  }}
                </button>
                <button
                  v-if="item.purchasePriceCents"
                  type="button"
                  class="harbor-buy-button w-full"
                  :data-testid="`food-delivery-harbor-buy-${item.id}`"
                  @click="purchaseMerchandise(item)"
                >
                  <i class="fas fa-bag-shopping"></i> {{ merchandisePrice(item) }}
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'supply-detail'">
      <main
        v-if="activeMerchandise"
        class="pb-6"
        data-testid="food-delivery-harbor-supply-detail-page"
      >
        <section class="harbor-merch-detail-stage">
          <img
            :src="merchandiseImageUrl(activeMerchandise)"
            :alt="merchandiseTitle(activeMerchandise)"
            :data-required-asset="`harbor-roast/${activeMerchandise.imagePath}`"
            @error="hideBrokenImage"
          />
          <span class="harbor-merch-detail-mark">CAPTAIN ROAST · HARBOR GOODS</span>
        </section>
        <section class="px-4 pt-6">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="harbor-eyebrow">CAPTAIN'S PICK</p>
              <h1 class="mt-2 text-3xl font-black leading-tight">
                {{ merchandiseTitle(activeMerchandise) }}
              </h1>
            </div>
            <span v-if="activeMerchandise.beanStampCost" class="harbor-detail-stamp shrink-0">
              <i class="fas fa-stamp"></i>
              <strong>{{ activeMerchandise.beanStampCost }}</strong>
              <small>{{ t('豆章', 'stamps') }}</small>
            </span>
          </div>
          <p class="mt-4 text-sm font-semibold leading-6 text-[var(--harbor-muted)]">
            {{ merchandiseDetail(activeMerchandise) }}
          </p>
          <div class="harbor-merch-spec mt-5 grid grid-cols-2 border-y py-4">
            <span>
              <small>{{ t('当前豆章', 'Your stamps') }}</small>
              <strong>{{ beanStampBalance }}</strong>
            </span>
            <span>
              <small>{{ t('获取方式', 'Available by') }}</small>
              <strong>{{
                activeMerchandise.beanStampCost && activeMerchandise.purchasePriceCents
                  ? t('兑换或购买', 'Redeem or buy')
                  : activeMerchandise.beanStampCost
                    ? t('豆章兑换', 'Stamp reward')
                    : t('直接购买', 'Purchase')
              }}</strong>
            </span>
          </div>

          <p
            v-if="merchandiseFeedback"
            class="harbor-merch-feedback mt-4"
            role="status"
            data-testid="food-delivery-harbor-merchandise-feedback"
          >
            {{ merchandiseFeedback }}
          </p>

          <div class="mt-5 space-y-3">
            <button
              v-if="activeMerchandise.beanStampCost"
              type="button"
              class="harbor-primary-button w-full"
              :disabled="!activeMerchandise.canRedeem"
              :data-testid="`food-delivery-harbor-redeem-${activeMerchandise.id}`"
              @click="redeemMerchandise(activeMerchandise)"
            >
              <i class="fas fa-gift"></i>
              {{
                activeMerchandise.canRedeem
                  ? t(
                      `${activeMerchandise.beanStampCost} 枚豆章兑换`,
                      `Redeem ${activeMerchandise.beanStampCost} stamps`,
                    )
                  : t(
                      `还差 ${activeMerchandise.missingBeanStamps} 枚豆章`,
                      `${activeMerchandise.missingBeanStamps} more stamps required`,
                    )
              }}
            </button>
            <button
              v-if="activeMerchandise.purchasePriceCents"
              type="button"
              class="harbor-secondary-button w-full"
              :data-testid="`food-delivery-harbor-buy-${activeMerchandise.id}`"
              @click="purchaseMerchandise(activeMerchandise)"
            >
              <i class="fas fa-bag-shopping"></i>
              {{ t('加入购物袋', 'Add to bag') }} · {{ merchandisePrice(activeMerchandise) }}
            </button>
          </div>
        </section>
      </main>
      <main
        v-else
        class="px-4 py-20 text-center"
        data-testid="food-delivery-harbor-supply-detail-page"
      >
        <i class="fas fa-box-open text-3xl text-[var(--harbor-copper)]"></i>
        <h1 class="mt-4 text-xl font-black">
          {{ t('这件好物暂时离港', 'This item has left the dock') }}
        </h1>
        <button
          type="button"
          class="harbor-primary-button mt-5"
          @click="emit('navigate', 'supply')"
        >
          {{ t('返回补给站', 'Back to supplies') }}
        </button>
      </main>
    </template>

    <template v-else-if="page === 'menu'">
      <main class="px-4 py-5" data-testid="food-delivery-harbor-menu-page">
        <p class="harbor-eyebrow">FULL COFFEE BOARD</p>
        <h1 class="mt-1 text-3xl font-black">
          {{ t('点一杯，向港口出发', 'Choose your next port') }}
        </h1>
        <label class="harbor-search mt-5 flex items-center gap-3">
          <i class="fas fa-magnifying-glass"></i>
          <input
            v-model="searchQuery"
            type="search"
            :placeholder="t('搜索咖啡、茶或烘焙', 'Search coffee, tea, or bakes')"
            data-testid="food-delivery-harbor-menu-search"
          />
        </label>
        <div
          class="harbor-tabs mt-4 flex gap-2 overflow-x-auto pb-2"
          data-testid="food-delivery-store-menu-section-rail"
        >
          <button
            v-for="section in menuSections"
            :key="section.key"
            type="button"
            class="harbor-tab"
            :class="{ 'is-active': section.key === activeSection && !normalizedSearch }"
            :aria-pressed="section.key === activeSection && !normalizedSearch"
            :data-testid="`food-delivery-store-menu-section-${section.key}`"
            @click="selectMenuSection(section.key)"
          >
            <i :class="section.icon"></i> {{ section.label }}
          </button>
        </div>

        <div class="harbor-menu-list mt-5" data-testid="food-delivery-store-menu-items">
          <article
            v-for="(item, itemIndex) in visibleMenuItems"
            :key="item.id"
            class="harbor-menu-card"
            :class="{ 'is-collaboration': isCollaborationItem(item) }"
            :data-testid="`food-delivery-menu-${item.id}`"
          >
            <button
              type="button"
              class="harbor-menu-card-image"
              :data-testid="`food-delivery-menu-open-${item.id}`"
              @click="openDetail(item)"
            >
              <span class="harbor-product-fallback" aria-hidden="true">
                <i :class="isBakeItem(item) ? 'fas fa-cookie-bite' : 'fas fa-mug-hot'"></i>
              </span>
              <img
                v-if="imageUrl(item)"
                :src="imageUrl(item)"
                :alt="item.image?.alt || menuItemTitle(item)"
                :data-required-asset="requiredAssetPath(item)"
                @error="hideBrokenImage"
              />
            </button>
            <div class="min-w-0 py-1">
              <button type="button" class="block w-full text-left" @click="openDetail(item)">
                <span class="harbor-menu-card-kicker">
                  {{ String(itemIndex + 1).padStart(2, '0') }}
                  <template v-if="isCollaborationItem(item)"> · POMPOMPURIN</template>
                </span>
                <strong class="mt-1 block text-sm leading-5">{{ menuItemTitle(item) }}</strong>
                <span
                  class="mt-1 line-clamp-2 block text-[10px] leading-4 text-[var(--harbor-muted)]"
                >
                  {{ menuItemDescription(item) }}
                </span>
              </button>
              <div class="mt-3 flex items-center justify-between gap-2">
                <div>
                  <small class="block text-[9px] font-black text-[var(--harbor-muted)]">{{
                    t('起', 'FROM')
                  }}</small>
                  <strong class="text-sm text-[var(--harbor-copper)]">{{
                    displayPrice(item)
                  }}</strong>
                </div>
                <button
                  type="button"
                  class="harbor-menu-card-action"
                  :aria-label="t('选择冷热、杯型与规格', 'Choose temperature, cup, and size')"
                  :data-testid="`food-delivery-harbor-customize-${item.id}`"
                  @click="openDetail(item)"
                >
                  <i :class="isBakeItem(item) ? 'fas fa-bag-shopping' : 'fas fa-sliders'"></i>
                  {{ isBakeItem(item) ? t('选择', 'Select') : t('选规格', 'Customize') }}
                </button>
              </div>
            </div>
          </article>
        </div>
        <div
          v-if="!visibleMenuItems.length"
          class="py-16 text-center text-sm font-bold text-[var(--harbor-muted)]"
        >
          <i class="fas fa-magnifying-glass mb-3 block text-2xl"></i>
          {{ t('没有找到这杯饮品', 'No drinks found') }}
        </div>
      </main>
    </template>

    <template v-else-if="page === 'detail'">
      <main v-if="activeItem" class="px-4 py-5" data-testid="food-delivery-harbor-detail-page">
        <div class="harbor-detail-stage relative mx-auto aspect-[4/3] w-full overflow-hidden">
          <span class="harbor-detail-mark">BARISTA CARD · MADE TO ORDER</span>
          <img
            v-if="imageUrl(activeItem)"
            :src="imageUrl(activeItem)"
            :alt="activeItem.image?.alt || activeItem.title"
            :data-required-asset="requiredAssetPath(activeItem)"
            @error="hideBrokenImage"
          />
        </div>
        <p class="harbor-eyebrow mt-6">
          {{ t('ROASTED FOR YOUR ORDER', 'ROASTED FOR YOUR ORDER') }}
        </p>
        <h1 class="mt-1 text-3xl font-black leading-none">{{ menuItemTitle(activeItem) }}</h1>
        <p class="mt-3 text-sm font-semibold leading-6 text-[var(--harbor-muted)]">
          {{ menuItemDescription(activeItem) }}
        </p>

        <section v-if="temperatureChoices.length" class="harbor-option-section mt-5 border-t pt-4">
          <div class="flex items-end justify-between gap-3">
            <div>
              <small>{{ t('温度', 'TEMPERATURE') }}</small>
              <strong>{{ t('冷热选择', 'Choose your pour') }}</strong>
            </div>
            <span>{{ t('制作方式会写入订单', 'Saved with this item') }}</span>
          </div>
          <div
            class="harbor-option-grid mt-3"
            :style="{ '--option-count': temperatureChoices.length }"
          >
            <button
              v-for="choice in temperatureChoices"
              :key="choice.key"
              type="button"
              :class="{ 'is-active': detailTemperature === choice.key }"
              :data-testid="`food-delivery-harbor-temperature-${choice.key}`"
              @click="detailTemperature = choice.key"
            >
              <i :class="choice.icon"></i>
              <strong>{{ t(choice.zh, choice.en) }}</strong>
            </button>
          </div>
        </section>

        <section v-if="sizeChoices.length" class="harbor-option-section mt-5 border-t pt-4">
          <div>
            <small>{{ t('杯型与容量', 'CUP SIZE') }}</small>
            <strong>{{ t('选择杯型规格', 'Select a cup profile') }}</strong>
          </div>
          <div class="harbor-size-grid mt-3" :class="{ 'is-single': sizeChoices.length === 1 }">
            <button
              v-for="choice in sizeChoices"
              :key="choice.key"
              type="button"
              :class="{ 'is-active': detailSize === choice.key }"
              :data-testid="`food-delivery-harbor-size-${choice.key}`"
              @click="detailSize = choice.key"
            >
              <span class="harbor-cup-scale" :class="`is-${choice.key}`"
                ><i class="fas fa-mug-hot"></i
              ></span>
              <strong>{{ t(choice.zh, choice.en) }}</strong>
              <small>{{ displayPriceDelta(choice.deltaCents) }}</small>
            </button>
          </div>
        </section>

        <section v-if="packagingChoices.length" class="harbor-option-section mt-5 border-t pt-4">
          <div>
            <small>{{ t('包装', 'PACKAGING') }}</small>
            <strong>{{ t('选择这杯的纸杯包装', 'Choose the cup for this drink') }}</strong>
          </div>
          <div class="mt-3 space-y-2">
            <button
              v-for="choice in packagingChoices"
              :key="choice.key"
              type="button"
              class="harbor-packaging-choice"
              :class="{ 'is-active': detailPackaging === choice.key }"
              :data-testid="`food-delivery-harbor-packaging-${choice.key}`"
              @click="detailPackaging = choice.key"
            >
              <span class="harbor-packaging-choice-media">
                <img :src="choice.image" alt="" :data-required-asset="choice.asset" />
              </span>
              <span class="min-w-0 flex-1 text-left">
                <strong>{{ t(choice.zh, choice.en) }}</strong>
                <small>{{ t(choice.descZh, choice.descEn) }}</small>
              </span>
              <b>{{ displayPriceDelta(choice.deltaCents) }}</b>
            </button>
          </div>
        </section>

        <div class="mt-5 flex items-center justify-between border-y py-4">
          <div>
            <span class="block text-[10px] font-bold text-[var(--harbor-muted)]">{{
              t('数量', 'QUANTITY')
            }}</span>
            <div class="mt-2 grid h-10 grid-cols-3 border">
              <button
                type="button"
                class="harbor-qty-button"
                :aria-label="t('减少', 'Decrease')"
                @click="detailQuantity = Math.max(1, detailQuantity - 1)"
              >
                <i class="fas fa-minus"></i>
              </button>
              <span
                class="flex items-center justify-center text-sm font-black"
                data-testid="food-delivery-harbor-detail-quantity"
                >{{ detailQuantity }}</span
              >
              <button
                type="button"
                class="harbor-qty-button"
                :aria-label="t('增加', 'Increase')"
                data-testid="food-delivery-harbor-detail-quantity-increase"
                @click="detailQuantity = Math.min(99, detailQuantity + 1)"
              >
                <i class="fas fa-plus"></i>
              </button>
            </div>
          </div>
          <strong class="text-lg text-[var(--harbor-copper)]">{{ detailTotal }}</strong>
        </div>
        <button
          type="button"
          class="harbor-primary-button mt-5 w-full"
          data-testid="food-delivery-harbor-detail-add"
          @click="addDetailItem"
        >
          <i class="fas fa-bag-shopping"></i> {{ t('加入购物袋', 'Add to bag') }}
        </button>
      </main>
      <main v-else class="px-4 py-20 text-center" data-testid="food-delivery-harbor-detail-page">
        <i class="fas fa-mug-saucer text-3xl text-[var(--harbor-copper)]"></i>
        <h1 class="mt-4 text-xl font-black">
          {{ t('这杯饮品暂时离港', 'This drink has left the board') }}
        </h1>
        <button type="button" class="harbor-primary-button mt-5" @click="emit('navigate', 'menu')">
          {{ t('返回菜单', 'Back to menu') }}
        </button>
      </main>
    </template>

    <template v-else-if="page === 'bag'">
      <main class="px-4 py-5" data-testid="food-delivery-harbor-bag-page">
        <p class="harbor-eyebrow">YOUR HARBOR BAG</p>
        <div class="mt-1 flex items-end justify-between gap-4">
          <h1 class="text-3xl font-black">{{ t('准备出发', 'Ready to set sail') }}</h1>
          <span class="text-xs font-black text-[var(--harbor-copper)]"
            >{{ cartQuantity }} {{ t('件', 'items') }}</span
          >
        </div>

        <template v-if="cartLines.length">
          <section class="mt-5 divide-y border-y" data-testid="food-delivery-cart-panel">
            <article
              v-for="line in cartLines"
              :key="line.lineId"
              class="harbor-cart-row"
              :data-testid="`food-delivery-cart-${line.lineId}`"
            >
              <button
                type="button"
                class="harbor-row-image"
                @click="
                  line.lineKind === 'merchandise'
                    ? emit('open-merchandise', line.merchandiseId)
                    : emit('open-item', line.menuItemId)
                "
              >
                <span class="harbor-product-fallback"
                  ><i
                    :class="line.lineKind === 'merchandise' ? 'fas fa-gift' : 'fas fa-mug-hot'"
                  ></i
                ></span>
                <img
                  v-if="line.lineKind === 'merchandise'"
                  :src="merchandiseImageUrl(line)"
                  :alt="merchandiseTitle(line)"
                  @error="hideBrokenImage"
                />
                <img
                  v-else-if="imageUrl(line.menuItem)"
                  :src="imageUrl(line.menuItem)"
                  :alt="line.menuItem.title"
                  @error="hideBrokenImage"
                />
              </button>
              <div class="min-w-0 flex-1">
                <span v-if="line.isGift" class="harbor-gift-label">
                  <i class="fas fa-gift"></i> {{ t('赠品 · 已兑换', 'Gift · Redeemed') }}
                </span>
                <strong class="mt-1 block text-sm">{{
                  line.lineKind === 'merchandise'
                    ? merchandiseTitle(line)
                    : menuItemTitle(line.menuItem)
                }}</strong>
                <span
                  v-if="line.lineKind === 'menu' && selectionSummary(line.selection)"
                  class="mt-1 block text-[10px] font-semibold leading-4 text-[var(--harbor-muted)]"
                  data-testid="food-delivery-harbor-cart-selection"
                >
                  {{ selectionSummary(line.selection) }}
                </span>
                <span
                  v-if="line.isGift"
                  class="mt-1 block text-xs font-black text-[var(--harbor-copper)]"
                  >{{ t('金额 0.00', 'Amount 0.00') }} {{ line.currency }} · ×
                  {{ line.quantity }}</span
                >
                <span v-else class="mt-1 block text-xs font-black text-[var(--harbor-copper)]"
                  >{{ line.subtotal }} {{ line.currency }}</span
                >
                <button
                  v-if="line.isGift"
                  type="button"
                  class="harbor-gift-remove mt-3"
                  :data-testid="`food-delivery-harbor-remove-gift-${line.merchandiseId}`"
                  @click="emit('update-cart', line.lineId, 0)"
                >
                  <i class="fas fa-rotate-left"></i>
                  {{
                    t(
                      `移除并退回 ${line.beanStampCost * line.quantity} 枚豆章`,
                      `Remove and return ${line.beanStampCost * line.quantity} stamps`,
                    )
                  }}
                </button>
                <div v-else class="mt-3 grid h-9 w-28 grid-cols-3 border">
                  <button
                    type="button"
                    class="harbor-qty-button"
                    :aria-label="t('减少', 'Decrease')"
                    @click="emit('update-cart', line.lineId, line.quantity - 1)"
                  >
                    <i class="fas fa-minus"></i>
                  </button>
                  <span class="flex items-center justify-center text-xs font-black">{{
                    line.quantity
                  }}</span>
                  <button
                    type="button"
                    class="harbor-qty-button"
                    :aria-label="t('增加', 'Increase')"
                    @click="emit('update-cart', line.lineId, line.quantity + 1)"
                  >
                    <i class="fas fa-plus"></i>
                  </button>
                </div>
              </div>
            </article>
          </section>

          <section class="mt-6" data-testid="food-delivery-harbor-service-mode">
            <p class="harbor-eyebrow">{{ t('选择取餐方式', 'CHOOSE FULFILLMENT') }}</p>
            <div
              class="harbor-segment mt-3 grid grid-cols-2"
              role="radiogroup"
              :aria-label="t('取餐方式', 'Fulfillment mode')"
            >
              <button
                type="button"
                :class="{ 'is-active': isPickup }"
                :aria-pressed="isPickup"
                data-testid="food-delivery-harbor-mode-pickup"
                @click="fulfillmentMode = 'pickup'"
              >
                <i class="fas fa-store"></i> {{ t('到店取餐', 'Store pickup') }}
              </button>
              <button
                type="button"
                :class="{ 'is-active': !isPickup }"
                :aria-pressed="!isPickup"
                data-testid="food-delivery-harbor-mode-delivery"
                @click="fulfillmentMode = 'delivery'"
              >
                <i class="fas fa-motorcycle"></i> {{ t('外卖配送', 'Delivery') }}
              </button>
            </div>
            <div
              v-if="isPickup"
              class="mt-3 grid grid-cols-2 gap-2"
              role="radiogroup"
              :aria-label="t('到店用餐方式', 'Pickup preference')"
            >
              <button
                type="button"
                class="harbor-choice-button"
                :class="{ 'is-active': pickupMode === 'takeout' }"
                :aria-pressed="pickupMode === 'takeout'"
                data-testid="food-delivery-harbor-pickup-takeout"
                @click="pickupMode = 'takeout'"
              >
                <i class="fas fa-bag-shopping"></i
                ><span
                  ><strong>{{ t('外带', 'Takeout') }}</strong
                  ><small>{{ t('约 12 分钟可取', 'Ready in about 12 min') }}</small></span
                >
              </button>
              <button
                type="button"
                class="harbor-choice-button"
                :class="{ 'is-active': pickupMode === 'dine_in' }"
                :aria-pressed="pickupMode === 'dine_in'"
                data-testid="food-delivery-harbor-pickup-dine-in"
                @click="pickupMode = 'dine_in'"
              >
                <i class="fas fa-chair"></i
                ><span
                  ><strong>{{ t('堂食', 'Dine in') }}</strong
                  ><small>{{ t('到店后入座', 'Take a seat on arrival') }}</small></span
                >
              </button>
            </div>
            <div class="harbor-location-row mt-3 flex items-start gap-3 border-y py-4">
              <span class="harbor-location-icon"
                ><i :class="isPickup ? 'fas fa-location-dot' : 'fas fa-house'"></i
              ></span>
              <div class="min-w-0">
                <strong class="block text-sm">{{
                  isPickup
                    ? t('Harbor Roast · 港湾店', 'Harbor Roast · Harbor Store')
                    : t('送到当前地址', 'Deliver to current address')
                }}</strong>
                <span class="mt-1 block text-xs leading-4 text-[var(--harbor-muted)]">{{
                  isPickup
                    ? t('滨港路 18 号 · 一层烘焙吧台', '18 Harbor Road · Ground floor roastery bar')
                    : deliveryAddress
                }}</span>
              </div>
            </div>
          </section>

          <section class="mt-5 border-y py-4">
            <div
              class="flex items-center justify-between text-xs font-bold text-[var(--harbor-muted)]"
            >
              <span>{{ t('商品小计', 'Items') }}</span
              ><span>{{ itemsSubtotal }} {{ cartTotal.currency }}</span>
            </div>
            <div
              class="mt-2 flex items-center justify-between text-xs font-bold text-[var(--harbor-muted)]"
            >
              <span>{{ t('配送费', 'Delivery fee') }}</span
              ><span>{{ checkoutFee }}</span>
            </div>
            <div class="mt-4 flex items-end justify-between">
              <strong class="text-sm">{{ t('应付合计', 'Order total') }}</strong
              ><strong class="text-xl text-[var(--harbor-copper)]"
                >{{ checkoutTotal }} {{ cartTotal.currency }}</strong
              >
            </div>
          </section>
          <button
            type="button"
            class="harbor-primary-button mt-5 w-full"
            data-testid="food-delivery-checkout"
            @click="checkoutOpen = true"
          >
            <i class="fas fa-lock"></i> {{ t('确认订单', 'Review order') }}
          </button>
        </template>
        <section v-else class="py-20 text-center">
          <img
            class="harbor-empty-illustration mx-auto"
            :src="harborBrandAssets.emptyBag"
            alt=""
            data-required-asset="harbor-roast/states/harbor-roast-empty-bag-01.png"
          />
          <h2 class="mt-5 text-xl font-black">
            {{ t('购物袋还在等第一杯', 'Your harbor bag is empty') }}
          </h2>
          <p class="mt-2 text-xs font-semibold text-[var(--harbor-muted)]">
            {{ t('从港湾特调或经典意式开始。', 'Start with a signature or an espresso classic.') }}
          </p>
          <button
            type="button"
            class="harbor-primary-button mt-5"
            @click="emit('navigate', 'menu')"
          >
            {{ t('浏览菜单', 'Browse menu') }}
          </button>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'orders'">
      <main class="px-4 py-5" data-testid="food-delivery-harbor-orders-page">
        <p class="harbor-eyebrow">ORDER LOGBOOK</p>
        <h1 class="mt-1 text-3xl font-black">{{ t('我的港湾订单', 'My Harbor orders') }}</h1>
        <section v-if="orders.length" class="mt-5 divide-y border-y">
          <button
            v-for="order in orders"
            :key="order.id"
            type="button"
            class="harbor-order-row w-full text-left"
            :data-testid="`food-delivery-order-${order.id}`"
            @click="emit('navigate', 'order', order.id)"
          >
            <span class="harbor-order-icon">
              <img :src="orderIllustration(order)" alt="" />
            </span>
            <span class="min-w-0 flex-1">
              <strong class="block text-sm">{{ orderStatus(order).label }}</strong>
              <span class="mt-1 block text-[11px] font-semibold text-[var(--harbor-muted)]"
                >{{ serviceLabel(order) }} · {{ order.itemCount }} {{ t('件', 'items') }} ·
                {{ orderTime(order.createdAt) }}</span
              >
            </span>
            <span class="text-right"
              ><strong class="block text-xs"
                >{{ (order.totalCents / 100).toFixed(2) }} {{ order.currency }}</strong
              ><i class="fas fa-chevron-right mt-2 text-[10px] text-[var(--harbor-muted)]"></i
            ></span>
          </button>
        </section>
        <section v-else class="py-20 text-center">
          <img
            class="harbor-empty-illustration mx-auto"
            :src="harborBrandAssets.emptyOrders"
            alt=""
            data-required-asset="harbor-roast/states/harbor-roast-empty-orders-01.png"
          />
          <h2 class="mt-5 text-xl font-black">{{ t('还没有港湾订单', 'No Harbor orders yet') }}</h2>
          <button
            type="button"
            class="harbor-primary-button mt-5"
            @click="emit('navigate', 'menu')"
          >
            {{ t('点第一杯', 'Order your first cup') }}
          </button>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'order'">
      <main v-if="activeOrder" data-testid="food-delivery-harbor-order-page">
        <section class="harbor-order-hero px-4 pb-7 pt-6">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-[10px] font-black text-white/65">{{ serviceLabel(activeOrder) }}</p>
              <h1 class="mt-2 text-3xl font-black text-white">
                {{ orderStatus(activeOrder).label }}
              </h1>
              <p class="mt-2 text-xs font-semibold text-white/65">
                {{ orderTime(activeOrder.createdAt) }}
              </p>
            </div>
            <img
              class="harbor-status-mascot"
              :src="orderIllustration(activeOrder)"
              :alt="orderStatus(activeOrder).label"
              data-testid="food-delivery-harbor-order-illustration"
            />
          </div>
          <div class="mt-6 grid grid-cols-4 gap-2" :aria-label="t('订单进度', 'Order progress')">
            <span
              v-for="step in 4"
              :key="step"
              class="harbor-progress"
              :class="{ 'is-active': step <= orderStatus(activeOrder).step }"
              :data-testid="`food-delivery-harbor-progress-${step}`"
            ></span>
          </div>
        </section>
        <section class="px-4 py-5">
          <div class="harbor-location-row flex items-start gap-3 border-y py-4">
            <span class="harbor-location-icon"
              ><i
                :class="
                  activeOrder.fulfillmentMode === 'pickup' ? 'fas fa-store' : 'fas fa-location-dot'
                "
              ></i
            ></span>
            <div class="min-w-0">
              <strong class="block text-sm">{{ serviceLabel(activeOrder) }}</strong
              ><span class="mt-1 block text-xs leading-4 text-[var(--harbor-muted)]">{{
                activeOrder.fulfillmentMode === 'pickup'
                  ? t(
                      'Harbor Roast · 港湾店，滨港路 18 号',
                      'Harbor Roast · Harbor Store, 18 Harbor Road',
                    )
                  : activeOrder.deliveryAddress
              }}</span>
            </div>
          </div>
          <div class="mt-5 divide-y border-y">
            <div
              v-for="item in activeOrder.items"
              :key="item.id"
              class="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <span class="min-w-0 flex-1 font-bold">
                <span class="block truncate"
                  >{{ menuItemTitle(item) }}
                  <small class="text-[var(--harbor-muted)]">× {{ item.quantity }}</small>
                  <small
                    v-if="item.acquisition === 'redeemed_gift'"
                    class="ml-1 text-[var(--harbor-copper)]"
                    >{{ t('赠品', 'Gift') }}</small
                  ></span
                >
                <small
                  v-if="selectionSummary(item.selection)"
                  class="mt-1 block text-[10px] font-semibold leading-4 text-[var(--harbor-muted)]"
                  data-testid="food-delivery-harbor-order-selection"
                >
                  {{ selectionSummary(item.selection) }}
                </small>
              </span>
              <strong
                v-if="item.acquisition === 'redeemed_gift'"
                class="shrink-0 text-[var(--harbor-copper)]"
              >
                {{ t('已兑换 · 0.00', 'Redeemed · 0.00') }} {{ item.currency }}
              </strong>
              <strong v-else class="shrink-0"
                >{{ ((item.unitPriceCents * item.quantity) / 100).toFixed(2) }}
                {{ item.currency }}</strong
              >
            </div>
          </div>
          <div class="mt-5 flex items-end justify-between border-b pb-5">
            <span class="text-xs font-bold text-[var(--harbor-muted)]">{{
              t('订单合计', 'Order total')
            }}</span
            ><strong class="text-2xl text-[var(--harbor-copper)]"
              >{{ (activeOrder.totalCents / 100).toFixed(2) }} {{ activeOrder.currency }}</strong
            >
          </div>
          <div class="harbor-order-note mt-5 flex gap-3 border-y py-4">
            <i class="fas fa-anchor mt-0.5 text-[var(--harbor-copper)]"></i>
            <p class="text-xs font-semibold leading-5 text-[var(--harbor-muted)]">
              {{
                activeOrder.fulfillmentMode === 'pickup'
                  ? t(
                      '咖啡师会在饮品完成后更新为“可以取餐了”。',
                      'Your barista will mark this order ready when every drink is complete.',
                    )
                  : t(
                      'Captain Roast 正在看守这趟配送，订单动态会显示在这里。',
                      'Captain Roast is watching this delivery. Updates will appear here.',
                    )
              }}
            </p>
          </div>
          <button
            type="button"
            class="harbor-secondary-button mt-5 w-full"
            @click="emit('navigate', 'orders')"
          >
            <i class="fas fa-receipt"></i> {{ t('查看全部订单', 'View all orders') }}
          </button>
        </section>
      </main>
      <main v-else class="px-4 py-20 text-center" data-testid="food-delivery-harbor-order-page">
        <i class="fas fa-receipt text-3xl text-[var(--harbor-copper)]"></i>
        <h1 class="mt-4 text-xl font-black">{{ t('没有找到这张订单', 'Order not found') }}</h1>
        <button
          type="button"
          class="harbor-primary-button mt-5"
          @click="emit('navigate', 'orders')"
        >
          {{ t('返回订单列表', 'Back to orders') }}
        </button>
      </main>
    </template>

    <section
      v-if="checkoutOpen"
      class="harbor-modal fixed inset-0 z-50 flex items-end bg-black/55 p-4 backdrop-blur-sm"
      data-testid="food-delivery-harbor-checkout-sheet"
      @click.self="checkoutOpen = false"
    >
      <article class="harbor-checkout mx-auto w-full max-w-md">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="harbor-eyebrow">HARBOR ROAST</p>
            <h2 class="mt-1 text-2xl font-black">
              {{ t('确认这次靠岸方式', 'Confirm this Harbor order') }}
            </h2>
          </div>
          <button
            type="button"
            class="harbor-icon-button"
            :aria-label="t('关闭', 'Close')"
            data-testid="food-delivery-harbor-checkout-close"
            @click="checkoutOpen = false"
          >
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <div class="harbor-confirm-mode mt-5 flex items-center gap-3 border-y py-4">
          <span class="harbor-location-icon"
            ><i :class="isPickup ? 'fas fa-store' : 'fas fa-motorcycle'"></i
          ></span>
          <div class="min-w-0 flex-1">
            <strong class="block text-sm">{{
              isPickup
                ? pickupMode === 'dine_in'
                  ? t('到店堂食', 'Dine in')
                  : t('到店外带', 'Takeout')
                : t('外卖配送', 'Delivery')
            }}</strong
            ><span class="mt-1 block text-xs text-[var(--harbor-muted)]">{{
              isPickup ? t('Harbor Roast · 港湾店', 'Harbor Roast · Harbor Store') : deliveryAddress
            }}</span>
          </div>
          <button type="button" class="harbor-text-link" @click="checkoutOpen = false">
            {{ t('修改', 'Edit') }}
          </button>
        </div>
        <div class="mt-3 max-h-40 divide-y overflow-y-auto">
          <div
            v-for="line in cartLines"
            :key="line.lineId"
            class="flex items-center justify-between gap-3 py-3 text-xs"
          >
            <span class="min-w-0 flex-1 font-bold">
              <span class="block truncate"
                >{{
                  line.lineKind === 'merchandise'
                    ? merchandiseTitle(line)
                    : menuItemTitle(line.menuItem)
                }}
                × {{ line.quantity }}
                <small v-if="line.isGift" class="text-[var(--harbor-copper)]">{{
                  t('赠品', 'Gift')
                }}</small></span
              >
              <small
                v-if="line.lineKind === 'menu' && selectionSummary(line.selection)"
                class="mt-0.5 block text-[9px] font-semibold text-[var(--harbor-muted)]"
              >
                {{ selectionSummary(line.selection) }}
              </small>
            </span>
            <strong
              >{{ line.isGift ? t('已兑换 · 0.00', 'Redeemed · 0.00') : line.subtotal }}
              {{ line.currency }}</strong
            >
          </div>
        </div>
        <div class="mt-4 flex items-end justify-between border-t pt-4">
          <span class="text-xs font-bold text-[var(--harbor-muted)]">{{
            t('确认金额', 'Order total')
          }}</span
          ><strong class="text-2xl text-[var(--harbor-copper)]"
            >{{ checkoutTotal }} {{ cartTotal.currency }}</strong
          >
        </div>
        <button
          type="button"
          class="harbor-primary-button mt-5 w-full"
          data-testid="food-delivery-harbor-checkout-submit"
          @click="submitCheckout"
        >
          <i class="fas fa-lock"></i> {{ t('提交订单', 'Place order') }}
        </button>
      </article>
    </section>

    <nav
      class="harbor-bottom-nav fixed bottom-0 left-1/2 z-40 grid w-full max-w-md -translate-x-1/2 grid-cols-4"
      data-testid="food-delivery-harbor-nav"
    >
      <button
        v-for="item in [
          { key: 'home', zh: '首页', en: 'Home', icon: 'fas fa-house' },
          { key: 'menu', zh: '点单', en: 'Menu', icon: 'fas fa-mug-hot' },
          { key: 'bag', zh: '购物袋', en: 'Bag', icon: 'fas fa-bag-shopping' },
          { key: 'orders', zh: '订单', en: 'Orders', icon: 'fas fa-receipt' },
        ]"
        :key="item.key"
        type="button"
        class="relative"
        :class="{ 'is-active': activeNavKey === item.key }"
        :aria-current="activeNavKey === item.key ? 'page' : undefined"
        :data-testid="`food-delivery-harbor-nav-${item.key}`"
        @click="emit('navigate', item.key)"
      >
        <i :class="item.icon"></i><span>{{ t(item.zh, item.en) }}</span
        ><small v-if="item.key === 'bag' && cartQuantity" class="harbor-nav-badge">{{
          cartQuantity
        }}</small>
      </button>
    </nav>
  </section>
</template>

<style scoped>
.harbor-app {
  --harbor-copper: #c67c4e;
  --harbor-blush: #edd6c8;
  --harbor-ink: #313131;
  --harbor-line: #e3e3e3;
  --harbor-canvas: #f9f2ed;
  --harbor-surface: #fffdfb;
  --harbor-muted: #746c68;
  background: var(--harbor-canvas);
  color: var(--harbor-ink);
  font-family: 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif;
  letter-spacing: 0;
}

.harbor-app :where(button, input) {
  font: inherit;
  letter-spacing: 0;
}
.harbor-app button:focus-visible,
.harbor-app input:focus-visible {
  outline: 2px solid var(--harbor-copper);
  outline-offset: 2px;
}
.harbor-topbar {
  height: 4.75rem;
  padding-top: 1.25rem;
  border-bottom: 1px solid color-mix(in srgb, var(--harbor-line) 84%, transparent);
  background: color-mix(in srgb, var(--harbor-canvas) 91%, transparent);
  backdrop-filter: blur(16px);
}
.harbor-icon-button {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--harbor-line);
  border-radius: 50%;
  background: var(--harbor-surface);
  color: var(--harbor-ink);
}
.harbor-wordmark {
  color: var(--harbor-ink);
}
.harbor-wordmark span:last-child,
.harbor-eyebrow {
  color: var(--harbor-copper);
  letter-spacing: 0;
}
.harbor-eyebrow {
  font-size: 0.625rem;
  font-weight: 900;
  line-height: 1.2;
}
.harbor-badge {
  position: absolute;
  right: -0.25rem;
  top: -0.25rem;
  display: inline-flex;
  min-width: 1rem;
  height: 1rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--harbor-copper);
  padding: 0 0.25rem;
  font-size: 0.5rem;
  font-weight: 900;
  color: white;
}
.harbor-mini-mark {
  display: block;
  width: 3.5rem;
  height: 3.5rem;
  flex: 0 0 auto;
  object-fit: contain;
  filter: drop-shadow(0 8px 14px rgba(49, 49, 49, 0.14));
}
.harbor-carousel-viewport {
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 16px 34px rgba(49, 49, 49, 0.14);
}
.harbor-carousel-track {
  display: flex;
  transition: transform 520ms cubic-bezier(0.22, 0.72, 0.24, 1);
}
.harbor-slide {
  width: 100%;
  min-height: 20rem;
  padding: 2rem 1.25rem;
  border-radius: 0;
  background: var(--harbor-canvas);
  color: var(--harbor-ink);
}
.harbor-slide.is-member,
.harbor-campaign-hero.is-member {
  background: var(--harbor-copper);
  color: #fffdfb;
}
.harbor-slide.is-new,
.harbor-campaign-hero.is-new {
  background: var(--harbor-ink);
  color: var(--harbor-canvas);
}
.harbor-slide.is-passport,
.harbor-campaign-hero.is-passport {
  background: var(--harbor-blush);
  color: var(--harbor-ink);
}
.harbor-slide.is-pompompurin {
  background: #f6d5c6;
  color: var(--harbor-ink);
}
.harbor-slide.is-member,
.harbor-slide.is-new,
.harbor-slide.is-passport,
.harbor-campaign-hero.is-member,
.harbor-campaign-hero.is-new,
.harbor-campaign-hero.is-passport {
  color: var(--harbor-ink);
}
.harbor-slide::after {
  content: '';
  position: absolute;
  z-index: 1;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(249, 242, 237, 0.98) 0%,
    rgba(249, 242, 237, 0.93) 42%,
    rgba(249, 242, 237, 0.62) 58%,
    transparent 82%
  );
}
.harbor-slide-media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.harbor-slide-copy {
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.42);
}
.harbor-slide-grid {
  position: absolute;
  inset: 0;
  opacity: 0.22;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.25) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.25) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(90deg, transparent 0%, #000 35%, #000 100%);
}
.harbor-slide-title {
  text-wrap: balance;
}
.harbor-hero-art {
  position: absolute;
  right: -1.7rem;
  bottom: -1.5rem;
  width: 12.5rem;
  height: 17rem;
}
.harbor-sun {
  position: absolute;
  right: 1.1rem;
  top: 0.5rem;
  width: 9.5rem;
  height: 9.5rem;
  border: 1px solid currentColor;
  border-radius: 50%;
  opacity: 0.32;
}
.harbor-cup {
  position: absolute;
  right: 2.2rem;
  bottom: 1.5rem;
  width: 7.6rem;
  height: 9.2rem;
  border: 6px solid currentColor;
  border-radius: 6px 6px 32px 32px;
  background: color-mix(in srgb, currentColor 10%, transparent);
  transform: rotate(7deg);
}
.harbor-cup::before {
  content: '';
  position: absolute;
  left: -0.55rem;
  right: -0.55rem;
  top: -1.1rem;
  height: 1.2rem;
  border: 5px solid currentColor;
  border-radius: 6px;
  background: color-mix(in srgb, currentColor 10%, transparent);
}
.harbor-cup::after {
  content: '';
  position: absolute;
  right: -2.45rem;
  top: 1.75rem;
  width: 2.8rem;
  height: 3.6rem;
  border: 5px solid currentColor;
  border-left: 0;
  border-radius: 0 50% 50% 0;
}
.harbor-cup-face::before,
.harbor-cup-face::after {
  content: '';
  position: absolute;
  top: 3rem;
  width: 0.55rem;
  height: 0.7rem;
  border-radius: 50%;
  background: currentColor;
}
.harbor-cup-face::before {
  left: 2.05rem;
}
.harbor-cup-face::after {
  right: 2.05rem;
}
.harbor-steam {
  position: absolute;
  top: 1.1rem;
  width: 2rem;
  height: 4.6rem;
  border: 4px solid currentColor;
  border-width: 0 0 0 4px;
  border-radius: 50%;
  opacity: 0.6;
}
.harbor-steam-one {
  right: 5.8rem;
  transform: rotate(14deg);
}
.harbor-steam-two {
  right: 3.6rem;
  top: 2rem;
  transform: rotate(-12deg);
}
.harbor-anchor {
  position: absolute;
  right: 8.9rem;
  bottom: 0.2rem;
  display: grid;
  width: 3.4rem;
  height: 3.4rem;
  place-items: center;
  border: 2px solid currentColor;
  border-radius: 50%;
  font-size: 1.1rem;
  transform: rotate(-14deg);
}
.harbor-dot {
  width: 0.55rem;
  height: 0.35rem;
  border-radius: 99px;
  background: var(--harbor-line);
  transition:
    width 180ms ease,
    background 180ms ease;
}
.harbor-dot.is-active {
  width: 1.65rem;
  background: var(--harbor-copper);
}
.harbor-service-strip {
  border-color: var(--harbor-line);
  background: var(--harbor-surface);
}
.harbor-service-cell {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-right: 1px solid var(--harbor-line);
  padding: 0.9rem 0.3rem;
  font-size: 0.65rem;
  font-weight: 900;
}
.harbor-service-cell:last-child {
  border-right: 0;
}
.harbor-service-cell i {
  color: var(--harbor-copper);
}
.harbor-text-link {
  color: var(--harbor-copper);
  font-size: 0.65rem;
  font-weight: 900;
}
.harbor-product-row {
  scroll-snap-type: x proximity;
  scrollbar-color: var(--harbor-copper) color-mix(in srgb, var(--harbor-line) 72%, transparent);
  scrollbar-width: thin;
}
.harbor-product-card {
  scroll-snap-align: start;
}
.harbor-product-row::-webkit-scrollbar {
  display: block;
  height: 0.38rem;
}
.harbor-product-row::-webkit-scrollbar-track {
  border-radius: 999px;
  background: color-mix(in srgb, var(--harbor-line) 72%, transparent);
}
.harbor-product-row::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--harbor-copper);
}
.harbor-tabs::-webkit-scrollbar {
  display: none;
}
.harbor-product-card {
  width: 9.6rem;
  padding-bottom: 0.8rem;
  border-bottom: 2px solid var(--harbor-line);
}
.harbor-product-image,
.harbor-row-image {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--harbor-line);
  border-radius: 8px;
  background: var(--harbor-blush);
}
.harbor-product-image {
  width: 100%;
  aspect-ratio: 1;
}
.harbor-product-image img,
.harbor-row-image img,
.harbor-detail-stage img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.harbor-product-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  color: var(--harbor-copper);
}
.harbor-product-fallback i {
  font-size: 2rem;
}
.harbor-product-fallback small {
  font-size: 0.5rem;
  font-weight: 900;
}
.harbor-add-button {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--harbor-ink);
  color: white;
  font-size: 0.7rem;
}
.harbor-ip-band {
  position: relative;
  min-height: 11rem;
  border-radius: 8px;
  background: var(--harbor-ink);
  box-shadow: 0 16px 36px rgba(49, 49, 49, 0.18);
}
.harbor-ip-band::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0 25px,
    rgba(255, 255, 255, 0.035) 25px 26px
  );
}
.harbor-supply-hero {
  position: relative;
  min-height: 25rem;
  overflow: hidden;
  background: var(--harbor-ink);
}
.harbor-supply-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    0deg,
    rgba(49, 49, 49, 0.92) 0%,
    rgba(49, 49, 49, 0.16) 56%,
    transparent 78%
  );
}
.harbor-supply-hero > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.harbor-supply-hero-copy {
  position: absolute;
  z-index: 1;
  right: 1rem;
  bottom: 1.5rem;
  left: 1rem;
}
.harbor-stamp-token {
  display: grid;
  width: 3rem;
  height: 3rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--harbor-copper);
  border-radius: 50%;
  background: var(--harbor-blush);
  color: var(--harbor-copper);
}
.harbor-supply-filter {
  overflow: hidden;
  border: 1px solid var(--harbor-line);
  border-radius: 8px;
  background: var(--harbor-surface);
  padding: 0.25rem;
}
.harbor-supply-filter button {
  min-width: 0;
  height: 2.65rem;
  border-radius: 6px;
  color: var(--harbor-muted);
  font-size: 0.64rem;
  font-weight: 900;
}
.harbor-supply-filter button.is-active {
  background: var(--harbor-ink);
  color: white;
}
.harbor-merch-card {
  min-width: 0;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid var(--harbor-line);
}
.harbor-merch-image {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--harbor-line);
  border-radius: 8px;
  background: var(--harbor-blush);
}
.harbor-merch-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.harbor-merch-stamp-tag {
  position: absolute;
  right: 0.45rem;
  bottom: 0.45rem;
  display: inline-flex;
  min-width: 2.3rem;
  height: 1.7rem;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  border-radius: 6px;
  background: var(--harbor-ink);
  padding: 0 0.45rem;
  color: white;
  font-size: 0.64rem;
  font-weight: 900;
}
.harbor-redeem-button,
.harbor-buy-button {
  min-height: 2.55rem;
  border-radius: 6px;
  padding: 0.45rem 0.55rem;
  font-size: 0.62rem;
  font-weight: 900;
}
.harbor-redeem-button {
  background: var(--harbor-copper);
  color: white;
}
.harbor-buy-button {
  border: 1px solid var(--harbor-line);
  background: var(--harbor-surface);
  color: var(--harbor-ink);
}
.harbor-redeem-button:disabled,
.harbor-primary-button:disabled {
  cursor: not-allowed;
  background: #cbc4bf;
  color: #fffdfb;
  box-shadow: none;
}
.harbor-merch-feedback {
  border-left: 3px solid var(--harbor-copper);
  background: var(--harbor-blush);
  padding: 0.7rem 0.8rem;
  color: var(--harbor-ink);
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1.1rem;
}
.harbor-merch-detail-stage {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--harbor-blush);
}
.harbor-merch-detail-stage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.harbor-merch-detail-mark {
  position: absolute;
  right: 0.8rem;
  bottom: 0.8rem;
  left: 0.8rem;
  border-top: 1px solid rgba(255, 255, 255, 0.72);
  padding-top: 0.45rem;
  color: white;
  font-size: 0.5rem;
  font-weight: 900;
  text-shadow: 0 1px 5px rgba(49, 49, 49, 0.55);
}
.harbor-detail-stamp {
  display: grid;
  width: 4rem;
  min-height: 4.8rem;
  place-items: center;
  border: 1px solid var(--harbor-copper);
  border-radius: 8px;
  background: var(--harbor-blush);
  color: var(--harbor-copper);
  padding: 0.45rem;
  text-align: center;
}
.harbor-detail-stamp strong,
.harbor-detail-stamp small {
  display: block;
}
.harbor-detail-stamp strong {
  font-size: 1.25rem;
}
.harbor-detail-stamp small {
  font-size: 0.5rem;
  font-weight: 900;
}
.harbor-merch-spec > span {
  min-width: 0;
  padding: 0 0.8rem;
  border-right: 1px solid var(--harbor-line);
}
.harbor-merch-spec > span:first-child {
  padding-left: 0;
}
.harbor-merch-spec > span:last-child {
  border-right: 0;
}
.harbor-merch-spec small,
.harbor-merch-spec strong {
  display: block;
}
.harbor-merch-spec small {
  color: var(--harbor-muted);
  font-size: 0.6rem;
  font-weight: 800;
}
.harbor-merch-spec strong {
  margin-top: 0.35rem;
  font-size: 0.75rem;
}
.harbor-captain {
  position: absolute;
  z-index: 1;
  right: 0.8rem;
  bottom: -0.1rem;
  display: block;
  width: 8.5rem;
  height: 10rem;
  object-fit: contain;
  object-position: right bottom;
  filter: drop-shadow(0 12px 16px rgba(0, 0, 0, 0.24));
}
.harbor-captain-face {
  position: absolute;
  right: 0.4rem;
  bottom: 0.3rem;
  display: flex;
  width: 6.4rem;
  height: 6.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 50% 50% 42% 42%;
  background: var(--harbor-canvas);
  color: var(--harbor-copper);
  font-size: 2.4rem;
  box-shadow: inset 0 -12px 0 var(--harbor-blush);
}
.harbor-captain-hat {
  position: absolute;
  right: 1rem;
  top: 0.7rem;
  z-index: 2;
  display: grid;
  width: 5.2rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 50% 50% 10% 10%;
  background: var(--harbor-copper);
  color: white;
}
.harbor-captain-arm {
  position: absolute;
  left: -0.25rem;
  top: 4.6rem;
  width: 3rem;
  height: 1rem;
  border-radius: 99px;
  background: var(--harbor-canvas);
  transform: rotate(-28deg);
  transform-origin: right center;
}
.harbor-mode-teaser {
  display: flex;
  min-height: 4.7rem;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--harbor-line);
  border-radius: 8px;
  background: var(--harbor-surface);
  padding: 0.8rem;
  text-align: left;
}
.harbor-mode-teaser > i {
  color: var(--harbor-copper);
  font-size: 1.1rem;
}
.harbor-mode-teaser strong,
.harbor-mode-teaser small {
  display: block;
}
.harbor-mode-teaser strong {
  font-size: 0.75rem;
}
.harbor-mode-teaser small {
  margin-top: 0.2rem;
  color: var(--harbor-muted);
  font-size: 0.55rem;
}
.harbor-campaign-hero {
  position: relative;
  aspect-ratio: 4 / 5;
  min-height: 0;
  overflow: hidden;
  padding: 4.5rem 1.25rem 2rem;
}
.harbor-campaign-hero::after {
  content: '';
  position: absolute;
  z-index: 1;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(249, 242, 237, 0.98) 0%,
    rgba(249, 242, 237, 0.9) 32%,
    rgba(249, 242, 237, 0.26) 62%,
    rgba(249, 242, 237, 0) 78%
  );
}
.harbor-campaign-poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.harbor-campaign-copy {
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.42);
}
.harbor-collaboration-page {
  background: #fff8f1;
}
.harbor-collaboration-hero {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  background: #f2d8c8;
}
.harbor-collaboration-hero > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.harbor-collaboration-hero-copy {
  position: absolute;
  top: 1.35rem;
  left: 1.2rem;
  width: 58%;
  color: var(--harbor-ink);
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
}
.harbor-collaboration-hero-copy p,
.harbor-collaboration-hero-copy span {
  display: block;
  font-size: 0.55rem;
  font-weight: 900;
}
.harbor-collaboration-hero-copy h1 {
  margin-top: 0.65rem;
  font-size: 2.25rem;
  font-weight: 900;
  line-height: 1;
  text-wrap: balance;
}
.harbor-collaboration-hero-copy span {
  margin-top: 0.8rem;
  color: #9d6148;
}
.harbor-collab-intro {
  background: #fff8f1;
}
.harbor-collab-notes span {
  display: grid;
  min-height: 3.4rem;
  place-items: center;
  border-top: 1px solid #d7a68d;
  border-bottom: 1px solid #d7a68d;
  color: #8f573e;
  font-size: 0.5rem;
  font-weight: 900;
  line-height: 0.72rem;
  text-align: center;
}
.harbor-collab-feature {
  display: grid;
  grid-template-columns: minmax(0, 54%) minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  overflow: hidden;
  border: 1px solid #e4c9ba;
  border-radius: 8px;
  background: #fffdf9;
  padding: 0.65rem;
  box-shadow: 0 14px 34px rgba(89, 61, 48, 0.09);
}
.harbor-collab-feature > img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 6px;
  object-fit: cover;
}
.harbor-collab-feature small,
.harbor-collab-extra small {
  color: #9d6148;
  font-size: 0.5rem;
  font-weight: 900;
}
.harbor-collab-feature h3,
.harbor-collab-extra h3 {
  margin-top: 0.35rem;
  font-weight: 900;
  line-height: 1.15;
}
.harbor-collab-feature h3 {
  font-size: 1rem;
}
.harbor-collab-feature p,
.harbor-collab-extra p {
  margin-top: 0.5rem;
  color: var(--harbor-muted);
  font-weight: 700;
}
.harbor-collab-feature p {
  font-size: 0.62rem;
  line-height: 1rem;
}
.harbor-collab-extra {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e4c9ba;
  border-radius: 8px;
  background: #fffdf9;
}
.harbor-collab-extra > img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}
.harbor-collab-extra > div {
  padding: 0.75rem;
}
.harbor-collab-extra h3 {
  font-size: 0.72rem;
}
.harbor-collab-extra p {
  font-size: 0.55rem;
  line-height: 0.85rem;
}
.harbor-collab-order-media {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
  background: #efd4c3;
}
.harbor-collab-order-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.harbor-collab-order-media span {
  position: absolute;
  right: 0.7rem;
  bottom: 0.7rem;
  border-radius: 6px;
  background: var(--harbor-ink);
  padding: 0.45rem 0.55rem;
  color: white;
  font-size: 0.52rem;
  font-weight: 900;
}
.harbor-campaign-mascot {
  position: absolute;
  right: -1.5rem;
  bottom: -1.5rem;
  display: grid;
  width: 11rem;
  height: 11rem;
  place-items: center;
  border: 4px solid currentColor;
  border-radius: 50%;
  font-size: 4.5rem;
  opacity: 0.62;
  transform: rotate(10deg);
}
.harbor-benefit-list,
.harbor-menu-row,
.harbor-passport-note,
.harbor-location-row,
.harbor-cart-row,
.harbor-order-row,
.harbor-confirm-mode {
  border-color: var(--harbor-line);
}
.harbor-benefit-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--harbor-line);
}
.harbor-benefit-row:last-child {
  border-bottom: 0;
}
.harbor-benefit-row span:nth-child(2) {
  flex: 1;
}
.harbor-benefit-row strong,
.harbor-benefit-row small {
  display: block;
}
.harbor-benefit-row strong {
  font-size: 0.8rem;
}
.harbor-benefit-row small {
  margin-top: 0.25rem;
  color: var(--harbor-muted);
  font-size: 0.65rem;
}
.harbor-benefit-icon,
.harbor-location-icon,
.harbor-order-icon {
  display: grid;
  width: 3.5rem;
  height: 3.5rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--harbor-blush);
  color: var(--harbor-copper);
}
.harbor-order-icon img {
  width: 3.25rem;
  height: 3.25rem;
  object-fit: contain;
}
.harbor-primary-button,
.harbor-secondary-button {
  min-height: 3.25rem;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.8rem;
  font-weight: 900;
}
.harbor-primary-button {
  background: var(--harbor-copper);
  color: white;
  box-shadow: 0 12px 24px rgba(198, 124, 78, 0.24);
}
.harbor-secondary-button {
  border: 1px solid var(--harbor-line);
  background: var(--harbor-surface);
  color: var(--harbor-ink);
}
.harbor-stamp {
  display: flex;
  aspect-ratio: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px dashed var(--harbor-line);
  border-radius: 8px;
  color: var(--harbor-muted);
  font-size: 0.6rem;
  font-weight: 900;
}
.harbor-stamp i {
  font-size: 1.2rem;
}
.harbor-stamp.is-earned {
  border-style: solid;
  border-color: var(--harbor-copper);
  background: var(--harbor-blush);
  color: var(--harbor-copper);
  transform: rotate(-3deg);
}
.harbor-search {
  height: 3rem;
  border: 1px solid var(--harbor-line);
  border-radius: 8px;
  background: var(--harbor-surface);
  padding: 0 0.9rem;
  color: var(--harbor-muted);
}
.harbor-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--harbor-ink);
  font-size: 0.75rem;
}
.harbor-tab {
  height: 2.5rem;
  flex: 0 0 auto;
  border: 1px solid var(--harbor-line);
  border-radius: 8px;
  background: var(--harbor-surface);
  padding: 0 0.8rem;
  color: var(--harbor-muted);
  font-size: 0.65rem;
  font-weight: 900;
}
.harbor-tab.is-active {
  border-color: var(--harbor-copper);
  background: var(--harbor-copper);
  color: white;
}
.harbor-menu-list {
  display: grid;
  gap: 0.7rem;
}
.harbor-menu-card {
  display: grid;
  min-height: 8.5rem;
  grid-template-columns: 7.25rem minmax(0, 1fr);
  gap: 0.9rem;
  border: 1px solid var(--harbor-line);
  border-radius: 8px;
  background: var(--harbor-surface);
  padding: 0.65rem;
  box-shadow: 0 8px 24px rgba(49, 49, 49, 0.055);
}
.harbor-menu-card.is-collaboration {
  border-color: #dda98f;
  background: #fff2e9;
}
.harbor-menu-card-image {
  position: relative;
  display: grid;
  width: 100%;
  min-height: 7.1rem;
  place-items: center;
  overflow: hidden;
  border-radius: 6px;
  background: var(--harbor-blush);
}
.harbor-menu-card-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.harbor-menu-card-kicker {
  display: block;
  color: var(--harbor-copper);
  font-size: 0.52rem;
  font-weight: 900;
}
.harbor-menu-card-action {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px solid var(--harbor-ink);
  border-radius: 6px;
  padding: 0.35rem 0.55rem;
  color: var(--harbor-ink);
  font-size: 0.57rem;
  font-weight: 900;
}
.harbor-menu-card-action:active {
  background: var(--harbor-ink);
  color: white;
}
.harbor-menu-row {
  display: flex;
  min-height: 7.25rem;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 0;
}
.harbor-row-image {
  width: 5.25rem;
  height: 5.25rem;
  flex: 0 0 auto;
}
.harbor-row-image .harbor-product-fallback i {
  font-size: 1.5rem;
}
.harbor-detail-stage {
  border: 1px solid var(--harbor-line);
  border-radius: 8px;
  background: var(--harbor-blush);
  box-shadow: 0 18px 45px rgba(49, 49, 49, 0.12);
}
.harbor-detail-stage::before {
  content: none;
}
.harbor-detail-mark {
  position: absolute;
  z-index: 2;
  right: 0.7rem;
  bottom: 0.7rem;
  border-radius: 6px;
  background: var(--harbor-ink);
  padding: 0.4rem 0.5rem;
  color: white;
  font-size: 0.5rem;
  font-weight: 900;
}
.harbor-option-section {
  border-color: var(--harbor-line);
}
.harbor-option-section > div:first-child small,
.harbor-option-section > div:first-child strong {
  display: block;
}
.harbor-option-section > div:first-child small {
  color: var(--harbor-copper);
  font-size: 0.55rem;
  font-weight: 900;
}
.harbor-option-section > div:first-child strong {
  margin-top: 0.25rem;
  font-size: 0.85rem;
}
.harbor-option-section > div:first-child > span {
  color: var(--harbor-muted);
  font-size: 0.55rem;
  font-weight: 700;
}
.harbor-option-grid {
  display: grid;
  grid-template-columns: repeat(var(--option-count), minmax(0, 1fr));
  gap: 0.5rem;
}
.harbor-option-grid button {
  display: flex;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--harbor-line);
  border-radius: 6px;
  background: var(--harbor-surface);
  color: var(--harbor-muted);
  font-size: 0.7rem;
}
.harbor-option-grid button.is-active {
  border-color: var(--harbor-ink);
  background: var(--harbor-ink);
  color: white;
}
.harbor-size-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}
.harbor-size-grid.is-single {
  grid-template-columns: minmax(0, 1fr);
}
.harbor-size-grid button {
  display: flex;
  min-height: 6.5rem;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  border: 1px solid var(--harbor-line);
  border-radius: 6px;
  background: var(--harbor-surface);
  padding: 0.65rem 0.35rem;
  color: var(--harbor-muted);
}
.harbor-size-grid button.is-active {
  border-color: var(--harbor-copper);
  background: var(--harbor-blush);
  color: var(--harbor-ink);
}
.harbor-size-grid strong,
.harbor-size-grid small {
  display: block;
  text-align: center;
}
.harbor-size-grid strong {
  margin-top: 0.45rem;
  font-size: 0.58rem;
}
.harbor-size-grid small {
  margin-top: 0.25rem;
  color: var(--harbor-muted);
  font-size: 0.48rem;
  font-weight: 800;
}
.harbor-cup-scale {
  display: flex;
  height: 2.4rem;
  align-items: flex-end;
  justify-content: center;
  color: var(--harbor-copper);
}
.harbor-cup-scale.is-short {
  font-size: 1.25rem;
}
.harbor-cup-scale.is-harbor {
  font-size: 1.65rem;
}
.harbor-cup-scale.is-long {
  font-size: 2rem;
}
.harbor-packaging-choice {
  display: flex;
  width: 100%;
  min-height: 5.25rem;
  align-items: center;
  gap: 0.7rem;
  border: 1px solid var(--harbor-line);
  border-radius: 6px;
  background: var(--harbor-surface);
  padding: 0.65rem;
}
.harbor-packaging-choice.is-active {
  border-color: var(--harbor-copper);
  background: var(--harbor-blush);
}
.harbor-packaging-choice-media {
  display: block;
  width: 4rem;
  height: 4rem;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid var(--harbor-line);
  border-radius: 6px;
  background: var(--harbor-blush);
}
.harbor-packaging-choice-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.harbor-packaging-choice strong,
.harbor-packaging-choice small {
  display: block;
}
.harbor-packaging-choice strong {
  font-size: 0.7rem;
}
.harbor-packaging-choice small {
  margin-top: 0.25rem;
  color: var(--harbor-muted);
  font-size: 0.52rem;
  line-height: 0.8rem;
}
.harbor-packaging-choice b {
  flex: 0 0 auto;
  color: var(--harbor-copper);
  font-size: 0.58rem;
}
.harbor-qty-button {
  display: grid;
  place-items: center;
  color: var(--harbor-copper);
  font-size: 0.65rem;
}
.harbor-cart-row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 0;
}
.harbor-gift-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--harbor-copper);
  border-radius: 6px;
  background: var(--harbor-blush);
  padding: 0.2rem 0.4rem;
  color: var(--harbor-copper);
  font-size: 0.55rem;
  font-weight: 900;
}
.harbor-gift-remove {
  min-height: 2rem;
  border-bottom: 1px solid var(--harbor-copper);
  color: var(--harbor-copper);
  font-size: 0.6rem;
  font-weight: 900;
}
.harbor-segment {
  overflow: hidden;
  border: 1px solid var(--harbor-line);
  border-radius: 8px;
  background: var(--harbor-surface);
  padding: 0.25rem;
}
.harbor-segment button {
  height: 2.7rem;
  border-radius: 6px;
  color: var(--harbor-muted);
  font-size: 0.68rem;
  font-weight: 900;
}
.harbor-segment button.is-active {
  background: var(--harbor-ink);
  color: white;
}
.harbor-choice-button {
  display: flex;
  min-height: 4.2rem;
  align-items: center;
  gap: 0.65rem;
  border: 1px solid var(--harbor-line);
  border-radius: 8px;
  background: var(--harbor-surface);
  padding: 0.65rem;
  text-align: left;
  color: var(--harbor-muted);
}
.harbor-choice-button.is-active {
  border-color: var(--harbor-copper);
  background: var(--harbor-blush);
  color: var(--harbor-ink);
}
.harbor-choice-button > i {
  color: var(--harbor-copper);
}
.harbor-choice-button strong,
.harbor-choice-button small {
  display: block;
}
.harbor-choice-button strong {
  font-size: 0.7rem;
}
.harbor-choice-button small {
  margin-top: 0.2rem;
  font-size: 0.55rem;
  line-height: 0.8rem;
}
.harbor-empty-illustration {
  display: block;
  width: 10rem;
  height: 10rem;
  object-fit: contain;
  filter: drop-shadow(0 14px 24px rgba(49, 49, 49, 0.12));
}
.harbor-order-row {
  display: flex;
  min-height: 5.4rem;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 0;
}
.harbor-order-hero {
  background: var(--harbor-ink);
}
.harbor-status-mascot {
  display: block;
  width: 5.5rem;
  height: 5.5rem;
  flex: 0 0 auto;
  object-fit: contain;
  filter: drop-shadow(0 10px 16px rgba(0, 0, 0, 0.28));
}
.harbor-status-mascot i {
  font-size: 1.5rem;
}
.harbor-status-mascot span {
  margin-top: 0.15rem;
  font-size: 0.45rem;
  font-weight: 900;
}
.harbor-progress {
  height: 0.28rem;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.16);
}
.harbor-progress.is-active {
  background: var(--harbor-copper);
}
.harbor-checkout {
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  border: 1px solid var(--harbor-line);
  border-radius: 8px 8px 0 0;
  background: var(--harbor-canvas);
  padding: 1.1rem;
  box-shadow: 0 -24px 60px rgba(0, 0, 0, 0.28);
}
.harbor-bottom-nav {
  border-top: 1px solid var(--harbor-line);
  background: color-mix(in srgb, var(--harbor-surface) 94%, transparent);
  padding: 0.35rem 0.4rem max(0.35rem, env(safe-area-inset-bottom));
  backdrop-filter: blur(18px);
}
.harbor-bottom-nav > button {
  display: flex;
  min-width: 0;
  height: 3.45rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border-radius: 6px;
  color: var(--harbor-muted);
  font-size: 0.56rem;
  font-weight: 900;
}
.harbor-bottom-nav > button > i {
  font-size: 0.9rem;
}
.harbor-bottom-nav > button.is-active {
  background: var(--harbor-blush);
  color: var(--harbor-copper);
}
.harbor-nav-badge {
  position: absolute;
  right: 1rem;
  top: 0.2rem;
  display: grid;
  min-width: 1rem;
  height: 1rem;
  place-items: center;
  border-radius: 99px;
  background: var(--harbor-copper);
  padding: 0 0.2rem;
  color: white;
  font-size: 0.45rem;
}

@media (prefers-reduced-motion: reduce) {
  .harbor-carousel-track {
    transition: none;
  }
}
@media (max-width: 350px) {
  .harbor-slide {
    min-height: 18rem;
    padding: 1.5rem 1rem;
  }
  .harbor-slide > span:nth-child(2) {
    max-width: 68%;
  }
  .harbor-hero-art {
    right: -2.8rem;
    transform: scale(0.85);
    transform-origin: bottom right;
  }
  .harbor-choice-button {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
