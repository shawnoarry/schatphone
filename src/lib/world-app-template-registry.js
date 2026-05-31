import { callAI as defaultCallAI } from './ai'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from './chat-response'
import { normalizeWorldAppBinding } from './world-pack-schema'

export const WORLD_APP_TEMPLATE_CONFIDENCE = Object.freeze({
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
})

export const WORLD_APP_TEMPLATE_REVIEW_STATUS = Object.freeze({
  CONFIRMABLE: 'confirmable',
  REJECTED: 'rejected',
})

export const WORLD_APP_TEMPLATE_REGISTRY = Object.freeze([
  {
    id: 'black_market',
    label: 'Black market',
    archetype: 'marketplace',
    moduleKey: 'shopping',
    route: '/shopping',
    defaultTitle: 'Black Market',
    description: 'A world-specific marketplace shell. Shopping still owns catalog, cart, checkout, and orders.',
    unsupportedReason: 'needs_dedicated_app',
    keywords: ['black market', 'contraband', 'illegal trade', 'underground shop'],
  },
  {
    id: 'clinic_dispatch',
    label: 'Clinic dispatch',
    archetype: 'dispatch',
    moduleKey: 'food_delivery',
    route: '/food-delivery',
    defaultTitle: 'Clinic Dispatch',
    description: 'A dispatch-style support entry. The target app still owns requests, orders, and delivery records.',
    keywords: ['clinic', 'medical aid', 'rescue', 'triage', 'field medic'],
  },
  {
    id: 'bounty_board',
    label: 'Bounty board',
    archetype: 'publication_feed',
    moduleKey: 'chat',
    route: '/chat-contacts',
    defaultTitle: 'Bounty Board',
    description: 'A reviewed publication/feed entry for prompts and notices. Chat Directory owns the contact surface.',
    keywords: ['bounty', 'quest board', 'wanted', 'commission'],
  },
  {
    id: 'guild_board',
    label: 'Guild board',
    archetype: 'publication_feed',
    moduleKey: 'chat',
    route: '/chat-contacts',
    defaultTitle: 'Guild Board',
    description: 'A guild-like feed entry for reviewed announcements. Chat Directory owns channel binding.',
    keywords: ['guild', 'adventurer', 'commission board', 'quest'],
  },
  {
    id: 'fan_club',
    label: 'Fan club',
    archetype: 'publication_feed',
    moduleKey: 'chat',
    route: '/chat-contacts',
    defaultTitle: 'Fan Club',
    description: 'A fandom feed entry. Chat Directory owns service/contact binding and Chat owns messages.',
    keywords: ['fan club', 'idol', 'fandom', 'official feed'],
  },
  {
    id: 'transit_pass',
    label: 'Transit pass',
    archetype: 'transit',
    moduleKey: 'map',
    route: '/map',
    defaultTitle: 'Transit Pass',
    description: 'A world-specific travel entry. Map still owns route, trip, location, and ETA truth.',
    keywords: ['transit', 'metro', 'pass', 'safe route', 'route permit'],
  },
  {
    id: 'dispatch_board',
    label: 'Dispatch board',
    archetype: 'dispatch',
    moduleKey: 'food_delivery',
    route: '/food-delivery',
    defaultTitle: 'Dispatch Board',
    description: 'A logistics/dispatch entry. Source modules still own order and delivery records.',
    keywords: ['dispatch', 'logistics', 'rescue dispatch', 'courier board'],
  },
  {
    id: 'reservation_board',
    label: 'Reservation board',
    archetype: 'reservation',
    moduleKey: 'calendar',
    route: '/calendar',
    defaultTitle: 'Reservation Board',
    description: 'A schedule/reservation entry. Calendar still owns confirmed events and push scheduling.',
    keywords: ['reservation', 'schedule board', 'appointment', 'event calendar'],
  },
])

const TEMPLATE_BY_ID = new Map(WORLD_APP_TEMPLATE_REGISTRY.map((template) => [template.id, template]))

const normalizeText = (value, fallback = '', maxLength = 500) => {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return fallback
  return text.slice(0, maxLength)
}

const normalizeId = (value, fallback = '') => {
  const text = normalizeText(value, fallback, 160).toLowerCase()
  const normalized = text.replace(/[^a-z0-9_:-]+/g, '_').replace(/^_+|_+$/g, '')
  return normalized || fallback
}

const normalizeConfidence = (value) => {
  const normalized = normalizeText(value, WORLD_APP_TEMPLATE_CONFIDENCE.LOW, 40).toLowerCase()
  if (normalized === WORLD_APP_TEMPLATE_CONFIDENCE.HIGH) return normalized
  if (normalized === WORLD_APP_TEMPLATE_CONFIDENCE.MEDIUM) return normalized
  return WORLD_APP_TEMPLATE_CONFIDENCE.LOW
}

const collectProposalItems = (payload = {}) => {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.proposals)) return payload.proposals
  if (Array.isArray(payload.worldApps)) return payload.worldApps
  if (Array.isArray(payload.appBindings)) return payload.appBindings
  if (Array.isArray(payload.messages)) return payload.messages
  return []
}

const parseTemplatePayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null

  const text = extractAssistantPayloadText(response)
  const parsedText = text ? parseAssistantJsonPayload(text) : null
  if (parsedText) return parsedText

  return Array.isArray(response) ? { proposals: response } : response
}

export const listWorldAppTemplateRegistry = () =>
  WORLD_APP_TEMPLATE_REGISTRY.map((template) => ({
    ...template,
    keywords: [...template.keywords],
  }))

export const getWorldAppTemplateById = (templateId = '') =>
  TEMPLATE_BY_ID.get(normalizeId(templateId, '')) || null

export const buildWorldAppTemplateExtractionPrompt = ({ worldContextText = '' } = {}) => {
  const templateLines = WORLD_APP_TEMPLATE_REGISTRY.map((template) => {
    const supportStatus = template.unsupportedReason
      ? `unsupported:${template.unsupportedReason}`
      : 'supported'
    return `${template.id}: ${template.label} -> ${template.archetype}/${template.moduleKey}; ${supportStatus}; signals: ${template.keywords.join(', ')}`
  }).join('\n')

  return [
    'Review the active SchatPhone world context and propose world-specific app entries only from the whitelist.',
    'Return JSON only: {"proposals":[{"templateId":"","title":"","description":"","confidence":"high|medium|low","evidence":""}]}',
    'Never invent routes, stores, app modules, event rules, currencies, or arbitrary templates.',
    'Use low confidence when the world context does not clearly support a template.',
    'Whitelist:',
    templateLines,
    'World context:',
    normalizeText(worldContextText, '(empty)', 6000),
  ].join('\n')
}

export const normalizeWorldAppTemplateProposal = (
  raw = {},
  { worldPackId = '', existingBindingIds = [] } = {},
) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const template = getWorldAppTemplateById(
    source.templateId || source.template || source.id || source.archetypeId || '',
  )
  const confidence = normalizeConfidence(source.confidence || source.classificationConfidence)
  const existingIds = new Set((Array.isArray(existingBindingIds) ? existingBindingIds : []).map((id) => normalizeId(id, '')))

  if (!template) {
    return {
      templateId: normalizeId(source.templateId || source.template || source.id, ''),
      confidence,
      title: normalizeText(source.title || source.name, 'Unknown template', 120),
      description: normalizeText(source.description, '', 300),
      evidence: normalizeText(source.evidence || source.reason, '', 500),
      reviewStatus: WORLD_APP_TEMPLATE_REVIEW_STATUS.REJECTED,
      rejectionReason: 'unknown_template',
      template: null,
    }
  }

  const title = normalizeText(source.title || source.name, template.defaultTitle, 120)
  const bindingId = normalizeId(
    source.bindingId || source.worldAppBindingId || `${worldPackId || 'world'}_${template.id}`,
    `${worldPackId || 'world'}_${template.id}`,
  )
  const lowConfidence = confidence === WORLD_APP_TEMPLATE_CONFIDENCE.LOW
  const duplicate = existingIds.has(bindingId)
  const unsupportedReason = normalizeText(template.unsupportedReason, '', 120)

  return {
    templateId: template.id,
    bindingId,
    confidence,
    title,
    description: normalizeText(source.description, template.description, 300),
    evidence: normalizeText(source.evidence || source.reason || source.explanation, '', 500),
    reviewStatus:
      unsupportedReason || lowConfidence || duplicate
        ? WORLD_APP_TEMPLATE_REVIEW_STATUS.REJECTED
        : WORLD_APP_TEMPLATE_REVIEW_STATUS.CONFIRMABLE,
    rejectionReason: unsupportedReason || (lowConfidence ? 'low_confidence' : duplicate ? 'duplicate_binding' : ''),
    template: {
      ...template,
      keywords: [...template.keywords],
    },
  }
}

export const buildWorldAppTemplateExtractionReview = ({
  payload = {},
  proposals,
  worldPackId = '',
  existingBindings = [],
} = {}) => {
  const existingBindingIds = (Array.isArray(existingBindings) ? existingBindings : [])
    .map((binding) => binding?.id || binding)
    .filter(Boolean)
  const sourceItems = Array.isArray(proposals) ? proposals : collectProposalItems(payload)
  const normalizedProposals = sourceItems.map((proposal) =>
    normalizeWorldAppTemplateProposal(proposal, { worldPackId, existingBindingIds }),
  )

  return {
    worldPackId: normalizeId(worldPackId, ''),
    proposals: normalizedProposals,
    confirmableProposals: normalizedProposals.filter(
      (proposal) => proposal.reviewStatus === WORLD_APP_TEMPLATE_REVIEW_STATUS.CONFIRMABLE,
    ),
    rejectedProposals: normalizedProposals.filter(
      (proposal) => proposal.reviewStatus === WORLD_APP_TEMPLATE_REVIEW_STATUS.REJECTED,
    ),
    templateCount: WORLD_APP_TEMPLATE_REGISTRY.length,
  }
}

export const buildWorldAppBindingFromTemplateProposal = (proposal = {}) => {
  const normalized = normalizeWorldAppTemplateProposal(proposal, {
    worldPackId: proposal.worldPackId || '',
  })
  if (normalized.reviewStatus !== WORLD_APP_TEMPLATE_REVIEW_STATUS.CONFIRMABLE || !normalized.template) {
    return null
  }
  return normalizeWorldAppBinding({
    id: normalized.bindingId,
    archetype: normalized.template.archetype,
    title: normalized.title,
    moduleKey: normalized.template.moduleKey,
    route: normalized.template.route,
    description: normalized.description || normalized.template.description,
    enabled: true,
  })
}

export const extractWorldAppTemplateProposals = async ({
  worldContextText = '',
  worldPack = {},
  settings = {},
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const prompt = buildWorldAppTemplateExtractionPrompt({ worldContextText })
  const response = await callAi({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt:
      'You propose SchatPhone world-app entries only from the provided whitelist. Return valid JSON only.',
    settings,
    signal,
  })
  const payload = parseTemplatePayload(response)
  if (!payload) {
    return {
      ok: false,
      reason: 'parse_failed',
      review: buildWorldAppTemplateExtractionReview({
        proposals: [],
        worldPackId: worldPack?.id || '',
        existingBindings: worldPack?.appBindings || [],
      }),
      rawPayload: null,
    }
  }

  return {
    ok: true,
    reason: 'review_ready',
    review: buildWorldAppTemplateExtractionReview({
      payload,
      worldPackId: worldPack?.id || '',
      existingBindings: worldPack?.appBindings || [],
    }),
    rawPayload: payload,
  }
}
