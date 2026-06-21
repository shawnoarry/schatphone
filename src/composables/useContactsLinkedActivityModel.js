import { computed } from 'vue'
import {
  ROLE_DETAIL_SECTIONS,
  ROLE_DETAIL_SOURCE_KINDS,
} from '../lib/role-profile-schema'
import { sourceRecordIdFromRelationshipSourceId } from '../lib/relationship-source-cleanup-handlers'

const defaultT = (zh, en) => en || zh

const defaultSectionLabel = (section, t) => {
  if (section === ROLE_DETAIL_SECTIONS.LIFE_PATTERN) return t('生活模式', 'Life Pattern')
  if (section === ROLE_DETAIL_SECTIONS.SOCIAL_GRAPH) return t('社会关系', 'Social Graph')
  return t('偏好', 'Preferences')
}

export function useContactsLinkedActivityModel({
  selectedProfile,
  selectedRelationshipSnapshot,
  t = defaultT,
  listDetailItemsForSection = () => [],
  formatSourceModuleLabel = (sourceModule) => sourceModule || t('未标记来源', 'Unlabeled source'),
  formatSourceModuleSummary = () => t('No linked activity yet', 'No linked activity yet'),
  formatMemoryReviewSummary = () => '',
  formatSectionLabel = (section) => defaultSectionLabel(section, t),
  toSourceRecordId = sourceRecordIdFromRelationshipSourceId,
} = {}) {
  const eventAttachedItems = computed(() => {
    const profile = selectedProfile?.value
    if (!profile?.id) return []
    return Object.values(ROLE_DETAIL_SECTIONS).flatMap((section) =>
      listDetailItemsForSection(profile, section).filter(
        (item) => item.sourceKind === ROLE_DETAIL_SOURCE_KINDS.EVENT_ATTACHED,
      ),
    )
  })

  const selectedLinkedActivityEntries = computed(() => {
    const profile = selectedProfile?.value
    if (!profile?.id) return []

    const detailItems = eventAttachedItems.value.filter(
      (item) => item.sourceModule || item.memoryKey || item.sourceId,
    )
    const snapshot = selectedRelationshipSnapshot?.value || null
    const memorySummaries = Array.isArray(snapshot?.memorySummaries) ? snapshot.memorySummaries : []
    const memorySummaryByKey = new Map(
      memorySummaries.map((memory) => [
        memory.memoryKey,
        memory.displaySummary || memory.primarySummary || memory.latestSummary || memory.memoryKey || '',
      ]),
    )
    const eventByMemoryKey = new Map(
      (snapshot?.recentEvents || []).map((event) => [event.memoryKey, event]),
    )

    return detailItems
      .map((item) => {
        const sourceModuleLabel = formatSourceModuleLabel(item.sourceModule)
        const latestEvent = item.memoryKey ? eventByMemoryKey.get(item.memoryKey) : null
        return {
          id: item.id,
          title: item.title || item.detail || sourceModuleLabel,
          sectionLabel: formatSectionLabel(item.section),
          sourceModule: item.sourceModule || '',
          sourceModuleLabel,
          memoryKey: item.memoryKey || '',
          sourceId: item.sourceId || '',
          recordId: toSourceRecordId(item.sourceId || ''),
          summary:
            memorySummaryByKey.get(item.memoryKey) ||
            latestEvent?.summary ||
            item.detail ||
            t('等待更多关系事件沉淀。', 'Waiting for more relationship events.'),
        }
      })
      .sort((left, right) => left.sourceModuleLabel.localeCompare(right.sourceModuleLabel))
  })

  const selectedLinkedActivitySummary = computed(() => {
    const profile = selectedProfile?.value
    if (!profile?.id) {
      return {
        sourceText: t('No linked activity yet', 'No linked activity yet'),
        supportingCount: 0,
        eventAttachedCount: 0,
        latestSummary: '',
      }
    }

    const snapshot = selectedRelationshipSnapshot?.value || null
    const runtimeSourceRefs = Array.isArray(snapshot?.sourceRefs) ? snapshot.sourceRefs : []
    const sourceRefMap = new Map(
      runtimeSourceRefs
        .filter((ref) => ref?.sourceModule)
        .map((ref) => [
          `${ref.sourceModule}:${ref.sourceId || ''}`,
          {
            sourceModule: ref.sourceModule,
            sourceId: ref.sourceId || '',
          },
        ]),
    )

    eventAttachedItems.value.forEach((item) => {
      if (!item.sourceModule) return
      const key = `${item.sourceModule}:${item.sourceId || `detail_item:${item.id}`}`
      if (!sourceRefMap.has(key)) {
        sourceRefMap.set(key, {
          sourceModule: item.sourceModule,
          sourceId: item.sourceId || '',
        })
      }
    })

    const sourceCounts = [...sourceRefMap.values()].reduce((acc, ref) => {
      acc[ref.sourceModule] = (Number(acc[ref.sourceModule]) || 0) + 1
      return acc
    }, {})

    return {
      sourceText:
        Object.keys(sourceCounts).length > 0
          ? formatSourceModuleSummary(sourceCounts)
          : t('No linked activity yet', 'No linked activity yet'),
      supportingCount: Object.values(sourceCounts).reduce((sum, count) => sum + (Number(count) || 0), 0),
      eventAttachedCount: eventAttachedItems.value.length,
      latestSummary:
        formatMemoryReviewSummary(snapshot?.primaryMemory) ||
        snapshot?.primaryMemory?.recallSummary ||
        snapshot?.primaryMemory?.displaySummary ||
        snapshot?.primaryMemory?.primarySummary ||
        snapshot?.primaryMemory?.latestSummary ||
        snapshot?.latestEventSummary ||
        '',
    }
  })

  return {
    selectedLinkedActivityEntries,
    selectedLinkedActivitySummary,
  }
}
