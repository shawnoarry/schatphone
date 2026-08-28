import {
  CONTACTS_ENTITY_TYPES,
  PROFILE_TEMPLATE_FIELD_PURPOSES,
} from './profile-template-schema'
import { buildContactsProfileProjection } from './contacts-profile-projection'
import { isContactsProfileActive } from './contacts-profile-owner'
import { buildRoleContinuityProjection } from './role-continuity-projection'

export const ROLE_IDENTITY_PROJECTION_LIMITS = Object.freeze({
  profileValues: 40,
  profileCharacters: 2200,
})

const normalizeText = (value, max = 600) => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
}

const formatValue = (value) => {
  if (Array.isArray(value)) return value.map((item) => normalizeText(item, 160)).filter(Boolean).join(', ')
  return normalizeText(value)
}

const formatProfileFacts = (values = [], options = {}) => {
  const itemLimit = Math.min(
    80,
    Math.max(0, Math.floor(Number(options.profileValueLimit) || ROLE_IDENTITY_PROJECTION_LIMITS.profileValues)),
  )
  const characterBudget = Math.min(
    6000,
    Math.max(
      0,
      Math.floor(
        Number(options.profileCharacterBudget) || ROLE_IDENTITY_PROJECTION_LIMITS.profileCharacters,
      ),
    ),
  )
  const selected = []

  for (const value of Array.isArray(values) ? values : []) {
    if (selected.length >= itemLimit) break
    const fieldId = normalizeText(value?.fieldId || value?.id, 80)
    const renderedValue = formatValue(value?.value)
    if (!fieldId || !renderedValue) continue
    const line = `${normalizeText(value?.label, 120) || fieldId}: ${renderedValue}`
    const candidate = selected.length > 0 ? `${selected.join('; ')}; ${line}` : line
    if (candidate.length > characterBudget) continue
    selected.push(line)
  }

  return {
    text: selected.length > 0 ? selected.join('; ') : 'none',
    selectedCount: selected.length,
    omittedCount: Math.max(0, (Array.isArray(values) ? values.length : 0) - selected.length),
  }
}

const isEligibleRoleProfile = (contact, profile) =>
  (contact?.kind || 'role') === 'role' &&
  profile &&
  typeof profile === 'object' &&
  isContactsProfileActive(profile) &&
  profile.entityType !== CONTACTS_ENTITY_TYPES.SELF_PROFILE

export const buildRoleIdentityProjection = (input = {}) => {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const contact = source.contact && typeof source.contact === 'object' ? source.contact : {}
  const profile = source.profile && typeof source.profile === 'object' ? source.profile : null

  if (!isEligibleRoleProfile(contact, profile)) {
    return Object.freeze({
      roleBound: false,
      stableText: '',
      dynamicText: '',
      identity: Object.freeze({ name: '', role: '', entityType: '' }),
      selectedRefs: Object.freeze({ manualDetailIds: [], eventDetailIds: [], memoryKeys: [] }),
      omittedCounts: Object.freeze({ profileValues: 0, manual: 0, eventAttached: 0 }),
    })
  }

  const name = normalizeText(profile.name || contact.name, 120) || 'Unnamed role'
  const role = normalizeText(profile.role || contact.role, 160) || 'unspecified'
  const bio = normalizeText(profile.bio || contact.bio, 1200) || 'none'
  const relationshipLabel = normalizeText(profile.relationshipLabelText, 160)
  const relationshipNote = normalizeText(profile.relationshipLabelNote, 600)
  const linkedTemplate = (Array.isArray(source.profileTemplates) ? source.profileTemplates : [])
    .find((template) => template?.id === profile.templateLink?.profileTemplateId)
  const profileProjection = buildContactsProfileProjection({
    purpose: PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
    profile,
    template: linkedTemplate,
    expectedWorldId: source.expectedWorldId || profile.templateLink?.primaryWorldId,
    expectedProfileRevision: source.expectedProfileRevision || profile.revision,
    allowedEntityTypes: [
      CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
      CONTACTS_ENTITY_TYPES.NPC,
    ],
    allowedVisibilityLevels: new Set(['public', 'familiar', ...(source.allowIntimateProfileValues ? ['intimate'] : [])]),
  })
  const profileFacts = formatProfileFacts(profileProjection.projection?.fields || [], source)
  const continuity = buildRoleContinuityProjection({
    roleDetailItems: profile.detailItems,
    recalledMemories: source.recalledMemories,
    manualItemLimit: source.manualItemLimit,
    manualCharacterBudget: source.manualCharacterBudget,
    eventClueLimit: source.eventClueLimit,
    eventCharacterBudget: source.eventCharacterBudget,
  })

  const identityLines = [
    'Role identity from the bound Contacts profile:',
    `Your role: ${name} (${role})`,
    `Role persona: ${bio}.`,
    `Current role profile values: ${profileFacts.text}.`,
    relationshipLabel ? `Relationship premise: ${relationshipLabel}.` : '',
    relationshipNote ? `Relationship premise note: ${relationshipNote}.` : '',
  ].filter(Boolean)

  return Object.freeze({
    roleBound: true,
    stableText: [identityLines.join('\n'), continuity.stableText].filter(Boolean).join('\n'),
    dynamicText: continuity.dynamicText,
    identity: Object.freeze({
      name,
      role,
      entityType: normalizeText(profile.entityType, 40),
    }),
    selectedRefs: Object.freeze({
      manualDetailIds: Object.freeze([...continuity.selectedRefs.manualDetailIds]),
      eventDetailIds: Object.freeze([...continuity.selectedRefs.eventDetailIds]),
      memoryKeys: Object.freeze([...continuity.selectedRefs.memoryKeys]),
    }),
    omittedCounts: Object.freeze({
      profileValues: profileFacts.omittedCount + Math.max(
        0,
        (Array.isArray(profile.profileValues) ? profile.profileValues.length : 0) -
          (profileProjection.projection?.fields?.length || 0),
      ),
      manual: continuity.omittedCounts.manual,
      eventAttached: continuity.omittedCounts.eventAttached,
    }),
    profileProjectionReason: profileProjection.reason,
  })
}
