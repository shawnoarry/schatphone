import { callAI as defaultCallAI } from './ai'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from './chat-response'
import { PROFILE_TEMPLATE_FIELD_TYPES } from './profile-template-schema'

const MAX_TEXT = 600
const MAX_SHORT_TEXT = 120
const MAX_SUGGESTIONS = 80

const normalizeText = (value, fallback = '', max = MAX_TEXT) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeListValue = (value) => {
  const source = Array.isArray(value) ? value : String(value || '').split(',')
  const seen = new Set()
  return source
    .map((item) => normalizeText(item, '', MAX_SHORT_TEXT))
    .filter((item) => {
      if (!item || seen.has(item)) return false
      seen.add(item)
      return true
    })
}

const formatProfileValueForPrompt = (value = {}) => {
  const rawValue = Array.isArray(value.value) ? value.value.join(', ') : normalizeText(value.value)
  return `${value.fieldId || 'unknown'} = ${rawValue || '(empty)'} (${value.visibilityLevel || 'familiar'})`
}

const formatFieldForPrompt = (field = {}) => {
  const options = Array.isArray(field.options) && field.options.length > 0
    ? ` options: ${field.options.join(', ')}`
    : ''
  const entityTypes = Array.isArray(field.entityTypes) && field.entityTypes.length > 0
    ? ` entityTypes: ${field.entityTypes.join(', ')}`
    : ''
  return [
    `- ${field.id}: ${field.label || field.id}`,
    `type: ${field.type || PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT}`,
    `visibility: ${field.defaultVisibilityLevel || 'familiar'}`,
    options,
    entityTypes,
    field.description ? `description: ${normalizeText(field.description, '', 240)}` : '',
  ]
    .filter(Boolean)
    .join(' | ')
}

export const buildProfileTemplateValueAssistantPrompt = ({
  template = {},
  profile = {},
  user = {},
  existingValues = [],
} = {}) => {
  const fields = Array.isArray(template.fields) ? template.fields : []
  const existing = Array.isArray(existingValues) ? existingValues : []

  return [
    'Draft concrete World profile field values for one SchatPhone contact.',
    'Return JSON only with this shape: {"values":[{"fieldId":"field_id","value":"text or array","confidence":"high|medium|low","reason":"short reason"}]}.',
    'This is draft-only. Do not save anything. Do not overwrite manual user-entered values.',
    'If an existing value is already filled, either omit that field or suggest only if the existing value is clearly empty.',
    'Use only fieldId values listed in the current template. Do not invent fields.',
    'For multi_select_tags fields, return value as an array of short tags.',
    `Template: ${normalizeText(template.title || template.name || template.id, 'Untitled template', 160)} v${Number(template.version) || 1}`,
    'Template fields:',
    fields.length > 0 ? fields.map(formatFieldForPrompt).join('\n') : '(none)',
    'Selected profile:',
    `name: ${normalizeText(profile.name, 'Unnamed profile', 120)}`,
    `role: ${normalizeText(profile.role, '(empty)', 160)}`,
    `entityType: ${normalizeText(profile.entityType, 'main_role', 80)}`,
    `bio: ${normalizeText(profile.bio, '(empty)', 500)}`,
    'Current user/self context:',
    `name: ${normalizeText(user.name, '(empty)', 120)}`,
    'Existing saved profile values:',
    existing.length > 0 ? existing.map(formatProfileValueForPrompt).join('\n') : '(none)',
  ].join('\n')
}

const readProviderValues = (payload = {}) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload.values)) return payload.values
  if (Array.isArray(payload.suggestions)) return payload.suggestions
  if (payload.fields && typeof payload.fields === 'object') {
    return Object.entries(payload.fields).map(([fieldId, value]) => ({ fieldId, value }))
  }
  return []
}

const normalizeSuggestionValue = (rawValue, field = {}) => {
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS) {
    return normalizeListValue(rawValue)
  }
  return normalizeText(rawValue, '', field.type === PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT ? MAX_SHORT_TEXT : MAX_TEXT)
}

export const normalizeProfileTemplateValueSuggestionPayload = (payload = {}, { fields = [] } = {}) => {
  const fieldMap = new Map((Array.isArray(fields) ? fields : []).map((field) => [field.id, field]))
  const seen = new Set()
  let droppedCount = 0
  const suggestions = readProviderValues(payload)
    .map((item) => {
      const source = item && typeof item === 'object' ? item : {}
      const fieldId = normalizeText(source.fieldId || source.id || source.key, '', 80)
      const field = fieldMap.get(fieldId)
      if (!field || seen.has(fieldId)) {
        droppedCount += 1
        return null
      }
      const value = normalizeSuggestionValue(source.value ?? source.suggestion ?? source.text, field)
      const empty = Array.isArray(value) ? value.length === 0 : !value
      if (empty) {
        droppedCount += 1
        return null
      }
      seen.add(fieldId)
      return {
        fieldId,
        value,
        confidence: normalizeText(source.confidence, 'medium', 20),
        reason: normalizeText(source.reason || source.explanation, '', 240),
      }
    })
    .filter(Boolean)
    .slice(0, MAX_SUGGESTIONS)

  return {
    suggestions,
    droppedCount,
  }
}

const parseSuggestionPayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null

  const text = extractAssistantPayloadText(response)
  const parsedText = text ? parseAssistantJsonPayload(text) : null
  if (parsedText) return parsedText

  return Array.isArray(response) ? { values: response } : response
}

export const suggestProfileTemplateValues = async ({
  template = {},
  profile = {},
  user = {},
  existingValues = [],
  settings = {},
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const prompt = buildProfileTemplateValueAssistantPrompt({
    template,
    profile,
    user,
    existingValues,
  })
  const response = await callAi({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt:
      'You draft SchatPhone world profile field values. Return valid JSON only. Suggestions are draft-only and must not overwrite manual values.',
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
    fields: Array.isArray(template.fields) ? template.fields : [],
  })
  return {
    ok: normalized.suggestions.length > 0,
    reason: normalized.suggestions.length > 0 ? 'suggested' : 'empty',
    ...normalized,
  }
}
