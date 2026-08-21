import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  COMMERCE_EVENT_TEMPLATE_ID,
  getBuiltInCommerceEventTemplate,
} from '../src/lib/simulation/commerce-event-templates'
import {
  EVENT_INSTANCE_V2_LIFECYCLE,
} from '../src/lib/simulation/commerce-interaction-contracts'
import { createEventInstanceV2 } from '../src/lib/simulation/event-instance-v2'
import {
  migrateSimulationStorage,
  useSimulationStore,
} from '../src/stores/simulation'

const createRetentionFixtureInstances = (count = 241) => {
  const template = getBuiltInCommerceEventTemplate(
    COMMERCE_EVENT_TEMPLATE_ID.DESTINATION_CHANGE_AFTER_FULFILLMENT,
  )
  const baseTime = 1_800_000_000_000
  return Array.from({ length: count }, (_, index) => {
    const id = `event_retention_${index}`
    const instance = createEventInstanceV2({
      id,
      template,
      contextRefs: {
        order_id: `food_order_retention_${index}`,
        service_case_id:
          index === count - 1 ? 'service_case_long_running' : `service_case_${index}`,
        fulfillment_phase: 'en_route',
      },
      now: baseTime + index,
    })
    if (!instance) throw new Error(`Failed to create retention fixture ${id}`)
    if (index !== count - 1) return instance
    return {
      ...instance,
      lifecycle: EVENT_INSTANCE_V2_LIFECYCLE.RESOLVED,
      resultCodes: ['address_change_closed'],
      updatedAt: baseTime + index + 1,
    }
  })
}

describe('Simulation commerce Event Instance V2', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    setActivePinia(createPinia())
  })

  test('runs user-reported and latent-positive fixtures without event-specific store methods', () => {
    const store = useSimulationStore()
    store.resetForTesting()
    const reported = store.startEventInstanceV2({
      id: 'event_reported_problem',
      templateId: COMMERCE_EVENT_TEMPLATE_ID.USER_REPORTED_PROBLEM_FIXTURE,
      contextRefs: { order_id: 'food_order_1', service_case_id: 'case_1' },
      now: Date.now(),
    })
    expect(reported.instance).toMatchObject({
      lifecycle: 'active',
      currentNodeId: 'wait_case_review',
      pendingOwnerRequests: [{ actionKey: 'food_delivery.service_case.request_review' }],
    })
    const reviewRequest = reported.instance.pendingOwnerRequests[0]
    store.recordOwnerFactAndAdvance({
      schemaVersion: 1,
      id: 'fact_case_reviewed',
      type: 'food_delivery.service_case_reviewed',
      sourceModule: 'food_delivery',
      subjectRef: { kind: 'service_case', id: 'case_1', revision: 2 },
      correlationId: reported.instance.id,
      causationId: reviewRequest.id,
      resultCode: 'service_case_reviewed',
      refs: { owner_request_id: reviewRequest.id },
      occurredAt: Date.now() + 1,
    })
    expect(store.getEventInstanceV2(reported.instance.id)).toMatchObject({
      lifecycle: 'resolved',
      resultCodes: ['service_case_reviewed'],
    })

    const latent = store.startEventInstanceV2({
      id: 'event_latent_bonus',
      templateId: COMMERCE_EVENT_TEMPLATE_ID.LATENT_POSITIVE_FIXTURE,
      contextRefs: { order_id: 'food_order_2', fulfillment_id: 'fulfillment_2' },
      randomValues: { bonus_item_included: 0.1 },
      now: Date.now() + 2,
    })
    expect(latent.instance).toMatchObject({
      lifecycle: 'active',
      currentNodeId: 'wait_bonus_fact',
      decisionLedger: [{ key: 'bonus_item_included', outcome: 'included' }],
    })
    const bonusRequest = latent.instance.pendingOwnerRequests[0]
    store.recordOwnerFactAndAdvance({
      schemaVersion: 1,
      id: 'fact_bonus_persisted',
      type: 'food_delivery.bonus_item_persisted',
      sourceModule: 'food_delivery',
      subjectRef: { kind: 'fulfillment', id: 'fulfillment_2', revision: 1 },
      correlationId: latent.instance.id,
      causationId: bonusRequest.id,
      resultCode: 'bonus_item_persisted',
      refs: { owner_request_id: bonusRequest.id },
      occurredAt: Date.now() + 3,
    })
    expect(store.getEventInstanceV2(latent.instance.id)).toMatchObject({
      lifecycle: 'resolved',
      resultCodes: ['bonus_item_included'],
      decisionLedger: [{ outcome: 'included' }],
    })
  })

  test('migrates V4 pickup-triggered chains to read-only legacy audit without user intent', () => {
    const migrated = migrateSimulationStorage({
      version: 4,
      data: {
        eventInstances: [],
        eventReviewNotes: [],
        foodDeliveryCausalChains: [
          {
            id: 'food_delivery_causal_chain_order_legacy',
            eventId: 'food_delivery.delivery_address_change_escalation.v1',
            targetId: 'order_legacy',
            triggerSource: 'condition',
            currentNode: 'address_confirmation_required',
            status: 'active',
            ownerRecords: {
              foodOrderId: 'order_legacy',
              walletTransactionId: 'wallet_legacy',
              mapJourneyId: 'journey_legacy',
              conversationId: 'conversation_legacy',
            },
            resultCodes: ['address_confirmation_required'],
            createdAt: 1767225600000,
            updatedAt: 1767225600001,
          },
        ],
        settings: {},
      },
    })

    expect(Object.hasOwn(migrated, 'foodDeliveryCausalChains')).toBe(false)
    expect(migrated.legacyCommerceAuditEntries).toEqual([
      expect.objectContaining({
        targetId: 'order_legacy',
        provenance: 'legacy_reference_trigger',
        ownerRecords: expect.objectContaining({
          walletTransactionId: 'wallet_legacy',
          mapJourneyId: 'journey_legacy',
          conversationId: 'conversation_legacy',
        }),
        resultCodes: expect.arrayContaining(['legacy_reference_trigger']),
      }),
    ])
    expect(JSON.stringify(migrated)).not.toContain('user_service_interaction')

    const store = useSimulationStore()
    store.resetForTesting()
    expect(store.restoreFromBackup(migrated)).toBe(true)
    expect(store.legacyCommerceAuditEntries).toHaveLength(1)
    const snapshot = store.createBackupSnapshot()
    expect(Object.hasOwn(snapshot, 'foodDeliveryCausalChains')).toBe(false)
    expect(snapshot.legacyCommerceAuditEntries[0].provenance).toBe('legacy_reference_trigger')
  })

  test('round-trips V2 instances, owner facts, deadlines, and decisions through backup', () => {
    const store = useSimulationStore()
    store.resetForTesting()
    const started = store.startEventInstanceV2({
      id: 'event_timeout_roundtrip',
      templateId: COMMERCE_EVENT_TEMPLATE_ID.DESTINATION_CHANGE_AFTER_FULFILLMENT,
      contextRefs: {
        order_id: 'food_order_3',
        order_revision: 1,
        service_case_id: 'case_3',
        fulfillment_phase: 'en_route',
        journey_id: 'journey_3',
        expected_journey_revision: 1,
        destination_anchor_id: 'anchor_3',
      },
      randomValues: { rider_response_disposition: 0.9 },
      now: Date.now(),
    })
    store.recordOwnerFact({
      schemaVersion: 1,
      id: 'fact_request_3',
      type: 'food_delivery.address_change_requested',
      sourceModule: 'food_delivery',
      subjectRef: { kind: 'service_case', id: 'case_3', revision: 1 },
      correlationId: started.instance.id,
      causationId: 'trigger_3',
      resultCode: 'request_recorded',
      occurredAt: Date.now(),
    })
    const snapshot = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup(snapshot)).toBe(true)
    expect(store.getEventInstanceV2(started.instance.id)).toEqual(started.instance)
    expect(store.ownerFacts).toHaveLength(1)
    expect(store.eventInstanceV2RestoreReport).toMatchObject({
      inputCount: 1,
      restoredCount: 1,
      rejected: [],
    })
  })

  test('retains 241+ active and terminal instances through backup, close, and reopen', () => {
    const store = useSimulationStore()
    const instances = createRetentionFixtureInstances()
    expect(store.restoreFromBackup({ eventInstancesV2: instances })).toBe(true)
    expect(store.eventInstancesV2).toHaveLength(241)
    expect(store.getEventInstanceV2('event_retention_0')).toMatchObject({ lifecycle: 'active' })
    expect(store.getEventInstanceV2('event_retention_240')).toMatchObject({
      lifecycle: 'resolved',
      contextRefs: { service_case_id: 'service_case_long_running' },
    })

    for (let index = 0; index < 241; index += 1) {
      store.recordEventLog({
        id: `retention_log_${index}`,
        eventId: 'simulation.retention.test.v1',
        moduleKey: 'simulation',
        targetId: 'retention',
        status: 'skipped',
        at: 1_800_000_000_000 + index,
      })
    }
    expect(store.eventLogs).toHaveLength(240)

    const backup = store.createBackupSnapshot()
    store.resetForTesting()
    expect(store.restoreFromBackup(backup)).toBe(true)
    expect(store.eventInstancesV2).toHaveLength(241)
    expect(store.saveNow()).toMatchObject({ ok: true })

    setActivePinia(createPinia())
    const reopened = useSimulationStore()
    expect(reopened.eventInstancesV2).toHaveLength(241)
    expect(reopened.getEventInstanceV2('event_retention_240')).toMatchObject({
      lifecycle: 'resolved',
      contextRefs: { service_case_id: 'service_case_long_running' },
    })
    expect(
      reopened.closeEventInstanceV2({
        instanceId: 'event_retention_0',
        lifecycle: EVENT_INSTANCE_V2_LIFECYCLE.CANCELLED,
        resultCode: 'address_change_cancelled',
        now: 1_800_000_000_500,
      }),
    ).toMatchObject({ lifecycle: 'cancelled' })
    expect(reopened.saveNow()).toMatchObject({ ok: true })

    setActivePinia(createPinia())
    const reopenedAfterClose = useSimulationStore()
    expect(reopenedAfterClose.eventInstancesV2).toHaveLength(241)
    expect(reopenedAfterClose.getEventInstanceV2('event_retention_0')).toMatchObject({
      lifecycle: 'cancelled',
      resultCodes: ['address_change_cancelled'],
    })
    expect(reopenedAfterClose.getEventInstanceV2('event_retention_240')).toMatchObject({
      lifecycle: 'resolved',
    })
  })

  test('migrates a V6 carrier without reapplying the former 240-instance cap', () => {
    const instances = createRetentionFixtureInstances()
    localStorage.setItem(
      'schatphone:store:simulation',
      JSON.stringify({
        version: 6,
        savedAt: Date.now(),
        data: { eventInstancesV2: instances, settings: {} },
      }),
    )

    const store = useSimulationStore()
    expect(store.eventInstancesV2).toHaveLength(241)
    expect(store.getEventInstanceV2('event_retention_240')).toMatchObject({
      lifecycle: 'resolved',
    })
    expect(store.createBackupSnapshot().eventInstancesV2).toHaveLength(241)
  })

  test('restores the complete prior instance array when the expanded save fails', () => {
    const store = useSimulationStore()
    const instances = createRetentionFixtureInstances()
    expect(store.restoreFromBackup({ eventInstancesV2: instances })).toBe(true)
    expect(store.saveNow()).toMatchObject({ ok: true })
    const originalSetItem = Storage.prototype.setItem
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      key,
      value,
    ) {
      if (key === 'schatphone:store:simulation') {
        throw new DOMException('quota', 'QuotaExceededError')
      }
      return originalSetItem.call(this, key, value)
    })

    const result = store.startEventInstanceV2({
      id: 'event_retention_241',
      templateId: COMMERCE_EVENT_TEMPLATE_ID.DESTINATION_CHANGE_AFTER_FULFILLMENT,
      contextRefs: {
        order_id: 'food_order_retention_241',
        service_case_id: 'service_case_241',
        fulfillment_phase: 'en_route',
      },
      now: 1_800_000_000_600,
    })

    expect(result).toMatchObject({ ok: false, changed: false, reason: 'quota_exceeded' })
    expect(store.eventInstancesV2).toHaveLength(241)
    expect(store.getEventInstanceV2('event_retention_241')).toBeNull()
    expect(store.getEventInstanceV2('event_retention_240')).not.toBeNull()
    setItemSpy.mockRestore()
  })
})
