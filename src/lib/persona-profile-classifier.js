import { callAI as defaultCallAI } from './ai'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from './chat-response'
import {
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_VISIBILITY_LEVELS,
  normalizeProfileTemplateField,
  normalizeProfileVisibilityLevel,
} from './profile-template-schema'

export const PERSONA_CLASSIFICATION_SCHEMA_VERSION = 1

export const PERSONA_CLASSIFICATION_ITEM_KINDS = Object.freeze({
  MATCHED: 'matched',
  CONFLICT: 'conflict',
  NEW_FIELD: 'new_field',
  UNCLASSIFIED: 'unclassified',
})

export const MAX_PERSONA_SOURCE_TEXT = 12_000
const MAX_SEGMENTS = 80
const MAX_ITEMS = 120
const MAX_VALUE_TEXT = 600
const MAX_SHORT_TEXT = 120

const CORE_FIELD_ALIASES = Object.freeze({
  name: ['name', '姓名', '名字'],
  occupation: ['occupation', '职业', '工作身份', '身份'],
  affiliation: ['affiliation', '所属公司', '公司', '所属组织', '组织', '所属组合', '组合'],
  public_identity: ['public identity', 'public_identity', '公开身份', '公众身份'],
  stage_name: ['stage name', 'stage_name', '艺名', '公开艺名'],
  team_role: ['team role', 'team_role', '队内职务', '团队职务', '职位'],
  preferred_address: ['preferred address', 'preferred_address', '称呼偏好', '称呼'],
})

const immutable = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(immutable)
  return Object.freeze(value)
}

const normalizeText = (value, max = MAX_VALUE_TEXT) => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
}

const normalizeComparable = (value) => normalizeText(value).toLocaleLowerCase()

const normalizeProfileValue = (value, field = {}) => {
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS) {
    const source = Array.isArray(value) ? value : String(value || '').split(/[,，]/)
    return [...new Set(source.map((item) => normalizeText(item, MAX_SHORT_TEXT)).filter(Boolean))]
  }
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.BOOLEAN) {
    if (value === true || value === 1) return 'true'
    if (value === false || value === 0) return 'false'
    const normalized = normalizeComparable(value)
    if (['true', 'yes', 'y', '1', '是'].includes(normalized)) return 'true'
    if (['false', 'no', 'n', '0', '否'].includes(normalized)) return 'false'
    return ''
  }
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.DATE) {
    const normalized = normalizeText(value, 20)
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized)
    if (!match) return ''
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    return date.getUTCFullYear() === Number(match[1]) &&
      date.getUTCMonth() === Number(match[2]) - 1 &&
      date.getUTCDate() === Number(match[3])
      ? normalized
      : ''
  }
  return normalizeText(
    Array.isArray(value) ? value.join(', ') : value,
    field.type === PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT ? MAX_SHORT_TEXT : MAX_VALUE_TEXT,
  )
}

const valuesEqual = (left, right) => {
  const normalize = (value) => Array.isArray(value)
    ? value.map(normalizeComparable).filter(Boolean).sort()
    : normalizeComparable(value)
  return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right))
}

const splitPersonaSegments = (sourceText) => {
  const normalized = String(sourceText || '').replace(/\r\n?/g, '\n').trim()
  if (!normalized) return []
  return normalized
    .split(/\n+|(?<=[。！？!?；;])\s*/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(0, MAX_SEGMENTS)
}

const createFieldAliasMap = (fields = []) => {
  const map = new Map()
  fields.forEach((rawField, index) => {
    const field = normalizeProfileTemplateField(rawField, index)
    const aliases = new Set([
      field.id,
      field.label,
      ...(CORE_FIELD_ALIASES[field.id] || []),
    ])
    aliases.forEach((alias) => {
      const normalized = normalizeComparable(alias)
      if (normalized && !map.has(normalized)) map.set(normalized, field)
    })
  })
  return map
}

const matchFieldByLabel = (label, aliasMap) => {
  const normalized = normalizeComparable(label)
  if (!normalized) return null
  if (aliasMap.has(normalized)) return aliasMap.get(normalized)
  for (const [alias, field] of aliasMap.entries()) {
    if (normalized === alias || normalized.endsWith(alias)) return field
  }
  return null
}

const inferFieldType = (value) => {
  const normalized = normalizeText(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return PROFILE_TEMPLATE_FIELD_TYPES.DATE
  if (['是', '否', 'yes', 'no', 'true', 'false'].includes(normalized.toLocaleLowerCase())) {
    return PROFILE_TEMPLATE_FIELD_TYPES.BOOLEAN
  }
  return normalized.length > MAX_SHORT_TEXT
    ? PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT
    : PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT
}

const extractExplicitAssignment = (segment) => {
  const match = /^(.{1,60}?)[：:=]\s*(.+)$/u.exec(segment)
  if (!match) return null
  return {
    label: normalizeText(match[1], 60),
    value: normalizeText(match[2]),
  }
}

const extractKnownFieldCandidate = (segment, field, aliasMap) => {
  const aliases = [field.label, field.id, ...(CORE_FIELD_ALIASES[field.id] || [])]
    .map((alias) => normalizeText(alias, 80))
    .filter(Boolean)
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const patterns = [
      new RegExp(`${escaped}\\s*(?:是|为|is|are|=|:|：)\\s*([^，。；,;]+)`, 'iu'),
      new RegExp(`(?:我的|my)\\s*${escaped}\\s*(?:是|为|is|=|:|：)?\\s*([^，。；,;]+)`, 'iu'),
    ]
    for (const pattern of patterns) {
      const match = pattern.exec(segment)
      if (match?.[1]) return normalizeProfileValue(match[1], field)
    }
  }

  if (field.id === 'name') {
    const match = /(?:我叫|我的名字是|my name is)\s*([^，。；,;]+)/iu.exec(segment)
    if (match?.[1]) return normalizeProfileValue(match[1], field)
  }
  if (field.id === 'occupation') {
    const match = /(?:我(?:是|是一名)|职业(?:是|为)?|work as|occupation is)\s*([^，。；,;]+)/iu.exec(segment)
    if (match?.[1]) return normalizeProfileValue(match[1], field)
    const affiliationOccupation = /(?:我)?是(.{1,80}?)的([^，。；,;]+)$/u.exec(segment)
    if (affiliationOccupation?.[2]) return normalizeProfileValue(affiliationOccupation[2], field)
  }
  if (field.id === 'affiliation') {
    const affiliationOccupation = /(?:我)?是(.{1,80}?)的([^，。；,;]+)$/u.exec(segment)
    if (affiliationOccupation?.[1]) return normalizeProfileValue(affiliationOccupation[1], field)
  }
  if (field.id === 'team_role') {
    const match = /(?:在|within)\s*(?:组合|团队|team)?\s*([^，。；,;]+?)\s*(?:中)?(?:担任|as)\s*([^，。；,;]+)/iu.exec(segment)
    if (match?.[2]) return normalizeProfileValue(match[2], field)
  }

  const explicit = extractExplicitAssignment(segment)
  if (explicit && matchFieldByLabel(explicit.label, aliasMap)?.id === field.id) {
    return normalizeProfileValue(explicit.value, field)
  }
  return ''
}

const buildProfileRef = ({ profile = {}, template = {}, worldId = '' } = {}) => ({
  profileId: Number(profile?.id) || 0,
  revision: Math.max(1, Number(profile?.revision) || 1),
  entityType: normalizeText(profile?.entityType, 40),
  worldId: normalizeText(worldId || profile?.templateLink?.primaryWorldId, 80),
  templateId: normalizeText(template?.id || profile?.templateLink?.profileTemplateId, 80),
  templateVersion: Math.max(
    0,
    Number(template?.version || profile?.templateLink?.profileTemplateVersion) || 0,
  ),
})

const buildDraftItems = ({ segments, candidates, existingValues = [], fields = [], categories = [] }) => {
  const fieldMap = new Map(fields.map((field) => [field.id, field]))
  const existingMap = new Map(
    (Array.isArray(existingValues) ? existingValues : []).map((value) => [value?.fieldId, value]),
  )
  const candidatesByField = new Map()
  const coveredSegments = new Set()
  const newFieldItems = []

  candidates.forEach((candidate, index) => {
    const sourceText = normalizeText(candidate?.sourceText, MAX_VALUE_TEXT)
    if (!sourceText || !segments.includes(sourceText)) return
    const field = fieldMap.get(candidate?.fieldId)
    if (field) {
      const value = normalizeProfileValue(candidate?.value, field)
      const empty = Array.isArray(value) ? value.length === 0 : !value
      if (empty) return
      const list = candidatesByField.get(field.id) || []
      if (!list.some((entry) => valuesEqual(entry.value, value))) {
        list.push({ value, sourceText, confidence: normalizeText(candidate?.confidence, 20) || 'medium' })
      }
      candidatesByField.set(field.id, list)
      coveredSegments.add(sourceText)
      return
    }

    const label = normalizeText(candidate?.label, MAX_SHORT_TEXT)
    const value = normalizeText(candidate?.value)
    if (!label || !value) return
    newFieldItems.push({
      id: `persona-item-new-${index}`,
      kind: PERSONA_CLASSIFICATION_ITEM_KINDS.NEW_FIELD,
      fieldId: '',
      categoryId: normalizeText(candidate?.categoryId, 80) || categories[0]?.id || '',
      label,
      fieldType: inferFieldType(value),
      candidateValue: value,
      candidateValues: [value],
      existingValue: '',
      sourceText,
      confidence: normalizeText(candidate?.confidence, 20) || 'medium',
    })
    coveredSegments.add(sourceText)
  })

  const items = []
  candidatesByField.forEach((entries, fieldId) => {
    const field = fieldMap.get(fieldId)
    const existing = existingMap.get(fieldId)?.value ?? ''
    const hasCandidateConflict = entries.length > 1
    const hasExistingConflict = existing !== '' && entries.some((entry) => !valuesEqual(existing, entry.value))
    items.push({
      id: `persona-item-field-${fieldId}`,
      kind: hasCandidateConflict || hasExistingConflict
        ? PERSONA_CLASSIFICATION_ITEM_KINDS.CONFLICT
        : PERSONA_CLASSIFICATION_ITEM_KINDS.MATCHED,
      fieldId,
      categoryId: field?.categoryId || '',
      label: field?.label || fieldId,
      fieldType: field?.type || PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
      candidateValue: entries.at(-1)?.value ?? '',
      candidateValues: entries.map((entry) => entry.value),
      existingValue: existing,
      sourceText: entries.map((entry) => entry.sourceText).join(' / '),
      confidence: entries.some((entry) => entry.confidence === 'low') ? 'low' : entries[0]?.confidence || 'medium',
    })
  })

  items.push(...newFieldItems)
  segments.forEach((segment, index) => {
    if (coveredSegments.has(segment)) return
    items.push({
      id: `persona-item-unclassified-${index}`,
      kind: PERSONA_CLASSIFICATION_ITEM_KINDS.UNCLASSIFIED,
      fieldId: '',
      categoryId: categories[0]?.id || '',
      label: '',
      fieldType: inferFieldType(segment),
      candidateValue: segment,
      candidateValues: [segment],
      existingValue: '',
      sourceText: segment,
      confidence: 'unclassified',
    })
  })
  return items.slice(0, MAX_ITEMS)
}

const createDraft = ({ sourceText, profile, template, worldId, fields, categories, candidates }) => {
  const segments = splitPersonaSegments(sourceText)
  if (segments.length === 0) {
    return immutable({ ok: false, reason: 'text_empty', draft: null })
  }
  const items = buildDraftItems({
    segments,
    candidates,
    existingValues: profile?.profileValues,
    fields,
    categories,
  })
  return immutable({
    ok: true,
    reason: 'classified',
    draft: {
      schemaVersion: PERSONA_CLASSIFICATION_SCHEMA_VERSION,
      sourceText: String(sourceText).slice(0, MAX_PERSONA_SOURCE_TEXT),
      profileRef: buildProfileRef({ profile, template, worldId }),
      items,
      counts: {
        matched: items.filter((item) => item.kind === PERSONA_CLASSIFICATION_ITEM_KINDS.MATCHED).length,
        conflicts: items.filter((item) => item.kind === PERSONA_CLASSIFICATION_ITEM_KINDS.CONFLICT).length,
        newFields: items.filter((item) => item.kind === PERSONA_CLASSIFICATION_ITEM_KINDS.NEW_FIELD).length,
        unclassified: items.filter((item) => item.kind === PERSONA_CLASSIFICATION_ITEM_KINDS.UNCLASSIFIED).length,
      },
    },
  })
}

export const classifyPersonaTextDeterministically = ({
  text = '',
  profile = {},
  template = {},
  worldId = '',
  fields = template?.fields || [],
  categories = template?.categories || [],
} = {}) => {
  const normalizedFields = (Array.isArray(fields) ? fields : []).map((field, index) =>
    normalizeProfileTemplateField(field, index),
  )
  const aliasMap = createFieldAliasMap(normalizedFields)
  const candidates = []

  splitPersonaSegments(text).forEach((segment) => {
    const explicit = extractExplicitAssignment(segment)
    if (explicit) {
      const field = matchFieldByLabel(explicit.label, aliasMap)
      candidates.push(field
        ? { fieldId: field.id, value: explicit.value, sourceText: segment, confidence: 'high' }
        : { label: explicit.label, value: explicit.value, sourceText: segment, confidence: 'high' })
      return
    }

    let matched = false
    normalizedFields.forEach((field) => {
      const value = extractKnownFieldCandidate(segment, field, aliasMap)
      const empty = Array.isArray(value) ? value.length === 0 : !value
      if (empty) return
      candidates.push({ fieldId: field.id, value, sourceText: segment, confidence: 'medium' })
      matched = true
    })
    if (!matched && /(?:不喜欢别人叫全名|称呼)/u.test(segment)) {
      candidates.push({
        label: '称呼偏好',
        value: segment,
        sourceText: segment,
        confidence: 'medium',
      })
    }
  })

  return createDraft({
    sourceText: text,
    profile,
    template,
    worldId,
    fields: normalizedFields,
    categories: Array.isArray(categories) ? categories : [],
    candidates,
  })
}

const formatFieldForPrompt = (field = {}) =>
  `${field.id} | ${field.label || field.id} | ${field.type || PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT}`

export const buildPersonaClassificationPrompt = ({ text = '', fields = [] } = {}) => [
  'Classify user-authored persona text into a review-only SchatPhone Contacts draft.',
  'Return JSON only with: {"matches":[{"sourceText":"exact input segment","fieldId":"known field id","value":"text or array","confidence":"high|medium|low"}],"newFields":[{"sourceText":"exact input segment","label":"short field label","value":"text","confidence":"high|medium|low"}]}.',
  'sourceText must be copied exactly from one provided segment. Do not paraphrase or omit unknown content.',
  'Use only listed field IDs. Suggest a new field only when no listed field fits. Do not save, choose between conflicts, or infer permissions.',
  'Known fields:',
  (Array.isArray(fields) ? fields : []).map(formatFieldForPrompt).join('\n') || '(none)',
  'Input segments:',
  splitPersonaSegments(text).map((segment) => `- ${segment}`).join('\n') || '(none)',
].join('\n')

const parseProviderPayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null
  const text = extractAssistantPayloadText(response)
  return text ? parseAssistantJsonPayload(text) : response
}

export const normalizePersonaClassificationPayload = (payload = {}) => {
  const matches = Array.isArray(payload?.matches) ? payload.matches : []
  const newFields = Array.isArray(payload?.newFields) ? payload.newFields : []
  return [
    ...matches.map((item) => ({
      sourceText: normalizeText(item?.sourceText),
      fieldId: normalizeText(item?.fieldId, 80),
      value: item?.value,
      confidence: normalizeText(item?.confidence, 20),
    })),
    ...newFields.map((item) => ({
      sourceText: normalizeText(item?.sourceText),
      label: normalizeText(item?.label, MAX_SHORT_TEXT),
      value: item?.value,
      confidence: normalizeText(item?.confidence, 20),
    })),
  ]
}

export const classifyPersonaTextWithAI = async ({
  text = '',
  profile = {},
  template = {},
  worldId = '',
  fields = template?.fields || [],
  categories = template?.categories || [],
  settings = {},
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const segments = splitPersonaSegments(text)
  if (segments.length === 0) return immutable({ ok: false, reason: 'text_empty', draft: null })
  const normalizedFields = (Array.isArray(fields) ? fields : []).map((field, index) =>
    normalizeProfileTemplateField(field, index),
  )
  const response = await callAi({
    messages: [{ role: 'user', content: buildPersonaClassificationPrompt({ text, fields: normalizedFields }) }],
    systemPrompt: 'You classify persona text into a review-only Contacts draft. Return valid JSON only and preserve exact source segments.',
    settings,
    signal,
  })
  const payload = parseProviderPayload(response)
  if (!payload) return immutable({ ok: false, reason: 'parse_failed', draft: null })
  return createDraft({
    sourceText: text,
    profile,
    template,
    worldId,
    fields: normalizedFields,
    categories: Array.isArray(categories) ? categories : [],
    candidates: normalizePersonaClassificationPayload(payload),
  })
}

export const createPersonaReviewRows = (draft = {}) =>
  (Array.isArray(draft?.items) ? draft.items : []).map((item) => ({
    itemId: item.id,
    decision: 'pending',
    kind: item.kind || PERSONA_CLASSIFICATION_ITEM_KINDS.UNCLASSIFIED,
    fieldId: item.fieldId || '',
    categoryId: item.categoryId || '',
    label: item.label || '',
    fieldType: item.fieldType || PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
    value: Array.isArray(item.candidateValue) ? item.candidateValue.join(', ') : String(item.candidateValue || ''),
    sourceText: item.sourceText || '',
    existingValue: item.existingValue || '',
    visibilityLevel: normalizeProfileVisibilityLevel(
      item.visibilityLevel,
      PROFILE_VISIBILITY_LEVELS.FAMILIAR,
    ),
  }))
