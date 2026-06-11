export const DEFAULT_WALLET_CURRENCY = 'CNY'
export const DEFAULT_REFERENCE_BASE_CURRENCY = 'USD'
export const DEFAULT_REFERENCE_QUOTE_CURRENCY = 'CNY'
export const DEFAULT_USD_CNY_RATE = 7.2

export const SYSTEM_WALLET_CURRENCIES = Object.freeze([
  {
    code: 'CNY',
    labelZh: '人民币',
    labelEn: 'Chinese yuan',
    symbol: '¥',
    source: 'system',
  },
  {
    code: 'USD',
    labelZh: '美元',
    labelEn: 'US dollar',
    symbol: '$',
    source: 'system',
  },
  {
    code: 'EUR',
    labelZh: '欧元',
    labelEn: 'Euro',
    symbol: '€',
    source: 'system',
  },
  {
    code: 'JPY',
    labelZh: '日元',
    labelEn: 'Japanese yen',
    symbol: '¥',
    source: 'system',
  },
  {
    code: 'KRW',
    labelZh: '韩元',
    labelEn: 'Korean won',
    symbol: '₩',
    source: 'system',
  },
  {
    code: 'HKD',
    labelZh: '港币',
    labelEn: 'Hong Kong dollar',
    symbol: 'HK$',
    source: 'system',
  },
])

export const DEFAULT_RATES_TO_USD = Object.freeze({
  USD: 1,
  CNY: 1 / DEFAULT_USD_CNY_RATE,
  EUR: 1.08,
  JPY: 0.0069,
  KRW: 0.00072,
  HKD: 0.128,
})

const toPositiveNumber = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

const normalizeText = (value, fallback = '', maxLength = 120) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, maxLength)
}

const normalizeSource = (value, fallback = 'custom') => {
  const normalized = normalizeText(value, fallback, 40).toLowerCase()
  return /^[a-z0-9_-]+$/.test(normalized) ? normalized : fallback
}

export const normalizeCurrencyCode = (value, fallback = DEFAULT_WALLET_CURRENCY) => {
  const normalized = normalizeText(value, fallback, 8).toUpperCase()
  return /^[A-Z]{2,8}$/.test(normalized) ? normalized : fallback
}

export const normalizeCurrencyDefinition = (raw = {}, options = {}) => {
  const sourceObject =
    typeof raw === 'string'
      ? { code: raw }
      : raw && typeof raw === 'object'
        ? raw
        : {}
  const code = normalizeCurrencyCode(
    sourceObject.code || sourceObject.currency || sourceObject.id,
    options.fallbackCode || '',
  )
  if (!code) return null

  const labelFallback = code
  const labelZh = normalizeText(
    sourceObject.labelZh || sourceObject.title || sourceObject.label || sourceObject.name,
    labelFallback,
    80,
  )
  const labelEn = normalizeText(
    sourceObject.labelEn || sourceObject.name || sourceObject.label || sourceObject.title,
    labelZh,
    80,
  )
  const symbol = normalizeText(sourceObject.symbol, code, 12)
  const source = normalizeSource(sourceObject.source, options.source || 'custom')
  const worldPackId = normalizeSource(sourceObject.worldPackId, options.worldPackId || '')
  const rateToUsd = toPositiveNumber(
    sourceObject.rateToUsd || sourceObject.usdRate || sourceObject.referenceRate,
    0,
  )

  return {
    code,
    labelZh,
    labelEn,
    symbol,
    source,
    worldPackId,
    rateToUsd,
    updatedAt: Math.max(0, Math.floor(Number(sourceObject.updatedAt || 0)) || 0),
  }
}

export const normalizeCurrencyDefinitions = (rawDefinitions = []) => {
  const byCode = new Map()
  ;(Array.isArray(rawDefinitions) ? rawDefinitions : []).forEach((definition) => {
    const normalized = normalizeCurrencyDefinition(definition)
    if (!normalized) return
    byCode.set(normalized.code, {
      ...(byCode.get(normalized.code) || {}),
      ...normalized,
    })
  })
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code))
}

export const createDefaultWalletExchangeRates = () => ({
  reference: {
    base: DEFAULT_REFERENCE_BASE_CURRENCY,
    quote: DEFAULT_REFERENCE_QUOTE_CURRENCY,
    rate: DEFAULT_USD_CNY_RATE,
  },
  ratesToUsd: { ...DEFAULT_RATES_TO_USD },
})

export const normalizeWalletExchangeRates = (raw = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const referenceSource = source.reference && typeof source.reference === 'object' ? source.reference : {}
  const usdCnyRate = toPositiveNumber(
    source.usdCnyRate || referenceSource.rate || DEFAULT_USD_CNY_RATE,
    DEFAULT_USD_CNY_RATE,
  )
  const ratesToUsd = {
    ...DEFAULT_RATES_TO_USD,
    ...(source.ratesToUsd && typeof source.ratesToUsd === 'object' ? source.ratesToUsd : {}),
  }
  ratesToUsd.USD = 1
  ratesToUsd.CNY = 1 / usdCnyRate

  return {
    reference: {
      base: DEFAULT_REFERENCE_BASE_CURRENCY,
      quote: DEFAULT_REFERENCE_QUOTE_CURRENCY,
      rate: usdCnyRate,
    },
    ratesToUsd: Object.fromEntries(
      Object.entries(ratesToUsd)
        .map(([rawCode, rawRate]) => {
          const code = normalizeCurrencyCode(rawCode, '')
          const rate = toPositiveNumber(rawRate, 0)
          return code && rate > 0 ? [code, rate] : null
        })
        .filter(Boolean),
    ),
  }
}

export const getRateToUsd = (exchangeRates = {}, currency = DEFAULT_WALLET_CURRENCY) => {
  const normalizedRates = normalizeWalletExchangeRates(exchangeRates)
  const code = normalizeCurrencyCode(currency, DEFAULT_WALLET_CURRENCY)
  return normalizedRates.ratesToUsd[code] || normalizedRates.ratesToUsd[DEFAULT_WALLET_CURRENCY]
}

export const getRateToCny = (exchangeRates = {}, currency = DEFAULT_WALLET_CURRENCY) => {
  const normalizedRates = normalizeWalletExchangeRates(exchangeRates)
  const rateToUsd = getRateToUsd(normalizedRates, currency)
  return rateToUsd * normalizedRates.reference.rate
}

export const formatExchangeRate = (value, precision = 4) => {
  const number = toPositiveNumber(value, 0)
  if (!number) return ''
  return number >= 100 ? number.toFixed(2) : number.toFixed(precision)
}
