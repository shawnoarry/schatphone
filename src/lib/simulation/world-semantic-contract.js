import { sha256Canonical } from '../persistence-repository-schema'

export const WORLD_SEMANTIC_PROPOSAL_SCHEMA_VERSION = 1
export const WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION = 1
export const WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION = 1

const STABLE_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}$/
const NAMESPACED_ID_PATTERN = /^[a-z][a-z0-9_]*(?::[a-z][a-z0-9_]*)+$/
const NAMESPACE_PATTERN = /^[a-z][a-z0-9_]{1,63}$/
const SIMPLE_ID_PATTERN = /^[a-z][a-z0-9_]{1,79}$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/

const CONCEPT_KINDS = new Set([
  'actor',
  'institution',
  'place',
  'resource',
  'rule',
  'system',
  'custom',
])
const CONFIDENCE_VALUES = new Set(['high', 'medium', 'low', 'unknown'])
const BOUNDARY_KINDS = new Set(['prohibition', 'permission', 'invariant', 'requirement'])
const BRIDGE_SOURCE_TYPES = new Set(['concept', 'capability'])
const CONFLICT_STATUSES = new Set(['unresolved', 'resolved'])

const isPlainObject = (value) =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const deepFreeze = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

const normalizeText = (value, max = 360) => {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, max)
}

const normalizePositiveInteger = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback
}

const compareStableText = (left, right) => {
  const leftText = String(left)
  const rightText = String(right)
  if (leftText === rightText) return 0
  return leftText < rightText ? -1 : 1
}

const stableSort = (items, selector = (item) => item.id) =>
  [...items].sort((left, right) => compareStableText(selector(left), selector(right)))

const pushError = (errors, code, path, details = {}) => {
  errors.push({ code, path, ...details })
}

const normalizeStableRef = (value, errors, path) => {
  const normalized = normalizeText(value, 180)
  if (!STABLE_REF_PATTERN.test(normalized)) {
    pushError(errors, 'invalid_stable_ref', path)
    return ''
  }
  return normalized
}

const normalizeNamespacedId = (value, errors, path, namespace = '') => {
  const normalized = normalizeText(value, 180)
  if (!NAMESPACED_ID_PATTERN.test(normalized)) {
    pushError(errors, 'invalid_namespaced_id', path)
    return ''
  }
  if (namespace && !normalized.startsWith(`${namespace}:`)) {
    pushError(errors, 'namespace_mismatch', path, { id: normalized, namespace })
    return ''
  }
  return normalized
}

const normalizeIdList = (value, errors, path, { namespace = '', limit = 48 } = {}) => {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    pushError(errors, 'invalid_id_list', path)
    return []
  }
  const seen = new Set()
  const output = []
  value.slice(0, limit + 1).forEach((item, index) => {
    const id = normalizeNamespacedId(item, errors, `${path}.${index}`, namespace)
    if (!id) return
    if (seen.has(id)) {
      pushError(errors, 'duplicate_reference_id', `${path}.${index}`, { id })
      return
    }
    seen.add(id)
    output.push(id)
  })
  if (value.length > limit) pushError(errors, 'collection_limit_exceeded', path, { limit })
  return output.sort()
}

const normalizeTextList = (value, errors, path, { limit = 24, max = 160 } = {}) => {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    pushError(errors, 'invalid_text_list', path)
    return []
  }
  const seen = new Set()
  const output = []
  value.slice(0, limit + 1).forEach((item) => {
    const text = normalizeText(item, max)
    const identity = text.toLowerCase()
    if (!text || seen.has(identity)) return
    seen.add(identity)
    output.push(text)
  })
  if (value.length > limit) pushError(errors, 'collection_limit_exceeded', path, { limit })
  return output.sort(compareStableText)
}

const normalizeEvidence = (value, errors, path) => {
  if (value === undefined) return []
  if (!Array.isArray(value)) {
    pushError(errors, 'invalid_evidence_list', path)
    return []
  }
  const evidence = value.slice(0, 12).map((rawEvidence, index) => {
    const source = isPlainObject(rawEvidence) ? rawEvidence : {}
    const sourceId = normalizeStableRef(source.sourceId, errors, `${path}.${index}.sourceId`)
    const excerpt = normalizeText(source.excerpt, 240)
    if (!excerpt) pushError(errors, 'missing_evidence_excerpt', `${path}.${index}.excerpt`)
    return {
      sourceId,
      excerpt,
      sourceFingerprint: source.sourceFingerprint
        ? normalizeText(source.sourceFingerprint, 64).toLowerCase()
        : '',
    }
  })
  evidence.forEach((item, index) => {
    if (item.sourceFingerprint && !SHA256_PATTERN.test(item.sourceFingerprint)) {
      pushError(errors, 'invalid_source_fingerprint', `${path}.${index}.sourceFingerprint`)
    }
  })
  if (value.length > 12) pushError(errors, 'collection_limit_exceeded', path, { limit: 12 })
  return stableSort(evidence, (item) => `${item.sourceId}\u0000${item.excerpt}`)
}

const normalizeCollection = ({ value, errors, path, limit, normalizeItem }) => {
  if (!Array.isArray(value)) {
    pushError(errors, 'invalid_collection', path)
    return []
  }
  if (value.length > limit) pushError(errors, 'collection_limit_exceeded', path, { limit })
  const seen = new Set()
  const items = value.slice(0, limit).map((item, index) => normalizeItem(item, index)).filter(Boolean)
  items.forEach((item, index) => {
    if (!item.id) return
    if (seen.has(item.id)) pushError(errors, 'duplicate_id', `${path}.${index}.id`, { id: item.id })
    seen.add(item.id)
  })
  return stableSort(items)
}

const normalizeConcepts = (value, errors, namespace) =>
  normalizeCollection({
    value,
    errors,
    path: 'concepts',
    limit: 96,
    normalizeItem: (rawConcept, index) => {
      const source = isPlainObject(rawConcept) ? rawConcept : {}
      const id = normalizeNamespacedId(source.id, errors, `concepts.${index}.id`, namespace)
      const label = normalizeText(source.label, 120)
      const meaning = normalizeText(source.meaning, 600)
      const kind = normalizeText(source.kind, 40).toLowerCase()
      const confidence = normalizeText(source.confidence, 20).toLowerCase()
      if (!label) pushError(errors, 'missing_label', `concepts.${index}.label`)
      if (!meaning) pushError(errors, 'missing_meaning', `concepts.${index}.meaning`)
      if (!CONCEPT_KINDS.has(kind)) pushError(errors, 'invalid_concept_kind', `concepts.${index}.kind`)
      if (!CONFIDENCE_VALUES.has(confidence)) {
        pushError(errors, 'invalid_confidence', `concepts.${index}.confidence`)
      }
      return {
        id,
        label,
        kind,
        aliases: normalizeTextList(source.aliases, errors, `concepts.${index}.aliases`),
        meaning,
        confidence,
        evidence: normalizeEvidence(source.evidence, errors, `concepts.${index}.evidence`),
      }
    },
  })

const normalizeEffects = (value, errors, path, namespace) => {
  if (value === undefined) return []
  return normalizeCollection({
    value,
    errors,
    path,
    limit: 24,
    normalizeItem: (rawEffect, index) => {
      const source = isPlainObject(rawEffect) ? rawEffect : {}
      const ownerModule = normalizeText(source.ownerModule, 80).toLowerCase()
      if (!SIMPLE_ID_PATTERN.test(ownerModule)) {
        pushError(errors, 'ownerless_effect', `${path}.${index}.ownerModule`)
      }
      return {
        id: normalizeNamespacedId(source.id, errors, `${path}.${index}.id`, namespace),
        ownerModule,
        actionId: normalizeNamespacedId(source.actionId, errors, `${path}.${index}.actionId`),
        description: normalizeText(source.description, 360),
      }
    },
  })
}

const normalizeCapabilities = (value, errors, namespace) =>
  normalizeCollection({
    value,
    errors,
    path: 'capabilities',
    limit: 96,
    normalizeItem: (rawCapability, index) => {
      const source = isPlainObject(rawCapability) ? rawCapability : {}
      const label = normalizeText(source.label, 120)
      const description = normalizeText(source.description, 600)
      const confidence = normalizeText(source.confidence, 20).toLowerCase()
      if (!label) pushError(errors, 'missing_label', `capabilities.${index}.label`)
      if (!description) pushError(errors, 'missing_description', `capabilities.${index}.description`)
      if (!CONFIDENCE_VALUES.has(confidence)) {
        pushError(errors, 'invalid_confidence', `capabilities.${index}.confidence`)
      }
      return {
        id: normalizeNamespacedId(source.id, errors, `capabilities.${index}.id`, namespace),
        label,
        description,
        actorConceptIds: normalizeIdList(
          source.actorConceptIds,
          errors,
          `capabilities.${index}.actorConceptIds`,
          { namespace },
        ),
        objectConceptIds: normalizeIdList(
          source.objectConceptIds,
          errors,
          `capabilities.${index}.objectConceptIds`,
          { namespace },
        ),
        effects: normalizeEffects(
          source.effects,
          errors,
          `capabilities.${index}.effects`,
          namespace,
        ),
        confidence,
        evidence: normalizeEvidence(source.evidence, errors, `capabilities.${index}.evidence`),
      }
    },
  })

const normalizeBoundaries = (value, errors, namespace) =>
  normalizeCollection({
    value,
    errors,
    path: 'boundaries',
    limit: 96,
    normalizeItem: (rawBoundary, index) => {
      const source = isPlainObject(rawBoundary) ? rawBoundary : {}
      const kind = normalizeText(source.kind, 40).toLowerCase()
      const statement = normalizeText(source.statement, 600)
      if (!BOUNDARY_KINDS.has(kind)) pushError(errors, 'invalid_boundary_kind', `boundaries.${index}.kind`)
      if (!statement) pushError(errors, 'missing_statement', `boundaries.${index}.statement`)
      return {
        id: normalizeNamespacedId(source.id, errors, `boundaries.${index}.id`, namespace),
        kind,
        statement,
        capabilityIds: normalizeIdList(
          source.capabilityIds,
          errors,
          `boundaries.${index}.capabilityIds`,
          { namespace },
        ),
        evidence: normalizeEvidence(source.evidence, errors, `boundaries.${index}.evidence`),
      }
    },
  })

const normalizeBridges = (value, errors, namespace) =>
  normalizeCollection({
    value,
    errors,
    path: 'bridges',
    limit: 96,
    normalizeItem: (rawBridge, index) => {
      const source = isPlainObject(rawBridge) ? rawBridge : {}
      const sourceType = normalizeText(source.sourceType, 30).toLowerCase()
      if (!BRIDGE_SOURCE_TYPES.has(sourceType)) {
        pushError(errors, 'invalid_bridge_source_type', `bridges.${index}.sourceType`)
      }
      return {
        id: normalizeNamespacedId(source.id, errors, `bridges.${index}.id`, namespace),
        sourceType,
        sourceId: normalizeNamespacedId(
          source.sourceId,
          errors,
          `bridges.${index}.sourceId`,
          namespace,
        ),
        targetCapabilityId: normalizeNamespacedId(
          source.targetCapabilityId,
          errors,
          `bridges.${index}.targetCapabilityId`,
        ),
        evidence: normalizeEvidence(source.evidence, errors, `bridges.${index}.evidence`),
      }
    },
  })

const normalizeOpenQuestions = (value, errors, namespace, kind) =>
  normalizeCollection({
    value,
    errors,
    path: kind,
    limit: 64,
    normalizeItem: (rawItem, index) => {
      const source = isPlainObject(rawItem) ? rawItem : {}
      const statement = normalizeText(source.statement, 600)
      if (!statement) pushError(errors, 'missing_statement', `${kind}.${index}.statement`)
      const normalized = {
        id: normalizeNamespacedId(source.id, errors, `${kind}.${index}.id`, namespace),
        statement,
        capabilityIds: normalizeIdList(
          source.capabilityIds,
          errors,
          `${kind}.${index}.capabilityIds`,
          { namespace },
        ),
      }
      if (kind === 'conflicts') {
        normalized.status = normalizeText(source.status, 20).toLowerCase()
        if (!CONFLICT_STATUSES.has(normalized.status)) {
          pushError(errors, 'invalid_conflict_status', `${kind}.${index}.status`)
        }
      }
      return normalized
    },
  })

export const normalizeWorldSemanticProposal = (rawProposal = {}) => {
  const source = isPlainObject(rawProposal) ? rawProposal : {}
  const errors = []
  if (source.schemaVersion !== WORLD_SEMANTIC_PROPOSAL_SCHEMA_VERSION) {
    pushError(errors, 'unsupported_schema_version', 'schemaVersion')
  }
  const namespace = normalizeText(source.namespace, 64).toLowerCase()
  if (!NAMESPACE_PATTERN.test(namespace)) pushError(errors, 'invalid_namespace', 'namespace')
  const sourceFingerprint = normalizeText(source.sourceFingerprint, 64).toLowerCase()
  if (!SHA256_PATTERN.test(sourceFingerprint)) {
    pushError(errors, 'invalid_source_fingerprint', 'sourceFingerprint')
  }
  const proposal = {
    schemaVersion: WORLD_SEMANTIC_PROPOSAL_SCHEMA_VERSION,
    worldId: normalizeStableRef(source.worldId, errors, 'worldId'),
    namespace,
    sourceFingerprint,
    concepts: normalizeConcepts(source.concepts, errors, namespace),
    capabilities: normalizeCapabilities(source.capabilities, errors, namespace),
    boundaries: normalizeBoundaries(source.boundaries, errors, namespace),
    bridges: normalizeBridges(source.bridges, errors, namespace),
    unknowns: normalizeOpenQuestions(source.unknowns || [], errors, namespace, 'unknowns'),
    conflicts: normalizeOpenQuestions(source.conflicts || [], errors, namespace, 'conflicts'),
  }
  const allIds = [
    ...proposal.concepts,
    ...proposal.capabilities,
    ...proposal.boundaries,
    ...proposal.bridges,
    ...proposal.unknowns,
    ...proposal.conflicts,
  ].map((item) => item.id).filter(Boolean)
  const globalSeen = new Set()
  allIds.forEach((id) => {
    if (globalSeen.has(id)) pushError(errors, 'duplicate_global_id', 'proposal', { id })
    globalSeen.add(id)
  })
  return deepFreeze({
    ok: errors.length === 0,
    proposal: deepFreeze(proposal),
    errors: deepFreeze(errors),
  })
}

export const createWorldSemanticSourceFingerprint = async (sourceSnapshot) =>
  sha256Canonical(sourceSnapshot)

export const createWorldSemanticProposalHash = async (proposal) => {
  const validation = normalizeWorldSemanticProposal(proposal)
  if (!validation.ok) return ''
  return sha256Canonical(validation.proposal)
}

export const normalizeWorldSemanticModelReceipt = (rawReceipt = {}) => {
  const source = isPlainObject(rawReceipt) ? rawReceipt : {}
  const errors = []
  if (source.schemaVersion !== WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION) {
    pushError(errors, 'unsupported_schema_version', 'schemaVersion')
  }
  const sourceFingerprint = normalizeText(source.sourceFingerprint, 64).toLowerCase()
  const proposalHash = normalizeText(source.proposalHash, 64).toLowerCase()
  if (!SHA256_PATTERN.test(sourceFingerprint)) {
    pushError(errors, 'invalid_source_fingerprint', 'sourceFingerprint')
  }
  if (!SHA256_PATTERN.test(proposalHash)) pushError(errors, 'invalid_proposal_hash', 'proposalHash')
  const receipt = {
    schemaVersion: WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
    providerId: normalizeText(source.providerId, 160),
    modelId: normalizeText(source.modelId, 160),
    requestId: normalizeText(source.requestId, 180),
    generatedAt: Math.max(0, Math.floor(Number(source.generatedAt) || 0)),
    sourceFingerprint,
    proposalHash,
  }
  if (!receipt.providerId) pushError(errors, 'missing_provider_id', 'providerId')
  if (!receipt.modelId) pushError(errors, 'missing_model_id', 'modelId')
  return deepFreeze({ ok: errors.length === 0, receipt: deepFreeze(receipt), errors: deepFreeze(errors) })
}

export const summarizeWorldSemanticProposalAgreement = async (candidates = []) => {
  const errors = []
  if (!Array.isArray(candidates) || candidates.length === 0) {
    pushError(errors, 'missing_proposal_candidates', 'candidates')
    return deepFreeze({ ok: false, agreement: null, errors: deepFreeze(errors) })
  }
  const normalizedCandidates = []
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = isPlainObject(candidates[index]) ? candidates[index] : {}
    const proposalValidation = normalizeWorldSemanticProposal(candidate.proposal)
    const proposalHash = proposalValidation.ok
      ? await sha256Canonical(proposalValidation.proposal)
      : ''
    const receiptValidation = normalizeWorldSemanticModelReceipt(candidate.receipt)
    proposalValidation.errors.forEach((error) => {
      pushError(errors, error.code, `candidates.${index}.proposal.${error.path}`, error)
    })
    receiptValidation.errors.forEach((error) => {
      pushError(errors, error.code, `candidates.${index}.receipt.${error.path}`, error)
    })
    if (receiptValidation.ok && receiptValidation.receipt.proposalHash !== proposalHash) {
      pushError(errors, 'receipt_proposal_hash_mismatch', `candidates.${index}.receipt.proposalHash`)
    }
    if (
      proposalValidation.ok &&
      receiptValidation.ok &&
      receiptValidation.receipt.sourceFingerprint !== proposalValidation.proposal.sourceFingerprint
    ) {
      pushError(
        errors,
        'receipt_source_fingerprint_mismatch',
        `candidates.${index}.receipt.sourceFingerprint`,
      )
    }
    normalizedCandidates.push({
      worldId: proposalValidation.proposal.worldId,
      sourceFingerprint: proposalValidation.proposal.sourceFingerprint,
      proposalHash,
      providerId: receiptValidation.receipt.providerId,
      modelId: receiptValidation.receipt.modelId,
    })
  }
  const worldIds = new Set(normalizedCandidates.map((candidate) => candidate.worldId).filter(Boolean))
  const sourceFingerprints = new Set(
    normalizedCandidates.map((candidate) => candidate.sourceFingerprint).filter(Boolean),
  )
  if (worldIds.size !== 1) pushError(errors, 'candidate_world_mismatch', 'candidates')
  if (sourceFingerprints.size !== 1) {
    pushError(errors, 'candidate_source_fingerprint_mismatch', 'candidates')
  }
  if (errors.length > 0) {
    return deepFreeze({ ok: false, agreement: null, errors: deepFreeze(errors) })
  }

  const groups = new Map()
  normalizedCandidates.forEach((candidate) => {
    if (!groups.has(candidate.proposalHash)) groups.set(candidate.proposalHash, [])
    groups.get(candidate.proposalHash).push(candidate)
  })
  const proposalGroups = [...groups.entries()]
    .sort(([left], [right]) => compareStableText(left, right))
    .map(([proposalHash, groupCandidates]) => ({
      proposalHash,
      candidateCount: groupCandidates.length,
      providers: stableSort(
        groupCandidates.map((candidate) => ({
          id: `${candidate.providerId}\u0000${candidate.modelId}`,
          providerId: candidate.providerId,
          modelId: candidate.modelId,
        })),
      ),
    }))
  return deepFreeze({
    ok: true,
    agreement: deepFreeze({
      worldId: normalizedCandidates[0].worldId,
      sourceFingerprint: normalizedCandidates[0].sourceFingerprint,
      candidateCount: normalizedCandidates.length,
      status: proposalGroups.length === 1 ? 'unanimous' : 'divergent',
      proposalGroups: deepFreeze(proposalGroups),
    }),
    errors: deepFreeze([]),
  })
}

export const createReviewedWorldSemanticManifest = async ({ proposal, confirmation } = {}) => {
  const proposalValidation = normalizeWorldSemanticProposal(proposal)
  const errors = [...proposalValidation.errors]
  const source = isPlainObject(confirmation) ? confirmation : {}
  if (source.schemaVersion !== WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION) {
    pushError(errors, 'unsupported_review_schema_version', 'confirmation.schemaVersion')
  }
  if (source.status !== 'confirmed') pushError(errors, 'proposal_not_confirmed', 'confirmation.status')
  if (source.confirmedBy !== 'user') {
    pushError(errors, 'review_authority_required', 'confirmation.confirmedBy')
  }
  const manifestRevision = normalizePositiveInteger(source.manifestRevision)
  if (!manifestRevision) pushError(errors, 'invalid_manifest_revision', 'confirmation.manifestRevision')
  const proposalHash = proposalValidation.ok
    ? await sha256Canonical(proposalValidation.proposal)
    : ''
  if (normalizeText(source.proposalHash, 64).toLowerCase() !== proposalHash) {
    pushError(errors, 'proposal_hash_mismatch', 'confirmation.proposalHash')
  }
  if (normalizeText(source.sourceFingerprint, 64).toLowerCase() !== proposalValidation.proposal.sourceFingerprint) {
    pushError(errors, 'source_fingerprint_mismatch', 'confirmation.sourceFingerprint')
  }
  const reviewedManifest = {
    schemaVersion: WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
    worldId: proposalValidation.proposal.worldId,
    namespace: proposalValidation.proposal.namespace,
    sourceFingerprint: proposalValidation.proposal.sourceFingerprint,
    proposalHash,
    manifestRevision,
    review: {
      status: 'confirmed',
      confirmedBy: 'user',
    },
    proposal: proposalValidation.proposal,
  }
  return deepFreeze({
    ok: errors.length === 0,
    manifest: errors.length === 0 ? deepFreeze(reviewedManifest) : null,
    errors: deepFreeze(errors),
  })
}

export const normalizeReviewedWorldSemanticManifest = (rawManifest = {}) => {
  const source = isPlainObject(rawManifest) ? rawManifest : {}
  const errors = []
  if (source.schemaVersion !== WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION) {
    pushError(errors, 'unsupported_review_schema_version', 'schemaVersion')
  }
  if (source.review?.status !== 'confirmed' || source.review?.confirmedBy !== 'user') {
    pushError(errors, 'review_authority_required', 'review')
  }
  const proposalValidation = normalizeWorldSemanticProposal(source.proposal)
  errors.push(...proposalValidation.errors)
  const manifestRevision = normalizePositiveInteger(source.manifestRevision)
  if (!manifestRevision) pushError(errors, 'invalid_manifest_revision', 'manifestRevision')
  const manifest = {
    schemaVersion: WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
    worldId: normalizeText(source.worldId, 180),
    namespace: normalizeText(source.namespace, 64),
    sourceFingerprint: normalizeText(source.sourceFingerprint, 64).toLowerCase(),
    proposalHash: normalizeText(source.proposalHash, 64).toLowerCase(),
    manifestRevision,
    review: { status: 'confirmed', confirmedBy: 'user' },
    proposal: proposalValidation.proposal,
  }
  if (manifest.worldId !== proposalValidation.proposal.worldId) {
    pushError(errors, 'world_id_mismatch', 'worldId')
  }
  if (manifest.namespace !== proposalValidation.proposal.namespace) {
    pushError(errors, 'namespace_mismatch', 'namespace')
  }
  if (manifest.sourceFingerprint !== proposalValidation.proposal.sourceFingerprint) {
    pushError(errors, 'source_fingerprint_mismatch', 'sourceFingerprint')
  }
  return deepFreeze({ ok: errors.length === 0, manifest: deepFreeze(manifest), errors: deepFreeze(errors) })
}
