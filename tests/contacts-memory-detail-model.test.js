import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import { useContactsMemoryDetailModel } from '../src/composables/useContactsMemoryDetailModel'

const t = (zh, en) => en || zh

const createModel = ({ detail = null, cleanupHandlers = {}, eventLimit } = {}) =>
  useContactsMemoryDetailModel({
    selectedMemoryDetail: ref(detail),
    t,
    getCleanupHandlers: () => cleanupHandlers,
    formatSourceModuleLabel: (sourceModule) => `Module: ${sourceModule || 'none'}`,
    formatFactTypeLabel: (factType) => `Fact: ${factType || 'none'}`,
    formatReviewStatusLabel: (status) => `Review: ${status || 'active'}`,
    formatAuditTimestamp: (value) => (value ? `time:${value}` : 'Time not recorded'),
    formatSourceModuleSummary: (counts = {}) =>
      Object.entries(counts)
        .map(([sourceModule, count]) => `${sourceModule}:${count}`)
        .join(', ') || 'No cross-module sources',
    eventLimit,
  })

describe('Contacts memory detail model interface', () => {
  test('returns empty detail rows without a selected memory', () => {
    const model = createModel()

    expect(model.selectedMemorySourceAudit.value).toEqual([])
    expect(model.selectedMemoryEventTimeline.value).toEqual([])
    expect(model.selectedMemoryHeadlineFacts.value).toEqual([])
  })

  test('builds sorted source audit rows with cleanup readiness and deduped record ids', () => {
    const model = createModel({
      cleanupHandlers: {
        relationship_calendar_confirmed_event: () => {},
      },
      detail: {
        sourceModuleCounts: {
          relationship_map_shared_route: 2,
          relationship_calendar_confirmed_event: 1,
        },
        sourceRefs: [
          {
            sourceModule: 'relationship_map_shared_route',
            sourceId: 'trip_42:shared_route:role_7',
          },
          {
            sourceModule: 'relationship_map_shared_route',
            sourceId: 'trip_42:shared_route:role_7',
          },
          {
            sourceModule: 'relationship_calendar_confirmed_event',
            sourceId: 'calendar_3:calendar_event:role_7',
          },
        ],
      },
    })

    expect(model.selectedMemorySourceAudit.value).toEqual([
      {
        sourceModule: 'relationship_calendar_confirmed_event',
        label: 'Module: relationship_calendar_confirmed_event',
        count: 1,
        cleanupConnected: true,
        rawSourceIds: ['calendar_3:calendar_event:role_7'],
        recordIds: ['calendar_3'],
      },
      {
        sourceModule: 'relationship_map_shared_route',
        label: 'Module: relationship_map_shared_route',
        count: 2,
        cleanupConnected: false,
        rawSourceIds: ['trip_42:shared_route:role_7'],
        recordIds: ['trip_42'],
      },
    ])
  })

  test('builds a capped supporting-event timeline with fallback summaries and record ids', () => {
    const model = createModel({
      eventLimit: 2,
      detail: {
        memoryKey: 'memory_a',
        primarySummary: 'Primary fallback.',
        events: [
          {
            id: 'event_1',
            sourceModule: 'relationship_calendar_confirmed_event',
            factType: 'scheduled_calendar_event',
            summary: 'Dinner confirmed.',
            createdAt: 100,
            sourceId: 'calendar_1:calendar_event:role_7',
          },
          {
            sourceModule: 'relationship_map_shared_route',
            factType: 'shared_route',
            createdAt: 200,
            sourceId: 'trip_2:shared_route:role_7',
          },
          {
            id: 'event_3',
            summary: 'Hidden by cap.',
          },
        ],
      },
    })

    expect(model.selectedMemoryEventTimeline.value).toEqual([
      {
        id: 'event_1',
        sourceModule: 'relationship_calendar_confirmed_event',
        sourceModuleLabel: 'Module: relationship_calendar_confirmed_event',
        factTypeLabel: 'Fact: scheduled_calendar_event',
        summary: 'Dinner confirmed.',
        createdAtText: 'time:100',
        sourceId: 'calendar_1:calendar_event:role_7',
        recordId: 'calendar_1',
      },
      {
        id: 'memory_a_1',
        sourceModule: 'relationship_map_shared_route',
        sourceModuleLabel: 'Module: relationship_map_shared_route',
        factTypeLabel: 'Fact: shared_route',
        summary: 'Primary fallback.',
        createdAtText: 'time:200',
        sourceId: 'trip_2:shared_route:role_7',
        recordId: 'trip_2',
      },
    ])
  })

  test('builds headline facts from source counts, supporting events, latest update, and review state', () => {
    const model = createModel({
      detail: {
        memoryKey: 'memory_b',
        sourceModules: ['relationship_calendar_confirmed_event', 'relationship_map_shared_route'],
        sourceModuleCounts: {
          relationship_calendar_confirmed_event: 1,
          relationship_map_shared_route: 2,
        },
        events: [{ id: 'event_1' }, { id: 'event_2' }],
        latestCreatedAt: 300,
        latestSummary: 'Latest detail.',
        reviewStatus: 'pinned',
        reviewNote: 'Keep visible.',
      },
    })

    expect(model.selectedMemoryHeadlineFacts.value).toEqual([
      {
        key: 'sources',
        label: 'Source modules',
        value: '2',
        detail: 'relationship_calendar_confirmed_event:1, relationship_map_shared_route:2',
      },
      {
        key: 'supporting',
        label: 'Supporting events',
        value: '2',
        detail: 'Relationship events attached to this memory group',
      },
      {
        key: 'latest',
        label: 'Latest update',
        value: 'time:300',
        detail: 'Latest detail.',
      },
      {
        key: 'review',
        label: 'Review state',
        value: 'Review: pinned',
        detail: 'Keep visible.',
      },
    ])
  })
})
