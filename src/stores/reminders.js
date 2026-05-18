import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import {
  REMINDER_CUE_STATUS_CONFIRMED,
  REMINDER_CUE_STATUS_DISMISSED,
  REMINDER_CUE_STATUS_SUGGESTED,
  REMINDER_PHONE_CUE_LIMIT,
  REMINDER_SHOPPING_CUE_LIMIT,
  REMINDER_STOCK_CUE_LIMIT,
  REMINDERS_STORAGE_KEY,
  REMINDERS_STORAGE_VERSION,
  createPhoneMissedCallCueId,
  createShoppingDeliveryCueId,
  createStockMarketCueId,
  normalizePhoneMissedCallCue,
  normalizePhoneMissedCallCues,
  normalizeReminderId,
  normalizeShoppingDeliveryCue,
  normalizeShoppingDeliveryCues,
  normalizeStockMarketCue,
  normalizeStockMarketCues,
  toReminderInt,
  trimReminderLine,
} from '../lib/reminder-cues'
import { SHOPPING_SOURCE_KEYS } from '../lib/planned-module-registry'
import { useCalendarStore } from './calendar'
import { useMapStore } from './map'

const REMINDER_SOURCES = Object.freeze({
  MAP: 'map',
  PHONE: 'phone',
  SHOPPING: 'shopping',
  STOCK: 'stock',
})

const LEGACY_CALENDAR_STORAGE_KEY = 'store:calendar'
const REMINDER_STATUS_DISMISSED = REMINDER_CUE_STATUS_DISMISSED
const REMINDER_STATUS_CONFIRMED = REMINDER_CUE_STATUS_CONFIRMED

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
  const getCalendarStore = () => useCalendarStore()
  const mapStore = useMapStore()
  const phoneMissedCallCues = ref([])
  const stockMarketCues = ref([])
  const shoppingDeliveryCues = ref([])
  const hasFinishedStorageHydration = ref(false)

  const activePhoneMissedCallCues = computed(() =>
    phoneMissedCallCues.value.filter((cue) => cue.status !== REMINDER_STATUS_DISMISSED),
  )

  const phoneMissedCallCueCount = computed(() => activePhoneMissedCallCues.value.length)

  const activeStockMarketCues = computed(() =>
    stockMarketCues.value.filter((cue) => cue.status !== REMINDER_STATUS_DISMISSED),
  )

  const stockMarketCueCount = computed(() => activeStockMarketCues.value.length)

  const activeShoppingDeliveryCues = computed(() =>
    shoppingDeliveryCues.value.filter((cue) => cue.status !== REMINDER_STATUS_DISMISSED),
  )

  const shoppingDeliveryCueCount = computed(() => activeShoppingDeliveryCues.value.length)

  const findPhoneMissedCallCueById = (cueId) => {
    const id = normalizeReminderId(cueId)
    if (!id) return null
    return phoneMissedCallCues.value.find((cue) => cue.id === id) || null
  }

  const findPhoneMissedCallCueByCallId = (callId) => {
    const normalizedCallId = normalizeReminderId(callId)
    if (!normalizedCallId) return null
    return phoneMissedCallCues.value.find((cue) => cue.callId === normalizedCallId) || null
  }

  const findStockMarketCueById = (cueId) => {
    const id = normalizeReminderId(cueId)
    if (!id) return null
    return stockMarketCues.value.find((cue) => cue.id === id) || null
  }

  const findStockMarketCueByStockId = (stockId) => {
    const normalizedStockId = normalizeReminderId(stockId)
    if (!normalizedStockId) return null
    return stockMarketCues.value.find((cue) => cue.stockId === normalizedStockId) || null
  }

  const findShoppingDeliveryCueById = (cueId) => {
    const id = normalizeReminderId(cueId)
    if (!id) return null
    return shoppingDeliveryCues.value.find((cue) => cue.id === id) || null
  }

  const findShoppingDeliveryCueByOrderId = (orderId) => {
    const normalizedOrderId = normalizeReminderId(orderId)
    if (!normalizedOrderId) return null
    return shoppingDeliveryCues.value.find((cue) => cue.orderId === normalizedOrderId) || null
  }

  const upsertCueRecord = ({ listRef, input, normalizer, findById, limit }) => {
    const now = Date.now()
    const normalized = normalizer({
      ...input,
      updatedAt: now,
      createdAt: input.createdAt || now,
    })
    if (!normalized) return null
    const index = listRef.value.findIndex((cue) => cue.id === normalized.id)
    if (index >= 0) {
      const existing = listRef.value[index]
      listRef.value.splice(index, 1, {
        ...existing,
        ...normalized,
        createdAt: existing.createdAt || normalized.createdAt,
      })
    } else {
      listRef.value.unshift(normalized)
      if (listRef.value.length > limit) {
        listRef.value.splice(limit)
      }
    }
    return findById(normalized.id)
  }

  const upsertPhoneMissedCallCue = (input = {}) =>
    upsertCueRecord({
      listRef: phoneMissedCallCues,
      input,
      normalizer: normalizePhoneMissedCallCue,
      findById: findPhoneMissedCallCueById,
      limit: REMINDER_PHONE_CUE_LIMIT,
    })

  const upsertPhoneMissedCallCueFromCall = (call = {}) => {
    const callId = normalizeReminderId(call.id)
    if (!callId) return null
    const existing = findPhoneMissedCallCueByCallId(callId)
    return upsertPhoneMissedCallCue({
      id: existing?.id || createPhoneMissedCallCueId(callId),
      callId,
      contactName: call.contactName || '',
      phoneNumber: call.phoneNumber || '',
      summary: call.summary || '',
      suggestedAt:
        existing?.suggestedAt ||
        Math.max(0, toReminderInt(call.startedAt, Date.now())) + 30 * 60 * 1000,
      status: existing?.status || REMINDER_CUE_STATUS_SUGGESTED,
      route: '/phone',
      icon: 'fas fa-phone-slash',
      tone: 'rose',
      source: 'phone_missed_call',
      createdAt: existing?.createdAt || call.createdAt || Date.now(),
    })
  }

  const upsertStockMarketCue = (input = {}) =>
    upsertCueRecord({
      listRef: stockMarketCues,
      input,
      normalizer: normalizeStockMarketCue,
      findById: findStockMarketCueById,
      limit: REMINDER_STOCK_CUE_LIMIT,
    })

  const upsertStockMarketCueFromStock = (stock = {}) => {
    const stockId = normalizeReminderId(stock.id || stock.symbol)
    if (!stockId) return null
    const existing = findStockMarketCueByStockId(stockId)
    const symbol = trimReminderLine(stock.symbol, '', 24).toUpperCase()
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
      suggestedAt:
        existing?.suggestedAt ||
        Math.max(0, toReminderInt(stock.updatedAt, Date.now())) + 2 * 60 * 60 * 1000,
      status: existing?.status || REMINDER_CUE_STATUS_SUGGESTED,
      route: '/stock',
      icon: 'fas fa-chart-line',
      tone: changePercent >= 0 ? 'red' : 'emerald',
      source: 'stock_market_move',
      createdAt: existing?.createdAt || stock.createdAt || Date.now(),
      summaryZh: `${symbol || stock.name || '标的'} ${directionZh} ${Math.abs(changePercent).toFixed(2)}%。`,
    })
  }

  const upsertShoppingDeliveryCue = (input = {}) =>
    upsertCueRecord({
      listRef: shoppingDeliveryCues,
      input,
      normalizer: normalizeShoppingDeliveryCue,
      findById: findShoppingDeliveryCueById,
      limit: REMINDER_SHOPPING_CUE_LIMIT,
    })

  const upsertShoppingDeliveryCueFromOrder = (order = {}) => {
    const orderId = normalizeReminderId(order.id)
    if (!orderId) return null
    const existing = findShoppingDeliveryCueByOrderId(orderId)
    const createdAt = Math.max(0, toReminderInt(order.createdAt, Date.now()))
    const itemCount = Math.max(
      0,
      toReminderInt(order.itemCount, Array.isArray(order.items) ? order.items.length : 0),
    )
    const totalCents = Math.max(0, toReminderInt(order.totalCents, 0))
    const currency = trimReminderLine(order.currency, 'CNY', 12).toUpperCase()
    const orderTitle =
      itemCount > 1
        ? `${itemCount} Shopping items`
        : trimReminderLine(order.items?.[0]?.title, 'Shopping order', 100)
    return upsertShoppingDeliveryCue({
      id: existing?.id || createShoppingDeliveryCueId(orderId),
      orderId,
      title: orderTitle,
      itemCount,
      totalCents,
      currency,
      summary: order.note || `Track delivery or follow up for ${itemCount || 1} Shopping item(s).`,
      suggestedAt: existing?.suggestedAt || createdAt + 24 * 60 * 60 * 1000,
      status: existing?.status || REMINDER_CUE_STATUS_SUGGESTED,
      route: '/shopping',
      icon: 'fas fa-truck-fast',
      tone: 'orange',
      source: SHOPPING_SOURCE_KEYS.CALENDAR_DELIVERY,
      createdAt: existing?.createdAt || createdAt,
    })
  }

  const markPhoneMissedCallCueStatus = (cueId, status) => {
    const cue = findPhoneMissedCallCueById(cueId)
    if (!cue) return null
    return upsertPhoneMissedCallCue({
      ...cue,
      status,
    })
  }

  const markStockMarketCueStatus = (cueId, status) => {
    const cue = findStockMarketCueById(cueId)
    if (!cue) return null
    return upsertStockMarketCue({
      ...cue,
      status,
    })
  }

  const markShoppingDeliveryCueStatus = (cueId, status) => {
    const cue = findShoppingDeliveryCueById(cueId)
    if (!cue) return null
    return upsertShoppingDeliveryCue({
      ...cue,
      status,
    })
  }

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
    activePhoneMissedCallCues.value.map(normalizePhoneCue),
  )

  const shoppingReminderItems = computed(() =>
    activeShoppingDeliveryCues.value.map(normalizeShoppingCue),
  )

  const stockReminderItems = computed(() =>
    activeStockMarketCues.value.map(normalizeStockCue),
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
      void getCalendarStore().cancelEventPushScheduledBySourceReminderId(reminder.id, {
        source: 'reminders_map_dismiss',
      })
      getCalendarStore().removeEventBySourceReminderId(reminder.id)
      return null
    }

    if (reminder.status === REMINDER_STATUS_CONFIRMED || reminder.pinned === true) {
      const event = getCalendarStore().upsertEventFromMapReminder(reminder)
      if (event?.id) {
        void getCalendarStore().ensureEventPushScheduled(event.id, {
          source: 'reminders_map_confirm',
        })
      }
      return event
    }

    void getCalendarStore().cancelEventPushScheduledBySourceReminderId(reminder.id, {
      source: 'reminders_map_remove',
    })
    getCalendarStore().removeEventBySourceReminderId(reminder.id)
    return null
  }

  const syncMapReminderEvents = () => {
    mapStore.mapCalendarReminders.forEach((reminder) => {
      syncMapReminderEvent(reminder)
    })
  }

  const confirmPhoneMissedCallCue = (cueId) => {
    const cue = findPhoneMissedCallCueById(cueId)
    if (!cue || cue.status === REMINDER_CUE_STATUS_DISMISSED) return null
    const event = getCalendarStore().upsertEventFromPhoneMissedCallCue(cue)
    if (!event?.id) return null
    markPhoneMissedCallCueStatus(cue.id, REMINDER_CUE_STATUS_CONFIRMED)
    return event
  }

  const dismissPhoneMissedCallCue = (cueId) => {
    const cue = findPhoneMissedCallCueById(cueId)
    if (!cue) return false
    void getCalendarStore().cancelEventPushScheduledBySourceReminderId(cue.id, {
      source: 'reminders_phone_cue_dismiss',
    })
    getCalendarStore().removeEventBySourceReminderId(cue.id)
    return Boolean(markPhoneMissedCallCueStatus(cue.id, REMINDER_CUE_STATUS_DISMISSED))
  }

  const confirmStockMarketCue = (cueId) => {
    const cue = findStockMarketCueById(cueId)
    if (!cue || cue.status === REMINDER_CUE_STATUS_DISMISSED) return null
    const event = getCalendarStore().upsertEventFromStockMarketCue(cue)
    if (!event?.id) return null
    markStockMarketCueStatus(cue.id, REMINDER_CUE_STATUS_CONFIRMED)
    return event
  }

  const dismissStockMarketCue = (cueId) => {
    const cue = findStockMarketCueById(cueId)
    if (!cue) return false
    void getCalendarStore().cancelEventPushScheduledBySourceReminderId(cue.id, {
      source: 'reminders_stock_cue_dismiss',
    })
    getCalendarStore().removeEventBySourceReminderId(cue.id)
    return Boolean(markStockMarketCueStatus(cue.id, REMINDER_CUE_STATUS_DISMISSED))
  }

  const dismissStockMarketCueByStockId = (stockId) => {
    const cue = findStockMarketCueByStockId(stockId)
    if (!cue) return false
    return dismissStockMarketCue(cue.id)
  }

  const confirmShoppingDeliveryCue = (cueId) => {
    const cue = findShoppingDeliveryCueById(cueId)
    if (!cue || cue.status === REMINDER_CUE_STATUS_DISMISSED) return null
    const event = getCalendarStore().upsertEventFromShoppingDeliveryCue(cue)
    if (!event?.id) return null
    markShoppingDeliveryCueStatus(cue.id, REMINDER_CUE_STATUS_CONFIRMED)
    return event
  }

  const dismissShoppingDeliveryCue = (cueId) => {
    const cue = findShoppingDeliveryCueById(cueId)
    if (!cue) return false
    void getCalendarStore().cancelEventPushScheduledBySourceReminderId(cue.id, {
      source: 'reminders_shopping_delivery_dismiss',
    })
    getCalendarStore().removeEventBySourceReminderId(cue.id)
    return Boolean(markShoppingDeliveryCueStatus(cue.id, REMINDER_CUE_STATUS_DISMISSED))
  }

  const dismissShoppingDeliveryCueByOrderId = (orderId) => {
    const cue = findShoppingDeliveryCueByOrderId(orderId)
    if (!cue) return false
    return dismissShoppingDeliveryCue(cue.id)
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
        ? confirmPhoneMissedCallCue(id)
        : source === REMINDER_SOURCES.SHOPPING
          ? confirmShoppingDeliveryCue(id)
          : source === REMINDER_SOURCES.STOCK
            ? confirmStockMarketCue(id)
            : null

    if (event?.id) {
      void getCalendarStore().ensureEventPushScheduled(event.id, {
        source: `reminders_${source}_confirm`,
      })
    }
    return event
  }

  const dismissReminderByKey = (key) => {
    const { source, id } = parseReminderKey(key)
    if (!source || !id) return false

    if (source === REMINDER_SOURCES.MAP) {
      void getCalendarStore().cancelEventPushScheduledBySourceReminderId(id, {
        source: 'reminders_map_dismiss',
      })
      mapStore.dismissMapCalendarReminder(id)
      getCalendarStore().removeEventBySourceReminderId(id)
      return true
    }

    if (source === REMINDER_SOURCES.PHONE) return dismissPhoneMissedCallCue(id)
    if (source === REMINDER_SOURCES.SHOPPING) return dismissShoppingDeliveryCue(id)
    if (source === REMINDER_SOURCES.STOCK) return dismissStockMarketCue(id)
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

  const applyPersistedSource = (source = {}) => {
    if (!source || typeof source !== 'object') return false
    phoneMissedCallCues.value = normalizePhoneMissedCallCues(
      source.phoneMissedCallCues || source.phoneCues,
    )
    stockMarketCues.value = normalizeStockMarketCues(source.stockMarketCues || source.stockCues)
    shoppingDeliveryCues.value = normalizeShoppingDeliveryCues(
      source.shoppingDeliveryCues || source.shoppingCues,
    )
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(REMINDERS_STORAGE_KEY, {
      version: REMINDERS_STORAGE_VERSION,
    })
    if (applyPersistedSource(persisted)) return true
    const legacyCalendar = readPersistedState(LEGACY_CALENDAR_STORAGE_KEY, {
      version: 1,
    })
    return applyPersistedSource(legacyCalendar)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(REMINDERS_STORAGE_KEY, {
      version: REMINDERS_STORAGE_VERSION,
    })
    if (applyPersistedSource(persisted)) return true
    const legacyCalendar = await readPersistedStateAsync(LEGACY_CALENDAR_STORAGE_KEY, {
      version: 1,
    })
    return applyPersistedSource(legacyCalendar)
  }

  const createBackupSnapshot = () => ({
    phoneMissedCallCues: phoneMissedCallCues.value.map((cue) => ({ ...cue })),
    stockMarketCues: stockMarketCues.value.map((cue) => ({ ...cue })),
    shoppingDeliveryCues: shoppingDeliveryCues.value.map((cue) => ({ ...cue })),
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.reminders === 'object' && snapshot.reminders
        ? snapshot.reminders
        : snapshot && typeof snapshot.calendar === 'object' && snapshot.calendar
          ? snapshot.calendar
          : snapshot
    return applyPersistedSource(source)
  }

  const persistToStorage = () => {
    writePersistedState(REMINDERS_STORAGE_KEY, createBackupSnapshot(), {
      version: REMINDERS_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    phoneMissedCallCues.value = []
    stockMarketCues.value = []
    shoppingDeliveryCues.value = []
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
    [phoneMissedCallCues, stockMarketCues, shoppingDeliveryCues],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    phoneMissedCallCues,
    stockMarketCues,
    shoppingDeliveryCues,
    activePhoneMissedCallCues,
    activeStockMarketCues,
    activeShoppingDeliveryCues,
    phoneMissedCallCueCount,
    stockMarketCueCount,
    shoppingDeliveryCueCount,
    activeReminderItems,
    activeReminderCount,
    confirmedReminderCount,
    pinnedReminderCount,
    suggestedReminderCount,
    sourceCounts,
    hasFinishedStorageHydration,
    findReminderByKey,
    findPhoneMissedCallCueById,
    findPhoneMissedCallCueByCallId,
    findStockMarketCueById,
    findStockMarketCueByStockId,
    findShoppingDeliveryCueById,
    findShoppingDeliveryCueByOrderId,
    upsertPhoneMissedCallCue,
    upsertPhoneMissedCallCueFromCall,
    upsertStockMarketCue,
    upsertStockMarketCueFromStock,
    upsertShoppingDeliveryCue,
    upsertShoppingDeliveryCueFromOrder,
    confirmPhoneMissedCallCue,
    dismissPhoneMissedCallCue,
    confirmStockMarketCue,
    dismissStockMarketCue,
    dismissStockMarketCueByStockId,
    confirmShoppingDeliveryCue,
    dismissShoppingDeliveryCue,
    dismissShoppingDeliveryCueByOrderId,
    syncMapReminderEvent,
    syncMapReminderEvents,
    confirmReminderByKey,
    dismissReminderByKey,
    toggleMapReminderPinByKey,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
