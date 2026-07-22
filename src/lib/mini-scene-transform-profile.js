import {
  MINI_SCENE_ERROR_CODES,
  MINI_SCENE_LIMITS,
  MINI_SCENE_REGEX_FLAGS,
  MINI_SCENE_SCHEMA_VERSION,
  MINI_SCENE_TRANSFORM_INPUT_FIELDS,
  MINI_SCENE_TRANSFORM_OPERATIONS,
  isMiniScenePlainObject,
  listMiniSceneUnknownFields,
  normalizeMiniSceneId,
  normalizeMiniSceneIdList,
  normalizeMiniSceneInlineText,
  normalizeMiniSceneText,
  sortMiniSceneIssues,
} from './mini-scene-contract'
import { normalizeMiniSceneWorldScope } from './mini-scene-schema'

export const MINI_SCENE_TRANSFORM_PROFILE_TYPE = 'schatphone.mini_scene_transform_profile'

const TOP_LEVEL_FIELDS = new Set([
  'type',
  'schemaVersion',
  'profileId',
  'worldScopes',
  'appliesTo',
  'contentDimensions',
  'templateId',
  'rules',
])
const APPLIES_TO_FIELDS = new Set(['moduleKeys', 'sceneTypes'])
const SCOPE_FIELDS = new Set(['kind', 'id'])
const CONTENT_DIMENSION_FIELDS = new Set(['id', 'label', 'description'])
const RULE_FIELDS = new Set([
  'id',
  'order',
  'operation',
  'inputField',
  'pattern',
  'flags',
  'replacement',
  'targetSlot',
  'variantId',
])
const CONTENT_DIMENSION_PRESET_FIELDS = new Set([
  'choice',
  'default',
  'defaultChoice',
  'enabled',
  'include',
  'exclude',
])
const OPERATION_SET = new Set(MINI_SCENE_TRANSFORM_OPERATIONS)
const INPUT_FIELD_SET = new Set(MINI_SCENE_TRANSFORM_INPUT_FIELDS)
const FLAG_SET = new Set(MINI_SCENE_REGEX_FLAGS)

const hasUnsupportedRegexFeature = (pattern) =>
  /\(\?(?:[=!]|<[=!]|>)|\\(?:[1-9]|k<)/.test(pattern)

const normalizeFlags = (value) => {
  const flags = typeof value === 'string' ? value.trim() : ''
  return MINI_SCENE_REGEX_FLAGS.filter((flag) => flags.includes(flag)).join('')
}

const addUnknownFieldWarning = (warnings, source, allowedFields, path) => {
  const fields = listMiniSceneUnknownFields(source, allowedFields)
  if (fields.length > 0) {
    warnings.push({ code: MINI_SCENE_ERROR_CODES.FIELDS_IGNORED, path, fields })
  }
}

const normalizeContentDimension = (raw, index, errors, warnings) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const path = `contentDimensions[${index}]`
  addUnknownFieldWarning(warnings, source, CONTENT_DIMENSION_FIELDS, path)
  const presetFields = Object.keys(source).filter((field) => CONTENT_DIMENSION_PRESET_FIELDS.has(field))
  if (presetFields.length > 0) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID,
      path,
      reason: 'content_dimension_choice_forbidden',
      fields: presetFields.sort((a, b) => a.localeCompare(b)),
    })
  }
  const id = normalizeMiniSceneId(source.id)
  if (!id) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: `${path}.id`, reason: 'required' })
    return null
  }
  return {
    id,
    label: normalizeMiniSceneInlineText(source.label, id, 120),
    description: normalizeMiniSceneText(source.description, '', 500),
  }
}

const validateRuleRegex = ({ pattern, flags, path, errors }) => {
  if (!pattern) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.REGEX_INVALID, path: `${path}.pattern`, reason: 'required' })
    return
  }
  if (pattern.length > MINI_SCENE_LIMITS.maxPatternChars) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.REGEX_LIMIT_EXCEEDED,
      path: `${path}.pattern`,
      reason: 'pattern_too_long',
      max: MINI_SCENE_LIMITS.maxPatternChars,
    })
    return
  }
  const rawFlags = typeof flags === 'string' ? flags.trim() : ''
  const uniqueFlags = new Set(rawFlags.split(''))
  if ([...uniqueFlags].some((flag) => !FLAG_SET.has(flag)) || uniqueFlags.size !== rawFlags.length) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.REGEX_UNSUPPORTED,
      path: `${path}.flags`,
      reason: 'flags_not_allowed',
    })
    return
  }
  if (hasUnsupportedRegexFeature(pattern)) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.REGEX_UNSUPPORTED,
      path: `${path}.pattern`,
      reason: 'not_re2_compatible',
    })
    return
  }
  try {
    new RegExp(pattern, rawFlags)
  } catch {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.REGEX_INVALID,
      path: `${path}.pattern`,
      reason: 'compile_failed',
    })
  }
}

const normalizeRule = (raw, index, errors, warnings) => {
  const source = isMiniScenePlainObject(raw) ? raw : {}
  const path = `rules[${index}]`
  addUnknownFieldWarning(warnings, source, RULE_FIELDS, path)
  const id = normalizeMiniSceneId(source.id)
  const operation = normalizeMiniSceneId(source.operation)
  const inputField = normalizeMiniSceneId(source.inputField)
  const pattern = typeof source.pattern === 'string' ? source.pattern : ''
  const flags = normalizeFlags(source.flags)
  const replacement = typeof source.replacement === 'string' ? source.replacement : ''
  const targetSlot = normalizeMiniSceneId(source.targetSlot)
  const variantId = normalizeMiniSceneId(source.variantId)

  if (!id) errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: `${path}.id`, reason: 'required' })
  if (!OPERATION_SET.has(operation)) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: `${path}.operation`, reason: 'unsupported' })
  }
  if (!INPUT_FIELD_SET.has(inputField)) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: `${path}.inputField`, reason: 'unsupported' })
  }
  if (replacement.length > MINI_SCENE_LIMITS.maxReplacementChars) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.REGEX_LIMIT_EXCEEDED,
      path: `${path}.replacement`,
      reason: 'replacement_too_long',
      max: MINI_SCENE_LIMITS.maxReplacementChars,
    })
  }
  if (operation === 'capture_slot' && !targetSlot) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: `${path}.targetSlot`, reason: 'required' })
  }
  if (operation === 'select_variant' && !variantId) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: `${path}.variantId`, reason: 'required' })
  }
  validateRuleRegex({ pattern, flags: source.flags, path, errors })

  return {
    id,
    order: Math.max(0, Math.floor(Number(source.order) || 0)),
    operation,
    inputField,
    pattern,
    flags,
    replacement: replacement.slice(0, MINI_SCENE_LIMITS.maxReplacementChars),
    targetSlot,
    variantId,
  }
}

const parseProfilePayload = (payload, errors) => {
  if (isMiniScenePlainObject(payload)) return payload
  if (typeof payload !== 'string' || !payload.trim()) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: 'content', reason: 'required' })
    return null
  }
  if (payload.length > MINI_SCENE_LIMITS.maxProfileChars) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID,
      path: 'content',
      reason: 'payload_too_large',
      max: MINI_SCENE_LIMITS.maxProfileChars,
    })
    return null
  }
  try {
    const parsed = JSON.parse(payload)
    if (isMiniScenePlainObject(parsed)) return parsed
  } catch {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: 'content', reason: 'invalid_json' })
    return null
  }
  errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: 'content', reason: 'object_required' })
  return null
}

export const validateMiniSceneTransformProfile = (payload) => {
  const errors = []
  const warnings = []
  const source = parseProfilePayload(payload, errors)
  if (!source) return { ok: false, profile: null, errors: sortMiniSceneIssues(errors), warnings }

  addUnknownFieldWarning(warnings, source, TOP_LEVEL_FIELDS, '')
  const appliesTo = isMiniScenePlainObject(source.appliesTo) ? source.appliesTo : {}
  addUnknownFieldWarning(warnings, appliesTo, APPLIES_TO_FIELDS, 'appliesTo')
  const rawWorldScopes = Array.isArray(source.worldScopes) ? source.worldScopes : []
  if (rawWorldScopes.length > MINI_SCENE_LIMITS.maxWorldScopes) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID,
      path: 'worldScopes',
      reason: 'too_many_scopes',
      max: MINI_SCENE_LIMITS.maxWorldScopes,
    })
  }
  const worldScopes = rawWorldScopes
    .slice(0, MINI_SCENE_LIMITS.maxWorldScopes)
    .map((scope, index) => {
      addUnknownFieldWarning(warnings, scope, SCOPE_FIELDS, `worldScopes[${index}]`)
      const normalized = normalizeMiniSceneWorldScope(scope)
      if (!normalized) {
        errors.push({
          code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID,
          path: `worldScopes[${index}]`,
          reason: 'invalid_scope',
        })
      }
      return normalized
    })
    .filter(Boolean)
    .sort((left, right) => `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`))
  const rawContentDimensions = Array.isArray(source.contentDimensions)
    ? source.contentDimensions
    : []
  if (rawContentDimensions.length > MINI_SCENE_LIMITS.maxContentDimensions) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID,
      path: 'contentDimensions',
      reason: 'too_many_dimensions',
      max: MINI_SCENE_LIMITS.maxContentDimensions,
    })
  }
  const contentDimensions = rawContentDimensions
    .slice(0, MINI_SCENE_LIMITS.maxContentDimensions)
    .map((item, index) => normalizeContentDimension(item, index, errors, warnings))
    .filter(Boolean)
    .sort((left, right) => left.id.localeCompare(right.id))
  const rawRules = Array.isArray(source.rules) ? source.rules : []
  if (rawRules.length > MINI_SCENE_LIMITS.maxProfileRules) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.REGEX_LIMIT_EXCEEDED,
      path: 'rules',
      reason: 'too_many_rules',
      max: MINI_SCENE_LIMITS.maxProfileRules,
    })
  }
  const rules = rawRules
    .slice(0, MINI_SCENE_LIMITS.maxProfileRules)
    .map((rule, index) => normalizeRule(rule, index, errors, warnings))
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))

  const profile = {
    type: normalizeMiniSceneText(source.type, '', 120),
    schemaVersion: Math.max(0, Math.floor(Number(source.schemaVersion) || 0)),
    profileId: normalizeMiniSceneId(source.profileId),
    worldScopes,
    appliesTo: {
      moduleKeys: normalizeMiniSceneIdList(appliesTo.moduleKeys, { sort: true }),
      sceneTypes: normalizeMiniSceneIdList(appliesTo.sceneTypes, { sort: true }),
    },
    contentDimensions,
    templateId: normalizeMiniSceneId(source.templateId),
    rules,
  }

  if (profile.type !== MINI_SCENE_TRANSFORM_PROFILE_TYPE) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: 'type', reason: 'unsupported' })
  }
  if (profile.schemaVersion !== MINI_SCENE_SCHEMA_VERSION) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: 'schemaVersion', reason: 'unsupported' })
  }
  if (!profile.profileId) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: 'profileId', reason: 'required' })
  }
  if (profile.worldScopes.length === 0) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: 'worldScopes', reason: 'required' })
  }
  if (profile.appliesTo.moduleKeys.length === 0) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: 'appliesTo.moduleKeys', reason: 'required' })
  }
  if (profile.appliesTo.sceneTypes.length === 0) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID, path: 'appliesTo.sceneTypes', reason: 'required' })
  }
  if (!profile.templateId) {
    errors.push({ code: MINI_SCENE_ERROR_CODES.TEMPLATE_MISSING, path: 'templateId', reason: 'required' })
  }

  const duplicateRuleIds = rules
    .map((rule) => rule.id)
    .filter((id, index, ids) => id && ids.indexOf(id) !== index)
  if (duplicateRuleIds.length > 0) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID,
      path: 'rules',
      reason: 'duplicate_rule_id',
      ids: [...new Set(duplicateRuleIds)].sort((a, b) => a.localeCompare(b)),
    })
  }

  const duplicateDimensionIds = contentDimensions
    .map((dimension) => dimension.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index)
  if (duplicateDimensionIds.length > 0) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID,
      path: 'contentDimensions',
      reason: 'duplicate_dimension_id',
      ids: [...new Set(duplicateDimensionIds)].sort((a, b) => a.localeCompare(b)),
    })
  }

  const scopeKeys = worldScopes.map((scope) => `${scope.kind}:${scope.id}`)
  const duplicateScopeKeys = scopeKeys.filter((key, index) => scopeKeys.indexOf(key) !== index)
  if (duplicateScopeKeys.length > 0) {
    errors.push({
      code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID,
      path: 'worldScopes',
      reason: 'duplicate_scope',
      scopes: [...new Set(duplicateScopeKeys)].sort((a, b) => a.localeCompare(b)),
    })
  }

  return {
    ok: errors.length === 0,
    profile,
    errors: sortMiniSceneIssues(errors),
    warnings: sortMiniSceneIssues(warnings),
  }
}

export const validateMiniSceneTransformProfileAsset = (asset = {}) => {
  const source = isMiniScenePlainObject(asset) ? asset : {}
  if ((source.category || source.assetType) !== 'world_rule' || source.format !== 'structured_json') {
    return {
      ok: false,
      profile: null,
      errors: [
        {
          code: MINI_SCENE_ERROR_CODES.PROFILE_INVALID,
          path: 'asset',
          reason: 'world_rule_structured_json_required',
        },
      ],
      warnings: [],
    }
  }
  return validateMiniSceneTransformProfile(source.content)
}
