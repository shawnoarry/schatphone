import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../src/lib/ai', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    callAI: vi.fn(async () => 'Mock assistant reply'),
  }
})

import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ChatView from '../src/views/ChatView.vue'
import ChatSettingsView from '../src/views/ChatSettingsView.vue'
import ChatMeView from '../src/views/ChatMeView.vue'
import ChatAppearanceView from '../src/views/ChatAppearanceView.vue'
import ChatFeaturePlaceholderView from '../src/views/ChatFeaturePlaceholderView.vue'
import ChatAppTabBar from '../src/components/chat/ChatAppTabBar.vue'
import ChatMessageRow from '../src/components/chat/ChatMessageRow.vue'
import { useChatStore } from '../src/stores/chat'
import { useGalleryStore } from '../src/stores/gallery'
import { useSystemStore } from '../src/stores/system'
import { useWalletStore } from '../src/stores/wallet'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import { callAI } from '../src/lib/ai'
import { getChatAppearanceClasses } from '../src/lib/chat-appearance'
import * as uiSfx from '../src/lib/ui-sfx'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat', component: ChatView },
      { path: '/chat/:id', component: ChatView },
      { path: '/chat-settings', component: ChatSettingsView },
      { path: '/chat-settings/appearance', component: ChatAppearanceView },
      { path: '/chat-appearance', redirect: '/chat-settings/appearance' },
      { path: '/chat-me', component: ChatMeView },
      { path: '/chat-feature/more', redirect: '/chat-me' },
      { path: '/chat-feature/identity', redirect: { path: '/chat-me', query: { section: 'identity' } } },
      { path: '/chat-feature/labs', redirect: { path: '/chat-settings', query: { section: 'diagnostics' } } },
      { path: '/chat-feature/:feature', component: ChatFeaturePlaceholderView },
      { path: '/chat-contacts', component: DummyView },
      { path: '/chat-groups', component: DummyView },
      { path: '/home', component: DummyView },
      { path: '/network', component: DummyView },
      { path: '/settings', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const createMessageRowProps = (overrides = {}) => {
  const { message: messageOverride, ...propOverrides } = overrides
  const defaultMessage = {
    id: 'row-message',
    role: 'assistant',
    content: 'Hello from the row.',
    blocks: [{ type: 'text', text: 'Hello from the row.', variant: 'primary' }],
  }
  const message = {
    ...defaultMessage,
    ...(messageOverride || {}),
  }

  return {
    layoutMode: 'kakao',
    activeSelfAvatar: '/avatars/self.png',
    activeContactAvatar: '/avatars/contact.png',
    senderName: 'Mina',
    isGroup: false,
    messageBlocks: (rowMessage) => rowMessage.blocks || [{ type: 'text', text: rowMessage.content || '' }],
    renderMarkdown: (text) => text || '',
    secondaryTextBadge: () => 'Translation / EN',
    resolveImageBlockUrl: () => '',
    formatVoiceDuration: () => '0:08',
    messageMetaHintText: () => '',
    messageStatusText: (rowMessage) => (rowMessage.role === 'user' ? 'Sent' : ''),
    transferActionLabel: () => 'Open',
    ...propOverrides,
    message,
  }
}

describe('Chat settings, Me, and appearance routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.mocked(callAI).mockReset()
    vi.mocked(callAI).mockResolvedValue('Mock assistant reply')
    localStorage.clear()
    resetDialogServiceForTest()
    document.head.querySelectorAll('[data-schatphone-chat-preview-css]').forEach((node) => node.remove())
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('opens Chat Settings from the Chat home gear', async () => {
    const router = createTestRouter()
    await router.push('/chat')
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-settings-button"]').classes()).toContain('chat-home-icon-button')
    expect(wrapper.find('.chat-home-sheet').exists()).toBe(true)

    await wrapper.get('[data-testid="chat-settings-button"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/chat-settings')

    wrapper.unmount()
  })

  test('renders image preview fallback copy without mojibake', () => {
    useSystemStore().settings.system.language = 'zh-CN'

    const wrapper = mount(ChatMessageRow, {
      props: createMessageRowProps({
        message: {
          id: 'image-row',
          role: 'assistant',
          content: '',
          blocks: [{ type: 'image_virtual', alt: 'smoke.png', caption: '' }],
        },
      }),
    })

    expect(wrapper.text()).toContain('图片预览')
    expect(wrapper.text()).not.toContain('鍥')

    wrapper.unmount()
  })

  test('opens Chat Me from the bottom tab and keeps the new tab id stable', async () => {
    const router = createTestRouter()
    await router.push('/chat')
    await router.isReady()

    const wrapper = mount(ChatAppTabBar, {
      props: {
        active: 'messages',
      },
      global: {
        plugins: [router],
      },
    })

    expect(wrapper.find('[data-testid="chat-app-tab-more"]').exists()).toBe(false)
    await wrapper.get('[data-testid="chat-app-tab-me"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/chat-me')

    await wrapper.setProps({ active: 'me' })
    await flushUi()
    expect(wrapper.get('[data-testid="chat-app-tab-me"]').classes()).toContain('is-active')
    expect(wrapper.get('[data-testid="chat-app-tab-me"]').attributes('aria-current')).toBe('page')

    wrapper.unmount()
  })

  test('redirects legacy More and Labs routes to the new owners', async () => {
    const router = createTestRouter()
    await router.push('/chat-feature/more')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/chat-me')

    await router.push('/chat-feature/labs')
    await flushUi()
    expect(router.currentRoute.value.path).toBe('/chat-settings')
    expect(router.currentRoute.value.query.section).toBe('diagnostics')
  })

  test('keeps Settings focused on appearance and diagnostics', async () => {
    const router = createTestRouter()
    await router.push('/chat-settings')
    await router.isReady()

    const wrapper = mount(ChatSettingsView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const text = wrapper.text()
    expect(text).toContain('Chat Appearance')
    expect(text).toContain('Maintenance & Diagnostics')
    expect(text).toContain('Default Thread Behavior')
    expect(wrapper.get('[data-testid="chat-settings-behavior"]').text()).toContain('Requests and blocks keep history')

    await wrapper.get('[data-testid="chat-settings-entry-appearance"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.path).toBe('/chat-settings/appearance')

    wrapper.unmount()
  })

  test('controls Chat message sounds and previews the selected profile', async () => {
    const router = createTestRouter()
    await router.push('/chat-settings')
    await router.isReady()
    const systemStore = useSystemStore()

    const wrapper = mount(ChatSettingsView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-settings-entry-sound"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.query.section).toBe('sound')
    expect(wrapper.get('[data-testid="chat-settings-sound"]')).toBeTruthy()

    const previewSpy = vi.spyOn(uiSfx, 'playUiCue').mockReturnValue({ stop: vi.fn() })
    const select = wrapper.get('[data-testid="chat-settings-sound-select"]')
    await select.setValue('kakaotalk')
    await flushUi()
    expect(systemStore.settings.appearance.chat.soundEffectsProfile).toBe('kakaotalk')
    expect(systemStore.settings.appearance.soundEffectsProfile).toBe('wechat')

    await wrapper.get('[data-testid="chat-settings-sound-preview"]').trigger('click')
    expect(previewSpy).toHaveBeenCalledWith(
      'notification',
      { profile: 'kakaotalk' },
    )

    const toggle = wrapper.get('[data-testid="chat-settings-sound-toggle"]')
    expect(toggle.attributes('aria-checked')).toBe('true')
    await toggle.trigger('click')
    await flushUi()
    expect(systemStore.settings.appearance.chat.soundEffectsEnabled).toBe(false)
    expect(toggle.attributes('aria-checked')).toBe('false')
    await toggle.trigger('click')
    await flushUi()
    expect(systemStore.settings.appearance.chat.soundEffectsEnabled).toBe(true)
    expect(systemStore.settings.appearance.soundEffectsEnabled).toBe(true)

    wrapper.unmount()
  })
  test('shows disabled system notification state in Chat Settings', async () => {
    const router = createTestRouter()
    await router.push('/chat-settings')
    await router.isReady()
    const systemStore = useSystemStore()
    systemStore.settings.system.notifications = false

    const wrapper = mount(ChatSettingsView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-settings-entry-immersion"]').text()).toContain(
      'System notifications off',
    )

    wrapper.unmount()
  })

  test('keeps Me focused on identity and recent interaction data', async () => {
    const router = createTestRouter()
    await router.push('/chat-me')
    await router.isReady()

    const wrapper = mount(ChatMeView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const text = wrapper.text()
    expect(text).toContain('Chat Identity & Anonymity')
    expect(text).toContain('Recent interactions')
    expect(text).toContain('Saved Messages')
    expect(text).toContain('My Feed')
    expect(text).not.toContain('Maintenance & Diagnostics')
    expect(text).not.toContain('Network reports')
    expect(text).not.toContain('Normalize checkpoints')
    expect(wrapper.get('[data-testid="chat-me-stats"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('orders recent interaction avatars by recent chat activity in Me', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const firstContact = chatStore.addContact({
      name: 'Ari Recent',
      kind: 'role',
      avatar: 'https://example.com/ari.png',
    })
    const secondContact = chatStore.addContact({
      name: 'Bea Recent',
      kind: 'role',
      avatar: 'https://example.com/bea.png',
    })
    const now = Date.now()

    Array.from({ length: 8 }).forEach((_, index) => {
      chatStore.appendMessage(firstContact.id, {
        role: index % 2 === 0 ? 'assistant' : 'user',
        content: `Ari message ${index}`,
        createdAt: now - index * 1000,
      })
    })
    chatStore.appendMessage(secondContact.id, {
      role: 'assistant',
      content: 'Bea message',
      createdAt: now - 500,
    })

    await router.push('/chat-me')
    await router.isReady()

    const wrapper = mount(ChatMeView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const avatars = wrapper.findAll('.chat-me-recent-avatar')
    expect(wrapper.get('[data-testid="chat-me-recent-avatar-rail"]').exists()).toBe(true)
    expect(avatars.length).toBeGreaterThanOrEqual(2)
    expect(avatars[0].text()).toContain('Ari Recent')

    wrapper.unmount()
  })

  test('surfaces saved normal-chat messages in Me without mixing service accounts', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const contactId = chatStore.contacts[0].id
    const savedAt = Date.now() - 60_000
    const savedMessage = chatStore.appendMessage(contactId, {
      role: 'assistant',
      content: 'Keep this ordinary chat memory.',
      createdAt: savedAt - 60_000,
    })
    expect(chatStore.setMessageSaved(contactId, savedMessage.id, true, savedAt)).toBe(true)

    const serviceContact = chatStore.addContact({
      kind: 'service',
      name: 'World Pack Service Later',
    })
    const serviceMessage = chatStore.appendMessage(serviceContact.id, {
      role: 'assistant',
      content: 'Do not pull service semantics into Me yet.',
    })
    chatStore.setMessageSaved(serviceContact.id, serviceMessage.id, true, savedAt)

    await router.push('/chat-me?section=saved')
    await router.isReady()

    const wrapper = mount(ChatMeView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-me-saved-section"]').text()).toContain('Keep this ordinary chat memory.')
    expect(wrapper.text()).not.toContain('World Pack Service Later')
    expect(wrapper.text()).not.toContain('Do not pull service semantics into Me yet.')

    await wrapper.get(`[data-testid="chat-me-saved-message-${savedMessage.id}"]`).trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe(`/chat/${contactId}`)

    wrapper.unmount()
  })

  test('renders recalled chat messages as retained notices without original-message actions', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const contact = chatStore.addContact({
      kind: 'role',
      name: 'Mina Recall',
      role: 'Composer',
    })
    const userMessage = chatStore.appendMessage(contact.id, {
      role: 'user',
      content: 'Hidden user wording',
      status: 'delivered',
    })
    const assistantMessage = chatStore.appendMessage(contact.id, {
      role: 'assistant',
      content: 'Hidden contact wording',
      status: 'sent',
    })

    expect(chatStore.recallMessage(contact.id, userMessage.id, 2000)).toBe(true)
    expect(chatStore.recallMessage(contact.id, assistantMessage.id, 3000)).toBe(true)

    await router.push(`/chat/${contact.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const userRow = wrapper.get(`[data-testid="chat-message-row-${userMessage.id}"]`)
    const assistantRow = wrapper.get(`[data-testid="chat-message-row-${assistantMessage.id}"]`)
    expect(userRow.classes()).toContain('is-recalled')
    expect(assistantRow.classes()).toContain('is-recalled')
    expect(userRow.text()).toContain('You recalled a message')
    expect(assistantRow.text()).toContain('Mina Recall recalled a message')
    expect(wrapper.text()).not.toContain('Hidden user wording')
    expect(wrapper.text()).not.toContain('Hidden contact wording')

    await userRow.get('[data-testid="chat-message-bubble"]').trigger('contextmenu')
    await flushUi()

    expect(wrapper.find('[data-testid="chat-message-action-quote"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="chat-message-action-copy"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="chat-message-action-save"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="chat-message-action-edit"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="chat-message-action-reroll"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="chat-message-action-recall"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="chat-message-action-delete"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('clears rich-message quote previews when the quoted message is recalled', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const contact = chatStore.addContact({
      kind: 'role',
      name: 'Mina Rich',
      role: 'Archivist',
    })
    const richMessage = chatStore.appendMessage(contact.id, {
      role: 'assistant',
      blocks: [
        {
          type: 'voice_virtual',
          label: 'Private voice memo',
          transcript: 'blue comet password',
          durationSec: 12,
        },
        {
          type: 'image_virtual',
          alt: 'private image marker',
          caption: 'hidden image caption',
        },
        {
          type: 'transfer_virtual',
          label: 'Private transfer card',
          amount: '99977',
          currency: 'GLD',
          note: 'hidden transfer note',
        },
      ],
      status: 'sent',
    })

    await router.push(`/chat/${contact.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const row = wrapper.get(`[data-testid="chat-message-row-${richMessage.id}"]`)
    expect(row.text()).toContain('blue comet password')
    expect(row.text()).toContain('hidden image caption')
    expect(row.text()).toContain('99977')

    await row.get('[data-testid="chat-message-bubble"]').trigger('contextmenu')
    await flushUi()
    await wrapper.get('[data-testid="chat-message-action-quote"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="chat-pending-quote-bar"]').text()).toContain('blue comet password')

    expect(chatStore.recallMessage(contact.id, richMessage.id, 4000)).toBe(true)
    await flushUi()

    const recalledRow = wrapper.get(`[data-testid="chat-message-row-${richMessage.id}"]`)
    expect(recalledRow.text()).toContain('Mina Rich recalled a message')
    expect(wrapper.find('[data-testid="chat-pending-quote-bar"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('blue comet password')
    expect(wrapper.text()).not.toContain('hidden image caption')
    expect(wrapper.text()).not.toContain('hidden transfer note')
    expect(wrapper.text()).not.toContain('99977')

    wrapper.unmount()
  })

  test('sends native chat cards through the compact action panel and preserves recall semantics', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const { dialogState, submitDialog } = useDialog()
    const roleProfile = chatStore.addRoleProfile({
      name: 'Mina Device',
      role: 'Tester',
      isMain: true,
    })
    const contact = chatStore.addContact({
      kind: 'role',
      profileId: roleProfile.id,
      name: 'Mina Device',
      role: 'Tester',
    })
    const payeeCurrency = roleProfile.payeeAccounts[0].currency

    await router.push(`/chat/${contact.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-user-action-toggle"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-open-transfer"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-transfer-amount"]').setValue('88.50')
    await wrapper.get('[data-testid="chat-user-action-transfer-note"]').setValue('panel transfer note')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-submit-transfer"]').trigger('click')
    await flushUi()

    await wrapper.get('[data-testid="chat-user-action-toggle"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-open-voice"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-voice-transcript"]').setValue('panel voice secret')
    await wrapper.get('[data-testid="chat-user-action-voice-duration"]').setValue(17)
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-submit-voice"]').trigger('click')
    await flushUi()

    const messages = chatStore.getMessagesByContactId(contact.id)
    const payeeAccountMessageIndex = messages.findIndex((item) =>
      item.blocks?.some(
        (block) =>
          block?.type === 'share_card' &&
          block.shareType === 'payee_account' &&
          block.sourceModule === 'wallet',
      ),
    )
    const payeeAccountMessage = messages[payeeAccountMessageIndex]
    const transferRequestMessage = messages[payeeAccountMessageIndex - 1]
    const voiceMessage = messages.find((item) =>
      item.blocks?.some((block) => block?.type === 'voice_virtual' && block.transcript === 'panel voice secret'),
    )
    expect(transferRequestMessage?.content).toContain(`88.50 ${payeeCurrency}`)
    expect(payeeAccountMessage?.content).toContain('receiving account')
    expect(voiceMessage?.content).toBe('panel voice secret')
    expect(wrapper.get(`[data-testid="chat-message-row-${payeeAccountMessage.id}"]`).text()).toContain(
      'Receiving account',
    )
    expect(
      wrapper.get(
        `[data-testid="chat-share-card-open-wallet-${roleProfile.payeeAccounts[0].id}"]`,
      ).text(),
    ).toContain('Transfer in Wallet')
    expect(wrapper.get(`[data-testid="chat-message-row-${voiceMessage.id}"]`).text()).toContain('panel voice secret')

    const transferRow = wrapper.get(`[data-testid="chat-message-row-${transferRequestMessage.id}"]`)
    await transferRow.get('[data-testid="chat-message-bubble"]').trigger('contextmenu')
    await flushUi()
    expect(wrapper.find('[data-testid="chat-message-action-quote"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="chat-message-action-copy"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="chat-message-action-save"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="chat-message-action-edit"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="chat-message-action-recall"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="chat-message-action-delete"]').exists()).toBe(true)

    await wrapper.get('[data-testid="chat-message-action-quote"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="chat-pending-quote-bar"]').text()).toContain(
      `88.50 ${payeeCurrency}`,
    )

    const voiceRow = wrapper.get(`[data-testid="chat-message-row-${voiceMessage.id}"]`)
    await voiceRow.get('[data-testid="chat-message-bubble"]').trigger('contextmenu')
    await flushUi()
    await wrapper.get('[data-testid="chat-message-action-recall"]').trigger('click')
    await flushUi()
    expect(dialogState.title).toBe('Recall message')
    submitDialog()
    await flushUi()

    expect(wrapper.get(`[data-testid="chat-message-row-${voiceMessage.id}"]`).text()).toContain('You recalled a message')
    expect(wrapper.text()).not.toContain('panel voice secret')

    wrapper.unmount()
  })

  test('uses the persisted role account currency and does not move money before Wallet confirmation', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const walletStore = useWalletStore()
    walletStore.resetForTesting()
    walletStore.registerWorldCurrency(
      {
        code: 'CRD',
        labelZh: '信用点',
        labelEn: 'Credits',
      },
      { id: 'survival_city' },
    )
    walletStore.setPrimaryCurrency('CRD')
    const roleProfile = chatStore.addRoleProfile({
      name: 'Mina Credits',
      role: 'Tester',
      isMain: true,
    })
    const contact = chatStore.addContact({
      kind: 'role',
      profileId: roleProfile.id,
      name: 'Mina Credits',
      role: 'Tester',
    })
    const payeeAccount = roleProfile.payeeAccounts[0]

    await router.push(`/chat/${contact.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-user-action-toggle"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-open-transfer"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="chat-user-action-transfer-currency"]').element.value).toBe(
      payeeAccount.currency,
    )

    await wrapper.get('[data-testid="chat-user-action-transfer-amount"]').setValue('12.00')
    await wrapper.get('[data-testid="chat-user-action-submit-transfer"]').trigger('click')
    await flushUi()

    expect(walletStore.listTransactionsBySourceFilter('chat')).toHaveLength(0)
    expect(walletStore.knownPayeeAccounts).toHaveLength(1)
    expect(walletStore.knownPayeeAccounts[0]).toMatchObject({
      id: payeeAccount.id,
      currency: payeeAccount.currency,
      ownerProfileId: roleProfile.id,
      ownerName: 'Mina Credits',
    })
    const accountCard = chatStore
      .getMessagesByContactId(contact.id)
      .at(-1)
      .blocks.find((block) => block.type === 'share_card')
    expect(accountCard).toMatchObject({
      shareType: 'payee_account',
      sourceModule: 'wallet',
      sourceId: payeeAccount.id,
      amountLabel: `12.00 ${payeeAccount.currency}`,
    })
    expect(accountCard.route).toContain(`currency=${payeeAccount.currency}`)

    wrapper.unmount()
  })

  test('sends link, location, gallery, and one-off media cards through the Chat action panel', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const galleryStore = useGalleryStore()
    const { dialogState, cancelDialog } = useDialog()
    const contact = chatStore.addContact({
      kind: 'role',
      name: 'Mina Links',
      role: 'Tester',
    })
    const galleryResult = galleryStore.importAssetFromUrl({
      url: 'https://example.com/chat-panel-asset.png',
      name: 'Panel Asset',
      category: 'reference',
    })
    expect(galleryResult.ok).toBe(true)

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    vi.stubGlobal(
      'FileReader',
      class {
        constructor() {
          this.result = ''
          this.onload = null
          this.onerror = null
          this.onabort = null
        }

        readAsDataURL(file) {
          this.result = `data:${file?.type || 'image/png'};base64,cGFuZWwtaW1hZ2U=`
          setTimeout(() => this.onload?.({ target: this }), 0)
        }
      },
    )

    await router.push(`/chat/${contact.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const mediaInput = wrapper.get('[data-testid="chat-user-media-input"]')
    await wrapper.get('[data-testid="chat-user-action-toggle"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-open-image"]').trigger('click')
    await flushUi()
    expect(mediaInput.attributes('accept')).toBe('image/*')
    await wrapper.get('[data-testid="chat-user-action-open-gif"]').trigger('click')
    await flushUi()
    expect(mediaInput.attributes('accept')).toBe('image/gif')
    await wrapper.get('[data-testid="chat-user-action-open-image"]').trigger('click')
    await flushUi()
    Object.defineProperty(mediaInput.element, 'files', {
      value: [new File(['panel image bytes'], 'panel-image.png', { type: 'image/png' })],
      configurable: true,
    })
    await mediaInput.trigger('change')
    await flushUi()
    expect(dialogState.title).toBe('Send image')
    cancelDialog()
    await flushUi()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await flushUi()

    await wrapper.get('[data-testid="chat-user-action-toggle"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-open-link"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-link-url"]').setValue('https://example.com/panel-link')
    await wrapper.get('[data-testid="chat-user-action-link-title"]').setValue('Panel Link')
    await wrapper.get('[data-testid="chat-user-action-link-note"]').setValue('copy feedback note')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-submit-link"]').trigger('click')
    await flushUi()

    await wrapper.get('[data-testid="chat-user-action-toggle"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-send-location"]').trigger('click')
    await flushUi()

    await wrapper.get('[data-testid="chat-user-action-toggle"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-user-action-open-gallery"]').trigger('click')
    await flushUi()
    await wrapper.get(`[data-testid="chat-user-action-gallery-asset-${galleryResult.assetId}"]`).trigger('click')
    await flushUi()

    const messages = chatStore.getMessagesByContactId(contact.id)
    const mediaMessage = messages.find((item) =>
      item.blocks?.some((block) => block?.type === 'image_virtual' && block.alt === 'panel-image.png'),
    )
    const linkMessage = messages.find((item) =>
      item.blocks?.some((block) => block?.type === 'link_external' && block.url === 'https://example.com/panel-link'),
    )
    const locationMessage = messages.find((item) =>
      item.blocks?.some((block) => block?.type === 'module_link' && block.route === '/map'),
    )
    const galleryMessage = messages.find((item) =>
      item.blocks?.some((block) => block?.type === 'image_virtual' && block.assetId === galleryResult.assetId),
    )

    expect(mediaMessage?.content).toContain('panel-image.png')
    expect(linkMessage?.content).toContain('Panel Link')
    expect(locationMessage?.content).toContain('Location share')
    expect(galleryMessage?.content).toContain('Panel Asset')
    expect(wrapper.get(`[data-testid="chat-message-row-${mediaMessage.id}"]`).text()).toContain('panel-image.png')
    expect(wrapper.get(`[data-testid="chat-message-row-${linkMessage.id}"]`).text()).toContain('copy feedback note')
    expect(wrapper.get(`[data-testid="chat-message-row-${locationMessage.id}"]`).text()).toContain('Location share')
    expect(wrapper.get(`[data-testid="chat-message-row-${galleryMessage.id}"]`).text()).toContain('Panel Asset')

    const linkRow = wrapper.get(`[data-testid="chat-message-row-${linkMessage.id}"]`)
    await linkRow.get('[data-testid="chat-message-bubble"]').trigger('contextmenu')
    await flushUi()
    await wrapper.get('[data-testid="chat-message-action-copy"]').trigger('click')
    await flushUi()

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('[external_link]'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('https://example.com/panel-link'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('copy feedback note'))
    expect(wrapper.text()).toContain('Message copied.')

    wrapper.unmount()
  })

  test('edits rich card fields without detaching UI from copied context', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const contact = chatStore.addContact({
      kind: 'role',
      name: 'Mina Edit',
      role: 'Tester',
    })
    const linkMessage = chatStore.appendMessage(contact.id, {
      role: 'user',
      content: 'Old Panel Link\nhttps://example.com/old-link',
      blocks: [
        {
          type: 'link_external',
          label: 'Old Panel Link',
          url: 'https://example.com/old-link',
          note: 'old copy note',
        },
      ],
      status: 'delivered',
    })

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    await router.push(`/chat/${contact.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const linkRow = wrapper.get(`[data-testid="chat-message-row-${linkMessage.id}"]`)
    await linkRow.get('[data-testid="chat-message-bubble"]').trigger('contextmenu')
    await flushUi()
    await wrapper.get('[data-testid="chat-message-action-edit"]').trigger('click')
    await flushUi()

    expect(wrapper.find('[data-testid="chat-message-edit-textarea"]').exists()).toBe(false)
    await wrapper.get('[data-testid="chat-message-edit-field-label"]').setValue('Edited Panel Link')
    await wrapper.get('[data-testid="chat-message-edit-field-url"]').setValue('https://example.com/edited-link')
    await wrapper.get('[data-testid="chat-message-edit-field-note"]').setValue('edited copy note')
    await flushUi()
    await wrapper.get('[data-testid="chat-message-edit-save"]').trigger('click')
    await flushUi()

    const editedMessage = chatStore.getMessagesByContactId(contact.id).find((item) => item.id === linkMessage.id)
    expect(editedMessage?.content).toContain('Edited Panel Link')
    expect(editedMessage?.blocks?.[0]).toMatchObject({
      type: 'link_external',
      label: 'Edited Panel Link',
      url: 'https://example.com/edited-link',
      note: 'edited copy note',
    })
    expect(wrapper.get(`[data-testid="chat-message-row-${linkMessage.id}"]`).text()).toContain('edited copy note')
    expect(wrapper.text()).not.toContain('old copy note')

    await wrapper.get(`[data-testid="chat-message-row-${linkMessage.id}"]`).get('[data-testid="chat-message-bubble"]').trigger('contextmenu')
    await flushUi()
    await wrapper.get('[data-testid="chat-message-action-copy"]').trigger('click')
    await flushUi()

    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Edited Panel Link'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('https://example.com/edited-link'))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('edited copy note'))
    expect(writeText).not.toHaveBeenCalledWith(expect.stringContaining('old copy note'))

    wrapper.unmount()
  })

  test('rerolls assistant rich messages as structured replacement cards', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const contact = chatStore.addContact({
      kind: 'role',
      name: 'Mina Reroll',
      role: 'Tester',
    })
    chatStore.appendMessage(contact.id, {
      role: 'user',
      content: 'Please send a route card.',
      status: 'delivered',
    })
    const assistantMessage = chatStore.appendMessage(contact.id, {
      role: 'assistant',
      content: 'Old route',
      blocks: [
        { type: 'text', text: 'Old route', variant: 'primary' },
        {
          type: 'module_link',
          label: 'Old route card',
          route: '/map',
          note: 'old route note',
        },
      ],
      status: 'sent',
    })
    vi.mocked(callAI).mockResolvedValueOnce(
      JSON.stringify({
        messages: [
          {
            replyType: 'plain',
            blocks: [
              { type: 'text', text: 'Rerolled route intro' },
              {
                type: 'module_link',
                label: 'Rerolled route card',
                route: '/map',
                note: 'new route note',
              },
            ],
          },
        ],
      }),
    )

    await router.push(`/chat/${contact.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const assistantRow = wrapper.get(`[data-testid="chat-message-row-${assistantMessage.id}"]`)
    await assistantRow.get('[data-testid="chat-message-bubble"]').trigger('contextmenu')
    await flushUi()
    await wrapper.get('[data-testid="chat-message-action-reroll"]').trigger('click')
    await flushUi()

    const rerolled = chatStore.getMessagesByContactId(contact.id).find((item) => item.id === assistantMessage.id)
    expect(rerolled?.content).toBe('Rerolled route intro')
    expect(rerolled?.aiMeta?.rerollOf).toBe(assistantMessage.id)
    expect(rerolled?.blocks?.some((block) => block.type === 'module_link' && block.note === 'new route note')).toBe(true)
    expect(wrapper.get(`[data-testid="chat-message-row-${assistantMessage.id}"]`).text()).toContain('Rerolled route card')
    expect(wrapper.text()).not.toContain('old route note')

    wrapper.unmount()
  })

  test('normalizes and persists Chat appearance state in system settings', () => {
    const store = useSystemStore()

    expect(store.settings.appearance.chat).toMatchObject({
      presetId: 'kakao_immersive',
      messageLayout: 'kakao',
      messageAvatarMode: 'layout',
      messageBubbleMode: 'bubble',
      themeColorMode: 'layout',
      bubbleColorMode: 'theme',
      customCss: '',
      customCssEnabled: false,
    })

    const changed = store.setChatAppearance({
      messageLayout: 'imessage',
      messageAvatarMode: 'all',
      messageBubbleMode: 'plain',
      themeColorMode: 'ocean',
      bubbleColorMode: 'mono',
      customCss: '.chat-shell { --chat-bg: #ffee66; }',
      customCssEnabled: true,
    })

    expect(changed).toBe(true)
    expect(store.settings.appearance.chat.messageLayout).toBe('imessage')
    expect(store.settings.appearance.chat.messageAvatarMode).toBe('all')
    expect(store.settings.appearance.chat.messageBubbleMode).toBe('bubble')
    expect(store.settings.appearance.chat.themeColorMode).toBe('ocean')
    expect(store.settings.appearance.chat.bubbleColorMode).toBe('mono')
    expect(store.settings.appearance.chat.customCssEnabled).toBe(true)
    expect(store.settings.appearance.chat.customCssProfiles).toHaveLength(1)
    expect(store.settings.appearance.chat.activeCustomCssProfileId).toBe(
      store.settings.appearance.chat.customCssProfiles[0].id,
    )

    const restored = store.restoreFromBackup({
      settings: {
        appearance: {
          chat: {
            presetId: 'unknown',
            messageLayout: 'stacked',
            messageAvatarMode: 'everywhere',
            messageBubbleMode: 'none',
            themeColorMode: 'unknown',
            bubbleColorMode: 'unknown',
            customCss: 42,
            customCssEnabled: 'yes',
          },
        },
      },
    })

    expect(restored).toBe(true)
    expect(store.settings.appearance.chat).toMatchObject({
      presetId: 'kakao_immersive',
      messageLayout: 'kakao',
      messageAvatarMode: 'layout',
      messageBubbleMode: 'bubble',
      themeColorMode: 'layout',
      bubbleColorMode: 'theme',
      customCss: '',
      customCssEnabled: false,
    })
  })

  test('builds one normalized appearance class set for every Chat route shell', () => {
    expect(
      getChatAppearanceClasses({
        presetId: 'kakao_immersive',
        messageLayout: 'imessage',
        messageAvatarMode: 'all',
        messageBubbleMode: 'glass',
        themeColorMode: 'ocean',
        bubbleColorMode: 'mono',
      }),
    ).toEqual([
      'chat-preset-kakao_immersive',
      'chat-layout-imessage',
      'chat-avatar-mode-all',
      'chat-bubble-mode-glass',
      'chat-theme-color-ocean',
      'chat-bubble-color-mono',
    ])

    expect(
      getChatAppearanceClasses({
        messageAvatarMode: 'unknown',
        messageBubbleMode: 'plain',
        themeColorMode: 'unknown',
        bubbleColorMode: 'unknown',
      }),
    ).toEqual([
      'chat-preset-kakao_immersive',
      'chat-layout-kakao',
      'chat-avatar-mode-layout',
      'chat-bubble-mode-bubble',
      'chat-theme-color-layout',
      'chat-bubble-color-theme',
    ])
  })

  test('saves Chat Appearance layout and Chat-scoped CSS', async () => {
    const router = createTestRouter()
    await router.push('/chat-settings/appearance')
    await router.isReady()
    const systemStore = useSystemStore()

    const wrapper = mount(ChatAppearanceView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-layout-option-imessage"]').trigger('click')
    await wrapper.get('[data-testid="chat-theme-color-mode-ocean"]').trigger('click')
    await wrapper.get('[data-testid="chat-bubble-color-mode-mono"]').trigger('click')
    await wrapper.get('[data-testid="chat-message-avatar-mode-all"]').trigger('click')
    await wrapper.get('[data-testid="chat-appearance-custom-css-enabled"]').setValue(true)
    await wrapper.get('[data-testid="chat-appearance-custom-css"]').setValue('.chat-shell { --chat-bg: #ffee66; }')
    await wrapper.get('[data-testid="chat-appearance-css-profile-name"]').setValue('Frosted blue')
    await wrapper.get('[data-testid="chat-appearance-css-profile-save"]').trigger('click')
    await flushUi()
    expect(systemStore.settings.appearance.chat.customCssProfiles).toHaveLength(1)
    expect(systemStore.settings.appearance.chat.customCssProfiles[0]).toMatchObject({
      name: 'Frosted blue',
      css: '.chat-shell { --chat-bg: #ffee66; }',
    })
    await wrapper.get('[data-testid="chat-appearance-custom-css"]').setValue('')
    await wrapper.get('[data-testid^="chat-appearance-css-profile-select-"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="chat-appearance-custom-css"]').element.value).toContain('--chat-bg')
    await wrapper.get('[data-testid="chat-appearance-save"]').trigger('click')
    await flushUi()

    expect(systemStore.settings.appearance.chat.messageLayout).toBe('imessage')
    expect(systemStore.settings.appearance.chat.messageAvatarMode).toBe('all')
    expect(systemStore.settings.appearance.chat.messageBubbleMode).toBe('bubble')
    expect(systemStore.settings.appearance.chat.themeColorMode).toBe('ocean')
    expect(systemStore.settings.appearance.chat.bubbleColorMode).toBe('mono')
    expect(systemStore.settings.appearance.chat.customCssEnabled).toBe(true)
    expect(systemStore.settings.appearance.chat.customCss).toContain('--chat-bg')

    const profileId = systemStore.settings.appearance.chat.customCssProfiles[0].id
    await wrapper.get(`[data-testid="chat-appearance-css-profile-delete-${profileId}"]`).trigger('click')
    await flushUi()
    expect(systemStore.settings.appearance.chat.customCssProfiles).toHaveLength(0)
    expect(systemStore.settings.appearance.chat.activeCustomCssProfileId).toBe('')
    expect(systemStore.settings.appearance.chat.customCss).toBe('')

    wrapper.unmount()
  })

  test('previews unsaved Chat CSS only inside the appearance preview', async () => {
    const router = createTestRouter()
    await router.push('/chat-settings/appearance')
    await router.isReady()
    const systemStore = useSystemStore()

    const wrapper = mount(ChatAppearanceView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-appearance-custom-css-enabled"]').setValue(true)
    await wrapper.get('[data-testid="chat-appearance-custom-css"]').setValue(
      '.chat-shell { --chat-bg: #ffee66; }\n.chat-thread-header { color: #123456; }\n.chat-bubble-user { color: #111111; }',
    )
    await flushUi()

    const previewStyleEl = document.head.querySelector('[data-testid="chat-appearance-preview-css"]')
    expect(previewStyleEl).toBeTruthy()
    const previewCss = previewStyleEl.textContent || ''
    expect(previewCss).toContain('.chat-appearance-preview.chat-shell')
    expect(previewCss).toContain('.chat-appearance-preview .chat-thread-header')
    expect(previewCss).toContain('.chat-appearance-preview .chat-bubble-user')
    expect(previewCss).not.toContain('.chat-appearance-preview .chat-appearance-preview')
    expect(systemStore.settings.appearance.chat.customCss).toBe('')

    await wrapper.get('[data-testid="chat-appearance-custom-css-enabled"]').setValue(false)
    await flushUi()
    expect(document.head.querySelector('[data-testid="chat-appearance-preview-css"]')).toBeNull()

    wrapper.unmount()
  })

  test('previews Chat Appearance layouts with the shared message row component', async () => {
    const router = createTestRouter()
    await router.push('/chat-settings/appearance')
    await router.isReady()

    const wrapper = mount(ChatAppearanceView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const assistantRow = () => wrapper.get('[data-testid="chat-message-row-appearance-preview-assistant"]')
    const userRow = () => wrapper.get('[data-testid="chat-message-row-appearance-preview-user"]')

    expect(wrapper.get('[data-testid="chat-layout-option-kakao-sample"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-layout-option-wechat-sample"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-layout-option-imessage-sample"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-layout-option-kakao"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-testid="chat-message-bubble-mode-bubble"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-message-bubble-mode-soft"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-message-bubble-mode-outline"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-message-bubble-mode-glass"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="chat-message-bubble-mode-plain"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="chat-theme-color-mode-layout"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-theme-color-mode-ocean"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-theme-color-mode-mint"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-theme-color-mode-coral"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-theme-color-preview-layout"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-theme-color-preview-ocean"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-bubble-color-mode-theme"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-bubble-color-mode-contrast"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-bubble-color-mode-soft"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-bubble-color-mode-mono"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-appearance-preview"]').classes()).toContain('chat-theme-color-layout')
    expect(wrapper.get('[data-testid="chat-appearance-preview"]').classes()).toContain('chat-bubble-color-theme')
    expect(wrapper.get('[data-testid="chat-appearance-preview-composer"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-appearance-preview-summary"]').text()).toMatch(/随布局|Follow layout/)
    const previewGuide = wrapper.get('[data-testid="chat-appearance-preview-legend"]')
    expect(previewGuide.exists()).toBe(true)
    expect(previewGuide.element.closest('[data-testid="chat-appearance-preview"]')).toBeNull()
    expect(wrapper.find('.chat-appearance-preview__caption').exists()).toBe(false)
    expect(wrapper.find('.chat-appearance-preview__legend').exists()).toBe(false)
    expect(wrapper.find('.chat-appearance-preview__role-label').exists()).toBe(false)
    expect(wrapper.find('.chat-thread-header__hint').exists()).toBe(false)
    expect(wrapper.get('[data-testid="chat-appearance-preview-avatar-hint"]').exists()).toBe(true)
    expect(assistantRow().attributes('data-layout-mode')).toBe('kakao')
    expect(assistantRow().attributes('data-bubble-mode')).toBe('bubble')
    expect(assistantRow().get('.chat-message-content').attributes('data-content-width-mode')).toBe('fit-content')
    expect(assistantRow().find('[data-testid="chat-message-avatar-contact"]').exists()).toBe(true)
    expect(assistantRow().find('[data-testid="chat-message-sender-name"]').exists()).toBe(true)
    expect(userRow().find('[data-testid="chat-message-avatar-self"]').exists()).toBe(false)

    await wrapper.get('[data-testid="chat-theme-color-mode-ocean"]').trigger('click')
    await wrapper.get('[data-testid="chat-bubble-color-mode-mono"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="chat-appearance-preview"]').classes()).toContain('chat-theme-color-ocean')
    expect(wrapper.get('[data-testid="chat-appearance-preview"]').classes()).toContain('chat-bubble-color-mono')
    expect(wrapper.get('[data-testid="chat-appearance-preview-summary"]').text()).toMatch(/海盐蓝|Sea blue/)
    expect(wrapper.get('[data-testid="chat-theme-color-detail"]').text()).toMatch(/冷静蓝灰层次|Calm blue-gray/)
    expect(wrapper.get('[data-testid="chat-bubble-color-detail"]').text()).toMatch(/黑白层级|Monochrome layers/)

    await wrapper.get('[data-testid="chat-message-bubble-mode-soft"]').trigger('click')
    await flushUi()
    expect(assistantRow().attributes('data-bubble-mode')).toBe('soft')
    expect(assistantRow().get('[data-testid="chat-message-bubble"]').classes()).not.toContain('is-plain')

    await wrapper.get('[data-testid="chat-message-bubble-mode-outline"]').trigger('click')
    await flushUi()
    expect(assistantRow().attributes('data-bubble-mode')).toBe('outline')

    await wrapper.get('[data-testid="chat-message-bubble-mode-glass"]').trigger('click')
    await flushUi()
    expect(assistantRow().attributes('data-bubble-mode')).toBe('glass')

    await wrapper.get('[data-testid="chat-layout-option-wechat"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="chat-layout-option-wechat"]').attributes('aria-pressed')).toBe('true')
    expect(assistantRow().attributes('data-layout-mode')).toBe('wechat')
    expect(assistantRow().find('[data-testid="chat-message-sender-name"]').exists()).toBe(false)
    expect(userRow().find('[data-testid="chat-message-avatar-self"]').exists()).toBe(true)

    await wrapper.get('[data-testid="chat-layout-option-imessage"]').trigger('click')
    await flushUi()
    expect(assistantRow().attributes('data-layout-mode')).toBe('imessage')
    expect(assistantRow().find('[data-testid="chat-message-avatar-contact"]').exists()).toBe(false)
    expect(userRow().find('[data-testid="chat-message-avatar-self"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="chat-appearance-preview-header-avatar"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-appearance-preview-header-avatar"]').attributes('title')).toBeTruthy()
    expect(wrapper.get('[data-testid="chat-appearance-preview-header-avatar"]').element.parentElement?.classList.contains('chat-thread-header__avatar-wrap')).toBe(true)
    expect(wrapper.find('.chat-thread-header__identity-wrap').exists()).toBe(true)

    await wrapper.get('[data-testid="chat-message-avatar-mode-all"]').trigger('click')
    await flushUi()
    expect(assistantRow().attributes('data-avatar-mode')).toBe('all')
    expect(assistantRow().find('[data-testid="chat-message-avatar-contact"]').exists()).toBe(true)
    expect(userRow().find('[data-testid="chat-message-avatar-self"]').exists()).toBe(true)
    expect(assistantRow().attributes('data-bubble-mode')).toBe('glass')
    expect(assistantRow().get('[data-testid="chat-message-bubble"]').classes()).not.toContain('is-plain')

    wrapper.unmount()
  })

  test('renders Kakao message rows with contact identity and no user avatar column', () => {
    const assistantRow = mount(ChatMessageRow, {
      props: createMessageRowProps({ layoutMode: 'kakao' }),
    })
    const userRow = mount(ChatMessageRow, {
      props: createMessageRowProps({
        layoutMode: 'kakao',
        message: {
          id: 'row-user',
          role: 'user',
          content: 'My Kakao reply.',
          blocks: [{ type: 'text', text: 'My Kakao reply.' }],
          status: 'sent',
        },
      }),
    })

    expect(assistantRow.attributes('data-layout-mode')).toBe('kakao')
    expect(assistantRow.classes()).toContain('is-assistant')
    expect(assistantRow.get('[data-testid="chat-message-avatar-contact"]').exists()).toBe(true)
    expect(assistantRow.get('[data-testid="chat-message-sender-name"]').text()).toBe('Mina')

    expect(userRow.classes()).toContain('is-user')
    expect(userRow.find('[data-testid="chat-message-avatar-self"]').exists()).toBe(false)
    expect(userRow.find('[data-testid="chat-message-sender-name"]').exists()).toBe(false)
    expect(userRow.text()).toContain('Sent')

    assistantRow.unmount()
    userRow.unmount()
  })

  test('renders WeChat message rows with bilateral avatar gutters and no sender label', () => {
    const assistantRow = mount(ChatMessageRow, {
      props: createMessageRowProps({ layoutMode: 'wechat' }),
    })
    const userRow = mount(ChatMessageRow, {
      props: createMessageRowProps({
        layoutMode: 'wechat',
        message: {
          id: 'row-user',
          role: 'user',
          content: 'My WeChat reply.',
          blocks: [{ type: 'text', text: 'My WeChat reply.' }],
          status: 'sent',
        },
      }),
    })

    expect(assistantRow.attributes('data-layout-mode')).toBe('wechat')
    expect(assistantRow.get('[data-testid="chat-message-avatar-contact"]').exists()).toBe(true)
    expect(assistantRow.find('[data-testid="chat-message-sender-name"]').exists()).toBe(false)

    expect(userRow.attributes('data-layout-mode')).toBe('wechat')
    expect(userRow.get('[data-testid="chat-message-avatar-self"]').exists()).toBe(true)
    expect(userRow.find('[data-testid="chat-message-sender-name"]').exists()).toBe(false)

    assistantRow.unmount()
    userRow.unmount()
  })

  test('renders iMessage rows without stream avatars while preserving group sender names', () => {
    const directRow = mount(ChatMessageRow, {
      props: createMessageRowProps({ layoutMode: 'imessage' }),
    })
    const groupRow = mount(ChatMessageRow, {
      props: createMessageRowProps({
        layoutMode: 'imessage',
        isGroup: true,
        senderName: 'Group Mina',
      }),
    })
    const userRow = mount(ChatMessageRow, {
      props: createMessageRowProps({
        layoutMode: 'imessage',
        message: {
          id: 'row-user',
          role: 'user',
          content: 'Blue bubble.',
          blocks: [{ type: 'text', text: 'Blue bubble.' }],
          status: 'sent',
        },
      }),
    })

    expect(directRow.attributes('data-layout-mode')).toBe('imessage')
    expect(directRow.find('[data-testid="chat-message-avatar-contact"]').exists()).toBe(false)
    expect(directRow.find('[data-testid="chat-message-avatar-self"]').exists()).toBe(false)
    expect(directRow.find('[data-testid="chat-message-sender-name"]').exists()).toBe(false)

    expect(groupRow.find('[data-testid="chat-message-sender-name"]').text()).toBe('Group Mina')
    expect(userRow.find('[data-testid="chat-message-avatar-self"]').exists()).toBe(false)

    directRow.unmount()
    groupRow.unmount()
    userRow.unmount()
  })

  test('honors explicit avatar and bubble visibility overrides without changing the layout selection', () => {
    const allAvatarRow = mount(ChatMessageRow, {
      props: createMessageRowProps({
        layoutMode: 'imessage',
        avatarMode: 'all',
        bubbleMode: 'bubble',
      }),
    })
    const allAvatarUserRow = mount(ChatMessageRow, {
      props: createMessageRowProps({
        layoutMode: 'imessage',
        avatarMode: 'all',
        message: {
          id: 'override-user',
          role: 'user',
          content: 'No bubble, but keep my avatar.',
          blocks: [{ type: 'text', text: 'No bubble, but keep my avatar.' }],
        },
      }),
    })
    const hiddenAvatarRow = mount(ChatMessageRow, {
      props: createMessageRowProps({
        layoutMode: 'kakao',
        avatarMode: 'hidden',
      }),
    })

    expect(allAvatarRow.attributes()).toMatchObject({
      'data-layout-mode': 'imessage',
      'data-avatar-mode': 'all',
      'data-bubble-mode': 'bubble',
    })
    expect(allAvatarRow.find('[data-testid="chat-message-avatar-contact"]').exists()).toBe(true)
    expect(allAvatarRow.get('[data-testid="chat-message-bubble"]').classes()).not.toContain('is-plain')
    expect(allAvatarUserRow.find('[data-testid="chat-message-avatar-self"]').exists()).toBe(true)
    expect(hiddenAvatarRow.find('[data-testid="chat-message-avatar-contact"]').exists()).toBe(false)

    allAvatarRow.unmount()
    allAvatarUserRow.unmount()
    hiddenAvatarRow.unmount()
  })

  test('places message status receipts according to each layout mode', () => {
    const mountUserReceiptRow = (layoutMode) =>
      mount(ChatMessageRow, {
        props: createMessageRowProps({
          layoutMode,
          message: {
            id: `receipt-${layoutMode}`,
            role: 'user',
            content: `${layoutMode} receipt.`,
            blocks: [{ type: 'text', text: `${layoutMode} receipt.` }],
            status: 'sent',
          },
          messageMetaHintText: () => 'Edited',
        }),
      })

    const rows = {
      kakao: mountUserReceiptRow('kakao'),
      wechat: mountUserReceiptRow('wechat'),
      imessage: mountUserReceiptRow('imessage'),
    }

    expect(rows.kakao.get('[data-testid="chat-message-meta-receipt-kakao"]').attributes()).toMatchObject({
      'data-meta-layout': 'kakao',
      'data-meta-placement': 'bubble-edge',
    })
    expect(rows.wechat.get('[data-testid="chat-message-meta-receipt-wechat"]').attributes()).toMatchObject({
      'data-meta-layout': 'wechat',
      'data-meta-placement': 'content-gutter',
    })
    expect(rows.imessage.get('[data-testid="chat-message-meta-receipt-imessage"]').attributes()).toMatchObject({
      'data-meta-layout': 'imessage',
      'data-meta-placement': 'read-receipt',
    })

    Object.entries(rows).forEach(([layoutMode, row]) => {
      const meta = row.get(`[data-testid="chat-message-meta-receipt-${layoutMode}"]`)
      expect(meta.classes()).toContain(`chat-message-meta-${layoutMode}`)
      expect(meta.classes()).toContain('is-user')
      expect(meta.classes()).toContain('has-hint')
      expect(meta.classes()).toContain('has-status')
      expect(row.get(`[data-testid="chat-message-meta-hint-receipt-${layoutMode}"]`).text()).toBe('Edited')
      expect(row.get(`[data-testid="chat-message-status-receipt-${layoutMode}"]`).text()).toBe('Sent')
      row.unmount()
    })
  })

  test('wraps rich message blocks in bounded block containers', () => {
    useSystemStore().settings.system.language = 'zh-CN'
    const longToken = 'supercalifragilisticexpialidocious'.repeat(4)
    const richRow = mount(ChatMessageRow, {
      props: createMessageRowProps({
        layoutMode: 'imessage',
        message: {
          id: 'rich-blocks',
          role: 'assistant',
          content: '',
          blocks: [
            {
              type: 'text',
              text: `Long markdown token ${longToken}`,
              variant: 'primary',
            },
            {
              type: 'product_card',
              productId: `product-${longToken}`,
              serviceKey: `shop-${longToken}`,
              title: `Product ${longToken}`,
              desc: `Description ${longToken}`,
              price: '$99.00',
              category: `category-${longToken}`,
              assetEligible: true,
              giftable: true,
            },
            {
              type: 'service_notification',
              sourceModule: 'shopping',
              sourceId: `service-${longToken}`,
              serviceKey: `service-${longToken}`,
              title: `Service ${longToken}`,
              summary: `Summary ${longToken}`,
              statusLabel: `status-${longToken}`,
              amount: '$99.00',
              actions: [
                {
                  label: `Open ${longToken}`,
                  route: '/shopping',
                },
              ],
            },
            {
              type: 'share_card',
              shareType: 'product_link',
              sourceModule: 'shopping',
              sourceId: `share-${longToken}`,
              title: `Share ${longToken}`,
              summary: `Shared product ${longToken}`,
              statusLabel: 'Product link',
              amountLabel: '$99.00',
              route: '/shopping?productId=share-test',
              aiContext: {
                mutationBoundary: 'Chat displays this shared object; Shopping owns product state.',
              },
            },
          ],
        },
      }),
    })

    const blocks = richRow.findAll('.chat-message-block')
    expect(blocks).toHaveLength(4)
    expect(blocks.map((block) => block.attributes('data-block-type'))).toEqual([
      'text',
      'product_card',
      'service_notification',
      'share_card',
    ])
    expect(richRow.get('[data-testid="chat-message-block-rich-blocks-1"]').classes()).toContain('chat-message-block')
    expect(richRow.get('.chat-message-content').attributes('data-content-width-mode')).toBe('rich')
    expect(richRow.get('.chat-message-content').classes()).toContain('is-rich')
    expect(richRow.text()).not.toContain('可转资产')
    expect(richRow.text()).not.toContain('鍙浆')
    expect(richRow.get(`[data-testid="chat-product-card-open-product-${longToken}"]`).classes()).toContain('text-orange-700')
    const serviceCard = richRow.get(`[data-testid="chat-service-notification-shopping-service-${longToken}"]`)
    expect(serviceCard.attributes('data-service-tone')).toBe('shopping')
    expect(richRow.get(`[data-testid="chat-service-notification-action-service-${longToken}-0"]`).classes()).toContain('text-amber-700')
    expect(richRow.get(`[data-testid="chat-share-card-shopping-share-${longToken}"]`).text()).toContain('Product link')
    expect(richRow.get(`[data-testid="chat-share-card-open-shopping-share-${longToken}"]`).classes()).toContain('text-amber-700')
    expect(richRow.text()).toContain('Shopping owns product state')

    richRow.unmount()
  })

  test('applies the selected layout class to active Chat message rows', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    const contactId = chatStore.contacts[0].id

    chatStore.contacts[0].relationshipNote = 'Weekend check-in'
    systemStore.setChatAppearance({
      messageLayout: 'imessage',
      messageAvatarMode: 'all',
      messageBubbleMode: 'bubble',
    })
    chatStore.appendMessage(contactId, {
      role: 'assistant',
      content: 'Layout check from assistant.',
    })
    chatStore.appendMessage(contactId, {
      role: 'user',
      content: 'Layout check from user.',
    })

    await router.push(`/chat/${contactId}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('.chat-shell').classes()).toContain('chat-layout-imessage')
    const rows = wrapper.findAll('.chat-message-row')
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows.some((row) => row.classes().includes('is-assistant'))).toBe(true)
    expect(rows.some((row) => row.classes().includes('is-user'))).toBe(true)
    expect(rows.every((row) => row.attributes('data-layout-mode') === 'imessage')).toBe(true)
    expect(rows.every((row) => row.attributes('data-avatar-mode') === 'all')).toBe(true)
    expect(rows.every((row) => row.attributes('data-bubble-mode') === 'bubble')).toBe(true)
    expect(wrapper.find('[data-testid="chat-active-self-avatar"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-thread-header-contact-avatar"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-thread-header-note"]').text()).toBe('Weekend check-in')

    systemStore.setChatAppearance({
      messageLayout: 'wechat',
      messageAvatarMode: 'layout',
      messageBubbleMode: 'bubble',
    })
    await flushUi()
    expect(wrapper.get('.chat-shell').classes()).toContain('chat-layout-wechat')
    expect(wrapper.findAll('[data-testid="chat-active-self-avatar"]').length).toBeGreaterThan(0)

    wrapper.unmount()
  })

  test('keeps reply preset application inside the active thread menu', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const contactId = chatStore.contacts[0].id
    chatStore.setConversationAiPrefs(contactId, {
      replyMode: 'auto',
      replyCount: 3,
      responseStyle: 'concise',
    })
    await router.push(`/chat/${contactId}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-thread-menu-toggle"]').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Apply default preset')

    const presetButton = wrapper.findAll('button').find((button) => button.text().includes('Apply default preset'))
    expect(presetButton).toBeTruthy()
    await presetButton.trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Default reply preset applied')

    wrapper.unmount()
  })
})
