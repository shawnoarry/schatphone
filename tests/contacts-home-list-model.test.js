import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/role-profile-schema'
import {
  buildContactsSearchText,
  normalizeContactsSearchText,
  useContactsHomeListModel,
} from '../src/composables/useContactsHomeListModel'

const t = (zh, en) => en || zh

const profiles = [
  {
    id: 1,
    roleId: 'ME',
    name: 'Me',
    role: 'user',
    bio: 'self archive',
    entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
    profileValues: [{ fieldId: 'alias', value: 'Narrator' }],
  },
  {
    id: 2,
    roleId: 'A02',
    name: 'Ada',
    role: 'Main dancer',
    bio: 'Seoul friend',
    entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    profileValues: [{ fieldId: 'group', value: 'Blue Mars' }],
  },
  {
    id: 3,
    roleId: 'N03',
    name: 'Mira',
    role: 'NPC stylist',
    bio: 'Backstage helper',
    entityType: CONTACTS_ENTITY_TYPES.NPC,
  },
  {
    id: 4,
    roleId: 'A04',
    name: 'Jae',
    role: 'Producer',
    bio: 'Studio contact',
  },
  {
    id: 5,
    roleId: 'S05',
    name: 'Sora',
    role: 'Recurring coordinator',
    bio: 'Supporting contact',
    entityType: CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
  },
]

const createModel = ({
  contactList = profiles,
  query = '',
  archivedQuery = '',
  chatBoundIds = [],
  memoryCounts = {},
  eventCounts = {},
} = {}) =>
  useContactsHomeListModel({
    roleProfiles: ref(contactList),
    contactsSearchQuery: ref(query),
    archivedSearchQuery: ref(archivedQuery),
    t,
    isChatBound: (profile) => chatBoundIds.includes(profile.id),
    getRelationshipSnapshot: (profile) => ({
      totalMemoryCount: Number(memoryCounts[profile.id] || 0),
    }),
    getEventAttachedCount: (profile) => Number(eventCounts[profile.id] || 0),
    formatEntityTypeLabel: (entityType) =>
      entityType === CONTACTS_ENTITY_TYPES.NPC
        ? 'NPC / World Role'
        : entityType === CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE
          ? 'Supporting Role'
          : 'Main Role',
  })

describe('Contacts home list model interface', () => {
  test('keeps archived people out of default groups, search, and recent shortcuts', () => {
    const archived = {
      ...profiles[1],
      lifecycle: { state: 'archived', archivedAt: 1 },
    }
    const model = createModel({
      contactList: [profiles[0], archived, profiles[2]],
      query: 'Ada',
      chatBoundIds: [archived.id],
    })

    expect(model.filteredMainProfiles.value).toEqual([])
    expect(model.recentInteractionContacts.value).toEqual([])
    expect(model.selfProfiles.value.map((item) => item.id)).toEqual([1])
    expect(model.npcRoleProfiles.value.map((item) => item.id)).toEqual([3])
    expect(model.archivedProfiles.value.map((item) => item.id)).toEqual([2])
  })

  test('lists archived people separately and searches their profile data', () => {
    const older = {
      ...profiles[1],
      lifecycle: { state: 'archived', archivedAt: 10 },
    }
    const newer = {
      ...profiles[4],
      lifecycle: { state: 'archived', archivedAt: 20 },
    }
    const model = createModel({
      contactList: [older, newer, profiles[2]],
      archivedQuery: 'blue mars',
    })

    expect(model.archivedProfiles.value.map((item) => item.id)).toEqual([5, 2])
    expect(model.isArchivedSearchActive.value).toBe(true)
    expect(model.filteredArchivedProfiles.value.map((item) => item.id)).toEqual([2])
  })

  test('keeps supporting roles in the existing secondary list until visual regrouping', () => {
    const model = createModel()

    expect(model.selfProfiles.value.map((profile) => profile.id)).toEqual([1])
    expect(model.mainRoleProfiles.value.map((profile) => profile.id)).toEqual([2, 4])
    expect(model.npcRoleProfiles.value.map((profile) => profile.id)).toEqual([3, 5])
  })

  test('normalizes search and matches profile basics, role id, bio, and world field values', () => {
    expect(normalizeContactsSearchText(' Blue Mars ')).toBe('blue mars')
    expect(buildContactsSearchText(profiles[1])).toContain('blue mars')

    const worldFieldModel = createModel({ query: 'blue mars' })
    expect(worldFieldModel.filteredMainProfiles.value.map((profile) => profile.id)).toEqual([2])

    const roleIdModel = createModel({ query: ' n03 ' })
    expect(roleIdModel.isContactsSearchActive.value).toBe(true)
    expect(roleIdModel.filteredNpcProfiles.value.map((profile) => profile.id)).toEqual([3])

    const selfModel = createModel({ query: 'narrator' })
    expect(selfModel.filteredSelfProfiles.value.map((profile) => profile.id)).toEqual([1])
  })

  test('builds recent interactions from chat binding, memory counts, and event-attached details', () => {
    const model = createModel({
      chatBoundIds: [3],
      memoryCounts: { 2: 2, 4: 1 },
      eventCounts: { 4: 6 },
    })

    expect(model.recentInteractionContacts.value.map((item) => item.profile.id)).toEqual([3, 2, 4])
    expect(model.recentInteractionContacts.value.map((item) => item.score)).toEqual([100, 20, 16])
    expect(model.recentInteractionContacts.value.some((item) => item.profile.id === 1)).toBe(false)
  })

  test('returns source labels with chat, memory, event, and entity fallback priority', () => {
    const model = createModel({
      chatBoundIds: [3],
      memoryCounts: { 2: 1 },
      eventCounts: { 4: 2 },
    })

    expect(model.contactRecentSourceLabel(profiles[3])).toBe('Event')
    expect(model.contactRecentSourceLabel(profiles[2])).toBe('Chat')
    expect(model.contactRecentSourceLabel(profiles[1])).toBe('Memory')
    expect(model.contactRecentSourceLabel({ ...profiles[2], id: 99 })).toBe('NPC / World Role')
    expect(model.contactRecentSourceLabel(profiles[4])).toBe('Supporting Role')
  })
})
