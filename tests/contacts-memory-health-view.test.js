import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import ContactsView from '../src/views/ContactsView.vue'
import { resetDialogServiceForTest } from '../src/composables/useDialog'
import { useChatStore } from '../src/stores/chat'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountContactsView = async () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/contacts', component: ContactsView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
    ],
  })
  await router.push('/contacts')
  await router.isReady()
  const wrapper = mount(ContactsView, { global: { plugins: [router] } })
  await flushUi()
  return wrapper
}

describe('Contacts memory care surface', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-12T08:00:00.000Z'))
    resetDialogServiceForTest()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
    useRelationshipRuntimeStore().resetForTesting()
  })

  test('opens a suggested existing memory without changing relationship truth', async () => {
    const chatStore = useChatStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const profile = chatStore.addRoleProfile({
      roleId: '972A',
      name: 'Memory Care',
      role: 'Friend',
    })
    const target = { profileId: profile.id, name: profile.name }
    for (let index = 0; index < 5; index += 1) {
      relationshipRuntimeStore.recordRelationshipFact({
        target,
        sourceModule: index % 2 === 0 ? 'relationship_phone_call' : 'relationship_calendar_confirmed_event',
        sourceId: `memory_care_dense_${index}`,
        memoryKey: 'dense_shared_day',
        factType: 'shared_experience',
        summary: `Dense shared memory detail ${index + 1}.`,
        metricDeltas: {},
        createdAt: Date.parse('2026-08-10T08:00:00.000Z') + index,
      })
    }
    relationshipRuntimeStore.recordRelationshipFact({
      target,
      sourceModule: 'relationship_map_shared_route',
      sourceId: 'memory_care_recent',
      memoryKey: 'recent_route',
      factType: 'shared_route',
      summary: 'A newer ordinary route memory.',
      metricDeltas: {},
      createdAt: Date.parse('2026-08-11T08:00:00.000Z'),
    })
    const before = relationshipRuntimeStore.createBackupSnapshot()

    const wrapper = await mountContactsView()
    await wrapper.get(`[data-testid="contacts-row-${profile.id}"]`).trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-memory-health-status"]').text()).toContain(
      'Starting to fill up',
    )
    expect(wrapper.get('[data-testid="contacts-memory-health"]').text()).toContain(
      'Nothing will change automatically',
    )
    expect(wrapper.get('[data-testid="contacts-memory-detail"]').text()).toContain(
      'A newer ordinary route memory.',
    )

    await wrapper.get('[data-testid="contacts-memory-health-open-dense_shared_day"]').trigger('click')
    await flushUi()

    expect(wrapper.get('[data-testid="contacts-memory-detail"]').text()).toContain(
      'Dense shared memory detail 5.',
    )
    expect(wrapper.get('[data-testid="contacts-memory-source-audit"]').text()).toContain('Phone call')
    expect(relationshipRuntimeStore.createBackupSnapshot()).toEqual(before)

    wrapper.unmount()
  })
})
