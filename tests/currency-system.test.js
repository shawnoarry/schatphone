import { describe, expect, test } from 'vitest'
import {
  SYSTEM_WALLET_CURRENCIES,
  createDefaultWalletExchangeRates,
  createMoneyQuote,
  formatMoney,
  formatMoneyAmount,
  getRateToUsd,
  normalizeDecimalString,
  normalizeCurrencyDefinition,
  normalizeWalletExchangeRates,
  reviseWalletExchangeRates,
} from '../src/lib/currency-system'

describe('currency system', () => {
  test('defines built-in and migrated custom currency exponents', () => {
    expect(
      Object.fromEntries(SYSTEM_WALLET_CURRENCIES.map(({ code, exponent }) => [code, exponent])),
    ).toEqual({
      CNY: 2,
      USD: 2,
      EUR: 2,
      JPY: 0,
      KRW: 0,
      HKD: 2,
    })
    expect(normalizeCurrencyDefinition({ code: 'crd', exponent: 3 })).toMatchObject({
      code: 'CRD',
      exponent: 3,
    })
    expect(normalizeCurrencyDefinition({ code: 'old' })).toMatchObject({
      code: 'OLD',
      exponent: 2,
    })
  })

  test('normalizes legacy numeric rates into a versioned decimal-string rate set', () => {
    const rates = normalizeWalletExchangeRates({
      reference: { rate: 7.35 },
      ratesToUsd: { CRD: 0.034 },
    })

    expect(rates).toMatchObject({
      rateSetId: 'wallet-rates-legacy-v1',
      revision: 1,
      rateSource: 'user_edit',
      reference: { rate: '7.35' },
    })
    expect(rates.ratesToUsd.CRD).toBe('0.034')
    expect(getRateToUsd(rates, 'MISSING')).toBe(0)
    expect(normalizeDecimalString('.25', { positiveOnly: true })).toBe('0.25')
  })

  test('quotes exponent-2 money once with source and rate provenance', () => {
    const quote = createMoneyQuote({
      sourceMoney: { amountMinor: 3900, currency: 'CNY' },
      targetCurrency: 'USD',
      exchangeRates: createDefaultWalletExchangeRates(),
      quotedAt: 42,
    })

    expect(quote).toEqual({
      ok: true,
      sourceMoney: { amountMinor: 3900, currency: 'CNY' },
      quotedMoney: { amountMinor: 542, currency: 'USD' },
      rateSetId: 'wallet-rates-bundled-average-v1',
      rate: '0.138888888888888888888889',
      rateSource: 'bundled_average',
      quotedAt: 42,
      targetCurrency: 'USD',
    })
  })

  test('rounds negative half values away from zero for zero-decimal currencies', () => {
    const quote = createMoneyQuote({
      sourceMoney: { amountMinor: -100, currency: 'USD' },
      targetCurrency: 'KRW',
      exchangeRates: {
        reference: { rate: '7.2' },
        ratesToUsd: { USD: '1', KRW: '0.4' },
      },
      quotedAt: 42,
    })

    expect(quote.ok).toBe(true)
    expect(quote.quotedMoney).toEqual({ amountMinor: -3, currency: 'KRW' })
  })

  test('returns an explicit unavailable result instead of a one-to-one fallback', () => {
    const quote = createMoneyQuote({
      sourceMoney: { amountMinor: 2500, currency: 'CNY' },
      targetCurrency: 'CRD',
      currencyDefinitions: [{ code: 'CRD', exponent: 2 }],
      exchangeRates: createDefaultWalletExchangeRates(),
      quotedAt: 42,
    })

    expect(quote).toEqual({
      ok: false,
      error: 'missing_rate',
      sourceMoney: { amountMinor: 2500, currency: 'CNY' },
      targetCurrency: 'CRD',
    })
  })

  test('formats amounts from currency exponent metadata', () => {
    expect(formatMoney({ amountMinor: 5015, currency: 'KRW' }, [], { locale: 'en-US' })).toBe(
      'KRW 5,015',
    )
    expect(formatMoney({ amountMinor: -3900, currency: 'CNY' }, [], { locale: 'en-US' })).toBe(
      'CNY -39.00',
    )
    expect(
      formatMoneyAmount({ amountMinor: 3900, currency: 'CNY' }, [], {
        locale: 'en-US',
        minimumFractionDigits: 0,
        useGrouping: false,
      }),
    ).toBe('39')
  })

  test('creates a new rate revision only when an effective rate changes', () => {
    const bundled = createDefaultWalletExchangeRates()
    const revised = reviseWalletExchangeRates(
      bundled,
      { reference: { rate: '7.35' } },
      { updatedAt: 42, rateSource: 'user_edit' },
    )
    const unchanged = reviseWalletExchangeRates(
      revised,
      { reference: { rate: '7.35' } },
      { updatedAt: 84, rateSource: 'user_edit' },
    )

    expect(revised).toMatchObject({
      rateSetId: 'wallet-rates-42-2',
      revision: 2,
      rateSource: 'user_edit',
      updatedAt: 42,
      reference: { rate: '7.35' },
    })
    expect(unchanged.rateSetId).toBe(revised.rateSetId)
    expect(unchanged.revision).toBe(2)
  })
})
