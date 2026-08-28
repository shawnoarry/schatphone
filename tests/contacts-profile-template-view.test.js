import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import { callAI } from '../src/lib/ai'
import ContactsView from '../src/views/ContactsView.vue'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import { useChatStore } from '../src/stores/chat'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'
import {
  CONTACTS_ENTITY_TYPES,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_TEMPLATE_SCOPES,
} from '../src/lib/profile-template-schema'

vi.mock('../src/lib/ai', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    callAI: vi.fn(),
  }
})

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

const openDetailSheet = async (wrapper, sheet) => {
  const backButton = wrapper.find('[data-testid="contacts-detail-sheet-back"]')
  if (backButton.exists()) {
    await backButton.trigger('click')
    await flushUi()
  }
  await wrapper.get(`[data-testid="contacts-open-${sheet}-sheet"]`).trigger('click')
  await flushUi()
}

const editWorldProfileFields = async (wrapper) => {
  await wrapper.get('[data-testid="contacts-edit-world-profile-fields"]').trigger('click')
  await flushUi()
}

describe('Contacts profile template entity UI', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDialogServiceForTest()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
    vi.mocked(callAI).mockReset()
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

  test('orders Contacts first screen like a phone contacts app', async () => {
    const chatStore = useChatStore()
    const selfProfile = chatStore.addRoleProfile({
      roleId: '1301',
      name: 'My world self',
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
    })
    const mainRole = chatStore.addRoleProfile({
      roleId: '1302',
      name: 'Main contact',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    })
    const npc = chatStore.addRoleProfile({
      roleId: '1303',
      name: 'NPC contact',
      entityType: CONTACTS_ENTITY_TYPES.NPC,
    })
    chatStore.bindRoleProfile(mainRole.id)

    const wrapper = await mountContactsView()
    const html = wrapper.html()
    const searchIndex = html.indexOf('data-testid="contacts-search-input"')
    const myProfileIndex = html.indexOf('data-testid="contacts-my-profile-section"')
    const recentIndex = html.indexOf('data-testid="contacts-recent-interactions"')
    const mainIndex = html.indexOf('data-testid="contacts-section-main"')
    const npcIndex = html.indexOf('data-testid="contacts-section-npc"')

    expect(searchIndex).toBeGreaterThanOrEqual(0)
    expect(myProfileIndex).toBeGreaterThan(searchIndex)
    expect(recentIndex).toBeGreaterThan(myProfileIndex)
    expect(mainIndex).toBeGreaterThan(recentIndex)
    expect(npcIndex).toBeGreaterThan(mainIndex)
    expect(wrapper.get(`[data-testid="contacts-row-${selfProfile.id}"]`).text()).toContain('My world self')
    expect(wrapper.get(`[data-testid="contacts-row-${mainRole.id}"]`).text()).toContain('Main contact')
    expect(wrapper.get(`[data-testid="contacts-row-${npc.id}"]`).text()).toContain('NPC contact')

    wrapper.unmount()
  })

  test('shows recent interaction shortcuts without removing contacts from full lists', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const mainRole = chatStore.addRoleProfile({
      roleId: '1310',
      name: 'Bound main role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    })
    const npc = chatStore.addRoleProfile({
      roleId: '1311',
      name: 'Memory NPC',
      entityType: CONTACTS_ENTITY_TYPES.NPC,
    })
    chatStore.bindRoleProfile(mainRole.id)
    relationshipRuntimeStore.recordRelationshipFact({
      target: { profileId: npc.id, name: npc.name },
      sourceModule: 'relationship_map_shared_route',
      sourceId: 'recent_route_1311',
      memoryKey: 'recent_memory_1311',
      factType: 'shared_route',
      summary: 'Shared route with Memory NPC.',
      metricDeltas: { affinity: 1 },
    })

    const wrapper = await mountContactsView()
    const recent = wrapper.get('[data-testid="contacts-recent-interactions"]').text()

    expect(recent).toContain('Bound main role')
    expect(recent).toContain('Memory NPC')
    expect(wrapper.get(`[data-testid="contacts-row-${mainRole.id}"]`).text()).toContain('Bound main role')
    expect(wrapper.get(`[data-testid="contacts-row-${npc.id}"]`).text()).toContain('Memory NPC')

    wrapper.unmount()
  })

  test('filters Contacts full lists by search text', async () => {
    const chatStore = useChatStore()
    const mainRole = chatStore.addRoleProfile({
      roleId: '1320',
      name: 'Archive main',
      role: 'Archivist',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    })
    const npc = chatStore.addRoleProfile({
      roleId: '1321',
      name: 'Campus witness',
      role: 'Student',
      entityType: CONTACTS_ENTITY_TYPES.NPC,
    })

    const wrapper = await mountContactsView()
    await wrapper.get('[data-testid="contacts-search-input"]').setValue('campus')
    await flushUi()

    expect(wrapper.find(`[data-testid="contacts-row-${mainRole.id}"]`).exists()).toBe(false)
    expect(wrapper.get(`[data-testid="contacts-row-${npc.id}"]`).text()).toContain('Campus witness')

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
    await openDetailSheet(wrapper, 'world-fields')

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
    await openDetailSheet(wrapper, 'world-fields')
    await editWorldProfileFields(wrapper)

    expect(wrapper.get('[data-testid="contacts-profile-template-select"]').element.value).toBe(template.id)

    await wrapper.get('[data-testid="contacts-profile-template-value-pheromone"]').setValue('Cedar rain')
    await wrapper.get('[data-testid="contacts-profile-template-visibility-pheromone"]').setValue('intimate')
    await wrapper.get('[data-testid="contacts-save-world-profile-fields"]').trigger('click')
    await flushUi()

    const updated = chatStore.getRoleProfileById(profile.id)
    expect(updated.templateLink).toMatchObject({
      primaryWorldId: 'legacy_single_world',
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

  test('uses universal profile templates directly when no world template is enabled', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1208',
      name: 'Universal template role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()
    await openDetailSheet(wrapper, 'world-fields')
    await editWorldProfileFields(wrapper)

    const select = wrapper.get('[data-testid="contacts-profile-template-select"]')
    expect(select.element.value).toBe('preset_basic_modern')
    expect(select.text()).toContain('Universal · Everyday profile')

    await wrapper.get('[data-testid="contacts-profile-template-value-identity"]').setValue('Solo trainee')
    await wrapper.get('[data-testid="contacts-save-world-profile-fields"]').trigger('click')
    await flushUi()

    const updated = chatStore.getRoleProfileById(profile.id)
    expect(updated.templateLink).toMatchObject({
      primaryWorldId: '',
      profileTemplateId: 'preset_basic_modern',
      profileTemplateVersion: 1,
    })
    expect(updated.profileValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: 'identity', value: 'Solo trainee' }),
      ]),
    )

    wrapper.unmount()
  })

  test('renders world-specific field types with stable controls and saves tag values', async () => {
    const systemStore = useSystemStore()
    const template = systemStore.upsertProfileTemplate({
      id: 'world_template_entertainment_contacts',
      title: 'Entertainment world profile',
      description: 'Public persona and private risk fields for an entertainment-world role.',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'default_world',
      fields: [
        {
          id: 'public_persona',
          label: 'Public persona',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
          options: ['Idol', 'Manager', 'Rival'],
        },
        {
          id: 'private_risk',
          label: 'Private risk',
          type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
        },
        {
          id: 'scene_tags',
          label: 'Scene tags',
          type: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
        },
        {
          id: 'related_person',
          label: 'Related person',
          type: PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE,
        },
      ],
    })
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1217',
      name: 'Entertainment role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()
    await openDetailSheet(wrapper, 'world-fields')
    await editWorldProfileFields(wrapper)

    expect(wrapper.get('[data-testid="contacts-profile-template-select"]').element.value).toBe(template.id)
    expect(wrapper.get('[data-testid="contacts-profile-template-field-public_persona"]').text()).toContain('Who can read this')
    expect(wrapper.get('[data-testid="contacts-profile-template-field-public_persona"]').text()).not.toContain('Choice')
    expect(wrapper.get('[data-testid="contacts-profile-template-value-public_persona"]').element.tagName).toBe('SELECT')
    expect(wrapper.get('[data-testid="contacts-profile-template-value-private_risk"]').element.tagName).toBe('TEXTAREA')
    expect(wrapper.get('[data-testid="contacts-profile-template-helper-scene_tags"]').text()).toContain(
      'commas',
    )
    expect(wrapper.get('[data-testid="contacts-profile-template-helper-related_person"]').text()).toContain(
      'name or role number',
    )

    await wrapper.get('[data-testid="contacts-profile-template-value-public_persona"]').setValue('Idol')
    await wrapper
      .get('[data-testid="contacts-profile-template-value-private_risk"]')
      .setValue('Rumors may affect public schedules.')
    await wrapper
      .get('[data-testid="contacts-profile-template-value-scene_tags"]')
      .setValue('idol, public-facing, idol')
    await wrapper.get('[data-testid="contacts-profile-template-value-related_person"]').setValue('role_1218')
    await wrapper.get('[data-testid="contacts-save-world-profile-fields"]').trigger('click')
    await flushUi()

    const updated = chatStore.getRoleProfileById(profile.id)
    expect(updated.profileValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: 'public_persona', value: 'Idol' }),
        expect.objectContaining({
          fieldId: 'private_risk',
          value: 'Rumors may affect public schedules.',
        }),
        expect.objectContaining({
          fieldId: 'scene_tags',
          value: ['idol', 'public-facing'],
        }),
        expect.objectContaining({ fieldId: 'related_person', value: 'role_1218' }),
      ]),
    )

    wrapper.unmount()
  })

  test('reviews template changes and preserves old values as custom fields', async () => {
    const systemStore = useSystemStore()
    const oldTemplate = systemStore.upsertProfileTemplate({
      id: 'world_template_old_contract',
      title: 'Old contract profile',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'default_world',
      version: 1,
      fields: [
        {
          id: 'shared_identity',
          label: 'Shared identity',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
        {
          id: 'old_secret',
          label: 'Old secret',
          type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
        },
      ],
    })
    const newTemplate = systemStore.upsertProfileTemplate({
      id: 'world_template_new_public_life',
      title: 'New public-life profile',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'default_world',
      version: 1,
      fields: [
        {
          id: 'shared_identity',
          label: 'Shared identity',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
        {
          id: 'public_persona',
          label: 'Public persona',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
          options: ['Idol', 'Manager'],
        },
      ],
    })
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1227',
      name: 'Template migration role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      templateLink: {
        primaryWorldId: 'default_world',
        profileTemplateId: oldTemplate.id,
        profileTemplateVersion: oldTemplate.version,
      },
      profileValues: [
        { fieldId: 'shared_identity', value: 'Known singer', visibilityLevel: 'familiar' },
        { fieldId: 'old_secret', value: 'Keeps an old contract secret', visibilityLevel: 'hidden' },
      ],
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()
    await openDetailSheet(wrapper, 'world-fields')
    await editWorldProfileFields(wrapper)

    expect(wrapper.get('[data-testid="contacts-profile-template-select"]').element.value).toBe(oldTemplate.id)

    await wrapper.get('[data-testid="contacts-profile-template-select"]').setValue(newTemplate.id)
    await flushUi()

    const review = wrapper.get('[data-testid="contacts-template-change-review"]').text()
    expect(review).toContain('These fields will update')
    expect(review.toLowerCase()).toContain('old fields will stay as custom fields')
    expect(review.toLowerCase()).toContain('delete old fields')
    expect(review).toContain('old_secret')
    expect(wrapper.get('[data-testid="contacts-profile-template-value-shared_identity"]').element.value).toBe(
      'Known singer',
    )

    await wrapper.get('[data-testid="contacts-profile-template-value-public_persona"]').setValue('Idol')
    await wrapper.get('[data-testid="contacts-save-world-profile-fields"]').trigger('click')
    await flushUi()

    const updated = chatStore.getRoleProfileById(profile.id)
    expect(updated.templateLink.profileTemplateId).toBe(newTemplate.id)
    expect(updated.profileValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: 'shared_identity', value: 'Known singer' }),
        expect.objectContaining({ fieldId: 'public_persona', value: 'Idol' }),
        expect.objectContaining({
          fieldId: 'old_secret',
          value: 'Keeps an old contract secret',
          visibilityLevel: 'hidden',
        }),
      ]),
    )
    const customRow = wrapper.get('[data-testid="contacts-world-field-old_secret"]').text()
    expect(customRow).toContain('Keeps an old contract secret')
    expect(customRow).toContain('Custom')

    wrapper.unmount()
  })

  test('keeps a person-only field isolated and discards the whole addition draft on cancel', async () => {
    const systemStore = useSystemStore()
    const template = systemStore.createWorldProfileTemplate({
      worldId: 'default_world',
      title: 'Person extension template',
      categories: [{ id: 'identity', label: 'Identity' }],
      fields: [
        {
          id: 'occupation',
          categoryId: 'identity',
          label: 'Occupation',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
      ],
    })
    const chatStore = useChatStore()
    const firstProfile = chatStore.addRoleProfile({
      roleId: '1230',
      name: 'Private extension role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      templateLink: {
        primaryWorldId: 'legacy_single_world',
        profileTemplateId: template.id,
        profileTemplateVersion: template.version,
      },
    })
    const secondProfile = chatStore.addRoleProfile({
      roleId: '1231',
      name: 'Unrelated role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      templateLink: {
        primaryWorldId: 'legacy_single_world',
        profileTemplateId: template.id,
        profileTemplateVersion: template.version,
      },
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${firstProfile.id}"]`).trigger('click')
    await flushUi()
    await openDetailSheet(wrapper, 'world-fields')
    await editWorldProfileFields(wrapper)

    await wrapper.get('[data-testid="contacts-add-person-profile-field"]').trigger('click')
    await wrapper
      .get('[data-testid="contacts-profile-extension-category"]')
      .setValue('__new_profile_category__')
    await wrapper
      .get('[data-testid="contacts-profile-extension-new-category-label"]')
      .setValue('Private patterns')
    await wrapper.get('[data-testid="contacts-profile-extension-label"]').setValue('Disliked nickname')
    await wrapper
      .get('[data-testid="contacts-profile-extension-type"]')
      .setValue(PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT)
    await wrapper
      .get('[data-testid="contacts-profile-extension-value"]')
      .setValue('Do not use the full name in private.')
    await wrapper.get('[data-testid="contacts-save-profile-extension"]').trigger('click')
    await flushUi()

    expect(chatStore.getRoleProfileById(firstProfile.id).profileExtensions).toEqual({
      categories: [],
      fields: [],
    })
    expect(systemStore.getProfileTemplateById(template.id).version).toBe(1)
    expect(wrapper.get('[data-testid="contacts-world-profile-fields-editor"]').text()).toContain(
      'Disliked nickname',
    )

    await wrapper.get('[data-testid="contacts-cancel-world-profile-fields"]').trigger('click')
    await flushUi()

    expect(chatStore.getRoleProfileById(firstProfile.id).profileExtensions).toEqual({
      categories: [],
      fields: [],
    })
    expect(chatStore.getRoleProfileById(firstProfile.id).profileValues).toEqual([])

    await editWorldProfileFields(wrapper)
    await wrapper.get('[data-testid="contacts-add-person-profile-field"]').trigger('click')
    await wrapper
      .get('[data-testid="contacts-profile-extension-category"]')
      .setValue('__new_profile_category__')
    await wrapper
      .get('[data-testid="contacts-profile-extension-new-category-label"]')
      .setValue('Private patterns')
    await wrapper.get('[data-testid="contacts-profile-extension-label"]').setValue('Disliked nickname')
    await wrapper
      .get('[data-testid="contacts-profile-extension-value"]')
      .setValue('Do not use the full name in private.')
    await wrapper.get('[data-testid="contacts-save-profile-extension"]').trigger('click')
    await wrapper.get('[data-testid="contacts-save-world-profile-fields"]').trigger('click')
    await flushUi()

    const updatedFirst = chatStore.getRoleProfileById(firstProfile.id)
    const updatedSecond = chatStore.getRoleProfileById(secondProfile.id)
    expect(updatedFirst.profileExtensions.categories).toEqual([
      expect.objectContaining({ label: 'Private patterns' }),
    ])
    expect(updatedFirst.profileExtensions.fields).toEqual([
      expect.objectContaining({ label: 'Disliked nickname', type: 'short_text' }),
    ])
    expect(updatedFirst.profileValues).toEqual([
      expect.objectContaining({ value: 'Do not use the full name in private.' }),
    ])
    expect(updatedSecond.profileExtensions).toEqual({ categories: [], fields: [] })
    expect(updatedSecond.profileValues).toEqual([])
    expect(systemStore.getProfileTemplateById(template.id).version).toBe(1)
    expect(wrapper.get('[data-testid="contacts-world-profile-fields-section"]').text()).toContain(
      'Private patterns',
    )
    expect(wrapper.get('[data-testid="contacts-world-profile-fields-section"]').text()).toContain(
      'Person only',
    )

    wrapper.unmount()
  })

  test('promotes an added field through a new world-template version without mutating other profiles', async () => {
    const systemStore = useSystemStore()
    const template = systemStore.createWorldProfileTemplate({
      worldId: 'default_world',
      title: 'World extension template',
      categories: [{ id: 'identity', label: 'Identity' }],
      fields: [
        {
          id: 'occupation',
          categoryId: 'identity',
          label: 'Occupation',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
      ],
    })
    const chatStore = useChatStore()
    const firstProfile = chatStore.addRoleProfile({
      roleId: '1232',
      name: 'Template author role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      templateLink: {
        primaryWorldId: 'legacy_single_world',
        profileTemplateId: template.id,
        profileTemplateVersion: template.version,
      },
    })
    const secondProfile = chatStore.addRoleProfile({
      roleId: '1233',
      name: 'Template review role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      templateLink: {
        primaryWorldId: 'legacy_single_world',
        profileTemplateId: template.id,
        profileTemplateVersion: template.version,
      },
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${firstProfile.id}"]`).trigger('click')
    await flushUi()
    await openDetailSheet(wrapper, 'world-fields')
    await editWorldProfileFields(wrapper)

    await wrapper.get('[data-testid="contacts-add-person-profile-field"]').trigger('click')
    await wrapper
      .get('[data-testid="contacts-profile-extension-category"]')
      .setValue('__new_profile_category__')
    await wrapper
      .get('[data-testid="contacts-profile-extension-new-category-label"]')
      .setValue('Public activity')
    await wrapper.get('[data-testid="contacts-profile-extension-label"]').setValue('Public call sign')
    await wrapper
      .get('[data-testid="contacts-profile-extension-value"]')
      .setValue('Blue Hour')
    await wrapper.get('[data-testid="contacts-profile-extension-scope-world"]').setValue(true)
    await wrapper.get('[data-testid="contacts-save-profile-extension"]').trigger('click')
    await flushUi()

    expect(systemStore.getProfileTemplateById(template.id).version).toBe(1)
    expect(chatStore.getRoleProfileById(firstProfile.id).profileValues).toEqual([])

    await wrapper.get('[data-testid="contacts-save-world-profile-fields"]').trigger('click')
    await flushUi()

    const updatedTemplate = systemStore.getProfileTemplateById(template.id)
    const updatedFirst = chatStore.getRoleProfileById(firstProfile.id)
    const untouchedSecond = chatStore.getRoleProfileById(secondProfile.id)
    const addedField = updatedTemplate.fields.find((field) => field.label === 'Public call sign')

    expect(updatedTemplate.version).toBe(2)
    expect(updatedTemplate.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Public activity' })]),
    )
    expect(addedField).toBeTruthy()
    expect(updatedFirst.templateLink.profileTemplateVersion).toBe(2)
    expect(updatedFirst.profileExtensions).toEqual({ categories: [], fields: [] })
    expect(updatedFirst.profileValues).toEqual([
      expect.objectContaining({ fieldId: addedField.id, value: 'Blue Hour' }),
    ])
    expect(untouchedSecond.templateLink.profileTemplateVersion).toBe(1)
    expect(untouchedSecond.profileExtensions).toEqual({ categories: [], fields: [] })

    await wrapper.get('[data-testid="contacts-profile-back"]').trigger('click')
    await flushUi()
    await wrapper.get(`[data-testid="contacts-row-${secondProfile.id}"]`).trigger('click')
    await flushUi()
    await openDetailSheet(wrapper, 'world-fields')

    expect(wrapper.get('[data-testid="contacts-template-adaptation-review"]').text()).toContain(
      'older template version',
    )
    expect(wrapper.get('[data-testid="contacts-world-profile-fields-section"]').text()).toContain(
      'Public activity',
    )
    expect(chatStore.getRoleProfileById(secondProfile.id).profileValues).toEqual([])

    wrapper.unmount()
  })

  test('drafts world field values with AI without saving or overwriting manual values', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(
      JSON.stringify({
        values: [
          { fieldId: 'shared_identity', value: 'AI should not overwrite this' },
          { fieldId: 'public_persona', value: 'Idol' },
        ],
      }),
    )
    const systemStore = useSystemStore()
    const template = systemStore.upsertProfileTemplate({
      id: 'world_template_ai_draft',
      title: 'AI draft world profile',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'default_world',
      version: 1,
      fields: [
        {
          id: 'shared_identity',
          label: 'Shared identity',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
        {
          id: 'public_persona',
          label: 'Public persona',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
          options: ['Idol', 'Manager'],
        },
      ],
    })
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1237',
      name: 'AI draft role',
      role: 'Singer',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      templateLink: {
        primaryWorldId: 'default_world',
        profileTemplateId: template.id,
        profileTemplateVersion: template.version,
      },
      profileValues: [
        { fieldId: 'shared_identity', value: 'Manual singer identity', visibilityLevel: 'familiar' },
      ],
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()
    await openDetailSheet(wrapper, 'world-fields')
    await editWorldProfileFields(wrapper)

    await wrapper.get('[data-testid="contacts-ai-draft-world-profile-fields"]').trigger('click')
    await flushUi()

    expect(callAI).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="contacts-profile-template-value-shared_identity"]').element.value).toBe(
      'Manual singer identity',
    )
    expect(wrapper.get('[data-testid="contacts-profile-template-value-public_persona"]').element.value).toBe(
      'Idol',
    )
    expect(wrapper.get('[data-testid="contacts-ai-draft-world-profile-fields-status"]').text()).toContain(
      'AI filled 1 draft field',
    )
    expect(chatStore.getRoleProfileById(profile.id).profileValues).toEqual([
      expect.objectContaining({ fieldId: 'shared_identity', value: 'Manual singer identity' }),
    ])

    wrapper.unmount()
  })

  test('classifies persona prose into four review buckets without changing the profile', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(
      JSON.stringify({
        matches: [
          {
            fieldId: 'agency',
            value: 'Galaxy Entertainment',
            sourceText: 'Agency: Galaxy Entertainment',
          },
          {
            fieldId: 'occupation',
            value: 'Actor',
            sourceText: 'Occupation: Actor',
          },
        ],
        newFields: [
          {
            label: 'Stage name',
            value: 'Livia',
            sourceText: 'Stage name: Livia',
          },
        ],
      }),
    )
    const systemStore = useSystemStore()
    const template = systemStore.upsertProfileTemplate({
      id: 'world_template_persona_review',
      title: 'Persona review profile',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'default_world',
      version: 3,
      categories: [{ id: 'identity', label: 'Identity' }],
      fields: [
        {
          id: 'occupation',
          categoryId: 'identity',
          label: 'Occupation',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
        {
          id: 'agency',
          categoryId: 'identity',
          label: 'Agency',
          type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
        },
      ],
    })
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1257',
      name: 'Persona review role',
      role: 'Singer',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      templateLink: {
        primaryWorldId: 'default_world',
        profileTemplateId: template.id,
        profileTemplateVersion: template.version,
      },
      profileValues: [{ fieldId: 'occupation', value: 'Singer', visibilityLevel: 'familiar' }],
    })
    const beforeProfile = JSON.stringify(chatStore.getRoleProfileById(profile.id))

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()
    await openDetailSheet(wrapper, 'world-fields')
    await wrapper.get('[data-testid="contacts-open-persona-classification"]').trigger('click')
    await wrapper
      .get('[data-testid="contacts-persona-source"]')
      .setValue(
        'Agency: Galaxy Entertainment\nOccupation: Actor\nStage name: Livia\nAvoids using a full name in private.',
      )
    await wrapper.get('[data-testid="contacts-classify-persona"]').trigger('click')
    await flushUi()

    expect(callAI).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="contacts-persona-classification-summary"]').text()).toContain(
      'Ready to fill 1',
    )
    expect(wrapper.get('[data-testid="contacts-persona-matched-values"]').text()).toContain(
      'Galaxy Entertainment',
    )
    expect(wrapper.get('[data-testid="contacts-persona-suggested-fields"]').text()).toContain(
      'Stage name',
    )
    expect(wrapper.get('[data-testid="contacts-persona-conflicts"]').text()).toContain('Singer')
    expect(wrapper.get('[data-testid="contacts-persona-conflicts"]').text()).toContain('Actor')
    expect(wrapper.get('[data-testid="contacts-persona-unclassified"]').text()).toContain(
      'Avoids using a full name in private.',
    )
    expect(wrapper.get('[data-testid="contacts-persona-source-retained"]').text()).toContain(
      'Agency: Galaxy Entertainment',
    )
    expect(wrapper.get('[data-testid="contacts-persona-category-persona-item-new-2"]').element.value).toBe('identity')
    expect(
      wrapper.get('[data-testid="contacts-persona-classification-panel"]').text(),
    ).toContain('Save this item')
    expect(wrapper.get('[data-testid="contacts-save-persona-confirmation"]').attributes('disabled')).toBeDefined()
    expect(JSON.stringify(chatStore.getRoleProfileById(profile.id))).toBe(beforeProfile)

    await wrapper.get('[data-testid="contacts-close-persona-classification"]').trigger('click')
    await flushUi()

    expect(wrapper.find('[data-testid="contacts-persona-classification-panel"]').exists()).toBe(
      false,
    )
    expect(JSON.stringify(chatStore.getRoleProfileById(profile.id))).toBe(beforeProfile)

    wrapper.unmount()
  })

  test('accepts, edits, ignores, and saves one reviewed persona revision', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(
      JSON.stringify({
        matches: [
          {
            sourceText: 'Occupation: Producer',
            fieldId: 'occupation',
            value: 'Producer',
            confidence: 'high',
          },
        ],
        newFields: [],
      }),
    )
    const chatStore = useChatStore()
    const systemStore = useSystemStore()
    const template = systemStore.upsertProfileTemplate({
      id: 'world_template_persona_confirmation',
      title: 'Persona confirmation profile',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'default_world',
      categories: [{ id: 'identity', label: 'Identity' }],
      fields: [
        {
          id: 'occupation',
          categoryId: 'identity',
          label: 'Occupation',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
          entityTypes: [CONTACTS_ENTITY_TYPES.SELF_PROFILE],
        },
      ],
    })
    const profile = chatStore.addRoleProfile({
      roleId: '1259',
      name: 'Persona save profile',
      entityType: CONTACTS_ENTITY_TYPES.SELF_PROFILE,
      templateLink: {
        primaryWorldId: 'default_world',
        profileTemplateId: template.id,
        profileTemplateVersion: template.version,
      },
      profileValues: [],
    })
    const initialRevision = profile.revision

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()
    await openDetailSheet(wrapper, 'world-fields')
    await wrapper.get('[data-testid="contacts-open-persona-classification"]').trigger('click')
    await wrapper
      .get('[data-testid="contacts-persona-source"]')
      .setValue('Occupation: Producer\nKeeps a private handwritten motto.')
    await wrapper.get('[data-testid="contacts-classify-persona"]').trigger('click')
    await flushUi()

    await wrapper
      .get('[data-testid="contacts-persona-value-persona-item-field-occupation"]')
      .setValue('Creative producer')
    await wrapper
      .get('[data-testid="contacts-persona-accept-persona-item-field-occupation"]')
      .trigger('click')
    await wrapper
      .get('[data-testid="contacts-persona-ignore-persona-item-unclassified-1"]')
      .trigger('click')
    expect(wrapper.get('[data-testid="contacts-save-persona-confirmation"]').attributes('disabled')).toBeUndefined()

    void wrapper.get('[data-testid="contacts-save-persona-confirmation"]').trigger('click')
    await flushUi()
    expect(useDialog().dialogState.visible).toBe(true)
    useDialog().submitDialog()
    await flushUi()

    const saved = chatStore.getRoleProfileById(profile.id)
    expect(saved.revision).toBe(initialRevision + 1)
    expect(saved.profileValues).toEqual([
      expect.objectContaining({
        fieldId: 'occupation',
        value: 'Creative producer',
        sourceKind: 'manual',
      }),
    ])
    expect(wrapper.find('[data-testid="contacts-persona-classification-panel"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('keeps persona source and profile unchanged when classification cannot be parsed', async () => {
    vi.mocked(callAI).mockResolvedValueOnce('not json')
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1258',
      name: 'Persona parse failure role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      templateLink: {
        primaryWorldId: '',
        profileTemplateId: 'preset_basic_modern',
        profileTemplateVersion: 1,
      },
      profileValues: [
        { fieldId: 'identity', value: 'Confirmed identity', visibilityLevel: 'public' },
      ],
    })
    const sourceText = 'Keep this exact source available after the provider returns invalid JSON.'
    const beforeProfile = JSON.stringify(chatStore.getRoleProfileById(profile.id))

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()
    await openDetailSheet(wrapper, 'world-fields')
    await wrapper.get('[data-testid="contacts-open-persona-classification"]').trigger('click')
    await wrapper.get('[data-testid="contacts-persona-source"]').setValue(sourceText)
    await wrapper.get('[data-testid="contacts-classify-persona"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-persona-classification-error"]').text()).toContain(
      'profile remains unchanged',
    )
    expect(wrapper.get('[data-testid="contacts-persona-source"]').element.value).toBe(sourceText)
    expect(wrapper.find('[data-testid="contacts-persona-classification-review"]').exists()).toBe(
      false,
    )
    expect(JSON.stringify(chatStore.getRoleProfileById(profile.id))).toBe(beforeProfile)

    wrapper.unmount()
  })

  test('drafts a current-world template adaptation without saving until the user confirms', async () => {
    vi.mocked(callAI).mockResolvedValueOnce(
      JSON.stringify({
        values: [
          { fieldId: 'shared_identity', value: 'AI should not overwrite this' },
          { fieldId: 'public_persona', value: 'Idol' },
        ],
      }),
    )
    const systemStore = useSystemStore()
    const legacyTemplate = systemStore.upsertProfileTemplate({
      id: 'world_template_legacy_contacts_adaptation',
      title: 'Legacy contact profile',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'legacy_world',
      version: 1,
      enabled: false,
      fields: [
        {
          id: 'shared_identity',
          label: 'Shared identity',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
        {
          id: 'old_secret',
          label: 'Old secret',
          type: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT,
        },
      ],
    })
    const currentTemplate = systemStore.upsertProfileTemplate({
      id: 'world_template_current_contacts_adaptation',
      title: 'Current contact profile',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'default_world',
      version: 2,
      fields: [
        {
          id: 'shared_identity',
          label: 'Shared identity',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
        {
          id: 'public_persona',
          label: 'Public persona',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
          options: ['Idol', 'Manager'],
        },
      ],
    })
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1247',
      name: 'Template adaptation role',
      role: 'Singer',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      templateLink: {
        primaryWorldId: 'legacy_world',
        profileTemplateId: legacyTemplate.id,
        profileTemplateVersion: legacyTemplate.version,
      },
      profileValues: [
        { fieldId: 'shared_identity', value: 'Manual singer identity', visibilityLevel: 'familiar' },
        { fieldId: 'old_secret', value: 'Keeps an old contract secret', visibilityLevel: 'hidden' },
      ],
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()
    await openDetailSheet(wrapper, 'world-fields')

    const adaptation = wrapper.get('[data-testid="contacts-template-adaptation-review"]')
    expect(adaptation.text()).toContain('another world template')
    expect(adaptation.text()).toContain('Current contact profile')
    expect(adaptation.text()).toContain('custom field')

    await wrapper.get('[data-testid="contacts-ai-adapt-world-profile-template"]').trigger('click')
    await flushUi()

    expect(callAI).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="contacts-profile-template-select"]').element.value).toBe(
      currentTemplate.id,
    )
    expect(wrapper.get('[data-testid="contacts-profile-template-value-shared_identity"]').element.value).toBe(
      'Manual singer identity',
    )
    expect(wrapper.get('[data-testid="contacts-profile-template-value-public_persona"]').element.value).toBe(
      'Idol',
    )
    expect(wrapper.get('[data-testid="contacts-ai-draft-world-profile-fields-status"]').text()).toContain(
      'AI drafted the adaptation',
    )
    expect(chatStore.getRoleProfileById(profile.id).templateLink.profileTemplateId).toBe(legacyTemplate.id)

    await wrapper.get('[data-testid="contacts-save-world-profile-fields"]').trigger('click')
    await flushUi()

    const updated = chatStore.getRoleProfileById(profile.id)
    expect(updated.templateLink.profileTemplateId).toBe(currentTemplate.id)
    expect(updated.profileValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fieldId: 'shared_identity', value: 'Manual singer identity' }),
        expect.objectContaining({ fieldId: 'public_persona', value: 'Idol' }),
        expect.objectContaining({ fieldId: 'old_secret', value: 'Keeps an old contract secret' }),
      ]),
    )

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

  test('shows understandable persona entry actions on an empty person overview', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1250',
      name: 'Empty persona role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()

    const overview = wrapper.get('[data-testid="contacts-person-profile-summary"]')
    expect(overview.text()).toContain('No persona added for Empty persona role yet')
    expect(overview.text()).toContain('Paste a persona')
    expect(overview.text()).toContain('Fill item by item')
    expect(wrapper.text()).not.toContain('No cross-module relationship facts')

    await wrapper.get('[data-testid="contacts-persona-fill-from-overview"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-detail-sheet-world-fields"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="contacts-world-profile-fields-editor"]').exists()).toBe(true)

    wrapper.unmount()
  })

  test('renders confirmed persona fields as readable groups on the person overview', async () => {
    const systemStore = useSystemStore()
    const template = systemStore.upsertProfileTemplate({
      id: 'world_template_readable_persona_overview',
      title: 'Readable persona',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'default_world',
      version: 1,
      categories: [{ id: 'identity', label: 'Identity' }],
      fields: [
        {
          id: 'occupation',
          categoryId: 'identity',
          label: 'Occupation',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
      ],
    })
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1251',
      name: 'Readable persona role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      templateLink: {
        primaryWorldId: 'default_world',
        profileTemplateId: template.id,
        profileTemplateVersion: template.version,
      },
      profileValues: [
        { fieldId: 'occupation', value: 'Stage director', visibilityLevel: 'familiar' },
      ],
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()

    const groups = wrapper.get('[data-testid="contacts-persona-readable-groups"]')
    expect(groups.text()).toContain('Identity')
    expect(groups.text()).toContain('Occupation')
    expect(groups.text()).toContain('Stage director')
    expect(wrapper.find('[data-testid="contacts-persona-empty-state"]').exists()).toBe(false)

    wrapper.unmount()
  })

  test('summarizes fully empty profile categories and focuses persona classification', async () => {
    const systemStore = useSystemStore()
    const template = systemStore.upsertProfileTemplate({
      id: 'world_template_profile_reading_rhythm',
      title: 'Profile reading rhythm',
      scope: PROFILE_TEMPLATE_SCOPES.WORLD,
      worldId: 'default_world',
      version: 1,
      categories: [
        { id: 'identity', label: 'Identity' },
        { id: 'organization', label: 'Organization' },
      ],
      fields: [
        {
          id: 'occupation',
          categoryId: 'identity',
          label: 'Occupation',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
        {
          id: 'agency',
          categoryId: 'organization',
          label: 'Agency',
          type: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE,
        },
        {
          id: 'team_role',
          categoryId: 'organization',
          label: 'Team role',
          type: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT,
        },
      ],
    })
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '1252',
      name: 'Profile rhythm role',
      entityType: CONTACTS_ENTITY_TYPES.MAIN_ROLE,
      templateLink: {
        primaryWorldId: 'default_world',
        profileTemplateId: template.id,
        profileTemplateVersion: template.version,
      },
      profileValues: [
        { fieldId: 'occupation', value: 'Producer', visibilityLevel: 'familiar' },
      ],
    })

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="contacts-open-world-fields-sheet"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-world-field-category-identity"]').text()).toContain(
      'Producer',
    )
    expect(wrapper.find('[data-testid="contacts-world-field-category-organization"]').exists()).toBe(
      false,
    )
    const pending = wrapper.get('[data-testid="contacts-world-profile-pending-summary"]')
    expect(pending.text()).toContain('Details to add')
    expect(pending.text()).toContain('Organization: 2 details to add')

    await wrapper.get('[data-testid="contacts-open-persona-classification"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-persona-classification-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="contacts-world-profile-category-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="contacts-world-profile-pending-summary"]').exists()).toBe(false)

    await wrapper.get('[data-testid="contacts-close-persona-classification"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-world-profile-category-list"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="contacts-world-profile-pending-summary"]').exists()).toBe(true)

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
    await openDetailSheet(wrapper, 'relationship')

    const summary = wrapper.get('[data-testid="contacts-role-hub-summary"]').text()
    expect(summary).toContain('Main Role')
    expect(summary).toContain('Chat target')
    expect(summary).toContain('Manual details')
    expect(summary).toContain('Event-attached')
    expect(summary).toContain('World fields')

    await openDetailSheet(wrapper, 'activity')
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
