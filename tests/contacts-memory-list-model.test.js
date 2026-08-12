import { describe, expect, test } from 'vitest'
import { ref } from 'vue'
import { useContactsMemoryListModel } from '../src/composables/useContactsMemoryListModel'

const t = (zh, en) => en || zh

const createMemory = (index, sourceModules = ['chat']) => ({
  memoryKey: `memory_${index}`,
  sourceModules,
  supportingCount: index,
})

const createModel = ({
  selectedProfile = { id: 7, name: 'Ada' },
  memorySourceFilter = 'all',
  memorySortMode = 'recent',
  memories = [],
  pressure = {
    level: 'none',
    counts: { total: 0, active: 0, pinned: 0, archived: 0, sourceReferences: 0, characters: 0 },
    reasons: [],
    candidates: [],
  },
  visibleLimit,
} = {}) => {
  const calls = []
  const pressureCalls = []
  const model = useContactsMemoryListModel({
    selectedProfile: ref(selectedProfile),
    memorySourceFilter: ref(memorySourceFilter),
    memorySortMode: ref(memorySortMode),
    t,
    getRelationshipTarget: (profile) => ({
      entityKey: `role:${profile.id}`,
      profileId: profile.id,
      kind: 'role',
    }),
    listMemoryGroupsForTarget: (target, limit, options) => {
      calls.push({ target, limit, options })
      return memories
    },
    projectMemoryConsolidationPressureForTarget: (target) => {
      pressureCalls.push(target)
      return pressure
    },
    formatSourceModuleLabel: (sourceModule) => `Source: ${sourceModule}`,
    visibleLimit,
  })
  return { model, calls, pressureCalls }
}

describe('Contacts memory list model interface', () => {
  test('returns an empty list and empty-state copy without a selected profile', () => {
    const { model, calls, pressureCalls } = createModel({ selectedProfile: null })

    expect(model.selectedMemoryGroups.value).toEqual([])
    expect(model.visibleMemoryGroups.value).toEqual([])
    expect(model.availableMemorySourceFilters.value).toEqual([{ value: 'all', label: 'All sources' }])
    expect(model.selectedMemoryListCountLabel.value).toBe('0')
    expect(model.memoryListSummaryText.value).toBe('No relationship memory groups yet.')
    expect(model.selectedMemoryHealthSummary.value).toMatchObject({
      tone: 'none',
      statusLabel: 'All settled',
      countText: 'No memories yet',
    })
    expect(calls).toEqual([])
    expect(pressureCalls).toEqual([])
  })

  test('reads memory groups through the provided relationship-runtime adapter', () => {
    const memories = [createMemory(1, ['calendar'])]
    const { model, calls } = createModel({ memories, memorySortMode: 'oldest' })

    expect(model.selectedMemoryGroups.value).toEqual(memories)
    expect(calls).toEqual([
      {
        target: { entityKey: 'role:7', profileId: 7, kind: 'role' },
        limit: 50,
        options: { sortMode: 'oldest' },
      },
    ])
  })

  test('builds sorted source filters and filters memory groups by selected source', () => {
    const { model } = createModel({
      memorySourceFilter: 'map',
      memories: [
        createMemory(1, ['wallet', 'map']),
        createMemory(2, ['calendar']),
        createMemory(3, ['map']),
      ],
    })

    expect(model.availableMemorySourceFilters.value).toEqual([
      { value: 'all', label: 'All sources' },
      { value: 'calendar', label: 'Source: calendar' },
      { value: 'map', label: 'Source: map' },
      { value: 'wallet', label: 'Source: wallet' },
    ])
    expect(model.filteredMemoryGroups.value.map((memory) => memory.memoryKey)).toEqual([
      'memory_1',
      'memory_3',
    ])
  })

  test('caps visible memory groups and reports overflow count', () => {
    const memories = Array.from({ length: 14 }, (_, index) => createMemory(index + 1, ['calendar']))
    const { model } = createModel({ memories })

    expect(model.visibleMemoryGroups.value).toHaveLength(12)
    expect(model.visibleMemoryCount.value).toBe(12)
    expect(model.totalMemoryCount.value).toBe(14)
    expect(model.hiddenMemoryCount.value).toBe(2)
    expect(model.selectedMemoryListCountLabel.value).toBe('12 / 14')
    expect(model.memoryListSummaryText.value).toBe(
      'Showing the first 12; 2 more match the current filter.',
    )
    expect(model.selectedMemoryListOverflowText.value).toBe(
      '2 additional memories stay outside the visible list to keep the detail page manageable.',
    )
  })

  test('uses the exact visible count when no overflow remains', () => {
    const { model } = createModel({ memories: [createMemory(1), createMemory(2)] })

    expect(model.visibleMemoryGroups.value).toHaveLength(2)
    expect(model.selectedMemoryListCountLabel.value).toBe('2')
    expect(model.memoryListSummaryText.value).toBe('Showing 2 memory groups.')
    expect(model.selectedMemoryListOverflowText.value).toBe('')
  })

  test('turns pressure levels into user-readable memory care copy without exposing thresholds', () => {
    const memories = [
      {
        ...createMemory(1, ['phone']),
        displaySummary: 'A shared birthday memory.',
      },
    ]
    const { model, pressureCalls } = createModel({
      memories,
      pressure: {
        level: 'watch',
        counts: {
          total: 12,
          active: 10,
          pinned: 1,
          archived: 1,
          sourceReferences: 24,
          characters: 900,
        },
        reasons: ['candidate_pressure'],
        candidates: [
          {
            memoryKey: 'memory_1',
            reasons: ['dense_evidence'],
            reviewStatus: 'pinned',
          },
        ],
      },
    })

    expect(model.selectedMemoryHealthSummary.value).toEqual({
      tone: 'watch',
      statusLabel: 'Starting to fill up',
      detail:
        'Some memories now contain several related experiences or a longer description. Everything still works normally; open a suggestion whenever you want to review it. Nothing will change automatically.',
      countText: '12 memories · 24 source records · 1 archived',
      candidateCount: 1,
    })
    expect(model.selectedMemoryHealthCandidates.value).toEqual([
      {
        memoryKey: 'memory_1',
        summary: 'A shared birthday memory.',
        reasonLabel: 'Several related experiences are attached',
        reviewStatus: 'pinned',
      },
    ])
    expect(pressureCalls).toEqual([{ entityKey: 'role:7', profileId: 7, kind: 'role' }])
    expect(JSON.stringify(model.selectedMemoryHealthSummary.value)).not.toContain('denseEvidenceWatch')
  })

  test('keeps pressure candidates available even when they sit outside the visible filtered list', () => {
    const memories = Array.from({ length: 14 }, (_, index) => ({
      ...createMemory(index + 1, index === 13 ? ['phone'] : ['calendar']),
      displaySummary: `Memory summary ${index + 1}`,
    }))
    const { model } = createModel({
      memories,
      memorySourceFilter: 'calendar',
      pressure: {
        level: 'review',
        counts: { total: 14, active: 14, pinned: 0, archived: 0, sourceReferences: 40 },
        reasons: ['candidate_pressure'],
        candidates: [
          {
            memoryKey: 'memory_14',
            reasons: ['dense_evidence', 'long_summary'],
            reviewStatus: 'active',
          },
        ],
      },
    })

    expect(model.visibleMemoryGroups.value.map((memory) => memory.memoryKey)).not.toContain('memory_14')
    expect(model.selectedMemoryHealthSummary.value.statusLabel).toBe('Review recommended')
    expect(model.selectedMemoryHealthCandidates.value).toEqual([
      expect.objectContaining({
        memoryKey: 'memory_14',
        summary: 'Memory summary 14',
        reasonLabel: 'Many related experiences and a detailed description',
      }),
    ])
  })
})
