import { computed } from 'vue'

const defaultT = (zh, en) => en || zh

export function useContactsMemoryListModel({
  selectedProfile,
  memorySourceFilter,
  memorySortMode,
  t = defaultT,
  getRelationshipTarget = () => ({}),
  listMemoryGroupsForTarget = () => [],
  formatSourceModuleLabel = (sourceModule) => sourceModule || '',
  visibleLimit = 12,
} = {}) {
  const selectedMemoryGroups = computed(() => {
    const profile = selectedProfile?.value
    if (!profile) return []
    return listMemoryGroupsForTarget(getRelationshipTarget(profile), 50, {
      sortMode: memorySortMode?.value || 'recent',
    })
  })

  const availableMemorySourceFilters = computed(() => {
    const modules = new Set()
    selectedMemoryGroups.value.forEach((memory) => {
      ;(memory.sourceModules || []).forEach((moduleKey) => {
        if (moduleKey) modules.add(moduleKey)
      })
    })
    return [
      { value: 'all', label: t('全部来源', 'All sources') },
      ...[...modules]
        .sort((left, right) => left.localeCompare(right))
        .map((moduleKey) => ({
          value: moduleKey,
          label: formatSourceModuleLabel(moduleKey),
        })),
    ]
  })

  const filteredMemoryGroups = computed(() => {
    const filterValue = memorySourceFilter?.value || 'all'
    return filterValue === 'all'
      ? selectedMemoryGroups.value
      : selectedMemoryGroups.value.filter((memory) => (memory.sourceModules || []).includes(filterValue))
  })

  const visibleMemoryGroups = computed(() => filteredMemoryGroups.value.slice(0, visibleLimit))
  const visibleMemoryCount = computed(() => visibleMemoryGroups.value.length)
  const totalMemoryCount = computed(() => filteredMemoryGroups.value.length)
  const hiddenMemoryCount = computed(() => Math.max(0, totalMemoryCount.value - visibleMemoryCount.value))

  const memoryListSummaryText = computed(() => {
    if (totalMemoryCount.value === 0) {
      return t('暂无关系记忆组。', 'No relationship memory groups yet.')
    }
    if (hiddenMemoryCount.value <= 0) {
      return t(
        `当前展示 ${visibleMemoryCount.value} 条记忆组。`,
        `Showing ${visibleMemoryCount.value} memory groups.`,
      )
    }
    return t(
      `当前展示前 ${visibleMemoryCount.value} 条，另有 ${hiddenMemoryCount.value} 条符合筛选。`,
      `Showing the first ${visibleMemoryCount.value}; ${hiddenMemoryCount.value} more match the current filter.`,
    )
  })

  const selectedMemoryListCountLabel = computed(() =>
    hiddenMemoryCount.value > 0
      ? `${visibleMemoryCount.value} / ${totalMemoryCount.value}`
      : String(visibleMemoryCount.value),
  )

  const selectedMemoryListOverflowText = computed(() =>
    hiddenMemoryCount.value > 0
      ? t(
          `${hiddenMemoryCount.value} 条其余记忆已按当前排序保留在列表外，避免详情页过长。`,
          `${hiddenMemoryCount.value} additional memories stay outside the visible list to keep the detail page manageable.`,
        )
      : '',
  )

  return {
    selectedMemoryGroups,
    availableMemorySourceFilters,
    filteredMemoryGroups,
    visibleMemoryGroups,
    visibleMemoryCount,
    totalMemoryCount,
    hiddenMemoryCount,
    memoryListSummaryText,
    selectedMemoryListCountLabel,
    selectedMemoryListOverflowText,
  }
}
