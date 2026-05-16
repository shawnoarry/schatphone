import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import MapView from '../src/views/MapView.vue'
import { useMapStore } from '../src/stores/map'
import { useSystemStore } from '../src/stores/system'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/map', component: MapView },
      { path: '/home', component: DummyView },
      { path: '/gallery', component: DummyView },
      { path: '/settings', component: DummyView },
      { path: '/worldbook', component: DummyView },
    ],
  })

describe('map worldbook context', () => {
  let wrapper = null
  let router = null
  let mapStore = null
  let systemStore = null

  beforeEach(async () => {
    localStorage.clear()
    setActivePinia(createPinia())
    mapStore = useMapStore()
    systemStore = useSystemStore()

    systemStore.upsertKnowledgePoint({
      title: 'Route memory',
      content: 'Safe crossings and station exits for Home to Office.',
      tags: ['map', 'travel'],
      enabled: true,
    })
    systemStore.upsertKnowledgePoint({
      title: 'Tea rituals',
      content: 'Ceremony phrases for late evenings.',
      tags: ['culture'],
      enabled: true,
    })

    const baseAt = Date.now()
    expect(
      mapStore.restoreFromBackup({
        map: {
          tripHistory: [
            {
              id: 'map_worldbook_trip',
              status: 'arrived',
              from: 'Home',
              to: 'Office',
              fromLabel: 'Home',
              toLabel: 'Office',
              distanceKm: 5,
              fare: 9000,
              durationSeconds: 900,
              startedAt: baseAt,
              endedAt: baseAt + 900,
              rewardPoints: 20,
            },
          ],
        },
      }),
    ).toBe(true)

    router = createTestRouter()
    await router.push({
      path: '/map',
      query: { from: 'home', homePage: '1' },
    })
    await router.isReady()

    wrapper = mount(MapView, {
      global: {
        plugins: [router],
      },
    })
    await nextTick()
    await Promise.resolve()
    await nextTick()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
    wrapper = null
    router = null
    mapStore = null
    systemStore = null
  })

  const findByTestId = (testId) =>
    wrapper
      .findAll('[data-testid]')
      .find((node) => node.attributes('data-testid') === testId)

  test('shows related WorldBook knowledge points across map feedback, route familiarity, and trip history', async () => {
    const routePoint = systemStore.listKnowledgePoints().find((item) => item.title === 'Route memory')
    const feedbackId = mapStore.mapAreaFeedback[0]?.id
    const routeKey = mapStore.routeFamiliarity[0]?.key
    const tripId = mapStore.tripHistory[0]?.id

    expect(routePoint?.id).toBeTruthy()
    expect(feedbackId).toBeTruthy()
    expect(routeKey).toBeTruthy()
    expect(tripId).toBeTruthy()

    const feedbackContext = findByTestId(`map-area-feedback-worldbook-${feedbackId}`)
    expect(feedbackContext?.exists()).toBe(true)
    expect(feedbackContext.text()).toContain('Route memory')
    expect(feedbackContext.text()).not.toContain('Tea rituals')

    const routeContext = findByTestId(`map-route-worldbook-${routeKey}`)
    expect(routeContext?.exists()).toBe(true)
    expect(routeContext.text()).toContain('Route memory')
    expect(findByTestId(`map-route-worldbook-chip-${routeKey}-${routePoint.id}`)?.exists()).toBe(true)

    const tripContext = findByTestId(`map-trip-history-worldbook-${tripId}`)
    expect(tripContext?.exists()).toBe(true)
    expect(tripContext.text()).toContain('Route memory')
    expect(tripContext.text()).not.toContain('Tea rituals')
  })

  test('deep-links map context into WorldBook filters', async () => {
    const routePoint = systemStore.listKnowledgePoints().find((item) => item.title === 'Route memory')
    const feedbackId = mapStore.mapAreaFeedback[0]?.id

    expect(routePoint?.id).toBeTruthy()
    expect(feedbackId).toBeTruthy()

    await findByTestId(`map-area-feedback-worldbook-chip-${feedbackId}-${routePoint.id}`).trigger('click')
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.path).toBe('/worldbook')
    expect(router.currentRoute.value.query).toMatchObject({
      source: 'map',
      homePage: '1',
      point: routePoint.id,
    })
  })
})
