import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  buildFoodDeliverySharedMealRelationshipSuggestion,
  buildMapSharedRouteRelationshipSuggestion,
  buildPhoneCallRelationshipSuggestion,
  buildShoppingGiftRelationshipSuggestion,
  buildWalletSharedTransferRelationshipSuggestion,
  recordFoodDeliverySharedMealRelationshipFact,
  recordMapSharedRouteRelationshipFact,
  recordPhoneCallRelationshipFact,
  recordShoppingGiftRelationshipFact,
  recordWalletSharedTransferRelationshipFact,
} from '../src/lib/relationship-fact-adapters'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'

describe('relationship fact adapters', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('records shopping gift facts once per order source', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const order = {
      id: 'shopping_order_1',
      totalCents: 6800,
      currency: 'CNY',
      giftRecipient: {
        name: 'Eva',
        contactId: 1,
        profileId: 1,
        kind: 'role',
      },
      items: [{ title: 'Moon Lamp', quantity: 1, unitPriceCents: 6800, currency: 'CNY' }],
    }

    const suggestion = buildShoppingGiftRelationshipSuggestion({ relationshipRuntimeStore, order })

    expect(suggestion).toMatchObject({
      available: true,
      imported: false,
      targetName: 'Eva',
    })

    const firstEvent = recordShoppingGiftRelationshipFact({
      relationshipRuntimeStore,
      order,
      transaction: { amount: '68.00', currency: 'CNY' },
    })
    const secondEvent = recordShoppingGiftRelationshipFact({
      relationshipRuntimeStore,
      order,
      transaction: { amount: '68.00', currency: 'CNY' },
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 1, contactId: 1, name: 'Eva' })

    expect(secondEvent.id).toBe(firstEvent.id)
    expect(relationshipRuntimeStore.events).toHaveLength(1)
    expect(summary.metrics.affinity).toBe(58)
    expect(summary.metrics.intimacy).toBe(24)
    expect(summary.latestEventSummary).toContain('Gift purchased')
  })

  test('records optional food delivery shared-meal facts for the selected target', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const order = {
      id: 'food_order_1',
      restaurantName: 'Moon Bistro',
      totalCents: 4200,
      currency: 'CNY',
      items: [{ title: 'Shared Bento', quantity: 1, unitPriceCents: 4200, currency: 'CNY' }],
    }
    const target = {
      id: 2,
      profileId: 2,
      kind: 'role',
      name: 'Jackie',
    }

    const suggestion = buildFoodDeliverySharedMealRelationshipSuggestion({
      relationshipRuntimeStore,
      order,
      target,
    })
    const event = recordFoodDeliverySharedMealRelationshipFact({
      relationshipRuntimeStore,
      order,
      target,
      transaction: { amount: '42.00', currency: 'CNY', counterparty: 'Moon Bistro' },
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 2, contactId: 2, name: 'Jackie' })

    expect(suggestion).toMatchObject({
      available: true,
      imported: false,
      targetName: 'Jackie',
    })
    expect(event.summary).toContain('Shared meal')
    expect(summary.metrics.affinity).toBe(56)
    expect(summary.metrics.intimacy).toBe(25)
    expect(summary.growthTraits).toContain('shared-meal')
  })

  test('records phone call facts without duplicating the same call source', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const call = {
      id: 'phone_call_1',
      direction: 'incoming',
      status: 'completed',
      durationSec: 180,
    }
    const target = {
      id: 1,
      profileId: 1,
      kind: 'role',
      name: 'Eva',
    }

    const suggestion = buildPhoneCallRelationshipSuggestion({
      relationshipRuntimeStore,
      call,
      target,
    })
    const firstEvent = recordPhoneCallRelationshipFact({
      relationshipRuntimeStore,
      call,
      target,
    })
    const secondEvent = recordPhoneCallRelationshipFact({
      relationshipRuntimeStore,
      call,
      target,
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(target)

    expect(suggestion).toMatchObject({
      available: true,
      imported: false,
      targetName: 'Eva',
    })
    expect(secondEvent.id).toBe(firstEvent.id)
    expect(relationshipRuntimeStore.events).toHaveLength(1)
    expect(firstEvent.factType).toBe('completed_call')
    expect(summary.metrics.affinity).toBe(54)
    expect(summary.growthTraits).toContain('call-memory')
  })

  test('records shared map routes for the selected companion', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const trip = {
      id: 'trip_hist_1',
      fromLabel: 'Dorm',
      toLabel: 'Library',
      distanceKm: 3.2,
    }
    const target = {
      id: 2,
      profileId: 2,
      kind: 'role',
      name: 'Jackie',
    }

    const suggestion = buildMapSharedRouteRelationshipSuggestion({
      relationshipRuntimeStore,
      trip,
      target,
    })
    const event = recordMapSharedRouteRelationshipFact({
      relationshipRuntimeStore,
      trip,
      target,
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(target)

    expect(suggestion).toMatchObject({
      available: true,
      sourceId: 'trip_hist_1:shared_route:role_2',
    })
    expect(event.summary).toContain('Dorm to Library')
    expect(event.factType).toBe('shared_route')
    expect(summary.metrics.affinity).toBe(55)
    expect(summary.growthTraits).toContain('shared-route')
  })

  test('records wallet transfers and shared expenses for the selected target', () => {
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    relationshipRuntimeStore.resetForTesting()
    const transaction = {
      id: 'wallet_tx_1',
      type: 'expense',
      title: 'Shared taxi',
      amountCents: 8800,
      currency: 'CNY',
    }
    const target = {
      id: 1,
      profileId: 1,
      kind: 'role',
      name: 'Eva',
    }

    const suggestion = buildWalletSharedTransferRelationshipSuggestion({
      relationshipRuntimeStore,
      transaction,
      target,
    })
    const event = recordWalletSharedTransferRelationshipFact({
      relationshipRuntimeStore,
      transaction,
      target,
    })
    const summary = relationshipRuntimeStore.summarizeEntityForTarget(target)

    expect(suggestion).toMatchObject({
      available: true,
      sourceId: 'wallet_tx_1:shared_transfer:role_1',
    })
    expect(event.factType).toBe('shared_expense')
    expect(event.summary).toContain('Shared taxi')
    expect(summary.metrics.trust).toBe(54)
    expect(summary.growthTraits).toContain('wallet')
  })
})
