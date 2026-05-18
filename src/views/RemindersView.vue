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
    query: route.query.from === 'home' && route.query.homePage ? { from: 'home', homePage: route.query.homePage } : {},
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

const getReminderTitle = (item) => getLocalized(item, 'titleZh', 'titleEn', t('提醒事项', 'Reminder'))
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
  if (item.pinned) return 'bg-blue-50 text-blue-600'
  if (item.status === 'confirmed') return 'bg-emerald-50 text-emerald-600'
  if (item.status === 'draft') return 'bg-gray-100 text-gray-500'
  return 'bg-amber-50 text-amber-600'
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
  { key: 'shopping', labelZh: '购物', labelEn: 'Shopping', count: sourceCounts.value.shopping || 0 },
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
    const sourceMatches = activeSourceFilter.value === 'all' || item.source === activeSourceFilter.value
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
  <div class="w-full h-full bg-[#f7f7fb] text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 bg-white flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('首页', 'Home') }}
      </button>
      <h1 class="font-bold">{{ t('提醒事项', 'Reminders') }}</h1>
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-6 space-y-4">
      <section class="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
        <p class="text-xs font-semibold uppercase tracking-wide text-orange-500">
          {{ t('跨模块线索收件箱', 'Cross-module cue inbox') }}
        </p>
        <h2 class="mt-2 text-xl font-bold text-gray-950">
          {{ t('提醒事项先承接线索，日历只保留确认后的日程。', 'Reminders catch cues first; Calendar keeps confirmed schedule events.') }}
        </h2>
        <p class="mt-2 text-xs leading-5 text-gray-500">
          {{
            t(
              '这是 Calendar / Reminders 拆分的第一阶段：数据仍兼容旧 Calendar store，但用户语义已经从“日历线索层”转向“提醒事项”。',
              'This is phase one of the Calendar / Reminders split: data still stays compatible with the old Calendar store, while the user-facing meaning moves to Reminders.',
            )
          }}
        </p>
        <div class="mt-4 grid grid-cols-3 gap-2">
          <div class="rounded-xl bg-orange-50 px-3 py-2">
            <p class="text-[10px] text-orange-500">{{ t('待处理', 'Suggested') }}</p>
            <strong class="text-lg text-orange-700">{{ suggestedReminderCount }}</strong>
          </div>
          <div class="rounded-xl bg-emerald-50 px-3 py-2">
            <p class="text-[10px] text-emerald-500">{{ t('已确认', 'Confirmed') }}</p>
            <strong class="text-lg text-emerald-700">{{ confirmedReminderCount }}</strong>
          </div>
          <div class="rounded-xl bg-blue-50 px-3 py-2">
            <p class="text-[10px] text-blue-500">{{ t('已固定', 'Pinned') }}</p>
            <strong class="text-lg text-blue-700">{{ pinnedReminderCount }}</strong>
          </div>
        </div>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs text-gray-500">{{ t('来源统计', 'Sources') }}</p>
            <h2 class="font-semibold">{{ t('当前提醒', 'Current reminders') }}</h2>
          </div>
          <span
            class="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-600"
            data-testid="reminders-filtered-count"
          >
            {{ t(`${filteredReminderCount} / ${activeReminderCount} 条`, `${filteredReminderCount} / ${activeReminderCount} items`) }}
          </span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div
            v-for="source in sourceSummaryItems"
            :key="source.key"
            class="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <p class="text-[11px] text-gray-500">{{ t(source.labelZh, source.labelEn) }}</p>
            <strong class="text-base">{{ source.count }}</strong>
          </div>
        </div>
        <div class="mt-4 space-y-3">
          <div class="flex flex-wrap gap-2" data-testid="reminders-source-filters">
            <button
              v-for="source in sourceFilterOptions"
              :key="source.key"
              type="button"
              class="rounded-full border px-3 py-1.5 text-[11px] font-semibold transition"
              :class="
                activeSourceFilter === source.key
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-600'
              "
              :data-testid="`reminders-source-filter-${source.key}`"
              @click="setSourceFilter(source.key)"
            >
              {{ t(source.labelZh, source.labelEn) }} · {{ source.count }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2" data-testid="reminders-status-filters">
            <button
              v-for="status in statusFilterOptions"
              :key="status.key"
              type="button"
              class="rounded-full border px-3 py-1.5 text-[11px] font-semibold transition"
              :class="
                activeStatusFilter === status.key
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 bg-white text-gray-600'
              "
              :data-testid="`reminders-status-filter-${status.key}`"
              @click="setStatusFilter(status.key)"
            >
              {{ t(status.labelZh, status.labelEn) }} · {{ status.count }}
            </button>
            <button
              v-if="hasActiveFilters"
              type="button"
              class="rounded-full bg-gray-100 px-3 py-1.5 text-[11px] font-semibold text-gray-700"
              data-testid="reminders-reset-filters"
              @click="resetFilters"
            >
              {{ t('重置筛选', 'Reset') }}
            </button>
          </div>
        </div>
      </section>

      <section v-if="visibleReminders.length > 0" class="space-y-3">
        <article
          v-for="item in visibleReminders"
          :key="item.key"
          class="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm"
          :data-testid="`reminder-card-${item.key}`"
        >
          <div class="flex items-start gap-3">
            <span class="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
              <i :class="item.icon"></i>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-[11px] text-gray-500">{{ getReminderSourceLabel(item) }}</p>
                  <h3 class="mt-1 font-semibold text-gray-950 truncate">{{ getReminderTitle(item) }}</h3>
                </div>
                <span class="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold" :class="getStatusClass(item)">
                  {{ getStatusLabel(item) }}
                </span>
              </div>
              <p v-if="getReminderSummary(item)" class="mt-2 text-xs leading-5 text-gray-600">
                {{ getReminderSummary(item) }}
              </p>
              <p class="mt-2 text-[11px] text-gray-400">
                {{ t('建议时间', 'Suggested time') }}: {{ formatDateTime(item.dueAt) }}
              </p>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <button
              v-if="item.status !== 'confirmed'"
              class="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700"
              @click="confirmReminder(item)"
            >
              {{ t('确认进日历', 'Confirm to Calendar') }}
            </button>
            <span
              v-else
              class="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700"
            >
              {{ t('已进入日历', 'In Calendar') }}
            </span>
            <button
              v-if="item.source === 'map'"
              class="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700"
              @click="toggleReminderPin(item)"
            >
              {{ item.pinned ? t('取消固定', 'Unpin') : t('固定', 'Pin') }}
            </button>
            <button
              class="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700"
              @click="openReminderSource(item)"
            >
              {{ t('打开来源', 'Open source') }}
            </button>
            <button
              class="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700"
              @click="dismissReminder(item)"
            >
              {{ t('忽略', 'Dismiss') }}
            </button>
          </div>
        </article>
        <p v-if="hiddenFilteredReminderCount > 0" class="px-1 text-center text-[11px] text-gray-400">
          {{ t(`还有 ${hiddenFilteredReminderCount} 条匹配提醒未显示`, `${hiddenFilteredReminderCount} more matching reminders`) }}
        </p>
      </section>

      <section v-else class="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
        <p class="font-semibold">
          {{ hasAnyReminders ? t('当前筛选下暂无提醒', 'No reminders match these filters') : t('暂无提醒事项', 'No reminders yet') }}
        </p>
        <p class="mt-2 text-sm leading-6 text-gray-600">
          {{
            hasAnyReminders
              ? t('换一个来源或状态继续查看；被确认的提醒会留在这里作为处理记录，同时同步到日历。', 'Try another source or status. Confirmed reminders stay here as handling records and sync to Calendar.')
              : t(
                  '地图地点反馈、未接来电、购物配送和股票复盘线索会先来到这里；确认后再进入日历日程。',
                  'Map follow-ups, missed calls, Shopping delivery, and Stock review cues will land here first; confirmation sends them to Calendar.',
                )
          }}
        </p>
        <button
          v-if="hasAnyReminders && hasActiveFilters"
          type="button"
          class="mt-3 rounded-full bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
          data-testid="reminders-empty-reset"
          @click="resetFilters"
        >
          {{ t('查看全部提醒', 'Show all reminders') }}
        </button>
      </section>

      <section class="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('日历边界', 'Calendar boundary') }}</p>
            <p class="mt-1 text-xs leading-5 text-gray-500">
              {{ t('日历保留已确认、有时间意义的日程；提醒事项保留仍需用户处理的线索。', 'Calendar keeps confirmed timed schedule; Reminders keeps actionable cues.') }}
            </p>
          </div>
          <button @click="openCalendar" class="rounded-full bg-blue-500 px-3 py-2 text-xs text-white">
            {{ t('打开日历', 'Open Calendar') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
