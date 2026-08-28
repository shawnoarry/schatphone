import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getMapPackById } from '../src/lib/map-packs'
import {
  MAP_EVENT_POSITION_PROVENANCE,
  MAP_PLACE_SESSION_EVENT_RESULT,
  MAP_PLACE_SESSION_STATE,
  clusterMapEventSurfacePins,
  createEmptyMapPlaceSession,
  createMapEventSurfaceHostRegistry,
  createMapPlaceSessionEventPreview,
  createMapPlaceSessionCheckpointV1,
  createMapPositionEvidence,
  enterMapPlaceSession,
  evaluateMapPlaceSessionEventInvitation,
  leaveMapPlaceSession,
  projectMapPlaceSessionEventSurface,
  resolveMapEventPlaceSemantics,
  resolveMapPlaceSessionEventInstance,
  validateMapPlaceSessionEventResolution,
} from '../src/lib/simulation/adapters/map-place-session-events'
import { materializeLocalEventInstanceV1 } from '../src/lib/simulation/event-instance-materializer'
import {
  KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
} from '../src/lib/simulation/kpop-realism-event-pack'
import { EVENT_TEXT_MODE } from '../src/lib/simulation/event-contracts'
import { migrateMapStorage, useMapStore } from '../src/stores/map'
import { useBookStore } from '../src/stores/book'
import { useSimulationStore } from '../src/stores/simulation'
import { useSystemStore } from '../src/stores/system'
import { buildWorldBookSourceSnapshot } from '../src/lib/book-text-schema'

const NOW = Date.parse('2026-08-10T10:00:00.000Z')
const clonePlain = (value) => JSON.parse(JSON.stringify(value))

const createPlace = ({
  id = 'fictional-broadcast-house',
  mapPackId = 'fictional-city-v1',
  position = { kind: 'canvas', x: 0.42, y: 0.36 },
} = {}) => ({
  id,
  placeId: id,
  mapPackId,
  placeCategoryId: 'broadcast_station',
  capabilityIds: ['work', 'wait', 'record'],
  position,
})

const createCurrentLocation = (place, overrides = {}) => ({
  mapPackId: place.mapPackId,
  placeId: place.placeId,
  position: { ...place.position },
  positionEvidence: createMapPositionEvidence({
    provenance: MAP_EVENT_POSITION_PROVENANCE.MANUAL,
    placeId: place.placeId,
    evidenceAt: NOW,
  }),
  ...overrides,
})

const enterSession = (place = createPlace(), overrides = {}) => {
  const result = enterMapPlaceSession({
    previousSession: createEmptyMapPlaceSession(),
    currentLocation: createCurrentLocation(place),
    place,
    worldPackId: 'custom-kpop-world',
    mapPackVersion: 4,
    now: NOW,
    ...overrides,
  })
  expect(result.ok).toBe(true)
  return result.session
}

const materializeForSession = (session, place, overrides = {}) => {
  const result = materializeLocalEventInstanceV1({
    instanceId: overrides.instanceId || 'event_instance_map_place_test_001',
    source: {
      moduleKey: 'map',
      recordType: 'map_place_session',
      recordId: session.sessionId,
      recordRevision: session.revision,
      checkpointId: 'map.place_session.entered.v1',
      checkpointAt: session.enteredAt,
    },
    world: {
      worldContextId: 'world_context_daily_test',
      worldPackId: session.worldPackId,
      mapPackId: session.mapPackId,
      mapPackVersion: session.mapPackVersion,
    },
    place: {
      placeId: session.placeId,
      placeCategoryId: session.placeCategoryId,
      capabilityIds: session.capabilityIds,
      anchor: {
        kind: 'stable_place',
        mapPackId: session.mapPackId,
        placeId: session.placeId,
      },
    },
    presence: {
      activationScope: 'interior',
      relation: 'inside',
      provenance: session.presence.provenance,
      placeSessionId: session.sessionId,
      placeSessionRevision: session.revision,
      journeyId: session.presence.journeyId,
      evidenceAt: session.presence.evidenceAt,
    },
    runtime: { proposalId: `proposal_${overrides.instanceId || 'map_place_test_001'}` },
    locale: 'en',
    seed: overrides.instanceId || 'map-place-session-test',
    now: NOW,
  })
  expect(result.ok).toBe(true)
  return result.instance
}

const createAiCopy = () => ({
  locale: 'en',
  title: 'Production arrival notes',
  opening: 'The production floor is settling into its first briefing.',
  environment: 'A coordinator has left the local call sheet by the access desk.',
  dialogue: [],
  choiceLabels: {
    review_brief: 'Review the production brief',
    check_equipment: 'Check the equipment',
    wait_for_staff: 'Wait for the coordinator',
  },
  consequenceByOutcomeId: {
    brief_reviewed: 'The notes are clear and no external record changes.',
    equipment_checked: 'The check finishes without changing inventory.',
    wait_acknowledged: 'You keep your place without changing the schedule.',
  },
})

describe('EVE-2C Map place-session boundary', () => {
  test('uses explicit or exact K-pop semantics and fails unknown places closed', () => {
    expect(resolveMapEventPlaceSemantics(createPlace())).toMatchObject({
      placeCategoryId: 'broadcast_station',
      capabilityIds: expect.arrayContaining(['work', 'wait']),
      source: 'explicit_place_semantics',
    })
    expect(resolveMapEventPlaceSemantics({ id: 'seoul-mbc-hq' })).toMatchObject({
      placeCategoryId: 'broadcast_station',
      source: 'pack_place_override',
    })
    expect(resolveMapEventPlaceSemantics({ id: 'unknown-place', category: 'unknown' })).toEqual({
      placeCategoryId: 'unknown',
      capabilityIds: [],
      source: 'unknown_fail_closed',
    })
  })

  test('enters and leaves only a coordinate-matched stable place', () => {
    const place = createPlace()
    const session = enterSession(place)
    expect(session).toMatchObject({
      state: MAP_PLACE_SESSION_STATE.INSIDE,
      placeId: place.placeId,
      presence: { relation: 'inside', provenance: 'manual' },
    })
    expect(createMapPlaceSessionCheckpointV1(session)).toMatchObject({
      recordType: 'map_place_session',
      checkpointId: 'map.place_session.entered.v1',
      sessionId: session.sessionId,
    })

    const mismatched = enterMapPlaceSession({
      currentLocation: createCurrentLocation(place, {
        position: { kind: 'canvas', x: 0.9, y: 0.9 },
      }),
      place,
      now: NOW,
    })
    expect(mismatched).toMatchObject({
      ok: false,
      code: MAP_PLACE_SESSION_EVENT_RESULT.PLACE_MISMATCH,
    })

    const left = leaveMapPlaceSession(session, { now: NOW + 1_000 })
    expect(left).toMatchObject({ ok: true, code: 'PLACE_SESSION_LEFT' })
    expect(left.session).toMatchObject({
      state: MAP_PLACE_SESSION_STATE.LEFT,
      leftAt: NOW + 1_000,
      presence: { relation: 'left' },
    })
  })

  test('keeps no-event and invitation evaluation local and explicit', () => {
    const place = createPlace()
    const session = enterSession(place)
    const base = {
      session,
      currentLocation: createCurrentLocation(place),
      place,
      locale: 'en',
    }
    const eligible = evaluateMapPlaceSessionEventInvitation(base)
    expect(eligible).toMatchObject({
      eligible: true,
      reason: 'place_session_event_eligible',
      invitation: {
        eventId: KPOP_REALISM_ARRIVAL_BRIEFING_TEMPLATE_ID,
        tokenCost: 0,
      },
    })
    expect(evaluateMapPlaceSessionEventInvitation({ ...base, moduleEnabled: false })).toMatchObject({
      eligible: false,
      reason: 'module_permission_disabled',
      invitation: null,
    })
    expect(evaluateMapPlaceSessionEventInvitation({ ...base, intensity: 'off' })).toMatchObject({
      eligible: false,
      reason: 'event_intensity_off',
    })
    expect(evaluateMapPlaceSessionEventInvitation({ ...base, cooldownActive: true })).toMatchObject({
      eligible: false,
      reason: 'place_cooldown_active',
    })
    expect(evaluateMapPlaceSessionEventInvitation({ ...base, dailyLimitReached: true })).toMatchObject({
      eligible: false,
      reason: 'place_daily_limit_reached',
    })
    expect(evaluateMapPlaceSessionEventInvitation({ ...base, worldContextFamily: 'fantasy' })).toMatchObject({
      eligible: false,
      reason: 'event_pack_incompatible',
    })
  })

  test('validates the exact choice/outcome pair through the Map owner with no canonical mutation', () => {
    const place = createPlace()
    const session = enterSession(place)
    const instance = materializeForSession(session, place)
    const request = {
      authorization: 'event_runtime_choice',
      eventInstanceId: instance.id,
      sessionId: session.sessionId,
      sessionRevision: session.revision,
      mapPackId: session.mapPackId,
      placeId: session.placeId,
      choiceId: 'review_brief',
      outcomeId: 'brief_reviewed',
    }
    expect(validateMapPlaceSessionEventResolution(request, session)).toEqual({
      ok: true,
      code: MAP_PLACE_SESSION_EVENT_RESULT.VALID,
      canonicalMutation: 'none',
    })
    expect(
      validateMapPlaceSessionEventResolution(
        { ...request, outcomeId: 'equipment_checked' },
        session,
      ),
    ).toMatchObject({ ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.OUTCOME_UNSUPPORTED })
    expect(
      validateMapPlaceSessionEventResolution(
        { ...request, sessionRevision: session.revision + 1 },
        session,
      ),
    ).toMatchObject({ ok: false, code: MAP_PLACE_SESSION_EVENT_RESULT.SOURCE_STALE })

    const resolved = resolveMapPlaceSessionEventInstance({
      instance,
      session,
      choiceId: 'review_brief',
      now: NOW + 2_000,
    })
    expect(resolved).toMatchObject({
      ok: true,
      code: MAP_PLACE_SESSION_EVENT_RESULT.VALID,
      canonicalMutation: 'none',
      choiceId: 'review_brief',
      outcomeId: 'brief_reviewed',
      instance: {
        lifecycle: 'resolved',
        outcome: { requestState: 'validated' },
      },
    })
  })

  test('materializes an ephemeral preview for an ineligible place without changing source semantics', () => {
    const place = {
      ...createPlace({ id: 'quiet-home' }),
      placeCategoryId: 'residence',
      capabilityIds: ['rest'],
    }
    const session = enterSession(place)
    const preview = createMapPlaceSessionEventPreview({
      session,
      mapPack: { id: place.mapPackId, version: 1, coordinateKind: 'canvas' },
      place,
      locale: 'en',
      now: NOW,
    })

    expect(preview.ok).toBe(true)
    expect(preview.instance).toMatchObject({
      lifecycle: 'active',
      source: { recordId: session.sessionId, recordRevision: session.revision },
      place: { placeId: place.placeId, placeCategoryId: 'production_center' },
      text: { source: 'local' },
    })
    expect(session).toMatchObject({
      placeCategoryId: 'residence',
      capabilityIds: ['rest'],
    })

    const resolved = resolveMapPlaceSessionEventInstance({
      instance: preview.instance,
      session,
      choiceId: 'check_equipment',
      now: NOW + 1_000,
    })
    expect(resolved).toMatchObject({
      ok: true,
      instance: {
        lifecycle: 'resolved',
        choices: { selectedId: 'check_equipment', outcomeId: 'equipment_checked' },
      },
    })
  })

  test('registers one Map host and projects geographic plus fictional anchors', () => {
    const registry = createMapEventSurfaceHostRegistry()
    expect(registry.initialErrors).toEqual([])
    expect(registry.list()).toHaveLength(1)
    expect(registry.list()[0]).toMatchObject({
      hostKey: 'map',
      sourceModules: ['map'],
      anchorKinds: expect.arrayContaining([
        'geographic_coordinate',
        'normalized_canvas_coordinate',
      ]),
    })

    const cases = [
      {
        place: createPlace({
          id: 'geo-broadcast-house',
          mapPackId: 'geo-map-v1',
          position: { kind: 'geo', lat: 37.5262, lng: 126.8963 },
        }),
        mapPack: { id: 'geo-map-v1', coordinateKind: 'geo' },
        anchor: { kind: 'geographic_coordinate', latitude: 37.5262, longitude: 126.8963 },
      },
      {
        place: createPlace(),
        mapPack: { id: 'fictional-city-v1', coordinateKind: 'canvas' },
        anchor: { kind: 'normalized_canvas_coordinate', x: 0.42, y: 0.36 },
      },
    ]
    cases.forEach(({ place, mapPack, anchor }, index) => {
      const session = enterSession(place)
      const instance = materializeForSession(session, place, {
        instanceId: `event_instance_anchor_${index}`,
      })
      const surface = projectMapPlaceSessionEventSurface({
        instance,
        sourceRecord: session,
        mapPack,
        place,
      })
      expect(surface).toMatchObject({
        status: 'ready',
        availability: { state: 'available' },
        anchor: { ...anchor, mapPackId: mapPack.id },
      })
      expect(registry.validateProjection('map', surface).ok).toBe(true)
    })
  })

  test('fails stale and off-pack instances closed and clusters available surfaces deterministically', () => {
    const place = createPlace()
    const mapPack = { id: place.mapPackId, coordinateKind: 'canvas' }
    const session = enterSession(place)
    const first = materializeForSession(session, place, { instanceId: 'event_instance_stack_a' })
    const second = materializeForSession(session, place, { instanceId: 'event_instance_stack_b' })
    const firstSurface = projectMapPlaceSessionEventSurface({
      instance: first,
      sourceRecord: session,
      mapPack,
      place,
    })
    const secondSurface = projectMapPlaceSessionEventSurface({
      instance: second,
      sourceRecord: session,
      mapPack,
      place,
    })
    const pins = clusterMapEventSurfacePins([secondSurface, firstSurface], {
      mapPackId: mapPack.id,
    })
    expect(pins).toHaveLength(1)
    expect(pins[0]).toMatchObject({
      source: 'map_event',
      stackCount: 2,
      anchorPosition: place.position,
      position: { kind: 'canvas', x: place.position.x + 0.012, y: place.position.y },
    })
    expect(pins[0].eventSurfaceIds).toEqual(
      [firstSurface.id, secondSurface.id].sort((left, right) => left.localeCompare(right)),
    )

    const staleSession = leaveMapPlaceSession(session, { now: NOW + 1_000 }).session
    const stale = projectMapPlaceSessionEventSurface({
      instance: first,
      sourceRecord: staleSession,
      mapPack,
      place,
    })
    expect(stale).toMatchObject({
      status: 'unavailable',
      availability: { state: 'stale', reason: 'source_stale' },
    })
    expect(clusterMapEventSurfacePins([stale], { mapPackId: mapPack.id })).toEqual([])

    const offPack = structuredClone(first)
    offPack.world.variantPackId = 'unapproved-event-pack'
    expect(
      projectMapPlaceSessionEventSurface({
        instance: offPack,
        sourceRecord: session,
        mapPack,
        place,
      }),
    ).toBeNull()
  })
})

describe('EVE-2C Map Store integration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    setActivePinia(createPinia())
    useSystemStore().setGlobalWorldview(
      'Present-day Seoul with a realistic K-pop production and everyday social setting.',
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('migrates legacy positions conservatively and initializes an empty session', () => {
    const mapPack = getMapPackById('real-seoul-v1')
    const place = mapPack.places.find((item) => item.id === 'seoul-mbc-hq')
    const legacyBase = {
      customMapPacks: [],
      addresses: [],
      currentLocation: {
        source: 'trip_arrived',
        label: place.nameEn,
        detail: place.detailEn,
        mapPackId: mapPack.id,
        position: place.position,
      },
      tripState: {
        status: 'arrived',
        journeyId: 'map_journey_legacy_exact',
        arrivedAt: NOW,
        mapPackId: mapPack.id,
        to: place.detailEn,
        toLabel: place.nameEn,
      },
    }
    const arrived = migrateMapStorage({ version: 2, data: legacyBase })
    expect(arrived.currentLocation).toMatchObject({
      placeId: place.id,
      positionEvidence: {
        provenance: MAP_EVENT_POSITION_PROVENANCE.JOURNEY_ARRIVAL,
        journeyId: 'map_journey_legacy_exact',
        journeyArrivedAt: NOW,
      },
    })
    expect(arrived.placeSession).toEqual(createEmptyMapPlaceSession())

    const unproven = migrateMapStorage({
      version: 2,
      data: {
        ...legacyBase,
        currentLocation: { ...legacyBase.currentLocation, source: 'map_point' },
      },
    })
    expect(unproven.currentLocation.positionEvidence).toMatchObject({
      provenance: MAP_EVENT_POSITION_PROVENANCE.MANUAL,
      journeyId: '',
      journeyArrivedAt: 0,
    })
    const migratedAt = NOW - 5000
    const firstMigration = migrateMapStorage({
      version: 2,
      data: {
        ...legacyBase,
        currentLocation: { ...legacyBase.currentLocation, source: 'map_point' },
      },
      savedAt: migratedAt,
    })
    const secondMigration = migrateMapStorage({
      version: 2,
      data: {
        ...legacyBase,
        currentLocation: { ...legacyBase.currentLocation, source: 'map_point' },
      },
      savedAt: migratedAt,
    })
    expect(firstMigration).toEqual(secondMigration)
    expect(firstMigration.currentLocation.positionEvidence.evidenceAt).toBe(migratedAt)
    expect(migrateMapStorage({ version: 1, data: legacyBase })).toBeNull()
  })

  test('prevents public manual relocation from forging journey-arrival evidence', () => {
    const mapStore = useMapStore()
    const place = mapStore.activeMapPlaces.find((item) => item.placeId === 'seoul-mbc-hq')
    expect(
      mapStore.setCurrentLocation({
        source: 'external_caller',
        label: place.nameEn,
        detail: place.detailEn,
        mapPackId: place.mapPackId,
        placeId: place.placeId,
        position: place.position,
        provenance: MAP_EVENT_POSITION_PROVENANCE.JOURNEY_ARRIVAL,
        evidenceAt: NOW,
        journeyId: 'forged_journey',
        journeyArrivedAt: NOW,
      }),
    ).toBe(true)
    expect(mapStore.currentLocation.positionEvidence).toEqual({
      provenance: MAP_EVENT_POSITION_PROVENANCE.MANUAL,
      placeId: place.placeId,
      evidenceAt: NOW,
      journeyId: '',
      journeyArrivedAt: 0,
    })
    expect(mapStore.enterPlace(place.placeId, { now: NOW })).toMatchObject({
      ok: true,
      session: { presence: { provenance: MAP_EVENT_POSITION_PROVENANCE.MANUAL } },
    })
  })

  test('uses the latest active Book text when checking a place event', () => {
    const systemStore = useSystemStore()
    const bookStore = useBookStore()
    const asset = bookStore.createAsset({
      id: 'map_world_source',
      title: 'Map world',
      content: 'A science fiction city with orbital transit and delivery drones.',
    })
    systemStore.addWorldBookSourceLink({
      assetId: asset.id,
      role: 'main_worldview',
      sourceFingerprint: asset.contentFingerprint,
      ...buildWorldBookSourceSnapshot(asset.content),
    })

    const mapStore = useMapStore()
    const place = mapStore.activeMapPlaces.find((item) => item.placeId === 'seoul-mbc-hq')
    mapStore.setCurrentLocation({
      label: place.nameEn,
      detail: place.detailEn,
      mapPackId: place.mapPackId,
      placeId: place.placeId,
      position: place.position,
    })
    expect(mapStore.enterPlace(place.placeId, { now: NOW }).ok).toBe(true)
    expect(mapStore.getPlaceSessionEventInvitation({ locale: 'en', at: NOW })).toMatchObject({
      eligible: false,
      reason: 'event_pack_incompatible',
    })

    expect(
      bookStore.updateAsset(asset.id, {
        content: 'Present-day Seoul with realistic K-pop production and everyday city life.',
      }),
    ).toMatchObject({ ok: true })
    expect(mapStore.getPlaceSessionEventInvitation({ locale: 'en', at: NOW })).toMatchObject({
      eligible: true,
      reason: 'place_session_event_eligible',
    })
  })

  test('records journey-arrival provenance only after an exact completed Map Journey', () => {
    const mapStore = useMapStore()
    const destination = mapStore.activeMapPlaces.find(
      (item) => item.placeId === 'seoul-mbc-hq',
    )
    mapStore.setTripEndpoint('to', destination.detailEn)
    expect(mapStore.setTripTransportMode('walk').ok).toBe(true)
    const started = mapStore.startTrip()
    expect(started.ok).toBe(true)
    expect(mapStore.tripState.destinationPlaceId).toBe(destination.placeId)

    vi.advanceTimersByTime(started.durationSeconds * 1_000 + 1_000)

    expect(mapStore.currentLocation).toMatchObject({
      source: 'trip_arrived',
      placeId: destination.placeId,
      positionEvidence: {
        provenance: MAP_EVENT_POSITION_PROVENANCE.JOURNEY_ARRIVAL,
        placeId: destination.placeId,
        journeyId: started.journeyId,
      },
    })
    expect(mapStore.currentLocation.positionEvidence.journeyArrivedAt).toBeGreaterThan(0)
    expect(mapStore.enterPlace(destination.placeId)).toMatchObject({
      ok: true,
      session: { presence: { provenance: MAP_EVENT_POSITION_PROVENANCE.JOURNEY_ARRIVAL } },
    })
  })

  test('materializes only after expansion, resolves one allowlisted choice, and persists no projection', () => {
    const mapStore = useMapStore()
    const simulationStore = useSimulationStore()
    const place = mapStore.activeMapPlaces.find((item) => item.placeId === 'seoul-mbc-hq')
    mapStore.setCurrentLocation({
      label: place.nameEn,
      detail: place.detailEn,
      mapPackId: place.mapPackId,
      placeId: place.placeId,
      position: place.position,
    })
    expect(mapStore.enterPlace(place.placeId, { now: NOW }).ok).toBe(true)

    const invitation = mapStore.getPlaceSessionEventInvitation({ locale: 'en', at: NOW })
    expect(invitation.reason).toBe('place_session_event_eligible')
    expect(invitation).toMatchObject({
      eligible: true,
      invitation: { tokenCost: 0 },
    })
    expect(simulationStore.eventInstances).toEqual([])
    expect(mapStore.mapEventSurfaces).toEqual([])

    const beforeOutcome = {
      location: clonePlain(mapStore.currentLocation),
      tripState: clonePlain(mapStore.tripState),
      tripHistory: clonePlain(mapStore.tripHistory),
    }
    const expanded = mapStore.expandPlaceSessionEvent({ locale: 'en', now: NOW })
    expect(expanded).toMatchObject({
      ok: true,
      code: 'EVENT_INSTANCE_ENTERED',
      composePromise: null,
      instance: {
        lifecycle: 'active',
        text: { status: 'local_only', source: 'local' },
        choices: {
          allowedIds: ['review_brief', 'check_equipment', 'wait_for_staff'],
        },
      },
    })
    expect(simulationStore.eventInstances).toHaveLength(1)
    expect(mapStore.mapEventSurfaces).toHaveLength(1)
    expect(mapStore.mapEventSurfacePins).toHaveLength(1)

    const resolved = mapStore.resolvePlaceSessionEventChoice(
      expanded.instance.id,
      'review_brief',
      { now: NOW + 1_000 },
    )
    expect(resolved).toMatchObject({
      ok: true,
      code: MAP_PLACE_SESSION_EVENT_RESULT.VALID,
      canonicalMutation: 'none',
      instance: {
        lifecycle: 'resolved',
        choices: { selectedId: 'review_brief', outcomeId: 'brief_reviewed' },
      },
    })
    expect(mapStore.currentLocation).toEqual(beforeOutcome.location)
    expect(mapStore.tripState).toEqual(beforeOutcome.tripState)
    expect(mapStore.tripHistory).toEqual(beforeOutcome.tripHistory)

    const snapshot = mapStore.createBackupSnapshot()
    expect(Object.hasOwn(snapshot, 'mapEventSurfaces')).toBe(false)
    expect(Object.hasOwn(snapshot, 'mapEventSurfacePins')).toBe(false)
    expect(Object.hasOwn(snapshot, 'eventInstances')).toBe(false)
    expect(snapshot.placeSession).toMatchObject({ state: 'inside', placeId: place.placeId })

    expect(mapStore.leavePlace({ now: NOW + 2_000 }).ok).toBe(true)
    expect(mapStore.enterPlace(place.placeId, { now: NOW + 3_000 }).ok).toBe(true)
    expect(mapStore.getPlaceSessionEventInvitation({ locale: 'en', at: NOW + 3_000 })).toMatchObject({
      eligible: false,
      reason: 'place_cooldown_active',
      invitation: null,
    })
  })

  test('calls optional text once after explicit expansion and reopens the cached result', async () => {
    const mapStore = useMapStore()
    const simulationStore = useSimulationStore()
    const provider = vi.fn(async () => ({
      text: JSON.stringify(createAiCopy()),
      meta: { providerId: 'fixture-provider', modelId: 'fixture-model', requestId: 'req-1' },
    }))
    simulationStore.setEventTextMode(EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY)
    mapStore.setMapEventTextProviderRunnerForTesting(provider)
    const place = mapStore.activeMapPlaces.find((item) => item.placeId === 'seoul-mbc-hq')
    mapStore.setCurrentLocation({
      label: place.nameEn,
      detail: place.detailEn,
      mapPackId: place.mapPackId,
      placeId: place.placeId,
      position: place.position,
    })
    expect(mapStore.enterPlace(place.placeId, { now: NOW }).ok).toBe(true)

    expect(mapStore.getPlaceSessionEventInvitation({ locale: 'en', at: NOW }).eligible).toBe(true)
    expect(provider).not.toHaveBeenCalled()
    const expanded = mapStore.expandPlaceSessionEvent({ locale: 'en', now: NOW })
    expect(expanded.instance.text.status).toBe('pending')
    expect(provider).toHaveBeenCalledTimes(1)
    await expanded.composePromise

    expect(simulationStore.getEventInstance(expanded.instance.id)).toMatchObject({
      text: {
        status: 'succeeded',
        source: 'ai',
        attemptCount: 1,
        provenance: { providerId: 'fixture-provider', requestId: 'req-1' },
      },
    })
    const reopened = mapStore.expandPlaceSessionEvent({ locale: 'en', now: NOW + 1_000 })
    expect(reopened).toMatchObject({ ok: true, code: 'EVENT_INSTANCE_REOPENED', composePromise: null })
    expect(provider).toHaveBeenCalledTimes(1)
  })

  test('keeps the complete local fallback after one optional provider failure', async () => {
    const mapStore = useMapStore()
    const simulationStore = useSimulationStore()
    const provider = vi.fn(async () => {
      throw new Error('provider unavailable')
    })
    simulationStore.setEventTextMode(EVENT_TEXT_MODE.OPTIONAL_AI_AFTER_ENTRY)
    mapStore.setMapEventTextProviderRunnerForTesting(provider)
    const place = mapStore.activeMapPlaces.find((item) => item.placeId === 'seoul-mbc-hq')
    mapStore.setCurrentLocation({
      label: place.nameEn,
      detail: place.detailEn,
      mapPackId: place.mapPackId,
      placeId: place.placeId,
      position: place.position,
    })
    expect(mapStore.enterPlace(place.placeId, { now: NOW }).ok).toBe(true)
    const expanded = mapStore.expandPlaceSessionEvent({ locale: 'en', now: NOW })
    await expanded.composePromise

    expect(provider).toHaveBeenCalledTimes(1)
    expect(simulationStore.getEventInstance(expanded.instance.id)).toMatchObject({
      text: {
        status: 'fallback',
        source: 'local',
        attemptCount: 1,
        normalizedCopy: {
          choiceLabels: {
            review_brief: expect.any(String),
            check_equipment: expect.any(String),
            wait_for_staff: expect.any(String),
          },
        },
      },
    })
    mapStore.expandPlaceSessionEvent({ locale: 'en', now: NOW + 1_000 })
    expect(provider).toHaveBeenCalledTimes(1)
  })
})
