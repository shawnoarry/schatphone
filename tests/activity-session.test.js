import { describe, expect, test } from 'vitest'
import {
  ACTIVITY_SESSION_STATUS,
  applyActivitySessionEventResolution,
  completeActivitySession,
  createActivitySession,
  createActivitySessionCompletionEvidence,
  deriveActivitySessionProjection,
  normalizeActivitySessions,
  pauseActivitySession,
  reconcileActivitySession,
  resumeActivitySession,
  startActivitySession,
} from '../src/lib/activity-session'
import {
  ACTIVITY_SESSION_EVENT_ADAPTER_KEY,
  ACTIVITY_SESSION_EVENT_ID,
  createActivitySessionEventRecordId,
} from '../src/lib/activity-session-event-interface'

const NOW = new Date('2026-08-16T09:00:00+08:00').getTime()
const MINUTE_MS = 60_000

const request = (patch = {}) => ({
  sourceOwner: 'agenda-journey',
  sourceStepKind: 'activity',
  sourceStepStatus: 'available',
  agendaJourneyId: 'aj::manual::activity-session',
  agendaJourneyStepId: 'aj::manual::activity-session::activity',
  plannedDurationMs: 25 * MINUTE_MS,
  completionPolicy: 'user_confirmation',
  pausePolicy: 'allow_pause',
  ...patch,
})

const createStartedSession = (patch = {}) => {
  const created = createActivitySession(request(patch), { now: NOW })
  expect(created.ok).toBe(true)
  return startActivitySession(created.session, { now: NOW }).session
}

describe('Activity Session contract', () => {
  test('fails closed for travel steps and creates one stable activity-step identity', () => {
    expect(
      createActivitySession(request({ sourceStepKind: 'travel' }), { now: NOW }),
    ).toMatchObject({ ok: false, code: 'ACTIVITY_SESSION_SOURCE_INVALID' })

    const created = createActivitySession(request(), { now: NOW })
    expect(created).toMatchObject({ ok: true, code: 'ACTIVITY_SESSION_CREATED' })
    expect(created.session).toMatchObject({
      id: 'activity-session::aj::manual::activity-session::activity',
      agendaJourneyStepId: 'aj::manual::activity-session::activity',
      status: ACTIVITY_SESSION_STATUS.PLANNED,
      completionPolicy: 'user_confirmation',
    })

    const restored = normalizeActivitySessions([
      { ...created.session, id: 'forged-a', updatedAt: NOW },
      { ...created.session, id: 'forged-b', status: 'running', updatedAt: NOW + 1 },
    ])
    expect(restored).toHaveLength(1)
    expect(restored[0]).toMatchObject({
      id: 'activity-session::aj::manual::activity-session::activity',
      status: 'running',
    })
  })

  test('uses absolute timestamps and shifts the canonical end only by an allowed pause', () => {
    const started = createStartedSession()
    const paused = pauseActivitySession(started, { now: NOW + 5 * MINUTE_MS })
    const projectionWhilePaused = deriveActivitySessionProjection(paused.session, {
      now: NOW + 12 * MINUTE_MS,
    })
    const resumed = resumeActivitySession(paused.session, { now: NOW + 15 * MINUTE_MS })

    expect(projectionWhilePaused.elapsedMs).toBe(5 * MINUTE_MS)
    expect(resumed.session).toMatchObject({
      status: ACTIVITY_SESSION_STATUS.RUNNING,
      accumulatedPausedMs: 10 * MINUTE_MS,
      endsAt: NOW + 35 * MINUTE_MS,
    })
    expect(
      deriveActivitySessionProjection(resumed.session, { now: NOW + 20 * MINUTE_MS }),
    ).toMatchObject({ elapsedMs: 10 * MINUTE_MS, remainingMs: 15 * MINUTE_MS })
  })

  test('reconciles duration-sufficient completion idempotently after suspension', () => {
    const started = createStartedSession({ completionPolicy: 'duration_sufficient' })
    const completed = reconcileActivitySession(started, { now: NOW + 40 * MINUTE_MS })
    const reopened = reconcileActivitySession(completed, { now: NOW + 2 * 60 * MINUTE_MS })

    expect(completed).toMatchObject({
      status: ACTIVITY_SESSION_STATUS.COMPLETED,
      completedAt: NOW + 25 * MINUTE_MS,
      completionReason: 'duration_elapsed',
    })
    expect(completed.processedCheckpointIds).toHaveLength(3)
    expect(reopened).toEqual(completed)
  })

  test('keeps user-confirmation sessions open after duration and emits bounded evidence only on completion', () => {
    const started = createStartedSession()
    const elapsed = reconcileActivitySession(started, { now: NOW + 30 * MINUTE_MS })

    expect(elapsed.status).toBe(ACTIVITY_SESSION_STATUS.RUNNING)
    expect(
      deriveActivitySessionProjection(elapsed, { now: NOW + 30 * MINUTE_MS }),
    ).toMatchObject({ durationElapsed: true, awaitingUserConfirmation: true })
    expect(createActivitySessionCompletionEvidence(elapsed)).toBeNull()

    const completed = completeActivitySession(elapsed, { now: NOW + 31 * MINUTE_MS })
    expect(createActivitySessionCompletionEvidence(completed.session)).toMatchObject({
      owner: 'activity-session',
      agendaJourneyId: request().agendaJourneyId,
      agendaJourneyStepId: request().agendaJourneyStepId,
      completionPolicy: 'user_confirmation',
      status: 'completed',
    })
  })

  test('accepts Event Runtime authorization only for the processed midpoint checkpoint', () => {
    const started = createStartedSession()
    const reconciled = reconcileActivitySession(started, {
      now: NOW + 23 * MINUTE_MS,
      checkpointsOnly: true,
    })
    const nearCompletion = reconciled.checkpointPlan.find(
      (checkpoint) => checkpoint.type === 'near_completion',
    )
    const result = applyActivitySessionEventResolution(
      reconciled,
      {
        authorization: 'event_runtime_resolved',
        adapterKey: ACTIVITY_SESSION_EVENT_ADAPTER_KEY,
        eventId: ACTIVITY_SESSION_EVENT_ID,
        eventRecordId: createActivitySessionEventRecordId(
          reconciled.id,
          nearCompletion.id,
        ),
        activitySessionId: reconciled.id,
        agendaJourneyId: reconciled.agendaJourneyId,
        agendaJourneyStepId: reconciled.agendaJourneyStepId,
        checkpointId: nearCompletion.id,
        outcomeId: 'add_recovery_buffer',
        resolutionMode: 'user_choice',
        runtimeLogId: 'runtime-log-forged-near-completion',
        resolvedAt: NOW + 23 * MINUTE_MS,
      },
      { now: NOW + 23 * MINUTE_MS },
    )

    expect(result).toMatchObject({
      ok: false,
      code: 'ACTIVITY_SESSION_EVENT_AUTHORIZATION_INVALID',
    })
  })
})
