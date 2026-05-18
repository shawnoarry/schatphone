import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ContactsView from '../src/views/ContactsView.vue'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import { useChatStore } from '../src/stores/chat'
import { useCalendarStore } from '../src/stores/calendar'
import { useMapStore } from '../src/stores/map'
import { useFoodDeliveryStore } from '../src/stores/foodDelivery'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', component: ContactsView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountContactsView = async () => {
  const router = createTestRouter()
  await router.push('/contacts')
  await router.isReady()
  const wrapper = mount(ContactsView, {
    global: {
      plugins: [router],
    },
  })
  await flushUi()
  return wrapper
}

const selectProfile = async (wrapper, profile) => {
  await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
  await flushUi()
}

const createRoleWithBinding = (chatStore, payload = {}) => {
  const profile = chatStore.addRoleProfile({
    roleId: payload.roleId || '950A',
    name: payload.name || 'Flow Role',
    role: payload.role || 'Archivist',
    detailItems: payload.detailItems || [],
  })
  const binding = chatStore.bindRoleProfile(profile.id)
  return { profile, binding }
}

describe('ContactsView relationship danger flows', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T08:00:00.000Z'))
    resetDialogServiceForTest()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
    useRelationshipRuntimeStore().resetForTesting()
  })

  test('opens memory detail before deleting a memory group and keeps free chat text', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { profile, binding } = createRoleWithBinding(chatStore, {
      roleId: '951A',
      name: 'Memory Flow',
      detailItems: [
        {
          section: 'preferences',
          sourceKind: 'manual',
          title: 'Manual survives',
          detail: 'Keep this.',
        },
        {
          section: 'lifePattern',
          sourceKind: 'event_attached',
          title: 'Shared ticket',
          detail: 'Delete with memory.',
          memoryKey: 'one_memory',
          sourceModule: 'relationship_wallet_shared_transfer',
          sourceId: 'wallet_memory_1',
        },
      ],
    })
    chatStore.appendMessage(binding.id, {
      role: 'user',
      content: 'This ordinary chat text survives memory deletion.',
      status: 'delivered',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_wallet_shared_transfer',
      sourceId: 'wallet_memory_1:shared_transfer:role_951',
      memoryKey: 'one_memory',
      factType: 'shared_transfer',
      summary: 'Paid for tickets together.',
      metricDeltas: {
        trust: 5,
      },
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'phone_memory_2',
      memoryKey: 'keep_memory',
      factType: 'phone_call',
      summary: 'Follow-up call remained.',
      metricDeltas: {
        affinity: 3,
      },
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)
    await wrapper.get('[data-testid="contacts-memory-open-one_memory"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-memory-detail"]').text()).toContain('Paid for tickets together.')
    expect(wrapper.get('[data-testid="contacts-memory-detail"]').text()).toContain('Normal free-form chat messages')

    const { dialogState, submitDialog } = useDialog()
    await wrapper.get('[data-testid="contacts-memory-delete-one_memory"]').trigger('click')
    await flushUi()
    expect(dialogState.title).toBe('Delete memory group')
    submitDialog()
    await flushUi()
    expect(dialogState.title).toBe('Confirm memory deletion')
    submitDialog()
    await flushUi()

    const remainingMemories = relationshipRuntimeStore.listMemoryGroupsForTarget({ profileId: profile.id })
    expect(remainingMemories.map((item) => item.memoryKey)).toEqual(['keep_memory'])
    expect(chatStore.getMessagesByContactId(binding.id).at(-1)?.content).toContain('ordinary chat text')
    expect(chatStore.listRoleDetailItems(profile.id).map((item) => item.sourceKind)).toEqual(['manual'])

    wrapper.unmount()
  })

  test('requires irreversible, scope, and typed-id confirmations before deleting a role', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { profile, binding } = createRoleWithBinding(chatStore, {
      roleId: '952A',
      name: 'Delete Flow',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'phone_delete_flow',
      memoryKey: 'delete_flow_memory',
      factType: 'phone_call',
      summary: 'Deletion scope memory.',
      metricDeltas: {
        trust: 4,
      },
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)

    const { dialogState, submitDialog, setDialogInputValue } = useDialog()
    await wrapper.get('[data-testid="contacts-delete-role"]').trigger('click')
    await flushUi()
    expect(dialogState.title).toBe('Delete role profile')
    submitDialog()
    await flushUi()
    expect(dialogState.title).toBe('Confirm delete scope')
    expect(dialogState.details.join(' ')).toContain('Chat Directory')
    submitDialog()
    await flushUi()
    expect(dialogState.title).toBe('Confirm role deletion')
    setDialogInputValue('wrong-id')
    submitDialog()
    expect(dialogState.visible).toBe(true)
    setDialogInputValue('952A')
    submitDialog()
    await flushUi()

    expect(chatStore.getRoleProfileById(profile.id)).toBe(null)
    expect(chatStore.contacts.some((item) => item.id === binding.id)).toBe(false)
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: profile.id }).exists).toBe(false)

    wrapper.unmount()
  })

  test('resets relationship state through confirmation while keeping manual profile details', async () => {
    const chatStore = useChatStore()
    const calendarStore = useCalendarStore()
    const mapStore = useMapStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { profile, binding } = createRoleWithBinding(chatStore, {
      roleId: '953A',
      name: 'HJ',
      detailItems: [
        {
          section: 'preferences',
          sourceKind: 'manual',
          title: 'Manual note',
          detail: 'Keep this.',
        },
        {
          section: 'lifePattern',
          sourceKind: 'event_attached',
          title: 'Event note',
          detail: 'Clear this.',
          memoryKey: 'reset_flow_memory',
        },
      ],
    })
    chatStore.appendMessage(binding.id, {
      role: 'assistant',
      content: 'Relationship chat history to clear.',
      status: 'sent',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_phone_call',
      sourceId: 'phone_reset_flow',
      memoryKey: 'reset_flow_memory',
      factType: 'phone_call',
      summary: 'Reset scope memory.',
      metricDeltas: {
        affinity: 6,
      },
    })
    calendarStore.upsertEvent({
      id: 'calendar_reset_flow_1',
      titleZh: '和 HJ 的晚餐',
      titleEn: 'Dinner with HJ',
      summaryEn: 'Shared dinner with HJ.',
      status: 'confirmed',
      startsAt: Date.now() + 60_000,
      relationshipBinding: {
        profileId: profile.id,
        contactId: binding.id,
        kind: 'role',
        name: profile.name,
        sourceModule: 'chat',
        sourceId: String(binding.id),
      },
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'calendar_reset_flow_1:calendar_event:role_953',
      memoryKey: 'reset_flow_memory',
      factType: 'scheduled_calendar_event',
      summary: 'Dinner plan with HJ.',
      metricDeltas: {
        affinity: 2,
      },
    })
    mapStore.restoreFromBackup({
      map: {
        tripHistory: [
          {
            id: 'trip_reset_flow_1',
            status: 'arrived',
            from: 'Home',
            to: 'Cafe',
            fromLabel: 'Home',
            toLabel: 'Cafe',
            distanceKm: 3,
            fare: 1200,
            durationSeconds: 900,
            startedAt: Date.now() - 600_000,
            endedAt: Date.now() - 300_000,
            rewardPoints: 12,
            eventSummaryEn: 'Shared route with HJ to Cafe.',
            relationshipBinding: {
              profileId: profile.id,
              contactId: binding.id,
              kind: 'role',
              name: profile.name,
              sourceModule: 'chat',
              sourceId: String(binding.id),
            },
          },
        ],
      },
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_map_shared_route',
      sourceId: 'trip_reset_flow_1:shared_route:role_953',
      memoryKey: 'reset_flow_memory',
      factType: 'shared_route',
      summary: 'Shared route with HJ.',
      metricDeltas: {
        affinity: 2,
      },
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)

    const { dialogState, submitDialog, setDialogInputValue } = useDialog()
    await wrapper.get('[data-testid="contacts-reset-relationship"]').trigger('click')
    await flushUi()
    expect(dialogState.title).toBe('Reset relationship progress')
    submitDialog()
    await flushUi()
    expect(dialogState.title).toBe('Confirm relationship reset')
    setDialogInputValue('953A')
    submitDialog()
    await flushUi()

    expect(chatStore.getRoleProfileById(profile.id)).toBeTruthy()
    expect(chatStore.contacts.some((item) => item.id === binding.id)).toBe(true)
    expect(chatStore.getMessagesByContactId(binding.id)).toEqual([])
    expect(chatStore.listRoleDetailItems(profile.id)).toEqual([
      expect.objectContaining({
        sourceKind: 'manual',
        title: 'Manual note',
      }),
    ])
    expect(calendarStore.findEventById('calendar_reset_flow_1')).toMatchObject({
      relationshipBinding: expect.objectContaining({
        profileId: 0,
        contactId: 0,
      }),
    })
    expect(calendarStore.findEventById('calendar_reset_flow_1')?.titleEn).not.toContain('HJ')
    expect(mapStore.tripHistory[0]?.relationshipBinding).toMatchObject({
      profileId: 0,
      contactId: 0,
    })
    expect(mapStore.tripHistory[0]?.eventSummaryEn).not.toContain('HJ')
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: profile.id }).exists).toBe(false)

    wrapper.unmount()
  })

  test('deleting a role with linked-record cleanup removes bound single-owner module records', async () => {
    const chatStore = useChatStore()
    const calendarStore = useCalendarStore()
    const foodDeliveryStore = useFoodDeliveryStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { profile, binding } = createRoleWithBinding(chatStore, {
      roleId: '954A',
      name: 'Delete Linked',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'calendar_delete_flow_1:calendar_event:role_954',
      memoryKey: 'delete_linked_memory',
      factType: 'scheduled_calendar_event',
      summary: 'Calendar delete flow memory.',
      metricDeltas: {
        affinity: 4,
      },
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_food_delivery_shared_meal',
      sourceId: 'food_delete_flow_1:shared_meal:role_954',
      memoryKey: 'delete_linked_memory',
      factType: 'shared_meal',
      summary: 'Food delete flow memory.',
      metricDeltas: {
        affinity: 4,
      },
    })
    calendarStore.upsertEvent({
      id: 'calendar_delete_flow_1',
      titleZh: '删除 HJ 日程',
      titleEn: 'Delete HJ schedule',
      status: 'confirmed',
      startsAt: Date.now() + 60_000,
      relationshipBinding: {
        profileId: profile.id,
        contactId: binding.id,
        kind: 'role',
        name: profile.name,
        sourceModule: 'chat',
        sourceId: String(binding.id),
      },
    })
    foodDeliveryStore.restoreFromBackup({
      foodDelivery: {
        restaurants: [],
        menuItems: [],
        cartItems: [],
        orders: [
          {
            id: 'food_delete_flow_1',
            status: 'delivered',
            restaurantId: 'rest_1',
            restaurantName: 'Delete Kitchen',
            items: [
              {
                id: 'line_1',
                menuItemId: 'm1',
                title: 'Meal',
                category: 'restaurants',
                quantity: 1,
                unitPriceCents: 3000,
                currency: 'CNY',
              },
            ],
            relationshipBinding: {
              profileId: profile.id,
              contactId: binding.id,
              kind: 'role',
              name: profile.name,
              sourceModule: 'chat',
              sourceId: String(binding.id),
            },
          },
        ],
      },
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)
    await wrapper.get('[data-testid="contacts-danger-include-linked-records"]').setValue(true)
    await flushUi()

    const { dialogState, submitDialog, setDialogInputValue } = useDialog()
    await wrapper.get('[data-testid="contacts-delete-role"]').trigger('click')
    await flushUi()
    expect(dialogState.title).toBe('Delete role profile')
    submitDialog()
    await flushUi()
    expect(dialogState.title).toBe('Confirm delete scope')
    submitDialog()
    await flushUi()
    expect(dialogState.title).toBe('Confirm role deletion')
    setDialogInputValue('954A')
    submitDialog()
    await flushUi()

    expect(calendarStore.findEventById('calendar_delete_flow_1')).toBeNull()
    expect(foodDeliveryStore.findOrderById('food_delete_flow_1')).toBeNull()
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: profile.id }).exists).toBe(false)

    wrapper.unmount()
  })
})
