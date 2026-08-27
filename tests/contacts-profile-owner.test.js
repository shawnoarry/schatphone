import { describe, expect, test } from 'vitest'
import {
  CONTACTS_PROFILE_OWNER_CODES,
  createContactsProfileOwner,
} from '../src/lib/contacts-profile-owner'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/profile-template-schema'

const FIXED_NOW = 1_787_788_800_000

const createOwner = (initialProfiles = []) => {
  const profiles = []
  const owner = createContactsProfileOwner({ profiles, now: () => FIXED_NOW })
  const replacement = owner.replaceAllProfiles(initialProfiles)
  expect(replacement.ok).toBe(true)
  return { owner, profiles }
}

const createProfile = (overrides = {}) => ({
  id: 10,
  roleId: '10',
  name: 'Profile 10',
  entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
  revision: 3,
  templateLink: {
    primaryWorldId: 'world_a',
    profileTemplateId: 'template_a',
    profileTemplateVersion: 2,
  },
  profileValues: [{ fieldId: 'occupation', value: 'Manager' }],
  profileExtensions: {
    categories: [{ id: 'private_story', label: 'Private story', order: 0 }],
    fields: [
      {
        id: 'profile_field_private_story',
        categoryId: 'private_story',
        label: 'Private story note',
        type: 'long_text',
      },
    ],
  },
  ...overrides,
})

describe('Contacts Profile Owner', () => {
  test('owns normalized creation while returning immutable read snapshots', () => {
    const { owner, profiles } = createOwner()

    const receipt = owner.createProfile({
      roleId: '21',
      name: 'My profile',
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
      isMain: true,
      profileValues: [{ fieldId: 'occupation', value: 'Producer' }],
    })

    expect(receipt).toMatchObject({
      ok: true,
      code: CONTACTS_PROFILE_OWNER_CODES.PROFILE_CREATED,
      previousRevision: 0,
      revision: 1,
      profile: {
        entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
        isMain: false,
      },
    })
    expect(profiles).toHaveLength(1)
    expect(Object.isFrozen(receipt.profile)).toBe(true)
    expect(Object.isFrozen(receipt.profile.profileValues)).toBe(true)
    expect(receipt.profile.profileExtensions).toEqual({ categories: [], fields: [] })
  })

  test('normalizes legacy profiles to empty person extensions and round-trips new extensions', () => {
    const { owner, profiles } = createOwner([
      createProfile({ profileExtensions: undefined }),
    ])

    expect(profiles[0].profileExtensions).toEqual({ categories: [], fields: [] })

    const receipt = owner.reviseProfile(10, {
      profileExtensions: {
        categories: [{ id: 'private_story', label: 'Private story', order: 0 }],
        fields: [
          {
            id: 'profile_field_private_story',
            categoryId: 'private_story',
            label: 'Private story note',
            type: 'long_text',
          },
        ],
      },
    })

    expect(receipt.ok).toBe(true)
    expect(profiles[0].profileExtensions).toEqual({
      categories: [
        expect.objectContaining({ id: 'private_story', label: 'Private story' }),
      ],
      fields: [
        expect.objectContaining({
          id: 'profile_field_private_story',
          categoryId: 'private_story',
          label: 'Private story note',
          type: 'long_text',
        }),
      ],
    })
  })

  test('rejects stale writes without changing the live profile', () => {
    const { owner, profiles } = createOwner([createProfile()])
    const before = structuredClone(profiles[0])

    const receipt = owner.reviseProfile(
      10,
      { bio: 'This must not overwrite newer data.' },
      { expectedRevision: 2 },
    )

    expect(receipt).toMatchObject({
      ok: false,
      code: CONTACTS_PROFILE_OWNER_CODES.STALE_REVISION,
      profileId: 10,
      revision: 3,
    })
    expect(profiles[0]).toEqual(before)
  })

  test('rejects duplicate numeric IDs atomically during snapshot replacement', () => {
    const { owner, profiles } = createOwner([createProfile()])
    const before = structuredClone(profiles)

    const receipt = owner.replaceAllProfiles([
      createProfile({ name: 'First' }),
      createProfile({ name: 'Duplicate', roleId: '11' }),
    ])

    expect(receipt).toMatchObject({
      ok: false,
      code: CONTACTS_PROFILE_OWNER_CODES.DUPLICATE_PROFILE_ID,
      duplicateProfileIds: [10],
    })
    expect(profiles).toEqual(before)
  })

  test('treats entityType as canonical for contradictory legacy isMain values', () => {
    const { profiles } = createOwner([
      createProfile({
        entityType: CONTACTS_ENTITY_TYPES.NPC,
        isMain: true,
      }),
    ])

    expect(profiles[0]).toMatchObject({
      entityType: CONTACTS_ENTITY_TYPES.NPC,
      isMain: false,
    })
  })

  test('keeps supporting role canonical when legacy isMain input is false or contradictory', () => {
    const { owner, profiles } = createOwner([
      createProfile({
        entityType: CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
        isMain: true,
      }),
    ])

    expect(profiles[0]).toMatchObject({
      entityType: CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
      isMain: false,
    })

    const receipt = owner.reviseProfile(10, { isMain: false })
    expect(receipt.ok).toBe(true)
    expect(profiles[0]).toMatchObject({
      entityType: CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
      isMain: false,
    })
  })

  test('upgrades an NPC without replacing identity, template data, or profile values', () => {
    const { owner, profiles } = createOwner([
      createProfile({
        entityType: CONTACTS_ENTITY_TYPES.NPC,
        isMain: false,
      }),
    ])
    const originalTemplateLink = structuredClone(profiles[0].templateLink)
    const originalValues = structuredClone(profiles[0].profileValues)

    const receipt = owner.upgradeNpcToMainRole(10, { relationshipMode: 'lightweight' })

    expect(receipt).toMatchObject({
      ok: true,
      profileId: 10,
      previousRevision: 3,
      revision: 4,
      profile: {
        roleId: '10',
        entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      },
    })
    expect(profiles[0].templateLink).toEqual(originalTemplateLink)
    expect(profiles[0].profileValues).toEqual(originalValues)
  })

  test('upgrades NPC to supporting role and then main role without replacing identity', () => {
    const { owner, profiles } = createOwner([
      createProfile({
        entityType: CONTACTS_ENTITY_TYPES.NPC,
        isMain: false,
      }),
    ])
    const originalTemplateLink = structuredClone(profiles[0].templateLink)
    const originalValues = structuredClone(profiles[0].profileValues)

    const supporting = owner.upgradeNpcToSupportingRole(10, { role: 'Recurring classmate' })

    expect(supporting).toMatchObject({
      ok: true,
      profileId: 10,
      revision: 4,
      profile: {
        entityType: CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
        isMain: false,
        role: 'Recurring classmate',
        capabilities: {
          canUseFullRelationshipProgress: false,
          canUseMemoryGroups: true,
          canUseRouteProgression: false,
        },
      },
    })

    const main = owner.upgradeSupportingRoleToMainRole(
      10,
      { relationshipMode: 'lightweight' },
      { expectedRevision: 4 },
    )

    expect(main).toMatchObject({
      ok: true,
      profileId: 10,
      revision: 5,
      profile: {
        entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
        isMain: true,
        capabilities: {
          canUseFullRelationshipProgress: false,
          canUseMemoryGroups: false,
          canUseRouteProgression: false,
        },
      },
    })
    expect(profiles[0].templateLink).toEqual(originalTemplateLink)
    expect(profiles[0].profileValues).toEqual(originalValues)
  })

  test('preserves the current max-plus-one ID allocator and rejects role ID conflicts', () => {
    const { owner } = createOwner([
      createProfile({ id: 4, roleId: '4' }),
      createProfile({ id: 9, roleId: '9' }),
    ])

    const conflict = owner.createProfile({ roleId: '4', name: 'Conflict' })
    const created = owner.createProfile({ roleId: '10', name: 'Next' })

    expect(conflict.code).toBe(CONTACTS_PROFILE_OWNER_CODES.ROLE_ID_CONFLICT)
    expect(created).toMatchObject({ ok: true, profileId: 10 })
  })

  test('creates persistence copies that cannot mutate owner state', () => {
    const { owner, profiles } = createOwner([createProfile()])
    const snapshot = owner.createPersistenceSnapshot()

    snapshot[0].name = 'Changed copy'
    snapshot[0].profileValues[0].value = 'Changed copy value'
    snapshot[0].profileExtensions.categories[0].label = 'Changed category copy'
    snapshot[0].profileExtensions.fields[0].label = 'Changed field copy'

    expect(profiles[0].name).toBe('Profile 10')
    expect(profiles[0].profileValues[0].value).toBe('Manager')
    expect(profiles[0].profileExtensions.categories[0].label).toBe('Private story')
    expect(profiles[0].profileExtensions.fields[0].label).toBe('Private story note')
  })
})
