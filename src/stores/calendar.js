import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import {
  cancelScheduledPushNotification,
  schedulePushNotification,
} from '../lib/push'
import {
  buildCalendarConfirmedEventRelationshipSuggestion,
  recordCalendarConfirmedEventRelationshipFact,
} from '../lib/relationship-fact-adapters'
import {
  anonymizeRelationshipText,
  anonymizeRelationshipTextByBinding,
  bindingMatchesProfile,
  clearRelationshipBinding,
  normalizeRelationshipBinding,
} from '../lib/relationship-cleanup-helpers'
import { SHOPPING_SOURCE_KEYS } from '../lib/planned-module-registry'
import { useRemindersStore } from './reminders'
import { useChatStore } from './chat'
import { useRelationshipRuntimeStore } from './relationshipRuntime'
import { useSystemStore } from './system'

const CALENDAR_STORAGE_KEY = 'store:calendar'
const CALENDAR_STORAGE_VERSION = 1
const CALENDAR_EVENT_LIMIT = 120
const CALENDAR_EVENT_PUSH_HISTORY_LIMIT = 6
const CALENDAR_EVENT_STATUS_CONFIRMED = 'confirmed'
const CALENDAR_EVENT_STATUS_CANCELLED = 'cancelled'
const CALENDAR_EVENT_STATUSES = new Set([
  CALENDAR_EVENT_STATUS_CONFIRMED,
  CALENDAR_EVENT_STATUS_CANCELLED,
])
const CALENDAR_EVENT_PUSH_STATUSES = new Set([
  'idle',
  'scheduled',
  'failed',
  'cancelled',
  'cancel_failed',
  'needs_reschedule',
])

const toInt = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

const trimLine = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeEventId = (value) => trimLine(value, '', 140)

const normalizeCalendarEventStatus = (value, fallback = CALENDAR_EVENT_STATUS_CONFIRMED) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (CALENDAR_EVENT_STATUSES.has(normalized)) return normalized
  return fallback
}

const normalizeCalendarEventPushStatus = (value, fallback = 'idle') => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (CALENDAR_EVENT_PUSH_STATUSES.has(normalized)) return normalized
  return fallback
}

const createCalendarEventIdFromReminder = (reminderId) => {
  const normalizedReminderId = normalizeEventId(reminderId)
  return normalizedReminderId ? `calendar_event_${normalizedReminderId}` : ''
}

const createCalendarEventIdFromPhoneCue = (cueId) => {
  const normalizedCueId = normalizeEventId(cueId)
  return normalizedCueId ? `calendar_event_${normalizedCueId}` : ''
}

const createCalendarEventIdFromStockCue = (cueId) => {
  const normalizedCueId = normalizeEventId(cueId)
  return normalizedCueId ? `calendar_event_${normalizedCueId}` : ''
}

const createCalendarEventIdFromShoppingCue = (cueId) => {
  const normalizedCueId = normalizeEventId(cueId)
  return normalizedCueId ? `calendar_event_${normalizedCueId}` : ''
}

const createCalendarEventScheduleId = (eventId) => {
  const normalizedEventId = normalizeEventId(eventId)
  return normalizedEventId ? `calendar_event_push_${normalizedEventId}` : ''
}

const normalizeCalendarEventPushHistory = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const action = trimLine(item.action, '', 40)
      const status = trimLine(item.status, '', 40)
      const createdAt = Math.max(0, toInt(item.createdAt, 0))
      if (!action || !status || !createdAt) return null
      return {
        action,
        status,
        source: trimLine(item.source, '', 80),
        scheduleId: trimLine(item.scheduleId, '', 140),
        deliverAt: Math.max(0, toInt(item.deliverAt, 0)),
        reason: trimLine(item.reason, '', 120),
        message: trimLine(item.message, '', 160),
        createdAt,
      }
    })
    .filter(Boolean)
    .slice(0, CALENDAR_EVENT_PUSH_HISTORY_LIMIT)
}

const normalizeCalendarEventRecord = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const startsAt = Math.max(0, toInt(raw.startsAt ?? raw.dueAt, 0))
  const originalStartsAt = Math.max(0, toInt(raw.originalStartsAt ?? startsAt, startsAt))
  const id =
    normalizeEventId(raw.id) ||
    createCalendarEventIdFromReminder(raw.sourceReminderId) ||
    `calendar_event_legacy_${startsAt || Date.now()}_${index}`
  const titleEn = trimLine(raw.titleEn, '', 100)
  const titleZh = trimLine(raw.titleZh, titleEn || '日历事件', 100)
  if (!id || !titleZh) return null

  return {
    id,
    source: trimLine(raw.source, 'manual', 80),
    sourceReminderId: normalizeEventId(raw.sourceReminderId),
    sourceAreaId: normalizeEventId(raw.sourceAreaId || raw.areaId),
    sourceTripId: normalizeEventId(raw.sourceTripId || raw.tripId),
    relationshipBinding: normalizeRelationshipBinding(raw.relationshipBinding),
    titleZh,
    titleEn: titleEn || titleZh,
    summaryZh: trimLine(raw.summaryZh, '', 240),
    summaryEn: trimLine(raw.summaryEn, '', 240),
    startsAt,
    originalStartsAt,
    timeEditedAt: Math.max(0, toInt(raw.timeEditedAt, 0)),
    status: normalizeCalendarEventStatus(raw.status),
    pinned: raw.pinned === true,
    route: trimLine(raw.route, '', 120),
    icon: trimLine(raw.icon, 'fas fa-calendar-day', 80),
    tone: trimLine(raw.tone, 'blue', 40),
    scheduledPushId: trimLine(raw.scheduledPushId, '', 140),
    scheduledPushAt: Math.max(0, toInt(raw.scheduledPushAt, 0)),
    pushStatus: normalizeCalendarEventPushStatus(raw.pushStatus),
    pushUpdatedAt: Math.max(0, toInt(raw.pushUpdatedAt, 0)),
    lastPushScheduledAt: Math.max(0, toInt(raw.lastPushScheduledAt, 0)),
    lastPushCancelledAt: Math.max(0, toInt(raw.lastPushCancelledAt, 0)),
    lastPushError: trimLine(raw.lastPushError, '', 120),
    pushHistory: normalizeCalendarEventPushHistory(raw.pushHistory),
    createdAt: Math.max(0, toInt(raw.createdAt, 0)),
    updatedAt: Math.max(0, toInt(raw.updatedAt, 0)),
  }
}

const normalizeCalendarEvents = (raw) => {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => normalizeCalendarEventRecord(item, index))
    .filter(Boolean)
    .slice(0, CALENDAR_EVENT_LIMIT)
}

const sortCalendarEvents = (items = []) =>
  [...items].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === CALENDAR_EVENT_STATUS_CONFIRMED) return -1
      if (b.status === CALENDAR_EVENT_STATUS_CONFIRMED) return 1
    }
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (a.startsAt !== b.startsAt) return a.startsAt - b.startsAt
    return b.updatedAt - a.updatedAt
  })

export const useCalendarStore = defineStore('calendar', () => {
  const getSystemStore = () => useSystemStore()
  const getRemindersStore = () => useRemindersStore()
  const getRelationshipRuntimeStore = () => useRelationshipRuntimeStore()
  const events = ref([])
  const hasFinishedStorageHydration = ref(false)
  const eventPushSchedulePromises = new Map()
  const eventPushCancelPromises = new Map()

  const upcomingEvents = computed(() =>
    sortCalendarEvents(
      events.value.filter((event) => event.status === CALENDAR_EVENT_STATUS_CONFIRMED),
    ),
  )

  const eventCount = computed(() => events.value.length)

  const phoneMissedCallCues = computed(() => getRemindersStore().phoneMissedCallCues)
  const stockMarketCues = computed(() => getRemindersStore().stockMarketCues)
  const shoppingDeliveryCues = computed(() => getRemindersStore().shoppingDeliveryCues)
  const activePhoneMissedCallCues = computed(() => getRemindersStore().activePhoneMissedCallCues)

  const phoneMissedCallCueCount = computed(() => getRemindersStore().phoneMissedCallCueCount)

  const activeStockMarketCues = computed(() => getRemindersStore().activeStockMarketCues)

  const stockMarketCueCount = computed(() => getRemindersStore().stockMarketCueCount)

  const activeShoppingDeliveryCues = computed(() => getRemindersStore().activeShoppingDeliveryCues)

  const shoppingDeliveryCueCount = computed(() => getRemindersStore().shoppingDeliveryCueCount)

  const findEventById = (eventId) => {
    const id = normalizeEventId(eventId)
    if (!id) return null
    return events.value.find((event) => event.id === id) || null
  }

  const findEventBySourceReminderId = (reminderId) => {
    const sourceReminderId = normalizeEventId(reminderId)
    if (!sourceReminderId) return null
    return events.value.find((event) => event.sourceReminderId === sourceReminderId) || null
  }

  const findPhoneMissedCallCueById = (cueId) => {
    const id = normalizeEventId(cueId)
    if (!id) return null
    return getRemindersStore().findPhoneMissedCallCueById(id)
  }

  const findPhoneMissedCallCueByCallId = (callId) => {
    const normalizedCallId = normalizeEventId(callId)
    if (!normalizedCallId) return null
    return getRemindersStore().findPhoneMissedCallCueByCallId(normalizedCallId)
  }

  const findStockMarketCueById = (cueId) => {
    const id = normalizeEventId(cueId)
    if (!id) return null
    return getRemindersStore().findStockMarketCueById(id)
  }

  const findStockMarketCueByStockId = (stockId) => {
    const normalizedStockId = normalizeEventId(stockId)
    if (!normalizedStockId) return null
    return getRemindersStore().findStockMarketCueByStockId(normalizedStockId)
  }

  const findShoppingDeliveryCueById = (cueId) => {
    const id = normalizeEventId(cueId)
    if (!id) return null
    return getRemindersStore().findShoppingDeliveryCueById(id)
  }

  const findShoppingDeliveryCueByOrderId = (orderId) => {
    const normalizedOrderId = normalizeEventId(orderId)
    if (!normalizedOrderId) return null
    return getRemindersStore().findShoppingDeliveryCueByOrderId(normalizedOrderId)
  }

  const upsertEvent = (rawEvent = {}) => {
    const now = Date.now()
    const normalized = normalizeCalendarEventRecord(
      {
        ...rawEvent,
        createdAt: rawEvent.createdAt || now,
        updatedAt: now,
      },
      events.value.length,
    )
    if (!normalized) return null

    const index = events.value.findIndex((event) => event.id === normalized.id)
    if (index >= 0) {
      const existing = events.value[index]
      events.value.splice(index, 1, {
        ...existing,
        ...normalized,
        createdAt: existing.createdAt || normalized.createdAt,
      })
    } else {
      events.value.unshift(normalized)
      if (events.value.length > CALENDAR_EVENT_LIMIT) {
        events.value.splice(CALENDAR_EVENT_LIMIT)
      }
    }
    return findEventById(normalized.id)
  }

  const upsertEventFromMapReminder = (reminder = {}) => {
    const reminderId = normalizeEventId(reminder.id)
    if (!reminderId) return null
    const eventId = createCalendarEventIdFromReminder(reminderId)
    const existing = findEventById(eventId)
    const reminderStartsAt = Math.max(0, toInt(reminder.dueAt, 0))
    const hasEditedTime = Math.max(0, toInt(existing?.timeEditedAt, 0)) > 0
    return upsertEvent({
      id: eventId,
      source: 'map_calendar_reminder',
      sourceReminderId: reminderId,
      sourceAreaId: reminder.areaId || '',
      sourceTripId: reminder.sourceTripId || reminder.tripId || '',
      titleZh: reminder.titleZh || '地图提醒',
      titleEn: reminder.titleEn || 'Map reminder',
      summaryZh: reminder.summaryZh || '',
      summaryEn: reminder.summaryEn || '',
      startsAt: hasEditedTime ? existing.startsAt : reminderStartsAt,
      originalStartsAt: existing?.originalStartsAt || reminderStartsAt,
      timeEditedAt: existing?.timeEditedAt || 0,
      status: CALENDAR_EVENT_STATUS_CONFIRMED,
      pinned: reminder.pinned === true,
      route: reminder.route || '/map',
      icon: reminder.icon || 'fas fa-location-dot',
      tone: reminder.tone || 'blue',
      scheduledPushId: existing?.scheduledPushId || '',
      scheduledPushAt: existing?.scheduledPushAt || 0,
      pushStatus: existing?.pushStatus || 'idle',
      pushUpdatedAt: existing?.pushUpdatedAt || 0,
      lastPushScheduledAt: existing?.lastPushScheduledAt || 0,
      lastPushCancelledAt: existing?.lastPushCancelledAt || 0,
      lastPushError: existing?.lastPushError || '',
      pushHistory: existing?.pushHistory || [],
    })
  }

  const upsertPhoneMissedCallCue = (input = {}) => {
    return getRemindersStore().upsertPhoneMissedCallCue(input)
  }

  const upsertPhoneMissedCallCueFromCall = (call = {}) => {
    return getRemindersStore().upsertPhoneMissedCallCueFromCall(call)
  }

  const upsertEventFromPhoneMissedCallCue = (cue = {}) => {
    const cueId = normalizeEventId(cue.id)
    if (!cueId) return null
    const eventId = createCalendarEventIdFromPhoneCue(cueId)
    const existing = findEventById(eventId)
    const suggestedAt = Math.max(0, toInt(cue.suggestedAt, Date.now() + 30 * 60 * 1000))
    const hasEditedTime = Math.max(0, toInt(existing?.timeEditedAt, 0)) > 0
    return upsertEvent({
      id: eventId,
      source: 'phone_missed_call',
      sourceReminderId: cueId,
      sourceAreaId: '',
      titleZh: `回拨 ${cue.contactName}`,
      titleEn: `Call back ${cue.contactName}`,
      summaryZh: cue.summary || `${cue.contactName} 有一通未接来电。`,
      summaryEn: cue.summary || `${cue.contactName} left a missed call.`,
      startsAt: hasEditedTime ? existing.startsAt : suggestedAt,
      originalStartsAt: existing?.originalStartsAt || suggestedAt,
      timeEditedAt: existing?.timeEditedAt || 0,
      status: CALENDAR_EVENT_STATUS_CONFIRMED,
      pinned: false,
      route: '/phone',
      icon: 'fas fa-phone-slash',
      tone: cue.tone || 'rose',
      scheduledPushId: existing?.scheduledPushId || '',
      scheduledPushAt: existing?.scheduledPushAt || 0,
      pushStatus: existing?.pushStatus || 'idle',
      pushUpdatedAt: existing?.pushUpdatedAt || 0,
      lastPushScheduledAt: existing?.lastPushScheduledAt || 0,
      lastPushCancelledAt: existing?.lastPushCancelledAt || 0,
      lastPushError: existing?.lastPushError || '',
      pushHistory: existing?.pushHistory || [],
    })
  }

  const upsertStockMarketCue = (input = {}) => {
    return getRemindersStore().upsertStockMarketCue(input)
  }

  const upsertStockMarketCueFromStock = (stock = {}) => {
    return getRemindersStore().upsertStockMarketCueFromStock(stock)
  }

  const upsertEventFromStockMarketCue = (cue = {}) => {
    const cueId = normalizeEventId(cue.id)
    if (!cueId) return null
    const eventId = createCalendarEventIdFromStockCue(cueId)
    const existing = findEventById(eventId)
    const suggestedAt = Math.max(0, toInt(cue.suggestedAt, Date.now() + 2 * 60 * 60 * 1000))
    const hasEditedTime = Math.max(0, toInt(existing?.timeEditedAt, 0)) > 0
    const absChange = Math.abs(Number(cue.changePercent) || 0).toFixed(2)
    const directionZh = Number(cue.changePercent) >= 0 ? '上涨' : '下跌'
    const directionEn = Number(cue.changePercent) >= 0 ? 'up' : 'down'
    return upsertEvent({
      id: eventId,
      source: 'stock_market_move',
      sourceReminderId: cueId,
      sourceAreaId: '',
      titleZh: `复盘 ${cue.symbol || cue.name}`,
      titleEn: `Review ${cue.symbol || cue.name}`,
      summaryZh: cue.summary || `${cue.name || cue.symbol} ${directionZh} ${absChange}%，建议稍后复盘。`,
      summaryEn: cue.summary || `${cue.name || cue.symbol} is ${directionEn} ${absChange}%; review it later.`,
      startsAt: hasEditedTime ? existing.startsAt : suggestedAt,
      originalStartsAt: existing?.originalStartsAt || suggestedAt,
      timeEditedAt: existing?.timeEditedAt || 0,
      status: CALENDAR_EVENT_STATUS_CONFIRMED,
      pinned: false,
      route: '/stock',
      icon: 'fas fa-chart-line',
      tone: cue.tone || (Number(cue.changePercent) >= 0 ? 'red' : 'emerald'),
      scheduledPushId: existing?.scheduledPushId || '',
      scheduledPushAt: existing?.scheduledPushAt || 0,
      pushStatus: existing?.pushStatus || 'idle',
      pushUpdatedAt: existing?.pushUpdatedAt || 0,
      lastPushScheduledAt: existing?.lastPushScheduledAt || 0,
      lastPushCancelledAt: existing?.lastPushCancelledAt || 0,
      lastPushError: existing?.lastPushError || '',
      pushHistory: existing?.pushHistory || [],
    })
  }

  const upsertShoppingDeliveryCue = (input = {}) => {
    return getRemindersStore().upsertShoppingDeliveryCue(input)
  }

  const upsertShoppingDeliveryCueFromOrder = (order = {}) => {
    return getRemindersStore().upsertShoppingDeliveryCueFromOrder(order)
  }

  const upsertEventFromShoppingDeliveryCue = (cue = {}) => {
    const cueId = normalizeEventId(cue.id)
    if (!cueId) return null
    const eventId = createCalendarEventIdFromShoppingCue(cueId)
    const existing = findEventById(eventId)
    const suggestedAt = Math.max(0, toInt(cue.suggestedAt, Date.now() + 24 * 60 * 60 * 1000))
    const hasEditedTime = Math.max(0, toInt(existing?.timeEditedAt, 0)) > 0
    const itemCount = Math.max(0, toInt(cue.itemCount, 0))
    const amount = (Math.max(0, toInt(cue.totalCents, 0)) / 100).toFixed(2)
    return upsertEvent({
      id: eventId,
      source: SHOPPING_SOURCE_KEYS.CALENDAR_DELIVERY,
      sourceReminderId: cueId,
      sourceAreaId: '',
      titleZh: `购物跟进：${cue.title}`,
      titleEn: `Shopping follow-up: ${cue.title}`,
      summaryZh: cue.summary || `跟进 ${itemCount || 1} 件购物订单，金额 ${amount} ${cue.currency || 'CNY'}。`,
      summaryEn: cue.summary || `Follow up ${itemCount || 1} Shopping item(s), ${amount} ${cue.currency || 'CNY'}.`,
      startsAt: hasEditedTime ? existing.startsAt : suggestedAt,
      originalStartsAt: existing?.originalStartsAt || suggestedAt,
      timeEditedAt: existing?.timeEditedAt || 0,
      status: CALENDAR_EVENT_STATUS_CONFIRMED,
      pinned: false,
      route: '/shopping',
      icon: 'fas fa-truck-fast',
      tone: cue.tone || 'orange',
      scheduledPushId: existing?.scheduledPushId || '',
      scheduledPushAt: existing?.scheduledPushAt || 0,
      pushStatus: existing?.pushStatus || 'idle',
      pushUpdatedAt: existing?.pushUpdatedAt || 0,
      lastPushScheduledAt: existing?.lastPushScheduledAt || 0,
      lastPushCancelledAt: existing?.lastPushCancelledAt || 0,
      lastPushError: existing?.lastPushError || '',
      pushHistory: existing?.pushHistory || [],
    })
  }

  const confirmPhoneMissedCallCue = (cueId) => {
    return getRemindersStore().confirmPhoneMissedCallCue(cueId)
  }

  const dismissPhoneMissedCallCue = (cueId) => {
    return getRemindersStore().dismissPhoneMissedCallCue(cueId)
  }

  const dismissPhoneMissedCallCueByCallId = (callId) => {
    const cue = findPhoneMissedCallCueByCallId(callId)
    if (!cue) return false
    return dismissPhoneMissedCallCue(cue.id)
  }

  const confirmStockMarketCue = (cueId) => {
    return getRemindersStore().confirmStockMarketCue(cueId)
  }

  const dismissStockMarketCue = (cueId) => {
    return getRemindersStore().dismissStockMarketCue(cueId)
  }

  const dismissStockMarketCueByStockId = (stockId) => {
    return getRemindersStore().dismissStockMarketCueByStockId(stockId)
  }

  const confirmShoppingDeliveryCue = (cueId) => {
    return getRemindersStore().confirmShoppingDeliveryCue(cueId)
  }

  const dismissShoppingDeliveryCue = (cueId) => {
    return getRemindersStore().dismissShoppingDeliveryCue(cueId)
  }

  const dismissShoppingDeliveryCueByOrderId = (orderId) => {
    return getRemindersStore().dismissShoppingDeliveryCueByOrderId(orderId)
  }

  const removeEventBySourceReminderId = (reminderId) => {
    const sourceReminderId = normalizeEventId(reminderId)
    if (!sourceReminderId) return false
    const index = events.value.findIndex((event) => event.sourceReminderId === sourceReminderId)
    if (index < 0) return false
    events.value.splice(index, 1)
    return true
  }

  const removeEventById = (eventId) => {
    const id = normalizeEventId(eventId)
    if (!id) return false
    const index = events.value.findIndex((event) => event.id === id)
    if (index < 0) return false
    events.value.splice(index, 1)
    return true
  }

  const clearRelationshipBindingForEvent = (
    eventId,
    profile = {},
    replacementName = 'Someone',
  ) => {
    const event = findEventById(eventId)
    if (!event) return false
    if (!bindingMatchesProfile(event.relationshipBinding, profile)) return false
    const nextName = trimLine(replacementName, 'Someone', 120)
    event.titleZh =
      anonymizeRelationshipTextByBinding(event.titleZh, event.relationshipBinding, nextName) ||
      anonymizeRelationshipText(event.titleZh, profile?.name, nextName)
    event.titleEn =
      anonymizeRelationshipTextByBinding(event.titleEn, event.relationshipBinding, nextName) ||
      anonymizeRelationshipText(event.titleEn, profile?.name, nextName)
    event.summaryZh =
      anonymizeRelationshipTextByBinding(event.summaryZh, event.relationshipBinding, nextName) ||
      anonymizeRelationshipText(event.summaryZh, profile?.name, nextName)
    event.summaryEn =
      anonymizeRelationshipTextByBinding(event.summaryEn, event.relationshipBinding, nextName) ||
      anonymizeRelationshipText(event.summaryEn, profile?.name, nextName)
    event.relationshipBinding = clearRelationshipBinding()
    event.updatedAt = Date.now()
    return true
  }

  const cleanupRelationshipForProfile = (profile = {}, options = {}) => {
    const mode = trimLine(options.cleanupMode, 'delete_role', 60)
    const replacementName = trimLine(options.replacementName, 'Someone', 120)
    const matchedEvents = events.value.filter((event) =>
      bindingMatchesProfile(event.relationshipBinding, profile),
    )

    let removedCount = 0
    let unlinkedCount = 0
    matchedEvents.forEach((event) => {
      if (mode === 'delete_role') {
        if (event.sourceReminderId) {
          void cancelEventPushScheduledBySourceReminderId(event.sourceReminderId, {
            source: 'calendar_relationship_cleanup_delete',
          })
        } else {
          void cancelEventPushScheduled({
            eventId: event.id,
            source: 'calendar_relationship_cleanup_delete',
          })
        }
        if (event.sourceReminderId) {
          removeEventBySourceReminderId(event.sourceReminderId)
        } else if (removeEventById(event.id)) {
          removedCount += 1
          return
        }
        removedCount += 1
        return
      }
      if (clearRelationshipBindingForEvent(event.id, profile, replacementName)) {
        unlinkedCount += 1
      }
    })

    return {
      ok: removedCount > 0 || unlinkedCount > 0 || matchedEvents.length === 0,
      removedCount,
      unlinkedCount,
      anonymizedCount: unlinkedCount,
      updatedCount: unlinkedCount,
    }
  }

  const setEventPinnedBySourceReminderId = (reminderId, pinned = true) => {
    const event = findEventBySourceReminderId(reminderId)
    if (!event) return false
    return Boolean(
      upsertEvent({
        ...event,
        pinned: pinned === true,
      }),
    )
  }

  const canUseCalendarEventRealPush = () => {
    const systemStore = getSystemStore()
    const systemSettings = systemStore.settings?.system || {}
    return (
      systemSettings.notifications !== false &&
      systemSettings.realPushEnabled === true &&
      systemSettings.pushSubscriptionActive === true &&
      typeof systemSettings.pushServerUrl === 'string' &&
      systemSettings.pushServerUrl.trim() &&
      typeof systemSettings.pushDeviceId === 'string' &&
      systemSettings.pushDeviceId.trim()
    )
  }

  const buildCalendarEventNotification = (event) => {
    const systemStore = getSystemStore()
    const useChinese = String(systemStore.settings?.system?.language || '')
      .toLowerCase()
      .startsWith('zh')
    return {
      id: `calendar_event_${event.id}`,
      title: useChinese ? '日历' : 'Calendar',
      content: useChinese
        ? `${event.titleZh || event.titleEn || '日历事件'} 即将开始。`
        : `${event.titleEn || event.titleZh || 'Calendar event'} is coming up.`,
      route: '/calendar',
      source: 'calendar_event',
      createdAt: event.startsAt || Date.now(),
    }
  }

  const appendEventPushHistory = (event, entry = {}) => {
    if (!event) return []
    const createdAt = Math.max(0, toInt(entry.createdAt || Date.now(), 0))
    const normalizedEntry = normalizeCalendarEventPushHistory([
      {
        ...entry,
        createdAt,
      },
    ])[0]
    if (!normalizedEntry) return normalizeCalendarEventPushHistory(event.pushHistory)
    return [normalizedEntry, ...normalizeCalendarEventPushHistory(event.pushHistory)].slice(
      0,
      CALENDAR_EVENT_PUSH_HISTORY_LIMIT,
    )
  }

  const markEventPushState = (eventId, patch = {}, historyEntry = null) => {
    const event = findEventById(eventId)
    if (!event) return false
    return Boolean(
      upsertEvent({
        ...event,
        ...patch,
        pushHistory: historyEntry
          ? appendEventPushHistory(event, historyEntry)
          : event.pushHistory || [],
      }),
    )
  }

  const cancelEventPushScheduled = async ({ eventId = '', scheduleId = '', source = '' } = {}) => {
    const systemStore = getSystemStore()
    const event = findEventById(eventId)
    const nextScheduleId =
      trimLine(scheduleId, '', 140) ||
      trimLine(event?.scheduledPushId, '', 140) ||
      createCalendarEventScheduleId(eventId)

    if (!nextScheduleId) return { ok: false, reason: 'schedule_missing' }
    if (eventPushCancelPromises.has(nextScheduleId)) {
      return eventPushCancelPromises.get(nextScheduleId)
    }

    const cancelPromise = (async () => {
      try {
        const serverUrl = systemStore.settings?.system?.pushServerUrl || ''
        if (!serverUrl) {
          if (event?.id) {
            markEventPushState(event.id, {
              scheduledPushId: '',
              scheduledPushAt: 0,
              pushStatus: 'cancel_failed',
              pushUpdatedAt: Date.now(),
              lastPushError: 'server_url_missing',
            }, {
              action: 'cancel',
              status: 'failed',
              source: source || 'calendar_event',
              scheduleId: nextScheduleId,
              reason: 'server_url_missing',
            })
          }
          return { ok: false, reason: 'server_url_missing' }
        }

        const result = await cancelScheduledPushNotification({
          serverUrl,
          scheduleId: nextScheduleId,
        })

        if (event?.id) {
          const now = Date.now()
          markEventPushState(event.id, {
            scheduledPushId: '',
            scheduledPushAt: 0,
            pushStatus: result.ok ? 'cancelled' : 'cancel_failed',
            pushUpdatedAt: now,
            lastPushCancelledAt: result.ok ? now : event.lastPushCancelledAt || 0,
            lastPushError: result.ok ? '' : result.reason || 'cancel_schedule_failed',
          }, {
            action: 'cancel',
            status: result.ok ? 'ok' : 'failed',
            source: source || 'calendar_event',
            scheduleId: nextScheduleId,
            reason: result.ok ? '' : result.reason || 'cancel_schedule_failed',
            message: result.message || '',
          })
        }

        if (!result.ok) {
          systemStore.addApiReport({
            level: 'error',
            module: 'push',
            action: 'cancel_schedule',
            provider: 'push_relay',
            model: source || 'calendar_event',
            code: result.reason || 'cancel_schedule_failed',
            message: result.message || 'Failed to cancel scheduled Calendar event push.',
            createdAt: Date.now(),
          })
          return result
        }

        return {
          ok: true,
          removed: result.removed === true,
          scheduleId: nextScheduleId,
        }
      } finally {
        eventPushCancelPromises.delete(nextScheduleId)
      }
    })()

    eventPushCancelPromises.set(nextScheduleId, cancelPromise)
    return cancelPromise
  }

  const cancelEventPushScheduledBySourceReminderId = async (reminderId, options = {}) => {
    const event = findEventBySourceReminderId(reminderId)
    if (!event) return { ok: false, reason: 'event_missing' }
    return cancelEventPushScheduled({
      eventId: event.id,
      source: options.source || 'calendar_event_source_reminder',
    })
  }

  const ensureEventPushScheduled = async (eventId, { force = false, source = '' } = {}) => {
    const systemStore = getSystemStore()
    const event = findEventById(eventId)
    if (!event || event.status !== CALENDAR_EVENT_STATUS_CONFIRMED) {
      return { ok: false, reason: 'event_missing' }
    }
    if (!event.startsAt) return { ok: false, reason: 'deliver_at_invalid' }
    if (!canUseCalendarEventRealPush()) return { ok: false, reason: 'real_push_disabled' }
    if (eventPushSchedulePromises.has(event.id)) {
      return eventPushSchedulePromises.get(event.id)
    }
    if (!force && event.scheduledPushId && event.scheduledPushAt === event.startsAt) {
      return {
        ok: true,
        reason: 'already_scheduled',
        scheduleId: event.scheduledPushId,
        deliverAt: event.scheduledPushAt,
      }
    }

    const scheduleId = event.scheduledPushId || createCalendarEventScheduleId(event.id)
    const notification = {
      ...buildCalendarEventNotification(event),
      pushDisplayMode: systemStore.settings.system.pushDisplayMode || 'minimal',
    }

    const schedulePromise = (async () => {
      try {
        const result = await schedulePushNotification({
          serverUrl: systemStore.settings.system.pushServerUrl,
          deviceId: systemStore.settings.system.pushDeviceId,
          deliverAt: event.startsAt,
          scheduleId,
          source: source || 'calendar_event',
          category: 'calendar_event',
          notification,
        })

        if (!result.ok) {
          const now = Date.now()
          markEventPushState(event.id, {
            pushStatus: 'failed',
            pushUpdatedAt: now,
            lastPushError: result.reason || 'schedule_failed',
          }, {
            action: 'schedule',
            status: 'failed',
            source: source || 'calendar_event',
            scheduleId,
            deliverAt: event.startsAt,
            reason: result.reason || 'schedule_failed',
            message: result.message || '',
          })
          systemStore.addApiReport({
            level: 'error',
            module: 'push',
            action: 'schedule',
            provider: 'push_relay',
            model: source || 'calendar_event',
            code: result.reason || 'schedule_failed',
            message: result.message || 'Failed to schedule Calendar event push.',
            createdAt: Date.now(),
          })
          return result
        }

        const now = Date.now()
        markEventPushState(event.id, {
          scheduledPushId: result.scheduleId || scheduleId,
          scheduledPushAt: result.deliverAt || event.startsAt,
          pushStatus: 'scheduled',
          pushUpdatedAt: now,
          lastPushScheduledAt: now,
          lastPushError: '',
        }, {
          action: 'schedule',
          status: 'ok',
          source: source || 'calendar_event',
          scheduleId: result.scheduleId || scheduleId,
          deliverAt: result.deliverAt || event.startsAt,
        })

        systemStore.addApiReport({
          level: 'info',
          module: 'push',
          action: 'schedule',
          provider: 'push_relay',
          model: source || 'calendar_event',
          message: 'Calendar event push scheduled.',
          createdAt: Date.now(),
        })

        return {
          ok: true,
          scheduleId: result.scheduleId || scheduleId,
          deliverAt: result.deliverAt || event.startsAt,
        }
      } finally {
        eventPushSchedulePromises.delete(event.id)
      }
    })()

    eventPushSchedulePromises.set(event.id, schedulePromise)
    return schedulePromise
  }

  const rescheduleEventPush = async (eventId, { source = '' } = {}) => {
    const event = findEventById(eventId)
    if (!event) return { ok: false, reason: 'event_missing' }
    if (event.scheduledPushId && event.scheduledPushAt !== event.startsAt) {
      await cancelEventPushScheduled({
        eventId: event.id,
        scheduleId: event.scheduledPushId,
        source: source || 'calendar_event_reschedule',
      })
    }
    return ensureEventPushScheduled(event.id, {
      force: true,
      source: source || 'calendar_event_reschedule',
    })
  }

  const setEventStartsAt = (eventId, startsAt) => {
    const event = findEventById(eventId)
    const normalizedStartsAt = Math.max(0, toInt(startsAt, 0))
    if (!event || normalizedStartsAt <= 0) return false
    const needsReschedule =
      event.scheduledPushId && Math.max(0, toInt(event.scheduledPushAt, 0)) !== normalizedStartsAt
    return Boolean(
      upsertEvent({
        ...event,
        startsAt: normalizedStartsAt,
        originalStartsAt: event.originalStartsAt || event.startsAt,
        timeEditedAt: Date.now(),
        pushStatus: needsReschedule ? 'needs_reschedule' : event.pushStatus || 'idle',
      }),
    )
  }

  const setEventStartsAtBySourceReminderId = (reminderId, startsAt) => {
    const event = findEventBySourceReminderId(reminderId)
    if (!event) return false
    return setEventStartsAt(event.id, startsAt)
  }

  const resetEventStartsAt = (eventId) => {
    const event = findEventById(eventId)
    if (!event) return false
    const originalStartsAt = Math.max(0, toInt(event.originalStartsAt || event.startsAt, 0))
    if (originalStartsAt <= 0) return false
    const needsReschedule =
      event.scheduledPushId && Math.max(0, toInt(event.scheduledPushAt, 0)) !== originalStartsAt
    return Boolean(
      upsertEvent({
        ...event,
        startsAt: originalStartsAt,
        originalStartsAt,
        timeEditedAt: 0,
        pushStatus: needsReschedule ? 'needs_reschedule' : event.pushStatus || 'idle',
      }),
    )
  }

  const resetEventStartsAtBySourceReminderId = (reminderId) => {
    const event = findEventBySourceReminderId(reminderId)
    if (!event) return false
    return resetEventStartsAt(event.id)
  }

  const buildEventRelationshipSuggestion = (eventId, target = null) => {
    const event = findEventById(eventId)
    if (!event || event.status !== CALENDAR_EVENT_STATUS_CONFIRMED) {
      return {
        available: false,
        sourceModule: '',
        sourceId: '',
        target: null,
        targetName: '',
        imported: false,
      }
    }
    return buildCalendarConfirmedEventRelationshipSuggestion({
      relationshipRuntimeStore: getRelationshipRuntimeStore(),
      event,
      target,
    })
  }

  const recordEventRelationshipFact = (eventId, target = null, options = {}) => {
    const event = findEventById(eventId)
    if (!event || event.status !== CALENDAR_EVENT_STATUS_CONFIRMED) return null
    event.relationshipBinding = normalizeRelationshipBinding({
      profileId: target?.profileId,
      contactId: target?.id ?? target?.contactId,
      kind: target?.kind,
      name: target?.name,
      sourceModule: 'chat',
      sourceId: String(target?.id || target?.contactId || ''),
    })
    event.updatedAt = Date.now()
    return recordCalendarConfirmedEventRelationshipFact({
      chatStore: useChatStore(),
      relationshipRuntimeStore: getRelationshipRuntimeStore(),
      event,
      target,
      worldContext: options.worldContext,
    })
  }

  const applyPersistedSource = (source, { migrateReminders = true } = {}) => {
    if (!source || typeof source !== 'object') return false
    events.value = normalizeCalendarEvents(source.events)
    if (migrateReminders && (
      source.phoneMissedCallCues ||
      source.phoneCues ||
      source.stockMarketCues ||
      source.stockCues ||
      source.shoppingDeliveryCues ||
      source.shoppingCues
    )) {
      getRemindersStore().restoreFromBackup({ reminders: source })
    }
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(CALENDAR_STORAGE_KEY, {
      version: CALENDAR_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(CALENDAR_STORAGE_KEY, {
      version: CALENDAR_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const createPersistedSnapshot = () => ({
    events: events.value.map((event) => ({ ...event })),
  })

  const createBackupSnapshot = () => ({
    ...createPersistedSnapshot(),
    phoneMissedCallCues: getRemindersStore().phoneMissedCallCues.map((cue) => ({ ...cue })),
    stockMarketCues: getRemindersStore().stockMarketCues.map((cue) => ({ ...cue })),
    shoppingDeliveryCues: getRemindersStore().shoppingDeliveryCues.map((cue) => ({ ...cue })),
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.calendar === 'object' && snapshot.calendar
        ? snapshot.calendar
        : snapshot
    return applyPersistedSource(source)
  }

  const persistToStorage = () => {
    writePersistedState(CALENDAR_STORAGE_KEY, createPersistedSnapshot(), {
      version: CALENDAR_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    events.value = []
    getRemindersStore().resetForTesting()
  }

  const hydratedFromLocal = hydrateFromStorage()
  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [events],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    events,
    phoneMissedCallCues,
    stockMarketCues,
    shoppingDeliveryCues,
    activePhoneMissedCallCues,
    activeStockMarketCues,
    activeShoppingDeliveryCues,
    upcomingEvents,
    eventCount,
    phoneMissedCallCueCount,
    stockMarketCueCount,
    shoppingDeliveryCueCount,
    hasFinishedStorageHydration,
    findEventById,
    findEventBySourceReminderId,
    findPhoneMissedCallCueById,
    findPhoneMissedCallCueByCallId,
    findStockMarketCueById,
    findStockMarketCueByStockId,
    findShoppingDeliveryCueById,
    findShoppingDeliveryCueByOrderId,
    upsertEvent,
    upsertEventFromMapReminder,
    upsertPhoneMissedCallCue,
    upsertPhoneMissedCallCueFromCall,
    upsertEventFromPhoneMissedCallCue,
    upsertStockMarketCue,
    upsertStockMarketCueFromStock,
    upsertEventFromStockMarketCue,
    upsertShoppingDeliveryCue,
    upsertShoppingDeliveryCueFromOrder,
    upsertEventFromShoppingDeliveryCue,
    confirmPhoneMissedCallCue,
    dismissPhoneMissedCallCue,
    dismissPhoneMissedCallCueByCallId,
    confirmStockMarketCue,
    dismissStockMarketCue,
    dismissStockMarketCueByStockId,
    confirmShoppingDeliveryCue,
    dismissShoppingDeliveryCue,
    dismissShoppingDeliveryCueByOrderId,
    removeEventBySourceReminderId,
    removeEventById,
    setEventPinnedBySourceReminderId,
    ensureEventPushScheduled,
    rescheduleEventPush,
    cancelEventPushScheduled,
    cancelEventPushScheduledBySourceReminderId,
    setEventStartsAt,
    setEventStartsAtBySourceReminderId,
    resetEventStartsAt,
    resetEventStartsAtBySourceReminderId,
    buildEventRelationshipSuggestion,
    recordEventRelationshipFact,
    clearRelationshipBindingForEvent,
    cleanupRelationshipForProfile,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
