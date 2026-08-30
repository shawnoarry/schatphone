import { describe, expect, test } from 'vitest'
import {
  AGENDA_JOURNEY_STATUS,
  AGENDA_JOURNEY_STEP_KIND,
  AGENDA_JOURNEY_STEP_STATUS,
  applyAgendaJourneyActivitySessionEvidence,
  cancelAgendaJourney,
  createManualAgendaJourney,
  evaluateAgendaJourneyDeadline,
  linkAgendaJourneyMapJourney,
  materializeCalendarAgendaJourney,
  reconcileAgendaJourneyMapEvidence,
  retireCalendarAgendaJourneySource,
  transitionAgendaJourneyActivityStep,
} from '../src/lib/agenda-journey'
import {
  createActivitySession,
  createActivitySessionCompletionEvidence,
  reconcileActivitySession,
  startActivitySession,
} from '../src/lib/activity-session'

const NOW = new Date('2026-08-16T09:00:00+08:00').getTime()
const HOUR_MS = 60 * 60 * 1000

const locationRef = {
  owner: 'map',
  mapPackId: 'real-seoul-v1',
  placeId: 'seoul-sm-hq',
  labelZh: 'SM 娱乐总部',
  labelEn: 'SM Entertainment HQ',
}

const occurrence = {
  id: 'calendar_event_rehearsal',
  sourceEventId: 'calendar_event_rehearsal',
  occurrenceId: `calendar_event_rehearsal::${NOW + HOUR_MS}`,
  titleZh: '舞台彩排',
  titleEn: 'Stage rehearsal',
  status: 'confirmed',
  requirement: 'required',
  startsAt: NOW + HOUR_MS,
  endsAt: NOW + 2 * HOUR_MS,
  locationRef,
}

const request = {
  orchestrationId: `schedule_orchestration::calendar_event_rehearsal::${NOW + HOUR_MS}`,
  sourceCalendarEventId: 'calendar_event_rehearsal',
  sourceOccurrenceId: occurrence.occurrenceId,
  occurrenceStartsAt: occurrence.startsAt,
  occurrenceEndsAt: occurrence.endsAt,
  calendarFingerprint: 'fingerprint-v1',
  agendaJourneyId: '',
  requestedAt: NOW,
}

describe('Agenda Journey contract', () => {
  test('materializes one stable Calendar-derived plan with separate travel and activity steps', () => {
    const first = materializeCalendarAgendaJourney({ occurrence, request, now: NOW })
    const second = materializeCalendarAgendaJourney({
      occurrence,
      request,
      existingJourney: first.journey,
      now: NOW + 1,
    })

    expect(first).toMatchObject({ ok: true, code: 'AGENDA_JOURNEY_CREATED' })
    expect(second.journey.id).toBe(first.journey.id)
    expect(second.journey.steps).toHaveLength(2)
    expect(second.journey.steps.map((step) => step.kind)).toEqual([
      AGENDA_JOURNEY_STEP_KIND.TRAVEL,
      AGENDA_JOURNEY_STEP_KIND.ACTIVITY,
    ])
    expect(second.journey.steps[0]).toMatchObject({
      status: AGENDA_JOURNEY_STEP_STATUS.AVAILABLE,
      completionPolicy: 'map_arrival',
      locationRef,
    })
    expect(second.journey.steps[1]).toMatchObject({
      status: AGENDA_JOURNEY_STEP_STATUS.PLANNED,
      completionPolicy: 'user_confirmation',
    })
  })

  test('reuses one untouched plan after a one-off Calendar reschedule', () => {
    const first = materializeCalendarAgendaJourney({ occurrence, request, now: NOW })
    const changedOccurrence = {
      ...occurrence,
      occurrenceId: `calendar_event_rehearsal::${occurrence.startsAt + HOUR_MS}`,
      startsAt: occurrence.startsAt + HOUR_MS,
      endsAt: occurrence.endsAt + HOUR_MS,
    }
    const changedRequest = {
      ...request,
      agendaJourneyId: first.journey.id,
      sourceOccurrenceId: changedOccurrence.occurrenceId,
      occurrenceStartsAt: changedOccurrence.startsAt,
      occurrenceEndsAt: changedOccurrence.endsAt,
      calendarFingerprint: 'fingerprint-v2',
    }
    const refreshed = materializeCalendarAgendaJourney({
      occurrence: changedOccurrence,
      request: changedRequest,
      existingJourney: first.journey,
      now: NOW + 1,
    })
    expect(refreshed).toMatchObject({ ok: true, code: 'AGENDA_JOURNEY_REFRESHED' })
    expect(refreshed.journey).toMatchObject({
      id: first.journey.id,
      scheduledStartsAt: changedOccurrence.startsAt,
      sourceReviewRequired: false,
      executionRevision: 'fingerprint-v2',
    })
  })

  test('preserves a started execution revision when Calendar changes', () => {
    const first = materializeCalendarAgendaJourney({ occurrence, request, now: NOW })
    const travelStep = first.journey.steps[0]
    const started = linkAgendaJourneyMapJourney(first.journey, travelStep.id, {
      ok: true,
      journeyId: 'map_journey_started',
      transportMode: 'public_transit',
    }, { now: NOW + 1 })
    const changedOccurrence = {
      ...occurrence,
      occurrenceId: `calendar_event_rehearsal::${occurrence.startsAt + HOUR_MS}`,
      startsAt: occurrence.startsAt + HOUR_MS,
      endsAt: occurrence.endsAt + HOUR_MS,
    }
    const refreshed = materializeCalendarAgendaJourney({
      occurrence: changedOccurrence,
      request: {
        ...request,
        agendaJourneyId: first.journey.id,
        sourceOccurrenceId: changedOccurrence.occurrenceId,
        occurrenceStartsAt: changedOccurrence.startsAt,
        occurrenceEndsAt: changedOccurrence.endsAt,
        calendarFingerprint: 'fingerprint-v2',
      },
      existingJourney: started.journey,
      now: NOW + 2,
    })
    expect(refreshed.journey).toMatchObject({
      id: first.journey.id,
      scheduledStartsAt: occurrence.startsAt,
      executionRevision: 'fingerprint-v1',
      sourceCalendarFingerprint: 'fingerprint-v2',
      sourceReviewRequired: true,
    })
  })

  test('accepts only linked Map Journey arrival as travel evidence and does not complete the activity', () => {
    const materialized = materializeCalendarAgendaJourney({ occurrence, request, now: NOW })
    const travelStep = materialized.journey.steps[0]
    const linked = linkAgendaJourneyMapJourney(
      materialized.journey,
      travelStep.id,
      {
        ok: true,
        journeyId: 'map_journey_1',
        transportMode: 'public_transit',
        reused: false,
      },
      { now: NOW + 1000 },
    )

    const ignoredManualPosition = reconcileAgendaJourneyMapEvidence(linked.journey, {
      activeMapJourney: {
        status: 'arrived',
        journeyId: 'different_journey',
        sourceAgendaJourneyStepId: '',
        provenance: 'manual',
        arrivedAt: NOW + 30 * 60_000,
      },
      now: NOW + 30 * 60_000,
    })
    expect(ignoredManualPosition.steps[0].status).toBe(AGENDA_JOURNEY_STEP_STATUS.ACTIVE)

    const arrived = reconcileAgendaJourneyMapEvidence(linked.journey, {
      activeMapJourney: {
        status: 'arrived',
        journeyId: 'map_journey_1',
        sourceAgendaJourneyStepId: travelStep.id,
        arrivedAt: NOW + 30 * 60_000,
      },
      now: NOW + 30 * 60_000,
    })

    expect(arrived.status).toBe(AGENDA_JOURNEY_STATUS.ACTIVE)
    expect(arrived.steps[0].status).toBe(AGENDA_JOURNEY_STEP_STATUS.COMPLETED)
    expect(arrived.steps[1].status).toBe(AGENDA_JOURNEY_STEP_STATUS.AVAILABLE)
    expect(arrived.steps[1].completedAt).toBe(0)
  })

  test('requires an explicit activity start and completion confirmation', () => {
    const created = createManualAgendaJourney({
      id: `aj::manual::${NOW}`,
      title: '整理演出资料',
      startsAt: NOW + HOUR_MS,
      endsAt: NOW + 2 * HOUR_MS,
      now: NOW,
    })
    const activity = created.journey.steps[0]

    expect(
      transitionAgendaJourneyActivityStep(created.journey, activity.id, 'complete', {
        now: NOW + HOUR_MS,
      }),
    ).toMatchObject({ ok: false, code: 'AGENDA_ACTIVITY_NOT_ACTIVE' })

    const started = transitionAgendaJourneyActivityStep(created.journey, activity.id, 'start', {
      now: NOW + HOUR_MS,
    })
    const completed = transitionAgendaJourneyActivityStep(
      started.journey,
      activity.id,
      'complete',
      { now: NOW + 2 * HOUR_MS },
    )

    expect(started.journey.status).toBe(AGENDA_JOURNEY_STATUS.ACTIVE)
    expect(completed.journey.status).toBe(AGENDA_JOURNEY_STATUS.COMPLETED)
    expect(completed.journey.outcomeSummaryZh).toContain('已完成')
  })

  test('validates exact Activity Session lineage before accepting timing evidence', () => {
    const created = createManualAgendaJourney({
      id: `aj::manual::session-evidence::${NOW}`,
      title: '舞蹈练习',
      startsAt: NOW + HOUR_MS,
      endsAt: NOW + 2 * HOUR_MS,
      now: NOW,
    })
    const activity = created.journey.steps[0]
    const startedAgenda = transitionAgendaJourneyActivityStep(
      created.journey,
      activity.id,
      'start',
      { now: NOW, completionPolicy: 'duration_sufficient' },
    )
    const createdSession = createActivitySession(
      {
        sourceOwner: 'agenda-journey',
        sourceStepKind: 'activity',
        sourceStepStatus: 'available',
        agendaJourneyId: created.journey.id,
        agendaJourneyStepId: activity.id,
        plannedDurationMs: HOUR_MS,
        completionPolicy: 'duration_sufficient',
        pausePolicy: 'continuous',
      },
      { now: NOW },
    )
    const startedSession = startActivitySession(createdSession.session, { now: NOW })
    const completedSession = reconcileActivitySession(startedSession.session, {
      now: NOW + HOUR_MS,
    })
    const evidence = createActivitySessionCompletionEvidence(completedSession)

    expect(
      applyAgendaJourneyActivitySessionEvidence(
        startedAgenda.journey,
        activity.id,
        { ...evidence, recordId: 'forged-session' },
        { now: NOW + HOUR_MS },
      ),
    ).toMatchObject({ ok: false, code: 'AGENDA_ACTIVITY_SESSION_EVIDENCE_INVALID' })

    const applied = applyAgendaJourneyActivitySessionEvidence(
      startedAgenda.journey,
      activity.id,
      evidence,
      { now: NOW + HOUR_MS },
    )
    expect(applied).toMatchObject({
      ok: true,
      code: 'AGENDA_ACTIVITY_SESSION_EVIDENCE_APPLIED',
    })
    expect(applied.journey.status).toBe(AGENDA_JOURNEY_STATUS.COMPLETED)
    expect(applied.journey.steps[0].evidenceRefs).toContainEqual(
      expect.objectContaining({ owner: 'activity-session', recordId: evidence.recordId }),
    )
  })

  test('retires untouched Calendar plans and marks overdue required work missed', () => {
    const materialized = materializeCalendarAgendaJourney({ occurrence, request, now: NOW })
    const retired = retireCalendarAgendaJourneySource(materialized.journey, {
      retiredAt: NOW + 1000,
      reason: 'calendar_occurrence_replaced',
    })
    expect(retired).toMatchObject({
      sourceState: 'retired',
      status: AGENDA_JOURNEY_STATUS.CANCELLED,
    })

    const deadline = evaluateAgendaJourneyDeadline(materialized.journey, {
      evaluatedAt: occurrence.endsAt,
    })
    expect(deadline).toMatchObject({ ok: true, code: 'AGENDA_DEADLINE_MISSED' })
    expect(deadline.journey.status).toBe(AGENDA_JOURNEY_STATUS.MISSED)
    expect(deadline.journey.steps.every((step) => step.status === 'missed')).toBe(true)
  })

  test('cancels an active plan without rewriting completed travel evidence as a completed plan', () => {
    const materialized = materializeCalendarAgendaJourney({ occurrence, request, now: NOW })
    const arrived = reconcileAgendaJourneyMapEvidence(materialized.journey, {
      mapJourneyHistory: [
        {
          status: 'arrived',
          journeyId: 'map_journey_2',
          sourceAgendaJourneyStepId: materialized.journey.steps[0].id,
          endedAt: NOW + 30 * 60_000,
        },
      ],
      now: NOW + 30 * 60_000,
    })
    const cancelled = cancelAgendaJourney(arrived, { now: NOW + 31 * 60_000 })
    expect(cancelled.status).toBe(AGENDA_JOURNEY_STATUS.CANCELLED)
    expect(cancelled.steps[0].status).toBe(AGENDA_JOURNEY_STEP_STATUS.COMPLETED)
    expect(cancelled.steps[1].status).toBe(AGENDA_JOURNEY_STEP_STATUS.CANCELLED)
  })
})
