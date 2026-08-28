import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { useChatStore } from '../src/stores/chat'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/profile-template-schema'

describe('Contacts profile entity model', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  test('creates self profile without chat-target capabilities', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      roleId: '1000',
      name: 'My profile',
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
      profileValues: [{ fieldId: 'pheromone', value: 'White tea', visibilityLevel: 'familiar' }],
    })

    expect(profile.entityType).toBe(CONTACTS_ENTITY_TYPES.SELF_PROFILE)
    expect(profile.revision).toBe(1)
    expect(profile.capabilities.canAppearInChatDirectory).toBe(false)
    expect(profile.profileValues[0]).toMatchObject({ fieldId: 'pheromone', value: 'White tea' })
  })

  test('increments the persisted profile revision through profile-owned write seams', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      roleId: '1005',
      name: 'Revision profile',
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
    })

    expect(profile.revision).toBe(1)
    expect(store.updateRoleProfile(profile.id, { bio: 'Updated profile copy' })).toBe(true)
    expect(profile.revision).toBe(2)

    store.addRoleDetailItem(profile.id, 'preferences', {
      title: 'Tea',
      detail: 'Likes jasmine tea.',
    })
    expect(profile.revision).toBe(3)

    store.saveNow()
    const persisted = JSON.parse(localStorage.getItem('schatphone:store:chat') || '{}')
    expect(persisted.data.roleProfiles.find((item) => item.id === profile.id)?.revision).toBe(3)
  })

  test('does not bind self profile as a Chat target', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      roleId: '1004',
      name: 'My self profile',
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
    })

    expect(store.bindRoleProfile(profile.id)).toBeNull()
    expect(store.isRoleProfileBound(profile.id)).toBe(false)
  })

  test('creates NPC with lightweight relationship defaults and allows chat binding', () => {
    const store = useChatStore()
    const npc = store.addRoleProfile({
      roleId: '1001',
      name: 'Sect elder',
      entityType: CONTACTS_ENTITY_TYPES.NPC,
    })
    const binding = store.bindRoleProfile(npc.id)

    expect(npc.capabilities.canUseFullRelationshipProgress).toBe(false)
    expect(npc.capabilities.canAppearInChatDirectory).toBe(true)
    expect(binding.profileId).toBe(npc.id)
  })

  test('persists and restores supporting role with stable binding and lightweight memory defaults', () => {
    const store = useChatStore()
    const supporting = store.addRoleProfile({
      roleId: '1006',
      name: 'Recurring stylist',
      entityType: CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
      profileValues: [{ fieldId: 'agency', value: 'Aurora Entertainment' }],
    })
    const binding = store.bindRoleProfile(supporting.id)

    expect(supporting).toMatchObject({
      entityType: CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
      isMain: false,
      capabilities: {
        canAppearInChatDirectory: true,
        canUseFullRelationshipProgress: false,
        canUseMemoryGroups: true,
        canUseRouteProgression: false,
      },
    })
    expect(binding.profileId).toBe(supporting.id)

    const backup = {
      roleProfiles: JSON.parse(JSON.stringify(store.roleProfiles)),
      contacts: JSON.parse(JSON.stringify(store.contacts)),
      conversations: JSON.parse(JSON.stringify(store.conversations)),
      messagesByConversation: JSON.parse(JSON.stringify(store.messagesByConversation)),
    }

    setActivePinia(createPinia())
    const restored = useChatStore()
    expect(restored.restoreFromBackup(backup)).toBe(true)
    expect(restored.getRoleProfileById(supporting.id)).toMatchObject({
      entityType: CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
      isMain: false,
      profileValues: [expect.objectContaining({ fieldId: 'agency' })],
    })
    expect(restored.getContactById(binding.id).profileId).toBe(supporting.id)
  })

  test('archives and restores a role without losing its binding, conversation, or stable IDs', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      roleId: '1010',
      name: 'Archived role',
      entityType: CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE,
    })
    const binding = store.bindRoleProfile(profile.id)
    const message = store.appendMessage(binding.id, { role: 'user', content: 'Keep this history.' })
    const archived = store.archiveRoleProfile(profile.id, {
      expectedRevision: profile.revision,
      note: 'Later',
    })

    expect(archived).toMatchObject({ ok: true, reason: 'profile_archived' })
    expect(store.getRoleProfileById(profile.id)).toMatchObject({
      id: profile.id,
      roleId: '1010',
      lifecycle: { state: 'archived', archiveNote: 'Later' },
    })
    expect(store.getContactById(binding.id).profileId).toBe(profile.id)
    expect(store.getMessagesByContactId(binding.id).some((item) => item.id === message.id)).toBe(true)
    expect(store.canContactSendMessages(store.getContactById(binding.id))).toBe(false)
    expect(store.appendMessage(binding.id, { role: 'assistant', content: 'Blocked.' })).toBeNull()
    expect(
      store.setContactChatSocialState(binding.id, 'contact_blocked'),
    ).toBe(false)
    expect(store.bindRoleProfile(profile.id)).toBeNull()
    expect(store.updateRoleProfile(profile.id, { bio: 'Blocked edit' })).toBe(false)

    const archivedRevision = store.getRoleProfileById(profile.id).revision
    const restored = store.restoreRoleProfile(profile.id, { expectedRevision: archivedRevision })
    expect(restored).toMatchObject({ ok: true, reason: 'profile_restored' })
    expect(store.getRoleProfileById(profile.id)).toMatchObject({
      id: profile.id,
      roleId: '1010',
      lifecycle: { state: 'active' },
    })
    expect(store.canContactSendMessages(store.getContactById(binding.id))).toBe(true)
    expect(store.bindRoleProfile(profile.id).id).toBe(binding.id)

    store.saveNow()
    const persisted = JSON.parse(localStorage.getItem('schatphone:store:chat') || '{}')
    expect(persisted.data.contactsLifecycle).toMatchObject({
      schemaVersion: 1,
      profileIdHighWaterMark: expect.any(Number),
      tombstones: [],
    })
  })

  test('rolls an archive back when persistence fails', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({ roleId: '1011', name: 'Rollback role' })
    const before = JSON.parse(JSON.stringify(profile))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })

    const result = store.archiveRoleProfile(profile.id, { expectedRevision: profile.revision })

    expect(result).toMatchObject({
      ok: false,
      reason: 'persistence_failed',
      rollback: { restored: true },
    })
    expect(store.getRoleProfileById(profile.id)).toEqual(before)
  })

  test('upgrades NPC to main role while preserving values and existing chat binding', () => {
    const store = useChatStore()
    const npc = store.addRoleProfile({
      roleId: '1002',
      name: 'Classmate',
      entityType: CONTACTS_ENTITY_TYPES.NPC,
      profileValues: [{ fieldId: 'club', value: 'Photography club' }],
    })
    const binding = store.bindRoleProfile(npc.id)

    const upgraded = store.upgradeNpcToMainRole(npc.id, {
      relationshipMode: 'lightweight',
      role: 'Main classmate',
      bio: 'A classmate who became important later.',
    })

    expect(upgraded.entityType).toBe(CONTACTS_ENTITY_TYPES.MAIN_ROLE)
    expect(upgraded.profileValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: 'club', value: 'Photography club' }),
      ]),
    )
    expect(upgraded.capabilities.canUseFullRelationshipProgress).toBe(false)
    expect(store.getContactById(binding.id).profileId).toBe(npc.id)
  })

  test('upgrades NPC through supporting role without replacing its Chat binding', () => {
    const store = useChatStore()
    const npc = store.addRoleProfile({
      roleId: '1007',
      name: 'World passerby',
      entityType: CONTACTS_ENTITY_TYPES.NPC,
    })
    const binding = store.bindRoleProfile(npc.id)

    const supporting = store.upgradeNpcToSupportingRole(npc.id)
    expect(supporting.entityType).toBe(CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE)

    const main = store.upgradeSupportingRoleToMainRole(npc.id, {
      relationshipMode: 'full',
    })

    expect(main).toMatchObject({
      id: npc.id,
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      capabilities: {
        canUseFullRelationshipProgress: true,
        canUseMemoryGroups: true,
        canUseRouteProgression: true,
      },
    })
    expect(store.getContactById(binding.id).profileId).toBe(npc.id)
  })

  test('stores one primary world/template context plus supplemental knowledge points', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      roleId: '1003',
      name: 'ABO role',
      templateLink: {
        primaryWorldId: 'world_abo',
        profileTemplateId: 'template_abo',
        profileTemplateVersion: 2,
        supplementalKnowledgePointIds: ['kp_a', 'kp_a', 'bad id'],
      },
    })

    expect(profile.templateLink).toMatchObject({
      primaryWorldId: 'world_abo',
      profileTemplateId: 'template_abo',
      profileTemplateVersion: 2,
      supplementalKnowledgePointIds: ['kp_a'],
    })
  })

  test('persists and restores person-only profile categories and fields with their values', () => {
    const store = useChatStore()
    const profile = store.addRoleProfile({
      roleId: '1008',
      name: 'Private profile extension',
      profileExtensions: {
        categories: [{ id: 'private_story', label: 'Private story' }],
        fields: [
          {
            id: 'private_nickname_rule',
            categoryId: 'private_story',
            label: 'Nickname rule',
            type: 'long_text',
          },
        ],
      },
      profileValues: [
        {
          fieldId: 'private_nickname_rule',
          value: 'Do not use the full name in private.',
          visibilityLevel: 'hidden',
        },
      ],
    })

    store.saveNow()
    const persisted = JSON.parse(localStorage.getItem('schatphone:store:chat') || '{}')
    expect(persisted.data.roleProfiles.find((item) => item.id === profile.id)).toMatchObject({
      profileExtensions: {
        categories: [expect.objectContaining({ id: 'private_story' })],
        fields: [expect.objectContaining({ id: 'private_nickname_rule' })],
      },
      profileValues: [expect.objectContaining({ fieldId: 'private_nickname_rule' })],
    })

    const backup = {
      roleProfiles: persisted.data.roleProfiles,
      contacts: persisted.data.contacts,
      conversations: persisted.data.conversations,
      messagesByConversation: persisted.data.messagesByConversation,
    }
    setActivePinia(createPinia())
    const restored = useChatStore()
    expect(restored.restoreFromBackup(backup)).toBe(true)
    expect(restored.getRoleProfileById(profile.id)).toMatchObject({
      profileExtensions: {
        categories: [expect.objectContaining({ label: 'Private story' })],
        fields: [expect.objectContaining({ label: 'Nickname rule' })],
      },
      profileValues: [
        expect.objectContaining({
          fieldId: 'private_nickname_rule',
          value: 'Do not use the full name in private.',
        }),
      ],
    })
  })

  test('rejects an ambiguous backup with duplicate profile IDs without changing current data', () => {
    const store = useChatStore()
    const clone = (value) => JSON.parse(JSON.stringify(value))
    const before = clone(store.roleProfiles)
    const roleProfiles = clone(store.roleProfiles)
    roleProfiles.push({
      ...clone(roleProfiles[0]),
      roleId: '9999',
      name: 'Duplicate profile ID',
    })

    const restored = store.restoreFromBackup({
      roleProfiles,
      contacts: clone(store.contacts),
      conversations: clone(store.conversations),
      messagesByConversation: clone(store.messagesByConversation),
    })

    expect(restored).toBe(false)
    expect(store.roleProfiles).toEqual(before)
  })
})
