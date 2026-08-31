import { describe, expect, test } from 'vitest'
import fixture from './fixtures/world-semantic/conformance-v1.json'
import {
  WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
  createReviewedWorldSemanticManifest,
  createWorldSemanticProposalHash,
} from '../src/lib/simulation/world-semantic-contract'
import { compileReviewedWorldSemanticManifest } from '../src/lib/simulation/world-semantic-compiler'
import {
  WORLD_SEMANTIC_ACCESS_RESULT,
  resolveWorldSemanticRestrictedPlaceAccess,
} from '../src/lib/simulation/world-semantic-access-runtime'

const compileFixtureVersion = async (proposal) => {
  const proposalHash = await createWorldSemanticProposalHash(proposal)
  const reviewed = await createReviewedWorldSemanticManifest({
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
  const compiled = await compileReviewedWorldSemanticManifest({
    reviewedManifest: reviewed.manifest,
    runtimeRegistry: fixture.runtimeRegistry,
  })
  const versionId = `semantic_1_${compiled.receipt.manifestHash.slice(0, 12)}`
  return {
    version: {
      versionId,
      revision: 1,
      compiledManifest: compiled.manifest,
    },
    binding: {
      worldId: proposal.worldId,
      semanticVersionId: versionId,
      semanticManifestRevision: 1,
      semanticManifestHash: compiled.receipt.manifestHash,
      semanticSourceFingerprint: proposal.sourceFingerprint,
    },
  }
}

describe('world semantic restricted-place access runtime', () => {
  test.each(fixture.worlds)(
    'grants $fixtureId through the same owner-neutral resolver',
    async ({ proposal }) => {
      const { version, binding } = await compileFixtureVersion(proposal)
      const capability = proposal.capabilities[0]
      const result = resolveWorldSemanticRestrictedPlaceAccess({
        semanticVersion: version,
        worldBinding: binding,
        actorEvidence: {
          sourceOwner: 'work_hub',
          worldId: proposal.worldId,
          worldRevision: 1,
          semanticVersionId: binding.semanticVersionId,
          packageId: 'authority_fixture',
          packageRevision: 1,
          membershipId: 'membership_self',
          profileId: 'self',
          profileRevision: 1,
          conceptIds: capability.actorConceptIds,
        },
        placeEvidence: {
          sourceOwner: 'map',
          worldId: proposal.worldId,
          semanticVersionId: binding.semanticVersionId,
          mapPackId: 'fixture-map',
          mapPackVersion: 1,
          placeId: 'fixture-place',
          conceptIds: capability.objectConceptIds,
        },
      })

      expect(result).toMatchObject({
        ok: true,
        applies: true,
        allowed: true,
        code: WORLD_SEMANTIC_ACCESS_RESULT.GRANTED,
        capabilityId: capability.id,
        ownerModule: 'map',
        ownerActionId: 'map:access:validate',
      })
      expect(result.capabilityLabel).toBe(capability.label)
      expect(result.boundaryIds).toEqual(proposal.boundaries.map((item) => item.id))
    },
  )

  test('fails closed when a restricted place has no matching actor evidence', async () => {
    const proposal = fixture.worlds[1].proposal
    const { version, binding } = await compileFixtureVersion(proposal)
    const capability = proposal.capabilities[0]
    const result = resolveWorldSemanticRestrictedPlaceAccess({
      semanticVersion: version,
      worldBinding: binding,
      actorEvidence: null,
      placeEvidence: {
        mapPackId: 'academy-map',
        mapPackVersion: 1,
        placeId: 'silver-archive',
        conceptIds: capability.objectConceptIds,
      },
    })

    expect(result).toMatchObject({
      applies: true,
      allowed: false,
      code: WORLD_SEMANTIC_ACCESS_RESULT.ACTOR_EVIDENCE_MISSING,
    })
  })

  test('leaves ordinary places on the existing Map path', async () => {
    const proposal = fixture.worlds[2].proposal
    const { version, binding } = await compileFixtureVersion(proposal)
    const result = resolveWorldSemanticRestrictedPlaceAccess({
      semanticVersion: version,
      worldBinding: binding,
      actorEvidence: null,
      placeEvidence: { mapPackId: 'city', placeId: 'open-square', conceptIds: [] },
    })

    expect(result).toMatchObject({
      applies: false,
      allowed: false,
      code: WORLD_SEMANTIC_ACCESS_RESULT.NOT_APPLICABLE,
    })
  })

  test('rejects stale world-version evidence before checking concepts', async () => {
    const proposal = fixture.worlds[0].proposal
    const { version, binding } = await compileFixtureVersion(proposal)
    const result = resolveWorldSemanticRestrictedPlaceAccess({
      semanticVersion: version,
      worldBinding: { ...binding, semanticManifestRevision: 2 },
      actorEvidence: null,
      placeEvidence: { conceptIds: proposal.capabilities[0].objectConceptIds },
    })

    expect(result).toMatchObject({
      applies: false,
      allowed: false,
      code: WORLD_SEMANTIC_ACCESS_RESULT.VERSION_STALE,
    })
  })
})
