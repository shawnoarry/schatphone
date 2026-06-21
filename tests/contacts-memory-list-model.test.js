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
  visibleLimit,
} = {}) => {
  const calls = []
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
    formatSourceModuleLabel: (sourceModule) => `Source: ${sourceModule}`,
    visibleLimit,
  })
  return { model, calls }
}

describe('Contacts memory list model interface', () => {
  test('returns an empty list and empty-state copy without a selected profile', () => {
    const { model, calls } = createModel({ selectedProfile: null })

    expect(model.selectedMemoryGroups.value).toEqual([])
    expect(model.visibleMemoryGroups.value).toEqual([])
    expect(model.availableMemorySourceFilters.value).toEqual([{ value: 'all', label: 'All sources' }])
    expect(model.selectedMemoryListCountLabel.value).toBe('0')
    expect(model.memoryListSummaryText.value).toBe('No relationship memory groups yet.')
    expect(calls).toEqual([])
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
})
