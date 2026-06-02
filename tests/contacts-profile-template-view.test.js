import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ContactsView from '../src/views/ContactsView.vue'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import { useChatStore } from '../src/stores/chat'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'
import { CONTACTS_ENTITY_TYPES } from '../src/lib/profile-template-schema'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', component: ContactsView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountContactsView = async (initialRoute = '/contacts') => {
  const router = createTestRouter()
  await router.push(initialRoute)
  await router.isReady()
  const wrapper = mount(ContactsView, {
    global: {
      plugins: [router],
      stubs: ['ImageSourcePicker', 'AssetStatusBadge', 'AssetThumbnailOption'],
    },
  })
  await flushUi()
  return wrapper
}

describe('Contacts profile template entity UI', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDialogServiceForTest()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('groups self profile, main roles, and NPC entities in Contacts', async () => {
    const chatStore = useChatStore()
    const selfProfile = chatStore.addRoleProfile({
      roleId: '1201',
      name: 'My profile',
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
    })
    const mainRole = chatStore.addRoleProfile({
      roleId: '1202',
      name: 'Main role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    })
    const npc = chatStore.addRoleProfile({
      roleId: '1203',
      name: 'World NPC',
      entityType: CONTACTS_ENTITY_TYPES.NPC,
    })

    const wrapper = await mountContactsView()

    expect(wrapper.text()).toContain('My Profile')
    expect(wrapper.text()).toContain('Main Roles')
    expect(wrapper.text()).toContain('NPC / World roles')
    expect(wrapper.get(`[data-testid="contacts-row-${selfProfile.id}"]`).text()).toContain('My profile')
    expect(wrapper.get(`[data-testid="contacts-row-${mainRole.id}"]`).text()).toContain('Main role')
    expect(wrapper.get(`[data-testid="contacts-row-${npc.id}"]`).text()).toContain('World NPC')

    wrapper.unmount()
  })

  test('shows template-applied profile values in role detail', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1204',
      name: 'White tea role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      profileValues: [{ fieldId: 'pheromone', value: 'White tea', visibilityLevel: 'familiar' }],
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-role-detail"]').text()).toContain('White tea')
    expect(wrapper.get('[data-testid="contacts-role-detail"]').text()).toContain('Familiar')

    wrapper.unmount()
  })

  test('edits concrete profile values from a WorldBook template in Contacts', async () => {
    const systemStore = useSystemStore()
    const template = systemStore.createWorldProfileTemplateFromPreset('preset_abo', {
      worldId: 'default_world',
      title: 'ABO contact template',
    })
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1207',
      name: 'Template editable role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    })

    const wrapper = await mountContactsView('/contacts?from=worldbook&focus=profile_templates')
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()

    await wrapper.get('[data-testid="contacts-edit-world-profile-fields"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-profile-template-select"]').element.value).toBe(template.id)

    await wrapper.get('[data-testid="contacts-profile-template-value-pheromone"]').setValue('Cedar rain')
    await wrapper.get('[data-testid="contacts-profile-template-visibility-pheromone"]').setValue('intimate')
    await wrapper.get('[data-testid="contacts-save-world-profile-fields"]').trigger('click')
    await flushUi()

    const updated = chatStore.getRoleProfileById(profile.id)
    expect(updated.templateLink).toMatchObject({
      primaryWorldId: 'default_world',
      profileTemplateId: template.id,
      profileTemplateVersion: template.version,
    })
    expect(updated.profileValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldId: 'pheromone',
          value: 'Cedar rain',
          visibilityLevel: 'intimate',
          sourceKind: 'manual',
        }),
      ]),
    )
    expect(wrapper.get('[data-testid="contacts-world-field-pheromone"]').text()).toContain('Cedar rain')
    expect(wrapper.get('[data-testid="contacts-world-field-pheromone"]').text()).toContain('Intimate')

    wrapper.unmount()
  })

  test('shows a WorldBook handoff when profile templates route into Contacts', async () => {
    const wrapper = await mountContactsView('/contacts?from=worldbook&focus=profile_templates')

    const handoff = wrapper.get('[data-testid="contacts-worldbook-template-handoff"]')
    expect(handoff.text()).toContain('From WorldBook')
    expect(handoff.text()).toContain('Select or create a profile')
    expect(handoff.text()).toContain('WorldBook prepares the fields this world needs')

    await wrapper.get('[data-testid="contacts-worldbook-template-create-profile"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-profile-modal"]').text()).toContain('Create Role Profile')

    wrapper.unmount()
  })

  test('presents the selected role as a role hub with chat state, entity type, and memory source summary', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1206',
      name: 'Role hub subject',
      role: 'Archivist',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      detailItems: [
        {
          section: 'preferences',
          sourceKind: 'manual',
          title: 'Likes quiet cafes',
          detail: 'Prefers late afternoon.',
        },
        {
          section: 'lifePattern',
          sourceKind: 'event_attached',
          title: 'Evening walk',
          detail: 'Attached from a shared route.',
          memoryKey: 'hub_memory',
          sourceModule: 'relationship_map_shared_route',
          sourceId: 'route_1206',
        },
      ],
      profileValues: [{ fieldId: 'pheromone', value: 'Rain wood', visibilityLevel: 'public' }],
    })
    chatStore.bindRoleProfile(profile.id)
    relationshipRuntimeStore.recordRelationshipFact({
      target: {
        profileId: profile.id,
        name: profile.name,
      },
      sourceModule: 'relationship_map_shared_route',
      sourceId: 'route_1206',
      memoryKey: 'hub_memory',
      factType: 'shared_route',
      summary: 'Shared route recorded with Role hub subject.',
      metricDeltas: {
        affinity: 5,
      },
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()

    const summary = wrapper.get('[data-testid="contacts-role-hub-summary"]').text()
    expect(summary).toContain('Main Role')
    expect(summary).toContain('Chat target')
    expect(summary).toContain('Manual details')
    expect(summary).toContain('Event-attached')
    expect(summary).toContain('World fields')

    const activity = wrapper.get('[data-testid="contacts-linked-activity-summary"]').text()
    expect(activity).toContain('relationship_map_shared_route')
    expect(activity).toContain('Event-attached')
    expect(activity).toContain('Memories')
    expect(activity).toContain('relationship_map_shared_route 1')

    wrapper.unmount()
  })

  test('upgrades an NPC to main role while preserving chat binding', async () => {
    const chatStore = useChatStore()
    const npc = chatStore.addRoleProfile({
      roleId: '1205',
      name: 'Upgradeable NPC',
      entityType: CONTACTS_ENTITY_TYPES.NPC,
    })
    const binding = chatStore.bindRoleProfile(npc.id)

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${npc.id}"]`).trigger('click')
    await flushUi()

    const { submitDialog } = useDialog()
    await wrapper.get('[data-testid="contacts-upgrade-npc"]').trigger('click')
    await flushUi()
    submitDialog()
    await flushUi()

    const upgraded = chatStore.getRoleProfileById(npc.id)
    expect(upgraded.entityType).toBe(CONTACTS_ENTITY_TYPES.MAIN_ROLE)
    expect(chatStore.getContactById(binding.id).profileId).toBe(npc.id)

    wrapper.unmount()
  })
})
