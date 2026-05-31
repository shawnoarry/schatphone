import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ChatView from '../src/views/ChatView.vue'
import ChatDirectoryView from '../src/views/ChatDirectoryView.vue'
import { CHAT_CONTACT_SOCIAL_STATES, useChatStore } from '../src/stores/chat'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat', component: ChatView },
      { path: '/chat/:id', component: ChatView },
      { path: '/chat-contacts', component: ChatDirectoryView },
      { path: '/chat-groups', component: DummyView },
      { path: '/chat-settings', component: DummyView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/wallet', component: DummyView },
      { path: '/shopping', component: DummyView },
      { path: '/food-delivery', component: DummyView },
      { path: '/network', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const createRoleBinding = (chatStore, overrides = {}) => {
  const profile = chatStore.addRoleProfile({
    name: overrides.name || 'Mina Request',
    role: 'Role contact',
    bio: 'Chat social state fixture.',
  })
  return chatStore.bindRoleProfile(profile.id, {
    chatSocialState: overrides.chatSocialState || CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
  })
}

describe('Chat social state and message requests', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('keeps chat history when a role is blocked and unblocked', () => {
    const chatStore = useChatStore()
    const binding = createRoleBinding(chatStore)
    chatStore.appendMessage(binding.id, {
      role: 'assistant',
      content: 'This history should stay.',
    })

    expect(chatStore.blockChatContact(binding.id)).toBe(true)
    expect(chatStore.canContactSendMessages(chatStore.getContactById(binding.id))).toBe(false)
    expect(chatStore.getMessagesByContactId(binding.id)).toHaveLength(1)
    expect(chatStore.getConversationByContactId(binding.id)).toBeTruthy()

    expect(chatStore.unblockChatContact(binding.id)).toBe(true)
    expect(chatStore.canContactSendMessages(chatStore.getContactById(binding.id))).toBe(true)
    expect(chatStore.getMessagesByContactId(binding.id)[0]?.content).toBe('This history should stay.')
  })

  test('shows incoming greetings as message requests before normal chat', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const binding = createRoleBinding(chatStore, {
      name: 'Incoming Mina',
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
    })

    await router.push('/chat')
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-message-requests-card"]').text()).toContain('Message Requests')
    expect(wrapper.find(`[data-testid="chat-contact-social-tag-${binding.id}"]`).exists()).toBe(false)

    await wrapper.get('[data-testid="chat-message-requests-card"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/chat-contacts')
    expect(router.currentRoute.value.query).toMatchObject({ section: 'roles', filter: 'requests' })

    wrapper.unmount()
  })

  test('keeps restricted threads readable and restores input after accepting a request', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const binding = createRoleBinding(chatStore, {
      name: 'Readable Request',
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
    })
    chatStore.appendMessage(binding.id, {
      role: 'assistant',
      content: 'Can you see this?',
    })

    await router.push(`/chat/${binding.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-social-state-banner"]').text()).toContain('New greeting request')
    expect(wrapper.get('input.chat-input-field').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Can you see this?')

    await wrapper.get('[data-testid="chat-social-accept-request"]').trigger('click')
    await flushUi()

    expect(chatStore.getContactChatSocialState(chatStore.getContactById(binding.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    )
    expect(wrapper.find('[data-testid="chat-social-state-banner"]').exists()).toBe(false)
    expect(wrapper.get('input.chat-input-field').attributes('disabled')).toBeUndefined()

    wrapper.unmount()
  })

  test('lets Chat Directory process request states without touching global Contacts or events', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const binding = createRoleBinding(chatStore, {
      name: 'Directory Request',
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
    })

    await router.push('/chat-contacts?section=roles&filter=requests')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-requests-summary"]').text()).toContain('1')
    expect(wrapper.get(`[data-testid="chat-directory-social-state-${binding.id}"]`).text()).toContain(
      'Greeting request',
    )

    await wrapper.get(`[data-testid="chat-directory-accept-request-${binding.id}"]`).trigger('click')
    await flushUi()

    expect(chatStore.getContactChatSocialState(chatStore.getContactById(binding.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
    )
    expect(chatStore.getRoleProfileById(binding.profileId)).toBeTruthy()

    wrapper.unmount()
  })
})
