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

    expect(wrapper.get('[data-testid="contacts-detail-counts-preferences"]').text()).toContain('Manual 1')
    expect(wrapper.get('[data-testid="contacts-detail-counts-preferences"]').text()).toContain('Event 0')
    expect(wrapper.get('[data-testid="contacts-detail-counts-lifePattern"]').text()).toContain('Manual 0')
    expect(wrapper.get('[data-testid="contacts-detail-counts-lifePattern"]').text()).toContain('Event 1')
    expect(wrapper.get('[data-testid="contacts-role-detail"]').text()).toContain(
      'This entry cannot be deleted here directly.',
    )
    expect(wrapper.get('[data-testid="contacts-role-detail"]').text()).toContain(
      'Attached by relationship events',
    )
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

  test('groups manual and event-attached detail items and opens the linked memory from an event item', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { profile } = createRoleWithBinding(chatStore, {
      roleId: '951B',
      name: 'Grouped Detail',
      detailItems: [
        {
          section: 'preferences',
          sourceKind: 'manual',
          title: 'Manual cafe note',
          detail: 'Keep as user-authored profile detail.',
        },
        {
          section: 'preferences',
          sourceKind: 'event_attached',
          title: 'Shared route preference',
          detail: 'Attached from a route event.',
          memoryKey: 'grouped_memory',
          sourceModule: 'relationship_map_shared_route',
          sourceId: 'route_grouped_1',
        },
      ],
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_map_shared_route',
      sourceId: 'route_grouped_1:shared_route:role_951B',
      memoryKey: 'grouped_memory',
      factType: 'shared_route',
      summary: 'Walked the same route together.',
      metricDeltas: {
        affinity: 3,
      },
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)

    const preferences = wrapper.get('[data-testid="contacts-detail-section-preferences"]')
    expect(preferences.get('[data-testid="contacts-detail-group-preferences-manual"]').text()).toContain(
      'Manual details',
    )
    expect(preferences.get('[data-testid="contacts-detail-group-preferences-event_attached"]').text()).toContain(
      'Event-attached',
    )
    expect(preferences.text()).toContain('Manual cafe note')
    expect(preferences.text()).toContain('Shared route preference')

    await preferences.get('[data-testid="contacts-detail-open-memory-grouped_memory"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-memory-detail"]').text()).toContain(
      'Walked the same route together.',
    )

    wrapper.unmount()
  })

  test('shows memory source audit cards and supporting events for the selected memory', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { profile } = createRoleWithBinding(chatStore, {
      roleId: '951C',
      name: 'Memory Audit',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'calendar_audit_1:calendar_event:role_951C',
      memoryKey: 'audit_memory',
      factType: 'scheduled_calendar_event',
      summary: 'Locked in dinner plans.',
      metricDeltas: {
        trust: 3,
      },
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_map_shared_route',
      sourceId: 'trip_audit_2:shared_route:role_951C',
      memoryKey: 'audit_memory',
      factType: 'shared_route',
      summary: 'Took the same route home.',
      metricDeltas: {
        affinity: 2,
      },
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)
    await wrapper.get('[data-testid="contacts-memory-open-audit_memory"]').trigger('click')
    await flushUi()

    const detail = wrapper.get('[data-testid="contacts-memory-detail"]')
    expect(detail.text()).toContain('Locked in dinner plans.')
    expect(detail.get('[data-testid="contacts-memory-source-audit"]').text()).toContain(
      'Calendar event',
    )
    expect(detail.get('[data-testid="contacts-memory-source-audit"]').text()).toContain(
      'Map route',
    )
    expect(detail.get('[data-testid="contacts-memory-source-relationship_calendar_confirmed_event"]').text()).toContain(
      'calendar_audit_1',
    )
    expect(detail.get('[data-testid="contacts-memory-source-relationship_map_shared_route"]').text()).toContain(
      'trip_audit_2',
    )
    expect(detail.get('[data-testid="contacts-memory-event-list"]').text()).toContain(
      'Supporting events',
    )
    expect(detail.get('[data-testid="contacts-memory-event-list"]').text()).toContain(
      'Took the same route home.',
    )
    expect(detail.get('[data-testid="contacts-memory-event-list"]').text()).toContain(
      'Map route',
    )

    wrapper.unmount()
  })

  test('edits manual detail items inline and expands linked activity entries', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { profile } = createRoleWithBinding(chatStore, {
      roleId: '951D',
      name: 'Inline Editor',
      detailItems: [
        {
          section: 'preferences',
          sourceKind: 'manual',
          title: 'Tea',
          detail: 'Likes jasmine tea.',
        },
        {
          section: 'lifePattern',
          sourceKind: 'event_attached',
          title: 'Shared dinner',
          detail: 'Attached from calendar.',
          memoryKey: 'inline_memory',
          sourceModule: 'relationship_calendar_confirmed_event',
          sourceId: 'calendar_inline_1',
        },
      ],
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'calendar_inline_1:calendar_event:role_951D',
      memoryKey: 'inline_memory',
      factType: 'scheduled_calendar_event',
      summary: 'Dinner plan locked in.',
      metricDeltas: {
        trust: 2,
      },
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)

    const manualItem = chatStore.listRoleDetailItems(profile.id, 'preferences')[0]
    await wrapper.get(`[data-testid="contacts-detail-edit-open-${manualItem.id}"]`).trigger('click')
    await flushUi()

    const editBox = wrapper.get(`[data-testid="contacts-detail-edit-${manualItem.id}"]`)
    await editBox.get('input').setValue('Coffee')
    await editBox.get('textarea').setValue('Prefers pour-over coffee.')
    await wrapper.get(`[data-testid="contacts-detail-edit-save-${manualItem.id}"]`).trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-detail-section-preferences"]').text()).toContain('Coffee')
    expect(wrapper.get('[data-testid="contacts-detail-section-preferences"]').text()).toContain(
      'Prefers pour-over coffee.',
    )

    const linkedActivity = wrapper.get('[data-testid="contacts-linked-activity-list"]')
    expect(linkedActivity.text()).toContain('Life Pattern')
    expect(linkedActivity.text()).toContain('Calendar event')
    expect(linkedActivity.text()).toContain('Dinner plan locked in.')

    await wrapper.get('[data-testid="contacts-linked-activity-open-memory-inline_memory"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-memory-detail"]').text()).toContain('Dinner plan locked in.')

    wrapper.unmount()
  })

  test('filters memories by source and shows headline review facts', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { profile } = createRoleWithBinding(chatStore, {
      roleId: '951E',
      name: 'Memory Review',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'calendar_filter_1:calendar_event:role_951E',
      memoryKey: 'calendar_memory',
      factType: 'scheduled_calendar_event',
      summary: 'Calendar memory summary.',
      metricDeltas: {
        trust: 2,
      },
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_map_shared_route',
      sourceId: 'map_filter_1:shared_route:role_951E',
      memoryKey: 'map_memory',
      factType: 'shared_route',
      summary: 'Map memory summary.',
      metricDeltas: {
        affinity: 2,
      },
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)

    const toolbar = wrapper.get('[data-testid="contacts-memory-toolbar"]')
    expect(toolbar.text()).toContain('All sources')
    await toolbar.get('select').setValue('relationship_calendar_confirmed_event')
    await flushUi()

    expect(wrapper.find('[data-testid="contacts-memory-open-calendar_memory"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="contacts-memory-open-map_memory"]').exists()).toBe(false)

    await wrapper.get('[data-testid="contacts-memory-open-calendar_memory"]').trigger('click')
    await flushUi()

    const facts = wrapper.get('[data-testid="contacts-memory-headline-facts"]').text()
    expect(facts).toContain('Source modules')
    expect(facts).toContain('Supporting events')
    expect(facts).toContain('Latest update')

    wrapper.unmount()
  })

  test('updates memory lifecycle state and review note from Contacts detail', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const { profile } = createRoleWithBinding(chatStore, {
      roleId: '951F',
      name: 'Lifecycle Memory',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'calendar_lifecycle_1:calendar_event:role_951F',
      memoryKey: 'lifecycle_memory',
      factType: 'scheduled_calendar_event',
      summary: 'Lifecycle memory summary.',
      metricDeltas: {
        trust: 2,
      },
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_map_shared_route',
      sourceId: 'map_lifecycle_1:shared_route:role_951F',
      memoryKey: 'other_memory',
      factType: 'shared_route',
      summary: 'Other memory summary.',
      metricDeltas: {
        affinity: 2,
      },
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)
    await wrapper.get('[data-testid="contacts-memory-open-lifecycle_memory"]').trigger('click')
    await flushUi()

    const controls = wrapper.get('[data-testid="contacts-memory-review-controls"]')
    await controls.findAll('button')[0].trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="contacts-memory-open-lifecycle_memory"]').text()).toContain('Pinned')

    const reviewNote = wrapper.get('[data-testid="contacts-memory-review-note"]')
    await reviewNote.get('textarea').setValue('Keep this visible until 4.2 dedupe is done.')
    await wrapper.get('[data-testid="contacts-memory-review-save"]').trigger('click')
    await flushUi()

    const detail = relationshipRuntimeStore.getMemoryGroupDetail({ profileId: profile.id }, 'lifecycle_memory')
    expect(detail).toMatchObject({
      reviewStatus: 'pinned',
      reviewNote: 'Keep this visible until 4.2 dedupe is done.',
    })

    await controls.findAll('button')[2].trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="contacts-memory-open-other_memory"]').text()).toContain('Active')

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
