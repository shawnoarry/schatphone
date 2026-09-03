<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { pushReturnTarget } from '../lib/navigation-return'
import { useIntercityShellState } from '../composables/useIntercityShellState'
import {
  INTERCITY_AVAILABILITY_META,
  INTERCITY_BRAND,
  INTERCITY_MODES,
  INTERCITY_SERVICES,
  getIntercityFare,
  getIntercityService,
} from '../lib/intercity-shell-data'

const router = useRouter()
const route = useRoute()
const systemStore = useSystemStore()
const shell = useIntercityShellState()
const selectedId = ref('')
const selectedFareId = ref('')
const passengers = ref(1)
const searchQuery = ref('')

const isZh = computed(() => String(systemStore.settings.system.language || 'zh-CN').toLowerCase().startsWith('zh'))
const tx = (zh, en) => isZh.value ? zh : en
const localize = (record, key) => record?.[`${key}${isZh.value ? 'Zh' : 'En'}`] || ''
const money = (value) => new Intl.NumberFormat(isZh.value ? 'zh-CN' : 'en-US').format(value)
const activeTab = computed(() => shell.activeTab.value)
const selected = computed(() => getIntercityService(selectedId.value))
const selectedFare = computed(() => getIntercityFare(selectedId.value, selectedFareId.value))
const visibleServices = computed(() => INTERCITY_SERVICES.filter((service) => shell.modeId.value === 'all' || service.mode === shell.modeId.value))
const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return INTERCITY_SERVICES
  return INTERCITY_SERVICES.filter((service) => [service.originZh, service.originEn, service.destinationZh, service.destinationEn, service.serviceNo, service.carrierZh, service.carrierEn].some((value) => String(value).toLowerCase().includes(query)))
})
const draftRows = computed(() => shell.tripDrafts.value.map((draft) => ({ ...draft, service: getIntercityService(draft.serviceId), fare: getIntercityFare(draft.serviceId, draft.fareId) })).filter((row) => row.service && row.fare))
const modeMeta = (id) => INTERCITY_MODES.find((mode) => mode.id === id) || INTERCITY_MODES[0]
const statusMeta = (status) => INTERCITY_AVAILABILITY_META[status] || INTERCITY_AVAILABILITY_META.unavailable

const openService = (service) => {
  selectedId.value = service.id
  selectedFareId.value = service.fares[0]?.id || ''
  passengers.value = 1
  shell.recordRecent(service.id)
}
const saveDraft = () => {
  const receipt = shell.saveTripDraft({ serviceId: selectedId.value, fareId: selectedFareId.value, passengers: Number(passengers.value) })
  if (receipt.ok) selectedId.value = ''
}
const quickSearch = () => {
  searchQuery.value = isZh.value ? '釜山' : 'Busan'
  shell.setActiveTab('search')
}
const goBack = () => pushReturnTarget(router, route, '/home')
const onDetailKeydown = (event) => { if (event.key === 'Escape' && selectedId.value) selectedId.value = '' }
onMounted(() => window.addEventListener('keydown', onDetailKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onDetailKeydown))
</script>

<template>
  <main class="via-app" data-testid="intercity-app" data-app="intercity">
    <header class="via-header">
      <button class="icon-button" type="button" :aria-label="tx('返回', 'Back')" data-testid="intercity-back" @click="goBack"><i class="fas fa-chevron-left" aria-hidden="true" /></button>
      <div class="via-brand"><span>VIA</span><div><b>{{ tx(INTERCITY_BRAND.nameZh, INTERCITY_BRAND.nameEn) }}</b><small>{{ tx(INTERCITY_BRAND.taglineZh, INTERCITY_BRAND.taglineEn) }}</small></div></div>
      <div class="trip-count"><b>{{ shell.tripDrafts.value.length }}</b><span>{{ tx('行程夹', 'Trip file') }}</span></div>
    </header>

    <section v-if="activeTab === 'discover'" class="via-page" data-testid="intercity-discover">
      <div class="board-hero">
        <div class="hero-copy"><span>{{ tx('下一段 · 静态班次', 'NEXT LEG · AUTHORED SCHEDULES') }}</span><h1>{{ tx('从首尔出发，\n把路接上。', 'Leave Seoul.\nJoin the route.') }}</h1><p>{{ tx('铁路、航班、长途巴士与渡轮共用一个清楚的比较入口。', 'Compare rail, flights, coaches, and ferries in one clear place.') }}</p></div>
        <button type="button" data-testid="intercity-quick-search" @click="quickSearch"><small>{{ tx('示例路线', 'SAMPLE ROUTE') }}</small><b>SEL <i class="fas fa-arrow-right-long" aria-hidden="true" /> BSN</b><span>2026.08.28</span></button>
      </div>
      <div class="mode-strip" :aria-label="tx('交通方式', 'Transport modes')">
        <button v-for="mode in INTERCITY_MODES" :key="mode.id" type="button" :class="{ 'is-active': shell.modeId.value === mode.id }" :data-testid="`intercity-mode-${mode.id}`" @click="shell.setMode(mode.id)"><i :class="mode.icon" aria-hidden="true" /><span>{{ localize(mode, 'label') }}</span></button>
      </div>
      <div class="section-title"><div><small>{{ tx('班次板', 'DEPARTURE BOARD') }}</small><h2>{{ tx('可比较的下一程', 'The next leg, side by side') }}</h2></div><span>{{ visibleServices.length.toString().padStart(2, '0') }}</span></div>
      <div class="service-grid">
        <article v-for="service in visibleServices" :key="service.id" class="service-card" :style="{ '--service': service.color }">
          <button class="service-open" type="button" :data-testid="`intercity-service-${service.id}`" @click="openService(service)">
            <div class="service-top"><span><i :class="modeMeta(service.mode).icon" aria-hidden="true" /> {{ localize(modeMeta(service.mode), 'label') }}</span><em :class="`tone-${statusMeta(service.availability).tone}`">{{ localize(statusMeta(service.availability), 'label') }}</em></div>
            <div class="route-line"><div><b>{{ service.originCode }}</b><small>{{ localize(service, 'origin') }}</small></div><span><i aria-hidden="true" /><small>{{ localize(service, 'duration') }}</small><i aria-hidden="true" /></span><div><b>{{ service.destinationCode }}</b><small>{{ localize(service, 'destination') }}</small></div></div>
            <div class="time-line"><b>{{ service.departureTime }}</b><span>{{ service.serviceNo }} · {{ localize(service, 'carrier') }}</span><b>{{ service.arrivalTime }}</b></div>
            <div class="service-bottom"><span>{{ service.date }}</span><b v-if="service.fares[0]">₩ {{ money(service.fares[0].price) }} {{ tx('起', 'from') }}</b><b v-else>—</b></div>
          </button>
          <button class="favorite" type="button" :aria-label="tx('收藏班次', 'Favorite service')" :aria-pressed="shell.favoriteServiceIds.value.includes(service.id)" @click="shell.toggleFavorite(service.id)"><i :class="shell.favoriteServiceIds.value.includes(service.id) ? 'fas fa-bookmark' : 'far fa-bookmark'" aria-hidden="true" /></button>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'search'" class="via-page" data-testid="intercity-search">
      <div class="search-heading"><small>{{ tx('查班次', 'FIND A SERVICE') }}</small><h1>{{ tx('去哪一站？', 'Where to next?') }}</h1></div>
      <label class="search-box"><i class="fas fa-magnifying-glass" aria-hidden="true" /><span class="sr-only">{{ tx('搜索城市、代码或班次', 'Search city, code, or service') }}</span><input v-model="searchQuery" data-testid="intercity-search-input" :placeholder="tx('城市、车站、机场或班次号', 'City, station, airport, or service number')" /></label>
      <div class="search-list">
        <button v-for="service in searchResults" :key="service.id" type="button" @click="openService(service)"><i :class="modeMeta(service.mode).icon" aria-hidden="true" /><span><b>{{ localize(service, 'origin') }} → {{ localize(service, 'destination') }}</b><small>{{ service.date }} · {{ service.departureTime }} · {{ service.serviceNo }}</small></span><em :class="`tone-${statusMeta(service.availability).tone}`">{{ localize(statusMeta(service.availability), 'label') }}</em></button>
      </div>
    </section>

    <section v-else-if="activeTab === 'trips'" class="via-page" data-testid="intercity-trips">
      <div class="search-heading"><small>{{ tx('本机行程夹', 'LOCAL TRIP FILE') }}</small><h1>{{ tx('还没出票的计划', 'Plans, not tickets') }}</h1><p>{{ tx('这里保存的是比较后的出行意向，不是订单、占座、付款、登机牌或日历行程。', 'These are travel intents, not orders, seat holds, payments, boarding passes, or Calendar trips.') }}</p></div>
      <div v-if="draftRows.length" class="draft-list">
        <article v-for="row in draftRows" :key="row.serviceId"><div class="draft-mode"><i :class="modeMeta(row.service.mode).icon" aria-hidden="true" /><small>LOCAL</small></div><div><span>{{ row.service.date }} · {{ row.service.departureTime }}</span><h2>{{ row.service.originCode }} → {{ row.service.destinationCode }}</h2><p>{{ localize(row.fare, 'name') }} · {{ row.passengers }} {{ tx('人', 'passenger(s)') }}</p></div><button type="button" :aria-label="tx('移除意向', 'Remove intent')" @click="shell.removeTripDraft(row.serviceId)"><i class="fas fa-xmark" aria-hidden="true" /></button></article>
      </div>
      <div v-else class="empty-state"><i class="fas fa-route" aria-hidden="true" /><h2>{{ tx('行程夹还是空的', 'Your trip file is empty') }}</h2><p>{{ tx('打开可用班次，选择舱等后保存一份本机意向。', 'Open an available service, choose a fare, and save a local intent.') }}</p><button type="button" @click="shell.setActiveTab('discover')">{{ tx('查看班次', 'Browse services') }}</button></div>
    </section>

    <section v-else class="via-page" data-testid="intercity-me">
      <div class="search-heading"><small>{{ tx('我的联程', 'MY VIA') }}</small><h1>{{ tx('出发前的安静准备', 'Quiet prep before departure') }}</h1></div>
      <div class="metric-grid"><article><span>{{ tx('收藏', 'Saved') }}</span><b>{{ shell.favoriteServiceIds.value.length }}</b></article><article><span>{{ tx('最近查看', 'Recent') }}</span><b>{{ shell.recentServiceIds.value.length }}</b></article></div>
      <article class="alert-card"><div><small>{{ tx('票价提示', 'FARE ALERTS') }}</small><h2>{{ tx('保留本机偏好', 'Keep a local preference') }}</h2><p>{{ tx('首版不会发送系统通知，也不会连接真实售票渠道。', 'S1 sends no system notification and connects to no live ticket provider.') }}</p></div><button type="button" role="switch" :aria-checked="shell.fareAlertsEnabled.value" @click="shell.toggleFareAlerts"><span /></button></article>
    </section>

    <nav class="via-nav" :aria-label="tx('联程导航', 'VIA navigation')">
      <button v-for="tab in [{ id: 'discover', zh: '班次', en: 'Board', icon: 'fas fa-table-list' }, { id: 'search', zh: '搜索', en: 'Search', icon: 'fas fa-magnifying-glass' }, { id: 'trips', zh: '行程夹', en: 'Trips', icon: 'fas fa-folder-open' }, { id: 'me', zh: '我的', en: 'Me', icon: 'fas fa-user' }]" :key="tab.id" type="button" :class="{ 'is-active': activeTab === tab.id }" :data-testid="`intercity-tab-${tab.id}`" @click="shell.setActiveTab(tab.id)"><i :class="tab.icon" aria-hidden="true" /><span>{{ tx(tab.zh, tab.en) }}</span><b v-if="tab.id === 'trips' && shell.tripDrafts.value.length">{{ shell.tripDrafts.value.length }}</b></button>
    </nav>

    <aside v-if="selected" class="service-detail" role="dialog" :aria-label="tx('班次详情', 'Service details')" data-testid="intercity-service-detail">
      <button class="icon-button detail-close" type="button" :aria-label="tx('关闭详情', 'Close details')" @click="selectedId = ''"><i class="fas fa-xmark" aria-hidden="true" /></button>
      <div class="detail-strip" :style="{ '--service': selected.color }"><span>{{ selected.serviceNo }}</span><i :class="modeMeta(selected.mode).icon" aria-hidden="true" /><b>{{ selected.originCode }}<small>TO</small>{{ selected.destinationCode }}</b><em>{{ selected.date }}</em></div>
      <div class="detail-body"><small>{{ localize(selected, 'carrier') }} · {{ localize(modeMeta(selected.mode), 'label') }}</small><h1>{{ localize(selected, 'origin') }} → {{ localize(selected, 'destination') }}</h1><div class="detail-time"><b>{{ selected.departureTime }}</b><span><i aria-hidden="true" /><small>{{ localize(selected, 'duration') }}</small></span><b>{{ selected.arrivalTime }}</b></div><div class="detail-platform"><i class="fas fa-signs-post" aria-hidden="true" /><span>{{ tx('站台信息', 'PLATFORM') }}</span><b>{{ localize(selected, 'platform') }}</b></div><p>{{ localize(selected, 'note') }}</p>
        <div v-if="selected.originMapPlaceId" class="map-reference"><i class="fas fa-location-dot" aria-hidden="true" /><div><b>{{ tx('出发地引用现有 Map', 'Departure references Map') }}</b><small>{{ selected.originMapPlaceId }}</small></div><span>{{ tx('只读', 'READ ONLY') }}</span></div>
        <template v-if="['available', 'limited'].includes(selected.availability)">
          <fieldset><legend>{{ tx('选择票价', 'CHOOSE FARE') }}</legend><label v-for="fare in selected.fares" :key="fare.id" :class="{ 'is-selected': selectedFareId === fare.id }"><input v-model="selectedFareId" type="radio" :value="fare.id" /><span><b>{{ localize(fare, 'name') }}</b><small>{{ localize(fare, 'flexibility') }}</small></span><strong>₩ {{ money(fare.price) }}</strong></label></fieldset>
          <label class="passenger-field"><span>{{ tx('乘客人数', 'Passengers') }}</span><select v-model="passengers"><option v-for="count in 6" :key="count" :value="count">{{ count }}</option></select></label>
          <div class="detail-boundary"><i class="fas fa-circle-info" aria-hidden="true" /><span>{{ tx('保存后只进入本机行程夹；不出票、不占座、不扣款，也不写入日历或地图行程。', 'Saving adds only a local trip intent; it issues no ticket, holds no seat, charges nothing, and writes no Calendar or Map trip.') }}</span></div>
          <button class="save-draft" type="button" data-testid="intercity-save-draft" :disabled="!selectedFare" @click="saveDraft">{{ tx('保存出行意向', 'Save travel intent') }}</button>
        </template>
        <div v-else class="closed-source" data-testid="intercity-source-closed"><i :class="selected.availability === 'source_stale' ? 'fas fa-clock-rotate-left' : 'fas fa-ban'" aria-hidden="true" /><h2>{{ localize(statusMeta(selected.availability), 'label') }}</h2><p>{{ selected.availability === 'source_stale' ? tx('旧班次、旧票价不能建立意向。', 'Old schedules and fares cannot create an intent.') : tx('不会生成候补、假余票或占座结果。', 'No waitlist, invented inventory, or seat hold is created.') }}</p></div>
      </div>
    </aside>
  </main>
</template>

<style scoped>
.via-app {
  --ink: #e9eef2;
  --muted: #8b96a0;
  --paper: #0d1013;
  --panel: #151a1f;
  --panel-soft: #1a2128;
  --line: #262e35;
  --amber: #f0a63a;
  --amber-strong: #ffb545;
  --ok: #3ecf7c;
  --service-board: #10151a;
  --content-max: 1080px;
  position: relative;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  color: var(--ink);
  background: var(--paper);
  font-family: "Avenir Next", "Noto Sans CJK SC", sans-serif;
}

.via-header {
  height: 86px;
  padding: calc(24px + env(safe-area-inset-top)) 24px 10px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 46px 1fr auto;
  align-items: center;
  gap: 13px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--paper) 92%, transparent);
}

.icon-button {
  width: 42px;
  height: 42px;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: inherit;
  background: var(--panel);
  cursor: pointer;
}

.via-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.via-brand > span {
  width: 45px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  color: #1a1206;
  background: var(--amber);
  font-weight: 950;
  letter-spacing: .11em;
  transform: skew(-8deg);
}

.via-brand b,
.via-brand small {
  display: block;
}

.via-brand b {
  font-size: 17px;
}

.via-brand small {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

.trip-count {
  text-align: right;
}

.trip-count b,
.trip-count span {
  display: block;
}

.trip-count b {
  font: 900 24px/1 "JetBrains Mono", "SF Mono", Consolas, monospace;
  color: var(--amber);
}

.trip-count span {
  color: var(--muted);
  font-size: 10px;
  font-weight: 850;
}

.via-page {
  height: calc(100% - 86px);
  padding: 26px 28px 112px;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.via-app .via-page > * {
  width: min(var(--content-max), 100%);
  margin-inline: auto;
}

.board-hero {
  min-height: 285px;
  padding: 42px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  align-items: end;
  gap: 28px;
  border: 1px solid var(--line);
  border-radius: 6px 36px 6px 6px;
  color: #eef3f6;
  background:
    radial-gradient(circle at 88% 12%, rgba(240, 166, 58, 0.14), transparent 38%),
    linear-gradient(145deg, #0e1216, #151c24 62%, #101820);
  box-shadow: 0 24px 55px rgba(0, 0, 0, 0.4);
}

.hero-copy > span,
.section-title small,
.search-heading small,
.detail-body > small {
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .16em;
  color: var(--amber);
}

.hero-copy h1 {
  margin: 16px 0;
  white-space: pre-line;
  font: 900 48px/.98 "JetBrains Mono", "SF Mono", Consolas, "Noto Sans Mono CJK SC", monospace;
  letter-spacing: -.02em;
}

.hero-copy p {
  max-width: 520px;
  margin: 0;
  color: #aeb9c4;
  line-height: 1.55;
}

.board-hero > button {
  padding: 22px;
  border: 1px solid #f0a63a44;
  border-radius: 4px;
  color: var(--ink);
  background: #f0a63a10;
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease;
}

.board-hero > button:hover {
  border-color: #f0a63a88;
  background: #f0a63a1c;
}

.board-hero button small,
.board-hero button span {
  display: block;
  font-size: 10px;
}

.board-hero button small {
  color: var(--amber);
  font-weight: 950;
  letter-spacing: .14em;
}

.board-hero button b {
  display: flex;
  justify-content: space-between;
  margin: 18px 0;
  font: 900 28px/1 "JetBrains Mono", "SF Mono", Consolas, monospace;
}

.mode-strip {
  margin: 22px 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.mode-strip button {
  min-height: 62px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted);
  background: var(--panel);
  cursor: pointer;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease;
}

.mode-strip button.is-active {
  color: #1a1206;
  border-color: var(--amber);
  background: var(--amber);
}

.mode-strip i,
.mode-strip span {
  display: block;
}

.mode-strip span {
  margin-top: 6px;
  font-size: 10px;
  font-weight: 850;
}

.section-title {
  margin: 35px 0 14px;
  display: flex;
  justify-content: space-between;
  align-items: end;
}

.section-title h2 {
  margin: 6px 0 0;
  font: 900 28px/1.1 "JetBrains Mono", "SF Mono", Consolas, "Noto Sans Mono CJK SC", monospace;
}

.section-title > span {
  color: var(--amber);
  font: 900 44px/1 "JetBrains Mono", "SF Mono", Consolas, monospace;
}

.service-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.service-card {
  position: relative;
  border: 1px solid var(--line);
  border-top: 5px solid var(--service);
  background: var(--panel);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  transition: transform 180ms ease, border-color 180ms ease;
}

.service-card:hover {
  transform: translateY(-2px);
  border-color: #3a4550;
}

.service-open {
  width: 100%;
  padding: 18px;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.service-open:active {
  transform: scale(.995);
}

.service-top,
.service-bottom,
.time-line,
.route-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.service-top span {
  font-size: 10px;
  font-weight: 900;
}

.service-top em,
.search-list em {
  padding: 5px 8px;
  border-radius: 3px;
  font-size: 10px;
  font-style: normal;
  font-weight: 950;
  letter-spacing: .05em;
}

.tone-available {
  color: #46d98a;
  background: rgba(62, 207, 124, 0.14);
}

.tone-limited {
  color: var(--amber-strong);
  background: rgba(240, 166, 58, 0.14);
}

.tone-closed {
  color: #d97b6c;
  background: rgba(217, 123, 108, 0.14);
}

.tone-stale {
  color: #9aa6b5;
  background: rgba(154, 166, 181, 0.14);
}

.route-line {
  margin: 24px 0;
}

.route-line > div b,
.route-line > div small {
  display: block;
}

.route-line > div b {
  font: 900 31px/1 "JetBrains Mono", "SF Mono", Consolas, monospace;
  letter-spacing: .02em;
}

.route-line > div small {
  max-width: 110px;
  margin-top: 6px;
  color: var(--muted);
  font-size: 10px;
}

.route-line > div:last-child {
  text-align: right;
}

.route-line > span {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 5px;
  min-width: 115px;
  color: var(--muted);
  font-size: 10px;
  text-align: center;
}

.route-line > span i {
  height: 1px;
  background: var(--line);
}

.time-line {
  padding: 10px 0;
  border-top: 1px dashed var(--line);
  border-bottom: 1px dashed var(--line);
}

.time-line b {
  font: 900 17px/1 "JetBrains Mono", "SF Mono", Consolas, monospace;
}

.time-line span {
  color: var(--muted);
  font-size: 10px;
}

.service-bottom {
  padding: 13px 42px 0 0;
}

.service-bottom span {
  color: var(--muted);
  font-size: 10px;
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
}

.service-bottom b {
  font-size: 12px;
  color: var(--amber);
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
}

.favorite {
  position: absolute;
  right: 4px;
  bottom: 2px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  color: var(--amber);
  background: transparent;
  cursor: pointer;
}

.search-heading {
  margin: 18px 0 28px;
}

.search-heading h1 {
  margin: 10px 0;
  font: 900 43px/1 "JetBrains Mono", "SF Mono", Consolas, "Noto Sans Mono CJK SC", monospace;
}

.search-heading p {
  color: var(--muted);
  line-height: 1.6;
}

.search-box {
  height: 58px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--panel);
}

.search-box input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: inherit;
  background: transparent;
  font: 700 16px inherit;
}

.search-list {
  margin-top: 14px;
  display: grid;
  gap: 8px;
}

.search-list button {
  min-height: 78px;
  padding: 12px 16px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: inherit;
  background: var(--panel);
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, transform 180ms ease;
}

.search-list button:hover {
  border-color: #3a4550;
}

.search-list > button > i {
  color: var(--amber);
  font-size: 20px;
}

.search-list b,
.search-list small {
  display: block;
}

.search-list small {
  margin-top: 5px;
  color: var(--muted);
}

.draft-list {
  display: grid;
  gap: 12px;
}

.draft-list article {
  min-height: 130px;
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) 50px;
  align-items: center;
  border: 1px solid var(--line);
  background: var(--panel);
}

.draft-mode {
  height: 100%;
  display: grid;
  place-items: center;
  color: #1a1206;
  background: var(--amber);
}

.draft-mode i {
  font-size: 25px;
}

.draft-mode small {
  writing-mode: vertical-rl;
  letter-spacing: .14em;
}

.draft-list article > div:nth-child(2) {
  padding: 18px;
}

.draft-list h2 {
  margin: 8px 0;
  font: 900 25px/1 "JetBrains Mono", "SF Mono", Consolas, monospace;
}

.draft-list p,
.draft-list span {
  color: var(--muted);
}

.draft-list span {
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
}

.draft-list article > button {
  width: 42px;
  height: 42px;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.empty-state {
  margin: 75px auto;
  max-width: 420px;
  text-align: center;
}

.empty-state > i {
  font-size: 54px;
  color: var(--amber);
}

.empty-state button,
.save-draft {
  min-height: 46px;
  padding: 0 18px;
  border: 0;
  border-radius: 3px;
  color: #1a1206;
  background: var(--amber);
  font-weight: 900;
  cursor: pointer;
  transition: background 180ms ease, transform 120ms ease;
}

.empty-state button:hover,
.save-draft:hover {
  background: var(--amber-strong);
}

.empty-state button:active,
.save-draft:active {
  transform: scale(.985);
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.metric-grid article,
.alert-card {
  padding: 24px;
  border: 1px solid var(--line);
  background: var(--panel);
}

.metric-grid b {
  display: block;
  margin-top: 24px;
  font: 900 56px/1 "JetBrains Mono", "SF Mono", Consolas, monospace;
  color: var(--amber);
}

.alert-card {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.alert-card h2 {
  margin: 8px 0;
}

.alert-card p {
  color: var(--muted);
  line-height: 1.5;
}

.alert-card > button {
  width: 56px;
  height: 34px;
  padding: 4px;
  border: 0;
  border-radius: 999px;
  background: #3a4550;
  cursor: pointer;
}

.alert-card > button[aria-checked="true"] {
  background: var(--amber);
}

.alert-card > button span {
  display: block;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #fff;
  transition: transform .2s;
}

.alert-card > button[aria-checked="true"] span {
  transform: translateX(22px);
}

.via-nav {
  position: absolute;
  z-index: 8;
  left: 50%;
  bottom: calc(10px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(540px, calc(100% - 24px));
  height: 64px;
  padding: 5px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid var(--line);
  border-radius: 6px 18px 6px 6px;
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  box-shadow: 0 15px 38px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(18px);
}

.via-nav button {
  position: relative;
  border: 0;
  border-radius: 4px;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  transition: color 180ms ease, background 180ms ease;
}

.via-nav button.is-active {
  color: #1a1206;
  background: var(--amber);
}

.via-nav i,
.via-nav span {
  display: block;
}

.via-nav span {
  margin-top: 4px;
  font-size: 10px;
  font-weight: 850;
}

.via-nav b {
  position: absolute;
  top: 3px;
  right: calc(50% - 24px);
  width: 17px;
  height: 17px;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  border: 1px solid var(--amber);
  border-radius: 50%;
  color: var(--amber-strong);
  background: var(--paper);
  font-size: 9px;
}

.service-detail {
  position: absolute;
  z-index: 20;
  inset: 0 0 0 auto;
  width: min(760px, 100%);
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  overflow-y: auto;
  color: var(--ink);
  background: var(--paper);
  box-shadow: -25px 0 70px rgba(0, 0, 0, 0.55);
  animation: via-detail-in 220ms ease both;
}

@keyframes via-detail-in {
  from { transform: translateX(24px); opacity: 0; }
  to { transform: none; opacity: 1; }
}

.detail-close {
  position: absolute;
  z-index: 2;
  right: 14px;
  top: calc(28px + env(safe-area-inset-top));
}

.detail-strip {
  min-height: 100%;
  padding: calc(100px + env(safe-area-inset-top)) 24px 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  color: #f2f5f7;
  background: var(--service-board);
  border-right: 1px solid var(--line);
}

.detail-strip > span {
  color: var(--amber);
  font: 800 11px/1 "JetBrains Mono", "SF Mono", Consolas, monospace;
  letter-spacing: .14em;
}

.detail-strip > i {
  font-size: 50px;
  color: var(--amber);
}

.detail-strip > b {
  display: grid;
  gap: 8px;
  font: 900 48px/1 "JetBrains Mono", "SF Mono", Consolas, monospace;
}

.detail-strip > b small {
  font: 800 10px/1 sans-serif;
  letter-spacing: .2em;
  color: var(--muted);
}

.detail-strip em {
  font-style: normal;
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
}

.detail-body {
  padding: calc(105px + env(safe-area-inset-top)) 34px 60px;
}

.detail-body h1 {
  margin: 13px 0 25px;
  font: 900 36px/1.05 "JetBrains Mono", "SF Mono", Consolas, "Noto Sans Mono CJK SC", monospace;
}

.detail-time {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 16px;
}

.detail-time > b {
  font: 900 25px/1 "JetBrains Mono", "SF Mono", Consolas, monospace;
}

.detail-time > span {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 10px;
}

.detail-time i {
  height: 1px;
  background: var(--line);
}

.detail-platform {
  margin-top: 16px;
  padding: 10px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px dashed var(--line);
  border-bottom: 1px dashed var(--line);
}

.detail-platform > i {
  color: var(--amber);
}

.detail-platform > span {
  color: var(--muted);
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .12em;
}

.detail-platform > b {
  font: 800 13px/1.4 "JetBrains Mono", "SF Mono", Consolas, "Noto Sans Mono CJK SC", monospace;
}

.detail-body > p {
  color: var(--muted);
  line-height: 1.65;
}

.map-reference {
  margin: 18px 0;
  padding: 13px;
  display: flex;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--line);
}

.map-reference > i {
  color: var(--amber);
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
  font-size: 10px;
  font-weight: 950;
  color: var(--muted);
}

.detail-body fieldset {
  margin: 22px 0;
  padding: 0;
  border: 0;
}

.detail-body legend {
  margin-bottom: 9px;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .12em;
}

.detail-body fieldset label {
  padding: 13px;
  display: grid;
  grid-template-columns: 20px 1fr auto;
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
  border-color: var(--amber);
  background: rgba(240, 166, 58, 0.1);
}

.detail-body fieldset b,
.detail-body fieldset small {
  display: block;
}

.detail-body fieldset small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 10px;
}

.detail-body fieldset strong {
  font-family: "JetBrains Mono", "SF Mono", Consolas, monospace;
  color: var(--amber);
}

.passenger-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.passenger-field select {
  width: 90px;
  height: 42px;
  border: 1px solid var(--line);
  color: inherit;
  background: var(--panel);
}

.detail-boundary {
  margin-top: 18px;
  padding: 13px;
  display: flex;
  gap: 10px;
  color: var(--muted);
  background: var(--panel-soft);
  font-size: 11px;
  line-height: 1.5;
}

.save-draft {
  width: 100%;
  margin-top: 12px;
}

.closed-source {
  margin-top: 30px;
  padding: 30px;
  background: var(--panel);
  text-align: center;
}

.closed-source > i {
  font-size: 35px;
  color: var(--muted);
}

.closed-source p {
  color: var(--muted);
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
input:focus-visible,
select:focus-visible {
  outline: 3px solid var(--amber-strong);
  outline-offset: 2px;
}

@media (max-width: 700px) {
  .via-header { height: 82px; padding: calc(28px + env(safe-area-inset-top)) 10px 8px; }
  .via-brand small, .trip-count span { display: none; }
  .via-page { height: calc(100% - 82px); padding: 15px 13px 100px; }
  .board-hero { min-height: 410px; padding: 28px; display: flex; flex-direction: column; align-items: stretch; }
  .hero-copy h1 { font-size: 42px; }
  .board-hero > button { margin-top: auto; }
  .mode-strip { grid-template-columns: repeat(5, minmax(62px, 1fr)); overflow-x: auto; }
  .mode-strip button { min-width: 62px; }
  .service-grid { grid-template-columns: 1fr; }
  .route-line > span { min-width: 90px; }
  .search-heading h1 { font-size: 36px; }
  .search-list button { grid-template-columns: 34px minmax(0, 1fr); }
  .search-list em { grid-column: 2; }
  .draft-list article { grid-template-columns: 72px minmax(0, 1fr) 42px; }
  .metric-grid { grid-template-columns: 1fr; }
  .service-detail { display: block; }
  .detail-strip { min-height: 260px; padding: calc(90px + env(safe-area-inset-top)) 22px 22px; }
  .detail-strip > i { display: none; }
  .detail-strip > b { display: flex; justify-content: space-between; font-size: 42px; }
  .detail-strip > b small { align-self: center; }
  .detail-body { padding: 28px 19px 70px; }
  .detail-body h1 { font-size: 31px; }
  .via-nav { width: calc(100% - 18px); }
}

@media (prefers-reduced-motion: reduce) {
  .via-app *,
  .via-app *::before,
  .via-app *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
