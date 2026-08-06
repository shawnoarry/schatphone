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
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 2, name: 'Jackie' }).metrics.trust).toBe(54)

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
    await wrapper
      .get('[data-testid="wallet-transfer-account"]')
      .setValue('wallet_account_bnp_eur')
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

    expect(walletStore.exchangeRateRows.find((row) => row.code === 'CRD')?.rateToCnyLabel).toBe('0.2500')
    expect(wrapper.get('[data-testid="wallet-rate-row-CRD"]').text()).toContain('CRD')

    wrapper.unmount()
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

    await wrapper.get(`[data-testid="wallet-remove-transaction-${transaction.id}"]`).trigger('click')
    await flushUi()

    expect(walletStore.findTransactionById(transaction.id)).toBeNull()
    expect(relationshipRuntimeStore.events).toHaveLength(0)
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 2, name: 'Jackie' }).exists).toBe(false)

    wrapper.unmount()
  })

  test('renders seven bank cards and exposes the Hana multi-currency credit card', async () => {
    const walletStore = useWalletStore()
    const { wrapper } = await mountWalletView()

    expect(wrapper.findAll('[data-testid^="wallet-payment-card-"]')).toHaveLength(7)
    expect(wrapper.get('[data-testid="wallet-payment-card-wallet_card_hana_global_credit"]').text()).toContain(
      'Global One',
    )
    expect(walletStore.findPaymentCardById('wallet_card_hana_global_credit')?.supportedCurrencies).toHaveLength(6)

    wrapper.unmount()
  })

  test('selects a bank card and manages it from the card detail view', async () => {
    const walletStore = useWalletStore()
    const { wrapper } = await mountWalletView()

    await wrapper.get('[data-testid="wallet-payment-card-wallet_card_chase_usd"]').trigger('click')
    await flushUi()
    expect(walletStore.activeCardId).toBe('wallet_card_chase_usd')

    await wrapper.get('[data-testid="wallet-open-active-card"]').trigger('click')
    await wrapper.get('[data-testid="wallet-set-default-card"]').trigger('click')
    await flushUi()
    expect(walletStore.findPaymentCardById('wallet_card_chase_usd')?.isDefault).toBe(true)

    await wrapper.get('[data-testid="wallet-toggle-card-frozen"]').trigger('click')
    await flushUi()
    expect(walletStore.findPaymentCardById('wallet_card_chase_usd')?.status).toBe('frozen')

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
      walletStore.bankAccountSummaries.find(
        (account) => account.id === 'wallet_account_icbc_cny',
      )?.primaryBalance,
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
    expect(router.currentRoute.value.query.receiptId).toBe(transfer.id)

    await wrapper.get('[data-testid="wallet-receipt-open-activity"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.query.receiptId).toBeUndefined()
    await wrapper.get(`[data-testid="wallet-open-receipt-${transfer.id}"]`).trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="wallet-transfer-receipt"]').text()).toContain('25.50 CNY')

    const receiptRoute = router.currentRoute.value.fullPath
    wrapper.unmount()
    const remounted = await mountWalletView(receiptRoute)
    expect(remounted.wrapper.get('[data-testid="wallet-transfer-receipt"]').text()).toContain(
      transfer.receiptNumber,
    )
    remounted.wrapper.unmount()
  })
})
