import { callAI as defaultCallAI } from '../ai'
import { createAiContextEnvelope } from '../ai-context-envelope'
import { extractAssistantPayloadText, parseAssistantJsonPayload } from '../chat-response'
import {
  WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
  WORLD_SEMANTIC_PROPOSAL_SCHEMA_VERSION,
  createWorldSemanticProposalHash,
  normalizeWorldSemanticModelReceipt,
  normalizeWorldSemanticProposal,
} from './world-semantic-contract'
import { WORLD_SEMANTIC_RUNTIME_REGISTRY } from './world-semantic-runtime-registry'

export const WORLD_SEMANTIC_PREVIEW_SCHEMA_VERSION = 1

const PREVIEW_LIMITS = Object.freeze({
  worldviewCharacters: 6_000,
  knowledgeEntries: 8,
  knowledgeCharacters: 520,
  profileTemplates: 8,
  profileFields: 12,
  concepts: 12,
  capabilities: 12,
  listItems: 8,
  summaryCharacters: 720,
  itemCharacters: 360,
  evidenceCharacters: 180,
})

const CONCEPT_KINDS = new Set([
  'role',
  'institution',
  'place',
  'resource',
  'rule',
  'system',
  'custom',
])
const CONFIDENCE_VALUES = new Set(['high', 'medium', 'low', 'unknown'])

const normalizeText = (value, max = 240) => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
}

const normalizeList = (value, maxItems = PREVIEW_LIMITS.listItems, maxCharacters = PREVIEW_LIMITS.itemCharacters) =>
  Array.isArray(value)
    ? value.map((item) => normalizeText(item, maxCharacters)).filter(Boolean).slice(0, maxItems)
    : []

const parsePayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null
  const direct = response.preview || response.worldUnderstanding || response
  if (direct && (direct.summary || direct.concepts || direct.capabilities)) return direct
  const text = extractAssistantPayloadText(response)
  return text ? parseAssistantJsonPayload(text) : null
}

const parseVersionReviewPayload = (response) => {
  if (typeof response === 'string') return parseAssistantJsonPayload(response)
  if (!response || typeof response !== 'object') return null
  const direct = response.versionReview || response.worldVersionReview || response
  if (direct?.preview && direct?.proposal) return direct
  const text = extractAssistantPayloadText(response)
  return text ? parseAssistantJsonPayload(text) : null
}

const normalizeConfidence = (value) => {
  const normalized = normalizeText(value, 20).toLowerCase()
  return CONFIDENCE_VALUES.has(normalized) ? normalized : 'unknown'
}

const normalizeConcept = (item = {}, index = 0) => {
  const label = normalizeText(item.label || item.term, 100)
  const meaning = normalizeText(item.meaning || item.description, PREVIEW_LIMITS.itemCharacters)
  if (!label || !meaning) return null
  const kind = normalizeText(item.kind, 40).toLowerCase()
  return {
    id: normalizeText(item.id, 100) || `concept_${index + 1}`,
    label,
    kind: CONCEPT_KINDS.has(kind) ? kind : 'custom',
    meaning,
    evidence: normalizeText(item.evidence, PREVIEW_LIMITS.evidenceCharacters),
    confidence: normalizeConfidence(item.confidence),
  }
}

const normalizeCapability = (item = {}, index = 0) => {
  const label = normalizeText(item.label || item.name, 100)
  const description = normalizeText(
    item.description || item.meaning,
    PREVIEW_LIMITS.itemCharacters,
  )
  if (!label || !description) return null
  return {
    id: normalizeText(item.id, 100) || `capability_${index + 1}`,
    label,
    description,
    evidence: normalizeText(item.evidence, PREVIEW_LIMITS.evidenceCharacters),
    confidence: normalizeConfidence(item.confidence),
  }
}

export const normalizeWorldSemanticPreview = (payload = {}) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const concepts = (Array.isArray(payload.concepts) ? payload.concepts : [])
    .map(normalizeConcept)
    .filter(Boolean)
    .slice(0, PREVIEW_LIMITS.concepts)
  const capabilities = (Array.isArray(payload.capabilities) ? payload.capabilities : [])
    .map(normalizeCapability)
    .filter(Boolean)
    .slice(0, PREVIEW_LIMITS.capabilities)
  const summary = normalizeText(payload.summary, PREVIEW_LIMITS.summaryCharacters)
  const boundaries = normalizeList(payload.boundaries)
  const unknowns = normalizeList(payload.unknowns)
  const conflicts = normalizeList(payload.conflicts)

  if (!summary && concepts.length === 0 && capabilities.length === 0) return null
  return Object.freeze({
    schemaVersion: WORLD_SEMANTIC_PREVIEW_SCHEMA_VERSION,
    summary,
    concepts: Object.freeze(concepts.map(Object.freeze)),
    capabilities: Object.freeze(capabilities.map(Object.freeze)),
    boundaries: Object.freeze(boundaries),
    unknowns: Object.freeze(unknowns),
    conflicts: Object.freeze(conflicts),
  })
}

export const buildWorldSemanticPreviewInput = ({
  worldOverview = {},
  worldContext = {},
  locale = 'zh-CN',
} = {}) => {
  const activeSources = Array.isArray(worldOverview?.narrative?.activeSources)
    ? worldOverview.narrative.activeSources
    : []
  const knowledgeEntries = Array.isArray(worldOverview?.encyclopedia?.selectedEntries)
    ? worldOverview.encyclopedia.selectedEntries
    : []
  const profileTemplates = Array.isArray(worldOverview?.profiles?.enabledTemplates)
    ? worldOverview.profiles.enabledTemplates
    : []
  const enabledPacks = Array.isArray(worldOverview?.capabilities?.enabledPacks)
    ? worldOverview.capabilities.enabledPacks
    : []

  return Object.freeze({
    schemaVersion: WORLD_SEMANTIC_PREVIEW_SCHEMA_VERSION,
    locale: normalizeText(locale, 20) || 'zh-CN',
    world: Object.freeze({
      worldId: normalizeText(worldOverview?.identity?.worldId, 120),
      title: normalizeText(worldOverview?.identity?.title, 120),
      contextId: normalizeText(worldContext?.id, 180),
      coarseTraits: Object.freeze([
        ...(Array.isArray(worldContext?.genreTags) ? worldContext.genreTags : []),
        ...(Array.isArray(worldContext?.toneTags) ? worldContext.toneTags : []),
      ].map((item) => normalizeText(item, 60)).filter(Boolean).slice(0, 16)),
    }),
    narrative: normalizeText(
      worldOverview?.narrative?.promptText,
      PREVIEW_LIMITS.worldviewCharacters,
    ),
    sources: Object.freeze(activeSources.slice(0, 16).map((source) => Object.freeze({
      id: normalizeText(source?.id || source?.linkId || source?.assetId, 160),
      title: normalizeText(source?.title, 140),
      missing: source?.missing === true,
      changed: source?.changed === true,
    }))),
    knowledge: Object.freeze(knowledgeEntries.slice(0, PREVIEW_LIMITS.knowledgeEntries).map((entry) => Object.freeze({
      id: normalizeText(entry?.id, 120),
      title: normalizeText(entry?.title, 140),
      content: normalizeText(entry?.content, PREVIEW_LIMITS.knowledgeCharacters),
      tags: Object.freeze(
        (Array.isArray(entry?.tags) ? entry.tags : [])
          .map((tag) => normalizeText(tag, 60))
          .filter(Boolean)
          .slice(0, 12),
      ),
    }))),
    profileTemplates: Object.freeze(profileTemplates.slice(0, PREVIEW_LIMITS.profileTemplates).map((template) => Object.freeze({
      id: normalizeText(template?.id, 120),
      title: normalizeText(template?.title || template?.name, 140),
      fields: Object.freeze(
        (Array.isArray(template?.fields) ? template.fields : [])
          .map((field) => normalizeText(field?.label || field?.id, 100))
          .filter(Boolean)
          .slice(0, PREVIEW_LIMITS.profileFields),
      ),
    }))),
    enabledCapabilityPacks: Object.freeze(enabledPacks.slice(0, 12).map((pack) => Object.freeze({
      id: normalizeText(pack?.id, 120),
      title: normalizeText(pack?.title || pack?.name, 140),
    }))),
  })
}

export const buildWorldSemanticVersionInput = ({
  worldOverview = {},
  worldContext = {},
  sourceSnapshot = {},
  locale = 'zh-CN',
} = {}) => {
  const activeSources = Array.isArray(worldOverview?.narrative?.activeSources)
    ? worldOverview.narrative.activeSources
    : []
  const knowledgeEntries = Array.isArray(worldOverview?.encyclopedia?.selectedEntries)
    ? worldOverview.encyclopedia.selectedEntries
    : []
  const profileTemplates = Array.isArray(worldOverview?.profiles?.enabledTemplates)
    ? worldOverview.profiles.enabledTemplates
    : []
  const enabledPacks = Array.isArray(worldOverview?.capabilities?.enabledPacks)
    ? worldOverview.capabilities.enabledPacks
    : []
  return Object.freeze({
    schemaVersion: WORLD_SEMANTIC_PROPOSAL_SCHEMA_VERSION,
    locale: normalizeText(locale, 20) || 'zh-CN',
    world: Object.freeze({
      worldId: normalizeText(worldOverview?.identity?.worldId, 180),
      title: normalizeText(worldOverview?.identity?.title, 120),
      contextId: normalizeText(worldContext?.id, 180),
      sourceFingerprint: normalizeText(sourceSnapshot?.sourceFingerprint, 64),
    }),
    narrative: typeof worldOverview?.narrative?.promptText === 'string'
      ? worldOverview.narrative.promptText
      : '',
    sources: Object.freeze(activeSources.map((source) => Object.freeze({
      id: normalizeText(source?.id || source?.linkId || source?.assetId, 180),
      assetId: normalizeText(source?.assetId, 180),
      title: normalizeText(source?.title, 160),
      role: normalizeText(source?.role || source?.usage, 80),
      missing: source?.missing === true,
      changed: source?.changed === true,
      text: typeof source?.promptText === 'string' ? source.promptText : '',
    }))),
    knowledge: Object.freeze(knowledgeEntries.map((entry) => Object.freeze({
      id: normalizeText(entry?.id, 180),
      title: normalizeText(entry?.title, 160),
      content: typeof entry?.content === 'string' ? entry.content : '',
      tags: Object.freeze(
        (Array.isArray(entry?.tags) ? entry.tags : [])
          .map((tag) => normalizeText(tag, 80))
          .filter(Boolean),
      ),
    }))),
    profileTemplates: Object.freeze(profileTemplates.map((template) => Object.freeze({
      id: normalizeText(template?.id, 180),
      title: normalizeText(template?.title || template?.name, 160),
      version: Math.max(0, Math.floor(Number(template?.version) || 0)),
      categories: Array.isArray(template?.categories) ? template.categories : [],
      fields: Array.isArray(template?.fields) ? template.fields : [],
    }))),
    enabledCapabilityPacks: Object.freeze(enabledPacks.map((pack) => Object.freeze({
      id: normalizeText(pack?.id, 180),
      title: normalizeText(pack?.title || pack?.name, 160),
      terminology: pack?.terminology && typeof pack.terminology === 'object'
        ? pack.terminology
        : {},
      economy: pack?.economy && typeof pack.economy === 'object' ? pack.economy : {},
    }))),
    supportedRuntime: WORLD_SEMANTIC_RUNTIME_REGISTRY,
  })
}

export const buildLocalWorldUnderstanding = ({ worldOverview = {}, worldContext = {} } = {}) => {
  const activeSources = Array.isArray(worldOverview?.narrative?.activeSources)
    ? worldOverview.narrative.activeSources
    : []
  const selectedEntries = Array.isArray(worldOverview?.encyclopedia?.selectedEntries)
    ? worldOverview.encyclopedia.selectedEntries
    : []
  const profileTemplates = Array.isArray(worldOverview?.profiles?.enabledTemplates)
    ? worldOverview.profiles.enabledTemplates
    : []
  const enabledPacks = Array.isArray(worldOverview?.capabilities?.enabledPacks)
    ? worldOverview.capabilities.enabledPacks
    : []
  const appBindings = Array.isArray(worldOverview?.capabilities?.appBindings)
    ? worldOverview.capabilities.appBindings
    : []
  const narrative = normalizeText(worldOverview?.narrative?.promptText, 12_000)
  const missingCount = activeSources.filter((source) => source?.missing === true).length
  const changedCount = activeSources.filter((source) => source?.changed === true).length
  const issues = []
  if (!narrative) issues.push('world_text_missing')
  if (missingCount > 0) issues.push('world_sources_missing')
  if (changedCount > 0) issues.push('world_sources_changed')
  if (selectedEntries.length === 0) issues.push('knowledge_empty')
  if (profileTemplates.length === 0) issues.push('profile_templates_empty')
  issues.push('semantic_manifest_not_compiled')

  return Object.freeze({
    status: !narrative ? 'empty' : missingCount > 0 || changedCount > 0 ? 'attention' : 'limited',
    worldId: normalizeText(worldOverview?.identity?.worldId, 120),
    worldTitle: normalizeText(worldOverview?.identity?.title, 120),
    worldContextId: normalizeText(worldContext?.id, 180),
    traits: Object.freeze({
      genre: Object.freeze(
        (Array.isArray(worldContext?.genreTags) ? worldContext.genreTags : [])
          .map((item) => normalizeText(item, 60))
          .filter(Boolean),
      ),
      tone: Object.freeze(
        (Array.isArray(worldContext?.toneTags) ? worldContext.toneTags : [])
          .map((item) => normalizeText(item, 60))
          .filter(Boolean),
      ),
      technology: normalizeText(worldContext?.techLevel, 60),
      danger: normalizeText(worldContext?.dangerLevel, 60),
      socialOrder: normalizeText(worldContext?.socialOrder, 60),
      economy: normalizeText(worldContext?.economyMode, 60),
      magic: normalizeText(worldContext?.magicLevel, 60),
    }),
    counts: Object.freeze({
      activeSources: activeSources.filter((source) => source?.missing !== true).length,
      missingSources: missingCount,
      changedSources: changedCount,
      knowledgeEntries: selectedEntries.length,
      profileTemplates: profileTemplates.length,
      capabilityPacks: enabledPacks.length,
      appBindings: appBindings.length,
    }),
    sourceTitles: Object.freeze(
      activeSources
        .filter((source) => source?.missing !== true)
        .map((source) => normalizeText(source?.title || source?.assetId, 140))
        .filter(Boolean)
        .slice(0, 12),
    ),
    issues: Object.freeze(issues),
  })
}

const buildPreviewPrompt = (input) => [
  'Interpret one SchatPhone user-authored world for a temporary review-only preview.',
  'Return JSON only with this exact top-level shape:',
  '{"summary":"","concepts":[{"id":"","label":"","kind":"role|institution|place|resource|rule|system|custom","meaning":"","evidence":"","confidence":"high|medium|low|unknown"}],"capabilities":[{"id":"","label":"","description":"","evidence":"","confidence":"high|medium|low|unknown"}],"boundaries":[],"unknowns":[],"conflicts":[]}',
  'Explain custom terms in the supplied world instead of forcing them into modern, K-pop, fantasy, or sci-fi genre labels.',
  'Evidence must be a short phrase grounded in supplied text. Use unknown when the source does not establish an answer.',
  'Do not create facts, events, people, organizations, permissions, app records, routes, numeric state, or product decisions.',
  'Do not claim that this preview has been applied. It is advisory and temporary.',
  `Input JSON:\n${JSON.stringify(input)}`,
].join('\n')

const buildVersionReviewPrompt = (input) => [
  'Interpret one SchatPhone user-authored world into a review preview and a provider-neutral semantic proposal.',
  'Return JSON only with exactly two top-level keys: preview and proposal.',
  'preview must use this shape:',
  '{"summary":"","concepts":[{"id":"","label":"","kind":"role|institution|place|resource|rule|system|custom","meaning":"","evidence":"","confidence":"high|medium|low|unknown"}],"capabilities":[{"id":"","label":"","description":"","evidence":"","confidence":"high|medium|low|unknown"}],"boundaries":[],"unknowns":[],"conflicts":[]}',
  'proposal must use this shape:',
  '{"schemaVersion":1,"worldId":"","namespace":"","sourceFingerprint":"","concepts":[{"id":"namespace:item","label":"","kind":"actor|institution|place|resource|rule|system|custom","aliases":[],"meaning":"","confidence":"high|medium|low|unknown","evidence":[{"sourceId":"","excerpt":""}]}],"capabilities":[{"id":"namespace:item","label":"","description":"","actorConceptIds":[],"objectConceptIds":[],"effects":[{"id":"namespace:item","ownerModule":"","actionId":"","description":""}],"confidence":"high|medium|low|unknown","evidence":[{"sourceId":"","excerpt":""}]}],"boundaries":[{"id":"namespace:item","kind":"invariant|prohibition|requirement","statement":"","capabilityIds":[],"evidence":[{"sourceId":"","excerpt":""}]}],"bridges":[{"id":"namespace:item","sourceType":"concept|capability","sourceId":"namespace:item","targetCapabilityId":"runtime:...","evidence":[{"sourceId":"","excerpt":""}]}],"unknowns":[{"id":"namespace:item","statement":"","capabilityIds":[]}],"conflicts":[{"id":"namespace:item","statement":"","capabilityIds":[],"status":"unresolved|resolved"}]}',
  'Copy worldId and sourceFingerprint exactly from input.world. Use one lowercase underscore namespace that describes this world without assuming a genre.',
  'Every proposal ID must be namespaced. Evidence sourceId must reference an input source or knowledge ID and excerpts must be grounded in supplied content.',
  'Use only the runtime capability, owner module, and action IDs listed in input.supportedRuntime. If no supported runtime meaning fits, keep that interaction in preview only and do not invent a bridge or effect.',
  'Preserve unresolved uncertainty in unknowns or conflicts. Do not resolve disagreements by guessing.',
  'Do not force the world into modern, K-pop, fantasy, sci-fi, or any other built-in genre. Built-in material is only optional evidence.',
  'Do not claim the proposal is active and do not create events, people, organizations, records, routes, permissions, or numeric game state.',
  `Input JSON:\n${JSON.stringify(input)}`,
].join('\n')

export const requestWorldSemanticPreview = async ({
  input,
  settings = {},
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const promptContext = createAiContextEnvelope({
    stableBlocks: [[
      'You are a provider-neutral SchatPhone world interpreter.',
      'Your output is a review-only semantic proposal. It never changes runtime truth.',
      'Return valid JSON only and preserve uncertainty.',
    ].join(' ')],
    cacheNamespace: 'world-semantic-preview',
    cacheIdentity: `schema-${WORLD_SEMANTIC_PREVIEW_SCHEMA_VERSION}`,
  })
  const response = await callAi({
    messages: [{ role: 'user', content: buildPreviewPrompt(input) }],
    systemPrompt: promptContext.systemPrompt,
    contextEnvelope: promptContext,
    settings,
    signal,
    withMeta: true,
  })
  const preview = normalizeWorldSemanticPreview(parsePayload(response) || {})
  if (!preview) {
    const error = new Error('World semantic preview response did not match the review schema.')
    error.code = 'WORLD_SEMANTIC_PREVIEW_INVALID'
    throw error
  }
  const meta = response?.meta || response?.provenance || {}
  return Object.freeze({
    preview,
    provenance: Object.freeze({
      providerId: normalizeText(meta.provider || meta.providerId || settings?.api?.resolvedKind, 160),
      modelId: normalizeText(meta.model || meta.modelId || settings?.api?.model, 160),
      requestId: normalizeText(meta.requestId, 180),
      generatedAt: Math.max(0, Math.floor(Number(meta.generatedAt) || Date.now())),
    }),
  })
}

export const requestWorldSemanticVersionReview = async ({
  input,
  settings = {},
  callAi = defaultCallAI,
  signal,
} = {}) => {
  const promptContext = createAiContextEnvelope({
    stableBlocks: [[
      'You are a provider-neutral SchatPhone world interpreter.',
      'The user may review your proposal, but only SchatPhone code can validate or activate it.',
      'Return valid JSON only, preserve uncertainty, and use only the supplied runtime registry.',
    ].join(' ')],
    cacheNamespace: 'world-semantic-version-review',
    cacheIdentity: `schema-${WORLD_SEMANTIC_PROPOSAL_SCHEMA_VERSION}`,
  })
  const response = await callAi({
    messages: [{ role: 'user', content: buildVersionReviewPrompt(input) }],
    systemPrompt: promptContext.systemPrompt,
    contextEnvelope: promptContext,
    settings,
    signal,
    withMeta: true,
  })
  const payload = parseVersionReviewPayload(response) || {}
  const preview = normalizeWorldSemanticPreview(payload.preview || {})
  const proposalValidation = normalizeWorldSemanticProposal(payload.proposal || {})
  if (!preview || !proposalValidation.ok) {
    const error = new Error('World semantic version review did not match the required schema.')
    error.code = 'WORLD_SEMANTIC_VERSION_REVIEW_INVALID'
    error.validationErrors = proposalValidation.errors
    throw error
  }
  if (
    proposalValidation.proposal.worldId !== input?.world?.worldId ||
    proposalValidation.proposal.sourceFingerprint !== input?.world?.sourceFingerprint
  ) {
    const error = new Error('World semantic version review no longer matches the checked world source.')
    error.code = 'WORLD_SEMANTIC_VERSION_REVIEW_STALE'
    throw error
  }
  const proposalHash = await createWorldSemanticProposalHash(proposalValidation.proposal)
  const meta = response?.meta || response?.provenance || {}
  const receiptValidation = normalizeWorldSemanticModelReceipt({
    schemaVersion: WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
    providerId: meta.provider || meta.providerId || settings?.api?.resolvedKind,
    modelId: meta.model || meta.modelId || settings?.api?.model,
    requestId: meta.requestId,
    generatedAt: Math.max(0, Math.floor(Number(meta.generatedAt) || Date.now())),
    sourceFingerprint: proposalValidation.proposal.sourceFingerprint,
    proposalHash,
  })
  if (!receiptValidation.ok) {
    const error = new Error('World semantic version review provenance was incomplete.')
    error.code = 'WORLD_SEMANTIC_VERSION_RECEIPT_INVALID'
    error.validationErrors = receiptValidation.errors
    throw error
  }
  return Object.freeze({
    preview,
    proposal: proposalValidation.proposal,
    modelReceipt: receiptValidation.receipt,
    provenance: Object.freeze({
      providerId: receiptValidation.receipt.providerId,
      modelId: receiptValidation.receipt.modelId,
      requestId: receiptValidation.receipt.requestId,
      generatedAt: receiptValidation.receipt.generatedAt,
    }),
  })
}
