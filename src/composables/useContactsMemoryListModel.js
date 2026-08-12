import { computed } from 'vue'

const defaultT = (zh, en) => en || zh

const createEmptyMemoryPressure = (ownerKey = '') => ({
  ownerKind: 'role',
  ownerKey,
  level: 'none',
  counts: {
    total: 0,
    active: 0,
    pinned: 0,
    archived: 0,
    sourceReferences: 0,
    characters: 0,
  },
  reasons: [],
  candidates: [],
})

const toSafeCount = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

export function useContactsMemoryListModel({
  selectedProfile,
  memorySourceFilter,
  memorySortMode,
  t = defaultT,
  getRelationshipTarget = () => ({}),
  listMemoryGroupsForTarget = () => [],
  projectMemoryConsolidationPressureForTarget = () => createEmptyMemoryPressure(),
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

  const selectedMemoryPressure = computed(() => {
    const profile = selectedProfile?.value
    if (!profile) return createEmptyMemoryPressure()
    const target = getRelationshipTarget(profile)
    const projected = projectMemoryConsolidationPressureForTarget(target)
    return projected && typeof projected === 'object'
      ? projected
      : createEmptyMemoryPressure(target?.entityKey || '')
  })

  const selectedMemoryHealthSummary = computed(() => {
    const pressure = selectedMemoryPressure.value
    const counts = pressure?.counts && typeof pressure.counts === 'object' ? pressure.counts : {}
    const total = toSafeCount(counts.total)
    const sourceReferences = toSafeCount(counts.sourceReferences)
    const archived = toSafeCount(counts.archived)
    const candidateCount = Array.isArray(pressure?.candidates) ? pressure.candidates.length : 0
    const level = ['watch', 'review'].includes(pressure?.level) ? pressure.level : 'none'

    if (total === 0) {
      return {
        tone: 'none',
        statusLabel: t('状态稳定', 'All settled'),
        detail: t(
          '目前还没有需要整理的关系记忆。今后积累的经历会继续保留原始来源。',
          'There are no relationship memories to organize yet. Future experiences will keep their original sources.',
        ),
        countText: t('暂无记忆', 'No memories yet'),
        candidateCount: 0,
      }
    }

    const countText = t(
      `${total} 段记忆 · ${sourceReferences} 条来源${archived > 0 ? ` · ${archived} 段已归档` : ''}`,
      `${total} memories · ${sourceReferences} source records${archived > 0 ? ` · ${archived} archived` : ''}`,
    )
    if (level === 'review') {
      return {
        tone: 'review',
        statusLabel: t('建议查看', 'Review recommended'),
        detail: t(
          '有些记忆已经承载了较多经历。你可以查看下方建议，确认它们是否仍然清晰；系统不会自动改写或删除。',
          'Some memories now carry a lot of history. You can review the suggestions below to make sure they remain clear; nothing will be rewritten or deleted automatically.',
        ),
        countText,
        candidateCount,
      }
    }
    if (level === 'watch') {
      return {
        tone: 'watch',
        statusLabel: t('记忆开始变多', 'Starting to fill up'),
        detail: candidateCount > 0
          ? t(
              '部分记忆已经关联了多次经历或较长说明。现在仍可正常使用，需要时再打开建议查看即可；系统不会自动改变任何内容。',
              'Some memories now contain several related experiences or a longer description. Everything still works normally; open a suggestion whenever you want to review it. Nothing will change automatically.',
            )
          : t(
              '这个角色积累的记忆正在增多，但目前没有某一段需要单独处理。系统不会自动改变这些记忆。',
              'This character is accumulating more memories, but no individual memory needs attention yet. Nothing will change automatically.',
            ),
        countText,
        candidateCount,
      }
    }
    return {
      tone: 'none',
      statusLabel: t('状态稳定', 'All settled'),
      detail: t(
        '这些记忆目前仍然清晰，暂时不需要整理。所有经历和来源都会按原样保留。',
        'These memories are still clear and do not need organizing yet. Every experience and source remains preserved as-is.',
      ),
      countText,
      candidateCount,
    }
  })

  const selectedMemoryHealthCandidates = computed(() => {
    const memoryByKey = new Map(
      selectedMemoryGroups.value
        .filter((memory) => memory?.memoryKey)
        .map((memory) => [String(memory.memoryKey).toLowerCase(), memory]),
    )
    return (Array.isArray(selectedMemoryPressure.value?.candidates)
      ? selectedMemoryPressure.value.candidates
      : []
    ).map((candidate) => {
      const memoryKey = String(candidate?.memoryKey || '').toLowerCase()
      const memory = memoryByKey.get(memoryKey) || {}
      const reasons = Array.isArray(candidate?.reasons) ? candidate.reasons : []
      const hasDenseEvidence = reasons.includes('dense_evidence')
      const hasLongSummary = reasons.includes('long_summary')
      const reasonLabel = hasDenseEvidence && hasLongSummary
        ? t('关联经历较多，说明也较详细', 'Many related experiences and a detailed description')
        : hasDenseEvidence
          ? t('关联了多次共同经历', 'Several related experiences are attached')
          : t('这段记忆的说明较详细', 'This memory has a detailed description')
      return {
        memoryKey: candidate?.memoryKey || memory.memoryKey || '',
        summary:
          memory.displaySummary ||
          memory.primarySummary ||
          memory.latestSummary ||
          memory.memoryKey ||
          candidate?.memoryKey ||
          t('未命名记忆', 'Untitled memory'),
        reasonLabel,
        reviewStatus: candidate?.reviewStatus || memory.reviewStatus || 'active',
      }
    })
  })

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
    selectedMemoryPressure,
    selectedMemoryHealthSummary,
    selectedMemoryHealthCandidates,
    memoryListSummaryText,
    selectedMemoryListCountLabel,
    selectedMemoryListOverflowText,
  }
}
