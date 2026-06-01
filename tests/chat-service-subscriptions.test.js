import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, test } from 'vitest'
import ChatView from '../src/views/ChatView.vue'
import ChatDirectoryView from '../src/views/ChatDirectoryView.vue'
import { useChatStore } from '../src/stores/chat'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/chat', component: ChatView },
      { path: '/chat/:id', component: ChatView },
      { path: '/chat-contacts', component: ChatDirectoryView },
      { path: '/chat-groups', component: DummyView },
      { path: '/chat-settings', component: DummyView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/wallet', component: DummyView },
      { path: '/shopping', component: DummyView },
      { path: '/food-delivery', component: DummyView },
      { path: '/network', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const createServiceSubscription = (chatStore, overrides = {}) => {
  const contact = chatStore.addContact({
    kind: 'service',
    name: overrides.name || 'Daily Dispatch',
    serviceTemplate: overrides.serviceTemplate || 'Daily update feed',
    bio: overrides.bio || 'Subscription fixture.',
    shoppingServiceKey: overrides.shoppingServiceKey || '',
    logisticsServiceKey: overrides.logisticsServiceKey || '',
    foodDeliveryServiceKey: overrides.foodDeliveryServiceKey || '',
  })
  chatStore.appendMessage(contact.id, {
    role: 'assistant',
    content: overrides.message || 'Your subscription update is ready.',
  })
  chatStore.incrementConversationUnread(contact.id, overrides.unread ?? 2)
  return contact
}

describe('Chat service subscriptions', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('stores muted and folded subscription state only for service-like contacts', () => {
    const chatStore = useChatStore()
    const service = chatStore.addContact({ kind: 'service', name: 'Quiet Feed' })
    const role = chatStore.addContact({ kind: 'role', name: 'Role Contact' })

    expect(chatStore.isChatSubscriptionContact(service)).toBe(true)
    expect(chatStore.toggleChatSubscriptionMuted(service.id)).toBe(true)
    expect(chatStore.toggleChatSubscriptionFolded(service.id)).toBe(true)

    const updated = chatStore.getContactById(service.id)
    expect(chatStore.isChatSubscriptionMuted(updated)).toBe(true)
    expect(chatStore.isChatSubscriptionFolded(updated)).toBe(true)
    expect(chatStore.getConversationByContactId(service.id)).toBeTruthy()

    expect(chatStore.toggleChatSubscriptionMuted(role.id)).toBe(false)
    expect(chatStore.setChatSubscriptionState(role.id, { subscriptionFolded: true })).toBe(false)
  })

  test('presents services as a subscription feed with mute and fold controls', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = createServiceSubscription(chatStore, {
      name: 'Daily Digest',
      message: 'Morning briefing is ready.',
      unread: 3,
    })

    await router.push('/chat-contacts?section=service')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-subscription-summary"]').text()).toContain('3')
    expect(wrapper.find('[data-testid="chat-directory-service-management"]').exists()).toBe(false)
    expect(wrapper.get(`[data-testid="chat-directory-service-feed-${service.id}"]`).text()).toContain(
      'Morning briefing is ready.',
    )

    await wrapper.get(`[data-testid="chat-directory-service-toggle-muted-${service.id}"]`).trigger('click')
    await flushUi()

    expect(chatStore.isChatSubscriptionMuted(chatStore.getContactById(service.id))).toBe(true)
    expect(wrapper.get(`[data-testid="chat-directory-service-muted-tag-${service.id}"]`).text()).toContain(
      'Muted',
    )

    await wrapper.get(`[data-testid="chat-directory-service-toggle-folded-${service.id}"]`).trigger('click')
    await flushUi()

    expect(chatStore.isChatSubscriptionFolded(chatStore.getContactById(service.id))).toBe(true)
    expect(router.currentRoute.value.query).toMatchObject({ section: 'service', filter: 'folded' })
    expect(wrapper.get(`[data-testid="chat-directory-service-folded-tag-${service.id}"]`).text()).toContain(
      'Folded',
    )

    wrapper.unmount()
  })

  test('distinguishes muted unread from folded unread service states', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const muted = createServiceSubscription(chatStore, {
      name: 'Quiet Digest',
      message: 'A quiet update is ready.',
      unread: 4,
    })
    const folded = createServiceSubscription(chatStore, {
      name: 'Folded Digest',
      message: 'A folded update is ready.',
      unread: 2,
    })
    chatStore.setChatSubscriptionState(muted.id, { subscriptionMuted: true })
    chatStore.setChatSubscriptionState(folded.id, { subscriptionFolded: true })

    await router.push('/chat-contacts?section=service')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-service-filter-context-body"]').text()).toContain(
      'message cards and source records are not deleted',
    )
    expect(wrapper.get('[data-testid="chat-directory-service-filter-chip-meta-all"]').text()).toBe('2')
    expect(wrapper.get('[data-testid="chat-directory-service-filter-chip-meta-unread"]').text()).toBe('2')
    expect(wrapper.get('[data-testid="chat-directory-service-filter-chip-meta-muted"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="chat-directory-service-filter-chip-meta-folded"]').text()).toBe('1')
    expect(wrapper.get('[data-testid="chat-directory-service-muted-unread-summary"]').text()).toContain(
      '4 unread',
    )
    expect(wrapper.get('[data-testid="chat-directory-service-folded-unread-summary"]').text()).toContain(
      '2 unread',
    )
    expect(wrapper.get(`[data-testid="chat-directory-service-delivery-state-${muted.id}"]`).text()).toContain(
      'Muted · unread kept quiet',
    )
    expect(wrapper.find(`[data-testid="chat-directory-service-feed-${folded.id}"]`).exists()).toBe(false)

    await wrapper.get('[data-testid="chat-directory-service-summary-folded"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.query).toMatchObject({ section: 'service', filter: 'folded' })
    expect(wrapper.get('[data-testid="chat-directory-service-summary-folded"]').attributes('data-state')).toBe(
      'selected',
    )
    expect(wrapper.get('[data-testid="chat-directory-service-filter-context-title"]').text()).toContain(
      'Folded subscriptions',
    )
    expect(wrapper.get('[data-testid="chat-directory-service-filter-context-body"]').text()).toContain(
      'remain in Services',
    )
    expect(wrapper.get(`[data-testid="chat-directory-service-delivery-state-${folded.id}"]`).text()).toContain(
      'Folded · unread in Services',
    )

    wrapper.unmount()
  })

  test('shows a first-service empty state instead of a backend blank list', async () => {
    const router = createTestRouter()

    await router.push('/chat-contacts?section=service')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-service-empty-state"]').text()).toContain(
      'No service chats yet',
    )
    expect(wrapper.get('[data-testid="chat-directory-service-empty-body"]').text()).toContain(
      'receive shop, logistics, delivery, and public-channel messages here like chats',
    )
    expect(wrapper.get('[data-testid="chat-directory-service-management"]').exists()).toBe(true)

    await wrapper.get('[data-testid="chat-directory-service-empty-action"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-service-management"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('lets users opt into active World Pack service templates from Services management', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const systemStore = useSystemStore()
    expect(systemStore.activateWorldPack('survival_city').ok).toBe(true)

    await router.push('/chat-contacts?section=service')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-world-service-templates"]').text()).toContain(
      'Current world subscriptions',
    )
    expect(wrapper.get('[data-testid="chat-directory-world-service-summary"]').text()).toContain(
      'Post-disaster survival city offers 1 service candidates',
    )
    expect(
      wrapper.get('[data-testid="chat-directory-world-service-template-survival_supply_dispatch"]').text(),
    ).toContain('补给调度员')

    expect(
      wrapper.get('[data-testid="chat-directory-world-service-source-plan-survival_supply_dispatch"]').text(),
    ).toContain('ready after the user joins')

    await wrapper
      .get('[data-testid="chat-directory-edit-world-service-survival_supply_dispatch"]')
      .trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-world-service-template-modal"]').exists()).toBe(true)
    await wrapper.get('[data-testid="chat-directory-world-service-template-title"]').setValue('Shelter Bulletin')
    await wrapper.get('[data-testid="chat-directory-world-service-template-category"]').setValue('publication')
    await wrapper.get('[data-testid="chat-directory-world-service-template-linked-app"]').setValue('survival_dispatch')
    await wrapper
      .get('[data-testid="chat-directory-world-service-template-description"]')
      .setValue('Publishes shelter notices and supply windows.')
    await wrapper.get('[data-testid="chat-directory-save-world-service-template"]').trigger('click')
    await flushUi()

    expect(
      wrapper.get('[data-testid="chat-directory-world-service-template-survival_supply_dispatch"]').text(),
    ).toContain('Shelter Bulletin')
    expect(
      wrapper.get('[data-testid="chat-directory-world-service-template-edited-survival_supply_dispatch"]').text(),
    ).toContain('Customized')

    await wrapper
      .get('[data-testid="chat-directory-join-world-service-survival_supply_dispatch"]')
      .trigger('click')
    await flushUi()

    const created = chatStore.findWorldServiceTemplateContact('survival_city', 'survival_supply_dispatch')
    expect(created).toMatchObject({
      kind: 'official',
      name: 'Shelter Bulletin',
      profileId: 0,
      isMain: false,
      relationshipNote: '',
      foodDeliveryServiceKey: 'food_delivery_dispatch',
      worldPackId: 'survival_city',
      worldServiceTemplateId: 'survival_supply_dispatch',
      worldAppBindingId: 'survival_dispatch',
    })
    expect(
      wrapper.get('[data-testid="chat-directory-world-service-template-state-survival_supply_dispatch"]').text(),
    ).toContain('Joined')
    expect(
      wrapper
        .get('[data-testid="chat-directory-world-service-source-plan-survival_supply_dispatch"]')
        .attributes('data-source-plan-status'),
    ).toBe('ready')
    expect(wrapper.get(`[data-testid="chat-directory-service-source-plan-${created.id}"]`).text()).toContain(
      'Food Delivery orders',
    )
    expect(
      wrapper.find('[data-testid="chat-directory-join-world-service-survival_supply_dispatch"]').exists(),
    ).toBe(false)
    expect(chatStore.contacts.filter((contact) => contact.worldServiceTemplateId === 'survival_supply_dispatch')).toHaveLength(1)

    await wrapper
      .get('[data-testid="chat-directory-reset-world-service-survival_supply_dispatch"]')
      .trigger('click')
    await flushUi()

    expect(
      wrapper.get('[data-testid="chat-directory-world-service-template-survival_supply_dispatch"]').text(),
    ).toContain('补给调度员')
    expect(
      wrapper.find('[data-testid="chat-directory-world-service-template-edited-survival_supply_dispatch"]').exists(),
    ).toBe(false)

    await wrapper
      .get('[data-testid="chat-directory-open-world-service-survival_supply_dispatch"]')
      .trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe(`/chat/${created.id}`)
    expect(router.currentRoute.value.query).toMatchObject({
      chatReturn: 'services',
      serviceFilter: 'all',
    })

    wrapper.unmount()
  })

  test('lists service candidates from multiple enabled compatible expansion packs', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const systemStore = useSystemStore()
    expect(systemStore.enableWorldPack('school_life').ok).toBe(true)
    expect(systemStore.enableWorldPack('business_family').ok).toBe(true)

    await router.push('/chat-contacts?section=service')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-world-service-summary"]').text()).toContain(
      '2 enabled world packs offers 2 service candidates',
    )
    expect(wrapper.get('[data-testid="chat-directory-world-service-template-school_affairs_office"]').text()).toContain(
      'School life expansion',
    )
    expect(wrapper.get('[data-testid="chat-directory-world-service-template-family_office_channel"]').text()).toContain(
      'Business family expansion',
    )

    await wrapper.get('[data-testid="chat-directory-join-world-service-school_affairs_office"]').trigger('click')
    await flushUi()

    const created = chatStore.findWorldServiceTemplateContact('school_life', 'school_affairs_office')
    expect(created).toMatchObject({
      kind: 'official',
      worldPackId: 'school_life',
      worldServiceTemplateId: 'school_affairs_office',
      worldAppBindingId: 'school_bulletin_feed',
    })
    expect(wrapper.get('[data-testid="chat-directory-world-service-summary"]').text()).toContain(
      '1 joined and 1 available',
    )
    expect(
      wrapper.get('[data-testid="chat-directory-world-service-template-state-school_affairs_office"]').text(),
    ).toContain('Joined')
    expect(wrapper.find('[data-testid="chat-directory-join-world-service-family_office_channel"]').exists()).toBe(
      true,
    )

    wrapper.unmount()
  })

  test('uses product-facing source-plan copy in Chinese subscription UI', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const systemStore = useSystemStore()
    systemStore.settings.system.language = 'zh-CN'
    expect(systemStore.activateWorldPack('survival_city').ok).toBe(true)

    await router.push('/chat-contacts?section=service')
    await router.isReady()

    const directoryWrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const templateText = directoryWrapper
      .get('[data-testid="chat-directory-world-service-template-survival_supply_dispatch"]')
      .text()
    expect(templateText).toContain('加入后可接收')
    expect(templateText).toContain('购物订单')
    expect(templateText).not.toContain('Source schedule')
    expect(directoryWrapper.get('[data-testid="chat-directory-world-service-proposals"]').text()).toContain(
      'AI 候选服务号',
    )

    await directoryWrapper
      .get('[data-testid="chat-directory-join-world-service-survival_supply_dispatch"]')
      .trigger('click')
    await flushUi()
    directoryWrapper.unmount()

    const service = chatStore.findWorldServiceTemplateContact(
      'survival_city',
      'survival_supply_dispatch',
    )
    expect(service).toBeTruthy()

    await router.push(`/chat/${service.id}`)
    await router.isReady()

    const chatWrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const planText = chatWrapper.get('[data-testid="chat-service-channel-source-plan"]').text()
    expect(planText).toContain('接收计划')
    expect(planText).toContain('购物订单')
    expect(planText).not.toContain('Source schedule')

    chatWrapper.unmount()
  })

  test('reviews AI world service candidates before users join them', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const systemStore = useSystemStore()
    expect(systemStore.activateWorldPack('survival_city').ok).toBe(true)

    await router.push('/chat-contacts?section=service')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const payload = {
      proposals: [
        {
          id: 'shelter_bulletin',
          title: 'Shelter Bulletin',
          category: 'publication',
          description: 'Publishes shelter notices and supply windows.',
          linkedAppBindingId: 'survival_dispatch',
          confidence: 'high',
        },
        {
          id: 'shadow_feed',
          title: 'Shadow Feed',
          category: 'publication',
          linkedAppBindingId: 'unknown_world_app',
          confidence: 'high',
        },
      ],
    }

    await wrapper
      .get('[data-testid="chat-directory-world-service-proposal-draft"]')
      .setValue(JSON.stringify(payload))
    await wrapper.get('[data-testid="chat-directory-world-service-proposal-review-json"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-world-service-proposal-notice"]').text()).toContain(
      '1 confirmable, 1 rejected',
    )
    expect(
      wrapper.get('[data-testid="chat-directory-world-service-proposal-rejection-shadow_feed"]').attributes(
        'data-rejection-reason',
      ),
    ).toBe('unknown_app_binding')

    await wrapper.get('[data-testid="chat-directory-world-service-proposal-confirm-shelter_bulletin"]').trigger('click')
    await flushUi()

    expect(
      wrapper.get('[data-testid="chat-directory-world-service-template-shelter_bulletin"]').text(),
    ).toContain('Shelter Bulletin')
    expect(
      systemStore.getWorldPackById('survival_city').serviceAccountTemplates,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'shelter_bulletin',
          source: 'ai_confirmed',
        }),
      ]),
    )

    expect(chatStore.findWorldServiceTemplateContact('survival_city', 'shelter_bulletin')).toBeNull()

    await wrapper.get('[data-testid="chat-directory-join-world-service-shelter_bulletin"]').trigger('click')
    await flushUi()

    expect(chatStore.findWorldServiceTemplateContact('survival_city', 'shelter_bulletin')).toMatchObject({
      kind: 'official',
      name: 'Shelter Bulletin',
      worldPackId: 'survival_city',
      worldServiceTemplateId: 'shelter_bulletin',
      worldAppBindingId: 'survival_dispatch',
    })

    wrapper.unmount()
  })

  test('uses contextual empty states and recovery actions for service filters', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = chatStore.addContact({
      kind: 'service',
      name: 'Read Digest',
      serviceTemplate: 'Read updates',
      bio: 'Read channel.',
    })
    chatStore.appendMessage(service.id, {
      role: 'assistant',
      content: 'Everything is already read.',
    })
    chatStore.markConversationRead(service.id)

    await router.push('/chat-contacts?section=service&filter=unread')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-service-summary-unread"]').attributes('data-state')).toBe(
      'selected',
    )
    expect(wrapper.get('[data-testid="chat-directory-service-filter-context-body"]').text()).toContain(
      'Mark read only clears Chat counters',
    )
    expect(wrapper.get('[data-testid="chat-directory-service-empty-title"]').text()).toContain(
      'No unread updates',
    )
    expect(wrapper.get('[data-testid="chat-directory-service-empty-body"]').text()).toContain(
      'notification cards stay in service threads',
    )

    await wrapper.get('[data-testid="chat-directory-service-empty-action"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.query).toMatchObject({ section: 'service' })
    expect(wrapper.find('[data-testid="chat-directory-service-empty-state"]').exists()).toBe(false)
    expect(wrapper.get(`[data-testid="chat-directory-service-feed-${service.id}"]`).text()).toContain(
      'Everything is already read.',
    )

    wrapper.unmount()
  })

  test('lets users clear unread service subscriptions without opening threads', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const daily = createServiceSubscription(chatStore, {
      name: 'Daily Digest',
      message: 'Morning briefing is ready.',
      unread: 2,
    })
    const official = chatStore.addContact({
      kind: 'official',
      name: 'City Notice',
      serviceTemplate: 'Official notices',
      bio: 'Official channel.',
    })
    chatStore.appendMessage(official.id, {
      role: 'assistant',
      content: 'Permit window opens tomorrow.',
    })
    chatStore.incrementConversationUnread(official.id, 5)
    const role = chatStore.addContact({ kind: 'role', name: 'Role Friend' })
    chatStore.appendMessage(role.id, {
      role: 'assistant',
      content: 'Role message.',
    })
    chatStore.incrementConversationUnread(role.id, 4)

    await router.push('/chat-contacts?section=service&filter=unread')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-directory-subscription-summary"]').text()).toContain('7')
    expect(wrapper.get(`[data-testid="chat-directory-service-feed-${daily.id}"]`).text()).toContain(
      'Morning briefing is ready.',
    )
    expect(wrapper.get(`[data-testid="chat-directory-service-feed-${official.id}"]`).text()).toContain(
      'Permit window opens tomorrow.',
    )

    await wrapper.get(`[data-testid="chat-directory-service-mark-read-${daily.id}"]`).trigger('click')
    await flushUi()

    expect(chatStore.getConversationByContactId(daily.id).unread).toBe(0)
    expect(wrapper.get('[data-testid="chat-directory-ui-notice"]').text()).toContain(
      'Notification cards stay in the thread',
    )
    expect(wrapper.find(`[data-testid="chat-directory-service-feed-${daily.id}"]`).exists()).toBe(false)
    expect(wrapper.get('[data-testid="chat-directory-subscription-summary"]').text()).toContain('5')

    await wrapper.get('[data-testid="chat-directory-service-mark-all-read"]').trigger('click')
    await flushUi()

    expect(chatStore.getConversationByContactId(official.id).unread).toBe(0)
    expect(chatStore.getConversationByContactId(role.id).unread).toBe(4)
    expect(wrapper.find(`[data-testid="chat-directory-service-feed-${official.id}"]`).exists()).toBe(false)
    expect(wrapper.find('[data-testid="chat-directory-service-mark-all-read"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="chat-directory-subscription-summary"]').text()).toContain('0')

    wrapper.unmount()
  })

  test('preserves the Services filter and explains read return from a service thread', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = createServiceSubscription(chatStore, {
      name: 'Return Digest',
      message: 'A return-loop update is ready.',
      unread: 2,
    })

    await router.push('/chat-contacts?section=service&filter=unread')
    await router.isReady()

    const directoryWrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await directoryWrapper.get(`[data-testid="chat-directory-service-feed-${service.id}"]`).trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe(`/chat/${service.id}`)
    expect(router.currentRoute.value.query).toMatchObject({
      chatReturn: 'services',
      serviceFilter: 'unread',
    })
    expect(chatStore.getConversationByContactId(service.id).unread).toBe(2)
    directoryWrapper.unmount()

    const chatWrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(chatStore.getConversationByContactId(service.id).unread).toBe(0)
    expect(chatWrapper.get('[data-testid="chat-service-interaction-dock"]').attributes('data-service-interaction-type')).toBe(
      'read',
    )

    await chatWrapper.get('[data-testid="chat-thread-back"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/chat-contacts')
    expect(router.currentRoute.value.query).toMatchObject({
      section: 'service',
      filter: 'unread',
      selectedService: String(service.id),
      serviceReturn: 'thread',
    })
    chatWrapper.unmount()

    const returnedDirectoryWrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const returnPanel = returnedDirectoryWrapper.get('[data-testid="chat-directory-service-return-panel"]')
    expect(returnPanel.attributes('data-visible')).toBe('false')
    expect(returnPanel.attributes('data-return-tone')).toBe('read')
    expect(returnPanel.text()).toContain('Read and left this filter')
    expect(returnPanel.text()).toContain('left this unread filter after being read in Chat')
    expect(returnPanel.text()).toContain('notification cards and history stay in its service thread')
    expect(returnedDirectoryWrapper.find(`[data-testid="chat-directory-service-feed-${service.id}"]`).exists()).toBe(false)

    await returnedDirectoryWrapper.get('[data-testid="chat-directory-service-return-primary"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.query).toMatchObject({
      section: 'service',
      selectedService: String(service.id),
      serviceReturn: 'thread',
    })
    expect(router.currentRoute.value.query.filter).toBeUndefined()
    expect(returnedDirectoryWrapper.get(`[data-testid="chat-directory-service-feed-${service.id}"]`).attributes('data-selected')).toBe(
      'true',
    )
    expect(returnedDirectoryWrapper.get(`[data-testid="chat-directory-service-selected-tag-${service.id}"]`).text()).toContain(
      'Recently opened',
    )

    returnedDirectoryWrapper.unmount()
  })

  test('groups service subscriptions by inbox priority and recency', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const now = Date.now()
    const unread = createServiceSubscription(chatStore, {
      name: 'Daily Digest',
      message: 'Morning briefing is ready.',
      unread: 2,
    })
    const today = chatStore.addContact({
      kind: 'service',
      name: 'Today Briefing',
      serviceTemplate: 'Today updates',
      bio: 'Today channel.',
    })
    chatStore.appendMessage(today.id, {
      role: 'assistant',
      content: 'A read update from today.',
      createdAt: now - 60_000,
    })
    const earlierAt = now - 2 * 24 * 60 * 60 * 1000
    const earlier = chatStore.addContact({
      kind: 'official',
      name: 'Archive Notice',
      serviceTemplate: 'Archive notices',
      bio: 'Archive channel.',
    })
    chatStore.appendMessage(earlier.id, {
      role: 'assistant',
      content: 'An older public notice.',
      createdAt: earlierAt,
    })
    chatStore.getConversationByContactId(earlier.id).updatedAt = earlierAt
    const dormant = chatStore.addContact({
      kind: 'service',
      name: 'Dormant Service',
      serviceTemplate: 'Dormant feed',
      bio: 'No messages yet.',
    })
    chatStore.ensureConversationForContact(dormant.id)

    await router.push('/chat-contacts?section=service')
    await router.isReady()

    const wrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const unreadSection = wrapper.get('[data-testid="chat-directory-service-section-unread"]')
    const todaySection = wrapper.get('[data-testid="chat-directory-service-section-today"]')
    const earlierSection = wrapper.get('[data-testid="chat-directory-service-section-earlier"]')
    const noUpdatesSection = wrapper.get('[data-testid="chat-directory-service-section-no-updates"]')

    expect(unreadSection.text()).toContain('Unread updates')
    expect(unreadSection.text()).toContain('Daily Digest')
    expect(unreadSection.text()).toContain('2 unread')
    expect(wrapper.get(`[data-testid="chat-directory-service-unread-summary-${unread.id}"]`).text()).toContain(
      '2 unread updates',
    )
    expect(todaySection.text()).toContain('Today Briefing')
    expect(todaySection.text()).toContain('A read update from today.')
    expect(earlierSection.text()).toContain('Archive Notice')
    expect(earlierSection.text()).toContain('An older public notice.')
    expect(noUpdatesSection.text()).toContain('Dormant Service')
    expect(noUpdatesSection.text()).toContain('No messages yet.')

    const renderedText = wrapper.text()
    expect(renderedText.indexOf('Daily Digest')).toBeLessThan(renderedText.indexOf('Today Briefing'))
    expect(renderedText.indexOf('Today Briefing')).toBeLessThan(renderedText.indexOf('Archive Notice'))
    expect(renderedText.indexOf('Archive Notice')).toBeLessThan(renderedText.indexOf('Dormant Service'))

    wrapper.unmount()
  })

  test('keeps folded services out of Messages while keeping them reachable from Services', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = createServiceSubscription(chatStore, {
      name: 'Hidden Digest',
      message: 'This should stay in Services.',
    })
    chatStore.setChatSubscriptionState(service.id, { subscriptionFolded: true })

    await router.push('/chat')
    await router.isReady()

    const chatWrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(chatWrapper.find(`[data-testid="chat-contact-avatar-${service.id}"]`).exists()).toBe(false)
    expect(chatWrapper.get('[data-testid="chat-folded-subscriptions-card"]').text()).toContain(
      'Folded Subscriptions',
    )
    expect(chatWrapper.get('[data-testid="chat-folded-subscriptions-card"]').text()).toContain('2 unread')
    expect(chatWrapper.get('[data-testid="chat-folded-subscriptions-unread-badge"]').text()).toBe('2')
    expect(chatWrapper.get('[data-testid="chat-folded-subscriptions-state"]').text()).toContain(
      '2 unread updates · 1 accounts',
    )

    await chatWrapper.get('[data-testid="chat-folded-subscriptions-card"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.query).toMatchObject({ section: 'service', filter: 'folded' })
    chatWrapper.unmount()

    await router.push('/chat-contacts?section=service&filter=folded')
    await flushUi()

    const directoryWrapper = mount(ChatDirectoryView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(directoryWrapper.get(`[data-testid="chat-directory-service-feed-${service.id}"]`).text()).toContain(
      'Hidden Digest',
    )
    expect(
      directoryWrapper.get(`[data-testid="chat-directory-service-delivery-state-${service.id}"]`).text(),
    ).toContain('Folded · unread in Services')

    directoryWrapper.unmount()
  })

  test('shows subscription controls inside a service thread', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = createServiceSubscription(chatStore, {
      name: 'Thread Digest',
      serviceTemplate: 'Thread-ready updates',
      message: 'Channel update in the thread.',
      shoppingServiceKey: 'daily_fresh',
    })

    await router.push(`/chat/${service.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(wrapper.get('[data-testid="chat-active-service-icon"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="chat-service-channel-card"]').text()).toContain('Thread-ready updates')
    expect(wrapper.get('[data-testid="chat-service-channel-name"]').text()).toContain('Thread Digest')
    expect(wrapper.get('[data-testid="chat-service-channel-card"]').text()).toContain(
      'Channel update in the thread.',
    )
    expect(wrapper.get('[data-testid="chat-service-channel-source-shopping"]').text()).toContain(
      'Shopping',
    )
    expect(wrapper.get('[data-testid="chat-service-channel-source-shopping"]').text()).toContain(
      'Daily Fresh',
    )
    expect(wrapper.get('[data-testid="chat-service-channel-source-plan"]').text()).toContain(
      'Shopping orders can push event-driven updates',
    )
    expect(wrapper.get('[data-testid="chat-service-channel-source-plan"]').attributes('data-source-plan-status')).toBe(
      'ready',
    )
    expect(wrapper.get('[data-testid="chat-service-channel-promise-reply"]').text()).toContain(
      'Reply in Chat',
    )
    expect(wrapper.get('[data-testid="chat-service-channel-promise-source"]').text()).toContain(
      'Source owns records',
    )
    expect(wrapper.get('[data-testid="chat-service-channel-promise-history"]').text()).toContain(
      'History kept',
    )
    expect(wrapper.get('[data-testid="chat-service-channel-placement"]').text()).toContain(
      'Visible in Messages',
    )

    await wrapper.get('[data-testid="chat-active-service-toggle-muted"]').trigger('click')
    await flushUi()

    expect(chatStore.isChatSubscriptionMuted(chatStore.getContactById(service.id))).toBe(true)
    expect(wrapper.get('[data-testid="chat-active-service-muted-tag"]').text()).toContain('Muted')
    expect(wrapper.get('[data-testid="chat-service-channel-placement"]').text()).toContain('Muted')

    await wrapper.get('[data-testid="chat-thread-menu-toggle"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="thread-service-subscription-panel"]').text()).toContain(
      'Subscription channel',
    )

    await wrapper.get('[data-testid="thread-service-toggle-folded"]').trigger('click')
    await flushUi()

    expect(chatStore.isChatSubscriptionFolded(chatStore.getContactById(service.id))).toBe(true)

    wrapper.unmount()
  })

  test('shows an empty service thread as a subscription home', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = chatStore.addContact({
      kind: 'service',
      name: 'Quiet Dispatch',
      serviceTemplate: 'Quiet notices',
      bio: 'This service waits for meaningful updates.',
    })
    chatStore.ensureConversationForContact(service.id)

    await router.push(`/chat/${service.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const emptyState = wrapper.get('[data-testid="chat-service-empty-state"]')
    expect(emptyState.text()).toContain('No updates yet')
    expect(emptyState.text()).toContain('Quiet Dispatch updates will appear here.')
    expect(wrapper.find('[data-testid="chat-service-date-divider"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="chat-service-notification-batch-summary"]').exists()).toBe(false)

    await wrapper.get('[data-testid="chat-service-empty-open-services"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/chat-contacts')
    expect(router.currentRoute.value.query).toMatchObject({ section: 'service' })

    wrapper.unmount()
  })

  test('opening an unread service thread confirms Chat-only read cleanup', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = chatStore.addContact({
      kind: 'service',
      name: 'Shop Updates',
      serviceTemplate: 'Order updates',
    })
    chatStore.appendServiceNotification(service.id, {
      kind: 'shopping_order',
      title: 'Order shipped',
      summary: 'Your parcel is on the way.',
      statusLabel: 'Shipped',
      sourceModule: 'shopping_store_pipeline',
      sourceId: 'order-read-100',
      serviceLabel: 'Daily Shop',
      route: '/shopping',
    })
    chatStore.incrementConversationUnread(service.id, 2)
    expect(chatStore.getConversationByContactId(service.id).unread).toBe(3)

    await router.push(`/chat/${service.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    expect(chatStore.getConversationByContactId(service.id).unread).toBe(0)
    const dock = wrapper.get('[data-testid="chat-service-interaction-dock"]')
    expect(dock.attributes('data-service-interaction-type')).toBe('read')
    expect(dock.text()).toContain('Chat unread cleared')
    expect(dock.text()).toContain('notification cards remain in this service thread')
    expect(dock.text()).toContain('source records are unchanged')
    expect(wrapper.get('[data-testid="chat-service-notification-shopping_store_pipeline-order-read-100"]').exists()).toBe(true)

    await wrapper.get('[data-testid="chat-service-interaction-dock-dismiss"]').trigger('click')
    await flushUi()

    expect(wrapper.find('[data-testid="chat-service-interaction-dock"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('renders service notification cards without backend source labels', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = chatStore.addContact({
      kind: 'service',
      name: 'Shop Updates',
      serviceTemplate: 'Order updates',
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

    const card = wrapper.get('[data-testid="chat-service-notification-shopping_store_pipeline-order-100"]')
    expect(card.attributes('data-service-tone')).toBe('shopping')
    expect(card.text()).toContain('Order update')
    expect(card.text()).toContain('Daily Shop')
    expect(card.text()).toContain('Order shipped')
    expect(card.text()).toContain('Order details open in Shopping; replies stay in Chat.')
    expect(card.get('[data-testid="chat-service-notification-source-actions"]').text()).toContain(
      'Order details',
    )
    expect(card.get('[data-testid="chat-service-notification-source-actions"]').text()).toContain(
      'Shopping owns order status',
    )
    expect(card.get('[data-testid="chat-service-notification-reply-actions"]').text()).toContain(
      'Chat reply',
    )
    expect(card.get('[data-testid="chat-service-notification-reply-actions"]').text()).toContain(
      'without changing source records',
    )
    expect(card.text()).toContain('Reply')
    expect(card.text()).not.toContain('shopping_store_pipeline')

    wrapper.unmount()
  })

  test('renders Chinese service notification labels without mojibake', async () => {
    useSystemStore().settings.system.language = 'zh-CN'
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = chatStore.addContact({
      kind: 'service',
      name: '店铺通知',
      serviceTemplate: '订单更新',
    })
    chatStore.appendServiceNotification(service.id, {
      kind: 'shopping_order',
      title: '订单已发货',
      summary: '包裹正在路上。',
      statusLabel: '已发货',
      sourceModule: 'shopping_store_pipeline',
      sourceId: 'order-zh-100',
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

    const card = wrapper.get('[data-testid="chat-service-notification-shopping_store_pipeline-order-zh-100"]')
    expect(card.text()).toContain('订单更新')
    expect(card.text()).not.toContain('璁')

    wrapper.unmount()
  })

  test('differentiates service notification cards by shopping logistics and food delivery source', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = chatStore.addContact({
      kind: 'service',
      name: 'Service Updates',
      serviceTemplate: 'Cross-source updates',
    })

    chatStore.appendServiceNotification(service.id, {
      kind: 'shopping_order',
      title: 'Payment confirmed',
      summary: 'The shop is preparing your order.',
      statusLabel: 'Paid',
      amount: '88.00 CNY',
      sourceModule: 'shopping_store_pipeline',
      sourceId: 'order-201',
      serviceLabel: 'Daily Shop',
      route: '/shopping',
    })
    chatStore.appendServiceNotification(service.id, {
      kind: 'logistics_update',
      title: 'Courier picked up',
      summary: 'Package left the warehouse.',
      statusLabel: 'Picked up',
      sourceModule: 'shopping_logistics_pipeline',
      sourceId: 'parcel-201',
      route: '/shopping',
    })
    chatStore.appendServiceNotification(service.id, {
      kind: 'food_delivery_update',
      title: 'Rider assigned',
      summary: 'Your meal is being prepared.',
      statusLabel: 'Preparing',
      sourceModule: 'food_delivery_order_pipeline',
      sourceId: 'meal-201',
      route: '/food-delivery',
    })

    await router.push(`/chat/${service.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const shoppingCard = wrapper.get('[data-testid="chat-service-notification-shopping_store_pipeline-order-201"]')
    expect(shoppingCard.attributes('data-service-tone')).toBe('shopping')
    expect(shoppingCard.text()).toContain('Order details')
    expect(shoppingCard.text()).toContain('View order')

    const logisticsCard = wrapper.get('[data-testid="chat-service-notification-shopping_logistics_pipeline-parcel-201"]')
    expect(logisticsCard.attributes('data-service-tone')).toBe('logistics')
    expect(logisticsCard.text()).toContain('Delivery tracking')
    expect(logisticsCard.text()).toContain('Tracking details')
    expect(logisticsCard.text()).toContain('View tracking')
    expect(logisticsCard.text()).toContain('tracking events')

    const foodCard = wrapper.get('[data-testid="chat-service-notification-food_delivery_order_pipeline-meal-201"]')
    expect(foodCard.attributes('data-service-tone')).toBe('food')
    expect(foodCard.text()).toContain('Food delivery')
    expect(foodCard.text()).toContain('Delivery details')
    expect(foodCard.text()).toContain('View delivery')
    expect(foodCard.text()).toContain('restaurant, menu, ETA')

    expect(wrapper.text()).not.toContain('shopping_logistics_pipeline')
    expect(wrapper.text()).not.toContain('food_delivery_order_pipeline')

    wrapper.unmount()
  })

  test('keeps a Chat-side source-open reminder when returning from service notification details', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = chatStore.addContact({
      kind: 'service',
      name: 'Shop Updates',
      serviceTemplate: 'Order updates',
    })
    chatStore.appendServiceNotification(service.id, {
      kind: 'shopping_order',
      title: 'Order shipped',
      summary: 'Your parcel is on the way.',
      statusLabel: 'Shipped',
      sourceModule: 'shopping_store_pipeline',
      sourceId: 'order-100',
      serviceLabel: 'Daily Shop',
      route: '/shopping?service=daily_shop&orderId=order-100',
    })

    await router.push(`/chat/${service.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    await wrapper.get('[data-testid="chat-service-notification-open-order-100"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query).toMatchObject({
      service: 'daily_shop',
      orderId: 'order-100',
    })

    await router.push(`/chat/${service.id}`)
    await flushUi()

    const reminder = wrapper.get('[data-testid="chat-service-route-feedback"]')
    expect(reminder.text()).toContain('Source opened')
    expect(reminder.text()).toContain('Shopping')
    expect(reminder.text()).toContain('Order shipped')
    expect(reminder.text()).toContain('you can keep replying around this notification in Chat')
    expect(reminder.text()).toContain('Chat did not change source records')
    const dock = wrapper.get('[data-testid="chat-service-interaction-dock"]')
    expect(dock.attributes('data-service-interaction-type')).toBe('source')
    expect(dock.text()).toContain('Source opened')
    expect(dock.text()).toContain('Order shipped')
    expect(dock.text()).toContain('Open again')
    expect(chatStore.getMessagesByContactId(service.id)).toHaveLength(1)

    await wrapper.get('[data-testid="chat-service-interaction-dock-primary"]').trigger('click')
    await flushUi()

    expect(router.currentRoute.value.path).toBe('/shopping')
    expect(router.currentRoute.value.query).toMatchObject({
      service: 'daily_shop',
      orderId: 'order-100',
    })

    await router.push(`/chat/${service.id}`)
    await flushUi()

    await wrapper.get('[data-testid="chat-service-interaction-dock-dismiss"]').trigger('click')
    await flushUi()

    expect(wrapper.find('[data-testid="chat-service-route-feedback"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="chat-service-interaction-dock"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('adds date dividers, a digest, and compact follow-up notifications while keeping them replyable', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = chatStore.addContact({
      kind: 'service',
      name: 'Shop Updates',
      serviceTemplate: 'Order updates',
    })
    const now = Date.now()
    const earlierAt = now - 2 * 24 * 60 * 60 * 1000
    chatStore.appendServiceNotification(service.id, {
      kind: 'shopping_order',
      title: 'Order created',
      summary: 'The shop accepted your order.',
      statusLabel: 'Created',
      sourceModule: 'shopping_store_pipeline',
      sourceId: 'order-099',
      serviceLabel: 'Daily Shop',
      route: '/shopping',
      createdAt: earlierAt,
    })
    const packedMessage = chatStore.appendServiceNotification(service.id, {
      kind: 'shopping_order',
      title: 'Order packed',
      summary: 'The shop packed your parcel.',
      statusLabel: 'Packed',
      sourceModule: 'shopping_store_pipeline',
      sourceId: 'order-100',
      serviceLabel: 'Daily Shop',
      route: '/shopping',
      createdAt: now - 2000,
    })
    const shippedMessage = chatStore.appendServiceNotification(service.id, {
      kind: 'shopping_order',
      title: 'Order shipped',
      summary: 'Your parcel is on the way.',
      statusLabel: 'Shipped',
      sourceModule: 'shopping_store_pipeline',
      sourceId: 'order-101',
      serviceLabel: 'Daily Shop',
      route: '/shopping',
      createdAt: now - 1000,
    })

    await router.push(`/chat/${service.id}`)
    await router.isReady()

    const wrapper = mount(ChatView, {
      global: {
        plugins: [router],
      },
    })
    await flushUi()

    const dividers = wrapper.findAll('[data-testid="chat-service-date-divider"]')
    expect(dividers.length).toBeGreaterThanOrEqual(2)
    expect(wrapper.text()).toContain('Today')

    const digest = wrapper.get('[data-testid="chat-service-notification-batch-summary"]')
    expect(digest.text()).toContain('2 consecutive updates')
    expect(digest.text()).toContain('Order packed')
    expect(digest.text()).toContain('Order shipped')

    expect(wrapper.get('[data-testid="chat-service-notification-shopping_store_pipeline-order-099"]').exists()).toBe(true)
    const firstTodayCard = wrapper.get('[data-testid="chat-service-notification-shopping_store_pipeline-order-100"]')
    const followUpCard = wrapper.get('[data-testid="chat-service-notification-shopping_store_pipeline-order-101"]')
    expect(firstTodayCard.attributes('data-service-density')).toBe('full')
    expect(followUpCard.attributes('data-service-density')).toBe('compact')
    const firstTodayRow = wrapper.get(`[data-testid="chat-message-row-${packedMessage.id}"]`)
    const followUpRow = wrapper.get(`[data-testid="chat-message-row-${shippedMessage.id}"]`)
    expect(firstTodayRow.find('[data-testid="chat-message-avatar-contact"]').exists()).toBe(true)
    expect(firstTodayRow.find('[data-testid="chat-message-sender-name"]').exists()).toBe(true)
    expect(followUpRow.classes()).toContain('is-compact-service-notification')
    expect(followUpRow.find('[data-testid="chat-message-avatar-contact"]').exists()).toBe(false)
    expect(followUpRow.find('[data-testid="chat-message-sender-name"]').exists()).toBe(false)
    expect(followUpCard.get('[data-testid="chat-service-notification-compact-actions"]').text()).toContain(
      'View order',
    )
    expect(followUpCard.get('[data-testid="chat-service-notification-compact-actions"]').text()).toContain(
      'Reply',
    )

    await wrapper.get('[data-testid="chat-service-notification-reply-order-101"]').trigger('click')
    await flushUi()

    expect(wrapper.text()).toContain('Replying to notification')
    expect(wrapper.text()).toContain('Order shipped')

    wrapper.unmount()
  })

  test('lets users reply to a service notification like a normal chat message', async () => {
    const router = createTestRouter()
    const chatStore = useChatStore()
    const service = chatStore.addContact({
      kind: 'service',
      name: 'Shop Updates',
      serviceTemplate: 'Order updates',
    })
    chatStore.appendServiceNotification(service.id, {
      kind: 'shopping_order',
      title: 'Order shipped',
      summary: 'Your parcel is on the way.',
      statusLabel: 'Shipped',
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

    expect(wrapper.get('[data-testid="chat-active-service-replyable-tag"]').text()).toContain('Replyable')
    expect(wrapper.get('[data-testid="chat-message-input"]').attributes('placeholder')).toContain(
      'Reply to Shop Updates',
    )

    await wrapper.get('[data-testid="chat-service-notification-reply-order-100"]').trigger('click')
    await flushUi()

    const replyDock = wrapper.get('[data-testid="chat-service-interaction-dock"]')
    expect(replyDock.attributes('data-service-interaction-type')).toBe('reply')
    expect(replyDock.text()).toContain('Reply context ready')
    expect(wrapper.get('[data-testid="chat-service-action-feedback"]').text()).toContain(
      'Reply context ready',
    )
    expect(wrapper.get('[data-testid="chat-service-action-feedback"]').text()).toContain(
      'does not change source records',
    )
    expect(wrapper.get('[data-testid="chat-pending-quote-bar"]').text()).toContain('Order shipped')
    expect(wrapper.text()).toContain('Replying to notification')
    expect(wrapper.text()).toContain('Order shipped')

    await wrapper.get('[data-testid="chat-message-input"]').setValue('Can I change the address?')
    await wrapper.get('[data-testid="chat-message-input"]').trigger('keyup.enter')
    await flushUi()

    const sent = chatStore
      .getMessagesByContactId(service.id)
      .find((message) => message.role === 'user' && message.content === 'Can I change the address?')

    expect(sent).toBeTruthy()
    expect(sent.quote.preview).toContain('Order shipped')
    expect(sent.quote.sourceType).toBe('service_notification')
    expect(wrapper.text()).toContain('Can I change the address?')
    expect(wrapper.text()).toContain('Quoted notification')
    expect(wrapper.get('[data-testid="chat-service-interaction-dock"]').attributes('data-service-interaction-type')).toBe(
      'sent',
    )
    expect(wrapper.get('[data-testid="chat-service-interaction-dock"]').text()).toContain('Reply sent in Chat')
    expect(wrapper.get('[data-testid="chat-service-interaction-dock"]').text()).toContain(
      'did not change source order',
    )

    wrapper.unmount()
  })
})
