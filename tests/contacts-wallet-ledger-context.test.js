import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ContactsView from '../src/views/ContactsView.vue'
import { useChatStore } from '../src/stores/chat'
import { useGalleryStore } from '../src/stores/gallery'
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

  test('creates role profiles with shared avatar image sources', async () => {
    const chatStore = useChatStore()
    const galleryStore = useGalleryStore()
    galleryStore.resetForTesting()
    const imported = galleryStore.importAssetFromUrl({
      url: 'https://example.com/avatar-gallery.png',
      name: 'Avatar Gallery',
      category: 'reference',
    })
    expect(imported.ok).toBe(true)

    const router = createTestRouter()
    await router.push('/contacts')
    await router.isReady()

    const wrapper = mount(ContactsView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('button.text-blue-500.text-xl').trigger('click')
    await flushUi()
    await wrapper.get('input[placeholder="名字 / 昵称"]').setValue('Gallery Nova')
    await wrapper.get('[data-testid="contacts-profile-avatar-image-source"]').setValue('gallery')
    await wrapper.get('[data-testid="contacts-profile-avatar-gallery-asset"]').setValue(imported.assetId)
    await wrapper.get('button.font-bold.text-blue-500').trigger('click')
    await flushUi()

    const galleryProfile = chatStore.roleProfiles.find((profile) => profile.name === 'Gallery Nova')
    expect(galleryProfile?.avatar).toBe('')
    expect(galleryProfile?.avatarImage).toMatchObject({
      sourceType: 'gallery',
      galleryAssetId: imported.assetId,
    })
    expect(wrapper.text()).toContain('Gallery Nova')

    await wrapper.get('button.text-blue-500.text-xl').trigger('click')
    await flushUi()
    await wrapper.get('input[placeholder="名字 / 昵称"]').setValue('Url Nova')
    await wrapper.get('[data-testid="contacts-profile-avatar-image-source"]').setValue('url')
    await wrapper.get('[data-testid="contacts-profile-avatar-image-url"]').setValue('https://example.com/url-nova.png')
    await wrapper.get('button.font-bold.text-blue-500').trigger('click')
    await flushUi()

    const urlProfile = chatStore.roleProfiles.find((profile) => profile.name === 'Url Nova')
    expect(urlProfile?.avatar).toBe('https://example.com/url-nova.png')
    expect(urlProfile?.avatarImage).toMatchObject({
      sourceType: 'url',
      url: 'https://example.com/url-nova.png',
    })

    wrapper.unmount()
  })
})
