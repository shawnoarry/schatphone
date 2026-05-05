import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import { normalizeImageSource } from '../lib/image-source-contract'
import { ASSET_CATEGORY_ENTRIES, ASSET_SOURCE_KEYS } from '../lib/planned-module-registry'

const ASSETS_STORAGE_KEY = 'store:assets'
const ASSETS_STORAGE_VERSION = 1
const ASSET_RECORD_LIMIT = 240
const DEFAULT_CURRENCY = 'CNY'

export const ASSET_STATUS = Object.freeze({
  ACTIVE: 'active',
  WATCHING: 'watching',
  ARCHIVED: 'archived',
  SOLD: 'sold',
})

const ASSET_STATUS_VALUES = new Set(Object.values(ASSET_STATUS))
const ASSET_CATEGORY_KEYS = ASSET_CATEGORY_ENTRIES.map((entry) => entry.key)
const ASSET_CATEGORY_KEY_SET = new Set(ASSET_CATEGORY_KEYS)

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

const normalizeCurrency = (value, fallback = DEFAULT_CURRENCY) => {
  const normalized = normalizeText(value, fallback, 8).toUpperCase()
  return /^[A-Z]{2,8}$/.test(normalized) ? normalized : fallback
}

const normalizeAmountCents = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value * 100))
  }
  if (typeof value !== 'string') return 0
  const normalized = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return 0
  return Math.round(Number(normalized) * 100)
}

const formatAmount = (amountCents = 0) => {
  const cents = Number.isFinite(Number(amountCents)) ? Math.max(0, Math.floor(Number(amountCents))) : 0
  return (cents / 100).toFixed(2)
}

const normalizeAssetId = (value) => normalizeText(value, '', 140)

const normalizeCategory = (value, fallback = 'real_estate') => {
  const normalized = normalizeText(value, fallback, 40)
  return ASSET_CATEGORY_KEY_SET.has(normalized) ? normalized : fallback
}

const normalizeStatus = (value, fallback = ASSET_STATUS.ACTIVE) => {
  const normalized = normalizeText(value, fallback, 40)
  return ASSET_STATUS_VALUES.has(normalized) ? normalized : fallback
}

const normalizeTags = (value) => {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : []
  const seen = new Set()
  const tags = []
  rawTags.forEach((item) => {
    const tag = normalizeText(item, '', 24)
    if (!tag || seen.has(tag)) return
    seen.add(tag)
    tags.push(tag)
  })
  return tags.slice(0, 12)
}

const createAssetId = () => `asset_record_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeAssetRecord = (rawAsset, index = 0) => {
  if (!rawAsset || typeof rawAsset !== 'object') return null

  const name = normalizeText(rawAsset.name || rawAsset.title, '', 90)
  if (!name) return null

  const now = Date.now()
  const updatedAt = Math.max(0, toInt(rawAsset.updatedAt, now))
  const estimatedValueCents =
    Number.isFinite(Number(rawAsset.estimatedValueCents)) && Number(rawAsset.estimatedValueCents) >= 0
      ? Math.floor(Number(rawAsset.estimatedValueCents))
      : normalizeAmountCents(rawAsset.estimatedValue ?? rawAsset.value ?? rawAsset.price)
  const purchaseValueCents =
    Number.isFinite(Number(rawAsset.purchaseValueCents)) && Number(rawAsset.purchaseValueCents) >= 0
      ? Math.floor(Number(rawAsset.purchaseValueCents))
      : normalizeAmountCents(rawAsset.purchaseValue ?? rawAsset.cost)

  return {
    id: normalizeAssetId(rawAsset.id) || `asset_record_legacy_${now}_${index}`,
    name,
    category: normalizeCategory(rawAsset.category),
    status: normalizeStatus(rawAsset.status),
    estimatedValueCents,
    estimatedValue: formatAmount(estimatedValueCents),
    purchaseValueCents,
    purchaseValue: formatAmount(purchaseValueCents),
    currency: normalizeCurrency(rawAsset.currency),
    image: normalizeImageSource(rawAsset, { alt: name }),
    location: normalizeText(rawAsset.location, '', 120),
    note: normalizeText(rawAsset.note || rawAsset.desc || rawAsset.description, '', 260),
    sourceModule: normalizeText(rawAsset.sourceModule, 'assets_manual', 60),
    sourceId: normalizeText(rawAsset.sourceId, '', 140),
    acquiredAt: normalizeText(rawAsset.acquiredAt, '', 40),
    tags: normalizeTags(rawAsset.tags),
    createdAt: Math.max(0, toInt(rawAsset.createdAt, updatedAt)),
    updatedAt,
  }
}

const normalizeAssetRecords = (rawRecords) => {
  if (!Array.isArray(rawRecords)) return []
  const seen = new Set()
  const normalized = []
  rawRecords.forEach((item, index) => {
    const asset = normalizeAssetRecord(item, index)
    if (!asset || seen.has(asset.id)) return
    seen.add(asset.id)
    normalized.push(asset)
  })
  return normalized
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, ASSET_RECORD_LIMIT)
}

const summarizeAssetTotals = (records) => {
  const totals = new Map()
  records.forEach((asset) => {
    const current = totals.get(asset.currency) || 0
    totals.set(asset.currency, current + asset.estimatedValueCents)
  })
  return [...totals.entries()]
    .map(([currency, amountCents]) => ({
      currency,
      amountCents,
      amount: formatAmount(amountCents),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency))
}

const createSeedAssets = () =>
  normalizeAssetRecords([
    {
      id: 'asset_seed_bayside_apartment',
      name: '湾岸公寓',
      category: 'real_estate',
      estimatedValue: '1280000.00',
      purchaseValue: '1080000.00',
      location: 'Bayside',
      note: '可在后续 Map 中作为常用地点与行程上下文。',
      sourceModule: 'seed',
      createdAt: Date.now() - 8 * 60 * 1000,
      updatedAt: Date.now() - 8 * 60 * 1000,
    },
    {
      id: 'asset_seed_sphn_holding',
      name: 'SPHN 长期持仓',
      category: 'investment',
      estimatedValue: '3864.00',
      note: '投资类资产只保留长期拥有摘要，行情仍归 Stock 模块负责。',
      sourceModule: ASSET_SOURCE_KEYS.STOCK_HOLDINGS_SUMMARY,
      sourceId: 'stock_seed_sphn',
      createdAt: Date.now() - 7 * 60 * 1000,
      updatedAt: Date.now() - 7 * 60 * 1000,
    },
    {
      id: 'asset_seed_night_motor',
      name: '夜行摩托',
      category: 'vehicles',
      estimatedValue: '68000.00',
      location: 'Garage A',
      note: '交通工具可在后续 Map 行程系统中作为出行方式上下文。',
      sourceModule: 'seed',
      createdAt: Date.now() - 6 * 60 * 1000,
      updatedAt: Date.now() - 6 * 60 * 1000,
    },
    {
      id: 'asset_seed_platinum_watch',
      name: '白金机械表',
      category: 'special',
      estimatedValue: '6888.00',
      note: '特殊资产适合承接 Shopping 高价值商品转入。',
      sourceModule: ASSET_SOURCE_KEYS.SHOPPING_PURCHASE,
      sourceId: 'shopping_seed_luxury_watch',
      tags: ['收藏', '高价值'],
      createdAt: Date.now() - 5 * 60 * 1000,
      updatedAt: Date.now() - 5 * 60 * 1000,
    },
  ])

export const useAssetsStore = defineStore('assets', () => {
  const assetRecords = ref([])
  const hasFinishedStorageHydration = ref(false)

  const assetMap = computed(() => new Map(assetRecords.value.map((asset) => [asset.id, asset])))
  const assetCount = computed(() => assetRecords.value.length)
  const activeAssetCount = computed(() =>
    assetRecords.value.filter((asset) => asset.status === ASSET_STATUS.ACTIVE).length,
  )
  const totalValueByCurrency = computed(() => summarizeAssetTotals(assetRecords.value))
  const primaryTotalValue = computed(
    () =>
      totalValueByCurrency.value.find((item) => item.currency === DEFAULT_CURRENCY) ||
      totalValueByCurrency.value[0] || {
        currency: DEFAULT_CURRENCY,
        amountCents: 0,
        amount: '0.00',
      },
  )
  const categorySummaries = computed(() =>
    ASSET_CATEGORY_ENTRIES.map((entry) => {
      const records = assetRecords.value.filter((asset) => asset.category === entry.key)
      const totals = summarizeAssetTotals(records)
      return {
        key: entry.key,
        zh: entry.zh,
        en: entry.en,
        icon: entry.icon,
        count: records.length,
        activeCount: records.filter((asset) => asset.status === ASSET_STATUS.ACTIVE).length,
        totals,
        primaryTotal: totals.find((item) => item.currency === DEFAULT_CURRENCY) || totals[0] || {
          currency: DEFAULT_CURRENCY,
          amountCents: 0,
          amount: '0.00',
        },
      }
    }),
  )
  const recentAssets = computed(() => assetRecords.value.slice(0, 6))

  const findAssetById = (assetId) => {
    const id = normalizeAssetId(assetId)
    if (!id) return null
    return assetMap.value.get(id) || null
  }

  const listAssetsByCategory = (category = '') => {
    const normalized = normalizeCategory(category, '')
    if (!normalized) return assetRecords.value.slice()
    return assetRecords.value.filter((asset) => asset.category === normalized)
  }

  const upsertAsset = (input = {}) => {
    const now = Date.now()
    const inputId = normalizeAssetId(input.id)
    const existingIndex = inputId
      ? assetRecords.value.findIndex((asset) => asset.id === inputId)
      : -1
    const existing = existingIndex >= 0 ? assetRecords.value[existingIndex] : null
    const asset = normalizeAssetRecord({
      ...input,
      id: inputId || createAssetId(),
      createdAt: existing?.createdAt || input.createdAt || now,
      updatedAt: now,
    })
    if (!asset) return null

    if (existingIndex >= 0) {
      assetRecords.value.splice(existingIndex, 1, {
        ...existing,
        ...asset,
        createdAt: existing.createdAt,
      })
      return assetRecords.value[existingIndex]
    }

    assetRecords.value.unshift(asset)
    if (assetRecords.value.length > ASSET_RECORD_LIMIT) assetRecords.value.splice(ASSET_RECORD_LIMIT)
    return asset
  }

  const updateAssetStatus = (assetId, status) => {
    const asset = findAssetById(assetId)
    if (!asset) return false
    const normalizedStatus = normalizeStatus(status, '')
    if (!normalizedStatus) return false
    asset.status = normalizedStatus
    asset.updatedAt = Date.now()
    return true
  }

  const removeAsset = (assetId) => {
    const id = normalizeAssetId(assetId)
    const before = assetRecords.value.length
    assetRecords.value = assetRecords.value.filter((asset) => asset.id !== id)
    return assetRecords.value.length !== before
  }

  const applyPersistedSource = (source) => {
    const rawSource = Array.isArray(source)
      ? { records: source }
      : source && typeof source === 'object'
        ? source
        : null
    if (!rawSource) return false

    assetRecords.value = normalizeAssetRecords(
      rawSource.records || rawSource.assetRecords || rawSource.assets || rawSource.items,
    )
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(ASSETS_STORAGE_KEY, {
      version: ASSETS_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(ASSETS_STORAGE_KEY, {
      version: ASSETS_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    records: assetRecords.value.map((asset) => ({
      ...asset,
      tags: [...asset.tags],
    })),
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.assets === 'object' && snapshot.assets
        ? snapshot.assets
        : snapshot
    return applyPersistedSource(source)
  }

  const persistToStorage = () => {
    writePersistedState(ASSETS_STORAGE_KEY, createBackupSnapshot(), {
      version: ASSETS_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    assetRecords.value = []
  }

  const hydratedFromLocal = hydrateFromStorage()
  if (!hydratedFromLocal) {
    assetRecords.value = createSeedAssets()
  }

  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    assetRecords,
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    assetRecords,
    assetCount,
    activeAssetCount,
    totalValueByCurrency,
    primaryTotalValue,
    categorySummaries,
    recentAssets,
    hasFinishedStorageHydration,
    findAssetById,
    listAssetsByCategory,
    upsertAsset,
    updateAssetStatus,
    removeAsset,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
