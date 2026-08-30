import { describe, expect, test } from 'vitest'
import fixture from './fixtures/world-semantic/conformance-v1.json'
import {
  WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
  WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
  createReviewedWorldSemanticManifest,
  createWorldSemanticProposalHash,
  createWorldSemanticSourceFingerprint,
  normalizeWorldSemanticModelReceipt,
  normalizeWorldSemanticProposal,
  summarizeWorldSemanticProposalAgreement,
} from '../src/lib/simulation/world-semantic-contract'
import { compileReviewedWorldSemanticManifest } from '../src/lib/simulation/world-semantic-compiler'

const reviewAndCompile = async (proposal, runtimeRegistry = fixture.runtimeRegistry) => {
  const proposalHash = await createWorldSemanticProposalHash(proposal)
  const review = await createReviewedWorldSemanticManifest({
    proposal,
    confirmation: {
      schemaVersion: WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
      status: 'confirmed',
      confirmedBy: 'user',
      sourceFingerprint: proposal.sourceFingerprint,
      proposalHash,
      manifestRevision: 1,
    },
  })
  expect(review.ok).toBe(true)
  return compileReviewedWorldSemanticManifest({
    reviewedManifest: review.manifest,
    runtimeRegistry,
  })
}

describe('world semantic proposal and deterministic compiler', () => {
  test('creates stable source fingerprints independent of object key order', async () => {
    const first = await createWorldSemanticSourceFingerprint({
      worldId: 'world:tide_contract_city',
      sources: [{ id: 'worldbook:tide:contracts', text: 'Named covenants govern passage.' }],
    })
    const second = await createWorldSemanticSourceFingerprint({
      sources: [{ text: 'Named covenants govern passage.', id: 'worldbook:tide:contracts' }],
      worldId: 'world:tide_contract_city',
    })

    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(second).toBe(first)
  })

  test.each(fixture.worlds)('compiles $fixtureId through the same generic access capability', async ({
    fixtureId,
    proposal,
  }) => {
    const result = await reviewAndCompile(proposal)

    expect(result.ok).toBe(true)
    expect(result.manifest.namespace).toBe(proposal.namespace)
    expect(result.manifest.indexes.bridgesByRuntimeCapability).toHaveProperty(
      'runtime:access:restricted_place',
    )
    expect(result.manifest.concepts.map((item) => item.id)).toEqual(
      expect.arrayContaining(proposal.concepts.map((item) => item.id)),
    )
    expect(JSON.stringify(result.manifest)).not.toMatch(/fixtureId|modern_kpop_realism.*magic_academy/)
    expect(fixtureId).toBeTruthy()
  })

  test('produces byte-equivalent compiled output and hash for reordered equivalent input', async () => {
    const proposal = structuredClone(fixture.worlds[2].proposal)
    const reordered = structuredClone(proposal)
    reordered.concepts.reverse()
    reordered.concepts[0] = {
      evidence: reordered.concepts[0].evidence,
      meaning: reordered.concepts[0].meaning,
      aliases: reordered.concepts[0].aliases,
      confidence: reordered.concepts[0].confidence,
      kind: reordered.concepts[0].kind,
      label: reordered.concepts[0].label,
      id: reordered.concepts[0].id,
    }

    const first = await reviewAndCompile(proposal)
    const second = await reviewAndCompile(reordered)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(second.manifest).toEqual(first.manifest)
    expect(second.receipt).toEqual(first.receipt)
    expect(Object.isFrozen(first.manifest)).toBe(true)
    expect(Object.isFrozen(first.manifest.indexes)).toBe(true)
  })

  test('keeps provider receipts separate from reviewed and compiled semantic truth', async () => {
    const proposal = fixture.worlds[0].proposal
    const proposalHash = await createWorldSemanticProposalHash(proposal)
    const receipt = normalizeWorldSemanticModelReceipt({
      schemaVersion: WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
      providerId: 'openai_compatible',
      modelId: 'provider-specific-model',
      requestId: 'request-1',
      generatedAt: 1_788_000_000_000,
      sourceFingerprint: proposal.sourceFingerprint,
      proposalHash,
      providerSpecificPayload: { mustNotLeak: true },
    })
    const compiled = await reviewAndCompile(proposal)

    expect(receipt.ok).toBe(true)
    expect(receipt.receipt.modelId).toBe('provider-specific-model')
    expect(JSON.stringify(compiled.manifest)).not.toMatch(/provider|model|request-1|mustNotLeak/i)
    expect(JSON.stringify(compiled.receipt)).not.toMatch(/provider-specific-model|request-1/)
  })

  test('reports multi-model agreement or divergence without selecting a winner', async () => {
    const proposal = fixture.worlds[2].proposal
    const reordered = structuredClone(proposal)
    reordered.concepts.reverse()
    const proposalHash = await createWorldSemanticProposalHash(proposal)
    const createReceipt = (providerId, modelId, hash = proposalHash) => ({
      schemaVersion: WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
      providerId,
      modelId,
      requestId: `${providerId}-request`,
      generatedAt: 1_788_000_000_000,
      sourceFingerprint: proposal.sourceFingerprint,
      proposalHash: hash,
    })

    const unanimous = await summarizeWorldSemanticProposalAgreement([
      { proposal, receipt: createReceipt('openai_compatible', 'model-a') },
      { proposal: reordered, receipt: createReceipt('gemini', 'model-b') },
    ])
    const divergentProposal = structuredClone(proposal)
    divergentProposal.boundaries[0].statement = 'A Chant Namer may rewrite settled history.'
    const divergentHash = await createWorldSemanticProposalHash(divergentProposal)
    const divergent = await summarizeWorldSemanticProposalAgreement([
      { proposal, receipt: createReceipt('openai_compatible', 'model-a') },
      {
        proposal: divergentProposal,
        receipt: createReceipt('anthropic', 'model-c', divergentHash),
      },
    ])

    expect(unanimous.ok).toBe(true)
    expect(unanimous.agreement).toMatchObject({ status: 'unanimous', candidateCount: 2 })
    expect(unanimous.agreement.proposalGroups).toHaveLength(1)
    expect(divergent.ok).toBe(true)
    expect(divergent.agreement).toMatchObject({ status: 'divergent', candidateCount: 2 })
    expect(divergent.agreement.proposalGroups).toHaveLength(2)
    expect(divergent.agreement).not.toHaveProperty('selectedProposalHash')
  })

  test.each([
    ['invalid ids', (proposal) => { proposal.concepts[0].id = 'INVALID ID' }, 'invalid_namespaced_id'],
    ['duplicate ids', (proposal) => { proposal.concepts[1].id = proposal.concepts[0].id }, 'duplicate_id'],
    ['dangling bridges', (proposal) => { proposal.bridges[0].sourceId = `${proposal.namespace}:missing` }, 'dangling_bridge_source'],
    ['ownerless effects', (proposal) => { proposal.capabilities[0].effects[0].ownerModule = '' }, 'ownerless_effect'],
    ['unresolved conflicts', (proposal) => {
      proposal.conflicts.push({
        id: `${proposal.namespace}:conflict_access`,
        statement: 'Two sources disagree about access.',
        capabilityIds: [proposal.capabilities[0].id],
        status: 'unresolved',
      })
    }, 'unresolved_conflict'],
    ['blocking unknowns', (proposal) => {
      proposal.unknowns.push({
        id: `${proposal.namespace}:unknown_access_proof`,
        statement: 'The access proof is not defined.',
        capabilityIds: [proposal.capabilities[0].id],
      })
    }, 'blocking_unknown'],
    ['unsupported runtime meaning', (proposal) => {
      proposal.bridges[0].targetCapabilityId = 'runtime:unsupported:genre_guess'
    }, 'unsupported_runtime_capability'],
  ])('fails closed for %s', async (_label, mutate, expectedCode) => {
    const proposal = structuredClone(fixture.worlds[2].proposal)
    mutate(proposal)
    const normalized = normalizeWorldSemanticProposal(proposal)

    if (!normalized.ok) {
      expect(normalized.errors.map((error) => error.code)).toContain(expectedCode)
      return
    }

    const compiled = await reviewAndCompile(proposal)
    expect(compiled.ok).toBe(false)
    expect(compiled.errors.map((error) => error.code)).toContain(expectedCode)
  })

  test('requires an exact user confirmation bound to the proposal and source fingerprint', async () => {
    const proposal = fixture.worlds[1].proposal
    const proposalHash = await createWorldSemanticProposalHash(proposal)
    const modelConfirmation = await createReviewedWorldSemanticManifest({
      proposal,
      confirmation: {
        schemaVersion: WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
        status: 'confirmed',
        confirmedBy: 'model',
        sourceFingerprint: proposal.sourceFingerprint,
        proposalHash,
        manifestRevision: 1,
      },
    })
    const staleConfirmation = await createReviewedWorldSemanticManifest({
      proposal,
      confirmation: {
        schemaVersion: WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
        status: 'confirmed',
        confirmedBy: 'user',
        sourceFingerprint: 'd'.repeat(64),
        proposalHash,
        manifestRevision: 1,
      },
    })

    expect(modelConfirmation.ok).toBe(false)
    expect(modelConfirmation.errors.map((error) => error.code)).toContain('review_authority_required')
    expect(staleConfirmation.ok).toBe(false)
    expect(staleConfirmation.errors.map((error) => error.code)).toContain(
      'source_fingerprint_mismatch',
    )
  })
})
