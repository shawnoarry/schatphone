import { callAI as defaultCallAI } from './ai'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from './chat-response'
import { normalizeWorldServiceAccountTemplate } from './world-pack-schema'

export const WORLD_SERVICE_TEMPLATE_CONFIDENCE = Object.freeze({
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
})

export const WORLD_SERVICE_TEMPLATE_REVIEW_STATUS = Object.freeze({
  CONFIRMABLE: 'confirmable',
  REJECTED: 'rejected',
})

export const WORLD_SERVICE_TEMPLATE_CATEGORIES = Object.freeze([
  'service_notification',
  'publication',
  'subscription',
])

const CATEGORY_SET = new Set(WORLD_SERVICE_TEMPLATE_CATEGORIES)

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
  const normalized = normalizeText(value, WORLD_SERVICE_TEMPLATE_CONFIDENCE.LOW, 40).toLowerCase()
  if (normalized === WORLD_SERVICE_TEMPLATE_CONFIDENCE.HIGH) return normalized
  if (normalized === WORLD_SERVICE_TEMPLATE_CONFIDENCE.MEDIUM) return normalized
  return WORLD_SERVICE_TEMPLATE_CONFIDENCE.LOW
}

const normalizeCategory = (value) => {
  const normalized = normalizeId(value, '')
  return CATEGORY_SET.has(normalized) ? normalized : ''
}

const collectProposalItems = (payload = {}) => {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload.proposals)) return payload.proposals
  if (Array.isArray(payload.serviceAccountTemplates)) return payload.serviceAccountTemplates
  if (Array.isArray(payload.serviceTemplates)) return payload.serviceTemplates
  if (Array.isArray(payload.worldServices)) return payload.worldServices
  if (Array.isArray(payload.accounts)) return payload.accounts
  if (Array.isArray(payload.messages)) return payload.messages
  return []
}

const parseServiceTemplatePayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null

  const text = extractAssistantPayloadText(response)
  const parsedText = text ? parseAssistantJsonPayload(text) : null
  if (parsedText) return parsedText

  return Array.isArray(response) ? { proposals: response } : response
}

const appBindingLabel = (binding = {}) =>
  [
    normalizeText(binding.id, '', 120),
    normalizeText(binding.title || binding.name, '', 120),
    normalizeText(binding.archetype, '', 80),
    normalizeText(binding.moduleKey || binding.module, '', 80),
  ]
    .filter(Boolean)
    .join(' / ')

export const buildWorldServiceTemplateExtractionPrompt = ({
  worldContextText = '',
  worldPack = {},
} = {}) => {
  const activeAppBindings = (Array.isArray(worldPack?.appBindings) ? worldPack.appBindings : [])
    .filter((binding) => binding?.id && binding.enabled !== false)
    .map((binding) => {
      const description = normalizeText(binding.description, '', 220)
      return `- ${binding.id}: ${appBindingLabel(binding)}${description ? `; ${description}` : ''}`
    })

  const existingTemplates = (Array.isArray(worldPack?.serviceAccountTemplates)
    ? worldPack.serviceAccountTemplates
    : [])
    .map((template) => `- ${template.id}: ${template.title || template.name || template.id}`)

  return [
    'Review the active SchatPhone world context and propose Chat service/official account candidates.',
    'Return JSON only: {"proposals":[{"id":"","title":"","category":"service_notification|publication|subscription","description":"","linkedAppBindingId":"","confidence":"high|medium|low","evidence":""}]}',
    'Do not create subscriptions, source-module records, app modules, event rules, currencies, stores, routes, or business data.',
    'Use linkedAppBindingId only when it exactly matches an allowed active world app binding id; otherwise leave it empty.',
    'Use low confidence when the world context does not clearly support the account.',
    `Allowed categories: ${WORLD_SERVICE_TEMPLATE_CATEGORIES.join(', ')}`,
    activeAppBindings.length
      ? ['Allowed linked world app bindings:', ...activeAppBindings].join('\n')
      : 'Allowed linked world app bindings: none',
    existingTemplates.length
      ? ['Existing service templates to avoid duplicates:', ...existingTemplates].join('\n')
      : 'Existing service templates to avoid duplicates: none',
    'World context:',
    normalizeText(worldContextText, '(empty)', 6000),
  ].join('\n')
}

export const normalizeWorldServiceTemplateProposal = (
  raw = {},
  { worldPackId = '', existingTemplates = [], appBindings = [], index = 0 } = {},
) => {
  const source = raw && typeof raw === 'object' ? raw : {}
  const id = normalizeId(
    source.id || source.templateId || source.worldServiceTemplateId || source.title || source.name,
    `${worldPackId || 'world'}_service_${index + 1}`,
  )
  const confidence = normalizeConfidence(source.confidence || source.classificationConfidence)
  const category = normalizeCategory(source.category || source.kind || source.type)
  const existingIds = new Set((Array.isArray(existingTemplates) ? existingTemplates : [])
    .map((template) => normalizeId(template?.id || template, ''))
    .filter(Boolean))
  const activeBindingIds = new Set((Array.isArray(appBindings) ? appBindings : [])
    .filter((binding) => binding?.id && binding.enabled !== false)
    .map((binding) => normalizeId(binding.id, '')))
  const linkedAppBindingId = normalizeId(
    source.linkedAppBindingId || source.appBindingId || source.worldAppBindingId,
    '',
  )

  const duplicate = existingIds.has(id)
  const unknownBinding = Boolean(linkedAppBindingId) && !activeBindingIds.has(linkedAppBindingId)
  const invalidCategory = !category
  const lowConfidence = confidence === WORLD_SERVICE_TEMPLATE_CONFIDENCE.LOW
  const title = normalizeText(source.title || source.name, 'World service', 120)
  const rejectionReason = invalidCategory
    ? 'unknown_category'
    : unknownBinding
      ? 'unknown_app_binding'
      : duplicate
        ? 'duplicate_template'
        : lowConfidence
          ? 'low_confidence'
          : ''

  return {
    id,
    templateId: id,
    title,
    name: normalizeText(source.name, title, 120),
    category: category || 'service_notification',
    description: normalizeText(source.description || source.summary, '', 300),
    linkedAppBindingId,
    confidence,
    evidence: normalizeText(source.evidence || source.reason || source.explanation, '', 500),
    reviewStatus: rejectionReason
      ? WORLD_SERVICE_TEMPLATE_REVIEW_STATUS.REJECTED
      : WORLD_SERVICE_TEMPLATE_REVIEW_STATUS.CONFIRMABLE,
    rejectionReason,
  }
}

export const buildWorldServiceTemplateProposalReview = ({
  payload = {},
  proposals,
  worldPack = {},
  worldPackId = worldPack?.id || '',
} = {}) => {
  const sourceItems = Array.isArray(proposals) ? proposals : collectProposalItems(payload)
  const existingTemplates = Array.isArray(worldPack?.serviceAccountTemplates)
    ? worldPack.serviceAccountTemplates
    : []
  const appBindings = Array.isArray(worldPack?.appBindings) ? worldPack.appBindings : []
  const normalizedProposals = sourceItems.map((proposal, index) =>
    normalizeWorldServiceTemplateProposal(proposal, {
      worldPackId,
      existingTemplates,
      appBindings,
      index,
    }),
  )

  return {
    worldPackId: normalizeId(worldPackId, ''),
    proposals: normalizedProposals,
    confirmableProposals: normalizedProposals.filter(
      (proposal) => proposal.reviewStatus === WORLD_SERVICE_TEMPLATE_REVIEW_STATUS.CONFIRMABLE,
    ),
    rejectedProposals: normalizedProposals.filter(
      (proposal) => proposal.reviewStatus === WORLD_SERVICE_TEMPLATE_REVIEW_STATUS.REJECTED,
    ),
    allowedCategories: [...WORLD_SERVICE_TEMPLATE_CATEGORIES],
  }
}

export const buildWorldServiceAccountTemplateFromProposal = (proposal = {}) => {
  const normalized = normalizeWorldServiceTemplateProposal(proposal, {
    worldPackId: proposal.worldPackId || '',
    existingTemplates: [],
    appBindings: proposal.linkedAppBindingId ? [{ id: proposal.linkedAppBindingId }] : [],
  })
  if (normalized.reviewStatus !== WORLD_SERVICE_TEMPLATE_REVIEW_STATUS.CONFIRMABLE) return null

  return normalizeWorldServiceAccountTemplate({
    id: normalized.id,
    title: normalized.title,
    name: normalized.name || normalized.title,
    category: normalized.category,
    description: normalized.description,
    linkedAppBindingId: normalized.linkedAppBindingId,
    pushPolicy: 'reviewed',
    enabled: true,
    source: 'ai_confirmed',
    proposalConfidence: normalized.confidence,
    proposalEvidence: normalized.evidence,
    confirmedAt: Date.now(),
  })
}

export const extractWorldServiceTemplateProposals = async ({
  worldContextText = '',
  worldPack = {},
  settings = {},
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const prompt = buildWorldServiceTemplateExtractionPrompt({ worldContextText, worldPack })
  const response = await callAi({
    messages: [{ role: 'user', content: prompt }],
    systemPrompt:
      'You propose SchatPhone Chat service account candidates for review. Return valid JSON only.',
    settings,
    signal,
  })
  const payload = parseServiceTemplatePayload(response)
  if (!payload) {
    return {
      ok: false,
      reason: 'parse_failed',
      review: buildWorldServiceTemplateProposalReview({
        proposals: [],
        worldPack,
        worldPackId: worldPack?.id || '',
      }),
      rawPayload: null,
    }
  }

  return {
    ok: true,
    reason: 'review_ready',
    review: buildWorldServiceTemplateProposalReview({
      payload,
      worldPack,
      worldPackId: worldPack?.id || '',
    }),
    rawPayload: payload,
  }
}
