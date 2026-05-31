import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import { useChatStore } from '../src/stores/chat'
import { useSystemStore } from '../src/stores/system'

const aiMockState = vi.hoisted(() => ({
  calls: [],
}))

vi.mock('../src/lib/ai', async () => {
  const actual = await vi.importActual('../src/lib/ai')
  return {
    ...actual,
    callAI: vi.fn(async (payload) => {
      aiMockState.calls.push(payload)
      return {
        text: JSON.stringify({
          messages: [
            {
              replyType: 'plain',
              quote: null,
              blocks: [
                {
                  type: 'text',
                  variant: 'primary',
                  lang: 'en',
                  text: 'I can explain this order update here, but address changes need the Shopping action.',
                },
              ],
            },
          ],
        }),
        meta: null,
      }
    }),
  }
})

import ChatView from '../src/views/ChatView.vue'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat/:id', component: ChatView },
      { path: '/shopping', component: DummyView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/wallet', component: DummyView },
      { path: '/network', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('Chat service account AI replies', () => {
  beforeEach(() => {
    localStorage.clear()
    aiMockState.calls.length = 0
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('injects service-account reply rules and notification context without source ownership', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = chatStore.addContact({
      kind: 'service',
      name: 'Shop Updates',
      serviceTemplate: 'Order support assistant',
    })
    chatStore.appendServiceNotification(service.id, {
      kind: 'shopping_order',
      title: 'Order shipped',
      summary: 'Your parcel is on the way.',
      statusLabel: 'Shipped',
      amount: '128.00 CNY',
      sourceModule: 'shopping_store_pipeline',
      sourceId: 'order-100',
      serviceLabel: 'Daily Shop',
      route: '/shopping',
    })

    await router.push(`/chat/${service.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-service-notification-reply-order-100"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-message-input"]').setValue('Can I change the address?')
    await wrapper.get('[data-testid="chat-message-input"]').trigger('keyup.enter')
    await flushUi()

    await wrapper.get('[data-testid="chat-trigger-reply"]').trigger('click')
    await flushUi()

    expect(aiMockState.calls).toHaveLength(1)
    const payload = aiMockState.calls[0]
    const systemPrompt = payload.systemPrompt || ''
    const contextText = payload.messages.map((message) => message.content).join('\n')

    expect(systemPrompt).toContain('Conversation type: service account')
    expect(systemPrompt).toContain('Service template: Order support assistant.')
    expect(systemPrompt).toContain('behave as an interactive chat account')
    expect(systemPrompt).toContain('Do not claim you changed, canceled, refunded, delivered, confirmed')
    expect(systemPrompt).toContain('Do not create service_notification blocks')
    expect(contextText).toContain('[service notification] Daily Shop')
    expect(contextText).toContain('title: Order shipped')
    expect(contextText).toContain('status: Shipped')
    expect(contextText).toContain('amount: 128.00 CNY')
    expect(contextText).toContain('source action: /shopping')
    expect(contextText).toContain('[quoted assistant] Order shipped')
    expect(contextText).toContain('Can I change the address?')
    expect(contextText).not.toContain('shopping_store_pipeline')
    expect(wrapper.text()).toContain('address changes need the Shopping action')

    wrapper.unmount()
  })
})
