import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ChatView from '../src/views/ChatView.vue'
import { useChatStore } from '../src/stores/chat'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat/:id', component: ChatView },
      { path: '/network', component: DummyView },
      { path: '/home', component: DummyView },
      { path: '/contacts', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('Chat first-use activation entry', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('keeps the current thread draft while opening bounded Network setup context', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    systemStore.settings.api.url = 'https://api.openai.com/v1/chat/completions'
    systemStore.settings.api.key = ''
    systemStore.settings.api.model = 'gpt-4o-mini'

    await router.push('/chat/1?from=home&homePage=2')
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const readiness = wrapper.get('[data-testid="chat-network-readiness"]')
    expect(readiness.text()).toContain('AI replies need Network & API')
    expect(readiness.text()).toContain('current draft is preserved')

    await wrapper.get('[data-testid="chat-message-input"]').setValue('Keep this draft for Eva')
    await wrapper.get('[data-testid="chat-open-network-setup"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/network')
    expect(router.currentRoute.value.query).toEqual({
      source: 'chat',
      chatId: '1',
      homePage: '2',
    })
    expect(chatStore.getConversationByContactId(1).draft).toBe('Keep this draft for Eva')

    wrapper.unmount()
  })

  test('does not show the recovery entry when the existing Network setup is ready to test', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    systemStore.settings.api.url = 'http://localhost:11434/v1'
    systemStore.settings.api.key = ''
    systemStore.settings.api.model = 'llama3'

    await router.push('/chat/1')
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.find('[data-testid="chat-network-readiness"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('preserves a validated Contacts ancestor through Network and Chat Back', async () => {
    const router = createTestRouter()
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    systemStore.settings.api.url = 'https://api.openai.com/v1/chat/completions'
    systemStore.settings.api.key = ''
    systemStore.settings.api.model = 'gpt-4o-mini'

    await router.push('/chat/1?source=contacts&profileId=27')
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-message-input"]').setValue('Contacts ancestor draft')
    await wrapper.get('[data-testid="chat-open-network-setup"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value).toMatchObject({
      path: '/network',
      query: {
        source: 'chat',
        chatId: '1',
        from: 'contacts',
        profileId: '27',
      },
    })
    expect(chatStore.getConversationByContactId(1).draft).toBe('Contacts ancestor draft')

    await router.push('/chat/1?source=contacts&profileId=27')
    await flushUi()
    await wrapper.get('[data-testid="chat-thread-back"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value).toMatchObject({
      path: '/contacts',
      query: { profileId: '27' },
    })

    wrapper.unmount()
  })
})
