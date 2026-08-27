import { describe, expect, test } from 'vitest'
import {
  KPOP_IDENTITY_EVENT_FAMILIES_V1,
  buildKpopPlayerContextSnapshotV1,
  evaluateKpopIdentityEligibilityV1,
} from '../src/lib/simulation/player-context-projection'

const WORLD_ID = 'legacy_single_world'
const TEMPLATE_ID = 'kpop_player_identity_v1'
const CAPTURED_AT = 1786752000000

const createTemplate = (overrides = {}) => ({
  id: TEMPLATE_ID,
  scope: 'world',
  enabled: true,
  version: 3,
  fields: [
    { id: 'occupation', entityTypes: ['self_profile'], purposes: ['event_eligibility'] },
    { id: 'affiliation', entityTypes: ['self_profile'], purposes: ['event_eligibility'] },
    { id: 'public_identity', entityTypes: ['self_profile'], purposes: ['event_eligibility'] },
  ],
  ...overrides,
})

const createSelfProfile = (overrides = {}) => ({
  id: 42,
  revision: 7,
  entityType: 'self_profile',
  name: 'Player',
  role: 'This prose must not authorize an event',
  bio: 'I am a famous idol and manager in free text.',
  capabilities: {
    canAppearInWorldEvents: true,
  },
  templateLink: {
    primaryWorldId: WORLD_ID,
    profileTemplateId: TEMPLATE_ID,
    profileTemplateVersion: 3,
  },
  profileValues: [
    {
      fieldId: 'occupation',
      value: 'Manager',
      visibilityLevel: 'public',
      sourceKind: 'manual',
    },
    {
      fieldId: 'affiliation',
      value: ['Agency Aurora', 'Team Blue'],
      visibilityLevel: 'world_specific',
      sourceKind: 'manual',
    },
    {
      fieldId: 'public_identity',
      value: 'Private citizen',
      visibilityLevel: 'public',
      sourceKind: 'manual',
    },
    {
      fieldId: 'private_note',
      value: 'Never project this value',
      visibilityLevel: 'hidden',
      sourceKind: 'manual',
    },
  ],
  ...overrides,
})

const buildSnapshot = (overrides = {}) => {
  const selfProfile = overrides.selfProfile || createSelfProfile()
  return buildKpopPlayerContextSnapshotV1({
    selfProfile,
    profileTemplate: createTemplate(),
    expectedWorldId: WORLD_ID,
    expectedProfileRevision: selfProfile.revision,
    ownerStateRefs: [],
    capturedAt: CAPTURED_AT,
    ...overrides,
  })
}

describe('Player Context projection V1', () => {
  test('projects only allowlisted structured Self Profile identity and owner references', () => {
    const selfProfile = createSelfProfile()
    const original = structuredClone(selfProfile)
    const result = buildSnapshot({
      selfProfile,
      ownerStateRefs: [
        {
          owner: 'calendar',
          kind: 'confirmed_event',
          id: 'calendar-123',
          revision: 3,
          expectedRevision: 3,
          copiedBody: 'must not survive',
        },
        {
          owner: 'relationship-runtime',
          kind: 'relationship_snapshot',
          id: 'role-456',
          revision: 9,
          expectedRevision: 9,
        },
      ],
    })

    expect(result).toMatchObject({
      ok: true,
      reason: 'projected',
      snapshot: {
        schemaVersion: 1,
        purpose: 'kpop_identity_eligibility_v1',
        selfProfileRef: {
          profileId: '42',
          revision: 7,
          worldId: WORLD_ID,
          templateId: TEMPLATE_ID,
          templateVersion: 3,
        },
        identity: {
          occupationId: 'manager',
          affiliationIds: ['agency_aurora', 'team_blue'],
          publicIdentityMode: 'private_citizen',
        },
        stateRefs: [
          { owner: 'calendar', kind: 'confirmed_event', id: 'calendar-123', revision: 3 },
          {
            owner: 'relationship-runtime',
            kind: 'relationship_snapshot',
            id: 'role-456',
            revision: 9,
          },
        ],
        capturedAt: CAPTURED_AT,
      },
    })
    expect(JSON.stringify(result)).not.toContain('Never project this value')
    expect(JSON.stringify(result)).not.toContain('famous idol')
    expect(JSON.stringify(result)).not.toContain('copiedBody')
    expect(selfProfile).toEqual(original)
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.snapshot.identity.affiliationIds)).toBe(true)
    expect(buildSnapshot({ selfProfile })).toEqual(buildSnapshot({ selfProfile }))
  })

  test('proves manager and public-idol eligibility from structured fields only', () => {
    const manager = buildSnapshot()
    expect(
      evaluateKpopIdentityEligibilityV1({
        snapshot: manager.snapshot,
        eventFamily: KPOP_IDENTITY_EVENT_FAMILIES_V1.MANAGER_INCIDENT,
        expectedWorldId: WORLD_ID,
        expectedProfileRevision: 7,
      }),
    ).toEqual({ eligible: true, reason: 'eligible_manager_identity' })

    const idolProfile = createSelfProfile({
      profileValues: [
        {
          fieldId: 'occupation',
          value: 'Idol',
          visibilityLevel: 'public',
          sourceKind: 'manual',
        },
        {
          fieldId: 'public_identity',
          value: 'Public figure',
          visibilityLevel: 'world_specific',
          sourceKind: 'manual',
        },
      ],
    })
    const idol = buildSnapshot({ selfProfile: idolProfile })
    expect(
      evaluateKpopIdentityEligibilityV1({
        snapshot: idol.snapshot,
        eventFamily: KPOP_IDENTITY_EVENT_FAMILIES_V1.IDOL_PUBLIC_INCIDENT,
        expectedWorldId: WORLD_ID,
        expectedProfileRevision: 7,
      }),
    ).toEqual({ eligible: true, reason: 'eligible_idol_public_identity' })
  })

  test('does not authorize eligibility from free text, hidden fields, or non-manual values', () => {
    const hiddenOccupation = buildSnapshot({
      selfProfile: createSelfProfile({
        profileValues: [
          {
            fieldId: 'occupation',
            value: 'Idol',
            visibilityLevel: 'hidden',
            sourceKind: 'manual',
          },
          {
            fieldId: 'public_identity',
            value: 'Public figure',
            visibilityLevel: 'public',
            sourceKind: 'manual',
          },
        ],
      }),
    })
    expect(hiddenOccupation.snapshot.identity.occupationId).toBe('')
    expect(
      evaluateKpopIdentityEligibilityV1({
        snapshot: hiddenOccupation.snapshot,
        eventFamily: KPOP_IDENTITY_EVENT_FAMILIES_V1.IDOL_PUBLIC_INCIDENT,
        expectedWorldId: WORLD_ID,
        expectedProfileRevision: 7,
      }).eligible,
    ).toBe(false)

    const generatedOccupation = buildSnapshot({
      selfProfile: createSelfProfile({
        profileValues: [
          {
            fieldId: 'occupation',
            value: 'Manager',
            visibilityLevel: 'public',
            sourceKind: 'event_attached',
          },
        ],
      }),
    })
    expect(generatedOccupation.snapshot.identity.occupationId).toBe('')
    expect(
      evaluateKpopIdentityEligibilityV1({
        snapshot: generatedOccupation.snapshot,
        eventFamily: KPOP_IDENTITY_EVENT_FAMILIES_V1.MANAGER_INCIDENT,
        expectedWorldId: WORLD_ID,
        expectedProfileRevision: 7,
      }).eligible,
    ).toBe(false)
  })

  test('fails closed for non-Self profiles, disabled participation, and stale profile evidence', () => {
    expect(
      buildSnapshot({ selfProfile: createSelfProfile({ entityType: 'main_role' }) }),
    ).toMatchObject({ ok: false, reason: 'invalid_self_profile' })
    expect(
      buildSnapshot({
        selfProfile: createSelfProfile({ capabilities: { canAppearInWorldEvents: false } }),
      }),
    ).toMatchObject({ ok: false, reason: 'world_events_disabled' })
    expect(
      buildSnapshot({ expectedProfileRevision: 6 }),
    ).toMatchObject({ ok: false, reason: 'stale_self_profile' })
    expect(
      buildSnapshot({
        selfProfile: createSelfProfile({ revision: undefined }),
        expectedProfileRevision: 1,
      }),
    ).toMatchObject({ ok: false, reason: 'missing_profile_revision' })
  })

  test('fails closed for mismatched worlds, templates, and owner revisions', () => {
    expect(buildSnapshot({ expectedWorldId: 'another_world' })).toMatchObject({
      ok: false,
      reason: 'world_mismatch',
    })
    expect(buildSnapshot({ profileTemplate: createTemplate({ version: 4 }) })).toMatchObject({
      ok: false,
      reason: 'stale_profile_template',
    })
    expect(
      buildSnapshot({
        ownerStateRefs: [
          {
            owner: 'calendar',
            kind: 'confirmed_event',
            id: 'calendar-123',
            revision: 4,
            expectedRevision: 3,
          },
        ],
      }),
    ).toMatchObject({ ok: false, reason: 'stale_owner_ref' })
    expect(
      buildSnapshot({
        ownerStateRefs: [
          {
            owner: 'calendar',
            kind: 'confirmed_event',
            id: 'calendar-123',
            revision: 3,
            expectedRevision: 3,
          },
          {
            owner: 'calendar',
            kind: 'confirmed_event',
            id: 'calendar-123',
            revision: 4,
            expectedRevision: 4,
          },
        ],
      }),
    ).toMatchObject({ ok: false, reason: 'conflicting_owner_ref' })
  })

  test('fails closed when a stable identity field lacks event eligibility purpose', () => {
    expect(buildSnapshot({
      profileTemplate: createTemplate({
        fields: [
          { id: 'occupation', entityTypes: ['self_profile'] },
          { id: 'affiliation', entityTypes: ['self_profile'], purposes: ['event_eligibility'] },
          { id: 'public_identity', entityTypes: ['self_profile'], purposes: ['event_eligibility'] },
        ],
      }),
    })).toMatchObject({ ok: false, reason: 'event_field_purpose_missing' })
  })

  test('rejects stale snapshots during later eligibility checks', () => {
    const result = buildSnapshot()
    expect(
      evaluateKpopIdentityEligibilityV1({
        snapshot: result.snapshot,
        eventFamily: KPOP_IDENTITY_EVENT_FAMILIES_V1.MANAGER_INCIDENT,
        expectedWorldId: WORLD_ID,
        expectedProfileRevision: 8,
      }),
    ).toEqual({ eligible: false, reason: 'stale_self_profile' })
    expect(
      evaluateKpopIdentityEligibilityV1({
        snapshot: result.snapshot,
        eventFamily: KPOP_IDENTITY_EVENT_FAMILIES_V1.MANAGER_INCIDENT,
        expectedWorldId: 'another_world',
        expectedProfileRevision: 7,
      }),
    ).toEqual({ eligible: false, reason: 'world_mismatch' })
  })
})
