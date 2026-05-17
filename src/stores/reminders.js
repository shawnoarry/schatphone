import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useCalendarStore } from './calendar'
import { useMapStore } from './map'

const REMINDER_SOURCES = Object.freeze({
  MAP: 'map',
  PHONE: 'phone',
  SHOPPING: 'shopping',
  STOCK: 'stock',
})

const REMINDER_STATUS_DISMISSED = 'dismissed'
const REMINDER_STATUS_CONFIRMED = 'confirmed'

const toInt = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

const trimText = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized || fallback
}

const buildReminderKey = (source, id) => {
  const normalizedSource = trimText(source)
  const normalizedId = trimText(id)
  return normalizedSource && normalizedId ? `${normalizedSource}:${normalizedId}` : ''
}

const parseReminderKey = (key) => {
  const text = trimText(key)
  const separatorIndex = text.indexOf(':')
  if (separatorIndex <= 0) return { source: '', id: '' }
  return {
    source: text.slice(0, separatorIndex),
    id: text.slice(separatorIndex + 1),
  }
}

const getStatusRank = (item) => {
  if (item.pinned) return 0
  if (item.status === 'suggested' || item.status === 'draft') return 1
  if (item.status === REMINDER_STATUS_CONFIRMED) return 2
  return 3
}

const compareReminderItems = (a, b) => {
  const rankDelta = getStatusRank(a) - getStatusRank(b)
  if (rankDelta !== 0) return rankDelta
  const aDueAt = toInt(a.dueAt || a.suggestedAt, 0)
  const bDueAt = toInt(b.dueAt || b.suggestedAt, 0)
  if (aDueAt !== bDueAt) return aDueAt - bDueAt
  return toInt(b.updatedAt || b.createdAt, 0) - toInt(a.updatedAt || a.createdAt, 0)
}

export const useRemindersStore = defineStore('reminders', () => {
  const calendarStore = useCalendarStore()
  const mapStore = useMapStore()

  const normalizeMapReminder = (reminder = {}) => ({
    key: buildReminderKey(REMINDER_SOURCES.MAP, reminder.id),
    id: reminder.id,
    source: REMINDER_SOURCES.MAP,
    sourceLabelZh: '地图',
    sourceLabelEn: 'Map',
    sourceRoute: reminder.route || '/map',
    titleZh: reminder.titleZh || '地图跟进',
    titleEn: reminder.titleEn || 'Map follow-up',
    summaryZh: reminder.summaryZh || reminder.summaryEn || '',
    summaryEn: reminder.summaryEn || reminder.summaryZh || '',
    dueAt: toInt(reminder.dueAt, 0),
    status: reminder.status || 'suggested',
    pinned: reminder.pinned === true,
    icon: reminder.icon || 'fas fa-location-dot',
    tone: reminder.tone || 'blue',
    raw: reminder,
  })

  const normalizePhoneCue = (cue = {}) => ({
    key: buildReminderKey(REMINDER_SOURCES.PHONE, cue.id),
    id: cue.id,
    source: REMINDER_SOURCES.PHONE,
    sourceLabelZh: '电话',
    sourceLabelEn: 'Phone',
    sourceRoute: cue.route || '/phone',
    titleZh: `回拨 ${cue.contactName || ''}`.trim(),
    titleEn: `Call back ${cue.contactName || ''}`.trim(),
    summaryZh: cue.summary || '',
    summaryEn: cue.summary || '',
    dueAt: toInt(cue.suggestedAt, 0),
    status: cue.status || 'suggested',
    pinned: false,
    icon: cue.icon || 'fas fa-phone-slash',
    tone: cue.tone || 'rose',
    raw: cue,
  })

  const normalizeShoppingCue = (cue = {}) => ({
    key: buildReminderKey(REMINDER_SOURCES.SHOPPING, cue.id),
    id: cue.id,
    source: REMINDER_SOURCES.SHOPPING,
    sourceLabelZh: '购物',
    sourceLabelEn: 'Shopping',
    sourceRoute: cue.route || '/shopping',
    titleZh: `购物跟进：${cue.title || ''}`.trim(),
    titleEn: `Shopping follow-up: ${cue.title || ''}`.trim(),
    summaryZh: cue.summary || '',
    summaryEn: cue.summary || '',
    dueAt: toInt(cue.suggestedAt, 0),
    status: cue.status || 'suggested',
    pinned: false,
    icon: cue.icon || 'fas fa-truck-fast',
    tone: cue.tone || 'orange',
    raw: cue,
  })

  const normalizeStockCue = (cue = {}) => ({
    key: buildReminderKey(REMINDER_SOURCES.STOCK, cue.id),
    id: cue.id,
    source: REMINDER_SOURCES.STOCK,
    sourceLabelZh: '股票',
    sourceLabelEn: 'Stock',
    sourceRoute: cue.route || '/stock',
    titleZh: `复盘 ${cue.symbol || cue.name || ''}`.trim(),
    titleEn: `Review ${cue.symbol || cue.name || ''}`.trim(),
    summaryZh: cue.summary || '',
    summaryEn: cue.summary || '',
    dueAt: toInt(cue.suggestedAt, 0),
    status: cue.status || 'suggested',
    pinned: false,
    icon: cue.icon || 'fas fa-chart-line',
    tone: cue.tone || 'amber',
    raw: cue,
  })

  const mapReminderItems = computed(() =>
    mapStore.mapCalendarReminders
      .filter((reminder) => reminder.status !== REMINDER_STATUS_DISMISSED)
      .map(normalizeMapReminder),
  )

  const phoneReminderItems = computed(() =>
    calendarStore.activePhoneMissedCallCues.map(normalizePhoneCue),
  )

  const shoppingReminderItems = computed(() =>
    calendarStore.activeShoppingDeliveryCues.map(normalizeShoppingCue),
  )

  const stockReminderItems = computed(() =>
    calendarStore.activeStockMarketCues.map(normalizeStockCue),
  )

  const activeReminderItems = computed(() =>
    [
      ...mapReminderItems.value,
      ...phoneReminderItems.value,
      ...shoppingReminderItems.value,
      ...stockReminderItems.value,
    ]
      .filter((item) => item.key && item.status !== REMINDER_STATUS_DISMISSED)
      .sort(compareReminderItems),
  )

  const activeReminderCount = computed(() => activeReminderItems.value.length)
  const confirmedReminderCount = computed(
    () => activeReminderItems.value.filter((item) => item.status === REMINDER_STATUS_CONFIRMED).length,
  )
  const pinnedReminderCount = computed(
    () => activeReminderItems.value.filter((item) => item.pinned === true).length,
  )
  const suggestedReminderCount = computed(
    () => activeReminderCount.value - confirmedReminderCount.value,
  )
  const sourceCounts = computed(() =>
    activeReminderItems.value.reduce((counts, item) => {
      counts[item.source] = (counts[item.source] || 0) + 1
      return counts
    }, {}),
  )

  const findReminderByKey = (key) =>
    activeReminderItems.value.find((item) => item.key === key) || null

  const findMapReminderById = (reminderId) =>
    mapStore.mapCalendarReminders.find((item) => item.id === reminderId) || null

  const syncMapReminderEvent = (reminder = {}) => {
    if (!reminder?.id) return null
    if (reminder.status === REMINDER_STATUS_DISMISSED) {
      void calendarStore.cancelEventPushScheduledBySourceReminderId(reminder.id, {
        source: 'reminders_map_dismiss',
      })
      calendarStore.removeEventBySourceReminderId(reminder.id)
      return null
    }

    if (reminder.status === REMINDER_STATUS_CONFIRMED || reminder.pinned === true) {
      const event = calendarStore.upsertEventFromMapReminder(reminder)
      if (event?.id) {
        void calendarStore.ensureEventPushScheduled(event.id, {
          source: 'reminders_map_confirm',
        })
      }
      return event
    }

    void calendarStore.cancelEventPushScheduledBySourceReminderId(reminder.id, {
      source: 'reminders_map_remove',
    })
    calendarStore.removeEventBySourceReminderId(reminder.id)
    return null
  }

  const syncMapReminderEvents = () => {
    mapStore.mapCalendarReminders.forEach((reminder) => {
      syncMapReminderEvent(reminder)
    })
  }

  const confirmReminderByKey = (key) => {
    const { source, id } = parseReminderKey(key)
    if (!source || !id) return null

    if (source === REMINDER_SOURCES.MAP) {
      mapStore.confirmMapCalendarReminder(id)
      return syncMapReminderEvent(findMapReminderById(id))
    }

    const event =
      source === REMINDER_SOURCES.PHONE
        ? calendarStore.confirmPhoneMissedCallCue(id)
        : source === REMINDER_SOURCES.SHOPPING
          ? calendarStore.confirmShoppingDeliveryCue(id)
          : source === REMINDER_SOURCES.STOCK
            ? calendarStore.confirmStockMarketCue(id)
            : null

    if (event?.id) {
      void calendarStore.ensureEventPushScheduled(event.id, {
        source: `reminders_${source}_confirm`,
      })
    }
    return event
  }

  const dismissReminderByKey = (key) => {
    const { source, id } = parseReminderKey(key)
    if (!source || !id) return false

    if (source === REMINDER_SOURCES.MAP) {
      void calendarStore.cancelEventPushScheduledBySourceReminderId(id, {
        source: 'reminders_map_dismiss',
      })
      mapStore.dismissMapCalendarReminder(id)
      calendarStore.removeEventBySourceReminderId(id)
      return true
    }

    if (source === REMINDER_SOURCES.PHONE) return calendarStore.dismissPhoneMissedCallCue(id)
    if (source === REMINDER_SOURCES.SHOPPING) return calendarStore.dismissShoppingDeliveryCue(id)
    if (source === REMINDER_SOURCES.STOCK) return calendarStore.dismissStockMarketCue(id)
    return false
  }

  const toggleMapReminderPinByKey = (key) => {
    const { source, id } = parseReminderKey(key)
    if (source !== REMINDER_SOURCES.MAP || !id) return false
    const reminder = findMapReminderById(id)
    if (!reminder) return false
    const updated = mapStore.setMapCalendarReminderPinned(id, reminder.pinned !== true)
    if (!updated) return false
    syncMapReminderEvent(findMapReminderById(id))
    return true
  }

  return {
    activeReminderItems,
    activeReminderCount,
    confirmedReminderCount,
    pinnedReminderCount,
    suggestedReminderCount,
    sourceCounts,
    findReminderByKey,
    syncMapReminderEvent,
    syncMapReminderEvents,
    confirmReminderByKey,
    dismissReminderByKey,
    toggleMapReminderPinByKey,
  }
})
