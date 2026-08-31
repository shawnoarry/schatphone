import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import fixture from './fixtures/world-semantic/conformance-v1.json'
import {
  WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
  WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
  createWorldSemanticProposalHash,
} from '../src/lib/simulation/world-semantic-contract'
import { PRIMARY_PERSISTED_WORLD_ID, createWorldSettingSourceSnapshot } from '../src/lib/world-setting-state'
import { WORLD_SEMANTIC_ACCESS_RESULT } from '../src/lib/simulation/world-semantic-access-runtime'
import { WORLD_SEMANTIC_ACCESS_EVENT_RESULT } from '../src/lib/simulation/world-semantic-access-event-templates'
import { useMapStore } from '../src/stores/map'
import { useSimulationStore } from '../src/stores/simulation'
import { useSystemStore } from '../src/stores/system'
import { useWorkHubStore } from '../src/stores/workHub'
import {
  createCatalogManagedMapPackFixture,
  createMapWorldSuiteResourceFixture,
} from './fixtures/map-world-suite-inspection'

const NOW = new Date('2026-08-31T21:00:00+08:00').getTime()

const createOverview = (fixtureId) => ({
  identity: { worldId: PRIMARY_PERSISTED_WORLD_ID, title: fixtureId },
  narrative: {
    fallbackText: '',
    activeSources: [{
      id: `world_source_${fixtureId}`,
      assetId: `book_${fixtureId}`,
      promptText: `Access rules for ${fixtureId}.`,
      role: 'core',
      enabled: true,
      priority: 10,
      sourceVersion: 1,
    }],
  },
  encyclopedia: { selectedEntries: [] },
  profiles: { enabledTemplates: [] },
  capabilities: { enabledPacks: [] },
})

const activateSemanticWorld = async (systemStore, worldFixture) => {
  const snapshot = await createWorldSettingSourceSnapshot({
    worldOverview: createOverview(worldFixture.fixtureId),
    observedAt: NOW,
  })
  const proposal = {
    ...structuredClone(worldFixture.proposal),
    worldId: PRIMARY_PERSISTED_WORLD_ID,
    sourceFingerprint: snapshot.sourceFingerprint,
  }
  const proposalHash = await createWorldSemanticProposalHash(proposal)
  const result = await systemStore.confirmAndActivateWorldSemanticProposal({
    snapshot,
    proposal,
    confirmation: {
      schemaVersion: WORLD_SEMANTIC_REVIEW_SCHEMA_VERSION,
      status: 'confirmed',
      confirmedBy: 'user',
      sourceFingerprint: proposal.sourceFingerprint,
      proposalHash,
      manifestRevision: 1,
    },
    modelReceipt: {
      schemaVersion: WORLD_SEMANTIC_MODEL_RECEIPT_SCHEMA_VERSION,
      providerId: 'fixture_provider',
      modelId: 'fixture_model',
      requestId: `request_${worldFixture.fixtureId}`,
      generatedAt: NOW,
      sourceFingerprint: proposal.sourceFingerprint,
      proposalHash,
    },
    runtimeRegistry: fixture.runtimeRegistry,
    now: NOW,
  })
  expect(result).toMatchObject({ ok: true, reason: 'version_confirmed_and_activated' })
  return { proposal, binding: systemStore.getActiveWorldSemanticBinding() }
}

const createAuthority = ({ actorConceptIds, worldRevision = 1, fixtureId }) => {
  const binding = {
    worldId: PRIMARY_PERSISTED_WORLD_ID,
    worldRevision,
    contactsProfileId: 'self_profile',
    contactsProfileRevision: 1,
  }
  const common = {
    worldId: binding.worldId,
    organizationId: `organization_${fixtureId}`,
    revision: 1,
    issuerId: `issuer_${fixtureId}`,
    issuedAt: NOW - 1_000,
    expiresAt: NOW + 86_400_000,
    revokedAt: 0,
  }
  return {
    schemaVersion: 1,
    packageId: `work_hub_authority_${fixtureId}`,
    revision: 1,
    worldBinding: binding,
    issuer: {
      issuerId: common.issuerId,
      kind: 'world_configuration_authority',
      revision: 1,
      scopes: ['work_hub:issue'],
      issuedAt: common.issuedAt,
      expiresAt: common.expiresAt,
      revokedAt: 0,
    },
    issuedAt: common.issuedAt,
    expiresAt: common.expiresAt,
    revokedAt: 0,
    organizations: [{
      ...common,
      id: common.organizationId,
      nameZh: fixtureId,
      nameEn: fixtureId,
      kind: 'world_organization',
      status: 'active',
    }],
    memberships: [{
      ...common,
      id: `membership_${fixtureId}`,
      subjectProfileId: binding.contactsProfileId,
      subjectProfileRevision: binding.contactsProfileRevision,
      status: 'active',
      displayLabel: fixtureId,
      semanticConceptIds: actorConceptIds,
    }],
    roleAssignments: [{
      ...common,
      id: `role_${fixtureId}`,
      membershipId: `membership_${fixtureId}`,
      roleKey: 'world_role',
      nameZh: fixtureId,
      nameEn: fixtureId,
      scopes: [],
      teamIds: [],
      semanticConceptIds: [],
    }],
    teams: [],
    channels: [],
    workNotices: [],
    tasks: [],
    statusReports: [],
    scheduleProposals: [],
    approvalRequests: [],
    receipts: [],
  }
}

const installAuthority = (workHubStore, options) => {
  const authority = createAuthority(options)
  expect(workHubStore.installAuthorityPackage(authority, {
    expectedBinding: authority.worldBinding,
    confirmed: true,
    now: NOW,
  })).toMatchObject({ ok: true, code: 'authority_installed' })
}

const installSemanticMap = (mapStore, { fixtureId, placeConceptIds }) => {
  const resource = createMapWorldSuiteResourceFixture(1, {
    id: `map.${fixtureId}`,
    ownerResourceId: `semantic-${fixtureId}-v1`,
    catalogId: `semantic-${fixtureId}-catalog`,
  })
  const placeId = `${fixtureId}-restricted-place`
  const pack = createCatalogManagedMapPackFixture({
    resource,
    overrides: {
      assetId: `gallery-${fixtureId}-map`,
      labelZh: fixtureId,
      labelEn: fixtureId,
      places: [{
        id: placeId,
        nameZh: '受限地点',
        nameEn: 'Restricted place',
        detailZh: '需要经过身份核验。',
        detailEn: 'Identity validation is required.',
        category: 'work',
        factionId: 'north-ring',
        position: { kind: 'canvas', x: 0.36, y: 0.42 },
        aliases: [],
        semanticConceptIds: placeConceptIds,
      }],
    },
  })
  expect(mapStore.restoreFromBackup({
    map: {
      customMapPacks: [pack],
      activeMapPackId: pack.id,
    },
  })).toBe(true)
  const place = mapStore.activeMapPlaces.find((item) => item.placeId === placeId)
  expect(place?.semanticConceptIds).toEqual(placeConceptIds)
  expect(mapStore.setCurrentLocation({
    label: place.nameEn,
    detail: place.detailEn,
    source: 'semantic_access_test',
    mapPackId: pack.id,
    placeId,
    position: place.position,
    evidenceAt: NOW,
  })).toBe(true)
  return place
}

const createHarness = async (worldFixture, {
  actorConceptIds = worldFixture.proposal.capabilities[0].actorConceptIds,
  worldRevision = 1,
  installWorkHub = true,
} = {}) => {
  const systemStore = useSystemStore()
  const workHubStore = useWorkHubStore()
  const mapStore = useMapStore()
  const simulationStore = useSimulationStore()
  await vi.waitFor(() => expect(systemStore.hasFinishedStorageHydration).toBe(true))
  await activateSemanticWorld(systemStore, worldFixture)
  if (installWorkHub) {
    installAuthority(workHubStore, {
      actorConceptIds,
      worldRevision,
      fixtureId: worldFixture.fixtureId,
    })
  }
  const place = installSemanticMap(mapStore, {
    fixtureId: worldFixture.fixtureId,
    placeConceptIds: worldFixture.proposal.capabilities[0].objectConceptIds,
  })
  return { systemStore, workHubStore, mapStore, simulationStore, place }
}

describe('Map production world-semantic restricted-place access', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test.each(fixture.worlds)(
    'runs $fixtureId through the same Map and Event V2 path',
    async (worldFixture) => {
      const { mapStore, simulationStore, place } = await createHarness(worldFixture)
      mapStore.setWorldSemanticAccessRandomValueForTesting(0.99)

      const first = mapStore.enterPlace(place.placeId, { now: NOW + 1 })

      expect(first).toMatchObject({
        ok: true,
        code: WORLD_SEMANTIC_ACCESS_RESULT.GRANTED,
        access: {
          capabilityId: worldFixture.proposal.capabilities[0].id,
          actorConceptId: worldFixture.proposal.capabilities[0].actorConceptIds[0],
          placeConceptId: worldFixture.proposal.capabilities[0].objectConceptIds[0],
        },
        accessEvent: {
          lifecycle: 'resolved',
          resultCodes: [WORLD_SEMANTIC_ACCESS_EVENT_RESULT.GRANTED_REVIEWED],
        },
      })
      expect(simulationStore.eventInstancesV2).toHaveLength(1)
      expect(simulationStore.ownerFacts).toHaveLength(1)
      expect(mapStore.placeSession).toMatchObject({ state: 'inside', placeId: place.placeId })

      expect(mapStore.leavePlace({ now: NOW + 2 }).ok).toBe(true)
      mapStore.setWorldSemanticAccessRandomValueForTesting(0)
      const replay = mapStore.enterPlace(place.placeId, { now: NOW + 3 })
      expect(replay.accessEvent.id).toBe(first.accessEvent.id)
      expect(replay.accessEvent.decisionLedger).toEqual(first.accessEvent.decisionLedger)
      expect(simulationStore.eventInstancesV2).toHaveLength(1)
      expect(simulationStore.ownerFacts).toHaveLength(1)
    },
  )

  test.each([
    {
      name: 'missing identity',
      options: { installWorkHub: false },
      code: WORLD_SEMANTIC_ACCESS_RESULT.ACTOR_EVIDENCE_MISSING,
      lifecycle: 'resolved',
    },
    {
      name: 'unmatched identity',
      options: { actorConceptIds: ['custom:unmatched_identity'] },
      code: WORLD_SEMANTIC_ACCESS_RESULT.DENIED,
      lifecycle: 'resolved',
    },
    {
      name: 'stale identity',
      options: { worldRevision: 2 },
      code: WORLD_SEMANTIC_ACCESS_RESULT.ACTOR_EVIDENCE_STALE,
      lifecycle: 'cancelled',
    },
  ])('fails closed for $name through a persisted Map fact', async ({ options, code, lifecycle }) => {
    const worldFixture = fixture.worlds[0]
    const { mapStore, simulationStore, place } = await createHarness(worldFixture, options)

    const result = mapStore.enterPlace(place.placeId, { now: NOW + 1 })

    expect(result).toMatchObject({
      ok: false,
      code,
      accessEvent: { lifecycle, resultCodes: [code] },
    })
    expect(mapStore.placeSession.state).toBe('left')
    expect(simulationStore.eventInstancesV2).toHaveLength(1)
    expect(simulationStore.ownerFacts).toHaveLength(1)
    expect(simulationStore.ownerFacts[0]).toMatchObject({
      sourceModule: 'map',
      resultCode: code,
    })
  })

  test('reopens the settled occurrence without rerolling or duplicating Map facts', async () => {
    const worldFixture = fixture.worlds[2]
    const first = await createHarness(worldFixture)
    first.mapStore.setWorldSemanticAccessRandomValueForTesting(0.99)
    const entered = first.mapStore.enterPlace(first.place.placeId, { now: NOW + 1 })
    expect(entered.accessEvent.resultCodes).toEqual([
      WORLD_SEMANTIC_ACCESS_EVENT_RESULT.GRANTED_REVIEWED,
    ])
    expect(first.mapStore.leavePlace({ now: NOW + 2 }).ok).toBe(true)
    await Promise.all([
      Promise.resolve(first.systemStore.saveNow()),
      Promise.resolve(first.workHubStore.saveNow()),
      Promise.resolve(first.mapStore.saveNow()),
      Promise.resolve(first.simulationStore.saveNow()),
    ])

    setActivePinia(createPinia())
    const reopenedSystem = useSystemStore()
    const reopenedWorkHub = useWorkHubStore()
    const reopenedMap = useMapStore()
    const reopenedSimulation = useSimulationStore()
    await vi.waitFor(() => expect(reopenedSystem.hasFinishedStorageHydration).toBe(true))
    await vi.waitFor(() => expect(reopenedWorkHub.hasFinishedStorageHydration).toBe(true))
    await vi.waitFor(() => {
      expect(reopenedMap.activeMapPlaces.some((place) => place.placeId === first.place.placeId)).toBe(true)
    })
    reopenedMap.setWorldSemanticAccessRandomValueForTesting(0)

    const replay = reopenedMap.enterPlace(first.place.placeId, { now: NOW + 3 })

    expect(replay).toMatchObject({ ok: true, accessEvent: { id: entered.accessEvent.id } })
    expect(replay.accessEvent.decisionLedger).toEqual(entered.accessEvent.decisionLedger)
    expect(reopenedSimulation.eventInstancesV2).toHaveLength(1)
    expect(reopenedSimulation.ownerFacts).toHaveLength(1)
  })

  test('restores owner backup sections without changing the settled result', async () => {
    const worldFixture = fixture.worlds[1]
    const first = await createHarness(worldFixture)
    first.mapStore.setWorldSemanticAccessRandomValueForTesting(0.99)
    const entered = first.mapStore.enterPlace(first.place.placeId, { now: NOW + 1 })
    expect(entered.accessEvent.resultCodes).toEqual([
      WORLD_SEMANTIC_ACCESS_EVENT_RESULT.GRANTED_REVIEWED,
    ])
    expect(first.mapStore.leavePlace({ now: NOW + 2 }).ok).toBe(true)
    expect(first.systemStore.saveNow().ok).toBe(true)
    const systemSnapshot = JSON.parse(localStorage.getItem('schatphone:store:system')).data
    const snapshots = {
      map: first.mapStore.createBackupSnapshot(),
      simulation: first.simulationStore.createBackupSnapshot(),
      workHub: first.workHubStore.createBackupSnapshot(),
    }

    localStorage.clear()
    setActivePinia(createPinia())
    const restoredSystem = useSystemStore()
    const restoredWorkHub = useWorkHubStore()
    const restoredMap = useMapStore()
    const restoredSimulation = useSimulationStore()
    await vi.waitFor(() => expect(restoredSystem.hasFinishedStorageHydration).toBe(true))
    await vi.waitFor(() => expect(restoredWorkHub.hasFinishedStorageHydration).toBe(true))
    expect(restoredSystem.restoreFromBackup(systemSnapshot)).toBe(true)
    expect(restoredWorkHub.restoreFromBackup({ workHub: snapshots.workHub })).toBe(true)
    expect(restoredMap.restoreFromBackup({ map: snapshots.map })).toBe(true)
    expect(restoredSimulation.restoreFromBackup(snapshots.simulation)).toBe(true)
    restoredMap.setWorldSemanticAccessRandomValueForTesting(0)

    const replay = restoredMap.enterPlace(first.place.placeId, { now: NOW + 3 })

    expect(replay).toMatchObject({ ok: true, accessEvent: { id: entered.accessEvent.id } })
    expect(replay.accessEvent.decisionLedger).toEqual(entered.accessEvent.decisionLedger)
    expect(restoredSimulation.eventInstancesV2).toHaveLength(1)
    expect(restoredSimulation.ownerFacts).toHaveLength(1)
  })
})
