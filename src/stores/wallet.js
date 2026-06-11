import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'
import {
  anonymizeRelationshipText,
  bindingMatchesProfile,
  clearRelationshipBinding,
  normalizeRelationshipBinding,
} from '../lib/relationship-cleanup-helpers'
import {
  DEFAULT_WALLET_CURRENCY,
  SYSTEM_WALLET_CURRENCIES,
  createDefaultWalletExchangeRates,
  formatExchangeRate,
  getRateToCny,
  normalizeCurrencyCode,
  normalizeCurrencyDefinition,
  normalizeWalletExchangeRates,
} from '../lib/currency-system'

export {
  DEFAULT_WALLET_CURRENCY,
  formatExchangeRate as formatWalletExchangeRate,
  normalizeCurrencyCode as normalizeWalletCurrency,
} from '../lib/currency-system'

const WALLET_STORAGE_KEY = 'store:wallet'
const WALLET_STORAGE_VERSION = 1
const WALLET_TRANSACTION_LIMIT = 200
const DEFAULT_CURRENCY = DEFAULT_WALLET_CURRENCY
export const WALLET_TRANSACTION_SOURCE_FILTERS = Object.freeze({
  ALL: 'all',
  MANUAL: 'manual',
  CHAT: 'chat',
  ORDERS: 'orders',
})
const WALLET_TRANSACTION_TYPES = new Set(['income', 'expense', 'transfer'])
const WALLET_TRANSACTION_SOURCE_FILTER_VALUES = new Set(
  Object.values(WALLET_TRANSACTION_SOURCE_FILTERS),
)

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

const normalizeCurrency = normalizeCurrencyCode

const createDefaultRegisteredCurrencies = () =>
  SYSTEM_WALLET_CURRENCIES.map((currency) =>
    normalizeCurrencyDefinition(currency, { source: 'system' }),
  ).filter(Boolean)

const normalizeWalletCurrencyList = (rawCurrencies = []) => {
  const byCode = new Map()
  createDefaultRegisteredCurrencies().forEach((currency) => {
    byCode.set(currency.code, currency)
  })
  ;(Array.isArray(rawCurrencies) ? rawCurrencies : []).forEach((currency) => {
    const normalized = normalizeCurrencyDefinition(currency)
    if (!normalized) return
    byCode.set(normalized.code, {
      ...(byCode.get(normalized.code) || {}),
      ...normalized,
    })
  })
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code))
}

const normalizeAmountCents = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100)
  }
  if (typeof value !== 'string') return 0
  const normalized = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return 0
  return Math.round(Number(normalized) * 100)
}

const formatAmount = (amountCents = 0) => {
  const safeCents = Number.isFinite(Number(amountCents)) ? Math.abs(Math.floor(Number(amountCents))) : 0
  return (safeCents / 100).toFixed(2)
}

const normalizeRateValue = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

const createWalletTransactionId = () => `wallet_tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeTransactionType = (value, fallback = 'transfer') => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return WALLET_TRANSACTION_TYPES.has(normalized) ? normalized : fallback
}

const isChatTransferTransaction = (transaction) => transaction?.sourceModule === 'chat_transfer'

const isOrderExpenseTransaction = (transaction) =>
  transaction?.sourceModule === 'shopping_wallet_expense' ||
  transaction?.sourceModule === 'food_delivery_wallet_expense'

const normalizeCounterpartyKey = (value) => normalizeText(value, '', 120).toLowerCase()

const normalizeTransactionSourceFilter = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return WALLET_TRANSACTION_SOURCE_FILTER_VALUES.has(normalized)
    ? normalized
    : WALLET_TRANSACTION_SOURCE_FILTERS.ALL
}

const normalizeWalletTransaction = (rawTransaction, index = 0, fallbackCurrency = DEFAULT_CURRENCY) => {
  if (!rawTransaction || typeof rawTransaction !== 'object') return null

  const amountCents =
    Number.isFinite(Number(rawTransaction.amountCents)) && Number(rawTransaction.amountCents) > 0
      ? Math.floor(Number(rawTransaction.amountCents))
      : normalizeAmountCents(rawTransaction.amount)
  if (amountCents <= 0) return null

  const createdAt = Math.max(0, toInt(rawTransaction.createdAt, Date.now()))
  const type = normalizeTransactionType(rawTransaction.type)

  return {
    id:
      typeof rawTransaction.id === 'string' && rawTransaction.id.trim()
        ? rawTransaction.id.trim()
        : `wallet_tx_legacy_${Date.now()}_${index}`,
    type,
    title: normalizeText(rawTransaction.title, type === 'expense' ? '支出' : '转账记录', 80),
    counterparty: normalizeText(rawTransaction.counterparty, '', 120),
    note: normalizeText(rawTransaction.note, '', 240),
    amountCents,
    currency: normalizeCurrency(rawTransaction.currency, fallbackCurrency),
    sourceModule: normalizeText(rawTransaction.sourceModule, 'wallet', 40),
    sourceId: normalizeText(rawTransaction.sourceId, '', 140),
    relationshipBinding: normalizeRelationshipBinding(rawTransaction.relationshipBinding),
    createdAt,
    updatedAt: Math.max(0, toInt(rawTransaction.updatedAt, createdAt)),
  }
}

const normalizeWalletTransactions = (rawTransactions, fallbackCurrency = DEFAULT_CURRENCY) => {
  if (!Array.isArray(rawTransactions)) return []
  const seenIds = new Set()
  const normalized = []
  rawTransactions.forEach((item, index) => {
    const record = normalizeWalletTransaction(item, index, fallbackCurrency)
    if (!record || seenIds.has(record.id)) return
    seenIds.add(record.id)
    normalized.push(record)
  })
  return normalized
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, WALLET_TRANSACTION_LIMIT)
}

const createSeedTransactions = () => {
  const now = Date.now()
  return normalizeWalletTransactions([
    {
      id: 'wallet_seed_transfer_1',
      type: 'income',
      title: '启动资金',
      counterparty: 'SchatPhone',
      amount: '1288.00',
      currency: DEFAULT_CURRENCY,
      sourceModule: 'seed',
      createdAt: now - 2 * 60 * 1000,
      updatedAt: now - 2 * 60 * 1000,
    },
  ])
}

export const useWalletStore = defineStore('wallet', () => {
  const primaryCurrency = ref(DEFAULT_CURRENCY)
  const registeredCurrencies = ref(createDefaultRegisteredCurrencies())
  const exchangeRates = ref(createDefaultWalletExchangeRates())
  const transactions = ref([])
  const hasFinishedStorageHydration = ref(false)

  const transactionCount = computed(() => transactions.value.length)
  const transactionSourceSummary = computed(() => {
    const chat = transactions.value.filter(isChatTransferTransaction).length
    const orders = transactions.value.filter(isOrderExpenseTransaction).length
    const manual = transactions.value.length - chat - orders
    return {
      all: transactions.value.length,
      manual,
      chat,
      orders,
    }
  })
  const balances = computed(() => {
    const totals = new Map()
    transactions.value.forEach((transaction) => {
      const sign = transaction.type === 'expense' ? -1 : 1
      const current = totals.get(transaction.currency) || 0
      totals.set(transaction.currency, current + sign * transaction.amountCents)
    })
    return [...totals.entries()]
      .map(([currency, amountCents]) => ({
        currency,
        amountCents,
        amount: formatAmount(amountCents),
      }))
      .sort((a, b) => a.currency.localeCompare(b.currency))
  })

  const primaryBalance = computed(() => balances.value.find((item) => item.currency === primaryCurrency.value) || {
    currency: primaryCurrency.value,
    amountCents: 0,
    amount: '0.00',
  })

  const currencyOptions = computed(() => {
    const byCode = new Map()
    normalizeWalletCurrencyList(registeredCurrencies.value).forEach((currency) => {
      byCode.set(currency.code, currency)
    })
    ;[primaryCurrency.value, ...transactions.value.map((transaction) => transaction.currency)].forEach((currency) => {
      const code = normalizeCurrency(currency, '')
      if (!code || byCode.has(code)) return
      byCode.set(code, normalizeCurrencyDefinition({ code, source: 'ledger' }))
    })
    return [...byCode.values()].sort((a, b) => {
      if (a.code === DEFAULT_CURRENCY) return -1
      if (b.code === DEFAULT_CURRENCY) return 1
      if (a.code === 'USD') return -1
      if (b.code === 'USD') return 1
      return a.code.localeCompare(b.code)
    })
  })

  const exchangeRateRows = computed(() =>
    currencyOptions.value.map((currency) => {
      const rateToCny = currency.code === 'CNY' ? 1 : getRateToCny(exchangeRates.value, currency.code)
      return {
        ...currency,
        rateToCny,
        rateToCnyLabel: formatExchangeRate(rateToCny),
        isPrimary: currency.code === primaryCurrency.value,
      }
    }),
  )

  const primaryCurrencyDefinition = computed(
    () => currencyOptions.value.find((currency) => currency.code === primaryCurrency.value) ||
      normalizeCurrencyDefinition({ code: primaryCurrency.value, source: 'ledger' }),
  )

  const findTransactionById = (transactionId) => {
    const id = typeof transactionId === 'string' ? transactionId.trim() : ''
    if (!id) return null
    return transactions.value.find((item) => item.id === id) || null
  }

  const findTransactionBySource = (sourceModule = '', sourceId = '') => {
    const module = normalizeText(sourceModule, '', 40)
    const id = normalizeText(sourceId, '', 140)
    if (!module || !id) return null
    return transactions.value.find((item) => item.sourceModule === module && item.sourceId === id) || null
  }

  const listTransactionsBySourceFilter = (filter = WALLET_TRANSACTION_SOURCE_FILTERS.ALL) => {
    const normalizedFilter = normalizeTransactionSourceFilter(filter)
    if (normalizedFilter === WALLET_TRANSACTION_SOURCE_FILTERS.CHAT) {
      return transactions.value.filter(isChatTransferTransaction)
    }
    if (normalizedFilter === WALLET_TRANSACTION_SOURCE_FILTERS.ORDERS) {
      return transactions.value.filter(isOrderExpenseTransaction)
    }
    if (normalizedFilter === WALLET_TRANSACTION_SOURCE_FILTERS.MANUAL) {
      return transactions.value.filter(
        (transaction) => !isChatTransferTransaction(transaction) && !isOrderExpenseTransaction(transaction),
      )
    }
    return transactions.value.slice()
  }

  const listTransactionsByCounterparty = (counterparty = '') => {
    const key = normalizeCounterpartyKey(counterparty)
    if (!key) return []
    return transactions.value.filter(
      (transaction) => normalizeCounterpartyKey(transaction.counterparty) === key,
    )
  }

  const summarizeCounterpartyLedger = (counterparty = '') => {
    const records = listTransactionsByCounterparty(counterparty)
    if (records.length === 0) {
      return {
        counterparty: normalizeText(counterparty, '', 120),
        count: 0,
        chatCount: 0,
        orderCount: 0,
        manualCount: 0,
        currencies: [],
        latestTransaction: null,
      }
    }

    const totals = new Map()
    records.forEach((transaction) => {
      const sign = transaction.type === 'expense' ? -1 : 1
      const current = totals.get(transaction.currency) || 0
      totals.set(transaction.currency, current + sign * transaction.amountCents)
    })

    return {
      counterparty: records[0].counterparty,
      count: records.length,
      chatCount: records.filter(isChatTransferTransaction).length,
      orderCount: records.filter(isOrderExpenseTransaction).length,
      manualCount: records.filter(
        (transaction) => !isChatTransferTransaction(transaction) && !isOrderExpenseTransaction(transaction),
      ).length,
      currencies: [...totals.entries()]
        .map(([currency, amountCents]) => ({
          currency,
          amountCents,
          amount: formatAmount(amountCents),
        }))
        .sort((a, b) => a.currency.localeCompare(b.currency)),
      latestTransaction: records[0] || null,
    }
  }

  const addTransaction = (input = {}) => {
    const now = Date.now()
    const transaction = normalizeWalletTransaction({
      ...input,
      currency: input.currency || primaryCurrency.value,
      id: input.id || createWalletTransactionId(),
      createdAt: input.createdAt || now,
      updatedAt: now,
    }, 0, primaryCurrency.value)
    if (!transaction) return null
    transactions.value.unshift(transaction)
    if (transactions.value.length > WALLET_TRANSACTION_LIMIT) {
      transactions.value.splice(WALLET_TRANSACTION_LIMIT)
    }
    return transaction
  }

  const addTransferTransaction = ({
    amount,
    currency = '',
    counterparty = '',
    note = '',
    relationshipBinding = null,
  } = {}) =>
    addTransaction({
      type: 'transfer',
      title: '聊天转账',
      amount,
      currency: currency || primaryCurrency.value,
      counterparty,
      note,
      sourceModule: 'wallet_manual',
      relationshipBinding,
    })

  const addChatTransferTransaction = ({
    messageId = '',
    amount,
    currency = '',
    counterparty = '',
    note = '',
    createdAt,
  } = {}) => {
    const sourceId = normalizeText(messageId, '', 140)
    if (!sourceId) return null

    const existing = findTransactionBySource('chat_transfer', sourceId)
    if (existing) return existing

    return addTransaction({
      type: 'expense',
      title: 'Chat transfer',
      amount,
      currency: currency || primaryCurrency.value,
      counterparty,
      note,
      sourceModule: 'chat_transfer',
      sourceId,
      createdAt,
    })
  }

  const removeTransaction = (transactionId) => {
    const transaction = findTransactionById(transactionId)
    if (!transaction) return false
    transactions.value = transactions.value.filter((item) => item.id !== transaction.id)
    return true
  }

  const anonymizeTransaction = (transactionId, profile = {}, replacementName = 'Unknown counterparty') => {
    const transaction = findTransactionById(transactionId)
    if (!transaction) return false
    const nextName = normalizeText(replacementName, 'Unknown counterparty', 120)
    transaction.counterparty = nextName
    transaction.note = anonymizeRelationshipText(transaction.note, profile?.name, nextName)
    transaction.title = anonymizeRelationshipText(transaction.title, profile?.name, nextName)
    transaction.relationshipBinding = clearRelationshipBinding()
    transaction.updatedAt = Date.now()
    return true
  }

  const cleanupRelationshipForProfile = (profile = {}, options = {}) => {
    const replacementName = normalizeText(options.replacementName, 'Unknown counterparty', 120)
    const matchedTransactions = transactions.value.filter((transaction) =>
      bindingMatchesProfile(transaction.relationshipBinding, profile),
    )
    let anonymizedCount = 0
    matchedTransactions.forEach((transaction) => {
      if (anonymizeTransaction(transaction.id, profile, replacementName)) {
        anonymizedCount += 1
      }
    })
    return {
      requestedCount: matchedTransactions.length,
      removedCount: 0,
      anonymizedCount,
    }
  }

  const setPrimaryCurrency = (currency = '') => {
    const nextCurrency = normalizeCurrency(currency, '')
    if (!nextCurrency) return ''
    registerCurrency({ code: nextCurrency, source: 'manual' })
    primaryCurrency.value = nextCurrency
    return nextCurrency
  }

  const registerCurrency = (input = {}) => {
    const normalized = normalizeCurrencyDefinition(input, { source: input?.source || 'manual' })
    if (!normalized) return null
    const current = normalizeWalletCurrencyList(registeredCurrencies.value)
    const index = current.findIndex((currency) => currency.code === normalized.code)
    const next = {
      ...(index >= 0 ? current[index] : {}),
      ...normalized,
      updatedAt: Date.now(),
    }
    if (index >= 0) {
      current.splice(index, 1, next)
    } else {
      current.push(next)
    }
    registeredCurrencies.value = normalizeWalletCurrencyList(current)

    if (normalized.rateToUsd > 0) {
      exchangeRates.value = normalizeWalletExchangeRates({
        ...exchangeRates.value,
        ratesToUsd: {
          ...exchangeRates.value.ratesToUsd,
          [normalized.code]: normalized.rateToUsd,
        },
      })
    }
    return next
  }

  const registerWorldCurrency = (input = {}, worldPack = {}) =>
    registerCurrency({
      ...input,
      source: input.source || 'world_pack',
      worldPackId: input.worldPackId || worldPack.id || worldPack.packId || '',
    })

  const setUsdCnyRate = (rate) => {
    const nextRate = normalizeRateValue(rate)
    if (!nextRate) return null
    exchangeRates.value = normalizeWalletExchangeRates({
      ...exchangeRates.value,
      usdCnyRate: nextRate,
    })
    return exchangeRates.value.reference.rate
  }

  const setCurrencyCnyRate = (currency = '', rateToCny = 0) => {
    const code = normalizeCurrency(currency, '')
    const rate = normalizeRateValue(rateToCny)
    if (!code || !rate) return null
    registerCurrency({ code, source: 'manual' })
    if (code === 'CNY') return 1
    const usdCny = normalizeRateValue(exchangeRates.value.reference?.rate) || 1
    exchangeRates.value = normalizeWalletExchangeRates({
      ...exchangeRates.value,
      ratesToUsd: {
        ...exchangeRates.value.ratesToUsd,
        [code]: rate / usdCny,
      },
    })
    return getRateToCny(exchangeRates.value, code)
  }

  const findCurrencyOption = (currency = '') => {
    const code = normalizeCurrency(currency, '')
    if (!code) return null
    return currencyOptions.value.find((item) => item.code === code) || null
  }

  const applyPersistedSource = (source) => {
    const sourceObject = Array.isArray(source)
      ? { transactions: source }
      : source && typeof source === 'object'
        ? source
        : null
    if (!sourceObject) return false
    const sourceTransactions = sourceObject.transactions || sourceObject.ledger
    const hasWalletPayload =
      Array.isArray(sourceTransactions) ||
      Array.isArray(sourceObject.registeredCurrencies) ||
      Array.isArray(sourceObject.currencies) ||
      Boolean(sourceObject.exchangeRates)
    if (!hasWalletPayload) return false
    primaryCurrency.value = normalizeCurrency(
      sourceObject.primaryCurrency || sourceObject.defaultCurrency || sourceObject.settings?.primaryCurrency,
      primaryCurrency.value,
    )
    registeredCurrencies.value = normalizeWalletCurrencyList(
      sourceObject.registeredCurrencies || sourceObject.currencies || registeredCurrencies.value,
    )
    exchangeRates.value = normalizeWalletExchangeRates(sourceObject.exchangeRates || sourceObject.rates)
    transactions.value = normalizeWalletTransactions(
      Array.isArray(sourceTransactions) ? sourceTransactions : [],
      primaryCurrency.value,
    )
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(WALLET_STORAGE_KEY, {
      version: WALLET_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(WALLET_STORAGE_KEY, {
      version: WALLET_STORAGE_VERSION,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    primaryCurrency: primaryCurrency.value,
    registeredCurrencies: registeredCurrencies.value.map((item) => ({ ...item })),
    exchangeRates: {
      reference: { ...exchangeRates.value.reference },
      ratesToUsd: { ...exchangeRates.value.ratesToUsd },
    },
    transactions: transactions.value.map((item) => ({ ...item })),
  })

  const createBackupSnapshotAsync = async () => createBackupSnapshot()

  const restoreFromBackup = (snapshot = {}) => {
    const source =
      snapshot && typeof snapshot.wallet === 'object' && snapshot.wallet
        ? snapshot.wallet
        : snapshot
    return applyPersistedSource(source)
  }

  const persistToStorage = () => {
    writePersistedState(WALLET_STORAGE_KEY, createBackupSnapshot(), {
      version: WALLET_STORAGE_VERSION,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    primaryCurrency.value = DEFAULT_CURRENCY
    registeredCurrencies.value = createDefaultRegisteredCurrencies()
    exchangeRates.value = createDefaultWalletExchangeRates()
    transactions.value = []
  }

  const hydratedFromLocal = hydrateFromStorage()
  if (!hydratedFromLocal) {
    transactions.value = createSeedTransactions()
  }

  void (async () => {
    if (!hydratedFromLocal) {
      await hydrateFromStorageAsync()
    }
    hasFinishedStorageHydration.value = true
    persistToStorage()
  })()

  watch(
    [transactions, primaryCurrency, registeredCurrencies, exchangeRates],
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    transactions,
    primaryCurrency,
    registeredCurrencies,
    exchangeRates,
    transactionCount,
    transactionSourceSummary,
    balances,
    primaryBalance,
    currencyOptions,
    exchangeRateRows,
    primaryCurrencyDefinition,
    hasFinishedStorageHydration,
    findTransactionById,
    findTransactionBySource,
    listTransactionsBySourceFilter,
    listTransactionsByCounterparty,
    summarizeCounterpartyLedger,
    addTransaction,
    addTransferTransaction,
    addChatTransferTransaction,
    setPrimaryCurrency,
    registerCurrency,
    registerWorldCurrency,
    setUsdCnyRate,
    setCurrencyCnyRate,
    findCurrencyOption,
    removeTransaction,
    anonymizeTransaction,
    cleanupRelationshipForProfile,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
