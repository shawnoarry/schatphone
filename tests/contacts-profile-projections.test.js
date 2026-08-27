import { describe, expect, test } from 'vitest'
import { createContactsProfileOwner } from '../src/lib/contacts-profile-owner'
import {
  projectContactsProfileReference,
  selectContactsSelfProfileReferenceForWorld,
} from '../src/lib/contacts-profile-projections'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/profile-template-schema'

const createSelfProfile = (id, worldId = '') => ({
  id,
  roleId: String(id),
  name: `Self ${id}`,
  role: 'Manager',
  entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
  revision: id,
  templateLink: {
    primaryWorldId: worldId,
    profileTemplateId: worldId ? `template_${worldId}` : '',
    profileTemplateVersion: worldId ? 2 : 0,
  },
  profileValues: [{ fieldId: 'private_note', value: 'Must not enter a reference.' }],
})

const createOwner = (profiles) => {
  const carrier = []
  const owner = createContactsProfileOwner({ carrier, profiles: carrier })
  expect(owner.replaceAllProfiles(profiles).ok).toBe(true)
  return owner
}

describe('Contacts profile projections', () => {
  test('projects a small immutable reference without copying private profile values', () => {
    const reference = projectContactsProfileReference(createSelfProfile(7, 'world_a'))

    expect(reference).toEqual({
      profileId: 7,
      roleId: '7',
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
      name: 'Self 7',
      role: 'Manager',
      worldId: 'world_a',
      templateId: 'template_world_a',
      templateVersion: 2,
      revision: 7,
    })
    expect(Object.isFrozen(reference)).toBe(true)
    expect(JSON.stringify(reference)).not.toContain('private_note')
  })

  test('selects the exact world Self Profile instead of relying on array order', () => {
    const owner = createOwner([
      createSelfProfile(1, 'world_b'),
      createSelfProfile(2, 'world_a'),
    ])

    expect(selectContactsSelfProfileReferenceForWorld(owner, 'world_a')).toMatchObject({
      ok: true,
      status: 'found',
      profileRef: { profileId: 2, worldId: 'world_a' },
    })
  })

  test('reports legacy-unscoped, missing, and ambiguous selections explicitly', () => {
    const legacyOwner = createOwner([createSelfProfile(1)])
    const missingOwner = createOwner([])
    const ambiguousOwner = createOwner([
      createSelfProfile(1, 'world_a'),
      createSelfProfile(2, 'world_a'),
    ])

    expect(selectContactsSelfProfileReferenceForWorld(legacyOwner, 'world_a')).toMatchObject({
      ok: true,
      status: 'legacy_unscoped',
      profileRef: { profileId: 1 },
    })
    expect(selectContactsSelfProfileReferenceForWorld(missingOwner, 'world_a')).toMatchObject({
      ok: false,
      status: 'missing',
      profileRef: null,
    })
    expect(selectContactsSelfProfileReferenceForWorld(ambiguousOwner, 'world_a')).toMatchObject({
      ok: false,
      status: 'ambiguous',
      profileIds: [1, 2],
      profileRef: null,
    })
  })
})
