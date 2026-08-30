import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createCalendarOccurrenceFingerprint } from '../src/lib/schedule-orchestrator'
import { startAgendaJourneyRuntime } from '../src/lib/agenda-journey-runtime'
import { inspectWorkScheduleExecutionEligibility } from '../src/lib/work-schedule-execution'
import { useCalendarStore } from '../src/stores/calendar'
import { useSimulationStore } from '../src/stores/simulation'
import { useWorkHubStore } from '../src/stores/workHub'
import { useAgendaJourneyStore } from '../src/stores/agendaJourney'
import { useScheduleOrchestratorStore } from '../src/stores/scheduleOrchestrator'
import { useSystemStore } from '../src/stores/system'
import {
  respondToWorkScheduleChangeEvent,
  startWorkScheduleChangeEvent,
} from '../src/lib/simulation/work-hub-event-runtime'
import {
  createWorkHubAuthorityFixture,
  createWorkHubScheduleChangeAuthorityFixture,
} from './work-hub-contracts.test'

const NOW = new Date('2026-08-30T09:00:00+08:00').getTime()

const createVerifiedFlow = async () => {
  const workHubStore = useWorkHubStore()
  const simulationStore = useSimulationStore()
  const calendarStore = useCalendarStore()
  await vi.waitFor(() => expect(workHubStore.hasFinishedStorageHydration).toBe(true))

  const originalAuthority = createWorkHubAuthorityFixture()
  workHubStore.installAuthorityPackage(originalAuthority, {
    expectedBinding: originalAuthority.worldBinding,
    confirmed: true,
    now: NOW,
  })
  workHubStore.decideRecord('schedule_proposal', 'proposal_weekly_sync', 'accepted', {
    now: NOW + 1,
  })
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

  const authority = createWorkHubScheduleChangeAuthorityFixture()
  workHubStore.installAuthorityPackage(authority, {
    expectedBinding: authority.worldBinding,
    confirmed: true,
    replaceExisting: true,
    now: NOW + 2,
  })
  const started = startWorkScheduleChangeEvent({
    workHubStore,
    simulationStore,
    proposalId: 'proposal_weekly_sync_change_1',
    randomValue: 0,
    now: NOW + 3,
  })
  respondToWorkScheduleChangeEvent({
    workHubStore,
    simulationStore,
    instanceId: started.instance.id,
    action: 'accepted',
    now: NOW + 4,
  })
  const changeHandoff = workHubStore.resolveScheduleHandoffDraft('proposal_weekly_sync_change_1')
  const calendarEvent = calendarStore.createEventFromScheduleHandoff({
    event: {
      titleZh: changeHandoff.proposedTitleZh,
      titleEn: changeHandoff.proposedTitleEn,
      startsAt: changeHandoff.proposedStartsAt,
      endsAt: changeHandoff.proposedEndsAt,
    },
    handoffDraft: changeHandoff,
  })
  expect(calendarEvent.id).toBe(originalEvent.id)
  return { authority, workHubStore, simulationStore, calendarStore, calendarEvent }
}

describe('Work schedule execution proof', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    localStorage.clear()
    setActivePinia(createPinia())
  })

  test('verifies the exact accepted Work Hub change chain without a model', async () => {
    const { authority, workHubStore, simulationStore, calendarEvent } = await createVerifiedFlow()
    const result = inspectWorkScheduleExecutionEligibility({
      calendarEvent,
      calendarFingerprint: createCalendarOccurrenceFingerprint(calendarEvent),
      authorityPackage: workHubStore.authorityPackage,
      expectedBinding: authority.worldBinding,
      receipts: workHubStore.receipts,
      eventInstances: simulationStore.eventInstancesV2,
      ownerFacts: simulationStore.ownerFacts,
      now: NOW + 5,
    })
    expect(result).toMatchObject({
      ok: true,
      proofRequired: true,
      code: 'work_schedule_execution_verified',
      proof: {
        calendarEventId: calendarEvent.id,
        eventInstanceId: expect.stringContaining('organization.work_schedule_change.v1'),
        proposalId: 'proposal_weekly_sync_change_1',
        previousProposalId: 'proposal_weekly_sync',
        worldId: 'world_test',
        contactsProfileId: '101',
      },
    })
  })

  test('fails closed when receipt, owner fact, binding, or Calendar lineage is stale', async () => {
    const { authority, workHubStore, simulationStore, calendarEvent } = await createVerifiedFlow()
    const common = {
      calendarEvent,
      calendarFingerprint: createCalendarOccurrenceFingerprint(calendarEvent),
      authorityPackage: workHubStore.authorityPackage,
      expectedBinding: authority.worldBinding,
      receipts: workHubStore.receipts,
      eventInstances: simulationStore.eventInstancesV2,
      ownerFacts: simulationStore.ownerFacts,
      now: NOW + 5,
    }
    expect(inspectWorkScheduleExecutionEligibility({ ...common, receipts: [] }).code)
      .toBe('work_hub_acceptance_receipt_missing')
    expect(inspectWorkScheduleExecutionEligibility({ ...common, ownerFacts: [] }).code)
      .toBe('work_schedule_change_owner_fact_missing')
    expect(inspectWorkScheduleExecutionEligibility({
      ...common,
      expectedBinding: { ...authority.worldBinding, worldRevision: 4 },
    }).ok).toBe(false)
    expect(inspectWorkScheduleExecutionEligibility({
      ...common,
      calendarEvent: { ...calendarEvent, sourceRef: { ...calendarEvent.sourceRef, previousSourceRefs: [] } },
    })).toMatchObject({
      ok: false,
      proofRequired: true,
      code: 'calendar_previous_source_missing',
    })
    expect(inspectWorkScheduleExecutionEligibility({
      ...common,
      calendarEvent: { ...calendarEvent, startsAt: calendarEvent.startsAt + 60_000 },
    })).toMatchObject({
      ok: false,
      code: 'calendar_schedule_handoff_mismatch',
    })
  })

  test('leaves manual and preview schedule handoffs on the ordinary execution path', () => {
    expect(inspectWorkScheduleExecutionEligibility({
      calendarEvent: { id: 'manual', source: 'manual' },
      calendarFingerprint: 'manual-fingerprint',
    })).toMatchObject({ ok: true, proofRequired: false })
    expect(inspectWorkScheduleExecutionEligibility({
      calendarEvent: {
        id: 'preview',
        sourceRef: {
          sourceOwner: 'workplace',
          sourceRecordId: 'proposal-radio-20260827',
          sourceRevision: 'fixture-2026-08-26-v1',
          sourceReturnContext: { path: '/workplace', query: { section: 'work' } },
          previousSourceRefs: [{
            sourceOwner: 'workplace',
            sourceRecordId: 'preview-old',
            sourceRevision: 'fixture-old',
          }],
        },
      },
      calendarFingerprint: 'preview-fingerprint',
    })).toMatchObject({ ok: true, proofRequired: false })
  })

  test('materializes the explicitly saved change into Agenda with exact proof and one notification', async () => {
    const {
      workHubStore,
      simulationStore,
      calendarStore,
      calendarEvent,
    } = await createVerifiedFlow()
    const orchestrator = useScheduleOrchestratorStore()
    const agenda = useAgendaJourneyStore()
    const system = useSystemStore()
    await vi.waitFor(() => {
      expect(workHubStore.hasFinishedStorageHydration).toBe(true)
      expect(simulationStore.hasFinishedStorageHydration).toBe(true)
      expect(orchestrator.hasFinishedStorageHydration).toBe(true)
      expect(agenda.hasFinishedStorageHydration).toBe(true)
      expect(system.hasFinishedStorageHydration).toBe(true)
    })
    system.settings.appearance.soundEffectsEnabled = false
    system.settings.appearance.hapticFeedbackEnabled = false
    expect(calendarStore.saveNow()).toMatchObject({ ok: true })
    const materializedAt = calendarEvent.startsAt - 23 * 60 * 60 * 1000
    orchestrator.reconcileCalendarSnapshot(calendarStore.events, { now: materializedAt })
    const runtime = startAgendaJourneyRuntime({
      pinia: null,
      windowRef: {
        setTimeout: vi.fn(() => 1),
        clearTimeout: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        document: {
          visibilityState: 'visible',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
      now: () => materializedAt,
    })
    const result = await runtime.reconcile()
    expect(result).toMatchObject({ materialized: 1, agendaJourneyCount: 1 })
    expect(agenda.journeys[0]).toMatchObject({
      sourceCalendarEventId: calendarEvent.id,
      executionProof: {
        kind: 'work_schedule_change_execution',
        proposalId: 'proposal_weekly_sync_change_1',
        acceptedReceiptId: expect.stringContaining('receipt::schedule_proposal'),
        ownerFactId: expect.stringContaining('owner_fact::event::'),
      },
      sourceReviewRequired: false,
    })
    expect(system.notifications).toHaveLength(1)
    expect(system.notifications[0].route).toContain('/agenda-journey?journeyId=')
    runtime.stop()
  })
})
