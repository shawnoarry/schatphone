import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import CalendarView from '../src/views/CalendarView.vue'
import { useCalendarStore } from '../src/stores/calendar'
import { useRelationshipRuntimeStore } from '../src/stores/relationshipRuntime'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/calendar', component: CalendarView },
      { path: '/home', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/reminders', component: DummyView },
      { path: '/worldbook', component: DummyView },
    ],
  })

const flushUi = async () => {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

const mountCalendarView = async () => {
  const router = createTestRouter()
  await router.push('/calendar')
  await router.isReady()
  const wrapper = mount(CalendarView, {
    global: {
      plugins: [router],
    },
  })
  await flushUi()
  return { wrapper, router }
}

describe('CalendarView relationship facts', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-17T08:00:00.000Z'))
    setActivePinia(createPinia())
    useCalendarStore().resetForTesting()
    useRelationshipRuntimeStore().resetForTesting()
  })

  test('records selected contacts from confirmed events as relationship facts', async () => {
    const calendarStore = useCalendarStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const event = calendarStore.upsertEvent({
      id: 'calendar_event_date_eva',
      titleZh: 'Dinner with Eva',
      titleEn: 'Dinner with Eva',
      summaryZh: 'Table booked after work.',
      summaryEn: 'Table booked after work.',
      startsAt: Date.now() + 2 * 60 * 60 * 1000,
    })
    const { wrapper } = await mountCalendarView()

    await wrapper.get(`[data-testid="calendar-event-relationship-contact-${event.id}"]`).setValue('1')
    await wrapper.get(`[data-testid="calendar-event-record-relationship-${event.id}"]`).trigger('click')
    await flushUi()

    expect(relationshipRuntimeStore.events).toHaveLength(1)
    expect(relationshipRuntimeStore.events[0]).toMatchObject({
      factType: 'scheduled_calendar_event',
      sourceModule: 'relationship_calendar_confirmed_event',
      sourceId: `${event.id}:calendar_event:role_1`,
      targetLabel: 'Eva',
      status: 'applied',
    })
    expect(
      wrapper.get(`[data-testid="calendar-event-relationship-feedback-${event.id}"]`).text(),
    ).toContain('Relationship fact recorded.')

    expect(
      wrapper.get(`[data-testid="calendar-event-record-relationship-${event.id}"]`).attributes('disabled'),
    ).toBeDefined()
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 1, name: 'Eva' }).metrics.affinity).toBe(54)

    wrapper.unmount()
  })

  test('shows calendar memory review detail without exposing duplicate growth as primary', async () => {
    const calendarStore = useCalendarStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const target = {
      profileId: 1,
      contactId: 1,
      kind: 'role',
      name: 'Eva',
    }
    relationshipRuntimeStore.recordRelationshipFact({
      target,
      sourceModule: 'relationship_map_shared_route',
      sourceId: 'trip_hist_calendar_review:shared_route:role_1',
      memoryKey: 'shared_route__trip_hist_calendar_review',
      factType: 'shared_route',
      summary: 'Shared route completed with Eva: Dorm to City core.',
      metricDeltas: {
        affinity: 5,
        trust: 2,
        intimacy: 3,
      },
    })
    const event = calendarStore.upsertEvent({
      id: 'calendar_event_map_review',
      source: 'map_calendar_reminder',
      sourceReminderId: 'map_calendar_city_core',
      sourceTripId: 'trip_hist_calendar_review',
      sourceAreaId: 'city_core',
      titleZh: 'City core follow-up',
      titleEn: 'City core follow-up',
      summaryZh: 'Review the shared city route.',
      summaryEn: 'Review the shared city route.',
      startsAt: Date.now() + 2 * 60 * 60 * 1000,
    })
    const { wrapper } = await mountCalendarView()

    await wrapper.get(`[data-testid="calendar-event-relationship-contact-${event.id}"]`).setValue('1')
    await wrapper.get(`[data-testid="calendar-event-record-relationship-${event.id}"]`).trigger('click')
    await flushUi()

    const review = wrapper.get(`[data-testid="calendar-event-relationship-review-${event.id}"]`).text()

    expect(review).toContain('Relationship review')
    expect(review).toContain('Map follow-up')
    expect(review).toContain('Eva')
    expect(review).toContain('Shared route completed with Eva: Dorm to City core.')
    expect(review).toContain('2 linked records: Shared route, Calendar plan')
    expect(review).toContain('未重复增加关系数值')
    expect(review).toContain('trip_hist_calendar_review')
    expect(relationshipRuntimeStore.summarizeEntityForTarget(target).metrics).toMatchObject({
      affinity: 55,
      trust: 52,
      intimacy: 23,
    })

    wrapper.unmount()
  })

  test('removes a confirmed calendar event from the module detail card', async () => {
    const calendarStore = useCalendarStore()
    const relationshipRuntimeStore = useRelationshipRuntimeStore()
    const event = calendarStore.upsertEvent({
      id: 'calendar_event_delete_local',
      titleZh: 'Delete this event',
      titleEn: 'Delete this event',
      summaryZh: 'Single event cleanup.',
      summaryEn: 'Single event cleanup.',
      startsAt: Date.now() + 2 * 60 * 60 * 1000,
    })
    calendarStore.recordEventRelationshipFact(event.id, {
      profileId: 1,
      contactId: 1,
      kind: 'role',
      name: 'Eva',
    })
    const { wrapper } = await mountCalendarView()

    expect(relationshipRuntimeStore.events).toHaveLength(1)
    expect(wrapper.find(`[data-testid="calendar-event-card-${event.id}"]`).exists()).toBe(true)
    await wrapper.get(`[data-testid="calendar-event-delete-${event.id}"]`).trigger('click')
    await flushUi()

    expect(calendarStore.findEventById(event.id)).toBeNull()
    expect(relationshipRuntimeStore.events).toHaveLength(0)
    expect(relationshipRuntimeStore.summarizeEntityForTarget({ profileId: 1, name: 'Eva' }).exists).toBe(false)
    expect(wrapper.find(`[data-testid="calendar-event-card-${event.id}"]`).exists()).toBe(false)

    wrapper.unmount()
  })
})
