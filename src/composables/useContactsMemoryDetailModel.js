import { computed } from 'vue'
import { sourceRecordIdFromRelationshipSourceId } from '../lib/relationship-source-cleanup-handlers'

const defaultT = (zh, en) => en || zh

const defaultFormatTimestamp = (value) => {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 'Time not recorded'
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(timestamp)
}

export function useContactsMemoryDetailModel({
  selectedMemoryDetail,
  t = defaultT,
  getCleanupHandlers = () => ({}),
  formatSourceModuleLabel = (sourceModule) => sourceModule || t('未标记来源', 'Unlabeled source'),
  formatFactTypeLabel = (factType) => factType || t('关系事件', 'Relationship fact'),
  formatReviewStatusLabel = (status) => status || t('活跃', 'Active'),
  formatAuditTimestamp = defaultFormatTimestamp,
  formatSourceModuleSummary = () => t('无跨模块来源', 'No cross-module sources'),
  toSourceRecordId = sourceRecordIdFromRelationshipSourceId,
  eventLimit = 4,
} = {}) {
  const selectedMemorySourceAudit = computed(() => {
    const detail = selectedMemoryDetail?.value
    const sourceCounts = detail?.sourceModuleCounts || {}
    const sourceRefs = Array.isArray(detail?.sourceRefs) ? detail.sourceRefs : []
    if (!detail || Object.keys(sourceCounts).length === 0) return []

    const refsByModule = sourceRefs.reduce((acc, ref) => {
      const moduleKey = ref?.sourceModule || ''
      if (!moduleKey) return acc
      if (!acc[moduleKey]) acc[moduleKey] = []
      if (ref?.sourceId) acc[moduleKey].push(ref.sourceId)
      return acc
    }, {})

    const cleanupHandlers = getCleanupHandlers() || {}

    return Object.entries(sourceCounts)
      .sort(([leftModule], [rightModule]) => leftModule.localeCompare(rightModule))
      .map(([sourceModule, count]) => {
        const rawSourceIds = [...new Set((refsByModule[sourceModule] || []).filter(Boolean))]
        return {
          sourceModule,
          label: formatSourceModuleLabel(sourceModule),
          count: Number(count) || 0,
          cleanupConnected: typeof cleanupHandlers[sourceModule] === 'function',
          rawSourceIds,
          recordIds: rawSourceIds.map((sourceId) => toSourceRecordId(sourceId)),
        }
      })
  })

  const selectedMemoryEventTimeline = computed(() => {
    const detail = selectedMemoryDetail?.value
    const events = Array.isArray(detail?.events) ? detail.events : []
    return events.slice(0, eventLimit).map((event, index) => ({
      id: event.id || `${detail?.memoryKey || 'memory'}_${index}`,
      sourceModule: event.sourceModule || '',
      sourceModuleLabel: formatSourceModuleLabel(event.sourceModule),
      factTypeLabel: formatFactTypeLabel(event.factType),
      summary:
        event.summary ||
        detail?.displaySummary ||
        detail?.primarySummary ||
        detail?.latestSummary ||
        detail?.memoryKey ||
        '',
      createdAtText: formatAuditTimestamp(event.createdAt),
      sourceId: event.sourceId || '',
      recordId: toSourceRecordId(event.sourceId || ''),
    }))
  })

  const selectedMemoryHeadlineFacts = computed(() => {
    const detail = selectedMemoryDetail?.value
    if (!detail) return []
    return [
      {
        key: 'sources',
        label: t('来源模块', 'Source modules'),
        value: String((detail.sourceModules || []).length || 0),
        detail: formatSourceModuleSummary(detail.sourceModuleCounts),
      },
      {
        key: 'supporting',
        label: t('支撑事件', 'Supporting events'),
        value: String((detail.events || []).length || 0),
        detail: t('该记忆组当前承接的关系事件数', 'Relationship events attached to this memory group'),
      },
      {
        key: 'latest',
        label: t('最近沉淀', 'Latest update'),
        value: formatAuditTimestamp(detail.latestCreatedAt),
        detail: detail.latestSummary || detail.primarySummary || detail.memoryKey,
      },
      {
        key: 'review',
        label: t('管理状态', 'Review state'),
        value: formatReviewStatusLabel(detail.reviewStatus),
        detail: detail.reviewNote || t('暂无管理备注', 'No review note yet'),
      },
    ]
  })

  return {
    selectedMemorySourceAudit,
    selectedMemoryEventTimeline,
    selectedMemoryHeadlineFacts,
  }
}
