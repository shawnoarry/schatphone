import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import {
  cancelScheduledPushNotification,
  schedulePushNotification,
} from '../lib/push'
import { useSystemStore } from './system'

const CALENDAR_STORAGE_KEY = 'store:calendar'
const CALENDAR_STORAGE_VERSION = 1
const CALENDAR_EVENT_LIMIT = 120
const CALENDAR_PHONE_CUE_LIMIT = 80
const CALENDAR_STOCK_CUE_LIMIT = 80
const CALENDAR_EVENT_PUSH_HISTORY_LIMIT = 6
const CALENDAR_EVENT_STATUS_CONFIRMED = 'confirmed'
const CALENDAR_EVENT_STATUS_CANCELLED = 'cancelled'
const CALENDAR_CUE_STATUS_SUGGESTED = 'suggested'
const CALENDAR_CUE_STATUS_CONFIRMED = 'confirmed'
const CALENDAR_CUE_STATUS_DISMISSED = 'dismissed'
const CALENDAR_EVENT_STATUSES = new Set([
  CALENDAR_EVENT_STATUS_CONFIRMED,
  CALENDAR_EVENT_STATUS_CANCELLED,
])
const CALENDAR_CUE_STATUSES = new Set([
  CALENDAR_CUE_STATUS_SUGGESTED,
  CALENDAR_CUE_STATUS_CONFIRMED,
  CALENDAR_CUE_STATUS_DISMISSED,
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

const createPhoneMissedCallCueId = (callId) => {
  const normalizedCallId = normalizeEventId(callId)
  return normalizedCallId ? `phone_missed_call_cue_${normalizedCallId}` : ''
}

const createStockMarketCueId = (stockId) => {
  const normalizedStockId = normalizeEventId(stockId)
  return normalizedStockId ? `stock_market_cue_${normalizedStockId}` : ''
}

const createCalendarEventIdFromPhoneCue = (cueId) => {
  const normalizedCueId = normalizeEventId(cueId)
  return normalizedCueId ? `calendar_event_${normalizedCueId}` : ''
}

const createCalendarEventIdFromStockCue = (cueId) => {
  const normalizedCueId = normalizeEventId(cueId)
  return normalizedCueId ? `calendar_event_${normalizedCueId}` : ''
}

const createCalendarEventScheduleId = (eventId) => {
  const normalizedEventId = normalizeEventId(eventId)
  return normalizedEventId ? `calendar_event_push_${normalizedEventId}` : ''
}

const normalizeCalendarCueStatus = (value, fallback = CALENDAR_CUE_STATUS_SUGGESTED) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (CALENDAR_CUE_STATUSES.has(normalized)) return normalized
  return fallback
}

const normalizePhoneMissedCallCue = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const callId = normalizeEventId(raw.callId || raw.sourceCallId || raw.sourceReminderId)
  if (!callId) return null
  const cueId = normalizeEventId(raw.id) || createPhoneMissedCallCueId(callId)
  const contactName = trimLine(raw.contactName, '', 80)
  if (!cueId || !contactName) return null
  const createdAt = Math.max(0, toInt(raw.createdAt, Date.now() + index))
  const suggestedAt = Math.max(
    0,
    toInt(raw.suggestedAt || raw.dueAt || raw.startsAt, createdAt + 30 * 60 * 1000),
  )

  return {
    id: cueId,
    callId,
    contactName,
    phoneNumber: trimLine(raw.phoneNumber, '', 40),
    summary: trimLine(raw.summary || raw.summaryEn || raw.summaryZh, '', 240),
    suggestedAt,
    status: normalizeCalendarCueStatus(raw.status),
    route: trimLine(raw.route, '/phone', 120),
    icon: trimLine(raw.icon, 'fas fa-phone-slash', 80),
    tone: trimLine(raw.tone, 'rose', 40),
    source: trimLine(raw.source, 'phone_missed_call', 80),
    createdAt,
    updatedAt: Math.max(0, toInt(raw.updatedAt, createdAt)),
  }
}

const normalizePhoneMissedCallCues = (raw) => {
  if (!Array.isArray(raw)) return []
  const seenIds = new Set()
  const normalized = []
  raw.forEach((item, index) => {
    const cue = normalizePhoneMissedCallCue(item, index)
    if (!cue || seenIds.has(cue.id)) return
    seenIds.add(cue.id)
    normalized.push(cue)
  })
  return normalized
    .sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === CALENDAR_CUE_STATUS_SUGGESTED) return -1
        if (b.status === CALENDAR_CUE_STATUS_SUGGESTED) return 1
      }
      return b.updatedAt - a.updatedAt
    })
    .slice(0, CALENDAR_PHONE_CUE_LIMIT)
}

const normalizeStockMarketCue = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const stockId = normalizeEventId(raw.stockId || raw.sourceStockId || raw.sourceReminderId)
  if (!stockId) return null
  const cueId = normalizeEventId(raw.id) || createStockMarketCueId(stockId)
  const symbol = trimLine(raw.symbol, '', 24).toUpperCase()
  const name = trimLine(raw.name || raw.stockName, symbol, 100)
  if (!cueId || !symbol || !name) return null
  const createdAt = Math.max(0, toInt(raw.createdAt, Date.now() + index))
  const suggestedAt = Math.max(
    0,
    toInt(raw.suggestedAt || raw.dueAt || raw.startsAt, createdAt + 2 * 60 * 60 * 1000),
  )

  return {
    id: cueId,
    stockId,
    symbol,
    name,
    priceCents: Math.max(0, toInt(raw.priceCents, 0)),
    currency: trimLine(raw.currency, 'CNY', 12).toUpperCase(),
    changePercent: Number.isFinite(Number(raw.changePercent))
      ? Math.round(Number(raw.changePercent) * 100) / 100
      : 0,
    summary: trimLine(raw.summary || raw.summaryEn || raw.summaryZh, '', 240),
    suggestedAt,
    status: normalizeCalendarCueStatus(raw.status),
    route: trimLine(raw.route, '/stock', 120),
    icon: trimLine(raw.icon, 'fas fa-chart-line', 80),
    tone: trimLine(raw.tone, Number(raw.changePercent) >= 0 ? 'red' : 'emerald', 40),
    source: trimLine(raw.source, 'stock_market_move', 80),
    createdAt,
    updatedAt: Math.max(0, toInt(raw.updatedAt, createdAt)),
  }
}

const normalizeStockMarketCues = (raw) => {
  if (!Array.isArray(raw)) return []
  const seenIds = new Set()
  const normalized = []
  raw.forEach((item, index) => {
    const cue = normalizeStockMarketCue(item, index)
    if (!cue || seenIds.has(cue.id)) return
    seenIds.add(cue.id)
    normalized.push(cue)
  })
  return normalized
    .sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === CALENDAR_CUE_STATUS_SUGGESTED) return -1
        if (b.status === CALENDAR_CUE_STATUS_SUGGESTED) return 1
      }
      return b.updatedAt - a.updatedAt
    })
    .slice(0, CALENDAR_STOCK_CUE_LIMIT)
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
  const events = ref([])
  const phoneMissedCallCues = ref([])
  const stockMarketCues = ref([])
  const hasFinishedStorageHydration = ref(false)
  const eventPushSchedulePromises = new Map()
  const eventPushCancelPromises = new Map()

  const upcomingEvents = computed(() =>
    sortCalendarEvents(
      events.value.filter((event) => event.status === CALENDAR_EVENT_STATUS_CONFIRMED),
    ),
  )

  const eventCount = computed(() => events.value.length)

  const activePhoneMissedCallCues = computed(() =>
    phoneMissedCallCues.value.filter((cue) => cue.status !== CALENDAR_CUE_STATUS_DISMISSED),
  )

  const phoneMissedCallCueCount = computed(() => activePhoneMissedCallCues.value.length)

  const activeStockMarketCues = computed(() =>
    stockMarketCues.value.filter((cue) => cue.status !== CALENDAR_CUE_STATUS_DISMISSED),
  )

  const stockMarketCueCount = computed(() => activeStockMarketCues.value.length)

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
    return phoneMissedCallCues.value.find((cue) => cue.id === id) || null
  }

  const findPhoneMissedCallCueByCallId = (callId) => {
    const normalizedCallId = normalizeEventId(callId)
    if (!normalizedCallId) return null
    return phoneMissedCallCues.value.find((cue) => cue.callId === normalizedCallId) || null
  }

  const findStockMarketCueById = (cueId) => {
    const id = normalizeEventId(cueId)
    if (!id) return null
    return stockMarketCues.value.find((cue) => cue.id === id) || null
  }

  const findStockMarketCueByStockId = (stockId) => {
    const normalizedStockId = normalizeEventId(stockId)
    if (!normalizedStockId) return null
    return stockMarketCues.value.find((cue) => cue.stockId === normalizedStockId) || null
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
    const now = Date.now()
    const normalized = normalizePhoneMissedCallCue({
      ...input,
      updatedAt: now,
      createdAt: input.createdAt || now,
    })
    if (!normalized) return null
    const index = phoneMissedCallCues.value.findIndex((cue) => cue.id === normalized.id)
    if (index >= 0) {
      const existing = phoneMissedCallCues.value[index]
      phoneMissedCallCues.value.splice(index, 1, {
        ...existing,
        ...normalized,
        createdAt: existing.createdAt || normalized.createdAt,
      })
    } else {
      phoneMissedCallCues.value.unshift(normalized)
      if (phoneMissedCallCues.value.length > CALENDAR_PHONE_CUE_LIMIT) {
        phoneMissedCallCues.value.splice(CALENDAR_PHONE_CUE_LIMIT)
      }
    }
    return findPhoneMissedCallCueById(normalized.id)
  }

  const upsertPhoneMissedCallCueFromCall = (call = {}) => {
    const callId = normalizeEventId(call.id)
    if (!callId) return null
    const existing = findPhoneMissedCallCueByCallId(callId)
    return upsertPhoneMissedCallCue({
      id: existing?.id || createPhoneMissedCallCueId(callId),
      callId,
      contactName: call.contactName || '',
      phoneNumber: call.phoneNumber || '',
      summary: call.summary || '',
      suggestedAt: existing?.suggestedAt || Math.max(0, toInt(call.startedAt, Date.now())) + 30 * 60 * 1000,
      status: existing?.status || CALENDAR_CUE_STATUS_SUGGESTED,
      route: '/phone',
      icon: 'fas fa-phone-slash',
      tone: 'rose',
      source: 'phone_missed_call',
      createdAt: existing?.createdAt || call.createdAt || Date.now(),
    })
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
    const now = Date.now()
    const normalized = normalizeStockMarketCue({
      ...input,
      updatedAt: now,
      createdAt: input.createdAt || now,
    })
    if (!normalized) return null
    const index = stockMarketCues.value.findIndex((cue) => cue.id === normalized.id)
    if (index >= 0) {
      const existing = stockMarketCues.value[index]
      stockMarketCues.value.splice(index, 1, {
        ...existing,
        ...normalized,
        createdAt: existing.createdAt || normalized.createdAt,
      })
    } else {
      stockMarketCues.value.unshift(normalized)
      if (stockMarketCues.value.length > CALENDAR_STOCK_CUE_LIMIT) {
        stockMarketCues.value.splice(CALENDAR_STOCK_CUE_LIMIT)
      }
    }
    return findStockMarketCueById(normalized.id)
  }

  const upsertStockMarketCueFromStock = (stock = {}) => {
    const stockId = normalizeEventId(stock.id || stock.symbol)
    if (!stockId) return null
    const existing = findStockMarketCueByStockId(stockId)
    const symbol = trimLine(stock.symbol, '', 24).toUpperCase()
    const changePercent = Number.isFinite(Number(stock.changePercent))
      ? Math.round(Number(stock.changePercent) * 100) / 100
      : 0
    const directionZh = changePercent >= 0 ? '上涨' : '下跌'
    const directionEn = changePercent >= 0 ? 'up' : 'down'
    return upsertStockMarketCue({
      id: existing?.id || createStockMarketCueId(stockId),
      stockId,
      symbol,
      name: stock.name || symbol,
      priceCents: stock.priceCents || 0,
      currency: stock.currency || 'CNY',
      changePercent,
      summary:
        stock.note ||
        `${symbol || stock.name || 'Asset'} ${directionEn} ${Math.abs(changePercent).toFixed(2)}%.`,
      suggestedAt: existing?.suggestedAt || Math.max(0, toInt(stock.updatedAt, Date.now())) + 2 * 60 * 60 * 1000,
      status: existing?.status || CALENDAR_CUE_STATUS_SUGGESTED,
      route: '/stock',
      icon: 'fas fa-chart-line',
      tone: changePercent >= 0 ? 'red' : 'emerald',
      source: 'stock_market_move',
      createdAt: existing?.createdAt || stock.createdAt || Date.now(),
      summaryZh: `${symbol || stock.name || '标的'} ${directionZh} ${Math.abs(changePercent).toFixed(2)}%。`,
    })
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

  const confirmPhoneMissedCallCue = (cueId) => {
    const cue = findPhoneMissedCallCueById(cueId)
    if (!cue || cue.status === CALENDAR_CUE_STATUS_DISMISSED) return null
    const event = upsertEventFromPhoneMissedCallCue(cue)
    if (!event?.id) return null
    upsertPhoneMissedCallCue({
      ...cue,
      status: CALENDAR_CUE_STATUS_CONFIRMED,
    })
    return event
  }

  const dismissPhoneMissedCallCue = (cueId) => {
    const cue = findPhoneMissedCallCueById(cueId)
    if (!cue) return false
    void cancelEventPushScheduledBySourceReminderId(cue.id, {
      source: 'calendar_phone_cue_dismiss',
    })
    removeEventBySourceReminderId(cue.id)
    return Boolean(
      upsertPhoneMissedCallCue({
        ...cue,
        status: CALENDAR_CUE_STATUS_DISMISSED,
      }),
    )
  }

  const confirmStockMarketCue = (cueId) => {
    const cue = findStockMarketCueById(cueId)
    if (!cue || cue.status === CALENDAR_CUE_STATUS_DISMISSED) return null
    const event = upsertEventFromStockMarketCue(cue)
    if (!event?.id) return null
    upsertStockMarketCue({
      ...cue,
      status: CALENDAR_CUE_STATUS_CONFIRMED,
    })
    return event
  }

  const dismissStockMarketCue = (cueId) => {
    const cue = findStockMarketCueById(cueId)
    if (!cue) return false
    void cancelEventPushScheduledBySourceReminderId(cue.id, {
      source: 'calendar_stock_cue_dismiss',
    })
    removeEventBySourceReminderId(cue.id)
    return Boolean(
      upsertStockMarketCue({
        ...cue,
        status: CALENDAR_CUE_STATUS_DISMISSED,
      }),
    )
  }

  const dismissStockMarketCueByStockId = (stockId) => {
    const cue = findStockMarketCueByStockId(stockId)
    if (!cue) return false
    return dismissStockMarketCue(cue.id)
  }

  const removeEventBySourceReminderId = (reminderId) => {
    const sourceReminderId = normalizeEventId(reminderId)
    if (!sourceReminderId) return false
    const index = events.value.findIndex((event) => event.sourceReminderId === sourceReminderId)
    if (index < 0) return false
    events.value.splice(index, 1)
    return true
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

  const applyPersistedSource = (source) => {
    if (!source || typeof source !== 'object') return false
    events.value = normalizeCalendarEvents(source.events)
    phoneMissedCallCues.value = normalizePhoneMissedCallCues(
      source.phoneMissedCallCues || source.phoneCues,
    )
    stockMarketCues.value = normalizeStockMarketCues(source.stockMarketCues || source.stockCues)
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

  const createBackupSnapshot = () => ({
    events: events.value.map((event) => ({ ...event })),
    phoneMissedCallCues: phoneMissedCallCues.value.map((cue) => ({ ...cue })),
    stockMarketCues: stockMarketCues.value.map((cue) => ({ ...cue })),
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
    writePersistedState(CALENDAR_STORAGE_KEY, createBackupSnapshot(), {
      version: CALENDAR_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    events.value = []
    phoneMissedCallCues.value = []
    stockMarketCues.value = []
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
    [events, phoneMissedCallCues, stockMarketCues],
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
    activePhoneMissedCallCues,
    activeStockMarketCues,
    upcomingEvents,
    eventCount,
    phoneMissedCallCueCount,
    stockMarketCueCount,
    hasFinishedStorageHydration,
    findEventById,
    findEventBySourceReminderId,
    findPhoneMissedCallCueById,
    findPhoneMissedCallCueByCallId,
    findStockMarketCueById,
    findStockMarketCueByStockId,
    upsertEvent,
    upsertEventFromMapReminder,
    upsertPhoneMissedCallCue,
    upsertPhoneMissedCallCueFromCall,
    upsertEventFromPhoneMissedCallCue,
    upsertStockMarketCue,
    upsertStockMarketCueFromStock,
    upsertEventFromStockMarketCue,
    confirmPhoneMissedCallCue,
    dismissPhoneMissedCallCue,
    confirmStockMarketCue,
    dismissStockMarketCue,
    dismissStockMarketCueByStockId,
    removeEventBySourceReminderId,
    setEventPinnedBySourceReminderId,
    ensureEventPushScheduled,
    rescheduleEventPush,
    cancelEventPushScheduled,
    cancelEventPushScheduledBySourceReminderId,
    setEventStartsAt,
    setEventStartsAtBySourceReminderId,
    resetEventStartsAt,
    resetEventStartsAtBySourceReminderId,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
