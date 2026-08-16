import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import AgendaJourneyView from '../src/views/AgendaJourneyView.vue'
import { useAgendaJourneyStore } from '../src/stores/agendaJourney'
import { useActivitySessionStore } from '../src/stores/activitySession'
import { useMapStore } from '../src/stores/map'

const NOW = new Date('2026-08-16T09:00:00+08:00').getTime()
const DummyView = { template: '<div />' }
const locationRef = {
  owner: 'map',
  mapPackId: 'real-seoul-v1',
  placeId: 'seoul-sm-hq',
  labelZh: 'SM 娱乐总部',
  labelEn: 'SM Entertainment HQ',
}

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/agenda-journey', component: AgendaJourneyView },
      { path: '/map', component: DummyView },
      { path: '/home', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

describe('Agenda Journey view', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    useMapStore().resetTripRuntimeForTesting()
    vi.useRealTimers()
  })

  test('creates a near-term manual plan and requires explicit activity start and completion', async () => {
    const router = createTestRouter()
    await router.push('/agenda-journey?from=home&homePage=2')
    await router.isReady()
    const wrapper = mount(AgendaJourneyView, { global: { plugins: [router] } })
    await flushUi()

    await wrapper.get('[data-testid="agenda-create-open"]').trigger('click')
    await wrapper.get('[data-testid="agenda-create-title"]').setValue('准备直播提纲')
    await wrapper.get('[data-testid="agenda-create-start"]').setValue('2026-08-16T11:00')
    await wrapper.get('[data-testid="agenda-create-save"]').trigger('submit')
    await flushUi()

    const agendaStore = useAgendaJourneyStore()
    expect(agendaStore.journeys).toHaveLength(1)
    expect(agendaStore.journeys[0].steps).toHaveLength(1)
    expect(agendaStore.journeys[0].status).toBe('planned')
    expect(wrapper.get('[data-testid="agenda-activity-step"]').text()).toContain('可开始')

    await wrapper.get('[data-testid="agenda-activity-start"]').trigger('click')
    await flushUi()
    expect(agendaStore.journeys[0].status).toBe('active')
    expect(agendaStore.journeys[0].steps[0].status).toBe('active')
    const activitySessionStore = useActivitySessionStore()
    expect(activitySessionStore.sessions).toHaveLength(1)
    expect(wrapper.get('[data-testid="activity-focus-companion"]').text()).toContain('专注中')

    await wrapper.get('[data-testid="activity-session-minimize"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="activity-session-expand"]').isVisible()).toBe(true)
    await wrapper.get('[data-testid="activity-session-expand"]').trigger('click')
    await flushUi()

    await wrapper.get('[data-testid="agenda-activity-complete"]').trigger('click')
    await flushUi()
    expect(agendaStore.journeys[0].status).toBe('completed')
    expect(agendaStore.journeys[0].outcomeSummaryZh).toContain('已完成')
    expect(activitySessionStore.sessions[0]).toMatchObject({
      status: 'completed',
      ownerCompletionAcknowledgedAt: NOW,
    })
    wrapper.unmount()
  })

  test('starts one linked Map Journey and treats arrival as travel evidence only', async () => {
    const agendaStore = useAgendaJourneyStore()
    const created = agendaStore.createManualPlan(
      {
        title: '舞台彩排',
        startsAt: NOW + 2 * 60 * 60_000,
        endsAt: NOW + 3 * 60 * 60_000,
        locationRef,
      },
      { now: NOW },
    )
    const travelStepId = created.journey.steps[0].id
    const router = createTestRouter()
    await router.push({
      path: '/agenda-journey',
      query: { journeyId: created.journey.id, from: 'home', homePage: '2' },
    })
    await router.isReady()
    const wrapper = mount(AgendaJourneyView, { global: { plugins: [router] } })
    await flushUi()

    expect(wrapper.get('[data-testid="agenda-travel-step"]').text()).toContain('SM 娱乐总部')
    await wrapper.get('[data-testid="agenda-open-map"]').trigger('click')
    await flushUi()

    const mapStore = useMapStore()
    expect(router.currentRoute.value).toMatchObject({
      path: '/map',
      query: {
        source: 'agenda-journey',
        journeyId: created.journey.id,
        homePage: '2',
      },
    })
    expect(mapStore.tripState).toMatchObject({
      status: 'traveling',
      sourceAgendaJourneyStepId: travelStepId,
    })

    mapStore.tickTripRuntime(
      mapStore.tripState.startedAt + mapStore.tripState.durationSeconds * 1000 + 1,
    )
    await router.push({
      path: '/agenda-journey',
      query: { journeyId: created.journey.id, from: 'home', homePage: '2' },
    })
    await flushUi()

    expect(agendaStore.findJourneyById(created.journey.id).steps[0].status).toBe('completed')
    expect(agendaStore.findJourneyById(created.journey.id).steps[1].status).toBe('available')
    expect(agendaStore.findJourneyById(created.journey.id).status).toBe('active')
    expect(wrapper.get('[data-testid="agenda-activity-step"]').text()).toContain('可开始')
    expect(wrapper.find('[data-testid="agenda-activity-complete"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
