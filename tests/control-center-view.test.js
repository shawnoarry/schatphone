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
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'
import { useWalletStore } from '../src/stores/wallet'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/control-center', component: ControlCenterView },
      { path: '/home', component: DummyView },
      { path: '/more', component: DummyView },
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

    expect(wrapper.get('[data-testid="control-center-status"]').text()).toContain('Runtime Control Disabled')
    expect(wrapper.get('[data-testid="control-center-event-log-panel"]').text()).toContain('No event logs yet')
    expect(wrapper.get('[data-testid="control-center-relationship-panel"]').text()).toContain('No relationship facts yet')
    expect(wrapper.get('[data-testid="control-center-runtime-panel"]').text()).toContain(
      'does not trigger events or mutate module data',
    )

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
      'Shared memory: Gift purchased for Aki: Moon Lamp.',
    )
    expect(wrapper.get('[data-testid="control-center-relationship-panel"]').text()).not.toContain(
      'Shared memory: Wallet expense recorded for the same Shopping gift with Aki.',
    )

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
