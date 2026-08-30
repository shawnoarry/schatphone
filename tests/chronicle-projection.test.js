import { describe, expect, test } from 'vitest'
import { projectChronicleTimeline } from '../src/lib/chronicle-projection'
import { createCalendarOccurrenceFingerprint } from '../src/lib/schedule-orchestrator'
import { WORK_HUB_SCHEDULE_CHANGE_RESULT } from '../src/lib/simulation/work-hub-event-templates'

const calendarEvent = {
  id: 'calendar_work_1',
  status: 'confirmed',
  titleZh: '排练',
  titleEn: 'Rehearsal',
  startsAt: 1_788_070_800_000,
  endsAt: 1_788_074_400_000,
  updatedAt: 1_788_067_200_000,
  recurrence: 'none',
  requirement: 'required',
  sourceRef: {
    schemaVersion: 1,
    sourceOwner: 'workplace',
    sourceRecordId: 'proposal_2',
    sourceRevision: 'package:r2:proposal_2:r2',
    idempotencyKey: 'workplace::proposal_2',
    revisionFingerprint: 'revision_2',
    returnContext: { path: '/workplace', query: { mode: 'production' } },
    previousSourceRefs: [{
      sourceOwner: 'workplace',
      sourceRecordId: 'proposal_1',
      sourceRevision: 'package:r1:proposal_1:r1',
    }],
  },
}

const proof = {
  schemaVersion: 1,
  kind: 'work_schedule_change_execution',
  calendarEventId: calendarEvent.id,
  calendarFingerprint: createCalendarOccurrenceFingerprint(calendarEvent),
  sourceOwner: 'workplace',
  sourceRecordId: 'proposal_2',
  sourceRevision: 'package:r2:proposal_2:r2',
  previousSourceRecordId: 'proposal_1',
  previousSourceRevision: 'package:r1:proposal_1:r1',
  eventInstanceId: 'event_1',
  workHubPackageId: 'package',
  workHubPackageRevision: 2,
  organizationId: 'organization_1',
  membershipId: 'membership_1',
  worldId: 'world_local_primary',
  worldRevision: 1,
  contactsProfileId: 'profile_1',
  contactsProfileRevision: 1,
  proposalId: 'proposal_2',
  proposalRevision: 2,
  previousProposalId: 'proposal_1',
  previousProposalRevision: 1,
  acceptedReceiptId: 'receipt_1',
  ownerFactId: 'fact_1',
  verifiedAt: 1_788_067_200_000,
}

const project = (overrides = {}) => projectChronicleTimeline({
  calendarEvents: [calendarEvent],
  agendaJourneys: [{
    id: 'agenda_1',
    executionRevision: proof.calendarFingerprint,
    executionProof: proof,
    status: 'active',
    titleZh: '排练安排',
    titleEn: 'Rehearsal plan',
    scheduledStartsAt: calendarEvent.startsAt,
    updatedAt: 1_788_067_260_000,
  }],
  mapTripHistory: [{
    journeyId: 'map_1',
    sourceAgendaJourneyId: 'agenda_1',
    sourceAgendaExecutionRevision: proof.calendarFingerprint,
    status: 'arrived',
    startedAt: 1_788_070_000_000,
    arrivedAt: 1_788_070_700_000,
  }],
  activitySessions: [{
    id: 'activity_1',
    agendaJourneyId: 'agenda_1',
    agendaJourneyStepId: 'agenda_1::activity',
    agendaExecutionRevision: proof.calendarFingerprint,
    status: 'running',
    startedAt: 1_788_070_900_000,
  }],
  workHubReceipts: [{
    id: 'receipt_1',
    action: 'accepted',
    sourceRef: { recordId: 'proposal_2' },
    createdAt: 1_788_067_100_000,
  }],
  eventInstances: [{
    id: 'event_1',
    lifecycle: 'resolved',
    resultCodes: [WORK_HUB_SCHEDULE_CHANGE_RESULT.ACCEPTED],
  }],
  ownerFacts: [{
    id: 'fact_1',
    correlationId: 'event_1',
    resultCode: WORK_HUB_SCHEDULE_CHANGE_RESULT.ACCEPTED,
  }],
  ...overrides,
})

describe('Chronicle timeline projection', () => {
  test('projects a verified owner chain without treating arrival as completion', () => {
    const nodes = project()
    expect(nodes.map((node) => node.stage)).toEqual([
      'work_decision',
      'calendar_commitment',
      'agenda_execution',
      'map_journey',
      'activity_session',
    ])
    const arrival = nodes.find((node) => node.stage === 'map_journey')
    expect(arrival.status).toBe('arrived')
    expect(arrival.summaryEn).toContain('does not prove activity completion')
    expect(nodes.some((node) => node.status === 'completed')).toBe(false)
  })

  test('fails closed when any canonical proof owner is missing or stale', () => {
    expect(project({ ownerFacts: [] })).toEqual([])
    expect(project({ calendarEvents: [{ ...calendarEvent, updatedAt: calendarEvent.updatedAt + 1 }] })).toEqual([])
    expect(project({ worldId: 'another_world' })).toEqual([])
  })

  test('ignores map and activity records from another execution revision', () => {
    const nodes = project({
      mapTripHistory: [{
        journeyId: 'map_stale',
        sourceAgendaJourneyId: 'agenda_1',
        sourceAgendaExecutionRevision: 'stale',
        status: 'arrived',
        arrivedAt: 1_788_070_700_000,
      }],
      activitySessions: [{
        id: 'activity_stale',
        agendaJourneyId: 'agenda_1',
        agendaExecutionRevision: 'stale',
        status: 'completed',
        completedAt: 1_788_070_900_000,
      }],
    })
    expect(nodes.map((node) => node.stage)).toEqual([
      'work_decision',
      'calendar_commitment',
      'agenda_execution',
    ])
  })
})
