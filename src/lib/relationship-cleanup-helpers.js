export const RELATIONSHIP_CLEANUP_MODES = Object.freeze({
  DELETE_ROLE: 'delete_role',
  RESET_RELATIONSHIP: 'reset_relationship',
  DELETE_MEMORY_GROUP: 'delete_memory_group',
})

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return fallback
  return normalized.slice(0, max)
}

const escapeRegExp = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const normalizeRelationshipCleanupMode = (value) => {
  const normalized = normalizeText(value, '', 60)
  return Object.values(RELATIONSHIP_CLEANUP_MODES).includes(normalized)
    ? normalized
    : RELATIONSHIP_CLEANUP_MODES.DELETE_ROLE
}

export const createEmptyRelationshipBinding = () => ({
  profileId: 0,
  contactId: 0,
  kind: '',
  name: '',
  sourceModule: '',
  sourceId: '',
})

export const normalizeRelationshipBinding = (raw = {}) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const profileId = Math.max(0, toInt(source.profileId ?? source.roleProfileId, 0))
  const contactId = Math.max(0, toInt(source.contactId ?? source.chatId ?? source.id, 0))
  const name = normalizeText(source.name || source.displayName, '', 120)
  const kind = normalizeText(source.kind, profileId > 0 ? 'role' : 'contact', 40)
  const sourceModule = normalizeText(source.sourceModule, '', 60)
  const sourceId = normalizeText(source.sourceId, '', 140)
  if (profileId <= 0 && contactId <= 0 && !name && !sourceModule && !sourceId) {
    return createEmptyRelationshipBinding()
  }
  return {
    profileId,
    contactId,
    kind,
    name,
    sourceModule,
    sourceId,
  }
}

export const hasRelationshipBinding = (binding = {}) => {
  const normalized = normalizeRelationshipBinding(binding)
  return Boolean(
    normalized.profileId > 0 ||
    normalized.contactId > 0 ||
    normalized.name ||
    normalized.sourceModule ||
    normalized.sourceId,
  )
}

export const clearRelationshipBinding = () => createEmptyRelationshipBinding()

export const bindingMatchesProfile = (binding = {}, profile = {}) => {
  const normalized = normalizeRelationshipBinding(binding)
  const profileId = Math.max(0, toInt(profile?.id ?? profile?.profileId, 0))
  const profileName = normalizeText(profile?.name, '', 120)
  if (profileId > 0 && normalized.profileId === profileId) return true
  return Boolean(profileName && normalized.name === profileName)
}

export const replaceRelationshipNameInText = (text = '', profileName = '', replacement = '') => {
  const sourceText = typeof text === 'string' ? text : ''
  const targetName = normalizeText(profileName, '', 120)
  if (!sourceText || !targetName) return sourceText
  const fallback = typeof replacement === 'string' ? replacement : ''
  return sourceText.split(targetName).join(fallback).replace(/\s{2,}/g, ' ').trim()
}

export const anonymizeRelationshipText = (text = '', profileName = '', replacement = '') => {
  const replaced = replaceRelationshipNameInText(text, profileName, replacement)
  if (replaced) return replaced
  return typeof text === 'string' ? text : ''
}

export const anonymizeRelationshipTextByBinding = (
  text = '',
  binding = {},
  replacement = '',
) => {
  let next = typeof text === 'string' ? text : ''
  if (!next) return next
  const normalizedBinding = normalizeRelationshipBinding(binding)
  const nextReplacement = normalizeText(replacement, '', 120)
  const candidateNames = [
    normalizeText(normalizedBinding.name, '', 120),
    normalizeText(normalizedBinding.sourceId, '', 120),
  ].filter(Boolean)

  candidateNames.forEach((name) => {
    const replaced = replaceRelationshipNameInText(next, name, nextReplacement)
    if (replaced && replaced !== next) {
      next = replaced
    }
  })

  const numericProfileId = Math.max(0, toInt(normalizedBinding.profileId, 0))
  if (numericProfileId > 0) {
    const roleIdPattern = new RegExp(`\\brole[_-]?${numericProfileId}\\b`, 'gi')
    next = next.replace(roleIdPattern, nextReplacement || 'role')
  }

  return next.replace(/\s{2,}/g, ' ').trim()
}
