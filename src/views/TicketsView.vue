<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useTicketsShellState } from '../composables/useTicketsShellState'
import { pushReturnTarget } from '../lib/navigation-return'
import {
  TICKET_CATEGORY_OPTIONS,
  TICKET_EVENTS,
  TICKETS_BRAND,
  getTicketEvent,
  getTicketStatusMeta,
  validateTicketsFixtureContract,
} from '../lib/tickets-shell-data'

const router = useRouter()
const route = useRoute()
const { languageBase, t } = useI18n()
const ticketState = useTicketsShellState()

const selectedEventId = ref('')
const searchQuery = ref('')
const feedback = ref('')
const isZh = computed(() => languageBase.value === 'zh')
const activeTab = computed(() => ticketState.activeTab.value)
const fixtureValid = computed(() => validateTicketsFixtureContract())
const selectedEvent = computed(() => getTicketEvent(selectedEventId.value))
const localized = (record, zhKey, enKey) => (isZh.value ? record?.[zhKey] : record?.[enKey]) || ''
const statusLabel = (event) => localized(getTicketStatusMeta(event.status), 'labelZh', 'labelEn')
const filteredEvents = computed(() => {
  const categoryId = ticketState.categoryId.value
  return TICKET_EVENTS.filter((event) => categoryId === 'all' || event.category === categoryId)
})
const searchResults = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (!query) return TICKET_EVENTS
  return TICKET_EVENTS.filter((event) => [event.titleZh, event.titleEn, event.venueZh, event.venueEn, event.organizerZh, event.organizerEn].some((value) => value.toLocaleLowerCase().includes(query)))
})
const draftEvents = computed(() => ticketState.draftEventIds.value.map(getTicketEvent).filter(Boolean))
const favoriteEvents = computed(() => ticketState.favoriteEventIds.value.map(getTicketEvent).filter(Boolean))

const notify = (zh, en) => {
  feedback.value = t(zh, en)
  window.setTimeout(() => { feedback.value = '' }, 2200)
}
const openEvent = (eventId) => {
  ticketState.recordRecent(eventId)
  selectedEventId.value = eventId
}
const toggleFavorite = (eventId) => {
  const result = ticketState.toggleFavorite(eventId)
  if (result.ok) notify(result.active ? '已收藏活动' : '已取消收藏', result.active ? 'Event saved' : 'Removed from saved')
}
const toggleDraft = (event) => {
  if (event.status === 'sold_out') return notify('当前售罄，无法建立入场草稿', 'Sold out; no admission draft can be created')
  const result = ticketState.toggleDraft(event.id)
  if (result.ok) notify(result.active ? '已保存本机意向草稿' : '已移除意向草稿', result.active ? 'Local intent draft saved' : 'Intent draft removed')
}
const closeApp = () => pushReturnTarget(router, route, '/home')
</script>

<template>
  <main class="gate-app" data-app="tickets" data-testid="tickets-app">
    <header class="gate-header">
      <button type="button" class="icon-button" :aria-label="t('返回', 'Back')" data-testid="tickets-back" @click="closeApp"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
      <div class="gate-wordmark"><span class="gate-logo"><i class="fas fa-ticket" aria-hidden="true"></i></span><span><strong>{{ isZh ? TICKETS_BRAND.nameZh : TICKETS_BRAND.nameEn }}</strong><small>{{ isZh ? TICKETS_BRAND.taglineZh : TICKETS_BRAND.taglineEn }}</small></span></div>
      <button type="button" class="header-pass" data-testid="tickets-header-passes" @click="ticketState.setActiveTab('passes')"><i class="fas fa-wallet" aria-hidden="true"></i><span>{{ t('票夹', 'Passes') }}</span><b>{{ draftEvents.length }}</b></button>
    </header>

    <div v-if="feedback" class="gate-toast" role="status">{{ feedback }}</div>
    <section v-if="!fixtureValid" class="gate-error" role="alert"><h1>{{ t('票务目录暂不可用', 'Ticket catalog unavailable') }}</h1><p>{{ t('本地活动引用不完整，入场没有补写库存或场次。', 'Local event references are incomplete. GATE did not invent inventory or sessions.') }}</p></section>

    <template v-else>
      <div class="gate-content">
        <section v-if="activeTab === 'discover'" class="gate-page" data-testid="tickets-discover">
          <article class="gate-hero">
            <div><span>{{ t('SEOUL / SEPTEMBER', 'SEOUL / SEPTEMBER') }}</span><h1>{{ t('把想去的现场，先放进视线里。', 'Put the room you want in sight.') }}</h1><p>{{ t('发现、抽选、预约和候补都从这里开始；真正的席位与付款仍等待票务 owner。', 'Discovery, lottery, reservation, and waitlist start here. Real seats and payment still wait for the ticket owner.') }}</p></div>
            <div class="hero-stub"><small>GATE 09</small><b>SEOUL</b><i>2026</i></div>
          </article>

          <nav class="category-rail" :aria-label="t('活动分类', 'Event categories')"><button v-for="category in TICKET_CATEGORY_OPTIONS" :key="category.id" type="button" :class="{ 'is-active': ticketState.categoryId.value === category.id }" :data-testid="`tickets-category-${category.id}`" @click="ticketState.setCategory(category.id)">{{ localized(category, 'labelZh', 'labelEn') }}</button></nav>

          <section class="event-section"><header><div><span>{{ t('正在发生', 'NOW BOARDING') }}</span><h2>{{ t('近期活动', 'Upcoming rooms') }}</h2></div><small>{{ filteredEvents.length }} {{ t('项', 'events') }}</small></header><div class="event-grid"><article v-for="event in filteredEvents" :key="event.id" class="event-card" :style="{ '--event-accent': event.accent }"><button type="button" class="event-card__open" :data-testid="`tickets-event-${event.id}`" @click="openEvent(event.id)"><div class="event-poster"><b>{{ event.mark }}</b><span>{{ localized(event, 'organizerZh', 'organizerEn') }}</span></div><div class="event-copy"><span class="status-chip" :class="`tone-${getTicketStatusMeta(event.status).tone}`">{{ statusLabel(event) }}</span><h3>{{ localized(event, 'titleZh', 'titleEn') }}</h3><p>{{ localized(event, 'dateZh', 'dateEn') }}</p><small>{{ localized(event, 'venueZh', 'venueEn') }} · {{ localized(event, 'districtZh', 'districtEn') }}</small></div></button><button type="button" class="favorite-button" :aria-label="t('收藏活动', 'Save event')" @click="toggleFavorite(event.id)"><i :class="ticketState.favoriteEventIds.value.includes(event.id) ? 'fas fa-heart' : 'far fa-heart'" aria-hidden="true"></i></button></article></div></section>
        </section>

        <section v-else-if="activeTab === 'search'" class="gate-page" data-testid="tickets-search">
          <div class="page-heading"><span>{{ t('FIND A ROOM', 'FIND A ROOM') }}</span><h1>{{ t('搜索活动', 'Search events') }}</h1></div>
          <label class="search-box"><i class="fas fa-magnifying-glass" aria-hidden="true"></i><span class="sr-only">{{ t('搜索活动或场馆', 'Search events or venues') }}</span><input v-model="searchQuery" type="search" :placeholder="t('艺人、活动、场馆或主办方', 'Artist, event, venue, or organizer')" data-testid="tickets-search-input"></label>
          <div class="search-list"><button v-for="event in searchResults" :key="event.id" type="button" @click="openEvent(event.id)"><span class="search-mark" :style="{ background: event.accent }">{{ event.mark }}</span><span><b>{{ localized(event, 'titleZh', 'titleEn') }}</b><small>{{ localized(event, 'dateZh', 'dateEn') }} · {{ localized(event, 'venueZh', 'venueEn') }}</small></span><em>{{ statusLabel(event) }}</em></button></div>
        </section>

        <section v-else-if="activeTab === 'passes'" class="gate-page" data-testid="tickets-passes">
          <div class="page-heading"><span>{{ t('MY ADMISSION', 'MY ADMISSION') }}</span><h1>{{ t('票夹', 'Passes') }}</h1><p>{{ t('当前只有本机意向草稿。它们不是订单、付款记录或有效电子票。', 'These are local intent drafts, not orders, payments, or valid mobile tickets.') }}</p></div>
          <div v-if="draftEvents.length" class="pass-stack"><article v-for="event in draftEvents" :key="event.id" class="pass-card"><div class="pass-card__date"><b>{{ event.mark }}</b><span>LOCAL<br>DRAFT</span></div><div><span>{{ statusLabel(event) }}</span><h2>{{ localized(event, 'titleZh', 'titleEn') }}</h2><p>{{ localized(event, 'dateZh', 'dateEn') }} · {{ localized(event, 'venueZh', 'venueEn') }}</p></div><button type="button" :aria-label="t('移除草稿', 'Remove draft')" @click="toggleDraft(event)"><i class="fas fa-xmark" aria-hidden="true"></i></button></article></div>
          <div v-else class="empty-pass"><i class="fas fa-ticket" aria-hidden="true"></i><h2>{{ t('还没有意向草稿', 'No intent drafts yet') }}</h2><p>{{ t('从活动详情保存一次抽选、预约、候补或购票意向。', 'Save a lottery, reservation, waitlist, or purchase intent from an event detail.') }}</p><button type="button" @click="ticketState.setActiveTab('discover')">{{ t('浏览活动', 'Browse events') }}</button></div>
        </section>

        <section v-else class="gate-page" data-testid="tickets-me">
          <div class="page-heading"><span>{{ t('GATE PROFILE', 'GATE PROFILE') }}</span><h1>{{ t('我的入场', 'My GATE') }}</h1></div>
          <div class="me-grid"><article><span>{{ t('收藏', 'SAVED') }}</span><b>{{ favoriteEvents.length }}</b><p>{{ t('只保存发现偏好，不表示购票或报名。', 'A discovery preference, not a purchase or application.') }}</p></article><article><span>{{ t('最近查看', 'RECENT') }}</span><b>{{ ticketState.recentEventIds.value.length }}</b><p>{{ t('保留最近查看的本地活动引用。', 'Keeps local references to recently viewed events.') }}</p></article></div>
          <article class="alert-card"><div><span>{{ t('开售提醒偏好', 'SALE ALERT PREFERENCE') }}</span><h2>{{ ticketState.alertsEnabled.value ? t('已开启本机偏好', 'Local preference on') : t('已关闭', 'Off') }}</h2><p>{{ t('尚未创建系统通知频道，也不会承诺开售提醒一定送达。', 'No system notification channel exists yet, and delivery is not promised.') }}</p></div><button type="button" role="switch" :aria-label="t('开售提醒偏好', 'Sale alert preference')" :aria-checked="ticketState.alertsEnabled.value" data-testid="tickets-alert-toggle" @click="ticketState.toggleAlerts()"><span></span></button></article>
        </section>
      </div>

      <nav class="gate-nav" :aria-label="t('票务导航', 'Ticket navigation')"><button v-for="tab in [{ id: 'discover', zh: '发现', en: 'Discover', icon: 'fa-compass' }, { id: 'search', zh: '搜索', en: 'Search', icon: 'fa-magnifying-glass' }, { id: 'passes', zh: '票夹', en: 'Passes', icon: 'fa-ticket' }, { id: 'me', zh: '我的', en: 'Me', icon: 'fa-user' }]" :key="tab.id" type="button" :class="{ 'is-active': activeTab === tab.id }" :data-testid="`tickets-tab-${tab.id}`" @click="ticketState.setActiveTab(tab.id)"><i :class="`fas ${tab.icon}`" aria-hidden="true"></i><span>{{ isZh ? tab.zh : tab.en }}</span><b v-if="tab.id === 'passes' && draftEvents.length">{{ draftEvents.length }}</b></button></nav>
    </template>

    <section v-if="selectedEvent" class="event-detail" role="dialog" aria-modal="true" :aria-label="t('活动详情', 'Event detail')" data-testid="tickets-event-detail">
      <button type="button" class="detail-close" :aria-label="t('关闭', 'Close')" @click="selectedEventId = ''"><i class="fas fa-xmark" aria-hidden="true"></i></button>
      <div class="detail-poster" :style="{ '--event-accent': selectedEvent.accent }"><span>{{ localized(selectedEvent, 'organizerZh', 'organizerEn') }}</span><b>{{ selectedEvent.mark }}</b><small>{{ localized(selectedEvent, 'districtZh', 'districtEn') }}</small></div>
      <div class="detail-copy"><span class="status-chip" :class="`tone-${getTicketStatusMeta(selectedEvent.status).tone}`">{{ statusLabel(selectedEvent) }}</span><h1>{{ localized(selectedEvent, 'titleZh', 'titleEn') }}</h1><p class="detail-summary">{{ localized(selectedEvent, 'summaryZh', 'summaryEn') }}</p><dl><div><dt>{{ t('日期', 'DATE') }}</dt><dd>{{ localized(selectedEvent, 'dateZh', 'dateEn') }}</dd></div><div><dt>{{ t('场馆', 'VENUE') }}</dt><dd>{{ localized(selectedEvent, 'venueZh', 'venueEn') }}<small>{{ localized(selectedEvent, 'districtZh', 'districtEn') }} · Map ref {{ selectedEvent.mapPlaceId }}</small></dd></div><div><dt>{{ t('价格', 'PRICE') }}</dt><dd>{{ localized(selectedEvent, 'priceZh', 'priceEn') }}</dd></div></dl><div class="detail-boundary"><i class="fas fa-circle-info" aria-hidden="true"></i>{{ t('保存的是本机意向草稿，不锁座、不付款，也不创建 Calendar、Map 或 Agenda 记录。', 'This saves a local intent draft. It does not hold a seat, pay, or create Calendar, Map, or Agenda records.') }}</div><div class="detail-actions"><button type="button" class="secondary-action" @click="toggleFavorite(selectedEvent.id)">{{ ticketState.favoriteEventIds.value.includes(selectedEvent.id) ? t('已收藏', 'Saved') : t('收藏', 'Save') }}</button><button type="button" class="primary-action" :disabled="selectedEvent.status === 'sold_out'" data-testid="tickets-save-draft" @click="toggleDraft(selectedEvent)">{{ selectedEvent.status === 'sold_out' ? t('当前售罄', 'Sold out') : ticketState.draftEventIds.value.includes(selectedEvent.id) ? t('移除意向草稿', 'Remove intent draft') : t('保存意向草稿', 'Save intent draft') }}</button></div></div>
    </section>
  </main>
</template>

<style scoped>
.gate-app {
  --paper: #0f0f10;
  --panel: #18181a;
  --panel-soft: #1f1f22;
  --ink: #f4f1ea;
  --muted: #a09b90;
  --line: #2e2c28;
  --signal: #ef3d25;
  --signal-text: #ff7a66;
  --nav: #f2eee3;
  --focus: #ffb59f;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--ink);
  background: var(--paper);
  font-family: "Aptos", "Segoe UI", "Noto Sans CJK SC", sans-serif;
}

:global(.app-shell:has(.gate-app) .status-fg) {
  color: var(--ink);
}

.gate-header {
  min-height: 92px;
  padding: calc(34px + env(safe-area-inset-top)) 18px 9px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
  flex: none;
}

.icon-button,
.detail-close {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.gate-wordmark {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
}

.gate-logo {
  width: 45px;
  height: 45px;
  display: grid;
  place-items: center;
  color: #fff;
  background: var(--signal);
  clip-path: polygon(12% 0, 88% 0, 88% 12%, 100% 12%, 100% 88%, 88% 88%, 88% 100%, 12% 100%, 12% 88%, 0 88%, 0 12%, 12% 12%);
}

.gate-wordmark > span:last-child {
  min-width: 0;
}

.gate-wordmark strong,
.gate-wordmark small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gate-wordmark strong {
  font: 950 22px/1 "Arial Narrow", "Noto Sans CJK SC", sans-serif;
  letter-spacing: -.04em;
}

.gate-wordmark small {
  margin-top: 3px;
  color: var(--muted);
  font-size: 10px;
}

.header-pass {
  margin-left: auto;
  min-height: 38px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: inherit;
  background: var(--panel);
  font-weight: 850;
  cursor: pointer;
}

.header-pass b {
  min-width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--signal);
  font-size: 9px;
}

.gate-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 82px;
}

.gate-page {
  width: min(1120px, 100%);
  margin: auto;
  padding: 22px;
  box-sizing: border-box;
}

.gate-toast {
  position: absolute;
  z-index: 15;
  top: 96px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 16px;
  color: #fff;
  background: #26251f;
  border: 1px solid var(--line);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  font-size: 12px;
  font-weight: 850;
}

.gate-error {
  margin: auto;
  text-align: center;
}

.gate-hero {
  min-height: 290px;
  padding: 38px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  align-items: center;
  gap: 28px;
  overflow: hidden;
  border: 1px solid var(--line);
  color: #fff;
  background:
    radial-gradient(circle at 85% 12%, rgba(239, 61, 37, 0.16), transparent 40%),
    repeating-linear-gradient(90deg, transparent 0 64px, #ffffff08 64px 65px),
    #131315;
}

.gate-hero > div:first-child > span,
.event-section header span,
.page-heading > span,
.me-grid span,
.alert-card > div > span {
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .18em;
  color: var(--signal-text);
}

.gate-hero h1 {
  max-width: 650px;
  margin: 30px 0 14px;
  font: 950 clamp(38px, 6vw, 66px)/.96 "Arial Narrow", "Noto Sans CJK SC", sans-serif;
  letter-spacing: -.06em;
}

.gate-hero p {
  max-width: 600px;
  margin: 0;
  color: #bdb8ac;
  line-height: 1.65;
}

.hero-stub {
  height: 180px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  color: #1a1206;
  background: var(--signal);
  transform: rotate(4deg);
  box-shadow: 14px 16px 0 rgba(242, 238, 227, 0.12);
}

.hero-stub small {
  font-weight: 900;
  letter-spacing: .18em;
}

.hero-stub b {
  font: 950 46px/1 "Arial Narrow", sans-serif;
}

.hero-stub i {
  font-style: normal;
  font-weight: 900;
}

.category-rail {
  padding: 18px 0 4px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-rail button {
  min-height: 42px;
  padding: 0 16px;
  flex: none;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: inherit;
  background: var(--panel);
  font-weight: 850;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
}

.category-rail button.is-active {
  color: #fff;
  background: var(--signal);
  border-color: var(--signal);
}

.event-section {
  margin-top: 26px;
}

.event-section > header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  margin-bottom: 13px;
}

.event-section h2,
.page-heading h1 {
  margin: 5px 0 0;
  font: 950 34px/1 "Arial Narrow", "Noto Sans CJK SC", sans-serif;
  letter-spacing: -.04em;
}

.event-section header small {
  color: var(--muted);
}

.event-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 13px;
}

.event-card {
  position: relative;
  min-width: 0;
  border: 1px solid var(--line);
  background: var(--panel);
  transition: border-color 160ms ease, transform 180ms ease;
}

.event-card:hover {
  border-color: #4a463e;
  transform: translateY(-2px);
}

.event-card__open {
  width: 100%;
  min-height: 220px;
  padding: 0;
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.event-poster {
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: #fff;
  background: var(--event-accent);
  overflow: hidden;
}

.event-poster b {
  font: 950 86px/.8 "Arial Narrow", sans-serif;
  letter-spacing: -.08em;
}

.event-poster span {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .12em;
  overflow-wrap: anywhere;
}

.event-copy {
  padding: 18px 52px 18px 18px;
}

.event-copy h3 {
  margin: 16px 0 10px;
  font: 900 22px/1.12 "Arial Narrow", "Noto Sans CJK SC", sans-serif;
}

.event-copy p {
  margin: 0 0 8px;
  font-weight: 800;
}

.event-copy small {
  color: var(--muted);
  line-height: 1.45;
}

.status-chip {
  display: inline-flex;
  min-height: 25px;
  padding: 0 8px;
  align-items: center;
  border-radius: 2px;
  color: var(--signal-text);
  background: color-mix(in srgb, var(--signal) 16%, transparent);
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .08em;
}

.tone-violet {
  color: #bba5ff;
  background: rgba(112, 70, 216, 0.22);
}

.tone-blue {
  color: #91c2ff;
  background: rgba(23, 100, 203, 0.22);
}

.tone-amber {
  color: #ffd27a;
  background: rgba(216, 156, 22, 0.2);
}

.tone-muted {
  color: var(--muted);
  background: color-mix(in srgb, var(--muted) 14%, transparent);
}

.favorite-button {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 50%;
  color: var(--signal-text);
  background: color-mix(in srgb, var(--panel) 91%, transparent);
  cursor: pointer;
}

.page-heading {
  padding: 18px 0 24px;
  border-bottom: 4px solid var(--ink);
}

.page-heading > span {
  color: var(--signal-text);
}

.page-heading p {
  max-width: 720px;
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
  border: 2px solid var(--ink);
  background: var(--panel);
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

.search-list {
  margin-top: 15px;
  display: grid;
  border-top: 1px solid var(--line);
}

.search-list button {
  min-height: 82px;
  padding: 10px 4px;
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  border: 0;
  border-bottom: 1px solid var(--line);
  color: inherit;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.search-list b,
.search-list small {
  display: block;
}

.search-list small {
  margin-top: 5px;
  color: var(--muted);
}

.search-list em {
  color: var(--signal-text);
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}

.search-mark {
  width: 50px;
  height: 58px;
  display: grid;
  place-items: center;
  color: #fff;
  font: 950 22px/1 "Arial Narrow", sans-serif;
}

.pass-stack {
  margin-top: 22px;
  display: grid;
  gap: 13px;
}

.pass-card {
  min-height: 150px;
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) 52px;
  align-items: center;
  border: 1px solid var(--line);
  background: var(--panel);
  position: relative;
}

.pass-card::before,
.pass-card::after {
  content: '';
  position: absolute;
  left: 122px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--paper);
  border: 1px solid var(--line);
  z-index: 1;
}

.pass-card::before {
  top: -10px;
}

.pass-card::after {
  bottom: -10px;
}

.pass-card__date {
  height: 100%;
  padding: 17px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  color: #fff;
  background: var(--signal);
  border-right: 1px dashed rgba(244, 241, 234, 0.35);
}

.pass-card__date b {
  font: 950 56px/1 "Arial Narrow", sans-serif;
}

.pass-card__date span {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .16em;
}

.pass-card > div:nth-child(2) {
  padding: 18px;
}

.pass-card > div:nth-child(2) > span {
  color: var(--signal-text);
  font-size: 9px;
  font-weight: 900;
}

.pass-card h2 {
  margin: 8px 0;
  font: 900 23px/1.1 "Arial Narrow", "Noto Sans CJK SC", sans-serif;
}

.pass-card p {
  margin: 0;
  color: var(--muted);
}

.pass-card > button {
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.empty-pass {
  margin: 70px auto;
  text-align: center;
}

.empty-pass > i {
  font-size: 60px;
  color: var(--signal);
}

.empty-pass button {
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  color: #fff;
  background: var(--signal);
  font-weight: 900;
  cursor: pointer;
}

.me-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
}

.me-grid article,
.alert-card {
  padding: 24px;
  border: 1px solid var(--line);
  background: var(--panel);
}

.me-grid b {
  display: block;
  margin: 24px 0 6px;
  font: 950 54px/1 "Arial Narrow", sans-serif;
}

.me-grid p,
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
  background: #3f3d38;
  flex: none;
  cursor: pointer;
}

.alert-card button[aria-checked="true"] {
  background: var(--signal);
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

.gate-nav {
  position: absolute;
  z-index: 8;
  left: 50%;
  bottom: calc(10px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(530px, calc(100% - 24px));
  height: 62px;
  padding: 5px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border: 1px solid var(--line);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  box-shadow: 0 15px 38px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(18px);
}

.gate-nav button {
  position: relative;
  min-width: 0;
  border: 0;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  transition: color 160ms ease, background 160ms ease;
}

.gate-nav button.is-active {
  color: #fff;
  background: var(--signal);
}

.gate-nav i,
.gate-nav span {
  display: block;
}

.gate-nav span {
  margin-top: 3px;
  font-size: 10px;
  font-weight: 850;
}

.gate-nav b {
  position: absolute;
  top: 4px;
  right: calc(50% - 22px);
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #fff;
  background: var(--signal);
  font-size: 9px;
}

.event-detail {
  position: absolute;
  z-index: 20;
  inset: 0 0 0 auto;
  width: min(660px, 100%);
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  overflow-y: auto;
  color: var(--ink);
  background: var(--panel);
  box-shadow: -24px 0 70px rgba(0, 0, 0, 0.6);
  animation: gate-detail-in 220ms ease both;
}

@keyframes gate-detail-in {
  from { transform: translateX(22px); opacity: 0; }
  to { transform: none; opacity: 1; }
}

.detail-close {
  position: absolute;
  z-index: 2;
  right: 14px;
  top: calc(34px + env(safe-area-inset-top));
  background: color-mix(in srgb, var(--panel) 88%, transparent);
}

.detail-poster {
  min-height: 100%;
  padding: calc(104px + env(safe-area-inset-top)) 25px 32px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
  color: #fff;
  background: var(--event-accent);
}

.detail-poster span,
.detail-poster small {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .12em;
  overflow-wrap: anywhere;
}

.detail-poster b {
  font: 950 130px/.8 "Arial Narrow", sans-serif;
}

.detail-copy {
  padding: calc(112px + env(safe-area-inset-top)) 34px 60px;
}

.detail-copy h1 {
  margin: 18px 0;
  font: 950 39px/1 "Arial Narrow", "Noto Sans CJK SC", sans-serif;
  letter-spacing: -.045em;
}

.detail-summary {
  color: var(--muted);
  line-height: 1.65;
}

.detail-copy dl {
  margin: 24px 0;
  border-top: 1px solid var(--line);
}

.detail-copy dl > div {
  padding: 14px 0;
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  border-bottom: 1px solid var(--line);
}

.detail-copy dt {
  font-size: 9px;
  font-weight: 950;
  letter-spacing: .12em;
  color: var(--muted);
}

.detail-copy dd {
  margin: 0;
  font-weight: 800;
}

.detail-copy dd small {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 10px;
  overflow-wrap: anywhere;
}

.detail-boundary {
  padding: 13px;
  display: flex;
  gap: 9px;
  color: var(--muted);
  background: var(--panel-soft);
  font-size: 11px;
  line-height: 1.5;
}

.detail-actions {
  margin-top: 18px;
  display: grid;
  grid-template-columns: .65fr 1.35fr;
  gap: 8px;
}

.detail-actions button {
  min-height: 48px;
  border: 1px solid var(--line);
  font-weight: 900;
  cursor: pointer;
}

.secondary-action {
  color: inherit;
  background: transparent;
}

.primary-action {
  color: #fff;
  background: var(--signal);
  border-color: var(--signal) !important;
  transition: background 160ms ease, transform 120ms ease;
}

.primary-action:not(:disabled):hover {
  background: #ff4f36;
}

.primary-action:not(:disabled):active {
  transform: scale(.99);
}

.primary-action:disabled {
  color: var(--muted);
  background: var(--panel-soft);
  cursor: not-allowed;
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
  .gate-header { min-height: 88px; padding: calc(34px + env(safe-area-inset-top)) 10px 8px; }
  .gate-wordmark small, .header-pass span { display: none; }
  .gate-page { padding: 15px 14px 100px; }
  .gate-hero { min-height: 410px; padding: 28px; display: block; position: relative; }
  .gate-hero h1 { font-size: 47px; }
  .hero-stub { position: absolute; right: -22px; bottom: -25px; width: 170px; height: 130px; padding: 15px; opacity: .72; }
  .hero-stub b { font-size: 34px; }
  .event-grid { grid-template-columns: 1fr; }
  .event-card__open { grid-template-columns: 112px minmax(0, 1fr); }
  .event-poster b { font-size: 66px; }
  .event-copy { padding: 16px 48px 16px 15px; }
  .event-copy h3 { font-size: 20px; }
  .search-list button { grid-template-columns: 48px minmax(0, 1fr); }
  .search-list em { grid-column: 2; }
  .search-mark { width: 44px; height: 52px; }
  .pass-card { grid-template-columns: 88px minmax(0, 1fr) 44px; }
  .pass-card::before, .pass-card::after { left: 80px; }
  .pass-card__date { padding: 12px; }
  .pass-card__date b { font-size: 42px; }
  .pass-card h2 { font-size: 19px; }
  .me-grid { grid-template-columns: 1fr; }
  .event-detail { display: block; }
  .detail-poster { min-height: 300px; padding: calc(92px + env(safe-area-inset-top)) 24px 24px; }
  .detail-poster b { font-size: 100px; }
  .detail-copy { padding: 28px 22px 70px; }
  .detail-copy h1 { font-size: 34px; }
  .detail-actions { grid-template-columns: 1fr; }
  .gate-nav { width: calc(100% - 20px); }
}

@media (prefers-reduced-motion: reduce) {
  .gate-app *,
  .gate-app *::before,
  .gate-app *::after {
    animation: none !important;
    transition: none !important;
  }
}
</style>
