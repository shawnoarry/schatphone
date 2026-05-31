import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import ContactsView from '../src/views/ContactsView.vue'
import { callAI } from '../src/lib/ai'
import { resetDialogServiceForTest, useDialog } from '../src/composables/useDialog'
import { useChatStore } from '../src/stores/chat'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'

vi.mock('../src/lib/ai', async () => {
  const actual = await vi.importActual('../src/lib/ai')
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
      { path: '/chat-contacts', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountContactsView = async () => {
  const router = createTestRouter()
  await router.push('/contacts')
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

const selectProfile = async (wrapper, profile) => {
  await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
  await flushUi()
}

describe('Contacts relationship classification UI', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDialogServiceForTest()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
    useRelationshipRuntimeStore().resetForTesting()
    vi.mocked(callAI).mockReset()
  })

  test('shows the current runtime snapshot before editable relationship premise controls', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const profile = chatStore.addRoleProfile({
      roleId: '2501',
      name: 'Premise Role',
      relationshipLabelText: 'childhood friend',
      relationshipLabelNote: 'Grew up together.',
      primaryRelationshipCategoryId: 'friendship_bond',
      relationshipModifierIds: ['childhood_connection'],
      classificationConfidence: 'high',
      classificationSource: 'ai_auto',
    })
    relationshipRuntimeStore.recordRelationshipFact({
      target: { profileId: profile.id, name: profile.name },
      sourceModule: 'relationship_phone_call',
      sourceId: 'call_2501',
      memoryKey: 'call_memory_2501',
      factType: 'completed_call',
      summary: 'Call recorded with Premise Role.',
      metricDeltas: { affinity: 4, trust: 2 },
      milestone: 'First call',
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)

    const detailText = wrapper.get('[data-testid="contacts-role-detail"]').text()
    const snapshotIndex = detailText.indexOf('Current relationship')
    const premiseIndex = detailText.indexOf('Relationship premise')
    expect(snapshotIndex).toBeGreaterThanOrEqual(0)
    expect(premiseIndex).toBeGreaterThan(snapshotIndex)
    expect(wrapper.get('[data-testid="contacts-relationship-runtime-snapshot"]').text()).toContain(
      'Call recorded with Premise Role.',
    )
    expect(wrapper.get('[data-testid="contacts-relationship-runtime-snapshot"]').text()).toContain(
      'First call',
    )
    expect(wrapper.get('[data-testid="contacts-relationship-premise-form"]').text()).toContain(
      'childhood friend',
    )
    expect(wrapper.get('[data-testid="contacts-relationship-premise-form"]').text()).toContain(
      'friendship_bond',
    )

    wrapper.unmount()
  })

  test('saves manual relationship premise and classification edits as user edited', async () => {
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '2502',
      name: 'Manual Classified',
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)

    await wrapper.get('[data-testid="contacts-relationship-label-input"]').setValue('like family')
    await wrapper
      .get('[data-testid="contacts-relationship-note-input"]')
      .setValue('Caregiving but not romance.')
    await wrapper.get('[data-testid="contacts-relationship-category-select"]').setValue('family_bond')
    await wrapper
      .get('[data-testid="contacts-relationship-modifier-checkbox"][data-modifier-id="caretaking"]')
      .setValue(true)
    await wrapper.get('[data-testid="contacts-relationship-seed-affinity"]').setValue('72')
    await wrapper.get('[data-testid="contacts-relationship-manual-save"]').trigger('click')
    await flushUi()

    const updated = chatStore.getRoleProfileById(profile.id)
    expect(updated.relationshipLabelText).toBe('like family')
    expect(updated.relationshipLabelNote).toBe('Caregiving but not romance.')
    expect(updated.primaryRelationshipCategoryId).toBe('family_bond')
    expect(updated.relationshipModifierIds).toEqual(['caretaking'])
    expect(updated.initialRelationshipSeed.affinity).toBe(72)
    expect(updated.classificationSource).toBe('user_edited')
    expect(wrapper.get('[data-testid="contacts-relationship-classification-status"]').text()).toContain(
      'Relationship premise saved.',
    )

    wrapper.unmount()
  })

  test('auto-saves high-confidence AI classification', async () => {
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify({
        primaryRelationshipCategoryId: 'fandom_bond',
        relationshipModifierIds: ['admiring', 'obsessive'],
        classificationConfidence: 'high',
        classificationExplanation: 'Supporter wording maps to fandom.',
      }),
    )
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '2503',
      name: 'Fan Role',
      relationshipLabelText: 'fanatic supporter',
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)
    await wrapper.get('[data-testid="contacts-relationship-ai-classify"]').trigger('click')
    await flushUi()

    const updated = chatStore.getRoleProfileById(profile.id)
    expect(updated.primaryRelationshipCategoryId).toBe('fandom_bond')
    expect(updated.relationshipModifierIds).toEqual(['admiring', 'obsessive'])
    expect(updated.classificationSource).toBe('ai_auto')
    expect(wrapper.get('[data-testid="contacts-relationship-classification-audit"]').text()).toContain(
      'Supporter wording',
    )

    wrapper.unmount()
  })

  test('requires confirmation for medium-confidence AI classification', async () => {
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify({
        primaryRelationshipCategoryId: 'friendship_bond',
        relationshipModifierIds: ['long_term_companion'],
        classificationConfidence: 'medium',
        classificationExplanation: 'Likely friendship, but label is broad.',
      }),
    )
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '2504',
      name: 'Ambiguous Role',
      relationshipLabelText: 'important person',
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)
    await wrapper.get('[data-testid="contacts-relationship-ai-classify"]').trigger('click')
    await flushUi()

    expect(chatStore.getRoleProfileById(profile.id).primaryRelationshipCategoryId).toBe('')
    expect(wrapper.get('[data-testid="contacts-relationship-confirm-ai"]').text()).toContain(
      'friendship_bond',
    )

    const { submitDialog } = useDialog()
    await wrapper.get('[data-testid="contacts-relationship-confirm-ai-save"]').trigger('click')
    await flushUi()
    submitDialog()
    await flushUi()

    expect(chatStore.getRoleProfileById(profile.id).primaryRelationshipCategoryId).toBe(
      'friendship_bond',
    )
    expect(chatStore.getRoleProfileById(profile.id).classificationSource).toBe('ai_confirmed')

    wrapper.unmount()
  })

  test('surfaces protected user-edited classifications instead of silently overwriting them', async () => {
    vi.mocked(callAI).mockResolvedValue(
      JSON.stringify({
        primaryRelationshipCategoryId: 'romantic_bond',
        relationshipModifierIds: ['mutual'],
        classificationConfidence: 'high',
        classificationExplanation: 'AI thinks this is romantic.',
      }),
    )
    const chatStore = useChatStore()
    const profile = chatStore.addRoleProfile({
      roleId: '2505',
      name: 'Protected Role',
      relationshipLabelText: 'chosen family',
      primaryRelationshipCategoryId: 'family_bond',
      relationshipModifierIds: ['caretaking'],
      classificationConfidence: 'high',
      classificationSource: 'user_edited',
    })

    const wrapper = await mountContactsView()
    await selectProfile(wrapper, profile)
    await wrapper.get('[data-testid="contacts-relationship-ai-classify"]').trigger('click')
    await flushUi()

    const updated = chatStore.getRoleProfileById(profile.id)
    expect(updated.primaryRelationshipCategoryId).toBe('family_bond')
    expect(updated.relationshipModifierIds).toEqual(['caretaking'])
    expect(updated.classificationSource).toBe('user_edited')
    expect(wrapper.get('[data-testid="contacts-relationship-classification-status"]').text()).toContain(
      'User-edited classification was kept',
    )

    wrapper.unmount()
  })
})
