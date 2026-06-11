import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import WalletView from '../src/views/WalletView.vue'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useWalletStore } from '../src/stores/wallet'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/wallet', component: WalletView },
      { path: '/home', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountWalletView = async () => {
  const router = createTestRouter()
  await router.push('/wallet')
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

    await wrapper.get('[data-testid="wallet-relationship-contact"]').setValue('2')
    await wrapper.get('[data-testid="wallet-transfer-amount"]').setValue('36.50')
    await wrapper.get('[data-testid="wallet-submit-transfer"]').trigger('click')
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

    await wrapper.get('[data-testid="wallet-primary-currency"]').setValue('EUR')
    await wrapper.get('[data-testid="wallet-save-primary-currency"]').trigger('click')
    await flushUi()

    expect(walletStore.primaryCurrency).toBe('EUR')
    await wrapper.get('[data-testid="wallet-transfer-currency"]').setValue('EUR')

    await wrapper.get('[data-testid="wallet-transfer-amount"]').setValue('12.00')
    await wrapper.get('[data-testid="wallet-submit-transfer"]').trigger('click')
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

    await wrapper.get('[data-testid="wallet-usd-cny-rate"]').setValue('7.35')
    await wrapper.get('[data-testid="wallet-save-usd-cny-rate"]').trigger('click')
    await flushUi()

    expect(walletStore.exchangeRates.reference.rate).toBe(7.35)

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

    await wrapper.get('[data-testid="wallet-relationship-contact"]').setValue('2')
    await wrapper.get('[data-testid="wallet-transfer-amount"]').setValue('36.50')
    await wrapper.get('[data-testid="wallet-submit-transfer"]').trigger('click')
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
})
