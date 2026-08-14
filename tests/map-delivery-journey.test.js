import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '../src/stores/map'

describe('map delivery journey owner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('creates and reconciles a courier journey without touching the player journey', () => {
    const store = useMapStore()
    const restaurant = store.listDeliveryAnchors().find((anchor) => anchor.placeId === 'seoul-myeongdong-kyoja-main')
    const destination = store.listDeliveryAnchors().find((anchor) => anchor.kind === 'address')

    expect(restaurant).toBeTruthy()
    expect(destination).toBeTruthy()

    const created = store.createDeliveryJourney({
      orderId: 'food_order_delivery_1',
      restaurantAnchor: restaurant,
      destinationAnchor: destination,
      courier: { id: 'courier_1', name: 'Jin', phoneNumber: '10001' },
      etaMinutes: 10,
    })

    expect(created).toMatchObject({ ok: true })
    expect(store.tripState.status).toBe('idle')
    expect(created.journey).toMatchObject({
      orderId: 'food_order_delivery_1',
      phase: 'created',
      courier: { id: 'courier_1', name: 'Jin' },
    })

    store.reconcileDeliveryJourneys(Date.now() + 4 * 60 * 1000)
    expect(store.findDeliveryJourneyByOrderId('food_order_delivery_1')?.phase).toBe('en_route')
    expect(store.getDeliveryJourneyProjection(created.journey.id, Date.now() + 4 * 60 * 1000)).toMatchObject({
      orderId: 'food_order_delivery_1',
      phase: 'en_route',
    })

    store.reconcileDeliveryJourneys(Date.now() + 11 * 60 * 1000)
    expect(store.findDeliveryJourneyByOrderId('food_order_delivery_1')?.phase).toBe('arrived')
    expect(store.tripState.status).toBe('idle')
  })

  test('validates and commits a revisioned delivery reroute', () => {
    const store = useMapStore()
    const anchors = store.listDeliveryAnchors()
    const restaurant = anchors.find((anchor) => anchor.placeId === 'seoul-myeongdong-kyoja-main')
    const destination = anchors.find((anchor) => anchor.kind === 'address')
    const created = store.createDeliveryJourney({
      orderId: 'food_order_delivery_2',
      restaurantAnchor: restaurant,
      destinationAnchor: destination,
      etaMinutes: 20,
    })
    const nextDestination = store.createDeliveryAddress({
      label: 'Studio',
      detail: 'Studio 2F',
      mapPackId: destination.mapPackId,
      position: destination.position,
    })
    const proposal = store.prepareDeliveryReroute({
      journeyId: created.journey.id,
      destinationAnchor: nextDestination.anchor,
      expectedAddressRevision: 1,
    })

    expect(proposal).toMatchObject({ ok: true })
    const initialEstimate = store.getDeliveryJourneyEstimateReference(created.journey.id, Date.now())
    const rerouteAt = Date.now() + 1000
    const committed = store.commitDeliveryReroute({
      proposal: proposal.proposal,
      etaMinutes: 8,
      now: rerouteAt,
    })
    expect(committed).toMatchObject({ ok: true })
    expect(committed.journey).toMatchObject({
      phase: 'rerouting',
      addressRevision: 2,
      routeRevision: 2,
      destination: { detail: 'Studio 2F' },
    })
    expect(initialEstimate).toMatchObject({ journeyRevision: 1, sourceModule: 'map' })
    expect(store.getDeliveryJourneyEstimateReference(created.journey.id, rerouteAt)).toMatchObject({
      journeyRevision: 2,
      state: 'rerouting',
      etaAt: rerouteAt + 8 * 60 * 1000,
      remainingSeconds: 8 * 60,
      calculatedAt: rerouteAt,
      sourceModule: 'map',
    })
    expect(
      store.prepareDeliveryReroute({
        journeyId: created.journey.id,
        destinationAnchor: destination,
        expectedAddressRevision: 1,
      }),
    ).toMatchObject({ ok: false, reason: 'delivery_journey_revision_stale' })
  })
})
