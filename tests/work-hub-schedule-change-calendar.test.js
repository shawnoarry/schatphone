import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCalendarStore } from '../src/stores/calendar'
import { useSimulationStore } from '../src/stores/simulation'
import { useWorkHubStore } from '../src/stores/workHub'
import {
  respondToWorkScheduleChangeEvent,
  startWorkScheduleChangeEvent,
} from '../src/lib/simulation/work-hub-event-runtime'
import {
  createWorkHubAuthorityFixture,
  createWorkHubScheduleChangeAuthorityFixture,
} from './work-hub-contracts.test'

const NOW = new Date('2026-08-30T09:00:00+08:00').getTime()

describe('Work Hub schedule change Calendar review', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('keeps the old Calendar truth until explicit Save, then updates the same event with lineage', async () => {
    const workHubStore = useWorkHubStore()
    const simulationStore = useSimulationStore()
    const calendarStore = useCalendarStore()
    await vi.waitFor(() => expect(workHubStore.hasFinishedStorageHydration).toBe(true))

    const initial = createWorkHubAuthorityFixture()
    expect(workHubStore.installAuthorityPackage(initial, {
      expectedBinding: initial.worldBinding,
      confirmed: true,
      now: NOW,
    })).toMatchObject({ ok: true })
    expect(workHubStore.decideRecord(
      'schedule_proposal',
      'proposal_weekly_sync',
      'accepted',
      { now: NOW + 1 },
    )).toMatchObject({ ok: true })
    const originalHandoff = workHubStore.resolveScheduleHandoffDraft('proposal_weekly_sync')
    const originalEvent = calendarStore.createEventFromScheduleHandoff({
      event: {
        titleZh: originalHandoff.proposedTitleZh,
        titleEn: originalHandoff.proposedTitleEn,
        startsAt: originalHandoff.proposedStartsAt,
        endsAt: originalHandoff.proposedEndsAt,
      },
      handoffDraft: originalHandoff,
    })
    expect(originalEvent).not.toBeNull()

    const changedAuthority = createWorkHubScheduleChangeAuthorityFixture()
    expect(workHubStore.installAuthorityPackage(changedAuthority, {
      expectedBinding: changedAuthority.worldBinding,
      confirmed: true,
      replaceExisting: true,
      now: NOW + 2,
    })).toMatchObject({ ok: true })
    expect(workHubStore.receiptForSource('schedule_proposal', 'proposal_weekly_sync')).toMatchObject({
      action: 'accepted',
    })

    const started = startWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      proposalId: 'proposal_weekly_sync_change_1',
      randomValue: 0,
      now: NOW + 3,
    })
    expect(respondToWorkScheduleChangeEvent({
      workHubStore,
      simulationStore,
      instanceId: started.instance.id,
      action: 'accepted',
      now: NOW + 4,
    })).toMatchObject({ ok: true })

    const changeHandoff = workHubStore.resolveScheduleHandoffDraft('proposal_weekly_sync_change_1')
    expect(changeHandoff).toMatchObject({
      proposalStatus: 'source_changed',
      replacesSourceRef: { sourceRecordId: 'proposal_weekly_sync' },
    })
    expect(calendarStore.events).toHaveLength(1)
    expect(calendarStore.findEventByScheduleHandoffSource(
      'workplace',
      'proposal_weekly_sync_change_1',
    )).toBeNull()
    expect(calendarStore.findEventById(originalEvent.id)).toMatchObject({
      startsAt: originalHandoff.proposedStartsAt,
    })

    const updated = calendarStore.createEventFromScheduleHandoff({
      event: {
        titleZh: changeHandoff.proposedTitleZh,
        titleEn: changeHandoff.proposedTitleEn,
        startsAt: changeHandoff.proposedStartsAt,
        endsAt: changeHandoff.proposedEndsAt,
      },
      handoffDraft: changeHandoff,
    })
    expect(updated).toMatchObject({
      id: originalEvent.id,
      startsAt: changeHandoff.proposedStartsAt,
      sourceRef: { sourceRecordId: 'proposal_weekly_sync_change_1' },
    })
    expect(calendarStore.events).toHaveLength(1)
    expect(calendarStore.findEventByScheduleHandoffSource('workplace', 'proposal_weekly_sync')).toMatchObject({
      id: originalEvent.id,
    })
    expect(calendarStore.findEventByScheduleHandoffSource(
      'workplace',
      'proposal_weekly_sync_change_1',
    )).toMatchObject({ id: originalEvent.id })
  })
})
