import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ContactsView from '../src/views/ContactsView.vue'
import ChatDirectoryView from '../src/views/ChatDirectoryView.vue'
import { useChatStore } from '../src/stores/chat'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', component: ContactsView },
      { path: '/chat-contacts', component: ChatDirectoryView },
      { path: '/chat', component: DummyView },
      { path: '/chat/:id', component: DummyView },
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
    expect(copy).toContain('without a Chat thread')
    expect(copy).toContain('start chatting from its profile')
    expect(copy).toContain('Chat Directory')

    wrapper.unmount()
  })

  test('presents Chat Directory as the management surface for existing Chat targets', async () => {
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
    expect(copy).toContain('manages existing Chat targets')
    expect(copy).toContain('Role profiles come from Contacts')
    expect(copy).toContain('can start Chat there')
    expect(copy).toContain('review, unbind')

    wrapper.unmount()
  })

  test('starts one direct Chat binding from the selected Contacts profile', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '7101',
      name: 'Direct Chat Role',
      role: 'Neighbor',
      isMain: true,
    })
    const bindRoleProfile = vi.spyOn(chatStore, 'bindRoleProfile')
    const router = createTestRouter()
    await router.push(`/contacts?profileId=${profile.id}`)
    await router.isReady()

    const wrapper = mount(ContactsView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-role-detail"]').text()).toContain(profile.name)
    await wrapper.get('[data-testid="contacts-start-chat"]').trigger('click')
    await flushUi()

    expect(bindRoleProfile).toHaveBeenCalledTimes(1)
    expect(bindRoleProfile).toHaveBeenCalledWith(profile.id)
    const contact = chatStore.contacts.find(
      (item) => item.kind === 'role' && Number(item.profileId) === Number(profile.id),
    )
    expect(contact).toBeTruthy()
    expect(chatStore.getConversationByContactId(contact.id)).toBeTruthy()
    expect(router.currentRoute.value).toMatchObject({
      path: `/chat/${contact.id}`,
      query: { source: 'contacts', profileId: String(profile.id) },
    })

    wrapper.unmount()
  })

  test('reuses an existing Chat target without binding or duplicating the conversation', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '7102',
      name: 'Existing Chat Role',
      isMain: true,
    })
    const existing = chatStore.bindRoleProfile(profile.id, {
      chatSocialState: 'incoming_request',
      chatSocialNote: 'Keep this existing social state.',
    })
    const existingConversation = chatStore.getConversationByContactId(existing.id)
    chatStore.updateRoleProfile(profile.id, {
      capabilities: { canAppearInChatDirectory: false },
    })
    const bindRoleProfile = vi.spyOn(chatStore, 'bindRoleProfile')
    const router = createTestRouter()
    await router.push(`/contacts?profileId=${profile.id}`)
    await router.isReady()

    const wrapper = mount(ContactsView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()
    await wrapper.get('[data-testid="contacts-open-chat"]').trigger('click')
    await flushUi()

    expect(bindRoleProfile).not.toHaveBeenCalled()
    expect(
      chatStore.contacts.filter(
        (item) => item.kind === 'role' && Number(item.profileId) === Number(profile.id),
      ),
    ).toHaveLength(1)
    expect(chatStore.getConversationByContactId(existing.id)).toBe(existingConversation)
    expect(chatStore.getContactById(existing.id)).toMatchObject({
      chatSocialState: 'incoming_request',
      chatSocialNote: 'Keep this existing social state.',
    })
    expect(router.currentRoute.value.path).toBe(`/chat/${existing.id}`)

    wrapper.unmount()
  })

  test('does not offer direct Chat binding for Self or capability-disabled profiles', async () => {
    const chatStore = useChatStore()
    const selfProfile = chatStore.addRoleProfile({
      roleId: '7103',
      name: 'Self Context',
      entityType: 'self_profile',
    })
    const disabledProfile = chatStore.addRoleProfile({
      roleId: '7104',
      name: 'Disabled Role',
      isMain: true,
      capabilities: { canAppearInChatDirectory: false },
    })
    const router = createTestRouter()
    await router.push(`/contacts?profileId=${selfProfile.id}`)
    await router.isReady()

    const wrapper = mount(ContactsView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()
    expect(wrapper.find('[data-testid="contacts-start-chat"]').exists()).toBe(false)

    await router.push(`/contacts?profileId=${disabledProfile.id}`)
    await flushUi()
    expect(wrapper.get('[data-testid="contacts-role-detail"]').text()).toContain('Disabled Role')
    expect(wrapper.find('[data-testid="contacts-start-chat"]').exists()).toBe(false)
    expect(chatStore.isRoleProfileBound(selfProfile.id)).toBe(false)
    expect(chatStore.isRoleProfileBound(disabledProfile.id)).toBe(false)

    wrapper.unmount()
  })

  test('labels Chat-side relationship fields as local annotations instead of current truth', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      name: 'Boundary Role',
      role: 'Guide',
      isMain: true,
    })
    const binding = chatStore.bindRoleProfile(profile.id, {
      relationshipLevel: 88,
      relationshipNote: 'Thread-local preference note',
    })

    const router = createTestRouter()
    await router.push('/chat-contacts')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get(`[data-testid="chat-directory-role-chat-tuning-${binding.id}"]`).text()).toBe(
      'Chat tuning 88',
    )
    expect(wrapper.get(`[data-testid="chat-directory-role-chat-note-${binding.id}"]`).text()).toBe(
      'Chat note: Thread-local preference note',
    )
    expect(wrapper.text()).not.toContain('Affinity 88')

    await wrapper.get(`[data-testid="chat-directory-role-meta-${binding.id}"]`).trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Chat-local tuning (0-100)')
    expect(wrapper.get('[data-testid="chat-directory-relationship-compatibility-help"]').text()).toContain(
      'not current relationship truth',
    )
    expect(wrapper.text()).not.toContain('Affinity (0-100)')

    wrapper.unmount()
  })
})
