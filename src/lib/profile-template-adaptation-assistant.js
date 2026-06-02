import { callAI as defaultCallAI } from './ai'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from './chat-response'
import {
  PROFILE_TEMPLATE_SCOPES,
  PROFILE_VISIBILITY_LEVELS,
} from './profile-template-schema'
import { normalizeProfileTemplateValueSuggestionPayload } from './profile-template-value-assistant'

const MAX_TEXT = 600
const MAX_SHORT_TEXT = 140

const normalizeText = (value, fallback = '', max = MAX_TEXT) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeWorldId = (value, fallback = 'default_world') =>
  normalizeText(value, fallback, 80) || fallback

const fieldMatchesEntityType = (field = {}, entityType = '') => {
  const entityTypes = Array.isArray(field.entityTypes) ? field.entityTypes : []
  return entityTypes.length === 0 || entityTypes.includes(entityType)
}

const listTemplateFieldsForEntity = (template = {}, entityType = '') =>
  Array.isArray(template?.fields)
    ? template.fields.filter((field) => fieldMatchesEntityType(field, entityType))
    : []

const scoreTemplateForValues = ({ template = {}, profile = {} } = {}) => {
  const fields = listTemplateFieldsForEntity(template, profile.entityType)
  const fieldIds = new Set(fields.map((field) => field.id).filter(Boolean))
  const values = Array.isArray(profile.profileValues) ? profile.profileValues : []
  const overlap = values.filter((value) => value?.fieldId && fieldIds.has(value.fieldId)).length
  return overlap * 10 + fields.length
}

const chooseRecommendedTemplate = ({
  profile = {},
  currentTemplate = null,
  currentWorldTemplates = [],
  currentWorldId = 'default_world',
  preferCurrentTemplate = false,
} = {}) => {
  if (
    preferCurrentTemplate &&
    currentTemplate?.scope === PROFILE_TEMPLATE_SCOPES.WORLD &&
    currentTemplate.worldId === currentWorldId
  ) {
    return currentTemplate
  }

  const candidates = currentWorldTemplates
    .filter((template) => template?.scope === PROFILE_TEMPLATE_SCOPES.WORLD)
    .filter((template) => template.worldId === currentWorldId)
    .filter((template) => listTemplateFieldsForEntity(template, profile.entityType).length > 0)

  if (candidates.length <= 0) return null

  return candidates
    .map((template) => ({
      template,
      score: scoreTemplateForValues({ template, profile }),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(right.template.updatedAt || 0) - Number(left.template.updatedAt || 0) ||
        String(left.template.title || left.template.id).localeCompare(
          String(right.template.title || right.template.id),
        ),
    )[0].template
}

const countValuesOutsideTemplate = (profile = {}, template = {}) => {
  const fieldIds = new Set(
    listTemplateFieldsForEntity(template, profile.entityType).map((field) => field.id).filter(Boolean),
  )
  return (Array.isArray(profile.profileValues) ? profile.profileValues : []).filter(
    (value) => value?.fieldId && !fieldIds.has(value.fieldId),
  ).length
}

const countSharedValues = (profile = {}, template = {}) => {
  const fieldIds = new Set(
    listTemplateFieldsForEntity(template, profile.entityType).map((field) => field.id).filter(Boolean),
  )
  return (Array.isArray(profile.profileValues) ? profile.profileValues : []).filter(
    (value) => value?.fieldId && fieldIds.has(value.fieldId),
  ).length
}

export const buildProfileTemplateAdaptationReview = ({
  profile = {},
  currentTemplate = null,
  currentWorldTemplates = [],
  currentWorldId = 'default_world',
} = {}) => {
  const worldId = normalizeWorldId(currentWorldId)
  const link = profile?.templateLink || {}
  const linkedTemplateId = normalizeText(link.profileTemplateId, '', 80)
  const linkedVersion = Number(link.profileTemplateVersion) || 0
  let reason = 'compatible'
  let needsAttention = false

  if (!linkedTemplateId) {
    reason = 'no_template'
    needsAttention = currentWorldTemplates.length > 0
  } else if (!currentTemplate?.id) {
    reason = 'missing_template'
    needsAttention = true
  } else if (
    currentTemplate.scope === PROFILE_TEMPLATE_SCOPES.WORLD &&
    currentTemplate.worldId !== worldId
  ) {
    reason = 'outside_current_world'
    needsAttention = true
  } else if (linkedVersion > 0 && Number(currentTemplate.version || 1) > linkedVersion) {
    reason = 'outdated_template'
    needsAttention = true
  }

  const recommendedTemplate = chooseRecommendedTemplate({
    profile,
    currentTemplate,
    currentWorldTemplates,
    currentWorldId: worldId,
    preferCurrentTemplate: reason === 'outdated_template',
  })
  const targetFields = listTemplateFieldsForEntity(recommendedTemplate, profile.entityType)

  return {
    ok: true,
    needsAttention: needsAttention && Boolean(recommendedTemplate?.id),
    reason,
    currentWorldId: worldId,
    currentTemplateId: currentTemplate?.id || linkedTemplateId || '',
    currentTemplateTitle: currentTemplate?.title || linkedTemplateId || '',
    currentTemplateVersion: Number(currentTemplate?.version || linkedVersion || 0),
    linkedTemplateVersion: linkedVersion,
    recommendedTemplate,
    recommendedTemplateId: recommendedTemplate?.id || '',
    recommendedTemplateTitle: recommendedTemplate?.title || '',
    recommendedTemplateVersion: Number(recommendedTemplate?.version || 0),
    targetFieldCount: targetFields.length,
    sharedValueCount: recommendedTemplate ? countSharedValues(profile, recommendedTemplate) : 0,
    preservedCustomCount: recommendedTemplate ? countValuesOutsideTemplate(profile, recommendedTemplate) : 0,
  }
}

const formatFieldForPrompt = (field = {}) => {
  const options = Array.isArray(field.options) && field.options.length > 0
    ? ` options: ${field.options.join(', ')}`
    : ''
  return [
    `- ${field.id}: ${field.label || field.id}`,
    `type: ${field.type || 'short_text'}`,
    `visibility: ${field.defaultVisibilityLevel || PROFILE_VISIBILITY_LEVELS.FAMILIAR}`,
    options,
    field.description ? `description: ${normalizeText(field.description, '', 240)}` : '',
  ]
    .filter(Boolean)
    .join(' | ')
}

const formatValueForPrompt = (value = {}, sourceTemplate = {}) => {
  const fields = Array.isArray(sourceTemplate?.fields) ? sourceTemplate.fields : []
  const field = fields.find((item) => item.id === value.fieldId)
  const rawValue = Array.isArray(value.value) ? value.value.join(', ') : normalizeText(value.value)
  return `${value.fieldId || 'unknown'} (${field?.label || 'custom field'}) = ${rawValue || '(empty)'}`
}

export const buildProfileTemplateAdaptationPrompt = ({
  sourceTemplate = {},
  targetTemplate = {},
  profile = {},
  user = {},
  existingValues = [],
} = {}) => {
  const targetFields = Array.isArray(targetTemplate.fields) ? targetTemplate.fields : []
  const sourceFields = Array.isArray(sourceTemplate.fields) ? sourceTemplate.fields : []
  const values = Array.isArray(existingValues) ? existingValues : []

  return [
    'Adapt one SchatPhone contact from an old WorldBook role profile template to a current-world template.',
    'Return JSON only with this shape: {"values":[{"fieldId":"target_field_id","value":"text or array","confidence":"high|medium|low","reason":"short reason"}]}.',
    'This is draft-only. Do not save anything. Do not delete old fields. Do not overwrite manual values without user confirmation.',
    'Use only target template fieldId values. Do not invent fields.',
    'Map meaning from old values into the closest target fields when the match is clear. Omit uncertain fields.',
    `Source template: ${normalizeText(sourceTemplate.title || sourceTemplate.id, 'Unknown source', MAX_SHORT_TEXT)} v${Number(sourceTemplate.version) || 0}`,
    'Source fields:',
    sourceFields.length > 0 ? sourceFields.map(formatFieldForPrompt).join('\n') : '(unknown)',
    `Target template: ${normalizeText(targetTemplate.title || targetTemplate.id, 'Unknown target', MAX_SHORT_TEXT)} v${Number(targetTemplate.version) || 1}`,
    'Target fields:',
    targetFields.length > 0 ? targetFields.map(formatFieldForPrompt).join('\n') : '(none)',
    'Selected profile:',
    `name: ${normalizeText(profile.name, 'Unnamed profile', MAX_SHORT_TEXT)}`,
    `role: ${normalizeText(profile.role, '(empty)', 180)}`,
    `entityType: ${normalizeText(profile.entityType, 'main_role', 80)}`,
    `bio: ${normalizeText(profile.bio, '(empty)', 500)}`,
    'Current user/self context:',
    `name: ${normalizeText(user.name, '(empty)', MAX_SHORT_TEXT)}`,
    'Existing saved values to adapt:',
    values.length > 0 ? values.map((value) => formatValueForPrompt(value, sourceTemplate)).join('\n') : '(none)',
  ].join('\n')
}

const parseSuggestionPayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null

  const text = extractAssistantPayloadText(response)
  const parsedText = text ? parseAssistantJsonPayload(text) : null
  if (parsedText) return parsedText

  return Array.isArray(response) ? { values: response } : response
}

export const adaptProfileTemplateValues = async ({
  sourceTemplate = {},
  targetTemplate = {},
  profile = {},
  user = {},
  existingValues = [],
  settings = {},
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const prompt = buildProfileTemplateAdaptationPrompt({
    sourceTemplate,
    targetTemplate,
    profile,
    user,
    existingValues,
  })
  const response = await callAi({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt:
      'You adapt SchatPhone world profile values between templates. Return valid JSON only. Suggestions are draft-only and must not overwrite manual values.',
    settings,
    signal,
  })
  const payload = parseSuggestionPayload(response)
  if (!payload) {
    return {
      ok: false,
      reason: 'parse_failed',
      suggestions: [],
      droppedCount: 0,
    }
  }

  const normalized = normalizeProfileTemplateValueSuggestionPayload(payload, {
    fields: Array.isArray(targetTemplate.fields) ? targetTemplate.fields : [],
  })
  return {
    ok: normalized.suggestions.length > 0,
    reason: normalized.suggestions.length > 0 ? 'suggested' : 'empty',
    ...normalized,
  }
}
