import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { readPersistedState, readPersistedStateAsync, writePersistedState } from '../lib/persistence'

const WALLET_STORAGE_KEY = 'store:wallet'
const WALLET_STORAGE_VERSION = 1
const WALLET_TRANSACTION_LIMIT = 200
const DEFAULT_CURRENCY = 'CNY'
export const WALLET_TRANSACTION_SOURCE_FILTERS = Object.freeze({
  ALL: 'all',
  MANUAL: 'manual',
  CHAT: 'chat',
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

const normalizeCurrency = (value, fallback = DEFAULT_CURRENCY) => {
  const normalized = normalizeText(value, fallback, 8).toUpperCase()
  return /^[A-Z]{2,8}$/.test(normalized) ? normalized : fallback
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

const createWalletTransactionId = () => `wallet_tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeTransactionType = (value, fallback = 'transfer') => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return WALLET_TRANSACTION_TYPES.has(normalized) ? normalized : fallback
}

const isChatTransferTransaction = (transaction) => transaction?.sourceModule === 'chat_transfer'

const normalizeCounterpartyKey = (value) => normalizeText(value, '', 120).toLowerCase()

const normalizeTransactionSourceFilter = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return WALLET_TRANSACTION_SOURCE_FILTER_VALUES.has(normalized)
    ? normalized
    : WALLET_TRANSACTION_SOURCE_FILTERS.ALL
}

const normalizeWalletTransaction = (rawTransaction, index = 0) => {
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
    currency: normalizeCurrency(rawTransaction.currency),
    sourceModule: normalizeText(rawTransaction.sourceModule, 'wallet', 40),
    sourceId: normalizeText(rawTransaction.sourceId, '', 140),
    createdAt,
    updatedAt: Math.max(0, toInt(rawTransaction.updatedAt, createdAt)),
  }
}

const normalizeWalletTransactions = (rawTransactions) => {
  if (!Array.isArray(rawTransactions)) return []
  const seenIds = new Set()
  const normalized = []
  rawTransactions.forEach((item, index) => {
    const record = normalizeWalletTransaction(item, index)
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
  const transactions = ref([])
  const hasFinishedStorageHydration = ref(false)

  const transactionCount = computed(() => transactions.value.length)
  const transactionSourceSummary = computed(() => {
    const chat = transactions.value.filter(isChatTransferTransaction).length
    const manual = transactions.value.length - chat
    return {
      all: transactions.value.length,
      manual,
      chat,
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

  const primaryBalance = computed(() => balances.value.find((item) => item.currency === DEFAULT_CURRENCY) || {
    currency: DEFAULT_CURRENCY,
    amountCents: 0,
    amount: '0.00',
  })

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
    if (normalizedFilter === WALLET_TRANSACTION_SOURCE_FILTERS.MANUAL) {
      return transactions.value.filter((transaction) => !isChatTransferTransaction(transaction))
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
      manualCount: records.filter((transaction) => !isChatTransferTransaction(transaction)).length,
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
      id: input.id || createWalletTransactionId(),
      createdAt: input.createdAt || now,
      updatedAt: now,
    })
    if (!transaction) return null
    transactions.value.unshift(transaction)
    if (transactions.value.length > WALLET_TRANSACTION_LIMIT) {
      transactions.value.splice(WALLET_TRANSACTION_LIMIT)
    }
    return transaction
  }

  const addTransferTransaction = ({ amount, currency = DEFAULT_CURRENCY, counterparty = '', note = '' } = {}) =>
    addTransaction({
      type: 'transfer',
      title: '聊天转账',
      amount,
      currency,
      counterparty,
      note,
      sourceModule: 'wallet_manual',
    })

  const addChatTransferTransaction = ({
    messageId = '',
    amount,
    currency = DEFAULT_CURRENCY,
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
      currency,
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

  const applyPersistedSource = (source) => {
    const sourceTransactions = Array.isArray(source)
      ? source
      : source && typeof source === 'object'
        ? source.transactions || source.ledger
        : null
    if (!Array.isArray(sourceTransactions)) return false
    transactions.value = normalizeWalletTransactions(sourceTransactions)
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
    transactions,
    () => {
      if (!hasFinishedStorageHydration.value) return
      persistToStorage()
    },
    { deep: true },
  )

  return {
    transactions,
    transactionCount,
    transactionSourceSummary,
    balances,
    primaryBalance,
    hasFinishedStorageHydration,
    findTransactionById,
    findTransactionBySource,
    listTransactionsBySourceFilter,
    listTransactionsByCounterparty,
    summarizeCounterpartyLedger,
    addTransaction,
    addTransferTransaction,
    addChatTransferTransaction,
    removeTransaction,
    createBackupSnapshot,
    createBackupSnapshotAsync,
    restoreFromBackup,
    resetForTesting,
    saveNow,
  }
})
