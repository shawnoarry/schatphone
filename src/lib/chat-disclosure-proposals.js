export const CHAT_DISCLOSURE_PROPOSAL_KIND = 'user_disclosure'
export const CHAT_DISCLOSURE_LEGACY_MEMORY_KEY = 'chat_disclosure__user_shared'
export const CHAT_DISCLOSURE_MEMORY_KEY = CHAT_DISCLOSURE_LEGACY_MEMORY_KEY
export const CHAT_DISCLOSURE_MEMORY_NAMESPACE = 'chat_disclosure'
export const CHAT_DISCLOSURE_SOURCE_MODULE = 'relationship_chat_user_disclosure'
export const CHAT_DISCLOSURE_MAX_SUMMARY_CHARS = 240

const CHAT_DISCLOSURE_SUBJECT_RULES = Object.freeze([
  Object.freeze({
    key: 'hospital',
    patterns: Object.freeze([
      /医院|诊所|医务室|急诊|住院|病房|消毒水/u,
      /\b(?:hospital|clinic|infirmary|emergency room|hospital ward|disinfectant)\b/i,
    ]),
  }),
  Object.freeze({
    key: 'birthday',
    patterns: Object.freeze([
      /生日|出生日期|生辰/u,
      /\b(?:birthday|birth date|date of birth)\b/i,
    ]),
  }),
])

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

const normalizeSubjectSource = (value) => {
  const text = normalizeSummary(value)
  if (!text) return ''
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

const fingerprintSubjectSource = (value) => {
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index))
    hash = BigInt.asUintN(64, hash * prime)
  }
  return hash.toString(16).padStart(16, '0')
}

export const resolveChatDisclosureSubjectKey = (value) => {
  const source = normalizeSubjectSource(value)
  if (!source) return ''

  const matchedRule = CHAT_DISCLOSURE_SUBJECT_RULES.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(source)),
  )
  if (matchedRule) return matchedRule.key

  return `detail_${fingerprintSubjectSource(source)}`
}

export const buildChatDisclosureMemoryKey = (value) => {
  const subjectKey = resolveChatDisclosureSubjectKey(value)
  return subjectKey ? `${CHAT_DISCLOSURE_MEMORY_NAMESPACE}__${subjectKey}` : ''
}

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
  const subjectKey = resolveChatDisclosureSubjectKey(
    summarizeChatDisclosureMessage(message) || normalizedSummary,
  )
  const memoryKey = subjectKey ? `${CHAT_DISCLOSURE_MEMORY_NAMESPACE}__${subjectKey}` : ''
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
    !memoryKey ||
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
    subjectKey,
    memoryKey,
    memoryRoleHint: 'supporting',
    effectPolicy: 'supporting_only',
    modelRequired: false,
    createdAt: timestamp > 0 ? timestamp : 0,
  }
}

export const isChatDisclosureMessageEligible = (input = {}) =>
  Boolean(buildChatDisclosureProposal(input))
