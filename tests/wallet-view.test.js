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
})
