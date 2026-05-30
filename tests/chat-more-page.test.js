import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ChatFeaturePlaceholderView from '../src/views/ChatFeaturePlaceholderView.vue'
import ChatView from '../src/views/ChatView.vue'
import { useChatStore } from '../src/stores/chat'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat', component: ChatView },
      { path: '/chat/:id', component: ChatView },
      { path: '/chat-feature/:feature', component: ChatFeaturePlaceholderView },
      { path: '/chat-contacts', component: DummyView },
      { path: '/chat-groups', component: DummyView },
      { path: '/home', component: DummyView },
      { path: '/network', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('Chat More page', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('centers identity, anonymity, and diagnostics instead of bulk or management shortcuts', async () => {
    const router = createTestRouter()
    await router.push('/chat-feature/more')
    await router.isReady()

    const wrapper = mount(ChatFeaturePlaceholderView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const text = wrapper.text()
    expect(text).toContain('Edit identity & anonymity')
    expect(text).toContain('Chat identity & anonymity')
    expect(text).toContain('Maintenance & diagnostics')
    expect(text).toContain('Diagnostics')
    expect(text).not.toContain('Batch thread templates')
    expect(text).not.toContain('Management entries')

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
