<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useTravelShellState } from '../composables/useTravelShellState'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  TRAVEL_BRAND,
  TRAVEL_FILTERS,
  TRAVEL_STAYS,
  getTravelAvailabilityMeta,
  getTravelRoom,
  getTravelStay,
  validateTravelFixtureContract,
} from '../lib/travel-shell-data'

const router = useRouter()
const route = useRoute()
const { languageBase, t } = useI18n()
const travelState = useTravelShellState()
const selectedStayId = ref('')
const selectedRoomId = ref('')
const searchQuery = ref('')
const feedback = ref('')
const form = reactive({ checkIn: '2026-09-18', checkOut: '2026-09-20', guests: 2 })

const isZh = computed(() => languageBase.value === 'zh')
const localized = (record, zhKey, enKey) => (isZh.value ? record?.[zhKey] : record?.[enKey]) || ''
const selectedStay = computed(() => getTravelStay(selectedStayId.value))
const selectedRoom = computed(() => getTravelRoom(selectedStayId.value, selectedRoomId.value))
const filteredStays = computed(() => TRAVEL_STAYS.filter((stay) => travelState.filterId.value === 'all' || stay.category === travelState.filterId.value))
const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (!query) return TRAVEL_STAYS
  return TRAVEL_STAYS.filter((stay) => [stay.nameZh, stay.nameEn, stay.cityZh, stay.cityEn, stay.districtZh, stay.districtEn].some((value) => value.toLocaleLowerCase().includes(query)))
})
const draftRows = computed(() => travelState.bookingDrafts.value.map((draft) => ({ ...draft, stay: getTravelStay(draft.stayId), room: getTravelRoom(draft.stayId, draft.roomId) })).filter((row) => row.stay && row.room))
const favoriteStays = computed(() => travelState.favoriteStayIds.value.map(getTravelStay).filter(Boolean))
const canDraftSelected = computed(() => selectedStay.value && ['available', 'limited'].includes(selectedStay.value.availability) && selectedRoom.value)
const won = (value) => `₩${Number(value || 0).toLocaleString('en-US')}`
const statusLabel = (stay) => localized(getTravelAvailabilityMeta(stay.availability), 'labelZh', 'labelEn')
const notify = (zh, en) => { feedback.value = t(zh, en); window.setTimeout(() => { feedback.value = '' }, 2200) }
const openStay = (stayId) => {
  travelState.recordRecent(stayId)
  selectedStayId.value = stayId
  selectedRoomId.value = getTravelStay(stayId)?.rooms?.[0]?.id || ''
}
const toggleFavorite = (stayId) => {
  const result = travelState.toggleFavorite(stayId)
  if (result.ok) notify(result.active ? '已收藏住宿' : '已取消收藏', result.active ? 'Stay saved' : 'Removed from saved')
}
const saveDraft = () => {
  if (!canDraftSelected.value) return notify('当前来源不允许建立意向', 'This source cannot create a draft')
  const result = travelState.saveBookingDraft({ stayId: selectedStayId.value, roomId: selectedRoomId.value, checkIn: form.checkIn, checkOut: form.checkOut, guests: Number(form.guests) })
  if (result.ok) notify('已保存本机住宿意向', 'Local stay draft saved')
  else notify('请检查日期、人数和房型', 'Check dates, guests, and room')
}
const closeApp = () => pushReturnTarget(router, route, '/home')
</script>

<template>
  <main class="roam-app" data-app="travel" data-testid="travel-app">
    <header class="roam-header">
      <button type="button" class="round-button" :aria-label="t('返回', 'Back')" data-testid="travel-back" @click="closeApp"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
      <div class="roam-brand"><span class="roam-mark"><i class="fas fa-route" aria-hidden="true"></i></span><span><strong>{{ isZh ? TRAVEL_BRAND.nameZh : TRAVEL_BRAND.nameEn }}</strong><small>{{ isZh ? TRAVEL_BRAND.taglineZh : TRAVEL_BRAND.taglineEn }}</small></span></div>
      <button type="button" class="trip-counter" data-testid="travel-header-trips" @click="travelState.setActiveTab('trips')"><span>{{ t('行程簿', 'Trips') }}</span><b>{{ draftRows.length }}</b></button>
    </header>
    <div v-if="feedback" class="roam-toast" role="status">{{ feedback }}</div>
    <section v-if="!validateTravelFixtureContract()" class="roam-error" role="alert"><h1>{{ t('住宿目录暂不可用', 'Stay catalog unavailable') }}</h1><p>{{ t('本地来源不完整，漫泊没有猜测房量。', 'Local sources are incomplete. ROAM did not invent availability.') }}</p></section>
    <template v-else>
      <div class="roam-content">
        <section v-if="travelState.activeTab.value === 'explore'" class="roam-page" data-testid="travel-explore">
          <article class="roam-hero">
            <div class="hero-copy"><span>WEEKEND NOTES / 01</span><h1>{{ t('旅行应该从一个想停下的地方开始。', 'A trip begins with somewhere worth stopping.') }}</h1><p>{{ t('看目的地、选住处、留一份意向。真实预订、付款与确认信等待后续 owner。', 'Browse destinations, choose a stay, and keep an intent. Real booking, payment, and confirmation wait for future owners.') }}</p></div>
            <div class="route-card" aria-hidden="true"><span>SEOUL</span><i></i><b>WEEKEND<br>ROUTE</b><i></i><span>ANYWHERE</span></div>
          </article>
          <nav class="filter-rail" :aria-label="t('住宿分类', 'Stay filters')"><button v-for="filter in TRAVEL_FILTERS" :key="filter.id" type="button" :class="{ 'is-active': travelState.filterId.value === filter.id }" :data-testid="`travel-filter-${filter.id}`" @click="travelState.setFilter(filter.id)">{{ localized(filter, 'labelZh', 'labelEn') }}</button></nav>
          <section class="stay-section"><header><div><span>{{ t('精选落脚点', 'CURATED STOPS') }}</span><h2>{{ t('为这次停留', 'For this pause') }}</h2></div><small>{{ filteredStays.length }} {{ t('处', 'stays') }}</small></header>
            <div class="stay-grid"><article v-for="stay in filteredStays" :key="stay.id" class="stay-card" :style="{ '--stay-color': stay.color }"><button type="button" class="stay-open" :data-testid="`travel-stay-${stay.id}`" @click="openStay(stay.id)"><div class="stay-visual"><span>{{ stay.stamp }}</span><b>{{ stay.cityEn.slice(0, 1) }}</b><small>{{ localized(stay, 'districtZh', 'districtEn') }}</small></div><div class="stay-copy"><span class="availability" :class="`tone-${getTravelAvailabilityMeta(stay.availability).tone}`">{{ statusLabel(stay) }}</span><h3>{{ localized(stay, 'nameZh', 'nameEn') }}</h3><p>{{ localized(stay, 'cityZh', 'cityEn') }} · {{ localized(stay, 'districtZh', 'districtEn') }}</p><div><b>{{ won(stay.pricePerNight) }}</b><small>/ {{ t('晚', 'night') }}</small><em>★ {{ stay.rating }}</em></div></div></button><button type="button" class="heart-button" :aria-label="t('收藏住宿', 'Save stay')" @click="toggleFavorite(stay.id)"><i :class="travelState.favoriteStayIds.value.includes(stay.id) ? 'fas fa-heart' : 'far fa-heart'" aria-hidden="true"></i></button></article></div>
          </section>
        </section>

        <section v-else-if="travelState.activeTab.value === 'search'" class="roam-page" data-testid="travel-search"><div class="page-heading"><span>WHERE TO NEXT</span><h1>{{ t('搜索目的地与住处', 'Search destinations and stays') }}</h1></div><label class="search-box"><i class="fas fa-magnifying-glass" aria-hidden="true"></i><span class="sr-only">{{ t('搜索', 'Search') }}</span><input v-model="searchQuery" type="search" :placeholder="t('城市、街区或住宿名称', 'City, district, or stay')" data-testid="travel-search-input"></label><div class="search-results"><button v-for="stay in searchResults" :key="stay.id" type="button" @click="openStay(stay.id)"><span :style="{ background: stay.color }">{{ stay.stamp.slice(0, 2) }}</span><span><b>{{ localized(stay, 'nameZh', 'nameEn') }}</b><small>{{ localized(stay, 'cityZh', 'cityEn') }} · {{ localized(stay, 'districtZh', 'districtEn') }}</small></span><em>{{ statusLabel(stay) }}</em></button></div></section>

        <section v-else-if="travelState.activeTab.value === 'trips'" class="roam-page" data-testid="travel-trips"><div class="page-heading"><span>MY ROAM BOOK</span><h1>{{ t('行程簿', 'Trip book') }}</h1><p>{{ t('这里只保存本机住宿意向。它不是订单、付款、房态锁定或日历行程。', 'These are local stay intents, not bookings, payments, room holds, or Calendar trips.') }}</p></div><div v-if="draftRows.length" class="draft-stack"><article v-for="row in draftRows" :key="row.stayId"><div class="draft-stamp"><span>LOCAL</span><b>DRAFT</b></div><div><span>{{ localized(row.stay, 'cityZh', 'cityEn') }}</span><h2>{{ localized(row.stay, 'nameZh', 'nameEn') }}</h2><p>{{ row.checkIn }} → {{ row.checkOut }} · {{ row.guests }} {{ t('人', 'guests') }}</p><small>{{ localized(row.room, 'nameZh', 'nameEn') }}</small></div><button type="button" :aria-label="t('移除意向', 'Remove draft')" @click="travelState.removeBookingDraft(row.stayId)"><i class="fas fa-xmark" aria-hidden="true"></i></button></article></div><div v-else class="empty-state"><i class="fas fa-suitcase-rolling" aria-hidden="true"></i><h2>{{ t('还没有住宿意向', 'No stay drafts yet') }}</h2><p>{{ t('在住宿详情选择日期、人数和房型。', 'Choose dates, guests, and a room from a stay detail.') }}</p><button type="button" @click="travelState.setActiveTab('explore')">{{ t('去看看', 'Explore stays') }}</button></div></section>

        <section v-else class="roam-page" data-testid="travel-me"><div class="page-heading"><span>TRAVEL DESK</span><h1>{{ t('我的漫泊', 'My ROAM') }}</h1></div><div class="me-cards"><article><span>{{ t('已收藏', 'SAVED') }}</span><b>{{ favoriteStays.length }}</b><p>{{ t('住宿收藏仅保留在这台设备。', 'Stay favorites remain on this device.') }}</p></article><article><span>{{ t('意向簿', 'DRAFTS') }}</span><b>{{ draftRows.length }}</b><p>{{ t('后续可由预订 owner 升级为真实订单。', 'A future booking owner may upgrade these into real reservations.') }}</p></article></div><article class="alert-card"><div><span>PRICE NOTES</span><h2>{{ t('价格提醒偏好', 'Price alert preference') }}</h2><p>{{ t('首版只保存偏好，不会生成系统通知。', 'S1 saves only a preference and creates no system notification.') }}</p></div><button type="button" role="switch" :aria-checked="travelState.dealAlertsEnabled.value" data-testid="travel-alert-toggle" @click="travelState.toggleDealAlerts"><span></span></button></article></section>
      </div>

      <nav class="roam-nav" :aria-label="t('漫泊导航', 'ROAM navigation')"><button v-for="tab in [{id:'explore',zh:'发现',en:'Explore',icon:'fa-compass'},{id:'search',zh:'搜索',en:'Search',icon:'fa-magnifying-glass'},{id:'trips',zh:'行程簿',en:'Trips',icon:'fa-suitcase'},{id:'me',zh:'我的',en:'Me',icon:'fa-user'}]" :key="tab.id" type="button" :class="{ 'is-active': travelState.activeTab.value === tab.id }" :data-testid="`travel-tab-${tab.id}`" @click="travelState.setActiveTab(tab.id)"><i class="fas" :class="tab.icon" aria-hidden="true"></i><span>{{ t(tab.zh, tab.en) }}</span><b v-if="tab.id === 'trips' && draftRows.length">{{ draftRows.length }}</b></button></nav>

      <section v-if="selectedStay" class="stay-detail" data-testid="travel-stay-detail" :style="{ '--stay-color': selectedStay.color }"><button type="button" class="detail-close" :aria-label="t('关闭详情', 'Close detail')" @click="selectedStayId = ''"><i class="fas fa-xmark" aria-hidden="true"></i></button><div class="detail-banner"><span>{{ selectedStay.stamp }}</span><b>{{ selectedStay.cityEn.slice(0, 1) }}</b><small>{{ localized(selectedStay, 'cityZh', 'cityEn') }} / {{ localized(selectedStay, 'districtZh', 'districtEn') }}</small></div><div class="detail-body"><span class="availability" :class="`tone-${getTravelAvailabilityMeta(selectedStay.availability).tone}`">{{ statusLabel(selectedStay) }}</span><h1>{{ localized(selectedStay, 'nameZh', 'nameEn') }}</h1><p class="detail-summary">{{ localized(selectedStay, 'summaryZh', 'summaryEn') }}</p><ul><li v-for="feature in (isZh ? selectedStay.featuresZh : selectedStay.featuresEn)" :key="feature"><i class="fas fa-check" aria-hidden="true"></i>{{ feature }}</li></ul><div class="map-reference"><i class="fas fa-map-location-dot" aria-hidden="true"></i><div><b>{{ t('Map 地点引用', 'Map place reference') }}</b><small>{{ selectedStay.mapPlaceId }}</small></div><span>{{ t('只读', 'READ ONLY') }}</span></div>
        <template v-if="['available', 'limited'].includes(selectedStay.availability)"><fieldset><legend>{{ t('选择房型', 'Choose a room') }}</legend><label v-for="room in selectedStay.rooms" :key="room.id" :class="{ 'is-selected': selectedRoomId === room.id }"><input v-model="selectedRoomId" type="radio" :value="room.id"><span><b>{{ localized(room, 'nameZh', 'nameEn') }}</b><small>{{ localized(room, 'cancellationZh', 'cancellationEn') }}</small></span><strong>{{ won(room.price) }}</strong></label></fieldset><div class="booking-form"><label><span>{{ t('入住', 'Check in') }}</span><input v-model="form.checkIn" type="date"></label><label><span>{{ t('离店', 'Check out') }}</span><input v-model="form.checkOut" type="date"></label><label><span>{{ t('人数', 'Guests') }}</span><input v-model.number="form.guests" type="number" min="1" max="6"></label></div><div class="detail-boundary"><i class="fas fa-circle-info" aria-hidden="true"></i>{{ t('保存后只会建立本机意向：不扣款、不锁房、不写入邮件、日历、地图或行程。', 'Saving creates only a local intent: no payment, room hold, Mail, Calendar, Map, or Agenda write.') }}</div><button type="button" class="save-draft" data-testid="travel-save-draft" @click="saveDraft">{{ t('保存住宿意向', 'Save stay draft') }}</button></template><div v-else class="closed-source" data-testid="travel-source-closed"><i class="fas fa-lock" aria-hidden="true"></i><h2>{{ statusLabel(selectedStay) }}</h2><p>{{ selectedStay.availability === 'source_stale' ? t('该来源需等待后续 owner 刷新，不能用旧价格建立意向。', 'A future owner must refresh this source; stale prices cannot create a draft.') : t('当前没有可用房型，首版不生成候补或假房量。', 'No rooms are available. S1 creates no waitlist or invented inventory.') }}</p></div></div></section>
    </template>
  </main>
</template>

<style scoped>
.roam-app {
  --sand: #faf6ef;
  --paper: #fffdf8;
  --ink: #3a2e26;
  --muted: #6b6157;
  --line: #e2dacd;
  --clay: #b85c38;
  --clay-strong: #9c4a2b;
  --coral: #e07856;
  --soft: #f2e3d8;
  --focus: #e89b7d;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--ink);
  background: var(--sand);
  font-family: "Aptos", "Segoe UI", "Noto Sans CJK SC", sans-serif;
}

:global(.app-shell:has(.roam-app) .status-fg) {
  color: var(--ink);
}

.roam-header {
  min-height: 92px;
  padding: calc(34px + env(safe-area-inset-top)) 18px 9px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--paper) 94%, transparent);
  flex: none;
}

.round-button,
.detail-close {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.roam-brand {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
}

.roam-mark {
  width: 45px;
  height: 45px;
  display: grid;
  place-items: center;
  border-radius: 15px 15px 15px 4px;
  color: #fff;
  background: var(--clay);
  box-shadow: inset -8px -8px 0 rgba(255, 255, 255, 0.12);
}

.roam-brand > span:last-child {
  min-width: 0;
}

.roam-brand strong,
.roam-brand small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roam-brand strong {
  font: 900 21px/1 "Avenir Next", "Noto Sans CJK SC", sans-serif;
  letter-spacing: .01em;
}

.roam-brand small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}

.trip-counter {
  margin-left: auto;
  min-height: 38px;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: inherit;
  background: var(--paper);
  font-weight: 850;
  cursor: pointer;
}

.trip-counter b {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--coral);
  font-size: 10px;
}

.roam-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 86px;
}

.roam-page {
  width: min(1120px, 100%);
  margin: auto;
  padding: 22px;
  box-sizing: border-box;
}

.roam-toast {
  position: absolute;
  z-index: 30;
  top: 98px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 16px;
  border-radius: 999px;
  color: #fff;
  background: #3a2e26;
  box-shadow: 0 12px 30px rgba(58, 46, 38, 0.35);
  font-size: 12px;
  font-weight: 850;
}

.roam-error {
  margin: auto;
  text-align: center;
}

.roam-hero {
  min-height: 320px;
  padding: 42px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  align-items: center;
  gap: 30px;
  overflow: hidden;
  border-radius: 28px 28px 28px 7px;
  color: #fff;
  background:
    radial-gradient(circle at 15% 20%, rgba(255, 255, 255, 0.16) 0 2px, transparent 3px),
    linear-gradient(140deg, #a8502f 0%, #b85c38 55%, #c76f47 100%);
  background-size: 24px 24px, auto;
}

.hero-copy > span,
.stay-section header span,
.page-heading > span,
.me-cards span,
.alert-card > div > span {
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .18em;
}

.hero-copy h1 {
  max-width: 700px;
  margin: 28px 0 16px;
  font: 850 clamp(37px, 5.4vw, 62px)/1.04 "Avenir Next", "Noto Sans CJK SC", sans-serif;
  letter-spacing: -.03em;
}

.hero-copy p {
  max-width: 650px;
  margin: 0;
  color: #f7e4d8;
  line-height: 1.65;
}

.route-card {
  height: 210px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  border-radius: 3px 22px 3px 22px;
  color: var(--ink);
  background: #f7e7c4;
  transform: rotate(3deg);
  box-shadow: 15px 17px 0 rgba(58, 46, 38, 0.3);
}

.route-card span {
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .16em;
}

.route-card i {
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--coral) 0 8px, transparent 8px 13px);
}

.route-card b {
  font: 900 32px/1 "Avenir Next", sans-serif;
}

.filter-rail {
  padding: 18px 0 4px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-rail button {
  min-height: 42px;
  padding: 0 16px;
  flex: none;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: inherit;
  background: var(--paper);
  font-weight: 850;
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease, background 160ms ease;
}

.filter-rail button.is-active {
  color: #fff;
  background: var(--clay);
  border-color: var(--clay);
}

.stay-section {
  margin-top: 26px;
}

.stay-section > header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  margin-bottom: 13px;
}

.stay-section h2,
.page-heading h1 {
  margin: 6px 0 0;
  font: 850 34px/1.05 "Avenir Next", "Noto Sans CJK SC", sans-serif;
  letter-spacing: -.02em;
}

.stay-section header small {
  color: var(--muted);
}

.stay-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.stay-card {
  position: relative;
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 22px 22px 22px 6px;
  overflow: hidden;
  background: var(--paper);
  transition: border-color 160ms ease, transform 180ms ease, box-shadow 180ms ease;
}

.stay-card:hover {
  border-color: #d8c9b8;
  transform: translateY(-2px);
  box-shadow: 0 14px 34px rgba(58, 46, 38, 0.1);
}

.stay-open {
  width: 100%;
  min-height: 230px;
  padding: 0;
  display: grid;
  grid-template-columns: 165px minmax(0, 1fr);
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.stay-visual {
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
  background: var(--stay-color);
  background-image: linear-gradient(160deg, rgba(255, 255, 255, 0.18), transparent 55%);
}

.stay-visual > span {
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .16em;
}

.stay-visual > b {
  font: 900 92px/.8 "Avenir Next", sans-serif;
  opacity: .9;
}

.stay-visual small {
  font-weight: 800;
}

.stay-copy {
  padding: 20px 54px 18px 18px;
}

.stay-copy h3 {
  margin: 16px 0 9px;
  font: 800 23px/1.12 "Avenir Next", "Noto Sans CJK SC", sans-serif;
}

.stay-copy > p {
  margin: 0 0 23px;
  color: var(--muted);
}

.stay-copy > div {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stay-copy > div > b {
  font-size: 18px;
}

.stay-copy > div small {
  color: var(--muted);
}

.stay-copy > div em {
  margin-left: auto;
  color: var(--coral);
  font-style: normal;
  font-weight: 900;
}

.availability {
  display: inline-flex;
  min-height: 25px;
  padding: 0 9px;
  align-items: center;
  border-radius: 999px;
  color: var(--clay);
  background: var(--soft);
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .06em;
}

.tone-limited {
  color: #9d5b11;
  background: #f6e4bd;
}

.tone-closed,
.tone-stale {
  color: var(--muted);
  background: color-mix(in srgb, var(--muted) 13%, transparent);
}

.heart-button {
  position: absolute;
  right: 9px;
  top: 9px;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  color: var(--coral);
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  cursor: pointer;
}

.page-heading {
  padding: 18px 0 24px;
  border-bottom: 2px solid var(--ink);
}

.page-heading > span {
  color: var(--coral);
}

.page-heading p {
  max-width: 760px;
  color: var(--muted);
  line-height: 1.6;
}

.search-box {
  margin-top: 20px;
  padding: 0 18px;
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 18px;
  background: var(--paper);
}

.search-box input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: inherit;
  background: transparent;
  font: 750 16px/1 inherit;
}

.search-results {
  margin-top: 16px;
  display: grid;
}

.search-results button {
  min-height: 82px;
  padding: 10px 4px;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  border: 0;
  border-bottom: 1px solid var(--line);
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.search-results > button > span:first-child {
  width: 50px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 13px 13px 13px 3px;
  color: #fff;
  font-weight: 950;
}

.search-results b,
.search-results small {
  display: block;
}

.search-results small {
  margin-top: 5px;
  color: var(--muted);
}

.search-results em {
  color: var(--clay);
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}

.draft-stack {
  margin-top: 22px;
  display: grid;
  gap: 13px;
}

.draft-stack article {
  min-height: 145px;
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) 52px;
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 20px 20px 20px 5px;
  overflow: hidden;
  background: var(--paper);
}

.draft-stamp {
  height: 100%;
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  color: #fff;
  background: var(--clay);
}

.draft-stamp span {
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .15em;
}

.draft-stamp b {
  font: 900 21px/1 "Avenir Next", sans-serif;
  writing-mode: vertical-rl;
}

.draft-stack article > div:nth-child(2) {
  padding: 18px;
}

.draft-stack h2 {
  margin: 7px 0;
  font: 800 22px/1.15 "Avenir Next", "Noto Sans CJK SC", sans-serif;
}

.draft-stack p {
  margin: 0 0 6px;
  color: var(--muted);
}

.draft-stack small {
  font-weight: 800;
}

.draft-stack button {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.empty-state {
  margin: 70px auto;
  text-align: center;
}

.empty-state > i {
  font-size: 56px;
  color: var(--clay);
}

.empty-state button {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  color: #fff;
  background: var(--clay);
  font-weight: 900;
  cursor: pointer;
}

.me-cards {
  margin-top: 22px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
}

.me-cards article,
.alert-card {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 22px 22px 22px 6px;
  background: var(--paper);
}

.me-cards b {
  display: block;
  margin: 24px 0 6px;
  font: 850 54px/1 "Avenir Next", sans-serif;
}

.me-cards p,
.alert-card p {
  color: var(--muted);
  line-height: 1.55;
}

.alert-card {
  margin-top: 13px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.alert-card h2 {
  margin: 8px 0;
}

.alert-card button {
  width: 56px;
  height: 34px;
  padding: 4px;
  border: 0;
  border-radius: 999px;
  background: #a89a8d;
  flex: none;
  cursor: pointer;
}

.alert-card button[aria-checked="true"] {
  background: var(--clay);
}

.alert-card button span {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  transition: transform .2s;
}

.alert-card button[aria-checked="true"] span {
  transform: translateX(22px);
}

.roam-nav {
  position: absolute;
  z-index: 8;
  left: 50%;
  bottom: calc(10px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(530px, calc(100% - 24px));
  height: 64px;
  padding: 5px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid var(--line);
  border-radius: 22px;
  background: color-mix(in srgb, var(--paper) 91%, transparent);
  box-shadow: 0 15px 38px rgba(58, 46, 38, 0.16);
  backdrop-filter: blur(18px);
}

.roam-nav button {
  position: relative;
  min-width: 0;
  border: 0;
  border-radius: 17px;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  transition: color 160ms ease, background 160ms ease;
}

.roam-nav button.is-active {
  color: #fff;
  background: var(--clay);
}

.roam-nav i,
.roam-nav span {
  display: block;
}

.roam-nav span {
  margin-top: 3px;
  font-size: 10px;
  font-weight: 850;
}

.roam-nav b {
  position: absolute;
  top: 3px;
  right: calc(50% - 23px);
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--coral);
  font-size: 9px;
}

.stay-detail {
  position: absolute;
  z-index: 20;
  inset: 0 0 0 auto;
  width: min(720px, 100%);
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  overflow-y: auto;
  color: var(--ink);
  background: var(--paper);
  box-shadow: -24px 0 70px rgba(58, 46, 38, 0.28);
  animation: roam-detail-in 220ms ease both;
}

@keyframes roam-detail-in {
  from { transform: translateX(22px); opacity: 0; }
  to { transform: none; opacity: 1; }
}

.detail-close {
  position: absolute;
  z-index: 2;
  right: 14px;
  top: calc(34px + env(safe-area-inset-top));
  background: color-mix(in srgb, var(--paper) 88%, transparent);
}

.detail-banner {
  min-height: 100%;
  padding: calc(108px + env(safe-area-inset-top)) 26px 32px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  color: #fff;
  background: var(--stay-color);
  background-image: linear-gradient(160deg, rgba(255, 255, 255, 0.2), transparent 60%);
}

.detail-banner span,
.detail-banner small {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .14em;
}

.detail-banner b {
  font: 900 130px/.8 "Avenir Next", sans-serif;
}

.detail-body {
  padding: calc(112px + env(safe-area-inset-top)) 34px 60px;
}

.detail-body h1 {
  margin: 18px 0;
  font: 850 39px/1.05 "Avenir Next", "Noto Sans CJK SC", sans-serif;
  letter-spacing: -.02em;
}

.detail-summary {
  color: var(--muted);
  line-height: 1.65;
}

.detail-body ul {
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  list-style: none;
}

.detail-body li {
  padding: 10px;
  border-radius: 10px;
  background: var(--soft);
  font-size: 11px;
  font-weight: 800;
}

.detail-body li i {
  margin-right: 7px;
  color: var(--clay);
}

.map-reference {
  margin: 20px 0;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
}

.map-reference > i {
  color: var(--coral);
  font-size: 20px;
}

.map-reference div {
  min-width: 0;
  flex: 1;
}

.map-reference b,
.map-reference small {
  display: block;
}

.map-reference small {
  margin-top: 4px;
  color: var(--muted);
  overflow-wrap: anywhere;
}

.map-reference > span {
  font-size: 8px;
  font-weight: 950;
  letter-spacing: .1em;
}

.detail-body fieldset {
  margin: 20px 0;
  padding: 0;
  border: 0;
}

.detail-body legend {
  margin-bottom: 10px;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .1em;
}

.detail-body fieldset label {
  padding: 13px;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--line);
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;
}

.detail-body fieldset label + label {
  border-top: 0;
}

.detail-body fieldset label.is-selected {
  border-color: var(--clay);
  background: var(--soft);
}

.detail-body fieldset label span b,
.detail-body fieldset label span small {
  display: block;
}

.detail-body fieldset label span small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}

.booking-form {
  display: grid;
  grid-template-columns: 1fr 1fr 84px;
  gap: 8px;
}

.booking-form label span {
  display: block;
  margin-bottom: 5px;
  font-size: 9px;
  font-weight: 900;
}

.booking-form input {
  width: 100%;
  min-width: 0;
  height: 42px;
  padding: 0 9px;
  box-sizing: border-box;
  border: 1px solid var(--line);
  border-radius: 9px;
  color: inherit;
  background: var(--sand);
}

.detail-boundary {
  margin-top: 16px;
  padding: 13px;
  display: flex;
  gap: 9px;
  color: var(--muted);
  background: var(--sand);
  font-size: 11px;
  line-height: 1.5;
}

.save-draft {
  width: 100%;
  min-height: 50px;
  margin-top: 12px;
  border: 0;
  border-radius: 14px;
  color: #fff;
  background: var(--clay);
  font-weight: 950;
  cursor: pointer;
  transition: background 160ms ease, transform 120ms ease;
}

.save-draft:hover {
  background: var(--clay-strong);
}

.save-draft:active {
  transform: scale(.99);
}

.closed-source {
  margin-top: 26px;
  padding: 30px;
  border-radius: 20px;
  background: var(--sand);
  text-align: center;
}

.closed-source > i {
  font-size: 34px;
  color: var(--muted);
}

.closed-source h2 {
  font-family: "Avenir Next", "Noto Sans CJK SC", sans-serif;
}

.closed-source p {
  color: var(--muted);
  line-height: 1.6;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

button:focus-visible,
input:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 2px;
}

@media (max-width: 700px) {
  .roam-header { min-height: 88px; padding: calc(34px + env(safe-area-inset-top)) 10px 8px; }
  .roam-brand small, .trip-counter span { display: none; }
  .roam-page { padding: 15px 14px 100px; }
  .roam-hero { min-height: 430px; padding: 28px; display: block; position: relative; }
  .hero-copy h1 { font-size: 43px; }
  .route-card { position: absolute; right: -24px; bottom: -25px; width: 180px; height: 150px; padding: 16px; opacity: .76; }
  .route-card b { font-size: 23px; }
  .stay-grid { grid-template-columns: 1fr; }
  .stay-open { grid-template-columns: 116px minmax(0, 1fr); }
  .stay-visual > b { font-size: 68px; }
  .stay-copy { padding: 17px 48px 17px 15px; }
  .stay-copy h3 { font-size: 20px; }
  .search-results button { grid-template-columns: 48px minmax(0, 1fr); }
  .search-results em { grid-column: 2; }
  .draft-stack article { grid-template-columns: 82px minmax(0, 1fr) 44px; }
  .draft-stamp { padding: 12px; }
  .me-cards { grid-template-columns: 1fr; }
  .stay-detail { display: block; }
  .detail-banner { min-height: 300px; padding: calc(92px + env(safe-area-inset-top)) 24px 24px; }
  .detail-banner b { font-size: 100px; }
  .detail-body { padding: 28px 20px 70px; }
  .detail-body h1 { font-size: 34px; }
  .detail-body ul { grid-template-columns: 1fr; }
  .booking-form { grid-template-columns: 1fr 1fr; }
  .booking-form label:last-child { grid-column: 1 / -1; }
  .roam-nav { width: calc(100% - 20px); }
}

@media (prefers-reduced-motion: reduce) {
  .roam-app *,
  .roam-app *::before,
  .roam-app *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
