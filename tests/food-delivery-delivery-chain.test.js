import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFoodDeliveryStore, FOOD_DELIVERY_FULFILLMENT_PHASE, FOOD_DELIVERY_MESSAGE_SENDER } from '../src/stores/foodDelivery'
import { useMapStore } from '../src/stores/map'
import { useSystemStore } from '../src/stores/system'
import { useWalletStore } from '../src/stores/wallet'
import { usePhoneStore } from '../src/stores/phone'
import { useChatStore } from '../src/stores/chat'
import {
  SIMULATION_SURPRISE_MODE,
  useSimulationStore,
} from '../src/stores/simulation'

describe('food delivery owner chain', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  const createPaidOrder = () => {
    const food = useFoodDeliveryStore()
    const wallet = useWalletStore()
    const map = useMapStore()

    wallet.resetForTesting()
    wallet.addTransaction({
      type: 'income',
      title: 'Test funding',
      amount: '500.00',
      currency: 'CNY',
      createdAt: Date.now(),
    })

    const restaurant = food.findRestaurantById('food_seed_myeongdong_kyoja')
    const menuItem = food.listMenuByRestaurant(restaurant.id)[0]
    const destination = map.listDeliveryAnchors().find((anchor) => anchor.kind === 'address')
    food.addToCart(menuItem.id, 1)

    const result = food.checkoutPaidCart({
      restaurantId: restaurant.id,
      deliveryAnchor: destination,
      idempotencyKey: 'food-chain-test-1',
      now: Date.now(),
    })

    return { food, wallet, map, restaurant, menuItem, destination, result }
  }

  test('commits a real Wallet payment and Map-owned courier journey', () => {
    const { food, wallet, map, result } = createPaidOrder()

    expect(result).toMatchObject({ ok: true, order: { paymentStatus: 'completed' } })
    expect(result.payment.transaction).toMatchObject({
      paymentKind: 'commerce_order',
      paymentStatus: 'completed',
      sourceModule: 'wallet_commerce_payment',
    })
    expect(result.order.deliveryJourneyId).toBeTruthy()
    expect(map.findDeliveryJourneyByOrderId(result.order.id)).toMatchObject({
      orderId: result.order.id,
      phase: 'created',
      destination: { detail: result.order.deliveryAddress },
    })
    expect(wallet.findCommercePaymentByIdempotencyKey('food-chain-test-1')?.id).toBe(
      result.payment.transaction.id,
    )
    expect(food.orders[0].paymentRef.transactionId).toBe(result.payment.transaction.id)
  })

  test('fails closed on insufficient funds without creating an order or journey', () => {
    const food = useFoodDeliveryStore()
    const wallet = useWalletStore()
    const map = useMapStore()
    wallet.resetForTesting()
    const restaurant = food.findRestaurantById('food_seed_myeongdong_kyoja')
    const destination = map.listDeliveryAnchors().find((anchor) => anchor.kind === 'address')
    food.addToCart(food.listMenuByRestaurant(restaurant.id)[0].id, 1)

    const result = food.checkoutPaidCart({ restaurantId: restaurant.id, deliveryAnchor: destination })

    expect(result).toMatchObject({ ok: false, stage: 'payment', reason: 'insufficient_funds' })
    expect(food.orders).toHaveLength(0)
    expect(map.deliveryJourneys).toHaveLength(0)
  })

  test('uses the original fulfillment phase for a pre-pickup address change', () => {
    const { food, map, result } = createPaidOrder()
    const simulation = useSimulationStore()
    simulation.setSurpriseMode(SIMULATION_SURPRISE_MODE.BALANCED)
    const nextDestination = map.createDeliveryAddress({
      label: 'Office',
      detail: 'Office Tower, 12 River Road',
      mapPackId: result.order.deliveryAnchor.mapPackId,
      position: result.order.deliveryAnchor.position,
    })
    const initialFulfillmentPhase = result.order.fulfillment.phase

    const interaction = food.sendOrderMessage({
      orderId: result.order.id,
      text: 'Please change this order to my office before pickup.',
      intent: 'request_address_change',
      destinationAnchor: nextDestination.anchor,
      clientMessageId: 'food-chain-before-pickup-address-request',
      now: Date.now(),
    })

    expect(interaction.instance).toMatchObject({
      lifecycle: 'resolved',
      resultCodes: ['changed_before_pickup'],
      contextRefs: { fulfillment_phase: initialFulfillmentPhase },
    })
    expect(food.findOrderById(result.order.id)).toMatchObject({
      deliveryAddress: nextDestination.anchor.detail,
      fulfillment: { phase: initialFulfillmentPhase },
      mapEstimateRef: {
        journeyRevision: 2,
        sourceModule: 'map',
      },
    })
    expect(map.findDeliveryJourneyById(result.order.deliveryJourneyId)).toMatchObject({
      destination: { id: nextDestination.anchor.id },
      routeRevision: 2,
    })
  })

  test('keeps the order conversation native, exposes call after timeout, and commits reroute', () => {
    const { food, map, result } = createPaidOrder()
    useSimulationStore().setSurpriseMode(SIMULATION_SURPRISE_MODE.OFF)
    const nextDestination = map.createDeliveryAddress({
      label: 'Studio',
      detail: 'Studio 2F, 18 Willow Walk',
      mapPackId: result.order.deliveryAnchor.mapPackId,
      position: result.order.deliveryAnchor.position,
    })

    const pickupAt = result.journey.riderPickupAt
    food.reconcileFoodDeliveryRuntime(pickupAt)
    expect(food.findOrderById(result.order.id).status).toBe('rider_pickup')

    const request = food.sendOrderMessage({
      orderId: result.order.id,
      text: 'Please change the delivery address to my studio.',
      intent: 'request_address_change',
      destinationAnchor: nextDestination.anchor,
      clientMessageId: 'food-chain-address-request',
      now: pickupAt,
    })
    expect(request).toMatchObject({ ok: true, reply: { sender: FOOD_DELIVERY_MESSAGE_SENDER.PLATFORM } })
    expect(food.findOrderConversationByOrderId(result.order.id).messages).toHaveLength(2)

    food.reconcileFoodDeliveryRuntime(pickupAt + 61 * 1000)
    expect(food.getOrderCallContext(result.order.id)).toMatchObject({ orderId: result.order.id })
    expect(food.findOrderById(result.order.id).fulfillment.phase).toBe(
      FOOD_DELIVERY_FULFILLMENT_PHASE.CALL_AVAILABLE,
    )

    const committed = food.commitOrderAddressChange({
      orderId: result.order.id,
      destinationAnchor: nextDestination.anchor,
      now: pickupAt + 62 * 1000,
    })
    expect(committed).toMatchObject({
      ok: true,
      order: { deliveryAddress: 'Studio 2F, 18 Willow Walk', addressRevision: 2 },
      journey: { phase: 'rerouting', addressRevision: 2, routeRevision: 2 },
    })
  })

  test('delivers after reroute and remains usable when system notifications are disabled', () => {
    const { food, map, result } = createPaidOrder()
    const system = useSystemStore()
    system.settings.system.notifications = false
    const journey = map.findDeliveryJourneyById(result.order.deliveryJourneyId)

    food.reconcileFoodDeliveryRuntime(journey.etaAt + 1)

    expect(food.findOrderById(result.order.id).status).toBe('delivered')
    expect(food.findOrderConversationByOrderId(result.order.id).messages.at(-1)).toMatchObject({
      sender: FOOD_DELIVERY_MESSAGE_SENDER.SYSTEM,
      intent: 'delivery_arrived_at_routed_anchor',
    })
    expect(system.notifications).toHaveLength(0)
  })

  test('runs the owner-native address escalation across Food Delivery, Phone, Map, and Runtime', () => {
    const { food, map, result } = createPaidOrder()
    const phone = usePhoneStore()
    const simulation = useSimulationStore()
    const system = useSystemStore()
    simulation.setSurpriseMode(SIMULATION_SURPRISE_MODE.BALANCED)
    const nextDestination = map.createDeliveryAddress({
      label: 'Studio',
      detail: 'Studio 2F, 18 Willow Walk',
      mapPackId: result.order.deliveryAnchor.mapPackId,
      position: result.order.deliveryAnchor.position,
    })
    const pickupAt = result.journey.riderPickupAt

    food.reconcileFoodDeliveryRuntime(pickupAt)
    expect(food.findOrderById(result.order.id).fulfillment.phase).toBe(
      FOOD_DELIVERY_FULFILLMENT_PHASE.RIDER_PICKUP,
    )
    expect(food.findOpenServiceCaseByOrder(result.order.id, 'destination_change')).toBeNull()
    expect(simulation.eventInstancesV2).toHaveLength(0)

    const interaction = food.sendOrderMessage({
      orderId: result.order.id,
      text: 'Please change the delivery address to my studio.',
      intent: 'request_address_change',
      destinationAnchor: nextDestination.anchor,
      clientMessageId: 'food-chain-runtime-address-request',
      randomValue: 0.9,
      now: pickupAt,
    })
    expect(interaction.serviceCase).toMatchObject({
      orderId: result.order.id,
      caseType: 'destination_change',
      sourceMessageRef: { ownerModule: 'food_delivery' },
    })
    expect(interaction.instance).toMatchObject({
      schemaVersion: 2,
      currentNodeId: 'rider_response_timeout',
      lifecycle: 'active',
      decisionLedger: [{ key: 'rider_response_disposition', outcome: 'no_response' }],
    })
    food.reconcileFoodDeliveryRuntime(pickupAt + 61 * 1000)
    const callContext = food.getOrderCallContext(result.order.id)
    expect(callContext).toMatchObject({
      serviceCaseId: interaction.serviceCase.id,
      eventInstanceId: interaction.instance.id,
      requestedDestination: { id: nextDestination.anchor.id },
    })
    const call = phone.startCallSession({
      participant: callContext.courier,
      sourceModule: 'food_delivery',
      sourceId: result.order.id,
      orderId: result.order.id,
      conversationId: callContext.conversationId,
      journeyId: result.order.deliveryJourneyId,
      serviceCaseId: callContext.serviceCaseId,
      eventInstanceId: callContext.eventInstanceId,
      destinationAnchorId: callContext.requestedDestination.id,
    })
    food.recordPhoneCallLifecycleFacts({
      orderId: result.order.id,
      sessionId: call.session.id,
      now: pickupAt + 61 * 1000,
    })
    const callReply = phone.sendCallText({
      text: 'The address is wrong. Change it to my studio.',
      now: pickupAt + 62 * 1000,
    })
    expect(callReply.proposal).toMatchObject({
      status: 'proposed',
      outcomeCode: 'accepted_new_destination',
    })
    food.recordPhoneInteractionResolution({
      orderId: result.order.id,
      sessionId: call.session.id,
      now: pickupAt + 62 * 1000 + 1,
    })
    const committedOrder = food.findOrderById(result.order.id)
    const reroutedJourney = map.findDeliveryJourneyById(result.order.deliveryJourneyId)
    expect(committedOrder).toMatchObject({
      deliveryAddress: nextDestination.anchor.detail,
      addressRevision: 2,
      mapEstimateRef: {
        journeyRevision: 2,
        state: 'rerouting',
        sourceModule: 'map',
      },
    })
    expect(
      food.getOrderMapEstimateReference(result.order.id, {
        now: pickupAt + 62 * 1000 + 1,
        refresh: false,
      }),
    ).toMatchObject({ stale: false, reference: { journeyRevision: 2 } })
    expect(reroutedJourney).toMatchObject({
      destination: { id: nextDestination.anchor.id },
      routeRevision: 2,
      phase: 'rerouting',
    })
    expect(simulation.getEventInstanceV2(interaction.instance.id)).toMatchObject({
      lifecycle: 'resolved',
      resultCodes: ['changed_after_pickup'],
    })

    const completionAt = reroutedJourney.etaAt + 1
    food.reconcileFoodDeliveryRuntime(completionAt)
    const notificationCount = system.notifications.length
    food.reconcileFoodDeliveryRuntime(completionAt)
    expect(system.notifications).toHaveLength(notificationCount)
    expect(food.findOrderById(result.order.id).status).toBe('delivered')
    expect(food.findServiceCaseById(interaction.serviceCase.id)).toMatchObject({
      status: 'resolved',
      resolutionCode: 'changed_after_pickup',
    })
  })

  test('converges native and registered Chat service entry on one owner Service Case', () => {
    const { food, map, result } = createPaidOrder()
    const chat = useChatStore()
    const simulation = useSimulationStore()
    simulation.setSurpriseMode(SIMULATION_SURPRISE_MODE.OFF)
    const pickupAt = result.journey.riderPickupAt
    food.reconcileFoodDeliveryRuntime(pickupAt)
    const destination = map.createDeliveryAddress({
      label: 'Office',
      detail: 'Office Tower, 12 River Road',
      mapPackId: result.order.deliveryAnchor.mapPackId,
      position: result.order.deliveryAnchor.position,
    }).anchor

    const native = food.sendOrderMessage({
      orderId: result.order.id,
      text: 'Please change this order to my office.',
      intent: 'request_address_change',
      destinationAnchor: destination,
      clientMessageId: 'native-address-change',
      now: pickupAt,
    })
    const service = chat.addContact({
      kind: 'service',
      name: 'Food Delivery Dispatch',
      foodDeliveryServiceKey: 'food_delivery_dispatch',
    })
    const chatMessage = chat.appendMessage(service.id, {
      role: 'user',
      content: 'Use the selected order and change its address.',
      createdAt: pickupAt + 1,
    })
    const fromChat = food.beginChatServiceInteraction({
      contactId: service.id,
      messageId: chatMessage.id,
      orderId: result.order.id,
      userAction: 'destination_change_requested',
      destinationAnchor: destination,
      now: pickupAt + 1,
    })

    expect(fromChat.ok).toBe(true)
    expect(fromChat.serviceCase.id).toBe(native.serviceCase.id)
    expect(food.serviceCases).toHaveLength(1)
    expect(food.interactionTriggers).toHaveLength(2)
    expect(
      food.findOrderConversationByOrderId(result.order.id).messages.some(
        (message) => message.text === chatMessage.content,
      ),
    ).toBe(false)

    const missingReference = food.beginChatServiceInteraction({
      contactId: service.id,
      messageId: chatMessage.id,
      orderId: '',
      userAction: 'destination_change_requested',
      destinationAnchor: destination,
      now: pickupAt + 2,
    })
    expect(missingReference).toMatchObject({ ok: false, reason: 'ordinary_support' })
    expect(food.serviceCases).toHaveLength(1)
  })
})
