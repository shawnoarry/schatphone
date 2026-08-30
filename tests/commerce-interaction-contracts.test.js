import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  normalizeCommerceInteractionTriggerV1,
  normalizeCommerceOrderReferenceV1,
  normalizeCommerceServiceCaseReferenceV1,
  normalizeEventInstanceV2,
  normalizeInteractionResolutionV1,
  normalizeMapJourneyEstimateReferenceV1,
  normalizeOwnerActionRequestV1,
  normalizeOwnerFactV1,
} from '../src/lib/simulation/commerce-interaction-contracts'
import {
  advanceEventInstanceV2,
  createEventInstanceV2,
  normalizeEventTemplateV2,
} from '../src/lib/simulation/event-instance-v2'

const fixture = JSON.parse(
  readFileSync(
    resolve('tests/fixtures/events/commerce-interaction-v1/contracts-v1.json'),
    'utf8',
  ),
)

const template = {
  schemaVersion: 2,
  id: 'commerce.fixture.v1',
  startNodeId: 'eligible',
  nodes: [
    {
      id: 'eligible',
      kind: 'condition',
      contextKey: 'fulfillment_phase',
      operator: 'in',
      value: ['rider_pickup', 'en_route'],
      onTrue: 'response_gate',
      onFalse: 'not_eligible',
    },
    {
      id: 'response_gate',
      kind: 'random_gate',
      decisionKey: 'rider_response',
      outcomes: [
        { id: 'accepted', weight: 1, nextNodeId: 'request_reroute' },
        { id: 'no_response', weight: 1, nextNodeId: 'response_timeout' },
      ],
    },
    {
      id: 'request_reroute',
      kind: 'request_action',
      actionKey: 'map.delivery_journey.request_reroute',
      targetModule: 'map',
      contextRefKeys: ['journey_id', 'destination_anchor_id'],
      nextNodeId: 'wait_reroute',
    },
    {
      id: 'wait_reroute',
      kind: 'await_fact',
      factTypes: ['map.delivery_rerouted', 'map.delivery_reroute_rejected'],
      resultCodeToNode: {
        delivery_rerouted: 'result_branch',
        delivery_reroute_rejected: 'reroute_failed',
      },
    },
    {
      id: 'result_branch',
      kind: 'branch',
      contextKey: 'requested_outcome',
      cases: { changed: 'changed' },
      defaultNodeId: 'reroute_failed',
    },
    {
      id: 'response_timeout',
      kind: 'timeout',
      deadlineId: 'rider_response_deadline',
      durationMs: 60000,
      onExpired: 'expired',
    },
    { id: 'changed', kind: 'terminal', lifecycle: 'resolved', resultCode: 'delivery_rerouted' },
    { id: 'expired', kind: 'terminal', lifecycle: 'resolved', resultCode: 'change_request_expired' },
    { id: 'reroute_failed', kind: 'terminal', lifecycle: 'failed', resultCode: 'reroute_rejected' },
    { id: 'not_eligible', kind: 'terminal', lifecycle: 'cancelled', resultCode: 'order_closed_before_resolution' },
  ],
}

describe('commerce interaction shared contracts', () => {
  test('normalizes every frozen V1 interface fixture', () => {
    expect(normalizeCommerceOrderReferenceV1(fixture.orderRef, { mutationCapable: true })).toEqual(
      fixture.orderRef,
    )
    expect(normalizeCommerceInteractionTriggerV1(fixture.trigger)).toMatchObject(fixture.trigger)
    expect(normalizeCommerceServiceCaseReferenceV1(fixture.serviceCaseRef)).toEqual(
      fixture.serviceCaseRef,
    )
    expect(normalizeOwnerFactV1(fixture.ownerFact)).toEqual({ ...fixture.ownerFact, refs: {} })
    expect(normalizeOwnerActionRequestV1(fixture.ownerRequest)).toMatchObject(fixture.ownerRequest)
    expect(normalizeInteractionResolutionV1(fixture.resolution)).toEqual(fixture.resolution)
    expect(normalizeMapJourneyEstimateReferenceV1(fixture.mapEstimate)).toEqual(fixture.mapEstimate)
  })

  test('fails closed for missing user intent, stale mutation refs, and unsupported phone evidence', () => {
    expect(normalizeCommerceOrderReferenceV1({ ...fixture.orderRef, ownerRevision: 0 }, { mutationCapable: true })).toBeNull()
    expect(normalizeCommerceInteractionTriggerV1({ ...fixture.trigger, initiatedBy: 'model' })).toBeNull()
    expect(normalizeCommerceInteractionTriggerV1({ ...fixture.trigger, orderRef: null })).toBeNull()
    expect(
      normalizeInteractionResolutionV1({
        ...fixture.resolution,
        commitments: [{ ...fixture.resolution.commitments[0], evidenceMessageIds: [] }],
      }),
    ).toBeNull()
  })
})

describe('generic Event Instance V2 execution', () => {
  test('persists a random decision once and treats an owner request as pending evidence', () => {
    expect(normalizeEventTemplateV2(template)).not.toBeNull()
    const instance = createEventInstanceV2({
      id: 'event_instance_123',
      template,
      contextRefs: {
        fulfillment_phase: 'en_route',
        journey_id: 'journey_4',
        destination_anchor_id: 'anchor_8',
        requested_outcome: 'changed',
      },
      worldBinding: {
        worldId: 'world_local_primary',
        semanticVersionId: 'semantic_1_abcdef123456',
        semanticManifestRevision: 1,
        semanticManifestHash: 'a'.repeat(64),
        semanticSourceFingerprint: 'b'.repeat(64),
      },
      now: 1786720000000,
    })
    expect(instance.contextRefs).toMatchObject({
      world_id: 'world_local_primary',
      world_semantic_version_id: 'semantic_1_abcdef123456',
      world_semantic_manifest_revision: 1,
      world_semantic_manifest_hash: 'a'.repeat(64),
      world_semantic_source_fingerprint: 'b'.repeat(64),
    })
    const pending = advanceEventInstanceV2({
      instance,
      template,
      randomValues: { rider_response: 0.1 },
      now: 1786720000000,
    })
    expect(pending.ok).toBe(true)
    expect(pending.instance.currentNodeId).toBe('wait_reroute')
    expect(pending.instance.lifecycle).toBe('active')
    expect(pending.instance.decisionLedger).toHaveLength(1)
    expect(pending.instance.pendingOwnerRequests).toHaveLength(1)

    const replay = advanceEventInstanceV2({
      instance: pending.instance,
      template,
      randomValues: { rider_response: 0.99 },
      now: 1786720000500,
    })
    expect(replay.instance.decisionLedger).toEqual(pending.instance.decisionLedger)
    expect(replay.instance.lifecycle).toBe('active')

    const completed = advanceEventInstanceV2({
      instance: replay.instance,
      template,
      ownerFacts: [fixture.ownerFact],
      now: 1786720001000,
    })
    expect(completed.instance.lifecycle).toBe('resolved')
    expect(completed.instance.resultCodes).toContain('delivery_rerouted')
    expect(completed.instance.pendingOwnerRequests[0]).toMatchObject({
      status: 'accepted',
      resultFactId: fixture.ownerFact.id,
    })
  })

  test('uses an absolute persisted deadline and reconciles it idempotently', () => {
    const instance = createEventInstanceV2({
      id: 'event_instance_timeout',
      template,
      contextRefs: { fulfillment_phase: 'en_route' },
      now: 1786720000000,
    })
    const scheduled = advanceEventInstanceV2({
      instance,
      template,
      randomValues: { rider_response: 0.9 },
      now: 1786720000000,
    })
    expect(scheduled.instance.currentNodeId).toBe('response_timeout')
    expect(scheduled.instance.deadlines).toEqual([
      { id: 'rider_response_deadline', dueAt: 1786720060000, reconciledAt: 0 },
    ])
    const pending = advanceEventInstanceV2({
      instance: scheduled.instance,
      template,
      now: 1786720059999,
    })
    expect(pending.instance.lifecycle).toBe('active')
    const expired = advanceEventInstanceV2({
      instance: pending.instance,
      template,
      now: 1786720060000,
    })
    expect(expired.instance.lifecycle).toBe('resolved')
    expect(expired.instance.resultCodes).toContain('change_request_expired')
    expect(expired.instance.deadlines[0].reconciledAt).toBe(1786720060000)
    expect(normalizeEventInstanceV2(expired.instance)).toEqual(expired.instance)
  })
})
