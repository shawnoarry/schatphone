import { describe, expect, test } from 'vitest'
import { buildRoleIdentityProjection } from '../src/lib/role-identity-projection'

const createProfile = (overrides = {}) => ({
  id: 10,
  name: 'Mina',
  role: 'idol',
  bio: 'Warm and precise',
  entityType: 'main_role',
  profileValues: [{ fieldId: 'favorite_drink', value: 'Jasmine tea' }],
  detailItems: [],
  ...overrides,
})

describe('role identity projection Module', () => {
  test('projects the bound Contacts profile as one stable identity snapshot', () => {
    const projection = buildRoleIdentityProjection({
      contact: { id: 1, kind: 'role', name: 'Stale name', role: 'stale role' },
      profile: createProfile({
        relationshipLabelText: 'childhood friend',
        relationshipLabelNote: 'Grew up together',
      }),
      profileTemplates: [
        {
          id: 'idol_profile',
          fields: [{ id: 'favorite_drink', label: 'Favorite drink' }],
        },
      ],
    })

    expect(projection.roleBound).toBe(true)
    expect(projection.identity).toEqual({
      name: 'Mina',
      role: 'idol',
      entityType: 'main_role',
    })
    expect(projection.stableText).toContain('Your role: Mina (idol)')
    expect(projection.stableText).toContain('Role persona: Warm and precise.')
    expect(projection.stableText).toContain('Favorite drink: Jasmine tea')
    expect(projection.stableText).toContain('Relationship premise: childhood friend.')
    expect(projection.stableText).not.toContain('Stale name')
  })

  test('keeps recalled event continuity dynamic while manual facts remain stable', () => {
    const projection = buildRoleIdentityProjection({
      contact: { id: 1, kind: 'role', name: 'Mina' },
      profile: createProfile({
        detailItems: [
          {
            id: 'manual-tea',
            section: 'preferences',
            sourceKind: 'manual',
            title: 'Tea',
            detail: 'Likes jasmine tea.',
          },
          {
            id: 'event-ribbon',
            section: 'lifePattern',
            sourceKind: 'event_attached',
            title: 'Ribbon',
            detail: 'Kept the ribbon.',
            memoryKey: 'birthday_gift',
          },
        ],
      }),
      recalledMemories: [{ memoryKey: 'birthday_gift', recallText: 'Birthday necklace.' }],
    })

    expect(projection.stableText).toContain('Tea: Likes jasmine tea.')
    expect(projection.stableText).not.toContain('Kept the ribbon.')
    expect(projection.dynamicText).toContain('Ribbon: Kept the ribbon.')
  })

  test('rejects non-role contacts and stale Self Profile bindings', () => {
    expect(
      buildRoleIdentityProjection({
        contact: { id: 9, kind: 'service', profileId: 10 },
        profile: createProfile(),
      }).roleBound,
    ).toBe(false)
    expect(
      buildRoleIdentityProjection({
        contact: { id: 9, kind: 'role', profileId: 10 },
        profile: createProfile({ entityType: 'self_profile' }),
      }).roleBound,
    ).toBe(false)
  })

  test('does not mutate source records and reports bounded omissions', () => {
    const profile = createProfile({
      profileValues: [
        { fieldId: 'first', value: 'one' },
        { fieldId: 'second', value: 'two' },
      ],
    })
    const original = structuredClone(profile)
    const projection = buildRoleIdentityProjection({
      contact: { id: 1, kind: 'role' },
      profile,
      profileValueLimit: 1,
    })

    expect(projection.omittedCounts.profileValues).toBe(1)
    expect(profile).toEqual(original)
    expect(Object.isFrozen(projection)).toBe(true)
  })
})
