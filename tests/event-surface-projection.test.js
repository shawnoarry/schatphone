import { describe, expect, test } from 'vitest'
import {
  EVENT_SURFACE_ACTION_KIND,
  EVENT_SURFACE_ANCHOR_KIND,
  EVENT_SURFACE_EXPANSION_KIND,
  EVENT_SURFACE_STATE,
  EVENT_SURFACE_UNAVAILABLE_REASON,
  normalizeEventSurfaceAnchor,
  normalizeEventSurfaceProjection,
  projectChatSocialEventSurface,
  projectMapJourneyEventSurface,
} from '../src/lib/simulation/event-surface-projection'
import {
  EVENT_SURFACE_HOST_ERROR,
  createEventSurfaceHostRegistry,
} from '../src/lib/simulation/event-surface-host-registry'

const buildMapProposal = (overrides = {}) => ({
  id: 'map_journey_event_journey_1_en_route',
  eventId: 'map.journey.route_condition.v1',
  status: 'pending_review',
  journeyId: 'journey_1',
  checkpointId: 'en_route',
  titleZh: '前方通行稍缓',
  titleEn: 'Brief slowdown ahead',
  summaryZh: '可继续行程，或增加两分钟缓冲。',
  summaryEn: 'Continue the journey or add a two-minute buffer.',
  detailZh: '这不是实时导航数据。',
  detailEn: 'This is not live navigation data.',
  allowedOutcomes: ['continue', 'delay'],
  source: {
    journeyId: 'journey_1',
    journeySchemaVersion: 3,
    checkpointId: 'en_route',
    mapPackId: 'real-seoul-v1',
    worldPackId: 'daily-world',
  },
  provenance: {
    runtimeLogId: 'runtime_log_1',
    worldContextId: 'world_context_daily',
  },
  createdAt: 1000,
  reviewedAt: 0,
  appliedAt: 0,
  ...overrides,
})

const buildMapSource = (overrides = {}) => ({
  journeyId: 'journey_1',
  journeySchemaVersion: 3,
  mapPackId: 'real-seoul-v1',
  activeInterruption: {
    proposalId: 'map_journey_event_journey_1_en_route',
  },
  ...overrides,
})

const buildChatProposal = (overrides = {}) => ({
  id: 'chat_social_event_1',
  eventId: 'chat.social.role_block_user.v1',
  eventType: 'role_block_user',
  targetContactId: 42,
  targetProfileId: 9,
  targetName: 'Rin',
  status: 'pending_review',
  risk: 'high',
  reviewMode: 'pending_review',
  reason: 'high_risk_social_change_requires_review',
  explanation: 'World Hub review is required before Chat changes reachability.',
  source: {
    moduleKey: 'chat',
    conversationId: 42,
    runtimeLogId: 'runtime_log_chat_1',
  },
  createdAt: 2000,
  reviewedAt: 0,
  appliedAt: 0,
  ...overrides,
})

const buildGenericProjection = (overrides = {}) => ({
  eventId: 'map.example.v1',
  proposalId: 'proposal_1',
  source: {
    moduleKey: 'map',
    recordType: 'map_journey',
    recordId: 'journey_1',
  },
  status: 'pending',
  availability: { state: 'available', reason: '' },
  risk: 'low',
  review: { state: 'pending', mode: 'source_owner_review' },
  copy: { titleZh: '事件', titleEn: 'Event' },
  anchor: {
    kind: EVENT_SURFACE_ANCHOR_KIND.GEOGRAPHIC,
    mapPackId: 'real-seoul-v1',
    latitude: 37.5665,
    longitude: 126.978,
  },
  expansion: {
    kind: EVENT_SURFACE_EXPANSION_KIND.HOST_DETAIL,
    hostKey: 'map',
    targetId: 'proposal_1',
  },
  actions: [{ id: 'expand', kind: EVENT_SURFACE_ACTION_KIND.OPEN_DETAIL }],
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
})

const buildMapHostRegistration = (overrides = {}) => ({
  hostKey: 'map',
  labelZh: '地图',
  labelEn: 'Map',
  sourceModules: ['map'],
  surfaceStates: ['pending', 'resolved', 'dismissed', 'failed'],
  anchorKinds: ['stable_place', 'geographic_coordinate', 'normalized_canvas_coordinate'],
  expansionKinds: ['host_detail'],
  actionKinds: ['open_detail', 'dismiss_surface', 'request_bounded_outcome'],
  acceptsUnanchored: false,
  acceptsUnavailable: false,
  ...overrides,
})

describe('event surface projection', () => {
  test('normalizes stable-place, geographic, and strict normalized-canvas anchors', () => {
    expect(
      normalizeEventSurfaceAnchor({
        kind: 'stable_place',
        mapPackId: 'real-seoul-v1',
        placeId: 'seoul-station',
      }),
    ).toEqual({
      kind: 'stable_place',
      mapPackId: 'real-seoul-v1',
      placeId: 'seoul-station',
    })
    expect(
      normalizeEventSurfaceAnchor({
        kind: 'geo',
        mapPackId: 'real-seoul-v1',
        lat: 37.5665,
        lng: 126.978,
      }),
    ).toEqual({
      kind: 'geographic_coordinate',
      mapPackId: 'real-seoul-v1',
      latitude: 37.5665,
      longitude: 126.978,
    })
    expect(
      normalizeEventSurfaceAnchor({
        kind: 'canvas',
        mapPackId: 'cyber-wasteland-v1',
        x: 0.25,
        y: 0.75,
      }),
    ).toEqual({
      kind: 'normalized_canvas_coordinate',
      mapPackId: 'cyber-wasteland-v1',
      x: 0.25,
      y: 0.75,
    })
    expect(
      normalizeEventSurfaceAnchor({
        kind: 'canvas',
        mapPackId: 'cyber-wasteland-v1',
        x: 1.01,
        y: 0.5,
      }),
    ).toBeNull()
    expect(
      normalizeEventSurfaceAnchor({
        kind: 'geo',
        mapPackId: 'real-seoul-v1',
        lat: 91,
        lng: 126.978,
      }),
    ).toBeNull()
  })

  test('projects a pending Map Journey proposal with bounded identity, ownership, and requests', () => {
    const proposal = buildMapProposal()
    const sourceRecord = buildMapSource()
    const proposalBefore = structuredClone(proposal)
    const sourceBefore = structuredClone(sourceRecord)
    const runtimeLogs = [
      {
        id: 'runtime_log_1',
        eventId: proposal.eventId,
        targetId: proposal.journeyId,
        status: 'triggered',
        reason: 'eligible_random_passed',
        at: 1000,
      },
    ]
    const input = {
      proposal,
      sourceRecord,
      runtimeLogs,
      anchor: {
        kind: 'geo',
        mapPackId: 'real-seoul-v1',
        lat: 37.5665,
        lng: 126.978,
      },
    }

    const first = projectMapJourneyEventSurface(input)
    const second = projectMapJourneyEventSurface(input)

    expect(first).toEqual(second)
    expect(first).toMatchObject({
      schemaVersion: 1,
      id: 'event_surface:map:map_journey_event_journey_1_en_route',
      eventId: proposal.eventId,
      proposalId: proposal.id,
      source: {
        moduleKey: 'map',
        recordType: 'map_journey',
        recordId: 'journey_1',
        runtimeLogId: 'runtime_log_1',
      },
      ownership: {
        eventTruthOwner: 'event_runtime',
        sourceTruthOwner: 'map',
        effectOwner: 'map',
      },
      status: EVENT_SURFACE_STATE.PENDING,
      availability: { state: 'available', reason: '' },
      risk: 'low',
      review: { state: 'pending', mode: 'source_owner_review' },
      anchor: {
        kind: 'geographic_coordinate',
        mapPackId: 'real-seoul-v1',
        latitude: 37.5665,
        longitude: 126.978,
      },
      expansion: { kind: 'host_detail', hostKey: 'map', targetId: proposal.id },
      outcomeIds: ['continue', 'delay'],
      runtime: { logId: 'runtime_log_1', status: 'triggered' },
    })
    expect(first.actions.map((action) => action.kind)).toEqual([
      'open_detail',
      'dismiss_surface',
      'request_bounded_outcome',
      'request_bounded_outcome',
    ])
    expect(first.actions.every((action) => !('payload' in action) && !('callback' in action))).toBe(
      true,
    )
    expect(proposal).toEqual(proposalBefore)
    expect(sourceRecord).toEqual(sourceBefore)
  })

  test('fails closed when a Map source reference is missing or stale', () => {
    const missing = projectMapJourneyEventSurface({
      proposal: buildMapProposal(),
      sourceRecord: null,
      anchor: {
        kind: 'geo',
        mapPackId: 'real-seoul-v1',
        lat: 37.5,
        lng: 127,
      },
    })
    const mismatched = projectMapJourneyEventSurface({
      proposal: buildMapProposal(),
      sourceRecord: buildMapSource({ journeyId: 'journey_2' }),
    })
    const mismatchedCheckpoint = projectMapJourneyEventSurface({
      proposal: buildMapProposal({
        source: {
          ...buildMapProposal().source,
          checkpointId: 'near_arrival',
        },
      }),
      sourceRecord: buildMapSource(),
    })

    ;[missing, mismatched, mismatchedCheckpoint].forEach((surface) => {
      expect(surface).toMatchObject({
        status: EVENT_SURFACE_STATE.UNAVAILABLE,
        availability: {
          state: 'stale',
          reason: EVENT_SURFACE_UNAVAILABLE_REASON.SOURCE_STALE,
        },
        anchor: null,
        expansion: null,
        actions: [],
      })
    })
  })

  test('fails closed instead of clamping an invalid anchor or leaking an unknown action', () => {
    const invalidAnchor = normalizeEventSurfaceProjection(
      buildGenericProjection({
        anchor: {
          kind: 'canvas',
          mapPackId: 'cyber-wasteland-v1',
          x: -0.2,
          y: 0.4,
        },
      }),
    )
    const unknownAction = normalizeEventSurfaceProjection(
      buildGenericProjection({
        actions: [
          { kind: 'open_detail' },
          { kind: 'execute_adapter', payload: { effect: 'mutate' } },
        ],
      }),
    )
    const unboundOutcome = normalizeEventSurfaceProjection(
      buildGenericProjection({
        outcomeIds: ['continue'],
        actions: [{ kind: 'request_bounded_outcome', outcomeId: 'teleport' }],
      }),
    )
    const unknownAvailability = normalizeEventSurfaceProjection(
      buildGenericProjection({ availability: { state: 'probably_available' } }),
    )

    expect(invalidAnchor).toMatchObject({
      status: 'unavailable',
      availability: { reason: EVENT_SURFACE_UNAVAILABLE_REASON.ANCHOR_INVALID },
      anchor: null,
      actions: [],
    })
    expect(unknownAction).toMatchObject({
      status: 'unavailable',
      availability: { reason: EVENT_SURFACE_UNAVAILABLE_REASON.ACTION_UNKNOWN },
      actions: [],
    })
    expect(unboundOutcome).toMatchObject({
      status: 'unavailable',
      availability: { reason: EVENT_SURFACE_UNAVAILABLE_REASON.ACTION_OUTCOME_UNBOUND },
      actions: [],
    })
    expect(unknownAvailability).toMatchObject({
      status: 'unavailable',
      availability: { reason: EVENT_SURFACE_UNAVAILABLE_REASON.SOURCE_STALE },
      actions: [],
    })
  })

  test('projects Chat social review state without carrying mutation authority', () => {
    const proposal = buildChatProposal()
    const surface = projectChatSocialEventSurface({
      proposal,
      sourceRecord: { id: 42, profileId: 9 },
      runtimeLogs: [
        {
          id: 'runtime_log_chat_1',
          eventId: proposal.eventId,
          targetId: '42',
          status: 'skipped',
          reason: proposal.reason,
          at: 2000,
        },
      ],
    })

    expect(surface).toMatchObject({
      source: { moduleKey: 'chat', recordType: 'chat_contact', recordId: '42' },
      status: 'pending',
      risk: 'high',
      review: {
        state: 'pending',
        mode: 'pending_review',
        reason: proposal.reason,
      },
      expansion: { kind: 'world_hub', targetId: proposal.id },
      participants: [
        { kind: 'chat_contact', id: '42', label: 'Rin' },
        { kind: 'role_profile', id: '9', label: 'Rin' },
      ],
    })
    expect(surface.copy.titleEn).toBe('Role block request: Rin')
    expect(surface.actions).toEqual([
      {
        id: 'open_world_hub',
        kind: 'open_world_hub',
        labelZh: '在世界中枢查看',
        labelEn: 'Open in World Hub',
      },
      {
        id: 'dismiss',
        kind: 'dismiss_surface',
        labelZh: '忽略',
        labelEn: 'Dismiss',
      },
    ])
    expect(JSON.stringify(surface)).not.toContain('requestedChatSocialState')
    expect(JSON.stringify(surface)).not.toContain('adapterKey')
  })
})

describe('event surface host registry', () => {
  test('starts empty so defining capabilities cannot activate a host', () => {
    const registry = createEventSurfaceHostRegistry()

    expect(registry.list()).toEqual([])
    expect(registry.get('map')).toBeNull()
    expect(registry.validateProjection('map', buildGenericProjection())).toMatchObject({
      ok: false,
      projection: null,
      errors: [{ code: EVENT_SURFACE_HOST_ERROR.NOT_REGISTERED, path: 'hostKey' }],
    })
  })

  test('normalizes explicit capabilities, strips executable fields, and clones returned state', () => {
    const registry = createEventSurfaceHostRegistry()
    registry.register({
      ...buildMapHostRegistration(),
      hostKey: 'Map',
      sourceModules: ['map', 'map'],
      actionKinds: ['request_bounded_outcome', 'open_detail', 'unknown'],
      render: () => 'must not escape',
    })
    registry.register({
      hostKey: 'world_hub',
      sourceModules: ['chat'],
      surfaceStates: ['pending', 'unavailable'],
      expansionKinds: ['world_hub'],
      actionKinds: ['open_world_hub'],
      acceptsUnanchored: true,
      acceptsUnavailable: true,
    })

    expect(registry.list().map((item) => item.hostKey)).toEqual(['map', 'world_hub'])
    expect(registry.get('map')).toMatchObject({
      hostKey: 'map',
      sourceModules: ['map'],
      actionKinds: ['open_detail', 'request_bounded_outcome'],
    })
    expect(registry.get('map').render).toBeUndefined()
    const entry = registry.get('map')
    entry.sourceModules.push('chat')
    expect(registry.get('map').sourceModules).toEqual(['map'])
  })

  test('rejects invalid and duplicate registrations with stable errors', () => {
    const registry = createEventSurfaceHostRegistry([buildMapHostRegistration()])

    expect(registry.register(buildMapHostRegistration())).toMatchObject({
      ok: false,
      errors: [{ code: EVENT_SURFACE_HOST_ERROR.DUPLICATE, path: 'hostKey' }],
    })
    expect(
      registry.register({
        hostKey: 'unsafe',
        sourceModules: [],
        surfaceStates: ['invented'],
        expansionKinds: ['invented'],
      }),
    ).toMatchObject({
      ok: false,
      errors: expect.arrayContaining([
        { code: EVENT_SURFACE_HOST_ERROR.INVALID, path: 'sourceModules' },
        { code: EVENT_SURFACE_HOST_ERROR.INVALID, path: 'surfaceStates' },
        { code: EVENT_SURFACE_HOST_ERROR.INVALID, path: 'expansionKinds' },
      ]),
    })
  })

  test('admits only projections within every registered host capability', () => {
    const registry = createEventSurfaceHostRegistry([buildMapHostRegistration()])
    const projection = normalizeEventSurfaceProjection(buildGenericProjection())

    expect(registry.validateProjection('map', projection)).toMatchObject({
      ok: true,
      projection: { source: { moduleKey: 'map' }, status: 'pending' },
      registration: { hostKey: 'map' },
      errors: [],
    })

    expect(
      registry.validateProjection(
        'map',
        normalizeEventSurfaceProjection(
          buildGenericProjection({
            source: {
              moduleKey: 'chat',
              recordType: 'chat_contact',
              recordId: '42',
            },
          }),
        ),
      ),
    ).toMatchObject({
      ok: false,
      projection: null,
      errors: expect.arrayContaining([
        { code: EVENT_SURFACE_HOST_ERROR.SOURCE_UNSUPPORTED, path: 'source.moduleKey' },
      ]),
    })

    expect(
      registry.validateProjection(
        'map',
        normalizeEventSurfaceProjection(
          buildGenericProjection({
            actions: [{ kind: 'open_world_hub' }],
          }),
        ),
      ),
    ).toMatchObject({
      ok: false,
      projection: null,
      errors: [
        { code: EVENT_SURFACE_HOST_ERROR.ACTION_UNSUPPORTED, path: 'actions.0.kind' },
      ],
    })

    expect(
      registry.validateProjection(
        'map',
        normalizeEventSurfaceProjection(
          buildGenericProjection({
            expansion: {
              kind: EVENT_SURFACE_EXPANSION_KIND.HOST_DETAIL,
              hostKey: 'food_delivery',
              targetId: 'proposal_1',
            },
          }),
        ),
      ),
    ).toMatchObject({
      ok: false,
      projection: null,
      errors: [
        {
          code: EVENT_SURFACE_HOST_ERROR.EXPANSION_HOST_MISMATCH,
          path: 'expansion.hostKey',
        },
      ],
    })
  })

  test('rejects unavailable, unanchored, and unsupported-anchor projections for Map', () => {
    const registry = createEventSurfaceHostRegistry([buildMapHostRegistration()])
    const unavailable = normalizeEventSurfaceProjection(
      buildGenericProjection({
        anchor: { kind: 'geo', mapPackId: 'real-seoul-v1', lat: 100, lng: 0 },
      }),
    )
    const unanchored = normalizeEventSurfaceProjection(buildGenericProjection({ anchor: null }))
    const stablePlace = normalizeEventSurfaceProjection(
      buildGenericProjection({
        anchor: {
          kind: 'stable_place',
          mapPackId: 'real-seoul-v1',
          placeId: 'seoul-station',
        },
      }),
    )
    const geoOnlyRegistry = createEventSurfaceHostRegistry([
      buildMapHostRegistration({ anchorKinds: ['geographic_coordinate'] }),
    ])

    expect(registry.validateProjection('map', unavailable)).toMatchObject({
      ok: false,
      projection: null,
      errors: expect.arrayContaining([
        { code: EVENT_SURFACE_HOST_ERROR.PROJECTION_UNAVAILABLE, path: 'status' },
      ]),
    })
    expect(registry.validateProjection('map', unanchored)).toMatchObject({
      ok: false,
      projection: null,
      errors: expect.arrayContaining([
        { code: EVENT_SURFACE_HOST_ERROR.UNANCHORED_UNSUPPORTED, path: 'anchor' },
      ]),
    })
    expect(geoOnlyRegistry.validateProjection('map', stablePlace)).toMatchObject({
      ok: false,
      projection: null,
      errors: [
        { code: EVENT_SURFACE_HOST_ERROR.ANCHOR_UNSUPPORTED, path: 'anchor.kind' },
      ],
    })
  })
})
