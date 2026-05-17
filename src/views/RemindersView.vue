<script setup>
import { computed, watch } from 'vue'
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

const visibleReminders = computed(() => activeReminderItems.value.slice(0, 12))
const locale = computed(() => (languageBase.value === 'zh' ? 'zh-CN' : systemLanguage.value))

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
          <span class="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-600">
            {{ t(`${activeReminderCount} 条`, `${activeReminderCount} items`) }}
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
              class="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700"
              @click="confirmReminder(item)"
            >
              {{ t('确认进日历', 'Confirm to Calendar') }}
            </button>
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
      </section>

      <section v-else class="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
        <p class="font-semibold">{{ t('暂无提醒事项', 'No reminders yet') }}</p>
        <p class="mt-2 text-sm leading-6 text-gray-600">
          {{
            t(
              '地图地点反馈、未接来电、购物配送和股票复盘线索会先来到这里；确认后再进入日历日程。',
              'Map follow-ups, missed calls, Shopping delivery, and Stock review cues will land here first; confirmation sends them to Calendar.',
            )
          }}
        </p>
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
