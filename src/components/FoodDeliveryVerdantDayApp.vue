<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from '../composables/useI18n'
import { resolveFoodDeliveryAssetUrl } from '../lib/food-shop-presentation'
import { projectUiAssetUrl } from '../lib/project-assets'

const props = defineProps({
  restaurant: { type: Object, required: true },
  displayName: { type: String, default: 'Verdant Day' },
  shortDescription: { type: String, default: '' },
  menuItems: { type: Array, default: () => [] },
  activeItem: { type: Object, default: null },
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
  'edit-item',
  'add-item',
  'update-cart',
  'checkout',
])

const { t } = useI18n()
const defaultSectionKey = 'salads'
const activeSection = ref(defaultSectionKey)
const searchQuery = ref('')
const detailQuantity = ref(1)
const addressOpen = ref(false)
const promotionOpen = ref(false)

const sectionOptions = Object.freeze([
  { key: 'salads', labelZh: '沙拉', labelEn: 'Salads', icon: 'fas fa-leaf' },
  { key: 'warm_bowls', labelZh: '暖碗', labelEn: 'Warm bowls', icon: 'fas fa-bowl-food' },
  { key: 'wraps_toasts', labelZh: '卷饼吐司', labelEn: 'Wraps', icon: 'fas fa-wheat-awn' },
  { key: 'drinks', labelZh: '清饮', labelEn: 'Drinks', icon: 'fas fa-glass-water' },
  { key: 'small_sweets', labelZh: '轻甜', labelEn: 'Light sweets', icon: 'fas fa-cookie-bite' },
])
const fallbackSectionOption = Object.freeze({
  key: 'other',
  labelZh: '其他',
  labelEn: 'More',
  icon: 'fas fa-ellipsis',
})
const knownSectionKeys = new Set(sectionOptions.map((section) => section.key))

const verdantAssetUrl = (assetPath) =>
  projectUiAssetUrl(`apps/food-delivery/${assetPath}`)
const brandHeroAssetPath = 'verdant-day/brand/verdant-day-brand-hero-preview-02.png'
const brandHeroArtAssetPath = 'verdant-day/brand/verdant-day-brand-hero-art-01.png'
const lunchMomentAssetPath = 'verdant-day/promotions/verdant-day-promo-lunch-moment-01.png'
const mealSpreadAssetPath = 'verdant-day/promotions/verdant-day-promo-meal-spread-01.png'
const brandHeroUrl = verdantAssetUrl(brandHeroAssetPath)
const brandHeroArtUrl = verdantAssetUrl(brandHeroArtAssetPath)
const lunchMomentUrl = verdantAssetUrl(lunchMomentAssetPath)
const mealSpreadUrl = verdantAssetUrl(mealSpreadAssetPath)

const itemsForSection = (sectionKey) =>
  props.menuItems.filter((item) =>
    sectionKey === fallbackSectionOption.key
      ? !knownSectionKeys.has(item.menuSection)
      : item.menuSection === sectionKey,
  )

const menuSections = computed(() => {
  const sections = sectionOptions
    .map((section) => ({
      ...section,
      label: t(section.labelZh, section.labelEn),
      count: itemsForSection(section.key).length,
    }))
    .filter((section) => section.count > 0)
  const fallbackCount = itemsForSection(fallbackSectionOption.key).length

  if (fallbackCount) {
    sections.push({
      ...fallbackSectionOption,
      label: t(fallbackSectionOption.labelZh, fallbackSectionOption.labelEn),
      count: fallbackCount,
    })
  }

  return sections
})

const resolvedActiveSection = computed(() => {
  if (menuSections.value.some((section) => section.key === activeSection.value)) {
    return activeSection.value
  }
  return menuSections.value[0]?.key || ''
})

const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLocaleLowerCase())
const isMenuSearching = computed(() => Boolean(normalizedSearchQuery.value))

const itemMatchesSearch = (item) =>
  [item.title, item.desc, item.ingredients]
    .filter(Boolean)
    .some((value) => String(value).toLocaleLowerCase().includes(normalizedSearchQuery.value))

const visibleMenuGroups = computed(() => {
  const sections = isMenuSearching.value
    ? menuSections.value
    : menuSections.value.filter((section) => section.key === resolvedActiveSection.value)

  return sections
    .map((section) => ({
      ...section,
      items: itemsForSection(section.key).filter(
        (item) => !isMenuSearching.value || itemMatchesSearch(item),
      ),
    }))
    .filter((section) => section.items.length > 0)
})

const featuredItemIds = Object.freeze([
  'food_menu_verdant_aegean_garden',
  'food_menu_verdant_golden_grain',
  'food_menu_verdant_avocado_herb_fold',
])
const featuredItemIdSet = new Set(featuredItemIds)
const featuredItems = computed(() =>
  featuredItemIds
    .map((itemId) => props.menuItems.find((item) => item.id === itemId))
    .filter(Boolean),
)

const dayPicks = computed(() =>
  props.menuItems.filter((item) => !featuredItemIdSet.has(item.id)).slice(0, 4),
)
const activeNavKey = computed(() => {
  if (props.page === 'detail') return 'menu'
  if (props.page === 'order') return 'orders'
  return props.page
})
const backTarget = computed(() => {
  if (props.page === 'detail') return 'menu'
  if (props.page === 'order') return 'orders'
  return 'home'
})
const backLabel = computed(() =>
  props.page === 'home' ? t('返回手机主页', 'Return to Home') : t('返回', 'Back'),
)

const handleBack = () => {
  if (props.page === 'home') {
    emit('go-home')
    return
  }
  emit('navigate', backTarget.value)
}

const openPromotionMenu = () => {
  promotionOpen.value = false
  emit('navigate', 'menu')
}

const imageUrl = (item = {}) =>
  item.image?.sourceType === 'url' ? resolveFoodDeliveryAssetUrl(item.image.url) : ''

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

const detailTotal = computed(() => {
  const unitPriceCents = Number(props.activeItem?.priceCents || 0)
  const currency = props.activeItem?.currency || props.restaurant.currency || 'CNY'
  return `${((unitPriceCents * detailQuantity.value) / 100).toFixed(2)} ${currency}`
})

const openSection = (sectionKey = defaultSectionKey) => {
  activeSection.value = sectionKey
  searchQuery.value = ''
  emit('navigate', 'menu')
}

const selectMenuSection = (sectionKey) => {
  activeSection.value = sectionKey
  searchQuery.value = ''
}

const addActiveItem = (event) => {
  if (!props.activeItem?.id) return
  emit('add-item', props.activeItem.id, detailQuantity.value, event?.currentTarget)
}

const orderStatus = (status = '') => {
  const states = {
    placed: { label: t('已下单', 'Placed'), step: 1, icon: 'fas fa-receipt' },
    accepted: { label: t('厨房确认', 'Kitchen confirmed'), step: 2, icon: 'fas fa-check' },
    cooking: { label: t('新鲜制作', 'Preparing fresh'), step: 2, icon: 'fas fa-kitchen-set' },
    rider_pickup: { label: t('配送途中', 'On the way'), step: 3, icon: 'fas fa-bicycle' },
    delivered: { label: t('已经送达', 'Delivered'), step: 4, icon: 'fas fa-circle-check' },
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
  () => [props.restaurant.id, props.activeItem?.id],
  () => {
    detailQuantity.value = 1
  },
)

watch(
  () => props.restaurant.id,
  () => {
    activeSection.value = defaultSectionKey
    searchQuery.value = ''
    addressOpen.value = false
    promotionOpen.value = false
  },
)

watch(
  () => props.page,
  (page) => {
    if (page !== 'home') promotionOpen.value = false
  },
)
</script>

<template>
  <article
    class="verdant-day-app min-h-screen bg-[var(--verdant-canvas)] pb-24 text-[var(--verdant-ink)]"
    data-testid="food-delivery-store-shell"
    :data-store-id="restaurant.id"
    data-store-template="minimal_light_food"
  >
    <header
      class="verdant-topbar sticky top-0 z-30 border-b border-[var(--verdant-line)] px-4 py-2.5 backdrop-blur"
    >
      <div class="grid h-11 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
        <button
          type="button"
          class="verdant-icon-button inline-flex h-11 w-11 items-center justify-center rounded-full"
          :aria-label="backLabel"
          :title="backLabel"
          data-testid="food-delivery-store-home"
          @click="handleBack"
        >
          <i class="fas fa-chevron-left text-xs"></i>
        </button>
        <button type="button" class="min-w-0 text-center" @click="emit('navigate', 'home')">
          <span class="verdant-wordmark block truncate text-lg font-black">{{ displayName }}</span>
          <span class="block truncate text-[9px] font-bold text-[var(--verdant-muted)]">
            {{ t('每日轻盈厨房', 'EVERYDAY LIGHT KITCHEN') }}
          </span>
        </button>
        <button
          type="button"
          class="verdant-icon-button relative inline-flex h-11 w-11 items-center justify-center rounded-full"
          :aria-label="t('打开购物袋', 'Open bag')"
          title="Bag"
          data-testid="food-delivery-light-header-bag"
          @click="emit('navigate', 'bag')"
        >
          <i class="fas fa-bag-shopping text-sm"></i>
          <span
            v-if="cartQuantity"
            class="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--verdant-surface)] bg-[var(--verdant-accent)] px-1 text-[8px] font-black text-[var(--verdant-on-accent)]"
            >{{ cartQuantity }}</span
          >
        </button>
      </div>
    </header>

    <template v-if="page === 'home'">
      <main data-testid="food-delivery-light-home">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-4 border-b border-[var(--verdant-line)] bg-[var(--verdant-surface)] px-4 py-3 text-left"
          :aria-expanded="addressOpen"
          aria-controls="verdant-address-panel"
          data-testid="food-delivery-light-address"
          @click="addressOpen = !addressOpen"
        >
          <span class="flex min-w-0 items-center gap-3">
            <span
              class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--verdant-primary)] text-[var(--verdant-on-primary)]"
            >
              <i class="fas fa-location-dot text-[10px]"></i>
            </span>
            <span class="min-w-0">
              <span class="block text-[9px] font-bold text-[var(--verdant-muted)]">{{
                t('送到', 'Deliver to')
              }}</span>
              <span class="block truncate text-xs font-black">{{ deliveryAddress }}</span>
            </span>
          </span>
          <span
            class="flex shrink-0 items-center gap-2 text-[10px] font-black text-[var(--verdant-leaf)]"
          >
            {{ etaText }}
            <i
              class="fas fa-chevron-down text-[9px] transition-transform"
              :class="addressOpen ? 'rotate-180' : ''"
            ></i>
          </span>
        </button>
        <section
          v-if="addressOpen"
          id="verdant-address-panel"
          class="grid grid-cols-3 border-b border-[var(--verdant-line)] bg-[var(--verdant-surface)]"
          data-testid="food-delivery-light-address-panel"
        >
          <div class="border-r border-[var(--verdant-line)] px-3 py-3">
            <p class="text-[9px] font-bold text-[var(--verdant-muted)]">
              {{ t('送达', 'ARRIVES') }}
            </p>
            <p class="mt-1 text-xs font-black">{{ etaText }}</p>
          </div>
          <div class="border-r border-[var(--verdant-line)] px-3 py-3">
            <p class="text-[9px] font-bold text-[var(--verdant-muted)]">
              {{ t('距离', 'DISTANCE') }}
            </p>
            <p class="mt-1 text-xs font-black">{{ distanceText }}</p>
          </div>
          <div class="px-3 py-3">
            <p class="text-[9px] font-bold text-[var(--verdant-muted)]">
              {{ t('配送', 'DELIVERY') }}
            </p>
            <p class="mt-1 text-xs font-black">{{ feeText }}</p>
          </div>
        </section>

        <section class="px-4 pb-4 pt-4" data-testid="food-delivery-light-hero">
          <div
            class="verdant-brand-hero relative aspect-[2/1] w-full overflow-hidden border border-[var(--verdant-line)] bg-[var(--verdant-primary-soft)]"
            data-testid="food-delivery-light-brand-hero"
          >
            <span
              class="inline-flex h-full w-full items-center justify-center overflow-hidden bg-[var(--verdant-primary-soft)] text-[var(--verdant-primary)]"
            >
              <img
                v-if="brandHeroUrl"
                :src="brandHeroUrl"
                :alt="
                  t(
                    `${displayName} 品牌广告，嫩芽吉祥物与谷物碗，英文标语 Eat bright. Feel light.`,
                    `${displayName} brand campaign with a sprout mascot, grain bowl, and the slogan Eat bright. Feel light.`,
                  )
                "
                class="h-full w-full object-cover"
                :data-required-asset="brandHeroAssetPath"
                data-testid="food-delivery-light-hero-image"
                @error="handleImageError"
              />
              <i v-else class="fas fa-seedling text-2xl" aria-hidden="true"></i>
            </span>
          </div>

          <button
            type="button"
            class="verdant-search mt-4 flex min-h-12 w-full items-center gap-3 rounded-md px-4 text-left text-xs font-semibold text-[var(--verdant-muted)]"
            data-testid="food-delivery-light-search"
            @click="emit('navigate', 'menu')"
          >
            <i class="fas fa-magnifying-glass text-[var(--verdant-ink)]"></i>
            <span>{{ t('搜索沙拉、暖碗或清饮', 'Search salads, bowls, or sips') }}</span>
          </button>
        </section>

        <nav
          class="verdant-category-shortcuts grid grid-cols-5 gap-2 border-y border-[var(--verdant-line)] px-4 py-4"
          data-testid="food-delivery-store-menu-section-rail"
          :aria-label="t('轻食分类', 'Light food categories')"
        >
          <button
            v-for="section in menuSections"
            :key="section.key"
            type="button"
            class="verdant-category-shortcut flex min-h-[5.25rem] min-w-0 flex-col items-center justify-start gap-2 text-center text-[10px] font-black leading-3 text-[var(--verdant-muted)]"
            :data-section="section.key"
            :data-testid="`food-delivery-store-menu-section-${section.key}`"
            @click="openSection(section.key)"
          >
            <span
              class="verdant-category-mark inline-flex h-11 w-11 items-center justify-center rounded-md"
              aria-hidden="true"
            >
              <i :class="[section.icon, 'text-sm']"></i>
            </span>
            <span class="line-clamp-2 min-h-6">{{ section.label }}</span>
          </button>
        </nav>

        <section class="px-4 pt-6" data-testid="food-delivery-light-campaign">
          <button
            type="button"
            class="verdant-campaign relative block aspect-[16/9] w-full overflow-hidden text-left"
            aria-haspopup="dialog"
            data-testid="food-delivery-light-campaign-open"
            @click="promotionOpen = true"
          >
            <img
              :src="lunchMomentUrl"
              alt="A bright Verdant Day lunch with a wrap and cucumber mint cooler"
              class="verdant-campaign-image absolute inset-0 h-full w-full object-cover"
              :data-required-asset="lunchMomentAssetPath"
              @error="handleImageError"
            />
            <span class="verdant-campaign-shade absolute inset-0"></span>
            <span class="absolute inset-y-0 left-0 flex w-[52%] flex-col justify-between p-4">
              <span class="text-[9px] font-black text-[#f0cf68]">THE VERDANT TABLE</span>
              <span>
                <span
                  class="verdant-display block max-w-[10rem] text-xl font-black leading-6 text-white"
                >
                  Lunch, in full color.
                </span>
                <span
                  class="mt-2 inline-flex items-center gap-2 text-[10px] font-black text-white/80"
                >
                  View the midday edit
                  <i class="fas fa-arrow-right text-[9px]" aria-hidden="true"></i>
                </span>
              </span>
            </span>
          </button>
        </section>

        <section class="py-7" data-testid="food-delivery-light-featured">
          <div class="flex items-end justify-between gap-4 px-4">
            <div>
              <p class="text-[10px] font-black text-[var(--verdant-coral)]">
                {{ t('今日优选', 'TODAY') }}
              </p>
              <h2 class="verdant-display mt-1 text-2xl font-black">
                {{ t('轻盈人气榜', 'Garden favourites') }}
              </h2>
            </div>
            <button
              type="button"
              class="min-h-11 text-xs font-black"
              @click="emit('navigate', 'menu')"
            >
              {{ t('看全部', 'See all') }}
            </button>
          </div>

          <div
            class="verdant-scroll verdant-featured-scroll mt-5 flex gap-3 overflow-x-auto px-4 pb-4 pt-7"
          >
            <article
              v-for="item in featuredItems"
              :key="item.id"
              class="verdant-card relative w-44 shrink-0 rounded-md px-3 pb-4 pt-[6.75rem]"
              :data-testid="`food-delivery-menu-${item.id}`"
            >
              <button
                type="button"
                class="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 -translate-y-7 overflow-hidden rounded-full border-[10px] border-[var(--verdant-canvas)] bg-[var(--verdant-soft)]"
                :aria-label="t(`查看 ${item.title}`, `View ${item.title}`)"
                :data-testid="`food-delivery-menu-open-${item.id}`"
                @click="emit('open-item', item.id)"
              >
                <img
                  v-if="imageUrl(item)"
                  :src="imageUrl(item)"
                  :alt="item.image?.alt || item.title"
                  class="h-full w-full object-cover"
                  :data-required-asset="requiredAssetPath(item)"
                  @error="handleImageError"
                />
              </button>
              <button
                type="button"
                class="block min-w-0 text-left"
                @click="emit('open-item', item.id)"
              >
                <h3 class="line-clamp-2 min-h-10 text-sm font-black leading-5">{{ item.title }}</h3>
                <p
                  class="mt-1 line-clamp-2 min-h-8 text-[10px] font-semibold leading-4 text-[var(--verdant-muted)]"
                >
                  {{ item.desc }}
                </p>
              </button>
              <div class="mt-3 flex items-center justify-between gap-2">
                <span class="text-xs font-black">{{ displayPrice(item) }}</span>
                <button
                  type="button"
                  class="verdant-primary-action inline-flex h-11 w-11 items-center justify-center rounded-full"
                  :aria-label="t(`加入 ${item.title}`, `Add ${item.title}`)"
                  :data-testid="`food-delivery-add-${item.id}`"
                  @click="emit('add-item', item.id, 1, $event.currentTarget)"
                >
                  <i class="fas fa-plus text-[10px]"></i>
                </button>
              </div>
            </article>
          </div>
        </section>

        <section v-if="dayPicks.length" class="border-t border-[var(--verdant-line)] px-4 py-7">
          <div class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
            <div>
              <p class="text-[10px] font-black text-[var(--verdant-coral)]">
                {{ t('搭配灵感', 'BUILD YOUR DAY') }}
              </p>
              <h2 class="verdant-display mt-1 text-2xl font-black">
                {{ t('一餐，刚刚好', 'A little of everything') }}
              </h2>
            </div>
            <span class="text-right text-[10px] font-bold text-[var(--verdant-muted)]">
              {{ t('蛋白质 · 蔬菜 · 谷物', 'PROTEIN · GREENS · GRAINS') }}
            </span>
          </div>
          <div
            class="mt-5 divide-y divide-[var(--verdant-line)] border-y border-[var(--verdant-line)]"
          >
            <button
              v-for="item in dayPicks"
              :key="item.id"
              type="button"
              class="grid min-h-[7.5rem] w-full grid-cols-[5.75rem_minmax(0,1fr)_2.75rem] items-center gap-3 py-3 text-left"
              @click="emit('open-item', item.id)"
            >
              <span class="aspect-square overflow-hidden rounded-full bg-[var(--verdant-soft)]">
                <img
                  v-if="imageUrl(item)"
                  :src="imageUrl(item)"
                  :alt="item.image?.alt || item.title"
                  class="h-full w-full object-cover"
                  :data-required-asset="requiredAssetPath(item)"
                  @error="handleImageError"
                />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-black">{{ item.title }}</span>
                <span
                  class="mt-1 line-clamp-2 block text-[10px] font-semibold leading-4 text-[var(--verdant-muted)]"
                  >{{ item.desc }}</span
                >
                <span class="mt-2 block text-xs font-black">{{ displayPrice(item) }}</span>
              </span>
              <span
                class="verdant-icon-button inline-flex h-11 w-11 items-center justify-center rounded-full"
              >
                <i class="fas fa-arrow-right text-[10px]"></i>
              </span>
            </button>
          </div>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'menu'">
      <main class="px-4 py-6" data-testid="food-delivery-light-menu-page">
        <section
          class="verdant-page-intro relative -mx-4 -mt-6 overflow-hidden border-b border-[var(--verdant-line)] px-4 pb-5 pt-6"
        >
          <img
            :src="brandHeroArtUrl"
            alt=""
            aria-hidden="true"
            class="verdant-page-intro-art pointer-events-none absolute inset-y-0 right-0 h-full w-full object-cover"
            :data-required-asset="brandHeroArtAssetPath"
            @error="handleImageError"
          />
          <div class="relative z-10">
            <p class="text-[10px] font-black text-[var(--verdant-coral)]">
              {{ t('完整菜单', 'FULL MENU') }}
            </p>
            <h1 class="verdant-display mt-1 max-w-[18rem] text-3xl font-black">
              {{ t('想吃点什么？', 'What feels good today?') }}
            </h1>
            <label class="verdant-field mt-5 flex min-h-12 items-center gap-3 rounded-md px-4">
              <i class="fas fa-magnifying-glass text-xs text-[var(--verdant-muted)]"></i>
              <input
                v-model="searchQuery"
                type="search"
                class="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                :placeholder="t('搜索菜单', 'Search the menu')"
                data-testid="food-delivery-light-menu-search"
              />
            </label>
          </div>
        </section>
        <nav
          class="verdant-menu-tabs verdant-scroll mt-4 flex gap-5 overflow-x-auto border-b border-[var(--verdant-line)]"
          data-testid="food-delivery-store-menu-section-rail"
          :aria-label="t('菜单分类', 'Menu categories')"
        >
          <button
            v-for="section in menuSections"
            :key="section.key"
            type="button"
            class="verdant-menu-tab relative inline-flex min-h-14 shrink-0 items-center gap-2 px-0.5 text-xs font-black text-[var(--verdant-muted)]"
            :class="
              !isMenuSearching && section.key === resolvedActiveSection
                ? 'is-selected text-[var(--verdant-primary-strong)]'
                : ''
            "
            :aria-pressed="!isMenuSearching && section.key === resolvedActiveSection"
            :data-testid="`food-delivery-store-menu-section-${section.key}`"
            @click="selectMenuSection(section.key)"
          >
            <span
              class="verdant-menu-tab-icon inline-flex h-7 w-7 items-center justify-center rounded-md"
              aria-hidden="true"
            >
              <i :class="[section.icon, 'text-[10px]']"></i>
            </span>
            <span>{{ section.label }}</span>
            <span
              v-if="!isMenuSearching && section.key === resolvedActiveSection"
              class="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--verdant-primary)]"
              aria-hidden="true"
            ></span>
          </button>
        </nav>

        <div
          v-if="visibleMenuGroups.length"
          class="mt-4"
          data-testid="food-delivery-store-menu-items"
        >
          <section
            v-for="group in visibleMenuGroups"
            :key="group.key"
            class="verdant-menu-group"
            :data-testid="`food-delivery-menu-group-${group.key}`"
          >
            <header class="flex items-center justify-between gap-4 py-3">
              <div class="flex min-w-0 items-center gap-2">
                <span
                  class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--verdant-primary-soft)] text-[var(--verdant-primary-strong)]"
                  aria-hidden="true"
                >
                  <i :class="[group.icon, 'text-[10px]']"></i>
                </span>
                <h2 class="verdant-display truncate text-sm font-black">{{ group.label }}</h2>
              </div>
              <span class="shrink-0 text-[9px] font-black text-[var(--verdant-muted)]">
                {{ group.items.length }} {{ t('款', 'ITEMS') }}
              </span>
            </header>
            <div
              class="divide-y divide-[var(--verdant-line)] border-y border-[var(--verdant-line)]"
            >
              <article
                v-for="item in group.items"
                :key="item.id"
                class="grid grid-cols-[5.75rem_minmax(0,1fr)_2.75rem] items-center gap-3 py-4"
                :data-menu-section="group.key"
                :data-testid="`food-delivery-menu-${item.id}`"
              >
                <button
                  type="button"
                  class="aspect-square overflow-hidden rounded-full bg-[var(--verdant-soft)]"
                  :data-testid="`food-delivery-menu-open-${item.id}`"
                  @click="emit('open-item', item.id)"
                >
                  <img
                    v-if="imageUrl(item)"
                    :src="imageUrl(item)"
                    :alt="item.image?.alt || item.title"
                    class="h-full w-full object-cover"
                    :data-required-asset="requiredAssetPath(item)"
                    @error="handleImageError"
                  />
                </button>
                <button type="button" class="min-w-0 text-left" @click="emit('open-item', item.id)">
                  <h3 class="break-words text-sm font-black leading-5">{{ item.title }}</h3>
                  <p
                    class="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-[var(--verdant-muted)]"
                  >
                    {{ item.desc }}
                  </p>
                  <p class="mt-2 text-xs font-black">{{ displayPrice(item) }}</p>
                </button>
                <button
                  type="button"
                  class="verdant-primary-action inline-flex h-11 w-11 items-center justify-center rounded-full"
                  :aria-label="t(`加入 ${item.title}`, `Add ${item.title}`)"
                  :data-testid="`food-delivery-add-${item.id}`"
                  @click="emit('add-item', item.id, 1, $event.currentTarget)"
                >
                  <i class="fas fa-plus text-[10px]"></i>
                </button>
              </article>
            </div>
          </section>
        </div>
        <section v-else class="py-20 text-center">
          <i class="fas fa-seedling text-3xl text-[var(--verdant-leaf)]"></i>
          <p class="mt-4 text-sm font-black">{{ t('没有找到这道轻食', 'No matching plate') }}</p>
          <p class="mt-2 text-xs text-[var(--verdant-muted)]">
            {{ t('换个分类或关键词试试。', 'Try another category or search.') }}
          </p>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'detail'">
      <main v-if="activeItem" data-testid="food-delivery-light-detail-page">
        <section
          class="verdant-detail-stage relative min-h-[18.5rem] overflow-hidden bg-[var(--verdant-soft)] px-4 pb-4 pt-8"
        >
          <img
            :src="brandHeroArtUrl"
            alt=""
            aria-hidden="true"
            class="verdant-detail-art pointer-events-none absolute inset-0 h-full w-full object-cover"
            :data-required-asset="brandHeroArtAssetPath"
            @error="handleImageError"
          />
          <div class="absolute left-4 top-4 flex items-center gap-2">
            <button
              type="button"
              class="verdant-icon-button inline-flex h-11 w-11 items-center justify-center rounded-full"
              :aria-label="t('返回菜单', 'Return to menu')"
              @click="emit('navigate', 'menu')"
            >
              <i class="fas fa-arrow-left text-xs"></i>
            </button>
            <button
              type="button"
              class="verdant-icon-button inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--verdant-muted)]"
              :aria-label="t('编辑菜品', 'Edit item')"
              title="Edit item"
              data-testid="food-delivery-light-edit-item"
              @click="emit('edit-item', activeItem.id)"
            >
              <i class="fas fa-pen text-[10px]"></i>
            </button>
          </div>
          <span
            class="absolute right-5 top-4 inline-flex items-center gap-1 text-xs font-black text-[var(--verdant-leaf)]"
          >
            <i class="fas fa-star text-[var(--verdant-gold)]"></i>
            {{ restaurant.rating.toFixed(1) }}
          </span>
          <div
            class="verdant-detail-image relative mx-auto mt-10 aspect-square w-[15.5rem] overflow-hidden rounded-full border-[12px] border-[var(--verdant-surface)] bg-[var(--verdant-surface)]"
          >
            <img
              v-if="imageUrl(activeItem)"
              :src="imageUrl(activeItem)"
              :alt="activeItem.image?.alt || activeItem.title"
              class="h-full w-full object-cover"
              :data-required-asset="requiredAssetPath(activeItem)"
              @error="handleImageError"
            />
          </div>
        </section>
        <section class="bg-[var(--verdant-surface)] px-5 pb-7 pt-6">
          <p class="text-[10px] font-black text-[var(--verdant-coral)]">
            {{ t('新鲜现做', 'MADE FRESH') }}
          </p>
          <h1 class="verdant-display mt-1 text-[2rem] font-black leading-tight">
            {{ activeItem.title }}
          </h1>
          <p class="mt-3 text-sm font-semibold leading-6 text-[var(--verdant-muted)]">
            {{ activeItem.desc }}
          </p>
          <div class="mt-5 border-y border-[var(--verdant-line)] py-4">
            <p class="text-[10px] font-black text-[var(--verdant-muted)]">
              {{ t('这一碗里有什么', 'WHAT IS INSIDE') }}
            </p>
            <p class="mt-2 text-xs font-bold leading-5">{{ activeItem.ingredients }}</p>
          </div>
          <div class="mt-5 flex items-center justify-between gap-4">
            <div>
              <p class="text-[10px] font-bold text-[var(--verdant-muted)]">
                {{ t('数量', 'QUANTITY') }}
              </p>
              <div
                class="mt-2 grid h-11 grid-cols-[2.75rem_2.75rem_2.75rem] overflow-hidden rounded-full border border-[var(--verdant-line)] bg-[var(--verdant-canvas)]"
              >
                <button
                  type="button"
                  class="h-11"
                  :disabled="detailQuantity <= 1"
                  @click="detailQuantity -= 1"
                >
                  <i class="fas fa-minus text-[9px]"></i>
                </button>
                <span
                  class="inline-flex h-11 items-center justify-center text-sm font-black"
                  data-testid="food-delivery-light-detail-quantity"
                  >{{ detailQuantity }}</span
                >
                <button
                  type="button"
                  class="h-11"
                  data-testid="food-delivery-light-detail-quantity-increase"
                  @click="detailQuantity = Math.min(99, detailQuantity + 1)"
                >
                  <i class="fas fa-plus text-[9px]"></i>
                </button>
              </div>
            </div>
            <div class="text-right">
              <p class="text-[10px] font-bold text-[var(--verdant-muted)]">
                {{ t('合计', 'TOTAL') }}
              </p>
              <p class="mt-2 text-lg font-black">{{ detailTotal }}</p>
            </div>
          </div>
          <button
            type="button"
            class="verdant-primary-action mt-6 flex min-h-12 w-full items-center justify-between rounded-md px-5 text-sm font-black"
            data-testid="food-delivery-light-detail-add"
            @click="addActiveItem"
          >
            <span>{{ t('加入购物袋', 'Add to bag') }}</span>
            <span>{{ detailTotal }}</span>
          </button>
        </section>
      </main>
      <main v-else class="px-5 py-20 text-center" data-testid="food-delivery-light-detail-page">
        <i class="fas fa-leaf text-4xl text-[var(--verdant-leaf)]"></i>
        <p class="mt-4 text-sm font-black">
          {{ t('这道菜暂时找不到', 'This plate is unavailable') }}
        </p>
        <button
          type="button"
          class="verdant-primary-action mt-5 min-h-11 rounded-md px-5 text-xs font-black"
          @click="emit('navigate', 'menu')"
        >
          {{ t('回到菜单', 'Return to menu') }}
        </button>
      </main>
    </template>

    <template v-else-if="page === 'bag'">
      <main class="px-4 py-6" data-testid="food-delivery-light-bag-page">
        <p class="text-[10px] font-black text-[var(--verdant-coral)]">
          {{ t('购物袋', 'YOUR BAG') }}
        </p>
        <h1 class="verdant-display mt-1 text-3xl font-black">
          {{ t('一餐，准备好了', 'Ready when you are') }}
        </h1>

        <section v-if="cartLines.length" class="mt-6" data-testid="food-delivery-cart-panel">
          <div class="divide-y divide-[var(--verdant-line)] border-y border-[var(--verdant-line)]">
            <article
              v-for="line in cartLines"
              :key="line.menuItemId"
              class="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-4"
              :data-testid="`food-delivery-cart-${line.menuItemId}`"
            >
              <span class="aspect-square overflow-hidden rounded-full bg-[var(--verdant-soft)]">
                <img
                  v-if="imageUrl(line.menuItem)"
                  :src="imageUrl(line.menuItem)"
                  :alt="line.menuItem.image?.alt || line.menuItem.title"
                  class="h-full w-full object-cover"
                  :data-required-asset="requiredAssetPath(line.menuItem)"
                  @error="handleImageError"
                />
              </span>
              <div class="min-w-0">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="break-words text-sm font-black">{{ line.menuItem.title }}</h2>
                    <p class="mt-1 text-xs font-black">{{ line.subtotal }} {{ line.currency }}</p>
                  </div>
                  <button
                    type="button"
                    class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--verdant-muted)]"
                    :aria-label="t(`移除 ${line.menuItem.title}`, `Remove ${line.menuItem.title}`)"
                    @click="emit('update-cart', line.menuItemId, 0)"
                  >
                    <i class="fas fa-trash-can text-[10px]"></i>
                  </button>
                </div>
                <div
                  class="mt-3 grid h-11 w-[8.25rem] grid-cols-3 overflow-hidden rounded-full border border-[var(--verdant-line)] bg-[var(--verdant-surface)]"
                >
                  <button
                    type="button"
                    class="h-11"
                    @click="emit('update-cart', line.menuItemId, line.quantity - 1)"
                  >
                    <i class="fas fa-minus text-[9px]"></i>
                  </button>
                  <span class="inline-flex h-11 items-center justify-center text-sm font-black">{{
                    line.quantity
                  }}</span>
                  <button
                    type="button"
                    class="h-11"
                    @click="emit('update-cart', line.menuItemId, line.quantity + 1)"
                  >
                    <i class="fas fa-plus text-[9px]"></i>
                  </button>
                </div>
              </div>
            </article>
          </div>
          <div class="verdant-summary mt-6 rounded-md p-4">
            <div class="flex items-center justify-between gap-3 text-sm font-black">
              <span>{{ t('预计合计', 'Estimated total') }}</span>
              <span>{{ cartTotal.amount }} {{ cartTotal.currency }}</span>
            </div>
            <p class="mt-2 text-[10px] font-semibold text-[var(--verdant-muted)]">
              {{
                t('配送费将在确认页单独列出。', 'Delivery is listed separately at confirmation.')
              }}
            </p>
          </div>
          <button
            type="button"
            class="verdant-primary-action mt-5 min-h-12 w-full rounded-md px-4 text-sm font-black"
            data-testid="food-delivery-checkout"
            @click="emit('checkout')"
          >
            {{ t('确认这一餐', 'Review this order') }}
          </button>
        </section>

        <section v-else class="py-20 text-center">
          <span
            class="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--verdant-soft)] text-3xl text-[var(--verdant-leaf)]"
            ><i class="fas fa-leaf"></i
          ></span>
          <h2 class="mt-5 text-lg font-black">
            {{ t('购物袋还是空的', 'Your bag is still light') }}
          </h2>
          <p class="mt-2 text-xs font-semibold text-[var(--verdant-muted)]">
            {{ t('从一份沙拉或暖碗开始。', 'Start with a salad or warm bowl.') }}
          </p>
          <button
            type="button"
            class="verdant-primary-action mt-5 min-h-11 rounded-md px-5 text-xs font-black"
            @click="emit('navigate', 'menu')"
          >
            {{ t('浏览菜单', 'Browse menu') }}
          </button>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'orders'">
      <main class="px-4 py-6" data-testid="food-delivery-light-orders-page">
        <p class="text-[10px] font-black text-[var(--verdant-coral)]">{{ t('订单', 'ORDERS') }}</p>
        <h1 class="verdant-display mt-1 text-3xl font-black">
          {{ t('从厨房到你', 'From our kitchen to you') }}
        </h1>
        <div
          v-if="orders.length"
          class="mt-6 divide-y divide-[var(--verdant-line)] border-y border-[var(--verdant-line)]"
        >
          <button
            v-for="order in orders"
            :key="order.id"
            type="button"
            class="grid min-h-[6.5rem] w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 py-4 text-left"
            :data-testid="`food-delivery-order-${order.id}`"
            @click="emit('navigate', 'order', order.id)"
          >
            <span
              class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--verdant-soft)] text-[var(--verdant-leaf)]"
              ><i :class="orderStatus(order.status).icon"></i
            ></span>
            <span class="min-w-0">
              <span class="block text-sm font-black">{{ orderStatus(order.status).label }}</span>
              <span
                class="mt-1 block truncate text-[10px] font-semibold text-[var(--verdant-muted)]"
                >{{ order.itemCount }} {{ t('份餐品', 'item(s)') }} ·
                {{ orderTime(order.createdAt) }}</span
              >
              <span class="mt-2 block text-xs font-black"
                >{{ order.total }} {{ order.currency }}</span
              >
            </span>
            <i class="fas fa-chevron-right text-[10px] text-[var(--verdant-coral)]"></i>
          </button>
        </div>
        <section v-else class="py-20 text-center">
          <i class="fas fa-receipt text-4xl text-[var(--verdant-leaf)]"></i>
          <h2 class="mt-5 text-lg font-black">
            {{ t('还没有轻食订单', 'No Verdant Day orders yet') }}
          </h2>
          <p class="mt-2 text-xs text-[var(--verdant-muted)]">
            {{
              t(
                '下单后可在这里查看配送进度。',
                'Delivery progress will appear here after checkout.',
              )
            }}
          </p>
          <button
            type="button"
            class="verdant-primary-action mt-5 min-h-11 rounded-md px-5 text-xs font-black"
            @click="emit('navigate', 'menu')"
          >
            {{ t('去选一餐', 'Choose a meal') }}
          </button>
        </section>
      </main>
    </template>

    <template v-else-if="page === 'order'">
      <main data-testid="food-delivery-light-order-page">
        <section v-if="activeOrder" class="bg-[var(--verdant-soft)] px-5 pb-7 pt-7">
          <p class="text-[10px] font-black text-[var(--verdant-coral)]">
            {{ t('配送进度', 'ORDER JOURNEY') }}
          </p>
          <h1 class="verdant-display mt-1 text-3xl font-black">
            {{ orderStatus(activeOrder.status).label }}
          </h1>
          <p class="mt-2 text-xs font-semibold text-[var(--verdant-muted)]">
            {{ orderTime(activeOrder.createdAt) }} · {{ activeOrder.deliveryAddress }}
          </p>
          <div class="mt-7 grid grid-cols-4 gap-2">
            <div v-for="step in 4" :key="step" class="space-y-2">
              <span
                class="block h-1 rounded-full"
                :class="
                  step <= orderStatus(activeOrder.status).step
                    ? 'bg-[var(--verdant-primary)]'
                    : 'bg-[var(--verdant-surface)]'
                "
              ></span>
              <span class="block text-center text-[9px] font-black text-[var(--verdant-muted)]">{{
                ['Order', 'Kitchen', 'Rider', 'Home'][step - 1]
              }}</span>
            </div>
          </div>
        </section>
        <section v-if="activeOrder" class="px-4 py-6">
          <h2 class="verdant-display text-xl font-black">{{ t('这一餐', 'Your meal') }}</h2>
          <div
            class="mt-4 divide-y divide-[var(--verdant-line)] border-y border-[var(--verdant-line)]"
          >
            <div
              v-for="item in activeOrder.items"
              :key="item.id"
              class="flex items-center justify-between gap-4 py-3 text-xs"
            >
              <span class="min-w-0 break-words font-bold"
                >{{ item.title }} × {{ item.quantity }}</span
              >
              <span class="shrink-0 font-black"
                >{{ ((item.unitPriceCents * item.quantity) / 100).toFixed(2) }}
                {{ item.currency }}</span
              >
            </div>
          </div>
          <div class="verdant-summary mt-5 rounded-md p-4">
            <div class="flex items-center justify-between gap-3 text-sm font-black">
              <span>{{ t('订单合计', 'Order total') }}</span>
              <span>{{ activeOrder.total }} {{ activeOrder.currency }}</span>
            </div>
            <p class="mt-2 text-[10px] font-semibold text-[var(--verdant-muted)]">
              {{ t('包含本次配送费。', 'Includes delivery for this order.') }}
            </p>
          </div>
        </section>
        <section v-else class="px-5 py-20 text-center">
          <i class="fas fa-receipt text-4xl text-[var(--verdant-leaf)]"></i>
          <p class="mt-4 text-sm font-black">{{ t('没有找到这笔订单', 'Order not found') }}</p>
          <button
            type="button"
            class="verdant-primary-action mt-5 min-h-11 rounded-md px-5 text-xs font-black"
            @click="emit('navigate', 'orders')"
          >
            {{ t('查看全部订单', 'View all orders') }}
          </button>
        </section>
      </main>
    </template>

    <section
      v-if="promotionOpen"
      class="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 px-3 pt-14 backdrop-blur-sm sm:items-center sm:pb-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verdant-promotion-title"
      data-testid="food-delivery-light-promotion-dialog"
      @click.self="promotionOpen = false"
    >
      <article
        class="verdant-promotion-dialog w-full max-w-md overflow-hidden bg-[var(--verdant-surface)]"
      >
        <div class="relative aspect-[4/3] overflow-hidden bg-[var(--verdant-soft)]">
          <img
            :src="mealSpreadUrl"
            alt="A Verdant Day table with salad, warm bowl, wrap, and cucumber mint cooler"
            class="h-full w-full object-cover"
            :data-required-asset="mealSpreadAssetPath"
            @error="handleImageError"
          />
          <button
            type="button"
            class="verdant-promotion-close absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full"
            :aria-label="t('关闭广告', 'Close promotion')"
            data-testid="food-delivery-light-promotion-close"
            @click="promotionOpen = false"
          >
            <i class="fas fa-xmark text-sm" aria-hidden="true"></i>
          </button>
        </div>
        <div class="p-5">
          <p class="text-[9px] font-black text-[var(--verdant-coral)]">THE MIDDAY EDIT</p>
          <h2 id="verdant-promotion-title" class="verdant-display mt-1 text-2xl font-black">
            A brighter lunch break.
          </h2>
          <p class="mt-2 text-xs font-semibold leading-5 text-[var(--verdant-muted)]">
            Greens, grains, something crisp, and a cool sip to finish.
          </p>
          <button
            type="button"
            class="verdant-primary-action mt-5 flex min-h-12 w-full items-center justify-between rounded-md px-5 text-sm font-black"
            data-testid="food-delivery-light-promotion-menu"
            @click="openPromotionMenu"
          >
            <span>Explore the menu</span>
            <i class="fas fa-arrow-right text-[10px]" aria-hidden="true"></i>
          </button>
        </div>
      </article>
    </section>

    <nav
      class="verdant-bottom-nav fixed bottom-0 left-1/2 z-40 grid w-full max-w-md -translate-x-1/2 grid-cols-4 border-t border-[var(--verdant-line)] px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur"
      data-testid="food-delivery-light-nav"
      :aria-label="t('店铺导航', 'Shop navigation')"
    >
      <button
        v-for="item in [
          { key: 'home', label: t('首页', 'Home'), icon: 'fas fa-house' },
          { key: 'menu', label: t('菜单', 'Menu'), icon: 'fas fa-utensils' },
          { key: 'bag', label: t('购物袋', 'Bag'), icon: 'fas fa-bag-shopping' },
          { key: 'orders', label: t('订单', 'Orders'), icon: 'fas fa-receipt' },
        ]"
        :key="item.key"
        type="button"
        class="verdant-bottom-nav-item relative flex min-h-14 flex-col items-center justify-center gap-1 text-[9px] font-black"
        :class="
          activeNavKey === item.key
            ? 'text-[var(--verdant-primary-strong)]'
            : 'text-[var(--verdant-muted)]'
        "
        :aria-current="activeNavKey === item.key ? 'page' : undefined"
        :data-testid="`food-delivery-light-nav-${item.key}`"
        @click="emit('navigate', item.key)"
      >
        <span
          class="verdant-bottom-nav-icon inline-flex h-7 w-9 items-center justify-center rounded-full"
        >
          <i :class="[item.icon, 'text-xs']"></i>
        </span>
        <span>{{ item.label }}</span>
        <span
          v-if="item.key === 'bag' && cartQuantity"
          class="absolute right-4 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-[var(--verdant-surface)] bg-[var(--verdant-accent)] px-1 text-[8px] text-[var(--verdant-on-accent)]"
          >{{ cartQuantity }}</span
        >
      </button>
    </nav>
  </article>
</template>

<style scoped>
.verdant-day-app {
  --verdant-ink: #1d241f;
  --verdant-canvas: #f2f4ef;
  --verdant-surface: #ffffff;
  --verdant-surface-subtle: #eef3eb;
  --verdant-primary: #496b4a;
  --verdant-primary-strong: #315438;
  --verdant-primary-soft: #e4eadf;
  --verdant-on-primary: #ffffff;
  --verdant-accent: #e96f64;
  --verdant-accent-ink: #9d403b;
  --verdant-accent-soft: #fbe7e4;
  --verdant-on-accent: #1d241f;
  --verdant-gold: #d7a932;
  --verdant-warning: #715619;
  --verdant-warning-soft: #f6edcf;
  --verdant-muted: #5f6a63;
  --verdant-line: #d2dbd2;
  --verdant-focus: #ad4842;
  --verdant-shadow-card: 0 8px 22px rgba(29, 36, 31, 0.07);
  --verdant-shadow-raised: 0 14px 34px rgba(29, 36, 31, 0.11);
  --verdant-soft: var(--verdant-primary-soft);
  --verdant-leaf: var(--verdant-primary);
  --verdant-coral: var(--verdant-accent-ink);
  font-family: 'Avenir Next', 'Trebuchet MS', sans-serif;
  letter-spacing: 0;
}

.verdant-topbar,
.verdant-bottom-nav {
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 1px 0 rgba(29, 36, 31, 0.03);
}

.verdant-brand-hero {
  border-radius: 8px;
  box-shadow: var(--verdant-shadow-raised);
}

.verdant-campaign {
  border: 1px solid color-mix(in srgb, var(--verdant-primary) 34%, var(--verdant-line));
  border-radius: 8px;
  box-shadow: var(--verdant-shadow-card);
}

.verdant-campaign-image {
  object-position: center 64%;
}

.verdant-campaign-shade {
  background: linear-gradient(
    90deg,
    rgba(21, 38, 27, 0.9) 0%,
    rgba(21, 38, 27, 0.8) 28%,
    rgba(21, 38, 27, 0.4) 44%,
    rgba(21, 38, 27, 0.08) 56%,
    transparent 66%
  );
}

.verdant-page-intro {
  background: var(--verdant-warning-soft);
}

.verdant-page-intro::after,
.verdant-detail-stage::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background: rgba(242, 244, 239, 0.72);
}

.verdant-page-intro-art {
  object-position: 72% center;
  opacity: 0.28;
  mix-blend-mode: multiply;
}

.verdant-detail-art {
  object-position: 68% center;
  opacity: 0.34;
  mix-blend-mode: multiply;
}

.verdant-detail-stage > :not(.verdant-detail-art) {
  z-index: 1;
}

.verdant-category-shortcuts {
  background: color-mix(in srgb, var(--verdant-surface-subtle) 72%, var(--verdant-canvas));
}

.verdant-category-shortcut {
  transition:
    color 140ms ease,
    transform 100ms ease;
}

.verdant-category-mark {
  border: 1px solid color-mix(in srgb, var(--verdant-primary) 22%, var(--verdant-line));
  background: var(--verdant-primary-soft);
  color: var(--verdant-primary-strong);
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.verdant-category-shortcut[data-section='warm_bowls'] .verdant-category-mark {
  border-color: color-mix(in srgb, var(--verdant-gold) 38%, var(--verdant-line));
  background: var(--verdant-warning-soft);
  color: var(--verdant-warning);
}

.verdant-category-shortcut[data-section='wraps_toasts'] .verdant-category-mark,
.verdant-category-shortcut[data-section='small_sweets'] .verdant-category-mark {
  border-color: color-mix(in srgb, var(--verdant-accent) 26%, var(--verdant-line));
  background: var(--verdant-accent-soft);
  color: var(--verdant-accent-ink);
}

.verdant-category-shortcut[data-section='drinks'] .verdant-category-mark,
.verdant-category-shortcut[data-section='other'] .verdant-category-mark {
  background: var(--verdant-surface);
  color: var(--verdant-primary);
}

.verdant-menu-tab {
  transition:
    color 140ms ease,
    transform 100ms ease;
}

.verdant-menu-tab-icon {
  border: 1px solid var(--verdant-line);
  background: var(--verdant-surface);
  color: var(--verdant-muted);
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease;
}

.verdant-menu-tab.is-selected .verdant-menu-tab-icon {
  border-color: color-mix(in srgb, var(--verdant-primary) 38%, var(--verdant-line));
  background: var(--verdant-primary-soft);
  color: var(--verdant-primary-strong);
}

.verdant-menu-group + .verdant-menu-group {
  margin-top: 1.5rem;
}

.verdant-icon-button,
.verdant-search,
.verdant-field,
.verdant-card,
.verdant-summary {
  border: 1px solid var(--verdant-line);
  background: var(--verdant-surface);
}

.verdant-icon-button {
  color: var(--verdant-ink);
  transition:
    background-color 140ms ease,
    border-color 140ms ease,
    color 140ms ease,
    transform 100ms ease;
}

.verdant-search,
.verdant-field {
  box-shadow: 0 4px 14px rgba(29, 36, 31, 0.035);
}

.verdant-card {
  box-shadow: var(--verdant-shadow-card);
}

.verdant-promotion-dialog {
  border: 1px solid color-mix(in srgb, var(--verdant-primary) 28%, var(--verdant-line));
  border-radius: 8px 8px 0 0;
  box-shadow: 0 24px 64px rgba(18, 27, 21, 0.24);
}

.verdant-promotion-close {
  border: 1px solid rgba(255, 255, 255, 0.34);
  background: rgba(20, 29, 23, 0.72);
  color: white;
  backdrop-filter: blur(10px);
}

.verdant-bottom-nav-item {
  transition:
    color 140ms ease,
    transform 100ms ease;
}

.verdant-bottom-nav-icon {
  transition:
    background-color 140ms ease,
    color 140ms ease,
    box-shadow 140ms ease;
}

.verdant-bottom-nav-item[aria-current='page'] .verdant-bottom-nav-icon {
  background: var(--verdant-primary);
  color: var(--verdant-on-primary);
  box-shadow: 0 3px 10px rgba(49, 84, 56, 0.2);
}

.verdant-summary {
  background: var(--verdant-surface-subtle);
}

.verdant-detail-image {
  box-shadow: var(--verdant-shadow-raised);
}

.verdant-primary-action {
  background: var(--verdant-primary);
  color: var(--verdant-on-primary);
  box-shadow: 0 2px 0 rgba(29, 36, 31, 0.12);
  transition:
    background-color 140ms ease,
    box-shadow 100ms ease,
    transform 100ms ease;
}

.verdant-secondary-action {
  border: 1px solid color-mix(in srgb, var(--verdant-warning) 42%, transparent);
  background: var(--verdant-surface);
  color: var(--verdant-warning);
  transition:
    background-color 140ms ease,
    transform 100ms ease;
}

.verdant-warning-panel {
  border: 1px solid color-mix(in srgb, var(--verdant-warning) 38%, transparent);
  background: var(--verdant-warning-soft);
}

.verdant-field:focus-within {
  outline: 2px solid var(--verdant-focus);
  outline-offset: 2px;
}

@media (hover: hover) {
  .verdant-icon-button:hover,
  .verdant-search:hover {
    border-color: var(--verdant-primary);
    background: var(--verdant-surface-subtle);
  }

  .verdant-primary-action:hover {
    background: var(--verdant-primary-strong);
  }

  .verdant-secondary-action:hover {
    background: color-mix(in srgb, var(--verdant-warning-soft) 72%, white);
  }

  .verdant-category-shortcut:hover {
    color: var(--verdant-ink);
  }

  .verdant-category-shortcut:hover .verdant-category-mark,
  .verdant-menu-tab:hover .verdant-menu-tab-icon {
    border-color: var(--verdant-primary);
  }

  .verdant-campaign:hover {
    border-color: var(--verdant-primary);
  }
}

@media (min-width: 640px) {
  .verdant-promotion-dialog {
    border-radius: 8px;
  }
}

.verdant-display,
.verdant-wordmark {
  font-family: 'Avenir Next', 'Trebuchet MS', sans-serif;
  letter-spacing: 0;
}

.verdant-scroll {
  scrollbar-width: none;
}

.verdant-scroll::-webkit-scrollbar {
  display: none;
}

.verdant-featured-scroll {
  scrollbar-color: var(--verdant-green) color-mix(in srgb, var(--verdant-line) 80%, transparent);
  scrollbar-width: thin;
}

.verdant-featured-scroll::-webkit-scrollbar {
  display: block;
  height: 0.34rem;
}

.verdant-featured-scroll::-webkit-scrollbar-track {
  border-radius: 999px;
  background: color-mix(in srgb, var(--verdant-line) 80%, transparent);
}

.verdant-featured-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--verdant-green);
}

.verdant-day-app button,
.verdant-day-app input {
  letter-spacing: 0;
}

.verdant-day-app button:not(:disabled):active {
  transform: scale(0.985);
}

.verdant-day-app button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.verdant-day-app button:focus-visible,
.verdant-day-app input:focus-visible {
  outline: 2px solid var(--verdant-focus);
  outline-offset: 2px;
}

.verdant-field input:focus-visible {
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .verdant-day-app *,
  .verdant-day-app *::before,
  .verdant-day-app *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
