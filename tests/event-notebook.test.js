import { describe, expect, test } from 'vitest'
import {
  EVENT_NOTEBOOK_SOURCE_KIND,
  buildEventNotebook,
  createEventNotebookRefKey,
  normalizeEventReviewNote,
} from '../src/lib/simulation/event-notebook'

const eventLog = (overrides = {}) => ({
  id: 'log-1',
  eventId: 'kpop.production-arrival-briefing.v1',
  moduleKey: 'map',
  targetId: 'session-1',
  status: 'triggered',
  at: 100,
  ...overrides,
})

const mapProposal = (overrides = {}) => ({
  id: 'proposal-1',
  eventId: 'kpop.production-arrival-briefing.v1',
  moduleKey: 'map',
  journeyId: 'journey-1',
  status: 'pending_review',
  createdAt: 110,
  provenance: { runtimeLogId: 'log-1' },
  ...overrides,
})

const eventInstance = (overrides = {}) => ({
  id: 'instance-1',
  lifecycle: 'active',
  templateRef: { id: 'kpop.production-arrival-briefing.v1' },
  source: { moduleKey: 'map', recordId: 'session-1' },
  runtime: { proposalId: 'proposal-1', eligibilityLogId: 'log-1', outcomeLogId: '' },
  timestamps: { createdAt: 120, updatedAt: 120 },
  ...overrides,
})

const noteFor = (eventRef, overrides = {}) => ({
  id: 'note-1',
  eventRef,
  body: 'Check the source-owner result before the next rehearsal.',
  createdAt: 130,
  updatedAt: 130,
  ...overrides,
})

test('merges explicitly linked instances, proposals, and logs into one canonical notebook row', () => {
  const notebook = buildEventNotebook({
    eventLogs: [eventLog()],
    eventInstances: [eventInstance()],
    mapJourneyEventProposals: [mapProposal()],
  })

  expect(notebook.entries).toHaveLength(1)
  expect(notebook.entries[0]).toMatchObject({
    sourceKind: EVENT_NOTEBOOK_SOURCE_KIND.EVENT_INSTANCE,
    sourceId: 'instance-1',
    status: 'active',
    statusGroup: 'pending',
    lineageState: 'complete',
    lineage: {
      instanceId: 'instance-1',
      proposalId: 'proposal-1',
      logIds: ['log-1'],
    },
  })
  expect(notebook.entries[0].refs.map(createEventNotebookRefKey)).toEqual([
    'event_instance:instance-1',
    'map_journey_proposal:proposal-1',
    'event_log:log-1',
  ])
})

test('keeps ordering and source/module/status filtering deterministic', () => {
  const notebook = buildEventNotebook({
    eventLogs: [
      eventLog({ id: 'log-old', moduleKey: 'shopping', status: 'skipped', at: 10 }),
      eventLog({ id: 'log-new', moduleKey: 'map', status: 'failed', at: 30 }),
      eventLog({ id: 'log-mid', moduleKey: 'map', status: 'triggered', at: 20 }),
    ],
    filters: { sourceKind: 'event_log', moduleKey: 'map', status: 'triggered' },
  })

  expect(notebook.entries.map((entry) => entry.sourceId)).toEqual(['log-new', 'log-mid', 'log-old'])
  expect(notebook.filteredEntries.map((entry) => entry.sourceId)).toEqual(['log-mid'])
  expect(notebook.options.moduleKeys.map((option) => option.value)).toEqual(['map', 'shopping'])
  expect(notebook.options.statuses.map((option) => option.value)).toEqual([
    'failed',
    'skipped',
    'triggered',
  ])
})

test('counts pending and noted rows and attaches notes only through exact stable refs', () => {
  const instanceRef = {
    eventId: 'kpop.production-arrival-briefing.v1',
    sourceKind: 'event_instance',
    sourceId: 'instance-1',
    moduleKey: 'map',
    targetId: 'session-1',
  }
  const notebook = buildEventNotebook({
    eventLogs: [eventLog(), eventLog({ id: 'log-2', at: 90 })],
    eventInstances: [eventInstance()],
    mapJourneyEventProposals: [mapProposal()],
    eventReviewNotes: [noteFor(instanceRef)],
  })

  expect(notebook.counts).toEqual({ all: 2, pending: 1, noted: 1 })
  expect(notebook.entries.find((entry) => entry.sourceId === 'instance-1')?.noteCount).toBe(1)
  expect(notebook.entries.find((entry) => entry.sourceId === 'log-2')?.noteCount).toBe(0)
})

test('keeps stale lineage and note-only rows reviewable without inventing source truth', () => {
  const missingLogRef = {
    eventId: 'simulation.session_tick.v1',
    sourceKind: 'event_log',
    sourceId: 'rotated-log',
    moduleKey: 'simulation',
    targetId: 'global',
  }
  const notebook = buildEventNotebook({
    eventInstances: [
      eventInstance({
        runtime: {
          proposalId: 'ephemeral-invitation-proposal',
          eligibilityLogId: 'missing-log',
          outcomeLogId: '',
        },
      }),
    ],
    eventReviewNotes: [noteFor(missingLogRef)],
  })

  expect(notebook.entries).toHaveLength(2)
  expect(notebook.entries.find((entry) => entry.sourceId === 'instance-1')).toMatchObject({
    lineageState: 'stale',
    missingLineage: ['log:missing-log'],
  })
  expect(notebook.entries.find((entry) => entry.sourceId === 'rotated-log')).toMatchObject({
    status: 'source_missing',
    statusGroup: 'unavailable',
    sourceMissing: true,
    noteCount: 1,
  })
})

describe('event review note contract', () => {
  test('preserves internal newlines and rejects invalid refs or oversized content', () => {
    const eventRef = {
      eventId: 'event-1',
      sourceKind: 'event_log',
      sourceId: 'log-1',
      moduleKey: 'map',
      targetId: 'place-1',
    }
    expect(
      normalizeEventReviewNote(noteFor(eventRef, { body: 'First line\r\n\r\nSecond line' })),
    ).toMatchObject({ body: 'First line\n\nSecond line', eventRef })
    expect(normalizeEventReviewNote(noteFor({ ...eventRef, sourceKind: 'calendar' }))).toBeNull()
    expect(normalizeEventReviewNote(noteFor(eventRef, { body: 'x'.repeat(4001) }))).toBeNull()
  })
})
