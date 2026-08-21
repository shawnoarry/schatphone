import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import {
  readPersistedState,
  readPersistedStateAsync,
  writePersistedState,
} from '../lib/persistence'
import {
  anonymizeRelationshipText,
  bindingMatchesProfile,
  clearRelationshipBinding,
  normalizeRelationshipBinding,
} from '../lib/relationship-cleanup-helpers'
import { normalizeSharedExperienceId } from '../lib/shared-experience-contract'
import {
  DEFAULT_WALLET_CURRENCY,
  SYSTEM_WALLET_CURRENCIES,
  createDefaultWalletExchangeRates,
  createMoneyQuote as createWalletMoneyQuote,
  deriveRateToUsdFromCnyRate,
  formatExchangeRate,
  formatMoney as formatWalletMoneyValue,
  formatMoneyAmount as formatWalletMoneyAmountValue,
  getRateToCny,
  normalizeDecimalString,
  normalizeCurrencyCode,
  normalizeCurrencyDefinition,
  normalizeMoneyQuote,
  normalizeWalletExchangeRates,
  reviseWalletExchangeRates,
} from '../lib/currency-system'
import {
  WALLET_BANK_INSTITUTIONS,
  createDefaultWalletBankAccounts,
  createDefaultWalletPaymentCards,
  findWalletBankInstitution,
  normalizeWalletBankAccounts,
  normalizeWalletPaymentCards,
} from '../lib/wallet-banking'
import {
  createDefaultOwnedWalletCardAppearanceIds,
  createDefaultSelectedWalletCardAppearances,
  findWalletCardAppearanceById as findWalletCardAppearanceDefinition,
  listWalletCardAppearances as listWalletCardAppearanceDefinitions,
  normalizeOwnedWalletCardAppearanceIds,
  normalizeSelectedWalletCardAppearances,
  normalizeWalletCardAppearanceProgress,
  WALLET_CARD_APPEARANCE_OWNERSHIP_VERSION,
} from '../lib/wallet-card-appearances'

export {
  DEFAULT_WALLET_CURRENCY,
  formatExchangeRate as formatWalletExchangeRate,
  normalizeCurrencyCode as normalizeWalletCurrency,
} from '../lib/currency-system'

const WALLET_STORAGE_KEY = 'store:wallet'
const WALLET_STORAGE_VERSION = 2
const WALLET_TRANSACTION_LIMIT = 200
const WALLET_KNOWN_PAYEE_LIMIT = 200
const DEFAULT_CURRENCY = DEFAULT_WALLET_CURRENCY
export const WALLET_TRANSACTION_SOURCE_FILTERS = Object.freeze({
  ALL: 'all',
  MANUAL: 'manual',
  CHAT: 'chat',
  ORDERS: 'orders',
})
const WALLET_TRANSACTION_TYPES = new Set(['income', 'expense', 'transfer'])
const WALLET_TRANSFER_DIRECTIONS = new Set(['incoming', 'outgoing'])
const WALLET_TRANSFER_STATUSES = new Set(['completed'])
const WALLET_COMMERCE_PAYMENT_STATUSES = new Set(['completed', 'reversed', 'refunded'])
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

const systemCurrencyByCode = new Map(
  SYSTEM_WALLET_CURRENCIES.map((currency) => [currency.code, currency]),
)

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
    const systemDefinition = systemCurrencyByCode.get(normalized.code)
    byCode.set(normalized.code, {
      ...(byCode.get(normalized.code) || {}),
      ...normalized,
      exponent: systemDefinition?.exponent ?? normalized.exponent,
      source: systemDefinition?.source ?? normalized.source,
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
  const safeCents = Number.isFinite(Number(amountCents))
    ? Math.abs(Math.floor(Number(amountCents)))
    : 0
  return (safeCents / 100).toFixed(2)
}

const formatSignedAmount = (amountCents = 0) =>
  `${Number(amountCents) < 0 ? '-' : ''}${formatAmount(amountCents)}`

const createWalletTransactionId = () =>
  `wallet_tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const normalizeTransactionType = (value, fallback = 'transfer') => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return WALLET_TRANSACTION_TYPES.has(normalized) ? normalized : fallback
}

const normalizeTransferDirection = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return WALLET_TRANSFER_DIRECTIONS.has(normalized) ? normalized : ''
}

const isChatTransferTransaction = (transaction) =>
  transaction?.sourceModule === 'chat_transfer' ||
  transaction?.sourceModule === 'wallet_payee_transfer'

const isOrderExpenseTransaction = (transaction) =>
  transaction?.sourceModule === 'shopping_wallet_expense' ||
  transaction?.sourceModule === 'food_delivery_wallet_expense' ||
  transaction?.sourceModule === 'wallet_commerce_payment' ||
  transaction?.paymentKind === 'commerce_order'

const normalizeCounterpartyKey = (value) => normalizeText(value, '', 120).toLowerCase()

const normalizeTransactionSourceFilter = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return WALLET_TRANSACTION_SOURCE_FILTER_VALUES.has(normalized)
    ? normalized
    : WALLET_TRANSACTION_SOURCE_FILTERS.ALL
}

const transactionMonthKey = (timestamp) => {
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const normalizeTransactionMonthKey = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(normalized) ? normalized : ''
}

const normalizePositiveInt = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : fallback
}

const normalizeKnownPayeeAccount = (rawPayee, index = 0) => {
  if (!rawPayee || typeof rawPayee !== 'object') return null
  const payeeAccountId = normalizeText(rawPayee.payeeAccountId || rawPayee.id, '', 140)
  const ownerProfileId = normalizePositiveInt(rawPayee.ownerProfileId || rawPayee.profileId)
  const ownerName = normalizeText(rawPayee.ownerName || rawPayee.name, '', 120)
  const institutionId = normalizeText(rawPayee.institutionId, '', 120).toLowerCase()
  const currency = normalizeCurrency(rawPayee.currency, '')
  const accountNumberLast4 = String(rawPayee.accountNumberLast4 || rawPayee.accountNumber || '')
    .replace(/\D/g, '')
    .slice(-4)
  if (
    !payeeAccountId ||
    !ownerProfileId ||
    !ownerName ||
    !findWalletBankInstitution(institutionId) ||
    !currency ||
    accountNumberLast4.length !== 4
  ) {
    return null
  }

  const disclosedAt = Math.max(0, toInt(rawPayee.disclosedAt, Date.now() - index))
  return {
    id: payeeAccountId,
    payeeAccountId,
    ownerProfileId,
    ownerRoleId: normalizeText(rawPayee.ownerRoleId || rawPayee.roleId, '', 40),
    ownerContactId: normalizePositiveInt(rawPayee.ownerContactId || rawPayee.contactId),
    ownerName,
    institutionId,
    currency,
    accountNumberLast4,
    maskedAccountNumber: `•••• ${accountNumberLast4}`,
    status: rawPayee.status === 'closed' ? 'closed' : 'active',
    sourceChatId: normalizePositiveInt(rawPayee.sourceChatId || rawPayee.chatId),
    sourceMessageId: normalizeText(rawPayee.sourceMessageId || rawPayee.messageId, '', 140),
    disclosedAt,
    updatedAt: Math.max(disclosedAt, toInt(rawPayee.updatedAt, disclosedAt)),
  }
}

const normalizeKnownPayeeAccounts = (rawPayees = []) => {
  if (!Array.isArray(rawPayees)) return []
  const byId = new Map()
  rawPayees.forEach((payee, index) => {
    const normalized = normalizeKnownPayeeAccount(payee, index)
    if (!normalized) return
    const existing = byId.get(normalized.id)
    if (!existing || normalized.updatedAt >= existing.updatedAt) {
      byId.set(normalized.id, normalized)
    }
  })
  return [...byId.values()]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, WALLET_KNOWN_PAYEE_LIMIT)
}

const createWalletReceiptNumber = (createdAt = Date.now()) => {
  const date = new Date(createdAt)
  const datePart = Number.isNaN(date.getTime())
    ? '00000000'
    : [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('')
  return `SP${datePart}${String(Math.floor(Math.random() * 1000000)).padStart(6, '0')}`
}

const normalizeWalletTransaction = (
  rawTransaction,
  index = 0,
  fallbackCurrency = DEFAULT_CURRENCY,
) => {
  if (!rawTransaction || typeof rawTransaction !== 'object') return null

  const amountCents =
    Number.isFinite(Number(rawTransaction.amountCents)) && Number(rawTransaction.amountCents) > 0
      ? Math.floor(Number(rawTransaction.amountCents))
      : normalizeAmountCents(rawTransaction.amount)
  if (amountCents <= 0) return null

  const createdAt = Math.max(0, toInt(rawTransaction.createdAt, Date.now()))
  const type = normalizeTransactionType(rawTransaction.type)
  const transferStatus = WALLET_TRANSFER_STATUSES.has(rawTransaction.transferStatus)
    ? rawTransaction.transferStatus
    : ''

  return {
    id:
      typeof rawTransaction.id === 'string' && rawTransaction.id.trim()
        ? rawTransaction.id.trim()
        : `wallet_tx_legacy_${Date.now()}_${index}`,
    type,
    direction: normalizeTransferDirection(rawTransaction.direction),
    title: normalizeText(rawTransaction.title, type === 'expense' ? '支出' : '转账记录', 80),
    counterparty: normalizeText(rawTransaction.counterparty, '', 120),
    note: normalizeText(rawTransaction.note, '', 240),
    amountCents,
    currency: normalizeCurrency(rawTransaction.currency, fallbackCurrency),
    accountId: normalizeText(rawTransaction.accountId, '', 120),
    cardId: normalizeText(rawTransaction.cardId, '', 120),
    sourceModule: normalizeText(rawTransaction.sourceModule, 'wallet', 40),
    sourceId: normalizeText(rawTransaction.sourceId, '', 140),
    sharedExperienceId: normalizeSharedExperienceId(rawTransaction.sharedExperienceId),
    transferStatus,
    paymentKind: normalizeText(rawTransaction.paymentKind, '', 60),
    paymentStatus: WALLET_COMMERCE_PAYMENT_STATUSES.has(rawTransaction.paymentStatus)
      ? rawTransaction.paymentStatus
      : '',
    idempotencyKey: normalizeText(rawTransaction.idempotencyKey, '', 180),
    relatedTransactionId: normalizeText(rawTransaction.relatedTransactionId, '', 140),
    receiptNumber: normalizeText(rawTransaction.receiptNumber, '', 40),
    payeeAccountId: normalizeText(rawTransaction.payeeAccountId, '', 140),
    recipientProfileId: normalizePositiveInt(rawTransaction.recipientProfileId),
    recipientContactId: normalizePositiveInt(rawTransaction.recipientContactId),
    recipientAccountId: normalizeText(rawTransaction.recipientAccountId, '', 140),
    recipientInstitutionId: normalizeText(
      rawTransaction.recipientInstitutionId,
      '',
      120,
    ).toLowerCase(),
    recipientAccountLast4: String(rawTransaction.recipientAccountLast4 || '')
      .replace(/\D/g, '')
      .slice(-4),
    sourceChatId: normalizePositiveInt(rawTransaction.sourceChatId),
    sourceMessageId: normalizeText(rawTransaction.sourceMessageId, '', 140),
    relationshipBinding: normalizeRelationshipBinding(rawTransaction.relationshipBinding),
    quoteSnapshot: normalizeMoneyQuote(
      rawTransaction.quoteSnapshot || rawTransaction.moneyQuote || rawTransaction.checkoutQuote,
    ),
    createdAt,
    updatedAt: Math.max(0, toInt(rawTransaction.updatedAt, createdAt)),
  }
}

export const migrateWalletStorage = ({ version, data } = {}) => {
  if (version === 1) {
    return data && typeof data === 'object' ? { ...data } : null
  }
  return null
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
  return normalized.sort((a, b) => b.createdAt - a.createdAt).slice(0, WALLET_TRANSACTION_LIMIT)
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
  const bankAccounts = ref(createDefaultWalletBankAccounts())
  const paymentCards = ref(createDefaultWalletPaymentCards())
  const ownedCardAppearanceIds = ref(createDefaultOwnedWalletCardAppearanceIds())
  const selectedAppearanceByCardId = ref(createDefaultSelectedWalletCardAppearances())
  const cardAppearanceProgress = ref({})
  const knownPayeeAccounts = ref([])
  const activeCardId = ref(paymentCards.value.find((card) => card.isDefault)?.id || '')
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
  const transactionMonths = computed(() => {
    const monthCounts = new Map()
    transactions.value.forEach((transaction) => {
      const key = transactionMonthKey(transaction.createdAt)
      if (!key) return
      monthCounts.set(key, (monthCounts.get(key) || 0) + 1)
    })
    return [...monthCounts.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.key.localeCompare(a.key))
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

  const primaryBalance = computed(
    () =>
      balances.value.find((item) => item.currency === primaryCurrency.value) || {
        currency: primaryCurrency.value,
        amountCents: 0,
        amount: '0.00',
      },
  )

  const findBankAccountById = (accountId = '') => {
    const id = normalizeText(accountId, '', 120)
    if (!id) return null
    return bankAccounts.value.find((account) => account.id === id) || null
  }

  const findPaymentCardById = (cardId = '') => {
    const id = normalizeText(cardId, '', 120)
    if (!id) return null
    return paymentCards.value.find((card) => card.id === id) || null
  }

  const listCardAppearances = (cardId = '') => {
    const owned = new Set(ownedCardAppearanceIds.value)
    const selectedId = selectedAppearanceByCardId.value[cardId] || ''
    return listWalletCardAppearanceDefinitions(cardId).map((item) => ({
      ...item,
      isOwned: owned.has(item.id),
      isSelected: item.id === selectedId,
      isEquippable:
        item.assetStatus === 'ready' && item.equipSupported !== false && owned.has(item.id),
      progress: cardAppearanceProgress.value[item.id] || null,
    }))
  }

  const findSelectedCardAppearance = (cardId = '') => {
    const selectedId = selectedAppearanceByCardId.value[cardId]
    const selected = findWalletCardAppearanceDefinition(selectedId)
    if (selected?.paymentCardId === cardId) return selected
    return listWalletCardAppearanceDefinitions(cardId)[0] || null
  }

  const equipCardAppearance = (cardId = '', appearanceId = '') => {
    const card = findPaymentCardById(cardId)
    const item = findWalletCardAppearanceDefinition(appearanceId)
    if (
      !card ||
      !item ||
      item.paymentCardId !== card.id ||
      item.assetStatus !== 'ready' ||
      item.equipSupported === false ||
      !ownedCardAppearanceIds.value.includes(item.id)
    ) {
      return null
    }
    selectedAppearanceByCardId.value = {
      ...selectedAppearanceByCardId.value,
      [card.id]: item.id,
    }
    return { ...item, isOwned: true, isSelected: true, isEquippable: true }
  }

  const unlockCardAppearance = (appearanceId = '') => {
    const item = findWalletCardAppearanceDefinition(appearanceId)
    if (!item || item.assetStatus !== 'ready') return null
    ownedCardAppearanceIds.value = normalizeOwnedWalletCardAppearanceIds([
      ...ownedCardAppearanceIds.value,
      item.id,
    ])
    return { ...item, isOwned: true }
  }

  const findKnownPayeeAccountById = (payeeAccountId = '') => {
    const id = normalizeText(payeeAccountId, '', 140)
    if (!id) return null
    return knownPayeeAccounts.value.find((payee) => payee.id === id) || null
  }

  const listKnownPayeeAccountsForProfile = (profileId = 0) => {
    const numericProfileId = normalizePositiveInt(profileId)
    if (!numericProfileId) return []
    return knownPayeeAccounts.value.filter(
      (payee) => payee.ownerProfileId === numericProfileId && payee.status === 'active',
    )
  }

  const rememberRolePayeeAccount = ({
    account,
    profile,
    contact,
    sourceChatId = 0,
    sourceMessageId = '',
    disclosedAt = Date.now(),
  } = {}) => {
    const normalized = normalizeKnownPayeeAccount({
      id: account?.id,
      payeeAccountId: account?.id,
      ownerProfileId: profile?.id,
      ownerRoleId: profile?.roleId,
      ownerContactId: contact?.id,
      ownerName: profile?.name || contact?.name,
      institutionId: account?.institutionId,
      currency: account?.currency,
      accountNumberLast4: account?.accountNumberLast4 || account?.accountNumber,
      status: account?.status,
      sourceChatId: sourceChatId || contact?.id,
      sourceMessageId,
      disclosedAt,
      updatedAt: Date.now(),
    })
    if (!normalized || normalized.status !== 'active') return null

    knownPayeeAccounts.value = normalizeKnownPayeeAccounts([
      normalized,
      ...knownPayeeAccounts.value.filter((payee) => payee.id !== normalized.id),
    ])
    return findKnownPayeeAccountById(normalized.id)
  }

  const removeKnownPayeeAccountsForProfile = (profileId = 0) => {
    const numericProfileId = normalizePositiveInt(profileId)
    if (!numericProfileId) return 0
    const before = knownPayeeAccounts.value.length
    knownPayeeAccounts.value = knownPayeeAccounts.value.filter(
      (payee) => payee.ownerProfileId !== numericProfileId,
    )
    return before - knownPayeeAccounts.value.length
  }

  const findDefaultBankAccountForCurrency = (currency = '') => {
    const code = normalizeCurrency(currency, '')
    if (!code) return null
    return (
      bankAccounts.value.find(
        (account) => account.isDefaultForCurrency && account.currencies.includes(code),
      ) ||
      bankAccounts.value.find((account) => account.currencies.includes(code)) ||
      null
    )
  }

  const resolveTransactionAccountId = (transaction = {}) => {
    const explicitAccount = findBankAccountById(transaction?.accountId)
    const currency = normalizeCurrency(transaction?.currency, '')
    if (explicitAccount?.currencies.includes(currency)) return explicitAccount.id
    return findDefaultBankAccountForCurrency(currency)?.id || ''
  }

  const accountTransactionTotals = computed(() => {
    const totals = new Map()
    transactions.value.forEach((transaction) => {
      const accountId = resolveTransactionAccountId(transaction)
      if (!accountId) return
      const key = `${accountId}:${transaction.currency}`
      const sign = transaction.type === 'expense' ? -1 : 1
      totals.set(key, (totals.get(key) || 0) + sign * transaction.amountCents)
    })
    return totals
  })

  const bankAccountSummaries = computed(() =>
    bankAccounts.value.map((account) => {
      const accountBalances = account.currencies.map((currency) => {
        const amountCents = accountTransactionTotals.value.get(`${account.id}:${currency}`) || 0
        return {
          currency,
          amountCents,
          amount: formatSignedAmount(amountCents),
        }
      })
      return {
        ...account,
        institution: findWalletBankInstitution(account.institutionId),
        balances: accountBalances,
        primaryBalance:
          accountBalances.find((balance) => balance.currency === account.primaryCurrency) ||
          accountBalances[0] ||
          null,
      }
    }),
  )

  const paymentCardSummaries = computed(() =>
    paymentCards.value.map((card) => ({
      ...card,
      institution: findWalletBankInstitution(card.institutionId),
      account: bankAccountSummaries.value.find((account) => account.id === card.accountId) || null,
      appearance: findSelectedCardAppearance(card.id),
      creditLimit:
        card.kind === 'credit'
          ? { amountMinor: card.creditLimitMinor, currency: card.creditLimitCurrency }
          : null,
    })),
  )

  const activePaymentCard = computed(
    () =>
      paymentCardSummaries.value.find((card) => card.id === activeCardId.value) ||
      paymentCardSummaries.value.find((card) => card.isDefault) ||
      paymentCardSummaries.value[0] ||
      null,
  )

  const knownPayeeAccountSummaries = computed(() =>
    knownPayeeAccounts.value.map((payee) => ({
      ...payee,
      institution: findWalletBankInstitution(payee.institutionId),
    })),
  )

  const currencyOptions = computed(() => {
    const byCode = new Map()
    normalizeWalletCurrencyList(registeredCurrencies.value).forEach((currency) => {
      byCode.set(currency.code, currency)
    })
    ;[
      primaryCurrency.value,
      ...transactions.value.map((transaction) => transaction.currency),
    ].forEach((currency) => {
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
      const rateToCny =
        currency.code === 'CNY' ? 1 : getRateToCny(exchangeRates.value, currency.code)
      return {
        ...currency,
        rateToCny,
        rateToCnyLabel: formatExchangeRate(rateToCny),
        isRateAvailable: currency.code === 'CNY' || rateToCny > 0,
        isPrimary: currency.code === primaryCurrency.value,
      }
    }),
  )

  const primaryCurrencyDefinition = computed(
    () =>
      currencyOptions.value.find((currency) => currency.code === primaryCurrency.value) ||
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
    return (
      transactions.value.find((item) => item.sourceModule === module && item.sourceId === id) ||
      null
    )
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
        (transaction) =>
          !isChatTransferTransaction(transaction) && !isOrderExpenseTransaction(transaction),
      )
    }
    return transactions.value.slice()
  }

  const listTransactionsByMonth = (monthKey = '') => {
    const normalizedMonthKey = normalizeTransactionMonthKey(monthKey)
    if (!normalizedMonthKey) return []
    return transactions.value.filter(
      (transaction) => transactionMonthKey(transaction.createdAt) === normalizedMonthKey,
    )
  }

  const summarizeTransactionsByMonth = (monthKey = '') => {
    const normalizedMonthKey = normalizeTransactionMonthKey(monthKey)
    const records = listTransactionsByMonth(normalizedMonthKey)
    const totals = new Map()

    records.forEach((transaction) => {
      const current = totals.get(transaction.currency) || {
        incomeCents: 0,
        expenseCents: 0,
        count: 0,
      }
      if (transaction.type === 'expense') {
        current.expenseCents += transaction.amountCents
      } else {
        current.incomeCents += transaction.amountCents
      }
      current.count += 1
      totals.set(transaction.currency, current)
    })

    return {
      monthKey: normalizedMonthKey,
      count: records.length,
      currencies: [...totals.entries()]
        .map(([currency, total]) => {
          const netCents = total.incomeCents - total.expenseCents
          return {
            currency,
            count: total.count,
            incomeCents: total.incomeCents,
            expenseCents: total.expenseCents,
            netCents,
            income: formatAmount(total.incomeCents),
            expense: formatAmount(total.expenseCents),
            net: formatSignedAmount(netCents),
          }
        })
        .sort((a, b) => a.currency.localeCompare(b.currency)),
      latestTransaction: records[0] || null,
    }
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
        (transaction) =>
          !isChatTransferTransaction(transaction) && !isOrderExpenseTransaction(transaction),
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

  const listTransactionsByAccount = (accountId = '') => {
    const account = findBankAccountById(accountId)
    if (!account) return []
    return transactions.value.filter(
      (transaction) => resolveTransactionAccountId(transaction) === account.id,
    )
  }

  const listTransactionsByCard = (cardId = '') => {
    const card = findPaymentCardById(cardId)
    if (!card) return []
    if (card.accountId) return listTransactionsByAccount(card.accountId)
    return transactions.value.filter((transaction) => transaction.cardId === card.id)
  }

  const selectPaymentCard = (cardId = '') => {
    const card = findPaymentCardById(cardId)
    if (!card) return null
    activeCardId.value = card.id
    return card
  }

  const setDefaultPaymentCard = (cardId = '') => {
    const card = findPaymentCardById(cardId)
    if (!card || card.status !== 'active') return null
    paymentCards.value = normalizeWalletPaymentCards(
      paymentCards.value.map((item) => ({ ...item, isDefault: item.id === card.id })),
    )
    activeCardId.value = card.id
    return findPaymentCardById(card.id)
  }

  const togglePaymentCardFrozen = (cardId = '') => {
    const card = findPaymentCardById(cardId)
    if (!card) return null
    const nextStatus = card.status === 'frozen' ? 'active' : 'frozen'
    paymentCards.value = normalizeWalletPaymentCards(
      paymentCards.value.map((item) =>
        item.id === card.id ? { ...item, status: nextStatus } : item,
      ),
    )
    return findPaymentCardById(card.id)
  }

  const addTransaction = (input = {}) => {
    const now = Date.now()
    const transaction = normalizeWalletTransaction(
      {
        ...input,
        currency: input.currency || primaryCurrency.value,
        id: input.id || createWalletTransactionId(),
        createdAt: input.createdAt || now,
        updatedAt: now,
      },
      0,
      primaryCurrency.value,
    )
    if (!transaction) return null
    const requestedAccount = findBankAccountById(transaction.accountId)
    const account = requestedAccount?.currencies.includes(transaction.currency)
      ? requestedAccount
      : findDefaultBankAccountForCurrency(transaction.currency)
    transaction.accountId = account?.id || ''

    const requestedCard = findPaymentCardById(transaction.cardId)
    const matchingCard = requestedCard?.supportedCurrencies.includes(transaction.currency)
      ? requestedCard
      : paymentCards.value.find(
          (card) =>
            card.accountId === transaction.accountId &&
            card.status === 'active' &&
            card.supportedCurrencies.includes(transaction.currency),
        )
    transaction.cardId = matchingCard?.id || ''
    transactions.value.unshift(transaction)
    if (transactions.value.length > WALLET_TRANSACTION_LIMIT) {
      transactions.value.splice(WALLET_TRANSACTION_LIMIT)
    }
    return transaction
  }

  const findCommercePaymentByIdempotencyKey = (idempotencyKey = '') => {
    const key = normalizeText(idempotencyKey, '', 180)
    if (!key) return null
    return (
      transactions.value.find(
        (transaction) =>
          transaction.paymentKind === 'commerce_order' &&
          transaction.idempotencyKey === key &&
          transaction.paymentStatus === 'completed',
      ) || null
    )
  }

  const commitCommercePayment = ({
    amount,
    amountCents,
    currency = '',
    accountId = '',
    cardId = '',
    counterparty = '',
    note = '',
    sourceModule = 'wallet_commerce_payment',
    sourceId = '',
    idempotencyKey = '',
    quoteSnapshot = null,
    createdAt = Date.now(),
  } = {}) => {
    const normalizedKey = normalizeText(idempotencyKey, '', 180)
    const normalizedSourceId = normalizeText(sourceId, '', 140)
    if (!normalizedKey || !normalizedSourceId) {
      return { ok: false, reason: 'payment_identity_invalid', transaction: null }
    }

    const existing = findCommercePaymentByIdempotencyKey(normalizedKey)
    if (existing) return { ok: true, reason: 'idempotent_replay', transaction: existing }

    const normalizedCurrency = normalizeCurrency(currency || primaryCurrency.value, '')
    const normalizedAmountCents = Number.isFinite(Number(amountCents))
      ? Math.floor(Number(amountCents))
      : normalizeAmountCents(amount)
    if (!normalizedCurrency || normalizedAmountCents <= 0) {
      return { ok: false, reason: 'amount_invalid', transaction: null }
    }

    const account =
      (accountId && findBankAccountById(accountId)) ||
      findDefaultBankAccountForCurrency(normalizedCurrency)
    if (!account || !account.currencies.includes(normalizedCurrency)) {
      return { ok: false, reason: 'account_unavailable', transaction: null }
    }

    const balance = bankAccountSummaries.value
      .find((item) => item.id === account.id)
      ?.balances.find((item) => item.currency === normalizedCurrency)?.amountCents || 0
    if (normalizedAmountCents > balance) {
      return { ok: false, reason: 'insufficient_funds', transaction: null }
    }

    const requestedCard = cardId ? findPaymentCardById(cardId) : null
    const paymentCard =
      requestedCard &&
      requestedCard.status === 'active' &&
      requestedCard.supportedCurrencies.includes(normalizedCurrency) &&
      (!requestedCard.accountId || requestedCard.accountId === account.id)
        ? requestedCard
        : paymentCards.value.find(
            (card) =>
              card.status === 'active' &&
              card.supportedCurrencies.includes(normalizedCurrency) &&
              (!card.accountId || card.accountId === account.id),
          )
    if (!paymentCard) {
      return { ok: false, reason: 'payment_card_unavailable', transaction: null }
    }

    const transaction = addTransaction({
      type: 'expense',
      direction: 'outgoing',
      title: 'Food Delivery payment',
      amountCents: normalizedAmountCents,
      currency: normalizedCurrency,
      accountId: account.id,
      cardId: paymentCard.id,
      counterparty: normalizeText(counterparty, 'Food Delivery', 120),
      note,
      sourceModule: normalizeText(sourceModule, 'wallet_commerce_payment', 60),
      sourceId: normalizedSourceId,
      paymentKind: 'commerce_order',
      paymentStatus: 'completed',
      idempotencyKey: normalizedKey,
      quoteSnapshot,
      transferStatus: 'completed',
      receiptNumber: createWalletReceiptNumber(createdAt),
      createdAt,
    })

    return transaction
      ? { ok: true, reason: '', transaction }
      : { ok: false, reason: 'transaction_invalid', transaction: null }
  }

  const reverseCommercePayment = ({
    transactionId = '',
    reason = '',
    createdAt = Date.now(),
  } = {}) => {
    const original = findTransactionById(transactionId)
    if (!original || original.paymentKind !== 'commerce_order') {
      return { ok: false, reason: 'payment_not_found', transaction: null }
    }
    if (original.paymentStatus !== 'completed') {
      return { ok: false, reason: 'payment_not_reversible', transaction: null }
    }

    const existing = transactions.value.find(
      (transaction) =>
        transaction.paymentKind === 'commerce_reversal' &&
        transaction.relatedTransactionId === original.id,
    )
    if (existing) return { ok: true, reason: 'idempotent_replay', transaction: existing }

    const transaction = addTransaction({
      type: 'income',
      direction: 'incoming',
      title: 'Food Delivery payment reversal',
      amountCents: original.amountCents,
      currency: original.currency,
      accountId: original.accountId,
      cardId: original.cardId,
      counterparty: original.counterparty,
      note: normalizeText(reason, 'Order persistence compensation', 240),
      sourceModule: 'wallet_commerce_reversal',
      sourceId: original.id,
      paymentKind: 'commerce_reversal',
      paymentStatus: 'reversed',
      relatedTransactionId: original.id,
      transferStatus: 'completed',
      receiptNumber: createWalletReceiptNumber(createdAt),
      createdAt,
    })
    return transaction
      ? { ok: true, reason: '', transaction }
      : { ok: false, reason: 'transaction_invalid', transaction: null }
  }

  const addTransferTransaction = ({
    amount,
    currency = '',
    accountId = '',
    cardId = '',
    direction = '',
    counterparty = '',
    note = '',
    relationshipBinding = null,
  } = {}) =>
    addTransaction({
      type:
        normalizeTransferDirection(direction) === 'outgoing'
          ? 'expense'
          : normalizeTransferDirection(direction) === 'incoming'
            ? 'income'
            : 'transfer',
      direction: normalizeTransferDirection(direction),
      title:
        normalizeTransferDirection(direction) === 'outgoing'
          ? '转账'
          : normalizeTransferDirection(direction) === 'incoming'
            ? '收款'
            : '聊天转账',
      amount,
      currency: currency || primaryCurrency.value,
      accountId,
      cardId,
      counterparty,
      note,
      sourceModule: 'wallet_manual',
      relationshipBinding,
    })

  const addRolePayeeTransfer = ({
    payeeAccountId = '',
    amount,
    accountId = '',
    cardId = '',
    note = '',
    sourceChatId = 0,
    sourceMessageId = '',
  } = {}) => {
    const payee = findKnownPayeeAccountById(payeeAccountId)
    if (!payee || payee.status !== 'active') {
      return { ok: false, reason: 'payee_not_found', transaction: null }
    }

    const amountCents = normalizeAmountCents(amount)
    if (amountCents <= 0) {
      return { ok: false, reason: 'amount_invalid', transaction: null }
    }

    const account = findBankAccountById(accountId)
    if (!account || !account.currencies.includes(payee.currency)) {
      return { ok: false, reason: 'currency_mismatch', transaction: null }
    }
    const accountSummary = bankAccountSummaries.value.find((item) => item.id === account.id)
    const availableCents =
      accountSummary?.balances.find((balance) => balance.currency === payee.currency)
        ?.amountCents || 0
    if (amountCents > availableCents) {
      return { ok: false, reason: 'insufficient_funds', transaction: null }
    }

    const requestedCard = findPaymentCardById(cardId)
    const paymentCard =
      (requestedCard?.status === 'active' &&
      requestedCard.accountId === account.id &&
      requestedCard.supportedCurrencies.includes(payee.currency)
        ? requestedCard
        : null) ||
      paymentCards.value.find(
        (card) =>
          card.kind === 'debit' &&
          card.status === 'active' &&
          card.accountId === account.id &&
          card.supportedCurrencies.includes(payee.currency),
      )
    if (!paymentCard) {
      return { ok: false, reason: 'payment_card_unavailable', transaction: null }
    }

    const createdAt = Date.now()
    const transaction = addTransaction({
      type: 'expense',
      direction: 'outgoing',
      title: '转账',
      amount,
      currency: payee.currency,
      accountId: account.id,
      cardId: paymentCard.id,
      counterparty: payee.ownerName,
      note,
      sourceModule: 'wallet_payee_transfer',
      sourceId: payee.id,
      transferStatus: 'completed',
      receiptNumber: createWalletReceiptNumber(createdAt),
      payeeAccountId: payee.id,
      recipientProfileId: payee.ownerProfileId,
      recipientContactId: payee.ownerContactId,
      recipientAccountId: payee.payeeAccountId,
      recipientInstitutionId: payee.institutionId,
      recipientAccountLast4: payee.accountNumberLast4,
      sourceChatId: normalizePositiveInt(sourceChatId, payee.sourceChatId),
      sourceMessageId: normalizeText(sourceMessageId, payee.sourceMessageId, 140),
      relationshipBinding: {
        profileId: payee.ownerProfileId,
        contactId: payee.ownerContactId,
        kind: 'role',
        name: payee.ownerName,
        sourceModule: 'chat',
        sourceId: String(payee.ownerContactId || payee.ownerProfileId),
      },
      createdAt,
    })

    return transaction
      ? { ok: true, reason: '', transaction }
      : { ok: false, reason: 'transaction_invalid', transaction: null }
  }

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

  const anonymizeTransaction = (
    transactionId,
    profile = {},
    replacementName = 'Unknown counterparty',
  ) => {
    const transaction = findTransactionById(transactionId)
    if (!transaction) return false
    const nextName = normalizeText(replacementName, 'Unknown counterparty', 120)
    transaction.counterparty = nextName
    transaction.note = anonymizeRelationshipText(transaction.note, profile?.name, nextName)
    transaction.title = anonymizeRelationshipText(transaction.title, profile?.name, nextName)
    transaction.relationshipBinding = clearRelationshipBinding()
    transaction.payeeAccountId = ''
    transaction.recipientProfileId = 0
    transaction.recipientContactId = 0
    transaction.recipientAccountId = ''
    transaction.recipientInstitutionId = ''
    transaction.recipientAccountLast4 = ''
    transaction.sourceChatId = 0
    transaction.sourceMessageId = ''
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
    if (!findCurrencyOption(nextCurrency)) {
      registerCurrency({ code: nextCurrency, source: 'manual' })
    }
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

    if (normalized.rateToUsd) {
      exchangeRates.value = reviseWalletExchangeRates(
        exchangeRates.value,
        {
          ratesToUsd: {
            ...exchangeRates.value.ratesToUsd,
            [normalized.code]: normalized.rateToUsd,
          },
        },
        {
          rateSource: normalized.source === 'world_pack' ? 'world_pack' : 'user_edit',
          updatedAt: Date.now(),
        },
      )
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
    const nextRate = normalizeDecimalString(rate, { positiveOnly: true, maxScale: 30 })
    if (!nextRate) return null
    exchangeRates.value = reviseWalletExchangeRates(
      exchangeRates.value,
      { reference: { rate: nextRate } },
      { rateSource: 'user_edit', updatedAt: Date.now() },
    )
    return Number(exchangeRates.value.reference.rate)
  }

  const setCurrencyCnyRate = (currency = '', rateToCny = 0) => {
    const code = normalizeCurrency(currency, '')
    const rate = normalizeDecimalString(rateToCny, { positiveOnly: true, maxScale: 30 })
    if (!code || !rate) return null
    if (!findCurrencyOption(code)) {
      registerCurrency({ code, source: 'manual' })
    }
    if (code === 'CNY') return 1
    const rateToUsd = deriveRateToUsdFromCnyRate(rate, exchangeRates.value.reference?.rate)
    if (!rateToUsd) return null
    exchangeRates.value = reviseWalletExchangeRates(
      exchangeRates.value,
      {
        ratesToUsd: {
          ...exchangeRates.value.ratesToUsd,
          [code]: rateToUsd,
        },
      },
      { rateSource: 'user_edit', updatedAt: Date.now() },
    )
    return getRateToCny(exchangeRates.value, code)
  }

  const findCurrencyOption = (currency = '') => {
    const code = normalizeCurrency(currency, '')
    if (!code) return null
    return currencyOptions.value.find((item) => item.code === code) || null
  }

  const quoteMoney = (sourceMoney = {}, targetCurrency = primaryCurrency.value, options = {}) =>
    createWalletMoneyQuote({
      sourceMoney,
      targetCurrency,
      exchangeRates: exchangeRates.value,
      currencyDefinitions: currencyOptions.value,
      quotedAt: options.quotedAt,
    })

  const formatMoney = (money = {}, options = {}) =>
    formatWalletMoneyValue(money, currencyOptions.value, options)

  const formatMoneyAmount = (money = {}, options = {}) =>
    formatWalletMoneyAmountValue(money, currencyOptions.value, options)

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
      Array.isArray(sourceObject.bankAccounts) ||
      Array.isArray(sourceObject.paymentCards) ||
      Array.isArray(sourceObject.ownedCardAppearanceIds) ||
      Boolean(sourceObject.selectedAppearanceByCardId) ||
      Array.isArray(sourceObject.knownPayeeAccounts) ||
      Boolean(sourceObject.exchangeRates)
    if (!hasWalletPayload) return false
    primaryCurrency.value = normalizeCurrency(
      sourceObject.primaryCurrency ||
        sourceObject.defaultCurrency ||
        sourceObject.settings?.primaryCurrency,
      primaryCurrency.value,
    )
    registeredCurrencies.value = normalizeWalletCurrencyList(
      sourceObject.registeredCurrencies || sourceObject.currencies || registeredCurrencies.value,
    )
    exchangeRates.value = normalizeWalletExchangeRates(
      sourceObject.exchangeRates || sourceObject.rates,
    )
    bankAccounts.value = normalizeWalletBankAccounts(
      sourceObject.bankAccounts || sourceObject.accounts,
    )
    paymentCards.value = normalizeWalletPaymentCards(
      sourceObject.paymentCards || sourceObject.cards,
    )
    ownedCardAppearanceIds.value = normalizeOwnedWalletCardAppearanceIds(
      sourceObject.ownedCardAppearanceIds,
      { ownershipVersion: Number(sourceObject.cardAppearanceOwnershipVersion) || 0 },
    )
    selectedAppearanceByCardId.value = normalizeSelectedWalletCardAppearances(
      sourceObject.selectedAppearanceByCardId,
      ownedCardAppearanceIds.value,
    )
    cardAppearanceProgress.value = normalizeWalletCardAppearanceProgress(
      sourceObject.cardAppearanceProgress,
    )
    knownPayeeAccounts.value = normalizeKnownPayeeAccounts(
      sourceObject.knownPayeeAccounts || sourceObject.payees,
    )
    transactions.value = normalizeWalletTransactions(
      Array.isArray(sourceTransactions) ? sourceTransactions : [],
      primaryCurrency.value,
    )
    const requestedActiveCardId = normalizeText(
      sourceObject.activeCardId || sourceObject.selectedCardId,
      '',
      120,
    )
    activeCardId.value = paymentCards.value.some((card) => card.id === requestedActiveCardId)
      ? requestedActiveCardId
      : paymentCards.value.find((card) => card.isDefault)?.id || paymentCards.value[0]?.id || ''
    return true
  }

  const hydrateFromStorage = () => {
    const persisted = readPersistedState(WALLET_STORAGE_KEY, {
      version: WALLET_STORAGE_VERSION,
      migrate: migrateWalletStorage,
    })
    return applyPersistedSource(persisted)
  }

  const hydrateFromStorageAsync = async () => {
    const persisted = await readPersistedStateAsync(WALLET_STORAGE_KEY, {
      version: WALLET_STORAGE_VERSION,
      migrate: migrateWalletStorage,
    })
    return applyPersistedSource(persisted)
  }

  const createBackupSnapshot = () => ({
    primaryCurrency: primaryCurrency.value,
    registeredCurrencies: registeredCurrencies.value.map((item) => ({ ...item })),
    exchangeRates: {
      rateSetId: exchangeRates.value.rateSetId,
      revision: exchangeRates.value.revision,
      rateSource: exchangeRates.value.rateSource,
      updatedAt: exchangeRates.value.updatedAt,
      reference: { ...exchangeRates.value.reference },
      ratesToUsd: { ...exchangeRates.value.ratesToUsd },
    },
    bankAccounts: bankAccounts.value.map((account) => ({
      ...account,
      currencies: [...account.currencies],
    })),
    paymentCards: paymentCards.value.map((card) => ({
      ...card,
      supportedCurrencies: [...card.supportedCurrencies],
    })),
    ownedCardAppearanceIds: [...ownedCardAppearanceIds.value],
    cardAppearanceOwnershipVersion: WALLET_CARD_APPEARANCE_OWNERSHIP_VERSION,
    selectedAppearanceByCardId: { ...selectedAppearanceByCardId.value },
    cardAppearanceProgress: Object.fromEntries(
      Object.entries(cardAppearanceProgress.value).map(([id, progress]) => [id, { ...progress }]),
    ),
    knownPayeeAccounts: knownPayeeAccounts.value.map((payee) => ({ ...payee })),
    activeCardId: activeCardId.value,
    transactions: transactions.value.map((item) => ({
      ...item,
      quoteSnapshot: item.quoteSnapshot
        ? {
            ...item.quoteSnapshot,
            sourceMoney: { ...item.quoteSnapshot.sourceMoney },
            quotedMoney: { ...item.quoteSnapshot.quotedMoney },
          }
        : null,
    })),
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
      migrate: migrateWalletStorage,
    })
  }

  const saveNow = () => {
    persistToStorage()
  }

  const resetForTesting = () => {
    primaryCurrency.value = DEFAULT_CURRENCY
    registeredCurrencies.value = createDefaultRegisteredCurrencies()
    exchangeRates.value = createDefaultWalletExchangeRates()
    bankAccounts.value = createDefaultWalletBankAccounts()
    paymentCards.value = createDefaultWalletPaymentCards()
    ownedCardAppearanceIds.value = createDefaultOwnedWalletCardAppearanceIds()
    selectedAppearanceByCardId.value = createDefaultSelectedWalletCardAppearances()
    cardAppearanceProgress.value = {}
    knownPayeeAccounts.value = []
    activeCardId.value = paymentCards.value.find((card) => card.isDefault)?.id || ''
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
    [
      transactions,
      primaryCurrency,
      registeredCurrencies,
      exchangeRates,
      bankAccounts,
      paymentCards,
      ownedCardAppearanceIds,
      selectedAppearanceByCardId,
      cardAppearanceProgress,
      knownPayeeAccounts,
      activeCardId,
    ],
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
    bankInstitutions: WALLET_BANK_INSTITUTIONS,
    bankAccounts,
    paymentCards,
    ownedCardAppearanceIds,
    selectedAppearanceByCardId,
    cardAppearanceProgress,
    knownPayeeAccounts,
    activeCardId,
    transactionCount,
    transactionSourceSummary,
    transactionMonths,
    balances,
    primaryBalance,
    bankAccountSummaries,
    paymentCardSummaries,
    knownPayeeAccountSummaries,
    activePaymentCard,
    currencyOptions,
    exchangeRateRows,
    primaryCurrencyDefinition,
    hasFinishedStorageHydration,
    findTransactionById,
    findTransactionBySource,
    listTransactionsBySourceFilter,
    listTransactionsByMonth,
    summarizeTransactionsByMonth,
    listTransactionsByCounterparty,
    summarizeCounterpartyLedger,
    findBankAccountById,
    findPaymentCardById,
    listCardAppearances,
    findSelectedCardAppearance,
    equipCardAppearance,
    unlockCardAppearance,
    findKnownPayeeAccountById,
    listKnownPayeeAccountsForProfile,
    rememberRolePayeeAccount,
    removeKnownPayeeAccountsForProfile,
    findDefaultBankAccountForCurrency,
    listTransactionsByAccount,
    listTransactionsByCard,
    selectPaymentCard,
    setDefaultPaymentCard,
    togglePaymentCardFrozen,
    addTransaction,
    findCommercePaymentByIdempotencyKey,
    commitCommercePayment,
    reverseCommercePayment,
    addTransferTransaction,
    addRolePayeeTransfer,
    addChatTransferTransaction,
    setPrimaryCurrency,
    registerCurrency,
    registerWorldCurrency,
    setUsdCnyRate,
    setCurrencyCnyRate,
    findCurrencyOption,
    quoteMoney,
    formatMoney,
    formatMoneyAmount,
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
