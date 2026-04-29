<script setup>
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useCalendarStore } from '../stores/calendar'
import { useMapStore } from '../stores/map'

const router = useRouter()
const { t } = useI18n()
const calendarStore = useCalendarStore()
const mapStore = useMapStore()
const { upcomingEvents } = storeToRefs(calendarStore)
const { mapCalendarReminders, mapAreaFeedback } = storeToRefs(mapStore)

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

const goHome = () => {
  router.push('/home')
}

const openMap = () => {
  router.push('/map')
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

        <div class="mt-3 space-y-2">
          <article
            v-for="event in visibleCalendarEvents"
            :key="event.id"
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
              <p v-if="event.scheduledPushId" class="text-[11px] text-emerald-600">
                {{ t('已安排真实推送', 'Push scheduled') }}
              </p>
              <p v-else-if="event.lastPushError" class="text-[11px] text-rose-500">
                {{ t('推送排程失败', 'Push schedule failed') }}
              </p>
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
