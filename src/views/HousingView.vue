<template>
  <main
    class="jari-app"
    :class="[{ 'is-night': isNightTheme, 'is-detail-open': Boolean(selectedListing) }]"
    data-app="housing"
    data-testid="housing-app"
  >
    <header class="jari-header">
      <button type="button" class="jari-header__back" :aria-label="t('返回主屏幕', 'Back to Home')" data-testid="housing-home-back" @click="goHome"><i class="fas fa-arrow-left" aria-hidden="true"></i></button>
      <div class="jari-brand">
        <span class="jari-brand__mark" aria-hidden="true"><i class="fas fa-house-chimney-window"></i></span>
        <span><strong>{{ isZh ? brand.nameZh : brand.nameEn }}</strong><small>{{ isZh ? brand.taglineZh : brand.taglineEn }}</small></span>
      </div>
      <span class="jari-header__spacer"></span>
      <button type="button" class="jari-header__saved" :aria-label="t('查看收藏', 'View saved homes')" data-testid="housing-header-saved" @click="activeSection = 'favorites'; selectedListingId = ''"><i class="fas fa-heart" aria-hidden="true"></i><span>{{ favoriteIds.length }}</span></button>
    </header>

    <div class="jari-layout">
      <aside class="jari-rail" :aria-label="t('住处导航', 'Jari navigation')">
        <nav>
          <button v-for="item in navigationItems" :key="item.id" type="button" :class="{ 'is-active': activeSection === item.id }" :aria-current="activeSection === item.id ? 'page' : undefined" :data-testid="`housing-section-${item.id}`" @click="openSection(item.id)">
            <i class="fas" :class="item.icon" aria-hidden="true"></i><span>{{ item.label }}</span><strong v-if="item.count">{{ item.count }}</strong>
          </button>
        </nav>
        <section class="jari-rail__folio">
          <span>JARI / 01</span>
          <strong>{{ t('找一个能安放日常的地方。', 'Find a place that can hold an ordinary life.') }}</strong>
          <small>{{ t('区域来自地图，房源与地图地点保持分离。', 'Areas come from Map; listings remain separate records.') }}</small>
        </section>
      </aside>

      <section class="jari-content" :aria-label="sectionTitle">
        <div class="jari-content__lead">
          <span>{{ t('首尔居住选集', 'SEOUL LIVING EDIT') }}</span>
          <h1>{{ sectionTitle }}</h1>
          <p>{{ sectionDescription }}</p>
        </div>

        <div v-if="activeSection !== 'viewings'" class="jari-searchbar">
          <div class="jari-mode" :aria-label="t('房源模式', 'Listing mode')">
            <button type="button" :class="{ 'is-active': activeMode === 'rent' }" :aria-pressed="activeMode === 'rent'" data-testid="housing-mode-rent" @click="changeMode('rent')">{{ t('租房', 'Rent') }}</button>
            <button type="button" :class="{ 'is-active': activeMode === 'buy' }" :aria-pressed="activeMode === 'buy'" data-testid="housing-mode-buy" @click="changeMode('buy')">{{ t('买房', 'Buy') }}</button>
          </div>
          <label class="jari-search"><i class="fas fa-magnifying-glass" aria-hidden="true"></i><span class="sr-only">{{ t('搜索房源', 'Search homes') }}</span><input v-model="searchQuery" type="search" :placeholder="t('搜索地区、标题或地址', 'Search area, title, or address')" data-testid="housing-search" /></label>
          <button type="button" class="jari-filter-button" :aria-label="t('筛选房源', 'Filter homes')" data-testid="housing-filter-open" @click="filterOpen = true"><i class="fas fa-sliders" aria-hidden="true"></i><span>{{ t('筛选', 'Filters') }}</span><strong v-if="activeFilterCount">{{ activeFilterCount }}</strong></button>
        </div>

        <div v-if="notice" class="jari-notice" role="status" data-testid="housing-notice"><i class="fas fa-check" aria-hidden="true"></i>{{ notice }}</div>

        <div v-if="isLoading" class="jari-state" data-testid="housing-loading-state" aria-live="polite">
          <span class="jari-state__loader" aria-hidden="true"></span><h2>{{ t('正在整理房源', 'Refreshing homes') }}</h2><p>{{ t('正在重新读取本地房源目录。', 'Reading the local listing catalog again.') }}</p>
        </div>
        <div v-else-if="!fixtureContractValid" class="jari-state is-error" role="alert" data-testid="housing-error-state">
          <i class="fas fa-triangle-exclamation" aria-hidden="true"></i><h2>{{ t('房源目录暂时不可用', 'The listing catalog is unavailable') }}</h2><p>{{ t('本地房源与地图区域引用没有通过完整性检查，因此没有补写或替换内容。', 'The local listings and Map area references failed their integrity check, so no content was reconstructed or substituted.') }}</p><button type="button" @click="refreshCatalog">{{ t('重试', 'Try again') }}</button>
        </div>
        <template v-else-if="activeSection === 'viewings'">
          <div v-if="!viewingRows.length" class="jari-state" data-testid="housing-viewings-empty"><span class="jari-state__nest" aria-hidden="true"><i class="fas fa-calendar-plus"></i></span><h2>{{ t('还没有看房草稿', 'No viewing drafts yet') }}</h2><p>{{ t('从房源详情选择时间，草稿会先留在住处，不会自动写入日历。', 'Choose a time from a listing detail. The draft stays in Jari and is not added to Calendar.') }}</p><button type="button" @click="openSection('browse')">{{ t('去看房源', 'Browse homes') }}</button></div>
          <div v-else class="jari-viewing-list" data-testid="housing-viewing-list">
            <article v-for="row in viewingRows" :key="row.draft.listingId" :class="{ 'is-cancelled': row.draft.status === 'cancelled' }" :data-testid="`housing-viewing-row-${row.draft.listingId}`">
              <span class="jari-viewing-list__date"><strong>{{ row.slot.time }}</strong><small>{{ row.slot.date }}</small></span>
              <span class="jari-viewing-list__copy"><small>{{ row.status }}</small><strong>{{ row.title }}</strong><span>{{ row.area }}</span><p v-if="row.draft.note">{{ row.draft.note }}</p></span>
              <span class="jari-viewing-list__actions">
                <button v-if="row.draft.status !== 'cancelled'" type="button" :aria-label="t('改期', 'Reschedule')" :data-testid="`housing-viewing-edit-${row.draft.listingId}`" @click="editViewing(row.draft.listingId)"><i class="fas fa-pen" aria-hidden="true"></i></button>
                <button v-if="row.draft.status !== 'cancelled'" type="button" :aria-label="t('取消草稿', 'Cancel draft')" :data-testid="`housing-viewing-row-cancel-${row.draft.listingId}`" @click="cancelViewing(row.draft.listingId)"><i class="fas fa-xmark" aria-hidden="true"></i></button>
                <button v-else type="button" :aria-label="t('恢复草稿', 'Restore draft')" :data-testid="`housing-viewing-restore-${row.draft.listingId}`" @click="restoreViewing(row.draft.listingId)"><i class="fas fa-arrow-rotate-left" aria-hidden="true"></i></button>
              </span>
            </article>
          </div>
        </template>
        <div v-else-if="!visibleListingRows.length" class="jari-state" data-testid="housing-empty-state">
          <span class="jari-state__nest" aria-hidden="true"><i :class="activeSection === 'favorites' ? 'far fa-heart' : 'fas fa-house-circle-xmark'"></i></span><h2>{{ emptyTitle }}</h2><p>{{ emptyDescription }}</p><button type="button" @click="resetEmptyState">{{ emptyAction }}</button>
        </div>
        <div v-else class="jari-listings" data-testid="housing-listing-list">
          <div class="jari-listings__meta"><span>{{ t(`${visibleListingRows.length} 套房源`, `${visibleListingRows.length} homes`) }}</span><button type="button" :aria-label="t('刷新本地房源', 'Refresh local homes')" data-testid="housing-refresh" @click="refreshCatalog"><i class="fas fa-rotate" aria-hidden="true"></i></button></div>
          <HousingListingCard v-for="row in visibleListingRows" :key="row.listing.id" v-bind="row" @open="openListing" @favorite="toggleListingFavorite" />
        </div>
      </section>

      <aside class="jari-context">
        <section class="jari-context__quote"><span>{{ t('本周居住笔记', 'LIVING NOTE') }}</span><h2>{{ t('先看每天怎么过，再看房子有多大。', 'Picture the day first. Measure the home second.') }}</h2><p>{{ t('通勤、买菜、光线和安静的晚上，都会比一串参数更早进入生活。', 'Commutes, groceries, daylight, and quiet evenings enter a life before a list of specifications does.') }}</p></section>
        <section class="jari-context__numbers"><div><strong>{{ rentCount }}</strong><span>{{ t('租赁选择', 'Rent') }}</span></div><div><strong>{{ buyCount }}</strong><span>{{ t('购买选择', 'Buy') }}</span></div><div><strong>{{ favoriteIds.length }}</strong><span>{{ t('已收藏', 'Saved') }}</span></div></section>
        <section class="jari-context__areas">
          <h2>{{ t('正在看的区域', 'Areas in view') }}</h2>
          <p>{{ t('筛选房源，或单独在地图中查看街区参考。', 'Filter listings or inspect the neighborhood reference in Map.') }}</p>
          <div v-for="area in featuredAreas" :key="area.placeId" class="jari-context__area-row">
            <button type="button" class="jari-context__area-filter" @click="applyArea(area.placeId)">
              <span><strong>{{ isZh ? area.nameZh : area.nameEn }}</strong><small>{{ isZh ? area.addressZh : area.addressEn }}</small></span>
              <i class="fas fa-arrow-right" aria-hidden="true"></i>
            </button>
            <button type="button" class="jari-context__area-map" :aria-label="t(`在地图中查看${area.nameZh}`, `View ${area.nameEn} in Map`)" :data-testid="`housing-area-map-${area.placeId}`" @click="openMapArea(area)">
              <i class="fas fa-map-location-dot" aria-hidden="true"></i>
            </button>
          </div>
          <small class="jari-context__areas-note"><i class="fas fa-circle-info" aria-hidden="true"></i>{{ t('地图只显示街区参考，不显示具体房源坐标。', 'Map shows the neighborhood reference, not a listing coordinate.') }}</small>
        </section>
      </aside>

      <section v-if="selectedListingRow" class="jari-detail-pane">
        <HousingListingDetail v-bind="selectedListingRow" @back="closeListing" @favorite="toggleListingFavorite" @map="openMapArea" @viewing="openViewing" />
      </section>
    </div>

    <HousingFilterSheet v-if="filterOpen" :value="filters" v-bind="filterSheetLabels" @close="filterOpen = false" @apply="applyFilters" />
    <HousingViewingDraft v-if="viewingListingRow" :listing-title="viewingListingRow.title" :existing-draft="viewingListingRow.draft" :slots="localizedSlots" v-bind="viewingSheetLabels" @close="viewingListingId = ''" @save="saveViewing" @cancel="cancelViewing(viewingListingId)" />
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import HousingFilterSheet from '../components/housing/HousingFilterSheet.vue'
import HousingListingCard from '../components/housing/HousingListingCard.vue'
import HousingListingDetail from '../components/housing/HousingListingDetail.vue'
import HousingViewingDraft from '../components/housing/HousingViewingDraft.vue'
import {
  findHousingListing,
  formatHousingMoney,
  formatHousingPrice,
  HOUSING_AMENITIES,
  HOUSING_AREA_REFS,
  HOUSING_LISTINGS,
  HOUSING_SHELL_BRAND,
  HOUSING_VIEWING_SLOTS,
  validateHousingFixtureContract,
} from '../lib/housing-shell-data'
import { useHousingShellState } from '../composables/useHousingShellState'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const { t, isZh } = useI18n()
const brand = HOUSING_SHELL_BRAND
const housingState = useHousingShellState()

const activeSection = ref('browse')
const selectedListingId = ref('')
const viewingListingId = ref('')
const searchQuery = ref('')
const filterOpen = ref(false)
const isLoading = ref(false)
const notice = ref('')
const filters = reactive({ area: 'all', rooms: 'all', price: 'all', availableOnly: false })
let loadingTimer = null
let noticeTimer = null

const activeMode = computed(() => housingState.activeMode.value)
const favoriteIds = computed(() => housingState.favoriteIds.value)
const viewingDrafts = computed(() => housingState.viewingDrafts.value)
const selectedListing = computed(() => findHousingListing(selectedListingId.value))
const fixtureContractValid = computed(() => validateHousingFixtureContract())
const isNightTheme = computed(() => systemStore.settings.appearance.currentTheme === 'zen')
const rentCount = computed(() => HOUSING_LISTINGS.filter((item) => item.mode === 'rent').length)
const buyCount = computed(() => HOUSING_LISTINGS.filter((item) => item.mode === 'buy').length)
const featuredAreas = computed(() => HOUSING_AREA_REFS.filter((area) => ['seoul-sanggye-jugong-district', 'seoul-mokdong-apartment-district', 'seoul-acro-river-park'].includes(area.placeId)))

const navigationItems = computed(() => [
  { id: 'browse', icon: 'fa-compass', label: t('发现', 'Discover'), count: 0 },
  { id: 'favorites', icon: 'fa-heart', label: t('收藏', 'Saved'), count: favoriteIds.value.length },
  { id: 'recent', icon: 'fa-clock-rotate-left', label: t('最近浏览', 'Recent'), count: housingState.recentIds.value.length },
  { id: 'viewings', icon: 'fa-calendar-check', label: t('看房草稿', 'Viewings'), count: viewingDrafts.value.filter((item) => item.status !== 'cancelled').length },
])

const sectionTitle = computed(() => ({ browse: t('寻找住处', 'Find a place'), favorites: t('收藏的房源', 'Saved homes'), recent: t('最近浏览', 'Recently viewed'), viewings: t('看房草稿', 'Viewing drafts') })[activeSection.value])
const sectionDescription = computed(() => ({
  browse: t('从真实区域参考出发，慢慢比较一段生活的大小与节奏。', 'Start from stable area references and compare the shape and rhythm of a life.'),
  favorites: t('把想再看一眼的房源收在一起。', 'Keep the homes you want to consider again.'),
  recent: t('回到刚刚认真看过的地方。', 'Return to the places you considered recently.'),
  viewings: t('这些只是住处内的本地草稿，还没有联系对方或写入日历。', 'These are local Jari drafts. No owner was contacted and nothing was added to Calendar.'),
})[activeSection.value])

const visualLabels = computed(() => ({
  planLabel: t('房源格局示意图，不代表地图街区照片', 'Illustrated listing layout, not a Map neighborhood photo'),
  planCaption: t('格局示意', 'LAYOUT STUDY'),
  noImageLabel: t('房源没有可用图片', 'No listing image is available'),
  noImageCaption: t('暂无房源图片', 'NO LISTING IMAGE'),
}))

const statusLabel = (status) => ({ unavailable: t('来源不可用', 'Source unavailable'), withdrawn: t('已下架', 'Withdrawn') })[status] || ''
const listingTitle = (item) => isZh.value ? item.titleZh : item.titleEn
const listingAddress = (item) => isZh.value ? item.addressZh : item.addressEn
const areaName = (item) => isZh.value ? item.areaRef.nameZh : item.areaRef.nameEn
const listingMatchesPrice = (item) => {
  if (filters.price === 'all') return true
  const price = item.mode === 'rent' ? item.monthlyKrw : item.totalPriceKrw
  const limits = item.mode === 'rent' ? { low: 800_000, mid: 2_000_000, high: Infinity } : { low: 2_000_000_000, mid: 6_000_000_000, high: Infinity }
  if (filters.price === 'low') return price <= limits.low
  if (filters.price === 'mid') return price > limits.low && price <= limits.mid
  return price > limits.mid
}

const baseListings = computed(() => {
  let items = HOUSING_LISTINGS.filter((item) => item.mode === activeMode.value)
  if (activeSection.value === 'favorites') items = items.filter((item) => favoriteIds.value.includes(item.id))
  if (activeSection.value === 'recent') items = housingState.recentIds.value.map(findHousingListing).filter((item) => item?.mode === activeMode.value)
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (query) items = items.filter((item) => [item.titleZh, item.titleEn, item.addressZh, item.addressEn, item.areaRef.nameZh, item.areaRef.nameEn].some((value) => value.toLocaleLowerCase().includes(query)))
  if (filters.area !== 'all') items = items.filter((item) => item.areaRef.placeId === filters.area)
  if (filters.rooms !== 'all') items = items.filter((item) => filters.rooms === '3plus' ? item.roomCount >= 3 : item.roomCount === Number(filters.rooms))
  if (filters.availableOnly) items = items.filter((item) => item.sourceStatus === 'available')
  return items.filter(listingMatchesPrice)
})

const toListingRow = (item) => ({
  listing: item,
  selected: selectedListingId.value === item.id,
  favorite: housingState.isFavorite(item.id),
  title: listingTitle(item),
  price: formatHousingPrice(item, isZh.value),
  facts: t(`${item.roomCount} 室 · ${item.bathCount} 卫 · ${item.areaSqm} m²`, `${item.roomCount} bed · ${item.bathCount} bath · ${item.areaSqm} m²`),
  address: listingAddress(item),
  modeLabel: item.mode === 'rent' ? t('租赁', 'Rent') : t('购买', 'Buy'),
  statusLabel: statusLabel(item.sourceStatus),
  openLabel: t(`查看房源：${item.titleZh}`, `View listing: ${item.titleEn}`),
  favoriteLabel: housingState.isFavorite(item.id) ? t('取消收藏', 'Remove from saved') : t('收藏房源', 'Save home'),
  visualLabels: visualLabels.value,
})
const visibleListingRows = computed(() => baseListings.value.map(toListingRow))

const localizedSlots = computed(() => HOUSING_VIEWING_SLOTS.map((slot) => ({ ...slot, date: isZh.value ? slot.dateZh : slot.dateEn })))
const viewingRows = computed(() => viewingDrafts.value.map((draft) => {
  const item = findHousingListing(draft.listingId)
  const slot = localizedSlots.value.find((candidate) => candidate.id === draft.slotId)
  return item && slot ? { draft, listing: item, slot, title: listingTitle(item), area: areaName(item), status: draft.status === 'cancelled' ? t('已取消的本地草稿', 'Cancelled local draft') : t('本地看房草稿', 'Local viewing draft') } : null
}).filter(Boolean))

const viewingListingRow = computed(() => {
  const item = findHousingListing(viewingListingId.value)
  if (!item) return null
  return { listing: item, title: listingTitle(item), draft: housingState.getViewingDraft(item.id) }
})

const formatDate = (value) => new Intl.DateTimeFormat(isZh.value ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(`${value}T00:00:00+09:00`))
const selectedListingRow = computed(() => {
  const item = selectedListing.value
  if (!item) return null
  const draft = housingState.getViewingDraft(item.id)
  const draftSlot = draft ? localizedSlots.value.find((slot) => slot.id === draft.slotId) : null
  return {
    listing: item,
    favorite: housingState.isFavorite(item.id),
    viewingDraft: draft,
    title: listingTitle(item), price: formatHousingPrice(item, isZh.value), summary: isZh.value ? item.summaryZh : item.summaryEn, address: listingAddress(item), areaName: areaName(item),
    modeLabel: item.mode === 'rent' ? t('租赁房源', 'Rental home') : t('购买房源', 'Home for sale'),
    sourceTitle: item.sourceStatus === 'withdrawn' ? t('这套房源已经下架', 'This listing has been withdrawn') : t('房源来源暂时不可用', 'The listing source is unavailable'),
    sourceDescription: item.sourceStatus === 'withdrawn' ? t('保留最近一次浏览摘要，但不能创建新的看房草稿。', 'The last-viewed summary remains, but a new viewing draft cannot be created.') : t('只显示已缓存的房源摘要，不推测缺失信息。', 'Only cached listing details are shown; missing information is not inferred.'),
    backLabel: t('返回房源列表', 'Back to listings'), backText: t('房源', 'Homes'), favoriteLabel: housingState.isFavorite(item.id) ? t('取消收藏', 'Remove from saved') : t('收藏房源', 'Save home'),
    areaLabel: t('面积', 'Area'), roomsLabel: t('房间', 'Rooms'), floorLabel: t('楼层', 'Floor'), orientationLabel: t('朝向', 'Aspect'),
    roomValue: t(`${item.roomCount} 室 ${item.bathCount} 卫`, `${item.roomCount} bed / ${item.bathCount} bath`), floor: isZh.value ? item.floorZh : item.floorEn, orientation: isZh.value ? item.orientationZh : item.orientationEn,
    costsTitle: t('费用与入住', 'Costs & move-in'), depositLabel: t('押金', 'Deposit'), monthlyLabel: t('月租', 'Monthly rent'), purchaseLabel: t('总价', 'Purchase price'), maintenanceLabel: t('每月管理费', 'Monthly maintenance'), availableLabel: t('可入住时间', 'Available from'),
    deposit: formatHousingMoney(item.depositKrw, isZh.value), monthly: formatHousingMoney(item.monthlyKrw, isZh.value), purchase: formatHousingMoney(item.totalPriceKrw, isZh.value), maintenance: formatHousingMoney(item.maintenanceKrw, isZh.value), availableFrom: formatDate(item.availableFrom),
    lifeTitle: t('生活半径', 'Living radius'), commute: isZh.value ? item.commuteZh : item.commuteEn,
    amenities: item.amenities.map((id) => ({ id, ...HOUSING_AMENITIES[id], label: isZh.value ? HOUSING_AMENITIES[id].labelZh : HOUSING_AMENITIES[id].labelEn })),
    mapEyebrow: t('地图区域参考', 'MAP AREA REFERENCE'), mapLabel: t('在地图中查看区域', 'View area in Map'), areaReferenceNote: t('地图只显示该住宅片区的位置与行程能力；打开区域不会创建房产、改变当前位置、发现状态或当前住所。', 'Map only shows the residential area and its journey tools. Opening it does not create property, change current position or discovery state, or set a current residence.'),
    draftStatusLabel: draft?.status === 'cancelled' ? t('草稿已取消', 'Draft cancelled') : draft ? t('已有看房草稿', 'Viewing draft saved') : '',
    draftSlotLabel: draftSlot ? `${draftSlot.date} · ${draftSlot.time}` : '',
    viewingButtonLabel: item.sourceStatus !== 'available' ? t('目前不能创建看房草稿', 'Viewing draft unavailable') : draft ? t('查看或改期', 'Review or reschedule') : t('创建看房草稿', 'Create viewing draft'),
    visualLabels: visualLabels.value,
  }
})

const areaOptions = computed(() => [{ value: 'all', label: t('全部区域', 'All areas') }, ...HOUSING_AREA_REFS.filter((area) => HOUSING_LISTINGS.some((item) => item.areaRef.placeId === area.placeId && item.mode === activeMode.value)).map((area) => ({ value: area.placeId, label: isZh.value ? area.nameZh : area.nameEn }))])
const roomOptions = computed(() => [{ value: 'all', label: t('不限', 'Any') }, { value: '1', label: t('一室', '1 room') }, { value: '2', label: t('两室', '2 rooms') }, { value: '3plus', label: t('三室以上', '3+ rooms') }])
const priceOptions = computed(() => activeMode.value === 'rent'
  ? [{ value: 'all', label: t('不限月租', 'Any monthly rent') }, { value: 'low', label: t('80 万韩元以内', 'Up to ₩800,000') }, { value: 'mid', label: t('80 万至 200 万韩元', '₩800,000–₂,000,000') }, { value: 'high', label: t('200 万韩元以上', 'Above ₩2,000,000') }]
  : [{ value: 'all', label: t('不限总价', 'Any purchase price') }, { value: 'low', label: t('20 亿韩元以内', 'Up to ₩2B') }, { value: 'mid', label: t('20 亿至 60 亿韩元', '₩2B–₩6B') }, { value: 'high', label: t('60 亿韩元以上', 'Above ₩6B') }])
const filterSheetLabels = computed(() => ({ eyebrow: t('缩小选择', 'REFINE'), title: t('筛选房源', 'Filter homes'), closeLabel: t('关闭筛选', 'Close filters'), areaLabel: t('区域', 'Area'), roomsLabel: t('户型', 'Rooms'), priceLabel: activeMode.value === 'rent' ? t('月租范围', 'Monthly rent') : t('总价范围', 'Purchase price'), availableLabel: t('只看可创建看房草稿的房源', 'Only homes available for viewing drafts'), availableHint: t('隐藏来源不可用和已下架的房源。', 'Hide unavailable and withdrawn listings.'), resetLabel: t('重置', 'Reset'), applyLabel: t('查看结果', 'Show results'), areaOptions: areaOptions.value, roomOptions: roomOptions.value, priceOptions: priceOptions.value }))
const viewingSheetLabels = computed(() => ({ eyebrow: t('看房安排', 'VIEWING NOTE'), title: t('保存看房草稿', 'Save viewing draft'), closeLabel: t('关闭看房草稿', 'Close viewing draft'), draftOnlyLabel: t('这不是已确认预约', 'This is not a confirmed appointment'), draftOnlyHint: t('保存后只会留在住处。没有联系对方，也不会写入日历、地图或通知。', 'Saving keeps it in Jari only. No one is contacted and nothing is written to Calendar, Map, or notifications.'), slotLabel: t('想去的时间', 'Preferred time'), noteLabel: t('给自己的备注', 'Note to yourself'), notePlaceholder: t('例如：确认能否晚 10 分钟到、留意厨房采光……', 'For example: ask whether arriving 10 minutes late is okay, check kitchen daylight…'), cancelLabel: t('取消草稿', 'Cancel draft'), saveLabel: t('保存到住处', 'Save in Jari') }))
const activeFilterCount = computed(() => Number(filters.area !== 'all') + Number(filters.rooms !== 'all') + Number(filters.price !== 'all') + Number(filters.availableOnly))
const emptyTitle = computed(() => activeSection.value === 'favorites' ? t('还没有收藏', 'No saved homes yet') : activeSection.value === 'recent' ? t('还没有最近浏览', 'No recently viewed homes') : t('没有符合条件的房源', 'No homes match these filters'))
const emptyDescription = computed(() => activeSection.value === 'favorites' ? t('在房源卡片上点爱心，之后就能从这里继续比较。', 'Tap the heart on a listing to keep it here for comparison.') : activeSection.value === 'recent' ? t('认真打开过的房源会按最近顺序留在这里。', 'Homes you open will stay here in recent order.') : t('试着放宽区域、价格或户型条件。', 'Try widening the area, price, or room filters.'))
const emptyAction = computed(() => activeSection.value === 'browse' ? t('清除筛选', 'Clear filters') : t('去发现房源', 'Browse homes'))

const showNotice = (message) => { notice.value = message; if (noticeTimer) clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.value = '' }, 2400) }
const goHome = () => pushReturnTarget(router, route, '/home')
const openSection = (section) => { activeSection.value = section; selectedListingId.value = ''; searchQuery.value = '' }
const changeMode = (mode) => { housingState.setActiveMode(mode); selectedListingId.value = ''; filters.area = 'all'; filters.price = 'all' }
const openListing = (listingId) => { selectedListingId.value = listingId; housingState.markRecentlyViewed(listingId) }
const closeListing = () => { selectedListingId.value = '' }
const toggleListingFavorite = (listingId) => { const saved = housingState.toggleFavorite(listingId); showNotice(saved ? t('已收藏这套房源', 'Home saved') : t('已取消收藏', 'Removed from saved')) }
const applyFilters = (value) => { Object.assign(filters, value); filterOpen.value = false }
const applyArea = (placeId) => { activeSection.value = 'browse'; filters.area = placeId; filterOpen.value = false }
const resetEmptyState = () => { if (activeSection.value !== 'browse') activeSection.value = 'browse'; searchQuery.value = ''; Object.assign(filters, { area: 'all', rooms: 'all', price: 'all', availableOnly: false }) }
const refreshCatalog = () => { isLoading.value = true; if (loadingTimer) clearTimeout(loadingTimer); loadingTimer = setTimeout(() => { isLoading.value = false; showNotice(t('本地房源已刷新', 'Local homes refreshed')) }, 420) }
const openMapArea = (area) => router.push({ path: '/map', query: { source: 'housing', mapPackId: area.mapPackId, placeId: area.placeId, ...(route.query.homePage ? { homePage: route.query.homePage } : {}) } })
const openViewing = (listingId) => { viewingListingId.value = listingId }
const editViewing = (listingId) => { viewingListingId.value = listingId }
const saveViewing = ({ slotId, note }) => { const saved = housingState.saveViewingDraft({ listingId: viewingListingId.value, slotId, note }); if (!saved) return; viewingListingId.value = ''; showNotice(t('看房草稿已保存到住处', 'Viewing draft saved in Jari')) }
const cancelViewing = (listingId) => { const cancelled = housingState.cancelViewingDraft(listingId); viewingListingId.value = ''; if (cancelled) showNotice(t('看房草稿已取消', 'Viewing draft cancelled')) }
const restoreViewing = (listingId) => { const restored = housingState.restoreViewingDraft(listingId); if (restored) showNotice(t('看房草稿已恢复', 'Viewing draft restored')) }

onBeforeUnmount(() => { if (loadingTimer) clearTimeout(loadingTimer); if (noticeTimer) clearTimeout(noticeTimer) })
</script>

<style scoped>
.jari-app {
  --jari-ground: #f1eee6; --jari-panel: #fffdf7; --jari-soft: #e9eee8; --jari-line: #d8d4c9; --jari-line-strong: #aca99f;
  --jari-ink: #17251f; --jari-copy: #405048; --jari-muted: #58655e; --jari-accent: #386f5c; --jari-action: #245d4a; --jari-accent-ink: #235e4a; --jari-accent-soft: #dfece5;
  --jari-warning-bg: #f8eac6; --jari-warning-ink: #705216; --jari-notice-bg: #dfede6; --jari-notice-ink: #225b48; --jari-danger: #a83a3a; --jari-focus: #1269a8; --jari-shadow: #20372e;
  width: 100%; height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; color: var(--jari-ink); background: var(--jari-ground); font-family: 'Aptos', 'Segoe UI', 'Noto Sans CJK SC', sans-serif;
}
.jari-app.is-night {
  --jari-ground: #111713; --jari-panel: #19211c; --jari-soft: #243029; --jari-line: #344139; --jari-line-strong: #65736b;
  --jari-ink: #f3f0e7; --jari-copy: #d2d6cf; --jari-muted: #a9b2ab; --jari-accent: #79b89c; --jari-action: #397b62; --jari-accent-ink: #9dd6ba; --jari-accent-soft: #203b30;
  --jari-warning-bg: #3b321d; --jari-warning-ink: #f0d889; --jari-notice-bg: #203b30; --jari-notice-ink: #a8dec4; --jari-danger: #ff9292; --jari-focus: #76c7ff; --jari-shadow: #020806;
}
:global(.app-shell:has(.jari-app) .status-fg) { color: #17251f; }
:global(.app-shell:has(.jari-app.is-night) .status-fg) { color: #f3f0e7; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }
.jari-header { min-height: 94px; padding: calc(34px + env(safe-area-inset-top)) 18px 10px; box-sizing: border-box; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--jari-line); background: color-mix(in srgb, var(--jari-panel) 94%, transparent); flex: none; }
:global(.app-shell[data-statusbar='off']) .jari-header { min-height: 70px; padding-top: calc(10px + env(safe-area-inset-top)); }
.jari-header button { min-width: 44px; min-height: 44px; border: 0; color: inherit; background: transparent; cursor: pointer; }.jari-header__back { border-radius: 14px !important; }.jari-header__back:hover, .jari-header__saved:hover { background: var(--jari-soft); }.jari-header__spacer { flex: 1; }.jari-header__saved { padding: 0 12px; display: inline-flex; align-items: center; gap: 7px; border-radius: 14px !important; color: var(--jari-accent-ink) !important; font-weight: 900; }
.jari-brand { min-width: 0; display: flex; align-items: center; gap: 11px; }.jari-brand__mark { width: 43px; height: 43px; display: grid; place-items: center; border-radius: 8px 17px 17px 17px; color: #fff; background: var(--jari-action); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }.jari-brand > span:last-child { min-width: 0; }.jari-brand strong, .jari-brand small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.jari-brand strong { font: 850 21px/1 Georgia, 'Noto Serif SC', serif; }.jari-brand small { margin-top: 4px; color: var(--jari-muted); font-size: 10px; }
.jari-layout { flex: 1; min-height: 0; position: relative; display: grid; grid-template-columns: 205px minmax(390px, 760px) minmax(250px, 1fr); justify-content: center; }
.jari-rail { min-width: 0; padding: 24px 17px; display: flex; flex-direction: column; border-right: 1px solid var(--jari-line); background: var(--jari-panel); }.jari-rail nav { display: grid; gap: 7px; }.jari-rail nav button { min-height: 48px; padding: 0 13px; display: grid; grid-template-columns: 23px minmax(0,1fr) auto; align-items: center; gap: 9px; border: 0; border-radius: 14px; color: var(--jari-copy); background: transparent; text-align: left; font-weight: 800; cursor: pointer; }.jari-rail nav button.is-active { color: var(--jari-accent-ink); background: var(--jari-accent-soft); }.jari-rail nav button strong { min-width: 22px; padding: 3px 6px; border-radius: 999px; color: #fff; background: var(--jari-action); text-align: center; font-size: 9px; }
.jari-rail__folio { margin-top: auto; padding: 19px 16px; border: 1px solid var(--jari-line); border-radius: 22px 22px 8px 22px; background: var(--jari-ground); }.jari-rail__folio span { color: var(--jari-accent-ink); font-size: 9px; font-weight: 900; letter-spacing: .13em; }.jari-rail__folio strong, .jari-rail__folio small { display: block; }.jari-rail__folio strong { margin-top: 24px; font: 800 18px/1.35 Georgia, 'Noto Serif SC', serif; }.jari-rail__folio small { margin-top: 8px; color: var(--jari-muted); font-size: 10px; line-height: 1.5; }
.jari-content { min-width: 0; min-height: 0; padding: 25px 23px 48px; overflow-y: auto; }.jari-content__lead { padding: 0 2px 18px; border-bottom: 3px double var(--jari-line-strong); }.jari-content__lead > span { color: var(--jari-accent-ink); font-size: 9px; font-weight: 900; letter-spacing: .14em; }.jari-content__lead h1 { margin: 6px 0 6px; font: 850 clamp(31px, 4vw, 48px)/1 Georgia, 'Noto Serif SC', serif; letter-spacing: -.035em; }.jari-content__lead p { max-width: 610px; margin: 0; color: var(--jari-muted); font-size: 12px; line-height: 1.55; }
.jari-searchbar { margin: 17px 0; display: grid; grid-template-columns: auto minmax(160px,1fr) auto; gap: 10px; }.jari-mode { padding: 4px; display: flex; border: 1px solid var(--jari-line); border-radius: 15px; background: var(--jari-panel); }.jari-mode button { min-height: 38px; padding: 0 13px; border: 0; border-radius: 11px; color: var(--jari-muted); background: transparent; font-weight: 850; cursor: pointer; }.jari-mode button.is-active { color: #fff; background: var(--jari-action); }
.jari-search { min-width: 0; min-height: 48px; padding: 0 13px; display: flex; align-items: center; gap: 9px; border: 1px solid var(--jari-line); border-radius: 15px; background: var(--jari-panel); }.jari-search i { color: var(--jari-muted); }.jari-search input { width: 100%; min-width: 0; border: 0; outline: 0; color: var(--jari-ink); background: transparent; font: inherit; }.jari-search input::placeholder { color: var(--jari-muted); }
.jari-filter-button { min-height: 48px; padding: 0 13px; display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--jari-line); border-radius: 15px; color: var(--jari-copy); background: var(--jari-panel); font-weight: 850; cursor: pointer; }.jari-filter-button strong { min-width: 20px; padding: 3px 6px; border-radius: 999px; color: #fff; background: var(--jari-action); font-size: 9px; }
.jari-notice { margin-bottom: 12px; padding: 11px 13px; display: flex; gap: 8px; border-radius: 13px; color: var(--jari-notice-ink); background: var(--jari-notice-bg); font-size: 12px; font-weight: 800; }
.jari-listings { display: grid; gap: 12px; }.jari-listings__meta { padding: 0 3px; display: flex; justify-content: space-between; align-items: center; color: var(--jari-muted); font-size: 11px; font-weight: 750; }.jari-listings__meta button { width: 42px; height: 42px; border: 0; border-radius: 13px; color: inherit; background: transparent; cursor: pointer; }.jari-listings__meta button:hover { background: var(--jari-soft); }
.jari-state { min-height: 390px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 34px; text-align: center; border: 1px dashed var(--jari-line-strong); border-radius: 26px 26px 10px 26px; background: var(--jari-panel); }.jari-state > i { color: var(--jari-danger); font-size: 30px; }.jari-state__nest { width: 86px; height: 86px; display: grid; place-items: center; border-radius: 8px 34px 34px 34px; color: var(--jari-accent-ink); background: var(--jari-accent-soft); font-size: 27px; }.jari-state__loader { width: 52px; height: 52px; border: 3px solid var(--jari-line); border-top-color: var(--jari-accent); border-radius: 50%; animation: jari-spin .8s linear infinite; }.jari-state h2 { margin: 23px 0 8px; font: 850 23px/1.2 Georgia, 'Noto Serif SC', serif; }.jari-state p { max-width: 440px; margin: 0; color: var(--jari-muted); line-height: 1.6; }.jari-state button { margin-top: 18px; min-height: 45px; padding: 0 17px; border: 0; border-radius: 14px; color: #fff; background: var(--jari-action); font-weight: 850; cursor: pointer; }
.jari-context { min-width: 0; overflow-y: auto; border-left: 1px solid var(--jari-line); background: var(--jari-panel); }.jari-context__quote { padding: 30px 25px; color: #f7f2e7; background: linear-gradient(155deg, #1e4d3f, #376f5d 58%, #9b7e55); }.jari-context__quote span { font-size: 9px; font-weight: 900; letter-spacing: .14em; }.jari-context__quote h2 { margin: 30px 0 12px; font: 800 27px/1.18 Georgia, 'Noto Serif SC', serif; }.jari-context__quote p { margin: 0; color: rgba(255,255,255,.82); font-size: 12px; line-height: 1.65; }
.jari-context__numbers { padding: 20px 24px; display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; border-bottom: 1px solid var(--jari-line); }.jari-context__numbers div { min-width: 0; padding: 12px 7px; text-align: center; border-radius: 14px; background: var(--jari-soft); }.jari-context__numbers strong, .jari-context__numbers span { display: block; }.jari-context__numbers strong { font: 850 22px/1 Georgia, serif; }.jari-context__numbers span { margin-top: 5px; color: var(--jari-muted); font-size: 9px; }
.jari-context__areas { padding: 24px; }.jari-context__areas h2 { margin: 0; font: 800 17px/1.2 Georgia, 'Noto Serif SC', serif; }.jari-context__areas > p { margin: 7px 0 10px; color: var(--jari-muted); font-size: 10px; line-height: 1.45; }.jari-context__area-row { display: grid; grid-template-columns: minmax(0,1fr) 42px; align-items: center; border-bottom: 1px solid var(--jari-line); }.jari-context__area-row button { border: 0; color: inherit; background: transparent; cursor: pointer; }.jari-context__area-filter { width: 100%; min-height: 64px; padding: 9px 2px; display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: 9px; text-align: left; }.jari-context__area-filter > span { min-width: 0; }.jari-context__areas strong, .jari-context__areas small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.jari-context__area-filter small { margin-top: 3px; color: var(--jari-muted); font-size: 10px; }.jari-context__area-filter i, .jari-context__area-map i { color: var(--jari-accent-ink); }.jari-context__area-map { width: 42px; height: 42px; border-radius: 13px !important; background: var(--jari-soft) !important; }.jari-context__area-map:hover { background: var(--jari-accent-soft) !important; }.jari-context__areas-note { margin-top: 13px; display: flex !important; gap: 7px; overflow: visible !important; color: var(--jari-muted); white-space: normal !important; line-height: 1.45; }.jari-context__areas-note i { margin-top: 2px; flex: 0 0 auto; }
.jari-detail-pane { position: absolute; inset: 0 0 0 205px; z-index: 5; min-width: 0; min-height: 0; box-shadow: -20px 0 70px rgba(8,18,13,.15); }
.jari-viewing-list { display: grid; gap: 10px; }.jari-viewing-list article { min-width: 0; padding: 17px; display: grid; grid-template-columns: 100px minmax(0,1fr) auto; align-items: start; gap: 15px; border: 1px solid var(--jari-line); border-radius: 21px 21px 8px 21px; background: var(--jari-panel); }.jari-viewing-list article.is-cancelled { border-style: dashed; background: var(--jari-soft); }.jari-viewing-list__date { padding: 13px 8px; text-align: center; border-radius: 16px; color: #fff; background: var(--jari-action); }.jari-viewing-list__date strong, .jari-viewing-list__date small { display: block; }.jari-viewing-list__date strong { font: 850 23px/1 Georgia, serif; }.jari-viewing-list__date small { margin-top: 6px; font-size: 9px; font-weight: 750; }.jari-viewing-list__copy { min-width: 0; }.jari-viewing-list__copy > small { color: var(--jari-accent-ink); font-weight: 850; }.jari-viewing-list__copy > strong, .jari-viewing-list__copy > span { display: block; }.jari-viewing-list__copy > strong { margin-top: 5px; font: 800 17px/1.3 Georgia, 'Noto Serif SC', serif; }.jari-viewing-list__copy > span, .jari-viewing-list__copy p { color: var(--jari-muted); font-size: 11px; }.jari-viewing-list__copy p { margin: 7px 0 0; line-height: 1.45; }.jari-viewing-list__actions { display: flex; gap: 6px; }.jari-viewing-list__actions button { width: 42px; height: 42px; border: 1px solid var(--jari-line); border-radius: 13px; color: var(--jari-copy); background: var(--jari-soft); cursor: pointer; }
button:focus-visible, input:focus-visible { outline: 3px solid var(--jari-focus); outline-offset: 2px; }
@keyframes jari-spin { to { transform: rotate(360deg); } }
@media (max-width: 980px) { .jari-layout { grid-template-columns: 190px minmax(0,1fr); }.jari-context { display: none; }.jari-detail-pane { left: 190px; } }
@media (max-width: 650px) {
  .jari-header { min-height: 88px; padding: calc(34px + env(safe-area-inset-top)) 10px 10px; }.jari-brand small { display: none; }.jari-brand strong { font-size: 19px; }:global(.app-shell[data-statusbar='off']) .jari-header { min-height: 64px; padding-top: calc(10px + env(safe-area-inset-top)); }
  .jari-layout { display: block; padding-bottom: calc(66px + env(safe-area-inset-bottom)); }.jari-rail { position: absolute; z-index: 4; inset: auto 0 0; height: calc(66px + env(safe-area-inset-bottom)); padding: 6px 7px env(safe-area-inset-bottom); border: 0; border-top: 1px solid var(--jari-line); }.jari-rail nav { height: 100%; display: grid; grid-template-columns: repeat(4,1fr); }.jari-rail nav button { position: relative; min-width: 0; min-height: 52px; padding: 4px 1px; display: flex; flex-direction: column; justify-content: center; gap: 3px; text-align: center; font-size: 9px; }.jari-rail nav button strong { position: absolute; top: 2px; left: calc(50% + 7px); }.jari-rail__folio { display: none; }
  .jari-content { height: 100%; padding: 18px 13px 28px; }.jari-content__lead { padding-inline: 2px; }.jari-content__lead h1 { font-size: 34px; }.jari-searchbar { grid-template-columns: 1fr auto; }.jari-mode { grid-column: 1 / -1; }.jari-mode button { flex: 1; }.jari-filter-button span { display: none; }.jari-detail-pane { inset: 0; }
  .jari-viewing-list article { grid-template-columns: 78px minmax(0,1fr); gap: 11px; }.jari-viewing-list__actions { grid-column: 1 / -1; justify-content: flex-end; }.jari-viewing-list__date strong { font-size: 19px; }
}
@media (prefers-reduced-motion: reduce) { .jari-state__loader { animation: none; border-color: var(--jari-accent); } }
</style>
