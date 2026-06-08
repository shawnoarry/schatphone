import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
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
      { path: '/settings', component: DummyView },
    ],
  })

describe('worldbook view filters', () => {
  let wrapper = null
  let router = null
  let systemStore = null

  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    systemStore = useSystemStore()
    systemStore.settings.system.language = 'en-US'
    systemStore.upsertKnowledgePoint({
      title: 'City etiquette',
      content: 'Formal greeting only.',
      tags: ['style', 'city'],
      enabled: true,
    })
    systemStore.upsertKnowledgePoint({
      title: 'Route memory',
      content: 'Safe crossings and station habits.',
      tags: ['travel', 'map'],
      enabled: true,
    })
    systemStore.upsertKnowledgePoint({
      title: 'Tea rituals',
      content: 'Ceremony phrases for late evenings.',
      tags: ['culture'],
      enabled: true,
    })

    router = createTestRouter()
    await router.push('/worldbook')
    await router.isReady()

    wrapper = mount(WorldBookView, {
      global: {
        plugins: [router],
      },
    })
    await nextTick()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    wrapper = null
    router = null
    systemStore = null
  })

  test('supports keyword search and tag filters for encyclopedia entries', async () => {
    expect(wrapper.text()).toContain('Encyclopedia')
    expect(wrapper.text()).not.toContain('Knowledge points')
    expect(wrapper.findAll('[data-testid="knowledge-point-card"]')).toHaveLength(3)

    const searchInput = wrapper.get('[data-testid="knowledge-search-input"]')
    await searchInput.setValue('travel')
    await nextTick()

    expect(wrapper.findAll('[data-testid="knowledge-point-card"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Route memory')
    expect(wrapper.text()).not.toContain('City etiquette')

    const clearButton = wrapper.get('[data-testid="knowledge-search-clear"]')
    await clearButton.trigger('click')
    await nextTick()

    expect(wrapper.findAll('[data-testid="knowledge-point-card"]')).toHaveLength(3)

    const mapTagButton = wrapper.get('[data-testid="knowledge-tag-filter-map"]')
    await mapTagButton.trigger('click')
    await nextTick()

    expect(wrapper.findAll('[data-testid="knowledge-point-card"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Route memory')
    expect(wrapper.text()).not.toContain('Tea rituals')
  })

  test('supports editing an existing encyclopedia entry in place', async () => {
    const routePoint = systemStore
      .listKnowledgePoints()
      .find((point) => point.title === 'Route memory')
    const routePointId = routePoint?.id || ''

    expect(routePointId).toBeTruthy()

    await wrapper.get(`[data-testid="knowledge-edit-${routePointId}"]`).trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="knowledge-editing-state"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="knowledge-draft-title"]').element.value).toBe('Route memory')

    await wrapper.get('[data-testid="knowledge-draft-title"]').setValue('Route memory v2')
    await wrapper.get('[data-testid="knowledge-draft-content"]').setValue(
      'Safe crossings, station habits, and late-night exits.',
    )
    await wrapper.get('[data-testid="knowledge-draft-tags"]').setValue('travel, map, safety')
    await wrapper.get('[data-testid="knowledge-draft-submit"]').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Route memory v2')
    expect(wrapper.text()).toContain('#travel #map #safety')
    expect(systemStore.getKnowledgePointById(routePointId)).toMatchObject({
      id: routePointId,
      title: 'Route memory v2',
      content: 'Safe crossings, station habits, and late-night exits.',
      tags: ['travel', 'map', 'safety'],
    })
    expect(wrapper.find('[data-testid="knowledge-editing-state"]').exists()).toBe(false)
  })

  test('uses action labels for encyclopedia enable toggles', async () => {
    const routePoint = systemStore.listKnowledgePoints().find((point) => point.title === 'Route memory')
    const routePointId = routePoint?.id || ''

    expect(routePointId).toBeTruthy()
    expect(wrapper.get(`[data-testid="knowledge-toggle-${routePointId}"]`).text()).toContain(
      'Disable',
    )

    await wrapper.get(`[data-testid="knowledge-toggle-${routePointId}"]`).trigger('click')
    await nextTick()

    expect(systemStore.getKnowledgePointById(routePointId)?.enabled).toBe(false)
    expect(wrapper.get(`[data-testid="knowledge-toggle-${routePointId}"]`).text()).toContain(
      'Enable',
    )

    await wrapper.get(`[data-testid="knowledge-toggle-${routePointId}"]`).trigger('click')
    await nextTick()

    expect(systemStore.getKnowledgePointById(routePointId)?.enabled).toBe(true)
    expect(wrapper.get(`[data-testid="knowledge-toggle-${routePointId}"]`).text()).toContain(
      'Disable',
    )
  })

  test('supports deep-link scoping from module context and clearing back to full list', async () => {
    const routePoint = systemStore.listKnowledgePoints().find((point) => point.title === 'Route memory')
    expect(routePoint?.id).toBeTruthy()

    await router.push({
      path: '/worldbook',
      query: {
        source: 'map',
        entry: routePoint.id,
      },
    })
    await flushPromises()
    await nextTick()

    expect(wrapper.get('[data-testid="knowledge-deeplink-banner"]').text()).toContain('Route memory')
    expect(wrapper.get('[data-testid="knowledge-deeplink-banner"]').text()).toContain(
      'related encyclopedia entries',
    )
    expect(wrapper.findAll('[data-testid="knowledge-point-card"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Route memory')
    expect(wrapper.text()).not.toContain('Tea rituals')

    await wrapper.get('[data-testid="knowledge-deeplink-clear"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.path).toBe('/worldbook')
    expect(Object.keys(router.currentRoute.value.query)).toHaveLength(0)
    expect(wrapper.find('[data-testid="knowledge-deeplink-banner"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="knowledge-point-card"]')).toHaveLength(3)
  })
})
