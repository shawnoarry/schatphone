import { beforeEach, describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import WorkHubProductionWorkspace from '../src/components/workplace/WorkHubProductionWorkspace.vue'
import { useWorkHubStore } from '../src/stores/workHub'
import { useCalendarStore } from '../src/stores/calendar'
import { useSimulationStore } from '../src/stores/simulation'
import {
  startWorkScheduleChangeEvent,
} from '../src/lib/simulation/work-hub-event-runtime'
import {
  createWorkHubAuthorityFixture,
  createWorkHubScheduleChangeAuthorityFixture,
} from './work-hub-contracts.test'

const NOW = new Date('2026-08-30T09:00:00+08:00').getTime()
const DummyView = { template: '<div />' }

const mountProductionWorkspace = async ({
  fixture = createWorkHubAuthorityFixture(),
  prepare = null,
} = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', component: DummyView },
      { path: '/workplace', component: DummyView },
      { path: '/calendar', component: DummyView },
    ],
  })
  await router.push('/workplace?homePage=1')
  await router.isReady()
  const store = useWorkHubStore()
  await vi.waitFor(() => expect(store.hasFinishedStorageHydration).toBe(true))
  store.installAuthorityPackage(fixture, {
    expectedBinding: fixture.worldBinding,
    confirmed: true,
    now: NOW,
  })
  if (typeof prepare === 'function') await prepare({ pinia, router, store, fixture })
  const wrapper = mount(WorkHubProductionWorkspace, {
    props: { appName: '工作台' },
    global: { plugins: [router, pinia] },
  })
  return { router, wrapper, store }
}

describe('Work Hub production workspace', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
  })

  test('shows world-neutral organization work and keeps Calendar creation explicit', async () => {
    const { router, wrapper } = await mountProductionWorkspace()
    expect(wrapper.get('[data-testid="work-hub-production"]').text()).toContain('北桥研习社')
    expect(wrapper.get('[data-testid="work-hub-task-task_prepare_notes"]').text()).toContain('准备讨论要点')

    await wrapper.get('[data-testid="work-hub-accept-proposal_weekly_sync"]').trigger('click')
    expect(useCalendarStore().findEventByScheduleHandoffSource('workplace', 'proposal_weekly_sync')).toBeNull()
    expect(wrapper.get('[data-testid="work-hub-proposal-proposal_weekly_sync"]').text()).toContain('等待你在日历保存')

    await wrapper.get('[data-testid="work-hub-open-calendar-proposal_weekly_sync"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value).toMatchObject({
      path: '/calendar',
      query: { source: 'workplace', sourceRecordId: 'proposal_weekly_sync', homePage: '1' },
    })
    wrapper.unmount()
  })

  test('persists adjustment requests and explicit task status reports', async () => {
    const { wrapper, store } = await mountProductionWorkspace()
    const notice = wrapper.get('[data-testid="work-hub-notice-notice_weekly_sync"]')
    await notice.get('textarea').setValue('希望改到下午。')
    await notice.findAll('button')[1].trigger('click')
    expect(store.receipts[0]).toMatchObject({
      action: 'adjustment_requested',
      note: '希望改到下午。',
    })

    const task = wrapper.get('[data-testid="work-hub-task-task_prepare_notes"]')
    await task.get('input').setValue('资料已经整理一半。')
    await task.findAll('button')[1].trigger('click')
    expect(store.statusReports.at(-1)).toMatchObject({
      statusKey: 'needs_support',
      note: '资料已经整理一半。',
    })
    wrapper.unmount()
  })

  test('handles one schedule change through the native event request without creating Calendar truth', async () => {
    const fixture = createWorkHubScheduleChangeAuthorityFixture()
    const { wrapper, store } = await mountProductionWorkspace({
      fixture,
      prepare: ({ store: workHubStore }) => {
        const started = startWorkScheduleChangeEvent({
          workHubStore,
          simulationStore: useSimulationStore(),
          proposalId: 'proposal_weekly_sync_change_1',
          randomValue: 0,
          now: NOW,
        })
        expect(started.instance.pendingOwnerRequests).toHaveLength(1)
      },
    })
    const proposal = wrapper.get('[data-testid="work-hub-proposal-proposal_weekly_sync_change_1"]')
    expect(proposal.text()).toContain('日程变更')
    expect(proposal.text()).toContain('协调人调整了共同工作时间')

    await proposal.get('[data-testid="work-hub-accept-proposal_weekly_sync_change_1"]').trigger('click')
    expect(store.receiptForSource('schedule_proposal', 'proposal_weekly_sync_change_1')).toMatchObject({
      action: 'accepted',
    })
    expect(useSimulationStore().eventInstancesV2[0]).toMatchObject({
      lifecycle: 'resolved',
      resultCodes: ['schedule_change_accepted'],
    })
    expect(useCalendarStore().events).toEqual([])
    expect(proposal.text()).toContain('等待你在日历保存')
    wrapper.unmount()
  })
})
