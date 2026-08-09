import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('../src/lib/ai', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    callAI: vi.fn(),
  }
})

import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ChatView from '../src/views/ChatView.vue'
import { callAI } from '../src/lib/ai'
import { useChatStore } from '../src/stores/chat'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat', component: DummyView },
      { path: '/chat/:id', component: ChatView },
      { path: '/home', component: DummyView },
      { path: '/network', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/wallet', component: DummyView },
      { path: '/chat-feature/:feature', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountActiveChat = async () => {
  const router = createTestRouter()
  const chatStore = useChatStore()
  const contactId = chatStore.contacts[0].id
  await router.push(`/chat/${contactId}`)
  await router.isReady()

  const wrapper = mount(ChatView, {
    global: {
      plugins: [router],
    },
  })
  await flushUi()

  return { wrapper, chatStore, contactId }
}

describe('Chat composer behavior', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.mocked(callAI).mockReset()

    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.settings.api.url = 'http://localhost:11434/v1'
    systemStore.settings.api.key = ''
    systemStore.settings.api.model = 'local-chat-model'
  })

  test('supports multiline drafts while keeping Enter as the familiar send action', async () => {
    const { wrapper, chatStore, contactId } = await mountActiveChat()
    const composer = wrapper.get('[data-testid="chat-message-input"]')
    const initialMessageCount = chatStore.getMessagesByContactId(contactId).length

    expect(composer.element.tagName).toBe('TEXTAREA')
    expect(composer.attributes('rows')).toBe('1')

    await composer.setValue('First line')
    await composer.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(chatStore.getMessagesByContactId(contactId)).toHaveLength(initialMessageCount)

    await composer.setValue('First line\nSecond line')
    await composer.trigger('keydown', { key: 'Enter' })
    await flushUi()

    const sentMessage = chatStore.getMessagesByContactId(contactId).at(-1)
    expect(sentMessage).toMatchObject({
      role: 'user',
      content: 'First line\nSecond line',
    })
    expect(composer.element.value).toBe('')

    wrapper.unmount()
  })

  test('offers an in-context stop action and preserves retry after cancellation', async () => {
    vi.mocked(callAI).mockImplementationOnce(
      ({ signal }) =>
        new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('Request canceled')
            error.code = 'CANCELED'
            reject(error)
          })
        }),
    )

    const { wrapper, chatStore, contactId } = await mountActiveChat()
    chatStore.appendMessage(contactId, {
      role: 'user',
      content: 'Wait while this reply is generated.',
      status: 'delivered',
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-trigger-reply"]').trigger('click')
    await flushUi()

    const stopButton = wrapper.get('[data-testid="chat-cancel-reply"]')
    expect(stopButton.attributes('aria-label')).toBe('Stop reply')
    expect(wrapper.find('[data-testid="chat-trigger-reply"]').exists()).toBe(false)

    await stopButton.trigger('click')
    await flushUi()

    expect(wrapper.text()).toMatch(/请求已取消|Request canceled/)
    const retryButton = wrapper.findAll('button').find((button) => button.text() === 'Retry')
    expect(retryButton).toBeTruthy()

    vi.mocked(callAI).mockResolvedValueOnce('Recovered assistant reply')
    await retryButton.trigger('click')
    await flushUi()

    expect(chatStore.getMessagesByContactId(contactId).at(-1)?.content).toContain(
      'Recovered assistant reply',
    )
    expect(wrapper.find('[data-testid="chat-cancel-reply"]').exists()).toBe(false)

    wrapper.unmount()
  })
})
