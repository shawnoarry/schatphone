import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useFoodDeliveryStore, FOOD_DELIVERY_FULFILLMENT_PHASE, FOOD_DELIVERY_MESSAGE_SENDER } from '../src/stores/foodDelivery'
import { useMapStore } from '../src/stores/map'
import { useSystemStore } from '../src/stores/system'
import { useWalletStore } from '../src/stores/wallet'
import { usePhoneStore } from '../src/stores/phone'
import {
  FOOD_DELIVERY_CAUSAL_CHAIN_NODE,
  FOOD_DELIVERY_CAUSAL_CHAIN_STATUS,
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

  test('keeps the order conversation native, exposes call after timeout, and commits reroute', () => {
    const { food, map, result } = createPaidOrder()
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
      intent: 'delivery_completed',
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

    food.reconcileFoodDeliveryRuntime(pickupAt, { randomValue: 0 })
    expect(food.findOrderById(result.order.id).fulfillment.phase).toBe(
      FOOD_DELIVERY_FULFILLMENT_PHASE.ADDRESS_CONFIRMATION_REQUIRED,
    )
    expect(simulation.getFoodDeliveryCausalChain(result.order.id)).toMatchObject({
      currentNode: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.ADDRESS_CONFIRMATION_REQUIRED,
      status: FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.ACTIVE,
      canonicalMutation: 'none',
    })

    food.sendOrderMessage({
      orderId: result.order.id,
      text: 'Please change the delivery address to my studio.',
      intent: 'request_address_change',
      destinationAnchor: nextDestination.anchor,
      clientMessageId: 'food-chain-runtime-address-request',
      now: pickupAt,
    })
    food.reconcileFoodDeliveryRuntime(pickupAt + 61 * 1000)
    const callContext = food.getOrderCallContext(result.order.id)
    const call = phone.startCallSession({
      participant: callContext.courier,
      sourceModule: 'food_delivery',
      sourceId: result.order.id,
      orderId: result.order.id,
      conversationId: callContext.conversationId,
      journeyId: result.order.deliveryJourneyId,
    })
    food.recordOrderCausalCheckpoint({
      orderId: result.order.id,
      node: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.CALL_STARTED,
      phoneSessionId: call.session.id,
    })
    const callReply = phone.sendCallText({ text: 'The address is wrong. Change it to my studio.' })
    expect(callReply.proposal.kind).toBe('address_change_accepted')
    food.recordOrderCausalCheckpoint({
      orderId: result.order.id,
      node: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.CALL_RESOLUTION_PROPOSED,
      phoneSessionId: call.session.id,
    })
    const committed = food.commitOrderAddressChange({
      orderId: result.order.id,
      destinationAnchor: nextDestination.anchor,
      now: pickupAt + 62 * 1000,
    })
    expect(committed.ok).toBe(true)
    expect(simulation.getFoodDeliveryCausalChain(result.order.id)).toMatchObject({
      currentNode: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_REROUTED,
      ownerRecords: { phoneSessionId: call.session.id },
    })

    const completionAt = committed.journey.etaAt + 1
    food.reconcileFoodDeliveryRuntime(completionAt)
    const notificationCount = system.notifications.length
    food.reconcileFoodDeliveryRuntime(completionAt)
    expect(system.notifications).toHaveLength(notificationCount)
    expect(food.findOrderById(result.order.id).status).toBe('delivered')
    expect(simulation.getFoodDeliveryCausalChain(result.order.id)).toMatchObject({
      currentNode: FOOD_DELIVERY_CAUSAL_CHAIN_NODE.DELIVERY_COMPLETED,
      status: FOOD_DELIVERY_CAUSAL_CHAIN_STATUS.RESOLVED,
    })
  })
})
