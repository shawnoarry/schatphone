import {
  CONTACTS_ENTITY_TYPE_KEYS,
  PROFILE_TEMPLATE_SCOPES,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_VALUE_SOURCE_KINDS,
  PROFILE_VISIBILITY_LEVELS,
  createProfileExtensionCategoryId,
  createProfileExtensionFieldId,
  normalizeProfileExtensions,
  normalizeProfileTemplateField,
  normalizeProfileValues,
  normalizeProfileVisibilityLevel,
} from './profile-template-schema'

export const PERSONA_REVIEW_DECISIONS = Object.freeze({
  PENDING: 'pending',
  ACCEPT: 'accept',
  IGNORE: 'ignore',
})

const REVIEW_DECISION_KEYS = new Set(Object.values(PERSONA_REVIEW_DECISIONS))
const LEGACY_SINGLE_WORLD_IDS = new Set(['legacy_single_world', 'default_world'])

const normalizeText = (value, max = 600) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
    : ''

const normalizeValueForField = (value, field = {}) => {
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS) {
    const source = Array.isArray(value) ? value : String(value || '').split(/[,，]/)
    return [...new Set(source.map((item) => normalizeText(item, 120)).filter(Boolean))]
  }
  if (field.type === PROFILE_TEMPLATE_FIELD_TYPES.BOOLEAN) {
    if (value === true || value === 1) return 'true'
    if (value === false || value === 0) return 'false'
    const normalized = normalizeText(value, 20).toLowerCase()
    if (['true', 'yes', 'y', '1', '是'].includes(normalized)) return 'true'
    if (['false', 'no', 'n', '0', '否'].includes(normalized)) return 'false'
    return ''
  }
  return normalizeText(Array.isArray(value) ? value.join(', ') : value)
}

const isEmptyValue = (value) => (Array.isArray(value) ? value.length === 0 : !value)

const failure = (reason, extra = {}) => ({ ok: false, reason, ...extra })

const worldIdsMatch = (left, right) => {
  const normalizedLeft = normalizeText(left, 80)
  const normalizedRight = normalizeText(right, 80)
  if (normalizedLeft === normalizedRight) return true
  return LEGACY_SINGLE_WORLD_IDS.has(normalizedLeft) && LEGACY_SINGLE_WORLD_IDS.has(normalizedRight)
}

const validateDraftRef = ({ draft, profile, template, worldId }) => {
  const ref = draft?.profileRef || {}
  if (!profile?.id || Number(ref.profileId) !== Number(profile.id)) return 'profile_mismatch'
  if (Number(ref.revision) !== Number(profile.revision)) return 'stale_profile_revision'
  if (normalizeText(ref.entityType, 40) !== normalizeText(profile.entityType, 40)) {
    return 'entity_type_mismatch'
  }
  if (!CONTACTS_ENTITY_TYPE_KEYS.includes(profile.entityType)) return 'invalid_entity_type'

  const currentWorldId = normalizeText(worldId || profile.templateLink?.primaryWorldId, 80)
  if (!currentWorldId || !worldIdsMatch(ref.worldId, currentWorldId)) return 'world_mismatch'

  const currentTemplateId = normalizeText(template?.id || profile.templateLink?.profileTemplateId, 80)
  const currentTemplateVersion = Number(
    template?.version || profile.templateLink?.profileTemplateVersion,
  )
  if (!currentTemplateId || normalizeText(ref.templateId, 80) !== currentTemplateId) {
    return 'template_mismatch'
  }
  if (Number(ref.templateVersion) !== currentTemplateVersion) return 'stale_template_version'
  if (
    template?.scope === PROFILE_TEMPLATE_SCOPES.WORLD &&
    !worldIdsMatch(profile.templateLink?.primaryWorldId, currentWorldId)
  ) {
    return 'profile_world_mismatch'
  }
  if (normalizeText(profile.templateLink?.profileTemplateId, 80) !== currentTemplateId) {
    return 'profile_template_mismatch'
  }
  if (Number(profile.templateLink?.profileTemplateVersion) !== currentTemplateVersion) {
    return 'profile_template_version_mismatch'
  }
  return ''
}

const createExtensionField = ({ item, row, profile, template, extensions, now, random }) => {
  let categoryId = normalizeText(row.categoryId || item.categoryId, 80)
  const templateCategories = Array.isArray(template?.categories) ? template.categories : []
  const knownCategoryIds = new Set([
    ...templateCategories.map((category) => category?.id),
    ...extensions.categories.map((category) => category?.id),
  ])
  if (!knownCategoryIds.has(categoryId)) categoryId = ''

  if (!categoryId) {
    categoryId = createProfileExtensionCategoryId({
      templateCategories,
      profileExtensions: extensions,
      now,
      random,
    })
    extensions.categories.push({
      id: categoryId,
      label: 'Persona additions',
      description: '',
      order: templateCategories.length + extensions.categories.length,
    })
  }

  const field = normalizeProfileTemplateField({
    id: createProfileExtensionFieldId({
      templateFields: Array.isArray(template?.fields) ? template.fields : [],
      profileExtensions: extensions,
      now,
      random,
    }),
    categoryId,
    label: normalizeText(row.label || item.label, 120),
    type: row.fieldType || item.fieldType || PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
    defaultVisibilityLevel: normalizeProfileVisibilityLevel(
      row.visibilityLevel,
      PROFILE_VISIBILITY_LEVELS.FAMILIAR,
    ),
    entityTypes: [profile.entityType],
    purposes: [],
    required: false,
    recommended: false,
    order: extensions.fields.length,
  })
  extensions.fields.push(field)
  return field
}

export const buildPersonaProfileConfirmation = ({
  draft = {},
  reviewRows = [],
  profile = {},
  template = {},
  worldId = '',
  now = Date.now(),
  random = Math.random(),
} = {}) => {
  const refError = validateDraftRef({ draft, profile, template, worldId })
  if (refError) return failure(refError)

  const items = Array.isArray(draft?.items) ? draft.items : []
  if (items.length === 0) return failure('draft_empty')
  if (!Array.isArray(reviewRows) || reviewRows.length !== items.length) {
    return failure('review_incomplete')
  }

  const rowsByItemId = new Map()
  for (const row of reviewRows) {
    const itemId = normalizeText(row?.itemId, 120)
    if (!itemId || rowsByItemId.has(itemId)) return failure('review_invalid')
    if (!REVIEW_DECISION_KEYS.has(row?.decision)) return failure('review_invalid')
    if (row.decision === PERSONA_REVIEW_DECISIONS.PENDING) return failure('review_incomplete')
    rowsByItemId.set(itemId, row)
  }

  const templateFields = (Array.isArray(template?.fields) ? template.fields : []).map(
    (field, index) => normalizeProfileTemplateField(field, index),
  )
  const extensions = normalizeProfileExtensions(profile.profileExtensions)
  const fieldMap = new Map(
    [...templateFields, ...extensions.fields].map((field) => [field.id, field]),
  )
  const nextValuesByField = new Map(
    (Array.isArray(profile.profileValues) ? profile.profileValues : []).map((value) => [
      value?.fieldId,
      { ...value },
    ]),
  )
  let acceptedCount = 0
  let ignoredCount = 0

  for (const item of items) {
    const row = rowsByItemId.get(item?.id)
    if (!row) return failure('review_incomplete')
    if (row.decision === PERSONA_REVIEW_DECISIONS.IGNORE) {
      ignoredCount += 1
      continue
    }

    let field = fieldMap.get(normalizeText(row.fieldId || item.fieldId, 80))
    if (!field) {
      if (!normalizeText(row.label || item.label, 120)) return failure('accepted_label_missing')
      field = createExtensionField({ item, row, profile, template, extensions, now, random })
      fieldMap.set(field.id, field)
    }
    if (!field.entityTypes.includes(profile.entityType)) return failure('field_not_allowed_for_entity')

    const value = normalizeValueForField(row.value, field)
    if (isEmptyValue(value)) return failure('accepted_value_empty', { itemId: item.id })
    nextValuesByField.set(field.id, {
      fieldId: field.id,
      value,
      visibilityLevel: normalizeProfileVisibilityLevel(
        row.visibilityLevel,
        field.defaultVisibilityLevel || PROFILE_VISIBILITY_LEVELS.FAMILIAR,
      ),
      sourceKind: PROFILE_VALUE_SOURCE_KINDS.MANUAL,
      updatedAt: Math.max(0, Math.floor(Number(now) || 0)),
    })
    acceptedCount += 1
  }

  if (acceptedCount === 0) return failure('nothing_accepted', { ignoredCount })

  return {
    ok: true,
    reason: 'ready',
    expectedRevision: Number(profile.revision),
    expectedWorldId: normalizeText(profile.templateLink?.primaryWorldId, 80),
    expectedTemplateId: normalizeText(template.id, 80),
    expectedTemplateVersion: Number(template.version),
    acceptedCount,
    ignoredCount,
    updates: {
      profileValues: normalizeProfileValues([...nextValuesByField.values()]),
      profileExtensions: normalizeProfileExtensions(extensions),
    },
  }
}
