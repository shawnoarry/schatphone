export const CHAT_DISCLOSURE_PROPOSAL_KIND = 'user_disclosure'
export const CHAT_DISCLOSURE_MEMORY_KEY = 'chat_disclosure__user_shared'
export const CHAT_DISCLOSURE_SOURCE_MODULE = 'relationship_chat_user_disclosure'
export const CHAT_DISCLOSURE_MAX_SUMMARY_CHARS = 240

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const toInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? Math.floor(num) : fallback
}

const normalizeSummary = (value) => normalizeText(value, '', CHAT_DISCLOSURE_MAX_SUMMARY_CHARS)

const readBlockText = (block = {}) => {
  if (!block || typeof block !== 'object') return ''
  if (block.type === 'text') return normalizeSummary(block.text)
  if (block.type === 'voice_virtual') return normalizeSummary(block.transcript || block.label)
  if (block.type === 'image_virtual') return normalizeSummary(block.caption)
  return ''
}

export const summarizeChatDisclosureMessage = (message = {}) => {
  const directText = normalizeSummary(message?.content)
  if (directText) return directText

  if (!Array.isArray(message?.blocks)) return ''
  return message.blocks.map(readBlockText).filter(Boolean).join(' · ').slice(0, CHAT_DISCLOSURE_MAX_SUMMARY_CHARS)
}

export const buildChatDisclosureSourceId = ({
  conversationId = '',
  contactId = 0,
  profileId = 0,
  messageId = '',
} = {}) => {
  const conversation = normalizeText(conversationId, '', 120)
  const contact = toInt(contactId, 0)
  const profile = toInt(profileId, 0)
  const message = normalizeText(messageId, '', 120)
  if (!message || contact <= 0) return ''
  return [conversation || `contact_${contact}`, profile > 0 ? `profile_${profile}` : '', `message_${message}`]
    .filter(Boolean)
    .join(':')
}

export const buildChatDisclosureProposal = ({
  contact = null,
  contactId = 0,
  conversationId = '',
  message = null,
  summary = '',
  createdAt = 0,
} = {}) => {
  const sourceContact = contact && typeof contact === 'object' ? contact : {}
  const normalizedContactId = toInt(contactId || sourceContact.id, 0)
  const profileId = toInt(sourceContact.profileId, 0)
  const kind = normalizeText(sourceContact.kind, profileId > 0 ? 'role' : '', 40)
  const messageId = normalizeText(message?.id, '', 120)
  const normalizedSummary = normalizeSummary(summary) || summarizeChatDisclosureMessage(message)
  const sourceId = buildChatDisclosureSourceId({
    conversationId,
    contactId: normalizedContactId,
    profileId,
    messageId,
  })

  if (
    normalizedContactId <= 0 ||
    profileId <= 0 ||
    kind !== 'role' ||
    message?.role !== 'user' ||
    Number(message?.recalledAt || 0) > 0 ||
    !messageId ||
    !normalizedSummary ||
    !sourceId
  ) {
    return null
  }

  const timestamp = toInt(createdAt || message?.createdAt, 0)
  const proposalId = `chat_disclosure_${normalizedContactId}_${messageId}`

  return {
    id: proposalId,
    kind: CHAT_DISCLOSURE_PROPOSAL_KIND,
    trigger: 'explicit_user_action',
    target: {
      contactId: normalizedContactId,
      profileId,
      kind: 'role',
      name: normalizeText(sourceContact.name || sourceContact.displayName, '', 100),
    },
    source: {
      moduleKey: 'chat',
      conversationId: normalizeText(conversationId, `contact_${normalizedContactId}`, 120),
      messageId,
    },
    sourceModule: CHAT_DISCLOSURE_SOURCE_MODULE,
    sourceId,
    factType: 'user_disclosure',
    summary: normalizedSummary,
    memoryKey: CHAT_DISCLOSURE_MEMORY_KEY,
    memoryRoleHint: 'supporting',
    effectPolicy: 'supporting_only',
    modelRequired: false,
    createdAt: timestamp > 0 ? timestamp : 0,
  }
}

export const isChatDisclosureMessageEligible = (input = {}) =>
  Boolean(buildChatDisclosureProposal(input))
