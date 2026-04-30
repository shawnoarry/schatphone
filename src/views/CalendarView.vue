<script setup>
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useCalendarStore } from '../stores/calendar'
import { useMapStore } from '../stores/map'
import { useSystemStore } from '../stores/system'

const router = useRouter()
const { t } = useI18n()
const calendarStore = useCalendarStore()
const mapStore = useMapStore()
const systemStore = useSystemStore()
const { upcomingEvents } = storeToRefs(calendarStore)
const { mapCalendarReminders, mapAreaFeedback } = storeToRefs(mapStore)
const { settings } = storeToRefs(systemStore)

const activeMapReminders = computed(() =>
  mapCalendarReminders.value.filter((reminder) => reminder.status !== 'dismissed'),
)
const visibleMapReminders = computed(() => activeMapReminders.value.slice(0, 4))
const mapReminderCount = computed(() => activeMapReminders.value.length)
const dismissedMapReminderCount = computed(
  () => mapCalendarReminders.value.filter((reminder) => reminder.status === 'dismissed').length,
)
const visibleCalendarEvents = computed(() => upcomingEvents.value.slice(0, 4))
const eventTimeQuickShiftOptions = [
  { key: 'plus_hour', labelZh: '+1 小时', labelEn: '+1h', offsetMs: 60 * 60 * 1000 },
  { key: 'plus_day', labelZh: '+1 天', labelEn: '+1d', offsetMs: 24 * 60 * 60 * 1000 },
]
const calendarPushRuntime = computed(() => {
  const systemSettings = settings.value.system || {}
  const automationSettings = settings.value.aiAutomation || {}
  const quietHoursActive = systemStore.isAiAutomationQuietHoursActive(Date.now())
  const quietHoursEnabled = automationSettings.quietHoursEnabled === true
  const base = {
    ready: false,
    labelZh: '推送未就绪',
    labelEn: 'Push not ready',
    detailZh: '需要先在设置里启用真实推送并完成设备订阅。',
    detailEn: 'Enable real push and subscribe this device in Settings first.',
    toneClass: 'bg-gray-100 text-gray-600',
    quietHoursEnabled,
    quietHoursActive,
    quietHoursStart: automationSettings.quietHoursStart || '23:00',
    quietHoursEnd: automationSettings.quietHoursEnd || '07:00',
    displayMode: systemSettings.pushDisplayMode || 'minimal',
  }

  if (systemSettings.notifications === false) {
    return {
      ...base,
      detailZh: '系统通知总开关已关闭，Calendar 不会安排真实推送。',
      detailEn: 'System notifications are off, so Calendar cannot schedule real push.',
    }
  }
  if (systemSettings.realPushEnabled !== true) {
    return {
      ...base,
      detailZh: '真实推送未启用；事件仍会保留在 Calendar 内。',
      detailEn: 'Real push is disabled; events remain visible inside Calendar.',
    }
  }
  if (systemSettings.pushSubscriptionActive !== true) {
    return {
      ...base,
      detailZh: '当前设备尚未订阅推送，需在设置里重新订阅。',
      detailEn: 'This device is not subscribed yet; resubscribe in Settings.',
    }
  }
  if (!systemSettings.pushServerUrl || !systemSettings.pushDeviceId) {
    return {
      ...base,
      detailZh: '推送服务地址或设备标识缺失，无法安排定时推送。',
      detailEn: 'Push server URL or device ID is missing, so schedules cannot be armed.',
    }
  }

  return {
    ...base,
    ready: true,
    labelZh: '推送就绪',
    labelEn: 'Push ready',
    detailZh: '已确认的 Calendar 事件会按事件时间安排真实推送。',
    detailEn: 'Confirmed Calendar events schedule real push at their event time.',
    toneClass: 'bg-emerald-50 text-emerald-600',
  }
})

const goHome = () => {
  router.push('/home')
}

const openMap = () => {
  router.push('/map')
}

const openWorldBook = () => {
  router.push('/worldbook')
}

const buildKnowledgePointContextTags = (item = {}) => {
  const tags = []
  const source = typeof item.source === 'string' ? item.source.trim() : ''
  if (source === 'map_area_feedback' || source === 'map_calendar_reminder') {
    tags.push('map', 'travel')
  }
  const areaId =
    typeof item.areaId === 'string' && item.areaId.trim()
      ? item.areaId.trim()
      : typeof item.sourceAreaId === 'string' && item.sourceAreaId.trim()
        ? item.sourceAreaId.trim()
        : ''
  if (areaId) tags.push(areaId)
  return tags
}

const buildKnowledgePointContextTexts = (item = {}) =>
  [item.titleZh, item.titleEn, item.summaryZh, item.summaryEn]
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)

const buildRelatedKnowledgePointIndex = (items = []) =>
  Object.fromEntries(
    items.map((item) => [
      item.id,
      systemStore.findRelevantKnowledgePoints({
        texts: buildKnowledgePointContextTexts(item),
        tags: buildKnowledgePointContextTags(item),
        limit: 3,
      }),
    ]),
  )

const reminderKnowledgePoints = computed(() =>
  buildRelatedKnowledgePointIndex(visibleMapReminders.value),
)
const eventKnowledgePoints = computed(() =>
  buildRelatedKnowledgePointIndex(visibleCalendarEvents.value),
)

const getRelatedKnowledgePoints = (collection, itemId) => {
  const source = collection?.value ?? collection ?? {}
  return source[itemId] || []
}

const getLatestReminder = (reminder) =>
  mapCalendarReminders.value.find((item) => item.id === reminder?.id) || reminder

const syncReminderEvent = (reminder) => {
  if (!reminder?.id) return
  if (reminder.status === 'dismissed') {
    void calendarStore.cancelEventPushScheduledBySourceReminderId(reminder.id, {
      source: 'calendar_reminder_dismiss',
    })
    calendarStore.removeEventBySourceReminderId(reminder.id)
    return
  }
  if (reminder.status === 'confirmed' || reminder.pinned) {
    const event = calendarStore.upsertEventFromMapReminder(reminder)
    if (event?.id) {
      void calendarStore.ensureEventPushScheduled(event.id, {
        source: 'calendar_reminder_sync',
      })
    }
    return
  }
  void calendarStore.cancelEventPushScheduledBySourceReminderId(reminder.id, {
    source: 'calendar_reminder_remove',
  })
  calendarStore.removeEventBySourceReminderId(reminder.id)
}

const confirmReminder = (reminder) => {
  mapStore.confirmMapCalendarReminder(reminder.id)
  syncReminderEvent(getLatestReminder(reminder))
}

const toggleReminderPin = (reminder) => {
  mapStore.setMapCalendarReminderPinned(reminder.id, reminder.pinned !== true)
  syncReminderEvent(getLatestReminder(reminder))
}

const dismissReminder = (reminder) => {
  void calendarStore.cancelEventPushScheduledBySourceReminderId(reminder.id, {
    source: 'calendar_reminder_dismiss',
  })
  mapStore.dismissMapCalendarReminder(reminder.id)
  calendarStore.removeEventBySourceReminderId(reminder.id)
}

const getReminderStatusLabel = (reminder) => {
  if (reminder.pinned) return t('已固定', 'Pinned')
  if (reminder.status === 'confirmed') return t('已确认', 'Confirmed')
  return t('建议提醒', 'Suggested')
}

const getReminderStatusClass = (reminder) => {
  if (reminder.pinned) return 'bg-blue-50 text-blue-600'
  if (reminder.status === 'confirmed') return 'bg-emerald-50 text-emerald-600'
  return 'bg-amber-50 text-amber-600'
}

const padDatePart = (value) => String(value).padStart(2, '0')

const formatDateTimeInput = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return ''
  const date = new Date(ts)
  return [
    date.getFullYear(),
    '-',
    padDatePart(date.getMonth() + 1),
    '-',
    padDatePart(date.getDate()),
    'T',
    padDatePart(date.getHours()),
    ':',
    padDatePart(date.getMinutes()),
  ].join('')
}

const parseDateTimeInput = (value) => {
  if (typeof value !== 'string' || !value.trim()) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const updateEventStartsAt = (event, value) => {
  const startsAt = parseDateTimeInput(value)
  if (startsAt <= 0) return
  if (calendarStore.setEventStartsAt(event.id, startsAt)) {
    void calendarStore.rescheduleEventPush(event.id, {
      source: 'calendar_event_time_edit',
    })
  }
}

const shiftEventStartsAt = (event, offsetMs) => {
  const startsAt = Math.max(0, Number(event.startsAt || 0))
  if (startsAt <= 0) return
  if (calendarStore.setEventStartsAt(event.id, startsAt + offsetMs)) {
    void calendarStore.rescheduleEventPush(event.id, {
      source: 'calendar_event_time_shift',
    })
  }
}

const resetEventStartsAt = (event) => {
  if (calendarStore.resetEventStartsAt(event.id)) {
    void calendarStore.rescheduleEventPush(event.id, {
      source: 'calendar_event_time_reset',
    })
  }
}

const isEventTimeEdited = (event) => Number(event.timeEditedAt || 0) > 0

const getEventPushHistory = (event) =>
  Array.isArray(event?.pushHistory) ? event.pushHistory.slice(0, 3) : []

const getCalendarQuietHoursLabel = () => {
  const runtime = calendarPushRuntime.value
  if (!runtime.quietHoursEnabled) {
    return t('AI 安静时段未启用。', 'AI quiet hours are off.')
  }
  const windowText = `${runtime.quietHoursStart}-${runtime.quietHoursEnd}`
  if (runtime.quietHoursActive) {
    return t(
      `AI 安静时段生效中（${windowText}）；Calendar 定时推送仍按已排程时间执行。`,
      `AI quiet hours are active (${windowText}); Calendar scheduled push still follows its armed time.`,
    )
  }
  return t(
    `AI 安静时段为 ${windowText}；该策略不会暂停已安排的 Calendar 推送。`,
    `AI quiet hours are ${windowText}; this policy does not pause armed Calendar push schedules.`,
  )
}

const formatPushReason = (reason) => {
  if (reason === 'real_push_disabled') return t('真实推送未就绪', 'Real push not ready')
  if (reason === 'server_url_missing') return t('推送服务地址缺失', 'Push server URL missing')
  if (reason === 'schedule_failed') return t('排程失败', 'Schedule failed')
  if (reason === 'cancel_schedule_failed') return t('取消排程失败', 'Cancel schedule failed')
  if (reason === 'network_error') return t('推送服务连接失败', 'Push service network error')
  return reason || t('暂无异常', 'No error')
}

const getCalendarPushStatusMeta = (event) => {
  if (event.scheduledPushId && event.scheduledPushAt === event.startsAt) {
    return {
      labelZh: '已排程',
      labelEn: 'Scheduled',
      className: 'bg-emerald-50 text-emerald-600',
    }
  }
  if (event.pushStatus === 'needs_reschedule') {
    return {
      labelZh: '待重排',
      labelEn: 'Reschedule pending',
      className: 'bg-amber-50 text-amber-600',
    }
  }
  if (event.lastPushError || event.pushStatus === 'failed' || event.pushStatus === 'cancel_failed') {
    return {
      labelZh: '排程异常',
      labelEn: 'Schedule issue',
      className: 'bg-rose-50 text-rose-600',
    }
  }
  if (!calendarPushRuntime.value.ready) {
    return {
      labelZh: '未就绪',
      labelEn: 'Not ready',
      className: 'bg-gray-100 text-gray-600',
    }
  }
  if (event.pushStatus === 'cancelled') {
    return {
      labelZh: '已取消',
      labelEn: 'Cancelled',
      className: 'bg-gray-100 text-gray-600',
    }
  }
  return {
    labelZh: '待排程',
    labelEn: 'Pending',
    className: 'bg-blue-50 text-blue-600',
  }
}

const getCalendarPushDetail = (event) => {
  if (event.scheduledPushId && event.scheduledPushAt === event.startsAt) {
    return t(
      `排程时间：${formatDateTime(event.scheduledPushAt)}`,
      `Scheduled time: ${formatDateTime(event.scheduledPushAt)}`,
    )
  }
  if (event.lastPushError) {
    return t(
      `原因：${formatPushReason(event.lastPushError)}`,
      `Reason: ${formatPushReason(event.lastPushError)}`,
    )
  }
  if (!calendarPushRuntime.value.ready) {
    return t(calendarPushRuntime.value.detailZh, calendarPushRuntime.value.detailEn)
  }
  if (event.pushStatus === 'cancelled') {
    return t('最近一次排程已取消。', 'The most recent schedule was cancelled.')
  }
  return t('等待下一次同步或手动调整后排程。', 'Waiting for the next sync or time edit to schedule.')
}

const formatPushHistoryEntry = (entry) => {
  const action = entry.action === 'cancel' ? t('取消', 'Cancel') : t('排程', 'Schedule')
  const status = entry.status === 'ok' ? t('成功', 'ok') : t('失败', 'failed')
  return `${action} ${status} · ${formatDateTime(entry.createdAt)}`
}

const formatDateTime = (timestamp) => {
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || ts <= 0) return t('待定', 'TBD')
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

watch(
  mapCalendarReminders,
  (reminders) => {
    reminders.forEach((reminder) => syncReminderEvent(reminder))
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div class="w-full h-full bg-[#f7f7fb] text-black flex flex-col">
    <div class="pt-12 pb-3 px-4 border-b border-gray-200 bg-white flex items-center gap-3">
      <button @click="goHome" class="text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ t('首页', 'Home') }}
      </button>
      <h1 class="font-bold">{{ t('日历', 'Calendar') }}</h1>
    </div>

    <div class="flex-1 px-5 py-6 space-y-4 overflow-y-auto">
      <section class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs text-gray-500">{{ t('来自地图', 'From Map') }}</p>
            <h2 class="font-semibold">{{ t('地点反馈提醒', 'Location feedback reminders') }}</h2>
          </div>
          <span class="rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-600">
            {{ t(`${mapReminderCount} 条`, `${mapReminderCount} items`) }}
          </span>
        </div>

        <p class="mt-2 text-xs text-gray-500">
          {{ t('地图解锁区域后，会把地点反馈整理成可确认的日程线索。', 'Unlocked map areas become follow-up cues you can confirm from Calendar.') }}
        </p>
        <p v-if="dismissedMapReminderCount > 0" class="mt-2 text-[11px] text-gray-400">
          {{ t(`${dismissedMapReminderCount} 条已忽略`, `${dismissedMapReminderCount} dismissed`) }}
        </p>
      </section>

      <section v-if="visibleMapReminders.length > 0" class="space-y-2">
        <article
          v-for="reminder in visibleMapReminders"
          :key="reminder.id"
          :data-testid="`calendar-reminder-card-${reminder.id}`"
          class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold">
                <i :class="[reminder.icon, 'mr-1 text-blue-500']"></i>
                {{ t(reminder.titleZh, reminder.titleEn) }}
              </p>
              <p class="mt-1 text-xs text-gray-500">{{ formatDateTime(reminder.dueAt) }}</p>
            </div>
            <span
              class="shrink-0 rounded-full px-2 py-1 text-[11px]"
              :class="getReminderStatusClass(reminder)"
            >
              {{ getReminderStatusLabel(reminder) }}
            </span>
          </div>

          <p class="mt-2 text-sm text-gray-700">{{ t(reminder.summaryZh, reminder.summaryEn) }}</p>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
            <span>{{ t(`${reminder.explorationPoints} 点探索`, `${reminder.explorationPoints} pts`) }}</span>
            <span>{{ t('来源：地图区域反馈', 'Source: Map area feedback') }}</span>
          </div>

          <div
            v-if="getRelatedKnowledgePoints(reminderKnowledgePoints, reminder.id).length > 0"
            :data-testid="`calendar-reminder-worldbook-${reminder.id}`"
            class="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-[11px] font-medium text-blue-700">
                {{ t('Related knowledge points', 'Related knowledge points') }}
              </p>
              <button type="button" class="text-[11px] text-blue-600" @click="openWorldBook">
                WorldBook
              </button>
            </div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="point in getRelatedKnowledgePoints(reminderKnowledgePoints, reminder.id)"
                :key="point.id"
                type="button"
                class="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] text-blue-700"
                :data-testid="`calendar-reminder-worldbook-chip-${reminder.id}-${point.id}`"
                @click="openWorldBook"
              >
                {{ point.title }}
              </button>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <button
              v-if="reminder.status !== 'confirmed'"
              @click="confirmReminder(reminder)"
              class="rounded-full bg-emerald-500 px-3 py-2 text-xs text-white"
              :title="t('确认提醒', 'Confirm reminder')"
            >
              <i class="fas fa-check mr-1"></i>{{ t('确认', 'Confirm') }}
            </button>
            <button
              @click="toggleReminderPin(reminder)"
              class="rounded-full px-3 py-2 text-xs"
              :class="reminder.pinned ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'"
              :title="reminder.pinned ? t('取消固定', 'Unpin reminder') : t('固定提醒', 'Pin reminder')"
            >
              <i class="fas fa-thumbtack mr-1"></i>{{ reminder.pinned ? t('取消固定', 'Unpin') : t('固定', 'Pin') }}
            </button>
            <button
              @click="dismissReminder(reminder)"
              class="rounded-full bg-gray-100 px-3 py-2 text-xs text-gray-600"
              :title="t('忽略提醒', 'Dismiss reminder')"
            >
              <i class="fas fa-xmark mr-1"></i>{{ t('忽略', 'Dismiss') }}
            </button>
          </div>
        </article>
      </section>

      <section v-else class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <p class="font-semibold mb-2">{{ t('暂无地点反馈提醒', 'No location feedback reminders yet') }}</p>
        <p class="text-sm text-gray-600">
          {{ t('完成地图行程并解锁区域后，这里会显示可跟进的地点提醒。', 'Complete map trips and unlock areas to see follow-up location reminders here.') }}
        </p>
      </section>

      <section v-if="visibleCalendarEvents.length > 0" class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs text-gray-500">{{ t('已确认', 'Confirmed') }}</p>
            <h2 class="font-semibold">{{ t('日历事件', 'Calendar events') }}</h2>
          </div>
          <span class="rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-600">
            {{ t(`${visibleCalendarEvents.length} 条`, `${visibleCalendarEvents.length} events`) }}
          </span>
        </div>

        <div class="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-[11px] text-gray-600">
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-gray-700">{{ t('真实推送状态', 'Real push status') }}</span>
            <span class="shrink-0 rounded-full px-2 py-1" :class="calendarPushRuntime.toneClass">
              {{ t(calendarPushRuntime.labelZh, calendarPushRuntime.labelEn) }}
            </span>
          </div>
          <p class="mt-2">{{ t(calendarPushRuntime.detailZh, calendarPushRuntime.detailEn) }}</p>
          <p class="mt-1">{{ getCalendarQuietHoursLabel() }}</p>
        </div>

        <div class="mt-3 space-y-2">
          <article
            v-for="event in visibleCalendarEvents"
            :key="event.id"
            :data-testid="`calendar-event-card-${event.id}`"
            class="rounded-lg border border-gray-100 bg-gray-50 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold">
                  <i :class="[event.icon, 'mr-1 text-emerald-500']"></i>
                  {{ t(event.titleZh, event.titleEn) }}
                </p>
                <p class="mt-1 text-xs text-gray-500">{{ formatDateTime(event.startsAt) }}</p>
              </div>
              <span
                v-if="event.pinned"
                class="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] text-blue-600"
              >
                {{ t('已固定', 'Pinned') }}
              </span>
            </div>
            <p v-if="event.summaryZh || event.summaryEn" class="mt-2 text-xs text-gray-600">
              {{ t(event.summaryZh, event.summaryEn) }}
            </p>
            <div
              v-if="getRelatedKnowledgePoints(eventKnowledgePoints, event.id).length > 0"
              :data-testid="`calendar-event-worldbook-${event.id}`"
              class="mt-3 rounded-lg border border-blue-100 bg-white p-3"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-[11px] font-medium text-blue-700">
                  {{ t('Related knowledge points', 'Related knowledge points') }}
                </p>
                <button type="button" class="text-[11px] text-blue-600" @click="openWorldBook">
                  WorldBook
                </button>
              </div>
              <div class="mt-2 flex flex-wrap gap-2">
                <button
                  v-for="point in getRelatedKnowledgePoints(eventKnowledgePoints, event.id)"
                  :key="point.id"
                  type="button"
                  class="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700"
                  :data-testid="`calendar-event-worldbook-chip-${event.id}-${point.id}`"
                  @click="openWorldBook"
                >
                  {{ point.title }}
                </button>
              </div>
            </div>
            <div class="mt-3 space-y-2">
              <label class="block text-[11px] font-medium text-gray-500">
                {{ t('提醒时间', 'Reminder time') }}
              </label>
              <input
                type="datetime-local"
                class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800"
                :value="formatDateTimeInput(event.startsAt)"
                @change="updateEventStartsAt(event, $event.target.value)"
              />
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-for="option in eventTimeQuickShiftOptions"
                  :key="option.key"
                  @click="shiftEventStartsAt(event, option.offsetMs)"
                  class="rounded-full bg-white px-3 py-2 text-[11px] text-gray-700 border border-gray-200"
                  :title="t('调整提醒时间', 'Adjust reminder time')"
                >
                  <i class="fas fa-clock mr-1"></i>{{ t(option.labelZh, option.labelEn) }}
                </button>
                <button
                  v-if="isEventTimeEdited(event)"
                  @click="resetEventStartsAt(event)"
                  class="rounded-full bg-gray-100 px-3 py-2 text-[11px] text-gray-600"
                  :title="t('恢复建议时间', 'Reset suggested time')"
                >
                  <i class="fas fa-rotate-left mr-1"></i>{{ t('恢复', 'Reset') }}
                </button>
              </div>
              <p v-if="isEventTimeEdited(event)" class="text-[11px] text-blue-500">
                {{ t('已调整', 'Adjusted') }}
              </p>
              <div class="rounded-lg border border-white bg-white/80 p-2 text-[11px] text-gray-600">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-medium text-gray-700">{{ t('推送状态', 'Push status') }}</span>
                  <span
                    class="shrink-0 rounded-full px-2 py-1"
                    :class="getCalendarPushStatusMeta(event).className"
                  >
                    {{
                      t(
                        getCalendarPushStatusMeta(event).labelZh,
                        getCalendarPushStatusMeta(event).labelEn,
                      )
                    }}
                  </span>
                </div>
                <p class="mt-1">{{ getCalendarPushDetail(event) }}</p>
                <div v-if="getEventPushHistory(event).length > 0" class="mt-2 space-y-1">
                  <p class="font-medium text-gray-500">{{ t('最近排程记录', 'Recent schedule log') }}</p>
                  <p
                    v-for="entry in getEventPushHistory(event)"
                    :key="`${entry.action}-${entry.createdAt}-${entry.scheduleId}`"
                    class="flex items-center justify-between gap-2"
                  >
                    <span>{{ formatPushHistoryEntry(entry) }}</span>
                    <span v-if="entry.deliverAt" class="text-gray-400">
                      {{ formatDateTime(entry.deliverAt) }}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold">{{ t('地图反馈池', 'Map feedback pool') }}</p>
            <p class="text-xs text-gray-500">
              {{ t(`${mapAreaFeedback.length} 条地点反馈可转成提醒`, `${mapAreaFeedback.length} feedback notes can become reminders`) }}
            </p>
          </div>
          <button @click="openMap" class="rounded-full bg-blue-500 px-3 py-2 text-xs text-white">
            {{ t('打开地图', 'Open Map') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
