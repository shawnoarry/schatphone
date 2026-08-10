import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import WalletView from '../src/views/WalletView.vue'
import { useChatStore } from '../src/stores/chat'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useWalletStore } from '../src/stores/wallet'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/wallet', component: WalletView },
      { path: '/chat', component: DummyView },
      { path: '/chat/:id', component: DummyView },
      { path: '/home', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountWalletView = async (path = '/wallet') => {
  const router = createTestRouter()
  await router.push(path)
  await router.isReady()
  const wrapper = mount(WalletView, {
    global: {
      plugins: [router],
    },
  })
  await flushUi()
  return { wrapper, router }
}

describe('WalletView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-17T08:00:00.000Z'))
    setActivePinia(createPinia())
    useWalletStore().resetForTesting()
    useRelationshipRuntimeStore().resetForTesting()
  })

  test('records a selected Chat contact transfer as a relationship fact', async () => {
    const walletStore = useWalletStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { wrapper } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-open-transfer"]').trigger('click')
    await wrapper.get('[data-testid="wallet-transfer-incoming"]').trigger('click')
    await wrapper.get('[data-testid="wallet-relationship-contact"]').setValue('2')
    await wrapper.get('[data-testid="wallet-transfer-amount"]').setValue('36.50')
    await wrapper.get('[data-testid="wallet-transfer-form"]').trigger('submit')
    await flushUi()

    expect(walletStore.transactionCount).toBe(1)
    expect(walletStore.listTransactionsBySourceFilter('all')[0]).toMatchObject({
      counterparty: 'Jackie',
      amountCents: 3650,
      sourceModule: 'wallet_manual',
    })
    expect(relationshipRuntimeStore.events).toHaveLength(1)
    expect(relationshipRuntimeStore.events[0]).toMatchObject({
      factType: 'transfer_recorded',
      sourceModule: 'relationship_wallet_shared_transfer',
      targetLabel: 'Jackie',
      status: 'applied',
    })
    expect(
      relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 2, name: 'Jackie' }).metrics
        .trust,
    ).toBe(54)

    wrapper.unmount()
  })

  test('updates the finance primary currency from Wallet settings', async () => {
    const walletStore = useWalletStore()
    const { wrapper } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-open-settings"]').trigger('click')
    await wrapper.get('[data-testid="wallet-primary-currency"]').setValue('EUR')
    await wrapper.get('[data-testid="wallet-save-primary-currency"]').trigger('click')
    await flushUi()

    expect(walletStore.primaryCurrency).toBe('EUR')
    await wrapper.get('[data-testid="wallet-header-back"]').trigger('click')
    await wrapper.get('[data-testid="wallet-open-transfer"]').trigger('click')
    await wrapper.get('[data-testid="wallet-transfer-incoming"]').trigger('click')
    await wrapper.get('[data-testid="wallet-transfer-account"]').setValue('wallet_account_bnp_eur')
    await flushUi()

    await wrapper.get('[data-testid="wallet-transfer-amount"]').setValue('12.00')
    await wrapper.get('[data-testid="wallet-transfer-form"]').trigger('submit')
    await flushUi()

    expect(walletStore.listTransactionsBySourceFilter('all')[0]).toMatchObject({
      amountCents: 1200,
      currency: 'EUR',
    })

    wrapper.unmount()
  })

  test('shows editable exchange rates for custom world currencies', async () => {
    const walletStore = useWalletStore()
    walletStore.registerWorldCurrency(
      {
        code: 'CRD',
        labelZh: '信用点',
        labelEn: 'Credits',
      },
      { id: 'survival_city' },
    )
    const { wrapper } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-open-settings"]').trigger('click')
    await wrapper.get('[data-testid="wallet-toggle-rate-settings"]').trigger('click')
    await wrapper.get('[data-testid="wallet-usd-cny-rate"]').setValue('7.35')
    await wrapper.get('[data-testid="wallet-save-usd-cny-rate"]').trigger('click')
    await flushUi()

    expect(walletStore.exchangeRates.reference.rate).toBe('7.35')

    await wrapper.get('[data-testid="wallet-cny-rate-CRD"]').setValue('0.25')
    await wrapper.get('[data-testid="wallet-save-cny-rate-CRD"]').trigger('click')
    await flushUi()

    expect(walletStore.exchangeRateRows.find((row) => row.code === 'CRD')?.rateToCnyLabel).toBe(
      '0.2500',
    )
    expect(wrapper.get('[data-testid="wallet-rate-row-CRD"]').text()).toContain('CRD')

    wrapper.unmount()
  })

  test('searches Wallet Activity across transaction identity and provenance fields', async () => {
    const walletStore = useWalletStore()
    const manualTransaction = walletStore.addTransaction({
      type: 'income',
      title: 'Studio refund',
      counterparty: 'Nova Studio',
      amount: '18.50',
      currency: 'CNY',
      note: 'Lighting deposit',
      sourceModule: 'wallet_manual',
      sourceId: 'manual-refund-17',
      createdAt: new Date('2026-05-16T06:00:00.000Z').getTime(),
    })
    const shoppingTransaction = walletStore.addTransaction({
      type: 'expense',
      title: 'Shopping order',
      counterparty: 'Schat Mall',
      amount: '88.00',
      currency: 'CNY',
      sourceModule: 'shopping_wallet_expense',
      sourceId: 'shopping-order-42',
      createdAt: new Date('2026-05-17T06:00:00.000Z').getTime(),
    })
    const { wrapper } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-open-activity"]').trigger('click')
    const search = wrapper.get('[data-testid="wallet-activity-search"]')

    await search.setValue('nova studio')
    expect(
      wrapper
        .find(`[data-testid="wallet-open-transaction-detail-${manualTransaction.id}"]`)
        .exists(),
    ).toBe(true)
    expect(
      wrapper
        .find(`[data-testid="wallet-open-transaction-detail-${shoppingTransaction.id}"]`)
        .exists(),
    ).toBe(false)

    await search.setValue('shopping-order-42')
    expect(
      wrapper
        .find(`[data-testid="wallet-open-transaction-detail-${manualTransaction.id}"]`)
        .exists(),
    ).toBe(false)
    expect(
      wrapper
        .find(`[data-testid="wallet-open-transaction-detail-${shoppingTransaction.id}"]`)
        .exists(),
    ).toBe(true)
    expect(wrapper.get('[data-testid="wallet-activity-result-count"]').text()).toContain('1')

    wrapper.unmount()
  })

  test('combines Activity source filtering with search and clears the query', async () => {
    const walletStore = useWalletStore()
    const manualTransaction = walletStore.addTransaction({
      type: 'income',
      title: 'Coffee reimbursement',
      counterparty: 'Nova',
      amount: '12.00',
      currency: 'CNY',
      sourceModule: 'wallet_manual',
      sourceId: 'manual-coffee-1',
    })
    walletStore.addTransaction({
      type: 'expense',
      title: 'Coffee beans order',
      counterparty: 'Harbor Roast',
      amount: '36.00',
      currency: 'CNY',
      sourceModule: 'food_delivery_wallet_expense',
      sourceId: 'food-coffee-1',
    })
    const { wrapper } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-open-activity"]').trigger('click')
    await wrapper.get('[data-testid="wallet-activity-search"]').setValue('coffee')
    await wrapper.get('[data-testid="wallet-activity-filter-orders"]').trigger('click')
    expect(wrapper.get('[data-testid="wallet-activity-result-count"]').text()).toContain('1')
    expect(wrapper.text()).toContain('Coffee beans order')
    expect(wrapper.text()).not.toContain('Coffee reimbursement')

    await wrapper.get('[data-testid="wallet-activity-search"]').setValue('nova')
    expect(wrapper.text()).toContain('没有匹配的交易')
    expect(wrapper.get('[data-testid="wallet-activity-result-count"]').text()).toContain('0')

    await wrapper.get('[data-testid="wallet-activity-search-clear"]').trigger('click')
    expect(wrapper.get('[data-testid="wallet-activity-search"]').element.value).toBe('')
    expect(wrapper.text()).toContain('Coffee beans order')
    expect(
      wrapper
        .find(`[data-testid="wallet-open-transaction-detail-${manualTransaction.id}"]`)
        .exists(),
    ).toBe(false)

    wrapper.unmount()
  })

  test('shows monthly statement totals separately by month and original currency', async () => {
    const walletStore = useWalletStore()
    const mayDate = (day) => new Date(2026, 4, day, 12, 0, 0).getTime()
    walletStore.addTransaction({
      type: 'income',
      title: 'May CNY income',
      amount: '100.00',
      currency: 'CNY',
      createdAt: mayDate(1),
    })
    walletStore.addTransaction({
      type: 'expense',
      title: 'May CNY expense',
      amount: '35.50',
      currency: 'CNY',
      createdAt: mayDate(2),
    })
    walletStore.addTransaction({
      type: 'income',
      title: 'May USD income',
      amount: '2.20',
      currency: 'USD',
      createdAt: mayDate(3),
    })
    walletStore.addTransaction({
      type: 'expense',
      title: 'May USD expense',
      amount: '12.20',
      currency: 'USD',
      createdAt: mayDate(4),
    })
    walletStore.addTransaction({
      type: 'income',
      title: 'April CNY income',
      amount: '8.00',
      currency: 'CNY',
      createdAt: new Date(2026, 3, 30, 12, 0, 0).getTime(),
    })
    const { wrapper } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-open-activity"]').trigger('click')
    await wrapper.get('[data-testid="wallet-open-monthly-statement"]').trigger('click')

    expect(wrapper.get('[data-testid="wallet-statement-month-select"]').element.value).toBe(
      '2026-05',
    )
    expect(wrapper.get('[data-testid="wallet-statement-total-CNY"]').text()).toContain('+100.00')
    expect(wrapper.get('[data-testid="wallet-statement-total-CNY"]').text()).toContain('-35.50')
    expect(wrapper.get('[data-testid="wallet-statement-total-CNY"]').text()).toContain('+64.50')
    expect(wrapper.get('[data-testid="wallet-statement-total-USD"]').text()).toContain('+2.20')
    expect(wrapper.get('[data-testid="wallet-statement-total-USD"]').text()).toContain('-12.20')
    expect(wrapper.get('[data-testid="wallet-statement-total-USD"]').text()).toContain('-10.00')
    expect(
      wrapper.get('[data-testid="wallet-monthly-statement-transactions"]').text(),
    ).not.toContain('April CNY income')

    await wrapper.get('[data-testid="wallet-statement-month-select"]').setValue('2026-04')
    expect(wrapper.get('[data-testid="wallet-statement-total-CNY"]').text()).toContain('+8.00')
    expect(wrapper.find('[data-testid="wallet-statement-total-USD"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="wallet-monthly-statement-transactions"]').text()).toContain(
      'April CNY income',
    )

    wrapper.unmount()
  })

  test('returns from a statement transaction detail to the selected month', async () => {
    const walletStore = useWalletStore()
    const transaction = walletStore.addTransaction({
      type: 'expense',
      title: 'Monthly detail target',
      amount: '18.00',
      currency: 'CNY',
      createdAt: new Date(2026, 4, 10, 12, 0, 0).getTime(),
    })
    const { wrapper, router } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-open-activity"]').trigger('click')
    await wrapper.get('[data-testid="wallet-open-monthly-statement"]').trigger('click')
    await wrapper
      .get(`[data-testid="wallet-open-statement-transaction-${transaction.id}"]`)
      .trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="wallet-transaction-detail"]').text()).toContain(
      'Monthly detail target',
    )
    expect(router.currentRoute.value.query.transactionId).toBe(transaction.id)

    await wrapper.get('[data-testid="wallet-header-back"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="wallet-monthly-statement"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="wallet-statement-month-select"]').element.value).toBe(
      '2026-05',
    )
    expect(router.currentRoute.value.query.transactionId).toBeUndefined()

    await wrapper.get('[data-testid="wallet-header-back"]').trigger('click')
    expect(wrapper.get('[data-testid="wallet-activity-search"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('shows an honest empty monthly statement before any activity is recorded', async () => {
    const { wrapper } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-open-activity"]').trigger('click')
    await wrapper.get('[data-testid="wallet-open-monthly-statement"]').trigger('click')

    expect(wrapper.get('[data-testid="wallet-monthly-statement"]').text()).toContain(
      '还没有可生成账单的记录',
    )
    expect(wrapper.find('[data-testid="wallet-statement-month-select"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('opens a saved quote detail that remains stable across rate changes and direct reopen', async () => {
    const walletStore = useWalletStore()
    const quoteSnapshot = {
      sourceMoney: { amountMinor: 8800, currency: 'CNY' },
      quotedMoney: { amountMinor: 1222, currency: 'USD' },
      targetCurrency: 'USD',
      rateSetId: 'wallet-rates-test-20260516',
      rate: '0.1389',
      rateSource: 'bundled_average',
      quotedAt: new Date('2026-05-16T11:30:00.000Z').getTime(),
    }
    const transaction = walletStore.addTransaction({
      type: 'expense',
      title: 'Shopping order',
      counterparty: 'Schat Mall',
      amount: '12.22',
      currency: 'USD',
      accountId: 'wallet_account_chase_usd',
      cardId: 'wallet_card_chase_usd',
      sourceModule: 'shopping_wallet_expense',
      sourceId: 'shopping_order_quote_20260516',
      quoteSnapshot,
      createdAt: new Date('2026-05-17T07:30:00.000Z').getTime(),
    })
    const { wrapper, router } = await mountWalletView('/wallet?from=home&homePage=2')

    await wrapper.get('[data-testid="wallet-open-activity"]').trigger('click')
    await wrapper
      .get(`[data-testid="wallet-open-transaction-detail-${transaction.id}"]`)
      .trigger('click')
    await flushUi()

    const detail = wrapper.get('[data-testid="wallet-transaction-detail"]')
    expect(detail.text()).toContain('Shopping order')
    expect(detail.text()).toContain('Schat Mall')
    expect(detail.text()).toContain('Shopping')
    expect(detail.text()).toContain('shopping_order_quote_20260516')
    expect(detail.text()).toMatch(/摩根大通银行|JPMorgan Chase/)
    expect(detail.text()).toContain('美元借记卡')
    expect(wrapper.get('[data-testid="wallet-transaction-detail-source-money"]').text()).toBe(
      '88.00 CNY',
    )
    expect(wrapper.get('[data-testid="wallet-transaction-detail-quoted-money"]').text()).toBe(
      '12.22 USD',
    )
    expect(wrapper.get('[data-testid="wallet-transaction-detail-rate"]').text()).toBe(
      '1 CNY = 0.1389 USD',
    )
    expect(wrapper.get('[data-testid="wallet-transaction-detail-rate-set"]').text()).toBe(
      quoteSnapshot.rateSetId,
    )
    expect(wrapper.get('[data-testid="wallet-transaction-detail-rate-source"]').text()).toContain(
      quoteSnapshot.rateSource,
    )
    expect(wrapper.get('[data-testid="wallet-transaction-detail-quoted-at"]').text()).toContain(
      '2026',
    )
    expect(router.currentRoute.value.query).toMatchObject({
      transactionId: transaction.id,
      from: 'home',
      homePage: '2',
    })

    const recordedDetail = {
      source: wrapper.get('[data-testid="wallet-transaction-detail-source-money"]').text(),
      quoted: wrapper.get('[data-testid="wallet-transaction-detail-quoted-money"]').text(),
      rate: wrapper.get('[data-testid="wallet-transaction-detail-rate"]').text(),
      rateSet: wrapper.get('[data-testid="wallet-transaction-detail-rate-set"]').text(),
    }
    walletStore.setPrimaryCurrency('EUR')
    walletStore.setUsdCnyRate('8.25')
    await flushUi()

    expect(wrapper.get('[data-testid="wallet-transaction-detail-source-money"]').text()).toBe(
      recordedDetail.source,
    )
    expect(wrapper.get('[data-testid="wallet-transaction-detail-quoted-money"]').text()).toBe(
      recordedDetail.quoted,
    )
    expect(wrapper.get('[data-testid="wallet-transaction-detail-rate"]').text()).toBe(
      recordedDetail.rate,
    )
    expect(wrapper.get('[data-testid="wallet-transaction-detail-rate-set"]').text()).toBe(
      recordedDetail.rateSet,
    )

    const directRoute = router.currentRoute.value.fullPath
    wrapper.unmount()
    const remounted = await mountWalletView(directRoute)
    expect(remounted.wrapper.get('[data-testid="wallet-transaction-detail"]').text()).toContain(
      'Shopping order',
    )
    await remounted.wrapper.get('[data-testid="wallet-header-back"]').trigger('click')
    await flushUi()
    expect(remounted.router.currentRoute.value.query.transactionId).toBeUndefined()
    expect(remounted.router.currentRoute.value.query).toMatchObject({ from: 'home', homePage: '2' })
    expect(
      remounted.wrapper
        .get(`[data-testid="wallet-open-transaction-detail-${transaction.id}"]`)
        .exists(),
    ).toBe(true)
    remounted.wrapper.unmount()
  })

  test('shows legacy, deleted, missing, and unknown-currency transaction states honestly', async () => {
    const walletStore = useWalletStore()
    const legacyTransaction = walletStore.addTransaction({
      type: 'income',
      title: 'Legacy allowance',
      amount: '5.00',
      currency: 'CNY',
      sourceModule: 'wallet_manual',
      quoteSnapshot: {
        sourceMoney: { amountMinor: 500, currency: 'CNY' },
      },
    })
    const { wrapper, router } = await mountWalletView(
      `/wallet?transactionId=${legacyTransaction.id}&from=home&homePage=1`,
    )

    expect(wrapper.get('[data-testid="wallet-transaction-detail-legacy"]').text()).toContain(
      '旧版记录，无报价快照',
    )

    walletStore.removeTransaction(legacyTransaction.id)
    await flushUi()
    expect(wrapper.get('[data-testid="wallet-transaction-detail-unavailable"]').text()).toContain(
      '找不到这笔交易',
    )
    await wrapper.get('[data-testid="wallet-transaction-detail-return-activity"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.query.transactionId).toBeUndefined()
    expect(router.currentRoute.value.query).toMatchObject({ from: 'home', homePage: '1' })
    wrapper.unmount()

    const missing = await mountWalletView('/wallet?transactionId=missing-transaction')
    expect(
      missing.wrapper.get('[data-testid="wallet-transaction-detail-unavailable"]').exists(),
    ).toBe(true)
    missing.wrapper.unmount()

    const unknownCurrencyTransaction = walletStore.addTransaction({
      type: 'expense',
      title: 'World market order',
      amount: '1.00',
      currency: 'USD',
      sourceModule: 'shopping_wallet_expense',
      sourceId: 'world_market_order_1',
      quoteSnapshot: {
        sourceMoney: { amountMinor: 12345, currency: 'ZZZ' },
        quotedMoney: { amountMinor: 100, currency: 'USD' },
        targetCurrency: 'USD',
        rateSetId: 'world-rate-1',
        rate: '0.000081004455245',
        rateSource: 'world_pack',
        quotedAt: new Date('2026-05-16T10:00:00.000Z').getTime(),
      },
    })
    const unknownCurrency = await mountWalletView(
      `/wallet?transactionId=${unknownCurrencyTransaction.id}`,
    )
    expect(
      unknownCurrency.wrapper.get('[data-testid="wallet-transaction-detail-source-money"]').text(),
    ).toContain('12345 ZZZ · 最小单位')
    unknownCurrency.wrapper.unmount()
  })

  test('removes a transaction and clears its relationship fact from the module list', async () => {
    const walletStore = useWalletStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { wrapper } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-open-transfer"]').trigger('click')
    await wrapper.get('[data-testid="wallet-transfer-incoming"]').trigger('click')
    await wrapper.get('[data-testid="wallet-relationship-contact"]').setValue('2')
    await wrapper.get('[data-testid="wallet-transfer-amount"]').setValue('36.50')
    await wrapper.get('[data-testid="wallet-transfer-form"]').trigger('submit')
    await flushUi()

    const transaction = walletStore.listTransactionsBySourceFilter('all')[0]
    expect(relationshipRuntimeStore.events).toHaveLength(1)

    await wrapper
      .get(`[data-testid="wallet-remove-transaction-${transaction.id}"]`)
      .trigger('click')
    await flushUi()

    expect(walletStore.findTransactionById(transaction.id)).toBeNull()
    expect(relationshipRuntimeStore.events).toHaveLength(0)
    expect(
      relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 2, name: 'Jackie' }).exists,
    ).toBe(false)

    wrapper.unmount()
  })

  test('renders seven bank cards and exposes the Hana multi-currency credit card', async () => {
    const walletStore = useWalletStore()
    const { wrapper } = await mountWalletView()

    expect(wrapper.findAll('[data-testid^="wallet-payment-card-"]')).toHaveLength(7)
    expect(
      wrapper.get('[data-testid="wallet-payment-card-wallet_card_hana_global_credit"]').text(),
    ).toContain('Global One')
    expect(
      walletStore.findPaymentCardById('wallet_card_hana_global_credit')?.supportedCurrencies,
    ).toHaveLength(6)
    expect(wrapper.get('[data-testid="wallet-card-deck"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wallet-card-carousel"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-wallet-card-id]').at(-1).attributes('data-wallet-card-id')).toBe(
      walletStore.activeCardId,
    )

    wrapper.unmount()
  })

  test('selects a bank card and manages it from the card detail view', async () => {
    const walletStore = useWalletStore()
    const { wrapper } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-payment-card-wallet_card_chase_usd"]').trigger('click')
    await flushUi()
    expect(walletStore.activeCardId).toBe('wallet_card_chase_usd')
    expect(wrapper.findAll('[data-wallet-card-id]').at(-1).attributes('data-wallet-card-id')).toBe(
      'wallet_card_chase_usd',
    )

    await wrapper.get('[data-testid="wallet-open-active-card"]').trigger('click')
    await wrapper.get('[data-testid="wallet-set-default-card"]').trigger('click')
    await flushUi()
    expect(walletStore.findPaymentCardById('wallet_card_chase_usd')?.isDefault).toBe(true)

    await wrapper.get('[data-testid="wallet-toggle-card-frozen"]').trigger('click')
    await flushUi()
    expect(walletStore.findPaymentCardById('wallet_card_chase_usd')?.status).toBe('frozen')

    wrapper.unmount()
  })

  test('opens one card exclusive appearance catalog and equips an owned design', async () => {
    const walletStore = useWalletStore()
    const { wrapper } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-payment-card-wallet_card_bnp_eur"]').trigger('click')
    await wrapper.get('[data-testid="wallet-open-active-card"]').trigger('click')

    const appearanceEntry = wrapper.get('[data-testid="wallet-open-card-appearances"]')
    expect(appearanceEntry.text()).toContain('2 / 3')
    expect(appearanceEntry.text()).toContain('欧元标准卡')

    await appearanceEntry.trigger('click')
    expect(wrapper.get('[data-testid="wallet-card-appearance-collection"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid^="wallet-card-appearance-"]')).toHaveLength(4)
    expect(wrapper.get('[data-testid="wallet-card-appearance-bnp_sealed_01"]').text()).toContain(
      '尚未揭晓',
    )
    expect(
      wrapper.find('[data-testid="wallet-equip-card-appearance-bnp_sealed_01"]').exists(),
    ).toBe(false)

    await wrapper
      .get('[data-testid="wallet-equip-card-appearance-bnp_paris_rain"]')
      .trigger('click')
    await flushUi()

    expect(walletStore.findSelectedCardAppearance('wallet_card_bnp_eur')?.id).toBe('bnp_paris_rain')
    expect(wrapper.get('[data-testid="wallet-card-appearance-collection"]').text()).toContain(
      '巴黎雨夜',
    )
    expect(
      wrapper
        .get('[data-testid="wallet-payment-card-wallet_card_bnp_eur-appearance-current"]')
        .attributes('style'),
    ).toContain('bnp-paris-rain.webp')

    await wrapper.get('[data-testid="wallet-header-back"]').trigger('click')
    expect(wrapper.get('[data-testid="wallet-open-card-appearances"]').text()).toContain('巴黎雨夜')

    wrapper.unmount()
  })

  test('shows a visible verified-payee entry and an honest empty management state', async () => {
    const { wrapper } = await mountWalletView()

    expect(wrapper.get('[data-testid="wallet-open-verified-payees"]').text()).toContain(
      '0 个已验证账户',
    )
    await wrapper.get('[data-testid="wallet-open-verified-payees"]').trigger('click')

    expect(wrapper.get('[data-testid="wallet-verified-payees-empty"]').text()).toContain(
      '还没有已验证收款人',
    )
    expect(wrapper.get('[data-testid="wallet-header-back"]').text()).toContain('钱包')

    await wrapper.get('[data-testid="wallet-header-back"]').trigger('click')
    expect(wrapper.get('[data-testid="wallet-open-verified-payees"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('repeats a verified-payee transfer inside Wallet and returns to the payee list', async () => {
    const chatStore = useChatStore()
    const walletStore = useWalletStore()
    const profile = chatStore.getRoleProfileById(1)
    const contact = chatStore.getContactById(1)
    const knownPayee = walletStore.rememberRolePayeeAccount({
      account: profile.payeeAccounts[0],
      profile,
      contact,
      sourceChatId: contact.id,
      sourceMessageId: 'chat_payee_share_eva_repeat',
    })
    walletStore.addTransaction({
      type: 'income',
      title: 'Opening balance',
      amount: '100.00',
      currency: 'CNY',
      accountId: 'wallet_account_icbc_cny',
    })
    const { wrapper, router } = await mountWalletView()

    expect(wrapper.get('[data-testid="wallet-open-verified-payees"]').text()).toContain(
      '1 个已验证账户',
    )
    await wrapper.get('[data-testid="wallet-open-verified-payees"]').trigger('click')
    const payeeRow = wrapper.get(`[data-testid="wallet-payee-${knownPayee.id}"]`)
    expect(payeeRow.text()).toContain('Eva')
    expect(payeeRow.text()).toContain('中国工商银行')
    expect(payeeRow.text()).toContain(knownPayee.maskedAccountNumber)
    expect(payeeRow.text()).toContain('CNY')
    expect(payeeRow.text()).toContain('已验证')
    expect(payeeRow.attributes('aria-label')).toBe('再次向 Eva 转账')

    await payeeRow.trigger('click')
    await flushUi()

    expect(router.currentRoute.value.query).toMatchObject({
      source: 'wallet_payees',
      intent: 'payee_account',
      payeeAccountId: knownPayee.id,
    })
    expect(wrapper.get('[data-testid="wallet-header-back"]').text()).toContain('收款人')
    expect(wrapper.get('[data-testid="wallet-payee-transfer-amount"]').element.value).toBe('')
    expect(wrapper.get('[data-testid="wallet-payee-transfer-note"]').element.value).toBe('')

    await wrapper.get('[data-testid="wallet-header-back"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="wallet-verified-payees"]').exists()).toBe(true)
    expect(router.currentRoute.value.query.payeeAccountId).toBeUndefined()

    await wrapper.get(`[data-testid="wallet-payee-${knownPayee.id}"]`).trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="wallet-payee-transfer-amount"]').setValue('25.50')
    await wrapper.get('[data-testid="wallet-payee-transfer-note"]').setValue('Dinner repeat')
    await wrapper.get('[data-testid="wallet-payee-transfer-form"]').trigger('submit')
    await flushUi()

    expect(wrapper.get('[data-testid="wallet-transfer-receipt"]').text()).toContain('25.50 CNY')
    expect(wrapper.find('[data-testid="wallet-receipt-return-chat"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="wallet-receipt-return-payees"]').exists()).toBe(true)
    expect(router.currentRoute.value.query.source).toBe('wallet_payees')

    await wrapper.get('[data-testid="wallet-receipt-return-payees"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="wallet-verified-payees"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('confirms a Chat payee account transfer, records the relationship fact, and reopens its receipt', async () => {
    const chatStore = useChatStore()
    const walletStore = useWalletStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const profile = chatStore.getRoleProfileById(1)
    const contact = chatStore.getContactById(1)
    const roleAccount = profile.payeeAccounts[0]
    const knownPayee = walletStore.rememberRolePayeeAccount({
      account: roleAccount,
      profile,
      contact,
      sourceChatId: contact.id,
      sourceMessageId: 'chat_payee_share_eva_1',
    })
    walletStore.addTransaction({
      type: 'income',
      title: 'Opening balance',
      amount: '100.00',
      currency: 'CNY',
      accountId: 'wallet_account_icbc_cny',
    })
    const query = new URLSearchParams({
      intent: 'payee_account',
      payeeAccountId: knownPayee.id,
      profileId: String(profile.id),
      chatId: String(contact.id),
      messageId: 'chat_payee_share_eva_1',
      amount: '25.50',
      currency: 'CNY',
      note: 'Dinner share',
    })
    const { wrapper, router } = await mountWalletView(`/wallet?${query}`)

    expect(wrapper.get('[data-testid="wallet-payee-account-summary"]').text()).toContain('Eva')
    expect(wrapper.get('[data-testid="wallet-payee-transfer-currency"]').element.value).toBe('CNY')
    expect(wrapper.get('[data-testid="wallet-payee-transfer-amount"]').element.value).toBe('25.50')
    expect(wrapper.get('[data-testid="wallet-header-back"]').text()).toContain('Chat')
    expect(wrapper.findAll('[data-testid="wallet-payee-payment-account"] option')).toHaveLength(1)
    expect(wrapper.get('[data-testid="wallet-payee-payment-account"]').element.value).toBe(
      'wallet_account_icbc_cny',
    )

    await wrapper.get('[data-testid="wallet-payee-transfer-form"]').trigger('submit')
    await flushUi()

    const transfer = walletStore.listTransactionsBySourceFilter('chat')[0]
    expect(transfer).toMatchObject({
      amountCents: 2550,
      currency: 'CNY',
      counterparty: 'Eva',
      sourceModule: 'wallet_payee_transfer',
      sourceChatId: contact.id,
      sourceMessageId: 'chat_payee_share_eva_1',
      transferStatus: 'completed',
    })
    expect(transfer.receiptNumber).toMatch(/^SP20260517\d{6}$/)
    expect(
      walletStore.bankAccountSummaries.find((account) => account.id === 'wallet_account_icbc_cny')
        ?.primaryBalance,
    ).toMatchObject({ amountCents: 7450, amount: '74.50' })
    expect(relationshipRuntimeStore.events).toHaveLength(1)
    expect(relationshipRuntimeStore.events[0]).toMatchObject({
      factType: 'shared_expense',
      sourceModule: 'relationship_wallet_shared_transfer',
      targetLabel: 'Eva',
    })
    expect(wrapper.get('[data-testid="wallet-transfer-receipt"]').text()).toContain(
      transfer.receiptNumber,
    )
    expect(wrapper.get('[data-testid="wallet-receipt-share-chat"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="wallet-receipt-return-chat"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wallet-receipt-return-payees"]').exists()).toBe(false)
    expect(router.currentRoute.value.query.receiptId).toBe(transfer.id)

    await wrapper.get('[data-testid="wallet-receipt-open-activity"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.query.receiptId).toBeUndefined()
    await wrapper.get(`[data-testid="wallet-open-receipt-${transfer.id}"]`).trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="wallet-transfer-receipt"]').text()).toContain('25.50 CNY')
    expect(wrapper.find('[data-testid="wallet-receipt-return-chat"]').exists()).toBe(false)

    const receiptRoute = router.currentRoute.value.fullPath
    wrapper.unmount()
    const remounted = await mountWalletView(receiptRoute)
    expect(remounted.wrapper.get('[data-testid="wallet-transfer-receipt"]').text()).toContain(
      transfer.receiptNumber,
    )
    remounted.wrapper.unmount()
  })

  test('shares a receipt draft and returns a Chat-opened receipt to the receiving conversation', async () => {
    const chatStore = useChatStore()
    const walletStore = useWalletStore()
    const profile = chatStore.getRoleProfileById(1)
    const contact = chatStore.getContactById(1)
    const knownPayee = walletStore.rememberRolePayeeAccount({
      account: profile.payeeAccounts[0],
      profile,
      contact,
      sourceChatId: contact.id,
      sourceMessageId: 'chat_payee_share_eva_2',
    })
    walletStore.addTransaction({
      type: 'income',
      title: 'Opening balance',
      amount: '100.00',
      currency: 'CNY',
      accountId: 'wallet_account_icbc_cny',
    })
    const result = walletStore.addRolePayeeTransfer({
      payeeAccountId: knownPayee.id,
      amount: '12.80',
      accountId: 'wallet_account_icbc_cny',
      sourceChatId: 1,
      sourceMessageId: 'chat_payee_share_eva_2',
    })
    expect(result.ok).toBe(true)

    const receiptRoute = `/wallet?receiptId=${result.transaction.id}&source=activity`
    const { wrapper, router } = await mountWalletView(receiptRoute)
    await wrapper.get('[data-testid="wallet-receipt-share-chat"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.fullPath).toBe('/chat?share=internal')
    expect(JSON.parse(localStorage.getItem('schatphone:chat:internal-share-draft'))).toMatchObject({
      shareable: {
        type: 'wallet_receipt_share',
        sourceModule: 'wallet',
        sourceId: result.transaction.id,
        sourceEventId: result.transaction.receiptNumber,
        amountLabel: '12.80 CNY',
      },
      sourceRoute: receiptRoute,
    })

    await router.push(
      `/wallet?receiptId=${result.transaction.id}&intent=wallet_receipt_share&source=chat_share&returnChatId=2`,
    )
    await flushUi()
    expect(wrapper.get('[data-testid="wallet-transfer-receipt"]').text()).toContain('12.80 CNY')
    expect(wrapper.get('[data-testid="wallet-header-back"]').text()).toContain('Chat')
    expect(result.transaction.sourceChatId).toBe(1)

    await wrapper.get('[data-testid="wallet-receipt-return-chat"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.fullPath).toBe('/chat/2')

    wrapper.unmount()
  })
})
