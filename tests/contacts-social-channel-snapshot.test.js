import { beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ContactsView from '../src/views/ContactsView.vue'
import { CHAT_CONTACT_SOCIAL_STATES, useChatStore } from '../src/stores/chat'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', component: ContactsView },
      { path: '/chat/:id', component: DummyView },
      { path: '/chat-contacts', component: DummyView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('Contacts social-channel snapshot', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
    useRelationshipRuntimeStore().resetForTesting()
  })

  test('shows Chat communication state as a read-only role snapshot', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '9901',
      name: 'Contacts Social Snapshot',
      role: 'Role contact',
    })
    const binding = chatStore.bindRoleProfile(profile.id, {
      chatSocialState: CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
      chatSocialNote: 'Generated social event is waiting in Chat history.',
      chatSocialUpdatedAt: Date.UTC(2026, 4, 31, 8, 30),
    })

    const router = createTestRouter()
    await router.push('/contacts')
    await router.isReady()

    const wrapper = mount(ContactsView, {
      global: {
        plugins: [router],
        stubs: ['ImageSourcePicker', 'AssetStatusBadge', 'AssetThumbnailOption'],
      },
    })
    await flushUi()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()

    const panel = wrapper.get('[data-testid="contacts-chat-social-snapshot"]')
    expect(panel.text()).toContain('Chat communication')
    expect(panel.text()).toContain('They are not receiving messages')
    expect(panel.text()).toContain('Read-only from Chat')
    expect(panel.text()).toContain('Generated social event is waiting')
    expect(panel.text()).toContain('Updated')
    expect(chatStore.getContactChatSocialState(chatStore.getContactById(binding.id))).toBe(
      CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED,
    )

    wrapper.unmount()
  })
})
