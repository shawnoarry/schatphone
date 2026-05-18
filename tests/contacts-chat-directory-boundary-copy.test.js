import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ContactsView from '../src/views/ContactsView.vue'
import ChatDirectoryView from '../src/views/ChatDirectoryView.vue'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', component: ContactsView },
      { path: '/chat-contacts', component: ChatDirectoryView },
      { path: '/chat', component: DummyView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('Contacts and Chat Directory boundary copy', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('presents Contacts as the role archive and explains unbound roles', async () => {
    const router = createTestRouter()
    await router.push('/contacts')
    await router.isReady()

    const wrapper = mount(ContactsView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const copy = wrapper.get('[data-testid="contacts-boundary-copy"]').text()
    expect(copy).toContain('role archive')
    expect(copy).toContain('role hub')
    expect(copy).toContain('without becoming a Chat thread')
    expect(copy).toContain('Chat Directory')

    wrapper.unmount()
  })

  test('presents Chat Directory as the gate for who can enter Chat', async () => {
    const router = createTestRouter()
    await router.push('/chat-contacts')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const copy = wrapper.get('[data-testid="chat-directory-boundary-copy"]').text()
    expect(copy).toContain('decides who can enter Chat')
    expect(copy).toContain('role profiles come from Contacts')
    expect(copy).toContain('remain only in Contacts')
    expect(copy).toContain('bound as a chat target')

    wrapper.unmount()
  })
})
