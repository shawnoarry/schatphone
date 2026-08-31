import {
  BUILT_IN_COMMERCE_EVENT_TEMPLATES,
  getBuiltInCommerceEventTemplate,
} from './commerce-event-templates'
import {
  BUILT_IN_WORK_HUB_EVENT_TEMPLATES,
  WORK_HUB_EVENT_TEMPLATE_ID,
  getBuiltInWorkHubEventTemplate,
} from './work-hub-event-templates'
import {
  WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_ID,
  WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2,
} from './world-semantic-access-event-templates'

export const BUILT_IN_EVENT_TEMPLATES = Object.freeze([
  ...BUILT_IN_COMMERCE_EVENT_TEMPLATES,
  ...BUILT_IN_WORK_HUB_EVENT_TEMPLATES,
  WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2,
])

export const getBuiltInEventTemplate = (templateId = '') =>
  getBuiltInCommerceEventTemplate(templateId) ||
  getBuiltInWorkHubEventTemplate(templateId) ||
  (templateId === WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_ID
    ? WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_V2
    : null)

export const getBuiltInEventTemplateMetadata = (templateId = '') => {
  if (templateId === WORK_HUB_EVENT_TEMPLATE_ID.WORK_SCHEDULE_CHANGE) {
    return {
      moduleKey: 'work_hub',
      targetRefKeys: ['schedule_proposal_id', 'organization_id'],
      adapterKey: 'simulation.work_hub_event_instance_v2',
      startTriggerSource: 'condition',
      startReason: 'organization_schedule_change',
    }
  }
  if (templateId === WORLD_SEMANTIC_ACCESS_EVENT_TEMPLATE_ID) {
    return {
      moduleKey: 'map',
      targetRefKeys: ['place_id', 'map_pack_id'],
      adapterKey: 'simulation.world_semantic_access_v1',
      startTriggerSource: 'manual',
      startReason: 'restricted_place_entry_requested',
    }
  }
  if (getBuiltInCommerceEventTemplate(templateId)) {
    return {
      moduleKey: 'commerce',
      targetRefKeys: ['order_id', 'service_case_id'],
      adapterKey: 'simulation.event_instance_v2',
      startTriggerSource: 'manual',
      startReason: 'user_service_interaction',
    }
  }
  return null
}
