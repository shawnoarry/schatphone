import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import {
  CHAT_CONTACT_SOCIAL_STATES,
  useChatStore,
} from '../src/stores/chat'
import { useSimulationStore } from '../src/stores/simulation'
import { useSystemStore } from '../src/stores/system'

const aiMockState = vi.hoisted(() => ({
  calls: [],
  nextError: null,
}))

vi.mock('../src/lib/ai', async () => {
  const actual = await vi.importActual('../src/lib/ai')
  return {
    ...actual,
    callAI: vi.fn(async (payload) => {
      aiMockState.calls.push(payload)
      if (aiMockState.nextError) {
        throw aiMockState.nextError
      }
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
                  text: 'I need distance for a while.',
                },
              ],
            },
          ],
          socialEvents: [
            {
              type: 'role_block_user',
              explanation: 'Conflict escalated in the current exchange.',
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

describe('Chat AI social proposal entry', () => {
  beforeEach(() => {
    localStorage.clear()
    aiMockState.calls.length = 0
    aiMockState.nextError = null
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('submits high-risk AI social proposals for World Hub review without mutating Chat state', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const simulationStore = useSimulationStore()
    chatStore.setContactChatSocialState(1, CHAT_CONTACT_SOCIAL_STATES.CONNECTED, { at: 1 })

    await router.push('/chat/1')
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-trigger-reply"]').trigger('click')
    await flushUi()

    const contact = chatStore.getContactById(1)
    const messages = chatStore.getMessagesByContactId(1)
    const pendingProposal = simulationStore.pendingChatSocialEventProposals[0]

    expect(aiMockState.calls).toHaveLength(1)
    expect(messages.some((message) => message.content === 'I need distance for a while.')).toBe(true)
    expect(simulationStore.pendingChatSocialEventProposalCount).toBe(1)
    expect(pendingProposal).toMatchObject({
      eventType: 'role_block_user',
      targetContactId: 1,
      status: 'pending_review',
      requestedChatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
    })
    expect(pendingProposal.source).toMatchObject({
      moduleKey: 'chat',
      conversationId: 1,
    })
    expect(pendingProposal.source.messageId).toBeTruthy()
    expect(chatStore.getContactChatSocialState(contact)).toBe(CHAT_CONTACT_SOCIAL_STATES.CONNECTED)

    wrapper.unmount()
  })

  test('adds locked-screen AI reply notifications through the system notification stack', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const systemStore = useSystemStore()
    systemStore.lockPhone()
    chatStore.setContactChatSocialState(1, CHAT_CONTACT_SOCIAL_STATES.CONNECTED, { at: 1 })

    await router.push('/chat/1')
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-trigger-reply"]').trigger('click')
    await flushUi()

    expect(systemStore.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'chat_ai_reply',
          route: '/chat/1',
          content: 'I need distance for a while.',
        }),
      ]),
    )

    wrapper.unmount()
  })

  test('does not add locked-screen AI reply notifications when system notifications are disabled', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const systemStore = useSystemStore()
    systemStore.lockPhone()
    systemStore.settings.system.notifications = false
    chatStore.setContactChatSocialState(1, CHAT_CONTACT_SOCIAL_STATES.CONNECTED, { at: 1 })

    await router.push('/chat/1')
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-trigger-reply"]').trigger('click')
    await flushUi()

    expect(systemStore.notifications).toEqual([])

    wrapper.unmount()
  })

  test('records Chat AI reply failures through system diagnostic reports', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const systemStore = useSystemStore()
    systemStore.settings.api.resolvedKind = 'openai_compatible'
    systemStore.settings.api.model = 'gpt-test'
    aiMockState.nextError = Object.assign(new Error('Auth failed'), {
      code: 'AUTH',
      status: 401,
    })
    chatStore.setContactChatSocialState(1, CHAT_CONTACT_SOCIAL_STATES.CONNECTED, { at: 1 })

    await router.push('/chat/1')
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-trigger-reply"]').trigger('click')
    await flushUi()

    expect(aiMockState.calls).toHaveLength(1)
    expect(systemStore.apiReports[0]).toMatchObject({
      level: 'error',
      module: 'chat',
      action: 'manual_reply',
      provider: 'openai_compatible',
      model: 'gpt-test',
      statusCode: 401,
      code: 'AUTH',
    })
    expect(systemStore.apiReports[0].message).toContain('鉴权失败')

    wrapper.unmount()
  })
})
