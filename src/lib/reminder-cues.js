import { SHOPPING_SOURCE_KEYS } from './planned-module-registry'

export const REMINDERS_STORAGE_KEY = 'store:reminders'
export const REMINDERS_STORAGE_VERSION = 1
export const REMINDER_PHONE_CUE_LIMIT = 80
export const REMINDER_STOCK_CUE_LIMIT = 80
export const REMINDER_SHOPPING_CUE_LIMIT = 80
export const REMINDER_CUE_STATUS_SUGGESTED = 'suggested'
export const REMINDER_CUE_STATUS_CONFIRMED = 'confirmed'
export const REMINDER_CUE_STATUS_DISMISSED = 'dismissed'

const REMINDER_CUE_STATUSES = new Set([
  REMINDER_CUE_STATUS_SUGGESTED,
  REMINDER_CUE_STATUS_CONFIRMED,
  REMINDER_CUE_STATUS_DISMISSED,
])

export const toReminderInt = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback
}

export const trimReminderLine = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

export const normalizeReminderId = (value) => trimReminderLine(value, '', 140)

export const createPhoneMissedCallCueId = (callId) => {
  const normalizedCallId = normalizeReminderId(callId)
  return normalizedCallId ? `phone_missed_call_cue_${normalizedCallId}` : ''
}

export const createStockMarketCueId = (stockId) => {
  const normalizedStockId = normalizeReminderId(stockId)
  return normalizedStockId ? `stock_market_cue_${normalizedStockId}` : ''
}

export const createShoppingDeliveryCueId = (orderId) => {
  const normalizedOrderId = normalizeReminderId(orderId)
  return normalizedOrderId ? `shopping_delivery_cue_${normalizedOrderId}` : ''
}

export const normalizeReminderCueStatus = (
  value,
  fallback = REMINDER_CUE_STATUS_SUGGESTED,
) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (REMINDER_CUE_STATUSES.has(normalized)) return normalized
  return fallback
}

export const normalizePhoneMissedCallCue = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const callId = normalizeReminderId(raw.callId || raw.sourceCallId || raw.sourceReminderId)
  if (!callId) return null
  const cueId = normalizeReminderId(raw.id) || createPhoneMissedCallCueId(callId)
  const contactName = trimReminderLine(raw.contactName, '', 80)
  if (!cueId || !contactName) return null
  const createdAt = Math.max(0, toReminderInt(raw.createdAt, Date.now() + index))
  const suggestedAt = Math.max(
    0,
    toReminderInt(raw.suggestedAt || raw.dueAt || raw.startsAt, createdAt + 30 * 60 * 1000),
  )

  return {
    id: cueId,
    callId,
    contactName,
    phoneNumber: trimReminderLine(raw.phoneNumber, '', 40),
    summary: trimReminderLine(raw.summary || raw.summaryEn || raw.summaryZh, '', 240),
    suggestedAt,
    status: normalizeReminderCueStatus(raw.status),
    route: trimReminderLine(raw.route, '/phone', 120),
    icon: trimReminderLine(raw.icon, 'fas fa-phone-slash', 80),
    tone: trimReminderLine(raw.tone, 'rose', 40),
    source: trimReminderLine(raw.source, 'phone_missed_call', 80),
    createdAt,
    updatedAt: Math.max(0, toReminderInt(raw.updatedAt, createdAt)),
  }
}

export const normalizeStockMarketCue = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const stockId = normalizeReminderId(raw.stockId || raw.sourceStockId || raw.sourceReminderId)
  if (!stockId) return null
  const cueId = normalizeReminderId(raw.id) || createStockMarketCueId(stockId)
  const symbol = trimReminderLine(raw.symbol, '', 24).toUpperCase()
  const name = trimReminderLine(raw.name || raw.stockName, symbol, 100)
  if (!cueId || !symbol || !name) return null
  const createdAt = Math.max(0, toReminderInt(raw.createdAt, Date.now() + index))
  const suggestedAt = Math.max(
    0,
    toReminderInt(raw.suggestedAt || raw.dueAt || raw.startsAt, createdAt + 2 * 60 * 60 * 1000),
  )

  return {
    id: cueId,
    stockId,
    symbol,
    name,
    priceCents: Math.max(0, toReminderInt(raw.priceCents, 0)),
    currency: trimReminderLine(raw.currency, 'CNY', 12).toUpperCase(),
    changePercent: Number.isFinite(Number(raw.changePercent))
      ? Math.round(Number(raw.changePercent) * 100) / 100
      : 0,
    summary: trimReminderLine(raw.summary || raw.summaryEn || raw.summaryZh, '', 240),
    suggestedAt,
    status: normalizeReminderCueStatus(raw.status),
    route: trimReminderLine(raw.route, '/stock', 120),
    icon: trimReminderLine(raw.icon, 'fas fa-chart-line', 80),
    tone: trimReminderLine(raw.tone, Number(raw.changePercent) >= 0 ? 'red' : 'emerald', 40),
    source: trimReminderLine(raw.source, 'stock_market_move', 80),
    createdAt,
    updatedAt: Math.max(0, toReminderInt(raw.updatedAt, createdAt)),
  }
}

export const normalizeShoppingDeliveryCue = (raw, index = 0) => {
  if (!raw || typeof raw !== 'object') return null
  const orderId = normalizeReminderId(raw.orderId || raw.sourceOrderId || raw.sourceReminderId)
  if (!orderId) return null
  const cueId = normalizeReminderId(raw.id) || createShoppingDeliveryCueId(orderId)
  const title = trimReminderLine(raw.title || raw.titleEn || raw.titleZh, 'Shopping order', 100)
  if (!cueId || !title) return null
  const createdAt = Math.max(0, toReminderInt(raw.createdAt, Date.now() + index))
  const suggestedAt = Math.max(
    0,
    toReminderInt(raw.suggestedAt || raw.dueAt || raw.startsAt, createdAt + 24 * 60 * 60 * 1000),
  )

  return {
    id: cueId,
    orderId,
    title,
    itemCount: Math.max(0, toReminderInt(raw.itemCount, 0)),
    totalCents: Math.max(0, toReminderInt(raw.totalCents, 0)),
    currency: trimReminderLine(raw.currency, 'CNY', 12).toUpperCase(),
    summary: trimReminderLine(raw.summary || raw.summaryEn || raw.summaryZh, '', 240),
    suggestedAt,
    status: normalizeReminderCueStatus(raw.status),
    route: trimReminderLine(raw.route, '/shopping', 120),
    icon: trimReminderLine(raw.icon, 'fas fa-truck-fast', 80),
    tone: trimReminderLine(raw.tone, 'orange', 40),
    source: trimReminderLine(raw.source, SHOPPING_SOURCE_KEYS.CALENDAR_DELIVERY, 80),
    createdAt,
    updatedAt: Math.max(0, toReminderInt(raw.updatedAt, createdAt)),
  }
}

const sortReminderCues = (items = []) =>
  [...items].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === REMINDER_CUE_STATUS_SUGGESTED) return -1
      if (b.status === REMINDER_CUE_STATUS_SUGGESTED) return 1
    }
    return b.updatedAt - a.updatedAt
  })

const normalizeCueList = (raw, normalizer, limit) => {
  if (!Array.isArray(raw)) return []
  const seenIds = new Set()
  const normalized = []
  raw.forEach((item, index) => {
    const cue = normalizer(item, index)
    if (!cue || seenIds.has(cue.id)) return
    seenIds.add(cue.id)
    normalized.push(cue)
  })
  return sortReminderCues(normalized).slice(0, limit)
}

export const normalizePhoneMissedCallCues = (raw) =>
  normalizeCueList(raw, normalizePhoneMissedCallCue, REMINDER_PHONE_CUE_LIMIT)

export const normalizeStockMarketCues = (raw) =>
  normalizeCueList(raw, normalizeStockMarketCue, REMINDER_STOCK_CUE_LIMIT)

export const normalizeShoppingDeliveryCues = (raw) =>
  normalizeCueList(raw, normalizeShoppingDeliveryCue, REMINDER_SHOPPING_CUE_LIMIT)
