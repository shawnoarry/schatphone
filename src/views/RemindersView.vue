<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { pushReturnTarget } from '../lib/navigation-return'
import { useRemindersStore } from '../stores/reminders'

const router = useRouter()
const route = useRoute()
const { t, languageBase, systemLanguage } = useI18n()
const remindersStore = useRemindersStore()
const {
  activeReminderItems,
  activeReminderCount,
  confirmedReminderCount,
  pinnedReminderCount,
  suggestedReminderCount,
  sourceCounts,
} = storeToRefs(remindersStore)

const locale = computed(() => (languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value))
const activeSourceFilter = ref('all')
const activeStatusFilter = ref('all')

const REMINDER_STATUS_FILTERS = Object.freeze([
  { key: 'all', labelZh: '全部状态', labelEn: 'All status' },
  { key: 'pending', labelZh: '待处理', labelEn: 'Pending' },
  { key: 'confirmed', labelZh: '已确认', labelEn: 'Confirmed' },
  { key: 'pinned', labelZh: '已固定', labelEn: 'Pinned' },
])

const goHome = () => {
  pushReturnTarget(router, route, '/home')
}

const openCalendar = () => {
  router.push({
    path: '/calendar',
    query:
      route.query.from === 'home' && route.query.homePage
        ? { from: 'home', homePage: route.query.homePage }
        : {},
  })
}

const openReminderSource = (item) => {
  if (!item?.sourceRoute) return
  router.push(item.sourceRoute)
}

const confirmReminder = (item) => {
  remindersStore.confirmReminderByKey(item.key)
}

const dismissReminder = (item) => {
  remindersStore.dismissReminderByKey(item.key)
}

const toggleReminderPin = (item) => {
  remindersStore.toggleMapReminderPinByKey(item.key)
}

const getLocalized = (item, zhKey, enKey, fallback = '') => {
  const zh = typeof item?.[zhKey] === 'string' ? item[zhKey].trim() : ''
  const en = typeof item?.[enKey] === 'string' ? item[enKey].trim() : ''
  return languageBase.value === 'zh' ? zh || en || fallback : en || zh || fallback
}

const getReminderTitle = (item) =>
  getLocalized(item, 'titleZh', 'titleEn', t('提醒事项', 'Reminder'))
const getReminderSummary = (item) => getLocalized(item, 'summaryZh', 'summaryEn', '')
const getReminderSourceLabel = (item) =>
  getLocalized(item, 'sourceLabelZh', 'sourceLabelEn', t('来源', 'Source'))

const getStatusLabel = (item) => {
  if (item.pinned) return t('已固定', 'Pinned')
  if (item.status === 'confirmed') return t('已确认', 'Confirmed')
  if (item.status === 'draft') return t('待生成', 'Draft')
  return t('待处理', 'Suggested')
}

const getStatusClass = (item) => {
  if (item.pinned) return 'reminder-status--pinned'
  if (item.status === 'confirmed') return 'reminder-status--confirmed'
  if (item.status === 'draft') return 'reminder-status--draft'
  return 'reminder-status--pending'
}

const formatDateTime = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return t('待定', 'TBD')
  return new Date(value).toLocaleString(locale.value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const sourceSummaryItems = computed(() => [
  { key: 'map', labelZh: '地图', labelEn: 'Map', count: sourceCounts.value.map || 0 },
  { key: 'phone', labelZh: '电话', labelEn: 'Phone', count: sourceCounts.value.phone || 0 },
  {
    key: 'shopping',
    labelZh: '购物',
    labelEn: 'Shopping',
    count: sourceCounts.value.shopping || 0,
  },
  { key: 'stock', labelZh: '股票', labelEn: 'Stock', count: sourceCounts.value.stock || 0 },
])

const sourceFilterOptions = computed(() => [
  { key: 'all', labelZh: '全部来源', labelEn: 'All sources', count: activeReminderCount.value },
  ...sourceSummaryItems.value,
])

const isPendingReminder = (item) =>
  item?.pinned !== true && item?.status !== 'confirmed' && item?.status !== 'dismissed'

const matchesStatusFilter = (item, filterKey) => {
  if (filterKey === 'confirmed') return item.status === 'confirmed'
  if (filterKey === 'pinned') return item.pinned === true
  if (filterKey === 'pending') return isPendingReminder(item)
  return true
}

const statusFilterOptions = computed(() =>
  REMINDER_STATUS_FILTERS.map((option) => ({
    ...option,
    count: activeReminderItems.value.filter((item) => matchesStatusFilter(item, option.key)).length,
  })),
)

const filteredReminderItems = computed(() =>
  activeReminderItems.value.filter((item) => {
    const sourceMatches =
      activeSourceFilter.value === 'all' || item.source === activeSourceFilter.value
    return sourceMatches && matchesStatusFilter(item, activeStatusFilter.value)
  }),
)
const visibleReminders = computed(() => filteredReminderItems.value.slice(0, 12))
const filteredReminderCount = computed(() => filteredReminderItems.value.length)
const hiddenFilteredReminderCount = computed(() =>
  Math.max(0, filteredReminderCount.value - visibleReminders.value.length),
)
const hasAnyReminders = computed(() => activeReminderItems.value.length > 0)
const hasActiveFilters = computed(
  () => activeSourceFilter.value !== 'all' || activeStatusFilter.value !== 'all',
)

const setSourceFilter = (sourceKey) => {
  activeSourceFilter.value = sourceKey || 'all'
}

const setStatusFilter = (statusKey) => {
  activeStatusFilter.value = statusKey || 'all'
}

const resetFilters = () => {
  activeSourceFilter.value = 'all'
  activeStatusFilter.value = 'all'
}

watch(
  activeReminderItems,
  () => {
    remindersStore.syncMapReminderEvents()
  },
  { immediate: true },
)
</script>

<template>
  <div class="reminders-page" data-testid="reminders-page">
    <header class="reminders-header">
      <button type="button" class="reminders-back-button" @click="goHome">
        <i class="fas fa-chevron-left" aria-hidden="true"></i>
        <span>{{ t('首页', 'Home') }}</span>
      </button>
      <h1 class="reminders-page-title">{{ t('提醒事项', 'Reminders') }}</h1>
    </header>

    <main class="reminders-content">
      <section class="reminders-panel reminders-intro">
        <p class="reminders-eyebrow">
          {{ t('跨模块线索收件箱', 'Cross-module cue inbox') }}
        </p>
        <h2 class="reminders-intro-title">
          {{
            t(
              '提醒事项先承接线索，日历只保留确认后的日程。',
              'Reminders catch cues first; Calendar keeps confirmed schedule events.',
            )
          }}
        </h2>
        <p class="reminders-intro-copy">
          {{
            t(
              '来自地图、电话、购物与股票的线索会先汇总在这里；确认后再进入日历。',
              'Cues from Map, Phone, Shopping, and Stock stay here until you confirm them for Calendar.',
            )
          }}
        </p>
        <div class="reminders-summary-grid">
          <div class="reminders-summary-item reminders-summary-item--pending">
            <p>{{ t('待处理', 'Suggested') }}</p>
            <strong>{{ suggestedReminderCount }}</strong>
          </div>
          <div class="reminders-summary-item reminders-summary-item--confirmed">
            <p>{{ t('已确认', 'Confirmed') }}</p>
            <strong>{{ confirmedReminderCount }}</strong>
          </div>
          <div class="reminders-summary-item reminders-summary-item--pinned">
            <p>{{ t('已固定', 'Pinned') }}</p>
            <strong>{{ pinnedReminderCount }}</strong>
          </div>
        </div>
      </section>

      <section class="reminders-panel reminders-filter-panel">
        <div class="reminders-section-header">
          <div class="reminders-section-copy">
            <p class="reminders-section-kicker">{{ t('来源统计', 'Sources') }}</p>
            <h2 class="reminders-section-title">{{ t('当前提醒', 'Current reminders') }}</h2>
          </div>
          <span
            class="reminders-result-count"
            data-testid="reminders-filtered-count"
            aria-live="polite"
          >
            {{
              t(
                `${filteredReminderCount} / ${activeReminderCount} 条`,
                `${filteredReminderCount} / ${activeReminderCount} items`,
              )
            }}
          </span>
        </div>
        <div class="reminders-source-summary">
          <div v-for="source in sourceSummaryItems" :key="source.key" class="reminders-source-stat">
            <p>{{ t(source.labelZh, source.labelEn) }}</p>
            <strong>{{ source.count }}</strong>
          </div>
        </div>
        <div class="reminders-filter-stack">
          <div
            class="reminders-filter-group"
            data-testid="reminders-source-filters"
            role="group"
            :aria-label="t('按来源筛选', 'Filter by source')"
          >
            <button
              v-for="source in sourceFilterOptions"
              :key="source.key"
              type="button"
              class="reminders-filter reminders-filter--source"
              :class="{ 'is-active': activeSourceFilter === source.key }"
              :data-testid="`reminders-source-filter-${source.key}`"
              :aria-pressed="activeSourceFilter === source.key"
              @click="setSourceFilter(source.key)"
            >
              <span class="reminders-filter-label">{{ t(source.labelZh, source.labelEn) }}</span>
              <span class="reminders-filter-count" aria-hidden="true">{{ source.count }}</span>
            </button>
          </div>
          <div
            class="reminders-filter-group"
            data-testid="reminders-status-filters"
            role="group"
            :aria-label="t('按状态筛选', 'Filter by status')"
          >
            <button
              v-for="status in statusFilterOptions"
              :key="status.key"
              type="button"
              class="reminders-filter reminders-filter--status"
              :class="{ 'is-active': activeStatusFilter === status.key }"
              :data-testid="`reminders-status-filter-${status.key}`"
              :aria-pressed="activeStatusFilter === status.key"
              @click="setStatusFilter(status.key)"
            >
              <span class="reminders-filter-label">{{ t(status.labelZh, status.labelEn) }}</span>
              <span class="reminders-filter-count" aria-hidden="true">{{ status.count }}</span>
            </button>
            <button
              v-if="hasActiveFilters"
              type="button"
              class="reminders-filter reminders-filter--reset"
              data-testid="reminders-reset-filters"
              @click="resetFilters"
            >
              {{ t('重置筛选', 'Reset') }}
            </button>
          </div>
        </div>
      </section>

      <section v-if="visibleReminders.length > 0" class="reminders-list">
        <article
          v-for="item in visibleReminders"
          :key="item.key"
          class="reminder-card"
          :data-testid="`reminder-card-${item.key}`"
        >
          <div class="reminder-card__body">
            <span class="reminder-card__icon" aria-hidden="true">
              <i :class="item.icon"></i>
            </span>
            <div class="reminder-card__content">
              <div class="reminder-card__header">
                <div class="reminder-card__heading">
                  <p class="reminder-card__source">{{ getReminderSourceLabel(item) }}</p>
                  <h3 class="reminder-card__title">{{ getReminderTitle(item) }}</h3>
                </div>
                <span class="reminder-status" :class="getStatusClass(item)" aria-live="polite">
                  {{ getStatusLabel(item) }}
                </span>
              </div>
              <p v-if="getReminderSummary(item)" class="reminder-card__summary">
                {{ getReminderSummary(item) }}
              </p>
              <p class="reminder-card__time">
                {{ t('建议时间', 'Suggested time') }}: {{ formatDateTime(item.dueAt) }}
              </p>
            </div>
          </div>

          <div class="reminder-card__actions">
            <button
              v-if="item.status !== 'confirmed'"
              type="button"
              class="reminders-action reminders-action--confirm"
              @click="confirmReminder(item)"
            >
              {{ t('确认进日历', 'Confirm to Calendar') }}
            </button>
            <span v-else class="reminders-feedback reminders-action--confirm">
              {{ t('已进入日历', 'In Calendar') }}
            </span>
            <button
              v-if="item.source === 'map'"
              type="button"
              class="reminders-action reminders-action--pin"
              @click="toggleReminderPin(item)"
            >
              {{ item.pinned ? t('取消固定', 'Unpin') : t('固定', 'Pin') }}
            </button>
            <button
              type="button"
              class="reminders-action reminders-action--source"
              @click="openReminderSource(item)"
            >
              {{ t('打开来源', 'Open source') }}
            </button>
            <button
              type="button"
              class="reminders-action reminders-action--dismiss"
              @click="dismissReminder(item)"
            >
              {{ t('忽略', 'Dismiss') }}
            </button>
          </div>
        </article>
        <p v-if="hiddenFilteredReminderCount > 0" class="reminders-hidden-count">
          {{
            t(
              `还有 ${hiddenFilteredReminderCount} 条匹配提醒未显示`,
              `${hiddenFilteredReminderCount} more matching reminders`,
            )
          }}
        </p>
      </section>

      <section
        v-else
        class="reminders-panel reminders-empty-state"
        data-testid="reminders-empty-state"
        :data-empty-kind="hasAnyReminders ? 'filtered' : 'collection'"
      >
        <p class="reminders-empty-title">
          {{
            hasAnyReminders
              ? t('当前筛选下暂无提醒', 'No reminders match these filters')
              : t('暂无提醒事项', 'No reminders yet')
          }}
        </p>
        <p class="reminders-empty-copy">
          {{
            hasAnyReminders
              ? t(
                  '换一个来源或状态继续查看；被确认的提醒会留在这里作为处理记录，同时同步到日历。',
                  'Try another source or status. Confirmed reminders stay here as handling records and sync to Calendar.',
                )
              : t(
                  '地图地点反馈、未接来电、购物配送和股票复盘线索会先来到这里；确认后再进入日历日程。',
                  'Map follow-ups, missed calls, Shopping delivery, and Stock review cues will land here first; confirmation sends them to Calendar.',
                )
          }}
        </p>
        <button
          v-if="hasAnyReminders && hasActiveFilters"
          type="button"
          class="reminders-empty-reset"
          data-testid="reminders-empty-reset"
          @click="resetFilters"
        >
          {{ t('查看全部提醒', 'Show all reminders') }}
        </button>
      </section>

      <section class="reminders-panel reminders-boundary">
        <div class="reminders-boundary__layout">
          <div class="reminders-boundary__copy">
            <p class="reminders-boundary__title">{{ t('日历边界', 'Calendar boundary') }}</p>
            <p class="reminders-boundary__description">
              {{
                t(
                  '日历保留已确认、有时间意义的日程；提醒事项保留仍需用户处理的线索。',
                  'Calendar keeps confirmed timed schedule; Reminders keeps actionable cues.',
                )
              }}
            </p>
          </div>
          <button
            type="button"
            class="reminders-calendar-button bg-blue-500"
            @click="openCalendar"
          >
            {{ t('打开日历', 'Open Calendar') }}
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.reminders-page {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--system-text);
  background: var(--system-page-bg);
}

.reminders-header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 48px 16px 12px;
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  box-shadow: var(--system-shadow-chrome);
}

.reminders-back-button,
.reminders-filter,
.reminders-action,
.reminders-empty-reset,
.reminders-calendar-button {
  font: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition:
    color var(--system-motion-fast),
    background var(--system-motion-fast),
    border-color var(--system-motion-fast),
    box-shadow var(--system-motion-fast);
}

.reminders-back-button {
  min-width: 0;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--system-radius-sm);
  color: var(--system-accent);
  background: transparent;
  font-size: 14px;
  font-weight: 650;
}

.reminders-back-button span {
  overflow-wrap: anywhere;
}

.reminders-page-title {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 17px;
  font-weight: 750;
}

.reminders-content {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 24px 20px calc(24px + env(safe-area-inset-bottom));
}

.reminders-panel,
.reminder-card {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.reminders-panel,
.reminder-card {
  padding: 16px;
}

.reminders-eyebrow,
.reminders-section-kicker,
.reminders-intro-title,
.reminders-intro-copy,
.reminders-section-title,
.reminders-source-stat p,
.reminder-card__source,
.reminder-card__title,
.reminder-card__summary,
.reminder-card__time,
.reminders-hidden-count,
.reminders-empty-title,
.reminders-empty-copy,
.reminders-boundary__title,
.reminders-boundary__description {
  margin: 0;
}

.reminders-eyebrow {
  color: var(--system-warning);
  font-size: 12px;
  font-weight: 750;
}

.reminders-intro-title {
  margin-top: 8px;
  overflow-wrap: anywhere;
  font-size: 20px;
  line-height: 1.35;
  font-weight: 760;
}

.reminders-intro-copy {
  margin-top: 8px;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.65;
}

.reminders-summary-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--system-subtle-border);
  border-radius: var(--system-radius-sm);
  background: var(--system-surface-muted);
}

.reminders-summary-item {
  min-width: 0;
  padding: 10px 12px;
}

.reminders-summary-item + .reminders-summary-item {
  border-left: 1px solid var(--system-subtle-border);
}

.reminders-summary-item p {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 10px;
  line-height: 1.4;
}

.reminders-summary-item strong {
  display: block;
  margin-top: 2px;
  font-size: 18px;
}

.reminders-summary-item--pending strong {
  color: var(--system-warning);
}

.reminders-summary-item--confirmed strong {
  color: var(--system-success);
}

.reminders-summary-item--pinned strong {
  color: var(--system-info);
}

.reminders-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.reminders-section-copy {
  min-width: 0;
}

.reminders-section-kicker {
  color: var(--system-text-muted);
  font-size: 12px;
}

.reminders-section-title {
  margin-top: 2px;
  overflow-wrap: anywhere;
  font-size: 15px;
  font-weight: 700;
}

.reminders-result-count {
  flex: none;
  max-width: 48%;
  padding: 5px 9px;
  border: 1px solid var(--system-subtle-border);
  border-radius: 999px;
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
  font-size: 11px;
  line-height: 1.3;
  text-align: center;
}

.reminders-source-summary {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-block: 1px solid var(--system-subtle-border);
}

.reminders-source-stat {
  min-width: 0;
  padding: 10px 4px;
}

.reminders-source-stat:nth-child(even) {
  padding-left: 12px;
  border-left: 1px solid var(--system-subtle-border);
}

.reminders-source-stat p {
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 11px;
}

.reminders-source-stat strong {
  display: block;
  margin-top: 2px;
  font-size: 16px;
}

.reminders-filter-stack {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reminders-filter-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.reminders-filter {
  min-width: 0;
  min-height: 44px;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
  font-size: 11px;
  line-height: 1.35;
  font-weight: 700;
  text-align: left;
}

.reminders-filter-label {
  min-width: 0;
  overflow-wrap: anywhere;
}

.reminders-filter-count {
  flex: none;
  min-width: 20px;
  padding: 2px 6px;
  border-radius: 999px;
  color: inherit;
  background: color-mix(in srgb, currentColor 10%, transparent);
  text-align: center;
}

.reminders-filter--source.is-active {
  border-color: var(--system-accent);
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.reminders-filter--status.is-active {
  border-color: color-mix(in srgb, var(--system-warning) 62%, var(--system-control-border));
  color: var(--system-warning);
  background: var(--system-warning-soft);
}

.reminders-filter--reset {
  color: var(--system-text);
  background: var(--system-surface-muted);
}

.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-card__body {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.reminder-card__icon {
  width: 40px;
  height: 40px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--system-radius-sm);
  color: var(--system-accent);
  background: var(--system-accent-soft);
}

.reminder-card__content,
.reminder-card__heading {
  min-width: 0;
}

.reminder-card__content {
  flex: 1;
}

.reminder-card__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: start;
  gap: 8px;
}

.reminder-card__source {
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.4;
}

.reminder-card__title {
  margin-top: 4px;
  overflow-wrap: anywhere;
  color: var(--system-text);
  font-size: 15px;
  line-height: 1.45;
  font-weight: 700;
}

.reminder-status {
  max-width: 112px;
  padding: 5px 8px;
  border-radius: 999px;
  overflow-wrap: anywhere;
  font-size: 10px;
  line-height: 1.3;
  font-weight: 750;
  text-align: center;
}

.reminder-status--pending {
  color: var(--system-warning);
  background: var(--system-warning-soft);
}

.reminder-status--confirmed {
  color: var(--system-success);
  background: var(--system-success-soft);
}

.reminder-status--pinned {
  color: var(--system-info);
  background: var(--system-info-soft);
}

.reminder-status--draft {
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
}

.reminder-card__summary,
.reminder-card__time {
  overflow-wrap: anywhere;
}

.reminder-card__summary {
  margin-top: 8px;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.65;
}

.reminder-card__time {
  margin-top: 8px;
  color: var(--system-text-soft);
  font-size: 11px;
  line-height: 1.45;
}

.reminder-card__actions {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.reminders-action,
.reminders-feedback,
.reminders-empty-reset,
.reminders-calendar-button {
  min-height: 44px;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  overflow-wrap: anywhere;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 700;
  text-align: center;
}

.reminders-action--confirm {
  border-color: color-mix(in srgb, var(--system-success) 24%, transparent);
  color: var(--system-success);
  background: var(--system-success-soft);
}

.reminders-action--pin {
  border-color: color-mix(in srgb, var(--system-info) 24%, transparent);
  color: var(--system-info);
  background: var(--system-info-soft);
}

.reminders-action--source {
  border-color: var(--system-control-border);
  color: var(--system-text);
  background: var(--system-control-bg);
}

.reminders-action--dismiss {
  border-color: color-mix(in srgb, var(--system-danger) 22%, transparent);
  color: var(--system-danger);
  background: var(--system-danger-soft);
}

.reminders-hidden-count {
  padding-inline: 4px;
  color: var(--system-text-soft);
  font-size: 11px;
  line-height: 1.45;
  text-align: center;
}

.reminders-empty-state {
  border-style: dashed;
}

.reminders-empty-title {
  font-size: 15px;
  font-weight: 700;
}

.reminders-empty-copy {
  margin-top: 8px;
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 14px;
  line-height: 1.65;
}

.reminders-empty-reset {
  margin-top: 12px;
  border-color: var(--system-accent);
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.reminders-boundary__layout {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.reminders-boundary__copy {
  min-width: 0;
  flex: 1 1 220px;
}

.reminders-boundary__title {
  font-size: 14px;
  font-weight: 700;
}

.reminders-boundary__description {
  margin-top: 4px;
  overflow-wrap: anywhere;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.65;
}

.reminders-calendar-button {
  flex: none;
  border-color: var(--system-accent);
  color: var(--system-on-accent);
  background: var(--system-accent);
}

.reminders-back-button:hover,
.reminders-filter:not(.is-active):hover,
.reminders-action:hover {
  background: var(--system-hover-bg);
}

.reminders-page button:active {
  box-shadow: inset 0 0 0 999px var(--system-pressed-bg);
}

.reminders-page button:focus-visible {
  outline: 2px solid var(--system-accent);
  outline-offset: 2px;
}

@media (max-width: 380px) {
  .reminders-content {
    padding-inline: 16px;
  }

  .reminders-header {
    padding-inline: 12px;
  }

  .reminder-card__body {
    gap: 10px;
  }

  .reminder-card__icon {
    width: 36px;
    height: 36px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reminders-back-button,
  .reminders-filter,
  .reminders-action,
  .reminders-empty-reset,
  .reminders-calendar-button {
    transition: none;
  }
}
</style>
