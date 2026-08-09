import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { WALLET_TRANSACTION_SOURCE_FILTERS, useWalletStore } from '../src/stores/wallet'
import { createDefaultRolePayeeAccounts } from '../src/lib/wallet-banking'

describe('wallet store', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('seeds a local balance baseline and records transfer transactions', () => {
    const store = useWalletStore()

    expect(store.transactionCount).toBeGreaterThan(0)
    store.resetForTesting()

    const transfer = store.addTransferTransaction({
      amount: '88.50',
      currency: 'usd',
      counterparty: 'Nova',
      note: 'Dinner',
    })

    expect(transfer).toMatchObject({
      type: 'transfer',
      title: '聊天转账',
      amountCents: 8850,
      currency: 'USD',
      counterparty: 'Nova',
      note: 'Dinner',
      sourceModule: 'wallet_manual',
    })
    expect(store.balances).toEqual([
      {
        currency: 'USD',
        amountCents: 8850,
        amount: '88.50',
      },
    ])
  })

  test('rejects invalid amounts and supports expense balance math', () => {
    const store = useWalletStore()
    store.resetForTesting()

    expect(store.addTransferTransaction({ amount: 'abc' })).toBeNull()
    store.addTransaction({
      type: 'income',
      title: 'Reward',
      amount: '100.00',
      currency: 'CNY',
    })
    store.addTransaction({
      type: 'expense',
      title: 'Snack',
      amount: '12.30',
      currency: 'CNY',
    })

    expect(store.primaryBalance).toEqual({
      currency: 'CNY',
      amountCents: 8770,
      amount: '87.70',
    })
  })

  test('summarizes monthly ledger activity separately by original currency', () => {
    const store = useWalletStore()
    store.resetForTesting()
    const mayDate = (day) => new Date(2026, 4, day, 12, 0, 0).getTime()
    const aprilDate = new Date(2026, 3, 30, 12, 0, 0).getTime()

    store.addTransaction({
      type: 'income',
      title: 'May income',
      amount: '100.00',
      currency: 'CNY',
      createdAt: mayDate(1),
    })
    store.addTransaction({
      type: 'expense',
      title: 'May expense',
      amount: '35.50',
      currency: 'CNY',
      createdAt: mayDate(2),
    })
    store.addTransaction({
      type: 'income',
      title: 'USD income',
      amount: '2.20',
      currency: 'USD',
      createdAt: mayDate(3),
    })
    store.addTransaction({
      type: 'expense',
      title: 'USD expense',
      amount: '12.20',
      currency: 'USD',
      createdAt: mayDate(4),
    })
    store.addTransaction({
      type: 'income',
      title: 'April income',
      amount: '8.00',
      currency: 'CNY',
      createdAt: aprilDate,
    })

    expect(store.transactionMonths).toEqual([
      { key: '2026-05', count: 4 },
      { key: '2026-04', count: 1 },
    ])
    expect(store.summarizeTransactionsByMonth('2026-05')).toMatchObject({
      monthKey: '2026-05',
      count: 4,
      currencies: [
        {
          currency: 'CNY',
          count: 2,
          incomeCents: 10000,
          expenseCents: 3550,
          netCents: 6450,
          income: '100.00',
          expense: '35.50',
          net: '64.50',
        },
        {
          currency: 'USD',
          count: 2,
          incomeCents: 220,
          expenseCents: 1220,
          netCents: -1000,
          income: '2.20',
          expense: '12.20',
          net: '-10.00',
        },
      ],
    })
    expect(store.listTransactionsByMonth('2026-05')).toHaveLength(4)
    expect(store.listTransactionsByMonth('bad-month')).toEqual([])
    expect(store.summarizeTransactionsByMonth('bad-month')).toEqual({
      monthKey: '',
      count: 0,
      currencies: [],
      latestTransaction: null,
    })
  })

  test('persists source-linked quote provenance without re-quoting ledger history', () => {
    const store = useWalletStore()
    store.resetForTesting()
    const quoteSnapshot = store.quoteMoney({ amountMinor: 3900, currency: 'CNY' }, 'USD', {
      quotedAt: Date.now(),
    })
    const persistedQuoteSnapshot = { ...quoteSnapshot }
    delete persistedQuoteSnapshot.ok
    const transaction = store.addTransaction({
      type: 'expense',
      title: 'Shopping order',
      amount: '5.42',
      currency: 'USD',
      sourceModule: 'shopping_wallet_expense',
      sourceId: 'shopping_quote_order',
      quoteSnapshot,
    })
    const snapshot = store.createBackupSnapshot()

    store.setUsdCnyRate('10')
    expect(transaction.quoteSnapshot).toEqual(persistedQuoteSnapshot)
    store.resetForTesting()
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(
      store.findTransactionBySource('shopping_wallet_expense', 'shopping_quote_order'),
    ).toMatchObject({
      amountCents: 542,
      currency: 'USD',
      quoteSnapshot: persistedQuoteSnapshot,
    })
  })

  test('stores relationship binding on manual transfer records and anonymizes them during cleanup', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const transfer = store.addTransferTransaction({
      amount: '66.00',
      currency: 'CNY',
      counterparty: 'HJ',
      note: 'Dinner with HJ',
      relationshipBinding: {
        profileId: 77,
        contactId: 307,
        kind: 'role',
        name: 'HJ',
        sourceModule: 'chat',
        sourceId: '307',
      },
    })

    expect(transfer?.relationshipBinding).toMatchObject({
      profileId: 77,
      contactId: 307,
      name: 'HJ',
    })

    const cleanup = store.cleanupRelationshipForProfile(
      { id: 77, name: 'HJ' },
      { replacementName: 'Unknown counterparty' },
    )

    expect(cleanup).toMatchObject({
      requestedCount: 1,
      anonymizedCount: 1,
    })
    expect(store.findTransactionById(transfer.id)).toMatchObject({
      counterparty: 'Unknown counterparty',
      note: 'Dinner with Unknown counterparty',
      relationshipBinding: {
        profileId: 0,
        contactId: 0,
      },
    })
  })

  test('records Chat transfer cards as deduped ledger expenses', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const first = store.addChatTransferTransaction({
      messageId: 'msg_transfer_1',
      amount: '18.80',
      currency: 'cny',
      counterparty: 'Nova',
      note: 'Coffee',
      createdAt: Date.now(),
    })
    const second = store.addChatTransferTransaction({
      messageId: 'msg_transfer_1',
      amount: '18.80',
      currency: 'cny',
      counterparty: 'Nova',
      note: 'Coffee duplicate',
      createdAt: Date.now(),
    })

    expect(first).toMatchObject({
      type: 'expense',
      title: 'Chat transfer',
      amountCents: 1880,
      currency: 'CNY',
      counterparty: 'Nova',
      note: 'Coffee',
      sourceModule: 'chat_transfer',
      sourceId: 'msg_transfer_1',
    })
    expect(second.id).toBe(first.id)
    expect(store.transactionCount).toBe(1)
    expect(store.findTransactionBySource('chat_transfer', 'msg_transfer_1')?.id).toBe(first.id)
    expect(store.primaryBalance.amountCents).toBe(-1880)
  })

  test('summarizes and filters manual versus Chat-origin ledger records', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const manual = store.addTransferTransaction({
      amount: '50.00',
      currency: 'CNY',
      counterparty: 'Mika',
    })
    const chat = store.addChatTransferTransaction({
      messageId: 'msg_wallet_source_1',
      amount: '12.00',
      currency: 'CNY',
      counterparty: 'Nova',
    })

    expect(store.transactionSourceSummary).toEqual({
      all: 2,
      manual: 1,
      chat: 1,
      orders: 0,
    })
    expect(store.listTransactionsBySourceFilter(WALLET_TRANSACTION_SOURCE_FILTERS.CHAT)).toEqual([
      chat,
    ])
    expect(store.listTransactionsBySourceFilter(WALLET_TRANSACTION_SOURCE_FILTERS.MANUAL)).toEqual([
      manual,
    ])
    expect(store.listTransactionsBySourceFilter('unknown').map((item) => item.id)).toEqual([
      chat.id,
      manual.id,
    ])
  })

  test('summarizes and filters order-origin expenses separately from manual records', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const manual = store.addTransferTransaction({
      amount: '20.00',
      currency: 'CNY',
      counterparty: 'Manual',
    })
    const shopping = store.addTransaction({
      type: 'expense',
      title: 'Shopping order',
      amount: '88.00',
      currency: 'CNY',
      counterparty: 'Shopping',
      sourceModule: 'shopping_wallet_expense',
      sourceId: 'shopping_order_wallet_1',
    })
    const food = store.addTransaction({
      type: 'expense',
      title: 'Food Delivery order',
      amount: '32.00',
      currency: 'CNY',
      counterparty: 'Food Delivery',
      sourceModule: 'food_delivery_wallet_expense',
      sourceId: 'food_order_wallet_1',
    })

    expect(store.transactionSourceSummary).toEqual({
      all: 3,
      manual: 1,
      chat: 0,
      orders: 2,
    })
    expect(store.listTransactionsBySourceFilter(WALLET_TRANSACTION_SOURCE_FILTERS.ORDERS)).toEqual([
      food,
      shopping,
    ])
    expect(store.listTransactionsBySourceFilter(WALLET_TRANSACTION_SOURCE_FILTERS.MANUAL)).toEqual([
      manual,
    ])

    const summary = store.summarizeCounterpartyLedger('Shopping')
    expect(summary).toMatchObject({
      count: 1,
      chatCount: 0,
      orderCount: 1,
      manualCount: 0,
    })
  })

  test('summarizes counterparty ledger context for Contacts', () => {
    const store = useWalletStore()
    store.resetForTesting()

    store.addTransferTransaction({
      amount: '50.00',
      currency: 'CNY',
      counterparty: 'Nova',
      note: 'Manual top-up',
    })
    store.addChatTransferTransaction({
      messageId: 'msg_wallet_contacts_1',
      amount: '12.00',
      currency: 'CNY',
      counterparty: 'nova',
      note: 'Chat coffee',
    })
    store.addTransferTransaction({
      amount: '7.00',
      currency: 'USD',
      counterparty: 'Mika',
    })

    const summary = store.summarizeCounterpartyLedger('NOVA')

    expect(summary).toMatchObject({
      counterparty: 'nova',
      count: 2,
      chatCount: 1,
      orderCount: 0,
      manualCount: 1,
    })
    expect(summary.currencies).toEqual([
      {
        currency: 'CNY',
        amountCents: 3800,
        amount: '38.00',
      },
    ])
    expect(summary.latestTransaction?.sourceModule).toBe('chat_transfer')
    expect(store.listTransactionsByCounterparty('nova').length).toBe(2)
    expect(store.summarizeCounterpartyLedger('Unknown').count).toBe(0)
    expect(store.summarizeCounterpartyLedger('Unknown').orderCount).toBe(0)
  })

  test('rejects Chat ledger records without message source', () => {
    const store = useWalletStore()
    store.resetForTesting()

    expect(store.addChatTransferTransaction({ amount: '10.00' })).toBeNull()
    expect(store.transactionCount).toBe(0)
  })

  test('persists, restores, and removes transactions', () => {
    const store = useWalletStore()
    store.resetForTesting()
    expect(store.setPrimaryCurrency('usd')).toBe('USD')
    const transfer = store.addTransferTransaction({
      amount: '42',
      counterparty: 'Mika',
    })
    expect(transfer.currency).toBe('USD')
    store.saveNow()

    setActivePinia(createPinia())
    const restoredStore = useWalletStore()

    expect(restoredStore.primaryCurrency).toBe('USD')
    expect(restoredStore.findTransactionById(transfer.id)?.counterparty).toBe('Mika')
    expect(restoredStore.removeTransaction(transfer.id)).toBe(true)
    expect(restoredStore.findTransactionById(transfer.id)).toBeNull()

    const snapshot = {
      wallet: {
        transactions: [
          {
            id: 'wallet_backup_1',
            type: 'income',
            title: 'Backup',
            amount: '10.00',
            currency: 'CNY',
          },
        ],
      },
    }
    expect(restoredStore.restoreFromBackup(snapshot)).toBe(true)
    expect(restoredStore.transactionCount).toBe(1)
    expect(restoredStore.findTransactionById('wallet_backup_1')?.amountCents).toBe(1000)
  })

  test('uses the primary currency as the default for new ledger records', () => {
    const store = useWalletStore()
    store.resetForTesting()

    expect(store.setPrimaryCurrency('eur')).toBe('EUR')
    expect(store.addTransferTransaction({ amount: '12.00' })).toMatchObject({
      currency: 'EUR',
    })
    expect(
      store.addChatTransferTransaction({ messageId: 'msg_eur_1', amount: '8.00' }),
    ).toMatchObject({
      currency: 'EUR',
    })
    expect(store.setPrimaryCurrency('bad currency')).toBe('')
    expect(store.primaryCurrency).toBe('EUR')
  })

  test('registers world pack currencies and keeps editable CNY exchange rates', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const registered = store.registerWorldCurrency(
      {
        code: 'crd',
        labelZh: '信用点',
        labelEn: 'Credits',
        symbol: 'CR',
      },
      { id: 'survival_city' },
    )

    expect(registered).toMatchObject({
      code: 'CRD',
      source: 'world_pack',
      worldPackId: 'survival_city',
    })
    expect(store.currencyOptions.map((currency) => currency.code)).toContain('CRD')
    expect(store.setCurrencyCnyRate('CRD', '0.25')).toBeCloseTo(0.25)
    expect(store.exchangeRateRows.find((row) => row.code === 'CRD')).toMatchObject({
      code: 'CRD',
      rateToCnyLabel: '0.2500',
    })
    expect(store.setPrimaryCurrency('CRD')).toBe('CRD')
    expect(
      store.addChatTransferTransaction({ messageId: 'msg_crd_1', amount: '8.00' }),
    ).toMatchObject({
      currency: 'CRD',
    })

    const snapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.currencyOptions.map((currency) => currency.code)).not.toContain('CRD')
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.primaryCurrency).toBe('CRD')
    expect(store.currencyOptions.map((currency) => currency.code)).toContain('CRD')
    expect(store.exchangeRateRows.find((row) => row.code === 'CRD')?.rateToCnyLabel).toBe('0.2500')
  })

  test('seeds one bank account per system currency and a multi-currency credit card', () => {
    const store = useWalletStore()
    store.resetForTesting()

    expect(store.bankInstitutions).toHaveLength(7)
    expect(store.bankAccounts).toHaveLength(6)
    expect(store.paymentCards).toHaveLength(7)
    expect(store.bankAccounts.map((account) => account.primaryCurrency).sort()).toEqual([
      'CNY',
      'EUR',
      'HKD',
      'JPY',
      'KRW',
      'USD',
    ])

    const creditCard = store.findPaymentCardById('wallet_card_hana_global_credit')
    expect(creditCard).toMatchObject({
      institutionId: 'hana-bank',
      kind: 'credit',
      settlementCurrency: 'KRW',
      creditLimitMinor: 15000000,
    })
    expect(creditCard.supportedCurrencies).toEqual(['KRW', 'CNY', 'USD', 'EUR', 'JPY', 'HKD'])
  })

  test('maps legacy currency-only records into the default bank account without duplicating balances', () => {
    const store = useWalletStore()
    store.resetForTesting()

    store.restoreFromBackup({
      transactions: [
        {
          id: 'legacy_cny_balance',
          type: 'income',
          title: 'Legacy balance',
          amount: '1288.00',
          currency: 'CNY',
        },
      ],
    })

    const cnyAccount = store.bankAccountSummaries.find(
      (account) => account.id === 'wallet_account_icbc_cny',
    )
    expect(cnyAccount).toMatchObject({
      primaryCurrency: 'CNY',
      institution: { id: 'icbc' },
      primaryBalance: { amountCents: 128800, amount: '1288.00' },
    })
    expect(store.listTransactionsByAccount(cnyAccount.id).map((item) => item.id)).toEqual([
      'legacy_cny_balance',
    ])
    expect(
      store.bankAccountSummaries.reduce(
        (total, account) => total + (account.primaryBalance?.amountCents || 0),
        0,
      ),
    ).toBe(128800)
  })

  test('persists card selection, default card, frozen state, and account-linked transfers', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const usdAccount = store.findDefaultBankAccountForCurrency('USD')
    const incoming = store.addTransferTransaction({
      amount: '120.00',
      currency: 'USD',
      accountId: usdAccount.id,
      direction: 'incoming',
      counterparty: 'Tour settlement',
    })
    const outgoing = store.addTransferTransaction({
      amount: '20.00',
      currency: 'USD',
      accountId: usdAccount.id,
      direction: 'outgoing',
      counterparty: 'Studio',
    })

    expect(incoming).toMatchObject({
      type: 'income',
      direction: 'incoming',
      accountId: 'wallet_account_chase_usd',
      cardId: 'wallet_card_chase_usd',
    })
    expect(outgoing).toMatchObject({ type: 'expense', direction: 'outgoing' })
    expect(
      store.bankAccountSummaries.find((account) => account.id === usdAccount.id)?.primaryBalance,
    ).toMatchObject({ amountCents: 10000, amount: '100.00' })

    expect(store.setDefaultPaymentCard('wallet_card_chase_usd')).toMatchObject({ isDefault: true })
    expect(store.togglePaymentCardFrozen('wallet_card_mufg_jpy')).toMatchObject({
      status: 'frozen',
    })
    store.selectPaymentCard('wallet_card_chase_usd')
    const snapshot = store.createBackupSnapshot()

    store.resetForTesting()
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.activeCardId).toBe('wallet_card_chase_usd')
    expect(store.findPaymentCardById('wallet_card_chase_usd')?.isDefault).toBe(true)
    expect(store.findPaymentCardById('wallet_card_mufg_jpy')?.status).toBe('frozen')
    expect(store.listTransactionsByCard('wallet_card_chase_usd')).toHaveLength(2)
  })

  test('quotes money through the current Wallet rate revision', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const quote = store.quoteMoney({ amountMinor: 3900, currency: 'CNY' }, 'USD', { quotedAt: 42 })

    expect(store.currencyOptions.find((currency) => currency.code === 'KRW')?.exponent).toBe(0)
    expect(quote).toMatchObject({
      ok: true,
      quotedMoney: { amountMinor: 542, currency: 'USD' },
      rateSetId: 'wallet-rates-bundled-average-v1',
      quotedAt: 42,
    })
    expect(store.formatMoney(quote.quotedMoney, { locale: 'en-US' })).toBe('USD 5.42')
  })

  test('persists rate revisions and migrates legacy numeric rate payloads', () => {
    const store = useWalletStore()
    store.resetForTesting()

    const bundledRateSetId = store.exchangeRates.rateSetId
    expect(store.setUsdCnyRate('7.35')).toBe(7.35)
    expect(store.exchangeRates).toMatchObject({
      revision: 2,
      rateSource: 'user_edit',
      reference: { rate: '7.35' },
    })
    expect(store.exchangeRates.rateSetId).not.toBe(bundledRateSetId)

    const snapshot = store.createBackupSnapshot()
    const revisedRateSetId = snapshot.exchangeRates.rateSetId
    store.resetForTesting()
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.exchangeRates.rateSetId).toBe(revisedRateSetId)
    expect(store.exchangeRates.reference.rate).toBe('7.35')

    expect(
      store.restoreFromBackup({
        registeredCurrencies: [{ code: 'CRD', exponent: 0 }],
        exchangeRates: {
          reference: { rate: 7.4 },
          ratesToUsd: { CRD: 0.05 },
        },
        transactions: [],
      }),
    ).toBe(true)
    expect(store.exchangeRates).toMatchObject({
      rateSetId: 'wallet-rates-legacy-v1',
      reference: { rate: '7.4' },
    })
    expect(store.exchangeRates.ratesToUsd.CRD).toBe('0.05')
    expect(store.currencyOptions.find((currency) => currency.code === 'CRD')?.exponent).toBe(0)
  })

  test('creates stable role payee accounts while keeping self profiles account-free', () => {
    const evaAccounts = createDefaultRolePayeeAccounts({
      profileId: 1,
      roleId: 'eva',
      entityType: 'main_role',
    })
    const sameEvaAccounts = createDefaultRolePayeeAccounts({
      profileId: 1,
      roleId: 'eva',
      entityType: 'main_role',
    })
    const koreanRoleAccounts = createDefaultRolePayeeAccounts({
      profileId: 2,
      roleId: 'idol-2',
      entityType: 'main_role',
    })

    expect(evaAccounts).toEqual(sameEvaAccounts)
    expect(evaAccounts[0]).toMatchObject({
      id: 'role_payee_1_icbc_cny',
      institutionId: 'icbc',
      currency: 'CNY',
      status: 'active',
      isPrimary: true,
    })
    expect(koreanRoleAccounts[0]).toMatchObject({
      id: 'role_payee_2_kb-kookmin_krw',
      institutionId: 'kb-kookmin',
      currency: 'KRW',
    })
    expect(
      createDefaultRolePayeeAccounts({
        profileId: 999,
        roleId: 'self',
        entityType: 'self_profile',
      }),
    ).toEqual([])
  })

  test('validates same-currency role transfers, deducts the source account, and persists receipts', () => {
    const store = useWalletStore()
    store.resetForTesting()
    const account = createDefaultRolePayeeAccounts({
      profileId: 1,
      roleId: 'eva',
      entityType: 'main_role',
    })[0]
    const knownPayee = store.rememberRolePayeeAccount({
      account,
      profile: { id: 1, roleId: 'eva', name: 'Eva' },
      contact: { id: 1, profileId: 1, name: 'Eva' },
      sourceChatId: 1,
      sourceMessageId: 'chat_payee_share_1',
    })
    store.addTransaction({
      type: 'income',
      title: 'Opening balance',
      amount: '100.00',
      currency: 'CNY',
      accountId: 'wallet_account_icbc_cny',
    })

    expect(
      store.addRolePayeeTransfer({
        payeeAccountId: knownPayee.id,
        amount: '10.00',
        accountId: 'wallet_account_chase_usd',
      }),
    ).toMatchObject({ ok: false, reason: 'currency_mismatch', transaction: null })
    expect(
      store.addRolePayeeTransfer({
        payeeAccountId: knownPayee.id,
        amount: '120.00',
        accountId: 'wallet_account_icbc_cny',
      }),
    ).toMatchObject({ ok: false, reason: 'insufficient_funds', transaction: null })

    const result = store.addRolePayeeTransfer({
      payeeAccountId: knownPayee.id,
      amount: '25.50',
      accountId: 'wallet_account_icbc_cny',
      cardId: 'wallet_card_icbc_cny',
      note: 'Dinner share',
      sourceChatId: 1,
      sourceMessageId: 'chat_payee_share_1',
    })

    expect(result.ok).toBe(true)
    expect(result.transaction).toMatchObject({
      type: 'expense',
      direction: 'outgoing',
      amountCents: 2550,
      currency: 'CNY',
      accountId: 'wallet_account_icbc_cny',
      cardId: 'wallet_card_icbc_cny',
      counterparty: 'Eva',
      sourceModule: 'wallet_payee_transfer',
      sourceId: knownPayee.id,
      transferStatus: 'completed',
      payeeAccountId: knownPayee.id,
      recipientProfileId: 1,
      recipientContactId: 1,
      sourceChatId: 1,
      sourceMessageId: 'chat_payee_share_1',
    })
    expect(result.transaction.receiptNumber).toMatch(/^SP20260101\d{6}$/)
    expect(
      store.bankAccountSummaries.find((item) => item.id === 'wallet_account_icbc_cny')
        ?.primaryBalance,
    ).toMatchObject({ amountCents: 7450, amount: '74.50' })
    expect(store.transactionSourceSummary.chat).toBe(1)

    const snapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.findKnownPayeeAccountById(knownPayee.id)).toMatchObject({
      ownerProfileId: 1,
      currency: 'CNY',
    })
    expect(store.findTransactionById(result.transaction.id)).toMatchObject({
      receiptNumber: result.transaction.receiptNumber,
      sourceModule: 'wallet_payee_transfer',
    })
    expect(store.removeKnownPayeeAccountsForProfile(1)).toBe(1)
    expect(store.findKnownPayeeAccountById(knownPayee.id)).toBeNull()
  })
})
