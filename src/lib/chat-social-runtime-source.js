import { CHAT_CONTACT_SOCIAL_STATES } from '../stores/chat'
import {
  CHAT_SOCIAL_EVENT_TYPES,
  chatSocialEventIdForType,
} from './chat-social-event-review'
import { CONTACTS_ENTITY_TYPES } from './role-profile-schema'

export const CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID =
  'chat.social.runtime_greeting_pilot.v1'
export const CHAT_SOCIAL_RUNTIME_GREETING_COOLDOWN_MS = 6 * 60 * 60 * 1000
export const CHAT_SOCIAL_RUNTIME_GREETING_DAILY_LIMIT = 1
export const CHAT_SOCIAL_RUNTIME_REASON = Object.freeze({
  NO_CANDIDATE: 'no_chat_social_candidate',
})

const RUNTIME_GREETING_STATES = new Set([
  CHAT_CONTACT_SOCIAL_STATES.STRANGER,
  CHAT_CONTACT_SOCIAL_STATES.REQUEST_DECLINED,
])

const normalizeTimestamp = (value, fallback = Date.now()) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return Math.max(0, Math.floor(fallback))
  return Math.floor(num)
}

const normalizeText = (value, fallback = '', max = 180) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const toPositiveInt = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback
}

const listChatContacts = (chatStore) => {
  if (Array.isArray(chatStore?.contactsForList)) return chatStore.contactsForList
  if (Array.isArray(chatStore?.contacts)) return chatStore.contacts
  return []
}

const readContactSocialState = (chatStore, contact) => {
  if (typeof chatStore?.getContactChatSocialState === 'function') {
    return chatStore.getContactChatSocialState(contact)
  }
  return normalizeText(contact?.chatSocialState, '', 80)
}

const isEligibleRuntimeGreetingContact = (chatStore, contact) => {
  if (!contact || contact.kind !== 'role') return false
  const contactId = toPositiveInt(contact.id)
  if (!contactId) return false

  const profileId = toPositiveInt(contact.profileId)
  if (!profileId) return false
  const profile =
    typeof chatStore?.getRoleProfileById === 'function'
      ? chatStore.getRoleProfileById(profileId)
      : null
  if (!profile || profile.entityType === CONTACTS_ENTITY_TYPES.SELF_PROFILE) return false

  return RUNTIME_GREETING_STATES.has(readContactSocialState(chatStore, contact))
}

const sortRuntimeGreetingCandidates = (a, b) => {
  const aUpdatedAt = normalizeTimestamp(a.chatSocialUpdatedAt, 0)
  const bUpdatedAt = normalizeTimestamp(b.chatSocialUpdatedAt, 0)
  if (aUpdatedAt !== bUpdatedAt) return aUpdatedAt - bUpdatedAt
  return toPositiveInt(a.id) - toPositiveInt(b.id)
}

export const listChatSocialRuntimeGreetingCandidates = ({ chatStore } = {}) =>
  listChatContacts(chatStore)
    .filter((contact) => isEligibleRuntimeGreetingContact(chatStore, contact))
    .sort(sortRuntimeGreetingCandidates)

export const buildChatSocialRuntimeGreetingProposal = ({
  chatStore,
  at = Date.now(),
} = {}) => {
  const candidates = listChatSocialRuntimeGreetingCandidates({ chatStore })
  const contact = candidates[0]
  if (!contact) return null

  const contactId = toPositiveInt(contact.id)
  const targetName = normalizeText(contact.name, 'this role', 80)
  return {
    pilotId: CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
    eventId: chatSocialEventIdForType(CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST),
    targetId: String(contactId),
    contactId,
    eventType: CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
    cooldownMs: CHAT_SOCIAL_RUNTIME_GREETING_COOLDOWN_MS,
    dailyLimit: CHAT_SOCIAL_RUNTIME_GREETING_DAILY_LIMIT,
    createdAt: normalizeTimestamp(at),
    explanation: `${targetName} can naturally open contact from the event runtime.`,
    source: {
      moduleKey: 'chat',
      conversationId: contactId,
      runtimeLogId: CHAT_SOCIAL_RUNTIME_GREETING_PILOT_ID,
    },
  }
}
