import { describe, expect, test } from 'vitest'
import { CUSTOM_MAP_PACK_LIMIT } from '../src/lib/map-packs'
import {
  MAP_WORLD_SUITE_NATIVE_KINDS,
  computeManagedMapPackFingerprint,
  inspectMapWorldSuiteMutationReadiness,
  inspectMapWorldSuiteResource,
} from '../src/lib/map-world-suite-inspection'
import {
  createCatalogManagedMapPackFixture,
  createMapWorldSuiteResourceFixture,
  createMapWorldSuiteStateFixture,
} from './fixtures/map-world-suite-inspection'

describe('Map World Suite native inspection', () => {
  test('classifies an absent native ID and reports remaining custom-pack capacity', () => {
    const resource = createMapWorldSuiteResourceFixture()
    const inspected = inspectMapWorldSuiteResource({
      resource,
      state: createMapWorldSuiteStateFixture(),
    })

    expect(inspected).toMatchObject({
      ok: true,
      installed: false,
      collision: false,
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.ABSENT,
      nativeInstallEligible: true,
      canInstall: false,
      capacity: {
        limit: CUSTOM_MAP_PACK_LIMIT,
        count: 0,
        remaining: CUSTOM_MAP_PACK_LIMIT,
        reached: false,
      },
    })
  })

  test('never treats a built-in pack as Catalog-installed evidence', () => {
    const resource = createMapWorldSuiteResourceFixture(1, {
      id: 'map.real-seoul',
      ownerResourceId: 'real-seoul-v1',
      catalogId: 'real-seoul-catalog',
    })
    const inspected = inspectMapWorldSuiteResource({
      resource,
      state: createMapWorldSuiteStateFixture(),
    })

    expect(inspected).toMatchObject({
      installed: false,
      collision: true,
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.BUILT_IN,
      nativeInstallEligible: false,
      canInstall: false,
      enabled: true,
      inUse: true,
    })
  })

  test('distinguishes a user custom pack and another Catalog resource from the requested resource', () => {
    const resource = createMapWorldSuiteResourceFixture()
    const userPack = createCatalogManagedMapPackFixture({ resource })
    delete userPack.provenance

    const userCollision = inspectMapWorldSuiteResource({
      resource,
      state: createMapWorldSuiteStateFixture({ customMapPacks: [userPack] }),
    })
    expect(userCollision).toMatchObject({
      installed: false,
      collision: true,
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.USER_CUSTOM,
    })

    const otherResource = createMapWorldSuiteResourceFixture(1, { id: 'map.other-resource' })
    const otherManagedPack = createCatalogManagedMapPackFixture({ resource: otherResource })
    const catalogCollision = inspectMapWorldSuiteResource({
      resource,
      state: createMapWorldSuiteStateFixture({ customMapPacks: [otherManagedPack] }),
    })
    expect(catalogCollision).toMatchObject({
      installed: false,
      collision: true,
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.CATALOG_MANAGED_OTHER,
    })
  })

  test('uses explicit Catalog provenance and a stable managed fingerprint as installed truth', () => {
    const resource = createMapWorldSuiteResourceFixture(3)
    const pack = createCatalogManagedMapPackFixture({ resource, catalogVersion: 3 })
    const inspected = inspectMapWorldSuiteResource({
      resource,
      state: createMapWorldSuiteStateFixture({ customMapPacks: [pack] }),
      galleryAssets: [{ id: 'gallery-neon-map' }],
    })

    expect(inspected).toMatchObject({
      installed: true,
      version: 3,
      collision: false,
      userModified: false,
      nativeKind: MAP_WORLD_SUITE_NATIVE_KINDS.CATALOG_MANAGED,
      galleryAsset: {
        assetId: 'gallery-neon-map',
        referenced: true,
        available: true,
      },
    })
  })

  test('detects edits across topology metadata while ignoring derived URLs and timestamps', () => {
    const resource = createMapWorldSuiteResourceFixture()
    const pack = createCatalogManagedMapPackFixture({ resource })
    const baselineFingerprint = pack.provenance.installedFingerprint

    expect(
      computeManagedMapPackFingerprint({
        ...pack,
        assetUrl: 'blob:another-session',
        createdAt: 99_000,
        updatedAt: 100_000,
      }),
    ).toBe(baselineFingerprint)

    pack.factions = pack.factions.map((faction) => ({ ...faction, labelEn: 'My North Ring' }))
    const inspected = inspectMapWorldSuiteResource({
      resource,
      state: createMapWorldSuiteStateFixture({ customMapPacks: [pack] }),
    })
    expect(inspected.userModified).toBe(true)
  })

  test('treats missing Catalog version or fingerprint provenance as modified native truth', () => {
    const resource = createMapWorldSuiteResourceFixture()
    const pack = createCatalogManagedMapPackFixture({ resource })
    pack.provenance.catalogVersion = 0
    pack.provenance.installedFingerprint = ''

    expect(
      inspectMapWorldSuiteResource({
        resource,
        state: createMapWorldSuiteStateFixture({ customMapPacks: [pack] }),
      }),
    ).toMatchObject({
      installed: true,
      version: 1,
      userModified: true,
    })
  })

  test('collects every current and historical Map reference without mutating native state', () => {
    const resource = createMapWorldSuiteResourceFixture()
    const pack = createCatalogManagedMapPackFixture({ resource })
    const state = createMapWorldSuiteStateFixture({
      activeMapPackId: pack.id,
      customMapPacks: [pack],
      worldMapPackBindings: {
        modern_parallel: pack.id,
        fandom_parallel: pack.id,
      },
      addresses: [
        { id: 101, mapPackId: pack.id },
        { id: 102, mapPackId: pack.id },
      ],
      mapPinVisibilityByPack: {
        [pack.id]: {
          categoryVisibility: { commerce: false },
          placeVisibility: { 'address:101': true },
        },
      },
      mapPlaceKnowledgeByWorld: {
        modern_parallel: {
          discoveriesByMapPack: {
            [pack.id]: {
              placeIds: ['catalog-pharmacy', 'catalog-store'],
              evidenceByPlaceId: {
                'catalog-pharmacy': { sourceId: 'journey-old-1' },
              },
            },
          },
        },
      },
      currentLocation: {
        mapPackId: pack.id,
        placeId: 'address:101',
        position: { kind: 'canvas', x: 0.4, y: 0.6 },
      },
      placeSession: {
        state: 'inside',
        mapPackId: pack.id,
        sessionId: 'session-current',
        placeId: 'address:101',
      },
      tripState: {
        status: 'traveling',
        mapPackId: pack.id,
        journeyId: 'journey-current',
        destinationPlaceId: 'address:102',
      },
      tripHistory: [
        { id: 'history-1', journeyId: 'journey-old-1', mapPackId: pack.id },
        { id: 'history-other', journeyId: 'journey-other', mapPackId: 'real-seoul-v1' },
      ],
    })
    const before = structuredClone(state)
    const inspected = inspectMapWorldSuiteResource({ resource, state })

    expect(inspected).toMatchObject({
      installed: true,
      enabled: true,
      inUse: true,
      historicalReferenceCount: 3,
      references: {
        activeSelection: true,
        worldBindingIds: ['modern_parallel', 'fandom_parallel'],
        addressIds: ['101', '102'],
        visibility: { count: 2 },
        placeKnowledge: { count: 2 },
        currentLocation: { referenced: true, hasPosition: true },
        placeSession: { referenced: true, active: true },
        activeJourney: { referenced: true, journeyId: 'journey-current' },
        historicalJourneyIds: ['journey-old-1'],
      },
    })
    expect(state).toEqual(before)
    expect(Object.isFrozen(inspected.references)).toBe(true)
  })

  test('merges deduplicated external Owner references into current and historical protection', () => {
    const resource = createMapWorldSuiteResourceFixture()
    const pack = createCatalogManagedMapPackFixture({ resource })
    const externalReferences = [
      {
        owner: 'event_runtime',
        kind: 'event_instance',
        referenceId: 'event-current',
        mapPackId: pack.id,
        active: true,
      },
      {
        owner: 'event_runtime',
        kind: 'event_instance',
        referenceId: 'event-current',
        mapPackId: pack.id,
        active: true,
      },
      {
        owner: 'event_runtime',
        kind: 'map_journey_event_proposal',
        referenceId: 'proposal-old',
        mapPackId: pack.id,
        active: false,
      },
      {
        owner: 'calendar',
        kind: 'confirmed_event_place',
        referenceId: 'calendar-other-map',
        mapPackId: 'real-seoul-v1',
        active: true,
      },
    ]

    const inspected = inspectMapWorldSuiteResource({
      resource,
      state: createMapWorldSuiteStateFixture({ customMapPacks: [pack] }),
      externalReferences,
    })

    expect(inspected).toMatchObject({
      inUse: true,
      historicalReferenceCount: 1,
      references: {
        currentReferenceCount: 1,
        historicalReferenceCount: 1,
        external: {
          count: 2,
          currentCount: 1,
          historicalCount: 1,
          byOwner: {
            event_runtime: { currentCount: 1, historicalCount: 1 },
          },
        },
      },
    })
  })

  test('counts a left place session as historical rather than current use', () => {
    const resource = createMapWorldSuiteResourceFixture()
    const pack = createCatalogManagedMapPackFixture({ resource })
    const inspected = inspectMapWorldSuiteResource({
      resource,
      state: createMapWorldSuiteStateFixture({
        customMapPacks: [pack],
        placeSession: {
          state: 'left',
          mapPackId: pack.id,
          sessionId: 'session-old',
          placeId: 'catalog-cafe',
        },
      }),
    })

    expect(inspected.references).toMatchObject({
      currentReferenceCount: 0,
      historicalReferenceCount: 1,
      placeSession: { active: false, historical: true },
    })
    expect(inspected.inUse).toBe(true)
  })

  test('reports full capacity without evicting or reclassifying existing packs', () => {
    const resource = createMapWorldSuiteResourceFixture()
    const customMapPacks = Array.from({ length: CUSTOM_MAP_PACK_LIMIT }, (_, index) => ({
      id: `user-map-${index + 1}`,
      source: 'custom',
      assetId: `asset-${index + 1}`,
    }))
    const inspected = inspectMapWorldSuiteResource({
      resource,
      state: createMapWorldSuiteStateFixture({ customMapPacks }),
    })

    expect(inspected).toMatchObject({
      installed: false,
      collision: false,
      nativeInstallEligible: false,
      canInstall: false,
      capacity: {
        count: CUSTOM_MAP_PACK_LIMIT,
        remaining: 0,
        reached: true,
      },
    })
    expect(customMapPacks).toHaveLength(CUSTOM_MAP_PACK_LIMIT)
  })

  test('reports native mutation prerequisites ready without claiming an Adapter is registered', () => {
    const current = inspectMapWorldSuiteMutationReadiness()
    expect(current).toMatchObject({ approved: true, blockers: [] })

    const target = inspectMapWorldSuiteMutationReadiness({
      provenanceRoundTrip: true,
      ownerMutationInterface: true,
      writeReceiptObservable: true,
      rollbackVerified: true,
      galleryAssetLifecycleDefined: true,
    })
    expect(target).toMatchObject({ approved: true, blockers: [] })

    const resource = createMapWorldSuiteResourceFixture()
    expect(
      inspectMapWorldSuiteResource({
        resource,
        state: createMapWorldSuiteStateFixture(),
        mutationCapabilities: target.capabilities,
        mutationAdapterAvailable: true,
      }),
    ).toMatchObject({
      nativeInstallEligible: true,
      mutationAdapterAvailable: true,
      canInstall: true,
    })
  })

  test('fails closed for a malformed non-Map resource', () => {
    expect(
      inspectMapWorldSuiteResource({
        resource: { ...createMapWorldSuiteResourceFixture(), owner: 'book' },
      }),
    ).toEqual({ ok: false, code: 'invalid_resource' })
  })
})
