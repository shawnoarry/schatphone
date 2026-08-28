import {
  PROFILE_VALUE_SOURCE_KINDS,
  PROFILE_VISIBILITY_LEVELS,
  normalizeProfileExtensions,
  normalizeProfileTemplateField,
} from './profile-template-schema'
import { isContactsProfileActive } from './contacts-profile-owner'

const LEGACY_SINGLE_WORLD_IDS = new Set(['legacy_single_world', 'default_world'])
const DEFAULT_VISIBILITY = new Set([
  PROFILE_VISIBILITY_LEVELS.PUBLIC,
  PROFILE_VISIBILITY_LEVELS.FAMILIAR,
])

const immutable = (value) => {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(immutable)
  return Object.freeze(value)
}

const normalizeText = (value, max = 600) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
    : ''

const worldsMatch = (left, right) => {
  const a = normalizeText(left, 80)
  const b = normalizeText(right, 80)
  return a === b || (LEGACY_SINGLE_WORLD_IDS.has(a) && LEGACY_SINGLE_WORLD_IDS.has(b))
}

const fail = (reason) => immutable({ ok: false, reason, projection: null })

export const buildContactsProfileProjection = ({
  purpose = '',
  profile,
  template,
  expectedWorldId,
  expectedProfileRevision,
  allowedEntityTypes = [],
  allowedVisibilityLevels = DEFAULT_VISIBILITY,
  allowedFieldIds,
} = {}) => {
  const normalizedPurpose = normalizeText(purpose, 80)
  if (!normalizedPurpose) return fail('purpose_missing')
  if (!profile || typeof profile !== 'object') return fail('profile_missing')
  if (!isContactsProfileActive(profile)) return fail('profile_archived')
  if (Array.isArray(allowedEntityTypes) && allowedEntityTypes.length > 0 && !allowedEntityTypes.includes(profile.entityType)) {
    return fail('entity_type_not_allowed')
  }
  if (!Number.isSafeInteger(Number(profile.revision)) || Number(profile.revision) <= 0) {
    return fail('profile_revision_missing')
  }
  if (Number(profile.revision) !== Number(expectedProfileRevision)) return fail('stale_profile_revision')

  const link = profile.templateLink || {}
  if (!expectedWorldId || !link.primaryWorldId) return fail('world_missing')
  if (!worldsMatch(link.primaryWorldId, expectedWorldId)) return fail('world_mismatch')
  if (!template || typeof template !== 'object' || template.enabled === false) return fail('template_missing')
  if (normalizeText(template.id, 80) !== normalizeText(link.profileTemplateId, 80)) {
    return fail('template_mismatch')
  }
  if (Number(template.version) !== Number(link.profileTemplateVersion)) return fail('stale_template_version')

  const extensionFields = normalizeProfileExtensions(profile.profileExtensions).fields
  const fields = [
    ...(Array.isArray(template.fields) ? template.fields : []),
    ...extensionFields,
  ].map((field, index) => normalizeProfileTemplateField(field, index))
  const allowlist = allowedFieldIds ? new Set(allowedFieldIds) : null
  const fieldMap = new Map(
    fields
      .filter((field) => field.entityTypes.includes(profile.entityType))
      .filter((field) => field.purposes.includes(normalizedPurpose))
      .filter((field) => !allowlist || allowlist.has(field.id))
      .map((field) => [field.id, field]),
  )
  const visibility = allowedVisibilityLevels instanceof Set
    ? allowedVisibilityLevels
    : new Set(Array.isArray(allowedVisibilityLevels) ? allowedVisibilityLevels : [])
  const projectedFields = []

  for (const value of Array.isArray(profile.profileValues) ? profile.profileValues : []) {
    const field = fieldMap.get(value?.fieldId)
    if (!field) continue
    if (value?.sourceKind !== PROFILE_VALUE_SOURCE_KINDS.MANUAL) continue
    if (!visibility.has(value?.visibilityLevel)) continue
    const rendered = Array.isArray(value.value)
      ? value.value.map((item) => normalizeText(item, 120)).filter(Boolean)
      : normalizeText(value.value)
    if (Array.isArray(rendered) ? rendered.length === 0 : !rendered) continue
    projectedFields.push({ fieldId: field.id, label: field.label, value: rendered })
  }

  return immutable({
    ok: true,
    reason: 'projected',
    projection: {
      purpose: normalizedPurpose,
      profileRef: {
        profileId: Number(profile.id),
        revision: Number(profile.revision),
        entityType: profile.entityType,
        worldId: normalizeText(link.primaryWorldId, 80),
        templateId: normalizeText(link.profileTemplateId, 80),
        templateVersion: Number(link.profileTemplateVersion),
      },
      fields: projectedFields,
    },
  })
}
