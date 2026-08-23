<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import {
  getDashGrillMenuSearchValues,
  resolveDashGrillTicketNumber,
} from '../lib/food-delivery-dash-grill-copy'

const props = defineProps({
  restaurant: { type: Object, required: true },
  displayName: { type: String, default: 'Dash Grill' },
  shortDescription: { type: String, default: '' },
  menuItems: { type: Array, default: () => [] },
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
  missingAssetUrl: { type: String, default: '' },
})

const emit = defineEmits([
  'go-home',
  'navigate',
  'open-item',
  'add-item',
  'update-cart',
  'checkout',
  'open-support',
])

const { t } = useI18n()
const activeSection = ref('featured')
const searchQuery = ref('')
const deliveryDetailsOpen = ref(false)

const sectionOptions = Object.freeze([
  { key: 'featured', labelZh: '人气套餐', labelEn: 'Combos', icon: 'fas fa-burger' },
  { key: 'burgers', labelZh: '汉堡', labelEn: 'Burgers', icon: 'fas fa-burger' },
  { key: 'chicken', labelZh: '鸡肉', labelEn: 'Chicken', icon: 'fas fa-drumstick-bite' },
  { key: 'sides', labelZh: '小食', labelEn: 'Sides', icon: 'fas fa-box-open' },
  { key: 'drinks', labelZh: '饮品', labelEn: 'Drinks', icon: 'fas fa-glass-water' },
  { key: 'treats', labelZh: '甜点', labelEn: 'Treats', icon: 'fas fa-ice-cream' },
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
    return getDashGrillMenuSearchValues(item).some((value) =>
      String(value).toLocaleLowerCase().includes(query),
    )
  })
})

const featuredItems = computed(() => {
  const promoted = props.menuItems.filter((item) => item.menuSection === 'featured')
  return [...promoted, ...props.menuItems.filter((item) => !promoted.includes(item))].slice(0, 4)
})

const activeNavKey = computed(() => (props.page === 'order' ? 'orders' : props.page))

const imageUrl = (item = {}) => {
  if (item.image?.sourceType === 'url') return item.image.url || ''
  return ''
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
const configurableComboIds = new Set([
  'food_menu_dash_double_stack',
  'food_menu_dash_golden_chicken_stack',
])
const configurableSauceIds = new Set(['food_menu_dash_chicken_tenders'])
const isConfigurableCombo = (item = {}) => configurableComboIds.has(item.id)
const isConfigurableItem = (item = {}) =>
  isConfigurableCombo(item) || configurableSauceIds.has(item.id)
const configurationActionLabel = (item = {}) =>
  isConfigurableCombo(item) ? t('选套餐', 'Choose combo') : t('选蘸酱', 'Choose dip')
const configurationAriaLabel = (item = {}) =>
  isConfigurableCombo(item)
    ? t('选择套餐内容', 'Choose combo contents')
    : t('选择蘸酱', 'Choose dipping sauce')

const selectionLabel = (line = {}) => {
  const selection = line.selection || {}
  return [
    t(selection.comboSideLabelZh, selection.comboSideLabelEn),
    t(selection.comboDrinkLabelZh, selection.comboDrinkLabelEn),
    t(selection.sauceLabelZh, selection.sauceLabelEn),
  ]
    .filter(Boolean)
    .join(' · ')
}

const addOrConfigureItem = (item, trigger) => {
  if (isConfigurableItem(item)) {
    emit('open-item', item.id)
    return
  }
  emit('add-item', item.id, 1, trigger)
}

const menuSectionLabel = (item = {}) =>
  menuSections.value.find((section) => section.key === item.menuSection)?.label ||
  t('现点现做', 'Made to order')

const ticketNumber = (item = {}) => resolveDashGrillTicketNumber(item)

const openSection = (sectionKey) => {
  activeSection.value = sectionKey
  searchQuery.value = ''
  emit('navigate', 'menu')
}

const selectSection = (sectionKey) => {
  activeSection.value = sectionKey
  searchQuery.value = ''
}

const orderStatus = (status = '') => {
  const states = {
    placed: { label: t('已下单', 'Placed'), step: 1, icon: 'fas fa-receipt' },
    accepted: { label: t('已接单', 'Accepted'), step: 2, icon: 'fas fa-store' },
    cooking: { label: t('制作中', 'On the grill'), step: 2, icon: 'fas fa-fire-burner' },
    rider_pickup: { label: t('配送中', 'On the way'), step: 3, icon: 'fas fa-motorcycle' },
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
    activeSection.value = menuSections.value[0]?.key || ''
    searchQuery.value = ''
    deliveryDetailsOpen.value = false
  },
)

watch(
  menuSections,
  (sections) => {
    if (!sections.some((section) => section.key === activeSection.value)) {
      activeSection.value = sections[0]?.key || ''
    }
  },
  { immediate: true },
)
</script>

<template>
  <article
    class="dash-grill-app min-h-screen bg-[var(--dash-paper)] pb-24 text-[var(--dash-ink)]"
    data-testid="food-delivery-store-shell"
    :data-store-id="restaurant.id"
    data-store-template="quick_service_chain"
  >
    <header
      class="sticky top-0 z-30 border-b border-black/10 bg-[var(--dash-paper)]/95 px-4 py-3 backdrop-blur"
    >
      <div class="flex h-11 items-center justify-between gap-3">
        <button
          type="button"
          class="inline-flex h-11 w-11 items-center justify-center text-[var(--dash-ink)]"
          :aria-label="t('返回主页', 'Home')"
          data-testid="food-delivery-store-home"
          @click="emit('go-home')"
        >
          <i class="fas fa-chevron-left text-sm"></i>
        </button>
        <button type="button" class="min-w-0 text-center" @click="emit('navigate', 'home')">
          <span class="dash-wordmark block truncate text-lg font-black uppercase">{{
            displayName
          }}</span>
          <span class="block text-[9px] font-bold text-black/55">{{
            t('热食快送', 'HOT & FAST')
          }}</span>
        </button>
        <button
          type="button"
          class="relative inline-flex h-11 w-11 items-center justify-center text-[var(--dash-ink)]"
          :aria-label="t('打开购物袋', 'Open bag')"
          data-testid="food-delivery-quick-service-header-bag"
          @click="emit('navigate', 'bag')"
        >
          <i class="fas fa-bag-shopping text-base"></i>
          <span
            v-if="cartQuantity"
            class="absolute right-0 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--dash-red)] px-1 text-[8px] font-black text-white"
            >{{ cartQuantity }}</span
          >
        </button>
      </div>
    </header>

    <template v-if="page === 'home'">
      <main data-testid="food-delivery-quick-service-home">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-4 border-b border-black/10 px-4 py-3 text-left"
          :aria-expanded="deliveryDetailsOpen"
          aria-controls="dash-grill-address-panel"
          data-testid="food-delivery-quick-service-address"
          @click="deliveryDetailsOpen = !deliveryDetailsOpen"
        >
          <span class="flex min-w-0 items-center gap-3">
            <span
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--dash-yellow)]"
            >
              <i class="fas fa-location-dot text-xs"></i>
            </span>
            <span class="min-w-0">
              <span class="block text-[9px] font-black uppercase text-black/50">{{
                t('配送到', 'DELIVER TO')
              }}</span>
              <span class="block truncate text-xs font-black">{{ deliveryAddress }}</span>
            </span>
          </span>
          <i
            class="fas fa-chevron-down text-[10px] transition-transform"
            :class="deliveryDetailsOpen ? 'rotate-180' : ''"
          ></i>
        </button>
        <section
          v-if="deliveryDetailsOpen"
          id="dash-grill-address-panel"
          class="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-black/10 bg-white px-4 py-4"
          data-testid="food-delivery-quick-service-address-panel"
        >
          <div class="min-w-0">
            <p class="text-[9px] font-black uppercase text-black/45">
              {{ t('当前配送地址', 'CURRENT ADDRESS') }}
            </p>
            <p class="mt-1 break-words text-xs font-black leading-5">{{ deliveryAddress }}</p>
          </div>
          <div class="shrink-0 text-right">
            <p class="text-[9px] font-black uppercase text-black/45">{{ t('预计', 'ETA') }}</p>
            <p class="mt-1 text-xs font-black text-[var(--dash-red)]">{{ etaText }}</p>
          </div>
        </section>

        <section
          class="relative min-h-[19rem] overflow-hidden bg-[var(--dash-red)] text-white"
          data-testid="food-delivery-quick-service-hero"
        >
          <img
            v-if="imageUrl(restaurant)"
            :src="imageUrl(restaurant)"
            :alt="restaurant.image?.alt || displayName"
            class="absolute inset-0 h-full w-full object-cover object-center opacity-70"
            :data-required-asset="requiredAssetPath(restaurant)"
            @error="handleImageError"
          />
          <div
            class="absolute inset-0 bg-[linear-gradient(90deg,rgba(32,26,23,0.9)_0%,rgba(32,26,23,0.58)_46%,rgba(32,26,23,0.06)_100%)]"
          ></div>
          <div class="relative flex min-h-[19rem] max-w-[68%] flex-col justify-end px-5 pb-6 pt-16">
            <span
              class="mb-3 inline-flex w-fit bg-[var(--dash-yellow)] px-2.5 py-1 text-[9px] font-black uppercase text-[var(--dash-ink)]"
            >
              {{ t('本周主打', 'THIS WEEK') }}
            </span>
            <h1 class="dash-display text-[2.5rem] font-black leading-[0.92] uppercase">
              {{ t('趁热开吃', 'BUILT FAST. SERVED HOT.') }}
            </h1>
            <p class="mt-3 max-w-[15rem] text-xs font-semibold leading-5 text-white/85">
              {{ shortDescription }}
            </p>
            <p class="mt-1 max-w-[15rem] text-[10px] font-black text-white/70">
              {{ etaText }} · {{ feeText }}
            </p>
            <button
              type="button"
              class="mt-5 inline-flex min-h-11 w-fit items-center gap-2 bg-white px-4 py-2 text-xs font-black text-[var(--dash-ink)]"
              data-testid="food-delivery-quick-service-order-now"
              @click="openSection('featured')"
            >
              {{ t('开始点餐', 'Order now') }}
              <i class="fas fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        </section>

        <section class="border-b border-black/10 px-4 py-5">
          <div class="grid grid-cols-3 gap-2">
            <div class="border-r border-black/10 pr-2">
              <p class="text-[9px] font-black uppercase text-black/45">
                {{ t('送达', 'ARRIVES') }}
              </p>
              <p class="mt-1 text-sm font-black">{{ etaText }}</p>
            </div>
            <div class="border-r border-black/10 px-2">
              <p class="text-[9px] font-black uppercase text-black/45">
                {{ t('距离', 'DISTANCE') }}
              </p>
              <p class="mt-1 text-sm font-black">{{ distanceText }}</p>
            </div>
            <div class="pl-2">
              <p class="text-[9px] font-black uppercase text-black/45">{{ t('评分', 'RATING') }}</p>
              <p class="mt-1 text-sm font-black">{{ restaurant.rating.toFixed(1) }} ★</p>
            </div>
          </div>
        </section>

        <section class="py-5" data-testid="food-delivery-store-menu-section-rail">
          <div class="flex items-end justify-between gap-3 px-4">
            <div>
              <p class="text-[9px] font-black uppercase text-[var(--dash-red)]">
                {{ t('快速选择', 'QUICK PICKS') }}
              </p>
              <h2 class="mt-1 text-xl font-black">{{ t('想吃什么？', 'What sounds good?') }}</h2>
            </div>
            <button type="button" class="text-xs font-black" @click="emit('navigate', 'menu')">
              {{ t('全部菜单', 'Full menu') }}
            </button>
          </div>
          <div
            class="dash-horizontal-scroll mt-4 flex gap-2 overflow-x-auto px-4 pb-2"
            tabindex="0"
            :aria-label="t('快捷分类', 'Quick categories')"
          >
            <button
              v-for="section in menuSections"
              :key="section.key"
              type="button"
              class="flex h-[4.75rem] w-[5.25rem] shrink-0 flex-col items-center justify-center gap-2 border border-black/10 bg-white text-center"
              :data-testid="`food-delivery-store-menu-section-${section.key}`"
              @click="openSection(section.key)"
            >
              <i :class="[section.icon, 'text-lg text-[var(--dash-red)]']"></i>
              <span class="text-[10px] font-black">{{ section.label }}</span>
            </button>
          </div>
        </section>

        <section
          class="bg-[var(--dash-yellow)] px-4 py-5"
          data-testid="food-delivery-quick-service-deals"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between gap-4 text-left"
            @click="emit('navigate', 'deals')"
          >
            <span>
              <span class="block text-[9px] font-black uppercase text-black/55">{{
                t('DASH DEAL', 'DASH DEAL')
              }}</span>
              <span class="dash-display mt-1 block text-3xl font-black uppercase">{{
                t('任搭两件', 'PICK ANY TWO')
              }}</span>
              <span class="mt-2 block text-xs font-bold">{{
                t('汉堡、薯条或甜点自由组合', 'Burgers, fries, or a treat. Your call.')
              }}</span>
            </span>
            <span
              class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--dash-ink)] text-white"
            >
              <i class="fas fa-arrow-right"></i>
            </span>
          </button>
        </section>

        <section class="px-4 py-6" data-testid="food-delivery-store-menu-items">
          <div class="flex items-end justify-between gap-3">
            <div>
              <p class="text-[9px] font-black uppercase text-[var(--dash-red)]">
                {{ t('大家都在点', 'POPULAR NOW') }}
              </p>
              <h2 class="mt-1 text-xl font-black">{{ t('热门餐品', 'Crowd favorites') }}</h2>
            </div>
          </div>
          <div
            class="dash-horizontal-scroll -mr-4 mt-4 flex snap-x gap-3 overflow-x-auto pb-3 pr-4"
            tabindex="0"
            :aria-label="t('热门餐品', 'Popular menu items')"
          >
            <article
              v-for="item in featuredItems"
              :key="item.id"
              class="dash-counter-ticket w-[13.75rem] shrink-0 snap-start"
              data-menu-card-style="order-ticket"
              :data-testid="`food-delivery-dash-ticket-${item.id}`"
            >
              <div class="dash-ticket-heading flex h-9 items-center justify-between gap-2 px-2.5">
                <span class="dash-display text-base">#{{ ticketNumber(item) }}</span>
                <span class="truncate text-[9px] font-black uppercase">{{
                  menuSectionLabel(item)
                }}</span>
              </div>
              <button
                type="button"
                class="block w-full text-left"
                :data-testid="`food-delivery-menu-open-${item.id}`"
                @click="emit('open-item', item.id)"
              >
                <span class="relative block aspect-[4/3] overflow-hidden bg-white">
                  <img
                    v-if="imageUrl(item)"
                    :src="imageUrl(item)"
                    :alt="item.image?.alt || item.title"
                    class="h-full w-full object-cover"
                    :data-required-asset="requiredAssetPath(item)"
                    @error="handleImageError"
                  />
                  <span class="absolute bottom-0 right-0 bg-white px-2 py-1 text-[9px] font-black">
                    {{ t('查看餐品', 'View item') }} <i class="fas fa-arrow-right ml-1"></i>
                  </span>
                </span>
                <span class="block px-3 pb-3 pt-2.5">
                  <span class="block truncate text-sm font-black">{{ item.title }}</span>
                  <span
                    class="mt-1 line-clamp-2 block min-h-8 text-[10px] font-semibold leading-4 text-black/55"
                    >{{ item.desc }}</span
                  >
                </span>
              </button>
              <div class="dash-ticket-footer flex min-h-14 items-stretch justify-between">
                <span class="flex min-w-0 flex-col justify-center px-3 py-2">
                  <span class="text-[8px] font-black uppercase text-black/45">{{
                    t('单价', 'Item price')
                  }}</span>
                  <strong class="truncate text-sm">{{ displayPrice(item) }}</strong>
                </span>
                <button
                  type="button"
                  class="inline-flex min-h-11 shrink-0 items-center gap-2 bg-[var(--dash-red)] px-3 text-[10px] font-black text-white"
                  :aria-label="
                    isConfigurableItem(item)
                      ? configurationAriaLabel(item)
                      : t('加入点单', 'Add to order')
                  "
                  :data-testid="`food-delivery-add-${item.id}`"
                  @click="addOrConfigureItem(item, $event.currentTarget)"
                >
                  <i
                    :class="[
                      isConfigurableItem(item) ? 'fas fa-sliders' : 'fas fa-plus',
                      'text-[9px]',
                    ]"
                  ></i>
                  <span>{{
                    isConfigurableItem(item) ? configurationActionLabel(item) : t('加入点单', 'Add')
                  }}</span>
                </button>
              </div>
            </article>
          </div>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'menu'">
      <main class="px-4 py-5" data-testid="food-delivery-quick-service-menu-page">
        <p class="text-[9px] font-black uppercase text-[var(--dash-red)]">
          {{ t('全部餐品', 'FULL MENU') }}
        </p>
        <h1 class="mt-1 text-3xl font-black">{{ t('点你喜欢的', 'Pick your lineup') }}</h1>
        <label class="mt-5 flex h-12 items-center gap-3 border border-black/15 bg-white px-3">
          <span class="sr-only">{{ t('搜索餐品', 'Search menu') }}</span>
          <i class="fas fa-magnifying-glass text-xs text-black/45"></i>
          <input
            v-model="searchQuery"
            type="search"
            class="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
            :placeholder="t('搜索汉堡、小食或饮品', 'Search burgers, sides, or drinks')"
            data-testid="food-delivery-quick-service-search"
          />
        </label>
        <div
          class="dash-horizontal-scroll mt-4 flex gap-2 overflow-x-auto pb-2"
          data-testid="food-delivery-store-menu-section-rail"
          tabindex="0"
          :aria-label="t('菜单分类', 'Menu categories')"
        >
          <button
            v-for="section in menuSections"
            :key="section.key"
            type="button"
            class="min-h-11 shrink-0 border px-3 py-2 text-xs font-black"
            :class="
              !searchQuery && activeSection === section.key
                ? 'border-[var(--dash-ink)] bg-[var(--dash-ink)] text-white'
                : 'border-black/10 bg-white'
            "
            :data-testid="`food-delivery-store-menu-section-${section.key}`"
            :aria-pressed="!searchQuery && activeSection === section.key"
            @click="selectSection(section.key)"
          >
            {{ section.label }} <span class="ml-1 opacity-55">{{ section.count }}</span>
          </button>
        </div>
        <div class="mt-5 space-y-5" data-testid="food-delivery-store-menu-items">
          <article
            v-for="item in filteredMenuItems"
            :key="item.id"
            class="dash-order-ticket"
            data-menu-card-style="order-ticket"
            :data-testid="`food-delivery-dash-ticket-${item.id}`"
          >
            <div class="dash-ticket-heading flex min-h-10 items-center gap-3 px-3 py-2">
              <span class="dash-display text-xl">#{{ ticketNumber(item) }}</span>
              <span class="min-w-0 flex-1 truncate text-[10px] font-black uppercase">{{
                menuSectionLabel(item)
              }}</span>
              <span class="text-[8px] font-black uppercase text-black/45">{{
                t('现点现做', 'Made to order')
              }}</span>
            </div>
            <button
              type="button"
              class="block w-full text-left"
              :data-testid="`food-delivery-menu-open-${item.id}`"
              @click="emit('open-item', item.id)"
            >
              <span class="relative block aspect-[16/10] overflow-hidden bg-white">
                <img
                  v-if="imageUrl(item)"
                  :src="imageUrl(item)"
                  :alt="item.image?.alt || item.title"
                  class="h-full w-full object-cover"
                  :data-required-asset="requiredAssetPath(item)"
                  @error="handleImageError"
                />
                <span
                  class="absolute bottom-0 right-0 inline-flex min-h-8 items-center gap-2 bg-[var(--dash-yellow)] px-3 text-[9px] font-black"
                >
                  {{ t('查看详情', 'View details') }} <i class="fas fa-arrow-right"></i>
                </span>
              </span>
              <span class="block px-4 pb-4 pt-3">
                <span class="block text-lg font-black leading-tight">{{ item.title }}</span>
                <span
                  class="mt-1.5 line-clamp-2 block text-[11px] font-semibold leading-5 text-black/55"
                >
                  {{ item.desc }}
                </span>
              </span>
            </button>
            <div class="dash-ticket-footer flex min-h-16 items-stretch justify-between">
              <span class="flex min-w-0 flex-col justify-center px-4 py-2.5">
                <span class="text-[8px] font-black uppercase text-black/45">{{
                  t('本单价格', 'Ticket price')
                }}</span>
                <strong class="truncate text-xl">{{ displayPrice(item) }}</strong>
              </span>
              <button
                type="button"
                class="inline-flex min-h-12 shrink-0 items-center gap-2 bg-[var(--dash-red)] px-5 text-xs font-black text-white"
                :aria-label="
                  isConfigurableItem(item)
                    ? configurationAriaLabel(item)
                    : t('加入点单', 'Add to order')
                "
                :data-testid="`food-delivery-add-${item.id}`"
                @click="addOrConfigureItem(item, $event.currentTarget)"
              >
                <i
                  :class="[
                    isConfigurableItem(item) ? 'fas fa-sliders' : 'fas fa-plus',
                    'text-[10px]',
                  ]"
                ></i>
                <span>{{
                  isConfigurableItem(item)
                    ? configurationActionLabel(item)
                    : t('加入点单', 'Add to order')
                }}</span>
              </button>
            </div>
          </article>
        </div>
        <div v-if="!filteredMenuItems.length" class="py-20 text-center">
          <i class="fas fa-magnifying-glass text-3xl text-[var(--dash-red)]"></i>
          <p class="mt-3 text-sm font-black">{{ t('没有找到餐品', 'No menu matches') }}</p>
        </div>
      </main>
    </template>

    <template v-else-if="page === 'deals'">
      <main data-testid="food-delivery-quick-service-deals-page">
        <section class="bg-[var(--dash-yellow)] px-5 pb-8 pt-7">
          <p class="text-[9px] font-black uppercase text-black/55">
            {{ t('DASH DEALS', 'DASH DEALS') }}
          </p>
          <h1
            class="dash-display mt-2 max-w-[19rem] text-[2.8rem] font-black leading-[0.9] uppercase"
          >
            {{ t('每一口都更划算', 'MORE BITE FOR YOUR BUCK') }}
          </h1>
          <p class="mt-4 max-w-[18rem] text-xs font-bold leading-5">
            {{
              t(
                '套餐、加购和限时组合都集中在这里。',
                'Combos, add-ons, and limited drops live here.',
              )
            }}
          </p>
        </section>
        <section class="divide-y divide-black/10 px-4">
          <button
            type="button"
            class="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 py-5 text-left"
            @click="openSection('featured')"
          >
            <span
              class="inline-flex h-14 w-14 items-center justify-center bg-[var(--dash-red)] text-xl text-white"
              ><i class="fas fa-burger"></i
            ></span>
            <span class="min-w-0"
              ><span class="block text-sm font-black">{{
                t('双人分享组合', 'Two-can-dash combo')
              }}</span
              ><span class="mt-1 block text-[10px] font-semibold text-black/55">{{
                t('两份主食、一份大薯和两杯饮品', 'Two mains, large fries, and two drinks')
              }}</span></span
            >
            <i class="fas fa-chevron-right text-xs"></i>
          </button>
          <button
            type="button"
            class="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 py-5 text-left"
            @click="openSection('sides')"
          >
            <span
              class="inline-flex h-14 w-14 items-center justify-center bg-[var(--dash-ink)] text-xl text-white"
              ><i class="fas fa-box-open"></i
            ></span>
            <span class="min-w-0"
              ><span class="block text-sm font-black">{{
                t('小食第二件半价', 'Half-price second side')
              }}</span
              ><span class="mt-1 block text-[10px] font-semibold text-black/55">{{
                t('自由搭配薯条和脆鸡', 'Mix fries and crispy chicken')
              }}</span></span
            >
            <i class="fas fa-chevron-right text-xs"></i>
          </button>
          <button
            type="button"
            class="grid w-full grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 py-5 text-left"
            @click="openSection('treats')"
          >
            <span
              class="inline-flex h-14 w-14 items-center justify-center bg-white text-xl text-[var(--dash-red)]"
              ><i class="fas fa-ice-cream"></i
            ></span>
            <span class="min-w-0"
              ><span class="block text-sm font-black">{{
                t('餐后甜点加购', 'Add a sweet finish')
              }}</span
              ><span class="mt-1 block text-[10px] font-semibold text-black/55">{{
                t('随主餐低价加购指定甜点', 'Add selected treats to any main')
              }}</span></span
            >
            <i class="fas fa-chevron-right text-xs"></i>
          </button>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'bag'">
      <main class="px-4 py-5" data-testid="food-delivery-quick-service-bag-page">
        <p class="text-[9px] font-black uppercase text-[var(--dash-red)]">
          {{ t('你的点单', 'YOUR ORDER') }}
        </p>
        <div class="mt-1 flex items-end justify-between gap-3">
          <h1 class="text-3xl font-black">{{ t('购物袋', 'Bag') }}</h1>
          <span class="text-xs font-black">{{ cartQuantity }} {{ t('件', 'items') }}</span>
        </div>

        <section
          v-if="cartLines.length"
          class="mt-5 divide-y divide-black/10"
          data-testid="food-delivery-cart-panel"
        >
          <article
            v-for="line in cartLines"
            :key="line.lineId || line.menuItemId"
            class="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 py-4"
            :data-testid="`food-delivery-cart-${line.lineId || line.menuItemId}`"
            :data-menu-item-id="line.menuItemId"
          >
            <div class="aspect-square overflow-hidden bg-white">
              <img
                v-if="imageUrl(line.menuItem)"
                :src="imageUrl(line.menuItem)"
                :alt="line.menuItem.title"
                class="h-full w-full object-cover"
                :data-required-asset="requiredAssetPath(line.menuItem)"
                @error="handleImageError"
              />
            </div>
            <div class="flex min-w-0 flex-col justify-between">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <h2 class="truncate text-sm font-black">{{ line.menuItem.title }}</h2>
                  <p
                    v-if="selectionLabel(line)"
                    class="mt-1 text-[10px] font-black leading-4 text-[var(--dash-red)]"
                    data-testid="food-delivery-dash-cart-combo-selection"
                  >
                    {{ selectionLabel(line) }}
                  </p>
                  <p class="mt-1 text-[10px] font-bold text-black/55">
                    {{ line.subtotal }} {{ line.currency }}
                  </p>
                </div>
                <button
                  type="button"
                  class="inline-flex h-11 w-11 items-center justify-center text-black/45"
                  :aria-label="t('移除', 'Remove')"
                  @click="emit('update-cart', line.lineId || line.menuItemId, 0)"
                >
                  <i class="fas fa-trash-can text-xs"></i>
                </button>
              </div>
              <div class="mt-3 inline-flex h-11 w-fit items-center border border-black/15 bg-white">
                <button
                  type="button"
                  class="inline-flex h-11 w-11 items-center justify-center"
                  :aria-label="t('减少数量', 'Decrease quantity')"
                  @click="emit('update-cart', line.lineId || line.menuItemId, line.quantity - 1)"
                >
                  <i class="fas fa-minus text-[9px]"></i>
                </button>
                <span class="min-w-8 text-center text-xs font-black">{{ line.quantity }}</span>
                <button
                  type="button"
                  class="inline-flex h-11 w-11 items-center justify-center"
                  :aria-label="t('增加数量', 'Increase quantity')"
                  @click="emit('update-cart', line.lineId || line.menuItemId, line.quantity + 1)"
                >
                  <i class="fas fa-plus text-[9px]"></i>
                </button>
              </div>
            </div>
          </article>
          <div class="space-y-2 py-5 text-xs font-semibold">
            <div class="flex justify-between gap-3 text-black/55">
              <span>{{ t('配送费', 'Delivery') }}</span
              ><span>{{ feeText }}</span>
            </div>
            <div class="flex items-end justify-between gap-3 border-t border-black/10 pt-4">
              <span class="text-base font-black">{{ t('合计', 'Total') }}</span
              ><span class="text-2xl font-black"
                >{{ cartTotal.amount }} {{ cartTotal.currency }}</span
              >
            </div>
          </div>
          <button
            type="button"
            class="min-h-12 w-full bg-[var(--dash-red)] px-4 text-sm font-black text-white"
            data-testid="food-delivery-checkout"
            @click="emit('checkout')"
          >
            {{ t('确认并结算', 'Review checkout') }}
          </button>
        </section>

        <section v-else class="flex min-h-[28rem] flex-col items-center justify-center text-center">
          <span
            class="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--dash-yellow)] text-3xl"
            ><i class="fas fa-bag-shopping"></i
          ></span>
          <h2 class="mt-5 text-xl font-black">{{ t('购物袋还是空的', 'Your bag is waiting') }}</h2>
          <p class="mt-2 max-w-[16rem] text-xs font-semibold leading-5 text-black/55">
            {{
              t(
                '先选一份招牌汉堡，再搭配小食和饮品。',
                'Start with a signature stack, then add sides and a drink.',
              )
            }}
          </p>
          <button
            type="button"
            class="mt-5 min-h-11 bg-[var(--dash-ink)] px-5 text-xs font-black text-white"
            @click="emit('navigate', 'menu')"
          >
            {{ t('浏览菜单', 'Browse menu') }}
          </button>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'orders'">
      <main class="px-4 py-5" data-testid="food-delivery-quick-service-orders-page">
        <p class="text-[9px] font-black uppercase text-[var(--dash-red)]">
          {{ t('配送进度', 'ORDER TRACKER') }}
        </p>
        <h1 class="mt-1 text-3xl font-black">{{ t('订单', 'Orders') }}</h1>
        <div v-if="orders.length" class="mt-5 divide-y divide-black/10">
          <button
            v-for="order in orders"
            :key="order.id"
            type="button"
            class="flex w-full items-start justify-between gap-4 py-4 text-left"
            :data-testid="`food-delivery-order-${order.id}`"
            @click="emit('navigate', 'order', order.id)"
          >
            <span class="flex min-w-0 items-start gap-3"
              ><span
                class="inline-flex h-10 w-10 shrink-0 items-center justify-center bg-[var(--dash-yellow)]"
                ><i :class="orderStatus(order.status).icon"></i></span
              ><span class="min-w-0"
                ><span class="block text-sm font-black">{{ orderStatus(order.status).label }}</span
                ><span class="mt-1 block truncate text-[10px] font-semibold text-black/55">{{
                  order.items.map((item) => item.title).join(' · ')
                }}</span
                ><span class="mt-1 block text-[9px] font-bold text-black/40">{{
                  orderTime(order.createdAt)
                }}</span></span
              ></span
            >
            <span class="shrink-0 text-right"
              ><span class="block text-sm font-black"
                >{{ (order.totalCents / 100).toFixed(2) }} {{ order.currency }}</span
              ><i class="fas fa-chevron-right mt-3 text-[10px] text-[var(--dash-red)]"></i
            ></span>
          </button>
        </div>
        <div v-else class="flex min-h-[28rem] flex-col items-center justify-center text-center">
          <i class="fas fa-receipt text-4xl text-[var(--dash-red)]"></i>
          <h2 class="mt-5 text-xl font-black">{{ t('还没有快餐订单', 'No Dash orders yet') }}</h2>
          <p class="mt-2 max-w-[16rem] text-xs font-semibold leading-5 text-black/55">
            {{
              t(
                '结算后，制作和配送进度会出现在这里。',
                'Grill and delivery progress will appear here after checkout.',
              )
            }}
          </p>
          <button
            type="button"
            class="mt-5 min-h-11 bg-[var(--dash-red)] px-5 text-xs font-black text-white"
            @click="emit('navigate', 'menu')"
          >
            {{ t('开始点餐', 'Start an order') }}
          </button>
        </div>
      </main>
    </template>

    <template v-else-if="page === 'order'">
      <main data-testid="food-delivery-quick-service-order-page">
        <section v-if="activeOrder" class="bg-[var(--dash-ink)] px-5 pb-8 pt-7 text-white">
          <button
            type="button"
            class="inline-flex h-11 w-11 items-center justify-center bg-white/10"
            :aria-label="t('返回订单', 'Back to orders')"
            @click="emit('navigate', 'orders')"
          >
            <i class="fas fa-chevron-left text-xs"></i>
          </button>
          <p class="mt-8 text-[9px] font-black uppercase text-[var(--dash-yellow)]">
            {{ t('订单进度', 'ORDER STATUS') }}
          </p>
          <h1 class="mt-2 text-3xl font-black">{{ orderStatus(activeOrder.status).label }}</h1>
          <p class="mt-2 text-xs font-semibold text-white/65">{{ activeOrder.deliveryAddress }}</p>
          <div class="mt-6 grid grid-cols-4 gap-1" aria-hidden="true">
            <span
              v-for="step in 4"
              :key="step"
              class="h-1.5"
              :class="
                orderStatus(activeOrder.status).step >= step
                  ? 'bg-[var(--dash-yellow)]'
                  : 'bg-white/15'
              "
            ></span>
          </div>
        </section>
        <section v-if="activeOrder" class="px-4 py-5">
          <div class="flex items-end justify-between gap-3">
            <h2 class="text-lg font-black">{{ t('本次点单', 'Your lineup') }}</h2>
            <span class="text-lg font-black"
              >{{ (activeOrder.totalCents / 100).toFixed(2) }} {{ activeOrder.currency }}</span
            >
          </div>
          <div class="mt-4 divide-y divide-black/10">
            <div
              v-for="item in activeOrder.items"
              :key="item.id"
              class="flex items-start justify-between gap-3 py-3 text-xs"
            >
              <div class="min-w-0">
                <span class="block font-black">{{ item.title }}</span>
                <span
                  v-if="selectionLabel(item)"
                  class="mt-1 block font-black leading-4 text-[var(--dash-red)]"
                  data-testid="food-delivery-dash-order-combo-selection"
                >
                  {{ selectionLabel(item) }}
                </span>
                <span class="mt-1 block font-semibold text-black/45">× {{ item.quantity }}</span>
              </div>
              <span class="font-black">{{
                ((item.unitPriceCents * item.quantity) / 100).toFixed(2)
              }}</span>
            </div>
          </div>
          <div class="mt-5 bg-[var(--dash-yellow)] p-4">
            <p class="text-[9px] font-black uppercase text-black/50">
              {{ t('接下来', 'WHAT HAPPENS NEXT') }}
            </p>
            <p class="mt-2 text-sm font-black">
              {{
                t(
                  '餐厅接单后会继续更新制作与配送状态。',
                  'We will keep grill and delivery progress updated here.',
                )
              }}
            </p>
          </div>
          <button
            type="button"
            class="mt-4 flex min-h-12 w-full items-center justify-center gap-2 border border-black/15 bg-white px-4 text-xs font-black"
            data-testid="food-delivery-quick-service-order-support"
            @click="emit('open-support', activeOrder.id)"
          >
            <i class="fas fa-headset" aria-hidden="true"></i>
            {{ t('订单帮助与配送沟通', 'Order help & delivery contact') }}
          </button>
        </section>
        <section
          v-else
          class="flex min-h-[34rem] flex-col items-center justify-center px-6 text-center"
        >
          <i class="fas fa-receipt text-4xl text-[var(--dash-red)]"></i>
          <h1 class="mt-4 text-xl font-black">{{ t('找不到这个订单', 'Order not found') }}</h1>
          <button
            type="button"
            class="mt-5 min-h-11 bg-[var(--dash-ink)] px-5 text-xs font-black text-white"
            @click="emit('navigate', 'orders')"
          >
            {{ t('查看全部订单', 'View orders') }}
          </button>
        </section>
      </main>
    </template>

    <nav
      class="fixed bottom-0 left-1/2 z-40 grid w-full max-w-md -translate-x-1/2 grid-cols-5 border-t border-black/10 bg-[var(--dash-paper)] px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(32,26,23,0.08)]"
      data-testid="food-delivery-quick-service-nav"
    >
      <button
        v-for="item in [
          { key: 'home', label: t('首页', 'Home'), icon: 'fas fa-house' },
          { key: 'menu', label: t('菜单', 'Menu'), icon: 'fas fa-utensils' },
          { key: 'deals', label: t('优惠', 'Deals'), icon: 'fas fa-ticket' },
          { key: 'bag', label: t('购物袋', 'Bag'), icon: 'fas fa-bag-shopping' },
          { key: 'orders', label: t('订单', 'Orders'), icon: 'fas fa-receipt' },
        ]"
        :key="item.key"
        type="button"
        class="relative flex min-h-12 flex-col items-center justify-center gap-1 text-[9px] font-black"
        :class="activeNavKey === item.key ? 'text-[var(--dash-red)]' : 'text-black/45'"
        :aria-current="activeNavKey === item.key ? 'page' : undefined"
        :data-testid="`food-delivery-quick-service-nav-${item.key}`"
        @click="emit('navigate', item.key)"
      >
        <span
          v-if="activeNavKey === item.key"
          class="absolute top-0 h-0.5 w-7 bg-[var(--dash-red)]"
        ></span>
        <i :class="[item.icon, 'text-sm']"></i><span>{{ item.label }}</span>
        <span
          v-if="item.key === 'bag' && cartQuantity"
          class="absolute right-2 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--dash-red)] px-1 text-[8px] text-white"
          >{{ cartQuantity }}</span
        >
      </button>
    </nav>
  </article>
</template>

<style scoped>
.dash-grill-app {
  --dash-red: #e33d2e;
  --dash-yellow: #ffc833;
  --dash-paper: #fff9ec;
  --dash-ink: #201a17;
  font-family: 'Avenir Next', 'Trebuchet MS', sans-serif;
  letter-spacing: 0;
}

.dash-display,
.dash-wordmark {
  font-family: Impact, 'Arial Black', sans-serif;
  font-weight: 900;
  letter-spacing: 0;
}

.dash-horizontal-scroll {
  overscroll-behavior-inline: contain;
  scroll-behavior: smooth;
  scrollbar-color: var(--dash-red) rgb(32 26 23 / 12%);
  scrollbar-width: thin;
}

.dash-horizontal-scroll::-webkit-scrollbar {
  height: 5px;
}

.dash-horizontal-scroll::-webkit-scrollbar-track {
  background: rgb(32 26 23 / 12%);
}

.dash-horizontal-scroll::-webkit-scrollbar-thumb {
  background: var(--dash-red);
}

.dash-counter-ticket,
.dash-order-ticket {
  border: 2px solid var(--dash-ink);
  background: #fffef8;
  box-shadow: 5px 5px 0 var(--dash-yellow);
}

.dash-counter-ticket {
  min-height: 21.75rem;
}

.dash-ticket-heading {
  border-bottom: 2px solid var(--dash-ink);
  background: var(--dash-yellow);
}

.dash-ticket-footer {
  position: relative;
  border-top: 2px dashed var(--dash-ink);
}

.dash-ticket-footer::before,
.dash-ticket-footer::after {
  position: absolute;
  top: -8px;
  width: 14px;
  height: 14px;
  border: 2px solid var(--dash-ink);
  border-radius: 50%;
  background: var(--dash-paper);
  content: '';
}

.dash-ticket-footer::before {
  left: -9px;
}

.dash-ticket-footer::after {
  right: -9px;
}

.dash-grill-app :is(button, input, .dash-horizontal-scroll):focus-visible {
  outline: 2px solid var(--dash-ink);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .dash-grill-app * {
    scroll-behavior: auto !important;
    transition-duration: 0s !important;
  }
}
</style>
