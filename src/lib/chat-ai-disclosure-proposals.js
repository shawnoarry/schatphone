import { buildChatDisclosureSourceId } from './chat-disclosure-proposals'

export const CHAT_AI_DISCLOSURE_CANDIDATE_KIND = 'ai_disclosure_candidate'
export const CHAT_AI_DISCLOSURE_SOURCE_MODULE = 'relationship_chat_ai_disclosure_candidate'
export const CHAT_AI_DISCLOSURE_POLICY_MODES = Object.freeze({
  DISABLED: 'disabled',
  REVIEW: 'review',
})
export const CHAT_AI_DISCLOSURE_MAX_CANDIDATES = 3
export const CHAT_AI_DISCLOSURE_MAX_SUMMARY_CHARS = 240
export const CHAT_AI_DISCLOSURE_MAX_REASON_CHARS = 180

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const toInt = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.floor(number) : fallback
}

const normalizePolicyMode = (policy = {}) => {
  if (policy?.mode === CHAT_AI_DISCLOSURE_POLICY_MODES.REVIEW || policy?.enabled === true) {
    return CHAT_AI_DISCLOSURE_POLICY_MODES.REVIEW
  }
  return CHAT_AI_DISCLOSURE_POLICY_MODES.DISABLED
}

const rawCandidatesForPayload = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.disclosureCandidates)) return payload.disclosureCandidates
  if (Array.isArray(payload.disclosure_candidates)) return payload.disclosure_candidates
  return []
}

const normalizedUserMessageIds = (context = {}) => {
  const ids = new Set()
  if (Array.isArray(context.userMessageIds)) {
    context.userMessageIds.forEach((value) => {
      const id = normalizeText(value, '', 120)
      if (id) ids.add(id)
    })
  }

  if (Array.isArray(context.sourceMessages)) {
    context.sourceMessages.forEach((message) => {
      if (!message || typeof message !== 'object' || message.role !== 'user') return
      if (Number(message.recalledAt || 0) > 0) return
      const id = normalizeText(message.id, '', 120)
      if (id) ids.add(id)
    })
  }

  return ids
}

const resolveRoleTarget = (context = {}) => {
  const contact = context.contact && typeof context.contact === 'object' ? context.contact : {}
  const contactId = toInt(context.contactId || context.target?.contactId || contact.id, 0)
  const profileId = toInt(context.profileId || context.target?.profileId || contact.profileId, 0)
  const kind = normalizeText(context.kind || context.target?.kind || contact.kind, profileId > 0 ? 'role' : '', 40)
  if (contactId <= 0 || profileId <= 0 || kind !== 'role') return null

  return {
    contactId,
    profileId,
    kind: 'role',
    name: normalizeText(context.targetName || context.target?.name || contact.name, '', 100),
  }
}

const buildCandidateId = (sourceId) => {
  const suffix = normalizeText(sourceId, '', 220).replace(/[^a-z0-9:_-]+/gi, '_')
  return suffix ? `${CHAT_AI_DISCLOSURE_CANDIDATE_KIND}:${suffix}` : ''
}

const normalizeCandidate = (rawCandidate, { target, context, allowedUserMessageIds }) => {
  if (!rawCandidate || typeof rawCandidate !== 'object') return null

  const messageId = normalizeText(
    rawCandidate.messageId || rawCandidate.sourceMessageId || rawCandidate.message_id,
    '',
    120,
  )
  if (!messageId || !allowedUserMessageIds.has(messageId)) return null

  const summary = normalizeText(
    rawCandidate.summary || rawCandidate.memorySummary || rawCandidate.whatToRemember,
    '',
    CHAT_AI_DISCLOSURE_MAX_SUMMARY_CHARS,
  )
  if (!summary) return null

  const rationale = normalizeText(
    rawCandidate.reason || rawCandidate.rationale || rawCandidate.importance,
    '',
    CHAT_AI_DISCLOSURE_MAX_REASON_CHARS,
  )
  const conversationId = normalizeText(
    context.conversationId || context.threadId || `contact_${target.contactId}`,
    `contact_${target.contactId}`,
    120,
  )
  const sourceId = buildChatDisclosureSourceId({
    conversationId,
    contactId: target.contactId,
    profileId: target.profileId,
    messageId,
  })
  const id = buildCandidateId(sourceId)
  if (!sourceId || !id) return null

  const createdAt = toInt(context.createdAt, 0)

  return {
    id,
    kind: CHAT_AI_DISCLOSURE_CANDIDATE_KIND,
    status: 'pending_review',
    target,
    source: {
      moduleKey: 'chat',
      conversationId,
      messageId,
    },
    sourceModule: CHAT_AI_DISCLOSURE_SOURCE_MODULE,
    sourceId,
    factType: CHAT_AI_DISCLOSURE_CANDIDATE_KIND,
    summary,
    rationale,
    effectPolicy: 'review_only',
    modelRequired: true,
    ...(createdAt > 0 ? { createdAt } : {}),
  }
}

/**
 * Normalize an AI-proposed role-memory candidate without granting it write access.
 *
 * The caller must provide the trusted role target and the user-message IDs that
 * were actually present in the current Chat context. Model output can only add a
 * bounded summary/reason; it cannot choose a role, memory key, relationship
 * metric, or persistence decision.
 */
export const normalizeChatAiDisclosureCandidates = (
  payload = {},
  context = {},
  policy = {},
) => {
  if (normalizePolicyMode(policy) !== CHAT_AI_DISCLOSURE_POLICY_MODES.REVIEW) return []

  const target = resolveRoleTarget(context)
  if (!target) return []

  const allowedUserMessageIds = normalizedUserMessageIds(context)
  if (allowedUserMessageIds.size === 0) return []

  const seenMessageIds = new Set()
  return rawCandidatesForPayload(payload)
    .map((rawCandidate) => normalizeCandidate(rawCandidate, { target, context, allowedUserMessageIds }))
    .filter((candidate) => {
      if (!candidate || seenMessageIds.has(candidate.source.messageId)) return false
      seenMessageIds.add(candidate.source.messageId)
      return true
    })
    .slice(0, CHAT_AI_DISCLOSURE_MAX_CANDIDATES)
}

export const hasChatAiDisclosureCandidates = (payload = {}, context = {}, policy = {}) =>
  normalizeChatAiDisclosureCandidates(payload, context, policy).length > 0
