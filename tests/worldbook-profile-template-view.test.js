import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
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

    await wrapper.get('[data-testid="worldbook-template-copy-preset_abo"]').trigger('click')
    await nextTick()

    expect(store.listWorldProfileTemplates('default_world')).toHaveLength(1)
    expect(wrapper.text()).toContain('World-specific templates')

    wrapper.unmount()
  })
})
