import { callAI as defaultCallAI } from './ai'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from './chat-response'
import {
  RELATIONSHIP_CLASSIFICATION_CONFIDENCE,
  RELATIONSHIP_CLASSIFICATION_SOURCE,
  buildRelationshipClassificationRegistry,
  normalizeRelationshipProfileFields,
} from './relationship-classification-schema'

const DEFAULT_CATEGORY_ID = 'ordinary_acquaintance'

const normalizeText = (value, fallback = '', max = 1000) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeProviderModifierIds = (value = []) => {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    if (typeof item === 'string') return item
    if (!item || typeof item !== 'object') return ''
    return item.id || item.modifierId || item.value || item.name || ''
  })
}

export const normalizeRelationshipClassificationProviderPayload = (payload = {}) => {
  const source = payload && typeof payload === 'object' ? payload : {}
  const modifierIds = source.relationshipModifierIds || source.modifierIds || source.modifiers || []
  return {
    primaryRelationshipCategoryId:
      source.primaryRelationshipCategoryId ||
      source.primaryCategoryId ||
      source.categoryId ||
      source.category ||
      '',
    relationshipModifierIds: normalizeProviderModifierIds(modifierIds),
    classificationConfidence:
      source.classificationConfidence ||
      source.confidence ||
      RELATIONSHIP_CLASSIFICATION_CONFIDENCE.LOW,
    classificationExplanation:
      source.classificationExplanation || source.explanation || source.reason || '',
  }
}

export const buildRelationshipClassificationPrompt = ({
  profile = {},
  registry = buildRelationshipClassificationRegistry(),
} = {}) => {
  const fields = normalizeRelationshipProfileFields(profile)
  const categories = registry.categories
    .map((item) => `${item.id}: ${item.label}${item.description ? ` - ${item.description}` : ''}`)
    .join('\n')
  const modifiers = registry.modifiers
    .map((item) => `${item.id}: ${item.label}${item.description ? ` - ${item.description}` : ''}`)
    .join('\n')

  return [
    'Classify one user-written relationship label into stable SchatPhone runtime categories.',
    'Return JSON only with keys: primaryRelationshipCategoryId, relationshipModifierIds, classificationConfidence, classificationExplanation.',
    'classificationConfidence must be one of: high, medium, low.',
    `Role name: ${normalizeText(profile.name, 'Unnamed role', 120)}`,
    `Free-text label: ${fields.relationshipLabelText || '(empty)'}`,
    `User explanation: ${fields.relationshipLabelNote || '(empty)'}`,
    'Primary category ids:',
    categories,
    'Modifier ids:',
    modifiers,
  ].join('\n')
}

export const normalizeRelationshipClassificationSuggestion = (
  payload = {},
  registry = buildRelationshipClassificationRegistry(),
) => {
  const normalized = normalizeRelationshipProfileFields(
    normalizeRelationshipClassificationProviderPayload(payload),
  )
  const categoryExists = registry.categoryById.has(normalized.primaryRelationshipCategoryId)
  return {
    primaryRelationshipCategoryId: categoryExists
      ? normalized.primaryRelationshipCategoryId
      : DEFAULT_CATEGORY_ID,
    relationshipModifierIds: normalized.relationshipModifierIds.filter((id) =>
      registry.modifierById.has(id),
    ),
    classificationConfidence:
      normalized.classificationConfidence || RELATIONSHIP_CLASSIFICATION_CONFIDENCE.LOW,
    classificationExplanation: normalized.classificationExplanation,
  }
}

export const shouldAutoSaveClassification = (classification = {}) =>
  classification?.classificationConfidence === RELATIONSHIP_CLASSIFICATION_CONFIDENCE.HIGH

const parseClassificationPayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null

  const text = extractAssistantPayloadText(response)
  const parsedText = text ? parseAssistantJsonPayload(text) : null
  if (parsedText) return parsedText

  return Array.isArray(response) ? null : response
}

export const classifyRelationshipLabel = async ({
  profile = {},
  settings = {},
  registry = buildRelationshipClassificationRegistry(),
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const prompt = buildRelationshipClassificationPrompt({ profile, registry })
  const response = await callAi({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt:
      'You classify user-written relationship labels into stable runtime categories. Return valid JSON only.',
    settings,
    signal,
  })
  const payload = parseClassificationPayload(response)
  if (!payload) {
    return {
      ok: false,
      reason: 'parse_failed',
      requiresConfirmation: true,
      classification: null,
    }
  }

  const classification = normalizeRelationshipClassificationSuggestion(payload, registry)
  const autoSave = shouldAutoSaveClassification(classification)
  return {
    ok: true,
    reason: 'classified',
    requiresConfirmation: !autoSave,
    saveSource: autoSave
      ? RELATIONSHIP_CLASSIFICATION_SOURCE.AI_AUTO
      : RELATIONSHIP_CLASSIFICATION_SOURCE.AI_CONFIRMED,
    classification,
  }
}
