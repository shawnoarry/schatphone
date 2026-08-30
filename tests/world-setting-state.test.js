import { describe, expect, test } from 'vitest'
import fixture from './fixtures/world-semantic/conformance-v1.json'
import {
  WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
  WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
  createWorldSemanticProposalHash,
} from '../src/lib/simulation/world-semantic-contract'
import {
  PRIMARY_PERSISTED_WORLD_ID,
  activateWorldSemanticVersion,
  classifyWorldSettingSourceChange,
  createDefaultWorldSettingState,
  createWorldSemanticCandidateVersion,
  createWorldSettingSourceSnapshot,
  inspectPersistedWorldSettingState,
  observeWorldSettingSource,
  resolveActiveWorldSemanticBinding,
  resolveWorldSettingVersionStatus,
  rollbackWorldSemanticVersion,
} from '../src/lib/world-setting-state'

const createOverview = ({ narrative = 'Named covenants govern passage.', extraEntry = null } = {}) => ({
  identity: { worldId: PRIMARY_PERSISTED_WORLD_ID, title: 'Tide Contract City' },
  narrative: {
    fallbackText: '',
    activeSources: [
      {
        id: 'world_source_tide_contracts',
        assetId: 'book_tide_contracts',
        promptText: narrative,
        role: 'core',
        enabled: true,
        priority: 10,
        sourceVersion: 1,
      },
    ],
  },
  encyclopedia: {
    selectedEntries: [
      {
        id: 'entry_chant_namer',
        title: 'Chant Namer',
        content: 'Confirms public names without rewriting settled history.',
        enabled: true,
        updatedAt: 10,
      },
      ...(extraEntry ? [extraEntry] : []),
    ],
  },
  profiles: {
    enabledTemplates: [
      {
        id: 'template_civic_role',
        title: 'Civic role',
        version: 1,
        enabled: true,
        categories: [{ id: 'identity', label: 'Identity' }],
        fields: [{ id: 'covenant', label: 'Covenant' }],
      },
    ],
  },
  capabilities: { enabledPacks: [] },
})

const createProposalForSnapshot = (snapshot, fixtureIndex = 2) => ({
  ...structuredClone(fixture.worlds[fixtureIndex].proposal),
  worldId: PRIMARY_PERSISTED_WORLD_ID,
  sourceFingerprint: snapshot.sourceFingerprint,
})

const createConfirmation = async (proposal, manifestRevision) => ({
  schemaVersion: WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
  status: 'confirmed',
  confirmedBy: 'user',
  sourceFingerprint: proposal.sourceFingerprint,
  proposalHash: await createWorldSemanticProposalHash(proposal),
  manifestRevision,
})

const createCandidate = async ({ state, snapshot, fixtureIndex = 2, now = 20 }) => {
  const proposal = createProposalForSnapshot(snapshot, fixtureIndex)
  return createWorldSemanticCandidateVersion({
    state,
    proposal,
    confirmation: await createConfirmation(
      proposal,
      state.semantic.versions.length + 1,
    ),
    runtimeRegistry: fixture.runtimeRegistry,
    modelReceipt: {
      schemaVersion: WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
      providerId: 'openai_compatible',
      modelId: 'test-model',
      requestId: `request-${now}`,
      generatedAt: now,
      sourceFingerprint: proposal.sourceFingerprint,
      proposalHash: await createWorldSemanticProposalHash(proposal),
    },
    now,
  })
}

describe('world setting persisted identity and semantic versions', () => {
  test('creates stable source fingerprints and classifies additions separately from changed meaning', async () => {
    const first = await createWorldSettingSourceSnapshot({
      worldOverview: createOverview(),
      observedAt: 10,
    })
    const reordered = await createWorldSettingSourceSnapshot({
      worldOverview: createOverview(),
      observedAt: 11,
    })
    const added = await createWorldSettingSourceSnapshot({
      worldOverview: createOverview({
        extraEntry: {
          id: 'entry_tide_gate',
          title: 'Tide gate',
          content: 'A gate recognizes a named covenant.',
          enabled: true,
        },
      }),
      observedAt: 12,
    })
    const changed = await createWorldSettingSourceSnapshot({
      worldOverview: createOverview({ narrative: 'Named covenants no longer govern passage.' }),
      observedAt: 13,
    })

    expect(first.sourceFingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(reordered.sourceFingerprint).toBe(first.sourceFingerprint)
    expect(classifyWorldSettingSourceChange(first, reordered).status).toBe('unchanged')
    expect(classifyWorldSettingSourceChange(first, added).status).toBe('content_added')
    expect(classifyWorldSettingSourceChange(first, changed).status).toBe(
      'meaning_review_required',
    )
  })

  test('stages a compiled candidate without changing the active version', async () => {
    const snapshot = await createWorldSettingSourceSnapshot({ worldOverview: createOverview() })
    const observed = observeWorldSettingSource({
      state: createDefaultWorldSettingState({ now: 1 }),
      snapshot,
      now: 10,
    })
    const candidate = await createCandidate({ state: observed.state, snapshot })

    expect(candidate.ok).toBe(true)
    expect(candidate.state.semantic.candidateVersionId).toBe(candidate.version.versionId)
    expect(candidate.state.semantic.activeVersionId).toBe('')
    expect(candidate.version.modelReceipt).toMatchObject({
      providerId: 'openai_compatible',
      modelId: 'test-model',
    })
    expect(JSON.stringify(candidate.version.compiledManifest)).not.toMatch(
      /openai_compatible|test-model|request-20/,
    )
  })

  test('activates only after recompile verification and leaves the pointer unchanged when stale', async () => {
    const snapshot = await createWorldSettingSourceSnapshot({ worldOverview: createOverview() })
    const observed = observeWorldSettingSource({
      state: createDefaultWorldSettingState({ now: 1 }),
      snapshot,
      now: 10,
    })
    const candidate = await createCandidate({ state: observed.state, snapshot })
    const stale = await activateWorldSemanticVersion({
      state: candidate.state,
      versionId: candidate.version.versionId,
      runtimeRegistry: fixture.runtimeRegistry,
      currentSourceFingerprint: 'f'.repeat(64),
      now: 30,
    })
    const activated = await activateWorldSemanticVersion({
      state: candidate.state,
      versionId: candidate.version.versionId,
      runtimeRegistry: fixture.runtimeRegistry,
      currentSourceFingerprint: snapshot.sourceFingerprint,
      now: 31,
    })

    expect(stale).toMatchObject({ ok: false, reason: 'candidate_stale' })
    expect(stale.state.semantic.activeVersionId).toBe('')
    expect(activated).toMatchObject({ ok: true, reason: 'version_activated' })
    expect(resolveActiveWorldSemanticBinding(activated.state)).toMatchObject({
      worldId: PRIMARY_PERSISTED_WORLD_ID,
      semanticVersionId: candidate.version.versionId,
      semanticManifestRevision: 1,
      semanticManifestHash: candidate.version.manifestHash,
    })
  })

  test('keeps an active event binding stable while a later version activates and can roll back', async () => {
    const firstSnapshot = await createWorldSettingSourceSnapshot({ worldOverview: createOverview() })
    const firstObserved = observeWorldSettingSource({
      state: createDefaultWorldSettingState({ now: 1 }),
      snapshot: firstSnapshot,
      now: 10,
    })
    const firstCandidate = await createCandidate({ state: firstObserved.state, snapshot: firstSnapshot })
    const firstActivated = await activateWorldSemanticVersion({
      state: firstCandidate.state,
      runtimeRegistry: fixture.runtimeRegistry,
      currentSourceFingerprint: firstSnapshot.sourceFingerprint,
      now: 30,
    })
    const eventStartBinding = resolveActiveWorldSemanticBinding(firstActivated.state)

    const secondSnapshot = await createWorldSettingSourceSnapshot({
      worldOverview: createOverview({ narrative: 'Named covenants govern passage at the tide gate.' }),
    })
    const secondObserved = observeWorldSettingSource({
      state: firstActivated.state,
      snapshot: secondSnapshot,
      now: 40,
    })
    const secondCandidate = await createCandidate({
      state: secondObserved.state,
      snapshot: secondSnapshot,
      fixtureIndex: 1,
      now: 50,
    })
    const secondActivated = await activateWorldSemanticVersion({
      state: secondCandidate.state,
      runtimeRegistry: fixture.runtimeRegistry,
      currentSourceFingerprint: secondSnapshot.sourceFingerprint,
      now: 60,
    })
    const rolledBack = await rollbackWorldSemanticVersion({
      state: secondActivated.state,
      runtimeRegistry: fixture.runtimeRegistry,
      now: 70,
    })

    expect(eventStartBinding.semanticVersionId).toBe(firstCandidate.version.versionId)
    expect(resolveActiveWorldSemanticBinding(secondActivated.state).semanticVersionId).toBe(
      secondCandidate.version.versionId,
    )
    expect(eventStartBinding.semanticVersionId).toBe(firstCandidate.version.versionId)
    expect(rolledBack).toMatchObject({ ok: true, reason: 'version_rolled_back' })
    expect(resolveActiveWorldSemanticBinding(rolledBack.state).semanticVersionId).toBe(
      firstCandidate.version.versionId,
    )
    expect(resolveWorldSettingVersionStatus(secondActivated.state)).toMatchObject({
      activeRevision: 2,
      rollbackAvailable: true,
      sourceChanged: false,
    })
    expect(inspectPersistedWorldSettingState(secondActivated.state)).toMatchObject({
      ok: true,
      legacy: false,
    })
  })

  test('fails closed when stored compiled bytes no longer match the reviewed manifest', async () => {
    const snapshot = await createWorldSettingSourceSnapshot({ worldOverview: createOverview() })
    const observed = observeWorldSettingSource({
      state: createDefaultWorldSettingState({ now: 1 }),
      snapshot,
    })
    const candidate = await createCandidate({ state: observed.state, snapshot })
    const tampered = structuredClone(candidate.state)
    tampered.semantic.versions[0].manifestHash = 'a'.repeat(64)

    const activation = await activateWorldSemanticVersion({
      state: tampered,
      runtimeRegistry: fixture.runtimeRegistry,
      currentSourceFingerprint: snapshot.sourceFingerprint,
    })

    expect(activation).toMatchObject({ ok: false, reason: 'stored_version_verification_failed' })
    expect(activation.state.semantic.activeVersionId).toBe('')
    expect(inspectPersistedWorldSettingState(tampered)).toMatchObject({ ok: false })
  })
})
