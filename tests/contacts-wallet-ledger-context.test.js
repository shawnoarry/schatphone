import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ContactsView from '../src/views/ContactsView.vue'
import { useChatStore } from '../src/stores/chat'
import { useWalletStore } from '../src/stores/wallet'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', component: ContactsView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('ContactsView wallet ledger context', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('shows read-only Wallet ledger summaries on matching role profiles', async () => {
    const chatStore = useChatStore()
    const walletStore = useWalletStore()
    walletStore.resetForTesting()
    chatStore.addRoleProfile({
      name: 'Nova',
      role: 'Trader',
      isMain: true,
    })
    walletStore.addTransferTransaction({
      amount: '50.00',
      currency: 'CNY',
      counterparty: 'Nova',
    })
    walletStore.addChatTransferTransaction({
      messageId: 'msg_contacts_wallet_1',
      amount: '12.00',
      currency: 'CNY',
      counterparty: 'Nova',
      note: 'Coffee',
    })

    const router = createTestRouter()
    await router.push('/contacts')
    await router.isReady()

    const wrapper = mount(ContactsView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.text()).toContain('Nova')
    expect(wrapper.text()).toMatch(/账本 2 条|2 ledger item/)
    expect(wrapper.text()).toContain('38.00 CNY')
    expect(wrapper.text()).toMatch(/来自 Chat|from Chat/)

    wrapper.unmount()
  })
})
