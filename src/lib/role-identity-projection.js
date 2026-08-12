import { CONTACTS_ENTITY_TYPES } from './profile-template-schema'
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

const collectFieldLabels = (templates = []) => {
  const labels = new Map()
  ;(Array.isArray(templates) ? templates : []).forEach((template) => {
    ;(Array.isArray(template?.fields) ? template.fields : []).forEach((field) => {
      const id = normalizeText(field?.id, 80)
      const label = normalizeText(field?.label || field?.title, 120)
      if (id && label && !labels.has(id)) labels.set(id, label)
    })
  })
  return labels
}

const formatProfileFacts = (values = [], templates = [], options = {}) => {
  const labels = collectFieldLabels(templates)
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
    const line = `${labels.get(fieldId) || fieldId}: ${renderedValue}`
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
  const profileFacts = formatProfileFacts(
    profile.profileValues,
    source.profileTemplates,
    source,
  )
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
      profileValues: profileFacts.omittedCount,
      manual: continuity.omittedCounts.manual,
      eventAttached: continuity.omittedCounts.eventAttached,
    }),
  })
}
