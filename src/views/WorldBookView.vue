<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useSystemStore } from '../stores/system'
import { useChatStore } from '../stores/chat'
import { useBookStore } from '../stores/book'
import { useWalletStore } from '../stores/wallet'
import { MAX_CURRENCY_EXPONENT, normalizeCurrencyDefinition } from '../lib/currency-system'
import { useI18n } from '../composables/useI18n'
import { useDialog } from '../composables/useDialog'
import { formatApiErrorForUi } from '../lib/ai'
import AssetStatusBadge from '../components/assets/AssetStatusBadge.vue'
import { pushReturnTarget, resolveReturnLabel } from '../lib/navigation-return'
import { BOOK_ROUTE } from '../lib/planned-module-registry'
import { LEGACY_SINGLE_WORLD_ID, resolveActiveWorldOverview } from '../lib/world-interface'
import { buildWorldAppBindingRows } from '../lib/world-pack-app-bindings'
import { extractWorldAppTemplateProposals } from '../lib/world-app-template-registry'
import { analyzeWorldProfileWithAI } from '../lib/world-profile-analysis'
import {
  buildDeterministicWorldProfileTemplateProposal,
  extractWorldProfileTemplateProposalWithAI,
} from '../lib/world-profile-template-proposals'
import { buildWorldServiceTemplateGenerationRowsForPacks } from '../lib/world-pack-service-accounts'
import { isBuiltInBookTextAssetId } from '../lib/built-in-book-assets'
import { estimateTextTokens, estimateTokenParts } from '../lib/ai-token-estimate'
import { useWorldBookKnowledgeModel } from '../composables/useWorldBookKnowledgeModel'
import { useWorldBookProfileTemplateModel } from '../composables/useWorldBookProfileTemplateModel'
import { createBlankWorldProfileTemplateDraft } from '../composables/useWorldBookProfileTemplateEditor'
import { useWorldBookSourceModel } from '../composables/useWorldBookSourceModel'
import { useWorldSettingWorkspaceModel } from '../composables/useWorldSettingWorkspaceModel'
import CurrentWorldPackPanel from '../components/worldbook/CurrentWorldPackPanel.vue'
import WorldBookOverview from '../components/worldbook/WorldBookOverview.vue'
import WorldSettingWorkspace from '../components/worldbook/WorldSettingWorkspace.vue'
import WorldBookProfileTemplateEditor from '../components/worldbook/WorldBookProfileTemplateEditor.vue'

const route = useRoute()
const router = useRouter()
const systemStore = useSystemStore()
const chatStore = useChatStore()
const bookStore = useBookStore()
const walletStore = useWalletStore()
const { t } = useI18n()
const { confirmDialog } = useDialog()
const { user, settings } = storeToRefs(systemStore)
const { roleProfiles, contacts } = storeToRefs(chatStore)
const { currencyOptions } = storeToRefs(walletStore)

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
const worldOverview = computed(() =>
  resolveActiveWorldOverview({
    systemStore,
    bookStore,
  }),
)
const currentWorldId = computed(
  () => worldOverview.value.identity?.worldId || LEGACY_SINGLE_WORLD_ID,
)
const worldProfileTemplates = computed(() =>
  systemStore.listProfileTemplates().filter((template) => template.scope === 'world'),
)
const enabledWorldProfileTemplates = computed(() =>
  Array.isArray(worldOverview.value.profiles?.enabledTemplates)
    ? worldOverview.value.profiles.enabledTemplates
    : [],
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
const editingWorldProfileTemplate = ref(null)
const isCreatingWorldProfileTemplate = ref(false)
const worldProfileTemplateProposalReview = ref(null)
const worldProfileTemplateProposalLoading = ref(false)
const worldProfileTemplateProposalNotice = ref('')
const worldProfileTemplateProposalNoticeTone = ref('info')

const sourceDirectory = reactive({
  open: false,
  categoryId: '',
  menu: '',
  assetId: '',
  draftTitle: '',
  draftContent: '',
  notice: '',
})

const openSourceDirectory = (categoryId = '') => {
  const category = contextTextCategories.value.find((item) => item.id === categoryId)
  if (!category) return
  sourceDirectory.open = true
  sourceDirectory.categoryId = category.id
  sourceDirectory.menu = ''
  sourceDirectory.assetId = ''
  sourceDirectory.draftTitle = ''
  sourceDirectory.draftContent = ''
  sourceDirectory.notice = ''
}

const closeSourceDirectory = () => {
  sourceDirectory.open = false
  sourceDirectory.menu = ''
  sourceDirectory.assetId = ''
  sourceDirectory.notice = ''
}

const openDirectoryAssetMenu = (asset) => {
  if (!asset) return
  sourceDirectory.assetId = asset.id
  sourceDirectory.menu = 'asset'
  sourceDirectory.notice = ''
}

const openDirectoryImportMenu = () => {
  sourceDirectory.menu = 'import'
  sourceDirectory.assetId = ''
  sourceDirectory.draftTitle = selectedTextCategory.value
    ? `${selectedTextCategory.value.label}文稿`
    : ''
  sourceDirectory.draftContent = ''
  sourceDirectory.notice = ''
}

const closeDirectoryMenu = () => {
  sourceDirectory.menu = ''
  sourceDirectory.assetId = ''
  sourceDirectory.notice = ''
}
const fallbackWorldviewPreview = computed(() => {
  const text = String(globalWorldview.value || '').trim().replace(/\s+/g, ' ')
  if (!text) {
    return t(
      '还没有写入基础世界观。',
      'No base worldview has been written yet.',
    )
  }
  return text.length > 140 ? `${text.slice(0, 140)}...` : text
})
const sourcePicker = reactive({
  open: false,
  assetId: '',
  role: 'main_worldview',
  mode: 'whole',
  sectionIds: [],
})
const sourceReview = reactive({
  linkId: '',
})

const {
  activeBookSourceCount,
  activeBookSources,
  activeContextTextCharCount,
  availableBookSourceAssets,
  bookSourceIssueCount,
  buildSourceSnapshotForLink,
  contextTextCategories,
  directoryLinkForAsset,
  disabledBookSourceCount,
  getBookAssetCategoryLabel,
  inferBookSourceRole,
  isSourcePickerAssetLinked,
  linkedBookSources,
  reviewingBookSource,
  selectedDirectoryAsset,
  selectedTextCategory,
  showWorldBookOnboarding,
  sourceMaintenanceLinks,
  sourcePickerAsset,
  sourcePickerAssets,
  sourcePickerGroups,
  sourcePickerSections,
  sourcePickerSelectedSections,
  sourceReviewDiff,
  sourceReviewSummary,
  sourceRoleOptions,
} = useWorldBookSourceModel({
  systemStore,
  bookStore,
  globalWorldview,
  worldOverview,
  sourceDirectory,
  sourcePicker,
  sourceReview,
  t,
})
const worldBookTokenEstimate = computed(() => {
  const promptText = String(worldOverview.value.narrative?.promptText || '')
  const sourceParts = contextTextCategories.value
    .map((category) => ({
      id: category.id,
      label: category.label,
      text: category.enabledLinks
        .filter((link) => link.currentSourceText)
        .map((link) => `${link.title}: ${link.currentSourceText}`)
        .join('\n\n'),
    }))
    .filter((part) => part.text)

  if (sourceParts.length === 0 && promptText) {
    sourceParts.push({
      id: 'worldview',
      label: t('世界观', 'Worldview'),
      text: promptText,
    })
  }

  return {
    totalTokens: estimateTextTokens(promptText),
    parts: estimateTokenParts(sourceParts).parts,
  }
})
const knowledgeSearchKeyword = ref('')
const knowledgeTagFilter = ref('all')
const knowledgeUsageFilter = ref('all')
const knowledgeUsageSort = ref('recent')
const knowledgeDeepLinkPointIds = ref([])
const knowledgeDeepLinkSource = ref('')
const knowledgeDeepLinkKeyword = ref('')
const knowledgeDeepLinkTag = ref('all')
const knowledgeDeepLinkUsage = ref('all')
const {
  boundKnowledgePointCount,
  chatReadyKnowledgePointCount,
  describeKnowledgePointUsage,
  enabledKnowledgePointCount,
  formatKnowledgePointProfileNames,
  getKnowledgePointUsage,
  getKnowledgePointUsageBadge,
  isDeepLinkedKnowledgePoint,
  knowledgeDeepLinkActive,
  knowledgeDeepLinkPoints,
  knowledgeDeepLinkSummary,
  knowledgeSearchPlaceholder,
  knowledgeTagFilterOptions,
  knowledgeUsageFilterOptions,
  knowledgeUsageSortOptions,
  syncWorldBookDeepLink,
  visibleKnowledgePoints,
} = useWorldBookKnowledgeModel({
  systemStore,
  knowledgePoints,
  roleProfiles,
  contacts,
  knowledgeSearchKeyword,
  knowledgeTagFilter,
  knowledgeUsageFilter,
  knowledgeUsageSort,
  knowledgeDeepLinkPointIds,
  knowledgeDeepLinkSource,
  knowledgeDeepLinkKeyword,
  knowledgeDeepLinkTag,
  knowledgeDeepLinkUsage,
  t,
})
const {
  profileTemplateHandoff,
  profileTemplatePresetRows,
  profileTemplateStats,
  universalTemplateSection,
  worldProfileTemplateRows,
  worldTemplateSection,
} = useWorldBookProfileTemplateModel({
  profileTemplatePresets,
  worldProfileTemplates,
  enabledWorldProfileTemplates,
  t,
})
const saved = ref(false)
const uiNotice = ref('')
const knowledgeDraft = reactive({
  title: '',
  content: '',
  tags: '',
})
const worldCurrencyDraft = reactive({
  code: '',
  labelZh: '',
  labelEn: '',
  symbol: '',
  exponent: '2',
  rateToCny: '',
})
const worldCurrencyNotice = ref('')
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
        : returnLabelKey.value === 'Map settings'
          ? t('地图设置', 'Map settings')
        : returnLabelKey.value === 'Calendar'
          ? t('日历', 'Calendar')
          : t('设置', 'Settings'),
)

const goSettings = () => {
  pushReturnTarget(router, route, '/settings')
}

const openContactsForProfileTemplates = () => {
  router.push({
    path: '/contacts',
    query: {
      from: 'worldbook',
      focus: 'profile_templates',
    },
  })
}

const openBookWorkspace = () => {
  router.push({
    path: BOOK_ROUTE,
    query: {
      source: 'worldbook',
    },
  })
}

const openBookLibrary = () => {
  openBookSourcePicker()
}

const enabledExpansionPackIds = computed(() =>
  Array.isArray(user.value.enabledWorldPackIds) ? user.value.enabledWorldPackIds : [],
)

const { worldSettingWorkspace } = useWorldSettingWorkspaceModel({
  worldOverview,
  activeBookSourceCount,
  sourcePickerAssets,
  bookSourceIssueCount,
  worldProfileTemplates,
  enabledExpansionPackIds,
  fallbackWorldview: globalWorldview,
  t,
})

const setWorldbookPanel = (panelId = 'sources') => {
  if (!worldSettingWorkspace.value.layers.some((panel) => panel.id === panelId)) return
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

const clearGlobalWorldview = async () => {
  if (!String(globalWorldview.value || '').trim()) {
    uiNotice.value = t('基础世界观已经是空的。', 'Base worldview is already empty.')
    return
  }
  const ok = await confirmDialog({
    title: t('清空基础世界观', 'Clear base worldview'),
    message: t(
      '这只会清空 Settings 中的基础世界观，不会删除 Book 文本、百科条目或世界包。',
      'This only clears the base worldview in Settings. Book text, encyclopedia entries, and world packs stay untouched.',
    ),
    confirmText: t('清空', 'Clear'),
    cancelText: t('取消', 'Cancel'),
    tone: 'danger',
  })
  if (!ok) return
  systemStore.setGlobalWorldview('')
  systemStore.saveNow()
  pulseSaved(t('基础世界观已清空。', 'Base worldview cleared.'))
}

const selectWorldPack = (packId = '') => {
  selectedWorldPackId.value = packId || worldOverview.value.activePack?.id || 'default_world'
}

const activateSelectedWorldPack = () => {
  const result = systemStore.activateWorldPack(selectedWorldPackId.value)
  if (!result?.ok) {
    uiNotice.value = t('能力包启用失败，请检查当前的支持状态后重试。', 'Capability Pack activation failed. Check its support state and try again.')
    return
  }
  systemStore.saveNow()
  pulseSaved(t('能力包已启用。', 'Capability Pack enabled.'))
}

const resetWorldPackToDefault = () => {
  const result = systemStore.activateWorldPack('default_world')
  if (!result?.ok) {
    uiNotice.value = t('停用额外能力包失败，请稍后再试。', 'Extra capability Packs could not be disabled. Try again later.')
    return
  }
  selectedWorldPackId.value = 'default_world'
  worldAppTemplateProposalReview.value = null
  worldAppTemplateProposalNotice.value = ''
  systemStore.saveNow()
  pulseSaved(t('已停用额外能力包。', 'Extra capability Packs disabled.'))
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
      ? t('这个能力包需要专门 App，当前版本不能启用。', 'This capability Pack needs a dedicated app and cannot be enabled yet.')
      : t('能力包启用失败，请检查当前的支持状态后重试。', 'Capability Pack enablement failed. Check its support state and try again.')
    return
  }
  systemStore.saveNow()
  pulseSaved(t('能力包已启用。', 'Capability Pack enabled.'))
}

const disableWorldPackExpansion = (packId = '') => {
  const result = systemStore.disableWorldPack(packId)
  if (!result?.ok) return
  systemStore.saveNow()
  pulseSaved(t('能力包已停用。', 'Capability Pack disabled.'))
}

const resetWorldCurrencyDraft = () => {
  worldCurrencyDraft.code = ''
  worldCurrencyDraft.labelZh = ''
  worldCurrencyDraft.labelEn = ''
  worldCurrencyDraft.symbol = ''
  worldCurrencyDraft.exponent = '2'
  worldCurrencyDraft.rateToCny = ''
}

const updateWorldCurrencyDraft = ({ key, value } = {}) => {
  if (typeof key !== 'string' || !Object.prototype.hasOwnProperty.call(worldCurrencyDraft, key)) return
  worldCurrencyDraft[key] = value
}

const saveWorldCurrencyDraft = () => {
  const pack = worldOverview.value.activePack || systemStore.getActiveWorldPack()
  const exponent = Number(worldCurrencyDraft.exponent)
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > MAX_CURRENCY_EXPONENT) {
    worldCurrencyNotice.value = t(
      `请输入 0-${MAX_CURRENCY_EXPONENT} 之间的整数小数位。`,
      `Enter a whole-number decimal precision from 0 to ${MAX_CURRENCY_EXPONENT}.`,
    )
    return
  }
  const normalized = normalizeCurrencyDefinition(
    {
      code: worldCurrencyDraft.code,
      labelZh: worldCurrencyDraft.labelZh,
      labelEn: worldCurrencyDraft.labelEn,
      symbol: worldCurrencyDraft.symbol,
      exponent,
      source: 'world_pack',
      worldPackId: pack?.id || 'default_world',
    },
    {
      source: 'world_pack',
      worldPackId: pack?.id || 'default_world',
    },
  )
  if (!normalized) {
    worldCurrencyNotice.value = t('请输入 2-8 位英文货币代码。', 'Enter a 2-8 letter currency code.')
    return
  }

  const rateToCny = Number(worldCurrencyDraft.rateToCny)
  const normalizedForPack = {
    ...normalized,
    rateToCny: Number.isFinite(rateToCny) && rateToCny > 0 ? rateToCny : 0,
  }
  const currencies = Array.isArray(pack?.economy?.currencies) ? [...pack.economy.currencies] : []
  const index = currencies.findIndex((currency) => currency.code === normalizedForPack.code)
  if (index >= 0) {
    currencies.splice(index, 1, normalizedForPack)
  } else {
    currencies.push(normalizedForPack)
  }

  const result = systemStore.updateWorldPackEconomy(pack?.id || 'default_world', { currencies })
  if (!result?.ok) {
    worldCurrencyNotice.value = t('世界包货币保存失败。', 'World currency save failed.')
    return
  }

  const registered = walletStore.registerWorldCurrency(normalizedForPack, result.pack)
  if (Number.isFinite(rateToCny) && rateToCny > 0) {
    walletStore.setCurrencyCnyRate(normalized.code, rateToCny)
  }
  systemStore.saveNow()
  walletStore.saveNow()
  resetWorldCurrencyDraft()
  worldCurrencyNotice.value = t(
    `${registered?.code || normalized.code} 已注入 Wallet，可在钱包里设为主币种并调整汇率。`,
    `${registered?.code || normalized.code} is now available in Wallet. You can set it as primary and tune its rate there.`,
  )
  pulseSaved(t('世界包货币已保存。', 'World currency saved.'))
}

const injectExistingWorldCurrency = (currency = {}) => {
  const pack = worldOverview.value.activePack || systemStore.getActiveWorldPack()
  const normalized = normalizeCurrencyDefinition(currency, {
    source: 'world_pack',
    worldPackId: pack?.id || 'default_world',
  })
  if (!normalized) {
    worldCurrencyNotice.value = t('货币代码无效。', 'Invalid currency code.')
    return
  }
  const registered = walletStore.registerWorldCurrency(normalized, pack)
  if (Number.isFinite(Number(currency.rateToCny)) && Number(currency.rateToCny) > 0) {
    walletStore.setCurrencyCnyRate(normalized.code, Number(currency.rateToCny))
  }
  walletStore.saveNow()
  worldCurrencyNotice.value = t(
    `${registered?.code || normalized.code} 已注入 Wallet。`,
    `${registered?.code || normalized.code} is now available in Wallet.`,
  )
  pulseSaved(t('世界包货币已注入 Wallet。', 'World currency injected into Wallet.'))
}

const buildWorldAppTemplateContextText = () => {
  const activePack = worldOverview.value.activePack || systemStore.getActiveWorldPack()
  const worldview = String(worldOverview.value.narrative?.promptText || '').trim()
  const knowledgeLines = (worldOverview.value.encyclopedia?.selectedEntries || [])
    .map((point) => {
      const tags = Array.isArray(point.tags) && point.tags.length ? ` [${point.tags.join(', ')}]` : ''
      return `- ${point.title || point.id}${tags}: ${String(point.content || '').trim()}`
    })
  const bindingLines = activeWorldPackAppBindingRows.value.map(
    (row) => `- ${row.id}: ${row.archetype} -> ${row.targetLabel} (${row.route || 'no route'})`,
  )

  return [
    `Active World Pack: ${activePack?.title || activePack?.name || activePack?.id || 'default_world'}`,
    bindingLines.length ? ['Existing app bindings:', ...bindingLines].join('\n') : 'Existing app bindings: none',
    worldview ? `Active setting text:\n${worldview}` : 'Active setting text: empty',
    knowledgeLines.length ? ['Enabled encyclopedia:', ...knowledgeLines].join('\n') : 'Enabled encyclopedia: none',
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
  pulseSaved(t('世界 App 入口已加入当前能力包。', 'World app entry added to the current capability Pack.'))
}

const clearWorldAppTemplateProposalReview = () => {
  worldAppTemplateProposalDraft.value = ''
  worldAppTemplateProposalReview.value = null
  worldAppTemplateProposalNotice.value = ''
  worldAppTemplateProposalNoticeTone.value = 'info'
}

const getPrimaryRoleForCategory = (category) => category?.roles?.[0] || 'main_worldview'

// 世界观暂时唯一启用：两套世界观同时生效可能互踩，启用第二份前必须确认原子切换
const activeWorldviewLinks = computed(() =>
  systemStore
    .listWorldBookSourceLinks()
    .filter((link) => (link.role || link.usage) === 'main_worldview' && link.enabled !== false),
)

const confirmUniqueWorldviewSwitch = async (asset) => {
  const others = activeWorldviewLinks.value.filter((link) => link.assetId !== asset.id)
  if (others.length === 0) return true
  const currentTitles = others.map(
    (link) => bookStore.findAssetById(link.assetId)?.title || link.assetId,
  )
  const confirmed = await confirmDialog({
    title: t('切换世界观', 'Switch worldview'),
    message: t(
      '世界观暂时只支持唯一启用，两套世界观同时生效可能互相冲突。',
      'Only one worldview can be active for now; two at once may conflict.',
    ),
    details: [
      `${t('当前生效', 'Active now')}: ${currentTitles.join(t('、', ', '))}`,
      `${t('即将启用', 'About to enable')}: ${asset.title}`,
      t('想保留两者？可以先在 Book 中把两份设定融合成一份，再回来启用。', 'Want both? Merge the two texts in Book first, then enable the merged one.'),
    ],
    confirmText: t('停用旧版并启用这份', 'Disable current and enable this'),
    cancelText: t('取消', 'Cancel'),
    tone: 'warning',
  })
  if (!confirmed) return false
  others.forEach((link) => {
    systemStore.updateWorldBookSourceLink(link.id, { enabled: false })
    syncBookAssetSourceStatus(link.assetId)
  })
  return true
}

const enableDirectoryAsset = async (asset = selectedDirectoryAsset.value) => {
  if (!asset || !selectedTextCategory.value) return false
  if (selectedTextCategory.value.id === 'worldview') {
    const allowed = await confirmUniqueWorldviewSwitch(asset)
    if (!allowed) return false
  }
  const role = getPrimaryRoleForCategory(selectedTextCategory.value)
  const link = systemStore.addWorldBookSourceLink({
    assetId: asset.id,
    role,
    enabled: true,
    priority: 80 + linkedBookSources.value.length,
    sourceVersion: asset.version,
    sourceFingerprint: asset.contentFingerprint,
    ...buildSourceSnapshotForLink(asset),
  })
  if (link) {
    syncBookAssetSourceStatus(asset.id)
    systemStore.saveNow()
    bookStore.saveNow()
    sourceDirectory.notice = t('已启用这份文稿。', 'Manuscript enabled.')
    pulseSaved(t('文稿已加入当前世界背景。', 'Text added to current world context.'))
    return true
  }
  return false
}

const disableDirectoryAsset = (asset = selectedDirectoryAsset.value) => {
  if (!asset || !selectedTextCategory.value) return
  const link = directoryLinkForAsset(asset.id)
  if (!link) return
  systemStore.updateWorldBookSourceLink(link.id, { enabled: false })
  syncBookAssetSourceStatus(asset.id)
  systemStore.saveNow()
  bookStore.saveNow()
  sourceDirectory.notice = t('已停用这份文稿。', 'Manuscript disabled.')
}

// 世界观是唯一槽位，保留卡片弹窗确认；规则/百科可多选，列表内直接开关
const isMultiSelectDirectory = computed(() => selectedTextCategory.value?.id !== 'worldview')

const toggleDirectoryAsset = (asset) => {
  if (!asset || !isMultiSelectDirectory.value) return
  if (directoryLinkForAsset(asset.id)) {
    disableDirectoryAsset(asset)
    return
  }
  enableDirectoryAsset(asset)
}

const enableAllDirectoryAssets = () => {
  const category = selectedTextCategory.value
  if (!category || !isMultiSelectDirectory.value) return
  category.availableAssets.forEach((asset) => {
    if (!directoryLinkForAsset(asset.id)) enableDirectoryAsset(asset)
  })
  sourceDirectory.notice = t('已全部启用。', 'All manuscripts enabled.')
}

const disableAllDirectoryAssets = () => {
  const category = selectedTextCategory.value
  if (!category || !isMultiSelectDirectory.value) return
  category.availableAssets.forEach((asset) => {
    if (directoryLinkForAsset(asset.id)) disableDirectoryAsset(asset)
  })
  sourceDirectory.notice = t('已全部停用。', 'All manuscripts disabled.')
}

const createDirectoryImportedAsset = async ({ enable = false } = {}) => {
  const category = selectedTextCategory.value
  const title = String(sourceDirectory.draftTitle || '').trim()
  const content = String(sourceDirectory.draftContent || '').trim()
  if (!category || !title || !content) {
    sourceDirectory.notice = t('请先填写名称和正文。', 'Enter a name and text first.')
    return null
  }
  const asset = bookStore.createAsset({
    title,
    category: category.assetCategories[0] || 'worldview',
    assetType: category.assetCategories[0] || 'worldview',
    format: content.startsWith('#') ? 'markdown' : 'plain',
    content,
    status: 'draft',
    source: {
      kind: 'worldbook_directory_import',
      categoryId: category.id,
    },
  })
  if (!asset) return null
  const enabled = enable ? await enableDirectoryAsset(asset) : false
  sourceDirectory.assetId = asset.id
  sourceDirectory.menu = 'asset'
  sourceDirectory.notice = enable
    ? enabled
      ? t('已导入并启用。', 'Imported and enabled.')
      : t('已导入文稿，未启用。', 'Imported, not enabled.')
    : t('已导入文稿。', 'Manuscript imported.')
  return asset
}

const addFirstBookSource = () => {
  openBookSourcePicker()
}

const resetSourcePickerForAsset = (asset) => {
  sourcePicker.assetId = asset?.id || ''
  sourcePicker.role = inferBookSourceRole(asset)
  sourcePicker.mode = 'whole'
  sourcePicker.sectionIds = []
}

const selectSourcePickerAsset = (asset) => {
  if (!asset) return
  resetSourcePickerForAsset(asset)
}

const openBookSourcePicker = () => {
  const asset = availableBookSourceAssets.value[0] || sourcePickerAssets.value[0]
  if (!asset) {
    uiNotice.value = t(
      '文本库里还没有可用的世界书文本，请先在 Book 创建或导入文本。',
      'No usable worldbook text is available yet. Create or import text in Book first.',
    )
    return
  }
  resetSourcePickerForAsset(asset)
  sourcePicker.open = true
}

const copyFallbackWorldviewToBook = async () => {
  const content = String(globalWorldview.value || '').trim()
  if (!content) {
    uiNotice.value = t(
      '请先写入基础世界观，再复制到文本库。',
      'Write a base worldview before copying it to Book.',
    )
    return
  }

  const confirmed = await confirmDialog({
    title: t('复制到文本库', 'Copy to Book'),
    message: t(
      '这会创建一份可编辑的文本库副本，不会覆盖当前基础世界观，也不会自动加入当前背景。',
      'This creates an editable Book copy. It will not overwrite the base worldview or join the current context automatically.',
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
  if (isBuiltInBookTextAssetId(assetId)) return
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

const linkPickedBookSource = async () => {
  const asset = sourcePickerAsset.value
  if (!asset) return
  const selectedSectionIds =
    sourcePicker.mode === 'sections' ? sourcePickerSelectedSections.value.map((section) => section.id) : []
  if (sourcePicker.mode === 'sections' && sourcePickerSections.value.length > 0 && selectedSectionIds.length === 0) {
    uiNotice.value = t('请至少选择一个段落。', 'Select at least one section.')
    return
  }
  if (sourcePicker.role === 'main_worldview') {
    const allowed = await confirmUniqueWorldviewSwitch(asset)
    if (!allowed) return
  }
  const link = systemStore.addWorldBookSourceLink({
    assetId: asset.id,
    sectionIds: selectedSectionIds,
    role: sourcePicker.role,
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
    pulseSaved(t('设定文本状态已更新。', 'Setting text state updated.'))
  }
}

const removeBookSource = (linkId) => {
  const link = linkedBookSources.value.find((item) => item.id === linkId)
  if (systemStore.removeWorldBookSourceLink(linkId)) {
    if (sourceReview.linkId === linkId) sourceReview.linkId = ''
    syncBookAssetSourceStatus(link?.assetId)
    systemStore.saveNow()
    bookStore.saveNow()
    pulseSaved(t('已移除设定文本引用。', 'Setting text reference removed.'))
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
    uiNotice.value = t('找不到这份设定文本。', 'This setting text is missing.')
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
    pulseSaved(t('已确认设定文本新版。', 'Setting text version confirmed.'))
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
    worldId: currentWorldId.value,
  })
  if (!created) {
    uiNotice.value = t('模板复制失败。', 'Template copy failed.')
    return
  }
  systemStore.saveNow()
  pulseSaved(t('角色档案模板已复制到当前世界观。', 'Profile template copied into this worldview.'))
}

const openNewWorldProfileTemplate = () => {
  worldProfileTemplateProposalReview.value = null
  worldProfileTemplateProposalNotice.value = ''
  editingWorldProfileTemplate.value = createBlankWorldProfileTemplateDraft({
    worldId: currentWorldId.value,
    categoryLabel: t('基础资料', 'Basic profile'),
  })
  isCreatingWorldProfileTemplate.value = true
}

const openWorldProfileTemplateEditor = (template) => {
  if (!template?.id) return
  const current = systemStore.getProfileTemplateById(template.id)
  if (!current) {
    uiNotice.value = t('找不到这份资料卡模板。', 'This profile-card template is missing.')
    return
  }
  worldProfileTemplateProposalReview.value = null
  worldProfileTemplateProposalNotice.value = ''
  editingWorldProfileTemplate.value = current
  isCreatingWorldProfileTemplate.value = false
}

const closeWorldProfileTemplateEditor = () => {
  editingWorldProfileTemplate.value = null
  isCreatingWorldProfileTemplate.value = false
  worldProfileTemplateProposalReview.value = null
}

const openWorldProfileTemplateProposal = (review) => {
  if (!review?.draft) return false
  worldProfileTemplateProposalReview.value = review
  editingWorldProfileTemplate.value = review.draft
  isCreatingWorldProfileTemplate.value = true
  return true
}

const proposeWorldProfileTemplateFromRules = () => {
  const activePack = worldOverview.value.activePack || systemStore.getActiveWorldPack()
  const review = buildDeterministicWorldProfileTemplateProposal({
    worldContextText: buildWorldAppTemplateContextText(),
    worldPack: activePack,
    worldPacks: enabledWorldPacks.value,
    worldId: currentWorldId.value,
    locale: settings.value.system?.language || 'zh-CN',
    existingTemplates: systemStore.listWorldProfileTemplates(currentWorldId.value),
  })
  if (!openWorldProfileTemplateProposal(review)) return
  worldProfileTemplateProposalNoticeTone.value = 'info'
  worldProfileTemplateProposalNotice.value = t(
    `已生成 ${review.categoryCount} 个类目、${review.fieldCount} 个字段的待复核草稿；取消不会保存。`,
    `Generated a review draft with ${review.categoryCount} categories and ${review.fieldCount} fields; Cancel saves nothing.`,
  )
}

const proposeWorldProfileTemplateWithAI = async () => {
  if (worldProfileTemplateProposalLoading.value) return
  worldProfileTemplateProposalLoading.value = true
  worldProfileTemplateProposalNotice.value = ''
  try {
    const result = await extractWorldProfileTemplateProposalWithAI({
      worldContextText: buildWorldAppTemplateContextText(),
      worldPacks: enabledWorldPacks.value,
      existingTemplates: systemStore.listWorldProfileTemplates(currentWorldId.value),
      worldId: currentWorldId.value,
      locale: settings.value.system?.language || 'zh-CN',
      settings: settings.value,
    })
    if (!result.ok || !openWorldProfileTemplateProposal(result.review)) {
      worldProfileTemplateProposalNoticeTone.value = 'warning'
      worldProfileTemplateProposalNotice.value = t(
        'AI 暂时没有生成可用草稿；仍可使用规则建议或手动新建。',
        'AI did not produce a usable draft; rule suggestions and manual creation remain available.',
      )
      return
    }
    worldProfileTemplateProposalNoticeTone.value = 'info'
    worldProfileTemplateProposalNotice.value = t(
      `AI 已生成 ${result.review.categoryCount} 个类目、${result.review.fieldCount} 个字段的待复核草稿；取消不会保存。`,
      `AI generated a review draft with ${result.review.categoryCount} categories and ${result.review.fieldCount} fields; Cancel saves nothing.`,
    )
  } catch (error) {
    worldProfileTemplateProposalNoticeTone.value = 'danger'
    worldProfileTemplateProposalNotice.value = formatApiErrorForUi(
      error,
      t(
        'AI 生成失败；仍可使用规则建议或手动新建。',
        'AI generation failed; rule suggestions and manual creation remain available.',
      ),
    )
  } finally {
    worldProfileTemplateProposalLoading.value = false
  }
}

const saveWorldProfileTemplateDraft = (draft) => {
  const wasCreating = isCreatingWorldProfileTemplate.value
  const saved = wasCreating
    ? systemStore.createWorldProfileTemplate({
        ...draft,
        worldId: currentWorldId.value,
      })
    : systemStore.updateWorldProfileTemplate(draft?.id, draft)
  if (!saved) {
    uiNotice.value = t('资料卡模板保存失败，旧版本没有改变。', 'Profile-card save failed; the previous version is unchanged.')
    return
  }
  systemStore.saveNow()
  closeWorldProfileTemplateEditor()
  pulseSaved(
    wasCreating
      ? t('新的资料卡模板已创建。', 'New profile-card template created.')
      : t('资料卡模板已保存为新版本。', 'Profile-card template saved as a new version.'),
  )
}

const toggleWorldProfileTemplateEnabled = (template) => {
  if (!template?.id) return
  const updated = systemStore.setWorldProfileTemplateEnabled(template.id, template.enabled === false)
  if (!updated) {
    uiNotice.value = t('模板状态更新失败。', 'Template status update failed.')
    return
  }
  systemStore.saveNow()
  pulseSaved(
    updated.enabled
      ? t('当前世界会在通讯录中提供这个人设模板。', 'This template is now available in Contacts for the current world.')
      : t('当前世界已停用这个人设模板，通讯录会回到通用模板或其他已启用模板。', 'This world template is disabled; Contacts will fall back to universal or other enabled templates.'),
  )
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
    uiNotice.value = t('百科条目保存失败（可能已达上限）。', 'Encyclopedia entry save failed (limit reached).')
    return
  }
  resetKnowledgeDraft()
  isKnowledgeComposerOpen.value = false
  systemStore.saveNow()
  pulseSaved(t('百科条目已添加。', 'Encyclopedia entry added.'))
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
    uiNotice.value = t('要编辑的百科条目已不存在。', 'The encyclopedia entry you were editing no longer exists.')
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
    uiNotice.value = t('百科条目保存失败（可能已达上限）。', 'Encyclopedia entry save failed (limit reached).')
    return
  }

  resetKnowledgeDraft()
  isKnowledgeComposerOpen.value = false
  systemStore.saveNow()
  pulseSaved(t('百科条目已更新。', 'Encyclopedia entry updated.'))
}

const toggleKnowledgePoint = (point) => {
  if (!point?.id) return
  systemStore.setKnowledgePointEnabled(point.id, !point.enabled)
  systemStore.saveNow()
}

const clearKnowledgeDeepLink = () => {
  router.replace('/worldbook')
}

const removeKnowledgePoint = async (point) => {
  if (!point?.id) return
  const ok = await confirmDialog({
    title: t('删除百科条目', 'Delete encyclopedia entry'),
    message: `${t('确认删除百科条目', 'Delete encyclopedia entry')}「${point.title || ''}」？`,
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
  pulseSaved(t('百科条目已删除。', 'Encyclopedia entry deleted.'))
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
    syncWorldBookDeepLink(route.query)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (savedTimerId) clearTimeout(savedTimerId)
})
</script>

<template>
  <div class="worldbook-shell w-full h-full flex flex-col">
    <header class="worldbook-header">
      <button @click="goSettings" class="worldbook-nav-button">
        <i class="fas fa-chevron-left"></i> {{ returnButtonLabel }}
      </button>
      <div class="worldbook-brand">
        <small>WORLD&nbsp;ARCHIVE</small>
        <h1>{{ t('世界书', 'World Book') }}</h1>
      </div>
      <button
        type="button"
        class="worldbook-book-link"
        :aria-label="t('打开文本库', 'Open Book')"
        data-testid="worldbook-topbar-open-book"
        @click="openBookLibrary"
      >
        <i class="fas fa-book-bookmark" aria-hidden="true"></i>
      </button>
    </header>

    <div class="worldbook-scroll flex-1 px-4 py-4 overflow-y-auto no-scrollbar space-y-4">
      <WorldBookOverview
        :overview="worldOverview"
        :text-categories="contextTextCategories"
        :active-text-char-count="activeContextTextCharCount"
        :token-estimate="worldBookTokenEstimate"
        :saved="saved"
        @open-category="openSourceDirectory"
      />

      <div
        v-if="sourceDirectory.open"
        class="worldbook-sheet-backdrop"
        data-testid="worldbook-source-directory-backdrop"
        @click="closeSourceDirectory"
      ></div>
      <div
        v-if="sourceDirectory.open && selectedTextCategory"
        class="worldbook-source-directory"
        data-testid="worldbook-source-directory"
        role="dialog"
        :aria-label="selectedTextCategory.label"
      >
        <div class="worldbook-sheet-head">
          <div>
            <p>{{ t('目录', 'Directory') }}</p>
            <h3>{{ selectedTextCategory.label }}</h3>
          </div>
          <button type="button" class="worldbook-inline-action" @click="closeSourceDirectory">
            {{ t('关闭', 'Close') }}
          </button>
        </div>

        <div class="worldbook-source-directory__active" data-testid="worldbook-source-directory-active">
          <span>{{ t('当前生效', 'Active now') }}</span>
          <div>
            <em
              v-for="link in selectedTextCategory.enabledLinks"
              :key="link.id"
            >
              {{ link.title }}
            </em>
            <em v-if="selectedTextCategory.enabledLinks.length === 0" class="is-empty">
              {{ t('未设置', 'Not set') }}
            </em>
          </div>
        </div>

        <div v-if="isMultiSelectDirectory" class="worldbook-source-directory__batch">
          <span>
            {{ t('可多选 · 点按即启用', 'Multi-select · tap to toggle') }} ·
            {{ selectedTextCategory.enabledLinks.length }}/{{ selectedTextCategory.availableAssets.length }}
          </span>
          <div>
            <button type="button" class="worldbook-inline-action" data-testid="worldbook-source-directory-enable-all" @click="enableAllDirectoryAssets">
              {{ t('全部启用', 'Enable all') }}
            </button>
            <button type="button" class="worldbook-inline-action" data-testid="worldbook-source-directory-disable-all" @click="disableAllDirectoryAssets">
              {{ t('全部停用', 'Disable all') }}
            </button>
          </div>
        </div>

        <div class="worldbook-source-directory__list" data-testid="worldbook-source-directory-list">
          <button
            type="button"
            class="worldbook-source-directory__import"
            data-testid="worldbook-source-directory-import"
            @click="openDirectoryImportMenu"
          >
            <span><i class="fas fa-file-import" aria-hidden="true"></i></span>
            <strong>{{ t('导入新文稿', 'Import new manuscript') }}</strong>
            <small>{{ t('需要先命名，再决定是否启用', 'Name it first, then choose whether to enable it') }}</small>
          </button>
          <button
            v-for="asset in selectedTextCategory.availableAssets"
            :key="asset.id"
            type="button"
            class="worldbook-source-directory__row"
            :class="{ 'is-enabled': Boolean(directoryLinkForAsset(asset.id)) }"
            :aria-pressed="isMultiSelectDirectory ? Boolean(directoryLinkForAsset(asset.id)) : undefined"
            :data-testid="`worldbook-source-directory-asset-${asset.id}`"
            @click="isMultiSelectDirectory ? toggleDirectoryAsset(asset) : openDirectoryAssetMenu(asset)"
          >
            <span>
              <strong>{{ asset.title }}</strong>
              <small>
                {{ asset.content?.length || 0 }} {{ t('字', 'chars') }} ·
                {{ Array.isArray(asset.sections) ? asset.sections.length : 0 }} {{ t('段落', 'sections') }}
              </small>
            </span>
            <span v-if="isMultiSelectDirectory" class="worldbook-directory-toggle">
              <span
                :class="['worldbook-directory-switch', { 'is-on': Boolean(directoryLinkForAsset(asset.id)) }]"
                aria-hidden="true"
              >
                <i></i>
              </span>
              <em>{{ directoryLinkForAsset(asset.id) ? t('已启用', 'Enabled') : t('可选', 'Available') }}</em>
            </span>
            <em v-else>{{ directoryLinkForAsset(asset.id) ? t('已启用', 'Enabled') : t('可选', 'Available') }}</em>
          </button>
        </div>

        <div v-if="sourceDirectory.menu === 'asset' && selectedDirectoryAsset" class="worldbook-directory-menu" data-testid="worldbook-source-directory-asset-menu">
          <div>
            <p>{{ t('文稿操作', 'Manuscript actions') }}</p>
            <strong>{{ selectedDirectoryAsset.title }}</strong>
            <small>
              {{ selectedDirectoryAsset.content?.length || 0 }} {{ t('字', 'chars') }} ·
              {{ Array.isArray(selectedDirectoryAsset.sections) ? selectedDirectoryAsset.sections.length : 0 }} {{ t('段落', 'sections') }}
            </small>
          </div>
          <div class="worldbook-directory-menu__actions">
            <button
              v-if="!directoryLinkForAsset(selectedDirectoryAsset.id)"
              type="button"
              class="worldbook-primary-action"
              data-testid="worldbook-source-directory-enable"
              @click="enableDirectoryAsset()"
            >
              {{ t('启用', 'Enable') }}
            </button>
            <button
              v-else
              type="button"
              class="worldbook-secondary-action"
              data-testid="worldbook-source-directory-disable"
              @click="disableDirectoryAsset()"
            >
              {{ t('停用', 'Disable') }}
            </button>
            <button type="button" class="worldbook-secondary-action" @click="closeDirectoryMenu">
              {{ t('返回目录', 'Back') }}
            </button>
          </div>
        </div>

        <div v-if="sourceDirectory.menu === 'import'" class="worldbook-directory-menu" data-testid="worldbook-source-directory-import-menu">
          <div>
            <p>{{ t('导入文稿', 'Import manuscript') }}</p>
            <strong>{{ selectedTextCategory.label }}</strong>
          </div>
          <label class="worldbook-directory-field">
            <span>{{ t('文稿名称', 'Manuscript name') }}</span>
            <input v-model="sourceDirectory.draftTitle" type="text" data-testid="worldbook-source-directory-import-title" />
          </label>
          <label class="worldbook-directory-field">
            <span>{{ t('正文', 'Text') }}</span>
            <textarea v-model="sourceDirectory.draftContent" rows="5" data-testid="worldbook-source-directory-import-content"></textarea>
          </label>
          <div class="worldbook-directory-menu__actions">
            <button type="button" class="worldbook-primary-action" data-testid="worldbook-source-directory-import-enable" @click="createDirectoryImportedAsset({ enable: true })">
              {{ t('保存并启用', 'Save and enable') }}
            </button>
            <button type="button" class="worldbook-secondary-action" data-testid="worldbook-source-directory-import-save" @click="createDirectoryImportedAsset()">
              {{ t('只保存', 'Save only') }}
            </button>
            <button type="button" class="worldbook-secondary-action" @click="closeDirectoryMenu">
              {{ t('返回目录', 'Back') }}
            </button>
          </div>
        </div>

        <p v-if="sourceDirectory.notice" class="worldbook-directory-notice" data-testid="worldbook-source-directory-notice">
          {{ sourceDirectory.notice }}
        </p>
      </div>

      <WorldSettingWorkspace
        :workspace="worldSettingWorkspace"
        :active-panel="activeWorldbookPanel"
        @select-panel="setWorldbookPanel"
        @open-book="openBookWorkspace"
      />

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
          :wallet-currency-options="currencyOptions"
          :currency-draft="worldCurrencyDraft"
          :currency-notice="worldCurrencyNotice"
          @select-pack="selectWorldPack"
          @activate-pack="activateSelectedWorldPack"
          @reset-pack="resetWorldPackToDefault"
          @analyze-world-profile="analyzeWorldForExpansions"
          @enable-pack="enableWorldPackExpansion"
          @disable-pack="disableWorldPackExpansion"
          @extract-template-proposals="extractWorldAppTemplateProposalsFromAI"
          @review-template-proposal-draft="reviewWorldAppTemplateProposalDraft"
          @update-template-proposal-draft="updateWorldAppTemplateProposalDraft"
          @confirm-template-proposal="confirmWorldAppTemplateProposalEntry"
          @clear-template-proposal-review="clearWorldAppTemplateProposalReview"
          @update-currency-draft="updateWorldCurrencyDraft"
          @save-currency-draft="saveWorldCurrencyDraft"
          @inject-pack-currency="injectExistingWorldCurrency"
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
          <p>{{ t('设定文本', 'Setting texts') }}</p>
          <h2>{{ t('从 Book 选择世界书文本', 'Choose worldbook text from Book') }}</h2>
          <span>
            {{
              t(
                'Book 负责写作和编辑；这里决定哪些文本进入当前世界背景。',
                'Book owns writing and editing; this page only chooses what enters the current world context.',
              )
            }}
          </span>
        </div>
        <div class="worldbook-onboarding-actions">
          <button type="button" class="worldbook-primary-action" @click="addFirstBookSource">
            {{ sourcePickerAssets.length > 0 ? t('从文本库添加设定', 'Add setting text from Book') : t('打开文本库', 'Open Book') }}
          </button>
          <button
            v-if="sourcePickerAssets.length > 0"
            type="button"
            class="worldbook-secondary-action"
            data-testid="worldbook-open-book-library"
            @click="openBookLibrary"
          >
            {{ t('浏览书目卡片', 'Browse Book cards') }}
          </button>
        </div>
      </section>

      <section class="worldbook-source-console" data-testid="worldbook-book-sources">
        <div class="worldbook-source-head">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {{ t('聊天会读到的内容', 'Read in chats') }}
            </p>
            <h2 class="text-lg font-semibold">
              {{ t('这个世界正在读的书', 'Books this world is reading') }}
            </h2>
            <p class="text-sm text-gray-500">
              {{
                t(
                  '选中的书会成为聊天和事件里的世界背景；内容本身仍在 Book 里编辑。',
                  'Chosen books become the world background in chats and events; the text itself is still edited in Book.',
                )
              }}
            </p>
          </div>
          <button type="button" class="worldbook-secondary-action" data-testid="worldbook-book-source-add" @click="addFirstBookSource">
            {{ sourcePickerAssets.length > 0 ? t('从书架添加', 'Add from Book') : t('打开文本库', 'Open Book') }}
          </button>
        </div>

        <div class="worldbook-source-summary" data-testid="worldbook-source-stats">
          <span>
            <strong>
              {{
                activeBookSourceCount > 0
                  ? t(`正在读 ${activeBookSourceCount} 本书`, `Reading ${activeBookSourceCount} book(s)`)
                  : t('还没有启用任何书', 'No books active yet')
              }}
            </strong>
            <small>
              {{
                t(
                  '书架上的书可以按需加入这个世界；一本不加也不影响其他设定。',
                  'Add books from the shelf as needed; everything else works fine without one.',
                )
              }}
            </small>
          </span>
          <span v-if="bookSourceIssueCount > 0" class="is-warning">
            <strong>{{ t(`${bookSourceIssueCount} 份文稿有更新`, `${bookSourceIssueCount} text(s) updated`) }}</strong>
            <small>{{ t('原文在 Book 里改过，确认后聊天就读新内容。', 'The original changed in Book; once confirmed, chats read the new text.') }}</small>
          </span>
          <span v-else-if="disabledBookSourceCount > 0">
            <strong>{{ t(`${disabledBookSourceCount} 本书未启用`, `${disabledBookSourceCount} book(s) not in use`) }}</strong>
            <small>{{ t('没启用的书收在下方「更多管理」里，不影响当前聊天。', 'Inactive books live under More management and do not affect current chats.') }}</small>
          </span>
        </div>

        <details class="worldbook-fallback-compat" data-testid="worldbook-fallback-compat">
          <summary>
            <span>
              <strong>{{ t('备用：基础世界观', 'Fallback: base worldview') }}</strong>
              <small>{{ t('书架没有启用任何文本时，才会用到这段短说明。', 'Only used when no book is active on the shelf.') }}</small>
            </span>
            <em>{{ worldBookCount }} {{ t('字', 'chars') }}</em>
          </summary>
          <div class="worldbook-system-fallback" data-testid="worldbook-system-fallback">
            <div>
              <p>{{ t('基础世界观', 'Base worldview') }}</p>
              <strong>{{ worldBookCount }} {{ t('字', 'chars') }}</strong>
              <span>{{ fallbackWorldviewPreview }}</span>
            </div>
            <button
              type="button"
              class="worldbook-secondary-action"
              data-testid="worldbook-copy-fallback-to-book"
              @click="copyFallbackWorldviewToBook"
            >
              {{ t('复制到 Book', 'Copy to Book') }}
            </button>
          </div>
        </details>

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
          :aria-label="t('选择设定文本', 'Choose setting text')"
        >
          <div class="worldbook-sheet-head">
            <div>
              <p>{{ t('文本库书目', 'Book catalog') }}</p>
              <h3>{{ t('选择一本设定文本', 'Choose a setting text') }}</h3>
            </div>
            <button type="button" class="worldbook-inline-action" @click="closeBookSourcePicker">
              {{ t('关闭', 'Close') }}
            </button>
          </div>
          <div class="worldbook-source-catalog" data-testid="worldbook-source-catalog">
            <section
              v-for="group in sourcePickerGroups"
              :key="group.id"
              class="worldbook-source-catalog-group"
              :data-testid="`worldbook-source-picker-group-${group.id}`"
            >
              <div class="worldbook-source-catalog-group__head">
                <span>
                  <strong>{{ group.label }}</strong>
                  <small>{{ group.count }} {{ t('份文稿', 'manuscript(s)') }}</small>
                </span>
              </div>
              <div class="worldbook-source-catalog-group__items">
                <button
                  v-for="asset in group.assets"
                  :key="asset.id"
                  type="button"
                  class="worldbook-source-catalog-card"
                  :class="{
                    'is-selected': sourcePicker.assetId === asset.id,
                    'is-linked': isSourcePickerAssetLinked(asset.id),
                  }"
                  :aria-pressed="sourcePicker.assetId === asset.id"
                  :data-testid="`worldbook-source-picker-card-${asset.id}`"
                  @click="selectSourcePickerAsset(asset)"
                >
                  <span class="worldbook-source-catalog-card__head">
                    <strong>{{ asset.title }}</strong>
                    <span class="worldbook-source-catalog-card__badges">
                      <em v-if="isBuiltInBookTextAssetId(asset.id)">{{ t('内置文本', 'Built-in') }}</em>
                      <em v-if="isSourcePickerAssetLinked(asset.id)">{{ t('已加入', 'Added') }}</em>
                    </span>
                  </span>
                  <span class="worldbook-source-catalog-card__meta">
                    {{ getBookAssetCategoryLabel(asset) }} · {{ asset.content?.length || 0 }} {{ t('字', 'chars') }} ·
                    {{ Array.isArray(asset.sections) ? asset.sections.length : 0 }} {{ t('段落', 'sections') }}
                  </span>
                  <span v-if="asset.description" class="worldbook-source-catalog-card__desc">
                    {{ asset.description }}
                  </span>
                </button>
              </div>
            </section>
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
              <span>{{ t('作为哪类设定', 'Use as') }}</span>
              <select v-model="sourcePicker.role" data-testid="worldbook-source-picker-usage">
                <option v-for="role in sourceRoleOptions" :key="role.id" :value="role.id">
                  {{ role.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="worldbook-picker-mode" data-testid="worldbook-source-picker-mode">
            <label>
              <input v-model="sourcePicker.mode" type="radio" value="whole" />
              <span>{{ t('使用全文', 'Use whole document') }}</span>
            </label>
            <label :class="{ 'is-disabled': sourcePickerSections.length === 0 }">
              <input v-model="sourcePicker.mode" type="radio" value="sections" :disabled="sourcePickerSections.length === 0" />
              <span>{{ t('只使用选中段落', 'Use selected sections') }}</span>
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
              {{ t('加入当前世界背景', 'Add to current world context') }}
            </button>
          </div>
        </div>

        <div v-if="linkedBookSources.length === 0" class="worldbook-source-empty" data-testid="worldbook-book-source-empty">
          <span><i class="fas fa-link-slash"></i></span>
          <strong>{{ t('还没有添加设定文本', 'No setting text added yet') }}</strong>
          <p>{{ t('去 Book 写一本或导入文稿，回到这里启用；不启用也不影响其他设定。', 'Write or import a book in Book and enable it here; everything else works without one.') }}</p>
        </div>

        <div v-else-if="activeBookSources.length > 0" class="worldbook-source-list" data-testid="worldbook-active-source-list">
        <article
          v-for="link in activeBookSources"
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
            <span class="is-success">{{ t('正在使用', 'In use') }}</span>
            <span v-if="link.builtIn" class="is-muted">{{ t('内置文本', 'Built-in text') }}</span>
            <span v-if="link.changed" class="is-warning">{{ t('需要确认更新', 'Update confirmation needed') }}</span>
          </div>
          <div class="worldbook-source-card__actions">
            <button v-if="link.changed && !link.missing" type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-review-${link.id}`" @click="openBookSourceReview(link)">
              {{ t('改用新版', 'Use new version') }}
            </button>
            <button type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-toggle-${link.id}`" @click="toggleBookSource(link)">
              {{ t('从当前背景移除', 'Remove from context') }}
            </button>
            <button type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-open-${link.id}`" @click="openBookSource(link.assetId)">
              {{ link.builtIn ? t('查看文本', 'View text') : t('打开文本', 'Open text') }}
            </button>
            <button type="button" class="worldbook-secondary-action worldbook-danger-action" :data-testid="`worldbook-book-source-remove-${link.id}`" @click="removeBookSource(link.id)">
              {{ t('移除', 'Remove') }}
            </button>
          </div>
        </article>
        </div>

        <div v-else class="worldbook-source-empty" data-testid="worldbook-active-source-empty">
          <span><i class="fas fa-book"></i></span>
          <strong>{{ t('当前没有生效的书', 'No book is active right now') }}</strong>
          <p>{{ t('从下方「更多管理」重新启用，或从 Book 添加新的。', 'Re-enable one under More management, or add a new one from Book.') }}</p>
        </div>

        <details
          v-if="sourceMaintenanceLinks.length > 0"
          class="worldbook-source-maintenance"
          data-testid="worldbook-source-maintenance"
        >
          <summary>
            <span>{{ t('更多管理', 'More management') }}</span>
            <small>
              {{
                t(
                  `${sourceMaintenanceLinks.length} 份未启用或有更新的文稿`,
                  `${sourceMaintenanceLinks.length} inactive or updated text(s)`,
                )
              }}
            </small>
          </summary>
          <div class="worldbook-source-maintenance-list">
            <article
              v-for="link in sourceMaintenanceLinks"
              :key="`maintenance-${link.id}`"
              class="worldbook-source-card"
              :class="{
                'is-disabled': link.enabled === false,
                'is-warning': link.changed && !link.missing,
                'is-missing': link.missing,
              }"
              :data-testid="`worldbook-book-source-maintenance-${link.id}`"
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
                <span v-if="link.missing" class="is-danger">{{ t('文本不存在', 'Text missing') }}</span>
                <span v-else-if="link.changed" class="is-warning">{{ t('需要确认更新', 'Update confirmation needed') }}</span>
                <span v-else-if="link.builtIn" class="is-muted">{{ t('内置文本', 'Built-in text') }}</span>
                <span v-else class="is-muted">{{ t('未使用', 'Not in use') }}</span>
              </div>
              <div class="worldbook-source-card__actions">
                <button v-if="link.changed && !link.missing" type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-review-maintenance-${link.id}`" @click="openBookSourceReview(link)">
                  {{ t('改用新版', 'Use new version') }}
                </button>
                <button v-if="!link.missing" type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-toggle-maintenance-${link.id}`" @click="toggleBookSource(link)">
                  {{ link.enabled === false ? t('加入当前背景', 'Use in context') : t('从当前背景移除', 'Remove from context') }}
                </button>
                <button type="button" class="worldbook-secondary-action" :data-testid="`worldbook-book-source-open-maintenance-${link.id}`" @click="openBookSource(link.assetId)">
                  {{ link.builtIn ? t('查看文本', 'View text') : t('打开文本', 'Open text') }}
                </button>
                <button type="button" class="worldbook-secondary-action worldbook-danger-action" :data-testid="`worldbook-book-source-remove-maintenance-${link.id}`" @click="removeBookSource(link.id)">
                  {{ t('移除引用', 'Remove reference') }}
                </button>
              </div>
            </article>
          </div>
        </details>

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
          :aria-label="t('设定文本更新确认', 'Setting text update review')"
        >
          <div class="worldbook-source-review-head">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {{ t('文稿有更新', 'Text updated') }}
              </p>
              <h3>{{ reviewingBookSource.title }}</h3>
              <p>
                {{
                  sourceReviewDiff.hasPreviousSnapshot
                    ? t('只列出会影响世界背景的变化。', 'Only changes that affect the world background are listed.')
                    : t('这份引用没有旧内容可对比，可以把现在的内容当作比较基准。', 'No previous version to compare against; you can treat the current text as the baseline.')
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
              {{ t('长文只预览前段；接受后以当前内容为准。', 'Long text is previewed partially; accepting adopts the current text.') }}
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
              {{ t('当前使用内容没有文字变化。', 'The in-use text has no content changes.') }}
            </p>
          </div>

          <div class="worldbook-picker-actions">
            <button type="button" class="worldbook-secondary-action" @click="openBookSource(reviewingBookSource.assetId)">
              {{ t('打开原文', 'Open text') }}
            </button>
            <button
              type="button"
              class="worldbook-primary-action"
              data-testid="worldbook-book-source-review-accept"
              @click="acceptReviewedBookSource"
            >
              {{ t('使用新内容', 'Use new text') }}
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
            <p>{{ t('备用说明', 'Fallback note') }}</p>
            <h2>{{ t('备用世界观说明', 'Fallback worldview note') }}</h2>
            <span>
              {{
                t(
                  '书架一本书都没启用时，聊天会读这段简短说明。想认真写世界观，请到 Book 里编辑。',
                  'When no book is active, chats read this short note instead. For a real worldview, write it in Book.',
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
          data-testid="worldbook-global-worldview"
          :placeholder="
            t(
              '例如：一句话说清这个世界的基本前提……',
              'Example: one sentence that states the world premise...',
            )
          "
        ></textarea>
        <div class="worldbook-kernel-actions">
          <p>{{ t('这里只写简短的备用说明；要认真经营世界观，请去 Book。', 'Just a short fallback note here; for serious worldbuilding, use Book.') }}</p>
          <button
            type="button"
            class="worldbook-primary-action"
            :class="{ 'is-saved': saved }"
            data-testid="worldbook-save-worldview"
            @click="saveWorldBook"
          >
            {{ saved ? t('已保存', 'Saved') : t('保存备用说明', 'Save fallback note') }}
          </button>
          <button
            type="button"
            class="worldbook-secondary-action worldbook-danger-action"
            data-testid="worldbook-clear-worldview"
            @click="clearGlobalWorldview"
          >
            {{ t('清空备用说明', 'Clear fallback note') }}
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
                  '先把预设复制到当前世界观，再到通讯录填写具体角色值。',
                  'Copy a preset into the current worldview, then fill concrete values in Contacts.',
                )
              }}
            </p>
          </div>
          <div class="worldbook-template-stats">
            <span>
              <strong>{{ profileTemplateStats.presetCount }}</strong>
              {{ t('预设', 'Presets') }}
            </span>
            <span>
              <strong>{{ profileTemplateStats.worldCount }}</strong>
              {{ t('当前世界', 'World') }}
            </span>
            <span>
              <strong>{{ profileTemplateStats.enabledWorldCount }}</strong>
              {{ t('已启用', 'Enabled') }}
            </span>
          </div>
        </div>

        <div
          class="worldbook-template-handoff"
          data-testid="worldbook-template-contacts-handoff"
        >
          <div class="worldbook-template-handoff__copy">
            <p>{{ profileTemplateHandoff.eyebrow }}</p>
            <h3>{{ profileTemplateHandoff.title }}</h3>
            <span>{{ profileTemplateHandoff.detail }}</span>
          </div>
          <div class="worldbook-template-handoff__flow">
            <span>{{ profileTemplateHandoff.fromLabel }}</span>
            <i class="fas fa-arrow-right" aria-hidden="true"></i>
            <span>{{ profileTemplateHandoff.toLabel }}</span>
          </div>
          <button
            type="button"
            class="worldbook-primary-action"
            data-testid="worldbook-open-contacts-for-templates"
            @click="openContactsForProfileTemplates"
          >
            <i class="fas fa-address-book" aria-hidden="true"></i>
            {{ profileTemplateHandoff.actionLabel }}
          </button>
        </div>

        <div class="worldbook-template-section">
          <p class="text-sm font-semibold">{{ universalTemplateSection.title }}</p>
          <p class="text-xs text-gray-500">
            {{ universalTemplateSection.detail }}
          </p>
          <div v-for="preset in profileTemplatePresetRows" :key="preset.id" class="worldbook-template-row">
            <div class="min-w-0">
              <p class="font-medium truncate">{{ preset.title }}</p>
              <p class="text-xs text-gray-500">{{ preset.fieldCountLabel }}</p>
            </div>
            <button
              type="button"
              class="worldbook-secondary-action"
              :data-testid="`worldbook-template-copy-${preset.id}`"
              @click="copyProfileTemplatePreset(preset.id)"
            >
              {{ preset.copyLabel }}
            </button>
          </div>
        </div>

        <div class="worldbook-template-section">
          <div class="worldbook-template-section__head">
            <div>
              <p class="text-sm font-semibold">{{ worldTemplateSection.title }}</p>
              <p class="text-xs text-gray-500">
                {{ worldTemplateSection.detail }}
              </p>
            </div>
            <div class="worldbook-template-section__actions">
              <button
                type="button"
                class="worldbook-secondary-action"
                data-testid="worldbook-profile-template-propose"
                @click="proposeWorldProfileTemplateFromRules"
              >
                {{ t('根据当前世界生成建议', 'Suggest from current world') }}
              </button>
              <button
                type="button"
                class="worldbook-secondary-action"
                data-testid="worldbook-profile-template-propose-ai"
                :disabled="worldProfileTemplateProposalLoading"
                @click="proposeWorldProfileTemplateWithAI"
              >
                {{
                  worldProfileTemplateProposalLoading
                    ? t('AI 正在生成…', 'Generating with AI…')
                    : t('用 AI 生成建议', 'Suggest with AI')
                }}
              </button>
              <button
                type="button"
                class="worldbook-primary-action"
                data-testid="worldbook-profile-template-create"
                @click="openNewWorldProfileTemplate"
              >
                <i class="fas fa-plus" aria-hidden="true"></i>
                {{ t('新建资料卡', 'New profile card') }}
              </button>
            </div>
          </div>
          <div
            v-if="worldProfileTemplateProposalReview"
            class="worldbook-profile-template-proposal-review"
            data-testid="worldbook-profile-template-proposal-review"
          >
            <strong>
              {{
                worldProfileTemplateProposalReview.source === 'ai'
                  ? t('AI 待复核草稿', 'AI review draft')
                  : t('规则待复核草稿', 'Rule-based review draft')
              }}
            </strong>
            <span>
              {{
                t(
                  `${worldProfileTemplateProposalReview.categoryCount} 个类目 · ${worldProfileTemplateProposalReview.fieldCount} 个字段；只有保存才创建模板。`,
                  `${worldProfileTemplateProposalReview.categoryCount} categories · ${worldProfileTemplateProposalReview.fieldCount} fields; only Save creates a template.`,
                )
              }}
            </span>
            <small v-if="worldProfileTemplateProposalReview.matchedRuleLabels?.length">
              {{ worldProfileTemplateProposalReview.matchedRuleLabels.join(' · ') }}
            </small>
          </div>
          <p
            v-if="worldProfileTemplateProposalNotice"
            class="worldbook-profile-template-proposal-notice"
            :data-notice-tone="worldProfileTemplateProposalNoticeTone"
            data-testid="worldbook-profile-template-proposal-notice"
          >
            {{ worldProfileTemplateProposalNotice }}
          </p>
          <WorldBookProfileTemplateEditor
            v-if="editingWorldProfileTemplate"
            :template="editingWorldProfileTemplate"
            :is-new="isCreatingWorldProfileTemplate"
            @cancel="closeWorldProfileTemplateEditor"
            @save="saveWorldProfileTemplateDraft"
          />
          <p v-if="worldProfileTemplateRows.length === 0" class="text-sm text-gray-500">
            {{ worldTemplateSection.emptyCopy }}
          </p>
          <div v-for="template in worldProfileTemplateRows" :key="template.id" class="worldbook-template-row">
            <div class="min-w-0">
              <p class="font-medium truncate">{{ template.title }}</p>
              <p class="text-xs text-gray-500">
                {{ template.versionLabel }} · {{ template.fieldCountLabel }} · {{ template.stateLabel }}
              </p>
            </div>
            <div class="worldbook-template-row__actions">
              <button
                type="button"
                class="worldbook-secondary-action"
                :data-testid="`worldbook-template-edit-${template.id}`"
                @click="openWorldProfileTemplateEditor(template)"
              >
                {{ t('编辑资料卡', 'Edit profile card') }}
              </button>
              <button
                type="button"
                class="worldbook-secondary-action"
                :data-testid="`worldbook-template-toggle-${template.id}`"
                @click="toggleWorldProfileTemplateEnabled(template)"
              >
                {{ template.toggleLabel }}
              </button>
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
            <h2>{{ t('百科', 'Encyclopedia') }}</h2>
            <span>
              {{
                t(
                  '百科用于记录组织、术语、社会规则、行业常识和额外设定；绑定到角色后，才会进入对应 Chat 上下文。',
                  'Encyclopedia entries store organizations, terms, social rules, domain facts, and extra lore; they enter Chat context only after role binding.',
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
            <p>{{ t('百科', 'Encyclopedia') }}</p>
            <span>{{ t('保存可绑定到角色的组织、术语、社会规则、行业常识和额外设定。', 'Store role-bound organizations, terms, social rules, domain facts, and extra lore.') }}</span>
          </div>
          <button
            type="button"
            class="worldbook-primary-action"
            data-testid="knowledge-open-create"
            @click="openCreateKnowledgePoint"
          >
            <i class="fas fa-plus"></i>
            {{ t('新增百科条目', 'Add encyclopedia entry') }}
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
          :aria-label="isEditingKnowledgePoint ? t('编辑百科条目', 'Edit encyclopedia entry') : t('新增百科条目', 'Add encyclopedia entry')"
        >
          <div class="worldbook-sheet-head">
            <div>
              <p>{{ t('百科补充', 'Encyclopedia patch') }}</p>
              <h3>{{ isEditingKnowledgePoint ? t('编辑百科条目', 'Edit encyclopedia entry') : t('新增百科条目', 'Add encyclopedia entry') }}</h3>
            </div>
            <button type="button" class="worldbook-inline-action" @click="closeKnowledgeComposer">
              {{ t('关闭', 'Close') }}
            </button>
          </div>
          <div v-if="isEditingKnowledgePoint" class="flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            <span data-testid="knowledge-editing-state">
              {{ t('正在编辑已有百科条目', 'Editing existing encyclopedia entry') }}
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
            :placeholder="t('百科标题（如：打歌节目规则）', 'Entry title (e.g. music show rules)')"
          />
          <textarea
            v-model="knowledgeDraft.content"
            data-testid="knowledge-draft-content"
            class="w-full h-20 border rounded-lg px-3 py-2 text-sm outline-none resize-none"
            :placeholder="t('百科内容', 'Encyclopedia entry content')"
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
            {{ t('新增百科条目', 'Add encyclopedia entry') }}
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
          {{ t('暂无百科条目。', 'No encyclopedia entries yet.') }}
        </div>

        <div
          v-else-if="visibleKnowledgePoints.length === 0"
          class="worldbook-knowledge-empty text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg p-3 text-center"
        >
          {{ t('当前筛选下没有百科条目。', 'No encyclopedia entries match the current filter.') }}
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
                  :class="point.enabled ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'"
                  :data-testid="`knowledge-toggle-${point.id}`"
                >
                  {{ point.enabled ? t('停用', 'Disable') : t('启用', 'Enable') }}
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
/* 书房档案馆主题：局部覆盖 --system-* 调色板，整页（含 worldbook 子组件）随之换肤 */
.worldbook-shell {
  --system-page-bg:
    radial-gradient(90% 55% at 50% 0%, #f5f0e6 0%, transparent 60%),
    linear-gradient(180deg, #faf9f6 0%, #f2f0e9 100%);
  --system-chrome-bg: rgba(250, 249, 246, 0.92);
  --system-panel-bg: rgba(255, 255, 255, 0.92);
  --system-panel-bg-solid: #fbfaf5;
  --system-elevated-bg: rgba(255, 255, 255, 0.97);
  --system-control-bg: rgba(255, 255, 255, 0.88);
  --system-control-bg-strong: #ffffff;
  --system-surface-muted: rgba(240, 238, 231, 0.85);
  --system-border: rgba(38, 34, 27, 0.1);
  --system-card-border: rgba(38, 34, 27, 0.08);
  --system-control-border: rgba(38, 34, 27, 0.12);
  --system-subtle-border: rgba(38, 34, 27, 0.08);
  --system-text: #26221b;
  --system-text-muted: rgba(38, 34, 27, 0.62);
  --system-text-soft: rgba(38, 34, 27, 0.44);
  --system-accent: #c8452c;
  --system-accent-strong: #a83a25;
  --system-accent-soft: rgba(200, 69, 44, 0.1);
  --system-success: #5e8a4c;
  --system-success-soft: rgba(94, 138, 76, 0.12);
  --system-warning: #a77736;
  --system-warning-soft: rgba(167, 119, 54, 0.13);
  --system-danger: #b8453a;
  --system-danger-soft: rgba(184, 69, 58, 0.11);
  --system-info: #c8452c;
  --system-info-soft: rgba(200, 69, 44, 0.09);
  --system-hover-bg: rgba(200, 69, 44, 0.07);
  --system-pressed-bg: rgba(200, 69, 44, 0.11);
  --system-focus-ring: rgba(200, 69, 44, 0.16);
  --system-shadow-chrome: 0 10px 28px rgba(38, 34, 27, 0.07);
  --system-shadow-card: 0 12px 28px rgba(38, 34, 27, 0.08);
  --system-shadow-control: 0 8px 18px rgba(38, 34, 27, 0.09);
  background: var(--system-page-bg);
  color: var(--system-text);
}

.worldbook-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: calc(40px + env(safe-area-inset-top)) 18px 12px;
  border-bottom: 1px solid var(--system-border);
  background: var(--system-chrome-bg);
  box-shadow: var(--system-shadow-chrome);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.worldbook-brand {
  flex: 1;
  min-width: 0;
}

.worldbook-brand small {
  display: block;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.22em;
  color: var(--system-accent);
}

.worldbook-header h1 {
  margin: 1px 0 0;
  font-family: "Songti SC", "STSong", "SimSun", serif;
  font-size: 26px;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: 0.02em;
  color: var(--system-text);
}

.worldbook-nav-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: var(--system-text);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.worldbook-book-link {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--system-control-border);
  border-radius: 50%;
  color: var(--system-text);
  background: var(--system-control-bg);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: transform 160ms ease;
}

.worldbook-book-link:active {
  transform: scale(0.94);
}

/* 各面板大标题统一衬线展示字，呼应 Book 的书房气质 */
.worldbook-onboarding-card h2,
.worldbook-source-head h2,
.worldbook-kernel-hero h2,
.worldbook-template-hero h2,
.worldbook-knowledge-hero h2,
.worldbook-sheet-head h3,
.worldbook-source-review-head h3 {
  font-family: "Songti SC", "STSong", "SimSun", serif;
  letter-spacing: 0.01em;
}

.worldbook-scroll {
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
}

.worldbook-scroll > .rounded-2xl,
.worldbook-panel > .rounded-2xl {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-lg);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
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

.worldbook-source-summary {
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr);
}

.worldbook-source-summary span {
  display: grid;
  gap: 4px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 11px 12px;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
}

.worldbook-source-summary strong {
  color: var(--system-text);
  font-size: 13px;
  line-height: 1.3;
}

.worldbook-source-summary small {
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.worldbook-source-summary .is-warning {
  border-color: color-mix(in srgb, var(--system-warning) 44%, var(--system-control-border));
  background: var(--system-warning-soft);
}

.worldbook-source-summary .is-warning strong {
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

.worldbook-source-maintenance {
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-surface-muted);
  overflow: hidden;
}

.worldbook-source-maintenance summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 48px;
  padding: 0 12px;
  color: var(--system-text);
  cursor: pointer;
  list-style: none;
}

.worldbook-source-maintenance summary::-webkit-details-marker {
  display: none;
}

.worldbook-source-maintenance summary span {
  font-size: 13px;
  font-weight: 850;
}

.worldbook-source-maintenance summary small {
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.35;
  text-align: right;
}

.worldbook-source-maintenance-list {
  display: grid;
  gap: 10px;
  padding: 0 12px 12px;
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

.worldbook-fallback-compat {
  overflow: hidden;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
}

.worldbook-fallback-compat summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
  color: var(--system-text);
  cursor: pointer;
  list-style: none;
}

.worldbook-fallback-compat summary::-webkit-details-marker {
  display: none;
}

.worldbook-fallback-compat summary::after {
  content: '+';
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  color: var(--system-text-muted);
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
}

.worldbook-fallback-compat[open] summary::after {
  content: '-';
}

.worldbook-fallback-compat summary span {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.worldbook-fallback-compat summary strong {
  font-size: 13px;
  overflow-wrap: anywhere;
}

.worldbook-fallback-compat summary small {
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.worldbook-fallback-compat summary em {
  color: var(--system-text-muted);
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.worldbook-fallback-compat .worldbook-system-fallback {
  border: 0;
  border-top: 1px solid var(--system-control-border);
  border-radius: 0;
  box-shadow: none;
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
  flex: 1 1 auto;
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

.worldbook-template-handoff {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 12px;
  background: var(--system-control-bg);
}

.worldbook-template-handoff__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.worldbook-template-handoff__copy p,
.worldbook-template-handoff__copy h3,
.worldbook-template-handoff__copy span {
  margin: 0;
}

.worldbook-template-handoff__copy p {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.worldbook-template-handoff__copy h3 {
  color: var(--system-text);
  font-size: 14px;
  font-weight: 820;
  line-height: 1.25;
}

.worldbook-template-handoff__copy span {
  max-width: 60ch;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.worldbook-template-handoff__flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.worldbook-template-handoff__flow span {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-sm);
  padding: 6px 8px;
  background: var(--system-panel-bg);
}

.worldbook-template-handoff__flow i {
  color: var(--system-text-soft);
  font-size: 10px;
}

.worldbook-template-section {
  display: grid;
  gap: 9px;
}

.worldbook-template-section__head,
.worldbook-template-row__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
}

.worldbook-template-section__head > div {
  display: grid;
  gap: 3px;
}

.worldbook-template-section__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  flex-wrap: wrap;
}

.worldbook-profile-template-proposal-review {
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  background: var(--system-control-bg);
  color: var(--system-text);
}

.worldbook-profile-template-proposal-review span,
.worldbook-profile-template-proposal-review small,
.worldbook-profile-template-proposal-notice {
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.worldbook-profile-template-proposal-notice {
  margin: 0;
}

.worldbook-profile-template-proposal-notice[data-notice-tone='danger'] {
  color: var(--system-danger);
}

.worldbook-template-section__head p {
  margin: 0;
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

.worldbook-source-directory {
  display: grid;
  gap: 12px;
  position: fixed;
  left: max(14px, env(safe-area-inset-left));
  right: max(14px, env(safe-area-inset-right));
  bottom: 0;
  z-index: 42;
  max-height: min(82vh, 720px);
  overflow: auto;
  overscroll-behavior: contain;
  padding: 12px 16px max(18px, env(safe-area-inset-bottom));
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-lg) var(--system-radius-lg) 0 0;
  background:
    linear-gradient(180deg, var(--system-panel-bg), var(--system-surface-muted)),
    var(--system-panel-bg);
  box-shadow: 0 -22px 60px rgba(15, 23, 42, 0.22);
  scrollbar-color: color-mix(in srgb, var(--system-text-soft) 42%, transparent) transparent;
  scrollbar-width: thin;
}

.worldbook-source-directory::before {
  content: '';
  justify-self: center;
  width: 46px;
  height: 5px;
  margin-bottom: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--system-text-soft) 38%, transparent);
}

.worldbook-source-directory::-webkit-scrollbar {
  width: 4px;
}

.worldbook-source-directory::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: color-mix(in srgb, var(--system-text-soft) 42%, transparent);
}

.worldbook-source-directory__active {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
}

.worldbook-source-directory__active > span {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.worldbook-source-directory__active div {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  min-width: 0;
}

.worldbook-source-directory__active em {
  overflow: hidden;
  max-width: 100%;
  padding: 5px 8px;
  border-radius: 999px;
  background: var(--system-panel-bg);
  color: var(--system-accent);
  font-size: 11px;
  font-style: normal;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worldbook-source-directory__active em.is-empty {
  border: 1px dashed var(--system-control-border);
  background: transparent;
  color: var(--system-text-soft);
}

.worldbook-source-directory__list {
  display: grid;
  gap: 8px;
}

.worldbook-source-directory__batch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 2px 0;
}

.worldbook-source-directory__batch > span {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 700;
}

.worldbook-source-directory__batch > div {
  display: flex;
  gap: 6px;
}

.worldbook-directory-toggle {
  display: grid;
  justify-items: center;
  gap: 3px;
  flex: 0 0 auto;
}

.worldbook-directory-toggle em {
  color: var(--system-text-soft);
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
}

.worldbook-directory-switch {
  position: relative;
  flex: 0 0 auto;
  width: 40px;
  height: 24px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--system-text-soft) 45%, transparent);
  transition: background 160ms ease;
}

.worldbook-directory-switch i {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(38, 34, 27, 0.24);
  transition: left 160ms ease;
}

.worldbook-directory-switch.is-on {
  background: var(--system-accent);
}

.worldbook-directory-switch.is-on i {
  left: 19px;
}

.worldbook-source-directory__row.is-enabled .worldbook-directory-toggle em {
  color: var(--system-accent);
}

.worldbook-source-directory__row,
.worldbook-source-directory__import {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 11px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
  color: var(--system-text);
  text-align: left;
}

.worldbook-source-directory__import {
  grid-template-columns: 32px minmax(0, 1fr) 26px;
  grid-template-areas:
    'icon title action'
    'icon hint action';
  gap: 2px 10px;
  min-height: 58px;
  padding: 9px 10px;
  border-style: dashed;
  background: color-mix(in srgb, var(--system-info-soft) 42%, var(--system-control-bg));
}

.worldbook-source-directory__import::after {
  content: '+';
  grid-area: action;
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 999px;
  background: var(--system-panel-bg);
  color: var(--system-accent);
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
}

.worldbook-source-directory__import > span {
  display: grid;
  grid-area: icon;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 10px;
  color: var(--system-accent);
  background: var(--system-info-soft);
}

.worldbook-source-directory__row.is-enabled {
  border-color: color-mix(in srgb, var(--system-accent) 40%, var(--system-control-border));
  background: var(--system-info-soft);
}

.worldbook-source-directory__row strong,
.worldbook-source-directory__import strong {
  display: block;
  overflow: hidden;
  color: var(--system-text);
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worldbook-source-directory__import strong {
  grid-area: title;
  align-self: end;
}

.worldbook-source-directory__row small,
.worldbook-source-directory__import small {
  display: block;
  margin-top: 3px;
  color: var(--system-text-muted);
  font-size: 11px;
}

.worldbook-source-directory__import small {
  grid-area: hint;
  align-self: start;
  overflow: hidden;
  margin-top: 0;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worldbook-source-directory__row em {
  padding: 4px 7px;
  border-radius: 999px;
  background: var(--system-surface-muted);
  color: var(--system-text-muted);
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.worldbook-source-directory__row.is-enabled em {
  background: var(--system-panel-bg);
  color: var(--system-accent);
}

.worldbook-directory-menu {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-panel-bg);
}

.worldbook-directory-menu p {
  margin: 0;
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 800;
}

.worldbook-directory-menu strong {
  display: block;
  margin-top: 2px;
  color: var(--system-text);
  font-size: 14px;
}

.worldbook-directory-menu small {
  display: block;
  margin-top: 4px;
  color: var(--system-text-muted);
  font-size: 11px;
}

.worldbook-directory-menu__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.worldbook-directory-field {
  display: grid;
  gap: 6px;
  color: var(--system-text-muted);
  font-size: 12px;
  font-weight: 800;
}

.worldbook-directory-field input,
.worldbook-directory-field textarea {
  width: 100%;
  border: 1px solid var(--system-control-border);
  border-radius: 10px;
  background: var(--system-control-bg);
  color: var(--system-text);
  padding: 10px;
  font: inherit;
}

.worldbook-directory-notice {
  margin: 0;
  color: var(--system-accent);
  font-size: 12px;
  font-weight: 800;
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

.worldbook-source-catalog {
  display: grid;
  gap: 10px;
  max-height: 260px;
  overflow: auto;
  padding: 2px;
}

.worldbook-source-catalog-group {
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: color-mix(in srgb, var(--system-control-bg) 82%, transparent);
}

.worldbook-source-catalog-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.worldbook-source-catalog-group__head span {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.worldbook-source-catalog-group__head strong {
  color: var(--system-text);
  font-size: 12px;
  font-weight: 850;
}

.worldbook-source-catalog-group__head small {
  color: var(--system-text-muted);
  font-size: 10px;
  font-weight: 750;
}

.worldbook-source-catalog-group__items {
  display: grid;
  gap: 8px;
}

.worldbook-source-catalog-card {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  background: var(--system-control-bg);
  color: var(--system-text);
  text-align: left;
  transition:
    border-color 0.16s ease,
    background 0.16s ease,
    transform 0.16s ease;
}

.worldbook-source-catalog-card:hover,
.worldbook-source-catalog-card:focus-visible {
  border-color: var(--system-accent);
  background: var(--system-info-soft);
  transform: translateY(-1px);
  outline: none;
}

.worldbook-source-catalog-card.is-selected {
  border-color: var(--system-accent);
  background: var(--system-info-soft);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--system-accent) 42%, transparent);
}

.worldbook-source-catalog-card.is-linked:not(.is-selected) {
  opacity: 0.86;
}

.worldbook-source-catalog-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.worldbook-source-catalog-card__head strong {
  min-width: 0;
  color: var(--system-text);
  font-size: 13px;
  line-height: 1.35;
  font-weight: 850;
}

.worldbook-source-catalog-card__badges {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.worldbook-source-catalog-card__badges em {
  padding: 3px 7px;
  border-radius: 999px;
  background: var(--system-surface-muted);
  color: var(--system-text-muted);
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
  white-space: nowrap;
}

.worldbook-source-catalog-card__meta,
.worldbook-source-catalog-card__desc {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: var(--system-text-muted);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.worldbook-picker-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
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
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--system-text);
  background: var(--system-control-bg);
  transition:
    border-color var(--system-motion-fast),
    background var(--system-motion-fast);
}

.worldbook-secondary-action:hover {
  border-color: color-mix(in srgb, var(--system-accent) 36%, var(--system-control-border));
  background: var(--system-accent-soft);
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
  .worldbook-source-head {
    display: grid;
  }

  .worldbook-source-head .worldbook-secondary-action {
    width: 100%;
  }

  .worldbook-source-maintenance summary {
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    padding: 10px 12px;
  }

  .worldbook-source-maintenance summary small {
    text-align: left;
  }

  .worldbook-source-card__actions .worldbook-secondary-action {
    flex: 1 1 calc(50% - 8px);
  }

  .worldbook-kernel-hero,
  .worldbook-template-hero,
  .worldbook-template-handoff,
  .worldbook-kernel-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .worldbook-kernel-hero > span,
  .worldbook-kernel-actions .worldbook-primary-action,
  .worldbook-kernel-actions .worldbook-secondary-action,
  .worldbook-template-handoff .worldbook-primary-action,
  .worldbook-template-stats {
    width: 100%;
  }

  .worldbook-template-handoff__flow {
    align-items: stretch;
    flex-direction: column;
    width: 100%;
    white-space: normal;
  }

  .worldbook-template-handoff__flow i {
    display: none;
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

  .worldbook-template-section__head,
  .worldbook-template-row__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .worldbook-template-section__head .worldbook-primary-action,
  .worldbook-template-section__actions,
  .worldbook-template-section__actions .worldbook-secondary-action,
  .worldbook-template-section__actions .worldbook-primary-action,
  .worldbook-template-row__actions .worldbook-secondary-action {
    width: 100%;
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
