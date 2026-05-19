import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { useChatStore } from '../src/stores/chat'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/profile-template-schema'

describe('Contacts profile entity model', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
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
    expect(profile.capabilities.canAppearInChatDirectory).toBe(false)
    expect(profile.profileValues[0]).toMatchObject({ fieldId: 'pheromone', value: 'White tea' })
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
})
