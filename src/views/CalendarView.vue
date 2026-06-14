<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useSystemNotifications } from '../composables/useSystemNotifications'
import { useCalendarStore } from '../stores/calendar'
import { useChatStore } from '../stores/chat'
import { useMapStore } from '../stores/map'
import { useRemindersStore } from '../stores/reminders'
import { useSystemStore } from '../stores/system'
import { buildWorldBookRouteQuery } from '../lib/worldbook-navigation'
import { pushReturnTarget } from '../lib/navigation-return'
import { RELATIONSHIP_FACT_SOURCE_KEYS } from '../lib/relationship-fact-adapters'
import { resolveWorldAppUxContext } from '../lib/world-pack-app-bindings'
import CalendarEventCard from '../components/calendar/CalendarEventCard.vue'
import { useRelationshipRuntimeStore } from '../stores/relationshipRuntime'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const calendarStore = useCalendarStore()
const chatStore = useChatStore()
const mapStore = useMapStore()
const remindersStore = useRemindersStore()
const systemStore = useSystemStore()
const relationshipRuntimeStore = useRelationshipRuntimeStore()
const systemNotifications = useSystemNotifications({ systemStore })
const { upcomingEvents } = storeToRefs(calendarStore)
const { activeReminderItems } = storeToRefs(remindersStore)
const { mapCalendarReminders, mapAreaFeedback } = storeToRefs(mapStore)
const { settings } = storeToRefs(systemStore)
const calendarRelationshipDrafts = ref({})
const relationshipFeedbackByEventId = ref({})

const visibleCalendarEvents = computed(() => upcomingEvents.value.slice(0, 4))
const calendarEventCount = computed(() => upcomingEvents.value.length)
const calendarWorldAppContext = computed(() =>
  resolveWorldAppUxContext({
    systemStore,
    moduleKey: 'calendar',
    routeQuery: route.query,
    expectedArchetypes: ['reservation'],
  }),
)
const calendarTitle = computed(() => calendarWorldAppContext.value?.bindingTitle || t('日历', 'Calendar'))
const calendarOverviewEyebrow = computed(
  () =>
    calendarWorldAppContext.value?.packName ||
    calendarWorldAppContext.value?.packTitle ||
    t('日程中心', 'Schedule center'),
)
const calendarOverviewTitle = computed(
  () =>
    calendarWorldAppContext.value?.bindingTitle ||
    t('已确认的事项在这里排程。', 'Confirmed items are scheduled here.'),
)
const calendarOverviewDescription = computed(() => {
  if (calendarWorldAppContext.value) return calendarWorldAppContext.value.boundaryCopy
  return t(
    '未确认线索先进入提醒事项；进入日历后才会显示时间、调整排程并安排真实推送。',
    'Unconfirmed cues go to Reminders first; Calendar shows timed events, edits, and real push scheduling.',
  )
})
const calendarOverviewClass = computed(() =>
  calendarWorldAppContext.value
    ? 'bg-cyan-50/70 border-cyan-100 shadow-sm'
    : 'bg-white border-gray-200 shadow-sm',
)
const calendarOverviewEyebrowClass = computed(() =>
  calendarWorldAppContext.value ? 'text-cyan-600' : 'text-blue-500',
)
const pendingReminderItems = computed(() =>
  activeReminderItems.value.filter((item) => item.status !== 'confirmed' && item.pinned !== true),
)
const pendingReminderCount = computed(() => pendingReminderItems.value.length)
const pendingReminderSourceCounts = computed(() =>
  pendingReminderItems.value.reduce((counts, item) => {
    counts[item.source] = (counts[item.source] || 0) + 1
    return counts
  }, {}),
)
const reminderSummaryItems = computed(() => [
  {
    key: 'map',
    labelZh: '地图',
    labelEn: 'Map',
    count: pendingReminderSourceCounts.value.map || 0,
    className: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'phone',
    labelZh: '电话',
    labelEn: 'Phone',
    count: pendingReminderSourceCounts.value.phone || 0,
    className: 'bg-rose-50 text-rose-600',
  },
  {
    key: 'shopping',
    labelZh: '购物',
    labelEn: 'Shopping',
    count: pendingReminderSourceCounts.value.shopping || 0,
    className: 'bg-orange-50 text-orange-600',
  },
  {
    key: 'stock',
    labelZh: '股票',
    labelEn: 'Stock',
    count: pendingReminderSourceCounts.value.stock || 0,
    className: 'bg-amber-50 text-amber-600',
  },
])
const eventTimeQuickShiftOptions = [
  { key: 'plus_hour', labelZh: '+1 小时', labelEn: '+1h', offsetMs: 60 * 60 * 1000 },
  { key: 'plus_day', labelZh: '+1 天', labelEn: '+1d', offsetMs: 24 * 60 * 60 * 1000 },
]
const relationshipContactOptions = computed(() =>
  chatStore.contacts
    .filter((contact) => contact.kind !== 'service' && contact.kind !== 'official')
    .map((contact) => ({
      ...contact,
      optionValue: String(contact.id),
      optionLabel: contact.name || `Contact ${contact.id}`,
    })),
)

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

  if (!systemNotifications.notificationEnabled.value) {
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

const eventKnowledgePoints = computed(() =>
  buildRelatedKnowledgePointIndex(visibleCalendarEvents.value),
)

const getRelatedKnowledgePoints = (collection, itemId) => {
  const source = collection?.value ?? collection ?? {}
  return source[itemId] || []
}

const getSelectedRelationshipContact = (eventId) => {
  const selectedId = String(calendarRelationshipDrafts.value[eventId] || '')
  if (!selectedId) return null
  return relationshipContactOptions.value.find((contact) => contact.optionValue === selectedId) || null
}

const getEventRelationshipSuggestion = (event) =>
  calendarStore.buildEventRelationshipSuggestion(
    event?.id,
    event?.id ? getSelectedRelationshipContact(event.id) : null,
  )

const calendarSourceLabel = (event = {}) => {
  if (event.source === 'map_calendar_reminder') return t('Map follow-up', 'Map follow-up')
  if (event.source === 'phone_missed_call') return t('Phone callback', 'Phone callback')
  if (event.source === 'shopping_delivery') return t('Shopping delivery', 'Shopping delivery')
  if (event.source === 'stock_market_move') return t('Stock review', 'Stock review')
  return t('Manual calendar event', 'Manual calendar event')
}

const buildCalendarEventLineageNotes = (event = {}) => [
  event.sourceReminderId ? t(`提醒来源：${event.sourceReminderId}`, `Reminder source: ${event.sourceReminderId}`) : '',
  event.sourceTripId ? t(`路线来源：${event.sourceTripId}`, `Route source: ${event.sourceTripId}`) : '',
  event.sourceAreaId ? t(`地点来源：${event.sourceAreaId}`, `Area source: ${event.sourceAreaId}`) : '',
].filter(Boolean)

const getCalendarEventRelationshipReview = (event) => {
  if (!event?.id) return null
  const facts = relationshipRuntimeStore.listRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.CALENDAR_CONFIRMED_EVENT,
    event.id,
    3,
  )
  const fact = facts[0] || null
  const summary = fact
    ? relationshipRuntimeStore.summarizeEntityForTarget({ entityKey: fact.entityKey }, {
        eventLimit: 3,
        memoryLimit: 3,
      })
    : null
  const memory =
    fact?.memoryKey && Array.isArray(summary?.memorySummaries)
      ? summary.memorySummaries.find((item) => item.memoryKey === fact.memoryKey) || null
      : null
  const binding = event.relationshipBinding || {}
  const targetName = fact?.targetLabel || binding.name || ''
  const notes = [
    ...buildCalendarEventLineageNotes(event),
    fact
      ? fact.effectApplied === false
        ? t('作为补充记录加入同一段记忆；不重复增加关系数值。', 'Supporting record in the same memory; no duplicate relationship growth.')
        : t('已作为主要日程记忆计入关系进展。', 'Applied as the primary calendar relationship memory.')
      : t('确认联系人后可写入关系记忆。', 'Choose a contact to record this as relationship memory.'),
  ].filter(Boolean)
  return {
    sourceLabel: calendarSourceLabel(event),
    targetName,
    memoryKey: fact?.memoryKey || '',
    memoryRole: fact?.memoryRole || '',
    effectApplied: fact?.effectApplied === true,
    imported: Boolean(fact),
    recallSummary: memory?.recallSummary || memory?.displaySummary || fact?.summary || '',
    notes,
  }
}

const getRelationshipFeedbackForEvent = (eventId) => relationshipFeedbackByEventId.value[eventId] || null

const setRelationshipFeedbackForEvent = (eventId, feedback = null) => {
  if (!eventId) return
  const nextFeedback = { ...relationshipFeedbackByEventId.value }
  if (feedback) {
    nextFeedback[eventId] = feedback
  } else {
    delete nextFeedback[eventId]
  }
  relationshipFeedbackByEventId.value = nextFeedback
}

const setEventRelationshipContact = (event, contactId) => {
  if (!event?.id) return
  calendarRelationshipDrafts.value = {
    ...calendarRelationshipDrafts.value,
    [event.id]: String(contactId || ''),
  }
  setRelationshipFeedbackForEvent(event.id, null)
}

const recordEventRelationship = (event) => {
  if (!event?.id) return
  const target = getSelectedRelationshipContact(event.id)
  if (!target) {
    setRelationshipFeedbackForEvent(event.id, {
      type: 'warning',
      className: 'text-amber-600',
      messageZh: 'Select a relationship contact first.',
      messageEn: 'Select a relationship contact first.',
    })
    return
  }

  const suggestion = calendarStore.buildEventRelationshipSuggestion(event.id, target)
  if (suggestion.imported) {
    setRelationshipFeedbackForEvent(event.id, {
      type: 'success',
      className: 'text-emerald-600',
      messageZh: 'Relationship fact already recorded.',
      messageEn: 'Relationship fact already recorded.',
    })
    return
  }

  const fact = calendarStore.recordEventRelationshipFact(event.id, target)
  setRelationshipFeedbackForEvent(
    event.id,
    fact
      ? {
          type: 'success',
          className: 'text-emerald-600',
          messageZh: 'Relationship fact recorded.',
          messageEn: 'Relationship fact recorded.',
        }
      : {
          type: 'warning',
          className: 'text-amber-600',
          messageZh: 'This event cannot be recorded as a relationship fact.',
          messageEn: 'This event cannot be recorded as a relationship fact.',
        },
  )
}

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

const deleteCalendarEvent = (event) => {
  if (!event?.id) return
  if (event.sourceReminderId) {
    void calendarStore.cancelEventPushScheduledBySourceReminderId(event.sourceReminderId, {
      source: 'calendar_event_delete',
    })
  } else {
    void calendarStore.cancelEventPushScheduled({
      eventId: event.id,
      source: 'calendar_event_delete',
    })
  }
  if (!calendarStore.removeEventById(event.id)) return
  relationshipRuntimeStore.removeRelationshipFactsForSourceRecord(
    RELATIONSHIP_FACT_SOURCE_KEYS.CALENDAR_CONFIRMED_EVENT,
    event.id,
  )
  const nextDrafts = { ...calendarRelationshipDrafts.value }
  delete nextDrafts[event.id]
  calendarRelationshipDrafts.value = nextDrafts
  setRelationshipFeedbackForEvent(event.id, null)
}

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
      <h1 class="font-bold">{{ calendarTitle }}</h1>
    </div>

    <div class="flex-1 px-5 py-6 space-y-4 overflow-y-auto">
      <section
        class="rounded-lg border p-4"
        :class="calendarOverviewClass"
        data-testid="calendar-schedule-overview"
      >
        <p class="text-xs font-semibold uppercase tracking-wide" :class="calendarOverviewEyebrowClass">
          {{ calendarOverviewEyebrow }}
        </p>
        <h2 class="mt-2 text-lg font-bold text-gray-950">
          {{ calendarOverviewTitle }}
        </h2>
        <p class="mt-2 text-xs leading-5 text-gray-500">
          {{ calendarOverviewDescription }}
        </p>

        <div
          v-if="calendarWorldAppContext"
          class="mt-3 rounded-lg border border-cyan-100 bg-white/80 p-3"
          data-testid="calendar-world-app-context"
          :data-world-pack="calendarWorldAppContext.packId"
          :data-world-app="calendarWorldAppContext.bindingId"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2">
              <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-50 text-cyan-600">
                <i :class="calendarWorldAppContext.icon"></i>
              </span>
              <div class="min-w-0">
                <p class="truncate text-xs font-semibold text-gray-900">
                  {{ calendarWorldAppContext.bindingTitle }}
                </p>
                <p class="text-[11px] text-gray-500">{{ calendarWorldAppContext.targetLabel }}</p>
              </div>
            </div>
            <span class="shrink-0 rounded-full bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-700">
              {{ calendarWorldAppContext.archetype }}
            </span>
          </div>
          <p class="mt-2 text-[11px] leading-5 text-gray-500">
            {{ calendarWorldAppContext.description || calendarWorldAppContext.boundaryCopy }}
          </p>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-2">
          <div class="rounded-lg bg-blue-50 px-3 py-2">
            <p class="text-[10px] text-blue-500">{{ t('日程', 'Events') }}</p>
            <strong class="text-lg text-blue-700">{{ calendarEventCount }}</strong>
          </div>
          <div class="rounded-lg bg-orange-50 px-3 py-2">
            <p class="text-[10px] text-orange-500">{{ t('待处理', 'Pending') }}</p>
            <strong class="text-lg text-orange-700">{{ pendingReminderCount }}</strong>
          </div>
          <div class="rounded-lg px-3 py-2" :class="calendarPushRuntime.toneClass">
            <p class="text-[10px] opacity-80">{{ t('推送', 'Push') }}</p>
            <strong class="text-sm">{{ t(calendarPushRuntime.labelZh, calendarPushRuntime.labelEn) }}</strong>
          </div>
        </div>
      </section>

      <section class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm" data-testid="calendar-reminder-summary">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs text-gray-500">{{ t('提醒事项', 'Reminders') }}</p>
            <h2 class="font-semibold">{{ t('待处理线索', 'Pending cues') }}</h2>
          </div>
          <button
            class="rounded-full bg-orange-500 px-3 py-2 text-xs font-semibold text-white"
            data-testid="calendar-open-reminders"
            @click="openReminders"
          >
            {{ t('打开提醒事项', 'Open Reminders') }}
          </button>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div
            v-for="source in reminderSummaryItems"
            :key="source.key"
            class="rounded-lg border border-gray-100 px-3 py-2"
            :data-testid="`calendar-reminder-source-${source.key}`"
          >
            <p class="text-[11px] text-gray-500">{{ t(source.labelZh, source.labelEn) }}</p>
            <strong class="text-base" :class="source.className">{{ source.count }}</strong>
          </div>
        </div>
        <p class="mt-3 text-xs leading-5 text-gray-500">
          {{
            pendingReminderCount > 0
              ? t('确认、固定或忽略都在提醒事项里处理。', 'Confirm, pin, or dismiss them in Reminders.')
              : t('暂无待处理提醒事项。', 'No pending reminders.')
          }}
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
            :relationship-contact-options="relationshipContactOptions"
            :selected-relationship-contact-id="calendarRelationshipDrafts[event.id] || ''"
            :relationship-suggestion="getEventRelationshipSuggestion(event)"
            :relationship-review="getCalendarEventRelationshipReview(event)"
            :relationship-feedback="getRelationshipFeedbackForEvent(event.id)"
            :format-push-history-entry="formatPushHistoryEntry"
            :format-date-time="formatDateTime"
            @update-starts-at="updateEventStartsAt"
            @shift-starts-at="shiftEventStartsAt"
            @reset-starts-at="resetEventStartsAt"
            @delete-event="deleteCalendarEvent"
            @open-worldbook="(pointIds) => openWorldBook({ pointIds })"
            @update-relationship-contact="setEventRelationshipContact"
            @record-relationship="recordEventRelationship"
          />
        </div>
      </section>

      <section v-else class="rounded-lg bg-white border border-gray-200 p-4 shadow-sm" data-testid="calendar-empty-events">
        <p class="font-semibold">{{ t('暂无已确认日程', 'No confirmed events yet') }}</p>
        <p class="mt-2 text-sm leading-6 text-gray-600">
          {{ t('到提醒事项中确认线索后，它们会出现在这里。', 'Confirm cues in Reminders, and they will appear here.') }}
        </p>
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
