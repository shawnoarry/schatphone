import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  closeCurrentSaveWriter,
  initializeCurrentSaveWriter,
  resetCurrentSaveWriteRuntimeForTesting,
} from '../src/lib/current-save-write-runtime'
import { reconcilePersistedStateLayers } from '../src/lib/persistence'
import {
  getPersistenceRuntimeStatus,
  resetPersistenceRuntimeStatusForTesting,
} from '../src/lib/persistence-runtime-status'
import {
  COMMERCE_EVENT_TEMPLATE_ID,
} from '../src/lib/simulation/commerce-event-templates'
import {
  EVENT_RUNTIME_MINI_SCENE_TYPE,
  generateAndPresentMiniScene,
} from '../src/lib/mini-scene-runtime'
import {
  RELATIONSHIP_RUNTIME_STORAGE_KEY,
  useRelationshipRuntimeStore,
} from '../src/stores/relationshipRuntime'
import {
  MINI_SCENE_STORAGE_KEY,
  useMiniSceneStore,
} from '../src/stores/miniScene'
import { useSimulationStore } from '../src/stores/simulation'
import {
  FOOD_DELIVERY_STORAGE_KEY,
  useFoodDeliveryStore,
} from '../src/stores/foodDelivery'
import { useMapStore } from '../src/stores/map'
import { useSystemStore } from '../src/stores/system'
import { useWalletStore } from '../src/stores/wallet'

const storageKey = (key) => `schatphone:${key}`

const waitForHydration = async (store) => {
  await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
  await nextTick()
}

const installStorageFailure = (targetKey, error) => {
  const originalSetItem = Storage.prototype.setItem
  let enabled = true
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
    if (enabled && key === storageKey(targetKey)) throw error
    return originalSetItem.call(this, key, value)
  })
  return {
    release() {
      enabled = false
      spy.mockRestore()
    },
  }
}

const createRelationshipFact = (overrides = {}) => ({
  id: 'relationship_fact_cmg02_1',
  target: { entityKey: 'role:77', name: 'Xia' },
  sourceModule: 'relationship_chat_user_disclosure',
  sourceId: 'message_cmg02_1',
  factType: 'user_disclosure',
  memoryKey: 'xia:gift_preference',
  summary: 'Xia likes practical gifts.',
  metricDeltas: { trust: 2 },
  createdAt: 1_777_000_000_000,
  ...overrides,
})

const createMiniSceneRequest = () => ({
  requestId: 'event_instance_cmg02:mini_scene',
  source: {
    moduleKey: 'simulation',
    recordId: 'event_instance_cmg02',
    eventId: 'event_instance_cmg02',
    route: '/control-center',
  },
  sceneType: EVENT_RUNTIME_MINI_SCENE_TYPE,
  worldContext: { worldId: 'legacy_single_world' },
  participants: [
    { id: 'player', name: 'Lin Xia', role: 'performer' },
    { id: 'manager', name: 'Mina', role: 'manager' },
  ],
  facts: [
    {
      id: 'event_status',
      key: 'event.status',
      label: 'Event status',
      value: 'triggered',
      authority: 'authoritative',
    },
  ],
  presentationHint: 'text',
})

const createMiniSceneDraft = () => ({
  title: 'The cue light turns red',
  summary: 'A short choice-driven moment after the event begins.',
  textFallback: 'The stage manager raises a hand. The next cue belongs to you.',
  beats: [
    {
      id: 'cue',
      text: 'Mina points toward the stage entrance while the countdown starts.',
      participantIds: ['manager', 'player'],
    },
  ],
  choices: [
    { id: 'step_forward', label: 'Step toward the stage', value: 'step_forward' },
  ],
  document: { templateId: '', variantId: '', slots: {}, assetIds: [] },
})

const createPaidFoodOrder = () => {
  const food = useFoodDeliveryStore()
  const wallet = useWalletStore()
  const map = useMapStore()
  wallet.resetForTesting()
  wallet.addTransaction({
    type: 'income',
    title: 'CMG-02 test funding',
    amount: '500.00',
    currency: 'CNY',
    createdAt: 1_777_000_000_000,
  })
  const restaurant = food.findRestaurantById('food_seed_myeongdong_kyoja')
  const menuItem = food.listMenuByRestaurant(restaurant.id)[0]
  const destination = map.listDeliveryAnchors().find((anchor) => anchor.kind === 'address')
  food.addToCart(menuItem.id, 1)
  const checkout = food.checkoutPaidCart({
    restaurantId: restaurant.id,
    deliveryAnchor: destination,
    idempotencyKey: 'cmg02-food-checkout',
    now: 1_777_000_000_000,
  })
  expect(checkout.ok).toBe(true)
  return { food, map, order: checkout.order }
}

describe('CMG-02 confirmed persistence results', () => {
  beforeEach(async () => {
    await resetCurrentSaveWriteRuntimeForTesting()
    resetPersistenceRuntimeStatusForTesting()
    localStorage.clear()
    setActivePinia(createPinia())
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await resetCurrentSaveWriteRuntimeForTesting()
    resetPersistenceRuntimeStatusForTesting()
  })

  test('rolls back relationship facts and decisions, then keeps one copy per id after reopen', async () => {
    const store = useRelationshipRuntimeStore()
    await waitForHydration(store)
    const confirmedRaw = localStorage.getItem(storageKey(RELATIONSHIP_RUNTIME_STORAGE_KEY))
    const failure = installStorageFailure(
      RELATIONSHIP_RUNTIME_STORAGE_KEY,
      new DOMException('quota', 'QuotaExceededError'),
    )

    expect(store.recordRelationshipFact(createRelationshipFact())).toBeNull()
    expect(store.events).toEqual([])
    expect(store.entities).toEqual([])
    expect(localStorage.getItem(storageKey(RELATIONSHIP_RUNTIME_STORAGE_KEY))).toBe(confirmedRaw)
    expect(getPersistenceRuntimeStatus()).toMatchObject({
      active: true,
      mode: 'save_failed',
      primaryCode: 'quota_exceeded',
    })

    failure.release()
    expect(store.recordRelationshipFact(createRelationshipFact())).toMatchObject({
      id: 'relationship_fact_cmg02_1',
    })
    expect(store.recordRelationshipFact(createRelationshipFact())).toMatchObject({
      id: 'relationship_fact_cmg02_1',
    })
    expect(store.recordRelationshipFact(createRelationshipFact({ summary: 'Conflicting text.' }))).toBeNull()
    const pendingApply = store.recordRelationshipFact(createRelationshipFact({
      id: 'relationship_fact_cmg02_apply',
      sourceId: 'message_cmg02_apply',
      summary: 'A major relationship decision awaits review.',
      requiresConfirmation: true,
      metricDeltas: { trust: 20 },
    }))
    const beforeApply = store.createBackupSnapshot()
    const applyFailure = installStorageFailure(
      RELATIONSHIP_RUNTIME_STORAGE_KEY,
      new DOMException('quota', 'QuotaExceededError'),
    )
    expect(store.applyPendingRelationshipEvent(pendingApply.id)).toBe(false)
    expect(store.createBackupSnapshot()).toEqual(beforeApply)
    applyFailure.release()
    expect(store.applyPendingRelationshipEvent(pendingApply.id)).toBe(true)

    const pendingDismiss = store.recordRelationshipFact(createRelationshipFact({
      id: 'relationship_fact_cmg02_dismiss',
      sourceId: 'message_cmg02_dismiss',
      summary: 'Another major relationship decision awaits review.',
      requiresConfirmation: true,
      metricDeltas: { affinity: -20 },
    }))
    const beforeDismiss = store.createBackupSnapshot()
    const dismissFailure = installStorageFailure(
      RELATIONSHIP_RUNTIME_STORAGE_KEY,
      new DOMException('quota', 'QuotaExceededError'),
    )
    expect(store.dismissRelationshipEvent(pendingDismiss.id)).toBe(false)
    expect(store.createBackupSnapshot()).toEqual(beforeDismiss)
    dismissFailure.release()
    expect(store.dismissRelationshipEvent(pendingDismiss.id)).toBe(true)
    expect(store.events).toHaveLength(3)

    setActivePinia(createPinia())
    const reopened = useRelationshipRuntimeStore()
    await waitForHydration(reopened)
    expect(reopened.events).toHaveLength(3)
    expect(reopened.events.filter((item) => item.id === 'relationship_fact_cmg02_1')).toHaveLength(1)
  })

  test('does not present or retain a Mini Scene while the current save is read-only', async () => {
    const store = useMiniSceneStore()
    await waitForHydration(store)
    expect(store.setModulePresentationMode('simulation', 'text')).toBe(true)
    expect(store.saveNow()).toMatchObject({ ok: true })
    await initializeCurrentSaveWriter({
      coordinatorFactory: () => ({
        adapter: 'test',
        ownerId: 'cmg02-page',
        acquire: async () => ({
          ok: true,
          adapter: 'test',
          ownerId: 'cmg02-page',
          heartbeatMs: 0,
          release: async () => ({ ok: true }),
        }),
        subscribe: () => () => {},
        close() {},
      }),
      randomUUID: () => 'cmg02-read-only',
    })
    await closeCurrentSaveWriter()
    const provider = vi.fn(async () => ({
      text: JSON.stringify(createMiniSceneDraft()),
      meta: { apiKind: 'openai_compatible', requestId: 'provider-cmg02' },
    }))

    const result = await generateAndPresentMiniScene(
      { request: createMiniSceneRequest() },
      {
        miniSceneStore: store,
        providerAdapter: provider,
        providerMetadata: { modelId: 'test-model' },
        now: 1_777_000_000_000,
      },
    )
    expect(result).toMatchObject({
      ok: false,
      status: 'failed',
      reason: 'read_only_conflict',
      providerCallCount: 1,
      persistence: { readOnly: true },
    })
    expect(store.artifacts).toEqual([])
    expect(store.interactionAudit).toEqual([])
    expect(store.activeArtifact).toBeNull()
    expect(getPersistenceRuntimeStatus().affectedKeys).toContain(MINI_SCENE_STORAGE_KEY)
  })

  test('rolls back the whole Food Delivery address interaction and retries without duplicates', async () => {
    const { food, map, order } = createPaidFoodOrder()
    const simulation = useSimulationStore()
    const system = useSystemStore()
    await Promise.all([
      waitForHydration(food),
      waitForHydration(simulation),
    ])
    simulation.setSurpriseMode('off')
    simulation.saveNow()
    const restaurant = food.findRestaurantById(order.restaurantId)
    const menuItem = food.listMenuByRestaurant(restaurant.id)[0]
    const checkoutDestination = map.listDeliveryAnchors().find((anchor) => anchor.kind === 'address')
    food.addToCart(menuItem.id, 1)
    const orderCountBeforeFailedCheckout = food.orders.length
    const mapBeforeFailedCheckout = map.createBackupSnapshot()
    const checkoutFailure = installStorageFailure(
      FOOD_DELIVERY_STORAGE_KEY,
      new DOMException('quota', 'QuotaExceededError'),
    )
    expect(food.checkoutPaidCart({
      restaurantId: restaurant.id,
      deliveryAnchor: checkoutDestination,
      idempotencyKey: 'cmg02-failed-checkout',
      now: 1_777_000_000_500,
    })).toMatchObject({
      ok: false,
      stage: 'persistence',
      reason: 'quota_exceeded',
    })
    expect(food.orders).toHaveLength(orderCountBeforeFailedCheckout)
    expect(map.createBackupSnapshot()).toEqual(mapBeforeFailedCheckout)
    checkoutFailure.release()
    expect(food.checkoutPaidCart({
      restaurantId: restaurant.id,
      deliveryAnchor: checkoutDestination,
      idempotencyKey: 'cmg02-failed-checkout',
      now: 1_777_000_000_500,
    })).toMatchObject({
      ok: false,
      stage: 'payment',
      reason: 'payment_without_order_reversed',
    })
    expect(food.orders).toHaveLength(orderCountBeforeFailedCheckout)
    food.clearCartByRestaurant(restaurant.id)

    const nextDestination = map.createDeliveryAddress({
      label: 'CMG-02 office',
      detail: '12 Persistence Road',
      mapPackId: order.deliveryAnchor.mapPackId,
      position: order.deliveryAnchor.position,
    }).anchor
    map.saveNow()
    const beforeFood = food.createBackupSnapshot()
    const beforeFoodRaw = localStorage.getItem(storageKey(FOOD_DELIVERY_STORAGE_KEY))
    const beforeMap = map.createBackupSnapshot()
    const beforeSimulation = simulation.createBackupSnapshot()
    const beforeNotificationCount = system.notifications.length
    const failure = installStorageFailure(
      FOOD_DELIVERY_STORAGE_KEY,
      new DOMException('quota', 'QuotaExceededError'),
    )
    const input = {
      orderId: order.id,
      text: 'Please deliver this order to my office.',
      intent: 'request_address_change',
      destinationAnchor: nextDestination,
      clientMessageId: 'cmg02-address-request',
      interactionId: 'cmg02-address-interaction',
      now: 1_777_000_001_000,
    }

    const failed = food.sendOrderMessage(input)
    expect(failed).toMatchObject({
      ok: false,
      stage: 'persistence',
      reason: 'quota_exceeded',
    })
    await nextTick()
    expect(food.createBackupSnapshot()).toEqual(beforeFood)
    expect(localStorage.getItem(storageKey(FOOD_DELIVERY_STORAGE_KEY))).toBe(beforeFoodRaw)
    expect(map.createBackupSnapshot()).toEqual(beforeMap)
    expect(simulation.createBackupSnapshot()).toEqual(beforeSimulation)
    expect(system.notifications).toHaveLength(beforeNotificationCount)

    failure.release()
    const retried = food.sendOrderMessage(input)
    expect(retried).toMatchObject({ ok: true, message: { clientMessageId: 'cmg02-address-request' } })
    const afterRetry = food.createBackupSnapshot()
    const repeated = food.sendOrderMessage(input)
    expect(repeated).toMatchObject({ ok: true, reason: 'message_already_recorded' })
    expect(food.createBackupSnapshot()).toEqual(afterRetry)
    expect(food.interactionTriggers.filter((item) => item.id === 'cmg02-address-interaction')).toHaveLength(1)
    expect(food.orderConversations.flatMap((item) => item.messages).filter(
      (item) => item.clientMessageId === 'cmg02-address-request',
    )).toHaveLength(1)

    setActivePinia(createPinia())
    const reopened = useFoodDeliveryStore()
    await waitForHydration(reopened)
    expect(reopened.interactionTriggers.filter((item) => item.id === 'cmg02-address-interaction')).toHaveLength(1)
    expect(reopened.orderConversations.flatMap((item) => item.messages).filter(
      (item) => item.clientMessageId === 'cmg02-address-request',
    )).toHaveLength(1)
  })

  test('rolls back Event Instance V2 when reconciliation blocks its save', async () => {
    const store = useSimulationStore()
    await waitForHydration(store)
    const stableContextRefs = {
      order_id: 'food_order_cmg02_stable',
      order_revision: 1,
      service_case_id: 'service_case_cmg02_stable',
      fulfillment_phase: 'rider_pickup',
      journey_id: 'journey_cmg02_stable',
      expected_journey_revision: 1,
      destination_anchor_id: 'anchor_cmg02_stable',
    }
    expect(store.startEventInstanceV2({
      id: 'event_instance_cmg02_stable',
      templateId: COMMERCE_EVENT_TEMPLATE_ID.DESTINATION_CHANGE_AFTER_FULFILLMENT,
      contextRefs: stableContextRefs,
      randomValues: { rider_response_disposition: 0.9 },
      now: 1_777_000_000_000,
    })).toMatchObject({ ok: true })
    expect(store.startEventInstanceV2({
      id: 'event_instance_cmg02_stable',
      templateId: COMMERCE_EVENT_TEMPLATE_ID.DESTINATION_CHANGE_AFTER_FULFILLMENT,
      contextRefs: stableContextRefs,
      randomValues: { rider_response_disposition: 0.1 },
      now: 1_777_000_001_000,
    })).toMatchObject({ ok: true, changed: false, reason: 'instance_already_started' })
    expect(store.startEventInstanceV2({
      id: 'event_instance_cmg02_stable',
      templateId: COMMERCE_EVENT_TEMPLATE_ID.DESTINATION_CHANGE_AFTER_FULFILLMENT,
      contextRefs: { ...stableContextRefs, order_id: 'conflicting_order' },
      now: 1_777_000_001_000,
    })).toMatchObject({ ok: false, reason: 'instance_id_conflict' })
    const fact = {
      schemaVersion: 1,
      id: 'owner_fact_cmg02_stable',
      type: 'food_delivery.address_change_requested',
      sourceModule: 'food_delivery',
      subjectRef: { kind: 'service_case', id: 'service_case_cmg02_stable', revision: 1 },
      correlationId: 'event_instance_cmg02_stable',
      causationId: 'interaction_cmg02_stable',
      resultCode: 'request_recorded',
      occurredAt: 1_777_000_000_100,
    }
    expect(store.recordOwnerFactAndAdvance(fact)).toMatchObject({ ok: true })
    expect(store.recordOwnerFactAndAdvance(fact)).toMatchObject({
      ok: true,
      changed: false,
      reason: 'owner_fact_already_recorded',
    })
    expect(store.eventInstancesV2).toHaveLength(1)
    expect(store.ownerFacts).toHaveLength(1)

    const key = 'store:simulation'
    await reconcilePersistedStateLayers(key, { version: 7 })
    const confirmedRaw = localStorage.getItem(storageKey(key))
    localStorage.setItem(storageKey(key), `${confirmedRaw} `)

    const result = store.startEventInstanceV2({
      id: 'event_instance_cmg02_reconciliation',
      templateId: COMMERCE_EVENT_TEMPLATE_ID.DESTINATION_CHANGE_AFTER_FULFILLMENT,
      contextRefs: {
        order_id: 'food_order_cmg02',
        order_revision: 1,
        service_case_id: 'service_case_cmg02',
        fulfillment_phase: 'rider_pickup',
        journey_id: 'journey_cmg02',
        expected_journey_revision: 1,
        destination_anchor_id: 'anchor_cmg02',
      },
      randomValues: { rider_response_disposition: 0.9 },
      now: 1_777_000_000_000,
    })

    expect(result).toMatchObject({
      ok: false,
      changed: false,
      reason: 'reconciliation_required',
      persistence: { carrier: 'reconciliation' },
    })
    expect(store.eventInstancesV2).toHaveLength(1)
    expect(store.getEventInstanceV2('event_instance_cmg02_reconciliation')).toBeNull()
    expect(store.ownerFacts).toHaveLength(1)
    expect(getPersistenceRuntimeStatus().affectedKeys).toContain(key)
  })
})
