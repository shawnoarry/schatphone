import {
  BUILT_IN_COMMERCE_EVENT_TEMPLATES,
  getBuiltInCommerceEventTemplate,
} from './commerce-event-templates'
import {
  BUILT_IN_WORK_HUB_EVENT_TEMPLATES,
  WORK_HUB_EVENT_TEMPLATE_ID,
  getBuiltInWorkHubEventTemplate,
} from './work-hub-event-templates'

export const BUILT_IN_EVENT_TEMPLATES = Object.freeze([
  ...BUILT_IN_COMMERCE_EVENT_TEMPLATES,
  ...BUILT_IN_WORK_HUB_EVENT_TEMPLATES,
])

export const getBuiltInEventTemplate = (templateId = '') =>
  getBuiltInCommerceEventTemplate(templateId) || getBuiltInWorkHubEventTemplate(templateId)

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
