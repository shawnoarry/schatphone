import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
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
                  lang: 'zh',
                  text: 'Mocked worldbook reply.',
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
      { path: '/chat', component: DummyView },
      { path: '/chat/:id', component: ChatView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/wallet', component: DummyView },
      { path: '/network', component: DummyView },
      { path: '/chat-feature/:feature', component: DummyView },
    ],
  })

const flushUi = async () => {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('chat worldbook binding visibility', () => {
  let wrapper = null
  let router = null
  let chatStore = null
  let systemStore = null
  let binding = null
  let injectedPoint = null

  beforeEach(async () => {
    localStorage.clear()
    aiMockState.calls.length = 0
    setActivePinia(createPinia())

    chatStore = useChatStore()
    systemStore = useSystemStore()

    systemStore.setGlobalWorldview('Night city baseline. Formal etiquette in public.')
    injectedPoint = systemStore.upsertKnowledgePoint({
      id: 'kp_city_etiquette',
      title: 'City etiquette',
      content: 'Formal greeting only.',
      tags: ['style'],
      enabled: true,
    })
    systemStore.upsertKnowledgePoint({
      id: 'kp_hidden_note',
      title: 'Hidden note',
      content: 'Should stay out of prompt.',
      tags: ['secret'],
      enabled: false,
    })
    systemStore.upsertKnowledgePoint({
      id: 'kp_tea_ritual',
      title: 'Tea rituals',
      content: 'Late-night tea ceremony phrases.',
      tags: ['culture'],
      enabled: true,
    })

    const profile = chatStore.addRoleProfile({
      name: 'Nova',
      role: 'Companion',
      knowledgePointIds: ['kp_city_etiquette', 'kp_hidden_note'],
    })
    binding = chatStore.bindRoleProfile(profile.id)

    router = createTestRouter()
    await router.push(`/chat/${binding.id}`)
    await router.isReady()

    wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    wrapper = null
    router = null
    chatStore = null
    systemStore = null
    binding = null
    injectedPoint = null
    aiMockState.calls.length = 0
  })

  test('shows effective WorldBook context and injects only enabled bound points into Chat prompt', async () => {
    await wrapper.get('[data-testid="chat-thread-menu-toggle"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="thread-worldbook-summary"]').text()).toContain(
      'Night city baseline. Formal etiquette in public.',
    )
    expect(wrapper.get('[data-testid="thread-worldbook-active-count"]').text()).toContain('1 / 2')
    expect(wrapper.get(`[data-testid="thread-worldbook-point-${injectedPoint.id}"]`).text()).toContain(
      'City etiquette',
    )
    expect(wrapper.find('[data-testid="thread-worldbook-empty"]').exists()).toBe(false)

    await wrapper.get('[data-testid="chat-trigger-reply"]').trigger('click')
    await flushUi()

    expect(aiMockState.calls).toHaveLength(1)
    const systemPrompt = aiMockState.calls[0]?.systemPrompt || ''

    expect(systemPrompt).toContain('Global worldview: Night city baseline. Formal etiquette in public.')
    expect(systemPrompt).toContain('City etiquette: Formal greeting only. [tags: style]')
    expect(systemPrompt).not.toContain('Hidden note')
    expect(systemPrompt).not.toContain('Tea rituals')
    expect(wrapper.text()).toContain('Mocked worldbook reply.')
  })
})
