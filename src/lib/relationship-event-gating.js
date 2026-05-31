import { normalizeRelationshipProfileFields } from './relationship-classification-schema'

export const RELATIONSHIP_EVENT_GATE_DECISION = Object.freeze({
  ALLOW: 'allow',
  BLOCK: 'block',
  CONFIRM: 'confirm',
})

export const RELATIONSHIP_EVENT_GATE_PRESET_IDS = Object.freeze({
  ROMANCE_CONFESSION: 'romance_confession',
  RELATIONSHIP_CONFIRMATION: 'relationship_confirmation',
  JEALOUS_BOUNDARY: 'jealous_boundary',
})

const RELATIONSHIP_EVENT_GATE_PRESETS = Object.freeze({
  [RELATIONSHIP_EVENT_GATE_PRESET_IDS.ROMANCE_CONFESSION]: Object.freeze({
    eventType: 'confession_candidate',
    risk: 'high',
    rule: Object.freeze({
      allowedPrimaryCategoryIds: Object.freeze(['romance_candidate', 'romantic_bond']),
      requiredModifierIds: Object.freeze(['mutual']),
      confirmOnModifierMismatch: true,
    }),
  }),
  [RELATIONSHIP_EVENT_GATE_PRESET_IDS.RELATIONSHIP_CONFIRMATION]: Object.freeze({
    eventType: 'relationship_confirmation',
    risk: 'high',
    rule: Object.freeze({
      allowedPrimaryCategoryIds: Object.freeze(['romance_candidate', 'romantic_bond']),
      blockedPrimaryCategoryIds: Object.freeze(['family_bond', 'professional_bond']),
    }),
  }),
  [RELATIONSHIP_EVENT_GATE_PRESET_IDS.JEALOUS_BOUNDARY]: Object.freeze({
    eventType: 'jealous_boundary',
    risk: 'high',
    rule: Object.freeze({
      allowedPrimaryCategoryIds: Object.freeze(['romance_candidate', 'romantic_bond', 'rival_bond']),
      blockedPrimaryCategoryIds: Object.freeze(['family_bond']),
      requiredModifierIds: Object.freeze(['mutual']),
      confirmOnModifierMismatch: true,
    }),
  }),
})

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeId = (value, fallback = '') =>
  normalizeText(value, fallback, 120)
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback

const toIdSet = (value = []) =>
  new Set((Array.isArray(value) ? value : []).map((item) => normalizeId(item, '')).filter(Boolean))

const cloneGateRule = (rule = {}) => ({
  allowedPrimaryCategoryIds: Array.isArray(rule.allowedPrimaryCategoryIds)
    ? [...rule.allowedPrimaryCategoryIds]
    : [],
  preferredPrimaryCategoryIds: Array.isArray(rule.preferredPrimaryCategoryIds)
    ? [...rule.preferredPrimaryCategoryIds]
    : [],
  blockedPrimaryCategoryIds: Array.isArray(rule.blockedPrimaryCategoryIds)
    ? [...rule.blockedPrimaryCategoryIds]
    : [],
  requiredModifierIds: Array.isArray(rule.requiredModifierIds) ? [...rule.requiredModifierIds] : [],
  confirmOnModifierMismatch: rule.confirmOnModifierMismatch === true,
})

export const resolveRelationshipEventGatePreset = (presetId = '') => {
  const id = normalizeId(presetId, '')
  const preset = RELATIONSHIP_EVENT_GATE_PRESETS[id]
  if (!preset) return null
  return {
    id,
    eventType: preset.eventType,
    risk: preset.risk,
    rule: cloneGateRule(preset.rule),
  }
}

export const buildRelationshipClassificationContextForTarget = ({
  chatStore,
  target = {},
  registry = null,
} = {}) => {
  const profileId = Math.max(0, Math.floor(Number(target?.profileId ?? target?.roleProfileId) || 0))
  const profile =
    profileId > 0 && typeof chatStore?.getRoleProfileById === 'function'
      ? chatStore.getRoleProfileById(profileId)
      : null
  const fields = normalizeRelationshipProfileFields(profile || {})
  const hasRegistry =
    typeof registry?.categoryById?.has === 'function' &&
    typeof registry?.modifierById?.has === 'function'
  let primaryRelationshipCategoryId = fields.primaryRelationshipCategoryId || 'ordinary_acquaintance'
  if (hasRegistry && !registry.categoryById.has(primaryRelationshipCategoryId)) {
    primaryRelationshipCategoryId = 'ordinary_acquaintance'
  }

  return {
    profileId,
    primaryRelationshipCategoryId,
    relationshipModifierIds: hasRegistry
      ? fields.relationshipModifierIds.filter((id) => registry.modifierById.has(id))
      : fields.relationshipModifierIds,
    classificationConfidence: fields.classificationConfidence,
    classificationSource: fields.classificationSource,
    classificationUpdatedAt: fields.classificationUpdatedAt,
  }
}

export const evaluateRelationshipEventGate = ({
  eventType = '',
  risk = 'low',
  classification = {},
  rule = {},
} = {}) => {
  const primaryRelationshipCategoryId = normalizeId(
    classification.primaryRelationshipCategoryId,
    'ordinary_acquaintance',
  )
  const relationshipModifierIds = Array.isArray(classification.relationshipModifierIds)
    ? [...new Set(classification.relationshipModifierIds.map((item) => normalizeId(item, '')).filter(Boolean))]
    : []
  const modifierSet = new Set(relationshipModifierIds)
  const allowedPrimaryCategoryIds = toIdSet(rule.allowedPrimaryCategoryIds)
  const preferredPrimaryCategoryIds = toIdSet(rule.preferredPrimaryCategoryIds)
  const blockedPrimaryCategoryIds = toIdSet(rule.blockedPrimaryCategoryIds)
  const requiredModifierIds = toIdSet(rule.requiredModifierIds)

  const blocked = blockedPrimaryCategoryIds.has(primaryRelationshipCategoryId)
  const allowedMatch =
    allowedPrimaryCategoryIds.size === 0 || allowedPrimaryCategoryIds.has(primaryRelationshipCategoryId)
  const preferredMatch =
    preferredPrimaryCategoryIds.size === 0 || preferredPrimaryCategoryIds.has(primaryRelationshipCategoryId)
  const requiredModifiersMatch = [...requiredModifierIds].every((id) => modifierSet.has(id))
  const matched = !blocked && allowedMatch && preferredMatch && requiredModifiersMatch
  const base = {
    eventType: normalizeText(eventType, 'relationship_event', 100),
    primaryRelationshipCategoryId,
    relationshipModifierIds,
    classificationConfidence: normalizeId(classification.classificationConfidence, ''),
    classificationSource: normalizeId(classification.classificationSource, ''),
    classificationUpdatedAt: Math.max(0, Math.floor(Number(classification.classificationUpdatedAt) || 0)),
    matched,
  }

  if (risk === 'high') {
    if (blocked) {
      return {
        ...base,
        decision: RELATIONSHIP_EVENT_GATE_DECISION.BLOCK,
        mode: 'hard_gate',
        reason: 'primary_category_blocked',
        matched: false,
      }
    }
    if (!allowedMatch) {
      return {
        ...base,
        decision: RELATIONSHIP_EVENT_GATE_DECISION.BLOCK,
        mode: 'hard_gate',
        reason: 'primary_category_not_allowed',
        matched: false,
      }
    }
    if (!requiredModifiersMatch) {
      return {
        ...base,
        decision: rule.confirmOnModifierMismatch === true
          ? RELATIONSHIP_EVENT_GATE_DECISION.CONFIRM
          : RELATIONSHIP_EVENT_GATE_DECISION.BLOCK,
        mode: 'hard_gate',
        reason: 'required_modifier_missing',
        matched: false,
      }
    }
    return {
      ...base,
      decision: RELATIONSHIP_EVENT_GATE_DECISION.ALLOW,
      mode: 'hard_gate',
      reason: 'matched',
      matched: true,
    }
  }

  return {
    ...base,
    decision: RELATIONSHIP_EVENT_GATE_DECISION.ALLOW,
    mode: 'soft_reference',
    reason: matched ? 'matched' : 'soft_mismatch_allowed',
  }
}

export const buildRelationshipFactGate = ({
  chatStore,
  target,
  factType,
  risk = 'low',
  rule = {},
  registry,
} = {}) => {
  const classification = buildRelationshipClassificationContextForTarget({
    chatStore,
    target,
    registry,
  })
  return evaluateRelationshipEventGate({
    eventType: factType,
    risk,
    classification,
    rule,
  })
}

export const buildRelationshipFactGateFromPreset = ({
  chatStore,
  target,
  presetId,
  registry,
  ruleOverrides = {},
} = {}) => {
  const preset = resolveRelationshipEventGatePreset(presetId)
  if (!preset) return null
  return buildRelationshipFactGate({
    chatStore,
    target,
    factType: preset.eventType,
    risk: preset.risk,
    registry,
    rule: {
      ...preset.rule,
      ...ruleOverrides,
    },
  })
}
