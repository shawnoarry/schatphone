import {
  CONTACTS_ENTITY_TYPES,
  PROFILE_TEMPLATE_FIELD_PURPOSES,
  PROFILE_VALUE_SOURCE_KINDS,
  PROFILE_VISIBILITY_LEVELS,
} from '../profile-template-schema'
import { isContactsProfileActive } from '../contacts-profile-owner'

export const PLAYER_CONTEXT_SCHEMA_VERSION = 1

export const PLAYER_CONTEXT_PURPOSES = Object.freeze({
  KPOP_IDENTITY_ELIGIBILITY_V1: 'kpop_identity_eligibility_v1',
})

export const PLAYER_CONTEXT_VALUE_KINDS = Object.freeze({
  SCALAR: 'scalar',
  LIST: 'list',
})

export const KPOP_PLAYER_CONTEXT_FIELD_ALLOWLIST_V1 = Object.freeze({
  occupationId: Object.freeze({
    fieldId: 'occupation',
    valueKind: PLAYER_CONTEXT_VALUE_KINDS.SCALAR,
  }),
  affiliationIds: Object.freeze({
    fieldId: 'affiliation',
    valueKind: PLAYER_CONTEXT_VALUE_KINDS.LIST,
  }),
  publicIdentityMode: Object.freeze({
    fieldId: 'public_identity',
    valueKind: PLAYER_CONTEXT_VALUE_KINDS.SCALAR,
  }),
})

export const KPOP_IDENTITY_EVENT_FAMILIES_V1 = Object.freeze({
  MANAGER_INCIDENT: 'kpop_manager_incident_v1',
  IDOL_PUBLIC_INCIDENT: 'kpop_idol_public_incident_v1',
})

const SUPPORTED_IDENTITY_KEYS = new Set(['occupationId', 'affiliationIds', 'publicIdentityMode'])
const DEFAULT_VISIBILITY_LEVELS = new Set([
  PROFILE_VISIBILITY_LEVELS.PUBLIC,
  PROFILE_VISIBILITY_LEVELS.WORLD_SPECIFIC,
])
const DEFAULT_SOURCE_KINDS = new Set([PROFILE_VALUE_SOURCE_KINDS.MANUAL])
const MAX_OWNER_REFS = 40
const MAX_LIST_VALUES = 20

const immutable = (value) => {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(immutable)
  return Object.freeze(value)
}

const normalizeText = (value, max = 160) => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
}

const normalizeId = (value, max = 80) => {
  const normalized = normalizeText(value, max)
  return /^[a-z0-9_-]+$/i.test(normalized) ? normalized : ''
}

const normalizeIdentityToken = (value, max = 80) => {
  const normalized = normalizeText(value, max)
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  return /^[a-z0-9_]+$/.test(normalized) ? normalized : ''
}

const normalizePositiveInteger = (value) => {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0
}

const fail = (reason) => immutable({ ok: false, reason, snapshot: null })

const normalizeFieldAllowlist = (rawAllowlist = {}) => {
  if (!rawAllowlist || typeof rawAllowlist !== 'object' || Array.isArray(rawAllowlist)) return null
  const entries = Object.entries(rawAllowlist)
  if (entries.length === 0) return null

  const normalized = {}
  for (const [identityKey, rawConfig] of entries) {
    if (!SUPPORTED_IDENTITY_KEYS.has(identityKey)) return null
    const fieldId = normalizeId(rawConfig?.fieldId)
    const valueKind = rawConfig?.valueKind
    if (
      !fieldId ||
      !Object.values(PLAYER_CONTEXT_VALUE_KINDS).includes(valueKind)
    ) {
      return null
    }
    normalized[identityKey] = { fieldId, valueKind }
  }
  return normalized
}

const listTemplateFieldIdsForSelfProfile = (profileTemplate = {}) =>
  new Set(
    (Array.isArray(profileTemplate.fields) ? profileTemplate.fields : [])
      .filter((field) => {
        const entityTypes = Array.isArray(field?.entityTypes) ? field.entityTypes : []
        const purposes = Array.isArray(field?.purposes) ? field.purposes : []
        return (
          (entityTypes.length === 0 || entityTypes.includes(CONTACTS_ENTITY_TYPES.SELF_PROFILE)) &&
          purposes.includes(PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY)
        )
      })
      .map((field) => normalizeId(field?.id))
      .filter(Boolean),
  )

const normalizeScalarValue = (value) => {
  if (Array.isArray(value)) return ''
  return normalizeIdentityToken(value)
}

const normalizeListValue = (value) => {
  const source = Array.isArray(value) ? value : [value]
  return [...new Set(source.map((item) => normalizeIdentityToken(item)).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .slice(0, MAX_LIST_VALUES)
}

const collectIdentity = ({
  selfProfile,
  profileTemplate,
  fieldAllowlist,
  allowedVisibilityLevels,
  allowedSourceKinds,
}) => {
  const templateFieldIds = listTemplateFieldIdsForSelfProfile(profileTemplate)
  const fieldConfigsById = new Map(
    Object.entries(fieldAllowlist).map(([identityKey, config]) => [
      config.fieldId,
      { identityKey, ...config },
    ]),
  )
  const selectedValues = new Map()

  for (const value of Array.isArray(selfProfile.profileValues) ? selfProfile.profileValues : []) {
    const fieldId = normalizeId(value?.fieldId || value?.id)
    const config = fieldConfigsById.get(fieldId)
    if (!config || !templateFieldIds.has(fieldId)) continue
    if (!allowedVisibilityLevels.has(value?.visibilityLevel)) continue
    if (!allowedSourceKinds.has(value?.sourceKind)) continue
    if (selectedValues.has(fieldId)) return { ok: false, reason: 'conflicting_profile_value' }
    selectedValues.set(fieldId, value?.value)
  }

  const identity = {
    occupationId: '',
    affiliationIds: [],
    publicIdentityMode: '',
  }
  Object.entries(fieldAllowlist).forEach(([identityKey, config]) => {
    if (!selectedValues.has(config.fieldId)) return
    const value = selectedValues.get(config.fieldId)
    identity[identityKey] = config.valueKind === PLAYER_CONTEXT_VALUE_KINDS.LIST
      ? normalizeListValue(value)
      : normalizeScalarValue(value)
  })

  return { ok: true, identity }
}

const normalizeOwnerStateRefs = (rawRefs = []) => {
  if (!Array.isArray(rawRefs)) return { ok: false, reason: 'invalid_owner_refs' }
  if (rawRefs.length > MAX_OWNER_REFS) return { ok: false, reason: 'owner_ref_limit_exceeded' }

  const refs = new Map()
  for (const rawRef of rawRefs) {
    const owner = normalizeId(rawRef?.owner)
    const kind = normalizeId(rawRef?.kind)
    const id = normalizeText(rawRef?.id, 180)
    const revision = normalizePositiveInteger(rawRef?.revision)
    const expectedRevision = normalizePositiveInteger(rawRef?.expectedRevision)
    if (!owner || !kind || !id || !revision || !expectedRevision) {
      return { ok: false, reason: 'invalid_owner_ref' }
    }
    if (revision !== expectedRevision) return { ok: false, reason: 'stale_owner_ref' }

    const key = `${owner}:${kind}:${id}`
    const current = refs.get(key)
    if (current && current.revision !== revision) {
      return { ok: false, reason: 'conflicting_owner_ref' }
    }
    refs.set(key, { owner, kind, id, revision })
  }

  return {
    ok: true,
    refs: [...refs.values()].sort((left, right) =>
      `${left.owner}:${left.kind}:${left.id}`.localeCompare(`${right.owner}:${right.kind}:${right.id}`),
    ),
  }
}

export const buildPlayerContextSnapshotV1 = ({
  selfProfile,
  profileTemplate,
  expectedWorldId,
  expectedProfileRevision,
  purpose,
  fieldAllowlist,
  allowedVisibilityLevels = DEFAULT_VISIBILITY_LEVELS,
  allowedSourceKinds = DEFAULT_SOURCE_KINDS,
  ownerStateRefs = [],
  capturedAt,
} = {}) => {
  if (
    !selfProfile ||
    typeof selfProfile !== 'object' ||
    selfProfile.entityType !== CONTACTS_ENTITY_TYPES.SELF_PROFILE
  ) {
    return fail('invalid_self_profile')
  }
  if (!isContactsProfileActive(selfProfile)) return fail('self_profile_archived')
  if (selfProfile.capabilities?.canAppearInWorldEvents !== true) {
    return fail('world_events_disabled')
  }

  const profileId = normalizeText(selfProfile.id, 80)
  const profileRevision = normalizePositiveInteger(selfProfile.revision)
  const requiredRevision = normalizePositiveInteger(expectedProfileRevision)
  if (!profileId || !profileRevision || !requiredRevision) return fail('missing_profile_revision')
  if (profileRevision !== requiredRevision) return fail('stale_self_profile')

  const worldId = normalizeId(expectedWorldId)
  const templateLink = selfProfile.templateLink || {}
  const linkedWorldId = normalizeId(templateLink.primaryWorldId)
  const linkedTemplateId = normalizeId(templateLink.profileTemplateId)
  const linkedTemplateVersion = normalizePositiveInteger(templateLink.profileTemplateVersion)
  if (!worldId || !linkedWorldId) return fail('missing_world_reference')
  if (linkedWorldId !== worldId) return fail('world_mismatch')
  if (!linkedTemplateId || !linkedTemplateVersion) return fail('missing_template_reference')

  if (!profileTemplate || typeof profileTemplate !== 'object' || profileTemplate.enabled === false) {
    return fail('missing_profile_template')
  }
  const currentTemplateId = normalizeId(profileTemplate.id)
  const currentTemplateVersion = normalizePositiveInteger(profileTemplate.version)
  if (currentTemplateId !== linkedTemplateId) return fail('template_mismatch')
  if (!currentTemplateVersion) return fail('missing_template_revision')
  if (currentTemplateVersion !== linkedTemplateVersion) return fail('stale_profile_template')

  const normalizedPurpose = normalizeId(purpose)
  const normalizedAllowlist = normalizeFieldAllowlist(fieldAllowlist)
  if (!normalizedPurpose || !normalizedAllowlist) return fail('invalid_projection_policy')
  const eventEligibleFieldIds = listTemplateFieldIdsForSelfProfile(profileTemplate)
  if (
    Object.values(normalizedAllowlist).some(
      (config) => !eventEligibleFieldIds.has(config.fieldId),
    )
  ) {
    return fail('event_field_purpose_missing')
  }

  const visibilityLevelList = Array.isArray(allowedVisibilityLevels)
    ? allowedVisibilityLevels
    : allowedVisibilityLevels instanceof Set
      ? [...allowedVisibilityLevels]
      : []
  const sourceKindList = Array.isArray(allowedSourceKinds)
    ? allowedSourceKinds
    : allowedSourceKinds instanceof Set
      ? [...allowedSourceKinds]
      : []
  const visibilityLevels = new Set(
    visibilityLevelList.filter((level) =>
      Object.values(PROFILE_VISIBILITY_LEVELS).includes(level),
    ),
  )
  const sourceKinds = new Set(
    sourceKindList.filter((kind) => Object.values(PROFILE_VALUE_SOURCE_KINDS).includes(kind)),
  )
  if (visibilityLevels.size === 0 || sourceKinds.size === 0) return fail('invalid_projection_policy')

  const identityResult = collectIdentity({
    selfProfile,
    profileTemplate,
    fieldAllowlist: normalizedAllowlist,
    allowedVisibilityLevels: visibilityLevels,
    allowedSourceKinds: sourceKinds,
  })
  if (!identityResult.ok) return fail(identityResult.reason)

  const ownerRefsResult = normalizeOwnerStateRefs(ownerStateRefs)
  if (!ownerRefsResult.ok) return fail(ownerRefsResult.reason)

  const capturedAtRevision = normalizePositiveInteger(capturedAt)
  if (!capturedAtRevision) return fail('missing_capture_time')

  return immutable({
    ok: true,
    reason: 'projected',
    snapshot: {
      schemaVersion: PLAYER_CONTEXT_SCHEMA_VERSION,
      purpose: normalizedPurpose,
      selfProfileRef: {
        profileId,
        revision: profileRevision,
        worldId,
        templateId: linkedTemplateId,
        templateVersion: linkedTemplateVersion,
      },
      identity: identityResult.identity,
      stateRefs: ownerRefsResult.refs,
      capturedAt: capturedAtRevision,
    },
  })
}

export const buildKpopPlayerContextSnapshotV1 = (options = {}) =>
  buildPlayerContextSnapshotV1({
    ...options,
    purpose: PLAYER_CONTEXT_PURPOSES.KPOP_IDENTITY_ELIGIBILITY_V1,
    fieldAllowlist: KPOP_PLAYER_CONTEXT_FIELD_ALLOWLIST_V1,
  })

export const evaluateKpopIdentityEligibilityV1 = ({
  snapshot,
  eventFamily,
  expectedWorldId,
  expectedProfileRevision,
} = {}) => {
  const family = normalizeId(eventFamily)
  const worldId = normalizeId(expectedWorldId)
  const profileRevision = normalizePositiveInteger(expectedProfileRevision)
  if (
    !snapshot ||
    typeof snapshot !== 'object' ||
    snapshot.schemaVersion !== PLAYER_CONTEXT_SCHEMA_VERSION ||
    snapshot.purpose !== PLAYER_CONTEXT_PURPOSES.KPOP_IDENTITY_ELIGIBILITY_V1
  ) {
    return immutable({ eligible: false, reason: 'invalid_player_context' })
  }
  if (!worldId || snapshot.selfProfileRef?.worldId !== worldId) {
    return immutable({ eligible: false, reason: 'world_mismatch' })
  }
  if (!profileRevision || snapshot.selfProfileRef?.revision !== profileRevision) {
    return immutable({ eligible: false, reason: 'stale_self_profile' })
  }

  if (family === KPOP_IDENTITY_EVENT_FAMILIES_V1.MANAGER_INCIDENT) {
    return immutable({
      eligible: snapshot.identity?.occupationId === 'manager',
      reason:
        snapshot.identity?.occupationId === 'manager'
          ? 'eligible_manager_identity'
          : 'manager_identity_required',
    })
  }
  if (family === KPOP_IDENTITY_EVENT_FAMILIES_V1.IDOL_PUBLIC_INCIDENT) {
    const eligible =
      snapshot.identity?.occupationId === 'idol' &&
      snapshot.identity?.publicIdentityMode === 'public_figure'
    return immutable({
      eligible,
      reason: eligible ? 'eligible_idol_public_identity' : 'idol_public_identity_required',
    })
  }

  return immutable({ eligible: false, reason: 'unsupported_event_family' })
}
