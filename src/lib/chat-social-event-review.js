import { CHAT_CONTACT_SOCIAL_STATES } from '../stores/chat'
import { CONTACTS_ENTITY_TYPES } from './role-profile-schema'
import {
  RELATIONSHIP_EVENT_GATE_DECISION,
  buildRelationshipFactGate,
} from './relationship-event-gating'

export const CHAT_SOCIAL_EVENT_TYPES = Object.freeze({
  ROLE_GREETING_REQUEST: 'role_greeting_request',
  ROLE_REFUSE_MESSAGES: 'role_refuse_messages',
  ROLE_RESTORE_MESSAGES: 'role_restore_messages',
  ROLE_BLOCK_USER: 'role_block_user',
  ROLE_UNBLOCK_USER: 'role_unblock_user',
  USER_ACCEPT_REQUEST: 'user_accept_request',
  USER_DECLINE_REQUEST: 'user_decline_request',
  USER_BLOCK_ROLE: 'user_block_role',
  USER_UNBLOCK_ROLE: 'user_unblock_role',
})

export const CHAT_SOCIAL_EVENT_STATUS = Object.freeze({
  READY_TO_APPLY: 'ready_to_apply',
  APPLIED: 'applied',
  PENDING_REVIEW: 'pending_review',
  DISMISSED: 'dismissed',
  BLOCKED: 'blocked',
  FAILED: 'failed',
})

export const CHAT_SOCIAL_EVENT_REVIEW_MODE = Object.freeze({
  AUTO_APPLY_WITH_AUDIT: 'auto_apply_with_audit',
  PENDING_REVIEW: 'pending_review',
  BLOCK: 'block',
  AUDIT_ONLY: 'audit_only',
})

export const CHAT_SOCIAL_EVENT_RISK = Object.freeze({
  LOW: 'low',
  HIGH: 'high',
})

const SOCIAL_EVENT_IDS = Object.freeze({
  [CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST]: 'chat.social.role_greeting_request.v1',
  [CHAT_SOCIAL_EVENT_TYPES.ROLE_REFUSE_MESSAGES]: 'chat.social.role_refuse_messages.v1',
  [CHAT_SOCIAL_EVENT_TYPES.ROLE_RESTORE_MESSAGES]: 'chat.social.role_restore_messages.v1',
  [CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER]: 'chat.social.role_block_user.v1',
  [CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER]: 'chat.social.role_unblock_user.v1',
  [CHAT_SOCIAL_EVENT_TYPES.USER_ACCEPT_REQUEST]: 'chat.social.user_accept_request.v1',
  [CHAT_SOCIAL_EVENT_TYPES.USER_DECLINE_REQUEST]: 'chat.social.user_decline_request.v1',
  [CHAT_SOCIAL_EVENT_TYPES.USER_BLOCK_ROLE]: 'chat.social.user_block_role.v1',
  [CHAT_SOCIAL_EVENT_TYPES.USER_UNBLOCK_ROLE]: 'chat.social.user_unblock_role.v1',
})

const VALID_EVENT_TYPES = new Set(Object.values(CHAT_SOCIAL_EVENT_TYPES))
const VALID_CHAT_SOCIAL_STATES = new Set(Object.values(CHAT_CONTACT_SOCIAL_STATES))
const GENERATED_EVENT_TYPES = new Set([
  CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
  CHAT_SOCIAL_EVENT_TYPES.ROLE_REFUSE_MESSAGES,
  CHAT_SOCIAL_EVENT_TYPES.ROLE_RESTORE_MESSAGES,
  CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER,
  CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER,
])
const USER_ACTION_EVENT_TYPES = new Set([
  CHAT_SOCIAL_EVENT_TYPES.USER_ACCEPT_REQUEST,
  CHAT_SOCIAL_EVENT_TYPES.USER_DECLINE_REQUEST,
  CHAT_SOCIAL_EVENT_TYPES.USER_BLOCK_ROLE,
  CHAT_SOCIAL_EVENT_TYPES.USER_UNBLOCK_ROLE,
])
const GREETING_REQUEST_STATES = new Set([
  CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
  CHAT_CONTACT_SOCIAL_STATES.STRANGER,
  CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED,
])
const ROLE_BLOCK_STATES = new Set([
  CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
  CHAT_CONTACT_SOCIAL_STATES.STRANGER,
  CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
  CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST,
  CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED,
])
const REQUEST_ACTION_STATES = new Set([
  CHAT_CONTACT_SOCIAL_STATES.STRANGER,
  CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST,
  CHAT_CONTACT_SOCIAL_STATES.OUTGOING_REQUEST,
  CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED,
])

const normalizeText = (value, fallback = '', max = 220) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const normalizeTimestamp = (value, fallback = Date.now()) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(num)
}

const toPositiveInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback
}

const normalizeEventType = (value = '') => {
  const normalized = normalizeText(value, '', 120)
  return VALID_EVENT_TYPES.has(normalized) ? normalized : ''
}

const normalizeChatSocialState = (
  value,
  fallback = CHAT_CONTACT_SOCIAL_STATES.CONNECTED,
) => {
  const normalized = normalizeText(value, '', 80)
  return VALID_CHAT_SOCIAL_STATES.has(normalized) ? normalized : fallback
}

const isGeneratedEventType = (eventType = '') => GENERATED_EVENT_TYPES.has(eventType)
const isUserActionEventType = (eventType = '') => USER_ACTION_EVENT_TYPES.has(eventType)

const riskForEventType = (eventType = '') =>
  eventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST
    ? CHAT_SOCIAL_EVENT_RISK.LOW
    : CHAT_SOCIAL_EVENT_RISK.HIGH

const normalizeGateRisk = (value = '') =>
  normalizeText(value, CHAT_SOCIAL_EVENT_RISK.LOW, 20) === CHAT_SOCIAL_EVENT_RISK.HIGH
    ? CHAT_SOCIAL_EVENT_RISK.HIGH
    : CHAT_SOCIAL_EVENT_RISK.LOW

const createPolicySnapshot = (policy = {}) => ({
  surpriseMode: normalizeText(policy.surpriseMode, 'low', 40).toLowerCase(),
  userAllowsGeneratedSocialEvents: policy.userAllowsGeneratedSocialEvents !== false,
  moduleEventsEnabled: policy.moduleEventsEnabled !== false,
  cooldownActive: policy.cooldownActive === true,
  dailyLimitReached: policy.dailyLimitReached === true,
})

const createSourceSnapshot = ({ contactId = 0, source = {}, policy = {} } = {}) => ({
  moduleKey: normalizeText(source.moduleKey || policy.moduleKey, 'chat', 80),
  conversationId: toPositiveInt(source.conversationId ?? contactId),
  messageId: normalizeText(source.messageId || policy.messageId, '', 160),
  runtimeLogId: normalizeText(source.runtimeLogId || policy.runtimeLogId, '', 160),
})

const generatedPolicyBlockReason = (policy = {}) => {
  const snapshot = createPolicySnapshot(policy)
  if (!snapshot.userAllowsGeneratedSocialEvents) return 'generated_social_events_disabled'
  if (!snapshot.moduleEventsEnabled) return 'module_events_disabled'
  if (['off', 'disabled', 'none'].includes(snapshot.surpriseMode)) return 'surprise_mode_off'
  if (snapshot.cooldownActive) return 'cooldown_active'
  if (snapshot.dailyLimitReached) return 'daily_limit_reached'
  return ''
}

export const chatSocialEventIdForType = (eventType = '') =>
  SOCIAL_EVENT_IDS[normalizeEventType(eventType)] || 'chat.social.unknown.v1'

export const resolveRequestedChatSocialState = (eventType = '', currentState = '') => {
  const normalizedEventType = normalizeEventType(eventType)
  const state = normalizeChatSocialState(currentState)

  if (normalizedEventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST) {
    return GREETING_REQUEST_STATES.has(state) ? CHAT_CONTACT_SOCIAL_STATES.INCOMING_REQUEST : ''
  }

  if (
    normalizedEventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_REFUSE_MESSAGES ||
    normalizedEventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER
  ) {
    if (state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED) {
      return CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
    }
    return ROLE_BLOCK_STATES.has(state) ? CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED : ''
  }

  if (
    normalizedEventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_RESTORE_MESSAGES ||
    normalizedEventType === CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER
  ) {
    if (state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED) {
      return CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED
    }
    return state === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED
      ? CHAT_CONTACT_SOCIAL_STATES.CONNECTED
      : ''
  }

  if (normalizedEventType === CHAT_SOCIAL_EVENT_TYPES.USER_ACCEPT_REQUEST) {
    return REQUEST_ACTION_STATES.has(state) ? CHAT_CONTACT_SOCIAL_STATES.CONNECTED : ''
  }

  if (normalizedEventType === CHAT_SOCIAL_EVENT_TYPES.USER_DECLINE_REQUEST) {
    return REQUEST_ACTION_STATES.has(state) ? CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED : ''
  }

  if (normalizedEventType === CHAT_SOCIAL_EVENT_TYPES.USER_BLOCK_ROLE) {
    if (state === CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED) {
      return CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
    }
    return state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED ||
      state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED
      ? ''
      : CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED
  }

  if (normalizedEventType === CHAT_SOCIAL_EVENT_TYPES.USER_UNBLOCK_ROLE) {
    if (state === CHAT_CONTACT_SOCIAL_STATES.MUTUAL_BLOCKED) {
      return CHAT_CONTACT_SOCIAL_STATES.CONTACT_BLOCKED
    }
    return state === CHAT_CONTACT_SOCIAL_STATES.USER_BLOCKED
      ? CHAT_CONTACT_SOCIAL_STATES.CONNECTED
      : ''
  }

  return ''
}

const createBlockedProposal = ({
  eventType = '',
  contactId = 0,
  profileId = 0,
  targetName = '',
  triggerSource = 'ai_assisted',
  reason = 'blocked',
  explanation = '',
  currentChatSocialState = '',
  at = Date.now(),
  relationshipGate = null,
  policy = {},
  source = {},
} = {}) => ({
  id: '',
  eventType,
  eventId: chatSocialEventIdForType(eventType),
  targetContactId: toPositiveInt(contactId),
  targetProfileId: toPositiveInt(profileId),
  targetName: normalizeText(targetName, '', 120),
  currentChatSocialState: currentChatSocialState || '',
  requestedChatSocialState: '',
  triggerSource: normalizeText(triggerSource, 'ai_assisted', 40),
  risk: riskForEventType(eventType),
  reviewMode: CHAT_SOCIAL_EVENT_REVIEW_MODE.BLOCK,
  status: CHAT_SOCIAL_EVENT_STATUS.BLOCKED,
  reason,
  explanation: explanation || reason,
  relationshipGate,
  policySnapshot: createPolicySnapshot(policy),
  source: createSourceSnapshot({ contactId, source, policy }),
  createdAt: normalizeTimestamp(at),
  reviewedAt: 0,
  appliedAt: 0,
})

export const evaluateChatSocialEventReview = ({
  chatStore,
  contactId,
  eventType,
  triggerSource = 'ai_assisted',
  policy = {},
  registry = null,
  source = {},
  at = Date.now(),
  explanation = '',
} = {}) => {
  const normalizedEventType = normalizeEventType(eventType)
  const normalizedContactId = toPositiveInt(contactId)
  const contact =
    normalizedContactId > 0 && typeof chatStore?.getContactById === 'function'
      ? chatStore.getContactById(normalizedContactId)
      : null
  const currentState =
    contact && typeof chatStore?.getContactChatSocialState === 'function'
      ? chatStore.getContactChatSocialState(contact)
      : ''
  const profile =
    contact?.profileId && typeof chatStore?.getRoleProfileById === 'function'
      ? chatStore.getRoleProfileById(contact.profileId)
      : null
  const targetName = normalizeText(profile?.name || contact?.name, '', 120)

  if (!normalizedEventType) {
    return createBlockedProposal({
      eventType: '',
      contactId: normalizedContactId,
      triggerSource,
      reason: 'unsupported_social_event_type',
      at,
      policy,
      source,
    })
  }

  if (!contact) {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: normalizedContactId,
      triggerSource,
      reason: 'target_contact_missing',
      at,
      policy,
      source,
    })
  }

  if (contact.kind !== 'role') {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: contact.id,
      profileId: contact.profileId,
      targetName,
      triggerSource,
      reason: 'target_not_role_contact',
      currentChatSocialState: currentState,
      at,
      policy,
      source,
    })
  }

  if (!profile) {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: contact.id,
      profileId: contact.profileId,
      targetName,
      triggerSource,
      reason: 'target_profile_missing',
      currentChatSocialState: currentState,
      at,
      policy,
      source,
    })
  }

  if (profile.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: contact.id,
      profileId: contact.profileId,
      targetName,
      triggerSource,
      reason: 'target_is_self_profile',
      currentChatSocialState: currentState,
      at,
      policy,
      source,
    })
  }

  if (isGeneratedEventType(normalizedEventType)) {
    const policyReason = generatedPolicyBlockReason(policy)
    if (policyReason) {
      return createBlockedProposal({
        eventType: normalizedEventType,
        contactId: contact.id,
        profileId: contact.profileId,
        targetName,
        triggerSource,
        reason: policyReason,
        currentChatSocialState: currentState,
        at,
        policy,
        source,
      })
    }
  }

  const relationshipGate = buildRelationshipFactGate({
    chatStore,
    target: contact,
    factType: normalizedEventType,
    risk: normalizeGateRisk(policy.relationshipGateRisk),
    rule: policy.relationshipGateRule && typeof policy.relationshipGateRule === 'object'
      ? policy.relationshipGateRule
      : {},
    registry,
  })

  if (relationshipGate?.decision === RELATIONSHIP_EVENT_GATE_DECISION.BLOCK) {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: contact.id,
      profileId: contact.profileId,
      targetName,
      triggerSource,
      reason: 'relationship_gate_blocked',
      currentChatSocialState: currentState,
      at,
      relationshipGate,
      policy,
      source,
    })
  }

  const requestedChatSocialState = resolveRequestedChatSocialState(normalizedEventType, currentState)
  if (!requestedChatSocialState) {
    return createBlockedProposal({
      eventType: normalizedEventType,
      contactId: contact.id,
      profileId: contact.profileId,
      targetName,
      triggerSource,
      reason: 'invalid_social_state_transition',
      currentChatSocialState: currentState,
      at,
      relationshipGate,
      policy,
      source,
    })
  }

  const risk = riskForEventType(normalizedEventType)
  const reviewMode = isUserActionEventType(normalizedEventType)
    ? CHAT_SOCIAL_EVENT_REVIEW_MODE.AUDIT_ONLY
    : risk === CHAT_SOCIAL_EVENT_RISK.LOW
      ? CHAT_SOCIAL_EVENT_REVIEW_MODE.AUTO_APPLY_WITH_AUDIT
      : CHAT_SOCIAL_EVENT_REVIEW_MODE.PENDING_REVIEW
  const status =
    reviewMode === CHAT_SOCIAL_EVENT_REVIEW_MODE.PENDING_REVIEW
      ? CHAT_SOCIAL_EVENT_STATUS.PENDING_REVIEW
      : CHAT_SOCIAL_EVENT_STATUS.READY_TO_APPLY
  const isAutoGreeting = reviewMode === CHAT_SOCIAL_EVENT_REVIEW_MODE.AUTO_APPLY_WITH_AUDIT
  const isPendingReview = reviewMode === CHAT_SOCIAL_EVENT_REVIEW_MODE.PENDING_REVIEW

  return {
    id: '',
    eventType: normalizedEventType,
    eventId: chatSocialEventIdForType(normalizedEventType),
    targetContactId: Number(contact.id),
    targetProfileId: toPositiveInt(contact.profileId),
    targetName,
    currentChatSocialState: currentState,
    requestedChatSocialState,
    triggerSource: normalizeText(triggerSource, 'ai_assisted', 40),
    risk,
    reviewMode,
    status,
    reason: isAutoGreeting
      ? 'eligible_low_risk_greeting'
      : isPendingReview
        ? 'high_risk_social_change_requires_review'
        : 'direct_user_social_action_audit_only',
    explanation:
      explanation ||
      (isAutoGreeting
        ? 'Role initiated a low-risk greeting request.'
        : isPendingReview
          ? 'Role initiated a high-risk communication change that requires World Hub review.'
          : 'User-authored Chat social action recorded for audit.'),
    relationshipGate,
    policySnapshot: createPolicySnapshot(policy),
    source: createSourceSnapshot({ contactId: contact.id, source, policy }),
    createdAt: normalizeTimestamp(at),
    reviewedAt: 0,
    appliedAt: 0,
  }
}

export const applyChatSocialEventToChatStore = ({
  chatStore,
  proposal,
  at = Date.now(),
} = {}) => {
  if (!proposal?.targetContactId || !proposal.requestedChatSocialState) return false
  if (
    proposal.status === CHAT_SOCIAL_EVENT_STATUS.BLOCKED ||
    proposal.status === CHAT_SOCIAL_EVENT_STATUS.DISMISSED ||
    proposal.status === CHAT_SOCIAL_EVENT_STATUS.FAILED
  ) {
    return false
  }

  return Boolean(
    chatStore?.setContactChatSocialState?.(
      proposal.targetContactId,
      proposal.requestedChatSocialState,
      {
        note: proposal.explanation || proposal.reason || '',
        at,
      },
    ),
  )
}

export const buildChatSocialEventLogInput = (proposal = {}) => {
  const status =
    proposal.status === CHAT_SOCIAL_EVENT_STATUS.APPLIED
      ? 'triggered'
      : proposal.status === CHAT_SOCIAL_EVENT_STATUS.FAILED
        ? 'failed'
        : 'skipped'

  return {
    eventId: proposal.eventId || chatSocialEventIdForType(proposal.eventType),
    moduleKey: 'chat',
    targetId: proposal.targetContactId ? String(proposal.targetContactId) : '',
    adapterKey: 'chat.apply_social_channel_state',
    triggerSource: proposal.triggerSource || 'ai_assisted',
    status,
    reason: proposal.reason || proposal.status || 'chat_social_event_reviewed',
    at: proposal.appliedAt || proposal.reviewedAt || proposal.createdAt || Date.now(),
  }
}
