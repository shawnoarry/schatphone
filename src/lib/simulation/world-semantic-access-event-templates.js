import { normalizeEventTemplateV2 } from './event-instance-v2'
import { WORLD_SEMANTIC_ACCESS_RESULT } from './world-semantic-access-runtime'

export const WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_ID =
  'world_semantic.restricted_place_access.v1'
export const WORLD_SEMANTIC_ACCESS_OWNER_ACTION_KEY = 'map.access.validate'
export const WORLD_SEMANTIC_ACCESS_FACT_TYPE = 'map.restricted_place_access_validated'

export const WORLD_SEMANTIC_ACCESS_EVENT_RESULT = Object.freeze({
  GRANTED_ROUTINE: 'semantic_access_granted_routine',
  GRANTED_REVIEWED: 'semantic_access_granted_reviewed',
  DENIED: WORLD_SEMANTIC_ACCESS_RESULT.DENIED,
  ACTOR_EVIDENCE_MISSING: WORLD_SEMANTIC_ACCESS_RESULT.ACTOR_EVIDENCE_MISSING,
  ACTOR_EVIDENCE_STALE: WORLD_SEMANTIC_ACCESS_RESULT.ACTOR_EVIDENCE_STALE,
})

export const WORLD_SEMANTIC_ACCESS_RANDOM_DECISION_KEY = 'restricted_place_check_tone'

const RAW_WORLD_SEMANTIC_ACCESS_TEMPLATE = {
  schemaVersion: 2,
  id: WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_ID,
  startNodeId: 'request_map_access_validation',
  nodes: [
    {
      id: 'request_map_access_validation',
      kind: 'request_action',
      actionKey: WORLD_SEMANTIC_ACCESS_OWNER_ACTION_KEY,
      targetModule: 'map',
      contextRefKeys: [
        'map_pack_id',
        'map_pack_version',
        'place_id',
        'place_concept_id',
        'work_hub_package_id',
        'work_hub_package_revision',
        'membership_id',
        'actor_concept_id',
        'semantic_bridge_id',
        'semantic_capability_id',
        'position_evidence_at',
      ],
      nextNodeId: 'wait_map_access_validation',
    },
    {
      id: 'wait_map_access_validation',
      kind: 'await_fact',
      factTypes: [WORLD_SEMANTIC_ACCESS_FACT_TYPE],
      resultCodeToNode: {
        [WORLD_SEMANTIC_ACCESS_RESULT.GRANTED]: 'granted_random_gate',
        [WORLD_SEMANTIC_ACCESS_RESULT.DENIED]: 'denied',
        [WORLD_SEMANTIC_ACCESS_RESULT.ACTOR_EVIDENCE_MISSING]: 'actor_evidence_missing',
        [WORLD_SEMANTIC_ACCESS_RESULT.ACTOR_EVIDENCE_STALE]: 'actor_evidence_stale',
      },
      defaultNodeId: 'denied',
    },
    {
      id: 'granted_random_gate',
      kind: 'random_gate',
      decisionKey: WORLD_SEMANTIC_ACCESS_RANDOM_DECISION_KEY,
      seedSuffix: 'world_semantic_restricted_place_access_v1',
      outcomes: [
        { id: 'routine', weight: 80, nextNodeId: 'granted_routine' },
        { id: 'reviewed', weight: 20, nextNodeId: 'granted_reviewed' },
      ],
    },
    {
      id: 'granted_routine',
      kind: 'terminal',
      lifecycle: 'resolved',
      resultCode: WORLD_SEMANTIC_ACCESS_EVENT_RESULT.GRANTED_ROUTINE,
    },
    {
      id: 'granted_reviewed',
      kind: 'terminal',
      lifecycle: 'resolved',
      resultCode: WORLD_SEMANTIC_ACCESS_EVENT_RESULT.GRANTED_REVIEWED,
    },
    {
      id: 'denied',
      kind: 'terminal',
      lifecycle: 'resolved',
      resultCode: WORLD_SEMANTIC_ACCESS_EVENT_RESULT.DENIED,
    },
    {
      id: 'actor_evidence_missing',
      kind: 'terminal',
      lifecycle: 'resolved',
      resultCode: WORLD_SEMANTIC_ACCESS_EVENT_RESULT.ACTOR_EVIDENCE_MISSING,
    },
    {
      id: 'actor_evidence_stale',
      kind: 'terminal',
      lifecycle: 'cancelled',
      resultCode: WORLD_SEMANTIC_ACCESS_EVENT_RESULT.ACTOR_EVIDENCE_STALE,
    },
  ],
}

export const WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2 = normalizeEventTemplateV2(
  RAW_WORLD_SEMANTIC_ACCESS_TEMPLATE,
)
