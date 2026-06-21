import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import { useContactsLinkedActivityModel } from '../src/composables/useContactsLinkedActivityModel'

const t = (zh, en) => en || zh

const createModel = ({
  selectedProfile = { id: 7 },
  selectedRelationshipSnapshot = null,
  detailItemsBySection = {},
} = {}) =>
  useContactsLinkedActivityModel({
    selectedProfile: ref(selectedProfile),
    selectedRelationshipSnapshot: ref(selectedRelationshipSnapshot),
    t,
    listDetailItemsForSection: (_profile, section) => detailItemsBySection[section] || [],
    formatSourceModuleLabel: (sourceModule) => `Module: ${sourceModule || 'none'}`,
    formatSourceModuleSummary: (counts = {}) =>
      Object.entries(counts)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([sourceModule, count]) => `${sourceModule}:${count}`)
        .join(', ') || 'No linked activity yet',
    formatMemoryReviewSummary: (memory) => memory?.reviewSummary || '',
  })

describe('Contacts linked activity model interface', () => {
  test('returns an empty summary and list without a selected profile', () => {
    const model = createModel({ selectedProfile: null })

    expect(model.selectedLinkedActivityEntries.value).toEqual([])
    expect(model.selectedLinkedActivitySummary.value).toEqual({
      sourceText: 'No linked activity yet',
      supportingCount: 0,
      eventAttachedCount: 0,
      latestSummary: '',
    })
  })

  test('dedupes runtime source refs with matching event-attached detail items', () => {
    const model = createModel({
      selectedRelationshipSnapshot: {
        sourceRefs: [
          {
            sourceModule: 'relationship_calendar_confirmed_event',
            sourceId: 'calendar_1:calendar_event:role_7',
          },
          {
            sourceModule: 'relationship_map_shared_route',
            sourceId: 'trip_2:shared_route:role_7',
          },
        ],
        primaryMemory: {
          reviewSummary: 'Reviewed primary memory.',
          latestSummary: 'Latest primary memory.',
        },
      },
      detailItemsBySection: {
        lifePattern: [
          {
            id: 'detail_1',
            section: 'lifePattern',
            sourceKind: 'event_attached',
            title: 'Dinner plan',
            detail: 'Attached from Calendar.',
            sourceModule: 'relationship_calendar_confirmed_event',
            sourceId: 'calendar_1:calendar_event:role_7',
            memoryKey: 'memory_a',
          },
          {
            id: 'detail_2',
            section: 'lifePattern',
            sourceKind: 'event_attached',
            title: 'Fresh clue',
            sourceModule: 'relationship_phone_call',
            sourceId: 'call_3:phone_call:role_7',
          },
        ],
      },
    })

    expect(model.selectedLinkedActivitySummary.value).toEqual({
      sourceText:
        'relationship_calendar_confirmed_event:1, relationship_map_shared_route:1, relationship_phone_call:1',
      supportingCount: 3,
      eventAttachedCount: 2,
      latestSummary: 'Reviewed primary memory.',
    })
  })

  test('builds sorted linked activity entries with memory summary and event fallback text', () => {
    const model = createModel({
      selectedRelationshipSnapshot: {
        memorySummaries: [
          {
            memoryKey: 'memory_map',
            displaySummary: 'Map memory display.',
          },
        ],
        recentEvents: [
          {
            memoryKey: 'memory_call',
            summary: 'Call event summary.',
          },
        ],
      },
      detailItemsBySection: {
        socialGraph: [
          {
            id: 'detail_call',
            section: 'socialGraph',
            sourceKind: 'event_attached',
            detail: 'Call detail fallback.',
            sourceModule: 'relationship_phone_call',
            sourceId: 'call_9:phone_call:role_7',
            memoryKey: 'memory_call',
          },
        ],
        lifePattern: [
          {
            id: 'detail_map',
            section: 'lifePattern',
            sourceKind: 'event_attached',
            title: 'Route home',
            sourceModule: 'relationship_map_shared_route',
            sourceId: 'trip_8:shared_route:role_7',
            memoryKey: 'memory_map',
          },
        ],
      },
    })

    expect(model.selectedLinkedActivityEntries.value).toEqual([
      {
        id: 'detail_map',
        title: 'Route home',
        sectionLabel: 'Life Pattern',
        sourceModule: 'relationship_map_shared_route',
        sourceModuleLabel: 'Module: relationship_map_shared_route',
        memoryKey: 'memory_map',
        sourceId: 'trip_8:shared_route:role_7',
        recordId: 'trip_8',
        summary: 'Map memory display.',
      },
      {
        id: 'detail_call',
        title: 'Call detail fallback.',
        sectionLabel: 'Social Graph',
        sourceModule: 'relationship_phone_call',
        sourceModuleLabel: 'Module: relationship_phone_call',
        memoryKey: 'memory_call',
        sourceId: 'call_9:phone_call:role_7',
        recordId: 'call_9',
        summary: 'Call event summary.',
      },
    ])
  })

  test('falls back from primary memory fields to latest event summary', () => {
    const model = createModel({
      selectedRelationshipSnapshot: {
        primaryMemory: {
          recallSummary: '',
          displaySummary: '',
          primarySummary: 'Primary memory summary.',
          latestSummary: 'Latest memory summary.',
        },
        latestEventSummary: 'Latest event summary.',
      },
    })

    expect(model.selectedLinkedActivitySummary.value.latestSummary).toBe('Primary memory summary.')
  })

  test('uses a waiting copy when an entry has no memory or event summary', () => {
    const model = createModel({
      detailItemsBySection: {
        preferences: [
          {
            id: 'detail_waiting',
            section: 'preferences',
            sourceKind: 'event_attached',
            sourceModule: 'relationship_calendar_confirmed_event',
          },
        ],
      },
    })

    expect(model.selectedLinkedActivityEntries.value[0]).toMatchObject({
      id: 'detail_waiting',
      title: 'Module: relationship_calendar_confirmed_event',
      sectionLabel: 'Preferences',
      summary: 'Waiting for more relationship events.',
    })
  })
})
