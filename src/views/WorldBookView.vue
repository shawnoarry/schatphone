<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useBookStore } from '../stores/book'
import { useI18n } from '../composables/useI18n'
import { useDialog } from '../composables/useDialog'
import { formatApiErrorForUi } from '../lib/ai'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import {
  normalizeWorldBookPointIds,
  normalizeWorldBookSource,
  normalizeWorldBookTagFilter,
  normalizeWorldBookUsageFilter,
} from '../lib/worldbook-navigation'
import { pushReturnTarget, resolveReturnLabel } from '../lib/navigation-return'
import { BOOK_ROUTE } from '../lib/planned-module-registry'
import {
  WORLDBOOK_SOURCE_USAGES,
  buildWorldBookSourceSnapshot,
  diffWorldBookSourceText,
  resolveWorldBookSourceText,
} from '../lib/book-text-schema'
import { resolveActiveWorldOverview } from '../lib/world-interface'
import { buildWorldAppBindingRows } from '../lib/world-pack-app-bindings'
import { extractWorldAppTemplateProposals } from '../lib/world-app-template-registry'
import { analyzeWorldProfileWithAI } from '../lib/world-profile-analysis'
import { buildWorldServiceTemplateGenerationRowsForPacks } from '../lib/world-pack-service-accounts'
import CurrentWorldPackPanel from '../components/worldbook/CurrentWorldPackPanel.vue'
import WorldBookOverview from '../components/worldbook/WorldBookOverview.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const bookStore = useBookStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()
const { user, settings } = storeToRefs(systemStore)
const { roleProfiles, contacts } = storeToRefs(chatStore)

const globalWorldview = computed({
  get: () =>
    typeof user.value.globalWorldview === 'string'
      ? user.value.globalWorldview
      : user.value.worldBook || '',
  set: (value) => {
    systemStore.setGlobalWorldview(value)
  },
})

const worldBookCount = computed(() => (globalWorldview.value || '').length)
const knowledgePoints = computed(() => systemStore.listKnowledgePoints())
const profileTemplatePresets = computed(() => systemStore.listProfileTemplatePresets())
const worldProfileTemplates = computed(() => systemStore.listWorldProfileTemplates('default_world'))
const worldOverview = computed(() =>
  resolveActiveWorldOverview({
    systemStore,
    bookStore,
  }),
)
const worldPackCandidates = computed(() => systemStore.listWorldPacks())
const selectedWorldPackId = ref('')
const selectedWorldPackReview = computed(() =>
  systemStore.buildWorldPackActivationReview(
    selectedWorldPackId.value || worldOverview.value.activePack?.id || 'default_world',
  ),
)
const enabledWorldPacks = computed(() => systemStore.listEnabledWorldPacks())
const activeWorldPackServiceTemplateRows = computed(() =>
  buildWorldServiceTemplateGenerationRowsForPacks({
    packs: enabledWorldPacks.value,
    findExistingContact: (packId, templateId) =>
      chatStore.findWorldServiceTemplateContact(packId, templateId),
  }),
)
const activeWorldPackAppBindingRows = computed(() =>
  enabledWorldPacks.value.flatMap((pack) =>
    buildWorldAppBindingRows({
      pack,
    }),
  ),
)
const worldAppTemplateRegistryRows = computed(() => systemStore.listWorldAppTemplates())
const worldAppTemplateProposalDraft = ref('')
const worldAppTemplateProposalReview = ref(null)
const worldAppTemplateProposalLoading = ref(false)
const worldAppTemplateProposalNotice = ref('')
const worldAppTemplateProposalNoticeTone = ref('info')
const worldPackRecommendationReview = computed(() => systemStore.buildWorldPackRecommendationReview())
const worldProfileAnalysisLoading = ref(false)
const worldProfileAnalysisNotice = ref('')
const linkedBookSources = computed(() =>
  systemStore.listWorldBookSourceLinks().map((link) => {
    const asset = bookStore.findAssetById(link.assetId)
    const currentSourceText = resolveWorldBookSourceText(asset, link.sectionIds)
    const snapshotText = typeof link.sourceSnapshotText === 'string' ? link.sourceSnapshotText : ''
    const snapshotIsPartial = Number(link.sourceSnapshotCharCount || 0) > snapshotText.length
    return {
      ...link,
      asset,
      title: link.titleOverride || asset?.title || link.assetId,
      missing: !asset,
      currentSourceText,
      snapshotIsPartial,
      changed:
        Boolean(asset) &&
        Boolean(link.sourceFingerprint) &&
        Boolean(asset.contentFingerprint) &&
        link.sourceFingerprint !== asset.contentFingerprint &&
        (snapshotIsPartial || snapshotText !== currentSourceText),
      usageLabel: getSourceUsageLabel(link.usage),
      sectionSummary: describeBookLinkSections(asset, link.sectionIds),
    }
  }),
)
const fallbackWorldviewPreview = computed(() => {
  const text = String(globalWorldview.value || '').trim().replace(/\s+/g, ' ')
  if (!text) {
    return t(
      '还没有写入系统 fallback 世界观。',
      'No system fallback worldview has been written yet.',
    )
  }
  return text.length > 140 ? `${text.slice(0, 140)}...` : text
})
const hasBookSourceLinks = computed(() => linkedBookSources.value.length > 0)
const showWorldBookOnboarding = computed(() => !hasBookSourceLinks.value)
const availableBookSourceAssets = computed(() => {
  const linkedIds = new Set(linkedBookSources.value.map((link) => link.assetId))
  return bookStore.worldbookSourceAssets.filter((asset) => !linkedIds.has(asset.id))
})
const availableBookSourceCount = computed(() => availableBookSourceAssets.value.length)
const sourcePickerAssets = computed(() => bookStore.worldbookSourceAssets)
const sourcePicker = reactive({
  open: false,
  assetId: '',
  usage: 'base_worldview',
  mode: 'whole',
  sectionIds: [],
})
const sourceReview = reactive({
  linkId: '',
})
const sourceUsageLabels = {
  base_worldview: { zh: '基础世界观', en: 'Base worldview' },
  knowledge_source: { zh: '知识来源', en: 'Knowledge source' },
  pack_source: { zh: '设定包来源', en: 'Pack source' },
  profile_template_reference: { zh: '档案模板参考', en: 'Profile template reference' },
}
const getSourceUsageCopy = (usage = '') =>
  sourceUsageLabels[usage] || { zh: usage || '来源', en: usage || 'Source' }

const sourceUsageOptions = computed(() =>
  WORLDBOOK_SOURCE_USAGES.map((usage) => ({
    id: usage,
    label: t(getSourceUsageCopy(usage).zh, getSourceUsageCopy(usage).en),
  })),
)

function getSourceUsageLabel(usage = '') {
  const copy = getSourceUsageCopy(usage)
  return t(copy.zh, copy.en)
}

function describeBookLinkSections(asset, sectionIds = []) {
  const ids = Array.isArray(sectionIds) ? sectionIds.filter(Boolean) : []
  if (ids.length === 0) return t('全文', 'Whole document')
  const sections = Array.isArray(asset?.sections) ? asset.sections : []
  const selectedTitles = sections
    .filter((section) => ids.includes(section.id))
    .map((section) => section.title)
    .filter(Boolean)
  if (selectedTitles.length === 0) {
    return t(`${ids.length} 个章节`, `${ids.length} sections`)
  }
  return selectedTitles.slice(0, 3).join(' / ')
}

const buildSourceSnapshotForLink = (asset, sectionIds = []) =>
  buildWorldBookSourceSnapshot(resolveWorldBookSourceText(asset, sectionIds))

const sourcePickerAsset = computed(() =>
  bookStore.findAssetById(sourcePicker.assetId) || sourcePickerAssets.value[0] || null,
)
const sourcePickerSections = computed(() =>
  Array.isArray(sourcePickerAsset.value?.sections) ? sourcePickerAsset.value.sections : [],
)
const sourcePickerSelectedSections = computed(() =>
  sourcePicker.mode === 'sections'
    ? sourcePickerSections.value.filter((section) => sourcePicker.sectionIds.includes(section.id))
    : [],
)
const reviewingBookSource = computed(() =>
  linkedBookSources.value.find((link) => link.id === sourceReview.linkId) || null,
)
const sourceReviewDiff = computed(() => {
  const link = reviewingBookSource.value
  if (!link) return diffWorldBookSourceText('', '')
  return diffWorldBookSourceText(link.sourceSnapshotText || '', link.currentSourceText || '')
})
const sourceReviewSummary = computed(() =>
  t(
    `新增 ${sourceReviewDiff.value.addedCount} 段，移除 ${sourceReviewDiff.value.removedCount} 段，未变 ${sourceReviewDiff.value.unchangedCount} 段`,
    `${sourceReviewDiff.value.addedCount} added, ${sourceReviewDiff.value.removedCount} removed, ${sourceReviewDiff.value.unchangedCount} unchanged`,
  ),
)
const activeBookSourceCount = computed(() =>
  linkedBookSources.value.filter((link) => link.enabled !== false && !link.missing).length,
)
const bookSourceIssueCount = computed(() =>
  linkedBookSources.value.filter((link) => link.missing || link.changed).length,
)
const disabledBookSourceCount = computed(() =>
  linkedBookSources.value.filter((link) => link.enabled === false).length,
)
const knowledgeSearchKeyword = ref('')
const knowledgeTagFilter = ref('all')
const knowledgeUsageFilter = ref('all')
const knowledgeUsageSort = ref('recent')
const knowledgeDeepLinkPointIds = ref([])
const knowledgeDeepLinkSource = ref('')
const knowledgeDeepLinkKeyword = ref('')
const knowledgeDeepLinkTag = ref('all')
const knowledgeDeepLinkUsage = ref('all')
const roleProfileChatBindingMap = computed(() => {
  const map = new Map()
  contacts.value.forEach((contact) => {
    if (!contact || (contact.kind || 'role') !== 'role') return
    const profileId = Number(contact.profileId)
    if (!Number.isFinite(profileId) || profileId <= 0) return
    map.set(profileId, (map.get(profileId) || 0) + 1)
  })
  return map
})
const saved = ref(false)
const uiNotice = ref('')
const knowledgeDraft = reactive({
  title: '',
  content: '',
  tags: '',
})
const editingKnowledgePointId = ref('')
const isKnowledgeComposerOpen = ref(false)
const activeWorldbookPanel = ref('sources')
let savedTimerId = null
const returnLabelKey = computed(() => resolveReturnLabel(route, 'Settings'))
const returnButtonLabel = computed(() =>
  returnLabelKey.value === 'Home'
    ? t('主页', 'Home')
    : returnLabelKey.value === 'Chat'
      ? t('聊天', 'Chat')
      : returnLabelKey.value === 'Map'
        ? t('地图', 'Map')
        : returnLabelKey.value === 'Calendar'
          ? t('日历', 'Calendar')
          : t('设置', 'Settings'),
)

const goSettings = () => {
  pushReturnTarget(router, route, '/settings')
}

const worldbookPanelTabs = computed(() => [
  {
    id: 'sources',
    icon: 'fas fa-link',
    label: t('来源', 'Sources'),
    summary:
      bookSourceIssueCount.value > 0
        ? t(`${bookSourceIssueCount.value} 个待处理`, `${bookSourceIssueCount.value} issues`)
        : t(`${activeBookSourceCount.value} 个启用`, `${activeBookSourceCount.value} active`),
  },
  {
    id: 'pack',
    icon: 'fas fa-cube',
    label: t('设定包', 'Pack'),
    summary: t(
      worldOverview.value.activePack?.title || '默认世界',
      worldOverview.value.activePack?.name || 'Default world',
    ),
  },
  {
    id: 'kernel',
    icon: 'fas fa-compass',
    label: t('基础世界观', 'Kernel'),
    summary: t(`${worldBookCount.value} 字`, `${worldBookCount.value} chars`),
  },
  {
    id: 'templates',
    icon: 'fas fa-id-card',
    label: t('档案模板', 'Templates'),
    summary: t(`${worldProfileTemplates.value.length} 个`, `${worldProfileTemplates.value.length} items`),
  },
  {
    id: 'knowledge',
    icon: 'fas fa-sitemap',
    label: t('知识点', 'Knowledge'),
    summary: t(
      `${worldOverview.value.enabledKnowledgeCount} / ${worldOverview.value.knowledgeCount}`,
      `${worldOverview.value.enabledKnowledgeCount} / ${worldOverview.value.knowledgeCount}`,
    ),
  },
])

const activeWorldbookPanelLabel = computed(
  () =>
    worldbookPanelTabs.value.find((panel) => panel.id === activeWorldbookPanel.value)?.label ||
    t('来源', 'Sources'),
)

const setWorldbookPanel = (panelId = 'sources') => {
  if (!worldbookPanelTabs.value.some((panel) => panel.id === panelId)) return
  activeWorldbookPanel.value = panelId
}

const pulseSaved = (message = '') => {
  if (message) uiNotice.value = message
  saved.value = true
  if (savedTimerId) clearTimeout(savedTimerId)
  savedTimerId = setTimeout(() => {
    saved.value = false
    uiNotice.value = ''
  }, 1400)
}

const saveWorldBook = () => {
  systemStore.saveNow()
  pulseSaved(t('世界观已保存。', 'Worldview saved.'))
}

const selectWorldPack = (packId = '') => {
  selectedWorldPackId.value = packId || worldOverview.value.activePack?.id || 'default_world'
}

const activateSelectedWorldPack = () => {
  const result = systemStore.activateWorldPack(selectedWorldPackId.value)
  if (!result?.ok) {
    uiNotice.value = t('这个世界包还有缺失引用，处理后才能激活。', 'This pack has missing references. Fix them before activation.')
    return
  }
  systemStore.saveNow()
  pulseSaved(t('世界包已激活。', 'World pack activated.'))
}

const analyzeWorldForExpansions = async () => {
  if (worldProfileAnalysisLoading.value) return
  worldProfileAnalysisLoading.value = true
  worldProfileAnalysisNotice.value = ''
  try {
    const result = await analyzeWorldProfileWithAI({
      worldContextText: buildWorldAppTemplateContextText(),
      settings: settings.value,
    })
    systemStore.setWorldProfileAnalysis(result.profile)
    systemStore.saveNow()
    pulseSaved(t('世界画像已更新。', 'World profile updated.'))
  } catch (error) {
    worldProfileAnalysisNotice.value = formatApiErrorForUi(
      error,
      t('AI 分析失败，请检查 API 设置。', 'AI analysis failed. Check API settings.'),
    )
  } finally {
    worldProfileAnalysisLoading.value = false
  }
}

const enableWorldPackExpansion = (packId = '') => {
  const result = systemStore.enableWorldPack(packId)
  if (!result?.ok) {
    uiNotice.value = result?.reason === 'unsupported'
      ? t('这个包需要专门 App，当前版本不能启用。', 'This pack needs a dedicated app and cannot be enabled yet.')
      : t('这个包还有缺失引用，处理后才能启用。', 'This pack has missing references. Fix them before enabling.')
    return
  }
  systemStore.saveNow()
  pulseSaved(t('拓展包已启用。', 'Expansion pack enabled.'))
}

const disableWorldPackExpansion = (packId = '') => {
  const result = systemStore.disableWorldPack(packId)
  if (!result?.ok) return
  systemStore.saveNow()
  pulseSaved(t('拓展包已停用。', 'Expansion pack disabled.'))
}

const buildWorldAppTemplateContextText = () => {
  const activePack = worldOverview.value.activePack || systemStore.getActiveWorldPack()
  const worldview = String(globalWorldview.value || '').trim()
  const sourceLines = linkedBookSources.value
    .filter((link) => link.enabled !== false && !link.missing)
    .slice(0, 4)
    .map((link) => {
      const text = String(link.currentSourceText || '').trim().replace(/\s+/g, ' ')
      return `- ${link.title} (${link.usage || 'source'}): ${text.slice(0, 1200)}`
    })
  const knowledgeLines = knowledgePoints.value
    .filter((point) => point.enabled !== false)
    .slice(0, 8)
    .map((point) => {
      const tags = Array.isArray(point.tags) && point.tags.length ? ` [${point.tags.join(', ')}]` : ''
      return `- ${point.title || point.id}${tags}: ${String(point.content || '').trim().slice(0, 500)}`
    })
  const bindingLines = activeWorldPackAppBindingRows.value.map(
    (row) => `- ${row.id}: ${row.archetype} -> ${row.targetLabel} (${row.route || 'no route'})`,
  )

  return [
    `Active World Pack: ${activePack?.title || activePack?.name || activePack?.id || 'default_world'}`,
    bindingLines.length ? ['Existing app bindings:', ...bindingLines].join('\n') : 'Existing app bindings: none',
    worldview ? `Fallback worldview:\n${worldview.slice(0, 2200)}` : 'Fallback worldview: empty',
    sourceLines.length ? ['Active Book sources:', ...sourceLines].join('\n') : 'Active Book sources: none',
    knowledgeLines.length ? ['Enabled knowledge:', ...knowledgeLines].join('\n') : 'Enabled knowledge: none',
  ].join('\n\n')
}

const summarizeWorldAppTemplateReview = (review) =>
  t(
    `${review.confirmableProposals.length} 个可确认，${review.rejectedProposals.length} 个已拒绝。`,
    `${review.confirmableProposals.length} confirmable, ${review.rejectedProposals.length} rejected.`,
  )

const updateWorldAppTemplateProposalDraft = (value = '') => {
  worldAppTemplateProposalDraft.value = value
}

const reviewWorldAppTemplateProposalDraft = () => {
  const draft = String(worldAppTemplateProposalDraft.value || '').trim()
  if (!draft) {
    worldAppTemplateProposalReview.value = systemStore.buildWorldAppTemplateExtractionReview(
      [],
      worldOverview.value.activePack?.id || 'default_world',
    )
    worldAppTemplateProposalNotice.value = t(
      '请先粘贴 AI 返回的 JSON，或直接运行 AI 提取。',
      'Paste an AI JSON payload first, or run AI extraction.',
    )
    worldAppTemplateProposalNoticeTone.value = 'warning'
    return
  }

  let payload = null
  try {
    payload = JSON.parse(draft)
  } catch {
    worldAppTemplateProposalNotice.value = t(
      'JSON 解析失败，请检查 proposals 数组格式。',
      'JSON parse failed. Check the proposals array format.',
    )
    worldAppTemplateProposalNoticeTone.value = 'danger'
    return
  }

  const review = systemStore.buildWorldAppTemplateExtractionReview(
    payload,
    worldOverview.value.activePack?.id || 'default_world',
  )
  worldAppTemplateProposalReview.value = review
  worldAppTemplateProposalNotice.value = summarizeWorldAppTemplateReview(review)
  worldAppTemplateProposalNoticeTone.value =
    review.confirmableProposals.length > 0 ? 'success' : review.rejectedProposals.length > 0 ? 'warning' : 'info'
}

const extractWorldAppTemplateProposalsFromAI = async () => {
  if (worldAppTemplateProposalLoading.value) return
  worldAppTemplateProposalLoading.value = true
  worldAppTemplateProposalNotice.value = ''
  worldAppTemplateProposalNoticeTone.value = 'info'
  try {
    const result = await extractWorldAppTemplateProposals({
      worldContextText: buildWorldAppTemplateContextText(),
      worldPack: worldOverview.value.activePack || systemStore.getActiveWorldPack(),
      settings: settings.value,
    })
    worldAppTemplateProposalReview.value = result.review
    worldAppTemplateProposalDraft.value = result.rawPayload
      ? JSON.stringify(result.rawPayload, null, 2)
      : ''
    worldAppTemplateProposalNotice.value = result.ok
      ? summarizeWorldAppTemplateReview(result.review)
      : t('AI 返回内容无法解析，未生成可确认入口。', 'AI response could not be parsed; no entries were generated.')
    worldAppTemplateProposalNoticeTone.value = result.ok
      ? result.review.confirmableProposals.length > 0
        ? 'success'
        : result.review.rejectedProposals.length > 0
          ? 'warning'
          : 'info'
      : 'danger'
  } catch (error) {
    worldAppTemplateProposalNotice.value = formatApiErrorForUi(
      error,
      t('AI 提取失败，请检查 API 设置。', 'AI extraction failed. Check API settings.'),
    )
    worldAppTemplateProposalNoticeTone.value = 'danger'
  } finally {
    worldAppTemplateProposalLoading.value = false
  }
}

const confirmWorldAppTemplateProposalEntry = (proposal) => {
  const packId =
    worldAppTemplateProposalReview.value?.worldPackId ||
    worldOverview.value.activePack?.id ||
    'default_world'
  const result = systemStore.confirmWorldAppTemplateProposal(proposal, packId)
  if (!result.ok) {
    worldAppTemplateProposalNotice.value = t(
      `无法确认：${result.reason}`,
      `Could not confirm: ${result.reason}`,
    )
    worldAppTemplateProposalNoticeTone.value = 'danger'
    return
  }

  systemStore.saveNow()
  const reviewProposals = worldAppTemplateProposalReview.value?.proposals || [proposal]
  worldAppTemplateProposalReview.value = systemStore.buildWorldAppTemplateExtractionReview(
    reviewProposals,
    result.pack?.id || packId,
  )
  worldAppTemplateProposalNoticeTone.value = 'success'
  pulseSaved(t('世界 App 入口已加入当前世界包。', 'World app entry added to the current pack.'))
}

const clearWorldAppTemplateProposalReview = () => {
  worldAppTemplateProposalDraft.value = ''
  worldAppTemplateProposalReview.value = null
  worldAppTemplateProposalNotice.value = ''
  worldAppTemplateProposalNoticeTone.value = 'info'
}

const addFirstBookSource = () => {
  if (availableBookSourceAssets.value.length > 0 || sourcePickerAssets.value.length > 0) {
    openBookSourcePicker()
    return
  }
  const asset = availableBookSourceAssets.value[0]
  if (!asset) {
    router.push({
      path: BOOK_ROUTE,
      query: {
        from: 'settings',
      },
    })
    return
  }
  const link = systemStore.addWorldBookSourceLink({
    assetId: asset.id,
    usage: 'base_worldview',
    enabled: true,
    priority: 80 + linkedBookSources.value.length,
    sourceVersion: asset.version,
    sourceFingerprint: asset.contentFingerprint,
    ...buildSourceSnapshotForLink(asset),
  })
  if (link) {
    bookStore.updateAsset(asset.id, { status: 'active_source' }, { force: true, preserveVersion: true })
    systemStore.saveNow()
    bookStore.saveNow()
    pulseSaved(t('已连接文本库来源。', 'Book source linked.'))
  }
}

const resetSourcePickerForAsset = (asset) => {
  sourcePicker.assetId = asset?.id || ''
  sourcePicker.usage = 'base_worldview'
  sourcePicker.mode = 'whole'
  sourcePicker.sectionIds = []
}

const openBookSourcePicker = () => {
  const asset = availableBookSourceAssets.value[0] || sourcePickerAssets.value[0]
  if (!asset) {
    router.push({
      path: BOOK_ROUTE,
      query: {
        from: 'settings',
      },
    })
    return
  }
  resetSourcePickerForAsset(asset)
  sourcePicker.open = true
}

const copyFallbackWorldviewToBook = async () => {
  const content = String(globalWorldview.value || '').trim()
  if (!content) {
    uiNotice.value = t(
      '请先写入系统 fallback 世界观，再复制到文本库。',
      'Write a system fallback worldview before copying it to Book.',
    )
    return
  }

  const confirmed = await confirmDialog({
    title: t('复制到文本库', 'Copy to Book'),
    message: t(
      '这会创建一份可编辑的文本库副本，不会覆盖当前 Settings fallback，也不会自动启用。',
      'This creates an editable Book copy. It will not overwrite the Settings fallback or become active automatically.',
    ),
    details: [
      `${t('字数', 'Chars')}: ${content.length}`,
      t(
        '复制后可在 Book 中编辑，再回到 WorldBook 启用。',
        'After copying, edit it in Book and return to WorldBook to enable it.',
      ),
    ],
    confirmText: t('复制', 'Copy'),
    cancelText: t('取消', 'Cancel'),
    tone: 'accent',
  })
  if (!confirmed) return

  const asset = bookStore.createAsset({
    title: t('系统世界观副本', 'System worldview copy'),
    assetType: 'worldbook_document',
    format: content.startsWith('#') ? 'markdown' : 'plain',
    content,
    status: 'draft',
    source: {
      kind: 'worldbook_fallback_copy',
      copiedAt: Date.now(),
    },
  })
  bookStore.saveNow()
  router.push({
    path: BOOK_ROUTE,
    query: {
      from: 'settings',
      asset: asset.id,
    },
  })
}

const closeBookSourcePicker = () => {
  sourcePicker.open = false
}

const toggleSourcePickerSection = (sectionId = '') => {
  const id = String(sectionId || '').trim()
  if (!id) return
  if (sourcePicker.sectionIds.includes(id)) {
    sourcePicker.sectionIds = sourcePicker.sectionIds.filter((item) => item !== id)
    return
  }
  sourcePicker.sectionIds.push(id)
}

const selectAllSourcePickerSections = () => {
  sourcePicker.mode = 'sections'
  sourcePicker.sectionIds = sourcePickerSections.value.map((section) => section.id)
}

const clearSourcePickerSections = () => {
  sourcePicker.sectionIds = []
}

const syncBookAssetSourceStatus = (assetId = '') => {
  const asset = bookStore.findAssetById(assetId)
  if (!asset || asset.status === 'archived') return
  const hasActiveLink = systemStore
    .listWorldBookSourceLinks()
    .some((link) => link.assetId === asset.id && link.enabled !== false)
  const nextStatus = hasActiveLink ? 'active_source' : 'draft'
  if (asset.status !== nextStatus) {
    bookStore.updateAsset(asset.id, { status: nextStatus }, { force: true, preserveVersion: true })
  }
}

const linkPickedBookSource = () => {
  const asset = sourcePickerAsset.value
  if (!asset) return
  const selectedSectionIds =
    sourcePicker.mode === 'sections' ? sourcePickerSelectedSections.value.map((section) => section.id) : []
  if (sourcePicker.mode === 'sections' && sourcePickerSections.value.length > 0 && selectedSectionIds.length === 0) {
    uiNotice.value = t('请至少选择一个段落。', 'Select at least one section.')
    return
  }
  const link = systemStore.addWorldBookSourceLink({
    assetId: asset.id,
    sectionIds: selectedSectionIds,
    usage: sourcePicker.usage,
    enabled: true,
    priority: 80 + linkedBookSources.value.length,
    sourceVersion: asset.version,
    sourceFingerprint: asset.contentFingerprint,
    ...buildSourceSnapshotForLink(asset, selectedSectionIds),
  })
  if (link) {
    syncBookAssetSourceStatus(asset.id)
    systemStore.saveNow()
    bookStore.saveNow()
    sourcePicker.open = false
  }
}

const openBookSource = (assetId = '') => {
  router.push({
    path: BOOK_ROUTE,
    query: {
      from: 'settings',
      asset: assetId,
    },
  })
}

const toggleBookSource = (link) => {
  const next = systemStore.updateWorldBookSourceLink(link.id, {
    enabled: link.enabled === false,
  })
  if (next) {
    syncBookAssetSourceStatus(link.assetId)
    bookStore.saveNow()
    systemStore.saveNow()
    pulseSaved(t('文本来源状态已更新。', 'Book source state updated.'))
  }
}

const removeBookSource = (linkId) => {
  const link = linkedBookSources.value.find((item) => item.id === linkId)
  if (systemStore.removeWorldBookSourceLink(linkId)) {
    if (sourceReview.linkId === linkId) sourceReview.linkId = ''
    syncBookAssetSourceStatus(link?.assetId)
    systemStore.saveNow()
    bookStore.saveNow()
    pulseSaved(t('已移除文本库来源。', 'Book source removed.'))
  }
}

const openBookSourceReview = (link) => {
  sourceReview.linkId = link?.id || ''
}

const closeBookSourceReview = () => {
  sourceReview.linkId = ''
}

const refreshBookSourceLink = (link) => {
  const asset = bookStore.findAssetById(link?.assetId)
  if (!asset) {
    uiNotice.value = t('找不到这个文本来源。', 'This text source is missing.')
    return
  }
  const next = systemStore.updateWorldBookSourceLink(link.id, {
    sourceVersion: asset.version,
    sourceFingerprint: asset.contentFingerprint,
    ...buildSourceSnapshotForLink(asset, link.sectionIds),
    warning: '',
  })
  if (next) {
    syncBookAssetSourceStatus(asset.id)
    systemStore.saveNow()
    bookStore.saveNow()
    pulseSaved(t('已刷新文本来源版本。', 'Book source version refreshed.'))
  }
}

const acceptReviewedBookSource = () => {
  const link = reviewingBookSource.value
  if (!link) return
  refreshBookSourceLink(link)
  closeBookSourceReview()
}

const copyProfileTemplatePreset = (presetId) => {
  const created = systemStore.createWorldProfileTemplateFromPreset(presetId, {
    worldId: 'default_world',
  })
  if (!created) {
    uiNotice.value = t('模板复制失败。', 'Template copy failed.')
    return
  }
  systemStore.saveNow()
  pulseSaved(t('角色档案模板已复制到当前世界观。', 'Profile template copied into this worldview.'))
}

const parseTagDraft = (raw) =>
  raw
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)

const parseKnowledgePointTags = (raw) => {
  const normalized = typeof raw === 'string' ? raw.replace(/[，；]/g, ',').replace(/;/g, ',') : ''
  const parsed = parseTagDraft(normalized)
  if (
    parsed.length === 1 &&
    parsed[0] &&
    typeof parsed[0] === 'string' &&
    /,/.test(parsed[0])
  ) {
    return parsed[0]
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return parsed
}

const createKnowledgePoint = () => {
  const title = knowledgeDraft.title.trim()
  const content = knowledgeDraft.content.trim()
  if (!title && !content) {
    uiNotice.value = t('请先输入标题或内容。', 'Please enter title or content first.')
    return
  }
  const created = systemStore.upsertKnowledgePoint({
    title,
    content,
    tags: parseKnowledgePointTags(knowledgeDraft.tags),
    enabled: true,
  })
  if (!created) {
    uiNotice.value = t('知识点保存失败（可能已达上限）。', 'Knowledge point save failed (limit reached).')
    return
  }
  resetKnowledgeDraft()
  isKnowledgeComposerOpen.value = false
  systemStore.saveNow()
  pulseSaved(t('知识点已添加。', 'Knowledge point added.'))
}

const resetKnowledgeDraft = () => {
  knowledgeDraft.title = ''
  knowledgeDraft.content = ''
  knowledgeDraft.tags = ''
  editingKnowledgePointId.value = ''
}

const formatKnowledgePointTags = (point) =>
  Array.isArray(point?.tags) ? point.tags.join(', ') : ''

const editingKnowledgePoint = computed(() =>
  editingKnowledgePointId.value ? systemStore.getKnowledgePointById(editingKnowledgePointId.value) : null,
)

const isEditingKnowledgePoint = computed(() => Boolean(editingKnowledgePoint.value?.id))

const openCreateKnowledgePoint = () => {
  resetKnowledgeDraft()
  isKnowledgeComposerOpen.value = true
  saved.value = false
  uiNotice.value = ''
}

const closeKnowledgeComposer = () => {
  resetKnowledgeDraft()
  isKnowledgeComposerOpen.value = false
  uiNotice.value = ''
  saved.value = false
}

const openEditKnowledgePoint = (point) => {
  if (!point?.id) return
  editingKnowledgePointId.value = point.id
  knowledgeDraft.title = point.title || ''
  knowledgeDraft.content = point.content || ''
  knowledgeDraft.tags = formatKnowledgePointTags(point)
  isKnowledgeComposerOpen.value = true
  saved.value = false
  uiNotice.value = ''
}

const submitKnowledgePoint = () => {
  if (!editingKnowledgePointId.value) {
    createKnowledgePoint()
    return
  }

  const title = knowledgeDraft.title.trim()
  const content = knowledgeDraft.content.trim()
  if (!title && !content) {
    uiNotice.value = t('请先输入标题或内容。', 'Please enter title or content first.')
    return
  }

  if (!editingKnowledgePoint.value?.id) {
    resetKnowledgeDraft()
    isKnowledgeComposerOpen.value = false
    uiNotice.value = t('要编辑的知识点已不存在。', 'The knowledge point you were editing no longer exists.')
    return
  }

  const savedPoint = systemStore.upsertKnowledgePoint({
    id: editingKnowledgePoint.value.id,
    title,
    content,
    tags: parseKnowledgePointTags(knowledgeDraft.tags),
    enabled: editingKnowledgePoint.value.enabled !== false,
  })
  if (!savedPoint) {
    uiNotice.value = t('知识点保存失败（可能已达上限）。', 'Knowledge point save failed (limit reached).')
    return
  }

  resetKnowledgeDraft()
  isKnowledgeComposerOpen.value = false
  systemStore.saveNow()
  pulseSaved(t('知识点已更新。', 'Knowledge point updated.'))
}

const toggleKnowledgePoint = (point) => {
  if (!point?.id) return
  systemStore.setKnowledgePointEnabled(point.id, !point.enabled)
  systemStore.saveNow()
}

const getKnowledgePointUsage = (point) => {
  const pointId = typeof point?.id === 'string' ? point.id.trim() : ''
  if (!pointId) {
    return {
      profiles: [],
      chatBindingCount: 0,
      chatProfileCount: 0,
    }
  }

  const profiles = roleProfiles.value.filter((profile) =>
    Array.isArray(profile?.knowledgePointIds) && profile.knowledgePointIds.includes(pointId),
  )
  const chatProfiles = profiles.filter((profile) =>
    (roleProfileChatBindingMap.value.get(Number(profile.id)) || 0) > 0,
  )
  const chatBindingCount = chatProfiles.reduce(
    (sum, profile) => sum + (roleProfileChatBindingMap.value.get(Number(profile.id)) || 0),
    0,
  )

  return {
    profiles,
    chatBindingCount,
    chatProfileCount: chatProfiles.length,
  }
}

const getKnowledgePointUsageBadge = (point) => {
  const state = getKnowledgePointUsageState(point)
  if (state === 'unused') {
    return {
      label: t('未使用', 'Unused'),
      tone: 'neutral',
      icon: 'fas fa-circle',
    }
  }
  if (state === 'disabled') {
    return {
      label: t('已停用', 'Disabled'),
      tone: 'amber',
      icon: 'fas fa-pause',
    }
  }
  if (state === 'profile_only') {
    return {
      label: t('仅角色档案', 'Profile only'),
      tone: 'amber',
      icon: 'fas fa-user-tag',
    }
  }
  return {
    label: t('进入 Chat', 'In Chat'),
    tone: 'emerald',
    icon: 'fas fa-comments',
  }
}

const getKnowledgePointUsageState = (point) => {
  const usage = getKnowledgePointUsage(point)
  if (point?.enabled === false) return 'disabled'
  if (usage.profiles.length <= 0) return 'unused'
  if (usage.chatBindingCount <= 0) return 'profile_only'
  return 'chat_ready'
}

const enabledKnowledgePointCount = computed(() =>
  knowledgePoints.value.filter((point) => point.enabled !== false).length,
)

const boundKnowledgePointCount = computed(() =>
  knowledgePoints.value.filter((point) => getKnowledgePointUsage(point).profiles.length > 0).length,
)

const chatReadyKnowledgePointCount = computed(() =>
  knowledgePoints.value.filter((point) => getKnowledgePointUsageState(point) === 'chat_ready').length,
)

const knowledgeUsageFilterOptions = computed(() => {
  const counts = scopedKnowledgePoints.value.reduce(
    (acc, point) => {
      const state = getKnowledgePointUsageState(point)
      acc.all += 1
      acc[state] = (acc[state] || 0) + 1
      return acc
    },
    {
      all: 0,
      unused: 0,
      profile_only: 0,
      chat_ready: 0,
      disabled: 0,
    },
  )

  return [
    { value: 'all', label: t('全部', 'All'), count: counts.all },
    { value: 'chat_ready', label: t('已进入 Chat', 'In Chat'), count: counts.chat_ready },
    { value: 'profile_only', label: t('仅角色档案', 'Profile only'), count: counts.profile_only },
    { value: 'unused', label: t('未使用', 'Unused'), count: counts.unused },
    { value: 'disabled', label: t('已停用', 'Disabled'), count: counts.disabled },
  ]
})

const normalizedKnowledgeSearchKeyword = computed(() => knowledgeSearchKeyword.value.trim())

const searchedKnowledgePoints = computed(() =>
  systemStore.listKnowledgePoints({
    keyword: normalizedKnowledgeSearchKeyword.value,
  }),
)

const scopedKnowledgePoints = computed(() => {
  if (knowledgeDeepLinkPointIds.value.length <= 0) return searchedKnowledgePoints.value
  const pointIdSet = new Set(knowledgeDeepLinkPointIds.value)
  return searchedKnowledgePoints.value.filter((point) => pointIdSet.has(point.id))
})

const knowledgeSearchPlaceholder = computed(() =>
  t('搜索标题、内容或标签', 'Search title, content, or tags'),
)

const knowledgeTagFilterOptions = computed(() => {
  const counts = new Map()
  const usageFilteredPoints = scopedKnowledgePoints.value.filter(
    (point) =>
      knowledgeUsageFilter.value === 'all' || getKnowledgePointUsageState(point) === knowledgeUsageFilter.value,
  )

  usageFilteredPoints.forEach((point) => {
    if (!Array.isArray(point?.tags)) return
    point.tags.forEach((tag) => {
      if (typeof tag !== 'string' || !tag.trim()) return
      counts.set(tag, (counts.get(tag) || 0) + 1)
    })
  })

  const options = [
    {
      value: 'all',
      label: t('全部标签', 'All tags'),
      count: usageFilteredPoints.length,
    },
    ...[...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' }))
      .map(([tag, count]) => ({
        value: tag,
        label: `#${tag}`,
        count,
      })),
  ]

  if (
    knowledgeTagFilter.value !== 'all' &&
    !options.some((option) => option.value === knowledgeTagFilter.value)
  ) {
    options.push({
      value: knowledgeTagFilter.value,
      label: `#${knowledgeTagFilter.value}`,
      count: 0,
    })
  }

  return options
})

const knowledgeUsageSortOptions = computed(() => [
  { value: 'recent', label: t('最近更新', 'Recent') },
  { value: 'state', label: t('使用状态', 'Usage state') },
  { value: 'role_count', label: t('绑定角色数', 'Bound roles') },
  { value: 'title', label: t('标题', 'Title') },
])

const knowledgePointUpdatedAt = (point) => {
  const updatedAt = Number(point?.updatedAt)
  if (Number.isFinite(updatedAt) && updatedAt > 0) return updatedAt
  const createdAt = Number(point?.createdAt)
  return Number.isFinite(createdAt) && createdAt > 0 ? createdAt : 0
}

const compareKnowledgePointTitle = (a, b) => {
  const titleA = typeof a?.title === 'string' ? a.title.trim() : ''
  const titleB = typeof b?.title === 'string' ? b.title.trim() : ''
  return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' })
}

const visibleKnowledgePoints = computed(() => {
  const filter = knowledgeUsageFilter.value
  const sort = knowledgeUsageSort.value
  const tagFilter = knowledgeTagFilter.value
  const usageStateOrder = {
    unused: 0,
    profile_only: 1,
    disabled: 2,
    chat_ready: 3,
  }

  return scopedKnowledgePoints.value
    .filter((point) => filter === 'all' || getKnowledgePointUsageState(point) === filter)
    .filter(
      (point) =>
        tagFilter === 'all' ||
        (Array.isArray(point?.tags) && point.tags.some((tag) => tag === tagFilter)),
    )
    .slice()
    .sort((a, b) => {
      if (sort === 'title') return compareKnowledgePointTitle(a, b)
      if (sort === 'role_count') {
        const usageA = getKnowledgePointUsage(a)
        const usageB = getKnowledgePointUsage(b)
        return usageB.profiles.length - usageA.profiles.length || compareKnowledgePointTitle(a, b)
      }
      if (sort === 'state') {
        return (
          usageStateOrder[getKnowledgePointUsageState(a)] -
            usageStateOrder[getKnowledgePointUsageState(b)] ||
          compareKnowledgePointTitle(a, b)
        )
      }
      return knowledgePointUpdatedAt(b) - knowledgePointUpdatedAt(a) || compareKnowledgePointTitle(a, b)
    })
})

const knowledgeDeepLinkPoints = computed(() =>
  knowledgeDeepLinkPointIds.value
    .map((pointId) => systemStore.getKnowledgePointById(pointId))
    .filter(Boolean),
)

const knowledgeDeepLinkActive = computed(
  () =>
    knowledgeDeepLinkPointIds.value.length > 0 ||
    Boolean(knowledgeDeepLinkSource.value) ||
    Boolean(knowledgeDeepLinkKeyword.value) ||
    knowledgeDeepLinkTag.value !== 'all' ||
    knowledgeDeepLinkUsage.value !== 'all',
)

const knowledgeDeepLinkSourceLabel = computed(() => {
  if (knowledgeDeepLinkSource.value === 'calendar') return t('Calendar', 'Calendar')
  if (knowledgeDeepLinkSource.value === 'map') return t('Map', 'Map')
  if (knowledgeDeepLinkSource.value === 'chat') return t('Chat', 'Chat')
  return t('模块上下文', 'Module context')
})

const knowledgeDeepLinkSummary = computed(() => {
  if (knowledgeDeepLinkPointIds.value.length > 0) {
    return t(
      `${knowledgeDeepLinkSourceLabel.value} 带来了 ${knowledgeDeepLinkPointIds.value.length} 条相关知识点筛选。`,
      `${knowledgeDeepLinkSourceLabel.value} scoped ${knowledgeDeepLinkPointIds.value.length} related knowledge points.`,
    )
  }
  if (knowledgeDeepLinkKeyword.value) {
    return t(
      `${knowledgeDeepLinkSourceLabel.value} 预填了关键字：${knowledgeDeepLinkKeyword.value}`,
      `${knowledgeDeepLinkSourceLabel.value} prefilled keyword: ${knowledgeDeepLinkKeyword.value}`,
    )
  }
  if (knowledgeDeepLinkTag.value !== 'all' || knowledgeDeepLinkUsage.value !== 'all') {
    return t(
      `${knowledgeDeepLinkSourceLabel.value} 带来了筛选条件，可直接继续查看相关知识点。`,
      `${knowledgeDeepLinkSourceLabel.value} applied direct filters for related knowledge points.`,
    )
  }
  return t(
    `${knowledgeDeepLinkSourceLabel.value} 已把你带到当前相关的 WorldBook 范围。`,
    `${knowledgeDeepLinkSourceLabel.value} brought you into the relevant WorldBook scope.`,
  )
})

const isDeepLinkedKnowledgePoint = (point) =>
  Boolean(point?.id) && knowledgeDeepLinkPointIds.value.includes(point.id)

const syncWorldBookDeepLink = () => {
  knowledgeDeepLinkSource.value = normalizeWorldBookSource(route.query.source)
  knowledgeDeepLinkKeyword.value =
    typeof route.query.keyword === 'string' ? route.query.keyword.trim() : ''
  knowledgeDeepLinkTag.value = normalizeWorldBookTagFilter(route.query.tag)
  knowledgeDeepLinkUsage.value = normalizeWorldBookUsageFilter(route.query.usage)

  const pointIds = normalizeWorldBookPointIds(route.query.points || route.query.point)
  const existingPointIds = new Set(knowledgePoints.value.map((point) => point.id))
  knowledgeDeepLinkPointIds.value = pointIds.filter((pointId) => existingPointIds.has(pointId))

  const singlePoint =
    knowledgeDeepLinkPointIds.value.length === 1
      ? systemStore.getKnowledgePointById(knowledgeDeepLinkPointIds.value[0])
      : null

  knowledgeSearchKeyword.value = knowledgeDeepLinkKeyword.value || singlePoint?.title || ''
  knowledgeTagFilter.value = knowledgeDeepLinkTag.value
  knowledgeUsageFilter.value = knowledgeDeepLinkUsage.value
}

const clearKnowledgeDeepLink = () => {
  router.replace('/worldbook')
}

const describeKnowledgePointUsage = (point) => {
  const usage = getKnowledgePointUsage(point)
  if (usage.profiles.length <= 0) {
    return t('还没有角色绑定这个知识点。', 'No role profile is bound to this point yet.')
  }

  const profileCount = usage.profiles.length
  if (point?.enabled === false) {
    return t(
      `已被 ${profileCount} 个角色绑定，但当前停用，不会注入 Chat。`,
      `${profileCount} role profiles are bound, but this point is disabled and will not be injected into Chat.`,
    )
  }
  if (usage.chatBindingCount <= 0) {
    return t(
      `已被 ${profileCount} 个角色绑定；这些角色尚未绑定到 Chat 会话，因此暂未进入 Chat 提示词链路。`,
      `${profileCount} role profiles are bound; none are bound to Chat contacts yet, so this point is not in the Chat prompt chain.`,
    )
  }
  return t(
    `已被 ${profileCount} 个角色绑定，其中 ${usage.chatProfileCount} 个角色已连接 ${usage.chatBindingCount} 个 Chat 会话；启用时会进入这些会话的提示词链路。`,
    `${profileCount} role profiles are bound; ${usage.chatProfileCount} profiles connect to ${usage.chatBindingCount} Chat contacts, so this enabled point enters those Chat prompt chains.`,
  )
}

const formatKnowledgePointProfileNames = (point) => {
  const usage = getKnowledgePointUsage(point)
  if (usage.profiles.length <= 0) return ''
  const names = usage.profiles
    .map((profile) => (typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : t('未命名角色', 'Unnamed role')))
    .slice(0, 4)
  const overflow = Math.max(0, usage.profiles.length - names.length)
  return overflow > 0 ? `${names.join(' / ')} +${overflow}` : names.join(' / ')
}

const removeKnowledgePoint = async (point) => {
  if (!point?.id) return
  const ok = await confirmDialog({
    title: t('删除知识点', 'Delete knowledge point'),
    message: `${t('确认删除知识点', 'Delete knowledge point')}「${point.title || ''}」？`,
    confirmText: t('删除', 'Delete'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return
  systemStore.removeKnowledgePoint(point.id)
  if (editingKnowledgePointId.value === point.id) {
    resetKnowledgeDraft()
    isKnowledgeComposerOpen.value = false
  }
  systemStore.saveNow()
  pulseSaved(t('知识点已删除。', 'Knowledge point deleted.'))
}

watch(
  () => worldOverview.value.activePack?.id,
  (packId) => {
    if (!selectedWorldPackId.value || selectedWorldPackId.value === packId) {
      selectedWorldPackId.value = packId || 'default_world'
    }
    if (
      worldAppTemplateProposalReview.value?.worldPackId &&
      worldAppTemplateProposalReview.value.worldPackId !== (packId || 'default_world')
    ) {
      worldAppTemplateProposalReview.value = null
      worldAppTemplateProposalNotice.value = ''
    }
  },
  { immediate: true },
)

watch(
  () => sourcePicker.assetId,
  () => {
    if (!sourcePicker.open) return
    const validIds = new Set(sourcePickerSections.value.map((section) => section.id))
    sourcePicker.sectionIds = sourcePicker.sectionIds.filter((id) => validIds.has(id))
    if (sourcePickerSections.value.length === 0) {
      sourcePicker.mode = 'whole'
    }
  },
)

watch(
  knowledgeDeepLinkActive,
  (active) => {
    if (active) activeWorldbookPanel.value = 'knowledge'
  },
  { immediate: true },
)

watch(
  () => route.fullPath,
  () => {
    syncWorldBookDeepLink()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (savedTimerId) clearTimeout(savedTimerId)
})
</script>

<template>
  <div class="worldbook-shell w-full h-full bg-[#f2f2f7] text-black flex flex-col">
    <div class="worldbook-header pt-12 pb-3 px-4 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center gap-3">
      <button @click="goSettings" class="worldbook-nav-button text-blue-500 text-sm flex items-center gap-1">
        <i class="fas fa-chevron-left"></i> {{ returnButtonLabel }}
      </button>
      <h1 class="font-bold text-xl">{{ t('世界书', 'World Book') }}</h1>
    </div>

    <div class="worldbook-scroll flex-1 px-4 py-4 overflow-y-auto no-scrollbar space-y-4">
      <WorldBookOverview
        :overview="worldOverview"
        :saved="saved"
      />

      <section class="worldbook-control-deck" data-testid="worldbook-control-deck">
        <div class="worldbook-control-deck__head">
          <div>
            <p>{{ t('世界上下文控制台', 'World context console') }}</p>
            <h2>{{ activeWorldbookPanelLabel }}</h2>
          </div>
          <span>
            {{
              t(
                `${activeBookSourceCount} 个文本来源正在生效`,
                `${activeBookSourceCount} text sources active`,
              )
            }}
          </span>
        </div>
        <div class="worldbook-panel-tabs" role="tablist" :aria-label="t('WorldBook 面板', 'WorldBook panels')">
          <button
            v-for="panel in worldbookPanelTabs"
            :key="panel.id"
            type="button"
            role="tab"
            :aria-selected="activeWorldbookPanel === panel.id"
            :class="['worldbook-panel-tab', { 'is-active': activeWorldbookPanel === panel.id }]"
            :data-testid="`worldbook-panel-tab-${panel.id}`"
            @click="setWorldbookPanel(panel.id)"
          >
            <i :class="panel.icon" aria-hidden="true"></i>
            <span>{{ panel.label }}</span>
            <small>{{ panel.summary }}</small>
          </button>
        </div>
      </section>

      <div
        v-show="activeWorldbookPanel === 'pack'"
        class="worldbook-panel"
        data-testid="worldbook-panel-pack"
      >
        <CurrentWorldPackPanel
          :overview="worldOverview"
          :packs="worldPackCandidates"
          :selected-pack-id="selectedWorldPackId || worldOverview.activePack?.id"
          :activation-review="selectedWorldPackReview"
          :enabled-packs="enabledWorldPacks"
          :world-profile="user.worldProfileAnalysis"
          :recommendation-review="worldPackRecommendationReview"
          :world-profile-loading="worldProfileAnalysisLoading"
          :world-profile-notice="worldProfileAnalysisNotice"
          :app-binding-rows="activeWorldPackAppBindingRows"
          :service-template-rows="activeWorldPackServiceTemplateRows"
          :template-registry-rows="worldAppTemplateRegistryRows"
          :template-proposal-review="worldAppTemplateProposalReview"
          :template-proposal-draft="worldAppTemplateProposalDraft"
          :template-proposal-loading="worldAppTemplateProposalLoading"
          :template-proposal-notice="worldAppTemplateProposalNotice"
          :template-proposal-notice-tone="worldAppTemplateProposalNoticeTone"
          @select-pack="selectWorldPack"
          @activate-pack="activateSelectedWorldPack"
          @analyze-world-profile="analyzeWorldForExpansions"
          @enable-pack="enableWorldPackExpansion"
          @disable-pack="disableWorldPackExpansion"
          @extract-template-proposals="extractWorldAppTemplateProposalsFromAI"
          @review-template-proposal-draft="reviewWorldAppTemplateProposalDraft"
          @update-template-proposal-draft="updateWorldAppTemplateProposalDraft"
          @confirm-template-proposal="confirmWorldAppTemplateProposalEntry"
          @clear-template-proposal-review="clearWorldAppTemplateProposalReview"
        />
      </div>

      <div
        v-show="activeWorldbookPanel === 'sources'"
        class="worldbook-panel"
        data-testid="worldbook-panel-sources"
      >
        <section
          v-if="showWorldBookOnboarding"
          class="worldbook-onboarding-card"
          data-testid="worldbook-onboarding-card"
        >
        <div>
          <p>{{ t('首次设置', 'First setup') }}</p>
          <h2>{{ t('先选择一个会影响上下文的来源', 'Start with a source') }}</h2>
          <span>
            {{
              t(
                '文本库负责保存和编辑；WorldBook 负责决定是否启用到对话上下文。',
                'Book stores and edits text; WorldBook decides whether it is active.',
              )
            }}
          </span>
        </div>
        <div class="worldbook-onboarding-actions">
          <button type="button" class="worldbook-primary-action" @click="addFirstBookSource">
            {{ sourcePickerAssets.length > 0 ? t('从文本库选择', 'Choose from Book') : t('打开文本库', 'Open Book') }}
          </button>
          <button
            type="button"
            class="worldbook-secondary-action"
            data-testid="worldbook-copy-fallback-to-book"
            @click="copyFallbackWorldviewToBook"
          >
            {{ t('复制 fallback 到文本库', 'Copy fallback to Book') }}
          </button>
        </div>
      </section>

      <section class="worldbook-source-console" data-testid="worldbook-book-sources">
        <div class="worldbook-source-head">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ t('文本库来源', 'Book sources') }}
            </p>
            <h2 class="text-lg font-semibold">
              {{ t('由世界书选择启用哪些长文本', 'WorldBook chooses active long text') }}
            </h2>
            <p class="text-sm text-gray-500">
              {{
                t(
                  '文本库负责保存和编辑长文档；这里仅保存引用，控制哪些内容进入之后的世界上下文。',
                  'Book stores and edits long documents; this panel only keeps references for future world context.',
                )
              }}
            </p>
          </div>
          <button type="button" class="worldbook-secondary-action" data-testid="worldbook-book-source-add" @click="addFirstBookSource">
            {{ sourcePickerAssets.length > 0 ? t('连接文本', 'Link source') : t('打开文本库', 'Open Book') }}
          </button>
        </div>

        <div class="worldbook-source-stats" data-testid="worldbook-source-stats">
          <span>
            <strong>{{ activeBookSourceCount }}</strong>
            {{ t('正在生效', 'Active') }}
          </span>
          <span :class="{ 'is-warning': bookSourceIssueCount > 0 }">
            <strong>{{ bookSourceIssueCount }}</strong>
            {{ t('待处理', 'Needs review') }}
          </span>
          <span>
            <strong>{{ availableBookSourceCount }}</strong>
            {{ t('库内可选', 'Available') }}
          </span>
          <span>
            <strong>{{ disabledBookSourceCount }}</strong>
            {{ t('已停用', 'Disabled') }}
          </span>
        </div>

        <div class="worldbook-system-fallback" data-testid="worldbook-system-fallback">
          <div>
            <p>{{ t('系统 fallback', 'System fallback') }}</p>
            <strong>{{ worldBookCount }} {{ t('字', 'chars') }}</strong>
            <span>{{ fallbackWorldviewPreview }}</span>
          </div>
          <button
            type="button"
            class="worldbook-secondary-action"
            data-testid="worldbook-copy-fallback-to-book-inline"
            @click="copyFallbackWorldviewToBook"
          >
            {{ t('复制到文本库', 'Copy to Book') }}
          </button>
        </div>

        <div
          v-if="sourcePicker.open"
          class="worldbook-sheet-backdrop"
          data-testid="worldbook-source-picker-backdrop"
          @click="closeBookSourcePicker"
        ></div>
        <div
          v-if="sourcePicker.open"
          class="worldbook-source-picker"
          data-testid="worldbook-source-picker"
          role="dialog"
          :aria-label="t('选择文本库来源', 'Choose Book source')"
        >
          <div class="worldbook-sheet-head">
            <div>
              <p>{{ t('连接文本来源', 'Link text source') }}</p>
              <h3>{{ sourcePickerAsset?.title || t('文本库来源', 'Book source') }}</h3>
            </div>
            <button type="button" class="worldbook-inline-action" @click="closeBookSourcePicker">
              {{ t('关闭', 'Close') }}
            </button>
          </div>
          <div v-if="sourcePickerAsset" class="worldbook-picker-asset-summary">
            <span><i class="fas fa-book-open"></i></span>
            <div>
              <strong>{{ sourcePickerAsset.title }}</strong>
              <small>
                {{ sourcePickerAsset.content?.length || 0 }} {{ t('字', 'chars') }} /
                {{ sourcePickerSections.length }} {{ t('段落', 'sections') }}
              </small>
            </div>
          </div>
          <div class="worldbook-picker-grid">
            <label>
              <span>{{ t('文本来源', 'Text source') }}</span>
              <select v-model="sourcePicker.assetId" data-testid="worldbook-source-picker-asset">
                <option v-for="asset in sourcePickerAssets" :key="asset.id" :value="asset.id">
                  {{ asset.title }}
                </option>
              </select>
            </label>
            <label>
              <span>{{ t('启用用途', 'Usage') }}</span>
              <select v-model="sourcePicker.usage" data-testid="worldbook-source-picker-usage">
                <option v-for="option in sourceUsageOptions" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="worldbook-picker-mode" data-testid="worldbook-source-picker-mode">
            <label>
              <input v-model="sourcePicker.mode" type="radio" value="whole" />
              <span>{{ t('启用全文', 'Use whole document') }}</span>
            </label>
            <label :class="{ 'is-disabled': sourcePickerSections.length === 0 }">
              <input v-model="sourcePicker.mode" type="radio" value="sections" :disabled="sourcePickerSections.length === 0" />
              <span>{{ t('只启用选中段落', 'Use selected sections') }}</span>
            </label>
          </div>

          <div v-if="sourcePicker.mode === 'sections'" class="worldbook-section-picker" data-testid="worldbook-source-picker-sections">
            <div class="worldbook-section-toolbar">
              <span>{{ sourcePickerSelectedSections.length }} / {{ sourcePickerSections.length }} {{ t('段落', 'sections') }}</span>
              <div>
                <button type="button" class="worldbook-inline-action" @click="selectAllSourcePickerSections" data-testid="worldbook-source-picker-select-all">
                  {{ t('全选', 'All') }}
                </button>
                <button type="button" class="worldbook-inline-action" @click="clearSourcePickerSections" data-testid="worldbook-source-picker-clear">
                  {{ t('清空', 'Clear') }}
                </button>
              </div>
            </div>
            <label
              v-for="section in sourcePickerSections"
              :key="section.id"
              class="worldbook-section-choice"
              :data-testid="`worldbook-source-picker-section-${section.id}`"
            >
              <input
                type="checkbox"
                :checked="sourcePicker.sectionIds.includes(section.id)"
                @change="toggleSourcePickerSection(section.id)"
              />
              <span>
                <strong>{{ section.title }}</strong>
                <small>{{ section.charCount }} {{ t('字', 'chars') }}</small>
              </span>
            </label>
          </div>

          <div class="worldbook-picker-actions">
            <button type="button" class="worldbook-secondary-action" @click="closeBookSourcePicker" data-testid="worldbook-source-picker-cancel">
              {{ t('取消', 'Cancel') }}
            </button>
            <button type="button" class="worldbook-primary-action" @click="linkPickedBookSource" data-testid="worldbook-source-picker-confirm">
              {{ t('启用来源', 'Use source') }}
            </button>
          </div>
        </div>

        <div v-if="linkedBookSources.length === 0" class="worldbook-source-empty" data-testid="worldbook-book-source-empty">
          <span><i class="fas fa-link-slash"></i></span>
          <strong>{{ t('还没有连接文本来源', 'No text sources linked') }}</strong>
          <p>{{ t('当前只会使用系统 fallback；连接 Book 文本后，Chat 与运行时会读取被启用的来源。', 'Only the system fallback is active until Book text is linked.') }}</p>
        </div>

        <div v-else class="worldbook-source-list">
        <article
          v-for="link in linkedBookSources"
          :key="link.id"
          class="worldbook-source-card"
          :class="{
            'is-disabled': link.enabled === false,
            'is-warning': link.changed && !link.missing,
            'is-missing': link.missing,
          }"
          :data-testid="`worldbook-book-source-${link.id}`"
        >
          <div class="worldbook-source-card__main">
            <span class="worldbook-source-card__icon">
              <i :class="link.missing ? 'fas fa-triangle-exclamation' : link.changed ? 'fas fa-rotate' : 'fas fa-file-lines'"></i>
            </span>
            <div class="min-w-0">
              <p>{{ link.title }}</p>
              <small>{{ link.usageLabel }} / {{ link.sectionSummary }}</small>
            </div>
          </div>
          <div class="worldbook-source-card__meta">
            <span :class="link.enabled === false ? 'is-muted' : 'is-success'">
              {{ link.enabled === false ? t('停用', 'Disabled') : t('启用', 'Enabled') }}
            </span>
            <span v-if="link.missing" class="is-danger">{{ t('来源缺失', 'Missing source') }}</span>
            <span v-else-if="link.changed" class="is-warning">{{ t('待复核', 'Needs review') }}</span>
          </div>
          <div class="worldbook-source-card__actions">
            <button v-if="link.changed && !link.missing" type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-review-${link.id}`" @click="openBookSourceReview(link)">
              {{ t('查看变更', 'Review changes') }}
            </button>
            <button type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-toggle-${link.id}`" @click="toggleBookSource(link)">
              {{ link.enabled === false ? t('启用', 'Enable') : t('停用', 'Disable') }}
            </button>
            <button type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-open-${link.id}`" @click="openBookSource(link.assetId)">
              {{ t('打开', 'Open') }}
            </button>
            <button type="button" class="worldbook-secondary-action worldbook-danger-action" :data-testid="`worldbook-book-source-remove-${link.id}`" @click="removeBookSource(link.id)">
              {{ t('移除', 'Remove') }}
            </button>
          </div>
        </article>
        </div>

        <div
          v-if="reviewingBookSource"
          class="worldbook-sheet-backdrop"
          data-testid="worldbook-source-review-backdrop"
          @click="closeBookSourceReview"
        ></div>
        <div
          v-if="reviewingBookSource"
          class="worldbook-source-review"
          data-testid="worldbook-book-source-review-panel"
          role="dialog"
          :aria-label="t('来源变更预览', 'Source change preview')"
        >
          <div class="worldbook-source-review-head">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {{ t('来源变更预览', 'Source change preview') }}
              </p>
              <h3>{{ reviewingBookSource.title }}</h3>
              <p>
                {{
                  sourceReviewDiff.hasPreviousSnapshot
                    ? t('下面只展示这条来源会影响世界上下文的文本变化。', 'Only changes that affect this active source are shown below.')
                    : t('这条旧引用没有可对比的旧版快照，可以把当前内容设为新的复核基线。', 'This older link has no previous snapshot. You can accept the current text as the new review baseline.')
                }}
              </p>
            </div>
            <button type="button" class="worldbook-inline-action" data-testid="worldbook-book-source-review-close" @click="closeBookSourceReview">
              {{ t('关闭', 'Close') }}
            </button>
          </div>

          <div class="worldbook-source-review-summary" data-testid="worldbook-book-source-review-summary">
            <span>{{ sourceReviewSummary }}</span>
            <span v-if="reviewingBookSource.snapshotIsPartial || sourceReviewDiff.truncated">
              {{ t('长文本仅展示前段预览，接受新版会记录新的基线。', 'Long text is previewed partially; accepting stores the new baseline.') }}
            </span>
          </div>

          <div class="worldbook-source-diff-list">
            <p
              v-for="(entry, index) in sourceReviewDiff.entries"
              :key="`${entry.type}-${index}`"
              class="worldbook-source-diff-row"
              :class="`is-${entry.type}`"
              :data-testid="`worldbook-source-diff-${entry.type}`"
            >
              <span class="worldbook-source-diff-mark">
                {{ entry.type === 'added' ? '+' : entry.type === 'removed' ? '-' : '' }}
              </span>
              <span>{{ entry.text }}</span>
            </p>
            <p v-if="sourceReviewDiff.entries.length === 0" class="worldbook-source-diff-empty">
              {{ t('当前启用内容没有文字变化。', 'The active text has no content changes.') }}
            </p>
          </div>

          <div class="worldbook-picker-actions">
            <button type="button" class="worldbook-secondary-action" @click="openBookSource(reviewingBookSource.assetId)">
              {{ t('打开原文', 'Open source') }}
            </button>
            <button
              type="button"
              class="worldbook-primary-action"
              data-testid="worldbook-book-source-review-accept"
              @click="acceptReviewedBookSource"
            >
              {{ t('接受新版', 'Accept new version') }}
            </button>
          </div>
        </div>
      </section>
      </div>

      <div
        v-show="activeWorldbookPanel === 'kernel'"
        class="worldbook-panel worldbook-kernel-panel"
        data-testid="worldbook-world-kernel"
      >
        <div class="worldbook-kernel-hero">
          <div>
            <p>{{ t('基础规则', 'Core rules') }}</p>
            <h2>{{ t('基础世界观', 'Global worldview') }}</h2>
            <span>
              {{
                t(
                  '这里保留一个轻量 fallback；长文本请放进 Book，再从来源面板启用。',
                  'Keep this as a lightweight fallback; long text should live in Book and be activated from Sources.',
                )
              }}
            </span>
          </div>
          <span>
            <strong>{{ worldBookCount }}</strong>
            {{ t('字', 'chars') }}
          </span>
        </div>
        <textarea
          v-model="globalWorldview"
          class="worldbook-kernel-editor"
          :placeholder="
            t(
              '例如：世界规则、时代背景、组织结构、角色关系约束...',
              'Example: world rules, era background, organization structure, and role constraints...',
            )
          "
        ></textarea>
        <div class="worldbook-kernel-actions">
          <p>{{ t('保存后会作为没有 Book 来源时的基础上下文。', 'Saved text is used when no Book source is active.') }}</p>
          <button
            type="button"
            class="worldbook-primary-action"
            :class="{ 'is-saved': saved }"
            @click="saveWorldBook"
          >
            {{ saved ? t('已保存', 'Saved') : t('保存世界观', 'Save worldview') }}
          </button>
        </div>
      </div>

      <section
        v-show="activeWorldbookPanel === 'templates'"
        class="worldbook-panel worldbook-template-panel"
        data-testid="worldbook-profile-templates"
      >
        <div class="worldbook-template-hero">
          <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {{ t('角色档案模板', 'Role profile templates') }}
          </p>
          <h2 class="text-lg font-semibold">
            {{ t('世界书定义角色档案结构', 'WorldBook defines profile structure') }}
          </h2>
          <p class="text-sm text-gray-500">
            {{
              t(
                '先把预设复制到当前世界观，再到联系人中填写具体角色值。',
                'Copy a preset into the current worldview, then fill concrete values in Contacts.',
              )
            }}
          </p>
          </div>
          <div class="worldbook-template-stats">
            <span>
              <strong>{{ profileTemplatePresets.length }}</strong>
              {{ t('预设', 'Presets') }}
            </span>
            <span>
              <strong>{{ worldProfileTemplates.length }}</strong>
              {{ t('当前世界', 'World') }}
            </span>
          </div>
        </div>

        <div class="worldbook-template-section">
          <p class="text-sm font-semibold">{{ t('全局预设模板', 'Global preset templates') }}</p>
          <div v-for="preset in profileTemplatePresets" :key="preset.id" class="worldbook-template-row">
            <div class="min-w-0">
              <p class="font-medium truncate">{{ preset.title }}</p>
              <p class="text-xs text-gray-500">{{ preset.fields.length }} {{ t('字段', 'fields') }}</p>
            </div>
            <button
              type="button"
              class="worldbook-secondary-action"
              :data-testid="`worldbook-template-copy-${preset.id}`"
              @click="copyProfileTemplatePreset(preset.id)"
            >
              {{ t('复制到当前世界观', 'Copy to worldview') }}
            </button>
          </div>
        </div>

        <div class="worldbook-template-section">
          <p class="text-sm font-semibold">{{ t('当前世界模板', 'World-specific templates') }}</p>
          <p v-if="worldProfileTemplates.length === 0" class="text-sm text-gray-500">
            {{ t('还没有当前世界专用模板。', 'No world-specific templates yet.') }}
          </p>
          <div v-for="template in worldProfileTemplates" :key="template.id" class="worldbook-template-row">
            <div class="min-w-0">
              <p class="font-medium truncate">{{ template.title }}</p>
              <p class="text-xs text-gray-500">
                v{{ template.version }} · {{ template.fields.length }} {{ t('字段', 'fields') }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div
        v-show="activeWorldbookPanel === 'knowledge'"
        class="worldbook-panel worldbook-knowledge-panel rounded-2xl bg-white border border-gray-200 p-4 space-y-3"
        data-testid="worldbook-knowledge-manager"
      >
        <div class="worldbook-knowledge-hero">
          <div>
            <p>{{ t('角色级补丁', 'Role-level patches') }}</p>
            <h2>{{ t('知识点', 'Knowledge points') }}</h2>
            <span>
              {{
                t(
                  '知识点用于语言规范、额外设定和模型偏好；绑定到角色后，才会进入对应 Chat 上下文。',
                  'Knowledge points store language rules, extra lore, and model hints; they enter Chat context only after role binding.',
                )
              }}
            </span>
          </div>
          <div class="worldbook-knowledge-stats">
            <span>
              <strong>{{ knowledgePoints.length }}</strong>
              {{ t('总数', 'Total') }}
            </span>
            <span>
              <strong>{{ enabledKnowledgePointCount }}</strong>
              {{ t('启用', 'Enabled') }}
            </span>
            <span>
              <strong>{{ boundKnowledgePointCount }}</strong>
              {{ t('已绑定', 'Bound') }}
            </span>
            <span>
              <strong>{{ chatReadyKnowledgePointCount }}</strong>
              Chat
            </span>
          </div>
        </div>

        <div class="worldbook-knowledge-toolbar">
          <div>
            <p>{{ t('知识点管理', 'Knowledge management') }}</p>
            <span>{{ t('保存可绑定到角色的语言规则、设定补丁和模型偏好。', 'Store role-bound language rules, lore patches, and model preferences.') }}</span>
          </div>
          <button
            type="button"
            class="worldbook-primary-action"
            data-testid="knowledge-open-create"
            @click="openCreateKnowledgePoint"
          >
            <i class="fas fa-plus"></i>
            {{ t('新增知识点', 'Add knowledge point') }}
          </button>
        </div>

        <div
          v-if="isKnowledgeComposerOpen"
          class="worldbook-sheet-backdrop"
          data-testid="knowledge-composer-backdrop"
          @click="closeKnowledgeComposer"
        ></div>
        <div
          v-if="isKnowledgeComposerOpen"
          class="worldbook-knowledge-compose space-y-2 rounded-xl border border-gray-200 p-3"
          role="dialog"
          :aria-label="isEditingKnowledgePoint ? t('编辑知识点', 'Edit knowledge point') : t('新增知识点', 'Add knowledge point')"
        >
          <div class="worldbook-sheet-head">
            <div>
              <p>{{ t('知识补丁', 'Knowledge patch') }}</p>
              <h3>{{ isEditingKnowledgePoint ? t('编辑知识点', 'Edit knowledge point') : t('新增知识点', 'Add knowledge point') }}</h3>
            </div>
            <button type="button" class="worldbook-inline-action" @click="closeKnowledgeComposer">
              {{ t('关闭', 'Close') }}
            </button>
          </div>
          <div v-if="isEditingKnowledgePoint" class="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            <span data-testid="knowledge-editing-state">
              {{ t('正在编辑已有知识点', 'Editing existing knowledge point') }}
            </span>
            <button
              type="button"
              data-testid="knowledge-edit-cancel"
              class="font-semibold text-amber-700"
              @click="closeKnowledgeComposer"
            >
              {{ t('取消编辑', 'Cancel edit') }}
            </button>
          </div>
          <input
            v-model="knowledgeDraft.title"
            data-testid="knowledge-draft-title"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('知识点标题（如：角色A语言规范）', 'Point title (e.g. Role A language rule)')"
          />
          <textarea
            v-model="knowledgeDraft.content"
            data-testid="knowledge-draft-content"
            class="w-full h-20 border rounded-lg px-3 py-2 text-sm outline-none resize-none"
            :placeholder="t('知识点内容', 'Knowledge point content')"
          ></textarea>
          <input
            v-model="knowledgeDraft.tags"
            data-testid="knowledge-draft-tags"
            class="w-full border rounded-lg px-3 py-2 text-sm outline-none"
            :placeholder="t('标签（逗号分隔）', 'Tags (comma separated)')"
          />
          <button
            v-if="isEditingKnowledgePoint"
            @click="submitKnowledgePoint"
            data-testid="knowledge-draft-submit"
            class="w-full py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold"
          >
            {{ t('保存修改', 'Save changes') }}
          </button>
          <button
            v-else
            @click="submitKnowledgePoint"
            data-testid="knowledge-draft-submit"
            class="w-full py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold"
          >
            {{ t('新增知识点', 'Add knowledge point') }}
          </button>
        </div>

        <div v-if="knowledgePoints.length > 0" class="worldbook-knowledge-filter rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
          <div
            v-if="knowledgeDeepLinkActive"
            data-testid="knowledge-deeplink-banner"
            class="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-800 space-y-2"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="font-medium">
                  {{ t('来自模块上下文的筛选', 'Scoped from module context') }}
                </p>
                <p class="mt-1 text-blue-700">
                  {{ knowledgeDeepLinkSummary }}
                </p>
              </div>
              <button
                type="button"
                data-testid="knowledge-deeplink-clear"
                class="shrink-0 text-[11px] text-blue-600"
                @click="clearKnowledgeDeepLink"
              >
                {{ t('清除', 'Clear') }}
              </button>
            </div>
            <div v-if="knowledgeDeepLinkPoints.length > 0" class="flex flex-wrap gap-1.5">
              <span
                v-for="point in knowledgeDeepLinkPoints"
                :key="point.id"
                :data-testid="`knowledge-deeplink-point-${point.id}`"
                class="rounded-full border border-blue-200 bg-white px-2 py-1 text-[11px] text-blue-700"
              >
                {{ point.title }}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <i class="fas fa-search text-[11px] text-gray-400"></i>
            <input
              v-model="knowledgeSearchKeyword"
              data-testid="knowledge-search-input"
              class="min-w-0 flex-1 bg-transparent text-xs outline-none"
              :placeholder="knowledgeSearchPlaceholder"
            />
            <button
              v-if="knowledgeSearchKeyword"
              type="button"
              data-testid="knowledge-search-clear"
              class="text-[11px] text-gray-400"
              @click="knowledgeSearchKeyword = ''"
            >
              {{ t('清空', 'Clear') }}
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="option in knowledgeUsageFilterOptions"
              :key="`knowledge-filter-${option.value}`"
              type="button"
              class="rounded-full border px-2 py-1 text-[11px] transition"
              :class="
                knowledgeUsageFilter === option.value
                  ? 'border-blue-300 bg-blue-50 text-blue-600'
                  : 'border-gray-200 bg-white text-gray-500'
              "
              @click="knowledgeUsageFilter = option.value"
            >
              {{ option.label }} · {{ option.count }}
            </button>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="option in knowledgeTagFilterOptions"
              :key="`knowledge-tag-${option.value}`"
              :data-testid="`knowledge-tag-filter-${option.value}`"
              type="button"
              class="rounded-full border px-2 py-1 text-[11px] transition"
              :class="
                knowledgeTagFilter === option.value
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-500'
              "
              @click="knowledgeTagFilter = option.value"
            >
              {{ option.label }} · {{ option.count }}
            </button>
          </div>
          <div class="flex items-center justify-between gap-2">
            <p class="text-[11px] text-gray-500">
              {{ t('当前显示', 'Showing') }} {{ visibleKnowledgePoints.length }} / {{ knowledgePoints.length }}
            </p>
            <select
              v-model="knowledgeUsageSort"
              class="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] outline-none"
            >
              <option
                v-for="option in knowledgeUsageSortOptions"
                :key="`knowledge-sort-${option.value}`"
                :value="option.value"
              >
                {{ t('排序', 'Sort') }}: {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="knowledgePoints.length === 0" class="worldbook-knowledge-empty text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg p-3 text-center">
          {{ t('暂无知识点。', 'No knowledge points yet.') }}
        </div>

        <div
          v-else-if="visibleKnowledgePoints.length === 0"
          class="worldbook-knowledge-empty text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg p-3 text-center"
        >
          {{ t('当前筛选下没有知识点。', 'No knowledge points match the current filter.') }}
        </div>

        <div v-else class="worldbook-knowledge-list space-y-2">
          <div
            v-for="point in visibleKnowledgePoints"
            :key="point.id"
            data-testid="knowledge-point-card"
            class="worldbook-knowledge-card rounded-xl border p-3 space-y-1"
            :class="isDeepLinkedKnowledgePoint(point) ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'"
          >
            <div class="worldbook-knowledge-card__head flex items-center justify-between gap-2">
              <p class="text-sm font-semibold truncate">{{ point.title }}</p>
              <div class="worldbook-knowledge-card__actions flex items-center gap-2 shrink-0">
                <AssetStatusBadge
                  :label="getKnowledgePointUsageBadge(point).label"
                  :tone="getKnowledgePointUsageBadge(point).tone"
                  :icon="getKnowledgePointUsageBadge(point).icon"
                  :truncate="false"
                />
                <button
                  @click="toggleKnowledgePoint(point)"
                  class="px-2 py-0.5 rounded text-[11px] border"
                  :class="point.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-600'"
                >
                  {{ point.enabled ? t('启用', 'Enabled') : t('停用', 'Disabled') }}
                </button>
                <button
                  :data-testid="`knowledge-edit-${point.id}`"
                  class="text-[11px] text-blue-500"
                  @click="openEditKnowledgePoint(point)"
                >
                  {{ t('编辑', 'Edit') }}
                </button>
                <button @click="removeKnowledgePoint(point)" class="text-[11px] text-red-500">
                  {{ t('删除', 'Delete') }}
                </button>
              </div>
            </div>
            <p class="worldbook-knowledge-card__content text-xs text-gray-600 whitespace-pre-wrap">{{ point.content }}</p>
            <p v-if="Array.isArray(point.tags) && point.tags.length > 0" class="worldbook-knowledge-card__tags text-[11px] text-gray-400">
              #{{ point.tags.join(' #') }}
            </p>
            <div class="worldbook-knowledge-usage rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 text-[11px] text-gray-600 space-y-1">
              <div class="flex flex-wrap items-center gap-1.5">
                <AssetStatusBadge
                  :label="t(`角色 ${getKnowledgePointUsage(point).profiles.length} 个`, `${getKnowledgePointUsage(point).profiles.length} roles`)"
                  icon="fas fa-user"
                  tone="neutral"
                  :truncate="false"
                />
                <AssetStatusBadge
                  :label="t(`Chat ${getKnowledgePointUsage(point).chatBindingCount} 个`, `${getKnowledgePointUsage(point).chatBindingCount} chats`)"
                  icon="fas fa-comment"
                  :tone="point.enabled === false || getKnowledgePointUsage(point).chatBindingCount <= 0 ? 'neutral' : 'emerald'"
                  :truncate="false"
                />
              </div>
              <p>{{ describeKnowledgePointUsage(point) }}</p>
              <p v-if="formatKnowledgePointProfileNames(point)" class="text-gray-500">
                {{ t('绑定角色', 'Bound roles') }}: {{ formatKnowledgePointProfileNames(point) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p v-if="uiNotice" class="text-[12px]" :class="saved ? 'text-emerald-600' : 'text-amber-600'">
        {{ uiNotice }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.worldbook-shell {
  background: var(--system-page-bg);
  color: var(--system-text);
}

.worldbook-header {
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  box-shadow: var(--system-shadow-chrome);
  backdrop-filter: blur(var(--system-blur-md));
  -webkit-backdrop-filter: blur(var(--system-blur-md));
}

.worldbook-header h1 {
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: 0;
  color: var(--system-text);
}

.worldbook-nav-button {
  min-height: 36px;
  color: var(--system-accent);
  -webkit-tap-highlight-color: transparent;
}

.worldbook-scroll {
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.worldbook-control-deck,
.worldbook-scroll > .rounded-2xl,
.worldbook-panel > .rounded-2xl {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.worldbook-control-deck {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.worldbook-control-deck__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.worldbook-control-deck__head p {
  margin: 0;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.worldbook-control-deck__head h2 {
  margin: 2px 0 0;
  color: var(--system-text);
  font-size: 18px;
  line-height: 1.2;
  font-weight: 850;
}

.worldbook-control-deck__head > span {
  flex-shrink: 0;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  padding: 6px 10px;
  color: var(--system-success);
  background: var(--system-success-soft);
  font-size: 11px;
  font-weight: 800;
}

.worldbook-panel-tabs {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.worldbook-panel-tab {
  display: grid;
  justify-items: start;
  gap: 4px;
  min-height: 76px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 10px;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
  text-align: left;
  font: inherit;
  transition:
    transform var(--system-motion-fast),
    border-color var(--system-motion-fast),
    background var(--system-motion-fast),
    color var(--system-motion-fast);
}

.worldbook-panel-tab i {
  font-size: 14px;
}

.worldbook-panel-tab span {
  color: var(--system-text);
  font-size: 12px;
  font-weight: 850;
}

.worldbook-panel-tab small {
  overflow: hidden;
  max-width: 100%;
  color: var(--system-text-soft);
  font-size: 10px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worldbook-panel-tab.is-active {
  border-color: color-mix(in srgb, var(--system-accent) 42%, var(--system-control-border));
  color: var(--system-accent);
  background:
    linear-gradient(180deg, var(--system-info-soft), transparent),
    var(--system-control-bg-strong);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
}

.worldbook-panel-tab:active {
  transform: scale(0.985);
}

.worldbook-panel {
  display: block;
}

.worldbook-panel > .rounded-2xl {
  width: 100%;
}

.worldbook-onboarding-card,
.worldbook-system-fallback {
  display: grid;
  gap: 12px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.worldbook-onboarding-card {
  padding: 16px;
}

.worldbook-onboarding-card p,
.worldbook-system-fallback p {
  margin: 0;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.worldbook-onboarding-card h2 {
  margin: 4px 0;
  color: var(--system-text);
  font-size: 18px;
  line-height: 1.25;
}

.worldbook-onboarding-card span,
.worldbook-system-fallback span {
  color: var(--system-text-muted);
  font-size: 13px;
  line-height: 1.45;
}

.worldbook-onboarding-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.worldbook-source-console {
  display: grid;
  gap: 12px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  padding: 14px;
  background:
    radial-gradient(circle at 92% 0%, var(--system-info-soft), transparent 34%),
    var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.worldbook-source-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.worldbook-source-head p,
.worldbook-source-head h2 {
  margin: 0;
}

.worldbook-source-head p {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.worldbook-source-head h2 {
  margin-top: 3px;
  color: var(--system-text);
  font-size: 20px;
  line-height: 1.18;
  font-weight: 850;
}

.worldbook-source-head p.text-sm {
  margin-top: 7px;
  max-width: 52ch;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.5;
  text-transform: none;
}

.worldbook-source-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.worldbook-source-stats span {
  display: grid;
  gap: 3px;
  min-height: 58px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 10px;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
  font-size: 11px;
}

.worldbook-source-stats strong {
  color: var(--system-text);
  font-size: 20px;
  line-height: 1;
}

.worldbook-source-stats .is-warning strong {
  color: var(--system-warning);
}

.worldbook-source-empty {
  display: grid;
  place-items: center;
  gap: 7px;
  min-height: 132px;
  border: 1px dashed var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 18px;
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
  text-align: center;
}

.worldbook-source-empty span {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 999px;
  color: var(--system-accent);
  background: var(--system-info-soft);
}

.worldbook-source-empty strong {
  color: var(--system-text);
  font-size: 14px;
}

.worldbook-source-empty p {
  margin: 0;
  max-width: 42ch;
  font-size: 12px;
  line-height: 1.55;
}

.worldbook-source-list {
  display: grid;
  gap: 10px;
}

.worldbook-source-card {
  display: grid;
  gap: 10px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 12px;
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-control);
}

.worldbook-source-card.is-disabled {
  opacity: 0.72;
}

.worldbook-source-card.is-warning {
  border-color: color-mix(in srgb, var(--system-warning) 42%, var(--system-control-border));
}

.worldbook-source-card.is-missing {
  border-color: color-mix(in srgb, var(--system-danger) 42%, var(--system-control-border));
}

.worldbook-source-card__main {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.worldbook-source-card__icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 12px;
  color: var(--system-accent);
  background: var(--system-info-soft);
}

.worldbook-source-card__main p,
.worldbook-source-card__main small {
  display: block;
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worldbook-source-card__main p {
  color: var(--system-text);
  font-size: 14px;
  font-weight: 850;
}

.worldbook-source-card__main small {
  margin-top: 3px;
  color: var(--system-text-muted);
  font-size: 11px;
}

.worldbook-source-card__meta,
.worldbook-source-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.worldbook-source-card__meta span {
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
}

.worldbook-source-card__meta .is-success {
  color: var(--system-success);
  background: var(--system-success-soft);
}

.worldbook-source-card__meta .is-warning {
  color: var(--system-warning);
  background: var(--system-warning-soft);
}

.worldbook-source-card__meta .is-danger {
  color: var(--system-danger);
  background: var(--system-danger-soft);
}

.worldbook-source-card__meta .is-muted {
  color: var(--system-text-muted);
  background: var(--system-surface-muted);
}

.worldbook-system-fallback {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  padding: 12px;
  background: var(--system-surface-muted);
}

.worldbook-system-fallback div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.worldbook-system-fallback strong {
  color: var(--system-text);
  font-size: 14px;
}

.worldbook-kernel-panel,
.worldbook-template-panel {
  display: grid;
  gap: 12px;
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  padding: 14px;
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.worldbook-kernel-hero,
.worldbook-template-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 12px;
  background:
    radial-gradient(circle at 90% 0%, var(--system-info-soft), transparent 32%),
    var(--system-control-bg);
}

.worldbook-kernel-hero p,
.worldbook-kernel-hero h2,
.worldbook-kernel-hero span,
.worldbook-template-hero p,
.worldbook-template-hero h2 {
  margin: 0;
}

.worldbook-kernel-hero p,
.worldbook-template-hero > div:first-child > p {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.worldbook-kernel-hero h2,
.worldbook-template-hero h2 {
  margin-top: 3px;
  color: var(--system-text);
  font-size: 20px;
  line-height: 1.18;
  font-weight: 850;
}

.worldbook-kernel-hero > div > span,
.worldbook-template-hero .text-sm {
  display: block;
  margin-top: 7px;
  max-width: 48ch;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.worldbook-kernel-hero > span {
  display: grid;
  gap: 3px;
  min-width: 82px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 10px;
  color: var(--system-text-muted);
  background: var(--system-panel-bg);
  font-size: 11px;
  text-align: center;
}

.worldbook-kernel-hero strong,
.worldbook-template-stats strong {
  color: var(--system-text);
  font-size: 20px;
  line-height: 1;
}

.worldbook-kernel-editor {
  width: 100%;
  min-height: 210px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 12px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font-size: 13px;
  line-height: 1.55;
  outline: none;
  resize: vertical;
}

.worldbook-kernel-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.worldbook-kernel-actions p {
  margin: 0;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.worldbook-primary-action.is-saved {
  background: var(--system-success);
}

.worldbook-template-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(74px, 1fr));
  gap: 8px;
  min-width: 168px;
}

.worldbook-template-stats span {
  display: grid;
  gap: 3px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 10px;
  color: var(--system-text-muted);
  background: var(--system-panel-bg);
  font-size: 11px;
}

.worldbook-template-section {
  display: grid;
  gap: 9px;
}

.worldbook-template-section > p {
  margin: 0;
  color: var(--system-text);
}

.worldbook-template-panel .worldbook-template-row {
  border-color: var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
}

.worldbook-template-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.worldbook-source-picker {
  display: grid;
  gap: 12px;
  position: fixed;
  left: max(14px, env(safe-area-inset-left));
  right: max(14px, env(safe-area-inset-right));
  bottom: 0;
  z-index: 42;
  max-height: min(76vh, 680px);
  overflow: auto;
  padding: 16px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-lg) var(--system-radius-lg) 0 0;
  background:
    linear-gradient(180deg, var(--system-panel-bg), var(--system-surface-muted)),
    var(--system-panel-bg);
  box-shadow: 0 -22px 60px rgba(15, 23, 42, 0.22);
}

.worldbook-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 41;
  background: rgba(15, 23, 42, 0.34);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.worldbook-sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.worldbook-sheet-head p,
.worldbook-source-review-head p.text-xs {
  margin: 0;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.worldbook-sheet-head h3 {
  margin: 2px 0 0;
  color: var(--system-text);
  font-size: 17px;
  line-height: 1.25;
  font-weight: 850;
}

.worldbook-picker-asset-summary {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 10px;
  background: var(--system-control-bg);
}

.worldbook-picker-asset-summary > span {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 11px;
  color: var(--system-accent);
  background: var(--system-info-soft);
}

.worldbook-picker-asset-summary strong,
.worldbook-picker-asset-summary small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worldbook-picker-asset-summary strong {
  color: var(--system-text);
  font-size: 13px;
}

.worldbook-picker-asset-summary small {
  margin-top: 2px;
  color: var(--system-text-muted);
  font-size: 11px;
}

.worldbook-picker-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 10px;
}

.worldbook-picker-grid label,
.worldbook-picker-mode label {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: var(--system-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.worldbook-picker-grid select {
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--system-control-border);
  border-radius: 10px;
}

.worldbook-picker-mode {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.worldbook-picker-mode label {
  grid-template-columns: auto 1fr;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid var(--system-control-border);
  border-radius: 10px;
  background: var(--system-control-bg);
}

.worldbook-picker-mode .is-disabled {
  opacity: 0.55;
}

.worldbook-section-picker {
  display: grid;
  gap: 8px;
}

.worldbook-section-toolbar,
.worldbook-picker-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.worldbook-section-toolbar {
  color: var(--system-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.worldbook-section-choice {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 9px;
  align-items: flex-start;
  padding: 9px;
  border: 1px solid var(--system-control-border);
  border-radius: 10px;
  background: var(--system-control-bg);
}

.worldbook-section-choice span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.worldbook-section-choice strong {
  color: var(--system-text);
  font-size: 13px;
}

.worldbook-section-choice small {
  color: var(--system-text-soft);
  font-size: 11px;
}

.worldbook-source-review {
  display: grid;
  gap: 12px;
  position: fixed;
  left: max(14px, env(safe-area-inset-left));
  right: max(14px, env(safe-area-inset-right));
  bottom: 0;
  z-index: 42;
  max-height: min(78vh, 720px);
  overflow: auto;
  padding: 16px;
  border: 1px solid rgba(245, 158, 11, 0.34);
  border-radius: var(--system-radius-lg) var(--system-radius-lg) 0 0;
  background:
    linear-gradient(180deg, rgba(255, 251, 235, 0.96), var(--system-panel-bg)),
    var(--system-panel-bg);
  box-shadow: 0 -22px 60px rgba(15, 23, 42, 0.22);
}

.worldbook-source-review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.worldbook-source-review-head h3 {
  margin: 2px 0;
  font-size: 15px;
  font-weight: 800;
  color: var(--system-text);
}

.worldbook-source-review-head p:not(.text-xs) {
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.worldbook-source-review-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: #92400e;
  font-size: 12px;
  font-weight: 700;
}

.worldbook-source-diff-list {
  display: grid;
  gap: 6px;
  max-height: 320px;
  overflow: auto;
}

.worldbook-source-diff-row,
.worldbook-source-diff-empty {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
  margin: 0;
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  color: var(--system-text);
  background: rgba(255, 255, 255, 0.72);
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
}

.worldbook-source-diff-row.is-added {
  border-color: rgba(16, 185, 129, 0.22);
  background: rgba(236, 253, 245, 0.86);
}

.worldbook-source-diff-row.is-removed {
  border-color: rgba(248, 113, 113, 0.24);
  background: rgba(254, 242, 242, 0.86);
  color: #7f1d1d;
}

.worldbook-source-diff-row.is-unchanged {
  color: var(--system-text-muted);
}

.worldbook-source-diff-mark {
  color: inherit;
  font-weight: 900;
}

.worldbook-source-diff-empty {
  display: block;
  color: var(--system-text-muted);
}

.worldbook-primary-action,
.worldbook-inline-action {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.worldbook-primary-action {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--system-text-inverse);
  background: var(--system-text);
  font-size: 12px;
  font-weight: 700;
}

.worldbook-inline-action {
  min-height: 28px;
  padding: 0 8px;
  border-radius: 7px;
  color: var(--system-accent);
  background: var(--system-control-bg);
  font-size: 11px;
  font-weight: 700;
}

.worldbook-secondary-action {
  flex-shrink: 0;
  border: 1px solid rgba(99, 102, 241, 0.28);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #4338ca;
  background: rgba(238, 242, 255, 0.9);
}

.worldbook-danger-action {
  border-color: color-mix(in srgb, var(--system-danger) 32%, var(--system-control-border));
  color: var(--system-danger);
  background: var(--system-danger-soft);
}

.worldbook-scroll p {
  letter-spacing: 0;
}

.worldbook-scroll .text-gray-500 {
  color: var(--system-text-muted);
}

.worldbook-scroll .text-gray-400 {
  color: var(--system-text-soft);
}

.worldbook-scroll textarea,
.worldbook-scroll input,
.worldbook-scroll select {
  border-color: var(--system-border);
  background: var(--system-control-bg);
  color: var(--system-text);
  box-shadow: inset 0 1px 0 var(--system-edge-highlight);
  transition:
    border-color var(--system-motion-fast),
    box-shadow var(--system-motion-fast),
    background var(--system-motion-fast);
}

.worldbook-scroll textarea:focus,
.worldbook-scroll input:focus,
.worldbook-scroll select:focus {
  border-color: var(--system-accent);
  background: var(--system-control-bg-strong);
  box-shadow: 0 0 0 4px var(--system-focus-ring);
}

.worldbook-scroll textarea {
  line-height: 1.65;
}

.worldbook-scroll button {
  -webkit-tap-highlight-color: transparent;
}

.worldbook-scroll > .rounded-2xl > button,
.worldbook-scroll [data-testid='knowledge-draft-submit'] {
  min-height: 42px;
  border-radius: 14px;
  background: var(--system-text);
  color: var(--system-text-inverse);
  box-shadow: var(--system-shadow-control);
}

.worldbook-scroll > .rounded-2xl > button.bg-green-500 {
  background: var(--system-success);
}

.worldbook-scroll .rounded-xl {
  border-color: var(--system-border);
}

.worldbook-scroll .bg-gray-50 {
  background: var(--system-surface-muted);
}

.worldbook-scroll .bg-white {
  background: var(--system-control-bg);
}

.worldbook-scroll [data-testid='knowledge-deeplink-banner'],
.worldbook-scroll .bg-blue-50,
.worldbook-scroll .bg-blue-50\/30 {
  border-color: var(--system-control-border);
  background: var(--system-info-soft);
}

.worldbook-scroll .bg-emerald-50 {
  background: var(--system-success-soft);
}

.worldbook-scroll .bg-amber-50 {
  background: var(--system-warning-soft);
}

.worldbook-scroll [data-testid='knowledge-point-card'] {
  border-radius: var(--system-radius-md);
  box-shadow: var(--system-shadow-control);
  transition:
    transform var(--system-motion-fast),
    box-shadow var(--system-motion-fast),
    border-color var(--system-motion-fast);
}

.worldbook-knowledge-panel {
  display: grid;
  gap: 12px;
}

.worldbook-knowledge-hero {
  display: grid;
  gap: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-lg);
  padding: 14px;
  background:
    radial-gradient(circle at 90% 4%, var(--system-success-soft), transparent 34%),
    var(--system-panel-bg);
}

.worldbook-knowledge-hero p,
.worldbook-knowledge-hero h2 {
  margin: 0;
}

.worldbook-knowledge-hero p {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.worldbook-knowledge-hero h2 {
  margin-top: 3px;
  color: var(--system-text);
  font-size: 22px;
  line-height: 1.15;
  font-weight: 850;
}

.worldbook-knowledge-hero > div:first-child > span {
  display: block;
  margin-top: 6px;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.55;
}

.worldbook-knowledge-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.worldbook-knowledge-stats span {
  display: grid;
  gap: 3px;
  min-height: 62px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 10px;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
  font-size: 11px;
}

.worldbook-knowledge-stats strong {
  color: var(--system-text);
  font-size: 20px;
  line-height: 1;
}

.worldbook-knowledge-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 12px;
  background: var(--system-panel-bg);
}

.worldbook-knowledge-toolbar p,
.worldbook-knowledge-toolbar span {
  margin: 0;
}

.worldbook-knowledge-toolbar p {
  color: var(--system-text);
  font-size: 13px;
  font-weight: 800;
}

.worldbook-knowledge-toolbar span {
  display: block;
  margin-top: 3px;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.worldbook-knowledge-toolbar .worldbook-primary-action {
  min-width: max-content;
}

.worldbook-knowledge-compose,
.worldbook-knowledge-filter {
  border-color: var(--system-control-border);
  background: var(--system-surface-muted);
}

.worldbook-knowledge-compose {
  display: grid;
  gap: 10px;
  position: fixed;
  left: max(14px, env(safe-area-inset-left));
  right: max(14px, env(safe-area-inset-right));
  bottom: 0;
  z-index: 42;
  max-height: min(76vh, 680px);
  overflow: auto;
  padding: 16px;
  border-radius: var(--system-radius-lg) var(--system-radius-lg) 0 0;
  background:
    linear-gradient(180deg, var(--system-panel-bg), var(--system-surface-muted)),
    var(--system-panel-bg);
  box-shadow: 0 -22px 60px rgba(15, 23, 42, 0.22);
}

.worldbook-knowledge-compose input,
.worldbook-knowledge-compose textarea {
  border-color: var(--system-control-border);
  background: var(--system-control-bg);
  color: var(--system-text);
}

.worldbook-knowledge-filter {
  display: grid;
  gap: 10px;
}

.worldbook-knowledge-empty {
  min-height: 110px;
  display: grid;
  place-items: center;
  border-radius: var(--system-radius-md);
  background: var(--system-surface-muted);
}

.worldbook-knowledge-list {
  display: grid;
  gap: 10px;
}

.worldbook-knowledge-card {
  display: grid;
  gap: 9px;
  border-color: var(--system-control-border);
  background: var(--system-panel-bg);
}

.worldbook-knowledge-card__head {
  align-items: flex-start;
}

.worldbook-knowledge-card__actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.worldbook-knowledge-card__actions button {
  min-height: 28px;
  border-radius: 999px;
}

.worldbook-knowledge-card__content {
  line-height: 1.55;
}

.worldbook-knowledge-card__tags {
  line-height: 1.5;
}

.worldbook-knowledge-usage {
  border-color: var(--system-control-border);
  background: var(--system-surface-muted);
}

.worldbook-shell :deep(.text-blue-500),
.worldbook-shell :deep(.text-blue-600),
.worldbook-shell :deep(.text-blue-700),
.worldbook-shell :deep(.text-blue-800) {
  color: var(--system-info);
}

.worldbook-shell :deep(.text-red-500),
.worldbook-shell :deep(.text-red-600),
.worldbook-shell :deep(.text-red-700) {
  color: var(--system-danger);
}

.worldbook-shell :deep(.text-emerald-700) {
  color: var(--system-success);
}

.worldbook-shell :deep(.border-gray-100),
.worldbook-shell :deep(.border-gray-200),
.worldbook-shell :deep(.border-blue-200),
.worldbook-shell :deep(.border-blue-300),
.worldbook-shell :deep(.border-emerald-300),
.worldbook-shell :deep(.border-emerald-200) {
  border-color: var(--system-control-border);
}

.worldbook-scroll [data-testid='knowledge-point-card']:active {
  transform: scale(0.992);
}

@media (max-width: 640px) {
  .worldbook-control-deck {
    padding: 12px;
  }

  .worldbook-control-deck__head {
    display: grid;
  }

  .worldbook-control-deck__head > span {
    justify-self: start;
  }

  .worldbook-panel-tabs {
    display: flex;
    gap: 8px;
    margin: 0 -2px;
    overflow-x: auto;
    padding: 2px 2px 6px;
    scroll-snap-type: x proximity;
  }

  .worldbook-panel-tab {
    flex: 0 0 118px;
    min-height: 72px;
    scroll-snap-align: start;
  }

  .worldbook-panel-tab span {
    white-space: nowrap;
  }

  .worldbook-source-head {
    display: grid;
  }

  .worldbook-source-head .worldbook-secondary-action {
    width: 100%;
  }

  .worldbook-source-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .worldbook-source-card__actions .worldbook-secondary-action {
    flex: 1 1 calc(50% - 8px);
  }

  .worldbook-kernel-hero,
  .worldbook-template-hero,
  .worldbook-kernel-actions {
    display: grid;
  }

  .worldbook-kernel-hero > span,
  .worldbook-kernel-actions .worldbook-primary-action,
  .worldbook-template-stats {
    width: 100%;
  }

  .worldbook-knowledge-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .worldbook-knowledge-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .worldbook-knowledge-toolbar .worldbook-primary-action {
    width: 100%;
  }

  .worldbook-knowledge-card__head {
    align-items: stretch;
    flex-direction: column;
  }

  .worldbook-knowledge-card__actions {
    justify-content: flex-start;
  }

  .worldbook-template-row {
    align-items: stretch;
    flex-direction: column;
  }

  .worldbook-source-review-head {
    flex-direction: column;
  }

  .worldbook-source-review-head .worldbook-inline-action {
    width: 100%;
  }

  .worldbook-picker-grid {
    grid-template-columns: 1fr;
  }

  .worldbook-system-fallback {
    grid-template-columns: 1fr;
  }
}
</style>
