import { normalizeEventTemplateV2 } from './event-instance-v2'

export const WORK_HUB_EVENT_TEMPLATE_ID = Object.freeze({
  WORK_SCHEDULE_CHANGE: 'organization.work_schedule_change.v1',
})

export const WORK_HUB_OWNER_ACTION_KEY = Object.freeze({
  REVIEW_SCHEDULE_CHANGE: 'work_hub.schedule_change.request_review',
})

export const WORK_HUB_SCHEDULE_CHANGE_FACT_TYPE = 'work_hub.schedule_change_reviewed'

export const WORK_HUB_SCHEDULE_CHANGE_RESULT = Object.freeze({
  ACCEPTED: 'schedule_change_accepted',
  ADJUSTMENT_REQUESTED: 'schedule_change_adjustment_requested',
  DECLINED: 'schedule_change_declined',
  EXPIRED: 'schedule_change_expired',
  STALE: 'schedule_change_stale',
  REVOKED: 'schedule_change_revoked',
  WRITE_FAILED: 'schedule_change_write_failed',
  POLICY_OFF: 'schedule_change_event_policy_off',
  COOLDOWN: 'schedule_change_event_cooldown',
  DAILY_LIMIT: 'schedule_change_event_daily_limit',
  RANDOM_MISS: 'schedule_change_event_random_miss',
})

export const WORK_HUB_SCHEDULE_CHANGE_ENTRY = Object.freeze({
  ELIGIBLE: 'eligible',
  POLICY_OFF: 'policy_off',
  COOLDOWN: 'cooldown',
  DAILY_LIMIT: 'daily_limit',
})

const RAW_WORK_SCHEDULE_CHANGE_TEMPLATE = {
  schemaVersion: 2,
  id: WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE,
  startNodeId: 'entry_gate',
  nodes: [
    {
      id: 'entry_gate',
      kind: 'branch',
      contextKey: 'event_entry_disposition',
      cases: {
        [WORK_HUB_SCHEDULE_CHANGE_ENTRY.ELIGIBLE]: 'event_random_gate',
        [WORK_HUB_SCHEDULE_CHANGE_ENTRY.POLICY_OFF]: 'policy_off',
        [WORK_HUB_SCHEDULE_CHANGE_ENTRY.COOLDOWN]: 'cooldown',
        [WORK_HUB_SCHEDULE_CHANGE_ENTRY.DAILY_LIMIT]: 'daily_limit',
      },
      defaultNodeId: 'policy_off',
    },
    {
      id: 'event_random_gate',
      kind: 'random_gate',
      decisionKey: 'work_schedule_change_event_gate',
      seedSuffix: 'organization_work_schedule_change_v1',
      outcomes: [
        { id: 'triggered', weight: 35, nextNodeId: 'request_work_hub_review' },
        { id: 'ordinary_only', weight: 65, nextNodeId: 'random_miss' },
      ],
    },
    {
      id: 'request_work_hub_review',
      kind: 'request_action',
      actionKey: WORK_HUB_OWNER_ACTION_KEY.REVIEW_SCHEDULE_CHANGE,
      targetModule: 'work_hub',
      contextRefKeys: [
        'work_hub_package_id',
        'work_hub_package_revision',
        'organization_id',
        'membership_id',
        'schedule_proposal_id',
        'schedule_proposal_revision',
        'previous_schedule_proposal_id',
        'previous_schedule_proposal_revision',
        'decision_deadline_at',
        'world_revision',
        'contacts_profile_id',
        'contacts_profile_revision',
      ],
      nextNodeId: 'wait_work_hub_review',
    },
    {
      id: 'wait_work_hub_review',
      kind: 'await_fact',
      factTypes: [WORK_HUB_SCHEDULE_CHANGE_FACT_TYPE],
      resultCodeToNode: {
        [WORK_HUB_SCHEDULE_CHANGE_RESULT.ACCEPTED]: 'accepted',
        [WORK_HUB_SCHEDULE_CHANGE_RESULT.ADJUSTMENT_REQUESTED]: 'adjustment_requested',
        [WORK_HUB_SCHEDULE_CHANGE_RESULT.DECLINED]: 'declined',
        [WORK_HUB_SCHEDULE_CHANGE_RESULT.STALE]: 'stale',
        [WORK_HUB_SCHEDULE_CHANGE_RESULT.REVOKED]: 'revoked',
        [WORK_HUB_SCHEDULE_CHANGE_RESULT.WRITE_FAILED]: 'write_failed',
      },
      deadlineId: 'work_hub_review_deadline',
      deadlineContextKey: 'decision_deadline_at',
      onTimeout: 'expired',
    },
    { id: 'accepted', kind: 'terminal', lifecycle: 'resolved', resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.ACCEPTED },
    { id: 'adjustment_requested', kind: 'terminal', lifecycle: 'resolved', resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.ADJUSTMENT_REQUESTED },
    { id: 'declined', kind: 'terminal', lifecycle: 'resolved', resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.DECLINED },
    { id: 'expired', kind: 'terminal', lifecycle: 'resolved', resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.EXPIRED },
    { id: 'stale', kind: 'terminal', lifecycle: 'cancelled', resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.STALE },
    { id: 'revoked', kind: 'terminal', lifecycle: 'cancelled', resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.REVOKED },
    { id: 'write_failed', kind: 'terminal', lifecycle: 'failed', resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.WRITE_FAILED },
    { id: 'policy_off', kind: 'terminal', lifecycle: 'cancelled', resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.POLICY_OFF },
    { id: 'cooldown', kind: 'terminal', lifecycle: 'cancelled', resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.COOLDOWN },
    { id: 'daily_limit', kind: 'terminal', lifecycle: 'cancelled', resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.DAILY_LIMIT },
    { id: 'random_miss', kind: 'terminal', lifecycle: 'resolved', resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.RANDOM_MISS },
  ],
}

export const WORK_SCHEDULE_CHANGE_EVENT_TEMPLATE_V2 = normalizeEventTemplateV2(
  RAW_WORK_SCHEDULE_CHANGE_TEMPLATE,
)

export const BUILT_IN_WORK_HUB_EVENT_TEMPLATES = Object.freeze([
  WORK_SCHEDULE_CHANGE_EVENT_TEMPLATE_V2,
].filter(Boolean))

export const getBuiltInWorkHubEventTemplate = (templateId = '') =>
  BUILT_IN_WORK_HUB_EVENT_TEMPLATES.find((template) => template.id === templateId) || null
