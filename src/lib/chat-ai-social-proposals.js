import { CHAT_SOCIAL_EVENT_TYPES } from './chat-social-event-review'

const SUPPORTED_CHAT_AI_SOCIAL_EVENT_TYPES = new Set([
  CHAT_SOCIAL_EVENT_TYPES.ROLE_GREETING_REQUEST,
  CHAT_SOCIAL_EVENT_TYPES.ROLE_REFUSE_MESSAGES,
  CHAT_SOCIAL_EVENT_TYPES.ROLE_RESTORE_MESSAGES,
  CHAT_SOCIAL_EVENT_TYPES.ROLE_BLOCK_USER,
  CHAT_SOCIAL_EVENT_TYPES.ROLE_UNBLOCK_USER,
])

const MAX_CHAT_AI_SOCIAL_EVENTS = 5
const MAX_CHAT_AI_SOCIAL_EXPLANATION_CHARS = 220

const normalizeText = (value, fallback = '', max = 160) => {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback
  const normalized = String(value).trim().replace(/\s+/g, ' ')
  return normalized ? normalized.slice(0, max) : fallback
}

const rawSocialEventsForPayload = (payload = {}) => {
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.socialEvents)) return payload.socialEvents
  if (Array.isArray(payload.social_events)) return payload.social_events
  if (Array.isArray(payload.chatSocialEvents)) return payload.chatSocialEvents
  return []
}

export const normalizeChatAiSocialEvents = (payload = {}) =>
  rawSocialEventsForPayload(payload)
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const eventType = normalizeText(item.eventType || item.type, '', 120)
      if (!SUPPORTED_CHAT_AI_SOCIAL_EVENT_TYPES.has(eventType)) return null
      const explanation = normalizeText(
        item.explanation || item.reason || item.summary,
        '',
        MAX_CHAT_AI_SOCIAL_EXPLANATION_CHARS,
      )
      return { eventType, explanation }
    })
    .filter(Boolean)
    .slice(0, MAX_CHAT_AI_SOCIAL_EVENTS)

export const hasChatAiSocialEvents = (payload = {}) =>
  normalizeChatAiSocialEvents(payload).length > 0
