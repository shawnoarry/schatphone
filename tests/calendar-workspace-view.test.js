import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { nextTick } from 'vue'
import CalendarView from '../src/views/CalendarView.vue'
import { useCalendarStore } from '../src/stores/calendar'

const DummyView = { template: '<div />' }

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/calendar', component: CalendarView },
      { path: '/home', component: DummyView },
      { path: '/mail', component: DummyView },
      { path: '/workplace', component: DummyView },
      { path: '/map', component: DummyView },
      { path: '/reminders', component: DummyView },
      { path: '/worldbook', component: DummyView },
    ],
  })

const flushUi = async () => {
  await nextTick()
  await flushPromises()
  await nextTick()
}

describe('Calendar workspace and authoring', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 15, 10, 0, 0, 0))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  test('switches Month, Week, and Agenda while keeping one selected event detail', async () => {
    const calendarStore = useCalendarStore()
    const startsAt = new Date(2026, 7, 15, 14, 0, 0, 0).getTime()
    calendarStore.createManualEvent({
      titleZh: '周末彩排',
      titleEn: 'Weekend rehearsal',
      startsAt,
      endsAt: startsAt + 2 * 60 * 60_000,
      requirement: 'required',
    })

    const router = createTestRouter()
    await router.push('/calendar')
    await router.isReady()
    const wrapper = mount(CalendarView, { global: { plugins: [router] } })
    await flushUi()

    expect(wrapper.get('[data-testid="calendar-month-view"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="calendar-selected-event-detail"]').text()).toContain(
      '周末彩排',
    )
    expect(wrapper.findAll('[data-testid^="calendar-event-card-"]')).toHaveLength(1)

    await wrapper.get('[data-testid="calendar-view-week"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="calendar-week-view"]').text()).toContain('周末彩排')

    await wrapper.get('[data-testid="calendar-view-agenda"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="calendar-agenda-view"]').text()).toContain('周末彩排')

    wrapper.unmount()
  })

  test.each([
    {
      source: 'mail',
      title: '来自邮件的预约',
      returnLabel: '返回邮件',
      returnPath: '/mail',
    },
    {
      source: 'workplace',
      title: '来自工作台的排期提案',
      returnLabel: '返回工作台',
      returnPath: '/workplace',
    },
  ])('shows an honest $source landing without creating an event', async ({ source, title, returnLabel, returnPath }) => {
    const calendarStore = useCalendarStore()
    const router = createTestRouter()
    await router.push({ path: '/calendar', query: { source } })
    await router.isReady()
    const wrapper = mount(CalendarView, { global: { plugins: [router] } })
    await flushUi()

    const handoff = wrapper.get('[data-testid="calendar-source-handoff"]')
    expect(handoff.attributes('data-source')).toBe(source)
    expect(handoff.text()).toContain('尚未创建日程')
    expect(handoff.text()).toContain(title)
    expect(handoff.text()).toContain(returnLabel)
    expect(calendarStore.confirmedEvents).toHaveLength(0)

    await wrapper.get('[data-testid="calendar-source-handoff-return"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.path).toBe(returnPath)
    expect(calendarStore.confirmedEvents).toHaveLength(0)

    wrapper.unmount()
  })

  test('prefills a verified Mail appointment and creates it only after Calendar confirmation', async () => {
    const calendarStore = useCalendarStore()
    const router = createTestRouter()
    await router.push({
      path: '/calendar',
      query: {
        source: 'mail',
        sourceRecordId: 'mail_fixture_snuh_checkup_1',
      },
    })
    await router.isReady()
    const wrapper = mount(CalendarView, { global: { plugins: [router] } })
    await flushUi()

    expect(calendarStore.confirmedEvents).toHaveLength(0)
    expect(wrapper.get('[data-testid="calendar-source-handoff"]').text()).toContain(
      '尚未创建日程',
    )
    expect(wrapper.get('[data-testid="calendar-editor-title-zh"]').element.value).toBe(
      '综合健康体检',
    )
    expect(wrapper.get('[data-testid="calendar-editor-title-en"]').element.value).toBe(
      'Comprehensive health checkup',
    )
    expect(wrapper.get('[data-testid="calendar-editor-starts-at"]').element.value).toBe(
      '2026-08-28T07:50',
    )
    expect(wrapper.get('[data-testid="calendar-editor-ends-at"]').element.value).toBe(
      '2026-08-28T10:50',
    )
    expect(wrapper.get('[data-testid="calendar-editor-selected-place"]').text()).toContain(
      '首尔大学医院',
    )

    await wrapper.get('.calendar-editor__close').trigger('click')
    await flushUi()
    expect(wrapper.find('[data-testid="calendar-event-editor"]').exists()).toBe(false)
    expect(calendarStore.confirmedEvents).toHaveLength(0)

    await wrapper.get('[data-testid="calendar-source-handoff-return"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value.path).toBe('/mail')
    expect(calendarStore.confirmedEvents).toHaveLength(0)

    await router.push({
      path: '/calendar',
      query: {
        source: 'mail',
        sourceRecordId: 'mail_fixture_snuh_checkup_1',
      },
    })
    await flushUi()
    await wrapper.get('[data-testid="calendar-source-handoff-review"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="calendar-event-editor"]').trigger('submit')
    await flushUi()

    expect(calendarStore.confirmedEvents).toHaveLength(1)
    expect(calendarStore.confirmedEvents[0]).toMatchObject({
      source: 'schedule_handoff',
      titleZh: '综合健康体检',
      titleEn: 'Comprehensive health checkup',
      startsAt: new Date(2026, 7, 28, 7, 50, 0, 0).getTime(),
      endsAt: new Date(2026, 7, 28, 10, 50, 0, 0).getTime(),
      locationRef: {
        owner: 'map',
        mapPackId: 'real-seoul-v1',
        placeId: 'seoul-national-university-hospital',
      },
      sourceRef: {
        idempotencyKey: 'schedule_handoff::mail::mail_fixture_snuh_checkup_1',
        sourceOwner: 'mail',
        sourceRecordId: 'mail_fixture_snuh_checkup_1',
        sourceRevision: 'fixture-2026-08-25-v1',
      },
    })
    expect(wrapper.get('[data-testid="calendar-source-handoff"]').text()).toContain(
      '已关联日程',
    )
    expect(wrapper.find('[data-testid="calendar-source-handoff-review"]').exists()).toBe(false)

    wrapper.unmount()

    const reopenedWrapper = mount(CalendarView, { global: { plugins: [router] } })
    await flushUi()
    expect(reopenedWrapper.find('[data-testid="calendar-event-editor"]').exists()).toBe(false)
    expect(reopenedWrapper.get('[data-testid="calendar-source-handoff"]').text()).toContain(
      '已关联日程',
    )
    expect(reopenedWrapper.get('[data-testid="calendar-selected-event-detail"]').text()).toContain(
      '综合健康体检',
    )
    expect(calendarStore.confirmedEvents).toHaveLength(1)

    await reopenedWrapper.get('[data-testid="calendar-view-event-source"]').trigger('click')
    await flushUi()
    expect(router.currentRoute.value).toMatchObject({
      path: '/mail',
      query: { sourceRecordId: 'mail_fixture_snuh_checkup_1' },
    })
    expect(calendarStore.confirmedEvents).toHaveLength(1)
    reopenedWrapper.unmount()
  })

  test('fails closed for a forged Mail handoff record ID', async () => {
    const calendarStore = useCalendarStore()
    const router = createTestRouter()
    await router.push({
      path: '/calendar',
      query: { source: 'mail', sourceRecordId: 'mail_fixture_forged' },
    })
    await router.isReady()
    const wrapper = mount(CalendarView, { global: { plugins: [router] } })
    await flushUi()

    expect(wrapper.get('[data-testid="calendar-source-handoff"]').text()).toContain(
      '无法验证这封邮件的预约信息',
    )
    expect(wrapper.find('[data-testid="calendar-source-handoff-review"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="calendar-event-editor"]').exists()).toBe(false)
    expect(calendarStore.confirmedEvents).toHaveLength(0)

    wrapper.unmount()
  })

  test('creates and edits a recurring Map-linked event through the unified editor', async () => {
    const calendarStore = useCalendarStore()
    const router = createTestRouter()
    await router.push('/calendar')
    await router.isReady()
    const wrapper = mount(CalendarView, { global: { plugins: [router] } })
    await flushUi()

    await wrapper.get('[data-testid="calendar-create-event"]').trigger('click')
    await flushUi()
    expect(wrapper.get('[data-testid="calendar-event-editor"]').attributes('role')).toBe('dialog')

    await wrapper.get('[data-testid="calendar-editor-title-zh"]').setValue('练习室月度检查')
    await wrapper.get('[data-testid="calendar-editor-title-en"]').setValue('Monthly studio check')
    await wrapper.get('[data-testid="calendar-editor-starts-at"]').setValue('2026-08-15T13:00')
    await wrapper.get('[data-testid="calendar-editor-ends-at"]').setValue('2026-08-15T14:30')
    await wrapper.get('[data-testid="calendar-editor-recurrence"]').setValue('monthly')
    await flushUi()
    await wrapper
      .get('[data-testid="calendar-editor-recurrence-until"]')
      .setValue('2026-11-30')
    await wrapper.get('[data-testid="calendar-editor-reminder-lead"]').setValue('30')
    await wrapper.get('[data-testid="calendar-editor-place-search"]').setValue('SM')
    await flushUi()
    await wrapper.get('[data-testid="calendar-editor-place-seoul-sm-hq"]').trigger('click')
    await wrapper.get('[data-testid="calendar-event-editor"]').trigger('submit')
    await flushUi()

    expect(calendarStore.confirmedEvents).toHaveLength(1)
    const created = calendarStore.confirmedEvents[0]
    expect(created).toMatchObject({
      titleZh: '练习室月度检查',
      recurrence: 'monthly',
      reminderLeadMinutes: 30,
      requirement: 'required',
      locationRef: {
        owner: 'map',
        mapPackId: 'real-seoul-v1',
        placeId: 'seoul-sm-hq',
      },
    })
    expect(created.endsAt - created.startsAt).toBe(90 * 60_000)
    expect(wrapper.get('[data-testid="calendar-selected-event-detail"]').text()).toContain(
      '练习室月度检查',
    )
    expect(wrapper.get(`[data-testid="calendar-event-departure-${created.id}"]`).exists()).toBe(
      true,
    )

    await wrapper.get('[data-testid="calendar-edit-selected-event"]').trigger('click')
    await flushUi()
    await wrapper.get('[data-testid="calendar-editor-title-zh"]').setValue('练习室月度复盘')
    await wrapper.get('[data-testid="calendar-editor-reminder-lead"]').setValue('60')
    await wrapper.get('[data-testid="calendar-event-editor"]').trigger('submit')
    await flushUi()

    expect(calendarStore.findEventById(created.id)).toMatchObject({
      titleZh: '练习室月度复盘',
      reminderLeadMinutes: 60,
    })
    expect(wrapper.get('[data-testid="calendar-selected-event-detail"]').text()).toContain(
      '练习室月度复盘',
    )

    wrapper.unmount()
  })

  test('validates an all-day multi-day range and stores its exclusive end correctly', async () => {
    const calendarStore = useCalendarStore()
    const router = createTestRouter()
    await router.push('/calendar')
    await router.isReady()
    const wrapper = mount(CalendarView, { global: { plugins: [router] } })
    await flushUi()

    await wrapper.get('[data-testid="calendar-create-event"]').trigger('click')
    await wrapper.get('[data-testid="calendar-editor-title-zh"]').setValue('三日演出')
    await wrapper.get('[data-testid="calendar-editor-all-day"]').setValue(true)
    await flushUi()
    await wrapper.get('[data-testid="calendar-editor-start-date"]').setValue('2026-08-20')
    await wrapper.get('[data-testid="calendar-editor-end-date"]').setValue('2026-08-19')
    await wrapper.get('[data-testid="calendar-event-editor"]').trigger('submit')
    await flushUi()
    expect(wrapper.get('[data-testid="calendar-editor-validation"]').text()).toContain(
      '结束时间必须晚于开始时间',
    )

    await wrapper.get('[data-testid="calendar-editor-end-date"]').setValue('2026-08-22')
    await wrapper.get('[data-testid="calendar-event-editor"]').trigger('submit')
    await flushUi()

    const event = calendarStore.confirmedEvents[0]
    expect(event.allDay).toBe(true)
    expect(event.startsAt).toBe(new Date(2026, 7, 20, 0, 0, 0, 0).getTime())
    expect(event.endsAt).toBe(new Date(2026, 7, 23, 0, 0, 0, 0).getTime())
    expect(wrapper.find(`[data-testid="calendar-event-time-${event.id}"]`).exists()).toBe(false)

    wrapper.unmount()
  })
})
