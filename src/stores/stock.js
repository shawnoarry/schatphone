import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { useCalendarStore } from './calendar'

const STOCK_STORAGE_KEY = 'store:stock'
const STOCK_STORAGE_VERSION = 1
const STOCK_ITEM_LIMIT = 100
const DEFAULT_CURRENCY = 'CNY'
const STOCK_CALENDAR_CUE_CHANGE_THRESHOLD = 3

const toFiniteNumber = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeText = (value, fallback = '', max = 120) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const normalizeSymbol = (value, fallback = '') => {
  const normalized = normalizeText(value, fallback, 16).toUpperCase().replace(/[^A-Z0-9._-]/g, '')
  return normalized.slice(0, 16)
}

const normalizeCurrency = (value, fallback = DEFAULT_CURRENCY) => {
  const normalized = normalizeText(value, fallback, 8).toUpperCase()
  return /^[A-Z]{2,8}$/.test(normalized) ? normalized : fallback
}

const normalizePriceCents = (value) => {
  const num = toFiniteNumber(value, 0)
  if (num <= 0) return 0
  return Math.round(num * 100)
}

const normalizeQuantity = (value) => {
  const num = toFiniteNumber(value, 0)
  if (num < 0) return 0
  return Math.round(num * 10000) / 10000
}

const normalizeChangePercent = (value) => {
  const num = toFiniteNumber(value, 0)
  return Math.max(-99.99, Math.min(999.99, Math.round(num * 100) / 100))
}

const formatAmount = (amountCents = 0) => {
  const cents = Number.isFinite(Number(amountCents)) ? Math.floor(Number(amountCents)) : 0
  return (cents / 100).toFixed(2)
}

const createStockItemId = () => `stock_item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeStockItem = (rawItem, index = 0) => {
  if (!rawItem || typeof rawItem !== 'object') return null

  const symbol = normalizeSymbol(rawItem.symbol || rawItem.code)
  const name = normalizeText(rawItem.name, symbol, 80)
  if (!symbol || !name) return null

  const priceCents =
    Number.isFinite(Number(rawItem.priceCents)) && Number(rawItem.priceCents) > 0
      ? Math.floor(Number(rawItem.priceCents))
      : normalizePriceCents(rawItem.price)
  if (priceCents <= 0) return null

  const updatedAt = Math.max(0, toInt(rawItem.updatedAt, Date.now()))

  return {
    id:
      typeof rawItem.id === 'string' && rawItem.id.trim()
        ? rawItem.id.trim()
        : `stock_item_legacy_${Date.now()}_${index}`,
    symbol,
    name,
    priceCents,
    currency: normalizeCurrency(rawItem.currency),
    changePercent: normalizeChangePercent(rawItem.changePercent),
    quantity: normalizeQuantity(rawItem.quantity),
    note: normalizeText(rawItem.note, '', 180),
    sourceModule: normalizeText(rawItem.sourceModule, 'stock', 40),
    sourceId: normalizeText(rawItem.sourceId, '', 140),
    createdAt: Math.max(0, toInt(rawItem.createdAt, updatedAt)),
    updatedAt,
  }
}

const normalizeStockItems = (rawItems) => {
  if (!Array.isArray(rawItems)) return []
  const seenSymbols = new Set()
  const normalized = []
  rawItems.forEach((item, index) => {
    const record = normalizeStockItem(item, index)
    if (!record || seenSymbols.has(record.symbol)) return
    seenSymbols.add(record.symbol)
    normalized.push(record)
  })
  return normalized
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, STOCK_ITEM_LIMIT)
}

const createSeedItems = () => {
  const now = Date.now()
  return normalizeStockItems([
    {
      id: 'stock_seed_1',
      symbol: 'SPHN',
      name: 'SchatPhone Index',
      price: 128.8,
      currency: DEFAULT_CURRENCY,
      changePercent: 2.6,
      quantity: 3,
      note: 'Simulation baseline sample',
      sourceModule: 'seed',
      createdAt: now - 30 * 60 * 1000,
      updatedAt: now - 12 * 60 * 1000,
    },
    {
      id: 'stock_seed_2',
      symbol: 'MIRA',
      name: 'Mira Memory',
      price: 42.6,
      currency: DEFAULT_CURRENCY,
      changePercent: -1.2,
      quantity: 0,
      note: 'Watchlist sample',
      sourceModule: 'seed',
      createdAt: now - 45 * 60 * 1000,
      updatedAt: now - 20 * 60 * 1000,
    },
  ])
}

export const useStockStore = defineStore('stock', () => {
  const getCalendarStore = () => useCalendarStore()
  const items = ref([])
  const hasFinishedStorageHydration = ref(false)

  const watchlistCount = computed(() => items.value.length)
  const holdingCount = computed(() => items.value.filter((item) => item.quantity > 0).length)
  const holdingsValueByCurrency = computed(() => {
    const totals = new Map()
    items.value.forEach((item) => {
      if (item.quantity <= 0) return
      const value = Math.round(item.priceCents * item.quantity)
      totals.set(item.currency, (totals.get(item.currency) || 0) + value)
    })
    return [...totals.entries()]
      .map(([currency, amountCents]) => ({
        currency,
        amountCents,
        amount: formatAmount(amountCents),
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency))
  })
  const primaryHoldingValue = computed(() =>
    holdingsValueByCurrency.value.find((item) => item.currency === DEFAULT_CURRENCY) || {
      currency: DEFAULT_CURRENCY,
      amountCents: 0,
      amount: '0.00',
    },
  )
  const topMovers = computed(() =>
    [...items.value]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 3),
  )
  const calendarCueEligibleMovers = computed(() =>
    topMovers.value.filter(
      (item) => Math.abs(Number(item.changePercent) || 0) >= STOCK_CALENDAR_CUE_CHANGE_THRESHOLD,
    ),
  )

  const calendarCueEligibleCount = computed(() => calendarCueEligibleMovers.value.length)

  const syncCalendarCueForStock = (item) => {
    if (!item) return null
    const calendarStore = getCalendarStore()
    const changePercent = Math.abs(Number(item.changePercent) || 0)
    if (changePercent < STOCK_CALENDAR_CUE_CHANGE_THRESHOLD) {
      calendarStore.dismissStockMarketCueByStockId(item.id)
      return null
    }
    return calendarStore.upsertStockMarketCueFromStock(item)
  }

  const findStockById = (stockId) => {
    const id = typeof stockId === 'string' ? stockId.trim() : ''
    if (!id) return null
    return items.value.find((item) => item.id === id) || null
  }

  const findStockBySymbol = (symbol) => {
    const normalized = normalizeSymbol(symbol)
    if (!normalized) return null
    return items.value.find((item) => item.symbol === normalized) || null
  }

  const upsertStock = (input = {}) => {
    const now = Date.now()
    const normalized = normalizeStockItem({
      ...input,
      id: input.id || createStockItemId(),
      createdAt: input.createdAt || now,
      updatedAt: now,
    })
    if (!normalized) return null

    const existing = findStockBySymbol(normalized.symbol)
    if (existing) {
      Object.assign(existing, {
        ...normalized,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now,
      })
      syncCalendarCueForStock(existing)
      return existing
    }

    items.value.unshift(normalized)
    if (items.value.length > STOCK_ITEM_LIMIT) items.value.splice(STOCK_ITEM_LIMIT)
    syncCalendarCueForStock(normalized)
    return normalized
  }

  const updatePrice = (stockId, { price, changePercent } = {}) => {
    const item = findStockById(stockId) || findStockBySymbol(stockId)
    if (!item) return null
    const priceCents = normalizePriceCents(price)
    if (priceCents <= 0) return null
    item.priceCents = priceCents
    item.changePercent = normalizeChangePercent(changePercent)
    item.updatedAt = Date.now()
    syncCalendarCueForStock(item)
    return item
  }

  const removeStock = (stockId) => {
    const item = findStockById(stockId) || findStockBySymbol(stockId)
    if (!item) return false
    getCalendarStore().dismissStockMarketCueByStockId(item.id)
    items.value = items.value.filter((record) => record.id !== item.id)
    return true
  }

  const applyPersistedSource = (source) => {
    const sourceItems = Array.isArray(source)
      ? source
      : source && typeof source === 'object'
        ? source.items || source.watchlist || source.stocks
        : null
    if (!Array.isArray(sourceItems)) return false
    items.value = normalizeStockItems(sourceItems)
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(STOCK_STORAGE_KEY, {
      version: STOCK_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(STOCK_STORAGE_KEY, {
      version: STOCK_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    items: items.value.map((item) => ({ ...item })),
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.stock === 'object' && snapshot.stock
        ? snapshot.stock
        : snapshot
    return applyPersistedSource(source)
  }

  const persistToStorage = () => {
    writePersistedState(STOCK_STORAGE_KEY, createBackupSnapshot(), {
      version: STOCK_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    items.value = []
  }

  const hydratedFromLocal = hydrateFromStorage()
  if (!hydratedFromLocal) {
    items.value = createSeedItems()
  }

  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    items,
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    items,
    watchlistCount,
    holdingCount,
    holdingsValueByCurrency,
    primaryHoldingValue,
    topMovers,
    calendarCueEligibleMovers,
    calendarCueEligibleCount,
    hasFinishedStorageHydration,
    findStockById,
    findStockBySymbol,
    upsertStock,
    updatePrice,
    syncCalendarCueForStock,
    removeStock,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
