export const DEFAULT_WALLET_CURRENCY = 'CNY'
export const DEFAULT_REFERENCE_BASE_CURRENCY = 'USD'
export const DEFAULT_REFERENCE_QUOTE_CURRENCY = 'CNY'
export const DEFAULT_USD_CNY_RATE = 7.2
export const DEFAULT_CURRENCY_EXPONENT = 2
export const MAX_CURRENCY_EXPONENT = 6
export const MONEY_RATE_PRECISION = 24

const DEFAULT_RATE_SET_ID = 'wallet-rates-bundled-average-v1'
const DEFAULT_USD_CNY_RATE_DECIMAL = '7.2'
const RATE_SOURCES = new Set(['bundled_average', 'user_edit', 'world_pack', 'live_provider'])

export const SYSTEM_WALLET_CURRENCIES = Object.freeze([
  {
    code: 'CNY',
    labelZh: '人民币',
    labelEn: 'Chinese yuan',
    symbol: '¥',
    exponent: 2,
    source: 'system',
  },
  {
    code: 'USD',
    labelZh: '美元',
    labelEn: 'US dollar',
    symbol: '$',
    exponent: 2,
    source: 'system',
  },
  {
    code: 'EUR',
    labelZh: '欧元',
    labelEn: 'Euro',
    symbol: '€',
    exponent: 2,
    source: 'system',
  },
  {
    code: 'JPY',
    labelZh: '日元',
    labelEn: 'Japanese yen',
    symbol: '¥',
    exponent: 0,
    source: 'system',
  },
  {
    code: 'KRW',
    labelZh: '韩元',
    labelEn: 'Korean won',
    symbol: '₩',
    exponent: 0,
    source: 'system',
  },
  {
    code: 'HKD',
    labelZh: '港币',
    labelEn: 'Hong Kong dollar',
    symbol: 'HK$',
    exponent: 2,
    source: 'system',
  },
])

export const DEFAULT_RATES_TO_USD = Object.freeze({
  USD: '1',
  CNY: '0.138888888888888888888889',
  EUR: '1.08',
  JPY: '0.0069',
  KRW: '0.00072',
  HKD: '0.128',
})

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

const normalizeRateSource = (value, fallback = 'bundled_average') => {
  const normalized = normalizeText(value, fallback, 40).toLowerCase()
  return RATE_SOURCES.has(normalized) ? normalized : fallback
}

const normalizeTimestamp = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback
}

const normalizePositiveInteger = (value, fallback = 1) => {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : fallback
}

const expandDecimal = (value) => {
  const raw =
    typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : ''
  const prepared = raw.replace(/^([+-]?)\./, '$10.')
  const match = prepared.match(/^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/)
  if (!match) return ''

  const sign = match[1] === '-' ? '-' : ''
  const whole = match[2]
  const fraction = match[3] || ''
  const exponent = Number(match[4] || 0)
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 100) return ''

  const digits = `${whole}${fraction}`
  const decimalIndex = whole.length + exponent
  if (decimalIndex <= 0) return `${sign}0.${'0'.repeat(-decimalIndex)}${digits}`
  if (decimalIndex >= digits.length) {
    return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`
  }
  return `${sign}${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`
}

export const normalizeDecimalString = (value, options = {}) => {
  const fallback = typeof options.fallback === 'string' ? options.fallback : ''
  const positiveOnly = options.positiveOnly === true
  const maxScale = Math.max(0, Math.min(40, Math.floor(Number(options.maxScale ?? 30))))
  const expanded = expandDecimal(value)
  if (!expanded) return fallback

  const negative = expanded.startsWith('-')
  if (positiveOnly && negative) return fallback
  const unsigned = negative || expanded.startsWith('+') ? expanded.slice(1) : expanded
  const [rawWhole = '0', rawFraction = ''] = unsigned.split('.')
  const whole = rawWhole.replace(/^0+(?=\d)/, '') || '0'
  if (rawFraction.length > maxScale) return fallback
  const fraction = rawFraction.replace(/0+$/, '')
  const normalized = fraction ? `${whole}.${fraction}` : whole
  if (/^0(?:\.0*)?$/.test(normalized)) return positiveOnly ? fallback : '0'
  return negative ? `-${normalized}` : normalized
}

const normalizePositiveDecimalString = (value, fallback = '') =>
  normalizeDecimalString(value, { fallback, positiveOnly: true, maxScale: 30 })

const pow10 = (exponent) => 10n ** BigInt(exponent)

const decimalToFraction = (value) => {
  const normalized = normalizeDecimalString(value, { maxScale: 40 })
  if (!normalized) return null
  const negative = normalized.startsWith('-')
  const unsigned = negative ? normalized.slice(1) : normalized
  const [whole, fraction = ''] = unsigned.split('.')
  const numerator = BigInt(`${whole}${fraction}` || '0') * (negative ? -1n : 1n)
  return {
    numerator,
    denominator: pow10(fraction.length),
  }
}

const divideRoundHalfUp = (numerator, denominator) => {
  if (denominator <= 0n) return null
  const negative = numerator < 0n
  const absolute = negative ? -numerator : numerator
  let quotient = absolute / denominator
  const remainder = absolute % denominator
  if (remainder * 2n >= denominator) quotient += 1n
  return negative ? -quotient : quotient
}

const fractionToDecimalString = (numerator, denominator, precision = MONEY_RATE_PRECISION) => {
  if (denominator <= 0n || numerator <= 0n) return ''
  const safePrecision = Math.max(0, Math.min(30, Math.floor(Number(precision))))
  const scaled = divideRoundHalfUp(numerator * pow10(safePrecision), denominator)
  if (scaled == null) return ''
  const digits = scaled.toString().padStart(safePrecision + 1, '0')
  if (safePrecision === 0) return digits
  const whole = digits.slice(0, -safePrecision) || '0'
  const fraction = digits.slice(-safePrecision).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole
}

const divideDecimalStrings = (numeratorValue, denominatorValue) => {
  const numerator = decimalToFraction(numeratorValue)
  const denominator = decimalToFraction(denominatorValue)
  if (!numerator || !denominator || numerator.numerator <= 0n || denominator.numerator <= 0n) {
    return ''
  }
  return fractionToDecimalString(
    numerator.numerator * denominator.denominator,
    numerator.denominator * denominator.numerator,
  )
}

const multiplyDecimalStrings = (leftValue, rightValue) => {
  const left = decimalToFraction(leftValue)
  const right = decimalToFraction(rightValue)
  if (!left || !right || left.numerator <= 0n || right.numerator <= 0n) return ''
  return fractionToDecimalString(
    left.numerator * right.numerator,
    left.denominator * right.denominator,
  )
}

export const deriveRateToUsdFromCnyRate = (rateToCny, usdCnyRate) =>
  divideDecimalStrings(rateToCny, usdCnyRate)

export const normalizeCurrencyCode = (value, fallback = DEFAULT_WALLET_CURRENCY) => {
  const normalized = normalizeText(value, fallback, 8).toUpperCase()
  return /^[A-Z]{2,8}$/.test(normalized) ? normalized : fallback
}

const normalizeCurrencyExponent = (value, fallback = DEFAULT_CURRENCY_EXPONENT) => {
  const exponent = Number(value)
  return Number.isInteger(exponent) && exponent >= 0 && exponent <= MAX_CURRENCY_EXPONENT
    ? exponent
    : fallback
}

export const normalizeCurrencyDefinition = (raw = {}, options = {}) => {
  const sourceObject =
    typeof raw === 'string' ? { code: raw } : raw && typeof raw === 'object' ? raw : {}
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
  const rateToUsd = normalizePositiveDecimalString(
    sourceObject.rateToUsd || sourceObject.usdRate || sourceObject.referenceRate,
  )

  return {
    code,
    labelZh,
    labelEn,
    symbol,
    exponent: normalizeCurrencyExponent(
      sourceObject.exponent,
      normalizeCurrencyExponent(options.fallbackExponent, DEFAULT_CURRENCY_EXPONENT),
    ),
    source,
    worldPackId,
    rateToUsd,
    updatedAt: normalizeTimestamp(sourceObject.updatedAt),
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
  rateSetId: DEFAULT_RATE_SET_ID,
  revision: 1,
  rateSource: 'bundled_average',
  updatedAt: 0,
  reference: {
    base: DEFAULT_REFERENCE_BASE_CURRENCY,
    quote: DEFAULT_REFERENCE_QUOTE_CURRENCY,
    rate: DEFAULT_USD_CNY_RATE_DECIMAL,
  },
  ratesToUsd: { ...DEFAULT_RATES_TO_USD },
})

export const normalizeWalletExchangeRates = (raw = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const referenceSource =
    source.reference && typeof source.reference === 'object' ? source.reference : {}
  const hasLegacyPayload = Boolean(source.reference || source.ratesToUsd || source.usdCnyRate)
  const usdCnyRate = normalizePositiveDecimalString(
    source.usdCnyRate || referenceSource.rate,
    DEFAULT_USD_CNY_RATE_DECIMAL,
  )
  const ratesToUsd = { ...DEFAULT_RATES_TO_USD }

  if (source.ratesToUsd && typeof source.ratesToUsd === 'object') {
    Object.entries(source.ratesToUsd).forEach(([rawCode, rawRate]) => {
      const code = normalizeCurrencyCode(rawCode, '')
      const rate = normalizePositiveDecimalString(rawRate)
      if (code && rate) ratesToUsd[code] = rate
    })
  }
  ratesToUsd.USD = '1'
  ratesToUsd.CNY = divideDecimalStrings('1', usdCnyRate) || DEFAULT_RATES_TO_USD.CNY

  const fallbackRateSource = hasLegacyPayload ? 'user_edit' : 'bundled_average'
  const fallbackRateSetId = hasLegacyPayload ? 'wallet-rates-legacy-v1' : DEFAULT_RATE_SET_ID

  return {
    rateSetId: normalizeText(source.rateSetId, fallbackRateSetId, 120),
    revision: normalizePositiveInteger(source.revision, 1),
    rateSource: normalizeRateSource(source.rateSource, fallbackRateSource),
    updatedAt: normalizeTimestamp(source.updatedAt),
    reference: {
      base: DEFAULT_REFERENCE_BASE_CURRENCY,
      quote: DEFAULT_REFERENCE_QUOTE_CURRENCY,
      rate: usdCnyRate,
    },
    ratesToUsd: Object.fromEntries(
      Object.entries(ratesToUsd).sort(([left], [right]) => left.localeCompare(right)),
    ),
  }
}

export const reviseWalletExchangeRates = (raw = {}, patch = {}, options = {}) => {
  const current = normalizeWalletExchangeRates(raw)
  const patchSource = patch && typeof patch === 'object' ? patch : {}
  const candidate = normalizeWalletExchangeRates({
    ...current,
    ...patchSource,
    reference: {
      ...current.reference,
      ...(patchSource.reference && typeof patchSource.reference === 'object'
        ? patchSource.reference
        : {}),
    },
    ratesToUsd: {
      ...current.ratesToUsd,
      ...(patchSource.ratesToUsd && typeof patchSource.ratesToUsd === 'object'
        ? patchSource.ratesToUsd
        : {}),
    },
  })

  const ratesChanged =
    candidate.reference.rate !== current.reference.rate ||
    JSON.stringify(candidate.ratesToUsd) !== JSON.stringify(current.ratesToUsd)
  if (!ratesChanged) return current

  const revision = current.revision + 1
  const updatedAt = normalizeTimestamp(options.updatedAt, Date.now())
  return {
    ...candidate,
    rateSetId: `wallet-rates-${updatedAt}-${revision}`,
    revision,
    rateSource: normalizeRateSource(options.rateSource, 'user_edit'),
    updatedAt,
  }
}

export const getRateToUsdDecimal = (exchangeRates = {}, currency = DEFAULT_WALLET_CURRENCY) => {
  const normalizedRates = normalizeWalletExchangeRates(exchangeRates)
  const code = normalizeCurrencyCode(currency, '')
  return code ? normalizedRates.ratesToUsd[code] || '' : ''
}

export const getRateToUsd = (exchangeRates = {}, currency = DEFAULT_WALLET_CURRENCY) => {
  const rate = getRateToUsdDecimal(exchangeRates, currency)
  return rate ? Number(rate) : 0
}

export const getRateToCnyDecimal = (exchangeRates = {}, currency = DEFAULT_WALLET_CURRENCY) => {
  const normalizedRates = normalizeWalletExchangeRates(exchangeRates)
  const code = normalizeCurrencyCode(currency, '')
  if (!code) return ''
  if (code === DEFAULT_REFERENCE_QUOTE_CURRENCY) return '1'
  const rateToUsd = normalizedRates.ratesToUsd[code]
  if (!rateToUsd) return ''
  return multiplyDecimalStrings(rateToUsd, normalizedRates.reference.rate)
}

export const getRateToCny = (exchangeRates = {}, currency = DEFAULT_WALLET_CURRENCY) => {
  const rate = getRateToCnyDecimal(exchangeRates, currency)
  return rate ? Number(rate) : 0
}

const normalizeMoneyAmountMinor = (value) => {
  if (typeof value === 'number') return Number.isSafeInteger(value) ? value : null
  if (typeof value !== 'string' || !/^-?\d+$/.test(value.trim())) return null
  const number = Number(value.trim())
  return Number.isSafeInteger(number) ? number : null
}

const buildCurrencyMap = (currencyDefinitions = []) => {
  const byCode = new Map()
  SYSTEM_WALLET_CURRENCIES.forEach((definition) => {
    byCode.set(definition.code, normalizeCurrencyDefinition(definition))
  })
  ;(Array.isArray(currencyDefinitions) ? currencyDefinitions : []).forEach((definition) => {
    const normalized = normalizeCurrencyDefinition(definition)
    if (!normalized) return
    const systemDefinition = SYSTEM_WALLET_CURRENCIES.find((item) => item.code === normalized.code)
    byCode.set(normalized.code, {
      ...(byCode.get(normalized.code) || {}),
      ...normalized,
      exponent: systemDefinition?.exponent ?? normalized.exponent,
    })
  })
  return byCode
}

export const normalizeMoney = (raw = {}) => {
  if (!raw || typeof raw !== 'object') return null
  const currency = normalizeCurrencyCode(raw.currency, '')
  const amountMinor = normalizeMoneyAmountMinor(raw.amountMinor)
  if (!currency || amountMinor == null) return null
  return { amountMinor, currency }
}

export const convertLegacyCentsToMoney = (
  rawAmountCents,
  rawCurrency,
  currencyDefinitions = [],
) => {
  const amountCents = normalizeMoneyAmountMinor(rawAmountCents)
  const currency = normalizeCurrencyCode(rawCurrency, '')
  if (amountCents == null || !currency) return null

  const definition = buildCurrencyMap(currencyDefinitions).get(currency)
  if (!definition) return null

  const exponentDifference = definition.exponent - DEFAULT_CURRENCY_EXPONENT
  const rawMinor = BigInt(amountCents)
  const amountMinor = exponentDifference >= 0
    ? rawMinor * pow10(exponentDifference)
    : divideRoundHalfUp(rawMinor, pow10(-exponentDifference))
  if (
    amountMinor == null ||
    amountMinor > BigInt(Number.MAX_SAFE_INTEGER) ||
    amountMinor < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    return null
  }

  return {
    amountMinor: Number(amountMinor),
    currency,
  }
}

export const convertMoneyToLegacyCents = (rawMoney, currencyDefinitions = []) => {
  const money = normalizeMoney(rawMoney)
  if (!money) return null
  const definition = buildCurrencyMap(currencyDefinitions).get(money.currency)
  if (!definition) return null

  const exponentDifference = DEFAULT_CURRENCY_EXPONENT - definition.exponent
  const rawCents = BigInt(money.amountMinor)
  const amountCents = exponentDifference >= 0
    ? rawCents * pow10(exponentDifference)
    : divideRoundHalfUp(rawCents, pow10(-exponentDifference))
  if (
    amountCents == null ||
    amountCents > BigInt(Number.MAX_SAFE_INTEGER) ||
    amountCents < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    return null
  }
  return Number(amountCents)
}

export const normalizeMoneyQuote = (raw = {}) => {
  if (!raw || typeof raw !== 'object') return null
  const sourceMoney = normalizeMoney(raw.sourceMoney)
  const quotedMoney = normalizeMoney(raw.quotedMoney)
  const targetCurrency = normalizeCurrencyCode(raw.targetCurrency || quotedMoney?.currency, '')
  const rateSetId = normalizeText(raw.rateSetId, '', 120)
  const rate = normalizePositiveDecimalString(raw.rate)
  const rateSource = normalizeRateSource(raw.rateSource, '')
  const quotedAt = normalizeTimestamp(raw.quotedAt)
  if (
    !sourceMoney ||
    !quotedMoney ||
    !targetCurrency ||
    quotedMoney.currency !== targetCurrency ||
    !rateSetId ||
    !rate ||
    !rateSource ||
    quotedAt <= 0
  ) {
    return null
  }

  return {
    sourceMoney,
    quotedMoney,
    rateSetId,
    rate,
    rateSource,
    quotedAt,
    targetCurrency,
  }
}

const createQuoteFailure = (error, sourceMoney, targetCurrency) => ({
  ok: false,
  error,
  sourceMoney: sourceMoney || null,
  targetCurrency: targetCurrency || '',
})

export const createMoneyQuote = ({
  sourceMoney: rawSourceMoney,
  targetCurrency: rawTargetCurrency,
  exchangeRates = {},
  currencyDefinitions = [],
  quotedAt = Date.now(),
} = {}) => {
  const sourceMoney = normalizeMoney(rawSourceMoney)
  const targetCurrency = normalizeCurrencyCode(rawTargetCurrency, '')
  if (!sourceMoney) return createQuoteFailure('invalid_source_money', null, targetCurrency)
  if (!targetCurrency) return createQuoteFailure('invalid_target_currency', sourceMoney, '')

  const currencyMap = buildCurrencyMap(currencyDefinitions)
  const sourceDefinition = currencyMap.get(sourceMoney.currency)
  const targetDefinition = currencyMap.get(targetCurrency)
  if (!sourceDefinition || !targetDefinition) {
    return createQuoteFailure('currency_unavailable', sourceMoney, targetCurrency)
  }

  const normalizedRates = normalizeWalletExchangeRates(exchangeRates)
  let rate = '1'
  if (sourceMoney.currency !== targetCurrency) {
    const sourceRate = normalizedRates.ratesToUsd[sourceMoney.currency]
    const targetRate = normalizedRates.ratesToUsd[targetCurrency]
    if (!sourceRate || !targetRate) {
      return createQuoteFailure('missing_rate', sourceMoney, targetCurrency)
    }
    rate = divideDecimalStrings(sourceRate, targetRate)
    if (!rate) return createQuoteFailure('invalid_rate', sourceMoney, targetCurrency)
  }

  const rateFraction = decimalToFraction(rate)
  if (!rateFraction || rateFraction.numerator <= 0n) {
    return createQuoteFailure('invalid_rate', sourceMoney, targetCurrency)
  }
  const numerator =
    BigInt(sourceMoney.amountMinor) * rateFraction.numerator * pow10(targetDefinition.exponent)
  const denominator = pow10(sourceDefinition.exponent) * rateFraction.denominator
  const quotedAmountMinor = divideRoundHalfUp(numerator, denominator)
  if (
    quotedAmountMinor == null ||
    quotedAmountMinor > BigInt(Number.MAX_SAFE_INTEGER) ||
    quotedAmountMinor < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    return createQuoteFailure('amount_out_of_range', sourceMoney, targetCurrency)
  }

  return {
    ok: true,
    sourceMoney,
    quotedMoney: {
      amountMinor: Number(quotedAmountMinor),
      currency: targetCurrency,
    },
    rateSetId: normalizedRates.rateSetId,
    rate,
    rateSource: normalizedRates.rateSource,
    quotedAt: normalizeTimestamp(quotedAt, Date.now()),
    targetCurrency,
  }
}

const resolveDecimalSeparator = (locale) => {
  try {
    return (
      new Intl.NumberFormat(locale, { minimumFractionDigits: 1 })
        .formatToParts(1.1)
        .find((part) => part.type === 'decimal')?.value || '.'
    )
  } catch {
    return '.'
  }
}

export const formatMoneyAmount = (rawMoney, currencyDefinitions = [], options = {}) => {
  const money = normalizeMoney(rawMoney)
  if (!money) return ''
  const definition = buildCurrencyMap(currencyDefinitions).get(money.currency)
  if (!definition) return ''

  const exponent = definition.exponent
  const minimumFractionDigits = Math.max(
    0,
    Math.min(exponent, Math.floor(Number(options.minimumFractionDigits ?? exponent))),
  )
  const negative = money.amountMinor < 0
  const digits = Math.abs(money.amountMinor)
    .toString()
    .padStart(exponent + 1, '0')
  const whole = exponent > 0 ? digits.slice(0, -exponent) || '0' : digits
  let fraction = exponent > 0 ? digits.slice(-exponent) : ''
  while (fraction.length > minimumFractionDigits && fraction.endsWith('0')) {
    fraction = fraction.slice(0, -1)
  }

  const locale = normalizeText(options.locale, 'zh-CN', 30)
  let formattedWhole = whole
  if (options.useGrouping !== false) {
    try {
      formattedWhole = new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
        useGrouping: true,
      }).format(BigInt(whole))
    } catch {
      formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }
  }
  const decimal = fraction ? `${resolveDecimalSeparator(locale)}${fraction}` : ''
  return `${negative ? '-' : ''}${formattedWhole}${decimal}`
}

export const formatMoney = (rawMoney, currencyDefinitions = [], options = {}) => {
  const money = normalizeMoney(rawMoney)
  if (!money) return ''
  const definition = buildCurrencyMap(currencyDefinitions).get(money.currency)
  if (!definition) return ''
  const amount = formatMoneyAmount(money, currencyDefinitions, options)
  if (!amount) return ''

  const display = options.currencyDisplay === 'symbol' ? definition.symbol : definition.code
  return options.currencyPosition === 'suffix' ? `${amount} ${display}` : `${display} ${amount}`
}

export const formatExchangeRate = (value, precision = 4) => {
  const normalized = normalizePositiveDecimalString(value)
  if (!normalized) return ''
  const number = Number(normalized)
  if (!Number.isFinite(number)) return ''
  return number >= 100 ? number.toFixed(2) : number.toFixed(precision)
}
