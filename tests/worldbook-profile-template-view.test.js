import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import WorldBookView from '../src/views/WorldBookView.vue'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/worldbook', component: WorldBookView },
      { path: '/contacts', component: DummyView },
      { path: '/settings', component: DummyView },
    ],
  })

describe('WorldBookView profile templates', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useSystemStore().settings.system.language = 'en-US'
  })

  test('shows preset templates and creates a world-specific template copy', async () => {
    const router = createTestRouter()
    await router.push('/worldbook')
    await router.isReady()

    const wrapper = mount(WorldBookView, {
      global: {
        plugins: [router],
      },
    })
    const store = useSystemStore()

    expect(wrapper.text()).toContain('Role profile templates')
    expect(wrapper.text()).toContain('ABO Profile')
    expect(wrapper.get('[data-testid="worldbook-template-contacts-handoff"]').text()).toContain(
      'Contacts fills role profiles',
    )

    await wrapper.get('[data-testid="worldbook-template-copy-preset_abo"]').trigger('click')
    await nextTick()

    expect(store.listWorldProfileTemplates('default_world')).toHaveLength(1)
    expect(wrapper.text()).toContain('Current-world enabled templates')

    wrapper.unmount()
  })

  test('opens Contacts as the owner for concrete profile values', async () => {
    const router = createTestRouter()
    await router.push('/worldbook')
    await router.isReady()

    const wrapper = mount(WorldBookView, {
      global: {
        plugins: [router],
      },
    })

    await wrapper.get('[data-testid="worldbook-open-contacts-for-templates"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/contacts')
    expect(router.currentRoute.value.query.from).toBe('worldbook')
    expect(router.currentRoute.value.query.focus).toBe('profile_templates')

    wrapper.unmount()
  })
})
