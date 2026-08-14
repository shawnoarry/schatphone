import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID,
  FOOD_DELIVERY_CAUSAL_CHAIN_NODE,
  FOOD_DELIVERY_CAUSAL_CHAIN_STATUS,
  SIMULATION_SURPRISE_MODE,
  useSimulationStore,
} from '../src/stores/simulation'

describe('simulation food delivery causal chain', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-14T03:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('creates a deterministic owner-reference-only chain and advances it idempotently', () => {
    const store = useSimulationStore()
    store.resetForTesting()
    store.setSurpriseMode(SIMULATION_SURPRISE_MODE.BALANCED)

    const triggered = store.evaluateFoodDeliveryCausalChain({
      orderSnapshot: {
        id: 'food_order_chain_1',
        status: 'rider_pickup',
        journeyPhase: 'en_route',
        paymentRef: { transactionId: 'wallet_tx_1', amountCents: 1280 },
        deliveryJourneyId: 'journey_1',
        conversationId: 'conversation_1',
      },
      randomValue: 0.01,
      at: Date.now(),
    })

    expect(triggered).toMatchObject({
      ok: true,
      status: 'triggered',
      chain: {
        eventId: FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID,
        targetId: 'food_order_chain_1',
        currentNode: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_CONFIRMATION_REQUIRED,
        status: FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.ACTIVE,
        canonicalMutation: 'none',
        ownerRecords: {
          foodOrderId: 'food_order_chain_1',
          walletTransactionId: 'wallet_tx_1',
          mapJourneyId: 'journey_1',
          conversationId: 'conversation_1',
        },
      },
    })
    expect(JSON.stringify(triggered.chain)).not.toContain('amountCents')

    expect(
      store.recordFoodDeliveryCausalCheckpoint({
        orderId: 'food_order_chain_1',
        node: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_CHANGE_REQUESTED,
        resultCode: 'address_change_requested',
        at: Date.now() + 1,
      }),
    ).toMatchObject({ ok: true, changed: true })
    const repeat = store.recordFoodDeliveryCausalCheckpoint({
      orderId: 'food_order_chain_1',
      node: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_CHANGE_REQUESTED,
      at: Date.now() + 2,
    })
    expect(repeat).toMatchObject({ ok: true, changed: false, reason: 'checkpoint_already_recorded' })

    store.recordFoodDeliveryCausalCheckpoint({
      orderId: 'food_order_chain_1',
      node: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.RIDER_RESPONSE_TIMEOUT,
      at: Date.now() + 3,
    })
    store.recordFoodDeliveryCausalCheckpoint({
      orderId: 'food_order_chain_1',
      node: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.CALL_STARTED,
      ownerRecords: { phoneSessionId: 'phone_session_1' },
      at: Date.now() + 4,
    })
    store.recordFoodDeliveryCausalCheckpoint({
      orderId: 'food_order_chain_1',
      node: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.CALL_RESOLUTION_PROPOSED,
      at: Date.now() + 5,
    })
    store.recordFoodDeliveryCausalCheckpoint({
      orderId: 'food_order_chain_1',
      node: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_REVISION_COMMITTED,
      at: Date.now() + 6,
    })
    store.recordFoodDeliveryCausalCheckpoint({
      orderId: 'food_order_chain_1',
      node: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_REROUTED,
      at: Date.now() + 7,
    })
    const completed = store.recordFoodDeliveryCausalCheckpoint({
      orderId: 'food_order_chain_1',
      node: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED,
      at: Date.now() + 8,
    })
    expect(completed).toMatchObject({
      ok: true,
      changed: true,
      chain: {
        currentNode: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED,
        status: FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.RESOLVED,
        ownerRecords: { phoneSessionId: 'phone_session_1' },
      },
    })
    expect(store.eventLogs.filter((log) => log.eventId === FOOD_DELIVERY_CAUSAL_CHAIN_EVENT_ID)).toHaveLength(8)

    expect(store.evaluateFoodDeliveryCausalChain({
      orderSnapshot: { id: 'food_order_chain_1b', status: 'rider_pickup', journeyPhase: 'en_route' },
      randomValue: 0,
    })).toMatchObject({ ok: false, reason: 'daily_limit_reached' })
  })

  test('records a durable no-event path without consuming owner state', () => {
    const store = useSimulationStore()
    store.resetForTesting()
    store.setSurpriseMode(SIMULATION_SURPRISE_MODE.BALANCED)

    const skipped = store.evaluateFoodDeliveryCausalChain({
      orderSnapshot: { id: 'food_order_chain_2', status: 'rider_pickup', journeyPhase: 'en_route' },
      randomValue: 0.99,
    })
    expect(skipped).toMatchObject({
      ok: false,
      status: 'skipped',
      reason: 'random_failed',
      chain: { status: FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.SKIPPED, canonicalMutation: 'none' },
    })
    expect(
      store.evaluateFoodDeliveryCausalChain({
        orderSnapshot: { id: 'food_order_chain_2', status: 'rider_pickup', journeyPhase: 'en_route' },
        randomValue: 0,
      }),
    ).toMatchObject({ ok: false, reason: 'no_event' })
    expect(store.recordFoodDeliveryCausalCheckpoint({
      orderId: 'food_order_chain_2',
      node: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED,
    })).toMatchObject({ ok: true, changed: false, reason: 'no_event' })
  })

  test('fails closed for disabled modules and persists/restores causal references', () => {
    const store = useSimulationStore()
    store.resetForTesting()
    store.setModuleEventsEnabled('food_delivery', false)
    expect(store.evaluateFoodDeliveryCausalChain({
      orderSnapshot: { id: 'food_order_chain_3', status: 'rider_pickup', journeyPhase: 'en_route' },
      randomValue: 0,
    })).toMatchObject({ reason: 'module_disabled' })

    store.setModuleEventsEnabled('food_delivery', true)
    store.setSurpriseMode(SIMULATION_SURPRISE_MODE.HIGH)
    store.evaluateFoodDeliveryCausalChain({
      orderSnapshot: { id: 'food_order_chain_4', status: 'rider_pickup', journeyPhase: 'en_route' },
      randomValue: 0,
    })
    const snapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup({ simulation: snapshot })).toBe(true)
    expect(store.foodDeliveryCausalChains).toHaveLength(2)
    expect(store.foodDeliveryCausalChains.map((chain) => chain.targetId)).toEqual(
      expect.arrayContaining(['food_order_chain_3', 'food_order_chain_4']),
    )
  })

  test('migrates Simulation v3 without dropping review notes or text mode', () => {
    localStorage.setItem(
      'schatphone:store:simulation',
      JSON.stringify({
        version: 3,
        savedAt: Date.now(),
        data: {
          eventLogs: [],
          eventInstances: [],
          eventReviewNotes: [{
            id: 'review_note_v3',
            eventRef: {
              eventId: 'food_delivery.delivery_address_change_escalation.v1',
              sourceKind: 'event_log',
              sourceId: 'log_v3',
              moduleKey: 'food_delivery',
              targetId: 'food_order_chain_v3',
            },
            body: 'Keep this note during the causal-chain migration.',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }],
          cooldownsByEvent: {},
          dailyCounters: {},
          settings: { surpriseMode: SIMULATION_SURPRISE_MODE.BALANCED, eventTextMode: 'local_only' },
        },
      }),
    )
    const store = useSimulationStore()
    expect(store.eventReviewNotes).toHaveLength(1)
    expect(store.eventReviewNotes[0].id).toBe('review_note_v3')
    expect(store.settings.eventTextMode).toBe('local_only')
    expect(store.foodDeliveryCausalChains).toEqual([])
  })
})
