import { computed } from 'vue'

const defaultT = (zh, en) => en || zh
const detailSeparator = ' \u00b7 '

const defaultFormatRoleId = (roleId, id) => roleId || id || ''
const defaultFormatRelationshipStageLabel = () => ''
const defaultFormatSourceModuleSummary = () => ''
const defaultFormatCleanupCoverage = () => ''

const countText = (value) => Number(value) || 0

const roleSummaryText = (profile, { t = defaultT, formatRoleId = defaultFormatRoleId } = {}) =>
  `${t('\u89d2\u8272', 'Role')}: ${profile?.name || ''}${detailSeparator}ID ${formatRoleId(profile?.roleId, profile?.id)}`

export function buildRoleDangerImpactText(
  impact,
  {
    t = defaultT,
    formatSourceModuleSummary = defaultFormatSourceModuleSummary,
  } = {},
) {
  if (!impact) return ''
  return [
    `${t('\u5f71\u54cd', 'Impact')}: ${t('Chat \u7ed1\u5b9a', 'Chat bindings')} ${countText(impact.chatBindingCount)}`,
    `${t('\u8bb0\u5fc6\u7ec4', 'memories')} ${countText(impact.memoryGroupCount)}`,
    `${t('\u6765\u6e90', 'sources')} ${formatSourceModuleSummary(impact.sourceModuleCounts)}`,
  ].join(detailSeparator)
}

export function buildResetRelationshipDialogDetails(
  {
    snapshot = null,
    impact = null,
  } = {},
  {
    t = defaultT,
    formatRelationshipStageLabel = defaultFormatRelationshipStageLabel,
    formatSourceModuleSummary = defaultFormatSourceModuleSummary,
    formatCleanupCoverage = defaultFormatCleanupCoverage,
  } = {},
) {
  return [
    `${t('\u5f53\u524d\u9636\u6bb5', 'Current stage')}: ${formatRelationshipStageLabel(snapshot?.relationshipStage)}`,
    `${t('\u8bb0\u5fc6\u7ec4', 'Memory groups')}: ${countText(impact?.memoryGroupCount)}`,
    `${t('\u8de8\u6a21\u5757\u6765\u6e90', 'Cross-module sources')}: ${formatSourceModuleSummary(impact?.sourceModuleCounts)}`,
    formatCleanupCoverage(impact?.sourceModuleCounts),
  ]
}

export function buildDeleteRoleProfileDialogDetails(
  {
    profile = null,
    impact = null,
  } = {},
  {
    t = defaultT,
    formatRoleId = defaultFormatRoleId,
  } = {},
) {
  return [
    roleSummaryText(profile, { t, formatRoleId }),
    `${t('Chat \u7ed1\u5b9a', 'Chat bindings')}: ${countText(impact?.chatBindingCount)}`,
    `${t('\u8bb0\u5fc6\u7ec4', 'Memory groups')}: ${countText(impact?.memoryGroupCount)}`,
    t(
      'Photos \u7d20\u6750\u4e0d\u4f1a\u88ab\u9759\u9ed8\u5220\u9664\uff0c\u53ea\u4f1a\u89e3\u9664\u89d2\u8272\u6863\u6848\u5f15\u7528\uff1b\u5982\u9700\u5220\u9664\u56fe\u7247\uff0c\u8bf7\u524d\u5f80\u76f8\u518c\u624b\u52a8\u5904\u7406\u3002',
      'Photos assets are not silently deleted; role references are unbound only. Delete images manually in Gallery if needed.',
    ),
  ]
}

export function buildDeleteRoleScopeDialogDetails(
  {
    profile = null,
    impact = null,
    impactText = '',
    includeLinkedRecords = false,
  } = {},
  {
    t = defaultT,
    formatRoleId = defaultFormatRoleId,
    formatCleanupCoverage = defaultFormatCleanupCoverage,
  } = {},
) {
  return [
    `${t('\u8303\u56f4', 'Scope')}: Contacts profile${detailSeparator}Chat Directory binding${detailSeparator}Chat history${detailSeparator}Relationship runtime`,
    roleSummaryText(profile, { t, formatRoleId }),
    impactText,
    includeLinkedRecords
      ? formatCleanupCoverage(impact?.sourceModuleCounts)
      : t(
          '\u4e0d\u4f1a\u5220\u9664\u8de8\u6a21\u5757\u6e90\u8bb0\u5f55\uff1b\u5b83\u4eec\u53ea\u4fdd\u7559\u5728\u5f71\u54cd\u6e05\u5355\u4e2d\u3002',
          'Cross-module source records will not be deleted; they stay in the impact summary only.',
        ),
    t(
      'Photos \u7d20\u6750\u53ea\u89e3\u9664\u5f15\u7528\uff0c\u4e0d\u4f1a\u9759\u9ed8\u5220\u9664\u6e90\u56fe\u7247\u3002',
      'Photos assets are unbound only; source images are not silently deleted.',
    ),
  ]
}

export function buildMemoryDeletePreviewMessage({
  memory = null,
  detail = null,
} = {}) {
  return detail?.displaySummary || memory?.displaySummary || memory?.primarySummary || memory?.memoryKey || ''
}

export function buildMemoryDeletePreviewDetails(
  {
    memory = null,
    detail = null,
  } = {},
  {
    t = defaultT,
    formatSourceModuleSummary = defaultFormatSourceModuleSummary,
    formatCleanupCoverage = defaultFormatCleanupCoverage,
  } = {},
) {
  return [
    `${t('\u5305\u542b\u5173\u7cfb\u4e8b\u4ef6', 'Relationship events')}: ${detail?.events?.length || memory?.supportingCount || 0}`,
    `${t('\u6765\u6e90', 'Sources')}: ${formatSourceModuleSummary(detail?.sourceModuleCounts)}`,
    formatCleanupCoverage(detail?.sourceModuleCounts),
  ]
}

export function buildMemoryDeleteFinalDetails(
  {
    memory = null,
  } = {},
  {
    t = defaultT,
  } = {},
) {
  return [
    `${t('\u8bb0\u5fc6\u952e', 'Memory key')}: ${memory?.memoryKey || ''}`,
    t(
      '\u666e\u901a\u81ea\u7531\u804a\u5929\u6d88\u606f\u4e0d\u4f1a\u88ab\u5220\u9664\u3002',
      'Normal free-form chat messages will not be deleted.',
    ),
    t(
      '\u5982\u9700\u5220\u9664\u539f\u59cb\u804a\u5929\u6587\u672c\uff0c\u8bf7\u524d\u5f80 Chat \u5bf9\u8bdd\u4e2d\u5904\u7406\u3002',
      'Delete original chat text from the Chat conversation if needed.',
    ),
  ]
}

export function useContactsDangerZoneModel({
  selectedProfile,
  selectedRelationshipSnapshot,
  selectedDeleteImpact,
  dangerIncludeLinkedRecords,
  t = defaultT,
  formatRoleId = defaultFormatRoleId,
  formatRelationshipStageLabel = defaultFormatRelationshipStageLabel,
  formatSourceModuleSummary = defaultFormatSourceModuleSummary,
  formatCleanupCoverage = defaultFormatCleanupCoverage,
} = {}) {
  const options = {
    t,
    formatRoleId,
    formatRelationshipStageLabel,
    formatSourceModuleSummary,
    formatCleanupCoverage,
  }

  const selectedDangerImpactText = computed(() =>
    buildRoleDangerImpactText(selectedDeleteImpact?.value, options),
  )

  const resetRelationshipDialogDetails = computed(() =>
    buildResetRelationshipDialogDetails(
      {
        snapshot: selectedRelationshipSnapshot?.value,
        impact: selectedDeleteImpact?.value,
      },
      options,
    ),
  )

  const deleteRoleProfileDialogDetails = computed(() =>
    buildDeleteRoleProfileDialogDetails(
      {
        profile: selectedProfile?.value,
        impact: selectedDeleteImpact?.value,
      },
      options,
    ),
  )

  const deleteRoleScopeDialogDetails = computed(() =>
    buildDeleteRoleScopeDialogDetails(
      {
        profile: selectedProfile?.value,
        impact: selectedDeleteImpact?.value,
        impactText: selectedDangerImpactText.value,
        includeLinkedRecords: dangerIncludeLinkedRecords?.value === true,
      },
      options,
    ),
  )

  const dangerIncludeLinkedRecordsText = computed(() =>
    t(
      '\u540c\u65f6\u5c1d\u8bd5\u5220\u9664\u5df2\u660e\u786e\u63a5\u5165 cleanup \u7684\u8de8\u6a21\u5757\u6e90\u8bb0\u5f55\uff1b\u672a\u63a5\u5165\u6216\u8bed\u4e49\u4e0d\u660e\u7684\u8bb0\u5f55\u53ea\u4f1a\u51fa\u73b0\u5728\u5f71\u54cd\u6e05\u5355\u4e2d\u3002',
      'Also attempt to delete cross-module source records with explicit cleanup handlers. Missing or ambiguous records stay in the impact summary only.',
    ),
  )

  const memoryDeletePreviewMessage = (memory, detail = memory) =>
    buildMemoryDeletePreviewMessage({ memory, detail })

  const memoryDeletePreviewDetails = (memory, detail = memory) =>
    buildMemoryDeletePreviewDetails({ memory, detail }, options)

  const memoryDeleteFinalDetails = (memory) => buildMemoryDeleteFinalDetails({ memory }, options)

  return {
    selectedDangerImpactText,
    resetRelationshipDialogDetails,
    deleteRoleProfileDialogDetails,
    deleteRoleScopeDialogDetails,
    dangerIncludeLinkedRecordsText,
    memoryDeletePreviewMessage,
    memoryDeletePreviewDetails,
    memoryDeleteFinalDetails,
  }
}
