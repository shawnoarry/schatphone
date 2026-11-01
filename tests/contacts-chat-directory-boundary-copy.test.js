import { beforeEach, describe, expect, test } from 'vitest'
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
    expect(copy).toContain('Every person profile lives here')
    expect(copy).toContain('Persona, relationships, and history')
    expect(copy).toContain('managed only in Chat Contacts')

    wrapper.unmount()
  })

  test('presents Chat Directory as the Contacts surface for Chat-local preferences', async () => {
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
    expect(copy).toContain('manages who enters Chat')
    expect(copy).toContain('Chat-only preferences')
    expect(copy).toContain('Role profiles come from main Contacts')
    expect(copy).toContain('adding them to Chat happens only here')

    wrapper.unmount()
  })

  test('offers navigation to Chat without binding from the selected Contacts profile', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '7101',
      name: 'Contacts-only profile',
      role: 'Neighbor',
      isMain: true,
    })
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
    expect(wrapper.find('[data-testid="contacts-start-chat"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="contacts-open-chat"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="contacts-header-edit-basic-profile"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="contacts-hero-edit-basic-profile"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="contacts-manage-identity-bindings"]').text()).toContain(
      'Identity and bindings',
    )
    expect(chatStore.isRoleProfileBound(profile.id)).toBe(false)

    await wrapper.get('[data-testid="contacts-go-to-chat"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.path).toBe('/chat-contacts')
    expect(router.currentRoute.value.query).toMatchObject({ source: 'contacts', profileId: String(profile.id) })
    expect(chatStore.isRoleProfileBound(profile.id)).toBe(false)

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
    expect(wrapper.find('[data-testid="contacts-go-to-chat"]').exists()).toBe(false)

    await router.push(`/contacts?profileId=${disabledProfile.id}`)
    await flushUi()
    expect(wrapper.get('[data-testid="contacts-role-detail"]').text()).toContain('Disabled Role')
    expect(wrapper.find('[data-testid="contacts-start-chat"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="contacts-go-to-chat"]').exists()).toBe(false)
    expect(chatStore.isRoleProfileBound(selfProfile.id)).toBe(false)
    expect(chatStore.isRoleProfileBound(disabledProfile.id)).toBe(false)

    wrapper.unmount()
  })

  test('handoff preselects the exact person, cancels without binding, and reuses the confirmed conversation', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({ roleId: '7180', name: 'Requested person' })
    const router = createTestRouter()
    const profilePath = `/contacts?profileId=${profile.id}&from=home&homePage=2`
    await router.push(profilePath)
    await router.isReady()
    const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
    await flushUi()
    await wrapper.get('[data-testid="contacts-go-to-chat"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="chat-directory-bind-profile"]').element.value).toBe(String(profile.id))
    expect(chatStore.isRoleProfileBound(profile.id)).toBe(false)
    await wrapper.get('[aria-label="Close"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.path).toBe('/contacts')
    expect(router.currentRoute.value.query).toMatchObject({ profileId: String(profile.id), homePage: '2' })
    expect(chatStore.isRoleProfileBound(profile.id)).toBe(false)

    await wrapper.get('[data-testid="contacts-go-to-chat"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="chat-directory-confirm-bind"]').trigger('click')
    await flushUi()
    const contact = chatStore.contacts.find((item) => item.profileId === profile.id)
    expect(router.currentRoute.value.path).toBe(`/chat/${contact.id}`)
    expect(router.currentRoute.value.query.homePage).toBe('2')

    await router.push(profilePath)
    await flushUi()
    expect(wrapper.get('[data-testid="contacts-go-to-chat"]').text()).toBe('Continue chatting')
    await wrapper.get('[data-testid="contacts-go-to-chat"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.path).toBe(`/chat/${contact.id}`)
    expect(chatStore.contacts.filter((item) => item.profileId === profile.id)).toHaveLength(1)
    wrapper.unmount()
  })

  test.each(['self_profile', 'disabled', 'archived', 'missing'])('rejects a %s person handoff and excludes invalid add candidates', async (kind) => {
    const chatStore = useChatStore()
    const profile = kind === 'missing' ? { id: 99999 } : chatStore.addRoleProfile({
      name: 'Unavailable person',
      ...(kind === 'self_profile' ? { entityType: kind } : {}),
      ...(kind === 'disabled' ? { capabilities: { canAppearInChatDirectory: false } } : {}),
    })
    if (kind === 'archived') chatStore.archiveRoleProfile(profile.id)
    const router = createTestRouter()
    await router.push(`/chat-contacts?source=contacts&profileId=${profile.id}`)
    await router.isReady()
    const wrapper = mount(ChatDirectoryView, { global: { plugins: [router] } })
    await flushUi()
    expect(wrapper.find('[data-testid="chat-directory-bind-modal"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('This person is unavailable for Chat.')
    expect(chatStore.isRoleProfileBound(profile.id)).toBe(false)
    await wrapper.get('button[aria-label="Add contact"]').trigger('click')
    await flushUi()
    expect(wrapper.findAll('select option').some((option) => option.element.value === String(profile.id))).toBe(false)
    wrapper.unmount()
  })

  test('does not offer archived profiles as new Chat targets', async () => {
    const chatStore = useChatStore()
    const activeProfile = chatStore.addRoleProfile({
      roleId: '7105',
      name: 'Active Chat Candidate',
    })
    const archivedProfile = chatStore.addRoleProfile({
      roleId: '7106',
      name: 'Archived Chat Candidate',
    })
    expect(chatStore.archiveRoleProfile(archivedProfile.id)).toMatchObject({ ok: true })

    const router = createTestRouter()
    await router.push('/chat-contacts')
    await router.isReady()
    const wrapper = mount(ChatDirectoryView, {
      global: { plugins: [router] },
    })
    await flushUi()

    await wrapper.get('button[aria-label="Add contact"]').trigger('click')
    await flushUi()
    const options = wrapper.findAll('select option').map((option) => option.text())
    expect(options).toEqual(
      expect.arrayContaining([expect.stringContaining(activeProfile.name)]),
    )
    expect(options.some((label) => label.includes(archivedProfile.name))).toBe(false)

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

    expect(wrapper.text()).toContain('Contacts')
    expect(wrapper.text()).not.toContain('Objects')
    expect(wrapper.find(`[data-testid="chat-directory-role-chat-tuning-${binding.id}"]`).exists()).toBe(false)
    expect(wrapper.find(`[data-testid="chat-directory-role-chat-note-${binding.id}"]`).exists()).toBe(false)
    expect(wrapper.find(`[data-testid="chat-directory-role-meta-${binding.id}"]`).exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Affinity 88')

    await wrapper.get(`[data-testid="chat-directory-role-more-${binding.id}"]`).trigger('click')
    await flushUi()
    expect(wrapper.get(`[data-testid="chat-directory-role-menu-${binding.id}"]`).exists()).toBe(true)
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
