import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSimulationStore } from '../src/stores/simulation'
import { useWorkHubStore } from '../src/stores/workHub'
import {
  WORK_HUB_SCHEDULE_CHANGE_RESULT,
} from '../src/lib/simulation/work-hub-event-templates'
import {
  WORK_HUB_SCHEDULE_CHANGE_EVENT_POLICY,
  reconcileWorkScheduleChangeEvent,
  respondToWorkScheduleChangeEvent,
  startWorkScheduleChangeEvent,
} from '../src/lib/simulation/work-hub-event-runtime'
import {
  createWorkHubScheduleChangeAuthorityFixture,
} from './work-hub-contracts.test'

const NOW = new Date('2026-08-30T09:00:00+08:00').getTime()
const HOUR = 60 * 60 * 1000

const installFixture = async (fixture = createWorkHubScheduleChangeAuthorityFixture()) => {
  const workHubStore = useWorkHubStore()
  const simulationStore = useSimulationStore()
  await vi.waitFor(() => expect(workHubStore.hasFinishedStorageHydration).toBe(true))
  expect(workHubStore.installAuthorityPackage(fixture, {
    expectedBinding: fixture.worldBinding,
    confirmed: true,
    now: NOW,
  })).toMatchObject({ ok: true })
  return { fixture, workHubStore, simulationStore }
}

describe('Work Hub schedule change event family', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test.each([
    ['accepted', WORK_HUB_SCHEDULE_CHANGE_RESULT.ACCEPTED],
    ['adjustment_requested', WORK_HUB_SCHEDULE_CHANGE_RESULT.ADJUSTMENT_REQUESTED],
    ['declined', WORK_HUB_SCHEDULE_CHANGE_RESULT.DECLINED],
  ])('creates one native request and resolves %s through an owner fact', async (action, resultCode) => {
    const { workHubStore, simulationStore } = await installFixture()
    const started = startWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      proposalId: 'proposal_weekly_sync_change_1',
      randomValue: 0,
      now: NOW,
    })
    expect(started).toMatchObject({ ok: true, created: true })
    expect(simulationStore.listPendingOwnerActionRequests('work_hub')).toHaveLength(1)
    expect(simulationStore.eventLogs[0]).toMatchObject({
      moduleKey: 'work_hub',
      targetId: 'proposal_weekly_sync_change_1',
    })

    const resolved = respondToWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      instanceId: started.instance.id,
      action,
      note: action === 'adjustment_requested' ? '希望再晚一小时。' : '',
      now: NOW + 1,
    })
    expect(resolved).toMatchObject({
      ok: true,
      instance: { lifecycle: 'resolved', resultCodes: [resultCode] },
      decision: { receipt: { action } },
    })
    expect(simulationStore.listPendingOwnerActionRequests('work_hub')).toHaveLength(0)
  })

  test('persists the random miss as an explicit no-event result while leaving ordinary work usable', async () => {
    const { workHubStore, simulationStore } = await installFixture()
    const result = startWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      proposalId: 'proposal_weekly_sync_change_1',
      randomValue: 0.99,
      now: NOW,
    })
    expect(result).toMatchObject({
      ok: true,
      instance: {
        lifecycle: 'resolved',
        resultCodes: [WORK_HUB_SCHEDULE_CHANGE_RESULT.RANDOM_MISS],
      },
    })
    expect(workHubStore.decideRecord(
      'schedule_proposal',
      'proposal_weekly_sync_change_1',
      'accepted',
      { now: NOW + 1 },
    )).toMatchObject({ ok: true })
  })

  test('records policy-off, cooldown, and daily-cap outcomes deterministically', async () => {
    const { fixture, workHubStore, simulationStore } = await installFixture()
    simulationStore.setModuleEventsEnabled('work_hub', false)
    const policyOff = startWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      proposalId: 'proposal_weekly_sync_change_1',
      randomValue: 0,
      now: NOW,
    })
    expect(policyOff.instance.resultCodes).toEqual([WORK_HUB_SCHEDULE_CHANGE_RESULT.POLICY_OFF])

    setActivePinia(createPinia())
    localStorage.clear()
    const secondFixture = createWorkHubScheduleChangeAuthorityFixture()
    const installed = await installFixture(secondFixture)
    const first = startWorkScheduleChangeEvent({
      workHubStore: installed.workHubStore,
      simulationStore: installed.simulationStore,
      proposalId: 'proposal_weekly_sync_change_1',
      randomValue: 0,
      now: NOW,
    })
    expect(first.instance.pendingOwnerRequests).toHaveLength(1)
    const prior = secondFixture.scheduleProposals[0]
    const changedAgain = {
      ...secondFixture.scheduleProposals[1],
      id: 'proposal_weekly_sync_change_2',
      changeOfRef: { recordId: prior.id, revision: prior.revision },
      startsAt: prior.startsAt + 4 * HOUR,
      endsAt: prior.endsAt + 4 * HOUR,
    }
    const replacement = {
      ...secondFixture,
      revision: 3,
      scheduleProposals: [...secondFixture.scheduleProposals, changedAgain],
    }
    expect(installed.workHubStore.installAuthorityPackage(replacement, {
      expectedBinding: replacement.worldBinding,
      confirmed: true,
      replaceExisting: true,
      now: NOW + 1,
    })).toMatchObject({ ok: true })
    const cooldown = startWorkScheduleChangeEvent({
      workHubStore: installed.workHubStore,
      simulationStore: installed.simulationStore,
      proposalId: changedAgain.id,
      randomValue: 0,
      now: NOW + 1,
    })
    expect(cooldown.instance.resultCodes).toEqual([WORK_HUB_SCHEDULE_CHANGE_RESULT.COOLDOWN])

    expect(fixture.scheduleProposals).toHaveLength(2)
  })

  test('enforces the per-organization daily cap when cooldown is disabled', async () => {
    const fixture = createWorkHubScheduleChangeAuthorityFixture()
    const firstChange = fixture.scheduleProposals[1]
    fixture.scheduleProposals.push({
      ...firstChange,
      id: 'proposal_weekly_sync_change_2',
      startsAt: firstChange.startsAt + HOUR,
      endsAt: firstChange.endsAt + HOUR,
    })
    const { workHubStore, simulationStore } = await installFixture(fixture)
    const policy = {
      ...WORK_HUB_SCHEDULE_CHANGE_EVENT_POLICY,
      cooldownMs: 0,
      dailyLimit: 1,
    }
    const first = startWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      proposalId: firstChange.id,
      randomValue: 0,
      now: NOW,
      policy,
    })
    expect(first.instance.pendingOwnerRequests).toHaveLength(1)
    const capped = startWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      proposalId: 'proposal_weekly_sync_change_2',
      randomValue: 0,
      now: NOW + 1,
      policy,
    })
    expect(capped.instance.resultCodes).toEqual([
      WORK_HUB_SCHEDULE_CHANGE_RESULT.DAILY_LIMIT,
    ])
  })

  test('expires from the exact proposal deadline without inferring a user decision', async () => {
    const deadlineAt = NOW + 10 * 60 * 1000
    const { workHubStore, simulationStore } = await installFixture(
      createWorkHubScheduleChangeAuthorityFixture({ deadlineAt }),
    )
    const started = startWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      proposalId: 'proposal_weekly_sync_change_1',
      randomValue: 0,
      now: NOW,
    })
    const expired = reconcileWorkScheduleChangeEvent({
      simulationStore,
      instanceId: started.instance.id,
      now: deadlineAt + 1,
    })
    expect(expired).toMatchObject({
      ok: true,
      instance: {
        lifecycle: 'resolved',
        resultCodes: [WORK_HUB_SCHEDULE_CHANGE_RESULT.EXPIRED],
      },
    })
    expect(workHubStore.receipts).toEqual([])
  })

  test('rejects cross-revision response as stale and handles source revocation explicitly', async () => {
    const { fixture, workHubStore, simulationStore } = await installFixture()
    const started = startWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      proposalId: 'proposal_weekly_sync_change_1',
      randomValue: 0,
      now: NOW,
    })
    const replacement = {
      ...fixture,
      revision: 3,
      scheduleProposals: fixture.scheduleProposals.map((proposal) =>
        proposal.id === 'proposal_weekly_sync_change_1'
          ? { ...proposal, revokedAt: NOW + 1 }
          : proposal,
      ),
    }
    expect(workHubStore.installAuthorityPackage(replacement, {
      expectedBinding: replacement.worldBinding,
      confirmed: true,
      replaceExisting: true,
      now: NOW + 2,
    })).toMatchObject({ ok: true })
    const revoked = respondToWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      instanceId: started.instance.id,
      action: 'accepted',
      now: NOW + 2,
    })
    expect(revoked.instance).toMatchObject({
      lifecycle: 'cancelled',
      resultCodes: [WORK_HUB_SCHEDULE_CHANGE_RESULT.REVOKED],
    })
    expect(workHubStore.receipts).toEqual([])
  })

  test('rolls Work Hub back when Simulation cannot persist the correlated fact', async () => {
    const { workHubStore, simulationStore } = await installFixture()
    const started = startWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      proposalId: 'proposal_weekly_sync_change_1',
      randomValue: 0,
      now: NOW,
    })
    const originalSetItem = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (String(key).includes('store:simulation')) throw new DOMException('quota', 'QuotaExceededError')
      return originalSetItem.call(this, key, value)
    })
    const result = respondToWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      instanceId: started.instance.id,
      action: 'accepted',
      now: NOW + 1,
    })
    expect(result).toMatchObject({ ok: false, workHubRolledBack: true })
    expect(workHubStore.receipts).toEqual([])
    expect(simulationStore.getEventInstanceV2(started.instance.id)).toMatchObject({ lifecycle: 'active' })
    spy.mockRestore()
  })

  test('records an explicit write-failure result when Work Hub persistence rejects the response', async () => {
    const { workHubStore, simulationStore } = await installFixture()
    const started = startWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      proposalId: 'proposal_weekly_sync_change_1',
      randomValue: 0,
      now: NOW,
    })
    const originalSetItem = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (String(key).includes('store:work-hub')) throw new DOMException('quota', 'QuotaExceededError')
      return originalSetItem.call(this, key, value)
    })
    const result = respondToWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      instanceId: started.instance.id,
      action: 'accepted',
      now: NOW + 1,
    })
    expect(result).toMatchObject({
      ok: true,
      instance: {
        lifecycle: 'failed',
        resultCodes: [WORK_HUB_SCHEDULE_CHANGE_RESULT.WRITE_FAILED],
      },
      decision: { code: 'persistence_failed', rolledBack: true },
    })
    expect(workHubStore.receipts).toEqual([])
    spy.mockRestore()
  })

  test('restores the event, owner fact, policy ledger, and Work Hub receipt after reopen', async () => {
    const { workHubStore, simulationStore } = await installFixture()
    const started = startWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      proposalId: 'proposal_weekly_sync_change_1',
      randomValue: 0,
      now: NOW,
    })
    respondToWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      instanceId: started.instance.id,
      action: 'accepted',
      now: NOW + 1,
    })

    setActivePinia(createPinia())
    const reopenedWorkHub = useWorkHubStore()
    const reopenedSimulation = useSimulationStore()
    expect(reopenedWorkHub.receiptForSource(
      'schedule_proposal',
      'proposal_weekly_sync_change_1',
    )).toMatchObject({ action: 'accepted' })
    expect(reopenedSimulation.getEventInstanceV2(started.instance.id)).toMatchObject({
      lifecycle: 'resolved',
      resultCodes: [WORK_HUB_SCHEDULE_CHANGE_RESULT.ACCEPTED],
      decisionLedger: [{ key: 'work_schedule_change_event_gate', outcome: 'triggered' }],
    })
    expect(reopenedSimulation.ownerFacts).toHaveLength(1)
  })
})
