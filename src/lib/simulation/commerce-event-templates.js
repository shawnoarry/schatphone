import { normalizeEventTemplateV2 } from './event-instance-v2'

export const COMMERCE_EVENT_TEMPLATE_ID = Object.freeze({
  DESTINATION_CHANGE_AFTER_FULFILLMENT: 'commerce.destination_change_after_fulfillment.v1',
  USER_REPORTED_PROBLEM_FIXTURE: 'commerce.user_reported_problem.fixture.v1',
  LATENT_POSITIVE_FIXTURE: 'commerce.latent_positive_fulfillment.fixture.v1',
})

export const COMMERCE_OWNER_ACTION_KEY = Object.freeze({
  APPLY_DESTINATION_CHANGE: 'food_delivery.service_case.apply_destination_change',
  RECORD_RIDER_ACCEPTANCE: 'food_delivery.service_case.record_rider_acceptance',
  RECORD_RIDER_DECLINE: 'food_delivery.service_case.record_rider_decline',
  OFFER_PHONE_CONTACT: 'food_delivery.service_case.offer_phone_contact',
  VALIDATE_PHONE_RESOLUTION: 'food_delivery.service_case.validate_phone_resolution',
  REQUEST_MAP_REROUTE: 'map.delivery_journey.request_reroute',
})

const RAW_DESTINATION_CHANGE_TEMPLATE = {
  schemaVersion: 2,
  id: COMMERCE_EVENT_TEMPLATE_ID.DESTINATION_CHANGE_AFTER_FULFILLMENT,
  startNodeId: 'before_pickup',
  nodes: [
    {
      id: 'before_pickup',
      kind: 'condition',
      contextKey: 'fulfillment_phase',
      operator: 'in',
      value: ['created', 'cooking', 'heading_to_pickup'],
      onTrue: 'apply_destination_before_pickup',
      onFalse: 'rider_response_gate',
    },
    {
      id: 'apply_destination_before_pickup',
      kind: 'request_action',
      actionKey: COMMERCE_OWNER_ACTION_KEY.APPLY_DESTINATION_CHANGE,
      targetModule: 'food_delivery',
      contextRefKeys: [
        'service_case_id',
        'order_id',
        'destination_anchor_id',
        'order_revision',
        'fulfillment_phase',
      ],
      staticContextRefs: { timing: 'before_pickup' },
      nextNodeId: 'wait_destination_before_pickup',
    },
    {
      id: 'wait_destination_before_pickup',
      kind: 'await_fact',
      factTypes: [
        'food_delivery.destination_change_committed',
        'food_delivery.destination_change_rejected',
      ],
      resultCodeToNode: {
        destination_change_committed: 'has_map_journey_before_pickup',
        destination_change_rejected: 'destination_change_rejected',
      },
    },
    {
      id: 'has_map_journey_before_pickup',
      kind: 'condition',
      contextKey: 'journey_id',
      operator: 'exists',
      value: true,
      onTrue: 'request_map_reroute_before_pickup',
      onFalse: 'changed_before_pickup',
    },
    {
      id: 'request_map_reroute_before_pickup',
      kind: 'request_action',
      actionKey: COMMERCE_OWNER_ACTION_KEY.REQUEST_MAP_REROUTE,
      targetModule: 'map',
      contextRefKeys: [
        'journey_id',
        'destination_anchor_id',
        'expected_journey_revision',
        'service_case_id',
      ],
      nextNodeId: 'wait_map_reroute_before_pickup',
    },
    {
      id: 'wait_map_reroute_before_pickup',
      kind: 'await_fact',
      factTypes: ['map.delivery_rerouted', 'map.delivery_reroute_rejected'],
      resultCodeToNode: {
        delivery_rerouted: 'changed_before_pickup',
        delivery_reroute_rejected: 'destination_change_rejected',
      },
    },
    {
      id: 'rider_response_gate',
      kind: 'random_gate',
      decisionKey: 'rider_response_disposition',
      seedSuffix: 'destination_change_v1',
      outcomes: [
        { id: 'accepted', weight: 3, nextNodeId: 'record_rider_acceptance' },
        { id: 'declined', weight: 2, nextNodeId: 'record_rider_decline' },
        { id: 'no_response', weight: 5, nextNodeId: 'rider_response_timeout' },
      ],
    },
    {
      id: 'record_rider_acceptance',
      kind: 'request_action',
      actionKey: COMMERCE_OWNER_ACTION_KEY.RECORD_RIDER_ACCEPTANCE,
      targetModule: 'food_delivery',
      contextRefKeys: ['service_case_id', 'order_id'],
      nextNodeId: 'wait_rider_response',
    },
    {
      id: 'record_rider_decline',
      kind: 'request_action',
      actionKey: COMMERCE_OWNER_ACTION_KEY.RECORD_RIDER_DECLINE,
      targetModule: 'food_delivery',
      contextRefKeys: ['service_case_id', 'order_id'],
      nextNodeId: 'wait_rider_response',
    },
    {
      id: 'wait_rider_response',
      kind: 'await_fact',
      factTypes: ['food_delivery.rider_response_recorded'],
      resultCodeToNode: {
        rider_accepted_destination_change: 'apply_destination_after_pickup',
        rider_declined_destination_change: 'change_declined',
      },
    },
    {
      id: 'rider_response_timeout',
      kind: 'timeout',
      deadlineId: 'rider_response_deadline',
      durationMs: 60000,
      onExpired: 'offer_phone_contact',
    },
    {
      id: 'offer_phone_contact',
      kind: 'request_action',
      actionKey: COMMERCE_OWNER_ACTION_KEY.OFFER_PHONE_CONTACT,
      targetModule: 'food_delivery',
      contextRefKeys: ['service_case_id', 'order_id'],
      nextNodeId: 'wait_phone_offer',
    },
    {
      id: 'wait_phone_offer',
      kind: 'await_fact',
      factTypes: ['food_delivery.phone_contact_offered'],
      resultCodeToNode: { phone_contact_offered: 'wait_phone_started' },
    },
    {
      id: 'wait_phone_started',
      kind: 'await_fact',
      factTypes: ['phone.call_started'],
      resultCodeToNode: { call_started: 'wait_phone_connected' },
      deadlineId: 'phone_call_cutoff',
      durationMs: 300000,
      onTimeout: 'change_request_expired',
    },
    {
      id: 'wait_phone_connected',
      kind: 'await_fact',
      factTypes: ['phone.call_connected', 'phone.call_not_connected'],
      resultCodeToNode: {
        call_connected: 'wait_phone_resolution',
        call_not_connected: 'change_request_expired',
      },
    },
    {
      id: 'wait_phone_resolution',
      kind: 'await_fact',
      factTypes: ['phone.interaction_resolution_proposed'],
      resultCodeToNode: {
        accepted_new_destination: 'validate_phone_resolution',
        declined_destination_change: 'change_declined',
        no_clear_commitment: 'change_request_expired',
        call_not_connected: 'change_request_expired',
      },
    },
    {
      id: 'validate_phone_resolution',
      kind: 'request_action',
      actionKey: COMMERCE_OWNER_ACTION_KEY.VALIDATE_PHONE_RESOLUTION,
      targetModule: 'food_delivery',
      contextRefKeys: ['service_case_id', 'order_id', 'phone_session_id'],
      nextNodeId: 'wait_phone_validation',
    },
    {
      id: 'wait_phone_validation',
      kind: 'await_fact',
      factTypes: [
        'food_delivery.phone_resolution_validated',
        'food_delivery.phone_resolution_rejected',
      ],
      resultCodeToNode: {
        phone_resolution_validated: 'apply_destination_after_pickup',
        phone_resolution_rejected: 'change_request_expired',
      },
    },
    {
      id: 'apply_destination_after_pickup',
      kind: 'request_action',
      actionKey: COMMERCE_OWNER_ACTION_KEY.APPLY_DESTINATION_CHANGE,
      targetModule: 'food_delivery',
      contextRefKeys: [
        'service_case_id',
        'order_id',
        'destination_anchor_id',
        'order_revision',
        'fulfillment_phase',
      ],
      staticContextRefs: { timing: 'after_pickup' },
      nextNodeId: 'wait_destination_after_pickup',
    },
    {
      id: 'wait_destination_after_pickup',
      kind: 'await_fact',
      factTypes: [
        'food_delivery.destination_change_committed',
        'food_delivery.destination_change_rejected',
      ],
      resultCodeToNode: {
        destination_change_committed: 'request_map_reroute_after_pickup',
        destination_change_rejected: 'destination_change_rejected',
      },
    },
    {
      id: 'request_map_reroute_after_pickup',
      kind: 'request_action',
      actionKey: COMMERCE_OWNER_ACTION_KEY.REQUEST_MAP_REROUTE,
      targetModule: 'map',
      contextRefKeys: [
        'journey_id',
        'destination_anchor_id',
        'expected_journey_revision',
        'service_case_id',
      ],
      nextNodeId: 'wait_map_reroute_after_pickup',
    },
    {
      id: 'wait_map_reroute_after_pickup',
      kind: 'await_fact',
      factTypes: ['map.delivery_rerouted', 'map.delivery_reroute_rejected'],
      resultCodeToNode: {
        delivery_rerouted: 'changed_after_pickup',
        delivery_reroute_rejected: 'destination_change_rejected',
      },
    },
    { id: 'changed_before_pickup', kind: 'terminal', lifecycle: 'resolved', resultCode: 'changed_before_pickup' },
    { id: 'changed_after_pickup', kind: 'terminal', lifecycle: 'resolved', resultCode: 'changed_after_pickup' },
    { id: 'change_declined', kind: 'terminal', lifecycle: 'resolved', resultCode: 'change_declined' },
    { id: 'change_request_expired', kind: 'terminal', lifecycle: 'resolved', resultCode: 'change_request_expired' },
    { id: 'destination_change_rejected', kind: 'terminal', lifecycle: 'failed', resultCode: 'destination_change_rejected' },
  ],
}

const RAW_USER_REPORTED_PROBLEM_FIXTURE = {
  schemaVersion: 2,
  id: COMMERCE_EVENT_TEMPLATE_ID.USER_REPORTED_PROBLEM_FIXTURE,
  startNodeId: 'has_order',
  nodes: [
    { id: 'has_order', kind: 'condition', contextKey: 'order_id', operator: 'exists', value: true, onTrue: 'request_case_review', onFalse: 'ordinary_support' },
    { id: 'request_case_review', kind: 'request_action', actionKey: 'food_delivery.service_case.request_review', targetModule: 'food_delivery', contextRefKeys: ['service_case_id', 'order_id'], nextNodeId: 'wait_case_review' },
    { id: 'wait_case_review', kind: 'await_fact', factTypes: ['food_delivery.service_case_reviewed'], resultCodeToNode: { service_case_reviewed: 'reviewed' } },
    { id: 'reviewed', kind: 'terminal', lifecycle: 'resolved', resultCode: 'service_case_reviewed' },
    { id: 'ordinary_support', kind: 'terminal', lifecycle: 'cancelled', resultCode: 'order_reference_missing' },
  ],
}

const RAW_LATENT_POSITIVE_FIXTURE = {
  schemaVersion: 2,
  id: COMMERCE_EVENT_TEMPLATE_ID.LATENT_POSITIVE_FIXTURE,
  startNodeId: 'bonus_gate',
  nodes: [
    { id: 'bonus_gate', kind: 'random_gate', decisionKey: 'bonus_item_included', outcomes: [{ id: 'included', weight: 1, nextNodeId: 'persist_bonus' }, { id: 'not_included', weight: 4, nextNodeId: 'no_bonus' }] },
    { id: 'persist_bonus', kind: 'request_action', actionKey: 'food_delivery.fulfillment.persist_bonus_item', targetModule: 'food_delivery', contextRefKeys: ['fulfillment_id', 'order_id'], nextNodeId: 'wait_bonus_fact' },
    { id: 'wait_bonus_fact', kind: 'await_fact', factTypes: ['food_delivery.bonus_item_persisted'], resultCodeToNode: { bonus_item_persisted: 'bonus_persisted' } },
    { id: 'bonus_persisted', kind: 'terminal', lifecycle: 'resolved', resultCode: 'bonus_item_included' },
    { id: 'no_bonus', kind: 'terminal', lifecycle: 'resolved', resultCode: 'bonus_item_not_included' },
  ],
}

export const DESTINATION_CHANGE_EVENT_TEMPLATE_V2 = normalizeEventTemplateV2(
  RAW_DESTINATION_CHANGE_TEMPLATE,
)
export const USER_REPORTED_PROBLEM_FIXTURE_TEMPLATE_V2 = normalizeEventTemplateV2(
  RAW_USER_REPORTED_PROBLEM_FIXTURE,
)
export const LATENT_POSITIVE_FIXTURE_TEMPLATE_V2 = normalizeEventTemplateV2(
  RAW_LATENT_POSITIVE_FIXTURE,
)

export const BUILT_IN_COMMERCE_EVENT_TEMPLATES = Object.freeze([
  DESTINATION_CHANGE_EVENT_TEMPLATE_V2,
  USER_REPORTED_PROBLEM_FIXTURE_TEMPLATE_V2,
  LATENT_POSITIVE_FIXTURE_TEMPLATE_V2,
].filter(Boolean))

export const getBuiltInCommerceEventTemplate = (templateId = '') =>
  BUILT_IN_COMMERCE_EVENT_TEMPLATES.find((template) => template.id === templateId) || null
