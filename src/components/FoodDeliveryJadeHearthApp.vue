<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import {
  getJadeHearthMenuSearchValues,
  resolveJadeHearthDishNumber,
} from '../lib/food-delivery-jade-hearth-copy'

const props = defineProps({
  restaurant: { type: Object, required: true },
  displayName: { type: String, default: '' },
  shortDescription: { type: String, default: '' },
  menuItems: { type: Array, default: () => [] },
  cartLines: { type: Array, default: () => [] },
  cartQuantity: { type: Number, default: 0 },
  cartTotal: { type: Object, default: () => ({ amount: '0.00', currency: 'CNY' }) },
  orders: { type: Array, default: () => [] },
  activeOrder: { type: Object, default: null },
  activeOrderEvents: { type: Array, default: () => [] },
  activeWalletSuggestion: { type: Object, default: null },
  page: { type: String, default: 'home' },
  etaText: { type: String, default: '' },
  feeText: { type: String, default: '' },
  distanceText: { type: String, default: '' },
  deliveryAddress: { type: String, default: '' },
  missingAssetUrl: { type: String, default: '' },
})

const emit = defineEmits([
  'go-home',
  'navigate',
  'open-item',
  'add-item',
  'update-cart',
  'checkout',
  'mark-delivered',
  'record-wallet',
])

const { t } = useI18n()
const activeSection = ref('house_table')
const menuMode = ref('shared')
const searchQuery = ref('')
const addressOpen = ref(false)
const chapterRail = ref(null)
const smallPlateRail = ref(null)
const railDrag = {
  element: null,
  pointerId: null,
  startX: 0,
  startScrollLeft: 0,
  moved: false,
}
let suppressRailClick = false

const shopName = computed(
  () => String(props.displayName || props.restaurant?.name || '').trim() || t('本店', 'This shop'),
)
const shopMonogram = computed(
  () => Array.from(shopName.value.replace(/^\s+/u, ''))[0]?.toLocaleUpperCase() || t('宴', 'T'),
)
const shopMenuLabel = computed(() =>
  t(`${shopName.value}菜单`, `${shopName.value.toLocaleUpperCase()} MENU`),
)
const emptyOrdersLabel = computed(() =>
  t(`还没有${shopName.value}订单`, `No ${shopName.value} orders yet`),
)

const sectionOptions = Object.freeze([
  { key: 'house_table', labelZh: '招牌桌菜', labelEn: 'House table', mark: '宴', chapter: '壹' },
  { key: 'small_plates', labelZh: '茶点小碟', labelEn: 'Small plates', mark: '点', chapter: '贰' },
  { key: 'wok_favorites', labelZh: '锅气小炒', labelEn: 'From the wok', mark: '炒', chapter: '叁' },
  { key: 'claypot', labelZh: '暖煲', labelEn: 'Claypot', mark: '煲', chapter: '肆' },
  { key: 'rice_noodles', labelZh: '饭面', labelEn: 'Rice & noodles', mark: '饭', chapter: '伍' },
  { key: 'tea_sweets', labelZh: '茶与甜汤', labelEn: 'Tea & sweets', mark: '茶', chapter: '陆' },
])

const menuSections = computed(() =>
  sectionOptions
    .map((section) => ({
      ...section,
      label: t(section.labelZh, section.labelEn),
      count: props.menuItems.filter((item) => item.menuSection === section.key).length,
    }))
    .filter((section) => section.count > 0),
)

const filteredMenuItems = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  return props.menuItems.filter((item) => {
    if (!query && item.menuSection !== activeSection.value) return false
    if (!query) return true
    return getJadeHearthMenuSearchValues(item).some((value) =>
      String(value).toLocaleLowerCase().includes(query),
    )
  })
})

const visibleMenuGroups = computed(() =>
  menuSections.value
    .map((section) => ({
      ...section,
      items: filteredMenuItems.value.filter((item) => item.menuSection === section.key),
    }))
    .filter((section) => section.items.length > 0),
)

const sharedTableItems = computed(() => {
  const primary = props.menuItems.filter((item) => item.menuSection === 'house_table')
  return [...primary, ...props.menuItems.filter((item) => !primary.includes(item))].slice(0, 3)
})

const soloTableItems = computed(() => {
  const primary = props.menuItems.filter((item) =>
    ['rice_noodles', 'claypot'].includes(item.menuSection),
  )
  return [...primary, ...props.menuItems.filter((item) => !primary.includes(item))].slice(0, 3)
})

const homeTableItems = computed(() =>
  menuMode.value === 'shared' ? sharedTableItems.value : soloTableItems.value,
)

const smallPlateItems = computed(() =>
  props.menuItems.filter((item) => item.menuSection === 'small_plates').slice(0, 4),
)

const feastCollections = computed(() => {
  const claimedItems = new Set()
  const buildItems = (requests, size) => {
    const selected = []
    const append = (items, count) => {
      let appended = 0
      for (const item of items) {
        const itemKey = item?.id || item
        if (!item || claimedItems.has(itemKey)) continue
        claimedItems.add(itemKey)
        selected.push(item)
        appended += 1
        if (appended >= count || selected.length >= size) break
      }
    }

    requests.forEach(({ sectionKeys, count = 1, offset = 0 }) => {
      if (selected.length >= size) return
      const matchingItems = props.menuItems.filter((item) => sectionKeys.includes(item.menuSection))
      const startIndex = matchingItems.length ? Math.min(offset, matchingItems.length - 1) : 0
      append([...matchingItems.slice(startIndex), ...matchingItems.slice(0, startIndex)], count)
    })

    if (selected.length < size) append(props.menuItems, size - selected.length)
    return selected
  }
  const build = (key, titleZh, titleEn, descZh, descEn, requests, size) => ({
    key,
    title: t(titleZh, titleEn),
    desc: t(descZh, descEn),
    items: buildItems(requests, size),
  })
  return [
    build(
      'two',
      '二人暖桌',
      'Table for two',
      '一道招牌、一份暖煲，再用小碟开席。',
      'One house signature, one warming claypot, and a bright small plate.',
      [
        { sectionKeys: ['house_table'], offset: 1 },
        { sectionKeys: ['claypot'] },
        { sectionKeys: ['small_plates'], offset: 1 },
      ],
      3,
    ),
    build(
      'family',
      '四人家宴',
      'Family table',
      '两道招牌，配一份锅气热菜和主食，适合慢慢分食。',
      'Two house signatures, a wok favorite, and a staple for a generous shared meal.',
      [
        { sectionKeys: ['house_table'], count: 2 },
        { sectionKeys: ['wok_favorites'] },
        { sectionKeys: ['rice_noodles'] },
      ],
      4,
    ),
    build(
      'quiet',
      '一人食光',
      'A quiet supper',
      '一份暖心主食，配两道茶饮或甜点，轻松收尾。',
      'One comforting staple with two tea or sweet finishes.',
      [{ sectionKeys: ['rice_noodles'] }, { sectionKeys: ['tea_sweets'], count: 2 }],
      3,
    ),
  ].filter((collection) => collection.items.length > 0)
})

const activeNavKey = computed(() => (props.page === 'order' ? 'orders' : props.page))

const imageUrl = (item = {}) => (item.image?.sourceType === 'url' ? item.image.url || '' : '')

const dishFrameClass = (item = {}) => {
  if (item.id === 'food_menu_jade_sea_bass') return 'aspect-[5/3]'
  if (item.menuSection === 'claypot') return 'aspect-square'
  if (item.menuSection === 'tea_sweets') return 'aspect-[4/3]'
  return 'aspect-[4/3]'
}

const dishImageClass = (item = {}, detail = false) => {
  if (detail || item.id === 'food_menu_jade_sea_bass') return 'object-contain'
  return 'object-cover'
}

const requiredAssetPath = (item = {}) => {
  const url = imageUrl(item)
  const marker = 'images/ui-assets/apps/food-delivery/'
  const markerIndex = url.indexOf(marker)
  return markerIndex >= 0 ? url.slice(markerIndex + marker.length) : ''
}

const handleImageError = (event) => {
  const image = event?.currentTarget
  if (!image || image.dataset.fallbackApplied === 'true' || !props.missingAssetUrl) return
  image.dataset.fallbackApplied = 'true'
  image.src = props.missingAssetUrl
}

const displayPrice = (item = {}) => `${item.price || '0.00'} ${item.currency || 'CNY'}`

const openSection = (sectionKey = 'house_table') => {
  activeSection.value = menuSections.value.some((section) => section.key === sectionKey)
    ? sectionKey
    : menuSections.value[0]?.key || 'house_table'
  searchQuery.value = ''
  emit('navigate', 'menu')
}

const selectMenuSection = (sectionKey) => {
  activeSection.value = sectionKey
  searchQuery.value = ''
}

const scrollRail = (railRef, direction = 1) => {
  const element = railRef?.value
  if (!element) return
  element.scrollBy({
    left: Math.max(180, element.clientWidth * 0.7) * direction,
    behavior: 'smooth',
  })
}

const handleRailWheel = (event) => {
  const element = event.currentTarget
  if (!element || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
  event.preventDefault()
  element.scrollLeft += event.deltaY
}

const handleRailKeydown = (event) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  event.currentTarget?.scrollBy({
    left: event.key === 'ArrowRight' ? 180 : -180,
    behavior: 'smooth',
  })
}

const beginRailDrag = (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  const element = event.currentTarget
  railDrag.element = element
  railDrag.pointerId = event.pointerId
  railDrag.startX = event.clientX
  railDrag.startScrollLeft = element.scrollLeft
  railDrag.moved = false
  element.setPointerCapture?.(event.pointerId)
  element.dataset.dragging = 'true'
}

const moveRailDrag = (event) => {
  if (railDrag.element !== event.currentTarget || railDrag.pointerId !== event.pointerId) return
  if (Math.abs(event.clientX - railDrag.startX) > 6) railDrag.moved = true
  railDrag.element.scrollLeft = railDrag.startScrollLeft - (event.clientX - railDrag.startX)
}

const endRailDrag = (event) => {
  if (railDrag.element !== event.currentTarget || railDrag.pointerId !== event.pointerId) return
  event.currentTarget.releasePointerCapture?.(event.pointerId)
  delete event.currentTarget.dataset.dragging
  suppressRailClick = railDrag.moved
  if (suppressRailClick) setTimeout(() => (suppressRailClick = false), 0)
  railDrag.element = null
  railDrag.pointerId = null
}

const handleRailClickCapture = (event) => {
  if (!suppressRailClick) return
  event.preventDefault()
  event.stopPropagation()
}

const collectionTotal = (collection = {}) =>
  (collection.items || []).reduce((total, item) => total + Number(item.price || 0), 0).toFixed(2)

const orderStatus = (status = '') => {
  const states = {
    placed: { label: t('已落单', 'Order placed'), step: 1, icon: 'fas fa-receipt' },
    accepted: { label: t('厨房接单', 'Kitchen accepted'), step: 2, icon: 'fas fa-fire-burner' },
    cooking: { label: t('掌勺中', 'Cooking'), step: 2, icon: 'fas fa-bowl-food' },
    rider_pickup: {
      label: t('骑手配送中', 'Rider on the way'),
      step: 3,
      icon: 'fas fa-motorcycle',
    },
    delivered: { label: t('已送达', 'Delivered'), step: 4, icon: 'fas fa-circle-check' },
    cancelled: { label: t('已取消', 'Cancelled'), step: 0, icon: 'fas fa-circle-xmark' },
  }
  return states[status] || states.placed
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

watch(
  () => props.restaurant.id,
  () => {
    activeSection.value = menuSections.value[0]?.key || 'house_table'
    menuMode.value = 'shared'
    searchQuery.value = ''
    addressOpen.value = false
  },
)
</script>

<template>
  <article
    class="jade-hearth-app min-h-screen bg-[var(--jade-rice)] pb-24 text-[var(--jade-ink)]"
    data-testid="food-delivery-store-shell"
    :data-store-id="restaurant.id"
    data-store-template="jade_table_menu"
  >
    <header
      class="sticky top-0 z-30 border-b border-[var(--jade-line)] bg-[var(--jade-rice)]/95 px-4 py-2.5 backdrop-blur"
    >
      <div class="grid h-11 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
        <button
          type="button"
          class="inline-flex h-11 w-11 items-center justify-center"
          :aria-label="t('返回手机主屏', 'Return to Home')"
          title="Home"
          data-testid="food-delivery-store-home"
          @click="emit('go-home')"
        >
          <i class="fas fa-chevron-left text-xs"></i>
        </button>
        <button type="button" class="min-w-0 text-center" @click="emit('navigate', 'home')">
          <span class="jade-wordmark block truncate text-lg font-black">{{ shopName }}</span>
          <span class="block truncate text-[9px] font-bold text-[var(--jade-muted)]">
            {{ t('时 令 · 雅 席', 'SEASONAL · TABLE') }}
          </span>
        </button>
        <button
          type="button"
          class="relative inline-flex h-11 w-11 items-center justify-center"
          :aria-label="t('打开购物袋', 'Open bag')"
          title="Bag"
          data-testid="food-delivery-jade-header-bag"
          @click="emit('navigate', 'bag')"
        >
          <i class="fas fa-basket-shopping text-sm"></i>
          <span
            v-if="cartQuantity"
            class="absolute right-0 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--jade-cinnabar)] px-1 text-[8px] font-black text-white"
            >{{ cartQuantity }}</span
          >
        </button>
      </div>
    </header>

    <template v-if="page === 'home'">
      <main data-testid="food-delivery-jade-home">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-4 border-b border-[var(--jade-line)] px-4 py-3 text-left"
          :aria-expanded="addressOpen"
          aria-controls="jade-address-panel"
          data-testid="food-delivery-jade-address"
          @click="addressOpen = !addressOpen"
        >
          <span class="flex min-w-0 items-center gap-3">
            <span
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--jade-green)] text-white"
            >
              <i class="fas fa-location-dot text-[10px]"></i>
            </span>
            <span class="min-w-0">
              <span class="block text-[9px] font-bold text-[var(--jade-muted)]">{{
                t('送到', 'Deliver to')
              }}</span>
              <span class="block truncate text-xs font-black">{{ deliveryAddress }}</span>
            </span>
          </span>
          <i
            class="fas fa-chevron-down text-[9px] transition-transform"
            :class="addressOpen ? 'rotate-180' : ''"
          ></i>
        </button>
        <section
          v-if="addressOpen"
          id="jade-address-panel"
          class="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-[var(--jade-line)] bg-white/55 px-4 py-4"
        >
          <p class="break-words text-xs font-bold leading-5">{{ deliveryAddress }}</p>
          <p class="text-right text-xs font-black text-[var(--jade-cinnabar)]">{{ etaText }}</p>
        </section>

        <section
          class="jade-hero relative min-h-[22rem] overflow-hidden bg-[var(--jade-green)] text-white"
          data-testid="food-delivery-jade-hero"
        >
          <img
            v-if="imageUrl(restaurant)"
            :src="imageUrl(restaurant)"
            :alt="restaurant.image?.alt || shopName"
            class="absolute inset-0 h-full w-full object-cover object-[68%_center]"
            :data-required-asset="requiredAssetPath(restaurant)"
            @error="handleImageError"
          />
          <div
            class="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,52,39,0.96)_0%,rgba(18,54,42,0.77)_39%,rgba(18,54,42,0.12)_75%),linear-gradient(0deg,rgba(9,33,25,0.68),transparent_56%)]"
          ></div>
          <div class="jade-paper-grain absolute inset-0 opacity-25"></div>
          <div class="relative flex min-h-[22rem] flex-col justify-between px-5 pb-6 pt-5">
            <div class="flex items-start justify-between gap-4">
              <span
                class="jade-seal inline-flex h-14 w-14 items-center justify-center border border-white/55 bg-[var(--jade-cinnabar)] text-2xl font-black shadow-[4px_4px_0_rgba(16,38,29,0.48)]"
                aria-hidden="true"
                >{{ shopMonogram }}</span
              >
              <span
                class="border border-white/35 bg-[#153f31]/72 px-3 py-1.5 text-[10px] font-bold backdrop-blur"
              >
                {{ restaurant.rating.toFixed(1) }} · {{ etaText }}
              </span>
            </div>
            <div class="max-w-[16.5rem]">
              <p class="text-[10px] font-bold text-[var(--jade-celadon-light)]">
                {{ t('今日席面 · 顺时而食', "TODAY'S TABLE · IN SEASON") }}
              </p>
              <h1 class="jade-display mt-2 break-words text-[2.5rem] font-black leading-[1.05]">
                {{ shopName }}
              </h1>
              <p class="mt-3 text-sm font-bold leading-6 text-white/88">
                {{ t('一席入味，四时有章。', 'A table shaped by the season.') }}
              </p>
              <p class="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-5 text-white/65">
                {{ shortDescription }}
              </p>
              <button
                type="button"
                class="mt-5 inline-flex min-h-11 items-center gap-3 border border-[var(--jade-rice)] bg-[var(--jade-rice)] px-4 text-xs font-black text-[var(--jade-green)] shadow-[4px_4px_0_var(--jade-cinnabar)]"
                data-testid="food-delivery-jade-open-menu"
                @click="openSection('house_table')"
              >
                {{ t('翻开菜单', 'Open the menu') }}
                <i class="fas fa-arrow-right text-[9px]"></i>
              </button>
            </div>
          </div>
        </section>

        <section class="grid grid-cols-3 border-b border-[var(--jade-line)]">
          <div class="border-r border-[var(--jade-line)] px-4 py-4">
            <p class="text-[9px] font-bold text-[var(--jade-muted)]">{{ t('送达', 'ARRIVES') }}</p>
            <p class="mt-1 text-sm font-black">{{ etaText }}</p>
          </div>
          <div class="border-r border-[var(--jade-line)] px-4 py-4">
            <p class="text-[9px] font-bold text-[var(--jade-muted)]">{{ t('路程', 'DISTANCE') }}</p>
            <p class="mt-1 text-sm font-black">{{ distanceText }}</p>
          </div>
          <div class="px-4 py-4">
            <p class="text-[9px] font-bold text-[var(--jade-muted)]">{{ t('配送', 'DELIVERY') }}</p>
            <p class="mt-1 text-sm font-black">{{ feeText }}</p>
          </div>
        </section>

        <section class="px-4 py-6" data-testid="food-delivery-store-menu-section-rail">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-[10px] font-black text-[var(--jade-cinnabar)]">
                {{ t('为你摆桌', 'SET THE TABLE') }}
              </p>
              <h2 class="jade-display mt-1 text-2xl font-black">
                {{ t('今天怎么吃？', 'How are we eating?') }}
              </h2>
            </div>
            <div
              class="grid h-10 shrink-0 grid-cols-2 border border-[var(--jade-line)] bg-white/50 p-0.5 text-[10px] font-black"
            >
              <button
                type="button"
                class="min-w-14 px-2"
                :class="menuMode === 'shared' ? 'bg-[var(--jade-green)] text-white' : ''"
                @click="menuMode = 'shared'"
              >
                {{ t('合菜', 'Share') }}
              </button>
              <button
                type="button"
                class="min-w-14 px-2"
                :class="menuMode === 'solo' ? 'bg-[var(--jade-green)] text-white' : ''"
                @click="menuMode = 'solo'"
              >
                {{ t('一人食', 'Solo') }}
              </button>
            </div>
          </div>

          <div
            v-if="homeTableItems.length"
            class="mt-5 border border-[var(--jade-line)] bg-[var(--jade-paper-soft)] shadow-[4px_4px_0_var(--jade-line)]"
          >
            <article
              v-for="(item, index) in homeTableItems"
              :key="item.id"
              class="grid grid-cols-[1.8rem_minmax(0,1fr)_6.5rem] gap-3 border-b border-[var(--jade-line)] p-3 last:border-b-0"
              :data-testid="`food-delivery-menu-${item.id}`"
              data-menu-card-style="paper-banquet-entry"
            >
              <span
                class="jade-vertical-slip flex min-h-full items-center justify-center border-r border-[var(--jade-line)] pr-2 text-[9px] font-black text-[var(--jade-cinnabar)]"
              >
                {{ menuMode === 'shared' ? t('合菜', 'SHARE') : t('独食', 'SOLO') }}
              </span>
              <div class="flex min-w-0 flex-col justify-between py-0.5">
                <button
                  type="button"
                  class="min-w-0 text-left"
                  :data-testid="`food-delivery-menu-open-${item.id}`"
                  @click="emit('open-item', item.id)"
                >
                  <span class="text-[9px] font-black text-[var(--jade-cinnabar)]">
                    {{ t('席中第', 'COURSE') }} {{ String(index + 1).padStart(2, '0') }}
                  </span>
                  <h3 class="mt-1 break-words text-base font-black leading-5">{{ item.title }}</h3>
                  <p
                    class="mt-2 line-clamp-2 text-[11px] font-semibold leading-4 text-[var(--jade-muted)]"
                  >
                    {{ item.desc }}
                  </p>
                </button>
                <div class="mt-3 flex items-center justify-between gap-2">
                  <span class="text-sm font-black">{{ displayPrice(item) }}</span>
                  <button
                    type="button"
                    class="inline-flex min-h-10 items-center gap-2 border border-[var(--jade-cinnabar)] px-3 text-[10px] font-black text-[var(--jade-cinnabar)]"
                    :aria-label="t(`加入 ${item.title}`, `Add ${item.title}`)"
                    :data-testid="`food-delivery-add-${item.id}`"
                    @click="emit('add-item', item.id, 1, $event.currentTarget)"
                  >
                    <i class="fas fa-plus text-[9px]"></i>
                    {{ t('添菜', 'Add dish') }}
                  </button>
                </div>
              </div>
              <button
                type="button"
                class="self-center overflow-hidden border border-[var(--jade-line)] bg-[var(--jade-photo-mat)] p-1"
                :class="dishFrameClass(item)"
                :aria-label="t(`查看 ${item.title}`, `View ${item.title}`)"
                @click="emit('open-item', item.id)"
              >
                <img
                  v-if="imageUrl(item)"
                  :src="imageUrl(item)"
                  :alt="item.image?.alt || item.title"
                  class="h-full w-full"
                  :class="dishImageClass(item)"
                  :data-required-asset="requiredAssetPath(item)"
                  @error="handleImageError"
                />
              </button>
            </article>
          </div>
        </section>

        <section v-if="smallPlateItems.length" class="border-y border-[var(--jade-line)] py-6">
          <div class="flex items-end justify-between gap-3 px-4">
            <div>
              <p class="text-[10px] font-black text-[var(--jade-cinnabar)]">
                {{ t('先来一碟', 'START SMALL') }}
              </p>
              <h2 class="jade-display mt-1 text-xl font-black">
                {{ t('茶点与小碟', 'Tea & small plates') }}
              </h2>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center border border-[var(--jade-line)]"
                :aria-label="t('向前查看小碟', 'Previous small plates')"
                :title="t('向前', 'Previous')"
                @click="scrollRail(smallPlateRail, -1)"
              >
                <i class="fas fa-arrow-left text-[9px]"></i>
              </button>
              <button
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center border border-[var(--jade-line)]"
                :aria-label="t('向后查看小碟', 'Next small plates')"
                :title="t('向后', 'Next')"
                @click="scrollRail(smallPlateRail, 1)"
              >
                <i class="fas fa-arrow-right text-[9px]"></i>
              </button>
              <button
                type="button"
                class="min-h-10 px-2 text-xs font-black"
                @click="openSection('small_plates')"
              >
                {{ t('全部', 'See all') }}
              </button>
            </div>
          </div>
          <div
            ref="smallPlateRail"
            class="jade-scroll jade-featured-scroll mt-4 flex cursor-grab gap-3 overflow-x-auto px-4 pb-3 active:cursor-grabbing"
            tabindex="0"
            :aria-label="t('茶点与小碟横向列表', 'Tea and small plates carousel')"
            data-testid="food-delivery-jade-small-plate-rail"
            @wheel="handleRailWheel"
            @keydown="handleRailKeydown"
            @pointerdown="beginRailDrag"
            @pointermove="moveRailDrag"
            @pointerup="endRailDrag"
            @pointercancel="endRailDrag"
            @click.capture="handleRailClickCapture"
          >
            <button
              v-for="item in smallPlateItems"
              :key="item.id"
              type="button"
              class="w-40 shrink-0 text-left"
              @click="emit('open-item', item.id)"
            >
              <span class="block aspect-[4/3] overflow-hidden bg-[var(--jade-paper)]">
                <img
                  v-if="imageUrl(item)"
                  :src="imageUrl(item)"
                  :alt="item.image?.alt || item.title"
                  class="h-full w-full object-cover"
                  :data-required-asset="requiredAssetPath(item)"
                  @error="handleImageError"
                />
              </span>
              <span class="mt-2 block truncate text-xs font-black">{{ item.title }}</span>
              <span class="mt-1 block text-[10px] font-bold text-[var(--jade-muted)]">{{
                displayPrice(item)
              }}</span>
            </button>
          </div>
        </section>

        <section class="px-4 py-6">
          <button
            type="button"
            class="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_2.75rem] items-center gap-3 border border-[var(--jade-green)] bg-[var(--jade-green)] p-3 text-left text-white"
            data-testid="food-delivery-jade-open-feast"
            @click="emit('navigate', 'feast')"
          >
            <span
              class="inline-flex h-14 w-14 items-center justify-center border border-white/35 bg-[var(--jade-cinnabar)] text-xl font-black"
              >宴</span
            >
            <span class="min-w-0">
              <span class="block text-[10px] font-bold text-white/65">{{
                t('桌宴灵感', 'TABLE NOTES')
              }}</span>
              <span class="mt-1 block text-base font-black">{{
                t('按人数把一桌菜配齐', 'Build a complete shared table')
              }}</span>
            </span>
            <i class="fas fa-arrow-right text-xs"></i>
          </button>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'menu'">
      <main data-testid="food-delivery-jade-menu-page">
        <section class="jade-paper-grain border-b border-[var(--jade-line)] px-4 pb-5 pt-6">
          <p class="truncate text-[10px] font-black text-[var(--jade-cinnabar)]">
            {{ shopMenuLabel }}
          </p>
          <h1 class="jade-display mt-1 max-w-[20rem] text-3xl font-black leading-tight">
            {{ t('翻开六章，顺席添菜', 'Six chapters for the table') }}
          </h1>
          <p class="mt-2 text-[11px] font-semibold leading-5 text-[var(--jade-muted)]">
            {{
              t(
                '按菜序浏览；点菜名看详情，点“添菜”直接落单。',
                'Open a dish for detail, or add it directly from its course.',
              )
            }}
          </p>
          <label
            class="mt-5 flex h-12 items-center gap-3 border border-[var(--jade-green)] bg-white/62 px-3 shadow-[3px_3px_0_var(--jade-line)]"
          >
            <i class="fas fa-magnifying-glass text-xs text-[var(--jade-muted)]"></i>
            <span class="sr-only">{{ t('搜索菜单', 'Search menu') }}</span>
            <input
              v-model="searchQuery"
              type="search"
              class="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none"
              :placeholder="t('搜索菜名或食材', 'Search dishes or ingredients')"
              data-testid="food-delivery-jade-search"
            />
          </label>
        </section>

        <section
          class="sticky top-[4.05rem] z-20 border-b border-[var(--jade-line)] bg-[var(--jade-rice)]/96 py-3 backdrop-blur"
        >
          <div class="mb-2 flex items-center justify-between gap-3 px-4">
            <p class="text-[9px] font-black text-[var(--jade-muted)]">
              {{ t('左右拖动翻章', 'DRAG TO TURN CHAPTERS') }}
            </p>
            <div class="flex gap-1">
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center border border-[var(--jade-line)] bg-white/55"
                :aria-label="t('上一章', 'Previous chapter')"
                :title="t('上一章', 'Previous chapter')"
                @click="scrollRail(chapterRail, -1)"
              >
                <i class="fas fa-arrow-left text-[9px]"></i>
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center border border-[var(--jade-line)] bg-white/55"
                :aria-label="t('下一章', 'Next chapter')"
                :title="t('下一章', 'Next chapter')"
                @click="scrollRail(chapterRail, 1)"
              >
                <i class="fas fa-arrow-right text-[9px]"></i>
              </button>
            </div>
          </div>
          <div
            ref="chapterRail"
            class="jade-scroll jade-featured-scroll flex cursor-grab gap-2 overflow-x-auto px-4 pb-2 active:cursor-grabbing"
            tabindex="0"
            :aria-label="t('菜单章节', 'Menu chapters')"
            data-testid="food-delivery-store-menu-section-rail"
            @wheel="handleRailWheel"
            @keydown="handleRailKeydown"
            @pointerdown="beginRailDrag"
            @pointermove="moveRailDrag"
            @pointerup="endRailDrag"
            @pointercancel="endRailDrag"
            @click.capture="handleRailClickCapture"
          >
            <button
              v-for="section in menuSections"
              :key="section.key"
              type="button"
              class="grid min-h-14 min-w-[8.5rem] shrink-0 grid-cols-[2rem_minmax(0,1fr)] items-stretch border text-left"
              :class="
                activeSection === section.key
                  ? 'border-[var(--jade-green)] bg-[var(--jade-green)] text-white'
                  : 'border-[var(--jade-line)] bg-white/55 text-[var(--jade-ink)]'
              "
              :aria-pressed="activeSection === section.key"
              :data-testid="`food-delivery-store-menu-section-${section.key}`"
              @click="selectMenuSection(section.key)"
            >
              <span
                class="flex items-center justify-center border-r border-current/25 text-sm font-black"
                >{{ section.mark }}</span
              >
              <span class="flex min-w-0 flex-col justify-center px-2 py-1.5">
                <span class="truncate text-[11px] font-black">{{ section.label }}</span>
                <span class="mt-0.5 text-[8px] font-bold opacity-60"
                  >{{ section.chapter }} · {{ section.count }} {{ t('道', 'DISHES') }}</span
                >
              </span>
            </button>
          </div>
        </section>

        <section class="space-y-4 px-3 py-4" data-testid="food-delivery-menu-panel">
          <section
            v-for="group in visibleMenuGroups"
            :key="group.key"
            class="grid grid-cols-[2.4rem_minmax(0,1fr)] border border-[var(--jade-line)] bg-[var(--jade-paper-soft)] shadow-[4px_4px_0_var(--jade-line)]"
            :data-testid="`food-delivery-jade-menu-chapter-${group.key}`"
          >
            <header
              class="jade-chapter-slip flex min-h-full flex-col items-center justify-between bg-[var(--jade-green)] px-1.5 py-3 text-white"
            >
              <span class="text-[9px] font-black text-[var(--jade-celadon-light)]">{{
                group.chapter
              }}</span>
              <h2 class="jade-vertical-title text-[12px] font-black tracking-normal">
                {{ group.label }}
              </h2>
              <span class="text-base font-black text-[var(--jade-celadon-light)]">{{
                group.mark
              }}</span>
            </header>
            <div class="min-w-0 divide-y divide-[var(--jade-line)]">
              <article
                v-for="item in group.items"
                :key="item.id"
                class="grid grid-cols-[1.7rem_5.25rem_minmax(0,1fr)_3.75rem] items-center gap-2 p-2.5"
                :data-testid="`food-delivery-menu-${item.id}`"
                data-menu-card-style="paper-banquet-entry"
              >
                <span class="self-start pt-1 text-[9px] font-black text-[var(--jade-cinnabar)]">
                  {{ resolveJadeHearthDishNumber(item) }}
                </span>
                <button
                  type="button"
                  class="overflow-hidden border border-[var(--jade-line)] bg-[var(--jade-photo-mat)] p-1"
                  :class="dishFrameClass(item)"
                  :aria-label="t(`查看 ${item.title}`, `View ${item.title}`)"
                  @click="emit('open-item', item.id)"
                >
                  <img
                    v-if="imageUrl(item)"
                    :src="imageUrl(item)"
                    :alt="item.image?.alt || item.title"
                    class="h-full w-full"
                    :class="dishImageClass(item)"
                    :data-required-asset="requiredAssetPath(item)"
                    @error="handleImageError"
                  />
                </button>
                <button
                  type="button"
                  class="min-w-0 text-left"
                  :data-testid="`food-delivery-menu-open-${item.id}`"
                  @click="emit('open-item', item.id)"
                >
                  <h3 class="break-words text-[13px] font-black leading-5">{{ item.title }}</h3>
                  <p
                    class="mt-1 line-clamp-2 text-[9px] font-semibold leading-4 text-[var(--jade-muted)]"
                  >
                    {{ item.desc }}
                  </p>
                  <p class="mt-1.5 text-[11px] font-black text-[var(--jade-cinnabar)]">
                    {{ displayPrice(item) }}
                  </p>
                </button>
                <button
                  type="button"
                  class="flex min-h-[5.25rem] flex-col items-center justify-center gap-1 border-l border-[var(--jade-cinnabar)] px-1 text-[9px] font-black text-[var(--jade-cinnabar)]"
                  :aria-label="t(`加入 ${item.title}`, `Add ${item.title}`)"
                  :data-testid="`food-delivery-add-${item.id}`"
                  @click="emit('add-item', item.id, 1, $event.currentTarget)"
                >
                  <i class="fas fa-plus text-[9px]"></i>
                  <span class="jade-vertical-title">{{ t('添菜', 'Add dish') }}</span>
                </button>
              </article>
            </div>
          </section>
          <div
            v-if="!visibleMenuGroups.length"
            class="flex min-h-72 flex-col items-center justify-center text-center"
          >
            <span class="text-3xl font-black text-[var(--jade-cinnabar)]">空</span>
            <h2 class="mt-4 text-lg font-black">{{ t('没有找到这道菜', 'No dishes found') }}</h2>
            <button
              type="button"
              class="mt-4 min-h-11 border border-[var(--jade-line)] px-4 text-xs font-black"
              @click="searchQuery = ''"
            >
              {{ t('清除搜索', 'Clear search') }}
            </button>
          </div>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'feast'">
      <main data-testid="food-delivery-jade-feast-page">
        <section
          class="jade-feast-hero jade-paper-grain bg-[var(--jade-green)] px-5 pb-7 pt-6 text-white"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-[10px] font-bold text-[var(--jade-celadon-light)]">
                {{ t('桌宴笺', 'TABLE NOTES') }}
              </p>
              <h1 class="jade-display mt-2 text-3xl font-black leading-tight">
                {{ t('按人数，把一餐配完整', 'A table for every kind of gathering') }}
              </h1>
            </div>
            <span
              class="jade-seal inline-flex h-14 w-14 shrink-0 items-center justify-center border border-white/45 bg-[var(--jade-cinnabar)] text-2xl font-black"
              >宴</span
            >
          </div>
          <p class="mt-3 max-w-[20rem] text-xs font-semibold leading-5 text-white/70">
            {{
              t(
                '这是配席建议，不是固定套餐；每道菜仍可单独查看、添菜和调整份量。',
                'These are table suggestions, not fixed sets. Every dish remains individually selectable.',
              )
            }}
          </p>
        </section>
        <section class="space-y-5 px-3 py-5">
          <article
            v-for="(collection, collectionIndex) in feastCollections"
            :key="collection.key"
            class="border border-[var(--jade-line)] bg-[var(--jade-paper-soft)] shadow-[5px_5px_0_var(--jade-line)]"
            :data-testid="`food-delivery-jade-feast-${collection.key}`"
          >
            <div
              class="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-start gap-3 border-b border-[var(--jade-line)] p-3"
            >
              <span
                class="inline-flex h-14 w-14 items-center justify-center bg-[var(--jade-green)] text-lg font-black text-white"
              >
                {{ ['双', '家', '独'][collectionIndex] || collectionIndex + 1 }}
              </span>
              <div class="min-w-0">
                <p class="text-[8px] font-black text-[var(--jade-cinnabar)]">
                  {{ t('配席建议', 'TABLE COMPOSITION') }} ·
                  {{ String(collectionIndex + 1).padStart(2, '0') }}
                </p>
                <h2 class="jade-display text-xl font-black">{{ collection.title }}</h2>
                <p class="mt-1 text-[11px] font-semibold leading-5 text-[var(--jade-muted)]">
                  {{ collection.desc }}
                </p>
              </div>
              <span class="shrink-0 pt-1 text-right text-xs font-black text-[var(--jade-cinnabar)]">
                {{ collectionTotal(collection) }} {{ collection.items[0]?.currency || 'CNY' }}
              </span>
            </div>
            <div class="divide-y divide-[var(--jade-line)]">
              <div
                v-for="(item, itemIndex) in collection.items"
                :key="item.id"
                class="grid grid-cols-[1.7rem_4.75rem_minmax(0,1fr)_3.75rem] items-center gap-2 p-2.5"
              >
                <span class="self-start pt-1 text-[9px] font-black text-[var(--jade-cinnabar)]">{{
                  String(itemIndex + 1).padStart(2, '0')
                }}</span>
                <button
                  type="button"
                  class="overflow-hidden border border-[var(--jade-line)] bg-[var(--jade-photo-mat)] p-1"
                  :class="dishFrameClass(item)"
                  :aria-label="t(`查看 ${item.title}`, `View ${item.title}`)"
                  @click="emit('open-item', item.id)"
                >
                  <img
                    v-if="imageUrl(item)"
                    :src="imageUrl(item)"
                    :alt="item.image?.alt || item.title"
                    class="h-full w-full"
                    :class="dishImageClass(item)"
                    :data-required-asset="requiredAssetPath(item)"
                    @error="handleImageError"
                  />
                </button>
                <button
                  type="button"
                  class="min-w-0 text-left"
                  :data-testid="`food-delivery-menu-open-${item.id}`"
                  @click="emit('open-item', item.id)"
                >
                  <span class="block break-words text-xs font-black leading-4">{{
                    item.title
                  }}</span>
                  <span class="mt-1 block text-[10px] font-bold text-[var(--jade-muted)]">{{
                    displayPrice(item)
                  }}</span>
                </button>
                <button
                  type="button"
                  class="flex min-h-[4.75rem] flex-col items-center justify-center gap-1 border-l border-[var(--jade-cinnabar)] text-[9px] font-black text-[var(--jade-cinnabar)]"
                  :aria-label="t(`加入 ${item.title}`, `Add ${item.title}`)"
                  :data-testid="`food-delivery-add-${item.id}`"
                  @click="emit('add-item', item.id, 1, $event.currentTarget)"
                >
                  <i class="fas fa-plus text-[9px]"></i>
                  <span class="jade-vertical-title">{{ t('添菜', 'Add dish') }}</span>
                </button>
              </div>
            </div>
          </article>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'bag'">
      <main class="px-4 py-6" data-testid="food-delivery-jade-bag-page">
        <p class="text-[10px] font-black text-[var(--jade-cinnabar)]">
          {{ t('本次点单', 'ORDER SLIP') }}
        </p>
        <div
          class="mt-1 flex items-end justify-between gap-3 border-b border-[var(--jade-line)] pb-4"
        >
          <h1 class="jade-display text-3xl font-black">{{ t('你的餐桌', 'Your table') }}</h1>
          <span class="text-xs font-black">{{ cartQuantity }} {{ t('份', 'items') }}</span>
        </div>

        <section v-if="cartLines.length" class="mt-2" data-testid="food-delivery-cart-panel">
          <article
            v-for="(line, index) in cartLines"
            :key="line.menuItemId"
            class="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 border-b border-[var(--jade-line)] py-4"
            :data-testid="`food-delivery-cart-${line.menuItemId}`"
          >
            <span class="pt-1 text-[10px] font-black text-[var(--jade-cinnabar)]">{{
              String(index + 1).padStart(2, '0')
            }}</span>
            <div class="min-w-0">
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h2 class="break-words text-sm font-black">{{ line.menuItem.title }}</h2>
                  <p class="mt-1 text-[10px] font-bold text-[var(--jade-muted)]">
                    {{ line.subtotal }} {{ line.currency }}
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[var(--jade-muted)]"
                  :aria-label="t('移除', 'Remove')"
                  @click="emit('update-cart', line.menuItemId, 0)"
                >
                  <i class="fas fa-trash-can text-[10px]"></i>
                </button>
              </div>
              <div
                class="mt-3 inline-flex h-11 items-center border border-[var(--jade-line)] bg-white/55"
              >
                <button
                  type="button"
                  class="inline-flex h-11 w-11 items-center justify-center"
                  :aria-label="t('减少数量', 'Decrease quantity')"
                  @click="emit('update-cart', line.menuItemId, line.quantity - 1)"
                >
                  <i class="fas fa-minus text-[9px]"></i>
                </button>
                <span class="min-w-8 text-center text-xs font-black">{{ line.quantity }}</span>
                <button
                  type="button"
                  class="inline-flex h-11 w-11 items-center justify-center"
                  :aria-label="t('增加数量', 'Increase quantity')"
                  @click="emit('update-cart', line.menuItemId, line.quantity + 1)"
                >
                  <i class="fas fa-plus text-[9px]"></i>
                </button>
              </div>
            </div>
          </article>
          <div class="mt-5 border-y border-[var(--jade-line)] py-4">
            <div class="flex justify-between gap-3 text-xs font-bold text-[var(--jade-muted)]">
              <span>{{ t('配送', 'Delivery') }}</span
              ><span>{{ feeText }}</span>
            </div>
            <div class="mt-4 flex items-end justify-between gap-3">
              <span class="text-base font-black">{{ t('合计', 'Total') }}</span
              ><span class="text-2xl font-black"
                >{{ cartTotal.amount }} {{ cartTotal.currency }}</span
              >
            </div>
          </div>
          <button
            type="button"
            class="mt-5 min-h-12 w-full bg-[var(--jade-cinnabar)] px-4 text-sm font-black text-white"
            data-testid="food-delivery-checkout"
            @click="emit('checkout')"
          >
            {{ t('确认并结算', 'Review checkout') }}
          </button>
        </section>

        <section v-else class="flex min-h-[31rem] flex-col items-center justify-center text-center">
          <span
            class="inline-flex h-20 w-20 items-center justify-center border border-[var(--jade-green)] text-3xl font-black text-[var(--jade-green)]"
            >空</span
          >
          <h2 class="mt-5 text-xl font-black">{{ t('桌上还没有菜', 'Your table is empty') }}</h2>
          <p class="mt-2 max-w-[17rem] text-xs font-semibold leading-5 text-[var(--jade-muted)]">
            {{
              t(
                '先挑一道招牌，再配小碟或主食。',
                'Begin with a house signature, then add a small plate or staple.',
              )
            }}
          </p>
          <button
            type="button"
            class="mt-5 min-h-11 bg-[var(--jade-green)] px-5 text-xs font-black text-white"
            @click="emit('navigate', 'menu')"
          >
            {{ t('翻开菜单', 'Open menu') }}
          </button>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'orders'">
      <main class="px-4 py-6" data-testid="food-delivery-jade-orders-page">
        <p class="text-[10px] font-black text-[var(--jade-cinnabar)]">
          {{ t('送餐笺', 'DELIVERY NOTES') }}
        </p>
        <h1 class="jade-display mt-1 border-b border-[var(--jade-line)] pb-4 text-3xl font-black">
          {{ t('订单', 'Orders') }}
        </h1>
        <div v-if="orders.length">
          <button
            v-for="order in orders"
            :key="order.id"
            type="button"
            class="grid w-full grid-cols-[3rem_minmax(0,1fr)_auto] items-start gap-3 border-b border-[var(--jade-line)] py-4 text-left"
            :data-testid="`food-delivery-order-${order.id}`"
            @click="emit('navigate', 'order', order.id)"
          >
            <span
              class="inline-flex h-12 w-12 items-center justify-center border border-[var(--jade-cinnabar)] text-[var(--jade-cinnabar)]"
              ><i :class="orderStatus(order.status).icon"></i
            ></span>
            <span class="min-w-0"
              ><span class="block text-sm font-black">{{ orderStatus(order.status).label }}</span
              ><span
                class="mt-1 block truncate text-[10px] font-semibold text-[var(--jade-muted)]"
                >{{ order.items.map((item) => item.title).join(' · ') }}</span
              ><span class="mt-1 block text-[9px] font-bold text-[var(--jade-muted)]">{{
                orderTime(order.createdAt)
              }}</span></span
            >
            <span class="shrink-0 text-right"
              ><span class="block text-sm font-black"
                >{{ (order.totalCents / 100).toFixed(2) }} {{ order.currency }}</span
              ><i class="fas fa-chevron-right mt-3 text-[9px] text-[var(--jade-cinnabar)]"></i
            ></span>
          </button>
        </div>
        <div v-else class="flex min-h-[31rem] flex-col items-center justify-center text-center">
          <i class="fas fa-receipt text-4xl text-[var(--jade-cinnabar)]"></i>
          <h2 class="mt-5 break-words text-xl font-black">{{ emptyOrdersLabel }}</h2>
          <p class="mt-2 max-w-[17rem] text-xs font-semibold leading-5 text-[var(--jade-muted)]">
            {{
              t(
                '下单后，掌勺和配送进度会写在这里。',
                'Cooking and delivery progress will appear here after checkout.',
              )
            }}
          </p>
          <button
            type="button"
            class="mt-5 min-h-11 bg-[var(--jade-green)] px-5 text-xs font-black text-white"
            @click="emit('navigate', 'menu')"
          >
            {{ t('开始点单', 'Start an order') }}
          </button>
        </div>
      </main>
    </template>

    <template v-else-if="page === 'order'">
      <main data-testid="food-delivery-jade-order-page">
        <template v-if="activeOrder">
          <section class="bg-[var(--jade-green)] px-5 pb-8 pt-6 text-white">
            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center border border-white/25"
              :aria-label="t('返回订单', 'Back to orders')"
              @click="emit('navigate', 'orders')"
            >
              <i class="fas fa-chevron-left text-xs"></i>
            </button>
            <p class="mt-8 text-[10px] font-bold text-white/60">
              {{ t('送餐进度', 'DELIVERY STATUS') }}
            </p>
            <h1 class="jade-display mt-2 text-3xl font-black">
              {{ orderStatus(activeOrder.status).label }}
            </h1>
            <p class="mt-2 text-xs font-semibold leading-5 text-white/65">
              {{ activeOrder.deliveryAddress }}
            </p>
            <div class="mt-6 grid grid-cols-4 gap-1.5" aria-hidden="true">
              <span
                v-for="step in 4"
                :key="step"
                class="h-1.5"
                :class="
                  orderStatus(activeOrder.status).step >= step
                    ? 'bg-[var(--jade-cinnabar)]'
                    : 'bg-white/15'
                "
              ></span>
            </div>
          </section>
          <section class="px-4 py-6">
            <div
              class="flex items-end justify-between gap-3 border-b border-[var(--jade-line)] pb-4"
            >
              <h2 class="jade-display text-xl font-black">{{ t('本次餐桌', 'Your table') }}</h2>
              <span class="text-lg font-black"
                >{{ (activeOrder.totalCents / 100).toFixed(2) }} {{ activeOrder.currency }}</span
              >
            </div>
            <div class="divide-y divide-[var(--jade-line)]">
              <div
                v-for="item in activeOrder.items"
                :key="item.id"
                class="flex items-start justify-between gap-3 py-3 text-xs"
              >
                <span
                  ><span class="block font-black">{{ item.title }}</span
                  ><span class="mt-1 block font-semibold text-[var(--jade-muted)]"
                    >× {{ item.quantity }}</span
                  ></span
                ><span class="font-black">{{
                  ((item.unitPriceCents * item.quantity) / 100).toFixed(2)
                }}</span>
              </div>
            </div>
            <section
              class="mt-6 border-y border-[var(--jade-line)] py-5"
              data-testid="food-delivery-jade-order-updates"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="text-[10px] font-black text-[var(--jade-cinnabar)]">
                    {{ t('送餐笺', 'DELIVERY NOTES') }}
                  </p>
                  <h2 class="jade-display mt-1 text-xl font-black">
                    {{ t('配送进度', 'Delivery progress') }}
                  </h2>
                </div>
                <span
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-[var(--jade-green)] text-[var(--jade-green)]"
                  aria-hidden="true"
                >
                  <i class="fas fa-motorcycle text-sm"></i>
                </span>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  v-if="activeOrder.status !== 'delivered' && activeOrder.status !== 'cancelled'"
                  type="button"
                  class="inline-flex min-h-11 items-center gap-2 bg-[var(--jade-green)] px-3 text-[11px] font-black text-white"
                  :data-testid="`food-delivery-jade-mark-delivered-${activeOrder.id}`"
                  @click="emit('mark-delivered', activeOrder.id)"
                >
                  <i class="fas fa-circle-check text-[10px]"></i>
                  {{ t('确认送达', 'Confirm delivery') }}
                </button>
              </div>

              <div v-if="activeOrderEvents.length" class="mt-4 divide-y divide-[var(--jade-line)]">
                <article
                  v-for="event in activeOrderEvents"
                  :key="event.id"
                  class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3"
                  :data-testid="`food-delivery-jade-order-event-${event.id}`"
                >
                  <div class="min-w-0">
                    <p class="text-xs font-black">{{ event.typeLabel }}</p>
                    <p
                      class="mt-1 break-words text-[11px] font-semibold leading-5 text-[var(--jade-muted)]"
                    >
                      {{ event.detail }}
                    </p>
                  </div>
                  <div class="shrink-0 text-right text-[9px] font-bold text-[var(--jade-muted)]">
                    <p>{{ event.timeLabel }}</p>
                    <p v-if="Number(event.etaMinutes) > 0" class="mt-1 text-[var(--jade-cinnabar)]">
                      {{ event.etaMinutes }} min
                    </p>
                  </div>
                </article>
              </div>
              <p
                v-else
                class="mt-4 border-l-2 border-[var(--jade-line)] pl-3 text-[11px] font-semibold leading-5 text-[var(--jade-muted)]"
              >
                {{
                  t(
                    '暂时没有新的送餐笺，可以稍后再查看。',
                    'There are no new delivery notes yet. Check again in a moment.',
                  )
                }}
              </p>
            </section>

            <section
              v-if="activeOrder.status === 'delivered' && activeWalletSuggestion"
              class="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--jade-line)] pb-5"
              :data-testid="`food-delivery-jade-wallet-${activeOrder.id}`"
            >
              <div class="min-w-0">
                <p class="text-[10px] font-black text-[var(--jade-cinnabar)]">
                  {{ t('餐后记账', 'AFTER THE TABLE') }}
                </p>
                <p class="mt-1 break-words text-xs font-bold leading-5">
                  {{
                    activeWalletSuggestion.walletImported
                      ? t('这笔餐费已记入 Wallet。', 'This meal is already recorded in Wallet.')
                      : t(
                          '将这笔已送达订单记为 Wallet 支出。',
                          'Record this delivered order as a Wallet expense.',
                        )
                  }}
                </p>
              </div>
              <button
                type="button"
                class="inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-[11px] font-black"
                :class="
                  activeWalletSuggestion.walletImported
                    ? 'border border-[var(--jade-line)] text-[var(--jade-muted)]'
                    : 'bg-[var(--jade-cinnabar)] text-white'
                "
                :disabled="activeWalletSuggestion.walletImported"
                :data-testid="`food-delivery-jade-record-wallet-${activeOrder.id}`"
                @click="emit('record-wallet', activeOrder.id)"
              >
                <i
                  :class="
                    activeWalletSuggestion.walletImported ? 'fas fa-circle-check' : 'fas fa-wallet'
                  "
                ></i>
                {{
                  activeWalletSuggestion.walletImported
                    ? t('已记录', 'Recorded')
                    : t('记录', 'Record')
                }}
              </button>
            </section>
            <div class="mt-5 border-l-4 border-[var(--jade-cinnabar)] bg-white/55 p-4">
              <p class="text-[10px] font-black text-[var(--jade-cinnabar)]">
                {{ t('接下来', 'WHAT HAPPENS NEXT') }}
              </p>
              <p class="mt-2 text-sm font-black leading-5">
                {{
                  t(
                    '厨房接单后，会继续更新制作与配送状态。',
                    'The kitchen will keep cooking and delivery progress updated here.',
                  )
                }}
              </p>
            </div>
          </section>
        </template>
        <section
          v-else
          class="flex min-h-[36rem] flex-col items-center justify-center px-6 text-center"
        >
          <i class="fas fa-receipt text-4xl text-[var(--jade-cinnabar)]"></i>
          <h1 class="mt-4 text-xl font-black">{{ t('找不到这张订单', 'Order not found') }}</h1>
          <button
            type="button"
            class="mt-5 min-h-11 bg-[var(--jade-green)] px-5 text-xs font-black text-white"
            @click="emit('navigate', 'orders')"
          >
            {{ t('查看全部订单', 'View orders') }}
          </button>
        </section>
      </main>
    </template>

    <nav
      class="fixed bottom-0 left-1/2 z-40 grid w-full max-w-md -translate-x-1/2 grid-cols-5 border-t border-[var(--jade-green)] bg-[var(--jade-rice)] px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(31,77,58,0.08)]"
      data-testid="food-delivery-jade-nav"
    >
      <button
        v-for="item in [
          { key: 'home', label: t('首页', 'Home'), icon: 'fas fa-house' },
          { key: 'menu', label: t('菜单', 'Menu'), icon: 'fas fa-book-open' },
          { key: 'feast', label: t('桌宴', 'Feast'), icon: 'fas fa-bowl-rice' },
          { key: 'bag', label: t('餐桌', 'Bag'), icon: 'fas fa-basket-shopping' },
          { key: 'orders', label: t('订单', 'Orders'), icon: 'fas fa-receipt' },
        ]"
        :key="item.key"
        type="button"
        class="relative flex min-h-12 flex-col items-center justify-center gap-1 text-[9px] font-black"
        :class="
          activeNavKey === item.key ? 'text-[var(--jade-cinnabar)]' : 'text-[var(--jade-muted)]'
        "
        :aria-current="activeNavKey === item.key ? 'page' : undefined"
        :data-testid="`food-delivery-jade-nav-${item.key}`"
        @click="emit('navigate', item.key)"
      >
        <span
          v-if="activeNavKey === item.key"
          class="absolute top-0 h-0.5 w-7 bg-[var(--jade-cinnabar)]"
        ></span>
        <i :class="[item.icon, 'text-sm']"></i><span>{{ item.label }}</span>
        <span
          v-if="item.key === 'bag' && cartQuantity"
          class="absolute right-2 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--jade-cinnabar)] px-1 text-[8px] text-white"
          >{{ cartQuantity }}</span
        >
      </button>
    </nav>
  </article>
</template>

<style scoped>
.jade-hearth-app {
  --jade-green: #1f4d3a;
  --jade-cinnabar: #bd4b35;
  --jade-rice: #f5efe2;
  --jade-paper: #e9deca;
  --jade-paper-soft: #fbf6eb;
  --jade-photo-mat: #eee5d5;
  --jade-celadon-light: #dbe7dd;
  --jade-ink: #211e19;
  --jade-muted: #746c61;
  --jade-line: #cfc2ad;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', STSong, Georgia, serif;
  letter-spacing: 0;
}

.jade-display,
.jade-wordmark {
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', STSong, Georgia, serif;
  letter-spacing: 0;
}

.jade-paper-grain {
  background-image:
    repeating-linear-gradient(0deg, rgb(83 72 54 / 0.025) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.035) 0 1px, transparent 1px 5px);
}

.jade-seal {
  font-family: 'Noto Serif SC', 'Songti SC', STSong, serif;
}

.jade-vertical-title,
.jade-vertical-slip {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  letter-spacing: 0;
}

.jade-chapter-slip {
  background-image: linear-gradient(180deg, rgb(255 255 255 / 0.06), transparent 45%);
}

.jade-scroll {
  scrollbar-width: none;
  overscroll-behavior-inline: contain;
  scroll-behavior: smooth;
  touch-action: pan-x;
}

.jade-scroll::-webkit-scrollbar {
  display: none;
}

.jade-featured-scroll {
  scrollbar-color: var(--jade-cinnabar) color-mix(in srgb, var(--jade-line) 80%, transparent);
  scrollbar-width: thin;
}

.jade-featured-scroll::-webkit-scrollbar {
  display: block;
  height: 0.34rem;
}

.jade-featured-scroll::-webkit-scrollbar-track {
  border-radius: 999px;
  background: color-mix(in srgb, var(--jade-line) 80%, transparent);
}

.jade-featured-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--jade-cinnabar);
}

.jade-scroll[data-dragging='true'] {
  user-select: none;
}

.jade-scroll[data-dragging='true'] * {
  pointer-events: none;
}

.jade-hearth-app :is(button, input):focus-visible {
  outline: 2px solid var(--jade-cinnabar);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .jade-hearth-app * {
    scroll-behavior: auto !important;
    transition-duration: 0s !important;
  }
}
</style>
