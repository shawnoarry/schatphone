<script setup>
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useCalendarStore } from '../stores/calendar'
import { useMapStore } from '../stores/map'
import { useSystemStore } from '../stores/system'
import { buildWorldBookRouteQuery } from '../lib/worldbook-navigation'
import { pushReturnTarget } from '../lib/navigation-return'
import CalendarEventCard from '../components/calendar/CalendarEventCard.vue'
import CalendarMapReminderCard from '../components/calendar/CalendarMapReminderCard.vue'
import CalendarPhoneCueCard from '../components/calendar/CalendarPhoneCueCard.vue'
import CalendarShoppingCueCard from '../components/calendar/CalendarShoppingCueCard.vue'
import CalendarStockCueCard from '../components/calendar/CalendarStockCueCard.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const calendarStore = useCalendarStore()
const mapStore = useMapStore()
const systemStore = useSystemStore()
const {
  activePhoneMissedCallCues,
  activeShoppingDeliveryCues,
  activeStockMarketCues,
  phoneMissedCallCueCount,
  shoppingDeliveryCueCount,
  stockMarketCueCount,
  upcomingEvents,
} = storeToRefs(calendarStore)
const { mapCalendarReminders, mapAreaFeedback } = storeToRefs(mapStore)
const { settings } = storeToRefs(systemStore)

const activeMapReminders = computed(() =>
  mapCalendarReminders.value.filter((reminder) => reminder.status !== 'dismissed'),
)
const visibleMapReminders = computed(() => activeMapReminders.value.slice(0, 4))
const mapReminderCount = computed(() => activeMapReminders.value.length)
const visiblePhoneCues = computed(() => activePhoneMissedCallCues.value.slice(0, 4))
const visibleShoppingCues = computed(() => activeShoppingDeliveryCues.value.slice(0, 4))
const visibleStockCues = computed(() => activeStockMarketCues.value.slice(0, 4))
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
  pushReturnTarget(router, route, '/home')
}

const openMap = () => {
  router.push('/map')
}

const openReminders = () => {
  router.push({
    path: '/reminders',
    query: route.query.from === 'home' && route.query.homePage ? { from: 'home', homePage: route.query.homePage } : {},
  })
}

const openWorldBook = (options = {}) => {
  router.push({
    path: '/worldbook',
    query: buildWorldBookRouteQuery({
      source: 'calendar',
      homePage: route.query.homePage,
      pointIds: options.pointIds,
      keyword: options.keyword,
      tag: options.tag,
      usage: options.usage,
    }),
  })
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

const confirmPhoneCue = (cue) => {
  const event = calendarStore.confirmPhoneMissedCallCue(cue.id)
  if (event?.id) {
    void calendarStore.ensureEventPushScheduled(event.id, {
      source: 'calendar_phone_missed_call_confirm',
    })
  }
}

const dismissPhoneCue = (cue) => {
  calendarStore.dismissPhoneMissedCallCue(cue.id)
}

const confirmStockCue = (cue) => {
  const event = calendarStore.confirmStockMarketCue(cue.id)
  if (event?.id) {
    void calendarStore.ensureEventPushScheduled(event.id, {
      source: 'calendar_stock_market_confirm',
    })
  }
}

const dismissStockCue = (cue) => {
  calendarStore.dismissStockMarketCue(cue.id)
}

const confirmShoppingCue = (cue) => {
  const event = calendarStore.confirmShoppingDeliveryCue(cue.id)
  if (event?.id) {
    void calendarStore.ensureEventPushScheduled(event.id, {
      source: 'calendar_shopping_delivery_confirm',
    })
  }
}

const dismissShoppingCue = (cue) => {
  calendarStore.dismissShoppingDeliveryCue(cue.id)
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
        <p class="text-xs font-semibold uppercase tracking-wide text-blue-500">
          {{ t('线索确认层', 'Cue confirmation layer') }}
        </p>
        <h2 class="mt-2 text-lg font-bold text-gray-950">
          {{ t('外部模块先给出线索，确认后才进入日历。', 'Source modules suggest cues first; only confirmed cues become events.') }}
        </h2>
        <p class="mt-2 text-xs leading-5 text-gray-500">
          {{
            t(
              'Map、Phone、Shopping 与 Stock 的提醒都先停留在这里，避免其它模块自动占用日程；用户确认后才会安排事件和真实推送。',
              'Map, Phone, Shopping, and Stock reminders land here as cues first, preventing source modules from taking over the schedule. Confirmation creates events and real push schedules.',
            )
          }}
        </p>
        <div class="mt-3 rounded-lg border border-orange-100 bg-orange-50 p-3 text-xs leading-5 text-orange-700">
          <div class="flex items-center justify-between gap-3">
            <p class="font-semibold">{{ t('提醒事项拆分已开始', 'Reminders split has started') }}</p>
            <button class="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-orange-700" @click="openReminders">
              {{ t('打开提醒事项', 'Open Reminders') }}
            </button>
          </div>
          <p class="mt-1">
            {{
              t(
                '当前线索仍兼容显示在 Calendar；新入口会逐步承接未确认的回拨、物流、地图和行情提醒。',
                'Current cues remain compatible in Calendar; the new entry will gradually own unconfirmed callbacks, logistics, map, and market reminders.',
              )
            }}
          </p>
        </div>
      </section>

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
        <CalendarMapReminderCard
          v-for="reminder in visibleMapReminders"
          :key="reminder.id"
          :reminder="reminder"
          :related-knowledge-points="getRelatedKnowledgePoints(reminderKnowledgePoints, reminder.id)"
          :status-label="getReminderStatusLabel(reminder)"
          :status-class="getReminderStatusClass(reminder)"
          :formatted-due-at="formatDateTime(reminder.dueAt)"
          @confirm="confirmReminder"
          @toggle-pin="toggleReminderPin"
          @dismiss="dismissReminder"
          @open-worldbook="(pointIds) => openWorldBook({ pointIds })"
        />
      </section>

      <section v-else class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <p class="font-semibold mb-2">{{ t('暂无地点反馈提醒', 'No location feedback reminders yet') }}</p>
        <p class="text-sm text-gray-600">
          {{ t('完成地图行程并解锁区域后，这里会显示可跟进的地点提醒。', 'Complete map trips and unlock areas to see follow-up location reminders here.') }}
        </p>
      </section>

      <section class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs text-gray-500">{{ t('来自电话', 'From Phone') }}</p>
            <h2 class="font-semibold">{{ t('未接来电线索', 'Missed-call cues') }}</h2>
          </div>
          <span class="rounded-full bg-rose-50 px-2 py-1 text-[11px] text-rose-600">
            {{ t(`${phoneMissedCallCueCount} 条`, `${phoneMissedCallCueCount} items`) }}
          </span>
        </div>
        <p class="mt-2 text-xs text-gray-500">
          {{
            t(
              'Phone 新增未接来电后，会在这里形成可确认的回拨提醒；确认后才进入日历事件和真实推送链路。',
              'New missed calls from Phone become callback cues here; only confirmed cues become Calendar events and real push schedules.',
            )
          }}
        </p>
      </section>

      <section v-if="visiblePhoneCues.length > 0" class="space-y-2">
        <CalendarPhoneCueCard
          v-for="cue in visiblePhoneCues"
          :key="cue.id"
          :cue="cue"
          :formatted-suggested-at="formatDateTime(cue.suggestedAt)"
          @confirm="confirmPhoneCue"
          @dismiss="dismissPhoneCue"
        />
      </section>

      <section v-else class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <p class="font-semibold mb-2">{{ t('暂无未接来电线索', 'No missed-call cues yet') }}</p>
        <p class="text-sm text-gray-600">
          {{ t('在 Phone 里记录新的未接来电后，这里会出现可确认的回拨提醒。', 'Record a new missed call in Phone to see callback cues here.') }}
        </p>
      </section>

      <section class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs text-gray-500">{{ t('来自购物', 'From Shopping') }}</p>
            <h2 class="font-semibold">{{ t('配送跟进线索', 'Delivery follow-up cues') }}</h2>
          </div>
          <span class="rounded-full bg-orange-50 px-2 py-1 text-[11px] text-orange-600">
            {{ t(`${shoppingDeliveryCueCount} 条`, `${shoppingDeliveryCueCount} items`) }}
          </span>
        </div>
        <p class="mt-2 text-xs text-gray-500">
          {{
            t(
              'Shopping 订单会先在这里形成配送或预约跟进线索；Calendar 内确认后才进入日历事件和真实推送链路。',
              'Shopping orders first become delivery or appointment follow-up cues here; only Calendar confirmation turns them into events and real push schedules.',
            )
          }}
        </p>
      </section>

      <section v-if="visibleShoppingCues.length > 0" class="space-y-2">
        <CalendarShoppingCueCard
          v-for="cue in visibleShoppingCues"
          :key="cue.id"
          :cue="cue"
          :formatted-suggested-at="formatDateTime(cue.suggestedAt)"
          @confirm="confirmShoppingCue"
          @dismiss="dismissShoppingCue"
        />
      </section>

      <section v-else class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <p class="font-semibold mb-2">{{ t('暂无购物跟进线索', 'No Shopping cues yet') }}</p>
        <p class="text-sm text-gray-600">
          {{ t('在 Shopping 中生成本地订单后，这里会出现可确认的配送或预约提醒。', 'Create a local Shopping order to see confirmable delivery or appointment reminders here.') }}
        </p>
      </section>

      <section class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs text-gray-500">{{ t('来自股票', 'From Stock') }}</p>
            <h2 class="font-semibold">{{ t('行情复盘线索', 'Market review cues') }}</h2>
          </div>
          <span class="rounded-full bg-amber-50 px-2 py-1 text-[11px] text-amber-600">
            {{ t(`${stockMarketCueCount} 条`, `${stockMarketCueCount} items`) }}
          </span>
        </div>
        <p class="mt-2 text-xs text-gray-500">
          {{
            t(
              'Stock 模拟标的出现明显波动后，会在这里形成可确认的复盘提醒；确认后进入日历事件和真实推送链路。',
              'Large simulated Stock moves become market review cues here; confirmed cues become Calendar events and real push schedules.',
            )
          }}
        </p>
      </section>

      <section v-if="visibleStockCues.length > 0" class="space-y-2">
        <CalendarStockCueCard
          v-for="cue in visibleStockCues"
          :key="cue.id"
          :cue="cue"
          :formatted-suggested-at="formatDateTime(cue.suggestedAt)"
          @confirm="confirmStockCue"
          @dismiss="dismissStockCue"
        />
      </section>

      <section v-else class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm">
        <p class="font-semibold mb-2">{{ t('暂无行情复盘线索', 'No market review cues yet') }}</p>
        <p class="text-sm text-gray-600">
          {{ t('在 Stock 中添加或更新明显波动的模拟标的后，这里会出现可确认的复盘提醒。', 'Add or update a simulated Stock asset with a large move to see review cues here.') }}
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
          <CalendarEventCard
            v-for="event in visibleCalendarEvents"
            :key="event.id"
            :event="event"
            :related-knowledge-points="getRelatedKnowledgePoints(eventKnowledgePoints, event.id)"
            :formatted-starts-at="formatDateTime(event.startsAt)"
            :formatted-input-starts-at="formatDateTimeInput(event.startsAt)"
            :is-time-edited="isEventTimeEdited(event)"
            :quick-shift-options="eventTimeQuickShiftOptions"
            :push-status-meta="getCalendarPushStatusMeta(event)"
            :push-detail="getCalendarPushDetail(event)"
            :push-history="getEventPushHistory(event)"
            :format-push-history-entry="formatPushHistoryEntry"
            :format-date-time="formatDateTime"
            @update-starts-at="updateEventStartsAt"
            @shift-starts-at="shiftEventStartsAt"
            @reset-starts-at="resetEventStartsAt"
            @open-worldbook="(pointIds) => openWorldBook({ pointIds })"
          />
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
