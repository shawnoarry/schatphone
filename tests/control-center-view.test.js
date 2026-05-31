import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ControlCenterView from '../src/views/ControlCenterView.vue'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import {
  SIMULATION_EVENT_STATUS,
  SIMULATION_SURPRISE_MODE,
  SIMULATION_TRIGGER_SOURCE,
  useSimulationStore,
} from '../src/stores/simulation'
import { useChatStore } from '../src/stores/chat'
import {
  RELATIONSHIP_MEMORY_REVIEW_STATES,
  useRelationshipRuntimeStore,
} from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'
import { useWalletStore } from '../src/stores/wallet'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/control-center', component: ControlCenterView },
      { path: '/home', component: DummyView },
      { path: '/app-store', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountControlCenterView = async () => {
  const router = createTestRouter()
  await router.push('/control-center')
  await router.isReady()

  const wrapper = mount(ControlCenterView, {
    global: {
      plugins: [router],
    },
  })
  await flushUi()
  return { wrapper, router }
}

describe('ControlCenterView', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T08:00:00.000Z'))
    resetDialogServiceForTest()
    setActivePinia(createPinia())
  })

  test('renders simulation runtime state as a read-only World Hub panel', async () => {
    const systemStore = useSystemStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setMoreFeatureToggle('control_center', true)
    relationshipRuntimeStore.resetForTesting()
    simulationStore.resetForTesting()
    simulationStore.setSurpriseMode(SIMULATION_SURPRISE_MODE.BALANCED)
    simulationStore.setModuleEventsEnabled('shopping', false)
    simulationStore.recordEventLog({
      eventId: 'food_delivery.rider_delay.v1',
      moduleKey: 'food_delivery',
      targetId: 'order-1',
      adapterKey: 'food_delivery.add_order_event',
      triggerSource: SIMULATION_TRIGGER_SOURCE.RANDOM,
      status: SIMULATION_EVENT_STATUS.TRIGGERED,
      reason: 'eligible_random_passed',
      variantId: 'food_delivery.rider_delay.sci_fi.corridor_queue.v1',
      variantPackId: 'variant_pack_sci_fi',
      worldContextId: 'world_context_sci_fi',
      activeWorldBookIds: ['wb_sci_fi'],
      at: Date.now(),
    })
    simulationStore.recordEventLog({
      eventId: 'simulation.session_tick.v1',
      moduleKey: 'simulation',
      targetId: 'global',
      adapterKey: 'simulation.event_tick_runner',
      triggerSource: SIMULATION_TRIGGER_SOURCE.SCHEDULED,
      status: SIMULATION_EVENT_STATUS.SKIPPED,
      reason: 'tick_cooldown_active',
      at: Date.now() - 1000,
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: 1,
        contactId: 1,
        name: 'Eva',
        kind: 'role',
      },
      sourceModule: 'relationship_shopping_gift',
      sourceId: 'shopping_order_1:gift',
      factType: 'gift_purchased',
      summary: 'Gift purchased for Eva: Moon Lamp (68.00 CNY).',
      intensity: 2,
      metricDeltas: {
        affinity: 8,
        trust: 3,
        intimacy: 4,
      },
      milestone: 'Gift purchase recorded',
    })

    const eventLogCountBeforeMount = simulationStore.eventLogCount
    const relationshipEventCountBeforeMount = relationshipRuntimeStore.events.length
    const { wrapper } = await mountControlCenterView()

    expect(wrapper.get('[data-testid="control-center-runtime-panel"]').text()).toContain('Read-only')
    expect(wrapper.get('[data-testid="control-center-stat-surprise-mode"]').text()).toContain('Balanced')
    expect(wrapper.get('[data-testid="control-center-stat-event-logs"]').text()).toContain('2')
    expect(wrapper.get('[data-testid="control-center-module-status"]').text()).toContain('Food Delivery')
    expect(wrapper.get('[data-testid="control-center-module-status"]').text()).toContain('Shopping / Logistics')
    expect(wrapper.get('[data-testid="control-center-module-status"]').text()).toContain('Off')
    expect(wrapper.get('[data-testid="control-center-world-panel"]').text()).toContain('world_context_sci_fi')
    expect(wrapper.get('[data-testid="control-center-event-log-panel"]').text()).toContain('Food Delivery rider delay')
    expect(wrapper.get('[data-testid="control-center-event-log-panel"]').text()).toContain('Random gate passed')
    expect(wrapper.findAll('[data-testid="control-center-event-log-item"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="control-center-relationship-panel"]').text()).toContain('Relationship Runtime')
    expect(wrapper.get('[data-testid="control-center-relationship-stat-entities"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="control-center-relationship-stat-events"]').text()).toContain('1')
    expect(wrapper.get('[data-testid="control-center-relationship-panel"]').text()).toContain('Eva')
    expect(wrapper.get('[data-testid="control-center-relationship-panel"]').text()).toContain('Gift purchased')
    expect(wrapper.get('[data-testid="control-center-relationship-panel"]').text()).toContain('Applied')
    expect(wrapper.findAll('[data-testid="control-center-relationship-event"]')).toHaveLength(1)
    expect(simulationStore.eventLogCount).toBe(eventLogCountBeforeMount)
    expect(relationshipRuntimeStore.events).toHaveLength(relationshipEventCountBeforeMount)

    wrapper.unmount()
  })

  test('shows the disabled entry explanation without requiring runtime logs', async () => {
    const systemStore = useSystemStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setMoreFeatureToggle('control_center', false)
    relationshipRuntimeStore.resetForTesting()
    simulationStore.resetForTesting()

    const { wrapper } = await mountControlCenterView()

    expect(wrapper.get('[data-testid="control-center-status"]').text()).toContain('Hidden from Home')
    expect(wrapper.get('[data-testid="control-center-event-log-panel"]').text()).toContain('No event logs yet')
    expect(wrapper.get('[data-testid="control-center-relationship-panel"]').text()).toContain('No relationship facts yet')
    expect(wrapper.get('[data-testid="control-center-runtime-panel"]').text()).toContain(
      'does not trigger events or mutate module data',
    )

    wrapper.unmount()
  })

  test('filters event logs and shows review detail without retriggering events', async () => {
    const systemStore = useSystemStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setMoreFeatureToggle('control_center', true)
    relationshipRuntimeStore.resetForTesting()
    simulationStore.resetForTesting()

    simulationStore.recordEventLog({
      eventId: 'food_delivery.rider_delay.v1',
      moduleKey: 'food_delivery',
      targetId: 'order-review-1',
      adapterKey: 'food_delivery.add_order_event',
      triggerSource: SIMULATION_TRIGGER_SOURCE.RANDOM,
      status: SIMULATION_EVENT_STATUS.TRIGGERED,
      reason: 'eligible_random_passed',
      variantId: 'variant_rider_delay_review',
      worldContextId: 'world_review',
      at: Date.now(),
    })
    simulationStore.recordEventLog({
      eventId: 'shopping.logistics.package_arrived.v1',
      moduleKey: 'shopping',
      targetId: 'shopping-order-review-2',
      adapterKey: 'shopping.add_logistics_event',
      triggerSource: SIMULATION_TRIGGER_SOURCE.CONDITION,
      status: SIMULATION_EVENT_STATUS.SKIPPED,
      reason: 'cooldown_active',
      at: Date.now() - 1000,
    })

    const eventLogCountBeforeMount = simulationStore.eventLogCount
    const { wrapper } = await mountControlCenterView()

    await wrapper.get('[data-testid="control-center-event-log-module-filter"]').setValue('shopping')
    await flushUi()

    const panel = wrapper.get('[data-testid="control-center-event-log-panel"]')
    expect(wrapper.findAll('[data-testid="control-center-event-log-item"]')).toHaveLength(1)
    expect(panel.text()).toContain('Shopping package arrived')
    expect(panel.text()).not.toContain('Food Delivery rider delay')
    expect(wrapper.get('[data-testid="control-center-event-log-detail"]').text()).toContain(
      'skipped behavior can be audited without mutating module data',
    )
    expect(wrapper.get('[data-testid="control-center-event-log-detail"]').text()).toContain(
      'Adapter boundary: shopping.add_logistics_event',
    )
    expect(simulationStore.eventLogCount).toBe(eventLogCountBeforeMount)

    wrapper.unmount()
  })

  test('applies and dismisses pending relationship events from World Hub review', async () => {
    const systemStore = useSystemStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setMoreFeatureToggle('control_center', true)
    relationshipRuntimeStore.resetForTesting()
    simulationStore.resetForTesting()

    const applyCandidate = relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: 4,
        name: 'Rin',
      },
      sourceModule: 'relationship_runtime',
      sourceId: 'pending_apply',
      factType: 'confession_candidate',
      summary: 'A major relationship step waits for World Hub approval.',
      metricDeltas: {
        affinity: 20,
        intimacy: 20,
      },
      requiresConfirmation: true,
    })
    const dismissCandidate = relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: 5,
        name: 'Mika',
      },
      sourceModule: 'relationship_runtime',
      sourceId: 'pending_dismiss',
      factType: 'conflict_candidate',
      summary: 'A major conflict can be dismissed.',
      metricDeltas: {
        tension: 20,
      },
      requiresConfirmation: true,
    })

    const { wrapper } = await mountControlCenterView()

    await wrapper
      .get(`[data-testid="control-center-relationship-apply-${applyCandidate.id}"]`)
      .trigger('click')
    await flushUi()

    expect(relationshipRuntimeStore.events.find((event) => event.id === applyCandidate.id)?.status).toBe('applied')
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 4, name: 'Rin' }).metrics.affinity).toBe(70)

    await wrapper
      .get(`[data-testid="control-center-relationship-dismiss-${dismissCandidate.id}"]`)
      .trigger('click')
    await flushUi()

    expect(relationshipRuntimeStore.events.find((event) => event.id === dismissCandidate.id)?.status).toBe('dismissed')
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 5, name: 'Mika' }).exists).toBe(false)

    wrapper.unmount()
  })

  test('filters relationship facts and explains pending effects before review', async () => {
    const systemStore = useSystemStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setMoreFeatureToggle('control_center', true)
    relationshipRuntimeStore.resetForTesting()
    simulationStore.resetForTesting()

    const pending = relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: 18,
        name: 'Pending Detail',
      },
      sourceModule: 'relationship_runtime',
      sourceId: 'pending_detail_review',
      factType: 'confession_candidate',
      summary: 'A relationship step needs review detail.',
      metricDeltas: {
        affinity: 15,
        intimacy: 12,
      },
      requiresConfirmation: true,
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: 18,
        name: 'Pending Detail',
      },
      sourceModule: 'relationship_shopping_gift',
      sourceId: 'shopping_detail_review:gift',
      factType: 'gift_purchased',
      summary: 'Gift purchased while the pending effect waits.',
      metricDeltas: {
        affinity: 4,
      },
    })

    const eventCountBeforeMount = relationshipRuntimeStore.events.length
    const { wrapper } = await mountControlCenterView()

    await wrapper
      .get('[data-testid="control-center-relationship-status-filter"]')
      .setValue('pending_confirmation')
    await flushUi()

    const panel = wrapper.get('[data-testid="control-center-relationship-panel"]')
    expect(wrapper.findAll('[data-testid="control-center-relationship-event"]')).toHaveLength(1)
    expect(panel.text()).toContain('confession_candidate')
    expect(panel.text()).not.toContain('Gift purchased while the pending effect waits.')

    const detail = wrapper.get('[data-testid="control-center-relationship-detail"]').text()
    expect(detail).toContain('waiting for explicit World Hub review')
    expect(detail).toContain('Metric delta: affinity +15 / intimacy +12')
    expect(detail).toContain('Pending review: no metric change is applied until this is approved.')
    expect(wrapper.find(`[data-testid="control-center-relationship-apply-${pending.id}"]`).exists()).toBe(true)
    expect(relationshipRuntimeStore.events).toHaveLength(eventCountBeforeMount)

    wrapper.unmount()
  })

  test('shows relationship classification gate details for relationship facts', async () => {
    const systemStore = useSystemStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setMoreFeatureToggle('control_center', true)
    relationshipRuntimeStore.resetForTesting()
    simulationStore.resetForTesting()

    relationshipRuntimeStore.recordRelationshipFact({
      target: { profileId: 30, name: 'Gate Review' },
      sourceModule: 'relationship_shopping_gift',
      sourceId: 'gate_review_order:gift',
      factType: 'gift_purchased',
      summary: 'Gift purchased for gate review.',
      metricDeltas: { affinity: 4 },
      relationshipGate: {
        decision: 'allow',
        mode: 'soft_reference',
        reason: 'soft_mismatch_allowed',
        eventType: 'gift_purchased',
        primaryRelationshipCategoryId: 'family_bond',
        relationshipModifierIds: ['caretaking'],
        matched: false,
      },
    })

    const { wrapper } = await mountControlCenterView()
    const detail = wrapper.get('[data-testid="control-center-relationship-detail"]').text()

    expect(detail).toContain('soft_reference')
    expect(detail).toContain('family_bond')
    expect(detail).toContain('soft_mismatch_allowed')

    wrapper.unmount()
  })

  test('shows primary shared memory summaries instead of supporting wallet details', async () => {
    const systemStore = useSystemStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setMoreFeatureToggle('control_center', true)
    relationshipRuntimeStore.resetForTesting()
    simulationStore.resetForTesting()

    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: 6,
        name: 'Aki',
      },
      sourceModule: 'relationship_shopping_gift',
      sourceId: 'shopping_order_aki_1:gift',
      memoryKey: 'aki_gift_day',
      factType: 'gift_purchased',
      summary: 'Gift purchased for Aki: Moon Lamp.',
      metricDeltas: {
        affinity: 8,
        trust: 3,
        intimacy: 4,
      },
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: 6,
        name: 'Aki',
      },
      sourceModule: 'relationship_wallet_order_support',
      sourceId: 'wallet_tx_aki_1:wallet_support:role_6',
      memoryKey: 'aki_gift_day',
      factType: 'wallet_order_support',
      summary: 'Wallet expense recorded for the same Shopping gift with Aki.',
      metricDeltas: {},
      forceSupportingMemory: true,
    })

    const { wrapper } = await mountControlCenterView()

    expect(wrapper.get('[data-testid="control-center-relationship-panel"]').text()).toContain(
      'Shared memory: Gift purchased for Aki: Moon Lamp. (2 related records)',
    )
    expect(wrapper.get('[data-testid="control-center-relationship-panel"]').text()).not.toContain(
      'Wallet support',
    )
    expect(wrapper.get('[data-testid="control-center-relationship-panel"]').text()).not.toContain(
      'Shared memory: Wallet expense recorded for the same Shopping gift with Aki.',
    )

    wrapper.unmount()
  })

  test('shows memory review state and note for the primary shared memory in World Hub', async () => {
    const systemStore = useSystemStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setMoreFeatureToggle('control_center', true)
    relationshipRuntimeStore.resetForTesting()
    simulationStore.resetForTesting()

    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: 16,
        name: 'Review State Role',
      },
      sourceModule: 'relationship_shopping_gift',
      sourceId: 'shopping_order_review_1:gift',
      memoryKey: 'review_state_memory',
      factType: 'gift_purchased',
      summary: 'Gift purchased for Review State Role: Tea Tin.',
      metricDeltas: {
        affinity: 8,
      },
    })
    relationshipRuntimeStore.updateMemoryReviewForTarget(
      { profileId: 16, name: 'Review State Role' },
      'review_state_memory',
      {
        status: RELATIONSHIP_MEMORY_REVIEW_STATES.PINNED,
        note: 'Keep this surfaced in World Hub.',
      },
    )

    const { wrapper } = await mountControlCenterView()
    const panelText = wrapper.get('[data-testid="control-center-relationship-panel"]').text()

    expect(panelText).toContain('Pinned')
    expect(panelText).toContain('Keep this surfaced in World Hub.')

    wrapper.unmount()
  })

  test('hides archive-only shared memory summary in World Hub while keeping management state visible', async () => {
    const systemStore = useSystemStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setMoreFeatureToggle('control_center', true)
    relationshipRuntimeStore.resetForTesting()
    simulationStore.resetForTesting()

    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: 17,
        name: 'Archive Hub Role',
      },
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: 'archive_hub_memory:calendar_event:role_17',
      memoryKey: 'archive_hub_memory',
      factType: 'scheduled_calendar_event',
      summary: 'Archived World Hub memory should stay out of the default headline.',
      metricDeltas: {
        trust: 2,
      },
    })
    relationshipRuntimeStore.updateMemoryReviewForTarget(
      { profileId: 17, name: 'Archive Hub Role' },
      'archive_hub_memory',
      {
        status: RELATIONSHIP_MEMORY_REVIEW_STATES.ARCHIVED,
        note: 'Historical only.',
      },
    )

    const { wrapper } = await mountControlCenterView()
    const panelText = wrapper.get('[data-testid="control-center-relationship-panel"]').text()

    expect(panelText).toContain('Only archived memories remain, so the default summary is hidden.')
    expect(panelText).not.toContain(
      'Shared memory: Archived World Hub memory should stay out of the default headline.',
    )
    expect(panelText).toContain('Archived')
    expect(panelText).toContain('Historical only.')

    wrapper.unmount()
  })

  test('deletes a relationship memory group from World Hub without deleting the Contacts profile', async () => {
    const systemStore = useSystemStore()
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const simulationStore = useSimulationStore()
    const walletStore = useWalletStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setMoreFeatureToggle('control_center', true)
    relationshipRuntimeStore.resetForTesting()
    simulationStore.resetForTesting()

    const profile = chatStore.addRoleProfile({
      roleId: '905A',
      name: 'World Hub Role',
      role: 'Archivist',
    })
    const transaction = walletStore.addTransferTransaction({
      amount: 42,
      counterparty: profile.name,
      note: 'Ticket with World Hub Role',
      relationshipBinding: {
        profileId: profile.id,
        contactId: 0,
        kind: 'role',
        name: profile.name,
      },
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_wallet_shared_transfer',
      sourceId: `${transaction.id}:shared_transfer:role_${profile.id}`,
      memoryKey: 'world_hub_memory',
      factType: 'shared_expense',
      summary: 'Ticket with World Hub Role.',
      metricDeltas: {
        trust: 4,
      },
    })

    const { wrapper } = await mountControlCenterView()
    const { dialogState, submitDialog } = useDialog()

    await wrapper
      .get(`[data-testid="control-center-relationship-delete-memory-role:${profile.id}-world_hub_memory"]`)
      .trigger('click')
    await flushUi()
    expect(dialogState.title).toBe('Delete relationship memory')
    expect(dialogState.details).toContain('Role ID: 905A')
    expect(dialogState.details.join(' ')).not.toContain(`Role ID: ${profile.id}`)
    submitDialog()
    await flushUi()
    expect(dialogState.title).toBe('Relationship memory deleted')
    submitDialog()
    await flushUi()

    expect(chatStore.getRoleProfileById(profile.id)).toBeTruthy()
    expect(relationshipRuntimeStore.listMemoryGroupsForTarget({ profileId: profile.id })).toEqual([])
    expect(walletStore.findTransactionById(transaction.id)).toMatchObject({
      counterparty: 'Unknown counterparty',
      relationshipBinding: expect.objectContaining({
        profileId: 0,
        contactId: 0,
      }),
    })

    wrapper.unmount()
  })

  test('labels orphaned relationship runtime entities by runtime key instead of role id', async () => {
    const systemStore = useSystemStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const simulationStore = useSimulationStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.setMoreFeatureToggle('control_center', true)
    relationshipRuntimeStore.resetForTesting()
    simulationStore.resetForTesting()

    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: 77,
        name: 'Archived Stranger',
      },
      sourceModule: 'relationship_runtime',
      sourceId: 'runtime_orphan_1',
      memoryKey: 'orphan_memory',
      factType: 'runtime_note',
      summary: 'An orphaned runtime memory stays manageable without becoming a role ID.',
      metricDeltas: {
        trust: 2,
      },
    })

    const { wrapper } = await mountControlCenterView()
    const panelText = wrapper.get('[data-testid="control-center-relationship-panel"]').text()

    expect(panelText).toContain('Archived Stranger')
    expect(panelText).toContain('Runtime key: role:77')
    expect(panelText).toContain('Contacts profile is missing')
    expect(panelText).not.toContain('Role ID: 77')

    const { dialogState, submitDialog } = useDialog()
    await wrapper
      .get('[data-testid="control-center-relationship-delete-memory-role:77-orphan_memory"]')
      .trigger('click')
    await flushUi()

    expect(dialogState.title).toBe('Delete relationship memory')
    expect(dialogState.details).toContain('Runtime key: role:77')
    expect(dialogState.details.join(' ')).not.toContain('Role ID: 77')

    submitDialog()
    await flushUi()
    expect(dialogState.title).toBe('Relationship memory deleted')
    submitDialog()
    await flushUi()

    expect(relationshipRuntimeStore.listMemoryGroupsForTarget({ profileId: 77 })).toEqual([])

    wrapper.unmount()
  })
})
