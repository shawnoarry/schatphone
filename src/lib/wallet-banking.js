import { normalizeCurrencyCode } from './currency-system'

const ACCOUNT_TYPES = new Set(['checking', 'savings'])
const CARD_KINDS = new Set(['debit', 'credit'])
const CARD_STATUSES = new Set(['active', 'frozen'])
const CARD_THEMES = new Set(['scarlet', 'sunflower', 'cobalt', 'emerald', 'wine', 'coral', 'teal'])

const normalizeText = (value, fallback = '', maxLength = 120) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, maxLength) : fallback
}

const normalizeStableId = (value, fallback = '') => {
  const normalized = normalizeText(value, fallback, 120).toLowerCase()
  return /^[a-z0-9_-]+$/.test(normalized) ? normalized : fallback
}

const normalizeCurrencyList = (value, fallback = []) => {
  const currencies = Array.isArray(value) ? value : fallback
  return [
    ...new Set(currencies.map((currency) => normalizeCurrencyCode(currency, '')).filter(Boolean)),
  ]
}

const normalizeLastFour = (value, fallback = '0000') => {
  const normalized = String(value ?? '')
    .replace(/\D/g, '')
    .slice(-4)
  return normalized.length === 4 ? normalized : fallback
}

const normalizePositiveInteger = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isSafeInteger(number) && number >= 0 ? number : fallback
}

export const WALLET_BANK_INSTITUTIONS = Object.freeze([
  Object.freeze({
    id: 'icbc',
    nameZh: '中国工商银行',
    nameEn: 'Industrial and Commercial Bank of China',
    shortName: 'ICBC',
    countryCode: 'CN',
    regionZh: '中国',
    regionEn: 'China',
  }),
  Object.freeze({
    id: 'kb-kookmin',
    nameZh: 'KB国民银行',
    nameEn: 'KB Kookmin Bank',
    shortName: 'KB',
    countryCode: 'KR',
    regionZh: '韩国',
    regionEn: 'South Korea',
  }),
  Object.freeze({
    id: 'jpmorgan-chase',
    nameZh: '摩根大通银行',
    nameEn: 'JPMorgan Chase Bank',
    shortName: 'CHASE',
    countryCode: 'US',
    regionZh: '美国',
    regionEn: 'United States',
  }),
  Object.freeze({
    id: 'bnp-paribas',
    nameZh: '法国巴黎银行',
    nameEn: 'BNP Paribas',
    shortName: 'BNP',
    countryCode: 'FR',
    regionZh: '法国',
    regionEn: 'France',
  }),
  Object.freeze({
    id: 'mufg',
    nameZh: '三菱UFJ银行',
    nameEn: 'MUFG Bank',
    shortName: 'MUFG',
    countryCode: 'JP',
    regionZh: '日本',
    regionEn: 'Japan',
  }),
  Object.freeze({
    id: 'hsbc-hong-kong',
    nameZh: '汇丰银行（香港）',
    nameEn: 'HSBC Hong Kong',
    shortName: 'HSBC',
    countryCode: 'HK',
    regionZh: '中国香港',
    regionEn: 'Hong Kong',
  }),
  Object.freeze({
    id: 'hana-bank',
    nameZh: '韩亚银行',
    nameEn: 'Hana Bank',
    shortName: 'HANA',
    countryCode: 'KR',
    regionZh: '韩国',
    regionEn: 'South Korea',
  }),
  Object.freeze({
    id: 'american-express',
    nameZh: '美国运通',
    nameEn: 'American Express',
    shortName: 'AMEX',
    countryCode: 'US',
    regionZh: '美国',
    regionEn: 'United States',
  }),
])

const DEFAULT_BANK_ACCOUNTS = Object.freeze([
  Object.freeze({
    id: 'wallet_account_icbc_cny',
    institutionId: 'icbc',
    nameZh: '人民币生活账户',
    nameEn: 'CNY Everyday Account',
    accountType: 'checking',
    accountNumber: '6212 2608 3180 1288',
    accountNumberLast4: '1288',
    currencies: Object.freeze(['CNY']),
    primaryCurrency: 'CNY',
    isDefaultForCurrency: true,
    sortOrder: 10,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_account_kb_krw',
    institutionId: 'kb-kookmin',
    nameZh: '首尔生活账户',
    nameEn: 'Seoul Everyday Account',
    accountType: 'checking',
    accountNumber: '012 2026 0806 15',
    accountNumberLast4: '0615',
    currencies: Object.freeze(['KRW']),
    primaryCurrency: 'KRW',
    isDefaultForCurrency: true,
    sortOrder: 20,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_account_chase_usd',
    institutionId: 'jpmorgan-chase',
    nameZh: '美元往来账户',
    nameEn: 'USD Checking Account',
    accountType: 'checking',
    accountNumber: '0210 0008 2026',
    accountNumberLast4: '2026',
    currencies: Object.freeze(['USD']),
    primaryCurrency: 'USD',
    isDefaultForCurrency: true,
    sortOrder: 30,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_account_bnp_eur',
    institutionId: 'bnp-paribas',
    nameZh: '欧元旅行账户',
    nameEn: 'Euro Travel Account',
    accountType: 'checking',
    accountNumber: 'FR76 2026 0806 1500',
    accountNumberLast4: '1500',
    currencies: Object.freeze(['EUR']),
    primaryCurrency: 'EUR',
    isDefaultForCurrency: true,
    sortOrder: 40,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_account_mufg_jpy',
    institutionId: 'mufg',
    nameZh: '日本活动账户',
    nameEn: 'Japan Schedule Account',
    accountType: 'checking',
    accountNumber: '0806 2026 3150',
    accountNumberLast4: '3150',
    currencies: Object.freeze(['JPY']),
    primaryCurrency: 'JPY',
    isDefaultForCurrency: true,
    sortOrder: 50,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_account_hsbc_hkd',
    institutionId: 'hsbc-hong-kong',
    nameZh: '港币往来账户',
    nameEn: 'HKD Current Account',
    accountType: 'checking',
    accountNumber: '808 2026 0615',
    accountNumberLast4: '0615',
    currencies: Object.freeze(['HKD']),
    primaryCurrency: 'HKD',
    isDefaultForCurrency: true,
    sortOrder: 60,
    source: 'system_seed',
  }),
])

const DEFAULT_PAYMENT_CARDS = Object.freeze([
  Object.freeze({
    id: 'wallet_card_icbc_cny',
    institutionId: 'icbc',
    accountId: 'wallet_account_icbc_cny',
    nameZh: '牡丹借记卡',
    nameEn: 'Peony Debit',
    kind: 'debit',
    network: 'UnionPay',
    last4: '1288',
    supportedCurrencies: Object.freeze(['CNY']),
    settlementCurrency: 'CNY',
    theme: 'scarlet',
    status: 'active',
    isDefault: true,
    sortOrder: 10,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_card_kb_krw',
    institutionId: 'kb-kookmin',
    accountId: 'wallet_account_kb_krw',
    nameZh: '首尔借记卡',
    nameEn: 'Seoul Debit',
    kind: 'debit',
    network: 'KB Pay',
    last4: '0615',
    supportedCurrencies: Object.freeze(['KRW']),
    settlementCurrency: 'KRW',
    theme: 'sunflower',
    status: 'active',
    isDefault: false,
    sortOrder: 20,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_card_chase_usd',
    institutionId: 'jpmorgan-chase',
    accountId: 'wallet_account_chase_usd',
    nameZh: '美元借记卡',
    nameEn: 'USD Debit',
    kind: 'debit',
    network: 'Visa',
    last4: '2026',
    supportedCurrencies: Object.freeze(['USD']),
    settlementCurrency: 'USD',
    theme: 'cobalt',
    status: 'active',
    isDefault: false,
    sortOrder: 30,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_card_bnp_eur',
    institutionId: 'bnp-paribas',
    accountId: 'wallet_account_bnp_eur',
    nameZh: '欧元借记卡',
    nameEn: 'Euro Debit',
    kind: 'debit',
    network: 'Visa',
    last4: '1500',
    supportedCurrencies: Object.freeze(['EUR']),
    settlementCurrency: 'EUR',
    theme: 'emerald',
    status: 'active',
    isDefault: false,
    sortOrder: 40,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_card_mufg_jpy',
    institutionId: 'mufg',
    accountId: 'wallet_account_mufg_jpy',
    nameZh: '日元借记卡',
    nameEn: 'JPY Debit',
    kind: 'debit',
    network: 'JCB',
    last4: '3150',
    supportedCurrencies: Object.freeze(['JPY']),
    settlementCurrency: 'JPY',
    theme: 'wine',
    status: 'active',
    isDefault: false,
    sortOrder: 50,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_card_hsbc_hkd',
    institutionId: 'hsbc-hong-kong',
    accountId: 'wallet_account_hsbc_hkd',
    nameZh: '港币借记卡',
    nameEn: 'HKD Debit',
    kind: 'debit',
    network: 'Visa',
    last4: '0615',
    supportedCurrencies: Object.freeze(['HKD']),
    settlementCurrency: 'HKD',
    theme: 'coral',
    status: 'active',
    isDefault: false,
    sortOrder: 60,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_card_hana_global_credit',
    institutionId: 'hana-bank',
    accountId: '',
    nameZh: 'Global One 多币种信用卡',
    nameEn: 'Global One Multi-Currency Credit',
    kind: 'credit',
    network: 'Mastercard',
    last4: '0826',
    supportedCurrencies: Object.freeze(['KRW', 'CNY', 'USD', 'EUR', 'JPY', 'HKD']),
    settlementCurrency: 'KRW',
    creditLimitMinor: 15000000,
    creditLimitCurrency: 'KRW',
    theme: 'teal',
    status: 'active',
    isDefault: false,
    sortOrder: 70,
    source: 'system_seed',
  }),
  Object.freeze({
    id: 'wallet_card_amex_usd_global_credit',
    institutionId: 'american-express',
    accountId: '',
    nameZh: 'World Passage 环球信用卡',
    nameEn: 'World Passage Global Credit',
    kind: 'credit',
    network: 'Amex',
    last4: '1881',
    supportedCurrencies: Object.freeze(['USD', 'CNY', 'KRW', 'EUR', 'JPY', 'HKD']),
    settlementCurrency: 'USD',
    creditLimitMinor: 2000000,
    creditLimitCurrency: 'USD',
    theme: 'cobalt',
    status: 'active',
    isDefault: false,
    sortOrder: 80,
    source: 'system_seed',
  }),
])

const normalizeBankAccount = (raw = {}, fallback = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const baseline = fallback && typeof fallback === 'object' ? fallback : {}
  const id = normalizeStableId(source.id, normalizeStableId(baseline.id, ''))
  const institutionId = normalizeStableId(
    source.institutionId,
    normalizeStableId(baseline.institutionId, ''),
  )
  const currencies = normalizeCurrencyList(source.currencies, baseline.currencies)
  const primaryCurrency = normalizeCurrencyCode(
    source.primaryCurrency,
    normalizeCurrencyCode(baseline.primaryCurrency, currencies[0] || ''),
  )
  if (!id || !institutionId || currencies.length === 0 || !primaryCurrency) return null

  return {
    id,
    institutionId,
    nameZh: normalizeText(source.nameZh, normalizeText(baseline.nameZh, id, 80), 80),
    nameEn: normalizeText(source.nameEn, normalizeText(baseline.nameEn, id, 80), 80),
    accountType: ACCOUNT_TYPES.has(source.accountType)
      ? source.accountType
      : ACCOUNT_TYPES.has(baseline.accountType)
        ? baseline.accountType
        : 'checking',
    accountNumber: normalizeText(
      source.accountNumber,
      normalizeText(baseline.accountNumber, '', 40),
      40,
    ),
    accountNumberLast4: normalizeLastFour(
      source.accountNumberLast4 || source.accountNumber,
      normalizeLastFour(baseline.accountNumberLast4 || baseline.accountNumber),
    ),
    currencies,
    primaryCurrency: currencies.includes(primaryCurrency) ? primaryCurrency : currencies[0],
    isDefaultForCurrency: source.isDefaultForCurrency ?? baseline.isDefaultForCurrency ?? false,
    sortOrder: normalizePositiveInteger(
      source.sortOrder,
      normalizePositiveInteger(baseline.sortOrder),
    ),
    source: normalizeStableId(source.source, normalizeStableId(baseline.source, 'user')),
  }
}

const normalizePaymentCard = (raw = {}, fallback = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const baseline = fallback && typeof fallback === 'object' ? fallback : {}
  const id = normalizeStableId(source.id, normalizeStableId(baseline.id, ''))
  const institutionId = normalizeStableId(
    source.institutionId,
    normalizeStableId(baseline.institutionId, ''),
  )
  const kind = CARD_KINDS.has(source.kind)
    ? source.kind
    : CARD_KINDS.has(baseline.kind)
      ? baseline.kind
      : 'debit'
  const supportedCurrencies = normalizeCurrencyList(
    source.supportedCurrencies,
    baseline.supportedCurrencies,
  )
  const settlementCurrency = normalizeCurrencyCode(
    source.settlementCurrency,
    normalizeCurrencyCode(baseline.settlementCurrency, supportedCurrencies[0] || ''),
  )
  if (!id || !institutionId || supportedCurrencies.length === 0 || !settlementCurrency) return null

  const theme = CARD_THEMES.has(source.theme)
    ? source.theme
    : CARD_THEMES.has(baseline.theme)
      ? baseline.theme
      : 'cobalt'
  const status = CARD_STATUSES.has(source.status)
    ? source.status
    : CARD_STATUSES.has(baseline.status)
      ? baseline.status
      : 'active'

  return {
    id,
    institutionId,
    accountId: normalizeStableId(source.accountId, normalizeStableId(baseline.accountId, '')),
    nameZh: normalizeText(source.nameZh, normalizeText(baseline.nameZh, id, 80), 80),
    nameEn: normalizeText(source.nameEn, normalizeText(baseline.nameEn, id, 80), 80),
    kind,
    network: normalizeText(source.network, normalizeText(baseline.network, '', 40), 40),
    last4: normalizeLastFour(source.last4, normalizeLastFour(baseline.last4)),
    supportedCurrencies,
    settlementCurrency: supportedCurrencies.includes(settlementCurrency)
      ? settlementCurrency
      : supportedCurrencies[0],
    creditLimitMinor:
      kind === 'credit'
        ? normalizePositiveInteger(
            source.creditLimitMinor,
            normalizePositiveInteger(baseline.creditLimitMinor),
          )
        : 0,
    creditLimitCurrency:
      kind === 'credit'
        ? normalizeCurrencyCode(
            source.creditLimitCurrency,
            normalizeCurrencyCode(baseline.creditLimitCurrency, settlementCurrency),
          )
        : '',
    theme,
    status,
    isDefault: source.isDefault ?? baseline.isDefault ?? false,
    sortOrder: normalizePositiveInteger(
      source.sortOrder,
      normalizePositiveInteger(baseline.sortOrder),
    ),
    source: normalizeStableId(source.source, normalizeStableId(baseline.source, 'user')),
  }
}

const mergeSeedRecords = (defaults, rawRecords, normalizer) => {
  const defaultsById = new Map(defaults.map((record) => [record.id, record]))
  const byId = new Map()

  defaults.forEach((record) => {
    const normalized = normalizer(record, record)
    if (normalized) byId.set(normalized.id, normalized)
  })
  ;(Array.isArray(rawRecords) ? rawRecords : []).forEach((record) => {
    if (!record || typeof record !== 'object') return
    const id = normalizeStableId(record.id, '')
    const normalized = normalizer(record, defaultsById.get(id) || {})
    if (normalized) byId.set(normalized.id, normalized)
  })

  return [...byId.values()].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
    return left.id.localeCompare(right.id)
  })
}

export const createDefaultWalletBankAccounts = () =>
  DEFAULT_BANK_ACCOUNTS.map((account) => ({ ...account, currencies: [...account.currencies] }))

export const createDefaultWalletPaymentCards = () =>
  DEFAULT_PAYMENT_CARDS.map((card) => ({
    ...card,
    supportedCurrencies: [...card.supportedCurrencies],
  }))

export const normalizeWalletBankAccounts = (rawAccounts = []) =>
  mergeSeedRecords(DEFAULT_BANK_ACCOUNTS, rawAccounts, normalizeBankAccount)

export const normalizeWalletPaymentCards = (rawCards = []) => {
  const cards = mergeSeedRecords(DEFAULT_PAYMENT_CARDS, rawCards, normalizePaymentCard)
  const activeDefaultId = cards.find((card) => card.isDefault && card.status === 'active')?.id
  const fallbackDefaultId = cards.find((card) => card.status === 'active')?.id || cards[0]?.id || ''
  const defaultId = activeDefaultId || fallbackDefaultId
  return cards.map((card) => ({ ...card, isDefault: card.id === defaultId }))
}

export const findWalletBankInstitution = (institutionId = '') => {
  const id = normalizeStableId(institutionId, '')
  return WALLET_BANK_INSTITUTIONS.find((institution) => institution.id === id) || null
}

const ROLE_PAYEE_ACCOUNT_STATUSES = new Set(['active', 'closed'])
const ROLE_PAYEE_ACCOUNT_LIMIT = 6

const createStableNumericToken = (value, length = 12) => {
  const source = String(value ?? '')
  let state = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    state ^= source.charCodeAt(index)
    state = Math.imul(state, 16777619) >>> 0
  }

  let digits = ''
  while (digits.length < length) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    digits += String(state).padStart(10, '0')
  }
  return digits.slice(0, length)
}

const createRolePayeeAccountNumber = ({ institutionId, profileId, roleId }) => {
  const digits = createStableNumericToken(`${institutionId}:${profileId}:${roleId}`, 12)
  if (institutionId === 'icbc') {
    return `6212 2608 ${digits.slice(0, 4)} ${digits.slice(4, 8)}`
  }
  if (institutionId === 'kb-kookmin') {
    return `012 ${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`
  }
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`
}

const createDefaultRolePayeeAccount = ({ profileId = 0, roleId = '' } = {}) => {
  const numericProfileId = normalizePositiveInteger(profileId)
  if (!numericProfileId) return null
  const preset =
    numericProfileId === 1
      ? { institutionId: 'icbc', currency: 'CNY', sortOrder: 10 }
      : { institutionId: 'kb-kookmin', currency: 'KRW', sortOrder: 20 }
  const accountNumber = createRolePayeeAccountNumber({
    institutionId: preset.institutionId,
    profileId: numericProfileId,
    roleId,
  })
  return {
    id: `role_payee_${numericProfileId}_${preset.institutionId}_${preset.currency.toLowerCase()}`,
    institutionId: preset.institutionId,
    currency: preset.currency,
    accountNumber,
    accountNumberLast4: normalizeLastFour(accountNumber),
    status: 'active',
    isPrimary: true,
    sortOrder: preset.sortOrder,
    source: 'system_seed',
  }
}

const normalizeRolePayeeAccount = (raw = {}, fallback = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const baseline = fallback && typeof fallback === 'object' ? fallback : {}
  const id = normalizeStableId(source.id, normalizeStableId(baseline.id, ''))
  const institutionId = normalizeStableId(
    source.institutionId,
    normalizeStableId(baseline.institutionId, ''),
  )
  const currency = normalizeCurrencyCode(
    source.currency,
    normalizeCurrencyCode(baseline.currency, ''),
  )
  if (!id || !currency || !findWalletBankInstitution(institutionId)) return null

  const accountNumber = normalizeText(
    source.accountNumber,
    normalizeText(baseline.accountNumber, '', 48),
    48,
  )
  if (!accountNumber) return null

  const status = ROLE_PAYEE_ACCOUNT_STATUSES.has(source.status)
    ? source.status
    : ROLE_PAYEE_ACCOUNT_STATUSES.has(baseline.status)
      ? baseline.status
      : 'active'

  return {
    id,
    institutionId,
    currency,
    accountNumber,
    accountNumberLast4: normalizeLastFour(
      source.accountNumberLast4 || accountNumber,
      normalizeLastFour(baseline.accountNumberLast4 || baseline.accountNumber),
    ),
    status,
    isPrimary: status === 'active' && (source.isPrimary ?? baseline.isPrimary ?? false),
    sortOrder: normalizePositiveInteger(
      source.sortOrder,
      normalizePositiveInteger(baseline.sortOrder),
    ),
    source: normalizeStableId(source.source, normalizeStableId(baseline.source, 'user')),
  }
}

export const createDefaultRolePayeeAccounts = ({
  profileId = 0,
  roleId = '',
  entityType = 'main_role',
} = {}) => {
  if (entityType === 'self_profile') return []
  const account = createDefaultRolePayeeAccount({ profileId, roleId })
  return account ? [account] : []
}

export const normalizeRolePayeeAccounts = (rawAccounts = [], context = {}) => {
  if (context.entityType === 'self_profile') return []
  const defaults = createDefaultRolePayeeAccounts(context)
  const defaultsById = new Map(defaults.map((account) => [account.id, account]))
  const sourceAccounts =
    Array.isArray(rawAccounts) && rawAccounts.length > 0 ? rawAccounts : defaults
  const seenIds = new Set()
  let accounts = sourceAccounts
    .map((account) => {
      const id = normalizeStableId(account?.id, '')
      return normalizeRolePayeeAccount(account, defaultsById.get(id) || {})
    })
    .filter(Boolean)
    .filter((account) => {
      if (seenIds.has(account.id)) return false
      seenIds.add(account.id)
      return true
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id))
    .slice(0, ROLE_PAYEE_ACCOUNT_LIMIT)

  if (accounts.length === 0 && defaults.length > 0) {
    accounts = defaults.map((account) => ({ ...account }))
  }

  const primaryId =
    accounts.find((account) => account.status === 'active' && account.isPrimary)?.id ||
    accounts.find((account) => account.status === 'active')?.id ||
    ''
  return accounts.map((account) => ({
    ...account,
    isPrimary: Boolean(primaryId) && account.id === primaryId,
  }))
}

export const cloneRolePayeeAccounts = (accounts = []) =>
  normalizeRolePayeeAccounts(accounts, { entityType: 'main_role' }).map((account) => ({
    ...account,
  }))

export const maskRolePayeeAccountNumber = (account = {}) => {
  const last4 = normalizeLastFour(account.accountNumberLast4 || account.accountNumber)
  return `•••• ${last4}`
}
