import { describe, expect, test } from 'vitest'
import {
  createEventInstanceV2,
  advanceEventInstanceV2,
} from '../src/lib/simulation/event-instance-v2'
import {
  WORLD_SEMANTIC_ACCESS_EVENT_RESULT,
  WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2,
  WORLD_SEMANTIC_ACCESS_RANDOM_DECISION_KEY,
} from '../src/lib/simulation/world-semantic-access-event-templates'
import {
  createWorldSemanticAccessEventContext,
  createWorldSemanticAccessEventInstanceId,
  createWorldSemanticAccessOwnerFact,
  isWorldSemanticAccessGrantedInstance,
} from '../src/lib/simulation/world-semantic-access-event-runtime'
import { WORLD_SEMANTIC_ACCESS_RESULT } from '../src/lib/simulation/world-semantic-access-runtime'

const NOW = 1_788_120_000_000
const worldBinding = {
  worldId: 'world:magic_academy',
  semanticVersionId: 'semantic_1_abc123',
  semanticManifestRevision: 1,
  semanticManifestHash: 'a'.repeat(64),
  semanticSourceFingerprint: 'b'.repeat(64),
}
const access = {
  code: WORLD_SEMANTIC_ACCESS_RESULT.GRANTED,
  bridgeId: 'magic_academy:bridge_warded_archive_access',
  capabilityId: 'magic_academy:warded_archive_access',
  actorConceptId: 'magic_academy:oathbound_student',
  placeConceptId: 'magic_academy:silver_ward_archive',
  worldBinding,
  actorEvidenceRef: {
    sourceOwner: 'work_hub',
    packageId: 'academy_authority',
    packageRevision: 1,
    membershipId: 'membership_self',
    profileId: 'self',
    profileRevision: 1,
  },
  placeEvidenceRef: {
    sourceOwner: 'map',
    mapPackId: 'academy-map',
    mapPackVersion: 1,
    placeId: 'silver-archive',
  },
}

describe('world semantic access Event Instance V2 runtime', () => {
  test('persists one Map request, owner fact, and deterministic access-check decision', () => {
    const positionEvidenceAt = NOW - 1000
    const id = createWorldSemanticAccessEventInstanceId({
      worldBinding,
      placeEvidence: access.placeEvidenceRef,
      positionEvidenceAt,
    })
    const created = createEventInstanceV2({
      id,
      template: WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2,
      contextRefs: createWorldSemanticAccessEventContext({ access, positionEvidenceAt }),
      worldBinding,
      now: NOW,
    })
    const waiting = advanceEventInstanceV2({
      instance: created,
      template: WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2,
      now: NOW,
    })

    expect(waiting.ok).toBe(true)
    expect(waiting.instance.currentNodeId).toBe('wait_map_access_validation')
    expect(waiting.instance.pendingOwnerRequests).toHaveLength(1)
    const ownerRequest = waiting.instance.pendingOwnerRequests[0]
    const fact = createWorldSemanticAccessOwnerFact({
      instance: waiting.instance,
      ownerRequest,
      access,
      now: NOW + 1,
    })
    const resolved = advanceEventInstanceV2({
      instance: waiting.instance,
      template: WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2,
      ownerFacts: [fact],
      randomValues: { [WORLD_SEMANTIC_ACCESS_RANDOM_DECISION_KEY]: 0.95 },
      now: NOW + 1,
    })

    expect(resolved.ok).toBe(true)
    expect(isWorldSemanticAccessGrantedInstance(resolved.instance)).toBe(true)
    expect(resolved.instance.resultCodes).toContain(
      WORLD_SEMANTIC_ACCESS_EVENT_RESULT.GRANTED_REVIEWED,
    )
    expect(resolved.instance.decisionLedger).toEqual([
      expect.objectContaining({
        key: WORLD_SEMANTIC_ACCESS_RANDOM_DECISION_KEY,
        outcome: 'reviewed',
        randomValue: 0.95,
      }),
    ])

    const replay = advanceEventInstanceV2({
      instance: resolved.instance,
      template: WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2,
      ownerFacts: [fact],
      randomValues: { [WORLD_SEMANTIC_ACCESS_RANDOM_DECISION_KEY]: 0.01 },
      now: NOW + 10,
    })
    expect(replay.changed).toBe(false)
    expect(replay.instance.decisionLedger).toEqual(resolved.instance.decisionLedger)
  })

  test('records a missing credential as a terminal owner result without random settlement', () => {
    const deniedAccess = {
      ...access,
      code: WORLD_SEMANTIC_ACCESS_RESULT.ACTOR_EVIDENCE_MISSING,
      actorConceptId: '',
      actorEvidenceRef: null,
    }
    const id = createWorldSemanticAccessEventInstanceId({
      worldBinding,
      placeEvidence: deniedAccess.placeEvidenceRef,
      positionEvidenceAt: NOW,
    })
    const created = createEventInstanceV2({
      id,
      template: WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2,
      contextRefs: createWorldSemanticAccessEventContext({ access: deniedAccess, positionEvidenceAt: NOW }),
      worldBinding,
      now: NOW,
    })
    const waiting = advanceEventInstanceV2({
      instance: created,
      template: WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2,
      now: NOW,
    })
    const fact = createWorldSemanticAccessOwnerFact({
      instance: waiting.instance,
      ownerRequest: waiting.instance.pendingOwnerRequests[0],
      access: deniedAccess,
      now: NOW + 1,
    })
    const resolved = advanceEventInstanceV2({
      instance: waiting.instance,
      template: WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2,
      ownerFacts: [fact],
      now: NOW + 1,
    })

    expect(resolved.instance.resultCodes).toContain(
      WORLD_SEMANTIC_ACCESS_EVENT_RESULT.ACTOR_EVIDENCE_MISSING,
    )
    expect(resolved.instance.decisionLedger).toEqual([])
    expect(isWorldSemanticAccessGrantedInstance(resolved.instance)).toBe(false)
  })
})
